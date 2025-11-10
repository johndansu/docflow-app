import { useState, useRef, useEffect, useCallback } from 'react'
import { exportSiteFlowAsImage, exportSiteFlowAsJSON, importSiteFlowFromJSON, type SiteFlowData } from '../../utils/siteFlowUtils'
import { generateSiteFlowWithAI } from '../../utils/siteFlowGenerator'

interface Node {
  id: string
  name: string
  description: string
  x: number
  y: number
  isParent?: boolean
  level?: number
}

interface Connection {
  from: string
  to: string
}

interface SiteFlowVisualizerProps {
  appDescription?: string
  prdContent?: string
  onSiteFlowChange?: (data: SiteFlowData) => void
  initialSiteFlow?: SiteFlowData
}

const SiteFlowVisualizer = ({ appDescription = '', prdContent, onSiteFlowChange, initialSiteFlow }: SiteFlowVisualizerProps) => {
  const [nodes, setNodes] = useState<Node[]>(initialSiteFlow?.nodes || [])
  const [connections, setConnections] = useState<Connection[]>(initialSiteFlow?.connections || [])
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string } | null>(null)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<'name' | 'description' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [history, setHistory] = useState<SiteFlowData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMinimap, setShowMinimap] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // If initial site flow is provided, use it and don't regenerate
    if (initialSiteFlow && initialSiteFlow.nodes.length > 0) {
      setNodes(initialSiteFlow.nodes)
      setConnections(initialSiteFlow.connections)
      return
    }
    
    // Otherwise, generate from PRD or description
    if (prdContent && prdContent.trim()) {
      generateFlowFromPRDAsync(prdContent)
    } else if (appDescription && appDescription.trim()) {
      generateFlowFromDescriptionAsync(appDescription)
    }
  }, [appDescription, prdContent, initialSiteFlow])

  // Notify parent when site flow changes
  useEffect(() => {
    if (onSiteFlowChange && nodes.length > 0) {
      onSiteFlowChange({ nodes, connections })
    }
  }, [nodes, connections, onSiteFlowChange])

  // Save to history
  const saveToHistory = useCallback(() => {
    const currentState: SiteFlowData = { nodes, connections }
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(currentState)
      return newHistory.slice(-50) // Keep last 50 states
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [nodes, connections, historyIndex])

  // Undo/Redo
  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setNodes(prevState.nodes)
      setConnections(prevState.connections)
      setHistoryIndex(prev => prev - 1)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setNodes(nextState.nodes)
      setConnections(nextState.connections)
      setHistoryIndex(prev => prev + 1)
    }
  }

  // Copy/Paste
  const copySelectedNodes = () => {
    if (selectedNodes.size === 0) return
    const selected = Array.from(selectedNodes).map(id => nodes.find(n => n.id === id)).filter(Boolean)
    localStorage.setItem('siteflow-clipboard', JSON.stringify(selected))
  }

  const pasteNodes = (x: number, y: number) => {
    const clipboard = localStorage.getItem('siteflow-clipboard')
    if (!clipboard) return
    
    try {
      const copiedNodes = JSON.parse(clipboard)
      const offsetX = x - (copiedNodes[0]?.x || 0)
      const offsetY = y - (copiedNodes[0]?.y || 0)
      
      const newNodes = copiedNodes.map((node: Node) => ({
        ...node,
        id: Date.now().toString() + Math.random(),
        x: node.x + offsetX,
        y: node.y + offsetY,
      }))
      
      setNodes(prev => [...prev, ...newNodes])
      saveToHistory()
    } catch (error) {
      console.error('Failed to paste nodes:', error)
    }
  }

  // Export functions
  const handleExportImage = async () => {
    if (canvasContainerRef.current) {
      try {
        await exportSiteFlowAsImage(canvasContainerRef.current, 'site-flow')
      } catch (error) {
        alert('Failed to export image')
      }
    }
  }

  const handleExportJSON = () => {
    exportSiteFlowAsJSON({ nodes, connections }, 'site-flow')
  }

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    importSiteFlowFromJSON(file)
      .then((data) => {
        setNodes(data.nodes)
        setConnections(data.connections)
        saveToHistory()
      })
      .catch((error) => {
        alert('Failed to import: ' + error.message)
      })
  }

  // Filtered nodes based on search
  const filteredNodes = searchQuery
    ? nodes.filter(node =>
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : nodes

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNode) return

      // Delete selected nodes
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodes.size > 0) {
        selectedNodes.forEach(id => deleteNode(id))
        saveToHistory()
      }

      // Copy/Paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedNodes.size > 0) {
        e.preventDefault()
        copySelectedNodes()
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault()
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect()
          pasteNodes(rect.width / 2, rect.height / 2)
        }
      }

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }

      // Select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        setSelectedNodes(new Set(nodes.map(n => n.id)))
      }

      // Escape
      if (e.key === 'Escape') {
        setSelectedNodes(new Set())
        setConnectingFrom(null)
        setContextMenu(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodes, nodes, editingNode, history, historyIndex])

  useEffect(() => {
    if (editingField && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingField])

  const generateFlowFromPRDAsync = async (prdContent: string) => {
    if (!prdContent || !prdContent.trim()) return
    
    // Try AI generation from PRD first
    try {
      console.log('🤖 Generating site flow from PRD with AI...')
      const aiFlow = await generateSiteFlowWithAI(prdContent, true)
      if (aiFlow.nodes.length > 0) {
        setNodes(aiFlow.nodes)
        setConnections(aiFlow.connections)
        // Save to history after state updates
        setTimeout(() => {
          const currentState: SiteFlowData = { nodes: aiFlow.nodes, connections: aiFlow.connections }
          setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1)
            newHistory.push(currentState)
            return newHistory.slice(-50)
          })
          setHistoryIndex(prev => Math.min(prev + 1, 49))
        }, 0)
        return
      }
    } catch (error) {
      console.warn('AI generation from PRD failed, using fallback:', error)
    }
    
    // Fallback to description-based generation
    if (appDescription && appDescription.trim()) {
      generateFlowFromDescription(appDescription)
    }
  }

  const generateFlowFromDescriptionAsync = async (description: string) => {
    if (!description || !description.trim()) return
    
    // Try AI generation first
    try {
      console.log('🤖 Generating site flow with AI...')
      const aiFlow = await generateSiteFlowWithAI(description, false)
      if (aiFlow.nodes.length > 0) {
        setNodes(aiFlow.nodes)
        setConnections(aiFlow.connections)
        // Save to history after state updates
        setTimeout(() => {
          const currentState: SiteFlowData = { nodes: aiFlow.nodes, connections: aiFlow.connections }
          setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1)
            newHistory.push(currentState)
            return newHistory.slice(-50)
          })
          setHistoryIndex(prev => Math.min(prev + 1, 49))
        }, 0)
        return
      }
    } catch (error) {
      console.warn('AI generation failed, using fallback:', error)
    }
    
    // Fallback to original method
    generateFlowFromDescription(description)
  }

  const generateFlowFromDescription = (description: string) => {
    if (!description || !description.trim()) return
    
    const descriptionLower = description.toLowerCase()
    const generatedPages: Node[] = []
    const generatedConnections: Connection[] = []

    // Center starting point
    const centerX = 400
    const centerY = 200

    // Always create Home page - center
    const homeNode: Node = {
      id: '1',
      name: 'Home',
      description: 'Landing page',
      x: centerX,
      y: centerY,
      isParent: true,
      level: 0,
    }
    generatedPages.push(homeNode)

    let nodeId = 2
    const level1Nodes: Node[] = []
    const level2Nodes: Node[] = []

    // Level 1 pages (directly from home)
    if (descriptionLower.includes('login') || descriptionLower.includes('sign in') || descriptionLower.includes('account') || descriptionLower.includes('auth')) {
      level1Nodes.push({
        id: nodeId.toString(),
        name: 'Login',
        description: 'User authentication',
        x: centerX - 300,
        y: centerY,
        level: 1,
      })
      generatedConnections.push({ from: '1', to: nodeId.toString() })
      nodeId++
    }

    if (descriptionLower.includes('dashboard') || descriptionLower.includes('profile') || descriptionLower.includes('account')) {
      level1Nodes.push({
        id: nodeId.toString(),
        name: 'Dashboard',
        description: 'User dashboard',
        x: centerX + 300,
        y: centerY,
        isParent: true,
        level: 1,
      })
      generatedConnections.push({ from: '1', to: nodeId.toString() })
      const dashboardId = nodeId.toString()
      nodeId++

      // Level 2 pages (children of dashboard)
      if (descriptionLower.includes('profile') || descriptionLower.includes('settings')) {
        level2Nodes.push({
          id: nodeId.toString(),
          name: 'Profile',
          description: 'User profile',
          x: centerX + 300,
          y: centerY + 200,
          level: 2,
        })
        generatedConnections.push({ from: dashboardId, to: nodeId.toString() })
        nodeId++
      }

      if (descriptionLower.includes('settings')) {
        level2Nodes.push({
          id: nodeId.toString(),
          name: 'Settings',
          description: 'User settings',
          x: centerX + 500,
          y: centerY + 200,
          level: 2,
        })
        generatedConnections.push({ from: dashboardId, to: nodeId.toString() })
        nodeId++
      }
    }

    if (descriptionLower.includes('product') || descriptionLower.includes('item') || descriptionLower.includes('shop') || descriptionLower.includes('store')) {
      level1Nodes.push({
        id: nodeId.toString(),
        name: 'Products',
        description: 'Product listing',
        x: centerX,
        y: centerY - 200,
        isParent: true,
        level: 1,
      })
      generatedConnections.push({ from: '1', to: nodeId.toString() })
      const productsId = nodeId.toString()
      nodeId++

      // Product detail page
      level2Nodes.push({
        id: nodeId.toString(),
        name: 'Product Detail',
        description: 'Individual product',
        x: centerX + 200,
        y: centerY - 200,
        level: 2,
      })
      generatedConnections.push({ from: productsId, to: nodeId.toString() })
      nodeId++

      // Cart/Checkout
      if (descriptionLower.includes('cart') || descriptionLower.includes('checkout') || descriptionLower.includes('purchase')) {
        level2Nodes.push({
          id: nodeId.toString(),
          name: 'Cart',
          description: 'Shopping cart',
          x: centerX,
          y: centerY - 100,
          level: 2,
        })
        generatedConnections.push({ from: productsId, to: nodeId.toString() })
        nodeId++
      }
    }

    if (descriptionLower.includes('blog') || descriptionLower.includes('article') || descriptionLower.includes('post') || descriptionLower.includes('news')) {
      level1Nodes.push({
        id: nodeId.toString(),
        name: 'Blog',
        description: 'Blog listing',
        x: centerX - 300,
        y: centerY - 200,
        level: 1,
      })
      generatedConnections.push({ from: '1', to: nodeId.toString() })
      const blogId = nodeId.toString()
      nodeId++

      // Blog post detail
      level2Nodes.push({
        id: nodeId.toString(),
        name: 'Blog Post',
        description: 'Article detail',
        x: centerX - 300,
        y: centerY - 100,
        level: 2,
      })
      generatedConnections.push({ from: blogId, to: nodeId.toString() })
      nodeId++
    }

    if (descriptionLower.includes('about') || descriptionLower.includes('contact') || descriptionLower.includes('help')) {
      level1Nodes.push({
        id: nodeId.toString(),
        name: 'About',
        description: 'About page',
        x: centerX - 300,
        y: centerY + 200,
        level: 1,
      })
      generatedConnections.push({ from: '1', to: nodeId.toString() })
      nodeId++
    }

    if (descriptionLower.includes('contact') || descriptionLower.includes('support')) {
      level1Nodes.push({
        id: nodeId.toString(),
        name: 'Contact',
        description: 'Contact page',
        x: centerX,
        y: centerY + 200,
        level: 1,
      })
      generatedConnections.push({ from: '1', to: nodeId.toString() })
      nodeId++
    }

    // Add all nodes
    generatedPages.push(...level1Nodes, ...level2Nodes)

    // If no pages were generated from keywords, create a basic structure
    if (level1Nodes.length === 0) {
      // Try to extract page names from the description
      const sentences = description.split(/[.!?]\s+/).filter(s => s.trim().length > 10)
      const pageNames: string[] = []
      
      // Look for common patterns like "page for X", "section for Y", etc.
      sentences.forEach(sentence => {
        const lower = sentence.toLowerCase()
        if (lower.includes('page') || lower.includes('section') || lower.includes('feature')) {
          // Extract potential page name
          const match = sentence.match(/(?:page|section|feature)\s+(?:for|about|with)?\s*([^,\.!?]+)/i)
          if (match && match[1]) {
            const pageName = match[1].trim().split(/\s+/).slice(0, 2).join(' ')
            if (pageName && pageName.length > 2 && !pageNames.includes(pageName)) {
              pageNames.push(pageName)
            }
          }
        }
      })
      
      // Create basic pages if we found any
      if (pageNames.length > 0) {
        pageNames.slice(0, 4).forEach((name, idx) => {
          const angle = (idx / pageNames.length) * Math.PI * 2
          const radius = 250
          level1Nodes.push({
            id: nodeId.toString(),
            name: name.charAt(0).toUpperCase() + name.slice(1),
            description: `Page for ${name}`,
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            level: 1,
          })
          generatedConnections.push({ from: '1', to: nodeId.toString() })
          nodeId++
        })
        generatedPages.push(...level1Nodes)
      } else {
        // Default pages if nothing found
        const defaultPages = [
          { name: 'About', x: centerX - 250, y: centerY },
          { name: 'Contact', x: centerX + 250, y: centerY },
          { name: 'Services', x: centerX, y: centerY - 200 },
        ]
        defaultPages.forEach((page, idx) => {
          level1Nodes.push({
            id: nodeId.toString(),
            name: page.name,
            description: `${page.name} page`,
            x: page.x,
            y: page.y,
            level: 1,
          })
          generatedConnections.push({ from: '1', to: nodeId.toString() })
          nodeId++
        })
        generatedPages.push(...level1Nodes)
      }
    }

    // Auto-center the view - use actual canvas dimensions if available
    const allX = generatedPages.map(n => n.x)
    const allY = generatedPages.map(n => n.y)
    const minX = Math.min(...allX)
    const maxX = Math.max(...allX)
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY)
    
    // Center nodes in a reasonable viewport (assuming ~800x600 canvas)
    const canvasWidth = 800
    const canvasHeight = 600
    const nodesCenterX = (minX + maxX) / 2
    const nodesCenterY = (minY + maxY) / 2
    const offsetX = canvasWidth / 2 - nodesCenterX
    const offsetY = canvasHeight / 2 - nodesCenterY

    const adjustedNodes = generatedPages.map(node => ({
      ...node,
      x: node.x + offsetX,
      y: node.y + offsetY,
    }))

    setNodes(adjustedNodes)
    setConnections(generatedConnections)
    
    // Initialize history with generated flow
    const initialState: SiteFlowData = { nodes: adjustedNodes, connections: generatedConnections }
    setHistory([initialState])
    setHistoryIndex(0)
    
    // Auto-center view after a short delay to ensure canvas is rendered
    setTimeout(() => {
      centerView()
    }, 200)
  }

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (editingNode) return
    
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    setDraggingNode(nodeId)
    setDragOffset({ x: offsetX, y: offsetY })
    e.preventDefault()
  }, [nodes, editingNode])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning && canvasRef.current) {
      const deltaX = e.clientX - panStart.x
      const deltaY = e.clientY - panStart.y
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }

    if (!draggingNode || !dragOffset || !canvasRef.current) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const newX = (e.clientX - canvasRect.left - panOffset.x) / zoom - dragOffset.x
    const newY = (e.clientY - canvasRect.top - panOffset.y) / zoom - dragOffset.y

    setNodes(prev => prev.map(node =>
      node.id === draggingNode
        ? { ...node, x: Math.max(0, newX), y: Math.max(0, newY) }
        : node
    ))
  }, [draggingNode, dragOffset, zoom, isPanning, panStart, panOffset])

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null)
    setDragOffset(null)
    setIsPanning(false)
  }, [])

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      e.preventDefault()
    }
  }

  useEffect(() => {
    if (draggingNode || isPanning) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggingNode, isPanning, handleMouseMove, handleMouseUp])

  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    if (draggingNode || editingNode) return
    
    if (connectingFrom) {
      // If connectingFrom is 'connecting', set it to the clicked node (source)
      if (connectingFrom === 'connecting') {
        setConnectingFrom(nodeId)
        return
      }
      
      // Otherwise, connectingFrom is a node ID, so create connection
      if (connectingFrom !== nodeId) {
        // Create connection
        const connectionExists = connections.some(
          c => (c.from === connectingFrom && c.to === nodeId) || (c.from === nodeId && c.to === connectingFrom)
        )
        if (!connectionExists) {
          setConnections(prev => [...prev, { from: connectingFrom, to: nodeId }])
          saveToHistory()
        }
      }
      setConnectingFrom(null)
      return
    }
    
    if (e.detail === 2) {
      // Double click to edit
      const node = nodes.find(n => n.id === nodeId)
      if (node) {
        setEditingNode(nodeId)
        setEditingField('name')
        setEditValue(node.name)
      }
      return
    }
    
    if (e.shiftKey) {
      setSelectedNodes(prev => {
        const newSet = new Set(prev)
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId)
        } else {
          newSet.add(nodeId)
        }
        return newSet
      })
    } else {
      setSelectedNodes(new Set([nodeId]))
    }
  }

  const handleContextMenu = (e: React.MouseEvent, nodeId?: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId })
  }

  const handleEditSave = () => {
    if (!editingNode || !editingField) return
    
    setNodes(prev => prev.map(node =>
      node.id === editingNode
        ? editingField === 'name'
          ? { ...node, name: editValue }
          : { ...node, description: editValue }
        : node
    ))
    setEditingNode(null)
    setEditingField(null)
    setEditValue('')
    saveToHistory()
  }

  const handleEditCancel = () => {
    setEditingNode(null)
    setEditingField(null)
    setEditValue('')
  }

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId))
    setSelectedNodes(prev => {
      const newSet = new Set(prev)
      newSet.delete(nodeId)
      return newSet
    })
    setContextMenu(null)
    saveToHistory()
  }

  const addNewNode = (x: number, y: number) => {
    const newNode: Node = {
      id: Date.now().toString(),
      name: 'New Page',
      description: 'Page description',
      x: (x - panOffset.x) / zoom,
      y: (y - panOffset.y) / zoom,
    }
    setNodes(prev => [...prev, newNode])
    setContextMenu(null)
    saveToHistory()
  }

  const addChildPage = (parentId: string) => {
    const parent = nodes.find(n => n.id === parentId)
    if (!parent) return
    
    const newNode: Node = {
      id: Date.now().toString(),
      name: 'Child Page',
      description: 'Child page description',
      x: parent.x + 200,
      y: parent.y + 150,
    }
    setNodes(prev => [...prev, newNode])
    setConnections(prev => [...prev, { from: parentId, to: newNode.id }])
    setContextMenu(null)
    saveToHistory()
  }

  const deleteConnection = (from: string, to: string) => {
    setConnections(prev => prev.filter(c => !(c.from === from && c.to === to)))
    saveToHistory()
  }

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)))
  }

  const centerView = () => {
    if (nodes.length === 0) return
    
    const allX = nodes.map(n => n.x)
    const allY = nodes.map(n => n.y)
    const minX = Math.min(...allX)
    const maxX = Math.max(...allX)
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setPanOffset({
        x: rect.width / 2 - centerX * zoom,
        y: rect.height / 2 - centerY * zoom
      })
    }
  }

  // Auto-center when nodes are first generated
  useEffect(() => {
    if (nodes.length > 0 && panOffset.x === 0 && panOffset.y === 0 && zoom === 1) {
      setTimeout(() => centerView(), 100)
    }
  }, [nodes.length])

  if (nodes.length === 0) {
    return (
      <div className="text-center py-12 text-mid-grey">
        <p className="mb-4">Site flow will be generated automatically from your app description</p>
        <button
          onClick={(e) => {
            if (canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect()
              addNewNode(rect.width / 2, rect.height / 2)
            }
          }}
          className="px-4 py-2 bg-amber-gold/10 hover:bg-amber-gold/20 text-amber-gold rounded-md text-sm font-medium transition-all"
        >
          Add First Page
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '600px' }}>
      {/* Simple Toolbar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConnectingFrom(connectingFrom ? null : 'connecting')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              connectingFrom
                ? 'bg-amber-gold text-white'
                : 'bg-dark-card border border-divider/50 text-charcoal hover:bg-dark-surface'
            }`}
          >
            {connectingFrom ? 'Cancel' : 'Connect'}
          </button>
          <button
            onClick={centerView}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-dark-card border border-divider/50 text-charcoal hover:bg-dark-surface transition-all"
          >
            Center
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-0.1)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-dark-card border border-divider/50 text-charcoal hover:bg-dark-surface transition-all"
          >
            −
          </button>
          <span className="text-xs text-mid-grey min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.1)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-dark-card border border-divider/50 text-charcoal hover:bg-dark-surface transition-all"
          >
            +
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden rounded-lg border border-divider/50"
        style={{
          backgroundImage: `
            linear-gradient(to right, #2A2A2A 1px, transparent 1px),
            linear-gradient(to bottom, #2A2A2A 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundColor: '#121212',
          cursor: isPanning ? 'grabbing' : connectingFrom ? 'crosshair' : 'default',
        }}
        onMouseDown={handleCanvasMouseDown}
        onClick={(e) => {
          if (!contextMenu && !connectingFrom && e.target === e.currentTarget) {
            setSelectedNodes(new Set())
          }
        }}
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            handleContextMenu(e)
          }
        }}
        onWheel={(e) => {
          e.preventDefault()
          const delta = e.deltaY > 0 ? -0.1 : 0.1
          handleZoom(delta)
        }}
      >
        <div ref={canvasContainerRef} className="w-full h-full relative">
        {/* SVG for connections - render behind nodes */}
        <svg 
          className="absolute inset-0 z-0" 
          style={{ width: '100%', height: '100%', zIndex: 0, overflow: 'visible', pointerEvents: 'none' }}
        >
          <defs>
            {/* Supabase-style animated gradients - flowing effect */}
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6B7280" stopOpacity="0.4">
                <animate attributeName="stop-opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#9CA3AF" stopOpacity="1">
                <animate attributeName="stop-opacity" values="0.9;1;0.9" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#6B7280" stopOpacity="0.4">
                <animate attributeName="stop-opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite" />
              </stop>
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                values="0 0;200 0;0 0"
                dur="3s"
                repeatCount="indefinite"
              />
            </linearGradient>
            
            <linearGradient id="connectionGradientSelected" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.5">
                <animate attributeName="stop-opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#3B82F6" stopOpacity="1">
                <animate attributeName="stop-opacity" values="1;0.95;1" dur="1.5s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.5">
                <animate attributeName="stop-opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
              </stop>
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                values="0 0;250 0;0 0"
                dur="2s"
                repeatCount="indefinite"
              />
            </linearGradient>
            
            {/* No glow filter - clean lines */}
            
            {/* Very visible arrow markers */}
            <marker
              id="arrowhead"
              markerWidth="18"
              markerHeight="18"
              refX="15"
              refY="6"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path
                d="M 0 2 L 16 6 L 0 10 Z"
                fill="#D1D5DB"
                stroke="#9CA3AF"
                strokeWidth="0.8"
                opacity="1"
              />
            </marker>
            <marker
              id="arrowhead-selected"
              markerWidth="20"
              markerHeight="20"
              refX="17"
              refY="7"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path
                d="M 0 2 L 18 7 L 0 12 Z"
                fill="#3B82F6"
                stroke="#60A5FA"
                strokeWidth="1.2"
                opacity="1"
              >
                <animate attributeName="opacity" values="0.9;1;0.9" dur="1s" repeatCount="indefinite" />
              </path>
            </marker>
          </defs>
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
            {connections.map((conn, idx) => {
              // Convert connection IDs to strings to match node IDs
              const fromId = String(conn.from)
              const toId = String(conn.to)
              
              // Skip invalid connections
              if (fromId === 'connecting' || fromId === 'null' || toId === 'null' || !fromId || !toId) {
                return null
              }
              
              const fromNode = nodes.find(n => String(n.id) === fromId)
              const toNode = nodes.find(n => String(n.id) === toId)
              
              if (!fromNode || !toNode) return null
              
              // Skip connections if either node is filtered out
              const fromVisible = filteredNodes.some(n => String(n.id) === fromId)
              const toVisible = filteredNodes.some(n => String(n.id) === toId)
              if (!fromVisible || !toVisible) return null

              // Calculate connection points
              const nodeWidth = fromNode.isParent ? 200 : 180
              const nodeHeight = 60
              const fromX = fromNode.x + nodeWidth / 2
              const fromY = fromNode.y + nodeHeight
              const toNodeWidth = toNode.isParent ? 200 : 180
              const toX = toNode.x + toNodeWidth / 2
              const toY = toNode.y

              // Improved smooth curved path
              const dx = toX - fromX
              const dy = toY - fromY
              const distance = Math.sqrt(dx * dx + dy * dy)
              
              // Dynamic curvature based on distance
              const baseCurvature = Math.min(distance * 0.25, 120)
              const curvature = baseCurvature * (1 + Math.sin(distance / 100) * 0.2)
              
              const midX = (fromX + toX) / 2
              const midY = (fromY + toY) / 2
              
              // Perpendicular direction for smooth curve
              const perpX = -dy / distance * curvature
              const perpY = dx / distance * curvature
              
              const controlX = midX + perpX
              const controlY = midY + perpY
              
              // Use quadratic bezier for smooth, natural curves
              const path = `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`

              const isSelected = selectedNodes.has(conn.from) || selectedNodes.has(conn.to)

              return (
                <g key={`conn-${conn.from}-${conn.to}`} className="connection-group">
                  {/* Subtle background for depth */}
                  <path
                    d={path}
                    fill="none"
                    stroke={isSelected ? '#3B82F6' : '#4B5563'}
                    strokeWidth={isSelected ? '6' : '5'}
                    strokeOpacity="0.2"
                    strokeLinecap="round"
                    className="pointer-events-none"
                  />
                  
                  {/* Main connection line - clean and visible */}
                  <path
                    d={path}
                    fill="none"
                    stroke={isSelected ? '#3B82F6' : '#D1D5DB'}
                    strokeWidth={isSelected ? '4' : '3'}
                    strokeOpacity="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (e.detail === 2) {
                        deleteConnection(conn.from, conn.to)
                      }
                    }}
                  >
                    <animate 
                      attributeName="stroke-width" 
                      values={isSelected ? "4;4.5;4" : "3;3.3;3"} 
                      dur="2s" 
                      repeatCount="indefinite" 
                    />
                  </path>
                  
                  {/* Flowing particles - thick and dark */}
                  <path
                    d={path}
                    fill="none"
                    stroke={isSelected ? '#2563EB' : '#6B7280'}
                    strokeWidth={isSelected ? '7' : '6'}
                    strokeOpacity="1"
                    strokeLinecap="round"
                    strokeDasharray="15,8"
                    className="pointer-events-none"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;-23"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </path>
                  
                  {/* Secondary flowing particles - thick and dark */}
                  <path
                    d={path}
                    fill="none"
                    stroke={isSelected ? '#1E40AF' : '#4B5563'}
                    strokeWidth="4"
                    strokeOpacity="0.9"
                    strokeLinecap="round"
                    strokeDasharray="8,12"
                    className="pointer-events-none"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;-20"
                      dur="2.5s"
                      repeatCount="indefinite"
                    />
                  </path>
                  
                  {/* Arrow marker - larger and more visible */}
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="12"
                    markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
                    className="pointer-events-none"
                  />
                </g>
              )
            })}
          </g>
        </svg>

        {/* Nodes - render on top of connections */}
        <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'relative', width: '100%', height: '100%', zIndex: 1 }}>
          {filteredNodes.length === 0 && searchQuery ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-mid-grey">No nodes match "{searchQuery}"</p>
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-mid-grey">No nodes to display</p>
            </div>
          ) : (
            filteredNodes.map((node) => {
            const isHighlighted = searchQuery && (
              node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              node.description.toLowerCase().includes(searchQuery.toLowerCase())
            )
            return (
            <div
              key={node.id}
              className={`absolute cursor-move ${selectedNodes.has(node.id) ? 'ring-2 ring-amber-gold' : ''} ${draggingNode === node.id ? 'opacity-80 z-50' : ''} ${connectingFrom === node.id ? 'ring-2 ring-amber-gold ring-offset-2' : ''}`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
              }}
              onMouseDown={(e) => {
                if (connectingFrom && connectingFrom !== node.id && connectingFrom !== 'connecting') {
                  handleNodeClick(node.id, e)
                } else if (!connectingFrom) {
                  handleMouseDown(e, node.id)
                }
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (connectingFrom) {
                  handleNodeClick(node.id, e)
                } else {
                  // Regular click - select node
                  if (e.shiftKey) {
                    setSelectedNodes(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has(node.id)) {
                        newSet.delete(node.id)
                      } else {
                        newSet.add(node.id)
                      }
                      return newSet
                    })
                  } else {
                    setSelectedNodes(new Set([node.id]))
                  }
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (!connectingFrom) {
                  handleNodeClick(node.id, e)
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, node.id)}
            >
              <div className={`bg-dark-card border rounded-lg p-3 hover:shadow-lg transition-shadow ${
                node.level === 0 
                  ? 'bg-amber-gold/5 border-2 border-amber-gold/30' 
                  : isHighlighted
                  ? 'border-2 border-amber-gold/50 bg-amber-gold/10'
                  : 'border-divider'
              }`} style={{ width: node.isParent ? '200px' : '180px' }}>
                {editingNode === node.id && editingField === 'name' ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleEditSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave()
                      if (e.key === 'Escape') handleEditCancel()
                    }}
                    className="w-full bg-dark-surface border border-amber-gold/50 rounded px-2 py-1 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-amber-gold/50"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h3 
                    className="font-heading font-semibold text-base text-charcoal mb-1 cursor-text"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingNode(node.id)
                      setEditingField('name')
                      setEditValue(node.name)
                    }}
                  >
                    {node.name}
                  </h3>
                )}
                {editingNode === node.id && editingField === 'description' ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleEditSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave()
                      if (e.key === 'Escape') handleEditCancel()
                    }}
                    className="w-full bg-dark-surface border border-amber-gold/50 rounded px-2 py-1 text-xs text-mid-grey focus:outline-none focus:ring-2 focus:ring-amber-gold/50"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p 
                    className="text-xs text-mid-grey cursor-text"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingNode(node.id)
                      setEditingField('description')
                      setEditValue(node.description)
                    }}
                  >
                    {node.description}
                  </p>
                )}
              </div>
            </div>
            )
          }))}
        </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-dark-card border border-divider rounded-lg shadow-lg z-50"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.nodeId ? (
              <>
                <button
                  onClick={() => {
                    const node = nodes.find(n => n.id === contextMenu.nodeId)
                    if (node) {
                      setEditingNode(contextMenu.nodeId!)
                      setEditingField('name')
                      setEditValue(node.name)
                    }
                    setContextMenu(null)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-dark-surface text-sm text-charcoal"
                >
                  Edit Name
                </button>
                <button
                  onClick={() => {
                    const node = nodes.find(n => n.id === contextMenu.nodeId)
                    if (node) {
                      setEditingNode(contextMenu.nodeId!)
                      setEditingField('description')
                      setEditValue(node.description)
                    }
                    setContextMenu(null)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-dark-surface text-sm text-charcoal"
                >
                  Edit Description
                </button>
                <button
                  onClick={() => {
                    if (contextMenu.nodeId) {
                      setConnectingFrom(contextMenu.nodeId)
                    }
                    setContextMenu(null)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-dark-surface text-sm text-charcoal"
                >
                  Connect From Here
                </button>
                <button
                  onClick={() => {
                    if (contextMenu.nodeId) {
                      addChildPage(contextMenu.nodeId)
                    }
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-dark-surface text-sm text-charcoal"
                >
                  Add Child Page
                </button>
                <div className="border-t border-divider/50 my-1"></div>
                <button
                  onClick={() => {
                    if (contextMenu.nodeId) {
                      deleteNode(contextMenu.nodeId)
                    }
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-red-500/10 text-sm text-red-400"
                >
                  Delete
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (canvasRef.current) {
                    const rect = canvasRef.current.getBoundingClientRect()
                    addNewNode(contextMenu.x - rect.left, contextMenu.y - rect.top)
                  }
                }}
                className="block w-full text-left px-4 py-2 hover:bg-dark-surface text-sm text-charcoal"
              >
                Add New Page
              </button>
            )}
            <button
              onClick={() => setContextMenu(null)}
              className="block w-full text-left px-4 py-2 hover:bg-dark-surface text-sm text-charcoal border-t border-divider/50 mt-1"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Instructions */}
        {connectingFrom && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-amber-gold/20 border border-amber-gold/50 rounded-lg px-4 py-2 text-sm text-amber-gold z-50">
            {connectingFrom === 'connecting' 
              ? 'Click a node to connect from, then click another to connect to'
              : `Connecting from "${nodes.find(n => n.id === connectingFrom)?.name}". Click target node or cancel.`}
          </div>
        )}

        {/* Minimap - hidden for simplicity */}
        {false && showMinimap && nodes.length > 0 && (
          <div className="absolute bottom-4 right-4 w-48 h-32 bg-dark-card/90 border border-divider/50 rounded-lg p-2 z-40 backdrop-blur-sm">
            <div className="text-xs text-mid-grey mb-1 font-medium">Minimap ({nodes.length} nodes)</div>
            <div className="relative w-full h-24 bg-dark-surface rounded border border-divider/30 overflow-hidden">
              <svg className="absolute inset-0" viewBox="0 0 1000 600" preserveAspectRatio="none">
                {/* Calculate bounds for minimap */}
                {(() => {
                  const allX = nodes.map(n => n.x)
                  const allY = nodes.map(n => n.y)
                  const minX = Math.min(...allX, 0)
                  const maxX = Math.max(...allX, 1000)
                  const minY = Math.min(...allY, 0)
                  const maxY = Math.max(...allY, 600)
                  const scaleX = 1000 / Math.max(maxX - minX, 1000)
                  const scaleY = 600 / Math.max(maxY - minY, 600)
                  
                  return (
                    <>
                      {/* Connections */}
                      {connections.map((conn, idx) => {
                        const fromNode = nodes.find(n => n.id === conn.from)
                        const toNode = nodes.find(n => n.id === conn.to)
                        if (!fromNode || !toNode) return null
                        return (
                          <line
                            key={idx}
                            x1={(fromNode.x - minX) * scaleX}
                            y1={(fromNode.y - minY) * scaleY}
                            x2={(toNode.x - minX) * scaleX}
                            y2={(toNode.y - minY) * scaleY}
                            stroke="#9CA3AF"
                            strokeWidth="0.5"
                          />
                        )
                      })}
                      {/* Nodes */}
                      {nodes.map((node) => (
                        <circle
                          key={node.id}
                          cx={(node.x - minX) * scaleX}
                          cy={(node.y - minY) * scaleY}
                          r={node.level === 0 ? 3 : 2}
                          fill={selectedNodes.has(node.id) ? '#D9A441' : node.level === 0 ? '#D9A441' : '#9CA3AF'}
                        />
                      ))}
                    </>
                  )
                })()}
                {/* Viewport indicator */}
                <rect
                  x={(-panOffset.x / zoom) * 0.1}
                  y={(-panOffset.y / zoom) * 0.1}
                  width={(600 / zoom) * 0.1}
                  height={(400 / zoom) * 0.1}
                  fill="none"
                  stroke="#D9A441"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Simple Instructions */}
      <div className="mt-2 text-xs text-mid-grey text-center">
        Double-click nodes to edit • Right-click for menu • Scroll to zoom • Drag to pan
      </div>
    </div>
  )
}

export default SiteFlowVisualizer

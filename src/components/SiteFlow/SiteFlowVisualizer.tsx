import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { type SiteFlowData } from '../../utils/siteFlowUtils'
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

export interface SiteFlowHandle {
  getCurrentSiteFlow: () => SiteFlowData | null
}

const SiteFlowVisualizer = forwardRef<SiteFlowHandle, SiteFlowVisualizerProps>(({
  appDescription = '',
  prdContent,
  onSiteFlowChange,
  initialSiteFlow,
}, ref) => {
  const [nodes, setNodes] = useState<Node[]>(initialSiteFlow?.nodes || [])
  const [connections, setConnections] = useState<Connection[]>(initialSiteFlow?.connections || [])
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(0.5) // Default to 50% zoom
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
  const searchQuery: string = ''
  const canvasRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const latestSiteFlowRef = useRef<SiteFlowData | null>(initialSiteFlow ? initialSiteFlow : null)

  useImperativeHandle(ref, () => ({
    getCurrentSiteFlow: () => latestSiteFlowRef.current,
  }), [])

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
    if (nodes.length > 0) {
      const currentData: SiteFlowData = { nodes, connections }
      latestSiteFlowRef.current = currentData
      if (onSiteFlowChange) {
        onSiteFlowChange(currentData)
      }
    } else {
      latestSiteFlowRef.current = null
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

  // Filtered nodes based on search
  const filteredNodes = nodes

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
          // Auto-fit after setting nodes
          setTimeout(() => centerView(), 100)
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
          // Auto-fit after setting nodes
          setTimeout(() => centerView(), 100)
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

    // Center starting point - nodes will be repositioned to visible space
    // Use large initial spacing so they spread out before repositioning
    const centerX = 1000
    const centerY = 1000

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
        x: centerX - 400,
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
        x: centerX + 400,
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
          x: centerX + 400,
          y: centerY + 300,
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
          x: centerX + 600,
          y: centerY + 300,
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
        y: centerY - 300,
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
        x: centerX + 300,
        y: centerY - 300,
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
          y: centerY - 150,
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
        x: centerX - 400,
        y: centerY - 300,
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
        x: centerX - 400,
        y: centerY - 150,
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
        x: centerX - 400,
        y: centerY + 300,
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
        y: centerY + 300,
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
          const radius = 400 // Increased radius for better spacing
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
          { name: 'About', x: centerX - 400, y: centerY },
          { name: 'Contact', x: centerX + 400, y: centerY },
          { name: 'Services', x: centerX, y: centerY - 300 },
        ]
        defaultPages.forEach((page) => {
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

    setNodes(generatedPages)
    setConnections(generatedConnections)
    
    // Initialize history with generated flow
    const initialState: SiteFlowData = { nodes: generatedPages, connections: generatedConnections }
    setHistory([initialState])
    setHistoryIndex(0)
    
    // Auto-fit and center view after a short delay to ensure canvas is rendered
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
    if (nodes.length === 0 || !canvasRef.current) return
    
      const rect = canvasRef.current.getBoundingClientRect()
    const canvasWidth = rect.width
    const canvasHeight = rect.height
    
    // Set zoom to 50%
    const targetZoom = 0.5
    
    // Calculate available space at 50% zoom
    const availableWidth = canvasWidth / targetZoom
    const availableHeight = canvasHeight / targetZoom
    
    // Natural spacing algorithm - position nodes organically based on levels and connections
    const padding = 200
    const centerX = availableWidth / 2
    const centerY = availableHeight / 2
    
    const nodesByLevel = new Map<number, Node[]>()
    nodes.forEach(node => {
      const level = node.level ?? 0
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, [])
      }
      nodesByLevel.get(level)!.push(node)
    })

    const nodesById = new Map<string, Node>(nodes.map(node => [node.id, node]))
    const allLevels = Array.from(nodesByLevel.keys()).filter(level => level > 0).sort((a, b) => a - b)

    const parentToChildren = new Map<string, Node[]>()
    connections.forEach((conn) => {
      const child = nodesById.get(conn.to)
      if (!child) return
      if (!parentToChildren.has(conn.from)) {
        parentToChildren.set(conn.from, [])
      }
      parentToChildren.get(conn.from)!.push(child)
    })

    const placedNodes = new Map<string, Node>()
    const nodeAngles = new Map<string, number>()

    const placeNode = (node: Node, angle: number, radius: number) => {
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      placedNodes.set(node.id, { ...node, x, y })
      nodeAngles.set(node.id, angle)
    }

    // Place home node at center
    const homeNode = nodes.find(n => n.level === 0) || nodes[0]
    placedNodes.set(homeNode.id, { ...homeNode, x: centerX, y: centerY })
    nodeAngles.set(homeNode.id, -Math.PI / 2)

    const baseRadius = Math.min(availableWidth, availableHeight) * 0.28
    const levelGap = Math.min(availableWidth, availableHeight) * 0.18

    // Level 1 nodes evenly around the home node
    const level1Nodes = nodesByLevel.get(1) || []
    const level1Count = level1Nodes.length
    if (level1Count > 0) {
      level1Nodes.forEach((node, idx) => {
        const angle = level1Count === 1
          ? -Math.PI / 2
          : ((2 * Math.PI) * idx) / level1Count - Math.PI / 2
        placeNode(node, angle, baseRadius)
      })
    }

    // Higher-level nodes positioned around their parents
    allLevels.forEach((level) => {
      if (level <= 1) return
      const levelNodes = nodesByLevel.get(level) || []
      if (levelNodes.length === 0) return
      const levelRadius = baseRadius + levelGap * (level - 1)
      const remaining = new Set(levelNodes.map(node => node.id))

      parentToChildren.forEach((children, parentId) => {
        const group = children.filter(child => (child.level ?? 0) === level)
        if (group.length === 0) return
        const parent = placedNodes.get(parentId)
        if (!parent) return

        const parentAngle = nodeAngles.get(parentId) ?? -Math.PI / 2
        const count = group.length
        const spread = Math.min(Math.PI / 1.4, 0.4 * count)
        const step = count > 1 ? spread / (count - 1) : 0
        const startAngle = parentAngle - spread / 2

        group.forEach((child, index) => {
          const angle = count > 1 ? startAngle + index * step : parentAngle
          placeNode(child, angle, levelRadius)
          remaining.delete(child.id)
        })
      })

      // Any remaining nodes without placed parents are distributed evenly
      const remainingIds = Array.from(remaining)
      const remainingCount = remainingIds.length
      if (remainingCount > 0) {
        remainingIds.forEach((id, idx) => {
          const node = nodesById.get(id)
          if (!node) return
          const angle = remainingCount === 1
            ? -Math.PI / 2
            : ((2 * Math.PI) * idx) / remainingCount - Math.PI / 2
          placeNode(node, angle, levelRadius)
        })
      }
    })

    // Ensure every node has a position
    nodes.forEach((node) => {
      if (!placedNodes.has(node.id)) {
        placedNodes.set(node.id, { ...node, x: centerX, y: centerY })
      }
    })

    const initialNodes = nodes.map(node => placedNodes.get(node.id) ?? node)

    // Apply force-directed spacing to prevent overlaps - enhanced algorithm
    const finalNodes = initialNodes.map(node => ({ ...node }))
    const iterations = 25
    const damping = 0.28
    const nodeWidth = 200
    const nodeHeight = 80

    for (let i = 0; i < iterations; i++) {
      finalNodes.forEach((node, idx) => {
        let fx = 0, fy = 0

        finalNodes.forEach((otherNode, otherIdx) => {
          if (idx === otherIdx) return

          const dx = otherNode.x - node.x
          const dy = otherNode.y - node.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.1

          const actualMinDistance = minNodeDistance + Math.max(nodeWidth, nodeHeight) / 2

          if (distance < actualMinDistance) {
            const overlap = actualMinDistance - distance
            const force = (overlap / actualMinDistance) * 55
            fx -= (dx / distance) * force
            fy -= (dy / distance) * force
          } else if (distance < actualMinDistance * 1.5) {
            const force = ((actualMinDistance * 1.5 - distance) / actualMinDistance) * 12
            fx -= (dx / distance) * force
            fy -= (dy / distance) * force
          }
        })

        const newX = node.x + fx * damping
        const newY = node.y + fy * damping

        node.x = Math.max(padding + nodeWidth / 2, Math.min(availableWidth - padding - nodeWidth / 2, newX))
        node.y = Math.max(padding + nodeHeight / 2, Math.min(availableHeight - padding - nodeHeight / 2, newY))
      })
    }

    // Final pass: resolve remaining overlaps directly
    finalNodes.forEach((node, idx) => {
      finalNodes.forEach((otherNode, otherIdx) => {
        if (idx === otherIdx) return

        const dx = otherNode.x - node.x
        const dy = otherNode.y - node.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.1
        const actualMinDistance = minNodeDistance + Math.max(nodeWidth, nodeHeight) / 2

        if (distance < actualMinDistance) {
          const pushDistance = (actualMinDistance - distance) / 2
          const pushX = (dx / distance) * pushDistance
          const pushY = (dy / distance) * pushDistance

          node.x = Math.max(padding + nodeWidth / 2, Math.min(availableWidth - padding - nodeWidth / 2, node.x - pushX))
          node.y = Math.max(padding + nodeHeight / 2, Math.min(availableHeight - padding - nodeHeight / 2, node.y - pushY))

          otherNode.x = Math.max(padding + nodeWidth / 2, Math.min(availableWidth - padding - nodeWidth / 2, otherNode.x + pushX))
          otherNode.y = Math.max(padding + nodeHeight / 2, Math.min(availableHeight - padding - nodeHeight / 2, otherNode.y + pushY))
        }
      })
    })

    setNodes(finalNodes)

    // Center the nodes in view at 50% zoom
    const allX = finalNodes.map(n => n.x)
    const allY = finalNodes.map(n => n.y)
    const centerNodeX = (Math.min(...allX) + Math.max(...allX)) / 2
    const centerNodeY = (Math.min(...allY) + Math.max(...allY)) / 2

    setPanOffset({
      x: canvasWidth / 2 - centerNodeX * targetZoom,
      y: canvasHeight / 2 - centerNodeY * targetZoom
    })
    setZoom(targetZoom) // 50% zoom with naturally spaced nodes
  }

  // Track if we've auto-fitted for current node set
  const lastNodeCount = useRef(0)
  useEffect(() => {
    // Only auto-fit when node count changes (new generation)
    if (nodes.length > 0 && nodes.length !== lastNodeCount.current) {
      lastNodeCount.current = nodes.length
      setTimeout(() => {
        centerView()
      }, 300) // Wait a bit longer for canvas to be fully rendered
    }
  }, [nodes.length])

  if (nodes.length === 0) {
    return (
      <div className="text-center py-12 text-mid-grey">
        <p className="mb-4">Site flow will be generated automatically from your app description</p>
        <button
          onClick={() => {
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
    <div className="flex flex-col relative" style={{ height: '600px' }}>
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
          // Only zoom with Ctrl/Cmd + wheel
          // Trackpad gestures have small deltas (< 50), mouse wheel has larger jumps
          const isZoomGesture = e.ctrlKey || e.metaKey
          const isMouseWheel = Math.abs(e.deltaY) > 50
          
          if (isZoomGesture || isMouseWheel) {
            // Zoom gesture
          e.preventDefault()
          const delta = e.deltaY > 0 ? -0.1 : 0.1
          handleZoom(delta)
          } else {
            // Trackpad scroll - pan the canvas
            e.preventDefault()
            setPanOffset(prev => ({
              x: prev.x - e.deltaX,
              y: prev.y - e.deltaY
            }))
          }
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
              orient="auto-start-reverse"
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
              orient="auto-start-reverse"
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
            {connections.map((conn) => {
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
                    markerStart={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                    markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
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

        {/* Minimap placeholder removed for simplicity */}
      </div>

      {/* Simple Instructions */}
      <div className="mt-2 text-xs text-mid-grey text-center">
        Double-click nodes to edit • Right-click for menu • Scroll or two-finger drag to pan • Hold Ctrl/Cmd and scroll (or use a mouse wheel) to zoom
      </div>
    </div>
  )
})

export default SiteFlowVisualizer

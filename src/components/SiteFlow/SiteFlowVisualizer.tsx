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

const NODE_WIDTH = 260
const NODE_HEIGHT = 110
const VERTICAL_GAP = 260
const MIN_COLUMN_GAP = 320

const SiteFlowVisualizer = forwardRef<SiteFlowHandle, SiteFlowVisualizerProps>(({
  appDescription = '',
  prdContent,
  onSiteFlowChange,
  initialSiteFlow,
}, ref) => {
  const [nodes, setNodes] = useState<Node[]>(initialSiteFlow?.nodes || [])
  const [connections, setConnections] = useState<Connection[]>(initialSiteFlow?.connections || [])
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(0.3) // Default to 30% zoom
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [workspaceSize, setWorkspaceSize] = useState({ width: 2800, height: 1800 })
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

  const handleZoom = (delta: number) => {
    setZoom(prev => {
      const next = Math.max(0.3, Math.min(1.5, prev + delta))
      return parseFloat(next.toFixed(2))
    })
  }

  const centerView = () => {
    if (nodes.length === 0 || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const canvasWidth = rect.width
    const canvasHeight = rect.height
    const targetZoom = 0.3
    const padding = 200

    const nodesById = new Map<string, Node>(nodes.map(node => [String(node.id), node]))
    const childMap = new Map<string, string[]>()
    const incomingCount = new Map<string, number>()

    connections.forEach(({ from, to }) => {
      const fromId = String(from)
      const toId = String(to)
      if (!childMap.has(fromId)) {
        childMap.set(fromId, [])
      }
      childMap.get(fromId)!.push(toId)
      incomingCount.set(toId, (incomingCount.get(toId) ?? 0) + 1)
    })

    const maxDepth = Math.max(...nodes.map(node => node.level ?? 0), 0)
    const horizontalGap = Math.max((2800 - padding * 2) / Math.max(maxDepth, 1), MIN_COLUMN_GAP)

    const positions = new Map<string, { x: number; y: number }>()
    const visited = new Set<string>()
    let nextY = padding

    const assign = (id: string, depth: number): number => {
      if (visited.has(id)) {
        return positions.get(id)?.y ?? nextY
      }
      visited.add(id)

      const node = nodesById.get(id)
      if (!node) {
        const yFallback = nextY
        nextY += VERTICAL_GAP
        return yFallback
      }

      const level = node.level ?? depth
      const x = padding + level * horizontalGap
      const children = (childMap.get(id) ?? []).filter(childId => nodesById.has(childId))

      if (children.length === 0) {
        const y = nextY
        positions.set(id, { x, y })
        nextY += VERTICAL_GAP
        return y
      }

      const childYs = children.map(childId => assign(childId, level + 1))
      const minY = Math.min(...childYs)
      const maxY = Math.max(...childYs)
      const y = (minY + maxY) / 2
      positions.set(id, { x, y })
      return y
    }

    const roots = nodes.filter(node => {
      const nodeId = String(node.id)
      return (node.level ?? 0) === 0 || (incomingCount.get(nodeId) ?? 0) === 0
    })

    const orderedRoots = roots.length > 0 ? roots : nodes.slice(0, 1)
    orderedRoots.forEach(root => {
      assign(String(root.id), root.level ?? 0)
      nextY += VERTICAL_GAP
    })

    nodes.forEach(node => {
      const id = String(node.id)
      if (!visited.has(id)) {
        assign(id, node.level ?? 0)
        nextY += VERTICAL_GAP
      }
    })

    const laidOut = nodes.map(node => {
      const pos = positions.get(String(node.id))
      if (!pos) return node
      return { ...node, x: pos.x, y: pos.y }
    })

    const allX = laidOut.map(n => n.x)
    const allY = laidOut.map(n => n.y)
    const maxX = Math.max(...allX, 0)
    const maxY = Math.max(...allY, 0)
    const widthNeeded = maxX + NODE_WIDTH + padding
    const heightNeeded = maxY + NODE_HEIGHT + padding
    const newWidth = Math.max(2800, widthNeeded)
    const newHeight = Math.max(1800, heightNeeded)
    setWorkspaceSize({ width: newWidth, height: newHeight })

    setNodes(laidOut)

    const centerNodeX = (Math.min(...allX) + Math.max(...allX)) / 2
    const centerNodeY = (Math.min(...allY) + Math.max(...allY)) / 2

    setPanOffset({ x: 0, y: 0 })
    setZoom(targetZoom)

    const scrollLeft = Math.max(0, centerNodeX * targetZoom - canvasWidth / 2)
    const scrollTop = Math.max(0, centerNodeY * targetZoom - canvasHeight / 2)
    canvasRef.current.scrollTo({ left: scrollLeft, top: scrollTop })
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
    <div className="flex flex-col relative" style={{ height: '80vh' }}>
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
        className="flex-1 relative rounded-lg border border-divider/50 overflow-auto"
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `
            linear-gradient(to right, #2A2A2A 1px, transparent 1px),
            linear-gradient(to bottom, #2A2A2A 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundColor: '#121212',
          cursor: isPanning ? 'grabbing' : connectingFrom ? 'crosshair' : 'default'
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
        }}
      >
        <div
          ref={canvasContainerRef}
          className="relative"
          style={{ width: workspaceSize.width, height: workspaceSize.height }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              position: 'relative',
              width: workspaceSize.width,
              height: workspaceSize.height,
            }}
          >
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
                    <div className={`bg-dark-card border rounded-lg p-4 hover:shadow-lg transition-shadow ${
                      node.level === 0
                        ? 'bg-amber-gold/5 border-2 border-amber-gold/30'
                        : isHighlighted
                        ? 'border-2 border-amber-gold/50 bg-amber-gold/10'
                        : 'border-divider'
                    }`} style={{ width: `${NODE_WIDTH}px`, minHeight: `${NODE_HEIGHT}px` }}>
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
            <svg
              className="absolute inset-0 pointer-events-none"
              width={workspaceSize.width}
              height={workspaceSize.height}
            >
              <defs>
                <marker
                  id="siteflow-arrow"
                  markerWidth="12"
                  markerHeight="12"
                  refX="9"
                  refY="6"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L12,6 L0,12 z" fill="#fbbf24" />
                </marker>
              </defs>
              {connections.map((connection, index) => {
                const fromNode = nodes.find(node => node.id === connection.from)
                const toNode = nodes.find(node => node.id === connection.to)

                if (!fromNode || !toNode) return null

                const startX = fromNode.x + NODE_WIDTH
                const startY = fromNode.y + NODE_HEIGHT / 2
                const endX = toNode.x - 12
                const endY = toNode.y + NODE_HEIGHT / 2
                const controlX = (startX + endX) / 2

                const isActive = selectedNodes.has(fromNode.id) || selectedNodes.has(toNode.id)

                return (
                  <path
                    key={`${connection.from}-${connection.to}-${index}`}
                    d={`M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`}
                    stroke={isActive ? '#fbbf24' : '#4b5563'}
                    strokeWidth={isActive ? 2.5 : 1.6}
                    fill="none"
                    markerEnd="url(#siteflow-arrow)"
                    opacity={0.75}
                  />
                )
              })}
            </svg>
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
        Double-click nodes to edit • Right-click for menu • Drag canvas to pan • Use the side slider to zoom in/out
      </div>
    </div>
  )
})

export default SiteFlowVisualizer

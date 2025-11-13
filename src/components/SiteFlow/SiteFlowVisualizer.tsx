import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react'
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

type RenderedConnection = Connection & { generated?: boolean }

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
const TARGET_ZOOM = 0.3
const CANVAS_PADDING = 250
const HORIZONTAL_SPACING = NODE_WIDTH + 220
const LEAF_VERTICAL_SPACING = NODE_HEIGHT + 140

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
  const editInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const handleEditRef = (element: HTMLInputElement | HTMLTextAreaElement | null) => {
    editInputRef.current = element
  }
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const latestSiteFlowRef = useRef<SiteFlowData | null>(initialSiteFlow ? initialSiteFlow : null)

  const renderedConnections: RenderedConnection[] = useMemo(() => {
    const result: RenderedConnection[] = [...connections]
    const existing = new Set(result.map(conn => `${conn.from}->${conn.to}`))

    const nodesById = new Map<string, Node>()
    nodes.forEach(node => {
      nodesById.set(node.id, node)
    })

    const adjacency = new Map<string, Set<string>>()
    const incomingSources = new Map<string, Set<string>>()
    result.forEach(conn => {
      if (!adjacency.has(conn.from)) {
        adjacency.set(conn.from, new Set())
      }
      adjacency.get(conn.from)!.add(conn.to)

      if (!incomingSources.has(conn.to)) {
        incomingSources.set(conn.to, new Set())
      }
      incomingSources.get(conn.to)!.add(conn.from)
    })

    const rootCandidates = new Set<string>()
    nodes.forEach(node => {
      const explicitLevel = node.level
      if (explicitLevel === 0) {
        rootCandidates.add(node.id)
      }
    })
    nodes.forEach(node => {
      if (!incomingSources.has(node.id)) {
        rootCandidates.add(node.id)
      }
    })
    if (rootCandidates.size === 0 && nodes.length > 0) {
      rootCandidates.add(nodes[0].id)
    }

    const computedLevels = new Map<string, number>()
    const queue: string[] = []
    rootCandidates.forEach(id => {
      computedLevels.set(id, 0)
      queue.push(id)
    })
    while (queue.length > 0) {
      const currentId = queue.shift() as string
      const currentLevel = computedLevels.get(currentId) ?? 0
      const children = adjacency.get(currentId)
      if (!children) continue
      children.forEach(childId => {
        const nextLevel = currentLevel + 1
        const existingLevel = computedLevels.get(childId)
        if (existingLevel === undefined || nextLevel < existingLevel) {
          computedLevels.set(childId, nextLevel)
          queue.push(childId)
        }
      })
    }

    const effectiveLevels = new Map<string, number>()
    nodes.forEach(node => {
      if (typeof node.level === 'number') {
        effectiveLevels.set(node.id, node.level)
      } else if (computedLevels.has(node.id)) {
        effectiveLevels.set(node.id, computedLevels.get(node.id)!)
      } else if (rootCandidates.has(node.id)) {
        effectiveLevels.set(node.id, 0)
      } else {
        effectiveLevels.set(node.id, 1)
      }
    })

    const nodesByLevel = new Map<number, Node[]>()
    nodes.forEach(node => {
      const level = effectiveLevels.get(node.id) ?? 0
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, [])
      }
      nodesByLevel.get(level)!.push(node)
    })

    nodes.forEach(node => {
      const nodeLevel = effectiveLevels.get(node.id) ?? 0
      if (nodeLevel <= 0) return

      const hasParentAtPrevLevel = result.some(conn => {
        if (conn.to !== node.id) return false
        const parentLevel = effectiveLevels.get(conn.from) ?? 0
        return parentLevel === nodeLevel - 1
      })
      if (hasParentAtPrevLevel) return

      const desiredParentLevel = nodeLevel - 1
      const potentialParents = nodesByLevel.get(desiredParentLevel) ?? []
      let parent: Node | undefined

      if (potentialParents.length > 0) {
        parent = potentialParents.reduce((closest, candidate) => {
          if (candidate.id === node.id) return closest
          if (!closest) return candidate
          const candidateDistance = Math.abs(candidate.y - node.y)
          const closestDistance = Math.abs(closest.y - node.y)
          return candidateDistance < closestDistance ? candidate : closest
        }, undefined as Node | undefined)
      }

      if (!parent) {
        const rootList = nodesByLevel.get(0) ?? []
        parent = rootList[0]
      }

      if (parent && parent.id !== node.id) {
        const key = `${parent.id}->${node.id}`
        if (!existing.has(key)) {
          result.push({ from: parent.id, to: node.id, generated: true })
          existing.add(key)
        }
      }
    })

    return result
  }, [connections, nodes])

  useImperativeHandle(ref, () => ({
    getCurrentSiteFlow: () => latestSiteFlowRef.current,
  }), [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const styleId = 'siteflow-supabase-animation'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `@keyframes siteflowSupabaseDash { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -400; } }`
      document.head.appendChild(style)
    }
  }, [])

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

  const centerView = useCallback(() => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const canvasWidth = rect.width
    const canvasHeight = rect.height

    const availableWidth = Math.max(canvasWidth / TARGET_ZOOM - CANVAS_PADDING * 2, HORIZONTAL_SPACING)
    const availableHeight = Math.max(canvasHeight / TARGET_ZOOM - CANVAS_PADDING * 2, LEAF_VERTICAL_SPACING)

    setNodes(prevNodes => {
      if (prevNodes.length === 0) {
        return prevNodes
      }

      const nodesById = new Map<string, Node>(prevNodes.map(node => [String(node.id), node]))
      const childMap = new Map<string, string[]>()
      const incomingCount = new Map<string, number>()

      connections.forEach(({ from, to }) => {
        const fromId = String(from)
        const toId = String(to)
        if (!nodesById.has(fromId) || !nodesById.has(toId)) {
          return
        }
        if (!childMap.has(fromId)) {
          childMap.set(fromId, [])
        }
        childMap.get(fromId)!.push(toId)
        incomingCount.set(toId, (incomingCount.get(toId) ?? 0) + 1)
      })

      let roots = prevNodes.filter(node => {
        const nodeId = String(node.id)
        return (node.level ?? 0) === 0 || (incomingCount.get(nodeId) ?? 0) === 0
      })

      if (roots.length === 0) {
        roots = [prevNodes[0]]
      }

      roots.sort((a, b) => (a.y ?? 0) - (b.y ?? 0))

      const levelMap = new Map<string, number>()
      const queue: Array<{ id: string; depth: number }> = roots.map(root => ({
        id: String(root.id),
        depth: root.level ?? 0,
      }))

      queue.forEach(({ id, depth }) => levelMap.set(id, depth))

      while (queue.length > 0) {
        const { id, depth } = queue.shift()!
        const children = childMap.get(id) ?? []
        children.forEach(childId => {
          if (!nodesById.has(childId)) return
          const nextDepth = depth + 1
          const recorded = levelMap.get(childId)
          if (recorded === undefined || nextDepth > recorded) {
            levelMap.set(childId, nextDepth)
            queue.push({ id: childId, depth: nextDepth })
          }
        })
      }

      prevNodes.forEach(node => {
        const id = String(node.id)
        if (!levelMap.has(id)) {
          levelMap.set(id, node.level ?? 0)
        }
      })

      const depthValues = Array.from(levelMap.values())
      const maxDepth = depthValues.length > 0 ? Math.max(...depthValues) : 0
      const columnWidth = Math.max(
        HORIZONTAL_SPACING,
        maxDepth > 0 ? availableWidth / Math.max(maxDepth, 1) : HORIZONTAL_SPACING
      )

      const visited = new Set<string>()
      const positions = new Map<string, { x: number; y: number }>()
      let nextLeafIndex = 0

      const assignPositions = (id: string, fallbackDepth: number): number => {
        if (visited.has(id)) {
          const existing = positions.get(id)
          return existing ? existing.y : nextLeafIndex * LEAF_VERTICAL_SPACING
        }
        visited.add(id)

        const node = nodesById.get(id)
        if (!node) {
          const y = nextLeafIndex * LEAF_VERTICAL_SPACING
          nextLeafIndex += 1
          return y
        }

        const depth = levelMap.get(id) ?? fallbackDepth
        const children = (childMap.get(id) ?? []).filter(childId => nodesById.has(childId))

        const x = CANVAS_PADDING + depth * columnWidth

        if (children.length === 0) {
          const y = nextLeafIndex * LEAF_VERTICAL_SPACING
          nextLeafIndex += 1
          positions.set(id, { x, y })
          return y
        }

        const childYs = children.map(childId => assignPositions(childId, depth + 1))
        const minY = Math.min(...childYs)
        const maxY = Math.max(...childYs)
        const y = (minY + maxY) / 2
        positions.set(id, { x, y })
        return y
      }

      roots.forEach(root => {
        assignPositions(String(root.id), levelMap.get(String(root.id)) ?? 0)
      })

      prevNodes.forEach(node => {
        const id = String(node.id)
        if (!visited.has(id)) {
          assignPositions(id, levelMap.get(id) ?? 0)
        }
      })

      const positionedNodes = prevNodes.map(node => {
        const pos = positions.get(String(node.id))
        if (!pos) return node
        const depth = levelMap.get(String(node.id)) ?? (node.level ?? 0)
        return {
          ...node,
          level: depth,
          x: pos.x,
          y: pos.y,
        }
      })

      const yValues = positionedNodes.map(node => node.y)
      const minY = yValues.length > 0 ? Math.min(...yValues) : 0
      const maxY = yValues.length > 0 ? Math.max(...yValues) : 0
      const totalHeight = maxY - minY + NODE_HEIGHT
      const extraVerticalSpace = availableHeight - totalHeight
      const verticalShift = extraVerticalSpace > 0
        ? CANVAS_PADDING + extraVerticalSpace / 2 - minY
        : CANVAS_PADDING - minY

      const shiftedNodes = positionedNodes.map(node => ({
        ...node,
        y: node.y + verticalShift,
      }))

      const maxX = Math.max(...shiftedNodes.map(node => node.x + NODE_WIDTH))
      const maxShiftedY = Math.max(...shiftedNodes.map(node => node.y + NODE_HEIGHT))
      const requiredWidth = maxX + CANVAS_PADDING
      const requiredHeight = maxShiftedY + CANVAS_PADDING

      setWorkspaceSize(current => ({
        width: Math.max(current.width, Math.ceil(requiredWidth)),
        height: Math.max(current.height, Math.ceil(requiredHeight)),
      }))

      return shiftedNodes
    })

    setZoom(TARGET_ZOOM)
    setPanOffset({ x: 0, y: 0 })
  }, [connections])

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
  }, [nodes.length, centerView])

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
            <svg
              className="absolute inset-0 pointer-events-none"
              width={workspaceSize.width}
              height={workspaceSize.height}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: workspaceSize.width,
                height: workspaceSize.height,
                zIndex: 0,
              }}
            >
              <defs>
                <linearGradient id="siteflow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3ECF8E" />
                  <stop offset="50%" stopColor="#4E46E5" />
                  <stop offset="100%" stopColor="#3ECF8E" />
                </linearGradient>
                <marker
                  id="siteflow-arrow"
                  markerWidth="12"
                  markerHeight="12"
                  refX="9"
                  refY="6"
                  orient="auto-start-reverse"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L12,6 L0,12 z" fill="#fbbf24" />
                </marker>
                <marker
                  id="siteflow-arrow-start"
                  markerWidth="12"
                  markerHeight="12"
                  refX="3"
                  refY="6"
                  orient="auto-start-reverse"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L12,6 L0,12 z" fill="#fbbf24" />
                </marker>
                <marker
                  id="siteflow-arrow-gradient"
                  markerWidth="12"
                  markerHeight="12"
                  refX="9"
                  refY="6"
                  orient="auto-start-reverse"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L12,6 L0,12 z" fill="url(#siteflow-gradient)" />
                </marker>
                <marker
                  id="siteflow-arrow-start-gradient"
                  markerWidth="12"
                  markerHeight="12"
                  refX="3"
                  refY="6"
                  orient="auto-start-reverse"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L12,6 L0,12 z" fill="url(#siteflow-gradient)" />
                </marker>
                <filter id="siteflow-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {renderedConnections.map((connection, index) => {
                const fromNode = nodes.find(node => node.id === connection.from)
                const toNode = nodes.find(node => node.id === connection.to)

                if (!fromNode || !toNode) return null

                const START_GAP = 32
                const END_GAP = 36
                const isForward = fromNode.x <= toNode.x
                const startX = isForward
                  ? fromNode.x + NODE_WIDTH + START_GAP
                  : fromNode.x - START_GAP
                const startY = fromNode.y + NODE_HEIGHT / 2
                const endX = isForward
                  ? toNode.x - END_GAP
                  : toNode.x + NODE_WIDTH + END_GAP
                const endY = toNode.y + NODE_HEIGHT / 2

                const horizontalDistance = Math.max(Math.abs(endX - startX), 140)
                const verticalDistance = endY - startY
                const midX = (startX + endX) / 2
                const midY = (startY + endY) / 2
                const controlOffset = Math.max(horizontalDistance * 0.5, 120)

                const controlX1 = isForward ? startX + controlOffset : startX - controlOffset
                const controlX2 = isForward ? endX - controlOffset : endX + controlOffset
                const controlY1 = startY + verticalDistance * 0.25
                const controlY2 = endY - verticalDistance * 0.25

                const isShortLink = horizontalDistance < 200 && Math.abs(verticalDistance) < 140
                const pathD = isShortLink
                  ? `M ${startX} ${startY} Q ${isForward ? midX + 90 : midX - 90} ${midY} ${endX} ${endY}`
                  : `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`

                const isActive = selectedNodes.has(fromNode.id) || selectedNodes.has(toNode.id)
                const animationDuration = isActive ? '4s' : '8s'
                const dashPattern = isActive ? '12 6' : '6 4'

                return (
                  <path
                    key={`${connection.from}-${connection.to}-${index}`}
                    d={pathD}
                    stroke="url(#siteflow-gradient)"
                    strokeWidth={isActive ? 3 : 1.8}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={dashPattern}
                    style={{ animation: `siteflowSupabaseDash ${animationDuration} linear infinite`, filter: isActive ? 'url(#siteflow-glow)' : 'none' }}
                    markerStart={isActive ? 'url(#siteflow-arrow-start)' : 'url(#siteflow-arrow-start-gradient)'}
                    markerEnd={isActive ? 'url(#siteflow-arrow)' : 'url(#siteflow-arrow-gradient)'}
                    opacity={isActive ? 1 : 0.92}
                  />
                )
              })}
            </svg>
            {filteredNodes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-mid-grey">No nodes to display</p>
              </div>
            ) : (
              filteredNodes.map(node => {
                const isHighlighted = searchQuery && (
                  node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (node.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
                )
                const isSelected = selectedNodes.has(node.id)
                const isEditing = editingNode === node.id

                return (
                  <div
                    key={node.id}
                    className={`absolute cursor-move transition-transform duration-150 ${isSelected ? 'z-30' : 'z-10'} ${draggingNode === node.id ? 'opacity-80' : ''}`}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                    onMouseDown={e => {
                      if (!connectingFrom) {
                        handleMouseDown(e, node.id)
                      }
                    }}
                    onClick={e => {
                      e.stopPropagation()
                      handleNodeClick(node.id, e)
                    }}
                    onDoubleClick={e => {
                      e.stopPropagation()
                      handleNodeClick(node.id, e)
                    }}
                    onContextMenu={e => handleContextMenu(e, node.id)}
                  >
                    <div
                      className={`w-[260px] rounded-xl border border-divider/50 bg-dark-card px-4 py-3 shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition-all ${
                        isSelected ? 'ring-2 ring-amber-gold ring-offset-2 ring-offset-[#121212]' : ''
                      } ${isHighlighted ? 'border-amber-gold/60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-mid-grey/70">
                            {node.level === 0 ? 'Root' : `Level ${node.level ?? 0}`}
                          </p>
                          <h3 className="text-sm font-semibold text-white line-clamp-2">
                            {node.name || 'Untitled Page'}
                          </h3>
                        </div>
                        <button
                          className="shrink-0 rounded-full border border-divider/40 bg-dark-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-mid-grey hover:border-amber-gold/60 hover:text-amber-gold"
                          onClick={e => {
                            e.stopPropagation()
                            setConnectingFrom(prev => (prev === node.id ? null : node.id))
                          }}
                        >
                          Link
                        </button>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-mid-grey line-clamp-4">
                        {node.description || 'Click to add details for this page.'}
                      </p>
                      <div className="mt-4 flex items-center justify-between text-[11px] text-mid-grey/80">
                        <span>{connections.filter(c => c.from === node.id).length} outgoing • {connections.filter(c => c.to === node.id).length} incoming</span>
                        <div className="flex items-center gap-2">
                          <button
                            className="rounded-md bg-dark-surface px-2 py-1 text-[11px] font-medium text-mid-grey hover:text-white"
                            onClick={e => {
                              e.stopPropagation()
                              setEditingNode(node.id)
                              setEditingField('name')
                              setEditValue(node.name)
                            }}
                          >
                            Rename
                          </button>
                          <button
                            className="rounded-md bg-dark-surface px-2 py-1 text-[11px] font-medium text-mid-grey hover:text-amber-gold"
                            onClick={e => {
                              e.stopPropagation()
                              addChildPage(node.id)
                            }}
                          >
                            Add child
                          </button>
                        </div>
                      </div>
                    </div>
                    {isEditing && (
                      <div className="absolute inset-0 rounded-xl border-2 border-amber-gold/60" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      {contextMenu && (
        <div
          className="fixed z-50 w-48 rounded-lg border border-divider/40 bg-dark-card p-2 text-sm text-white shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-dark-surface"
            onClick={() => {
              if (contextMenu.nodeId) {
                addChildPage(contextMenu.nodeId)
              } else if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect()
                addNewNode(rect.width / 2, rect.height / 2)
              }
              setContextMenu(null)
            }}
          >
            + Add child page
          </button>
          {contextMenu.nodeId && (
            <>
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-dark-surface"
                onClick={() => {
                  const node = nodes.find(n => n.id === contextMenu.nodeId)
                  if (node) {
                    setEditingNode(node.id)
                    setEditingField('name')
                    setEditValue(node.name)
                  }
                  setContextMenu(null)
                }}
              >
                ✏️ Rename
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  deleteNode(contextMenu.nodeId!)
                }}
              >
                🗑 Delete
              </button>
            </>
          )}
        </div>
      )}
      {editingNode && editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-divider/40 bg-dark-card p-6 text-white shadow-2xl">
            <h3 className="mb-4 text-base font-semibold">
              {editingField === 'name' ? 'Rename page' : 'Edit description'}
            </h3>
            {editingField === 'name' ? (
              <input
                ref={handleEditRef}
                className="w-full rounded-lg border border-divider/40 bg-dark-surface px-3 py-2 text-sm text-white focus:border-amber-gold focus:outline-none"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
              />
            ) : (
              <textarea
                ref={handleEditRef}
                className="w-full rounded-lg border border-divider/40 bg-dark-surface px-3 py-2 text-sm text-white focus:border-amber-gold focus:outline-none"
                rows={4}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
              />
            )}
            <div className="mt-6 flex items-center justify-end gap-3 text-sm">
              <button
                className="rounded-md px-4 py-2 text-mid-grey hover:text-white"
                onClick={handleEditCancel}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-amber-gold px-4 py-2 font-semibold text-black hover:bg-amber-gold/90"
                onClick={handleEditSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none mt-3 flex items-center justify-center text-[11px] uppercase tracking-wide text-mid-grey/70">
        <span>Drag nodes to rearrange • Shift+Click to multi-select • Right-click for options</span>
      </div>
    </div>
  )
})

export default SiteFlowVisualizer

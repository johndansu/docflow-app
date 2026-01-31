import React, { useState, useRef, useEffect, useCallback } from 'react'

export interface SiteFlowNode {
  id: string
  name: string
  type: 'trigger' | 'action' | 'condition' | 'webhook' | 'api' | 'database' | 'page' | 'form' | 'auth' | 'payment' | 'notification' | 'integration' | 'analytics'
  description?: string
  x: number
  y: number
  status: 'active' | 'inactive' | 'error'
  icon?: string
  color?: string
}

export interface SiteFlowConnection {
  from: string
  to: string
  type: 'success' | 'failure' | 'conditional'
}

export interface SiteFlowData {
  nodes: SiteFlowNode[]
  connections: SiteFlowConnection[]
}

export interface SiteFlowVisualizerProps {
  appDescription?: string
  prdContent?: string
  projectName?: string
  onSiteFlowChange?: (flow: SiteFlowData) => void
}

// Calculate dynamic node width based on text length
const getNodeWidth = (name?: string, description?: string) => {
  const baseWidth = 180
  const nameLength = name?.length || 0
  const descLength = description?.length || 0
  
  // Calculate width needed for text (rough estimation)
  const nameWidth = nameLength * 6 // ~6px per character for 11px font
  const descWidth = descLength * 5 // ~5px per character for 8px font
  const textWidth = Math.max(nameWidth, descWidth)
  
  // Add padding and icon space
  const totalWidth = Math.max(baseWidth, textWidth + 60) // 60px for padding + icon + status
  
  // Cap maximum width for layout consistency
  return Math.min(totalWidth, 280)
}

const NODE_HEIGHT = 140

// Color scheme
const COLORS = {
  trigger: '#F59E0B',      // Site Yellow
  action: '#F59E0B',       // Site Yellow  
  condition: '#F59E0B',    // Site Yellow
  webhook: '#F59E0B',      // Site Yellow
  api: '#F59E0B',          // Site Yellow
  database: '#F59E0B',     // Site Yellow
  page: '#10B981',         // Emerald Green
  form: '#3B82F6',        // Blue
  auth: '#8B5CF6',         // Purple
  payment: '#EF4444',      // Red
  notification: '#F97316', // Orange
  integration: '#06B6D4',  // Cyan
  analytics: '#84CC16'     // Lime Green
}

// Vector icon components
const getVectorIcon = (type: string) => {
  const iconProps = {
    width: "12",
    height: "12",
    fill: "none",
    stroke: "#F59E0B",
    strokeWidth: "2",
    viewBox: "0 0 24 24"
  }

  switch (type) {
    case 'trigger':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    case 'action':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    case 'condition':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    case 'webhook':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    case 'api':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    case 'database':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      )
    case 'page':
      return (
        <svg {...iconProps} style={{ stroke: COLORS.page }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    case 'form':
      return (
        <svg {...iconProps} style={{ stroke: COLORS.form }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    case 'auth':
      return (
        <svg {...iconProps} style={{ stroke: COLORS.auth }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    case 'payment':
      return (
        <svg {...iconProps} style={{ stroke: COLORS.payment }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    case 'notification':
      return (
        <svg {...iconProps} style={{ stroke: COLORS.notification }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    case 'integration':
      return (
        <svg {...iconProps} style={{ stroke: COLORS.integration }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    case 'analytics':
      return (
        <svg {...iconProps} style={{ stroke: COLORS.analytics }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    default:
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
  }
}

const SiteFlowVisualizer: React.FC<SiteFlowVisualizerProps> = ({
  appDescription,
  prdContent,
  projectName,
  onSiteFlowChange
}) => {
  const [nodes, setNodes] = useState<SiteFlowNode[]>([])
  const [connections, setConnections] = useState<SiteFlowConnection[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [zoom, setZoom] = useState(50)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (appDescription || prdContent) {
      generateWorkflow()
    }
  }, [appDescription, prdContent])

  const generateWorkflow = useCallback(async () => {
    setIsGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Analyze PRD content to generate unique workflow
    const prdText = (prdContent || '').toLowerCase()
    const appText = (appDescription || '').toLowerCase()
    const combinedText = `${prdText} ${appText}`
    
    // Generate unique nodes based on actual content
    let workflowNodes: SiteFlowNode[] = []
    let workflowConnections: SiteFlowConnection[] = []
    
    // Extract key features from the PRD to create comprehensive site structure
    const features = []
    
    // Always include core pages for a complete website
    const corePages = [
      { name: 'Homepage', type: 'page' },
      { name: 'About Us', type: 'page' },
      { name: 'Contact', type: 'page' }
    ]
    
    // Authentication & User Management Pages
    if (combinedText.includes('login') || combinedText.includes('auth') || combinedText.includes('signin')) {
      features.push({ name: 'Login Page', type: 'page' })
      features.push({ name: 'Forgot Password', type: 'page' })
    }
    if (combinedText.includes('register') || combinedText.includes('signup') || combinedText.includes('create account')) {
      features.push({ name: 'Registration Page', type: 'page' })
    }
    if (combinedText.includes('profile') || combinedText.includes('account') || combinedText.includes('user settings')) {
      features.push({ name: 'User Profile', type: 'page' })
      features.push({ name: 'Account Settings', type: 'page' })
    }
    if (combinedText.includes('dashboard') || combinedText.includes('control panel')) {
      features.push({ name: 'Dashboard', type: 'page' })
    }
    
    // E-commerce Pages
    if (combinedText.includes('ecommerce') || combinedText.includes('shop') || combinedText.includes('store')) {
      features.push({ name: 'Products Catalog', type: 'page' })
      features.push({ name: 'Product Details', type: 'page' })
      features.push({ name: 'Shopping Cart', type: 'page' })
      features.push({ name: 'Checkout', type: 'page' })
      corePages.push({ name: 'Products', type: 'page' })
    }
    if (combinedText.includes('payment') || combinedText.includes('billing')) {
      features.push({ name: 'Payment Page', type: 'page' })
      features.push({ name: 'Order Confirmation', type: 'page' })
    }
    
    // Blog/Content Pages
    if (combinedText.includes('blog') || combinedText.includes('articles') || combinedText.includes('news')) {
      features.push({ name: 'Blog Listing', type: 'page' })
      features.push({ name: 'Blog Article', type: 'page' })
      corePages.push({ name: 'Blog', type: 'page' })
    }
    
    // Service Pages
    if (combinedText.includes('service') || combinedText.includes('services')) {
      features.push({ name: 'Services Overview', type: 'page' })
      features.push({ name: 'Service Details', type: 'page' })
      corePages.push({ name: 'Services', type: 'page' })
    }
    
    // Portfolio/Gallery Pages
    if (combinedText.includes('portfolio') || combinedText.includes('gallery') || combinedText.includes('work')) {
      features.push({ name: 'Portfolio', type: 'page' })
      features.push({ name: 'Project Details', type: 'page' })
      corePages.push({ name: 'Our Work', type: 'page' })
    }
    
    // Form Pages
    if (combinedText.includes('form') || combinedText.includes('contact') || combinedText.includes('message')) {
      features.push({ name: 'Contact Form', type: 'form' })
    }
    if (combinedText.includes('application') || combinedText.includes('apply')) {
      features.push({ name: 'Application Form', type: 'form' })
    }
    
    // Admin/Management Pages
    if (combinedText.includes('admin') || combinedText.includes('management') || combinedText.includes('backend')) {
      features.push({ name: 'Admin Dashboard', type: 'page' })
      features.push({ name: 'User Management', type: 'page' })
      features.push({ name: 'Content Management', type: 'page' })
    }
    
    // Support/Help Pages
    if (combinedText.includes('help') || combinedText.includes('support') || combinedText.includes('faq')) {
      features.push({ name: 'Help Center', type: 'page' })
      features.push({ name: 'FAQ', type: 'page' })
      corePages.push({ name: 'Support', type: 'page' })
    }
    
    // Legal/Policy Pages
    corePages.push(
      { name: 'Privacy Policy', type: 'page' },
      { name: 'Terms of Service', type: 'page' }
    )
    
    // Combine core pages with detected features
    const allPages = [...corePages, ...features]
    
    // Add backend processes that support the pages
    const backendProcesses = []
    
    // Authentication & Security Processes
    if (combinedText.includes('login') || combinedText.includes('auth') || combinedText.includes('register')) {
      backendProcesses.push(
        { name: 'Authentication Service', type: 'auth' },
        { name: 'User Database', type: 'database' },
        { name: 'Session Management', type: 'api' }
      )
    }
    
    // Data Storage Processes
    if (combinedText.includes('database') || combinedText.includes('storage') || combinedText.includes('data')) {
      backendProcesses.push(
        { name: 'Main Database', type: 'database' },
        { name: 'Data Backup Service', type: 'database' }
      )
    }
    
    // API & Integration Processes
    if (combinedText.includes('api') || combinedText.includes('integration') || combinedText.includes('service')) {
      backendProcesses.push(
        { name: 'API Gateway', type: 'api' },
        { name: 'External Integrations', type: 'integration' }
      )
    }
    
    // Payment Processing
    if (combinedText.includes('payment') || combinedText.includes('ecommerce') || combinedText.includes('billing')) {
      backendProcesses.push(
        { name: 'Payment Gateway', type: 'payment' },
        { name: 'Order Processing', type: 'api' }
      )
    }
    
    // Notification Services
    if (combinedText.includes('notification') || combinedText.includes('email') || combinedText.includes('contact')) {
      backendProcesses.push(
        { name: 'Notification Service', type: 'notification' },
        { name: 'Email Service', type: 'notification' }
      )
    }
    
    // Analytics & Monitoring
    if (combinedText.includes('analytics') || combinedText.includes('tracking') || combinedText.includes('monitoring')) {
      backendProcesses.push(
        { name: 'Analytics Engine', type: 'analytics' },
        { name: 'Activity Tracking', type: 'analytics' }
      )
    }
    
    // Content Management
    if (combinedText.includes('cms') || combinedText.includes('content') || combinedText.includes('blog')) {
      backendProcesses.push(
        { name: 'Content Management', type: 'database' },
        { name: 'Media Storage', type: 'database' }
      )
    }
    
    // Default backend processes if none detected
    if (backendProcesses.length === 0) {
      backendProcesses.push(
        { name: 'Authentication Service', type: 'auth' },
        { name: 'Main Database', type: 'database' },
        { name: 'API Gateway', type: 'api' }
      )
    }
    
    // Combine all nodes: pages + backend processes
    const allNodes = [...allPages, ...backendProcesses]
    
    // Generate nodes with proper spacing within container
    const maxNodes = Math.min(allNodes.length + 2, 25) // Increased max nodes for comprehensive structure
    const nodeSpacing = 200 // Reduced spacing but still enough to prevent overlap
    const rowSpacing = 250 // Reduced spacing but still enough to prevent overlap
    
    // Always start with a trigger
    workflowNodes.push({
      id: '1',
      name: 'Site Entry',
      type: 'trigger',
      description: 'User enters website',
      x: 100,
      y: 100,
      status: 'active',
      color: COLORS.trigger
    })
    
    // Find and place Homepage as the only fixed node
    let homepageIndex = -1
    const homepageNode = allNodes.find((node, index) => {
      const nodeName = typeof node === 'string' ? node : node.name
      if (nodeName === 'Homepage') {
        homepageIndex = index
        return true
      }
      return false
    })
    
    // Place Homepage at a fixed position
    if (homepageNode) {
      const nodeId = '2'
      const nodeName = typeof homepageNode === 'string' ? homepageNode : homepageNode.name
      const nodeType: SiteFlowNode['type'] = typeof homepageNode === 'string' ? 'page' : (homepageNode.type as SiteFlowNode['type'])
      
      workflowNodes.push({
        id: nodeId,
        name: nodeName,
        type: nodeType,
        description: `${nodeType}: ${nodeName}`,
        x: 400, // Fixed position for Homepage
        y: 100, // Fixed position for Homepage
        status: 'active',
        color: COLORS[nodeType as keyof typeof COLORS] || COLORS.page
      })
    }
    
    // Add all other nodes (excluding Homepage) in a grid layout
    const otherNodes = allNodes.filter((_, index) => index !== homepageIndex)
    let nodeCounter = 3 // Start after Site Entry (1) and Homepage (2)
    
    otherNodes.slice(0, maxNodes - 3).forEach((node, index) => {
      const nodeId = (nodeCounter++).toString()
      const nodesPerRow = 3 // Reduced to 3 nodes per row for better spacing
      const row = Math.floor(index / nodesPerRow)
      const col = index % nodesPerRow
      
      // Calculate positions relative to Homepage
      const xPosition = 700 + (col * (nodeSpacing + 20)) // Start after Homepage
      const yPosition = 100 + (row * (rowSpacing + 20))   // Same row level as Homepage
      
      const nodeName = typeof node === 'string' ? node : node.name
      const nodeType: SiteFlowNode['type'] = typeof node === 'string' ? 'page' : (node.type as SiteFlowNode['type'])
      
      workflowNodes.push({
        id: nodeId,
        name: nodeName,
        type: nodeType,
        description: `${nodeType}: ${nodeName}`,
        x: xPosition,
        y: yPosition,
        status: 'active',
        color: COLORS[nodeType as keyof typeof COLORS] || COLORS.page
      })
    })
    
    // Add end node positioned after all other nodes
    const lastNodeIndex = workflowNodes.length
    const otherNodesCount = otherNodes.slice(0, maxNodes - 3).length
    const endNodeRow = Math.floor(otherNodesCount / 3) // Use same nodesPerRow as above
    const endNodeCol = otherNodesCount % 3
    
    workflowNodes.push({
      id: (lastNodeIndex + 1).toString(),
      name: 'Complete',
      type: 'webhook',
      description: 'Workflow ends',
      x: 700 + (endNodeCol * (nodeSpacing + 20)), // Use same positioning as other nodes
      y: 100 + (endNodeRow * (rowSpacing + 20)),   // Use same positioning as other nodes
      status: 'active',
      color: COLORS.webhook
    })
    
    // Generate intelligent connections between pages and backend processes
    const createConnections = () => {
      const connections = []
      
      // Connect Site Entry to Homepage
      const homepageNode = workflowNodes.find(n => n.name === 'Homepage')
      if (homepageNode) {
        connections.push({
          from: '1', // Site Entry
          to: homepageNode.id,
          type: 'success' as const
        })
      }
      
      // Connect pages to their relevant backend processes
      workflowNodes.forEach(node => {
        if (node.type === 'page') {
          // Connect authentication pages to auth services
          if ((node.name.includes('Login') || node.name.includes('Registration') || node.name.includes('Profile')) && 
              node.name !== 'Homepage') {
            const authService = workflowNodes.find(n => n.name === 'Authentication Service')
            const userDb = workflowNodes.find(n => n.name === 'User Database')
            if (authService) {
              connections.push({
                from: node.id,
                to: authService.id,
                type: 'success' as const
              })
            }
            if (userDb) {
              connections.push({
                from: authService?.id || node.id,
                to: userDb.id,
                type: 'success' as const
              })
            }
          }
          
          // Connect e-commerce pages to payment and order processing
          if (node.name.includes('Cart') || node.name.includes('Checkout') || node.name.includes('Payment')) {
            const paymentGateway = workflowNodes.find(n => n.name === 'Payment Gateway')
            const orderProcessing = workflowNodes.find(n => n.name === 'Order Processing')
            if (paymentGateway) {
              connections.push({
                from: node.id,
                to: paymentGateway.id,
                type: 'success' as const
              })
            }
            if (orderProcessing) {
              connections.push({
                from: paymentGateway?.id || node.id,
                to: orderProcessing.id,
                type: 'success' as const
              })
            }
          }
          
          // Connect contact forms to notification services
          if (node.name.includes('Contact') || node.name.includes('Form')) {
            const notificationService = workflowNodes.find(n => n.name === 'Notification Service')
            const emailService = workflowNodes.find(n => n.name === 'Email Service')
            if (notificationService) {
              connections.push({
                from: node.id,
                to: notificationService.id,
                type: 'success' as const
              })
            }
            if (emailService) {
              connections.push({
                from: notificationService?.id || node.id,
                to: emailService.id,
                type: 'success' as const
              })
            }
          }
          
          // Connect content pages to content management
          if (node.name.includes('Blog') || node.name.includes('Article') || node.name.includes('Portfolio')) {
            const contentManagement = workflowNodes.find(n => n.name === 'Content Management')
            const mediaStorage = workflowNodes.find(n => n.name === 'Media Storage')
            if (contentManagement) {
              connections.push({
                from: node.id,
                to: contentManagement.id,
                type: 'success' as const
              })
            }
            if (mediaStorage) {
              connections.push({
                from: contentManagement?.id || node.id,
                to: mediaStorage.id,
                type: 'success' as const
              })
            }
          }
        }
      })
      
      // Connect all backend services to main database
      const mainDb = workflowNodes.find(n => n.name === 'Main Database')
      if (mainDb) {
        workflowNodes.forEach(node => {
          if ((node.type === 'auth' || node.type === 'api' || node.type === 'payment' || node.type === 'notification') && 
              node.name !== 'Main Database') {
            connections.push({
              from: node.id,
              to: mainDb.id,
              type: 'success' as const
            })
          }
        })
      }
      
      // Connect API Gateway to external integrations
      const apiGateway = workflowNodes.find(n => n.name === 'API Gateway')
      const externalIntegrations = workflowNodes.find(n => n.name === 'External Integrations')
      if (apiGateway && externalIntegrations) {
        connections.push({
          from: apiGateway.id,
          to: externalIntegrations.id,
          type: 'success' as const
        })
      }
      
      // Connect Analytics Engine to all pages for tracking
      const analyticsEngine = workflowNodes.find(n => n.name === 'Analytics Engine')
      if (analyticsEngine) {
        workflowNodes.forEach(node => {
          if (node.type === 'page' && node.name !== 'Homepage') {
            connections.push({
              from: node.id,
              to: analyticsEngine.id,
              type: 'conditional' as const
            })
          }
        })
      }
      
      // Ensure all pages are connected in a basic flow
      for (let i = 1; i < workflowNodes.length - 1; i++) {
        const currentNode = workflowNodes[i]
        const nextNode = workflowNodes[i + 1]
        
        // Only connect if both are pages or if no specific connection exists
        if (currentNode.type === 'page' && nextNode.type === 'page') {
          const hasConnection = connections.some(c => 
            (c.from === currentNode.id && c.to === nextNode.id) ||
            (c.from === nextNode.id && c.to === currentNode.id)
          )
          
          if (!hasConnection) {
            connections.push({
              from: currentNode.id,
              to: nextNode.id,
              type: 'success' as const
            })
          }
        }
      }
      
      return connections
    }
    
    workflowConnections = createConnections()

    console.log('🏗️ Comprehensive Site Structure Generated:', {
      nodeCount: workflowNodes.length,
      connectionCount: workflowConnections.length,
      totalPages: allPages.length,
      backendProcesses: backendProcesses.length,
      corePages: corePages.length,
      detectedFeatures: features.length,
      allNodes: allNodes.map(n => typeof n === 'string' ? n : n.name),
      connections: workflowConnections
    })

    // Test: Force at least one connection if we have nodes
    if (workflowNodes.length >= 2 && workflowConnections.length === 0) {
      console.log('🔧 Forcing connection creation')
      workflowConnections.push({
        from: workflowNodes[0].id,
        to: workflowNodes[1].id,
        type: 'success' as const
      })
    }

    setNodes(workflowNodes)
    setConnections(workflowConnections)
    onSiteFlowChange?.({ nodes: workflowNodes, connections: workflowConnections })
    setIsGenerating(false)
  }, [appDescription, prdContent, onSiteFlowChange])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggedNode) {
      const deltaX = e.clientX - lastMousePos.x
      const deltaY = e.clientY - lastMousePos.y
      
      setNodes(prevNodes => 
        prevNodes.map(node =>
          node.id === draggedNode
            ? { ...node, x: node.x + deltaX, y: node.y + deltaY }
            : node
        )
      )
      
      setLastMousePos({ x: e.clientX, y: e.clientY })
    } else if (isPanning) {
      const deltaX = e.clientX - lastMousePos.x
      const deltaY = e.clientY - lastMousePos.y
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }))
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }, [draggedNode, isPanning, lastMousePos])

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null)
    setIsPanning(false)
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedNode(nodeId)
    setSelectedNode(nodeId)
    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsPanning(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
      setSelectedNode(null)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    // Fixed inverted movement and improved responsiveness
    const scrollSpeed = 1 // Balanced speed for responsive movement
    const deltaX = e.deltaX || 0
    const deltaY = e.deltaY || 0
    
    // Invert the delta values to fix the inverted movement
    setPan(prev => ({ 
      x: prev.x - (deltaX * scrollSpeed), // Inverted X
      y: prev.y - (deltaY * scrollSpeed)  // Inverted Y
    }))
  }

  const resetView = () => {
    setZoom(100)
    setPan({ x: 0, y: 0 })
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (!isFullscreen) {
      // Enter fullscreen
      if (canvasRef.current) {
        canvasRef.current.requestFullscreen?.() || 
        (canvasRef.current as any).webkitRequestFullscreen?.() ||
        (canvasRef.current as any).msRequestFullscreen?.()
      }
    } else {
      // Exit fullscreen
      document.exitFullscreen?.() ||
      (document as any).webkitExitFullscreen?.() ||
      (document as any).msExitFullscreen?.()
    }
  }

  if (isGenerating) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-gray-800">
            <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Creating Workflow</h3>
          <p className="text-sm text-gray-400">Building your automation flow...</p>
        </div>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-gray-800">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Workflow</h3>
          <p className="text-sm text-gray-400 mb-4">Add content to generate your workflow</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full h-full flex flex-col bg-black ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-900 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-dark-surface/10 border border-divider/30 rounded-lg flex items-center justify-center shadow-lg">
            {getVectorIcon('trigger')}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{projectName || 'Workflow Automation'}</h2>
            <p className="text-xs text-gray-400">Visual workflow builder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetView}
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors font-medium"
          >
            Reset View
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors font-medium"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M4 4l5 5m11-1V4h-4m4 0l-5 5M4 16v4h4m-4 0l5-5m11 5l-5-5m5 5v-4h-4" />
              </svg>
            )}
          </button>
          
          {/* Scroll Controls */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setPan(prev => ({ ...prev, x: prev.x + 50 }))}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
              title="Scroll Left"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setPan(prev => ({ ...prev, x: prev.x - 50 }))}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
              title="Scroll Right"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setPan(prev => ({ ...prev, y: prev.y + 50 }))}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
              title="Scroll Up"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => setPan(prev => ({ ...prev, y: prev.y - 50 }))}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
              title="Scroll Down"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setZoom(prev => Math.max(50, prev - 10))}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-xs text-gray-300 min-w-[2.5rem] text-center font-medium">{zoom}%</span>
            <button
              onClick={() => setZoom(prev => Math.min(200, prev + 10))}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <button
            onClick={generateWorkflow}
            className="px-3 py-1.5 bg-dark-surface/10 hover:bg-dark-surface/20 text-mid-grey hover:text-charcoal border border-divider/30 hover:border-divider/50 rounded-lg text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Canvas with larger scrollable area */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-auto"
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <div
          className="absolute"
          style={{
            width: '4000px', // Much larger canvas
            height: '3000px', // Much larger canvas
            backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
            transformOrigin: '0 0'
          }}
        />
        
        <svg
          ref={svgRef}
          className="absolute inset-0 pointer-events-none"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`, 
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            overflow: 'visible'
          }}
        >
          {connections.map((connection, index) => {
            const fromNode = nodes.find(n => n.id === connection.from)
            const toNode = nodes.find(n => n.id === connection.to)
            
            if (!fromNode || !toNode) {
              console.log('⚠️ Missing nodes for connection:', { connection, fromNode: !!fromNode, toNode: !!toNode })
              return null
            }
            
            const fromX = fromNode.x + getNodeWidth(fromNode.name, fromNode.description) / 2
            const fromY = fromNode.y + NODE_HEIGHT / 2
            const toX = toNode.x + getNodeWidth(toNode.name, toNode.description) / 2
            const toY = toNode.y + NODE_HEIGHT / 2
            
            // Get the correct color based on connection type
            let connectionColor = fromNode.color || COLORS.action
            if (connection.type === 'failure') {
              connectionColor = '#EF4444' // Red for failure
            } else if (connection.type === 'conditional') {
              connectionColor = '#F59E0B' // Amber for conditional
            }
            
            // Create smooth connection path
            let path = ''
            
            // Determine if connection is horizontal or vertical
            const horizontalDistance = Math.abs(toX - fromX)
            const verticalDistance = Math.abs(toY - fromY)
            
            if (horizontalDistance > verticalDistance) {
              // Mostly horizontal connection
              const midX = fromX + (toX - fromX) / 2
              path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`
            } else {
              // Mostly vertical connection
              const midY = fromY + (toY - fromY) / 2
              path = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`
            }
            
            return (
              <g key={`connection-${index}`}>
                <defs>
                  <marker
                    id={`arrowhead-${index}`}
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3, 0 6"
                      fill={connectionColor}
                    />
                  </marker>
                </defs>
                
                {/* Connection line */}
                <path
                  d={path}
                  fill="none"
                  stroke={connectionColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  markerEnd={`url(#arrowhead-${index})`}
                  className="transition-all duration-200"
                  opacity="0.8"
                />
                
                {/* Animated flow dots */}
                <circle r="4" fill={connectionColor} opacity="0.9">
                  <animateMotion dur="2.5s" repeatCount="indefinite" path={path} />
                  <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2.5s" repeatCount="indefinite" />
                </circle>
                
                <circle r="2.5" fill={connectionColor} opacity="0.7">
                  <animateMotion dur="2.5s" repeatCount="indefinite" path={path} begin="0.8s" />
                  <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2.5s" repeatCount="indefinite" begin="0.8s" />
                </circle>
                
                <circle r="1.5" fill={connectionColor} opacity="0.5">
                  <animateMotion dur="2.5s" repeatCount="indefinite" path={path} begin="1.6s" />
                  <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2.5s" repeatCount="indefinite" begin="1.6s" />
                </circle>
              </g>
            )
          })}
        </svg>

        <div
          className="absolute inset-0"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`, transformOrigin: '0 0' }}
        >
          {nodes.map(node => (
            <div
              key={node.id}
              className={`absolute bg-gray-900 border-2 rounded-xl shadow-md transition-all duration-300 ${
                selectedNode === node.id ? 'border-blue-500 ring-2 ring-blue-100 shadow-lg' : 'border-gray-700'
              } ${draggedNode === node.id ? 'cursor-grabbing scale-105 shadow-xl' : 'cursor-grab hover:scale-102 hover:shadow-lg'}`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${getNodeWidth(node.name, node.description)}px`,
                height: `${NODE_HEIGHT}px`
              }}
              onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
            >
              {/* Node Header */}
              <div 
                className="h-2 rounded-t-lg"
                style={{ backgroundColor: node.color || COLORS.action }}
              />
              
              {/* Node Content */}
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <div 
                    className="w-6 h-6 rounded-md flex items-center justify-center shadow-sm flex-shrink-0"
                    style={{ backgroundColor: `${node.color}20` }}
                  >
                    {getVectorIcon(node.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-[11px] leading-tight break-words">{node.name}</h3>
                    <p className="text-[8px] text-gray-400 mt-1 break-words">{node.description}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    node.status === 'active' ? 'bg-green-400' : 
                    node.status === 'error' ? 'bg-red-400' : 'bg-gray-500'
                  }`} />
                </div>
                
                {/* Node Footer */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
                  <span className="text-[9px] font-medium text-gray-400 uppercase" style={{ color: node.color }}>
                    {node.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-gray-800 rounded flex items-center justify-center hover:bg-gray-700 transition-colors">
                      <svg className="w-2 h-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className="w-4 h-4 bg-gray-800 rounded flex items-center justify-center hover:bg-gray-700 transition-colors">
                      <svg className="w-2 h-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SiteFlowVisualizer

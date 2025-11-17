import type { SiteFlowData } from './storage'

export type { SiteFlowData }

// Constants for node sizing
export const FLOW_NODE_WIDTH = 200
export const FLOW_NODE_HEIGHT = 140
export const HORIZONTAL_SPACING = 300
export const VERTICAL_SPACING = 220

/**
 * Create an empty site flow structure
 */
export const createEmptySiteFlow = (): SiteFlowData => ({
  nodes: [],
  connections: [],
})

/**
 * Normalize site flow data to ensure all required fields are present
 */
export const normalizeSiteFlow = (data: SiteFlowData): SiteFlowData => {
  return {
    nodes: (data.nodes || []).map((node) => ({
      id: node.id || '',
      name: node.name || 'Untitled',
      description: node.description || '',
      x: node.x ?? 0,
      y: node.y ?? 0,
      isParent: node.isParent ?? false,
      level: node.level ?? 0,
    })),
    connections: (data.connections || []).map((conn) => ({
      from: conn.from || '',
      to: conn.to || '',
    })),
  }
}

/**
 * Build tree structure for better layout
 */
const buildTreeStructure = (data: SiteFlowData) => {
  const children = new Map<string, string[]>()
  const parents = new Map<string, string>()
  const nodeMap = new Map<string, typeof data.nodes[number]>()

  data.nodes.forEach((node) => {
    nodeMap.set(node.id, node)
  })

  // Build parent-child relationships
  data.connections.forEach((conn) => {
    if (!children.has(conn.from)) {
      children.set(conn.from, [])
    }
    children.get(conn.from)!.push(conn.to)
    parents.set(conn.to, conn.from)
  })

  // Find root nodes (nodes with no parents)
  const rootNodes = data.nodes.filter((node) => !parents.has(node.id))

  return { children, parents, rootNodes, nodeMap }
}

/**
 * Calculate levels for all nodes using BFS
 */
const calculateLevels = (
  data: SiteFlowData,
  children: Map<string, string[]>,
  parents: Map<string, string>
): Map<string, number> => {
  const levels = new Map<string, number>()
  const visited = new Set<string>()
  
  // Find root nodes (nodes with no parents)
  const rootNodes = data.nodes.filter((node) => !parents.has(node.id))
  
  // BFS to assign levels
  const queue: Array<{ id: string; level: number }> = rootNodes.map((n) => ({ id: n.id, level: 0 }))
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!
    
    if (visited.has(id)) continue
    visited.add(id)
    levels.set(id, level)
    
    const nodeChildren = children.get(id) || []
    nodeChildren.forEach((childId) => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 })
      }
    })
  }
  
  // Assign level 0 to any unvisited nodes
  data.nodes.forEach((node) => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0)
    }
  })
  
  return levels
}

/**
 * Auto-layout site flow - Railway-style organized column layout
 * Inspired by Supabase Railway's clean, organized flow visualization
 */
export const autoLayoutSiteFlow = (data: SiteFlowData): SiteFlowData => {
  if (!data.nodes || data.nodes.length === 0) {
    return normalizeSiteFlow(data)
  }

  const normalized = normalizeSiteFlow(data)
  const { children, parents } = buildTreeStructure(normalized)
  
  // Calculate levels for all nodes
  const levels = calculateLevels(normalized, children, parents)
  
  // Group nodes by level (columns)
  const nodesByLevel = new Map<number, typeof normalized.nodes>()
  normalized.nodes.forEach((node) => {
    const level = levels.get(node.id) ?? 0
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, [])
    }
    nodesByLevel.get(level)!.push(node)
  })
  
  // Railway-style: Organize nodes in clean columns (levels)
  const positions = new Map<string, { x: number; y: number; level: number }>()
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b)
  
  // Calculate column (level) x positions - evenly spaced columns
  const columnXPositions = new Map<number, number>()
  sortedLevels.forEach((level, index) => {
    // Center columns horizontally
    const totalColumns = sortedLevels.length
    const totalWidth = (totalColumns - 1) * HORIZONTAL_SPACING
    const startX = -totalWidth / 2
    columnXPositions.set(level, startX + index * HORIZONTAL_SPACING)
  })
  
  // Position nodes within each column
  sortedLevels.forEach((level) => {
    const nodesInLevel = nodesByLevel.get(level) || []
    const columnX = columnXPositions.get(level) || 0
    const y = level * VERTICAL_SPACING + 100
    
    // Calculate vertical spacing within column
    const totalHeight = (nodesInLevel.length - 1) * (FLOW_NODE_HEIGHT + 40)
    const startY = y - totalHeight / 2
    
    // Position each node in the column
    nodesInLevel.forEach((node, index) => {
      const nodeY = startY + index * (FLOW_NODE_HEIGHT + 40)
      positions.set(node.id, { x: columnX, y: nodeY, level })
    })
  })
  
  // Build laid out nodes
  const laidOutNodes = normalized.nodes.map((node) => {
    const pos = positions.get(node.id) || { x: 0, y: 0, level: 0 }
    const hasChildren = (normalized.connections || []).some((conn) => conn.from === node.id)

    return {
      ...node,
      x: pos.x,
      y: pos.y,
      level: pos.level,
      isParent: hasChildren,
    }
  })

  return normalizeSiteFlow({
    nodes: laidOutNodes,
    connections: normalized.connections,
  })
}

/**
 * Flow layout node type for rendering
 */
export type FlowLayoutNode = SiteFlowData['nodes'][number] & {
  level: number
  isParent: boolean
}

/**
 * Flow layout type
 */
export type FlowLayout = {
  nodes: FlowLayoutNode[]
  connections: SiteFlowData['connections']
  width: number
  height: number
}

/**
 * Build flow layout for rendering
 */
export const buildFlowLayout = (data: SiteFlowData): FlowLayout => {
  const normalized = normalizeSiteFlow(data)
  const laidOut = autoLayoutSiteFlow(normalized)

  // Calculate bounds
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  laidOut.nodes.forEach((node) => {
    minX = Math.min(minX, node.x - FLOW_NODE_WIDTH / 2)
    maxX = Math.max(maxX, node.x + FLOW_NODE_WIDTH / 2)
    minY = Math.min(minY, node.y - FLOW_NODE_HEIGHT / 2)
    maxY = Math.max(maxY, node.y + FLOW_NODE_HEIGHT / 2)
  })

  // Add padding to ensure all content is visible
  const padding = 100
  const width = maxX - minX + padding * 2
  const height = maxY - minY + padding * 2

  // Offset all nodes to ensure they start from a positive position
  const offsetX = -minX + padding
  const offsetY = -minY + padding

  const offsetNodes = laidOut.nodes.map((node) => ({
    ...node,
    x: node.x + offsetX,
    y: node.y + offsetY,
  }))

  return {
    nodes: offsetNodes as FlowLayoutNode[],
    connections: laidOut.connections,
    width: Math.max(width, 1200),
    height: Math.max(height, 800),
  }
}

/**
 * Get connection path coordinates for SVG
 */
export const getConnectionPath = (
  fromNode: FlowLayoutNode,
  toNode: FlowLayoutNode
): { path: string; length: number } => {
  // Connection points: bottom center of parent, top center of child
  const fromX = fromNode.x
  const fromY = fromNode.y + FLOW_NODE_HEIGHT / 2
  const toX = toNode.x
  const toY = toNode.y - FLOW_NODE_HEIGHT / 2

  // Create a smooth bezier curve with control points
  const controlOffset = Math.abs(toY - fromY) * 0.4
  const fromControlY = fromY + controlOffset
  const toControlY = toY - controlOffset
  
  const path = `M ${fromX} ${fromY} C ${fromX} ${fromControlY}, ${toX} ${toControlY}, ${toX} ${toY}`

  // Approximate path length (for animation timing)
  const dx = toX - fromX
  const dy = toY - fromY
  const length = Math.sqrt(dx * dx + dy * dy) * 1.3 // Approximate for bezier curve

  return { path, length }
}


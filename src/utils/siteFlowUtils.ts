import type { SiteFlowData } from './storage'

export type { SiteFlowData }

// Constants for node sizing
export const FLOW_NODE_WIDTH = 220
export const FLOW_NODE_HEIGHT = 100
export const HORIZONTAL_SPACING = 180
export const VERTICAL_SPACING = 140

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
 * Build tree hierarchy and calculate levels
 */
const buildTreeHierarchy = (data: SiteFlowData): Map<string, number> => {
  const levels = new Map<string, number>()
  const children = new Map<string, string[]>()
  const parents = new Map<string, string>()

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

  // Assign level 0 to root nodes
  rootNodes.forEach((node) => {
    levels.set(node.id, 0)
  })

  // BFS to assign levels
  const queue = [...rootNodes.map((n) => n.id)]
  while (queue.length > 0) {
    const currentId = queue.shift()!
    const currentLevel = levels.get(currentId) ?? 0
    const nodeChildren = children.get(currentId) || []

    nodeChildren.forEach((childId) => {
      if (!levels.has(childId)) {
        levels.set(childId, currentLevel + 1)
        queue.push(childId)
      }
    })
  }

  // Assign level 0 to any unconnected nodes
  data.nodes.forEach((node) => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0)
    }
  })

  return levels
}

/**
 * Auto-layout site flow with tree hierarchy
 */
export const autoLayoutSiteFlow = (data: SiteFlowData): SiteFlowData => {
  if (!data.nodes || data.nodes.length === 0) {
    return normalizeSiteFlow(data)
  }

  const normalized = normalizeSiteFlow(data)
  const levels = buildTreeHierarchy(normalized)

  // Group nodes by level
  const nodesByLevel = new Map<number, typeof normalized.nodes>()
  normalized.nodes.forEach((node) => {
    const level = levels.get(node.id) ?? 0
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, [])
    }
    nodesByLevel.get(level)!.push(node)
  })

  // Calculate positions maintaining tree hierarchy
  const laidOutNodes = normalized.nodes.map((node) => {
    const level = levels.get(node.id) ?? 0
    const nodesInLevel = nodesByLevel.get(level) || []
    const indexInLevel = nodesInLevel.findIndex((n) => n.id === node.id)

    // Calculate Y position based on level
    const y = level * VERTICAL_SPACING + 100

    // Calculate X position based on index in level
    const totalInLevel = nodesInLevel.length
    const startX = -(totalInLevel * (FLOW_NODE_WIDTH + HORIZONTAL_SPACING)) / 2
    const x = startX + indexInLevel * (FLOW_NODE_WIDTH + HORIZONTAL_SPACING) + FLOW_NODE_WIDTH / 2

    return {
      ...node,
      x,
      y,
      level,
      isParent: (normalized.connections || []).some((conn) => conn.from === node.id),
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


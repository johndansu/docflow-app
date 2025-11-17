import type { SiteFlowData } from './storage'

export type { SiteFlowData }

// Constants for node sizing
export const FLOW_NODE_WIDTH = 220
export const FLOW_NODE_HEIGHT = 100
export const HORIZONTAL_SPACING = 240
export const VERTICAL_SPACING = 180

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
 * Calculate node positions using a tree layout algorithm
 */
const calculateTreePositions = (
  nodeId: string,
  level: number,
  children: Map<string, string[]>,
  nodeMap: Map<string, SiteFlowData['nodes'][number]>,
  positions: Map<string, { x: number; y: number; level: number }>,
  xOffset: { value: number }
): number => {
  const node = nodeMap.get(nodeId)
  if (!node) return 0

  const nodeChildren = children.get(nodeId) || []
  const y = level * VERTICAL_SPACING + 100

  if (nodeChildren.length === 0) {
    // Leaf node - just place it
    const x = xOffset.value
    positions.set(nodeId, { x, y, level })
    xOffset.value += FLOW_NODE_WIDTH + HORIZONTAL_SPACING
    return FLOW_NODE_WIDTH + HORIZONTAL_SPACING
  }

  // Calculate positions for children first
  let childrenWidth = 0
  const childrenPositions: number[] = []
  
  nodeChildren.forEach((childId) => {
    const childX = xOffset.value
    const childWidth = calculateTreePositions(
      childId,
      level + 1,
      children,
      nodeMap,
      positions,
      xOffset
    )
    childrenPositions.push(childX + childWidth / 2 - FLOW_NODE_WIDTH / 2)
    childrenWidth += childWidth
  })

  // Center parent above children
  const minChildX = Math.min(...childrenPositions)
  const maxChildX = Math.max(...childrenPositions.map((x, i) => {
    const childId = nodeChildren[i]
    const childPos = positions.get(childId)
    return childPos ? childPos.x + FLOW_NODE_WIDTH / 2 : x
  }))
  const centerX = (minChildX + maxChildX) / 2
  const x = Math.max(centerX, xOffset.value)

  positions.set(nodeId, { x, y, level })
  
  // Ensure we've moved past this subtree
  xOffset.value = Math.max(xOffset.value, maxChildX + FLOW_NODE_WIDTH / 2 + HORIZONTAL_SPACING)
  
  return Math.max(childrenWidth, FLOW_NODE_WIDTH + HORIZONTAL_SPACING)
}

/**
 * Auto-layout site flow with tree hierarchy
 */
export const autoLayoutSiteFlow = (data: SiteFlowData): SiteFlowData => {
  if (!data.nodes || data.nodes.length === 0) {
    return normalizeSiteFlow(data)
  }

  const normalized = normalizeSiteFlow(data)
  const { children, rootNodes, nodeMap } = buildTreeStructure(normalized)

  // If no root nodes, use first node as root
  const roots = rootNodes.length > 0 ? rootNodes : [normalized.nodes[0]]

  // Calculate positions using tree layout
  const positions = new Map<string, { x: number; y: number; level: number }>()
  const xOffset = { value: 0 }

  // Handle multiple root nodes (unconnected components)
  roots.forEach((root) => {
    if (!positions.has(root.id)) {
      calculateTreePositions(root.id, 0, children, nodeMap, positions, xOffset)
      // Add spacing between root components
      xOffset.value += HORIZONTAL_SPACING
    }
  })

  // Handle any unconnected nodes
  normalized.nodes.forEach((node) => {
    if (!positions.has(node.id)) {
      const y = 0 * VERTICAL_SPACING + 100
      const x = xOffset.value
      positions.set(node.id, { x, y, level: 0 })
      xOffset.value += FLOW_NODE_WIDTH + HORIZONTAL_SPACING
    }
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


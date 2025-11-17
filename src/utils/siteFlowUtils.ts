import type { SiteFlowData } from './storage'

export type { SiteFlowData }

// Constants for node sizing
export const FLOW_NODE_WIDTH = 280
export const FLOW_NODE_HEIGHT = 180
export const HORIZONTAL_SPACING = 320
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
 * Calculate node positions using a tree layout algorithm
 */
const calculateTreePositions = (
  nodeId: string,
  level: number,
  children: Map<string, string[]>,
  nodeMap: Map<string, SiteFlowData['nodes'][number]>,
  positions: Map<string, { x: number; y: number; level: number }>,
  xOffset: { value: number },
  visiting: Set<string> = new Set(),
  maxDepth: number = 20
): number => {
  const node = nodeMap.get(nodeId)
  if (!node) return 0

  // Prevent infinite recursion: check if already positioned or currently visiting
  if (positions.has(nodeId)) {
    return FLOW_NODE_WIDTH + HORIZONTAL_SPACING
  }

  // Prevent cycles: if we're already visiting this node, skip it
  if (visiting.has(nodeId)) {
    // Place it anyway to avoid infinite loop
    const x = xOffset.value + FLOW_NODE_WIDTH / 2
    const y = level * VERTICAL_SPACING + 100
    positions.set(nodeId, { x, y, level })
    xOffset.value += FLOW_NODE_WIDTH + HORIZONTAL_SPACING
    return FLOW_NODE_WIDTH + HORIZONTAL_SPACING
  }

  // Prevent excessive depth
  if (level > maxDepth) {
    const x = xOffset.value + FLOW_NODE_WIDTH / 2
    const y = level * VERTICAL_SPACING + 100
    positions.set(nodeId, { x, y, level })
    xOffset.value += FLOW_NODE_WIDTH + HORIZONTAL_SPACING
    return FLOW_NODE_WIDTH + HORIZONTAL_SPACING
  }

  // Mark as visiting
  visiting.add(nodeId)

  const nodeChildren = children.get(nodeId) || []
  const y = level * VERTICAL_SPACING + 100

  if (nodeChildren.length === 0) {
    // Leaf node - just place it
    const x = xOffset.value + FLOW_NODE_WIDTH / 2
    positions.set(nodeId, { x, y, level })
    xOffset.value += FLOW_NODE_WIDTH + HORIZONTAL_SPACING
    visiting.delete(nodeId)
    return FLOW_NODE_WIDTH + HORIZONTAL_SPACING
  }

  // Calculate positions for children first
  const childrenPositions: number[] = []
  
  nodeChildren.forEach((childId) => {
    // Only process if not already positioned
    if (!positions.has(childId)) {
      calculateTreePositions(
        childId,
        level + 1,
        children,
        nodeMap,
        positions,
        xOffset,
        visiting,
        maxDepth
      )
    }
    const childPos = positions.get(childId)
    if (childPos) {
      childrenPositions.push(childPos.x)
    }
  })

  // Remove from visiting set
  visiting.delete(nodeId)

  if (childrenPositions.length === 0) {
    // Fallback if no children positioned
    const x = xOffset.value + FLOW_NODE_WIDTH / 2
    positions.set(nodeId, { x, y, level })
    xOffset.value += FLOW_NODE_WIDTH + HORIZONTAL_SPACING
    return FLOW_NODE_WIDTH + HORIZONTAL_SPACING
  }

  // Center parent above children
  const minChildX = Math.min(...childrenPositions)
  const maxChildX = Math.max(...childrenPositions)
  const centerX = (minChildX + maxChildX) / 2
  const x = centerX

  positions.set(nodeId, { x, y, level })
  
  return Math.max(maxChildX - minChildX + FLOW_NODE_WIDTH, FLOW_NODE_WIDTH + HORIZONTAL_SPACING)
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
  const visiting = new Set<string>()
  roots.forEach((root) => {
    if (!positions.has(root.id)) {
      calculateTreePositions(root.id, 0, children, nodeMap, positions, xOffset, visiting)
      // Add spacing between root components
      xOffset.value += HORIZONTAL_SPACING
    }
  })

  // Handle any unconnected nodes
  normalized.nodes.forEach((node) => {
    if (!positions.has(node.id)) {
      const y = 0 * VERTICAL_SPACING + 100
      const x = xOffset.value + FLOW_NODE_WIDTH / 2
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


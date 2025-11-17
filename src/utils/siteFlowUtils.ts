import type { SiteFlowData } from './storage'

/**
 * Utility helpers for working with site flow data
 */

export type { SiteFlowData }

/**
 * Create an empty site flow object
 */
export const createEmptySiteFlow = (): SiteFlowData => ({
  nodes: [],
  connections: [],
})

/**
 * Ensure all nodes have required fields and basic defaults
 */
export const normalizeSiteFlow = (data: SiteFlowData): SiteFlowData => {
  const nodes = data.nodes.map((node, index) => ({
    id: node.id || String(index + 1),
    name: node.name || `Page ${index + 1}`,
    description: node.description || '',
    x: typeof node.x === 'number' ? node.x : 0,
    y: typeof node.y === 'number' ? node.y : index * 160,
    isParent: node.isParent,
    level: node.level,
  }))

  // Filter out connections that reference missing nodes
  const nodeIds = new Set(nodes.map((n) => n.id))
  const connections = data.connections.filter(
    (c) => nodeIds.has(c.from) && nodeIds.has(c.to),
  )

  return { nodes, connections }
}

type LevelMap = Record<string, number>

/**
 * Compute simple automatic layout based on "levels" inferred from connections.
 * Each level is a vertical column; nodes are spaced vertically within a column.
 */
export const autoLayoutSiteFlow = (data: SiteFlowData): SiteFlowData => {
  if (data.nodes.length === 0) return data

  const levelMap: LevelMap = {}

  // Find roots (nodes that are never a "to" in any connection)
  const pointedTo = new Set<string>()
  for (const edge of data.connections) {
    pointedTo.add(edge.to)
  }

  const rootIds = data.nodes
    .filter((n) => !pointedTo.has(n.id))
    .map((n) => n.id)

  // BFS from roots to assign levels
  const queue: Array<{ id: string; level: number }> = []
  for (const id of rootIds) {
    queue.push({ id, level: 0 })
  }

  while (queue.length > 0) {
    const { id, level } = queue.shift() as { id: string; level: number }
    if (levelMap[id] !== undefined && levelMap[id] <= level) continue
    levelMap[id] = level

    for (const edge of data.connections) {
      if (edge.from === id) {
        queue.push({ id: edge.to, level: level + 1 })
      }
    }
  }

  const nodesWithLevels = data.nodes.map((node) => {
    const level = levelMap[node.id] ?? 0
    return { ...node, level }
  })

  // Group by level and assign positions
  const byLevel = new Map<number, SiteFlowData['nodes']>()
  for (const node of nodesWithLevels) {
    const level = node.level ?? 0
    if (!byLevel.has(level)) byLevel.set(level, [])
    byLevel.get(level)!.push(node)
  }

  const COLUMN_WIDTH = 280
  const ROW_HEIGHT = 140

  const laidOutNodes: SiteFlowData['nodes'] = []
  for (const [level, nodes] of Array.from(byLevel.entries()).sort(
    (a, b) => a[0] - b[0],
  )) {
    nodes.forEach((node, index) => {
      laidOutNodes.push({
        ...node,
        x: COLUMN_WIDTH * level,
        y: ROW_HEIGHT * index,
      })
    })
  }

  return normalizeSiteFlow({
    nodes: laidOutNodes,
    connections: data.connections,
  })
}

export const FLOW_NODE_WIDTH = 200
export const FLOW_NODE_HEIGHT = 80

export type FlowLayoutNode = SiteFlowData['nodes'][number] & {
  layoutX: number
  layoutY: number
  column: number
  row: number
}

export type FlowLane = {
  level: number
  column: number
  x: number
  label: string
}

export type FlowLayout = {
  nodes: FlowLayoutNode[]
  nodeMap: Map<string, FlowLayoutNode>
  lanes: FlowLane[]
  width: number
  height: number
}

const levelLabels = ['Entry', 'Primary', 'Secondary', 'Details', 'Deep', 'Nested']

export const buildFlowLayout = (
  data: SiteFlowData,
  options?: {
    horizontalGap?: number
    verticalGap?: number
  },
): FlowLayout => {
  const horizontalGap = options?.horizontalGap ?? 140
  const verticalGap = options?.verticalGap ?? 60

  const nodeWidth = FLOW_NODE_WIDTH
  const nodeHeight = FLOW_NODE_HEIGHT
  const columnWidth = nodeWidth + horizontalGap
  const rowHeight = nodeHeight + verticalGap

  const levels = new Map<number, FlowLayoutNode[]>()

  data.nodes.forEach((node) => {
    const level = node.level ?? 0
    if (!levels.has(level)) {
      levels.set(level, [])
    }
    const list = levels.get(level)!
    list.push({
      ...node,
      layoutX: 0,
      layoutY: 0,
      column: 0,
      row: 0,
    })
  })

  const sortedLevels = Array.from(levels.entries()).sort(([a], [b]) => a - b)
  const lanes: FlowLane[] = []
  const positionedNodes: FlowLayoutNode[] = []

  let maxWidth = nodeWidth
  let maxHeight = nodeHeight

  sortedLevels.forEach(([level, nodesAtLevel], columnIndex) => {
    const sortedNodes = nodesAtLevel.sort((a, b) => {
      const ay = typeof a.y === 'number' ? a.y : 0
      const by = typeof b.y === 'number' ? b.y : 0
      if (ay === by) {
        return a.name.localeCompare(b.name)
      }
      return ay - by
    })

    lanes.push({
      level,
      column: columnIndex,
      x: columnIndex * columnWidth,
      label: levelLabels[columnIndex] ?? `Level ${level}`,
    })

    sortedNodes.forEach((node, rowIndex) => {
      const layoutX = columnIndex * columnWidth
      const layoutY = rowIndex * rowHeight
      node.layoutX = layoutX
      node.layoutY = layoutY
      node.column = columnIndex
      node.row = rowIndex

      positionedNodes.push(node)
      maxHeight = Math.max(maxHeight, layoutY + nodeHeight)
      maxWidth = Math.max(maxWidth, layoutX + nodeWidth)
    })
  })

  const nodeMap = new Map<string, FlowLayoutNode>()
  positionedNodes.forEach((node) => {
    nodeMap.set(node.id, node)
  })

  return {
    nodes: positionedNodes,
    nodeMap,
    lanes,
    width: maxWidth,
    height: maxHeight,
  }
}



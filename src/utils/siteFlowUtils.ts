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



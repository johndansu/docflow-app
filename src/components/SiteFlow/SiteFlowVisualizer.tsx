import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react'
import { generateSiteFlowWithAI } from '../../utils/siteFlowGenerator'
import {
  type SiteFlowData,
  exportSiteFlowAsImage,
  exportSiteFlowAsJSON,
} from '../../utils/siteFlowUtils'

type FlowNode = SiteFlowData['nodes'][number]
type PositionedNode = FlowNode & {
  x: number
  y: number
  level: number
}

type FlowMode = 'empty' | 'imported' | 'generated' | 'manual'

interface SiteFlowVisualizerProps {
  appDescription?: string
  prdContent?: string
  initialSiteFlow?: SiteFlowData
  onSiteFlowChange?: (data: SiteFlowData) => void
}

export interface SiteFlowHandle {
  getCurrentSiteFlow: () => SiteFlowData | null
}

const NODE_WIDTH = 260
const NODE_HEIGHT = 110
const COLUMN_GAP = 220
const ROW_GAP = 120
const CANVAS_PADDING = 240
const LINE_OFFSET = 32

const FLOW_MODE_LABEL: Record<FlowMode, string> = {
  empty: 'Empty',
  imported: 'Imported',
  generated: 'Generated',
  manual: 'Manual',
}

const EMPTY_FLOW: SiteFlowData = { nodes: [], connections: [] }

const ensureString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return undefined
}

const normalizeSiteFlow = (data?: SiteFlowData | null): SiteFlowData => {
  if (!data || !Array.isArray(data.nodes)) {
    return EMPTY_FLOW
  }

  const nodes: SiteFlowData['nodes'] = []
  const idMap = new Map<string, string>()
  const existingIds = new Set<string>()

  const getUniqueId = (base: string) => {
    let candidate = base
    let counter = 1
    while (existingIds.has(candidate)) {
      candidate = `${base}-${counter}`
      counter += 1
    }
    existingIds.add(candidate)
    return candidate
  }

  data.nodes.forEach((node, index) => {
    const baseId = ensureString(node?.id) ?? `node-${index + 1}`
    const uniqueId = getUniqueId(baseId)
    idMap.set(baseId, uniqueId)
    if (node?.id && node.id !== baseId) {
      idMap.set(node.id, uniqueId)
    }

    nodes.push({
      id: uniqueId,
      name: node?.name?.trim() || `Page ${index + 1}`,
      description: node?.description?.trim() || '',
      level: typeof node?.level === 'number' && Number.isFinite(node.level) ? node.level : 0,
      x: typeof node?.x === 'number' && Number.isFinite(node.x) ? node.x : 0,
      y: typeof node?.y === 'number' && Number.isFinite(node.y) ? node.y : 0,
      isParent: Boolean(node?.isParent),
      parentId: undefined,
    })
  })

  const connections: SiteFlowData['connections'] = []
  const seenConnections = new Set<string>()

  data.connections?.forEach(connection => {
    if (!connection) return
    const from = connection.from && idMap.get(connection.from) ? idMap.get(connection.from) : ensureString(connection.from)
    const to = connection.to && idMap.get(connection.to) ? idMap.get(connection.to) : ensureString(connection.to)
    if (!from || !to || from === to) return
    if (!existingIds.has(from) || !existingIds.has(to)) return

    const key = `${from}->${to}`
    if (seenConnections.has(key)) return
    seenConnections.add(key)
    connections.push({ from, to })
  })

  return { nodes, connections }
}

const applyLayout = (data: SiteFlowData, force = false): SiteFlowData => {
  if (!data.nodes.length) return data

  const nodesById = new Map<string, PositionedNode>()
  const incomingCounts = new Map<string, number>()
  data.nodes.forEach(node => {
    const safeLevel =
      typeof node.level === 'number' && Number.isFinite(node.level) ? node.level : 0
    nodesById.set(node.id, {
      ...node,
      x: Number.isFinite(node.x) ? (node.x as number) : 0,
      y: Number.isFinite(node.y) ? (node.y as number) : 0,
      level: safeLevel,
    })
  })

  data.connections.forEach(({ from, to }) => {
    if (!nodesById.has(from) || !nodesById.has(to)) return
    incomingCounts.set(to, (incomingCounts.get(to) ?? 0) + 1)
  })

  const needsLayout = force || data.nodes.some(node => !Number.isFinite(node.x) || !Number.isFinite(node.y))

  if (!needsLayout) {
    return {
      nodes: Array.from(nodesById.values()),
      connections: data.connections,
    }
  }

  const queue: Array<{ id: string; level: number }> = []

  nodesById.forEach((_, id) => {
    if ((incomingCounts.get(id) ?? 0) === 0) {
      queue.push({ id, level: 0 })
    }
  })

  if (queue.length === 0) {
    const fallback = nodesById.keys().next().value
    if (fallback) {
      queue.push({ id: fallback, level: 0 })
    }
  }

  const assignedLevels = new Map<string, number>()
  const adjacency = new Map<string, string[]>()
  data.connections.forEach(({ from, to }) => {
    if (!nodesById.has(from) || !nodesById.has(to)) return
    if (!adjacency.has(from)) adjacency.set(from, [])
    adjacency.get(from)!.push(to)
  })

  while (queue.length) {
    const { id, level } = queue.shift()!
    if (!nodesById.has(id)) continue
    if (assignedLevels.has(id)) continue
    assignedLevels.set(id, level)
    adjacency.get(id)?.forEach(childId => {
      queue.push({ id: childId, level: level + 1 })
    })
  }

  nodesById.forEach((node, id) => {
    if (!assignedLevels.has(id)) {
      assignedLevels.set(id, node.level ?? 0)
    }
  })

  const grouped = new Map<number, PositionedNode[]>()
  nodesById.forEach((node, id) => {
    const level = assignedLevels.get(id) ?? 0
    node.level = level
    if (!grouped.has(level)) grouped.set(level, [])
    grouped.get(level)!.push(node)
  })

  const sortedLevels = Array.from(grouped.keys()).sort((a, b) => a - b)

  sortedLevels.forEach(level => {
    const nodesAtLevel = grouped.get(level)!
    nodesAtLevel.sort((a, b) => a.name.localeCompare(b.name))
    nodesAtLevel.forEach((node, index) => {
      node.x = CANVAS_PADDING + level * (NODE_WIDTH + COLUMN_GAP)
      node.y = CANVAS_PADDING + index * (NODE_HEIGHT + ROW_GAP)
    })
  })

  return {
    nodes: Array.from(nodesById.values()),
    connections: data.connections,
  }
}

const createEmptyFlowState = (): SiteFlowData => ({ nodes: [], connections: [] })
const createNodeId = () => `node-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`

const SiteFlowVisualizer = forwardRef<SiteFlowHandle, SiteFlowVisualizerProps>(({
  appDescription = '',
  prdContent,
  initialSiteFlow,
  onSiteFlowChange,
}, ref) => {
  const normalizedInitial = applyLayout(normalizeSiteFlow(initialSiteFlow), true)
  const [flow, setFlow] = useState<SiteFlowData>(normalizedInitial)
  const [mode, setMode] = useState<FlowMode>(
    normalizedInitial.nodes.length ? 'imported' : 'empty'
  )
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [linkSource, setLinkSource] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const latestFlow = useRef<SiteFlowData | null>(normalizedInitial.nodes.length ? normalizedInitial : null)

  useImperativeHandle(ref, () => ({
    getCurrentSiteFlow: () => latestFlow.current,
  }), [])

  useEffect(() => {
    if (flow.nodes.length === 0) {
      latestFlow.current = null
    } else {
      latestFlow.current = flow
    }
    onSiteFlowChange?.(flow)
  }, [flow, onSiteFlowChange])

  useEffect(() => {
    if (!initialSiteFlow || initialSiteFlow.nodes.length === 0) return
    const next = applyLayout(normalizeSiteFlow(initialSiteFlow), true)
    setFlow(next)
    setMode('imported')
    setSelectedNodes(new Set())
    setLinkSource(null)
  }, [initialSiteFlow])

  const nodeMap = useMemo(() => {
    const map = new Map<string, PositionedNode>()
    flow.nodes.forEach(node => map.set(node.id, node as PositionedNode))
    return map
  }, [flow.nodes])

  const connectionsToRender = useMemo(() => {
    return flow.connections
      .map(connection => {
        const from = nodeMap.get(connection.from)
        const to = nodeMap.get(connection.to)
        if (!from || !to) return null
        const startX = from.x + NODE_WIDTH + LINE_OFFSET
        const startY = from.y + NODE_HEIGHT / 2
        const endX = to.x - LINE_OFFSET
        const endY = to.y + NODE_HEIGHT / 2
        const controlOffset = Math.max(Math.abs(endX - startX) / 2, 90)
        const controlX1 = startX + controlOffset
        const controlX2 = endX - controlOffset
        const controlY1 = startY
        const controlY2 = endY
        return {
          id: `${connection.from}-${connection.to}`,
          d: `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`,
          from,
          to,
        }
      })
      .filter(Boolean) as Array<{ id: string; d: string; from: PositionedNode; to: PositionedNode }>
  }, [flow.connections, nodeMap])

  const handleAddNode = () => {
    setFlow(prev => {
      const id = createNodeId()
      const newNode: PositionedNode = {
        id,
        name: 'New Page',
        description: 'Describe this step…',
        level: 0,
        x: CANVAS_PADDING,
        y: CANVAS_PADDING,
      }
      setMode(prevMode => (prevMode === 'empty' ? 'manual' : prevMode))
      return {
        nodes: [...prev.nodes, newNode],
        connections: prev.connections,
      }
    })
  }

  const handleReset = () => {
    setFlow(createEmptyFlowState())
    setMode('empty')
    setSelectedNodes(new Set())
    setLinkSource(null)
  }

  const handleAutoLayout = () => {
    setFlow(prev => applyLayout(prev, true))
  }

  const handleExportJSON = () => {
    if (!latestFlow.current || latestFlow.current.nodes.length === 0) return
    exportSiteFlowAsJSON(latestFlow.current, 'site-flow')
  }

  const handleExportImage = async () => {
    if (!canvasRef.current || !latestFlow.current || latestFlow.current.nodes.length === 0) return
    if (isExporting) return
    setIsExporting(true)
    try {
      await exportSiteFlowAsImage(canvasRef.current, 'site-flow')
    } finally {
      setIsExporting(false)
    }
  }

  const handleGenerate = async () => {
    const prompt = prdContent?.trim() || appDescription.trim()
    if (!prompt || isGenerating) return
    setIsGenerating(true)
    try {
      const aiFlow = await generateSiteFlowWithAI(prompt, Boolean(prdContent?.trim()))
      const normalized = applyLayout(normalizeSiteFlow(aiFlow), true)
      setFlow(normalized)
      setMode('generated')
      setSelectedNodes(new Set())
      setLinkSource(null)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleNodeMouseDown = (event: React.MouseEvent<HTMLDivElement>, node: PositionedNode) => {
    event.preventDefault()
    setDraggingId(node.id)
    const rect = event.currentTarget.getBoundingClientRect()
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const handleCanvasMouseMove = useCallback((event: MouseEvent) => {
    if (!draggingId || !canvasRef.current) return
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const nextX = event.clientX - canvasRect.left - dragOffsetRef.current.x
    const nextY = event.clientY - canvasRect.top - dragOffsetRef.current.y
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === draggingId
          ? {
            ...node,
            x: Math.max(32, nextX),
            y: Math.max(32, nextY),
          }
          : node
      ),
    }))
  }, [draggingId])

  const handleCanvasMouseUp = useCallback(() => {
    setDraggingId(null)
  }, [])

  useEffect(() => {
    if (!draggingId) return
    window.addEventListener('mousemove', handleCanvasMouseMove)
    window.addEventListener('mouseup', handleCanvasMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleCanvasMouseMove)
      window.removeEventListener('mouseup', handleCanvasMouseUp)
    }
  }, [draggingId, handleCanvasMouseMove, handleCanvasMouseUp])

  const handleNodeClick = (nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (linkSource) {
      if (linkSource !== nodeId) {
        setFlow(prev => {
          const exists = prev.connections.some(
            connection => connection.from === linkSource && connection.to === nodeId
          )
          if (exists) return prev
          return {
            ...prev,
            connections: [...prev.connections, { from: linkSource, to: nodeId }],
          }
        })
      }
      setLinkSource(null)
      return
    }

    setSelectedNodes(prev => {
      const next = new Set(prev)
      if (event.metaKey || event.ctrlKey) {
        if (next.has(nodeId)) {
          next.delete(nodeId)
        } else {
          next.add(nodeId)
        }
      } else {
        next.clear()
        next.add(nodeId)
      }
      return next
    })
  }

  const handleDeleteNode = (nodeId: string) => {
    setFlow(prev => ({
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      connections: prev.connections.filter(connection => connection.from !== nodeId && connection.to !== nodeId),
    }))
    setSelectedNodes(prev => {
      const next = new Set(prev)
      next.delete(nodeId)
      return next
    })
    setMode(prev => (prev === 'empty' ? 'empty' : 'manual'))
  }

  const handleRenameNode = (nodeId: string, name: string, description: string) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId
          ? { ...node, name: name.trim() || node.name, description: description.trim() }
          : node
      ),
    }))
  }

  const handleLinkStart = (nodeId: string) => {
    setLinkSource(current => (current === nodeId ? null : nodeId))
  }

  const stats = useMemo(() => ({
    nodes: flow.nodes.length,
    connections: flow.connections.length,
  }), [flow.nodes.length, flow.connections.length])

  const renderToolbar = () => (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-divider/40 rounded-lg px-4 py-3 bg-dark-card/80">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={!prdContent && !appDescription.trim()}
          className="px-3 py-1.5 text-xs rounded-md border border-divider/50 text-white hover:bg-dark-surface disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating…' : 'Generate'}
        </button>
        <button
          onClick={handleAddNode}
          className="px-3 py-1.5 text-xs rounded-md border border-divider/50 text-white hover:bg-dark-surface"
        >
          Add Page
        </button>
        <button
          onClick={handleAutoLayout}
          className="px-3 py-1.5 text-xs rounded-md border border-divider/50 text-white hover:bg-dark-surface"
        >
          Auto Layout
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-xs rounded-md border border-divider/50 text-white hover:bg-dark-surface"
        >
          Reset
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-mid-grey">
          Mode: <span className="text-white">{FLOW_MODE_LABEL[mode]}</span>
        </span>
        <button
          onClick={handleExportJSON}
          disabled={!flow.nodes.length}
          className="px-3 py-1.5 text-xs rounded-md border border-divider/50 text-white hover:bg-dark-surface disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Export JSON
        </button>
        <button
          onClick={handleExportImage}
          disabled={!flow.nodes.length || isExporting}
          className="px-3 py-1.5 text-xs rounded-md border border-divider/50 text-white hover:bg-dark-surface disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isExporting ? 'Exporting…' : 'Export Image'}
        </button>
      </div>
    </div>
  )

  if (!flow.nodes.length) {
    return (
      <div className="space-y-6">
        {renderToolbar()}
        <div className="text-center py-16 rounded-xl border border-dashed border-divider/50 bg-dark-card/40">
          <p className="text-white mb-4 text-base">Start your site flow</p>
          <p className="text-sm text-mid-grey mb-6">
            Generate from your prompt or sketch it manually. You can always auto-layout later.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={!prdContent && !appDescription.trim()}
              className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
            <button
              onClick={handleAddNode}
              className="px-4 py-2 border border-divider/50 text-sm text-white rounded-md hover:bg-dark-surface"
            >
              Add first page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {renderToolbar()}

      <div className="flex items-center gap-4 text-xs text-mid-grey uppercase tracking-wide bg-dark-card/50 rounded-lg px-4 py-2 border border-divider/40">
        <span>{stats.nodes} pages</span>
        <span>•</span>
        <span>{stats.connections} connections</span>
        {linkSource && (
          <>
            <span>•</span>
            <span className="text-amber-gold">Select a target to link with {nodeMap.get(linkSource)?.name}</span>
          </>
        )}
      </div>

      <div
        ref={canvasRef}
        className="relative border border-divider/40 rounded-lg overflow-hidden bg-[#0E0E0E]"
        style={{ height: '70vh' }}
        onClick={() => {
          setSelectedNodes(new Set())
          setLinkSource(null)
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <linearGradient id="siteflow-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3ECF8E" />
              <stop offset="50%" stopColor="#4E46E5" />
              <stop offset="100%" stopColor="#D9A441" />
            </linearGradient>
          </defs>
          <g>
            {connectionsToRender.map(connection => (
              <path
                key={connection.id}
                d={connection.d}
                fill="none"
                stroke="url(#siteflow-line)"
                strokeWidth={2.4}
                opacity={selectedNodes.has(connection.from.id) || selectedNodes.has(connection.to.id) ? 1 : 0.85}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>
        </svg>

        <div className="absolute inset-0">
          {flow.nodes.map(node => {
            const isSelected = selectedNodes.has(node.id)
            return (
              <div
                key={node.id}
                className={`absolute w-[260px] cursor-grab active:cursor-grabbing transition-transform ${
                  isSelected ? 'z-30' : 'z-10'
                }`}
                style={{ left: node.x, top: node.y }}
                onMouseDown={event => handleNodeMouseDown(event, node as PositionedNode)}
                onClick={event => handleNodeClick(node.id, event)}
              >
                <div
                  className={`rounded-xl border bg-dark-card/90 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-colors ${
                    isSelected ? 'border-amber-gold' : 'border-divider/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-mid-grey/70">
                        Level {node.level ?? 0}
                      </p>
                      <h3 className="text-sm text-white font-semibold line-clamp-2">{node.name}</h3>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        className="text-[10px] px-2 py-0.5 rounded-md border border-divider/40 text-mid-grey hover:text-white"
                        onClick={event => {
                          event.stopPropagation()
                          const newName = prompt('Rename page', node.name) ?? node.name
                          const descriptionPrompt = prompt('Update description', node.description || '')
                          const newDescription = descriptionPrompt ?? (node.description || '')
                          handleRenameNode(node.id, newName, newDescription)
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="text-[10px] px-2 py-0.5 rounded-md border border-divider/40 text-mid-grey hover:text-white"
                        onClick={event => {
                          event.stopPropagation()
                          handleLinkStart(node.id)
                        }}
                      >
                        {linkSource === node.id ? 'Cancel' : 'Link'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[12px] text-mid-grey mt-3 line-clamp-3">
                    {node.description || 'Add more context to this step.'}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-mid-grey">
                    <span>
                      {flow.connections.filter(connection => connection.from === node.id).length} out •{' '}
                      {flow.connections.filter(connection => connection.to === node.id).length} in
                    </span>
                    <button
                      className="text-red-400 hover:text-red-300"
                      onClick={event => {
                        event.stopPropagation()
                        handleDeleteNode(node.id)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

SiteFlowVisualizer.displayName = 'SiteFlowVisualizer'

export default SiteFlowVisualizer


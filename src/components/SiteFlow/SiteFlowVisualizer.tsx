import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { SiteFlowData } from '../../utils/storage'
import { generateSiteFlow } from '../../utils/siteFlowGenerator'
import {
  autoLayoutSiteFlow,
  buildFlowLayout,
  FLOW_NODE_HEIGHT,
  FLOW_NODE_WIDTH,
  getConnectionPath,
} from '../../utils/siteFlowUtils'

export type SiteFlowHandle = {
  getCurrentSiteFlow: () => SiteFlowData | null
}

type SiteFlowVisualizerProps = {
  appDescription?: string
  prdContent?: string
  initialSiteFlow?: SiteFlowData
  onSiteFlowChange?: (data: SiteFlowData) => void
}

const SiteFlowVisualizer = forwardRef<SiteFlowHandle, SiteFlowVisualizerProps>(
  ({ appDescription, prdContent, initialSiteFlow, onSiteFlowChange }, ref) => {
    const [siteFlow, setSiteFlow] = useState<SiteFlowData | null>(
      initialSiteFlow ? autoLayoutSiteFlow(initialSiteFlow) : null
    )
    const [error, setError] = useState<string | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [zoom, setZoom] = useState(30)
    const [draggedNode, setDraggedNode] = useState<string | null>(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const flowContainerRef = useRef<HTMLDivElement>(null)
    const lastGeneratedContent = useRef<string>('')

    // Update when initialSiteFlow changes
    useEffect(() => {
      if (initialSiteFlow) {
        const laidOut = autoLayoutSiteFlow(initialSiteFlow)
        setSiteFlow(laidOut)
      }
    }, [initialSiteFlow])

    // Auto-generate flow when appDescription or prdContent changes
    useEffect(() => {
      const currentContent = `${appDescription || ''}|${prdContent || ''}`
      const hasContent = (appDescription?.trim() || prdContent?.trim()) && currentContent !== lastGeneratedContent.current
      
      // Auto-generate if we have new content and not currently generating
      if (hasContent && !isGenerating) {
        lastGeneratedContent.current = currentContent
        handleGenerate()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appDescription, prdContent])

    useImperativeHandle(
      ref,
      () => ({
        getCurrentSiteFlow: () => siteFlow,
      }),
      [siteFlow]
    )

    const handleGenerate = async () => {
      setIsGenerating(true)
      setError(null)

      try {
        console.log('Generating site flow...', { appDescription, prdContent })
        const data = await generateSiteFlow(appDescription, prdContent)
        console.log('Generated site flow data:', data)
        
        if (!data || !data.nodes || data.nodes.length === 0) {
          throw new Error('Generated flow has no nodes. Please try again with more details.')
        }
        
        const laidOut = autoLayoutSiteFlow(data)
        console.log('Laid out site flow:', laidOut)
        setSiteFlow(laidOut)
        onSiteFlowChange?.(laidOut)
      } catch (err) {
        console.error('Error generating site flow:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate site flow')
      } finally {
        setIsGenerating(false)
      }
    }

    const flowLayout = useMemo(() => {
      if (!siteFlow || siteFlow.nodes.length === 0) {
        console.log('No flow layout - siteFlow:', siteFlow)
        return null
      }
      try {
        const layout = buildFlowLayout(siteFlow)
        console.log('Flow layout built:', layout)
        return layout
      } catch (error) {
        console.error('Error building flow layout:', error)
        return null
      }
    }, [siteFlow])

    const handleAutoLayout = () => {
      if (!siteFlow) return
      const laidOut = autoLayoutSiteFlow(siteFlow)
      setSiteFlow(laidOut)
      onSiteFlowChange?.(laidOut)
    }

    const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDraggedNode(nodeId)
      const node = flowLayout?.nodes.find((n) => n.id === nodeId)
      if (node && flowContainerRef.current) {
        const rect = flowContainerRef.current.getBoundingClientRect()
        const scale = zoom / 100
        const nodeX = (node.x - FLOW_NODE_WIDTH / 2) * scale + rect.left
        const nodeY = (node.y - FLOW_NODE_HEIGHT / 2) * scale + rect.top
        setDragOffset({
          x: e.clientX - nodeX,
          y: e.clientY - nodeY,
        })
      }
    }

    useEffect(() => {
      if (draggedNode && flowLayout) {
        const handleMouseMove = (e: MouseEvent) => {
          if (!draggedNode || !flowLayout || !flowContainerRef.current) return
          
          const rect = flowContainerRef.current.getBoundingClientRect()
          const scale = zoom / 100
          const x = (e.clientX - rect.left - dragOffset.x) / scale + FLOW_NODE_WIDTH / 2
          const y = (e.clientY - rect.top - dragOffset.y) / scale + FLOW_NODE_HEIGHT / 2

          setSiteFlow((prev) => {
            if (!prev) return prev
            const updated = {
              ...prev,
              nodes: prev.nodes.map((node) =>
                node.id === draggedNode ? { ...node, x, y } : node
              ),
            }
            onSiteFlowChange?.(updated)
            return updated
          })
        }

        const handleMouseUp = () => {
          setDraggedNode(null)
          setDragOffset({ x: 0, y: 0 })
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)

        return () => {
          window.removeEventListener('mousemove', handleMouseMove)
          window.removeEventListener('mouseup', handleMouseUp)
        }
      }
    }, [draggedNode, dragOffset, flowLayout, zoom, onSiteFlowChange])

    if (!siteFlow && !error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-amber-gold/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">No Site Flow</h3>
            <p className="text-sm text-mid-grey mb-6">
              Generate a site flow to visualize your application structure
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-amber-gold text-charcoal rounded-md font-medium hover:bg-amber-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate Flow'}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="w-full h-full flex flex-col relative bg-dark-surface">
        {/* Header Controls */}
        <div className="flex items-center justify-between p-4 border-b border-divider/50 bg-dark-card/50">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-8 h-8 bg-amber-gold/20 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-charcoal">Site Flow</h2>
              <p className="text-xs text-mid-grey mt-0.5">
                Visual representation of your app structure
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {siteFlow && flowLayout && (
              <>
                <button className="px-3 py-1.5 text-sm text-charcoal bg-dark-surface hover:bg-dark-surface/80 rounded-md transition-colors border border-divider/50">
                  Connect
                </button>
                <button
                  onClick={handleAutoLayout}
                  className="px-3 py-1.5 text-sm text-charcoal bg-dark-surface hover:bg-dark-surface/80 rounded-md transition-colors border border-divider/50"
                >
                  Center
                </button>
              </>
            )}
            {siteFlow && flowLayout && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(Math.max(30, zoom - 10))}
                  className="px-2 py-1 text-sm text-charcoal bg-dark-surface hover:bg-dark-surface/80 rounded transition-colors border border-divider/50"
                  disabled={zoom <= 30}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-xs text-charcoal font-medium min-w-[3rem] text-center tabular-nums">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom(Math.min(100, zoom + 10))}
                  className="px-2 py-1 text-sm text-charcoal bg-dark-surface hover:bg-dark-surface/80 rounded transition-colors border border-divider/50"
                  disabled={zoom >= 100}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-1.5 text-sm bg-amber-gold text-charcoal rounded-md font-medium hover:bg-amber-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {siteFlow ? 'Regenerate Flow' : 'Generate Flow'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border-b border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Flow Visualization */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto relative bg-dark-surface"
          style={{ minHeight: '500px', padding: '40px' }}
        >
          {!flowLayout && siteFlow && siteFlow.nodes.length > 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-mid-grey mb-2">Calculating layout...</p>
                <p className="text-xs text-mid-grey/60">
                  {siteFlow.nodes.length} nodes found
                </p>
              </div>
            </div>
          )}
          {flowLayout && flowLayout.nodes.length > 0 && (
            <div
              ref={flowContainerRef}
              className="relative transition-transform duration-200"
              style={{
                width: flowLayout.width,
                height: flowLayout.height,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                margin: '0 auto',
              }}
            >
              {/* SVG for connections - positioned to match nodes */}
              <svg
                ref={svgRef}
                className="absolute top-0 left-0 pointer-events-none"
                width={flowLayout.width}
                height={flowLayout.height}
                style={{ overflow: 'visible' }}
              >
                <defs>
                  {/* Arrowhead marker for connections */}
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3, 0 6"
                      fill="#3ECF8E"
                      opacity="0.8"
                    />
                  </marker>
                </defs>

                {/* Render connections */}
                {flowLayout.connections.map((connection, index) => {
                  const fromNode = flowLayout.nodes.find((n) => n.id === connection.from)
                  const toNode = flowLayout.nodes.find((n) => n.id === connection.to)

                  if (!fromNode || !toNode) return null

                  const { path, length } = getConnectionPath(fromNode, toNode)
                  const animationDuration = Math.max(2, length / 50)

                  return (
                    <g key={`connection-${index}`}>
                      <path
                        d={path}
                        fill="none"
                        stroke="#3ECF8E"
                        strokeWidth="2"
                        strokeDasharray="5 5"
                        opacity="0.7"
                        markerEnd="url(#arrowhead)"
                      />
                      {/* Animated railway dots */}
                      {[0, 0.4, 0.8].map((offset, dotIndex) => (
                        <circle key={dotIndex} r="3" fill="#3ECF8E" opacity="0.9">
                          <animateMotion
                            dur={`${animationDuration}s`}
                            repeatCount="indefinite"
                            path={path}
                            begin={`${offset * animationDuration}s`}
                          />
                        </circle>
                      ))}
                    </g>
                  )
                })}
              </svg>

              {/* Nodes positioned absolutely to align with SVG */}
              <div className="absolute inset-0">
                {flowLayout.nodes.map((node) => {
                  return (
                    <div
                      key={node.id}
                      className="absolute pointer-events-auto cursor-move select-none"
                      style={{
                        left: `${node.x - FLOW_NODE_WIDTH / 2}px`,
                        top: `${node.y - FLOW_NODE_HEIGHT / 2}px`,
                        width: `${FLOW_NODE_WIDTH}px`,
                        zIndex: draggedNode === node.id ? 50 : 10,
                      }}
                      onMouseDown={(e) => handleNodeDragStart(node.id, e)}
                    >
                      <div
                        className={`group relative bg-gradient-to-br from-dark-card to-dark-card/95 border-2 rounded-xl shadow-lg transition-all duration-200 ${
                          draggedNode === node.id
                            ? 'border-amber-gold/60 shadow-2xl scale-105'
                            : 'border-divider/30 hover:shadow-xl hover:border-amber-gold/40 hover:scale-[1.02]'
                        }`}
                        style={{
                          minHeight: `${FLOW_NODE_HEIGHT}px`,
                          width: '100%',
                        }}
                      >
                        {/* Top accent bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-gold/60 via-amber-gold/40 to-transparent rounded-t-xl" />
                        
                        {/* Content */}
                        <div className="p-4">
                          {/* Header row */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-gold/15 text-amber-gold border border-amber-gold/30">
                                  {node.level === 0 ? 'ROOT' : `LEVEL ${node.level}`}
                                </span>
                              </div>
                              <h3 className="font-bold text-charcoal text-base leading-tight mb-1.5">
                                {node.name}
                              </h3>
                            </div>
                          </div>

                          {/* Description */}
                          {node.description && (
                            <p className="text-xs text-mid-grey leading-relaxed mb-3 line-clamp-2">
                              {node.description}
                            </p>
                          )}

                          {/* Connection stats - compact flow style */}
                          <div className="flex items-center gap-3 pt-2 border-t border-divider/20">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-amber-gold/70 shadow-sm" />
                              <span className="text-[11px] text-mid-grey">Out:</span>
                              <span className="text-[11px] text-charcoal font-bold">
                                {flowLayout.connections.filter((c) => c.from === node.id).length}
                              </span>
                            </div>
                            <div className="w-px h-3 bg-divider/30" />
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-amber-gold/50 shadow-sm" />
                              <span className="text-[11px] text-mid-grey">In:</span>
                              <span className="text-[11px] text-charcoal font-bold">
                                {flowLayout.connections.filter((c) => c.to === node.id).length}
                              </span>
                            </div>
                          </div>

                          {/* Action buttons - minimal flow style */}
                          <div className="flex gap-1.5 mt-3 pt-2 border-t border-divider/20">
                            <button
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="flex-1 px-2 py-1 text-[10px] font-medium text-charcoal/70 hover:text-charcoal bg-dark-surface/30 hover:bg-dark-surface/50 border border-divider/30 hover:border-divider/50 rounded-md transition-all"
                            >
                              Rename
                            </button>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="flex-1 px-2 py-1 text-[10px] font-medium text-charcoal/70 hover:text-charcoal bg-dark-surface/30 hover:bg-dark-surface/50 border border-divider/30 hover:border-divider/50 rounded-md transition-all"
                            >
                              Add child
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

SiteFlowVisualizer.displayName = 'SiteFlowVisualizer'

export default SiteFlowVisualizer


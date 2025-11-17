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
      initialSiteFlow ? autoLayoutSiteFlow(initialSiteFlow) : null,
    )
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const canvasRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (initialSiteFlow) {
        const laidOut = autoLayoutSiteFlow(initialSiteFlow)
        setSiteFlow(laidOut)
        setError(null)
      }
    }, [initialSiteFlow])

    useImperativeHandle(
      ref,
      () => ({
        getCurrentSiteFlow: () => siteFlow,
      }),
      [siteFlow],
    )

    const handleGenerate = async () => {
      if (!appDescription && !prdContent) {
        setError('Add a project description or PRD first to generate a site flow.')
        return
      }

      try {
        setIsGenerating(true)
        setError(null)
        const data = await generateSiteFlow(appDescription, prdContent)
        setSiteFlow(data)
        onSiteFlowChange?.(data)
      } catch (err) {
        console.error('Failed to generate site flow:', err)
        setError('Failed to generate site flow. Please try again.')
      } finally {
        setIsGenerating(false)
      }
    }

    const handleAutoLayout = () => {
      if (!siteFlow) return
      const laidOut = autoLayoutSiteFlow(siteFlow)
      setSiteFlow(laidOut)
      onSiteFlowChange?.(laidOut)
    }

    // Calculate positioned nodes for flow diagram
    const positioned = useMemo(() => {
      if (!siteFlow || siteFlow.nodes.length === 0) return null
      return buildFlowLayout(siteFlow)
    }, [siteFlow])

    const laneHeaderHeight = 36
    const canvasHeight = positioned ? positioned.height + laneHeaderHeight : 0
    const canvasWidth = positioned ? positioned.width : 0

    const handleFocusFlow = () => {
      canvasRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-heading font-semibold text-charcoal mb-1">Site Flow Map</h3>
            <p className="text-xs text-mid-grey leading-relaxed">
              Visual structure of your app screens and navigation
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {positioned && (
              <button
                type="button"
                onClick={handleFocusFlow}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-divider/40 text-mid-grey hover:text-charcoal hover:border-amber-gold/50 transition-all duration-200"
              >
                Focus flow
              </button>
            )}
            {siteFlow && (
              <button
                type="button"
                onClick={handleAutoLayout}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-divider/50 text-mid-grey hover:text-charcoal hover:border-amber-gold/50 hover:bg-amber-gold/5 transition-all duration-200"
              >
                Auto-layout
              </button>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-amber-gold text-white hover:bg-amber-gold/90 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1.5"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  {siteFlow ? 'Regenerate Flow' : 'Generate Flow'}
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {!siteFlow && !error && (
          <div className="text-xs text-mid-grey bg-dark-card/50 border border-dashed border-divider/40 rounded-lg px-5 py-4 text-center">
            <svg className="w-8 h-8 mx-auto mb-2.5 text-mid-grey/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="leading-relaxed">
              Click <span className="font-medium text-charcoal">Generate Flow</span> to create a
              visual site map from your description and PRD.
            </p>
          </div>
        )}

        {positioned && (
          <div
            ref={canvasRef}
            className="relative w-full max-h-[600px] overflow-auto rounded-xl border border-divider/40 bg-gradient-to-br from-dark-surface/40 via-dark-card/30 to-dark-surface/40 shadow-inner"
          >
            <div className="absolute inset-0 rounded-xl pointer-events-none opacity-50">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              ></div>
            </div>
            <div
              className="relative p-6"
              style={{
                width: Math.max(canvasWidth + 32, 600),
                height: Math.max(canvasHeight + 32, 320),
                minHeight: '300px',
              }}
            >
              {/* Flow connectors with arrows */}
              <svg
                className="absolute inset-0 pointer-events-none overflow-visible"
                style={{
                  width: canvasWidth + 32,
                  height: canvasHeight + 32,
                }}
              >
                <defs>
                  <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgb(251 191 36)" stopOpacity="0.5" />
                    <stop offset="50%" stopColor="rgb(251 191 36)" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="rgb(251 191 36)" stopOpacity="0.6" />
                  </linearGradient>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="8"
                    refX="9"
                    refY="4"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 4, 0 8"
                      fill="rgb(251 191 36)"
                      opacity="0.9"
                    />
                  </marker>
                </defs>
                {siteFlow?.connections.map((edge, index) => {
                  const from = positioned.nodeMap.get(edge.from)
                  const to = positioned.nodeMap.get(edge.to)
                  if (!from || !to) return null

                  const fromX = from.layoutX + FLOW_NODE_WIDTH
                  const fromY = from.layoutY + laneHeaderHeight + FLOW_NODE_HEIGHT / 2
                  const toX = to.layoutX
                  const toY = to.layoutY + laneHeaderHeight + FLOW_NODE_HEIGHT / 2

                  // Calculate control points for smooth bezier curve
                  const controlOffset = Math.abs(toX - fromX) * 0.4

                  // Create smooth bezier curve
                  const path = `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`

                  return (
                    <path
                      key={index}
                      d={path}
                      fill="none"
                      stroke="url(#flow-gradient)"
                      strokeWidth={2.5}
                      markerEnd="url(#arrowhead)"
                      className="drop-shadow-sm"
                    />
                  )
                })}
              </svg>

              {/* Lane labels */}
              {positioned.lanes.map((lane) => (
                <div
                  key={lane.column}
                  className="absolute text-[0.65rem] uppercase tracking-wide text-mid-grey/70 font-semibold flex flex-col items-start gap-1"
                  style={{
                    left: lane.x,
                    top: 0,
                    width: FLOW_NODE_WIDTH,
                  }}
                >
                  <span className="px-2 py-0.5 rounded-full border border-divider/40 bg-dark-surface/50">
                    {lane.label}
                  </span>
                  <span className="block w-full h-px bg-divider/40"></span>
                </div>
              ))}

              {/* Flow nodes */}
              {positioned.nodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute rounded-lg border bg-gradient-to-br from-dark-card to-dark-surface/80 shadow-md border-divider/50 hover:border-amber-gold/60 hover:shadow-lg transition-all duration-200 group"
                  style={{
                    left: node.layoutX,
                    top: node.layoutY + laneHeaderHeight,
                    width: `${FLOW_NODE_WIDTH}px`,
                  }}
                >
                  <div className="px-3 py-2 border-b border-divider/40 bg-dark-surface/30 flex items-center justify-between gap-2 rounded-t-lg">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-gold/20 to-amber-gold/10 flex items-center justify-center text-[0.65rem] font-bold text-amber-gold shadow-sm flex-shrink-0">
                        {node.level ?? 0}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-heading font-semibold text-charcoal truncate">
                          {node.name}
                        </div>
                        <div className="text-[0.65rem] text-mid-grey/70 truncate mt-0.5">
                          #{node.id}
                        </div>
                      </div>
                    </div>
                    {node.isParent && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-gold/15 to-amber-gold/10 text-[0.6rem] text-amber-gold font-semibold border border-amber-gold/20 flex-shrink-0">
                        Hub
                      </span>
                    )}
                  </div>
                  {node.description ? (
                    <div className="px-3 py-2 text-[0.7rem] text-mid-grey leading-snug h-[44px] overflow-hidden text-ellipsis">
                      {node.description}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-[0.7rem] text-mid-grey/70 italic">No description</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {positioned && (
          <div className="flex flex-wrap items-center gap-4 text-[0.7rem] text-mid-grey/80 border border-dashed border-divider/40 rounded-lg px-4 py-3 bg-dark-card/30">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-gold/20 to-amber-gold/10 border border-amber-gold/30"></span>
              <span>Flow level badge</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-gradient-to-r from-amber-gold/15 to-amber-gold/10 text-amber-gold border border-amber-gold/20 text-[0.65rem] font-semibold">
                Hub
              </span>
              <span>High-connectivity node</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-0.5 bg-gradient-to-r from-amber-gold/60 to-amber-gold/30 relative">
                <span className="absolute -right-2 -top-1.5 w-0 h-0 border-l-[6px] border-l-amber-gold border-y-[4px] border-y-transparent"></span>
              </span>
              <span>Primary navigation path</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-gold/30 border border-amber-gold/50"></span>
              <span>Entry / root node</span>
            </div>
          </div>
        )}
      </div>
    )
  },
)

SiteFlowVisualizer.displayName = 'SiteFlowVisualizer'

export default SiteFlowVisualizer



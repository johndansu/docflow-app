import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import type { SiteFlowData } from '../../utils/storage'
import { generateSiteFlow } from '../../utils/siteFlowGenerator'
import { autoLayoutSiteFlow } from '../../utils/siteFlowUtils'

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

      const nodes = siteFlow.nodes
      const xs = nodes.map((n) => n.x)
      const ys = nodes.map((n) => n.y)
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)

      const normalizedNodes = nodes.map((n) => ({
        ...n,
        x: n.x - minX,
        y: n.y - minY,
      }))

      const maxX = Math.max(...normalizedNodes.map((n) => n.x))
      const maxY = Math.max(...normalizedNodes.map((n) => n.y))

      return {
        nodes: normalizedNodes,
        width: maxX + 320,
        height: maxY + 200,
      }
    }, [siteFlow])

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-heading font-semibold text-charcoal mb-1">Site Flow Map</h3>
            <p className="text-xs text-mid-grey leading-relaxed">
              Visual structure of your app screens and navigation
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
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
          <div className="relative w-full max-h-[600px] overflow-auto rounded-xl border border-divider/40 bg-gradient-to-br from-dark-surface/40 via-dark-card/30 to-dark-surface/40 shadow-inner">
            <div
              className="relative p-8"
              style={{
                width: Math.max(positioned.width, 600),
                height: Math.max(positioned.height, 300),
                minHeight: '300px',
              }}
            >
              {/* Flow connectors with arrows */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={positioned.width}
                height={positioned.height}
              >
                {siteFlow?.connections.map((edge, index) => {
                  const from = positioned.nodes.find((n) => n.id === edge.from)
                  const to = positioned.nodes.find((n) => n.id === edge.to)
                  if (!from || !to) return null

                  // Calculate connection points (right edge of from node, left edge of to node)
                  const fromX = from.x + 280
                  const fromY = from.y + 60
                  const toX = to.x
                  const toY = to.y + 60

                  // Calculate control points for smooth bezier curve
                  const controlOffset = Math.abs(toX - fromX) * 0.4

                  // Create smooth bezier curve
                  const path = `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`

                  // Arrow dimensions
                  const arrowLength = 8
                  const arrowWidth = 6

                  return (
                    <g key={index}>
                      <defs>
                        <linearGradient id={`flow-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="rgb(251 191 36)" stopOpacity="0.4" />
                          <stop offset="50%" stopColor="rgb(251 191 36)" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="rgb(251 191 36)" stopOpacity="0.5" />
                        </linearGradient>
                        <marker
                          id={`arrowhead-${index}`}
                          markerWidth={arrowLength}
                          markerHeight={arrowWidth}
                          refX={arrowLength}
                          refY={arrowWidth / 2}
                          orient="auto"
                        >
                          <polygon
                            points={`0 0, ${arrowLength} ${arrowWidth / 2}, 0 ${arrowWidth}`}
                            fill="rgb(251 191 36)"
                            opacity="0.8"
                          />
                        </marker>
                      </defs>
                      <path
                        d={path}
                        fill="none"
                        stroke={`url(#flow-gradient-${index})`}
                        strokeWidth={2.5}
                        markerEnd={`url(#arrowhead-${index})`}
                        className="drop-shadow-sm"
                      />
                    </g>
                  )
                })}
              </svg>

              {/* Flow nodes */}
              {positioned.nodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute rounded-xl border bg-gradient-to-br from-dark-card to-dark-surface/80 shadow-lg border-divider/50 hover:border-amber-gold/60 hover:shadow-xl transition-all duration-200 group"
                  style={{
                    left: node.x,
                    top: node.y,
                    width: '280px',
                  }}
                >
                  <div className="px-4 py-3 border-b border-divider/40 bg-dark-surface/30 flex items-center justify-between gap-3 rounded-t-xl">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-gold/20 to-amber-gold/10 flex items-center justify-center text-xs font-bold text-amber-gold shadow-sm flex-shrink-0">
                        {node.level ?? 0}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-heading font-semibold text-charcoal truncate">
                          {node.name}
                        </div>
                        <div className="text-[0.7rem] text-mid-grey/70 truncate mt-0.5">
                          #{node.id}
                        </div>
                      </div>
                    </div>
                    {node.isParent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-gold/15 to-amber-gold/10 text-[0.65rem] text-amber-gold font-semibold border border-amber-gold/20 flex-shrink-0">
                        Hub
                      </span>
                    )}
                  </div>
                  {node.description && (
                    <div className="px-4 py-3 text-[0.75rem] text-mid-grey leading-relaxed">
                      {node.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  },
)

SiteFlowVisualizer.displayName = 'SiteFlowVisualizer'

export default SiteFlowVisualizer



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

type NodeWithPosition = SiteFlowData['nodes'][number]

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

    const positioned = useMemo(() => {
      if (!siteFlow) return null

      const nodes = siteFlow.nodes
      if (nodes.length === 0) return null

      const xs = nodes.map((n) => n.x)
      const ys = nodes.map((n) => n.y)
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)

      const normalizedNodes: NodeWithPosition[] = nodes.map((n) => ({
        ...n,
        x: n.x - minX,
        y: n.y - minY,
      }))

      const maxX = Math.max(...normalizedNodes.map((n) => n.x))
      const maxY = Math.max(...normalizedNodes.map((n) => n.y))

      return {
        nodes: normalizedNodes,
        width: maxX + 260,
        height: maxY + 160,
      }
    }, [siteFlow])

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-charcoal">Site Flow Map</h3>
            <p className="text-xs text-mid-grey">
              Visual structure of your app screens and navigation
            </p>
          </div>
          <div className="flex items-center gap-2">
            {siteFlow && (
              <button
                type="button"
                onClick={handleAutoLayout}
                className="px-2.5 py-1 text-xs rounded-md border border-divider/60 text-mid-grey hover:text-charcoal hover:border-amber-gold/60 hover:bg-dark-surface/40 transition-colors"
              >
                Auto-layout
              </button>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs rounded-md bg-amber-gold text-white font-medium hover:bg-amber-gold/90 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              {isGenerating ? 'Generating…' : siteFlow ? 'Regenerate Flow' : 'Generate Flow'}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-500 bg-red-500/5 border border-red-500/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {!siteFlow && !error && (
          <div className="text-xs text-mid-grey bg-dark-card/40 border border-dashed border-divider/60 rounded-md px-4 py-3">
            Click <span className="font-medium text-charcoal">Generate Flow</span> to create a
            visual site map from your description and PRD.
          </div>
        )}

        {positioned && (
          <div className="relative w-full max-h-[420px] overflow-auto rounded-lg border border-divider/60 bg-gradient-to-b from-dark-surface/60 to-dark-card/60">
            <div
              className="relative"
              style={{
                width: Math.max(positioned.width, 600),
                height: Math.max(positioned.height, 260),
              }}
            >
              {/* Connectors */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={positioned.width}
                height={positioned.height}
              >
                {siteFlow?.connections.map((edge, index) => {
                  const from = positioned.nodes.find((n) => n.id === edge.from)
                  const to = positioned.nodes.find((n) => n.id === edge.to)
                  if (!from || !to) return null

                  const fromX = from.x + 140
                  const fromY = from.y + 48
                  const toX = to.x + 20
                  const toY = to.y + 48

                  const midX = (fromX + toX) / 2

                  const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`

                  return (
                    <g key={index}>
                      <path
                        d={path}
                        fill="none"
                        className="stroke-amber-gold/40"
                        strokeWidth={1.2}
                      />
                      <circle cx={toX} cy={toY} r={2} className="fill-amber-gold/70" />
                    </g>
                  )
                })}
              </svg>

              {/* Nodes */}
              {positioned.nodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute w-60 rounded-lg border bg-dark-card shadow-sm border-divider/70 hover:border-amber-gold/80 transition-colors"
                  style={{
                    left: node.x,
                    top: node.y,
                  }}
                >
                  <div className="px-3.5 py-2.5 border-b border-divider/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-amber-gold/15 flex items-center justify-center text-[0.65rem] font-semibold text-amber-gold">
                        {node.level ?? 0}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-charcoal truncate">
                          {node.name}
                        </div>
                        <div className="text-[0.65rem] text-mid-grey truncate">
                          #{node.id}
                        </div>
                      </div>
                    </div>
                    {node.isParent && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-gold/10 text-[0.6rem] text-amber-gold font-medium">
                        Hub
                      </span>
                    )}
                  </div>
                  {node.description && (
                    <div className="px-3.5 py-2 text-[0.7rem] text-mid-grey leading-snug">
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



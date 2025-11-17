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
  type FlowLayoutNode,
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
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Update when initialSiteFlow changes
    useEffect(() => {
      if (initialSiteFlow) {
        const laidOut = autoLayoutSiteFlow(initialSiteFlow)
        setSiteFlow(laidOut)
      }
    }, [initialSiteFlow])

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
        const data = await generateSiteFlow(appDescription, prdContent)
        setSiteFlow(data)
        onSiteFlowChange?.(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate site flow')
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

    const flowLayout = useMemo(() => {
      if (!siteFlow || siteFlow.nodes.length === 0) return null
      return buildFlowLayout(siteFlow)
    }, [siteFlow])

    // Group nodes by level for list rendering
    const nodesByLevel = useMemo(() => {
      if (!flowLayout) return new Map<number, FlowLayoutNode[]>()

      const grouped = new Map<number, FlowLayoutNode[]>()
      flowLayout.nodes.forEach((node) => {
        const level = node.level ?? 0
        if (!grouped.has(level)) {
          grouped.set(level, [])
        }
        grouped.get(level)!.push(node)
      })

      // Sort each level by x position
      grouped.forEach((nodes) => {
        nodes.sort((a, b) => a.x - b.x)
      })

      return grouped
    }, [flowLayout])

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
          <div>
            <h2 className="text-lg font-semibold text-charcoal">Site Flow</h2>
            <p className="text-xs text-mid-grey mt-0.5">
              {siteFlow?.nodes.length || 0} pages, {siteFlow?.connections.length || 0} connections
            </p>
          </div>
          <div className="flex gap-2">
            {siteFlow && (
              <button
                onClick={handleAutoLayout}
                className="px-3 py-1.5 text-sm text-mid-grey hover:text-charcoal hover:bg-dark-surface rounded-md transition-colors"
              >
                Auto Layout
              </button>
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
          className="flex-1 overflow-auto relative"
          style={{ minHeight: '500px' }}
        >
          {flowLayout && (
            <div className="relative" style={{ width: flowLayout.width, height: flowLayout.height }}>
              {/* SVG for connections */}
              <svg
                ref={svgRef}
                className="absolute top-0 left-0 pointer-events-none"
                width={flowLayout.width}
                height={flowLayout.height}
                style={{ overflow: 'visible' }}
              >
                <defs>
                  {/* Gradient for connection lines */}
                  <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3ECF8E" stopOpacity="0.6" />
                    <stop offset="50%" stopColor="#3ECF8E" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3ECF8E" stopOpacity="0.6" />
                  </linearGradient>
                  {/* Animated dot pattern for railway effect */}
                  <pattern
                    id="railwayPattern"
                    x="0"
                    y="0"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="10" cy="10" r="2" fill="#3ECF8E" opacity="0.8">
                      <animate
                        attributeName="opacity"
                        values="0.3;1;0.3"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </pattern>
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
                      {/* Base line */}
                      <path
                        d={path}
                        fill="none"
                        stroke="url(#connectionGradient)"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        opacity="0.4"
                      />
                      {/* Animated railway dots - multiple dots for better effect */}
                      {[0, 0.3, 0.6].map((offset, dotIndex) => (
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

              {/* List-based node rendering by level */}
              <div className="relative p-8">
                <ul className="space-y-8">
                  {Array.from(nodesByLevel.entries())
                    .sort(([a], [b]) => a - b)
                    .map(([level, nodes]) => (
                      <li key={`level-${level}`} className="relative">
                        {/* Level header */}
                        <div className="flex items-center gap-4 mb-4 sticky top-0 bg-dark-surface/95 backdrop-blur-sm py-2 z-10">
                          <div className="text-xs font-semibold text-amber-gold/70 uppercase tracking-wide">
                            Level {level}
                          </div>
                          <div className="flex-1 h-px bg-divider/30" />
                          <div className="text-xs text-mid-grey">{nodes.length} page{nodes.length !== 1 ? 's' : ''}</div>
                        </div>
                        
                        {/* Nodes in this level - true list format */}
                        <ul className="space-y-3">
                          {nodes.map((node) => {
                            const hasChildren = flowLayout.connections.some(
                              (conn) => conn.from === node.id
                            )
                            const childCount = flowLayout.connections.filter(
                              (conn) => conn.from === node.id
                            ).length
                            const children = flowLayout.connections
                              .filter((conn) => conn.from === node.id)
                              .map((conn) => flowLayout.nodes.find((n) => n.id === conn.to))
                              .filter(Boolean) as FlowLayoutNode[]

                            return (
                              <li
                                key={node.id}
                                className="relative"
                                style={{
                                  transform: `translate(${node.x - FLOW_NODE_WIDTH / 2}px, ${
                                    node.y - FLOW_NODE_HEIGHT / 2
                                  }px)`,
                                }}
                              >
                                <div
                                  className={`bg-dark-card border-2 rounded-lg p-4 shadow-lg transition-all hover:shadow-xl hover:border-amber-gold/50 cursor-pointer ${
                                    hasChildren
                                      ? 'border-amber-gold/40'
                                      : 'border-divider/50'
                                  }`}
                                  style={{
                                    width: `${FLOW_NODE_WIDTH}px`,
                                    minHeight: `${FLOW_NODE_HEIGHT}px`,
                                  }}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-semibold text-charcoal text-sm leading-tight flex-1">
                                      {node.name}
                                    </h3>
                                    {hasChildren && (
                                      <div className="flex-shrink-0 ml-2 flex items-center gap-1">
                                        <span className="text-xs text-amber-gold/70 font-medium">
                                          {childCount}
                                        </span>
                                        <svg
                                          className="w-4 h-4 text-amber-gold"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                          />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  {node.description && (
                                    <p className="text-xs text-mid-grey line-clamp-2 mb-2">
                                      {node.description}
                                    </p>
                                  )}
                                  {hasChildren && children.length > 0 && (
                                    <div className="mb-2 pt-2 border-t border-divider/30">
                                      <div className="text-xs text-mid-grey mb-1">Connects to:</div>
                                      <div className="flex flex-wrap gap-1">
                                        {children.slice(0, 3).map((child) => (
                                          <span
                                            key={child.id}
                                            className="px-1.5 py-0.5 bg-dark-surface rounded text-xs text-amber-gold/70"
                                          >
                                            {child.name}
                                          </span>
                                        ))}
                                        {children.length > 3 && (
                                          <span className="px-1.5 py-0.5 bg-dark-surface rounded text-xs text-mid-grey">
                                            +{children.length - 3}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  <div className="mt-2 pt-2 border-t border-divider/30">
                                    <div className="flex items-center gap-2 text-xs text-mid-grey">
                                      <span className="px-1.5 py-0.5 bg-dark-surface rounded text-amber-gold/70 font-medium">
                                        L{level}
                                      </span>
                                      {hasChildren && (
                                        <span className="px-1.5 py-0.5 bg-dark-surface rounded text-amber-gold/70 font-medium">
                                          Parent
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </li>
                    ))}
                </ul>
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


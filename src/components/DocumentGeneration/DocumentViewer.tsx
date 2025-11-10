import { useState } from 'react'
import MarkdownRenderer from './MarkdownRenderer'

interface DocumentViewerProps {
  type: string
  name: string
  content: string
  onExport: () => void
}

const DocumentViewer = ({ type, name, content, onExport }: DocumentViewerProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'PRD':
        return {
          gradient: 'from-blue-500/10 via-blue-600/5 to-transparent',
          accent: 'text-blue-400',
          accentBg: 'bg-blue-500/10',
          accentBorder: 'border-blue-500/30',
          iconBg: 'bg-blue-500/15',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        }
      case 'Design Prompt':
        return {
          gradient: 'from-purple-500/10 via-purple-600/5 to-transparent',
          accent: 'text-purple-400',
          accentBg: 'bg-purple-500/10',
          accentBorder: 'border-purple-500/30',
          iconBg: 'bg-purple-500/15',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          )
        }
      case 'User Stories':
        return {
          gradient: 'from-emerald-500/10 via-emerald-600/5 to-transparent',
          accent: 'text-emerald-400',
          accentBg: 'bg-emerald-500/10',
          accentBorder: 'border-emerald-500/30',
          iconBg: 'bg-emerald-500/15',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        }
      case 'Specs':
        return {
          gradient: 'from-amber-500/10 via-amber-600/5 to-transparent',
          accent: 'text-amber-400',
          accentBg: 'bg-amber-500/10',
          accentBorder: 'border-amber-500/30',
          iconBg: 'bg-amber-500/15',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          )
        }
      default:
        return {
          gradient: 'from-amber-gold/10 via-amber-gold/5 to-transparent',
          accent: 'text-amber-gold',
          accentBg: 'bg-amber-gold/10',
          accentBorder: 'border-amber-gold/30',
          iconBg: 'bg-amber-gold/15',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        }
    }
  }

  const config = getTypeConfig(type)

  return (
    <div className="group relative bg-dark-card border border-divider/30 rounded-xl overflow-hidden hover:border-divider/60 transition-all duration-300 hover:shadow-xl hover:shadow-black/20">
      {/* Gradient accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient}`}></div>
      
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-br from-dark-surface/50 to-dark-card/30 border-b border-divider/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className={`${config.iconBg} ${config.accentBorder} border rounded-xl p-2.5 flex-shrink-0 ${config.accent} transition-transform group-hover:scale-110`}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg ${config.accentBg} ${config.accentBorder} border ${config.accent} backdrop-blur-sm`}>
                  {type}
                </span>
              </div>
            </div>
            <h3 className="text-xl font-heading font-bold text-charcoal leading-tight">{name}</h3>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-4 py-2 text-sm text-mid-grey hover:text-charcoal hover:bg-dark-surface/70 rounded-lg transition-all font-medium border border-divider/40 hover:border-divider/60 backdrop-blur-sm"
            >
              {isExpanded ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Collapse
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Expand
                </span>
              )}
            </button>
            <button 
              onClick={onExport} 
              className="px-4 py-2 text-sm bg-amber-gold hover:bg-amber-gold/90 text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-md hover:shadow-amber-gold/20 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className={`relative transition-all duration-500 ease-out ${isExpanded ? 'max-h-[800px]' : 'max-h-[400px]'}`}>
        <div className="p-6 overflow-y-auto overflow-x-hidden h-full scrollbar-thin scrollbar-thumb-divider/50 scrollbar-track-transparent" style={{ maxHeight: isExpanded ? '800px' : '400px' }}>
          <MarkdownRenderer content={content} />
        </div>
        
        {/* Fade gradient at bottom when collapsed */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-dark-card via-dark-card/80 to-transparent pointer-events-none"></div>
        )}
      </div>
    </div>
  )
}

export default DocumentViewer

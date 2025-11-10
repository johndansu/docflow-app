import { useState } from 'react'

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
          bg: 'bg-blue-900/20',
          text: 'text-blue-400',
          border: 'border-blue-600',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        }
      case 'Design Prompt':
        return {
          bg: 'bg-purple-900/20',
          text: 'text-purple-400',
          border: 'border-purple-600',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          )
        }
      case 'User Stories':
        return {
          bg: 'bg-green-900/20',
          text: 'text-green-400',
          border: 'border-green-600',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        }
      default:
        return {
          bg: 'bg-amber-gold/10',
          text: 'text-amber-gold',
          border: 'border-amber-gold/20',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        }
    }
  }

  const config = getTypeConfig(type)

  return (
    <div className="bg-dark-card/50 hover:bg-dark-card rounded-lg shadow-sm border border-divider/50 hover:border-divider overflow-hidden hover:shadow-md transition-all duration-200 group">
      <div className={`px-5 py-4 border-b border-divider/50 bg-gradient-to-r ${config.bg} to-transparent`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className={`w-10 h-10 ${config.bg} ${config.border} border rounded-lg flex items-center justify-center`}>
                {config.icon}
              </div>
              <div>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${config.border} ${config.bg} ${config.text} inline-block`}>
                  {type}
                </span>
              </div>
            </div>
            <h3 className="text-lg font-heading font-semibold text-charcoal">{name}</h3>
          </div>
          <div className="flex gap-3 ml-6">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3.5 py-1.5 text-sm text-charcoal hover:bg-dark-surface rounded-md transition-all font-medium border border-divider/50 hover:border-amber-gold/50 focus:outline-none focus:ring-2 focus:ring-amber-gold/50"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
            <button 
              onClick={onExport} 
              className="px-3.5 py-1.5 text-sm bg-amber-gold hover:bg-amber-gold/90 text-white rounded-md font-medium hover:shadow-md transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-gold/50"
            >
              Export
            </button>
          </div>
        </div>
      </div>
      <div className={`p-5 overflow-y-auto transition-all duration-300 ${isExpanded ? 'max-h-[800px]' : 'max-h-[400px]'}`}>
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-body text-base text-charcoal leading-relaxed font-normal">{content}</pre>
        </div>
      </div>
    </div>
  )
}

export default DocumentViewer

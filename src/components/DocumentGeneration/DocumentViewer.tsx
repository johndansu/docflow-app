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
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          icon: '📋'
        }
      case 'Design Prompt':
        return {
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
          icon: '🎨'
        }
      case 'User Stories':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          icon: '👥'
        }
      default:
        return {
          bg: 'bg-amber-gold/10',
          text: 'text-amber-gold',
          border: 'border-amber-gold/20',
          icon: '📄'
        }
    }
  }

  const config = getTypeConfig(type)

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-divider overflow-hidden hover:shadow-xl transition-all duration-300 group">
      <div className={`px-8 py-6 border-b border-divider bg-gradient-to-r ${config.bg} to-transparent`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 ${config.bg} ${config.border} border-2 rounded-xl flex items-center justify-center text-2xl`}>
                {config.icon}
              </div>
              <div>
                <span className={`px-4 py-1.5 text-xs font-bold rounded-lg border-2 ${config.border} ${config.bg} ${config.text} inline-block`}>
                  {type}
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-heading font-bold text-charcoal">{name}</h3>
          </div>
          <div className="flex gap-3 ml-6">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-5 py-2.5 text-sm text-charcoal hover:bg-white/80 rounded-xl transition-all font-medium border border-divider hover:border-amber-gold"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
            <button 
              onClick={onExport} 
              className="px-5 py-2.5 text-sm bg-gradient-to-r from-amber-gold to-yellow-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Export
            </button>
          </div>
        </div>
      </div>
      <div className={`p-8 overflow-y-auto transition-all duration-500 ${isExpanded ? 'max-h-[800px]' : 'max-h-[400px]'}`}>
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-body text-base text-charcoal leading-relaxed font-normal">{content}</pre>
        </div>
      </div>
    </div>
  )
}

export default DocumentViewer

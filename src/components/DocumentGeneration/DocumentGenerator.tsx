import { useState, useRef, useEffect } from 'react'
import ExportModal from '../Export/ExportModal'

type DocumentType = 'PRD' | 'Design Prompt' | 'User Stories' | 'Specs'

interface DocumentGeneratorProps {
  onClose: () => void
  isStandalone?: boolean
}

const DocumentGenerator = ({ onClose, isStandalone = false }: DocumentGeneratorProps) => {
  const [documentType, setDocumentType] = useState<DocumentType | null>(null)
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [projectName, setProjectName] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const handleGenerate = async () => {
    if (!input.trim() || !documentType) return

    setIsGenerating(true)
    const lines = input.split('\n').filter(l => l.trim())
    const name = lines[0] || 'Untitled Project'
    setProjectName(name)
    
    setTimeout(() => {
      const mockContent = generateMockContent(documentType, name, input)
      setGeneratedContent(mockContent)
      setIsGenerating(false)
    }, 2000)
  }

  const generateMockContent = (type: DocumentType, name: string, desc: string): string => {
    const templates: Record<DocumentType, string> = {
      'PRD': `# Product Requirements Document: ${name}

## 1. Overview
${desc}

## 2. Problem Statement
[AI-generated problem statement based on your description]

## 3. Objectives
- Objective 1
- Objective 2
- Objective 3

## 4. Target Users
- Primary users
- Secondary users

## 5. Key Features
- Feature 1
- Feature 2
- Feature 3

## 6. User Flow
1. Step 1
2. Step 2
3. Step 3

## 7. Success Metrics
- Metric 1
- Metric 2

## 8. Technical Requirements
- Frontend: [To be defined]
- Backend: [To be defined]
- Database: [To be defined]`,
      'Design Prompt': `# Design Brief: ${name}

## Project Overview
${desc}

## Visual Direction
- Tone: [AI-generated tone]
- Color Palette: [AI-generated palette]
- Typography: [AI-generated typography]

## Layout Structure
- Header: [Description]
- Main Content: [Description]
- Footer: [Description]

## User Experience Notes
- Key interaction points
- Accessibility considerations
- Responsive breakpoints`,
      'User Stories': `# User Stories: ${name}

## Project Overview
${desc}

## User Stories

### As a [user type], I want to [action] so that [benefit]
- Acceptance criteria 1
- Acceptance criteria 2
- Acceptance criteria 3

### As a [user type], I want to [action] so that [benefit]
- Acceptance criteria 1
- Acceptance criteria 2

## Priority
- High Priority
- Medium Priority
- Low Priority`,
      'Specs': `# Technical Specifications: ${name}

## Overview
${desc}

## Architecture
- System architecture overview
- Component breakdown

## API Specifications
- Endpoint 1
- Endpoint 2

## Database Schema
- Table 1
- Table 2

## Performance Requirements
- Response time
- Throughput
- Scalability`
    }
    return templates[type]
  }

  if (generatedContent) {
    if (isStandalone) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="bg-dark-card rounded-xl shadow-lg border border-divider overflow-hidden">
            <div className="px-8 py-6 border-b border-divider bg-dark-surface/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-mid-grey mb-1">{documentType}</div>
                  <h2 className="text-2xl font-heading font-bold text-charcoal">{projectName}</h2>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => {setGeneratedContent(null); setInput(''); setDocumentType(null)}} className="px-4 py-2 text-sm text-charcoal hover:bg-dark-surface rounded-lg transition-colors">
                    New
                  </button>
                  <button onClick={() => setShowExport(true)} className="btn-primary">
                    Export
                  </button>
                </div>
              </div>
            </div>
            <div className="p-12 overflow-y-auto max-h-[calc(100vh-300px)]">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-body text-base text-charcoal leading-relaxed font-normal">{generatedContent}</pre>
              </div>
            </div>
          </div>
          {showExport && (
            <ExportModal
              content={generatedContent}
              filename={projectName}
              onClose={() => setShowExport(false)}
            />
          )}
        </div>
      )
    }
    
    return (
      <>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-divider/50">
            <div className="p-5 border-b border-divider/50 flex items-center justify-between bg-dark-surface/30">
              <h2 className="text-2xl font-heading font-bold text-charcoal">{documentType}: {projectName}</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowExport(true)} className="btn-primary">
                  Export
                </button>
                <button onClick={() => setGeneratedContent(null)} className="btn-secondary">
                  Edit
                </button>
                <button onClick={onClose} className="btn-secondary">
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap font-body text-sm text-charcoal">{generatedContent}</pre>
            </div>
          </div>
        </div>
        {showExport && (
          <ExportModal
            content={generatedContent}
            filename={projectName}
            onClose={() => setShowExport(false)}
          />
        )}
      </>
    )
  }

  if (isStandalone) {
    return (
      <div className="max-w-4xl mx-auto">
        {!documentType ? (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {(['PRD', 'Design Prompt', 'User Stories', 'Specs'] as DocumentType[]).map((type) => (
              <button
                key={type}
                onClick={() => setDocumentType(type)}
                className="group p-5 bg-dark-card/50 hover:bg-dark-card rounded-lg border border-divider/50 hover:border-amber-gold/50 transition-all text-left hover:shadow-md"
              >
                <div className="mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-amber-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-lg font-semibold text-charcoal mb-1">{type}</div>
                <div className="text-sm text-mid-grey">Generate structured {type.toLowerCase()}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-dark-card rounded-lg shadow-lg border border-divider/50 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-divider/50 flex items-center gap-2.5 bg-dark-surface/30">
              <button
                onClick={() => setDocumentType(null)}
                className="text-mid-grey hover:text-charcoal transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-amber-gold">{documentType}</span>
            </div>
            
            <div className="p-8">
              <div className="mb-6">
                <div className="text-sm text-mid-grey mb-2">Describe your project</div>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleGenerate()
                    }
                  }}
                  className="w-full min-h-[300px] px-0 py-4 border-0 focus:outline-none resize-none text-sm text-charcoal placeholder:text-mid-grey/50 font-body leading-relaxed bg-transparent"
                  placeholder="Start typing... Describe your project idea, goals, users, features, or anything else that comes to mind.&#10;&#10;Press Cmd/Ctrl + Enter to generate"
                  autoFocus
                />
              </div>
              
              <div className="flex items-center justify-between pt-6 border-t border-divider">
                <div className="text-sm text-mid-grey">
                  {input.length > 0 && `${input.length} characters`}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !input.trim()}
                  className="px-8 py-3 bg-amber-gold text-white rounded-lg font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    'Generate →'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

export default DocumentGenerator

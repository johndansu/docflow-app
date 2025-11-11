import { useState, useRef, useEffect } from 'react'
import ExportModal from '../Export/ExportModal'
import MarkdownRenderer from './MarkdownRenderer'
import { storage } from '../../utils/storage'
import { extractInfo, generatePRD, generateDesignPrompt, generateUserStories, generateSpecs } from '../../utils/contentGenerator'

type DocumentType = 'PRD' | 'Design Prompt' | 'User Stories' | 'Specs'

interface DocumentGeneratorProps {
  onClose: () => void
  isStandalone?: boolean
  onProjectCreated?: () => void
}

const DocumentGenerator = ({ onClose, isStandalone = false, onProjectCreated }: DocumentGeneratorProps) => {
  const [documentType, setDocumentType] = useState<DocumentType | null>(null)
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const handleGenerate = async () => {
    if (!input.trim() || !documentType) return

    setIsGenerating(true)
    const info = extractInfo(input)
    setProjectName(info.projectName)
    
    try {
      let content = ''
      switch (documentType) {
        case 'PRD':
          content = await generatePRD(info, input)
          break
        case 'Design Prompt':
          content = await generateDesignPrompt(info, input)
          break
        case 'User Stories':
          content = await generateUserStories(info, input)
          break
        case 'Specs':
          content = await generateSpecs(info, input)
          break
      }
      setGeneratedContent(content)
    } catch (error) {
      console.error('Generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to generate content: ${errorMessage}\n\nCheck the browser console for details.`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveProject = async () => {
    if (!generatedContent || !documentType || !projectName) return
    
    setIsSaving(true)
    try {
      await storage.save({
        title: projectName,
        type: documentType,
        description: input.substring(0, 200) || `Generated ${documentType} document`,
        content: generatedContent,
      })
      
      if (onProjectCreated) {
        onProjectCreated()
      }
      
      setIsSaving(false)
      onClose()
    } catch (error) {
      console.error('Error saving project:', error)
      setIsSaving(false)
    }
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
              <MarkdownRenderer content={generatedContent} />
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
              <h2 className="text-lg font-heading font-semibold text-charcoal">{documentType}: {projectName}</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveProject}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-amber-gold hover:bg-amber-gold/90 text-white rounded-md text-sm font-medium transition-all shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Project'}
                </button>
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
            <div className="flex-1 overflow-y-auto p-8">
              <MarkdownRenderer content={generatedContent} />
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

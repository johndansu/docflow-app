import { useState, useRef, useEffect } from 'react'
import DocumentViewer from '../DocumentGeneration/DocumentViewer'
import SiteFlowVisualizer from '../SiteFlow/SiteFlowVisualizer'
import ExportModal from '../Export/ExportModal'

type View = 'input' | 'generating' | 'results'

const MainWorkspace = () => {
  const [view, setView] = useState<View>('input')
  const [appDescription, setAppDescription] = useState('')
  const [generatedDocs, setGeneratedDocs] = useState<{ type: string; content: string; name: string }[]>([])
  const [showExport, setShowExport] = useState(false)
  const [exportContent, setExportContent] = useState<{ content: string; filename: string } | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generatingStep, setGeneratingStep] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current && view === 'input') {
      textareaRef.current.focus()
    }
  }, [view])

  const handleGenerate = async () => {
    if (!appDescription.trim()) return

    setView('generating')
    setGenerationProgress(0)
    
    const steps = [
      'Analyzing your description...',
      'Generating PRD...',
      'Creating design brief...',
      'Writing user stories...',
      'Mapping site flow...',
      'Finalizing documentation...'
    ]
    
    let stepIndex = 0
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setGeneratingStep(steps[stepIndex])
        stepIndex++
      }
    }, 400)
    
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return 95
        }
        return prev + Math.random() * 8 + 2
      })
    }, 150)
    
    setTimeout(() => {
      const projectName = appDescription.split('\n')[0].substring(0, 50) || 'My Project'
      
      const docs = [
        {
          type: 'PRD',
          name: projectName,
          content: `# Product Requirements Document: ${projectName}

## 1. Overview
${appDescription}

## 2. Problem Statement
Based on your description, this product addresses the need for [problem statement extracted from your description].

## 3. Objectives
- Deliver a solution that meets user needs efficiently
- Provide an intuitive and engaging user experience
- Ensure scalability and maintainability

## 4. Target Users
- Primary users: [Based on your description]
- Secondary users: [Based on your description]

## 5. Key Features
- Core feature 1: [Extracted from description]
- Core feature 2: [Extracted from description]
- Core feature 3: [Extracted from description]

## 6. User Flow
1. User lands on homepage
2. [Flow step based on description]
3. [Flow step based on description]
4. [Flow step based on description]

## 7. Success Metrics
- User engagement rate
- Feature adoption rate
- User satisfaction score

## 8. Technical Requirements
- Frontend: Modern web framework
- Backend: Scalable API architecture
- Database: [To be defined]`
        },
        {
          type: 'Design Prompt',
          name: projectName,
          content: `# Design Prompt: ${projectName}

## Project Description
${appDescription}

## Design Requirements

### Visual Style
Create a design that is:
- Modern and professional
- Clean and intuitive
- Accessible and user-friendly
- Visually appealing without being overwhelming

### Key Design Elements to Consider
- Color scheme that reflects the brand and purpose
- Typography that ensures readability and hierarchy
- Layout that guides users naturally through the interface
- Interactive elements that provide clear feedback
- Responsive design that works across all devices

### User Experience Goals
- Make it easy for users to understand and navigate
- Ensure key actions are clear and accessible
- Create a sense of trust and professionalism
- Minimize cognitive load
- Provide visual feedback for user interactions

### Specific Design Challenges
Based on the project description, consider:
- How to present [main features from description] clearly
- How to guide users through [key user flows]
- How to make [complex features] feel simple and approachable
- How to create visual hierarchy that emphasizes what matters most

### Design Deliverables
- Wireframes for key screens
- High-fidelity mockups
- Design system/component library
- Interactive prototypes
- Style guide with colors, typography, and spacing

### Success Criteria
The design should:
- Be intuitive for first-time users
- Support the core functionality effectively
- Maintain consistency across all screens
- Meet accessibility standards (WCAG 2.1 AA)
- Be implementable within technical constraints`
        },
        {
          type: 'User Stories',
          name: projectName,
          content: `# User Stories: ${projectName}

## Project Overview
${appDescription}

## User Stories

### As a user, I want to [primary action] so that [benefit]
- Acceptance criteria: Clear and actionable
- Acceptance criteria: Measurable outcome
- Acceptance criteria: User-focused

### As a user, I want to [secondary action] so that [benefit]
- Acceptance criteria: Intuitive flow
- Acceptance criteria: Fast response time

### As a user, I want to [tertiary action] so that [benefit]
- Acceptance criteria: Seamless experience
- Acceptance criteria: Error handling

## Priority
- High: Core functionality
- Medium: Enhanced features
- Low: Nice-to-have features`
        }
      ]
      
      clearInterval(progressInterval)
      clearInterval(stepInterval)
      setGenerationProgress(100)
      setGeneratingStep('Complete!')
      
      setTimeout(() => {
        setGeneratedDocs(docs)
        setView('results')
        setGenerationProgress(0)
        setGeneratingStep('')
      }, 500)
    }, 3000)
  }

  const handleExport = (content: string, filename: string) => {
    setExportContent({ content, filename })
    setShowExport(true)
  }

  if (view === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center px-8 py-32">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-12">
            <div className="relative w-40 h-40 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-amber-gold/10 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-amber-gold rounded-full border-t-transparent animate-spin"
                style={{ animationDuration: '1.2s' }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-gold/20 to-yellow-500/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-10 h-10 text-amber-gold animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <h2 className="text-5xl font-heading font-bold text-charcoal mb-4">
              Creating your documentation
            </h2>
            <p className="text-xl text-mid-grey mb-2 font-medium">
              {generatingStep || 'Starting...'}
            </p>
            <div className="text-sm text-mid-grey">
              This usually takes a few seconds
            </div>
          </div>
          <div className="w-full max-w-lg mx-auto">
            <div className="relative h-4 bg-divider rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-amber-gold via-yellow-500 to-amber-gold transition-all duration-300 ease-out shadow-lg relative"
                style={{ width: `${generationProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="text-2xl font-heading font-bold text-charcoal">
                {Math.round(generationProgress)}%
              </div>
              <div className="text-sm text-mid-grey">complete</div>
            </div>
            <div className="mt-8 grid grid-cols-4 gap-2 max-w-md mx-auto">
              {['PRD', 'Design', 'Stories', 'Flow'].map((doc, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    generationProgress > (idx + 1) * 25
                      ? 'bg-green-50 border-green-200'
                      : generationProgress > idx * 25
                      ? 'bg-amber-gold/10 border-amber-gold/30'
                      : 'bg-divider border-divider'
                  }`}
                >
                  <div className={`text-xs font-semibold ${
                    generationProgress > (idx + 1) * 25
                      ? 'text-green-600'
                      : generationProgress > idx * 25
                      ? 'text-amber-gold'
                      : 'text-mid-grey'
                  }`}>
                    {doc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'results') {
    return (
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="mb-16">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="inline-block px-4 py-2 bg-amber-gold/10 text-amber-gold rounded-full text-sm font-semibold mb-4">
                ✨ Generated Successfully
              </div>
              <h1 className="text-5xl font-heading font-bold text-charcoal mb-3">
                Your Documentation is Ready
              </h1>
              <p className="text-xl text-mid-grey">
                Everything you need to start building—exported and ready to share with your team
              </p>
            </div>
            <button
              onClick={() => {
                setView('input')
                setAppDescription('')
                setGeneratedDocs([])
              }}
              className="px-6 py-3 bg-white border-2 border-divider rounded-xl text-charcoal font-semibold hover:border-amber-gold hover:bg-amber-gold/5 transition-all shadow-sm hover:shadow-md"
            >
              Start New Project
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {generatedDocs.map((doc, idx) => (
            <div key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
              <DocumentViewer
                type={doc.type}
                name={doc.name}
                content={doc.content}
                onExport={() => handleExport(doc.content, `${doc.name}_${doc.type}`)}
              />
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-white to-light-neutral rounded-2xl shadow-xl border border-divider overflow-hidden">
          <div className="px-10 py-8 border-b border-divider bg-gradient-to-r from-amber-gold/10 via-amber-gold/5 to-transparent">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-gold/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-heading font-bold text-charcoal">Site Flow Visualization</h2>
                <p className="text-sm text-mid-grey mt-1">Automatically mapped from your description</p>
              </div>
            </div>
          </div>
          <div className="p-10">
            <SiteFlowVisualizer appDescription={appDescription} />
          </div>
        </div>

        {showExport && exportContent && (
          <ExportModal
            content={exportContent.content}
            filename={exportContent.filename}
            onClose={() => setShowExport(false)}
          />
        )}
      </div>
    )
  }

  return (
    <>
      {/* Hero Section */}
      <div className="min-h-[90vh] flex items-center justify-center px-8 py-20">
        <div className="max-w-5xl w-full">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-gold/10 text-amber-gold rounded-full text-sm font-semibold mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Used by 2,500+ indie creators</span>
          </div>
          <h1 className="text-7xl font-heading font-bold text-charcoal mb-6 leading-tight">
            Stop wasting hours on docs.
            <br />
            <span className="bg-gradient-to-r from-amber-gold to-yellow-500 bg-clip-text text-transparent">
              Ship faster instead.
            </span>
          </h1>
          <p className="text-2xl text-mid-grey max-w-3xl mx-auto leading-relaxed mb-8">
            Turn your app idea into production-ready documentation in seconds. Get PRDs, design briefs, user stories, and site flows—all generated instantly so you can focus on building.
          </p>
          <div className="flex items-center justify-center gap-4 mb-12">
            <button
              onClick={() => {
                textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setTimeout(() => textareaRef.current?.focus(), 500)
              }}
              className="px-8 py-4 bg-gradient-to-r from-amber-gold to-yellow-500 text-white rounded-xl font-bold hover:shadow-xl transition-all shadow-lg text-lg flex items-center gap-3 group"
            >
              <span>Try It Free</span>
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button className="px-8 py-4 bg-white border-2 border-divider text-charcoal rounded-xl font-semibold hover:border-amber-gold hover:bg-amber-gold/5 transition-all text-lg">
              See Examples
            </button>
          </div>
          <div className="flex items-center justify-center gap-8 text-sm text-mid-grey">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>10 free generations</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Export to PDF, DOCX, Markdown</span>
            </div>
          </div>
        </div>

        {/* Social Proof Section */}
        <div className="mb-12 bg-gradient-to-r from-amber-gold/5 via-white to-purple-50 rounded-2xl p-8 border border-divider">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-8 mb-6 flex-wrap">
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-charcoal mb-1">2,500+</div>
                <div className="text-sm text-mid-grey">Active Users</div>
              </div>
              <div className="w-px h-12 bg-divider"></div>
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-charcoal mb-1">50K+</div>
                <div className="text-sm text-mid-grey">Docs Generated</div>
              </div>
              <div className="w-px h-12 bg-divider"></div>
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-charcoal mb-1">4.9/5</div>
                <div className="text-sm text-mid-grey">User Rating</div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-mid-grey italic mb-4">"DocFlow saved me 15 hours on my last project. The PRD was investor-ready right out of the box."</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-8 bg-amber-gold/20 rounded-full"></div>
                <span className="text-sm font-semibold text-charcoal">Sarah Chen, Indie Founder</span>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-8 border border-divider hover:border-amber-gold/50 transition-all">
            <div className="w-12 h-12 bg-amber-gold/10 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-heading font-bold text-charcoal mb-2">Save 10+ Hours</h3>
            <p className="text-mid-grey">Skip the tedious documentation work. What takes days now takes seconds.</p>
          </div>
          <div className="bg-white rounded-2xl p-8 border border-divider hover:border-amber-gold/50 transition-all">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-heading font-bold text-charcoal mb-2">Production-Ready Docs</h3>
            <p className="text-mid-grey">Get investor-ready PRDs, designer-ready briefs, and developer-ready specs.</p>
          </div>
          <div className="bg-white rounded-2xl p-8 border border-divider hover:border-amber-gold/50 transition-all">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-xl font-heading font-bold text-charcoal mb-2">Visual Site Flow</h3>
            <p className="text-mid-grey">See how your pages connect before you build. Plan your architecture visually.</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-divider overflow-hidden">
          <div className="p-12">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-gold/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-charcoal">What are you building?</div>
                  <div className="text-xs text-mid-grey">Describe your app idea—we'll handle the rest</div>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={appDescription}
                onChange={(e) => setAppDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleGenerate()
                  }
                }}
                className="w-full min-h-[500px] px-6 py-8 border-2 border-divider rounded-2xl focus:outline-none focus:border-amber-gold resize-none text-lg text-charcoal placeholder:text-mid-grey/40 font-body leading-relaxed transition-all"
                placeholder="Example:&#10;&#10;I'm building a task management app for remote teams. It needs:&#10;- Real-time collaboration&#10;- Kanban boards with drag-and-drop&#10;- Team chat integration&#10;- Deadline reminders and notifications&#10;&#10;Target users are project managers and their teams who struggle with scattered communication across Slack, email, and Trello.&#10;&#10;The main problem it solves is keeping everyone aligned without context switching between tools..."
                autoFocus
              />
            </div>
            
            <div className="flex items-center justify-between pt-8 border-t-2 border-divider">
              <div className="flex items-center gap-6">
                {appDescription.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 bg-amber-gold/10 rounded-lg flex items-center justify-center">
                        <span className="text-amber-gold font-semibold">{appDescription.length}</span>
                      </div>
                      <span className="text-mid-grey">characters</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 font-semibold">{appDescription.split(/\s+/).filter(w => w.length > 0).length}</span>
                      </div>
                      <span className="text-mid-grey">words</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4">
                {appDescription.length > 0 && (
                  <button
                    onClick={() => setAppDescription('')}
                    className="px-5 py-3 text-sm text-mid-grey hover:text-charcoal transition-colors font-medium"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={!appDescription.trim()}
                  className="px-10 py-4 bg-gradient-to-r from-amber-gold to-yellow-500 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg flex items-center gap-3 group"
                >
                  <span>Generate Everything</span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-divider rounded-full text-sm text-mid-grey">
            <kbd className="px-2 py-1 bg-light-neutral border border-divider rounded text-xs font-mono">⌘</kbd>
            <span>+</span>
            <kbd className="px-2 py-1 bg-light-neutral border border-divider rounded text-xs font-mono">Enter</kbd>
            <span className="ml-2">to generate</span>
          </div>
        </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="features" className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-heading font-bold text-charcoal mb-4">How It Works</h2>
          <p className="text-xl text-mid-grey max-w-2xl mx-auto">Three simple steps to transform your idea into production-ready documentation</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-amber-gold rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
              1
            </div>
            <div className="bg-white rounded-2xl p-8 border border-divider h-full pt-12">
              <div className="w-16 h-16 bg-amber-gold/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-amber-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-2xl font-heading font-bold text-charcoal mb-3">Describe Your Idea</h3>
              <p className="text-mid-grey leading-relaxed">Simply type out your app concept, features, target users, and goals. No need to be perfect—just describe what you're building.</p>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-amber-gold rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
              2
            </div>
            <div className="bg-white rounded-2xl p-8 border border-divider h-full pt-12">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-heading font-bold text-charcoal mb-3">AI Generates Everything</h3>
              <p className="text-mid-grey leading-relaxed">Our AI analyzes your description and creates comprehensive PRDs, design briefs, user stories, and visual site flows in seconds.</p>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-amber-gold rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
              3
            </div>
            <div className="bg-white rounded-2xl p-8 border border-divider h-full pt-12">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-heading font-bold text-charcoal mb-3">Export & Share</h3>
              <p className="text-mid-grey leading-relaxed">Download your documentation in PDF, DOCX, or Markdown. Share with your team, investors, or designers—ready to use immediately.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Showcase */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-heading font-bold text-charcoal mb-4">Everything You Need</h2>
            <p className="text-xl text-mid-grey max-w-2xl mx-auto">Complete documentation suite for modern product teams</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-amber-gold/5 to-white rounded-2xl p-8 border border-divider">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-gold rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-charcoal mb-2">Product Requirements Docs</h3>
                  <p className="text-mid-grey mb-4">Comprehensive PRDs with problem statements, objectives, user flows, and success metrics—investor-ready format.</p>
                  <ul className="space-y-2 text-sm text-mid-grey">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Problem & solution mapping
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      User personas & flows
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Success metrics & KPIs
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-divider">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-charcoal mb-2">Design Briefs</h3>
                  <p className="text-mid-grey mb-4">Detailed design prompts with visual direction, color palettes, typography, and UX guidelines for your design team.</p>
                  <ul className="space-y-2 text-sm text-mid-grey">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Visual style guidelines
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Component specifications
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Responsive breakpoints
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-divider">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-charcoal mb-2">User Stories</h3>
                  <p className="text-mid-grey mb-4">Structured user stories with acceptance criteria, priorities, and epics—ready for your sprint planning.</p>
                  <ul className="space-y-2 text-sm text-mid-grey">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Acceptance criteria
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Priority ranking
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Epic organization
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-8 border border-divider">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-charcoal mb-2">Visual Site Flow</h3>
                  <p className="text-mid-grey mb-4">Interactive node-based visualization showing how your pages connect—plan your architecture before coding.</p>
                  <ul className="space-y-2 text-sm text-mid-grey">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Drag-and-drop nodes
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Page relationships
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Export as image
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Us / Comparison */}
      <div className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-heading font-bold text-charcoal mb-4">Why DocFlow?</h2>
          <p className="text-xl text-mid-grey max-w-2xl mx-auto">Stop switching between ChatGPT, templates, and design tools</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-heading font-bold text-charcoal mb-1">Manual Documentation</h3>
                  <p className="text-mid-grey">Hours spent copying templates, formatting docs, and organizing information across multiple tools.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-heading font-bold text-charcoal mb-1">DocFlow</h3>
                  <p className="text-mid-grey">One description generates everything you need in seconds. All formats, all ready, all at once.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-heading font-bold text-charcoal mb-1">Scattered Tools</h3>
                  <p className="text-mid-grey">Jumping between ChatGPT, Notion, Figma, and docs—losing context and wasting time.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-heading font-bold text-charcoal mb-1">One Unified Platform</h3>
                  <p className="text-mid-grey">Everything in one place—PRDs, design briefs, user stories, and site flows. No context switching.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-gold/10 via-white to-purple-50 rounded-3xl p-12 border border-divider">
            <div className="text-center">
              <div className="text-6xl font-heading font-bold text-charcoal mb-2">10x</div>
              <div className="text-2xl font-heading font-semibold text-charcoal mb-4">Faster</div>
              <p className="text-mid-grey mb-8">Generate complete documentation in seconds instead of hours</p>
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                  <span className="text-charcoal font-medium">Time Saved</span>
                  <span className="text-amber-gold font-bold">15+ hours/week</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                  <span className="text-charcoal font-medium">Documents Generated</span>
                  <span className="text-amber-gold font-bold">4 at once</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                  <span className="text-charcoal font-medium">Export Formats</span>
                  <span className="text-amber-gold font-bold">PDF, DOCX, MD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-heading font-bold text-charcoal mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-mid-grey max-w-2xl mx-auto">Start free, upgrade when you need more</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Tier */}
          <div className="bg-white rounded-2xl p-8 border-2 border-divider">
            <div className="mb-6">
              <h3 className="text-2xl font-heading font-bold text-charcoal mb-2">Free</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-heading font-bold text-charcoal">$0</span>
                <span className="text-mid-grey">/forever</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-mid-grey">10 document generations</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-mid-grey">All document types</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-mid-grey">PDF, DOCX, Markdown export</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-mid-grey">Site flow visualization</span>
              </li>
            </ul>
            <button className="w-full px-6 py-3 bg-white border-2 border-divider text-charcoal rounded-xl font-semibold hover:border-amber-gold hover:bg-amber-gold/5 transition-all">
              Get Started
            </button>
          </div>

          {/* Pro Tier */}
          <div className="bg-gradient-to-br from-amber-gold to-yellow-500 rounded-2xl p-8 border-2 border-amber-gold relative shadow-xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-charcoal text-white text-xs font-bold rounded-full">
              MOST POPULAR
            </div>
            <div className="mb-6">
              <h3 className="text-2xl font-heading font-bold text-white mb-2">Pro</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-heading font-bold text-white">$29</span>
                <span className="text-white/80">/month</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white/90">Unlimited generations</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white/90">Priority AI processing</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white/90">Advanced customization</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white/90">Team collaboration</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white/90">Email support</span>
              </li>
            </ul>
            <button className="w-full px-6 py-3 bg-white text-amber-gold rounded-xl font-bold hover:shadow-xl transition-all">
              Start Pro Trial
            </button>
          </div>

          {/* Team Tier */}
          <div className="bg-white rounded-2xl p-8 border-2 border-divider">
            <div className="mb-6">
              <h3 className="text-2xl font-heading font-bold text-charcoal mb-2">Team</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-heading font-bold text-charcoal">$99</span>
                <span className="text-mid-grey">/month</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-mid-grey">Everything in Pro</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-mid-grey">Up to 10 team members</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-mid-grey">Shared workspace</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-mid-grey">API access</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-mid-grey">Priority support</span>
              </li>
            </ul>
            <button className="w-full px-6 py-3 bg-white border-2 border-divider text-charcoal rounded-xl font-semibold hover:border-amber-gold hover:bg-amber-gold/5 transition-all">
              Contact Sales
            </button>
          </div>
        </div>
        <div className="text-center mt-12">
          <p className="text-mid-grey">All plans include a 14-day money-back guarantee. No questions asked.</p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-amber-gold to-yellow-500 py-20">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-5xl font-heading font-bold text-white mb-6">Ready to Ship Faster?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">Join 2,500+ creators who are building better products with DocFlow</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' })
                setTimeout(() => textareaRef.current?.focus(), 500)
              }}
              className="px-8 py-4 bg-white text-amber-gold rounded-xl font-bold hover:shadow-xl transition-all text-lg"
            >
              Start Free Now
            </button>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-semibold hover:bg-white/20 transition-all text-lg">
              See Pricing
            </button>
          </div>
          <p className="text-white/80 text-sm mt-6">No credit card required • 10 free generations • Cancel anytime</p>
        </div>
      </div>
    </>
  )
}

export default MainWorkspace

import { useState } from 'react'
import DocumentGenerator from '../DocumentGeneration/DocumentGenerator'

interface Project {
  id: string
  title: string
  type: 'PRD' | 'Design Prompt' | 'User Stories' | 'Specs'
  lastEdited: string
  description: string
}

const Dashboard = () => {
  const [showGenerator, setShowGenerator] = useState(false)
  const [projects] = useState<Project[]>([
    {
      id: '1',
      title: 'E-commerce Platform',
      type: 'PRD',
      lastEdited: '2 hours ago',
      description: 'Complete product requirements document for a modern e-commerce platform with AI-powered recommendations',
    },
    {
      id: '2',
      title: 'Mobile App Design',
      type: 'Design Prompt',
      lastEdited: '1 day ago',
      description: 'Design system and UI components for a mobile-first social networking application',
    },
    {
      id: '3',
      title: 'User Onboarding Flow',
      type: 'User Stories',
      lastEdited: '3 days ago',
      description: 'User stories and acceptance criteria for seamless onboarding experience',
    },
  ])

  return (
    <div className="max-w-5xl mx-auto w-full py-8 px-6">
      {projects.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-dark-card border border-divider flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-2xl font-heading font-semibold text-charcoal mb-2">Start creating</h1>
          <p className="text-sm text-mid-grey mb-6 max-w-sm mx-auto leading-relaxed">
            Generate structured documentation and visualize your project flow in one place
          </p>
          <button 
            onClick={() => setShowGenerator(true)} 
            className="px-5 py-2.5 bg-amber-gold hover:bg-amber-gold/90 text-white rounded-md text-sm font-medium transition-all shadow-md hover:shadow-lg"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-heading font-semibold text-charcoal mb-1">Projects</h1>
              <p className="text-xs text-mid-grey">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</p>
            </div>
            <button 
              onClick={() => setShowGenerator(true)} 
              className="px-3.5 py-2 bg-amber-gold hover:bg-amber-gold/90 text-white rounded-md text-sm font-medium transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-gold/50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New project
            </button>
          </div>

          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group p-4 rounded-lg bg-dark-card/50 hover:bg-dark-card border border-divider/50 hover:border-divider transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <h3 className="text-sm font-heading font-semibold text-charcoal group-hover:text-amber-gold transition-colors truncate">
                        {project.title}
                      </h3>
                      <span className="px-2 py-0.5 bg-amber-gold/10 text-amber-gold text-xs font-medium rounded flex-shrink-0">
                        {project.type}
                      </span>
                    </div>
                    <p className="text-sm text-mid-grey mb-2.5 line-clamp-2 leading-relaxed">{project.description}</p>
                    <div className="flex items-center gap-3 text-xs text-mid-grey">
                      <span>Updated {project.lastEdited}</span>
                    </div>
                  </div>
                  <button className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity text-amber-gold p-1 hover:bg-dark-surface rounded-md">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showGenerator && <DocumentGenerator onClose={() => setShowGenerator(false)} />}
    </div>
  )
}

export default Dashboard

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
    <div className="max-w-4xl mx-auto">
      {projects.length === 0 ? (
        <div className="text-center py-32">
          <h1 className="text-4xl font-heading font-bold text-charcoal mb-4">Start creating</h1>
          <p className="text-lg text-mid-grey mb-8 max-w-md mx-auto">
            Generate structured documentation and visualize your project flow in one place
          </p>
          <button onClick={() => setShowGenerator(true)} className="btn-primary text-lg px-8 py-3">
            Create your first project
          </button>
        </div>
      ) : (
        <>
          <div className="mb-12">
            <h1 className="text-4xl font-heading font-bold text-charcoal mb-3">Projects</h1>
            <button 
              onClick={() => setShowGenerator(true)} 
              className="text-amber-gold hover:underline font-medium"
            >
              + New project
            </button>
          </div>

          <div className="space-y-1">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group p-6 rounded-lg hover:bg-white transition-all cursor-pointer border border-transparent hover:border-divider"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-xl font-heading font-semibold text-charcoal mb-1 group-hover:text-amber-gold transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-mid-grey text-sm mb-3">{project.description}</p>
                    <div className="flex items-center gap-4 text-xs text-mid-grey">
                      <span className="px-2 py-1 bg-amber-gold/10 text-amber-gold rounded">
                        {project.type}
                      </span>
                      <span>Updated {project.lastEdited}</span>
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-gold">
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

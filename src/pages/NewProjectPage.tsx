import { useNavigate } from 'react-router-dom'
import MainWorkspace from '../components/Workspace/MainWorkspace'

const NewProjectPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-dark-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 hover:bg-dark-card/50 rounded-lg transition-colors duration-200"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-light text-white mb-1">New Project</h1>
            <p className="text-mid-grey text-sm">Create documentation for your project</p>
          </div>
        </div>
        <MainWorkspace />
      </div>
    </div>
  )
}

export default NewProjectPage


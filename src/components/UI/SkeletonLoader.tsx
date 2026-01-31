interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'text' | 'avatar' | 'button'
  count?: number
  className?: string
}

const SkeletonLoader = ({ 
  type = 'card', 
  count = 1, 
  className = '' 
}: SkeletonLoaderProps) => {
  const baseClass = "animate-pulse bg-gradient-to-r from-dark-surface/50 to-dark-surface/30 rounded"
  
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`${baseClass} p-6 border border-divider/30 rounded-xl`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-dark-surface/40 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-dark-surface/40 rounded w-3/4 mb-2" />
                <div className="h-3 bg-dark-surface/30 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-dark-surface/30 rounded" />
              <div className="h-3 bg-dark-surface/30 rounded w-5/6" />
            </div>
          </div>
        )
      
      case 'list':
        return (
          <div className={`${baseClass} p-4 border border-divider/30 rounded-lg`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-dark-surface/40 rounded" />
              <div className="flex-1">
                <div className="h-4 bg-dark-surface/40 rounded w-2/3 mb-2" />
                <div className="h-3 bg-dark-surface/30 rounded w-1/3" />
              </div>
            </div>
          </div>
        )
      
      case 'text':
        return (
          <div className="space-y-2">
            <div className={`${baseClass} h-4 w-full`} />
            <div className={`${baseClass} h-4 w-5/6`} />
            <div className={`${baseClass} h-4 w-4/6`} />
          </div>
        )
      
      case 'avatar':
        return (
          <div className={`${baseClass} w-12 h-12 rounded-full`} />
        )
      
      case 'button':
        return (
          <div className={`${baseClass} h-10 w-32 rounded-lg`} />
        )
      
      default:
        return <div className={`${baseClass} h-4 w-full`} />
    }
  }

  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={count > 1 ? 'mb-4' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  )
}

export default SkeletonLoader

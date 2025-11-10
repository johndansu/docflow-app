interface RightPaneProps {
  onClose: () => void
}

const RightPane = ({ onClose }: RightPaneProps) => {
  return (
    <aside className="w-80 bg-dark-card border-l border-divider h-[calc(100vh-4rem)] fixed right-0 top-16 overflow-y-auto z-40">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg">Context</h3>
          <button
            onClick={onClose}
            className="text-mid-grey hover:text-charcoal transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-mid-grey mb-2">Version Info</h4>
            <p className="text-sm text-charcoal">v1.0.0</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-mid-grey mb-2">Document Notes</h4>
            <textarea
              className="w-full p-2 border border-divider rounded-md text-sm resize-none bg-dark-surface text-charcoal"
              rows={4}
              placeholder="Add notes here..."
            />
          </div>
        </div>
      </div>
    </aside>
  )
}

export default RightPane


import { useState } from 'react'
import { exportToPDF, exportToDOCX, exportToMarkdown } from '../../utils/exportUtils'

interface ExportModalProps {
  content: string
  filename: string
  onClose: () => void
}

const ExportModal = ({ content, filename, onClose }: ExportModalProps) => {
  const [exportFormat, setExportFormat] = useState<'PDF' | 'DOCX' | 'Markdown'>('PDF')
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      switch (exportFormat) {
        case 'PDF':
          await exportToPDF(content, filename)
          break
        case 'DOCX':
          await exportToDOCX(content, filename)
          break
        case 'Markdown':
          exportToMarkdown(content, filename)
          break
      }
      setTimeout(() => {
        setIsExporting(false)
        onClose()
      }, 500)
    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
      alert('Export failed. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-heading font-bold text-charcoal">Export Document</h2>
          <button onClick={onClose} className="text-mid-grey hover:text-charcoal">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['PDF', 'DOCX', 'Markdown'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`px-4 py-3 rounded-md border transition-all ${
                    exportFormat === format
                      ? 'border-amber-gold bg-amber-gold/10 text-amber-gold'
                      : 'border-divider text-charcoal hover:border-amber-gold'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Filename</label>
            <input
              type="text"
              value={filename}
              readOnly
              className="w-full px-4 py-2 border border-divider rounded-md bg-light-neutral text-charcoal"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportModal


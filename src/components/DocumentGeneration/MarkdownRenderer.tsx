import { useEffect, useRef } from 'react'
import { marked } from 'marked'

interface MarkdownRendererProps {
  content: string
  className?: string
}

const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!content || !contentRef.current) return

    // Configure marked options for better rendering
    marked.setOptions({
      breaks: true,
      gfm: true,
    })

    const renderMarkdown = async () => {
      const html = await marked.parse(content)
      if (contentRef.current) {
        contentRef.current.innerHTML = html
      }
    }

    renderMarkdown()
  }, [content])

  return (
    <div
      ref={contentRef}
      className={`markdown-content ${className}`}
      style={{
        lineHeight: '1.7',
      }}
    />
  )
}

export default MarkdownRenderer


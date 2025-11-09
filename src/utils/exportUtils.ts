import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun } from 'docx'

export const exportToPDF = async (content: string, filename: string) => {
  const doc = new jsPDF()
  const lines = doc.splitTextToSize(content, 180)
  let y = 20
  
  lines.forEach((line: string) => {
    if (y > 280) {
      doc.addPage()
      y = 20
    }
    doc.text(line, 15, y)
    y += 7
  })
  
  doc.save(`${filename}.pdf`)
}

export const exportToDOCX = async (content: string, filename: string) => {
  const paragraphs = content.split('\n').map(line => 
    new Paragraph({
      children: [new TextRun(line || ' ')],
    })
  )

  const doc = new Document({
    sections: [{
      children: paragraphs,
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.docx`
  link.click()
  URL.revokeObjectURL(url)
}

export const exportToMarkdown = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.md`
  link.click()
  URL.revokeObjectURL(url)
}


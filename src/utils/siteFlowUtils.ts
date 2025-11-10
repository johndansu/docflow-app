// Dynamic import for html2canvas to avoid SSR issues

export interface SiteFlowData {
  nodes: Array<{
    id: string
    name: string
    description: string
    x: number
    y: number
    isParent?: boolean
    level?: number
  }>
  connections: Array<{
    from: string
    to: string
  }>
}

export const exportSiteFlowAsImage = async (canvasElement: HTMLElement, filename: string = 'site-flow') => {
  try {
    // Dynamic import to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(canvasElement, {
      backgroundColor: '#121212',
      scale: 2,
      logging: false,
    })
    
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.png`
    link.click()
  } catch (error) {
    console.error('Error exporting image:', error)
    throw error
  }
}

export const exportSiteFlowAsJSON = (data: SiteFlowData, filename: string = 'site-flow') => {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export const importSiteFlowFromJSON = (file: File): Promise<SiteFlowData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        resolve(data)
      } catch (error) {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}


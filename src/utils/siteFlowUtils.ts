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
    parentId?: string
  }>
  connections: Array<{
    from: string
    to: string
  }>
}

const EXPORT_ROOT_ATTR = 'data-siteflow-export-root'
const COLOR_PROPERTIES: Array<keyof CSSStyleDeclaration> = [
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'fill',
  'stroke',
]

const sanitizeColorsForExport = (doc: Document, rootElement: HTMLElement) => {
  const win = doc.defaultView
  if (!win) return
  const elements = [rootElement, ...Array.from(rootElement.querySelectorAll<HTMLElement>('*'))]
  elements.forEach((element) => {
    const computed = win.getComputedStyle(element)
    COLOR_PROPERTIES.forEach((prop) => {
      const value = computed[prop]
      if (typeof value === 'string' && value && value !== 'initial') {
        element.style.setProperty(prop as string, value)
      }
    })
    const backgroundImage = computed.backgroundImage
    if (backgroundImage && (backgroundImage.includes('oklab') || backgroundImage.includes('color('))) {
      element.style.backgroundImage = 'none'
    }
  })
}

export const exportSiteFlowAsImage = async (canvasElement: HTMLElement, filename: string = 'site-flow') => {
  try {
    // Dynamic import to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default
    canvasElement.setAttribute(EXPORT_ROOT_ATTR, 'true')
    const canvas = await html2canvas(canvasElement, {
      backgroundColor: '#121212',
      scale: 2,
      logging: false,
      onclone: (clonedDoc) => {
        const clonedRoot = clonedDoc.querySelector<HTMLElement>(`[${EXPORT_ROOT_ATTR}="true"]`)
        if (clonedRoot) {
          sanitizeColorsForExport(clonedDoc, clonedRoot)
        }
      },
    })
    
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.png`
    link.click()
  } catch (error) {
    console.error('Error exporting image:', error)
    throw error
  } finally {
    canvasElement.removeAttribute(EXPORT_ROOT_ATTR)
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


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
  'background',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'fill',
  'stroke',
]

const getColorResolver = (doc: Document): CanvasRenderingContext2D | null => {
  const canvas = doc.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.getContext('2d')
}

const resolveColorValue = (ctx: CanvasRenderingContext2D | null, value: string): string | undefined => {
  if (!ctx) return value
  if (!value) return value
  const needsConversion = value.includes('oklab') || value.includes('color(') || value.includes('color-mix')
  if (!needsConversion) {
    return value
  }
  try {
    ctx.fillStyle = value
    if (typeof ctx.fillStyle === 'string') {
      return ctx.fillStyle
    }
  } catch {
    // Continue to fallback below
  }
  // Fallback to forcing via color-mix removal
  if (needsConversion) {
    const fallback = value
      .replace(/oklab\([^)]*\)/gi, '')
      .replace(/color-mix\([^)]*\)/gi, '')
      .replace(/color\([^)]*\)/gi, '')
    if (fallback.trim()) {
      return fallback
    }
  }
  return undefined
}

const sanitizeColorsForExport = (doc: Document, rootElement: HTMLElement) => {
  const win = doc.defaultView
  if (!win) return
  const colorResolver = getColorResolver(doc)
  const elements = [rootElement, ...Array.from(rootElement.querySelectorAll<HTMLElement>('*'))]
  elements.forEach((element) => {
    const computed = win.getComputedStyle(element)
    COLOR_PROPERTIES.forEach((prop) => {
      const value = computed[prop]
      if (typeof value === 'string' && value && value !== 'initial') {
        const resolved = resolveColorValue(colorResolver, value)
        if (resolved) {
          element.style.setProperty(prop as string, resolved)
        }
      }
    })
    const normalizeBackground = (value: string | null) => {
      if (!value) return
      if (value.includes('oklab') || value.includes('color(') || value.includes('color-mix')) {
        return 'none'
      }
      return value
    }
    const backgroundImage = normalizeBackground(computed.backgroundImage)
    if (backgroundImage) {
      element.style.backgroundImage = backgroundImage
    }
    const background = normalizeBackground(computed.background)
    if (background === 'none') {
      element.style.background = 'none'
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


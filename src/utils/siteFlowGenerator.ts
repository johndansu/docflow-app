/**
 * AI-powered site flow generator
 * Uses AI to analyze app descriptions and generate intelligent site flow structures
 */

import { generateWithAI, isAIAvailable } from './aiAgent'

export interface SiteFlowNode {
  id: string
  name: string
  description: string
  x: number
  y: number
  isParent?: boolean
  level?: number
  parentId?: string
}

export interface SiteFlowConnection {
  from: string
  to: string
}

export interface SiteFlowStructure {
  nodes: SiteFlowNode[]
  connections: SiteFlowConnection[]
}

/**
 * Generate site flow structure using AI
 */
export async function generateSiteFlowWithAI(content: string, isPRD: boolean = false): Promise<SiteFlowStructure> {
  if (!isAIAvailable()) {
    console.warn('⚠️ AI not available, using fallback generation')
    return generateSiteFlowFallback(content)
  }

  try {
    console.log(`🤖 Using AI to generate site flow from ${isPRD ? 'PRD' : 'description'}...`)
    
    const systemPrompt = isPRD
      ? `You are an expert UX designer and information architect. Analyze Product Requirements Documents (PRDs) and extract structured site flows with pages and navigation connections. Return ONLY valid JSON, no markdown or explanations.`
      : `You are an expert UX designer and information architect. Analyze app descriptions and generate a structured site flow with pages and navigation connections. Return ONLY valid JSON, no markdown or explanations.`

    const userPrompt = isPRD
      ? `Analyze this Product Requirements Document (PRD) and extract the site flow structure:

"${content}"

From the PRD, identify:
- All pages/screens mentioned in sections like "Key Features", "User Flow", "User Stories", etc.
- Navigation paths and user journeys described in the document
- Feature pages and their hierarchical relationships
- Main sections and sub-sections based on the PRD structure
- Entry points and key user flows

Focus on extracting concrete pages mentioned in:
- Section 5 (Key Features) - each feature may need a page
- Section 6 (User Flow) - this describes navigation paths
- User Stories section - these often mention specific pages/screens
- Any other sections that describe user interactions or features

Return a JSON object with this exact structure:
{
  "pages": [
    {
      "name": "Page Name",
      "description": "Brief description",
      "level": 0,
      "isParent": true,
      "parentId": null
    }
  ],
  "connections": [
    {
      "from": "Page Name 1",
      "to": "Page Name 2"
    }
  ]
}

Rules:
- Level 0 = Home/Landing page (always include this)
- Level 1 = Main navigation pages (directly from home)
- Level 2+ = Sub-pages (children of parent pages)
- Include all important pages based on the ${isPRD ? 'PRD content' : 'description'}
- Create logical navigation flows
- Use clear, descriptive page names
- Set isParent: true for pages that have children
- For connections, use page names (not IDs)
- Return ONLY the JSON object, no other text`
      : `Analyze this app description and generate a site flow structure:

"${content}"

Return a JSON object with this exact structure:
{
  "pages": [
    {
      "name": "Page Name",
      "description": "Brief description",
      "level": 0,
      "isParent": true,
      "parentId": null
    }
  ],
  "connections": [
    {
      "from": "Page Name 1",
      "to": "Page Name 2"
    }
  ]
}

Rules:
- Level 0 = Home/Landing page (always include this)
- Level 1 = Main navigation pages (directly from home)
- Level 2+ = Sub-pages (children of parent pages)
- Include all important pages based on the description
- Create logical navigation flows
- Use clear, descriptive page names
- Set isParent: true for pages that have children
- For connections, use page names (not IDs)
- Return ONLY the JSON object, no other text`

    const response = await generateWithAI({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim()
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim()
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim()
    }

    const data = JSON.parse(jsonStr)
    
    // Convert to our format with IDs and coordinates
    return convertToSiteFlowStructure(data)
  } catch (error) {
    console.error('❌ AI site flow generation failed:', error)
    console.log('📄 Falling back to template-based generation')
    return generateSiteFlowFallback(content)
  }
}

/**
 * Convert AI response to site flow structure with coordinates
 */
function convertToSiteFlowStructure(data: any): SiteFlowStructure {
  const nodes: SiteFlowNode[] = []
  const connections: SiteFlowConnection[] = []
  
  const centerX = 600
  const centerY = 300
  const levelSpacing = 600 // Much larger spacing between levels
  const nodeSpacing = 500 // Much larger spacing between nodes at same level

  const normalizeName = (value: any, index: number): string => {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
    return `Page ${index + 1}`
  }

  const normalizeRefName = (value: any): string => {
    if (typeof value !== 'string') return ''
    return value.trim()
  }

  const rawPages: any[] = Array.isArray(data.pages) ? data.pages.filter(Boolean) : []
  if (rawPages.length === 0) {
    return { nodes, connections }
  }

  const pages = rawPages.map((page, index) => {
    const normalizedName = normalizeName(page?.name, index)
    return {
      ...page,
      name: normalizedName,
    }
  })

  const pageMetaByName = new Map<string, any>()
  pages.forEach(page => {
    if (!pageMetaByName.has(page.name)) {
      pageMetaByName.set(page.name, page)
    }
  })

  const parentCandidatesByChild = new Map<string, string[]>()
  const adjacencyByName = new Map<string, Set<string>>()
  const incomingByName = new Map<string, Set<string>>()

  if (Array.isArray(data.connections)) {
    data.connections.forEach((conn: any) => {
      const fromName = normalizeRefName(conn?.from)
      const toName = normalizeRefName(conn?.to)
      if (!fromName || !toName) return
      if (!adjacencyByName.has(fromName)) {
        adjacencyByName.set(fromName, new Set())
      }
      adjacencyByName.get(fromName)!.add(toName)
      if (!incomingByName.has(toName)) {
        incomingByName.set(toName, new Set())
      }
      incomingByName.get(toName)!.add(fromName)
      if (!parentCandidatesByChild.has(toName)) {
        parentCandidatesByChild.set(toName, [])
      }
      parentCandidatesByChild.get(toName)!.push(fromName)
    })
  }

  const rootNameSet = new Set<string>()
  pages.forEach(page => {
    const explicitLevel = typeof page.level === 'number' ? page.level : undefined
    const parentRef = normalizeRefName(page.parentId)
    if (explicitLevel === 0 || parentRef === '' || parentRef === null) {
      rootNameSet.add(page.name)
    }
  })

  if (rootNameSet.size === 0) {
    pages.forEach(page => {
      if ((incomingByName.get(page.name)?.size ?? 0) === 0) {
        rootNameSet.add(page.name)
      }
    })
  }
  if (rootNameSet.size === 0 && pages.length > 0) {
    rootNameSet.add(pages[0].name)
  }

  const bfsLevels = new Map<string, number>()
  const queue: Array<{ name: string; level: number }> = []
  rootNameSet.forEach(name => queue.push({ name, level: 0 }))

  while (queue.length > 0) {
    const { name, level } = queue.shift()!
    const existing = bfsLevels.get(name)
    if (existing !== undefined && existing <= level) {
      continue
    }
    bfsLevels.set(name, level)
    const children = adjacencyByName.get(name)
    if (children) {
      children.forEach(child => {
        queue.push({ name: child, level: level + 1 })
      })
    }
  }

  const finalLevels = new Map<string, number>()
  pages.forEach(page => {
    if (typeof page.level === 'number' && !Number.isNaN(page.level)) {
      finalLevels.set(page.name, Math.max(0, Math.floor(page.level)))
    }
  })
  bfsLevels.forEach((level, name) => {
    const existing = finalLevels.get(name)
    if (existing === undefined || level < existing) {
      finalLevels.set(name, level)
    }
  })

  const resolveLevelForName = (name: string, stack = new Set<string>()): number => {
    if (finalLevels.has(name)) {
      return finalLevels.get(name)!
    }
    if (stack.has(name)) {
      finalLevels.set(name, 0)
      return 0
    }
    stack.add(name)
    const page = pageMetaByName.get(name)
    const declaredParentName = page && typeof page.parentId === 'string' ? page.parentId.trim() : undefined
    const connectionParents = parentCandidatesByChild.get(name) ?? []
    const parentName = declaredParentName && declaredParentName.length > 0
      ? declaredParentName
      : connectionParents[0]

    if (parentName && parentName !== name) {
      const parentLevel = resolveLevelForName(parentName, stack)
      const computedLevel = parentLevel + 1
      finalLevels.set(name, computedLevel)
      stack.delete(name)
      return computedLevel
    }

    stack.delete(name)
    const fallbackLevel = rootNameSet.has(name) ? 0 : 1
    finalLevels.set(name, fallbackLevel)
    return fallbackLevel
  }

  pages.forEach(page => {
    resolveLevelForName(page.name)
  })

  finalLevels.forEach((level, name) => {
    const meta = pageMetaByName.get(name)
    if (meta) {
      meta.level = level
    }
  })

  const pagesByLevel = new Map<number, any[]>()
  pages.forEach(page => {
    const normalizedLevel = finalLevels.get(page.name) ?? 0
    if (!pagesByLevel.has(normalizedLevel)) {
      pagesByLevel.set(normalizedLevel, [])
    }
    pagesByLevel.get(normalizedLevel)!.push(page)
  })

  const pageNameToId = new Map<string, string>()
  const parentIdByNodeId = new Map<string, string>()
  const rootNodeIds: string[] = []
  let nodeId = 1

  const sortedLevels = Array.from(pagesByLevel.entries()).sort(([a], [b]) => a - b)
  
  sortedLevels.forEach(([level, levelPages]) => {
    levelPages.forEach((page, index) => {
      const id = nodeId.toString()
      pageNameToId.set(page.name, id)

      let x = centerX
      let y = centerY

      if (level === 0) {
        x = centerX
        y = centerY
        rootNodeIds.push(id)
      } else if (level === 1) {
        const angle = (index / levelPages.length) * Math.PI * 2
        x = centerX + Math.cos(angle) * levelSpacing
        y = centerY + Math.sin(angle) * levelSpacing

        const declaredParentName = typeof page.parentId === 'string' && page.parentId.trim().length > 0
          ? page.parentId.trim()
          : undefined
        const candidateParentId = declaredParentName
          ? pageNameToId.get(declaredParentName)
          : rootNodeIds[0]
        if (candidateParentId) {
          parentIdByNodeId.set(id, candidateParentId)
        }
      } else {
        const declaredParentName = typeof page.parentId === 'string' && page.parentId.trim().length > 0
          ? page.parentId.trim()
          : undefined
        const connectionParents = parentCandidatesByChild.get(page.name) ?? []
        const preferredParentName =
          declaredParentName ??
          connectionParents.find(parent => {
            const parentMeta = pageMetaByName.get(parent)
            if (!parentMeta) return false
            const parentLevel = typeof parentMeta.level === 'number' ? parentMeta.level : 0
            return parentLevel === level - 1
          }) ??
          (connectionParents.length > 0 ? connectionParents[0] : undefined)

        if (preferredParentName) {
          const parentId = pageNameToId.get(preferredParentName)
          const parentNode = parentId ? nodes.find(n => n.id === parentId) : undefined
          if (parentNode) {
            const siblingPool = levelPages.filter((p: any) => {
              const pDeclaredParent = typeof p.parentId === 'string' && p.parentId.trim().length > 0
                ? p.parentId.trim()
                : undefined
              if (pDeclaredParent === preferredParentName) return true
              const pConnectionParents = parentCandidatesByChild.get(p.name) ?? []
              if (pConnectionParents.includes(preferredParentName)) {
                const pLevel = finalLevels.get(p.name) ?? level
                return pLevel === level
              }
              return false
            })
            const sameParentSiblings = siblingPool.length > 0 ? siblingPool : [page]
            const siblingIndex = sameParentSiblings.indexOf(page)
            const normalizedIndex = siblingIndex >= 0 ? siblingIndex : sameParentSiblings.length / 2
            const offset = (normalizedIndex - sameParentSiblings.length / 2 + 0.5) * nodeSpacing
            x = parentNode.x + offset
            y = parentNode.y + levelSpacing
            parentIdByNodeId.set(id, parentNode.id)
          }
        }

        if (x === centerX && y === centerY) {
          const parentCandidates = pages.filter((p: any) => p.isParent && (finalLevels.get(p.name) ?? 0) === level - 1)
          if (parentCandidates.length > 0) {
            const fallbackParent = parentCandidates[0]
            const parentId = pageNameToId.get(fallbackParent.name)
            const parentNode = parentId ? nodes.find(n => n.id === parentId) : undefined
            if (parentNode) {
              const offset = (index - levelPages.length / 2) * nodeSpacing
              x = parentNode.x + offset
              y = parentNode.y + levelSpacing
              parentIdByNodeId.set(id, parentNode.id)
            }
          }
        }
      }

      nodes.push({
        id,
        name: page.name,
        description: page.description || '',
        x: Math.round(x),
        y: Math.round(y),
        isParent: page.isParent || false,
        level,
        parentId: parentIdByNodeId.get(id),
      })

      nodeId++
    })
  })

  const nodesById = new Map<string, SiteFlowNode>(nodes.map(node => [node.id, node]))
  const nodesByLevel = new Map<number, SiteFlowNode[]>()
  nodes.forEach(node => {
    const nodeLevel = node.level ?? 0
    if (!nodesByLevel.has(nodeLevel)) {
      nodesByLevel.set(nodeLevel, [])
    }
    nodesByLevel.get(nodeLevel)!.push(node)
  })

  const connectionKeys = new Set<string>()
  const rebuiltConnections: SiteFlowConnection[] = []
  const addConnection = (fromId?: string, toId?: string) => {
    if (!fromId || !toId) return
    if (fromId === toId) return
    if (!nodesById.has(fromId) || !nodesById.has(toId)) return
    const key = `${fromId}->${toId}`
    if (connectionKeys.has(key)) return
    connectionKeys.add(key)
    rebuiltConnections.push({ from: fromId, to: toId })
  }

  parentIdByNodeId.forEach((parentId, childId) => {
    addConnection(parentId, childId)
  })

  const rootFallbackId = rootNodeIds[0] ?? nodes[0]?.id
  const findFallbackParentId = (node: SiteFlowNode): string | undefined => {
    const nodeLevel = node.level ?? 0
    if (nodeLevel <= 0) {
      return undefined
    }

    const targetLevels: number[] = []
    if (nodeLevel > 0) {
      targetLevels.push(nodeLevel - 1)
    }
    for (let delta = 2; delta <= nodeLevel; delta++) {
      targetLevels.push(nodeLevel - delta)
    }
    if (!targetLevels.includes(0)) {
      targetLevels.push(0)
    }

    for (const lvl of targetLevels) {
      const levelNodes = nodesByLevel.get(lvl)
      if (!levelNodes || levelNodes.length === 0) {
        continue
      }

      const parentCandidate = levelNodes.reduce<{ node: SiteFlowNode; distance: number } | null>((closest, candidate) => {
        const distance = Math.abs(candidate.y - node.y) + Math.abs(candidate.x - node.x) * 0.2
        if (!closest || distance < closest.distance) {
          return { node: candidate, distance }
        }
        return closest
      }, null)

      if (parentCandidate) {
        return parentCandidate.node.id
      }
    }

    return rootFallbackId
  }

  nodes.forEach(node => {
    const level = node.level ?? 0
    if (level <= 0) {
      return
    }
    if (parentIdByNodeId.has(node.id)) {
      return
    }
    const fallbackParentId = findFallbackParentId(node)
    addConnection(fallbackParentId, node.id)
  })

  connections.push(...rebuiltConnections)
  
  return { nodes, connections }
}

/**
 * Fallback template-based generation (original logic)
 */
function generateSiteFlowFallback(description: string): SiteFlowStructure {
  const descriptionLower = description.toLowerCase()
  const nodes: SiteFlowNode[] = []
  const connections: SiteFlowConnection[] = []
  
  const centerX = 600
  const centerY = 300
  
  // Home page
  const homeNode: SiteFlowNode = {
    id: '1',
    name: 'Home',
    description: 'Landing page',
    x: centerX,
    y: centerY,
    isParent: true,
    level: 0,
  }
  nodes.push(homeNode)
  
  let nodeId = 2
  
  // Generate pages based on keywords (simplified version of original logic)
  if (descriptionLower.includes('login') || descriptionLower.includes('auth')) {
    nodes.push({
      id: nodeId.toString(),
      name: 'Login',
      description: 'User authentication',
      x: centerX - 400,
      y: centerY,
      level: 1,
      parentId: '1',
    })
    connections.push({ from: '1', to: nodeId.toString() })
    nodeId++
  }
  
  if (descriptionLower.includes('dashboard')) {
    nodes.push({
      id: nodeId.toString(),
      name: 'Dashboard',
      description: 'User dashboard',
      x: centerX + 400,
      y: centerY,
      isParent: true,
      level: 1,
      parentId: '1',
    })
    connections.push({ from: '1', to: nodeId.toString() })
    nodeId++
  }
  
  if (descriptionLower.includes('product') || descriptionLower.includes('shop')) {
    nodes.push({
      id: nodeId.toString(),
      name: 'Products',
      description: 'Product listing',
      x: centerX,
      y: centerY - 300,
      isParent: true,
      level: 1,
      parentId: '1',
    })
    connections.push({ from: '1', to: nodeId.toString() })
    nodeId++
  }
  
  return { nodes, connections }
}


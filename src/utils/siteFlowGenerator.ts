import type { SiteFlowData } from './storage'
import { autoLayoutSiteFlow, createEmptySiteFlow } from './siteFlowUtils'
import { generateWithAI } from './aiAgent'

/**
 * Generate site flow from app description and PRD content
 */
export const generateSiteFlow = async (
  appDescription?: string,
  prdContent?: string
): Promise<SiteFlowData> => {
  if (!appDescription && !prdContent) {
    return createEmptySiteFlow()
  }

  // Prioritize PRD content if available, otherwise use app description
  const primaryContent = prdContent || appDescription || ''
  const contextContent = prdContent && appDescription ? appDescription : undefined

  let raw = ''
  try {
    const prompt = prdContent 
      ? `Generate a site flow structure as JSON based on the following Product Requirements Document (PRD). The PRD contains detailed specifications about the application structure, features, and user flows. Create a site flow that accurately reflects the pages, screens, and navigation paths described in the PRD.

PRD Content:
${prdContent}
${contextContent ? `\n\nAdditional Context:\n${contextContent}` : ''}

Return ONLY a valid JSON object with this exact structure:
{
  "nodes": [
    {
      "id": "unique-id",
      "name": "Page Name",
      "description": "Brief description based on PRD"
    }
  ],
  "connections": [
    {
      "from": "source-node-id",
      "to": "target-node-id"
    }
  ]
}

Requirements:
- Extract all pages, screens, and views mentioned in the PRD
- Create connections based on user flows and navigation paths described in the PRD
- Follow the hierarchy and structure outlined in the PRD
- Include all key pages/screens mentioned in the requirements
- Create a logical flow starting from the entry point (home/landing page) as described in the PRD
- Ensure connections reflect the user journey and navigation flow specified in the PRD

Return ONLY the JSON, no markdown, no code blocks, no explanations.`
      : `Generate a site flow structure as JSON for the following application description:

${primaryContent}

Return ONLY a valid JSON object with this exact structure:
{
  "nodes": [
    {
      "id": "unique-id",
      "name": "Page Name",
      "description": "Brief description"
    }
  ],
  "connections": [
    {
      "from": "source-node-id",
      "to": "target-node-id"
    }
  ]
}

The nodes should represent pages/screens in the application. Connections represent navigation flow between pages.
Create a logical hierarchy starting from a home/landing page.
Return ONLY the JSON, no markdown, no code blocks, no explanations.`

    raw = await generateWithAI({
      systemPrompt: prdContent 
        ? 'You are a UX designer expert at creating site flows based on Product Requirements Documents. Analyze the PRD carefully and extract all pages, screens, user flows, and navigation paths. Create a site flow that accurately reflects the structure and requirements described in the PRD. Return only valid JSON.'
        : 'You are a UX designer expert at creating site flows and user journeys. Return only valid JSON.',
      userPrompt: prompt,
      temperature: 0.7,
      maxTokens: 3000,
    })

    // Extract JSON from response
    let jsonText = raw.trim()
    
    // Try to extract JSON from markdown code blocks
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1]
    } else {
      // Try to find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }
    }

    if (!jsonText || !jsonText.trim().startsWith('{')) {
      console.error('No valid JSON found in response:', raw.substring(0, 200))
      return createEmptySiteFlow()
    }

    const parsed = JSON.parse(jsonText) as Partial<SiteFlowData>
    
    if (!parsed.nodes || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
      console.error('Invalid or empty nodes in response:', parsed)
      return createEmptySiteFlow()
    }

    // Validate node structure
    const validNodes = parsed.nodes.filter((node: any) => 
      node && 
      typeof node.id === 'string' && 
      typeof node.name === 'string'
    )

    if (validNodes.length === 0) {
      console.error('No valid nodes found after filtering:', parsed.nodes)
      return createEmptySiteFlow()
    }

    return autoLayoutSiteFlow({
      nodes: validNodes as SiteFlowData['nodes'],
      connections: (parsed.connections || []).filter((conn: any) => 
        conn && 
        typeof conn.from === 'string' && 
        typeof conn.to === 'string'
      ) as SiteFlowData['connections'],
    })
  } catch (error) {
    console.error('Error generating site flow:', error)
    console.error('Raw response:', raw?.substring(0, 500))
    return createEmptySiteFlow()
  }
}


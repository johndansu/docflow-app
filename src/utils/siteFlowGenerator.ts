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

  const combinedContent = [appDescription, prdContent].filter(Boolean).join('\n\n')

  try {
    const prompt = `Generate a site flow structure as JSON for the following application description:

${combinedContent}

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

    const raw = await generateWithAI({
      systemPrompt: 'You are a UX designer expert at creating site flows and user journeys. Return only valid JSON.',
      userPrompt: prompt,
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const jsonText = jsonMatch ? jsonMatch[0] : raw

    const parsed = JSON.parse(jsonText) as Partial<SiteFlowData>
    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      return createEmptySiteFlow()
    }

    return autoLayoutSiteFlow({
      nodes: parsed.nodes as SiteFlowData['nodes'],
      connections: (parsed.connections || []) as SiteFlowData['connections'],
    })
  } catch (error) {
    console.error('Error generating site flow:', error)
    return createEmptySiteFlow()
  }
}


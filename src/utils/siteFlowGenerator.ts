import { generateWithAI, isAIAvailable, type AIPrompt } from './aiAgent'
import type { SiteFlowData } from './storage'
import { autoLayoutSiteFlow, createEmptySiteFlow, normalizeSiteFlow } from './siteFlowUtils'

const SYSTEM_PROMPT = `
You are an expert UX architect. The user will give you a web/app description and an optional PRD.
Design a clear, hierarchical site map as JSON with two arrays: "nodes" and "connections".

JSON schema:
{
  "nodes": [
    {
      "id": "string",          // unique id like "1", "home", etc.
      "name": "string",        // short page/screen name
      "description": "string", // 1-line description
      "x": number,             // layout x (can be 0, we will auto-layout)
      "y": number,             // layout y (can be 0, we will auto-layout)
      "isParent": boolean,     // true if it has important children
      "level": number          // 0 for root, 1 for first-level pages, etc.
    }
  ],
  "connections": [
    { "from": "string", "to": "string" } // both ids must exist in nodes
  ]
}

Rules:
- ALWAYS return ONLY valid JSON, no comments, no markdown, no explanation.
- Make "Home" (or equivalent) level 0 root when relevant.
- Use concise but descriptive names and descriptions.
- Keep the total number of nodes reasonable (5–25) unless the PRD clearly needs more.
`.trim()

const buildPrompt = (appDescription?: string, prdContent?: string): AIPrompt => {
  const descriptionText = appDescription?.trim() || 'No high-level description provided.'
  const prdText = prdContent?.trim()

  const userPromptParts = [
    `High-level description:\n${descriptionText}`,
  ]

  if (prdText) {
    userPromptParts.push('\nPRD (may be long, summarize the structure, not every detail):')
    userPromptParts.push(prdText)
  }

  userPromptParts.push('\nReturn ONLY the JSON that matches the schema.')

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: userPromptParts.join('\n'),
    temperature: 0.4,
    maxTokens: 1200,
  }
}

const extractJson = (raw: string): string => {
  // Try to find a JSON block, potentially inside ``` fences
  const codeFenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (codeFenceMatch) {
    return codeFenceMatch[1].trim()
  }

  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1)
  }

  return raw.trim()
}

const parseSiteFlowJson = (text: string): SiteFlowData => {
  const jsonText = extractJson(text)
  const parsed = JSON.parse(jsonText) as Partial<SiteFlowData>

  if (!parsed.nodes || !parsed.connections) {
    throw new Error('Invalid site flow format from AI')
  }

  return normalizeSiteFlow({
    nodes: parsed.nodes as SiteFlowData['nodes'],
    connections: parsed.connections as SiteFlowData['connections'],
  })
}

/**
 * Fallback deterministic site flow used when AI is not configured or fails.
 */
const createFallbackSiteFlow = (appDescription?: string): SiteFlowData => {
  const name = appDescription?.trim() || 'Your App'

  const data: SiteFlowData = {
    nodes: [
      {
        id: '1',
        name: 'Home',
        description: `Landing page for ${name}`,
        x: 0,
        y: 0,
        isParent: true,
        level: 0,
      },
      {
        id: '2',
        name: 'Core Feature',
        description: 'Primary experience screen',
        x: 0,
        y: 0,
        isParent: true,
        level: 1,
      },
      {
        id: '3',
        name: 'Account',
        description: 'Profile and settings',
        x: 0,
        y: 0,
        isParent: false,
        level: 1,
      },
      {
        id: '4',
        name: 'Help / Support',
        description: 'FAQs and support contact',
        x: 0,
        y: 0,
        isParent: false,
        level: 1,
      },
    ],
    connections: [
      { from: '1', to: '2' },
      { from: '1', to: '3' },
      { from: '1', to: '4' },
    ],
  }

  return autoLayoutSiteFlow(data)
}

/**
 * Generate a site flow diagram for the given app description / PRD.
 * Uses AI when configured, with a sensible fallback when not.
 */
export const generateSiteFlow = async (
  appDescription?: string,
  prdContent?: string,
): Promise<SiteFlowData> => {
  if (!isAIAvailable()) {
    // No AI configured – return a simple predictable structure
    return createFallbackSiteFlow(appDescription)
  }

  try {
    const prompt = buildPrompt(appDescription, prdContent)
    const raw = await generateWithAI(prompt)
    const parsed = parseSiteFlowJson(raw)
    return autoLayoutSiteFlow(parsed)
  } catch (error) {
    console.error('Error generating site flow, falling back to deterministic layout:', error)
    return createFallbackSiteFlow(appDescription)
  }
}

/**
 * Safely normalize arbitrary value into SiteFlowData or an empty structure.
 * Handy when loading from external storage or user uploads.
 */
export const coerceToSiteFlow = (value: unknown): SiteFlowData => {
  if (!value || typeof value !== 'object') return createEmptySiteFlow()
  const maybe = value as Partial<SiteFlowData>
  if (!Array.isArray(maybe.nodes) || !Array.isArray(maybe.connections)) {
    return createEmptySiteFlow()
  }
  return normalizeSiteFlow({
    nodes: maybe.nodes as SiteFlowData['nodes'],
    connections: maybe.connections as SiteFlowData['connections'],
  })
}



/**
 * Intelligent content generator that extracts information from user descriptions
 * and generates structured documentation using AI agents
 */

import { generateWithAI, isAIAvailable } from './aiAgent'

export interface ExtractedInfo {
  projectName: string
  features: string[]
  targetUsers: string[]
  problems: string[]
  goals: string[]
  techStack: string[]
}

const COMMAND_PREFIXES = [
  /^(please\s+)?(help\s+)?(me\s+)?(to\s+)?(build|create|make|develop|design|plan|craft|write|generate)\s+/i,
  /^(i\s+)?(want|would like|need|am building|am creating)\s+(to\s+)?/i,
  /^let'?s\s+(build|create|make|design)\s+/i,
  /^looking\s+to\s+(build|create|make|design)\s+/i
]

const STOP_WORDS = new Set([
  'app','application','platform','tool','tools','solution','project','product','service','software','system','build','create','make','develop','design','for','with','that','this','from','into','and','the','a','an','to','of','in','on','my','our','their','users','user','people','team','teams','help','need','like'
])

const SUFFIXES = ['Hub', 'Flow', 'Deck', 'Nest', 'Suite', 'Portal', 'Loop', 'Forge', 'Atlas', 'Pulse', 'Space', 'Wave', 'Pilot', 'Core', 'Studio', 'Works']

const THEME_DICTIONARY: { keywords: string[]; names: string[] }[] = [
  {
    keywords: ['shop', 'shopping', 'store', 'retail', 'commerce', 'cart', 'checkout', 'market', 'boutique'],
    names: ['Cartova', 'Mercana', 'Shopora', 'Bazilio', 'Checkoutly', 'MarketFlux', 'Trolleyx', 'Retailyn', 'Bazaario', 'Cartstream']
  },
  {
    keywords: ['kid', 'kids', 'child', 'children', 'youth', 'play', 'toy', 'toddler', 'school', 'classroom'],
    names: ['SproutSpark', 'WonderNest', 'Playloom', 'PebbleJoy', 'MiniOrbit', 'BrightBud', 'Kidora', 'Lilypad Labs', 'JoyMint', 'SprigLane']
  },
  {
    keywords: ['note', 'notes', 'notebook', 'journal', 'doc', 'document', 'writing', 'write', 'scribe', 'memo'],
    names: ['Quillcraft', 'Draftline', 'Scriptoria', 'Pageforge', 'MemoNest', 'NoteLoom', 'Scribeon', 'Journova', 'Draftsmith', 'Logium']
  },
  {
    keywords: ['ai', 'agent', 'automation', 'assistant', 'bot', 'intelligence', 'machine'],
    names: ['Aionics', 'Agentix', 'Automata Lab', 'BotLoop', 'SynthMind', 'CogniFlow', 'NeuroNest', 'ThinkBeam', 'LogicPulse', 'Promptify']
  },
  {
    keywords: ['finance', 'budget', 'accounting', 'money', 'bank', 'crypto', 'investment', 'invoice'],
    names: ['Ledgerly', 'Mintwave', 'Finova', 'Coinspan', 'Valorix', 'Fundron', 'Cashmere Labs', 'Budgetry', 'Paycraft', 'Accrualis']
  },
  {
    keywords: ['health', 'fitness', 'medical', 'wellness', 'clinic', 'care', 'hospital', 'therapy', 'med'],
    names: ['Vitalon', 'Pulseforge', 'Mediora', 'Wellnest', 'Fitflare', 'Healcraft', 'TheraBeam', 'Clinique Labs', 'Wellspring', 'Carenova']
  },
  {
    keywords: ['education', 'learn', 'learning', 'school', 'student', 'course', 'curriculum', 'teach', 'lesson'],
    names: ['Learnova', 'Campusly', 'Eduverse', 'ScholarAxis', 'Classloom', 'Tutorium', 'AcademiaX', 'Lessonary', 'Teachlane', 'MentorLab']
  },
  {
    keywords: ['travel', 'trip', 'tour', 'journey', 'flight', 'hotel', 'tourism', 'vacation'],
    names: ['Voyagr', 'Tripcade', 'Traveline', 'Jetstream', 'Roamara', 'Nomadix', 'Globetrail', 'AtlasLane', 'Itinero', 'Excursion Labs']
  },
  {
    keywords: ['music', 'audio', 'sound', 'song', 'podcast', 'radio'],
    names: ['Audiary', 'Soundwave', 'TuneForge', 'Melodic', 'Podloom', 'Rhythmo', 'Harmonyx', 'BeatFolio', 'Chordline', 'Resonata']
  }
]

const GLOBAL_PREFIXES = ['Nova', 'Quantum', 'Lumen', 'Echo', 'Vertex', 'Nimbus', 'Atlas', 'Aurora', 'Cosmic', 'Parallel', 'Prism', 'Catalyst', 'Bright', 'Hyper', 'Solar']
const GLOBAL_SUFFIXES = ['Labs', 'Studio', 'Works', 'Forge', 'Pulse', 'Orbit', 'Realm', 'Collective', 'Verse', 'Matrix', 'Nest', 'Beacon', 'Fabric', 'Harbor', 'Vista']

const KEYWORD_REPLACEMENTS: Record<string, string> = {
  kids: 'Kiddo',
  kid: 'Kiddo',
  child: 'Playful',
  children: 'Playful',
  shopping: 'Shopper',
  shop: 'Shopper',
  notebook: 'Notion',
  notes: 'Notion',
  task: 'Tasker',
  tasks: 'Tasker',
  project: 'Project',
  manager: 'Manager',
  learning: 'Learner',
  finance: 'Ledger',
  budget: 'Budgeteer',
  health: 'Vital',
  fitness: 'Fit',
  travel: 'Voyage',
  social: 'Circle',
  education: 'Edu',
  ecommerce: 'Commerce',
  shopify: 'Shopify'
}

const toTitleCase = (word: string) =>
  word.replace(/^[a-z]/, c => c.toUpperCase()).replace(/-(\w)/g, (_, chr) => `-${chr.toUpperCase()}`)

const transformKeyword = (word: string): string => {
  const lower = word.toLowerCase()
  if (KEYWORD_REPLACEMENTS[lower]) {
    return KEYWORD_REPLACEMENTS[lower]
  }
  if (lower.endsWith('ing')) {
    return toTitleCase(lower.replace(/ing$/, 'er'))
  }
  if (lower.endsWith('ers')) {
    return toTitleCase(lower.replace(/ers$/, 'er'))
  }
  if (lower.endsWith('ies')) {
    return toTitleCase(lower.replace(/ies$/, 'y'))
  }
  if (lower.endsWith('s') && lower.length > 3) {
    return toTitleCase(lower.slice(0, -1))
  }
  return toTitleCase(lower)
}

const pickFromList = (list: string[], seed: number) => list[Math.abs(seed) % list.length]

const buildNameFromKeywords = (keywords: string[], rawWords: Set<string>): string => {
  if (keywords.length === 0) {
    return 'Untitled Project'
  }

  const seed = keywords.join('').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)

  const matchedThemes = THEME_DICTIONARY.filter(theme =>
    theme.keywords.some(key => keywords.includes(key))
  )

  const transformed = keywords.map(transformKeyword)
  const uniqueAnchors = transformed
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .slice(0, 3)

  const safeAnchors = uniqueAnchors.filter(word => !rawWords.has(word.toLowerCase()))
  const anchors = safeAnchors.length > 0 ? safeAnchors : uniqueAnchors

  if (matchedThemes.length > 0) {
    const primaryTheme = matchedThemes[0]
    const themedName = pickFromList(primaryTheme.names, seed)
    const secondaryTheme = matchedThemes[1]
    const secondaryName = secondaryTheme ? pickFromList(secondaryTheme.names, seed + themedName.length) : null

    const anchorPrimary = anchors[0] || pickFromList(GLOBAL_PREFIXES, seed + themedName.length)
    const anchorSecondary = anchors[1] || (secondaryName ? secondaryName.split(/\s+/)[0] : pickFromList(GLOBAL_SUFFIXES, seed + anchorPrimary.length))

    const pieces = [anchorPrimary, themedName]
    if (secondaryName && secondaryName !== themedName) {
      pieces.push(secondaryName)
    } else if (anchorSecondary && anchorSecondary !== anchorPrimary && anchorSecondary !== themedName) {
      pieces.push(anchorSecondary)
    }

    const combined = pieces
      .map(part => part.replace(/\b(App|Application|Platform|Project)\b/gi, '').trim())
      .filter(part => part.length > 1)

    const sanitized = combined
      .filter((value, index, arr) => value && arr.indexOf(value) === index)
      .filter(part => !rawWords.has(part.toLowerCase()))

    const finalParts = sanitized.length >= 2 ? sanitized : combined
    const finalName = finalParts.join(' ').replace(/\s+/g, ' ').trim()
    return finalName.length > 0 ? finalName : `${themedName} ${pickFromList(GLOBAL_SUFFIXES, seed)}`.trim()
  }

  const prefix = pickFromList(GLOBAL_PREFIXES, seed)
  const suffix = pickFromList(GLOBAL_SUFFIXES, seed + (anchors[0]?.length ?? 0))
  const base = anchors[0] || pickFromList(SUFFIXES, seed + 3)
  const bonus = anchors[1]

  const pieces = [prefix, base]
  if (bonus && bonus !== base) {
    pieces.push(bonus)
  }
  pieces.push(suffix)

  const combined = pieces
    .map(part => part.replace(/\b(App|Application|Platform|Project)\b/gi, '').trim())
    .filter(part => part.length > 1)

  const finalName = combined
    .filter((value, index, arr) => value && arr.indexOf(value) === index)
    .filter(part => !rawWords.has(part.toLowerCase()))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (finalName.length > 0) {
    return finalName
  }

  const fallback = `${prefix} ${pickFromList(SUFFIXES, seed + 7)}`.trim()
  return fallback || 'Untitled Project'
}

const suggestProjectName = (description: string): string => {
  if (!description || !description.trim()) {
    return 'Untitled Project'
  }

  let firstSentence = description.split(/[.!?\n]/)[0]?.trim() || description.trim()
  COMMAND_PREFIXES.forEach(regex => {
    firstSentence = firstSentence.replace(regex, '').trim()
  })
  firstSentence = firstSentence.replace(/^(an?|the)\s+/i, '').trim()

  const cleanedWords = description
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  const keywords: string[] = []
  const rawWordSet = new Set<string>()

  cleanedWords.forEach(word => {
    rawWordSet.add(word)
    if (!STOP_WORDS.has(word) && !keywords.includes(word)) {
      keywords.push(word)
    }
  })

  if (keywords.length === 0) {
    const fallback = firstSentence
      .split(/\s+/)
      .filter(Boolean)
      .map(toTitleCase)
      .join(' ')
    return fallback || 'Untitled Project'
  }

  const name = buildNameFromKeywords(keywords.slice(0, 6), rawWordSet)
  return name.substring(0, 60)
}

export const extractInfo = (description: string): ExtractedInfo => {
  const lines = description.split('\n').filter(l => l.trim())
  const projectName = suggestProjectName(description).substring(0, 60)
  
  const descriptionLower = description.toLowerCase()
  
  // Extract features (lines starting with -, *, or containing keywords)
  const features: string[] = []
  lines.forEach(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
      features.push(trimmed.substring(1).trim())
    }
  })
  
  // Extract common feature keywords
  const featureKeywords = [
    'authentication', 'login', 'signup', 'user account',
    'dashboard', 'profile', 'settings',
    'search', 'filter', 'sort',
    'payment', 'checkout', 'cart', 'billing',
    'notification', 'email', 'sms',
    'chat', 'messaging', 'communication',
    'analytics', 'reporting', 'statistics',
    'upload', 'download', 'file',
    'calendar', 'scheduling', 'booking',
    'social', 'share', 'comment', 'like'
  ]
  
  featureKeywords.forEach(keyword => {
    if (descriptionLower.includes(keyword) && !features.some(f => f.toLowerCase().includes(keyword))) {
      features.push(keyword.charAt(0).toUpperCase() + keyword.slice(1).replace(/\b\w/g, l => l.toUpperCase()))
    }
  })
  
  // Extract target users
  const targetUsers: string[] = []
  const userPatterns = [
    /(?:for|target|users?|audience|customers?|clients?)\s+(?:are|is|include|consist of|comprise)\s+([^.]+)/gi,
    /(?:target|primary|main)\s+(?:users?|audience|customers?)\s*:?\s*([^.]+)/gi,
    /(?:used by|designed for)\s+([^.]+)/gi
  ]
  
  userPatterns.forEach(pattern => {
    const matches = description.match(pattern)
    if (matches) {
      matches.forEach(match => {
        const users = match.replace(/^(?:for|target|users?|audience|customers?|clients?|used by|designed for)\s+(?:are|is|include|consist of|comprise|:)\s*/i, '').trim()
        if (users && users.length > 3) {
          targetUsers.push(users)
        }
      })
    }
  })
  
  // Default users if none found
  if (targetUsers.length === 0) {
    if (descriptionLower.includes('business') || descriptionLower.includes('enterprise')) {
      targetUsers.push('Business professionals', 'Enterprise users')
    } else if (descriptionLower.includes('student') || descriptionLower.includes('education')) {
      targetUsers.push('Students', 'Educators')
    } else {
      targetUsers.push('End users', 'General public')
    }
  }
  
  // Extract problems
  const problems: string[] = []
  const problemKeywords = ['problem', 'issue', 'challenge', 'pain', 'difficulty', 'struggle', 'frustration']
  problemKeywords.forEach(keyword => {
    const regex = new RegExp(`(?:${keyword}[^.]*?)([^.]+)`, 'gi')
    const matches = description.match(regex)
    if (matches) {
      matches.forEach(match => {
        const problem = match.replace(new RegExp(`^.*?${keyword}\\s*:?\\s*`, 'i'), '').trim()
        if (problem && problem.length > 10) {
          problems.push(problem)
        }
      })
    }
  })
  
  // Extract goals
  const goals: string[] = []
  const goalPatterns = [
    /(?:goal|objective|aim|purpose|mission)\s+(?:is|are|to)\s+([^.]+)/gi,
    /(?:to|aiming to|designed to)\s+([^.]+?)(?:\.|,|$)/gi
  ]
  
  goalPatterns.forEach(pattern => {
    const matches = description.match(pattern)
    if (matches) {
      matches.forEach(match => {
        const goal = match.replace(/^(?:goal|objective|aim|purpose|mission|to|aiming to|designed to)\s+(?:is|are|to)\s*/i, '').trim()
        if (goal && goal.length > 5) {
          goals.push(goal)
        }
      })
    }
  })
  
  // Extract tech stack
  const techStack: string[] = []
  const techKeywords = [
    'react', 'vue', 'angular', 'svelte',
    'node', 'python', 'java', 'php', 'ruby', 'go', 'rust',
    'mongodb', 'postgresql', 'mysql', 'sqlite', 'redis',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes',
    'typescript', 'javascript', 'html', 'css'
  ]
  
  techKeywords.forEach(tech => {
    if (descriptionLower.includes(tech)) {
      techStack.push(tech.charAt(0).toUpperCase() + tech.slice(1))
    }
  })
  
  return {
    projectName,
    features: features.length > 0 ? features.slice(0, 10) : ['Core functionality', 'User interface', 'Data management'],
    targetUsers: targetUsers.slice(0, 5),
    problems: problems.length > 0 ? problems.slice(0, 5) : ['User needs a better solution', 'Current solutions are inadequate'],
    goals: goals.length > 0 ? goals.slice(0, 5) : ['Improve user experience', 'Solve key problems', 'Provide value'],
    techStack: techStack.length > 0 ? techStack : ['Modern web technologies']
  }
}

export const generatePRD = async (info: ExtractedInfo, description: string): Promise<string> => {
  // Use AI if available
  console.log('📝 Generating PRD...', { aiAvailable: isAIAvailable() })
  if (isAIAvailable()) {
    try {
      console.log('🤖 Using AI to generate PRD...')
      const systemPrompt = `You are an expert product manager. Generate comprehensive Product Requirements Documents (PRDs) that are well-structured, detailed, and professional. Always use proper markdown formatting with clear headings, bullet points, and organized sections.`
      const userPrompt = `Create a detailed Product Requirements Document for the following project:

**Project Name:** ${info.projectName}
**Description:** ${description}

**Key Features:** ${info.features.join(', ')}
**Target Users:** ${info.targetUsers.join(', ')}
**Problems Solved:** ${info.problems.join(', ')}
**Goals:** ${info.goals.join(', ')}
**Tech Stack:** ${info.techStack.join(', ')}

Generate a comprehensive PRD with the following structure:

# Product Requirements Document: [Project Name]

## 1. Overview
[Brief introduction and context]

## 2. Problem Statement
[Clear description of the problems being solved]

## 3. Objectives
[Specific, measurable objectives]

## 4. Target Users
[Detailed user personas and use cases]

## 5. Key Features
[Detailed feature descriptions with acceptance criteria]

## 6. User Flow
[Step-by-step user journey]

## 7. Success Metrics
[KPIs and measurement criteria]

## 8. Technical Requirements
[Technical specifications and constraints]

## 9. Timeline & Milestones
[Project phases and deadlines]

## 10. Dependencies & Risks
[External dependencies and risk mitigation]

Use proper markdown formatting with:
- Clear heading hierarchy (## for sections, ### for subsections)
- Bullet points for lists
- Bold text for emphasis
- Code blocks for technical details
- Tables where appropriate`

      const result = await generateWithAI({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 2500,
      })
      console.log('✅ AI PRD generated successfully', { length: result.length })
      return result
    } catch (error) {
      console.error('❌ AI generation failed, using template fallback:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
      // Fall through to template
    }
  } else {
    console.warn('⚠️ AI not available, using template fallback')
  }

  // Template fallback
  console.log('📄 Using template fallback for PRD')
  return `# Product Requirements Document: ${info.projectName}

## 1. Overview
${description}

## 2. Problem Statement
${info.problems.length > 0 
  ? info.problems.map(p => `- ${p}`).join('\n')
  : `Users need a solution that addresses their core needs efficiently and effectively.`}

## 3. Objectives
${info.goals.map(g => `- ${g}`).join('\n')}

## 4. Target Users
${info.targetUsers.map(u => `- ${u}`).join('\n')}

## 5. Key Features
${info.features.map(f => `- ${f}`).join('\n')}

## 6. User Flow
1. User lands on homepage/landing page
2. User explores key features and functionality
3. User completes primary action (signup, purchase, etc.)
4. User accesses dashboard/main interface
5. User utilizes core features to achieve their goals

## 7. Success Metrics
- User engagement rate
- Feature adoption rate
- User satisfaction score (target: >4.0/5.0)
- Retention rate (target: >60% after 30 days)
- Task completion rate

## 8. Technical Requirements
- Frontend: ${info.techStack[0] || 'Modern web framework'}
- Backend: ${info.techStack[1] || 'Scalable API architecture'}
- Database: ${info.techStack[2] || 'Reliable database solution'}
- Infrastructure: Cloud-based hosting for scalability
- Security: Authentication, authorization, and data encryption

## 9. Timeline & Milestones
- Phase 1: Core functionality (Weeks 1-4)
- Phase 2: Enhanced features (Weeks 5-8)
- Phase 3: Polish & optimization (Weeks 9-12)

## 10. Dependencies & Risks
- Technical dependencies: Third-party APIs, libraries
- Resource dependencies: Development team, infrastructure
- Risks: Timeline delays, scope creep, technical challenges
- Mitigation: Regular reviews, agile methodology, clear communication`
}

export const generateDesignPrompt = async (info: ExtractedInfo, description: string): Promise<string> => {
  // Use AI if available
  if (isAIAvailable()) {
    try {
      const systemPrompt = `You are an expert UX/UI designer. Generate detailed design prompts that help designers create beautiful, functional, and user-centered interfaces. Always use proper markdown formatting with clear sections and visual hierarchy.`
      const userPrompt = `Create a comprehensive design prompt for the following project:

**Project Name:** ${info.projectName}
**Description:** ${description}

**Key Features:** ${info.features.join(', ')}
**Target Users:** ${info.targetUsers.join(', ')}
**Tech Stack:** ${info.techStack.join(', ')}

Generate a detailed design prompt with the following structure:

# Design Prompt: [Project Name]

## Project Description
[Overview of the project]

## Visual Style
[Requirements for visual aesthetics]

## Color Palette
[Recommended color schemes with hex codes]

## Typography
[Font choices and hierarchy guidelines]

## Layout Structure
[Information architecture and layout principles]

## Key Design Elements
[Important UI components and patterns]

## User Experience Goals
[UX objectives and principles]

## Specific Design Challenges
[Unique design considerations for this project]

## Design Deliverables
[Required design artifacts]

## Success Criteria
[How to measure design success]

Use proper markdown formatting with clear headings, bullet points, and organized sections.`

      return await generateWithAI({
        systemPrompt,
        userPrompt,
        temperature: 0.8,
        maxTokens: 2000,
      })
    } catch (error) {
      console.warn('AI generation failed, using template fallback:', error)
      // Fall through to template
    }
  }

  // Template fallback
  return `# Design Prompt: ${info.projectName}

## Project Description
${description}

## Design Requirements

### Visual Style
Create a design that is:
- Modern and professional
- Clean and intuitive
- Accessible and user-friendly (WCAG 2.1 AA compliant)
- Visually appealing without being overwhelming
- Consistent with contemporary design trends

### Color Palette
- Primary: Use a color that reflects the brand and purpose
- Secondary: Complementary colors for accents and CTAs
- Neutral: Grays for text and backgrounds
- Status: Colors for success, warning, and error states
- Ensure sufficient contrast ratios for accessibility

### Typography
- Headings: Clear hierarchy with bold, readable fonts
- Body: Highly legible font optimized for screens
- Sizing: Responsive typography scale
- Line height: Comfortable reading experience (1.5-1.6)

### Layout Structure
- Header: Navigation and primary actions
- Main Content: Focused, scannable content areas
- Sidebar: Secondary navigation or contextual information (if needed)
- Footer: Links, legal, and additional resources

### Key Design Elements
- **Navigation**: Clear, intuitive navigation structure
- **Buttons & CTAs**: Prominent, accessible, with clear visual hierarchy
- **Forms**: Clean, well-labeled input fields with helpful error states
- **Cards/Containers**: Subtle shadows and borders for depth
- **Icons**: Consistent icon set that enhances understanding
- **Images**: High-quality, relevant imagery that supports content

### User Experience Goals
- Make it easy for users to understand and navigate
- Ensure key actions are clear and accessible
- Create a sense of trust and professionalism
- Minimize cognitive load
- Provide visual feedback for user interactions
- Support both desktop and mobile experiences

### Specific Design Challenges
Based on the project description, consider:
- How to present ${info.features[0] || 'main features'} clearly
- How to guide users through key user flows
- How to make ${info.features[1] || 'complex features'} feel simple and approachable
- How to create visual hierarchy that emphasizes what matters most
- How to handle ${info.targetUsers[0] || 'target users'}' needs effectively

### Design Deliverables
- Wireframes for key screens
- High-fidelity mockups
- Design system/component library
- Interactive prototypes
- Style guide with colors, typography, and spacing
- Responsive breakpoints and mobile designs

### Success Criteria
The design should:
- Be intuitive for first-time users
- Support the core functionality effectively
- Maintain consistency across all screens
- Meet accessibility standards (WCAG 2.1 AA)
- Be implementable within technical constraints
- Provide an excellent user experience across devices`
}

export const generateUserStories = async (info: ExtractedInfo, description: string): Promise<string> => {
  // Use AI if available
  if (isAIAvailable()) {
    try {
      const systemPrompt = `You are an expert product manager and agile coach. Generate well-structured user stories with clear acceptance criteria that follow the "As a... I want... So that..." format. Always use proper markdown formatting with clear sections and organized lists.`
      const userPrompt = `Create detailed user stories for the following project:

**Project Name:** ${info.projectName}
**Description:** ${description}

**Key Features:** ${info.features.join(', ')}
**Target Users:** ${info.targetUsers.join(', ')}
**Problems Solved:** ${info.problems.join(', ')}
**Goals:** ${info.goals.join(', ')}

Generate comprehensive user stories with the following structure:

# User Stories: [Project Name]

## Project Overview
[Brief project context]

## User Stories

### [Feature Name]
**As a** [user type], **I want** [feature/action], **so that** [benefit/value].

**Acceptance Criteria:**
- [Specific, testable criterion]
- [Another criterion]
- [Another criterion]

**Priority:** [High/Medium/Low]

[Repeat for each major feature]

## Priority Breakdown
- **High Priority:** [List high priority stories]
- **Medium Priority:** [List medium priority stories]
- **Low Priority:** [List low priority stories]

## Definition of Done
[Criteria for story completion]

Use proper markdown formatting with clear headings, bold text for emphasis, and organized bullet points.`

      return await generateWithAI({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 2000,
      })
    } catch (error) {
      console.warn('AI generation failed, using template fallback:', error)
      // Fall through to template
    }
  }

  // Template fallback
  const stories: string[] = []
  
  // Generate user stories based on features
  info.features.forEach((feature, index) => {
    if (index < 5) {
      stories.push(`### As a ${info.targetUsers[0] || 'user'}, I want to ${feature.toLowerCase()} so that I can achieve my goals efficiently
- Acceptance criteria: Feature is accessible and easy to use
- Acceptance criteria: Feature works reliably without errors
- Acceptance criteria: Feature provides clear feedback on actions
- Acceptance criteria: Feature is responsive and performs well`)
    }
  })
  
  return `# User Stories: ${info.projectName}

## Project Overview
${description}

## User Stories

${stories.join('\n\n')}

## Priority
- **High Priority**: Core functionality that enables primary use cases
  ${info.features.slice(0, 3).map(f => `  - ${f}`).join('\n')}
  
- **Medium Priority**: Enhanced features that improve user experience
  ${info.features.slice(3, 6).map(f => `  - ${f}`).join('\n')}
  
- **Low Priority**: Nice-to-have features for future iterations
  ${info.features.slice(6, 9).map(f => `  - ${f}`).join('\n')}

## Definition of Done
- Feature is implemented and tested
- Code is reviewed and approved
- Documentation is updated
- Feature is deployed to production
- User acceptance testing is complete`
}

export const generateSpecs = async (info: ExtractedInfo, description: string): Promise<string> => {
  // Use AI if available
  if (isAIAvailable()) {
    try {
      const systemPrompt = `You are an expert software architect and technical lead. Generate comprehensive technical specifications that are detailed, accurate, and implementation-ready. Always use proper markdown formatting with code blocks for technical details.`
      const userPrompt = `Create detailed technical specifications for the following project:

**Project Name:** ${info.projectName}
**Description:** ${description}

**Key Features:** ${info.features.join(', ')}
**Target Users:** ${info.targetUsers.join(', ')}
**Tech Stack:** ${info.techStack.join(', ')}

Generate comprehensive technical specs with the following structure:

# Technical Specifications: [Project Name]

## Overview
[Project context and technical scope]

## System Architecture
[High-level architecture diagram description]

### Frontend
[Frontend technology and structure]

### Backend
[Backend architecture and services]

### Database
[Database design and data model]

### Infrastructure
[Hosting, deployment, and scaling]

## Component Breakdown
[Key system components]

## API Specifications
[Detailed API endpoints with examples in code blocks]

## Database Schema
[Table structures with code blocks]

## Performance Requirements
[Performance targets and benchmarks]

## Security Requirements
[Security measures and best practices]

## Deployment Strategy
[Deployment process and environments]

Use proper markdown formatting with:
- Clear heading hierarchy
- Code blocks for all technical examples (use \`\`\`language syntax)
- Tables for schemas and API endpoints
- Bullet points for lists
- Bold text for important terms`

      return await generateWithAI({
        systemPrompt,
        userPrompt,
        temperature: 0.6,
        maxTokens: 2500,
      })
    } catch (error) {
      console.warn('AI generation failed, using template fallback:', error)
      // Fall through to template
    }
  }

  // Template fallback
  return `# Technical Specifications: ${info.projectName}

## Overview
${description}

## Architecture

### System Architecture
- **Frontend**: ${info.techStack[0] || 'Modern web framework'} - Client-side application
- **Backend**: ${info.techStack[1] || 'API server'} - Server-side logic and data processing
- **Database**: ${info.techStack[2] || 'Database system'} - Data persistence layer
- **Infrastructure**: Cloud-based hosting with auto-scaling capabilities

### Component Breakdown
- Authentication service
- User management module
- Core feature modules
- API gateway
- Data access layer
- Caching layer

## API Specifications

### Authentication Endpoints
- \`POST /api/auth/login\` - User authentication
- \`POST /api/auth/register\` - User registration
- \`POST /api/auth/logout\` - User logout
- \`GET /api/auth/me\` - Get current user

### Core Feature Endpoints
- \`GET /api/${info.features[0]?.toLowerCase().replace(/\s+/g, '-') || 'items'}\` - List items
- \`POST /api/${info.features[0]?.toLowerCase().replace(/\s+/g, '-') || 'items'}\` - Create item
- \`GET /api/${info.features[0]?.toLowerCase().replace(/\s+/g, '-') || 'items'}/:id\` - Get item
- \`PUT /api/${info.features[0]?.toLowerCase().replace(/\s+/g, '-') || 'items'}/:id\` - Update item
- \`DELETE /api/${info.features[0]?.toLowerCase().replace(/\s+/g, '-') || 'items'}/:id\` - Delete item

## Database Schema

### Users Table
- id (UUID, Primary Key)
- email (String, Unique, Indexed)
- password_hash (String)
- created_at (Timestamp)
- updated_at (Timestamp)

### Core Data Table
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- data (JSON)
- created_at (Timestamp)
- updated_at (Timestamp)

## Performance Requirements
- **Response Time**: API endpoints should respond within 200ms (p95)
- **Throughput**: Support at least 1000 requests per second
- **Scalability**: Horizontal scaling capability
- **Uptime**: 99.9% availability target

## Security Requirements
- Authentication: JWT-based authentication
- Authorization: Role-based access control (RBAC)
- Data Encryption: HTTPS/TLS for data in transit, encryption at rest
- Input Validation: All inputs validated and sanitized
- Rate Limiting: Prevent abuse and DDoS attacks

## Deployment
- **Environment**: Production, Staging, Development
- **CI/CD**: Automated testing and deployment pipeline
- **Monitoring**: Application performance monitoring and error tracking
- **Backup**: Regular automated backups with point-in-time recovery`
}


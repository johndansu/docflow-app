/**
 * AI Agent Service
 * Handles communication with AI providers for content generation
 */

export type AIProvider = 'openai' | 'anthropic' | 'groq' | 'together' | 'huggingface' | 'deepseek' | 'custom'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  model?: string
  baseURL?: string // For custom providers
}

export interface AIPrompt {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}

class AIAgent {
  private config: AIConfig | null = null

  /**
   * Initialize the AI agent with configuration
   */
  initialize(config: AIConfig) {
    this.config = config
  }

  /**
   * Check if the agent is initialized
   */
  isInitialized(): boolean {
    return this.config !== null && !!this.config.apiKey
  }

  /**
   * Generate content using AI
   */
  async generateContent(prompt: AIPrompt): Promise<string> {
    console.log('🔍 AI Agent Debug - Starting generation...', {
      hasConfig: !!this.config,
      isInitialized: this.isInitialized(),
      provider: this.config?.provider,
      apiKeyLength: this.config?.apiKey?.length || 0,
      apiKeyPrefix: this.config?.apiKey ? `${this.config.apiKey.substring(0, 10)}...` : 'none'
    })

    if (!this.config || !this.isInitialized()) {
      const error = 'AI Agent not initialized. Please configure your API key in environment variables.'
      console.error('❌ AI Agent Debug - Not initialized:', { config: this.config })
      throw new Error(error)
    }

    try {
      console.log('🚀 AI Agent Debug - Calling provider:', this.config.provider)
      switch (this.config.provider) {
        case 'openai':
          return await this.generateWithOpenAI(prompt)
        case 'anthropic':
          return await this.generateWithAnthropic(prompt)
        case 'groq':
          return await this.generateWithGroq(prompt)
        case 'together':
          return await this.generateWithTogether(prompt)
        case 'huggingface':
          return await this.generateWithHuggingFace(prompt)
        case 'deepseek':
          return await this.generateWithDeepSeek(prompt)
        case 'custom':
          return await this.generateWithCustom(prompt)
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`)
      }
    } catch (error) {
      console.error('❌ AI generation error:', error)
      console.error('❌ Full error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        config: {
          provider: this.config?.provider,
          hasApiKey: !!this.config?.apiKey,
          apiKeyLength: this.config?.apiKey?.length || 0
        }
      })
      throw new Error(
        error instanceof Error 
          ? `AI generation failed: ${error.message}` 
          : 'AI generation failed. Please check your API key and try again.'
      )
    }
  }

  /**
   * Generate content using OpenAI API
   */
  private async generateWithOpenAI(prompt: AIPrompt): Promise<string> {
    if (!this.config) throw new Error('Config not set')

    const model = this.config.model || 'gpt-4o-mini'
    
    console.log('🚀 Calling OpenAI API...', { model, maxTokens: prompt.maxTokens })
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt.systemPrompt },
            { role: 'user', content: prompt.userPrompt },
          ],
          temperature: prompt.temperature ?? 0.7,
          max_tokens: prompt.maxTokens ?? 2000,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        const errorMessage = errorData.error?.message || `OpenAI API error: ${response.statusText}`
        console.error('❌ OpenAI API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || ''
      console.log('✅ OpenAI API Success:', { 
        model: data.model,
        tokensUsed: data.usage?.total_tokens,
        contentLength: content.length 
      })
      return content
    } catch (error) {
      console.error('❌ OpenAI API Request Failed:', error)
      throw error
    }
  }

  /**
   * Generate content using Anthropic Claude API
   */
  private async generateWithAnthropic(prompt: AIPrompt): Promise<string> {
    if (!this.config) throw new Error('Config not set')

    const model = this.config.model || 'claude-3-5-sonnet-20241022'
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: prompt.maxTokens ?? 2000,
        temperature: prompt.temperature ?? 0.7,
        system: prompt.systemPrompt,
        messages: [
          { role: 'user', content: prompt.userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw new Error(error.error?.message || `Anthropic API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.content[0]?.text || ''
  }

  /**
   * Generate content using Groq API (Free tier available, very fast!)
   */
  private async generateWithGroq(prompt: AIPrompt): Promise<string> {
    if (!this.config) throw new Error('Config not set')

    const model = this.config.model || 'llama-3.3-70b-versatile'
    
    console.log('🚀 Calling Groq API...', { 
      model, 
      maxTokens: prompt.maxTokens,
      apiKeyLength: this.config.apiKey.length,
      apiKeyPrefix: this.config.apiKey.substring(0, 10) + '...'
    })
    
    try {
      const requestBody = {
        model,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: prompt.userPrompt },
        ],
        temperature: prompt.temperature ?? 0.7,
        max_tokens: prompt.maxTokens ?? 2000,
      }

      console.log('📤 Groq Request Body:', {
        ...requestBody,
        messages: requestBody.messages.map(m => ({ role: m.role, contentLength: m.content.length }))
      })

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })

      console.log('📥 Groq Response Status:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        let errorMessage = errorData.error?.message || `Groq API error: ${response.statusText}`
        
        // User-friendly error messages
        if (errorMessage.includes('decommissioned') || errorMessage.includes('no longer supported')) {
          errorMessage = `Model "${model}" is no longer available. Try setting VITE_AI_MODEL=llama-3.3-70b-versatile or llama-3.1-8b-instant in your .env file.`
        } else if (response.status === 401) {
          errorMessage = 'Invalid Groq API key. Please check your API key in the .env file. Get a new key at https://console.groq.com/'
        } else if (response.status === 429) {
          errorMessage = 'Groq API rate limit exceeded. Please wait a moment and try again.'
        }
        
        console.error('❌ Groq API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          errorMessage
        })
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || ''
      
      console.log('✅ Groq API Success:', { 
        model: data.model,
        tokensUsed: data.usage?.total_tokens,
        contentLength: content.length,
        hasContent: !!content
      })

      if (!content) {
        console.error('❌ Groq returned empty content:', data)
        throw new Error('Groq API returned empty content. Please try again.')
      }

      return content
    } catch (error) {
      console.error('❌ Groq API Request Failed:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        config: {
          hasApiKey: !!this.config?.apiKey,
          apiKeyLength: this.config?.apiKey?.length,
          model
        }
      })
      throw error
    }
  }

  /**
   * Generate content using Together AI API (Free credits available)
   */
  private async generateWithTogether(prompt: AIPrompt): Promise<string> {
    if (!this.config) throw new Error('Config not set')

    const model = this.config.model || 'meta-llama/Llama-3-70b-chat-hf'
    
    console.log('🚀 Calling Together AI API...', { model, maxTokens: prompt.maxTokens })
    
    try {
      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt.systemPrompt },
            { role: 'user', content: prompt.userPrompt },
          ],
          temperature: prompt.temperature ?? 0.7,
          max_tokens: prompt.maxTokens ?? 2000,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        const errorMessage = errorData.error?.message || `Together AI API error: ${response.statusText}`
        console.error('❌ Together AI API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || ''
      console.log('✅ Together AI API Success:', { 
        model: data.model,
        tokensUsed: data.usage?.total_tokens,
        contentLength: content.length 
      })
      return content
    } catch (error) {
      console.error('❌ Together AI API Request Failed:', error)
      throw error
    }
  }

  /**
   * Generate content using Hugging Face Inference API (Free tier: 50 requests/hour)
   */
  private async generateWithHuggingFace(prompt: AIPrompt): Promise<string> {
    if (!this.config) throw new Error('Config not set')

    const model = this.config.model || 'mistralai/Mistral-7B-Instruct-v0.2'
    
    console.log('🚀 Calling Hugging Face API...', { model, maxTokens: prompt.maxTokens })
    
    try {
      // Hugging Face uses a different format - combine system and user prompts
      const fullPrompt = `${prompt.systemPrompt}\n\n${prompt.userPrompt}`
      
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: prompt.maxTokens ?? 2000,
            temperature: prompt.temperature ?? 0.7,
            return_full_text: false,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = typeof errorData === 'string' ? errorData : errorData.error || `Hugging Face API error: ${response.statusText}`
        console.error('❌ Hugging Face API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        throw new Error(errorMessage)
      }

      const data = await response.json()
      // Hugging Face returns array format
      const content = Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || ''
      console.log('✅ Hugging Face API Success:', { 
        model,
        contentLength: content.length 
      })
      return content
    } catch (error) {
      console.error('❌ Hugging Face API Request Failed:', error)
      throw error
    }
  }

  /**
   * Generate content using DeepSeek API (Free tier available!)
   */
  private async generateWithDeepSeek(prompt: AIPrompt): Promise<string> {
    if (!this.config) throw new Error('Config not set')

    const model = this.config.model || 'deepseek-chat'
    
    console.log('🚀 Calling DeepSeek API...', { model, maxTokens: prompt.maxTokens })
    
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt.systemPrompt },
            { role: 'user', content: prompt.userPrompt },
          ],
          temperature: prompt.temperature ?? 0.7,
          max_tokens: prompt.maxTokens ?? 2000,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        let errorMessage = errorData.error?.message || `DeepSeek API error: ${response.statusText}`
        
        // User-friendly error messages
        if (response.status === 402) {
          errorMessage = 'DeepSeek account has insufficient balance. Please add credits or switch to a free provider like Groq.'
        } else if (response.status === 401) {
          errorMessage = 'Invalid DeepSeek API key. Please check your API key in the .env file.'
        }
        
        console.error('❌ DeepSeek API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || ''
      console.log('✅ DeepSeek API Success:', { 
        model: data.model,
        tokensUsed: data.usage?.total_tokens,
        contentLength: content.length 
      })
      return content
    } catch (error) {
      console.error('❌ DeepSeek API Request Failed:', error)
      throw error
    }
  }

  /**
   * Generate content using a custom API endpoint (OpenAI-compatible)
   */
  private async generateWithCustom(prompt: AIPrompt): Promise<string> {
    if (!this.config || !this.config.baseURL) {
      throw new Error('Custom provider requires baseURL')
    }

    const model = this.config.model || 'gpt-3.5-turbo'
    const response = await fetch(`${this.config.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: prompt.userPrompt },
        ],
        temperature: prompt.temperature ?? 0.7,
        max_tokens: prompt.maxTokens ?? 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw new Error(error.error?.message || `Custom API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }
}

// Singleton instance
const aiAgent = new AIAgent()

/**
 * Initialize AI agent from environment variables
 */
export function initializeAIAgent(): void {
  const provider = (import.meta.env.VITE_AI_PROVIDER || 'groq') as AIProvider
  const apiKey = import.meta.env.VITE_AI_API_KEY || ''
  const model = import.meta.env.VITE_AI_MODEL
  const baseURL = import.meta.env.VITE_AI_BASE_URL

  console.log('🔧 Initializing AI Agent...', {
    provider,
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? `${apiKey.substring(0, 10)}...` : 'none',
    model: model || 'default',
  })

  if (!apiKey) {
    console.warn('⚠️ AI API key not found. Content generation will use fallback templates.')
    console.warn('💡 Create a .env file with VITE_AI_API_KEY=your_key_here')
    console.warn('💡 Free options:')
    console.warn('   - Groq: https://console.groq.com/ (Free tier, very fast!)')
    console.warn('   - DeepSeek: https://platform.deepseek.com/ (Free tier, generous limits!)')
    console.warn('   - Together AI: https://together.ai/ (Free credits)')
    console.warn('   - Hugging Face: https://huggingface.co/settings/tokens (50 req/hour free)')
    return
  }

  aiAgent.initialize({
    provider,
    apiKey,
    model,
    baseURL,
  })

  console.log('✅ AI Agent initialized successfully')
}

/**
 * Check if AI is available
 */
export function isAIAvailable(): boolean {
  return aiAgent.isInitialized()
}

/**
 * Generate content with AI (with fallback to templates)
 */
export async function generateWithAI(prompt: AIPrompt): Promise<string> {
  if (!isAIAvailable()) {
    throw new Error('AI not available. Please configure your API key.')
  }
  return await aiAgent.generateContent(prompt)
}

export default aiAgent


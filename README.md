# DocFlow - AI-Powered Documentation Workspace

DocFlow is an AI-powered workspace that helps solo creators and indie developers generate structured documentation (like PRDs, design prompts, and specifications) while also visualizing how their app or website pages connect.

## Features

✅ **Document Generation**
- AI-assisted generation of structured PRDs, design prompts, user stories, and specs
- Built-in templates for different document types
- Editable and exportable formats (PDF, DOCX, Markdown)

✅ **Visual Site Mapping**
- Interactive node-based interface to visualize page links
- Drag-and-drop functionality for repositioning nodes
- Multi-select via shift-click
- Context menu for editing and managing pages
- Zoom controls for better navigation

✅ **Modern UI**
- Minimal-professional design with warm gold/neutral palette
- Responsive layout with fixed header and sidebar
- Clean, intuitive interface following design brief specifications

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: TailwindCSS (customized with design brief colors)
- **Drag & Drop**: react-draggable
- **Export**: jsPDF, docx, marked

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure AI Agent (Required for AI-powered generation):
   
   Create a `.env` file in the root directory with your AI provider configuration:
   
   ```env
   # Choose your AI provider: 'openai', 'anthropic', or 'custom'
   VITE_AI_PROVIDER=openai
   
   # Your API key (get from provider's website)
   VITE_AI_API_KEY=your_api_key_here
   
   # Optional: Specify model (defaults to gpt-4o-mini for OpenAI, claude-3-5-sonnet-20241022 for Anthropic)
   VITE_AI_MODEL=
   
   # Optional: Base URL for custom providers (only if using custom)
   VITE_AI_BASE_URL=
   ```
   
   **Getting API Keys:**
   - **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Anthropic**: Get your API key from [Anthropic Console](https://console.anthropic.com/)
   - **Custom**: Use any OpenAI-compatible API endpoint
   
   **Note**: If no API key is configured, the app will use template-based fallback generation.

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── Dashboard/          # Main dashboard with project cards
│   ├── DocumentGeneration/ # Document generator interface
│   ├── Export/             # Export modal component
│   ├── Layout/             # Header, Sidebar, RightPane
│   └── SiteFlow/           # Site flow visualizer
├── utils/
│   ├── aiAgent.ts          # AI agent service (OpenAI, Anthropic, Custom)
│   ├── contentGenerator.ts # Content generation with AI fallback
│   ├── exportUtils.ts      # Export functions (PDF, DOCX, Markdown)
│   ├── siteFlowUtils.ts    # Site flow visualization utilities
│   └── storage.ts          # Local storage utilities
├── App.tsx                 # Main app component
└── main.tsx                # Entry point (initializes AI agent)
```

## Design System

### Colors
- Primary accent: Muted amber/warm gold (#D9A441)
- Base background: Light neutral (#FAFAF8)
- Text: Charcoal grey (#212121)
- Secondary/dividers: Mid grey (#BDBDBD)
- Positive action: Deep green (#3C6E47)

### Typography
- Headings: Inter or Source Sans Pro
- Body: Noto Sans or Work Sans

## AI Agent Configuration

The app includes a flexible AI agent system that supports multiple providers:

### Supported Providers

1. **OpenAI** (default)
   - Models: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
   - Fast and cost-effective for most use cases
   - **Pricing**: Pay per use

2. **Groq** ⭐ **FREE TIER AVAILABLE**
   - Models: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it`
   - **Very fast** inference (up to 10x faster than others!)
   - **Free tier**: Generous limits
   - Get API key: https://console.groq.com/

3. **DeepSeek** ⭐ **FREE TIER AVAILABLE**
   - Models: `deepseek-chat`, `deepseek-coder`
   - **Excellent quality** and **generous free tier**
   - **Free tier**: Very generous limits, great for production
   - OpenAI-compatible API
   - Get API key: https://platform.deepseek.com/

4. **Together AI** ⭐ **FREE CREDITS**
   - Models: `meta-llama/Llama-3-70b-chat-hf`, `mistralai/Mixtral-8x7B-Instruct-v0.1`
   - **Free credits** for new users
   - Get API key: https://together.ai/

5. **Hugging Face** ⭐ **FREE TIER**
   - Models: `mistralai/Mistral-7B-Instruct-v0.2`, `meta-llama/Llama-2-7b-chat-hf`
   - **Free tier**: 50 requests/hour
   - Get API key: https://huggingface.co/settings/tokens

6. **Anthropic Claude**
   - Models: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, `claude-3-haiku-20240307`
   - Excellent for detailed, thoughtful content generation
   - **Pricing**: Pay per use

7. **Custom Providers**
   - Any OpenAI-compatible API endpoint
   - Useful for self-hosted models or other providers

### How It Works

- The AI agent automatically initializes on app startup
- Content generators (`generatePRD`, `generateDesignPrompt`, etc.) use AI when available
- Falls back to template-based generation if AI is not configured
- All generation functions are async and handle errors gracefully

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_AI_PROVIDER` | Provider: `openai`, `groq`, `deepseek`, `together`, `huggingface`, `anthropic`, or `custom` | No | `deepseek` |
| `VITE_AI_API_KEY` | Your API key from the provider | Yes* | - |
| `VITE_AI_MODEL` | Specific model to use | No | Provider default |
| `VITE_AI_BASE_URL` | Custom API endpoint (for custom provider) | No | - |

**Recommended Free Setups:**

**Option 1: Groq (Fastest)**
```env
VITE_AI_PROVIDER=groq
VITE_AI_API_KEY=your_groq_api_key_here
```
Get your free Groq API key: https://console.groq.com/

**Option 2: DeepSeek (Best Quality/Free Ratio)**
```env
VITE_AI_PROVIDER=deepseek
VITE_AI_API_KEY=your_deepseek_api_key_here
```
Get your free DeepSeek API key: https://platform.deepseek.com/

*Required for AI generation, but app works with template fallback if not provided


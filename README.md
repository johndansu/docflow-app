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

2. Configure Supabase Authentication (Required):
   
   Create a `.env` file in the root directory with your Supabase credentials:
   
   ```env
   # Supabase Configuration (Required for authentication)
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # AI Agent Configuration (Optional - for AI-powered generation)
   VITE_AI_PROVIDER=groq
   VITE_AI_API_KEY=your_ai_api_key_here
   VITE_AI_MODEL=
   VITE_AI_BASE_URL=
   ```
   
   **Setting up Supabase:**
   1. Go to [Supabase](https://supabase.com) and create a free account
   2. Click **"New Project"** and fill in details (choose Free plan)
   3. Wait 2-3 minutes for project setup
   4. Go to **Project Settings → API**
   5. Copy your **Project URL** and **anon/public key**
   6. Add them to your `.env` file as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   7. Go to **SQL Editor** and run the SQL script from `SUPABASE_SETUP.md` to create the database table
   8. **Disable email confirmation** (for easier testing):
      - Go to **Authentication → Settings**
      - Under **Email Auth**, toggle **OFF** "Confirm email"
   9. Restart your dev server
   
   **Quick Setup Guide**: See `SUPABASE_QUICK_START.md` for detailed step-by-step instructions.
   
   **Important Notes**: 
   - ✅ **Each user has isolated storage** - Projects are automatically filtered by user (RLS policies ensure this)
   - ✅ **Email confirmation can be disabled** for development/testing (more comfortable)
   - ⚠️ Enable email confirmation for production (see `EMAIL_CONFIRMATION_GUIDE.md`)

3. Configure AI Agent (Optional - for AI-powered generation):
   
   **Getting API Keys:**
   - **Groq** (Recommended - Free): Get your API key from [Groq Console](https://console.groq.com/) (Free tier, very fast!)
   - **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Anthropic**: Get your API key from [Anthropic Console](https://console.anthropic.com/)
   - **DeepSeek**: Get your API key from [DeepSeek Platform](https://platform.deepseek.com/)
   - **Custom**: Use any OpenAI-compatible API endpoint
   
   **Note**: If no AI API key is configured, the app will use template-based fallback generation.

4. Start the development server:
```bash
npm run dev
```

5. Build for production:
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


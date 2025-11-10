import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'
import { initializeAIAgent } from './utils/aiAgent'

// Initialize AI agent on app startup
initializeAIAgent()

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


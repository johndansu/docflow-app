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

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
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
│   └── exportUtils.ts      # Export functions (PDF, DOCX, Markdown)
├── App.tsx                 # Main app component
└── main.tsx                # Entry point
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

## Next Steps

To integrate with a real AI API:
1. Replace the mock content generation in `DocumentGenerator.tsx` with actual API calls
2. Add authentication if needed
3. Set up backend API endpoints
4. Add database for persistent storage


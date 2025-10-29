# BMAD V4 Frontend

React + Vite + Tailwind CSS v4 application for lead qualification and management.

## Tech Stack

- **React 18** - UI Framework
- **Vite 5** - Build Tool
- **Tailwind CSS v4** - Styling (CSS-first configuration)
- **React Router 6** - Navigation
- **Axios** - API Client
- **Lucide React** - Icons
- **Recharts** - Charts & Analytics

## Magnificent Worldwide Brand Styling

✨ **Brand Colors:**
- Primary Blue: `#3b82f6`
- Accent Gold: `#facc15`
- Background: Dark slate (`#0f172a`)

🎨 **Typography:**
- Headings: Orbitron (techy, futuristic)
- Body: Poppins (clean, readable)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Runs at http://localhost:3500

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
VITE_API_URL=http://localhost:3550/api
```

## Tailwind CSS v4 Configuration

Tailwind v4 uses **CSS-first configuration** via the `@theme` directive in `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-primary-500: #3b82f6;
  --color-accent-400: #facc15;
  --font-heading: "Orbitron", sans-serif;
  --font-body: "Poppins", sans-serif;
}
```

No `tailwind.config.js` needed!

## Project Structure

```
frontend/
├── public/
├── src/
│   ├── assets/           # Images, fonts, etc.
│   ├── components/       # React components
│   │   ├── common/       # Shared components
│   │   ├── dashboard/    # Dashboard components
│   │   ├── leads/        # Lead management
│   │   ├── voice/        # Voice controls
│   │   └── analytics/    # Analytics & reports
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── utils/            # Utility functions
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles + Tailwind v4 config
├── .env.example          # Environment template
├── package.json
├── vite.config.js
├── postcss.config.js     # Tailwind v4 PostCSS plugin
└── README.md
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Component Styling Pattern

Use Tailwind v4's utility classes with brand variables:

```jsx
<div className="card">
  <h2 className="gradient-text">Welcome</h2>
  <button className="btn-primary">Get Started</button>
</div>
```

## Agents Assigned

- **Michael Park** - Frontend Lead (Foundation)
- **Emma Johnson** - Call Monitoring UI
- **James Taylor** - Lead Management UI
- **Priya Patel** - Voice Control UI
- **Angela White** - Analytics & Reports UI

## Next Steps

1. Run `npm install` to install dependencies
2. Create `.env.local` from `.env.example`
3. Run `npm run dev` to start development server
4. Begin building components in `src/components/`

## Documentation

For detailed component documentation and development guidelines, see the project wiki.

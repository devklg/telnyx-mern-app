# BMAD V4 Frontend

React + Vite + Tailwind CSS application for lead qualification and management.

## Tech Stack

- **React 18** - UI Framework
- **Vite** - Build Tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - API Client
- **Lucide React** - Icons
- **Recharts** - Charts & Analytics

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

Runs at http://localhost:3000

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
VITE_API_URL=http://localhost:5000/api
```

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
│   └── index.css         # Global styles
├── .env.example          # Environment template
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

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
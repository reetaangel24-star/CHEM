# VR ChemLab — AI-Powered Virtual Chemistry Laboratory

A complete VR chemistry learning platform with interactive 3D experiments, AI tutor, student dashboards, and comprehensive admin controls.

## Quick Start

### Prerequisites
- Node.js 16+ and npm installed
- Supabase account configured (URL and keys in `.env`)

### Installation & Running

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev

# Open in browser (typically http://localhost:5173)
```

The app will automatically open. No build step needed for development.

## Project Structure

```
src/
├── pages/
│   ├── AuthPage.tsx          # Login/Register
│   ├── StudentDashboard.tsx   # Student portal (experiments, progress, attendance)
│   ├── AdminDashboard.tsx     # Admin panel (analytics, experiment creation, management)
│   └── LabPage.tsx            # Interactive 3D chemistry lab with AI tutor
├── components/
│   └── ThreeLabCanvas.tsx     # Three.js 3D rendering
├── context/
│   └── AuthContext.tsx        # Supabase authentication & session management
├── lib/
│   └── supabase.ts            # Supabase client + types
└── App.tsx                    # Main routing
```

## Features

### 👨‍🎓 Student Portal
- **Dashboard**: Overview of scores, sessions, and available experiments
- **Experiments**: Browse and enter 3D chemistry labs
- **Lab Interface**: Step-by-step guided procedures with AI tutor chat
- **Attendance**: Auto-tracked lab sessions
- **Progress Tracking**: Score history, completion rates
- **PDF Export**: Download experiment reports

### 👨‍🏫 Admin Portal  
- **Overview**: 7-day activity charts, top performers, experiment engagement
- **Attendance Tracking**: Searchable sessions, CSV export
- **Student Management**: Performance metrics, activity status
- **Experiment Creation**: Add custom experiments with full details:
  - Title, description, category, difficulty
  - Learning objectives
  - Chemicals and equipment lists
  - Step-by-step procedures
  - Safety precautions
- **Reports**: Analytics, score distribution, system alerts
- **Data Export**: CSV and TXT report generation

### 🧪 Virtual Lab Features
- **3D Chemistry Setup**: Interactive beakers, burettes, test tubes, flasks
- **Real-time Reactions**: Color changes, temperature tracking, gas/precipitate indicators
- **AI Tutor**: Context-aware chemistry guidance
- **Step Tracking**: Progress through guided experiment procedures
- **Scoring System**: Automatic evaluation based on completion and efficiency
- **Hint System**: On-demand help from AI
- **Session Logging**: All interactions recorded

## Authentication

### Create Accounts
1. **Students**: Click "Register" on login page, fill student details
2. **Admins**: Register as student, then run in Supabase SQL editor:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE student_id = 'STUDENT_ID_HERE';
   ```

### Test Credentials
Admin creation example:
- Register with email, password, name, student ID (e.g., "ADMIN001")
- Set role to admin via SQL command above
- Login and access admin dashboard

## Database Schema

**Tables:**
- `profiles` — Users with role (student/admin)
- `experiments` — Chemistry lab definitions
- `attendance_sessions` — Lab entry/exit logs
- `experiment_results` — Completed experiment scores
- `ai_interactions` — Chat logs with AI tutor

All tables have Row Level Security (RLS) enabled.

## Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

Output in `dist/` folder. Deploy to any static hosting (Vercel, Netlify, etc.).

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, React Router
- **3D Graphics**: Three.js
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Build Tool**: Vite
- **Icons**: Lucide React

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Mobile browsers (iOS Safari 15+, Chrome Android)

## Environment Variables

Create `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run typecheck # TypeScript check
npm run lint      # ESLint check
npm run preview   # Preview production build
```

## Roadmap

- [ ] WebXR support (VR headsets)
- [ ] Voice recognition for commands
- [ ] Multiplayer lab sessions
- [ ] AR mode
- [ ] Advanced AI with ML predictions
- [ ] Automated report generation
- [ ] Video tutorials
- [ ] Mobile app (React Native)

## License

Educational Use - Final Year Project

---

**Start developing:** `npm run dev`

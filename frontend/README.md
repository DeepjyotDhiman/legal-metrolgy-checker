# TriNetra — Frontend

React + TypeScript + Vite frontend for the **TriNetra Legal Metrology Packaged Commodity Inspection System**.

---

## Requirements

| Tool | Minimum version |
|------|----------------|
| Node.js | 18.x |
| npm | 9.x |

---

## Installation

```bash
cd frontend
npm install
```

---

## Environment variables

Copy `.env.example` to `.env` and set:

```env
# URL of the running FastAPI backend (no trailing slash)
VITE_API_BASE_URL=http://localhost:8000
```

> **Note:** The Vite dev server automatically proxies `/api/*` requests to `VITE_API_BASE_URL`,  
> so you do **not** need to configure CORS in the backend for local development.  
> The backend already allows `http://localhost:5173` by default.

---

## Running the development server

```bash
npm run dev
```

Opens at **http://localhost:5173**.  
Sign in with the dev credentials configured in `backend/.env` (`DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`).

---

## Production build

```bash
npm run build
```

Output is in `frontend/dist/`.  
Serve it with any static file server, or via the FastAPI backend using `StaticFiles`.

---

## Type checking

```bash
npm run build   # tsc runs as part of vite build
```

---

## Project structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx          # Root component (BrowserRouter + AuthProvider)
│   │   └── routes.tsx       # All route definitions
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx     # Sidebar + Header + <Outlet>
│   │   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   │   └── Header.tsx       # Top bar with user info & logout
│   │   ├── common/
│   │   │   └── ProtectedRoute.tsx  # Auth guard wrapper
│   │   └── ui/              # (empty – ready for shared UI components)
│   │
│   ├── pages/
│   │   ├── Login/           # /login
│   │   ├── Dashboard/       # /dashboard
│   │   ├── Inspections/     # /inspections
│   │   ├── NewInspection/   # /inspections/new
│   │   ├── InspectionDetail/ # /inspections/:id
│   │   └── Reports/         # /reports, /reports/:id
│   │
│   ├── services/            # ALL API communication lives here
│   │   ├── api.ts           # Central Axios instance (withCredentials)
│   │   ├── auth.ts          # login / me / logout
│   │   ├── inspections.ts   # list / create / detail / update / delete / upload / analyze
│   │   ├── ocr.ts           # OCR result retrieval
│   │   └── compliance.ts    # checks / dashboard summary / reports
│   │
│   ├── hooks/
│   │   └── useAuth.tsx      # AuthContext + useAuth() hook
│   │
│   ├── types/               # TypeScript interfaces mirroring backend schemas
│   │   ├── auth.ts
│   │   ├── inspection.ts    # Inspection, Image, OCR, ExtractedField, Compliance, Review
│   │   ├── ocr.ts
│   │   └── compliance.ts    # Dashboard, Report
│   │
│   ├── utils/               # (empty – ready for helpers)
│   ├── styles/
│   │   ├── globals.css      # Reset, layout classes, form components
│   │   └── variables.css    # CSS custom properties / design tokens
│   └── main.tsx             # Entry point
│
├── public/
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts           # Dev proxy: /api → FastAPI backend
```

---

## API / Backend connection

- The backend runs on **http://localhost:8000** (default)
- The frontend uses **cookie-based session auth** (no JWT in localStorage)
- The Axios client sends `withCredentials: true` on every request
- On a `401` the client auto-redirects to `/login`

---

## Auth flow

1. User visits any protected route → redirected to `/login`
2. User submits credentials → `POST /api/v1/auth/login`
3. Backend sets `trinetra_session` HTTP-only cookie
4. Subsequent requests include the cookie automatically
5. On refresh, `GET /api/v1/auth/me` restores the session
6. Logout calls `POST /api/v1/auth/logout` and clears state

---

## Notes for OM (frontend developer)

- All API calls go through `src/services/` — **never** use `fetch`/`axios` directly in components
- Use `useAuth()` to access `user`, `isAuthenticated`, `login`, `logout`
- Placeholder pages are in `src/pages/` — implement final UI inside them
- CSS custom properties (colours, spacing, typography) are in `src/styles/variables.css`
- The Vite proxy makes it easy to test against the real backend without touching CORS
- Run the backend first (`uvicorn app.main:app --reload` inside `backend/`), then `npm run dev`

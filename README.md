# OMS (Office Management System) – Enterprise Mobile & Web Platform

> **Purpose:** Central entry point and master README for the OMS Platform workspace.  
> **Audience:** Core Engineers, Onboarding Developers, DevOps & QA Engineers.  
> **Owner:** Lead Mobile Architect & Core Platform Engineering Team.  
> **Last Updated:** July 20, 2026  
> **Related Modules:** `src/` (Next.js web app + Express API), `mobile/`, `docs/`  

---

## 🌐 Web App + API (Next.js)

The web dashboard and the REST/Socket.IO API run as **one Node server** (`server.js`): Next.js (App Router)
serves the web app, Express serves `/api/*`, and Socket.IO runs on the same port. The mobile app keeps
calling the same `/api/v1` endpoints.

```
server.js                 single entry: Next.js + Express API + Socket.IO (+ background jobs)
next.config.mjs           Next.js config (redirects, headers, bundle optimizations)
public/                   static files (service worker, sounds, icons)
src/
├── app/                  Next.js routes (App Router) — one folder per URL
│   ├── layout.jsx        <html>, fonts, metadata
│   ├── login/            /login
│   ├── (app)/            authenticated shell (sidebar + topbar)
│   │   ├── (guarded)/    role-checked module pages: /employees, /attendance, /kpi, …
│   │   └── unauthorized/
│   └── superadmin/       super admin console
├── layouts/              client layouts used by src/app (providers, guards, shells)
├── views/                page components (previously frontend/src/pages)
├── components/ context/ hooks/ lib/ services/ utils/ permissions/ styles/ data/ assets/
│   └── lib/router.jsx    react-router-compatible API on top of the Next.js router
└── server/               Express API (previously backend/src): modules, middlewares, jobs, config
tests/server/             backend tests (⚠ they connect to the DB in .env — see below)
logs/                     runtime logs (error_trace.log, audit.json) — git-ignored
docs/legacy/              old Vite/Express entry files kept for reference
```

| Command | What it does |
| :--- | :--- |
| `npm install` | Install web + API dependencies (root) |
| `npm run dev` | Dev server on `http://localhost:5000` (Next.js HMR; restarts on API changes) |
| `npm run build` | Production build of the web app |
| `npm start` | Production server (`node server.js --prod`) — run `npm run build` first |

Environment variables live in the root `.env` (see `.env.example`). Set `BACKGROUND_JOBS=false` on any extra
instance that shares the same database so scheduled jobs don't run twice.

> ⚠ The backend tests in `tests/server/` connect to the database configured in `.env` and delete records.
> Never run them against a real database.

### Deploying

The API, Socket.IO and background jobs need a long-running Node server — **Vercel cannot run them**.

1. **Backend (required)** — Render → *New → Blueprint* → this repo (uses `render.yaml`). Fill in the secret
   values from `.env` and set `CLIENT_URL` to the web app's public URL (e.g. `https://oms-five-peach.vercel.app`).
   This one service also serves the full web app at its own URL.
2. **Web app on Vercel (optional)** — in the Vercel project set `NEXT_PUBLIC_API_URL` to the Render URL
   (e.g. `https://oms.onrender.com`; the old `VITE_API_URL` name also works) and redeploy.
3. **Mobile app** — `EXPO_PUBLIC_API_URL` in `mobile/.env.*` must point at the same backend URL.

---

## 🚀 Quick Navigation

| Resource | Path | Description |
| :--- | :--- | :--- |
| **Mobile App README** | [`mobile/README.md`](file:///r:/OMS/mobile/README.md) | Mobile workspace guide, scripts, and setup |
| **Architecture Guide** | [`docs/ARCHITECTURE.md`](file:///r:/OMS/docs/ARCHITECTURE.md) | High-level system architecture, ADRs, & data flows |
| **API Documentation** | [`docs/API_DOCUMENTATION.md`](file:///r:/OMS/docs/API_DOCUMENTATION.md) | REST APIs & Socket.IO event specifications |
| **Component & Design System** | [`docs/COMPONENT_AND_DESIGN_SYSTEM.md`](file:///r:/OMS/docs/COMPONENT_AND_DESIGN_SYSTEM.md) | UI design tokens, components & dark mode guide |
| **Developer Onboarding** | [`docs/DEVELOPER_ONBOARDING.md`](file:///r:/OMS/docs/DEVELOPER_ONBOARDING.md) | 30-minute setup, coding standards & conventions |
| **Deployment & Release** | [`docs/DEPLOYMENT_AND_RELEASE.md`](file:///r:/OMS/docs/DEPLOYMENT_AND_RELEASE.md) | Expo EAS, Render backend, & OTA update playbook |
| **Troubleshooting & ADRs** | [`docs/TROUBLESHOOTING_AND_ADR.md`](file:///r:/OMS/docs/TROUBLESHOOTING_AND_ADR.md) | Known issues, root causes, & decision records |
| **Documentation Scorecard** | [`docs/DOCUMENTATION_SCORECARD.md`](file:///r:/OMS/docs/DOCUMENTATION_SCORECARD.md) | Quality scorecard & PRD coverage report |

---

## 🎯 Platform Overview

OMS is a modern, multi-tenant enterprise Office Management System designed to handle workforce attendance, payroll calculation, leave approvals, real-time messaging, WebRTC calls, and document management seamlessly across mobile (iOS & Android) and web clients.

```
                  ┌─────────────────────────────────────────┐
                  │            OMS Mobile App               │
                  │   React Native (Expo 54), TypeScript    │
                  └────────────────────┬────────────────────┘
                                       │  HTTPS / WSS
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │           Render Production API         │
                  │       Node.js, Express, Socket.IO       │
                  └───────────┬─────────────────┬───────────┘
                              │                 │
                              ▼                 ▼
                  ┌─────────────────┐     ┌───────────┐
                  │ PostgreSQL / DB │     │  Redis    │
                  └─────────────────┘     └───────────┘
```

---

## 🛠 Tech Stack

- **Mobile Client:** React Native (`v0.81.5`), Expo SDK 54, TypeScript (`v5.9.2`), Expo Router v6
- **State & Caching:** Zustand v5, TanStack React Query v5
- **Real-Time Communication:** Socket.io-client (`v4.8.3`), `react-native-webrtc`
- **Backend API:** Node.js, Express, Socket.IO Server, PostgreSQL, Redis
- **Storage:** ImageKit API for media management
- **UI Components:** Lucide Icons, Expo Vector Icons, FlashList, Reanimated

---

## ⚡ 30-Minute Local Quickstart

### Prerequisites
- Node.js `v20.x` or higher
- `npm` `v10.x` or higher
- Expo Go app or Android Studio / Xcode for native emulator execution

### Step 1: Install Workspace Dependencies
```bash
npm install
cd mobile && npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env.local` inside `mobile/`:
```bash
cp mobile/.env.example mobile/.env.local
```

Ensure `.env.local` points to the Render backend URL or local dev server:
```env
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_URL=https://oms-xdcz.onrender.com
EXPO_PUBLIC_ENABLE_LOGGER=true
```

### Step 3: Start Mobile App
```bash
cd mobile
npm run start
```
Press `a` to open in Android Emulator, `i` for iOS Simulator, or scan the QR code using Expo Go.

---

## 📋 Common Scripts

| Command | Working Directory | Description |
| :--- | :--- | :--- |
| `npm run start` | `mobile/` | Start Metro bundler with Expo CLI |
| `npm run android` | `mobile/` | Launch app on connected Android emulator/device |
| `npm run ios` | `mobile/` | Launch app on iOS simulator |
| `npm run web` | `mobile/` | Run app in browser mode |
| `npx tsc --noEmit` | `mobile/` | Run static TypeScript compiler check |
| `npm run test` | `mobile/` | Run Jest unit and component test suites |

---

## 🏛 Multi-Tenant Architecture & Security

Every outgoing HTTP request and WebSocket handshake contains mandatory tenant isolation headers:
- `Authorization: Bearer <JWT_TOKEN>`
- `x-tenant-id: <COMPANY_ID>`
- `x-device-id: <DEVICE_ID>`

This guarantees strict multi-tenant data separation at the database, socket room, and query levels.

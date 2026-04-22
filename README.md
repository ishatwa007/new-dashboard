# Scaler Refund Audit Dashboard

FastAPI + Google Sheets powered dashboard for auditing refunds, approvals, mentor no-shows, and classroom health.

> **Status:** This README was updated on 2026-04-22 to match the current repo layout and backend API (v3.0.0).

## Contents
- [Repo structure](#repo-structure)
- [Features / Pages](#features--pages)
- [Local setup (Windows / macOS / Linux)](#local-setup-windows--macos--linux)
- [Configuration (.env)](#configuration-env)
- [Run](#run)
- [Verify](#verify)
- [Backend API endpoints](#backend-api-endpoints)
- [Troubleshooting](#troubleshooting)

---

## Repo structure

```
new-dashboard/
├── backend/
│   ├── main.py                 # FastAPI app (API v3.0.0)
│   ├── config.py               # Env + sheet-id config loader
│   ├── requirements.txt
│   ├── .env.example
│   └── services/
│       ├── analytics_engine.py
│       ├── cleaner.py
│       ├── sheets_loader.py
│       ├── reason_classifier.py
│       ├── lsm_loader.py
│       ├── program_health.py
│       ├── mentor_loader.py
│       └── cache.py
└── frontend/
    ├── Refund Audit Dashboard.html
    └── src/
        ├── api.js              # Backend client (60s timeout, retry on 503)
        ├── analytics.jsx       # Page 1
        ├── requests.jsx        # Page 2
        ├── mentor.jsx          # Page 3
        ├── classroom.jsx       # Page 4
        ├── settings.jsx        # Settings (PostSales tracker config helper)
        ├── chrome.jsx          # Sidebar + Header
        ├── ui.jsx
        ├── data.js             # Mock fallback data
        ├── app.jsx             # Root shell + keyboard shortcuts
        └── styles.css
```

---

## Features / Pages

| Page | Nav / Shortcut | What it shows |
|---|---|---|
| Analytics | `1` | GTN, refund rates, PSA performance, AI-classified reasons |
| Requests | `2` | Refund approval queue (approve/reject writes back to Google Sheet) |
| Mentor | `3` | Mentor tracking + no-shows |
| Classroom | `4` | Batch ratings + low raters (uses Post Sales tracker per cohort) |
| Settings | Sidebar | Post Sales tracker mapping + cohort helpers |

> Note: the frontend is a static HTML app that loads React via CDN and uses Babel in-browser (dev-friendly, not optimized for production bundling).

---

## Local setup (Windows / macOS / Linux)

### Prerequisites
- Python 3.10+ recommended
- Access to the Google Sheets and a Google service account JSON key

### Backend

```bash
cd backend
python -m venv venv
# Windows PowerShell
#   .\venv\Scripts\Activate.ps1
# macOS/Linux
#   source venv/bin/activate
pip install -r requirements.txt

# Create env file
# Windows: copy .env.example .env
# macOS/Linux: cp .env.example .env
```

Edit `backend/.env` (see next section).

Start the backend:

```bash
cd backend
# (activate venv first)
python -m uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
python -m http.server 3000
```

Open: `http://localhost:3000/Refund%20Audit%20Dashboard.html`

---

## Configuration (.env)

Copy `backend/.env.example` to `backend/.env` and set the values.

### Required
- `GOOGLE_KEY_FILE` **or** `GOOGLE_CREDENTIALS`
- `SHEET_FUNNEL_ID`
- `SHEET_PERSONA_ID`
- `SHEET_LSM_ID`
- `GROQ_API_KEY` (AI reason classification)

### Optional
- `SHEET_MENTOR_ID` (mentor sheet; if omitted, backend falls back to its default)
- `SLACK_WEBHOOK_URL` (Page 3 notifications; optional)
- `CACHE_TTL_MINUTES` (default 15)
- `FRONTEND_URL` (CORS; default `*` for local dev)
- `SHEET_POSTSALES_ID` and/or additional `SHEET_POSTSALES_*` env vars
  - Default cohort mapping includes `april2026` via `SHEET_POSTSALES_ID`.
  - To add a tracker for a new cohort, add an env var like:
    - `SHEET_POSTSALES_MAY2026=...`

### Google Sheets permissions
Share the relevant Google Sheets with the **service account email inside your JSON key** ("client_email").
- Viewer is enough for read-only sheets
- Editor is needed for the Requests/LSM sheet if you want approve/reject to write back

---

## Run
1. Start backend on port 8000
2. Start frontend on port 3000

---

## Verify

Backend health:

```bash
curl http://localhost:8000/health
```

If the funnel is loaded you should see a non-zero `funnel_rows`.

If you get HTTP 503 from analytics endpoints, the backend is still warming up (frontend retries 503 automatically).

---

## Backend API endpoints

Core
- GET `/health`
- GET `/cohorts`
- POST `/refresh` (invalidate caches + queue funnel refresh)

Analytics (Page 1)
- GET `/analytics/{cohort_id}`
- GET `/analytics/{cohort_id}?refresh=true` (invalidate analytics cache for that cohort)
- GET `/api/psas/{cohort_id}`
- GET `/api/lsm-stats?cohort=april2026`

Requests (Page 2)
- GET `/api/requests?cohort=april2026`
- POST `/api/requests/approve`
- POST `/api/requests/reject`
- POST `/api/classify`

Mentor (Page 3)
- GET `/api/mentor/noshows/{cohort_id}`

Debug
- GET `/debug-sheets`
- GET `/debug-lsm`
- GET `/debug-persona/{cohort_id}`

---

## Troubleshooting

### `GET /health` shows `funnel_rows: 0`
The service account does not have access to the Funnel sheet. Share the funnel sheet with the service account email in your key file ("client_email").

### Frontend times out / can't reach backend
- Confirm backend: `curl http://localhost:8000/health`
- Confirm frontend is served from port 3000 (not 5173)
- If you changed ports, update `window.API_BASE` in `frontend/Refund Audit Dashboard.html`

### Reasons show all as "Other"
Persona tab for that cohort likely has no reason text (or the expected reason columns are missing). Use:
- `GET /debug-persona/{cohort_id}`

### Program Health / Mentor pages show empty data
Ensure the relevant tabs exist in the LSM / mentor sheets and that the service account has access (and edit access where writing is required).

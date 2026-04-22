# Scaler Refund Audit Dashboard — Final Build

Complete merged build with **all 3 pages** wired to live Google Sheets + Groq AI classification.

---

## What's in this zip

```
scaler-dashboard/
├── backend/
│   ├── main.py                          # FastAPI — all 3 pages routed
│   ├── config.py                        # Env + key file loader
│   ├── requirements.txt
│   ├── .env.example
│   └── services/
│       ├── analytics_engine.py          # Rate/GTN rules applied
│       ├── cleaner.py                   # Clean Google Sheets rows
│       ├── sheets_loader.py             # Tries "Raw" tab first
│       ├── reason_classifier.py         # Groq AI + keyword fallback
│       ├── lsm_loader.py                # Requests sheet reader/writer
│       ├── classifier.py                # Request body classifier
│       ├── program_health.py            # Page 3 router
│       └── cache.py                     # In-memory TTL cache
└── frontend/
    ├── Refund Audit Dashboard.html
    └── src/
        ├── api.js                       # 60s timeout, retry on 503, all pages
        ├── data.js                      # Mock fallback data
        ├── ui.jsx                       # Shared icons + helpers
        ├── chrome.jsx                   # Sidebar (3 tabs) + Header
        ├── analytics.jsx                # Page 1 — GTN only in Program/AVP
        ├── requests.jsx                 # Page 2 — approvals
        ├── program.jsx                  # Page 3 — Program Health
        ├── settings.jsx                 # Settings page
        ├── app.jsx                      # Root shell, keyboard shortcuts 1/2/3
        └── styles.css                   # Plus Jakarta Sans, premium polish
```

---

## Deploy Steps (Windows PowerShell)

### 1. Delete old files, extract this zip

Extract `scaler-dashboard-final.zip` to e.g. `C:\Users\IshatwaChaubey\Downloads\scaler-dashboard\`.

### 2. Set up backend

```powershell
cd C:\Users\IshatwaChaubey\Downloads\scaler-dashboard\backend

# Copy env template and edit it
copy .env.example .env
notepad .env
```

In `.env`, set:
- `GOOGLE_KEY_FILE` — full path to your service account JSON key (already downloaded)
- `GROQ_API_KEY` — your Groq API key for AI reason classification

Save and close.

### 3. Install Python deps

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 4. Share Google Sheets with the service account

If not already done, share these 4 sheets with `scaler-reader@scaler-dashboard.iam.gserviceaccount.com` (Viewer access is enough, Editor needed for the Requests sheet if you want approve/reject to write back):

- **Refunds Funnel** — `1FSyE9GXB7yrWZ6DVElzNykcnlGr7bYEY3c5k_fs1NV4`
- **Persona Tracking** — `1pgf3eruMcWCDWIZBeDzt1MPm75w0dVyhx4OAvJTj-ls`
- **LSM Tracker** — `1-83qFsRBEXGQGyHPdmmhbd9Gx1aACSRlM7OxHtRnE9w` (Editor)
- **Post Sales Apr26 Tracker** — `1QafI9LO7o2UvS3Uk6djwX5XsljLeSHu8ToWsvND2bRs`

### 5. Start the backend

```powershell
cd C:\Users\IshatwaChaubey\Downloads\scaler-dashboard\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --port 8000
```

Wait 30-60 seconds for "Funnel refreshed: 6717 rows" message.

Verify in a new terminal:
```powershell
curl http://localhost:8000/health
```

Should return `funnel_rows: 6717`.

### 6. Start the frontend (in a new terminal)

```powershell
cd C:\Users\IshatwaChaubey\Downloads\scaler-dashboard\frontend
python -m http.server 3000
```

Open in Chrome: **http://localhost:3000/Refund Audit Dashboard.html**

---

## Pages

| Page | Shortcut | What it shows |
|---|---|---|
| Analytics | `1` | GTN, refund rates, PSA performance, AI-classified reasons |
| Requests | `2` | Refund approval queue (password: **2026**) |
| Program Health | `3` | Class incidents, low-rated classes, mentor tracking |

---

## Key Rules Applied

### GTN vs Rate
- **GTN shown**: Overall cohort KPI strip, Program table, AVP level only
- **Rate only**: BDM, BDA, PSA, Weeks, Sources

### PSA Table
Shows: Assigned · Complete · Refund Requested · Refunded · Retained · Retained % · Rate
Retained % = Retained count ÷ Requested from complete

### Refund Reasons
AI classification via Groq (llama-3.1-8b-instant):
1. Pulls all refund-requested emails from funnel
2. Matches with Persona sheet (Apr26 tab) for free-text reasons
3. Groq classifies each reason into 8 canonical buckets
4. Keyword fallback if Groq API is down
5. Results cached to disk (`classifier_cache/`) so same reason never re-classified
6. Emails without reasons filed yet → "Other" bucket

Canonical buckets:
- Financial constraints / EMI
- Time constraints / workload
- First call refund / pre-MnG
- Career / program misalignment
- Medical / personal emergency
- Push sale / enrollment regret
- Constant DNP / no engagement
- Other

---

## Troubleshooting

### Backend shows `funnel_rows: 0`
Service account missing access to the Funnel sheet. Share it with the email above.

### Frontend can't reach backend (timeout / CORS)
Both must be running. Check:
- Backend on 8000: `curl http://localhost:8000/health`
- Frontend on 3000 (not 5173)

### Reasons show all as "Other"
Persona sheet (Apr26 tab) has no filled-in reasons yet. Fill the "Identified Refund Reason" column.

### Page 3 shows mock data
LSM sheet missing "Program Incidents", "Class Tracker", or "Ratings Sheet" tabs. Create them in the LSM sheet `1-83qFsRBEXGQGyHPdmmhbd9Gx1aACSRlM7OxHtRnE9w`.

### Groq API key not working
Get a free one from https://console.groq.com/keys and paste into `.env` as `GROQ_API_KEY=gsk_...`

---

## Backend Endpoints

| Endpoint | Purpose |
|---|---|
| GET `/health` | Sanity check |
| GET `/cohorts` | List all cohorts |
| GET `/analytics/{cohort_id}` | Full analytics for a cohort |
| GET `/api/psas/{cohort_id}` | PSA breakdown |
| GET `/api/requests?cohort=...` | Open refund requests |
| POST `/api/requests/approve` | Approve (writes back to sheet) |
| POST `/api/requests/reject` | Reject (writes back to sheet) |
| GET `/api/program/health` | Page 3 data |
| POST `/api/program/resolve` | Resolve incident |
| POST `/api/program/escalate` | Escalate incident |
| GET `/debug-sheets` | List funnel sheet tabs |
| GET `/debug-lsm` | List LSM sheet tabs |

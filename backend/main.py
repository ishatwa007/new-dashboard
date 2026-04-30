"""
main.py - Scaler Refund Analytics API v3.0
Pages 1 (Analytics), 2 (Requests), 3 (Program Health) - all wired up.
CORS enabled. Google Sheets based. Groq AI classification.
"""

import os
import logging
import asyncio
import time
from contextlib import asynccontextmanager

import pandas as pd
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import (
    FRONTEND_URL, CACHE_TTL_MINUTES,
    COHORT_ORDER, COHORT_LABELS, COHORT_SHEET_MAP,
    SHEET_LSM_ID,
)
from services import cache
from services.sheets_loader import (
    load_funnel_df, load_persona_sheet, get_available_cohorts, _get_client,
)
from services.analytics_engine import build_cohort_analytics, compute_psas
from services.oms_loader import init_oms, load_oms_refunds
from services.lsm_loader import (
    load_requests, approve_request, reject_request, load_dump_summary,
)
from services.classifier import classify_request
from services.program_health import router as program_router, init as init_program, set_funnel_lookup
from services.mentor_loader import init_mentor, load_noshows
from services.mentor_backend_loader import init_mentor_backend, load_mentor_backend

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


# -- Global state -------------------------------------------------------------

class _State:
    funnel_df: pd.DataFrame = pd.DataFrame()
    loaded_at: float = 0.0
    gc = None

_state = _State()


# -- Pydantic models ----------------------------------------------------------

class ApproveRequest(BaseModel):
    request_id: str
    note: str
    manager: str = "Manager"

class RejectRequest(BaseModel):
    request_id: str
    reason: str
    manager: str = "Manager"

class ClassifyRequest(BaseModel):
    body: str
    request_type: str = ""


# -- Funnel refresh -----------------------------------------------------------

async def _refresh_funnel():
    try:
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(None, load_funnel_df)
        _state.funnel_df = df
        _state.loaded_at = time.time()
        # Keep program_health's email->PSA/BDA/AVP lookup fresh
        set_funnel_lookup(df)
        logger.info(f"Funnel refreshed: {len(df)} rows")
    except Exception as e:
        logger.error(f"Funnel refresh failed: {e}")


def _get_gc():
    if _state.gc is None:
        _state.gc = _get_client()
    return _state.gc


# -- App setup ----------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading Refunds Funnel on startup...")
    await _refresh_funnel()
    # Initialize Program Health with shared client
    try:
        init_program(_get_gc(), SHEET_LSM_ID)
        init_mentor(_get_gc())
        init_oms(_get_gc())
        init_mentor_backend(_get_gc())
    except Exception as e:
        logger.warning(f"Program Health init failed: {e}")
    yield
    logger.info("Shutdown")


app = FastAPI(
    title="Scaler Refund Analytics API",
    version="3.0.0",
    lifespan=lifespan,
)

# CORS - allow all (local dev). Tighten for production via FRONTEND_URL env var.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Page 3 router
app.include_router(program_router)


# =============================================================================
# CORE ROUTES
# =============================================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "funnel_rows": len(_state.funnel_df),
        "loaded_at": _state.loaded_at,
        "cohorts": list(_state.funnel_df["cohort_id"].unique()) if not _state.funnel_df.empty else [],
    }


@app.get("/cohorts")
async def list_cohorts():
    if _state.funnel_df.empty:
        await _refresh_funnel()
    if _state.funnel_df.empty:
        return {"cohorts": []}

    available = get_available_cohorts(_state.funnel_df)
    result = []
    for cid in available:
        sub = _state.funnel_df[_state.funnel_df["cohort_id"] == cid]
        total    = len(sub)
        complete = len(sub[sub["sale_status"] == "COMPLETE"])
        ref      = int((sub["refund_requested"] == True).sum())
        refunded_c = int(((sub["refunded"] == True) & (sub["sale_status"] == "COMPLETE")).sum())
        gtn = round((complete - refunded_c) / total * 100, 1) if total else 0
        result.append({
            "id":          cid,
            "label":       COHORT_LABELS.get(cid, cid),
            "has_persona": cid in COHORT_SHEET_MAP,
            "total":       total,
            "complete":    complete,
            "ref_total":   ref,
            "pct_refund":  round(ref / total * 100, 1) if total else 0,
            "gtn":         gtn,
        })
    return {"cohorts": result}


# =============================================================================
# PAGE 1: ANALYTICS
# =============================================================================

@app.get("/analytics/{cohort_id}")
async def get_analytics(
    cohort_id: str,
    background_tasks: BackgroundTasks,
    refresh: bool = Query(False),
):
    if refresh:
        cache.invalidate(cohort_id)

    cached = cache.get(cohort_id)
    if cached:
        return cached

    if _state.funnel_df.empty:
        raise HTTPException(503, "Funnel data not yet loaded. Try again shortly.")

    loop = asyncio.get_event_loop()
    persona_df  = await loop.run_in_executor(None, load_persona_sheet, cohort_id)
    analytics   = build_cohort_analytics(cohort_id, _state.funnel_df, persona_df)

    if not analytics:
        raise HTTPException(404, f"No data found for cohort: {cohort_id}")

    analytics["meta"] = {
        "id": cohort_id,
        "label": COHORT_LABELS.get(cohort_id, cohort_id),
    }

    cache.set(cohort_id, analytics, ttl_seconds=CACHE_TTL_MINUTES * 60)
    return analytics


@app.get("/analytics/{cohort_id}/entity")
async def get_entity_analytics(
    cohort_id: str,
    entity_type: str = Query("overall"),
    entity_id: str = Query(None),
):
    full = cache.get(cohort_id)
    if not full:
        raise HTTPException(404, "Call /analytics/{cohort_id} first to load data.")

    if entity_type == "overall":
        return full

    hierarchy = full.get("hierarchy", {})

    if entity_type == "avp":
        avps = {r["email"]: r for r in hierarchy.get("avps", [])}
        if entity_id not in avps:
            raise HTTPException(404, f"AVP not found: {entity_id}")
        return {
            **full, "kpis": avps[entity_id],
            "children": hierarchy.get("bdms_by_avp", {}).get(entity_id, []),
            "entity_type": "avp", "entity_id": entity_id,
        }

    if entity_type == "bdm":
        all_bdms = {}
        for bdm_list in hierarchy.get("bdms_by_avp", {}).values():
            for b in bdm_list:
                all_bdms[b["email"]] = b
        if entity_id not in all_bdms:
            raise HTTPException(404, f"BDM not found: {entity_id}")
        return {
            **full, "kpis": all_bdms[entity_id],
            "children": hierarchy.get("bdas_by_bdm", {}).get(entity_id, []),
            "entity_type": "bdm", "entity_id": entity_id,
        }

    return full


@app.post("/refresh")
async def force_refresh(background_tasks: BackgroundTasks):
    cache.invalidate_all()
    background_tasks.add_task(_refresh_funnel)
    return {"message": "Refresh queued"}


@app.get("/api/psas/{cohort_id}")
async def get_psas(cohort_id: str):
    if _state.funnel_df.empty:
        return {"psas": [], "cohort": cohort_id}
    cid = cohort_id.strip().lower()
    df = _state.funnel_df[_state.funnel_df["cohort_id"] == cid]
    return {"psas": compute_psas(df), "cohort": cid}


@app.get("/api/lsm-stats")
async def get_lsm_stats(cohort: str = "april2026"):
    try:
        summary = load_dump_summary(_get_gc(), cohort)
        return {"psa_summary": summary, "cohort": cohort}
    except Exception as e:
        logger.error(f"get_lsm_stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# PAGE 2: REQUESTS & APPROVALS
# =============================================================================

@app.get("/api/requests")
async def get_requests(cohort: str = "april2026"):
    try:
        requests = load_requests(_get_gc())
        for req in requests:
            if not req.get("classification"):
                try:
                    result = await classify_request(
                        req.get("body", ""),
                        req.get("requestType", {}).get("label", ""),
                    )
                    req["classification"] = result.get("classification", {})
                    req["confidence"] = result.get("confidence", "rule-based")
                except Exception:
                    req["classification"] = {}
                    req["confidence"] = "failed"
        return {"requests": requests, "total": len(requests)}
    except Exception as e:
        logger.error(f"get_requests error: {e}")
        return {"requests": [], "total": 0, "error": str(e)}


@app.post("/api/requests/approve")
async def approve_req(body: ApproveRequest):
    try:
        success = approve_request(_get_gc(), body.request_id, body.note, body.manager)
        if not success:
            raise HTTPException(404, f"Request {body.request_id} not found")
        return {"status": "approved", "request_id": body.request_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"approve error: {e}")
        raise HTTPException(500, str(e))


@app.post("/api/requests/reject")
async def reject_req(body: RejectRequest):
    try:
        success = reject_request(_get_gc(), body.request_id, body.reason, body.manager)
        if not success:
            raise HTTPException(404, f"Request {body.request_id} not found")
        return {"status": "rejected", "request_id": body.request_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"reject error: {e}")
        raise HTTPException(500, str(e))


@app.post("/api/classify")
async def classify_req(body: ClassifyRequest):
    try:
        result = await classify_request(body.body, body.request_type)
        return result
    except Exception as e:
        logger.error(f"classify error: {e}")
        raise HTTPException(500, str(e))


# =============================================================================
# PAGE 4: MENTOR NO SHOWS
# =============================================================================

@app.get("/api/classroom/{cohort_id}")
async def get_classroom(cohort_id: str):
    try:
        from config import get_postsales_id
        from services.post_sales_loader import load_postsales_classroom
        postsales_id = get_postsales_id(cohort_id)
        if not postsales_id:
            return {"class_ratings": [], "low_raters": [], "class_missed": [], "cohort_id": cohort_id}
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, load_postsales_classroom, _get_gc(), postsales_id)
        class_ratings, low_raters, instructor_map, class_missed = result
        return {
            "cohort_id":    cohort_id,
            "class_ratings": class_ratings,
            "low_raters":    low_raters,
            "class_missed":  class_missed,
        }
    except Exception as e:
        logger.error(f"classroom error: {e}")
        return {"class_ratings": [], "low_raters": [], "class_missed": [], "cohort_id": cohort_id}


@app.get("/api/mentor/noshows/{cohort_id}")
async def get_mentor_noshows(cohort_id: str):
    try:
        data = load_noshows(cohort_id)
        return data
    except Exception as e:
        logger.error(f"mentor noshows error: {e}")
        return {"error": str(e), "total": 0, "mentor_list": [], "mentee_list": []}


@app.get("/api/mentor/backend/{cohort_id}")
async def get_mentor_backend(cohort_id: str):
    try:
        data = load_mentor_backend(cohort_id)
        return data
    except Exception as e:
        logger.error(f"mentor backend error: {e}")
        return {"error": str(e), "low_raters": [], "no_shows": []}


# =============================================================================
# AI SUMMARY — proxies OpenAI/Groq so frontend doesn't need keys
# =============================================================================

class SummaryRequest(BaseModel):
    items: list
    context: str = "no-show sessions"

@app.post("/api/ai/summary")
async def get_ai_summary(req: SummaryRequest):
    from config import OPENAI_API_KEY, GROQ_API_KEY, AI_PROVIDER
    import httpx

    if not req.items:
        return {"bullets": []}

    system = (
        "You are an ops analyst at an edtech company. "
        "Respond ONLY with exactly 3 bullet points. "
        "Each bullet must be under 12 words. "
        "Be specific and factual. "
        "Do NOT write: 'DNP', 'N/A', 'No data', preambles, headers, or any text outside the 3 bullets. "
        "Format: one bullet per line starting with a dash."
    )

    user = (
        f"Analyse these {req.context} and identify the key patterns:\n" +
        "\n".join(f"- {item}" for item in req.items[:20])
    )

    # Try OpenAI first
    if OPENAI_API_KEY and AI_PROVIDER in ("openai", "auto", ""):
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": "gpt-4o-mini",
                        "max_tokens": 150,
                        "temperature": 0.3,
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user",   "content": user}
                        ]
                    }
                )
                if r.status_code == 200:
                    text = r.json()["choices"][0]["message"]["content"]
                    bullets = _parse_bullets(text)
                    if bullets:
                        return {"bullets": bullets}
        except Exception as e:
            logger.warning(f"OpenAI summary error: {e}")

    # Fall back to Groq
    if GROQ_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=12) as client:
                r = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.1-8b-instant",
                        "max_tokens": 150,
                        "temperature": 0.3,
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user",   "content": user}
                        ]
                    }
                )
                if r.status_code == 200:
                    text = r.json()["choices"][0]["message"]["content"]
                    bullets = _parse_bullets(text)
                    if bullets:
                        return {"bullets": bullets}
        except Exception as e:
            logger.warning(f"Groq summary error: {e}")

    return {"bullets": []}


def _parse_bullets(text: str) -> list:
    """Extract clean bullet points from AI response."""
    lines = text.strip().split("\n")
    bullets = []
    skip = {"dnp", "n/a", "no data", "none", "not available", "no information"}
    for line in lines:
        clean = line.strip().lstrip("-•*123456789. ").strip()
        if len(clean) < 5:
            continue
        if any(s in clean.lower() for s in skip):
            continue
        bullets.append(clean)
        if len(bullets) == 3:
            break
    return bullets


# =============================================================================
# CACHE MANAGEMENT
# =============================================================================

@app.get("/api/reasons/{cohort_id}")
async def get_refund_reasons(cohort_id: str):
    try:
        from services.sheets_loader import _get_client
        from config import SHEET_PERSONA_ID
        from collections import Counter

        gc = _get_client()
        sh = gc.open_by_key(SHEET_PERSONA_ID)

        tab_map = {
            'april2026': 'Apr26', 'march2026': 'Mar26', 'february2026': 'Feb26',
            'january2026': 'Jan26', 'december(1)2025': 'Dec25(1)',
            'december(2)2025': 'Dec25(2)', 'november2025': 'Nov25',
            'october2025': 'Oct25', 'september2025': 'Sep25',
            'august2025': 'Aug25', 'july2025': 'July25',
        }
        tab_name = tab_map.get(cohort_id)
        if not tab_name:
            return {"rows": [], "categories": [], "total": 0}

        try:
            ws = sh.worksheet(tab_name)
        except Exception:
            return {"rows": [], "categories": [], "total": 0, "error": f"Tab {tab_name} not found"}

        data = ws.get_all_values()
        if len(data) < 2:
            return {"rows": [], "categories": [], "total": 0}

        headers = [h.strip() for h in data[0]]

        def col(name):
            try: return headers.index(name)
            except: return None

        C = {}
        C['email']      = col('Email')
        C['batch']      = col('Batch')
        C['psa']        = col('PSA')
        C['date']       = col('Refund Requested On')
        C['background'] = col('Profession/Background')
        C['exp']        = col('Years of Exp')
        C['ctc']        = col('Financial Situation - CTC')
        C['reason_join']= col('Reason for Joining Scaler')
        C['actions']    = col('Actions Taken')
        C['didnt_work'] = col("What Didn't Work")
        C['retention']  = col('Scope of Retention')
        C['stated']     = None
        C['identified'] = None
        C['outcome']    = None

        for i, h in enumerate(headers):
            hl = h.lower()
            if 'stated refund reason' in hl or ('stated' in hl and 'reason' in hl):
                C['stated'] = i
            if 'identified refund reason' in hl or ('identified' in hl and 'reason' in hl):
                C['identified'] = i
            if 'outcome' in hl:
                C['outcome'] = i

        def g(row, key):
            idx = C.get(key)
            if idx is None or idx >= len(row): return ''
            v = str(row[idx]).strip()
            return '' if v in ('None', 'nan', '#N/A', '#REF!', '#VALUE!', '') else v

        rows = []
        cat_counter = Counter()

        for row in data[1:]:
            if not row or not row[0]: continue
            email = g(row, 'email')
            if not email or '@' not in email: continue

            stated     = g(row, 'stated')
            identified = g(row, 'identified')
            category   = _categorise_reason(identified or stated)
            if category and category != 'Unknown':
                cat_counter[category] += 1

            rows.append({
                "email":       email,
                "batch":       g(row, 'batch'),
                "psa":         g(row, 'psa'),
                "date":        g(row, 'date'),
                "background":  g(row, 'background'),
                "exp":         g(row, 'exp'),
                "ctc":         g(row, 'ctc'),
                "stated":      stated,
                "identified":  identified,
                "category":    category,
                "actions":     g(row, 'actions'),
                "outcome":     g(row, 'outcome'),
                "didnt_work":  g(row, 'didnt_work'),
                "retention":   g(row, 'retention'),
            })

        categories = [{"category": k, "count": v} for k, v in cat_counter.most_common()]
        return {"total": len(rows), "rows": rows, "categories": categories}

    except Exception as e:
        logger.error(f"reasons error: {e}")
        return {"rows": [], "categories": [], "total": 0, "error": str(e)}


def _categorise_reason(text: str) -> str:
    if not text: return 'Unknown'
    t = text.lower()
    if any(x in t for x in ['loan', 'emi', 'financial', 'money', 'afford', 'fee', 'cost', 'fund']):
        return 'Financial / EMI'
    if any(x in t for x in ['first call', 'fec', 'immediate', 'same day', 'within 24']):
        return 'First Call Refund'
    if any(x in t for x in ['placement', 'job guarantee', 'job assurance', 'salary hike', 'was promised']):
        return 'Placement Expectation'
    if any(x in t for x in ['time', 'schedule', 'busy', 'work hours', 'timing', 'workload', 'commitment']):
        return 'Time / Schedule Conflict'
    if any(x in t for x in ['curriculum', 'content', 'syllabus', 'course', 'material', 'topics']):
        return 'Curriculum Concern'
    if any(x in t for x in ['low intent', 'not serious', 'not interested', 'changed mind', 'reconsidering']):
        return 'Low Intent'
    if any(x in t for x in ['career', 'domain', 'field', 'not relevant', 'wrong course', 'mismatch']):
        return 'Career Misalignment'
    if any(x in t for x in ['technical', 'tech issue', 'platform', 'access', 'login']):
        return 'Technical Issues'
    if any(x in t for x in ['family', 'health', 'personal', 'emergency', 'medical']):
        return 'Personal Reasons'
    return 'Other'


@app.get("/api/cache/clear")
async def clear_cache(key: str = ""):
    if key != "scaler2026":
        raise HTTPException(403, "Invalid key")
    from services.cache import invalidate_all
    from services.program_health import _AI_CACHE_DIR
    import shutil
    invalidate_all()
    for cache_dir in [_AI_CACHE_DIR, "classifier_cache"]:
        try:
            shutil.rmtree(cache_dir, ignore_errors=True)
        except Exception:
            pass
    logger.info("Cache cleared via API")
    return {"status": "cleared", "message": "All caches cleared successfully"}

@app.get("/api/cohorts")
async def get_api_cohorts():
    from config import POSTSALES_MAP, COHORT_LABELS, COHORT_ORDER, SHEET_LSM_ID
    cohorts = []
    for cid in COHORT_ORDER:
        cohorts.append({
            "id": cid,
            "label": COHORT_LABELS.get(cid, cid),
            "lsm_sheet": SHEET_LSM_ID,
            "postsales_sheet": POSTSALES_MAP.get(cid),
            "has_postsales": cid in POSTSALES_MAP,
        })
    return {"cohorts": cohorts}


@app.get("/api/settings/postsales")
async def get_postsales_settings():
    """Return current Post Sales tracker config and instructions for adding new ones."""
    from config import POSTSALES_MAP, COHORT_LABELS
    trackers = []
    for cohort_id, sheet_id in POSTSALES_MAP.items():
        env_key = f"SHEET_POSTSALES_{cohort_id.upper().replace('(', '').replace(')', '')}"
        trackers.append({
            "cohort_id": cohort_id,
            "label": COHORT_LABELS.get(cohort_id, cohort_id),
            "sheet_id": sheet_id,
            "env_key": env_key,
            "sheet_url": f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit",
        })
    return {
        "trackers": trackers,
        "instructions": {
            "how_to_add": "Add an environment variable in Render with the pattern below, then redeploy.",
            "pattern": "SHEET_POSTSALES_{COHORT_ID_UPPERCASE} = {google_sheet_id}",
            "example": "SHEET_POSTSALES_MAY2026 = 1ABC...xyz",
            "note": "Cohort ID must match exactly: april2026, may2026, june2026, etc.",
        }
    }


# =============================================================================
# DEBUG ROUTES
# =============================================================================

@app.get("/debug-sheets")
async def debug_sheets():
    try:
        from config import SHEET_FUNNEL_ID
        gc = _get_gc()
        sh = gc.open_by_key(SHEET_FUNNEL_ID)
        titles = [ws.title for ws in sh.worksheets()]
        return {"titles": titles}
    except Exception as e:
        return {"error": str(e)}


@app.get("/debug-lsm")
async def debug_lsm():
    try:
        gc = _get_gc()
        sh = gc.open_by_key(SHEET_LSM_ID)
        titles = [ws.title for ws in sh.worksheets()]
        return {"titles": titles}
    except Exception as e:
        return {"error": str(e)}


@app.get("/debug-persona/{cohort_id}")
async def debug_persona(cohort_id: str):
    """Show what the persona sheet looks like after loading + what reasons are found."""
    try:
        loop = asyncio.get_event_loop()
        persona_df = await loop.run_in_executor(None, load_persona_sheet, cohort_id)
        if persona_df.empty:
            return {"error": "No persona data loaded", "cohort": cohort_id}

        has_identified = "identified_reason" in persona_df.columns
        has_stated = "stated_reason" in persona_df.columns
        identified_count = int(persona_df["identified_reason"].notna().sum()) if has_identified else 0
        stated_count = int(persona_df["stated_reason"].notna().sum()) if has_stated else 0

        # Sample rows with reasons
        samples = []
        if has_identified:
            with_reason = persona_df[persona_df["identified_reason"].notna()].head(5)
            for _, r in with_reason.iterrows():
                samples.append({
                    "email": r.get("email"),
                    "identified_reason": str(r.get("identified_reason", ""))[:200],
                    "stated_reason": str(r.get("stated_reason", ""))[:200],
                })

        return {
            "cohort": cohort_id,
            "total_rows_loaded": len(persona_df),
            "has_identified_reason_col": has_identified,
            "has_stated_reason_col": has_stated,
            "rows_with_identified_reason": identified_count,
            "rows_with_stated_reason": stated_count,
            "columns_found": list(persona_df.columns),
            "sample_rows_with_reasons": samples,
        }
    except Exception as e:
        return {"error": str(e), "cohort": cohort_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

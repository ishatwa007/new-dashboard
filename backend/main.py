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
from services.lsm_loader import (
    load_requests, approve_request, reject_request, load_dump_summary,
)
from services.classifier import classify_request
from services.program_health import router as program_router, init as init_program, set_funnel_lookup

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
    persona_df = await loop.run_in_executor(None, load_persona_sheet, cohort_id)
    analytics = build_cohort_analytics(cohort_id, _state.funnel_df, persona_df)

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
# SETTINGS / COHORT MANAGEMENT
# =============================================================================

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

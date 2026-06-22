"""
sheets_loader.py - Load Funnel and Persona sheets from Google
Tries multiple tab names including "Raw" (used in LSM sheet).
"""
import time
import logging
import gspread
import pandas as pd
from google.oauth2.service_account import Credentials
from config import (
    get_google_creds, SHEET_FUNNEL_ID, SHEET_PERSONA_ID,
    COHORT_SHEET_MAP, COHORT_ORDER,
)
from services.cleaner import clean_funnel_row, clean_persona_row

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# Tab names tried in order when loading funnel data
FUNNEL_TAB_CANDIDATES = [
    "Raw",
    "Refunds Funnel  Raw 9",
    "Refunds Funnel Raw",
    "Refunds Funnel",
    "Funnel",
]

# Singleton gspread client (service account tokens don't expire like user tokens)
_gc_instance = None

# Persona sheet TTL cache: cohort_id -> (loaded_at, DataFrame)
_persona_cache: dict = {}
_PERSONA_TTL = 900  # 15 minutes


def _get_client() -> gspread.Client:
    global _gc_instance
    if _gc_instance is None:
        creds_dict = get_google_creds()
        creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
        _gc_instance = gspread.authorize(creds)
        logger.info("gspread client created (singleton)")
    return _gc_instance


def load_funnel_df() -> pd.DataFrame:
    """Load Refunds Funnel data. Tries multiple tab names, falls back to first tab."""
    logger.info("Loading Refunds Funnel sheet...")
    gc = _get_client()
    sh = gc.open_by_key(SHEET_FUNNEL_ID)

    ws = None
    for tab_name in FUNNEL_TAB_CANDIDATES:
        try:
            ws = sh.worksheet(tab_name)
            logger.info(f"Found tab: '{tab_name}'")
            break
        except gspread.WorksheetNotFound:
            continue

    if ws is None:
        ws = sh.get_worksheet(0)
        logger.info(f"Using first tab: '{ws.title}'")

    data = ws.get_all_values()
    if not data:
        raise ValueError("Funnel sheet is empty")

    headers = data[0]
    rows    = data[1:]
    raw_df  = pd.DataFrame(rows, columns=headers)

    cleaned = [clean_funnel_row(row) for _, row in raw_df.iterrows()]
    df = pd.DataFrame([r for r in cleaned if r.get("email")])
    logger.info(f"Funnel loaded: {len(df)} rows after cleaning")
    return df


def load_persona_sheet(cohort_id: str) -> pd.DataFrame:
    """Load monthly tracking sheet for a cohort. Tries multiple tab name variants.
    Results are cached for _PERSONA_TTL seconds to avoid repeated API calls."""

    # Return from cache if fresh
    cached = _persona_cache.get(cohort_id)
    if cached and (time.time() - cached[0]) < _PERSONA_TTL:
        logger.info(f"Persona cache hit for {cohort_id}")
        return cached[1]

    sheet_tab = COHORT_SHEET_MAP.get(cohort_id)
    if not sheet_tab:
        logger.warning(f"No persona sheet mapped for cohort: {cohort_id}")
        return pd.DataFrame()

    # Build list of tab name variants to try (with/without apostrophe, spaces, etc.)
    variants = [sheet_tab]
    if "'" in sheet_tab:
        variants.append(sheet_tab.replace("'", ""))           # Apr'26 -> Apr26
        variants.append(sheet_tab.replace("'", " "))          # Apr'26 -> Apr 26
    else:
        parts = sheet_tab.rstrip(")").split("(")[0]
        if len(parts) >= 5 and parts[3].isdigit():
            variants.append(parts[:3] + "'" + parts[3:])     # Apr26 -> Apr'26

    logger.info(f"Loading persona sheet for {cohort_id}, trying tabs: {variants}")
    try:
        gc = _get_client()
        sh = gc.open_by_key(SHEET_PERSONA_ID)

        ws = None
        matched_tab = None
        for v in variants:
            try:
                ws = sh.worksheet(v)
                matched_tab = v
                logger.info(f"Found persona tab: '{v}'")
                break
            except gspread.WorksheetNotFound:
                continue

        if ws is None:
            all_tabs = [w.title for w in sh.worksheets()]
            logger.warning(f"Persona tab not found. Tried {variants}. Available: {all_tabs}")
            empty = pd.DataFrame()
            _persona_cache[cohort_id] = (time.time(), empty)
            return empty

        data = ws.get_all_values()
        if not data or len(data) < 2:
            empty = pd.DataFrame()
            _persona_cache[cohort_id] = (time.time(), empty)
            return empty

        headers = data[0]
        rows    = data[1:]
        raw_df  = pd.DataFrame(rows, columns=headers)

        cleaned = [clean_persona_row(row, raw_df) for _, row in raw_df.iterrows()]
        df = pd.DataFrame([r for r in cleaned if r.get("email")])
        logger.info(f"Persona sheet {matched_tab}: {len(df)} rows after cleaning")
        _persona_cache[cohort_id] = (time.time(), df)
        return df
    except Exception as e:
        logger.error(f"Failed to load persona sheet {sheet_tab}: {e}")
        return pd.DataFrame()


def get_available_cohorts(funnel_df: pd.DataFrame) -> list[str]:
    if funnel_df.empty or "cohort_id" not in funnel_df.columns:
        return []
    seen = set(funnel_df["cohort_id"].dropna().unique())
    return [c for c in COHORT_ORDER if c in seen]

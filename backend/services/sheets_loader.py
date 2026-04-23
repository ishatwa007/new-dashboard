"""
sheets_loader.py - Load Funnel and Persona sheets from Google
Tries multiple tab names including "Raw" (used in LSM sheet).
"""
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


def _get_client() -> gspread.Client:
    logger.info("Authenticating Google Sheets client from configured credentials")
    creds_dict = get_google_creds()
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    return gspread.authorize(creds)


def load_funnel_df() -> pd.DataFrame:
    """Load Refunds Funnel data. Tries multiple tab names, falls back to first tab."""
    logger.info("Loading Refunds Funnel sheet...")
    gc = _get_client()
    logger.info("Opening funnel workbook by key")
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

    logger.info(f"Reading rows from funnel tab '{ws.title}'")
    data = ws.get_all_values()
    if not data:
        raise ValueError("Funnel sheet is empty")

    headers = data[0]
    rows    = data[1:]
    logger.info(f"Funnel raw payload: {len(rows)} data rows, {len(headers)} columns")
    raw_df  = pd.DataFrame(rows, columns=headers)

    logger.info("Cleaning funnel rows")
    cleaned = [clean_funnel_row(row) for _, row in raw_df.iterrows()]
    df = pd.DataFrame([r for r in cleaned if r.get("email")])
    logger.info(f"Funnel loaded: {len(df)} rows after cleaning")
    return df


def load_persona_sheet(cohort_id: str) -> pd.DataFrame:
    """Load monthly tracking sheet for a cohort. Tries multiple tab name variants."""
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
            return pd.DataFrame()

        data = ws.get_all_values()
        if not data or len(data) < 2:
            return pd.DataFrame()

        headers = data[0]
        rows    = data[1:]
        raw_df  = pd.DataFrame(rows, columns=headers)

        cleaned = [clean_persona_row(row, raw_df) for _, row in raw_df.iterrows()]
        df = pd.DataFrame([r for r in cleaned if r.get("email")])
        logger.info(f"Persona sheet {matched_tab}: {len(df)} rows after cleaning")
        return df
    except Exception as e:
        logger.error(f"Failed to load persona sheet {sheet_tab}: {e}")
        return pd.DataFrame()


def get_available_cohorts(funnel_df: pd.DataFrame) -> list[str]:
    if funnel_df.empty or "cohort_id" not in funnel_df.columns:
        return []
    seen = set(funnel_df["cohort_id"].dropna().unique())
    return [c for c in COHORT_ORDER if c in seen]

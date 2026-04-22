"""
oms_loader.py

Reads the OMS Daily Product Analytics sheet to get the definitive refund signal.
Source of truth: "Refund on Mail" column = 1.0 means learner is refunded.

Tab naming: April2026, May2026, March2026 etc.
Maps cohort_id (april2026) -> tab name (April2026).
"""

import logging
from typing import Optional
from config import SHEET_OMS_ID

log = logging.getLogger(__name__)

_gc        = None
_sheet_id  = SHEET_OMS_ID
_cache: dict = {}   # cohort_id -> {email: bool}


def init_oms(gc, sheet_id: str = None):
    global _gc, _sheet_id
    _gc = gc
    if sheet_id:
        _sheet_id = sheet_id
    log.info(f"OMS loader initialised: {_sheet_id[:12]}...")


def _cohort_to_tab(cohort_id: str) -> str:
    """Convert cohort_id to OMS tab name. april2026 -> April2026"""
    # Handle special cases like december(1)2025
    name = cohort_id.strip().lower()
    name = name.replace('(1)', '1').replace('(2)', '2')
    # Capitalise first letter
    return name[0].upper() + name[1:]


def load_oms_refunds(cohort_id: str, force: bool = False) -> dict:
    """
    Load refund lookup for a cohort from OMS sheet.
    Returns {email_lower: True} for every refunded learner (Refund on Mail = 1).
    Non-refunded emails are not in the dict (treat absence as not refunded).
    """
    if not _gc or not _sheet_id:
        log.warning("OMS loader: not initialised")
        return {}

    if not force and cohort_id in _cache:
        return _cache[cohort_id]

    tab_name = _cohort_to_tab(cohort_id)
    log.info(f"OMS loader: reading tab '{tab_name}' for cohort '{cohort_id}'")

    try:
        wb  = _gc.open_by_key(_sheet_id)
        ws  = wb.worksheet(tab_name)
        raw = ws.get_all_values()
    except Exception as e:
        log.error(f"OMS loader: failed to read tab '{tab_name}': {e}")
        # Try OMS Compiled as fallback
        return _load_from_compiled(cohort_id)

    if len(raw) < 2:
        log.warning(f"OMS loader: tab '{tab_name}' is empty")
        return {}

    # Find header row and relevant columns
    email_col    = None
    refund_col   = None
    header_row   = 0

    for ri, row in enumerate(raw[:5]):  # check first 5 rows for headers
        for ci, cell in enumerate(row):
            c = str(cell).strip().lower()
            if c in ('student_email', 'lead_email', 'current lead email 4',
                     'email', 'punched lead email 5'):
                email_col  = ci
                header_row = ri
            if 'refund on mail' in c or c == 'refund on mail 38':
                refund_col = ci

    if email_col is None or refund_col is None:
        log.warning(f"OMS loader: couldn't find email or refund column in '{tab_name}'. "
                    f"Found email_col={email_col}, refund_col={refund_col}")
        log.warning(f"First row headers: {raw[0][:10]}")
        return {}

    log.info(f"OMS loader: email_col={email_col}, refund_col={refund_col}, header_row={header_row}")

    lookup = {}
    for row in raw[header_row + 1:]:
        if not row or len(row) <= max(email_col, refund_col):
            continue
        email  = str(row[email_col]).strip().lower()
        refund = str(row[refund_col]).strip()

        if not email or email in ('-', '', 'nan', 'none'):
            continue

        # 1.0, 1, "1", TRUE, True = refunded
        is_refunded = refund in ('1', '1.0', 'true', 'True', 'TRUE', 'yes', 'Yes', 'YES')
        if is_refunded:
            lookup[email] = True

    log.info(f"OMS loader: {len(lookup)} refunded learners for {cohort_id} (from {len(raw)-1} rows)")
    _cache[cohort_id] = lookup
    return lookup


def _load_from_compiled(cohort_id: str) -> dict:
    """Fallback: read OMS Compiled tab and filter by cohort."""
    try:
        wb  = _gc.open_by_key(_sheet_id)
        ws  = wb.worksheet("OMS Compiled")
        raw = ws.get_all_values()
    except Exception as e:
        log.error(f"OMS loader: compiled fallback failed: {e}")
        return {}

    if len(raw) < 2:
        return {}

    headers = [str(h).strip().lower() for h in raw[0]]

    # Find columns
    email_col  = next((i for i, h in enumerate(headers)
                       if 'current lead email' in h or h == 'email'), None)
    refund_col = next((i for i, h in enumerate(headers)
                       if 'refund on mail' in h), None)
    month_col  = next((i for i, h in enumerate(headers)
                       if 'oms month' in h), None)

    if email_col is None or refund_col is None:
        return {}

    # Map cohort_id to OMS month prefix
    # april2026 -> "apr26" or "2026-04"
    month_map = {
        'april2026': '2026-04', 'may2026': '2026-05', 'march2026': '2026-03',
        'february2026': '2026-02', 'january2026': '2026-01',
        'december(1)2025': '2025-12', 'december(2)2025': '2025-12',
        'november2025': '2025-11', 'october2025': '2025-10',
        'september2025': '2025-09', 'august2025': '2025-08',
        'july2025': '2025-07',
    }
    month_prefix = month_map.get(cohort_id, '')

    lookup = {}
    for row in raw[1:]:
        if not row or len(row) <= max(email_col, refund_col):
            continue
        # Filter by month if possible
        if month_col is not None and month_prefix:
            month_val = str(row[month_col]).strip()
            if month_prefix not in month_val:
                continue

        email  = str(row[email_col]).strip().lower()
        refund = str(row[refund_col]).strip()
        if not email or email in ('-', '', 'nan'):
            continue
        if refund in ('1', '1.0', 'true', 'True', 'TRUE'):
            lookup[email] = True

    log.info(f"OMS compiled fallback: {len(lookup)} refunded for {cohort_id}")
    _cache[cohort_id] = lookup
    return lookup


def invalidate_cache(cohort_id: str = None):
    """Clear cached OMS data."""
    global _cache
    if cohort_id:
        _cache.pop(cohort_id, None)
    else:
        _cache.clear()

"""
mentor_loader.py

Reads the No Shows tab from the Mentor Data Google Sheet.

No Shows tab columns:
  A=cohort, B=end_date, C=group_name, D=session_id, E=request_id,
  F=name (session agenda), G=mentor_email, H=mentor_name,
  I=start_time, J=no_show_type, K=mentee_name, L=learner_user_id,
  M=mentee_email, N=super_batch_name

no_show_type values: mentee_no_show | mentor_no_show | both_no_show
"""

import logging
from collections import defaultdict
from typing import Optional
from config import SHEET_MENTOR_ID

log = logging.getLogger(__name__)

_gc      = None
_sheet_id = SHEET_MENTOR_ID


def init_mentor(gc, sheet_id: str = None):
    global _gc, _sheet_id
    _gc = gc
    if sheet_id:
        _sheet_id = sheet_id
    log.info(f"Mentor loader initialised: {_sheet_id[:12]}...")


def _safe(v) -> str:
    return str(v).strip() if v is not None else ""


def load_noshows(cohort_id: str) -> dict:
    """
    Load and parse the No Shows tab filtered by cohort_id.
    Returns structured data for the mentor page.
    """
    if not _gc or not _sheet_id:
        log.warning("Mentor loader: not initialised")
        return _empty()

    try:
        wb  = _gc.open_by_key(_sheet_id)
        ws  = wb.worksheet("No Shows")
        raw = ws.get_all_values()
    except Exception as e:
        log.error(f"Mentor loader: sheet read failed: {e}")
        return _empty()

    if len(raw) < 2:
        return _empty()

    # Filter rows by cohort
    rows = []
    for row in raw[1:]:
        if not row or len(row) < 10:
            continue
        if _safe(row[0]).lower() != cohort_id.lower():
            continue
        rows.append({
            "cohort":      _safe(row[0]),
            "end_date":    _safe(row[1]),
            "group_name":  _safe(row[2]),
            "session_id":  _safe(row[3]),
            "request_id":  _safe(row[4]),
            "agenda":      _safe(row[5]),
            "mentor_email":_safe(row[6]).lower(),
            "mentor_name": _safe(row[7]),
            "start_time":  _safe(row[8]),
            "type":        _safe(row[9]),  # mentee_no_show | mentor_no_show | both_no_show
            "mentee_name": _safe(row[10]) if len(row) > 10 else "",
            "mentee_id":   _safe(row[11]) if len(row) > 11 else "",
            "mentee_email":_safe(row[12]).lower() if len(row) > 12 else "",
            "batch":       _safe(row[13]) if len(row) > 13 else "",
        })

    if not rows:
        log.info(f"Mentor loader: no rows for cohort {cohort_id}")
        return _empty()

    # Counts
    total       = len(rows)
    mentor_ns   = [r for r in rows if r["type"] in ("mentor_no_show", "both_no_show")]
    mentee_ns   = [r for r in rows if r["type"] in ("mentee_no_show", "both_no_show")]
    both_ns     = [r for r in rows if r["type"] == "both_no_show"]

    # Mentor profiles — group by mentor email
    mentor_map = defaultdict(lambda: {
        "name": "", "email": "", "no_show_count": 0, "sessions": []
    })
    for r in mentor_ns:
        m = mentor_map[r["mentor_email"]]
        m["name"]  = r["mentor_name"] or m["name"]
        m["email"] = r["mentor_email"]
        m["no_show_count"] += 1
        m["sessions"].append({
            "agenda":      r["agenda"],
            "date":        r["start_time"][:10] if r["start_time"] else "",
            "time":        r["start_time"][11:16] if len(r["start_time"]) > 10 else "",
            "mentee_name": r["mentee_name"],
            "mentee_email":r["mentee_email"],
            "batch":       r["batch"],
            "type":        r["type"],
        })

    mentor_list = sorted(mentor_map.values(), key=lambda x: -x["no_show_count"])
    repeat_offenders = [m for m in mentor_list if m["no_show_count"] >= 2]

    # Mentee profiles — group by mentee email
    mentee_map = defaultdict(lambda: {
        "name": "", "email": "", "no_show_count": 0, "sessions": []
    })
    for r in mentee_ns:
        mt = mentee_map[r["mentee_email"]]
        mt["name"]  = r["mentee_name"] or mt["name"]
        mt["email"] = r["mentee_email"]
        mt["no_show_count"] += 1
        mt["sessions"].append({
            "agenda":       r["agenda"],
            "date":         r["start_time"][:10] if r["start_time"] else "",
            "mentor_name":  r["mentor_name"],
            "mentor_email": r["mentor_email"],
            "batch":        r["batch"],
            "type":         r["type"],
        })

    mentee_list = sorted(mentee_map.values(), key=lambda x: -x["no_show_count"])

    return {
        "cohort_id":         cohort_id,
        "total":             total,
        "mentor_noshows":    len(mentor_ns),
        "mentee_noshows":    len(mentee_ns),
        "both_noshows":      len(both_ns),
        "unique_mentors":    len(mentor_map),
        "unique_mentees":    len(mentee_map),
        "repeat_offenders":  len(repeat_offenders),
        "mentor_list":       mentor_list,
        "mentee_list":       mentee_list,
        "repeat_offender_list": repeat_offenders,
    }


def _empty() -> dict:
    return {
        "cohort_id": "",
        "total": 0,
        "mentor_noshows": 0,
        "mentee_noshows": 0,
        "both_noshows": 0,
        "unique_mentors": 0,
        "unique_mentees": 0,
        "repeat_offenders": 0,
        "mentor_list": [],
        "mentee_list": [],
        "repeat_offender_list": [],
    }

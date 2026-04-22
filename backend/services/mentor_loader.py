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
    Load and parse the No Shows tab filtered by cohort_id,
    and merge in reasons from 'Mentor No Show Reasons' and 'Mentee No Show Reasons' tabs.
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

    # Load reasons lookups keyed by mentor_email+mentee_email+date
    mentor_reasons = _load_reasons(wb, "Mentor No Show Reasons")
    mentee_reasons = _load_reasons(wb, "Mentee No Show Reasons")

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
            "type":        _safe(row[9]),
            "mentee_name": _safe(row[10]) if len(row) > 10 else "",
            "mentee_id":   _safe(row[11]) if len(row) > 11 else "",
            "mentee_email":_safe(row[12]).lower() if len(row) > 12 else "",
            "batch":       _safe(row[13]) if len(row) > 13 else "",
        })

    if not rows:
        return _empty()

    # Counts
    total     = len(rows)
    mentor_ns = [r for r in rows if r["type"] in ("mentor_no_show", "both_no_show")]
    mentee_ns = [r for r in rows if r["type"] in ("mentee_no_show", "both_no_show")]
    both_ns   = [r for r in rows if r["type"] == "both_no_show"]

    # Mentor profiles
    mentor_map = defaultdict(lambda: {"name":"","email":"","no_show_count":0,"sessions":[]})
    for r in mentor_ns:
        key = f"{r['mentor_email']}_{r['mentee_email']}_{r['start_time']}"
        reason = mentor_reasons.get(key, {})
        m = mentor_map[r["mentor_email"]]
        m["name"]  = r["mentor_name"] or m["name"]
        m["email"] = r["mentor_email"]
        m["no_show_count"] += 1
        m["sessions"].append({
            "agenda":           r["agenda"],
            "date":             r["start_time"][:10] if r["start_time"] else "",
            "time":             r["start_time"][11:16] if len(r["start_time"]) > 10 else "",
            "mentee_name":      r["mentee_name"],
            "mentee_email":     r["mentee_email"],
            "batch":            r["batch"],
            "type":             r["type"],
            "reason_category":  reason.get("reason_category", ""),
            "reason_detail":    reason.get("reason_detail", ""),
            "severity":         reason.get("severity", ""),
            "action_taken":     reason.get("action_taken", ""),
        })

    mentor_list       = sorted(mentor_map.values(), key=lambda x: -x["no_show_count"])
    repeat_offenders  = [m for m in mentor_list if m["no_show_count"] >= 2]

    # Mentee profiles
    mentee_map = defaultdict(lambda: {"name":"","email":"","no_show_count":0,"sessions":[]})
    for r in mentee_ns:
        key = f"{r['mentor_email']}_{r['mentee_email']}_{r['start_time']}"
        reason = mentee_reasons.get(key, {})
        mt = mentee_map[r["mentee_email"]]
        mt["name"]  = r["mentee_name"] or mt["name"]
        mt["email"] = r["mentee_email"]
        mt["no_show_count"] += 1
        mt["sessions"].append({
            "agenda":           r["agenda"],
            "date":             r["start_time"][:10] if r["start_time"] else "",
            "mentor_name":      r["mentor_name"],
            "mentor_email":     r["mentor_email"],
            "batch":            r["batch"],
            "type":             r["type"],
            "reason_category":  reason.get("reason_category", ""),
            "reason_detail":    reason.get("reason_detail", ""),
            "severity":         reason.get("severity", ""),
            "action_taken":     reason.get("action_taken", ""),
        })

    mentee_list = sorted(mentee_map.values(), key=lambda x: -x["no_show_count"])

    # Reason breakdowns for overview
    def _reason_breakdown(sessions_list):
        from collections import Counter
        cats = Counter()
        sevs = Counter()
        for profile in sessions_list:
            for s in profile.get("sessions", []):
                if s.get("reason_category"):
                    cats[s["reason_category"]] += 1
                if s.get("severity"):
                    sevs[s["severity"]] += 1
        return {
            "by_category": [{"category": k, "count": v} for k, v in cats.most_common()],
            "by_severity": [{"severity": k, "count": v} for k, v in sevs.most_common()],
        }

    return {
        "cohort_id":              cohort_id,
        "total":                  total,
        "mentor_noshows":         len(mentor_ns),
        "mentee_noshows":         len(mentee_ns),
        "both_noshows":           len(both_ns),
        "unique_mentors":         len(mentor_map),
        "unique_mentees":         len(mentee_map),
        "repeat_offenders":       len(repeat_offenders),
        "mentor_list":            mentor_list,
        "mentee_list":            mentee_list,
        "repeat_offender_list":   repeat_offenders,
        "mentor_reason_breakdown":_reason_breakdown(mentor_list),
        "mentee_reason_breakdown":_reason_breakdown(mentee_list),
    }


def _load_reasons(wb, tab_name: str) -> dict:
    """
    Load a Reasons tab and return a lookup:
    key = mentor_email + _ + mentee_email + _ + session_date
    value = {reason_category, reason_detail, severity, action_taken}

    Reasons tab columns (0-indexed):
    0=cohort, 1=mentor_email, 2=mentor_name, 3=mentee_email, 4=mentee_name,
    5=batch, 6=session_date, 7=session_agenda,
    8=reason_category, 9=reason_detail, 10=severity, 11=action_taken
    """
    try:
        ws  = wb.worksheet(tab_name)
        raw = ws.get_all_values()
    except Exception as e:
        log.info(f"Mentor loader: reasons tab '{tab_name}' not found or empty: {e}")
        return {}

    if len(raw) < 2:
        return {}

    lookup = {}
    for row in raw[1:]:
        if not row or len(row) < 7:
            continue
        mentor_email = _safe(row[1]).lower()
        mentee_email = _safe(row[3]).lower()
        session_date = _safe(row[6])
        key = f"{mentor_email}_{mentee_email}_{session_date}"
        lookup[key] = {
            "reason_category": _safe(row[8])  if len(row) > 8  else "",
            "reason_detail":   _safe(row[9])  if len(row) > 9  else "",
            "severity":        _safe(row[10]) if len(row) > 10 else "",
            "action_taken":    _safe(row[11]) if len(row) > 11 else "",
        }
    log.info(f"Mentor loader: loaded {len(lookup)} reason entries from '{tab_name}'")
    return lookup


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

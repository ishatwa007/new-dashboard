"""
cleaner.py - Data cleaning for Google Sheets rows
"""
import re
import pandas as pd
import numpy as np
from typing import Any, Optional

NULL_VALUES = {
    "", " ", "  ", "-", "--", "---", "N/A", "NA", "n/a", "na", "N/a",
    "None", "none", "NaN", "nan", "NaT", "nat", "#REF!", "#VALUE!",
    "#N/A", "#NAME?", "#DIV/0!", "Not Punched", "not punched",
    "Not punched", "Not Available", "not available", "null", "NULL",
    "undefined", ".", "..", "0.0", "na.", "N.A", "N.A.", "not found",
    "Not Found", "NOT FOUND",
}


def is_null(val: Any) -> bool:
    if val is None:
        return True
    if isinstance(val, float) and np.isnan(val):
        return True
    if isinstance(val, str) and val.strip() in NULL_VALUES:
        return True
    return False


def clean_str(val: Any) -> Optional[str]:
    if is_null(val):
        return None
    s = str(val).strip()
    if s in NULL_VALUES:
        return None
    return s


def clean_email(val: Any) -> Optional[str]:
    s = clean_str(val)
    if not s:
        return None
    s = s.lower().strip()
    if "@" not in s:
        return None
    s = re.sub(r"[,;]+$", "", s)
    return s


def display_name(email: Optional[str]) -> str:
    if not email:
        return "Unknown"
    local = email.split("@")[0]
    parts = re.split(r"[._\-]", local)
    return " ".join(p.capitalize() for p in parts if p)


def clean_number(val: Any, default: float = 0.0, cap: Optional[float] = None) -> float:
    if is_null(val):
        return default
    try:
        n = float(str(val).replace(",", "").strip())
        if np.isnan(n) or np.isinf(n):
            return default
        if n < 0:
            return default
        if cap is not None:
            n = min(n, cap)
        return n
    except (ValueError, TypeError):
        return default


def clean_pct(val: Any) -> float:
    n = clean_number(val, default=0.0)
    if n > 100:
        n = 100.0
    return round(n, 2)


def clean_sale_status(val: Any) -> str:
    s = clean_str(val)
    if not s:
        return "UNKNOWN"
    s = s.upper().strip()
    if s in ("COMPLETE", "COMPLETED"):
        return "COMPLETE"
    if s in ("PENDING",):
        return "PENDING"
    return "UNKNOWN"


def clean_week(val: Any) -> str:
    s = clean_str(val)
    if not s:
        return "unknown"
    s = s.lower().strip()
    m = re.match(r"w\s*(\d+)", s)
    if m:
        return f"w{m.group(1)}"
    return "unknown"


def clean_bool(val: Any) -> Optional[bool]:
    if is_null(val):
        return None
    if isinstance(val, bool):
        return val
    s = str(val).strip().lower()
    if s in ("true", "yes", "1", "t", "y"):
        return True
    if s in ("false", "no", "0", "f", "n"):
        return False
    return None


def clean_date(val: Any) -> Optional[pd.Timestamp]:
    if is_null(val):
        return None
    try:
        ts = pd.to_datetime(val, errors="coerce")
        if pd.isnull(ts):
            return None
        return ts
    except Exception:
        return None


def clean_probable(val: Any) -> Optional[bool]:
    s = clean_str(val)
    if not s:
        return None
    s_lower = s.lower()
    if s_lower in ("yes", "y", "true", "1"):
        return True
    if s_lower in ("no", "n", "false", "0"):
        return False
    if "first call" in s_lower:
        return True
    ts = clean_date(val)
    if ts is not None:
        return True
    return None


def normalise_cohort_id(raw: Any) -> Optional[str]:
    s = clean_str(raw)
    if not s:
        return None
    return s.lower().strip()


def clean_funnel_row(row: pd.Series) -> dict:
    cohort_raw = row.get("Cohort", "")
    return {
        "cohort_id":         normalise_cohort_id(cohort_raw),
        "user_id":           clean_str(row.get("User Id")),
        "email":             clean_email(row.get("Email")),
        "intake_program":    clean_str(row.get("Intake Program")),
        "current_program":   clean_str(row.get("Current Program")),
        "persona":           clean_str(row.get("Persona")),
        "lead_persona":      clean_str(row.get("Lead Persona")),
        "ctc":               clean_str(row.get("Ctc")),
        "current_ctc":       clean_str(row.get("Current Ctc")),
        "work_exp":          clean_number(row.get("Total Work Experience"), default=0),
        "sale_status":       clean_sale_status(row.get("Sale Status")),
        "week_of_sale":      clean_week(row.get("Week Of Sale")),
        "bda":               clean_email(row.get("Bda")),
        "bdm":               clean_email(row.get("Manager")),
        "avp":               clean_email(row.get("Avp")),
        "psa":               clean_email(row.get("Psa")),
        "refund_requested":  clean_bool(row.get("Refund Requested")) or False,
        "refunded":          clean_bool(row.get("Refunded")) or False,
        "refund_in_fec":     clean_date(row.get("Refund Requested In Fec")),  # date = raised during FEC call
        "mentee_status":     clean_str(row.get("Mentee Status")),
        "mng_date":          clean_date(row.get("Mng Date")),
        "onboarding_date":   clean_date(row.get("Onboarding Date")),
        "last_refund_day":   clean_date(row.get("Last Refund Day")),
        "refund_req_at":     clean_date(row.get("Refund Requested At")),
        "probable_id":       clean_date(row.get("Probable Refund Identified")),
        "priority":          clean_str(row.get("Priority New Model")),
        "source":            clean_str(row.get("Source")),
        "channel":           clean_str(row.get("Channel Group")),
        "final_source":      clean_str(row.get("Final Source")),
        "event_name":        clean_str(row.get("Event Name")),
        "mng_attended":      clean_bool(row.get("Mng Attended Live")),
        "mng_rating":        clean_pct(row.get("Mng Rating")),
        "mng_attendance":    clean_pct(row.get("Mng Overall Attendance")),
        "pysj_booked":       clean_str(row.get("Booked Pysj")),
        "pysj_completed":    clean_str(row.get("Completed Pysj")),
        "pysj_rating":       clean_pct(row.get("Pysj Rating")),
        "sat_attempted":     clean_bool(row.get("Attempted Sat")),
        "mentor_selected":   clean_bool(row.get("Mentor Selected")),
        "onboarding_filled": clean_bool(row.get("Filled Onboarding Form")),
        "exp_setting_done":  clean_pct(row.get("Expectation Setting Call Done")),
        "c1_live_att":       clean_pct(row.get("1 Live Attendance")),
        "c1_overall_att":    clean_pct(row.get("1 Overall Attendance")),
        "c1_psp":             clean_pct(row.get("1 Assignment Psp")),
        "c1_rating":         clean_number(row.get("1 Rating"), cap=5),
        "c2_live_att":       clean_pct(row.get("2 Live Attendance")),
        "c2_overall_att":    clean_pct(row.get("2 Overall Attendance")),
        "c2_psp":            clean_pct(row.get("2 Assignment Psp")),
        "c2_rating":         clean_number(row.get("2 Rating"), cap=5),
        "c3_live_att":       clean_pct(row.get("3 Live Attendance")),
        "c3_overall_att":    clean_pct(row.get("3 Overall Attendance")),
        "c3_psp":            clean_pct(row.get("3 Assignment Psp")),
        "batch":             clean_str(row.get("1 Batch")) or "Unassigned",
    }


DATE_COL_ALIASES   = ["Refund Requested On", "Refund Requested by Candidate On"]
REASON_COL_ALIASES = ["Identified Refund Reason [PSA Comments]", "Identified Refund Reason"]
STATED_COL_ALIASES = ["Stated Refund Reason - Include Email Content ",
                     "Stated Refund Reason - Email Content to be included",
                     "Stated Refund Reason - Include Email Content"]
PROBABLE_ALIASES   = ["Probable Identified ?", "Was this refund probable identified via me ?"]
OUTCOME_ALIASES    = ["Outcome \n(Retained/Refunded)", "Outcome (Retained/Not Retained)"]
SCOPE_ALIASES      = ["Scope of Retention"]
BDM_ALIASES        = ["BDM", "BDM/AGM/ASM"]
PSA_ALIASES        = ["PSA", "LSM"]


def _first_col(df: pd.DataFrame, aliases: list[str]) -> Optional[str]:
    for a in aliases:
        if a in df.columns:
            return a
    return None


def clean_persona_row(row: pd.Series, df: pd.DataFrame) -> dict:
    date_col    = _first_col(df, DATE_COL_ALIASES)
    reason_col  = _first_col(df, REASON_COL_ALIASES)
    stated_col  = _first_col(df, STATED_COL_ALIASES)
    probable_col= _first_col(df, PROBABLE_ALIASES)
    outcome_col = _first_col(df, OUTCOME_ALIASES)
    scope_col   = _first_col(df, SCOPE_ALIASES)
    bdm_col     = _first_col(df, BDM_ALIASES)
    psa_col     = _first_col(df, PSA_ALIASES)

    email = clean_email(row.get("Email"))
    if not email:
        return {}

    return {
        "email":           email,
        "batch":           clean_str(row.get("1 Batch") or row.get("Batch") or "Unassigned"),
        "sale_status":     clean_sale_status(row.get("Sale Status")),
        "bda":             clean_email(row.get("BDA")),
        "bdm":             clean_email(row.get(bdm_col)) if bdm_col else None,
        "avp":             clean_email(row.get("AVP")),
        "psa":             clean_email(row.get(psa_col)) if psa_col else None,
        "refund_date":     clean_date(row.get(date_col)) if date_col else None,
        "probable":        clean_probable(row.get(probable_col)) if probable_col else None,
        "profession":      clean_str(row.get("Profession/Background")),
        "years_exp":       clean_str(row.get("Years of Exp")),
        "support_system":  clean_str(row.get("Support System")),
        "financial_sit":   clean_str(row.get("Financial Situation", row.get("Financial Situation - CTC"))),
        "reason_joining":  clean_str(row.get("Reason for Joining Scaler")),
        "stated_reason":   clean_str(row.get(stated_col)) if stated_col else None,
        "identified_reason": clean_str(row.get(reason_col)) if reason_col else None,
        "actions_taken":   clean_str(row.get("Actions Taken")),
        "what_didnt_work": clean_str(row.get("What Didn't Work")),
        "outcome":         clean_str(row.get(outcome_col)) if outcome_col else None,
        "scope":           clean_str(row.get(scope_col)) if scope_col else None,
        "overall_att":     clean_pct(row.get("Overall Attendance")),
        "overall_psp":     clean_pct(row.get("Overall PSP")),
        "pysj_booked":     clean_str(row.get("PYSJ Booked")),
        "mentor_session":  clean_str(row.get("Mentor Session")),
    }

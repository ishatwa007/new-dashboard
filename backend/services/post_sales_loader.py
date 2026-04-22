"""
post_sales_loader.py

Reads Classroom and Introductory Week data from the Post Sales Tracker sheet.
Replaces LSM Class Tracker + Ratings Sheet as source for Page 5 (Classroom).

Tab mapping:
  Classes           -> class ratings, attendance, PSP per learner per class
  Ratings Sheet     -> batch-level rating summary + instructor names
  Introductory Week -> MnG, PYSJ, onboarding per learner

Column layout (Classes tab):
  A=Name, B=Email, C=Punched Mail, D=Segment(Batch), E=PSA, F=Phone
  G=Payment Status, H=Refund Status, I=Batch
  M=1st Class Rating, N=1st Live Att, O=1st Overall Att, P=1st PSP
  S=2nd Class Rating, T=2nd Live Att, U=2nd Overall Att, V=2nd PSP
  Y=3rd Class Rating, Z=3rd Live Att, AA=3rd Overall Att, AB=3rd PSP
  AE=4th Class Rating, AF=4th Overall Att, AG=4th PSP
  AJ=5th Class Rating, AK=5th Overall Att, AL=5th PSP
  AM=6th Class Rating
"""

import logging
from typing import Optional

log = logging.getLogger(__name__)

# Column indices (0-based) in the Classes tab
# Row 2 = headers (row index 1), data starts row index 2
CLASSES_HEADER_ROW = 1   # 0-indexed
CLASSES_DATA_START = 2   # 0-indexed

# Col mapping (0-based) based on actual Post Sales tracker layout
C_EMAIL   = 1   # B = Email
C_BATCH   = 8   # I = Batch  (D = Segment also works as fallback)
C_SEGMENT = 3   # D = Segment
C_PSA     = 4   # E = Primary Owner Email
C_PAY     = 6   # G = Payment Status
C_REFUND  = 7   # H = Refund Status

# Per-class columns: (rating, live_att, overall_att, psp, connect, notes)
CLASS_COLS = {
    1: (12, 13, 14, 15, 16, 17),   # M, N, O, P, Q, R
    2: (18, 19, 20, 21, 22, 23),   # S, T, U, V, W, X
    3: (24, 25, 26, 27, 28, 29),   # Y, Z, AA, AB, AC, AD
    4: (30, 31, 32, None, 33, 34), # AE, AF, AG, -, AH, AI
    5: (35, None, 36, 37, 44, 45), # AJ, -, AK, AL, AS, AT
    6: (38, None, 39, 40, None, None),  # AM, -, AN, AO, -, -
}

# Ratings Sheet tab columns (0-based)
RS_BATCH       = 0  # A = Batches
RS_TOTAL_RATED = 1  # B = Total Ratings
RS_LOW_RATED   = 2  # C = Low Ratings
RS_AVG_RATING  = 3  # D = Class Ratings / Avg
RS_INSTRUCTOR  = 4  # E = Instructor Names


def _safe_float(val, cap=None) -> Optional[float]:
    if val is None or str(val).strip() in ("", "-", "N/A", "NaN", "nan"):
        return None
    try:
        f = float(str(val).strip())
        if cap and f > cap:
            return None
        return f
    except (ValueError, TypeError):
        return None


def _safe_str(val) -> str:
    if val is None:
        return ""
    return str(val).strip()


def _sale_status(pay_val, refund_val) -> str:
    """Convert Post Sales payment/refund status to COMPLETE/PENDING."""
    p = _safe_str(pay_val).upper()
    r = _safe_str(refund_val).upper()
    if r in ("TRUE", "YES", "REFUNDED"):
        return "REFUNDED"
    if p in ("COMPLETE", "COMPLETED", "ACTIVE"):
        return "COMPLETE"
    return "PENDING"


def parse_classes_tab(raw: list) -> tuple[list, list, list]:
    """
    Parse the Classes tab from Post Sales tracker.
    Returns (class_ratings, low_raters, class_missed).
    class_missed = learners with live_att == 0 for a class.
    """
    if len(raw) < 3:
        return [], [], []

    batch_data = {}
    low_raters = []
    class_missed = []

    for row in raw[CLASSES_DATA_START:]:
        if not row or len(row) < 5:
            continue

        email = _safe_str(row[C_EMAIL]).lower()
        if not email or email in ("email", "punched mail id", "nan"):
            continue

        # Prefer Batch (col I) over Segment (col D)
        batch = _safe_str(row[C_BATCH]) if C_BATCH < len(row) else ""
        if not batch:
            batch = _safe_str(row[C_SEGMENT])
        if not batch or batch.lower() in ("batch", "segment", ""):
            continue

        name = _safe_str(row[0]) if len(row) > 0 else ""
        psa = _safe_str(row[C_PSA]) if C_PSA < len(row) else ""
        pay = row[C_PAY] if C_PAY < len(row) else ""
        ref = row[C_REFUND] if C_REFUND < len(row) else ""
        sale_status = _sale_status(pay, ref)

        if batch not in batch_data:
            batch_data[batch] = {
                cn: {"ratings": [], "atts": [], "psps": [], "overall_atts": []}
                for cn in range(1, 7)
            }

        for cn, (r_col, live_col, overall_col, psp_col, connect_col, notes_col) in CLASS_COLS.items():
            # Rating
            r_val = _safe_float(row[r_col] if r_col < len(row) else None, cap=5)
            if r_val is not None:
                batch_data[batch][cn]["ratings"].append(r_val)
                if r_val <= 3:
                    notes = _safe_str(row[notes_col] if notes_col is not None and notes_col < len(row) else "")
                    connect = _safe_str(row[connect_col] if connect_col is not None and connect_col < len(row) else "")
                    lsm_notes = f"[{connect}] {notes}".strip(" []") if connect and notes else notes or connect
                    low_raters.append({
                        "email": email,
                        "name": name,
                        "batch": batch,
                        "psa": psa,
                        "sale_status": sale_status,
                        "class_num": cn,
                        "rating": r_val,
                        "lsm_notes": lsm_notes,
                        "noshow_reason": "",
                        "persona": "",
                        "ctc": "",
                        "experience": "",
                    })

            # Live attendance
            if live_col is not None:
                live = _safe_float(row[live_col] if live_col < len(row) else None)
                if live is not None:
                    batch_data[batch][cn]["atts"].append(live)
                    # Class missed = live attendance is 0
                    if live == 0:
                        notes = _safe_str(row[notes_col] if notes_col is not None and notes_col < len(row) else "")
                        connect = _safe_str(row[connect_col] if connect_col is not None and connect_col < len(row) else "")
                        psa_note = f"[{connect}] {notes}".strip(" []") if connect and notes else notes or connect
                        class_missed.append({
                            "email": email,
                            "name": name,
                            "batch": batch,
                            "psa": psa,
                            "sale_status": sale_status,
                            "class_num": cn,
                            "live_att": live,
                            "overall_att": _safe_float(row[overall_col] if overall_col is not None and overall_col < len(row) else None),
                            "connect_status": connect,
                            "notes": psa_note,
                            "persona": "",
                            "ctc": "",
                        })

            # Overall attendance
            if overall_col is not None:
                overall = _safe_float(row[overall_col] if overall_col < len(row) else None)
                if overall is not None:
                    batch_data[batch][cn]["overall_atts"].append(overall)

            # PSP
            if psp_col is not None:
                psp = _safe_float(row[psp_col] if psp_col < len(row) else None)
                if psp is not None:
                    batch_data[batch][cn]["psps"].append(psp)

    # Compute averages
    class_ratings = []
    for batch in sorted(batch_data.keys()):
        entry = {"batch": batch, "classes": {}, "instructor": ""}
        for cn in range(1, 7):
            d = batch_data[batch][cn]
            if not d["ratings"]:
                continue
            avg_r = round(sum(d["ratings"]) / len(d["ratings"]), 2)
            avg_a = round(sum(d["atts"]) / len(d["atts"]), 1) if d["atts"] else None
            avg_oa = round(sum(d["overall_atts"]) / len(d["overall_atts"]), 1) if d["overall_atts"] else None
            avg_p = round(sum(d["psps"]) / len(d["psps"]), 1) if d["psps"] else None
            low_c = sum(1 for r in d["ratings"] if r <= 3)
            missed_c = sum(1 for m in class_missed if m["batch"] == batch and m["class_num"] == cn)
            entry["classes"][str(cn)] = {
                "avg_rating": avg_r,
                "total_rated": len(d["ratings"]),
                "low_count": low_c,
                "missed_count": missed_c,
                "avg_live_att": avg_a,
                "avg_overall_att": avg_oa,
                "avg_psp": avg_p,
                "flag": "LOW" if avg_r < 4 else ("WATCH" if avg_r < 4.5 else "OK"),
            }
        if entry["classes"]:
            class_ratings.append(entry)

    return class_ratings, low_raters, class_missed


def parse_ratings_sheet_tab(raw: list) -> dict:
    """
    Parse the Ratings Sheet tab from Post Sales tracker.
    Returns dict: batch_name -> instructor_name (same as program_health.parse_ratings_sheet).
    Also returns enriched data with total_ratings, low_ratings, avg_rating per batch.
    """
    if len(raw) < 2:
        return {}

    mapping = {}
    for row in raw[1:]:  # skip header row
        if not row or not _safe_str(row[0]):
            continue
        batch = _safe_str(row[RS_BATCH])
        if not batch or batch.lower() in ("batches", "batch"):
            continue
        instructor = _safe_str(row[RS_INSTRUCTOR]) if RS_INSTRUCTOR < len(row) else ""
        mapping[batch] = instructor

    return mapping


def parse_introductory_week_tab(raw: list) -> list:
    """
    Parse the Introductory Week tab from Post Sales tracker.
    Returns list of dicts with MnG, PYSJ, onboarding data per learner.

    Headers (row 0):
    A=Name, B=Email, C=Punched Mail, D=Segment, E=Owner(PSA), F=Phone
    G=Onboarding Date, H=Probable Refund, I=Payment Status, J=Refund Status
    K=Filled Onboarding Form, L=Expectation Setting, M=SAT Attempted
    N=Mentor Selected, O=Pre M&G Call Status, P=Notes
    Q=PYSJ Booked, R=PYSJ Completed, S=PYSJ Rating, T=PYSJ Updates
    U=M&G Attendance (Live), V=M&G Rating, W=Post M&G Updates
    X=Refund Likelihood, Y=Call Status, Z=Detailed Notes
    """
    if len(raw) < 2:
        return []

    rows = []
    for row in raw[1:]:
        if not row or len(row) < 2:
            continue
        email = _safe_str(row[1]).lower()
        if not email or email in ("email", "punched mail id"):
            continue

        rows.append({
            "email": email,
            "name": _safe_str(row[0]),
            "batch": _safe_str(row[3]),
            "psa": _safe_str(row[4]) if len(row) > 4 else "",
            "onboarding_form": _safe_str(row[10]) if len(row) > 10 else "",
            "expectation_setting": _safe_str(row[11]) if len(row) > 11 else "",
            "sat_attempted": _safe_str(row[12]) if len(row) > 12 else "",
            "mentor_selected": _safe_str(row[13]) if len(row) > 13 else "",
            "pre_mng_call_status": _safe_str(row[14]) if len(row) > 14 else "",
            "pysj_booked": _safe_str(row[16]) if len(row) > 16 else "",
            "pysj_completed": _safe_str(row[17]) if len(row) > 17 else "",
            "pysj_rating": _safe_float(row[18] if len(row) > 18 else None, cap=5),
            "mng_live_att": _safe_float(row[20] if len(row) > 20 else None),
            "mng_rating": _safe_float(row[21] if len(row) > 21 else None, cap=5),
            "refund_likelihood": _safe_str(row[23]) if len(row) > 23 else "",
            "call_status": _safe_str(row[24]) if len(row) > 24 else "",
            "notes": _safe_str(row[25]) if len(row) > 25 else "",
        })

    return rows


def load_postsales_classroom(gc, sheet_id: str) -> tuple[list, list, dict, list]:
    """
    Main entry point. Load classroom data from Post Sales tracker.
    Returns (class_ratings, low_raters, instructor_map, class_missed).
    """
    if not gc or not sheet_id:
        log.warning("Post Sales loader: no gc or sheet_id provided")
        return [], [], {}, []

    try:
        wb = gc.open_by_key(sheet_id)
    except Exception as e:
        log.error(f"Post Sales loader: failed to open sheet {sheet_id[:12]}...: {e}")
        return [], [], {}, []

    def _safe_tab(name):
        try:
            return wb.worksheet(name).get_all_values()
        except Exception as ex:
            log.warning(f"Post Sales tab '{name}' not found: {ex}")
            return []

    raw_classes = _safe_tab("Classes")
    raw_ratings = _safe_tab("Ratings Sheet")

    class_ratings, low_raters, class_missed = parse_classes_tab(raw_classes)
    instructor_map = parse_ratings_sheet_tab(raw_ratings)

    # Attach instructor names to class_ratings
    for cr in class_ratings:
        cr["instructor"] = instructor_map.get(cr["batch"], "")

    log.info(f"Post Sales loader: {len(class_ratings)} batches, {len(low_raters)} low raters, {len(class_missed)} missed")
    return class_ratings, low_raters, instructor_map, class_missed


def load_postsales_intro_week(gc, sheet_id: str) -> list:
    """Load Introductory Week data from Post Sales tracker."""
    if not gc or not sheet_id:
        return []
    try:
        wb = gc.open_by_key(sheet_id)
        raw = wb.worksheet("Introductory Week").get_all_values()
        rows = parse_introductory_week_tab(raw)
        log.info(f"Post Sales intro week: {len(rows)} learners")
        return rows
    except Exception as e:
        log.error(f"Post Sales intro week load failed: {e}")
        return []

"""
lsm_loader.py — reads LSM Tracker Google Sheet
Sheet ID: 1-83qFsRBEXGQGyHPdmmhbd9Gx1aACSRlM7OxHtRnE9w

Tabs expected:
  - Dump (auto-populated from Raw Import)
  - Requests (LSMs fill this manually)
  - Refund Reasons
  - Class Tracker
  - Introductory Week
"""

import gspread
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional

LSM_SHEET_ID = "1-83qFsRBEXGQGyHPdmmhbd9Gx1aACSRlM7OxHtRnE9w"

REQUEST_TYPES = {
    "Batch Shift":               {"key": "batch_shift",    "color": "#7c7aed"},
    "Recording Access":          {"key": "recording",      "color": "#4ade80"},
    "Attendance Correction":     {"key": "attendance",     "color": "#fbbf24"},
    "Mentor Assignment":         {"key": "mentor_assign",  "color": "#22d3ee"},
    "Mentor Change":             {"key": "mentor_change",  "color": "#f472b6"},
    "Mentor Session Reschedule": {"key": "mentor_resched", "color": "#a78bfa"},
    "Mentor Session Cancel":     {"key": "mentor_cancel",  "color": "#fb923c"},
    "EMI Restructuring":         {"key": "emi_restruct",   "color": "#f87171"},
    "Other":                     {"key": "other",          "color": "#8a8a90"},
}


def get_lsm_sheet(gc: gspread.Client):
    """Open the LSM tracker spreadsheet."""
    return gc.open_by_key(LSM_SHEET_ID)


def load_requests(gc: gspread.Client) -> list[dict]:
    """
    Load requests from the 'Requests' tab of LSM tracker.

    Expected columns (flexible, matched by header name):
    A: Request ID / Row number
    B: Date Raised
    C: Learner Email
    D: Learner Name
    E: Batch
    F: LSM (PSA email)
    G: Request Type
    H: Request Body / Description
    I: Priority (High / Medium / Low)
    J: Status (Pending / Under Review / Approved / Rejected / Done)
    K: Manager Note
    L: Date Actioned
    M: Risk Level (auto-classified or manual)
    N: Sale Status
    O: Program
    """
    try:
        sh = get_lsm_sheet(gc)

        # Try to open Requests tab
        try:
            ws = sh.worksheet("Requests")
        except gspread.WorksheetNotFound:
            # Return empty if tab doesn't exist yet
            return []

        records = ws.get_all_records(empty2zero=False)
        if not records:
            return []

        requests = []
        now = datetime.now()

        for i, row in enumerate(records, 1):
            # Flexible column matching
            email = str(row.get("Learner Email", row.get("Email", ""))).strip().lower()
            if not email or email == "nan":
                continue

            name = str(row.get("Learner Name", row.get("Name", email.split("@")[0].title()))).strip()
            batch = str(row.get("Batch", "")).strip()
            lsm = str(row.get("LSM", row.get("PSA", ""))).strip()
            req_type_raw = str(row.get("Request Type", "Other")).strip()
            body = str(row.get("Request Body", row.get("Description", "No description provided."))).strip()
            priority = str(row.get("Priority", "Medium")).strip()
            status = str(row.get("Status", "Pending")).strip()
            manager_note = str(row.get("Manager Note", "")).strip()
            risk = str(row.get("Risk Level", "Medium")).strip()
            sale_status = str(row.get("Sale Status", "Active")).strip()
            program = str(row.get("Program", batch.split()[0] if batch else "")).strip()

            # Date parsing
            date_raw = str(row.get("Date Raised", "")).strip()
            try:
                raised = pd.to_datetime(date_raw)
                if raised.tzinfo is None:
                    raised = raised.replace(tzinfo=None)
                hours_pending = int((now - raised.to_pydatetime()).total_seconds() / 3600)
            except Exception:
                raised = now - timedelta(hours=24)
                hours_pending = 24

            # Request type object
            rt_info = REQUEST_TYPES.get(req_type_raw, REQUEST_TYPES["Other"])
            request_type = {"key": rt_info["key"], "label": req_type_raw or "Other", "color": rt_info["color"]}

            # Request ID
            req_id = str(row.get("Request ID", f"REQ-{5000+i}")).strip()
            if not req_id or req_id == "nan":
                req_id = f"REQ-{5000+i}"

            requests.append({
                "sr": i,
                "id": req_id,
                "raised": raised.isoformat(),
                "learner": name,
                "email": email,
                "batch": batch,
                "lsm": lsm,
                "program": program,
                "saleStatus": sale_status,
                "requestType": request_type,
                "classification": {},  # filled by classifier
                "priority": priority if priority in ["High", "Medium", "Low"] else "Medium",
                "status": status if status in ["Pending", "Under Review", "Approved", "Rejected", "Done"] else "Pending",
                "hoursPending": max(0, hours_pending),
                "risk": risk if risk in ["High", "Medium", "Low"] else "Medium",
                "body": body,
                "managerNote": manager_note,
                "confidence": None,
            })

        return requests

    except Exception as e:
        print(f"[LSM] Error loading requests: {e}")
        return []


def approve_request(gc: gspread.Client, request_id: str, note: str, manager: str) -> bool:
    """
    Write approval back to Google Sheet.
    Finds the row by Request ID and updates Status, Manager Note, Date Actioned.
    """
    try:
        sh = get_lsm_sheet(gc)
        ws = sh.worksheet("Requests")
        all_values = ws.get_all_values()

        if not all_values:
            return False

        headers = [h.strip() for h in all_values[0]]

        # Find column indices
        def col_idx(name):
            for possible in [name, name.lower(), name.title()]:
                if possible in headers:
                    return headers.index(possible) + 1  # 1-indexed
            return None

        id_col     = col_idx("Request ID")
        status_col = col_idx("Status")
        note_col   = col_idx("Manager Note")
        date_col   = col_idx("Date Actioned")

        if not all([id_col, status_col]):
            print("[LSM] Could not find required columns")
            return False

        # Find the row
        for row_num, row in enumerate(all_values[1:], start=2):
            row_id = row[id_col - 1].strip() if id_col <= len(row) else ""
            if row_id == request_id:
                now_str = datetime.now().strftime("%d %b %Y %H:%M")
                ws.update_cell(row_num, status_col, "Approved")
                if note_col:
                    ws.update_cell(row_num, note_col, f"[{manager}, {now_str}] {note}")
                if date_col:
                    ws.update_cell(row_num, date_col, now_str)
                return True

        print(f"[LSM] Request ID {request_id} not found in sheet")
        return False

    except Exception as e:
        print(f"[LSM] Error approving request: {e}")
        return False


def reject_request(gc: gspread.Client, request_id: str, reason: str, manager: str) -> bool:
    """
    Write rejection back to Google Sheet.
    """
    try:
        sh = get_lsm_sheet(gc)
        ws = sh.worksheet("Requests")
        all_values = ws.get_all_values()

        if not all_values:
            return False

        headers = [h.strip() for h in all_values[0]]

        def col_idx(name):
            for possible in [name, name.lower(), name.title()]:
                if possible in headers:
                    return headers.index(possible) + 1
            return None

        id_col     = col_idx("Request ID")
        status_col = col_idx("Status")
        note_col   = col_idx("Manager Note")
        date_col   = col_idx("Date Actioned")

        if not all([id_col, status_col]):
            return False

        for row_num, row in enumerate(all_values[1:], start=2):
            row_id = row[id_col - 1].strip() if id_col <= len(row) else ""
            if row_id == request_id:
                now_str = datetime.now().strftime("%d %b %Y %H:%M")
                ws.update_cell(row_num, status_col, "Rejected")
                if note_col:
                    ws.update_cell(row_num, note_col, f"[REJECTED by {manager}, {now_str}] {reason}")
                if date_col:
                    ws.update_cell(row_num, date_col, now_str)
                return True

        return False

    except Exception as e:
        print(f"[LSM] Error rejecting request: {e}")
        return False


def load_dump_summary(gc: gspread.Client, cohort: str = "april2026") -> dict:
    """
    Load PSA-level summary from Dump tab for analytics.
    Returns PSA list with refund metrics.
    """
    try:
        sh = get_lsm_sheet(gc)
        ws = sh.worksheet("Dump")
        records = ws.get_all_records(empty2zero=False)
        if not records:
            return {}

        df = pd.DataFrame(records)
        df.columns = [str(c).strip() for c in df.columns]

        summary = {}
        if "PSA" in df.columns:
            for psa, grp in df.groupby("PSA"):
                if not psa:
                    continue
                total = len(grp)
                complete = (grp.get("Sale Status", pd.Series()) == "COMPLETE").sum()
                refund_req = grp.get("Refund Requested", pd.Series())
                refunded = grp.get("Refunded", pd.Series())
                req_count = (refund_req.astype(str).str.upper() == "TRUE").sum()
                ref_count = (refunded.astype(str).str.upper() == "TRUE").sum()
                summary[str(psa).strip()] = {
                    "total": int(total),
                    "complete": int(complete),
                    "refundRequested": int(req_count),
                    "refunded": int(ref_count),
                    "rate": round(ref_count / complete * 100, 1) if complete > 0 else 0,
                    "gtn": round((complete - ref_count) / complete * 100, 1) if complete > 0 else 0,
                }
        return summary

    except Exception as e:
        print(f"[LSM] Error loading dump summary: {e}")
        return {}

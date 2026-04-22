"""
Program Health Service — Page 3 Backend
Reads: Program Incidents, Class Tracker, Ratings Sheet tabs from LSM Google Sheet
Writes: Resolve/Escalate updates back to Program Incidents tab
AI: Incident classification + low-rater theme summaries via Groq
"""

import os, json, hashlib, logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

log = logging.getLogger("program_health")
router = APIRouter(prefix="/api/program", tags=["program-health"])

_gc = None
_sheet_id = None
_slack_url = os.getenv("SLACK_WEBHOOK_URL", "")
_funnel_lookup = None  # email -> {psa, bda, bdm, avp}
_funnel_ext_lookup = None  # email -> {persona, ctc, experience, program, batch}

# AI classification
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"
_AI_CACHE_DIR = Path("classifier_cache_program")
_AI_CACHE_DIR.mkdir(exist_ok=True)

INCIDENT_BUCKETS = [
    "Staff No-show",
    "Late Join",
    "Tech Issue",
    "Content Issue",
    "Scheduling Conflict",
    "Learner Engagement",
    "Other",
]


def _cache_get(key: str):
    p = _AI_CACHE_DIR / f"{key}.json"
    if p.exists():
        try:
            return json.loads(p.read_text())
        except Exception:
            return None
    return None


def _cache_set(key: str, value):
    p = _AI_CACHE_DIR / f"{key}.json"
    try:
        p.write_text(json.dumps(value))
    except Exception:
        pass


def _groq_call(system: str, user: str, max_tokens: int = 80) -> Optional[str]:
    if not GROQ_API_KEY:
        return None
    try:
        import httpx
        r = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                "temperature": 0,
                "max_tokens": max_tokens,
            },
            timeout=12.0,
        )
        if r.status_code == 200:
            return r.json()["choices"][0]["message"]["content"].strip()
        log.warning(f"Groq {r.status_code}: {r.text[:160]}")
    except Exception as e:
        log.warning(f"Groq error: {e}")
    return None


# ──────────────────────────────────────────────
# AI CLASSIFICATION
# ──────────────────────────────────────────────

def _keyword_bucket(incident_type: str, details: str) -> str:
    t = (incident_type or "").lower()
    d = (details or "").lower()
    combined = t + " " + d

    if any(w in combined for w in ["mentor no-show", "ta no-show", "instructor no-show", "no show", "absent", "didn't join", "didnt join", "did not join"]):
        return "Staff No-show"
    if any(w in combined for w in ["late join", "late", "delayed start"]):
        return "Late Join"
    if any(w in combined for w in ["zoom", "meet", "platform", "tech", "audio", "video", "connection", "dropped", "lag"]):
        return "Tech Issue"
    if any(w in combined for w in ["slide", "content", "syllabus", "curriculum", "outdated", "incorrect material"]):
        return "Content Issue"
    if any(w in combined for w in ["schedule", "conflict", "clash", "timing", "rescheduled"]):
        return "Scheduling Conflict"
    if any(w in combined for w in ["mentee", "learner", "attendance", "rsvp", "didn't attend", "low attendance"]):
        return "Learner Engagement"
    return "Other"


def classify_incident_bucket(incident_type: str, details: str) -> str:
    """Classify incident into canonical bucket. Cache + Groq + keyword fallback."""
    combined = f"{incident_type}|{details or ''}"
    if not combined.strip("|"):
        return "Other"

    key = hashlib.md5(combined.lower().encode()).hexdigest()
    cached = _cache_get(f"bucket_{key}")
    if cached:
        return cached.get("bucket", "Other")

    system = (
        f"Classify this class incident into exactly ONE of these canonical buckets: "
        f"{json.dumps(INCIDENT_BUCKETS)}. Reply with only the bucket name."
    )
    user = f"Type: {incident_type}\nDetails: {(details or '')[:400]}"
    answer = _groq_call(system, user, max_tokens=20)

    bucket = None
    if answer:
        for b in INCIDENT_BUCKETS:
            if b.lower() in answer.lower() or answer.lower() in b.lower():
                bucket = b
                break

    if not bucket:
        bucket = _keyword_bucket(incident_type, details or "")

    _cache_set(f"bucket_{key}", {"bucket": bucket})
    return bucket


def summarize_lsm_notes(notes_list: List[str], max_bullets: int = 4) -> List[str]:
    """Summarize a list of LSM free-text notes into bullet themes via Groq."""
    clean = [n.strip() for n in notes_list if n and n.strip() and n.strip() != "--"]
    if not clean:
        return []

    # If just 1 note, return it as a single cleaned bullet
    if len(clean) == 1:
        return [clean[0][:140]]

    joined = "\n".join(f"- {n[:200]}" for n in clean[:12])
    key = hashlib.md5(joined.encode()).hexdigest()
    cached = _cache_get(f"summary_{key}")
    if cached:
        return cached.get("bullets", [])

    system = (
        "You are analyzing learner feedback on a class. Read the notes and return "
        f"{max_bullets} concise bullet points summarizing the common themes. "
        "Each bullet MUST be under 12 words. Use plain factual language. "
        "Output format: one bullet per line, starting with a dash. No preamble, no numbering."
    )
    user = f"LSM notes from learners who rated the class low:\n{joined}"
    answer = _groq_call(system, user, max_tokens=200)

    bullets = []
    if answer:
        for line in answer.split("\n"):
            line = line.strip().lstrip("-*•").strip()
            if line and len(line) > 3:
                bullets.append(line[:140])
            if len(bullets) >= max_bullets:
                break

    if not bullets:
        # Fallback: first 3 notes truncated
        bullets = [n[:120] for n in clean[:3]]

    _cache_set(f"summary_{key}", {"bullets": bullets})
    return bullets


def group_low_raters_by_batch(low_raters: List[Dict]) -> List[Dict]:
    """
    Group low raters by batch+class_num, summarize notes with AI.
    Returns list sorted by low-rater count desc.
    """
    if not low_raters:
        return []

    groups: Dict[str, Dict] = {}
    for lr in low_raters:
        batch = lr.get("batch") or "Unknown"
        cn = lr.get("class_num") or "?"
        gkey = f"{batch}||{cn}"
        if gkey not in groups:
            groups[gkey] = {
                "batch": batch,
                "class_num": cn,
                "count": 0,
                "ratings": [],
                "notes": [],
                "learners": [],
            }
        g = groups[gkey]
        g["count"] += 1
        if lr.get("rating") is not None:
            try:
                g["ratings"].append(float(lr["rating"]))
            except Exception:
                pass
        if lr.get("lsm_notes"):
            g["notes"].append(lr["lsm_notes"])
        g["learners"].append({
            "email": lr.get("email", ""),
            "psa": lr.get("psa", ""),
            "rating": lr.get("rating", 0),
            "notes": lr.get("lsm_notes", ""),
        })

    result = []
    for gkey, g in groups.items():
        avg = round(sum(g["ratings"]) / len(g["ratings"]), 2) if g["ratings"] else None
        summary = summarize_lsm_notes(g["notes"])
        result.append({
            "batch": g["batch"],
            "class_num": g["class_num"],
            "count": g["count"],
            "avg_rating": avg,
            "summary_bullets": summary,
            "learners": sorted(g["learners"], key=lambda x: x["rating"]),
        })

    return sorted(result, key=lambda x: -x["count"])


def init(gc, sheet_id):
    global _gc, _sheet_id
    _gc = gc
    _sheet_id = sheet_id
    log.info(f"Program Health initialized, sheet={sheet_id[:12]}...")


def _clean(val):
    """Sanitize a pandas value: convert NaN/None/nan to empty string."""
    if val is None:
        return ""
    try:
        import math
        if isinstance(val, float) and math.isnan(val):
            return ""
    except (TypeError, ValueError):
        pass
    return str(val).strip() if val else ""


def set_funnel_lookup(funnel_df):
    """Called from main.py after funnel loads. Builds email -> owner mapping."""
    global _funnel_lookup, _funnel_ext_lookup
    if funnel_df is None or funnel_df.empty:
        _funnel_lookup = None
        _funnel_ext_lookup = None
        return
    lookup = {}
    ext_lookup = {}
    for _, r in funnel_df.iterrows():
        email = r.get("email")
        if not email:
            continue
        el = str(email).strip().lower()
        if not el or el == "nan":
            continue
        lookup[el] = {
            "psa": _clean(r.get("psa")),
            "bda": _clean(r.get("bda")),
            "bdm": _clean(r.get("bdm")),
            "avp": _clean(r.get("avp")),
        }
        ext_lookup[el] = {
            "persona": _clean(r.get("persona") or r.get("lead_persona")),
            "ctc": _clean(r.get("ctc") or r.get("current_ctc")),
            "experience": _clean(r.get("experience") or r.get("total_work_experience")),
            "program": _clean(r.get("current_program") or r.get("program")),
            "batch": _clean(r.get("intake_batch") or r.get("batch")),
            "sale_status": _clean(r.get("sale_status")),
        }
    _funnel_lookup = lookup
    _funnel_ext_lookup = ext_lookup
    log.info(f"Program Health funnel lookup: {len(lookup)} learners, ext: {len(ext_lookup)}")


def _lookup_persona(email: str) -> dict:
    """Look up persona/CTC/experience from funnel data for a learner email."""
    if not _funnel_lookup or not email:
        return {}
    # _funnel_lookup only has psa/bda/bdm/avp. We need the full funnel row.
    # Use extended lookup if available.
    entry = _funnel_ext_lookup.get(email.lower()) if _funnel_ext_lookup else None
    if entry:
        return entry
    return {}


def _lookup_psa(email: str, fallback: str = "") -> str:
    if not _funnel_lookup or not email:
        return fallback
    entry = _funnel_lookup.get(email.lower())
    return (entry.get("psa") if entry else "") or fallback


def _get_wb():
    if not _gc or not _sheet_id:
        raise HTTPException(503, "Google Sheets not configured")
    return _gc.open_by_key(_sheet_id)


def _safe_tab(wb, name):
    try:
        return wb.worksheet(name).get_all_values()
    except Exception as e:
        log.warning(f"Tab '{name}' not available: {e}")
        return []


# ──────────────────────────────────────────────
# Parsers
# ──────────────────────────────────────────────

def parse_incidents(raw):
    """
    Program Incidents tab layout:
    raw[0] = merged title row
    raw[1] = section headers (Incident Details | Resolution | Escalation)
    raw[2] = column headers (Date | Batch | Class # | ...)
    raw[3:] = data rows
    """
    if len(raw) < 4:
        return []
    out = []
    for i, row in enumerate(raw[3:], start=4):
        if len(row) < 4 or not any(c.strip() for c in row[:6]):
            continue
        out.append({
            "id": i,
            "date": row[0].strip() if len(row) > 0 else "",
            "batch": row[1].strip() if len(row) > 1 else "",
            "class_num": row[2].strip() if len(row) > 2 else "",
            "incident_type": row[3].strip() if len(row) > 3 else "",
            "instructor_name": row[4].strip() if len(row) > 4 else "",
            "details": row[5].strip() if len(row) > 5 else "",
            "reported_by": row[6].strip() if len(row) > 6 else "",
            "status": row[7].strip() if len(row) > 7 else "Open",
            "resolution_notes": row[8].strip() if len(row) > 8 else "",
            "escalated_to": row[9].strip() if len(row) > 9 else "",
            "escalation_date": row[10].strip() if len(row) > 10 else "",
            "manager_remarks": row[11].strip() if len(row) > 11 else "",
        })
    return out


def parse_class_tracker(raw):
    """
    Class Tracker tab layout:
    raw[0] = merged title
    raw[1] = section headers (Learner Details | Class 1 | Class 2 | ...)
    raw[2] = column headers (Learner Email | Batch | PSA | Sale Status | Live Att% | Overall Att% | PSP% | Rating | No-show Reason | LSM Notes | ...)
    raw[3:] = data

    Per-class block = 6 columns: LiveAtt, OverallAtt, PSP, Rating, NoShowReason, LSMNotes
    Class 1 starts at col index 4.
    """
    if len(raw) < 4:
        return [], []

    START = 4
    BLOCK = 6
    MAX_CLASSES = 6

    batch_data = {}
    low_raters = []

    for row in raw[3:]:
        if len(row) < 5 or not row[0].strip():
            continue

        email = row[0].strip()
        batch = row[1].strip() if len(row) > 1 else ""
        sheet_psa = row[2].strip() if len(row) > 2 else ""
        # Look up PSA from Funnel data - source of truth. Fallback to sheet value.
        psa = _lookup_psa(email, fallback=sheet_psa)
        sale_status = row[3].strip() if len(row) > 3 else ""

        if not batch or batch == "Batch":
            continue

        if batch not in batch_data:
            batch_data[batch] = {cn: {"ratings": [], "atts": [], "psps": [], "overall_atts": []} for cn in range(1, MAX_CLASSES + 1)}

        for cn in range(1, MAX_CLASSES + 1):
            base = START + (cn - 1) * BLOCK
            att_col = base
            overall_col = base + 1
            psp_col = base + 2
            rating_col = base + 3
            noshow_col = base + 4
            notes_col = base + 5

            if rating_col >= len(row):
                continue

            # Rating
            try:
                val = row[rating_col].strip()
                if val and val not in ("", "-", "N/A", "NaN"):
                    r = float(val)
                    batch_data[batch][cn]["ratings"].append(r)
                    if r <= 3:
                        notes = row[notes_col].strip() if notes_col < len(row) else ""
                        noshow = row[noshow_col].strip() if noshow_col < len(row) else ""
                        low_raters.append({
                            "email": email,
                            "batch": batch,
                            "psa": psa,
                            "sale_status": sale_status,
                            "class_num": cn,
                            "rating": r,
                            "lsm_notes": notes,
                            "noshow_reason": noshow,
                        })
            except (ValueError, TypeError):
                pass

            # Live Attendance
            try:
                val = row[att_col].strip()
                if val and val not in ("", "-", "N/A", "NaN"):
                    batch_data[batch][cn]["atts"].append(float(val))
            except (ValueError, TypeError):
                pass

            # Overall Attendance
            try:
                val = row[overall_col].strip()
                if val and val not in ("", "-", "N/A", "NaN"):
                    batch_data[batch][cn]["overall_atts"].append(float(val))
            except (ValueError, TypeError):
                pass

            # PSP
            try:
                val = row[psp_col].strip()
                if val and val not in ("", "-", "N/A", "NaN"):
                    batch_data[batch][cn]["psps"].append(float(val))
            except (ValueError, TypeError):
                pass

    # Compute averages
    class_ratings = []
    for batch in sorted(batch_data.keys()):
        entry = {"batch": batch, "classes": {}}
        for cn in range(1, MAX_CLASSES + 1):
            d = batch_data[batch][cn]
            if d["ratings"]:
                avg_r = round(sum(d["ratings"]) / len(d["ratings"]), 2)
                avg_a = round(sum(d["atts"]) / len(d["atts"]), 1) if d["atts"] else None
                avg_oa = round(sum(d["overall_atts"]) / len(d["overall_atts"]), 1) if d["overall_atts"] else None
                avg_p = round(sum(d["psps"]) / len(d["psps"]), 1) if d["psps"] else None
                low_c = sum(1 for r in d["ratings"] if r <= 3)
                entry["classes"][str(cn)] = {
                    "avg_rating": avg_r,
                    "total_rated": len(d["ratings"]),
                    "low_count": low_c,
                    "avg_live_att": avg_a,
                    "avg_overall_att": avg_oa,
                    "avg_psp": avg_p,
                    "flag": "LOW" if avg_r < 4 else ("WATCH" if avg_r < 4.5 else "OK"),
                }
        if entry["classes"]:
            class_ratings.append(entry)

    return class_ratings, low_raters


def parse_ratings_sheet(raw):
    """
    Ratings Sheet layout:
    raw[0] = merged title
    raw[1] = headers (Batches | Instructor Name | Total Ratings | ...)
    raw[2:] = data
    Returns dict: batch_name -> instructor_name
    """
    if len(raw) < 3:
        return {}
    mapping = {}
    for row in raw[2:]:
        if len(row) < 2 or not row[0].strip():
            continue
        mapping[row[0].strip()] = row[1].strip() if len(row) > 1 and row[1].strip() else ""
    return mapping


# ──────────────────────────────────────────────
# Compute overview
# ──────────────────────────────────────────────

def compute_mentor_analysis(incidents):
    """Compute repeat offender tracking and reason analysis for mentor no-shows."""
    mentor_incidents = [i for i in incidents if i["incident_type"] == "Mentor No-show"]
    
    # Group by mentor name/email to find repeat offenders
    by_mentor = {}
    for inc in mentor_incidents:
        name = (inc.get("instructor_name") or "").strip()
        if not name:
            name = "Unknown Mentor"
        if name not in by_mentor:
            by_mentor[name] = {"name": name, "count": 0, "batches": set(), "details": [], "statuses": []}
        by_mentor[name]["count"] += 1
        if inc.get("batch"):
            by_mentor[name]["batches"].add(inc["batch"])
        if inc.get("details"):
            by_mentor[name]["details"].append(inc["details"][:200])
        by_mentor[name]["statuses"].append(inc.get("status", "Open"))
    
    repeat_offenders = []
    for m in sorted(by_mentor.values(), key=lambda x: -x["count"]):
        # AI-summarize reasons if multiple incidents
        reason_summary = []
        if m["details"]:
            reason_summary = summarize_lsm_notes(m["details"], max_bullets=3)
        unresolved = sum(1 for s in m["statuses"] if s in ("Open", "In Progress", "Escalated", ""))
        repeat_offenders.append({
            "name": m["name"],
            "total_noshows": m["count"],
            "unresolved": unresolved,
            "batches": list(m["batches"]),
            "reason_summary": reason_summary,
            "is_repeat": m["count"] >= 2,
        })
    
    return repeat_offenders


def compute_overview(incidents, class_ratings, low_raters):
    total = len(incidents)
    open_c = sum(1 for i in incidents if i["status"] in ("Open", ""))
    escalated = sum(1 for i in incidents if i["status"] == "Escalated")
    in_prog = sum(1 for i in incidents if i["status"] == "In Progress")
    resolved = sum(1 for i in incidents if i["status"] in ("Resolved", "Closed"))

    by_type = {}
    for inc in incidents:
        t = inc["incident_type"] or "Other"
        by_type[t] = by_type.get(t, 0) + 1

    # AI-classified canonical buckets
    by_bucket = {}
    for inc in incidents:
        b = inc.get("bucket") or "Other"
        by_bucket[b] = by_bucket.get(b, 0) + 1

    by_batch = {}
    for inc in incidents:
        b = inc["batch"] or "Unknown"
        by_batch[b] = by_batch.get(b, 0) + 1

    low_batches = 0
    for cr in class_ratings:
        for cn, data in cr["classes"].items():
            if data["avg_rating"] < 4:
                low_batches += 1
                break

    # Mentor analysis
    mentor_analysis = compute_mentor_analysis(incidents)

    # Mentee no-show count (record-only)
    mentee_noshows = sum(1 for i in incidents if i["incident_type"] in ("Mentee No-show", "Mentee No-Show"))

    return {
        "total_incidents": total,
        "open": open_c,
        "escalated": escalated,
        "in_progress": in_prog,
        "resolved": resolved,
        "by_type": [{"type": k, "count": v} for k, v in sorted(by_type.items(), key=lambda x: -x[1])],
        "by_bucket": [{"bucket": k, "count": v} for k, v in sorted(by_bucket.items(), key=lambda x: -x[1])],
        "by_batch": [{"batch": k, "count": v} for k, v in sorted(by_batch.items(), key=lambda x: -x[1])],
        "low_rating_batches": low_batches,
        "total_low_raters": len(set(lr["email"] for lr in low_raters)),
        "low_rater_entries": len(low_raters),
        "mentor_analysis": mentor_analysis,
        "mentee_noshows": mentee_noshows,
    }


# ──────────────────────────────────────────────
# Slack
# ──────────────────────────────────────────────

def send_slack(message):
    if not _slack_url:
        log.info(f"[Slack skip] {message}")
        return
    try:
        import httpx
        httpx.post(_slack_url, json={"text": message}, timeout=5)
    except Exception as e:
        log.warning(f"Slack notification failed: {e}")


# ──────────────────────────────────────────────
# Request models
# ──────────────────────────────────────────────

class ResolveRequest(BaseModel):
    incident_id: int
    resolver_email: str
    notes: str

class EscalateRequest(BaseModel):
    incident_id: int
    escalator_email: str
    escalate_to: str
    reason: str


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("/health")
def get_program_health(cohort: str = "april2026"):
    from config import get_postsales_id
    from services.post_sales_loader import load_postsales_classroom

    wb = _get_wb()

    # Incidents still from LSM Tracker
    raw_incidents = _safe_tab(wb, "Program Incidents")
    incidents = parse_incidents(raw_incidents)

    # Classroom data — try Post Sales tracker first, fall back to LSM Class Tracker
    postsales_id = get_postsales_id(cohort)
    if postsales_id and _gc:
        log.info(f"Loading classroom from Post Sales tracker for {cohort}")
        class_ratings, low_raters, instructor_map = load_postsales_classroom(_gc, postsales_id)
        if not class_ratings:
            log.warning("Post Sales classroom empty, falling back to LSM Class Tracker")
            raw_tracker = _safe_tab(wb, "Class Tracker")
            raw_ratings = _safe_tab(wb, "Ratings Sheet")
            class_ratings, low_raters = parse_class_tracker(raw_tracker)
            instructor_map = parse_ratings_sheet(raw_ratings)
            for cr in class_ratings:
                cr["instructor"] = instructor_map.get(cr["batch"], "")
    else:
        log.info(f"No Post Sales tracker configured for {cohort}, using LSM Class Tracker")
        raw_tracker = _safe_tab(wb, "Class Tracker")
        raw_ratings = _safe_tab(wb, "Ratings Sheet")
        class_ratings, low_raters = parse_class_tracker(raw_tracker)
        instructor_map = parse_ratings_sheet(raw_ratings)
        for cr in class_ratings:
            cr["instructor"] = instructor_map.get(cr["batch"], "")

    # AI-classify each incident
    for inc in incidents:
        inc["bucket"] = classify_incident_bucket(
            inc.get("incident_type", ""),
            inc.get("details", ""),
        )

    # Group low raters by batch+class with AI summary
    low_raters_by_batch = group_low_raters_by_batch(low_raters)

    # Enrich low raters with persona/CTC/experience from funnel
    for lr in low_raters:
        persona = _lookup_persona(lr.get("email", ""))
        lr["persona"] = persona.get("persona", "")
        lr["ctc"] = persona.get("ctc", "")
        lr["experience"] = persona.get("experience", "")
        lr["program"] = persona.get("program", "")

    # Also enrich grouped low raters
    for group in low_raters_by_batch:
        for learner in group.get("learners", []):
            persona = _lookup_persona(learner.get("email", ""))
            learner["persona"] = persona.get("persona", "")
            learner["ctc"] = persona.get("ctc", "")
            learner["experience"] = persona.get("experience", "")

    # Flag mentee no-shows as record-only
    for inc in incidents:
        inc["record_only"] = inc["incident_type"] in ("Mentee No-show", "Mentee No-Show")

    overview = compute_overview(incidents, class_ratings, low_raters)

    result = {
        "overview": overview,
        "incidents": incidents,
        "class_ratings": class_ratings,
        "low_raters": low_raters,
        "low_raters_by_batch": low_raters_by_batch,
        "instructor_map": instructor_map,
        "data_source": "post_sales" if postsales_id else "lsm",
    }
    return _sanitize(result)


def _sanitize(obj):
    """Recursively replace NaN/Infinity with None for JSON safety."""
    import math
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    return obj


@router.post("/resolve")
def resolve_incident(req: ResolveRequest):
    wb = _get_wb()
    try:
        ws = wb.worksheet("Program Incidents")
        now = datetime.now().strftime("%d/%m/%Y %H:%M")
        note_text = f"{req.notes} [Resolved by {req.resolver_email} on {now}]"

        # Col H=8 (Status), Col I=9 (Resolution Notes) — 1-indexed
        ws.update_cell(req.incident_id, 8, "Resolved")
        ws.update_cell(req.incident_id, 9, note_text)

        row = ws.row_values(req.incident_id)
        batch = row[1] if len(row) > 1 else "?"
        inc_type = row[3] if len(row) > 3 else "?"

        send_slack(
            f":white_check_mark: *Incident Resolved*\n"
            f"Type: {inc_type} | Batch: {batch}\n"
            f"By: {req.resolver_email}\n"
            f"Notes: {req.notes}"
        )

        return {"status": "ok", "message": "Incident resolved and sheet updated"}
    except Exception as e:
        log.error(f"Resolve failed: {e}")
        raise HTTPException(500, f"Failed to resolve: {str(e)}")


@router.post("/escalate")
def escalate_incident(req: EscalateRequest):
    wb = _get_wb()
    try:
        ws = wb.worksheet("Program Incidents")
        now = datetime.now().strftime("%d/%m/%y")
        note_text = f"{req.reason} [Escalated by {req.escalator_email} on {now}]"

        # Col H=8 (Status), Col I=9 (Resolution Notes), Col J=10 (Escalated To), Col K=11 (Escalation Date)
        ws.update_cell(req.incident_id, 8, "Escalated")
        ws.update_cell(req.incident_id, 9, note_text)
        ws.update_cell(req.incident_id, 10, req.escalate_to)
        ws.update_cell(req.incident_id, 11, now)

        row = ws.row_values(req.incident_id)
        batch = row[1] if len(row) > 1 else "?"
        inc_type = row[3] if len(row) > 3 else "?"

        send_slack(
            f":rotating_light: *Incident Escalated*\n"
            f"Type: {inc_type} | Batch: {batch}\n"
            f"Escalated to: {req.escalate_to}\n"
            f"By: {req.escalator_email}\n"
            f"Reason: {req.reason}"
        )

        return {"status": "ok", "message": "Incident escalated and sheet updated"}
    except Exception as e:
        log.error(f"Escalate failed: {e}")
        raise HTTPException(500, f"Failed to escalate: {str(e)}")

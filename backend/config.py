"""
config.py - Environment configuration
"""
import os
import json
from dotenv import load_dotenv

load_dotenv()

# Google Sheet IDs
SHEET_FUNNEL_ID   = os.getenv("SHEET_FUNNEL_ID",   "1FSyE9GXB7yrWZ6DVElzNykcnlGr7bYEY3c5k_fs1NV4")
SHEET_PERSONA_ID  = os.getenv("SHEET_PERSONA_ID",  "1pgf3eruMcWCDWIZBeDzt1MPm75w0dVyhx4OAvJTj-ls")
SHEET_LSM_ID      = os.getenv("SHEET_LSM_ID",      "1-83qFsRBEXGQGyHPdmmhbd9Gx1aACSRlM7OxHtRnE9w")
SHEET_MENTOR_ID         = os.getenv("SHEET_MENTOR_ID",         "1uT_vHMTM4s4TNIPhedB30MaggWRpbgX1LkqCQlbtqwI")
SHEET_MENTOR_BACKEND_ID = os.getenv("SHEET_MENTOR_BACKEND_ID", "1mdk1OMpsxoAU-HkTpIT-4XBk2nLmSAOdopd_88Y2Ht8")
SHEET_OMS_ID      = os.getenv("SHEET_OMS_ID",      "140kH_-IoWYKy0143m1vjnmL6ti45zxjo9OZvvm3XPRc")

# Post Sales Tracker — one sheet per cohort.
# Add new env vars each month: SHEET_POSTSALES_MAY2026=sheet_id, etc.
# Pattern: SHEET_POSTSALES_{COHORT_ID_UPPERCASE_NO_SPECIAL}
def _build_postsales_map() -> dict:
    """Read all SHEET_POSTSALES_* env vars and build cohort_id -> sheet_id map."""
    mapping = {}
    prefix = "SHEET_POSTSALES_"
    # Default April 2026
    default = os.getenv("SHEET_POSTSALES_ID", "1QafI9LO7o2UvS3Uk6djwX5XsljLeSHu8ToWsvND2bRs")
    if default:
        mapping["april2026"] = default

    for key, val in os.environ.items():
        if not key.startswith(prefix) or key == "SHEET_POSTSALES_ID":
            continue
        if not val:
            continue
        # e.g. SHEET_POSTSALES_MAY2026 -> may2026
        cohort_raw = key[len(prefix):].lower()  # may2026
        mapping[cohort_raw] = val

    return mapping

POSTSALES_MAP: dict = _build_postsales_map()

def get_postsales_id(cohort_id: str) -> str | None:
    """Return Post Sales sheet ID for a given cohort_id, or None if not configured."""
    return POSTSALES_MAP.get(cohort_id.lower().strip())

# API Keys
GROQ_API_KEY      = os.getenv("GROQ_API_KEY", "")
OPENAI_API_KEY    = os.getenv("OPENAI_API_KEY", "")
DEEPSEEK_API_KEY  = os.getenv("DEEPSEEK_API_KEY", "")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")

# Which AI provider to use: "openai" or "groq"
AI_PROVIDER       = os.getenv("AI_PROVIDER", "openai" if os.getenv("OPENAI_API_KEY") else "groq")

# Server settings
FRONTEND_URL      = os.getenv("FRONTEND_URL", "*")
CACHE_TTL_MINUTES = int(os.getenv("CACHE_TTL_MINUTES", "15"))


def get_google_creds():
    """Load Google service account credentials.
    Priority: GOOGLE_KEY_FILE (local) > GOOGLE_CREDENTIALS (deployed)."""
    key_file = os.getenv("GOOGLE_KEY_FILE", "")
    if key_file and os.path.exists(key_file):
        with open(key_file, "r") as f:
            return json.load(f)
    raw = os.getenv("GOOGLE_CREDENTIALS", "")
    if not raw:
        raise ValueError("Neither GOOGLE_KEY_FILE nor GOOGLE_CREDENTIALS is set")
    creds = json.loads(raw)
    if "private_key" in creds:
        creds["private_key"] = creds["private_key"].replace("\\n", "\n")
    return creds


# Cohort mapping: funnel cohort -> persona sheet tab name (exact match, case-sensitive)
COHORT_SHEET_MAP = {
    "july2025":        "Jul'25",
    "august2025":      "Aug'25",
    "september2025":   "Sep'25",
    "october2025":     "Oct'25",
    "november2025":    "Nov'25",
    "december(1)2025": "Dec'25(1)",
    "december(2)2025": "Dec'25(2)",
    "january2026":     "Jan'26",
    "february2026":    "Feb'26",
    "march2026":       "Mar'26",
    "april2026":       "Apr'26",
    "may2026":         "May'26",
}

COHORT_LABELS = {
    "july2025":        "July 2025",
    "august2025":      "August 2025",
    "september2025":   "September 2025",
    "october2025":     "October 2025",
    "november2025":    "November 2025",
    "december(1)2025": "December 2025 (1)",
    "december(2)2025": "December 2025 (2)",
    "january2026":     "January 2026",
    "february2026":    "February 2026",
    "march2026":       "March 2026",
    "april2026":       "April 2026",
    "may2026":         "May 2026",
}

COHORT_ORDER = [
    "july2025", "august2025", "september2025", "october2025",
    "november2025", "december(1)2025", "december(2)2025",
    "january2026", "february2026", "march2026", "april2026", "may2026",
]

# Canonical refund reason categories (AI classifies into these)
REASON_CATEGORIES = [
    "Financial constraints / EMI",
    "Time constraints / workload",
    "First call refund / pre-MnG",
    "Career / program misalignment",
    "Medical / personal emergency",
    "Push sale / enrollment regret",
    "Constant DNP / no engagement",
    "Other",
]

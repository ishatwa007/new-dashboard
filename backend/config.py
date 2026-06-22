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

def get_postsales_id(cohort_id: str):
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


# Cohort mapping: auto-generated from START_COHORT_MONTH up to current month.
# Special one-off cohorts (e.g. Dec splits) are merged in via SPECIAL_COHORTS.
# To add a split cohort like December(2), add it to SPECIAL_COHORTS below.
# No manual updates needed when a new month starts.

import calendar
from datetime import date

_START_YEAR  = 2025
_START_MONTH = 7   # July 2025

# Special cohorts inserted immediately after their base month.
# key = base cohort_id they follow, value = list of (cohort_id, sheet_tab, label)
_SPECIAL_COHORTS: dict = {
    "december2025": [
        ("december(1)2025", "Dec'25(1)", "December 2025 (1)"),
        ("december(2)2025", "Dec'25(2)", "December 2025 (2)"),
    ],
}

def _build_cohort_maps():
    today = date.today()
    sheet_map = {}
    labels    = {}
    order     = []

    y, m = _START_YEAR, _START_MONTH
    while (y, m) <= (today.year, today.month):
        month_name  = calendar.month_name[m]          # "July"
        month_abbr  = calendar.month_abbr[m]          # "Jul"
        year_2d     = str(y)[-2:]                     # "25"
        cohort_id   = f"{month_name.lower()}{y}"      # "july2025"
        tab_name    = f"{month_abbr}'{year_2d}"       # "Jul'25"
        label       = f"{month_name} {y}"             # "July 2025"

        # If this month has special splits, skip the plain entry and use splits
        if cohort_id in _SPECIAL_COHORTS:
            for split_id, split_tab, split_label in _SPECIAL_COHORTS[cohort_id]:
                sheet_map[split_id] = split_tab
                labels[split_id]    = split_label
                order.append(split_id)
        else:
            sheet_map[cohort_id] = tab_name
            labels[cohort_id]    = label
            order.append(cohort_id)

        m += 1
        if m > 12:
            m = 1
            y += 1

    return sheet_map, labels, order

COHORT_SHEET_MAP, COHORT_LABELS, COHORT_ORDER = _build_cohort_maps()

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

"""
reason_classifier.py

Classifies free-text refund reasons into canonical buckets using Groq AI.
Falls back to keyword matching if API unavailable.
No hallucination - only classifies text that exists in the sheet.
Emails without reasons are counted under "Other".
"""

import os
import json
import hashlib
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

CACHE_DIR = Path("classifier_cache")
CACHE_DIR.mkdir(exist_ok=True)

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

SYSTEM_PROMPT = f"""You are a refund reason classifier for Scaler Academy (online tech education).

Given a refund reason text, classify it into exactly ONE of these categories:
{json.dumps(REASON_CATEGORIES)}

Rules:
- Respond with ONLY the category name, nothing else
- Financial/EMI/loan/salary/money -> "Financial constraints / EMI"
- Time/busy/schedule/workload -> "Time constraints / workload"
- First call/before MnG/day 1 -> "First call refund / pre-MnG"
- Wrong course/not relevant/career change -> "Career / program misalignment"
- Health/medical/family emergency -> "Medical / personal emergency"
- Pushed/pressured/forced enrollment -> "Push sale / enrollment regret"
- Not attending/DNP/no engagement -> "Constant DNP / no engagement"
- Unclear or mixed reasons -> "Other"
"""


def _cache_key(text: str) -> str:
    return hashlib.md5(text.strip().lower().encode()).hexdigest()


def _get_cached(text: str) -> Optional[str]:
    key = _cache_key(text)
    path = CACHE_DIR / f"{key}.json"
    if path.exists():
        try:
            data = json.loads(path.read_text())
            return data.get("category")
        except Exception:
            pass
    return None


def _set_cache(text: str, category: str):
    key = _cache_key(text)
    path = CACHE_DIR / f"{key}.json"
    try:
        path.write_text(json.dumps({"text": text[:200], "category": category}))
    except Exception:
        pass


def _keyword_classify(text: str) -> str:
    t = text.lower()

    if any(w in t for w in ["financial", "emi", "loan", "money", "salary", "afford",
                             "payment", "installment", "costly", "expensive", "budget",
                             "fees", "cost"]):
        return "Financial constraints / EMI"

    if any(w in t for w in ["first call", "before mng", "pre-mng", "day 1", "day one",
                             "immediate", "within hours", "same day", "just joined",
                             "fcr"]):
        return "First call refund / pre-MnG"

    if any(w in t for w in ["time", "busy", "schedule", "workload", "office",
                             "work hours", "hectic", "travel", "shift", "overtime",
                             "no bandwidth"]):
        return "Time constraints / workload"

    if any(w in t for w in ["wrong course", "not relevant", "career", "mismatch",
                             "different role", "not useful", "not what i expected",
                             "expectation", "curriculum", "syllabus", "misalignment"]):
        return "Career / program misalignment"

    if any(w in t for w in ["health", "medical", "hospital", "surgery", "family emergency",
                             "personal", "death", "accident", "illness"]):
        return "Medical / personal emergency"

    if any(w in t for w in ["pushed", "pressured", "forced", "didn't want", "did not want",
                             "bda pushed", "sales pressure", "tricked", "misled",
                             "enrollment regret", "push sale"]):
        return "Push sale / enrollment regret"

    if any(w in t for w in ["not attending", "dnp", "no engagement", "ghost", "inactive",
                             "never logged", "zero attendance", "didn't start",
                             "not responding"]):
        return "Constant DNP / no engagement"

    return "Other"


def _groq_classify(text: str) -> Optional[str]:
    if not GROQ_API_KEY:
        return None
    try:
        import httpx
        response = httpx.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Classify this refund reason:\n\n{text[:500]}"},
                ],
                "temperature": 0,
                "max_tokens": 50,
            },
            timeout=10.0,
        )
        if response.status_code == 200:
            result = response.json()
            answer = result["choices"][0]["message"]["content"].strip()
            for cat in REASON_CATEGORIES:
                if cat.lower() in answer.lower() or answer.lower() in cat.lower():
                    return cat
            logger.warning(f"Groq unrecognized category: {answer}")
            return None
        logger.warning(f"Groq API {response.status_code}: {response.text[:200]}")
        return None
    except Exception as e:
        logger.warning(f"Groq API error: {e}")
        return None


def classify_reason(text: str) -> str:
    if not text or not text.strip():
        return "Other"

    cached = _get_cached(text)
    if cached:
        return cached

    category = _groq_classify(text)
    if not category:
        category = _keyword_classify(text)

    _set_cache(text, category)
    return category


def compute_classified_reasons(df, persona_df) -> list[dict]:
    """
    Main entry point.
    1. Find all refund-requested rows in the cohort
    2. For each, check if persona sheet has a reason
    3. Classify each reason into a bucket
    4. Emails without reasons -> "Other"
    Returns list matching frontend shape: {category, count, pct, examples, sentiment}
    """
    refund_df = df[df["refund_requested"] == True].copy()
    if refund_df.empty:
        return []

    total_refunds = len(refund_df)

    # Find reason column from merged persona data
    reason_col = None
    for col in ["identified_reason", "stated_reason"]:
        if col in refund_df.columns and refund_df[col].notna().any():
            reason_col = col
            break

    bucket_counts = {}
    bucket_examples = {}
    bucket_retained = {}

    for _, row in refund_df.iterrows():
        reason_text = None
        if reason_col:
            val = row.get(reason_col)
            if isinstance(val, str) and val.strip():
                reason_text = val.strip()

        if reason_text:
            category = classify_reason(reason_text)
            examples = bucket_examples.setdefault(category, [])
            if len(examples) < 5 and reason_text not in examples:
                examples.append(reason_text[:300])
        else:
            category = "Other"

        bucket_counts[category] = bucket_counts.get(category, 0) + 1

        is_retained = row.get("refunded") == False
        if is_retained:
            bucket_retained[category] = bucket_retained.get(category, 0) + 1

    sentiment_map = {
        "Financial constraints / EMI":    "neutral",
        "Time constraints / workload":    "neutral",
        "First call refund / pre-MnG":    "bad",
        "Career / program misalignment":  "bad",
        "Medical / personal emergency":   "neutral",
        "Push sale / enrollment regret":  "bad",
        "Constant DNP / no engagement":   "bad",
        "Other":                          "neutral",
    }

    rows = []
    for cat in REASON_CATEGORIES:
        count = bucket_counts.get(cat, 0)
        if count == 0:
            continue
        retained = bucket_retained.get(cat, 0)
        rows.append({
            "category":  cat,
            "count":     count,
            "pct":       round(count / total_refunds * 100, 1),
            "examples":  bucket_examples.get(cat, []),
            "sentiment": sentiment_map.get(cat, "neutral"),
            "retained":  retained,
            "retention_rate": round(retained / count * 100, 1) if count else 0,
        })
    return sorted(rows, key=lambda x: x["count"], reverse=True)


async def add_reasons_to_analytics(analytics: dict, persona_df) -> dict:
    """Backward-compat shim. Reasons are now computed in analytics_engine."""
    return analytics

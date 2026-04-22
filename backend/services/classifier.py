"""
classifier.py — AI classification for LSM requests
Uses DeepSeek API (OpenAI-compatible) to extract structured fields from request body
"""

import os
import json
import httpx
from typing import Optional


DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"

SYSTEM_PROMPT = """You are an expert classifier for Scaler Academy learner requests.
Analyse the request body and extract structured information.
Always respond with a valid JSON object only — no markdown, no explanation.

Request types: Batch Shift, Recording Access, Attendance Correction, Mentor Assignment,
Mentor Change, Mentor Session Reschedule, Mentor Session Cancel, EMI Restructuring, Other

IMPORTANT context on Recording Access:
- Recording Access requests are ALMOST ALWAYS cross-module — a learner asks for recordings
  from a DIFFERENT module/course they're not currently enrolled in (e.g. enrolled in DSA
  but wants AIML recordings, or enrolled in Academy but wants DSML recordings).
- Do NOT classify Recording Access as "missed class" by default. Only use "Missed class"
  as the reason if the learner EXPLICITLY states they missed a specific class of their
  own enrolled module.

For each request type, extract relevant fields:
- Batch Shift: {"From Batch": "...", "To Batch": "...", "Reason Category": "Work conflict|Relocation|Health|Personal"}
- Recording Access: {"Requested Module": "...", "Current Module": "...", "Access Type": "Cross-Module|Missed Class|Revision", "Reason": "..."}
- Attendance Correction: {"Class Date": "...", "Marked": "Absent", "Claimed": "Present", "Evidence": "..."}
- Mentor Change/Assignment: {"Current Mentor": "...", "Reason": "..."}
- Mentor Session Reschedule/Cancel: {"Session Date": "...", "Reason": "..."}
- EMI Restructuring: {"Current EMI": "...", "Requested": "...", "Reason Category": "..."}
- Other: {"Subject": "...", "Urgency": "Standard|High"}

Also include: {"Confidence": "0.0-1.0", "Sentiment": "Neutral|Urgent|Frustrated|Polite"}
"""


async def classify_request(body: str, request_type: str = "") -> dict:
    """
    Classify a request body using DeepSeek AI.
    Falls back to rule-based classification if API is unavailable.
    """
    if not DEEPSEEK_API_KEY:
        return _rule_based_classify(body, request_type)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": f"Request Type: {request_type}\n\nRequest Body:\n{body}"}
                    ],
                    "max_tokens": 300,
                    "temperature": 0.1,
                }
            )

            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                # Strip markdown if present
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                parsed = json.loads(content)
                confidence = parsed.pop("Confidence", "—")
                return {"classification": parsed, "confidence": str(confidence)}
            else:
                return _rule_based_classify(body, request_type)

    except Exception as e:
        print(f"[Classifier] API error: {e}, falling back to rules")
        return _rule_based_classify(body, request_type)


def _rule_based_classify(body: str, request_type: str) -> dict:
    """Simple rule-based fallback classifier."""
    body_lower = body.lower()
    cls = {}

    if "batch" in request_type.lower() or "shift" in request_type.lower():
        cls = {"From Batch": "Current batch", "To Batch": "Requested batch", "Reason Category": "Work conflict"}
    elif "recording" in request_type.lower():
        # Default: cross-module access (the typical reason in Scaler)
        # Only flip to "Missed Class" if body explicitly says so
        module_keywords = ["aiml", "dsml", "devops", "academy", "dsa", "system design", "data science", "ml ", "ai ", "machine learning"]
        found_modules = [m for m in module_keywords if m in body_lower]
        access_type = "Cross-Module"
        reason = "Wants to learn content from another module"
        if any(w in body_lower for w in ["missed class", "missed the class", "couldn't attend", "could not attend", "was absent"]):
            access_type = "Missed Class"
            reason = "Missed a class in enrolled module"
        elif any(w in body_lower for w in ["revise", "revision", "rewatch", "re-watch", "review"]):
            access_type = "Revision"
            reason = "Wants to revise previous content"
        cls = {
            "Requested Module": found_modules[0].upper().strip() if found_modules else "—",
            "Current Module": "—",
            "Access Type": access_type,
            "Reason": reason,
        }
    elif "attendance" in request_type.lower():
        cls = {"Marked": "Absent", "Claimed": "Present", "Evidence": "To be provided"}
    elif "mentor" in request_type.lower():
        cls = {"Reason": "Schedule conflict"}
    elif "emi" in request_type.lower():
        cls = {"Reason Category": "Financial constraint", "Current EMI": "—", "Requested": "—"}
    else:
        cls = {"Subject": body[:60] + "..." if len(body) > 60 else body, "Urgency": "Standard"}

    # Detect urgency
    urgent_words = ["urgent", "emergency", "immediately", "asap", "today", "critical"]
    if any(w in body_lower for w in urgent_words):
        cls["Urgency"] = "High"

    return {"classification": cls, "confidence": "rule-based"}

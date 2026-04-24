"""
mentor_backend_loader.py

Reads the Mentor Backend Google Sheet which is populated from Slack.

Sheets:
  Low Rated PYSJ — low rated mentor sessions, pulled from Slack channel
  No Shows       — no-show notifications, pulled from Slack channel

Both sheets have columns:
  A = ts (Slack timestamp)
  B = text (full Slack message)
  C = slack_url
  D = thread_replies (PSA responses in the thread)
"""

import re
import logging
from collections import defaultdict
from config import SHEET_MENTOR_BACKEND_ID

log = logging.getLogger(__name__)

_gc       = None
_sheet_id = SHEET_MENTOR_BACKEND_ID


def init_mentor_backend(gc, sheet_id: str = None):
    global _gc, _sheet_id
    _gc = gc
    if sheet_id:
        _sheet_id = sheet_id
    log.info(f"Mentor backend loader initialised: {_sheet_id[:12]}...")


def _extract(pattern, text, default=''):
    m = re.search(pattern, text, re.IGNORECASE)
    return m.group(1).strip() if m else default


def _parse_email(text_segment):
    """Extract email from Slack mailto format: <mailto:email|email>"""
    m = re.search(r'mailto:(.*?)\|', text_segment)
    return m.group(1).strip().lower() if m else ''


def _clean_replies(replies: str) -> str:
    """Clean Slack thread replies — remove user mentions, deduplicate."""
    if not replies:
        return ''
    # Remove <@UXXXXX> mentions
    cleaned = re.sub(r'<@[A-Z0-9]+>', '', replies)
    # Split by || separator, deduplicate, clean whitespace
    parts = [p.strip() for p in cleaned.split('||')]
    seen = set()
    unique = []
    for p in parts:
        p_clean = p.strip()
        if p_clean and p_clean.lower() not in seen:
            seen.add(p_clean.lower())
            unique.append(p_clean)
    return ' | '.join(unique)


def load_mentor_backend(cohort_id: str) -> dict:
    """
    Load and parse both tabs filtered by cohort.
    Returns structured data for low raters and no-shows.
    """
    if not _gc or not _sheet_id:
        log.warning("Mentor backend loader: not initialised")
        return _empty()

    try:
        wb = _gc.open_by_key(_sheet_id)
    except Exception as e:
        log.error(f"Mentor backend loader: failed to open sheet: {e}")
        return _empty()

    low_raters = _load_low_rated(wb, cohort_id)
    no_shows   = _load_no_shows(wb, cohort_id)

    # Group low raters by batch
    by_batch = defaultdict(list)
    for lr in low_raters:
        by_batch[lr['batch']].append(lr)

    # Group no shows by type
    mentor_ns = [n for n in no_shows if n['type'] == 'mentor_no_show']
    mentee_ns = [n for n in no_shows if n['type'] == 'mentee_no_show']

    # Group no shows by mentor/mentee email
    mentor_map = defaultdict(lambda: {'email': '', 'sessions': [], 'count': 0})
    for n in mentor_ns:
        m = mentor_map[n['mentor_email']]
        m['email'] = n['mentor_email']
        m['count'] += 1
        m['sessions'].append(n)

    mentee_map = defaultdict(lambda: {'email': '', 'name': '', 'sessions': [], 'count': 0})
    for n in mentee_ns:
        m = mentee_map[n['mentee_email']]
        m['email'] = n['mentee_email']
        m['count'] += 1
        m['sessions'].append(n)

    return {
        'cohort_id':        cohort_id,
        'low_raters':       low_raters,
        'low_raters_count': len(low_raters),
        'by_batch':         {k: v for k, v in by_batch.items()},
        'no_shows':         no_shows,
        'mentor_noshows':   len(mentor_ns),
        'mentee_noshows':   len(mentee_ns),
        'mentor_list':      sorted(mentor_map.values(), key=lambda x: -x['count']),
        'mentee_list':      sorted(mentee_map.values(), key=lambda x: -x['count']),
    }


def _load_low_rated(wb, cohort_id: str) -> list:
    try:
        ws  = wb.worksheet("Low Rated PYSJ")
        raw = ws.get_all_values()
    except Exception as e:
        log.warning(f"Low Rated PYSJ tab not found: {e}")
        return []

    rows = []
    for row in raw[1:]:
        if not row or len(row) < 2:
            continue
        text    = row[1] if len(row) > 1 else ''
        replies = row[3] if len(row) > 3 else ''

        cohort = _extract(r'Intake Cohort:\*?\s*(.*)', text)
        if cohort.lower() != cohort_id.lower():
            continue

        # Parse email from mailto format
        email_match = re.search(r'Learner Email:\*.*?mailto:(.*?)\|', text)
        mentor_match = re.search(r'Mentor Email:\*.*?mailto:(.*?)\|', text)

        rows.append({
            'cohort':       cohort,
            'name':         _extract(r'Learner Name:\*?\s*(.*)', text),
            'email':        email_match.group(1).strip().lower() if email_match else '',
            'phone':        _extract(r'Learner Phone:\*?\s*(.*)', text),
            'program':      _extract(r'Program:\*?\s*(.*)', text),
            'batch':        _extract(r'Current Batch:\*?\s*(.*)', text),
            'mentor_email': mentor_match.group(1).strip().lower() if mentor_match else '',
            'slack_url':    row[2] if len(row) > 2 else '',
            'replies':      _clean_replies(replies),
            'ts':           row[0] if row[0] else '',
        })

    log.info(f"Low rated PYSJ: {len(rows)} rows for {cohort_id}")
    return rows


def _load_no_shows(wb, cohort_id: str) -> list:
    try:
        ws  = wb.worksheet("No Shows")
        raw = ws.get_all_values()
    except Exception as e:
        log.warning(f"No Shows tab not found: {e}")
        return []

    rows = []
    for row in raw[1:]:
        if not row or len(row) < 2:
            continue
        text    = row[1] if len(row) > 1 else ''
        replies = row[3] if len(row) > 3 else ''

        if 'no show notification' not in text.lower():
            continue

        # Determine type
        if 'Interviewer has not joined' in text:
            ns_type = 'mentor_no_show'
        elif 'Interviewee has not joined' in text:
            ns_type = 'mentee_no_show'
        else:
            ns_type = 'unknown'

        mentee_match = re.search(r'Interviewee:.*?mailto:(.*?)\|', text)
        mentor_match = re.search(r'Interviewer:.*?mailto:(.*?)\|', text)
        time_match   = re.search(r'Start Time:\s*(.*)', text)

        # For no-shows, we don't have cohort in the message
        # Filter will be done at API level by date range for now
        rows.append({
            'type':         ns_type,
            'mentee_email': mentee_match.group(1).strip().lower() if mentee_match else '',
            'mentor_email': mentor_match.group(1).strip().lower() if mentor_match else '',
            'time':         time_match.group(1).strip() if time_match else '',
            'slack_url':    row[2] if len(row) > 2 else '',
            'replies':      _clean_replies(replies),
            'ts':           row[0] if row[0] else '',
        })

    log.info(f"No shows: {len(rows)} rows total")
    return rows


def _empty() -> dict:
    return {
        'cohort_id':        '',
        'low_raters':       [],
        'low_raters_count': 0,
        'by_batch':         {},
        'no_shows':         [],
        'mentor_noshows':   0,
        'mentee_noshows':   0,
        'mentor_list':      [],
        'mentee_list':      [],
    }

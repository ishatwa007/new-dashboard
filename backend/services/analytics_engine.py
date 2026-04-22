"""
analytics_engine.py - All metric computations.

Key rules:
- GTN is shown ONLY for Overall cohort, Program, and AVP level.
- Everyone else (BDM, BDA, PSA, Weeks, Sources) shows Rate only.
- PSAs show: assigned, complete sales, refunds requested from complete,
  actually refunded, retained count, retained % (from complete).
- Refund reasons: AI classified via Groq (see reason_classifier.py).
"""

import logging
import pandas as pd
from typing import Optional

logger = logging.getLogger(__name__)


def _safe_pct(num: float, den: float, dec: int = 1) -> float:
    if den == 0:
        return 0.0
    return round(num / den * 100, dec)


def _safe_avg(series: pd.Series) -> float:
    vals = series.dropna()
    if len(vals) == 0:
        return 0.0
    return round(float(vals.mean()), 1)


def _display(email: Optional[str]) -> str:
    if not email:
        return "Unknown"
    local = email.split("@")[0]
    return local.replace(".", " ").title()


def _week_label(w: str) -> str:
    return w.upper() if w and w != "unknown" else "Unknown"


def _mng_timing(row: pd.Series) -> str:
    req = row.get("refund_req_at")
    mng = row.get("mng_date")
    if pd.isnull(req) or pd.isnull(mng):
        return "unknown"
    return "pre_mng" if req < mng else "post_mng"


# Programs included in GTN calculation
GTN_PROGRAMS = {"academy", "dsml", "devops", "aiml"}


def _is_gtn_program(prog: str) -> bool:
    if not prog:
        return False
    return any(p in prog.lower() for p in GTN_PROGRAMS)


# -- cohort-level KPIs --------------------------------------------------------

def compute_kpis(df: pd.DataFrame) -> dict:
    import datetime
    today = pd.Timestamp(datetime.date.today())

    total        = len(df)
    complete     = len(df[df["sale_status"] == "COMPLETE"])
    pending      = len(df[df["sale_status"] == "PENDING"])
    pct_complete = _safe_pct(complete, total)

    # ── Refund requested (base signal) ───────────────────────────────────────
    is_req = df["refund_requested"] == True
    ref_req   = int(is_req.sum())
    ref_req_c = int((is_req & (df["sale_status"] == "COMPLETE")).sum())
    ref_p     = int((is_req & (df["sale_status"] == "PENDING")).sum())

    # ── Actually refunded = refund_requested AND retention window closed ──────
    # Retention window: 14 days from MnG date
    # If MnG date not available, use refund_req_at + 14 days as fallback
    # After 14 days: if refunded == True → truly gone, if False → retained
    def _past_retention(row):
        mng = row.get("mng_date")
        req_at = row.get("refund_req_at")
        anchor = mng if pd.notna(mng) else req_at
        if pd.isna(anchor):
            return True  # no date info, assume window closed
        try:
            return today >= pd.Timestamp(anchor) + pd.Timedelta(days=14)
        except Exception:
            return True

    req_df = df[is_req].copy()
    if not req_df.empty and "mng_date" in req_df.columns:
        req_df["window_closed"] = req_df.apply(_past_retention, axis=1)
        # Truly refunded = window closed AND refunded flag still True
        truly_refunded_mask = req_df["window_closed"] & (
            (req_df.get("refunded", pd.Series(False, index=req_df.index)) == True) |
            (req_df.get("mentee_status", pd.Series("", index=req_df.index))
             .str.strip().str.lower() == "refunded")
        )
        refunded   = int(truly_refunded_mask.sum())
        refunded_c = int((truly_refunded_mask & (req_df["sale_status"] == "COMPLETE")).sum())
        # Retained = requested but NOT truly refunded (either window open or refunded=False)
        retained_c   = int(((~truly_refunded_mask) & (req_df["sale_status"] == "COMPLETE")).sum())
    else:
        # Fallback: use refunded bool directly
        is_ref = (df.get("refunded", pd.Series(False, index=df.index)) == True) | \
                 (df.get("mentee_status", pd.Series("", index=df.index))
                  .str.strip().str.lower() == "refunded")
        refunded   = int((is_req & is_ref).sum())
        refunded_c = int((is_req & is_ref & (df["sale_status"] == "COMPLETE")).sum())
        retained_c = ref_req_c - refunded_c

    under_ret    = ref_req - refunded
    retained_pct = _safe_pct(retained_c, ref_req_c) if ref_req_c > 0 else 0

    # ── Refund rates ─────────────────────────────────────────────────────────
    refund_rate_total    = _safe_pct(refunded, total)
    refund_rate_complete = _safe_pct(refunded_c, complete)

    # ── GTN — only for Academy, DSML, DevOps, AIML ───────────────────────────
    if "intake_program" in df.columns:
        gtn_df = df[df["intake_program"].apply(_is_gtn_program)]
    elif "current_program" in df.columns:
        gtn_df = df[df["current_program"].apply(_is_gtn_program)]
    else:
        gtn_df = df

    gtn_complete = len(gtn_df[gtn_df["sale_status"] == "COMPLETE"])
    gtn_req      = gtn_df["refund_requested"] == True
    gtn_req_df   = gtn_df[gtn_req].copy()
    if not gtn_req_df.empty and "mng_date" in gtn_req_df.columns:
        gtn_req_df["window_closed"] = gtn_req_df.apply(_past_retention, axis=1)
        gtn_refunded = int((
            gtn_req_df["window_closed"] & (
                (gtn_req_df.get("refunded", pd.Series(False, index=gtn_req_df.index)) == True) |
                (gtn_req_df.get("mentee_status", pd.Series("", index=gtn_req_df.index))
                 .str.strip().str.lower() == "refunded")
            )
        ).sum())
    else:
        gtn_refunded = int(gtn_req.sum())
    gtn = _safe_pct(gtn_complete - gtn_refunded, len(gtn_df)) if len(gtn_df) > 0 else 0

    # Pre/post MnG
    refund_df = df[df["refund_requested"] == True].copy()
    if not refund_df.empty:
        refund_df["mng_timing"] = refund_df.apply(_mng_timing, axis=1)
        pre_mng  = len(refund_df[refund_df["mng_timing"] == "pre_mng"])
        post_mng = len(refund_df[refund_df["mng_timing"] == "post_mng"])
    else:
        pre_mng = post_mng = 0

    # First Call Refunds — raised during FEC
    fec_refunds = 0
    if "refund_in_fec" in df.columns:
        fec_refunds = int(df["refund_in_fec"].notna().sum())

    # Probable
    probable_total    = len(df[df["probable_id"].notna()]) if "probable_id" in df.columns else 0
    probable_refunded = len(df[(df["probable_id"].notna()) & (df["refund_requested"] == True)]) if "probable_id" in df.columns else 0

    return {
        "total":              total,
        "complete":           complete,
        "pending":            pending,
        "pct_complete":       pct_complete,
        "refund_rate_total":  refund_rate_total,
        "refund_rate_complete": refund_rate_complete,
        "ref_total":          ref_req,
        "ref_c":              refunded_c,
        "ref_req_c":          ref_req_c,
        "refunded":           refunded,
        "under_ret":          under_ret,
        "ref_p":              ref_p,
        "retained":           retained_c,
        "retained_pct":       retained_pct,
        "gtn":                gtn,
        "pct_total":          _safe_pct(ref_req, total),
        "pct_c":              _safe_pct(refunded_c, complete),
        "pct_req_c":          _safe_pct(ref_req_c, complete),
        "pre_mng":            pre_mng,
        "post_mng":           post_mng,
        "pct_pre_mng":        _safe_pct(pre_mng, ref_req),
        "pct_post_mng":       _safe_pct(post_mng, ref_req),
        "fec_refunds":        fec_refunds,
        "pct_fec":            _safe_pct(fec_refunds, ref_req),
        "probable_total":     probable_total,
        "probable_refunded":  probable_refunded,
        "pct_probable_converted": _safe_pct(probable_refunded, probable_total),
    }


def _strip_gtn(kpis: dict) -> dict:
    """Remove GTN when not applicable (BDM/BDA/PSA/Weeks/Sources)."""
    out = dict(kpis)
    out.pop("gtn", None)
    return out


# -- program breakdown (shows GTN) --------------------------------------------

def compute_programs(df: pd.DataFrame) -> list[dict]:
    programs = []
    for prog in ["Academy", "DSML", "AIML", "Devops", "Other"]:
        sub = df[df["intake_program"] == prog]
        if len(sub) == 0:
            continue
        kpis = compute_kpis(sub)
        programs.append({"program": prog, **kpis})
    return sorted(programs, key=lambda x: x["pct_c"], reverse=True)


# -- week-wise (no GTN) -------------------------------------------------------

def compute_weeks(df: pd.DataFrame) -> list[dict]:
    weeks = []
    for w in ["w1", "w2", "w3", "w4", "w5"]:
        sub = df[df["week_of_sale"] == w]
        if len(sub) == 0:
            continue
        kpis = _strip_gtn(compute_kpis(sub))
        weeks.append({
            "week": _week_label(w),
            "week_id": w,
            "rate": kpis["pct_c"],
            **kpis,
        })
    return weeks


# -- hierarchy (AVP has GTN, BDM/BDA do not) ----------------------------------

def _entity_row(df: pd.DataFrame, email: str, level: str,
                parent_email: Optional[str] = None) -> dict:
    sub  = df[df[level] == email]
    kpis = compute_kpis(sub)
    row = {
        "email":        email,
        "display_name": _display(email),
        "level":        level,
        "parent":       parent_email,
        "rate":         kpis["pct_c"],
        **kpis,
    }
    # GTN only for AVP level
    if level != "avp":
        row.pop("gtn", None)
    return row


def compute_hierarchy(df: pd.DataFrame) -> dict:
    avp_emails = [e for e in df["avp"].dropna().unique() if e]
    avps = []
    bdms_by_avp: dict = {}
    bdas_by_bdm: dict = {}

    for avp in avp_emails:
        avp_df  = df[df["avp"] == avp]
        avp_row = _entity_row(df, avp, "avp")
        avps.append(avp_row)

        bdm_emails = [e for e in avp_df["bdm"].dropna().unique() if e]
        bdms_by_avp[avp] = []

        for bdm in bdm_emails:
            bdm_df  = avp_df[avp_df["bdm"] == bdm]
            bdm_row = _entity_row(df, bdm, "bdm", parent_email=avp)
            bdms_by_avp[avp].append(bdm_row)

            bda_emails = [e for e in bdm_df["bda"].dropna().unique() if e]
            bdas_by_bdm[bdm] = []
            for bda in bda_emails:
                bda_row = _entity_row(df, bda, "bda", parent_email=bdm)
                bdas_by_bdm[bdm].append(bda_row)

    return {
        "avps":        sorted(avps, key=lambda x: x["pct_c"], reverse=True),
        "bdms_by_avp": {k: sorted(v, key=lambda x: x["pct_c"], reverse=True) for k, v in bdms_by_avp.items()},
        "bdas_by_bdm": {k: sorted(v, key=lambda x: x["pct_c"], reverse=True) for k, v in bdas_by_bdm.items()},
    }


# -- engagement signals -------------------------------------------------------

def compute_engagement(df: pd.DataFrame) -> list[dict]:
    refunded     = df[df["refund_requested"] == True]
    not_refunded = df[df["refund_requested"] == False]

    signals = [
        ("Avg PSP (%)",           "c1_psp"),
        ("Avg attendance (%)",    "c1_overall_att"),
        ("PYSJ booked (%)",       None),
        ("SAT attempted (%)",     None),
        ("MnG attended live (%)", None),
        ("Mentor selected (%)",   None),
        ("Expectation form (%)",  "exp_setting_done"),
    ]

    def _pct_true(series: pd.Series) -> float:
        vals = series.dropna()
        if len(vals) == 0:
            return 0.0
        return round(vals.sum() / len(vals) * 100, 1)

    def _pct_booked(sub: pd.DataFrame) -> float:
        if "pysj_booked" not in sub.columns:
            return 0.0
        booked = sub["pysj_booked"].str.lower().isin(["yes", "booked", "true", "1"])
        return round(booked.sum() / max(len(sub), 1) * 100, 1)

    rows = []
    for signal, col in signals:
        if col:
            active_val = _safe_avg(not_refunded[col]) if col in not_refunded.columns else 0.0
            ref_val    = _safe_avg(refunded[col])     if col in refunded.columns    else 0.0
        elif "PYSJ" in signal:
            active_val = _pct_booked(not_refunded)
            ref_val    = _pct_booked(refunded)
        elif "SAT" in signal:
            active_val = _pct_true(not_refunded.get("sat_attempted", pd.Series(dtype=bool)))
            ref_val    = _pct_true(refunded.get("sat_attempted",     pd.Series(dtype=bool)))
        elif "MnG" in signal:
            active_val = _pct_true(not_refunded.get("mng_attended",  pd.Series(dtype=bool)))
            ref_val    = _pct_true(refunded.get("mng_attended",      pd.Series(dtype=bool)))
        elif "Mentor" in signal:
            active_val = _pct_true(not_refunded.get("mentor_selected", pd.Series(dtype=bool)))
            ref_val    = _pct_true(refunded.get("mentor_selected",     pd.Series(dtype=bool)))
        else:
            active_val = ref_val = 0.0

        gap = round(active_val - ref_val, 1)
        strength = "High" if gap > 30 else "Medium" if gap > 15 else "Low"
        rows.append({
            "signal": signal,
            "active": active_val,
            "refunded": ref_val,
            "gap": gap,
            "strength": strength,
        })

    return rows


# -- persona breakdown --------------------------------------------------------

def compute_persona_breakdown(df: pd.DataFrame) -> list[dict]:
    rows = []
    for persona in df["persona"].dropna().unique():
        sub = df[df["persona"] == persona]
        if len(sub) < 3:
            continue
        kpis = _strip_gtn(compute_kpis(sub))
        label = persona.split("(")[0].strip() if "(" in persona else persona
        rows.append({"persona": label, "full_persona": persona, **kpis})
    return sorted(rows, key=lambda x: x["pct_c"], reverse=True)


# -- CTC & experience ---------------------------------------------------------

def compute_ctc(df: pd.DataFrame) -> list[dict]:
    col = "current_ctc" if "current_ctc" in df.columns else "ctc"
    if col not in df.columns:
        return []

    order = ["Less than 5 LPA", "05-10 LPA", "10-15 LPA",
             "15-20 LPA", "20-30 LPA", "30+ LPA"]
    rows = []
    for band in order:
        sub = df[df[col] == band]
        if len(sub) == 0:
            continue
        kpis = _strip_gtn(compute_kpis(sub))
        rows.append({
            "label":    band,
            "active":   kpis["total"] - kpis["ref_total"],
            "refunded": kpis["ref_total"],
            "rate":     kpis["pct_total"],
            **kpis,
        })
    seen = set(order)
    for band in df[col].dropna().unique():
        if band not in seen:
            sub = df[df[col] == band]
            if len(sub) < 3:
                continue
            kpis = _strip_gtn(compute_kpis(sub))
            rows.append({"label": band,
                         "active": kpis["total"]-kpis["ref_total"],
                         "refunded": kpis["ref_total"],
                         "rate": kpis["pct_total"], **kpis})
    return rows


def compute_experience(df: pd.DataFrame) -> list[dict]:
    """Experience bucket breakdown (work_exp in months)."""
    if "work_exp" not in df.columns:
        return []

    bins = [
        (0, 12, "0-1 yrs"),
        (12, 36, "1-3 yrs"),
        (36, 72, "3-6 yrs"),
        (72, 120, "6-10 yrs"),
        (120, 9999, "10+ yrs"),
    ]
    rows = []
    for lo, hi, label in bins:
        mask = (df["work_exp"] >= lo) & (df["work_exp"] < hi)
        sub = df[mask]
        if len(sub) == 0:
            continue
        kpis = _strip_gtn(compute_kpis(sub))
        rows.append({
            "label":    label,
            "active":   kpis["total"] - kpis["ref_total"],
            "refunded": kpis["ref_total"],
            "rate":     kpis["pct_total"],
            **kpis,
        })
    return rows


def compute_program_refunds(df: pd.DataFrame) -> list[dict]:
    """Batch-wise refund breakdown."""
    if "batch" in df.columns and df["batch"].notna().any() and (df["batch"] != "Unassigned").any():
        rows = []
        for batch in sorted(df["batch"].dropna().unique()):
            sub = df[df["batch"] == batch]
            if len(sub) == 0:
                continue
            kpis = _strip_gtn(compute_kpis(sub))
            rows.append({
                "program":  batch,
                "key":      batch.lower().replace(" ", "_")[:20],
                "label":    batch,
                "active":   kpis["total"] - kpis["ref_total"],
                "refunded": kpis["ref_c"],
                "refReq":   kpis["ref_total"],
                "rate":     kpis["pct_c"],
                **kpis,
            })
        if rows:
            return sorted(rows, key=lambda x: x["refReq"], reverse=True)[:12]

    # Fallback: intake_program
    if "intake_program" not in df.columns:
        return []
    rows = []
    for prog in ["Academy", "DSML", "AIML", "Devops"]:
        sub = df[df["intake_program"] == prog]
        if len(sub) == 0:
            continue
        kpis = _strip_gtn(compute_kpis(sub))
        rows.append({
            "program":  prog,
            "key":      prog.lower(),
            "label":    prog,
            "active":   kpis["total"] - kpis["ref_total"],
            "refunded": kpis["ref_c"],
            "refReq":   kpis["ref_total"],
            "rate":     kpis["pct_c"],
            **kpis,
        })
    return rows


# -- PSA breakdown (complete sales + retained from complete %) ----------------

def compute_psas(df: pd.DataFrame) -> list[dict]:
    rows = []
    for psa in df["psa"].dropna().unique():
        if not psa:
            continue
        sub = df[df["psa"] == psa]
        kpis = compute_kpis(sub)
        sample = sub.iloc[0]

        rows.append({
            "email":         psa,
            "name":          _display(psa),
            "assigned":      kpis["total"],
            "complete":      kpis["complete"],
            "refReq":        kpis["ref_req_c"],
            "refunds":       kpis["ref_c"],
            "retained":      kpis["retained"],
            "retained_pct":  kpis["retained_pct"],
            "rate":          kpis["pct_c"],
            "avp":           sample.get("avp", ""),
            "bdm":           sample.get("bdm", ""),
        })
    return sorted(rows, key=lambda x: x["rate"], reverse=True)


# -- source / channel (no GTN) ------------------------------------------------

_SOURCE_LABELS = {
    '3_mc':          'Masterclass (MC)',
    '11_callback':   'Callback',
    '1_free_product':'Free Product',
    'organic':       'Organic',
    '29_career':     'Career Events',
    '1a_tatc':       'TATC',
    '14_referral':   'Referral',
    '79_scalertopics':'Scaler Topics',
}

def compute_source(df: pd.DataFrame) -> list[dict]:
    rows = []
    if 'source' not in df.columns:
        return []

    for src_raw in df['source'].dropna().unique():
        if not src_raw:
            continue
        sub_df = df[df['source'] == src_raw]
        if len(sub_df) < 3:
            continue
        kpis = _strip_gtn(compute_kpis(sub_df))
        label = _SOURCE_LABELS.get(src_raw.lower(), src_raw)

        subs = []
        is_mc = '3_mc' in src_raw.lower() or 'mc' in src_raw.lower()
        drill_col = 'event_name' if (is_mc and 'event_name' in sub_df.columns) else 'final_source'

        if drill_col in sub_df.columns:
            for drill_val in sub_df[drill_col].dropna().unique():
                d_df = sub_df[sub_df[drill_col] == drill_val]
                if len(d_df) < 2:
                    continue
                d_kpi = _strip_gtn(compute_kpis(d_df))
                subs.append({
                    'name':    str(drill_val),
                    'key':     str(drill_val).lower()[:40].replace(' ','_'),
                    'sales':   d_kpi['total'],
                    'refunds': d_kpi['ref_c'],
                    'rate':    d_kpi['pct_c'],
                })
        subs.sort(key=lambda x: x['sales'], reverse=True)

        rows.append({
            'name':    label,
            'key':     src_raw.lower().replace(' ','_'),
            'sales':   kpis['total'],
            'refunds': kpis['ref_c'],
            'rate':    kpis['pct_c'],
            'sub':     subs,
        })

    return sorted(rows, key=lambda x: x['sales'], reverse=True)


# -- merge persona reasons ----------------------------------------------------

def merge_persona_reasons(funnel_df: pd.DataFrame,
                          persona_df: pd.DataFrame) -> pd.DataFrame:
    if persona_df.empty:
        return funnel_df

    cols_to_add = [
        "email", "stated_reason", "identified_reason",
        "outcome", "scope", "actions_taken", "what_didnt_work",
        "profession", "years_exp", "financial_sit", "probable",
        "overall_att", "overall_psp",
    ]
    existing = [c for c in cols_to_add if c in persona_df.columns]
    p = persona_df[existing].drop_duplicates("email")
    merged = funnel_df.merge(p, on="email", how="left", suffixes=("", "_persona"))
    return merged


# -- top-level entry ----------------------------------------------------------

def build_cohort_analytics(cohort_id: str,
                            funnel_df: pd.DataFrame,
                            persona_df: pd.DataFrame) -> dict:
    # Import here to avoid circular
    from services.reason_classifier import compute_classified_reasons

    df = funnel_df[funnel_df["cohort_id"] == cohort_id].copy()
    if df.empty:
        logger.warning(f"No funnel data for cohort: {cohort_id}")
        return {}

    df["week_of_sale"] = df["week_of_sale"].str.lower().str.strip()
    df = merge_persona_reasons(df, persona_df)

    return {
        "cohort_id":          cohort_id,
        "kpis":               compute_kpis(df),
        "programs":           compute_programs(df),
        "weeks":              compute_weeks(df),
        "hierarchy":          compute_hierarchy(df),
        "engagement":         compute_engagement(df),
        "persona_breakdown":  compute_persona_breakdown(df),
        "ctc_breakdown":      compute_ctc(df),
        "experience_breakdown": compute_experience(df),
        "program_refunds":    compute_program_refunds(df),
        "source_breakdown":   compute_source(df),
        "psas":               compute_psas(df),
        "reasons":            compute_classified_reasons(df, persona_df),
    }

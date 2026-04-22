// program.jsx — Page 3: Program Health
// Tabs: Overview | Mentor | Classroom | All Incidents
// @ts-nocheck

const { useState: usePH, useEffect: usePHE, useMemo: usePHM, useCallback: usePHCB, useRef: usePHR } = React;

/* ═══════════════════════════════════════════════
   MOCK DATA (fallback when API offline)
   ═══════════════════════════════════════════════ */
const MOCK = {
  overview: {
    total_incidents: 8, open: 3, escalated: 1, in_progress: 1, resolved: 3,
    by_type: [
      { type: "Mentor No-show", count: 3 }, { type: "TA No-show", count: 2 },
      { type: "Tech Issue (Zoom/Meet)", count: 1 }, { type: "Content Issue", count: 1 },
      { type: "Mentee No-show", count: 1 },
    ],
    by_batch: [
      { batch: "DSML Apr26 Beginner", count: 3 }, { batch: "DevOps Apr26", count: 2 },
      { batch: "Academy Apr26 Intermediate", count: 2 }, { batch: "AIML Apr26 Batch", count: 1 },
    ],
    low_rating_batches: 2, total_low_raters: 6, low_rater_entries: 6,
    mentee_noshows: 1,
    mentor_analysis: [
      { name: "Unknown Mentor", total_noshows: 3, unresolved: 2, batches: ["DSML Apr26 Beginner", "DevOps Apr26"],
        reason_summary: ["Mentor unreachable on Slack and phone", "No backup assigned for evening slot"], is_repeat: true },
    ],
  },
  incidents: [
    { id: 4, date: "21/04/26", batch: "DSML Apr26 Beginner", class_num: "2", incident_type: "Mentor No-show", instructor_name: "", details: "Mentor didn't join scheduled session. 12 learners waited 20 mins.", reported_by: "aditya.p@scaler.com", status: "Open", resolution_notes: "", escalated_to: "", escalation_date: "", manager_remarks: "" },
    { id: 5, date: "21/04/26", batch: "DevOps Apr26", class_num: "1", incident_type: "TA No-show", instructor_name: "Chamandeep Singh", details: "TA was absent for the entire session. Instructor handled doubts alone.", reported_by: "syed.imroz@scaler.com", status: "Open", resolution_notes: "", escalated_to: "", escalation_date: "", manager_remarks: "" },
    { id: 6, date: "20/04/26", batch: "Academy Apr26 Intermediate", class_num: "1", incident_type: "Tech Issue (Zoom/Meet)", instructor_name: "Prithviraj Pillai", details: "Zoom call dropped for 15 mins mid-session. Learners lost context on arrays topic.", reported_by: "chinmoy.paul@scaler.com", status: "Escalated", resolution_notes: "Zoom license issue flagged to IT.", escalated_to: "vishnu.c@scaler.com", escalation_date: "20/04/26", manager_remarks: "" },
    { id: 7, date: "19/04/26", batch: "AIML Apr26 Batch", class_num: "1", incident_type: "Content Issue", instructor_name: "Aniruddha", details: "Slides had outdated TensorFlow 1.x code. Multiple learners confused.", reported_by: "nishtha.tiwari@scaler.com", status: "Resolved", resolution_notes: "Updated slides shared next day. Instructor acknowledged. [Resolved by nishtha.tiwari@scaler.com on 20/04/2026 14:30]", escalated_to: "", escalation_date: "", manager_remarks: "" },
    { id: 8, date: "19/04/26", batch: "DSML Apr26 Beginner", class_num: "1", incident_type: "Mentor No-show", instructor_name: "", details: "Mentor no-show for 3 learners in evening slot.", reported_by: "smriti.prem@scaler.com", status: "Resolved", resolution_notes: "Rescheduled with backup mentor. [Resolved by smriti.prem@scaler.com]", escalated_to: "", escalation_date: "", manager_remarks: "" },
    { id: 9, date: "21/04/26", batch: "Academy Apr26 Intermediate", class_num: "2", incident_type: "Mentee No-show", instructor_name: "", details: "5 learners didn't attend despite RSVP. PSA following up.", reported_by: "vishnu.vijayan@scaler.com", status: "In Progress", resolution_notes: "", escalated_to: "", escalation_date: "", manager_remarks: "" },
    { id: 10, date: "21/04/26", batch: "DevOps Apr26", class_num: "2", incident_type: "Mentor No-show", instructor_name: "", details: "Mentor unreachable on Slack and phone for 40 mins.", reported_by: "syed.imroz@scaler.com", status: "Open", resolution_notes: "", escalated_to: "", escalation_date: "", manager_remarks: "" },
    { id: 11, date: "18/04/26", batch: "DSML Apr26 Beginner", class_num: "1", incident_type: "TA No-show", instructor_name: "Prakash Chauhan", details: "TA was on leave without notice. No backup assigned.", reported_by: "aditya.p@scaler.com", status: "Closed", resolution_notes: "TA warned. Backup TA policy created. [Resolved by aditya.p@scaler.com]", escalated_to: "", escalation_date: "", manager_remarks: "" },
  ],
  class_ratings: [
    { batch: "Academy Apr26 Advanced", instructor: "Shreesh Tripathi", classes: { "1": { avg_rating: 4.69, total_rated: 13, low_count: 1, avg_live_att: 89.2, avg_overall_att: 91.0, avg_psp: 72.1, flag: "OK" }}},
    { batch: "Academy Apr26 Beginner", instructor: "Yash Raj", classes: { "1": { avg_rating: 4.73, total_rated: 11, low_count: 1, avg_live_att: 92.1, avg_overall_att: 93.5, avg_psp: 68.4, flag: "OK" }}},
    { batch: "Academy Apr26 Intermediate", instructor: "Prithviraj Pillai", classes: { "1": { avg_rating: 4.89, total_rated: 38, low_count: 0, avg_live_att: 94.3, avg_overall_att: 95.1, avg_psp: 81.2, flag: "OK" }}},
    { batch: "Academy Apr26 Intermediate Java Refresher", instructor: "Yogesh Kumar", classes: { "1": { avg_rating: 4.94, total_rated: 17, low_count: 0, avg_live_att: 95.8, avg_overall_att: 96.2, avg_psp: 85.3, flag: "OK" }}},
    { batch: "Academy Apr26 Intermediate Morning", instructor: "Yahnit", classes: { "1": { avg_rating: 4.86, total_rated: 21, low_count: 0, avg_live_att: 91.4, avg_overall_att: 92.8, avg_psp: 78.9, flag: "OK" }}},
    { batch: "Academy Apr26 Intermediate Python Refresher", instructor: "Akanksha Gaur", classes: { "1": { avg_rating: 4.69, total_rated: 13, low_count: 0, avg_live_att: 88.7, avg_overall_att: 90.1, avg_psp: 71.6, flag: "OK" }}},
    { batch: "AIML Apr26 Batch", instructor: "Aniruddha", classes: { "1": { avg_rating: 4.82, total_rated: 28, low_count: 0, avg_live_att: 91.6, avg_overall_att: 92.3, avg_psp: 74.5, flag: "OK" }}},
    { batch: "AIML Apr26 Batch 2", instructor: "", classes: { "1": { avg_rating: 4.78, total_rated: 32, low_count: 0, avg_live_att: 90.3, avg_overall_att: 91.5, avg_psp: 70.2, flag: "OK" }}},
    { batch: "DSML Apr26 Beginner", instructor: "Prakash Chauhan", classes: { "1": { avg_rating: 4.68, total_rated: 53, low_count: 3, avg_live_att: 88.5, avg_overall_att: 90.0, avg_psp: 61.3, flag: "OK" }}},
    { batch: "DSML Apr26 Intermediate", instructor: "Rahul Janghu", classes: { "1": { avg_rating: 4.71, total_rated: 7, low_count: 0, avg_live_att: 93.1, avg_overall_att: 94.0, avg_psp: 66.8, flag: "OK" }}},
    { batch: "DevOps Apr26", instructor: "Chamandeep Singh", classes: { "1": { avg_rating: 4.47, total_rated: 34, low_count: 3, avg_live_att: 82.7, avg_overall_att: 84.3, avg_psp: 55.8, flag: "WATCH" }}},
  ],
  low_raters: [
    { email: "arun.kumar@gmail.com", batch: "DSML Apr26 Beginner", psa: "aditya.p@scaler.com", sale_status: "COMPLETE", class_num: 1, rating: 2, lsm_notes: "Pacing too fast. Couldn't follow SQL joins section. Needs slower examples.", noshow_reason: "" },
    { email: "meena.s@gmail.com", batch: "DSML Apr26 Beginner", psa: "smriti.prem@scaler.com", sale_status: "COMPLETE", class_num: 1, rating: 3, lsm_notes: "Audio quality poor. Speaker kept cutting out. Frustrating experience.", noshow_reason: "" },
    { email: "ravi.p@gmail.com", batch: "DSML Apr26 Beginner", psa: "aditya.p@scaler.com", sale_status: "COMPLETE", class_num: 1, rating: 3, lsm_notes: "Examples too basic. Expected more real-world depth.", noshow_reason: "" },
    { email: "deepak.m@gmail.com", batch: "DevOps Apr26", psa: "syed.imroz@scaler.com", sale_status: "COMPLETE", class_num: 1, rating: 2, lsm_notes: "Docker setup instructions were unclear. Lost 30 mins troubleshooting.", noshow_reason: "" },
    { email: "priya.r@gmail.com", batch: "DevOps Apr26", psa: "syed.imroz@scaler.com", sale_status: "PENDING", class_num: 1, rating: 3, lsm_notes: "Instructor skipped prerequisite explanation. Assumed everyone knew Linux.", noshow_reason: "" },
    { email: "karthik.n@gmail.com", batch: "Academy Apr26 Advanced", psa: "chinmoy.paul@scaler.com", sale_status: "COMPLETE", class_num: 1, rating: 3, lsm_notes: "", noshow_reason: "" },
  ],
  instructor_map: {},
};


/* ═══════════════════════════════════════════════
   THEME & HELPERS
   ═══════════════════════════════════════════════ */
const T = {
  bg: 'var(--bg)', card: 'var(--bg-1)', border: 'var(--border)', divider: 'var(--border)',
  txt1: 'var(--fg)', txt2: 'var(--fg)', txt3: 'var(--fg-2)', txt4: 'var(--fg-3)',
  accent: 'var(--indigo)', accentBg: 'var(--indigo-soft)', accentTxt: 'var(--indigo)',
  red: 'var(--red)', redBg: 'var(--red-soft)', redTxt: 'var(--red)',
  amber: 'var(--amber)', amberBg: 'var(--amber-soft)', amberTxt: 'var(--amber)',
  green: 'var(--green)', greenBg: 'var(--green-soft)', greenTxt: 'var(--green)',
  blue: 'var(--cyan)', blueBg: 'var(--cyan-soft)', blueTxt: 'var(--cyan)',
  purple: 'var(--violet)', purpleBg: 'var(--violet-soft)', purpleTxt: 'var(--violet)',
  thead: 'var(--bg-2)',
  radius: 10,
  font: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
};

const flagStyle = f => {
  if (f === 'LOW') return { bg: T.redBg, color: T.red };
  if (f === 'WATCH') return { bg: T.amberBg, color: T.amber };
  return { bg: T.greenBg, color: T.green };
};

const statusStyle = s => {
  if (!s || s === 'Open') return { bg: T.redBg, color: T.red, label: 'Open' };
  if (s === 'Escalated') return { bg: T.amberBg, color: T.amber, label: 'Escalated' };
  if (s === 'In Progress') return { bg: T.blueBg, color: T.blue, label: 'In Progress' };
  if (s === 'Resolved') return { bg: T.greenBg, color: T.green, label: 'Resolved' };
  if (s === 'Closed') return { bg: T.thead, color: T.txt3, label: 'Closed' };
  return { bg: T.thead, color: T.txt3, label: s };
};

const typeIcon = t => {
  const m = { 'Mentor No-show': '\u{1F464}', 'Mentee No-show': '\u{1F393}', 'TA No-show': '\u{1F9D1}\u200D\u{1F3EB}',
    'Instructor No-show': '\u{1F4DA}', 'Instructor Late Join': '\u23F0', 'Tech Issue (Platform)': '\u{1F4BB}',
    'Tech Issue (Zoom/Meet)': '\u{1F4F9}', 'Content Issue': '\u{1F4DD}', 'Scheduling Conflict': '\u{1F4C5}' };
  return m[t] || '\u26A0\uFE0F';
};

const shortBatch = b => {
  if (!b) return '';
  return b.replace('Academy Apr26 ', 'Acad ').replace('DSML Apr26 ', 'DSML ').replace('AIML Apr26 ', 'AIML ')
    .replace('DevOps Apr26', 'DevOps').replace('Intermediate', 'Int').replace('Beginner', 'Beg')
    .replace('Morning', 'AM').replace('Refresher', 'Ref').replace('Python ', 'Py ').replace('Java ', 'J ');
};

const shortEmail = e => e ? e.split('@')[0] : '';
const safeFixed = (v, d = 1) => (v != null && !isNaN(v)) ? Number(v).toFixed(d) : '--';


/* ═══════════════════════════════════════════════
   SHARED UI COMPONENTS
   ═══════════════════════════════════════════════ */

const Card = ({ children, title, subtitle, badge, accent, style = {} }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius,
    borderTop: accent ? `3px solid ${accent}` : undefined, padding: '20px 24px', ...style }}>
    {(title || badge != null) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          {title && <div style={{ fontSize: 13, fontWeight: 700, color: T.txt1, letterSpacing: -0.2 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 11, color: T.txt3, marginTop: 2, fontStyle: 'italic' }}>{subtitle}</div>}
        </div>
        {badge != null && <span style={{ background: T.redBg, color: T.red, fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 10 }}>{badge}</span>}
      </div>
    )}
    {children}
  </div>
);

const KPI = ({ label, value, sub, color }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius,
    padding: '16px 20px', flex: 1, minWidth: 130 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: T.txt4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color: color || T.txt1, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.txt4, marginTop: 4 }}>{sub}</div>}
  </div>
);

const Pill = ({ label, active, count, onClick }) => (
  <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
    borderRadius: 20, border: `1px solid ${active ? T.accent : T.border}`, cursor: 'pointer',
    background: active ? T.accentBg : T.card, color: active ? T.accent : T.txt3,
    fontSize: 12, fontWeight: 600, fontFamily: T.font, transition: 'all 0.15s' }}>
    {label}
    {count != null && <span style={{ background: active ? T.accent : T.border, color: active ? '#fff' : T.txt3,
      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>{count}</span>}
  </button>
);

const StatusBadge = ({ status }) => {
  const s = statusStyle(status);
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11,
    fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
};

const FlagBadge = ({ flag }) => {
  const s = flagStyle(flag);
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10,
    fontWeight: 700, background: s.bg, color: s.color }}>{flag}</span>;
};

const Th = ({ children, width, align = 'left' }) => (
  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: 0.5, color: T.txt4, textAlign: align, borderBottom: `1.5px solid ${T.border}`,
    background: T.thead, width, whiteSpace: 'nowrap' }}>{children}</th>
);

const Td = ({ children, align = 'left', bold, color, nowrap }) => (
  <td style={{ padding: '10px 12px', fontSize: 13, color: color || T.txt2, fontWeight: bold ? 600 : 400,
    textAlign: align, borderBottom: `1px solid ${T.divider}`, whiteSpace: nowrap ? 'nowrap' : 'normal',
    maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</td>
);

const Btn = ({ children, onClick, color = T.accent, small, outline, disabled, style = {} }) => (
  <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
    padding: small ? '4px 12px' : '8px 18px', borderRadius: 8, border: outline ? `1px solid ${color}` : 'none',
    background: outline ? 'transparent' : disabled ? T.border : color, color: outline ? color : '#fff',
    fontSize: small ? 11 : 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: T.font, opacity: disabled ? 0.5 : 1, transition: 'all 0.15s', ...style }}>
    {children}
  </button>
);

const Empty = ({ message }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px', color: T.txt4, fontSize: 13 }}>
    <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F389}'}</div>
    {message || 'No data to display'}
  </div>
);


/* ═══════════════════════════════════════════════
   MODAL COMPONENT
   ═══════════════════════════════════════════════ */

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'rgba(15,17,23,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: T.card, borderRadius: 14, padding: '28px 32px', width: '100%',
        maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.txt1 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: T.txt4, padding: 4 }}>{'\u2715'}</button>
        </div>
        {children}
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════════
   RESOLVE MODAL
   ═══════════════════════════════════════════════ */

const ResolveModal = ({ incident, onConfirm, onClose, loading }) => {
  const [email, setEmail] = usePH('');
  const [notes, setNotes] = usePH('');
  if (!incident) return null;

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid var(--border-2)`, background: 'var(--bg-2)', color: 'var(--fg)',
    fontSize: 13, fontFamily: T.font, outline: 'none', boxSizing: 'border-box' };

  return (
    <Modal open={true} onClose={onClose} title="Resolve Incident">
      <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 12, color: 'var(--fg)' }}>
        <div><strong style={{color:'var(--fg)'}}>Type:</strong> <span style={{color:'var(--fg-2)'}}>{incident.incident_type}</span></div>
        <div><strong style={{color:'var(--fg)'}}>Batch:</strong> <span style={{color:'var(--fg-2)'}}>{incident.batch} | Class {incident.class_num}</span></div>
        <div style={{ marginTop: 6, color: 'var(--fg)' }}>{incident.details}</div>
      </div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', display: 'block', marginBottom: 4 }}>
        Your Email (credential) *
      </label>
      <input type="email" placeholder="your.name@scaler.com" value={email}
        onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', display: 'block', marginBottom: 4 }}>
        Resolution Notes *
      </label>
      <textarea placeholder="What was done to resolve this?" value={notes}
        onChange={e => setNotes(e.target.value)} rows={4}
        style={{ ...inputStyle, marginBottom: 20, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn outline onClick={onClose} color={'var(--fg-2)'}>Cancel</Btn>
        <Btn onClick={() => onConfirm(incident.id, email, notes)} color={T.green}
          disabled={!email.trim() || !notes.trim() || loading}>
          {loading ? 'Resolving...' : 'Resolve & Update Sheet'}
        </Btn>
      </div>
    </Modal>
  );
};


/* ═══════════════════════════════════════════════
   ESCALATE MODAL
   ═══════════════════════════════════════════════ */

const EscalateModal = ({ incident, onConfirm, onClose, loading }) => {
  const [email, setEmail] = usePH('');
  const [escalateTo, setEscalateTo] = usePH('');
  const [reason, setReason] = usePH('');
  if (!incident) return null;

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid var(--border-2)`, background: 'var(--bg-2)', color: 'var(--fg)',
    fontSize: 13, fontFamily: T.font, outline: 'none', boxSizing: 'border-box' };

  return (
    <Modal open={true} onClose={onClose} title="Escalate Incident">
      <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 12, color: 'var(--fg)' }}>
        <div><strong style={{color:'var(--fg)'}}>Type:</strong> <span style={{color:'var(--fg-2)'}}>{incident.incident_type}</span></div>
        <div><strong style={{color:'var(--fg)'}}>Batch:</strong> <span style={{color:'var(--fg-2)'}}>{incident.batch} | Class {incident.class_num}</span></div>
        <div style={{ marginTop: 6, color: 'var(--fg)' }}>{incident.details}</div>
      </div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', display: 'block', marginBottom: 4 }}>
        Your Email (credential) *
      </label>
      <input type="email" placeholder="your.name@scaler.com" value={email}
        onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', display: 'block', marginBottom: 4 }}>
        Escalate To *
      </label>
      <input type="text" placeholder="manager.name@scaler.com or name" value={escalateTo}
        onChange={e => setEscalateTo(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', display: 'block', marginBottom: 4 }}>
        Reason for Escalation *
      </label>
      <textarea placeholder="Why does this need escalation?" value={reason}
        onChange={e => setReason(e.target.value)} rows={3}
        style={{ ...inputStyle, marginBottom: 20, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn outline onClick={onClose} color={'var(--fg-2)'}>Cancel</Btn>
        <Btn onClick={() => onConfirm(incident.id, email, escalateTo, reason)} color={T.amber}
          disabled={!email.trim() || !escalateTo.trim() || !reason.trim() || loading}>
          {loading ? 'Escalating...' : 'Escalate & Update Sheet'}
        </Btn>
      </div>
    </Modal>
  );
};


/* ═══════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════ */

const Toast = ({ message, type, onClose }) => {
  usePHE(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  const bg = type === 'success' ? T.green : type === 'error' ? T.red : T.accent;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 10000, background: bg, color: '#fff',
      padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: T.font,
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10,
      animation: 'fadeInUp 0.3s ease' }}>
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff',
        cursor: 'pointer', fontSize: 16, padding: 0 }}>{'\u2715'}</button>
    </div>
  );
};


/* ═══════════════════════════════════════════════
   INCIDENT CARD
   ═══════════════════════════════════════════════ */

const IncidentCard = ({ inc, onResolve, onEscalate }) => {
  const st = statusStyle(inc.status);
  const isOpen = inc.status === 'Open' || !inc.status;
  const isEscalated = inc.status === 'Escalated';
  const isActive = isOpen || isEscalated || inc.status === 'In Progress';
  const isRecordOnly = inc.record_only || inc.incident_type === 'Mentee No-show' || inc.incident_type === 'Mentee No-Show';

  return (
    <div style={{ background: T.card, border: `1px solid ${isOpen && !isRecordOnly ? T.red + '40' : T.border}`,
      borderLeft: `4px solid ${isRecordOnly ? T.txt4 : st.color}`, borderRadius: T.radius, padding: '16px 20px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{typeIcon(inc.incident_type)}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.txt1 }}>{inc.incident_type}</span>
          {isRecordOnly
            ? <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11,
                fontWeight: 600, background: T.thead, color: T.txt3 }}>Record Only</span>
            : <StatusBadge status={inc.status} />}
        </div>
        <span style={{ fontSize: 11, color: T.txt4 }}>{inc.date}</span>
      </div>
      <div style={{ fontSize: 12, color: T.txt3, marginBottom: 6 }}>
        <strong>{shortBatch(inc.batch)}</strong> | Class {inc.class_num}
        {inc.instructor_name && <> | {inc.instructor_name}</>}
      </div>
      <div style={{ fontSize: 13, color: T.txt2, marginBottom: 10, lineHeight: 1.5 }}>{inc.details}</div>
      {inc.resolution_notes && (
        <div style={{ background: T.greenBg, borderRadius: 6, padding: '8px 12px', fontSize: 12,
          color: T.greenTxt, marginBottom: 10 }}>
          <strong>Resolution:</strong> {inc.resolution_notes}
        </div>
      )}
      {inc.escalated_to && (
        <div style={{ background: T.amberBg, borderRadius: 6, padding: '8px 12px', fontSize: 12,
          color: T.amberTxt, marginBottom: 10 }}>
          <strong>Escalated to:</strong> {inc.escalated_to} on {inc.escalation_date}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: T.txt4 }}>Reported by {shortEmail(inc.reported_by)}</span>
        {isActive && !isRecordOnly && (
          <div style={{ display: 'flex', gap: 8 }}>
            {inc.status !== 'Escalated' && (
              <Btn small outline color={T.amber} onClick={() => onEscalate(inc)}>Escalate</Btn>
            )}
            <Btn small color={T.green} onClick={() => onResolve(inc)}>Resolve</Btn>
          </div>
        )}
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════ */

const OverviewTab = ({ data }) => {
  const { overview } = data;
  const mentorAnalysis = overview.mentor_analysis || [];
  const repeatOffenders = mentorAnalysis.filter(m => m.is_repeat);

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPI label="Total Incidents" value={overview.total_incidents} />
        <KPI label="Open" value={overview.open} color={overview.open > 0 ? T.red : T.green} />
        <KPI label="Escalated" value={overview.escalated} color={overview.escalated > 0 ? T.amber : T.green} />
        <KPI label="In Progress" value={overview.in_progress} color={T.blue} />
        <KPI label="Resolved" value={overview.resolved} color={T.green} />
        <KPI label="Mentee No-shows" value={overview.mentee_noshows || 0} color={T.txt3}
          sub="Record only" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* By Bucket (AI classified) */}
        <Card title="Incidents by Category" subtitle="AI-classified canonical buckets">
          {(!overview.by_bucket || overview.by_bucket.length === 0) ? <Empty message="No incidents logged yet" /> :
            overview.by_bucket.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < overview.by_bucket.length - 1 ? `1px solid ${T.divider}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.txt2 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, background: T.accentBg, color: T.accent, fontSize: 11, fontWeight: 600 }}>
                    {t.bucket}
                  </span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.txt1 }}>{t.count}</span>
              </div>
            ))}
        </Card>

        {/* By Batch */}
        <Card title="Incidents by Batch">
          {overview.by_batch.length === 0 ? <Empty message="No incidents logged yet" /> :
            overview.by_batch.map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < overview.by_batch.length - 1 ? `1px solid ${T.divider}` : 'none' }}>
                <span style={{ fontSize: 13, color: T.txt2 }}>{shortBatch(b.batch)}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.txt1 }}>{b.count}</span>
              </div>
            ))}
        </Card>
      </div>

      {/* Mentor Analysis Cards */}
      <Card title="Mentor No-show Analysis" subtitle="Repeat offenders and AI-analyzed reasons"
        accent={repeatOffenders.length > 0 ? T.red : undefined} style={{ marginBottom: 20 }}>
        {mentorAnalysis.length === 0 ? <Empty message="No mentor no-shows recorded" /> : (
          <div>
            {repeatOffenders.length > 0 && (
              <div style={{ background: T.redBg, borderRadius: 8, padding: '12px 16px', marginBottom: 16,
                border: `1px solid ${T.red}30` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.red, marginBottom: 4 }}>
                  {'\u26A0\uFE0F'} {repeatOffenders.length} repeat offender{repeatOffenders.length > 1 ? 's' : ''} detected
                </div>
                <div style={{ fontSize: 11, color: T.txt3 }}>
                  Mentors with 2+ no-shows need immediate attention
                </div>
              </div>
            )}
            {mentorAnalysis.map((m, i) => (
              <div key={i} style={{ padding: '14px 0', borderBottom: i < mentorAnalysis.length - 1 ? `1px solid ${T.divider}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.txt1 }}>{m.name}</span>
                    {m.is_repeat && (
                      <span style={{ padding: '2px 8px', borderRadius: 10, background: T.redBg, color: T.red,
                        fontSize: 10, fontWeight: 700 }}>REPEAT</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: m.total_noshows >= 2 ? T.red : T.amber, fontWeight: 700 }}>
                      {m.total_noshows} no-show{m.total_noshows > 1 ? 's' : ''}
                    </span>
                    {m.unresolved > 0 && (
                      <span style={{ padding: '2px 8px', borderRadius: 10, background: T.amberBg, color: T.amber,
                        fontSize: 10, fontWeight: 700 }}>{m.unresolved} open</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.txt3, marginBottom: 6 }}>
                  Batches: {m.batches.map(b => shortBatch(b)).join(', ')}
                </div>
                {m.reason_summary && m.reason_summary.length > 0 && (
                  <div style={{ background: T.accentBg, border: `1px solid ${T.border}`, borderRadius: 6,
                    padding: '8px 12px', marginTop: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: 'uppercase',
                      letterSpacing: '0.06em', marginBottom: 4 }}>Why (AI analysis)</div>
                    <ul style={{ margin: 0, paddingLeft: 16, color: T.txt2, fontSize: 12, lineHeight: 1.6 }}>
                      {m.reason_summary.map((b, bi) => <li key={bi}>{b}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};


/* ═══════════════════════════════════════════════
   MENTOR TAB
   ═══════════════════════════════════════════════ */

const MentorTab = ({ data, onResolve, onEscalate }) => {
  const mentorTypes = ['Mentor No-show', 'Mentee No-show'];
  const mentorInc = data.incidents.filter(i => mentorTypes.includes(i.incident_type));
  const openInc = mentorInc.filter(i => ['Open', 'In Progress', 'Escalated', ''].includes(i.status));
  const closedInc = mentorInc.filter(i => ['Resolved', 'Closed'].includes(i.status));

  const mentorCount = mentorInc.filter(i => i.incident_type === 'Mentor No-show').length;
  const menteeCount = mentorInc.filter(i => i.incident_type === 'Mentee No-show').length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPI label="Mentor No-shows" value={mentorCount} color={mentorCount > 0 ? T.red : T.green} />
        <KPI label="Mentee No-shows" value={menteeCount} color={menteeCount > 0 ? T.amber : T.green} />
        <KPI label="Unresolved" value={openInc.length} color={openInc.length > 0 ? T.red : T.green} />
        <KPI label="Resolved" value={closedInc.length} color={T.green} />
      </div>

      {openInc.length > 0 && (
        <Card title="Unresolved Mentor Incidents" badge={openInc.length} accent={T.red} style={{ marginBottom: 20 }}>
          {openInc.map(inc => <IncidentCard key={inc.id} inc={inc} onResolve={onResolve} onEscalate={onEscalate} />)}
        </Card>
      )}

      {closedInc.length > 0 && (
        <Card title="Resolved" style={{ marginBottom: 20 }}>
          {closedInc.map(inc => <IncidentCard key={inc.id} inc={inc} onResolve={onResolve} onEscalate={onEscalate} />)}
        </Card>
      )}

      {mentorInc.length === 0 && <Empty message="No mentor incidents logged" />}
    </div>
  );
};


/* ═══════════════════════════════════════════════
   CLASSROOM TAB
   ═══════════════════════════════════════════════ */

const ClassroomTab = ({ data, onResolve, onEscalate }) => {
  const [search, setSearch] = usePH('');

  const classroomTypes = ['TA No-show', 'Instructor No-show', 'Instructor Late Join',
    'Tech Issue (Platform)', 'Tech Issue (Zoom/Meet)', 'Content Issue'];
  const classroomInc = data.incidents.filter(i => classroomTypes.includes(i.incident_type));
  const openClassroom = classroomInc.filter(i => ['Open', 'In Progress', 'Escalated', ''].includes(i.status));

  // Search filter
  const q = search.toLowerCase().trim();
  const filteredRatings = q
    ? data.class_ratings.filter(cr =>
        (cr.instructor || '').toLowerCase().includes(q) || (cr.batch || '').toLowerCase().includes(q))
    : data.class_ratings;

  const filteredLow = q
    ? data.low_raters.filter(lr =>
        (lr.batch || '').toLowerCase().includes(q) || (lr.email || '').toLowerCase().includes(q))
    : data.low_raters;

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder="Search by instructor name, email, or batch..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 500, padding: '10px 16px', borderRadius: 10,
            border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: 'none',
            boxSizing: 'border-box', background: T.card }} />
      </div>

      {/* Open Classroom Incidents */}
      {openClassroom.length > 0 && (
        <Card title="Open Classroom Incidents" badge={openClassroom.length} accent={T.amber} style={{ marginBottom: 20 }}>
          {openClassroom.map(inc => <IncidentCard key={inc.id} inc={inc} onResolve={onResolve} onEscalate={onEscalate} />)}
        </Card>
      )}

      {/* Class Ratings Table */}
      <Card title="Class Ratings by Batch" style={{ marginBottom: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <Th>Batch</Th><Th>Instructor</Th>
              {[1,2,3,4,5,6].map(cn => <Th key={cn} align="center">Class {cn}<br/>
                <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>Rating / Att%</span>
              </Th>)}
            </tr></thead>
            <tbody>
              {filteredRatings.map((cr, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-1)' : 'var(--bg-2)' }}>
                  <Td bold nowrap>{shortBatch(cr.batch)}</Td>
                  <Td nowrap>{cr.instructor || <span style={{ color: T.txt4, fontStyle: 'italic' }}>--</span>}</Td>
                  {[1,2,3,4,5,6].map(cn => {
                    const c = cr.classes[String(cn)];
                    if (!c || !c.avg_rating || c.avg_rating === 0) return <Td key={cn} align="center"><span style={{ color: T.txt4 }}>--</span></Td>;
                    const rColor = c.avg_rating < 4 ? T.red : c.avg_rating < 4.5 ? T.amber : T.green;
                    return <Td key={cn} align="center">
                      <span style={{ color: rColor, fontWeight: 700 }}>{safeFixed(c.avg_rating, 2)}</span>
                      <br/>
                      <span style={{ fontSize: 10, color: T.txt4 }}>
                        {c.avg_live_att ? `${safeFixed(c.avg_live_att, 0)}% | ` : ''}{c.total_rated}r
                        {c.low_count > 0 && <span style={{ color: T.red }}> | {c.low_count} low</span>}
                      </span>
                    </Td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRatings.length === 0 && <Empty message="No matching batches found" />}
      </Card>

      {/* Low Raters - grouped by batch+class, with AI summary */}
      <Card title="Low Raters by Batch & Class" badge={filteredLow.length > 0 ? filteredLow.length : null}
        subtitle="AI-summarized themes per batch/class"
        accent={filteredLow.length > 0 ? T.red : undefined} style={{ marginBottom: 20 }}>
        {(() => {
          // Use pre-grouped data from backend if available; otherwise group in frontend
          let groups = (data.low_raters_by_batch || []).filter(g => {
            if (!search.trim()) return true;
            const s = search.toLowerCase();
            return (g.batch || '').toLowerCase().includes(s) ||
                   (data.instructor_map && (data.instructor_map[g.batch] || '').toLowerCase().includes(s));
          });

          if (groups.length === 0 && filteredLow.length > 0) {
            // Fallback: group on frontend
            const map = {};
            filteredLow.forEach(lr => {
              const key = `${lr.batch}||${lr.class_num}`;
              if (!map[key]) map[key] = { batch: lr.batch, class_num: lr.class_num, count: 0, learners: [], summary_bullets: [], avg_rating: null, notes: [] };
              map[key].count += 1;
              map[key].learners.push({ email: lr.email, psa: lr.psa, rating: lr.rating, notes: lr.lsm_notes });
              if (lr.lsm_notes) map[key].notes.push(lr.lsm_notes);
            });
            groups = Object.values(map).sort((a,b) => b.count - a.count);
          }

          if (groups.length === 0) return <Empty message="No low ratings found" />;

          return groups.map((g, i) => (
            <div key={i} style={{ padding: '14px 0', borderBottom: i < groups.length - 1 ? `1px solid ${T.divider}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.txt1 }}>
                    {shortBatch(g.batch)} <span style={{ color: T.txt3, fontWeight: 500 }}>· Class {g.class_num}</span>
                  </div>
                  {data.instructor_map && data.instructor_map[g.batch] && (
                    <div style={{ fontSize: 11, color: T.txt3, marginTop: 2 }}>
                      Instructor: {data.instructor_map[g.batch]}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {g.avg_rating != null && (
                    <span style={{ fontSize: 11, color: T.txt3 }}>
                      avg <span style={{ color: T.red, fontWeight: 700 }}>{g.avg_rating.toFixed(2)}</span>
                    </span>
                  )}
                  <span style={{ padding: '2px 10px', borderRadius: 999, background: T.redBg, color: T.red, fontSize: 11, fontWeight: 700 }}>
                    {g.count} low {g.count === 1 ? 'rater' : 'raters'}
                  </span>
                </div>
              </div>

              {/* AI summary bullets */}
              {g.summary_bullets && g.summary_bullets.length > 0 && (
                <div style={{ background: T.accentBg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '10px 14px', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Key themes
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, color: T.txt1, fontSize: 12.5, lineHeight: 1.6 }}>
                    {g.summary_bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                  </ul>
                </div>
              )}

              {/* Individual learners (collapsed table) */}
              <details>
                <summary style={{ cursor: 'pointer', fontSize: 11, color: T.txt3, padding: '4px 0', userSelect: 'none' }}>
                  Show {g.learners.length} learner{g.learners.length === 1 ? '' : 's'}
                </summary>
                <div style={{ marginTop: 8, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>
                      <Th>Email</Th><Th align="center">Rating</Th><Th>LSM Notes</Th><Th>PSA</Th>
                    </tr></thead>
                    <tbody>
                      {g.learners.map((lr, li) => (
                        <tr key={li} style={{ background: li % 2 === 0 ? 'var(--bg-1)' : 'var(--bg-2)' }}>
                          <Td nowrap>{lr.email}</Td>
                          <Td align="center" bold color={lr.rating <= 2 ? T.red : T.amber}>{lr.rating}</Td>
                          <Td>{lr.notes || <span style={{ color: T.txt4, fontStyle: 'italic' }}>No notes</span>}</Td>
                          <Td nowrap>{shortEmail(lr.psa)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          ));
        })()}
      </Card>
    </div>
  );
};


/* ═══════════════════════════════════════════════
   ALL INCIDENTS TAB
   ═══════════════════════════════════════════════ */

const AllIncidentsTab = ({ data, onResolve, onEscalate }) => {
  const [filter, setFilter] = usePH('all');

  const filtered = usePHM(() => {
    if (filter === 'all') return data.incidents;
    if (filter === 'active') return data.incidents.filter(i => ['Open', 'In Progress', 'Escalated', ''].includes(i.status));
    return data.incidents.filter(i => i.status === filter || (!i.status && filter === 'Open'));
  }, [data.incidents, filter]);

  const counts = usePHM(() => {
    const c = { all: data.incidents.length, Open: 0, Escalated: 0, 'In Progress': 0, Resolved: 0, Closed: 0, active: 0 };
    data.incidents.forEach(i => {
      const s = i.status || 'Open';
      c[s] = (c[s] || 0) + 1;
      if (['Open', 'In Progress', 'Escalated'].includes(s)) c.active++;
    });
    return c;
  }, [data.incidents]);

  // CSV export
  const exportCSV = () => {
    const headers = ['Date', 'Batch', 'Class', 'Type', 'Instructor', 'Details', 'Reported By', 'Status', 'Resolution', 'Escalated To'];
    const rows = filtered.map(i => [i.date, i.batch, i.class_num, i.incident_type, i.instructor_name,
      `"${(i.details || '').replace(/"/g, '""')}"`, i.reported_by, i.status, `"${(i.resolution_notes || '').replace(/"/g, '""')}"`, i.escalated_to]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `program_incidents_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Pill label="All" count={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
          <Pill label="Active" count={counts.active} active={filter === 'active'} onClick={() => setFilter('active')} />
          <Pill label="Open" count={counts.Open} active={filter === 'Open'} onClick={() => setFilter('Open')} />
          <Pill label="Escalated" count={counts.Escalated} active={filter === 'Escalated'} onClick={() => setFilter('Escalated')} />
          <Pill label="In Progress" count={counts['In Progress']} active={filter === 'In Progress'} onClick={() => setFilter('In Progress')} />
          <Pill label="Resolved" count={counts.Resolved} active={filter === 'Resolved'} onClick={() => setFilter('Resolved')} />
        </div>
        <Btn small outline color={T.accent} onClick={exportCSV}>Export CSV</Btn>
      </div>

      {filtered.length === 0 ? <Empty message="No incidents match this filter" /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <Th width={80}>Date</Th><Th>Type</Th><Th>Batch</Th><Th width={50} align="center">Class</Th>
              <Th>Details</Th><Th>Reporter</Th><Th align="center">Status</Th><Th width={140}>Actions</Th>
            </tr></thead>
            <tbody>
              {filtered.map((inc, i) => {
                const isActive = ['Open', 'In Progress', 'Escalated', ''].includes(inc.status);
                return (
                  <tr key={inc.id} style={{ background: i % 2 === 0 ? 'var(--bg-1)' : 'var(--bg-2)' }}>
                    <Td nowrap>{inc.date}</Td>
                    <Td nowrap>
                      <span style={{ marginRight: 4 }}>{typeIcon(inc.incident_type)}</span>
                      {inc.incident_type}
                    </Td>
                    <Td nowrap>{shortBatch(inc.batch)}</Td>
                    <Td align="center">{inc.class_num}</Td>
                    <Td>{inc.details}</Td>
                    <Td nowrap>{shortEmail(inc.reported_by)}</Td>
                    <Td align="center"><StatusBadge status={inc.status} /></Td>
                    <Td>
                      {isActive && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn small color={T.green} onClick={() => onResolve(inc)}>Resolve</Btn>
                          {inc.status !== 'Escalated' && (
                            <Btn small outline color={T.amber} onClick={() => onEscalate(inc)}>Esc</Btn>
                          )}
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

function ProgramHealth({ cohort }) {
  const [data, setData] = usePH(null);
  const [loading, setLoading] = usePH(true);
  const [error, setError] = usePH(null);
  const [tab, setTab] = usePH('overview');
  const [resolveTarget, setResolveTarget] = usePH(null);
  const [escalateTarget, setEscalateTarget] = usePH(null);
  const [actionLoading, setActionLoading] = usePH(false);
  const [toast, setToast] = usePH(null);

  // Load data
  const loadData = usePHCB(async () => {
    setLoading(true);
    setError(null);
    try {
      const API = window.API;
      if (API && API.getProgramHealth) {
        const result = await API.getProgramHealth(cohort);
        if (result) { setData(result); setLoading(false); return; }
      }
    } catch (e) {
      console.warn('[ProgramHealth] API failed, using mock:', e.message);
    }
    // Fallback to mock
    setData(MOCK);
    setLoading(false);
  }, [cohort]);

  usePHE(() => { loadData(); }, [loadData]);

  // Resolve
  const handleResolve = async (incidentId, email, notes) => {
    setActionLoading(true);
    try {
      const API = window.API;
      if (API && API.resolveIncident) {
        await API.resolveIncident(incidentId, email, notes);
      }
      setResolveTarget(null);
      setToast({ message: 'Incident resolved! Sheet updated.', type: 'success' });
      await loadData();
    } catch (e) {
      setToast({ message: `Failed: ${e.message}`, type: 'error' });
    }
    setActionLoading(false);
  };

  // Escalate
  const handleEscalate = async (incidentId, email, escalateTo, reason) => {
    setActionLoading(true);
    try {
      const API = window.API;
      if (API && API.escalateIncident) {
        await API.escalateIncident(incidentId, email, escalateTo, reason);
      }
      setEscalateTarget(null);
      setToast({ message: 'Incident escalated! Sheet updated.', type: 'success' });
      await loadData();
    } catch (e) {
      setToast({ message: `Failed: ${e.message}`, type: 'error' });
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400,
        color: T.txt4, fontSize: 14, fontFamily: T.font }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>{'\u2699\uFE0F'}</div>
          Loading Program Health data...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: T.txt4 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>{'\u26A0\uFE0F'}</div>
        Failed to load program health data.
        <div style={{ marginTop: 12 }}><Btn onClick={loadData}>Retry</Btn></div>
      </div>
    );
  }

  const openCount = data.overview.open + data.overview.escalated;

  const TABS = [
    { id: 'overview', label: 'Overview', icon: '\u{1F4CA}' },
    { id: 'incidents', label: 'All Incidents', icon: '\u{1F4CB}', badge: openCount },
  ];

  return (
    <div style={{ fontFamily: T.font }}>
      {/* Floating Alert Bar */}
      {openCount > 0 && (
        <div style={{ background: `linear-gradient(135deg, ${T.redBg}, ${T.amberBg})`, border: `1px solid ${T.red}30`,
          borderRadius: T.radius, padding: '12px 20px', marginBottom: 16, display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>{'\u{1F6A8}'}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.redTxt }}>
              {openCount} unresolved incident{openCount > 1 ? 's' : ''} need attention
            </span>
            {data.overview.open > 0 && (
              <span style={{ background: T.red, color: '#fff', fontSize: 11, fontWeight: 700,
                padding: '2px 8px', borderRadius: 10 }}>{data.overview.open} Open</span>
            )}
            {data.overview.escalated > 0 && (
              <span style={{ background: T.amber, color: '#fff', fontSize: 11, fontWeight: 700,
                padding: '2px 8px', borderRadius: 10 }}>{data.overview.escalated} Escalated</span>
            )}
          </div>
          <Btn small onClick={() => setTab('incidents')}>View All</Btn>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `2px solid ${T.border}`,
        paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 600, fontFamily: T.font, cursor: 'pointer',
            border: 'none', borderBottom: `3px solid ${tab === t.id ? T.accent : 'transparent'}`,
            background: 'transparent', color: tab === t.id ? T.accent : T.txt3,
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
            marginBottom: -2 }}>
            <span style={{ fontSize: 15 }}>{t.icon}</span>
            {t.label}
            {t.badge > 0 && (
              <span style={{ background: T.red, color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 10, minWidth: 16, textAlign: 'center' }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && <OverviewTab data={data} />}
      {tab === 'incidents' && <AllIncidentsTab data={data} onResolve={setResolveTarget} onEscalate={setEscalateTarget} />}

      {/* Modals */}
      <ResolveModal incident={resolveTarget} loading={actionLoading}
        onConfirm={handleResolve} onClose={() => setResolveTarget(null)} />
      <EscalateModal incident={escalateTarget} loading={actionLoading}
        onConfirm={handleEscalate} onClose={() => setEscalateTarget(null)} />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: 11, color: T.txt4, marginTop: 32, paddingBottom: 20 }}>
        Program Health Dashboard | Data from LSM Tracker Google Sheet | {data === MOCK ? 'Using mock data (API offline)' : 'Live data'}
      </div>
    </div>
  );
}

window.ProgramHealth = ProgramHealth;
window.ResolveModal = ResolveModal;
window.EscalateModal = EscalateModal;

// mentor.jsx — Page 4: Mentor Tracking (password-protected)
// Mentor no-shows, repeat offender analysis, resolve/escalate
// @ts-nocheck

const { useState: useMT, useEffect: useMTE, useCallback: useMTCB } = React;

const MT = {
  bg: 'var(--bg)', card: 'var(--bg-1)', border: 'var(--border)', divider: 'var(--border)',
  txt1: 'var(--fg)', txt2: 'var(--fg)', txt3: 'var(--fg-2)', txt4: 'var(--fg-3)',
  accent: 'var(--indigo)', accentBg: 'var(--indigo-soft)',
  red: 'var(--red)', redBg: 'var(--red-soft)',
  amber: 'var(--amber)', amberBg: 'var(--amber-soft)',
  green: 'var(--green)', greenBg: 'var(--green-soft)',
  blue: 'var(--cyan)', blueBg: 'var(--cyan-soft)',
  thead: 'var(--bg-2)', radius: 10,
  font: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
};

const mtShortBatch = b => {
  if (!b) return '';
  return b.replace('Academy Apr26 ', 'Acad ').replace('DSML Apr26 ', 'DSML ').replace('AIML Apr26 ', 'AIML ')
    .replace('DevOps Apr26', 'DevOps').replace('Intermediate', 'Int').replace('Beginner', 'Beg')
    .replace('Morning', 'AM').replace('Refresher', 'Ref');
};
const mtShortEmail = e => e ? e.split('@')[0] : '';

const mtStatusStyle = s => {
  if (!s || s === 'Open') return { bg: MT.redBg, color: MT.red, label: 'Open' };
  if (s === 'Escalated') return { bg: MT.amberBg, color: MT.amber, label: 'Escalated' };
  if (s === 'In Progress') return { bg: MT.blueBg, color: MT.blue, label: 'In Progress' };
  if (s === 'Resolved') return { bg: MT.greenBg, color: MT.green, label: 'Resolved' };
  if (s === 'Closed') return { bg: MT.thead, color: MT.txt3, label: 'Closed' };
  return { bg: MT.thead, color: MT.txt3, label: s };
};

const MTCard = ({ children, title, subtitle, badge, accent, style = {} }) => (
  <div style={{ background: MT.card, border: `1px solid ${MT.border}`, borderRadius: MT.radius,
    borderTop: accent ? `3px solid ${accent}` : undefined, padding: '20px 24px', ...style }}>
    {(title || badge != null) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          {title && <div style={{ fontSize: 13, fontWeight: 700, color: MT.txt1, letterSpacing: -0.2 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 11, color: MT.txt3, marginTop: 2, fontStyle: 'italic' }}>{subtitle}</div>}
        </div>
        {badge != null && <span style={{ background: MT.redBg, color: MT.red, fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 10 }}>{badge}</span>}
      </div>
    )}
    {children}
  </div>
);

const MTBtn = ({ children, onClick, color = MT.accent, small, outline, disabled }) => (
  <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
    padding: small ? '4px 12px' : '8px 18px', borderRadius: 8, border: outline ? `1px solid ${color}` : 'none',
    background: outline ? 'transparent' : disabled ? MT.border : color, color: outline ? color : '#fff',
    fontSize: small ? 11 : 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: MT.font, opacity: disabled ? 0.5 : 1, transition: 'all 0.15s' }}>
    {children}
  </button>
);


/* ═══════════════════════════════════════════════
   MENTOR INCIDENT CARD
   ═══════════════════════════════════════════════ */
const MentorIncCard = ({ inc, onResolve, onEscalate }) => {
  const st = mtStatusStyle(inc.status);
  const isOpen = inc.status === 'Open' || !inc.status;
  const isActive = isOpen || inc.status === 'Escalated' || inc.status === 'In Progress';
  const isRecordOnly = inc.incident_type === 'Mentee No-show' || inc.incident_type === 'Mentee No-Show';

  return (
    <div style={{ background: MT.card, border: `1px solid ${isOpen && !isRecordOnly ? MT.red + '40' : MT.border}`,
      borderLeft: `4px solid ${isRecordOnly ? MT.txt4 : st.color}`, borderRadius: MT.radius, padding: '16px 20px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{inc.incident_type === 'Mentor No-show' ? '\u{1F464}' : '\u{1F393}'}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: MT.txt1 }}>{inc.incident_type}</span>
          {isRecordOnly
            ? <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: MT.thead, color: MT.txt3 }}>Record Only</span>
            : <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>}
        </div>
        <span style={{ fontSize: 11, color: MT.txt4 }}>{inc.date}</span>
      </div>
      <div style={{ fontSize: 12, color: MT.txt3, marginBottom: 6 }}>
        <strong>{mtShortBatch(inc.batch)}</strong> | Class {inc.class_num}
        {inc.instructor_name && <> | {inc.instructor_name}</>}
      </div>
      <div style={{ fontSize: 13, color: MT.txt2, marginBottom: 10, lineHeight: 1.5 }}>{inc.details}</div>
      {inc.resolution_notes && (
        <div style={{ background: MT.greenBg, borderRadius: 6, padding: '8px 12px', fontSize: 12, color: MT.green, marginBottom: 10 }}>
          <strong>Resolution:</strong> {inc.resolution_notes}
        </div>
      )}
      {inc.escalated_to && (
        <div style={{ background: MT.amberBg, borderRadius: 6, padding: '8px 12px', fontSize: 12, color: MT.amber, marginBottom: 10 }}>
          <strong>Escalated to:</strong> {inc.escalated_to} on {inc.escalation_date}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: MT.txt4 }}>Reported by {mtShortEmail(inc.reported_by)}</span>
        {isActive && !isRecordOnly && (
          <div style={{ display: 'flex', gap: 8 }}>
            {inc.status !== 'Escalated' && <MTBtn small outline color={MT.amber} onClick={() => onEscalate(inc)}>Escalate</MTBtn>}
            <MTBtn small color={MT.green} onClick={() => onResolve(inc)}>Resolve</MTBtn>
          </div>
        )}
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════════
   MENTOR PAGE
   ═══════════════════════════════════════════════ */
function MentorPage({ cohort }) {
  const [data, setData] = useMT(null);
  const [loading, setLoading] = useMT(true);
  const [resolveTarget, setResolveTarget] = useMT(null);
  const [escalateTarget, setEscalateTarget] = useMT(null);
  const [actionLoading, setActionLoading] = useMT(false);
  const [toast, setToast] = useMT(null);

  const loadData = useMTCB(async () => {
    setLoading(true);
    try {
      const API = window.API;
      if (API && API.getProgramHealth) {
        const result = await API.getProgramHealth(cohort);
        if (result) { setData(result); setLoading(false); return; }
      }
    } catch (e) { console.warn('[Mentor] API failed:', e.message); }
    setData(null);
    setLoading(false);
  }, [cohort]);

  useMTE(() => { loadData(); }, [loadData]);

  const handleResolve = async (incidentId, email, notes) => {
    setActionLoading(true);
    try {
      const API = window.API;
      if (API && API.resolveIncident) await API.resolveIncident(incidentId, email, notes);
      setResolveTarget(null);
      setToast({ message: 'Incident resolved! Sheet updated.', type: 'success' });
      await loadData();
    } catch (e) { setToast({ message: `Failed: ${e.message}`, type: 'error' }); }
    setActionLoading(false);
  };

  const handleEscalate = async (incidentId, email, escalateTo, reason) => {
    setActionLoading(true);
    try {
      const API = window.API;
      if (API && API.escalateIncident) await API.escalateIncident(incidentId, email, escalateTo, reason);
      setEscalateTarget(null);
      setToast({ message: 'Incident escalated! Sheet updated.', type: 'success' });
      await loadData();
    } catch (e) { setToast({ message: `Failed: ${e.message}`, type: 'error' }); }
    setActionLoading(false);
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400,
      color: MT.txt4, fontSize: 14, fontFamily: MT.font }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>{'\u{1F464}'}</div>
        Loading Mentor data...
      </div>
    </div>;
  }

  if (!data) {
    return <div style={{ textAlign: 'center', padding: 60, color: MT.txt4, fontFamily: MT.font }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{'\u26A0\uFE0F'}</div>
      Failed to load mentor data.
      <div style={{ marginTop: 12 }}><MTBtn onClick={loadData}>Retry</MTBtn></div>
    </div>;
  }

  const mentorTypes = ['Mentor No-show', 'Mentee No-show', 'Mentee No-Show'];
  const mentorInc = (data.incidents || []).filter(i => mentorTypes.includes(i.incident_type));
  const openInc = mentorInc.filter(i => ['Open', 'In Progress', 'Escalated', ''].includes(i.status) && i.incident_type === 'Mentor No-show');
  const closedInc = mentorInc.filter(i => ['Resolved', 'Closed'].includes(i.status));
  const menteeInc = mentorInc.filter(i => i.incident_type === 'Mentee No-show' || i.incident_type === 'Mentee No-Show');
  const mentorAnalysis = (data.overview && data.overview.mentor_analysis) || [];
  const repeatOffenders = mentorAnalysis.filter(m => m.is_repeat);
  const mentorCount = mentorInc.filter(i => i.incident_type === 'Mentor No-show').length;

  return (
    <div style={{ fontFamily: MT.font }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Mentor No-shows', value: mentorCount, color: mentorCount > 0 ? MT.red : MT.green },
          { label: 'Repeat Offenders', value: repeatOffenders.length, color: repeatOffenders.length > 0 ? MT.red : MT.green },
          { label: 'Unresolved', value: openInc.length, color: openInc.length > 0 ? MT.red : MT.green },
          { label: 'Resolved', value: closedInc.length, color: MT.green },
          { label: 'Mentee No-shows', value: menteeInc.length, color: MT.txt3, sub: 'Record only' },
        ].map(k => (
          <div key={k.label} style={{ background: MT.card, border: `1px solid ${MT.border}`, borderRadius: MT.radius,
            padding: '16px 20px', flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MT.txt4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color || MT.txt1, lineHeight: 1 }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 11, color: MT.txt4, marginTop: 4 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Repeat Offender Analysis */}
      <MTCard title="Mentor No-show Analysis" subtitle="Repeat offenders and AI-analyzed reasons"
        accent={repeatOffenders.length > 0 ? MT.red : undefined} style={{ marginBottom: 20 }}>
        {mentorAnalysis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: MT.txt4 }}>No mentor no-shows recorded</div>
        ) : (
          <div>
            {repeatOffenders.length > 0 && (
              <div style={{ background: MT.redBg, borderRadius: 8, padding: '12px 16px', marginBottom: 16, border: `1px solid ${MT.red}30` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: MT.red, marginBottom: 4 }}>
                  {'\u26A0\uFE0F'} {repeatOffenders.length} repeat offender{repeatOffenders.length > 1 ? 's' : ''} detected
                </div>
                <div style={{ fontSize: 11, color: MT.txt3 }}>Mentors with 2+ no-shows need immediate attention</div>
              </div>
            )}
            {mentorAnalysis.map((m, i) => (
              <div key={i} style={{ padding: '14px 0', borderBottom: i < mentorAnalysis.length - 1 ? `1px solid ${MT.divider}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: MT.txt1 }}>{m.name}</span>
                    {m.is_repeat && <span style={{ padding: '2px 8px', borderRadius: 10, background: MT.redBg, color: MT.red, fontSize: 10, fontWeight: 700 }}>REPEAT</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: m.total_noshows >= 2 ? MT.red : MT.amber, fontWeight: 700 }}>
                      {m.total_noshows} no-show{m.total_noshows > 1 ? 's' : ''}
                    </span>
                    {m.unresolved > 0 && <span style={{ padding: '2px 8px', borderRadius: 10, background: MT.amberBg, color: MT.amber, fontSize: 10, fontWeight: 700 }}>{m.unresolved} open</span>}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: MT.txt3, marginBottom: 6 }}>Batches: {m.batches.map(b => mtShortBatch(b)).join(', ')}</div>
                {m.reason_summary && m.reason_summary.length > 0 && (
                  <div style={{ background: MT.accentBg, border: `1px solid ${MT.border}`, borderRadius: 6, padding: '8px 12px', marginTop: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: MT.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Why (AI analysis)</div>
                    <ul style={{ margin: 0, paddingLeft: 16, color: MT.txt2, fontSize: 12, lineHeight: 1.6 }}>
                      {m.reason_summary.map((b, bi) => <li key={bi}>{b}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </MTCard>

      {/* Open Mentor Incidents */}
      {openInc.length > 0 && (
        <MTCard title="Unresolved Mentor Incidents" badge={openInc.length} accent={MT.red} style={{ marginBottom: 20 }}>
          {openInc.map(inc => <MentorIncCard key={inc.id} inc={inc} onResolve={setResolveTarget} onEscalate={setEscalateTarget} />)}
        </MTCard>
      )}

      {/* Mentee No-shows (record only) */}
      {menteeInc.length > 0 && (
        <MTCard title="Mentee No-shows" subtitle="Record only, no action needed" style={{ marginBottom: 20 }}>
          {menteeInc.map(inc => <MentorIncCard key={inc.id} inc={inc} onResolve={() => {}} onEscalate={() => {}} />)}
        </MTCard>
      )}

      {/* Resolved */}
      {closedInc.length > 0 && (
        <MTCard title="Resolved" style={{ marginBottom: 20 }}>
          {closedInc.map(inc => <MentorIncCard key={inc.id} inc={inc} onResolve={setResolveTarget} onEscalate={setEscalateTarget} />)}
        </MTCard>
      )}

      {mentorInc.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: MT.txt4, fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F389}'}</div>
          No mentor incidents logged
        </div>
      )}

      {/* Resolve Modal (reuse from program.jsx via window) */}
      {resolveTarget && typeof ResolveModal !== 'undefined' && (
        <ResolveModal incident={resolveTarget} loading={actionLoading}
          onConfirm={handleResolve} onClose={() => setResolveTarget(null)} />
      )}
      {escalateTarget && typeof EscalateModal !== 'undefined' && (
        <EscalateModal incident={escalateTarget} loading={actionLoading}
          onConfirm={handleEscalate} onClose={() => setEscalateTarget(null)} />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 10000,
          background: toast.type === 'success' ? MT.green : MT.red, color: '#fff',
          padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: MT.font,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          {toast.message}
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: '#fff',
            cursor: 'pointer', fontSize: 16, padding: '0 0 0 10px' }}>{'\u2715'}</button>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 11, color: MT.txt4, marginTop: 32, paddingBottom: 20 }}>
        Mentor Tracking | Data from Program Incidents sheet
      </div>
    </div>
  );
}

window.MentorPage = MentorPage;

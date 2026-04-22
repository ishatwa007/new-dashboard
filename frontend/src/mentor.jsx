// mentor.jsx — Page 4: Mentor Tracking
// Tabs: Overview | Mentor No Shows | Mentee No Shows
// @ts-nocheck

const { useState: useMT, useEffect: useMTE, useCallback: useMTCB, useMemo: useMTM } = React;

const MT = {
  bg: 'var(--bg)', card: 'var(--bg-1)', border: 'var(--border)',
  txt1: 'var(--fg)', txt2: 'var(--fg-2)', txt3: 'var(--fg-3)', txt4: 'var(--fg-4)',
  accent: 'var(--indigo)', accentBg: 'var(--indigo-soft)', accentBorder: 'var(--indigo-border)',
  red: 'var(--red)', redBg: 'var(--red-soft)',
  amber: 'var(--amber)', amberBg: 'var(--amber-soft)',
  green: 'var(--green)', greenBg: 'var(--green-soft)',
  thead: 'var(--bg-2)', radius: 10,
};

const mtShortEmail = e => e ? e.split('@')[0] : '';
const mtInitials = n => n ? n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() : '?';
const mtFmtDate = d => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', {day:'2-digit', month:'short'}); }
  catch { return d; }
};
const mtTypeLabel = t => {
  if (t === 'mentor_no_show') return { label: 'Mentor No Show', color: MT.red, bg: MT.redBg };
  if (t === 'mentee_no_show') return { label: 'Mentee No Show', color: MT.amber, bg: MT.amberBg };
  if (t === 'both_no_show')   return { label: 'Both No Show',   color: 'var(--fg)', bg: 'var(--bg-3)' };
  return { label: t, color: MT.txt3, bg: MT.thead };
};

/* ── Avatar ─────────────────────────────────────────────────────────── */
const MTAvatar = ({ name, size = 36, color }) => {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444'];
  const bg = color || colors[Math.abs((name||'').charCodeAt(0) - 65) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0,
      letterSpacing: '-0.5px' }}>
      {mtInitials(name)}
    </div>
  );
};

/* ── KPI Card ────────────────────────────────────────────────────────── */
const MTKpi = ({ label, value, tone, sub }) => {
  const color = tone === 'red' ? MT.red : tone === 'amber' ? MT.amber
    : tone === 'green' ? MT.green : MT.txt1;
  return (
    <div style={{ background: MT.card, border: `1px solid ${MT.border}`,
      borderRadius: MT.radius, padding: '16px 20px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: MT.txt4,
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: MT.txt4, marginTop: 4 }}>{sub}</div>}
    </div>
  );
};

/* ── Session pill ────────────────────────────────────────────────────── */
const MTSession = ({ s, showMentor }) => {
  const t = mtTypeLabel(s.type);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '8px 12px', background: MT.bg, border: `1px solid ${MT.border}`,
      borderLeft: `3px solid ${t.color}`, borderRadius: 7, marginBottom: 6 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: MT.txt1 }}>
            {s.agenda || 'Session'}
          </span>
          <span style={{ padding: '1px 7px', borderRadius: 8, fontSize: 10,
            fontWeight: 600, background: t.bg, color: t.color }}>{t.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: MT.txt3, flexWrap: 'wrap' }}>
          <span>{'\u{1F4C5}'} {mtFmtDate(s.date)} {s.time}</span>
          {showMentor && s.mentor_name && <span>Mentor: {s.mentor_name}</span>}
          {!showMentor && s.mentee_name && <span>Mentee: {s.mentee_name}</span>}
          {s.batch && <span style={{ color: MT.txt4 }}>{s.batch}</span>}
        </div>
      </div>
    </div>
  );
};

/* ── AI Summary box ─────────────────────────────────────────────────── */
const MTAISummary = ({ bullets, loading }) => {
  if (loading) return (
    <div style={{ padding: '8px 12px', background: MT.accentBg,
      border: `1px solid ${MT.accentBorder}`, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: MT.accent }}>Generating AI summary...</div>
    </div>
  );
  if (!bullets || bullets.length === 0) return null;
  return (
    <div style={{ padding: '10px 14px', background: MT.accentBg,
      border: `1px solid ${MT.accentBorder}`, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: MT.accent,
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {'\u{1F4A1}'} AI Pattern Summary
      </div>
      <ul style={{ margin: 0, paddingLeft: 16, color: MT.txt2, fontSize: 12, lineHeight: 1.7 }}>
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MENTOR PAGE
══════════════════════════════════════════════════════════════════ */
function MentorPage({ cohort }) {
  const [data, setData]     = useMT(null);
  const [loading, setLoading] = useMT(true);
  const [error, setError]   = useMT(null);
  const [tab, setTab]       = useMT('overview');
  const [search, setSearch] = useMT('');
  const [aiSummaries, setAiSummaries] = useMT({});
  const [aiLoading, setAiLoading]     = useMT({});
  const [expandedMentor, setExpandedMentor] = useMT(null);
  const [expandedMentee, setExpandedMentee] = useMT(null);

  const loadData = useMTCB(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.API.getMentorNoshows(cohort);
      setData(res);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cohort?.id]);

  useMTE(() => { loadData(); }, [loadData]);

  const q = search.toLowerCase().trim();

  const filteredMentors = useMTM(() =>
    (data?.mentor_list || []).filter(m =>
      !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    ), [data, q]);

  const filteredMentees = useMTM(() =>
    (data?.mentee_list || []).filter(m =>
      !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    ), [data, q]);

  const generateSummary = async (key, sessions) => {
    if (aiSummaries[key] || aiLoading[key]) return;
    const agendas = sessions.map(s => s.agenda).filter(Boolean);
    if (agendas.length === 0) return;
    setAiLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `These are sessions where a mentor/mentee repeatedly did not show up. List 3 concise bullet points (under 12 words each) identifying patterns or concerns:\n${agendas.map(a => `- ${a}`).join('\n')}`
          }]
        })
      });
      const json = await res.json();
      const text = (json.content || []).map(c => c.text || '').join('');
      const bullets = text.split('\n')
        .map(l => l.trim().replace(/^[-•*]\s*/, ''))
        .filter(l => l.length > 5)
        .slice(0, 3);
      setAiSummaries(prev => ({ ...prev, [key]: bullets }));
    } catch(e) {
      setAiSummaries(prev => ({ ...prev, [key]: [] }));
    } finally {
      setAiLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: MT.txt4 }}>
      Loading mentor data...
    </div>
  );

  if (error || !data) return (
    <div style={{ padding: 60, textAlign: 'center', color: MT.txt4 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      Failed to load. <button onClick={loadData}
        style={{ marginLeft: 8, padding: '6px 14px', borderRadius: 8, border: 'none',
          background: MT.accent, color: '#fff', cursor: 'pointer', fontSize: 12 }}>
        Retry
      </button>
    </div>
  );

  const TABS = [
    { id: 'overview', label: 'Overview',         icon: '\u{1F4CA}' },
    { id: 'mentors',  label: 'Mentor No Shows',  icon: '\u{1F534}', badge: data.mentor_noshows || null },
    { id: 'mentees',  label: 'Mentee No Shows',  icon: '\u{1F7E1}', badge: data.mentee_noshows || null },
  ];

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'var(--sans)' }}>

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search mentor or mentee..."
          style={{ flex: 1, maxWidth: 320, padding: '7px 12px', borderRadius: 8,
            border: `1px solid ${MT.border}`, background: MT.card, color: MT.txt1,
            fontSize: 13, outline: 'none' }} />
        <button onClick={loadData}
          style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${MT.border}`,
            background: MT.card, color: MT.txt2, cursor: 'pointer', fontSize: 12 }}>
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${MT.border}`,
        marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 16px', border: 'none', background: 'none',
              borderBottom: tab === t.id ? `2px solid ${MT.accent}` : '2px solid transparent',
              color: tab === t.id ? MT.accent : MT.txt3,
              fontWeight: tab === t.id ? 700 : 500, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
              marginBottom: -1 }}>
            <span>{t.icon}</span>
            {t.label}
            {t.badge > 0 && (
              <span style={{ padding: '1px 7px', borderRadius: 10, fontSize: 10,
                fontWeight: 700, background: MT.redBg, color: MT.red }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────── */}
      {tab === 'overview' && (
        <div>
          {/* KPI strip */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <MTKpi label="Total No Shows"      value={data.total}            tone="neutral" />
            <MTKpi label="Mentor No Shows"     value={data.mentor_noshows}   tone="red"
              sub={`${data.unique_mentors} unique mentors`} />
            <MTKpi label="Mentee No Shows"     value={data.mentee_noshows}   tone="amber"
              sub={`${data.unique_mentees} unique mentees`} />
            <MTKpi label="Both No Shows"       value={data.both_noshows}     tone="neutral" />
            <MTKpi label="Repeat Offenders"    value={data.repeat_offenders} tone={data.repeat_offenders > 0 ? 'red' : 'green'}
              sub="Mentors with 2+ no-shows" />
          </div>

          {/* Repeat offenders summary */}
          {(data.repeat_offender_list || []).length > 0 && (
            <div style={{ background: MT.card, border: `1px solid ${MT.border}`,
              borderTop: `3px solid ${MT.red}`, borderRadius: MT.radius,
              padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: MT.txt1, marginBottom: 4 }}>
                Repeat Offenders
              </div>
              <div style={{ fontSize: 11, color: MT.txt3, marginBottom: 16 }}>
                Mentors with 2 or more no-shows this cohort
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(data.repeat_offender_list || []).map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', background: MT.bg,
                    border: `1px solid ${MT.border}`, borderRadius: 8 }}>
                    <MTAvatar name={m.name} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: MT.txt1 }}>{m.name || mtShortEmail(m.email)}</div>
                      <div style={{ fontSize: 11, color: MT.txt4 }}>{m.email}</div>
                    </div>
                    <span style={{ padding: '3px 12px', borderRadius: 999,
                      background: MT.redBg, color: MT.red, fontSize: 12, fontWeight: 700 }}>
                      {m.no_show_count} no-shows
                    </span>
                    <button onClick={() => { setTab('mentors'); setSearch(m.name || m.email); }}
                      style={{ padding: '5px 12px', borderRadius: 7,
                        border: `1px solid ${MT.border}`, background: MT.card,
                        color: MT.accent, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type breakdown */}
          <div style={{ background: MT.card, border: `1px solid ${MT.border}`,
            borderRadius: MT.radius, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: MT.txt1, marginBottom: 16 }}>
              Breakdown by Type
            </div>
            {[
              { label: 'Mentor No Shows', count: data.mentor_noshows, color: MT.red },
              { label: 'Mentee No Shows', count: data.mentee_noshows, color: MT.amber },
              { label: 'Both No Shows',   count: data.both_noshows,   color: MT.txt3 },
            ].map((row, i) => {
              const pct = data.total > 0 ? Math.round(row.count / data.total * 100) : 0;
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: MT.txt2, fontWeight: 500 }}>{row.label}</span>
                    <span style={{ color: row.color, fontWeight: 700 }}>
                      {row.count} <span style={{ color: MT.txt4, fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: MT.border, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%',
                      background: row.color, borderRadius: 3,
                      transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mentor No Shows Tab ───────────────────────────── */}
      {tab === 'mentors' && (
        <div>
          {filteredMentors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: MT.txt4 }}>
              No mentor no-shows found
            </div>
          ) : filteredMentors.map((m, i) => {
            const isRepeat = m.no_show_count >= 2;
            const isOpen   = expandedMentor === m.email;
            const aiKey    = `mentor-${m.email}`;
            if (isOpen && isRepeat && !aiSummaries[aiKey] && !aiLoading[aiKey]) {
              generateSummary(aiKey, m.sessions);
            }
            return (
              <div key={i} style={{ background: MT.card,
                border: `1px solid ${isRepeat ? MT.red : MT.border}`,
                borderLeft: `4px solid ${isRepeat ? MT.red : MT.border}`,
                borderRadius: MT.radius, marginBottom: 12, overflow: 'hidden' }}>

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', cursor: 'pointer' }}
                  onClick={() => setExpandedMentor(isOpen ? null : m.email)}>
                  <MTAvatar name={m.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: MT.txt1 }}>
                        {m.name || mtShortEmail(m.email)}
                      </span>
                      {isRepeat && (
                        <span style={{ padding: '1px 8px', borderRadius: 8, fontSize: 10,
                          fontWeight: 700, background: MT.redBg, color: MT.red }}>
                          Repeat Offender
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: MT.txt4, marginTop: 2 }}>{m.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ padding: '4px 14px', borderRadius: 999,
                      background: isRepeat ? MT.redBg : MT.amberBg,
                      color: isRepeat ? MT.red : MT.amber,
                      fontSize: 13, fontWeight: 700 }}>
                      {m.no_show_count} no-show{m.no_show_count > 1 ? 's' : ''}
                    </span>
                    <span style={{ color: MT.txt4, fontSize: 16 }}>
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded sessions */}
                {isOpen && (
                  <div style={{ padding: '0 18px 16px', borderTop: `1px solid ${MT.border}`,
                    paddingTop: 14 }}>
                    <MTAISummary bullets={aiSummaries[aiKey]} loading={aiLoading[aiKey]} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: MT.txt4,
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Sessions Missed ({m.sessions.length})
                    </div>
                    {m.sessions.map((s, si) => (
                      <MTSession key={si} s={s} showMentor={false} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Mentee No Shows Tab ───────────────────────────── */}
      {tab === 'mentees' && (
        <div>
          {filteredMentees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: MT.txt4 }}>
              No mentee no-shows found
            </div>
          ) : filteredMentees.map((m, i) => {
            const isRepeat = m.no_show_count >= 2;
            const isOpen   = expandedMentee === m.email;
            const aiKey    = `mentee-${m.email}`;
            const batch    = m.sessions[0]?.batch || '';
            if (isOpen && isRepeat && !aiSummaries[aiKey] && !aiLoading[aiKey]) {
              generateSummary(aiKey, m.sessions);
            }
            return (
              <div key={i} style={{ background: MT.card,
                border: `1px solid ${isRepeat ? MT.amber : MT.border}`,
                borderLeft: `4px solid ${isRepeat ? MT.amber : MT.border}`,
                borderRadius: MT.radius, marginBottom: 12, overflow: 'hidden' }}>

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', cursor: 'pointer' }}
                  onClick={() => setExpandedMentee(isOpen ? null : m.email)}>
                  <MTAvatar name={m.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: MT.txt1 }}>
                        {m.name || mtShortEmail(m.email)}
                      </span>
                      {isRepeat && (
                        <span style={{ padding: '1px 8px', borderRadius: 8, fontSize: 10,
                          fontWeight: 700, background: MT.amberBg, color: MT.amber }}>
                          Repeated
                        </span>
                      )}
                      {batch && (
                        <span style={{ padding: '1px 8px', borderRadius: 8, fontSize: 10,
                          background: MT.accentBg, color: MT.accent }}>
                          {batch}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: MT.txt4, marginTop: 2 }}>{m.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ padding: '4px 14px', borderRadius: 999,
                      background: isRepeat ? MT.amberBg : MT.thead,
                      color: isRepeat ? MT.amber : MT.txt3,
                      fontSize: 13, fontWeight: 700 }}>
                      {m.no_show_count} missed
                    </span>
                    <span style={{ color: MT.txt4, fontSize: 16 }}>
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded sessions */}
                {isOpen && (
                  <div style={{ padding: '0 18px 16px', borderTop: `1px solid ${MT.border}`,
                    paddingTop: 14 }}>
                    <MTAISummary bullets={aiSummaries[aiKey]} loading={aiLoading[aiKey]} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: MT.txt4,
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Sessions Missed ({m.sessions.length})
                    </div>
                    {m.sessions.map((s, si) => (
                      <MTSession key={si} s={s} showMentor={true} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

window.MentorPage = MentorPage;

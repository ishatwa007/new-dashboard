// classroom.jsx — Page 4: Classroom
// Standalone page: Batch ratings, Low raters with persona/CTC/experience
// @ts-nocheck

const { useState: useCR, useEffect: useCRE, useCallback: useCRCB, useMemo: useCRM } = React;

/* Theme (reuse from program.jsx via window access) */
const CT = {
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

const crShortBatch = b => {
  if (!b) return '';
  return b.replace('Academy Apr26 ', 'Acad ').replace('DSML Apr26 ', 'DSML ').replace('AIML Apr26 ', 'AIML ')
    .replace('DevOps Apr26', 'DevOps').replace('Intermediate', 'Int').replace('Beginner', 'Beg')
    .replace('Morning', 'AM').replace('Refresher', 'Ref').replace('Python ', 'Py ').replace('Java ', 'J ');
};
const crShortEmail = e => e ? e.split('@')[0] : '';
const crSafe = (v, d = 1) => (v != null && !isNaN(v)) ? Number(v).toFixed(d) : '--';
const crShortPersona = p => {
  if (!p) return '';
  // Trim long persona strings like "Backend/Backend Heavy Full-stack (Develops...)"
  const paren = p.indexOf('(');
  return paren > 10 ? p.substring(0, paren).trim() : (p.length > 40 ? p.substring(0, 38) + '...' : p);
};

/* Shared micro-components */
const CRCard = ({ children, title, subtitle, badge, accent, style = {} }) => (
  <div style={{ background: CT.card, border: `1px solid ${CT.border}`, borderRadius: CT.radius,
    borderTop: accent ? `3px solid ${accent}` : undefined, padding: '20px 24px', ...style }}>
    {(title || badge != null) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          {title && <div style={{ fontSize: 13, fontWeight: 700, color: CT.txt1, letterSpacing: -0.2 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 11, color: CT.txt3, marginTop: 2, fontStyle: 'italic' }}>{subtitle}</div>}
        </div>
        {badge != null && <span style={{ background: CT.redBg, color: CT.red, fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 10 }}>{badge}</span>}
      </div>
    )}
    {children}
  </div>
);

const CRTh = ({ children, width, align = 'left' }) => (
  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: 0.5, color: CT.txt4, textAlign: align, borderBottom: `1.5px solid ${CT.border}`,
    background: CT.thead, width, whiteSpace: 'nowrap' }}>{children}</th>
);

const CRTd = ({ children, align = 'left', bold, color, nowrap }) => (
  <td style={{ padding: '10px 12px', fontSize: 13, color: color || CT.txt2, fontWeight: bold ? 600 : 400,
    textAlign: align, borderBottom: `1px solid ${CT.divider}`, whiteSpace: nowrap ? 'nowrap' : 'normal',
    maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</td>
);

const CRFlag = ({ flag }) => {
  const s = flag === 'LOW' ? { bg: CT.redBg, color: CT.red }
    : flag === 'WATCH' ? { bg: CT.amberBg, color: CT.amber }
    : { bg: CT.greenBg, color: CT.green };
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10,
    fontWeight: 700, background: s.bg, color: s.color }}>{flag}</span>;
};


/* ═══════════════════════════════════════════════
   CLASSROOM PAGE
   ═══════════════════════════════════════════════ */

function ClassroomPage({ cohort }) {
  const [data, setData] = useCR(null);
  const [loading, setLoading] = useCR(true);
  const [search, setSearch] = useCR('');
  const [batchFilter, setBatchFilter] = useCR('all');
  const [tab, setTab] = useCR('overview');

  const loadData = useCRCB(async () => {
    setLoading(true);
    try {
      const API = window.API;
      if (API && API.getProgramHealth) {
        const result = await API.getProgramHealth(cohort);
        if (result) { setData(result); setLoading(false); return; }
      }
    } catch (e) {
      console.warn('[Classroom] API failed:', e.message);
    }
    setData(null);
    setLoading(false);
  }, [cohort]);

  useCRE(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400,
        color: CT.txt4, fontSize: 14, fontFamily: CT.font }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>{'\u{1F3EB}'}</div>
          Loading Classroom data...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: CT.txt4, fontFamily: CT.font }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>{'\u26A0\uFE0F'}</div>
        Failed to load classroom data. Check backend.
        <div style={{ marginTop: 12 }}>
          <button onClick={loadData} style={{ padding: '8px 18px', borderRadius: 8, border: 'none',
            background: CT.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: CT.font }}>Retry</button>
        </div>
      </div>
    );
  }

  const classRatings = data.class_ratings || [];
  const lowRaters = data.low_raters || [];
  const lowRatersByBatch = data.low_raters_by_batch || [];
  const instructorMap = data.instructor_map || {};

  // Extract unique batches for filter
  const allBatches = [...new Set(classRatings.map(cr => cr.batch))].sort();

  const q = search.toLowerCase().trim();
  const filteredRatings = classRatings.filter(cr => {
    if (batchFilter !== 'all' && cr.batch !== batchFilter) return false;
    if (!q) return true;
    return (cr.instructor || '').toLowerCase().includes(q) || (cr.batch || '').toLowerCase().includes(q);
  });

  const filteredLow = lowRaters.filter(lr => {
    if (batchFilter !== 'all' && lr.batch !== batchFilter) return false;
    if (!q) return true;
    return (lr.batch || '').toLowerCase().includes(q) || (lr.email || '').toLowerCase().includes(q)
      || (lr.persona || '').toLowerCase().includes(q);
  });

  const filteredGroups = lowRatersByBatch.filter(g => {
    if (batchFilter !== 'all' && g.batch !== batchFilter) return false;
    if (!q) return true;
    return (g.batch || '').toLowerCase().includes(q)
      || (instructorMap[g.batch] || '').toLowerCase().includes(q);
  });

  // Stats
  const totalLowCount = lowRaters.length;
  const watchBatches = classRatings.filter(cr =>
    Object.values(cr.classes).some(c => c.flag === 'WATCH' || c.flag === 'LOW')
  ).length;

  const TABS = [
    { id: 'overview', label: 'Overview', icon: '\u{1F4CA}' },
    { id: 'ratings', label: 'Batch Ratings', icon: '\u2B50' },
    { id: 'lowraters', label: 'Low Raters', icon: '\u{1F534}', badge: totalLowCount > 0 ? totalLowCount : null },
  ];

  return (
    <div style={{ fontFamily: CT.font }}>
      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ background: CT.card, border: `1px solid ${CT.border}`, borderRadius: CT.radius,
          padding: '16px 20px', flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: CT.txt4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Batches</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: CT.txt1, lineHeight: 1 }}>{classRatings.length}</div>
        </div>
        <div style={{ background: CT.card, border: `1px solid ${CT.border}`, borderRadius: CT.radius,
          padding: '16px 20px', flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: CT.txt4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Watch / Low</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: watchBatches > 0 ? CT.amber : CT.green, lineHeight: 1 }}>{watchBatches}</div>
          <div style={{ fontSize: 11, color: CT.txt4, marginTop: 4 }}>batches needing attention</div>
        </div>
        <div style={{ background: CT.card, border: `1px solid ${CT.border}`, borderRadius: CT.radius,
          padding: '16px 20px', flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: CT.txt4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Low Raters</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: totalLowCount > 0 ? CT.red : CT.green, lineHeight: 1 }}>{totalLowCount}</div>
          <div style={{ fontSize: 11, color: CT.txt4, marginTop: 4 }}>learners rated 3 or below</div>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search by instructor, batch, email, persona..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 280, padding: '10px 16px', borderRadius: 10,
            border: `1px solid ${CT.border}`, fontSize: 13, fontFamily: CT.font, outline: 'none',
            boxSizing: 'border-box', background: CT.card, color: CT.txt1 }} />
        <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${CT.border}`,
            fontSize: 12, fontFamily: CT.font, background: CT.card, color: CT.txt1, cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Batches</option>
          {allBatches.map(b => <option key={b} value={b}>{crShortBatch(b)}</option>)}
        </select>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `2px solid ${CT.border}`, paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 600, fontFamily: CT.font, cursor: 'pointer',
            border: 'none', borderBottom: `3px solid ${tab === t.id ? CT.accent : 'transparent'}`,
            background: 'transparent', color: tab === t.id ? CT.accent : CT.txt3,
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', marginBottom: -2 }}>
            <span style={{ fontSize: 15 }}>{t.icon}</span>
            {t.label}
            {t.badge > 0 && (
              <span style={{ background: CT.red, color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 10, minWidth: 16, textAlign: 'center' }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div>
          {/* Batch Health Table */}
          <CRCard title="Batch Health Overview" subtitle={`${classRatings.length} batches tracked`} style={{ marginBottom: 20 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <CRTh>Batch</CRTh><CRTh>Instructor</CRTh>
                  <CRTh align="center">C1</CRTh><CRTh align="center">C2</CRTh><CRTh align="center">C3</CRTh>
                  <CRTh align="center">C4</CRTh><CRTh align="center">C5</CRTh><CRTh align="center">C6</CRTh>
                  <CRTh align="center">Low</CRTh><CRTh align="center">Flag</CRTh>
                </tr></thead>
                <tbody>
                  {classRatings.map((cr, i) => {
                    const crTotalLow = Object.values(cr.classes).reduce((s, c) => s + (c.low_count || 0), 0);
                    const worstFlag = Object.values(cr.classes).some(c => c.flag === 'LOW') ? 'LOW'
                      : Object.values(cr.classes).some(c => c.flag === 'WATCH') ? 'WATCH' : 'OK';
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-1)' : 'var(--bg-2)' }}>
                        <CRTd bold nowrap>{crShortBatch(cr.batch)}</CRTd>
                        <CRTd nowrap>{cr.instructor || <span style={{ color: CT.txt4, fontStyle: 'italic' }}>Not assigned</span>}</CRTd>
                        {[1,2,3,4,5,6].map(cn => {
                          const c = cr.classes[String(cn)];
                          if (!c || !c.avg_rating || c.avg_rating === 0) return <CRTd key={cn} align="center"><span style={{ color: CT.txt4 }}>--</span></CRTd>;
                          const rColor = c.avg_rating < 4 ? CT.red : c.avg_rating < 4.5 ? CT.amber : CT.txt2;
                          return <CRTd key={cn} align="center" color={rColor} bold={c.avg_rating < 4}>
                            {crSafe(c.avg_rating, 2)}
                          </CRTd>;
                        })}
                        <CRTd align="center" color={crTotalLow > 0 ? CT.red : CT.txt4} bold={crTotalLow > 0}>{crTotalLow}</CRTd>
                        <CRTd align="center"><CRFlag flag={worstFlag} /></CRTd>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {classRatings.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: CT.txt4, fontSize: 13 }}>
                No class data available yet
              </div>
            )}
          </CRCard>

          {/* Quick low rater summary by batch */}
          {lowRaters.length > 0 && (
            <CRCard title="Low Rater Summary" subtitle="Batches with learners who rated 3 or below" accent={CT.red} style={{ marginBottom: 20 }}>
              {(() => {
                const batchCounts = {};
                lowRaters.forEach(lr => {
                  if (!batchCounts[lr.batch]) batchCounts[lr.batch] = 0;
                  batchCounts[lr.batch]++;
                });
                const sorted = Object.entries(batchCounts).sort((a,b) => b[1] - a[1]);
                return sorted.map(([batch, count], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: i < sorted.length - 1 ? `1px solid ${CT.divider}` : 'none' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: CT.txt1 }}>{crShortBatch(batch)}</span>
                      {instructorMap[batch] && (
                        <span style={{ fontSize: 11, color: CT.txt3, marginLeft: 8 }}>{instructorMap[batch]}</span>
                      )}
                    </div>
                    <span style={{ padding: '2px 10px', borderRadius: 999, background: CT.redBg, color: CT.red,
                      fontSize: 11, fontWeight: 700 }}>
                      {count} low rater{count > 1 ? 's' : ''}
                    </span>
                  </div>
                ));
              })()}
            </CRCard>
          )}
        </div>
      )}

      {/* Batch Ratings Tab */}
      {tab === 'ratings' && (
        <CRCard title="Class Ratings by Batch" subtitle={`${filteredRatings.length} batches`} style={{ marginBottom: 20 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <CRTh>Batch</CRTh><CRTh>Instructor</CRTh>
                {[1,2,3,4,5,6].map(cn => <CRTh key={cn} align="center">Class {cn}<br/>
                  <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>Rating / Att%</span>
                </CRTh>)}
                <CRTh align="center">Low</CRTh><CRTh align="center">Flag</CRTh>
              </tr></thead>
              <tbody>
                {filteredRatings.map((cr, i) => {
                  const totalLow = Object.values(cr.classes).reduce((s, c) => s + (c.low_count || 0), 0);
                  const worstFlag = Object.values(cr.classes).some(c => c.flag === 'LOW') ? 'LOW'
                    : Object.values(cr.classes).some(c => c.flag === 'WATCH') ? 'WATCH' : 'OK';
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-1)' : 'var(--bg-2)' }}>
                      <CRTd bold nowrap>{crShortBatch(cr.batch)}</CRTd>
                      <CRTd nowrap>{cr.instructor || <span style={{ color: CT.txt4, fontStyle: 'italic' }}>--</span>}</CRTd>
                      {[1,2,3,4,5,6].map(cn => {
                        const c = cr.classes[String(cn)];
                        if (!c || !c.avg_rating || c.avg_rating === 0) return <CRTd key={cn} align="center"><span style={{ color: CT.txt4 }}>--</span></CRTd>;
                        const rColor = c.avg_rating < 4 ? CT.red : c.avg_rating < 4.5 ? CT.amber : CT.green;
                        return <CRTd key={cn} align="center">
                          <span style={{ color: rColor, fontWeight: 700 }}>{crSafe(c.avg_rating, 2)}</span>
                          <br/>
                          <span style={{ fontSize: 10, color: CT.txt4 }}>
                            {c.avg_live_att ? `${crSafe(c.avg_live_att, 0)}%` : ''} | {c.total_rated}r
                            {c.low_count > 0 && <span style={{ color: CT.red }}> | {c.low_count} low</span>}
                          </span>
                        </CRTd>;
                      })}
                      <CRTd align="center" color={totalLow > 0 ? CT.red : CT.txt4} bold={totalLow > 0}>{totalLow}</CRTd>
                      <CRTd align="center"><CRFlag flag={worstFlag} /></CRTd>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredRatings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: CT.txt4, fontSize: 13 }}>
              No matching batches found
            </div>
          )}
        </CRCard>
      )}

      {/* Low Raters Tab */}
      {tab === 'lowraters' && (
        <div>
          {/* Grouped by batch+class with AI summary */}
          <CRCard title="Low Raters by Batch & Class" badge={filteredLow.length > 0 ? filteredLow.length : null}
            subtitle="AI-summarized themes per batch/class, with learner persona"
            accent={filteredLow.length > 0 ? CT.red : undefined} style={{ marginBottom: 20 }}>
            {(() => {
              let groups = filteredGroups;

              if (groups.length === 0 && filteredLow.length > 0) {
                const map = {};
                filteredLow.forEach(lr => {
                  const key = `${lr.batch}||${lr.class_num}`;
                  if (!map[key]) map[key] = { batch: lr.batch, class_num: lr.class_num, count: 0, learners: [], summary_bullets: [], avg_rating: null, notes: [] };
                  map[key].count += 1;
                  map[key].learners.push({ email: lr.email, psa: lr.psa, rating: lr.rating, notes: lr.lsm_notes,
                    persona: lr.persona, ctc: lr.ctc, experience: lr.experience });
                  if (lr.lsm_notes) map[key].notes.push(lr.lsm_notes);
                });
                groups = Object.values(map).sort((a,b) => b.count - a.count);
              }

              if (groups.length === 0) return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: CT.txt4, fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F389}'}</div>
                  No low ratings found
                </div>
              );

              return groups.map((g, i) => (
                <div key={i} style={{ padding: '14px 0', borderBottom: i < groups.length - 1 ? `1px solid ${CT.divider}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: CT.txt1 }}>
                        {crShortBatch(g.batch)} <span style={{ color: CT.txt3, fontWeight: 500 }}>| Class {g.class_num}</span>
                      </div>
                      {instructorMap[g.batch] && (
                        <div style={{ fontSize: 11, color: CT.txt3, marginTop: 2 }}>
                          Instructor: {instructorMap[g.batch]}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {g.avg_rating != null && (
                        <span style={{ fontSize: 11, color: CT.txt3 }}>
                          avg <span style={{ color: CT.red, fontWeight: 700 }}>{g.avg_rating.toFixed(2)}</span>
                        </span>
                      )}
                      <span style={{ padding: '2px 10px', borderRadius: 999, background: CT.redBg, color: CT.red, fontSize: 11, fontWeight: 700 }}>
                        {g.count} low {g.count === 1 ? 'rater' : 'raters'}
                      </span>
                    </div>
                  </div>

                  {/* AI summary bullets */}
                  {g.summary_bullets && g.summary_bullets.length > 0 && (
                    <div style={{ background: CT.accentBg, border: `1px solid ${CT.border}`, borderRadius: 6, padding: '10px 14px', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: CT.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Key themes
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, color: CT.txt1, fontSize: 12.5, lineHeight: 1.6 }}>
                        {g.summary_bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Individual learners with persona */}
                  <details>
                    <summary style={{ cursor: 'pointer', fontSize: 11, color: CT.txt3, padding: '4px 0', userSelect: 'none' }}>
                      Show {g.learners.length} learner{g.learners.length === 1 ? '' : 's'} with persona details
                    </summary>
                    <div style={{ marginTop: 8, overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>
                          <CRTh>Email</CRTh>
                          <CRTh align="center">Rating</CRTh>
                          <CRTh>Persona</CRTh>
                          <CRTh>CTC</CRTh>
                          <CRTh>Experience</CRTh>
                          <CRTh>LSM Notes</CRTh>
                          <CRTh>PSA</CRTh>
                        </tr></thead>
                        <tbody>
                          {g.learners.map((lr, li) => (
                            <tr key={li} style={{ background: li % 2 === 0 ? 'var(--bg-1)' : 'var(--bg-2)' }}>
                              <CRTd nowrap>{lr.email}</CRTd>
                              <CRTd align="center" bold color={lr.rating <= 2 ? CT.red : CT.amber}>{lr.rating}</CRTd>
                              <CRTd nowrap>
                                {lr.persona
                                  ? <span title={lr.persona} style={{ fontSize: 12 }}>{crShortPersona(lr.persona)}</span>
                                  : <span style={{ color: CT.txt4, fontStyle: 'italic' }}>--</span>}
                              </CRTd>
                              <CRTd nowrap>
                                {lr.ctc || <span style={{ color: CT.txt4 }}>--</span>}
                              </CRTd>
                              <CRTd nowrap>
                                {lr.experience ? (typeof lr.experience === 'number' ? `${lr.experience} yrs` : lr.experience) : <span style={{ color: CT.txt4 }}>--</span>}
                              </CRTd>
                              <CRTd>{lr.notes || <span style={{ color: CT.txt4, fontStyle: 'italic' }}>No notes</span>}</CRTd>
                              <CRTd nowrap>{crShortEmail(lr.psa)}</CRTd>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              ));
            })()}
          </CRCard>

          {/* Flat view: all low raters with persona in one table */}
          <CRCard title="All Low Raters (flat view)" subtitle="Every learner who rated 3 or below, with persona profile"
            style={{ marginBottom: 20 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <CRTh>Email</CRTh>
                  <CRTh>Batch</CRTh>
                  <CRTh align="center">Class</CRTh>
                  <CRTh align="center">Rating</CRTh>
                  <CRTh>Persona</CRTh>
                  <CRTh>CTC</CRTh>
                  <CRTh>Exp</CRTh>
                  <CRTh>Sale</CRTh>
                  <CRTh>LSM Notes</CRTh>
                  <CRTh>PSA</CRTh>
                </tr></thead>
                <tbody>
                  {filteredLow.map((lr, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-1)' : 'var(--bg-2)' }}>
                      <CRTd nowrap>{lr.email}</CRTd>
                      <CRTd nowrap>{crShortBatch(lr.batch)}</CRTd>
                      <CRTd align="center">{lr.class_num}</CRTd>
                      <CRTd align="center" bold color={lr.rating <= 2 ? CT.red : CT.amber}>{lr.rating}</CRTd>
                      <CRTd nowrap>
                        {lr.persona
                          ? <span title={lr.persona} style={{ fontSize: 12 }}>{crShortPersona(lr.persona)}</span>
                          : <span style={{ color: CT.txt4, fontStyle: 'italic' }}>--</span>}
                      </CRTd>
                      <CRTd nowrap>{lr.ctc || <span style={{ color: CT.txt4 }}>--</span>}</CRTd>
                      <CRTd nowrap>{lr.experience ? (typeof lr.experience === 'number' ? `${lr.experience}y` : lr.experience) : <span style={{ color: CT.txt4 }}>--</span>}</CRTd>
                      <CRTd nowrap>{lr.sale_status || <span style={{ color: CT.txt4 }}>--</span>}</CRTd>
                      <CRTd>{lr.lsm_notes || <span style={{ color: CT.txt4, fontStyle: 'italic' }}>--</span>}</CRTd>
                      <CRTd nowrap>{crShortEmail(lr.psa)}</CRTd>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLow.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: CT.txt4, fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F389}'}</div>
                No low ratings found
              </div>
            )}
          </CRCard>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: 11, color: CT.txt4, marginTop: 32, paddingBottom: 20 }}>
        Classroom Dashboard | Data from Class Tracker + Funnel | Persona from Refunds Funnel
      </div>
    </div>
  );
}

window.ClassroomPage = ClassroomPage;

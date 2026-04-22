// classroom.jsx — Page 4: Classroom
// Standalone page: Batch ratings, Low raters with persona/CTC/experience
// @ts-nocheck

const { useState: useCR, useEffect: useCRE, useCallback: useCRCB, useMemo: useCRM, useRef: useCRRef } = React;

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
  const [selLowClass, setSelLowClass] = useCR(1);   // selected class in Low Raters tab
  const [selMissedClass, setSelMissedClass] = useCR(1); // selected class in Missed tab

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
  const classMissed = data.class_missed || [];

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

  const filteredMissed = classMissed.filter(m => {
    if (batchFilter !== 'all' && m.batch !== batchFilter) return false;
    if (!q) return true;
    return (m.batch || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
  });

  // Stats
  const totalLowCount = lowRaters.length;
  const totalMissedCount = classMissed.length;
  const watchBatches = classRatings.filter(cr =>
    Object.values(cr.classes).some(c => c.flag === 'WATCH' || c.flag === 'LOW')
  ).length;

  const TABS = [
    { id: 'overview',   label: 'Overview',     icon: '\u{1F4CA}' },
    { id: 'ratings',    label: 'Batch Ratings', icon: '\u2B50' },
    { id: 'lowraters',  label: 'Low Raters',    icon: '\u{1F534}', badge: totalLowCount > 0 ? totalLowCount : null },
    { id: 'missed',     label: 'Class Missed',  icon: '\u{1F6AB}', badge: totalMissedCount > 0 ? totalMissedCount : null },
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
          {filteredLow.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: CT.txt4, fontSize: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{'\u{1F389}'}</div>
              No low ratings found
            </div>
          ) : (() => {
            const classNums = [1,2,3,4,5,6];

            // Build per-class data
            const byClass = {};
            classNums.forEach(cn => { byClass[cn] = { count: 0, r1: 0, r2: 0, r3: 0, batches: new Set(), learners: [] }; });
            filteredLow.forEach(lr => {
              const cn = Number(lr.class_num);
              if (!byClass[cn]) return;
              byClass[cn].count++;
              byClass[cn].batches.add(lr.batch);
              byClass[cn].learners.push(lr);
              if (lr.rating <= 1) byClass[cn].r1++;
              else if (lr.rating <= 2) byClass[cn].r2++;
              else byClass[cn].r3++;
            });

            const activeCns = classNums.filter(cn => byClass[cn].count > 0);
            const maxCount = Math.max(...activeCns.map(cn => byClass[cn].count), 1);

            // Per-batch grouping
            const batchMap = {};
            filteredLow.forEach(lr => {
              if (!batchMap[lr.batch]) batchMap[lr.batch] = { batch: lr.batch, total: 0, byClass: {} };
              const cn = Number(lr.class_num);
              if (!batchMap[lr.batch].byClass[cn]) batchMap[lr.batch].byClass[cn] = [];
              batchMap[lr.batch].byClass[cn].push(lr);
              batchMap[lr.batch].total++;
            });
            const batchList = Object.values(batchMap).sort((a,b) => b.total - a.total);

            const groupMap = {};
            (filteredGroups.length > 0 ? filteredGroups : []).forEach(g => {
              groupMap[`${g.batch}||${g.class_num}`] = g;
            });

            const selClass = selLowClass; const setSelClass = setSelLowClass;

            const selectedLearners = (byClass[selClass] && byClass[selClass].learners) || [];
            const byBatchForClass = {};
            selectedLearners.forEach(lr => {
              if (!byBatchForClass[lr.batch]) byBatchForClass[lr.batch] = [];
              byBatchForClass[lr.batch].push(lr);
            });
            const batchesForClass = Object.entries(byBatchForClass).sort((a,b) => b[1].length - a[1].length);

            return (
              <>
                {/* ── Class selector + stat strip ─────────────── */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  {activeCns.map(cn => {
                    const d = byClass[cn];
                    const isActive = selClass === cn;
                    const barW = Math.round((d.count / maxCount) * 100);
                    return (
                      <div key={cn} onClick={() => setSelClass(cn)}
                        style={{ flex: 1, minWidth: 100, background: isActive ? CT.redBg : CT.card,
                          border: `2px solid ${isActive ? CT.red : CT.border}`,
                          borderRadius: CT.radius, padding: '14px 16px', cursor: 'pointer',
                          transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}>
                        {/* Background bar fill */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${barW}%`, height: 3,
                          background: CT.red, opacity: 0.5, borderRadius: '0 0 0 0' }} />
                        <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? CT.red : CT.txt4,
                          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                          Class {cn}
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700,
                          color: isActive ? CT.red : d.count >= 3 ? CT.amber : CT.txt2, lineHeight: 1 }}>
                          {d.count}
                        </div>
                        <div style={{ fontSize: 10, color: CT.txt4, marginTop: 4 }}>
                          {d.batches.size} batch{d.batches.size > 1 ? 'es' : ''}
                        </div>
                        {/* Rating breakdown dots */}
                        <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
                          {d.r1 > 0 && Array(d.r1).fill(0).map((_,i) => (
                            <div key={`r1${i}`} style={{ width: 7, height: 7, borderRadius: '50%', background: '#991b1b' }} title="Rating 1" />
                          ))}
                          {d.r2 > 0 && Array(d.r2).fill(0).map((_,i) => (
                            <div key={`r2${i}`} style={{ width: 7, height: 7, borderRadius: '50%', background: CT.red }} title="Rating 2" />
                          ))}
                          {d.r3 > 0 && Array(d.r3).fill(0).map((_,i) => (
                            <div key={`r3${i}`} style={{ width: 7, height: 7, borderRadius: '50%', background: CT.amber }} title="Rating 3" />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Selected class breakdown ────────────────── */}
                <CRCard
                  title={`Class ${selClass} — Low Raters`}
                  subtitle={`${selectedLearners.length} learner${selectedLearners.length !== 1 ? 's' : ''} across ${batchesForClass.length} batch${batchesForClass.length !== 1 ? 'es' : ''}`}
                  badge={selectedLearners.length}
                  accent={CT.red}
                  style={{ marginBottom: 20 }}>

                  {batchesForClass.map(([batch, lrs], bi) => {
                    const group = groupMap[`${batch}||${selClass}`];
                    const avgR = lrs.length > 0 ? (lrs.reduce((s,l) => s+(l.rating||0),0)/lrs.length).toFixed(1) : null;

                    return (
                      <div key={bi} style={{ borderBottom: bi < batchesForClass.length-1 ? `1px solid ${CT.divider}` : 'none',
                        padding: '16px 0' }}>

                        {/* Batch header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: CT.txt1 }}>
                              {crShortBatch(batch)}
                            </span>
                            {instructorMap[batch] && (
                              <span style={{ fontSize: 11, color: CT.txt4, marginLeft: 8 }}>
                                {instructorMap[batch]}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {avgR && (
                              <span style={{ fontSize: 11, color: CT.txt3 }}>
                                avg <span style={{ fontWeight: 700, color: CT.red }}>{avgR}</span>
                              </span>
                            )}
                            <span style={{ padding: '3px 12px', borderRadius: 999,
                              background: CT.redBg, color: CT.red, fontSize: 11, fontWeight: 700 }}>
                              {lrs.length} low rater{lrs.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* AI themes */}
                        {group && group.summary_bullets && group.summary_bullets.length > 0 && (
                          <div style={{ background: CT.accentBg, border: `1px solid ${CT.border}`,
                            borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: CT.accent,
                              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                              {'\u{1F4A1}'} Key themes from LSM notes
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 18, color: CT.txt2, fontSize: 12, lineHeight: 1.7 }}>
                              {group.summary_bullets.map((b, bii) => <li key={bii}>{b}</li>)}
                            </ul>
                          </div>
                        )}

                        {/* Learner cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {lrs.sort((a,b) => a.rating - b.rating).map((lr, li) => (
                            <div key={li} style={{ display: 'flex', alignItems: 'flex-start', gap: 12,
                              background: CT.bg, border: `1px solid ${CT.border}`,
                              borderLeft: `3px solid ${lr.rating <= 1 ? '#991b1b' : lr.rating <= 2 ? CT.red : CT.amber}`,
                              borderRadius: 8, padding: '10px 14px' }}>

                              {/* Rating bubble */}
                              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14, fontWeight: 700,
                                background: lr.rating <= 1 ? '#991b1b' : lr.rating <= 2 ? CT.redBg : CT.amberBg,
                                color: lr.rating <= 1 ? '#fff' : lr.rating <= 2 ? CT.red : CT.amber }}>
                                {lr.rating}
                              </div>

                              {/* Main info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: CT.txt1 }}>{lr.email}</span>
                                  {lr.persona && (
                                    <span style={{ padding: '1px 8px', borderRadius: 10, background: CT.accentBg,
                                      color: CT.accent, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                                      {crShortPersona(lr.persona)}
                                    </span>
                                  )}
                                  {lr.ctc && (
                                    <span style={{ padding: '1px 8px', borderRadius: 10, background: CT.thead,
                                      color: CT.txt3, fontSize: 10, fontWeight: 500, flexShrink: 0 }}>
                                      {lr.ctc}
                                    </span>
                                  )}
                                  <span style={{ fontSize: 10, color: CT.txt4, marginLeft: 'auto', flexShrink: 0 }}>
                                    PSA: {crShortEmail(lr.psa)}
                                  </span>
                                </div>
                                {lr.lsm_notes && (
                                  <div style={{ fontSize: 11, color: CT.txt3, lineHeight: 1.5,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={lr.lsm_notes}>
                                    {'\u{1F4AC}'} {lr.lsm_notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CRCard>

                {/* ── Heatmap (all classes × all batches) ────── */}
                <CRCard title="Full Heatmap" subtitle="All classes × all batches — click a class card above to drill in"
                  style={{ marginBottom: 20 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: CT.txt4,
                            textAlign: 'left', borderBottom: `1.5px solid ${CT.border}`, background: CT.thead,
                            textTransform: 'uppercase', letterSpacing: 0.5 }}>Batch</th>
                          {activeCns.map(cn => (
                            <th key={cn} onClick={() => setSelClass(cn)}
                              style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600,
                                color: selClass === cn ? CT.red : CT.txt4,
                                textAlign: 'center', borderBottom: `1.5px solid ${CT.border}`,
                                background: selClass === cn ? CT.redBg : CT.thead,
                                textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 58,
                                cursor: 'pointer', transition: 'all 0.15s' }}>
                              C{cn}
                            </th>
                          ))}
                          <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: CT.txt4,
                            textAlign: 'center', borderBottom: `1.5px solid ${CT.border}`,
                            background: CT.thead, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchList.map((b, bi) => (
                          <tr key={bi} style={{ borderBottom: `1px solid ${CT.divider}` }}>
                            <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: CT.txt1,
                              whiteSpace: 'nowrap', background: bi%2===0?'var(--bg-1)':'var(--bg-2)' }}>
                              {crShortBatch(b.batch)}
                              {instructorMap[b.batch] && (
                                <div style={{ fontSize: 10, color: CT.txt4, fontWeight: 400 }}>{instructorMap[b.batch]}</div>
                              )}
                            </td>
                            {activeCns.map(cn => {
                              const lrs = b.byClass[cn] || [];
                              const count = lrs.length;
                              const intensity = count === 0 ? 0 : Math.max(0.15, Math.min(1, count / maxCount));
                              const isSelected = selClass === cn;
                              const bg = count === 0
                                ? (bi%2===0?'var(--bg-1)':'var(--bg-2)')
                                : `rgba(239,68,68,${intensity * 0.65})`;
                              const avgR = count > 0 ? (lrs.reduce((s,l) => s+(l.rating||0),0)/count).toFixed(1) : null;
                              return (
                                <td key={cn} onClick={() => count > 0 && setSelClass(cn)}
                                  style={{ padding: '10px 8px', textAlign: 'center', background: bg,
                                    outline: isSelected && count > 0 ? `2px solid ${CT.red}` : 'none',
                                    cursor: count > 0 ? 'pointer' : 'default', transition: 'all 0.15s' }}>
                                  {count > 0 ? (
                                    <>
                                      <div style={{ fontSize: 15, fontWeight: 700,
                                        color: intensity > 0.45 ? '#fff' : CT.red }}>{count}</div>
                                      {avgR && <div style={{ fontSize: 9,
                                        color: intensity > 0.45 ? 'rgba(255,255,255,0.75)' : CT.txt4 }}>
                                        avg {avgR}
                                      </div>}
                                    </>
                                  ) : <span style={{ color: CT.txt4, fontSize: 13 }}>—</span>}
                                </td>
                              );
                            })}
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700,
                              fontSize: 15, color: CT.red,
                              background: bi%2===0?'var(--bg-1)':'var(--bg-2)' }}>
                              {b.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CRCard>
              </>
            );
          })()}
        </div>
      )}

      {/* Class Missed Tab */}
      {tab === 'missed' && (
        <div>
          {filteredMissed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: CT.txt4, fontSize: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{'\u{1F389}'}</div>
              No missed classes found
            </div>
          ) : (() => {
            const classNums = [1,2,3,4,5,6];

            // Per-class counts
            const byClass = {};
            classNums.forEach(cn => { byClass[cn] = { count: 0, batches: new Set() }; });
            filteredMissed.forEach(m => {
              const cn = Number(m.class_num);
              if (!byClass[cn]) return;
              byClass[cn].count++;
              byClass[cn].batches.add(m.batch);
            });
            const activeCns = classNums.filter(cn => byClass[cn].count > 0);
            const maxCount = Math.max(...activeCns.map(cn => byClass[cn].count), 1);

            // Per-batch grouping
            const batchMap = {};
            filteredMissed.forEach(m => {
              if (!batchMap[m.batch]) batchMap[m.batch] = { batch: m.batch, total: 0, byClass: {} };
              const cn = Number(m.class_num);
              if (!batchMap[m.batch].byClass[cn]) batchMap[m.batch].byClass[cn] = [];
              batchMap[m.batch].byClass[cn].push(m);
              batchMap[m.batch].total++;
            });
            const batchList = Object.values(batchMap).sort((a,b) => b.total - a.total);

            const selClass = selMissedClass; const setSelClass = setSelMissedClass;
            const selectedMissed = (byClass[selClass] && filteredMissed.filter(m => Number(m.class_num) === selClass)) || [];
            const byBatchForClass = {};
            selectedMissed.forEach(m => {
              if (!byBatchForClass[m.batch]) byBatchForClass[m.batch] = [];
              byBatchForClass[m.batch].push(m);
            });
            const batchesForClass = Object.entries(byBatchForClass).sort((a,b) => b[1].length - a[1].length);

            return (
              <>
                {/* Class selector strip */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  {activeCns.map(cn => {
                    const d = byClass[cn];
                    const isActive = selClass === cn;
                    const barW = Math.round((d.count / maxCount) * 100);
                    return (
                      <div key={cn} onClick={() => setSelClass(cn)}
                        style={{ flex: 1, minWidth: 100, background: isActive ? 'var(--amber-soft)' : CT.card,
                          border: `2px solid ${isActive ? CT.amber : CT.border}`,
                          borderRadius: CT.radius, padding: '14px 16px', cursor: 'pointer',
                          transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${barW}%`, height: 3,
                          background: CT.amber, opacity: 0.6 }} />
                        <div style={{ fontSize: 11, fontWeight: 600,
                          color: isActive ? CT.amber : CT.txt4,
                          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                          Class {cn}
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700,
                          color: isActive ? CT.amber : CT.txt2, lineHeight: 1 }}>
                          {d.count}
                        </div>
                        <div style={{ fontSize: 10, color: CT.txt4, marginTop: 4 }}>
                          {d.batches.size} batch{d.batches.size > 1 ? 'es' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected class learners */}
                <CRCard
                  title={`Class ${selClass} — Missed Live`}
                  subtitle={`${selectedMissed.length} learner${selectedMissed.length !== 1 ? 's' : ''} across ${batchesForClass.length} batch${batchesForClass.length !== 1 ? 'es' : ''}`}
                  badge={selectedMissed.length}
                  accent={CT.amber}
                  style={{ marginBottom: 20 }}>

                  {batchesForClass.map(([batch, learners], bi) => (
                    <div key={bi} style={{ borderBottom: bi < batchesForClass.length-1 ? `1px solid ${CT.divider}` : 'none',
                      padding: '16px 0' }}>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: CT.txt1 }}>{crShortBatch(batch)}</span>
                          {instructorMap[batch] && (
                            <span style={{ fontSize: 11, color: CT.txt4, marginLeft: 8 }}>{instructorMap[batch]}</span>
                          )}
                        </div>
                        <span style={{ padding: '3px 12px', borderRadius: 999,
                          background: 'var(--amber-soft)', color: CT.amber, fontSize: 11, fontWeight: 700 }}>
                          {learners.length} missed
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {learners.map((m, li) => {
                          const watchedRecording = m.overall_att && m.overall_att > 20;
                          return (
                            <div key={li} style={{ display: 'flex', alignItems: 'flex-start', gap: 12,
                              background: CT.bg, border: `1px solid ${CT.border}`,
                              borderLeft: `3px solid ${watchedRecording ? CT.green : CT.amber}`,
                              borderRadius: 8, padding: '10px 14px' }}>

                              {/* Status bubble */}
                              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700,
                                background: watchedRecording ? 'var(--green-soft)' : 'var(--amber-soft)',
                                color: watchedRecording ? CT.green : CT.amber }}
                                title={watchedRecording ? `Watched recording: ${m.overall_att}%` : 'Did not watch recording'}>
                                {watchedRecording ? '\u{1F4FA}' : '\u{1F6AB}'}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: CT.txt1 }}>{m.email}</span>
                                  {m.persona && (
                                    <span style={{ padding: '1px 8px', borderRadius: 10, background: CT.accentBg,
                                      color: CT.accent, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                                      {crShortPersona(m.persona)}
                                    </span>
                                  )}
                                  {m.overall_att != null && (
                                    <span style={{ padding: '1px 8px', borderRadius: 10,
                                      background: watchedRecording ? 'var(--green-soft)' : CT.thead,
                                      color: watchedRecording ? CT.green : CT.txt4,
                                      fontSize: 10, fontWeight: 500, flexShrink: 0 }}>
                                      Recording: {m.overall_att ? `${Math.round(m.overall_att)}%` : '0%'}
                                    </span>
                                  )}
                                  {m.connect_status && (
                                    <span style={{ padding: '1px 8px', borderRadius: 10, background: CT.thead,
                                      color: CT.txt3, fontSize: 10, flexShrink: 0 }}>
                                      {m.connect_status}
                                    </span>
                                  )}
                                  <span style={{ fontSize: 10, color: CT.txt4, marginLeft: 'auto', flexShrink: 0 }}>
                                    PSA: {crShortEmail(m.psa)}
                                  </span>
                                </div>
                                {m.notes && (
                                  <div style={{ fontSize: 11, color: CT.txt3, lineHeight: 1.5,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={m.notes}>
                                    {'\u{1F4AC}'} {m.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CRCard>

                {/* Heatmap */}
                <CRCard title="Missed Classes Heatmap" subtitle="Batches × Classes — darker = more missed"
                  style={{ marginBottom: 20 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: CT.txt4,
                            textAlign: 'left', borderBottom: `1.5px solid ${CT.border}`, background: CT.thead,
                            textTransform: 'uppercase', letterSpacing: 0.5 }}>Batch</th>
                          {activeCns.map(cn => (
                            <th key={cn} onClick={() => setSelClass(cn)}
                              style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600,
                                color: selClass === cn ? CT.amber : CT.txt4,
                                textAlign: 'center', borderBottom: `1.5px solid ${CT.border}`,
                                background: selClass === cn ? 'var(--amber-soft)' : CT.thead,
                                textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 58,
                                cursor: 'pointer' }}>
                              C{cn}
                            </th>
                          ))}
                          <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: CT.txt4,
                            textAlign: 'center', borderBottom: `1.5px solid ${CT.border}`,
                            background: CT.thead, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchList.map((b, bi) => (
                          <tr key={bi} style={{ borderBottom: `1px solid ${CT.divider}` }}>
                            <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: CT.txt1,
                              whiteSpace: 'nowrap', background: bi%2===0?'var(--bg-1)':'var(--bg-2)' }}>
                              {crShortBatch(b.batch)}
                            </td>
                            {activeCns.map(cn => {
                              const ms = b.byClass[cn] || [];
                              const count = ms.length;
                              const intensity = count === 0 ? 0 : Math.max(0.15, Math.min(1, count / maxCount));
                              const bg = count === 0
                                ? (bi%2===0?'var(--bg-1)':'var(--bg-2)')
                                : `rgba(245,158,11,${intensity * 0.65})`;
                              return (
                                <td key={cn} onClick={() => count > 0 && setSelClass(cn)}
                                  style={{ padding: '10px 8px', textAlign: 'center', background: bg,
                                    cursor: count > 0 ? 'pointer' : 'default' }}>
                                  {count > 0
                                    ? <div style={{ fontSize: 15, fontWeight: 700,
                                        color: intensity > 0.45 ? '#fff' : CT.amber }}>{count}</div>
                                    : <span style={{ color: CT.txt4, fontSize: 13 }}>—</span>}
                                </td>
                              );
                            })}
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700,
                              fontSize: 15, color: CT.amber,
                              background: bi%2===0?'var(--bg-1)':'var(--bg-2)' }}>
                              {b.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CRCard>
              </>
            );
          })()}
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

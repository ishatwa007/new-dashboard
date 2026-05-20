// mentor.jsx — Page 3: Mentor Tracking
// MECE structure: Overview | No Shows | Low Ratings | Repeat Offenders
// @ts-nocheck

const { useState: useMT, useEffect: useMTE, useCallback: useMTCB, useMemo: useMTM } = React;

// ── Design tokens ─────────────────────────────────────────────────────────────
const MT = {
  bg: 'var(--bg)', card: 'var(--bg-1)', card2: 'var(--bg-2)', border: 'var(--border)',
  txt1: 'var(--fg)', txt2: 'var(--fg-2)', txt3: 'var(--fg-3)', txt4: 'var(--fg-4)',
  accent: 'var(--indigo)', accentBg: 'var(--indigo-soft)', accentBorder: 'var(--indigo-border)',
  red: 'var(--red)', redBg: 'var(--red-soft)',
  amber: 'var(--amber)', amberBg: 'var(--amber-soft)',
  green: 'var(--green)', greenBg: 'var(--green-soft)',
  radius: 0, radiusSm: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const mtInitials = n => (n||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
const mtShort    = e => (e||'').split('@')[0];
const mtDate     = d => { try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}); } catch { return d||''; } };

const NS_TYPE = {
  mentor_no_show: { label:'Mentor No Show', short:'Mentor', color:MT.red,   bg:MT.redBg,   dot:'🔴' },
  mentee_no_show: { label:'Mentee No Show', short:'Mentee', color:MT.amber, bg:MT.amberBg, dot:'🟡' },
  both_no_show:   { label:'Both No Show',   short:'Both',   color:'var(--fg-2)', bg:'var(--bg-3)', dot:'⚫' },
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const MAvatar = ({ name, size=36 }) => {
  const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#0ea5e9'];
  const bg = COLORS[Math.abs((name||'').charCodeAt(0)-65) % COLORS.length];
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:bg,flexShrink:0,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:size*0.36,fontWeight:700,color:'#fff',letterSpacing:'-0.5px'}}>
      {mtInitials(name)}
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const MStat = ({ label, value, sub, tone, onClick }) => {
  const color = tone==='red' ? MT.red : tone==='amber' ? MT.amber : tone==='green' ? MT.green : MT.txt1;
  return (
    <div onClick={onClick}
      style={{background:MT.card,border:`1px solid ${MT.border}`,borderRadius:MT.radius,
        padding:'16px 20px',flex:1,minWidth:110,cursor:onClick?'pointer':'default',
        transition:'border-color 0.15s',
        ':hover': onClick ? {borderColor:MT.accent} : {}}}>
      <div style={{fontSize:10,fontWeight:700,color:MT.txt4,textTransform:'uppercase',
        letterSpacing:'0.06em',marginBottom:6}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color,lineHeight:1,marginBottom:4}}>{value}</div>
      {sub && <div style={{fontSize:11,color:MT.txt4}}>{sub}</div>}
    </div>
  );
};

// ── AI summary box ────────────────────────────────────────────────────────────
const MAISummary = ({ bullets, loading }) => {
  if (loading) return (
    <div style={{padding:'10px 14px',background:MT.accentBg,border:`1px solid ${MT.accentBorder}`,
      borderRadius:MT.radiusSm,marginBottom:12,fontSize:11,color:MT.accent}}>
      Generating insight...
    </div>
  );
  if (!bullets?.length) return null;
  return (
    <div style={{padding:'10px 14px',background:MT.accentBg,border:`1px solid ${MT.accentBorder}`,
      borderRadius:MT.radiusSm,marginBottom:12}}>
      <div style={{fontSize:10,fontWeight:700,color:MT.accent,textTransform:'uppercase',
        letterSpacing:'0.06em',marginBottom:6}}>💡 AI Insight</div>
      <ul style={{margin:0,paddingLeft:16,color:MT.txt2,fontSize:12,lineHeight:1.7}}>
        {bullets.map((b,i) => <li key={i}>{b}</li>)}
      </ul>
    </div>
  );
};

// ── Tag ───────────────────────────────────────────────────────────────────────
const MTag = ({ label, color, bg }) => (
  <span style={{padding:'2px 8px',borderRadius:0,fontSize:10,fontWeight:700,
    background:bg||MT.accentBg,color:color||MT.accent,whiteSpace:'nowrap'}}>
    {label}
  </span>
);

// ── Divider ───────────────────────────────────────────────────────────────────
const MDivider = ({ label }) => (
  <div style={{display:'flex',alignItems:'center',gap:10,margin:'20px 0 14px'}}>
    <div style={{fontSize:11,fontWeight:700,color:MT.txt4,textTransform:'uppercase',
      letterSpacing:'0.06em',whiteSpace:'nowrap'}}>{label}</div>
    <div style={{flex:1,height:1,background:MT.border}} />
  </div>
);

// ── Session pill ──────────────────────────────────────────────────────────────
const MSession = ({ s, showMentor }) => {
  const t = NS_TYPE[s.type] || { label:s.type, color:MT.txt3, bg:MT.card2 };
  return (
    <div style={{padding:'8px 12px',background:MT.bg,border:`1px solid ${MT.border}`,
      borderLeft:`3px solid ${t.color}`,borderRadius:MT.radiusSm,marginBottom:6}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:3}}>
            <span style={{fontSize:12,fontWeight:600,color:MT.txt1}}>{s.agenda||'Session'}</span>
            <MTag label={t.short} color={t.color} bg={t.bg} />
            {s.severity && <MTag label={s.severity}
              color={s.severity==='High'?MT.red:s.severity==='Medium'?MT.amber:MT.green}
              bg={(s.severity==='High'?MT.red:s.severity==='Medium'?MT.amber:MT.green)+'22'} />}
          </div>
          <div style={{fontSize:11,color:MT.txt4,display:'flex',gap:10,flexWrap:'wrap'}}>
            <span>📅 {mtDate(s.date)} {s.time}</span>
            {showMentor && s.mentor_name && <span>Mentor: {s.mentor_name}</span>}
            {!showMentor && s.mentee_name && <span>Mentee: {s.mentee_name}</span>}
            {s.batch && <span>{s.batch}</span>}
          </div>
          {s.reason_category && (
            <div style={{marginTop:5,display:'flex',gap:6,flexWrap:'wrap'}}>
              <MTag label={s.reason_category} />
              {s.reason_detail && <span style={{fontSize:11,color:MT.txt3,fontStyle:'italic'}}>{s.reason_detail}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// ══════════════════════════════════════════════════════════════════════════════
// MENTOR PAGE
// ══════════════════════════════════════════════════════════════════════════════
function MentorPage({ cohort }) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [nsData,   setNsData]   = useMT(null);
  const [lrData,   setLrData]   = useMT(null);
  const [nsLoading,setNsLoading]= useMT(true);
  const [lrLoading,setLrLoading]= useMT(true);
  const [tab,      setTab]      = useMT('overview');
  const [search,   setSearch]   = useMT('');
  const [nsFilter, setNsFilter] = useMT('all'); // all | mentor | mentee
  const [expanded, setExpanded] = useMT(null);
  const [aiCache,  setAiCache]  = useMT({});
  const [aiLoading,setAiLoading]= useMT({});

  const q = search.toLowerCase().trim();

  // ── Derived data ───────────────────────────────────────────────────────────
  const allNoShows = useMTM(() => {
    const list = nsData?.mentor_list || [];
    const mentees = nsData?.mentee_list || [];
    return { mentors: list, mentees };
  }, [nsData]);

  const filteredMentors = useMTM(() =>
    (nsData?.mentor_list||[]).filter(m =>
      !q || m.email.includes(q) || (m.name||'').toLowerCase().includes(q)
    ), [nsData, q]);

  const filteredMentees = useMTM(() =>
    (nsData?.mentee_list||[]).filter(m =>
      !q || m.email.includes(q) || (m.name||'').toLowerCase().includes(q)
    ), [nsData, q]);

  const filteredLowRaters = useMTM(() =>
    (lrData?.low_raters||[]).filter(lr =>
      !q || (lr.email||'').includes(q) || (lr.name||'').toLowerCase().includes(q) ||
      (lr.batch||'').toLowerCase().includes(q)
    ), [lrData, q]);

  const repeatMentors = useMTM(() =>
    (nsData?.mentor_list||[]).filter(m => m.no_show_count >= 2)
      .sort((a,b) => b.no_show_count - a.no_show_count),
    [nsData]);

  const repeatMentees = useMTM(() =>
    (nsData?.mentee_list||[]).filter(m => m.no_show_count >= 2)
      .sort((a,b) => b.no_show_count - a.no_show_count),
    [nsData]);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadNS = useMTCB(async () => {
    setNsLoading(true);
    try {
      const res = await window.API.getMentorNoshows(cohort);
      setNsData(res);
    } catch(e) { console.error(e); }
    finally { setNsLoading(false); }
  }, [cohort?.id]);

  const loadLR = useMTCB(async () => {
    setLrLoading(true);
    try {
      const res = await window.API.getMentorBackend(cohort);
      setLrData(res);
    } catch(e) { console.error(e); }
    finally { setLrLoading(false); }
  }, [cohort?.id]);

  useMTE(() => { loadNS(); loadLR(); }, [loadNS, loadLR]);

  // ── AI summary ─────────────────────────────────────────────────────────────
  const genAI = async (key, items, ctx) => {
    if (aiCache[key] || aiLoading[key]) return;
    const meaningful = (items||[]).filter(i => i && i.trim().length > 5 &&
      !['n/a','none','-','plan your scaler journey'].includes(i.trim().toLowerCase()));
    if (!meaningful.length) {
      setAiCache(p => ({...p,[key]:['No reasons or notes logged yet']}));
      return;
    }
    setAiLoading(p => ({...p,[key]:true}));
    try {
      const r = await fetch(`${window.API_BASE}/api/ai/summary`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ items: meaningful, context: ctx })
      });
      const j = await r.json();
      setAiCache(p => ({...p,[key]: j.bullets||[]}));
    } catch { setAiCache(p => ({...p,[key]:[]})); }
    finally { setAiLoading(p => ({...p,[key]:false})); }
  };

  const expand = (key, aiItems, aiCtx) => {
    const next = expanded === key ? null : key;
    setExpanded(next);
    if (next && aiItems?.length) genAI(key, aiItems, aiCtx);
  };

  // ── Tab config ─────────────────────────────────────────────────────────────
  const TABS = [
    { id:'overview',  label:'Overview',          icon:'📊' },
    { id:'noshows',   label:'No Shows',           icon:'📵', badge:(nsData?.total||0)||null },
    { id:'lowratings',label:'Low Ratings',        icon:'⭐', badge:(lrData?.low_raters_count||0)||null },
    { id:'repeats',   label:'Repeat Offenders',   icon:'🔁', badge:(repeatMentors.length+repeatMentees.length)||null },
  ];

  const loading = nsLoading && lrLoading;

  if (loading) return (
    <div style={{padding:60,textAlign:'center',color:MT.txt4,fontSize:13}}>
      Loading mentor data...
    </div>
  );

  // ── Render helpers ─────────────────────────────────────────────────────────
  const PersonCard = ({ person, isMentor, showSessions=false }) => {
    const key = `${isMentor?'m':'t'}-${person.email}`;
    const isOpen = expanded === key;
    const aiItems = person.sessions?.map(s =>
      [s.agenda, s.reason_category, s.reason_detail].filter(Boolean).join(' — ')
    );
    const isRepeat = person.no_show_count >= 2;
    return (
      <div style={{background:MT.card,border:`1px solid ${isRepeat?MT.red:MT.border}`,
        borderLeft:`4px solid ${isRepeat?MT.red:MT.border}`,
        borderRadius:MT.radius,marginBottom:8,overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',cursor:'pointer'}}
          onClick={() => expand(key, aiItems, `${isMentor?'mentor':'mentee'} no-show sessions`)}>
          <MAvatar name={person.name||person.email} size={38} />
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <span style={{fontSize:13,fontWeight:700,color:MT.txt1}}>
                {person.name || mtShort(person.email)}
              </span>
              {isRepeat && <MTag label="Repeat" color={MT.red} bg={MT.redBg} />}
              {isMentor ? <MTag label="Mentor" color={MT.txt3} bg={MT.card2} />
                        : <MTag label="Mentee" color={MT.txt3} bg={MT.card2} />}
            </div>
            <div style={{fontSize:11,color:MT.txt4,marginTop:2}}>{person.email}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <span style={{padding:'4px 12px',borderRadius:0,fontSize:12,fontWeight:700,
              background:person.no_show_count>=2?MT.redBg:MT.amberBg,
              color:person.no_show_count>=2?MT.red:MT.amber}}>
              {person.no_show_count} missed
            </span>
            <span style={{color:MT.txt4,fontSize:13}}>{isOpen?'▲':'▼'}</span>
          </div>
        </div>
        {isOpen && (
          <div style={{padding:'0 16px 16px',borderTop:`1px solid ${MT.border}`,paddingTop:14}}>
            <MAISummary bullets={aiCache[key]} loading={aiLoading[key]} />
            <div style={{fontSize:10,fontWeight:700,color:MT.txt4,textTransform:'uppercase',
              letterSpacing:'0.06em',marginBottom:8}}>
              {person.sessions?.length} session{person.sessions?.length!==1?'s':''} missed
            </div>
            {(person.sessions||[]).map((s,i) => (
              <MSession key={i} s={s} showMentor={!isMentor} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{padding:'24px 28px',fontFamily:'var(--sans)'}}>

      {/* Search bar */}
      <div style={{display:'flex',gap:10,marginBottom:20,alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name or email..."
          style={{flex:1,maxWidth:300,padding:'7px 12px',borderRadius:0,
            border:`1px solid ${MT.border}`,background:MT.card,color:MT.txt1,
            fontSize:13,outline:'none'}} />
        <button onClick={()=>{loadNS();loadLR();}}
          style={{padding:'7px 14px',borderRadius:0,border:`1px solid ${MT.border}`,
            background:MT.card,color:MT.txt2,cursor:'pointer',fontSize:12,fontWeight:500}}>
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div style={{display:'flex',gap:2,borderBottom:`1px solid ${MT.border}`,marginBottom:24}}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'9px 18px',border:'none',background:'none',cursor:'pointer',
              borderBottom:tab===t.id?`2px solid ${MT.accent}`:'2px solid transparent',
              color:tab===t.id?MT.accent:MT.txt3,fontWeight:tab===t.id?700:500,
              fontSize:13,display:'flex',alignItems:'center',gap:6,marginBottom:-1,
              transition:'all 0.15s',fontFamily:'var(--sans)'}}>
            {t.icon} {t.label}
            {t.badge > 0 && (
              <span style={{padding:'1px 7px',borderRadius:0,fontSize:10,fontWeight:700,
                background:t.id==='noshows'?MT.redBg:t.id==='repeats'?MT.redBg:MT.amberBg,
                color:t.id==='noshows'?MT.red:t.id==='repeats'?MT.red:MT.amber}}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ────────────────────────────────────────────────────── */}
      {tab==='overview' && (
        <div>
          {/* KPI strip */}
          <div style={{display:'flex',gap:12,marginBottom:24,flexWrap:'wrap'}}>
            <MStat label="Total No Shows"    value={nsData?.total||0} />
            <MStat label="Mentor No Shows"   value={nsData?.mentor_noshows||0}   tone="red"
              sub={`${nsData?.unique_mentors||0} unique mentors`} />
            <MStat label="Mentee No Shows"   value={nsData?.mentee_noshows||0}   tone="amber"
              sub={`${nsData?.unique_mentees||0} unique mentees`} />
            <MStat label="Low Rated PYSJ"    value={lrData?.low_raters_count||0} tone="amber"
              sub="Sessions rated low" />
            <MStat label="Repeat Offenders"  value={repeatMentors.length+repeatMentees.length}
              tone={(repeatMentors.length+repeatMentees.length)>0?'red':'green'}
              sub="2+ incidents" />
          </div>

          {/* Needs attention */}
          {(repeatMentors.length > 0 || repeatMentees.length > 0) && (
            <div style={{background:MT.card,border:`1px solid ${MT.border}`,
              borderTop:`3px solid ${MT.red}`,borderRadius:MT.radius,padding:'18px 22px',marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:700,color:MT.txt1,marginBottom:4}}>
                ⚠️ Needs Attention
              </div>
              <div style={{fontSize:11,color:MT.txt4,marginBottom:14}}>
                Mentors and mentees with 2 or more no-shows this cohort
              </div>
              {[...repeatMentors.map(m=>({...m,isMentor:true})),
                ...repeatMentees.map(m=>({...m,isMentor:false}))
              ].slice(0,5).map((p,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,
                  padding:'10px 12px',background:MT.bg,border:`1px solid ${MT.border}`,
                  borderRadius:MT.radiusSm,marginBottom:8}}>
                  <MAvatar name={p.name||p.email} size={34} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:MT.txt1}}>{p.name||mtShort(p.email)}</div>
                    <div style={{fontSize:11,color:MT.txt4}}>{p.email}</div>
                  </div>
                  <MTag label={p.isMentor?'Mentor':'Mentee'} color={MT.txt3} bg={MT.card2} />
                  <span style={{padding:'3px 10px',borderRadius:0,fontSize:11,fontWeight:700,
                    background:MT.redBg,color:MT.red}}>
                    {p.no_show_count}× missed
                  </span>
                  <button onClick={()=>setTab(p.isMentor?'noshows':'noshows')}
                    style={{padding:'4px 10px',borderRadius:0,border:`1px solid ${MT.border}`,
                      background:MT.card,color:MT.accent,fontSize:11,cursor:'pointer',fontWeight:600}}>
                    View →
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Breakdown bars */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{background:MT.card,border:`1px solid ${MT.border}`,borderRadius:MT.radius,padding:'18px 20px'}}>
              <div style={{fontSize:13,fontWeight:700,color:MT.txt1,marginBottom:16}}>No Show Breakdown</div>
              {[
                {label:'Mentor No Shows', count:nsData?.mentor_noshows||0, color:MT.red},
                {label:'Mentee No Shows', count:nsData?.mentee_noshows||0, color:MT.amber},
                {label:'Both No Shows',   count:nsData?.both_noshows||0,   color:MT.txt3},
              ].map((row,i) => {
                const total = nsData?.total||1;
                const pct   = Math.round(row.count/total*100);
                return (
                  <div key={i} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                      <span style={{color:MT.txt2,fontWeight:500}}>{row.label}</span>
                      <span style={{color:row.color,fontWeight:700}}>{row.count}
                        <span style={{color:MT.txt4,fontWeight:400}}> ({pct}%)</span>
                      </span>
                    </div>
                    <div style={{height:6,background:MT.border,borderRadius:3,overflow:'hidden'}}>
                      <div style={{width:`${pct}%`,height:'100%',background:row.color,
                        borderRadius:3,transition:'width 0.4s ease'}} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{background:MT.card,border:`1px solid ${MT.border}`,borderRadius:MT.radius,padding:'18px 20px'}}>
              <div style={{fontSize:13,fontWeight:700,color:MT.txt1,marginBottom:16}}>Low Ratings — By Batch</div>
              {!lrData?.low_raters_count ? (
                <div style={{fontSize:12,color:MT.txt4,textAlign:'center',padding:'20px 0'}}>No low ratings this cohort</div>
              ) : Object.entries(
                  (lrData?.low_raters||[]).reduce((acc,lr) => {
                    const b = lr.batch||'Unknown';
                    acc[b] = (acc[b]||0)+1;
                    return acc;
                  }, {})
                ).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([batch,count],i) => {
                  const max = Math.max(...Object.values((lrData?.low_raters||[]).reduce((acc,lr)=>{const b=lr.batch||'Unknown';acc[b]=(acc[b]||0)+1;return acc;},{})));
                  return (
                    <div key={i} style={{marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                        <span style={{color:MT.txt2,fontWeight:500,maxWidth:160,overflow:'hidden',
                          textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{batch}</span>
                        <span style={{color:MT.amber,fontWeight:700}}>{count}</span>
                      </div>
                      <div style={{height:6,background:MT.border,borderRadius:3,overflow:'hidden'}}>
                        <div style={{width:`${(count/max)*100}%`,height:'100%',
                          background:MT.amber,borderRadius:3,transition:'width 0.4s'}} />
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>
      )}

      {/* ── NO SHOWS ────────────────────────────────────────────────────── */}
      {tab==='noshows' && (
        <div>
          {/* Filter pills */}
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            {[
              {id:'all',    label:`All  (${nsData?.total||0})`},
              {id:'mentor', label:`Mentor  (${nsData?.mentor_noshows||0})`},
              {id:'mentee', label:`Mentee  (${nsData?.mentee_noshows||0})`},
            ].map(f => (
              <button key={f.id} onClick={()=>setNsFilter(f.id)}
                style={{padding:'6px 16px',borderRadius:0,fontSize:12,fontWeight:600,cursor:'pointer',
                  border:`1px solid ${nsFilter===f.id?MT.accent:MT.border}`,
                  background:nsFilter===f.id?MT.accentBg:MT.card,
                  color:nsFilter===f.id?MT.accent:MT.txt3,transition:'all 0.15s'}}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Mentor no-shows */}
          {(nsFilter==='all'||nsFilter==='mentor') && (
            <>
              {nsFilter==='all' && <MDivider label={`Mentor No Shows · ${filteredMentors.length}`} />}
              {!filteredMentors.length ? (
                <div style={{textAlign:'center',padding:'30px 0',color:MT.txt4,fontSize:12,
                  background:MT.card,border:`1px solid ${MT.border}`,borderRadius:MT.radius,marginBottom:16}}>
                  No mentor no-shows for this cohort
                </div>
              ) : filteredMentors.map((m,i) => (
                <PersonCard key={i} person={m} isMentor={true} />
              ))}
            </>
          )}

          {/* Mentee no-shows */}
          {(nsFilter==='all'||nsFilter==='mentee') && (
            <>
              {nsFilter==='all' && <MDivider label={`Mentee No Shows · ${filteredMentees.length}`} />}
              {!filteredMentees.length ? (
                <div style={{textAlign:'center',padding:'30px 0',color:MT.txt4,fontSize:12,
                  background:MT.card,border:`1px solid ${MT.border}`,borderRadius:MT.radius}}>
                  No mentee no-shows for this cohort
                </div>
              ) : filteredMentees.map((m,i) => (
                <PersonCard key={i} person={m} isMentor={false} />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── LOW RATINGS ─────────────────────────────────────────────────── */}
      {tab==='lowratings' && (
        <div>
          {lrLoading ? (
            <div style={{textAlign:'center',padding:'40px',color:MT.txt4}}>Loading...</div>
          ) : !filteredLowRaters.length ? (
            <div style={{textAlign:'center',padding:'40px',color:MT.txt4,
              background:MT.card,border:`1px solid ${MT.border}`,borderRadius:MT.radius}}>
              No low rated sessions for this cohort
            </div>
          ) : Object.entries(
              filteredLowRaters.reduce((acc,lr) => {
                const b = lr.batch||'Unknown Batch';
                if (!acc[b]) acc[b] = [];
                acc[b].push(lr);
                return acc;
              }, {})
            ).map(([batch, learners], bi) => {
              const bKey   = `lr-b-${bi}`;
              const isOpen = expanded === bKey;
              if (isOpen && !aiCache[bKey] && !aiLoading[bKey]) {
                genAI(bKey, learners.map(l=>l.replies).filter(Boolean), 'low rated PYSJ sessions');
              }
              return (
                <div key={bi} style={{background:MT.card,border:`1px solid ${MT.border}`,
                  borderRadius:MT.radius,marginBottom:10,overflow:'hidden'}}>

                  {/* Batch header */}
                  <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',
                    cursor:'pointer',borderBottom:isOpen?`1px solid ${MT.border}`:'none'}}
                    onClick={() => setExpanded(isOpen?null:bKey)}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:MT.txt1}}>{batch}</div>
                      <div style={{fontSize:11,color:MT.txt4,marginTop:2}}>
                        {learners.length} learner{learners.length>1?'s':''} · low PYSJ rating
                      </div>
                    </div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      {learners.filter(l=>l.replies).length>0 && (
                        <MTag label={`💬 ${learners.filter(l=>l.replies).length} replied`} />
                      )}
                      <span style={{padding:'3px 12px',borderRadius:0,fontSize:11,fontWeight:700,
                        background:MT.amberBg,color:MT.amber}}>
                        {learners.length}
                      </span>
                      <span style={{color:MT.txt4,fontSize:13}}>{isOpen?'▲':'▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{padding:'16px 18px'}}>
                      <MAISummary bullets={aiCache[bKey]} loading={aiLoading[bKey]} />
                      {learners.map((lr, li) => {
                        const lKey   = `lr-l-${lr.email}-${li}`;
                        const lrOpen = expanded === lKey;
                        if (lrOpen && lr.replies && !aiCache[lKey] && !aiLoading[lKey]) {
                          genAI(lKey, [lr.replies], 'low rated PYSJ session reply');
                        }
                        return (
                          <div key={li} style={{background:MT.bg,border:`1px solid ${MT.border}`,
                            borderRadius:MT.radiusSm,marginBottom:8,overflow:'hidden'}}>
                            <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',
                              cursor:'pointer'}}
                              onClick={() => setExpanded(lrOpen?bKey:lKey)}>
                              <MAvatar name={lr.name||lr.email} size={34} />
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:600,color:MT.txt1}}>
                                  {lr.name||mtShort(lr.email)}
                                </div>
                                <div style={{fontSize:11,color:MT.txt4}}>{lr.email}</div>
                              </div>
                              {/* Mentor info */}
                              {lr.mentor_email && (
                                <div style={{textAlign:'right',flexShrink:0}}>
                                  <div style={{fontSize:10,color:MT.txt4,marginBottom:1}}>Mentor</div>
                                  <div style={{fontSize:11,fontWeight:600,color:MT.txt2}}>
                                    {mtShort(lr.mentor_email)}
                                  </div>
                                </div>
                              )}
                              <div style={{display:'flex',gap:6,flexShrink:0}}>
                                {lr.program && <MTag label={lr.program} />}
                                {lr.replies && <span style={{fontSize:10,color:MT.accent}}>💬</span>}
                                {lr.slack_url && (
                                  <a href={lr.slack_url} target="_blank" rel="noreferrer"
                                    onClick={e=>e.stopPropagation()}
                                    style={{fontSize:10,color:MT.accent,textDecoration:'none',
                                      padding:'2px 8px',borderRadius:0,
                                      border:`1px solid ${MT.accentBorder}`,background:MT.accentBg}}>
                                    Slack ↗
                                  </a>
                                )}
                              </div>
                            </div>
                            {lrOpen && (
                              <div style={{padding:'0 14px 14px',borderTop:`1px solid ${MT.border}`,paddingTop:12}}>
                                <MAISummary bullets={aiCache[lKey]} loading={aiLoading[lKey]} />
                                {lr.replies && (
                                  <div style={{fontSize:12,color:MT.txt2,padding:'10px 14px',
                                    background:MT.card2,borderRadius:0,lineHeight:1.6,
                                    borderLeft:`3px solid ${MT.accent}`}}>
                                    {lr.replies}
                                  </div>
                                )}
                                {lr.phone && (
                                  <div style={{fontSize:11,color:MT.txt4,marginTop:8}}>
                                    📞 {lr.phone}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          }
        </div>
      )}

      {/* ── REPEAT OFFENDERS ────────────────────────────────────────────── */}
      {tab==='repeats' && (
        <div>
          {!repeatMentors.length && !repeatMentees.length ? (
            <div style={{textAlign:'center',padding:'60px',color:MT.txt4,
              background:MT.card,border:`1px solid ${MT.border}`,borderRadius:MT.radius}}>
              <div style={{fontSize:24,marginBottom:8}}>✅</div>
              No repeat offenders this cohort
            </div>
          ) : (
            <>
              {repeatMentors.length > 0 && (
                <>
                  <MDivider label={`Mentors with 2+ No Shows · ${repeatMentors.length}`} />
                  {repeatMentors.map((m,i) => <PersonCard key={i} person={m} isMentor={true} />)}
                </>
              )}
              {repeatMentees.length > 0 && (
                <>
                  <MDivider label={`Mentees with 2+ No Shows · ${repeatMentees.length}`} />
                  {repeatMentees.map((m,i) => <PersonCard key={i} person={m} isMentor={false} />)}
                </>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}

window.MentorPage = MentorPage;

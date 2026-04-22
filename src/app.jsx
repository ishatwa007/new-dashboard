// ── Error boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:'60px 40px',textAlign:'center'}}>
          <div style={{fontSize:16,fontWeight:600,color:'var(--red)',marginBottom:12}}>
            Dashboard render error
          </div>
          <div style={{fontSize:12,color:'var(--fg-3)',fontFamily:'var(--mono)',marginBottom:20}}>
            {this.state.error.message}
          </div>
          <button className="btn" onClick={()=>{ this.setState({error:null}); window.location.reload(); }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const { useState, useMemo, useEffect, useCallback, useRef } = React;

// ── Cohort ID map ──────────────────────────────────────────────────────────
const COHORT_MAP = {
  'apr26': 'april2026',
  'mar26': 'march2026',
  'feb26': 'february2026',
  'jan26': 'january2026',
  'dec25': 'december(1)2025',
  'dec25b': 'december(2)2025',
  'nov25': 'november2025',
  'oct25': 'october2025',
  'sep25': 'september2025',
  'aug25': 'august2025',
  'jul25': 'july2025',
  'may26': 'may2026',
};
const toApiId = (id) => COHORT_MAP[id] || id;

// ── Transform backend response ─────────────────────────────────────────────
function transformAnalytics(api) {
  if (!api || !api.kpis) return null;
  const k = api.kpis;

  const kpis = {
    sales:            k.total             || 0,
    gtn:              k.gtn               || 0,
    complete:         k.complete          || 0,
    pending:          k.pending           || 0,
    pctComplete:      k.pct_complete      || 0,
    refRateTotal:     k.refund_rate_total || k.pct_total || 0,
    refRateComplete:  k.refund_rate_complete || k.pct_c || 0,
    refundsComplete:  k.refunded          || k.ref_c  || 0,
    refundsPending:   k.under_ret         || 0,
    preMng:           k.pre_mng           || 0,
    fecRefunds:       k.fec_refunds       || 0,
    probableConverted: k.probable_total   || 0,
  };

  const programs = (api.programs || []).map(p => ({
    key:     (p.program||'').toLowerCase(),
    name:    p.program,
    sales:   p.total    || 0,
    refunds: p.refunded || p.ref_c || 0,
    rate:    p.pct_c    || 0,
    gtn:     p.gtn      || 0,
  }));

  const engagement = (api.engagement || []).map(e => ({
    metric:   e.signal, active: e.active || 0,
    refunded: e.refunded || 0, desc: '',
  }));

  const totalRef = Math.max((api.weeks||[]).reduce((a,w)=>a+(w.ref_total||0),0), 1);
  const weekPattern = (api.weeks||[]).map(w => ({
    week: w.week, count: w.ref_total||0,
    pct: parseFloat(((w.ref_total||0)/totalRef*100).toFixed(1)), note: '',
    rate: w.rate || 0,
  }));

  const sources = (api.source_breakdown||[]).map(s => ({
    key:     s.key || (s.name||s.source||'').toLowerCase().replace(/\s+/g,'_'),
    name:    s.name || s.source || 'Unknown',
    sales:   s.sales || s.total || 0,
    refunds: s.refunds || s.ref_c || 0,
    rate:    s.rate || s.pct_c || 0,
    sub:     s.sub || [],
  }));

  const byProfession = (api.persona_breakdown||[]).slice(0,8).map(p => ({
    label:    p.persona, active:   (p.total||0)-(p.ref_total||0),
    refunded: p.ref_total||0, rate: p.pct_total||0,
  }));

  const ctcBreakdown = (api.ctc_breakdown||[]).map(c => ({
    label: c.label, active: c.active||0,
    refunded: c.refunded||0, rate: c.rate||c.pct_total||0,
  }));

  const byExp = (api.experience_breakdown||[]).map(e => ({
    label: e.label, active: e.active||0,
    refunded: e.refunded||0, rate: e.rate||e.pct_total||0,
  }));

  const programRefunds = (api.program_refunds||[]).map(p => ({
    label: p.label||p.program, key: p.key||(p.program||'').toLowerCase(),
    active: p.active||0, refunded: p.refunded||0,
    refReq: p.refReq||0, rate: p.rate||p.pct_c||0,
    total: p.total||0, complete: p.complete||0,
  }));

  const reasons = (api.reasons||[]).map(r => ({
    category: r.category, count: r.count||0, pct: r.pct||0,
    sentiment: r.sentiment||'neutral', examples: r.examples||[],
    retained: r.retained||0, retention_rate: r.retention_rate||0,
  }));

  const psas = (api.psas||[]).map(p => ({
    email: p.email, name: p.name||p.email,
    assigned: p.assigned||p.total||0, complete: p.complete||0,
    refReq: p.refReq||p.ref_req_c||0, refunds: p.refunds||p.ref_c||0,
    retained: p.retained||0, retained_pct: p.retained_pct||0,
    rate: p.rate||0, byProgram: p.byProgram||null,
  }));

  return { kpis, programs, engagement, weekPattern, sources, byProfession,
           ctcBreakdown, byExp, programRefunds, reasons, psas,
           hierarchy: api.hierarchy || {} };
}

// ── Analytics Page ─────────────────────────────────────────────────────────
function AnalyticsPage() {
  const _initCohorts = (window.MOCK && window.MOCK.cohorts) || [];
  const _initCohort = _initCohorts.find(c=>c.id==='apr26') || _initCohorts[0] || {id:'apr26', label:'Apr 2026', size:0};
  const [cohort, setCohort]       = useState(_initCohort);
  const [compare, setCompare]     = useState('Single');
  const [trail, setTrail]         = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [liveData, setLiveData]   = useState(null);
  const [livePSAs, setLivePSAs]   = useState(null);
  const [gtnTrend, setGtnTrend]   = useState(null);
  const [compareData, setCompareData] = useState([]);
  const [cohortSize, setCohortSize] = useState(0);
  const [error, setError]         = useState(null);
  const [realCohorts, setRealCohorts] = useState([]);

  useEffect(() => {
    window.API.getCohorts().then(data => {
      if (data && data.cohorts && data.cohorts.length > 0) {
        const mapped = data.cohorts.map(c => ({
          id:    c.id,
          label: c.label || c.id,
          size:  c.total || 0,
          gtn:   c.gtn   || 0,
        }));
        setRealCohorts(mapped);
        if(window.MOCK && window.MOCK.cohorts){window.MOCK.cohorts.length = 0;
        mapped.slice().reverse().forEach(c => window.MOCK.cohorts.push(c));}
        const apr = mapped.find(c=>c.id==='april2026');
        if (apr) setCohort(apr);

        // Build GTN trend from real cohort list
        const trend = mapped.filter(c => c.gtn > 0).map(c => ({
          cohort: c.label.replace(/ 20\d\d/, '').slice(0,6),
          value: c.gtn,
        }));
        if (trend.length >= 2) setGtnTrend(trend);
      }
    }).catch(()=>{});
  }, []);

  const loadData = useCallback(async (cohortId) => {
    setLoading(true); setError(null);
    const apiId = toApiId(cohortId);
    window._currentCohortId = apiId;
    window._lastApiId = apiId;
    console.log('[App] Loading:', apiId);
    try {
      const [apiRes, psaRes] = await Promise.allSettled([
        window.API.getAnalytics(apiId),
        window.API.getPSAs(apiId),
      ]);
      const api  = apiRes.status  === 'fulfilled' ? apiRes.value  : null;
      const psaD = psaRes.status  === 'fulfilled' ? psaRes.value  : null;

      if (api) {
        const t = transformAnalytics(api);
        if (t) { setLiveData(t); setCohortSize(t.kpis.sales); }
      } else {
        setError('Backend unreachable — check uvicorn is running on port 8000');
      }
      if (psaD?.psas?.length > 0) setLivePSAs(psaD.psas);
    } catch(e) {
      setError(e.message);
      console.error('[App]', e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (cohort?.id) loadData(cohort.id);
  }, [cohort, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await window.API.clearCache(toApiId(cohort.id));
    await loadData(cohort.id);
    setRefreshing(false);
  };

  const d = liveData || {};
  const psas = livePSAs || d.psas || [];
  const hierarchy = d.hierarchy || {};

  const [viewLevel, setViewLevel] = useState('overall');

  return (
    <>
      <Header
        title="Refund Analytics"
        subtitle={d?.kpis?.sales ? `${d.kpis.sales} learners` : 'Loading...'}
        cohort={cohort} setCohort={setCohort}
        compare={compare} setCompare={setCompare}
        onRefresh={handleRefresh} refreshing={refreshing}
      />
      {loading && !liveData ? (
        <div style={{padding:'60px',textAlign:'center',color:'var(--fg-2)',fontSize:13}}>
          Loading live data for {cohort.label}...
        </div>
      ) : error ? (
        <div style={{padding:'60px 40px',textAlign:'center'}}>
          <div style={{color:'var(--red)',fontSize:14,fontWeight:600,marginBottom:8}}>Backend Error</div>
          <div style={{color:'var(--fg-2)',fontSize:12,fontFamily:'var(--mono)'}}>{error}</div>
          <button className="btn" style={{marginTop:16}} onClick={handleRefresh}>Retry</button>
        </div>
      ) : (
        <>
          <KPIStrip cohort={cohort} compare={compare} liveKpis={d?.kpis} />
          {typeof HierarchyFilter !== 'undefined' && (
            <HierarchyFilter level={viewLevel} setLevel={setViewLevel} />
          )}
          <div className="content">
            {viewLevel === 'overall' && (
              <>
                <div className="row row-2">
                  <ProgramTable programs={d?.programs} />
                  <PSATable psas={psas} />
                </div>
                <div className="row row-2">
                  <SourceTable sources={d?.sources} />
                  <PersonaCard title="By profession" hint="top personas" data={d?.byProfession} />
                </div>
                <div className="row row-2">
                  <PersonaCard title="By current CTC" hint="salary bands" data={d?.ctcBreakdown} />
                  <PersonaCard title="By experience"  hint="years in industry" data={d?.byExp} />
                </div>
                <div className="row row-3">
                  <BatchRefundCard programRefunds={d?.programRefunds} />
                  <WeekCard        weekPattern={d?.weekPattern} />
                  <EngagementCard  engagement={d?.engagement} />
                </div>
                <ReasonsTable reasons={d?.reasons?.length ? d.reasons : null} />
              </>
            )}
            {viewLevel === 'program' && (
              <ProgramTable programs={d?.programs} />
            )}
            {(viewLevel === 'avp' || viewLevel === 'bdm' || viewLevel === 'bda') && typeof HierarchyTable !== 'undefined' && (
              <HierarchyTable hierarchy={hierarchy} level={viewLevel} />
            )}
            {viewLevel === 'psa' && (
              <PSATable psas={psas} />
            )}
            {compareData.length >= 2 && (
              <CompareTable compareData={compareData} compare={compare} currentCohortId={window._currentCohortId} />
            )}
            <GTNChart gtnTrend={gtnTrend} />
          </div>
        </>
      )}
    </>
  );
}

// ── Requests Page ──────────────────────────────────────────────────────────
function RequestsPage({ pendingCount, setPendingCount }) {
  const [rowsState, setRowsState]       = useState((window.MOCK && window.MOCK.approvals) || []);
  const [filters, setFilters]           = useState({cohort:'april2026',type:'all',status:'All',lsm:'all',days:'all'});
  const [selected, setSelected]         = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [toast, setToast]               = useState(null);
  const [loadingReqs, setLoadingReqs]   = useState(true);

  useEffect(() => {
    setLoadingReqs(true);
    window.API.getRequests('april2026').then(data => {
      if (data?.requests?.length > 0) {
        setRowsState(data.requests.map(r => ({
          ...r, raised: new Date(r.raised),
          requestType: r.requestType || {key:'other',label:'Other',color:'var(--fg-3)'},
          classification: r.classification || {},
        })));
      }
    }).catch(()=>{}).finally(()=>setLoadingReqs(false));
  }, []);

  useEffect(() => {
    setPendingCount(rowsState.filter(r=>r.status==='Pending'||r.status==='Under Review').length);
  }, [rowsState]);

  const filtered = useMemo(()=>rowsState.filter(r=>{
    if (filters.type!=='all'   && r.requestType?.key!==filters.type) return false;
    if (filters.status!=='All' && r.status!==filters.status)          return false;
    if (filters.lsm!=='all'    && r.lsm!==filters.lsm)                return false;
    if (filters.days==='<24'   && r.hoursPending>=24)                  return false;
    if (filters.days==='24-48' && (r.hoursPending<24||r.hoursPending>48)) return false;
    if (filters.days==='>48'   && r.hoursPending<=48)                  return false;
    return true;
  }), [rowsState, filters]);

  const onApprove = (req) => { setSelected(null); setConfirmModal({kind:'approve',req}); };
  const onReject  = (req) => { setSelected(null); setConfirmModal({kind:'reject',req}); };

  const doConfirm = async (note) => {
    const newStatus = confirmModal.kind==='approve' ? 'Approved' : 'Rejected';
    setRowsState(rows=>rows.map(r=>r.id===confirmModal.req.id?{...r,status:newStatus}:r));
    const reqId = confirmModal.req.id;
    setConfirmModal(null);
    try {
      if (confirmModal.kind==='approve') await window.API.approveRequest(reqId, note, 'Ishatwa Chaubey');
      else await window.API.rejectRequest(reqId, note, 'Ishatwa Chaubey');
      setToast({msg:`${reqId} · ${newStatus.toLowerCase()} — saved to sheet`, tone:'good'});
    } catch(e) {
      setToast({msg:`UI updated. Sheet sync failed: ${e.message}`, tone:'bad'});
    }
  };

  return (
    <>
      <Header title="Requests & Approvals" subtitle="Manager queue"
        cohort={((window.MOCK && window.MOCK.cohorts) || [{label:'Apr 2026'}])[0]} setCohort={()=>{}}
        compare="Single" setCompare={()=>{}}
        onRefresh={()=>{}} refreshing={false} showCohortCenter={false} />
      <ReqFilterBar filters={{...filters,_count:filtered.length}} setFilters={setFilters} />
      <ReqStrip rows={rowsState} />
      <div className="content">
        {loadingReqs ? (
          <div style={{padding:'40px',textAlign:'center',color:'var(--fg-2)'}}>Loading requests…</div>
        ) : (
          <>
            <RequestsTable rows={filtered} onOpen={setSelected} onApprove={onApprove} onReject={onReject} />
            <div className="row row-2">
              <TypeBreakdown rows={rowsState} />
              <LSMTable      rows={rowsState} />
            </div>
          </>
        )}
      </div>
      {selected && <SidePanel req={selected} onClose={()=>setSelected(null)} onApprove={onApprove} onReject={onReject} allRows={rowsState} />}
      {confirmModal && <ConfirmModal kind={confirmModal.kind} req={confirmModal.req} onClose={()=>setConfirmModal(null)} onConfirm={doConfirm} />}
      {toast && <Toast msg={toast.msg} tone={toast.tone} onDone={()=>setToast(null)} />}
    </>
  );
}

// ── Tweaks ──────────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = {theme:'dark',density:'comfortable',accent:'indigo'};
const ACCENTS = {
  indigo:  {base:'#7c7aed',deep:'#4f46e5',mid:'#6366f1',softA:'rgba(124,122,237,0.12)',bord:'rgba(124,122,237,0.28)'},
  violet:  {base:'#a78bfa',deep:'#7c3aed',mid:'#8b5cf6',softA:'rgba(167,139,250,0.14)',bord:'rgba(167,139,250,0.3)'},
  blue:    {base:'#60a5fa',deep:'#2563eb',mid:'#3b82f6',softA:'rgba(96,165,250,0.14)',bord:'rgba(96,165,250,0.3)'},
  emerald: {base:'#34d399',deep:'#059669',mid:'#10b981',softA:'rgba(52,211,153,0.14)',bord:'rgba(52,211,153,0.3)'},
};
function applyTweaks(t) {
  try {
    const r = document.documentElement;
    r.setAttribute('data-theme', t.theme||'dark');
    r.style.fontSize = t.density==='dense'?'12.5px':t.density==='spacious'?'14px':'13px';
    const a = ACCENTS[t.accent]||ACCENTS.indigo;
    r.style.setProperty('--indigo',a.base); r.style.setProperty('--indigo-2',a.mid);
    r.style.setProperty('--indigo-3',a.deep); r.style.setProperty('--indigo-soft',a.softA);
    r.style.setProperty('--indigo-border',a.bord);
  } catch(e) { console.warn('applyTweaks error:', e); }
}
function Tweaks({val,onChange,onClose}) {
  const set=(k,v)=>{const n={...val,[k]:v};onChange(n);applyTweaks(n);};
  return (
    <div className="tweaks">
      <h4>Tweaks <button className="icon-btn" style={{width:20,height:20}} onClick={onClose}><Icon name="x" size={10}/></button></h4>
      <div className="tweak-row"><span className="lab">Theme</span><div className="segmented">
        {['dark','light'].map(t=><button key={t} className={val.theme===t?'on':''} onClick={()=>set('theme',t)}>{t}</button>)}
      </div></div>
      <div className="tweak-row"><span className="lab">Density</span><div className="segmented">
        {['dense','comfortable','spacious'].map(d=><button key={d} className={val.density===d?'on':''} onClick={()=>set('density',d)}>{d[0].toUpperCase()}</button>)}
      </div></div>
      <div className="tweak-row"><span className="lab">Accent</span><div style={{display:'flex',gap:5}}>
        {Object.entries(ACCENTS).map(([k,a])=>(
          <button key={k} onClick={()=>set('accent',k)} style={{width:20,height:20,borderRadius:5,background:a.base,padding:0,cursor:'pointer',border:val.accent===k?'2px solid var(--fg)':'1px solid var(--border-2)'}} title={k}/>
        ))}
      </div></div>
    </div>
  );
}

// ── App shell ───────────────────────────────────────────────────────────────
function App() {
  const [page,setPage]             = useState(()=>localStorage.getItem('scaler-page')||'analytics');
  const [unlocked,setUnlocked]     = useState(()=>sessionStorage.getItem('req-unlocked')==='1');
  const [mentorUnlocked,setMentorUnlocked] = useState(()=>sessionStorage.getItem('mentor-unlocked')==='1');
  const [pendingCount,setPendingCount] = useState(0);
  const [tweaks,setTweaks]         = useState(TWEAK_DEFAULTS);
  const [tweaksOpen,setTweaksOpen] = useState(false);

  useEffect(()=>{applyTweaks(tweaks);},[]);
  useEffect(()=>{localStorage.setItem('scaler-page',page);},[page]);
  useEffect(()=>{
    window._goToSettings = ()=>setPage('settings');
    return ()=>{delete window._goToSettings;};
  },[]);
  useEffect(()=>{
    const h=(e)=>{
      if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
      if(e.key==='1') setPage('analytics');
      if(e.key==='2') setPage('requests');
      if(e.key==='3') setPage('program');
      if(e.key==='4') setPage('mentor');
      if(e.key==='5') setPage('classroom');
      if(e.key==='t') setTweaksOpen(o=>!o);
    };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[]);

  return (
    <div className="app">
      <Sidebar page={page} onPage={p=>setPage(p)} pendingCount={page==='requests'&&unlocked?pendingCount:0} />
      <div className="main">
        {page==='analytics' && <ErrorBoundary><AnalyticsPage /></ErrorBoundary>}
        {page==='requests' && !unlocked && (
          <>
            <Header title="Requests & Approvals" subtitle="Restricted"
              cohort={{label:'Apr 2026'}} setCohort={()=>{}} compare="Single" setCompare={()=>{}}
              onRefresh={()=>{}} refreshing={false} showCohortCenter={false} />
            <PasswordGate onUnlock={()=>{setUnlocked(true);sessionStorage.setItem('req-unlocked','1');}} />
          </>
        )}
        {page==='requests' && unlocked && <RequestsPage pendingCount={pendingCount} setPendingCount={setPendingCount} />}
        {page==='program' && (
          <ErrorBoundary>
            <Header title="Program Health" subtitle="Incidents & insights"
              cohort={{label:'Apr 2026'}} setCohort={()=>{}} compare="Single" setCompare={()=>{}}
              onRefresh={()=>{}} refreshing={false} showCohortCenter={false} />
            {typeof ProgramHealth !== 'undefined'
              ? <ProgramHealth cohort={{id:'april2026',label:'April 2026'}} />
              : <div style={{padding:'60px',textAlign:'center',color:'var(--fg-2)'}}>Loading Program Health...</div>}
          </ErrorBoundary>
        )}
        {page==='mentor' && !mentorUnlocked && (
          <>
            <Header title="Mentor Tracking" subtitle="Restricted"
              cohort={{label:'Apr 2026'}} setCohort={()=>{}} compare="Single" setCompare={()=>{}}
              onRefresh={()=>{}} refreshing={false} showCohortCenter={false} />
            <PasswordGate onUnlock={()=>{setMentorUnlocked(true);sessionStorage.setItem('mentor-unlocked','1');}} />
          </>
        )}
        {page==='mentor' && mentorUnlocked && (
          <ErrorBoundary>
            <Header title="Mentor Tracking" subtitle="No-shows, repeat offenders & sessions"
              cohort={{label:'Apr 2026'}} setCohort={()=>{}} compare="Single" setCompare={()=>{}}
              onRefresh={()=>{}} refreshing={false} showCohortCenter={false} />
            {typeof MentorPage !== 'undefined'
              ? <MentorPage cohort={{id:'april2026',label:'April 2026'}} />
              : <div style={{padding:'60px',textAlign:'center',color:'var(--fg-2)'}}>Loading Mentor page...</div>}
          </ErrorBoundary>
        )}
        {page==='classroom' && (
          <ErrorBoundary>
            <Header title="Classroom" subtitle="Batch ratings, low raters & persona"
              cohort={{label:'Apr 2026'}} setCohort={()=>{}} compare="Single" setCompare={()=>{}}
              onRefresh={()=>{}} refreshing={false} showCohortCenter={false} />
            {typeof ClassroomPage !== 'undefined'
              ? <ClassroomPage cohort={{id:'april2026',label:'April 2026'}} />
              : <div style={{padding:'60px',textAlign:'center',color:'var(--fg-2)'}}>Loading Classroom...</div>}
          </ErrorBoundary>
        )}
        {page==='settings' && <SettingsPage onBack={()=>setPage('analytics')} />}
      </div>
      {tweaksOpen && <Tweaks val={tweaks} onChange={setTweaks} onClose={()=>setTweaksOpen(false)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// Page 2 — Requests & Approvals — wired to backend

const { useState: useR, useMemo: useRM, useEffect: useRE } = React;

// Safe access helper
const _mock = (key, fallback) => (window.MOCK && window.MOCK[key]) || fallback;

window.PasswordGate = ({ onUnlock }) => {
  const [pwd, setPwd] = useR('');
  const [err, setErr] = useR('');
  const submit = (e) => {
    e && e.preventDefault();
    const correctPwd = window.REQ_PASSWORD || '2026';
    if (pwd === correctPwd) { onUnlock(); }
    else { setErr('Incorrect password. Contact your manager for access.'); setPwd(''); }
  };
  return (
    <div className="pwd-wrap">
      <form className="pwd-card" onSubmit={submit}>
        <div className="pwd-icon"><Icon name="lock" size={18} /></div>
        <h2>Requests — Manager Access</h2>
        <p>This area contains approval controls that write directly to the master Google Sheet. Enter your manager password to continue.</p>
        <input autoFocus type="password" className="pwd-input" placeholder="Enter password"
          value={pwd} onChange={(e) => { setPwd(e.target.value); setErr(''); }} />
        {err && <div className="pwd-err"><Icon name="warn" size={12} /> {err}</div>}
        <button className="btn primary" style={{ width:'100%', justifyContent:'center', height:36, marginTop:8, fontSize:13 }} type="submit">
          Continue <Icon name="chevronRight" size={11} />
        </button>
      </form>
    </div>
  );
};

const TypeBadge = ({ rt }) => (
  <span className="type-badge"><span className="d" style={{ background: rt?.color || 'var(--fg-3)' }} />{rt?.label || 'Other'}</span>
);
const StatusBadge = ({ s }) => (
  <span className={"status-badge " + (s||'').replace(/\s/g,'')}>{s}</span>
);
const DaysPill = ({ h }) => {
  const hr = h || 0;
  const cls = hr > 48 ? 'bad' : hr > 24 ? 'warn' : 'good';
  const label = hr < 24 ? hr+'h' : Math.floor(hr/24)+'d '+(hr%24)+'h';
  return <span className={"days-pill "+cls}>{label}</span>;
};

window.ReqStrip = ({ rows }) => {
  const safeRows = rows || [];
  const total = safeRows.length;
  const pending = safeRows.filter(r => r.status==='Pending'||r.status==='Under Review').length;
  const approved = safeRows.filter(r => r.status==='Approved').length;
  const overdue = safeRows.filter(r => r.hoursPending>48&&(r.status==='Pending'||r.status==='Under Review')).length;
  const resolved = safeRows.filter(r => r.status==='Approved'||r.status==='Rejected'||r.status==='Done');
  const avgRes = resolved.length>0 ? (resolved.reduce((a,r)=>a+(r.hoursPending||0),0)/resolved.length) : 0;
  const cards = [
    { label:'Total Requests', val:total, unit:'', tone:'neutral', sub:'all cohorts' },
    { label:'Pending', val:pending, unit:'', tone:pending>0?'warn':'good', sub:'awaiting action' },
    { label:'Approved', val:approved, unit:'', tone:'good', sub:'this cohort' },
    { label:'Avg Resolution', val:avgRes.toFixed(1), unit:'hrs', tone:'neutral', sub:'raise → decision' },
    { label:'Overdue >48h', val:overdue, unit:'', tone:overdue>0?'bad':'good', sub:overdue>0?'needs attention':'all clear' },
  ];
  return (
    <div className="kpi-strip five">
      {cards.map(c => (
        <div key={c.label} className={"kpi-cell "+c.tone}>
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-row">
            <div className="kpi-value">{typeof c.val==='number'?c.val.toLocaleString():c.val}</div>
            {c.unit && <div className="kpi-unit">{c.unit}</div>}
          </div>
          <div className="kpi-foot">{c.sub}</div>
        </div>
      ))}
    </div>
  );
};

window.ReqFilterBar = ({ filters, setFilters }) => {
  const requestTypes = _mock('requestTypes', []);
  const lsms = _mock('lsms', []);
  const cohorts = _mock('cohorts', []);

  const typeOptions = [{ value:'all', label:'All types' }, ...requestTypes.map(t=>({ value:t.key, label:t.label, dot:t.color }))];
  const statusOptions = ['All','Pending','Under Review','Approved','Rejected','Done'].map(s=>({ value:s, label:s }));
  const lsmOptions = [{ value:'all', label:'All LSMs' }, ...lsms.map(n=>({ value:n, label:n }))];
  const daysOptions = [
    { value:'all', label:'Any age' },
    { value:'<24', label:'Under 24 hrs' },
    { value:'24-48', label:'24–48 hrs' },
    { value:'>48', label:'Over 48 hrs' },
  ];
  const cohortOptions = cohorts.map(c=>({ value:c.id, label:c.label }));
  return (
    <div className="req-filterbar">
      <span className="filter-label">Filters</span>
      <Select label="Cohort" value={filters.cohort} options={cohortOptions} onChange={(v)=>setFilters({...filters,cohort:v})} />
      <Select label="Type" value={filters.type} options={typeOptions} onChange={(v)=>setFilters({...filters,type:v})} />
      <Select label="Status" value={filters.status} options={statusOptions} onChange={(v)=>setFilters({...filters,status:v})} />
      <Select label="LSM" value={filters.lsm} options={lsmOptions} onChange={(v)=>setFilters({...filters,lsm:v})} />
      <Select label="Pending" value={filters.days} options={daysOptions} onChange={(v)=>setFilters({...filters,days:v})} />
      <span className="filter-meta">{filters._count} matching requests</span>
    </div>
  );
};

window.RequestsTable = ({ rows, onOpen, onApprove, onReject }) => (
  <div className="card">
    <div className="card-head">
      <h3>Requests queue <span className="chip indigo">{(rows||[]).length} rows</span></h3>
      <div className="card-head-actions">
        <button className="btn"><Icon name="download" size={12} /> Export</button>
      </div>
    </div>
    <div className="card-body" style={{ maxHeight:520, overflow:'auto' }}>
      <table className="dt">
        <thead>
          <tr>
            <th style={{width:32}}>#</th>
            <th style={{width:130}}>Raised</th>
            <th>Learner</th>
            <th>Batch · LSM</th>
            <th>Type</th>
            <th style={{minWidth:200}}>AI Classification</th>
            <th style={{width:70}}>Priority</th>
            <th style={{width:120}}>Status</th>
            <th style={{width:70}}>Pending</th>
            <th style={{width:80,textAlign:'right'}}>Action</th>
          </tr>
        </thead>
        <tbody>
          {(rows||[]).map(r => (
            <tr key={r.id} onClick={()=>onOpen(r)} style={{cursor:'pointer'}}>
              <td className="muted" style={{fontFamily:'var(--mono)',fontSize:11}}>{r.sr}</td>
              <td className="muted" style={{fontFamily:'var(--mono)',fontSize:11}}>{fmt.dt(r.raised)}</td>
              <td>
                <div className="name-cell">
                  <div className="mini-avatar" style={{background:avatarBg(r.learner),width:22,height:22,fontSize:9}}>{initials(r.learner)}</div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500}}>{r.learner}</div>
                    <div style={{fontSize:10.5,color:'var(--fg-3)',fontFamily:'var(--mono)'}}>{r.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <div style={{fontSize:11.5}}>{r.batch}</div>
                <div style={{fontSize:10.5,color:'var(--fg-3)'}}>{r.lsm}</div>
              </td>
              <td><TypeBadge rt={r.requestType} /></td>
              <td>
                <div className="ai-extract">
                  {Object.entries(r.classification||{}).slice(0,3).map(([k,v])=>(
                    <div key={k} className="ln"><span className="k">{k}:</span><span className="v">{v}</span></div>
                  ))}
                </div>
              </td>
              <td><span className={"pri-badge "+(r.priority||'')}>{r.priority}</span></td>
              <td><StatusBadge s={r.status} /></td>
              <td><DaysPill h={r.hoursPending} /></td>
              <td onClick={e=>e.stopPropagation()} style={{textAlign:'right'}}>
                {(r.status==='Pending'||r.status==='Under Review') ? (
                  <div style={{display:'inline-flex',gap:4,justifyContent:'flex-end'}}>
                    <button className="act-btn approve" title="Approve" onClick={()=>onApprove(r)}><Icon name="check" size={12} /></button>
                    <button className="act-btn reject" title="Reject" onClick={()=>onReject(r)}><Icon name="x" size={12} /></button>
                  </div>
                ) : (
                  <span style={{fontSize:10.5,color:'var(--fg-3)',fontFamily:'var(--mono)'}}>{r.status}</span>
                )}
              </td>
            </tr>
          ))}
          {(rows||[]).length===0 && (
            <tr><td colSpan={10}><div className="empty">No requests match the current filters.</div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

window.SidePanel = ({ req, onClose, onApprove, onReject, allRows }) => {
  const [note, setNote] = useR('');
  const history = (allRows||[]).filter(r=>r.email===req.email&&r.id!==req.id).slice(0,4);
  const canAct = req.status==='Pending'||req.status==='Under Review';
  return (
    <>
      <div className="side-panel-backdrop" onClick={onClose} />
      <div className="side-panel">
        <div className="sp-head">
          <div><div className="sp-title">REQUEST</div><div className="sp-id">{req.id}</div></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={12} /></button>
        </div>
        <div className="sp-body">
          <div className="sp-learner">
            <div className="big-avatar" style={{background:avatarBg(req.learner)}}>{initials(req.learner)}</div>
            <div style={{minWidth:0,flex:1}}>
              <div className="n">{req.learner}</div>
              <div className="e">{req.email}</div>
            </div>
            <span className={"risk-pill "+(req.risk||'')}>
              <span style={{width:5,height:5,borderRadius:'50%',background:'currentColor'}} />
              {req.risk} risk
            </span>
          </div>
          <div className="sp-section">
            <div className="sp-section-title">Learner snapshot</div>
            <dl className="sp-kv">
              <dt>Batch</dt><dd>{req.batch}</dd>
              <dt>LSM</dt><dd>{req.lsm}</dd>
              <dt>Program</dt><dd>{req.program}</dd>
              <dt>Sale status</dt><dd>
                <span style={{
                  display:'inline-block',padding:'1px 7px',borderRadius:4,fontSize:10.5,fontWeight:500,fontFamily:'var(--mono)',
                  background:req.saleStatus==='Active'?'var(--green-soft)':req.saleStatus==='Refunded'?'var(--red-soft)':'var(--amber-soft)',
                  color:req.saleStatus==='Active'?'var(--green)':req.saleStatus==='Refunded'?'var(--red)':'var(--amber)'
                }}>{req.saleStatus}</span>
              </dd>
              <dt>Raised</dt><dd>{fmt.dt(req.raised)} · <span style={{color:'var(--fg-2)'}}>{fmt.relTime(req.raised)}</span></dd>
              <dt>Priority</dt><dd><span className={"pri-badge "+(req.priority||'')}>{req.priority}</span></dd>
            </dl>
          </div>
          <div className="sp-section">
            <div className="sp-section-title">Request — {req.requestType?.label}</div>
            <div className="sp-body-text">{req.body}</div>
          </div>
          <div className="sp-section">
            <div className="sp-section-title">AI extracted fields</div>
            <div className="ai-kv-block">
              <div className="kvrow"><div className="k">Request Type</div><div className="v">{req.requestType?.label}</div></div>
              {Object.entries(req.classification||{}).map(([k,v])=>(
                <div key={k} className="kvrow"><div className="k">{k}</div><div className="v">{v}</div></div>
              ))}
              <div className="kvrow"><div className="k">Confidence</div><div className="v" style={{fontFamily:'var(--mono)',color:'var(--green)'}}>{req.confidence||'—'}</div></div>
            </div>
          </div>
          <div className="sp-section">
            <div className="sp-section-title">Request history ({history.length})</div>
            {history.length===0 && <div style={{fontSize:11.5,color:'var(--fg-3)',fontStyle:'italic'}}>No prior requests from this learner.</div>}
            {history.map(h=>(
              <div key={h.id} className="history-row">
                <div className={"history-dot "+(h.status==='Approved'?'approved':h.status==='Rejected'?'rejected':'pending')} />
                <div className="history-body">
                  <div><strong style={{fontWeight:500}}>{h.requestType?.label}</strong> — {h.status}</div>
                  <div className="history-meta">{fmt.dt(h.raised)} · {h.id}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="sp-section">
            <div className="sp-section-title">Manager notes</div>
            <textarea className="textarea" placeholder="Add internal notes..." value={note} onChange={e=>setNote(e.target.value)} />
          </div>
        </div>
        {canAct ? (
          <div className="sp-foot">
            <button className="btn danger" onClick={()=>{onClose();onReject(req);}}><Icon name="x" size={12} /> Reject</button>
            <button className="btn success" onClick={()=>{onClose();onApprove(req);}}><Icon name="check" size={12} /> Approve</button>
          </div>
        ) : (
          <div className="sp-foot" style={{justifyContent:'center'}}>
            <StatusBadge s={req.status} />
            <span style={{fontSize:11.5,color:'var(--fg-3)',marginLeft:8}}>No further action required</span>
          </div>
        )}
      </div>
    </>
  );
};

window.ConfirmModal = ({ kind, req, onClose, onConfirm }) => {
  const [note, setNote] = useR('');
  const [err, setErr] = useR('');
  const [loading, setLoading] = useR(false);
  const isApprove = kind==='approve';
  const confirm = async () => {
    if (!note.trim()) { setErr(isApprove?'Manager note is required.':'Rejection reason is required.'); return; }
    setLoading(true); setErr('');
    try { await onConfirm(note); }
    catch(e) { setLoading(false); setErr('API error: '+e.message+'. UI updated anyway.'); await onConfirm(note, true); }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div className="reason-icon" style={{width:32,height:32,
              background:isApprove?'var(--green-soft)':'var(--red-soft)',
              color:isApprove?'var(--green)':'var(--red)',
              borderColor:isApprove?'rgba(74,222,128,0.3)':'rgba(248,113,113,0.3)'
            }}><Icon name={isApprove?'check':'x'} size={14} /></div>
            <div>
              <div style={{fontSize:14,fontWeight:600}}>{isApprove?'Confirm approval':'Confirm rejection'}</div>
              <div style={{fontSize:11.5,color:'var(--fg-2)',fontFamily:'var(--mono)'}}>{req.id} · {req.requestType?.label}</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} disabled={loading}><Icon name="x" size={12} /></button>
        </div>
        <div className="modal-body">
          {req.risk==='High'&&isApprove && (
            <div className="warning-box">
              <Icon name="warn" size={15} />
              <div><strong>High-risk learner.</strong> Prior refund signals detected. Consider discussing with LSM before approving.</div>
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
            <div>
              <div style={{fontSize:10.5,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--fg-2)',fontWeight:600,marginBottom:6}}>Summary</div>
              <div className="ai-kv-block">
                <div className="kvrow"><div className="k">Learner</div><div className="v">{req.learner}</div></div>
                <div className="kvrow"><div className="k">Email</div><div className="v" style={{fontFamily:'var(--mono)',fontSize:10.5}}>{req.email}</div></div>
                <div className="kvrow"><div className="k">Batch</div><div className="v">{req.batch}</div></div>
                <div className="kvrow"><div className="k">LSM</div><div className="v">{req.lsm}</div></div>
                <div className="kvrow"><div className="k">Risk</div><div className="v"><span className={"risk-pill "+(req.risk||'')} style={{marginLeft:0}}>{req.risk}</span></div></div>
              </div>
            </div>
            <div>
              <div style={{fontSize:10.5,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--fg-2)',fontWeight:600,marginBottom:6}}>AI extracted details</div>
              <div className="ai-kv-block">
                <div className="kvrow"><div className="k">Type</div><div className="v">{req.requestType?.label}</div></div>
                {Object.entries(req.classification||{}).map(([k,v])=>(
                  <div key={k} className="kvrow"><div className="k">{k}</div><div className="v">{v}</div></div>
                ))}
              </div>
            </div>
          </div>
          <div className="field">
            <label>{isApprove?'Manager note':'Rejection reason'}<span className="req">*</span></label>
            <textarea className="textarea" rows={3}
              placeholder={isApprove?'e.g. Shifted to B-48 as requested, Ops team notified.':'e.g. Attendance claim not supported by Zoom log — resubmit with evidence.'}
              value={note} onChange={e=>{setNote(e.target.value);setErr('');}} />
            <div style={{fontSize:10.5,color:'var(--fg-2)',fontFamily:'var(--mono)',marginTop:4}}>
              Saved to audit trail in master sheet · posted to <strong style={{color:'var(--fg)'}}>#refund-audit</strong>
            </div>
            {err && <div className="pwd-err" style={{marginTop:6}}><Icon name="warn" size={11} /> {err}</div>}
          </div>
        </div>
        <div className="modal-foot">
          <div style={{fontSize:11,color:'var(--fg-2)',fontFamily:'var(--mono)'}}>
            Manager · {new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
          </div>
          <div className="modal-foot-actions">
            <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button className={"btn "+(isApprove?'success':'danger')} onClick={confirm} disabled={loading}>
              {loading?<><Icon name="refresh" size={12} style={{animation:'spin 0.8s linear infinite'}} /> Saving…</>:
               isApprove?<><Icon name="check" size={12} /> Confirm approve</>:
               <><Icon name="x" size={12} /> Confirm reject</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

window.Toast = ({ msg, tone='good', onDone }) => {
  useRE(() => { const t=setTimeout(onDone,3000); return ()=>clearTimeout(t); }, []);
  return (
    <div style={{
      position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',
      background:'var(--bg-3)',color:'var(--fg)',border:'1px solid var(--border-3)',
      borderRadius:8,padding:'10px 18px',fontSize:12.5,zIndex:300,
      boxShadow:'0 12px 40px rgba(0,0,0,0.5)',display:'flex',alignItems:'center',gap:10
    }}>
      <Icon name={tone==='bad'?'warn':'check'} size={14} style={{color:tone==='bad'?'var(--red)':'var(--green)',flexShrink:0}} />
      {msg}
    </div>
  );
};

window.TypeBreakdown = ({ rows }) => {
  const safeRows = rows || [];
  const requestTypes = _mock('requestTypes', []);
  const byType = requestTypes.map(t=>({t,count:safeRows.filter(r=>r.requestType?.key===t.key).length}))
    .filter(b=>b.count>0).sort((a,b)=>b.count-a.count);
  const max = Math.max(...byType.map(b=>b.count),1);
  const total = byType.reduce((a,b)=>a+b.count,0)||1;
  return (
    <div className="card">
      <div className="card-head">
        <h3>Request type breakdown <span className="chip">{total} reqs</span></h3>
        <span className="hint">current cohort</span>
      </div>
      <div className="card-body" style={{paddingTop:4,paddingBottom:4}}>
        {byType.length===0&&<div className="empty">No requests yet.</div>}
        {byType.map(b=>(
          <div key={b.t.key} className="tb-row">
            <div className="lab"><span className="d" style={{background:b.t.color}} />{b.t.label}</div>
            <div className="bar"><div className="f" style={{width:(b.count/max)*100+'%',background:b.t.color+'cc'}} /></div>
            <div className="v">{b.count} · {((b.count/total)*100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.LSMTable = ({ rows }) => {
  const safeRows = rows || [];
  const allLsms = [...new Set(safeRows.map(r=>r.lsm).filter(Boolean))];
  const byLsm = allLsms.map(n=>{
    const all = safeRows.filter(r=>r.lsm===n);
    return { name:n, raised:all.length,
      approved:all.filter(r=>r.status==='Approved').length,
      rejected:all.filter(r=>r.status==='Rejected').length,
      pending:all.filter(r=>r.status==='Pending'||r.status==='Under Review').length };
  }).sort((a,b)=>b.raised-a.raised);
  return (
    <div className="card">
      <div className="card-head">
        <h3>LSM activity <span className="chip">{byLsm.length} LSMs</span></h3>
        <span className="hint">this cohort</span>
      </div>
      <div className="card-body" style={{maxHeight:340,overflow:'auto'}}>
        <table className="dt">
          <thead><tr><th>LSM</th><th className="num">Raised</th><th className="num">Approved</th><th className="num">Rejected</th><th className="num">Pending</th></tr></thead>
          <tbody>
            {byLsm.map(l=>(
              <tr key={l.name}>
                <td>
                  <div className="name-cell">
                    <div className="mini-avatar" style={{background:avatarBg(l.name),width:22,height:22,fontSize:9}}>{initials(l.name)}</div>
                    <span style={{fontSize:12,fontWeight:500}}>{l.name}</span>
                  </div>
                </td>
                <td className="num">{l.raised}</td>
                <td className="num" style={{color:l.approved?'var(--green)':'var(--fg-2)'}}>{l.approved}</td>
                <td className="num" style={{color:l.rejected?'var(--red)':'var(--fg-2)'}}>{l.rejected}</td>
                <td className="num" style={{color:l.pending?'var(--amber)':'var(--fg-2)'}}>{l.pending}</td>
              </tr>
            ))}
            {byLsm.length===0&&<tr><td colSpan={5}><div className="empty">No LSM activity.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

Object.assign(window, {
  PasswordGate:window.PasswordGate, ReqStrip:window.ReqStrip,
  ReqFilterBar:window.ReqFilterBar, RequestsTable:window.RequestsTable,
  SidePanel:window.SidePanel, ConfirmModal:window.ConfirmModal,
  Toast:window.Toast, TypeBreakdown:window.TypeBreakdown, LSMTable:window.LSMTable,
});
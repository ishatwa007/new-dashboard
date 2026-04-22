// Page 1 — Analytics components. GTN only in Overall KPIs + Program table + AVP.
// PSAs, Weeks, Sources all show Rate only.

const { useState: useS1 } = React;

// ── KPI Strip ─────────────────────────────────────────────────────────────────
window.KPIStrip = ({ cohort, compare, liveKpis }) => {
  const _cohorts = (window.MOCK && window.MOCK.cohorts) || [];
  const _kpisByCohort = (window.MOCK && window.MOCK.kpisByCohort) || {};
  const cur = liveKpis || _kpisByCohort[cohort?.id] || {};
  const idx = _cohorts.findIndex(c => c.id === cohort?.id);
  const prev = (!liveKpis && idx >= 0 && idx < _cohorts.length - 1)
    ? _kpisByCohort[_cohorts[idx + 1]?.id]
    : null;
  const sparkN = compare === 'Last 6' ? 6 : compare === 'Last 3' ? 3 : 4;
  const spark = idx >= 0 ? _cohorts.slice(idx, idx + sparkN).reverse() : [];
  const gtnSpark = spark.map(c => (_kpisByCohort[c.id] || {}).gtn || 0).filter(Boolean);

  if (!cur.sales && !cur.total) return null;

  const sales     = cur.sales || cur.total || 0;
  const gtn       = cur.gtn || 0;
  const complete  = cur.complete  || 0;
  const pending   = cur.pending   || 0;
  const pctComp   = cur.pct_complete || 0;
  const refRateTotal    = cur.refund_rate_total    || cur.pct_total  || 0;
  const refRateComplete = cur.refund_rate_complete || cur.pct_c      || 0;
  const preMng    = cur.preMng  || cur.pre_mng || 0;
  const fecRef    = cur.fecRefunds || cur.fec_refunds || 0;
  const probable  = cur.probableConverted || cur.probable_total || 0;

  const cards = [
    { key:'sales',       label:'Total Sales',          val:fmt.int(sales),              unit:'learners', prev:prev?.sales,             curRaw:sales,         tone:'neutral' },
    { key:'complete',    label:'Complete Sales',        val:fmt.int(complete),           unit:'',         prev:prev?.complete,          curRaw:complete,      tone:'good' },
    { key:'pending',     label:'Pending Sales',         val:fmt.int(pending),            unit:'',         prev:prev?.pending,           curRaw:pending,       tone:'warn', inverse:true },
    { key:'pctComp',     label:'% Complete',            val:pctComp.toFixed(1),          unit:'%',        prev:prev?.pctComplete,       curRaw:pctComp,       tone:pctComp>=75?'good':'warn' },
    { key:'gtn',         label:'GTN',                   val:gtn.toFixed(1),              unit:'%',        prev:prev?.gtn,               curRaw:gtn,           tone:gtn>=78?'good':'bad', showSpark:true,
      hint:'Academy, DSML, DevOps, AIML only' },
    { key:'refRateComp', label:'Refund Rate (Complete)',val:refRateComplete.toFixed(1),  unit:'%',        prev:prev?.refRateComplete,   curRaw:refRateComplete, tone:refRateComplete<=10?'good':refRateComplete>=15?'bad':'warn', inverse:true },
    { key:'refRateTotal',label:'Refund Rate (Total)',   val:refRateTotal.toFixed(1),     unit:'%',        prev:prev?.refRateTotal,      curRaw:refRateTotal,  tone:refRateTotal<=8?'good':refRateTotal>=12?'bad':'warn', inverse:true },
    { key:'preMng',      label:'Pre-MnG Refunds',       val:fmt.int(preMng),             unit:'',         prev:prev?.preMng,            curRaw:preMng,        tone:'bad', inverse:true },
    { key:'fecRef',      label:'First Call Refunds',    val:fmt.int(fecRef),             unit:'',         prev:prev?.fecRefunds,        curRaw:fecRef,        tone:fecRef>0?'bad':'good', inverse:true },
    { key:'probable',    label:'Probable Identified',   val:fmt.int(probable),           unit:'',         prev:prev?.probableConverted, curRaw:probable,      tone:'good' },
  ];

  return (
    <div className="kpi-strip">
      {cards.map(c => {
        const d = fmt.delta(c.curRaw, c.prev, c.unit);
        let deltaClass = 'neutral';
        if (d && !d.neutral) deltaClass = c.inverse ? (d.positive?'down':'up') : (d.positive?'up':'down');
        return (
          <div key={c.key} className={"kpi-cell "+c.tone}>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-row">
              <div className="kpi-value">{c.val}</div>
              {c.unit && <div className="kpi-unit">{c.unit}</div>}
            </div>
            <div className="kpi-foot">
              {d && <span className={"kpi-delta "+deltaClass}>{d.sign}{d.abs}{d.unit} vs prev</span>}
            </div>
            {c.showSpark && gtnSpark.length > 1 && (
              <div className="kpi-spark">
                <Sparkline data={gtnSpark} color="var(--indigo)" width={58} height={20} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Program Table — keeps GTN ──────────────────────────────────────────────
window.ProgramTable = ({ programs }) => {
  const src = programs || MOCK.programs;
  const rows = [...src].sort((a, b) => b.rate - a.rate);
  const totalSales   = rows.reduce((a, r) => a + r.sales, 0);
  const totalRefunds = rows.reduce((a, r) => a + r.refunds, 0);
  const overallRate  = totalSales > 0 ? (totalRefunds / totalSales) * 100 : 0;
  const overallGTN   = totalSales > 0 ? ((totalSales - totalRefunds) / totalSales) * 100 : 0;
  const maxRate      = Math.max(...rows.map(r => r.rate), 1);
  return (
    <div className="card">
      <div className="card-head">
        <h3>Program breakdown <span className="chip">{rows.length} programs</span></h3>
        <span className="hint">sorted by refund rate · GTN shown for programs</span>
      </div>
      <div className="card-body">
        <table className="dt">
          <thead><tr><th>Program</th><th className="num">Sales</th><th className="num">Refunds</th><th className="num">Rate</th><th className="num">GTN</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key||r.name}>
                <td><div className="name-cell"><span className="sw" style={{background:colorFor(r.key||r.name)}} /><span style={{fontWeight:500}}>{r.name}</span></div></td>
                <td className="num">{fmt.int(r.sales)}</td>
                <td className="num muted">{fmt.int(r.refunds)}</td>
                <td className="num">
                  <div className="cell-bar" style={{justifyContent:'flex-end'}}>
                    <div className="track" style={{maxWidth:64}}>
                      <div className={"fill "+(r.rate<=10?'good':r.rate>=13?'bad':'amber')} style={{width:(r.rate/maxRate)*100+'%'}} />
                    </div>
                    <span className={"rate-pill "+rateClass(r.rate,{good:10,bad:13})}>{r.rate.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="num" style={{color:(r.gtn||0)>=78?'var(--green)':'var(--red)'}}>{(r.gtn||0).toFixed(1)}%</td>
              </tr>
            ))}
            <tr className="total">
              <td>Total</td>
              <td className="num">{fmt.int(totalSales)}</td>
              <td className="num">{fmt.int(totalRefunds)}</td>
              <td className="num"><span className={"rate-pill "+rateClass(overallRate,{good:10,bad:13})}>{overallRate.toFixed(1)}%</span></td>
              <td className="num" style={{color:overallGTN>=78?'var(--green)':'var(--red)'}}>{overallGTN.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── PSA Table — NO GTN. Shows Assigned, Complete, Req, Retained (#), Retained %, Rate ──
window.PSATable = ({ psas }) => {
  const [sortKey, setSortKey] = useS1('rate');
  const [dir, setDir]         = useS1('desc');
  const src  = psas || MOCK.psas;
  const rows = [...src].sort((a,b) => dir==='desc' ? (b[sortKey]||0)-(a[sortKey]||0) : (a[sortKey]||0)-(b[sortKey]||0));
  const toggle = (k) => { if (sortKey===k) setDir(dir==='desc'?'asc':'desc'); else { setSortKey(k); setDir('desc'); } };
  const th = (k,label,num) => (
    <th className={num?'num':''} onClick={()=>toggle(k)} style={{cursor:'pointer',userSelect:'none'}}>
      {label} {sortKey===k && <span style={{color:'var(--indigo)',fontFamily:'var(--mono)'}}>{dir==='desc'?'↓':'↑'}</span>}
    </th>
  );
  return (
    <div className="card">
      <div className="card-head">
        <h3>PSA performance <span className="chip">{rows.length} PSAs</span></h3>
        <span className="hint">retained % = retained ÷ requested from complete</span>
      </div>
      <div className="card-body" style={{maxHeight:480,overflow:'auto'}}>
        <table className="dt">
          <thead>
            <tr>
              {th('name','PSA')}
              {th('assigned','Assigned',true)}
              {th('complete','Complete',true)}
              {th('refReq','Req',true)}
              {th('refunds','Refunded',true)}
              {th('retained','Retained',true)}
              {th('retained_pct','Retained %',true)}
              {th('rate','Rate',true)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.email||r.name}>
                <td>
                  <div className="name-cell">
                    <div className="mini-avatar" style={{background:avatarBg(r.name||r.email),width:24,height:24,fontSize:9}}>
                      {initials(r.name||r.email||'?')}
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:500}}>{r.name||r.email}</div>
                      <div style={{fontSize:10,color:'var(--fg-3)',fontFamily:'var(--mono)'}}>
                        {r.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="num">{r.assigned||r.total||0}</td>
                <td className="num">{r.complete||0}</td>
                <td className="num" style={{color:'var(--amber)'}}>{r.refReq||0}</td>
                <td className="num" style={{color:'var(--red)'}}>{r.refunds||0}</td>
                <td className="num" style={{color:'var(--green)'}}>{r.retained||0}</td>
                <td className="num">
                  <span className={"rate-pill "+rateClass(100-(r.retained_pct||0),{good:40,bad:70})}>
                    {(r.retained_pct||0).toFixed(1)}%
                  </span>
                </td>
                <td className="num"><span className={"rate-pill "+rateClass(r.rate,{good:9,bad:13})}>{(r.rate||0).toFixed(1)}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Source Table — NO GTN, Rate only ──────────────────────────────────────
window.SourceTable = ({ sources }) => {
  const [expanded, setExpanded] = useS1(null);
  const src = sources || MOCK.sources;
  const rows = [...src].map(r => ({
    key:     r.key || (r.name||r.source||'unknown').toLowerCase().replace(/\s+/g,'_'),
    name:    r.name || r.source || 'Unknown',
    sales:   r.sales || r.total || 0,
    refunds: r.refunds || r.ref_c || 0,
    rate:    r.rate || r.pct_c || 0,
    sub:     r.sub || [],
  })).sort((a,b) => b.sales - a.sales);

  const totalSales = rows.reduce((a,r) => a + r.sales, 0);

  return (
    <div className="card">
      <div className="card-head">
        <h3>Source breakdown <span className="chip">{rows.length} channels</span></h3>
        <span className="hint">click channel to drill into sub-sources</span>
      </div>
      <div className="card-body">
        <table className="dt">
          <thead>
            <tr>
              <th style={{width:20}}></th>
              <th>Channel</th>
              <th className="num">Sales</th>
              <th className="num">Share</th>
              <th className="num">Refunds</th>
              <th className="num">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <React.Fragment key={r.key}>
                <tr
                  className={expanded===r.key ? 'expanded selected' : ''}
                  onClick={() => setExpanded(expanded===r.key ? null : r.key)}
                  style={{cursor:'pointer'}}
                >
                  <td style={{paddingRight:0}}>
                    <Icon name="chevronRight" size={11} className="drill-arrow"
                      style={{transform: expanded===r.key ? 'rotate(90deg)' : 'none', transition:'transform 0.15s'}} />
                  </td>
                  <td style={{fontWeight:500}}>{r.name}</td>
                  <td className="num">{fmt.int(r.sales)}</td>
                  <td className="num" style={{color:'var(--fg-2)',fontFamily:'var(--mono)',fontSize:11}}>
                    {totalSales > 0 ? ((r.sales/totalSales)*100).toFixed(0) : 0}%
                  </td>
                  <td className="num" style={{color:'var(--fg-2)'}}>{fmt.int(r.refunds)}</td>
                  <td className="num">
                    <span className={"rate-pill "+rateClass(r.rate,{good:9,bad:14})}>{(r.rate||0).toFixed(1)}%</span>
                  </td>
                </tr>
                {expanded===r.key && (
                  <tr className="sub-row">
                    <td colSpan={6}>
                      <div className="sub-table">
                        {r.sub && r.sub.length > 0 ? (
                          <table><tbody>
                            {r.sub.map(s => (
                              <tr key={s.name||s.key}>
                                <td style={{width:20,paddingLeft:8,color:'var(--fg-2)',fontSize:12}}>└</td>
                                <td style={{color:'var(--fg)'}}>{s.name||s.source}</td>
                                <td className="num">{fmt.int(s.sales||s.total||0)}</td>
                                <td className="num" style={{color:'var(--fg-2)',fontFamily:'var(--mono)',fontSize:11}}>
                                  {r.sales > 0 ? (((s.sales||0)/r.sales)*100).toFixed(0) : 0}%
                                </td>
                                <td className="num" style={{color:'var(--fg-2)'}}>{fmt.int(s.refunds||s.ref_c||0)}</td>
                                <td className="num">
                                  <span className={"rate-pill "+rateClass(s.rate||s.pct_c||0,{good:9,bad:14})}>
                                    {(s.rate||s.pct_c||0).toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody></table>
                        ) : (
                          <div style={{padding:'8px 14px',color:'var(--fg-2)',fontSize:11.5,fontStyle:'italic'}}>
                            No sub-source breakdown available.
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Persona Card ──────────────────────────────────────────────────────────
window.PersonaCard = ({ title, data, hint }) => {
  if (!data || !Array.isArray(data) || data.length === 0) return (
    <div className="card">
      <div className="card-head"><h3>{title}</h3><span className="hint">{hint}</span></div>
      <div className="card-body"><div className="empty">No data available.</div></div>
    </div>
  );
  const max = Math.max(...data.map(d => (d.active||0) + (d.refunded||0)), 1);
  const totalActive   = data.reduce((a,d) => a+(d.active||0), 0);
  const totalRefunded = data.reduce((a,d) => a+(d.refunded||0), 0);
  const overallRate   = totalActive+totalRefunded > 0 ? (totalRefunded/(totalActive+totalRefunded))*100 : 0;
  return (
    <div className="card">
      <div className="card-head"><h3>{title}</h3><span className="hint">{hint}</span></div>
      <div className="card-body">
        <div style={{display:'flex',gap:14,padding:'8px 14px 6px',fontSize:10,color:'var(--fg-2)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,borderBottom:'1px solid var(--border)'}}>
          <div style={{width:110}}>Segment</div>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:10}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:4}}><span style={{width:7,height:7,background:'var(--fg-2)',borderRadius:2}} /> Active</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:4}}><span style={{width:7,height:7,background:'var(--red)',borderRadius:2}} /> Refunded</span>
          </div>
          <div style={{width:68,textAlign:'right'}}>n</div>
          <div style={{width:56,textAlign:'right'}}>Rate</div>
        </div>
        {data.map(d => {
          const aPct = ((d.active||0)/max)*100;
          const rPct = ((d.refunded||0)/max)*100;
          const rate = d.rate != null ? d.rate : (((d.active||0)+(d.refunded||0))>0 ? (d.refunded||0)/((d.active||0)+(d.refunded||0))*100 : 0);
          return (
            <div key={d.label} className="persona-row">
              <div className="persona-label">{d.label}</div>
              <div className="persona-bar-wrap">
                <div className="persona-bar">
                  <div className="a" style={{width:aPct+'%'}} />
                  <div className="r" style={{width:rPct+'%'}} />
                </div>
              </div>
              <div className="persona-count">{((d.active||0)+(d.refunded||0)).toLocaleString()}</div>
              <div className="persona-rate"><span className={"rate-pill "+rateClass(rate,{good:10,bad:17})}>{rate.toFixed(1)}%</span></div>
            </div>
          );
        })}
        <div style={{padding:'9px 14px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--fg-2)',fontFamily:'var(--mono)'}}>
          <span>total {(totalActive+totalRefunded).toLocaleString()}</span>
          <span>cohort rate {overallRate.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

// ── Engagement Card ───────────────────────────────────────────────────────
window.EngagementCard = ({ engagement }) => {
  const data = engagement || MOCK.engagement;
  return (
    <div className="card">
      <div className="card-head">
        <h3>Engagement signals <span className="chip">active vs refunded</span></h3>
        <span className="hint">% hitting each signal</span>
      </div>
      <div className="card-body">
        <div className="eng-head"><div>Signal</div><div>Active</div><div>Refunded</div><div style={{textAlign:'right'}}>Gap</div></div>
        {data.map(d => {
          const gap = (d.active||0) - (d.refunded||0);
          return (
            <div key={d.metric||d.signal} className="eng-row">
              <div>
                <div className="eng-metric-name">{d.metric||d.signal}</div>
                <div className="eng-metric-desc">{d.desc||''}</div>
              </div>
              <div className="eng-bars"><div className="track"><div className="fill" style={{width:(d.active||0)+'%',background:'var(--green)'}} /></div><div className="v">{(d.active||0).toFixed(1)}%</div></div>
              <div className="eng-bars"><div className="track"><div className="fill" style={{width:(d.refunded||0)+'%',background:'var(--red)'}} /></div><div className="v">{(d.refunded||0).toFixed(1)}%</div></div>
              <div className={"eng-gap "+(gap>=40?'bad':'ok')}>−{Math.abs(gap).toFixed(0)}pp</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Week Card — NO GTN, Rate only ─────────────────────────────────────────
window.WeekCard = ({ weekPattern }) => {
  const data = weekPattern || MOCK.weekPattern;
  const max   = Math.max(...data.map(d => d.pct||0), 1);
  const total = data.reduce((a,d) => a+(d.count||0), 0);
  const w12pct = data.filter(d => d.week==='W1'||d.week==='W2').reduce((a,d) => a+(d.pct||0), 0);
  return (
    <div className="card">
      <div className="card-head">
        <h3>Week-wise refund distribution <span className="chip">{total} refunds</span></h3>
        <span className="hint">post-class-start exits</span>
      </div>
      <div className="card-body">
        {data.map(d => (
          <div key={d.week} style={{borderBottom:'1px solid var(--border)'}}>
            <div className="week-bar-bg">
              <div className="label">{d.week}</div>
              <div className="t"><div className="f" style={{width:((d.pct||0)/max)*100+'%'}} /></div>
              <div className="v">{d.count||0} · {(d.pct||0).toFixed(1)}%</div>
              <div className="note" style={{color:'var(--fg-2)'}}>
                {d.rate != null ? `rate ${d.rate.toFixed(1)}%` : ''}
              </div>
            </div>
          </div>
        ))}
        <div style={{padding:'10px 14px',fontSize:11,color:'var(--fg-2)',fontFamily:'var(--mono)',display:'flex',justifyContent:'space-between'}}>
          <span>{w12pct.toFixed(1)}% in weeks 1–2</span>
          <span>{total} total refunds</span>
        </div>
      </div>
    </div>
  );
};

// ── Reasons Table — AI classified ─────────────────────────────────────────
window.ReasonsTable = ({ reasons }) => {
  const [selected, setSelected] = useS1(null);
  const src = reasons || MOCK.reasons;
  const rows = [...src].sort((a,b) => b.count - a.count);
  const max = Math.max(...rows.map(r => r.pct||0), 1);
  const iconFor = (cat) => {
    if (!cat) return 'info';
    const c = cat.toLowerCase();
    if (c.includes('financial')) return 'wallet';
    if (c.includes('time')) return 'clock';
    if (c.includes('first call')) return 'zap';
    if (c.includes('career') || c.includes('mismatch')) return 'book';
    if (c.includes('medical')) return 'heart';
    if (c.includes('push') || c.includes('regret')) return 'alertTriangle';
    if (c.includes('dnp') || c.includes('engagement')) return 'frown';
    return 'info';
  };
  if (rows.length === 0) return (
    <div className="card">
      <div className="card-head"><h3>Refund reasons</h3><span className="hint">AI-classified</span></div>
      <div className="card-body"><div className="empty" style={{padding:'28px',textAlign:'center',color:'var(--fg-2)'}}>
        No reasons filed yet. Fill the LSM tracker to see classified reasons here.
      </div></div>
    </div>
  );

  return (
    <>
      <div className="card">
        <div className="card-head">
          <h3>Refund reasons breakdown <span className="chip">{rows.reduce((a,r)=>a+r.count,0)} classified</span></h3>
          <span className="hint">AI-classified via Groq · emails without reasons → Other</span>
        </div>
        <div className="card-body">
          <table className="dt">
            <thead><tr><th>Category</th><th style={{width:'32%'}}>Share</th><th className="num">Count</th><th className="num">%</th><th className="num">Retained</th><th style={{width:110}}></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.category}>
                  <td>
                    <div className="reason-cat">
                      <div className={"reason-icon "+(r.sentiment||'neutral')}><Icon name={iconFor(r.category)} size={13} /></div>
                      <div>
                        <div className="reason-name">{r.category}</div>
                        <div style={{fontSize:10.5,color:'var(--fg-2)',fontFamily:'var(--mono)',marginTop:1}}>
                          {r.sentiment==='bad'?'actionable':r.sentiment==='ok'?'positive outcome':'neutral'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><div className="cell-bar"><div className="reason-bar"><div className="reason-fill" style={{width:((r.pct||0)/max)*100+'%'}} /></div></div></td>
                  <td className="num">{r.count}</td>
                  <td className="num">{(r.pct||0).toFixed(1)}%</td>
                  <td className="num" style={{color:'var(--green)'}}>{r.retained||0} ({(r.retention_rate||0).toFixed(0)}%)</td>
                  <td style={{textAlign:'right'}}>
                    {r.examples && r.examples.length > 0 && (
                      <button className="btn-ghost" onClick={()=>setSelected(r)}>
                        <Icon name="eye" size={11} /> {r.examples.length} quotes
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selected && (
        <div className="modal-backdrop" onClick={()=>setSelected(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div className={"reason-icon "+(selected.sentiment||'neutral')} style={{width:30,height:30}}><Icon name={iconFor(selected.category)} size={15} /></div>
                <div>
                  <div style={{fontSize:14,fontWeight:600}}>{selected.category}</div>
                  <div style={{fontSize:11.5,color:'var(--fg-2)',fontFamily:'var(--mono)'}}>{selected.count} learners · {(selected.pct||0).toFixed(1)}% · {selected.retained||0} retained</div>
                </div>
              </div>
              <button className="icon-btn" onClick={()=>setSelected(null)}><Icon name="x" size={12} /></button>
            </div>
            <div className="modal-body">
              <div style={{fontSize:11,color:'var(--fg-2)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:10}}>Sample reasons — LSM notes</div>
              {(selected.examples||[]).map((e,i) => (
                <div key={i} className="quote">{e}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── GTN Chart ─────────────────────────────────────────────────────────────
window.GTNChart = ({ gtnTrend }) => {
  const data = gtnTrend || MOCK.gtnTrend;
  if (!data || data.length < 2) return null;
  const target = 78;
  const w = 1100, h = 170, padL = 44, padR = 24, padT = 16, padB = 28;
  const innerW = w-padL-padR, innerH = h-padT-padB;
  const minV = Math.min(...data.map(d=>d.value), target) - 2;
  const maxV = Math.max(...data.map(d=>d.value), target) + 2;
  const xp = (i) => padL + (i/(data.length-1))*innerW;
  const yp = (v) => padT + innerH - ((v-minV)/(maxV-minV))*innerH;
  const d = data.map((p,i) => `${i===0?'M':'L'}${xp(i)},${yp(p.value)}`).join(' ');
  const area = d+` L${xp(data.length-1)},${padT+innerH} L${xp(0)},${padT+innerH} Z`;
  const latest = data[data.length-1]?.value || 0;
  const diff = (latest-target).toFixed(1);
  const ticks = [Math.ceil(minV), Math.round((minV+maxV)/2), Math.floor(maxV)];
  return (
    <div className="card">
      <div className="card-head">
        <h3>GTN trend <span className="chip indigo">target 78%</span></h3>
        <div className="gtn-legend">
          <div className="gtn-legend-item"><span className="sw" style={{background:'var(--indigo)'}} /> GTN</div>
          <div className="gtn-legend-item"><span className="sw" style={{background:'var(--fg-2)'}} /> Target</div>
        </div>
      </div>
      <div className="gtn-chart">
        <div className="gtn-chart-head">
          <div className="gtn-chart-sub">last {data.length} cohorts · gross-to-net revenue retention</div>
          <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--fg-2)'}}>
            latest <span style={{color:'var(--fg)',fontWeight:500}}>{latest.toFixed(1)}%</span>
            <span style={{color:diff>=0?'var(--green)':'var(--red)',marginLeft:10}}>
              {diff>=0?'+':''}{diff}pp {diff>=0?'above':'below'} target
            </span>
          </div>
        </div>
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <defs><linearGradient id="gtnfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--indigo)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--indigo)" stopOpacity="0" />
          </linearGradient></defs>
          {ticks.map(t => (
            <g key={t}>
              <line x1={padL} x2={w-padR} y1={yp(t)} y2={yp(t)} stroke="var(--border)" strokeWidth="1" />
              <text x={padL-8} y={yp(t)+3} fontSize="10" fill="var(--fg-2)" textAnchor="end" fontFamily="var(--mono)">{t}%</text>
            </g>
          ))}
          <line x1={padL} x2={w-padR} y1={yp(target)} y2={yp(target)} stroke="var(--fg-2)" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
          <text x={w-padR} y={yp(target)-4} fontSize="10" fill="var(--fg-2)" textAnchor="end" fontFamily="var(--mono)">target 78%</text>
          <path d={area} fill="url(#gtnfill)" />
          <path d={d} fill="none" stroke="var(--indigo)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((p,i) => (
            <g key={i}>
              <circle cx={xp(i)} cy={yp(p.value)} r="3.5" fill="var(--bg)" stroke="var(--indigo)" strokeWidth="1.8" />
              <text x={xp(i)} y={yp(p.value)-10} fontSize="10.5" fill="var(--fg)" textAnchor="middle" fontFamily="var(--mono)" fontWeight="500">{p.value.toFixed(1)}</text>
              <text x={xp(i)} y={h-8} fontSize="10.5" fill="var(--fg-2)" textAnchor="middle" fontFamily="var(--mono)">{p.cohort}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

Object.assign(window, {
  KPIStrip:window.KPIStrip, ProgramTable:window.ProgramTable, PSATable:window.PSATable,
  SourceTable:window.SourceTable, PersonaCard:window.PersonaCard,
  EngagementCard:window.EngagementCard, WeekCard:window.WeekCard,
  ReasonsTable:window.ReasonsTable, GTNChart:window.GTNChart,
});

// ── Batch / Program Refund Card ───────────────────────────────────────────
window.BatchRefundCard = ({ programRefunds }) => {
  const data = programRefunds || [];
  const progColors = { academy:'#7c7aed', dsml:'#4ade80', aiml:'#fbbf24', devops:'#f472b6' };
  if (!data.length) return (
    <div className="card">
      <div className="card-head"><h3>Program refund breakdown</h3><span className="hint">batch proxy</span></div>
      <div className="card-body"><div className="empty">No program data available.</div></div>
    </div>
  );
  const maxTotal = Math.max(...data.map(d => d.total||0), 1);
  return (
    <div className="card">
      <div className="card-head">
        <h3>Batch-wise refund breakdown <span className="chip">{data.length} batches</span></h3>
        <span className="hint">refund requested vs refunded</span>
      </div>
      <div className="card-body">
        <div style={{display:'flex',gap:14,padding:'8px 14px 6px',fontSize:10,color:'var(--fg-2)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,borderBottom:'1px solid var(--border)'}}>
          <div style={{width:100}}>Batch</div>
          <div style={{flex:1,display:'flex',gap:10,alignItems:'center'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:4}}><span style={{width:7,height:7,background:'var(--fg-2)',borderRadius:2}} /> Active</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:4}}><span style={{width:7,height:7,background:'var(--amber)',borderRadius:2}} /> Ref Req</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:4}}><span style={{width:7,height:7,background:'var(--red)',borderRadius:2}} /> Refunded</span>
          </div>
          <div style={{width:60,textAlign:'right'}}>Rate</div>
        </div>
        {data.map(d => {
          const color = progColors[(d.key||d.label||'').toLowerCase()] || 'var(--indigo)';
          const total = d.total || 0;
          const active = d.active || 0;
          const refReq = d.refReq || 0;
          const refunded = d.refunded || 0;
          const aPct = (active/maxTotal)*100;
          const rPct = (refReq/maxTotal)*100;
          const rfPct = (refunded/maxTotal)*100;
          return (
            <div key={d.key||d.label} style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:100,display:'flex',alignItems:'center',gap:6}}>
                <span style={{width:8,height:8,borderRadius:2,background:color,flexShrink:0}} />
                <span style={{fontSize:11.5,fontWeight:500}}>{d.label}</span>
              </div>
              <div style={{flex:1,position:'relative',height:18,borderRadius:3,background:'var(--bg-3)',overflow:'hidden'}}>
                <div style={{position:'absolute',left:0,top:0,height:'100%',width:aPct+'%',background:'var(--fg-3)',opacity:0.5}} />
                <div style={{position:'absolute',left:0,top:0,height:'100%',width:rPct+'%',background:'var(--amber)',opacity:0.7}} />
                <div style={{position:'absolute',left:0,top:0,height:'100%',width:rfPct+'%',background:'var(--red)',opacity:0.8}} />
              </div>
              <div style={{width:60,textAlign:'right',fontFamily:'var(--mono)',fontSize:11}}>
                <span className={"rate-pill "+rateClass(d.rate,{good:9,bad:13})}>{(d.rate||0).toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Compare Table ──────────────────────────────────────────────────────────
window.CompareTable = ({ compareData, compare, currentCohort, currentCohortId }) => {
  if (!compareData || compareData.length < 2 || compare === 'Single') return null;
  const cols = ['total','complete','ref_req','ref_c','rate','gtn'];
  const labels = { total:'Total Sales', complete:'Completed', ref_req:'Ref Requested', ref_c:'Refunded', rate:'Rate %', gtn:'GTN %' };
  return (
    <div className="card" style={{marginTop:0}}>
      <div className="card-head">
        <h3>Cohort comparison <span className="chip indigo">{compare}</span></h3>
        <span className="hint">side-by-side KPI comparison</span>
      </div>
      <div className="card-body">
        <table className="dt">
          <thead>
            <tr>
              <th>Metric</th>
              {compareData.map(c => (
                <th key={c.cohort_id} className="num" style={{color:c.cohort_id===(currentCohortId||currentCohort?.id)?'var(--indigo)':'var(--fg)'}}>
                  {c.label}
                  {c.cohort_id===(currentCohortId||currentCohort?.id) && <span style={{fontSize:9,marginLeft:4,opacity:0.7}}>◀ current</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map(col => (
              <tr key={col}>
                <td style={{fontWeight:500,color:'var(--fg)'}}>{labels[col]}</td>
                {compareData.map(c => {
                  const val = c[col]||0;
                  const isPct = col==='rate'||col==='gtn';
                  const isCurrent = c.cohort_id===(currentCohortId||currentCohort?.id);
                  let color = 'inherit';
                  if (col==='rate') color = val<=9?'var(--green)':val>=13?'var(--red)':'var(--amber)';
                  if (col==='gtn')  color = val>=78?'var(--green)':'var(--red)';
                  return (
                    <td key={c.cohort_id} className="num" style={{
                      fontWeight: isCurrent?600:400,
                      background: isCurrent?'var(--indigo-soft)':'transparent',
                      color,
                    }}>
                      {isPct ? `${val.toFixed(1)}%` : val.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

Object.assign(window, {
  BatchRefundCard: window.BatchRefundCard,
  CompareTable: window.CompareTable,
});


// ── Hierarchy Filter Bar ────────────────────────────────────────────────────
window.HierarchyFilter = ({ level, setLevel }) => {
  const levels = [
    { id: 'overall',  label: 'Overall' },
    { id: 'program',  label: 'Program' },
    { id: 'avp',      label: 'AVP' },
    { id: 'bdm',      label: 'BDM' },
    { id: 'bda',      label: 'BDA' },
    { id: 'psa',      label: 'PSA' },
  ];
  return (
    <div className="hierarchy-filter" style={{
      display:'flex', gap:4, padding:'10px 0', marginBottom:4, flexWrap:'wrap',
    }}>
      {levels.map(l => (
        <button key={l.id} onClick={() => setLevel(l.id)}
          className={"btn " + (level === l.id ? 'primary' : '')}
          style={{
            padding:'6px 16px', fontSize:12, fontWeight:600, borderRadius:20,
            border: level === l.id ? '1px solid var(--indigo)' : '1px solid var(--border-2)',
            background: level === l.id ? 'var(--indigo-soft)' : 'var(--bg-1)',
            color: level === l.id ? 'var(--indigo)' : 'var(--fg-2)',
            cursor:'pointer', fontFamily:'var(--sans)', transition:'all 0.15s',
          }}>
          {l.label}
        </button>
      ))}
    </div>
  );
};


// ── Hierarchy Table (AVP / BDM / BDA) ──────────────────────────────────────
window.HierarchyTable = ({ hierarchy, level }) => {
  const [sortKey, setSortKey] = useS1('rate');
  const [sortDir, setSortDir] = useS1('desc');

  if (!hierarchy) return null;

  // Flatten data based on level
  let rows = [];
  let showGTN = false;

  if (level === 'avp') {
    rows = hierarchy.avps || [];
    showGTN = true;
  } else if (level === 'bdm') {
    const all = [];
    Object.values(hierarchy.bdms_by_avp || {}).forEach(arr => arr.forEach(r => all.push(r)));
    rows = all;
  } else if (level === 'bda') {
    const all = [];
    Object.values(hierarchy.bdas_by_bdm || {}).forEach(arr => arr.forEach(r => all.push(r)));
    rows = all;
  }

  if (rows.length === 0) {
    return (
      <div className="card" style={{ textAlign:'center', padding:'40px', color:'var(--fg-3)' }}>
        No {level.toUpperCase()} data available. Make sure backend is running.
      </div>
    );
  }

  // Sort
  const sorted = [...rows].sort((a,b) => {
    const av = a[sortKey] || 0, bv = b[sortKey] || 0;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const toggle = (k) => {
    if (sortKey === k) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const maxRate = Math.max(...sorted.map(r => r.rate || r.pct_c || 0), 1);

  const Sortable = ({ k, label, num }) => (
    <th className={num ? 'num' : ''} onClick={() => toggle(k)}
      style={{ cursor:'pointer', userSelect:'none', padding:'10px 12px', fontSize:11, fontWeight:600,
        textTransform:'uppercase', letterSpacing:0.3, color:'var(--fg-3)', textAlign: num ? 'right' : 'left',
        borderBottom:'1.5px solid var(--border)', background:'var(--bg-2)', whiteSpace:'nowrap' }}>
      {label} {sortKey === k ? (sortDir === 'desc' ? '\u2193' : '\u2191') : ''}
    </th>
  );

  return (
    <div className="card">
      <div className="card-head">
        <h3>{level.toUpperCase()} Breakdown <span className="chip">{sorted.length}</span></h3>
        <span className="hint">
          {showGTN ? 'GTN shown for AVP level' : 'Rate only (no GTN)'}
        </span>
      </div>
      <div className="dt" style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <Sortable k="display_name" label="Name" />
            {level !== 'avp' && <Sortable k="parent" label="Reports To" />}
            <Sortable k="total" label="Sales" num />
            <Sortable k="complete" label="Complete" num />
            <Sortable k="refunded" label="Refunded" num />
            <Sortable k="rate" label="Rate %" num />
            {showGTN && <Sortable k="gtn" label="GTN %" num />}
            <Sortable k="under_ret" label="Pending" num />
            <Sortable k="pre_mng" label="Pre-MnG" num />
            <th style={{ width:120, padding:'10px 12px', fontSize:11, fontWeight:600, color:'var(--fg-3)',
              borderBottom:'1.5px solid var(--border)', background:'var(--bg-2)' }}></th>
          </tr></thead>
          <tbody>
            {sorted.map((r, i) => {
              const rate = r.rate || r.pct_c || 0;
              const barW = (rate / maxRate) * 100;
              const barColor = rate > 12 ? 'var(--red)' : rate > 10 ? 'var(--amber)' : 'var(--green)';
              const parentName = r.parent ? (r.parent.split('@')[0] || '').replace(/\./g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : '';
              return (
                <tr key={r.email || i} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'var(--fg)', whiteSpace:'nowrap' }}>
                    {r.display_name}
                    <div style={{ fontSize:10, color:'var(--fg-3)', fontWeight:400 }}>{r.email}</div>
                  </td>
                  {level !== 'avp' && (
                    <td style={{ padding:'10px 12px', fontSize:12, color:'var(--fg-2)' }}>{parentName}</td>
                  )}
                  <td style={{ padding:'10px 12px', fontSize:13, textAlign:'right', color:'var(--fg-2)' }}>{r.total || 0}</td>
                  <td style={{ padding:'10px 12px', fontSize:13, textAlign:'right', color:'var(--fg-2)' }}>{r.complete || 0}</td>
                  <td style={{ padding:'10px 12px', fontSize:13, textAlign:'right', fontWeight:600,
                    color: (r.refunded || 0) > 0 ? 'var(--red)' : 'var(--fg-3)' }}>{r.refunded || 0}</td>
                  <td style={{ padding:'10px 12px', fontSize:13, textAlign:'right', fontWeight:700,
                    color: rate > 12 ? 'var(--red)' : rate > 10 ? 'var(--amber)' : 'var(--fg)' }}>
                    {rate.toFixed(1)}%
                  </td>
                  {showGTN && (
                    <td style={{ padding:'10px 12px', fontSize:13, textAlign:'right', fontWeight:700,
                      color: (r.gtn||0) >= 78 ? 'var(--green)' : 'var(--amber)' }}>
                      {(r.gtn||0).toFixed(1)}%
                    </td>
                  )}
                  <td style={{ padding:'10px 12px', fontSize:13, textAlign:'right', color:'var(--amber)' }}>{r.under_ret || 0}</td>
                  <td style={{ padding:'10px 12px', fontSize:13, textAlign:'right', color:'var(--red)' }}>{r.pre_mng || 0}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ height:6, borderRadius:3, background:'var(--bg-2)', overflow:'hidden' }}>
                      <div style={{ width:`${barW}%`, height:'100%', borderRadius:3, background:barColor, transition:'width 0.3s' }}></div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Settings page

const { useState: useSet, useEffect: useSetE } = React;

window.SettingsPage = ({ onBack }) => {
  const [cohorts, setCohorts]       = useSet((window.MOCK && window.MOCK.settingsCohorts) || []);
  const [showAdd, setShowAdd]       = useSet(false);
  const [newCoh, setNewCoh]         = useSet({ name: '', funnel: '', tracker: '' });
  const [slack, setSlack]           = useSet('');
  const [testResult, setTestResult] = useSet(null);
  const [pwd, setPwd]               = useSet('');
  const [pwd2, setPwd2]             = useSet('');
  const [saveToast, setSaveToast]   = useSet(null);
  const [psTrackers, setPsTrackers] = useSet([]);
  const [psLoading, setPsLoading]   = useSet(true);

  useSetE(() => {
    const base = window.API_BASE || 'http://localhost:8000';
    fetch(`${base}/api/settings/postsales`)
      .then(r => r.json())
      .then(d => setPsTrackers(d.trackers || []))
      .catch(() => {})
      .finally(() => setPsLoading(false));
  }, []);

  const addCohort = () => {
    if (!newCoh.name) return;
    setCohorts([...cohorts, newCoh]);
    setNewCoh({ name: '', funnel: '', tracker: '' });
    setShowAdd(false);
    setSaveToast('Cohort added');
  };

  const removeCohort = (i) => setCohorts(cohorts.filter((_, idx) => idx !== i));

  const testSlack = () => {
    setTestResult('sending');
    setTimeout(() => setTestResult('ok'), 900);
  };

  return (
    <div className="settings-wrap">

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button className="btn" onClick={onBack}>
          <Icon name="chevron" size={11} style={{ transform: 'rotate(90deg)' }} /> Back
        </button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}>Settings</h2>
        <span style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>
          scaler.ops · manager config
        </span>
      </div>

      {/* Post Sales Trackers */}
      <div className="settings-section">
        <div className="settings-section-head">
          <h3>Post Sales Trackers</h3>
          <p>One Post Sales Google Sheet per cohort. Used for Classroom page data. Add a new one each month via Render env vars.</p>
        </div>
        <div className="settings-body">
          <div style={{ background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)',
            borderRadius: 8, padding: '14px 16px', marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo)', marginBottom: 8 }}>
              How to add a new cohort tracker
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.8 }}>
              1. Open <strong>Render</strong> → your backend service → <strong>Environment</strong><br/>
              2. Add variable: <code style={{ background: 'var(--bg-2)', padding: '1px 7px',
                borderRadius: 4, fontSize: 11, fontFamily: 'var(--mono)' }}>SHEET_POSTSALES_MAY2026</code> = your-sheet-id<br/>
              3. Click <strong>Save Changes</strong> → auto-redeploys (~1 min)<br/>
              4. Tracker appears here after redeploy
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 220px', gap: 12,
            padding: '6px 0', fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase',
            letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
            <div>Cohort</div><div>Sheet ID</div><div>Env Variable</div>
          </div>

          {psLoading ? (
            <div style={{ padding: '20px 0', color: 'var(--fg-3)', fontSize: 12 }}>Loading...</div>
          ) : psTrackers.length === 0 ? (
            <div style={{ padding: '20px 0', color: 'var(--fg-3)', fontSize: 12 }}>
              No Post Sales trackers configured yet.
            </div>
          ) : psTrackers.map((t, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 220px',
              gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{t.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="sheet" size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
                <a href={t.sheet_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--indigo)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.sheet_id}
                </a>
              </div>
              <code style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--fg-3)',
                background: 'var(--bg-2)', padding: '3px 8px', borderRadius: 4 }}>
                {t.env_key}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Cohorts */}
      <div className="settings-section">
        <div className="settings-section-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h3>Cohorts</h3>
            <p>Funnel and LSM sheet URLs per cohort.</p>
          </div>
          <button className="btn primary" onClick={() => setShowAdd(!showAdd)}>
            <Icon name="plus" size={12} /> Add cohort
          </button>
        </div>
        <div className="settings-body">
          {showAdd && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 10 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Cohort name</label>
                  <input className="input" placeholder="Jun 2026" value={newCoh.name}
                    onChange={e => setNewCoh({ ...newCoh, name: e.target.value })} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Funnel sheet URL</label>
                  <input className="input" placeholder="https://sheets.google.com/..." value={newCoh.funnel}
                    onChange={e => setNewCoh({ ...newCoh, funnel: e.target.value })} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>LSM tracker URL</label>
                  <input className="input" placeholder="https://sheets.google.com/..." value={newCoh.tracker}
                    onChange={e => setNewCoh({ ...newCoh, tracker: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn primary" onClick={addCohort}><Icon name="check" size={12} /> Save</button>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 36px', gap: 10,
            padding: '6px 0 4px', fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase',
            letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
            <div>Cohort</div><div>Funnel sheet</div><div>LSM tracker</div><div></div>
          </div>
          {cohorts.map((c, i) => (
            <div key={i} className="cohort-item">
              <div className="nm">{c.name}</div>
              <div className="row-inline"><Icon name="sheet" size={13} style={{ color: 'var(--green)' }} /><span className="url">{c.funnel}</span></div>
              <div className="row-inline"><Icon name="sheet" size={13} style={{ color: 'var(--green)' }} /><span className="url">{c.tracker}</span></div>
              <button className="icon-btn" title="Remove" onClick={() => removeCohort(i)}><Icon name="x" size={11} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div className="settings-section">
        <div className="settings-section-head">
          <h3>Integrations</h3>
          <p>Post approval/rejection events to Slack.</p>
        </div>
        <div className="settings-body">
          <div className="field">
            <label><Icon name="slack" size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} /> Slack Webhook URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 11.5 }}
                value={slack} onChange={e => setSlack(e.target.value)}
                placeholder="https://hooks.slack.com/services/..." />
              <button className="btn" onClick={testSlack}>
                {testResult === 'sending' ? <><Icon name="refresh" size={12} className="spin" /> Sending…</>
                  : testResult === 'ok' ? <><Icon name="check" size={12} style={{ color: 'var(--green)' }} /> Sent</>
                  : <>Test webhook</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="settings-section">
        <div className="settings-section-head">
          <h3>Security</h3>
          <p>Manager password for Requests and Mentor pages. Default: <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>2026</code></p>
        </div>
        <div className="settings-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="field" style={{ margin: 0 }}>
              <label><Icon name="key" size={11} style={{ verticalAlign: '-2px' }} /> New password</label>
              <input className="input" type="password" placeholder="At least 8 characters" value={pwd} onChange={e => setPwd(e.target.value)} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Confirm password</label>
              <input className="input" type="password" placeholder="Re-enter password" value={pwd2} onChange={e => setPwd2(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn primary" style={{ height: 32 }}
                onClick={() => { setPwd(''); setPwd2(''); setSaveToast('Update REQ_PASSWORD in the HTML file to persist'); }}>
                <Icon name="check" size={12} /> Update
              </button>
            </div>
          </div>
        </div>
      </div>

      {saveToast && <Toast msg={saveToast} onDone={() => setSaveToast(null)} />}
    </div>
  );
};

Object.assign(window, { SettingsPage: window.SettingsPage });

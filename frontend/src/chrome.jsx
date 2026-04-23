// Sidebar, Header, FilterBar

const { useState: useStateC, useEffect: useEffectC, useRef: useRefC } = React;

window.Sidebar = ({ page, onPage, pendingCount, canAccess, role }) => {
  const user = sessionStorage.getItem('app-user') || '';
  const roleLabel = { admin: 'Admin', classroom: 'Classroom', program: 'Program' }[role] || role;

  // Renumber kbd shortcuts based on visible pages
  const allPages = [
    { id:'analytics', label:'Analytics',  icon:'analytics' },
    { id:'requests',  label:'Requests',   icon:'requests'  },
    { id:'mentor',    label:'Mentor',     icon:'requests'  },
    { id:'classroom', label:'Classroom',  icon:'graph'     },
  ];
  const visible = allPages.filter(p => !canAccess || canAccess(p.id));

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div className="brand-text">
          <div className="brand-title">Onboarding Dashboard</div>
          <div className="brand-sub">scaler.ops</div>
        </div>
      </div>

      <div className="nav-section-label">Workspace</div>
      {visible.map((p, i) => (
        <div key={p.id} className={"nav-item " + (page === p.id ? 'active' : '')} onClick={() => onPage(p.id)}>
          <Icon name={p.icon} className="ico" />
          <span>{p.label}</span>
          {p.id === 'requests' && pendingCount
            ? <span className="nav-badge">{pendingCount}</span>
            : <span className="nav-kbd">{i + 1}</span>
          }
        </div>
      ))}

      <div className="nav-section-label" style={{ marginTop: 'auto' }}></div>
      {(!canAccess || canAccess('settings')) && (
        <div className={"nav-item " + (page === 'settings' ? 'active' : '')} onClick={() => onPage('settings')}>
          <Icon name="settings" className="ico" />
          <span>Settings</span>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="avatar">{user.slice(0,2).toUpperCase()||'IC'}</div>
        <div className="avatar-info">
          <div className="n">{user || 'Ishatwa'}</div>
          <div className="r">{roleLabel}</div>
        </div>
      </div>
    </aside>
  );
};

window.Header = ({ title, subtitle, cohort, setCohort, compare, setCompare, onRefresh, refreshing, onSettings, showCohortCenter = true }) => {
  const [open, setOpen] = useStateC(false);
  const [searchOpen, setSearchOpen] = useStateC(false);
  const [searchVal, setSearchVal] = useStateC('');
  const ref = useRefC(null);
  const searchRef = useRefC(null);

  useEffectC(() => {
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
      if (!searchRef.current?.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      const cards = document.querySelectorAll('.card h3');
      for (const card of cards) {
        if (card.textContent.toLowerCase().includes(searchVal.toLowerCase())) {
          card.closest('.card').scrollIntoView({ behavior: 'smooth' });
          break;
        }
      }
      setSearchOpen(false);
      setSearchVal('');
    }
    if (e.key === 'Escape') { setSearchOpen(false); setSearchVal(''); }
  };

  return (
    <div className="header">
      <div className="header-left">
        <div>
          <div className="page-title">{title}</div>
          {subtitle && <div className="page-crumb">{subtitle}</div>}
        </div>
        <div className="live-pill"><div className="live-dot"></div>live</div>
      </div>

      {showCohortCenter ? (
        <div className="header-center">
          <div className="cohort-picker" ref={ref}>
            <button className="cohort-btn" onClick={() => setOpen(o=>!o)}>
              <Icon name="calendar" size={12} />
              <span>{cohort?.label || 'Select cohort'}</span>
              <Icon name="chevron" className="chevron" />
            </button>
            <div className="cohort-divider"></div>
            <div className="compare-toggle">
              {['Single','Last 3','Last 6'].map(v => (
                <button key={v} className={compare===v?'on':''} onClick={()=>setCompare(v)}>{v}</button>
              ))}
            </div>
            {open && (
              <div className="cohort-dropdown">
                {(window.MOCK?.cohorts||[]).map(c => (
                  <div key={c.id} className={"cohort-row "+(c.id===cohort?.id?'active':'')}
                    onClick={()=>{setCohort(c);setOpen(false);}}>
                    <span className="cohort-row-label">{c.label}</span>
                    <span className="cohort-row-size">{(c.size||0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : <div></div>}

      <div className="header-right" style={{display:'flex',alignItems:'center',gap:8,justifyContent:'flex-end'}}>
        <div ref={searchRef} style={{position:'relative'}}>
          <button className="icon-btn" onClick={()=>setSearchOpen(o=>!o)} title="Search"><Icon name="search" size={13} /></button>
          {searchOpen && (
            <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',background:'var(--bg-1)',border:'1px solid var(--border-2)',borderRadius:6,padding:4,minWidth:240,boxShadow:'0 4px 18px rgba(0,0,0,0.35)'}}>
              <input autoFocus type="text" value={searchVal} onChange={e=>setSearchVal(e.target.value)}
                onKeyDown={handleSearch} placeholder="Find a card..."
                style={{width:'100%',background:'transparent',border:0,outline:'none',color:'var(--fg)',padding:'5px 8px',fontSize:12,fontFamily:'var(--sans)'}} />
            </div>
          )}
        </div>
        <button className="icon-btn" onClick={onRefresh} disabled={refreshing} title="Refresh">
          <Icon name={refreshing?'loading':'refresh'} size={13} className={refreshing?'spin':''} />
        </button>
        <button className="icon-btn" onClick={() => window._goToSettings?.()} title="Settings">
          <Icon name="settings" size={13} />
        </button>
      </div>
    </div>
  );
};

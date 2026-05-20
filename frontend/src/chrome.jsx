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
        <div style={{display:'flex',flexDirection:'column',gap:5,width:'100%'}}>
          <svg width="92" viewBox="0 0 129 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
            <path d="M4.33911 8.70972C4.33911 9.48278 4.84727 9.91884 7.8591 10.4595C13.8634 11.5372 15.0703 13.3453 15.0703 15.9116C15.0703 17.4818 14.3141 21.1332 7.31302 21.1332C4.67327 21.1332 0.840413 20.4454 0.0657275 15.8413L0.0286758 15.6209H4.29102L4.33451 15.7506C4.83245 17.2495 5.37206 17.9179 7.67864 17.9179C10.3934 17.9179 10.7072 16.9995 10.7072 16.3088C10.7072 15.3497 10.0944 14.759 6.74196 14.1896C0.816346 13.1768 0 11.1382 0 9.08655C0 6.02856 2.77581 4.05196 7.0696 4.05196C13.4718 4.05196 14.3336 7.7802 14.4456 8.92269L14.4659 9.13005H10.2138L10.1749 8.99304C9.93243 8.1413 9.35855 7.27009 6.9474 7.27009C5.75714 7.27009 4.33911 7.52007 4.33911 8.70972Z" fill="currentColor"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M46.816 21.0138H51.6373L45.3452 4.25102H39.7334L33.4145 21.0138H38.1266L39.4067 17.2291H45.5627L46.816 21.0138ZM42.4852 7.47562L44.6918 14.2572H40.2786L42.4852 7.47562Z" fill="currentColor"/>
            <path d="M58.4191 17.6355H67.4352V21.0138H53.7338V4.25102H58.4191V17.6355Z" fill="currentColor"/>
            <path d="M69.6241 4.25102V21.0138H83.6004V17.6355H74.3095V14.2063H83.0238V11.0317H74.3095V7.6284H83.6254V4.25102H69.6241Z" fill="currentColor"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M102.222 21.0138L97.5388 14.2452C98.2496 14.0239 98.867 13.7147 99.3899 13.3175C100.57 12.4204 101.161 11.1169 101.161 9.40595C101.161 7.84872 100.565 6.5998 99.3761 5.65916C98.1867 4.71946 96.5206 4.24915 94.3779 4.24915H85.7978V21.0138H90.4007V14.8923H93.208L97.0473 21.0138H102.222ZM90.3998 7.55245H93.7226C94.6306 7.55245 95.3118 7.72188 95.7653 8.06073C96.2189 8.39959 96.4466 8.93286 96.4466 9.66054C96.4466 10.3882 96.2189 10.9474 95.7653 11.2863C95.3109 11.6251 94.6297 11.7945 93.7226 11.7945H90.3998V7.55245Z" fill="currentColor"/>
            <path d="M20.4933 12.6676C20.4933 15.47 22.4361 17.3939 24.9759 17.3939C26.8428 17.3939 28.2821 16.1422 28.88 14.1989H32.8952C32.2038 19.0752 29.0327 21.036 24.9759 21.036C19.8398 21.036 16.3097 17.6355 16.3097 12.6667C16.3097 7.69781 19.8398 4.2973 24.9759 4.2973C28.1072 4.2973 31.281 5.49437 32.4953 9.03285L28.7282 10.3095C28.0609 8.67826 26.703 7.94132 24.9759 7.94132C22.4361 7.94132 20.4933 9.86517 20.4933 12.6676Z" fill="currentColor"/>
            <path d="M124.852 4.90184V4.85172H115.409L114.37 5.89278C114.24 6.02258 114.111 6.15148 113.981 6.28128C112.832 7.43424 111.685 8.59078 110.534 9.74195C109.955 10.3202 109.368 10.8913 108.785 11.466C108.784 11.4678 108.782 11.4696 108.78 11.4714L108.556 11.6889V21.148H117.912C118.013 21.0594 118.119 20.9752 118.214 20.8804C119.419 19.6764 120.622 18.4688 121.827 17.2657C122.336 16.7582 122.853 16.2605 123.363 15.7547C123.765 15.3564 124.164 14.9562 124.561 14.5534C124.663 14.4505 124.755 14.3377 124.85 14.2294V8.48246C124.85 7.30533 124.85 6.1291 124.85 4.95197C124.85 4.93496 124.85 4.91706 124.85 4.90184H124.852ZM115.186 18.074C115.186 18.2567 115.182 18.2593 115.003 18.2593C114.023 18.2593 113.042 18.2593 112.063 18.2593C111.897 18.2593 111.73 18.2692 111.565 18.2719C111.431 18.2746 111.372 18.2146 111.373 18.0723C111.376 16.9479 111.376 15.8236 111.373 14.6993C111.373 14.5686 111.417 14.5015 111.552 14.5033C111.595 14.5033 111.637 14.4988 111.679 14.4988C112.769 14.4988 113.858 14.4988 114.949 14.4988C115.178 14.4988 115.187 14.5086 115.187 14.7423C115.187 15.2901 115.187 15.838 115.187 16.3858C115.187 16.9479 115.187 17.5101 115.187 18.0723L115.186 18.074ZM121.185 9.35792H121.182C121.182 11.8232 121.182 14.2884 121.185 16.7528L117.97 19.9727V19.6119V11.7005H109.743L112.86 8.57825C112.895 8.57019 112.933 8.56571 112.973 8.56571C115.227 8.5675 117.48 8.5684 119.734 8.56571V8.56392H121.184V9.35703L121.185 9.35792Z" fill="#0055FF"/>
          </svg>
          <div className="brand-sub" style={{fontSize:10,color:'var(--fg-4)',fontFamily:'var(--mono)',letterSpacing:'0.04em'}}>Refund Audit · ops</div>
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

window.Header = ({ title, subtitle, cohort, setCohort, compare, setCompare, onRefresh, refreshing, onSettings, onExport, showCohortCenter = true }) => {
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
            <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',background:'var(--bg-1)',border:'1px solid var(--border-2)',borderRadius:0,padding:4,minWidth:240,boxShadow:'0 4px 16px rgba(11,21,41,0.08)'}}>
              <input autoFocus type="text" value={searchVal} onChange={e=>setSearchVal(e.target.value)}
                onKeyDown={handleSearch} placeholder="Find a card..."
                style={{width:'100%',background:'transparent',border:0,outline:'none',color:'var(--fg)',padding:'5px 8px',fontSize:12,fontFamily:'var(--sans)'}} />
            </div>
          )}
        </div>
        <button className="icon-btn" onClick={onRefresh} disabled={refreshing} title="Refresh">
          <Icon name={refreshing?'loading':'refresh'} size={13} className={refreshing?'spin':''} />
        </button>
        {onExport && (
          <button className="icon-btn" onClick={onExport} title="Export CSV"
            style={{fontSize:11,fontWeight:600,color:'var(--green)',padding:'4px 10px',
              borderRadius:0,border:'1px solid var(--green)',background:'var(--green-soft)',
              display:'flex',alignItems:'center',gap:4}}>
            ↓ CSV
          </button>
        )}
        <button className="icon-btn" onClick={() => window._goToSettings?.()} title="Settings">
          <Icon name="settings" size={13} />
        </button>
      </div>
    </div>
  );
};

// Icons + small shared primitives

window.Icon = ({ name, size = 14, className = '', style = {} }) => {
  const paths = {
    analytics: <><path d="M3 12h3v6H3zM9 8h3v10H9zM15 4h3v14h-3z" /></>,
    requests: <><path d="M4 4h12v3H4zM4 9h12v3H4zM4 14h8v3H4z" /></>,
    lock: <><path d="M6 10V7a4 4 0 018 0v3M4 10h12v8H4z" fill="none" stroke="currentColor" strokeWidth="1.6" /></>,
    chevron: <><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
    chevronRight: <><path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></>,
    refresh: <><path d="M15 4v4h-4M5 16v-4h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M14.5 8a5.5 5.5 0 00-9.5 2M5.5 12a5.5 5.5 0 009.5-2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
    download: <><path d="M10 3v10m-4-4l4 4 4-4M4 16h12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></>,
    x: <><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
    search: <><circle cx="9" cy="9" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
    up: <><path d="M10 4v12M5 9l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></>,
    down: <><path d="M10 16V4M5 11l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></>,
    dot: <><circle cx="10" cy="10" r="2.5" fill="currentColor" /></>,
    filter: <><path d="M3 5h14l-5 7v5l-4-2v-3L3 5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></>,
    info: <><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10 9v5M10 7v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
    eye: <><path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></>,
    bell: <><path d="M5 8a5 5 0 0110 0v4l2 3H3l2-3V8zM8 17a2 2 0 004 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></>,
    wallet: <><path d="M2 6a2 2 0 012-2h10l2 4v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="14" cy="11" r="1" fill="currentColor" /></>,
    clock: <><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10 6v4l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
    book: <><path d="M4 4h5a2 2 0 012 2v10a2 2 0 00-2-2H4V4zM16 4h-5a2 2 0 00-2 2v10a2 2 0 012-2h5V4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></>,
    user: <><circle cx="10" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M4 17a6 6 0 0112 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
    shuffle: <><path d="M3 5h3l8 10h3M3 15h3l2-2.5M13 6.5l1-1.5h3M14 12l3 3M17 2l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>,
    check: <><path d="M4 10l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
    heart: <><path d="M10 16s-6-4-6-8a3 3 0 016-1 3 3 0 016 1c0 4-6 8-6 8z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></>,
    frown: <><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="7.5" cy="9" r="0.8" fill="currentColor" /><circle cx="12.5" cy="9" r="0.8" fill="currentColor" /><path d="M7 14c1-1 5-1 6 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
    ban: <><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
    code: <><path d="M7 6l-4 4 4 4M13 6l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></>,
    cpu: <><rect x="5" y="5" width="10" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" /><rect x="8" y="8" width="4" height="4" fill="currentColor" opacity="0.3" /><path d="M8 2v3M12 2v3M8 15v3M12 15v3M2 8h3M2 12h3M15 8h3M15 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></>,
    graph: <><path d="M3 15l5-5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></>,
    settings: <><circle cx="10" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10 2v2.5M10 15.5V18M18 10h-2.5M4.5 10H2M15.7 4.3l-1.8 1.8M6.1 13.9l-1.8 1.8M15.7 15.7l-1.8-1.8M6.1 6.1L4.3 4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
    warn: <><path d="M10 2L18 17H2L10 2z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M10 8v4M10 14v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
    plus: <><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
    ext: <><path d="M7 3h10v10M17 3L8 12M13 11v6H3V7h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>,
    slack: <><rect x="3" y="8" width="6" height="2" rx="1" fill="currentColor" /><rect x="11" y="10" width="6" height="2" rx="1" fill="currentColor" /><rect x="10" y="3" width="2" height="6" rx="1" fill="currentColor" /><rect x="8" y="11" width="2" height="6" rx="1" fill="currentColor" /></>,
    sheet: <><rect x="3" y="3" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M3 8h14M3 13h14M8 3v14M13 3v14" stroke="currentColor" strokeWidth="1" /></>,
    key: <><circle cx="14" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M11 10H3l2 3m-2-3l2-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>,
    inbox: <><path d="M3 12l2-7h10l2 7v5H3v-5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M3 12h4l1 2h4l1-2h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></>,
    spark: <><path d="M10 2L12 8L18 10L12 12L10 18L8 12L2 10L8 8z" fill="currentColor" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" className={className} style={style}>
      {paths[name]}
    </svg>
  );
};

window.Sparkline = ({ data, width = 62, height = 18, color = 'currentColor', filled = true }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 3) - 1.5]);
  const d = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${d} L${width},${height} L0,${height} Z`;
  const gid = 'sg' + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={width} height={height} className="spark" style={{ color }}>
      {filled && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gid})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="1.5" fill={color} />
    </svg>
  );
};

window.fmt = {
  int: (n) => n.toLocaleString(),
  pct: (n, d = 1) => `${n.toFixed(d)}%`,
  delta: (a, b, unit = '') => {
    if (a == null || b == null) return null;
    const diff = a - b;
    const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
    const abs = Math.abs(diff).toFixed(unit === '%' ? 1 : 0);
    return { sign, abs, unit, positive: diff > 0, neutral: diff === 0 };
  },
  relTime: (date) => {
    const now = new Date('2026-05-20T14:22:00+05:30');
    const h = Math.floor((now - date) / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  },
  dt: (date) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}, ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  },
};

window.rateClass = (r, thresholds = { good: 10, bad: 15 }) => {
  if (r <= thresholds.good) return 'good';
  if (r >= thresholds.bad)  return 'bad';
  return 'ok';
};

window.colorFor = (key) => {
  const map = { Academy: '#7c7aed', DSML: '#4ade80', AIML: '#fbbf24', DevOps: '#f472b6', academy: '#7c7aed', dsml: '#4ade80', aiml: '#fbbf24', devops: '#f472b6' };
  return map[key] || '#6366f1';
};
window.initials = (name) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
window.avatarBg = (name) => {
  const palette = ['#7c7aed','#4ade80','#fbbf24','#f472b6','#22d3ee','#f97316','#a78bfa','#14b8a6'];
  const h = [...name].reduce((a,c) => a + c.charCodeAt(0), 0);
  return palette[h % palette.length];
};

// Shared custom select dropdown
const { useState: useStateS, useRef: useRefS, useEffect: useEffectS } = React;
window.Select = ({ label, value, options, onChange, width }) => {
  const [open, setOpen] = useStateS(false);
  const ref = useRefS(null);
  useEffectS(() => {
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);
  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  const current = opts.find(o => o.value === value) || opts[0];
  return (
    <div className="sel" ref={ref} style={{ width }} onClick={() => setOpen(!open)}>
      {label && <span className="lab">{label}</span>}
      <span className="val">{current?.label}</span>
      <Icon name="chevron" size={11} />
      {open && (
        <div className="sel-menu" onClick={(e) => e.stopPropagation()}>
          {opts.map(o => (
            <div key={o.value} className={"sel-item " + (o.value === value ? 'on' : '')}
                 onClick={() => { onChange(o.value); setOpen(false); }}>
              {o.dot && <span style={{ width: 7, height: 7, borderRadius: 2, background: o.dot, flexShrink: 0 }} />}
              <span>{o.label}</span>
              <Icon name="check" size={11} className="tick" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { Icon: window.Icon, Sparkline: window.Sparkline, fmt: window.fmt, rateClass: window.rateClass, colorFor: window.colorFor, initials: window.initials, avatarBg: window.avatarBg, Select: window.Select });

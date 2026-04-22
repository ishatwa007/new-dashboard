// Mock data for Scaler Refund Audit — May 2026 cohort

window.MOCK = (() => {
  const cohorts = [
    { id: 'may26', label: 'May 2026', size: 2418 },
    { id: 'apr26', label: 'Apr 2026', size: 2287 },
    { id: 'mar26', label: 'Mar 2026', size: 2102 },
    { id: 'feb26', label: 'Feb 2026', size: 2356 },
    { id: 'jan26', label: 'Jan 2026', size: 2180 },
    { id: 'dec25', label: 'Dec 2025', size: 1998 },
  ];

  const kpisByCohort = {
    may26: { sales: 2418, gtn: 76.4, refundRate: 11.8, refundsComplete: 184, refundsPending: 102, preMng: 43, probableConverted: 68 },
    apr26: { sales: 2287, gtn: 77.9, refundRate: 10.6, refundsComplete: 172, refundsPending: 70,  preMng: 38, probableConverted: 61 },
    mar26: { sales: 2102, gtn: 78.3, refundRate: 10.2, refundsComplete: 158, refundsPending: 56,  preMng: 34, probableConverted: 55 },
    feb26: { sales: 2356, gtn: 77.1, refundRate: 11.1, refundsComplete: 181, refundsPending: 80,  preMng: 41, probableConverted: 63 },
    jan26: { sales: 2180, gtn: 78.6, refundRate: 10.0, refundsComplete: 161, refundsPending: 57,  preMng: 32, probableConverted: 58 },
    dec25: { sales: 1998, gtn: 79.2, refundRate: 9.4,  refundsComplete: 144, refundsPending: 44,  preMng: 29, probableConverted: 49 },
  };

  const programs = [
    { key: 'academy', name: 'Academy',  sales: 892, refunds: 121, rate: 13.6, gtn: 74.2, preMng: 18, pending: 42 },
    { key: 'dsml',    name: 'DSML',     sales: 684, refunds: 78,  rate: 11.4, gtn: 76.8, preMng: 11, pending: 28 },
    { key: 'aiml',    name: 'AIML',     sales: 512, refunds: 49,  rate: 9.6,  gtn: 78.1, preMng: 9,  pending: 19 },
    { key: 'devops',  name: 'DevOps',   sales: 330, refunds: 38,  rate: 11.5, gtn: 75.3, preMng: 5,  pending: 13 },
  ];

  const psas = [
    { name: 'Aarav Mehta',      avp: 'N. Krishnan', bdm: 'R. Iyer',      assigned: 142, refunds: 12, rate: 8.5,  gtn: 81.2, probConv: 9 },
    { name: 'Priya Nair',       avp: 'N. Krishnan', bdm: 'R. Iyer',      assigned: 138, refunds: 18, rate: 13.0, gtn: 75.8, probConv: 6 },
    { name: 'Rohan Kapoor',     avp: 'S. Desai',    bdm: 'V. Kulkarni',  assigned: 156, refunds: 14, rate: 9.0,  gtn: 79.4, probConv: 8 },
    { name: 'Ananya Rao',       avp: 'S. Desai',    bdm: 'V. Kulkarni',  assigned: 129, refunds: 22, rate: 17.1, gtn: 71.2, probConv: 4 },
    { name: 'Kabir Singh',      avp: 'N. Krishnan', bdm: 'A. Bose',      assigned: 148, refunds: 15, rate: 10.1, gtn: 77.9, probConv: 7 },
    { name: 'Meera Pillai',     avp: 'S. Desai',    bdm: 'A. Bose',      assigned: 134, refunds: 11, rate: 8.2,  gtn: 80.5, probConv: 9 },
    { name: 'Vikram Shetty',    avp: 'N. Krishnan', bdm: 'R. Iyer',      assigned: 141, refunds: 19, rate: 13.5, gtn: 74.6, probConv: 5 },
    { name: 'Isha Chatterjee',  avp: 'S. Desai',    bdm: 'V. Kulkarni',  assigned: 127, refunds: 13, rate: 10.2, gtn: 78.0, probConv: 7 },
    { name: 'Dhruv Menon',      avp: 'N. Krishnan', bdm: 'A. Bose',      assigned: 145, refunds: 16, rate: 11.0, gtn: 76.3, probConv: 8 },
    { name: 'Tara Bhatnagar',   avp: 'S. Desai',    bdm: 'V. Kulkarni',  assigned: 132, refunds: 21, rate: 15.9, gtn: 72.8, probConv: 5 },
    { name: 'Arjun Reddy',      avp: 'N. Krishnan', bdm: 'R. Iyer',      assigned: 139, refunds: 14, rate: 10.1, gtn: 77.4, probConv: 8 },
    { name: 'Sneha Iyer',       avp: 'S. Desai',    bdm: 'A. Bose',      assigned: 144, refunds: 10, rate: 6.9,  gtn: 82.1, probConv: 10 },
  ];

  const sources = [
    { key: 'paid',    name: 'Paid Ads',       sales: 842, refunds: 118, rate: 14.0, gtn: 73.1,
      sub: [
        { name: 'Google Search',    sales: 412, refunds: 52, rate: 12.6, gtn: 75.4 },
        { name: 'Meta (FB/IG)',     sales: 278, refunds: 44, rate: 15.8, gtn: 71.2 },
        { name: 'LinkedIn Ads',     sales: 98,  refunds: 13, rate: 13.3, gtn: 74.8 },
        { name: 'YouTube Ads',      sales: 54,  refunds: 9,  rate: 16.7, gtn: 69.9 },
      ]},
    { key: 'organic', name: 'Organic',        sales: 521, refunds: 42, rate: 8.1, gtn: 80.4,
      sub: [
        { name: 'SEO / Direct',     sales: 312, refunds: 22, rate: 7.1, gtn: 81.6 },
        { name: 'YouTube Organic',  sales: 128, refunds: 13, rate: 10.2, gtn: 78.9 },
        { name: 'Blog',             sales: 81,  refunds: 7,  rate: 8.6, gtn: 80.1 },
      ]},
    { key: 'ref',     name: 'Referrals',      sales: 486, refunds: 31, rate: 6.4, gtn: 83.6,
      sub: [
        { name: 'Learner Referral', sales: 342, refunds: 19, rate: 5.6, gtn: 84.8 },
        { name: 'Employee Ref',     sales: 98,  refunds: 7,  rate: 7.1, gtn: 82.2 },
        { name: 'Partner Ref',      sales: 46,  refunds: 5,  rate: 10.9, gtn: 79.1 },
      ]},
    { key: 'inbound', name: 'Inbound Website', sales: 312, refunds: 38, rate: 12.2, gtn: 75.9,
      sub: [
        { name: 'Homepage Form',    sales: 184, refunds: 21, rate: 11.4, gtn: 76.6 },
        { name: 'Program Page',     sales: 98,  refunds: 12, rate: 12.2, gtn: 75.8 },
        { name: 'Webinar Signup',   sales: 30,  refunds: 5,  rate: 16.7, gtn: 71.3 },
      ]},
    { key: 'outbound',name: 'Outbound',       sales: 157, refunds: 28, rate: 17.8, gtn: 69.8,
      sub: [
        { name: 'Cold Call',        sales: 84,  refunds: 18, rate: 21.4, gtn: 66.2 },
        { name: 'Cold Email',       sales: 52,  refunds: 8,  rate: 15.4, gtn: 72.1 },
        { name: 'LinkedIn Outreach',sales: 21,  refunds: 2,  rate: 9.5,  gtn: 78.3 },
      ]},
    { key: 'events',  name: 'Events & Webinars', sales: 100, refunds: 9, rate: 9.0, gtn: 79.4,
      sub: [
        { name: 'Hiring Partner',   sales: 62,  refunds: 5,  rate: 8.1, gtn: 80.6 },
        { name: 'Campus Event',     sales: 38,  refunds: 4,  rate: 10.5, gtn: 77.8 },
      ]},
  ];

  const byProfession = [
    { label: 'SWE',        active: 842, refunded: 78,  rate: 9.3 },
    { label: 'Data Eng',   active: 312, refunded: 38,  rate: 12.2 },
    { label: 'Analyst',    active: 284, refunded: 41,  rate: 14.4 },
    { label: 'Mgr / Lead', active: 198, refunded: 19,  rate: 9.6 },
    { label: 'QA / SDET',  active: 156, refunded: 26,  rate: 16.7 },
    { label: 'Support',    active: 124, refunded: 24,  rate: 19.4 },
    { label: 'Student',    active: 98,  refunded: 22,  rate: 22.4 },
    { label: 'Non-tech',   active: 118, refunded: 38,  rate: 32.2 },
  ];

  const byCTC = [
    { label: 'Less than 5 LPA', active: 116, refunded: 1,  rate: 1.1 },
    { label: '05-10 LPA',       active: 105, refunded: 4,  rate: 3.7 },
    { label: '10-15 LPA',       active:  43, refunded: 22, rate: 33.8 },
    { label: '15-20 LPA',       active:  44, refunded: 0,  rate: 0.0 },
    { label: '20-30 LPA',       active:  66, refunded: 0,  rate: 0.0 },
    { label: '30+ LPA',         active:  62, refunded: 2,  rate: 3.1 },
  ];

  const byExp = [
    { label: '0 yrs',   active: 162, refunded: 36, rate: 22.2 },
    { label: '1–2 yrs', active: 486, refunded: 62, rate: 12.8 },
    { label: '3–5 yrs', active: 742, refunded: 74, rate: 10.0 },
    { label: '5–8 yrs', active: 512, refunded: 48, rate: 9.4 },
    { label: '8–12 yrs',active: 284, refunded: 32, rate: 11.3 },
    { label: '12+ yrs', active: 146, refunded: 34, rate: 23.3 },
  ];

  const engagement = [
    { metric: 'MnG Attended',       active: 87.4, refunded: 41.2, desc: 'Meet & Greet' },
    { metric: 'PYSJ Filled',        active: 92.1, refunded: 58.6, desc: 'Plan Your Scaler Journey' },
    { metric: 'SAT Score ≥ 4',      active: 81.3, refunded: 52.4, desc: 'Student Satisfaction' },
    { metric: 'Mentor Selected',    active: 94.8, refunded: 63.1, desc: 'Mentor onboarding' },
    { metric: 'Day-1 Class Attnd.', active: 96.2, refunded: 71.8, desc: 'First class attendance' },
    { metric: 'Assignment W1',      active: 88.7, refunded: 38.4, desc: 'Week 1 assignment submit' },
  ];

  const weekPattern = [
    { week: 'W1', count: 72, pct: 25.2, note: 'Pre-MnG / early regret' },
    { week: 'W2', count: 96, pct: 33.6, note: 'Class intensity shock' },
    { week: 'W3', count: 54, pct: 18.9, note: 'First assignment fail' },
    { week: 'W4', count: 38, pct: 13.3, note: 'Work-life conflict' },
    { week: 'W5+',count: 26, pct: 9.1,  note: 'Late / financial' },
  ];

  const reasons = [
    { category: 'Financial',         count: 78, pct: 27.3, sentiment: 'neutral',
      examples: [
        '"Lost my job last week, can\'t afford EMIs right now."',
        '"Spouse\'s medical emergency — need the money for treatment."',
        '"Family didn\'t approve the loan, couldn\'t get co-signer."',
        '"Credit card limit got reduced, can\'t continue."',
      ]},
    { category: 'Time / Bandwidth',  count: 64, pct: 22.4, sentiment: 'neutral',
      examples: [
        '"12hr shifts at work, no way I can do 15hrs/week of class."',
        '"Got a promotion, new role has zero flexibility."',
        '"Underestimated the time commitment honestly."',
        '"Newborn at home, not the right time."',
      ]},
    { category: 'Curriculum Mismatch', count: 46, pct: 16.1, sentiment: 'bad',
      examples: [
        '"Was told this was beginner-friendly, first class was way too advanced."',
        '"Expected more ML depth, feels like a generic SWE course."',
        '"DSA-heavy, I wanted system design focus."',
        '"Sales call promised Python-first, it\'s Java."',
      ]},
    { category: 'Got a Job / Offer', count: 38, pct: 13.3, sentiment: 'ok',
      examples: [
        '"Joined the same company I was planning to leave — no need now."',
        '"Got an internal promotion, employer paying for different course."',
        '"Accepted offer at a FAANG, relocating internationally."',
      ]},
    { category: 'Instructor / Quality', count: 24, pct: 8.4, sentiment: 'bad',
      examples: [
        '"Instructor reads off slides, no depth."',
        '"TA support is slow, I wait 2 days for doubts."',
        '"Doubt sessions feel rushed and impersonal."',
      ]},
    { category: 'Tech / Platform',   count: 12, pct: 4.2, sentiment: 'bad',
      examples: [
        '"Platform crashes during class constantly."',
        '"IDE is unusable, I just use my own."',
      ]},
    { category: 'Changed Mind',      count: 14, pct: 4.9, sentiment: 'neutral',
      examples: [
        '"Decided to do MS abroad instead."',
        '"Switching career paths entirely — product not eng."',
      ]},
    { category: 'Other',             count: 10, pct: 3.5, sentiment: 'neutral',
      examples: [
        '"Personal reasons, prefer not to say."',
        '"Mentor switched to another cohort, lost continuity."',
      ]},
  ];

  const gtnTrend = [
    { cohort: 'Dec \'25', value: 79.2 },
    { cohort: 'Jan \'26', value: 78.6 },
    { cohort: 'Feb \'26', value: 77.1 },
    { cohort: 'Mar \'26', value: 78.3 },
    { cohort: 'Apr \'26', value: 77.9 },
    { cohort: 'May \'26', value: 76.4 },
  ];

  // --------- Requests & Approvals (page 2) ---------
  const requestTypes = [
    { key: 'batch_shift',     label: 'Batch Shift',              color: '#7c7aed' },
    { key: 'recording',       label: 'Recording Access',         color: '#4ade80' },
    { key: 'attendance',      label: 'Attendance Correction',    color: '#fbbf24' },
    { key: 'mentor_assign',   label: 'Mentor Assignment',        color: '#22d3ee' },
    { key: 'mentor_change',   label: 'Mentor Change',            color: '#f472b6' },
    { key: 'mentor_resched',  label: 'Mentor Session Reschedule',color: '#a78bfa' },
    { key: 'mentor_cancel',   label: 'Mentor Session Cancel',    color: '#fb923c' },
    { key: 'emi_restruct',    label: 'EMI Restructuring',        color: '#f87171' },
    { key: 'other',           label: 'Other',                    color: '#8a8a90' },
  ];

  const lsms = ['Aarav Mehta','Priya Nair','Rohan Kapoor','Ananya Rao','Kabir Singh','Meera Pillai','Vikram Shetty','Isha Chatterjee','Dhruv Menon','Tara Bhatnagar','Arjun Reddy','Sneha Iyer'];

  const rnd = (seed) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
  const r = rnd(42);
  const statuses = ['Pending','Under Review','Approved','Rejected','Done'];
  const priorities = ['High','Medium','Low'];
  const batches = ['Academy B-47','Academy B-48','DSML B-21','DSML B-22','AIML B-14','DevOps B-09','Academy B-46','DSML B-23'];
  const firstNames = ['Aditya','Shreya','Rahul','Kritika','Nikhil','Ishita','Omkar','Diya','Harsh','Zoya','Arnav','Meher','Ananya','Karan','Pooja','Siddharth','Tanvi','Ritika','Yash','Neha','Varun','Aarohi','Parth','Sanya'];
  const lastNames = ['Sharma','Pathak','Venkat','Jain','Desai','Banerjee','Phadke','Kulkarni','Agarwal','Khan','Pillai','Bhatia','Menon','Rao','Shah','Kapoor','Sinha','Gupta','Roy','Mehra','Joshi','Nair','Chopra','Reddy'];

  const approvals = [];
  const NOW = new Date('2026-05-20T14:22:00+05:30').getTime();
  for (let i = 0; i < 48; i++) {
    const rt = requestTypes[Math.floor(r() * requestTypes.length)];
    const fn = firstNames[Math.floor(r() * firstNames.length)];
    const ln = lastNames[Math.floor(r() * lastNames.length)];
    const learner = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@scaler.com`;
    const lsm = lsms[Math.floor(r() * lsms.length)];
    const batch = batches[Math.floor(r() * batches.length)];
    const daysAgoMs = Math.floor(r() * 96 * 3600 * 1000); // 0..96h
    const raised = new Date(NOW - daysAgoMs);
    const hoursPending = Math.floor(daysAgoMs / 3600000);
    // weight statuses
    let status;
    const p = r();
    if (p < 0.42) status = 'Pending';
    else if (p < 0.56) status = 'Under Review';
    else if (p < 0.76) status = 'Approved';
    else if (p < 0.84) status = 'Rejected';
    else status = 'Done';
    const priority = hoursPending > 48 ? 'High' : (r() < 0.35 ? 'Medium' : 'Low');
    const risk = r() < 0.18 ? 'High' : (r() < 0.45 ? 'Medium' : 'Low');

    // AI classification per type
    let cls = {};
    if (rt.key === 'batch_shift') {
      const from = batches[Math.floor(r()*batches.length)];
      let to; do { to = batches[Math.floor(r()*batches.length)]; } while (to === from);
      cls = { 'From Batch': from, 'To Batch': to, 'Reason Category': ['Work conflict','Relocation','Health','Personal'][Math.floor(r()*4)] };
    } else if (rt.key === 'recording') {
      cls = { 'Class Date': '12 May 2026', 'Reason': ['Missed due to work','Sick leave','Internet outage'][Math.floor(r()*3)] };
    } else if (rt.key === 'attendance') {
      cls = { 'Class Date': '14 May 2026', 'Marked': 'Absent', 'Claimed': 'Present', 'Evidence': 'Zoom log attached' };
    } else if (rt.key.startsWith('mentor')) {
      cls = { 'Current Mentor': 'Dr. R. Subramanian', 'Session Date': '22 May 2026', 'Reason': ['Timezone mismatch','Scheduling conflict','Personality fit'][Math.floor(r()*3)] };
    } else if (rt.key === 'emi_restruct') {
      cls = { 'Current EMI': '₹12,400/mo × 24', 'Requested': '₹8,300/mo × 36', 'Reason Category': 'Job loss / paycut' };
    } else {
      cls = { 'Subject': 'Misc request', 'Urgency': 'Standard' };
    }

    approvals.push({
      sr: i + 1,
      id: `REQ-${5000 + i}`,
      raised,
      learner, email,
      batch,
      lsm,
      program: batch.split(' ')[0],
      saleStatus: ['Active','Active','Active','At Risk','At Risk','Refunded'][Math.floor(r()*6)],
      requestType: rt,
      classification: cls,
      priority,
      status,
      hoursPending,
      risk,
      body: `Hi team, I'd like to request a ${rt.label.toLowerCase()}. Details: my situation has changed recently and I need accommodation for my ${batch} batch. Please consider.`,
    });
  }

  const settingsCohorts = [
    { name: 'May 2026', funnel: 'https://sheets.google.com/may26-funnel', tracker: 'https://sheets.google.com/may26-lsm' },
    { name: 'Apr 2026', funnel: 'https://sheets.google.com/apr26-funnel', tracker: 'https://sheets.google.com/apr26-lsm' },
    { name: 'Mar 2026', funnel: 'https://sheets.google.com/mar26-funnel', tracker: 'https://sheets.google.com/mar26-lsm' },
    { name: 'Feb 2026', funnel: 'https://sheets.google.com/feb26-funnel', tracker: 'https://sheets.google.com/feb26-lsm' },
  ];

  return {
    cohorts, kpisByCohort, programs, psas, sources,
    byProfession, byCTC, byExp, engagement, weekPattern, reasons, gtnTrend,
    requestTypes, lsms, approvals, settingsCohorts,
  };
})();

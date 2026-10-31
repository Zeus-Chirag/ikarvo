// MOCK Meta Graph API + OAuth dialog + AI endpoint for local smoke tests. Every response is fake ("MOCK").
// Run: node scripts/mock-meta.mjs [port=4557] [upstreamAi=http://127.0.0.1:4556]
// Then start the app with META_GRAPH_BASE=META_GRAPH_VIDEO_BASE=META_OAUTH_BASE=http://127.0.0.1:4557 and AI_BASE_URL=http://127.0.0.1:4557.
import http from 'node:http';
const PORT = Number(process.argv[2] || 4557); const UP = process.argv[3] || 'http://127.0.0.1:4556';
const log = []; let seq = 900;
const state = {
  campaigns: { '120210000000001': { id: '120210000000001', name: '[MOCK] Ledgerly · tax-season UGC', objective: 'OUTCOME_TRAFFIC', status: 'ACTIVE', effective_status: 'ACTIVE', account_id: '1029384756', created_time: '2026-10-12T09:00:00+0000', adsets: ['120210000000011'], ads: ['120210000000021', '120210000000022'] } },
  adsets: { '120210000000011': { id: '120210000000011', daily_budget: '2500', optimization_goal: 'LANDING_PAGE_VIEWS', start_time: '2026-10-13T09:00:00+0000', end_time: '2026-10-27T09:00:00+0000', status: 'ACTIVE' } },
  ads: { '120210000000021': { name: '[MOCK] UGC · "I used to dread April"' }, '120210000000022': { name: '[MOCK] Motion · Close the month before lunch' } },
  videos: [{ id: '880000000001', title: '[MOCK] UGC · tax panic, fixed', length: 22.4, picture: null, created_time: '2026-10-11T10:00:00+0000', status: { video_status: 'ready' } }],
  audiences: [{ id: '238000000001', name: '[MOCK] Paying customers (hashed emails)', subtype: 'CUSTOM', approximate_count_lower_bound: 1200, approximate_count_upper_bound: 1400 }],
};
const INT = { freelancing: ['6003124390000', 'Freelancing', 98e6, 115e6], 'small business': ['6003402305839', 'Small business', 310e6, 365e6], quickbooks: ['6003250000001', 'QuickBooks', 4.1e6, 4.8e6], upwork: ['6003260000002', 'Upwork', 9.6e6, 11.3e6], 'self-employment': ['6003270000003', 'Self-employment', 41e6, 48e6], 'tax preparation': ['6003280000004', 'Tax preparation', 12e6, 14e6], 'graphic design': ['6003290000005', 'Graphic design', 160e6, 188e6], fiverr: ['6003300000006', 'Fiverr', 7.2e6, 8.5e6], accounting: ['6003310000007', 'Accounting', 120e6, 141e6] };
const GEO = { 'united states': { key: 'US', name: 'United States', type: 'country', country_code: 'US' }, 'united kingdom': { key: 'GB', name: 'United Kingdom', type: 'country', country_code: 'GB' }, canada: { key: 'CA', name: 'Canada', type: 'country', country_code: 'CA' }, toronto: { key: '296875', name: 'Toronto', type: 'city', country_code: 'CA', country_name: 'Canada', region: 'Ontario' } };
const DEMO = [{ id: '6262428231370', name: 'Small business owners', type: 'industries', audience_size_lower_bound: 66e6, audience_size_upper_bound: 78e6 }, { id: '6012903140970', name: 'Self-employed', type: 'work_positions', audience_size_lower_bound: 18e6, audience_size_upper_bound: 21e6 }, { id: '6015559470583', name: 'Newly engaged (6 months)', type: 'life_events', audience_size_lower_bound: 3e6, audience_size_upper_bound: 3.5e6 }];
const day = i => { const d = new Date(Date.UTC(2026, 9, 13 + i)); return d.toISOString().slice(0, 10); };
const SP = [18.2, 22.9, 24.6, 25.0, 24.8, 25.0, 23.7];
function ins(id, q) {
  const c = state.campaigns[id]; if (!c || !(c.effective_status === 'ACTIVE' || c.delivered)) return [];
  const mk = (spend, reach, imp, clicks, lpv, extra = {}) => ({ spend: spend.toFixed(2), reach: String(reach), impressions: String(imp), frequency: (imp / reach).toFixed(2), clicks: String(clicks), ctr: (clicks / imp * 100).toFixed(4), cpc: (spend / clicks).toFixed(4), cpm: (spend / imp * 1000).toFixed(4),
    actions: [{ action_type: 'link_click', value: String(clicks) }, { action_type: 'landing_page_view', value: String(lpv) }], cost_per_action_type: [{ action_type: 'landing_page_view', value: (spend / lpv).toFixed(4) }], date_start: '2026-10-13', date_stop: '2026-10-19', ...extra });
  if (q.time_increment === '1') return SP.map((s, i) => mk(s, Math.round(s * 160), Math.round(s * 210), Math.round(s * 2.1), Math.round(s * 1.5), { date_start: day(i), date_stop: day(i) }));
  if (q.level === 'ad') return [mk(101.4, 14100, 19800, 287, 214, { ad_id: '120210000000021', ad_name: state.ads['120210000000021'].name }), mk(62.8, 9900, 12900, 92, 61, { ad_id: '120210000000022', ad_name: state.ads['120210000000022'].name })];
  return [mk(164.2, 21400, 32700, 379, 275)];
}
const send = (s, code, body, headers = {}) => { s.writeHead(code, { 'content-type': 'application/json', ...headers }); s.end(JSON.stringify(body)); };
const gErr = (s, msg, code = 100) => send(s, 400, { error: { message: `[MOCK] ${msg}`, type: 'OAuthException', code, fbtrace_id: 'MOCKtrace' } });
http.createServer((req, s) => { const chunks = []; req.on('data', d => chunks.push(d)); req.on('end', async () => {
  const raw = Buffer.concat(chunks); const u = new URL(req.url, 'http://x'); const q = Object.fromEntries(u.searchParams);
  if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) Object.assign(q, Object.fromEntries(new URLSearchParams(raw.toString())));
  if (req.headers['content-type']?.includes('multipart/form-data')) { const t = raw.toString('latin1').match(/name="access_token"\r\n\r\n([^\r]*)/); if (t) q.access_token = t[1]; }
  const path = u.pathname.replace(/^\/v\d+\.\d+\//, '/'); log.push(`${req.method} ${path}`); console.log(req.method, path, q.status ?? '');
  try {
    if (path === '/chat/completions') { const j = JSON.parse(raw.toString()); const sys = j.messages[0].content; let c;
      if (sys.includes('paid-social strategist')) c = { summary: '[MOCK] US & Canadian freelancers who invoice clients and dread quarterly taxes; skew 25–44.', interests: ['Freelancing', 'Upwork', 'QuickBooks', 'Self-employment', 'Tax preparation', 'Graphic design', 'Fiverr', 'Invoice Ninja fans'], locations: ['United States', 'Canada'], ageMin: 24, ageMax: 45, genders: 'all', demographics: ['Self-employed', 'Small business owners'], lookalikeSeed: 'Paying customers list', rationale: ['[MOCK] Freelance-platform interests catch people who invoice', '[MOCK] Accounting-tool interests catch switchers', '[MOCK] 24–45 matches the ICP in the brief'] };
      else if (sys.includes('performance-marketing lead')) c = { recommendations: [
        { title: '[MOCK] Move budget to the UGC ad', why: 'UGC CPA is 0.47 vs 1.03 for the motion ad over 7 days (214 vs 61 landing-page views).', action: 'Pause "Motion · Close the month before lunch" and keep 25/day on the UGC ad.', impact: 'high', kind: 'creative' },
        { title: '[MOCK] Hook test on the winner', why: 'CTR 1.16% is healthy, so a stronger first 2 seconds should lower CPA further.', action: 'Render two UGC variants in Ad Studio with the "Pain first" hooks and add them to this ad set.', impact: 'medium', kind: 'creative' },
        { title: '[MOCK] Add a 1% lookalike', why: 'Frequency is 1.53 with 21.4K reach; room to grow before fatigue.', action: 'Create a 1% US lookalike of "Paying customers" and test it in a second ad set at 15/day.', impact: 'medium', kind: 'audience' }] };
      else if (sys.includes('multi-file static web app')) c = { files: [
        { path: 'index.html', content: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>[MOCK] Slow Flow</title><link rel="stylesheet" href="styles.css"></head><body><nav><b>Slow Flow</b><a href="index.html">Schedule</a><a href="about.html">About</a></nav><main><p class="tag">MOCK AI OUTPUT</p><h1>Unhurried yoga, six mornings a week.</h1><ul id="classes"></ul></main><script type="module" src="app.js"></script></body></html>' },
        { path: 'about.html', content: '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>[MOCK] About</title><link rel="stylesheet" href="styles.css"></head><body><nav><b>Slow Flow</b><a href="index.html">Schedule</a><a href="about.html">About</a></nav><main><p class="tag">MOCK AI OUTPUT</p><h1>One teacher, twelve mats.</h1><p>A second page, linked from the nav, to show multi-page routing in the preview.</p></main></body></html>' },
        { path: 'styles.css', content: 'body{margin:0;font:16px/1.6 Georgia,serif;background:#f6f1e7;color:#1d1a15}nav{display:flex;gap:18px;padding:18px 28px;border-bottom:1px solid #d9cfbd}nav b{margin-right:auto}nav a{color:#7a3b1d}main{padding:40px 28px;max-width:640px}h1{font-size:44px;line-height:1.05;font-weight:400}.tag{font:600 11px monospace;letter-spacing:.1em;color:#b8321a}li{padding:10px 0;border-bottom:1px solid #e3d9c7;list-style:none}li button{float:right}' },
        { path: 'app.js', content: "const classes=[['Mon 7:00','Slow flow'],['Wed 7:00','Yin'],['Fri 7:00','Breath & stretch']];const booked=new Set(JSON.parse(localStorage.getItem('b')||'[]'));const ul=document.getElementById('classes');function draw(){ul.innerHTML='';classes.forEach(([t,n])=>{const li=document.createElement('li');li.textContent=t+' · '+n;const b=document.createElement('button');b.textContent=booked.has(t)?'Booked':'Book';b.onclick=()=>{booked.has(t)?booked.delete(t):booked.add(t);localStorage.setItem('b',JSON.stringify([...booked]));draw()};li.append(b);ul.append(li)})}draw();" }] };
      else { const r = await fetch(`${UP}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw }); s.writeHead(r.status, { 'content-type': 'application/json' }); return s.end(await r.text()); }
      return send(s, 200, { choices: [{ message: { content: JSON.stringify(c) } }] }); }
    if (path === '/dialog/oauth') { const r = new URL(q.redirect_uri); r.searchParams.set('code', 'MOCK_CODE'); r.searchParams.set('state', q.state); s.writeHead(302, { location: r.toString() }); return s.end(); }
    if (path === '/oauth/access_token') return send(s, 200, { access_token: q.grant_type === 'fb_exchange_token' ? 'MOCK_LONG_TOKEN' : 'MOCK_SHORT_TOKEN', token_type: 'bearer', expires_in: q.grant_type ? 5183944 : 3600 });
    if (!q.access_token) return gErr(s, 'An active access token must be used', 2500);
    if (path === '/me') return send(s, 200, { id: '10229900000', name: '[MOCK] Chirag K.' });
    if (path === '/me/permissions') return send(s, 200, req.method === 'DELETE' ? { success: true } : { data: ['ads_management', 'ads_read', 'business_management', 'pages_show_list', 'pages_read_engagement'].map(p => ({ permission: p, status: 'granted' })) });
    if (path === '/me/adaccounts') return send(s, 200, { data: [{ id: 'act_1029384756', name: '[MOCK] Ledgerly · Main', account_status: 1, currency: 'USD', timezone_name: 'America/New_York', business: { name: '[MOCK] Ledgerly Inc.' } }, { id: 'act_5566778899', name: '[MOCK] Ledgerly · EU test', account_status: 1, currency: 'EUR', timezone_name: 'Europe/Dublin' }, { id: 'act_1112223334', name: '[MOCK] Old agency account', account_status: 2, currency: 'USD', timezone_name: 'UTC' }] });
    if (path === '/me/accounts') return send(s, 200, { data: [{ id: '104455667788', name: '[MOCK] Ledgerly', category: 'Software' }] });
    if (/^\/act_\d+$/.test(path)) return send(s, 200, { id: path.slice(1), name: path.includes('5566') ? '[MOCK] Ledgerly · EU test' : '[MOCK] Ledgerly · Main', account_status: 1, currency: path.includes('5566') ? 'EUR' : 'USD' });
    if (path === '/104455667788') return send(s, 200, { id: '104455667788', name: '[MOCK] Ledgerly' });
    if (path === '/search') {
      const t = (q.q || '').toLowerCase();
      if (q.type === 'adinterest') { const k = Object.keys(INT).find(k => k.includes(t) || t.includes(k)); return send(s, 200, { data: k ? [{ id: INT[k][0], name: INT[k][1], audience_size_lower_bound: INT[k][2], audience_size_upper_bound: INT[k][3], path: ['Interests', 'Business and industry', INT[k][1]] }] : [] }); }
      if (q.type === 'adgeolocation') { const k = Object.keys(GEO).find(k => k.includes(t) || t.includes(k)); return send(s, 200, { data: k ? [GEO[k]] : [] }); }
      if (q.type === 'adTargetingCategory') return send(s, 200, { data: DEMO.filter(d => !t || d.name.toLowerCase().includes(t)) });
      return send(s, 200, { data: [] }); }
    let m;
    if ((m = path.match(/^\/act_\d+\/delivery_estimate$/))) { const sp = JSON.parse(q.targeting_spec || '{}'); const n = (sp.flexible_spec?.[0]?.interests?.length ?? 0) + 1; const c = (sp.geo_locations?.countries?.length ?? 1);
      const lo = Math.round(2.1e6 * c * Math.min(n, 6) / 3); return send(s, 200, { data: [{ estimate_ready: true, estimate_mau_lower_bound: lo, estimate_mau_upper_bound: Math.round(lo * 1.18), estimate_dau: Math.round(lo / 9), daily_outcomes_curve: [] }] }); }
    if ((m = path.match(/^\/act_\d+\/customaudiences$/))) { if (req.method === 'GET') return send(s, 200, { data: state.audiences });
      const id = String(238000000000 + ++seq); state.audiences.push({ id, name: q.name, subtype: q.subtype, operation_status: { code: 300, description: 'Populating (MOCK)' } }); return send(s, 200, { id }); }
    if ((m = path.match(/^\/act_\d+\/advideos$/))) { if (req.method === 'GET') return send(s, 200, { data: state.videos });
      const name = (raw.toString('latin1').match(/name="name"\r\n\r\n([^\r]*)/) || [])[1] || 'Upload'; const id = String(880000000000 + ++seq);
      state.videos.unshift({ id, title: name, length: null, picture: null, created_time: new Date().toISOString(), status: { video_status: 'processing' } }); return send(s, 200, { id }); }
    if ((m = path.match(/^\/(\d+)\/thumbnails$/))) return send(s, 200, { data: [{ uri: 'https://example.com/mock-thumb.jpg', is_preferred: true }] });
    if ((m = path.match(/^\/act_(\d+)\/campaigns$/))) {
      if (req.method === 'POST') { if (q.status !== 'PAUSED') return gErr(s, 'test harness: expected PAUSED'); const id = String(120210000000100 + ++seq); state.campaigns[id] = { id, name: q.name, objective: q.objective, status: 'PAUSED', effective_status: 'PAUSED', account_id: m[1], created_time: new Date().toISOString(), adsets: [], ads: [] }; return send(s, 200, { id }); }
      return send(s, 200, { data: Object.values(state.campaigns).filter(c => c.account_id === m[1]).reverse().map(c => ({ ...c, adsets: { data: c.adsets.map(a => state.adsets[a]) }, ads: undefined, insights: ins(c.id, {}).length ? { data: ins(c.id, {}) } : undefined })) }); }
    if ((m = path.match(/^\/act_\d+\/adsets$/))) { if (q.status !== 'PAUSED') return gErr(s, 'expected PAUSED'); const id = String(120210000000200 + ++seq); state.adsets[id] = { id, daily_budget: q.daily_budget, lifetime_budget: q.lifetime_budget, optimization_goal: q.optimization_goal, start_time: q.start_time, end_time: q.end_time, status: 'PAUSED' }; state.campaigns[q.campaign_id].adsets.push(id); return send(s, 200, { id }); }
    if ((m = path.match(/^\/act_\d+\/adcreatives$/))) return send(s, 200, { id: String(120210000000300 + ++seq) });
    if ((m = path.match(/^\/act_\d+\/ads$/))) { if (q.status !== 'PAUSED') return gErr(s, 'expected PAUSED'); const id = String(120210000000400 + ++seq); state.ads[id] = { name: q.name }; const c = Object.values(state.campaigns).find(c => c.adsets.includes(q.adset_id)); c?.ads.push(id); return send(s, 200, { id }); }
    if ((m = path.match(/^\/(\d+)\/insights$/))) return send(s, 200, { data: ins(m[1], q) });
    if ((m = path.match(/^\/(\d+)$/))) { const c = state.campaigns[m[1]];
      if (req.method === 'POST') { if (c) { c.status = q.status; c.effective_status = q.status; } else if (state.adsets[m[1]]) state.adsets[m[1]].status = q.status; return send(s, 200, { success: true }); }
      if (c) return send(s, 200, { id: c.id, name: c.name, account_id: c.account_id, effective_status: c.effective_status, objective: c.objective, adsets: { data: c.adsets.map(id => ({ id, optimization_goal: state.adsets[id]?.optimization_goal })) }, ads: { data: c.ads.map(id => ({ id })) } });
      return gErr(s, `Unsupported get request. Object with ID '${m[1]}' does not exist`); }
    if (path === '/__log') return send(s, 200, log);
    gErr(s, `mock has no route for ${req.method} ${path}`);
  } catch (e) { send(s, 500, { error: { message: String(e) } }); }
}); }).listen(PORT, () => console.log('MOCK Meta on', PORT));

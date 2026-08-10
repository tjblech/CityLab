const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

const state = {
  tab: 'now',
  mbta: { loading: true, alerts: [], error: null },
  bikes: { loading: true, total: null, stations: [], error: null },
  saved: new Set(JSON.parse(localStorage.getItem('citylab.saved') || '[]')),
  category: 'All',
  layers: { events: true, transit: true, bikes: true, traffic: true },
  cityTime: new Date(),
};

const EVENTS = [
  { id:'ica', title:'ICA Free Admission', venue:'Institute of Contemporary Art', neighborhood:'Seaport', time:'All day', price:'FREE', category:'Museums', icon:'◫', tone:'blue', x:73, y:43 },
  { id:'sowa', title:'SoWa Open Market', venue:'SoWa Power Station', neighborhood:'South End', time:'10:00 AM – 4:00 PM', price:'FREE', category:'Markets', icon:'✦', tone:'green', x:52, y:63 },
  { id:'redsox', title:'Red Sox vs. Yankees', venue:'Fenway Park', neighborhood:'Fenway', time:'7:10 PM', price:'$55+', category:'Sports', icon:'◆', tone:'red', x:37, y:54 },
  { id:'bts', title:'Built to Spill', venue:'Roadrunner', neighborhood:'Brighton', time:'8:00 PM', price:'$28', category:'Live Music', icon:'♫', tone:'purple', x:25, y:39 },
  { id:'mfa', title:'MFA After Dark', venue:'Museum of Fine Arts', neighborhood:'Fenway', time:'6:00 PM', price:'$20', category:'Museums', icon:'◇', tone:'blue', x:42, y:59 },
  { id:'comedy', title:'Stand Up Showcase', venue:'Laugh Boston', neighborhood:'Seaport', time:'7:30 PM', price:'$25', category:'Comedy', icon:'☻', tone:'purple', x:69, y:55 },
  { id:'movie', title:'The Big Lebowski', venue:'Brattle Theatre', neighborhood:'Cambridge', time:'9:30 PM', price:'$9', category:'Movies', icon:'▶', tone:'blue', x:38, y:25 },
  { id:'jazz', title:'Berklee Summer Jazz', venue:'Berklee Performance Center', neighborhood:'Back Bay', time:'8:00 PM', price:'$18', category:'Live Music', icon:'♪', tone:'purple', x:44, y:49 },
  { id:'market', title:'Night Market', venue:'Harvard Square', neighborhood:'Cambridge', time:'6:00 PM', price:'FREE', category:'Markets', icon:'✺', tone:'green', x:32, y:20 },
  { id:'weird', title:'After-Hours Observatory', venue:'Coit Observatory', neighborhood:'BU', time:'9:00 PM', price:'FREE', category:'Weird', icon:'✧', tone:'orange', x:36, y:43 },
  { id:'arts', title:'Fort Point Art Walk', venue:'Thomson Place', neighborhood:'Fort Point', time:'5:00 PM – 9:00 PM', price:'FREE', category:'Art', icon:'✦', tone:'purple', x:65, y:58 },
  { id:'food', title:'North End Summer Stroll', venue:'Hanover Street', neighborhood:'North End', time:'6:30 PM', price:'FREE', category:'Food', icon:'◉', tone:'orange', x:59, y:36 },
];

const CATEGORIES = ['All','Live Music','Sports','Comedy','Movies','Museums','Markets','Art','Food','Free','Weird'];
const BOUNDS = { minLat:42.29, maxLat:42.405, minLon:-71.19, maxLon:-70.96 };

function esc(str='') { return String(str).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m])); }
function nowText(){ return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(state.cityTime); }
function timeOnly(){ return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(state.cityTime); }
function showToast(text){ const el=$('#toast'); el.textContent=text; el.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>el.classList.remove('show'),1500); }
function saveEvent(id){ state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id); localStorage.setItem('citylab.saved', JSON.stringify([...state.saved])); render(); showToast(state.saved.has(id)?'Saved':'Removed'); }
function priceTone(price){ if(price==='FREE') return 'green'; if(price.includes('$55')) return 'red'; return 'blue'; }
function eventThumb(e){ return `<div class="event-thumb" style="background:${thumbGradient(e.tone)}"><span>${e.icon}</span></div>`; }
function thumbGradient(t){ const g={green:'linear-gradient(145deg,#18352c,#10221e)',blue:'linear-gradient(145deg,#18334e,#101f31)',red:'linear-gradient(145deg,#482027,#28141b)',purple:'linear-gradient(145deg,#34224c,#1e1730)',orange:'linear-gradient(145deg,#49331b,#282014)'}; return g[t]||g.blue; }
function eventRow(e, save=false){ return `<div class="${save?'discover-card':'event-row'}" data-open-event="${e.id}">
  ${eventThumb(e)}
  <div class="event-main"><div class="event-title">${esc(e.title)}</div><div class="event-meta">${esc(e.venue)} · ${esc(e.neighborhood)}</div><div class="event-time">${esc(e.time)}</div></div>
  ${save ? `<button class="save-btn ${state.saved.has(e.id)?'saved':''}" data-save="${e.id}" aria-label="Save ${esc(e.title)}">${state.saved.has(e.id)?'♥':'♡'}</button>` : `<span class="pill ${priceTone(e.price)}">${e.price}</span>`}
</div>`; }

function lineSummary(line){
  const routeMap={Green:['Green-B','Green-C','Green-D','Green-E'],Orange:['Orange'],Red:['Red'],Blue:['Blue']};
  const alerts=state.mbta.alerts.filter(a => (a.attributes?.active_period||[]).some(p=>!p.end || new Date(p.end)>new Date()) && (a.relationships?.route?.data?.id ? routeMap[line].includes(a.relationships.route.data.id) : true));
  const severe=alerts.filter(a=>['SUSPENSION','DELAY','SHUTTLE'].includes(a.attributes?.effect));
  if(severe.length) return {text: severe.length>1?`${severe.length} alerts`:'Delay', cls:'status-warn'};
  return {text:'Normal service', cls:'status-ok'};
}

function renderNow(){
  const green=lineSummary('Green'), orange=lineSummary('Orange');
  const totalAlerts=state.mbta.loading?'—':state.mbta.alerts.length;
  const bikeTotal=state.bikes.loading?'—':(state.bikes.total?.toLocaleString()||'—');
  return `<header class="header"><div><h1>BOSTON</h1><div class="subhead">${nowText()}</div></div><div class="header-actions"><button class="icon-btn" data-refresh title="Refresh live data">↻</button><button class="icon-btn" title="Notifications">♢</button></div></header>

  <div class="section"><div class="section-head"><div class="section-title">⌁ City Pulse</div><span class="live-label"><span class="live-dot"></span>Live</span></div>
    <div class="card pulse-card"><div class="pulse-top"><span class="eyebrow">Boston right now</span><strong style="color:var(--green)">${cityPulseLabel()}</strong></div>
      <div class="pulse-wave"><svg viewBox="0 0 500 60" preserveAspectRatio="none"><path d="M0 38 L28 37 L42 34 L55 38 L65 38 L74 11 L84 51 L98 29 L110 38 L151 38 L167 35 L179 40 L195 36 L218 38 L237 18 L248 48 L259 32 L273 38 L320 38 L337 35 L352 41 L366 37 L382 38 L397 21 L409 47 L421 31 L435 38 L500 38" fill="none" stroke="#78db78" stroke-width="2"/><path d="M0 38 H500" stroke="rgba(120,219,120,.14)"/></svg></div>
      <div class="pulse-status"><div><strong>${cityPulseScore()}</strong><div class="pulse-index">City activity index</div></div><div class="pulse-index">Transit · events · bikes · time</div></div>
    </div>
  </div>

  <div class="section"><div class="section-head"><div class="section-title">Transit</div><button class="text-btn" data-tab-jump="more">View data</button></div>
    <div class="card transit-grid">
      <div class="transit-cell"><div class="route-row"><span class="route-dot route-green">T</span><div><h3>Green Line</h3><div class="metric-caption ${green.cls}">${green.text}</div></div></div></div>
      <div class="transit-cell"><div class="route-row"><span class="route-dot route-orange">T</span><div><h3>Orange Line</h3><div class="metric-caption ${orange.cls}">${orange.text}</div></div></div></div>
      <div class="transit-cell" style="text-align:center"><b style="font-size:24px;color:${totalAlerts? 'var(--red)':'var(--green)'}">${totalAlerts}</b><div class="metric-caption">active alerts</div></div>
    </div>
  </div>

  <div class="section"><div class="section-head"><div class="section-title">Today</div><button class="text-btn" data-tab-jump="discover">View all</button></div>
    <div class="card today-grid"><div class="big-stat"><b>${EVENTS.length}</b><span>curated things</span></div><div class="big-stat green"><b>${EVENTS.filter(e=>e.price==='FREE').length}</b><span>free</span></div><div class="big-stat blue"><b>${EVENTS.filter(e=>e.price!=='FREE' && parseInt(e.price.replace(/\D/g,''))<30).length}</b><span>under $30</span></div></div>
  </div>

  <div class="section"><div class="section-head"><div class="section-title">Coming up near you</div><button class="text-btn" data-tab-jump="discover">View all</button></div>
    <div class="card event-list">${EVENTS.slice(0,4).map(e=>eventRow(e)).join('')}</div>
  </div>

  <div class="section"><div class="section-head"><div class="section-title">The city right now</div><button class="text-btn" data-tab-jump="live">Open map</button></div>
    <div class="card city-stats"><div class="city-stat"><div class="ico" style="color:var(--blue)">✈</div><b>34</b><small>Logan arrivals<br>next hour*</small></div><div class="city-stat"><div class="ico" style="color:var(--green)">♧</div><b>${bikeTotal}</b><small>Bluebikes<br>available</small></div><div class="city-stat"><div class="ico" style="color:var(--yellow)">☆</div><b>${EVENTS.length}</b><small>curated<br>events</small></div><div class="city-stat"><div class="ico" style="color:var(--orange)">☼</div><b>7:49</b><small>sunset<br>demo</small></div></div>
  </div>`;
}

function cityPulseScore(){ const h=state.cityTime.getHours(); const timeScore=h>=17&&h<=23?20:h>=11?12:6; const bike=Math.min(25, Math.round((state.bikes.total||1300)/100)); const alertPenalty=Math.min(12,state.mbta.alerts.length*2); return Math.max(42,Math.min(92,55+timeScore+bike-alertPenalty)); }
function cityPulseLabel(){ const s=cityPulseScore(); return s>80?'Very active':s>68?'Active':s>55?'Steady':'Quiet'; }

function renderDiscover(){ const filtered=EVENTS.filter(e=> state.category==='All' || (state.category==='Free' ? e.price==='FREE' : e.category===state.category)); return `<header class="header"><div><h1 style="font-size:31px">DISCOVER</h1><div class="subhead">Find what moves you.</div></div><button class="icon-btn" data-search>⌕</button></header>
  <div class="chips">${CATEGORIES.map(c=>`<button class="chip ${c===state.category?'active':''}" data-category="${c}">${c}</button>`).join('')}</div>
  <div class="section"><div class="section-head"><div class="section-title">Tonight in Boston</div><span class="pill">${filtered.length} results</span></div><div class="card">${filtered.map(e=>eventRow(e,true)).join('')||'<div class="empty">No matches in this preview.</div>'}</div></div>
  <div class="section"><div class="section-head"><div class="section-title">Trending neighborhoods</div></div>
    <div class="chips"><span class="pill orange">Fenway · high energy</span><span class="pill purple">Cambridge · creative</span><span class="pill blue">Seaport · waterfront</span><span class="pill green">Allston · live music</span><span class="pill">Back Bay · classic</span></div>
  </div>`; }

function cityMapSvg(){ return `<svg viewBox="0 0 500 760" preserveAspectRatio="none" aria-hidden="true">
  <defs><filter id="glow"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <path d="M0 170 C80 150 120 200 195 184 C260 170 292 134 344 156 C392 175 420 229 500 224" fill="none" stroke="#0b3248" stroke-width="22" opacity=".6"/>
  <path d="M275 0 C272 90 294 137 325 184 C362 240 372 303 363 371 C354 450 399 501 500 535" fill="none" stroke="#0c2d40" stroke-width="18" opacity=".5"/>
  <g stroke="#1d2b38" stroke-width="1" opacity=".72">${Array.from({length:14},(_,i)=>`<path d="M${-40+i*42} 0 L${90+i*34} 760"/>`).join('')}${Array.from({length:14},(_,i)=>`<path d="M0 ${40+i*52} L500 ${10+i*48}"/>`).join('')}</g>
  <g fill="none" stroke-width="3" filter="url(#glow)"><path d="M45 390 C140 380 192 374 256 354 C330 332 397 320 472 308" stroke="#4db25a"/><path d="M130 610 C178 541 205 480 251 423 C292 370 350 320 455 240" stroke="#ea8c36"/><path d="M230 710 C245 605 259 517 276 445 C290 376 302 300 312 190" stroke="#cf4454"/><path d="M0 250 C87 270 153 302 224 337 C294 372 381 404 500 426" stroke="#397dd1"/></g>
  <g fill="#dbe8ee" opacity=".42">${Array.from({length:45},(_,i)=>`<circle cx="${(i*83)%500}" cy="${60+((i*131)%610)}" r="1.4"/>`).join('')}</g>
</svg>`; }
function posFromLatLon(lat,lon){ const x=(lon-BOUNDS.minLon)/(BOUNDS.maxLon-BOUNDS.minLon)*100; const y=(BOUNDS.maxLat-lat)/(BOUNDS.maxLat-BOUNDS.minLat)*100; return {x:Math.max(3,Math.min(97,x)),y:Math.max(6,Math.min(88,y))}; }
function mapMarkers(){ const events=EVENTS.slice(0,9).map(e=>`<div class="map-marker marker-event ${state.layers.events?'':'hidden'}" style="left:${e.x}%;top:${e.y}%" title="${esc(e.title)}">♫</div>`).join('');
  const transit=[{x:48,y:43},{x:54,y:48},{x:41,y:57},{x:58,y:38},{x:63,y:31},{x:35,y:34}].map(p=>`<div class="map-marker marker-transit ${state.layers.transit?'':'hidden'}" style="left:${p.x}%;top:${p.y}%">T</div>`).join('');
  const traffic=[{x:57,y:49},{x:46,y:61},{x:67,y:56},{x:32,y:49}].map(p=>`<div class="map-marker marker-traffic ${state.layers.traffic?'':'hidden'}" style="left:${p.x}%;top:${p.y}%">⌁</div>`).join('');
  const bikes=(state.bikes.stations.length?state.bikes.stations.slice(0,18):[{lat:42.352,lon:-71.055},{lat:42.360,lon:-71.093},{lat:42.346,lon:-71.081},{lat:42.373,lon:-71.120},{lat:42.338,lon:-71.034},{lat:42.365,lon:-71.060}]).map(s=>{const p=posFromLatLon(s.lat,s.lon);return `<div class="map-marker marker-bike ${state.layers.bikes?'':'hidden'}" style="left:${p.x}%;top:${p.y}%" title="${esc(s.name||'Bluebikes station')}">♧</div>`}).join('');
  return events+transit+traffic+bikes; }
function renderLive(){ return `<header class="header"><div><h1 style="font-size:30px">LIVE CITY</h1><div class="subhead">Boston in real time.</div></div><div class="header-actions"><button class="icon-btn" data-location>⌖</button><button class="icon-btn" data-refresh>↻</button></div></header>
  <div class="map-shell"><div class="map-art">${cityMapSvg()}</div>
    <div class="map-filters">${[['events','● Events'],['transit','T Transit'],['bikes','♧ Bikes'],['traffic','⌁ Traffic']].map(([k,l])=>`<button class="map-filter ${state.layers[k]?'active':''}" data-layer="${k}">${l}</button>`).join('')}</div>
    <span class="map-label" style="left:15%;top:21%">Cambridge</span><span class="map-label" style="left:66%;top:19%">Charlestown</span><span class="map-label" style="left:78%;top:30%">East Boston</span><span class="map-label" style="left:17%;top:53%">Back Bay</span><span class="map-label" style="left:47%;top:64%">South End</span><span class="map-label" style="left:70%;top:68%">South Boston</span><span class="map-label" style="left:18%;top:76%">Roxbury</span><span class="map-label" style="left:58%;top:82%">Dorchester</span><span class="map-center-label">BOSTON</span>
    ${mapMarkers()}
    <div class="map-bottom"><div class="scrub-label"><b id="scrubTitle">Tonight · ${timeOnly()}</b><span class="live-label"><span class="live-dot"></span>Live</span></div><input class="scrubber" id="timeScrubber" type="range" min="18" max="24" value="${Math.min(24,Math.max(18,state.cityTime.getHours()))}" step="1"><div class="scrub-times"><span>6 PM</span><span>8 PM</span><span>10 PM</span><span>12 AM</span></div>
      <div class="map-summary"><div class="summary-item"><b style="color:var(--red)">${EVENTS.length}</b><small>events</small></div><div class="summary-item"><b style="color:var(--orange)">${state.mbta.loading?'—':state.mbta.alerts.length}</b><small>alerts</small></div><div class="summary-item"><b style="color:var(--blue)">${state.bikes.loading?'—':(state.bikes.total||0).toLocaleString()}</b><small>bikes</small></div><div class="summary-item"><b style="color:var(--green)">${cityPulseScore()}</b><small>pulse</small></div></div>
    </div>
  </div>`; }

function renderSaved(){ const events=EVENTS.filter(e=>state.saved.has(e.id)); return `<header class="header"><div><h1 style="font-size:31px">SAVED</h1><div class="subhead">Your Boston shortlist.</div></div></header>
  <div class="section"><div class="section-head"><div class="section-title">Events</div><span class="pill green">${events.length} saved</span></div><div class="card">${events.length?events.map(e=>eventRow(e,true)).join(''):`<div class="empty"><div class="big">♡</div><b>Nothing saved yet</b><p style="margin-top:6px">Save things from Discover and they’ll show up here.</p></div>`}</div></div>
  ${events.length>=2?`<div class="section"><div class="section-head"><div class="section-title">Tonight route</div></div><div class="card card-pad"><div style="display:flex;align-items:center;gap:12px"><div class="logo-mark">C</div><div><b>${events.length} stops · Boston</b><div class="subhead">A lightweight itinerary preview</div></div></div><div style="margin-top:14px;display:flex;flex-direction:column;gap:10px">${events.map((e,i)=>`<div style="display:flex;gap:12px;align-items:center"><span class="pill green">${i+1}</span><div><b style="font-size:12px">${esc(e.title)}</b><div class="event-meta">${esc(e.time)} · ${esc(e.neighborhood)}</div></div></div>`).join('')}</div></div></div>`:''}`; }

function renderMore(){ return `<header class="header"><div><div class="mini-logo"><div class="logo-mark">C</div><div><h2>CityLab</h2><div class="subhead">Boston intelligence console</div></div></div></div></header>
  <div class="section"><div class="section-head"><div class="section-title">Live data</div><button class="text-btn" data-refresh>Refresh</button></div><div class="data-grid">
    <div class="card data-card"><div class="kicker">MBTA alerts</div><strong style="color:var(--orange)">${state.mbta.loading?'—':state.mbta.alerts.length}</strong><small>${state.mbta.error?'Fallback mode':'Live V3 API'}</small></div>
    <div class="card data-card"><div class="kicker">Bluebikes</div><strong style="color:var(--blue)">${state.bikes.loading?'—':(state.bikes.total||0).toLocaleString()}</strong><small>${state.bikes.error?'Fallback mode':'available right now'}</small></div>
    <div class="card data-card"><div class="kicker">Curated events</div><strong style="color:var(--green)">${EVENTS.length}</strong><small>starter catalog</small></div>
    <div class="card data-card"><div class="kicker">Saved</div><strong style="color:var(--purple)">${state.saved.size}</strong><small>stored on device</small></div>
  </div></div>
  <div class="section"><div class="section-head"><div class="section-title">Sources</div></div><div class="card">
    <div class="source-row"><div class="source-icon">T</div><div class="source-copy"><b>MBTA V3</b><p>Service alerts and transit state</p></div><span class="source-state ${state.mbta.error?'demo':'live'}">${state.mbta.error?'fallback':'live'}</span></div>
    <div class="source-row"><div class="source-icon">♧</div><div class="source-copy"><b>Bluebikes GBFS</b><p>Live station and bike availability</p></div><span class="source-state ${state.bikes.error?'demo':'live'}">${state.bikes.error?'fallback':'live'}</span></div>
    <div class="source-row"><div class="source-icon">✦</div><div class="source-copy"><b>Events layer</b><p>Curated V1 dataset; aggregators next</p></div><span class="source-state demo">preview</span></div>
  </div></div>
  <div class="section"><div class="section-head"><div class="section-title">About this build</div></div><div class="card about-card"><p>This is the first functional CityLab shell based on the original preview: dense, dark, city-first, and mobile-first. The interface is intentionally independent of any framework so it can deploy cleanly to GitHub Pages as a PWA. Live sources degrade gracefully instead of breaking the app.</p></div></div>`; }

function render(){ state.cityTime=new Date(); const screen=$('#screen'); screen.innerHTML=state.tab==='now'?renderNow():state.tab==='discover'?renderDiscover():state.tab==='live'?renderLive():state.tab==='saved'?renderSaved():renderMore(); $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab)); bindScreen(); }
function bindScreen(){
  $$('[data-tab-jump]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tabJump; render(); scrollTo(0,0)});
  $$('[data-category]').forEach(b=>b.onclick=()=>{state.category=b.dataset.category; render();});
  $$('[data-save]').forEach(b=>b.onclick=(ev)=>{ev.stopPropagation();saveEvent(b.dataset.save)});
  $$('[data-refresh]').forEach(b=>b.onclick=()=>refreshLive(true));
  $$('[data-layer]').forEach(b=>b.onclick=()=>{const k=b.dataset.layer;state.layers[k]=!state.layers[k];render();});
  const scrub=$('#timeScrubber'); if(scrub) scrub.oninput=()=>{const v=Number(scrub.value);$('#scrubTitle').textContent=`Tonight · ${v===24?'12 AM':(v>12?v-12:v)}:00 ${v===24?'AM':'PM'}`;};
  const loc=$('[data-location]'); if(loc) loc.onclick=()=>locateUser();
  const search=$('[data-search]'); if(search) search.onclick=()=>{state.category='Weird';render();showToast('Showing unusual picks');};
}

async function fetchJson(url, timeout=7500){ const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),timeout); try{const r=await fetch(url,{signal:ctl.signal}); if(!r.ok) throw new Error(`${r.status}`); return await r.json();}finally{clearTimeout(t);} }
async function loadMbta(){ state.mbta.loading=true; try{const json=await fetchJson('https://api-v3.mbta.com/alerts?filter[route]=Green-B,Green-C,Green-D,Green-E,Orange,Red,Blue'); state.mbta.alerts=json.data||[]; state.mbta.error=null;}catch(e){state.mbta.alerts=[];state.mbta.error=e.message;}finally{state.mbta.loading=false;} }
async function loadBikes(){ state.bikes.loading=true; try{
  const [status,info]=await Promise.all([
    fetchJson('https://gbfs.lyft.com/gbfs/1.1/bos/en/station_status.json'),
    fetchJson('https://gbfs.lyft.com/gbfs/1.1/bos/en/station_information.json')
  ]);
  const statuses=status.data?.stations||[]; const infos=info.data?.stations||[]; const byId=new Map(statuses.map(s=>[s.station_id,s]));
  state.bikes.total=statuses.reduce((a,s)=>a+Number(s.num_bikes_available||0),0);
  state.bikes.stations=infos.map(i=>({...i,...byId.get(i.station_id)})).filter(s=>s.lat&&s.lon&&Number(s.num_bikes_available||0)>0).sort((a,b)=>Number(b.num_bikes_available||0)-Number(a.num_bikes_available||0));
  state.bikes.error=null;
  }catch(e){state.bikes.total=1340;state.bikes.stations=[];state.bikes.error=e.message;}finally{state.bikes.loading=false;} }
async function refreshLive(toast=false){ await Promise.all([loadMbta(),loadBikes()]); render(); if(toast) showToast(state.mbta.error&&state.bikes.error?'Live feeds unavailable':'Live data refreshed'); }
function locateUser(){ if(!navigator.geolocation){showToast('Location not available');return;} navigator.geolocation.getCurrentPosition(pos=>{const {latitude,longitude}=pos.coords;const p=posFromLatLon(latitude,longitude); const shell=$('.map-shell'); if(shell){const m=document.createElement('div');m.className='map-marker';m.style.cssText=`left:${p.x}%;top:${p.y}%;background:#fff;color:#0b1117;z-index:5;box-shadow:0 0 22px #5aa2ff`;m.textContent='●';shell.appendChild(m);showToast('Location added to map');}},()=>showToast('Location permission denied'),{enableHighAccuracy:false,timeout:5000}); }

$$('.nav-item').forEach(btn=>btn.onclick=()=>{state.tab=btn.dataset.tab;render();scrollTo(0,0)});
render();
refreshLive(false);
setInterval(()=>{ if(state.tab==='now') render(); },60000);
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));

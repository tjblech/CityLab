const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

const FALLBACK_EVENTS = [
  { id:'preview-ica', title:'ICA Free Admission', venue:'Institute of Contemporary Art', neighborhood:'Seaport', start:null, time:'All day', price:'FREE', category:'Museums', icon:'◫', tone:'blue', x:73, y:43, source:'Preview', preview:true },
  { id:'preview-sowa', title:'SoWa Open Market', venue:'SoWa Power Station', neighborhood:'South End', start:null, time:'10:00 AM – 4:00 PM', price:'FREE', category:'Markets', icon:'✦', tone:'green', x:52, y:63, source:'Preview', preview:true },
  { id:'preview-redsox', title:'Red Sox at Fenway', venue:'Fenway Park', neighborhood:'Fenway', start:null, time:'Evening', price:'$55+', category:'Sports', icon:'◆', tone:'red', x:37, y:54, source:'Preview', preview:true },
  { id:'preview-bts', title:'Live Music at Roadrunner', venue:'Roadrunner', neighborhood:'Brighton', start:null, time:'8:00 PM', price:'$28', category:'Live Music', icon:'♫', tone:'purple', x:25, y:39, source:'Preview', preview:true },
  { id:'preview-mfa', title:'Museum After Dark', venue:'Museum of Fine Arts', neighborhood:'Fenway', start:null, time:'6:00 PM', price:'$20', category:'Museums', icon:'◇', tone:'blue', x:42, y:59, source:'Preview', preview:true },
  { id:'preview-comedy', title:'Stand Up Showcase', venue:'Laugh Boston', neighborhood:'Seaport', start:null, time:'7:30 PM', price:'$25', category:'Comedy', icon:'☻', tone:'purple', x:69, y:55, source:'Preview', preview:true },
  { id:'preview-movie', title:'Late Screening at Brattle', venue:'Brattle Theatre', neighborhood:'Cambridge', start:null, time:'9:30 PM', price:'$9', category:'Movies', icon:'▶', tone:'blue', x:38, y:25, source:'Preview', preview:true },
  { id:'preview-jazz', title:'Berklee Summer Jazz', venue:'Berklee Performance Center', neighborhood:'Back Bay', start:null, time:'8:00 PM', price:'$18', category:'Live Music', icon:'♪', tone:'purple', x:44, y:49, source:'Preview', preview:true },
  { id:'preview-market', title:'Night Market', venue:'Harvard Square', neighborhood:'Cambridge', start:null, time:'6:00 PM', price:'FREE', category:'Markets', icon:'✺', tone:'green', x:32, y:20, source:'Preview', preview:true },
  { id:'preview-weird', title:'After-Hours Observatory', venue:'Boston University', neighborhood:'Fenway / Kenmore', start:null, time:'9:00 PM', price:'FREE', category:'Weird', icon:'✧', tone:'orange', x:36, y:43, source:'Preview', preview:true },
  { id:'preview-arts', title:'Fort Point Art Walk', venue:'Fort Point', neighborhood:'Fort Point', start:null, time:'5:00 PM – 9:00 PM', price:'FREE', category:'Art', icon:'✦', tone:'purple', x:65, y:58, source:'Preview', preview:true },
  { id:'preview-food', title:'North End Summer Stroll', venue:'Hanover Street', neighborhood:'North End', start:null, time:'6:30 PM', price:'FREE', category:'Food', icon:'◉', tone:'orange', x:59, y:36, source:'Preview', preview:true },
];

const CATEGORIES = ['All','Live Music','Sports','Comedy','Movies','Museums','Markets','Art','Food','Classes & Talks','Local','Free','Weird'];
const SOURCE_FILTERS = ['All sources','Boston.gov','ArtsBoston','Boston Public Library','Ticketmaster','Boston Planning','City permits'];
const WHEN_FILTERS = ['Tonight','Tomorrow','This weekend','7 days'];
const PRICE_FILTERS = ['Any price','Free','Under $30'];
const SORT_OPTIONS = ['Recommended','Soonest','Nearby','Cheapest'];
const BOUNDS = { minLat:42.29, maxLat:42.405, minLon:-71.19, maxLon:-70.96 };
const BOSTON_CENTER = [42.3555,-71.0656];
const TRANSIT_HUBS = [
  {name:'Park Street',lat:42.3564,lon:-71.0624,route:'Green / Red',tone:'green'},
  {name:'Downtown Crossing',lat:42.3555,lon:-71.0602,route:'Orange / Red',tone:'orange'},
  {name:'South Station',lat:42.3523,lon:-71.0552,route:'Red / Commuter Rail',tone:'red'},
  {name:'North Station',lat:42.3656,lon:-71.0613,route:'Green / Orange',tone:'green'},
  {name:'Back Bay',lat:42.3474,lon:-71.0757,route:'Orange / Commuter Rail',tone:'orange'},
  {name:'Kenmore',lat:42.3489,lon:-71.0952,route:'Green Line',tone:'green'},
  {name:'Harvard',lat:42.3734,lon:-71.1190,route:'Red Line',tone:'red'},
  {name:'Aquarium',lat:42.3598,lon:-71.0517,route:'Blue Line',tone:'blue'}
];
let liveMap=null;
let mapLayerGroups={};
let userMapMarker=null;
const NEIGHBORHOODS = [
  {name:'Cambridge',x:31,y:23,vibe:'Creative',tags:['museums','food','ideas']},
  {name:'Allston',x:22,y:39,vibe:'Local',tags:['live music','dives','late']},
  {name:'Fenway',x:37,y:53,vibe:'High energy',tags:['sports','music','students']},
  {name:'Back Bay',x:45,y:50,vibe:'Classic',tags:['dining','shopping','architecture']},
  {name:'Downtown',x:56,y:43,vibe:'Central',tags:['events','history','transit']},
  {name:'North End',x:60,y:35,vibe:'Lively',tags:['food','history','waterfront']},
  {name:'Seaport',x:70,y:55,vibe:'Modern',tags:['nightlife','waterfront','events']},
  {name:'South End',x:51,y:62,vibe:'Neighborhood',tags:['food','art','markets']},
  {name:'Jamaica Plain',x:30,y:76,vibe:'Laid-back',tags:['parks','local','food']},
  {name:'Roxbury',x:40,y:74,vibe:'Community',tags:['culture','local','arts']},
  {name:'Dorchester',x:60,y:80,vibe:'Local',tags:['food','community','parks']},
  {name:'East Boston',x:80,y:31,vibe:'Waterfront',tags:['food','views','local']},
  {name:'Charlestown',x:67,y:21,vibe:'Historic',tags:['history','waterfront','pubs']}
];
const VIBE_OPTIONS = ['Surprise me','Live & loud','Cheap & interesting','Culture night','Food & wander','Low-key'];
const BUDGET_OPTIONS = ['Free only','Under $30','Under $60','Whatever'];

function loadSavedMap(){
  const full = JSON.parse(localStorage.getItem('citylab.savedEvents') || '[]');
  const map = new Map(full.filter(Boolean).map(e=>[e.id,e]));
  const legacy = JSON.parse(localStorage.getItem('citylab.saved') || '[]');
  legacy.forEach(id=>{ const e=FALLBACK_EVENTS.find(x=>x.id===id || x.id===`preview-${id}`); if(e) map.set(e.id,e); });
  return map;
}

const state = {
  tab:'now',
  mbta:{ loading:true, alerts:[], arrivals:[], error:null, arrivalsError:null, arrivalsMode:'Boston hubs' },
  bikes:{ loading:true, total:null, stations:[], error:null },
  events:{ loading:false, items:[...FALLBACK_EVENTS], ticketmaster:[], bostonGov:[], source:'Preview', error:null, lastUpdated:null, deduped:0 },
  calendars:{ loading:true, items:[], sources:{}, error:null, lastUpdated:null },
  bostonGov:{ loading:true, items:[], error:null, lastUpdated:null },
  cityPermits:{ loading:true, items:[], error:null, resource:null, lastUpdated:null },
  city311:{ loading:true, today:null, error:null, resource:null },
  saved:loadSavedMap(),
  category:'All', when:'Tonight', price:'Any price', sort:'Recommended', sourceFilter:'All sources', query:'',
  layers:{ events:true, transit:true, bikes:true, pulse:true },
  cityTime:new Date(), activeEvent:null, replayHour:new Date().getHours(), plannerOpen:false,
  mapSavedOnly:false, mapFocusEventId:null, mapView:null,
  planner:{when:'Tonight',budget:'Under $30',vibe:'Surprise me'}, plan:[],
  ticketmasterKey:localStorage.getItem('citylab.ticketmasterKey') || '',
  userLoc:null,
};

function esc(str=''){ return String(str).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m])); }
function nowText(){ return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(state.cityTime); }
function timeOnly(){ return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(state.cityTime); }
function showToast(text){ const el=$('#toast'); if(!el)return; el.textContent=text; el.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>el.classList.remove('show'),1700); }
function sourceBadge(e){
  if(e.source==='Ticketmaster')return '<span class="source-mini live">TICKETS</span>';
  if(e.source==='Boston.gov')return '<span class="source-mini official">BOSTON</span>';
  if(e.source==='ArtsBoston')return '<span class="source-mini arts">ARTS</span>';
  if(e.source==='Boston Public Library')return '<span class="source-mini library">BPL</span>';
  if(e.source==='Boston Planning')return '<span class="source-mini planning">PLANNING</span>';
  if(e.source==='Boston permit')return '<span class="source-mini civic">CITY</span>';
  return '<span class="source-mini preview">PREVIEW</span>';
}
function savePersist(){ localStorage.setItem('citylab.savedEvents',JSON.stringify([...state.saved.values()])); }
function saveEvent(id){ const e=findEvent(id); if(!e)return; if(state.saved.has(id)) state.saved.delete(id); else state.saved.set(id,e); savePersist(); render(); showToast(state.saved.has(id)?'Saved':'Removed'); }
function findEvent(id){ return state.events.items.find(e=>e.id===id) || state.saved.get(id) || FALLBACK_EVENTS.find(e=>e.id===id); }
function priceNumber(price=''){ const m=String(price).match(/\d+(?:\.\d+)?/); return m?Number(m[0]):null; }
function priceTone(price){ if(price==='FREE')return 'green'; const n=priceNumber(price); if(n!=null&&n>=50)return 'red'; return 'blue'; }
function thumbGradient(t){ const g={green:'linear-gradient(145deg,#18352c,#10221e)',blue:'linear-gradient(145deg,#18334e,#101f31)',red:'linear-gradient(145deg,#482027,#28141b)',purple:'linear-gradient(145deg,#34224c,#1e1730)',orange:'linear-gradient(145deg,#49331b,#282014)'}; return g[t]||g.blue; }
function eventThumb(e){ const bg=e.image?`linear-gradient(180deg,transparent 40%,rgba(0,0,0,.55)),url('${esc(e.image)}') center/cover`:thumbGradient(e.tone); return `<div class="event-thumb" style="background:${bg}"><span>${e.image?'':esc(e.icon||'✦')}</span></div>`; }
function eventRow(e,save=false){ return `<div class="${save?'discover-card':'event-row'}" data-open-event="${esc(e.id)}">
  ${eventThumb(e)}
  <div class="event-main"><div class="event-title">${esc(e.title)}</div><div class="event-meta">${esc(e.venue||'Boston')} · ${esc(e.neighborhood||'Boston')}</div><div class="event-time">${esc(e.time||formatEventTime(e.start))} ${sourceBadge(e)}</div></div>
  ${save?`<button class="save-btn ${state.saved.has(e.id)?'saved':''}" data-save="${esc(e.id)}" aria-label="Save ${esc(e.title)}">${state.saved.has(e.id)?'♥':'♡'}</button>`:`<span class="pill ${priceTone(e.price||'')}">${esc(e.price||'Details')}</span>`}
</div>`; }

function formatEventTime(iso){ if(!iso)return 'Time varies'; const d=new Date(iso); if(Number.isNaN(d.getTime()))return 'Time varies'; return new Intl.DateTimeFormat('en-US',{weekday:'short',hour:'numeric',minute:'2-digit'}).format(d); }
function eventDateLabel(e){ if(!e.start)return 'Preview schedule'; const d=new Date(e.start); return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d); }
function categoryTone(category=''){ if(/music/i.test(category))return ['purple','♫']; if(/sport/i.test(category))return ['red','◆']; if(/comedy/i.test(category))return ['purple','☻']; if(/film|movie/i.test(category))return ['blue','▶']; if(/museum|art|theatre|theater/i.test(category))return ['blue','◇']; if(/food/i.test(category))return ['orange','◉']; return ['green','✦']; }
function normalizeCategory(segment='',genre='',sub=''){
  const s=`${segment} ${genre} ${sub}`.toLowerCase();
  if(/music|concert|dj|band/.test(s))return 'Live Music'; if(/sport|game|race|run|fitness/.test(s))return 'Sports';
  if(/comedy|stand.?up/.test(s))return 'Comedy'; if(/film|movie|cinema/.test(s))return 'Movies';
  if(/museum/.test(s))return 'Museums'; if(/market|fair|festival/.test(s))return 'Markets';
  if(/theatre|theater|arts|gallery|exhibit/.test(s))return 'Art'; if(/food|dining|restaurant|taste/.test(s))return 'Food';
  if(/author|lecture|talk|workshop|class|seminar|book club|discussion|tour|training|office hours/.test(s))return 'Classes & Talks';
  return 'Events';
}
function posFromLatLon(lat,lon){ const x=(lon-BOUNDS.minLon)/(BOUNDS.maxLon-BOUNDS.minLon)*100; const y=(BOUNDS.maxLat-lat)/(BOUNDS.maxLat-BOUNDS.minLat)*100; return {x:Math.max(3,Math.min(97,x)),y:Math.max(6,Math.min(88,y))}; }
function latLonFromPos(x,y){ return {lat:BOUNDS.maxLat-(y/100)*(BOUNDS.maxLat-BOUNDS.minLat),lon:BOUNDS.minLon+(x/100)*(BOUNDS.maxLon-BOUNDS.minLon)}; }
function eventLatLon(e){ if(Number.isFinite(e?.lat)&&Number.isFinite(e?.lon))return {lat:e.lat,lon:e.lon,estimated:false}; if(Number.isFinite(e?.x)&&Number.isFinite(e?.y))return {...latLonFromPos(e.x,e.y),estimated:true}; return null; }
function formatHour(h){ const hh=h===24?0:h; if(hh===0)return '12 AM'; if(hh===12)return '12 PM'; return `${hh>12?hh-12:hh} ${hh>=12?'PM':'AM'}`; }
function hourDistance(a,b){ const d=Math.abs(a-b); return Math.min(d,24-d); }

function nearestNeighborhoodByXY(x,y){ if(!Number.isFinite(x)||!Number.isFinite(y))return NEIGHBORHOODS.find(n=>n.name==='Downtown'); return NEIGHBORHOODS.slice().sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0]; }
function neighborhoodFromText(text=''){ const t=text.toLowerCase(); const aliases=[['Fenway',['fenway','kenmore']],['Back Bay',['back bay','copley','newbury']],['Seaport',['seaport','fort point','fan pier']],['South End',['south end','sowa']],['North End',['north end','hanover']],['Allston',['allston','brighton']],['Cambridge',['cambridge','harvard','central square','kendall']],['East Boston',['east boston','eastie']],['Jamaica Plain',['jamaica plain','jp ']],['Dorchester',['dorchester']],['Roxbury',['roxbury']],['Charlestown',['charlestown']],['Chinatown',['chinatown']],['Mission Hill',['mission hill']],['Hyde Park',['hyde park']],['Roslindale',['roslindale']],['Mattapan',['mattapan']],['West Roxbury',['west roxbury']],['Downtown',['downtown','city hall','boston common','downtown crossing','faneuil','government center']]]; for(const [name,keys] of aliases)if(keys.some(k=>t.includes(k)))return name; return ''; }
function inferNeighborhood(e){ const fromText=neighborhoodFromText(`${e.neighborhood||''} ${e.venue||''} ${e.address||''}`); if(fromText)return fromText; if(Number.isFinite(e.x)&&Number.isFinite(e.y))return nearestNeighborhoodByXY(e.x,e.y).name; return e.neighborhood&&e.neighborhood!=='Boston'?e.neighborhood:'Downtown'; }
function hashPos(text=''){ let h=2166136261; for(const ch of text){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);} const n=NEIGHBORHOODS[Math.abs(h)%NEIGHBORHOODS.length]; return {x:n.x+((h>>4)%7)-3,y:n.y+((h>>8)%7)-3}; }
function normalizeTitle(s=''){ return String(s).toLowerCase().replace(/&amp;/g,'and').replace(/[^a-z0-9]+/g,' ').replace(/\b(the|a|an|at|in|of|for|and|boston|ma)\b/g,' ').replace(/\s+/g,' ').trim(); }
function eventDay(e){ if(!e.start)return ''; const d=new Date(e.start); return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10); }
function sourcePriority(e){ return e.source==='ArtsBoston'?46:e.source==='Boston.gov'?44:e.source==='Boston Public Library'?40:e.source==='Ticketmaster'?36:e.source==='Boston Planning'?25:e.source==='Boston permit'?18:5; }
function eventRichness(e){ return sourcePriority(e)+(e.image?8:0)+(e.url?5:0)+(e.info?4:0)+(e.price&&e.price!=='Details'?3:0)+(e.start?4:0)+(Number.isFinite(e.lat)&&Number.isFinite(e.lon)?3:0); }
function tokenSimilarity(a,b){ const A=new Set(normalizeTitle(a).split(' ').filter(x=>x.length>2)),B=new Set(normalizeTitle(b).split(' ').filter(x=>x.length>2)); if(!A.size||!B.size)return 0; let hit=0;A.forEach(x=>{if(B.has(x))hit++});return hit/Math.max(A.size,B.size); }
function sameEvent(a,b){ if(eventDay(a)&&eventDay(b)&&eventDay(a)!==eventDay(b))return false; const sim=tokenSimilarity(a.title,b.title); if(sim>=.72)return true; const va=normalizeTitle(a.venue),vb=normalizeTitle(b.venue); return sim>=.5&&va&&vb&&(va.includes(vb)||vb.includes(va)); }
function mergeEvent(a,b){ const primary=eventRichness(a)>=eventRichness(b)?a:b,secondary=primary===a?b:a; return {...secondary,...primary, image:primary.image||secondary.image||'', info:primary.info||secondary.info||'', url:primary.url||secondary.url||'', price:(primary.price&&primary.price!=='Details'&&primary.price!=='See price')?primary.price:secondary.price||primary.price, lat:Number.isFinite(primary.lat)?primary.lat:secondary.lat, lon:Number.isFinite(primary.lon)?primary.lon:secondary.lon, x:Number.isFinite(primary.x)?primary.x:secondary.x, y:Number.isFinite(primary.y)?primary.y:secondary.y, sources:[...new Set([...(a.sources||[a.source]),...(b.sources||[b.source])])], merged:true}; }
function preferenceProfile(){ const saved=[...state.saved.values()]; const cats={},hoods={}; saved.forEach(e=>{cats[e.category]=(cats[e.category]||0)+1;const h=inferNeighborhood(e);hoods[h]=(hoods[h]||0)+1;}); return {cats,hoods}; }
function recommendationScore(e){ let score=sourcePriority(e); if(e.source==='Boston.gov'||e.source==='ArtsBoston')score+=8; if(e.source==='Boston Public Library')score+=4; if(e.source==='Boston Planning')score-=7; if(e.price==='FREE')score+=9; if(e.image)score+=5; if(e.info)score+=3; if(['Weird','Local','Markets','Art','Museums'].includes(e.category))score+=4; const pref=preferenceProfile();score+=(pref.cats[e.category]||0)*5;score+=(pref.hoods[inferNeighborhood(e)]||0)*3; if(e.start){const hrs=(new Date(e.start)-new Date())/36e5;if(hrs>=0&&hrs<8)score+=12;else if(hrs<24)score+=8;else if(hrs<72)score+=3;} return score; }
function haversineMiles(lat1,lon1,lat2,lon2){ const R=3958.8,toRad=x=>x*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(a)); }
function eventDistance(e){ if(!state.userLoc||!Number.isFinite(e.lat)||!Number.isFinite(e.lon))return null; return haversineMiles(state.userLoc.lat,state.userLoc.lon,e.lat,e.lon); }
function eventDistanceLabel(e){ const d=eventDistance(e); return d==null?'':d<0.1?'<0.1 mi':`${d.toFixed(d<10?1:0)} mi`; }
function sourceCount(){ return [state.events.ticketmaster?.length,state.bostonGov.items?.length,state.cityPermits.items?.length,...Object.values(state.calendars.sources||{}).map(x=>x?.count||0)].filter(n=>n>0).length; }
function rebuildEventLayer(){
  const live=[...(state.events.ticketmaster||[]),...(state.bostonGov.items||[]),...(state.calendars.items||[]),...(state.cityPermits.items||[])].filter(Boolean);
  const out=[]; let merged=0;
  live.sort((a,b)=>sourcePriority(b)-sourcePriority(a)).forEach(e=>{ const idx=out.findIndex(x=>sameEvent(x,e)); if(idx>=0){out[idx]=mergeEvent(out[idx],e);merged++;} else out.push({...e,sources:e.sources||[e.source]}); });
  out.sort((a,b)=>new Date(a.start||8640000000000000)-new Date(b.start||8640000000000000));
  state.events.items=out.length?out:[...FALLBACK_EVENTS]; state.events.deduped=merged;
  const names=[]; if(state.bostonGov.items?.length)names.push('Boston.gov'); if(state.calendars.sources?.arts?.count)names.push('ArtsBoston'); if(state.calendars.sources?.bpl?.count)names.push('BPL'); if(state.events.ticketmaster?.length)names.push('Ticketmaster'); if(state.calendars.sources?.planning?.count)names.push('Planning'); if(state.cityPermits.items?.length)names.push('City permits');
  state.events.source=names.length?names.join(' + '):'Preview';
}
function budgetAllows(e,budget){ if(budget==='Whatever')return true; if(budget==='Free only')return e.price==='FREE'; const n=priceNumber(e.price); const lim=budget==='Under $60'?60:30; return e.price==='FREE'||(n!=null&&n<=lim)||e.source==='Boston permit'; }
function vibeCategories(vibe){ return {'Live & loud':['Live Music','Comedy','Sports'],'Cheap & interesting':['Weird','Museums','Art','Markets','Local'],'Culture night':['Museums','Art','Movies','Weird'],'Food & wander':['Food','Markets','Local'],'Low-key':['Museums','Movies','Art','Markets']}[vibe]||[]; }
function eventPlanScore(e){ let score=0; if(e.source==='Boston permit')score+=12; if(e.source==='Ticketmaster')score+=6; if(e.price==='FREE')score+=10; if(vibeCategories(state.planner.vibe).includes(e.category))score+=18; const n=priceNumber(e.price); if(n!=null&&n<=30)score+=5; if(e.category==='Weird'||e.category==='Local')score+=8; if(e.start){const d=new Date(e.start); const hrs=(d-new Date())/36e5; if(hrs>=0&&hrs<24)score+=10; else if(hrs<72)score+=4;} return score; }
function generatePlan(){ const {start,end}=dateBounds(state.planner.when); let pool=state.events.items.filter(e=>budgetAllows(e,state.planner.budget)&&(!e.start||e.preview||(new Date(e.start)>=start&&new Date(e.start)<=end))); if(!pool.length)pool=[...state.events.items]; pool=pool.slice().sort((a,b)=>eventPlanScore(b)-eventPlanScore(a)); const chosen=[]; const used=new Set(); for(const e of pool){ const hood=inferNeighborhood(e); if(chosen.length<2||!used.has(hood)){chosen.push(e);used.add(hood);} if(chosen.length===3)break;} if(chosen.length<3)for(const e of pool){if(!chosen.includes(e)){chosen.push(e);if(chosen.length===3)break;}} state.plan=chosen.sort((a,b)=>new Date(a.start||0)-new Date(b.start||0)); }
function savedEventsOrdered(){ const arr=[...state.saved.values()]; const order=JSON.parse(localStorage.getItem('citylab.savedOrder')||'[]'); if(!order.length)return arr.sort((a,b)=>new Date(a.start||0)-new Date(b.start||0)); const rank=new Map(order.map((id,i)=>[id,i])); return arr.sort((a,b)=>(rank.get(a.id)??999)-(rank.get(b.id)??999)); }
function optimizeSaved(){ const pool=[...state.saved.values()]; if(pool.length<2)return; const withPos=pool.map(e=>{let x=e.x,y=e.y;if(!Number.isFinite(x)||!Number.isFinite(y)){const p=hashPos(`${e.title}${e.venue}`);x=p.x;y=p.y;}return {...e,x,y};}); withPos.sort((a,b)=>new Date(a.start||0)-new Date(b.start||0)); const out=[withPos.shift()]; while(withPos.length){const last=out[out.length-1];let bi=0,bs=Infinity;withPos.forEach((e,i)=>{const dist=Math.hypot(last.x-e.x,last.y-e.y);const timePenalty=Math.max(0,(new Date(last.start||0)-new Date(e.start||0))/36e5)*12;const score=dist+timePenalty;if(score<bs){bs=score;bi=i;}});out.push(withPos.splice(bi,1)[0]);} localStorage.setItem('citylab.savedOrder',JSON.stringify(out.map(e=>e.id))); showToast('Route reordered to reduce backtracking'); }
function neighborhoodStats(n){ const events=state.events.items.filter(e=>inferNeighborhood(e)===n.name).length; const bikes=state.bikes.stations.filter(s=>{const p=posFromLatLon(Number(s.lat),Number(s.lon));return nearestNeighborhoodByXY(p.x,p.y).name===n.name;}); const available=bikes.reduce((a,b)=>a+Number(b.num_bikes_available||0),0); const activity=Math.min(5,Math.max(1,Math.ceil((events*1.5+Math.min(available/18,4))/2))); return {events,available,activity}; }
function busiestNeighborhood(){ return NEIGHBORHOODS.map(n=>({n,...neighborhoodStats(n)})).sort((a,b)=>(b.events*4+b.available/15)-(a.events*4+a.available/15))[0]; }
function activityAtHour(h){ const hour=h===24?0:h; const curve={0:58,1:48,2:39,3:31,4:28,5:31,6:38,7:48,8:56,9:60,10:63,11:66,12:70,13:72,14:74,15:76,16:79,17:84,18:88,19:91,20:94,21:93,22:89,23:78}; const base=curve[hour]||60; const alerts=Math.min(5,state.mbta.alerts.length); return Math.max(30,Math.min(98,base-alerts)); }
function replayEventCount(h){ const real=state.events.items.filter(e=>{if(!e.start)return true;const eh=new Date(e.start).getHours();const hh=h===24?0:h;return Math.abs(eh-hh)<=2||Math.abs(eh-hh)>=22;}).length; return real||Math.max(1,Math.round(state.events.items.length*(activityAtHour(h)/100))); }

function dateBounds(label){ const now=new Date(); const start=new Date(now); let end=new Date(now);
  if(label==='Tonight'){ start.setHours(17,0,0,0); if(now>start) start.setTime(now.getTime()); end=new Date(start); end.setHours(29,0,0,0); }
  else if(label==='Tomorrow'){ start.setDate(start.getDate()+1); start.setHours(0,0,0,0); end=new Date(start); end.setDate(end.getDate()+1); }
  else if(label==='This weekend'){ const day=start.getDay(); const toFri=(5-day+7)%7; start.setDate(start.getDate()+toFri); start.setHours(17,0,0,0); end=new Date(start); end.setDate(end.getDate()+3); end.setHours(2,0,0,0); }
  else { start.setTime(now.getTime()); end=new Date(now); end.setDate(end.getDate()+7); }
  return {start,end};
}
function filteredEvents(){ const {start,end}=dateBounds(state.when); const q=state.query.trim().toLowerCase(); const items=state.events.items.filter(e=>{
  if(state.category!=='All' && (state.category==='Free' ? e.price!=='FREE' : e.category!==state.category)) return false;
  if(state.price==='Free' && e.price!=='FREE')return false;
  if(state.price==='Under $30'){ const n=priceNumber(e.price); if(e.price!=='FREE' && !(n!=null&&n<30))return false; }
  if(q && !`${e.title} ${e.venue} ${e.neighborhood} ${e.category} ${e.info||''}`.toLowerCase().includes(q))return false;
  if(state.sourceFilter!=='All sources' && !(e.sources||[e.source]).some(src=>(src==='Boston permit'?'City permits':src)===state.sourceFilter))return false;
  if(e.preview || !e.start)return true; const d=new Date(e.start); return d>=start&&d<=end;
 });
 const sorter={
   'Recommended':(a,b)=>recommendationScore(b)-recommendationScore(a)||new Date(a.start||8640000000000000)-new Date(b.start||8640000000000000),
   'Soonest':(a,b)=>new Date(a.start||8640000000000000)-new Date(b.start||8640000000000000),
   'Nearby':(a,b)=>(eventDistance(a)??999)-(eventDistance(b)??999)||recommendationScore(b)-recommendationScore(a),
   'Cheapest':(a,b)=>(a.price==='FREE'?0:(priceNumber(a.price)??999))-(b.price==='FREE'?0:(priceNumber(b.price)??999))
 }[state.sort]||(()=>0); return items.sort(sorter);
}
function featuredEvents(kind,limit=5){ const all=filteredEvents(); if(kind==='best')return all.slice().sort((a,b)=>recommendationScore(b)-recommendationScore(a)).slice(0,limit); if(kind==='free')return all.filter(e=>e.price==='FREE'&&['Weird','Local','Markets','Art','Museums','Movies','Live Music'].includes(e.category)).sort((a,b)=>recommendationScore(b)-recommendationScore(a)).slice(0,limit); if(kind==='near')return state.userLoc?all.filter(e=>eventDistance(e)!=null).sort((a,b)=>eventDistance(a)-eventDistance(b)).slice(0,limit):[]; return []; }

function lineSummary(line){
  const routeMap={Green:['Green-B','Green-C','Green-D','Green-E'],Orange:['Orange'],Red:['Red'],Blue:['Blue']};
  const alerts=state.mbta.alerts.filter(a=>(a.attributes?.active_period||[]).some(p=>!p.end||new Date(p.end)>new Date()) && (a.relationships?.route?.data?.id?routeMap[line].includes(a.relationships.route.data.id):true));
  const severe=alerts.filter(a=>['SUSPENSION','DELAY','SHUTTLE'].includes(a.attributes?.effect));
  if(severe.length)return {text:severe.length>1?`${severe.length} alerts`:'Delay',cls:'status-warn'};
  return {text:'Normal service',cls:'status-ok'};
}
function cityPulseScore(){ const h=state.cityTime.getHours(); const timeScore=h>=17&&h<=23?20:h>=11?12:6; const bike=Math.min(25,Math.round((state.bikes.total||1300)/100)); const alertPenalty=Math.min(12,state.mbta.alerts.length*2); const eventBoost=Math.min(8,Math.round(state.events.items.filter(e=>!e.preview).length/8)); return Math.max(42,Math.min(94,55+timeScore+bike+eventBoost-alertPenalty)); }
function cityPulseLabel(){ const s=cityPulseScore(); return s>82?'Very active':s>68?'Active':s>55?'Steady':'Quiet'; }

function arrivalsHtml(){ if(state.mbta.arrivalsError)return `<div class="mini-empty">Arrival feed unavailable</div>`; if(!state.mbta.arrivals.length)return `<div class="mini-empty">Loading upcoming trains…</div>`; return state.mbta.arrivals.slice(0,5).map(a=>`<div class="arrival-row"><span class="route-dot ${a.routeClass}">${esc(a.badge)}</span><div class="arrival-main"><b>${esc(a.routeName)}</b><small>${esc(a.stopName)}${a.direction?' · '+esc(a.direction):''}</small></div><strong>${esc(a.when)}</strong></div>`).join(''); }

function renderNow(){
  const green=lineSummary('Green'),orange=lineSummary('Orange'); const totalAlerts=state.mbta.loading?'—':state.mbta.alerts.length; const bikeTotal=state.bikes.loading?'—':(state.bikes.total?.toLocaleString()||'—'); const liveEvents=state.events.items.filter(e=>!e.preview).length; const eventCount=liveEvents||state.events.items.length;
  return `<header class="header"><div><h1>BOSTON</h1><div class="subhead">${nowText()}</div></div><div class="header-actions"><button class="icon-btn" data-refresh title="Refresh live data">↻</button><button class="icon-btn" data-tab-jump="saved" title="Saved">♡</button></div></header>
  <div class="section"><div class="section-head"><div class="section-title">⌁ City Pulse</div><span class="live-label"><span class="live-dot"></span>Live</span></div><div class="card pulse-card"><div class="pulse-top"><span class="eyebrow">Boston right now</span><strong style="color:var(--green)">${cityPulseLabel()}</strong></div><div class="pulse-wave"><svg viewBox="0 0 500 60" preserveAspectRatio="none"><path d="M0 38 L28 37 L42 34 L55 38 L65 38 L74 11 L84 51 L98 29 L110 38 L151 38 L167 35 L179 40 L195 36 L218 38 L237 18 L248 48 L259 32 L273 38 L320 38 L337 35 L352 41 L366 37 L382 38 L397 21 L409 47 L421 31 L435 38 L500 38" fill="none" stroke="#78db78" stroke-width="2"/><path d="M0 38 H500" stroke="rgba(120,219,120,.14)"/></svg></div><div class="pulse-status"><div><strong>${cityPulseScore()}</strong><div class="pulse-index">City activity index</div></div><div class="pulse-index">Transit · events · bikes · time</div></div></div></div>
  <div class="section"><div class="section-head"><div class="section-title">Transit</div><button class="text-btn" data-nearby-transit>Use my location</button></div><div class="card transit-grid"><div class="transit-cell"><div class="route-row"><span class="route-dot route-green">T</span><div><h3>Green Line</h3><div class="metric-caption ${green.cls}">${green.text}</div></div></div></div><div class="transit-cell"><div class="route-row"><span class="route-dot route-orange">T</span><div><h3>Orange Line</h3><div class="metric-caption ${orange.cls}">${orange.text}</div></div></div></div><div class="transit-cell" style="text-align:center"><b style="font-size:24px;color:${Number(totalAlerts)>0?'var(--red)':'var(--green)'}">${totalAlerts}</b><div class="metric-caption">active alerts</div></div></div></div>
  <div class="section compact-top"><div class="section-head"><div><div class="section-title">Upcoming trains</div><div class="microcopy">${esc(state.mbta.arrivalsMode)}</div></div><button class="text-btn" data-refresh-arrivals>Refresh</button></div><div class="card arrivals-card">${arrivalsHtml()}</div></div>
  <div class="section"><div class="section-head"><div class="section-title">Today</div><button class="text-btn" data-tab-jump="discover">View all</button></div><div class="card today-grid"><div class="big-stat"><b>${eventCount}</b><span>${liveEvents?'live events':'preview things'}</span></div><div class="big-stat green"><b>${state.events.items.filter(e=>e.price==='FREE').length}</b><span>free</span></div><div class="big-stat blue"><b>${state.events.items.filter(e=>{const n=priceNumber(e.price);return e.price==='FREE'||(n!=null&&n<30)}).length}</b><span>under $30</span></div></div></div>
  ${(()=>{const best=featuredEvents('best',1)[0],free=featuredEvents('free',1)[0];if(!best&&!free)return '';return `<div class="section"><div class="section-head"><div><div class="section-title">Tonight's brief</div><div class="microcopy">Two things worth knowing about</div></div><button class="text-btn" data-tab-jump="discover">Discover</button></div><div class="card brief-card"><div class="brief-grid">${best?`<button class="brief-pick best" data-open-event="${esc(best.id)}"><span>Best bet</span><b>${esc(best.title)}</b><small>${esc(best.time||formatEventTime(best.start))} · ${esc(inferNeighborhood(best))}</small></button>`:''}${free?`<button class="brief-pick free" data-open-event="${esc(free.id)}"><span>Free find</span><b>${esc(free.title)}</b><small>${esc(free.time||formatEventTime(free.start))} · ${esc(inferNeighborhood(free))}</small></button>`:''}</div></div></div>`})()}
  <div class="section"><div class="section-head"><div><div class="section-title">Coming up near you</div><div class="microcopy">${state.events.items.some(e=>!e.preview)?`Live layers · ${state.events.source}`:'Preview until a live event source connects'}</div></div><button class="text-btn" data-tab-jump="discover">View all</button></div><div class="card event-list">${filteredEvents().slice(0,4).map(e=>eventRow(e)).join('')||'<div class="empty">No matching events right now.</div>'}</div></div>
  <div class="section"><div class="section-head"><div class="section-title">The city right now</div><button class="text-btn" data-tab-jump="live">Open map</button></div><div class="card city-stats"><div class="city-stat"><div class="ico" style="color:var(--orange)">☏</div><b>${state.city311.today==null?'—':state.city311.today.toLocaleString()}</b><small>311 requests<br>today</small></div><div class="city-stat"><div class="ico" style="color:var(--green)">♧</div><b>${bikeTotal}</b><small>Bluebikes<br>available</small></div><div class="city-stat"><div class="ico" style="color:var(--yellow)">☆</div><b>${eventCount}</b><small>${liveEvents?'live':'preview'}<br>events</small></div><div class="city-stat"><div class="ico" style="color:var(--purple)">⌁</div><b>${cityPulseScore()}</b><small>city<br>pulse</small></div></div></div>`;
}

function featureCard(e){ const dist=eventDistanceLabel(e); return `<button class="feature-event" data-open-event="${esc(e.id)}">${eventThumb(e)}<span class="feature-copy"><b>${esc(e.title)}</b><small>${esc(e.venue||inferNeighborhood(e))}</small><em>${esc(e.time||formatEventTime(e.start))}${dist?' · '+esc(dist):''}</em></span><span class="pill ${priceTone(e.price||'')}">${esc(e.price||'Details')}</span></button>`; }
function renderNeighborhoods(){ return `<div class="neighborhood-grid">${NEIGHBORHOODS.slice(0,8).map(n=>{const st=neighborhoodStats(n);return `<button class="neighborhood-card" data-neighborhood="${esc(n.name)}"><div class="neighborhood-top"><div><b>${esc(n.name)}</b><span>${esc(n.vibe)}</span></div><div class="activity-dots">${Array.from({length:5},(_,i)=>`<i class="${i<st.activity?'on':''}"></i>`).join('')}</div></div><div class="neighborhood-tags">${n.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="neighborhood-stats"><span>${st.events} events</span><span>${st.available} bikes</span></div></button>`}).join('')}</div>`; }
function renderDiscover(){ const filtered=filteredEvents(); const liveCount=state.events.items.filter(e=>!e.preview).length; const best=featuredEvents('best',4),free=featuredEvents('free',4),near=featuredEvents('near',4); return `<header class="header"><div><h1 style="font-size:31px">DISCOVER</h1><div class="subhead">The good stuff, not just the obvious stuff.</div></div><button class="icon-btn" data-event-source title="Event sources">⌁</button></header>
  <button class="plan-hero" data-open-planner><div><span class="eyebrow">CITYLAB PLAN</span><b>Do Something</b><small>Give me a budget + vibe. Build a real Boston night.</small></div><span class="plan-spark">✦</span></button>
  <div class="search-box"><span>⌕</span><input id="eventSearch" value="${esc(state.query)}" placeholder="Search events, venues, neighborhoods" autocomplete="off"></div>
  <div class="chips">${CATEGORIES.map(c=>`<button class="chip ${c===state.category?'active':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('')}</div>
  <div class="filter-row v6-filters"><select data-when>${WHEN_FILTERS.map(v=>`<option ${v===state.when?'selected':''}>${v}</option>`).join('')}</select><select data-price>${PRICE_FILTERS.map(v=>`<option ${v===state.price?'selected':''}>${v}</option>`).join('')}</select><select data-sort>${SORT_OPTIONS.map(v=>`<option ${v===state.sort?'selected':''}>${v}</option>`).join('')}</select><select data-source-filter>${SOURCE_FILTERS.map(v=>`<option ${v===state.sourceFilter?'selected':''}>${v}</option>`).join('')}</select></div>
  <div class="source-strip"><span class="source-chip ${liveCount?'live':''}">${state.events.loading||state.cityPermits.loading||state.bostonGov.loading||state.calendars.loading?'Syncing…':state.events.source}</span><span>${sourceCount()} live sources · ${state.events.deduped} duplicates merged</span></div>
  ${best.length?`<div class="section"><div class="section-head"><div><div class="section-title">Best ${state.when.toLowerCase()}</div><div class="microcopy">Ranked from source quality, timing + things you save</div></div></div><div class="feature-scroll">${best.map(featureCard).join('')}</div></div>`:''}
  ${free.length?`<div class="section"><div class="section-head"><div><div class="section-title">Free & interesting</div><div class="microcopy">The stuff a generic ticket app tends to miss</div></div><button class="text-btn" data-search-preset="FREE">See all</button></div><div class="feature-scroll">${free.map(featureCard).join('')}</div></div>`:''}
  <div class="section"><div class="section-head"><div><div class="section-title">Near you</div><div class="microcopy">${state.userLoc?'Sorted from your current location':'Location stays on this device'}</div></div><button class="text-btn" data-discover-location>${state.userLoc?'Refresh location':'Use my location'}</button></div>${state.userLoc?(near.length?`<div class="feature-scroll">${near.map(featureCard).join('')}</div>`:'<div class="card mini-empty">No coordinate-rich listings nearby yet.</div>'):'<button class="nearby-cta" data-discover-location>⌖ Show me what is actually close</button>'}</div>
  <div class="section"><div class="section-head"><div><div class="section-title">${esc(state.when)} in Boston</div><div class="microcopy">${state.events.error?esc(state.events.error):liveCount?`${liveCount} current listings across ${state.events.source}`:'Preview catalog until a live source loads'}</div></div><span class="pill">${filtered.length} results</span></div><div class="card">${filtered.map(e=>eventRow(e,true)).join('')||'<div class="empty"><div class="big">⌕</div><b>No matches</b><p style="margin-top:6px">Try a broader category, date, or price.</p></div>'}</div></div>
  <div class="section"><div class="section-head"><div><div class="section-title">Neighborhood pulse</div><div class="microcopy">Events + live Bluebike activity</div></div></div>${renderNeighborhoods()}</div>`; }

function destroyLiveMap(){
  if(liveMap){ try{const c=liveMap.getCenter();state.mapView={lat:c.lat,lon:c.lng,zoom:liveMap.getZoom()};}catch(_){} try{liveMap.remove();}catch(_){} liveMap=null; }
  mapLayerGroups={}; userMapMarker=null;
}
function mapToneColor(tone='green'){
  return {green:'#78db78',orange:'#f3a13b',red:'#ff5d64',blue:'#5aa2ff',purple:'#ae72f8'}[tone]||'#78db78';
}
function mapEventOpacity(e,h=state.replayHour){
  if(!e.start)return e.preview?.72:.82;
  const d=new Date(e.start); if(Number.isNaN(d.getTime()))return .72;
  return hourDistance(d.getHours(),h===24?0:h)<=2?1:.18;
}
function mapEventsForDisplay(){
  let items=state.events.items.filter(e=>eventLatLon(e));
  if(state.mapSavedOnly)items=items.filter(e=>state.saved.has(e.id));
  return items.slice(0,140);
}
function mapEventIcon(e,estimated=false){
  const c=mapToneColor(e.tone||'red');
  const cls=`city-map-pin event-pin${estimated?' estimated':''}${state.saved.has(e.id)?' saved':''}`;
  return L.divIcon({className:'city-map-icon',html:`<span class="${cls}" style="--pin:${c}">${esc(e.icon||'●')}</span>`,iconSize:[30,30],iconAnchor:[15,15]});
}
function addMapEventMarkers(){
  const group=mapLayerGroups.events; if(!group||!window.L)return;
  group.clearLayers();
  mapEventsForDisplay().forEach(e=>{
    const ll=eventLatLon(e); if(!ll)return;
    const marker=L.marker([ll.lat,ll.lon],{icon:mapEventIcon(e,ll.estimated),opacity:mapEventOpacity(e),keyboard:true});
    const source=ll.estimated?'Approximate location':(e.source||'CityLab');
    marker.bindTooltip(`<b>${esc(e.title)}</b><br><span>${esc(e.time||formatEventTime(e.start))} · ${esc(e.price||'Details')}</span><br><small>${esc(source)}</small>`,{direction:'top',offset:[0,-12],opacity:.96,className:'city-map-tooltip'});
    marker.on('click',()=>{state.activeEvent=findEvent(e.id);state.plannerOpen=false;render();});
    marker.addTo(group);
  });
}
function addMapBikeMarkers(){
  const group=mapLayerGroups.bikes; if(!group||!window.L)return;
  group.clearLayers();
  const bikes=(state.bikes.stations||[]).filter(s=>Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lon))).slice(0,120);
  bikes.forEach(s=>{
    const n=Number(s.num_bikes_available||0), docks=Number(s.num_docks_available||0);
    const m=L.circleMarker([Number(s.lat),Number(s.lon)],{radius:Math.max(4,Math.min(8,4+n/8)),color:'#5aa2ff',weight:1,fillColor:'#247ed2',fillOpacity:.82,opacity:.9});
    m.bindPopup(`<div class="map-popup"><b>${esc(s.name||'Bluebikes station')}</b><span>${n} bikes · ${docks} open docks</span></div>`);
    m.addTo(group);
  });
}
function addMapTransitMarkers(){
  const group=mapLayerGroups.transit; if(!group||!window.L)return;
  group.clearLayers();
  TRANSIT_HUBS.forEach(s=>{
    const c=mapToneColor(s.tone);
    const icon=L.divIcon({className:'city-map-icon',html:`<span class="city-map-pin transit-pin" style="--pin:${c}">T</span>`,iconSize:[28,28],iconAnchor:[14,14]});
    const m=L.marker([s.lat,s.lon],{icon});
    m.bindPopup(`<div class="map-popup"><b>${esc(s.name)}</b><span>${esc(s.route)}</span></div>`);
    m.addTo(group);
  });
}
function addMapPulse(){
  const group=mapLayerGroups.pulse; if(!group||!window.L)return;
  group.clearLayers();
  NEIGHBORHOODS.forEach(n=>{
    const ll=latLonFromPos(n.x,n.y), st=neighborhoodStats(n);
    const r=120+st.activity*80;
    const circle=L.circle([ll.lat,ll.lon],{radius:r,color:'#ae72f8',weight:1,opacity:.28,fillColor:'#ae72f8',fillOpacity:.035+st.activity*.018,interactive:true});
    circle.bindTooltip(`<b>${esc(n.name)}</b><br>${st.events} events · ${st.available} bikes`,{className:'city-map-tooltip',direction:'top'});
    circle.addTo(group);
  });
}
function updateMapLayerVisibility(){
  if(!liveMap)return;
  Object.entries(mapLayerGroups).forEach(([k,g])=>{ if(!g)return; const on=!!state.layers[k]; if(on&&!liveMap.hasLayer(g))g.addTo(liveMap); if(!on&&liveMap.hasLayer(g))liveMap.removeLayer(g); });
  $$('[data-layer]').forEach(b=>b.classList.toggle('active',!!state.layers[b.dataset.layer]));
  const saved=$('[data-map-saved]'); if(saved)saved.classList.toggle('active',state.mapSavedOnly);
}
function updateMapReplayUI(){
  if(liveMap&&mapLayerGroups.events)addMapEventMarkers();
  const h=state.replayHour, nowH=new Date().getHours(), isNow=hourDistance(h===24?0:h,nowH)<=0;
  const title=$('#scrubTitle'); if(title)title.textContent=`${isNow?'Now':'City Replay'} · ${formatHour(h)}`;
  const reset=$('[data-live-now]'); if(reset){reset.classList.toggle('is-live',isNow);reset.innerHTML=`<span class="live-dot"></span>${isNow?'Live':'Return live'}`;}
  const ev=$('[data-map-event-count]'); if(ev)ev.textContent=replayEventCount(h);
  const act=$('[data-map-activity]'); if(act)act.textContent=activityAtHour(h);
}
function initLiveMap(){
  const host=$('#cityMap'); if(!host)return;
  if(!window.L){host.innerHTML='<div class="map-fallback"><b>Map library unavailable</b><span>CityLab still has your city data. Reconnect and reopen Live City to load the geographic map.</span></div>';return;}
  destroyLiveMap();
  const mv=state.mapView||{lat:BOSTON_CENTER[0],lon:BOSTON_CENTER[1],zoom:13};
  liveMap=L.map(host,{zoomControl:false,attributionControl:false,preferCanvas:true,minZoom:10,maxZoom:18,zoomSnap:.5,worldCopyJump:false}).setView([mv.lat,mv.lon],mv.zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(liveMap);
  liveMap.setMaxBounds([[42.25,-71.25],[42.44,-70.90]]);
  mapLayerGroups={events:L.layerGroup(),transit:L.layerGroup(),bikes:L.layerGroup(),pulse:L.layerGroup()};
  addMapPulse(); addMapBikeMarkers(); addMapTransitMarkers(); addMapEventMarkers(); updateMapLayerVisibility();
  setTimeout(()=>liveMap?.invalidateSize(),40);
  if(state.mapFocusEventId){const e=findEvent(state.mapFocusEventId),ll=eventLatLon(e);if(ll){setTimeout(()=>liveMap?.flyTo([ll.lat,ll.lon],15,{duration:.65}),80);}state.mapFocusEventId=null;}
  else if(state.userLoc)setTimeout(()=>addUserToLiveMap(false),80);
}
function addUserToLiveMap(fly=true){
  if(!liveMap||!state.userLoc||!window.L)return;
  if(userMapMarker)userMapMarker.remove();
  userMapMarker=L.circleMarker([state.userLoc.lat,state.userLoc.lon],{radius:8,color:'#ffffff',weight:3,fillColor:'#5aa2ff',fillOpacity:1}).bindTooltip('You are here',{permanent:false,direction:'top'}).addTo(liveMap);
  if(fly)liveMap.flyTo([state.userLoc.lat,state.userLoc.lon],15,{duration:.65});
}
function locateUserOnMap(){
  if(!navigator.geolocation){showToast('Location not available');return;}
  navigator.geolocation.getCurrentPosition(pos=>{state.userLoc={lat:pos.coords.latitude,lon:pos.coords.longitude};addUserToLiveMap(true);showToast('Centered on your location');},()=>showToast('Location permission denied'),{enableHighAccuracy:false,timeout:6000,maximumAge:60000});
}
function renderLive(){
  const h=state.replayHour, nowH=new Date().getHours(), isNow=hourDistance(h===24?0:h,nowH)<=0, count=replayEventCount(h);
  return `<header class="header"><div><h1 style="font-size:30px">LIVE CITY</h1><div class="subhead">Real Boston geography · live CityLab layers.</div></div><div class="header-actions"><button class="icon-btn" data-location title="Find me">⌖</button><button class="icon-btn" data-refresh title="Refresh city data">↻</button></div></header>
  <div class="map-shell real-map-shell">
    <div id="cityMap" class="city-map" role="region" aria-label="Interactive map of Boston"></div>
    <div class="map-filters">${[['events','● Events'],['transit','T Transit'],['bikes','♧ Bikes'],['pulse','◎ Pulse']].map(([k,l])=>`<button class="map-filter ${state.layers[k]?'active':''}" data-layer="${k}">${l}</button>`).join('')}<button class="map-filter saved-filter ${state.mapSavedOnly?'active':''}" data-map-saved>♡ Saved</button></div>
    <div class="map-tools"><button data-map-home title="Reset Boston view">⌂</button><button data-location title="Find me">⌖</button></div>
    <a class="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>
    <div class="map-bottom">
      <div class="scrub-label"><b id="scrubTitle">${isNow?'Now':'City Replay'} · ${formatHour(h)}</b><button class="live-reset ${isNow?'is-live':''}" data-live-now><span class="live-dot"></span>${isNow?'Live':'Return live'}</button></div>
      <input class="scrubber" id="timeScrubber" type="range" min="0" max="24" value="${h}" step="1" aria-label="City replay hour">
      <div class="scrub-times"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span></div>
      <div class="map-summary"><div class="summary-item"><b style="color:var(--red)" data-map-event-count>${count}</b><small>events near hour</small></div><div class="summary-item"><b style="color:var(--orange)">${state.mbta.loading?'—':state.mbta.alerts.length}</b><small>alerts</small></div><div class="summary-item"><b style="color:var(--blue)">${state.bikes.loading?'—':(state.bikes.total||0).toLocaleString()}</b><small>bikes now</small></div><div class="summary-item"><b style="color:var(--green)" data-map-activity>${activityAtHour(h)}</b><small>activity</small></div></div>
      <div class="map-legend"><span><i class="legend-solid"></i> precise</span><span><i class="legend-dashed"></i> approximate event location</span><span>Tap a marker for details</span></div>
    </div>
  </div>`;
}

function renderSaved(){ const events=savedEventsOrdered(); return `<header class="header"><div><h1 style="font-size:31px">SAVED</h1><div class="subhead">Your Boston shortlist.</div></div></header><div class="section"><div class="section-head"><div class="section-title">Events</div><span class="pill green">${events.length} saved</span></div><div class="card">${events.length?events.map(e=>eventRow(e,true)).join(''):`<div class="empty"><div class="big">♡</div><b>Nothing saved yet</b><p style="margin-top:6px">Save things from Discover and they’ll stay here even when live feeds refresh.</p></div>`}</div></div>${events.length>=2?`<div class="section"><div class="section-head"><div><div class="section-title">Tonight route</div><div class="microcopy">CityLab minimizes backtracking while respecting event order</div></div><button class="text-btn" data-optimize>Optimize</button></div><div class="card card-pad"><div style="display:flex;align-items:center;gap:12px"><div class="logo-mark">C</div><div><b>${events.length} stops · Boston</b><div class="subhead">Tap Optimize to reorder</div></div></div><div class="itinerary">${events.map((e,i)=>`<div class="itinerary-row"><span class="itinerary-dot">${i+1}</span><div><b>${esc(e.title)}</b><small>${esc(e.time||formatEventTime(e.start))} · ${esc(inferNeighborhood(e))}</small></div></div>`).join('')}</div></div></div>`:''}`; }

function sourceState(label,ok,extra=''){ return `<div class="source-row"><div class="source-icon">${label.icon}</div><div class="source-copy"><b>${esc(label.name)}</b><p>${esc(label.desc)}${extra?` · ${esc(extra)}`:''}</p></div><span class="source-state ${ok?'live':'demo'}">${ok?'live':'fallback'}</span></div>`; }
function renderMore(){ const liveEventCount=state.events.items.filter(e=>!e.preview).length; const busy=busiestNeighborhood(); const free=state.events.items.filter(e=>e.price==='FREE').length; const freeShare=state.events.items.length?Math.round(free/state.events.items.length*100):0; return `<header class="header"><div><div class="mini-logo"><div class="logo-mark">C</div><div><h2>CityLab V6</h2><div class="subhead">Boston intelligence console</div></div></div></div></header>
  <div class="section"><div class="section-head"><div class="section-title">City data</div><button class="text-btn" data-refresh>Refresh</button></div><div class="data-grid"><div class="card data-card"><div class="kicker">Current listings</div><strong style="color:var(--green)">${liveEventCount||'—'}</strong><small>${state.events.source}</small></div><div class="card data-card"><div class="kicker">Civic permits</div><strong style="color:var(--orange)">${state.cityPermits.loading?'—':state.cityPermits.items.length}</strong><small>local outdoor events</small></div><div class="card data-card"><div class="kicker">Busiest area</div><strong class="text-stat" style="color:var(--purple)">${esc(busy?.n?.name||'—')}</strong><small>${busy?.events||0} events · ${busy?.available||0} bikes</small></div><div class="card data-card"><div class="kicker">Free share</div><strong style="color:var(--blue)">${freeShare}%</strong><small>of current CityLab listings</small></div><div class="card data-card"><div class="kicker">311 today</div><strong>${state.city311.today==null?'—':state.city311.today.toLocaleString()}</strong><small>${state.city311.error?'source unavailable':'Analyze Boston'}</small></div><div class="card data-card"><div class="kicker">Bike stations</div><strong>${state.bikes.stations.length||'—'}</strong><small>${(state.bikes.total||0).toLocaleString()} bikes available</small></div></div></div>
  <div class="section"><div class="section-head"><div class="section-title">Event integration</div></div><div class="card settings-card"><label for="tmKey">Ticketmaster Discovery API key <span class="muted-inline">optional</span></label><div class="key-row"><input id="tmKey" type="password" value="${esc(state.ticketmasterKey)}" placeholder="Paste API key"><button class="primary-btn" data-save-key>${state.ticketmasterKey?'Update':'Connect'}</button></div><p>CityLab now combines Boston.gov, ArtsBoston, Boston Public Library, Boston Planning, and City permit listings without a key. Ticketmaster adds another ticketed-event layer on top.</p>${state.ticketmasterKey?'<button class="danger-link" data-clear-key>Remove key</button>':''}</div></div>
  <div class="section"><div class="section-head"><div class="section-title">Sources</div></div><div class="card">${sourceState({icon:'T',name:'MBTA V3',desc:'Service alerts + arrival predictions'},!state.mbta.error,state.mbta.arrivalsMode)}${sourceState({icon:'♧',name:'Bluebikes GBFS',desc:'Live station and bike availability'},!state.bikes.error)}${sourceState({icon:'◎',name:'Boston.gov events',desc:'Official City of Boston event RSS'},!state.bostonGov.loading&&!state.bostonGov.error,state.bostonGov.lastUpdated?`updated ${state.bostonGov.lastUpdated}`:'')}${sourceState({icon:'◈',name:'ArtsBoston',desc:'Arts, culture, performance + exhibitions'},state.calendars.sources?.arts?.ok,`${state.calendars.sources?.arts?.count||0} listings`)}${sourceState({icon:'▤',name:'Boston Public Library',desc:'Programs, talks, classes + exhibitions'},state.calendars.sources?.bpl?.ok,`${state.calendars.sources?.bpl?.count||0} listings`)}${sourceState({icon:'⌂',name:'Boston Planning',desc:'Public meetings, workshops + planning events'},state.calendars.sources?.planning?.ok,`${state.calendars.sources?.planning?.count||0} listings`)}${sourceState({icon:'✦',name:'Ticketmaster',desc:'Optional ticketed-event layer'},state.events.ticketmaster?.length>0,state.events.lastUpdated?`updated ${state.events.lastUpdated}`:'')}${sourceState({icon:'⌂',name:'Boston event permits',desc:'Special Event License Applications'},!state.cityPermits.loading&&!state.cityPermits.error,state.cityPermits.lastUpdated?`updated ${state.cityPermits.lastUpdated}`:'')}${sourceState({icon:'☏',name:'Analyze Boston',desc:'BOS:311 open-data probe'},state.city311.today!=null)}</div></div>
  <div class="section"><div class="section-head"><div class="section-title">V6 changes</div></div><div class="card about-card"><p><b>More calendars:</b> ArtsBoston, Boston Public Library, and Boston Planning now feed the same discovery layer as Boston.gov, Ticketmaster, and City permits.</p><p><b>Source control:</b> Discover can filter to a single calendar when you want library programs, arts listings, civic meetings, or ticketed events specifically.</p><p><b>Ranking guardrails:</b> rich arts and official event listings rank highly, while planning/permit records remain searchable without crowding out things to actually do.</p><p><b>Deduping:</b> cross-calendar matches still collapse into one event with every matched source shown in its detail sheet.</p><p><b>Map preserved:</b> the V5 real geographic Live City map and viewport-preserving layers remain unchanged.</p></div></div>`; }

function renderPlannerSheet(){ if(!state.plannerOpen)return ''; if(!state.plan.length)generatePlan(); const total=state.plan.reduce((a,e)=>a+(priceNumber(e.price)||0),0); return `<div class="sheet-backdrop" data-close-planner></div><section class="event-sheet planner-sheet" role="dialog" aria-modal="true"><div class="sheet-handle"></div><button class="sheet-close" data-close-planner>×</button><div class="planner-head"><span class="eyebrow">DO SOMETHING</span><h2>Build me a Boston plan.</h2><p>Uses CityLab's current event layer — not made-up recommendations.</p></div><div class="planner-controls"><label>When<select data-plan-when>${WHEN_FILTERS.map(v=>`<option ${v===state.planner.when?'selected':''}>${v}</option>`).join('')}</select></label><label>Budget<select data-plan-budget>${BUDGET_OPTIONS.map(v=>`<option ${v===state.planner.budget?'selected':''}>${v}</option>`).join('')}</select></label><label>Vibe<select data-plan-vibe>${VIBE_OPTIONS.map(v=>`<option ${v===state.planner.vibe?'selected':''}>${v}</option>`).join('')}</select></label></div><button class="planner-generate" data-generate-plan>✦ Regenerate plan</button><div class="plan-list">${state.plan.map((e,i)=>`<button class="plan-stop" data-open-event="${esc(e.id)}"><span class="plan-time">${i+1}</span><div>${eventThumb(e)}<span><b>${esc(e.title)}</b><small>${esc(e.time||formatEventTime(e.start))} · ${esc(inferNeighborhood(e))}</small><em>${esc(e.price||'Details')} · ${esc(e.source)}</em></span></div></button>`).join('')}</div><div class="plan-total"><div><span>Estimated listed cost</span><b>${total?`$${Math.round(total)}`:'Free / unknown'}</b></div><div><span>Stops</span><b>${state.plan.length}</b></div></div><button class="primary-btn planner-save" data-save-plan>Save this plan</button></section>`; }

function renderEventSheet(){ const e=state.activeEvent; if(!e)return ''; const dist=eventDistanceLabel(e); const merged=(e.sources||[]).length>1?`<div class="merge-note">Matched across ${e.sources.map(esc).join(' + ')}</div>`:''; return `<div class="sheet-backdrop" data-close-sheet></div><section class="event-sheet" role="dialog" aria-modal="true"><div class="sheet-handle"></div><button class="sheet-close" data-close-sheet>×</button><div class="sheet-hero" style="background:${e.image?`linear-gradient(180deg,transparent,rgba(5,9,13,.85)),url('${esc(e.image)}') center/cover`:thumbGradient(e.tone)}"><div><span class="pill ${e.tone||'blue'}">${esc(e.category||'Event')}</span><h2>${esc(e.title)}</h2></div></div><div class="sheet-body"><div class="detail-line"><span>◷</span><div><b>${esc(eventDateLabel(e))}</b><small>${esc(e.time||formatEventTime(e.start))}</small></div></div><div class="detail-line"><span>⌖</span><div><b>${esc(e.venue||'Boston')}</b><small>${esc(e.neighborhood||'Boston')}${dist?' · '+esc(dist):''}</small></div></div><div class="detail-line"><span>＄</span><div><b>${esc(e.price||'See listing')}</b><small>${esc((e.sources||[e.source||'CityLab']).join(' + '))}</small></div></div>${merged}${e.info?`<p class="event-description">${esc(e.info)}</p>`:''}<div class="quick-actions"><button data-calendar="${esc(e.id)}">＋ Calendar</button><button data-share-event="${esc(e.id)}">↗ Share</button><button data-directions="${esc(e.id)}">⌖ Directions</button><button data-view-map="${esc(e.id)}">◎ Live Map</button></div><div class="sheet-actions"><button class="secondary-btn ${state.saved.has(e.id)?'saved':''}" data-save="${esc(e.id)}">${state.saved.has(e.id)?'♥ Saved':'♡ Save'}</button>${e.url?`<a class="primary-btn link-btn" href="${esc(e.url)}" target="_blank" rel="noopener">Open listing ↗</a>`:''}</div>${e.preview?'<div class="preview-note">This is a preview card, not a live event listing. Connect an event source in More for current listings.</div>':''}</div></section>`; }

function icsEscape(v=''){ return String(v).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n'); }
function icsDate(d){return new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');}
function addToCalendar(id){const e=findEvent(id);if(!e?.start){showToast('This listing has no exact date yet');return;}const st=new Date(e.start),en=new Date(st.getTime()+2*3600000);const text=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CityLab//Boston//EN','BEGIN:VEVENT',`UID:${icsEscape(e.id)}@citylab`,`DTSTAMP:${icsDate(new Date())}`,`DTSTART:${icsDate(st)}`,`DTEND:${icsDate(en)}`,`SUMMARY:${icsEscape(e.title)}`,`LOCATION:${icsEscape([e.venue,e.address,e.neighborhood].filter(Boolean).join(', '))}`,`DESCRIPTION:${icsEscape(e.info||e.url||'Saved from CityLab')}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/calendar'}));a.download=`${normalizeTitle(e.title).replace(/ /g,'-')||'citylab-event'}.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);showToast('Calendar file created');}
async function shareEvent(id){const e=findEvent(id);if(!e)return;const text=`${e.title} — ${e.time||formatEventTime(e.start)} · ${e.venue||'Boston'}`;try{if(navigator.share)await navigator.share({title:e.title,text,url:e.url||location.href});else{await navigator.clipboard.writeText(`${text}${e.url?' '+e.url:''}`);showToast('Event copied');}}catch(_){}}
function directionsEvent(id){const e=findEvent(id);if(!e)return;const q=[e.venue,e.address,e.neighborhood,'Boston MA'].filter(Boolean).join(', ');window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,'_blank','noopener');}
function render(){ state.cityTime=new Date(); destroyLiveMap(); const screen=$('#screen'); screen.innerHTML=state.tab==='now'?renderNow():state.tab==='discover'?renderDiscover():state.tab==='live'?renderLive():state.tab==='saved'?renderSaved():renderMore(); $('#eventSheetHost').innerHTML=state.plannerOpen?renderPlannerSheet():renderEventSheet(); $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab)); bindScreen(); if(state.tab==='live')requestAnimationFrame(initLiveMap); }
function bindScreen(){
  $$('[data-tab-jump]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tabJump;render();scrollTo(0,0)});
  $$('[data-category]').forEach(b=>b.onclick=()=>{state.category=b.dataset.category;render();});
  $$('[data-save]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();saveEvent(b.dataset.save)});
  $$('[data-open-event]').forEach(b=>b.onclick=ev=>{ if(ev.target.closest('[data-save]'))return; state.plannerOpen=false; state.activeEvent=findEvent(b.dataset.openEvent); render(); });
  $$('[data-close-sheet]').forEach(b=>b.onclick=()=>{state.activeEvent=null;render();});
  $$('[data-open-planner]').forEach(b=>b.onclick=()=>{state.plannerOpen=true;state.activeEvent=null;generatePlan();render();});
  $$('[data-close-planner]').forEach(b=>b.onclick=()=>{state.plannerOpen=false;render();});
  $$('[data-refresh]').forEach(b=>b.onclick=()=>refreshLive(true));
  $$('[data-layer]').forEach(b=>b.onclick=()=>{const k=b.dataset.layer;state.layers[k]=!state.layers[k];updateMapLayerVisibility();});
  const mapSaved=$('[data-map-saved]'); if(mapSaved)mapSaved.onclick=()=>{state.mapSavedOnly=!state.mapSavedOnly;addMapEventMarkers();updateMapLayerVisibility();showToast(state.mapSavedOnly?'Showing saved events':'Showing all events');};
  const scrub=$('#timeScrubber'); if(scrub)scrub.oninput=()=>{state.replayHour=Number(scrub.value);updateMapReplayUI();};
  const liveNow=$('[data-live-now]'); if(liveNow)liveNow.onclick=()=>{state.replayHour=new Date().getHours();if(scrub)scrub.value=state.replayHour;updateMapReplayUI();};
  $$('[data-location]').forEach(loc=>loc.onclick=()=>state.tab==='live'?locateUserOnMap():locateUser(true));
  const home=$('[data-map-home]'); if(home)home.onclick=()=>liveMap?.flyTo(BOSTON_CENTER,13,{duration:.55});
  const nearby=$('[data-nearby-transit]'); if(nearby)nearby.onclick=()=>locateUser(false,true);
  $$('[data-refresh-arrivals]').forEach(b=>b.onclick=async()=>{await loadHubArrivals();render();showToast('Arrivals refreshed');});
  const search=$('#eventSearch'); if(search) search.oninput=()=>{state.query=search.value; clearTimeout(search._t); search._t=setTimeout(()=>render(),180);};
  const when=$('[data-when]'); if(when)when.onchange=()=>{state.when=when.value;render();};
  const price=$('[data-price]'); if(price)price.onchange=()=>{state.price=price.value;render();};
  const sort=$('[data-sort]'); if(sort)sort.onchange=()=>{state.sort=sort.value;if(sort.value==='Nearby'&&!state.userLoc)locateUser(false,false,true);else render();};
  const sourceFilter=$('[data-source-filter]'); if(sourceFilter)sourceFilter.onchange=()=>{state.sourceFilter=sourceFilter.value;render();};
  $$('[data-search-preset]').forEach(b=>b.onclick=()=>{if(b.dataset.searchPreset==='FREE'){state.category='Free';state.query='';}else state.query=b.dataset.searchPreset;render();});
  $$('[data-discover-location]').forEach(b=>b.onclick=()=>locateUser(false,false,true));
  $$('[data-calendar]').forEach(b=>b.onclick=()=>addToCalendar(b.dataset.calendar));
  $$('[data-share-event]').forEach(b=>b.onclick=()=>shareEvent(b.dataset.shareEvent));
  $$('[data-directions]').forEach(b=>b.onclick=()=>directionsEvent(b.dataset.directions));
  $$('[data-view-map]').forEach(b=>b.onclick=()=>{state.mapFocusEventId=b.dataset.viewMap;state.activeEvent=null;state.plannerOpen=false;state.tab='live';render();scrollTo(0,0);});
  $$('[data-neighborhood]').forEach(b=>b.onclick=()=>{state.query=b.dataset.neighborhood;state.category='All';render();scrollTo(0,0);});
  const source=$('[data-event-source]'); if(source)source.onclick=()=>{state.tab='more';render();scrollTo(0,0);};
  const saveKey=$('[data-save-key]'); if(saveKey)saveKey.onclick=async()=>{const key=($('#tmKey')?.value||'').trim(); if(!key){showToast('Paste an API key first');return;} state.ticketmasterKey=key;localStorage.setItem('citylab.ticketmasterKey',key);await loadTicketmasterEvents();render();showToast(state.events.ticketmaster?.length?'Ticketmaster layer connected':'Could not connect Ticketmaster');};
  const clear=$('[data-clear-key]'); if(clear)clear.onclick=()=>{localStorage.removeItem('citylab.ticketmasterKey');state.ticketmasterKey='';state.events.ticketmaster=[];rebuildEventLayer();render();showToast('Ticketmaster removed · civic events remain');};
  const optimize=$('[data-optimize]'); if(optimize)optimize.onclick=()=>{optimizeSaved();render();};
  const pw=$('[data-plan-when]'); if(pw)pw.onchange=()=>{state.planner.when=pw.value;generatePlan();render();};
  const pb=$('[data-plan-budget]'); if(pb)pb.onchange=()=>{state.planner.budget=pb.value;generatePlan();render();};
  const pv=$('[data-plan-vibe]'); if(pv)pv.onchange=()=>{state.planner.vibe=pv.value;generatePlan();render();};
  const regen=$('[data-generate-plan]'); if(regen)regen.onclick=()=>{generatePlan();render();showToast('New plan built');};
  const savePlan=$('[data-save-plan]'); if(savePlan)savePlan.onclick=()=>{state.plan.forEach(e=>state.saved.set(e.id,e));savePersist();localStorage.setItem('citylab.savedOrder',JSON.stringify(state.plan.map(e=>e.id)));state.plannerOpen=false;state.tab='saved';render();showToast('Plan saved');};
}

async function fetchJson(url,timeout=8500){ const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),timeout);try{const r=await fetch(url,{signal:ctl.signal,headers:{'Accept':'application/json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}finally{clearTimeout(t);} }
async function loadMbta(){ state.mbta.loading=true; try{const json=await fetchJson('https://api-v3.mbta.com/alerts?filter[route]=Green-B,Green-C,Green-D,Green-E,Orange,Red,Blue');state.mbta.alerts=json.data||[];state.mbta.error=null;}catch(e){state.mbta.alerts=[];state.mbta.error=e.message;}finally{state.mbta.loading=false;} }
function routeMeta(routeId=''){ if(routeId.startsWith('Green'))return {name:'Green Line',badge:'T',cls:'route-green'}; if(routeId==='Orange')return {name:'Orange Line',badge:'T',cls:'route-orange'}; if(routeId==='Red')return {name:'Red Line',badge:'T',cls:'route-red'}; if(routeId==='Blue')return {name:'Blue Line',badge:'T',cls:'route-blue'}; if(routeId.startsWith('SL'))return {name:'Silver Line',badge:'SL',cls:'route-silver'}; return {name:routeId||'Transit',badge:'T',cls:'route-green'}; }
function relativeArrival(iso){ if(!iso)return '—'; const mins=Math.round((new Date(iso)-new Date())/60000); if(mins<=0&&mins>-3)return 'Now'; if(mins<0)return 'Passed'; return `${mins} min`; }
async function loadPredictionsForStops(stopIds,mode){ if(!stopIds.length)return; try{const url=`https://api-v3.mbta.com/predictions?filter[stop]=${encodeURIComponent(stopIds.join(','))}&include=route,stop&sort=departure_time&page[limit]=30`; const json=await fetchJson(url); const included=json.included||[]; const stopNames=new Map(included.filter(x=>x.type==='stop').map(x=>[x.id,x.attributes?.name||x.id])); const routeNames=new Map(included.filter(x=>x.type==='route').map(x=>[x.id,x.attributes?.long_name||x.attributes?.short_name||x.id])); state.mbta.arrivals=(json.data||[]).map(p=>{const a=p.attributes||{}; const rid=p.relationships?.route?.data?.id||''; const meta=routeMeta(rid); const when=a.departure_time||a.arrival_time; return {routeId:rid,routeName:routeNames.get(rid)||meta.name,badge:meta.badge,routeClass:meta.cls,stopName:stopNames.get(p.relationships?.stop?.data?.id)||'Station',direction:a.direction_id===0?'Outbound':a.direction_id===1?'Inbound':'',when:relativeArrival(when),iso:when};}).filter(x=>x.when!=='Passed').slice(0,12); state.mbta.arrivalsError=null;state.mbta.arrivalsMode=mode;}catch(e){state.mbta.arrivalsError=e.message;} }
async function loadHubArrivals(){ await loadPredictionsForStops(['place-dwnxg','place-pktrm','place-sstat','place-kencl'],'Downtown · Park St · South Station · Kenmore'); }
async function loadNearbyArrivals(lat,lon){ try{const json=await fetchJson(`https://api-v3.mbta.com/stops?filter[latitude]=${encodeURIComponent(lat)}&filter[longitude]=${encodeURIComponent(lon)}&filter[radius]=0.012&page[limit]=12`); const ids=(json.data||[]).map(s=>s.id).filter(Boolean).slice(0,8); if(!ids.length)throw new Error('No nearby stops'); await loadPredictionsForStops(ids,'Stops near you');}catch(e){state.mbta.arrivalsError=e.message;state.mbta.arrivalsMode='Nearby lookup unavailable';} }
async function loadBikes(){ state.bikes.loading=true; try{let status,info; [status,info]=await Promise.all([fetchJson('https://gbfs.lyft.com/gbfs/1.1/bos/en/station_status.json'),fetchJson('https://gbfs.lyft.com/gbfs/1.1/bos/en/station_information.json')]);
  const statuses=status.data?.stations||[];const infos=info.data?.stations||[];const byId=new Map(statuses.map(s=>[s.station_id,s]));state.bikes.total=statuses.reduce((a,s)=>a+Number(s.num_bikes_available||0),0);state.bikes.stations=infos.map(i=>({...i,...byId.get(i.station_id)})).filter(s=>s.lat&&s.lon&&Number(s.num_bikes_available||0)>0).sort((a,b)=>Number(b.num_bikes_available||0)-Number(a.num_bikes_available||0));state.bikes.error=null;}catch(e){state.bikes.total=1340;state.bikes.stations=[];state.bikes.error=e.message;}finally{state.bikes.loading=false;} }

function stripHtml(html=''){const d=document.createElement('div');d.innerHTML=html;return (d.textContent||'').replace(/\s+/g,' ').trim();}
function rssText(item,name){const node=[...item.children].find(x=>x.localName===name||x.tagName.toLowerCase()===name.toLowerCase());return node?.textContent?.trim()||'';}
function parseBostonGovDate(item,desc,title){ const candidates=['event-start','start-date','date','dc:date'].map(n=>rssText(item,n)).filter(Boolean); const iso=(desc.match(/20\d\d[-/]\d\d[-/]\d\d(?:T\d\d:\d\d(?::\d\d)?)?/)||[])[0]; if(iso)candidates.unshift(iso); for(const c of candidates){const d=new Date(c);if(!Number.isNaN(d.getTime()))return d;} const dateWords=(desc.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2}/i)||[])[0]; if(dateWords){const d=new Date(dateWords);if(!Number.isNaN(d.getTime()))return d;} return null; }
function bostonGovItemToEvent(item,i){const title=rssText(item,'title')||'Boston event',link=rssText(item,'link')||rssText(item,'guid'),raw=rssText(item,'description')||rssText(item,'encoded'),desc=stripHtml(raw); if(/abutters meeting|public hearing|commission meeting|board meeting/i.test(title))return null; const start=parseBostonGovDate(item,desc,title); const loc=(desc.match(/(?:Location|Where):\s*([^|•]{3,90})/i)||[])[1]||''; const address=(desc.match(/\d{1,5}\s+[A-Za-z0-9 .'-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Way|Parkway|Pkwy|Square|Sq)/i)||[])[0]||''; const venue=(loc||address||'City of Boston').trim(); const hood=neighborhoodFromText(`${title} ${venue} ${desc}`)||'Boston'; const category=normalizeCategory(title,desc,''); const finalCategory=category==='Events'?'Local':category; const [tone,icon]=categoryTone(finalCategory);const p=hashPos(`${title}${venue}`); const free=/\bfree\b/i.test(desc)||/price:\s*free/i.test(raw);return {id:`bos-${i}-${normalizeTitle(title).slice(0,40).replace(/ /g,'-')}`,title,venue,neighborhood:hood,start:start?start.toISOString():null,time:start?formatEventTime(start.toISOString()):'See official listing',price:free?'FREE':'Details',category:finalCategory,icon,tone,x:p.x,y:p.y,source:'Boston.gov',preview:false,image:'',url:link||'https://www.boston.gov/events',info:desc.slice(0,600)};}
async function loadBostonGovEvents(){state.bostonGov.loading=true;try{let text;try{text=await fetchText('https://www.boston.gov/rss/events',12000);}catch(_){text=await fetchText('./api/boston-events',12000);}const xml=new DOMParser().parseFromString(text,'application/xml');if(xml.querySelector('parsererror'))throw new Error('RSS parse error');let items=[...xml.querySelectorAll('item')].map(bostonGovItemToEvent).filter(Boolean);const now=new Date();now.setHours(0,0,0,0);const end=new Date(now);end.setDate(end.getDate()+30);items=items.filter(e=>!e.start||(new Date(e.start)>=now&&new Date(e.start)<=end)).slice(0,160);state.bostonGov.items=items;state.bostonGov.error=null;state.bostonGov.lastUpdated=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date());rebuildEventLayer();}catch(e){state.bostonGov.items=[];state.bostonGov.error=e.message;rebuildEventLayer();}finally{state.bostonGov.loading=false;}}

function calendarEventToCityLab(e,i){
  const text=`${e.title||''} ${e.info||''} ${e.venue||''}`;
  let category=normalizeCategory(text,text,text);
  if(category==='Events'&&e.source==='ArtsBoston')category='Art';
  if(category==='Events'&&e.source==='Boston Public Library')category='Classes & Talks';
  if(category==='Events'&&e.source==='Boston Planning')category='Local';
  const [tone,icon]=categoryTone(category);
  const lat=Number(e.lat),lon=Number(e.lon); const hasGeo=Number.isFinite(lat)&&Number.isFinite(lon);
  const p=hasGeo?posFromLatLon(lat,lon):{};
  let hood=neighborhoodFromText(`${e.venue||''} ${e.address||''} ${e.info||''}`);
  if(hasGeo&&!hood)hood=nearestNeighborhoodByXY(p.x,p.y).name;
  if(!hood)hood='Boston';
  let price=e.price||'Details';
  if(e.source==='Boston Public Library'&&(!price||price==='Details'))price='FREE';
  if(e.source==='Boston Planning'&&(!price||price==='Details'))price='FREE';
  return {id:`cal-${i}-${String(e.id||e.title||'event').replace(/[^a-z0-9_-]+/gi,'-').slice(0,70)}`,title:e.title||'Boston event',venue:e.venue||e.source||'Boston',address:e.address||'',neighborhood:hood,start:e.start||null,time:e.start?formatEventTime(e.start):'See listing',price,category,icon,tone,lat:hasGeo?lat:null,lon:hasGeo?lon:null,x:hasGeo?p.x:null,y:hasGeo?p.y:null,source:e.source||'Community calendar',preview:false,image:e.image||'',url:e.url||'',info:e.info||''};
}
async function loadCommunityCalendars(){
  state.calendars.loading=true; state.calendars.error=null;
  try{
    const json=await fetchJson('./api/calendar-events',18000);
    state.calendars.sources=json.sources||{};
    state.calendars.items=(json.events||[]).map(calendarEventToCityLab).filter(Boolean);
    state.calendars.lastUpdated=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date());
    const failed=Object.values(state.calendars.sources).filter(s=>!s.ok).map(s=>s.name);
    state.calendars.error=failed.length?`${failed.join(', ')} unavailable`:null;
    rebuildEventLayer();
  }catch(e){state.calendars.items=[];state.calendars.sources={};state.calendars.error=`Extra calendars unavailable: ${e.message}`;rebuildEventLayer();}
  finally{state.calendars.loading=false;}
}

function tmEventToCityLab(e){ const venue=e._embedded?.venues?.[0]||{}; const c=e.classifications?.[0]||{}; const category=normalizeCategory(c.segment?.name,c.genre?.name,c.subGenre?.name); const [tone,icon]=categoryTone(category); const priceRange=e.priceRanges?.[0]; const min=priceRange?.min; const price=min==null?'See price':min===0?'FREE':`$${Math.round(min)}+`; const lat=Number(venue.location?.latitude),lon=Number(venue.location?.longitude); const p=Number.isFinite(lat)&&Number.isFinite(lon)?posFromLatLon(lat,lon):{}; const images=(e.images||[]).slice().sort((a,b)=>(b.width||0)-(a.width||0)); const image=images.find(i=>i.ratio==='16_9')?.url||images[0]?.url||''; return {id:`tm-${e.id}`,title:e.name||'Boston event',venue:venue.name||'Boston',neighborhood:neighborhoodFromText(`${venue.name||''} ${venue.address?.line1||''}`)||((Number.isFinite(lat)&&Number.isFinite(lon))?nearestNeighborhoodByXY(p.x,p.y).name:'Boston'),start:e.dates?.start?.dateTime||e.dates?.start?.localDate||null,time:e.dates?.start?.dateTime?formatEventTime(e.dates.start.dateTime):(e.dates?.start?.localTime||'Time TBA'),price,category,icon,tone,lat:Number.isFinite(lat)?lat:null,lon:Number.isFinite(lon)?lon:null,x:p.x,y:p.y,source:'Ticketmaster',preview:false,image,url:e.url||'',info:e.info||e.pleaseNote||''}; }
async function loadTicketmasterEvents(){ if(!state.ticketmasterKey){state.events.ticketmaster=[];rebuildEventLayer();return;} state.events.loading=true;state.events.error=null; try{const now=new Date();const end=new Date(now);end.setDate(end.getDate()+14);const params=new URLSearchParams({apikey:state.ticketmasterKey,city:'Boston',stateCode:'MA',countryCode:'US',startDateTime:now.toISOString().replace('.000',''),endDateTime:end.toISOString().replace('.000',''),size:'100',sort:'date,asc',locale:'*'}); const json=await fetchJson(`https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,12000); const items=(json._embedded?.events||[]).map(tmEventToCityLab); state.events.ticketmaster=items;state.events.error=null;state.events.lastUpdated=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date());rebuildEventLayer();}catch(e){state.events.error=`Ticketmaster sync failed: ${e.message}`;state.events.ticketmaster=[];rebuildEventLayer();}finally{state.events.loading=false;} }

function parseCsv(text){ const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'){if(q&&n==='"'){cell+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(v=>v!==''))rows.push(row);row=[];}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}if(rows.length<2)return[];const heads=rows[0].map(h=>h.trim());return rows.slice(1).map(r=>Object.fromEntries(heads.map((h,i)=>[h,r[i]||'']))); }
async function fetchText(url,timeout=10000){const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),timeout);try{const r=await fetch(url,{signal:ctl.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.text();}finally{clearTimeout(t);}}
function findField(rec,patterns){const keys=Object.keys(rec||{});for(const p of patterns){const k=keys.find(x=>p.test(x));if(k)return k;}return null;}
function permitRecordToEvent(rec,i){const nameKey=findField(rec,[/event.*name/i,/name.*event/i,/event.?title/i,/event/i,/description/i]);const dateKey=findField(rec,[/event.*date/i,/date.*event/i,/start.*date/i,/event.?start/i,/date/i]);const locKey=findField(rec,[/event.*location/i,/location/i,/address/i,/street/i,/site/i]);const statusKey=findField(rec,[/status/i,/decision/i,/approval/i]);const title=(nameKey&&rec[nameKey])||'Boston special event';const rawDate=dateKey&&rec[dateKey];const start=rawDate?new Date(rawDate):null;if(start&&Number.isNaN(start.getTime()))return null;const status=statusKey?String(rec[statusKey]||''):'';if(/denied|cancel/i.test(status))return null;const address=(locKey&&rec[locKey])||'Boston';const hood=neighborhoodFromText(`${title} ${address}`)||'Boston';const cat=normalizeCategory(title,title,title);const category=cat==='Events'?'Local':cat;const [tone,icon]=categoryTone(category);const hoodMeta=NEIGHBORHOODS.find(n=>n.name===hood);const jitter=hashPos(`${title}${address}`);const pos=hoodMeta?{x:hoodMeta.x+(jitter.x%5)-2,y:hoodMeta.y+(jitter.y%5)-2}:jitter;return {id:`permit-${i}-${String(title).slice(0,24).replace(/\W+/g,'-')}`,title:String(title).trim(),venue:String(address).trim()||'Boston',address:String(address).trim(),neighborhood:hood,start:start?start.toISOString():null,time:start?formatEventTime(start.toISOString()):'Date listed by City',price:'Details',category,icon,tone,x:pos.x,y:pos.y,source:'Boston permit',preview:false,url:'https://data.boston.gov/dataset/special-event-license-applications',info:'Public record from the City of Boston Special Event License Applications dataset. Permit data may describe an event application rather than a complete public event listing.'};}
async function loadCityPermits(){state.cityPermits.loading=true;try{const pkg=await fetchJson('https://data.boston.gov/api/3/action/package_show?id=special-event-license-applications',10000);const resources=pkg.result?.resources||[];const r=resources.find(x=>x.datastore_active)||resources.find(x=>/csv/i.test(x.format||''))||resources[0];if(!r)throw new Error('No event permit resource');state.cityPermits.resource=r.id;let records=[];if(r.datastore_active){const d=await fetchJson(`https://data.boston.gov/api/3/action/datastore_search?resource_id=${encodeURIComponent(r.id)}&limit=1000`,12000);records=d.result?.records||[];}else{records=parseCsv(await fetchText(r.url,12000));}const now=new Date();now.setHours(0,0,0,0);const end=new Date(now);end.setDate(end.getDate()+30);state.cityPermits.items=records.map(permitRecordToEvent).filter(Boolean).filter(e=>!e.start||(new Date(e.start)>=now&&new Date(e.start)<=end)).slice(0,120);state.cityPermits.error=null;state.cityPermits.lastUpdated=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date());rebuildEventLayer();}catch(e){state.cityPermits.items=[];state.cityPermits.error=e.message;rebuildEventLayer();}finally{state.cityPermits.loading=false;}}

function pick311Resource(pkg){ const resources=pkg.result?.resources||[]; return resources.find(r=>r.datastore_active&&/new system/i.test(r.name||''))||resources.find(r=>r.datastore_active&&/2026/i.test(r.name||''))||resources.find(r=>r.datastore_active)||null; }
async function load311(){ state.city311.loading=true; try{const pkg=await fetchJson('https://data.boston.gov/api/3/action/package_show?id=311-service-requests',10000);const r=pick311Resource(pkg);if(!r)throw new Error('No live datastore resource');state.city311.resource=r.id;const sample=await fetchJson(`https://data.boston.gov/api/3/action/datastore_search?resource_id=${encodeURIComponent(r.id)}&limit=1`,10000);const rec=sample.result?.records?.[0]||{};const key=['open_dt','created_date','created_dt','createddate','open_date'].find(k=>Object.prototype.hasOwnProperty.call(rec,k));if(!key)throw new Error('Date field changed');const today=new Date();today.setHours(0,0,0,0);const yyyy=today.toISOString().slice(0,10);const sql=`SELECT COUNT(*) AS count FROM "${r.id}" WHERE "${key}" >= '${yyyy}'`;const result=await fetchJson(`https://data.boston.gov/api/3/action/datastore_search_sql?sql=${encodeURIComponent(sql)}`,10000);const val=result.result?.records?.[0]?.count;state.city311.today=val==null?null:Number(val);state.city311.error=null;}catch(e){state.city311.today=null;state.city311.error=e.message;}finally{state.city311.loading=false;} }

async function refreshLive(toast=false){ await Promise.all([loadMbta(),loadBikes(),loadHubArrivals(),load311(),loadBostonGovEvents(),loadCommunityCalendars(),loadCityPermits(),state.ticketmasterKey?loadTicketmasterEvents():Promise.resolve()]);rebuildEventLayer();render();if(toast)showToast(state.mbta.error&&state.bikes.error?'Some live feeds unavailable':'City data refreshed'); }
function locateUser(addMarker=false,forTransit=false,forDiscover=false){ if(!navigator.geolocation){showToast('Location not available');return;}navigator.geolocation.getCurrentPosition(async pos=>{const {latitude,longitude}=pos.coords;state.userLoc={lat:latitude,lon:longitude};if(forTransit){showToast('Finding nearby transit…');await loadNearbyArrivals(latitude,longitude);render();return;} if(forDiscover){state.sort='Nearby';render();showToast('Discover sorted by distance');return;} if(addMarker){const p=posFromLatLon(latitude,longitude);const shell=$('.map-shell');if(shell){const m=document.createElement('div');m.className='map-marker user-marker';m.style.cssText=`left:${p.x}%;top:${p.y}%`;m.textContent='●';shell.appendChild(m);showToast('Location added to map');}}},()=>showToast('Location permission denied'),{enableHighAccuracy:false,timeout:6000,maximumAge:60000}); }

$$('.nav-item').forEach(btn=>btn.onclick=()=>{state.tab=btn.dataset.tab;state.activeEvent=null;render();scrollTo(0,0)});
render();
refreshLive(false);
setInterval(()=>{if(state.tab==='now'&&!state.activeEvent)render();},60000);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'events.json');
const HORIZON_DAYS = 45;

const SOURCES = {
  bostonGov: { name:'Boston.gov', url:'https://www.boston.gov/rss/events', home:'https://www.boston.gov/events' },
  bpl: { name:'Boston Public Library', url:'https://bpl.bibliocommons.com/v2/events', home:'https://bpl.bibliocommons.com/events/' },
  arts: { name:'ArtsBoston', url:'https://bostix.org/event/', home:'https://bostix.org/event/' },
  planning: { name:'Boston Planning', url:'https://www.bostonplans.org/news-calendar/calendar?rss=relationship', home:'https://www.bostonplans.org/news-calendar/calendar' },
  permits: { name:'City permits', home:'https://data.boston.gov/dataset/special-event-license-applications' },
  ticketmaster: { name:'Ticketmaster', home:'https://www.ticketmaster.com/' },
};

const MONTHS='January February March April May June July August September October November December'.split(' ');

function decodeHtml(s='') {
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g,'')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16)));
}
function stripHtml(s='') {
  return decodeHtml(String(s)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim());
}
function absUrl(url,base){try{return new URL(url,base).toString();}catch{return base;}}
function firstArray(v){return Array.isArray(v)?v[0]:v;}
function imgUrl(v){const x=firstArray(v);return typeof x==='string'?x:(x?.url||x?.contentUrl||'');}
function addressText(loc){const a=loc?.address;if(!a)return'';if(typeof a==='string')return a;return[a.streetAddress,a.addressLocality,a.addressRegion,a.postalCode].filter(Boolean).join(', ');}
function offerPrice(offers){const o=firstArray(offers);if(!o)return'';const p=o.price??o.lowPrice;if(p==null||p==='')return'';const n=Number(p);return Number.isFinite(n)?(n===0?'FREE':`$${Math.round(n)}+`):String(p);}
function flattenJsonLd(node,out=[]){if(!node)return out;if(Array.isArray(node)){node.forEach(x=>flattenJsonLd(x,out));return out;}if(typeof node!=='object')return out;const type=node['@type'];const types=Array.isArray(type)?type:[type];if(types.some(t=>String(t||'').toLowerCase()==='event'))out.push(node);if(node['@graph'])flattenJsonLd(node['@graph'],out);return out;}
function jsonLdEvents(html){const out=[];const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;let m;while((m=re.exec(html))){try{flattenJsonLd(JSON.parse(decodeHtml(m[1].trim())),out);}catch{}}return out;}
function normalizeSchemaEvent(e,source,baseUrl,i){const loc=firstArray(e.location)||{};const geo=loc.geo||{};const lat=Number(geo.latitude),lon=Number(geo.longitude);return{id:`${source.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-schema-${i}-${String(e.name||'event').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,42)}`,title:stripHtml(e.name||'Event'),venue:stripHtml(loc.name||addressText(loc)||source),address:stripHtml(addressText(loc)),start:e.startDate||null,end:e.endDate||null,price:offerPrice(e.offers)||'Details',info:stripHtml(e.description||'').slice(0,1000),image:imgUrl(e.image),url:absUrl(e.url||baseUrl,baseUrl),lat:Number.isFinite(lat)?lat:null,lon:Number.isFinite(lon)?lon:null,source};}

async function fetchText(url,timeout=15000){const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),timeout);try{const r=await fetch(url,{signal:ctl.signal,headers:{'User-Agent':'CityLab/6.1 GitHub Actions event indexer','Accept':'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.text();}finally{clearTimeout(timer);}}
async function fetchJson(url,timeout=15000){const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),timeout);try{const r=await fetch(url,{signal:ctl.signal,headers:{'User-Agent':'CityLab/6.1 GitHub Actions event indexer','Accept':'application/json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}finally{clearTimeout(timer);}}
function parseDateLoose(text=''){const cleaned=stripHtml(text).replace(/\bon\b/gi,' ').replace(/\s+/g,' ');const full=MONTHS.join('|');const short='Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';const patterns=[new RegExp(`(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\\s+(${full})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,)?\\s+(20\\d{2})(?:[^\\d]{0,24}(\\d{1,2}:\\d{2})\\s*(am|pm))?`,'i'),new RegExp(`(${full})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,)?\\s+(20\\d{2})(?:[^\\d]{0,24}(\\d{1,2}:\\d{2})\\s*(am|pm))?`,'i'),new RegExp(`(${short})\\s+(\\d{1,2})\\s+(20\\d{2})(?:[^\\d]{0,24}(\\d{1,2}:\\d{2})\\s*(am|pm))?`,'i')];const m=patterns.map(p=>cleaned.match(p)).find(Boolean);if(!m)return null;const d=new Date(`${m[1]} ${m[2]}, ${m[3]}${m[4]?` ${m[4]} ${m[5]||''}`:''}`);return Number.isNaN(d.getTime())?null:d.toISOString();}
function dedupeRaw(items){const seen=new Set();return items.filter(e=>{if(!e?.title)return false;const key=`${e.source}|${e.title.toLowerCase().replace(/[^a-z0-9]+/g,' ')}|${String(e.start||'').slice(0,10)}`;if(seen.has(key))return false;seen.add(key);return true;});}
function withinHorizon(e,days=HORIZON_DAYS){if(!e.start)return true;const d=new Date(e.start);if(Number.isNaN(d.getTime()))return true;const now=new Date();now.setHours(0,0,0,0);const end=new Date(now);end.setDate(end.getDate()+days);return d>=now&&d<=end;}

function parseBplFallback(html){const items=[];const re=/<a[^>]+href=["']([^"']*\/events\/[a-f0-9]{16,})["'][^>]*>([\s\S]*?)<\/a>/gi;let m,i=0;while((m=re.exec(html))&&items.length<220){const title=stripHtml(m[2]);if(title.length<4||title.length>180)continue;const chunk=html.slice(Math.max(0,m.index-800),Math.min(html.length,re.lastIndex+1700));const text=stripHtml(chunk);const start=parseDateLoose(text);const loc=(text.match(/Event location:\s*([^|•]{2,100}?)(?=\s+(?:Note:|Registration|Find more events|Event type|Audience|$))/i)||[])[1]||'';const desc=text.split(title).slice(1).join(title).slice(0,900);items.push({id:`bpl-${i++}-${m[1].split('/').pop()}`,title,venue:loc||'Boston Public Library',address:'',start,price:'FREE',info:desc,url:absUrl(m[1],SOURCES.bpl.home),image:'',lat:null,lon:null,source:'Boston Public Library'});}return dedupeRaw(items);}
function parseArtsFallback(html){const items=[];const re=/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m,i=0;while((m=re.exec(html))&&items.length<180){const title=stripHtml(m[2]);if(title.length<5||title.length>160)continue;const url=absUrl(m[1],SOURCES.arts.home);if(/instagram|facebook|linkedin|contact|donate|about|submit|accessibility|login|register/i.test(url+title))continue;const chunk=html.slice(Math.max(0,m.index-600),Math.min(html.length,re.lastIndex+1100));const text=stripHtml(chunk);const start=parseDateLoose(text);if(!start)continue;const venue=(text.match(/Presented by\s+.{0,100}?\s+([^|•]{3,90}?)(?=\s+(?:Accessibility|Official Website|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|$))/i)||[])[1]||'';items.push({id:`arts-${i++}-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,55)}`,title,venue:venue||'Greater Boston',address:'',start,price:'See price',info:'Arts and culture listing from ArtsBoston / BosTix.',url,image:'',lat:null,lon:null,source:'ArtsBoston'});}return dedupeRaw(items);}
function rssBlocks(xml){return[...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(m=>m[0]);}
function xmlTag(block,name){const m=block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`,'i'));return m?stripHtml(m[1]):'';}
function planningRssItems(xml){return rssBlocks(xml).map((b,i)=>{const title=xmlTag(b,'title');const link=xmlTag(b,'link')||SOURCES.planning.home;const desc=xmlTag(b,'description');const pub=xmlTag(b,'pubDate');const start=parseDateLoose(`${title} ${desc}`)||(!Number.isNaN(new Date(pub).getTime())?new Date(pub).toISOString():null);const loc=(desc.match(/(?:LOCATION|Location):\s*([^|•]{2,110})/i)||[])[1]||'';return{id:`planning-${i}-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,50)}`,title,venue:loc||'Boston Planning',address:loc,start,price:'FREE',info:desc.slice(0,1000),url:link,image:'',lat:null,lon:null,source:'Boston Planning'};}).filter(x=>x.title&&!/^cancelled:/i.test(x.title));}
function bostonGovRssItems(xml){return rssBlocks(xml).map((b,i)=>{const title=xmlTag(b,'title')||'Boston event';const link=xmlTag(b,'link')||xmlTag(b,'guid')||SOURCES.bostonGov.home;const desc=xmlTag(b,'description')||xmlTag(b,'content:encoded');if(/abutters meeting|public hearing|commission meeting|board meeting/i.test(title))return null;const iso=(desc.match(/20\d\d[-/]\d\d[-/]\d\d(?:T\d\d:\d\d(?::\d\d)?)?/)||[])[0];let start=iso?new Date(iso):null;if(!start||Number.isNaN(start.getTime())){const p=parseDateLoose(`${title} ${desc}`);start=p?new Date(p):null;}const loc=(desc.match(/(?:Location|Where):\s*([^|•]{3,100})/i)||[])[1]||'';const address=(desc.match(/\d{1,5}\s+[A-Za-z0-9 .'-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Way|Parkway|Pkwy|Square|Sq)/i)||[])[0]||'';const free=/\bfree\b/i.test(desc);return{id:`bos-${i}-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,52)}`,title,venue:(loc||address||'City of Boston').trim(),address,start:start?.toISOString()||null,price:free?'FREE':'Details',info:desc.slice(0,1000),image:'',url:link,lat:null,lon:null,source:'Boston.gov'};}).filter(Boolean);}

async function loadBostonGov(){const xml=await fetchText(SOURCES.bostonGov.url);return dedupeRaw(bostonGovRssItems(xml)).filter(e=>withinHorizon(e)).slice(0,220);}
async function loadBpl(){const pages=await Promise.allSettled([1,2,3,4].map(p=>fetchText(`${SOURCES.bpl.url}?page=${p}`,12000)));const html=pages.filter(x=>x.status==='fulfilled').map(x=>x.value).join('\n');if(!html)throw new Error('BPL unavailable');const schema=jsonLdEvents(html).map((e,i)=>normalizeSchemaEvent(e,'Boston Public Library',SOURCES.bpl.home,i));const items=schema.length?schema:parseBplFallback(html);return dedupeRaw(items).filter(e=>withinHorizon(e)).slice(0,220);}
async function loadArts(){const urls=[SOURCES.arts.url,`${SOURCES.arts.url}?page=2`,`${SOURCES.arts.url}?page=3`];const pages=await Promise.allSettled(urls.map(u=>fetchText(u,12000)));const html=pages.filter(x=>x.status==='fulfilled').map(x=>x.value).join('\n');if(!html)throw new Error('ArtsBoston unavailable');const schema=jsonLdEvents(html).map((e,i)=>normalizeSchemaEvent(e,'ArtsBoston',SOURCES.arts.home,i));const items=schema.length?schema:parseArtsFallback(html);return dedupeRaw(items).filter(e=>withinHorizon(e)).slice(0,200);}
async function loadPlanning(){const xml=await fetchText(SOURCES.planning.url);return dedupeRaw(planningRssItems(xml)).filter(e=>withinHorizon(e)).slice(0,140);}
function parseCsv(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'){if(q&&n==='"'){cell+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(v=>v!==''))rows.push(row);row=[];}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}if(rows.length<2)return[];const heads=rows[0].map(h=>h.trim());return rows.slice(1).map(r=>Object.fromEntries(heads.map((h,i)=>[h,r[i]||''])));}
function findField(rec,patterns){const keys=Object.keys(rec||{});for(const p of patterns){const k=keys.find(x=>p.test(x));if(k)return k;}return null;}
function permitRecord(rec,i){const nameKey=findField(rec,[/event.*name/i,/name.*event/i,/event.?title/i,/event/i,/description/i]);const dateKey=findField(rec,[/event.*date/i,/date.*event/i,/start.*date/i,/event.?start/i,/date/i]);const locKey=findField(rec,[/event.*location/i,/location/i,/address/i,/street/i,/site/i]);const statusKey=findField(rec,[/status/i,/decision/i,/approval/i]);const title=(nameKey&&rec[nameKey])||'Boston special event';const rawDate=dateKey&&rec[dateKey];const start=rawDate?new Date(rawDate):null;if(start&&Number.isNaN(start.getTime()))return null;const status=statusKey?String(rec[statusKey]||''):'';if(/denied|cancel/i.test(status))return null;const address=(locKey&&rec[locKey])||'Boston';return{id:`permit-${i}-${String(title).slice(0,32).replace(/\W+/g,'-')}`,title:String(title).trim(),venue:String(address).trim()||'Boston',address:String(address).trim(),start:start?.toISOString()||null,price:'Details',info:'Public record from the City of Boston Special Event License Applications dataset. Permit data may describe an event application rather than a complete public event listing.',image:'',url:SOURCES.permits.home,lat:null,lon:null,source:'Boston permit'};}
async function loadPermits(){const pkg=await fetchJson('https://data.boston.gov/api/3/action/package_show?id=special-event-license-applications');const resources=pkg.result?.resources||[];const r=resources.find(x=>x.datastore_active)||resources.find(x=>/csv/i.test(x.format||''))||resources[0];if(!r)throw new Error('No event permit resource');let records=[];if(r.datastore_active){const d=await fetchJson(`https://data.boston.gov/api/3/action/datastore_search?resource_id=${encodeURIComponent(r.id)}&limit=1500`);records=d.result?.records||[];}else records=parseCsv(await fetchText(r.url));return dedupeRaw(records.map(permitRecord).filter(Boolean)).filter(e=>withinHorizon(e,30)).slice(0,150);}
function tmCategory(e){const c=e.classifications?.[0]||{};const text=`${c.segment?.name||''} ${c.genre?.name||''} ${c.subGenre?.name||''}`.toLowerCase();if(/music|concert/.test(text))return'Live Music';if(/sport/.test(text))return'Sports';if(/comedy/.test(text))return'Comedy';if(/film|movie/.test(text))return'Movies';if(/arts|theatre|theater|dance/.test(text))return'Art';return'Local';}
async function loadTicketmaster(){const key=process.env.TICKETMASTER_API_KEY?.trim();if(!key)return{disabled:true,items:[]};const now=new Date();const end=new Date(now);end.setDate(end.getDate()+30);const params=new URLSearchParams({apikey:key,city:'Boston',stateCode:'MA',countryCode:'US',startDateTime:now.toISOString().replace('.000',''),endDateTime:end.toISOString().replace('.000',''),size:'200',sort:'date,asc',locale:'*'});const json=await fetchJson(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);const items=(json._embedded?.events||[]).map(e=>{const venue=e._embedded?.venues?.[0]||{};const priceRange=e.priceRanges?.[0];const min=priceRange?.min;const images=(e.images||[]).slice().sort((a,b)=>(b.width||0)-(a.width||0));return{id:`tm-${e.id}`,title:e.name||'Boston event',venue:venue.name||'Boston',address:[venue.address?.line1,venue.city?.name,venue.state?.stateCode].filter(Boolean).join(', '),start:e.dates?.start?.dateTime||e.dates?.start?.localDate||null,price:min==null?'See price':min===0?'FREE':`$${Math.round(min)}+`,category:tmCategory(e),info:e.info||e.pleaseNote||'',image:images.find(i=>i.ratio==='16_9')?.url||images[0]?.url||'',url:e.url||'',lat:Number.isFinite(Number(venue.location?.latitude))?Number(venue.location.latitude):null,lon:Number.isFinite(Number(venue.location?.longitude))?Number(venue.location.longitude):null,source:'Ticketmaster'};});return{disabled:false,items:dedupeRaw(items).filter(e=>withinHorizon(e,30)).slice(0,220)};}

async function readPrevious(){try{return JSON.parse(await fs.readFile(OUT,'utf8'));}catch{return{sources:{},events:[]};}}
function previousFor(prev,sourceName){return(prev.events||[]).filter(e=>e.source===sourceName).filter(e=>withinHorizon(e));}
async function runSource(key,loader,prev,{disabledOk=false}={}){const meta=SOURCES[key];try{const result=await loader();if(result?.disabled&&disabledOk)return{key,status:{name:meta.name,ok:false,disabled:true,stale:false,count:0},items:[]};const items=Array.isArray(result)?result:(result.items||[]);return{key,status:{name:meta.name,ok:true,disabled:false,stale:false,count:items.length},items};}catch(error){const stale=previousFor(prev,meta.name==='City permits'?'Boston permit':meta.name);return{key,status:{name:meta.name,ok:false,disabled:false,stale:stale.length>0,count:stale.length,error:error?.message||String(error)},items:stale};}}

async function main(){const prev=await readPrevious();const jobs=await Promise.all([
  runSource('bostonGov',loadBostonGov,prev),
  runSource('arts',loadArts,prev),
  runSource('bpl',loadBpl,prev),
  runSource('planning',loadPlanning,prev),
  runSource('permits',loadPermits,prev),
  runSource('ticketmaster',loadTicketmaster,prev,{disabledOk:true}),
]);
const sources={};let events=[];for(const j of jobs){sources[j.key]=j.status;events.push(...j.items);}
events=events.filter(e=>e?.title&&withinHorizon(e)).sort((a,b)=>new Date(a.start||'9999-12-31')-new Date(b.start||'9999-12-31'));
const core={mode:'github-actions',horizonDays:HORIZON_DAYS,sources,events};
const prevCore={mode:prev.mode||'github-actions',horizonDays:prev.horizonDays||HORIZON_DAYS,sources:prev.sources||{},events:prev.events||[]};
if(JSON.stringify(core)===JSON.stringify(prevCore)){
  console.log(`CityLab: no event-data changes; keeping ${path.relative(ROOT,OUT)} unchanged.`);
}else{
  const payload={generatedAt:new Date().toISOString(),...core};
  await fs.mkdir(path.dirname(OUT),{recursive:true});
  await fs.writeFile(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
  console.log(`CityLab: wrote ${events.length} events to ${path.relative(ROOT,OUT)}`);
}
for(const [k,s] of Object.entries(sources))console.log(`${k}: ${s.ok?'OK':s.disabled?'disabled':s.stale?'stale cache':'failed'} (${s.count})${s.error?` - ${s.error}`:''}`);
}

main().catch(err=>{console.error(err);process.exitCode=1;});

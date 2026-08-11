const SOURCES = {
  bpl: {
    name: 'Boston Public Library',
    url: 'https://bpl.bibliocommons.com/v2/events',
    home: 'https://bpl.bibliocommons.com/v2/events',
  },
  arts: {
    name: 'ArtsBoston',
    url: 'https://bostix.org',
    home: 'https://bostix.org',
  },
  planning: {
    name: 'Boston Planning',
    url: 'https://www.bostonplans.org/news-calendar/calendar?rss=relationship',
    home: 'https://www.bostonplans.org/news-calendar/calendar',
  },
};

function decodeHtml(s='') {
  return String(s)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}
function stripHtml(s='') {
  return decodeHtml(String(s).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}
function absUrl(url, base) { try { return new URL(url, base).toString(); } catch { return base; } }
function firstArray(v) { return Array.isArray(v) ? v[0] : v; }
function imgUrl(v) { const x=firstArray(v); return typeof x==='string'?x:(x?.url||x?.contentUrl||''); }
function addressText(loc) {
  const a=loc?.address;
  if (!a) return '';
  if (typeof a==='string') return a;
  return [a.streetAddress,a.addressLocality,a.addressRegion,a.postalCode].filter(Boolean).join(', ');
}
function offerPrice(offers) {
  const o=firstArray(offers);
  if (!o) return '';
  const p=o.price ?? o.lowPrice;
  if (p==null || p==='') return '';
  const n=Number(p);
  return Number.isFinite(n) ? (n===0?'FREE':`$${Math.round(n)}+`) : String(p);
}
function flattenJsonLd(node, out=[]) {
  if (!node) return out;
  if (Array.isArray(node)) { node.forEach(x=>flattenJsonLd(x,out)); return out; }
  if (typeof node!=='object') return out;
  const type=node['@type'];
  const types=Array.isArray(type)?type:[type];
  if (types.some(t=>String(t||'').toLowerCase()==='event')) out.push(node);
  if (node['@graph']) flattenJsonLd(node['@graph'], out);
  return out;
}
function jsonLdEvents(html) {
  const out=[];
  const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m=re.exec(html))) {
    try { flattenJsonLd(JSON.parse(decodeHtml(m[1].trim())),out); } catch {}
  }
  return out;
}
function normalizeSchemaEvent(e, source, baseUrl, i) {
  const loc=firstArray(e.location)||{};
  const geo=loc.geo||{};
  const lat=Number(geo.latitude), lon=Number(geo.longitude);
  return {
    id: `${source.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-schema-${i}-${String(e.name||'event').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,42)}`,
    title: stripHtml(e.name||'Event'),
    venue: stripHtml(loc.name||addressText(loc)||source),
    address: stripHtml(addressText(loc)),
    start: e.startDate||null,
    end: e.endDate||null,
    price: offerPrice(e.offers)||'Details',
    info: stripHtml(e.description||'').slice(0,900),
    image: imgUrl(e.image),
    url: absUrl(e.url||baseUrl,baseUrl),
    lat: Number.isFinite(lat)?lat:null,
    lon: Number.isFinite(lon)?lon:null,
    source,
  };
}
async function fetchText(url, timeout=9000) {
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),timeout);
  try {
    const r=await fetch(url,{signal:ctl.signal,headers:{'User-Agent':'CityLab/6.0 (+Boston calendar aggregator)','Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally { clearTimeout(timer); }
}
function parseDateLoose(text='') {
  const cleaned=stripHtml(text).replace(/\bon\b/gi,' ').replace(/\s+/g,' ');
  const candidates=[
    cleaned.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(20\d{2})(?:[^\d]{0,20}(\d{1,2}:\d{2})\s*(am|pm))?/i),
    cleaned.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(20\d{2})(?:[^\d]{0,20}(\d{1,2}:\d{2})\s*(am|pm))?/i),
    cleaned.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(20\d{2})(?:[^\d]{0,20}(\d{1,2}:\d{2})\s*(am|pm))?/i),
  ].find(Boolean);
  if (!candidates) return null;
  const month=candidates[1], day=candidates[2], year=candidates[3], time=candidates[4], ap=candidates[5];
  const d=new Date(`${month} ${day}, ${year}${time?` ${time} ${ap||''}`:''}`);
  return Number.isNaN(d.getTime())?null:d.toISOString();
}
function dedupeRaw(items) {
  const seen=new Set();
  return items.filter(e=>{
    if(!e?.title) return false;
    const key=`${e.source}|${e.title.toLowerCase().replace(/[^a-z0-9]+/g,' ')}|${String(e.start||'').slice(0,10)}`;
    if(seen.has(key))return false; seen.add(key); return true;
  });
}
function parseBplFallback(html) {
  const items=[];
  const re=/<a[^>]+href=["']([^"']*\/events\/[a-f0-9]{16,})["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m, i=0;
  while((m=re.exec(html)) && items.length<120){
    const title=stripHtml(m[2]);
    if(title.length<4 || title.length>160) continue;
    const chunk=html.slice(Math.max(0,m.index-700),Math.min(html.length,re.lastIndex+1500));
    const text=stripHtml(chunk);
    const start=parseDateLoose(text);
    const loc=(text.match(/Event location:\s*([^|•]{2,90}?)(?=\s+(?:Note:|Registration|Find more events|Event type|Audience|$))/i)||[])[1]||'';
    const desc=text.split(title).slice(1).join(title).slice(0,700);
    items.push({id:`bpl-${i++}-${m[1].split('/').pop()}`,title,venue:loc||'Boston Public Library',address:'',start,price:'FREE',info:desc,url:absUrl(m[1],SOURCES.bpl.home),image:'',lat:null,lon:null,source:'Boston Public Library'});
  }
  return dedupeRaw(items);
}
function parseArtsFallback(html) {
  const items=[];
  const re=/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m,i=0;
  while((m=re.exec(html)) && items.length<120){
    const title=stripHtml(m[2]);
    if(title.length<5||title.length>150)continue;
    const url=absUrl(m[1],SOURCES.arts.home);
    if(/instagram|facebook|linkedin|contact|donate|about|submit|accessibility|booth/i.test(url+title))continue;
    const chunk=html.slice(Math.max(0,m.index-500),Math.min(html.length,re.lastIndex+900));
    const text=stripHtml(chunk);
    const start=parseDateLoose(text);
    if(!start)continue;
    const venue=(text.match(/Presented by\s+.{0,80}?\s+([^|•]{3,80}?)(?=\s+(?:Accessibility|Official Website|Aug|Sep|Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|$))/i)||[])[1]||'';
    items.push({id:`arts-${i++}-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,45)}`,title,venue:venue||'Greater Boston',address:'',start,price:'See price',info:'Arts and culture listing from ArtsBoston / BosTix.',url,image:'',lat:null,lon:null,source:'ArtsBoston'});
  }
  return dedupeRaw(items);
}
function rssItems(xml, source, home) {
  const blocks=[...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(m=>m[0]);
  const tag=(b,n)=>{const m=b.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)<\\/${n}>`,'i'));return m?stripHtml(m[1].replace(/<!\[CDATA\[|\]\]>/g,'')):'';};
  return blocks.map((b,i)=>{
    const title=tag(b,'title');
    const link=tag(b,'link')||home;
    const desc=tag(b,'description');
    const pub=tag(b,'pubDate');
    const start=parseDateLoose(`${title} ${desc}`)||(!Number.isNaN(new Date(pub).getTime())?new Date(pub).toISOString():null);
    const loc=(desc.match(/(?:LOCATION|Location):\s*([^|•]{2,100})/i)||[])[1]||'';
    return {id:`planning-${i}-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,45)}`,title,venue:loc||'Boston Planning',address:loc,start,price:'FREE',info:desc.slice(0,900),url:link,image:'',lat:null,lon:null,source};
  }).filter(x=>x.title && !/^cancelled:/i.test(x.title));
}
async function loadBpl(){
  const pages=await Promise.allSettled([1,2,3].map(p=>fetchText(`${SOURCES.bpl.url}?page=${p}`,8500)));
  const html=pages.filter(x=>x.status==='fulfilled').map(x=>x.value).join('\n');
  if(!html)throw new Error('BPL unavailable');
  const schema=jsonLdEvents(html).map((e,i)=>normalizeSchemaEvent(e,'Boston Public Library',SOURCES.bpl.home,i));
  const items=schema.length?schema:parseBplFallback(html);
  return dedupeRaw(items).slice(0,160);
}
async function loadArts(){
  const pages=await Promise.allSettled([SOURCES.arts.url,`${SOURCES.arts.url}/?page=2`].map(u=>fetchText(u,8500)));
  const html=pages.filter(x=>x.status==='fulfilled').map(x=>x.value).join('\n');
  if(!html)throw new Error('ArtsBoston unavailable');
  const schema=jsonLdEvents(html).map((e,i)=>normalizeSchemaEvent(e,'ArtsBoston',SOURCES.arts.home,i));
  const items=schema.length?schema:parseArtsFallback(html);
  return dedupeRaw(items).slice(0,140);
}
async function loadPlanning(){
  const xml=await fetchText(SOURCES.planning.url,8500);
  return dedupeRaw(rssItems(xml,'Boston Planning',SOURCES.planning.home)).slice(0,100);
}
function withinHorizon(e, days=45){
  if(!e.start)return true;
  const d=new Date(e.start); if(Number.isNaN(d.getTime()))return true;
  const now=new Date(); now.setHours(0,0,0,0); const end=new Date(now); end.setDate(end.getDate()+days);
  return d>=now&&d<=end;
}

export default async function handler(req,res){
  const results=await Promise.allSettled([loadBpl(),loadArts(),loadPlanning()]);
  const keys=['bpl','arts','planning'];
  const sources={}; let events=[];
  results.forEach((r,i)=>{
    const key=keys[i], meta=SOURCES[key];
    if(r.status==='fulfilled'){
      const items=r.value.filter(e=>withinHorizon(e));
      sources[key]={name:meta.name,ok:true,count:items.length};
      events.push(...items);
    }else sources[key]={name:meta.name,ok:false,count:0,error:r.reason?.message||'Unavailable'};
  });
  res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=3600');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.status(200).json({generatedAt:new Date().toISOString(),sources,events});
}

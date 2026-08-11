# CityLab V6

Boston-first, mobile-first city intelligence PWA, continuing the original CityLab design.

## V6 highlights

### Much broader event coverage
CityLab's event layer now combines:
- City of Boston official event RSS
- ArtsBoston / BosTix arts and culture calendar
- Boston Public Library events
- Boston Planning calendar
- Boston Special Event License Applications
- Optional Ticketmaster Discovery API listings

The extra public calendars are fetched server-side through `api/calendar-events.js` so browser CORS does not block them. The function uses provider RSS/structured data where available and falls back to conservative HTML parsing when a calendar does not expose a simple public browser feed.

### Better discovery controls
- New **Source** filter in Discover: All sources, Boston.gov, ArtsBoston, BPL, Ticketmaster, Boston Planning, or City permits.
- Cross-source deduplication remains enabled. If two sources describe the same event, CityLab keeps the richer version and records all matched sources.
- Source quality affects recommendations: rich official/arts listings rank higher; planning and permit records remain searchable without taking over Best Tonight.
- New `Classes & Talks` category helps organize BPL programs, author talks, workshops, tours, and similar listings.
- More → Sources shows each calendar independently with a live/fallback state and listing count.

### V5 map retained
- Real Leaflet + OpenStreetMap Boston map
- Pan/zoom, location, event markers, MBTA hubs, Bluebikes, Neighborhood Pulse
- Viewport-preserving layer toggles and replay
- Solid precise pins vs dashed approximate locations
- Event detail → Live Map handoff

## Serverless calendar aggregator

`api/calendar-events.js` is intended for Vercel. It currently pulls:
- `https://bpl.bibliocommons.com/v2/events`
- `https://bostix.org`
- `https://www.bostonplans.org/news-calendar/calendar?rss=relationship`

The response is cached at the edge for 10 minutes with stale-while-revalidate.

If you deploy only as static GitHub Pages, the rest of CityLab still works, but these three added calendars will show as fallback because `/api/calendar-events` requires a serverless runtime. Vercel deployment enables the full V6 calendar mix.

## Ticketmaster

Ticketmaster remains optional:
1. Create a Ticketmaster Discovery API key.
2. Open **More → Event integration**.
3. Paste the key and tap **Connect**.

The key is stored in browser localStorage. For a public production deployment, move Ticketmaster requests behind a server-side proxy.

## Run locally

Static UI:
```bash
python -m http.server 8080
```

The Vercel calendar functions will not run under Python's static server. Use Vercel's local development runtime if you want to test the extra calendar sources locally.

## Notes

- Third-party public calendar markup can change; every additional calendar fails independently so one broken source does not take down Discover.
- BPL can contain a very large number of programs, including recurring and long-running exhibitions. CityLab caps and ranks imported items so they do not swamp other sources.
- Boston Planning events are useful civic data but intentionally rank lower than arts, library, city-event and ticketed listings in general recommendations.
- ArtsBoston covers Greater Boston, so some listings may be in nearby Cambridge, Somerville, Brookline, etc.
- City Replay remains a modeled time-of-day view, not accumulated historical city telemetry yet.

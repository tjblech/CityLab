# CityLab V3

Boston-first, mobile-first city intelligence PWA based on the original CityLab preview.

## What V3 adds

- Multi-source event aggregation instead of a single event feed
- Automatic Boston Special Event License Applications integration (no key required)
- Optional Ticketmaster Discovery API layer for ticketed events
- "Do Something" planner using real events currently known to CityLab
- Neighborhood Pulse cards combining event activity with Bluebikes availability
- Live City Replay from 6 PM through midnight
- Working Saved → Optimize route ordering
- Richer City Data dashboard: civic permits, busiest neighborhood, free-event share, bike-station count
- Better source labeling and graceful fallback behavior

## Existing live sources

- MBTA V3: alerts and arrival predictions
- Bluebikes GBFS: live station/bike availability
- Analyze Boston BOS:311
- Analyze Boston Special Event License Applications
- Ticketmaster Discovery API (optional key)

## Event data behavior

CityLab V3 aggregates sources:

1. Boston civic event permit records load automatically when the open-data source is reachable.
2. If a Ticketmaster API key is configured, those ticketed events are added on top.
3. If no live event source is reachable, CityLab falls back to clearly labeled preview cards so the interface remains usable.

Permit records are public licensing records and may not contain the same completeness as a dedicated consumer event listing. CityLab labels them `CITY` and event detail sheets explain the limitation.

## Run locally

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy

Static deployment works on GitHub Pages, Cloudflare Pages, Netlify, or Vercel.

## Notes

- Ticketmaster keys are stored only in browser localStorage in this prototype. A production public deployment should proxy secret-backed services server-side.
- Public feeds can change schema or CORS behavior; adapters fail gracefully.
- The map is still dependency-free and stylized rather than a full vector-tile map.
- `DESIGN_REFERENCE.png` is the original CityLab preview and remains the visual target.

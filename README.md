# CityLab V2

Boston-first, mobile-first city intelligence PWA, continuing the original CityLab preview design.

## V2 additions

- Event search, category, date, and price filtering
- Event detail bottom sheets
- Persistent saved event objects (works even after live feeds refresh)
- Optional Ticketmaster Discovery API integration
- MBTA upcoming-arrival predictions for central Boston hubs
- "Use my location" nearby-transit lookup
- Bluebikes GBFS with current station availability
- Analyze Boston BOS:311 open-data probe and live source health
- Richer Live City event markers and event details from the map
- Live vs preview labeling throughout the UI
- Updated offline cache/service worker

## Event data

CityLab ships with a clearly labeled preview catalog so the interface always has something to render.

For current ticketed events:
1. Create a Ticketmaster developer API key.
2. Open **More → Event integration**.
3. Paste the key and tap **Connect**.

The key is kept only in browser localStorage. For a public production deployment, move API-key handling to a server/serverless proxy instead of publishing a secret in source code.

## Run locally

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy

Static deployment works on GitHub Pages, Cloudflare Pages, Netlify, or Vercel.

## Notes

- Public feeds can change shape or CORS behavior; every live adapter fails gracefully.
- BOS:311 resource discovery is dynamic because the City periodically rotates dataset resources.
- The custom map is intentionally dependency-free; real vector/map tiles remain a future upgrade.

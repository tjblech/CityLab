# CityLab V1

A dependency-free, mobile-first PWA prototype for **Boston city intelligence**.

## Included

- Original-preview-inspired dark visual system
- **Now** dashboard
- **Discover** with categories and local saved events
- **Live City** stylized Boston map with layer toggles and time scrubber
- **Saved** events and lightweight itinerary preview
- **More / Data** source health and live metrics
- Live **MBTA V3 alerts** (no key required for experimentation)
- Live **Bluebikes GBFS** bike/station availability
- Geolocation button on Live City
- Offline shell via service worker
- Installable PWA manifest and icons
- Graceful fallback if public feeds are unavailable

## Run locally

Browsers do not allow service workers from a raw `file://` URL, so serve the folder:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy

This project is static and can be hosted directly on GitHub Pages, Cloudflare Pages, Netlify, or Vercel.

## Next integrations

1. Event aggregation (Boston.gov + ArtsBoston + Ticketmaster / venue sources)
2. Real MBTA arrivals and nearby stations
3. Actual map tiles or a custom vector Boston map
4. Neighborhood pages and city pulse history
5. City Replay / historical snapshots
6. Notifications and "Do Something" planner

## Notes

Some cards in the V1 event layer are curated preview data; the app visually separates source status in **More**. Live MBTA and Bluebikes data are fetched client-side.

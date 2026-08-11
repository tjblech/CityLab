# CityLab V5

Boston-first, mobile-first city intelligence PWA, continuing the original CityLab preview design.

## V5 highlights

### Live City map rebuilt
- Replaced the old percentage-positioned SVG illustration with a real interactive Boston map powered by Leaflet 1.9.4 and OpenStreetMap tiles.
- Pan, pinch/scroll zoom, reset to Boston, and opt-in device location.
- Real geographic markers for coordinate-rich events and live Bluebike stations.
- Approximate neighborhood-level event positions are shown with dashed pins instead of pretending they are precise.
- MBTA hub markers use real station coordinates.
- New Neighborhood Pulse layer derives activity from CityLab's current event + Bluebike data.
- Layer toggles update without destroying or resetting the current map viewport.
- Saved-only event map mode.
- City Replay now covers the full 24-hour day instead of only 6 PM–midnight.
- Scrubbing Replay updates event visibility without snapping the map back to its starting position.
- Event detail sheets can jump directly to the event on Live City.

### V4 discovery features retained
- Boston.gov official event RSS adapter
- Ticketmaster optional ticketed-event integration
- Boston special-event permit layer
- Smart cross-source event deduplication
- Best Tonight, Free & Interesting, and Nearby discovery lanes
- Recommended / Soonest / Nearby / Cheapest sorting
- Personalization based on locally saved events
- Event calendar/share/directions actions
- MBTA alerts and predictions
- Bluebikes GBFS
- BOS:311 data probe
- Do Something outing planner
- Saved itinerary optimization

## Map dependencies

Leaflet 1.9.4 is loaded from the official Leaflet-recommended unpkg CDN. Map tiles come from the standard OpenStreetMap tile service with visible OpenStreetMap attribution.

The rest of CityLab remains dependency-free. If Leaflet or map tiles are unavailable, Live City shows a graceful map-unavailable state while the rest of the PWA continues to work.

For a high-traffic public deployment, use a production map-tile provider that fits your expected usage rather than relying on the community OpenStreetMap tile servers at scale.

## Event data

CityLab keeps a preview catalog so the interface always renders even when public feeds are unavailable.

For current ticketed events:
1. Create a Ticketmaster Discovery API key.
2. Open **More → Event integration**.
3. Paste the key and tap **Connect**.

The key is stored only in browser localStorage. For a public production deployment, proxy API-key requests server-side instead of shipping a secret to clients.

## Run locally

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy

Static deployment works on GitHub Pages, Cloudflare Pages, Netlify, or Vercel. The included Vercel function can proxy Boston.gov RSS when direct browser CORS blocks it.

## Notes

- Public feeds can change shape or CORS behavior; live adapters fail gracefully.
- BOS:311 resource discovery is dynamic because Boston periodically rotates dataset resources.
- City Replay is still a modeled time-of-day view, not accumulated historical city telemetry yet.
- Neighborhood Pulse is a CityLab-derived signal, not an official Boston activity metric.

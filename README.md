# CityLab V4

Boston-first, mobile-first city intelligence PWA, continuing the original CityLab preview design.

## V4 additions

- Official **City of Boston events RSS** layer in addition to City event permits
- Smarter multi-source event deduplication and field merging
- Source quality / event richness scoring
- **Best Tonight** recommendations based on timing, source quality, detail richness, and what you save
- **Free & Interesting** discovery lane for local programming that ticket apps tend to bury
- Optional **Near You** sorting using on-device geolocation
- Recommended / Soonest / Nearby / Cheapest sorting
- A compact **Tonight's Brief** on the Now screen
- Event actions: **Add to Calendar (.ics)**, Share, and Directions
- Multi-source badges in event details when listings are merged
- Tiny optional Vercel proxy for the Boston.gov RSS feed when direct browser CORS blocks it
- Everything from V3 remains: MBTA arrivals/alerts, Bluebikes, 311, Live City, Replay, Do Something, Neighborhood Pulse, saved routing, Ticketmaster integration, and offline PWA support

## Event sources

CityLab V4 attempts to combine:

1. **Boston.gov events RSS** — official public event listings and free City programming.
2. **Boston Special Event License Applications** — useful civic/local event records, but treated as permit records rather than polished consumer listings.
3. **Ticketmaster Discovery API** — optional ticketed events such as concerts, sports, and comedy.
4. **Preview catalog** — only used when live event layers cannot load.

Overlapping events are deduplicated. A richer official/event listing is preferred over a sparse permit record, while useful fields from both can be retained.

## Ticketmaster

For additional current ticketed events:

1. Create a Ticketmaster developer API key.
2. Open **More → Event integration**.
3. Paste the key and tap **Connect**.

The browser-key flow is fine for personal use. For a public production deployment, keep secrets in a server/serverless environment rather than committing them to source.

## Boston.gov RSS and Vercel

CityLab first tries the public Boston.gov RSS feed directly. Some hosting/browser combinations may block cross-origin RSS requests.

V4 includes `api/boston-events.js`, a tiny same-origin Vercel proxy. If you deploy the repo to Vercel, CityLab automatically falls back to this endpoint when the direct RSS request fails.

The rest of CityLab still works on static hosts such as GitHub Pages; only the optional proxy endpoint is unavailable there.

## Run locally

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy

- **Vercel:** recommended for V4 because the Boston.gov RSS proxy works automatically.
- **GitHub Pages / Cloudflare Pages / Netlify:** the static PWA works; live cross-origin feeds remain subject to each source's CORS behavior.

## Notes

- Live public feeds can change shape or CORS behavior; adapters fail gracefully.
- Location is kept only in page memory for nearby sorting; V4 does not persist your coordinates.
- City Replay remains a modeled visualization until CityLab begins storing its own historical snapshots.
- The custom map remains dependency-free; vector map tiles are still a future upgrade.

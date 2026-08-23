# CityLab V7 — GitHub Pages Edition

V7 keeps the GitHub-only V6.1 event pipeline and V5 geographic map, while rebuilding the Now screen around what is useful **where you are, today**.

## V7 changes

- **Nearby Transit replaces random citywide trains.** With location permission, CityLab loads MBTA predictions around you. Without location, it shows no arbitrary train feed and lets you choose a station manually.
- **Transit alerts are actionable.** Relevant alerts are shown inline, can be opened, include the full MBTA description/timeframe, and link to MBTA. When location is available, alerts are prioritized against nearby routes/stops.
- **Today is strict.** Event date matching uses the `America/New_York` timezone. Only events active today count under Today; future events are separated into Coming Up. Multi-day events count on every day they are active when an end date is available.
- **Tonight is separate.** The home page highlights events actually happening tonight rather than borrowing whatever filter was last used in Discover.
- **Event end dates are preserved** from the GitHub-generated event dataset.
- **Home visual hierarchy rebuilt.** A stronger city-status hero, contextual Near You section, image-led Tonight block, compact data metrics, Coming Up list, and fewer repetitive dark cards.
- **Nearby Bluebikes** appears when location is enabled.
- The **Live City map, GitHub Actions event updater, expanded V6 calendars, Discover, planner, Saved, and source filters remain intact.**

The GitHub Pages architecture from V6.1 stays intact: CityLab keeps the expanded V6 discovery engine and V5 interactive Boston map without requiring Vercel or another backend. Public event calendars are refreshed by GitHub Actions and written to a static file that GitHub Pages can serve directly.

## What changed from V6

- `data/events.json` is the app's event cache.
- `scripts/fetch-events.mjs` gathers Boston.gov, ArtsBoston / BosTix, Boston Public Library, Boston Planning, Boston special-event permits, and optional Ticketmaster listings.
- `.github/workflows/update-events.yml` runs the event fetch automatically every hour and can also be run manually.
- `app.js` loads `data/events.json` instead of `/api/calendar-events` or `/api/boston-events`.
- Ticketmaster can be enabled with the GitHub Actions secret `TICKETMASTER_API_KEY`; the key is never shipped in the website JavaScript.
- If an individual public calendar temporarily fails, the updater preserves that source's last good unexpired events and marks the source as cached/stale.
- The old `api/` directory and `vercel.json` are no longer required.

## First-time GitHub setup

1. Upload/commit this V7 folder to the same branch that currently contains CityLab.
2. Make sure the workflow exists at exactly:
   `.github/workflows/update-events.yml`
3. Open the repository on GitHub and select **Actions**.
4. Select **Update CityLab Events** in the left sidebar.
5. Select **Run workflow**, choose your default branch, then select **Run workflow** again.
6. Wait for that run to finish. It will update and commit `data/events.json` automatically.
7. Open `data/events.json` in the repo. `generatedAt` should now contain a timestamp and `events` should contain the collected listings.

After that, the scheduled workflow checks the calendars at minute 17 of every hour. It only commits `data/events.json` when the event/source data actually changed, so unchanged hourly checks do not spam your commit history. GitHub may occasionally delay scheduled jobs during busy periods; CityLab simply continues using the last generated event file until the next successful refresh.

## Optional Ticketmaster setup

The public calendars work without any secret.

To add Ticketmaster:

1. Open repository **Settings**.
2. Go to **Secrets and variables → Actions**.
3. Choose **New repository secret**.
4. Name it exactly `TICKETMASTER_API_KEY`.
5. Paste your Ticketmaster Discovery API key as the value and save it.
6. Go back to **Actions → Update CityLab Events → Run workflow** to refresh immediately.

If that secret does not exist, Ticketmaster is simply marked disabled; the other calendars still update normally.

## GitHub Pages

No special backend is needed. Keep using your current GitHub Pages setup. The PWA loads the static site normally and fetches `./data/events.json` from the same Pages origin.

If Pages is publishing from a branch/folder, make sure the files shown below are inside that published site root.

## Repository structure

```text
CityLab/
├── .github/
│   └── workflows/
│       └── update-events.yml
├── data/
│   └── events.json
├── scripts/
│   └── fetch-events.mjs
├── icons/
│   ├── icon-180.png
│   ├── icon-192.png
│   └── icon-512.png
├── DESIGN_REFERENCE.png
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── service-worker.js
└── README.md
```

## Event sources

- **Boston.gov** — official City of Boston event RSS
- **ArtsBoston / BosTix** — Greater Boston arts and culture
- **Boston Public Library** — classes, talks, concerts, exhibitions, workshops, and library programming
- **Boston Planning** — planning meetings, workshops, and civic events
- **Boston special-event permits** — public special-event licensing records
- **Ticketmaster** — optional ticketed-event layer when `TICKETMASTER_API_KEY` is configured

CityLab still deduplicates likely cross-source matches in the browser and prefers richer sources for recommendations.

## Live data that stays browser-side

These feeds are still loaded directly by CityLab when the PWA is open:

- MBTA alerts and arrival predictions
- Bluebikes station status
- BOS:311 statistics

## Local testing

Because this is now a fully static GitHub Pages build, any static web server works. For example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

The checked-in `data/events.json` starts empty in this package; run the GitHub workflow once to populate it with current events.

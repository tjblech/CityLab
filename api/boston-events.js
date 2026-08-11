export default async function handler(req, res) {
  try {
    const upstream = await fetch('https://www.boston.gov/rss/events', {
      headers: { 'User-Agent': 'CityLab/6.0 (+Boston event discovery)' }
    });
    if (!upstream.ok) throw new Error(`Boston.gov returned ${upstream.status}`);
    const xml = await upstream.text();
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.status(200).send(xml);
  } catch (error) {
    res.status(502).json({ error: error.message || 'Boston.gov feed unavailable' });
  }
}

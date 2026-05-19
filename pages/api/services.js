export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const r = await fetch('https://api.smscode.gg/v1/catalog/platforms', {
      headers: {
        Authorization: `Bearer ${process.env.SMSCODE_TOKEN}`,
        Accept: 'application/json',
      },
    });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

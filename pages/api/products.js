export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { country_id, platform_id } = req.query;
  if (!country_id || !platform_id) return res.status(400).json({ success: false, message: 'Missing params' });

  try {
    const params = new URLSearchParams({ country_id, platform_id, sort: 'price_asc', limit: '50' });
    const r = await fetch(`https://api.smscode.gg/v1/catalog/products?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.SMSCODE_TOKEN}`,
        Accept: 'application/json',
      },
    });
    const raw = await r.json();
    const margin = parseInt(process.env.OTP_MARGIN || '0');

    // Tambahkan margin ke setiap harga
    if (raw.success && Array.isArray(raw.data)) {
      raw.data = raw.data.map((p) => ({
        ...p,
        price_original: p.price,
        price: p.price + margin,
      }));
    }
    res.status(200).json(raw);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

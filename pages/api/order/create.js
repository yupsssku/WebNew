export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ success: false, message: 'Missing product_id' });

  try {
    const r = await fetch('https://api.smscode.gg/v1/orders/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SMSCODE_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ product_id: parseInt(product_id), quantity: 1 }),
    });
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { id, amount } = req.query;
  if (!id || !amount) return res.status(400).json({ success: false });

  try {
    const params = new URLSearchParams({
      project: process.env.PAKASIR_SLUG,
      order_id: id,
      amount: amount,
      api_key: process.env.PAKASIR_API_KEY,
    });
    const r = await fetch(`https://app.pakasir.com/api/transactiondetail?${params}`);
    const data = await r.json();
    const status = data?.transaction?.status || 'pending';
    res.status(200).json({ success: true, status, raw: data?.transaction });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message, status: 'pending' });
  }
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false });

  if (req.method === 'GET') {
    try {
      const r = await fetch(`https://api.smscode.gg/v1/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${process.env.SMSCODE_TOKEN}`,
          Accept: 'application/json',
        },
      });
      const data = await r.json();
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  } else if (req.method === 'DELETE') {
    // Cancel order
    try {
      const r = await fetch('https://api.smscode.gg/v1/orders/cancel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SMSCODE_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ id: parseInt(id) }),
      });
      const data = await r.json();
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  } else {
    res.status(405).end();
  }
}

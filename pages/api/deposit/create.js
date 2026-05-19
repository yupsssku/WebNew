const QRCode = require('qrcode');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { amount } = req.body;
  if (!amount || isNaN(amount) || parseInt(amount) < 2000) {
    return res.status(400).json({ success: false, message: 'Minimum deposit Rp 2.000' });
  }

  const orderId = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  try {
    const r = await fetch('https://app.pakasir.com/api/transactioncreate/qris', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project: process.env.PAKASIR_SLUG,
        order_id: orderId,
        amount: parseInt(amount),
        api_key: process.env.PAKASIR_API_KEY,
      }),
    });
    const data = await r.json();
    if (!data.payment) {
      return res.status(400).json({ success: false, message: data.message || 'Gagal buat tagihan' });
    }

    const qrDataUrl = await QRCode.toDataURL(data.payment.payment_number, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    res.status(200).json({
      success: true,
      orderId,
      amount: parseInt(amount),
      totalBayar: data.payment.total_payment,
      expiredAt: data.payment.expired_at,
      qrImage: qrDataUrl,
      qrString: data.payment.payment_number,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

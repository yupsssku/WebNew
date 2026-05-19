import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';

const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

const COUNTRY_FLAGS = {
  'indonesia': '🇮🇩', 'malaysia': '🇲🇾', 'india': '🇮🇳', 'united states': '🇺🇸',
  'united kingdom': '🇬🇧', 'russia': '🇷🇺', 'china': '🇨🇳', 'philippines': '🇵🇭',
  'vietnam': '🇻🇳', 'thailand': '🇹🇭', 'singapore': '🇸🇬', 'australia': '🇦🇺',
  'japan': '🇯🇵', 'south korea': '🇰🇷', 'brazil': '🇧🇷', 'mexico': '🇲🇽',
  'france': '🇫🇷', 'germany': '🇩🇪', 'canada': '🇨🇦', 'netherlands': '🇳🇱',
  'turkey': '🇹🇷', 'nigeria': '🇳🇬', 'pakistan': '🇵🇰', 'bangladesh': '🇧🇩',
  'ukraine': '🇺🇦', 'poland': '🇵🇱', 'cambodia': '🇰🇭', 'myanmar': '🇲🇲',
  'egypt': '🇪🇬', 'kenya': '🇰🇪', 'ghana': '🇬🇭', 'argentina': '🇦🇷',
  'colombia': '🇨🇴', 'spain': '🇪🇸', 'italy': '🇮🇹', 'sweden': '🇸🇪',
  'portugal': '🇵🇹', 'hong kong': '🇭🇰', 'taiwan': '🇹🇼', 'sri lanka': '🇱🇰',
};
const getFlag = (name) => {
  if (!name) return '🌍';
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(COUNTRY_FLAGS)) {
    if (key.includes(k)) return v;
  }
  return '🌍';
};

const SVC_ICONS = {
  telegram: '📱', whatsapp: '💬', google: '🔵', facebook: '🔵', instagram: '📸',
  twitter: '🐦', tiktok: '🎵', grab: '🚗', gojek: '🛵', shopee: '🛍',
  tokopedia: '🛒', default: '📲'
};
const getServiceIcon = (name) => {
  if (!name) return '📲';
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(SVC_ICONS)) {
    if (lower.includes(k)) return v;
  }
  return '📲';
};

const STEP = {
  IDLE: 'idle',
  PICK_COUNTRY: 'pick_country',
  PICK_PRODUCT: 'pick_product',
  DEPOSIT: 'deposit',
  PAYING: 'paying',
  PAID: 'paid',
  ORDERING: 'ordering',
  WAITING_OTP: 'waiting_otp',
  OTP_SUCCESS: 'otp_success',
  ERROR: 'error',
};

function useCountdown(targetMs) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!targetMs) return;
    const update = () => {
      const diff = targetMs - Date.now();
      setLeft(Math.max(0, diff));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [targetMs]);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return { left, display: `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` };
}

export default function Home() {
  const [services, setServices] = useState([]);
  const [svcSearch, setSvcSearch] = useState('');
  const [svcPage, setSvcPage] = useState(1);
  const SVC_PER_PAGE = 18;

  const [step, setStep] = useState(STEP.IDLE);
  const [selService, setSelService] = useState(null);
  const [countries, setCountries] = useState([]);
  const [ctySearch, setCtySearch] = useState('');
  const [selCountry, setSelCountry] = useState(null);
  const [products, setProducts] = useState([]);
  const [selProduct, setSelProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  const [depositAmt, setDepositAmt] = useState('');
  const [depositInfo, setDepositInfo] = useState(null);
  const depositExpiry = useRef(null);
  const { display: depositCountdown, left: depositLeft } = useCountdown(depositExpiry.current);

  const [orderInfo, setOrderInfo] = useState(null);
  const [otpCode, setOtpCode] = useState(null);
  const [otpPhone, setOtpPhone] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  const depositPollRef = useRef(null);
  const otpPollRef = useRef(null);
  const otpTimeoutRef = useRef(null);

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setServices(d.data.filter((s) => s.active !== false));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(depositPollRef.current);
      clearInterval(otpPollRef.current);
      clearTimeout(otpTimeoutRef.current);
    };
  }, []);

  const filteredSvc = services.filter((s) =>
    !svcSearch || s.name.toLowerCase().includes(svcSearch.toLowerCase())
  );
  const totalSvcPage = Math.ceil(filteredSvc.length / SVC_PER_PAGE);
  const pagedSvc = filteredSvc.slice((svcPage - 1) * SVC_PER_PAGE, svcPage * SVC_PER_PAGE);

  const handlePickService = useCallback(async (svc) => {
    setSelService(svc);
    setSelCountry(null);
    setSelProduct(null);
    setCtySearch('');
    setLoading(true);
    setStep(STEP.PICK_COUNTRY);
    try {
      const r = await fetch('/api/countries');
      const d = await r.json();
      if (d.success && Array.isArray(d.data)) {
        setCountries(d.data.filter((c) => c.active !== false));
      }
    } catch {}
    setLoading(false);
  }, []);

  const handlePickCountry = useCallback(async (cty) => {
    setSelCountry(cty);
    setSelProduct(null);
    setLoading(true);
    setStep(STEP.PICK_PRODUCT);
    try {
      const params = new URLSearchParams({
        country_id: cty.id,
        platform_id: selService.id || selService.code,
      });
      const r = await fetch(`/api/products?${params}`);
      const d = await r.json();
      if (d.success && Array.isArray(d.data)) {
        setProducts(d.data.filter((p) => p.available > 0));
      } else {
        setProducts([]);
      }
    } catch {}
    setLoading(false);
  }, [selService]);

  const handlePickProduct = useCallback((p) => {
    setSelProduct(p);
    setDepositAmt(String(p.price));
    setStep(STEP.DEPOSIT);
  }, []);

  const handleCreateDeposit = useCallback(async () => {
    const amt = parseInt(depositAmt);
    if (isNaN(amt) || amt < 2000) {
      setErrMsg('Minimum deposit Rp 2.000');
      return;
    }
    if (amt < selProduct?.price) {
      setErrMsg(`Minimal deposit ${fmt(selProduct.price)} untuk membayar pesanan`);
      return;
    }
    setLoading(true);
    setErrMsg('');
    try {
      const r = await fetch('/api/deposit/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message || 'Gagal buat tagihan');
      depositExpiry.current = new Date(d.expiredAt).getTime();
      setDepositInfo(d);
      setStep(STEP.PAYING);
      startDepositPoll(d.orderId, d.amount);
    } catch (e) {
      setErrMsg(e.message);
    }
    setLoading(false);
  }, [depositAmt, selProduct]);

  const startDepositPoll = useCallback((orderId, amount) => {
    clearInterval(depositPollRef.current);
    depositPollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/deposit/${orderId}?amount=${amount}`);
        const d = await r.json();
        if (d.status === 'completed') {
          clearInterval(depositPollRef.current);
          setStep(STEP.PAID);
        }
      } catch {}
    }, 4000);
  }, []);

  const handleCreateOrder = useCallback(async () => {
    if (!selProduct) return;
    setLoading(true);
    setErrMsg('');
    setStep(STEP.ORDERING);
    try {
      const r = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selProduct.id }),
      });
      const d = await r.json();
      if (!d.success || !d.data?.orders?.[0]) {
        throw new Error(d.error?.message || 'Gagal buat order. Coba lagi.');
      }
      const order = d.data.orders[0];
      setOrderInfo(order);
      setStep(STEP.WAITING_OTP);
      startOtpPoll(String(order.id), 15 * 60 * 1000);
    } catch (e) {
      setErrMsg(e.message);
      setStep(STEP.ERROR);
    }
    setLoading(false);
  }, [selProduct]);

  const startOtpPoll = useCallback((orderId, timeoutMs) => {
    clearInterval(otpPollRef.current);
    clearTimeout(otpTimeoutRef.current);

    otpPollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/order/${orderId}`);
        const d = await r.json();
        if (!d.success) return;
        const od = d.data;
        if (od?.otp_code) {
          clearInterval(otpPollRef.current);
          clearTimeout(otpTimeoutRef.current);
          setOtpCode(String(od.otp_code));
          setOtpPhone(od.phone_number || '');
          setStep(STEP.OTP_SUCCESS);
        } else if (['EXPIRED', 'CANCELED', 'CANCELLED'].includes((od?.status || '').toUpperCase())) {
          clearInterval(otpPollRef.current);
          setErrMsg('Pesanan dibatalkan/kadaluarsa. Silakan coba lagi.');
          setStep(STEP.ERROR);
        }
      } catch {}
    }, 5000);

    otpTimeoutRef.current = setTimeout(() => {
      clearInterval(otpPollRef.current);
      setErrMsg('Waktu habis (15 menit). OTP tidak masuk. Hubungi admin untuk refund.');
      setStep(STEP.ERROR);
    }, timeoutMs);
  }, []);

  const handleCancelOrder = useCallback(async () => {
    clearInterval(otpPollRef.current);
    clearTimeout(otpTimeoutRef.current);
    if (orderInfo?.id) {
      fetch(`/api/order/${orderInfo.id}`, { method: 'DELETE' }).catch(() => {});
    }
    resetAll();
  }, [orderInfo]);

  const resetAll = () => {
    clearInterval(depositPollRef.current);
    clearInterval(otpPollRef.current);
    clearTimeout(otpTimeoutRef.current);
    setStep(STEP.IDLE);
    setSelService(null);
    setSelCountry(null);
    setSelProduct(null);
    setDepositInfo(null);
    setOrderInfo(null);
    setOtpCode(null);
    setOtpPhone(null);
    setErrMsg('');
    setDepositAmt('');
    depositExpiry.current = null;
  };

  const filteredCty = countries.filter((c) =>
    !ctySearch || c.name.toLowerCase().includes(ctySearch.toLowerCase())
  );

  const showModal = step !== STEP.IDLE;

  return (
    <>
      <Head>
        <title>NOKOTEL — Virtual Number OTP Tercepat</title>
        <meta name="description" content="Layanan virtual number OTP terpercaya. Proses instan, harga terjangkau, 200+ negara." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📱</text></svg>" />
      </Head>

      <div className="grid-bg" />

      <header className="header">
        <div className="header-inner">
          <a className="logo" href="/">
            <div className="logo-icon">📱</div>
            NOKO<span>TEL</span>
          </a>
          <nav className="header-nav">
            <button className="btn-nav btn-nav-ghost" onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}>
              Katalog
            </button>
            <button className="btn-nav btn-nav-ghost" onClick={() => document.getElementById('cara')?.scrollIntoView({ behavior: 'smooth' })}>
              Cara Kerja
            </button>
            {process.env.NEXT_PUBLIC_BOT_URL && (
              <a href={process.env.NEXT_PUBLIC_BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-nav btn-nav-primary">
                Bot Telegram
              </a>
            )}
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-badge">
          <span className="badge-dot" />
          Server Online — {services.length > 0 ? `${services.length} Layanan Aktif` : 'Memuat...'}
        </div>
        <h1 className="hero-title">
          <div className="line1">Virtual Number OTP</div>
          <div className="line2">Instan & Terpercaya</div>
        </h1>
        <p className="hero-desc">
          Nomor virtual dari 200+ negara. OTP masuk otomatis, harga terjangkau,
          proses dalam hitungan detik tanpa perlu SIM Card.
        </p>
        <div className="hero-cta">
          <button
            className="btn-primary"
            onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
          >
            🚀 Order Sekarang
          </button>
          <button
            className="btn-secondary"
            onClick={() => document.getElementById('cara')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Cara Kerja
          </button>
        </div>
      </section>

      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-number">{services.length || '—'}+</div>
          <div className="stat-label">Layanan Tersedia</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">200+</div>
          <div className="stat-label">Negara Aktif</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">24/7</div>
          <div className="stat-label">Layanan Non-Stop</div>
        </div>
      </div>

      <section id="cara" className="section">
        <div className="section-title">⚡ Cara Kerja</div>
        <p className="section-subtitle">Order selesai dalam 4 langkah sederhana</p>
        <div className="steps-grid">
          {[
            { n: '01', icon: '📱', t: 'Pilih Layanan', d: 'Cari aplikasi yang butuh verifikasi nomor dari katalog kami.' },
            { n: '02', icon: '🌍', t: 'Pilih Negara', d: 'Pilih negara dan harga nomor yang paling sesuai kebutuhanmu.' },
            { n: '03', icon: '💳', t: 'Bayar via QRIS', d: 'Bayar instan dengan QRIS dari aplikasi dompet digital manapun.' },
            { n: '04', icon: '🔑', t: 'Terima OTP', d: 'Kode OTP muncul otomatis di halaman ini dalam hitungan detik.' },
          ].map((s) => (
            <div key={s.n} className="step-card">
              <div className="step-num">{s.n}</div>
              <div className="step-icon">{s.icon}</div>
              <div className="step-title">{s.t}</div>
              <p className="step-desc">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title">✨ Keunggulan Kami</div>
        <p className="section-subtitle">Kenapa ribuan pengguna memilih NOKOTEL</p>
        <div className="features-grid">
          {[
            { icon: '⚡', t: 'OTP Instan', d: 'Kode OTP masuk dalam 5–30 detik, bukan menit. Sistem polling otomatis.' },
            { icon: '🛡', t: 'Nomor Fresh', d: 'Semua nomor telah diverifikasi aktif sebelum ditawarkan ke sistem kami.' },
            { icon: '💰', t: 'Harga Transparan', d: 'Harga yang tampil adalah harga final. Tidak ada biaya tersembunyi.' },
            { icon: '🌍', t: '200+ Negara', d: 'Tersedia nomor dari ratusan negara untuk semua platform populer.' },
            { icon: '🔄', t: 'Auto Refund', d: 'Jika OTP tidak masuk dalam 15 menit, hubungi admin untuk pengembalian dana.' },
            { icon: '📱', t: 'QRIS Otomatis', d: 'Pembayaran terdeteksi langsung. Tidak perlu konfirmasi manual ke admin.' },
          ].map((f) => (
            <div key={f.t} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <div>
                <div className="feature-title">{f.t}</div>
                <p className="feature-desc">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="catalog" className="section">
        <div className="catalog-header">
          <div>
            <div className="section-title">📋 Katalog Layanan</div>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              {filteredSvc.length} layanan tersedia · Halaman {svcPage}/{totalSvcPage || 1}
            </p>
          </div>
          <div className="search-box">
            <span style={{ color: 'var(--text-muted)' }}>🔍</span>
            <input
              value={svcSearch}
              onChange={(e) => { setSvcSearch(e.target.value); setSvcPage(1); }}
              placeholder="Cari layanan..."
            />
            {svcSearch && (
              <button
                onClick={() => { setSvcSearch(''); setSvcPage(1); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
              >×</button>
            )}
          </div>
        </div>

        {services.length === 0 ? (
          <div className="services-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 120 }} />
            ))}
          </div>
        ) : filteredSvc.length === 0 ? (
          <div className="alert alert-warn">Tidak ada layanan yang cocok dengan pencarian "{svcSearch}"</div>
        ) : (
          <>
            <div className="services-grid">
              {pagedSvc.map((svc) => (
                <div key={svc.id || svc.code} className="service-card" onClick={() => handlePickService(svc)}>
                  <div className="service-card-icon">{getServiceIcon(svc.name)}</div>
                  <div className="service-card-name">{svc.name}</div>
                  <div className="service-card-arrow">Pilih Negara →</div>
                </div>
              ))}
            </div>

            {totalSvcPage > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={svcPage === 1}
                  onClick={() => setSvcPage((p) => p - 1)}
                >‹</button>
                {Array.from({ length: Math.min(5, totalSvcPage) }).map((_, i) => {
                  let p = i + 1;
                  if (totalSvcPage > 5) {
                    const start = Math.max(1, Math.min(svcPage - 2, totalSvcPage - 4));
                    p = start + i;
                  }
                  return (
                    <button
                      key={p}
                      className={`page-btn ${svcPage === p ? 'active' : ''}`}
                      onClick={() => setSvcPage(p)}
                    >{p}</button>
                  );
                })}
                <button
                  className="page-btn"
                  disabled={svcPage === totalSvcPage}
                  onClick={() => setSvcPage((p) => p + 1)}
                >›</button>
              </div>
            )}
          </>
        )}
      </section>

      <footer className="footer">
        <div className="footer-links">
          <a className="footer-link" href="#cara">Cara Kerja</a>
          <a className="footer-link" href="#catalog">Katalog</a>
          {process.env.NEXT_PUBLIC_BOT_URL && (
            <a className="footer-link" href={process.env.NEXT_PUBLIC_BOT_URL} target="_blank" rel="noopener noreferrer">
              Bot Telegram
            </a>
          )}
        </div>
        <p className="footer-copy">© {new Date().getFullYear()} NOKOTEL. Layanan Virtual Number OTP.</p>
      </footer>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) resetAll(); }}>
          <div className="modal-box">

            {step === STEP.PICK_COUNTRY && (
              <>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">🌍 Pilih Negara</div>
                    <div className="modal-subtitle">Layanan: {selService?.name}</div>
                  </div>
                  <button className="modal-close" onClick={resetAll}>×</button>
                </div>
                <div className="modal-body">
                  <div className="modal-search">
                    <span style={{ color: 'var(--text-muted)' }}>🔍</span>
                    <input
                      value={ctySearch}
                      onChange={(e) => setCtySearch(e.target.value)}
                      placeholder="Cari negara..."
                      autoFocus
                    />
                  </div>
                  {loading ? (
                    <div className="list-grid">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 56 }} />
                      ))}
                    </div>
                  ) : filteredCty.length === 0 ? (
                    <div className="alert alert-warn">Tidak ada negara tersedia.</div>
                  ) : (
                    <div className="list-grid" style={{ maxHeight: 400, overflowY: 'auto' }}>
                      {filteredCty.map((c) => (
                        <div key={c.id} className="list-item" onClick={() => handlePickCountry(c)}>
                          <span className="list-item-flag">{c.emoji || getFlag(c.name)}</span>
                          <div className="list-item-info">
                            <div className="list-item-name">{c.name}</div>
                          </div>
                          <span className="list-item-arrow">›</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {step === STEP.PICK_PRODUCT && (
              <>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">💰 Pilih Harga</div>
                    <div className="modal-subtitle">
                      {selService?.name} · {getFlag(selCountry?.name)} {selCountry?.name}
                    </div>
                  </div>
                  <button className="modal-close" onClick={resetAll}>×</button>
                </div>
                <div className="modal-body">
                  <button
                    className="btn-ghost"
                    style={{ marginBottom: 14, fontSize: 13 }}
                    onClick={() => setStep(STEP.PICK_COUNTRY)}
                  >← Ganti Negara</button>

                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 60 }} />
                      ))}
                    </div>
                  ) : products.length === 0 ? (
                    <div className="alert alert-warn">
                      Stok habis untuk negara ini. Coba negara lain.
                    </div>
                  ) : (
                    <div className="product-list">
                      {products.map((p) => (
                        <div
                          key={p.id}
                          className={`product-item ${selProduct?.id === p.id ? 'selected' : ''}`}
                          onClick={() => handlePickProduct(p)}
                        >
                          <div>
                            <div className="product-price">{fmt(p.price)}</div>
                            <div className="product-stock">
                              {p.available > 10 ? (
                                <span className="badge-stock-ok">✓ Stok {p.available}</span>
                              ) : (
                                <span className="badge-stock-low">⚠ Stok {p.available} (terbatas)</span>
                              )}
                            </div>
                          </div>
                          <span style={{ color: 'var(--accent2)', fontSize: 20 }}>→</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {step === STEP.DEPOSIT && (
              <>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">💳 Bayar via QRIS</div>
                    <div className="modal-subtitle">
                      {selService?.name} · {getFlag(selCountry?.name)} {selCountry?.name}
                    </div>
                  </div>
                  <button className="modal-close" onClick={resetAll}>×</button>
                </div>
                <div className="modal-body">
                  <div className="order-summary">
                    <div className="order-row">
                      <span className="order-row-label">Layanan</span>
                      <span className="order-row-val">{selService?.name}</span>
                    </div>
                    <div className="order-row">
                      <span className="order-row-label">Negara</span>
                      <span className="order-row-val">{getFlag(selCountry?.name)} {selCountry?.name}</span>
                    </div>
                    <div className="order-row order-row-total">
                      <span className="order-row-label">Total Bayar</span>
                      <span className="order-row-val">{fmt(selProduct?.price)}</span>
                    </div>
                  </div>

                  <div className="alert alert-info">
                    ℹ️ Nominal deposit minimal harus <b>{fmt(selProduct?.price)}</b>. Lebihkan boleh.
                  </div>

                  {errMsg && <div className="alert alert-err">❌ {errMsg}</div>}

                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>
                    Nominal Deposit (Rp)
                  </label>
                  <div className="search-box" style={{ marginBottom: 16, width: '100%' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Rp</span>
                    <input
                      type="number"
                      value={depositAmt}
                      onChange={(e) => setDepositAmt(e.target.value)}
                      placeholder={String(selProduct?.price)}
                      min={selProduct?.price}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {[selProduct?.price, 5000, 10000, 20000, 50000].filter(Boolean).map((v) => (
                      <button
                        key={v}
                        className="btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 13 }}
                        onClick={() => setDepositAmt(String(v))}
                      >{fmt(v)}</button>
                    ))}
                  </div>

                  <button
                    className="btn-primary btn-full btn-lg"
                    onClick={handleCreateDeposit}
                    disabled={loading}
                  >
                    {loading ? '⏳ Membuat Tagihan...' : '🔵 Buat QRIS & Bayar'}
                  </button>
                </div>
              </>
            )}

            {step === STEP.PAYING && depositInfo && (
              <>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">📲 Scan QRIS</div>
                    <div className="modal-subtitle">Bayar dengan GoPay, OVO, Dana, atau m-Banking</div>
                  </div>
                  <button className="modal-close" onClick={resetAll}>×</button>
                </div>
                <div className="modal-body" style={{ textAlign: 'center' }}>
                  <div className="qr-info">
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Bayar</div>
                      <div className="qr-amount">{fmt(depositInfo.totalBayar)}</div>
                    </div>
                    <div className="countdown">
                      ⏱ {depositLeft > 0 ? depositCountdown : 'EXPIRED'}
                    </div>
                  </div>

                  <div className="qr-wrap">
                    <img src={depositInfo.qrImage} alt="QRIS" />
                  </div>

                  <div className="alert alert-warn" style={{ textAlign: 'left' }}>
                    ⚠️ Jangan tutup halaman ini. Pembayaran terdeteksi otomatis.
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, justifyContent: 'center' }}>
                    <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                    Menunggu konfirmasi pembayaran...
                  </div>
                </div>
              </>
            )}

            {step === STEP.PAID && (
              <>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">✅ Pembayaran Diterima!</div>
                    <div className="modal-subtitle">Saldo terkonfirmasi. Lanjutkan order nomor.</div>
                  </div>
                  <button className="modal-close" onClick={resetAll}>×</button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-ok">
                    ✅ Pembayaran <b>{fmt(depositInfo?.amount)}</b> berhasil dikonfirmasi!
                  </div>
                  <div className="order-summary">
                    <div className="order-row">
                      <span className="order-row-label">Layanan</span>
                      <span className="order-row-val">{selService?.name}</span>
                    </div>
                    <div className="order-row">
                      <span className="order-row-label">Negara</span>
                      <span className="order-row-val">{getFlag(selCountry?.name)} {selCountry?.name}</span>
                    </div>
                    <div className="order-row order-row-total">
                      <span className="order-row-label">Harga</span>
                      <span className="order-row-val">{fmt(selProduct?.price)}</span>
                    </div>
                  </div>
                  {errMsg && <div className="alert alert-err">❌ {errMsg}</div>}
                  <button
                    className="btn-primary btn-full btn-lg"
                    onClick={handleCreateOrder}
                    disabled={loading}
                  >
                    {loading ? '⏳ Memproses...' : '🚀 Ambil Nomor OTP Sekarang'}
                  </button>
                </div>
              </>
            )}

            {step === STEP.ORDERING && (
              <>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">⚙️ Membuat Order</div>
                    <div className="modal-subtitle">Mengalokasikan nomor untuk Anda...</div>
                  </div>
                </div>
                <div className="modal-body">
                  <div className="waiting-anim">
                    <div className="spinner" />
                    <div className="waiting-text">Sedang menghubungi server provider dan mengalokasikan nomor virtual...</div>
                  </div>
                </div>
              </>
            )}

            {step === STEP.WAITING_OTP && orderInfo && (
              <>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">⏳ Menunggu OTP</div>
                    <div className="modal-subtitle">Kode akan muncul otomatis</div>
                  </div>
                </div>
                <div className="modal-body">
                  <div className="order-summary" style={{ marginBottom: 16 }}>
                    <div className="order-row">
                      <span className="order-row-label">Order ID</span>
                      <span className="order-row-val" style={{ fontFamily: 'monospace', fontSize: 13 }}>#{orderInfo.id}</span>
                    </div>
                    <div className="order-row">
                      <span className="order-row-label">Nomor</span>
                      <span className="order-row-val" style={{ fontFamily: 'monospace' }}>{orderInfo.phone_number || '...'}</span>
                    </div>
                    <div className="order-row">
                      <span className="order-row-label">Layanan</span>
                      <span className="order-row-val">{selService?.name}</span>
                    </div>
                  </div>

                  <div className="waiting-anim">
                    <div className="spinner" />
                    <div className="waiting-text">
                      Masukkan nomor di atas ke <b>{selService?.name}</b> dan minta kirim kode OTP.<br />
                      Kode akan muncul di sini secara otomatis (maks 15 menit).
                    </div>
                  </div>

                  <div className="alert alert-warn" style={{ marginTop: 16 }}>
                    ⚠️ Batalkan hanya setelah 3 menit 20 detik jika OTP tidak masuk.
                  </div>

                  <button
                    className="btn-danger btn-full"
                    style={{ marginTop: 10 }}
                    onClick={handleCancelOrder}
                  >
                    ❌ Batalkan Pesanan
                  </button>
                </div>
              </>
            )}

            {step === STEP.OTP_SUCCESS && (
              <>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">🎉 OTP Berhasil!</div>
                    <div className="modal-subtitle">Masukkan kode ini ke {selService?.name}</div>
                  </div>
                  <button className="modal-close" onClick={resetAll}>×</button>
                </div>
                <div className="modal-body">
                  <div className="otp-box">
                    <div className="otp-label">Kode OTP Anda</div>
                    <div className="otp-code">{otpCode}</div>
                    {otpPhone && <div className="otp-phone">📞 {otpPhone}</div>}
                  </div>

                  <div className="alert alert-ok">
                    ✅ Salin kode di atas dan masukkan ke {selService?.name} segera!
                  </div>

                  <div className="alert alert-info">
                    ℹ️ Kode OTP biasanya berlaku 2–5 menit. Masukkan segera sebelum kedaluwarsa.
                  </div>

                  <div className="btn-row">
                    <button
                      className="btn-primary"
                      onClick={() => { navigator.clipboard?.writeText(otpCode); }}
                    >📋 Salin Kode</button>
                    <button className="btn-ghost" onClick={resetAll}>✕ Tutup</button>
                  </div>
                </div>
              </>
            )}

            {step === STEP.ERROR && (
              <>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">❌ Terjadi Masalah</div>
                  </div>
                  <button className="modal-close" onClick={resetAll}>×</button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-err">{errMsg || 'Terjadi kesalahan tidak diketahui.'}</div>
                  <div className="alert alert-info">
                    💬 Untuk refund atau bantuan, hubungi admin via Telegram.
                  </div>
                  <div className="btn-row">
                    <button className="btn-primary" onClick={resetAll}>↩ Coba Lagi</button>
                    {process.env.NEXT_PUBLIC_BOT_URL && (
                      <a
                        href={process.env.NEXT_PUBLIC_BOT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                      >
                        📞 Admin
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}

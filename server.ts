import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Card {
  card_id: string;
  business_name: string | null;
  gmaps_url: string | null;
  is_active: boolean;
  scan_count: number;
  created_at: string;
  updated_at: string;
}

const DB_FILE = path.join(__dirname, 'cards_db.json');

function loadCards(): Map<string, Card> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const arr: Card[] = JSON.parse(data);
      return new Map(arr.map(c => [c.card_id, c]));
    }
  } catch (e) {
    console.error('Error loading DB:', e);
  }

  const defaultCards = new Map<string, Card>();
  const samples = [
    { id: 'CARD-001', name: 'Kopi Kenangan Senja', url: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4&review=5', active: true, scans: 42 },
    { id: 'CARD-002', name: 'Bengkel Motor Mas Suroto', url: 'https://search.google.com/local/writereview?placeid=ChIJ2V-Dz3euEmsR82k1n_z3aXY&review=5', active: true, scans: 19 },
    { id: 'CARD-003', name: 'Salon Kecantikan Cantika', url: 'https://search.google.com/local/writereview?placeid=ChIJoQ3_zDeuEmsR1234567890a&review=5', active: true, scans: 8 },
    { id: 'CARD-004', name: null, url: null, active: false, scans: 0 },
    { id: 'CARD-005', name: null, url: null, active: false, scans: 0 },
  ];

  const now = new Date().toISOString();
  samples.forEach(s => {
    defaultCards.set(s.id, {
      card_id: s.id,
      business_name: s.name,
      gmaps_url: s.url,
      is_active: s.active,
      scan_count: s.scans,
      created_at: now,
      updated_at: now,
    });
  });

  saveCards(defaultCards);
  return defaultCards;
}

function saveCards(cardsMap: Map<string, Card>) {
  try {
    const arr = Array.from(cardsMap.values());
    fs.writeFileSync(DB_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving DB:', e);
  }
}

const cardsDB = loadCards();

const app = express();
app.use(express.json());

// Helper function implementing robust URL extraction with regex for maps.app.goo.gl and Place ID extraction
async function resolveGoogleMapsUrl(inputUrl: string, businessName: string): Promise<string> {
  let targetUrl = inputUrl.trim();

  // If input is a raw Place ID starting with ChIJ
  if (targetUrl.startsWith('ChIJ') && !targetUrl.includes('http')) {
    return `https://search.google.com/local/writereview?placeid=${targetUrl}&review=5`;
  }

  // If input is already a writereview URL
  if (targetUrl.includes('writereview?')) {
    if (!targetUrl.includes('review=5')) {
      targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'review=5';
    }
    return targetUrl;
  }

  // Regex to identify Google Maps short links (maps.app.goo.gl or goo.gl/maps)
  const mapsShortLinkRegex = /https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\/[^\s]+/i;
  const isShortLink = mapsShortLinkRegex.test(targetUrl);
  
  let resolvedUrl = targetUrl;
  if (isShortLink) {
    try {
      const response = await fetch(targetUrl, { 
        redirect: 'follow', 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
      });
      resolvedUrl = response.url;
    } catch (err) {
      console.error('Error following maps redirect:', err);
    }
  }

  // Regex to extract Google Place ID (ChI... pattern) or placeid parameter from resolved URL
  const placeIdMatch = resolvedUrl.match(/placeid=([^&]+)/i) || resolvedUrl.match(/ChI[a-zA-Z0-9_-]{20,}/);
  if (placeIdMatch) {
    const pId = placeIdMatch[1] || placeIdMatch[0];
    return `https://search.google.com/local/writereview?placeid=${pId}&review=5`;
  }

  // Fallback query writereview format if Place ID cannot be extracted
  const query = encodeURIComponent(`${businessName} ${resolvedUrl}`);
  return `https://search.google.com/local/writereview?q=${query}&review=5`;
}

// API Routes
app.get('/api/cards', (req, res) => {
  const cards = Array.from(cardsDB.values()).sort((a, b) => a.card_id.localeCompare(b.card_id));
  res.json({
    total: cards.length,
    active: cards.filter(c => c.is_active).length,
    unclaimed: cards.filter(c => !c.is_active).length,
    total_scans: cards.reduce((sum, c) => sum + c.scan_count, 0),
    cards,
  });
});

app.post('/api/cards/batch', (req, res) => {
  const { prefix = 'CARD', start = 1, count = 10 } = req.body;
  const now = new Date().toISOString();
  const created: Card[] = [];

  for (let i = 0; i < Number(count); i++) {
    const num = Number(start) + i;
    const paddedNum = String(num).padStart(3, '0');
    const cardId = `${prefix.toUpperCase()}-${paddedNum}`;

    if (!cardsDB.has(cardId)) {
      const newCard: Card = {
        card_id: cardId,
        business_name: null,
        gmaps_url: null,
        is_active: false,
        scan_count: 0,
        created_at: now,
        updated_at: now,
      };
      cardsDB.set(cardId, newCard);
      created.push(newCard);
    }
  }

  saveCards(cardsDB);
  res.json({ success: true, count: created.length, created });
});

app.get('/api/cards/:cardId', (req, res) => {
  const { cardId } = req.params;
  const card = cardsDB.get(cardId);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  res.json(card);
});

// Helper endpoint for resolving maps url / previewing generated writereview link
app.post('/api/resolve-maps', async (req, res) => {
  const { url, business_name = '' } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL wajib diisi' });
  }
  try {
    const reviewUrl = await resolveGoogleMapsUrl(url, business_name);
    res.json({ success: true, review_url: reviewUrl });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal resolve URL: ' + err.message });
  }
});

app.post('/api/cards/:cardId/setup', async (req, res) => {
  const { cardId } = req.params;
  const { business_name, gmaps_url } = req.body;

  const card = cardsDB.get(cardId);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  if (!business_name || !gmaps_url) {
    return res.status(400).json({ error: 'Nama bisnis dan Link Google Maps wajib diisi.' });
  }

  try {
    const formattedUrl = await resolveGoogleMapsUrl(gmaps_url, business_name);

    card.business_name = business_name.trim();
    card.gmaps_url = formattedUrl;
    card.is_active = true;
    card.updated_at = new Date().toISOString();

    cardsDB.set(cardId, card);
    saveCards(cardsDB);

    res.json({ success: true, card });
  } catch (err: any) {
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Gagal memproses URL Google Maps: ' + err.message });
  }
});

app.post('/api/cards/:cardId/reset', (req, res) => {
  const { cardId } = req.params;
  const card = cardsDB.get(cardId);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  card.business_name = null;
  card.gmaps_url = null;
  card.is_active = false;
  card.updated_at = new Date().toISOString();

  cardsDB.set(cardId, card);
  saveCards(cardsDB);

  res.json({ success: true, card });
});

app.delete('/api/cards/:cardId', (req, res) => {
  const { cardId } = req.params;
  if (!cardsDB.has(cardId)) {
    return res.status(404).json({ error: 'Card not found' });
  }
  cardsDB.delete(cardId);
  saveCards(cardsDB);
  res.json({ success: true });
});

app.get('/r/:cardId', (req, res) => {
  const { cardId } = req.params;
  const card = cardsDB.get(cardId);

  if (!card) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kartu Tidak Ditemukan - TapUlasan</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4">
        <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-slate-100">
          <div class="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
          <h1 class="text-xl font-bold text-slate-900 mb-2">Kartu Tidak Ditemukan</h1>
          <p class="text-slate-600 text-sm mb-6">Kode kartu <strong>${cardId}</strong> tidak terdaftar di dalam sistem TapUlasan.</p>
          <a href="/" class="inline-block bg-slate-900 text-white font-medium px-6 py-2.5 rounded-xl text-sm hover:bg-slate-800 transition">Kembali ke Beranda</a>
        </div>
      </body>
      </html>
    `);
  }

  if (!card.is_active || !card.gmaps_url) {
    return res.redirect(`/setup/${cardId}`);
  }

  card.scan_count += 1;
  card.updated_at = new Date().toISOString();
  cardsDB.set(cardId, card);
  saveCards(cardsDB);

  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ulasan Google Maps — ${card.business_name || 'TapUlasan'}</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-900 text-white flex items-center justify-center min-h-screen p-4 font-sans">
      <div class="bg-slate-800 rounded-3xl p-8 max-w-md w-full text-center border border-slate-700 shadow-2xl">
        <div class="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl font-bold shadow-inner">⭐</div>
        <h1 class="text-2xl font-extrabold mb-2">${card.business_name}</h1>
        <p class="text-slate-300 text-sm mb-6">Tekan tombol di bawah untuk memberikan ulasan bintang 5 di Google Maps.</p>
        <a href="${card.gmaps_url}" target="_blank" rel="noopener noreferrer" class="block w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-4 px-6 rounded-2xl transition text-base shadow-xl shadow-amber-500/20 mb-4">
          Buka Ulasan Google Maps (Bintang 5) ⭐
        </a>
        <p class="text-[11px] text-slate-400">
          Pastikan Anda sudah login ke akun Google di browser HP Anda untuk memberikan ulasan.
        </p>
      </div>
    </body>
    </html>
  `);
});

if (process.env.NODE_ENV !== 'production') {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then(vite => {
    app.use(vite.middlewares);
    const PORT = process.env.PORT || 3000;
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`TapUlasan dev server running on http://0.0.0.0:${PORT}`);
    });
  });
}

export default app;

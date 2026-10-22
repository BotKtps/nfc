/**
 * cardDesign.tsx
 * ---------------------------------------------------------------------------
 * Satu sumber desain untuk:
 *  - Preview di layar (HTML/CSS)
 *  - Download PNG resolusi tinggi (Canvas 300 DPI)
 *  - Cetak langsung (window.print / print sheet)
 *  - Mass print (banyak kartu sekaligus)
 *
 * Desain mengikuti lampiran pengguna:
 *  - Frame 4 warna Google (kiri kuning, atas merah, kanan biru, bawah hijau)
 *  - Logo "G" Google di tengah atas
 *  - Judul bilingual + 5 bintang emas
 *  - Dua metode: TAP NFC | - Atau - | Scan QR
 *  - Footer gelombang hijau-biru + ucapan terima kasih bilingual
 * ---------------------------------------------------------------------------
 */
import React from 'react';
import QRCode from 'qrcode';

export type CardFormat = 'square' | 'cr80';

export interface CardLike {
  card_id: string;
  business_name?: string | null;
  gmaps_url?: string | null;
}

export interface CardDesignOptions {
  format?: CardFormat;
  businessName?: string | null;
  serial?: string;
  showBusinessName?: boolean;
  showSerial?: boolean;
  headerId?: string;
  headerEn?: string;
  tapTitle?: string;
  tapSub?: string;
  qrTitle?: string;
  qrSub?: string;
  thanksId?: string;
  thanksEn?: string;
  qrDataUrl?: string;
}

export const DEFAULT_DESIGN = {
  format: 'square' as CardFormat,
  showBusinessName: false,
  showSerial: false,
  headerId: 'Bantu kami dengan ulasan di Google',
  headerEn: 'Help us with a review on Google',
  tapTitle: 'TAP NFC',
  tapSub: 'Tempelkan hp anda',
  qrTitle: 'Scan QR',
  qrSub: 'Pindai kode QR',
  thanksId: 'Terima kasih atas dukungan anda :)',
  thanksEn: 'Thank you for your support :)',
};

const GOOGLE_BLUE = '#4285F4';
const GOOGLE_RED = '#DB4437';
const GOOGLE_YELLOW = '#F4B400';
const GOOGLE_GREEN = '#0F9D58';
const INK = '#202124';
const MUTED = '#5F6368';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${bl})`;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/** Frame 4 warna Google dengan transisi halus di sudut (conic gradient). */
function drawGoogleFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  thickness: number
) {
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, radius);
  roundRectPath(ctx, x + thickness, y + thickness, w - thickness * 2, h - thickness * 2, Math.max(radius - thickness, 0));
  ctx.clip('evenodd');

  const cx = x + w / 2;
  const cy = y + h / 2;
  const R = Math.hypot(w, h);
  const stops: Array<[number, string]> = [
    [0, GOOGLE_RED],
    [90, GOOGLE_BLUE],
    [180, GOOGLE_GREEN],
    [270, GOOGLE_YELLOW],
    [360, GOOGLE_RED],
  ];

  const step = 0.6;
  for (let angle = 0; angle < 360; angle += step) {
    const next = Math.min(angle + step + 0.35, 360);
    let i = 0;
    while (i < stops.length - 1 && angle >= stops[i + 1][0]) i++;
    const [a0, c0] = stops[i];
    const [a1, c1] = stops[Math.min(i + 1, stops.length - 1)];
    const t = a1 === a0 ? 0 : (angle - a0) / (a1 - a0);
    const color = mix(c0, c1, Math.min(1, Math.max(0, t)));

    const rad0 = ((angle - 90) * Math.PI) / 180;
    const rad1 = ((next - 90) * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, rad0, rad1);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
}

function drawGoogleG(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(s, s);
  const paths: Array<[string, string]> = [
    ['#4285F4', 'M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z'],
    ['#34A853', 'M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z'],
    ['#FBBC05', 'M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z'],
    ['#EA4335', 'M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z'],
  ];
  for (const [fill, d] of paths) {
    const p = new Path2D(d);
    ctx.fillStyle = fill;
    ctx.fill(p);
  }
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number) {
  const inner = outer * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawStars(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const gap = size * 0.18;
  const total = size * 5 + gap * 4;
  let x = cx - total / 2 + size / 2;
  ctx.fillStyle = '#FBBC05';
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, x, cy, size / 2);
    x += size + gap;
  }
}

function nfcSvgMarkup(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" fill="none">
    <g transform="translate(14, 8)">
      <g transform="rotate(-10 32 45)">
        <rect x="12" y="10" width="38" height="66" rx="6" stroke="#202124" stroke-width="3" fill="#ffffff" />
        <line x1="20" y1="16" x2="42" y2="16" stroke="#202124" stroke-width="2.2" stroke-linecap="round" />
        <line x1="26" y1="70" x2="36" y2="70" stroke="#202124" stroke-width="2.2" stroke-linecap="round" />
        <path d="M 46 22 A 12 12 0 0 1 54 34" stroke="#202124" stroke-width="3" stroke-linecap="round" />
        <path d="M 50 16 A 20 20 0 0 1 62 34" stroke="#202124" stroke-width="3" stroke-linecap="round" />
        <path d="M 54 10 A 28 28 0 0 1 70 34" stroke="#202124" stroke-width="3" stroke-linecap="round" />
      </g>
      <path d="M 2 44 C 8 36, 17 38, 20 44" stroke="#202124" stroke-width="3" stroke-linecap="round" />
      <path d="M 2 54 C 8 46, 17 48, 20 54" stroke="#202124" stroke-width="3" stroke-linecap="round" />
      <path d="M 4 64 C 10 56, 18 58, 21 64" stroke="#202124" stroke-width="3" stroke-linecap="round" />
      <path d="M 54 58 C 58 56, 64 62, 58 68 C 53 73, 46 72, 46 72" stroke="#202124" stroke-width="3" stroke-linecap="round" />
      <path d="M 4 65 C 8 76, 20 84, 40 84 C 52 84, 58 76, 58 68" stroke="#202124" stroke-width="3" stroke-linecap="round" />
      <path d="M 4 65 L 0 80" stroke="#202124" stroke-width="3" stroke-linecap="round" />
      <path d="M 26 84 L 20 95" stroke="#202124" stroke-width="3" stroke-linecap="round" />
    </g>
  </svg>`;
}

async function svgToImage(svg: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('SVG load failed'));
  });
  return img;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image load failed'));
  });
  return img;
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  weight = '700',
  family = '"Plus Jakarta Sans", Arial, sans-serif',
  minSize = 14
) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  } while (size > minSize);
  return size;
}

/** Pastikan font sudah ter-load sebelum menggambar di canvas. */
async function ensureFonts() {
  try {
    if (document.fonts) {
      await Promise.all([
        document.fonts.load('800 60px "Plus Jakarta Sans"'),
        document.fonts.load('700 40px "Plus Jakarta Sans"'),
        document.fonts.load('500 30px "Plus Jakarta Sans"'),
        document.fonts.load('400 30px "Plus Jakarta Sans"'),
      ]);
      await document.fonts.ready;
    }
  } catch {
    /* font fallback aman */
  }
}

/* -------------------------------------------------------------------------- */
/*  QR helper                                                                  */
/* -------------------------------------------------------------------------- */

export function getCardTargetUrl(card: CardLike): string {
  if (card.gmaps_url && card.gmaps_url.trim()) return card.gmaps_url.trim();
  if (typeof window !== 'undefined') return `${window.location.origin}/r/${card.card_id}`;
  return `https://example.com/r/${card.card_id}`;
}

export async function makeQrDataUrl(card: CardLike, width = 720): Promise<string> {
  return QRCode.toDataURL(getCardTargetUrl(card), {
    width,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
}

/* -------------------------------------------------------------------------- */
/*  Canvas renderer (300 DPI)                                                  */
/* -------------------------------------------------------------------------- */

export const CARD_SIZES: Record<CardFormat, { width: number; height: number; widthMm: number; label: string; mm: string }> = {
  // 1500x1500 px @300dpi = 127 x 127 mm (persegi, sesuai lampiran)
  square: { width: 1500, height: 1500, widthMm: 127, label: 'Standee Persegi (sesuai lampiran)', mm: '127 x 127 mm' },
  // CR80: 85.6 x 54 mm @300dpi
  cr80: { width: 1011, height: 638, widthMm: 85.6, label: 'Kartu Kasir CR80', mm: '85,6 x 54 mm' },
};

export async function renderCardCanvas(
  card: CardLike,
  options: CardDesignOptions = {}
): Promise<HTMLCanvasElement> {
  await ensureFonts();

  const opts = {
    ...DEFAULT_DESIGN,
    serial: card.card_id,
    ...options,
    businessName: options.businessName || card.business_name || '',
  } as typeof DEFAULT_DESIGN & { businessName: string; serial: string; qrDataUrl?: string };
  const format: CardFormat = opts.format || 'square';
  const qr = opts.qrDataUrl || (await makeQrDataUrl(card));

  const canvas = document.createElement('canvas');
  const size = CARD_SIZES[format];
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (format === 'cr80') {
    await drawCr80(ctx, canvas, opts, qr);
  } else {
    await drawSquare(ctx, canvas, opts, qr);
  }
  return canvas;
}

async function drawSquare(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  opts: typeof DEFAULT_DESIGN & { businessName: string; serial: string; qrDataUrl?: string },
  qr: string
) {
  const W = canvas.width;
  const H = canvas.height;
  const border = Math.round(W * 0.072);
  const radius = Math.round(W * 0.05);
  const innerRadius = radius - Math.round(border * 0.45);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  drawGoogleFrame(ctx, 0, 0, W, H, radius, border);

  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, border, border, W - border * 2, H - border * 2, innerRadius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();

  const innerX = border;
  const innerY = border;
  const innerW = W - border * 2;
  const innerH = H - border * 2;
  const cx = W / 2;

  // Logo G
  drawGoogleG(ctx, cx, innerY + innerH * 0.075, W * 0.14);

  // Judul
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  const s1 = fitFont(ctx, opts.headerId, innerW * 0.86, W * 0.042, '800');
  ctx.font = `800 ${s1}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.headerId, cx, innerY + innerH * 0.19);

  ctx.fillStyle = MUTED;
  const s2 = fitFont(ctx, opts.headerEn, innerW * 0.86, W * 0.028, '500');
  ctx.font = `500 ${s2}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.headerEn, cx, innerY + innerH * 0.238);

  // Bintang
  drawStars(ctx, cx, innerY + innerH * 0.435, W * 0.052);

  // Nama bisnis (opsional)
  if (opts.showBusinessName && opts.businessName) {
    ctx.fillStyle = '#9AA0A6';
    const name = opts.businessName.toUpperCase();
    const s3 = fitFont(ctx, name, innerW * 0.8, W * 0.022, '700');
    ctx.font = `700 ${s3}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.fillText(name, cx, innerY + innerH * 0.49);
  }

  const topY = innerY + innerH * 0.418;
  const bottomY = innerY + innerH * 0.699;

  // Divider vertikal + label "- Atau -"
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = Math.max(2, W * 0.0022);
  ctx.setLineDash([W * 0.009, W * 0.009]);
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx, bottomY);
  ctx.stroke();
  ctx.setLineDash([]);

  const orY = (topY + bottomY) / 2;
  const orText = '- Atau -';
  ctx.font = `700 ${W * 0.024}px "Plus Jakarta Sans", Arial, sans-serif`;
  const orW = ctx.measureText(orText).width + W * 0.03;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - orW / 2, orY - W * 0.022, orW, W * 0.044);
  ctx.fillStyle = MUTED;
  ctx.fillText(orText, cx, orY);

  // Kolom kiri: NFC
  const leftX = innerX + innerW * 0.26;
  const rightX = innerX + innerW * 0.74;
  const iconCy = innerY + innerH * 0.558;
  const nfcImg = await svgToImage(nfcSvgMarkup(512));
  const nfcSize = W * 0.16;
  ctx.drawImage(nfcImg, leftX - nfcSize / 2, iconCy - nfcSize / 2, nfcSize, nfcSize);

  // Kolom kanan: QR asli
  const qrBox = W * 0.185;
  const qrPad = W * 0.012;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = Math.max(2, W * 0.0022);
  ctx.beginPath();
  roundRectPath(ctx, rightX - qrBox / 2, iconCy - qrBox / 2, qrBox, qrBox, W * 0.012);
  ctx.fill();
  ctx.stroke();
  const qrImg = await loadImage(qr);
  ctx.drawImage(qrImg, rightX - qrBox / 2 + qrPad, iconCy - qrBox / 2 + qrPad, qrBox - qrPad * 2, qrBox - qrPad * 2);
  ctx.restore();

  // Judul metode
  ctx.fillStyle = INK;
  const methodTitleY = innerY + innerH * 0.695;
  const mt = fitFont(ctx, opts.tapTitle, innerW * 0.34, W * 0.032, '800');
  ctx.font = `800 ${mt}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.tapTitle, leftX, methodTitleY);
  ctx.fillText(opts.qrTitle, rightX, methodTitleY);

  // Sub judul metode
  ctx.fillStyle = MUTED;
  const subY = innerY + innerH * 0.735;
  let ms = fitFont(ctx, opts.tapSub, innerW * 0.34, W * 0.022, '500');
  ctx.font = `500 ${ms}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.tapSub, leftX, subY);
  ms = fitFont(ctx, opts.qrSub, innerW * 0.34, W * 0.022, '500');
  ctx.font = `500 ${ms}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.qrSub, rightX, subY);

  // Garis horizontal pemisah
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = Math.max(2, W * 0.0022);
  ctx.beginPath();
  ctx.moveTo(innerX + innerW * 0.12, innerY + innerH * 0.795);
  ctx.lineTo(innerX + innerW * 0.88, innerY + innerH * 0.795);
  ctx.stroke();

  // Ucapan terima kasih
  ctx.fillStyle = INK;
  const t1 = fitFont(ctx, opts.thanksId, innerW * 0.86, W * 0.03, '800');
  ctx.font = `800 ${t1}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.thanksId, cx, innerY + innerH * 0.855);

  ctx.fillStyle = MUTED;
  const t2 = fitFont(ctx, opts.thanksEn, innerW * 0.86, W * 0.022, '500');
  ctx.font = `500 ${t2}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.thanksEn, cx, innerY + innerH * 0.912);

  // Footer band gelombang hijau -> biru (menutup border bawah, sesuai lampiran)
  const bandCenter = H * 0.933;
  const bandEdge = H * 0.85;
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, GOOGLE_GREEN);
  grad.addColorStop(0.5, '#1AA260');
  grad.addColorStop(1, GOOGLE_BLUE);
  const paintBand = () => {
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, bandEdge);
    ctx.lineTo(W * 0.06, bandEdge);
    ctx.bezierCurveTo(W * 0.095, bandEdge, W * 0.105, bandCenter, W * 0.16, bandCenter);
    ctx.lineTo(W * 0.84, bandCenter);
    ctx.bezierCurveTo(W * 0.895, bandCenter, W * 0.905, bandEdge, W * 0.94, bandEdge);
    ctx.lineTo(W, bandEdge);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
  };

  // Bagian band yang berada di area putih (sudut kiri/kanan)
  paintBand();
  ctx.restore();

  // Bagian band yang menutup border bawah
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, 0, 0, W, H, radius);
  ctx.clip();
  paintBand();

  // Serial di dalam band (opsional)
  if (opts.showSerial && opts.serial) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `700 ${W * 0.017}px "JetBrains Mono", monospace`;
    ctx.fillText(opts.serial, cx, H * 0.968);
  }

  ctx.restore();
}

async function drawCr80(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  opts: typeof DEFAULT_DESIGN & { businessName: string; serial: string; qrDataUrl?: string },
  qr: string
) {
  const W = canvas.width;
  const H = canvas.height;
  const border = Math.round(W * 0.045);
  const radius = Math.round(W * 0.035);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  drawGoogleFrame(ctx, 0, 0, W, H, radius, border);

  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, border, border, W - border * 2, H - border * 2, radius - border * 0.4);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();

  const padX = border + W * 0.045;
  const innerTop = border + H * 0.06;

  drawGoogleG(ctx, padX + W * 0.03, innerTop + H * 0.06, W * 0.055);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  const titleX = padX + W * 0.085;
  const s1 = fitFont(ctx, opts.headerId, W * 0.44, W * 0.028, '800');
  ctx.font = `800 ${s1}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.headerId, titleX, innerTop + H * 0.045);

  ctx.fillStyle = MUTED;
  const s2 = fitFont(ctx, opts.headerEn, W * 0.44, W * 0.02, '500');
  ctx.font = `500 ${s2}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.headerEn, titleX, innerTop + H * 0.115);

  drawStars(ctx, padX + W * 0.06, innerTop + H * 0.22, W * 0.03);

  const qrBox = H * 0.5;
  const qrX = W - padX - qrBox;
  const qrY = H * 0.22;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRectPath(ctx, qrX, qrY, qrBox, qrBox, W * 0.012);
  ctx.fill();
  ctx.stroke();
  const qrImg = await loadImage(qr);
  const qp = W * 0.008;
  ctx.drawImage(qrImg, qrX + qp, qrY + qp, qrBox - qp * 2, qrBox - qp * 2);
  ctx.restore();

  const nfcImg = await svgToImage(nfcSvgMarkup(256));
  const nfcSize = H * 0.2;
  ctx.drawImage(nfcImg, padX, H * 0.4, nfcSize, nfcSize);

  ctx.fillStyle = INK;
  ctx.font = `800 ${W * 0.022}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.tapTitle, padX + nfcSize + W * 0.02, H * 0.45);
  ctx.fillStyle = MUTED;
  ctx.font = `500 ${W * 0.017}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.tapSub, padX + nfcSize + W * 0.02, H * 0.52);

  ctx.fillStyle = INK;
  ctx.font = `800 ${W * 0.02}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.qrTitle, qrX, qrY + qrBox + H * 0.075);
  ctx.fillStyle = MUTED;
  ctx.font = `500 ${W * 0.016}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.qrSub, qrX, qrY + qrBox + H * 0.135);

  const bandTop = H * 0.82;
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, GOOGLE_GREEN);
  grad.addColorStop(1, GOOGLE_BLUE);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, bandTop + H * 0.08);
  ctx.bezierCurveTo(W * 0.3, bandTop - H * 0.06, W * 0.6, bandTop + H * 0.1, W, bandTop);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  const t1 = fitFont(ctx, opts.thanksId, W * 0.8, W * 0.02, '800');
  ctx.font = `800 ${t1}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.thanksId, W / 2, H * 0.905);
  ctx.font = `500 ${W * 0.015}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.thanksEn, W / 2, H * 0.95);

  if (opts.showSerial && opts.serial) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `700 ${W * 0.014}px "JetBrains Mono", monospace`;
    ctx.fillText(opts.serial, W - padX, H * 0.95);
  }
  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/*  Download helpers                                                           */
/* -------------------------------------------------------------------------- */

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

export function safeFileName(name: string): string {
  return (name || 'kartu').replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_');
}

export async function downloadCardPng(card: CardLike, options: CardDesignOptions = {}) {
  const canvas = await renderCardCanvas(card, options);
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TapUlasan_${safeFileName(card.business_name || card.card_id)}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* -------------------------------------------------------------------------- */
/*  Print helpers                                                              */
/* -------------------------------------------------------------------------- */

export function printImages(images: string[], perPage: number, title = 'Cetak Kartu TapUlasan', widthMm = 127) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    return;
  }

  const cardsHtml = images
    .map((src) => `<div class="card"><img src="${src}" alt="kartu" /></div>`)
    .join('');

  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-family: Arial, sans-serif; }
    .sheet { display: grid; grid-template-columns: repeat(${perPage === 1 ? 1 : 2}, 1fr); gap: 6mm; }
    .card { break-inside: avoid; page-break-inside: avoid; display: flex; justify-content: center; }
    .card img { width: ${widthMm}mm; max-width: 100%; height: auto; display: block; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body><div class="sheet">${cardsHtml}</div></body></html>`);
  doc.close();

  const win = iframe.contentWindow;
  const doPrint = () => {
    try {
      win?.focus();
      win?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 60000);
    }
  };

  const imgs = Array.from(doc.images);
  let remaining = imgs.length;
  if (remaining === 0) {
    setTimeout(doPrint, 300);
    return;
  }
  const done = () => {
    remaining -= 1;
    if (remaining <= 0) setTimeout(doPrint, 300);
  };
  imgs.forEach((img) => {
    if (img.complete) done();
    else {
      img.onload = done;
      img.onerror = done;
    }
  });
}

export function printSingleCard(card: CardLike, options: CardDesignOptions = {}) {
  return renderCardCanvas(card, options).then((canvas) => {
    printImages([canvas.toDataURL('image/png')], 1, `Kartu ${card.card_id}`);
  });
}

/* -------------------------------------------------------------------------- */
/*  Preview React Component                                                    */
/* -------------------------------------------------------------------------- */

interface PreviewProps {
  card: CardLike;
  options?: CardDesignOptions;
  qrDataUrl: string;
  className?: string;
  id?: string;
}

const NfcSvg: React.FC = () => (
  <svg viewBox="0 0 100 100" fill="none" className="nfc-svg">
    <g transform="translate(14, 8)">
      <g transform="rotate(-10 32 45)">
        <rect x="12" y="10" width="38" height="66" rx="6" stroke="#202124" strokeWidth="3" fill="#ffffff" />
        <line x1="20" y1="16" x2="42" y2="16" stroke="#202124" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="26" y1="70" x2="36" y2="70" stroke="#202124" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M 46 22 A 12 12 0 0 1 54 34" stroke="#202124" strokeWidth="3" strokeLinecap="round" />
        <path d="M 50 16 A 20 20 0 0 1 62 34" stroke="#202124" strokeWidth="3" strokeLinecap="round" />
        <path d="M 54 10 A 28 28 0 0 1 70 34" stroke="#202124" strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d="M 2 44 C 8 36, 17 38, 20 44" stroke="#202124" strokeWidth="3" strokeLinecap="round" />
      <path d="M 2 54 C 8 46, 17 48, 20 54" stroke="#202124" strokeWidth="3" strokeLinecap="round" />
      <path d="M 4 64 C 10 56, 18 58, 21 64" stroke="#202124" strokeWidth="3" strokeLinecap="round" />
      <path d="M 54 58 C 58 56, 64 62, 58 68 C 53 73, 46 72, 46 72" stroke="#202124" strokeWidth="3" strokeLinecap="round" />
      <path d="M 4 65 C 8 76, 20 84, 40 84 C 52 84, 58 76, 58 68" stroke="#202124" strokeWidth="3" strokeLinecap="round" />
      <path d="M 4 65 L 0 80" stroke="#202124" strokeWidth="3" strokeLinecap="round" />
      <path d="M 26 84 L 20 95" stroke="#202124" strokeWidth="3" strokeLinecap="round" />
    </g>
  </svg>
);

const GoogleG: React.FC = () => (
  <svg viewBox="0 0 24 24" className="g-logo">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
  </svg>
);

export const CardPreview: React.FC<PreviewProps> = ({ card, options = {}, qrDataUrl, className = '', id }) => {
  const o = {
    ...DEFAULT_DESIGN,
    businessName: card.business_name || '',
    serial: card.card_id,
    ...options,
  };

  if (o.format === 'cr80') {
    return (
      <div
        id={id}
        className={`card-preview cr80 ${className}`}
        style={{ background: 'conic-gradient(from 0deg, #DB4437, #4285F4, #0F9D58, #F4B400, #DB4437)' }}
      >
        <div className="card-preview-inner">
          <div className="cr80-top">
            <GoogleG />
            <div className="cr80-head">
              <div className="head-id">{o.headerId}</div>
              <div className="head-en">{o.headerEn}</div>
            </div>
          </div>
          <div className="stars">{'★★★★★'}</div>
          <div className="cr80-body">
            <div className="cr80-method">
              <div className="nfc-icon"><NfcSvg /></div>
              <div>
                <div className="method-title">{o.tapTitle}</div>
                <div className="method-sub">{o.tapSub}</div>
              </div>
            </div>
            <div className="cr80-qr">
              <div className="qr-box"><img src={qrDataUrl} alt="QR" /></div>
              <div className="method-title">{o.qrTitle}</div>
              <div className="method-sub">{o.qrSub}</div>
            </div>
          </div>
          <div className="band">
            <div className="thanks-id">{o.thanksId}</div>
            <div className="thanks-en">{o.thanksEn}</div>
            {o.showSerial && o.serial ? <div className="serial">{o.serial}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      className={`card-preview square ${className}`}
      style={{ background: 'conic-gradient(from 0deg, #DB4437, #4285F4, #0F9D58, #F4B400, #DB4437)' }}
    >
      <div className="card-preview-inner">
        <GoogleG />

        <div className="head-id">{o.headerId}</div>
        <div className="head-en">{o.headerEn}</div>
        <div className="stars">{'★★★★★'}</div>
        {o.showBusinessName && o.businessName ? <div className="biz">{o.businessName}</div> : null}

        <div className="methods">
          <div className="method">
            <div className="method-icon"><NfcSvg /></div>
            <div className="method-title">{o.tapTitle}</div>
            <div className="method-sub">{o.tapSub}</div>
          </div>
          <div className="method-divider">
            <div className="or">- Atau -</div>
          </div>
          <div className="method">
            <div className="method-icon qr"><img src={qrDataUrl} alt="QR" /></div>
            <div className="method-title">{o.qrTitle}</div>
            <div className="method-sub">{o.qrSub}</div>
          </div>
        </div>

        <div className="thanks">
          <div className="thanks-id">{o.thanksId}</div>
          <div className="thanks-en">{o.thanksEn}</div>
        </div>

        <div className="band">
          {o.showSerial && o.serial ? <div className="serial">{o.serial}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default CardPreview;

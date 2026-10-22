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
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export type CardFormat = 'square' | 'cr80';

export interface CardLike {
  card_id: string;
  business_name?: string | null;
  gmaps_url?: string | null;
}

/**
 * Mode "Template Sendiri": gambar milik pengguna dipakai apa adanya sebagai
 * latar kartu, lalu QR code ditempel di atasnya pada posisi & ukuran yang
 * diatur. Ini membuat hasil cetak 100% identik dengan file desain pengguna.
 */
export interface TemplateSettings {
  /** Data URL (base64) gambar template milik pengguna. */
  image: string;
  /** Titik tengah QR, 0..1 relatif terhadap lebar/tinggi kartu. */
  qrX: number;
  qrY: number;
  /** Ukuran sisi QR, 0..1 relatif terhadap lebar kartu. */
  qrSize: number;
  /** Tampilkan QR di atas template. */
  showQr: boolean;
  /** Beri alas putih di belakang QR agar tetap mudah discan. */
  whitePad: boolean;
  /** Nama file asli, hanya untuk ditampilkan di UI. */
  fileName?: string;
}

export const DEFAULT_TEMPLATE: TemplateSettings = {
  image: '',
  // Posisi bawaan = kotak QR pada lampiran (frame sudut di kanan bawah).
  qrX: 0.6965,
  qrY: 0.5329,
  // 0,148 = pas di dalam frame sudut lampiran (tidak menutupi bracket).
  qrSize: 0.148,
  showQr: true,
  // Template lampiran sudah punya area putih, jadi tidak perlu alas tambahan.
  whitePad: false,
};

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
  /** Bila diisi, desain memakai gambar template pengguna (bukan desain bawaan). */
  template?: TemplateSettings | null;
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

/**
 * Frame 4 warna Google.
 * Mengikuti lampiran: warna SOLID per sisi dengan batas tajam pada sudut
 * 337deg (kuning->merah), 70deg (merah->biru), 163deg (biru->hijau),
 * 250deg (hijau->kuning). Sudut 0deg = atas, arah putar searah jarum jam.
 */
export const FRAME_STOPS: Array<{ from: number; color: string }> = [
  { from: 337, color: GOOGLE_RED },
  { from: 70, color: GOOGLE_BLUE },
  { from: 163, color: GOOGLE_GREEN },
  { from: 250, color: GOOGLE_YELLOW },
];

function frameColorAt(angleDeg: number): string {
  const a = ((angleDeg % 360) + 360) % 360;
  if (a >= 337 || a < 70) return GOOGLE_RED;
  if (a < 163) return GOOGLE_BLUE;
  if (a < 250) return GOOGLE_GREEN;
  return GOOGLE_YELLOW;
}

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

  // Pra-isi seluruh ring dengan warna di sudut 0 agar tidak ada celah (seam) putih.
  ctx.fillStyle = frameColorAt(0);
  ctx.fillRect(x, y, w, h);

  const step = 0.5;
  for (let angle = -step; angle < 360; angle += step) {
    const next = Math.min(angle + step + 0.3, 360);
    const color = frameColorAt(angle + step / 2);

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

/**
 * Ilustrasi "tap NFC" (landscape, sesuai lampiran):
 * pad NFC + gelombang sinyal di kiri, kumparan di tengah, tangan memegang hp di kanan.
 * viewBox 160x100 -> rasio 1.6 (lampiran: 31,2% x 20,1% dari panel dalam = 1,55).
 */
function nfcSvgMarkup(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" width="${size}" height="${size * 0.625}" fill="none">
    <g stroke="#202124" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
      <!-- pad NFC -->
      <circle cx="34" cy="54" r="13.5" />
      <circle cx="34" cy="54" r="5.5" stroke-width="2.6" />
      <!-- gelombang sinyal (kiri) -->
      <path d="M 15.5 44.5 A 17 17 0 0 0 15.5 63.5" />
      <path d="M 8.5 37.5 A 26 26 0 0 0 8.5 70.5" />
      <path d="M 2 31 A 35 35 0 0 0 2 77" />
      <!-- kumparan / induksi -->
      <path d="M 56 45 A 10 10 0 0 1 56 63" />
      <path d="M 63 39.5 A 17 17 0 0 1 63 68.5" />
      <path d="M 70 34 A 24 24 0 0 1 70 74" />
      <!-- tangan + hp -->
      <g transform="rotate(-9 118 50)">
        <rect x="100" y="14" width="40" height="68" rx="7" fill="#ffffff" />
        <line x1="108" y1="20.5" x2="132" y2="20.5" stroke-width="2.6" />
        <line x1="113" y1="75.5" x2="127" y2="75.5" stroke-width="2.6" />
      </g>
      <!-- jari tangan menggenggam -->
      <path d="M 92 63 C 97 60 104 64 105 71 C 106 78 99 84 91 82" />
      <path d="M 90 82 C 99 91 116 91 124 82" />
      <path d="M 88 71 C 92 68 98 71 99 77" stroke-width="2.6" />
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

export async function makeQrDataUrl(card: CardLike, width = 720, transparent = false): Promise<string> {
  return QRCode.toDataURL(getCardTargetUrl(card), {
    width,
    margin: transparent ? 0 : 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: transparent ? '#00000000' : '#ffffff' },
  });
}

/* -------------------------------------------------------------------------- */
/*  Canvas renderer (300 DPI)                                                  */
/* -------------------------------------------------------------------------- */

export const CARD_SIZES: Record<CardFormat, { width: number; height: number; widthMm: number; label: string; mm: string }> = {
  // 1181x1181 px @300dpi = 100 x 100 mm (10 x 10 cm, sesuai lampiran)
  square: { width: 1181, height: 1181, widthMm: 100, label: 'Standee Persegi 10 x 10 cm (sesuai lampiran)', mm: '10 x 10 cm' },
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

  const canvas = document.createElement('canvas');
  const size = CARD_SIZES[format];
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // --- Mode template milik pengguna -----------------------------------------
  if (options.template && options.template.image) {
    const qr = opts.qrDataUrl || (await makeQrDataUrl(card, 1024, true));
    await drawTemplateCard(ctx, canvas, options.template, qr);
    return canvas;
  }

  const qr = opts.qrDataUrl || (await makeQrDataUrl(card));

  if (format === 'cr80') {
    await drawCr80(ctx, canvas, opts, qr);
  } else {
    await drawSquare(ctx, canvas, opts, qr);
  }
  return canvas;
}

/**
 * Menggambar kartu dari gambar template milik pengguna.
 * Gambar di-"cover" ke seluruh kanvas (tanpa distorsi), lalu QR ditempel
 * pada posisi & ukuran sesuai pengaturan.
 */
async function drawTemplateCard(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  tpl: TemplateSettings,
  qr: string
) {
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const tplImg = await loadImage(tpl.image);
  const scale = Math.max(W / tplImg.width, H / tplImg.height);
  const dw = tplImg.width * scale;
  const dh = tplImg.height * scale;
  ctx.drawImage(tplImg, (W - dw) / 2, (H - dh) / 2, dw, dh);

  if (tpl.showQr === false) return;

  const box = Math.max(24, W * (tpl.qrSize || DEFAULT_TEMPLATE.qrSize));
  const cx = W * (tpl.qrX ?? DEFAULT_TEMPLATE.qrX);
  const cy = H * (tpl.qrY ?? DEFAULT_TEMPLATE.qrY);
  const x = cx - box / 2;
  const y = cy - box / 2;

  if (tpl.whitePad !== false) {
    const pad = box * 0.06;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    roundRectPath(ctx, x - pad, y - pad, box + pad * 2, box + pad * 2, box * 0.05);
    ctx.fill();
    ctx.restore();
  }

  const qrImg = await loadImage(qr);
  ctx.drawImage(qrImg, x, y, box, box);
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
  drawGoogleG(ctx, cx, innerY + innerH * 0.078, W * 0.145);

  // Judul
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  const s1 = fitFont(ctx, opts.headerId, innerW * 0.88, W * 0.0332, '800');
  ctx.font = `800 ${s1}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.headerId, cx, innerY + innerH * 0.189);

  ctx.fillStyle = MUTED;
  const s2 = fitFont(ctx, opts.headerEn, innerW * 0.88, W * 0.0297, '500');
  ctx.font = `500 ${s2}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.headerEn, cx, innerY + innerH * 0.238);

  // Bintang
  drawStars(ctx, cx, innerY + innerH * 0.3105, W * 0.059);

  // Nama bisnis (opsional)
  if (opts.showBusinessName && opts.businessName) {
    ctx.fillStyle = '#9AA0A6';
    const name = opts.businessName.toUpperCase();
    const s3 = fitFont(ctx, name, innerW * 0.8, W * 0.022, '700');
    ctx.font = `700 ${s3}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.fillText(name, cx, innerY + innerH * 0.372);
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
  const leftX = innerX + innerW * 0.2707;
  const rightX = innerX + innerW * 0.730;
  const iconCy = innerY + innerH * 0.5542;
  const nfcImg = await svgToImage(nfcSvgMarkup(768));
  const nfcW = innerW * 0.3418;
  const nfcH = innerH * 0.2513;
  ctx.drawImage(nfcImg, leftX - nfcW / 2, iconCy - nfcH / 2, nfcW, nfcH);

  // Kolom kanan: QR asli dengan frame sudut (sesuai lampiran)
  const qrBox = innerW * 0.208;
  const qrCx = rightX;
  const qrCy = innerY + innerH * 0.5395;
  const qrX0 = qrCx - qrBox / 2;
  const qrY0 = qrCy - qrBox / 2;
  const qrX1 = qrCx + qrBox / 2;
  const qrY1 = qrCy + qrBox / 2;
  const arm = innerW * 0.046;
  const brTh = innerH * 0.044;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = brTh;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(qrX0, qrY0 + arm); ctx.lineTo(qrX0, qrY0); ctx.lineTo(qrX0 + arm, qrY0);
  ctx.moveTo(qrX1 - arm, qrY0); ctx.lineTo(qrX1, qrY0); ctx.lineTo(qrX1, qrY0 + arm);
  ctx.moveTo(qrX1, qrY1 - arm); ctx.lineTo(qrX1, qrY1); ctx.lineTo(qrX1 - arm, qrY1);
  ctx.moveTo(qrX0 + arm, qrY1); ctx.lineTo(qrX0, qrY1); ctx.lineTo(qrX0, qrY1 - arm);
  ctx.stroke();
  ctx.restore();
  const qrImg = await loadImage(qr);
  const qrInset = qrBox * 0.06;
  ctx.drawImage(qrImg, qrX0 + qrInset, qrY0 + qrInset, qrBox - qrInset * 2, qrBox - qrInset * 2);

  // Judul metode
  ctx.fillStyle = INK;
  const methodTitleY = innerY + innerH * 0.700;
  const titleLeftX = innerX + innerW * 0.2465;
  const titleRightX = innerX + innerW * 0.7305;
  const mt = fitFont(ctx, opts.tapTitle, innerW * 0.34, W * 0.034, '800');
  ctx.font = `800 ${mt}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.tapTitle, titleLeftX, methodTitleY);
  ctx.fillText(opts.qrTitle, titleRightX, methodTitleY);

  // Sub judul metode
  ctx.fillStyle = MUTED;
  const subY = innerY + innerH * 0.746;
  let ms = fitFont(ctx, opts.tapSub, innerW * 0.34, W * 0.028, '500');
  ctx.font = `500 ${ms}px "Plus Jakarta Sans", Arial, sans-serif`;
  const subLeftX = innerX + innerW * 0.257;
  const subRightX = innerX + innerW * 0.725;
  ctx.fillText(opts.tapSub, subLeftX, subY);
  ms = fitFont(ctx, opts.qrSub, innerW * 0.34, W * 0.028, '500');
  ctx.font = `500 ${ms}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.qrSub, subRightX, subY);

  // Garis horizontal pemisah
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = Math.max(2, W * 0.0022);
  ctx.beginPath();
  ctx.moveTo(innerX + innerW * 0.075, innerY + innerH * 0.808);
  ctx.lineTo(innerX + innerW * 0.925, innerY + innerH * 0.808);
  ctx.stroke();

  // Ucapan terima kasih
  ctx.fillStyle = INK;
  const t1 = fitFont(ctx, opts.thanksId, innerW * 0.88, W * 0.034, '800');
  ctx.font = `800 ${t1}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.thanksId, cx, innerY + innerH * 0.849);

  ctx.fillStyle = MUTED;
  const t2 = fitFont(ctx, opts.thanksEn, innerW * 0.88, W * 0.030, '500');
  ctx.font = `500 ${t2}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(opts.thanksEn, cx, innerY + innerH * 0.9095);

  // Footer band gelombang hijau -> biru (menutup border bawah, sesuai lampiran)
  const bandCenter = H * 0.933;
  const bandEdge = H * 0.85;
  // Lampiran: band SOLID hijau (kiri) -> biru (kanan) dengan batas tajam di 64,5%.
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, GOOGLE_GREEN);
  grad.addColorStop(0.6445, GOOGLE_GREEN);
  grad.addColorStop(0.6445, GOOGLE_BLUE);
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
  grad.addColorStop(0.6445, GOOGLE_GREEN);
  grad.addColorStop(0.6445, GOOGLE_BLUE);
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

export function printImages(images: string[], perPage: number, title = 'Cetak Kartu TapUlasan', widthMm = 100) {
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

  // A4 dengan margin 8mm -> area cetak 194mm. Kolom dihitung agar ukuran fisik
  // kartu TIDAK pernah menyusut (penting untuk standee 10 x 10 cm).
  const GAP_MM = 6;
  const CONTENT_MM = 194;
  const maxCols = Math.max(1, Math.floor((CONTENT_MM + GAP_MM) / (widthMm + GAP_MM)));
  const cols = Math.max(1, Math.min(perPage, maxCols));

  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-family: Arial, sans-serif; }
    .sheet { display: grid; grid-template-columns: repeat(${cols}, ${widthMm}mm); gap: ${GAP_MM}mm; justify-content: center; }
    .card { break-inside: avoid; page-break-inside: avoid; }
    .card img { width: ${widthMm}mm; height: auto; display: block; }
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
    const format: CardFormat = options.format || DEFAULT_DESIGN.format;
    printImages([canvas.toDataURL('image/png')], 1, `Kartu ${card.card_id}`, CARD_SIZES[format].widthMm);
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

export const CardPreview: React.FC<PreviewProps> = ({ card, options = {}, qrDataUrl, className = '', id }) => {
  const [src, setSrc] = useState<string>('');
  const format = options.format || DEFAULT_DESIGN.format;

  // Signature ringkas (tanpa base64 gambar) supaya tidak mahal dihitung tiap render.
  const tpl = options.template;
  const key = [
    options.headerId,
    options.headerEn,
    options.tapTitle,
    options.tapSub,
    options.qrTitle,
    options.qrSub,
    options.thanksId,
    options.thanksEn,
    options.serial,
    options.showBusinessName ? 1 : 0,
    options.showSerial ? 1 : 0,
    tpl ? `${tpl.image.length}:${tpl.qrX}:${tpl.qrY}:${tpl.qrSize}:${tpl.showQr ? 1 : 0}:${tpl.whitePad ? 1 : 0}` : '-',
  ].join('|');

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const canvas = await renderCardCanvas(card, { ...options, qrDataUrl });
        if (alive) setSrc(canvas.toDataURL('image/png'));
      } catch {
        /* biarkan preview kosong bila gagal */
      }
    };
    const t = window.setTimeout(run, 50);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.card_id, card.business_name, card.gmaps_url, key, qrDataUrl, format]);

  return (
    <div
      id={id}
      className={`card-preview canvas-preview ${format} ${className}`}
      data-format={format}
    >
      {src ? <img src={src} alt="Pratinjau kartu" /> : <div className="canvas-preview-skeleton" />}
    </div>
  );
};

export default CardPreview;

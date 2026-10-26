/**
 * storage.ts
 * -----------------------------------------------------------------------------
 * Lapisan penyimpanan permanen (localStorage) yang aman untuk kartu NFC/QR.
 *
 * Tujuan modul ini:
 *  - Menjadi SATU-SATUNYA pintu akses ke localStorage untuk data kartu.
 *  - Memvalidasi & menormalkan data (mencegah data corrupt / field hilang).
 *  - Menghilangkan duplikasi card_id (penyebab React key collision & baris ganda).
 *  - Menyediakan "tombstone" agar kartu yang sudah dihapus tidak muncul kembali
 *    ketika data dari server (yang mungkin masih menyimpan salinan lama) di-merge.
 *  - Menyediakan generator batch dengan ID unik (tidak menabrak ID yang sudah ada).
 * -----------------------------------------------------------------------------
 */

export interface StoredCard {
  card_id: string;
  business_name: string | null;
  gmaps_url: string | null;
  is_active: boolean;
  scan_count: number;
  created_at: string;
  updated_at: string;
}

export const CARDS_STORAGE_KEY = 'tapulasan_cards';
export const DELETED_STORAGE_KEY = 'tapulasan_deleted_ids';
export const STORAGE_VERSION = 2;

const MAX_BATCH = 500;

/* -------------------------------------------------------------------------- */
/* Utilitas dasar                                                             */
/* -------------------------------------------------------------------------- */

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function readRaw(key: string): string | null {
  if (!hasLocalStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): boolean {
  if (!hasLocalStorage()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    // Kuota penuh / private mode. Jangan sampai aplikasi crash.
    console.warn(`[storage] Gagal menulis "${key}":`, err);
    return false;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function isValidIso(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

export function normalizeCardId(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, '-').toUpperCase();
}

export function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Sanitasi & deduplikasi                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Mengubah data mentah (dari localStorage / API) menjadi StoredCard yang valid.
 * Mengembalikan null jika tidak bisa diselamatkan (mis. card_id kosong).
 */
export function sanitizeCard(raw: unknown): StoredCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const cardId = normalizeCardId(obj.card_id ?? obj.cardId ?? obj.id);
  if (!cardId) return null;

  const businessName =
    typeof obj.business_name === 'string' && obj.business_name.trim()
      ? obj.business_name.trim()
      : null;

  const rawUrl = typeof obj.gmaps_url === 'string' ? obj.gmaps_url.trim() : '';
  const gmapsUrl = isValidHttpUrl(rawUrl) ? rawUrl : null;

  const scanRaw = Number(obj.scan_count);
  const scanCount = Number.isFinite(scanRaw) && scanRaw > 0 ? Math.floor(scanRaw) : 0;

  const createdAt = isValidIso(obj.created_at) ? (obj.created_at as string) : nowIso();
  const updatedAt = isValidIso(obj.updated_at) ? (obj.updated_at as string) : createdAt;

  // Kartu hanya boleh berstatus aktif jika benar-benar punya nama bisnis + URL.
  const isActive = Boolean(obj.is_active) && Boolean(businessName) && Boolean(gmapsUrl);

  return {
    card_id: cardId,
    business_name: businessName,
    gmaps_url: gmapsUrl,
    is_active: isActive,
    scan_count: scanCount,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

/** Deduplikasi berdasarkan card_id (case-insensitive). Entri terakhir menang. */
export function dedupeCards(cards: StoredCard[]): StoredCard[] {
  const map = new Map<string, StoredCard>();
  for (const card of cards) {
    const clean = sanitizeCard(card);
    if (!clean) continue;
    map.set(clean.card_id.toUpperCase(), clean);
  }
  return Array.from(map.values()).sort((a, b) => a.card_id.localeCompare(b.card_id));
}

/* -------------------------------------------------------------------------- */
/* Baca / tulis daftar kartu                                                  */
/* -------------------------------------------------------------------------- */

export function loadCards(): StoredCard[] {
  const raw = readRaw(CARDS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[storage] Data kartu bukan array — diabaikan agar tidak crash.');
      return [];
    }
    return dedupeCards(parsed as StoredCard[]);
  } catch (err) {
    console.warn('[storage] Data kartu korup / bukan JSON valid — diabaikan.', err);
    return [];
  }
}

export function saveCards(cards: StoredCard[]): boolean {
  const clean = dedupeCards(cards);
  return writeRaw(CARDS_STORAGE_KEY, JSON.stringify(clean));
}

/**
 * True jika key storage kartu pernah dibuat (termasuk bila isinya array kosong).
 * Dipakai untuk membedakan "pertama kali pakai" vs "user sudah menghapus semua".
 */
export function hasCardStorage(): boolean {
  return readRaw(CARDS_STORAGE_KEY) !== null;
}

/** Tambah atau perbarui satu kartu. Mengembalikan daftar terbaru. */
export function upsertCard(card: StoredCard): StoredCard[] {
  const clean = sanitizeCard(card);
  if (!clean) return loadCards();
  clearTombstone(clean.card_id);
  const list = loadCards();
  const idx = list.findIndex((c) => c.card_id.toUpperCase() === clean.card_id.toUpperCase());
  if (idx >= 0) list[idx] = { ...list[idx], ...clean };
  else list.push(clean);
  const next = dedupeCards(list);
  saveCards(next);
  return next;
}

/** Hapus HANYA satu kartu berdasarkan ID. */
export function removeCard(cardId: string): StoredCard[] {
  const id = normalizeCardId(cardId);
  const list = loadCards();
  const next = list.filter((c) => c.card_id.toUpperCase() !== id);
  saveCards(next);
  if (id) addTombstone(id);
  return next;
}

/* -------------------------------------------------------------------------- */
/* Tombstone (anti-resurrect)                                                 */
/* -------------------------------------------------------------------------- */

export function loadTombstones(): Set<string> {
  const raw = readRaw(DELETED_STORAGE_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((v) => normalizeCardId(v)).filter(Boolean));
  } catch {
    return new Set();
  }
}

function persistTombstones(set: Set<string>): void {
  writeRaw(DELETED_STORAGE_KEY, JSON.stringify(Array.from(set)));
}

export function addTombstone(cardId: string): void {
  const id = normalizeCardId(cardId);
  if (!id) return;
  const set = loadTombstones();
  set.add(id);
  persistTombstones(set);
}

export function clearTombstone(cardId: string): void {
  const id = normalizeCardId(cardId);
  if (!id) return;
  const set = loadTombstones();
  if (set.delete(id)) persistTombstones(set);
}

/* -------------------------------------------------------------------------- */
/* Merge data lokal + server                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Menggabungkan kartu lokal dengan kartu dari server TANPA menghilangkan data
 * lokal. Server menang untuk field bisnis, tetapi:
 *  - kartu yang ada di tombstone (sudah dihapus) tidak akan dihidupkan lagi;
 *  - scan_count memakai nilai terbesar agar hitungan tidak mundur.
 */
export function mergeCards(localCards: StoredCard[], remoteCards: unknown[]): StoredCard[] {
  const tombstones = loadTombstones();
  const map = new Map<string, StoredCard>();

  for (const c of localCards) {
    const clean = sanitizeCard(c);
    if (clean) map.set(clean.card_id.toUpperCase(), clean);
  }

  for (const raw of remoteCards) {
    const clean = sanitizeCard(raw);
    if (!clean) continue;
    const key = clean.card_id.toUpperCase();
    if (tombstones.has(key)) continue; // jangan resurrect kartu yang sudah dihapus
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        ...clean,
        scan_count: Math.max(existing.scan_count, clean.scan_count),
        created_at: existing.created_at || clean.created_at,
      });
    } else {
      map.set(key, clean);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.card_id.localeCompare(b.card_id));
}

/* -------------------------------------------------------------------------- */
/* Generator batch dengan ID unik                                             */
/* -------------------------------------------------------------------------- */

export function normalizePrefix(prefix: string): string {
  const clean = (prefix || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || 'CARD';
}

/** Nomor berikutnya yang aman: max(suffix yang ada) + 1, bukan length + 1. */
export function nextCardNumber(cards: StoredCard[], prefix: string): number {
  const p = normalizePrefix(prefix);
  const re = new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`, 'i');
  let max = 0;
  for (const card of cards) {
    const m = re.exec(card.card_id);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max + 1;
}

/**
 * Membuat `count` kartu baru dengan ID unik, tidak menabrak ID yang sudah ada.
 * Jika ada celah (mis. CARD-002 dihapus), celah TIDAK dipakai ulang agar ID
 * yang sudah tercetak di kartu fisik tidak pernah terduplikasi.
 */
export function generateUniqueBatch(
  prefix: string,
  count: number,
  existing: StoredCard[],
  startAt?: number
): StoredCard[] {
  const p = normalizePrefix(prefix);
  const safeCount = Math.max(0, Math.min(MAX_BATCH, Math.floor(Number(count) || 0)));
  if (safeCount === 0) return [];

  const used = new Set(existing.map((c) => c.card_id.toUpperCase()));
  let n = Math.max(1, Math.floor(Number(startAt) || nextCardNumber(existing, p)));
  const now = nowIso();
  const created: StoredCard[] = [];
  let guard = 0;

  while (created.length < safeCount && guard < safeCount * 10 + 1000) {
    guard++;
    const cardId = `${p}-${String(n).padStart(3, '0')}`;
    n++;
    if (used.has(cardId.toUpperCase())) continue;
    used.add(cardId.toUpperCase());
    created.push({
      card_id: cardId,
      business_name: null,
      gmaps_url: null,
      is_active: false,
      scan_count: 0,
      created_at: now,
      updated_at: now,
    });
  }

  return created;
}

/* -------------------------------------------------------------------------- */
/* Helper UI                                                                  */
/* -------------------------------------------------------------------------- */

/** Total scan yang aman (tidak menghasilkan NaN bila data korup). */
export function sumScanCount(cards: StoredCard[]): number {
  return cards.reduce((sum, c) => sum + (Number.isFinite(c.scan_count) ? c.scan_count : 0), 0);
}

/** Cek apakah dua kartu punya ID yang sama (case-insensitive). */
export function sameCardId(a: string, b: string): boolean {
  return normalizeCardId(a) === normalizeCardId(b);
}

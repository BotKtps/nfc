/**
 * Uji logika storage tanpa browser (fake localStorage).
 * Jalankan: npx tsx scripts/storage.test.ts
 */
const store = new Map<string, string>();

(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
};

const s = await import('../src/storage.ts');

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.error(`  FAIL  ${name}`, extra ?? '');
  }
}

function reset() {
  store.clear();
}

console.log('\n[1] sanitizeCard');
check('menolak objek tanpa card_id', s.sanitizeCard({ business_name: 'X' }) === null);
check(
  'menormalkan ID & menonaktifkan kartu tanpa URL',
  (() => {
    const c = s.sanitizeCard({ card_id: ' card-9 ', business_name: 'Toko', gmaps_url: 'bukan-url', is_active: true });
    return !!c && c.card_id === 'CARD-9' && c.is_active === false && c.gmaps_url === null;
  })()
);
check(
  'scan_count negatif/NaN menjadi 0',
  (() => {
    const c = s.sanitizeCard({ card_id: 'CARD-1', scan_count: 'abc' });
    return !!c && c.scan_count === 0;
  })()
);

console.log('\n[2] loadCards / saveCards');
reset();
store.set(s.CARDS_STORAGE_KEY, '{rusak json');
check('JSON korup -> array kosong (tidak crash)', s.loadCards().length === 0);

reset();
const dupes = [
  { card_id: 'CARD-1', business_name: 'A', gmaps_url: 'https://a.com', is_active: true, scan_count: 1 },
  { card_id: 'card-1', business_name: 'B', gmaps_url: 'https://b.com', is_active: true, scan_count: 2 },
  { card_id: 'CARD-2', business_name: null, gmaps_url: null, is_active: false, scan_count: 0 },
] as any;
s.saveCards(dupes);
const loaded = s.loadCards();
check('duplikasi ID dihapus', loaded.length === 2, loaded.map((c: any) => c.card_id));
check('entri terakhir menang', loaded.find((c: any) => c.card_id === 'CARD-1')?.business_name === 'B');

console.log('\n[3] removeCard hanya target + tombstone');
reset();
s.saveCards([
  { card_id: 'CARD-1', business_name: 'A', gmaps_url: 'https://a.com', is_active: true, scan_count: 0 },
  { card_id: 'CARD-2', business_name: 'B', gmaps_url: 'https://b.com', is_active: true, scan_count: 0 },
  { card_id: 'CARD-3', business_name: 'C', gmaps_url: 'https://c.com', is_active: true, scan_count: 0 },
] as any);
const afterDelete = s.removeCard('card-2');
check('hanya CARD-2 yang terhapus', afterDelete.length === 2 && !afterDelete.some((c: any) => c.card_id === 'CARD-2'));
check('CARD-1 & CARD-3 tetap ada', afterDelete.some((c: any) => c.card_id === 'CARD-1') && afterDelete.some((c: any) => c.card_id === 'CARD-3'));
check('tombstone tercatat', s.loadTombstones().has('CARD-2'));

console.log('\n[4] mergeCards tidak resurrect kartu terhapus');
const merged = s.mergeCards(s.loadCards(), [
  { card_id: 'CARD-2', business_name: 'B', gmaps_url: 'https://b.com', is_active: true, scan_count: 9 },
  { card_id: 'CARD-4', business_name: 'D', gmaps_url: 'https://d.com', is_active: true, scan_count: 1 },
]);
check('CARD-2 tidak muncul lagi', !merged.some((c: any) => c.card_id === 'CARD-2'), merged.map((c: any) => c.card_id));
check('kartu baru dari server ditambahkan', merged.some((c: any) => c.card_id === 'CARD-4'));
check('scan_count tidak mundur', merged.find((c: any) => c.card_id === 'CARD-1')?.scan_count === 0);

console.log('\n[5] batch unik');
reset();
const existing = [
  { card_id: 'CARD-001', business_name: null, gmaps_url: null, is_active: false, scan_count: 0 },
  { card_id: 'CARD-005', business_name: null, gmaps_url: null, is_active: false, scan_count: 0 },
] as any;
check('nextCardNumber memakai max+1 (6)', s.nextCardNumber(existing, 'CARD') === 6, s.nextCardNumber(existing, 'CARD'));
const batch = s.generateUniqueBatch('CARD', 3, existing);
check('jumlah batch benar', batch.length === 3, batch.map((c: any) => c.card_id));
check('ID batch unik & tidak menabrak existing', new Set([...existing, ...batch].map((c: any) => c.card_id)).size === 5, batch.map((c: any) => c.card_id));
check('batch mulai dari 006', batch[0].card_id === 'CARD-006');

console.log('\n[6] sumScanCount aman');
check('NaN tidak menghasilkan NaN', s.sumScanCount([{ scan_count: 2 } as any, { scan_count: NaN } as any, { scan_count: 3 } as any]) === 5);

console.log(`\nHASIL: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);

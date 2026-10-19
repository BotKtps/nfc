/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  ExternalLink,
  Plus,
  Copy,
  Check,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Lock,
  Unlock,
  ShieldCheck,
  Smartphone,
  Layers,
  ArrowRight,
  LogOut,
  Printer,
  CheckCircle2
} from 'lucide-react';
import QRCode from 'qrcode';

interface Card {
  card_id: string;
  business_name: string | null;
  gmaps_url: string | null;
  is_active: boolean;
  scan_count: number;
  created_at: string;
  updated_at: string;
}

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Navigation & Auth state
  const [currentView, setCurrentView] = useState<'landing' | 'admin_login' | 'admin_dashboard' | 'client_setup' | 'simulator' | 'print_grid'>('landing');
  const [adminPin, setAdminPin] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');

  // Setup / Activation state for client web
  const [setupCardId, setSetupCardId] = useState('CARD-001');
  const [setupBusinessName, setSetupBusinessName] = useState('');
  const [setupMapsInput, setSetupMapsInput] = useState('');
  const [savingSetup, setSavingSetup] = useState(false);
  const [previewReviewUrl, setPreviewReviewUrl] = useState('');
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [setupSuccessData, setSetupSuccessData] = useState<{ card_id: string; review_url: string; secret_key?: string } | null>(null);

  // Batch generator state
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState('CARD');
  const [batchCount, setBatchCount] = useState(10);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  // QR Modal State
  const [selectedCardForQR, setSelectedCardForQR] = useState<Card | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Print view state
  const [printQrImages, setPrintQrImages] = useState<Record<string, string>>({});
  const [generatingPrintQrs, setGeneratingPrintQrs] = useState(false);

  useEffect(() => {
    if (currentView === 'print_grid' && cards.length > 0) {
      setGeneratingPrintQrs(true);
      Promise.all(
        cards.map(async (card) => {
          const shortUrl = `${window.location.origin}/r/${card.card_id}`;
          try {
            const dataUrl = await QRCode.toDataURL(shortUrl, { width: 250, margin: 1 });
            return [card.card_id, dataUrl];
          } catch (err) {
            return [card.card_id, ''];
          }
        })
      ).then((results) => {
        const map = Object.fromEntries(results);
        setPrintQrImages(map);
        setGeneratingPrintQrs(false);
      });
    }
  }, [currentView, cards]);

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/cards');
      const data = await res.json();
      setCards(data.cards);
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
    const path = window.location.pathname;
    if (path.startsWith('/setup/')) {
      const cId = path.split('/')[2];
      if (cId) {
        setSetupCardId(cId);
        const existing = cards.find(c => c.card_id === cId);
        if (existing) {
          setSetupBusinessName(existing.business_name || '');
          if (existing.gmaps_url) {
            setSetupMapsInput(existing.gmaps_url);
          }
        }
        setCurrentView('client_setup');
      }
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === 'admin123') {
      setIsAdminAuthenticated(true);
      setCurrentView('admin_dashboard');
      setAdminLoginError('');
      setAdminPin('');
    } else {
      setAdminLoginError('PIN Admin salah. Gunakan: admin123');
    }
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingBatch(true);
    try {
      const res = await fetch('/api/cards/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: batchPrefix, start: cards.length + 1, count: batchCount }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchCards();
        setBatchModalOpen(false);
        alert(`Berhasil generate ${data.count} kartu baru!`);
      }
    } catch (err) {
      console.error('Error generating batch:', err);
      alert('Gagal generate batch kartu.');
    } finally {
      setGeneratingBatch(false);
    }
  };

  const handleResetCard = async (cardId: string) => {
    if (!confirm(`Reset kartu ${cardId} kembali menjadi kosong?`)) return;
    try {
      const res = await fetch(`/api/cards/${cardId}/reset`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchCards();
      }
    } catch (err) {
      console.error('Error resetting card:', err);
    }
  };

  const handleGenerateReviewLinkPreview = async () => {
    if (!setupMapsInput) {
      alert('Mohon masukkan Link Google Maps terlebih dahulu.');
      return;
    }
    setGeneratingPreview(true);
    try {
      const res = await fetch('/api/resolve-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: setupMapsInput, business_name: setupBusinessName }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewReviewUrl(data.review_url);
      } else {
        alert(data.error || 'Gagal generate preview.');
      }
    } catch (err) {
      console.error('Preview error:', err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupCardId || !setupBusinessName || !setupMapsInput) {
      alert('Mohon isi nama bisnis dan link Google Maps / Place ID.');
      return;
    }

    setSavingSetup(true);
    try {
      const res = await fetch(`/api/cards/${setupCardId}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_name: setupBusinessName, gmaps_url: setupMapsInput }),
      });
      const data = await res.json();
      if (data.success) {
        setSetupSuccessData({
          card_id: setupCardId,
          review_url: data.card.gmaps_url,
          secret_key: 'edit_' + Math.random().toString(36).substring(2, 9)
        });
        fetchCards();
      } else {
        alert(data.error || 'Gagal menyimpan.');
      }
    } catch (err) {
      console.error('Save setup error:', err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSavingSetup(false);
    }
  };

  const showQRCodeModal = async (card: Card) => {
    setSelectedCardForQR(card);
    const shortUrl = `${window.location.origin}/r/${card.card_id}`;
    try {
      const url = await QRCode.toDataURL(shortUrl, { width: 300, margin: 2 });
      setQrCodeDataUrl(url);
    } catch (err) {
      console.error('QR error:', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredCards = cards.filter(card => {
    const q = searchTerm.toLowerCase();
    const bName = card.business_name ? card.business_name.toLowerCase() : '';
    const cId = card.card_id.toLowerCase();
    const gUrl = card.gmaps_url ? card.gmaps_url.toLowerCase() : '';
    return bName.includes(q) || cId.includes(q) || gUrl.includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-amber-100 selection:text-amber-900 flex flex-col">
      {/* Global Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs sticky top-0 z-40">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-bold shadow-sm">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">TapUlasan</h1>
            <p className="text-xs text-slate-500">Platform Kartu Ulasan NFC &amp; Barcode Mandiri</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentView !== 'landing' && (
            <button
              onClick={() => setCurrentView('landing')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              Beranda Utama
            </button>
          )}

          {currentView === 'admin_dashboard' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('print_grid')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm transition shadow-sm flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak QR Grid</span>
              </button>
              <button
                onClick={() => setBatchModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-xl text-xs sm:text-sm transition shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Batch</span>
              </button>
              <button
                onClick={() => {
                  setIsAdminAuthenticated(false);
                  setCurrentView('landing');
                }}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium px-3 py-2 rounded-xl text-xs transition flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Admin</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCurrentView('admin_login')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-xs sm:text-sm transition shadow-sm flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Login Admin</span>
            </button>
          )}
        </div>
      </header>

      {/* VIEW 1: LANDING / HOME SELECTOR */}
      {currentView === 'landing' && (
        <main className="flex-1 max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Solusi Pintar Kartu Ulasan Bintang 5 Google Maps</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight max-w-2xl mb-4">
            Tingkatkan Reputasi Bisnis Anda dengan 1-Tap NFC &amp; QR Code
          </h2>
          <p className="text-slate-600 max-w-xl text-sm sm:text-base mb-10">
            Sistem mandiri (self-service) untuk vendor dan pemilik bisnis. Pelanggan cukup scan kartu, isi data bisnis, dan langsung terhubung ke ulasan bintang 5 Google Maps secara otomatis.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* Admin Portal Card */}
            <div 
              onClick={() => setCurrentView(isAdminAuthenticated ? 'admin_dashboard' : 'admin_login')}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition cursor-pointer text-left group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold mb-4 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Dashboard Admin</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Kelola batch kartu NFC, pantau status bisnis, cetak QR code, dan statistik scan terpusat.
                </p>
              </div>
              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs group-hover:translate-x-1 transition">
                <span>{isAdminAuthenticated ? 'Buka Dashboard' : 'Login Admin'}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Client Setup / Simulator Card */}
            <div 
              onClick={() => {
                setSetupCardId('CARD-001');
                setCurrentView('client_setup');
                setSetupSuccessData(null);
              }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-300 transition cursor-pointer text-left group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold mb-4 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Simulasi Setup Kartu</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Coba halaman web pribadi aktivasi kartu pelanggan (Self-Service Setup Kartu CARD-001).
                </p>
              </div>
              <div className="flex items-center gap-2 text-amber-600 font-semibold text-xs group-hover:translate-x-1 transition">
                <span>Mulai Aktivasi</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </main>
      )}

      {/* VIEW 2: SECURE ADMIN LOGIN */}
      {currentView === 'admin_login' && (
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Autentikasi Admin</h2>
              <p className="text-xs text-slate-500 mt-1">Masukkan PIN rahasia untuk mengakses dashboard manajemen kartu.</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  PIN Admin (Default: admin123)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                {adminLoginError && (
                  <p className="text-xs text-rose-600 font-medium mt-1.5">{adminLoginError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Masuk ke Dashboard</span>
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setCurrentView('landing')}
                className="text-xs text-slate-500 hover:text-slate-900 transition underline"
              >
                ← Kembali ke Beranda
              </button>
            </div>
          </div>
        </main>
      )}

      {/* VIEW 3: ADMIN DASHBOARD */}
      {currentView === 'admin_dashboard' && (
        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center font-bold">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Kartu</p>
                <h4 className="text-xl font-bold text-slate-900">{cards.length}</h4>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Aktif / Claimed</p>
                <h4 className="text-xl font-bold text-slate-900">{cards.filter(c => c.is_active).length}</h4>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Belum Aktif (Kosong)</p>
                <h4 className="text-xl font-bold text-slate-900">{cards.filter(c => !c.is_active).length}</h4>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                <ExternalLink className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Pelanggan Scan</p>
                <h4 className="text-xl font-bold text-slate-900">{cards.reduce((sum, c) => sum + c.scan_count, 0)}</h4>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Daftar Bisnis &amp; Link Google Maps</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap kartu NFC &amp; QR memiliki halaman web pribadi untuk setup mandiri oleh pembeli.
              </p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama bisnis atau ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-72"
              />
            </div>
          </div>

          {/* Business List: Responsive Mobile Stacked Cards & Desktop Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">Memuat data kartu...</div>
            ) : filteredCards.length === 0 ? (
              <div className="p-12 text-center text-slate-400">Tidak ada kartu yang ditemukan.</div>
            ) : (
              <>
                {/* Mobile View: Stacked Card List (block md:hidden) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredCards.map((card) => {
                    const shortLink = `${window.location.origin}/r/${card.card_id}`;
                    return (
                      <div key={card.card_id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-lg">
                            {card.card_id}
                          </span>
                          {card.is_active ? (
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              Aktif ({card.scan_count} scan)
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                              Belum Aktif
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nama Bisnis</p>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">
                            {card.business_name || <span className="text-amber-600 font-normal italic">Belum Diisi (Kosong)</span>}
                          </p>
                        </div>

                        {card.gmaps_url && (
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Link Google Maps</p>
                            <a
                              href={card.gmaps_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5 break-all"
                            >
                              <span className="truncate">{card.gmaps_url}</span>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            </a>
                          </div>
                        )}

                        <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-100">
                          <button
                            onClick={() => showQRCodeModal(card)}
                            className="flex-1 min-w-[110px] py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>QR Code</span>
                          </button>
                          <button
                            onClick={() => copyToClipboard(shortLink, card.card_id)}
                            className="flex-1 min-w-[110px] py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                          >
                            {copiedId === card.card_id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === card.card_id ? 'Disalin' : 'Salin URL'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setSetupCardId(card.card_id);
                              setSetupBusinessName(card.business_name || '');
                              setSetupMapsInput(card.gmaps_url || '');
                              setSetupSuccessData(null);
                              setCurrentView('client_setup');
                            }}
                            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <span>{card.business_name ? 'Edit Web Setup' : 'Setup Kartu Sekarang'}</span>
                          </button>
                          {card.is_active && (
                            <button
                              onClick={() => handleResetCard(card.card_id)}
                              className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Reset Kartu</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View: Table (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-4 px-6">ID Kartu</th>
                        <th className="py-4 px-6">Nama Bisnis</th>
                        <th className="py-4 px-6">Link Google Maps (Ulasan Bintang 5)</th>
                        <th className="py-4 px-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredCards.map((card) => {
                        const shortLink = `${window.location.origin}/r/${card.card_id}`;
                        return (
                          <tr key={card.card_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-6 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {card.card_id}
                            </td>
                            <td className="py-4 px-6 font-semibold text-slate-900">
                              {card.business_name ? (
                                <span>{card.business_name}</span>
                              ) : (
                                <span className="text-amber-700 bg-amber-50 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-normal">
                                  Belum Diisi (Kosong)
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {card.gmaps_url ? (
                                <a
                                  href={card.gmaps_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5 max-w-md truncate"
                                >
                                  <span className="truncate">{card.gmaps_url}</span>
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400 italic">— Belum ada link —</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => showQRCodeModal(card)}
                                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                  title="Lihat QR Code"
                                >
                                  <QrCode className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => copyToClipboard(shortLink, card.card_id)}
                                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                  title="Salin Link"
                                >
                                  {copiedId === card.card_id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => {
                                    setSetupCardId(card.card_id);
                                    setSetupBusinessName(card.business_name || '');
                                    setSetupMapsInput(card.gmaps_url || '');
                                    setSetupSuccessData(null);
                                    setCurrentView('client_setup');
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition shadow-xs"
                                >
                                  {card.business_name ? 'Edit Web Setup' : 'Setup Kartu'}
                                </button>
                                {card.is_active && (
                                  <button
                                    onClick={() => handleResetCard(card.card_id)}
                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="Reset Kartu"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* VIEW: PRINT QR GRID LAYOUT (A4 OPTIMIZED) */}
      {currentView === 'print_grid' && (
        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
          {/* Action bar (hidden on print) */}
          <div className="print:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Layout Cetak QR A4</h2>
              <p className="text-xs text-slate-500">Tata letak proporsional siap cetak untuk stiker atau kartu bisnis NFC.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('admin_dashboard')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition"
              >
                Kembali ke Dashboard
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Print A4</span>
              </button>
            </div>
          </div>

          {/* A4 Grid Container */}
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0">
            {generatingPrintQrs ? (
              <div className="p-16 text-center text-slate-400">Menyiapkan QR Code untuk dicetak...</div>
            ) : cards.length === 0 ? (
              <div className="p-16 text-center text-slate-400">Belum ada kartu untuk dicetak.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
                {cards.map((card) => (
                  <div key={card.card_id} className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center flex flex-col items-center justify-between bg-white print:border-slate-400 print:p-4 break-inside-avoid">
                    <div className="w-full flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold tracking-wider text-slate-900">TAPULASAN</span>
                      <span className="text-[11px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">
                        {card.card_id}
                      </span>
                    </div>

                    <div className="my-2 bg-white p-2 rounded-xl border border-slate-100 shadow-xs">
                      {printQrImages[card.card_id] ? (
                        <img src={printQrImages[card.card_id]} alt={card.card_id} className="w-36 h-36 mx-auto" />
                      ) : (
                        <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">Loading...</div>
                      )}
                    </div>

                    <div className="w-full mt-2 space-y-1">
                      <p className="text-[11px] font-bold text-slate-800">SCAN UNTUK BERI ULASAN ⭐⭐⭐⭐⭐</p>
                      <p className="text-[9px] text-slate-500 truncate">{card.business_name || 'Scan untuk Setup Bisnis'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* VIEW 4: DEDICATED PERSONAL SETUP / ACTIVATION WEB FOR EACH CARD (NFC / QR) */}
      {currentView === 'client_setup' && (
        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md font-bold text-xl">
                ⭐
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Aktivasi Kartu Ulasan Mandiri</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Web pribadi khusus kartu NFC &amp; Barcode Anda. Masukkan data bisnis untuk mengaktifkannya.
              </p>
            </div>

            {setupSuccessData ? (
              <div className="space-y-6">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto font-bold">✓</div>
                  <h3 className="font-bold text-emerald-900 text-base">Kartu Berhasil Diaktifkan!</h3>
                  <p className="text-xs text-emerald-700">Tautan ulasan bintang 5 Google Maps siap digunakan.</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Link Ulasan Bintang 5 Final
                  </label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 break-all select-all">
                    {setupSuccessData.review_url}
                  </div>
                  <button
                    onClick={() => copyToClipboard(setupSuccessData.review_url, 'success_link')}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-medium text-xs transition flex items-center justify-center gap-2"
                  >
                    {copiedId === 'success_link' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>Salin Link Ulasan</span>
                  </button>
                </div>

                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 uppercase">Simpan Link Rahasia Re-konfigurasi Ini!</h4>
                  <p className="text-xs text-amber-800">
                    Gunakan link rahasia di bawah ini jika di kemudian hari Anda ingin mengubah nama bisnis atau link Google Maps tanpa kehilangan kartu fisik:
                  </p>
                  <div className="p-2 bg-white border border-amber-200 rounded-lg font-mono text-[11px] text-slate-700 break-all select-all">
                    {window.location.origin}/setup/{setupSuccessData.card_id}?key={setupSuccessData.secret_key}
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => {
                      setSetupSuccessData(null);
                      setCurrentView(isAdminAuthenticated ? 'admin_dashboard' : 'landing');
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm"
                  >
                    Selesai &amp; Kembali
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveSetup} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    ID Kartu Unik (Terverifikasi Chip NFC / Barcode)
                  </label>
                  <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 flex items-center justify-between">
                    <span>{setupCardId}</span>
                    <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Siap Aktif
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Bisnis / Toko Anda
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kopi Kenangan Senja"
                    value={setupBusinessName}
                    onChange={(e) => setSetupBusinessName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Link Google Maps Bisnis Anda
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: https://maps.app.goo.gl/7VMqaV9GaiM5Uxc9A"
                    value={setupMapsInput}
                    onChange={(e) => {
                      setSetupMapsInput(e.target.value);
                      setPreviewReviewUrl('');
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500">
                      Sistem mendeteksi link Google Maps secara otomatis &amp; mengubahnya ke ulasan 5 bintang.
                    </p>
                    <button
                      type="button"
                      onClick={handleGenerateReviewLinkPreview}
                      disabled={generatingPreview}
                      className="shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{generatingPreview ? 'Generating...' : 'Generate Review Link'}</span>
                    </button>
                  </div>

                  {previewReviewUrl && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900">Review Link Berhasil Digenerate:</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(previewReviewUrl, 'preview_link')}
                          className="text-emerald-700 hover:text-emerald-900 underline font-mono text-[11px]"
                        >
                          {copiedId === 'preview_link' ? 'Disalin!' : 'Salin'}
                        </button>
                      </div>
                      <div className="font-mono text-slate-700 bg-white p-2 rounded border border-emerald-100 break-all select-all">
                        {previewReviewUrl}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={savingSetup}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-4 px-6 rounded-xl transition text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{savingSetup ? 'Memproses Aktivasi...' : 'Simpan & Aktifkan Kartu Sekarang'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      )}

      {/* QR CODE MODAL */}
      {selectedCardForQR && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">QR Code Kartu</h3>
            <p className="text-xs font-mono font-semibold text-indigo-600 mb-4">{selectedCardForQR.card_id}</p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mb-4 shadow-inner">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR Code" className="w-56 h-56 mx-auto rounded-lg" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">Memuat QR...</div>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-6">
              Scan untuk membuka halaman setup web pribadi atau redirect ulasan bisnis.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/r/${selectedCardForQR.card_id}`, selectedCardForQR.card_id)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl text-xs transition"
              >
                {copiedId === selectedCardForQR.card_id ? 'Link Disalin!' : 'Salin Short URL'}
              </button>
              <button
                onClick={() => setSelectedCardForQR(null)}
                className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH GENERATOR MODAL */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Generate Batch Kartu</h3>
                <p className="text-xs text-slate-500">Buat nomor ID kartu kosong baru secara massal.</p>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Prefix (Awalan)
                </label>
                <input
                  type="text"
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value)}
                  placeholder="CARD"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Jumlah Kartu
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={generatingBatch}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{generatingBatch ? 'Memproses Batch...' : 'Generate Kartu Massal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-500 mt-auto">
        <p>&copy; {new Date().getFullYear()} TapUlasan Platform. All rights reserved. Vercel Ready &amp; Standalone.</p>
      </footer>
    </div>
  );
}

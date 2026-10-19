/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Star,
  Settings,
  Zap,
  TrendingUp,
  MapPin,
  ChevronRight,
  Sliders,
  Download,
  Trash2,
  RotateCcw,
  Compass,
  FileCode2,
  Code2,
  CheckCheck,
  BarChart3,
  Globe2,
  Share2,
  ArrowUpRight,
  Info,
  Building2,
  FileSpreadsheet,
  Calculator
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

interface PlaceResult {
  input: string;
  name: string;
  category: string;
  address: string;
  place_id: string;
  cid_decimal: string;
  cid_hex: string;
  fid: string;
  maps_url_cid: string;
  maps_url_place_id: string;
  review_url: string;
  lat: number | string;
  lng: number | string;
  business_status: string;
  lookups_left: number;
  snippets: {
    curl: string;
    maps_embed: string;
    schema_json: string;
  };
}

export default function App() {
  // Navigation & View state: 'landing' | 'place_finder' | 'client_setup' | 'admin_login' | 'admin_dashboard' | 'print_grid'
  const [currentView, setCurrentView] = useState<'landing' | 'place_finder' | 'client_setup' | 'admin_login' | 'admin_dashboard' | 'print_grid'>('landing');

  // Place ID Finder State
  const [finderMode, setFinderMode] = useState<'single' | 'bulk'>('single');
  const [finderInput, setFinderInput] = useState('https://maps.app.goo.gl/yvPYFXEJcykFKrDYA');
  const [bulkInput, setBulkInput] = useState('https://maps.app.goo.gl/yvPYFXEJcykFKrDYA\nChIJXxIA0RaB5i0ReoMyHzOBqH4\n9126686701433029498');
  const [finderLoading, setFinderLoading] = useState(false);
  const [finderResult, setFinderResult] = useState<PlaceResult | null>(null);
  const [bulkResults, setBulkResults] = useState<PlaceResult[]>([]);
  const [finderError, setFinderError] = useState('');
  const [devSnippetTab, setDevSnippetTab] = useState<'curl' | 'embed' | 'schema'>('curl');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Modals for Place Finder Actions
  const [qrModalPlace, setQrModalPlace] = useState<PlaceResult | null>(null);
  const [qrPlaceDataUrl, setQrPlaceDataUrl] = useState<string>('');
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [rankModalOpen, setRankModalOpen] = useState(false);

  // Admin Auth state
  const [adminPin, setAdminPin] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  // Admin Dashboard data (strictly hidden until authenticated)
  const [adminCards, setAdminCards] = useState<Card[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminFilter, setAdminFilter] = useState<'all' | 'active' | 'unclaimed'>('all');

  // Customer Card Setup / Activation state
  const [setupCardIdInput, setSetupCardIdInput] = useState('');
  const [setupCardData, setSetupCardData] = useState<Card | null>(null);
  const [setupCardLoading, setSetupCardLoading] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupBusinessName, setSetupBusinessName] = useState('');
  const [setupMapsInput, setSetupMapsInput] = useState('');
  const [savingSetup, setSavingSetup] = useState(false);
  const [setupSuccessResult, setSetupSuccessResult] = useState<{
    card_id: string;
    business_name: string;
    review_url: string;
    setting_url: string;
  } | null>(null);
  const [setupQrDataUrl, setSetupQrDataUrl] = useState<string>('');

  // Batch generator modal (Admin)
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState('CARD');
  const [batchCount, setBatchCount] = useState(10);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  // QR Modal for single card (Admin)
  const [selectedCardForQR, setSelectedCardForQR] = useState<Card | null>(null);
  const [qrModalDataUrl, setQrModalDataUrl] = useState<string>('');

  // Print & Selection state (Admin)
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [printQrImages, setPrintQrImages] = useState<Record<string, string>>({});
  const [generatingPrintQrs, setGeneratingPrintQrs] = useState(false);
  const [printSource, setPrintSource] = useState<'all' | 'selected'>('all');

  // Interactive review growth calculator (Landing page)
  const [dailyCustomers, setDailyCustomers] = useState(60);
  const [tapConversionRate, setTapConversionRate] = useState(15);

  // General copied helper state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Check URL on initial load for routing
  useEffect(() => {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const cardIdFromQuery = urlParams.get('card_id') || urlParams.get('id');

    if (path === '/admn-log' || path === '/card/admn-log' || urlParams.get('view') === 'admn-log') {
      const savedPin = sessionStorage.getItem('tapulasan_admin_pin');
      if (savedPin === '*kewQkb:#sm') {
        setIsAdminAuthenticated(true);
        setCurrentView('admin_dashboard');
        fetchAdminCards('*kewQkb:#sm');
      } else {
        setCurrentView('admin_login');
      }
    } else if (path.startsWith('/setup/') || cardIdFromQuery) {
      const cardId = path.startsWith('/setup/') ? path.replace('/setup/', '').trim() : cardIdFromQuery || '';
      if (cardId) {
        setSetupCardIdInput(cardId);
        loadCustomerCard(cardId);
        setCurrentView('client_setup');
      }
    } else if (path === '/place-id-finder' || urlParams.get('tool') === 'place-finder') {
      setCurrentView('place_finder');
      handleFindPlace('https://maps.app.goo.gl/yvPYFXEJcykFKrDYA');
    }
  }, []);

  // Handle Find Place (Single)
  const handleFindPlace = async (targetInput?: string) => {
    const query = (targetInput ?? finderInput).trim();
    if (!query) {
      setFinderError('Silakan masukkan nama bisnis, link Google Maps, Place ID, atau CID.');
      return;
    }
    setFinderError('');
    setFinderLoading(true);

    try {
      const res = await fetch('/api/find-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFinderResult(data);
      } else {
        setFinderError(data.error || 'Gagal mencari Google Place ID untuk lokasi tersebut.');
      }
    } catch (err: any) {
      setFinderError('Terjadi kesalahan koneksi saat mencari Place ID.');
    } finally {
      setFinderLoading(false);
    }
  };

  // Handle Bulk Lookup
  const handleBulkLookup = async () => {
    const lines = bulkInput
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (lines.length === 0) {
      setFinderError('Masukkan setidaknya 1 link atau Place ID untuk bulk lookup.');
      return;
    }
    if (lines.length > 20) {
      setFinderError('Maksimal 20 lokasi dalam 1 kali proses.');
      return;
    }

    setFinderError('');
    setFinderLoading(true);

    try {
      const res = await fetch('/api/find-place/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: lines })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBulkResults(data.results || []);
      } else {
        setFinderError(data.error || 'Gagal memproses bulk lookup.');
      }
    } catch (err) {
      setFinderError('Terjadi kesalahan koneksi saat memproses bulk lookup.');
    } finally {
      setFinderLoading(false);
    }
  };

  // Generate Review QR code for place result
  const openPlaceQrModal = async (place: PlaceResult) => {
    setQrModalPlace(place);
    try {
      const url = await QRCode.toDataURL(place.review_url, {
        width: 480,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrPlaceDataUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  // Apply place details directly to TapUlasan Card Setup
  const applyPlaceToCardSetup = (place: PlaceResult) => {
    setSetupBusinessName(place.name);
    setSetupMapsInput(place.review_url);
    setCurrentView('client_setup');
  };

  // Customer Card Setup: Load Card Details
  const loadCustomerCard = async (cardId: string) => {
    if (!cardId.trim()) return;
    setSetupCardLoading(true);
    setSetupError('');
    setSetupSuccessResult(null);

    try {
      const res = await fetch(`/api/cards/${cardId.trim().toUpperCase()}`);
      if (res.ok) {
        const card: Card = await res.json();
        setSetupCardData(card);
        setSetupBusinessName(card.business_name || '');
        setSetupMapsInput(card.gmaps_url || '');
      } else {
        setSetupCardData(null);
        setSetupError('ID Kartu tidak ditemukan dalam sistem. Harap periksa kode kartu fisik Anda.');
      }
    } catch (e) {
      setSetupError('Gagal memuat informasi kartu. Pastikan koneksi internet stabil.');
    } finally {
      setSetupCardLoading(false);
    }
  };

  // Customer Card Setup: Save
  const handleSaveCustomerSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupCardData) return;
    if (!setupBusinessName.trim() || !setupMapsInput.trim()) {
      setSetupError('Nama Bisnis dan Link Google Maps / Ulasan wajib diisi.');
      return;
    }

    setSavingSetup(true);
    setSetupError('');

    try {
      const res = await fetch(`/api/cards/${setupCardData.card_id}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: setupBusinessName.trim(),
          gmaps_url: setupMapsInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const redirectUrl = `${window.location.origin}/r/${setupCardData.card_id}`;
        const qr = await QRCode.toDataURL(redirectUrl, {
          width: 400,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });

        setSetupQrDataUrl(qr);
        setSetupSuccessResult({
          card_id: setupCardData.card_id,
          business_name: setupBusinessName.trim(),
          review_url: data.review_url,
          setting_url: `${window.location.origin}${data.setting_url}`,
        });
        setSetupCardData(data.card);
      } else {
        setSetupError(data.error || 'Gagal menyimpan konfigurasi kartu.');
      }
    } catch (e: any) {
      setSetupError('Terjadi kesalahan jaringan: ' + e.message);
    } finally {
      setSavingSetup(false);
    }
  };

  // Admin Login Handler
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginLoading(true);
    setAdminLoginError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPin }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('tapulasan_admin_pin', adminPin);
        setIsAdminAuthenticated(true);
        setCurrentView('admin_dashboard');
        fetchAdminCards(adminPin);
      } else {
        setAdminLoginError(data.error || 'PIN Admin tidak valid.');
      }
    } catch (e) {
      setAdminLoginError('Gagal menghubungi server.');
    } finally {
      setAdminLoginLoading(false);
    }
  };

  // Admin Logout
  const handleAdminLogout = () => {
    sessionStorage.removeItem('tapulasan_admin_pin');
    setIsAdminAuthenticated(false);
    setAdminPin('');
    setAdminCards([]);
    setCurrentView('landing');
  };

  // Fetch Admin Cards
  const fetchAdminCards = async (pinToUse?: string) => {
    const pin = pinToUse || adminPin || sessionStorage.getItem('tapulasan_admin_pin') || '';
    if (!pin) return;

    setAdminLoading(true);
    try {
      const res = await fetch('/api/cards', {
        headers: { 'x-admin-pin': pin },
      });

      if (res.ok) {
        const data = await res.json();
        setAdminCards(data.cards || []);
      } else {
        if (res.status === 401) {
          handleAdminLogout();
        }
      }
    } catch (e) {
      console.error('Failed to fetch admin cards:', e);
    } finally {
      setAdminLoading(false);
    }
  };

  // Admin: Generate Batch Cards
  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = adminPin || sessionStorage.getItem('tapulasan_admin_pin') || '';
    if (!pin) return;

    setGeneratingBatch(true);
    try {
      const res = await fetch('/api/cards/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': pin,
        },
        body: JSON.stringify({
          prefix: batchPrefix,
          count: Number(batchCount),
          start: adminCards.length + 1,
        }),
      });

      if (res.ok) {
        setBatchModalOpen(false);
        await fetchAdminCards(pin);
      }
    } catch (e) {
      console.error('Batch generation failed:', e);
    } finally {
      setGeneratingBatch(false);
    }
  };

  // Admin: Reset Card
  const handleResetCard = async (cardId: string) => {
    if (!confirm(`Reset kartu ${cardId} ke status kosong belum teraktivasi?`)) return;
    const pin = adminPin || sessionStorage.getItem('tapulasan_admin_pin') || '';
    try {
      const res = await fetch(`/api/cards/${cardId}/reset`, {
        method: 'POST',
        headers: { 'x-admin-pin': pin },
      });
      if (res.ok) {
        fetchAdminCards(pin);
      }
    } catch (e) {
      console.error('Reset failed:', e);
    }
  };

  // Admin: Delete Card
  const handleDeleteCard = async (cardId: string) => {
    if (!confirm(`Hapus permanen kartu ${cardId} dari database?`)) return;
    const pin = adminPin || sessionStorage.getItem('tapulasan_admin_pin') || '';
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin },
      });
      if (res.ok) {
        fetchAdminCards(pin);
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // Admin: Open Single QR Modal
  const openCardQrModal = async (card: Card) => {
    setSelectedCardForQR(card);
    const redirectUrl = `${window.location.origin}/r/${card.card_id}`;
    try {
      const dataUrl = await QRCode.toDataURL(redirectUrl, {
        width: 480,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrModalDataUrl(dataUrl);
    } catch (err) {
      console.error(err);
    }
  };

  // Admin: Prepare Print Grid
  const preparePrintGrid = async (source: 'all' | 'selected') => {
    setPrintSource(source);
    setGeneratingPrintQrs(true);
    setCurrentView('print_grid');

    const cardsToPrint = source === 'selected'
      ? adminCards.filter(c => selectedCardIds.includes(c.card_id))
      : adminCards;

    const qrMap: Record<string, string> = {};
    for (const card of cardsToPrint) {
      try {
        const redirectUrl = `${window.location.origin}/r/${card.card_id}`;
        qrMap[card.card_id] = await QRCode.toDataURL(redirectUrl, {
          width: 256,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
      } catch (err) {
        console.error(err);
      }
    }

    setPrintQrImages(qrMap);
    setGeneratingPrintQrs(false);
  };

  // Filtered admin cards
  const filteredAdminCards = adminCards.filter((card) => {
    const matchesSearch =
      card.card_id.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
      (card.business_name && card.business_name.toLowerCase().includes(adminSearchTerm.toLowerCase()));

    if (adminFilter === 'active') return matchesSearch && card.is_active;
    if (adminFilter === 'unclaimed') return matchesSearch && !card.is_active;
    return matchesSearch;
  });

  // Export Bulk Results to CSV
  const exportBulkCsv = () => {
    if (bulkResults.length === 0) return;
    const headers = ['Business Name', 'Category', 'Place ID', 'CID (Decimal)', 'CID (Hex)', 'Google Review Link', 'Google Maps Link', 'Address', 'Status'];
    const rows = bulkResults.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.place_id}"`,
      `"${p.cid_decimal}"`,
      `"${p.cid_hex}"`,
      `"${p.review_url}"`,
      `"${p.maps_url_cid}"`,
      `"${p.address.replace(/"/g, '""')}"`,
      `"${p.business_status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Google_Place_ID_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // FAQ items for Place ID Finder
  const faqItems = [
    {
      q: 'Apa perbedaan antara Google Place ID, CID, dan Google Maps Link?',
      a: 'Place ID adalah string unik Google (contoh: ChIJXxIA0RaB5i0ReoMyHzOBqH4) yang digunakan di Google Places API dan URL ulasan langsung. CID (Customer Identification) adalah angka 64-bit unik tempat pada peta (contoh: 9126686701433029498). Maps Link adalah URL untuk navigasi ke tempat tersebut di Google Maps.'
    },
    {
      q: 'Bagaimana cara tool ini bekerja tanpa API Key Google?',
      a: 'Tool ini mengekstraksi dan mendekode struktur Feature ID (FID) 64-bit biner dan alamat protobuf Google Maps yang ditanamkan secara publik di redirect link Google Maps (seperti maps.app.goo.gl). Semua konversi dilakukan secara instan 100% akurat.'
    },
    {
      q: 'Bagaimana cara langsung membuat kartu ulasan NFC menggunakan Place ID ini?',
      a: 'Setelah Anda menyalin Place ID atau Google Review Link, Anda dapat langsung mengklik tombol "Terapkan ke Kartu TapUlasan Saya" atau menggunakan menu "Aktivasi Kartu" untuk langsung mengisi formulir review 5-bintang kartu NFC Anda.'
    },
    {
      q: 'Apakah bisa digunakan untuk tautan pendek maps.app.goo.gl?',
      a: 'Ya! Tautan pendek maps.app.goo.gl, g.page, goo.gl/maps, tautan koordinat, hingga nama bisnis langsung didukung penuh secara otomatis.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-amber-500/20 selection:text-amber-300">
      {/* Sleek Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#07090e]/85 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div 
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/10">
              <div className="w-full h-full bg-[#0d1019] rounded-[10px] flex items-center justify-center group-hover:bg-[#121624] transition-colors">
                <Radio className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  TapUlasan
                </span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium border border-amber-500/20">
                  NFC & Place ID
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">Smart Review & Tools</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setCurrentView('landing')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                currentView === 'landing'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => {
                setCurrentView('place_finder');
                if (!finderResult) handleFindPlace('https://maps.app.goo.gl/yvPYFXEJcykFKrDYA');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                currentView === 'place_finder'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Free Place ID Finder
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Free</span>
            </button>

            <button
              onClick={() => setCurrentView('client_setup')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                currentView === 'client_setup'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Aktivasi Kartu
            </button>

            {isAdminAuthenticated ? (
              <button
                onClick={() => setCurrentView('admin_dashboard')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  currentView === 'admin_dashboard' || currentView === 'print_grid'
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Panel
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('admin_login')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  currentView === 'admin_login'
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Admin Login
              </button>
            )}
          </nav>

          {/* Quick CTA */}
          <div className="flex items-center gap-2">
            {isAdminAuthenticated ? (
              <button
                onClick={handleAdminLogout}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Keluar
              </button>
            ) : (
              <button
                onClick={() => {
                  setCurrentView('place_finder');
                  if (!finderResult) handleFindPlace('https://maps.app.goo.gl/yvPYFXEJcykFKrDYA');
                }}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                Cari Place ID
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ========================================================================= */}
        {/* VIEW 1: FREE GOOGLE PLACE ID & CID FINDER (100% Free · No API key)       */}
        {/* ========================================================================= */}
        {currentView === 'place_finder' && (
          <div className="space-y-10">
            {/* Hero Header */}
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                100% Free · No API key required
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                Free Google Place ID Finder
              </h1>
              <p className="text-slate-300 text-base sm:text-lg">
                Search a business or paste a Google Maps link. Get its Place ID, CID, review link and coordinates, each ready to copy.
              </p>

              {/* Feature Highlights with unboxed typographic separators */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Place ID and CID in one lookup
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Works with Google Maps links, short ones too
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Bulk lookup of up to 20 places
                </span>
              </div>
            </div>

            {/* Finder Tool Box */}
            <div className="max-w-4xl mx-auto bg-[#0d101a] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Segmented Mode Selector: One Place vs Bulk */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => { setFinderMode('single'); setFinderError(''); }}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                      finderMode === 'single'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    One place
                  </button>
                  <button
                    onClick={() => { setFinderMode('bulk'); setFinderError(''); }}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                      finderMode === 'bulk'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Bulk (up to 20)
                  </button>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Lookups left: <strong className="text-slate-200">Unlimited</strong>
                </div>
              </div>

              {/* Error Alert */}
              {finderError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                  <span>{finderError}</span>
                </div>
              )}

              {/* MODE 1: SINGLE PLACE LOOKUP */}
              {finderMode === 'single' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">
                      Business, address, Google Maps link or Place ID
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={finderInput}
                          onChange={(e) => setFinderInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleFindPlace(); }}
                          placeholder="e.g. https://maps.app.goo.gl/yvPYFXEJcykFKrDYA or Ayam Geprek Kimo-Kimo"
                          className="w-full bg-[#131724] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                        {finderInput && (
                          <button
                            onClick={() => setFinderInput('')}
                            className="absolute right-3 top-3.5 text-xs text-slate-500 hover:text-slate-300"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleFindPlace()}
                        disabled={finderLoading}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      >
                        {finderLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Mencari...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            Find Place ID
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    Type a name and pick it from the list. You can also paste a Google Maps link (short <code className="text-amber-300/80">maps.app.goo.gl</code> links too), a g.page link, a Place ID or a CID.
                  </p>

                  {/* Quick Try Samples */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Coba contoh:</span>
                    <button
                      onClick={() => {
                        const sample = 'https://maps.app.goo.gl/yvPYFXEJcykFKrDYA';
                        setFinderInput(sample);
                        handleFindPlace(sample);
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                    >
                      Ayam Geprek Kimo-Kimo
                    </button>
                    <button
                      onClick={() => {
                        const sample = 'ChIJXxIA0RaB5i0ReoMyHzOBqH4';
                        setFinderInput(sample);
                        handleFindPlace(sample);
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                    >
                      ChIJXxIA0RaB5i0ReoMyHzOBqH4
                    </button>
                    <button
                      onClick={() => {
                        const sample = '9126686701433029498';
                        setFinderInput(sample);
                        handleFindPlace(sample);
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                    >
                      CID 9126686701433029498
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 2: BULK LOOKUP */}
              {finderMode === 'bulk' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">
                      Paste up to 20 Google Maps links, Place IDs, or CIDs (one per line):
                    </label>
                    <textarea
                      rows={5}
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      placeholder="https://maps.app.goo.gl/yvPYFXEJcykFKrDYA&#10;ChIJXxIA0RaB5i0ReoMyHzOBqH4&#10;9126686701433029498"
                      className="w-full bg-[#131724] border border-slate-700 rounded-xl p-4 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Total baris: {bulkInput.split('\n').filter(s => s.trim()).length} / 20
                    </span>
                    <button
                      onClick={handleBulkLookup}
                      disabled={finderLoading}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                    >
                      {finderLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                      Process Bulk Lookup
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SINGLE RESULT CARD */}
            {finderMode === 'single' && finderResult && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
                  {/* Result Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-1">
                        Your Place ID and CID
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                        {finderResult.name}
                      </h2>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-slate-300 font-medium">{finderResult.category}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span>{finderResult.address}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => applyPlaceToCardSetup(finderResult)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Terapkan ke Kartu TapUlasan
                      </button>
                      <button
                        onClick={() => openPlaceQrModal(finderResult)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-400" />
                        Buat QR Ulasan
                      </button>
                    </div>
                  </div>

                  {/* Key Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Place ID */}
                    <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-300">Place ID</span>
                          <button
                            onClick={() => copyToClipboard(finderResult.place_id, 'place_id')}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                          >
                            {copiedKey === 'place_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === 'place_id' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="font-mono text-sm text-white select-all break-all py-1">
                          {finderResult.place_id}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Google's ID for this place on Google Maps and in the Places API.
                      </p>
                    </div>

                    {/* 2. CID (decimal) */}
                    <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-300">CID (decimal)</span>
                          <button
                            onClick={() => copyToClipboard(finderResult.cid_decimal, 'cid_decimal')}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                          >
                            {copiedKey === 'cid_decimal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === 'cid_decimal' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="font-mono text-sm text-white select-all break-all py-1">
                          {finderResult.cid_decimal}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        The number Google Maps uses in ?cid= links. Google Search links call it ludocid.
                      </p>
                    </div>

                    {/* 3. CID (hex) */}
                    <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-300">CID (hex)</span>
                          <button
                            onClick={() => copyToClipboard(finderResult.cid_hex, 'cid_hex')}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                          >
                            {copiedKey === 'cid_hex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === 'cid_hex' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="font-mono text-sm text-white select-all break-all py-1">
                          {finderResult.cid_hex}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        The same CID in hexadecimal: the part after the colon in the feature ID.
                      </p>
                    </div>

                    {/* 4. Google Maps link (CID) */}
                    <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-300">Google Maps link (CID)</span>
                          <div className="flex items-center gap-3">
                            <a
                              href={finderResult.maps_url_cid}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-slate-300 hover:text-white font-medium flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Open
                            </a>
                            <button
                              onClick={() => copyToClipboard(finderResult.maps_url_cid, 'maps_url_cid')}
                              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                            >
                              {copiedKey === 'maps_url_cid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedKey === 'maps_url_cid' ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                        <div className="font-mono text-xs text-slate-300 truncate py-1">
                          {finderResult.maps_url_cid}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Opens this listing on Google Maps.
                      </p>
                    </div>

                    {/* 5. Google Maps link (Place ID) */}
                    <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-300">Google Maps link (Place ID)</span>
                          <div className="flex items-center gap-3">
                            <a
                              href={finderResult.maps_url_place_id}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-slate-300 hover:text-white font-medium flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Open
                            </a>
                            <button
                              onClick={() => copyToClipboard(finderResult.maps_url_place_id, 'maps_url_place_id')}
                              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                            >
                              {copiedKey === 'maps_url_place_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedKey === 'maps_url_place_id' ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                        <div className="font-mono text-xs text-slate-300 truncate py-1">
                          {finderResult.maps_url_place_id}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Opens the same place on Google Maps by its Place ID.
                      </p>
                    </div>

                    {/* 6. Google review link (Direct 5-Star) */}
                    <div className="bg-[#121624] p-4 rounded-xl border border-amber-500/30 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            Google review link
                          </span>
                          <div className="flex items-center gap-3">
                            <a
                              href={finderResult.review_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-slate-300 hover:text-white font-medium flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Open
                            </a>
                            <button
                              onClick={() => copyToClipboard(finderResult.review_url, 'review_url')}
                              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                            >
                              {copiedKey === 'review_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedKey === 'review_url' ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                        <div className="font-mono text-xs text-amber-200 truncate py-1">
                          {finderResult.review_url}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Opens Google's review form for this place. Reviewers need to be signed in to a Google Account.
                      </p>
                    </div>

                    {/* 7. Latitude, longitude */}
                    <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-300">Latitude, longitude</span>
                          <button
                            onClick={() => copyToClipboard(`${finderResult.lat}, ${finderResult.lng}`, 'coordinates')}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                          >
                            {copiedKey === 'coordinates' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === 'coordinates' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="font-mono text-sm text-white py-1">
                          {finderResult.lat}, {finderResult.lng}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Where Google puts the pin for this place.
                      </p>
                    </div>

                    {/* 8. Address */}
                    <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-300">Address</span>
                          <button
                            onClick={() => copyToClipboard(finderResult.address, 'address')}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                          >
                            {copiedKey === 'address' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === 'address' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="text-xs text-slate-200 line-clamp-2 py-1">
                          {finderResult.address}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        The address as Google formats it.
                      </p>
                    </div>

                    {/* 9. Category */}
                    <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-300">Category</span>
                          <button
                            onClick={() => copyToClipboard(finderResult.category, 'category')}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                          >
                            {copiedKey === 'category' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === 'category' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="text-sm font-semibold text-white py-1">
                          {finderResult.category}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        The category Google Maps shows for this place.
                      </p>
                    </div>

                    {/* 10. Business status */}
                    <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-300">Business status</span>
                          <button
                            onClick={() => copyToClipboard(finderResult.business_status, 'business_status')}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                          >
                            {copiedKey === 'business_status' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === 'business_status' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 py-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-sm font-semibold text-emerald-400">{finderResult.business_status}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Whether Google lists the business as open or closed.
                      </p>
                    </div>

                    {/* 11. Feature ID (FID) */}
                    <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 flex flex-col justify-between md:col-span-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-300">Feature ID (FID)</span>
                          <button
                            onClick={() => copyToClipboard(finderResult.fid, 'fid')}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                          >
                            {copiedKey === 'fid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === 'fid' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="font-mono text-xs text-slate-300 py-1 break-all select-all">
                          {finderResult.fid}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        The 0x…:0x… pair you see inside long Google Maps links.
                      </p>
                    </div>
                  </div>

                  {/* Quota & Email info banner */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Lookups left: <strong className="text-slate-200">6</strong>. A used lookup comes back 24 hours after you used it.</span>
                    </div>
                    <button
                      onClick={() => alert(`Informasi ID untuk "${finderResult.name}" siap disalin langsung ke clipboard.`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    >
                      Email me these IDs
                    </button>
                  </div>
                </div>

                {/* NEXT STEPS FOR THIS BUSINESS */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Next steps for this business
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Step 1: Make a review QR code */}
                    <div className="bg-[#0e121e] border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-sm text-white">Get a review QR code</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Make a free, print-ready QR code that opens this business's Google review form directly.
                        </p>
                      </div>
                      <button
                        onClick={() => openPlaceQrModal(finderResult)}
                        className="mt-4 w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        Make a review QR code
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Step 2: Run the free GBP audit */}
                    <div className="bg-[#0e121e] border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-sm text-white">Run the free GBP audit</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Check profile score on 32 checks plus a Google policy scan for this place listing.
                        </p>
                      </div>
                      <button
                        onClick={() => setAuditModalOpen(true)}
                        className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        Run the free audit
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Step 3: Check Maps ranking */}
                    <div className="bg-[#0e121e] border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-sm text-white">Check Maps ranking</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          See where it ranks in Google Maps search results around {finderResult.name}.
                        </p>
                      </div>
                      <button
                        onClick={() => setRankModalOpen(true)}
                        className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        Check its Maps ranking
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* FOR DEVELOPERS SECTION */}
                <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Code2 className="w-5 h-5 text-amber-400" />
                        For developers
                      </h3>
                      <p className="text-xs text-slate-400">
                        Use this place in Google's APIs or in your website schema markup. Replace YOUR_API_KEY with your own key.
                      </p>
                    </div>

                    {/* Segmented Code Tabs */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                      <button
                        onClick={() => setDevSnippetTab('curl')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          devSnippetTab === 'curl' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Places API (New)
                      </button>
                      <button
                        onClick={() => setDevSnippetTab('embed')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          devSnippetTab === 'embed' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Maps Embed
                      </button>
                      <button
                        onClick={() => setDevSnippetTab('schema')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          devSnippetTab === 'schema' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Schema hasMap
                      </button>
                    </div>
                  </div>

                  {/* Code Snippet Box */}
                  <div className="relative bg-[#07090e] border border-slate-800 rounded-xl p-4 font-mono text-xs text-amber-200 overflow-x-auto">
                    <button
                      onClick={() => {
                        const content =
                          devSnippetTab === 'curl'
                            ? finderResult.snippets.curl
                            : devSnippetTab === 'embed'
                            ? finderResult.snippets.maps_embed
                            : finderResult.snippets.schema_json;
                        copyToClipboard(content, 'dev_snippet');
                      }}
                      className="absolute top-3 right-3 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-[11px] font-sans flex items-center gap-1 border border-slate-700 transition-colors"
                    >
                      {copiedKey === 'dev_snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'dev_snippet' ? 'Copied' : 'Copy'}
                    </button>
                    <pre className="pr-16 leading-relaxed">
                      {devSnippetTab === 'curl' && finderResult.snippets.curl}
                      {devSnippetTab === 'embed' && finderResult.snippets.maps_embed}
                      {devSnippetTab === 'schema' && finderResult.snippets.schema_json}
                    </pre>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    The fields in X-Goog-FieldMask set the price of the call. Google doesn't charge for a request that asks for the id field only, and recommends one to refresh Place IDs older than 12 months.
                  </p>
                </div>
              </div>
            )}

            {/* BULK RESULTS TABLE */}
            {finderMode === 'bulk' && bulkResults.length > 0 && (
              <div className="max-w-5xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    Bulk Lookup Results ({bulkResults.length} places)
                  </h3>
                  <button
                    onClick={exportBulkCsv}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export to CSV
                  </button>
                </div>

                <div className="bg-[#0e121e] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#121624] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-3.5 px-4 font-semibold">Business Name</th>
                          <th className="py-3.5 px-4 font-semibold">Place ID</th>
                          <th className="py-3.5 px-4 font-semibold">CID (Decimal)</th>
                          <th className="py-3.5 px-4 font-semibold">Review Link</th>
                          <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {bulkResults.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-3 px-4 font-sans font-medium text-white max-w-[200px] truncate">
                              {item.name}
                              <div className="text-[10px] text-slate-500 truncate">{item.address}</div>
                            </td>
                            <td className="py-3 px-4 text-amber-300">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate max-w-[130px]">{item.place_id || 'N/A'}</span>
                                {item.place_id && (
                                  <button
                                    onClick={() => copyToClipboard(item.place_id, `bulk_pid_${idx}`)}
                                    className="text-slate-400 hover:text-amber-400"
                                  >
                                    {copiedKey === `bulk_pid_${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate max-w-[120px]">{item.cid_decimal || 'N/A'}</span>
                                {item.cid_decimal && (
                                  <button
                                    onClick={() => copyToClipboard(item.cid_decimal, `bulk_cid_${idx}`)}
                                    className="text-slate-400 hover:text-amber-400"
                                  >
                                    {copiedKey === `bulk_cid_${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {item.review_url ? (
                                <a
                                  href={item.review_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-400 hover:underline flex items-center gap-1 font-sans"
                                >
                                  Test Review <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-sans">
                              <button
                                onClick={() => applyPlaceToCardSetup(item)}
                                className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-medium border border-amber-500/20 transition-colors"
                              >
                                Terapkan ke Kartu
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* HOW IT WORKS (3 STEPS) */}
            <div className="max-w-4xl mx-auto space-y-4 pt-4">
              <h3 className="text-xl font-bold text-white text-center">How it works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0d101a] border border-slate-800 rounded-xl p-5 space-y-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                    1
                  </div>
                  <h4 className="font-bold text-sm text-white">Search or paste a link</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Type a business name and city, or an address. Or paste a Google Maps link, a Place ID or a CID.
                  </p>
                </div>
                <div className="bg-[#0d101a] border border-slate-800 rounded-xl p-5 space-y-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <h4 className="font-bold text-sm text-white">Pick the right place</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Instantly extract and verify the name, address, and coordinates on the result card.
                  </p>
                </div>
                <div className="bg-[#0d101a] border border-slate-800 rounded-xl p-5 space-y-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                    3
                  </div>
                  <h4 className="font-bold text-sm text-white">Copy what you need</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Copy the Place ID, the CID, a Google Maps link or the review link. Each value has its own copy button.
                  </p>
                </div>
              </div>
            </div>

            {/* COMPARISON TABLE: Place ID vs CID vs Maps link vs review link */}
            <div className="max-w-4xl mx-auto space-y-4 pt-6">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">
                  Place ID vs CID vs Maps link vs review link
                </h3>
                <p className="text-xs text-slate-400">
                  A Place ID is the text code Google uses to identify one place on Google Maps and in its Places API.
                </p>
              </div>

              <div className="bg-[#0d101a] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121624] text-slate-300 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">What it looks like</th>
                        <th className="py-3 px-4">Where you see it</th>
                        <th className="py-3 px-4">What it's for</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      <tr>
                        <td className="py-3 px-4 font-bold text-amber-400 whitespace-nowrap">Place ID</td>
                        <td className="py-3 px-4 font-mono text-slate-200">ChIJgUbEo8cfqokR5lP9_Wh_DaM</td>
                        <td className="py-3 px-4 text-slate-400">Google's Place ID finder, Places API responses and Business Profile APIs.</td>
                        <td className="py-3 px-4">Places API calls, Maps embeds, review links, rank trackers and review widgets.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-bold text-amber-400 whitespace-nowrap">CID (ludocid)</td>
                        <td className="py-3 px-4 font-mono text-slate-200">11749187091794056166</td>
                        <td className="py-3 px-4 text-slate-400">Google Maps links with ?cid=, and Google Search links as ludocid.</td>
                        <td className="py-3 px-4">A Google Maps link that opens the listing. Some local SEO tools ask for it.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-bold text-amber-400 whitespace-nowrap">Feature ID (FID)</td>
                        <td className="py-3 px-4 font-mono text-slate-200">0x89aa1fc7a3c44681:0xa30d7f68fdfd53e6</td>
                        <td className="py-3 px-4 text-slate-400">Inside long Google Maps links, after !1s.</td>
                        <td className="py-3 px-4">Finding the CID by hand: the part after the colon is the CID in hex.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-bold text-amber-400 whitespace-nowrap">Google Maps link</td>
                        <td className="py-3 px-4 font-mono text-slate-200">https://maps.app.goo.gl/…</td>
                        <td className="py-3 px-4 text-slate-400">The Share button in Google Maps, or your browser's address bar.</td>
                        <td className="py-3 px-4">Sending someone to the listing. Long Maps link holds the feature ID.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-bold text-amber-400 whitespace-nowrap">Review link</td>
                        <td className="py-3 px-4 font-mono text-slate-200 truncate max-w-[200px]">https://search.google.com/local/writereview?placeid=...</td>
                        <td className="py-3 px-4 text-slate-400">Built from Place ID. Owners get short link under Get more reviews.</td>
                        <td className="py-3 px-4">Asking customers for a review by NFC card, email, text or QR code.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* EDUCATIONAL GUIDES */}
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="bg-[#0d101a] border border-slate-800 rounded-xl p-6 space-y-3">
                <h4 className="font-bold text-base text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  How to find a Google Place ID without this tool
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  A Google Maps link doesn't show the Place ID directly in the browser address bar. Usually, you must open Google's developer documentation page, create a Google Cloud Project, enable Places API (New), or use Text Search. With this free tool, you don't need any API key or billing account.
                </p>
              </div>

              <div className="bg-[#0d101a] border border-slate-800 rounded-xl p-6 space-y-3">
                <h4 className="font-bold text-base text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  How to find the CID of a Google Business Profile
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The CID is a 64-bit integer. In a desktop browser, you look after <code className="text-amber-300">!1s</code> for two hexadecimal numbers (like <code className="text-amber-300">0x7ea881331f32837a</code>) and convert that hex value to decimal. Our tool calculates this automatically in milliseconds!
                </p>
              </div>
            </div>

            {/* FAQ ACCORDION */}
            <div className="max-w-4xl mx-auto space-y-3 pt-6">
              <h3 className="text-xl font-bold text-white">Frequently Asked Questions</h3>
              <div className="space-y-2">
                {faqItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#0d101a] border border-slate-800 rounded-xl overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between text-xs font-semibold text-white hover:text-amber-400"
                    >
                      <span>{item.q}</span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${activeFaq === idx ? 'rotate-90 text-amber-400' : 'text-slate-500'}`} />
                    </button>
                    {activeFaq === idx && (
                      <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: LANDING DASHBOARD (Clean Informative, Obsidian Black, No Cards)    */}
        {/* ========================================================================= */}
        {currentView === 'landing' && (
          <div className="space-y-16">
            {/* Hero Section */}
            <div className="relative pt-6 pb-12 text-center max-w-4xl mx-auto space-y-6">
              <div className="absolute inset-0 -top-20 flex items-center justify-center pointer-events-none">
                <div className="w-[500px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full" />
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Solusi Cerdas Ulasan Google Bisnis Tanpa Ribet
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                Tingkatkan Ulasan Bintang 5{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
                  Hanya Dalam 3 Detik
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Platform kartu ulasan pintar berbasis <strong>NFC & Barcode QR mandiri</strong>. Pelanggan cukup menempelkan smartphone atau scan kamera, dialog ulasan Google langsung terbuka!
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setCurrentView('place_finder');
                    handleFindPlace('https://maps.app.goo.gl/yvPYFXEJcykFKrDYA');
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  Cari Google Place ID Bisnis Anda
                </button>
                <button
                  onClick={() => setCurrentView('client_setup')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-amber-400" />
                  Aktivasi / Setting Kartu Saya
                </button>
              </div>

              {/* Quick Info Bar */}
              <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Tanpa Biaya Langganan Bulanan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Kompatibel iPhone & Android</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Data Kartu Privat & Aman</span>
                </div>
              </div>
            </div>

            {/* Visual Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">1 Tap Langsung Terbuka</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pelanggan tidak perlu mengetik nama restoran atau toko Anda di Google Search. Cukup tap kartu NFC, dialog review bintang 5 langsung siap diisi.
                </p>
              </div>

              <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Dual NFC + Barcode QR</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dilengkapi QR code dinamis beresolusi tinggi di bagian belakang. Ponsel tanpa fitur NFC tetap bisa scan dengan cepat lewat kamera.
                </p>
              </div>

              <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Place ID Finder Gratis</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Bingung mencari link ulasan langsung bisnis Anda? Gunakan fitur bawaan Place ID Finder kami untuk mengekstrak CID, Place ID, dan direct link ulasan tanpa API key!
                </p>
              </div>
            </div>

            {/* Interactive Calculator Section */}
            <div className="max-w-4xl mx-auto bg-[#0d101a] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
                    Simulasi Pertumbuhan Ulasan
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Berapa Potensi Ulasan Bintang 5 Bisnis Anda?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Sesuaikan jumlah pengunjung harian toko/restoran Anda untuk melihat proyeksi review.
                  </p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 rounded-xl text-center">
                  <div className="text-2xl font-extrabold text-amber-400">
                    +{Math.round((dailyCustomers * (tapConversionRate / 100)) * 30)}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Review Baru / Bulan</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Pengunjung Harian:</span>
                    <strong className="text-amber-400">{dailyCustomers} orang / hari</strong>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="5"
                    value={dailyCustomers}
                    onChange={(e) => setDailyCustomers(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>10 orang</span>
                    <span>150 orang</span>
                    <span>300 orang</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Tingkat Tap & Review:</span>
                    <strong className="text-emerald-400">{tapConversionRate}% konversi</strong>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={tapConversionRate}
                    onChange={(e) => setTapConversionRate(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>5% (konservatif)</span>
                    <span>15% (rata-rata)</span>
                    <span>40% (optimal)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Access Portals Bar */}
            <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setCurrentView('client_setup')}
                className="bg-[#0e121e] border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                    <Settings className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors">
                  Aktivasi Kartu Pelanggan
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Punya kartu fisik? Masukkan ID kartu Anda di sini untuk mengaktifkan tautan Google Maps bisnis Anda.
                </p>
              </div>

              <div
                onClick={() => setCurrentView('admin_login')}
                className="bg-[#0e121e] border border-slate-800 hover:border-slate-700 rounded-2xl p-6 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 mb-3 group-hover:scale-110 transition-transform">
                    <Lock className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="font-bold text-base text-white">
                  Portal Admin Inventaris
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Area terlindungi bagi pengelola untuk batch kartu, pencetakan QR sticker, dan monitoring scan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: CLIENT / CUSTOMER CARD SETUP (Self-Service Activation)            */}
        {/* ========================================================================= */}
        {currentView === 'client_setup' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                <Settings className="w-3.5 h-3.5" />
                Pengaturan Kartu Mandiri
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Aktivasi Kartu TapUlasan Anda
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Masukkan kode ID yang tertera pada kartu fisik Anda untuk menghubungkannya ke formulir ulasan Google.
              </p>
            </div>

            {/* Error notification */}
            {setupError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                <span>{setupError}</span>
              </div>
            )}

            {/* Step 1: Input Card ID */}
            {!setupCardData && !setupSuccessResult && (
              <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Masukkan Kode ID Kartu Fisik:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: CARD-001"
                      value={setupCardIdInput}
                      onChange={(e) => setSetupCardIdInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === 'Enter') loadCustomerCard(setupCardIdInput); }}
                      className="flex-1 bg-[#121624] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => loadCustomerCard(setupCardIdInput)}
                      disabled={setupCardLoading || !setupCardIdInput.trim()}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                    >
                      {setupCardLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Cek Kartu'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Kode ID tertera di bagian belakang kartu fisik TapUlasan atau stiker barcode Anda.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Edit & Save Card Form */}
            {setupCardData && !setupSuccessResult && (
              <form onSubmit={handleSaveCustomerSetup} className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider">Kartu Terpilih</span>
                    <h3 className="text-lg font-bold text-amber-400 font-mono">{setupCardData.card_id}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSetupCardData(null); setSetupError(''); }}
                    className="text-xs text-slate-400 hover:text-slate-200 underline"
                  >
                    Ganti Kartu
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Bisnis / Toko / Restoran Anda:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ayam Geprek Kimo-Kimo"
                    value={setupBusinessName}
                    onChange={(e) => setSetupBusinessName(e.target.value)}
                    className="w-full bg-[#121624] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Link Google Maps, Place ID, atau Link Ulasan:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('place_finder');
                        handleFindPlace(setupBusinessName || 'https://maps.app.goo.gl/yvPYFXEJcykFKrDYA');
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <Search className="w-3 h-3" /> Cari via Place ID Finder
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Paste link: https://maps.app.goo.gl/... atau ChIJ..."
                    value={setupMapsInput}
                    onChange={(e) => setSetupMapsInput(e.target.value)}
                    className="w-full bg-[#121624] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Sistem kami otomatis mengubah tautan Google Maps Anda menjadi URL dialog review bintang 5 resmi Google.
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={savingSetup}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {savingSetup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Simpan Pengaturan Kartu
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: SUCCESS RESULT DISPLAY (Per User Requirement) */}
            {setupSuccessResult && (
              <div className="bg-[#0e121e] border border-emerald-500/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-white">Kartu Anda Berhasil Diatur!</h3>
                  <p className="text-xs text-slate-400">
                    Kartu fisik ID <strong className="text-white font-mono">{setupSuccessResult.card_id}</strong> kini telah terhubung ke ulasan bisnis Anda.
                  </p>
                </div>

                {/* QR Code and Details Card */}
                <div className="bg-[#121624] p-6 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center gap-6">
                  {setupQrDataUrl && (
                    <div className="shrink-0 p-3 bg-white rounded-xl shadow-lg text-center">
                      <img src={setupQrDataUrl} alt="QR Code" className="w-36 h-36 mx-auto" />
                      <a
                        href={setupQrDataUrl}
                        download={`QR_${setupSuccessResult.card_id}.png`}
                        className="mt-2 text-[10px] text-slate-900 font-bold block hover:underline"
                      >
                        Download PNG
                      </a>
                    </div>
                  )}

                  <div className="flex-1 space-y-3 w-full">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Nama Bisnis</div>
                      <div className="text-base font-bold text-white">{setupSuccessResult.business_name}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Target Ulasan Google</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <input
                          type="text"
                          readOnly
                          value={setupSuccessResult.review_url}
                          className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 flex-1 font-mono truncate"
                        />
                        <button
                          onClick={() => copyToClipboard(setupSuccessResult.review_url, 'success_rev')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded text-amber-400 flex items-center gap-1 font-medium"
                        >
                          {copiedKey === 'success_rev' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <a
                          href={setupSuccessResult.review_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-300 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Test
                        </a>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Tautan Rahasia Web Setting Kartu</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <input
                          type="text"
                          readOnly
                          value={setupSuccessResult.setting_url}
                          className="bg-slate-900 border border-slate-800 text-xs text-amber-300 rounded px-2.5 py-1.5 flex-1 font-mono truncate"
                        />
                        <button
                          onClick={() => copyToClipboard(setupSuccessResult.setting_url, 'success_set')}
                          className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-xs rounded text-amber-300 flex items-center gap-1 font-bold"
                        >
                          {copiedKey === 'success_set' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Salin
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Simpan tautan rahasia ini jika sewaktu-waktu Anda ingin mengubah nama atau link maps toko Anda.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setSetupSuccessResult(null);
                      setSetupCardData(null);
                      setSetupCardIdInput('');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                  >
                    Atur Kartu Lainnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: ADMIN LOGIN (Requires '*kewQkb:#sm')                              */}
        {/* ========================================================================= */}
        {currentView === 'admin_login' && (
          <div className="max-w-md mx-auto space-y-6 pt-10">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 mx-auto flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">Login Admin TapUlasan</h2>
              <p className="text-xs text-slate-400">
                Masukkan PIN Administrator untuk membuka manajemen kartu dan data scan.
              </p>
            </div>

            {adminLoginError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{adminLoginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password / PIN Admin:
                </label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan password admin"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full bg-[#121624] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoginLoading || !adminPin}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {adminLoginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                Buka Panel Admin
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: ADMIN DASHBOARD (Strictly Protected)                              */}
        {/* ========================================================================= */}
        {currentView === 'admin_dashboard' && isAdminAuthenticated && (
          <div className="space-y-6">
            {/* Top Admin Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  Admin Autentikasi Aktif
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Manajemen Inventaris Kartu NFC
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => fetchAdminCards()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setBatchModalOpen(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Batch Kartu Baru
                </button>
                <button
                  onClick={() => preparePrintGrid('all')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  Cetak Lembar QR
                </button>
              </div>
            </div>

            {/* Overview Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0e121e] border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Total Kartu</div>
                <div className="text-2xl font-black text-white mt-1">{adminCards.length}</div>
              </div>
              <div className="bg-[#0e121e] border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-emerald-400 font-medium">Teraktivasi</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {adminCards.filter(c => c.is_active).length}
                </div>
              </div>
              <div className="bg-[#0e121e] border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Belum Diatur</div>
                <div className="text-2xl font-black text-slate-400 mt-1">
                  {adminCards.filter(c => !c.is_active).length}
                </div>
              </div>
              <div className="bg-[#0e121e] border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-amber-400 font-medium">Total Scan Tap</div>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {adminCards.reduce((sum, c) => sum + c.scan_count, 0)}
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0e121e] p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => setAdminFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    adminFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua ({adminCards.length})
                </button>
                <button
                  onClick={() => setAdminFilter('active')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    adminFilter === 'active' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Aktif ({adminCards.filter(c => c.is_active).length})
                </button>
                <button
                  onClick={() => setAdminFilter('unclaimed')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    adminFilter === 'unclaimed' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Belum Diatur ({adminCards.filter(c => !c.is_active).length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari ID atau nama bisnis..."
                  value={adminSearchTerm}
                  onChange={(e) => setAdminSearchTerm(e.target.value)}
                  className="w-full bg-[#121624] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Admin Cards Table */}
            <div className="bg-[#0e121e] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121624] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Card ID</th>
                      <th className="py-3 px-4">Bisnis Pelanggan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Scan</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredAdminCards.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          {adminCards.length === 0 ? (
                            <div className="space-y-3">
                              <p>Database kartu masih kosong.</p>
                              <button
                                onClick={() => setBatchModalOpen(true)}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                              >
                                Buat Batch Kartu Pertama
                              </button>
                            </div>
                          ) : (
                            'Tidak ada kartu yang cocok dengan kriteria filter.'
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredAdminCards.map((card) => (
                        <tr key={card.card_id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            {card.card_id}
                          </td>
                          <td className="py-3 px-4">
                            {card.business_name ? (
                              <div>
                                <div className="font-semibold text-white">{card.business_name}</div>
                                {card.gmaps_url && (
                                  <a
                                    href={card.gmaps_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-slate-400 hover:text-amber-400 truncate max-w-xs block"
                                  >
                                    {card.gmaps_url}
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Belum diaktivasi</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {card.is_active ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-slate-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                Menunggu Setup
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-white">
                            {card.scan_count}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openCardQrModal(card)}
                                title="Lihat & Download QR"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                              {card.is_active && (
                                <button
                                  onClick={() => handleResetCard(card.card_id)}
                                  title="Reset ke Kosong"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteCard(card.card_id)}
                                title="Hapus Kartu"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 6: PRINT GRID (Admin Print Ready QR Sticker Sheets)                  */}
        {/* ========================================================================= */}
        {currentView === 'print_grid' && isAdminAuthenticated && (
          <div className="space-y-6">
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <button
                  onClick={() => setCurrentView('admin_dashboard')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-1"
                >
                  ← Kembali ke Admin Dashboard
                </button>
                <h2 className="text-2xl font-bold text-white">Lembar Siap Cetak Stiker QR</h2>
              </div>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg"
              >
                <Printer className="w-4 h-4" />
                Cetak Dokumen (Ctrl + P)
              </button>
            </div>

            {generatingPrintQrs ? (
              <div className="text-center py-20 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                Membuat QR resolusi tinggi untuk seluruh kartu...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 bg-white text-slate-900 rounded-2xl">
                {adminCards.map((card) => (
                  <div
                    key={card.card_id}
                    className="border-2 border-dashed border-slate-300 p-4 rounded-xl text-center flex flex-col items-center justify-between"
                  >
                    <div className="text-xs font-black tracking-wider text-slate-900 uppercase">
                      TapUlasan
                    </div>
                    {printQrImages[card.card_id] && (
                      <img
                        src={printQrImages[card.card_id]}
                        alt={card.card_id}
                        className="w-32 h-32 my-2"
                      />
                    )}
                    <div className="font-mono text-xs font-bold text-slate-900">
                      {card.card_id}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1">
                      Scan kamera / Tap NFC
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODALS SECTION                                                            */}
      {/* ========================================================================= */}

      {/* 1. Batch Generate Modal (Admin) */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e121e] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Generate Batch Kartu Baru</h3>
            <p className="text-xs text-slate-400">
              Buat kumpulan ID kartu unik secara instan untuk ditempelkan pada fisik kartu NFC Anda.
            </p>

            <form onSubmit={handleGenerateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Prefix Kartu:</label>
                <input
                  type="text"
                  required
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                  className="w-full bg-[#121624] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Jumlah Kartu:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="w-full bg-[#121624] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={generatingBatch}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  {generatingBatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Generate Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Admin Single Card QR Modal */}
      {selectedCardForQR && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e121e] border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
            <h3 className="text-base font-bold text-white font-mono">{selectedCardForQR.card_id}</h3>
            <p className="text-xs text-slate-400">
              {selectedCardForQR.business_name || 'Kartu belum diaktivasi (akan membuka setting).'}
            </p>

            {qrModalDataUrl && (
              <div className="p-4 bg-white rounded-xl inline-block shadow-lg">
                <img src={qrModalDataUrl} alt={selectedCardForQR.card_id} className="w-48 h-48 mx-auto" />
              </div>
            )}

            <div className="flex gap-2 justify-center pt-2">
              {qrModalDataUrl && (
                <a
                  href={qrModalDataUrl}
                  download={`QR_${selectedCardForQR.card_id}.png`}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              )}
              <button
                onClick={() => setSelectedCardForQR(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Place Finder: Review QR Modal */}
      {qrModalPlace && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e121e] border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{qrModalPlace.name}</h3>
              <p className="text-xs text-slate-400 mt-1">Print-ready Google Review QR Code</p>
            </div>

            {qrPlaceDataUrl && (
              <div className="p-4 bg-white rounded-2xl inline-block shadow-xl">
                <img src={qrPlaceDataUrl} alt={qrModalPlace.name} className="w-52 h-52 mx-auto" />
              </div>
            )}

            <div className="space-y-2">
              <a
                href={qrPlaceDataUrl}
                download={`Review_QR_${qrModalPlace.name.replace(/\s+/g, '_')}.png`}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md"
              >
                <Download className="w-4 h-4" /> Download PNG Print
              </a>
              <button
                onClick={() => setQrModalPlace(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. GBP Audit Simulation Modal */}
      {auditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e121e] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Google Business Profile Audit
              </h3>
              <button onClick={() => setAuditModalOpen(false)} className="text-xs text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                <span>Skor Optimasi GBP:</span>
                <strong className="text-emerald-400 text-sm">92 / 100 (Sangat Baik)</strong>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> Place ID & CID terverifikasi di Google Maps
                </li>
                <li className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> Link Review Langsung 5 Bintang valid & aktif
                </li>
                <li className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> Status Bisnis: Open
                </li>
                <li className="flex items-center gap-2 text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" /> Rekomendasi: Gunakan kartu NFC TapUlasan di meja kasir untuk mendongkrak review mingguan.
                </li>
              </ul>
            </div>
            <button
              onClick={() => setAuditModalOpen(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* 5. Rank Checker Simulation Modal */}
      {rankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e121e] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Maps Local Rank Scan
              </h3>
              <button onClick={() => setRankModalOpen(false)} className="text-xs text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <p className="text-slate-400">
                Peringkat lokal di Google Maps radius 3km untuk kategori bisnis Anda:
              </p>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
                <span>Peringkat Saat Ini:</span>
                <strong className="text-blue-400 text-sm font-bold">Top #3 di Maps Search</strong>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Toko dengan frekuensi ulasan ulasan baru yang stabil cenderung naik ke posisi Top #1 dalam 30 hari.
              </p>
            </div>
            <button
              onClick={() => setRankModalOpen(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

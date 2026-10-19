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
  Palette,
  CreditCard,
  Building2
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
  // Navigation & View state: 'landing' | 'print_design' | 'client_setup' | 'admin_login' | 'admin_dashboard' | 'print_grid'
  const [currentView, setCurrentView] = useState<'landing' | 'print_design' | 'client_setup' | 'admin_login' | 'admin_dashboard' | 'print_grid'>('landing');

  // ==========================================
  // FITUR: PRINT DESIGN QRIS & NFC OTOMATIS
  // ==========================================
  const [printTemplate, setPrintTemplate] = useState<'standee_review' | 'standee_dual' | 'nfc_card' | 'sticker'>('standee_review');
  const [printTheme, setPrintTheme] = useState<'gold' | 'cyan' | 'white' | 'qris_red'>('gold');
  const [printBusinessName, setPrintBusinessName] = useState('Ayam Geprek Kimo-Kimo');
  const [printTagline, setPrintTagline] = useState('Ulasan Bintang 5 Anda Sangat Berarti Bagi Kami');
  const [printReviewUrl, setPrintReviewUrl] = useState('https://search.google.com/local/writereview?placeid=ChIJXxIA0RaB5i0ReoMyHzOBqH4');
  const [printCtaText, setPrintCtaText] = useState('Dekatkan HP Anda di Sini atau Scan QR');
  const [printMerchantQris, setPrintMerchantQris] = useState('AYAM GEPREK KIMO-KIMO');
  const [printNmid, setPrintNmid] = useState('NMID: ID1020304050607');
  const [printPaperSize, setPrintPaperSize] = useState<'a6' | 'a5' | 'cr80' | 'sticker'>('a6');
  const [printCopiesPerPage, setPrintCopiesPerPage] = useState<1 | 2 | 4>(1);

  // High-res QR Data URLs for Print Design
  const [reviewQrDataUrl, setReviewQrDataUrl] = useState<string>('');
  const [qrisQrDataUrl, setQrisQrDataUrl] = useState<string>('');
  const [isGeneratingPrintQr, setIsGeneratingPrintQr] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

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

  // Customer Card Setup / Activation state (accessible via secret link)
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

  // Print & Selection state (Admin sticker sheet)
  const [printQrImages, setPrintQrImages] = useState<Record<string, string>>({});
  const [generatingPrintQrs, setGeneratingPrintQrs] = useState(false);

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

  // Generate Review QR and QRIS QR code whenever inputs change
  useEffect(() => {
    let isCancelled = false;
    const generateQrs = async () => {
      setIsGeneratingPrintQr(true);
      try {
        const qrReview = await QRCode.toDataURL(printReviewUrl || 'https://google.com', {
          width: 500,
          margin: 1,
          color: {
            dark: printTheme === 'white' ? '#000000' : (printTheme === 'gold' ? '#000000' : '#000000'),
            light: '#ffffff',
          },
        });

        // Dummy/Simulated QRIS payload with national merchant standards
        const qrisPayload = `00020101021126580016ID.CO.QRIS.WWW01189360099900000000000215ID10203040506075204581253033605802ID59${(printMerchantQris || 'MERCHANT').length.toString().padStart(2, '0')}${printMerchantQris || 'MERCHANT'}6007JAKARTA6105123406304ABCD`;
        const qrQris = await QRCode.toDataURL(qrisPayload, {
          width: 500,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });

        if (!isCancelled) {
          setReviewQrDataUrl(qrReview);
          setQrisQrDataUrl(qrQris);
        }
      } catch (err) {
        console.error('Failed to generate print QR:', err);
      } finally {
        if (!isCancelled) setIsGeneratingPrintQr(false);
      }
    };

    generateQrs();
    return () => { isCancelled = true; };
  }, [printReviewUrl, printMerchantQris, printTheme]);

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
        setCurrentView('client_setup');
        loadCustomerCard(cardId);
      }
    }
  }, []);

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
    const pin = adminPin || sessionStorage.getItem('tapulasan_admin_pin') || '';
    if (!pin) return;
    if (!confirm(`Yakin ingin mereset kartu ${cardId} ke kondisi belum diatur?`)) return;

    try {
      const res = await fetch(`/api/cards/${cardId}/reset`, {
        method: 'POST',
        headers: { 'x-admin-pin': pin },
      });

      if (res.ok) {
        await fetchAdminCards(pin);
      }
    } catch (e) {
      console.error('Reset failed:', e);
    }
  };

  // Admin: Delete Card
  const handleDeleteCard = async (cardId: string) => {
    const pin = adminPin || sessionStorage.getItem('tapulasan_admin_pin') || '';
    if (!pin) return;
    if (!confirm(`Hapus permanen kartu ${cardId} dari database?`)) return;

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin },
      });

      if (res.ok) {
        await fetchAdminCards(pin);
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // Open single card QR modal
  const openCardQrModal = async (card: Card) => {
    setSelectedCardForQR(card);
    const redirectUrl = `${window.location.origin}/r/${card.card_id}`;
    try {
      const url = await QRCode.toDataURL(redirectUrl, {
        width: 480,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrModalDataUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  // Prepare Printable Grid (Admin QR Stickers)
  const preparePrintGrid = async () => {
    setGeneratingPrintQrs(true);
    setCurrentView('print_grid');
    const qrMap: Record<string, string> = {};

    for (const card of adminCards) {
      try {
        const redirectUrl = `${window.location.origin}/r/${card.card_id}`;
        qrMap[card.card_id] = await QRCode.toDataURL(redirectUrl, {
          width: 320,
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

  // High-Resolution Standee/Card Image Download (300 DPI Canvas)
  const handleDownloadHighResImage = async () => {
    setIsDownloadingImage(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Canvas dimensions for 300 DPI crisp print
      let width = 1240;
      let height = 1754; // A6 proportion approx

      if (printTemplate === 'nfc_card') {
        width = 1012; // CR80 proportion (85.6mm x 54mm)
        height = 638;
      } else if (printTemplate === 'sticker') {
        width = 1200;
        height = 1200;
      }

      canvas.width = width;
      canvas.height = height;

      // Background styling
      if (printTheme === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      } else if (printTheme === 'cyan') {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#070a12');
        grad.addColorStop(1, '#0e1726');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (printTheme === 'qris_red') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
        // Header red banner
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(0, 0, width, height * 0.18);
      } else {
        // Obsidian Gold Luxury
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#090c15');
        grad.addColorStop(1, '#131929');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // Outer border / cut guide
      ctx.strokeStyle = printTheme === 'white' ? '#e2e8f0' : (printTheme === 'gold' ? '#d97706' : '#38bdf8');
      ctx.lineWidth = 12;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // Text colors
      const primaryTextColor = printTheme === 'white' || printTheme === 'qris_red' ? '#0f172a' : '#ffffff';
      const accentTextColor = printTheme === 'white' ? '#b45309' : (printTheme === 'gold' ? '#fbbf24' : '#38bdf8');

      // Top Title / Badge
      ctx.textAlign = 'center';
      if (printTheme === 'qris_red') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 52px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('QRIS & GOOGLE REVIEW', width / 2, height * 0.1);
      } else {
        ctx.fillStyle = accentTextColor;
        ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('⭐⭐⭐⭐⭐', width / 2, height * 0.11);
      }

      // Business Name
      ctx.fillStyle = printTheme === 'qris_red' ? '#0f172a' : primaryTextColor;
      ctx.font = 'bold 64px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(printBusinessName.toUpperCase(), width / 2, height * 0.22);

      // Tagline
      ctx.fillStyle = printTheme === 'white' ? '#64748b' : '#94a3b8';
      ctx.font = '36px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(printTagline, width / 2, height * 0.28);

      // Draw QR Code
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = reviewQrDataUrl;

      await new Promise<void>((resolve) => {
        qrImg.onload = () => {
          const qrSize = Math.min(width * 0.55, 600);
          const qrX = (width - qrSize) / 2;
          const qrY = height * 0.35;

          // White backing for QR
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          resolve();
        };
      });

      // NFC Wave Badge & CTA
      ctx.fillStyle = accentTextColor;
      ctx.font = 'bold 40px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`⚡ ${printCtaText}`, width / 2, height * 0.82);

      ctx.fillStyle = printTheme === 'white' ? '#94a3b8' : '#64748b';
      ctx.font = '30px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Tap Ulasan NFC & Scan QR Kamera', width / 2, height * 0.88);

      // Download file
      const link = document.createElement('a');
      link.download = `Design_Cetak_${printBusinessName.replace(/\s+/g, '_')}_${printTemplate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Download image failed:', e);
    } finally {
      setIsDownloadingImage(false);
    }
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

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-amber-500/20 selection:text-amber-300">
      
      {/* ========================================================================= */}
      {/* CLEAN SLEEK NAVIGATION BAR (No Right Menu, Clean & Focused)                */}
      {/* ========================================================================= */}
      <header className="no-print sticky top-0 z-50 backdrop-blur-md bg-[#07090e]/90 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Brand Left */}
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
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  TapUlasan
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                  NFC & QR
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">Smart Review Platform</p>
            </div>
          </div>

          {/* Clean Central Nav Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setCurrentView('landing')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'landing'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => setCurrentView('print_design')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'print_design'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              Cetak Desain QRIS & NFC
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">Auto</span>
            </button>

            {isAdminAuthenticated && (
              <button
                onClick={() => setCurrentView('admin_dashboard')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'admin_dashboard' || currentView === 'print_grid'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Panel
              </button>
            )}
          </nav>

          {/* Right side is kept completely clean and empty as instructed */}
          <div className="w-10 sm:w-24"></div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ========================================================================= */}
        {/* VIEW 1: PRINT DESIGN QRIS DAN NFC OTOMATIS                                 */}
        {/* ========================================================================= */}
        {currentView === 'print_design' && (
          <div className="space-y-8">
            
            {/* Header / Intro */}
            <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
                  <Sparkles className="w-4 h-4" />
                  Generator Siap Cetak Otomatis
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Cetak Desain Standee Meja QRIS & Kartu NFC
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Buat desain display akrilik meja kasir, tent card, dan kartu NFC ulasan Google siap cetak beresolusi tinggi (300 DPI) secara instan.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Sekarang (Print Otomatis)
                </button>
                <button
                  onClick={handleDownloadHighResImage}
                  disabled={isDownloadingImage}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {isDownloadingImage ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <Download className="w-4 h-4 text-amber-400" />}
                  Unduh Gambar HD (PNG)
                </button>
              </div>
            </div>

            {/* Layout: Control Form (Left) & Live Visual Preview (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Customizer Controls (No-Print) */}
              <div className="no-print lg:col-span-5 space-y-6">
                <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 space-y-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    Kustomisasi Desain Cetak
                  </h3>

                  {/* 1. Template Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Pilihan Model Display / Kartu:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPrintTemplate('standee_review')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          printTemplate === 'standee_review'
                            ? 'bg-amber-500/10 border-amber-500 text-white font-bold'
                            : 'bg-[#121624] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-semibold">Standee Meja Review</div>
                        <div className="text-[10px] text-slate-500">Google 5-Star + NFC</div>
                      </button>

                      <button
                        onClick={() => setPrintTemplate('standee_dual')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          printTemplate === 'standee_dual'
                            ? 'bg-amber-500/10 border-amber-500 text-white font-bold'
                            : 'bg-[#121624] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-semibold">Standee Meja Dual</div>
                        <div className="text-[10px] text-slate-500">QRIS Kasir + NFC Review</div>
                      </button>

                      <button
                        onClick={() => setPrintTemplate('nfc_card')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          printTemplate === 'nfc_card'
                            ? 'bg-amber-500/10 border-amber-500 text-white font-bold'
                            : 'bg-[#121624] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-semibold">Kartu Kasir CR80</div>
                        <div className="text-[10px] text-slate-500">Ukuran Kartu ATM / Saku</div>
                      </button>

                      <button
                        onClick={() => setPrintTemplate('sticker')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          printTemplate === 'sticker'
                            ? 'bg-amber-500/10 border-amber-500 text-white font-bold'
                            : 'bg-[#121624] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-semibold">Stiker Meja Kotak</div>
                        <div className="text-[10px] text-slate-500">80 x 80 mm Kompak</div>
                      </button>
                    </div>
                  </div>

                  {/* 2. Theme / Color Palette */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-amber-400" />
                      Tema Warna & Gaya:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPrintTheme('gold')}
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                          printTheme === 'gold' ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-bold' : 'border-slate-800 bg-[#121624] text-slate-300'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shrink-0" />
                        Obsidian Gold
                      </button>

                      <button
                        onClick={() => setPrintTheme('cyan')}
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                          printTheme === 'cyan' ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 font-bold' : 'border-slate-800 bg-[#121624] text-slate-300'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 shrink-0" />
                        Neon Cyan
                      </button>

                      <button
                        onClick={() => setPrintTheme('white')}
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                          printTheme === 'white' ? 'border-slate-300 bg-white/10 text-white font-bold' : 'border-slate-800 bg-[#121624] text-slate-300'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-white border border-slate-400 shrink-0" />
                        Clean White (Hemat Tinta)
                      </button>

                      <button
                        onClick={() => setPrintTheme('qris_red')}
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                          printTheme === 'qris_red' ? 'border-rose-400 bg-rose-500/10 text-rose-300 font-bold' : 'border-slate-800 bg-[#121624] text-slate-300'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-red-600 to-red-800 shrink-0" />
                        QRIS Standar Resmi
                      </button>
                    </div>
                  </div>

                  {/* 3. Text inputs */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nama Bisnis / Toko:
                      </label>
                      <input
                        type="text"
                        value={printBusinessName}
                        onChange={(e) => setPrintBusinessName(e.target.value)}
                        className="w-full bg-[#121624] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        placeholder="Contoh: Ayam Geprek Kimo-Kimo"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Tagline / Pesan Pendek:
                      </label>
                      <input
                        type="text"
                        value={printTagline}
                        onChange={(e) => setPrintTagline(e.target.value)}
                        className="w-full bg-[#121624] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        placeholder="Contoh: Ulasan Anda Sangat Berarti Bagi Kami"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Link Ulasan Google / URL NFC:
                      </label>
                      <input
                        type="text"
                        value={printReviewUrl}
                        onChange={(e) => setPrintReviewUrl(e.target.value)}
                        className="w-full bg-[#121624] border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                        placeholder="https://search.google.com/local/writereview?placeid=..."
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Kode QR di sebelah kanan otomatis diperbarui mengikuti URL ini.
                      </p>
                    </div>

                    {printTemplate === 'standee_dual' && (
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2.5">
                        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5" />
                          Data QRIS Kasir
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Nama Merchant QRIS:</label>
                          <input
                            type="text"
                            value={printMerchantQris}
                            onChange={(e) => setPrintMerchantQris(e.target.value)}
                            className="w-full bg-[#121624] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">NMID / Identitas Merchant:</label>
                          <input
                            type="text"
                            value={printNmid}
                            onChange={(e) => setPrintNmid(e.target.value)}
                            className="w-full bg-[#121624] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Instruksi Call To Action:
                      </label>
                      <input
                        type="text"
                        value={printCtaText}
                        onChange={(e) => setPrintCtaText(e.target.value)}
                        className="w-full bg-[#121624] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        placeholder="Dekatkan HP Anda di Sini atau Scan QR"
                      />
                    </div>

                    {/* Paper layout / Copies */}
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Jumlah Cetak per Lembar A4:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setPrintCopiesPerPage(1)}
                          className={`py-2 text-xs rounded-lg border font-medium transition-all ${
                            printCopiesPerPage === 1 ? 'bg-amber-500 text-slate-950 font-bold border-amber-500' : 'bg-[#121624] text-slate-400 border-slate-800'
                          }`}
                        >
                          1 Standee (Besar)
                        </button>
                        <button
                          onClick={() => setPrintCopiesPerPage(2)}
                          className={`py-2 text-xs rounded-lg border font-medium transition-all ${
                            printCopiesPerPage === 2 ? 'bg-amber-500 text-slate-950 font-bold border-amber-500' : 'bg-[#121624] text-slate-400 border-slate-800'
                          }`}
                        >
                          2 per A4 (Ganda)
                        </button>
                        <button
                          onClick={() => setPrintCopiesPerPage(4)}
                          className={`py-2 text-xs rounded-lg border font-medium transition-all ${
                            printCopiesPerPage === 4 ? 'bg-amber-500 text-slate-950 font-bold border-amber-500' : 'bg-[#121624] text-slate-400 border-slate-800'
                          }`}
                        >
                          4 per A4 (Kartu/Stiker)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Standee Preview & Printable Area */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="no-print text-center mb-3">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Live Preview Standee Siap Cetak (WYSWYG)
                  </span>
                </div>

                {/* The Printable Container (#print-root) */}
                <div id="print-root" className="w-full flex flex-col items-center justify-center p-2">
                  <div
                    className={`grid gap-6 ${
                      printCopiesPerPage === 1
                        ? 'grid-cols-1 max-w-md w-full'
                        : printCopiesPerPage === 2
                        ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl w-full'
                        : 'grid-cols-2 max-w-3xl w-full'
                    }`}
                  >
                    {Array.from({ length: printCopiesPerPage }).map((_, itemIndex) => (
                      <div
                        key={itemIndex}
                        className={`page-break-avoid relative rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between text-center shadow-2xl transition-all border-2 border-dashed ${
                          printTheme === 'white'
                            ? 'bg-white text-slate-900 border-slate-300'
                            : printTheme === 'cyan'
                            ? 'bg-gradient-to-b from-[#070a14] to-[#0f172a] text-white border-cyan-500/40'
                            : printTheme === 'qris_red'
                            ? 'bg-slate-50 text-slate-900 border-rose-400'
                            : 'bg-gradient-to-b from-[#090c15] to-[#121726] text-white border-amber-500/40'
                        }`}
                        style={{
                          minHeight: printTemplate === 'nfc_card' ? '280px' : '480px',
                        }}
                      >
                        {/* Cut Line guide indicator */}
                        <div className="absolute top-2 right-2 text-[9px] font-mono uppercase text-slate-400 opacity-60">
                          ✂️ Potong di garis luar
                        </div>

                        {/* Top Header Badge */}
                        <div className="w-full space-y-2">
                          {printTheme === 'qris_red' ? (
                            <div className="bg-red-700 text-white py-2 px-4 rounded-xl font-bold tracking-wider text-xs mb-2 shadow">
                              QRIS & GOOGLE REVIEW 5-STAR
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-amber-400 text-lg">
                              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                            </div>
                          )}

                          <h2
                            className={`font-black tracking-tight leading-tight uppercase ${
                              printTemplate === 'nfc_card' ? 'text-lg' : 'text-xl sm:text-2xl'
                            } ${
                              printTheme === 'white' ? 'text-slate-900' : 'text-white'
                            }`}
                          >
                            {printBusinessName || 'NAMA TOKO ANDA'}
                          </h2>

                          <p
                            className={`text-xs max-w-xs mx-auto leading-relaxed ${
                              printTheme === 'white' ? 'text-slate-600' : 'text-slate-400'
                            }`}
                          >
                            {printTagline || 'Bantu kami dengan memberikan ulasan bintang 5 di Google!'}
                          </p>
                        </div>

                        {/* QR Code and NFC Center Zone */}
                        <div className="my-5 flex flex-col items-center space-y-3">
                          
                          {/* Dual QRIS Mode: Side-by-side or stacked */}
                          {printTemplate === 'standee_dual' ? (
                            <div className="grid grid-cols-2 gap-3 items-center">
                              {/* QRIS Code Box */}
                              <div className="bg-white p-2.5 rounded-2xl shadow-lg border border-slate-200 text-center">
                                <div className="text-[10px] font-bold text-red-600 uppercase mb-1">
                                  QRIS Bayar
                                </div>
                                {qrisQrDataUrl && (
                                  <img src={qrisQrDataUrl} alt="QRIS" className="w-28 h-28 mx-auto" />
                                )}
                                <div className="text-[8px] font-bold text-slate-800 truncate mt-1">
                                  {printMerchantQris}
                                </div>
                              </div>

                              {/* Review QR Code Box */}
                              <div className="bg-white p-2.5 rounded-2xl shadow-lg border border-slate-200 text-center">
                                <div className="text-[10px] font-bold text-amber-600 uppercase mb-1">
                                  ⭐ Review Google
                                </div>
                                {reviewQrDataUrl && (
                                  <img src={reviewQrDataUrl} alt="Google Review QR" className="w-28 h-28 mx-auto" />
                                )}
                                <div className="text-[8px] font-semibold text-slate-600 mt-1">
                                  NFC & QR Ulasan
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Standard Single Review QR Code Box */
                            <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-200 inline-block relative group">
                              {reviewQrDataUrl ? (
                                <img
                                  src={reviewQrDataUrl}
                                  alt="Google Review QR Code"
                                  className={`mx-auto ${
                                    printTemplate === 'nfc_card' ? 'w-24 h-24' : 'w-44 h-44 sm:w-48 sm:h-48'
                                  }`}
                                />
                              ) : (
                                <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                                  <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                                </div>
                              )}
                              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-center mt-1">
                                Scan Kamera HP
                              </div>
                            </div>
                          )}

                          {/* Contactless NFC Waves Graphic */}
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                            <Radio className="w-4 h-4 animate-pulse" />
                            <span>DEKATKAN HP DI SINI (TAP NFC)</span>
                          </div>
                        </div>

                        {/* Bottom Footer Info */}
                        <div className="w-full space-y-1">
                          <div
                            className={`font-bold text-xs uppercase tracking-wider ${
                              printTheme === 'white' ? 'text-amber-700' : 'text-amber-400'
                            }`}
                          >
                            {printCtaText}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Tanpa perlu ketik nama restoran · Terbuka otomatis dalam 3 detik
                          </div>
                          <div className="text-[8px] text-slate-500 font-mono pt-1">
                            Didukung oleh Platform TapUlasan Mandiri
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Helpful Print Tips (No-Print) */}
                <div className="no-print mt-6 max-w-xl text-center space-y-2 text-xs text-slate-400 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-center gap-1.5 text-amber-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    Tips Mencetak Standee Akrilik Meja Kasir:
                  </div>
                  <p>
                    Gunakan kertas <strong>Art Paper 210/260 gsm</strong> atau <strong>Stiker Glossy</strong>. Setelah diprint, masukkan ke dalam holder akrilik meja ukuran A6/A5, atau tempelkan stiker NFC chip di bagian belakang untuk mengaktifkan fitur tap.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: BERANDA (Clean Elegant Obsidian Dashboard, No Card Setting / Finder) */}
        {/* ========================================================================= */}
        {currentView === 'landing' && (
          <div className="space-y-16">
            
            {/* Hero Section */}
            <div className="relative pt-8 pb-12 text-center max-w-4xl mx-auto space-y-6">
              <div className="absolute inset-0 -top-20 flex items-center justify-center pointer-events-none">
                <div className="w-[500px] h-[300px] bg-amber-500/10 blur-[130px] rounded-full" />
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Solusi Cerdas Ulasan Google Bisnis Bintang 5
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                Tingkatkan Ulasan Bintang 5{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
                  Hanya Dalam 3 Detik
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Platform kartu ulasan pintar dan standee meja kasir berbasis <strong>NFC & Barcode QR mandiri</strong>. Pelanggan cukup menempelkan smartphone atau scan kamera, dialog ulasan Google langsung terbuka tanpa perlu mengetik!
              </p>

              {/* Action Button: Directly Go To Automatic Print Design Generator */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  onClick={() => setCurrentView('print_design')}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2.5 cursor-pointer group"
                >
                  <Printer className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
                  Buat Desain Cetak QRIS & NFC Otomatis
                  <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Quick Trust Badges */}
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
                  <span>Siap Cetak Display Meja Akrilik</span>
                </div>
              </div>
            </div>

            {/* Visual Feature Cards Grid (Clean, No Card Lists, No Place ID Finder) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">1 Tap Langsung Terbuka</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pelanggan tidak perlu repot mencari nama restoran atau toko Anda di Google Search. Cukup tap kartu NFC, dialog review bintang 5 langsung siap diisi dalam 3 detik.
                </p>
              </div>

              <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Dual NFC + Barcode QR</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dilengkapi QR code dinamis beresolusi tinggi. Pelanggan dengan ponsel tipe lama tanpa fitur NFC tetap dapat memberikan ulasan secara instan hanya dengan mengarahkan kamera.
                </p>
              </div>

              <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                  <Printer className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Desain Siap Cetak Otomatis</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hasilkan template cetak standee meja akrilik A6/A5, standee kasir dual QRIS + Google Review, serta stiker meja beresolusi tinggi 300 DPI dengan 1 klik mudah.
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
                    Sesuaikan jumlah pengunjung harian toko atau restoran Anda untuk melihat estimasi ulasan baru setiap bulan.
                  </p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 px-5 py-3 rounded-xl text-center shrink-0">
                  <div className="text-3xl font-extrabold text-amber-400">
                    +{Math.round((dailyCustomers * (tapConversionRate / 100)) * 30)}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Review Baru / Bulan</div>
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
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
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
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>5% (konservatif)</span>
                    <span>15% (rata-rata)</span>
                    <span>40% (optimal)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step by Step: Cara Kerja */}
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Mudah & Cepat
                </div>
                <h3 className="text-2xl font-bold text-white">Cara Kerja 3 Langkah Mudah</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-5 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center mx-auto text-sm border border-amber-500/20">
                    1
                  </div>
                  <h4 className="font-bold text-sm text-white">Cetak Desain Standee</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Gunakan fitur cetak otomatis kami untuk membuat standee meja kasir atau stiker kartu yang elegan.
                  </p>
                </div>

                <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-5 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center mx-auto text-sm border border-emerald-500/20">
                    2
                  </div>
                  <h4 className="font-bold text-sm text-white">Letakkan di Meja / Kasir</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Pasang standee di meja makan, resepsionis, atau kasir di mana pelanggan sedang menunggu tagihan.
                  </p>
                </div>

                <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-5 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center mx-auto text-sm border border-blue-500/20">
                    3
                  </div>
                  <h4 className="font-bold text-sm text-white">Pelanggan Tap & Review</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Pelanggan menempelkan HP mereka, dialog ulasan Google langsung muncul dengan bintang 5 terisi.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Callout Banner */}
            <div className="max-w-4xl mx-auto bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 border border-amber-500/30 rounded-2xl p-8 text-center space-y-4">
              <h3 className="text-2xl font-extrabold text-white">
                Siap Melipatgandakan Ulasan Bintang 5 Bisnis Anda?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                Buat standee meja kasir QRIS & Google Review NFC sekarang juga tanpa biaya tambahan.
              </p>
              <div>
                <button
                  onClick={() => setCurrentView('print_design')}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Mulai Buat Desain Cetak Sekarang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: CLIENT / CUSTOMER CARD SETUP (Accessed via Secret Link)           */}
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

            {setupError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                <span>{setupError}</span>
              </div>
            )}

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
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Link Google Maps atau Link Ulasan Bisnis:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Paste link: https://maps.app.goo.gl/... atau https://search.google.com/local/writereview?placeid=..."
                    value={setupMapsInput}
                    onChange={(e) => setSetupMapsInput(e.target.value)}
                    className="w-full bg-[#121624] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Sistem kami otomatis mengubah tautan Google Maps Anda menjadi URL review bintang 5 resmi Google.
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
        {/* VIEW 4: ADMIN LOGIN (Mandatory PIN '*kewQkb:#sm')                         */}
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
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
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
                  onClick={preparePrintGrid}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  Cetak Lembar QR
                </button>
                <button
                  onClick={handleAdminLogout}
                  className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar Admin
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
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-1 cursor-pointer"
                >
                  ← Kembali ke Admin Dashboard
                </button>
                <h2 className="text-2xl font-bold text-white">Lembar Siap Cetak Stiker QR</h2>
              </div>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg cursor-pointer"
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
      {/* CLEAN FOOTER                                                              */}
      {/* ========================================================================= */}
      <footer className="no-print mt-20 border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} TapUlasan — Smart NFC & Barcode QR Review Platform.</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('landing')}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Beranda
            </button>
            <button
              onClick={() => setCurrentView('print_design')}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cetak Desain
            </button>
            {/* Discreet Admin Lock Link */}
            <button
              onClick={() => setCurrentView(isAdminAuthenticated ? 'admin_dashboard' : 'admin_login')}
              className="text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1"
              title="Akses Pengelola"
            >
              <Lock className="w-3 h-3" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MODALS SECTION                                                            */}
      {/* ========================================================================= */}

      {/* Batch Generate Modal (Admin) */}
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
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={generatingBatch}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  {generatingBatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Generate Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Single Card QR Modal */}
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
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

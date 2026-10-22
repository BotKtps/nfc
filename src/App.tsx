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
  Building2,
  ThumbsUp,
  X
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  CardPreview,
  DEFAULT_DESIGN,
  CARD_SIZES,
  type CardFormat,
  makeQrDataUrl,
  renderCardCanvas,
  downloadCardPng,
  printImages,
  safeFileName,
} from './cardDesign';

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
  // Navigation & View state:
  // 'landing' | 'client_setup' | 'admin_login' | 'admin_dashboard'
  const [currentView, setCurrentView] = useState<'landing' | 'client_setup' | 'admin_login' | 'admin_dashboard'>('landing');

  // ==========================================
  // ADMIN AUTH STATE
  // ==========================================
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
  const [setupSettingQrDataUrl, setSetupSettingQrDataUrl] = useState<string>('');

  // Batch generator modal (Admin)
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState('CARD');
  const [batchCount, setBatchCount] = useState(10);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  // Simple QR Modal for single card (Admin)
  const [selectedCardForQR, setSelectedCardForQR] = useState<Card | null>(null);
  const [qrModalDataUrl, setQrModalDataUrl] = useState<string>('');

  // ==========================================
  // FITUR CETAK KARTU / STANDEE (DESAIN SESUAI LAMPIRAN PENGGUNA)
  // Frame 4 warna Google, logo G, 5 bintang, TAP NFC / Scan QR, footer gelombang.
  // ==========================================
  const [printCardModalOpen, setPrintCardModalOpen] = useState(false);
  const [selectedCardForPrint, setSelectedCardForPrint] = useState<Card | null>(null);
  const [cardPrintQrUrl, setCardPrintQrUrl] = useState<string>('');
  const [printFormat, setPrintFormat] = useState<CardFormat>('square');
  const [printHeaderId, setPrintHeaderId] = useState<string>(DEFAULT_DESIGN.headerId);
  const [printHeaderEn, setPrintHeaderEn] = useState<string>(DEFAULT_DESIGN.headerEn);
  const [printTapTitle, setPrintTapTitle] = useState<string>(DEFAULT_DESIGN.tapTitle);
  const [printTapSub, setPrintTapSub] = useState<string>(DEFAULT_DESIGN.tapSub);
  const [printQrTitle, setPrintQrTitle] = useState<string>(DEFAULT_DESIGN.qrTitle);
  const [printQrSub, setPrintQrSub] = useState<string>(DEFAULT_DESIGN.qrSub);
  const [printThanksId, setPrintThanksId] = useState<string>(DEFAULT_DESIGN.thanksId);
  const [printThanksEn, setPrintThanksEn] = useState<string>(DEFAULT_DESIGN.thanksEn);
  const [printSerialText, setPrintSerialText] = useState<string>('');
  const [printShowBusinessName, setPrintShowBusinessName] = useState<boolean>(DEFAULT_DESIGN.showBusinessName);
  const [printShowSerial, setPrintShowSerial] = useState<boolean>(DEFAULT_DESIGN.showSerial);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  // Mass print / batch print state
  const [massPrintOpen, setMassPrintOpen] = useState(false);
  const [massSelectedIds, setMassSelectedIds] = useState<string[]>([]);
  const [massFormat, setMassFormat] = useState<CardFormat>('square');
  const [massPerPage, setMassPerPage] = useState<1 | 2 | 4>(2);
  const [massProcessing, setMassProcessing] = useState(false);
  const [massProgress, setMassProgress] = useState(0);

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
      const rawCardId = path.startsWith('/setup/') ? path.replace('/setup/', '') : cardIdFromQuery || '';
      const cardId = decodeURIComponent(rawCardId).replace(/\/+$/, '').trim();
      if (cardId) {
        setSetupCardIdInput(cardId);
        setCurrentView('client_setup');
        loadCustomerCard(cardId);
      }
    }
  }, []);

  // Customer Card Setup: Load Card Details
  const loadCustomerCard = async (cardIdToLoad: string) => {
    const cardId = (cardIdToLoad || '').replace(/\/+$/, '').trim();
    if (!cardId) return;
    setSetupCardLoading(true);
    setSetupError('');
    try {
      const res = await fetch(`/api/cards/${encodeURIComponent(cardId)}`);
      if (res.ok) {
        const data = await res.json();
        // Support both { card: Card } and Card directly
        const card: Card = data?.card || (data?.card_id ? data : null);
        if (!card || !card.card_id) {
          throw new Error('Data kartu tidak valid dari server.');
        }

        setSetupCardData(card);
        setSetupBusinessName(card.business_name || '');
        setSetupMapsInput(card.gmaps_url || '');

        const redirectUrl = `${window.location.origin}/r/${card.card_id}`;
        const settingUrl = `${window.location.origin}/setup/${card.card_id}`;
        try {
          const qrUrl = await QRCode.toDataURL(redirectUrl, {
            width: 380,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setSetupQrDataUrl(qrUrl);

          const settingQr = await QRCode.toDataURL(settingUrl, {
            width: 380,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setSetupSettingQrDataUrl(settingQr);
        } catch (qrErr) {
          console.error('Failed to generate preview QR code:', qrErr);
        }
        return;
      }

      // Check local fallback if server returned 404
      const stored = localStorage.getItem('tapulasan_cards');
      if (stored) {
        try {
          const list: Card[] = JSON.parse(stored);
          const match = list.find(c => c.card_id.toLowerCase() === cardId.toLowerCase());
          if (match) {
            setSetupCardData(match);
            setSetupBusinessName(match.business_name || '');
            setSetupMapsInput(match.gmaps_url || '');
            const redirectUrl = `${window.location.origin}/r/${match.card_id}`;
            const settingUrl = `${window.location.origin}/setup/${match.card_id}`;
            const qrUrl = await QRCode.toDataURL(redirectUrl, { width: 380, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
            setSetupQrDataUrl(qrUrl);
            const settingQr = await QRCode.toDataURL(settingUrl, { width: 380, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
            setSetupSettingQrDataUrl(settingQr);
            return;
          }
        } catch (err) {}
      }

      const err = await res.json().catch(() => ({}));
      setSetupError(err.error || `Kartu "${cardId}" tidak ditemukan dalam sistem.`);
      setSetupCardData(null);
    } catch (e: any) {
      // Local fallback on network error / static Vercel build
      try {
        const stored = localStorage.getItem('tapulasan_cards');
        let fallbackCard: Card | null = null;
        if (stored) {
          const list: Card[] = JSON.parse(stored);
          fallbackCard = list.find(c => c.card_id.toLowerCase() === cardId.toLowerCase()) || null;
        }
        if (!fallbackCard && (cardId.toUpperCase() === 'CARD-001' || cardId.toUpperCase() === 'CARD-002')) {
          fallbackCard = {
            card_id: cardId.toUpperCase(),
            business_name: cardId.toUpperCase() === 'CARD-001' ? 'Ayam Geprek Kimo-Kimo' : null,
            gmaps_url: cardId.toUpperCase() === 'CARD-001' ? 'https://search.google.com/local/writereview?placeid=ChIJXxIA0RaB5i0ReoMyHzOBqH4&review=5' : null,
            is_active: cardId.toUpperCase() === 'CARD-001',
            scan_count: cardId.toUpperCase() === 'CARD-001' ? 3 : 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        if (fallbackCard) {
          setSetupCardData(fallbackCard);
          setSetupBusinessName(fallbackCard.business_name || '');
          setSetupMapsInput(fallbackCard.gmaps_url || '');
          const redirectUrl = `${window.location.origin}/r/${fallbackCard.card_id}`;
          const settingUrl = `${window.location.origin}/setup/${fallbackCard.card_id}`;
          const qrUrl = await QRCode.toDataURL(redirectUrl, { width: 380, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
          setSetupQrDataUrl(qrUrl);
          const settingQr = await QRCode.toDataURL(settingUrl, { width: 380, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
          setSetupSettingQrDataUrl(settingQr);
          return;
        }
      } catch (err) {}

      console.error('Error loading card:', e);
      setSetupError(
        e?.message && typeof e.message === 'string' && !e.message.includes('object')
          ? e.message
          : 'Gagal memuat informasi kartu. Silakan periksa koneksi atau ID kartu.'
      );
      setSetupCardData(null);
    } finally {
      setSetupCardLoading(false);
    }
  };

  // Customer Card Setup: Save
  const handleSaveCustomerSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupCardData) return;
    setSavingSetup(true);
    setSetupError('');

    try {
      const res = await fetch(`/api/cards/${encodeURIComponent(setupCardData.card_id)}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: setupBusinessName,
          gmaps_url: setupMapsInput,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const reviewUrl = data.review_url || data.card?.gmaps_url || `${window.location.origin}/r/${setupCardData.card_id}`;
        const settingUrl = `${window.location.origin}/setup/${setupCardData.card_id}`;
        setSetupSuccessResult({
          card_id: setupCardData.card_id,
          business_name: setupBusinessName,
          review_url: reviewUrl,
          setting_url: settingUrl,
        });
        if (data.card) {
          setSetupCardData(data.card);
        }
        try {
          const qrUrl = await QRCode.toDataURL(reviewUrl, {
            width: 380,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setSetupQrDataUrl(qrUrl);

          const settingQr = await QRCode.toDataURL(settingUrl, {
            width: 380,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setSetupSettingQrDataUrl(settingQr);
        } catch (qrErr) {
          console.error('Error creating QR codes:', qrErr);
        }
      } else {
        setSetupError(data.error || 'Gagal menyimpan konfigurasi kartu.');
      }

      // Sync to localStorage as backup
      try {
        const stored = localStorage.getItem('tapulasan_cards');
        let list: Card[] = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex(c => c.card_id.toLowerCase() === setupCardData.card_id.toLowerCase());
        const updatedCard: Card = {
          ...setupCardData,
          business_name: setupBusinessName,
          gmaps_url: data.review_url || setupMapsInput,
          is_active: true,
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) list[idx] = updatedCard;
        else list.push(updatedCard);
        localStorage.setItem('tapulasan_cards', JSON.stringify(list));
      } catch (err) {}
    } catch (e) {
      // Offline / Static fallback saving
      try {
        const stored = localStorage.getItem('tapulasan_cards');
        let list: Card[] = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex(c => c.card_id.toLowerCase() === setupCardData.card_id.toLowerCase());
        const reviewUrl = setupMapsInput.startsWith('http')
          ? setupMapsInput
          : `https://search.google.com/local/writereview?q=${encodeURIComponent(setupBusinessName)}&review=5`;
        const settingUrl = `${window.location.origin}/setup/${setupCardData.card_id}`;
        const updatedCard: Card = {
          ...setupCardData,
          business_name: setupBusinessName,
          gmaps_url: reviewUrl,
          is_active: true,
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) list[idx] = updatedCard;
        else list.push(updatedCard);
        localStorage.setItem('tapulasan_cards', JSON.stringify(list));
        setSetupCardData(updatedCard);
        setSetupSuccessResult({
          card_id: setupCardData.card_id,
          business_name: setupBusinessName,
          review_url: reviewUrl,
          setting_url: settingUrl,
        });
        const qrUrl = await QRCode.toDataURL(reviewUrl, { width: 380, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
        setSetupQrDataUrl(qrUrl);
        const settingQr = await QRCode.toDataURL(settingUrl, { width: 380, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
        setSetupSettingQrDataUrl(settingQr);
      } catch (fallbackErr) {
        setSetupError('Terjadi kesalahan jaringan saat menyimpan konfigurasi.');
      }
    } finally {
      setSavingSetup(false);
    }
  };

  // Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginLoading(true);
    setAdminLoginError('');

    if (adminPin !== '*kewQkb:#sm') {
      setAdminLoginError('Kunci PIN Pengelola tidak sesuai. Akses ditolak.');
      setAdminLoginLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/cards', {
        headers: { 'x-admin-pin': adminPin },
      });

      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('tapulasan_admin_pin', adminPin);
        setIsAdminAuthenticated(true);
        setAdminCards(data.cards || []);
        localStorage.setItem('tapulasan_cards', JSON.stringify(data.cards || []));
        setCurrentView('admin_dashboard');
      } else {
        setAdminLoginError('Otorisasi gagal pada server backend.');
      }
    } catch (e) {
      // Local fallback for static Vercel deployment / offline testing
      const stored = localStorage.getItem('tapulasan_cards');
      const list: Card[] = stored ? JSON.parse(stored) : [
        {
          card_id: 'CARD-001',
          business_name: 'Ayam Geprek Kimo-Kimo',
          gmaps_url: 'https://search.google.com/local/writereview?placeid=ChIJXxIA0RaB5i0ReoMyHzOBqH4&review=5',
          is_active: true,
          scan_count: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          card_id: 'CARD-002',
          business_name: null,
          gmaps_url: null,
          is_active: false,
          scan_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      sessionStorage.setItem('tapulasan_admin_pin', adminPin);
      setIsAdminAuthenticated(true);
      setAdminCards(list);
      localStorage.setItem('tapulasan_cards', JSON.stringify(list));
      setCurrentView('admin_dashboard');
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
        localStorage.setItem('tapulasan_cards', JSON.stringify(data.cards || []));
      } else {
        if (res.status === 401) {
          handleAdminLogout();
        }
      }
    } catch (e) {
      console.error('Failed to fetch admin cards, using local storage backup:', e);
      const stored = localStorage.getItem('tapulasan_cards');
      if (stored) {
        try {
          setAdminCards(JSON.parse(stored));
        } catch (err) {}
      }
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
      } else {
        throw new Error('API failed');
      }
    } catch (e) {
      // Local fallback for batch generation
      const now = new Date().toISOString();
      const newItems: Card[] = [];
      const prefix = batchPrefix || 'CARD';
      const count = Number(batchCount) || 10;
      for (let i = 0; i < count; i++) {
        const num = adminCards.length + 1 + i;
        const paddedNum = String(num).padStart(3, '0');
        newItems.push({
          card_id: `${prefix.toUpperCase()}-${paddedNum}`,
          business_name: null,
          gmaps_url: null,
          is_active: false,
          scan_count: 0,
          created_at: now,
          updated_at: now,
        });
      }
      const updatedList = [...adminCards, ...newItems];
      setAdminCards(updatedList);
      localStorage.setItem('tapulasan_cards', JSON.stringify(updatedList));
      setBatchModalOpen(false);
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
      } else {
        throw new Error('Reset API error');
      }
    } catch (e) {
      const updatedList = adminCards.map(c => 
        c.card_id === cardId 
          ? { ...c, business_name: null, gmaps_url: null, is_active: false, scan_count: 0, updated_at: new Date().toISOString() }
          : c
      );
      setAdminCards(updatedList);
      localStorage.setItem('tapulasan_cards', JSON.stringify(updatedList));
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
      } else {
        throw new Error('Delete API error');
      }
    } catch (e) {
      const updatedList = adminCards.filter(c => c.card_id !== cardId);
      setAdminCards(updatedList);
      localStorage.setItem('tapulasan_cards', JSON.stringify(updatedList));
    }
  };

  // Open simple card QR modal
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

  // =========================================================================
  // CETAK / DOWNLOAD / MASS PRINT — DESAIN SESUAI LAMPIRAN PENGGUNA
  // =========================================================================
  const buildPrintOptions = () => ({
    format: printFormat,
    headerId: printHeaderId,
    headerEn: printHeaderEn,
    tapTitle: printTapTitle,
    tapSub: printTapSub,
    qrTitle: printQrTitle,
    qrSub: printQrSub,
    thanksId: printThanksId,
    thanksEn: printThanksEn,
    serial: printSerialText,
    showBusinessName: printShowBusinessName,
    showSerial: printShowSerial,
  });

  const openCardPrintModal = async (card: Card) => {
    setSelectedCardForPrint(card);
    setPrintSerialText(card.card_id);
    setPrintHeaderId(DEFAULT_DESIGN.headerId);
    setPrintHeaderEn(DEFAULT_DESIGN.headerEn);
    setPrintTapTitle(DEFAULT_DESIGN.tapTitle);
    setPrintTapSub(DEFAULT_DESIGN.tapSub);
    setPrintQrTitle(DEFAULT_DESIGN.qrTitle);
    setPrintQrSub(DEFAULT_DESIGN.qrSub);
    setPrintThanksId(DEFAULT_DESIGN.thanksId);
    setPrintThanksEn(DEFAULT_DESIGN.thanksEn);
    setPrintShowBusinessName(DEFAULT_DESIGN.showBusinessName);
    setPrintShowSerial(DEFAULT_DESIGN.showSerial);
    setPrintFormat('square');
    setCardPrintQrUrl('');
    setPrintCardModalOpen(true);

    try {
      const qrData = await makeQrDataUrl(card, 720);
      setCardPrintQrUrl(qrData);
    } catch (err) {
      console.error('Gagal generate QR untuk cetak kartu:', err);
    }
  };

  // Download PNG resolusi tinggi (300 DPI)
  const handleDownloadCardStandeeImage = async () => {
    if (!selectedCardForPrint) return;
    setIsDownloadingImage(true);
    try {
      await downloadCardPng(selectedCardForPrint, {
        ...buildPrintOptions(),
        qrDataUrl: cardPrintQrUrl || undefined,
      });
    } catch (err) {
      console.error('Error generating image:', err);
      alert('Gagal membuat gambar. Silakan coba lagi.');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  // Cetak satu kartu (langsung ke dialog print)
  const handlePrintSingleCard = async () => {
    if (!selectedCardForPrint) return;
    try {
      const canvas = await renderCardCanvas(selectedCardForPrint, {
        ...buildPrintOptions(),
        qrDataUrl: cardPrintQrUrl || undefined,
      });
      printImages([canvas.toDataURL('image/png')], 1, `Kartu ${selectedCardForPrint.card_id}`, CARD_SIZES[printFormat].widthMm);
    } catch (err) {
      console.error('Error printing card:', err);
      alert('Gagal menyiapkan cetak. Silakan coba lagi.');
    }
  };

  // ---------- MASS PRINT ----------
  const openMassPrintModal = () => {
    setMassSelectedIds(filteredAdminCards.map((c) => c.card_id));
    setMassFormat('square');
    setMassPerPage(2);
    setMassProgress(0);
    setMassPrintOpen(true);
  };

  const toggleMassCard = (id: string) => {
    setMassSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleMassPrint = async () => {
    if (massSelectedIds.length === 0) {
      alert('Pilih minimal satu kartu untuk dicetak.');
      return;
    }
    setMassProcessing(true);
    setMassProgress(0);
    try {
      const cards = adminCards.filter((c) => massSelectedIds.includes(c.card_id));
      const images: string[] = [];
      for (let i = 0; i < cards.length; i++) {
        const canvas = await renderCardCanvas(cards[i], { format: massFormat });
        images.push(canvas.toDataURL('image/png'));
        setMassProgress(Math.round(((i + 1) / cards.length) * 100));
        await new Promise((r) => setTimeout(r, 20));
      }
      printImages(images, massPerPage, 'Mass Print Kartu TapUlasan', CARD_SIZES[massFormat].widthMm);
    } catch (err) {
      console.error('Mass print error:', err);
      alert('Gagal menyiapkan mass print. Silakan coba lagi.');
    } finally {
      setMassProcessing(false);
    }
  };

  const handleMassDownload = async () => {
    if (massSelectedIds.length === 0) {
      alert('Pilih minimal satu kartu untuk diunduh.');
      return;
    }
    setMassProcessing(true);
    setMassProgress(0);
    try {
      const cards = adminCards.filter((c) => massSelectedIds.includes(c.card_id));
      for (let i = 0; i < cards.length; i++) {
        const canvas = await renderCardCanvas(cards[i], { format: massFormat });
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `TapUlasan_${safeFileName(cards[i].business_name || cards[i].card_id)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setMassProgress(Math.round(((i + 1) / cards.length) * 100));
        await new Promise((r) => setTimeout(r, 450));
      }
    } catch (err) {
      console.error('Mass download error:', err);
      alert('Gagal mengunduh semua kartu. Silakan coba lagi.');
    } finally {
      setMassProcessing(false);
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
      {/* CLEAN SLEEK NAVIGATION BAR (No print button, strictly Dashboard & Admin)   */}
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

          {/* Clean Central Nav Tabs: NO PRINT BUTTON HERE */}
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

            {isAdminAuthenticated && (
              <button
                onClick={() => setCurrentView('admin_dashboard')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'admin_dashboard'
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
        {/* VIEW 1: BERANDA (Clean Elegant Obsidian Dashboard, No Card Setting / Finder) */}
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
                Platform kartu ulasan pintar dan display meja kasir berbasis <strong>NFC & Barcode QR mandiri</strong>. Pelanggan cukup menempelkan smartphone atau scan kamera, dialog ulasan Google langsung terbuka tanpa perlu repot mencari nama bisnis!
              </p>

              {/* Quick Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
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
                  <span>Siap Display Meja Akrilik & Kartu Kasir</span>
                </div>
              </div>
            </div>

            {/* Visual Feature Cards Grid (Clean, Informative, No Card Lists) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">1 Tap Langsung Terbuka</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pelanggan tidak perlu repot mencari nama restoran atau toko Anda di Google Search. Cukup tap kartu NFC, dialog review bintang 5 langsung siap diisi dalam hitungan detik.
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
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Format Standee Akrilik Kasir</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Desain profesional berstandar Google 5-bintang dengan panduan jelas Tap NFC dan Scan QR yang langsung meningkatkan kepercayaan pelanggan untuk meninggalkan ulasan positif.
                </p>
              </div>
            </div>

            {/* "Why Businesses Love It" - Standee Akrilik Meja Showcase (Persis Foto Lampiran) */}
            <div className="bg-[#0b0e17] border border-slate-800/80 rounded-3xl p-6 sm:p-10 max-w-6xl mx-auto shadow-2xl relative overflow-hidden">
              <div className="text-center space-y-2 mb-10 max-w-2xl mx-auto">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                  Desain Display Akrilik Meja Kasir
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  Why Businesses Love It
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Simple. Smart. Results that speak for themselves.
                </p>
              </div>

              {/* Showcase Grid: Left 2 Features, Center Standee Preview, Right 2 Features */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Left 2 Callouts */}
                <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
                  <div className="p-4 rounded-2xl bg-[#121624] border border-slate-800 space-y-2 hover:border-blue-500/30 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <ThumbsUp className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm">Ready to use</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      No setup required for customers. Place on cashier table and get reviews instantly.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#121624] border border-slate-800 space-y-2 hover:border-amber-500/30 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm">Built-in NFC technology</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Tap with any NFC-enabled iPhone or Android phone to leave a review in seconds.
                    </p>
                  </div>
                </div>

                {/* Center Standee Preview (Persis Foto Lampiran) */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center order-1 lg:order-2">
                  <div className="w-full max-w-[320px] sm:max-w-[350px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 select-none transform transition-transform hover:scale-[1.02]">
                    
                    {/* Blue Wave Header */}
                    <div className="relative bg-[#0866d6] pt-6 pb-9 px-4 text-center">
                      <div className="relative z-10 space-y-0.5">
                        <div className="font-extrabold text-white text-base tracking-wider uppercase">
                          MAKE OUR DAY,
                        </div>
                        <div className="font-black text-white text-lg tracking-wider uppercase">
                          LEAVE US A REVIEW!
                        </div>
                      </div>
                      <div className="absolute -bottom-1 left-0 right-0 w-full overflow-hidden leading-none pointer-events-none">
                        <svg viewBox="0 0 400 48" preserveAspectRatio="none" className="w-full h-8 text-white fill-current">
                          <path d="M 0,0 C 110,40 150,8 200,8 C 250,8 290,40 400,0 L 400,48 L 0,48 Z" />
                        </svg>
                      </div>
                    </div>

                    {/* Google G Emblem */}
                    <div className="relative -mt-6 z-20 flex justify-center">
                      <div className="w-14 h-14 rounded-full bg-white shadow-lg p-2 flex items-center justify-center border-2 border-white ring-1 ring-black/10">
                        <svg viewBox="0 0 24 24" className="w-9 h-9">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                      </div>
                    </div>

                    {/* 5 Stars */}
                    <div className="flex items-center justify-center gap-1 text-[#FBBC05] text-2xl my-2">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>

                    {/* Hand NFC + QR Code */}
                    <div className="grid grid-cols-2 gap-2 items-center px-4 py-2 my-1">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 flex items-center justify-center">
                          <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" fill="none">
                            <g transform="translate(14, 8)">
                              <g transform="rotate(-10 32 45)">
                                <rect x="12" y="10" width="38" height="66" rx="6" stroke="#0f172a" strokeWidth="2.8" fill="#ffffff" />
                                <line x1="20" y1="16" x2="42" y2="16" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                                <line x1="26" y1="70" x2="36" y2="70" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                                <path d="M 46 22 A 12 12 0 0 1 54 34" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                                <path d="M 50 16 A 20 20 0 0 1 62 34" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                                <path d="M 54 10 A 28 28 0 0 1 70 34" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                              </g>
                              <path d="M 2 44 C 8 36, 17 38, 20 44" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                              <path d="M 2 54 C 8 46, 17 48, 20 54" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                              <path d="M 4 64 C 10 56, 18 58, 21 64" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                              <path d="M 54 58 C 58 56, 64 62, 58 68 C 53 73, 46 72, 46 72" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                              <path d="M 4 65 C 8 76, 20 84, 40 84 C 52 84, 58 76, 58 68" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                              <path d="M 4 65 L 0 80" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                              <path d="M 26 84 L 20 95" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                            </g>
                          </svg>
                        </div>
                        <span className="font-extrabold text-xs text-slate-900 mt-1">Tap or Scan</span>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <div className="w-22 h-22 bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                          <div className="w-full h-full bg-slate-900 rounded flex items-center justify-center p-1">
                            <QrCode className="w-16 h-16 text-white" />
                          </div>
                        </div>
                        <span className="font-mono font-bold text-[10px] text-slate-700 mt-1 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                          CT-00005
                        </span>
                      </div>
                    </div>

                    <div className="py-2 border-t border-slate-100 text-center text-[9px] text-slate-400 font-medium">
                      Built-in NFC & QR Code • Tap/Scan to Review
                    </div>
                  </div>

                  {/* Acrylic Foot Base */}
                  <div className="w-[78%] h-3.5 bg-gradient-to-b from-slate-200/90 to-slate-300/80 rounded-b-xl shadow-md border-t border-slate-300 relative -mt-0.5 mx-auto">
                    <div className="absolute inset-x-8 top-1 h-[2px] bg-white/70 rounded-full" />
                  </div>
                </div>

                {/* Right 2 Callouts */}
                <div className="lg:col-span-3 space-y-6 order-3">
                  <div className="p-4 rounded-2xl bg-[#121624] border border-slate-800 space-y-2 hover:border-emerald-500/30 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm">Durable Acrylic material</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Sturdy, long-lasting acrylic stand design for indoor & outdoor tabletop use.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#121624] border border-slate-800 space-y-2 hover:border-cyan-500/30 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm">Unique QR code</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Scan camera to open your Google review page directly in seconds.
                    </p>
                  </div>
                </div>

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
                    <span>20% (rata-rata)</span>
                    <span>40% (optimal)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
                <span>Rata-rata bisnis dengan kartu NFC TapUlasan mendapatkan lonjakan ulasan Google 3x lipat dalam 30 hari pertama.</span>
                <span className="text-amber-400 font-mono font-bold shrink-0">100% Organik & Legal</span>
              </div>
            </div>

            {/* How It Works 3 Simple Steps */}
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white">Cara Kerja TapUlasan Untuk Pelanggan</h3>
                <p className="text-xs text-slate-400">Sangat mudah, cepat, dan tidak memerlukan instalasi aplikasi apapun</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0e121e] border border-slate-800 p-6 rounded-2xl space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold flex items-center justify-center text-sm">
                    1
                  </div>
                  <h4 className="font-bold text-white text-base">Dekatkan HP ke Display</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Pelanggan cukup menempelkan HP ke bagian <strong>Tap NFC</strong> pada standee kasir, atau mengarahkan kamera ke <strong>Scan QR</strong>.
                  </p>
                </div>

                <div className="bg-[#0e121e] border border-slate-800 p-6 rounded-2xl space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold flex items-center justify-center text-sm">
                    2
                  </div>
                  <h4 className="font-bold text-white text-base">Dialog Ulasan Muncul Otomatis</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Browser smartphone langsung membuka halaman review profil Google Bisnis Anda dengan bintang 5 sudah siap dipilih.
                  </p>
                </div>

                <div className="bg-[#0e121e] border border-slate-800 p-6 rounded-2xl space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold flex items-center justify-center text-sm">
                    3
                  </div>
                  <h4 className="font-bold text-white text-base">Ulasan Terpublikasi</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Pelanggan menekan tombol kirim ulasan. Reputasi toko meningkat dan peringkat bisnis di Google Maps melesat naik.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* ========================================================================= */}
        {/* VIEW 2: CLIENT / CUSTOMER CARD SETUP (Accessed via Secret Link)           */}
        {/* ========================================================================= */}
        {currentView === 'client_setup' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Aktivasi Kartu TapUlasan
              </div>
              <h2 className="text-2xl font-bold text-white">Hubungkan Kartu NFC ke Google Bisnis Anda</h2>
              <p className="text-xs text-slate-400">
                Lengkapi nama bisnis dan link Google Maps Anda agar kartu langsung membuka formulir ulasan Google saat di-tap.
              </p>
            </div>

            {setupCardLoading ? (
              <div className="bg-[#0e121e] border border-slate-800 p-8 rounded-2xl text-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                <p className="text-xs text-slate-400">Memeriksa nomor kartu...</p>
              </div>
            ) : setupSuccessResult ? (
              <div className="bg-[#0e121e] border border-emerald-500/30 rounded-3xl p-4 sm:p-7 space-y-6 shadow-2xl">
                {/* Header with success badge */}
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                    Konfigurasi Berhasil Disimpan & Aktif
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">Kartu Siap Digunakan!</h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                    Kartu <span className="font-mono font-bold text-amber-400">{setupSuccessResult.card_id}</span> kini resmi terhubung ke <strong className="text-white">{setupSuccessResult.business_name}</strong>.
                  </p>
                </div>

                {/* Notice: Setting Web & QR Code to Change Later */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-amber-500/10 border border-amber-500/30 text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Mau Ganti Link / Nama Toko di Masa Depan?</span>
                  </div>
                  <p className="text-[11px] text-slate-300 max-w-xl mx-auto leading-relaxed">
                    Kami sediakan <strong>Link Web Setting & QR Code Khusus Pengaturan</strong> di bawah. Simpan link ini di catatan HP Anda agar Anda dapat mengganti target ulasan Google Maps kapan saja secara mandiri.
                  </p>
                </div>

                {/* 2 Responsive Cards Grid (Review vs Setting) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                  
                  {/* CARD 1: QR Code & Link Ulasan Google (Untuk Pelanggan & Display Meja) */}
                  <div className="bg-[#121624] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[11px] font-bold border border-amber-500/20">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          Ulasan Pelanggan
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Untuk Display Meja</span>
                      </div>
                      <h4 className="font-bold text-white text-sm">QR Code Ulasan Google</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Dipasang di standee kasir atau di-scan pelanggan untuk langsung membuka dialog review Google bintang 5.
                      </p>
                    </div>

                    {setupQrDataUrl ? (
                      <div className="p-3 bg-white rounded-2xl text-center max-w-[210px] mx-auto shadow-xl">
                        <img src={setupQrDataUrl} alt="QR Code Review" className="w-40 h-40 sm:w-44 sm:h-44 mx-auto object-contain" />
                        <p className="text-[10px] text-slate-700 font-bold mt-1.5">Scan untuk Beri Ulasan</p>
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center text-slate-500 text-xs">
                        Memuat QR Ulasan...
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-[10px] font-semibold mb-0.5">Link Ulasan / Tap NFC:</span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-white text-xs truncate select-all">{setupSuccessResult.review_url}</span>
                          <button
                            onClick={() => copyToClipboard(setupSuccessResult.review_url, 'redir')}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shrink-0 cursor-pointer transition-colors"
                            title="Salin Link Ulasan"
                          >
                            {copiedKey === 'redir' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {setupQrDataUrl && (
                          <a
                            href={setupQrDataUrl}
                            download={`QR_Ulasan_${setupSuccessResult.card_id}.png`}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-amber-400" />
                            <span>Download QR</span>
                          </a>
                        )}
                        <a
                          href={setupSuccessResult.review_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs rounded-xl border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Tes Buka</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: QR Code & Link Web Setting (KHUSUS PEMILIK TOKO - JIKA MAU GANTI NANTI) */}
                  <div className="bg-[#121624] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-4 flex flex-col justify-between relative overflow-hidden">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 text-[11px] font-bold border border-cyan-500/25">
                          <Settings className="w-3.5 h-3.5 text-cyan-400" />
                          Khusus Pemilik Toko
                        </span>
                        <span className="text-[10px] text-cyan-400 font-semibold">Simpan Ini</span>
                      </div>
                      <h4 className="font-bold text-white text-sm">QR Code & Link Web Setting</h4>
                      <p className="text-[11px] text-cyan-200/80 leading-relaxed">
                        Scan QR ini atau simpan link web setting ini jika sewaktu-waktu Anda ingin <strong>mengganti alamat Google Maps atau nama bisnis</strong>.
                      </p>
                    </div>

                    {setupSettingQrDataUrl ? (
                      <div className="p-3 bg-white rounded-2xl text-center max-w-[210px] mx-auto shadow-xl ring-2 ring-cyan-500/20">
                        <img src={setupSettingQrDataUrl} alt="QR Code Setting" className="w-40 h-40 sm:w-44 sm:h-44 mx-auto object-contain" />
                        <p className="text-[10px] text-cyan-900 font-bold mt-1.5">Scan Kamera untuk Setting</p>
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center text-slate-500 text-xs">
                        Memuat QR Setting...
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <div className="p-2.5 bg-slate-900/90 rounded-xl border border-cyan-500/30">
                        <span className="text-cyan-300 block text-[10px] font-semibold mb-0.5">Link Web Setting (Untuk Mengganti):</span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-cyan-100 text-xs truncate select-all">{setupSuccessResult.setting_url}</span>
                          <button
                            onClick={() => copyToClipboard(setupSuccessResult.setting_url, 'setting')}
                            className="p-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 rounded-lg shrink-0 cursor-pointer transition-colors border border-cyan-700/40"
                            title="Salin Link Web Setting"
                          >
                            {copiedKey === 'setting' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {setupSettingQrDataUrl && (
                          <a
                            href={setupSettingQrDataUrl}
                            download={`QR_Setting_${setupSuccessResult.card_id}.png`}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Download QR</span>
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSetupSuccessResult(null);
                          }}
                          className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-semibold text-xs rounded-xl border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Ubah Lagi</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Helper Bar */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        const summary = `📱 TapUlasan Kartu: ${setupSuccessResult.card_id}\n🏬 Bisnis: ${setupSuccessResult.business_name}\n⭐ Link Review Pelanggan: ${setupSuccessResult.review_url}\n⚙️ Link Web Setting (Untuk Mengganti): ${setupSuccessResult.setting_url}`;
                        copyToClipboard(summary, 'all_info');
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'all_info' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                      <span>{copiedKey === 'all_info' ? 'Semua Info Berhasil Disalin!' : 'Salin Semua Info'}</span>
                    </button>

                    <button
                      onClick={() => {
                        openCardPrintModal({
                          card_id: setupSuccessResult.card_id,
                          business_name: setupSuccessResult.business_name,
                          gmaps_url: setupSuccessResult.review_url,
                          is_active: true,
                          scan_count: 0,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
                        });
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Standee Akrilik Meja</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSetupSuccessResult(null);
                      setCurrentView('landing');
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer shadow-md transition-all"
                  >
                    Selesai & Ke Beranda
                  </button>
                </div>
              </div>
            ) : setupCardData ? (
              <form onSubmit={handleSaveCustomerSetup} className="bg-[#0e121e] border border-slate-800 rounded-3xl p-5 sm:p-8 space-y-5 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                  <div className="font-mono text-sm text-amber-400 font-bold">
                    ID KARTU: {setupCardData.card_id}
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold w-fit ${
                    setupCardData.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {setupCardData.is_active ? 'Sudah Aktif (Dapat Diperbarui Kapan Saja)' : 'Belum Diatur'}
                  </span>
                </div>

                {setupError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{setupError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Nama Bisnis / Restoran / Toko:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Woods Barbershop Adisucipto"
                    value={setupBusinessName}
                    onChange={(e) => setSetupBusinessName(e.target.value)}
                    className="w-full bg-[#121624] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm sm:text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Link Google Maps atau Google Review Bisnis Anda:
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="Contoh: https://maps.app.goo.gl/... atau https://search.google.com/local/writereview?placeid=..."
                    value={setupMapsInput}
                    onChange={(e) => setSetupMapsInput(e.target.value)}
                    className="w-full bg-[#121624] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm sm:text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400">
                    Buka Google Maps di HP / browser Anda, klik <strong>Bagikan (Share)</strong> profil bisnis, lalu salin link dan tempelkan di atas.
                  </p>
                </div>

                {/* Permanent setting URL badge */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Link Web Pengaturan Kartu Ini:</span>
                    <span className="font-mono text-cyan-300 text-[10px] truncate block">
                      {window.location.origin}/setup/{setupCardData.card_id}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${window.location.origin}/setup/${setupCardData.card_id}`, 'form_setting_url')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shrink-0 cursor-pointer"
                    title="Salin Link Web Setting"
                  >
                    {copiedKey === 'form_setting_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingSetup}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  >
                    {savingSetup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Simpan & Aktifkan Kartu
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 text-center space-y-4">
                <p className="text-xs text-slate-400">
                  Masukkan ID kartu yang tertera pada fisik kartu NFC Anda:
                </p>
                <div className="flex gap-2 max-w-xs mx-auto">
                  <input
                    type="text"
                    placeholder="CARD-001"
                    value={setupCardIdInput}
                    onChange={(e) => setSetupCardIdInput(e.target.value.toUpperCase())}
                    className="w-full bg-[#121624] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
                  />
                  <button
                    onClick={() => loadCustomerCard(setupCardIdInput)}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cari
                  </button>
                </div>
                {setupError && <p className="text-xs text-rose-400">{setupError}</p>}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: ADMIN LOGIN CARD (Only accessible via URL /admn-log or footer lock) */}
        {/* ========================================================================= */}
        {currentView === 'admin_login' && (
          <div className="max-w-md mx-auto pt-8">
            <div className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Login Portal Pengelola</h2>
                <p className="text-xs text-slate-400">
                  Area terenkripsi untuk manajemen kartu dan cetak standee ulasan.
                </p>
              </div>

              {adminLoginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{adminLoginError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    PIN Keamanan Admin:
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan PIN otorisasi..."
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full bg-[#121624] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={adminLoginLoading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {adminLoginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  Buka Dashboard Pengelola
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  onClick={() => setCurrentView('landing')}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ← Kembali ke Beranda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: ADMIN DASHBOARD (Only for authenticated admin)                    */}
        {/* Menu cetak global dihilangkan dari header dashboard                      */}
        {/* Tombol cetak berada di masing-masing baris card, di samping tombol hapus */}
        {/* ========================================================================= */}
        {currentView === 'admin_dashboard' && isAdminAuthenticated && (
          <div className="space-y-8">
            
            {/* Top Toolbar (CLEAN: No global print menu button) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  Sesi Pengelola Terverifikasi
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Manajemen Inventaris Kartu NFC
                </h2>
              </div>

              {/* Action buttons on header: NO print menu here */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => fetchAdminCards()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={openMassPrintModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Mass Print
                </button>
                <button
                  onClick={() => setBatchModalOpen(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Batch Kartu Baru
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
            {/* Admin Cards Responsive List & Table */}
            <div className="bg-[#0e121e] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              
              {/* DESKTOP TABLE VIEW (hidden on mobile, visible md and up) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121624] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Card ID</th>
                      <th className="py-3 px-4">Bisnis Pelanggan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Scan</th>
                      <th className="py-3 px-4 text-right">Aksi & Cetak</th>
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
                              {/* Setting Link button */}
                              <button
                                onClick={() => copyToClipboard(`${window.location.origin}/setup/${card.card_id}`, `set_${card.card_id}`)}
                                title="Salin Link Web Setting"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
                              >
                                {copiedKey === `set_${card.card_id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Settings className="w-3.5 h-3.5" />}
                              </button>

                              {/* QR View button */}
                              <button
                                onClick={() => openCardQrModal(card)}
                                title="Lihat & Download QR Simple"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                              
                              {/* Reset button */}
                              {card.is_active && (
                                <button
                                  onClick={() => handleResetCard(card.card_id)}
                                  title="Reset ke Kosong"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* ========================================================= */}
                              {/* TOMBOL CETAK DESAIN KARTU TEPAT DI SAMPING TOMBOL HAPUS */}
                              {/* ========================================================= */}
                              <button
                                onClick={() => openCardPrintModal(card)}
                                title="Cetak Standee Google Review (Sesuai Desain)"
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 hover:text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all font-semibold text-xs cursor-pointer shadow-sm active:scale-95"
                              >
                                <Printer className="w-3.5 h-3.5 text-amber-400" />
                                <span>Cetak</span>
                              </button>

                              {/* TOMBOL HAPUS KARTU */}
                              <button
                                onClick={() => handleDeleteCard(card.card_id)}
                                title="Hapus Kartu"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
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

              {/* MOBILE CARDS VIEW (visible on phone screens, hidden md and up) */}
              <div className="block md:hidden divide-y divide-slate-800">
                {filteredAdminCards.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
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
                      'Tidak ada kartu yang cocok dengan filter.'
                    )}
                  </div>
                ) : (
                  filteredAdminCards.map((card) => (
                    <div key={card.card_id} className="p-4 space-y-3">
                      {/* Top Row: ID, status, scan count */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400 text-sm">{card.card_id}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            card.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {card.is_active ? 'Aktif' : 'Menunggu Setup'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                          {card.scan_count} scan
                        </div>
                      </div>

                      {/* Middle: Business name and links */}
                      <div>
                        <div className="font-bold text-white text-xs">
                          {card.business_name || <span className="text-slate-500 italic font-normal">Belum diaktivasi</span>}
                        </div>
                        {card.gmaps_url && (
                          <a
                            href={card.gmaps_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-slate-400 hover:text-amber-400 truncate block mt-0.5"
                          >
                            {card.gmaps_url}
                          </a>
                        )}
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-cyan-400/90 bg-cyan-950/30 px-2 py-1 rounded-lg border border-cyan-800/20">
                          <span className="truncate font-mono">Link Setting: /setup/{card.card_id}</span>
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/setup/${card.card_id}`, `m_set_${card.card_id}`)}
                            className="text-cyan-300 hover:text-white shrink-0 ml-2 font-bold cursor-pointer"
                          >
                            {copiedKey === `m_set_${card.card_id}` ? 'Disalin!' : 'Salin'}
                          </button>
                        </div>
                      </div>

                      {/* Action buttons: Print beside Delete */}
                      <div className="pt-1 flex items-center justify-end gap-1.5 border-t border-slate-800/60">
                        <button
                          onClick={() => openCardQrModal(card)}
                          title="Lihat QR"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        {card.is_active && (
                          <button
                            onClick={() => handleResetCard(card.card_id)}
                            title="Reset Kartu"
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {/* TOMBOL CETAK DI SAMPING TOMBOL HAPUS */}
                        <button
                          onClick={() => openCardPrintModal(card)}
                          className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30 cursor-pointer active:scale-95 transition-all shadow-sm"
                        >
                          <Printer className="w-4 h-4 text-amber-400" />
                          <span>Cetak Desain</span>
                        </button>
                        {/* TOMBOL HAPUS */}
                        <button
                          onClick={() => handleDeleteCard(card.card_id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                          title="Hapus Kartu"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        )}

      </main>


      {/* ========================================================================= */}
      {/* CLEAN FOOTER (NO PRINT MENU)                                             */}
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
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL CETAK STANDEE KHUSUS KARTU (DI SAMPING TOMBOL HAPUS)             */}
      {/* Persis sesuai foto referensi akrilik Google 4-warna & NFC                 */}
      {/* ========================================================================= */}
      {printCardModalOpen && selectedCardForPrint && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#0d101a] border border-slate-800 rounded-3xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl relative space-y-6 my-auto">

            {/* Modal Header */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <Printer className="w-4 h-4" />
                  <span>Cetak & Download Kartu Ulasan</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
                  Desain Standee Google Review
                </h3>
                <p className="text-xs text-slate-400">
                  ID Kartu: <span className="font-mono font-bold text-white">{selectedCardForPrint.card_id}</span> • {selectedCardForPrint.business_name || 'Belum diaktivasi'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePrintSingleCard}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang</span>
                </button>
                <button
                  onClick={handleDownloadCardStandeeImage}
                  disabled={isDownloadingImage}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isDownloadingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Download className="w-3.5 h-3.5 text-amber-400" />}
                  <span>PNG 300 DPI</span>
                </button>
                <button
                  onClick={() => setPrintCardModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Left Column: Customizer */}
              <div className="no-print lg:col-span-5 space-y-4 text-xs">
                <div className="bg-[#121624] border border-slate-800 p-4 rounded-2xl space-y-3.5">
                  <div className="font-bold text-white uppercase tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pengaturan Desain</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                      Sesuai Lampiran
                    </span>
                  </div>

                  {/* Format */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Ukuran / Model:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPrintFormat('square')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          printFormat === 'square'
                            ? 'bg-amber-500/15 border-amber-500 text-white font-bold ring-1 ring-amber-500/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-xs flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Standee Persegi</span>
                        </div>
                        <div className="text-[10px] text-amber-400/90 font-medium mt-0.5">{CARD_SIZES.square.mm}</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrintFormat('cr80')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          printFormat === 'cr80'
                            ? 'bg-amber-500/15 border-amber-500 text-white font-bold ring-1 ring-amber-500/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-xs flex items-center gap-1.5">
                          <CreditCard className="w-3 h-3 text-cyan-400" />
                          <span>Kartu CR80</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{CARD_SIZES.cr80.mm}</div>
                      </button>
                    </div>
                  </div>

                  {/* Presets */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Bahasa Teks:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPrintHeaderId(DEFAULT_DESIGN.headerId);
                          setPrintHeaderEn(DEFAULT_DESIGN.headerEn);
                          setPrintTapTitle(DEFAULT_DESIGN.tapTitle);
                          setPrintTapSub(DEFAULT_DESIGN.tapSub);
                          setPrintQrTitle(DEFAULT_DESIGN.qrTitle);
                          setPrintQrSub(DEFAULT_DESIGN.qrSub);
                          setPrintThanksId(DEFAULT_DESIGN.thanksId);
                          setPrintThanksEn(DEFAULT_DESIGN.thanksEn);
                        }}
                        className="p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition-all"
                      >
                        <div className="font-bold text-[11px]">Bilingual</div>
                        <div className="text-[9px] text-slate-500">ID + EN</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPrintHeaderId('Bantu kami dengan ulasan di Google');
                          setPrintHeaderEn('Beri kami ulasan bintang 5');
                          setPrintTapTitle('TAP NFC');
                          setPrintTapSub('Tempelkan hp anda');
                          setPrintQrTitle('Scan QR');
                          setPrintQrSub('Pindai kode QR');
                          setPrintThanksId('Terima kasih atas dukungan anda :)');
                          setPrintThanksEn('Kami sangat menghargainya');
                        }}
                        className="p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition-all"
                      >
                        <div className="font-bold text-[11px]">Indonesia</div>
                        <div className="text-[9px] text-slate-500">Bahasa ID</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPrintHeaderId('Help us with a review on Google');
                          setPrintHeaderEn('We would love your 5-star review');
                          setPrintTapTitle('TAP NFC');
                          setPrintTapSub('Tap your phone here');
                          setPrintQrTitle('Scan QR');
                          setPrintQrSub('Scan the QR code');
                          setPrintThanksId('Thank you for your support :)');
                          setPrintThanksEn('We truly appreciate it');
                        }}
                        className="p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition-all"
                      >
                        <div className="font-bold text-[11px]">English</div>
                        <div className="text-[9px] text-slate-500">Full EN</div>
                      </button>
                    </div>
                  </div>

                  {/* Editable texts */}
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Judul Utama:</label>
                      <input
                        type="text"
                        value={printHeaderId}
                        onChange={(e) => setPrintHeaderId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Sub Judul:</label>
                      <input
                        type="text"
                        value={printHeaderEn}
                        onChange={(e) => setPrintHeaderEn(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Label NFC:</label>
                        <input
                          type="text"
                          value={printTapTitle}
                          onChange={(e) => setPrintTapTitle(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Keterangan NFC:</label>
                        <input
                          type="text"
                          value={printTapSub}
                          onChange={(e) => setPrintTapSub(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Label QR:</label>
                        <input
                          type="text"
                          value={printQrTitle}
                          onChange={(e) => setPrintQrTitle(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Keterangan QR:</label>
                        <input
                          type="text"
                          value={printQrSub}
                          onChange={(e) => setPrintQrSub(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Ucapan Terima Kasih (ID):</label>
                      <input
                        type="text"
                        value={printThanksId}
                        onChange={(e) => setPrintThanksId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Ucapan Terima Kasih (EN):</label>
                      <input
                        type="text"
                        value={printThanksEn}
                        onChange={(e) => setPrintThanksEn(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">ID Serial (di footer):</label>
                      <input
                        type="text"
                        value={printSerialText}
                        onChange={(e) => setPrintSerialText(e.target.value.toUpperCase())}
                        placeholder={selectedCardForPrint.card_id}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-xs"
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printShowBusinessName}
                        onChange={(e) => setPrintShowBusinessName(e.target.checked)}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      />
                      <span className="text-slate-300 font-medium">
                        Tampilkan nama bisnis ({selectedCardForPrint.business_name || 'BISNIS ANDA'})
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printShowSerial}
                        onChange={(e) => setPrintShowSerial(e.target.checked)}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      />
                      <span className="text-slate-300 font-medium">Tampilkan ID serial kartu</span>
                    </label>
                  </div>

                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Cetak Presisi 300 DPI</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Frame 4 warna Google, logo resmi, 5 bintang emas, QR asli, dan footer gelombang akan tercetak tajam tanpa pecah.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Preview */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center">
                <div className="w-full flex flex-col items-center">
                  <div className="w-full max-w-[380px] sm:max-w-[420px] mx-auto">
                    <CardPreview
                      id="print-root"
                      card={selectedCardForPrint}
                      qrDataUrl={cardPrintQrUrl}
                      options={{
                        format: printFormat,
                        headerId: printHeaderId,
                        headerEn: printHeaderEn,
                        tapTitle: printTapTitle,
                        tapSub: printTapSub,
                        qrTitle: printQrTitle,
                        qrSub: printQrSub,
                        thanksId: printThanksId,
                        thanksEn: printThanksEn,
                        serial: printSerialText,
                        showBusinessName: printShowBusinessName,
                        showSerial: printShowSerial,
                      }}
                      className="page-break-avoid"
                    />
                  </div>

                  <div className="no-print text-[11px] text-slate-400 mt-3 text-center">
                    * Preview di atas sama persis dengan hasil cetak / file PNG 300 DPI ({CARD_SIZES[printFormat].mm}).
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MASS PRINT MODAL */}
      {massPrintOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#0d101a] border border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl relative space-y-5 my-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <Layers className="w-4 h-4" />
                  <span>Mass Print / Cetak Banyak Kartu</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
                  Cetak & Download Sekaligus
                </h3>
                <p className="text-xs text-slate-400">
                  Pilih kartu, lalu cetak ke A4 atau unduh semua sebagai PNG 300 DPI.
                </p>
              </div>
              <button
                onClick={() => setMassPrintOpen(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ukuran Kartu:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMassFormat('square')}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      massFormat === 'square'
                        ? 'bg-amber-500/15 border-amber-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-[11px]">Standee Persegi</div>
                    <div className="text-[9px] text-slate-400">{CARD_SIZES.square.mm}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMassFormat('cr80')}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      massFormat === 'cr80'
                        ? 'bg-amber-500/15 border-amber-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-[11px]">Kartu CR80</div>
                    <div className="text-[9px] text-slate-400">{CARD_SIZES.cr80.mm}</div>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Kartu per Halaman A4:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMassPerPage(n as 1 | 2 | 4)}
                      className={`p-2 rounded-xl border text-center font-bold text-xs transition-all ${
                        massPerPage === n
                          ? 'bg-amber-500/15 border-amber-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {n} kartu
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Terpilih <span className="text-white font-bold">{massSelectedIds.length}</span> dari {filteredAdminCards.length} kartu
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMassSelectedIds(filteredAdminCards.map((c) => c.card_id))}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() => setMassSelectedIds([])}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-800 divide-y divide-slate-800/70">
              {filteredAdminCards.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">Tidak ada kartu pada filter saat ini.</div>
              )}
              {filteredAdminCards.map((card) => (
                <label
                  key={card.card_id}
                  className="flex items-center gap-3 p-2.5 hover:bg-slate-900/60 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={massSelectedIds.includes(card.card_id)}
                    onChange={() => toggleMassCard(card.card_id)}
                    className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      {card.business_name || 'Belum diaktivasi'}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">{card.card_id}</div>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      card.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {card.is_active ? 'AKTIF' : 'BELUM'}
                  </span>
                </label>
              ))}
            </div>

            {massProcessing && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Memproses kartu...</span>
                  <span className="font-bold text-amber-400">{massProgress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all"
                    style={{ width: `${massProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleMassDownload}
                disabled={massProcessing}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {massProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Download className="w-3.5 h-3.5 text-amber-400" />}
                <span>Download Semua PNG</span>
              </button>
              <button
                onClick={handleMassPrint}
                disabled={massProcessing}
                className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {massProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                <span>Cetak Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

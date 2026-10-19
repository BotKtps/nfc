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
  X
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

  // Batch generator modal (Admin)
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState('CARD');
  const [batchCount, setBatchCount] = useState(10);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  // Simple QR Modal for single card (Admin)
  const [selectedCardForQR, setSelectedCardForQR] = useState<Card | null>(null);
  const [qrModalDataUrl, setQrModalDataUrl] = useState<string>('');

  // ==========================================
  // FITUR CETAK KARTU / STANDEE KHUSUS ADMIN (DI SAMPING TOMBOL HAPUS)
  // Desain sesuai referensi Standee Google 4-Warna
  // ==========================================
  const [printCardModalOpen, setPrintCardModalOpen] = useState(false);
  const [selectedCardForPrint, setSelectedCardForPrint] = useState<Card | null>(null);
  const [cardPrintQrUrl, setCardPrintQrUrl] = useState<string>('');
  const [customStampText, setCustomStampText] = useState<string>('');
  const [customSubtitle, setCustomSubtitle] = useState<string>('Help with a review on Google');
  const [printFormat, setPrintFormat] = useState<'standee_acrylic' | 'card_cr80'>('standee_acrylic');
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

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
        try {
          const qrUrl = await QRCode.toDataURL(redirectUrl, {
            width: 320,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setSetupQrDataUrl(qrUrl);
        } catch (qrErr) {
          console.error('Failed to generate preview QR code:', qrErr);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setSetupError(err.error || `Kartu "${cardId}" tidak ditemukan dalam sistem.`);
        setSetupCardData(null);
      }
    } catch (e: any) {
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

      const data = await res.json();
      if (res.ok) {
        setSetupSuccessResult(data);
        if (data.card) {
          setSetupCardData(data.card);
        }
        const reviewUrl = data.review_url || data.card?.gmaps_url || `${window.location.origin}/r/${setupCardData.card_id}`;
        try {
          const qrUrl = await QRCode.toDataURL(reviewUrl, {
            width: 380,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setSetupQrDataUrl(qrUrl);
        } catch (qrErr) {
          console.error('Error creating review QR code:', qrErr);
        }
      } else {
        setSetupError(data.error || 'Gagal menyimpan konfigurasi kartu.');
      }
    } catch (e) {
      setSetupError('Terjadi kesalahan jaringan saat menyimpan konfigurasi.');
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
        setCurrentView('admin_dashboard');
      } else {
        setAdminLoginError('Otorisasi gagal pada server backend.');
      }
    } catch (e) {
      setAdminLoginError('Terjadi kesalahan jaringan.');
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
  // BUKA MODAL CETAK STANDEE KHUSUS KARTU INI (SAMPING TOMBOL HAPUS)
  // Desain sesuai gambar akrilik Google 4-warna yang dilampirkan user
  // =========================================================================
  const openCardPrintModal = async (card: Card) => {
    setSelectedCardForPrint(card);
    const defaultStamp = card.business_name
      ? card.business_name.length > 20
        ? card.business_name.substring(0, 18).toUpperCase()
        : card.business_name.toUpperCase()
      : 'WOODS BARBER SHOP';
    setCustomStampText(defaultStamp);
    setPrintCardModalOpen(true);

    // Target URL: redirect URL kartu (akan mengarahkan ke Google Review bila sudah diatur)
    const targetUrl = card.gmaps_url || `${window.location.origin}/r/${card.card_id}`;
    try {
      const qrData = await QRCode.toDataURL(targetUrl, {
        width: 600,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setCardPrintQrUrl(qrData);
    } catch (err) {
      console.error('Gagal generate QR untuk cetak kartu:', err);
    }
  };

  // Download Standee Image as 300 DPI High Resolution PNG
  const handleDownloadCardStandeeImage = async () => {
    if (!selectedCardForPrint) return;
    setIsDownloadingImage(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isCard = printFormat === 'card_cr80';
      const width = isCard ? 1012 : 1240;
      const height = isCard ? 638 : 1754;

      canvas.width = width;
      canvas.height = height;

      if (!isCard) {
        // STANDALONE ACRYLIC STANDEE (A6/A5 Proportion)
        const midX = width / 2;
        const midY = height / 2;

        // 1. Google 4-Quadrant Color Background
        // Top-Left: Yellow (#FBBC05)
        ctx.fillStyle = '#FBBC05';
        ctx.fillRect(0, 0, midX, midY);

        // Top-Right: Red (#EA4335)
        ctx.fillStyle = '#EA4335';
        ctx.fillRect(midX, 0, midX, midY);

        // Bottom-Left: Green (#34A853)
        ctx.fillStyle = '#34A853';
        ctx.fillRect(0, midY, midX, midY);

        // Bottom-Right: Blue (#4285F4)
        ctx.fillStyle = '#4285F4';
        ctx.fillRect(midX, midY, midX, midY);

        // 2. Inner White Rounded Card
        const inset = 60;
        const cardW = width - (inset * 2);
        const cardH = height - (inset * 2);
        const radius = 64;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(inset + radius, inset);
        ctx.lineTo(inset + cardW - radius, inset);
        ctx.quadraticCurveTo(inset + cardW, inset, inset + cardW, inset + radius);
        ctx.lineTo(inset + cardW, inset + cardH - radius);
        ctx.quadraticCurveTo(inset + cardW, inset + cardH, inset + cardW - radius, inset + cardH);
        ctx.lineTo(inset + radius, inset + cardH);
        ctx.quadraticCurveTo(inset, inset + cardH, inset, inset + cardH - radius);
        ctx.lineTo(inset, inset + radius);
        ctx.quadraticCurveTo(inset, inset, inset + radius, inset);
        ctx.closePath();

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 12;
        ctx.fill();
        ctx.restore();

        // 3. Draw Google G Logo on Top Left
        const gSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="120" height="120">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>`;
        const gImg = new Image();
        gImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(gSvg);
        await new Promise((res) => { gImg.onload = res; });
        ctx.drawImage(gImg, inset + 60, inset + 50, 110, 110);

        // 4. Circular Business Stamp on Top Right
        const stampRadius = 55;
        const stampCenterX = inset + cardW - 120;
        const stampCenterY = inset + 105;
        ctx.save();
        ctx.beginPath();
        ctx.arc(stampCenterX, stampCenterY, stampRadius, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
        const stampText = customStampText || selectedCardForPrint.business_name || 'WOODS BARBER';
        const words = stampText.split(' ');
        if (words.length > 2) {
          ctx.fillText(words.slice(0, 2).join(' '), stampCenterX, stampCenterY - 12);
          ctx.fillText(words.slice(2).join(' '), stampCenterX, stampCenterY + 12);
        } else {
          ctx.fillText(stampText, stampCenterX, stampCenterY);
        }
        ctx.restore();

        // 5. Business Name in Center
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 52px "Plus Jakarta Sans", sans-serif';
        const bName = (selectedCardForPrint.business_name || 'WOODS BARBERSHOP ADISUCIPTO').toUpperCase();
        ctx.fillText(bName, width / 2, inset + 260);

        // 6. Headline & Subheadline
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Bantu kami dengan ulasan di Google', width / 2, inset + 325);

        ctx.fillStyle = '#64748b';
        ctx.font = '500 28px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(customSubtitle || 'Help with a review on Google', width / 2, inset + 370);

        // 7. 5 Gold Stars
        ctx.fillStyle = '#FBBC05';
        ctx.font = '52px sans-serif';
        ctx.fillText('★★★★★', width / 2, inset + 450);

        // 8. NFC Tap Icon (Left side)
        const nfcCenterX = width / 2 - 240;
        const nfcCenterY = inset + 680;

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        // Arcs
        for (let r = 50; r <= 110; r += 30) {
          ctx.beginPath();
          ctx.arc(nfcCenterX, nfcCenterY - 30, r, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        }
        // Card shape
        ctx.strokeRect(nfcCenterX - 45, nfcCenterY - 20, 90, 60);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Tap NFC', nfcCenterX, inset + 860);

        // 9. Center Divider with "Atau"
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(width / 2, inset + 560);
        ctx.lineTo(width / 2, inset + 820);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(width / 2 - 40, inset + 670, 80, 40);
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Atau', width / 2, inset + 700);

        // 10. QR Code (Right side)
        const qrSize = 340;
        const qrX = width / 2 + 70;
        const qrY = inset + 510;

        if (cardPrintQrUrl) {
          const qrImg = new Image();
          qrImg.src = cardPrintQrUrl;
          await new Promise((res) => { qrImg.onload = res; });
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        }

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Scan QR', qrX + (qrSize / 2), inset + 910);

        // 11. Thank You Bottom Text
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Terima kasih atas dukungan anda :)', width / 2, inset + 1040);

        ctx.fillStyle = '#64748b';
        ctx.font = '500 28px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Thank you for your support :)', width / 2, inset + 1085);
      } else {
        // CR80 POCKET CARD FORMAT (Landscape)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // 4 color accent bar at top
        const barH = 16;
        ctx.fillStyle = '#FBBC05'; ctx.fillRect(0, 0, width * 0.25, barH);
        ctx.fillStyle = '#EA4335'; ctx.fillRect(width * 0.25, 0, width * 0.25, barH);
        ctx.fillStyle = '#34A853'; ctx.fillRect(width * 0.5, 0, width * 0.25, barH);
        ctx.fillStyle = '#4285F4'; ctx.fillRect(width * 0.75, 0, width * 0.25, barH);

        // Card Border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        // Business Name
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
        ctx.fillText((selectedCardForPrint.business_name || 'WOODS BARBERSHOP').toUpperCase(), 60, 100);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Bantu kami dengan ulasan di Google', 60, 150);

        ctx.fillStyle = '#FBBC05';
        ctx.font = '36px sans-serif';
        ctx.fillText('★★★★★', 60, 200);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('⚡ Tap NFC Smartphone Anda', 60, 290);

        ctx.fillStyle = '#64748b';
        ctx.font = '22px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('ID Kartu: ' + selectedCardForPrint.card_id, 60, 340);

        // QR Code right side
        if (cardPrintQrUrl) {
          const qrImg = new Image();
          qrImg.src = cardPrintQrUrl;
          await new Promise((res) => { qrImg.onload = res; });
          ctx.drawImage(qrImg, width - 360, 80, 280, 280);
          ctx.textAlign = 'center';
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
          ctx.fillText('Scan QR Kamera', width - 220, 390);
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = '#64748b';
        ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Terima kasih atas dukungan anda :)', 60, height - 50);
      }

      // Download PNG file
      const link = document.createElement('a');
      link.download = `Standee_Google_Review_${(selectedCardForPrint.business_name || selectedCardForPrint.card_id).replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating image:', err);
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
              <div className="bg-[#0e121e] border border-emerald-500/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Kartu Berhasil Diaktivasi!</h3>
                  <p className="text-xs text-slate-300">
                    Kartu <span className="font-mono font-bold text-amber-400">{setupSuccessResult.card_id}</span> kini resmi terhubung ke <strong className="text-white">{setupSuccessResult.business_name}</strong>.
                  </p>
                </div>

                {setupQrDataUrl && (
                  <div className="p-4 bg-white rounded-2xl text-center max-w-xs mx-auto shadow-xl">
                    <img src={setupQrDataUrl} alt="QR Code Review" className="w-48 h-48 mx-auto" />
                    <p className="text-[10px] text-slate-600 font-semibold mt-2">Scan untuk tes ulasan Google</p>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">URL Redirect Kartu:</span>
                      <span className="font-mono text-white text-xs">{setupSuccessResult.review_url}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(setupSuccessResult.review_url, 'redir')}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
                    >
                      {copiedKey === 'redir' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => {
                      setSetupSuccessResult(null);
                      setCurrentView('landing');
                    }}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Kembali ke Beranda
                  </button>
                </div>
              </div>
            ) : setupCardData ? (
              <form onSubmit={handleSaveCustomerSetup} className="bg-[#0e121e] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="font-mono text-xs text-amber-400 font-bold">
                    ID: {setupCardData.card_id}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    setupCardData.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {setupCardData.is_active ? 'Sudah Aktif (Dapat Diubah)' : 'Belum Diatur'}
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
                    className="w-full bg-[#121624] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
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
                    className="w-full bg-[#121624] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-slate-400">
                    Buka Google Maps, klik Bagikan (Share) profil bisnis Anda, lalu salin link dan tempelkan di atas.
                  </p>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={savingSetup}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
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
            <div className="bg-[#0e121e] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
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
          <div className="bg-[#0d101a] border border-slate-800 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl relative space-y-6 my-auto">
            
            {/* Modal Header */}
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <Printer className="w-4 h-4" />
                  <span>Cetak Standee Display Google Review</span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight mt-0.5">
                  Format Display Akrilik Meja & Kartu Kasir
                </h3>
                <p className="text-xs text-slate-400">
                  ID Kartu: <span className="font-mono font-bold text-white">{selectedCardForPrint.card_id}</span> • {selectedCardForPrint.business_name || 'Belum diaktivasi'}
                </p>
              </div>

              {/* Action Buttons & Close */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang</span>
                </button>
                <button
                  onClick={handleDownloadCardStandeeImage}
                  disabled={isDownloadingImage}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
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

            {/* Modal Body: Left Controls, Right Real-Time Standee Card (Matching Attachment Image) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Quick Customizer (No-Print) */}
              <div className="no-print lg:col-span-5 space-y-4 text-xs">
                <div className="bg-[#121624] border border-slate-800 p-4 rounded-2xl space-y-3.5">
                  <div className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pengaturan Tampilan Cetak</span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Pilihan Model Display:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPrintFormat('standee_acrylic')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          printFormat === 'standee_acrylic'
                            ? 'bg-amber-500/10 border-amber-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-xs">Standee Meja Akrilik</div>
                        <div className="text-[10px] text-slate-500">Sesuai Gambar Lampiran</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintFormat('card_cr80')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          printFormat === 'card_cr80'
                            ? 'bg-amber-500/10 border-amber-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-xs">Kartu Kasir CR80</div>
                        <div className="text-[10px] text-slate-500">Ukuran Kartu ATM / Saku</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Teks Cap Bulat Kanan Atas:
                    </label>
                    <input
                      type="text"
                      value={customStampText}
                      onChange={(e) => setCustomStampText(e.target.value.toUpperCase())}
                      placeholder="WOODS BARBERSHOP"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase font-bold text-xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Lingkaran stempel di pojok kanan atas kartu seperti contoh foto.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Subteks Bahasa Inggris:
                    </label>
                    <input
                      type="text"
                      value={customSubtitle}
                      onChange={(e) => setCustomSubtitle(e.target.value)}
                      placeholder="Help with a review on Google"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                    />
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Standar Cetak Akrilik 300 DPI</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Warna 4-kuadran Google (Kuning, Merah, Hijau, Biru) dan QR code akan dicetak tajam tanpa pecah.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Preview & Printable Element */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center">
                
                {/* Printable container with ID `print-root` */}
                <div 
                  id="print-root" 
                  className={`w-full ${
                    printFormat === 'standee_acrylic' ? 'max-w-[390px]' : 'max-w-[440px]'
                  } rounded-3xl p-4 sm:p-5 relative overflow-hidden shadow-2xl transition-all page-break-avoid bg-white select-none`}
                >
                  
                  {printFormat === 'standee_acrylic' ? (
                    <>
                      {/* ========================================================================= */}
                      {/* GOOGLE 4-QUADRANT COLOR FRAME (Sesuai gambar referensi akrilik)           */}
                      {/* ========================================================================= */}
                      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
                        <div className="bg-[#FBBC05]" /> {/* Top-Left: Google Yellow / Gold */}
                        <div className="bg-[#EA4335]" /> {/* Top-Right: Google Red */}
                        <div className="bg-[#34A853]" /> {/* Bottom-Left: Google Green */}
                        <div className="bg-[#4285F4]" /> {/* Bottom-Right: Google Blue */}
                      </div>

                      {/* Inner White Rounded Card */}
                      <div className="relative z-10 bg-white rounded-[24px] p-5 sm:p-6 flex flex-col items-center text-center shadow-md h-full">
                        
                        {/* Top Header: Google 'G' (Left) and Circular Business Stamp (Right) */}
                        <div className="w-full flex items-center justify-between mb-2">
                          {/* Google 'G' Official 4-Color Logo */}
                          <div className="w-11 h-11 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-10 h-10 drop-shadow-sm">
                              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                            </svg>
                          </div>

                          {/* Business Stamp Badge (Like WOODS BARBERSHOP in reference) */}
                          <div className="w-13 h-13 rounded-full border-2 border-black flex flex-col items-center justify-center p-1 text-center font-black text-black">
                            <span className="text-[9px] leading-[1.1] uppercase font-extrabold tracking-tight">
                              {customStampText || selectedCardForPrint.business_name || 'WOODS BARBER'}
                            </span>
                          </div>
                        </div>

                        {/* Business Name (Bold, Uppercase) */}
                        <h4 className="font-black text-base sm:text-lg text-black tracking-tight uppercase mt-1 mb-1">
                          {selectedCardForPrint.business_name || 'WOODS BARBERSHOP ADISUCIPTO'}
                        </h4>

                        {/* Headline & Subheadline */}
                        <p className="font-bold text-sm text-slate-900 leading-snug">
                          Bantu kami dengan ulasan di Google
                        </p>
                        <p className="text-[11px] text-slate-600 font-medium mb-1">
                          {customSubtitle}
                        </p>

                        {/* 5 Golden Rating Stars */}
                        <div className="flex items-center justify-center gap-1 text-[#FBBC05] text-xl my-1 drop-shadow-xs">
                          <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                        </div>

                        {/* Dual Tap NFC / Scan QR Side-by-Side */}
                        <div className="w-full flex items-center justify-around my-2 py-1">
                          
                          {/* Left: Tap NFC */}
                          <div className="flex flex-col items-center justify-center w-5/12">
                            <div className="w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center">
                              <svg viewBox="0 0 100 100" className="w-14 h-14 text-slate-900 stroke-current fill-none">
                                <path d="M 25 35 A 35 35 0 0 1 75 35" strokeWidth="5.5" strokeLinecap="round" />
                                <path d="M 33 43 A 24 24 0 0 1 67 43" strokeWidth="5.5" strokeLinecap="round" />
                                <path d="M 41 51 A 13 13 0 0 1 59 51" strokeWidth="5.5" strokeLinecap="round" />
                                <rect x="28" y="58" width="44" height="28" rx="4" strokeWidth="5" fill="#f8fafc" />
                                <path d="M 68 70 C 76 72, 80 82, 74 90 L 52 90" strokeWidth="4.5" strokeLinecap="round" />
                              </svg>
                            </div>
                            <span className="font-extrabold text-xs text-black mt-1">Tap NFC</span>
                          </div>

                          {/* Middle: Vertical Divider with 'Atau' */}
                          <div className="relative flex flex-col items-center justify-center h-20">
                            <div className="w-[1.5px] h-full bg-slate-300" />
                            <span className="absolute bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 rounded">
                              Atau
                            </span>
                          </div>

                          {/* Right: Scan QR */}
                          <div className="flex flex-col items-center justify-center w-5/12">
                            <div className="w-18 h-18 sm:w-20 sm:h-20 bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex items-center justify-center">
                              {cardPrintQrUrl ? (
                                <img src={cardPrintQrUrl} alt="QR Code" className="w-full h-full object-contain" />
                              ) : (
                                <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
                              )}
                            </div>
                            <span className="font-extrabold text-xs text-black mt-1">Scan QR</span>
                          </div>

                        </div>

                        {/* Bottom Thank You Message */}
                        <div className="pt-2 border-t border-slate-100 w-full">
                          <p className="font-extrabold text-xs text-slate-900 leading-snug">
                            Terima kasih atas dukungan anda :)
                          </p>
                          <p className="text-[10px] text-slate-600 font-medium">
                            Thank you for your support :)
                          </p>
                        </div>

                      </div>
                    </>
                  ) : (
                    /* CR80 Landscape Format */
                    <div className="border border-slate-200 rounded-2xl p-4 bg-white text-slate-900 relative">
                      {/* 4 Color top band */}
                      <div className="h-1.5 w-full flex rounded-full overflow-hidden mb-3">
                        <div className="w-1/4 bg-[#FBBC05]" />
                        <div className="w-1/4 bg-[#EA4335]" />
                        <div className="w-1/4 bg-[#34A853]" />
                        <div className="w-1/4 bg-[#4285F4]" />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1 text-[#FBBC05] text-xs mb-1">
                            ★★★★★
                          </div>
                          <h4 className="font-black text-sm text-black uppercase">
                            {selectedCardForPrint.business_name || 'WOODS BARBERSHOP'}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-800">
                            Bantu kami dengan ulasan di Google
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {customSubtitle}
                          </p>
                          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-black">
                            <span>⚡ Tap NFC Kartu</span>
                            <span className="text-[9px] text-slate-400 font-mono">[{selectedCardForPrint.card_id}]</span>
                          </div>
                        </div>

                        <div className="text-center shrink-0">
                          <div className="w-20 h-20 bg-white p-1 rounded-lg border border-slate-300">
                            {cardPrintQrUrl && <img src={cardPrintQrUrl} alt="QR" className="w-full h-full object-contain" />}
                          </div>
                          <span className="text-[9px] font-bold text-black block mt-0.5">Scan QR</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-600 font-medium text-center">
                        Terima kasih atas dukungan anda :)
                      </div>
                    </div>
                  )}

                </div>

                <div className="no-print text-[11px] text-slate-500 mt-3 text-center">
                  * Tampilan di atas adalah ukuran display presisi yang akan langsung tercetak pada printer / file gambar.
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

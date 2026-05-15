import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Crown, RefreshCw, Loader2, ExternalLink, FileText, Mail, MessageCircle,
  CheckCircle2, Circle, Search, ChevronLeft, Save, Globe, Trash2, BadgeEuro,
  Sparkles, Copy, X, Calendar, Bell, AlertTriangle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import API from '@/lib/api';

// Default features sempre incluse nel preventivo (lista standard professionale)
const DEFAULT_QUOTE_FEATURES = [
  'Sito web professionale responsive (mobile, tablet, desktop)',
  'Design moderno personalizzato con i colori del brand',
  'Hosting incluso primo anno (server europei ad alte performance)',
  'Dominio personalizzato incluso primo anno (es. nomeattivita.it)',
  'Certificato SSL HTTPS automatico e sempre attivo',
  'Galleria fotografica ottimizzata per il web',
  'Sezione recensioni Google sincronizzate automaticamente',
  'Orari di apertura sempre aggiornati e ben visibili',
  'Mappa interattiva con indicazioni stradali Google Maps',
  'Pulsanti diretti WhatsApp + chiamata telefonica',
  'Sezione contatti completa (form, telefono, email, social)',
  'Integrazione social Instagram & Facebook',
  'Ottimizzazione SEO base per Google (titolo, meta, sitemap)',
  'Velocità di caricamento ottimizzata (Core Web Vitals)',
  'Tracking visite e statistiche di accesso incluse',
  'Supporto tecnico via email per 6 mesi',
  'Possibilità di modifiche minori incluse nel primo mese',
];

const EMPTY_COSTS = {
  site_price: '',
  domain_price: '',
  hosting_price: '',
  extra_price: '',
  extra_label: '',
  currency: 'EUR',
  notes: '',
  paid: false,
  payment_date: '',
  domain_renewal_date: '',
  hosting_renewal_date: '',
  tax_mode: 'without_vat',
  client_vat: '',
  client_fiscal_code: '',
};

// Costruisce voci preventivo in base alle sezioni effettivamente attive nel sito demo
function buildDynamicFeatures(demo) {
  if (!demo) return DEFAULT_QUOTE_FEATURES;
  const business = demo.business_data || {};
  const content = demo.content || {};
  const features = [
    'Sito web professionale responsive (mobile, tablet, desktop)',
    'Design moderno personalizzato con i colori del brand',
    'Hosting incluso primo anno (server europei ad alte performance)',
    'Dominio personalizzato incluso primo anno (es. nomeattivita.it)',
    'Certificato SSL HTTPS automatico e sempre attivo',
  ];
  if ((business.photos || []).length > 0 && content.show_gallery !== false) {
    features.push('Galleria fotografica ottimizzata per il web');
  }
  if ((business.reviews || []).length > 0 && content.show_reviews !== false) {
    features.push('Sezione recensioni Google sincronizzate automaticamente');
  }
  if ((content.menu_items || content.services || []).length > 0 && content.show_services !== false) {
    features.push('Sezione servizi / menu prodotti completa');
  }
  if (business.hours_text && content.show_hours !== false) {
    features.push('Orari di apertura sempre aggiornati e ben visibili');
  }
  if (content.show_map !== false) {
    features.push('Mappa interattiva con indicazioni stradali Google Maps');
  }
  const hasBooking = (business.booking_mode && business.booking_mode !== 'none') || business.external_booking_url;
  if (hasBooking) {
    features.push('Sistema prenotazioni online con notifica email automatica');
  }
  features.push('Pulsanti diretti WhatsApp + chiamata telefonica');
  features.push('Sezione contatti completa (form, telefono, email, social)');
  features.push('Integrazione social Instagram & Facebook');
  if ((content.faq || []).length > 0 && content.show_faq !== false) {
    features.push('Sezione FAQ con domande frequenti');
  }
  const translations = business.translations || [];
  if (translations.length > 0) {
    features.push(`Sito multilingua (${translations.length + 1} lingue: italiano + ${translations.slice(0, 3).join(', ')})`);
  }
  features.push('Ottimizzazione SEO base per Google (titolo, meta, sitemap)');
  features.push('Velocità di caricamento ottimizzata (Core Web Vitals)');
  features.push('Tracking visite e statistiche di accesso incluse');
  features.push('Supporto tecnico via email per 6 mesi');
  features.push('Possibilità di modifiche minori incluse nel primo mese');
  return features;
}

const CURRENCY_SYMBOL = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF' };

function formatCurrency(value, currency = 'EUR') {
  const n = Number(value) || 0;
  const sym = CURRENCY_SYMBOL[currency] || currency;
  return `${sym} ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatBox({ label, value, icon: Icon, color = 'bg-emerald-600' }) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center gap-2 sm:items-start sm:gap-0 sm:justify-between">
        <div className={`p-2 sm:p-2.5 rounded-lg ${color}`}>
          <Icon size={16} className="text-white sm:hidden" />
          <Icon size={20} className="text-white hidden sm:block" />
        </div>
        <div className="sm:hidden flex-1 min-w-0">
          <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide truncate">{label}</p>
          <p className="text-base font-bold tracking-tight truncate">{value}</p>
        </div>
      </div>
      <p className="hidden sm:block text-xs text-neutral-500 mt-3 font-medium uppercase tracking-wide">{label}</p>
      <p className="hidden sm:block text-2xl font-bold mt-0.5 tracking-tight">{value}</p>
    </Card>
  );
}

function ClientRow({ client, demo, active, onClick }) {
  const costs = client.client_costs || {};
  const total = costs.total || 0;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`client-row-${client.lead_id}`}
      className={`w-full text-left px-4 py-3 border-b border-neutral-100 transition-colors ${
        active ? 'bg-emerald-50 border-l-4 border-l-emerald-600' : 'hover:bg-neutral-50 border-l-4 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{client.name}</p>
          <p className="text-xs text-neutral-500 truncate">{client.category || 'Categoria n/d'} · {client.city || ''}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-emerald-700">{formatCurrency(total, costs.currency)}</p>
          {costs.paid ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] py-0">PAGATO</Badge>
          ) : total > 0 ? (
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] py-0">DA INCASSARE</Badge>
          ) : (
            <span className="text-[10px] text-neutral-400">Imposta prezzo</span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const { leadId } = useParams();

  const [clients, setClients] = useState([]);
  const [demos, setDemos] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(leadId || null);

  const [costs, setCosts] = useState(EMPTY_COSTS);
  const [saving, setSaving] = useState(false);
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceType, setInvoiceType] = useState('full'); // 'full' | 'deposit' | 'balance'
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [whatsappVariant, setWhatsappVariant] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [quoteFeatures, setQuoteFeatures] = useState(DEFAULT_QUOTE_FEATURES.join('\n'));
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [renewals, setRenewals] = useState([]);
  const [reminderSending, setReminderSending] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, demosRes, renewalsRes] = await Promise.all([
        axios.get(`${API}/leads?status=client`),
        axios.get(`${API}/demos`),
        axios.get(`${API}/leads?action=upcoming_renewals&days=30`).catch(() => ({ data: { renewals: [] } })),
      ]);
      const list = (leadsRes.data || []).filter((l) =>
        ['client', 'cliente', 'cliente_acquisito'].includes(l.status)
      );
      setClients(list);
      const map = {};
      (demosRes.data || []).forEach((d) => {
        if (d.lead_id) map[d.lead_id] = d;
      });
      setDemos(map);
      setRenewals(renewalsRes.data?.renewals || []);
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
      toast.error('Errore caricamento clienti');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // When client changes, populate cost form
  useEffect(() => {
    if (!selectedId) {
      setCosts(EMPTY_COSTS);
      setWhatsappMessage('');
      setEmailRecipient('');
      return;
    }
    const current = clients.find((c) => c.lead_id === selectedId);
    if (current) {
      const c = current.client_costs || {};
      setCosts({
        site_price: c.site_price ?? '',
        domain_price: c.domain_price ?? '',
        hosting_price: c.hosting_price ?? '',
        extra_price: c.extra_price ?? '',
        extra_label: c.extra_label ?? '',
        currency: c.currency || 'EUR',
        notes: c.notes ?? '',
        paid: !!c.paid,
        payment_date: c.payment_date ?? '',
        domain_renewal_date: c.domain_renewal_date ?? '',
        hosting_renewal_date: c.hosting_renewal_date ?? '',
        tax_mode: c.tax_mode || 'without_vat',
        client_vat: c.client_vat ?? '',
        client_fiscal_code: c.client_fiscal_code ?? '',
      });
      // Voci preventivo dinamiche basate sulle sezioni effettivamente attive del demo
      const demo = demos[current.lead_id];
      setQuoteFeatures(buildDynamicFeatures(demo).join('\n'));
      setEmailRecipient(current.email || '');
      setWhatsappMessage('');
      setWhatsappVariant(null);
    }
  }, [selectedId, clients]);

  const selected = clients.find((c) => c.lead_id === selectedId) || null;
  const selectedDemo = selected ? demos[selected.lead_id] : null;

  const totalAmount =
    (Number(costs.site_price) || 0) +
    (Number(costs.domain_price) || 0) +
    (Number(costs.hosting_price) || 0) +
    (Number(costs.extra_price) || 0);

  const filteredClients = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q);
  });

  // Aggregate stats
  const totalRevenue = clients.reduce((acc, c) => acc + (c.client_costs?.total || 0), 0);
  const paidRevenue = clients.reduce((acc, c) => acc + (c.client_costs?.paid ? (c.client_costs?.total || 0) : 0), 0);
  const pendingRevenue = totalRevenue - paidRevenue;

  const handleSelect = (id) => {
    setSelectedId(id);
    navigate(`/clients/${id}`, { replace: true });
  };

  const handleSaveCosts = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/leads?action=save_client_costs`, {
        lead_id: selectedId,
        ...costs,
        site_price: Number(costs.site_price) || 0,
        domain_price: Number(costs.domain_price) || 0,
        hosting_price: Number(costs.hosting_price) || 0,
        extra_price: Number(costs.extra_price) || 0,
      });
      const saved = res.data?.costs;
      setClients((arr) =>
        arr.map((c) => (c.lead_id === selectedId ? { ...c, client_costs: saved } : c))
      );
      toast.success('Costi salvati');
    } catch (error) {
      console.error('Errore salvataggio costi:', error);
      toast.error('Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const _buildQuotePayload = () => {
    // Features = lista voci dal textarea (una per riga) + voci con prezzo dai costi
    const baseFeatures = quoteFeatures
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    return {
      price: totalAmount > 0 ? totalAmount : undefined,
      currency: costs.currency,
      notes: costs.notes,
      features: baseFeatures.length > 0 ? baseFeatures : undefined,
      tax_mode: costs.tax_mode,
      client_vat: costs.client_vat || undefined,
      client_fiscal_code: costs.client_fiscal_code || undefined,
    };
  };

  const _downloadBase64Pdf = (base64, filename) => {
    const byteChars = atob(base64);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArr], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateQuote = async () => {
    if (!selectedDemo) {
      toast.error('Questo cliente non ha ancora un sito demo associato');
      return;
    }
    setGeneratingQuote(true);
    try {
      const res = await axios.post(`${API}/demos/${selectedDemo.demo_id}?action=quote`, _buildQuotePayload());
      const safeName = selected.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = res.data?.filename || `preventivo-${safeName}.pdf`;
      if (res.data?.pdf_base64) {
        _downloadBase64Pdf(res.data.pdf_base64, filename);
        toast.success('Preventivo PDF scaricato');
      } else {
        toast.error('PDF non disponibile nella risposta');
      }
    } catch (error) {
      console.error('Errore preventivo:', error);
      toast.error(error?.response?.data?.error || 'Errore generazione preventivo');
    } finally {
      setGeneratingQuote(false);
    }
  };

  const handleGenerateInvoice = async (sendByEmail = false) => {
    if (!selectedDemo) {
      toast.error('Questo cliente non ha ancora un sito demo associato');
      return;
    }
    if (sendByEmail && (!emailRecipient || !emailRecipient.includes('@'))) {
      toast.error('Inserisci un indirizzo email valido');
      return;
    }
    setGeneratingInvoice(true);
    try {
      const payload = _buildQuotePayload();
      payload.invoice_type = invoiceType;  // 'full' | 'deposit' (50%) | 'balance' (50%)
      if (sendByEmail) {
        payload.send_email = true;
        payload.recipient_email = emailRecipient;
      }
      const res = await axios.post(`${API}/demos/${selectedDemo.demo_id}?action=invoice`, payload);
      const safeName = selected.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = res.data?.filename || `fattura-${safeName}.pdf`;
      if (res.data?.pdf_base64) {
        _downloadBase64Pdf(res.data.pdf_base64, filename);
        if (sendByEmail) {
          if (res.data?.sent) toast.success(`Fattura ${res.data.invoice_id} inviata a ${emailRecipient}`);
          else toast.error(res.data?.send_error || 'Email non inviata');
        } else {
          toast.success(`Fattura ${res.data?.invoice_id || ''} scaricata`);
        }
      } else {
        toast.error('PDF fattura non disponibile');
      }
    } catch (error) {
      console.error('Errore fattura:', error);
      toast.error(error?.response?.data?.error || 'Errore generazione fattura');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleSendQuoteEmail = async () => {
    if (!selectedDemo) {
      toast.error('Questo cliente non ha ancora un sito demo associato');
      return;
    }
    if (!emailRecipient || !emailRecipient.includes('@')) {
      toast.error('Inserisci un indirizzo email valido');
      return;
    }
    setEmailLoading(true);
    try {
      const res = await axios.post(`${API}/demos/${selectedDemo.demo_id}?action=quote`, {
        ..._buildQuotePayload(),
        send_email: true,
        recipient_email: emailRecipient,
      });
      if (res.data?.sent) {
        toast.success(`Preventivo inviato a ${emailRecipient}`);
      } else {
        toast.error(res.data?.send_error || 'Email non inviata');
      }
    } catch (error) {
      console.error('Errore invio preventivo:', error);
      toast.error('Errore invio email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGenerateWhatsapp = async () => {
    if (!selectedDemo) {
      toast.error('Questo cliente non ha ancora un sito demo associato');
      return;
    }
    setWhatsappLoading(true);
    try {
      const rawUrl = selectedDemo.vercel_url || selectedDemo.demo_url || `/demo/${selectedDemo.demo_id}`;
      const liveUrl = rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl}`;
      const nextCount = whatsappMessage ? 1 : 0;
      const res = await axios.post(
        `${API}/whatsapp/generate?lead_id=${selectedId}&demo_url=${encodeURIComponent(liveUrl)}&regenerate=${nextCount}`
      );
      setWhatsappMessage(res.data.message);
      setWhatsappVariant(res.data.variant || (nextCount === 0 ? 'standard' : 'ai'));
      toast.success(nextCount === 0 ? 'Messaggio standard pronto' : 'Variante AI generata');
    } catch (error) {
      console.error('Errore WhatsApp:', error);
      toast.error('Errore generazione messaggio');
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleOpenWhatsapp = () => {
    if (!whatsappMessage || !selected) return;
    const phone = (selected.phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
    const text = encodeURIComponent(whatsappMessage);
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyWhatsapp = async () => {
    if (!whatsappMessage) return;
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      toast.success('Messaggio copiato');
    } catch {
      toast.error('Impossibile copiare');
    }
  };

  const handleOpenDemo = () => {
    if (!selectedDemo) return;
    const rawUrl = selectedDemo.vercel_url || selectedDemo.demo_url || `/demo/${selectedDemo.demo_id}`;
    const url = rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSendRenewalReminder = (renewal) => {
    setReminderSending(renewal.lead_id + renewal.type);
    const days = renewal.days_to;
    const when = days < 0
      ? `era prevista il ${renewal.renewal_date} (scaduta da ${Math.abs(days)} giorni)`
      : days === 0
      ? `è OGGI`
      : `tra ${days} giorni (il ${renewal.renewal_date})`;
    const amount = renewal.amount ? `€ ${Number(renewal.amount).toFixed(2)}` : '';
    const msg =
      `Buongiorno! 👋\n\n` +
      `Ti scrivo per ricordarti che la scadenza del rinnovo ${renewal.type.toLowerCase()} ${when}.\n` +
      (amount ? `Importo previsto: ${amount}\n\n` : '\n') +
      `Per non interrompere il servizio, ti chiedo di confermare il rinnovo rispondendo a questo messaggio. Procedo io con tutto.\n\n` +
      `Grazie e buona giornata,\nAndrea — WebFinder Studio`;

    const phone = (renewal.phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (phone) {
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('WhatsApp aperto con il promemoria');
    } else if (renewal.email) {
      const url = `mailto:${renewal.email}?subject=${encodeURIComponent(`Rinnovo ${renewal.type} in scadenza`)}&body=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Email aperta con il promemoria');
    } else {
      toast.error('Manca telefono/email per inviare il promemoria');
    }
    setTimeout(() => setReminderSending(null), 1000);
  };

  const handleRemoveClient = async () => {
    if (!selected) return;
    if (!window.confirm(`Rimuovere "${selected.name}" dai clienti acquisiti?\nVerrà riportato in "Contattato".`)) return;
    try {
      await axios.post(`${API}/leads?action=update_lead`, { lead_id: selected.lead_id, status: 'contattato' });
      toast.success('Cliente riportato a "Contattato"');
      setSelectedId(null);
      navigate('/clients', { replace: true });
      loadAll();
    } catch {
      toast.error('Errore aggiornamento');
    }
  };

  if (loading) {
    return (
      <div data-testid="clients-loading" className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div data-testid="clients-page" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
            <Crown size={28} className="text-amber-500 sm:hidden" />
            <Crown size={42} className="text-amber-500 hidden sm:block" /> Clienti
          </h1>
          <p className="text-neutral-600 mt-1 sm:mt-2 text-sm sm:text-lg">{clients.length} clienti acquisiti</p>
        </div>
        <Button onClick={loadAll} variant="outline" size="sm" data-testid="refresh-clients-btn">
          <RefreshCw size={16} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4">
        <StatBox label="Fatturato totale" value={formatCurrency(totalRevenue)} icon={BadgeEuro} color="bg-emerald-600" />
        <StatBox label="Incassato" value={formatCurrency(paidRevenue)} icon={CheckCircle2} color="bg-blue-600" />
        <StatBox label="Da incassare" value={formatCurrency(pendingRevenue)} icon={Circle} color="bg-amber-500" />
      </div>

      {/* Scadenze imminenti */}
      {renewals.length > 0 && (
        <Card className="p-4 border-2 border-amber-300 bg-amber-50/50" data-testid="renewals-widget">
          <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500 rounded-lg">
                <Bell size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Scadenze imminenti</h3>
                <p className="text-xs text-neutral-600">
                  {renewals.length} rinnov{renewals.length === 1 ? 'o' : 'i'} nei prossimi 30 giorni
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {renewals.map((r) => {
              const isOverdue = r.days_to < 0;
              const isUrgent = r.days_to >= 0 && r.days_to <= 7;
              const badgeClasses = isOverdue
                ? 'bg-red-500 text-white'
                : isUrgent
                ? 'bg-amber-500 text-white'
                : 'bg-neutral-200 text-neutral-700';
              const label = isOverdue
                ? `SCADUTO da ${Math.abs(r.days_to)}g`
                : r.days_to === 0
                ? 'OGGI'
                : `tra ${r.days_to}g`;
              return (
                <div
                  key={r.lead_id + r.type + r.renewal_date}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white border border-neutral-200 rounded-lg hover:shadow-sm transition-shadow"
                  data-testid={`renewal-${r.lead_id}-${r.type}`}
                >
                  <span className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded shrink-0 whitespace-nowrap ${badgeClasses}`}>
                    {label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs sm:text-sm truncate">{r.name}</p>
                    <p className="text-[10px] sm:text-xs text-neutral-500 truncate">
                      {r.type.toLowerCase()} · {r.renewal_date}{r.amount > 0 && ` · ${formatCurrency(r.amount, r.currency)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => { handleSelect(r.lead_id); }}
                      className="h-7 px-2 text-[11px] hidden sm:inline-flex"
                      data-testid={`open-client-${r.lead_id}`}
                    >
                      Apri
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSendRenewalReminder(r)}
                      disabled={reminderSending === r.lead_id + r.type}
                      className="h-7 px-2 text-[11px] bg-amber-500 hover:bg-amber-600 text-white"
                      data-testid={`reminder-${r.lead_id}-${r.type}`}
                    >
                      <MessageCircle size={12} className="sm:mr-1" /> <span className="hidden sm:inline">Promemoria</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {clients.length === 0 ? (
        <Card className="p-12 text-center">
          <Crown size={48} className="mx-auto text-neutral-300 mb-4" />
          <h2 className="text-xl font-bold mb-2">Nessun cliente ancora</h2>
          <p className="text-neutral-500 max-w-md mx-auto">
            Quando sposti un lead nella colonna "Cliente" della pipeline Kanban, lo trovi qui per gestire costi,
            preventivi e comunicazioni in un unico posto.
          </p>
          <Button className="mt-6" onClick={() => navigate('/leads')} data-testid="goto-leads-btn">
            Vai ai Lead
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lista clienti */}
          <Card className="lg:col-span-1 overflow-hidden" data-testid="clients-list">
            <div className="p-3 border-b border-neutral-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Cerca cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="clients-search"
                />
              </div>
            </div>
            <div className="max-h-[640px] overflow-y-auto">
              {filteredClients.length === 0 ? (
                <p className="p-6 text-center text-sm text-neutral-500">Nessun cliente corrisponde</p>
              ) : (
                filteredClients.map((c) => (
                  <ClientRow
                    key={c.lead_id}
                    client={c}
                    demo={demos[c.lead_id]}
                    active={c.lead_id === selectedId}
                    onClick={() => handleSelect(c.lead_id)}
                  />
                ))
              )}
            </div>
          </Card>

          {/* Pannello dettaglio */}
          <div className="lg:col-span-2 space-y-4">
            {!selected ? (
              <Card className="p-12 text-center">
                <Crown size={40} className="mx-auto text-neutral-300 mb-3" />
                <p className="text-neutral-500">Seleziona un cliente per gestire costi, preventivi e comunicazioni.</p>
              </Card>
            ) : (
              <>
                {/* Header cliente */}
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => { setSelectedId(null); navigate('/clients', { replace: true }); }}
                        className="lg:hidden flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 mb-2"
                      >
                        <ChevronLeft size={16} /> Indietro
                      </button>
                      <h2 className="text-2xl font-bold tracking-tight" data-testid="client-detail-name">{selected.name}</h2>
                      <p className="text-sm text-neutral-500 mt-0.5">{selected.category || 'Categoria n/d'} · {selected.city || ''}</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-neutral-600">
                        {selected.phone && <span>📞 {selected.phone}</span>}
                        {selected.email && <span>✉️ {selected.email}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedDemo ? (
                        <Button size="sm" variant="outline" onClick={handleOpenDemo} data-testid="open-demo-btn">
                          <Globe size={14} className="mr-1" /> Vedi sito
                        </Button>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">Nessun demo</Badge>
                      )}
                      {selectedDemo && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/site-editor/${selectedDemo.demo_id}`)}
                          data-testid="edit-site-btn"
                        >
                          Modifica sito
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={handleRemoveClient} className="text-red-500 hover:text-red-700" data-testid="remove-client-btn">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Costi cliente */}
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <BadgeEuro size={20} className="text-emerald-600" /> Costi del cliente
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={costs.paid}
                        onCheckedChange={(v) => setCosts((s) => ({ ...s, paid: v, payment_date: v && !s.payment_date ? new Date().toISOString().slice(0, 10) : s.payment_date }))}
                        data-testid="paid-switch"
                      />
                      <Label className="cursor-pointer select-none">Pagato</Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-neutral-600">Sito web ({CURRENCY_SYMBOL[costs.currency] || costs.currency})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={costs.site_price}
                        onChange={(e) => setCosts({ ...costs, site_price: e.target.value })}
                        placeholder="es. 800"
                        data-testid="cost-site"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-neutral-600">Dominio ({CURRENCY_SYMBOL[costs.currency] || costs.currency})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={costs.domain_price}
                        onChange={(e) => setCosts({ ...costs, domain_price: e.target.value })}
                        placeholder="es. 15"
                        data-testid="cost-domain"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-neutral-600">Hosting ({CURRENCY_SYMBOL[costs.currency] || costs.currency})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={costs.hosting_price}
                        onChange={(e) => setCosts({ ...costs, hosting_price: e.target.value })}
                        placeholder="es. 60"
                        data-testid="cost-hosting"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs text-neutral-600">Extra (descr.)</Label>
                        <Input
                          type="text"
                          value={costs.extra_label}
                          onChange={(e) => setCosts({ ...costs, extra_label: e.target.value })}
                          placeholder="es. SEO, copy..."
                          data-testid="cost-extra-label"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-neutral-600">Importo</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={costs.extra_price}
                          onChange={(e) => setCosts({ ...costs, extra_price: e.target.value })}
                          placeholder="0"
                          data-testid="cost-extra"
                        />
                      </div>
                    </div>
                  </div>

                  {costs.paid && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-neutral-600">Data pagamento</Label>
                        <Input
                          type="date"
                          value={costs.payment_date || ''}
                          onChange={(e) => setCosts({ ...costs, payment_date: e.target.value })}
                          data-testid="payment-date"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-neutral-600 flex items-center gap-1">
                          <Calendar size={12} /> Scadenza dominio
                        </Label>
                        <Input
                          type="date"
                          value={costs.domain_renewal_date || ''}
                          onChange={(e) => setCosts({ ...costs, domain_renewal_date: e.target.value })}
                          data-testid="domain-renewal-date"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-neutral-600 flex items-center gap-1">
                          <Calendar size={12} /> Scadenza hosting
                        </Label>
                        <Input
                          type="date"
                          value={costs.hosting_renewal_date || ''}
                          onChange={(e) => setCosts({ ...costs, hosting_renewal_date: e.target.value })}
                          data-testid="hosting-renewal-date"
                        />
                      </div>
                    </div>
                  )}
                  {costs.paid && !costs.domain_renewal_date && !costs.hosting_renewal_date && costs.payment_date && (
                    <p className="mt-2 text-[11px] text-blue-600 flex items-center gap-1">
                      <Bell size={11} /> Lascia le scadenze vuote: verranno impostate automaticamente a {costs.payment_date} +1 anno al salvataggio.
                    </p>
                  )}

                  <div className="mt-4">
                    <Label className="text-xs text-neutral-600">Note interne</Label>
                    <Textarea
                      rows={2}
                      value={costs.notes}
                      onChange={(e) => setCosts({ ...costs, notes: e.target.value })}
                      placeholder="Note di pagamento, accordi presi, scadenze..."
                      data-testid="cost-notes"
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wide">Totale cliente</p>
                      <p className="text-3xl font-bold text-emerald-700" data-testid="client-total">
                        {formatCurrency(totalAmount, costs.currency)}
                      </p>
                    </div>
                    <Button onClick={handleSaveCosts} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" data-testid="save-costs-btn">
                      {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                      Salva
                    </Button>
                  </div>
                </Card>

                {/* Azioni rapide */}
                <Card className="p-5">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Sparkles size={20} className="text-blue-600" /> Invia preventivo & comunicazioni
                  </h3>

                  {/* Selettore tipologia preventivo */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Label className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2 block">
                      Tipologia preventivo
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" data-testid="tax-mode-selector">
                      <button
                        type="button"
                        onClick={() => setCosts({ ...costs, tax_mode: 'without_vat' })}
                        data-testid="tax-mode-without"
                        className={`p-3 rounded-md border-2 text-left transition-all ${
                          costs.tax_mode === 'without_vat'
                            ? 'border-blue-600 bg-white shadow-sm'
                            : 'border-neutral-200 bg-white/50 hover:bg-white'
                        }`}
                      >
                        <p className="font-semibold text-sm flex items-center gap-2">
                          {costs.tax_mode === 'without_vat' && <CheckCircle2 size={14} className="text-blue-600" />}
                          Regime forfettario
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Hai P.IVA forfettaria · No IVA</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCosts({ ...costs, tax_mode: 'occasional_no_vat' })}
                        data-testid="tax-mode-occasional"
                        className={`p-3 rounded-md border-2 text-left transition-all ${
                          costs.tax_mode === 'occasional_no_vat'
                            ? 'border-blue-600 bg-white shadow-sm'
                            : 'border-neutral-200 bg-white/50 hover:bg-white'
                        }`}
                      >
                        <p className="font-semibold text-sm flex items-center gap-2">
                          {costs.tax_mode === 'occasional_no_vat' && <CheckCircle2 size={14} className="text-blue-600" />}
                          Prestazione occasionale
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Non hai P.IVA · art. 67 TUIR</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCosts({ ...costs, tax_mode: 'with_vat' })}
                        data-testid="tax-mode-with"
                        className={`p-3 rounded-md border-2 text-left transition-all ${
                          costs.tax_mode === 'with_vat'
                            ? 'border-blue-600 bg-white shadow-sm'
                            : 'border-neutral-200 bg-white/50 hover:bg-white'
                        }`}
                      >
                        <p className="font-semibold text-sm flex items-center gap-2">
                          {costs.tax_mode === 'with_vat' && <CheckCircle2 size={14} className="text-blue-600" />}
                          Con Partita IVA
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Hai P.IVA ordinaria · IVA 22%</p>
                      </button>
                    </div>

                    {costs.tax_mode === 'with_vat' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3" data-testid="vat-fields">
                        <div>
                          <Label className="text-[11px] text-neutral-600">P.IVA cliente (opzionale)</Label>
                          <Input
                            type="text"
                            value={costs.client_vat}
                            onChange={(e) => setCosts({ ...costs, client_vat: e.target.value })}
                            placeholder="IT01234567890"
                            data-testid="client-vat-input"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-neutral-600">Codice Fiscale (opzionale)</Label>
                          <Input
                            type="text"
                            value={costs.client_fiscal_code}
                            onChange={(e) => setCosts({ ...costs, client_fiscal_code: e.target.value })}
                            placeholder="RSSMRA80A01H501Z"
                            data-testid="client-cf-input"
                          />
                        </div>
                      </div>
                    )}

                    {totalAmount > 0 && (
                      <div className="mt-3 text-xs text-neutral-700 bg-white/70 rounded px-3 py-2">
                        {costs.tax_mode === 'with_vat' ? (
                          <>
                            Imponibile: <strong>{formatCurrency(totalAmount, costs.currency)}</strong> · IVA 22%: <strong>{formatCurrency(totalAmount * 0.22, costs.currency)}</strong> · Totale: <strong className="text-blue-700">{formatCurrency(totalAmount * 1.22, costs.currency)}</strong>
                          </>
                        ) : costs.tax_mode === 'occasional_no_vat' ? (
                          totalAmount > 77.47 ? (
                            <>
                              Compenso lordo: <strong>{formatCurrency(totalAmount, costs.currency)}</strong> · Ritenuta 20%: <strong>−{formatCurrency(totalAmount * 0.2, costs.currency)}</strong> · Netto al committente: <strong className="text-blue-700">{formatCurrency(totalAmount * 0.8, costs.currency)}</strong>
                            </>
                          ) : (
                            <>Compenso: <strong className="text-blue-700">{formatCurrency(totalAmount, costs.currency)}</strong> · Sotto soglia ritenuta d'acconto (€ 77,47) · Prestazione occasionale art. 67 TUIR</>
                          )
                        ) : (
                          <>Totale a cliente: <strong className="text-blue-700">{formatCurrency(totalAmount, costs.currency)}</strong> (operazione non soggetta a IVA - regime forfettario)</>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Editor voci preventivo */}
                  <div className="mb-4 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setFeaturesOpen((v) => !v)}
                      className="w-full flex items-center justify-between text-left"
                      data-testid="toggle-features-editor"
                    >
                      <div>
                        <Label className="text-xs font-semibold text-neutral-700 uppercase tracking-wide cursor-pointer">
                          Voci incluse nel preventivo
                        </Label>
                        <p className="text-[11px] text-neutral-500">
                          {quoteFeatures.split('\n').filter((l) => l.trim()).length} voci · {featuresOpen ? 'clicca per chiudere' : 'clicca per modificare'}
                        </p>
                      </div>
                      <span className="text-neutral-500 text-lg">{featuresOpen ? '−' : '+'}</span>
                    </button>
                    {featuresOpen && (
                      <div className="mt-3 space-y-2" data-testid="features-editor">
                        <Textarea
                          rows={12}
                          value={quoteFeatures}
                          onChange={(e) => setQuoteFeatures(e.target.value)}
                          placeholder="Una voce per riga..."
                          className="font-mono text-xs"
                          data-testid="features-textarea"
                        />
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-[11px] text-neutral-500">
                            ℹ️ Una voce per riga · Verranno tutte stampate come "incluso" nel PDF
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setQuoteFeatures(DEFAULT_QUOTE_FEATURES.join('\n'))}
                            data-testid="reset-features-btn"
                          >
                            Ripristina default
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <Button
                      onClick={handleGenerateQuote}
                      disabled={generatingQuote || !selectedDemo}
                      variant="outline"
                      className="justify-start"
                      data-testid="generate-quote-pdf-btn"
                    >
                      {generatingQuote ? <Loader2 className="animate-spin mr-2" size={16} /> : <FileText size={16} className="mr-2" />}
                      Scarica PDF
                    </Button>
                    <Button
                      onClick={handleSendQuoteEmail}
                      disabled={emailLoading || !selectedDemo}
                      variant="outline"
                      className="justify-start"
                      data-testid="send-quote-email-btn"
                    >
                      {emailLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Mail size={16} className="mr-2" />}
                      Invia via Email
                    </Button>
                    <Button
                      onClick={handleGenerateWhatsapp}
                      disabled={whatsappLoading || !selectedDemo}
                      variant="outline"
                      className="justify-start"
                      data-testid="generate-whatsapp-btn"
                    >
                      {whatsappLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <MessageCircle size={16} className="mr-2" />}
                      {whatsappMessage ? 'Variante (AI)' : 'Msg WhatsApp'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                    <div>
                      <Label className="text-xs text-neutral-600">Email destinatario</Label>
                      <Input
                        type="email"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                        placeholder="cliente@email.com"
                        data-testid="email-recipient-input"
                      />
                    </div>
                  </div>

                  {whatsappMessage && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4 space-y-3" data-testid="whatsapp-message-card">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                          {whatsappVariant === 'ai' ? 'Variante AI' : 'Messaggio standard'}
                        </span>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={handleCopyWhatsapp} className="h-7 text-xs" data-testid="copy-wa-btn">
                            <Copy size={12} className="mr-1" /> Copia
                          </Button>
                          <Button type="button" size="sm" onClick={handleOpenWhatsapp} className="h-7 text-xs bg-green-600 hover:bg-green-700" data-testid="open-wa-btn">
                            <ExternalLink size={12} className="mr-1" /> Apri WhatsApp
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setWhatsappMessage('')} className="h-7 w-7 p-0">
                            <X size={12} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-700 whitespace-pre-wrap">{whatsappMessage}</p>
                    </div>
                  )}
                </Card>

                {/* === FATTURE — emette PDF fattura (3 regimi) usando lo stesso payload del preventivo === */}
                <Card className="p-5 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <FileText size={20} className="text-emerald-700" /> Emetti fattura cliente
                  </h3>
                  <p className="text-xs text-neutral-600 mb-3">
                    Genera la <strong>fattura PDF</strong> con numerazione progressiva annuale (FAT-{new Date().getFullYear()}-NNNN).
                    Usa la stessa <strong>Tipologia</strong> ({costs.tax_mode === 'with_vat' ? 'Con P.IVA — IVA 22%' : costs.tax_mode === 'occasional_no_vat' ? 'Prestazione occasionale (no P.IVA)' : 'Regime forfettario'}),
                    importi e voci configurati sopra.
                  </p>

                  {/* Tipo fattura: Saldo unico / Acconto 50% / Saldo 50% */}
                  <div className="mb-4">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-emerald-800 block mb-2">Tipo di fattura</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'full',    title: '💰 Saldo unico',       desc: '100% del totale',                 step: 'Quando ricevi il pagamento intero' },
                        { id: 'deposit', title: '📥 Acconto 50%',       desc: '50% del totale - prima rata',     step: 'Quando il cliente accetta e versa la prima metà' },
                        { id: 'balance', title: '📤 Saldo 50%',         desc: '50% del totale - seconda rata',   step: 'Alla consegna del sito, dopo l\'acconto' },
                      ].map((opt) => {
                        const active = invoiceType === opt.id;
                        return (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => setInvoiceType(opt.id)}
                            data-testid={`invoice-type-${opt.id}`}
                            className={`text-left p-3 rounded-xl border-2 transition-all ${active ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200' : 'border-neutral-200 bg-white hover:border-emerald-300'}`}
                          >
                            <p className="font-bold text-sm text-neutral-900">{opt.title}</p>
                            <p className="text-[11px] text-neutral-600 mt-0.5">{opt.desc}</p>
                            <p className="text-[10px] text-neutral-500 mt-1 italic">{opt.step}</p>
                          </button>
                        );
                      })}
                    </div>
                    {(invoiceType === 'deposit' || invoiceType === 'balance') && totalAmount > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        💡 <strong>Importo che verrà fatturato</strong>: {(totalAmount / 2).toFixed(2)} {costs.currency} <span className="text-amber-700">(50% di {totalAmount.toFixed(2)} {costs.currency})</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleGenerateInvoice(false)}
                      disabled={generatingInvoice || !selectedDemo}
                      className="justify-start bg-emerald-600 hover:bg-emerald-700"
                      data-testid="generate-invoice-pdf-btn"
                    >
                      {generatingInvoice ? <Loader2 className="animate-spin mr-2" size={16} /> : <FileText size={16} className="mr-2" />}
                      Scarica Fattura PDF
                    </Button>
                    <Button
                      onClick={() => handleGenerateInvoice(true)}
                      disabled={generatingInvoice || !selectedDemo}
                      variant="outline"
                      className="justify-start border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      data-testid="send-invoice-email-btn"
                    >
                      {generatingInvoice ? <Loader2 className="animate-spin mr-2" size={16} /> : <Mail size={16} className="mr-2" />}
                      Invia Fattura via Email
                    </Button>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-3">
                    💡 La fattura viene salvata in archivio (collection <code className="font-mono">invoices</code>) per tracciabilità.
                    {invoiceType === 'deposit' && ' Quando consegni il sito, torna qui e genera la fattura "📤 Saldo 50%" per la seconda rata.'}
                  </p>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

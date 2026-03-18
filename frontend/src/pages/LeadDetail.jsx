import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, MapPin, Phone, Star, Globe, Loader2, Mail, MessageCircle, Languages, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import API from '@/lib/api';

const STATUS_COLORS = {
  nuovo_lead: 'bg-blue-500',
  demo_creata: 'bg-purple-500',
  contattato: 'bg-yellow-500',
  cliente_acquisito: 'bg-green-500'
};

const STATUS_LABELS = {
  nuovo_lead: 'Nuovo Lead',
  demo_creata: 'Demo Creata',
  contattato: 'Contattato',
  cliente_acquisito: 'Cliente Acquisito'
};

const LANGUAGE_OPTIONS = [
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

const BOOKING_MODE_OPTIONS = [
  { value: 'none', label: 'Nessuna prenotazione', icon: '❌' },
  { value: 'appointment', label: 'Prenota Appuntamento', icon: '📅' },
  { value: 'table', label: 'Prenota Tavolo', icon: '🍽️' }
];

export default function LeadDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [demo, setDemo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [generatingWhatsapp, setGeneratingWhatsapp] = useState(false);
  const [emailContent, setEmailContent] = useState(null);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [externalBookingUrl, setExternalBookingUrl] = useState('');

  useEffect(() => {
    loadLeadData();
  }, [leadId]);

  const loadLeadData = async () => {
    try {
      // Usa endpoint singolo lead invece di cercare in tutti
      const leadResponse = await axios.get(`${API}/leads/${leadId}`);
      setLead(leadResponse.data);
      setExternalBookingUrl(leadResponse.data.external_booking_url || '');

      const demosResponse = await axios.get(`${API}/demos`);
      const foundDemo = demosResponse.data.find(d => d.lead_id === leadId);
      setDemo(foundDemo);
    } catch (error) {
      console.error('Errore caricamento:', error);
      toast.error('Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDemo = async () => {
    setGeneratingDemo(true);
    try {
      const response = await axios.post(`${API}/demo/generate`, { lead_id: leadId });
      setDemo(response.data);
      toast.success('Sito demo generato con successo!');
      await loadLeadData();
    } catch (error) {
      console.error('Errore generazione demo:', error);
      toast.error('Errore generazione sito demo');
    } finally {
      setGeneratingDemo(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!demo) {
      toast.error('Genera prima un sito demo');
      return;
    }

    setGeneratingEmail(true);
    try {
      const response = await axios.post(`${API}/email/generate?lead_id=${leadId}&demo_url=${demo.demo_url}`);
      setEmailContent(response.data);
      toast.success('Email generata!');
    } catch (error) {
      console.error('Errore generazione email:', error);
      toast.error('Errore generazione email');
    } finally {
      setGeneratingEmail(false);
    }
  };

  const handleGenerateWhatsapp = async () => {
    if (!demo) {
      toast.error('Genera prima un sito demo');
      return;
    }

    setGeneratingWhatsapp(true);
    try {
      const response = await axios.post(`${API}/whatsapp/generate?lead_id=${leadId}&demo_url=${demo.demo_url}`);
      setWhatsappMessage(response.data.message);
      toast.success('Messaggio WhatsApp generato!');
    } catch (error) {
      console.error('Errore generazione WhatsApp:', error);
      toast.error('Errore generazione messaggio');
    } finally {
      setGeneratingWhatsapp(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await axios.patch(`${API}/leads/${leadId}/status?status=${newStatus}`);
      toast.success('Stato aggiornato');
      await loadLeadData();
    } catch (error) {
      console.error('Errore aggiornamento stato:', error);
      toast.error('Errore aggiornamento stato');
    }
  };

  const handleUpdateLanguage = async (langCode) => {
    setUpdatingSettings(true);
    try {
      await axios.patch(`${API}/leads/${leadId}/settings`, { site_language: langCode });
      toast.success(`Lingua sito impostata: ${LANGUAGE_OPTIONS.find(l => l.code === langCode)?.name}`);
      await loadLeadData();
    } catch (error) {
      console.error('Errore aggiornamento lingua:', error);
      toast.error('Errore aggiornamento lingua');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleUpdateBookingMode = async (mode) => {
    setUpdatingSettings(true);
    try {
      await axios.patch(`${API}/leads/${leadId}/settings`, { booking_mode: mode });
      toast.success(`Modalità prenotazione: ${BOOKING_MODE_OPTIONS.find(b => b.value === mode)?.label}`);
      await loadLeadData();
    } catch (error) {
      console.error('Errore aggiornamento booking mode:', error);
      toast.error('Errore aggiornamento');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleUpdateExternalBookingUrl = async () => {
    setUpdatingSettings(true);
    try {
      await axios.patch(`${API}/leads/${leadId}/settings`, { external_booking_url: externalBookingUrl });
      toast.success('URL prenotazione esterna aggiornato');
      await loadLeadData();
    } catch (error) {
      console.error('Errore aggiornamento URL:', error);
      toast.error('Errore aggiornamento');
    } finally {
      setUpdatingSettings(false);
    }
  };

  if (loading) {
    return (
      <div data-testid="lead-detail-loading" className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!lead) {
    return <div>Lead non trovato</div>;
  }

  const currentLang = lead.site_language || lead.language || 'it';
  const currentBookingMode = lead.booking_mode || 'none';

  return (
    <div data-testid="lead-detail-page">
      <Button
        data-testid="back-button"
        onClick={() => navigate('/leads')}
        variant="ghost"
        className="mb-6"
      >
        <ArrowLeft className="mr-2" size={16} />
        Indietro
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2" data-testid="lead-info-card">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{lead.name}</h1>
              <p className="text-lg text-neutral-600 mt-2">{lead.category}</p>
            </div>
            <Badge className={`${STATUS_COLORS[lead.status]} text-white`}>
              {STATUS_LABELS[lead.status]}
            </Badge>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 text-neutral-700">
              <MapPin size={18} />
              <span>{lead.address}, {lead.city}, {lead.country}</span>
            </div>
            {lead.phone && (
              <div className="flex items-center gap-2 text-neutral-700">
                <Phone size={18} />
                <span>{lead.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Star size={18} className="text-yellow-500" />
              <span className="font-medium">{lead.rating}</span>
              <span className="text-sm text-neutral-600">({lead.reviews_count} recensioni)</span>
            </div>
            {lead.google_maps_link && (
              <a
                href={lead.google_maps_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                <MapPin size={18} />
                Vedi su Google Maps
              </a>
            )}
          </div>

          <Tabs defaultValue="demo" className="mt-6">
            <TabsList>
              <TabsTrigger value="demo">Sito Demo</TabsTrigger>
              <TabsTrigger value="contact">Contatto</TabsTrigger>
            </TabsList>

            <TabsContent value="demo" className="space-y-4">
              {!demo ? (
                <div className="text-center py-8">
                  <Globe size={48} className="mx-auto mb-4 text-neutral-400" />
                  <p className="text-neutral-600 mb-4">Nessun sito demo ancora generato</p>
                  <Button
                    data-testid="generate-demo-button"
                    onClick={handleGenerateDemo}
                    disabled={generatingDemo}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {generatingDemo ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" size={16} />
                        Generazione in corso...
                      </>
                    ) : (
                      'Genera Sito Demo'
                    )}
                  </Button>
                </div>
              ) : (
                <div data-testid="demo-info">
                  <div className="bg-neutral-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-neutral-600 mb-2">Demo Interno:</p>
                    <button
                      onClick={() => navigate(`/demo/${demo.demo_id}`)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Visualizza Demo Interno
                    </button>
                  </div>
                  {demo.publish_status === 'published' && demo.live_url && (
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                      <p className="text-sm text-neutral-600 mb-2">Sito Pubblicato:</p>
                      <a
                        href={demo.live_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline font-medium"
                      >
                        {demo.live_url}
                      </a>
                    </div>
                  )}
                  {demo.logo_base64 && (
                    <div className="mb-4">
                      <p className="text-sm text-neutral-600 mb-2">Logo Generato:</p>
                      <img
                        src={`data:image/png;base64,${demo.logo_base64}`}
                        alt="Logo"
                        className="w-32 h-32 object-contain border rounded-lg"
                      />
                    </div>
                  )}
                  <div className="bg-neutral-50 p-4 rounded-lg">
                    <p className="text-sm text-neutral-600 mb-2">Contenuti Generati:</p>
                    <div className="text-sm space-y-2">
                      <p><strong>Titolo:</strong> {demo.content.homepage_title}</p>
                      <p><strong>Sottotitolo:</strong> {demo.content.homepage_subtitle}</p>
                      <p><strong>Servizi:</strong> {demo.content.services?.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <div className="space-y-4">
                <Button
                  data-testid="generate-email-button"
                  onClick={handleGenerateEmail}
                  disabled={generatingEmail || !demo}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {generatingEmail ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={16} />
                      Generazione email...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2" size={16} />
                      Genera Email Professionale
                    </>
                  )}
                </Button>

                {emailContent && (
                  <div data-testid="email-preview" className="bg-neutral-50 p-4 rounded-lg">
                    <p className="font-bold mb-2">Oggetto: {emailContent.subject}</p>
                    <div className="text-sm text-neutral-700 whitespace-pre-wrap">
                      {emailContent.body}
                    </div>
                  </div>
                )}

                <Button
                  data-testid="generate-whatsapp-button"
                  onClick={handleGenerateWhatsapp}
                  disabled={generatingWhatsapp || !demo}
                  variant="outline"
                  className="w-full"
                >
                  {generatingWhatsapp ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={16} />
                      Generazione messaggio...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2" size={16} />
                      Genera Messaggio WhatsApp
                    </>
                  )}
                </Button>

                {whatsappMessage && (
                  <div data-testid="whatsapp-preview" className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                      {whatsappMessage}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="space-y-4">
          {/* Card Impostazioni Sito */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 tracking-tight flex items-center gap-2">
              <Languages size={20} />
              Impostazioni Sito
            </h2>
            
            {/* Lingua Sito */}
            <div className="mb-6">
              <p className="text-sm text-neutral-600 mb-2 font-medium">Lingua del sito generato:</p>
              <div className="grid grid-cols-5 gap-2">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang.code}
                    data-testid={`lang-button-${lang.code}`}
                    onClick={() => handleUpdateLanguage(lang.code)}
                    disabled={updatingSettings}
                    className={`p-2 rounded-lg border-2 text-center transition-all ${
                      currentLang === lang.code 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-neutral-200 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <p className="text-xs mt-1">{lang.code.toUpperCase()}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Modalità Prenotazione */}
            <div className="mb-4">
              <p className="text-sm text-neutral-600 mb-2 font-medium flex items-center gap-1">
                <Calendar size={14} />
                Modalità prenotazione:
              </p>
              <div className="space-y-2">
                {BOOKING_MODE_OPTIONS.map((mode) => (
                  <button
                    key={mode.value}
                    data-testid={`booking-mode-${mode.value}`}
                    onClick={() => handleUpdateBookingMode(mode.value)}
                    disabled={updatingSettings}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                      currentBookingMode === mode.value 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-neutral-200 hover:border-green-300'
                    }`}
                  >
                    <span className="text-xl">{mode.icon}</span>
                    <span className="text-sm font-medium">{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* URL Prenotazione Esterna */}
            {currentBookingMode !== 'none' && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <p className="text-sm text-neutral-600 mb-2 font-medium">URL prenotazione esterna (opzionale):</p>
                <p className="text-xs text-neutral-500 mb-2">TheFork, Treatwell, Fresha, Doctolib, Calendly...</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={externalBookingUrl}
                    onChange={(e) => setExternalBookingUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={handleUpdateExternalBookingUrl}
                    disabled={updatingSettings}
                    size="sm"
                  >
                    Salva
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Card Stato Lead */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 tracking-tight">Aggiorna Stato</h2>
            <div className="space-y-2">
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <Button
                  key={status}
                  data-testid={`status-button-${status}`}
                  onClick={() => handleUpdateStatus(status)}
                  variant={lead.status === status ? 'default' : 'outline'}
                  className="w-full justify-start"
                >
                  <Badge className={`${STATUS_COLORS[status]} text-white mr-2`}>
                    •
                  </Badge>
                  {label}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
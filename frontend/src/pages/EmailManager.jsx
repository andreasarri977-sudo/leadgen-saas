import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Send, Copy, Loader2, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import API from '@/lib/api';

// Get base URL for demo links - works in both Emergent and Vercel production
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

export default function EmailManager() {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState('');
  const [selectedLeadData, setSelectedLeadData] = useState(null);
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    subject: '',
    html_content: ''
  });
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    if (selectedLead) {
      const lead = leads.find(l => l.lead_id === selectedLead);
      setSelectedLeadData(lead);
    }
  }, [selectedLead, leads]);

  const loadLeads = async () => {
    try {
      const response = await axios.get(`${API}/leads?status=demo_creata`);
      setLeads(response.data);
    } catch (error) {
      console.error('Errore caricamento lead:', error);
    }
  };

  const handleGenerateEmail = async () => {
    if (!selectedLead) {
      toast.error('Seleziona un lead');
      return;
    }

    setLoadingEmail(true);
    try {
      const demosResponse = await axios.get(`${API}/demos`);
      const demo = demosResponse.data.find(d => d.lead_id === selectedLead);
      
      if (!demo) {
        toast.error('Sito demo non trovato');
        return;
      }

      const internalUrl = `${getBaseUrl()}/demo/${demo.demo_id}`;
      setDemoUrl(internalUrl);

      const response = await axios.post(`${API}/email/generate?lead_id=${selectedLead}&demo_url=${internalUrl}`);
      setEmailData({
        ...emailData,
        subject: response.data.subject,
        html_content: response.data.body
      });
      toast.success('Email generata!');
    } catch (error) {
      console.error('Errore generazione email:', error);
      toast.error('Errore generazione email');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleGenerateWhatsapp = async () => {
    if (!selectedLead) {
      toast.error('Seleziona un lead');
      return;
    }

    setLoadingWhatsapp(true);
    try {
      const demosResponse = await axios.get(`${API}/demos`);
      const demo = demosResponse.data.find(d => d.lead_id === selectedLead);
      
      if (!demo) {
        toast.error('Sito demo non trovato');
        return;
      }

      const internalUrl = `${getBaseUrl()}/demo/${demo.demo_id}`;
      setDemoUrl(internalUrl);

      const response = await axios.post(`${API}/whatsapp/generate?lead_id=${selectedLead}&demo_url=${internalUrl}`);
      setWhatsappMessage(response.data.message);
      toast.success('Messaggio WhatsApp generato!');
    } catch (error) {
      console.error('Errore generazione WhatsApp:', error);
      toast.error('Errore generazione messaggio');
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.recipient_email || !emailData.subject || !emailData.html_content) {
      toast.error('Compila tutti i campi');
      return;
    }

    setSending(true);
    try {
      await axios.post(`${API}/email/send`, emailData);
      toast.success('Email inviata con successo!');
      
      if (selectedLead) {
        await axios.patch(`${API}/leads/${selectedLead}/status?status=contattato`);
      }
      
      setEmailData({ recipient_email: '', subject: '', html_content: '' });
      setSelectedLead('');
    } catch (error) {
      console.error('Errore invio email:', error);
      toast.error(error.response?.data?.detail || 'Errore invio email');
    } finally {
      setSending(false);
    }
  };

  const handleOpenWhatsapp = () => {
    if (!selectedLeadData?.phone) {
      toast.error('Numero di telefono non disponibile');
      return;
    }

    if (!whatsappMessage) {
      toast.error('Genera prima un messaggio');
      return;
    }

    const phoneNumber = selectedLeadData.phone.replace(/[^0-9+]/g, '');
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    if (selectedLead) {
      axios.patch(`${API}/leads/${selectedLead}/status?status=contattato`);
    }
    
    toast.success('Chat WhatsApp aperta!');
  };

  const copyWhatsappMessage = () => {
    navigator.clipboard.writeText(whatsappMessage);
    toast.success('Messaggio copiato!');
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(emailData.html_content);
    toast.success('Email copiata!');
  };

  return (
    <div data-testid="email-manager-page">
      <h1 className="text-5xl font-bold mb-8 tracking-tight">Gestione Comunicazioni</h1>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4 tracking-tight">Seleziona Lead</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lead-select">Lead con Demo Creata</Label>
              <Select value={selectedLead} onValueChange={setSelectedLead}>
                <SelectTrigger data-testid="select-lead" className="mt-1">
                  <SelectValue placeholder="Scegli un lead..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.lead_id} value={lead.lead_id}>
                      {lead.name} - {lead.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLeadData && (
              <div className="bg-neutral-50 p-4 rounded-lg">
                <p className="text-sm text-neutral-600 mb-2"><strong>Contatti Disponibili:</strong></p>
                <div className="space-y-1 text-sm">
                  <p>📧 Email: {selectedLeadData.email || 'Non disponibile'}</p>
                  <p>📱 WhatsApp: {selectedLeadData.phone ? 'Disponibile' : 'Non disponibile'}</p>
                  <p>📞 Telefono: {selectedLeadData.phone || 'Non disponibile'}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail size={16} />
                Email
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <MessageCircle size={16} />
                WhatsApp
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-6">
              <div>
                <Button
                  data-testid="generate-email-template-button"
                  onClick={handleGenerateEmail}
                  disabled={loadingEmail || !selectedLead}
                  className="w-full bg-blue-600 hover:bg-blue-700 mb-4"
                >
                  {loadingEmail ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={16} />
                      Generazione AI...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2" size={16} />
                      Genera Email Professionale con AI
                    </>
                  )}
                </Button>
              </div>

              <div>
                <Label htmlFor="recipient">Email Destinatario *</Label>
                <Input
                  id="recipient"
                  data-testid="input-recipient-email"
                  type="email"
                  placeholder="email@esempio.com"
                  value={emailData.recipient_email}
                  onChange={(e) => setEmailData({ ...emailData, recipient_email: e.target.value })}
                  className="mt-1"
                />
                {selectedLeadData && !selectedLeadData.email && (
                  <p className="text-sm text-amber-600 mt-1">⚠️ Email azienda non disponibile - inserisci manualmente</p>
                )}
              </div>

              <div>
                <Label htmlFor="subject">Oggetto</Label>
                <Input
                  id="subject"
                  data-testid="input-subject"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="content">Contenuto</Label>
                  {emailData.html_content && (
                    <Button
                      onClick={copyEmail}
                      variant="ghost"
                      size="sm"
                    >
                      <Copy size={14} className="mr-1" />
                      Copia
                    </Button>
                  )}
                </div>
                <Textarea
                  id="content"
                  data-testid="textarea-email-content"
                  rows={12}
                  value={emailData.html_content}
                  onChange={(e) => setEmailData({ ...emailData, html_content: e.target.value })}
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <Button
                data-testid="send-email-button"
                onClick={handleSendEmail}
                disabled={sending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send className="mr-2" size={16} />
                    Invia Email
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-6">
              {!selectedLeadData?.phone ? (
                <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-lg text-center">
                  <Phone size={48} className="mx-auto mb-4 text-amber-600" />
                  <p className="text-amber-800 font-semibold mb-2">Numero di telefono non disponibile</p>
                  <p className="text-sm text-amber-700">Questo lead non ha un numero di telefono. Usa email o cerca il contatto manualmente.</p>
                </div>
              ) : (
                <>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 mb-2">
                      <strong>✅ WhatsApp Disponibile</strong>
                    </p>
                    <p className="text-green-700">
                      Numero: <strong>{selectedLeadData.phone}</strong>
                    </p>
                  </div>

                  <div>
                    <Button
                      data-testid="generate-whatsapp-button"
                      onClick={handleGenerateWhatsapp}
                      disabled={loadingWhatsapp || !selectedLead}
                      className="w-full bg-green-600 hover:bg-green-700 mb-4"
                    >
                      {loadingWhatsapp ? (
                        <>
                          <Loader2 className="mr-2 animate-spin" size={16} />
                          Generazione AI...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="mr-2" size={16} />
                          Genera Messaggio WhatsApp con AI
                        </>
                      )}
                    </Button>
                  </div>

                  {whatsappMessage && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label htmlFor="whatsapp-message">Messaggio</Label>
                          <Button
                            onClick={copyWhatsappMessage}
                            variant="ghost"
                            size="sm"
                          >
                            <Copy size={14} className="mr-1" />
                            Copia
                          </Button>
                        </div>
                        <Textarea
                          id="whatsapp-message"
                          data-testid="textarea-whatsapp-message"
                          rows={10}
                          value={whatsappMessage}
                          onChange={(e) => setWhatsappMessage(e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <Button
                        data-testid="open-whatsapp-button"
                        onClick={handleOpenWhatsapp}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <MessageCircle className="mr-2" size={16} />
                        Apri Chat WhatsApp
                      </Button>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>ℹ️ Come funziona:</strong>
                        </p>
                        <p className="text-sm text-blue-700 mt-2">
                          Cliccando "Apri Chat WhatsApp" si aprirà WhatsApp Web o app con il messaggio precompilato. 
                          Potrai rivederlo prima di inviare.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {demoUrl && (
          <Card className="p-4 bg-neutral-50">
            <p className="text-sm text-neutral-600 mb-1">Link demo incluso nei messaggi:</p>
            <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-mono">
              {demoUrl}
            </a>
          </Card>
        )}
      </div>
    </div>
  );
}

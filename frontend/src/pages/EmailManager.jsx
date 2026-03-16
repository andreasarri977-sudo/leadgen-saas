import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Send, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function EmailManager() {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState('');
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    subject: '',
    html_content: ''
  });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

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

    setLoading(true);
    try {
      const demosResponse = await axios.get(`${API}/demos`);
      const demo = demosResponse.data.find(d => d.lead_id === selectedLead);
      
      if (!demo) {
        toast.error('Sito demo non trovato');
        return;
      }

      const response = await axios.post(`${API}/email/generate?lead_id=${selectedLead}&demo_url=${demo.demo_url}`);
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
      setLoading(false);
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(emailData.html_content);
    toast.success('Contenuto copiato!');
  };

  return (
    <div data-testid="email-manager-page">
      <h1 className="text-5xl font-bold mb-8 tracking-tight">Gestione Email</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6 tracking-tight">Genera Email</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="lead-select">Seleziona Lead</Label>
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

            <Button
              data-testid="generate-email-template-button"
              onClick={handleGenerateEmail}
              disabled={loading || !selectedLead}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={16} />
                  Generazione...
                </>
              ) : (
                <>
                  <Mail className="mr-2" size={16} />
                  Genera Email
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Invia Email</h2>
            {emailData.html_content && (
              <Button
                data-testid="copy-email-button"
                onClick={copyToClipboard}
                variant="ghost"
                size="sm"
              >
                <Copy size={16} />
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient">Email Destinatario</Label>
              <Input
                id="recipient"
                data-testid="input-recipient-email"
                type="email"
                placeholder="email@esempio.com"
                value={emailData.recipient_email}
                onChange={(e) => setEmailData({ ...emailData, recipient_email: e.target.value })}
                className="mt-1"
              />
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
              <Label htmlFor="content">Contenuto</Label>
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
          </div>
        </Card>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Key, Save, Loader2, CheckCircle, Eye, EyeOff, FileText, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import API from '@/lib/api';

export default function Settings() {
  const [settings, setSettings] = useState({
    google_maps_api_key: '',
    resend_api_key: ''
  });
  const [invoiceProfile, setInvoiceProfile] = useState({
    company_name: '', vat_number: '', tax_code: '',
    address: '', city: '', postal_code: '', country: 'Italia',
    phone: '', email: '', website: '',
    iban: '', logo_base64: '',
    default_price: 800, default_currency: 'EUR',
    footer_notes: '', legal_notes: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);

  useEffect(() => {
    loadSettings();
    loadInvoiceProfile();
  }, []);

  const loadInvoiceProfile = async () => {
    try {
      const res = await axios.get(`${API}/leads?action=user_settings`);
      setInvoiceProfile((prev) => ({ ...prev, ...(res.data || {}) }));
    } catch (e) {
      console.warn('Profilo preventivo non disponibile', e);
    }
  };

  const saveInvoiceProfile = async () => {
    setSavingProfile(true);
    try {
      await axios.post(`${API}/leads?action=user_settings`, invoiceProfile);
      toast.success('Dati preventivo salvati');
    } catch (e) {
      console.error(e);
      toast.error('Errore salvataggio dati preventivo');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error('Logo troppo grande (max 1 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInvoiceProfile((prev) => ({ ...prev, logo_base64: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings/api`);
      setSettings({
        google_maps_api_key: response.data.google_maps_api_key || '',
        resend_api_key: response.data.resend_api_key || ''
      });
    } catch (error) {
      console.error('Errore caricamento impostazioni:', error);
      toast.error('Errore caricamento impostazioni');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/api`, settings);
      toast.success('Impostazioni salvate con successo!');
    } catch (error) {
      console.error('Errore salvataggio:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleTestGoogleAPI = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await axios.post(`${API}/settings/test-google-api`);
      setTestResult(response.data);
      
      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.error);
      }
    } catch (error) {
      console.error('Errore test API:', error);
      setTestResult({
        success: false,
        error: 'Errore durante il test',
        details: error.message
      });
      toast.error('Errore durante il test');
    } finally {
      setTesting(false);
    }
  };

  const maskKey = (key) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 8) + '*'.repeat(key.length - 8);
  };

  if (loading) {
    return (
      <div data-testid="settings-loading" className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div data-testid="settings-page">
      <div className="mb-8">
        <h1 className="text-5xl font-bold tracking-tight">Impostazioni API</h1>
        <p className="text-neutral-600 mt-2 text-lg">Configura le tue chiavi API per utilizzare tutte le funzionalità</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6" data-testid="google-maps-settings">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Key size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Google Maps API</h2>
              <p className="text-sm text-neutral-600">Per la ricerca di aziende</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="google-maps-key">API Key</Label>
              <div className="relative mt-1">
                <Input
                  id="google-maps-key"
                  data-testid="input-google-maps-key"
                  type={showGoogleKey ? 'text' : 'password'}
                  placeholder="AIza..."
                  value={settings.google_maps_api_key}
                  onChange={(e) => setSettings({ ...settings, google_maps_api_key: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGoogleKey(!showGoogleKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                >
                  {showGoogleKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {settings.google_maps_api_key && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                <span className="text-sm text-green-700">API Key configurata</span>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-neutral-700 mb-2"><strong>Come ottenere la chiave:</strong></p>
              <ol className="text-sm text-neutral-600 space-y-1 list-decimal list-inside">
                <li>Vai su <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></li>
                <li>Crea un progetto o selezionane uno esistente</li>
                <li><strong>Abilita "Places API (New)"</strong> (NON la versione legacy)</li>
                <li>Vai su Credenziali → Crea credenziali → Chiave API</li>
                <li>Copia e incolla qui la chiave generata</li>
              </ol>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                <p className="text-xs text-yellow-800">
                  <strong>⚠️ IMPORTANTE:</strong> Assicurati di abilitare "Places API (New)" e NON "Places API" (legacy). 
                  La versione legacy non è supportata.
                </p>
              </div>
            </div>

            {/* Test API Button */}
            <div className="mt-4">
              <Button
                data-testid="test-google-api-button"
                onClick={handleTestGoogleAPI}
                disabled={!settings.google_maps_api_key || testing}
                variant="outline"
                className="w-full"
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} />
                    Test in corso...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2" size={16} />
                    Test Google API
                  </>
                )}
              </Button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`mt-4 p-4 rounded-lg border-2 ${testResult.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`} data-testid="test-result">
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-1" />
                  ) : (
                    <div className="flex-shrink-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-1">!</div>
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testResult.success ? 'Test Riuscito!' : 'Test Fallito'}
                    </p>
                    {testResult.message && (
                      <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {testResult.message}
                      </p>
                    )}
                    {testResult.error && (
                      <p className="text-sm mt-1 text-red-700">
                        <strong>Errore:</strong> {testResult.error}
                      </p>
                    )}
                    {testResult.status_code && (
                      <p className="text-sm mt-1 text-red-700">
                        <strong>Status Code:</strong> {testResult.status_code}
                      </p>
                    )}
                    {testResult.places_found !== undefined && (
                      <p className="text-sm mt-1 text-green-700">
                        <strong>Luoghi trovati:</strong> {testResult.places_found}
                      </p>
                    )}
                    {testResult.response && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer hover:underline">Dettagli risposta</summary>
                        <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-32">
                          {testResult.response}
                        </pre>
                      </details>
                    )}
                    {testResult.instructions && (
                      <p className="text-sm mt-2 text-red-700">
                        📋 {testResult.instructions}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6" data-testid="resend-settings">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Key size={24} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Resend API</h2>
              <p className="text-sm text-neutral-600">Per l'invio di email</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="resend-key">API Key</Label>
              <div className="relative mt-1">
                <Input
                  id="resend-key"
                  data-testid="input-resend-key"
                  type={showResendKey ? 'text' : 'password'}
                  placeholder="re_..."
                  value={settings.resend_api_key}
                  onChange={(e) => setSettings({ ...settings, resend_api_key: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowResendKey(!showResendKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                >
                  {showResendKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {settings.resend_api_key && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                <span className="text-sm text-green-700">API Key configurata</span>
              </div>
            )}

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-neutral-700 mb-2"><strong>Come ottenere la chiave:</strong></p>
              <ol className="text-sm text-neutral-600 space-y-1 list-decimal list-inside">
                <li>Vai su <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">Resend.com</a></li>
                <li>Crea un account gratuito</li>
                <li>Vai su "API Keys" nel menu</li>
                <li>Clicca "Create API Key"</li>
                <li>Copia e incolla qui la chiave generata</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          data-testid="save-settings-button"
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 px-8"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 animate-spin" size={18} />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="mr-2" size={18} />
              Salva Impostazioni
            </>
          )}
        </Button>
      </div>

      {/* DATI PREVENTIVI */}
      <Card className="mt-6 p-6" data-testid="invoice-profile-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 rounded-lg">
            <FileText size={24} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dati Preventivi</h2>
            <p className="text-sm text-neutral-600">Verranno mostrati nei PDF preventivo che invii ai clienti</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Logo */}
          <div className="md:col-span-2">
            <Label>Logo (max 1 MB, PNG/JPG)</Label>
            <div className="mt-1 flex items-center gap-3">
              {invoiceProfile.logo_base64 ? (
                <div className="relative w-24 h-24 border-2 border-neutral-200 rounded-lg overflow-hidden bg-neutral-50">
                  <img
                    src={invoiceProfile.logo_base64.startsWith('data:') ? invoiceProfile.logo_base64 : `data:image/png;base64,${invoiceProfile.logo_base64}`}
                    alt="logo"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setInvoiceProfile((p) => ({ ...p, logo_base64: '' }))}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                    data-testid="remove-logo-invoice"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm font-medium" data-testid="upload-logo-invoice">
                  <Upload size={16} />
                  Carica logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              )}
              <p className="text-xs text-neutral-500">Apparirà in alto a sinistra nei PDF preventivo.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="ip-company">Nome / Ragione sociale</Label>
            <Input id="ip-company" data-testid="ip-company-name" value={invoiceProfile.company_name}
              onChange={(e) => setInvoiceProfile({ ...invoiceProfile, company_name: e.target.value })}
              placeholder="Es: Andrea Sarri Web Studio" />
          </div>
          <div>
            <Label htmlFor="ip-vat">Partita IVA</Label>
            <Input id="ip-vat" data-testid="ip-vat" value={invoiceProfile.vat_number}
              onChange={(e) => setInvoiceProfile({ ...invoiceProfile, vat_number: e.target.value })}
              placeholder="IT12345678901" />
          </div>
          <div>
            <Label htmlFor="ip-tax">Codice Fiscale (opzionale)</Label>
            <Input id="ip-tax" data-testid="ip-tax" value={invoiceProfile.tax_code}
              onChange={(e) => setInvoiceProfile({ ...invoiceProfile, tax_code: e.target.value })}
              placeholder="RSSMRA85M01H501Z" />
          </div>
          <div>
            <Label htmlFor="ip-email">Email</Label>
            <Input id="ip-email" data-testid="ip-email" type="email" value={invoiceProfile.email}
              onChange={(e) => setInvoiceProfile({ ...invoiceProfile, email: e.target.value })}
              placeholder="info@tuostudio.it" />
          </div>
          <div>
            <Label htmlFor="ip-phone">Telefono</Label>
            <Input id="ip-phone" data-testid="ip-phone" value={invoiceProfile.phone}
              onChange={(e) => setInvoiceProfile({ ...invoiceProfile, phone: e.target.value })}
              placeholder="+39 333 1234567" />
          </div>
          <div>
            <Label htmlFor="ip-website">Sito web (opzionale)</Label>
            <Input id="ip-website" data-testid="ip-website" value={invoiceProfile.website}
              onChange={(e) => setInvoiceProfile({ ...invoiceProfile, website: e.target.value })}
              placeholder="https://tuostudio.it" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="ip-address">Indirizzo</Label>
            <Input id="ip-address" data-testid="ip-address" value={invoiceProfile.address}
              onChange={(e) => setInvoiceProfile({ ...invoiceProfile, address: e.target.value })}
              placeholder="Via Roma 10" />
          </div>
          <div>
            <Label htmlFor="ip-postal">CAP</Label>
            <Input id="ip-postal" data-testid="ip-postal" value={invoiceProfile.postal_code}
              onChange={(e) => setInvoiceProfile({ ...invoiceProfile, postal_code: e.target.value })}
              placeholder="20100" />
          </div>
          <div>
            <Label htmlFor="ip-city">Città</Label>
            <Input id="ip-city" data-testid="ip-city" value={invoiceProfile.city}
              onChange={(e) => setInvoiceProfile({ ...invoiceProfile, city: e.target.value })}
              placeholder="Milano" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="ip-iban">IBAN (per il bonifico)</Label>
            <Input id="ip-iban" data-testid="ip-iban" value={invoiceProfile.iban}
              onChange={(e) => setInvoiceProfile({ ...invoiceProfile, iban: e.target.value })}
              placeholder="IT60 X054 2811 1010 0000 0123 456" />
          </div>
          <div>
            <Label htmlFor="ip-price">Prezzo standard sito</Label>
            <div className="flex gap-2">
              <Input id="ip-price" data-testid="ip-price" type="number" value={invoiceProfile.default_price}
                onChange={(e) => setInvoiceProfile({ ...invoiceProfile, default_price: e.target.value })}
                placeholder="800" />
              <select
                data-testid="ip-currency"
                value={invoiceProfile.default_currency}
                onChange={(e) => setInvoiceProfile({ ...invoiceProfile, default_currency: e.target.value })}
                className="border-2 border-neutral-200 rounded-md px-2 text-sm bg-white"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
              </select>
            </div>
            <p className="text-xs text-neutral-500 mt-1">Modificabile per ogni preventivo.</p>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="ip-footer">Note in fondo al PDF (es: "Grazie per la fiducia")</Label>
            <Textarea id="ip-footer" data-testid="ip-footer" rows={2} value={invoiceProfile.footer_notes}
              onChange={(e) => setInvoiceProfile({ ...invoiceProfile, footer_notes: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="ip-legal">Note legali / privacy (testo piccolo a fondo pagina)</Label>
            <Textarea id="ip-legal" data-testid="ip-legal" rows={2} value={invoiceProfile.legal_notes}
              onChange={(e) => setInvoiceProfile({ ...invoiceProfile, legal_notes: e.target.value })}
              placeholder="Preventivo valido 30 giorni. Pagamenti soggetti a regime forfettario..." />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            data-testid="save-invoice-profile"
            onClick={saveInvoiceProfile}
            disabled={savingProfile}
            className="bg-blue-600 hover:bg-blue-700 px-6"
          >
            {savingProfile ? (<><Loader2 className="mr-2 animate-spin" size={16} /> Salvataggio...</>) : (<><Save className="mr-2" size={16} /> Salva Dati Preventivo</>)}
          </Button>
        </div>
      </Card>

      <Card className="mt-6 p-6 bg-yellow-50 border-yellow-200" data-testid="security-notice">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Key size={20} className="text-yellow-600" />
          Sicurezza
        </h3>
        <p className="text-sm text-neutral-700">
          Le tue chiavi API vengono salvate in modo sicuro nel database e utilizzate solo per le funzionalità della piattaforma. 
          Non condividere mai le tue chiavi API con altri utenti.
        </p>
      </Card>
    </div>
  );
}
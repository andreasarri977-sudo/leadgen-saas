import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Key, Save, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Settings() {
  const [settings, setSettings] = useState({
    google_maps_api_key: '',
    resend_api_key: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

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
import React, { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, MapPin, Star, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import API from '@/lib/api';

const COUNTRIES = [
  { code: 'IT', name: 'Italia' },
  { code: 'FR', name: 'Francia' },
  { code: 'ES', name: 'Spagna' },
  { code: 'DE', name: 'Germania' },
  { code: 'GB', name: 'Regno Unito' }
];

const CATEGORIES = [
  'Parrucchiere',
  'Ristorante',
  'Estetista',
  'Dentista',
  'Palestra',
  'Idraulico',
  'Elettricista',
  'Bar',
  'Pizzeria',
  'Meccanico'
];

export default function SearchLeads() {
  const [formData, setFormData] = useState({
    city: '',
    country: 'IT',
    category: 'Parrucchiere',
    min_reviews: 10,
    min_rating: 4.0,
    only_without_website: true
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingLeads, setSavingLeads] = useState({});
  const [savedLeads, setSavedLeads] = useState({});

  const handleSaveLead = async (lead) => {
    const leadKey = lead.place_id || lead.name;
    setSavingLeads(prev => ({ ...prev, [leadKey]: true }));
    
    try {
      const response = await axios.post(`${API}/leads`, lead);
      
      if (response.data.already_exists) {
        toast.info(`"${lead.name}" era già nei tuoi lead`);
      } else {
        toast.success(`"${lead.name}" salvato nei lead!`);
      }
      
      setSavedLeads(prev => ({ ...prev, [leadKey]: true }));
    } catch (error) {
      console.error('Errore salvataggio lead:', error);
      toast.error(`Errore nel salvataggio di "${lead.name}"`);
    } finally {
      setSavingLeads(prev => ({ ...prev, [leadKey]: false }));
    }
  };

  const handleSaveAllLeads = async () => {
    const unsavedLeads = results.filter(lead => {
      const leadKey = lead.place_id || lead.name;
      return !savedLeads[leadKey];
    });
    
    if (unsavedLeads.length === 0) {
      toast.info('Tutti i lead sono già stati salvati');
      return;
    }
    
    toast.info(`Salvataggio di ${unsavedLeads.length} lead in corso...`);
    
    for (const lead of unsavedLeads) {
      await handleSaveLead(lead);
    }
    
    toast.success(`${unsavedLeads.length} lead salvati!`);
  };

  const handleSearch = async () => {
    if (!formData.city) {
      toast.error('Inserisci una città');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    
    try {
      const response = await axios.post(`${API}/search/companies`, formData);
      setResults(response.data);
      
      if (response.data.length === 0) {
        toast.info('Nessuna azienda trovata con i criteri specificati. Prova a ridurre i filtri.');
      } else {
        toast.success(`Trovati ${response.data.length} lead potenziali`);
      }
    } catch (error) {
      console.error('Errore ricerca:', error);
      
      // Gestisci errore dettagliato
      const errorData = error.response?.data?.detail;
      
      if (typeof errorData === 'object') {
        // Check se è un info message (tutte hanno sito)
        if (errorData.info) {
          setError({
            title: errorData.info,
            isInfo: true,
            details: `Trovati ${errorData.total_found} posti, ma ${errorData.filtered_by_website} hanno già un sito web e ${errorData.filtered_by_reviews} non rispettano i filtri.`,
            suggestion: errorData.suggestion
          });
          toast.info(errorData.info);
        } else {
          setError({
            title: errorData.user_message || errorData.error || 'Errore API',
            details: errorData.message,
            statusCode: errorData.status_code,
            query: errorData.query
          });
          toast.error(errorData.user_message || 'Errore durante la ricerca');
        }
      } else {
        setError({
          title: 'Errore durante la ricerca',
          details: errorData || error.message
        });
        toast.error(errorData || 'Errore durante la ricerca');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="search-leads-page">
      <h1 className="text-5xl font-bold mb-8 tracking-tight">Cerca Aziende</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="p-6 h-fit" data-testid="search-form">
          <h2 className="text-2xl font-bold mb-6 tracking-tight">Filtri di Ricerca</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="city">Città *</Label>
              <Input
                id="city"
                data-testid="input-city"
                placeholder="es. Milano"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="country">Paese</Label>
              <select
                id="country"
                data-testid="select-country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                data-testid="select-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="min_reviews">Recensioni Minime</Label>
              <Input
                id="min_reviews"
                data-testid="input-min-reviews"
                type="number"
                value={formData.min_reviews}
                onChange={(e) => setFormData({ ...formData, min_reviews: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="min_rating">Rating Minimo</Label>
              <Input
                id="min_rating"
                data-testid="input-min-rating"
                type="number"
                step="0.1"
                value={formData.min_rating}
                onChange={(e) => setFormData({ ...formData, min_rating: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>

            <Button
              data-testid="search-button"
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={16} />
                  Ricerca in corso...
                </>
              ) : (
                <>
                  <Search className="mr-2" size={16} />
                  Cerca Aziende
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2" data-testid="search-results">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Risultati</h2>
            {results.length > 0 && (
              <Button 
                onClick={handleSaveAllLeads}
                className="bg-green-600 hover:bg-green-700"
                data-testid="save-all-leads-button"
              >
                <Plus size={16} className="mr-2" />
                Salva Tutti ({results.length})
              </Button>
            )}
          </div>

          {error && (
            <div className={`mb-6 p-4 ${error.isInfo ? 'bg-blue-50 border-2 border-blue-500' : 'bg-red-50 border-2 border-red-500'} rounded-lg`} data-testid="error-banner">
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-6 h-6 ${error.isInfo ? 'bg-blue-500' : 'bg-red-500'} rounded-full flex items-center justify-center text-white font-bold`}>
                  {error.isInfo ? 'ℹ' : '!'}
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold ${error.isInfo ? 'text-blue-800' : 'text-red-800'} text-lg mb-2`}>{error.title}</h3>
                  {error.statusCode && (
                    <p className={`text-sm ${error.isInfo ? 'text-blue-700' : 'text-red-700'} mb-2`}>
                      <strong>Status Code:</strong> {error.statusCode}
                    </p>
                  )}
                  {error.query && (
                    <p className={`text-sm ${error.isInfo ? 'text-blue-700' : 'text-red-700'} mb-2`}>
                      <strong>Query:</strong> {error.query}
                    </p>
                  )}
                  {error.details && (
                    <p className={`text-sm ${error.isInfo ? 'text-blue-700' : 'text-red-700'} mb-2`}>
                      {error.details}
                    </p>
                  )}
                  {error.suggestion && (
                    <p className={`text-sm ${error.isInfo ? 'text-blue-800' : 'text-red-800'} font-semibold mt-3`}>
                      💡 Suggerimento: {error.suggestion}
                    </p>
                  )}
                  {!error.isInfo && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-red-800 font-semibold">Possibili soluzioni:</p>
                      <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                        <li>Verifica che Places API (New) sia abilitata su <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                        <li>Controlla che il billing sia configurato</li>
                        <li>Verifica restrizioni API Key</li>
                        <li>Testa l'API dalle Impostazioni → "Test Google API"</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!error && results.length === 0 && !loading && (
            <div className="text-center py-12 text-neutral-500">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nessun risultato. Inizia una ricerca.</p>
            </div>
          )}

          <div className="space-y-3">
            {results.map((lead) => {
              const leadKey = lead.place_id || lead.name;
              const isSaving = savingLeads[leadKey];
              const isSaved = savedLeads[leadKey];
              
              return (
                <div
                  key={leadKey}
                  data-testid={`lead-result-${leadKey}`}
                  className="p-4 border border-neutral-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{lead.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-neutral-600">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {lead.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-500" />
                          {lead.rating} ({lead.reviews_count} recensioni)
                        </span>
                      </div>
                      <p className="text-sm text-neutral-500 mt-1">{lead.address}</p>
                      {lead.phone && (
                        <p className="text-sm text-neutral-600 mt-1">📞 {lead.phone}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className="bg-blue-500 text-white">Potenziale</Badge>
                      <Button
                        size="sm"
                        onClick={() => handleSaveLead(lead)}
                        disabled={isSaving || isSaved}
                        className={isSaved 
                          ? "bg-green-100 text-green-700 hover:bg-green-100" 
                          : "bg-green-600 hover:bg-green-700 text-white"
                        }
                        data-testid={`save-lead-${leadKey}`}
                      >
                        {isSaving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : isSaved ? (
                          <>
                            <Check size={14} className="mr-1" />
                            Salvato
                          </>
                        ) : (
                          <>
                            <Plus size={14} className="mr-1" />
                            Salva Lead
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
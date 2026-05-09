import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Loader2, MapPin, Star, Plus, Check, X, Phone, Globe, Clock, Image, MessageCircle, ChevronRight, ExternalLink } from 'lucide-react';
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
  'Parrucchiere', 'Estetista', 'Barbiere', 'Centro Estetico', 'Tatuatore', 'Nail Salon', 'Spa',
  'Ristorante', 'Pizzeria', 'Bar', 'Caffetteria', 'Gelateria', 'Pasticceria', 'Hamburgeria', 
  'Fast Food', 'Kebab', 'Imbiss', 'Trattoria', 'Osteria', 'Pub', 'Sushi', 'Poke',
  'Dentista', 'Fisioterapista', 'Veterinario', 'Farmacia', 'Ottico',
  'Palestra', 'Centro Yoga', 'Pilates', 'CrossFit',
  'Meccanico', 'Autolavaggio', 'Gommista', 'Carrozzeria',
  'Idraulico', 'Elettricista', 'Fabbro', 'Falegname', 'Imbianchino',
  'Fiorista', 'Negozio Abbigliamento', 'Gioielleria', 'Ferramenta',
  'Fotografo', 'Agenzia Immobiliare', 'Assicurazioni', 'Commercialista', 'Avvocato'
];

// Modal per dettagli azienda con caricamento dati da Google
function LeadDetailModal({ lead, onClose, onSave, isSaving, isSaved, country }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('[LeadHunter] Modal useEffect - lead:', lead?.name, 'place_id:', lead?.place_id);
    if (lead?.place_id) {
      loadDetails();
    } else if (lead) {
      // No place_id, use lead data directly
      console.log('[LeadHunter] No place_id, using lead data directly');
      setDetails(lead);
      setLoading(false);
    }
  }, [lead?.place_id]);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    console.log('[LeadHunter] Loading details for:', lead.place_id, 'country:', country);
    try {
      const url = `${API}/leads?action=details&place_id=${encodeURIComponent(lead.place_id)}&country=${encodeURIComponent(country)}`;
      console.log('[LeadHunter] API URL:', url);
      const response = await axios.get(url);
      console.log('[LeadHunter] Details response:', response.data);
      setDetails(response.data);
    } catch (err) {
      console.error('[LeadHunter] Errore caricamento dettagli:', err);
      console.error('[LeadHunter] Error response:', err.response?.data);
      setError('Impossibile caricare i dettagli. Riprova.');
      // Use basic lead data as fallback
      setDetails(lead);
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  // Merge lead data with details
  const data = { ...lead, ...details };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
          <h2 className="text-2xl font-bold pr-10">{data.name}</h2>
          <p className="text-blue-100 mt-1">{lead.category}</p>
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              {data.rating || lead.rating}
            </span>
            <span className="text-sm text-blue-100">
              {data.reviews_count || lead.reviews_count} recensioni
            </span>
            {data.open_now !== undefined && (
              <span className={`text-sm px-2 py-1 rounded-full ${data.open_now ? 'bg-green-500' : 'bg-red-500'}`}>
                {data.open_now ? 'Aperto ora' : 'Chiuso'}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
              <p className="text-neutral-600">Caricamento dettagli da Google...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">{error}</p>
              <Button size="sm" onClick={loadDetails} className="mt-2">Riprova</Button>
            </div>
          ) : (
            <>
              {/* Info principali */}
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-neutral-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-neutral-800">{data.address || lead.address}</p>
                    <p className="text-sm text-neutral-500">{lead.city}, {lead.country}</p>
                  </div>
                </div>

                {(data.phone || lead.phone) && (
                  <div className="flex items-center gap-3">
                    <Phone size={20} className="text-neutral-500 flex-shrink-0" />
                    <a href={`tel:${data.phone || lead.phone}`} className="text-blue-600 hover:underline font-medium">
                      {data.phone || lead.phone}
                    </a>
                  </div>
                )}

                {data.website && (
                  <div className="flex items-center gap-3">
                    <Globe size={20} className="text-neutral-500 flex-shrink-0" />
                    <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate flex items-center gap-1">
                      {data.website.replace(/^https?:\/\//, '').substring(0, 40)}...
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {data.google_maps_url && (
                  <a 
                    href={data.google_maps_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <MapPin size={16} />
                    Apri in Google Maps
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>

              {/* Orari */}
              {data.hours_text && data.hours_text.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                    <Clock size={18} className="text-blue-600" />
                    Orari di Apertura
                  </h3>
                  <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                    {data.hours_text.map((hour, idx) => (
                      <p key={idx} className="text-sm text-neutral-700 flex items-center">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                        {hour}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Foto */}
              {data.photos && data.photos.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                    <Image size={18} className="text-blue-600" />
                    Foto dell'Attività ({data.photos.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {data.photos.slice(0, 6).map((photo, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-neutral-100 shadow-sm">
                        <img 
                          src={photo.url || photo} 
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {data.photos.length > 6 && (
                    <p className="text-sm text-neutral-500 mt-2 text-center">
                      +{data.photos.length - 6} altre foto
                    </p>
                  )}
                </div>
              )}

              {/* Recensioni */}
              {data.reviews && data.reviews.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                    <MessageCircle size={18} className="text-blue-600" />
                    Recensioni Recenti
                  </h3>
                  <div className="space-y-3">
                    {data.reviews.slice(0, 3).map((review, idx) => (
                      <div key={idx} className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-neutral-800">{review.author}</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                size={14} 
                                className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-200'} 
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-neutral-600 line-clamp-3">{review.text}</p>
                        {review.time && (
                          <p className="text-xs text-neutral-400 mt-2">{review.time}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Perché è un buon lead */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <Check size={18} className="text-green-600" />
                  Perché è un buon Lead?
                </h3>
                <ul className="text-sm text-green-700 space-y-1">
                  {!data.website && <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Non ha un sito web professionale</li>}
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {data.reviews_count || lead.reviews_count} recensioni verificate su Google</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Rating {data.rating || lead.rating}/5 stelle</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Attività verificata e attiva</li>
                  {data.photos && data.photos.length > 0 && (
                    <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {data.photos.length} foto disponibili per il sito</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer con azioni */}
        <div className="p-6 bg-neutral-50 border-t border-neutral-200">
          <Button
            onClick={() => onSave({ ...lead, ...details })}
            disabled={isSaving || isSaved || loading}
            className={`w-full h-12 text-lg ${
              isSaved 
                ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 size={20} className="mr-2 animate-spin" />
                Salvataggio in corso...
              </>
            ) : isSaved ? (
              <>
                <Check size={20} className="mr-2" />
                Lead Salvato! Vai a "I Miei Lead"
              </>
            ) : (
              <>
                <Plus size={20} className="mr-2" />
                Salva questo Lead
              </>
            )}
          </Button>
          <p className="text-center text-sm text-neutral-500 mt-3">
            Dopo il salvataggio potrai generare il sito demo
          </p>
        </div>
      </div>
    </div>
  );
}

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
  const [selectedLead, setSelectedLead] = useState(null);

  const getCountryName = (code) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country ? country.name : code;
  };

  const handleSaveLead = async (lead) => {
    const leadKey = lead.place_id || lead.name;
    setSavingLeads(prev => ({ ...prev, [leadKey]: true }));
    
    try {
      const response = await axios.post(`${API}/leads`, {
        ...lead,
        country: getCountryName(formData.country)
      });
      
      if (response.data.already_exists) {
        toast.info(`"${lead.name}" era già nei tuoi lead`);
      } else {
        toast.success(`"${lead.name}" salvato con successo!`);
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
    setSavedLeads({});
    
    try {
      const response = await axios.post(`${API}/search/companies`, {
        ...formData,
        country: getCountryName(formData.country)
      });
      setResults(response.data);
      
      if (response.data.length === 0) {
        toast.info('Nessuna azienda trovata. Prova a ridurre i filtri.');
      } else {
        toast.success(`Trovati ${response.data.length} potenziali clienti!`);
      }
    } catch (error) {
      console.error('Errore ricerca:', error);
      
      const errorData = error.response?.data?.detail || error.response?.data?.error;
      
      if (typeof errorData === 'object' && errorData.info) {
        setError({
          title: errorData.info,
          isInfo: true,
          details: `Trovati ${errorData.total_found} posti, ma ${errorData.filtered_by_website} hanno già un sito web.`,
          suggestion: errorData.suggestion
        });
      } else {
        setError({
          title: 'Errore durante la ricerca',
          details: typeof errorData === 'string' ? errorData : error.message
        });
        toast.error('Errore durante la ricerca');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="search-leads-page">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">Cerca Nuovi Clienti</h1>
      <p className="text-neutral-600 mb-8">Trova attività senza sito web nella tua zona</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search Form */}
        <Card className="p-6 h-fit" data-testid="search-form">
          <h2 className="text-xl font-bold mb-6 tracking-tight">Filtri di Ricerca</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="city">Città *</Label>
              <Input
                id="city"
                data-testid="input-city"
                placeholder="es. Milano, Roma, Napoli..."
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="mt-1"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
              <Label htmlFor="category">Tipo di Attività</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_reviews">Min. Recensioni</Label>
                <Input
                  id="min_reviews"
                  data-testid="input-min-reviews"
                  type="number"
                  value={formData.min_reviews}
                  onChange={(e) => setFormData({ ...formData, min_reviews: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="min_rating">Min. Rating</Label>
                <Input
                  id="min_rating"
                  data-testid="input-min-rating"
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={formData.min_rating}
                  onChange={(e) => setFormData({ ...formData, min_rating: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              data-testid="search-button"
              onClick={handleSearch}
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={20} />
                  Ricerca in corso...
                </>
              ) : (
                <>
                  <Search className="mr-2" size={20} />
                  Cerca Aziende
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Results */}
        <Card className="p-6 lg:col-span-2" data-testid="search-results">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Risultati</h2>
              {results.length > 0 && (
                <p className="text-sm text-neutral-500">{results.length} attività trovate</p>
              )}
            </div>
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
            <div className={`mb-6 p-4 rounded-xl ${error.isInfo ? 'bg-blue-50 border-2 border-blue-300' : 'bg-red-50 border-2 border-red-300'}`}>
              <h3 className={`font-bold text-lg mb-2 ${error.isInfo ? 'text-blue-800' : 'text-red-800'}`}>
                {error.title}
              </h3>
              {error.details && (
                <p className={`text-sm ${error.isInfo ? 'text-blue-700' : 'text-red-700'}`}>
                  {error.details}
                </p>
              )}
              {error.suggestion && (
                <p className="text-sm font-semibold mt-2 text-blue-800">
                  💡 {error.suggestion}
                </p>
              )}
            </div>
          )}

          {!error && results.length === 0 && !loading && (
            <div className="text-center py-16 text-neutral-500">
              <Search size={56} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">Nessun risultato</p>
              <p className="text-sm mt-2">Inserisci una città e avvia la ricerca</p>
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
                  onClick={() => {
                    console.log('[LeadHunter] Lead clicked:', lead);
                    setSelectedLead(lead);
                  }}
                  className="p-4 border-2 border-neutral-200 rounded-xl hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer group bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg truncate group-hover:text-blue-600 transition-colors">
                          {lead.name}
                        </h3>
                        <ChevronRight size={20} className="text-neutral-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                      <p className="text-sm text-neutral-500 mb-2">{lead.category}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} className="text-neutral-400" />
                          {lead.city}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          {lead.rating}
                        </span>
                        <span className="text-neutral-400">
                          ({lead.reviews_count} recensioni)
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge className="bg-green-100 text-green-700 border border-green-300">
                        Senza Sito
                      </Badge>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveLead(lead);
                        }}
                        disabled={isSaving || isSaved}
                        className={isSaved 
                          ? "bg-green-100 text-green-700 hover:bg-green-100 border border-green-300" 
                          : "bg-blue-600 hover:bg-blue-700 text-white"
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
                            Salva
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-blue-500 mt-3 font-medium group-hover:underline">
                    👆 Tocca per vedere foto, recensioni e tutti i dettagli
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Modal dettagli */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          country={getCountryName(formData.country)}
          onClose={() => setSelectedLead(null)}
          onSave={handleSaveLead}
          isSaving={savingLeads[selectedLead.place_id || selectedLead.name]}
          isSaved={savedLeads[selectedLead.place_id || selectedLead.name]}
        />
      )}
    </div>
  );
}

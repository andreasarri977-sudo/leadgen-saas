import React, { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, MapPin, Star, Plus, Check, X, Phone, Globe, Clock, Image, MessageCircle, ChevronRight } from 'lucide-react';
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
  // Bellezza & Cura della persona
  'Parrucchiere',
  'Estetista',
  'Barbiere',
  'Centro Estetico',
  'Tatuatore',
  'Nail Salon',
  'Spa',
  // Ristorazione
  'Ristorante',
  'Pizzeria',
  'Bar',
  'Caffetteria',
  'Gelateria',
  'Pasticceria',
  'Hamburgeria',
  'Fast Food',
  'Kebab',
  'Imbiss',
  'Trattoria',
  'Osteria',
  'Pub',
  'Sushi',
  'Poke',
  // Salute
  'Dentista',
  'Fisioterapista',
  'Veterinario',
  'Farmacia',
  'Ottico',
  // Fitness & Sport
  'Palestra',
  'Centro Yoga',
  'Pilates',
  'CrossFit',
  // Servizi Auto
  'Meccanico',
  'Autolavaggio',
  'Gommista',
  'Carrozzeria',
  // Servizi Casa
  'Idraulico',
  'Elettricista',
  'Fabbro',
  'Falegname',
  'Imbianchino',
  // Commercio
  'Fiorista',
  'Negozio Abbigliamento',
  'Gioielleria',
  'Ferramenta',
  // Altri Servizi
  'Fotografo',
  'Agenzia Immobiliare',
  'Assicurazioni',
  'Commercialista',
  'Avvocato'
];

// Modal per dettagli azienda
function LeadDetailModal({ lead, onClose, onSave, isSaving, isSaved }) {
  if (!lead) return null;

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
          <h2 className="text-2xl font-bold pr-10">{lead.name}</h2>
          <p className="text-blue-100 mt-1">{lead.category}</p>
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              {lead.rating}
            </span>
            <span className="text-sm text-blue-100">
              {lead.reviews_count} recensioni
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Info principali */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="text-neutral-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-neutral-800">{lead.address}</p>
                <p className="text-sm text-neutral-500">{lead.city}, {lead.country}</p>
              </div>
            </div>

            {lead.phone && (
              <div className="flex items-center gap-3">
                <Phone size={20} className="text-neutral-500 flex-shrink-0" />
                <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline font-medium">
                  {lead.phone}
                </a>
              </div>
            )}

            {lead.website && (
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-neutral-500 flex-shrink-0" />
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate">
                  {lead.website}
                </a>
              </div>
            )}

            {lead.google_maps_url && (
              <a 
                href={lead.google_maps_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <MapPin size={16} />
                Apri in Google Maps
              </a>
            )}
          </div>

          {/* Orari se disponibili */}
          {lead.hours_text && lead.hours_text.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-neutral-800 mb-2 flex items-center gap-2">
                <Clock size={18} />
                Orari di apertura
              </h3>
              <div className="bg-neutral-50 rounded-lg p-4 text-sm space-y-1">
                {lead.hours_text.map((hour, idx) => (
                  <p key={idx} className="text-neutral-700">{hour}</p>
                ))}
              </div>
            </div>
          )}

          {/* Foto se disponibili */}
          {lead.photos && lead.photos.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-neutral-800 mb-2 flex items-center gap-2">
                <Image size={18} />
                Foto ({lead.photos.length})
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {lead.photos.slice(0, 6).map((photo, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-neutral-100">
                    <img 
                      src={photo.url || photo} 
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recensioni se disponibili */}
          {lead.reviews && lead.reviews.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-neutral-800 mb-2 flex items-center gap-2">
                <MessageCircle size={18} />
                Ultime recensioni
              </h3>
              <div className="space-y-3">
                {lead.reviews.slice(0, 3).map((review, idx) => (
                  <div key={idx} className="bg-neutral-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-neutral-800">{review.author}</span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300'} 
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

          {/* Info aggiuntive */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">Perché è un buon lead?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              {!lead.website && <li>✓ Non ha un sito web</li>}
              <li>✓ {lead.reviews_count} recensioni positive</li>
              <li>✓ Rating {lead.rating}/5</li>
              <li>✓ Attività verificata su Google</li>
            </ul>
          </div>
        </div>

        {/* Footer con azioni */}
        <div className="p-6 bg-neutral-50 border-t border-neutral-200">
          <Button
            onClick={() => onSave(lead)}
            disabled={isSaving || isSaved}
            className={`w-full h-12 text-lg ${
              isSaved 
                ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 size={20} className="mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : isSaved ? (
              <>
                <Check size={20} className="mr-2" />
                Lead Salvato!
              </>
            ) : (
              <>
                <Plus size={20} className="mr-2" />
                Salva Lead e Procedi
              </>
            )}
          </Button>
          <p className="text-center text-sm text-neutral-500 mt-3">
            Salvando il lead potrai generare il sito demo
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
      
      const errorData = error.response?.data?.detail;
      
      if (typeof errorData === 'object') {
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
      <h1 className="text-3xl sm:text-5xl font-bold mb-8 tracking-tight">Cerca Aziende</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="p-6 h-fit" data-testid="search-form">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 tracking-tight">Filtri di Ricerca</h2>

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Risultati</h2>
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
                  {error.isInfo ? 'i' : '!'}
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold ${error.isInfo ? 'text-blue-800' : 'text-red-800'} text-lg mb-2`}>{error.title}</h3>
                  {error.statusCode && (
                    <p className={`text-sm ${error.isInfo ? 'text-blue-700' : 'text-red-700'} mb-2`}>
                      <strong>Status Code:</strong> {error.statusCode}
                    </p>
                  )}
                  {error.details && (
                    <p className={`text-sm ${error.isInfo ? 'text-blue-700' : 'text-red-700'} mb-2`}>
                      {error.details}
                    </p>
                  )}
                  {error.suggestion && (
                    <p className={`text-sm ${error.isInfo ? 'text-blue-800' : 'text-red-800'} font-semibold mt-3`}>
                      Suggerimento: {error.suggestion}
                    </p>
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
                  onClick={() => setSelectedLead(lead)}
                  className="p-4 border border-neutral-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg truncate group-hover:text-blue-600 transition-colors">
                          {lead.name}
                        </h3>
                        <ChevronRight size={18} className="text-neutral-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                      </div>
                      <p className="text-sm text-neutral-500 mb-2">{lead.category}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {lead.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          {lead.rating} ({lead.reviews_count})
                        </span>
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={14} />
                            {lead.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge className={`${!lead.website ? 'bg-green-500' : 'bg-neutral-400'} text-white`}>
                        {!lead.website ? 'No Sito' : 'Ha Sito'}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveLead(lead);
                        }}
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
                            Salva
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-blue-500 mt-2 group-hover:underline">
                    Tocca per vedere tutti i dettagli
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
          onClose={() => setSelectedLead(null)}
          onSave={handleSaveLead}
          isSaving={savingLeads[selectedLead.place_id || selectedLead.name]}
          isSaved={savedLeads[selectedLead.place_id || selectedLead.name]}
        />
      )}
    </div>
  );
}

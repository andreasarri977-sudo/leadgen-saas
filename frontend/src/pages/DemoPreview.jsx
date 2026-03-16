import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Phone, Clock, Star, ExternalLink, Mail, Globe } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// 5 varianti di stile deterministiche
const STYLE_VARIANTS = [
  {
    id: 'modern-blue',
    primaryColor: 'from-blue-600 to-blue-800',
    accentColor: 'bg-blue-600',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    cardBg: 'bg-blue-50',
    font: 'font-sans'
  },
  {
    id: 'elegant-purple',
    primaryColor: 'from-purple-600 to-purple-800',
    accentColor: 'bg-purple-600',
    buttonColor: 'bg-purple-600 hover:bg-purple-700',
    cardBg: 'bg-purple-50',
    font: 'font-serif'
  },
  {
    id: 'fresh-green',
    primaryColor: 'from-green-600 to-green-800',
    accentColor: 'bg-green-600',
    buttonColor: 'bg-green-600 hover:bg-green-700',
    cardBg: 'bg-green-50',
    font: 'font-sans'
  },
  {
    id: 'warm-orange',
    primaryColor: 'from-orange-600 to-orange-800',
    accentColor: 'bg-orange-600',
    buttonColor: 'bg-orange-600 hover:bg-orange-700',
    cardBg: 'bg-orange-50',
    font: 'font-sans'
  },
  {
    id: 'professional-slate',
    primaryColor: 'from-slate-700 to-slate-900',
    accentColor: 'bg-slate-700',
    buttonColor: 'bg-slate-700 hover:bg-slate-800',
    cardBg: 'bg-slate-50',
    font: 'font-sans'
  }
];

// Seleziona stile deterministico da place_id
const getStyleFromPlaceId = (placeId) => {
  if (!placeId) return STYLE_VARIANTS[0];
  const hash = placeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return STYLE_VARIANTS[hash % STYLE_VARIANTS.length];
};

export default function DemoPreview() {
  const { demoId } = useParams();
  const [demo, setDemo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemo();
  }, [demoId]);

  const loadDemo = async () => {
    try {
      const response = await axios.get(`${API}/demos/${demoId}`);
      setDemo(response.data);
    } catch (error) {
      console.error('Errore caricamento demo:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Caricamento sito demo...</p>
        </div>
      </div>
    );
  }

  if (!demo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">Demo non trovato</h1>
          <p className="text-neutral-600">Il sito demo richiesto non esiste.</p>
        </div>
      </div>
    );
  }

  const business = demo.business_data || {};
  const content = demo.content || {};
  const photos = business.photos || [];
  const reviews = business.reviews || [];
  const hoursText = business.hours_text || [];
  
  // Seleziona stile basato su place_id
  const style = getStyleFromPlaceId(business.place_id);
  
  // Foto hero e gallery
  const heroPhoto = photos.length > 0 ? photos[0].url : null;
  const galleryPhotos = photos.slice(1, 9);

  return (
    <div className={`min-h-screen bg-white ${style.font}`}>
      {/* Hero Section con Foto */}
      <header className={`relative bg-gradient-to-br ${style.primaryColor} text-white overflow-hidden`}>
        {heroPhoto && (
          <div className="absolute inset-0 opacity-30">
            <img
              src={heroPhoto}
              alt="Hero"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="relative z-10 py-24 px-6">
          <div className="max-w-6xl mx-auto">
            {demo.logo_base64 && (
              <img
                src={`data:image/png;base64,${demo.logo_base64}`}
                alt="Logo"
                className="w-28 h-28 mb-6 bg-white rounded-xl p-4 shadow-2xl"
              />
            )}
            <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
              {demo.business_name}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl">
              {content.homepage_subtitle || `Il tuo ${business.category} di fiducia`}
            </p>
            <div className="flex flex-wrap gap-4">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className={`inline-flex items-center gap-2 bg-white text-neutral-900 px-8 py-4 rounded-full font-semibold hover:shadow-xl transition-all transform hover:scale-105`}
                >
                  <Phone size={20} />
                  Chiama Ora
                </a>
              )}
              {business.google_maps_link && (
                <a
                  href={business.google_maps_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 ${style.buttonColor} text-white px-8 py-4 rounded-full font-semibold hover:shadow-xl transition-all transform hover:scale-105`}
                >
                  <MapPin size={20} />
                  Indicazioni
                </a>
              )}
              {business.website && (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-full font-semibold hover:bg-white/30 transition-all"
                >
                  <Globe size={20} />
                  Sito Web
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Info Bar */}
      <div className={`${style.cardBg} py-8 px-6 border-b border-neutral-200`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {business.address && (
            <div className="flex items-start gap-3">
              <MapPin size={24} className="text-neutral-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-neutral-500 font-semibold">Indirizzo</p>
                <p className="font-medium text-neutral-800">{business.address}</p>
              </div>
            </div>
          )}
          {business.phone && (
            <div className="flex items-start gap-3">
              <Phone size={24} className="text-neutral-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-neutral-500 font-semibold">Telefono</p>
                <a href={`tel:${business.phone}`} className="font-medium text-neutral-800 hover:underline">
                  {business.phone}
                </a>
              </div>
            </div>
          )}
          {business.rating && (
            <div className="flex items-start gap-3">
              <Star size={24} className="text-yellow-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-neutral-500 font-semibold">Valutazione</p>
                <p className="font-medium text-neutral-800">
                  {business.rating} ⭐ ({business.reviews_count} recensioni)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 space-y-20">
        {/* Chi Siamo */}
        {content.about_text && (
          <section>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Chi Siamo</h2>
            <p className="text-lg md:text-xl text-neutral-700 leading-relaxed max-w-4xl">
              {content.about_text}
            </p>
          </section>
        )}

        {/* Servizi / Menu */}
        {content.services && content.services.length > 0 && (
          <section>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              {business.category === 'Ristorante' || business.category === 'Bar' ? 'Il Nostro Menu' : 'I Nostri Servizi'}
            </h2>
            {content.services_intro && (
              <p className="text-lg text-neutral-700 mb-10 max-w-3xl">{content.services_intro}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.services.map((service, index) => (
                <div
                  key={index}
                  className={`p-6 ${style.cardBg} rounded-2xl border-2 border-transparent hover:border-current hover:shadow-xl transition-all`}
                >
                  <div className={`w-12 h-12 ${style.accentColor} rounded-lg flex items-center justify-center text-white font-bold text-xl mb-4`}>
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{service}</h3>
                  <p className="text-neutral-600">Servizio professionale di alta qualità</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Galleria Foto */}
        {galleryPhotos.length > 0 && (
          <section>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Galleria</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryPhotos.map((photo, index) => (
                <div
                  key={index}
                  className="aspect-square bg-neutral-200 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow"
                >
                  <img
                    src={photo.url}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recensioni */}
        {reviews.length > 0 && (
          <section>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Cosa Dicono i Clienti</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((review, index) => (
                <div
                  key={index}
                  className="p-6 bg-white border-2 border-neutral-200 rounded-2xl shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300'}
                      />
                    ))}
                  </div>
                  <p className="text-neutral-700 mb-4 leading-relaxed">"{review.text}"</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-neutral-800">{review.author}</span>
                    <span className="text-neutral-500">{review.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Orari */}
        {hoursText.length > 0 && (
          <section>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Orari di Apertura</h2>
            <div className={`${style.cardBg} p-8 rounded-2xl border-2 border-neutral-200`}>
              <div className="flex items-start gap-4">
                <Clock size={32} className={style.accentColor.replace('bg-', 'text-')} />
                <div className="space-y-2 text-lg">
                  {hoursText.map((day, index) => (
                    <p key={index} className="text-neutral-700">{day}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Mappa */}
        {business.location && (
          <section>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Dove Siamo</h2>
            <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-neutral-200">
              <iframe
                src={`https://www.google.com/maps?q=${business.location.lat},${business.location.lng}&output=embed`}
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mappa"
              ></iframe>
            </div>
            {business.google_maps_link && (
              <div className="text-center mt-6">
                <a
                  href={business.google_maps_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 ${style.buttonColor} text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all`}
                >
                  <MapPin size={20} />
                  Apri su Google Maps
                </a>
              </div>
            )}
          </section>
        )}

        {/* Contatti */}
        <section>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Contatti</h2>
          <div className={`bg-gradient-to-br ${style.primaryColor} p-10 rounded-2xl text-white shadow-2xl`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-6">Informazioni</h3>
                <div className="space-y-4">
                  {business.address && (
                    <div className="flex items-start gap-3">
                      <MapPin size={24} className="mt-1 flex-shrink-0" />
                      <p className="text-lg">{business.address}</p>
                    </div>
                  )}
                  {business.phone && (
                    <div className="flex items-start gap-3">
                      <Phone size={24} className="mt-1 flex-shrink-0" />
                      <a href={`tel:${business.phone}`} className="text-lg hover:underline">
                        {business.phone}
                      </a>
                    </div>
                  )}
                  {business.email && (
                    <div className="flex items-start gap-3">
                      <Mail size={24} className="mt-1 flex-shrink-0" />
                      <a href={`mailto:${business.email}`} className="text-lg hover:underline">
                        {business.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-6">Seguici</h3>
                <div className="space-y-4">
                  {business.google_maps_link && (
                    <a
                      href={business.google_maps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 hover:underline"
                    >
                      <ExternalLink size={24} />
                      <span className="text-lg">Google Maps</span>
                    </a>
                  )}
                  {business.website && (
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 hover:underline"
                    >
                      <Globe size={24} />
                      <span className="text-lg">Sito Web</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Finale */}
        <section className={`text-center py-16 bg-gradient-to-br ${style.primaryColor} rounded-3xl text-white shadow-2xl`}>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {content.cta_text || 'Contattaci Oggi'}
          </h2>
          <p className="text-xl md:text-2xl text-white/80 mb-10 max-w-2xl mx-auto">
            Siamo pronti ad aiutarti con i nostri servizi professionali
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="inline-flex items-center gap-2 bg-white text-neutral-900 px-10 py-5 rounded-full font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105"
              >
                <Phone size={24} />
                {business.phone}
              </a>
            )}
            {business.google_maps_link && (
              <a
                href={business.google_maps_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-white/30 transition-all"
              >
                <MapPin size={24} />
                Come Arrivare
              </a>
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4">{demo.business_name}</h3>
              <p className="text-neutral-400">
                {business.category} professionale a {business.city}
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contatti</h4>
              <div className="space-y-2 text-neutral-400">
                {business.phone && <p>{business.phone}</p>}
                {business.address && <p className="text-sm">{business.address}</p>}
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">Orari</h4>
              <div className="space-y-1 text-neutral-400 text-sm">
                {hoursText.slice(0, 3).map((hour, i) => (
                  <p key={i}>{hour}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-neutral-800 pt-8 text-center">
            <p className="text-neutral-400 text-sm">
              © {new Date().getFullYear()} {demo.business_name}. Tutti i diritti riservati.
            </p>
            <p className="text-neutral-600 text-xs mt-2">
              Sito creato con LeadHunter Pro
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

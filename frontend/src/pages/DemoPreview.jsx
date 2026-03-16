import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Phone, Clock, Star, ExternalLink } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {demo.logo_base64 && (
            <img
              src={`data:image/png;base64,${demo.logo_base64}`}
              alt="Logo"
              className="w-24 h-24 mb-6 bg-white rounded-lg p-3 shadow-lg"
            />
          )}
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            {demo.business_name}
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8">
            {content.homepage_subtitle || `Il tuo ${business.category} di fiducia`}
          </p>
          <div className="flex flex-wrap gap-4">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
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
                className="inline-flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                <MapPin size={20} />
                Indicazioni
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Info Bar */}
      <div className="bg-neutral-100 py-6 px-6 border-b">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-6">
          {business.address && (
            <div className="flex items-start gap-2">
              <MapPin size={20} className="text-neutral-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-neutral-500">Indirizzo</p>
                <p className="font-medium">{business.address}</p>
              </div>
            </div>
          )}
          {business.phone && (
            <div className="flex items-start gap-2">
              <Phone size={20} className="text-neutral-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-neutral-500">Telefono</p>
                <p className="font-medium">{business.phone}</p>
              </div>
            </div>
          )}
          {business.rating && (
            <div className="flex items-start gap-2">
              <Star size={20} className="text-yellow-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-neutral-500">Valutazione</p>
                <p className="font-medium">
                  {business.rating} ⭐ ({business.reviews_count} recensioni)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Chi Siamo */}
        {content.about_text && (
          <section className="mb-16">
            <h2 className="text-4xl font-bold mb-6 tracking-tight">Chi Siamo</h2>
            <p className="text-lg text-neutral-700 leading-relaxed">
              {content.about_text}
            </p>
          </section>
        )}

        {/* Servizi */}
        {content.services && content.services.length > 0 && (
          <section className="mb-16">
            <h2 className="text-4xl font-bold mb-6 tracking-tight">I Nostri Servizi</h2>
            {content.services_intro && (
              <p className="text-lg text-neutral-700 mb-8">{content.services_intro}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.services.map((service, index) => (
                <div
                  key={index}
                  className="p-6 bg-neutral-50 rounded-xl border border-neutral-200 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-xl font-bold mb-2">{service}</h3>
                  <p className="text-neutral-600">Servizio professionale di alta qualità</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Galleria Foto */}
        {business.photos && business.photos.length > 0 && (
          <section className="mb-16">
            <h2 className="text-4xl font-bold mb-6 tracking-tight">Galleria</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {business.photos.slice(0, 8).map((photo, index) => (
                <div
                  key={index}
                  className="aspect-square bg-neutral-200 rounded-lg overflow-hidden"
                >
                  <img
                    src={photo}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Orari */}
        {business.hours && (
          <section className="mb-16">
            <h2 className="text-4xl font-bold mb-6 tracking-tight">Orari di Apertura</h2>
            <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
              <div className="flex items-start gap-3">
                <Clock size={24} className="text-blue-600 mt-1 flex-shrink-0" />
                <div className="text-lg text-neutral-700 whitespace-pre-line">
                  {business.hours}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Contatti */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-6 tracking-tight">Contatti</h2>
          <div className="bg-blue-50 p-8 rounded-xl border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-bold mb-4">Informazioni</h3>
                <div className="space-y-3">
                  {business.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={20} className="text-blue-600 mt-1 flex-shrink-0" />
                      <p>{business.address}</p>
                    </div>
                  )}
                  {business.phone && (
                    <div className="flex items-start gap-2">
                      <Phone size={20} className="text-blue-600 mt-1 flex-shrink-0" />
                      <a href={`tel:${business.phone}`} className="hover:underline">
                        {business.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              {business.google_maps_link && (
                <div>
                  <h3 className="text-xl font-bold mb-4">Dove Siamo</h3>
                  <a
                    href={business.google_maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <ExternalLink size={18} />
                    Vedi su Google Maps
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA Finale */}
        <section className="text-center py-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {content.cta_text || 'Contattaci Oggi'}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Siamo pronti ad aiutarti
          </p>
          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors"
            >
              <Phone size={22} />
              {business.phone}
            </a>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-8 px-6 mt-16">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-neutral-400">
            © {new Date().getFullYear()} {demo.business_name}. Tutti i diritti riservati.
          </p>
          <p className="text-sm text-neutral-500 mt-2">
            Sito creato con LeadHunter Pro
          </p>
        </div>
      </footer>
    </div>
  );
}

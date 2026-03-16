import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Phone, Clock, Star, ExternalLink, Mail, Globe, Menu as MenuIcon, X } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Filtra recensioni inappropriate
const filterReviews = (reviews, targetLanguage) => {
  if (!reviews || reviews.length === 0) return [];
  
  const inappropriateKeywords = [
    'sex', 'porn', 'xxx', 'fuck', 'shit', 'damn', 'hell',
    'sesso', 'porno', 'cazzo', 'merda', 'culo',
    'sexe', 'putain', 'merde', 'bordel'
  ];
  
  return reviews.filter(review => {
    const text = review.text?.toLowerCase() || '';
    
    // Filtra contenuti volgari
    if (inappropriateKeywords.some(keyword => text.includes(keyword))) {
      return false;
    }
    
    // Filtra recensioni troppo corte o spam
    if (text.length < 10 || text.includes('spam') || text.includes('fake')) {
      return false;
    }
    
    // Filtra rating troppo bassi (< 3)
    if (review.rating < 3) {
      return false;
    }
    
    return true;
  });
};

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

const getStyleFromPlaceId = (placeId) => {
  if (!placeId) return STYLE_VARIANTS[0];
  const hash = placeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return STYLE_VARIANTS[hash % STYLE_VARIANTS.length];
};

export default function DemoPreview() {
  const { demoId } = useParams();
  const [demo, setDemo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    loadDemo();
  }, [demoId]);

  // Salva posizione scroll prima di aprire lightbox
  const handleOpenLightbox = (index) => {
    setScrollY(window.scrollY);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Ripristina posizione scroll quando chiudo lightbox
  useEffect(() => {
    if (!lightboxOpen && scrollY > 0) {
      window.scrollTo(0, scrollY);
    }
  }, [lightboxOpen, scrollY]);

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

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Caricamento...</p>
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
  const reviews = filterReviews(business.reviews, business.language);
  const hoursText = business.hours_text || [];
  
  const style = getStyleFromPlaceId(business.place_id);
  
  const heroPhoto = photos.length > 0 ? photos[0].url : null;
  const galleryPhotos = photos.slice(1, 13);
  
  // Prepara slides per lightbox
  const lightboxSlides = galleryPhotos.map(photo => ({
    src: photo.url,
    alt: business.name
  }));

  // Determina se è food business per menu
  const isFoodBusiness = business.primary_type && ['restaurant', 'bar', 'cafe', 'pizza_restaurant'].includes(business.primary_type);
  const hasMenu = content.menu_categories && content.menu_categories.length > 0;

  return (
    <div className={`min-h-screen bg-white ${style.font}`}>
      {/* Navigation Desktop & Mobile */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{demo.business_name}</h2>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection('about')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                Chi Siamo
              </button>
              {(hasMenu || (content.services && content.services.length > 0)) && (
                <button onClick={() => scrollToSection('services')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                  {isFoodBusiness ? 'Menu' : 'Servizi'}
                </button>
              )}
              {galleryPhotos.length > 0 && (
                <button onClick={() => scrollToSection('gallery')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                  Galleria
                </button>
              )}
              {reviews.length > 0 && (
                <button onClick={() => scrollToSection('reviews')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                  Recensioni
                </button>
              )}
              {hoursText.length > 0 && (
                <button onClick={() => scrollToSection('hours')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                  Orari
                </button>
              )}
              <button onClick={() => scrollToSection('location')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                Dove Siamo
              </button>
              <button onClick={() => scrollToSection('contact')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                Contatti
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-700"
            >
              {mobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-2">
              <button onClick={() => scrollToSection('about')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                Chi Siamo
              </button>
              {(hasMenu || (content.services && content.services.length > 0)) && (
                <button onClick={() => scrollToSection('services')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                  {isFoodBusiness ? 'Menu' : 'Servizi'}
                </button>
              )}
              {galleryPhotos.length > 0 && (
                <button onClick={() => scrollToSection('gallery')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                  Galleria
                </button>
              )}
              {reviews.length > 0 && (
                <button onClick={() => scrollToSection('reviews')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                  Recensioni
                </button>
              )}
              {hoursText.length > 0 && (
                <button onClick={() => scrollToSection('hours')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                  Orari
                </button>
              )}
              <button onClick={() => scrollToSection('location')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                Dove Siamo
              </button>
              <button onClick={() => scrollToSection('contact')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                Contatti
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className={`relative bg-gradient-to-br ${style.primaryColor} text-white overflow-hidden`} style={{ marginTop: '0' }}>
        {heroPhoto && (
          <div className="absolute inset-0 opacity-30">
            <img
              src={heroPhoto}
              alt="Hero"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="relative z-10 py-20 md:py-32 px-6">
          <div className="max-w-6xl mx-auto">
            {demo.logo_base64 && (
              <img
                src={`data:image/png;base64,${demo.logo_base64}`}
                alt="Logo"
                className="w-24 h-24 md:w-32 md:h-32 mb-6 bg-white rounded-2xl p-4 shadow-2xl"
              />
            )}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight">
              {demo.business_name}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl">
              {content.homepage_subtitle || `Il tuo ${business.category} di fiducia`}
            </p>
            <div className="flex flex-wrap gap-4">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="inline-flex items-center gap-2 bg-white text-neutral-900 px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold hover:shadow-2xl transition-all transform hover:scale-105"
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
                  className={`inline-flex items-center gap-2 ${style.buttonColor} text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold hover:shadow-2xl transition-all transform hover:scale-105`}
                >
                  <MapPin size={20} />
                  Indicazioni
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Info Bar */}
      <div className={`${style.cardBg} py-6 md:py-8 px-6 border-b border-neutral-200`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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

      <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 space-y-16 md:space-y-24">
        {/* Chi Siamo */}
        {content.about_text && (
          <section id="about">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">Chi Siamo</h2>
            <p className="text-lg md:text-xl text-neutral-700 leading-relaxed max-w-4xl">
              {content.about_text}
            </p>
          </section>
        )}

        {/* Menu / Servizi */}
        {hasMenu && (
          <section id="services">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
              Il Nostro Menu
            </h2>
            <div className="space-y-8">
              {content.menu_categories.map((category, idx) => (
                <div key={idx} className={`p-6 md:p-8 ${style.cardBg} rounded-2xl border-2 border-neutral-200`}>
                  <h3 className="text-2xl font-bold mb-4">{category.name}</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-center gap-2 text-neutral-700">
                        <span className="w-2 h-2 bg-neutral-400 rounded-full flex-shrink-0"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {!hasMenu && content.services && content.services.length > 0 && (
          <section id="services">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
              I Nostri Servizi
            </h2>
            {content.services_intro && (
              <p className="text-lg text-neutral-700 mb-8 md:mb-10 max-w-3xl">{content.services_intro}</p>
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

        {/* Galleria con Lightbox */}
        {galleryPhotos.length > 0 && (
          <section id="gallery">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">Galleria</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryPhotos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => handleOpenLightbox(index)}
                  className="aspect-square bg-neutral-200 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all cursor-pointer group"
                >
                  <img
                    src={photo.url}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>

            {/* Lightbox */}
            <Lightbox
              open={lightboxOpen}
              close={() => setLightboxOpen(false)}
              slides={lightboxSlides}
              index={lightboxIndex}
              plugins={[Zoom]}
              zoom={{
                maxZoomPixelRatio: 3,
                scrollToZoom: true
              }}
              carousel={{
                finite: false
              }}
              render={{
                buttonPrev: lightboxSlides.length > 1 ? undefined : () => null,
                buttonNext: lightboxSlides.length > 1 ? undefined : () => null,
              }}
              controller={{
                closeOnBackdropClick: true
              }}
            />
          </section>
        )}

        {/* Recensioni Filtrate */}
        {reviews.length > 1 && (
          <section id="reviews">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">Cosa Dicono i Clienti</h2>
              {business.google_maps_link && (
                <a
                  href={business.google_maps_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm md:text-base font-medium flex items-center gap-1"
                >
                  Tutte le recensioni <ExternalLink size={16} />
                </a>
              )}
            </div>
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
                  <p className="text-neutral-700 mb-4 leading-relaxed line-clamp-4">"{review.text}"</p>
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
          <section id="hours">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">Orari di Apertura</h2>
            <div className={`${style.cardBg} p-6 md:p-8 rounded-2xl border-2 border-neutral-200`}>
              <div className="flex items-start gap-4">
                <Clock size={32} className={style.accentColor.replace('bg-', 'text-')} />
                <div className="space-y-2 text-base md:text-lg">
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
          <section id="location">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">Dove Siamo</h2>
            <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-neutral-200">
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
                  className={`inline-flex items-center gap-2 ${style.buttonColor} text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold shadow-lg hover:shadow-2xl transition-all`}
                >
                  <MapPin size={20} />
                  Apri su Google Maps
                </a>
              </div>
            )}
          </section>
        )}

        {/* Contatti */}
        <section id="contact">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">Contatti</h2>
          <div className={`bg-gradient-to-br ${style.primaryColor} p-8 md:p-12 rounded-2xl text-white shadow-2xl`}>
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
        <section className={`text-center py-12 md:py-16 bg-gradient-to-br ${style.primaryColor} rounded-3xl text-white shadow-2xl`}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {content.cta_text || (isFoodBusiness ? 'Prenota il Tuo Tavolo' : 'Contattaci Oggi')}
          </h2>
          <p className="text-lg md:text-xl lg:text-2xl text-white/80 mb-8 md:mb-10 max-w-2xl mx-auto px-4">
            {isFoodBusiness 
              ? `Vieni a trovarci da ${business.name} per un'esperienza indimenticabile` 
              : `${business.name} è a tua disposizione`
            }
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="inline-flex items-center gap-2 bg-white text-neutral-900 px-8 md:px-10 py-4 md:py-5 rounded-full font-bold text-base md:text-lg hover:shadow-2xl transition-all transform hover:scale-105"
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
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-8 md:px-10 py-4 md:py-5 rounded-full font-bold text-base md:text-lg hover:bg-white/30 transition-all"
              >
                <MapPin size={24} />
                Come Arrivare
              </a>
            )}
          </div>
        </section>
      </div>

      {/* Footer Pulito (NO WATERMARK) */}
      <footer className="bg-neutral-900 text-white py-8 md:py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4">{demo.business_name}</h3>
              <p className="text-neutral-400">
                {business.category} a {business.city}
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contatti</h4>
              <div className="space-y-2 text-neutral-400 text-sm">
                {business.phone && <p>{business.phone}</p>}
                {business.address && <p>{business.address}</p>}
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
          </div>
        </div>
      </footer>

      {/* Sticky Bottom Bar Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-neutral-200 shadow-2xl">
        <div className="grid grid-cols-2 gap-0">
          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              className={`flex items-center justify-center gap-2 ${style.buttonColor} text-white py-4 font-bold text-base`}
            >
              <Phone size={20} />
              Chiama
            </a>
          )}
          {business.google_maps_link && (
            <a
              href={business.google_maps_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-neutral-800 text-white py-4 font-bold text-base"
            >
              <MapPin size={20} />
              Indicazioni
            </a>
          )}
        </div>
      </div>

      {/* Spazio per sticky bar */}
      <div className="md:hidden h-16"></div>
    </div>
  );
}

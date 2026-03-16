import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Phone, Clock, Star, ExternalLink, Mail, Globe, Menu as MenuIcon, X, Calendar, Users, MessageCircle } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import { t, localizeHours, getLanguageFromCountry } from '@/lib/translations';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Filtra recensioni inappropriate
const filterReviews = (reviews) => {
  if (!reviews || reviews.length === 0) return [];
  
  const inappropriateKeywords = [
    'sex', 'porn', 'xxx', 'fuck', 'shit', 'damn', 'hell',
    'sesso', 'porno', 'cazzo', 'merda', 'culo',
    'sexe', 'putain', 'merde', 'bordel'
  ];
  
  return reviews.filter(review => {
    const text = review.text?.toLowerCase() || '';
    if (inappropriateKeywords.some(keyword => text.includes(keyword))) return false;
    if (text.length < 10 || text.includes('spam') || text.includes('fake')) return false;
    if (review.rating < 3) return false;
    return true;
  });
};

// 5 varianti di stile
const STYLE_VARIANTS = [
  { id: 'modern-blue', primaryColor: 'from-blue-600 to-blue-800', accentColor: 'bg-blue-600', buttonColor: 'bg-blue-600 hover:bg-blue-700', cardBg: 'bg-blue-50', font: 'font-sans' },
  { id: 'elegant-purple', primaryColor: 'from-purple-600 to-purple-800', accentColor: 'bg-purple-600', buttonColor: 'bg-purple-600 hover:bg-purple-700', cardBg: 'bg-purple-50', font: 'font-serif' },
  { id: 'fresh-green', primaryColor: 'from-green-600 to-green-800', accentColor: 'bg-green-600', buttonColor: 'bg-green-600 hover:bg-green-700', cardBg: 'bg-green-50', font: 'font-sans' },
  { id: 'warm-orange', primaryColor: 'from-orange-600 to-orange-800', accentColor: 'bg-orange-600', buttonColor: 'bg-orange-600 hover:bg-orange-700', cardBg: 'bg-orange-50', font: 'font-sans' },
  { id: 'professional-slate', primaryColor: 'from-slate-700 to-slate-900', accentColor: 'bg-slate-700', buttonColor: 'bg-slate-700 hover:bg-slate-800', cardBg: 'bg-slate-50', font: 'font-sans' }
];

const getStyleFromPlaceId = (placeId) => {
  if (!placeId) return STYLE_VARIANTS[0];
  const hash = placeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return STYLE_VARIANTS[hash % STYLE_VARIANTS.length];
};

// Componente Form Prenotazione
function BookingForm({ demoId, bookingMode, lang, style, businessPhone, externalBookingUrl }) {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    name: '',
    phone: '',
    email: '',
    numberOfPeople: 2,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Se c'è URL esterno, mostra solo il bottone
  if (externalBookingUrl) {
    const platformName = externalBookingUrl.includes('thefork') ? 'TheFork' :
                         externalBookingUrl.includes('treatwell') ? 'Treatwell' :
                         externalBookingUrl.includes('fresha') ? 'Fresha' :
                         externalBookingUrl.includes('doctolib') ? 'Doctolib' :
                         externalBookingUrl.includes('calendly') ? 'Calendly' : 'piattaforma';
    
    return (
      <div className="text-center py-8">
        <a
          href={externalBookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 ${style.buttonColor} text-white px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl transition-all`}
        >
          <Calendar size={24} />
          {t('booking.externalBooking', lang)} {platformName}
        </a>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await axios.post(`${API}/bookings`, {
        demo_id: demoId,
        booking_type: bookingMode,
        date: formData.date,
        time: formData.time,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        number_of_people: bookingMode === 'table' ? formData.numberOfPeople : null,
        notes: formData.notes || null
      });
      setSubmitted(true);
      toast.success(t('booking.bookingSuccess', lang));
    } catch (error) {
      console.error('Errore prenotazione:', error);
      toast.error(t('booking.bookingError', lang));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="text-green-600" size={32} />
        </div>
        <p className="text-xl font-bold text-green-700 mb-2">{t('booking.bookingSuccess', lang)}</p>
        {businessPhone && (
          <a href={`https://wa.me/${businessPhone.replace(/[^0-9]/g, '')}`} 
             target="_blank" 
             rel="noopener noreferrer"
             className="inline-flex items-center gap-2 text-green-600 hover:underline mt-4">
            <MessageCircle size={20} />
            WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">{t('booking.selectDate', lang)}</label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">{t('booking.selectTime', lang)}</label>
          <input
            type="time"
            required
            value={formData.time}
            onChange={(e) => setFormData({...formData, time: e.target.value})}
            className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {bookingMode === 'table' && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">{t('booking.numberOfPeople', lang)}</label>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setFormData({...formData, numberOfPeople: Math.max(1, formData.numberOfPeople - 1)})}
                    className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center hover:bg-neutral-200">-</button>
            <span className="text-xl font-bold">{formData.numberOfPeople} {formData.numberOfPeople === 1 ? t('booking.person', lang) : t('booking.people', lang)}</span>
            <button type="button" onClick={() => setFormData({...formData, numberOfPeople: formData.numberOfPeople + 1})}
                    className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center hover:bg-neutral-200">+</button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">{t('booking.yourName', lang)}</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">{t('booking.yourPhone', lang)}</label>
        <input
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">{t('booking.yourEmail', lang)} (optional)</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">{t('booking.notes', lang)}</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          rows={2}
          className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`w-full ${style.buttonColor} text-white px-6 py-4 rounded-full font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50`}
      >
        {submitting ? '...' : t('booking.confirmBooking', lang)}
      </button>
    </form>
  );
}

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

  const handleOpenLightbox = (index) => {
    setScrollY(window.scrollY);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

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
        </div>
      </div>
    );
  }

  if (!demo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">Demo non trovato</h1>
        </div>
      </div>
    );
  }

  const business = demo.business_data || {};
  const content = demo.content || {};
  const photos = business.photos || [];
  const reviews = filterReviews(business.reviews);
  
  // Lingua del sito (codice: it, fr, en, es, de)
  const lang = business.site_language || getLanguageFromCountry(business.country) || 'it';
  
  // Localizza orari
  const localizedHours = localizeHours(business.hours_text, lang);
  
  // Booking mode e URL esterno
  const bookingMode = business.booking_mode || 'none';
  const externalBookingUrl = business.external_booking_url;
  
  const style = getStyleFromPlaceId(business.place_id);
  
  const heroPhoto = photos.length > 0 ? photos[0].url : null;
  const galleryPhotos = photos.slice(1, 13);
  
  const lightboxSlides = galleryPhotos.map(photo => ({
    src: photo.url,
    alt: business.name
  }));

  const isFoodBusiness = business.primary_type && ['restaurant', 'bar', 'cafe', 'pizza_restaurant'].includes(business.primary_type);
  const hasMenu = content.menu_categories && content.menu_categories.length > 0;

  return (
    <div className={`min-h-screen bg-white ${style.font}`}>
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{demo.business_name}</h2>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection('about')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                {t('nav.about', lang)}
              </button>
              {(hasMenu || (content.services && content.services.length > 0)) && (
                <button onClick={() => scrollToSection('services')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                  {isFoodBusiness ? t('nav.menu', lang) : t('nav.services', lang)}
                </button>
              )}
              {galleryPhotos.length > 0 && (
                <button onClick={() => scrollToSection('gallery')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                  {t('nav.gallery', lang)}
                </button>
              )}
              {reviews.length > 0 && (
                <button onClick={() => scrollToSection('reviews')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                  {t('nav.reviews', lang)}
                </button>
              )}
              {localizedHours.length > 0 && (
                <button onClick={() => scrollToSection('hours')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                  {t('nav.hours', lang)}
                </button>
              )}
              <button onClick={() => scrollToSection('location')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                {t('nav.location', lang)}
              </button>
              {bookingMode !== 'none' && (
                <button onClick={() => scrollToSection('booking')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                  {t('nav.booking', lang)}
                </button>
              )}
              <button onClick={() => scrollToSection('contact')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors">
                {t('nav.contact', lang)}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-neutral-700">
              {mobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-2">
              <button onClick={() => scrollToSection('about')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                {t('nav.about', lang)}
              </button>
              {(hasMenu || (content.services && content.services.length > 0)) && (
                <button onClick={() => scrollToSection('services')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                  {isFoodBusiness ? t('nav.menu', lang) : t('nav.services', lang)}
                </button>
              )}
              {galleryPhotos.length > 0 && (
                <button onClick={() => scrollToSection('gallery')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                  {t('nav.gallery', lang)}
                </button>
              )}
              {reviews.length > 0 && (
                <button onClick={() => scrollToSection('reviews')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                  {t('nav.reviews', lang)}
                </button>
              )}
              {localizedHours.length > 0 && (
                <button onClick={() => scrollToSection('hours')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                  {t('nav.hours', lang)}
                </button>
              )}
              <button onClick={() => scrollToSection('location')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                {t('nav.location', lang)}
              </button>
              {bookingMode !== 'none' && (
                <button onClick={() => scrollToSection('booking')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                  {t('nav.booking', lang)}
                </button>
              )}
              <button onClick={() => scrollToSection('contact')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                {t('nav.contact', lang)}
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className={`relative bg-gradient-to-br ${style.primaryColor} text-white overflow-hidden`}>
        {heroPhoto && (
          <div className="absolute inset-0 opacity-30">
            <img src={heroPhoto} alt="Hero" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative z-10 py-20 md:py-32 px-6">
          <div className="max-w-6xl mx-auto">
            {demo.logo_base64 && (
              <img src={`data:image/png;base64,${demo.logo_base64}`} alt="Logo" className="w-24 h-24 md:w-32 md:h-32 mb-6 bg-white rounded-2xl p-4 shadow-2xl" />
            )}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight">
              {demo.business_name}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl">
              {content.homepage_subtitle || `${business.category} ${t('misc.trustBusiness', lang)}`}
            </p>
            <div className="flex flex-wrap gap-4">
              {business.phone && (
                <a href={`tel:${business.phone}`} className="inline-flex items-center gap-2 bg-white text-neutral-900 px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold hover:shadow-2xl transition-all transform hover:scale-105">
                  <Phone size={20} />
                  {t('hero.callNow', lang)}
                </a>
              )}
              {business.google_maps_link && (
                <a href={business.google_maps_link} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 ${style.buttonColor} text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold hover:shadow-2xl transition-all transform hover:scale-105`}>
                  <MapPin size={20} />
                  {t('hero.directions', lang)}
                </a>
              )}
              {bookingMode === 'table' && (
                <button onClick={() => scrollToSection('booking')} className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold hover:shadow-2xl transition-all transform hover:scale-105">
                  <Calendar size={20} />
                  {t('hero.bookTable', lang)}
                </button>
              )}
              {bookingMode === 'appointment' && (
                <button onClick={() => scrollToSection('booking')} className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold hover:shadow-2xl transition-all transform hover:scale-105">
                  <Calendar size={20} />
                  {t('hero.bookAppointment', lang)}
                </button>
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
                <p className="text-sm text-neutral-500 font-semibold">{t('info.address', lang)}</p>
                <p className="font-medium text-neutral-800">{business.address}</p>
              </div>
            </div>
          )}
          {business.phone && (
            <div className="flex items-start gap-3">
              <Phone size={24} className="text-neutral-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-neutral-500 font-semibold">{t('info.phone', lang)}</p>
                <a href={`tel:${business.phone}`} className="font-medium text-neutral-800 hover:underline">{business.phone}</a>
              </div>
            </div>
          )}
          {business.rating && (
            <div className="flex items-start gap-3">
              <Star size={24} className="text-yellow-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-neutral-500 font-semibold">{t('info.rating', lang)}</p>
                <p className="font-medium text-neutral-800">{business.rating} ({business.reviews_count} {t('info.reviews', lang)})</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 space-y-16 md:space-y-24">
        {/* Chi Siamo / About */}
        {content.about_text && (
          <section id="about">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">{t('sections.aboutTitle', lang)}</h2>
            <p className="text-lg md:text-xl text-neutral-700 leading-relaxed max-w-4xl">{content.about_text}</p>
          </section>
        )}

        {/* Menu (per ristoranti) */}
        {hasMenu && (
          <section id="services">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">{t('sections.menuTitle', lang)}</h2>
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

        {/* Servizi (per non-ristoranti) */}
        {!hasMenu && content.services && content.services.length > 0 && (
          <section id="services">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">{t('sections.servicesTitle', lang)}</h2>
            {content.services_intro && (
              <p className="text-lg text-neutral-700 mb-8 md:mb-10 max-w-3xl">{content.services_intro}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.services.map((service, index) => (
                <div key={index} className={`p-6 ${style.cardBg} rounded-2xl border-2 border-transparent hover:border-current hover:shadow-xl transition-all`}>
                  <div className={`w-12 h-12 ${style.accentColor} rounded-lg flex items-center justify-center text-white font-bold text-xl mb-4`}>
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{service}</h3>
                  <p className="text-neutral-600">{t('misc.professionalService', lang)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Galleria */}
        {galleryPhotos.length > 0 && (
          <section id="gallery">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">{t('sections.galleryTitle', lang)}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryPhotos.map((photo, index) => (
                <button key={index} onClick={() => handleOpenLightbox(index)} className="aspect-square bg-neutral-200 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all cursor-pointer group">
                  <img src={photo.url} alt={`${t('sections.galleryTitle', lang)} ${index + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                </button>
              ))}
            </div>
            <Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)} slides={lightboxSlides} index={lightboxIndex} plugins={[Zoom]} zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }} />
          </section>
        )}

        {/* Recensioni */}
        {reviews.length > 1 && (
          <section id="reviews">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">{t('sections.reviewsTitle', lang)}</h2>
              {business.google_maps_link && (
                <a href={business.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm md:text-base font-medium flex items-center gap-1">
                  {t('reviews.readAllOnGoogle', lang)} <ExternalLink size={16} />
                </a>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((review, index) => (
                <div key={index} className="p-6 bg-white border-2 border-neutral-200 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-2 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300'} />
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
        {localizedHours.length > 0 && (
          <section id="hours">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">{t('sections.hoursTitle', lang)}</h2>
            <div className={`${style.cardBg} p-6 md:p-8 rounded-2xl border-2 border-neutral-200`}>
              <div className="flex items-start gap-4">
                <Clock size={32} className={style.accentColor.replace('bg-', 'text-')} />
                <div className="space-y-2 text-base md:text-lg">
                  {localizedHours.map((day, index) => (
                    <p key={index} className="text-neutral-700">{day}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Sezione Prenotazione */}
        {bookingMode !== 'none' && (
          <section id="booking">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
              {bookingMode === 'table' ? t('sections.bookTableTitle', lang) : t('sections.bookAppointmentTitle', lang)}
            </h2>
            <div className={`${style.cardBg} p-6 md:p-8 rounded-2xl border-2 border-neutral-200`}>
              <BookingForm 
                demoId={demoId} 
                bookingMode={bookingMode} 
                lang={lang} 
                style={style}
                businessPhone={business.phone}
                externalBookingUrl={externalBookingUrl}
              />
            </div>
          </section>
        )}

        {/* Mappa */}
        {business.location && (
          <section id="location">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">{t('sections.locationTitle', lang)}</h2>
            <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-neutral-200">
              <iframe
                src={`https://www.google.com/maps?q=${business.location.lat},${business.location.lng}&output=embed`}
                width="100%" height="450" style={{ border: 0 }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map"
              ></iframe>
            </div>
            {business.google_maps_link && (
              <div className="text-center mt-6">
                <a href={business.google_maps_link} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 ${style.buttonColor} text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold shadow-lg hover:shadow-2xl transition-all`}>
                  <MapPin size={20} />
                  {t('buttons.openGoogleMaps', lang)}
                </a>
              </div>
            )}
          </section>
        )}

        {/* Contatti */}
        <section id="contact">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">{t('sections.contactTitle', lang)}</h2>
          <div className={`bg-gradient-to-br ${style.primaryColor} p-8 md:p-12 rounded-2xl text-white shadow-2xl`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-6">{t('footer.contact', lang)}</h3>
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
                      <a href={`tel:${business.phone}`} className="text-lg hover:underline">{business.phone}</a>
                    </div>
                  )}
                  {business.email && (
                    <div className="flex items-start gap-3">
                      <Mail size={24} className="mt-1 flex-shrink-0" />
                      <a href={`mailto:${business.email}`} className="text-lg hover:underline">{business.email}</a>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-6">Links</h3>
                <div className="space-y-4">
                  {business.google_maps_link && (
                    <a href={business.google_maps_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:underline">
                      <ExternalLink size={24} />
                      <span className="text-lg">Google Maps</span>
                    </a>
                  )}
                  {business.website && (
                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:underline">
                      <Globe size={24} />
                      <span className="text-lg">Website</span>
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
            {content.cta_text || (bookingMode === 'table' ? t('cta.bookYourTable', lang) : t('cta.contactToday', lang))}
          </h2>
          <p className="text-lg md:text-xl lg:text-2xl text-white/80 mb-8 md:mb-10 max-w-2xl mx-auto px-4">
            {isFoodBusiness ? t('cta.comeVisitUs', lang) : `${business.name} ${t('cta.atYourService', lang)}`}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {business.phone && (
              <a href={`tel:${business.phone}`} className="inline-flex items-center gap-2 bg-white text-neutral-900 px-8 md:px-10 py-4 md:py-5 rounded-full font-bold text-base md:text-lg hover:shadow-2xl transition-all transform hover:scale-105">
                <Phone size={24} />
                {business.phone}
              </a>
            )}
            {business.google_maps_link && (
              <a href={business.google_maps_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-8 md:px-10 py-4 md:py-5 rounded-full font-bold text-base md:text-lg hover:bg-white/30 transition-all">
                <MapPin size={24} />
                {t('buttons.howToArrive', lang)}
              </a>
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-8 md:py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4">{demo.business_name}</h3>
              <p className="text-neutral-400">{business.category} {t('misc.in', lang)} {business.city}</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">{t('footer.contact', lang)}</h4>
              <div className="space-y-2 text-neutral-400 text-sm">
                {business.phone && <p>{business.phone}</p>}
                {business.address && <p>{business.address}</p>}
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">{t('footer.hours', lang)}</h4>
              <div className="space-y-1 text-neutral-400 text-sm">
                {localizedHours.slice(0, 3).map((hour, i) => (
                  <p key={i}>{hour}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-neutral-800 pt-8 text-center">
            <p className="text-neutral-400 text-sm">
              © {new Date().getFullYear()} {demo.business_name}. {t('footer.allRightsReserved', lang)}.
            </p>
          </div>
        </div>
      </footer>

      {/* Sticky Bottom Bar Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-neutral-200 shadow-2xl">
        <div className={`grid ${bookingMode !== 'none' ? 'grid-cols-3' : 'grid-cols-2'} gap-0`}>
          {business.phone && (
            <a href={`tel:${business.phone}`} className={`flex items-center justify-center gap-2 ${style.buttonColor} text-white py-4 font-bold text-sm`}>
              <Phone size={18} />
              {t('buttons.call', lang)}
            </a>
          )}
          {bookingMode !== 'none' && (
            <button onClick={() => scrollToSection('booking')} className="flex items-center justify-center gap-2 bg-green-500 text-white py-4 font-bold text-sm">
              <Calendar size={18} />
              {t('nav.booking', lang)}
            </button>
          )}
          {business.google_maps_link && (
            <a href={business.google_maps_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-neutral-800 text-white py-4 font-bold text-sm">
              <MapPin size={18} />
              {t('hero.directions', lang)}
            </a>
          )}
        </div>
      </div>

      {/* Spazio per sticky bar */}
      <div className="md:hidden h-16"></div>
    </div>
  );
}

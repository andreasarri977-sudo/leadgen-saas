import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Phone, Clock, Star, ExternalLink, Mail, Globe, Menu as MenuIcon, X, Calendar, Users, MessageCircle, ChevronDown, Instagram, Facebook } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import { t, localizeHours, getLanguageFromCountry, getServiceDescription } from '@/lib/translations';
import { toast } from 'sonner';
import API from '@/lib/api';

// TikTok Icon (not in lucide-react)
const TikTokIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Language config
const AVAILABLE_LANGUAGES = {
  it: { name: 'Italiano', flag: '🇮🇹' },
  fr: { name: 'Français', flag: '🇫🇷' },
  en: { name: 'English', flag: '🇬🇧' },
  es: { name: 'Español', flag: '🇪🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' }
};

// Filtra recensioni inappropriate
const filterReviews = (reviews) => {
  if (!reviews || reviews.length === 0) return [];
  
  const inappropriateKeywords = ['sex', 'porn', 'xxx', 'fuck', 'shit', 'sesso', 'porno', 'cazzo', 'merda', 'sexe', 'putain', 'merde'];
  
  return reviews.filter(review => {
    const text = review.text?.toLowerCase() || '';
    if (inappropriateKeywords.some(keyword => text.includes(keyword))) return false;
    if (text.length < 10 || text.includes('spam') || text.includes('fake')) return false;
    if (review.rating < 3) return false;
    return true;
  });
};

// Style variants
const STYLE_VARIANTS = [
  { id: 'modern-blue', primaryColor: 'from-blue-600 to-blue-800', accentColor: 'bg-blue-600', buttonColor: 'bg-blue-600 hover:bg-blue-700', cardBg: 'bg-blue-50', textAccent: 'text-blue-600' },
  { id: 'elegant-purple', primaryColor: 'from-purple-600 to-purple-800', accentColor: 'bg-purple-600', buttonColor: 'bg-purple-600 hover:bg-purple-700', cardBg: 'bg-purple-50', textAccent: 'text-purple-600' },
  { id: 'fresh-green', primaryColor: 'from-green-600 to-green-800', accentColor: 'bg-green-600', buttonColor: 'bg-green-600 hover:bg-green-700', cardBg: 'bg-green-50', textAccent: 'text-green-600' },
  { id: 'warm-orange', primaryColor: 'from-orange-600 to-orange-800', accentColor: 'bg-orange-600', buttonColor: 'bg-orange-600 hover:bg-orange-700', cardBg: 'bg-orange-50', textAccent: 'text-orange-600' },
  { id: 'professional-slate', primaryColor: 'from-slate-700 to-slate-900', accentColor: 'bg-slate-700', buttonColor: 'bg-slate-700 hover:bg-slate-800', cardBg: 'bg-slate-50', textAccent: 'text-slate-700' }
];

const getStyleFromPlaceId = (placeId) => {
  if (!placeId) return STYLE_VARIANTS[0];
  const hash = placeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return STYLE_VARIANTS[hash % STYLE_VARIANTS.length];
};

// Country code prefixes
const COUNTRY_PHONE_PREFIXES = {
  'IT': '+39', 'Italia': '+39', 'Italy': '+39',
  'FR': '+33', 'Francia': '+33', 'France': '+33',
  'ES': '+34', 'Spagna': '+34', 'Spain': '+34', 'España': '+34',
  'DE': '+49', 'Germania': '+49', 'Germany': '+49', 'Deutschland': '+49',
  'AT': '+43', 'Austria': '+43', 'Österreich': '+43',
  'CH': '+41', 'Svizzera': '+41', 'Switzerland': '+41', 'Schweiz': '+41', 'Suisse': '+41',
  'BE': '+32', 'Belgio': '+32', 'Belgium': '+32', 'Belgique': '+32',
  'GB': '+44', 'UK': '+44', 'Regno Unito': '+44', 'United Kingdom': '+44',
  'IE': '+353', 'Irlanda': '+353', 'Ireland': '+353',
  'US': '+1', 'USA': '+1', 'Stati Uniti': '+1', 'United States': '+1',
  'PT': '+351', 'Portogallo': '+351', 'Portugal': '+351',
  'NL': '+31', 'Paesi Bassi': '+31', 'Netherlands': '+31',
  'PL': '+48', 'Polonia': '+48', 'Poland': '+48',
  'GR': '+30', 'Grecia': '+30', 'Greece': '+30',
  'HR': '+385', 'Croazia': '+385', 'Croatia': '+385',
  'SI': '+386', 'Slovenia': '+386',
  'default': '+39'
};

// Get country phone prefix
const getPhonePrefix = (country) => {
  if (!country) return COUNTRY_PHONE_PREFIXES['default'];
  return COUNTRY_PHONE_PREFIXES[country] || COUNTRY_PHONE_PREFIXES[country.toUpperCase()] || COUNTRY_PHONE_PREFIXES['default'];
};

// Format phone with country prefix
const formatPhoneWithPrefix = (phone, country) => {
  if (!phone) return null;
  // If already has + prefix, return as is
  if (phone.startsWith('+')) return phone;
  // If starts with 00, replace with +
  if (phone.startsWith('00')) return '+' + phone.substring(2);
  // Add country prefix
  const prefix = getPhonePrefix(country);
  const cleanPhone = phone.replace(/^0+/, ''); // Remove leading zeros
  return `${prefix} ${phone}`;
};

// Check if phone is mobile (likely has WhatsApp)
const isMobilePhone = (phone, country) => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  
  // Italian mobile numbers start with 3
  if (country === 'IT' || country === 'Italia' || country === 'Italy') {
    return cleanPhone.startsWith('3') || cleanPhone.startsWith('393');
  }
  // French mobile numbers start with 6 or 7
  if (country === 'FR' || country === 'Francia' || country === 'France') {
    return cleanPhone.startsWith('6') || cleanPhone.startsWith('7') || cleanPhone.startsWith('336') || cleanPhone.startsWith('337');
  }
  // Spanish mobile numbers start with 6 or 7
  if (country === 'ES' || country === 'Spagna' || country === 'Spain' || country === 'España') {
    return cleanPhone.startsWith('6') || cleanPhone.startsWith('7') || cleanPhone.startsWith('346') || cleanPhone.startsWith('347');
  }
  // German mobile numbers start with 15, 16, 17
  if (country === 'DE' || country === 'Germania' || country === 'Germany' || country === 'Deutschland') {
    return cleanPhone.startsWith('15') || cleanPhone.startsWith('16') || cleanPhone.startsWith('17') || 
           cleanPhone.startsWith('4915') || cleanPhone.startsWith('4916') || cleanPhone.startsWith('4917');
  }
  // Default: assume it's mobile if it has WhatsApp field or is explicitly set
  return false;
};

// Generate WhatsApp link with pre-filled message (only if mobile or whatsapp_number is set)
const getWhatsAppLink = (phone, message, whatsappNumber = null) => {
  // Use explicit WhatsApp number if provided
  const numberToUse = whatsappNumber || phone;
  if (!numberToUse) return null;
  const cleanPhone = numberToUse.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

// Language Switcher Component
function LanguageSwitcher({ currentLang, localeLang, onSwitch, style }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Always show EN + locale language
  const availableLangs = ['en'];
  if (localeLang !== 'en' && AVAILABLE_LANGUAGES[localeLang]) {
    availableLangs.unshift(localeLang);
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
      >
        <span className="text-lg">{AVAILABLE_LANGUAGES[currentLang]?.flag}</span>
        <span className="text-sm font-medium hidden sm:inline">{AVAILABLE_LANGUAGES[currentLang]?.name}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-xl z-50 min-w-[140px]">
          {availableLangs.map((langCode) => (
            <button
              key={langCode}
              onClick={() => {
                onSwitch(langCode);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-neutral-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                currentLang === langCode ? 'bg-neutral-50' : ''
              }`}
            >
              <span className="text-lg">{AVAILABLE_LANGUAGES[langCode]?.flag}</span>
              <span className="text-sm font-medium">{AVAILABLE_LANGUAGES[langCode]?.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Booking Form Component
function BookingForm({ demoId, bookingMode, lang, style, businessPhone, externalBookingUrl }) {
  const [formData, setFormData] = useState({
    date: '', time: '', name: '', phone: '', email: '', numberOfPeople: 2, notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (externalBookingUrl) {
    const platformName = externalBookingUrl.includes('thefork') ? 'TheFork' :
                         externalBookingUrl.includes('treatwell') ? 'Treatwell' :
                         externalBookingUrl.includes('fresha') ? 'Fresha' :
                         externalBookingUrl.includes('doctolib') ? 'Doctolib' :
                         externalBookingUrl.includes('calendly') ? 'Calendly' : '';
    
    return (
      <div className="text-center py-8">
        <a href={externalBookingUrl} target="_blank" rel="noopener noreferrer"
           className={`inline-flex items-center gap-2 ${style.buttonColor} text-white px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl transition-all`}>
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
        demo_id: demoId, booking_type: bookingMode, date: formData.date, time: formData.time,
        name: formData.name, phone: formData.phone, email: formData.email || null,
        number_of_people: bookingMode === 'table' ? formData.numberOfPeople : null, notes: formData.notes || null
      });
      setSubmitted(true);
      toast.success(t('booking.bookingSuccess', lang));
    } catch (error) {
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
        <p className="text-xl font-bold text-green-700">{t('booking.bookingSuccess', lang)}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="overflow-hidden">
          <label className="block text-sm font-medium text-neutral-700 mb-1">{t('booking.selectDate', lang)}</label>
          <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})}
                 min={new Date().toISOString().split('T')[0]}
                 className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white" />
        </div>
        <div className="overflow-hidden">
          <label className="block text-sm font-medium text-neutral-700 mb-1">{t('booking.selectTime', lang)}</label>
          <input type="time" required value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})}
                 className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white" />
        </div>
      </div>
      
      {bookingMode === 'table' && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">{t('booking.numberOfPeople', lang)}</label>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setFormData({...formData, numberOfPeople: Math.max(1, formData.numberOfPeople - 1)})}
                    className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center hover:bg-neutral-200 text-lg font-bold">-</button>
            <span className="text-xl font-bold">{formData.numberOfPeople} {formData.numberOfPeople === 1 ? t('booking.person', lang) : t('booking.people', lang)}</span>
            <button type="button" onClick={() => setFormData({...formData, numberOfPeople: formData.numberOfPeople + 1})}
                    className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center hover:bg-neutral-200 text-lg font-bold">+</button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">{t('booking.yourName', lang)}</label>
        <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
               className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">{t('booking.yourPhone', lang)}</label>
        <input type="tel" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
               className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>

      <button type="submit" disabled={submitting}
              className={`w-full ${style.buttonColor} text-white px-6 py-4 rounded-full font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50`}>
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
  const [currentLang, setCurrentLang] = useState(null);

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
      // Set initial language from business data
      const bd = response.data.business_data || {};
      const localeLang = bd.site_language || getLanguageFromCountry(bd.country) || 'it';
      setCurrentLang(localeLang);
    } catch (error) {
      console.error('Error loading demo:', error);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!demo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <h1 className="text-2xl font-bold text-neutral-800">Demo not found</h1>
      </div>
    );
  }

  const business = demo.business_data || {};
  const content = demo.content || {};
  const photos = business.photos || [];
  const reviews = filterReviews(business.reviews);
  
  // Locale language (from country)
  const localeLang = business.site_language || getLanguageFromCountry(business.country) || 'it';
  const lang = currentLang || localeLang;
  
  // Localized hours
  const localizedHours = localizeHours(business.hours_text, lang);
  
  // Booking
  const bookingMode = business.booking_mode || 'none';
  const externalBookingUrl = business.external_booking_url;
  
  const style = getStyleFromPlaceId(business.place_id);
  
  const heroPhoto = photos.length > 0 ? photos[0].url : null;
  const galleryPhotos = photos.slice(1, 13);
  
  const lightboxSlides = galleryPhotos.map(photo => ({ src: photo.url, alt: business.name }));

  const isFoodBusiness = business.primary_type && ['restaurant', 'bar', 'cafe', 'pizza_restaurant'].includes(business.primary_type);
  const hasMenu = content.menu_categories && content.menu_categories.length > 0;

  // Phone formatting
  const formattedPhone = formatPhoneWithPrefix(business.phone, business.country);
  const hasMobile = isMobilePhone(business.phone, business.country);
  
  // WhatsApp link - only show if: 1) explicit whatsapp_number is set, OR 2) phone is mobile
  const whatsappMessage = t('whatsapp.message', lang);
  const hasWhatsApp = business.whatsapp_number || hasMobile;
  const whatsappLink = hasWhatsApp ? getWhatsAppLink(business.phone, whatsappMessage, business.whatsapp_number) : null;
  
  // Social media availability
  const hasSocialMedia = business.instagram_url || business.facebook_url || business.tiktok_url;

  return (
    <>
      {/* SEO Meta Tags */}
      <title>{demo.business_name} | {business.category}</title>
      
      <div className="min-h-screen bg-white font-sans">
        {/* Navigation - WHITE LABEL (no Emergent branding) */}
        <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold truncate max-w-[200px] sm:max-w-none">{demo.business_name}</h2>
              
              {/* Desktop Menu */}
              <div className="hidden lg:flex items-center gap-4 xl:gap-6">
                <button onClick={() => scrollToSection('about')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors text-sm">
                  {t('nav.about', lang)}
                </button>
                {(hasMenu || (content.services && content.services.length > 0)) && (
                  <button onClick={() => scrollToSection('services')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors text-sm">
                    {isFoodBusiness ? t('nav.menu', lang) : t('nav.services', lang)}
                  </button>
                )}
                {galleryPhotos.length > 0 && (
                  <button onClick={() => scrollToSection('gallery')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors text-sm">
                    {t('nav.gallery', lang)}
                  </button>
                )}
                {reviews.length > 0 && (
                  <button onClick={() => scrollToSection('reviews')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors text-sm">
                    {t('nav.reviews', lang)}
                  </button>
                )}
                <button onClick={() => scrollToSection('contact')} className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors text-sm">
                  {t('nav.contact', lang)}
                </button>
                
                {/* Language Switcher */}
                <LanguageSwitcher 
                  currentLang={lang} 
                  localeLang={localeLang} 
                  onSwitch={setCurrentLang} 
                  style={style} 
                />
              </div>

              {/* Mobile: Language + Menu */}
              <div className="flex items-center gap-2 lg:hidden">
                <LanguageSwitcher currentLang={lang} localeLang={localeLang} onSwitch={setCurrentLang} style={style} />
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-neutral-700">
                  {mobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="lg:hidden mt-4 pb-4 space-y-1 border-t border-neutral-100 pt-4">
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
                <button onClick={() => scrollToSection('contact')} className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded">
                  {t('nav.contact', lang)}
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Hero Section - Clean modern style */}
        <header className="relative bg-white overflow-hidden">
          {heroPhoto ? (
            <>
              {/* Full width image with subtle gradient overlay at bottom only */}
              <div className="relative h-[50vh] md:h-[60vh]">
                <img src={heroPhoto} alt={demo.business_name} className="w-full h-full object-cover" loading="eager" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
              </div>
              {/* Content overlaid at bottom */}
              <div className="absolute bottom-0 left-0 right-0 z-10 py-8 sm:py-12 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto text-white">
                  {demo.logo_base64 && (
                    <img src={`data:image/png;base64,${demo.logo_base64}`} alt={demo.business_name}
                         className="w-16 h-16 sm:w-20 sm:h-20 mb-4 bg-white rounded-xl p-2 shadow-2xl object-contain" />
                  )}
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 tracking-tight drop-shadow-lg">
                    {demo.business_name}
                  </h1>
                  <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl drop-shadow">
                    {content.homepage_subtitle || `${business.category} ${t('misc.trustBusiness', lang)}`}
                  </p>
                  
                  {/* CTA Buttons */}
                  <div className="flex flex-wrap gap-3">
                    {/* WhatsApp - only if mobile or whatsapp_number set */}
                    {whatsappLink && (
                      <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 sm:px-8 py-3 rounded-full font-semibold hover:shadow-2xl transition-all transform hover:scale-105 text-sm sm:text-base">
                        <MessageCircle size={20} />
                        {t('whatsapp.buttonShort', lang)}
                      </a>
                    )}
                    {/* Call button - always show if phone exists */}
                    {business.phone && (
                      <a href={`tel:${business.phone}`}
                         className="inline-flex items-center gap-2 bg-white text-neutral-900 px-5 sm:px-8 py-3 rounded-full font-semibold hover:shadow-2xl transition-all transform hover:scale-105 text-sm sm:text-base">
                        <Phone size={20} />
                        {t('hero.callNow', lang)}
                      </a>
                    )}
                    {/* Google Maps */}
                    {business.google_maps_link && (
                      <a href={business.google_maps_link} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-5 sm:px-8 py-3 rounded-full font-semibold hover:bg-white/30 transition-all text-sm sm:text-base">
                        <MapPin size={20} />
                        {t('hero.directions', lang)}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Fallback gradient hero when no photo */
            <div className={`bg-gradient-to-br ${style.primaryColor} text-white py-16 sm:py-20 md:py-28 px-4 sm:px-6`}>
              <div className="max-w-6xl mx-auto">
                {demo.logo_base64 && (
                  <img src={`data:image/png;base64,${demo.logo_base64}`} alt={demo.business_name}
                       className="w-20 h-20 sm:w-24 sm:h-24 mb-4 bg-white rounded-xl p-3 shadow-2xl object-contain" />
                )}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 tracking-tight">
                  {demo.business_name}
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-6 max-w-2xl">
                  {content.homepage_subtitle || `${business.category} ${t('misc.trustBusiness', lang)}`}
                </p>
                
                <div className="flex flex-wrap gap-3">
                  {whatsappLink && (
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 sm:px-8 py-3 rounded-full font-semibold hover:shadow-2xl transition-all transform hover:scale-105 text-sm sm:text-base">
                      <MessageCircle size={20} />
                      {t('whatsapp.buttonShort', lang)}
                    </a>
                  )}
                  {business.phone && (
                    <a href={`tel:${business.phone}`}
                       className="inline-flex items-center gap-2 bg-white text-neutral-900 px-5 sm:px-8 py-3 rounded-full font-semibold hover:shadow-2xl transition-all transform hover:scale-105 text-sm sm:text-base">
                      <Phone size={20} />
                      {t('hero.callNow', lang)}
                    </a>
                  )}
                  {business.google_maps_link && (
                    <a href={business.google_maps_link} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-5 sm:px-8 py-3 rounded-full font-semibold hover:bg-white/30 transition-all text-sm sm:text-base">
                      <MapPin size={20} />
                      {t('hero.directions', lang)}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Quick Info Bar */}
        <div className={`${style.cardBg} py-5 sm:py-6 md:py-8 px-4 sm:px-6 border-b border-neutral-200`}>
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {business.address && (
              <div className="flex items-start gap-3">
                <MapPin size={22} className="text-neutral-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-neutral-500 font-medium">{t('info.address', lang)}</p>
                  <p className="font-medium text-neutral-800 text-sm sm:text-base">{business.address}</p>
                </div>
              </div>
            )}
            {business.phone && (
              <div className="flex items-start gap-3">
                <Phone size={22} className="text-neutral-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-neutral-500 font-medium">{t('info.phone', lang)}</p>
                  <a href={`tel:${business.phone}`} className="font-medium text-neutral-800 hover:underline text-sm sm:text-base">{formattedPhone}</a>
                </div>
              </div>
            )}
            {business.rating > 0 && (
              <div className="flex items-start gap-3">
                <Star size={22} className="text-yellow-500 mt-0.5 flex-shrink-0 fill-yellow-500" />
                <div>
                  <p className="text-xs sm:text-sm text-neutral-500 font-medium">{t('info.rating', lang)}</p>
                  <p className="font-medium text-neutral-800 text-sm sm:text-base">{business.rating} ({business.reviews_count || 0} {t('info.reviews', lang)})</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 md:py-16 space-y-12 sm:space-y-16 md:space-y-20">
          
          {/* About Section */}
          {content.about_text && (
            <section id="about">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 tracking-tight">{t('sections.aboutTitle', lang)}</h2>
              <p className="text-base sm:text-lg md:text-xl text-neutral-700 leading-relaxed max-w-4xl">{content.about_text}</p>
            </section>
          )}

          {/* Menu (for restaurants) */}
          {hasMenu && (
            <section id="services">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 tracking-tight">{t('sections.menuTitle', lang)}</h2>
              <div className="space-y-6 sm:space-y-8">
                {content.menu_categories.map((category, idx) => (
                  <div key={idx} className={`p-5 sm:p-6 md:p-8 ${style.cardBg} rounded-xl sm:rounded-2xl border-2 border-neutral-100`}>
                    <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{category.name}</h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {category.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-center gap-2 text-neutral-700 text-sm sm:text-base">
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-neutral-400 rounded-full flex-shrink-0"></span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Services (for non-restaurants) */}
          {!hasMenu && content.services && content.services.length > 0 && (
            <section id="services">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 tracking-tight">{t('sections.servicesTitle', lang)}</h2>
              {content.services_intro && (
                <p className="text-base sm:text-lg text-neutral-700 mb-6 sm:mb-8 max-w-3xl">{content.services_intro}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {content.services.map((service, index) => (
                  <div key={index} className={`p-5 sm:p-6 ${style.cardBg} rounded-xl sm:rounded-2xl border-2 border-transparent hover:border-neutral-200 hover:shadow-lg transition-all`}>
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 ${style.accentColor} rounded-lg flex items-center justify-center text-white font-bold text-lg sm:text-xl mb-3 sm:mb-4`}>
                      {index + 1}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold mb-2">{service}</h3>
                    <p className="text-neutral-600 text-sm sm:text-base">{getServiceDescription(service, lang)}</p>
                    
                    {/* WhatsApp CTA for each service */}
                    {whatsappLink && (
                      <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                         className={`inline-flex items-center gap-2 mt-4 ${style.textAccent} font-medium text-sm hover:underline`}>
                        <MessageCircle size={16} />
                        {t('hero.writeUs', lang)}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gallery */}
          {galleryPhotos.length > 0 && (
            <section id="gallery">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 tracking-tight">{t('sections.galleryTitle', lang)}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {galleryPhotos.map((photo, index) => (
                  <button key={index} onClick={() => handleOpenLightbox(index)}
                          className="aspect-square bg-neutral-200 rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer group">
                    <img src={photo.url} alt={`${t('sections.galleryTitle', lang)} ${index + 1}`}
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </button>
                ))}
              </div>
              <Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)} slides={lightboxSlides} index={lightboxIndex} plugins={[Zoom]} />
            </section>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <section id="reviews">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{t('sections.reviewsTitle', lang)}</h2>
                {business.google_maps_link && (
                  <a href={business.google_maps_link} target="_blank" rel="noopener noreferrer"
                     className={`${style.textAccent} hover:underline text-sm font-medium flex items-center gap-1`}>
                    {t('buttons.allReviews', lang)} <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {reviews.slice(0, 6).map((review, index) => (
                  <div key={index} className="p-5 sm:p-6 bg-white border-2 border-neutral-100 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-200'} />
                      ))}
                    </div>
                    <p className="text-neutral-700 mb-3 leading-relaxed line-clamp-4 text-sm sm:text-base">"{review.text}"</p>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-semibold text-neutral-800">{review.author}</span>
                      <span className="text-neutral-400">{review.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Hours */}
          {localizedHours.length > 0 && (
            <section id="hours">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 tracking-tight">{t('sections.hoursTitle', lang)}</h2>
              <div className={`${style.cardBg} p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border-2 border-neutral-100`}>
                <div className="flex items-start gap-3 sm:gap-4">
                  <Clock size={28} className={style.textAccent} />
                  <div className="space-y-1 sm:space-y-2 text-sm sm:text-base md:text-lg">
                    {localizedHours.map((day, index) => (
                      <p key={index} className="text-neutral-700">{day}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Booking Section */}
          {bookingMode !== 'none' && (
            <section id="booking">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 tracking-tight">
                {bookingMode === 'table' ? t('sections.bookTableTitle', lang) : t('sections.bookAppointmentTitle', lang)}
              </h2>
              <div className={`${style.cardBg} p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border-2 border-neutral-100 overflow-hidden`}>
                <BookingForm demoId={demoId} bookingMode={bookingMode} lang={lang} style={style}
                             businessPhone={business.phone} externalBookingUrl={externalBookingUrl} />
              </div>
            </section>
          )}

          {/* Map */}
          {business.location && (
            <section id="location">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 tracking-tight">{t('sections.locationTitle', lang)}</h2>
              <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border-2 border-neutral-200">
                <iframe src={`https://www.google.com/maps?q=${business.location.lat},${business.location.lng}&output=embed`}
                        width="100%" height="350" style={{ border: 0 }} allowFullScreen="" loading="lazy" title="Map" className="sm:h-[400px] md:h-[450px]" />
              </div>
              {business.google_maps_link && (
                <div className="text-center mt-4 sm:mt-6">
                  <a href={business.google_maps_link} target="_blank" rel="noopener noreferrer"
                     className={`inline-flex items-center gap-2 ${style.buttonColor} text-white px-5 sm:px-8 py-3 sm:py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base`}>
                    <MapPin size={20} />
                    {t('buttons.openGoogleMaps', lang)}
                  </a>
                </div>
              )}
            </section>
          )}

          {/* Contact Section */}
          <section id="contact">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 tracking-tight">{t('sections.contactTitle', lang)}</h2>
            <div className={`bg-gradient-to-br ${style.primaryColor} p-6 sm:p-8 md:p-10 rounded-xl sm:rounded-2xl text-white shadow-xl`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{t('footer.contact', lang)}</h3>
                  <div className="space-y-3 sm:space-y-4">
                    {business.address && (
                      <div className="flex items-start gap-3">
                        <MapPin size={22} className="mt-0.5 flex-shrink-0 opacity-80" />
                        <p className="text-base sm:text-lg">{business.address}</p>
                      </div>
                    )}
                    {business.phone && (
                      <div className="flex items-start gap-3">
                        <Phone size={22} className="mt-0.5 flex-shrink-0 opacity-80" />
                        <a href={`tel:${business.phone}`} className="text-base sm:text-lg hover:underline">{formattedPhone}</a>
                      </div>
                    )}
                    {business.email && (
                      <div className="flex items-start gap-3">
                        <Mail size={22} className="mt-0.5 flex-shrink-0 opacity-80" />
                        <a href={`mailto:${business.email}`} className="text-base sm:text-lg hover:underline">{business.email}</a>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* CTA in Contact - WhatsApp or Call */}
                <div className="flex flex-col justify-center">
                  {whatsappLink ? (
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white px-6 sm:px-8 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg hover:shadow-2xl transition-all">
                      <MessageCircle size={24} />
                      {t('whatsapp.buttonText', lang)}
                    </a>
                  ) : business.phone && (
                    <a href={`tel:${business.phone}`}
                       className="inline-flex items-center justify-center gap-3 bg-white/20 hover:bg-white/30 text-white px-6 sm:px-8 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg hover:shadow-2xl transition-all">
                      <Phone size={24} />
                      {t('hero.callNow', lang)}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Social Media Section - SEMPRE visibile con Instagram e Facebook come base */}
          <section id="social" className="text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 tracking-tight">{t('sections.socialTitle', lang)}</h2>
            <p className="text-neutral-600 mb-6 sm:mb-8 text-base sm:text-lg">
              {lang === 'it' && 'Resta aggiornato sulle nostre novità!'}
              {lang === 'fr' && 'Restez informé de nos actualités!'}
              {lang === 'en' && 'Stay updated with our latest news!'}
              {lang === 'es' && '¡Mantente al día con nuestras novedades!'}
              {lang === 'de' && 'Bleiben Sie über unsere Neuigkeiten informiert!'}
            </p>
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              {/* Instagram - SEMPRE visibile */}
              <a href={business.instagram_url || '#'} 
                 target={business.instagram_url ? "_blank" : "_self"} 
                 rel="noopener noreferrer"
                 onClick={(e) => !business.instagram_url && e.preventDefault()}
                 className={`group flex flex-col items-center gap-2 p-4 sm:p-6 ${style.cardBg} rounded-xl sm:rounded-2xl transition-all ${business.instagram_url ? 'hover:shadow-lg hover:scale-105' : 'opacity-60 cursor-default'}`}
                 title="Instagram">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg ${business.instagram_url ? 'group-hover:shadow-xl' : ''} transition-all`}>
                  <Instagram size={28} className="sm:w-8 sm:h-8" />
                </div>
                <span className="text-sm sm:text-base font-medium text-neutral-700">Instagram</span>
              </a>
              
              {/* Facebook - SEMPRE visibile */}
              <a href={business.facebook_url || '#'} 
                 target={business.facebook_url ? "_blank" : "_self"} 
                 rel="noopener noreferrer"
                 onClick={(e) => !business.facebook_url && e.preventDefault()}
                 className={`group flex flex-col items-center gap-2 p-4 sm:p-6 ${style.cardBg} rounded-xl sm:rounded-2xl transition-all ${business.facebook_url ? 'hover:shadow-lg hover:scale-105' : 'opacity-60 cursor-default'}`}
                 title="Facebook">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg ${business.facebook_url ? 'group-hover:shadow-xl' : ''} transition-all`}>
                  <Facebook size={28} className="sm:w-8 sm:h-8" />
                </div>
                <span className="text-sm sm:text-base font-medium text-neutral-700">Facebook</span>
              </a>
              
              {/* TikTok - Solo se configurato */}
              {business.tiktok_url && (
                <a href={business.tiktok_url} target="_blank" rel="noopener noreferrer"
                   className={`group flex flex-col items-center gap-2 p-4 sm:p-6 ${style.cardBg} rounded-xl sm:rounded-2xl hover:shadow-lg transition-all hover:scale-105`}
                   title="TikTok">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-black rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-all`}>
                    <TikTokIcon size={28} className="sm:w-8 sm:h-8" />
                  </div>
                  <span className="text-sm sm:text-base font-medium text-neutral-700">TikTok</span>
                </a>
              )}
            </div>
          </section>

          {/* Final CTA */}
          <section className={`text-center py-10 sm:py-12 md:py-14 bg-gradient-to-br ${style.primaryColor} rounded-xl sm:rounded-2xl text-white shadow-xl`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 px-4">
              {content.cta_text || t('cta.contactToday', lang)}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-white/80 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              {isFoodBusiness ? t('cta.comeVisitUs', lang) : `${business.name} ${t('cta.atYourService', lang)}`}
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 px-4">
              {whatsappLink ? (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-lg hover:shadow-2xl transition-all">
                  <MessageCircle size={22} />
                  WhatsApp
                </a>
              ) : business.phone && (
                <a href={`tel:${business.phone}`}
                   className="inline-flex items-center gap-2 bg-white text-neutral-900 px-6 sm:px-10 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-lg hover:shadow-2xl transition-all">
                  <Phone size={22} />
                  {t('hero.callNow', lang)}
                </a>
              )}
              {business.google_maps_link && (
                <a href={business.google_maps_link} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 sm:px-10 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-lg hover:bg-white/30 transition-all">
                  <MapPin size={22} />
                  {t('buttons.howToArrive', lang)}
                </a>
              )}
            </div>
          </section>
        </div>

        {/* Footer - WHITE LABEL (no Emergent branding) */}
        <footer className="bg-neutral-900 text-white py-8 sm:py-10 md:py-12 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
              <div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">{demo.business_name}</h3>
                <p className="text-neutral-400 text-sm sm:text-base">{business.category} {t('misc.in', lang)} {business.city}</p>
              </div>
              <div>
                <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">{t('footer.contact', lang)}</h4>
                <div className="space-y-1 sm:space-y-2 text-neutral-400 text-xs sm:text-sm">
                  {business.phone && <p>{formattedPhone}</p>}
                  {business.address && <p>{business.address}</p>}
                </div>
              </div>
              <div>
                <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">{t('footer.hours', lang)}</h4>
                <div className="space-y-1 text-neutral-400 text-xs sm:text-sm">
                  {localizedHours.map((hour, i) => (
                    <p key={i}>{hour}</p>
                  ))}
                </div>
              </div>
              {/* Social Media in Footer - Always show Instagram/Facebook as base */}
              <div>
                <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">Social</h4>
                <div className="flex items-center gap-3">
                  <a href={business.instagram_url || '#'} 
                     target={business.instagram_url ? "_blank" : "_self"} 
                     rel="noopener noreferrer"
                     className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${business.instagram_url ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 hover:scale-110' : 'bg-neutral-700 opacity-50'}`}
                     title="Instagram">
                    <Instagram size={20} className="text-white" />
                  </a>
                  <a href={business.facebook_url || '#'} 
                     target={business.facebook_url ? "_blank" : "_self"} 
                     rel="noopener noreferrer"
                     className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${business.facebook_url ? 'bg-blue-600 hover:scale-110' : 'bg-neutral-700 opacity-50'}`}
                     title="Facebook">
                    <Facebook size={20} className="text-white" />
                  </a>
                  {business.tiktok_url && (
                    <a href={business.tiktok_url} target="_blank" rel="noopener noreferrer"
                       className="w-10 h-10 bg-black rounded-full flex items-center justify-center transition-all hover:scale-110"
                       title="TikTok">
                      <TikTokIcon size={20} className="text-white" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-neutral-800 pt-6 sm:pt-8 text-center">
              <p className="text-neutral-500 text-xs sm:text-sm">
                © {new Date().getFullYear()} {demo.business_name}. {t('footer.allRightsReserved', lang)}.
              </p>
            </div>
          </div>
        </footer>

        {/* Sticky Bottom Bar Mobile - WhatsApp PRIMARY */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-neutral-200 shadow-2xl safe-area-bottom">
          <div className="grid grid-cols-2 gap-0">
            {whatsappLink ? (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 bg-green-500 text-white py-3.5 sm:py-4 font-bold text-sm">
                <MessageCircle size={18} />
                WhatsApp
              </a>
            ) : business.phone && (
              <a href={`tel:${business.phone}`}
                 className={`flex items-center justify-center gap-2 ${style.buttonColor} text-white py-3.5 sm:py-4 font-bold text-sm`}>
                <Phone size={18} />
                {t('buttons.call', lang)}
              </a>
            )}
            {business.google_maps_link && (
              <a href={business.google_maps_link} target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 bg-neutral-800 text-white py-3.5 sm:py-4 font-bold text-sm">
                <MapPin size={18} />
                {t('hero.directions', lang)}
              </a>
            )}
          </div>
        </div>

        {/* Space for sticky bar */}
        <div className="lg:hidden h-14 sm:h-16"></div>
      </div>
    </>
  );
}

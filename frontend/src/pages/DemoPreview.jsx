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
import { getFontSetForCategory, FONT_SETS } from '@/lib/categoryFonts';
import { cloudinaryEnhance, CLOUDINARY_CONFIGURED } from '@/lib/cloudinary';
import CategoryDecorations from '@/components/CategoryDecorations';
import { getDesignTemplateById } from '@/lib/designTemplates';

// TikTok Icon (not in lucide-react)
const TikTokIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Helper functions for hero customization
const getHeroPosition = (position) => {
  const positions = {
    'center': 'center center',
    'top': 'center top',
    'bottom': 'center bottom',
    'left': 'left center',
    'right': 'right center',
    'top-left': 'left top',
    'top-right': 'right top',
    'bottom-left': 'left bottom',
    'bottom-right': 'right bottom'
  };
  return positions[position] || 'center center';
};

const getHeroOverlay = (overlay) => {
  const overlays = {
    'none': 'transparent',
    'light': 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
    'medium': 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
    'dark': 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)',
    'gradient': 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)'
  };
  return overlays[overlay] || overlays['medium'];
};

// Language config
const AVAILABLE_LANGUAGES = {
  it: { name: 'Italiano', flag: '🇮🇹' },
  fr: { name: 'Français', flag: '🇫🇷' },
  en: { name: 'English', flag: '🇬🇧' },
  es: { name: 'Español', flag: '🇪🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' }
};

// Ordine sezioni default (interne al contenitore principale)
const DEFAULT_SECTION_ORDER = ['about', 'services', 'whyus', 'gallery', 'reviews', 'hours', 'booking', 'faq', 'location', 'contact', 'social'];

const getOrderMap = (customOrder) => {
  const map = {};
  // Prima applico ordine custom (se valido)
  const seen = new Set();
  if (Array.isArray(customOrder)) {
    customOrder.forEach((id, idx) => {
      if (DEFAULT_SECTION_ORDER.includes(id) && !seen.has(id)) {
        map[id] = idx;
        seen.add(id);
      }
    });
  }
  // Poi accodo le sezioni non incluse mantenendo l'ordine di default
  let nextIdx = seen.size;
  DEFAULT_SECTION_ORDER.forEach((id) => {
    if (!(id in map)) {
      map[id] = nextIdx++;
    }
  });
  return map;
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

// Sort reviews by recency (most recent first)
const sortReviewsByRecency = (reviews) => {
  if (!reviews || reviews.length === 0) return [];
  
  const timeOrder = {
    'un giorno fa': 1, 'a day ago': 1, 'hace un día': 1, 'il y a un jour': 1,
    'una settimana fa': 7, 'a week ago': 7, 'hace una semana': 7, 'il y a une semaine': 7,
    '2 settimane fa': 14, '2 weeks ago': 14, 'hace 2 semanas': 14, 'il y a 2 semaines': 14,
    'un mese fa': 30, 'a month ago': 30, 'hace un mes': 30, 'il y a un mois': 30,
    '2 mesi fa': 60, '2 months ago': 60, 'hace 2 meses': 60, 'il y a 2 mois': 60,
    '3 mesi fa': 90, '3 months ago': 90, 'hace 3 meses': 90, 'il y a 3 mois': 90,
    '6 mesi fa': 180, '6 months ago': 180, 'hace 6 meses': 180, 'il y a 6 mois': 180,
    'un anno fa': 365, 'a year ago': 365, 'hace un año': 365, 'il y a un an': 365
  };
  
  return [...reviews].sort((a, b) => {
    const timeA = a.time?.toLowerCase() || '';
    const timeB = b.time?.toLowerCase() || '';
    
    let daysA = 999;
    let daysB = 999;
    
    for (const [key, days] of Object.entries(timeOrder)) {
      if (timeA.includes(key.toLowerCase())) daysA = days;
      if (timeB.includes(key.toLowerCase())) daysB = days;
    }
    
    // Extract number from time string (e.g., "6 months ago" -> 6)
    const numA = parseInt(timeA.match(/\d+/)?.[0] || '1');
    const numB = parseInt(timeB.match(/\d+/)?.[0] || '1');
    
    if (timeA.includes('month') || timeA.includes('mese') || timeA.includes('mois')) daysA = numA * 30;
    if (timeB.includes('month') || timeB.includes('mese') || timeB.includes('mois')) daysB = numB * 30;
    if (timeA.includes('week') || timeA.includes('settiman') || timeA.includes('semaine')) daysA = numA * 7;
    if (timeB.includes('week') || timeB.includes('settiman') || timeB.includes('semaine')) daysB = numB * 7;
    if (timeA.includes('year') || timeA.includes('anno') || timeA.includes('an')) daysA = numA * 365;
    if (timeB.includes('year') || timeB.includes('anno') || timeB.includes('an')) daysB = numB * 365;
    
    return daysA - daysB;
  });
};

// Translate review time to target language
const translateReviewTime = (time, lang) => {
  if (!time) return '';
  
  const translations = {
    it: {
      'a day ago': 'un giorno fa', 'a week ago': 'una settimana fa', 'a month ago': 'un mese fa', 'a year ago': 'un anno fa',
      'days ago': 'giorni fa', 'weeks ago': 'settimane fa', 'months ago': 'mesi fa', 'years ago': 'anni fa'
    },
    fr: {
      'a day ago': 'il y a un jour', 'a week ago': 'il y a une semaine', 'a month ago': 'il y a un mois', 'a year ago': 'il y a un an',
      'days ago': 'jours', 'weeks ago': 'semaines', 'months ago': 'mois', 'years ago': 'ans'
    },
    es: {
      'a day ago': 'hace un día', 'a week ago': 'hace una semana', 'a month ago': 'hace un mes', 'a year ago': 'hace un año',
      'days ago': 'días', 'weeks ago': 'semanas', 'months ago': 'meses', 'years ago': 'años'
    },
    de: {
      'a day ago': 'vor einem Tag', 'a week ago': 'vor einer Woche', 'a month ago': 'vor einem Monat', 'a year ago': 'vor einem Jahr',
      'days ago': 'Tagen', 'weeks ago': 'Wochen', 'months ago': 'Monaten', 'years ago': 'Jahren'
    }
  };
  
  if (lang === 'en' || !translations[lang]) return time;
  
  let translated = time;
  for (const [en, local] of Object.entries(translations[lang])) {
    translated = translated.replace(new RegExp(en, 'gi'), local);
  }
  return translated;
};

// Style variants - can be overridden by color_scheme
const STYLE_VARIANTS = [
  { id: 'modern-blue', primaryColor: 'from-blue-600 to-blue-800', accentColor: 'bg-blue-600', buttonColor: 'bg-blue-600 hover:bg-blue-700', cardBg: 'bg-blue-50', textAccent: 'text-blue-600' },
  { id: 'elegant-purple', primaryColor: 'from-purple-600 to-purple-800', accentColor: 'bg-purple-600', buttonColor: 'bg-purple-600 hover:bg-purple-700', cardBg: 'bg-purple-50', textAccent: 'text-purple-600' },
  { id: 'fresh-green', primaryColor: 'from-green-600 to-green-800', accentColor: 'bg-green-600', buttonColor: 'bg-green-600 hover:bg-green-700', cardBg: 'bg-green-50', textAccent: 'text-green-600' },
  { id: 'warm-orange', primaryColor: 'from-orange-600 to-orange-800', accentColor: 'bg-orange-600', buttonColor: 'bg-orange-600 hover:bg-orange-700', cardBg: 'bg-orange-50', textAccent: 'text-orange-600' },
  { id: 'professional-slate', primaryColor: 'from-slate-700 to-slate-900', accentColor: 'bg-slate-700', buttonColor: 'bg-slate-700 hover:bg-slate-800', cardBg: 'bg-slate-50', textAccent: 'text-slate-700' }
];

// Color scheme map - for user-selected colors (27 vivid colors matching SiteEditor)
const COLOR_SCHEME_MAP = {
  // Cool blues
  'blue':     { primaryColor: 'from-blue-600 to-blue-800',       accentColor: 'bg-blue-600',     buttonColor: 'bg-blue-600 hover:bg-blue-700',       cardBg: 'bg-blue-50',     textAccent: 'text-blue-600' },
  'sky':      { primaryColor: 'from-sky-500 to-sky-700',         accentColor: 'bg-sky-500',      buttonColor: 'bg-sky-500 hover:bg-sky-600',        cardBg: 'bg-sky-50',      textAccent: 'text-sky-600' },
  'cyan':     { primaryColor: 'from-cyan-500 to-cyan-700',       accentColor: 'bg-cyan-500',     buttonColor: 'bg-cyan-500 hover:bg-cyan-600',      cardBg: 'bg-cyan-50',     textAccent: 'text-cyan-600' },
  'indigo':   { primaryColor: 'from-indigo-600 to-indigo-800',   accentColor: 'bg-indigo-600',   buttonColor: 'bg-indigo-600 hover:bg-indigo-700',  cardBg: 'bg-indigo-50',   textAccent: 'text-indigo-600' },
  // Purple / pink
  'purple':   { primaryColor: 'from-purple-600 to-purple-800',   accentColor: 'bg-purple-600',   buttonColor: 'bg-purple-600 hover:bg-purple-700',  cardBg: 'bg-purple-50',   textAccent: 'text-purple-600' },
  'violet':   { primaryColor: 'from-violet-600 to-violet-800',   accentColor: 'bg-violet-600',   buttonColor: 'bg-violet-600 hover:bg-violet-700',  cardBg: 'bg-violet-50',   textAccent: 'text-violet-600' },
  'fuchsia':  { primaryColor: 'from-fuchsia-600 to-fuchsia-800', accentColor: 'bg-fuchsia-600',  buttonColor: 'bg-fuchsia-600 hover:bg-fuchsia-700', cardBg: 'bg-fuchsia-50', textAccent: 'text-fuchsia-600' },
  'pink':     { primaryColor: 'from-pink-600 to-pink-800',       accentColor: 'bg-pink-600',     buttonColor: 'bg-pink-600 hover:bg-pink-700',      cardBg: 'bg-pink-50',     textAccent: 'text-pink-600' },
  'rose':     { primaryColor: 'from-rose-600 to-rose-800',       accentColor: 'bg-rose-600',     buttonColor: 'bg-rose-600 hover:bg-rose-700',      cardBg: 'bg-rose-50',     textAccent: 'text-rose-600' },
  // Warm
  'red':      { primaryColor: 'from-red-600 to-red-800',         accentColor: 'bg-red-600',      buttonColor: 'bg-red-600 hover:bg-red-700',        cardBg: 'bg-red-50',      textAccent: 'text-red-600' },
  'orange':   { primaryColor: 'from-orange-600 to-orange-800',   accentColor: 'bg-orange-600',   buttonColor: 'bg-orange-600 hover:bg-orange-700',  cardBg: 'bg-orange-50',   textAccent: 'text-orange-600' },
  'amber':    { primaryColor: 'from-amber-600 to-amber-800',     accentColor: 'bg-amber-600',    buttonColor: 'bg-amber-600 hover:bg-amber-700',    cardBg: 'bg-amber-50',    textAccent: 'text-amber-600' },
  'yellow':   { primaryColor: 'from-yellow-500 to-yellow-700',   accentColor: 'bg-yellow-500',   buttonColor: 'bg-yellow-500 hover:bg-yellow-600',  cardBg: 'bg-yellow-50',   textAccent: 'text-yellow-600' },
  // Greens
  'lime':     { primaryColor: 'from-lime-500 to-lime-700',       accentColor: 'bg-lime-500',     buttonColor: 'bg-lime-500 hover:bg-lime-600',      cardBg: 'bg-lime-50',     textAccent: 'text-lime-600' },
  'green':    { primaryColor: 'from-green-600 to-green-800',     accentColor: 'bg-green-600',    buttonColor: 'bg-green-600 hover:bg-green-700',    cardBg: 'bg-green-50',    textAccent: 'text-green-600' },
  'emerald':  { primaryColor: 'from-emerald-600 to-emerald-800', accentColor: 'bg-emerald-600',  buttonColor: 'bg-emerald-600 hover:bg-emerald-700', cardBg: 'bg-emerald-50', textAccent: 'text-emerald-600' },
  'teal':     { primaryColor: 'from-teal-600 to-teal-800',       accentColor: 'bg-teal-600',     buttonColor: 'bg-teal-600 hover:bg-teal-700',      cardBg: 'bg-teal-50',     textAccent: 'text-teal-600' },
  // Pastels / accents
  'gold':     { primaryColor: 'from-amber-400 to-amber-600',     accentColor: 'bg-amber-400',    buttonColor: 'bg-amber-400 hover:bg-amber-500',    cardBg: 'bg-amber-50',    textAccent: 'text-amber-500' },
  'coral':    { primaryColor: 'from-rose-400 to-rose-600',       accentColor: 'bg-rose-400',     buttonColor: 'bg-rose-400 hover:bg-rose-500',      cardBg: 'bg-rose-50',     textAccent: 'text-rose-500' },
  'mint':     { primaryColor: 'from-emerald-400 to-emerald-600', accentColor: 'bg-emerald-400',  buttonColor: 'bg-emerald-400 hover:bg-emerald-500', cardBg: 'bg-emerald-50', textAccent: 'text-emerald-500' },
  'lavender': { primaryColor: 'from-violet-400 to-violet-600',   accentColor: 'bg-violet-400',   buttonColor: 'bg-violet-400 hover:bg-violet-500',  cardBg: 'bg-violet-50',   textAccent: 'text-violet-500' },
  'peach':    { primaryColor: 'from-orange-400 to-orange-600',   accentColor: 'bg-orange-400',   buttonColor: 'bg-orange-400 hover:bg-orange-500',  cardBg: 'bg-orange-50',   textAccent: 'text-orange-500' },
  // Dark / classy
  'slate':    { primaryColor: 'from-slate-700 to-slate-900',     accentColor: 'bg-slate-700',    buttonColor: 'bg-slate-700 hover:bg-slate-800',    cardBg: 'bg-slate-50',    textAccent: 'text-slate-700' },
  'navy':     { primaryColor: 'from-blue-800 to-blue-950',       accentColor: 'bg-blue-800',     buttonColor: 'bg-blue-800 hover:bg-blue-900',      cardBg: 'bg-blue-50',     textAccent: 'text-blue-800' },
  'maroon':   { primaryColor: 'from-rose-700 to-rose-900',       accentColor: 'bg-rose-700',     buttonColor: 'bg-rose-700 hover:bg-rose-800',      cardBg: 'bg-rose-50',     textAccent: 'text-rose-700' },
  'forest':   { primaryColor: 'from-green-700 to-green-900',     accentColor: 'bg-green-700',    buttonColor: 'bg-green-700 hover:bg-green-800',    cardBg: 'bg-green-50',    textAccent: 'text-green-700' },
  'black':    { primaryColor: 'from-neutral-800 to-neutral-950', accentColor: 'bg-neutral-900',  buttonColor: 'bg-neutral-900 hover:bg-black',      cardBg: 'bg-neutral-100', textAccent: 'text-neutral-900' },
  // === SFUMATURE DOPPIE (gradient) — il primaryColor è già un gradient a 2 colori; accent/button restano solid sul colore dominante ===
  'sunset':      { primaryColor: 'from-orange-500 to-pink-500',     accentColor: 'bg-orange-500',  buttonColor: 'bg-orange-500 hover:bg-orange-600',  cardBg: 'bg-orange-50',   textAccent: 'text-orange-600' },
  'ocean':       { primaryColor: 'from-cyan-500 to-blue-600',       accentColor: 'bg-blue-600',    buttonColor: 'bg-blue-600 hover:bg-blue-700',     cardBg: 'bg-cyan-50',     textAccent: 'text-blue-600' },
  'aurora':      { primaryColor: 'from-purple-500 to-pink-500',     accentColor: 'bg-purple-500',  buttonColor: 'bg-purple-500 hover:bg-purple-600', cardBg: 'bg-purple-50',   textAccent: 'text-purple-600' },
  'forest_grad': { primaryColor: 'from-emerald-500 to-teal-600',    accentColor: 'bg-teal-600',    buttonColor: 'bg-teal-600 hover:bg-teal-700',     cardBg: 'bg-emerald-50',  textAccent: 'text-teal-600' },
  'royal':       { primaryColor: 'from-indigo-600 to-purple-600',   accentColor: 'bg-indigo-600',  buttonColor: 'bg-indigo-600 hover:bg-indigo-700', cardBg: 'bg-indigo-50',   textAccent: 'text-indigo-600' },
  'fire':        { primaryColor: 'from-red-500 to-yellow-500',      accentColor: 'bg-red-500',     buttonColor: 'bg-red-500 hover:bg-red-600',       cardBg: 'bg-red-50',      textAccent: 'text-red-600' },
  'mint_grad':   { primaryColor: 'from-green-400 to-cyan-500',      accentColor: 'bg-teal-500',    buttonColor: 'bg-teal-500 hover:bg-teal-600',     cardBg: 'bg-teal-50',     textAccent: 'text-teal-600' },
  'berry':       { primaryColor: 'from-fuchsia-500 to-rose-500',    accentColor: 'bg-fuchsia-500', buttonColor: 'bg-fuchsia-500 hover:bg-fuchsia-600', cardBg: 'bg-fuchsia-50', textAccent: 'text-fuchsia-600' },
  'gold_grad':   { primaryColor: 'from-amber-400 to-orange-500',    accentColor: 'bg-amber-500',   buttonColor: 'bg-amber-500 hover:bg-amber-600',   cardBg: 'bg-amber-50',    textAccent: 'text-amber-600' },
  'midnight':    { primaryColor: 'from-slate-800 to-blue-900',      accentColor: 'bg-slate-800',   buttonColor: 'bg-slate-800 hover:bg-slate-900',   cardBg: 'bg-slate-100',   textAccent: 'text-slate-800' }
};

const getStyleFromPlaceId = (placeId, colorScheme = null) => {
  // If color scheme is set, use it
  if (colorScheme && COLOR_SCHEME_MAP[colorScheme]) {
    return COLOR_SCHEME_MAP[colorScheme];
  }
  // Otherwise, derive from place_id
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
        demo_id: demoId, 
        booking_type: bookingMode, 
        date: formData.date, 
        time: formData.time,
        customer_name: formData.name, 
        customer_phone: formData.phone, 
        customer_email: formData.email || '',
        guests: bookingMode === 'table' ? formData.numberOfPeople : 1, 
        notes: formData.notes || ''
      });
      setSubmitted(true);
      toast.success(t('booking.bookingSuccess', lang));
    } catch (error) {
      console.error('Booking error:', error);
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

  // Tracking pixel — fires once per session per demo
  useEffect(() => {
    if (!demo) return;
    try {
      const sessionKey = `wf_sess_${demoId}`;
      let sessionId = sessionStorage.getItem(sessionKey);
      if (!sessionId) {
        sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem(sessionKey, sessionId);
      }
      axios.post(`${API}/demos/${demoId}?action=track`, {
        event_type: 'view',
        session_id: sessionId
      }).catch(() => {});
      window.__wf_session_id = sessionId;

      // Click delegation: intercept WA / tel / booking link clicks
      const handler = (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        let eventType = null;
        if (href.includes('wa.me') || href.includes('whatsapp')) eventType = 'click_whatsapp';
        else if (href.startsWith('tel:')) eventType = 'click_phone';
        else if (href.includes('google.com/maps') || href.startsWith('https://maps')) eventType = 'click_maps';
        if (eventType) {
          axios.post(`${API}/demos/${demoId}?action=track`, {
            event_type: eventType,
            session_id: sessionId
          }).catch(() => {});
        }
      };
      document.addEventListener('click', handler, { capture: true });
      return () => document.removeEventListener('click', handler, { capture: true });
    } catch (e) {
      // ignore
    }
  }, [demo, demoId]);

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
      // Cache-busting: aggiunge timestamp per evitare versione cached dopo modifiche layout/settings
      const cacheBuster = Date.now();
      const response = await axios.get(`${API}/demos/${demoId}?_t=${cacheBuster}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
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
  const sectionOrderMap = getOrderMap(content.section_order);
  const photos = business.photos || [];
  const rawReviews = filterReviews(business.reviews);
  const reviews = sortReviewsByRecency(rawReviews);
  
  // Locale language (from country)
  const localeLang = business.site_language || getLanguageFromCountry(business.country) || 'it';
  const lang = currentLang || localeLang;
  
  // Localized hours
  const localizedHours = localizeHours(business.hours_text, lang);
  
  // Booking
  const bookingMode = business.booking_mode || 'none';
  const externalBookingUrl = business.external_booking_url;
  
  const style = getStyleFromPlaceId(business.place_id, content.color_scheme);
  
  // === DESIGN TEMPLATE (9 stili predefiniti) ===
  const designTemplate = getDesignTemplateById(demo.design_template || content.design_template || 'classic');
  
  // === FONT PER CATEGORIA (Google Fonts dinamici) ===
  // Se il template specifica un font_set, usalo; altrimenti deriva dalla categoria
  const fontSet = designTemplate.font_set && designTemplate.font_set !== 'default'
    ? (FONT_SETS[designTemplate.font_set] || getFontSetForCategory(business.category))
    : getFontSetForCategory(business.category);
  
  // === Use hero_image if set, otherwise first photo ===
  const rawHeroPhoto = content.hero_image || (photos.length > 0 ? photos[0].url : null);
  // Cloudinary auto-enhance per migliorare foto sgranate (sharpen + improve)
  const heroPhoto = rawHeroPhoto ? cloudinaryEnhance(rawHeroPhoto, { width: 1600 }) : null;
  const galleryPhotos = photos.slice(1, 13);
  
  const lightboxSlides = galleryPhotos.map(photo => ({
    src: cloudinaryEnhance(photo.url, { width: 1600 }),
    alt: business.name
  }));

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

      {/* Font Google dinamici per categoria — preconnect + stylesheet */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontSet.href} />

      {/* CSS variabili font + applicazione automatica a tutti h1-h6 della pagina */}
      <style>{`
        :root {
          --wf-font-heading: "${fontSet.heading}", system-ui, -apple-system, sans-serif;
          --wf-font-body: "${fontSet.body}", system-ui, -apple-system, sans-serif;
          --wf-template-gradient: ${designTemplate.cssGradient};
        }
        .wf-demo-root,
        .wf-demo-root p,
        .wf-demo-root span,
        .wf-demo-root a,
        .wf-demo-root button,
        .wf-demo-root li,
        .wf-demo-root input,
        .wf-demo-root textarea { font-family: var(--wf-font-body); }
        .wf-demo-root h1,
        .wf-demo-root h2,
        .wf-demo-root h3,
        .wf-demo-root h4,
        .wf-demo-root h5,
        .wf-demo-root h6 {
          font-family: var(--wf-font-heading);
          letter-spacing: -0.02em;
        }

        /* === Design Template: VIVID MODE — tutte le sezioni colorate === */
        ${designTemplate.vivid_mode ? `
          /* Si applica a TUTTE le sezioni con id (incluso contact, per uniformità) */
          .wf-demo-root section[id] {
            background: var(--wf-template-gradient);
            border-radius: 28px;
            padding: 2.5rem 1.5rem;
            margin-block: 0.5rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.12);
          }
          @media (min-width: 768px) {
            .wf-demo-root section[id] {
              padding: 3rem 2.5rem;
            }
          }
          /* === TUTTO IL TESTO IN NERO (override del text-white esistente) === */
          .wf-demo-root section[id],
          .wf-demo-root section[id] h1,
          .wf-demo-root section[id] h2,
          .wf-demo-root section[id] h3,
          .wf-demo-root section[id] h4,
          .wf-demo-root section[id] h5,
          .wf-demo-root section[id] h6,
          .wf-demo-root section[id] p,
          .wf-demo-root section[id] li,
          .wf-demo-root section[id] span,
          .wf-demo-root section[id] a,
          .wf-demo-root section[id] div,
          .wf-demo-root section[id] .text-white,
          .wf-demo-root section[id] [class*="text-neutral-"] {
            color: ${content.text_color === 'white' ? '#ffffff' : '#0f172a'} !important;
            text-shadow: none !important;
          }
          /* Manteniamo i colori accent (text-X-NUM) come sono per non perdere highlight */
          .wf-demo-root section[id] [class*="text-blue-6"],
          .wf-demo-root section[id] [class*="text-blue-7"],
          .wf-demo-root section[id] [class*="text-red-"],
          .wf-demo-root section[id] [class*="text-green-"],
          .wf-demo-root section[id] [class*="text-yellow-"],
          .wf-demo-root section[id] [class*="text-orange-"],
          .wf-demo-root section[id] [class*="text-purple-"],
          .wf-demo-root section[id] [class*="text-pink-"],
          .wf-demo-root section[id] [class*="text-emerald-"],
          .wf-demo-root section[id] [class*="text-teal-"],
          .wf-demo-root section[id] [class*="text-indigo-"] {
            color: revert-layer !important;
          }
          /* Card interne: bianche piene per leggibilità testi neri */
          .wf-demo-root section[id] .bg-white,
          .wf-demo-root section[id] .bg-neutral-50,
          .wf-demo-root section[id] .bg-neutral-100 {
            background: #ffffff !important;
            backdrop-filter: none !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
            border: 1px solid rgba(255,255,255,0.4) !important;
          }
          /* Sull'icona buttons accent ecc. il bg gradient va mantenuto */
          .wf-demo-root section[id] [class*="bg-gradient-to-"] {
            background: revert-layer !important;
          }
          /* Bordi grigi → trasparenti chiari */
          .wf-demo-root section[id] .border-neutral-100,
          .wf-demo-root section[id] .border-neutral-200 {
            border-color: rgba(255,255,255,0.3) !important;
          }
        ` : ''}

        /* === Design Template: DARK BG === */
        ${designTemplate.dark_bg ? `
          .wf-demo-root {
            background: ${designTemplate.preview.bg} !important;
            color: ${designTemplate.preview.text};
          }
          .wf-demo-root .bg-white,
          .wf-demo-root .bg-neutral-50 {
            background: rgba(255,255,255,0.06) !important;
            color: ${designTemplate.preview.text};
          }
          .wf-demo-root h1, .wf-demo-root h2, .wf-demo-root h3, .wf-demo-root h4 {
            color: ${designTemplate.preview.text};
          }
        ` : ''}
      `}</style>

      <div className={`min-h-screen bg-white font-sans wf-demo-root ${designTemplate.vivid_mode ? 'wf-vivid' : ''} ${designTemplate.dark_bg ? 'wf-dark' : ''}`} data-design-template={designTemplate.id}>
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
              {/* Full width image with configurable overlay */}
              <div className="relative h-[50vh] md:h-[60vh]">
                <img 
                  src={heroPhoto} 
                  alt={demo.business_name} 
                  className="w-full h-full object-cover" 
                  style={{ objectPosition: getHeroPosition(content.hero_position) }}
                  loading="eager" 
                />
                <div 
                  className="absolute inset-0"
                  style={{ background: getHeroOverlay(content.hero_overlay) }}
                ></div>
                {/* Decorazioni animate per categoria (sopra l'overlay, dietro al testo) */}
                <CategoryDecorations category={business.category} color="#ffffff" />
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

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 md:py-16 space-y-12 sm:space-y-16 md:space-y-20 flex flex-col" data-testid="demo-sections-container" style={{ '--noop': 0 }}>
          {/* Ogni <section> riceve style={{ order: orderMap[id] }} via classe contestuale */}
          
          {/* About Section */}
          {content.about_text && (
            <section id="about" style={{ order: sectionOrderMap.about }}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 tracking-tight">{t('sections.aboutTitle', lang)}</h2>
              <p className="text-base sm:text-lg md:text-xl text-neutral-700 leading-relaxed max-w-4xl">{content.about_text}</p>
            </section>
          )}

          {/* Menu (for restaurants) */}
          {hasMenu && content.show_services !== false && (
            <section id="services" style={{ order: sectionOrderMap.services }}>
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
          {!hasMenu && content.show_services !== false && content.services && content.services.length > 0 && (
            <section id="services" style={{ order: sectionOrderMap.services }}>
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

          {/* Why Choose Us */}
          {content.show_whyus !== false && content.why_choose_us && content.why_choose_us.length > 0 && (
            <section id="why-us" className="py-8 sm:py-12" style={{ order: sectionOrderMap.whyus }}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-8 tracking-tight text-center">
                {t('sections.whyChooseUs', lang) || 'Perché Sceglierci'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {content.why_choose_us.map((item, index) => (
                  <div key={index} className={`p-6 sm:p-8 ${style.cardBg} rounded-xl sm:rounded-2xl border-2 border-neutral-100 text-center hover:shadow-lg transition-shadow`}>
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 ${style.accentColor} rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4`}>
                      {index === 0 ? '⭐' : index === 1 ? '✓' : index === 2 ? '👨‍💼' : '❤️'}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-neutral-600 text-sm sm:text-base">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gallery */}
          {content.show_gallery !== false && galleryPhotos.length > 0 && (
            <section id="gallery" style={{ order: sectionOrderMap.gallery }}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 tracking-tight">{t('sections.galleryTitle', lang)}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {galleryPhotos.map((photo, index) => (
                  <button key={index} onClick={() => handleOpenLightbox(index)}
                          className="aspect-square bg-neutral-200 rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer group">
                    <img src={cloudinaryEnhance(photo.url, { width: 600 })} alt={`${t('sections.galleryTitle', lang)} ${index + 1}`}
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </button>
                ))}
              </div>
              <Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)} slides={lightboxSlides} index={lightboxIndex} plugins={[Zoom]} />
            </section>
          )}

          {/* Reviews */}
          {content.show_reviews !== false && reviews.length > 0 && (
            <section id="reviews" style={{ order: sectionOrderMap.reviews }}>
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
                      <span className="text-neutral-400">{translateReviewTime(review.time, lang)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Hours */}
          {content.show_hours !== false && localizedHours.length > 0 && (
            <section id="hours" style={{ order: sectionOrderMap.hours }}>
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
            <section id="booking" style={{ order: sectionOrderMap.booking }}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 tracking-tight">
                {bookingMode === 'table' ? t('sections.bookTableTitle', lang) : t('sections.bookAppointmentTitle', lang)}
              </h2>
              <div className={`${style.cardBg} p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border-2 border-neutral-100 overflow-hidden`}>
                <BookingForm demoId={demoId} bookingMode={bookingMode} lang={lang} style={style}
                             businessPhone={business.phone} externalBookingUrl={externalBookingUrl} />
              </div>
            </section>
          )}

          {/* FAQ Section */}
          {content.show_faq !== false && content.faq && content.faq.length > 0 && (
            <section id="faq" className="py-8 sm:py-12" style={{ order: sectionOrderMap.faq }}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-8 tracking-tight">
                {t('sections.faqTitle', lang) || 'Domande Frequenti'}
              </h2>
              <div className="space-y-3 sm:space-y-4 max-w-3xl mx-auto">
                {content.faq.map((item, index) => (
                  <details key={index} className={`${style.cardBg} rounded-xl sm:rounded-2xl border-2 border-neutral-100 overflow-hidden group`}>
                    <summary className="p-4 sm:p-6 cursor-pointer font-semibold text-base sm:text-lg flex items-center justify-between hover:bg-neutral-50 transition-colors list-none">
                      <span>{item.question}</span>
                      <ChevronDown size={20} className="text-neutral-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-neutral-600 text-sm sm:text-base">
                      {item.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Map */}
          {content.show_map !== false && business.location && (
            <section id="location" style={{ order: sectionOrderMap.location }}>
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
          <section id="contact" style={{ order: sectionOrderMap.contact }}>
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
          <section id="social" className="text-center" style={{ order: sectionOrderMap.social }}>
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

          {/* Final CTA (disattivata di default - può essere riattivata da content.show_final_cta) */}
          {content.show_final_cta && (
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
          )}
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
            <div className="border-t border-neutral-800 pt-6 sm:pt-8 text-center space-y-3">
              <p className="text-neutral-500 text-xs sm:text-sm">
                © {new Date().getFullYear()} {demo.business_name}. {t('footer.allRightsReserved', lang)}.
              </p>
              {!content.hide_watermark && (
                <a
                  href="https://webfinderstudio.it"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="webfinder-watermark"
                  className="inline-flex items-center gap-1.5 text-[11px] text-neutral-600 hover:text-white transition-colors opacity-70 hover:opacity-100"
                >
                  <span>Realizzato da</span>
                  <span className="font-semibold tracking-wide" style={{ color: '#d4a76a' }}>WebFinder</span>
                  <span className="font-light text-neutral-400">Studio</span>
                </a>
              )}
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

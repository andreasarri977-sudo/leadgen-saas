import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Save, RefreshCw, Clock, UtensilsCrossed, FileText, 
  Phone, Images, Search, Loader2, CheckCircle, AlertCircle, ExternalLink,
  Plus, Trash2, GripVertical, X, ImageIcon, Upload, Palette, Star, HelpCircle,
  Settings, Mail, Users, FileDown, ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import API from '@/lib/api';
import { DESIGN_TEMPLATES } from '@/lib/designTemplates';

// Color schemes
const COLOR_SCHEMES = [
  // Blu Vivaci
  { id: 'blue', name: 'Blu', color: '#3b82f6', preview: 'bg-blue-500' },
  { id: 'sky', name: 'Celeste', color: '#0ea5e9', preview: 'bg-sky-500' },
  { id: 'cyan', name: 'Ciano', color: '#06b6d4', preview: 'bg-cyan-500' },
  { id: 'indigo', name: 'Indaco', color: '#6366f1', preview: 'bg-indigo-500' },
  // Viola/Rosa Vivaci
  { id: 'purple', name: 'Viola', color: '#a855f7', preview: 'bg-purple-500' },
  { id: 'violet', name: 'Violetto', color: '#8b5cf6', preview: 'bg-violet-500' },
  { id: 'fuchsia', name: 'Fucsia', color: '#d946ef', preview: 'bg-fuchsia-500' },
  { id: 'pink', name: 'Rosa', color: '#ec4899', preview: 'bg-pink-500' },
  { id: 'rose', name: 'Rosa Acceso', color: '#f43f5e', preview: 'bg-rose-500' },
  // Rosso/Arancione Vivaci
  { id: 'red', name: 'Rosso', color: '#ef4444', preview: 'bg-red-500' },
  { id: 'orange', name: 'Arancione', color: '#f97316', preview: 'bg-orange-500' },
  { id: 'amber', name: 'Ambra', color: '#f59e0b', preview: 'bg-amber-500' },
  { id: 'yellow', name: 'Giallo', color: '#eab308', preview: 'bg-yellow-500' },
  // Verde Vivaci
  { id: 'lime', name: 'Lime', color: '#84cc16', preview: 'bg-lime-500' },
  { id: 'green', name: 'Verde', color: '#22c55e', preview: 'bg-green-500' },
  { id: 'emerald', name: 'Smeraldo', color: '#10b981', preview: 'bg-emerald-500' },
  { id: 'teal', name: 'Verde Acqua', color: '#14b8a6', preview: 'bg-teal-500' },
  // Colori Speciali/Eleganti
  { id: 'gold', name: 'Oro', color: '#fbbf24', preview: 'bg-amber-400' },
  { id: 'coral', name: 'Corallo', color: '#fb7185', preview: 'bg-rose-400' },
  { id: 'mint', name: 'Menta', color: '#34d399', preview: 'bg-emerald-400' },
  { id: 'lavender', name: 'Lavanda', color: '#a78bfa', preview: 'bg-violet-400' },
  { id: 'peach', name: 'Pesca', color: '#fb923c', preview: 'bg-orange-400' },
  // Scuri/Eleganti
  { id: 'slate', name: 'Ardesia', color: '#64748b', preview: 'bg-slate-500' },
  { id: 'navy', name: 'Blu Navy', color: '#1e40af', preview: 'bg-blue-800' },
  { id: 'maroon', name: 'Bordeaux', color: '#be123c', preview: 'bg-rose-700' },
  { id: 'forest', name: 'Verde Foresta', color: '#15803d', preview: 'bg-green-700' },
  { id: 'black', name: 'Nero', color: '#171717', preview: 'bg-neutral-900' },
  // === SFUMATURE DOPPIE (gradient backgrounds) ===
  { id: 'sunset', name: 'Tramonto', color: '#f97316', preview: 'bg-gradient-to-r from-orange-500 to-pink-500', gradient: 'from-orange-500 to-pink-500' },
  { id: 'ocean', name: 'Oceano', color: '#0ea5e9', preview: 'bg-gradient-to-r from-cyan-500 to-blue-600', gradient: 'from-cyan-500 to-blue-600' },
  { id: 'aurora', name: 'Aurora', color: '#a855f7', preview: 'bg-gradient-to-r from-purple-500 to-pink-500', gradient: 'from-purple-500 to-pink-500' },
  { id: 'forest_grad', name: 'Foresta', color: '#10b981', preview: 'bg-gradient-to-r from-emerald-500 to-teal-600', gradient: 'from-emerald-500 to-teal-600' },
  { id: 'royal', name: 'Reale', color: '#6366f1', preview: 'bg-gradient-to-r from-indigo-600 to-purple-600', gradient: 'from-indigo-600 to-purple-600' },
  { id: 'fire', name: 'Fuoco', color: '#ef4444', preview: 'bg-gradient-to-r from-red-500 to-yellow-500', gradient: 'from-red-500 to-yellow-500' },
  { id: 'mint_grad', name: 'Menta Fresca', color: '#10b981', preview: 'bg-gradient-to-r from-green-400 to-cyan-500', gradient: 'from-green-400 to-cyan-500' },
  { id: 'berry', name: 'Bacca', color: '#d946ef', preview: 'bg-gradient-to-r from-fuchsia-500 to-rose-500', gradient: 'from-fuchsia-500 to-rose-500' },
  { id: 'gold_grad', name: 'Oro Elegante', color: '#fbbf24', preview: 'bg-gradient-to-r from-amber-400 to-orange-500', gradient: 'from-amber-400 to-orange-500' },
  { id: 'midnight', name: 'Mezzanotte', color: '#1e293b', preview: 'bg-gradient-to-r from-slate-800 to-blue-900', gradient: 'from-slate-800 to-blue-900' }
];

// Color scheme map (mirror of DemoPreview) - used for the LIVE PREVIEW
const COLOR_SCHEME_MAP = {
  'blue':     { primaryColor: 'from-blue-600 to-blue-800',       accentColor: 'bg-blue-600',     buttonColor: 'bg-blue-600 hover:bg-blue-700',       cardBg: 'bg-blue-50',     textAccent: 'text-blue-600' },
  'sky':      { primaryColor: 'from-sky-500 to-sky-700',         accentColor: 'bg-sky-500',      buttonColor: 'bg-sky-500 hover:bg-sky-600',        cardBg: 'bg-sky-50',      textAccent: 'text-sky-600' },
  'cyan':     { primaryColor: 'from-cyan-500 to-cyan-700',       accentColor: 'bg-cyan-500',     buttonColor: 'bg-cyan-500 hover:bg-cyan-600',      cardBg: 'bg-cyan-50',     textAccent: 'text-cyan-600' },
  'indigo':   { primaryColor: 'from-indigo-600 to-indigo-800',   accentColor: 'bg-indigo-600',   buttonColor: 'bg-indigo-600 hover:bg-indigo-700',  cardBg: 'bg-indigo-50',   textAccent: 'text-indigo-600' },
  'purple':   { primaryColor: 'from-purple-600 to-purple-800',   accentColor: 'bg-purple-600',   buttonColor: 'bg-purple-600 hover:bg-purple-700',  cardBg: 'bg-purple-50',   textAccent: 'text-purple-600' },
  'violet':   { primaryColor: 'from-violet-600 to-violet-800',   accentColor: 'bg-violet-600',   buttonColor: 'bg-violet-600 hover:bg-violet-700',  cardBg: 'bg-violet-50',   textAccent: 'text-violet-600' },
  'fuchsia':  { primaryColor: 'from-fuchsia-600 to-fuchsia-800', accentColor: 'bg-fuchsia-600',  buttonColor: 'bg-fuchsia-600 hover:bg-fuchsia-700', cardBg: 'bg-fuchsia-50', textAccent: 'text-fuchsia-600' },
  'pink':     { primaryColor: 'from-pink-600 to-pink-800',       accentColor: 'bg-pink-600',     buttonColor: 'bg-pink-600 hover:bg-pink-700',      cardBg: 'bg-pink-50',     textAccent: 'text-pink-600' },
  'rose':     { primaryColor: 'from-rose-600 to-rose-800',       accentColor: 'bg-rose-600',     buttonColor: 'bg-rose-600 hover:bg-rose-700',      cardBg: 'bg-rose-50',     textAccent: 'text-rose-600' },
  'red':      { primaryColor: 'from-red-600 to-red-800',         accentColor: 'bg-red-600',      buttonColor: 'bg-red-600 hover:bg-red-700',        cardBg: 'bg-red-50',      textAccent: 'text-red-600' },
  'orange':   { primaryColor: 'from-orange-600 to-orange-800',   accentColor: 'bg-orange-600',   buttonColor: 'bg-orange-600 hover:bg-orange-700',  cardBg: 'bg-orange-50',   textAccent: 'text-orange-600' },
  'amber':    { primaryColor: 'from-amber-600 to-amber-800',     accentColor: 'bg-amber-600',    buttonColor: 'bg-amber-600 hover:bg-amber-700',    cardBg: 'bg-amber-50',    textAccent: 'text-amber-600' },
  'yellow':   { primaryColor: 'from-yellow-500 to-yellow-700',   accentColor: 'bg-yellow-500',   buttonColor: 'bg-yellow-500 hover:bg-yellow-600',  cardBg: 'bg-yellow-50',   textAccent: 'text-yellow-600' },
  'lime':     { primaryColor: 'from-lime-500 to-lime-700',       accentColor: 'bg-lime-500',     buttonColor: 'bg-lime-500 hover:bg-lime-600',      cardBg: 'bg-lime-50',     textAccent: 'text-lime-600' },
  'green':    { primaryColor: 'from-green-600 to-green-800',     accentColor: 'bg-green-600',    buttonColor: 'bg-green-600 hover:bg-green-700',    cardBg: 'bg-green-50',    textAccent: 'text-green-600' },
  'emerald':  { primaryColor: 'from-emerald-600 to-emerald-800', accentColor: 'bg-emerald-600',  buttonColor: 'bg-emerald-600 hover:bg-emerald-700', cardBg: 'bg-emerald-50', textAccent: 'text-emerald-600' },
  'teal':     { primaryColor: 'from-teal-600 to-teal-800',       accentColor: 'bg-teal-600',     buttonColor: 'bg-teal-600 hover:bg-teal-700',      cardBg: 'bg-teal-50',     textAccent: 'text-teal-600' },
  'gold':     { primaryColor: 'from-amber-400 to-amber-600',     accentColor: 'bg-amber-400',    buttonColor: 'bg-amber-400 hover:bg-amber-500',    cardBg: 'bg-amber-50',    textAccent: 'text-amber-500' },
  'coral':    { primaryColor: 'from-rose-400 to-rose-600',       accentColor: 'bg-rose-400',     buttonColor: 'bg-rose-400 hover:bg-rose-500',      cardBg: 'bg-rose-50',     textAccent: 'text-rose-500' },
  'mint':     { primaryColor: 'from-emerald-400 to-emerald-600', accentColor: 'bg-emerald-400',  buttonColor: 'bg-emerald-400 hover:bg-emerald-500', cardBg: 'bg-emerald-50', textAccent: 'text-emerald-500' },
  'lavender': { primaryColor: 'from-violet-400 to-violet-600',   accentColor: 'bg-violet-400',   buttonColor: 'bg-violet-400 hover:bg-violet-500',  cardBg: 'bg-violet-50',   textAccent: 'text-violet-500' },
  'peach':    { primaryColor: 'from-orange-400 to-orange-600',   accentColor: 'bg-orange-400',   buttonColor: 'bg-orange-400 hover:bg-orange-500',  cardBg: 'bg-orange-50',   textAccent: 'text-orange-500' },
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

const HERO_POSITIONS = [
  { id: 'center', name: 'Centro', value: 'center center' },
  { id: 'top', name: 'Alto', value: 'center top' },
  { id: 'bottom', name: 'Basso', value: 'center bottom' },
  { id: 'left', name: 'Sinistra', value: 'left center' },
  { id: 'right', name: 'Destra', value: 'right center' },
  { id: 'top-left', name: 'Alto Sinistra', value: 'left top' },
  { id: 'top-right', name: 'Alto Destra', value: 'right top' },
  { id: 'bottom-left', name: 'Basso Sinistra', value: 'left bottom' },
  { id: 'bottom-right', name: 'Basso Destra', value: 'right bottom' }
];

const HERO_OVERLAYS = [
  { id: 'none', name: 'Nessuno', value: 'none' },
  { id: 'light', name: 'Leggero', value: 'rgba(0,0,0,0.3)' },
  { id: 'medium', name: 'Medio', value: 'rgba(0,0,0,0.5)' },
  { id: 'dark', name: 'Scuro', value: 'rgba(0,0,0,0.7)' },
  { id: 'gradient', name: 'Sfumato', value: 'gradient' }
];

const DAYS = [
  { code: 'mon', name: 'Lunedì' },
  { code: 'tue', name: 'Martedì' },
  { code: 'wed', name: 'Mercoledì' },
  { code: 'thu', name: 'Giovedì' },
  { code: 'fri', name: 'Venerdì' },
  { code: 'sat', name: 'Sabato' },
  { code: 'sun', name: 'Domenica' }
];

// Live preview - mini rendition of the public demo (hero + button + accent card)
function LiveSitePreview({ colorScheme, heroImage, heroPosition, heroOverlay, businessName }) {
  const [device, setDevice] = useState('mobile');
  const style = COLOR_SCHEME_MAP[colorScheme] || COLOR_SCHEME_MAP['blue'];
  const positionValue = HERO_POSITIONS.find(p => p.id === heroPosition)?.value || 'center center';
  const overlayBg = heroOverlay === 'gradient'
    ? 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)'
    : heroOverlay === 'light' ? 'rgba(0,0,0,0.35)'
    : heroOverlay === 'medium' ? 'rgba(0,0,0,0.55)'
    : heroOverlay === 'dark' ? 'rgba(0,0,0,0.75)'
    : 'transparent';

  const widthClass = device === 'mobile' ? 'max-w-[200px] mx-auto' : 'w-full';

  return (
    <div>
      {/* Device toggle */}
      <div className="flex bg-neutral-100 rounded-lg p-1 mb-2 w-fit mx-auto">
        <button
          data-testid="preview-mobile-btn"
          onClick={() => setDevice('mobile')}
          className={`px-3 py-1 rounded text-xs font-medium ${device === 'mobile' ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
        >
          📱 Mobile
        </button>
        <button
          data-testid="preview-desktop-btn"
          onClick={() => setDevice('desktop')}
          className={`px-3 py-1 rounded text-xs font-medium ${device === 'desktop' ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
        >
          🖥️ Desktop
        </button>
      </div>

      <div className={`border-2 border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all ${widthClass}`}>
      {/* Fake browser bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 border-b border-neutral-200">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
        <div className="ml-3 text-[10px] text-neutral-500 truncate">anteprima.sito</div>
      </div>

      {/* Hero */}
      <div className="relative h-32 sm:h-36 overflow-hidden">
        {heroImage ? (
          <>
            <img
              src={heroImage}
              alt="hero preview"
              className="w-full h-full object-cover"
              style={{ objectPosition: positionValue }}
            />
            <div className="absolute inset-0" style={{ background: overlayBg }}></div>
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${style.primaryColor}`}></div>
        )}
        <div className="absolute bottom-2 left-3 right-3 text-white">
          <p className="text-[11px] opacity-80 leading-none mb-1">{businessName || 'La tua Attività'}</p>
          <h4 className="text-base font-bold leading-tight drop-shadow">Benvenuto</h4>
        </div>
      </div>

      {/* Body - simulated content */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${style.accentColor}`}></span>
          <span className={`text-xs font-semibold ${style.textAccent}`}>I nostri servizi</span>
        </div>

        <div className={`${style.cardBg} p-2.5 rounded-lg`}>
          <div className={`w-6 h-6 rounded ${style.accentColor} text-white text-[10px] font-bold flex items-center justify-center mb-1`}>1</div>
          <div className="h-1.5 w-3/4 bg-neutral-300 rounded mb-1"></div>
          <div className="h-1.5 w-1/2 bg-neutral-200 rounded"></div>
        </div>

        <button className={`w-full text-white text-xs font-semibold py-2 rounded-full ${style.buttonColor} transition-colors`}>
          Prenota Ora
        </button>
      </div>
      </div>
    </div>
  );
}

// Site Settings Editor (languages + section visibility)
const LANGUAGE_OPTIONS = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' }
];

const SECTION_LIBRARY = [
  { id: 'about', icon: '📝', label: 'Chi siamo', desc: 'Descrizione attività' },
  { id: 'services', icon: '🛠️', label: 'Servizi / Menu', desc: 'Lista servizi o menu' },
  { id: 'whyus', icon: '⭐', label: 'Perché sceglierci', desc: 'Punti di forza' },
  { id: 'gallery', icon: '🖼️', label: 'Galleria foto', desc: 'Foto del locale' },
  { id: 'reviews', icon: '💬', label: 'Recensioni Google', desc: 'Recensioni clienti' },
  { id: 'hours', icon: '🕐', label: 'Orari', desc: 'Orari di apertura' },
  { id: 'booking', icon: '📅', label: 'Prenotazioni', desc: 'Form prenotazione' },
  { id: 'faq', icon: '❓', label: 'FAQ', desc: 'Domande frequenti' },
  { id: 'location', icon: '📍', label: 'Mappa', desc: 'Posizione Google Maps' },
  { id: 'contact', icon: '✉️', label: 'Contatti', desc: 'Telefono, email, WhatsApp' },
  { id: 'social', icon: '📱', label: 'Social', desc: 'Instagram, Facebook, TikTok' },
];

const DEFAULT_ORDER_IDS = SECTION_LIBRARY.map((s) => s.id);

function SectionOrderEditor({ sectionOrder, showReviews, showGallery, showWhyus, showFaq, showHours, showMap, showServices, onSave, onSaveVisibility, saving }) {
  const initial = Array.isArray(sectionOrder) && sectionOrder.length > 0
    ? [...sectionOrder.filter((id) => DEFAULT_ORDER_IDS.includes(id)), ...DEFAULT_ORDER_IDS.filter((id) => !sectionOrder.includes(id))]
    : DEFAULT_ORDER_IDS;
  const [order, setOrder] = useState(initial);
  const [dragIndex, setDragIndex] = useState(null);
  const [dirty, setDirty] = useState(false);

  // Mappa visibilità: id sezione → flag corrente (true=visibile, false=nascosta)
  const visibilityMap = {
    reviews: showReviews !== false,
    gallery: showGallery !== false,
    whyus: showWhyus !== false,
    faq: showFaq !== false,
    hours: showHours !== false,
    location: showMap !== false,
    services: showServices !== false,
    // Le sezioni about/booking/contact/social sono sempre visibili (non toggleable)
  };

  const move = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
    setDirty(true);
  };

  const moveUp = (idx) => move(idx, idx - 1);
  const moveDown = (idx) => move(idx, idx + 1);
  const reset = () => { setOrder(DEFAULT_ORDER_IDS); setDirty(true); };

  const toggleVisibility = (sectionId) => {
    // map UI id → backend field
    const fieldMap = { reviews: 'show_reviews', gallery: 'show_gallery', whyus: 'show_whyus', faq: 'show_faq', hours: 'show_hours', location: 'show_map', services: 'show_services' };
    const field = fieldMap[sectionId];
    if (!field || !onSaveVisibility) return;
    const currentVisible = visibilityMap[sectionId];
    onSaveVisibility({ [field]: !currentVisible });
  };

  const handleSave = () => {
    onSave({ section_order: order });
    setDirty(false);
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">🧱 Layout delle sezioni</h3>
          <p className="text-sm text-neutral-500 mt-1">
            Trascina o usa le frecce per riordinare. Tocca <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">−</span> per nascondere, <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold">+</span> per riaggiungere.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} data-testid="reset-section-order">
            Ripristina default
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="save-section-order"
          >
            {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
            Salva ordine
          </Button>
        </div>
      </div>

      <div className="space-y-2" data-testid="section-order-list">
        {order.map((id, idx) => {
          const section = SECTION_LIBRARY.find((s) => s.id === id);
          if (!section) return null;
          const isToggleable = id in visibilityMap;
          const isVisible = isToggleable ? visibilityMap[id] : true;
          return (
            <div
              key={id}
              draggable
              onDragStart={() => setDragIndex(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragIndex !== null) move(dragIndex, idx); setDragIndex(null); }}
              onDragEnd={() => setDragIndex(null)}
              data-testid={`section-row-${id}`}
              className={`flex items-center gap-3 p-3 bg-white border-2 rounded-lg transition-all cursor-grab active:cursor-grabbing ${
                dragIndex === idx ? 'border-blue-400 opacity-50' : isVisible ? 'border-neutral-200 hover:border-blue-300 hover:shadow-sm' : 'border-neutral-200 opacity-50 bg-neutral-50'
              }`}
            >
              <GripVertical size={18} className="text-neutral-400 shrink-0" />
              <div className="text-2xl shrink-0">{section.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm flex items-center gap-2">
                  {section.label}
                  {isToggleable && !isVisible && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">NASCOSTA</span>}
                  {!isToggleable && <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded">sempre visibile</span>}
                </p>
                <p className="text-xs text-neutral-500 truncate">{section.desc}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-400 w-6 text-center font-mono">#{idx + 1}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  data-testid={`section-up-${id}`}
                  title="Sposta su"
                >
                  ▲
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => moveDown(idx)}
                  disabled={idx === order.length - 1}
                  data-testid={`section-down-${id}`}
                  title="Sposta giù"
                >
                  ▼
                </Button>
                {isToggleable && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={`h-7 w-7 ml-1 ${isVisible ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                    onClick={() => toggleVisibility(id)}
                    data-testid={`section-toggle-${id}`}
                    title={isVisible ? 'Nascondi sezione' : 'Aggiungi sezione'}
                  >
                    {isVisible ? <Trash2 size={14} /> : <Plus size={14} />}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {dirty && (
        <p className="mt-4 text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle size={12} /> Modifiche all'ordine non salvate
        </p>
      )}
    </Card>
  );
}

function SiteSettingsEditor({ siteLanguage, translations, bookingMode, externalBookingUrl, showReviews, showGallery, showWhyus, showFaq, showHours, showMap, showServices, onUpdate, onSave, saving }) {
  const [primaryLang, setPrimaryLang] = useState(siteLanguage || 'it');
  const [trList, setTrList] = useState(translations || []);
  const [booking, setBooking] = useState(bookingMode || 'none');
  const [bookingUrl, setBookingUrl] = useState(externalBookingUrl || '');
  const [flags, setFlags] = useState({
    show_reviews: showReviews !== false,
    show_gallery: showGallery !== false,
    show_whyus: showWhyus !== false,
    show_faq: showFaq !== false,
    show_hours: showHours !== false,
    show_map: showMap !== false,
    show_services: showServices !== false
  });

  const toggleTr = (code) => {
    if (code === primaryLang) return;
    setTrList((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= 4) {
        toast.error('Massimo 4 traduzioni');
        return prev;
      }
      return [...prev, code];
    });
  };

  const changePrimary = (code) => {
    setPrimaryLang(code);
    setTrList((prev) => prev.filter((c) => c !== code));
  };

  const toggleFlag = (key) => setFlags((f) => ({ ...f, [key]: !f[key] }));

  const handleSave = () => {
    onSave({
      site_language: primaryLang,
      translations: trList,
      booking_mode: booking,
      external_booking_url: bookingUrl,
      ...flags
    });
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-2">⚙️ Impostazioni Sito</h3>
      <p className="text-sm text-neutral-500 mb-6">Configura lingue, sezioni visibili e prenotazioni del sito demo.</p>

      {/* LANGUAGES */}
      <div className="mb-8">
        <Label className="text-base font-bold mb-2 block">🌐 Lingue del Sito</Label>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Label className="text-sm">Lingua principale</Label>
          <select
            data-testid="primary-language"
            value={primaryLang}
            onChange={(e) => changePrimary(e.target.value)}
            className="w-full mt-1 border-2 border-blue-300 rounded-md px-3 py-2 bg-white font-semibold"
          >
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
            ))}
          </select>
          <p className="text-xs text-neutral-500 mt-1">La lingua predefinita con cui apre il sito.</p>
        </div>

        <div>
          <Label className="text-sm mb-2 block">Traduzioni aggiuntive (max 4) — selezionate: <span className="font-bold">{trList.length}/4</span></Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LANGUAGE_OPTIONS.filter((l) => l.code !== primaryLang).map((l) => {
              const active = trList.includes(l.code);
              return (
                <button
                  key={l.code}
                  data-testid={`translation-${l.code}`}
                  onClick={() => toggleTr(l.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm transition-colors ${active ? 'border-blue-500 bg-blue-50 font-semibold' : 'border-neutral-200 hover:border-neutral-300'}`}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                  {active && <CheckCircle size={14} className="ml-auto text-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOOKING */}
      <div className="mb-8">
        <Label className="text-base font-bold mb-2 block">📅 Sistema Prenotazioni</Label>
        <div className="space-y-2">
          {[
            { id: 'none', label: 'Nessuna prenotazione', desc: 'Solo telefono/WhatsApp' },
            { id: 'table', label: 'Prenotazione Tavolo', desc: 'Per ristoranti, bar, pizzerie' },
            { id: 'appointment', label: 'Prenotazione Appuntamento', desc: 'Per parrucchieri, dentisti, estetiste' },
            { id: 'external', label: 'Link esterno', desc: 'TheFork, Booking.com, ecc.' }
          ].map((opt) => (
            <label key={opt.id} className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer ${booking === opt.id ? 'border-blue-500 bg-blue-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
              <input
                type="radio"
                name="booking"
                value={opt.id}
                checked={booking === opt.id}
                onChange={() => setBooking(opt.id)}
                data-testid={`booking-${opt.id}`}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-neutral-500">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
        {booking === 'external' && (
          <div className="mt-3">
            <Label htmlFor="booking-url">URL piattaforma esterna</Label>
            <Input
              id="booking-url"
              data-testid="booking-url"
              value={bookingUrl}
              onChange={(e) => setBookingUrl(e.target.value)}
              placeholder="https://thefork.com/..."
            />
          </div>
        )}
      </div>

      {/* SECTION VISIBILITY */}
      <div className="mb-8">
        <Label className="text-base font-bold mb-3 block">👁️ Sezioni Visibili sul Sito</Label>
        <div className="space-y-2">
          {[
            { id: 'show_services', label: 'Servizi', desc: 'Lista dei servizi offerti' },
            { id: 'show_whyus', label: 'Perché Sceglierci', desc: '4 motivi di scelta con emoji' },
            { id: 'show_gallery', label: 'Galleria', desc: 'Foto dei lavori/locali' },
            { id: 'show_reviews', label: 'Recensioni Google', desc: 'Recensioni autentiche da Google' },
            { id: 'show_hours', label: 'Orari di Apertura', desc: 'Tabella settimanale orari' },
            { id: 'show_faq', label: 'Domande Frequenti', desc: 'Sezione FAQ accordion' },
            { id: 'show_map', label: 'Mappa Google', desc: 'Mappa interattiva indirizzo' }
          ].map((s) => (
            <label key={s.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50">
              <div className="flex-1">
                <p className="font-semibold text-sm">{s.label}</p>
                <p className="text-xs text-neutral-500">{s.desc}</p>
              </div>
              <Switch
                checked={flags[s.id]}
                onCheckedChange={() => toggleFlag(s.id)}
                data-testid={`toggle-${s.id}`}
              />
            </label>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700" data-testid="save-site-settings">
        {saving ? <><Loader2 className="mr-2 animate-spin" size={16} /> Salvataggio...</> : <><Save className="mr-2" size={16} /> Salva Impostazioni Sito</>}
      </Button>
    </Card>
  );
}

// Style Editor Component
function StyleEditor({ heroImage, heroPosition, heroOverlay, colorScheme, theme, designTemplate, textColor, colorIntensity, gallery, businessName, businessCategory, demoId, productionUrl, hideWatermark, onUpdate, onSave, saving }) {
  const [selectedColor, setSelectedColor] = useState(colorScheme || 'blue');
  const [selectedHero, setSelectedHero] = useState(heroImage || '');
  const [selectedPosition, setSelectedPosition] = useState(heroPosition || 'center');
  const [selectedOverlay, setSelectedOverlay] = useState(heroOverlay || 'medium');
  const [selectedTemplate, setSelectedTemplate] = useState(designTemplate || 'classic');
  const [selectedTextColor, setSelectedTextColor] = useState(textColor || 'black');
  const [selectedIntensity, setSelectedIntensity] = useState(colorIntensity || 'vivid');
  const [hideMark, setHideMark] = useState(Boolean(hideWatermark));
  
  // Find initial index based on heroImage
  const findHeroIndex = () => {
    if (!heroImage || !gallery || gallery.length === 0) return -1;
    return gallery.findIndex(img => {
      const imgUrl = typeof img === 'string' ? img : img.url;
      return imgUrl === heroImage;
    });
  };
  
  const [selectedHeroIndex, setSelectedHeroIndex] = useState(findHeroIndex());
  
  const handleColorChange = (colorId) => {
    setSelectedColor(colorId);
    onUpdate({ color_scheme: colorId, hero_image: selectedHero, hero_position: selectedPosition, hero_overlay: selectedOverlay, theme });
  };
  
  const handleHeroChange = (imageUrl, index) => {
    setSelectedHeroIndex(index);
    setSelectedHero(imageUrl);
    onUpdate({ hero_image: imageUrl, color_scheme: selectedColor, hero_position: selectedPosition, hero_overlay: selectedOverlay, theme });
  };

  const handlePositionChange = (positionId) => {
    setSelectedPosition(positionId);
    onUpdate({ hero_position: positionId, hero_image: selectedHero, color_scheme: selectedColor, hero_overlay: selectedOverlay, theme });
  };

  const handleOverlayChange = (overlayId) => {
    setSelectedOverlay(overlayId);
    onUpdate({ hero_overlay: overlayId, hero_image: selectedHero, color_scheme: selectedColor, hero_position: selectedPosition, theme });
  };
  
  const handleSave = () => {
    onSave({
      hero_image: selectedHero,
      hero_position: selectedPosition,
      hero_overlay: selectedOverlay,
      color_scheme: selectedColor,
      theme: theme,
      hide_watermark: hideMark
    });
  };

  const toggleWatermark = (val) => {
    setHideMark(val);
    onUpdate({ hide_watermark: val, color_scheme: selectedColor, hero_image: selectedHero, hero_position: selectedPosition, hero_overlay: selectedOverlay, theme });
  };

  // Get position value for preview
  const positionValue = HERO_POSITIONS.find(p => p.id === selectedPosition)?.value || 'center center';
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Stile del Sito</h3>

      {/* Live Preview - sticky on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mb-8">
        <div className="space-y-8 min-w-0">

          {/* === DESIGN TEMPLATE (9 stili) === */}
          <div className="p-4 rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
              <div>
                <Label className="text-base font-medium block flex items-center gap-2">🎨 Template Design</Label>
                <p className="text-sm text-neutral-500">Cambia lo stile complessivo del sito (colori, font, layout)</p>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded-full font-semibold">
                {DESIGN_TEMPLATES.find((t) => t.id === selectedTemplate)?.emoji}{' '}
                {DESIGN_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
              {DESIGN_TEMPLATES.map((tpl) => {
                const isActive = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(tpl.id);
                      // Applica anche il color_scheme del template per coerenza visiva
                      const newColor = tpl.color_scheme || selectedColor;
                      setSelectedColor(newColor);
                      onUpdate({
                        design_template: tpl.id,
                        hero_image: selectedHero,
                        color_scheme: newColor,
                        hero_position: selectedPosition,
                        hero_overlay: selectedOverlay,
                        theme,
                      });
                    }}
                    data-testid={`editor-template-${tpl.id}`}
                    className={`relative text-left rounded-lg overflow-hidden border-2 transition-all hover:shadow-md ${
                      isActive ? 'border-blue-600 ring-2 ring-blue-200 scale-[1.02]' : 'border-neutral-200 hover:border-blue-300'
                    }`}
                  >
                    <div className={`h-12 bg-gradient-to-br ${tpl.preview.primary} flex items-end px-1.5 pb-0.5`}>
                      {tpl.vivid_mode && <span className="w-2 h-2 rounded-full bg-white/70 mr-1 animate-pulse" />}
                      <span className="text-white text-[10px] font-bold drop-shadow">{tpl.emoji}</span>
                    </div>
                    <div className="px-1.5 py-1 bg-white">
                      <p className="text-[10px] font-bold text-neutral-900 truncate">{tpl.name}</p>
                    </div>
                    {isActive && (
                      <span className="absolute top-1 right-1 bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
                        <CheckCircle size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-neutral-500 italic mt-2">
              💡 {DESIGN_TEMPLATES.find((t) => t.id === selectedTemplate)?.tagline} — {DESIGN_TEMPLATES.find((t) => t.id === selectedTemplate)?.description}
            </p>
          </div>

          {/* === COLORE TESTI === */}
          <div className="p-4 rounded-2xl border-2 border-neutral-200 bg-white">
            <Label className="text-base font-medium block mb-1 flex items-center gap-2">🅰️ Colore Testi</Label>
            <p className="text-sm text-neutral-500 mb-3">Scegli se i titoli e i testi nelle sezioni colorate sono in nero o in bianco</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'black', label: 'Nero', desc: 'Consigliato — leggibilità massima', swatch: '#0f172a' },
                { id: 'white', label: 'Bianco', desc: 'Su gradienti molto scuri', swatch: '#ffffff' },
              ].map((opt) => {
                const active = selectedTextColor === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedTextColor(opt.id);
                      onUpdate({
                        text_color: opt.id,
                        hero_image: selectedHero,
                        color_scheme: selectedColor,
                        hero_position: selectedPosition,
                        hero_overlay: selectedOverlay,
                        design_template: selectedTemplate,
                        theme,
                      });
                    }}
                    data-testid={`editor-text-color-${opt.id}`}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      active ? 'border-blue-600 ring-2 ring-blue-200 bg-blue-50' : 'border-neutral-200 hover:border-blue-300'
                    }`}
                  >
                    <span className="w-9 h-9 rounded-lg border border-neutral-300 flex items-center justify-center text-lg font-bold shrink-0"
                          style={{ background: opt.swatch, color: opt.id === 'white' ? '#0f172a' : '#ffffff' }}>
                      A
                    </span>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-bold text-sm text-neutral-900">{opt.label}</p>
                      <p className="text-[11px] text-neutral-500 truncate">{opt.desc}</p>
                    </div>
                    {active && <CheckCircle size={18} className="text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* === INTENSITÀ COLORI === */}
          <div className="p-4 rounded-2xl border-2 border-neutral-200 bg-white">
            <Label className="text-base font-medium block mb-1 flex items-center gap-2">🎚️ Intensità Colori</Label>
            <p className="text-sm text-neutral-500 mb-3">Quanto saturo deve apparire il gradient nelle sezioni — utile se i clienti trovano il "vivid" troppo carico.</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'soft',   label: 'Soft',   desc: 'Pastello, delicato', veil: 0.65 },
                { id: 'medium', label: 'Medio',  desc: 'Equilibrato',         veil: 0.35 },
                { id: 'vivid',  label: 'Acceso', desc: 'Saturo (default)',    veil: 0 },
              ].map((opt) => {
                const active = selectedIntensity === opt.id;
                const tplGrad = DESIGN_TEMPLATES.find((t) => t.id === selectedTemplate)?.cssGradient || 'linear-gradient(135deg, #2563eb, #1e40af)';
                const previewBg = opt.veil > 0
                  ? `linear-gradient(rgba(255,255,255,${opt.veil}), rgba(255,255,255,${opt.veil})), ${tplGrad}`
                  : tplGrad;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedIntensity(opt.id);
                      onUpdate({
                        color_intensity: opt.id,
                        hero_image: selectedHero,
                        color_scheme: selectedColor,
                        hero_position: selectedPosition,
                        hero_overlay: selectedOverlay,
                        design_template: selectedTemplate,
                        text_color: selectedTextColor,
                        theme,
                      });
                    }}
                    data-testid={`editor-intensity-${opt.id}`}
                    className={`relative text-left rounded-xl overflow-hidden border-2 transition-all hover:shadow-md ${
                      active ? 'border-blue-600 ring-2 ring-blue-200 scale-[1.02]' : 'border-neutral-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="h-14 w-full" style={{ background: previewBg }} />
                    <div className="px-2 py-1.5 bg-white">
                      <p className="text-sm font-bold text-neutral-900">{opt.label}</p>
                      <p className="text-[10px] text-neutral-500">{opt.desc}</p>
                    </div>
                    {active && (
                      <span className="absolute top-1.5 right-1.5 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                        <CheckCircle size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Scheme */}
          <div>
            <Label className="text-base font-medium mb-3 block">🎨 Colore Principale</Label>
            <p className="text-sm text-neutral-500 mb-4">Scegli il colore dei pulsanti e degli elementi principali</p>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
              {COLOR_SCHEMES.map((scheme) => (
                <button
                  key={scheme.id}
                  data-testid={`color-swatch-${scheme.id}`}
                  onClick={() => handleColorChange(scheme.id)}
                  className={`w-9 h-9 rounded-full ${scheme.preview} transition-all hover:scale-110 ${
                    selectedColor === scheme.id ? 'ring-4 ring-offset-2 ring-blue-400 scale-110' : ''
                  }`}
                  title={scheme.name}
                />
              ))}
            </div>
            <p className="text-sm text-neutral-500 mt-3">
              Selezionato: <span className="font-medium text-neutral-800">{COLOR_SCHEMES.find(c => c.id === selectedColor)?.name || 'Blu'}</span>
            </p>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:sticky lg:top-4 self-start">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Anteprima Live</p>
            <a
              href={productionUrl || `/demo/${demoId}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="open-fullscreen-preview"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              title="Apri anteprima a schermo intero in una nuova scheda"
            >
              <ExternalLink size={12} />
              Schermo intero
            </a>
          </div>
          <LiveSitePreview
            colorScheme={selectedColor}
            heroImage={selectedHero}
            heroPosition={selectedPosition}
            heroOverlay={selectedOverlay}
            businessName={businessName}
          />
          <p className="text-[11px] text-neutral-500 mt-2 leading-tight">
            Cambia colore, immagine o oscuramento: l'anteprima si aggiorna in tempo reale.
          </p>
        </div>
      </div>

      {/* Hero Image Selection */}
      <div className="mb-8">
        <Label className="text-base font-medium mb-3 block">🖼️ Immagine di Copertina</Label>
        <p className="text-sm text-neutral-500 mb-4">Seleziona l'immagine per la sezione principale del sito</p>
        
        {gallery && gallery.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gallery.map((img, index) => {
              const imageUrl = typeof img === 'string' ? img : img.url;
              const isSelected = selectedHero === imageUrl || selectedHeroIndex === index;
              return (
                <button
                  key={index}
                  onClick={() => handleHeroChange(imageUrl, index)}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <img src={imageUrl} alt={`Opzione ${index + 1}`} className="w-full h-full object-cover" />
                  {isSelected && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <CheckCircle className="text-white" size={24} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-neutral-100 rounded-lg p-8 text-center">
            <ImageIcon className="mx-auto text-neutral-400 mb-2" size={32} />
            <p className="text-neutral-500">Nessuna immagine disponibile nella galleria</p>
            <p className="text-sm text-neutral-400 mt-1">Aggiungi immagini nella tab "Galleria"</p>
          </div>
        )}
      </div>

      {/* Hero Image Adjustments - Show only if image selected */}
      {selectedHero && (
        <>
          {/* Position Control */}
          <div className="mb-8">
            <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
              <div>
                <Label className="text-base font-medium block">📍 Posizione Immagine</Label>
                <p className="text-sm text-neutral-500">Sposta il riquadro per scegliere quale parte dell'immagine restare visibile nell'hero</p>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                {HERO_POSITIONS.find(p => p.id === selectedPosition)?.name || 'Centro'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start">
              {/* Left side: Full image with draggable crop indicator */}
              <div>
                <p className="text-[11px] text-neutral-500 mb-1.5 font-medium uppercase tracking-wide">Immagine intera</p>
                <div
                  className="relative rounded-lg overflow-hidden border-2 border-neutral-200 bg-neutral-900/5 select-none"
                  data-testid="position-fullimage-area"
                >
                  <img
                    src={selectedHero}
                    alt="Immagine completa"
                    className="w-full h-auto max-h-48 object-contain bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px]"
                    onClick={(e) => {
                      // Cliccando sull'immagine, sposta il riquadro automaticamente
                      const rect = e.currentTarget.getBoundingClientRect();
                      const px = ((e.clientX - rect.left) / rect.width) * 100;
                      const py = ((e.clientY - rect.top) / rect.height) * 100;
                      let h = 'center'; let v = 'center';
                      if (px < 33) h = 'left'; else if (px > 67) h = 'right';
                      if (py < 33) v = 'top'; else if (py > 67) v = 'bottom';
                      const id = v === 'center' && h === 'center' ? 'center'
                        : v === 'center' ? h
                        : h === 'center' ? v
                        : `${v}-${h}`;
                      handlePositionChange(id);
                    }}
                  />
                  {/* Crop frame indicator (overlay con riquadro che mostra dove è il "focus") */}
                  {(() => {
                    const pos = selectedPosition;
                    // Map to alignment percentages 0=start, 50=center, 100=end
                    const hx = pos.includes('left') ? 0 : pos.includes('right') ? 100 : 50;
                    const vy = pos.includes('top') ? 0 : pos.includes('bottom') ? 100 : 50;
                    return (
                      <div
                        className="pointer-events-none absolute border-[3px] border-blue-500 rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] transition-all duration-200"
                        style={{
                          width: '40%', height: '60%',
                          left: `calc(${hx}% - ${hx * 0.4}%)`,
                          top: `calc(${vy}% - ${vy * 0.6}%)`
                        }}
                      >
                        <div className="absolute -top-5 left-0 text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded">
                          Area visibile
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <p className="text-[11px] text-neutral-500 mt-1.5">
                  💡 Tocca direttamente l'immagine per spostare il riquadro
                </p>
              </div>

              {/* Right side: Position grid + cropped preview */}
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] text-neutral-500 mb-1.5 font-medium uppercase tracking-wide">Risultato finale (come apparirà nel sito)</p>
                  <div className="relative w-full rounded-lg overflow-hidden border-2 border-blue-200 bg-neutral-100" style={{ aspectRatio: '16/9' }}>
                    <img
                      src={selectedHero}
                      alt="Anteprima ritaglio"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: positionValue }}
                    />
                    {selectedOverlay !== 'none' && (
                      <div
                        className="absolute inset-0"
                        style={{
                          background: selectedOverlay === 'gradient'
                            ? 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)'
                            : HERO_OVERLAYS.find(o => o.id === selectedOverlay)?.value
                        }}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-neutral-500 mb-1.5 font-medium uppercase tracking-wide">Allineamento rapido</p>
                  <div className="grid grid-cols-3 gap-1 bg-neutral-100 p-1.5 rounded-lg w-fit">
                    {['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'].map((pos) => (
                      <button
                        key={pos}
                        data-testid={`hero-position-${pos}`}
                        onClick={() => handlePositionChange(pos)}
                        className={`w-11 h-11 rounded flex items-center justify-center text-lg font-bold transition-all ${
                          selectedPosition === pos
                            ? 'bg-blue-600 text-white shadow-md scale-105'
                            : 'bg-white hover:bg-blue-100 text-neutral-600 hover:scale-105'
                        }`}
                        title={HERO_POSITIONS.find(p => p.id === pos)?.name}
                      >
                        {pos === 'center' ? '●' : pos === 'top' ? '↑' : pos === 'bottom' ? '↓'
                         : pos === 'left' ? '←' : pos === 'right' ? '→'
                         : pos === 'top-left' ? '↖' : pos === 'top-right' ? '↗'
                         : pos === 'bottom-left' ? '↙' : '↘'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overlay Control */}
          <div className="mb-8">
            <Label className="text-base font-medium mb-3 block">🌫️ Oscuramento Immagine</Label>
            <p className="text-sm text-neutral-500 mb-4">Aggiungi un velo scuro per migliorare la leggibilità del testo</p>
            <div className="flex gap-2 flex-wrap">
              {HERO_OVERLAYS.map((overlay) => (
                <button
                  key={overlay.id}
                  onClick={() => handleOverlayChange(overlay.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedOverlay === overlay.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {overlay.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✓ Immagine configurata. Clicca "Salva Stile" per applicare le modifiche.
            </p>
          </div>
        </>
      )}
      
      {/* Watermark toggle */}
      <div className="mb-6 p-4 border-2 border-neutral-200 rounded-lg bg-neutral-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Label className="text-base font-medium block">Firma "Realizzato da WebFinder Studio"</Label>
            <p className="text-xs text-neutral-500 mt-1">
              Mostra una piccola firma cliccabile nel footer del sito. Ogni cliente diventa una vetrina per nuovi lead.
              Disattivala se il cliente paga per la versione white-label.
            </p>
          </div>
          <Switch
            checked={!hideMark}
            onCheckedChange={(v) => toggleWatermark(!v)}
            data-testid="toggle-watermark"
          />
        </div>
        <p className="text-xs mt-2 font-medium" style={{ color: hideMark ? '#dc2626' : '#16a34a' }}>
          {hideMark ? '⚠️ Firma nascosta (white-label attivo)' : '✓ Firma attiva sul sito'}
        </p>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="mr-2 animate-spin" size={16} />
            Salvataggio...
          </>
        ) : (
          <>
            <Save className="mr-2" size={16} />
            Salva Stile
          </>
        )}
      </Button>
    </Card>
  );
}

// Quote / Preventivo Modal
function QuoteModal({ open, onClose, demoId, businessName, defaultRecipient }) {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [notes, setNotes] = useState('');
  const [recipient, setRecipient] = useState(defaultRecipient || '');
  const [sendEmail, setSendEmail] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setRecipient(defaultRecipient || '');
    setLoadingProfile(true);
    axios.get(`${API}/leads?action=user_settings`)
      .then((r) => {
        const p = r.data || {};
        setProfile(p);
        setPrice(String(p.default_price ?? 800));
        setCurrency(p.default_currency || 'EUR');
      })
      .catch(() => { setPrice('800'); setCurrency('EUR'); })
      .finally(() => setLoadingProfile(false));
  }, [open, defaultRecipient]);

  if (!open) return null;

  const profileMissing = !profile || !profile.company_name || !profile.vat_number;

  const handleGenerate = async (alsoSend) => {
    setGenerating(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/demos/${demoId}?action=quote`, {
        price: parseFloat(price) || 0,
        currency,
        notes: notes.trim(),
        recipient_email: recipient.trim(),
        send_email: alsoSend
      });
      setResult(res.data);
      // trigger download
      if (res.data?.pdf_base64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${res.data.pdf_base64}`;
        link.download = res.data.filename || `Preventivo_${businessName}.pdf`;
        link.click();
      }
      if (alsoSend) {
        if (res.data.sent) {
          toast.success(`Preventivo inviato a ${res.data.recipient}`);
        } else if (res.data.send_error) {
          toast.error(`Invio fallito: ${res.data.send_error}`);
        }
      } else {
        toast.success('PDF generato');
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || 'Errore generazione preventivo');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-testid="quote-modal">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold">Genera Preventivo PDF</h2>
            <p className="text-sm text-neutral-500">Cliente: <span className="font-medium">{businessName}</span></p>
          </div>
          <button onClick={onClose} data-testid="close-quote-modal" className="p-2 hover:bg-neutral-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loadingProfile ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={28} /></div>
          ) : (
            <>
              {profileMissing && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
                  <strong>⚠️ Dati incompleti.</strong> Vai in <strong>Impostazioni → Dati Preventivi</strong> per inserire nome, P.IVA, logo e IBAN. Il PDF si genera lo stesso ma sarà privo dei tuoi dati di intestazione.
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="q-price">Prezzo</Label>
                  <Input
                    id="q-price"
                    data-testid="quote-price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="800"
                  />
                </div>
                <div>
                  <Label htmlFor="q-currency">Valuta</Label>
                  <select
                    id="q-currency"
                    data-testid="quote-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full border-2 border-neutral-200 rounded-md px-3 py-2 bg-white"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="q-notes">Note personalizzate (opzionali)</Label>
                <Textarea
                  id="q-notes"
                  data-testid="quote-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Es: Sconto -10% se accettato entro 7 giorni. Consegna in 5 giorni lavorativi."
                />
              </div>

              <div>
                <Label htmlFor="q-recipient">Email destinatario</Label>
                <Input
                  id="q-recipient"
                  data-testid="quote-recipient"
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="cliente@esempio.it"
                />
                <p className="text-xs text-neutral-500 mt-1">Verrà usato come destinatario se attivi "Invia anche al cliente".</p>
              </div>

              {result?.send_error && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                  <strong>Invio email fallito:</strong> {result.send_error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t border-neutral-200 flex flex-col sm:flex-row gap-2 sticky bottom-0 bg-white">
          <Button
            variant="outline"
            onClick={() => handleGenerate(false)}
            disabled={generating || loadingProfile}
            data-testid="quote-download-only"
            className="flex-1"
          >
            {generating ? <Loader2 className="mr-2 animate-spin" size={16} /> : <FileDown className="mr-2" size={16} />}
            Solo Scarica PDF
          </Button>
          <Button
            onClick={() => handleGenerate(true)}
            disabled={generating || loadingProfile || !recipient.trim()}
            data-testid="quote-generate-send"
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {generating ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Mail className="mr-2" size={16} />}
            Genera e Invia al cliente
          </Button>
        </div>
      </div>
    </div>
  );
}

// Template Manager Modal
function TemplateModal({ open, onClose, demoId, currentContent, onApplied }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'save' | 'ai'
  const [aiCategory, setAiCategory] = useState('');
  const [aiStyle, setAiStyle] = useState('moderno e professionale');
  const [aiGenerating, setAiGenerating] = useState(false);

  // When opening AI tab, prefill from current site's business data
  useEffect(() => {
    if (view === 'ai' && currentContent && !aiCategory) {
      const bd = currentContent.business_data || {};
      const auto = bd.category || currentContent.category || '';
      if (auto) setAiCategory(auto);
    }
  }, [view, currentContent, aiCategory]);

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/demos?action=templates`);
      setTemplates(r.data || []);
    } catch {
      toast.error('Errore caricamento template');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!name.trim()) { toast.error('Inserisci un nome'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(), category: category.trim(),
        color_scheme: currentContent.color_scheme,
        hero_position: currentContent.hero_position,
        hero_overlay: currentContent.hero_overlay,
        theme: currentContent.theme,
        why_choose_us: currentContent.why_choose_us,
        faq: currentContent.faq,
        about_text: currentContent.texts?.about_text,
        homepage_subtitle: currentContent.texts?.homepage_subtitle,
        services_intro: currentContent.texts?.services_intro,
        cta_text: currentContent.texts?.cta_text,
        tagline: currentContent.texts?.tagline
      };
      await axios.post(`${API}/demos?action=template_save`, payload);
      toast.success('Template salvato');
      setName(''); setCategory(''); setView('list');
      refresh();
    } catch (e) {
      toast.error('Errore salvataggio template');
    } finally { setSaving(false); }
  };

  const applyTemplate = async (tid) => {
    try {
      const r = await axios.post(`${API}/demos/${demoId}?action=template_apply`, { template_id: tid });
      toast.success(`Template "${r.data.template_name}" applicato`);
      onApplied?.();
      onClose();
    } catch { toast.error('Errore applicazione template'); }
  };

  const deleteTemplate = async (tid) => {
    if (!window.confirm('Eliminare questo template?')) return;
    try {
      await axios.delete(`${API}/demos?action=template_delete&id=${tid}`);
      toast.success('Template eliminato');
      refresh();
    } catch { toast.error('Errore eliminazione'); }
  };

  const aiGenerateTemplate = async (applyDirectly = false) => {
    const bd = currentContent?.business_data || {};
    const cat = (bd.category || aiCategory || '').trim();
    const bname = bd.name || currentContent?.business_name || '';
    const city = bd.city || '';
    if (!cat && !bname) {
      toast.error('Manca categoria o nome attività');
      return;
    }
    setAiGenerating(true);
    try {
      const payload = {
        business_name: bname,
        city,
        category: cat,
        style: aiStyle.trim() || 'moderno',
        save: !applyDirectly
      };
      const r = await axios.post(`${API}/demos?action=template_ai_generate`, payload);

      if (applyDirectly && r.data?.preview) {
        // Apply the AI-generated content directly to this demo
        await axios.post(`${API}/demos/${demoId}?action=template_apply_inline`, {
          data: r.data.preview
        });
        toast.success('Contenuti AI applicati al sito!');
        onApplied?.();
        onClose();
      } else {
        toast.success(`Template AI "${r.data.template?.name || 'nuovo'}" creato!`);
        setView('list');
        refresh();
      }
    } catch (e) {
      const msg = e.response?.data?.error || 'Errore generazione AI';
      toast.error(msg);
    } finally { setAiGenerating(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-testid="template-modal">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold">Template di Sito</h2>
            <p className="text-sm text-neutral-500">Riusa stile + contenuti su nuovi siti in 1 click</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="p-2 flex gap-2 border-b border-neutral-100 overflow-x-auto">
          <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')} data-testid="tpl-tab-list" className="shrink-0">📚 I miei template</Button>
          <Button variant={view === 'save' ? 'default' : 'ghost'} size="sm" onClick={() => setView('save')} data-testid="tpl-tab-save" className="shrink-0">💾 Salva questo sito</Button>
          <Button variant={view === 'ai' ? 'default' : 'ghost'} size="sm" onClick={() => setView('ai')} data-testid="tpl-tab-ai" className="shrink-0">✨ Genera con AI</Button>
        </div>

        <div className="p-5">
          {view === 'ai' ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-900 mb-1">✨ AI per questa attività</p>
                <p className="text-xs text-purple-700">
                  Claude Sonnet 4.5 leggerà i dati dell'azienda corrente e creerà contenuti su misura: tagline, sezione "Perché Sceglierci" (4 motivi), 5 FAQ specifiche, testi about/CTA, colore consigliato. Tutto in italiano e contestualizzato.
                </p>
              </div>

              <div className="border-2 border-neutral-200 rounded-lg p-3 bg-neutral-50">
                <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold mb-1">Per l'attività:</p>
                <p className="font-bold text-base" data-testid="ai-target-name">
                  {currentContent?.business_data?.name || currentContent?.business_name || '—'}
                </p>
                <p className="text-sm text-neutral-600">
                  {currentContent?.business_data?.category || 'Categoria non specificata'}
                  {currentContent?.business_data?.city && ` · ${currentContent.business_data.city}`}
                </p>
              </div>

              <div>
                <Label htmlFor="ai-style">Stile desiderato</Label>
                <select
                  id="ai-style"
                  data-testid="ai-style"
                  value={aiStyle}
                  onChange={(e) => setAiStyle(e.target.value)}
                  className="w-full mt-1 border-2 border-neutral-200 rounded-md px-3 py-2 bg-white text-sm"
                >
                  <option value="moderno e professionale">Moderno e professionale</option>
                  <option value="premium e lusso">Premium e lusso</option>
                  <option value="minimal e pulito">Minimal e pulito</option>
                  <option value="giovanile e colorato">Giovanile e colorato</option>
                  <option value="elegante e raffinato">Elegante e raffinato</option>
                  <option value="vintage e tradizionale">Vintage e tradizionale</option>
                  <option value="energetico e sportivo">Energetico e sportivo</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => aiGenerateTemplate(true)}
                  disabled={aiGenerating}
                  data-testid="ai-apply-direct-btn"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  {aiGenerating ? (
                    <><Loader2 className="mr-2 animate-spin" size={16} /> Sto generando...</>
                  ) : (
                    <>✨ Applica subito a questo sito</>
                  )}
                </Button>
                <Button
                  onClick={() => aiGenerateTemplate(false)}
                  disabled={aiGenerating}
                  variant="outline"
                  data-testid="ai-save-template-btn"
                  className="flex-1"
                >
                  Salva solo come template
                </Button>
              </div>
              <p className="text-[11px] text-neutral-500 text-center">
                Costo ~pochi centesimi sul Universal Key Emergent · ~10 sec di attesa
              </p>
            </div>
          ) : view === 'save' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="tpl-name">Nome template *</Label>
                <Input id="tpl-name" data-testid="tpl-name" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder='Es: "Pizzeria Premium 800€" oppure "Parrucchiere Lusso"' />
              </div>
              <div>
                <Label htmlFor="tpl-cat">Categoria (opzionale)</Label>
                <Input id="tpl-cat" data-testid="tpl-cat" value={category} onChange={(e) => setCategory(e.target.value)}
                  placeholder="Es: ristorante, parrucchiere, dentista..." />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                Verranno salvati: <strong>colore</strong>, posizione hero, oscuramento, sezione "Perché Sceglierci", FAQ, testo about/sottotitolo/CTA. Le immagini, gli orari e i contatti sono sempre specifici per ogni cliente e non vengono memorizzati.
              </div>
              <Button onClick={saveTemplate} disabled={saving} data-testid="tpl-save-btn" className="w-full">
                {saving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />}
                Salva come Template
              </Button>
            </div>
          ) : (
            <>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={28} /></div>
              ) : templates.length === 0 ? (
                <div className="text-center py-10 text-neutral-500">
                  <p>Nessun template ancora.</p>
                  <p className="text-sm mt-2">Vai su "Salva questo sito come template" per crearne uno.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <div key={t.template_id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50" data-testid={`tpl-row-${t.template_id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate flex items-center gap-1.5">
                          {t.ai_generated && <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-bold">AI</span>}
                          {t.name}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">
                          {t.category && <span className="mr-2 px-1.5 py-0.5 bg-neutral-100 rounded">{t.category}</span>}
                          Colore: <span className="font-medium">{t.data?.color_scheme || '—'}</span>
                          {' · '}FAQ: {(t.data?.faq || []).length} · Perché: {(t.data?.why_choose_us || []).length}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" onClick={() => applyTemplate(t.template_id)} data-testid={`tpl-apply-${t.template_id}`}>Applica</Button>
                        <button onClick={() => deleteTemplate(t.template_id)} data-testid={`tpl-del-${t.template_id}`}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SiteEditor() {
  const { demoId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [republishing, setRepublishing] = useState(false);
  const [siteData, setSiteData] = useState(null);
  const [hasChanges, setHasChanges] = useState({});
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  // Load site data
  useEffect(() => {
    loadSiteData();
  }, [demoId]);

  const loadSiteData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/demos/${demoId}?action=editor-data`);
      setSiteData(response.data);
      setHasChanges({});
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      toast.error('Errore nel caricamento dei dati del sito');
    } finally {
      setLoading(false);
    }
  };

  // Save a section
  const saveSection = async (section, data) => {
    setSaving(prev => ({ ...prev, [section]: true }));
    try {
      const response = await axios.post(`${API}/demos/${demoId}?action=update`, {
        section,
        data
      });
      
      if (response.data.success) {
        toast.success(`Sezione "${section}" salvata!`);
        setHasChanges(prev => ({ ...prev, [section]: false }));
      } else {
        toast.error(response.data.errors?.join(', ') || 'Errore salvataggio');
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
      toast.error(error.response?.data?.detail || 'Errore durante il salvataggio');
    } finally {
      setSaving(prev => ({ ...prev, [section]: false }));
    }
  };

  // Republish
  const handleRepublish = async () => {
    setRepublishing(true);
    try {
      const response = await axios.post(`${API}/demos/${demoId}?action=republish`);
      if (response.data.success) {
        toast.success('Sito ripubblicato con successo!');
        setSiteData(prev => ({
          ...prev,
          production_url: response.data.production_url,
          publish_status: 'published'
        }));
      } else {
        toast.error(response.data.error || 'Errore durante la ripubblicazione');
      }
    } catch (error) {
      console.error('Errore ripubblicazione:', error);
      toast.error(error.response?.data?.detail || 'Errore durante la ripubblicazione');
    } finally {
      setRepublishing(false);
    }
  };

  // Update local state
  const updateSection = useCallback((section, newData) => {
    setSiteData(prev => ({
      ...prev,
      [section]: newData
    }));
    setHasChanges(prev => ({ ...prev, [section]: true }));
  }, []);

  if (loading) {
    return (
      <div data-testid="editor-loading" className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!siteData) {
    return (
      <div data-testid="editor-error" className="text-center py-12">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <p className="text-lg">Sito non trovato</p>
        <Button onClick={() => navigate('/demos')} className="mt-4">
          Torna ai Siti Demo
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="site-editor-page" className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/demos')}
            data-testid="back-to-demos"
          >
            <ArrowLeft size={20} className="mr-2" />
            Indietro
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{siteData.business_name}</h1>
            <p className="text-sm text-neutral-500">Editor Sito</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setTemplateOpen(true)}
            data-testid="open-templates-btn"
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <FileText size={16} className="mr-2" />
            Template
          </Button>
          <Button
            onClick={() => setQuoteOpen(true)}
            data-testid="open-quote-btn"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FileDown size={16} className="mr-2" />
            Preventivo
          </Button>
          {siteData.production_url && (
            <a
              href={siteData.production_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink size={14} />
              Vedi sito live
            </a>
          )}
          <Badge variant={siteData.publish_status === 'published' ? 'default' : 'secondary'}>
            {siteData.publish_status === 'published' ? 'Online' : 'Bozza'}
          </Badge>
        </div>
      </div>

      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        demoId={demoId}
        businessName={siteData.business_name}
        defaultRecipient={siteData.client_settings?.client_email || siteData.contacts?.email || ''}
      />

      <TemplateModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        demoId={demoId}
        currentContent={siteData}
        onApplied={loadSiteData}
      />

      {/* Tabs Editor */}
      <Tabs defaultValue="logo" className="w-full">
        <TabsList className="grid w-full grid-cols-5 sm:grid-cols-11 mb-6 gap-1">
          {/* Tab Cliente in evidenza - primo posto */}
          <TabsTrigger value="client" data-testid="tab-client" className="flex items-center gap-1 text-xs sm:text-sm bg-orange-100 text-orange-700 data-[state=active]:bg-orange-500 data-[state=active]:text-white border border-orange-300 font-semibold">
            <Settings size={14} />
            <span className="hidden sm:inline">Cliente</span>
          </TabsTrigger>
          <TabsTrigger value="logo" data-testid="tab-logo" className="flex items-center gap-1 text-xs sm:text-sm">
            <ImageIcon size={14} />
            <span className="hidden sm:inline">Logo</span>
          </TabsTrigger>
          <TabsTrigger value="style" data-testid="tab-style" className="flex items-center gap-1 text-xs sm:text-sm">
            <Palette size={14} />
            <span className="hidden sm:inline">Stile</span>
          </TabsTrigger>
          <TabsTrigger value="hours" data-testid="tab-hours" className="flex items-center gap-1 text-xs sm:text-sm">
            <Clock size={14} />
            <span className="hidden sm:inline">Orari</span>
          </TabsTrigger>
          <TabsTrigger value="menu" data-testid="tab-menu" className="flex items-center gap-1 text-xs sm:text-sm">
            <UtensilsCrossed size={14} />
            <span className="hidden sm:inline">Menu</span>
          </TabsTrigger>
          <TabsTrigger value="texts" data-testid="tab-texts" className="flex items-center gap-1 text-xs sm:text-sm">
            <FileText size={14} />
            <span className="hidden sm:inline">Testi</span>
          </TabsTrigger>
          <TabsTrigger value="whyus" data-testid="tab-whyus" className="flex items-center gap-1 text-xs sm:text-sm">
            <Star size={14} />
            <span className="hidden sm:inline">Perché Noi</span>
          </TabsTrigger>
          <TabsTrigger value="faq" data-testid="tab-faq" className="flex items-center gap-1 text-xs sm:text-sm">
            <HelpCircle size={14} />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" data-testid="tab-contacts" className="flex items-center gap-1 text-xs sm:text-sm">
            <Phone size={14} />
            <span className="hidden sm:inline">Contatti</span>
          </TabsTrigger>
          <TabsTrigger value="gallery" data-testid="tab-gallery" className="flex items-center gap-1 text-xs sm:text-sm">
            <Images size={14} />
            <span className="hidden sm:inline">Galleria</span>
          </TabsTrigger>
          <TabsTrigger value="seo" data-testid="tab-seo" className="flex items-center gap-1 text-xs sm:text-sm">
            <Search size={14} />
            <span className="hidden sm:inline">SEO</span>
          </TabsTrigger>
          <TabsTrigger value="layout" data-testid="tab-layout" className="flex items-center gap-1 text-xs sm:text-sm bg-purple-100 text-purple-700 data-[state=active]:bg-purple-600 data-[state=active]:text-white border border-purple-300 font-semibold">
            <GripVertical size={14} />
            <span className="hidden sm:inline">Layout</span>
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings" className="flex items-center gap-1 text-xs sm:text-sm bg-blue-100 text-blue-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white border border-blue-300 font-semibold">
            <Settings size={14} />
            <span className="hidden sm:inline">Impostazioni</span>
          </TabsTrigger>
        </TabsList>

        {/* LOGO */}
        <TabsContent value="logo">
          <LogoEditor
            logoBase64={siteData.logo_base64}
            demoId={demoId}
            onSave={saveSection}
            saving={saving.logo}
            onLogoUpdated={loadSiteData}
          />
        </TabsContent>

        {/* STILE - Hero e Colori */}
        <TabsContent value="style">
          <StyleEditor 
            heroImage={siteData.hero_image}
            heroPosition={siteData.hero_position || 'center'}
            heroOverlay={siteData.hero_overlay || 'medium'}
            colorScheme={siteData.color_scheme || 'blue'}
            theme={siteData.theme || 'modern'}
            designTemplate={siteData.design_template || 'classic'}
            textColor={siteData.text_color || 'black'}
            colorIntensity={siteData.color_intensity || 'vivid'}
            gallery={siteData.gallery || []}
            businessName={siteData.business_name}
            businessCategory={siteData.business_data?.category || siteData.category}
            demoId={demoId}
            productionUrl={siteData.production_url}
            hideWatermark={siteData.hide_watermark}
            onUpdate={(data) => {
              setSiteData(prev => ({
                ...prev,
                hero_image: data.hero_image !== undefined ? data.hero_image : prev.hero_image,
                hero_position: data.hero_position !== undefined ? data.hero_position : prev.hero_position,
                hero_overlay: data.hero_overlay !== undefined ? data.hero_overlay : prev.hero_overlay,
                color_scheme: data.color_scheme !== undefined ? data.color_scheme : prev.color_scheme,
                theme: data.theme !== undefined ? data.theme : prev.theme,
                design_template: data.design_template !== undefined ? data.design_template : prev.design_template,
                text_color: data.text_color !== undefined ? data.text_color : prev.text_color,
                color_intensity: data.color_intensity !== undefined ? data.color_intensity : prev.color_intensity,
              }));
              setHasChanges(prev => ({ ...prev, style: true }));
            }}
            onSave={(styleData) => saveSection('style', styleData)}
            saving={saving.style}
          />
        </TabsContent>

        {/* ORARI */}
        <TabsContent value="hours">
          <HoursEditor 
            hours={siteData.hours} 
            onUpdate={(data) => updateSection('hours', data)}
            onSave={() => saveSection('hours', siteData.hours)}
            saving={saving.hours}
            hasChanges={hasChanges.hours}
          />
        </TabsContent>

        {/* MENU / SERVIZI */}
        <TabsContent value="menu">
          <MenuEditor
            menu={siteData.menu}
            onUpdate={(data) => updateSection('menu', data)}
            onSave={() => saveSection('menu', siteData.menu)}
            saving={saving.menu}
            hasChanges={hasChanges.menu}
          />
        </TabsContent>

        {/* TESTI */}
        <TabsContent value="texts">
          <TextsEditor
            texts={siteData.texts}
            localeLang={siteData.locale_lang}
            onUpdate={(data) => updateSection('texts', data)}
            onSave={() => saveSection('texts', siteData.texts)}
            saving={saving.texts}
            hasChanges={hasChanges.texts}
          />
        </TabsContent>

        {/* PERCHÉ SCEGLIERCI */}
        <TabsContent value="whyus">
          <WhyUsEditor
            whyUs={siteData.why_choose_us}
            onUpdate={(data) => updateSection('why_choose_us', data)}
            onSave={() => saveSection('why_choose_us', siteData.why_choose_us)}
            saving={saving.why_choose_us}
            hasChanges={hasChanges.why_choose_us}
          />
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq">
          <FaqEditor
            faq={siteData.faq}
            onUpdate={(data) => updateSection('faq', data)}
            onSave={() => saveSection('faq', siteData.faq)}
            saving={saving.faq}
            hasChanges={hasChanges.faq}
          />
        </TabsContent>

        {/* CONTATTI */}
        <TabsContent value="contacts">
          <ContactsEditor
            contacts={siteData.contacts}
            onUpdate={(data) => updateSection('contacts', data)}
            onSave={() => saveSection('contacts', siteData.contacts)}
            saving={saving.contacts}
            hasChanges={hasChanges.contacts}
          />
        </TabsContent>

        {/* GALLERIA */}
        <TabsContent value="gallery">
          <GalleryEditor
            gallery={siteData.gallery}
            category={siteData.business_data?.category || siteData.category}
            businessName={siteData.business_name}
            onUpdate={(data) => updateSection('gallery', data)}
            onSave={() => saveSection('gallery', { images: siteData.gallery })}
            saving={saving.gallery}
            hasChanges={hasChanges.gallery}
          />
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo">
          <SeoEditor
            seo={siteData.seo}
            localeLang={siteData.locale_lang}
            onUpdate={(data) => updateSection('seo', data)}
            onSave={() => saveSection('seo', siteData.seo)}
            saving={saving.seo}
            hasChanges={hasChanges.seo}
          />
        </TabsContent>

        {/* IMPOSTAZIONI CLIENTE */}
        <TabsContent value="client">
          <ClientSettingsEditor
            settings={siteData.client_settings}
            bookingMode={siteData.contacts?.booking_mode || 'none'}
            onUpdate={(data) => updateSection('client_settings', data)}
            onSave={() => saveSection('client_settings', siteData.client_settings)}
            saving={saving.client_settings}
            hasChanges={hasChanges.client_settings}
          />
        </TabsContent>

        <TabsContent value="settings">
          <SiteSettingsEditor
            siteLanguage={siteData.site_language}
            translations={siteData.translations}
            bookingMode={siteData.booking_mode}
            externalBookingUrl={siteData.external_booking_url}
            showReviews={siteData.show_reviews}
            showGallery={siteData.show_gallery}
            showWhyus={siteData.show_whyus}
            showFaq={siteData.show_faq}
            showHours={siteData.show_hours}
            showMap={siteData.show_map}
            showServices={siteData.show_services}
            onUpdate={(d) => updateSection('site_settings', d)}
            onSave={(d) => saveSection('site_settings', d)}
            saving={saving.site_settings}
          />
        </TabsContent>

        <TabsContent value="layout">
          <SectionOrderEditor
            sectionOrder={siteData.section_order}
            showReviews={siteData.show_reviews}
            showGallery={siteData.show_gallery}
            showWhyus={siteData.show_whyus}
            showFaq={siteData.show_faq}
            showHours={siteData.show_hours}
            showMap={siteData.show_map}
            showServices={siteData.show_services}
            onSave={(d) => saveSection('layout', d)}
            onSaveVisibility={(d) => saveSection('site_settings', d)}
            saving={saving.layout || saving.site_settings}
          />
        </TabsContent>
      </Tabs>

      {/* Republish Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-center z-50">
        <Button
          data-testid="republish-btn"
          onClick={handleRepublish}
          disabled={republishing}
          className="bg-green-600 hover:bg-green-700 px-8"
          size="lg"
        >
          {republishing ? (
            <>
              <Loader2 className="mr-2 animate-spin" size={18} />
              Ripubblicazione...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2" size={18} />
              Ripubblica su Vercel
            </>
          )}
        </Button>
      </div>

      {/* Spacer for fixed button */}
      <div className="h-24" />
    </div>
  );
}

// ========== SUB-COMPONENTS ==========

function SaveButton({ onClick, saving, hasChanges }) {
  return (
    <Button
      onClick={onClick}
      disabled={saving || !hasChanges}
      className="mt-4"
      data-testid="save-section-btn"
    >
      {saving ? (
        <Loader2 className="mr-2 animate-spin" size={16} />
      ) : hasChanges ? (
        <Save className="mr-2" size={16} />
      ) : (
        <CheckCircle className="mr-2" size={16} />
      )}
      {saving ? 'Salvataggio...' : hasChanges ? 'Salva Modifiche' : 'Salvato'}
    </Button>
  );
}

// LOGO EDITOR
function LogoEditor({ logoBase64, demoId, onSave, saving, onLogoUpdated }) {
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewBase64, setPreviewBase64] = useState(logoBase64);

  const handleUrlUpload = async () => {
    if (!logoUrl || !logoUrl.startsWith('http')) {
      toast.error('Inserisci un URL valido (inizia con http)');
      return;
    }
    
    setUploading(true);
    try {
      const response = await axios.post(`${API}/demos/${demoId}?action=update`, {
        section: 'logo',
        data: { logo_url: logoUrl }
      });
      
      if (response.data.success) {
        toast.success('Logo aggiornato!');
        setLogoUrl('');
        onLogoUpdated(); // Refresh data
      } else {
        toast.error(response.data.errors?.join(', ') || 'Errore upload');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine valido');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Il file è troppo grande (max 2MB)');
      return;
    }
    
    setUploading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1]; // Remove data:image/...;base64, prefix
        
        const response = await axios.post(`${API}/demos/${demoId}?action=update`, {
          section: 'logo',
          data: { logo_base64: base64 }
        });
        
        if (response.data.success) {
          toast.success('Logo caricato!');
          onLogoUpdated();
        } else {
          toast.error(response.data.errors?.join(', ') || 'Errore upload');
        }
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error('Errore lettura file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Errore durante l\'upload');
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setUploading(true);
    try {
      const response = await axios.post(`${API}/demos/${demoId}?action=update`, {
        section: 'logo',
        data: { remove_logo: true }
      });
      
      if (response.data.success) {
        toast.success('Logo rimosso');
        onLogoUpdated();
      } else {
        toast.error('Errore rimozione logo');
      }
    } catch (error) {
      toast.error('Errore durante la rimozione');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6" data-testid="logo-editor">
      <h2 className="text-xl font-semibold mb-4">Logo Aziendale</h2>
      
      {/* Current Logo Preview */}
      <div className="mb-6">
        <Label className="text-sm text-neutral-500 mb-2 block">Logo Attuale</Label>
        <div className="flex items-center gap-4">
          {logoBase64 ? (
            <div className="relative">
              <img
                src={`data:image/png;base64,${logoBase64}`}
                alt="Logo attuale"
                className="w-32 h-32 object-contain bg-neutral-100 rounded-lg border p-2"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2"
                onClick={handleRemoveLogo}
                disabled={uploading}
              >
                <X size={14} />
              </Button>
            </div>
          ) : (
            <div className="w-32 h-32 bg-neutral-100 rounded-lg border flex items-center justify-center">
              <ImageIcon size={32} className="text-neutral-300" />
            </div>
          )}
        </div>
      </div>

      {/* Upload Options */}
      <div className="space-y-4">
        {/* Option 1: URL */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Carica da URL</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://esempio.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              data-testid="logo-url-input"
            />
            <Button 
              onClick={handleUrlUpload} 
              disabled={uploading || !logoUrl}
              data-testid="logo-url-upload-btn"
            >
              {uploading ? <Loader2 className="animate-spin" size={16} /> : 'Carica'}
            </Button>
          </div>
        </div>

        {/* Option 2: File Upload */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Carica da File</Label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="logo-file-input"
              data-testid="logo-file-input"
            />
            <label
              htmlFor="logo-file-input"
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer transition-colors"
            >
              <Upload size={16} />
              Seleziona File
            </label>
            <span className="text-xs text-neutral-500">PNG, JPG, WebP (max 2MB)</span>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="mt-4 flex items-center gap-2 text-blue-600">
          <Loader2 className="animate-spin" size={16} />
          <span>Caricamento in corso...</span>
        </div>
      )}
    </Card>
  );
}

// HOURS EDITOR
function HoursEditor({ hours, onUpdate, onSave, saving, hasChanges }) {
  const updateDay = (dayCode, field, value) => {
    const newHours = { ...hours };
    newHours[dayCode] = { ...newHours[dayCode], [field]: value };
    onUpdate(newHours);
  };

  return (
    <Card className="p-6" data-testid="hours-editor">
      <h2 className="text-xl font-semibold mb-4">Orari di Apertura</h2>
      <div className="space-y-4">
        {DAYS.map(day => (
          <div key={day.code} className="flex items-center gap-4 p-3 bg-neutral-50 rounded-lg">
            <div className="w-24 font-medium">{day.name}</div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={!hours[day.code]?.closed}
                onCheckedChange={(checked) => updateDay(day.code, 'closed', !checked)}
                data-testid={`hours-${day.code}-switch`}
              />
              <span className="text-sm text-neutral-500">
                {hours[day.code]?.closed ? 'Chiuso' : 'Aperto'}
              </span>
            </div>

            {!hours[day.code]?.closed && (
              <>
                <Input
                  type="time"
                  value={hours[day.code]?.open || ''}
                  onChange={(e) => updateDay(day.code, 'open', e.target.value)}
                  className="w-32"
                  data-testid={`hours-${day.code}-open`}
                />
                <span>-</span>
                <Input
                  type="time"
                  value={hours[day.code]?.close || ''}
                  onChange={(e) => updateDay(day.code, 'close', e.target.value)}
                  className="w-32"
                  data-testid={`hours-${day.code}-close`}
                />
                <Input
                  type="text"
                  placeholder="Note (opzionale)"
                  value={hours[day.code]?.note || ''}
                  onChange={(e) => updateDay(day.code, 'note', e.target.value)}
                  className="flex-1"
                  data-testid={`hours-${day.code}-note`}
                />
              </>
            )}
          </div>
        ))}
      </div>
      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// MENU EDITOR
function MenuEditor({ menu, onUpdate, onSave, saving, hasChanges }) {
  const isMenuMode = menu?.mode === 'menu';

  const addCategory = () => {
    const newCategories = [...(menu.categories || []), { name: '', items: [''] }];
    onUpdate({ ...menu, categories: newCategories });
  };

  const updateCategory = (index, field, value) => {
    const newCategories = [...(menu.categories || [])];
    newCategories[index] = { ...newCategories[index], [field]: value };
    onUpdate({ ...menu, categories: newCategories });
  };

  const addItemToCategory = (catIndex) => {
    const newCategories = [...(menu.categories || [])];
    newCategories[catIndex].items = [...(newCategories[catIndex].items || []), ''];
    onUpdate({ ...menu, categories: newCategories });
  };

  const updateItem = (catIndex, itemIndex, value) => {
    const newCategories = [...(menu.categories || [])];
    newCategories[catIndex].items[itemIndex] = value;
    onUpdate({ ...menu, categories: newCategories });
  };

  const removeItem = (catIndex, itemIndex) => {
    const newCategories = [...(menu.categories || [])];
    newCategories[catIndex].items = newCategories[catIndex].items.filter((_, i) => i !== itemIndex);
    onUpdate({ ...menu, categories: newCategories });
  };

  const removeCategory = (index) => {
    const newCategories = (menu.categories || []).filter((_, i) => i !== index);
    onUpdate({ ...menu, categories: newCategories });
  };

  // Services mode
  const addService = () => {
    const newServices = [...(menu.services || []), ''];
    onUpdate({ ...menu, services: newServices });
  };

  const updateService = (index, value) => {
    const newServices = [...(menu.services || [])];
    newServices[index] = value;
    onUpdate({ ...menu, services: newServices });
  };

  const removeService = (index) => {
    const newServices = (menu.services || []).filter((_, i) => i !== index);
    onUpdate({ ...menu, services: newServices });
  };

  return (
    <Card className="p-6" data-testid="menu-editor">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {isMenuMode ? 'Menu' : 'Servizi'}
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className={!isMenuMode ? 'font-medium' : 'text-neutral-400'}>Servizi</span>
          <Switch
            checked={isMenuMode}
            onCheckedChange={(checked) => onUpdate({ ...menu, mode: checked ? 'menu' : 'services' })}
            data-testid="menu-mode-switch"
          />
          <span className={isMenuMode ? 'font-medium' : 'text-neutral-400'}>Menu</span>
        </div>
      </div>

      {isMenuMode ? (
        // Menu categories
        <div className="space-y-6">
          {(menu.categories || []).map((category, catIndex) => (
            <div key={catIndex} className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Input
                  placeholder="Nome categoria (es. Antipasti)"
                  value={category.name || ''}
                  onChange={(e) => updateCategory(catIndex, 'name', e.target.value)}
                  className="font-medium"
                  data-testid={`category-${catIndex}-name`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCategory(catIndex)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              
              <div className="space-y-2 ml-4">
                {(category.items || []).map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center gap-2">
                    <GripVertical size={16} className="text-neutral-300" />
                    <Input
                      placeholder="Nome piatto"
                      value={item || ''}
                      onChange={(e) => updateItem(catIndex, itemIndex, e.target.value)}
                      data-testid={`category-${catIndex}-item-${itemIndex}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(catIndex, itemIndex)}
                      className="text-neutral-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addItemToCategory(catIndex)}
                  className="text-blue-600"
                >
                  <Plus size={16} className="mr-1" />
                  Aggiungi piatto
                </Button>
              </div>
            </div>
          ))}
          
          <Button variant="outline" onClick={addCategory} data-testid="add-category-btn">
            <Plus size={16} className="mr-2" />
            Aggiungi Categoria
          </Button>
        </div>
      ) : (
        // Services list
        <div className="space-y-3">
          {(menu.services || []).map((service, index) => (
            <div key={index} className="flex items-center gap-2">
              <GripVertical size={16} className="text-neutral-300" />
              <Input
                placeholder="Nome servizio"
                value={service || ''}
                onChange={(e) => updateService(index, e.target.value)}
                data-testid={`service-${index}`}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeService(index)}
                className="text-neutral-400 hover:text-red-500"
              >
                <X size={16} />
              </Button>
            </div>
          ))}
          
          <Button variant="outline" onClick={addService} data-testid="add-service-btn">
            <Plus size={16} className="mr-2" />
            Aggiungi Servizio
          </Button>
        </div>
      )}

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// TEXTS EDITOR
function TextsEditor({ texts, localeLang, onUpdate, onSave, saving, hasChanges }) {
  const langLabel = localeLang === 'it' ? 'Italiano' : localeLang.toUpperCase();

  return (
    <Card className="p-6" data-testid="texts-editor">
      <h2 className="text-xl font-semibold mb-4">Testi del Sito</h2>
      
      <div className="space-y-6">
        {/* Tagline */}
        <div>
          <Label className="text-base font-medium">Tagline / Slogan</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <Label className="text-xs text-neutral-500">{langLabel}</Label>
              <Input
                placeholder={`Tagline in ${langLabel}`}
                value={texts?.tagline_local || ''}
                onChange={(e) => onUpdate({ ...texts, tagline_local: e.target.value })}
                data-testid="tagline-local"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-500">English</Label>
              <Input
                placeholder="Tagline in English"
                value={texts?.tagline_en || ''}
                onChange={(e) => onUpdate({ ...texts, tagline_en: e.target.value })}
                data-testid="tagline-en"
              />
            </div>
          </div>
        </div>

        {/* About */}
        <div>
          <Label className="text-base font-medium">Chi Siamo</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <Label className="text-xs text-neutral-500">{langLabel}</Label>
              <Textarea
                placeholder={`Descrizione in ${langLabel}`}
                value={texts?.about_local || ''}
                onChange={(e) => onUpdate({ ...texts, about_local: e.target.value })}
                rows={5}
                data-testid="about-local"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-500">English</Label>
              <Textarea
                placeholder="Description in English"
                value={texts?.about_en || ''}
                onChange={(e) => onUpdate({ ...texts, about_en: e.target.value })}
                rows={5}
                data-testid="about-en"
              />
            </div>
          </div>
        </div>
      </div>

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// CONTACTS EDITOR
function ContactsEditor({ contacts, onUpdate, onSave, saving, hasChanges }) {
  return (
    <Card className="p-6" data-testid="contacts-editor">
      <h2 className="text-xl font-semibold mb-4">Informazioni di Contatto</h2>
      
      <div className="space-y-4 max-w-md">
        <div>
          <Label>Telefono</Label>
          <Input
            type="tel"
            placeholder="+39 123 456 7890"
            value={contacts?.phone || ''}
            onChange={(e) => onUpdate({ ...contacts, phone: e.target.value })}
            data-testid="contact-phone"
          />
        </div>
        
        <div>
          <Label>WhatsApp</Label>
          <Input
            type="tel"
            placeholder="+39 123 456 7890"
            value={contacts?.whatsapp || ''}
            onChange={(e) => onUpdate({ ...contacts, whatsapp: e.target.value })}
            data-testid="contact-whatsapp"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Lascia vuoto per usare lo stesso numero del telefono
          </p>
        </div>
        
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="info@esempio.it"
            value={contacts?.email || ''}
            onChange={(e) => onUpdate({ ...contacts, email: e.target.value })}
            data-testid="contact-email"
          />
        </div>
        
        {/* Social Media Links */}
        <div className="pt-4 border-t">
          <h3 className="text-lg font-medium mb-3">Social Media</h3>
          <p className="text-sm text-neutral-500 mb-4">
            Aggiungi i link ai profili social dell'attività
          </p>
          
          <div className="space-y-3">
            <div>
              <Label>Instagram</Label>
              <Input
                type="url"
                placeholder="https://instagram.com/tuoprofilo"
                value={contacts?.instagram_url || ''}
                onChange={(e) => onUpdate({ ...contacts, instagram_url: e.target.value })}
                data-testid="contact-instagram"
              />
            </div>
            
            <div>
              <Label>Facebook</Label>
              <Input
                type="url"
                placeholder="https://facebook.com/tuapagina"
                value={contacts?.facebook_url || ''}
                onChange={(e) => onUpdate({ ...contacts, facebook_url: e.target.value })}
                data-testid="contact-facebook"
              />
            </div>
            
            <div>
              <Label>TikTok</Label>
              <Input
                type="url"
                placeholder="https://tiktok.com/@tuoprofilo"
                value={contacts?.tiktok_url || ''}
                onChange={(e) => onUpdate({ ...contacts, tiktok_url: e.target.value })}
                data-testid="contact-tiktok"
              />
            </div>
          </div>
        </div>
      </div>

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// GALLERY EDITOR
function GalleryEditor({ gallery, category, businessName, onUpdate, onSave, saving, hasChanges }) {
  const [newUrl, setNewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  // === Pexels search ===
  const [pexelsQuery, setPexelsQuery] = useState('');
  const [pexelsResults, setPexelsResults] = useState([]);
  const [pexelsLoading, setPexelsLoading] = useState(false);
  const [pexelsOpen, setPexelsOpen] = useState(false);

  useEffect(() => {
    // Prefill query: categoria + nome attività
    if (category && !pexelsQuery) {
      setPexelsQuery(category);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const searchPexels = async () => {
    const q = pexelsQuery.trim();
    if (!q) { toast.error('Inserisci una parola chiave'); return; }
    setPexelsLoading(true);
    try {
      const r = await axios.get(`${API}/leads?action=pexels_search&query=${encodeURIComponent(q)}&per_page=15&orientation=landscape`);
      const photos = r.data?.photos || [];
      setPexelsResults(photos);
      if (photos.length === 0) toast.info('Nessuna foto trovata, prova un\'altra parola chiave');
    } catch (e) {
      const msg = e.response?.data?.detail || e.response?.data?.error || 'Errore Pexels';
      // Messaggio amichevole per il caso del throttling temporaneo
      if (String(msg).includes('401') || String(msg).toLowerCase().includes('unauthor')) {
        toast.error('Pexels temporaneamente non disponibile (anti-bot). Riprova fra qualche minuto.');
      } else {
        toast.error(msg);
      }
    } finally {
      setPexelsLoading(false);
    }
  };

  const addPexelsPhoto = (photo) => {
    const newGallery = [
      ...(gallery || []),
      { url: photo.url, caption: `Foto by ${photo.photographer} (Pexels)`, order: (gallery || []).length, source: 'pexels', photographer: photo.photographer, photographer_url: photo.photographer_url }
    ];
    onUpdate(newGallery);
    toast.success(`Foto aggiunta — ricordati di salvare la galleria!`);
  };

  const addImage = () => {
    if (!newUrl || !newUrl.startsWith('http')) {
      toast.error('Inserisci un URL valido (inizia con http)');
      return;
    }
    const newGallery = [
      ...(gallery || []),
      { url: newUrl, caption: '', order: (gallery || []).length }
    ];
    onUpdate(newGallery);
    setNewUrl('');
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const results = await Promise.all(
        files.map((file) => {
          return new Promise((resolve, reject) => {
            if (file.size > 1024 * 1024 * 1.5) {
              toast.error(`${file.name} supera 1.5 MB - comprimila prima`);
              return resolve(null);
            }
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      const validUrls = results.filter(Boolean);
      const start = (gallery || []).length;
      const newGallery = [
        ...(gallery || []),
        ...validUrls.map((u, i) => ({ url: u, caption: '', order: start + i }))
      ];
      onUpdate(newGallery);
      toast.success(`${validUrls.length} immagine/i caricate`);
    } catch {
      toast.error('Errore caricamento');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (index) => {
    const newGallery = (gallery || []).filter((_, i) => i !== index);
    // Update order
    newGallery.forEach((img, i) => img.order = i);
    onUpdate(newGallery);
  };

  const moveImage = (index, direction) => {
    const newGallery = [...(gallery || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newGallery.length) return;
    
    [newGallery[index], newGallery[newIndex]] = [newGallery[newIndex], newGallery[index]];
    newGallery.forEach((img, i) => img.order = i);
    onUpdate(newGallery);
  };

  return (
    <Card className="p-6" data-testid="gallery-editor">
      <h2 className="text-xl font-semibold mb-4">Galleria Immagini</h2>

      {/* === PEXELS SEARCH (gratis, foto stock professionali) === */}
      <div className="mb-6 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setPexelsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          data-testid="pexels-toggle"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📸</span>
            <div>
              <p className="font-semibold text-emerald-900">Cerca foto stock professionali su Pexels</p>
              <p className="text-xs text-emerald-700">Gratis, 100% libere — perfette quando le foto Google sono scarse</p>
            </div>
          </div>
          <ChevronRight size={18} className={`text-emerald-700 transition-transform ${pexelsOpen ? 'rotate-90' : ''}`} />
        </button>

        {pexelsOpen && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder={`Es: "${category || 'parrucchiere lusso'}", "pizza napoletana", "salone moderno"`}
                value={pexelsQuery}
                onChange={(e) => setPexelsQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchPexels(); } }}
                data-testid="pexels-query"
              />
              <Button
                onClick={searchPexels}
                disabled={pexelsLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="pexels-search-btn"
              >
                {pexelsLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                <span className="ml-2 hidden sm:inline">Cerca</span>
              </Button>
            </div>

            {pexelsResults.length > 0 && (
              <>
                <p className="text-xs text-emerald-800 font-medium">
                  {pexelsResults.length} foto trovate — clicca per aggiungerle alla galleria
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-80 overflow-y-auto">
                  {pexelsResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPexelsPhoto(p)}
                      className="relative aspect-square overflow-hidden rounded-lg border-2 border-transparent hover:border-emerald-500 hover:shadow-md transition-all group"
                      data-testid={`pexels-photo-${p.id}`}
                      title={`Aggiungi foto di ${p.photographer}`}
                    >
                      <img src={p.thumbnail} alt={p.alt} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center text-white opacity-0 group-hover:opacity-100">
                        <Plus size={28} />
                      </span>
                      <span className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 text-[9px] bg-black/60 text-white truncate">
                        {p.photographer}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-emerald-700 italic">
                  Foto Pexels: credito al fotografo viene salvato in caption (non visibile sul sito, libera scelta tua).
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add new image */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-2">
          <Input
            placeholder="URL immagine (https://...)"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            data-testid="gallery-new-url"
          />
          <Button onClick={addImage} data-testid="gallery-add-btn">
            <Plus size={16} className="mr-2" />
            Aggiungi URL
          </Button>
        </div>
        <div className="relative">
          <label className="cursor-pointer flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-neutral-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium">
            {uploading ? (
              <><Loader2 className="animate-spin" size={16} /> Caricamento...</>
            ) : (
              <><Plus size={16} /> Carica immagini dal tuo dispositivo (max 1.5 MB ciascuna)</>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              disabled={uploading}
              className="hidden"
              data-testid="gallery-upload-input"
            />
          </label>
          <p className="text-xs text-neutral-500 mt-1 text-center">Puoi selezionare più immagini contemporaneamente.</p>
        </div>
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {(gallery || []).map((img, index) => (
          <div key={index} className="relative group">
            <img
              src={img.url}
              alt={`Gallery ${index + 1}`}
              className="w-full h-32 object-cover rounded-lg border"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23eee" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Errore</text></svg>';
              }}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-white"
                onClick={() => moveImage(index, -1)}
                disabled={index === 0}
              >
                ←
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white"
                onClick={() => moveImage(index, 1)}
                disabled={index === (gallery || []).length - 1}
              >
                →
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                onClick={() => removeImage(index)}
                data-testid={`gallery-remove-${index}`}
              >
                <Trash2 size={16} />
              </Button>
            </div>
            <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
              #{index + 1}
            </span>
          </div>
        ))}
      </div>

      {(gallery || []).length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          <Images size={48} className="mx-auto mb-2 opacity-50" />
          <p>Nessuna immagine nella galleria</p>
          <p className="text-sm">Aggiungi immagini tramite URL</p>
        </div>
      )}

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// WHY CHOOSE US EDITOR
function WhyUsEditor({ whyUs, onUpdate, onSave, saving, hasChanges }) {
  const items = whyUs || [];
  
  const addItem = () => {
    onUpdate([...items, { title: '', description: '' }]);
  };
  
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate(newItems);
  };
  
  const removeItem = (index) => {
    onUpdate(items.filter((_, i) => i !== index));
  };
  
  const moveItem = (index, direction) => {
    const newItems = [...items];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newItems.length) return;
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onUpdate(newItems);
  };

  return (
    <Card className="p-6" data-testid="whyus-editor">
      <h2 className="text-xl font-semibold mb-2">Perché Sceglierci</h2>
      <p className="text-sm text-neutral-500 mb-6">Aggiungi i punti di forza della tua attività che convinceranno i clienti a sceglierti.</p>
      
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="p-4 border rounded-lg bg-neutral-50">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className="h-6 w-6 p-0"
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  className="h-6 w-6 p-0"
                >
                  ↓
                </Button>
              </div>
              
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-xs text-neutral-500">Titolo (es. "Esperienza", "Qualità")</Label>
                  <Input
                    placeholder="Titolo punto di forza"
                    value={item.title || ''}
                    onChange={(e) => updateItem(index, 'title', e.target.value)}
                    data-testid={`whyus-title-${index}`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-neutral-500">Descrizione</Label>
                  <Textarea
                    placeholder="Descrivi perché questo è un vantaggio per il cliente..."
                    value={item.description || ''}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    rows={2}
                    data-testid={`whyus-desc-${index}`}
                  />
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
        
        {items.length < 6 && (
          <Button variant="outline" onClick={addItem} className="w-full" data-testid="whyus-add-btn">
            <Plus size={16} className="mr-2" />
            Aggiungi Punto di Forza
          </Button>
        )}
        
        {items.length === 0 && (
          <div className="text-center py-8 text-neutral-500">
            <Star size={48} className="mx-auto mb-2 opacity-30" />
            <p>Nessun punto di forza aggiunto</p>
            <p className="text-sm">Aggiungi i motivi per cui i clienti dovrebbero sceglierti</p>
          </div>
        )}
      </div>

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// FAQ EDITOR
function FaqEditor({ faq, onUpdate, onSave, saving, hasChanges }) {
  const items = faq || [];
  
  const addItem = () => {
    onUpdate([...items, { question: '', answer: '' }]);
  };
  
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate(newItems);
  };
  
  const removeItem = (index) => {
    onUpdate(items.filter((_, i) => i !== index));
  };
  
  const moveItem = (index, direction) => {
    const newItems = [...items];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newItems.length) return;
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onUpdate(newItems);
  };

  return (
    <Card className="p-6" data-testid="faq-editor">
      <h2 className="text-xl font-semibold mb-2">Domande Frequenti (FAQ)</h2>
      <p className="text-sm text-neutral-500 mb-6">Rispondi alle domande più comuni che i tuoi clienti potrebbero avere.</p>
      
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="p-4 border rounded-lg bg-neutral-50">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className="h-6 w-6 p-0"
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  className="h-6 w-6 p-0"
                >
                  ↓
                </Button>
              </div>
              
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-xs text-neutral-500">Domanda</Label>
                  <Input
                    placeholder="Es: Come posso prenotare?"
                    value={item.question || ''}
                    onChange={(e) => updateItem(index, 'question', e.target.value)}
                    data-testid={`faq-question-${index}`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-neutral-500">Risposta</Label>
                  <Textarea
                    placeholder="Scrivi una risposta chiara e utile..."
                    value={item.answer || ''}
                    onChange={(e) => updateItem(index, 'answer', e.target.value)}
                    rows={3}
                    data-testid={`faq-answer-${index}`}
                  />
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
        
        {items.length < 10 && (
          <Button variant="outline" onClick={addItem} className="w-full" data-testid="faq-add-btn">
            <Plus size={16} className="mr-2" />
            Aggiungi Domanda
          </Button>
        )}
        
        {items.length === 0 && (
          <div className="text-center py-8 text-neutral-500">
            <HelpCircle size={48} className="mx-auto mb-2 opacity-30" />
            <p>Nessuna FAQ aggiunta</p>
            <p className="text-sm">Aggiungi le domande frequenti dei tuoi clienti</p>
          </div>
        )}
      </div>

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// CLIENT SETTINGS EDITOR - Per configurare dove arrivano le prenotazioni
function ClientSettingsEditor({ settings, bookingMode, onUpdate, onSave, saving, hasChanges }) {
  const data = settings || {};
  
  const updateField = (field, value) => {
    onUpdate({ ...data, [field]: value });
  };

  return (
    <Card className="p-6" data-testid="client-settings-editor">
      <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
        <Settings size={20} />
        Impostazioni Cliente
      </h2>
      <p className="text-sm text-neutral-500 mb-6">
        Configura dove il cliente riceverà le notifiche delle prenotazioni. Questi dati vengono usati quando il sito è venduto e online.
      </p>
      
      {bookingMode === 'none' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            ⚠️ Le prenotazioni non sono attive per questo sito. Vai nella tab "Contatti" per abilitarle.
          </p>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Client Name */}
        <div>
          <Label htmlFor="client_name" className="flex items-center gap-2">
            <Users size={16} />
            Nome del Cliente / Titolare
          </Label>
          <Input
            id="client_name"
            placeholder="es. Mario Rossi"
            value={data.client_name || ''}
            onChange={(e) => updateField('client_name', e.target.value)}
            className="mt-2"
            data-testid="client-name-input"
          />
          <p className="text-xs text-neutral-500 mt-1">Il nome che apparirà nelle comunicazioni</p>
        </div>

        {/* Notification Email */}
        <div>
          <Label htmlFor="notification_email" className="flex items-center gap-2">
            <Mail size={16} />
            Email per Notifiche Prenotazioni *
          </Label>
          <Input
            id="notification_email"
            type="email"
            placeholder="cliente@email.com"
            value={data.notification_email || ''}
            onChange={(e) => updateField('notification_email', e.target.value)}
            className="mt-2"
            data-testid="notification-email-input"
          />
          <p className="text-xs text-neutral-500 mt-1">Le prenotazioni arriveranno a questa email</p>
        </div>

        {/* WhatsApp Number */}
        <div>
          <Label htmlFor="notification_whatsapp" className="flex items-center gap-2">
            <Phone size={16} />
            WhatsApp per Notifiche (opzionale)
          </Label>
          <Input
            id="notification_whatsapp"
            type="tel"
            placeholder="+39 333 1234567"
            value={data.notification_whatsapp || ''}
            onChange={(e) => updateField('notification_whatsapp', e.target.value)}
            className="mt-2"
            data-testid="notification-whatsapp-input"
          />
          <p className="text-xs text-neutral-500 mt-1">Numero WhatsApp del cliente (con prefisso internazionale)</p>
        </div>

        <hr className="my-6" />

        <h3 className="font-semibold text-lg mb-4">Capacità e Disponibilità</h3>

        {/* Max Capacity */}
        <div>
          <Label htmlFor="max_capacity" className="flex items-center gap-2">
            <Users size={16} />
            {bookingMode === 'table' ? 'Numero Massimo Coperti per Fascia Oraria' : 'Appuntamenti Massimi per Fascia Oraria'}
          </Label>
          <Input
            id="max_capacity"
            type="number"
            min="0"
            placeholder={bookingMode === 'table' ? 'es. 30' : 'es. 3'}
            value={data.max_capacity || ''}
            onChange={(e) => updateField('max_capacity', parseInt(e.target.value) || 0)}
            className="mt-2 w-32"
            data-testid="max-capacity-input"
          />
          <p className="text-xs text-neutral-500 mt-1">
            {bookingMode === 'table' 
              ? 'Quante persone possono prenotare per ogni fascia oraria (0 = illimitato)'
              : 'Quanti appuntamenti puoi gestire per ogni fascia oraria (0 = illimitato)'
            }
          </p>
        </div>

        {/* Slot Duration */}
        <div>
          <Label htmlFor="slot_duration">Durata Fascia Oraria (minuti)</Label>
          <select
            id="slot_duration"
            value={data.slot_duration || 60}
            onChange={(e) => updateField('slot_duration', parseInt(e.target.value))}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
            data-testid="slot-duration-select"
          >
            <option value={30}>30 minuti</option>
            <option value={60}>1 ora</option>
            <option value={90}>1 ora e 30 minuti</option>
            <option value={120}>2 ore</option>
          </select>
          <p className="text-xs text-neutral-500 mt-1">Ogni quanto si ripetono gli slot di prenotazione</p>
        </div>

        {/* Advance Booking Days */}
        <div>
          <Label htmlFor="advance_days">Prenotazioni con Anticipo Massimo</Label>
          <select
            id="advance_days"
            value={data.advance_days || 30}
            onChange={(e) => updateField('advance_days', parseInt(e.target.value))}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
            data-testid="advance-days-select"
          >
            <option value={7}>1 settimana</option>
            <option value={14}>2 settimane</option>
            <option value={30}>1 mese</option>
            <option value={60}>2 mesi</option>
            <option value={90}>3 mesi</option>
          </select>
          <p className="text-xs text-neutral-500 mt-1">Quanto in anticipo i clienti possono prenotare</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h4 className="font-semibold text-blue-800 mb-2">📧 Come funzionano le notifiche?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Quando un cliente prenota, riceve una <strong>conferma immediata</strong></li>
          <li>• Il titolare riceve un'<strong>email con tutti i dettagli</strong></li>
          <li>• L'email include un <strong>link WhatsApp</strong> per rispondere al cliente</li>
          <li>• Il sistema blocca automaticamente gli slot pieni</li>
        </ul>
      </div>

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

// SEO EDITOR
function SeoEditor({ seo, localeLang, onUpdate, onSave, saving, hasChanges }) {
  const langLabel = localeLang === 'it' ? 'Italiano' : localeLang.toUpperCase();

  return (
    <Card className="p-6" data-testid="seo-editor">
      <h2 className="text-xl font-semibold mb-4">SEO & Meta Tags</h2>
      
      <div className="space-y-6">
        {/* Title */}
        <div>
          <Label className="text-base font-medium">Titolo Pagina (Title Tag)</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <Label className="text-xs text-neutral-500">{langLabel}</Label>
              <Input
                placeholder="Titolo pagina"
                value={seo?.title_local || ''}
                onChange={(e) => onUpdate({ ...seo, title_local: e.target.value })}
                data-testid="seo-title-local"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-500">English</Label>
              <Input
                placeholder="Page title"
                value={seo?.title_en || ''}
                onChange={(e) => onUpdate({ ...seo, title_en: e.target.value })}
                data-testid="seo-title-en"
              />
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Ideale: 50-60 caratteri
          </p>
        </div>

        {/* Meta Description */}
        <div>
          <Label className="text-base font-medium">Meta Description</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <Label className="text-xs text-neutral-500">{langLabel}</Label>
              <Textarea
                placeholder="Descrizione per i motori di ricerca"
                value={seo?.meta_local || ''}
                onChange={(e) => onUpdate({ ...seo, meta_local: e.target.value })}
                rows={3}
                data-testid="seo-meta-local"
              />
              <p className="text-xs text-neutral-500 mt-1">
                {(seo?.meta_local || '').length}/160 caratteri
              </p>
            </div>
            <div>
              <Label className="text-xs text-neutral-500">English</Label>
              <Textarea
                placeholder="Description for search engines"
                value={seo?.meta_en || ''}
                onChange={(e) => onUpdate({ ...seo, meta_en: e.target.value })}
                rows={3}
                data-testid="seo-meta-en"
              />
              <p className="text-xs text-neutral-500 mt-1">
                {(seo?.meta_en || '').length}/160 characters
              </p>
            </div>
          </div>
        </div>
      </div>

      <SaveButton onClick={onSave} saving={saving} hasChanges={hasChanges} />
    </Card>
  );
}

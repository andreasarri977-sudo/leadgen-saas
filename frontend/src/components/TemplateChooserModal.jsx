import React, { useState } from 'react';
import { X, Check, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DESIGN_TEMPLATES, DEFAULT_DESIGN_TEMPLATE_ID } from '@/lib/designTemplates';

/**
 * AI heuristic: suggerisce il template migliore in base a categoria + nome attività.
 * Algoritmo deterministico (zero costo) basato su keyword matching nelle categorie.
 */
function suggestTemplateByCategory(category) {
  const c = (category || '').toLowerCase();
  if (!c) return 'classic';
  const matchers = [
    { keys: ['parrucchier', 'estetist', 'barbier', 'centro estetico', 'tatuator', 'nail', 'spa', 'salone'], tpl: 'luxury' },
    { keys: ['gioieller', 'abbigliament', 'boutique'], tpl: 'luxury' },
    { keys: ['fotograf', 'ristorante gourmet', 'fine dining', 'creativo', 'studio creativo', 'design'], tpl: 'magazine' },
    { keys: ['ristorant', 'pizzer', 'bar', 'caffetter', 'caff', 'gelater', 'pasticcer', 'hamburg', 'fast food', 'kebab', 'food', 'osteri', 'trattor'], tpl: 'vibrant' },
    { keys: ['pasticcer', 'wedding', 'matrimonio', 'bambini', 'infanzia', 'nail'], tpl: 'pastel' },
    { keys: ['dentist', 'fisioterap', 'veterinar', 'farmac', 'ottic', 'medic', 'clinic', 'studio medic'], tpl: 'minimal' },
    { keys: ['avvocat', 'notaio', 'commercialist', 'consulent', 'studio leg'], tpl: 'minimal' },
    { keys: ['immobilia', 'assicurazion'], tpl: 'minimal' },
    { keys: ['palestr', 'crossfit', 'sport', 'fitness'], tpl: 'bold' },
    { keys: ['yoga', 'pilates', 'meditaz', 'bio', 'fiorist', 'artigian'], tpl: 'earthy' },
    { keys: ['tech', 'gaming', 'startup', 'software', 'digital agency'], tpl: 'neon' },
    { keys: ['meccanic', 'autolavagg', 'gommist', 'carrozzer', 'idraulic', 'elettricist', 'fabbr', 'falegnam', 'imbianch', 'ferrament'], tpl: 'classic' },
  ];
  for (const m of matchers) {
    if (m.keys.some((k) => c.includes(k))) return m.tpl;
  }
  return 'classic';
}

/**
 * Modale di scelta template visivo per generazione siti demo.
 *
 * Props:
 *  - open: bool — se mostrare il modale
 *  - onClose: () => void — annulla / chiudi senza scegliere
 *  - onConfirm: (templateId: string) => void — conferma con la scelta
 *  - title?: string — opzionale, default "Scegli lo stile del sito"
 *  - subtitle?: string — opzionale
 *  - defaultId?: string — template preselezionato (default 'classic')
 *  - confirmLabel?: string — testo del bottone Conferma
 *  - businessCategory?: string — categoria attività per evidenziare "Consigliato"
 */
export default function TemplateChooserModal({
  open,
  onClose,
  onConfirm,
  title = 'Scegli lo stile del sito',
  subtitle = "Decidi il look prima di generare il sito demo. Potrai sempre cambiarlo dopo dall'editor.",
  defaultId = DEFAULT_DESIGN_TEMPLATE_ID,
  confirmLabel = 'Genera con questo stile',
  businessCategory,
}) {
  // Pre-suggest AI: se hai una categoria, parti già col template suggerito
  const aiSuggested = businessCategory ? suggestTemplateByCategory(businessCategory) : defaultId;
  const [selected, setSelected] = useState(aiSuggested || defaultId);

  if (!open) return null;

  const isSuggestedFor = (template) => {
    if (!businessCategory || !template.suggested_for) return false;
    const c = businessCategory.toLowerCase();
    return template.suggested_for.some((s) => c.includes(s.toLowerCase()) || s.toLowerCase().includes(c.split(' ')[0]));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      data-testid="template-chooser-modal"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-neutral-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">{title}</h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500"
            aria-label="Chiudi"
            data-testid="template-modal-close"
          >
            <X size={20} />
          </button>
        </div>

        {/* AI Suggest banner */}
        {businessCategory && (
          <div className="px-5 sm:px-7 pt-3">
            <button
              type="button"
              onClick={() => {
                const suggested = suggestTemplateByCategory(businessCategory);
                setSelected(suggested);
                // Auto-conferma immediatamente
                setTimeout(() => onConfirm(suggested), 250);
              }}
              data-testid="template-ai-suggest-btn"
              className="w-full group flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md hover:shadow-lg hover:scale-[1.01] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Sparkles size={18} className="animate-pulse" />
                </span>
                <div className="text-left">
                  <p className="font-bold text-sm">✨ Lascia scegliere all'AI</p>
                  <p className="text-[11px] text-white/80">
                    In base alla categoria "{businessCategory}" → ti suggerisco{' '}
                    <strong>{DESIGN_TEMPLATES.find((t) => t.id === suggestTemplateByCategory(businessCategory))?.name}</strong>
                  </p>
                </div>
              </div>
              <span className="text-[11px] bg-white/15 px-2 py-1 rounded-full font-semibold group-hover:bg-white/25">
                Genera ora →
              </span>
            </button>
          </div>
        )}

        {/* Grid templates */}
        <div className="overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DESIGN_TEMPLATES.map((tpl) => {
            const active = selected === tpl.id;
            const suggested = isSuggestedFor(tpl);
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelected(tpl.id)}
                className={`relative text-left rounded-2xl overflow-hidden border-2 transition-all hover:shadow-xl ${
                  active
                    ? 'border-blue-600 shadow-lg ring-2 ring-blue-200 scale-[1.02]'
                    : 'border-neutral-200 hover:border-blue-400'
                }`}
                data-testid={`template-card-${tpl.id}`}
              >
                {suggested && (
                  <span className="absolute top-2 right-2 z-10 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                    <Star size={10} fill="currentColor" />
                    Consigliato
                  </span>
                )}
                {active && (
                  <span className="absolute top-2 left-2 z-10 bg-blue-600 text-white p-1 rounded-full shadow">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}

                {/* Visual preview (mini mock-up) */}
                <TemplatePreview template={tpl} />

                {/* Body */}
                <div className="p-3 sm:p-4 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{tpl.emoji}</span>
                    <h3 className="font-bold text-neutral-900">{tpl.name}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-500 font-medium mb-1">{tpl.tagline}</p>
                  <p className="text-[11px] sm:text-xs text-neutral-600 leading-snug line-clamp-2">{tpl.description}</p>
                  {tpl.suggested_for && tpl.suggested_for.length > 0 && (
                    <p className="text-[10px] text-neutral-400 mt-2 italic">
                      Ideale per: {tpl.suggested_for.slice(0, 3).join(', ')}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-7 py-4 border-t border-neutral-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-50">
          <div className="text-xs text-neutral-500">
            <span className="font-semibold text-neutral-700">Selezionato:</span>{' '}
            {DESIGN_TEMPLATES.find((t) => t.id === selected)?.emoji}{' '}
            {DESIGN_TEMPLATES.find((t) => t.id === selected)?.name}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} data-testid="template-cancel-btn">
              Annulla
            </Button>
            <Button
              onClick={() => onConfirm(selected)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="template-confirm-btn"
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mini mock-up del sito per il template selezionato.
 * Usa i colori reali del template (preview field) per dare l'idea immediata.
 */
function TemplatePreview({ template }) {
  const { preview, vivid_mode, dark_bg, decoration_intensity } = template;
  const isDark = dark_bg;

  return (
    <div
      className="relative h-44 sm:h-48 overflow-hidden"
      style={{ background: isDark ? preview.bg : preview.bg }}
    >
      {/* Top "header" bar */}
      <div className={`absolute top-0 left-0 right-0 h-7 flex items-center px-3 gap-2 ${isDark ? 'bg-black/30' : 'bg-white/70'} backdrop-blur-sm`}>
        <div className="w-2 h-2 rounded-full" style={{ background: preview.accent }} />
        <div className={`text-[9px] font-bold tracking-wider truncate ${isDark ? 'text-white' : 'text-neutral-700'}`}>
          {template.name.toUpperCase()}
        </div>
        <div className="flex-1" />
        <div className={`w-8 h-1.5 rounded-full ${isDark ? 'bg-white/40' : 'bg-neutral-300'}`} />
        <div className={`w-6 h-1.5 rounded-full ${isDark ? 'bg-white/40' : 'bg-neutral-300'}`} />
      </div>

      {/* Hero block with gradient */}
      <div
        className={`absolute top-7 left-2 right-2 h-16 sm:h-20 rounded-md overflow-hidden bg-gradient-to-br ${preview.primary} relative`}
      >
        {/* Decorative dot to suggest animations */}
        {decoration_intensity !== 'low' && (
          <>
            <div className="absolute top-2 right-3 w-3 h-3 rounded-full bg-white/40" />
            <div className="absolute bottom-2 left-3 w-2 h-2 rounded-full bg-white/60" />
            {decoration_intensity === 'high' && (
              <div className="absolute top-1/2 right-1/3 w-4 h-4 rounded-full bg-white/30 blur-sm" />
            )}
          </>
        )}
        <div className="absolute bottom-1.5 left-2.5 text-white text-[10px] font-bold drop-shadow">
          Titolo Hero
        </div>
        <div className="absolute bottom-1.5 right-2.5 bg-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow"
             style={{ color: preview.accent }}>
          CTA
        </div>
      </div>

      {/* Body section (vivid or pale) */}
      <div className="absolute bottom-2 left-2 right-2 h-12 flex gap-1.5">
        <div
          className={`flex-1 rounded-md ${vivid_mode ? `bg-gradient-to-br ${preview.primary}` : ''}`}
          style={!vivid_mode ? { background: isDark ? '#1f2937' : '#f3f4f6' } : {}}
        >
          <div className="p-1.5 space-y-1">
            <div className={`w-2/3 h-1 rounded ${vivid_mode || isDark ? 'bg-white/70' : 'bg-neutral-400'}`} />
            <div className={`w-1/2 h-0.5 rounded ${vivid_mode || isDark ? 'bg-white/50' : 'bg-neutral-300'}`} />
            <div className={`w-3/4 h-0.5 rounded ${vivid_mode || isDark ? 'bg-white/50' : 'bg-neutral-300'}`} />
          </div>
        </div>
        <div
          className={`w-12 rounded-md ${vivid_mode ? `bg-gradient-to-br ${preview.primary}` : ''}`}
          style={!vivid_mode ? { background: isDark ? '#1f2937' : '#f3f4f6' } : {}}
        >
          <div className="p-1.5 flex items-center justify-center h-full">
            <div className="w-4 h-4 rounded-full" style={{ background: preview.accent }} />
          </div>
        </div>
      </div>
    </div>
  );
}

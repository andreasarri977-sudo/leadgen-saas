// Sfondi pagina riusabili (gradient sobri pensati per essere leggibili sotto le card).
// L'utente puo' scegliere uno di questi preset oppure caricare una foto.
// L'oggetto salvato in content.page_background:
//   { type: 'gradient', id: 'aurora' }           -> applico CSS da PAGE_BACKGROUNDS
//   { type: 'image',    value: 'data:image/...'} -> background-image url(...) cover center
//   { type: 'none' }                              -> nessuno (bianco)

export const PAGE_BACKGROUNDS = [
  { id: 'aurora',   label: 'Aurora Soft',      css: 'linear-gradient(135deg, #f3e7ff 0%, #e0f2fe 100%)', dark: false },
  { id: 'sunset',   label: 'Sunset Glow',      css: 'linear-gradient(135deg, #fff1f2 0%, #ffedd5 100%)', dark: false },
  { id: 'ocean',    label: 'Ocean Mist',       css: 'linear-gradient(180deg, #ecfeff 0%, #dbeafe 100%)', dark: false },
  { id: 'forest',   label: 'Forest Mist',      css: 'linear-gradient(135deg, #ecfdf5 0%, #f7fee7 100%)', dark: false },
  { id: 'lavender', label: 'Lavender Dream',   css: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)', dark: false },
  { id: 'cream',    label: 'Cream Latte',      css: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)', dark: false },
  { id: 'slate',    label: 'Slate Pro',        css: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)', dark: false },
  { id: 'midnight', label: 'Midnight Blue',    css: 'linear-gradient(180deg, #0f172a 0%, #1e3a8a 100%)', dark: true  },
];

// Restituisce uno style CSS da applicare a un wrapper <div> di sfondo pagina.
// bg = oggetto { type, id?, value? } salvato in content.page_background.
export function getPageBackgroundStyle(bg) {
  if (!bg || bg.type === 'none' || !bg.type) return null;
  if (bg.type === 'gradient' && bg.id) {
    const preset = PAGE_BACKGROUNDS.find((p) => p.id === bg.id);
    if (preset) {
      return {
        background: preset.css,
        '--wf-bg-dark': preset.dark ? '1' : '0',
      };
    }
  }
  if (bg.type === 'image' && bg.value) {
    return {
      backgroundImage: `url("${bg.value}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat',
    };
  }
  return null;
}

// True se lo sfondo richiede testi chiari (per ora solo midnight o image)
export function isPageBackgroundDark(bg) {
  if (!bg || !bg.type) return false;
  if (bg.type === 'image') return true; // si assume immagine -> meglio overlay scuro
  if (bg.type === 'gradient' && bg.id) {
    const preset = PAGE_BACKGROUNDS.find((p) => p.id === bg.id);
    return !!preset?.dark;
  }
  return false;
}

// 9 Template "Design" predefiniti per generare siti demo con look diversi.
// Ogni template definisce: color_scheme, font_set, vivid_mode, decoration_intensity, dark_bg
// → al momento della generazione il campo `design_template` viene salvato nel demo
// → DemoPreview legge `design_template` e applica lo stile corretto.
//
// IDs canonici (usati in DB + frontend):
//   classic | vibrant | luxury | magazine | minimal | bold | earthy | pastel | neon

export const DESIGN_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    emoji: '🎯',
    tagline: 'Equilibrato e versatile',
    description: 'Look pulito e professionale, adatto a qualsiasi attività. Sezioni bianche, accenti colorati.',
    color_scheme: 'blue',
    font_set: 'default',
    vivid_mode: false,
    dark_bg: false,
    decoration_intensity: 'low',
    suggested_for: ['Tutti'],
    cssGradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    preview: { primary: 'from-blue-600 to-blue-800', accent: '#2563eb', bg: '#ffffff', text: '#1f2937' }
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    emoji: '🌈',
    tagline: 'Colori caldi e saturi',
    description: 'Gradient grandi, accenti vivaci. Perfetto per food, bar e gelaterie.',
    color_scheme: 'sunset',
    font_set: 'food',
    vivid_mode: true,
    dark_bg: false,
    decoration_intensity: 'high',
    suggested_for: ['Bar', 'Pizzeria', 'Gelateria', 'Pasticceria', 'Food'],
    cssGradient: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
    preview: { primary: 'from-orange-500 to-pink-500', accent: '#ea580c', bg: '#fff7ed', text: '#7c2d12' }
  },
  {
    id: 'luxury',
    name: 'Luxury',
    emoji: '💎',
    tagline: 'Eleganza dark + oro',
    description: 'Sfondo scuro, dettagli dorati, font serif raffinato. Per estetica e brand premium.',
    color_scheme: 'gold_grad',
    font_set: 'luxury',
    vivid_mode: false,
    dark_bg: true,
    decoration_intensity: 'medium',
    suggested_for: ['Parrucchieri', 'Estetica', 'Gioiellerie', 'Spa'],
    cssGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    preview: { primary: 'from-amber-400 to-orange-500', accent: '#f59e0b', bg: '#0f172a', text: '#fef3c7' }
  },
  {
    id: 'magazine',
    name: 'Magazine',
    emoji: '📰',
    tagline: 'Editoriale e fotografico',
    description: 'Tipografia di carattere, focus sulle foto grandi. Ideale per ristoranti gourmet, fotografi.',
    color_scheme: 'black',
    font_set: 'luxury',
    vivid_mode: false,
    dark_bg: false,
    decoration_intensity: 'low',
    suggested_for: ['Ristoranti gourmet', 'Fotografi', 'Studi creativi'],
    cssGradient: 'linear-gradient(135deg, #262626 0%, #0a0a0a 100%)',
    preview: { primary: 'from-neutral-800 to-neutral-950', accent: '#171717', bg: '#fafafa', text: '#171717' }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    emoji: '⚪',
    tagline: 'Pulito e ariosa',
    description: 'Tanto bianco, font moderno, accenti discreti. Per studi medici e professionisti.',
    color_scheme: 'navy',
    font_set: 'wellness',
    vivid_mode: false,
    dark_bg: false,
    decoration_intensity: 'low',
    suggested_for: ['Studi medici', 'Avvocati', 'Commercialisti'],
    cssGradient: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
    preview: { primary: 'from-blue-800 to-blue-950', accent: '#1e3a8a', bg: '#ffffff', text: '#0f172a' }
  },
  {
    id: 'bold',
    name: 'Bold',
    emoji: '⚡',
    tagline: 'Gradient ovunque, massima energia',
    description: 'Tutte le sezioni a gradient pieno + testo bianco — come la sezione contatti, ovunque.',
    color_scheme: 'aurora',
    font_set: 'sport',
    vivid_mode: true,
    dark_bg: false,
    decoration_intensity: 'high',
    suggested_for: ['Palestre', 'Sport', 'Tech', 'Eventi'],
    cssGradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    preview: { primary: 'from-purple-500 to-pink-500', accent: '#a855f7', bg: '#a855f7', text: '#ffffff' }
  },
  {
    id: 'earthy',
    name: 'Earthy',
    emoji: '🌿',
    tagline: 'Toni naturali e caldi',
    description: 'Sfumature terra, verde bosco, accoglienza calda. Per fiorai, artigianato, bio.',
    color_scheme: 'forest_grad',
    font_set: 'professional',
    vivid_mode: true,
    dark_bg: false,
    decoration_intensity: 'medium',
    suggested_for: ['Fiorai', 'Artigiani', 'Bio/Bio-shop', 'Yoga'],
    cssGradient: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
    preview: { primary: 'from-emerald-500 to-teal-600', accent: '#10b981', bg: '#f0fdf4', text: '#064e3b' }
  },
  {
    id: 'pastel',
    name: 'Pastel Dream',
    emoji: '🌸',
    tagline: 'Pastelli soft e delicati',
    description: 'Colori soft, atmosfera romantica e accogliente. Per pasticcerie, nail, infanzia.',
    color_scheme: 'berry',
    font_set: 'luxury',
    vivid_mode: true,
    dark_bg: false,
    decoration_intensity: 'high',
    suggested_for: ['Nail', 'Pasticcerie', 'Wedding', 'Bambini'],
    cssGradient: 'linear-gradient(135deg, #d946ef 0%, #f43f5e 100%)',
    preview: { primary: 'from-fuchsia-500 to-rose-500', accent: '#ec4899', bg: '#fdf2f8', text: '#831843' }
  },
  {
    id: 'neon',
    name: 'Neon Cyber',
    emoji: '⚡',
    tagline: 'Dark + accenti neon',
    description: 'Sfondo dark con neon ciano/viola. Per tecnologia, gaming, brand giovani.',
    color_scheme: 'midnight',
    font_set: 'tech',
    vivid_mode: false,
    dark_bg: true,
    decoration_intensity: 'high',
    suggested_for: ['Tech', 'Gaming', 'Startup', 'Eventi notte'],
    cssGradient: 'linear-gradient(135deg, #1e293b 0%, #172554 100%)',
    preview: { primary: 'from-slate-800 to-blue-900', accent: '#22d3ee', bg: '#0f172a', text: '#e0f2fe' }
  }
];

export function getDesignTemplateById(id) {
  return DESIGN_TEMPLATES.find((t) => t.id === id) || DESIGN_TEMPLATES[0];
}

export const DEFAULT_DESIGN_TEMPLATE_ID = 'classic';

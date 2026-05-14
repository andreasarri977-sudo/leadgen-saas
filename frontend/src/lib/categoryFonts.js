// Mappa categoria → coppia di font Google (heading + body) per dare uno stile
// distintivo a ogni tipologia di attività. Tutti i font sono Google Fonts gratis.
//
// Strategia:
// - Beauty/Lusso/Moda  → serif eleganti (Playfair Display) + sans neutro (Inter)
// - Food casual        → grottesco moderno (Bricolage Grotesque) + Inter
// - Health/Wellness    → sans pulito (Outfit) + Inter
// - Fitness/Sport      → grottesco display (Bricolage Grotesque) + Inter
// - Auto/Trades        → tecnico/mono (Space Grotesk) + Inter
// - Professional       → autorevole (Outfit) + Inter
// - Fallback           → Inter / Inter

const FONT_SETS = {
  luxury: {
    heading: 'Playfair Display',
    body: 'Inter',
    // pesi necessari per heading: 600,700,800 ; body: 400,500,600,700
    href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap',
    label: 'Elegante (Lusso/Estetica)'
  },
  food: {
    heading: 'Bricolage Grotesque',
    body: 'Inter',
    href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap',
    label: 'Caloroso (Food & Bar)'
  },
  wellness: {
    heading: 'Outfit',
    body: 'Inter',
    href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap',
    label: 'Pulito (Salute/Benessere)'
  },
  sport: {
    heading: 'Bricolage Grotesque',
    body: 'Inter',
    href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap',
    label: 'Energico (Sport/Fitness)'
  },
  tech: {
    heading: 'Space Grotesk',
    body: 'Inter',
    href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    label: 'Tecnico (Auto/Artigiani)'
  },
  professional: {
    heading: 'Outfit',
    body: 'Inter',
    href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    label: 'Autorevole (Professionali)'
  },
  default: {
    heading: 'Inter',
    body: 'Inter',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    label: 'Standard'
  }
};

// Mappa parole-chiave categoria → font set id (case-insensitive substring match)
const CATEGORY_MATCH = [
  // luxury
  { keys: ['parrucchier', 'estetist', 'barbier', 'centro estetico', 'tatuator', 'nail', 'spa', 'gioieller', 'abbigliament', 'fotograf', 'salone'], set: 'luxury' },
  // food
  { keys: ['ristorant', 'pizzer', 'bar', 'caffetter', 'caff', 'gelater', 'pasticcer', 'hamburg', 'fast food', 'kebab', 'imbiss', 'trattor', 'osteri', 'pub', 'sushi', 'poke', 'food'], set: 'food' },
  // wellness
  { keys: ['dentist', 'fisioterap', 'veterinar', 'farmac', 'ottic', 'medic', 'clinic', 'centro medic'], set: 'wellness' },
  // sport
  { keys: ['palestr', 'yoga', 'pilates', 'crossfit', 'sport', 'fitness'], set: 'sport' },
  // tech / auto / trades
  { keys: ['meccanic', 'autolavagg', 'gommist', 'carrozzer', 'idraulic', 'elettricist', 'fabbr', 'falegnam', 'imbianch'], set: 'tech' },
  // professional
  { keys: ['immobilia', 'assicurazion', 'commercialist', 'avvocat', 'consulent', 'studio leg', 'notaio'], set: 'professional' },
  // retail floreale → luxury
  { keys: ['fiorist'], set: 'luxury' },
  // ferramenta → tech
  { keys: ['ferrament'], set: 'tech' },
];

export function getFontSetForCategory(category) {
  if (!category || typeof category !== 'string') return FONT_SETS.default;
  const c = category.toLowerCase();
  for (const rule of CATEGORY_MATCH) {
    if (rule.keys.some((k) => c.includes(k))) return FONT_SETS[rule.set];
  }
  return FONT_SETS.default;
}

export { FONT_SETS };

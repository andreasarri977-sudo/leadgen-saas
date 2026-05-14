import React from 'react';

// Decorazioni SVG animate via CSS — un'alternativa leggera a Lottie:
// 3 elementi galleggianti che danno profondità e movimento all'hero.
// Diverse per categoria così ogni sito ha la sua personalità.
//
// Tutte le animazioni sono pure CSS keyframes (vedi il <style> jsx in fondo),
// quindi zero JS runtime e nessuna dipendenza esterna.

const DECORATION_SETS = {
  // Lusso / Beauty / Estetica → cerchi morbidi + sparkle
  luxury: [
    { type: 'sparkle', top: '12%', left: '8%',  size: 28, delay: 0,    duration: 3.2 },
    { type: 'circle',  top: '70%', left: '85%', size: 80, delay: 0.6,  duration: 6.5 },
    { type: 'sparkle', top: '78%', left: '12%', size: 18, delay: 1.4,  duration: 2.8 },
  ],
  // Food → cerchi tondi vivaci tipo bolle
  food: [
    { type: 'circle', top: '15%', left: '88%', size: 60, delay: 0,    duration: 5.0 },
    { type: 'circle', top: '60%', left: '6%',  size: 90, delay: 0.8,  duration: 6.0 },
    { type: 'dot',    top: '40%', left: '92%', size: 14, delay: 0.4,  duration: 4.0 },
  ],
  // Wellness / Salute → cerchi pastello, ritmo lento e calmante
  wellness: [
    { type: 'circle', top: '20%', left: '85%', size: 100, delay: 0,   duration: 8.0 },
    { type: 'circle', top: '70%', left: '8%',  size: 70,  delay: 1.2, duration: 7.0 },
    { type: 'dot',    top: '35%', left: '4%',  size: 10,  delay: 0.6, duration: 5.0 },
  ],
  // Sport / Fitness → triangoli + linee, energico
  sport: [
    { type: 'triangle', top: '14%', left: '88%', size: 30, delay: 0,   duration: 2.4 },
    { type: 'triangle', top: '76%', left: '6%',  size: 22, delay: 0.5, duration: 2.8 },
    { type: 'dot',      top: '50%', left: '94%', size: 8,  delay: 0.9, duration: 1.6 },
  ],
  // Tech / Auto / Trades → quadrati ruotati, vibe tecnica
  tech: [
    { type: 'square', top: '18%', left: '90%', size: 26, delay: 0,    duration: 5.5 },
    { type: 'square', top: '65%', left: '5%',  size: 34, delay: 0.7,  duration: 6.0 },
    { type: 'dot',    top: '40%', left: '92%', size: 8,  delay: 0.4,  duration: 4.0 },
  ],
  // Professionali → linee leggere + dot, sobrio
  professional: [
    { type: 'circle', top: '22%', left: '88%', size: 80, delay: 0,   duration: 9.0 },
    { type: 'dot',    top: '74%', left: '10%', size: 12, delay: 0.8, duration: 6.0 },
    { type: 'dot',    top: '50%', left: '4%',  size: 8,  delay: 1.4, duration: 5.0 },
  ],
  default: [
    { type: 'circle', top: '15%', left: '88%', size: 80, delay: 0,   duration: 6.5 },
    { type: 'circle', top: '70%', left: '6%',  size: 60, delay: 0.8, duration: 5.5 },
  ],
};

// Mappa parole-chiave → set (replica logica di categoryFonts.js, mantenuta locale
// per non accoppiare le 2 librerie troppo strettamente)
const CATEGORY_MATCH = [
  { keys: ['parrucchier', 'estetist', 'barbier', 'centro estetico', 'tatuator', 'nail', 'spa', 'gioieller', 'abbigliament', 'fotograf', 'salone', 'fiorist'], set: 'luxury' },
  { keys: ['ristorant', 'pizzer', 'bar', 'caffetter', 'caff', 'gelater', 'pasticcer', 'hamburg', 'fast food', 'kebab', 'imbiss', 'trattor', 'osteri', 'pub', 'sushi', 'poke', 'food'], set: 'food' },
  { keys: ['dentist', 'fisioterap', 'veterinar', 'farmac', 'ottic', 'medic', 'clinic'], set: 'wellness' },
  { keys: ['palestr', 'yoga', 'pilates', 'crossfit', 'sport', 'fitness'], set: 'sport' },
  { keys: ['meccanic', 'autolavagg', 'gommist', 'carrozzer', 'idraulic', 'elettricist', 'fabbr', 'falegnam', 'imbianch', 'ferrament'], set: 'tech' },
  { keys: ['immobilia', 'assicurazion', 'commercialist', 'avvocat', 'consulent', 'studio leg', 'notaio'], set: 'professional' },
];

export function getDecorationSetForCategory(category) {
  if (!category || typeof category !== 'string') return DECORATION_SETS.default;
  const c = category.toLowerCase();
  for (const rule of CATEGORY_MATCH) {
    if (rule.keys.some((k) => c.includes(k))) return DECORATION_SETS[rule.set];
  }
  return DECORATION_SETS.default;
}

function Shape({ type, size, color }) {
  if (type === 'sparkle') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2 L13.5 9 L21 11 L13.5 13 L12 21 L10.5 13 L3 11 L10.5 9 Z" fill={color} opacity="0.85" />
      </svg>
    );
  }
  if (type === 'triangle') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 3 L22 21 L2 21 Z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.85" />
      </svg>
    );
  }
  if (type === 'square') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="2" fill="none" opacity="0.85" />
      </svg>
    );
  }
  if (type === 'dot') {
    return <div style={{ width: size, height: size, borderRadius: '50%', background: color, opacity: 0.85 }} />;
  }
  // circle (large soft blob)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${color}33, ${color}11)`,
        filter: 'blur(2px)',
      }}
    />
  );
}

/**
 * <CategoryDecorations category="..." color="#XXXXXX" />
 *  - va piazzato dentro un contenitore con position:relative (es. l'hero).
 *  - è position:absolute, pointer-events:none → non blocca i click.
 */
export default function CategoryDecorations({ category, color = '#ffffff' }) {
  const set = getDecorationSetForCategory(category);
  return (
    <div className="webfinder-decorations" aria-hidden="true">
      {set.map((d, i) => (
        <span
          key={i}
          className={`wf-deco wf-deco-${d.type}`}
          style={{
            top: d.top,
            left: d.left,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        >
          <Shape type={d.type} size={d.size} color={color} />
        </span>
      ))}

      {/* CSS inline (scoped via className univoco): nessun side-effect globale */}
      <style>{`
        .webfinder-decorations {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }
        .wf-deco {
          position: absolute;
          display: inline-block;
          will-change: transform, opacity;
        }
        .wf-deco-sparkle  { animation: wfTwinkle ease-in-out infinite; }
        .wf-deco-circle   { animation: wfFloat   ease-in-out infinite; }
        .wf-deco-dot      { animation: wfPulse   ease-in-out infinite; }
        .wf-deco-triangle { animation: wfSpin    linear        infinite; }
        .wf-deco-square   { animation: wfDrift   ease-in-out infinite; }

        @keyframes wfTwinkle {
          0%, 100% { transform: scale(0.6) rotate(0deg);   opacity: 0.35; }
          50%      { transform: scale(1.1) rotate(45deg);  opacity: 0.95; }
        }
        @keyframes wfFloat {
          0%, 100% { transform: translateY(0) translateX(0); }
          50%      { transform: translateY(-14px) translateX(8px); }
        }
        @keyframes wfPulse {
          0%, 100% { transform: scale(0.8); opacity: 0.4; }
          50%      { transform: scale(1.3); opacity: 1; }
        }
        @keyframes wfSpin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        @keyframes wfDrift {
          0%, 100% { transform: rotate(0deg)   translateY(0); }
          50%      { transform: rotate(20deg) translateY(-10px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .wf-deco { animation: none !important; opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

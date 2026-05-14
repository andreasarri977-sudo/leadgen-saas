import React from 'react';

// Decorazioni animate visibili — versione 2 con elementi più grandi, vivaci,
// e più contrastati. Restano pure CSS keyframes (zero JS lib).

const DECORATION_SETS = {
  // Lusso / Beauty / Estetica → sparkle dorati + cerchio morbido
  luxury: [
    { type: 'sparkle', top: '12%', left: '8%',   size: 56, color: '#fcd34d', delay: 0,    duration: 3.2, opacity: 0.95 },
    { type: 'sparkle', top: '78%', left: '12%',  size: 32, color: '#fcd34d', delay: 1.4,  duration: 2.8, opacity: 0.85 },
    { type: 'blob',    top: '60%', left: '78%',  size: 200, color: '#ffffff', delay: 0.6, duration: 7.0, opacity: 0.18 },
    { type: 'sparkle', top: '30%', left: '88%',  size: 40, color: '#fef3c7', delay: 0.9,  duration: 3.5, opacity: 0.9 },
  ],
  // Food → bolle/cerchi vivaci
  food: [
    { type: 'circle', top: '15%', left: '85%',  size: 110, color: '#fbbf24', delay: 0,    duration: 5.0, opacity: 0.5 },
    { type: 'circle', top: '55%', left: '4%',   size: 140, color: '#fb923c', delay: 0.8,  duration: 6.0, opacity: 0.4 },
    { type: 'dot',    top: '40%', left: '92%',  size: 22,  color: '#ffffff', delay: 0.4,  duration: 4.0, opacity: 0.9 },
    { type: 'dot',    top: '80%', left: '50%',  size: 16,  color: '#ffffff', delay: 1.2,  duration: 3.5, opacity: 0.85 },
  ],
  // Wellness / Salute → cerchi pastello, ritmo lento e calmante
  wellness: [
    { type: 'blob',   top: '15%', left: '82%',  size: 180, color: '#a7f3d0', delay: 0,   duration: 8.0, opacity: 0.5 },
    { type: 'blob',   top: '65%', left: '6%',   size: 150, color: '#bfdbfe', delay: 1.2, duration: 7.0, opacity: 0.45 },
    { type: 'dot',    top: '35%', left: '5%',   size: 14,  color: '#ffffff', delay: 0.6, duration: 5.0, opacity: 0.9 },
  ],
  // Sport / Fitness → triangoli energici
  sport: [
    { type: 'triangle', top: '14%', left: '85%', size: 56, color: '#facc15', delay: 0,   duration: 2.4, opacity: 0.85 },
    { type: 'triangle', top: '70%', left: '6%',  size: 42, color: '#ffffff', delay: 0.5, duration: 2.8, opacity: 0.9 },
    { type: 'dot',      top: '50%', left: '94%', size: 14, color: '#ffffff', delay: 0.9, duration: 1.6, opacity: 0.95 },
    { type: 'triangle', top: '85%', left: '78%', size: 30, color: '#fde68a', delay: 1.4, duration: 3.0, opacity: 0.8 },
  ],
  // Tech / Auto / Trades → quadrati ruotati
  tech: [
    { type: 'square', top: '18%', left: '88%', size: 50, color: '#ffffff',  delay: 0,    duration: 5.5, opacity: 0.65 },
    { type: 'square', top: '65%', left: '5%',  size: 64, color: '#fcd34d',  delay: 0.7,  duration: 6.0, opacity: 0.55 },
    { type: 'dot',    top: '40%', left: '92%', size: 14, color: '#ffffff',  delay: 0.4,  duration: 4.0, opacity: 0.85 },
  ],
  // Professionali → cerchi soft + dot, eleganza sobria
  professional: [
    { type: 'blob',   top: '20%', left: '83%', size: 170, color: '#ffffff', delay: 0,   duration: 9.0, opacity: 0.25 },
    { type: 'dot',    top: '74%', left: '10%', size: 18,  color: '#ffffff', delay: 0.8, duration: 6.0, opacity: 0.85 },
    { type: 'dot',    top: '50%', left: '4%',  size: 12,  color: '#fcd34d', delay: 1.4, duration: 5.0, opacity: 0.9 },
  ],
  default: [
    { type: 'blob', top: '15%', left: '85%', size: 160, color: '#ffffff', delay: 0,   duration: 6.5, opacity: 0.3 },
    { type: 'blob', top: '70%', left: '6%',  size: 140, color: '#ffffff', delay: 0.8, duration: 5.5, opacity: 0.22 },
    { type: 'dot',  top: '40%', left: '90%', size: 14, color: '#ffffff', delay: 0.4,  duration: 4.0, opacity: 0.9 },
  ],
};

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

function Shape({ type, size, color, opacity = 0.9 }) {
  if (type === 'sparkle') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: `drop-shadow(0 0 8px ${color}77)` }}>
        <path d="M12 2 L13.5 9 L21 11 L13.5 13 L12 21 L10.5 13 L3 11 L10.5 9 Z" fill={color} opacity={opacity} />
      </svg>
    );
  }
  if (type === 'triangle') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}>
        <path d="M12 3 L22 21 L2 21 Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round" fill={`${color}22`} opacity={opacity} />
      </svg>
    );
  }
  if (type === 'square') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}>
        <rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth="2.5" fill={`${color}22`} opacity={opacity} />
      </svg>
    );
  }
  if (type === 'dot') {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color, opacity,
        boxShadow: `0 0 ${size}px ${color}66`
      }} />
    );
  }
  if (type === 'circle') {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${color}, ${color}33 70%, transparent 100%)`,
        opacity,
        filter: 'blur(1px)'
      }} />
    );
  }
  // blob = grande, molto morbido, sfondo soft
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
      opacity,
      filter: 'blur(4px)'
    }} />
  );
}

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
          <Shape type={d.type} size={d.size} color={d.color || color} opacity={d.opacity ?? 0.85} />
        </span>
      ))}

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
        .wf-deco-blob     { animation: wfFloat   ease-in-out infinite; }
        .wf-deco-dot      { animation: wfPulse   ease-in-out infinite; }
        .wf-deco-triangle { animation: wfSpin    linear        infinite; }
        .wf-deco-square   { animation: wfDrift   ease-in-out infinite; }

        @keyframes wfTwinkle {
          0%, 100% { transform: scale(0.55) rotate(0deg);   opacity: 0.45; }
          50%      { transform: scale(1.15) rotate(180deg); opacity: 1; }
        }
        @keyframes wfFloat {
          0%, 100% { transform: translateY(0) translateX(0); }
          50%      { transform: translateY(-22px) translateX(14px); }
        }
        @keyframes wfPulse {
          0%, 100% { transform: scale(0.75); opacity: 0.55; }
          50%      { transform: scale(1.4);  opacity: 1; }
        }
        @keyframes wfSpin {
          from { transform: rotate(0deg)   translateY(0); }
          50%  { transform: rotate(180deg) translateY(-12px); }
          to   { transform: rotate(360deg) translateY(0); }
        }
        @keyframes wfDrift {
          0%, 100% { transform: rotate(0deg)   translateY(0); }
          50%      { transform: rotate(30deg)  translateY(-18px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .wf-deco { animation: none !important; opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

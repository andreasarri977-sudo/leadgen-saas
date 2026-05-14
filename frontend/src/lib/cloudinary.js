// Cloudinary URL helper - auto-enhance immagini remote via "fetch" mode.
// Non serve API key segreta: la fetch transformation è pubblica e richiede
// solo il cloud_name. Cloudinary scarica l'immagine remota, applica le
// trasformazioni e cache-a il risultato sulla loro CDN.
//
// Docs: https://cloudinary.com/documentation/fetch_remote_images

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;

// Preset di trasformazioni "auto-enhance":
// - f_auto: formato ottimale (avif/webp/jpg) in base al browser
// - q_auto: qualità ottimizzata bilanciata
// - e_improve: auto color/contrast/brightness correction
// - e_sharpen:60: nitidezza leggera (60 su 0-2000)
// - dpr_auto: serve risoluzione 1x/2x/3x in base allo schermo
const DEFAULT_TRANSFORMS = 'f_auto,q_auto,e_improve,e_sharpen:60,dpr_auto';

/**
 * Avvolge una URL immagine remota con Cloudinary fetch + trasformazioni.
 *  - Se cloud_name non è configurato, ritorna l'URL originale (no-op).
 *  - Se l'URL è già un data URI o un /image/fetch/, ritorna così com'è.
 *  - Per immagini con query string (es. Google Places con `?key=`), Cloudinary
 *    fetch funziona comunque perché tratta la URL come opaca.
 *
 * @param {string} url - URL immagine remota
 * @param {object} [opts] - { width, height, transforms }
 * @returns {string} URL Cloudinary trasformato o URL originale
 */
export function cloudinaryEnhance(url, opts = {}) {
  if (!url || typeof url !== 'string') return url;
  if (!CLOUD_NAME) return url;
  if (url.startsWith('data:')) return url;
  if (url.includes('/image/fetch/')) return url;
  if (url.startsWith('/')) return url; // path locale: salta

  const parts = [DEFAULT_TRANSFORMS];
  if (opts.width) parts.push(`w_${parseInt(opts.width, 10)}`);
  if (opts.height) parts.push(`h_${parseInt(opts.height, 10)}`);
  if (opts.transforms) parts.push(opts.transforms);

  const transforms = parts.join(',');
  // encodeURIComponent ma preserva i due-punti dello schema (Cloudinary lo tollera)
  const encoded = encodeURI(url);
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transforms}/${encoded}`;
}

/**
 * Disabilitabile via parametro: utile in caso di immagini già ottimizzate
 * o per A/B test.
 */
export function maybeEnhance(url, enabled = true, opts = {}) {
  return enabled ? cloudinaryEnhance(url, opts) : url;
}

export const CLOUDINARY_CONFIGURED = Boolean(CLOUD_NAME);

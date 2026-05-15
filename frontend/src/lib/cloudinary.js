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
// - e_sharpen:60: nitidezza leggera
// NOTA: rimossi e_improve e dpr_auto perché su alcuni cloud free
// l'addon "e_improve" non è attivo e ritorna 401, rompendo tutte
// le immagini. Sharpen è gratuito su tutti i piani.
const DEFAULT_TRANSFORMS = 'f_auto,q_auto,e_sharpen:60';

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

/**
 * Handler `onError` per <img>: se Cloudinary fallisce (401/404/timeout),
 * il browser ricarica automaticamente l'URL originale.
 *
 * Uso: <img src={cloudinaryEnhance(url, {width: 600})}
 *           data-fallback={url}
 *           onError={cloudinaryFallback} />
 */
export function cloudinaryFallback(event) {
  const img = event.target;
  if (!img || img.dataset.cloudinaryFallbackTried === '1') return;
  const original = img.dataset.fallback;
  if (original && img.src !== original) {
    img.dataset.cloudinaryFallbackTried = '1';
    img.src = original;
  }
}

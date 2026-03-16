// Sistema i18n completo per siti demo multilingua
// Supporta: IT (Italiano), FR (Francese), EN (Inglese), ES (Spagnolo), DE (Tedesco)

const translations = {
  // ===================
  // ITALIANO
  // ===================
  it: {
    // Navigazione
    nav: {
      about: 'Chi Siamo',
      services: 'Servizi',
      menu: 'Menu',
      gallery: 'Galleria',
      reviews: 'Recensioni',
      hours: 'Orari',
      location: 'Dove Siamo',
      contact: 'Contatti',
      booking: 'Prenota'
    },
    // Hero & CTA
    hero: {
      callNow: 'Chiama Ora',
      directions: 'Indicazioni',
      bookOnline: 'Prenota Online',
      bookTable: 'Prenota un Tavolo',
      bookAppointment: 'Prenota Appuntamento',
      contactUs: 'Contattaci',
      whatsapp: 'WhatsApp'
    },
    // Sezioni
    sections: {
      aboutTitle: 'Chi Siamo',
      servicesTitle: 'I Nostri Servizi',
      menuTitle: 'Il Nostro Menu',
      galleryTitle: 'Galleria',
      reviewsTitle: 'Cosa Dicono i Clienti',
      hoursTitle: 'Orari di Apertura',
      locationTitle: 'Dove Siamo',
      contactTitle: 'Contatti',
      bookingTitle: 'Prenota',
      bookTableTitle: 'Prenota un Tavolo',
      bookAppointmentTitle: 'Prenota Appuntamento'
    },
    // Info bar
    info: {
      address: 'Indirizzo',
      phone: 'Telefono',
      rating: 'Valutazione',
      reviews: 'recensioni'
    },
    // Bottoni e azioni
    buttons: {
      openGoogleMaps: 'Apri su Google Maps',
      allReviews: 'Leggi tutte le recensioni su Google',
      howToArrive: 'Come Arrivare',
      call: 'Chiama',
      send: 'Invia',
      book: 'Prenota',
      confirm: 'Conferma',
      cancel: 'Annulla'
    },
    // Form prenotazione
    booking: {
      selectDate: 'Seleziona data',
      selectTime: 'Seleziona orario',
      numberOfPeople: 'Numero di persone',
      yourName: 'Il tuo nome',
      yourPhone: 'Il tuo telefono',
      yourEmail: 'La tua email',
      notes: 'Note aggiuntive',
      person: 'persona',
      people: 'persone',
      confirmBooking: 'Conferma Prenotazione',
      bookingSuccess: 'Prenotazione inviata con successo!',
      bookingError: 'Errore nell\'invio della prenotazione',
      externalBooking: 'Prenota su'
    },
    // Stati vuoti
    empty: {
      noReviews: 'Nessuna recensione disponibile',
      noHours: 'Orari non disponibili',
      noPhotos: 'Nessuna foto disponibile',
      noServices: 'Servizi non disponibili'
    },
    // Footer
    footer: {
      allRightsReserved: 'Tutti i diritti riservati',
      contact: 'Contatti',
      hours: 'Orari'
    },
    // Recensioni
    reviews: {
      autoTranslated: 'Traduzione automatica',
      readAllOnGoogle: 'Leggi tutte le recensioni su Google'
    },
    // Giorni della settimana
    days: {
      monday: 'Lunedì',
      tuesday: 'Martedì',
      wednesday: 'Mercoledì',
      thursday: 'Giovedì',
      friday: 'Venerdì',
      saturday: 'Sabato',
      sunday: 'Domenica'
    },
    // CTA finale
    cta: {
      bookYourTable: 'Prenota il Tuo Tavolo',
      contactToday: 'Contattaci Oggi',
      comeVisitUs: 'Vieni a trovarci per un\'esperienza indimenticabile',
      atYourService: 'è a tua disposizione'
    },
    // Misc
    misc: {
      trustBusiness: 'di fiducia',
      professionalService: 'Servizio professionale di alta qualità',
      in: 'a'
    }
  },

  // ===================
  // FRANCESE
  // ===================
  fr: {
    // Navigazione
    nav: {
      about: 'À Propos',
      services: 'Services',
      menu: 'Menu',
      gallery: 'Galerie',
      reviews: 'Avis',
      hours: 'Horaires',
      location: 'Nous Trouver',
      contact: 'Contact',
      booking: 'Réserver'
    },
    // Hero & CTA
    hero: {
      callNow: 'Appeler',
      directions: 'Itinéraire',
      bookOnline: 'Réserver en Ligne',
      bookTable: 'Réserver une Table',
      bookAppointment: 'Prendre Rendez-vous',
      contactUs: 'Nous Contacter',
      whatsapp: 'WhatsApp'
    },
    // Sezioni
    sections: {
      aboutTitle: 'À Propos de Nous',
      servicesTitle: 'Nos Services',
      menuTitle: 'Notre Menu',
      galleryTitle: 'Galerie',
      reviewsTitle: 'Ce que Disent nos Clients',
      hoursTitle: 'Horaires d\'Ouverture',
      locationTitle: 'Nous Trouver',
      contactTitle: 'Contact',
      bookingTitle: 'Réservation',
      bookTableTitle: 'Réserver une Table',
      bookAppointmentTitle: 'Prendre Rendez-vous'
    },
    // Info bar
    info: {
      address: 'Adresse',
      phone: 'Téléphone',
      rating: 'Note',
      reviews: 'avis'
    },
    // Bottoni e azioni
    buttons: {
      openGoogleMaps: 'Ouvrir sur Google Maps',
      allReviews: 'Lire tous les avis sur Google',
      howToArrive: 'Comment y Aller',
      call: 'Appeler',
      send: 'Envoyer',
      book: 'Réserver',
      confirm: 'Confirmer',
      cancel: 'Annuler'
    },
    // Form prenotazione
    booking: {
      selectDate: 'Choisir une date',
      selectTime: 'Choisir une heure',
      numberOfPeople: 'Nombre de personnes',
      yourName: 'Votre nom',
      yourPhone: 'Votre téléphone',
      yourEmail: 'Votre email',
      notes: 'Notes supplémentaires',
      person: 'personne',
      people: 'personnes',
      confirmBooking: 'Confirmer la Réservation',
      bookingSuccess: 'Réservation envoyée avec succès !',
      bookingError: 'Erreur lors de l\'envoi de la réservation',
      externalBooking: 'Réserver sur'
    },
    // Stati vuoti
    empty: {
      noReviews: 'Aucun avis disponible',
      noHours: 'Horaires non disponibles',
      noPhotos: 'Aucune photo disponible',
      noServices: 'Services non disponibles'
    },
    // Footer
    footer: {
      allRightsReserved: 'Tous droits réservés',
      contact: 'Contact',
      hours: 'Horaires'
    },
    // Recensioni
    reviews: {
      autoTranslated: 'Traduction automatique',
      readAllOnGoogle: 'Lire tous les avis sur Google'
    },
    // Giorni della settimana
    days: {
      monday: 'Lundi',
      tuesday: 'Mardi',
      wednesday: 'Mercredi',
      thursday: 'Jeudi',
      friday: 'Vendredi',
      saturday: 'Samedi',
      sunday: 'Dimanche'
    },
    // CTA finale
    cta: {
      bookYourTable: 'Réservez Votre Table',
      contactToday: 'Contactez-nous Aujourd\'hui',
      comeVisitUs: 'Venez nous rendre visite pour une expérience inoubliable',
      atYourService: 'est à votre service'
    },
    // Misc
    misc: {
      trustBusiness: 'de confiance',
      professionalService: 'Service professionnel de haute qualité',
      in: 'à'
    }
  },

  // ===================
  // INGLESE
  // ===================
  en: {
    // Navigazione
    nav: {
      about: 'About Us',
      services: 'Services',
      menu: 'Menu',
      gallery: 'Gallery',
      reviews: 'Reviews',
      hours: 'Hours',
      location: 'Location',
      contact: 'Contact',
      booking: 'Book'
    },
    // Hero & CTA
    hero: {
      callNow: 'Call Now',
      directions: 'Directions',
      bookOnline: 'Book Online',
      bookTable: 'Book a Table',
      bookAppointment: 'Book Appointment',
      contactUs: 'Contact Us',
      whatsapp: 'WhatsApp'
    },
    // Sezioni
    sections: {
      aboutTitle: 'About Us',
      servicesTitle: 'Our Services',
      menuTitle: 'Our Menu',
      galleryTitle: 'Gallery',
      reviewsTitle: 'What Our Clients Say',
      hoursTitle: 'Opening Hours',
      locationTitle: 'Location',
      contactTitle: 'Contact',
      bookingTitle: 'Book',
      bookTableTitle: 'Book a Table',
      bookAppointmentTitle: 'Book Appointment'
    },
    // Info bar
    info: {
      address: 'Address',
      phone: 'Phone',
      rating: 'Rating',
      reviews: 'reviews'
    },
    // Bottoni e azioni
    buttons: {
      openGoogleMaps: 'Open on Google Maps',
      allReviews: 'Read all reviews on Google',
      howToArrive: 'How to Get There',
      call: 'Call',
      send: 'Send',
      book: 'Book',
      confirm: 'Confirm',
      cancel: 'Cancel'
    },
    // Form prenotazione
    booking: {
      selectDate: 'Select date',
      selectTime: 'Select time',
      numberOfPeople: 'Number of people',
      yourName: 'Your name',
      yourPhone: 'Your phone',
      yourEmail: 'Your email',
      notes: 'Additional notes',
      person: 'person',
      people: 'people',
      confirmBooking: 'Confirm Booking',
      bookingSuccess: 'Booking sent successfully!',
      bookingError: 'Error sending booking',
      externalBooking: 'Book on'
    },
    // Stati vuoti
    empty: {
      noReviews: 'No reviews available',
      noHours: 'Hours not available',
      noPhotos: 'No photos available',
      noServices: 'Services not available'
    },
    // Footer
    footer: {
      allRightsReserved: 'All rights reserved',
      contact: 'Contact',
      hours: 'Hours'
    },
    // Recensioni
    reviews: {
      autoTranslated: 'Auto-translated',
      readAllOnGoogle: 'Read all reviews on Google'
    },
    // Giorni della settimana
    days: {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    },
    // CTA finale
    cta: {
      bookYourTable: 'Book Your Table',
      contactToday: 'Contact Us Today',
      comeVisitUs: 'Visit us for an unforgettable experience',
      atYourService: 'is at your service'
    },
    // Misc
    misc: {
      trustBusiness: 'you can trust',
      professionalService: 'High quality professional service',
      in: 'in'
    }
  },

  // ===================
  // SPAGNOLO
  // ===================
  es: {
    // Navigazione
    nav: {
      about: 'Sobre Nosotros',
      services: 'Servicios',
      menu: 'Menú',
      gallery: 'Galería',
      reviews: 'Reseñas',
      hours: 'Horarios',
      location: 'Ubicación',
      contact: 'Contacto',
      booking: 'Reservar'
    },
    // Hero & CTA
    hero: {
      callNow: 'Llamar Ahora',
      directions: 'Cómo Llegar',
      bookOnline: 'Reservar Online',
      bookTable: 'Reservar Mesa',
      bookAppointment: 'Reservar Cita',
      contactUs: 'Contáctenos',
      whatsapp: 'WhatsApp'
    },
    // Sezioni
    sections: {
      aboutTitle: 'Sobre Nosotros',
      servicesTitle: 'Nuestros Servicios',
      menuTitle: 'Nuestro Menú',
      galleryTitle: 'Galería',
      reviewsTitle: 'Lo que Dicen Nuestros Clientes',
      hoursTitle: 'Horario de Apertura',
      locationTitle: 'Ubicación',
      contactTitle: 'Contacto',
      bookingTitle: 'Reservar',
      bookTableTitle: 'Reservar Mesa',
      bookAppointmentTitle: 'Reservar Cita'
    },
    // Info bar
    info: {
      address: 'Dirección',
      phone: 'Teléfono',
      rating: 'Valoración',
      reviews: 'reseñas'
    },
    // Bottoni e azioni
    buttons: {
      openGoogleMaps: 'Abrir en Google Maps',
      allReviews: 'Leer todas las reseñas en Google',
      howToArrive: 'Cómo Llegar',
      call: 'Llamar',
      send: 'Enviar',
      book: 'Reservar',
      confirm: 'Confirmar',
      cancel: 'Cancelar'
    },
    // Form prenotazione
    booking: {
      selectDate: 'Seleccionar fecha',
      selectTime: 'Seleccionar hora',
      numberOfPeople: 'Número de personas',
      yourName: 'Tu nombre',
      yourPhone: 'Tu teléfono',
      yourEmail: 'Tu email',
      notes: 'Notas adicionales',
      person: 'persona',
      people: 'personas',
      confirmBooking: 'Confirmar Reserva',
      bookingSuccess: '¡Reserva enviada con éxito!',
      bookingError: 'Error al enviar la reserva',
      externalBooking: 'Reservar en'
    },
    // Stati vuoti
    empty: {
      noReviews: 'No hay reseñas disponibles',
      noHours: 'Horarios no disponibles',
      noPhotos: 'No hay fotos disponibles',
      noServices: 'Servicios no disponibles'
    },
    // Footer
    footer: {
      allRightsReserved: 'Todos los derechos reservados',
      contact: 'Contacto',
      hours: 'Horarios'
    },
    // Recensioni
    reviews: {
      autoTranslated: 'Traducción automática',
      readAllOnGoogle: 'Leer todas las reseñas en Google'
    },
    // Giorni della settimana
    days: {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    },
    // CTA finale
    cta: {
      bookYourTable: 'Reserva Tu Mesa',
      contactToday: 'Contáctanos Hoy',
      comeVisitUs: 'Visítanos para una experiencia inolvidable',
      atYourService: 'está a tu servicio'
    },
    // Misc
    misc: {
      trustBusiness: 'de confianza',
      professionalService: 'Servicio profesional de alta calidad',
      in: 'en'
    }
  },

  // ===================
  // TEDESCO
  // ===================
  de: {
    // Navigazione
    nav: {
      about: 'Über Uns',
      services: 'Dienstleistungen',
      menu: 'Speisekarte',
      gallery: 'Galerie',
      reviews: 'Bewertungen',
      hours: 'Öffnungszeiten',
      location: 'Standort',
      contact: 'Kontakt',
      booking: 'Reservieren'
    },
    // Hero & CTA
    hero: {
      callNow: 'Jetzt Anrufen',
      directions: 'Anfahrt',
      bookOnline: 'Online Reservieren',
      bookTable: 'Tisch Reservieren',
      bookAppointment: 'Termin Buchen',
      contactUs: 'Kontaktieren Sie Uns',
      whatsapp: 'WhatsApp'
    },
    // Sezioni
    sections: {
      aboutTitle: 'Über Uns',
      servicesTitle: 'Unsere Dienstleistungen',
      menuTitle: 'Unsere Speisekarte',
      galleryTitle: 'Galerie',
      reviewsTitle: 'Was Unsere Kunden Sagen',
      hoursTitle: 'Öffnungszeiten',
      locationTitle: 'Standort',
      contactTitle: 'Kontakt',
      bookingTitle: 'Reservierung',
      bookTableTitle: 'Tisch Reservieren',
      bookAppointmentTitle: 'Termin Buchen'
    },
    // Info bar
    info: {
      address: 'Adresse',
      phone: 'Telefon',
      rating: 'Bewertung',
      reviews: 'Bewertungen'
    },
    // Bottoni e azioni
    buttons: {
      openGoogleMaps: 'Auf Google Maps Öffnen',
      allReviews: 'Alle Bewertungen auf Google lesen',
      howToArrive: 'Anfahrt',
      call: 'Anrufen',
      send: 'Senden',
      book: 'Buchen',
      confirm: 'Bestätigen',
      cancel: 'Abbrechen'
    },
    // Form prenotazione
    booking: {
      selectDate: 'Datum wählen',
      selectTime: 'Uhrzeit wählen',
      numberOfPeople: 'Anzahl der Personen',
      yourName: 'Ihr Name',
      yourPhone: 'Ihre Telefonnummer',
      yourEmail: 'Ihre E-Mail',
      notes: 'Zusätzliche Hinweise',
      person: 'Person',
      people: 'Personen',
      confirmBooking: 'Reservierung Bestätigen',
      bookingSuccess: 'Reservierung erfolgreich gesendet!',
      bookingError: 'Fehler beim Senden der Reservierung',
      externalBooking: 'Reservieren auf'
    },
    // Stati vuoti
    empty: {
      noReviews: 'Keine Bewertungen verfügbar',
      noHours: 'Öffnungszeiten nicht verfügbar',
      noPhotos: 'Keine Fotos verfügbar',
      noServices: 'Dienstleistungen nicht verfügbar'
    },
    // Footer
    footer: {
      allRightsReserved: 'Alle Rechte vorbehalten',
      contact: 'Kontakt',
      hours: 'Öffnungszeiten'
    },
    // Recensioni
    reviews: {
      autoTranslated: 'Automatische Übersetzung',
      readAllOnGoogle: 'Alle Bewertungen auf Google lesen'
    },
    // Giorni della settimana
    days: {
      monday: 'Montag',
      tuesday: 'Dienstag',
      wednesday: 'Mittwoch',
      thursday: 'Donnerstag',
      friday: 'Freitag',
      saturday: 'Samstag',
      sunday: 'Sonntag'
    },
    // CTA finale
    cta: {
      bookYourTable: 'Reservieren Sie Ihren Tisch',
      contactToday: 'Kontaktieren Sie Uns Heute',
      comeVisitUs: 'Besuchen Sie uns für ein unvergessliches Erlebnis',
      atYourService: 'steht Ihnen zur Verfügung'
    },
    // Misc
    misc: {
      trustBusiness: 'Ihres Vertrauens',
      professionalService: 'Professioneller Service höchster Qualität',
      in: 'in'
    }
  }
};

// Mapping paese -> lingua
export const COUNTRY_TO_LANGUAGE = {
  // Europa
  'IT': 'it', 'Italia': 'it', 'Italy': 'it',
  'FR': 'fr', 'Francia': 'fr', 'France': 'fr',
  'ES': 'es', 'Spagna': 'es', 'Spain': 'es', 'España': 'es',
  'DE': 'de', 'Germania': 'de', 'Germany': 'de', 'Deutschland': 'de',
  'AT': 'de', 'Austria': 'de', 'Österreich': 'de',
  'CH': 'de', 'Svizzera': 'de', 'Switzerland': 'de', 'Schweiz': 'de', 'Suisse': 'fr',
  'BE': 'fr', 'Belgio': 'fr', 'Belgium': 'fr', 'Belgique': 'fr',
  'GB': 'en', 'UK': 'en', 'Regno Unito': 'en', 'United Kingdom': 'en',
  'IE': 'en', 'Irlanda': 'en', 'Ireland': 'en',
  'US': 'en', 'USA': 'en', 'Stati Uniti': 'en', 'United States': 'en',
  'PT': 'es', 'Portogallo': 'es', 'Portugal': 'es', // Fallback a spagnolo
  'NL': 'en', 'Paesi Bassi': 'en', 'Netherlands': 'en', // Fallback a inglese
  // Default
  'default': 'en'
};

// Mapping giorno inglese -> chiave
const ENGLISH_DAY_MAP = {
  'monday': 'monday',
  'tuesday': 'tuesday',
  'wednesday': 'wednesday',
  'thursday': 'thursday',
  'friday': 'friday',
  'saturday': 'saturday',
  'sunday': 'sunday'
};

/**
 * Funzione principale di traduzione
 * @param {string} key - Chiave di traduzione (es. 'nav.about', 'hero.callNow')
 * @param {string} lang - Codice lingua (it, fr, en, es, de)
 * @returns {string} - Testo tradotto
 */
export function t(key, lang = 'it') {
  const language = lang?.toLowerCase() || 'it';
  const dict = translations[language] || translations['it'];
  
  // Supporta chiavi annidate come 'nav.about'
  const keys = key.split('.');
  let result = dict;
  
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      // Fallback a italiano se la chiave non esiste
      result = translations['it'];
      for (const fallbackKey of keys) {
        if (result && typeof result === 'object' && fallbackKey in result) {
          result = result[fallbackKey];
        } else {
          return key; // Ritorna la chiave se non trovata
        }
      }
      break;
    }
  }
  
  return typeof result === 'string' ? result : key;
}

/**
 * Ottiene la lingua dal paese
 * @param {string} country - Nome o codice del paese
 * @returns {string} - Codice lingua (it, fr, en, es, de)
 */
export function getLanguageFromCountry(country) {
  if (!country) return 'it';
  
  // Prova prima il match esatto
  if (COUNTRY_TO_LANGUAGE[country]) {
    return COUNTRY_TO_LANGUAGE[country];
  }
  
  // Prova uppercase
  if (COUNTRY_TO_LANGUAGE[country.toUpperCase()]) {
    return COUNTRY_TO_LANGUAGE[country.toUpperCase()];
  }
  
  // Prova con prima lettera maiuscola
  const capitalized = country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();
  if (COUNTRY_TO_LANGUAGE[capitalized]) {
    return COUNTRY_TO_LANGUAGE[capitalized];
  }
  
  return 'it'; // Default italiano
}

/**
 * Converte orari da formato Google (inglese) a formato localizzato
 * @param {string[]} hoursText - Array di stringhe orari da Google
 * @param {string} lang - Codice lingua
 * @returns {string[]} - Orari tradotti e formattati
 */
export function localizeHours(hoursText, lang = 'it') {
  if (!hoursText || hoursText.length === 0) return [];
  
  const dayTranslations = translations[lang]?.days || translations['it'].days;
  
  return hoursText.map(hourLine => {
    let localizedLine = hourLine;
    
    // Sostituisci giorni inglesi con traduzione
    Object.entries(ENGLISH_DAY_MAP).forEach(([engDay, dayKey]) => {
      const regex = new RegExp(engDay, 'gi');
      const translatedDay = dayTranslations[dayKey];
      localizedLine = localizedLine.replace(regex, translatedDay);
    });
    
    // Converti AM/PM a formato 24h se necessario
    localizedLine = convertTo24HourFormat(localizedLine);
    
    return localizedLine;
  });
}

/**
 * Converte orari AM/PM in formato 24h
 * @param {string} timeStr - Stringa con orario
 * @returns {string} - Orario in formato 24h
 */
function convertTo24HourFormat(timeStr) {
  // Pattern per catturare orari AM/PM: "9:00 AM" o "5:30 PM"
  const amPmRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
  
  return timeStr.replace(amPmRegex, (match, hours, minutes, period) => {
    let h = parseInt(hours, 10);
    const m = minutes;
    
    if (period.toUpperCase() === 'PM' && h !== 12) {
      h += 12;
    } else if (period.toUpperCase() === 'AM' && h === 12) {
      h = 0;
    }
    
    return `${h.toString().padStart(2, '0')}:${m}`;
  });
}

/**
 * Verifica se un testo contiene parole di una lingua diversa
 * @param {string} text - Testo da verificare
 * @param {string} expectedLang - Lingua attesa
 * @returns {boolean} - True se contiene parole di altre lingue
 */
export function hasWrongLanguageWords(text, expectedLang) {
  if (!text || !expectedLang) return false;
  
  const langMarkers = {
    it: ['benvenuti', 'servizi', 'chi siamo', 'contatti', 'orari', 'dove siamo', 'chiama'],
    fr: ['bienvenue', 'services', 'à propos', 'contact', 'horaires', 'nous trouver', 'appeler'],
    en: ['welcome', 'services', 'about us', 'contact', 'hours', 'location', 'call'],
    es: ['bienvenidos', 'servicios', 'sobre nosotros', 'contacto', 'horarios', 'ubicación', 'llamar'],
    de: ['willkommen', 'dienstleistungen', 'über uns', 'kontakt', 'öffnungszeiten', 'standort', 'anrufen']
  };
  
  const textLower = text.toLowerCase();
  
  // Controlla se ci sono marker di altre lingue
  for (const [lang, markers] of Object.entries(langMarkers)) {
    if (lang !== expectedLang) {
      for (const marker of markers) {
        if (textLower.includes(marker)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Ottiene tutto il dizionario per una lingua
 * @param {string} lang - Codice lingua
 * @returns {object} - Dizionario completo
 */
export function getTranslations(lang = 'it') {
  return translations[lang?.toLowerCase()] || translations['it'];
}

export default translations;

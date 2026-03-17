# HTML Generator per siti statici white-label
from datetime import datetime
from typing import Dict, List, Optional
import re
from urllib.parse import quote

# Traduzioni giorni della settimana (da inglese a lingua locale)
DAYS_TRANSLATIONS = {
    "it": {
        "Monday": "Lunedì", "Tuesday": "Martedì", "Wednesday": "Mercoledì",
        "Thursday": "Giovedì", "Friday": "Venerdì", "Saturday": "Sabato", "Sunday": "Domenica",
        "Closed": "Chiuso", "Open 24 hours": "Aperto 24 ore"
    },
    "fr": {
        "Monday": "Lundi", "Tuesday": "Mardi", "Wednesday": "Mercredi",
        "Thursday": "Jeudi", "Friday": "Vendredi", "Saturday": "Samedi", "Sunday": "Dimanche",
        "Closed": "Fermé", "Open 24 hours": "Ouvert 24h"
    },
    "es": {
        "Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miércoles",
        "Thursday": "Jueves", "Friday": "Viernes", "Saturday": "Sábado", "Sunday": "Domingo",
        "Closed": "Cerrado", "Open 24 hours": "Abierto 24 horas"
    },
    "de": {
        "Monday": "Montag", "Tuesday": "Dienstag", "Wednesday": "Mittwoch",
        "Thursday": "Donnerstag", "Friday": "Freitag", "Saturday": "Samstag", "Sunday": "Sonntag",
        "Closed": "Geschlossen", "Open 24 hours": "24 Stunden geöffnet"
    },
    "en": {}  # Nessuna traduzione necessaria per inglese
}

def translate_hours(hours_list: List[str], lang: str) -> List[str]:
    """Traduce gli orari nella lingua specificata"""
    if not hours_list or lang == "en":
        return hours_list
    
    translations = DAYS_TRANSLATIONS.get(lang, {})
    if not translations:
        return hours_list
    
    translated = []
    for h in hours_list:
        # Normalizza spazi Unicode speciali
        text = h.replace('\u202f', ' ').replace('\u2009', ' ').replace('\u00a0', ' ')
        
        # Traduci giorni e parole chiave
        for en_word, local_word in translations.items():
            text = text.replace(en_word, local_word)
        
        # Converti formato orario AM/PM in 24h se non è inglese
        def convert_am(m):
            hour = int(m.group(1))
            return f"{hour:02d}:{m.group(2)}"
        
        def convert_pm(m):
            hour = int(m.group(1))
            if hour < 12:
                hour += 12
            return f"{hour:02d}:{m.group(2)}"
        
        text = re.sub(r'(\d{1,2}):(\d{2})\s*AM', convert_am, text)
        text = re.sub(r'(\d{1,2}):(\d{2})\s*PM', convert_pm, text)
        
        # Normalizza dash e spazi multipli
        text = re.sub(r'\s*[–—-]\s*', ' – ', text)
        text = re.sub(r'\s+', ' ', text)
        
        translated.append(text.strip())
    return translated

# Traduzioni
STATIC_TRANSLATIONS = {
    "it": {
        "nav": {"about": "Chi Siamo", "services": "Servizi", "menu": "Menu", "gallery": "Galleria", "reviews": "Recensioni", "hours": "Orari", "location": "Dove Siamo", "contact": "Contatti"},
        "hero": {"whatsapp": "WhatsApp", "directions": "Indicazioni", "call": "Chiama"},
        "whatsapp_msg": "Ciao! Ho visto il vostro sito e vorrei informazioni.",
        "info": {"address": "Indirizzo", "phone": "Telefono", "rating": "Valutazione", "reviews": "recensioni"},
        "sections": {"about": "Chi Siamo", "services": "I Nostri Servizi", "menu": "Il Nostro Menu", "gallery": "Galleria", "reviews": "Cosa Dicono i Clienti", "hours": "Orari di Apertura", "location": "Dove Siamo", "contact": "Contatti"},
        "buttons": {"google_maps": "Apri su Google Maps", "all_reviews": "Leggi tutte le recensioni su Google"},
        "footer": {"rights": "Tutti i diritti riservati"},
        "cta": {"contact_today": "Contattaci Oggi", "visit_us": "Vieni a trovarci"},
        "misc": {"trust": "di fiducia", "in": "a"}
    },
    "fr": {
        "nav": {"about": "À Propos", "services": "Services", "menu": "Menu", "gallery": "Galerie", "reviews": "Avis", "hours": "Horaires", "location": "Nous Trouver", "contact": "Contact"},
        "hero": {"whatsapp": "WhatsApp", "directions": "Itinéraire", "call": "Appeler"},
        "whatsapp_msg": "Bonjour ! J'ai vu votre site et j'aimerais avoir des informations.",
        "info": {"address": "Adresse", "phone": "Téléphone", "rating": "Note", "reviews": "avis"},
        "sections": {"about": "À Propos de Nous", "services": "Nos Services", "menu": "Notre Menu", "gallery": "Galerie", "reviews": "Ce que Disent nos Clients", "hours": "Horaires d'Ouverture", "location": "Nous Trouver", "contact": "Contact"},
        "buttons": {"google_maps": "Ouvrir sur Google Maps", "all_reviews": "Lire tous les avis sur Google"},
        "footer": {"rights": "Tous droits réservés"},
        "cta": {"contact_today": "Contactez-nous Aujourd'hui", "visit_us": "Venez nous rendre visite"},
        "misc": {"trust": "de confiance", "in": "à"}
    },
    "en": {
        "nav": {"about": "About Us", "services": "Services", "menu": "Menu", "gallery": "Gallery", "reviews": "Reviews", "hours": "Hours", "location": "Location", "contact": "Contact"},
        "hero": {"whatsapp": "WhatsApp", "directions": "Directions", "call": "Call"},
        "whatsapp_msg": "Hi! I saw your website and I'd like some information.",
        "info": {"address": "Address", "phone": "Phone", "rating": "Rating", "reviews": "reviews"},
        "sections": {"about": "About Us", "services": "Our Services", "menu": "Our Menu", "gallery": "Gallery", "reviews": "What Our Clients Say", "hours": "Opening Hours", "location": "Location", "contact": "Contact"},
        "buttons": {"google_maps": "Open on Google Maps", "all_reviews": "Read all reviews on Google"},
        "footer": {"rights": "All rights reserved"},
        "cta": {"contact_today": "Contact Us Today", "visit_us": "Visit us for an unforgettable experience"},
        "misc": {"trust": "you can trust", "in": "in"}
    },
    "es": {
        "nav": {"about": "Sobre Nosotros", "services": "Servicios", "menu": "Menú", "gallery": "Galería", "reviews": "Reseñas", "hours": "Horarios", "location": "Ubicación", "contact": "Contacto"},
        "hero": {"whatsapp": "WhatsApp", "directions": "Cómo Llegar", "call": "Llamar"},
        "whatsapp_msg": "¡Hola! Vi su sitio web y me gustaría obtener información.",
        "info": {"address": "Dirección", "phone": "Teléfono", "rating": "Valoración", "reviews": "reseñas"},
        "sections": {"about": "Sobre Nosotros", "services": "Nuestros Servicios", "menu": "Nuestro Menú", "gallery": "Galería", "reviews": "Lo que Dicen Nuestros Clientes", "hours": "Horario de Apertura", "location": "Ubicación", "contact": "Contacto"},
        "buttons": {"google_maps": "Abrir en Google Maps", "all_reviews": "Leer todas las reseñas en Google"},
        "footer": {"rights": "Todos los derechos reservados"},
        "cta": {"contact_today": "Contáctenos Hoy", "visit_us": "Visítanos para una experiencia inolvidable"},
        "misc": {"trust": "de confianza", "in": "en"}
    },
    "de": {
        "nav": {"about": "Über Uns", "services": "Dienstleistungen", "menu": "Speisekarte", "gallery": "Galerie", "reviews": "Bewertungen", "hours": "Öffnungszeiten", "location": "Standort", "contact": "Kontakt"},
        "hero": {"whatsapp": "WhatsApp", "directions": "Anfahrt", "call": "Anrufen"},
        "whatsapp_msg": "Hallo! Ich habe Ihre Website gesehen und würde gerne Informationen erhalten.",
        "info": {"address": "Adresse", "phone": "Telefon", "rating": "Bewertung", "reviews": "Bewertungen"},
        "sections": {"about": "Über Uns", "services": "Unsere Dienstleistungen", "menu": "Unsere Speisekarte", "gallery": "Galerie", "reviews": "Was Unsere Kunden Sagen", "hours": "Öffnungszeiten", "location": "Standort", "contact": "Kontakt"},
        "buttons": {"google_maps": "Auf Google Maps Öffnen", "all_reviews": "Alle Bewertungen auf Google lesen"},
        "footer": {"rights": "Alle Rechte vorbehalten"},
        "cta": {"contact_today": "Kontaktieren Sie Uns Heute", "visit_us": "Besuchen Sie uns für ein unvergessliches Erlebnis"},
        "misc": {"trust": "Ihres Vertrauens", "in": "in"}
    }
}

def get_whatsapp_link(phone: str, message: str) -> Optional[str]:
    if not phone:
        return None
    clean_phone = re.sub(r'[^0-9+]', '', phone).lstrip('+')
    return f"https://wa.me/{clean_phone}?text={quote(message)}"

def generate_static_html(demo: Dict, lang: str) -> str:
    """Genera HTML statico per deploy su Vercel"""
    business = demo.get('business_data', {})
    content = demo.get('content', {})
    t = STATIC_TRANSLATIONS.get(lang, STATIC_TRANSLATIONS['en'])
    
    business_name = demo.get('business_name', business.get('name', 'Business'))
    category = business.get('category', '')
    address = business.get('address', '')
    phone = business.get('phone', '')
    rating = business.get('rating', 0) or 0
    reviews_count = business.get('reviews_count', 0) or 0
    photos = business.get('photos', []) or []
    reviews = business.get('reviews', []) or []
    hours_text_raw = business.get('hours_text', []) or []
    # Traduci gli orari nella lingua del sito
    hours_text = translate_hours(hours_text_raw, lang)
    location = business.get('location', {}) or {}
    google_maps_link = business.get('google_maps_link', '')
    city = business.get('city', '')
    locale_lang = business.get('site_language', 'it')
    
    hero_photo = photos[0]['url'] if photos else ''
    gallery_photos = photos[1:9] if len(photos) > 1 else []
    
    whatsapp_link = get_whatsapp_link(phone, t['whatsapp_msg'])
    about_text = content.get('about_text', business_name + ' ' + t['misc']['trust'])
    
    # Build sections
    services_section = ""
    if content.get('menu_categories'):
        items_html = ""
        for cat in content['menu_categories']:
            cat_items = ''.join(['<li>' + item + '</li>' for item in cat.get('items', [])])
            items_html += '<div class="menu-cat"><h3>' + cat.get("name", "") + '</h3><ul>' + cat_items + '</ul></div>'
        services_section = '<section id="services" style="background:#f9fafb"><div class="container"><h2>' + t["sections"]["menu"] + '</h2>' + items_html + '</div></section>'
    elif content.get('services'):
        items_html = ""
        for i, service in enumerate(content['services'][:6]):
            items_html += '<div class="service-card"><span class="num">' + str(i+1) + '</span><h3>' + service + '</h3></div>'
        services_section = '<section id="services" style="background:#f9fafb"><div class="container"><h2>' + t["sections"]["services"] + '</h2>' + items_html + '</div></section>'
    
    gallery_section = ""
    if gallery_photos:
        gallery_items = ''.join(['<img src="' + p["url"] + '" alt="' + business_name + '" loading="lazy" />' for p in gallery_photos])
        gallery_section = '<section id="gallery"><div class="container"><h2>' + t["sections"]["gallery"] + '</h2><div class="gallery-grid">' + gallery_items + '</div></div></section>'
    
    reviews_section = ""
    good_reviews = [r for r in reviews if r.get('rating', 0) >= 4 and len(r.get('text', '')) > 10][:4]
    if good_reviews:
        reviews_items = ""
        for review in good_reviews:
            stars = '★' * int(review.get('rating', 5)) + '☆' * (5 - int(review.get('rating', 5)))
            # Usa relative_time_description o time come fallback
            time_ago = review.get('relative_time_description') or review.get('time', '')
            time_html = f'<span class="review-time">{time_ago}</span>' if time_ago else ''
            reviews_items += '<div class="review-card"><div class="stars">' + stars + '</div><p>"' + review.get('text', '')[:200] + '"</p><div class="review-footer"><span class="author">— ' + review.get('author', 'Cliente') + '</span>' + time_html + '</div></div>'
        reviews_link = '<p style="margin-top:24px;text-align:center"><a href="' + google_maps_link + '" target="_blank" style="color:#2563eb">' + t["buttons"]["all_reviews"] + ' →</a></p>' if google_maps_link else ''
        reviews_section = '<section id="reviews" style="background:#f9fafb"><div class="container"><h2>' + t["sections"]["reviews"] + '</h2><div class="reviews-grid">' + reviews_items + '</div>' + reviews_link + '</div></section>'
    
    hours_section = ""
    if hours_text:
        hours_items = ''.join(['<p>' + h + '</p>' for h in hours_text[:7]])
        hours_section = '<section id="hours"><div class="container"><h2>' + t["sections"]["hours"] + '</h2><div class="hours-box">' + hours_items + '</div></div></section>'
    
    map_section = ""
    if location.get('lat') and location.get('lng'):
        map_iframe = '<iframe src="https://www.google.com/maps?q=' + str(location["lat"]) + ',' + str(location["lng"]) + '&output=embed" width="100%" height="400" style="border:0" allowfullscreen loading="lazy"></iframe>'
        map_btn = '<div class="map-btn"><a href="' + google_maps_link + '" target="_blank" class="btn btn-primary">' + t["buttons"]["google_maps"] + '</a></div>' if google_maps_link else ''
        map_section = '<section id="location" style="background:#f9fafb"><div class="container"><h2>' + t["sections"]["location"] + '</h2><div class="map-wrapper">' + map_iframe + '</div>' + map_btn + '</div></section>'
    
    # CTA buttons
    wa_svg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>'
    
    primary_cta = ""
    if whatsapp_link:
        primary_cta = '<a href="' + whatsapp_link + '" target="_blank" class="btn btn-whatsapp">' + wa_svg + t["hero"]["whatsapp"] + '</a>'
    elif phone:
        primary_cta = '<a href="tel:' + phone + '" class="btn btn-primary">' + t["hero"]["call"] + '</a>'
    
    secondary_cta = ""
    if google_maps_link:
        secondary_cta = '<a href="' + google_maps_link + '" target="_blank" class="btn btn-secondary">' + t["hero"]["directions"] + '</a>'
    
    # Info bar items
    info_items = ""
    if address:
        info_items += '<div class="info-item"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><div><div class="info-label">' + t["info"]["address"] + '</div><div class="info-value">' + address + '</div></div></div>'
    if phone:
        info_items += '<div class="info-item"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg><div><div class="info-label">' + t["info"]["phone"] + '</div><div class="info-value"><a href="tel:' + phone + '">' + phone + '</a></div></div></div>'
    if rating and rating > 0:
        info_items += '<div class="info-item"><svg width="24" height="24" fill="#fbbf24" stroke="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><div><div class="info-label">' + t["info"]["rating"] + '</div><div class="info-value">' + str(rating) + ' (' + str(reviews_count) + ' ' + t["info"]["reviews"] + ')</div></div></div>'
    
    # Nav items
    nav_items = '<li><a href="#about">' + t["nav"]["about"] + '</a></li>'
    if services_section:
        nav_items += '<li><a href="#services">' + (t["nav"]["menu"] if content.get("menu_categories") else t["nav"]["services"]) + '</a></li>'
    if gallery_section:
        nav_items += '<li><a href="#gallery">' + t["nav"]["gallery"] + '</a></li>'
    if reviews_section:
        nav_items += '<li><a href="#reviews">' + t["nav"]["reviews"] + '</a></li>'
    nav_items += '<li><a href="#contact">' + t["nav"]["contact"] + '</a></li>'
    
    # Language switch
    locale_active = ' class="active"' if lang == locale_lang else ''
    en_active = ' class="active"' if lang == 'en' else ''
    lang_switch = '<div class="lang-switch"><a href="index.html"' + locale_active + '>' + locale_lang.upper() + '</a><a href="en.html"' + en_active + '>EN</a></div>'
    
    # Hero background
    hero_bg = '<div class="hero-bg"><img src="' + hero_photo + '" alt=""></div>' if hero_photo else ''
    
    # Footer
    footer_hours = ""
    if hours_text:
        footer_hours = '<div><h3>' + t["nav"]["hours"] + '</h3>' + ''.join(['<p>' + h + '</p>' for h in hours_text[:3]]) + '</div>'
    
    # Mobile bar
    mobile_wa = '<a href="' + whatsapp_link + '" target="_blank" class="wa">' + wa_svg + 'WhatsApp</a>' if whatsapp_link else ('<a href="tel:' + phone + '" class="wa">' + t["hero"]["call"] + '</a>' if phone else '')
    mobile_dir = '<a href="' + google_maps_link + '" target="_blank" class="dir">' + t["hero"]["directions"] + '</a>' if google_maps_link else ''
    
    # Contact CTA
    contact_primary = '<a href="' + whatsapp_link + '" target="_blank" class="btn btn-whatsapp">' + wa_svg + 'WhatsApp</a>' if whatsapp_link else ('<a href="tel:' + phone + '" class="btn btn-primary">' + phone + '</a>' if phone else '')
    contact_secondary = '<a href="' + google_maps_link + '" target="_blank" class="btn btn-secondary">' + t["buttons"]["google_maps"] + '</a>' if google_maps_link else ''
    
    css = '''*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;line-height:1.6;color:#1f2937;background:#fff}
.container{max-width:1200px;margin:0 auto;padding:0 20px}
nav{position:sticky;top:0;background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);border-bottom:1px solid #e5e7eb;z-index:100;padding:16px 0}
nav .container{display:flex;justify-content:space-between;align-items:center}
nav h1{font-size:1.25rem;font-weight:700}
nav ul{display:flex;gap:24px;list-style:none}
nav a{color:#4b5563;text-decoration:none;font-weight:500;font-size:0.9rem}
nav a:hover{color:#111}
.lang-switch{display:flex;gap:8px}
.lang-switch a{padding:4px 12px;border-radius:20px;font-size:0.8rem;border:1px solid #e5e7eb;text-decoration:none;color:#4b5563}
.lang-switch a.active{background:#111;color:#fff;border-color:#111}
.hero{background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;padding:80px 0;position:relative;overflow:hidden}
.hero-bg{position:absolute;inset:0;opacity:0.2}
.hero-bg img{width:100%;height:100%;object-fit:cover}
.hero-content{position:relative;z-index:1}
.hero h2{font-size:3rem;font-weight:700;margin-bottom:16px}
.hero p{font-size:1.25rem;opacity:0.9;margin-bottom:32px;max-width:600px}
.hero-btns{display:flex;gap:16px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:50px;font-weight:600;text-decoration:none;transition:all 0.2s}
.btn-whatsapp{background:#25D366;color:#fff}
.btn-whatsapp:hover{background:#128C7E;transform:scale(1.05)}
.btn-primary{background:#fff;color:#111}
.btn-secondary{background:rgba(255,255,255,0.2);color:#fff;backdrop-filter:blur(10px)}
.btn-secondary:hover{background:rgba(255,255,255,0.3)}
.info-bar{background:#f9fafb;padding:32px 0;border-bottom:1px solid #e5e7eb}
.info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px}
.info-item{display:flex;align-items:flex-start;gap:12px}
.info-item svg{color:#6b7280;flex-shrink:0}
.info-label{font-size:0.8rem;color:#6b7280;font-weight:500}
.info-value{font-weight:600}
.info-value a{color:inherit;text-decoration:none}
section{padding:64px 0}
section h2{font-size:2rem;font-weight:700;margin-bottom:32px}
.menu-cat{background:#f9fafb;padding:24px;border-radius:16px;margin-bottom:16px}
.menu-cat h3{font-size:1.25rem;margin-bottom:16px}
.menu-cat ul{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;list-style:none}
.menu-cat li{display:flex;align-items:center;gap:8px}
.menu-cat li::before{content:'•';color:#9ca3af}
.service-card{background:#f9fafb;padding:24px;border-radius:16px;display:inline-block;width:calc(33.333% - 16px);margin:8px;vertical-align:top}
.service-card .num{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:#2563eb;color:#fff;border-radius:8px;font-weight:700;margin-bottom:12px}
.service-card h3{font-size:1.1rem}
.gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.gallery-grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;cursor:pointer;transition:transform 0.2s}
.gallery-grid img:hover{transform:scale(1.05)}
.reviews-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.review-card{background:#fff;border:1px solid #e5e7eb;padding:24px;border-radius:16px}
.review-card .stars{color:#fbbf24;margin-bottom:12px;font-size:1.1rem}
.review-card p{color:#4b5563;margin-bottom:12px;font-style:italic}
.review-footer{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.review-card .author{font-weight:600;color:#111}
.review-card .review-time{font-size:0.85rem;color:#9ca3af}
.hours-box{background:#f9fafb;padding:32px;border-radius:16px;display:inline-block}
.hours-box p{margin-bottom:8px}
.map-wrapper{border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
.map-btn{text-align:center;margin-top:24px}
.contact-cta{background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;padding:64px;border-radius:24px;text-align:center}
.contact-cta h2{font-size:2.5rem;margin-bottom:16px}
.contact-cta p{opacity:0.9;margin-bottom:32px;font-size:1.1rem}
.contact-cta .btns{display:flex;justify-content:center;gap:16px;flex-wrap:wrap}
footer{background:#111;color:#fff;padding:48px 0}
.footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:32px;margin-bottom:32px}
.footer-grid h3{font-size:1.1rem;margin-bottom:16px}
.footer-grid p{color:#9ca3af;font-size:0.9rem;margin-bottom:8px}
.footer-bottom{border-top:1px solid #333;padding-top:24px;text-align:center;color:#6b7280;font-size:0.85rem}
.mobile-bar{display:none;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:2px solid #e5e7eb;z-index:100}
.mobile-bar a{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:16px;font-weight:600;text-decoration:none}
.mobile-bar .wa{background:#25D366;color:#fff}
.mobile-bar .dir{background:#111;color:#fff}
@media(max-width:768px){
nav ul{display:none}
.hero h2{font-size:2rem}
.hero{padding:48px 0}
.service-card{width:100%;margin:8px 0}
.menu-cat ul{grid-template-columns:1fr}
.mobile-bar{display:flex}
body{padding-bottom:60px}
section{padding:48px 0}
.contact-cta{padding:32px}
.contact-cta h2{font-size:1.75rem}
}'''

    html = '''<!DOCTYPE html>
<html lang="''' + lang + '''">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>''' + business_name + ' | ' + category + '''</title>
<meta name="description" content="''' + about_text[:160] + '''">
<meta property="og:title" content="''' + business_name + '''">
<meta property="og:description" content="''' + about_text[:160] + '''">
<meta property="og:type" content="website">
''' + ('<meta property="og:image" content="' + hero_photo + '">' if hero_photo else '') + '''
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>''' + css + '''</style>
</head>
<body>
<nav>
<div class="container">
<h1>''' + business_name + '''</h1>
<ul>''' + nav_items + '''</ul>
''' + lang_switch + '''
</div>
</nav>

<header class="hero">
''' + hero_bg + '''
<div class="container hero-content">
<h2>''' + business_name + '''</h2>
<p>''' + content.get("homepage_subtitle", category + ' ' + t['misc']['trust']) + '''</p>
<div class="hero-btns">
''' + primary_cta + '''
''' + secondary_cta + '''
</div>
</div>
</header>

<div class="info-bar">
<div class="container">
<div class="info-grid">
''' + info_items + '''
</div>
</div>
</div>

<section id="about">
<div class="container">
<h2>''' + t["sections"]["about"] + '''</h2>
<p style="font-size:1.1rem;max-width:800px">''' + about_text + '''</p>
</div>
</section>

''' + services_section + '''
''' + gallery_section + '''
''' + reviews_section + '''
''' + hours_section + '''
''' + map_section + '''

<section id="contact">
<div class="container">
<div class="contact-cta">
<h2>''' + content.get("cta_text", t["cta"]["contact_today"]) + '''</h2>
<p>''' + t["cta"]["visit_us"] + '''</p>
<div class="btns">
''' + contact_primary + '''
''' + contact_secondary + '''
</div>
</div>
</div>
</section>

<footer>
<div class="container">
<div class="footer-grid">
<div>
<h3>''' + business_name + '''</h3>
<p>''' + category + ' ' + t["misc"]["in"] + ' ' + city + '''</p>
</div>
<div>
<h3>''' + t["nav"]["contact"] + '''</h3>
''' + ('<p>' + phone + '</p>' if phone else '') + '''
''' + ('<p>' + address + '</p>' if address else '') + '''
</div>
''' + footer_hours + '''
</div>
<div class="footer-bottom">
© ''' + str(datetime.now().year) + ' ' + business_name + '. ' + t["footer"]["rights"] + '''.
</div>
</div>
</footer>

<div class="mobile-bar">
''' + mobile_wa + '''
''' + mobile_dir + '''
</div>
</body>
</html>'''
    
    return html

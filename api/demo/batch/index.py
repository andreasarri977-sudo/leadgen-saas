# /api/demo/batch/index.py - Generate multiple demos in batch (with optional template)
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import uuid
from datetime import datetime, timezone

def log(msg):
    print(f"[DEMO/BATCH] {msg}", file=sys.stderr, flush=True)

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("URL_MONGO")
DB_NAME = os.environ.get("DB_NAME", "leadhunter")


SERVICES_MAP = {
    'parrucchiere': ['Taglio Uomo', 'Taglio Donna', 'Colore', 'Piega', 'Trattamenti', 'Barba'],
    'barbiere': ['Taglio Classico', 'Barba', 'Rasatura', 'Trattamenti Viso', 'Hair Styling'],
    'estetista': ['Manicure', 'Pedicure', 'Ceretta', 'Trattamenti Viso', 'Massaggi'],
    'centro estetico': ['Trattamenti Viso', 'Trattamenti Corpo', 'Massaggi', 'Depilazione'],
    'tatuatore': ['Tatuaggi Custom', 'Coperture', 'Rimozione Laser', 'Piercing'],
    'nail salon': ['Manicure', 'Pedicure', 'Gel', 'Semipermanente', 'Nail Art'],
    'spa': ['Massaggi', 'Sauna', 'Bagno Turco', 'Trattamenti Benessere'],
    'ristorante': ['Pranzo', 'Cena', 'Menu Degustazione', 'Catering', 'Eventi Privati'],
    'pizzeria': ['Pizza Classica', 'Pizza Gourmet', 'Antipasti', 'Dolci', 'Bevande'],
    'bar': ['Caffetteria', 'Aperitivi', 'Cocktail', 'Brunch', 'Snack'],
    'caffetteria': ['Caffè Specialty', 'Colazione', 'Brunch', 'Pasticceria'],
    'gelateria': ['Gelato Artigianale', 'Granite', 'Semifreddi', 'Torte Gelato'],
    'pasticceria': ['Dolci', 'Torte', 'Pasticceria Secca', 'Colazioni'],
    'hamburgeria': ['Hamburger Classic', 'Hamburger Gourmet', 'Patatine', 'Bevande'],
    'fast food': ['Panini', 'Patatine', 'Bevande', 'Menù Combo'],
    'kebab': ['Kebab', 'Piadine', 'Falafel', 'Piatti Tipici'],
    'trattoria': ['Primi Piatti', 'Secondi', 'Contorni', 'Dolci della Casa'],
    'osteria': ['Taglieri', 'Primi Tradizionali', 'Carne', 'Formaggi', 'Vini'],
    'pub': ['Birre Artigianali', 'Cocktail', 'Panini', 'Patatine'],
    'sushi': ['Sushi', 'Sashimi', 'Uramaki', 'Tempura'],
    'dentista': ['Visita di Controllo', 'Pulizia Dentale', 'Sbiancamento', 'Ortodonzia', 'Implantologia'],
    'fisioterapista': ['Riabilitazione', 'Massoterapia', 'Terapia Manuale', 'Posturale'],
    'veterinario': ['Visite', 'Vaccinazioni', 'Chirurgia', 'Ecografie'],
    'farmacia': ['Farmaci', 'Parafarmaci', 'Cosmetici', 'Integratori'],
    'ottico': ['Esame Vista', 'Occhiali da Vista', 'Lenti a Contatto', 'Occhiali da Sole'],
    'palestra': ['Sala Pesi', 'Corsi Fitness', 'Personal Training', 'Yoga', 'Pilates'],
    'meccanico': ['Tagliando', 'Cambio Gomme', 'Riparazioni', 'Revisione', 'Carrozzeria'],
    'autolavaggio': ['Lavaggio Esterno', 'Lavaggio Completo', 'Sanificazione', 'Ceratura'],
    'gommista': ['Cambio Gomme', 'Equilibratura', 'Convergenza', 'Stoccaggio'],
    'idraulico': ['Riparazioni', 'Installazioni', 'Manutenzione', 'Emergenze'],
    'elettricista': ['Impianti', 'Riparazioni', 'Domotica', 'Emergenze'],
    'fabbro': ['Apertura Porte', 'Sostituzione Serrature', 'Casseforti', 'Emergenze'],
    'falegname': ['Mobili su Misura', 'Restauro', 'Infissi', 'Scale', 'Porte'],
    'imbianchino': ['Tinteggiatura', 'Decorazioni', 'Cartongesso', 'Esterni'],
    'fiorista': ['Bouquet', 'Composizioni', 'Piante', 'Addobbi Matrimoni'],
    'gioielleria': ['Gioielli', 'Orologi', 'Riparazioni', 'Incisioni'],
    'fotografo': ['Ritratti', 'Matrimoni', 'Eventi', 'Prodotti', 'Ritocco Foto'],
}

BOOKING_APPOINTMENT = {'parrucchiere', 'barbiere', 'estetista', 'centro estetico', 'tatuatore', 'nail salon', 'spa',
                       'dentista', 'fisioterapista', 'veterinario', 'ottico', 'palestra', 'fotografo', 'medico',
                       'psicologo', 'osteopata', 'personal trainer'}
BOOKING_TABLE = {'ristorante', 'pizzeria', 'trattoria', 'osteria', 'hamburgeria', 'sushi', 'pub', 'bar',
                 'caffetteria', 'gelateria', 'pasticceria'}


def build_demo_content(lead, template_data=None):
    """Build rich demo content matching single demo generator. Optionally apply template."""
    category = (lead.get('category') or 'servizio').lower()
    business_name = lead.get('name') or 'Attività'
    city = lead.get('city') or ''

    # Services with partial-match fallback
    services = SERVICES_MAP.get(category)
    if not services:
        for key, value in SERVICES_MAP.items():
            if key in category or category in key:
                services = value
                break
    if not services:
        services = ['Servizio Premium', 'Consulenza', 'Assistenza Clienti']

    # Booking mode
    booking_mode = 'none'
    if any(c in category for c in BOOKING_APPOINTMENT):
        booking_mode = 'appointment'
    elif any(c in category for c in BOOKING_TABLE):
        booking_mode = 'table'

    content = {
        "tagline": f"Il miglior {category} a {city}" if city else "Qualità e professionalità",
        "about_text": f"{business_name} è il punto di riferimento per {category} a {city}. Con anni di esperienza e passione, offriamo servizi di alta qualità per soddisfare ogni esigenza dei nostri clienti. Vieni a trovarci!",
        "homepage_subtitle": f"{category.title()} di qualità a {city}",
        "services": services,
        "services_intro": f"Scopri tutti i servizi offerti da {business_name}",
        "cta_text": "Contattaci Oggi!",
        "theme": "modern",
        "color_scheme": "blue",
        "why_choose_us": [
            {"icon": "⭐", "title": "Esperienza", "description": f"Anni di esperienza nel settore {category}"},
            {"icon": "💎", "title": "Qualità", "description": "Utilizziamo solo prodotti e materiali di prima scelta"},
            {"icon": "👨‍💼", "title": "Professionalità", "description": "Staff qualificato e sempre aggiornato"},
            {"icon": "❤️", "title": "Attenzione al Cliente", "description": "Ascoltiamo le tue esigenze per offrirti il meglio"}
        ],
        "faq": [
            {"question": "Come posso prenotare?", "answer": "Puoi prenotare telefonicamente, via WhatsApp o direttamente dal nostro sito web."},
            {"question": "Quali sono i metodi di pagamento accettati?", "answer": "Accettiamo contanti, carte di credito, bancomat e pagamenti digitali."},
            {"question": "Dove vi trovate?", "answer": f"Siamo situati a {city}. Trovi l'indirizzo completo e la mappa nella sezione contatti."},
            {"question": "È necessario prendere appuntamento?", "answer": "Per garantirti il miglior servizio, ti consigliamo di prenotare in anticipo."}
        ]
    }

    # Apply template overrides (color, FAQ, why_choose_us, texts) if provided
    if template_data:
        for k, v in template_data.items():
            if v is not None and k in {'color_scheme', 'hero_position', 'hero_overlay', 'theme',
                                       'tagline', 'homepage_subtitle', 'about_text', 'services_intro',
                                       'cta_text', 'why_choose_us', 'faq'}:
                content[k] = v

    return content, booking_mode


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}

            lead_ids = data.get('lead_ids', [])
            template_id = data.get('template_id')
            design_template = data.get('design_template') or 'classic'
            if not lead_ids:
                return self._error(400, "lead_ids richiesto (array)")

            log(f"Batch generating demos for {len(lead_ids)} leads, template={template_id}")

            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]

            template_data = None
            if template_id:
                tpl = db.templates.find_one({"template_id": template_id}, {"_id": 0})
                if tpl:
                    template_data = tpl.get('data') or {}

            # Layout default (applicato a tutti i nuovi demo se nessun template_id viene passato)
            layout_default = db.user_settings.find_one({"setting_id": "layout_default"}, {"_id": 0}) or {}
            if not data.get('design_template') and layout_default.get('design_template'):
                design_template = layout_default['design_template']

            results = {"created": [], "skipped": [], "errors": []}

            for lead_id in lead_ids:
                try:
                    lead = db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
                    if not lead:
                        results["errors"].append({"lead_id": lead_id, "error": "Lead non trovato"})
                        continue

                    existing = db.demo_sites.find_one({"lead_id": lead_id})
                    if existing:
                        results["skipped"].append({
                            "lead_id": lead_id,
                            "demo_id": existing.get("demo_id"),
                            "name": lead.get('name'),
                            "reason": "Demo già esistente"
                        })
                        continue

                    demo_id = str(uuid.uuid4())[:8]
                    content, booking_mode = build_demo_content(lead, template_data)

                    # Applica layout default sui campi NON gestiti dal template utente
                    for fld in ['section_order', 'text_color', 'color_intensity', 'title_align',
                                'show_reviews', 'show_gallery', 'show_whyus', 'show_faq',
                                'show_hours', 'show_map', 'show_services']:
                        if fld in layout_default and layout_default[fld] is not None and fld not in content:
                            content[fld] = layout_default[fld]
                    # Default centrato anche per batch (se non gestito da template o default)
                    if 'title_align' not in content:
                        content['title_align'] = 'center'

                    business_data = {
                        "place_id": lead.get('place_id'),
                        "name": lead.get('name'),
                        "category": lead.get('category'),
                        "address": lead.get('address'),
                        "city": lead.get('city'),
                        "country": lead.get('country'),
                        "phone": lead.get('phone'),
                        "email": lead.get('email'),
                        "rating": lead.get('rating'),
                        "reviews_count": lead.get('reviews_count'),
                        "reviews": lead.get('reviews', []),
                        "hours_text": lead.get('hours_text', []),
                        "photos": lead.get('photos', []),
                        "location": lead.get('location'),
                        "google_maps_link": lead.get('google_maps_link'),
                        "website": lead.get('website'),
                        "primary_type": lead.get('primary_type'),
                        "types": lead.get('types', []),
                        "site_language": lead.get('site_language', 'it'),
                        "booking_mode": booking_mode,
                        "external_booking_url": lead.get('external_booking_url')
                    }

                    demo = {
                        "demo_id": demo_id,
                        "lead_id": lead_id,
                        "business_name": lead.get('name'),
                        "internal_url": f"/demo/{demo_id}",
                        "status": "created",
                        "content": content,
                        "business_data": business_data,
                        "design_template": design_template,
                        "logo_base64": None,
                        "vercel_url": None,
                        "vercel_project_id": None,
                        "published": False,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }

                    db.demo_sites.insert_one(demo)
                    db.leads.update_one({"lead_id": lead_id}, {"$set": {"status": "demo_creata"}})

                    results["created"].append({
                        "lead_id": lead_id,
                        "demo_id": demo_id,
                        "name": lead.get('name')
                    })
                    log(f"Created demo {demo_id} for {lead.get('name')}")

                except Exception as e:
                    log(f"Error for lead {lead_id}: {e}")
                    results["errors"].append({"lead_id": lead_id, "error": str(e)})

            client.close()

            log(f"Batch complete: {len(results['created'])} created, {len(results['skipped'])} skipped, {len(results['errors'])} errors")

            self._json_response(200, {
                "message": f"Batch completato: {len(results['created'])} demo creati",
                "results": results
            })

        except json.JSONDecodeError as e:
            return self._error(400, f"JSON non valido: {str(e)}")
        except Exception as e:
            log(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            return self._error(500, f"Errore batch: {str(e)}")

    def _json_response(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _error(self, code, msg):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode())

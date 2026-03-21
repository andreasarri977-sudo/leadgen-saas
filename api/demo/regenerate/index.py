# /api/demo/regenerate/index.py - Regenerate Demo Site with updated content
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from datetime import datetime, timezone

def log(msg):
    print(f"[DEMO/REGENERATE] {msg}", file=sys.stderr, flush=True)

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("URL_MONGO")
DB_NAME = os.environ.get("DB_NAME", "leadhunter")

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
            
            demo_id = data.get('demo_id')
            if not demo_id:
                return self._error(400, "demo_id richiesto")
            
            log(f"Regenerating demo: {demo_id}")
            
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            # Get existing demo
            demo = db.demo_sites.find_one({"demo_id": demo_id})
            if not demo:
                client.close()
                return self._error(404, "Demo non trovato")
            
            # Get lead data
            lead_id = demo.get('lead_id')
            lead = db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
            if not lead:
                client.close()
                return self._error(404, "Lead non trovato")
            
            # Generate new content based on category
            category = lead.get('category', 'servizio').lower()
            business_name = lead.get('name', 'Attività')
            city = lead.get('city', '')
            
            # Services map - comprehensive list
            services_map = {
                # Bellezza & Cura persona
                'parrucchiere': ['Taglio Uomo', 'Taglio Donna', 'Colore', 'Piega', 'Trattamenti', 'Barba'],
                'barbiere': ['Taglio Classico', 'Barba', 'Rasatura', 'Trattamenti Viso', 'Hair Styling'],
                'estetista': ['Manicure', 'Pedicure', 'Ceretta', 'Trattamenti Viso', 'Massaggi', 'Epilazione Laser'],
                'centro estetico': ['Trattamenti Viso', 'Trattamenti Corpo', 'Massaggi', 'Depilazione', 'Solarium'],
                'tatuatore': ['Tatuaggi Custom', 'Coperture', 'Rimozione Laser', 'Piercing', 'Consulenza Design'],
                'tatuaggi': ['Tatuaggi Custom', 'Coperture', 'Rimozione Laser', 'Piercing', 'Consulenza Design'],
                'nail salon': ['Manicure', 'Pedicure', 'Gel', 'Semipermanente', 'Nail Art', 'Ricostruzione'],
                'spa': ['Massaggi', 'Sauna', 'Bagno Turco', 'Trattamenti Benessere', 'Percorso Spa'],
                # Ristorazione
                'ristorante': ['Pranzo', 'Cena', 'Menu Degustazione', 'Catering', 'Eventi Privati'],
                'pizzeria': ['Pizza Classica', 'Pizza Gourmet', 'Antipasti', 'Dolci', 'Bevande'],
                'bar': ['Caffetteria', 'Aperitivi', 'Cocktail', 'Brunch', 'Snack'],
                'caffetteria': ['Caffè Specialty', 'Colazione', 'Brunch', 'Pasticceria', 'Bevande'],
                'gelateria': ['Gelato Artigianale', 'Granite', 'Semifreddi', 'Torte Gelato', 'Bevande'],
                'pasticceria': ['Dolci', 'Torte', 'Pasticceria Secca', 'Colazioni', 'Catering Dolce'],
                'hamburgeria': ['Hamburger Classic', 'Hamburger Gourmet', 'Patatine', 'Bevande', 'Dessert'],
                'fast food': ['Panini', 'Patatine', 'Bevande', 'Menù Combo', 'Dessert'],
                'kebab': ['Kebab', 'Piadine', 'Falafel', 'Piatti Tipici', 'Bevande'],
                'imbiss': ['Currywurst', 'Döner', 'Pommes', 'Schnitzel', 'Getränke'],
                'trattoria': ['Primi Piatti', 'Secondi', 'Contorni', 'Dolci della Casa', 'Vini Locali'],
                'osteria': ['Taglieri', 'Primi Tradizionali', 'Carne', 'Formaggi', 'Vini'],
                'pub': ['Birre Artigianali', 'Cocktail', 'Panini', 'Patatine', 'Aperitivi'],
                'sushi': ['Sushi', 'Sashimi', 'Uramaki', 'Tempura', 'Piatti Caldi'],
                'poke': ['Poke Bowl', 'Sushi Burrito', 'Edamame', 'Gyoza', 'Bevande'],
                # Salute
                'dentista': ['Visita di Controllo', 'Pulizia Dentale', 'Sbiancamento', 'Ortodonzia', 'Implantologia'],
                'fisioterapista': ['Riabilitazione', 'Massoterapia', 'Terapia Manuale', 'Elettroterapia', 'Posturale'],
                'veterinario': ['Visite', 'Vaccinazioni', 'Chirurgia', 'Ecografie', 'Toelettatura'],
                'farmacia': ['Farmaci', 'Parafarmaci', 'Cosmetici', 'Integratori', 'Consulenza'],
                'ottico': ['Esame Vista', 'Occhiali da Vista', 'Lenti a Contatto', 'Occhiali da Sole', 'Riparazioni'],
                # Fitness
                'palestra': ['Sala Pesi', 'Corsi Fitness', 'Personal Training', 'Yoga', 'Pilates'],
                'centro yoga': ['Hatha Yoga', 'Vinyasa', 'Yin Yoga', 'Meditazione', 'Yoga Nidra'],
                'pilates': ['Mat Pilates', 'Reformer', 'Pilates Posturale', 'Lezioni Private', 'Corsi Gruppo'],
                'crossfit': ['WOD', 'Open Gym', 'Personal Training', 'Corsi Base', 'Competizioni'],
                # Auto
                'meccanico': ['Tagliando', 'Cambio Gomme', 'Riparazioni', 'Revisione', 'Carrozzeria'],
                'autolavaggio': ['Lavaggio Esterno', 'Lavaggio Completo', 'Sanificazione', 'Ceratura', 'Detailing'],
                'gommista': ['Cambio Gomme', 'Equilibratura', 'Convergenza', 'Riparazione Pneumatici', 'Stoccaggio'],
                'carrozzeria': ['Riparazioni', 'Verniciatura', 'Lucidatura', 'Grandine', 'Restauro'],
                # Casa
                'idraulico': ['Riparazioni', 'Installazioni', 'Manutenzione', 'Emergenze', 'Ristrutturazioni'],
                'elettricista': ['Impianti', 'Riparazioni', 'Domotica', 'Certificazioni', 'Emergenze'],
                'fabbro': ['Apertura Porte', 'Sostituzione Serrature', 'Casseforti', 'Inferriate', 'Emergenze'],
                'falegname': ['Mobili su Misura', 'Restauro', 'Infissi', 'Scale', 'Porte'],
                'imbianchino': ['Tinteggiatura', 'Decorazioni', 'Cartongesso', 'Restauro', 'Esterni'],
                # Commercio
                'fiorista': ['Bouquet', 'Composizioni', 'Piante', 'Addobbi Matrimoni', 'Consegna a Domicilio'],
                'gioielleria': ['Gioielli', 'Orologi', 'Riparazioni', 'Incisioni', 'Valutazioni'],
                'ferramenta': ['Utensili', 'Vernici', 'Serrature', 'Giardinaggio', 'Elettrico'],
                # Servizi
                'fotografo': ['Ritratti', 'Matrimoni', 'Eventi', 'Prodotti', 'Ritocco Foto'],
                'agenzia immobiliare': ['Vendita', 'Affitto', 'Valutazioni', 'Consulenza', 'Gestione'],
            }
            services = services_map.get(category, ['Servizio Premium', 'Consulenza', 'Assistenza Clienti'])
            
            # Try partial match if exact match not found
            if services == ['Servizio Premium', 'Consulenza', 'Assistenza Clienti']:
                for key, value in services_map.items():
                    if key in category or category in key:
                        services = value
                        break
            
            # Booking mode
            booking_categories = {
                'appointment': ['parrucchiere', 'barbiere', 'estetista', 'centro estetico', 'tatuatore', 'tatuaggi', 
                               'nail salon', 'spa', 'dentista', 'fisioterapista', 'veterinario', 'ottico',
                               'palestra', 'centro yoga', 'pilates', 'crossfit', 'fotografo'],
                'table': ['ristorante', 'pizzeria', 'trattoria', 'osteria', 'hamburgeria', 'sushi', 'poke', 'pub']
            }
            booking_mode = 'none'
            for mode, cats in booking_categories.items():
                if any(c in category for c in cats):
                    booking_mode = mode
                    break
            
            # New content
            new_content = {
                "tagline": f"Il miglior {category} a {city}" if city else "Qualità e professionalità",
                "about_text": f"{business_name} è il punto di riferimento per {category} a {city}. Con anni di esperienza e passione, offriamo servizi di alta qualità per soddisfare ogni esigenza dei nostri clienti. Vieni a trovarci!",
                "homepage_subtitle": f"{category.title()} di qualità a {city}",
                "services": services,
                "services_intro": f"Scopri tutti i servizi offerti da {business_name}",
                "cta_text": "Contattaci Oggi!",
                "theme": "modern",
                "color_scheme": "blue"
            }
            
            # New business data
            new_business_data = {
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
                "google_maps_link": lead.get('google_maps_link', ''),
                "website": lead.get('website'),
                "primary_type": lead.get('primary_type'),
                "types": lead.get('types', []),
                "site_language": lead.get('site_language', 'it'),
                "booking_mode": booking_mode,
                "external_booking_url": lead.get('external_booking_url')
            }
            
            # Update demo
            db.demo_sites.update_one(
                {"demo_id": demo_id},
                {"$set": {
                    "content": new_content,
                    "business_data": new_business_data,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            client.close()
            
            log(f"Demo regenerated: {demo_id}")
            
            self._json_response(200, {
                "message": "Demo rigenerato con successo",
                "demo_id": demo_id,
                "content": new_content,
                "business_data": new_business_data
            })
            
        except Exception as e:
            log(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            return self._error(500, f"Errore: {str(e)}")

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

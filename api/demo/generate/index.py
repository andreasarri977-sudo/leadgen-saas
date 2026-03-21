# /api/demo/generate/index.py - Generate Demo Site
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import uuid
from datetime import datetime, timezone

def log(msg):
    print(f"[DEMO/GENERATE] {msg}", file=sys.stderr, flush=True)

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
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            lead_id = data.get('lead_id')
            if not lead_id:
                return self._error(400, "lead_id richiesto")
            
            log(f"Generating demo for lead: {lead_id}")
            
            # Get lead from database
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            lead = db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
            if not lead:
                client.close()
                return self._error(404, "Lead non trovato")
            
            # Check if demo already exists for this lead
            existing_demo = db.demo_sites.find_one({"lead_id": lead_id}, {"_id": 0})
            if existing_demo:
                client.close()
                log(f"Demo already exists for lead {lead_id}")
                return self._json_response(200, existing_demo)
            
            # Generate demo
            demo_id = str(uuid.uuid4())[:8]
            site_language = lead.get('site_language', 'it')
            
            # Build business data
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
                "site_language": site_language,
                "booking_mode": lead.get('booking_mode', 'none'),
                "external_booking_url": lead.get('external_booking_url')
            }
            
            # Generate content based on category
            category = lead.get('category', 'servizio').lower()
            business_name = lead.get('name', 'Attività')
            city = lead.get('city', '')
            
            # Default services based on category
            services_map = {
                'parrucchiere': ['Taglio Uomo', 'Taglio Donna', 'Colore', 'Piega', 'Trattamenti', 'Barba'],
                'ristorante': ['Pranzo', 'Cena', 'Menu Degustazione', 'Catering', 'Eventi Privati'],
                'pizzeria': ['Pizza Classica', 'Pizza Gourmet', 'Antipasti', 'Dolci', 'Bevande'],
                'bar': ['Caffetteria', 'Aperitivi', 'Cocktail', 'Brunch', 'Snack'],
                'estetista': ['Manicure', 'Pedicure', 'Ceretta', 'Trattamenti Viso', 'Massaggi', 'Epilazione Laser'],
                'dentista': ['Visita di Controllo', 'Pulizia Dentale', 'Sbiancamento', 'Ortodonzia', 'Implantologia'],
                'palestra': ['Sala Pesi', 'Corsi Fitness', 'Personal Training', 'Yoga', 'Pilates'],
                'meccanico': ['Tagliando', 'Cambio Gomme', 'Riparazioni', 'Revisione', 'Carrozzeria'],
            }
            
            services = services_map.get(category, ['Servizio Premium', 'Consulenza', 'Assistenza Clienti'])
            
            # Determine booking mode
            booking_categories = {
                'appointment': ['parrucchiere', 'estetista', 'dentista', 'medico', 'spa', 'massaggio'],
                'table': ['ristorante', 'pizzeria', 'trattoria', 'osteria']
            }
            
            booking_mode = 'none'
            for mode, cats in booking_categories.items():
                if any(c in category for c in cats):
                    booking_mode = mode
                    break
            
            # Build content
            content = {
                "tagline": f"Il miglior {category} a {city}" if city else f"Qualità e professionalità",
                "about_text": f"{business_name} è il punto di riferimento per {category} a {city}. Con anni di esperienza e passione, offriamo servizi di alta qualità per soddisfare ogni esigenza dei nostri clienti. Vieni a trovarci!",
                "homepage_subtitle": f"{category.title()} di qualità a {city}",
                "services": services,
                "services_intro": f"Scopri tutti i servizi offerti da {business_name}",
                "cta_text": "Contattaci Oggi!",
                "theme": "modern",
                "color_scheme": "blue"
            }
            
            # Update business_data with booking mode
            business_data["booking_mode"] = booking_mode
            
            # Create demo document
            demo = {
                "demo_id": demo_id,
                "lead_id": lead_id,
                "business_name": lead.get('name'),
                "internal_url": f"/demo/{demo_id}",
                "status": "created",
                "content": content,
                "business_data": business_data,
                "logo_base64": None,
                "vercel_url": None,
                "vercel_project_id": None,
                "published": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Save to database
            db.demo_sites.insert_one(demo)
            
            # Update lead status
            db.leads.update_one(
                {"lead_id": lead_id},
                {"$set": {"status": "demo_creata"}}
            )
            
            client.close()
            
            # Remove _id from response
            demo.pop("_id", None)
            
            log(f"Demo created: {demo_id} for {lead.get('name')}")
            
            self._json_response(201, demo)
            
        except json.JSONDecodeError as e:
            return self._error(400, f"JSON non valido: {str(e)}")
        except Exception as e:
            log(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            return self._error(500, f"Errore generazione: {str(e)}")

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

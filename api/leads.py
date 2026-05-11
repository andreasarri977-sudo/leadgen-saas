# /api/leads.py - List Leads
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import traceback
from urllib.parse import parse_qs, urlparse
import urllib.request

# Logging
def log(msg):
    print(f"[LEADS] {msg}", file=sys.stderr, flush=True)

log("=== Cold start ===")

# Import pymongo
try:
    from pymongo import MongoClient
    log("pymongo OK")
except ImportError as e:
    log(f"pymongo FAILED: {e}")
    MongoClient = None

# Env vars: try MONGO_URL first, then URL_MONGO
MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("URL_MONGO")
DB_NAME = os.environ.get("DB_NAME", "leadhunter")
GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY")

def get_place_details(place_id, api_key, country='Italia'):
    """Fetch detailed info from Google Places API with language based on country"""
    if not place_id or not api_key:
        return {}
    
    # Map country to language code
    country_lang_map = {
        'Italia': 'it', 'Italy': 'it', 'IT': 'it',
        'Francia': 'fr', 'France': 'fr', 'FR': 'fr',
        'Spagna': 'es', 'Spain': 'es', 'España': 'es', 'ES': 'es',
        'Germania': 'de', 'Germany': 'de', 'Deutschland': 'de', 'DE': 'de',
        'Regno Unito': 'en', 'United Kingdom': 'en', 'UK': 'en', 'GB': 'en',
        'Stati Uniti': 'en', 'United States': 'en', 'USA': 'en', 'US': 'en',
        'Portogallo': 'pt', 'Portugal': 'pt', 'PT': 'pt',
        'Paesi Bassi': 'nl', 'Netherlands': 'nl', 'NL': 'nl',
        'Austria': 'de', 'AT': 'de',
        'Svizzera': 'de', 'Switzerland': 'de', 'CH': 'de',
        'Belgio': 'fr', 'Belgium': 'fr', 'BE': 'fr'
    }
    
    lang_code = country_lang_map.get(country, 'it')
    
    try:
        url = f"https://places.googleapis.com/v1/places/{place_id}?languageCode={lang_code}"
        headers = {
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "id,displayName,formattedAddress,location,rating,userRatingCount,regularOpeningHours,photos,reviews,websiteUri,nationalPhoneNumber,googleMapsUri"
        }
        
        req = urllib.request.Request(url, headers=headers, method='GET')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        result = {}
        result['site_language'] = lang_code
        
        # Parse hours
        if 'regularOpeningHours' in data:
            hours = data['regularOpeningHours']
            result['hours_text'] = hours.get('weekdayDescriptions', [])
        
        # Parse photos (max 10)
        if 'photos' in data:
            photos = []
            for photo in data['photos'][:10]:
                photo_name = photo.get('name', '')
                if photo_name:
                    photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=800&maxWidthPx=800&key={api_key}"
                    photos.append({"url": photo_url})
            result['photos'] = photos
        
        # Parse reviews - get more reviews and sort by newest (publishTime)
        if 'reviews' in data:
            reviews_raw = data['reviews']
            
            # Sort by publish time if available (most recent first)
            # Google returns reviews with 'publishTime' field
            sorted_reviews = sorted(
                reviews_raw, 
                key=lambda r: r.get('publishTime', '1970-01-01'), 
                reverse=True
            )
            
            reviews = []
            for review in sorted_reviews[:6]:  # Get top 6 most recent
                text_obj = review.get('text', {})
                review_text = text_obj.get('text', '') if isinstance(text_obj, dict) else str(text_obj)
                
                # Get relative time in the requested language
                relative_time = review.get('relativePublishTimeDescription', '')
                
                reviews.append({
                    "author": review.get('authorAttribution', {}).get('displayName', 'Anonimo'),
                    "rating": review.get('rating', 5),
                    "text": review_text,
                    "time": relative_time,
                    "publish_time": review.get('publishTime', '')
                })
            result['reviews'] = reviews
        
        # Google Maps link
        if 'googleMapsUri' in data:
            result['google_maps_link'] = data['googleMapsUri']
        
        log(f"Place details fetched ({lang_code}): {len(result.get('photos', []))} photos, {len(result.get('reviews', []))} reviews")
        return result
        
    except Exception as e:
        log(f"Place details error: {e}")
        return {}

log(f"MONGO_URL set: {bool(MONGO_URL)}")
log(f"DB_NAME: {DB_NAME}")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        """Save a new lead to the database with enriched data from Google Places"""
        log(f"POST {self.path}")
        
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            log(f"Saving lead: {data.get('name', 'unknown')}")
            
            # Handle user_settings save action
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            action = params.get("action", [None])[0]
            
            if action == "user_settings":
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
                db = client[DB_NAME]
                # Single profile doc per app (single-user SaaS)
                allowed = ['company_name', 'vat_number', 'tax_code', 'address', 'city',
                           'postal_code', 'country', 'phone', 'email', 'website',
                           'iban', 'logo_base64', 'default_price', 'default_currency',
                           'footer_notes', 'legal_notes']
                update_data = {k: data.get(k) for k in allowed if k in data}
                from datetime import datetime, timezone
                update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
                db.user_settings.update_one(
                    {"setting_id": "invoice_profile"},
                    {"$set": update_data, "$setOnInsert": {"setting_id": "invoice_profile"}},
                    upsert=True
                )
                client.close()
                return self._json_response(200, {"success": True, "message": "Dati salvati"})
            
            # Generate lead_id
            import uuid
            from datetime import datetime, timezone
            
            lead_id = str(uuid.uuid4())[:8]
            place_id = data.get("place_id", "")
            
            # Get API key for place details
            api_key = GOOGLE_PLACES_API_KEY
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            # Try to get API key from settings
            try:
                settings = db.api_settings.find_one({"setting_id": "api_settings"})
                if settings and settings.get('google_maps_api_key'):
                    api_key = settings.get('google_maps_api_key')
            except Exception:
                pass
            
            # Check if lead already exists
            existing = db.leads.find_one({"place_id": place_id})
            if existing:
                client.close()
                log(f"Lead already exists: {data.get('name')}")
                return self._json_response(200, {
                    "message": "Lead già esistente",
                    "lead_id": existing.get("lead_id"),
                    "already_exists": True
                })
            
            # Fetch additional details from Google Places
            place_details = {}
            country = data.get("country", "Italia")
            if place_id and api_key:
                log(f"Fetching place details for {place_id} in {country}")
                place_details = get_place_details(place_id, api_key, country)
            
            # Build location object
            location = data.get("location", {})
            if isinstance(location, dict) and 'latitude' in location:
                location = {"lat": location['latitude'], "lng": location['longitude']}
            
            # Build lead document with enriched data
            lead = {
                "lead_id": lead_id,
                "place_id": place_id,
                "name": data.get("name", ""),
                "category": data.get("category", ""),
                "address": data.get("address", ""),
                "city": data.get("city", ""),
                "country": data.get("country", ""),
                "phone": data.get("phone", ""),
                "email": data.get("email", ""),
                "rating": data.get("rating", 0),
                "reviews_count": data.get("reviews_count", 0),
                "website": data.get("website"),
                "location": location,
                "primary_type": data.get("primary_type", ""),
                "types": data.get("types", []),
                "status": "nuovo_lead",
                "site_language": place_details.get("site_language", "it"),
                "booking_mode": "none",
                # Enriched data from Place Details
                "hours_text": place_details.get("hours_text", []),
                "photos": place_details.get("photos", []),
                "reviews": place_details.get("reviews", []),
                "google_maps_link": place_details.get("google_maps_link", ""),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Insert new lead
            db.leads.insert_one(lead)
            client.close()
            
            log(f"Lead saved: {lead_id} - {lead['name']} with {len(lead['photos'])} photos, {len(lead['reviews'])} reviews")
            
            # Remove _id from response
            lead.pop("_id", None)
            
            self._json_response(201, {
                "message": "Lead salvato con successo",
                "lead_id": lead_id,
                "lead": lead
            })
            
        except json.JSONDecodeError as e:
            return self._error(400, f"JSON non valido: {str(e)}")
        except Exception as e:
            log(f"EXCEPTION: {type(e).__name__}: {e}")
            log(traceback.format_exc())
            return self._error(500, f"Errore salvataggio: {str(e)}")

    def _json_response(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        log(f"GET {self.path}")
        
        # Check pymongo
        if MongoClient is None:
            log("ERROR: pymongo not installed")
            return self._error(500, "pymongo not installed - check requirements.txt")
        
        # Check MONGO_URL
        if not MONGO_URL:
            log("ERROR: Missing MONGO_URL env var")
            return self._error(500, "Missing MONGO_URL env var")
        
        try:
            # Parse query
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            action = params.get("action", [None])[0]
            
            # Handle user_settings GET (invoice profile for quote PDF)
            if action == "user_settings":
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
                db = client[DB_NAME]
                profile = db.user_settings.find_one(
                    {"setting_id": "invoice_profile"}, {"_id": 0}
                )
                client.close()
                if not profile:
                    profile = {
                        "company_name": "", "vat_number": "", "tax_code": "",
                        "address": "", "city": "", "postal_code": "", "country": "Italia",
                        "phone": "", "email": "", "website": "",
                        "iban": "", "logo_base64": "",
                        "default_price": 800, "default_currency": "EUR",
                        "footer_notes": "", "legal_notes": ""
                    }
                return self._json_response(200, profile)
            
            # Handle place-details action
            if action == "details":
                place_id = params.get("place_id", [None])[0]
                country = params.get("country", ["Italia"])[0]
                
                if not place_id:
                    return self._error(400, "place_id richiesto")
                
                log(f"Getting place details for: {place_id}, country: {country}")
                
                # Get API key
                api_key = GOOGLE_PLACES_API_KEY
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
                db = client[DB_NAME]
                
                settings = db.api_settings.find_one({"setting_id": "api_settings"})
                if settings and settings.get('google_maps_api_key'):
                    api_key = settings.get('google_maps_api_key')
                client.close()
                
                if not api_key:
                    return self._error(400, "Google Places API key non configurata")
                
                # Fetch details from Google
                details = get_place_details(place_id, api_key, country)
                
                if not details:
                    return self._error(404, "Dettagli non trovati")
                
                details['place_id'] = place_id
                return self._json_response(200, details)
            
            # Default: list leads
            status_filter = params.get("status", [None])[0]
            
            # Query DB
            log(f"Connecting to MongoDB, filter: {status_filter}")
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            query = {}
            if status_filter:
                query["status"] = status_filter
            
            leads = []
            for doc in db.leads.find(query, {"_id": 0}).sort("created_at", -1).limit(100):
                if "created_at" in doc:
                    doc["created_at"] = str(doc["created_at"])
                leads.append(doc)
            
            client.close()
            log(f"Found {len(leads)} leads")
            
            # Success response
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(leads).encode())
            
        except Exception as e:
            log(f"EXCEPTION: {type(e).__name__}: {e}")
            log(traceback.format_exc())
            return self._error(500, f"Database error: {str(e)}")

    def _error(self, code, message):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())

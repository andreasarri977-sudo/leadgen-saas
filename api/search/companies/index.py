# /api/search.py - Search Companies via Google Places API
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import urllib.request
import urllib.parse

def log(msg):
    print(f"[SEARCH] {msg}", file=sys.stderr, flush=True)

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("URL_MONGO")
DB_NAME = os.environ.get("DB_NAME", "leadhunter")
GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            log(f"Search request: {data}")
            
            # Get parameters
            category = data.get('category', 'ristorante')
            city = data.get('city', '')
            country = data.get('country', 'Italia')
            min_reviews = data.get('min_reviews', 10)
            min_rating = data.get('min_rating', 4.0)
            
            if not city:
                return self._error(400, "Città richiesta")
            
            # Get API key from env or database
            api_key = GOOGLE_PLACES_API_KEY
            
            if MongoClient and MONGO_URL:
                try:
                    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
                    db = client[DB_NAME]
                    settings = db.api_settings.find_one({"setting_id": "api_settings"})
                    if settings and settings.get('google_maps_api_key'):
                        api_key = settings.get('google_maps_api_key')
                    client.close()
                except Exception as e:
                    log(f"DB settings error: {e}")
            
            if not api_key:
                return self._error(400, "Google Places API key non configurata")
            
            # Call Google Places API (New)
            search_url = "https://places.googleapis.com/v1/places:searchText"
            
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": (
                    "places.id,places.displayName,places.formattedAddress,places.location,"
                    "places.rating,places.userRatingCount,places.websiteUri,"
                    "places.nationalPhoneNumber,places.internationalPhoneNumber,"
                    "places.primaryType,places.types,"
                    # Caratteristiche servizi (per badge sulla card lead)
                    "places.servesBreakfast,places.servesLunch,places.servesDinner,"
                    "places.servesBrunch,places.servesVegetarianFood,"
                    "places.takeout,places.delivery,places.dineIn,places.reservable,"
                    "places.priceLevel,places.editorialSummary"
                )
            }
            
            search_body = json.dumps({
                "textQuery": f"{category} in {city}, {country}",
                "languageCode": "it"
            }).encode('utf-8')
            
            log(f"Searching: {category} in {city}, {country}")
            
            req = urllib.request.Request(search_url, data=search_body, headers=headers, method='POST')
            
            try:
                with urllib.request.urlopen(req, timeout=15) as response:
                    search_data = json.loads(response.read().decode('utf-8'))
            except urllib.error.HTTPError as e:
                error_body = e.read().decode('utf-8')
                log(f"Google API Error {e.code}: {error_body}")
                
                if e.code == 403:
                    return self._error(403, "API Key non valida o Places API (New) non abilitata")
                elif e.code == 429:
                    return self._error(429, "Quota API superata")
                else:
                    return self._error(e.code, f"Errore Google API: {error_body[:200]}")
            
            places = search_data.get('places', [])
            log(f"Found {len(places)} places from Google")
            
            # Filter and format results
            leads = []
            
            for place in places:
                try:
                    rating = place.get('rating', 0)
                    reviews_count = place.get('userRatingCount', 0)
                    
                    # Apply filters
                    if reviews_count < min_reviews or rating < min_rating:
                        continue
                    
                    # Skip if has website
                    if place.get('websiteUri'):
                        continue
                    
                    place_id = place.get('id', '')
                    display_name = place.get('displayName', {})
                    name = display_name.get('text', 'N/A') if isinstance(display_name, dict) else str(display_name)
                    
                    lead = {
                        "place_id": place_id,
                        "name": name,
                        "category": category,
                        "address": place.get('formattedAddress', ''),
                        "city": city,
                        "country": country,
                        "phone": place.get('nationalPhoneNumber') or place.get('internationalPhoneNumber', ''),
                        "rating": rating,
                        "reviews_count": reviews_count,
                        "website": None,
                        "location": place.get('location', {}),
                        "primary_type": place.get('primaryType', ''),
                        "types": place.get('types', []),
                        # Caratteristiche servizi per badge UI
                        "features": {
                            "serves_breakfast": bool(place.get('servesBreakfast')),
                            "serves_lunch": bool(place.get('servesLunch')),
                            "serves_dinner": bool(place.get('servesDinner')),
                            "serves_brunch": bool(place.get('servesBrunch')),
                            "serves_vegetarian": bool(place.get('servesVegetarianFood')),
                            "takeout": bool(place.get('takeout')),
                            "delivery": bool(place.get('delivery')),
                            "dine_in": bool(place.get('dineIn')),
                            "reservable": bool(place.get('reservable')),
                            "price_level": place.get('priceLevel') or None,
                            "editorial_summary": (place.get('editorialSummary') or {}).get('text') if isinstance(place.get('editorialSummary'), dict) else None,
                        }
                    }
                    
                    leads.append(lead)
                    
                except Exception as e:
                    log(f"Error processing place: {e}")
                    continue
            
            log(f"Returning {len(leads)} filtered leads")
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(leads).encode())
            
        except json.JSONDecodeError as e:
            return self._error(400, f"JSON non valido: {str(e)}")
        except Exception as e:
            log(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            return self._error(500, f"Errore interno: {str(e)}")

    def _error(self, code, msg):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode())

# /api/place-details/index.py - Get full details for a place from Google
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import urllib.request
from urllib.parse import parse_qs, urlparse

def log(msg):
    print(f"[PLACE-DETAILS] {msg}", file=sys.stderr, flush=True)

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

    def do_GET(self):
        """Get full place details by place_id"""
        try:
            # Parse query params
            query = parse_qs(urlparse(self.path).query)
            place_id = query.get('place_id', [None])[0]
            country = query.get('country', ['Italia'])[0]
            
            if not place_id:
                return self._error(400, "place_id richiesto")
            
            log(f"Getting details for place: {place_id}")
            
            # Get API key
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
            }
            lang_code = country_lang_map.get(country, 'it')
            
            # Call Google Places API
            url = f"https://places.googleapis.com/v1/places/{place_id}?languageCode={lang_code}"
            headers = {
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": "id,displayName,formattedAddress,location,rating,userRatingCount,regularOpeningHours,photos,reviews,websiteUri,nationalPhoneNumber,googleMapsUri,priceLevel,types,primaryType"
            }
            
            req = urllib.request.Request(url, headers=headers, method='GET')
            
            try:
                with urllib.request.urlopen(req, timeout=10) as response:
                    data = json.loads(response.read().decode('utf-8'))
            except urllib.error.HTTPError as e:
                error_body = e.read().decode('utf-8')
                log(f"Google API Error {e.code}: {error_body}")
                return self._error(e.code, f"Errore Google API: {error_body[:200]}")
            
            # Parse response
            result = {
                "place_id": place_id,
                "site_language": lang_code
            }
            
            # Basic info
            if 'displayName' in data:
                display_name = data['displayName']
                result['name'] = display_name.get('text', '') if isinstance(display_name, dict) else str(display_name)
            
            if 'formattedAddress' in data:
                result['address'] = data['formattedAddress']
            
            if 'nationalPhoneNumber' in data:
                result['phone'] = data['nationalPhoneNumber']
            
            if 'rating' in data:
                result['rating'] = data['rating']
            
            if 'userRatingCount' in data:
                result['reviews_count'] = data['userRatingCount']
            
            if 'websiteUri' in data:
                result['website'] = data['websiteUri']
            
            if 'googleMapsUri' in data:
                result['google_maps_url'] = data['googleMapsUri']
            
            if 'location' in data:
                result['location'] = data['location']
            
            if 'primaryType' in data:
                result['primary_type'] = data['primaryType']
            
            if 'types' in data:
                result['types'] = data['types']
            
            # Opening hours
            if 'regularOpeningHours' in data:
                hours = data['regularOpeningHours']
                result['hours_text'] = hours.get('weekdayDescriptions', [])
                result['open_now'] = hours.get('openNow', None)
            
            # Photos (max 10)
            if 'photos' in data:
                photos = []
                for photo in data['photos'][:10]:
                    photo_name = photo.get('name', '')
                    if photo_name:
                        photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=800&maxWidthPx=800&key={api_key}"
                        photos.append({
                            "url": photo_url,
                            "width": photo.get('widthPx', 800),
                            "height": photo.get('heightPx', 600)
                        })
                result['photos'] = photos
            
            # Reviews (sorted by newest)
            if 'reviews' in data:
                reviews_raw = data['reviews']
                sorted_reviews = sorted(
                    reviews_raw,
                    key=lambda r: r.get('publishTime', '1970-01-01'),
                    reverse=True
                )
                
                reviews = []
                for review in sorted_reviews[:6]:
                    text_obj = review.get('text', {})
                    review_text = text_obj.get('text', '') if isinstance(text_obj, dict) else str(text_obj)
                    
                    reviews.append({
                        "author": review.get('authorAttribution', {}).get('displayName', 'Anonimo'),
                        "rating": review.get('rating', 5),
                        "text": review_text,
                        "time": review.get('relativePublishTimeDescription', ''),
                        "publish_time": review.get('publishTime', '')
                    })
                result['reviews'] = reviews
            
            log(f"Details fetched: {len(result.get('photos', []))} photos, {len(result.get('reviews', []))} reviews")
            
            self._json_response(200, result)
            
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

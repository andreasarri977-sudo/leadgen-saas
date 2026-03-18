# Vercel Serverless Function - Search Companies (Google Maps)
from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.parse

GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '')

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            query = data.get('query', '')
            location = data.get('location', '')
            country = data.get('country', 'IT')
            
            if not query or not location:
                self.send_error_response(400, 'Query and location required')
                return
            
            if not GOOGLE_MAPS_API_KEY:
                self.send_error_response(400, 'Google Maps API key not configured')
                return
            
            # Search using Google Places API
            search_query = f"{query} {location} {country}"
            url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={urllib.parse.quote(search_query)}&key={GOOGLE_MAPS_API_KEY}"
            
            with urllib.request.urlopen(url, timeout=10) as response:
                places_data = json.loads(response.read().decode())
            
            results = []
            for place in places_data.get('results', [])[:20]:
                # Check if business has website
                place_id = place.get('place_id')
                details_url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,photos,reviews,geometry&key={GOOGLE_MAPS_API_KEY}"
                
                try:
                    with urllib.request.urlopen(details_url, timeout=10) as details_response:
                        details = json.loads(details_response.read().decode())
                        result = details.get('result', {})
                        
                        # Only include businesses WITHOUT a website
                        if not result.get('website'):
                            results.append({
                                'place_id': place_id,
                                'name': result.get('name', ''),
                                'address': result.get('formatted_address', ''),
                                'phone': result.get('formatted_phone_number', ''),
                                'rating': result.get('rating', 0),
                                'reviews_count': result.get('user_ratings_total', 0),
                                'has_website': False,
                                'location': result.get('geometry', {}).get('location', {}),
                                'photos': [p.get('photo_reference') for p in result.get('photos', [])[:5]],
                                'reviews': result.get('reviews', [])[:5],
                                'opening_hours': result.get('opening_hours', {}).get('weekday_text', [])
                            })
                except Exception as e:
                    print(f"Error getting details for {place_id}: {e}")
                    continue
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'results': results,
                'total': len(results)
            }).encode())
            
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode())

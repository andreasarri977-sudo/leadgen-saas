# /api/sites/[id]/editor-data/index.py - Get Site Editor Data
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from urllib.parse import urlparse

def log(msg):
    print(f"[SITES/EDITOR-DATA] {msg}", file=sys.stderr, flush=True)

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
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _get_demo_id(self):
        path = urlparse(self.path).path
        parts = path.strip('/').split('/')
        if len(parts) >= 3:
            return parts[2]
        return None

    def do_GET(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        demo_id = self._get_demo_id()
        if not demo_id:
            return self._error(400, "demo_id richiesto")
        
        log(f"GET editor data for: {demo_id}")
        
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            demo = db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
            
            if not demo:
                client.close()
                return self._error(404, "Demo non trovato")
            
            # Build editor data structure
            content = demo.get('content', {})
            business = demo.get('business_data', {})
            
            editor_data = {
                "demo_id": demo_id,
                "business_name": demo.get('business_name', ''),
                "tagline": content.get('tagline', ''),
                "about_text": content.get('about_text', ''),
                "homepage_subtitle": content.get('homepage_subtitle', ''),
                "services_intro": content.get('services_intro', ''),
                "services": content.get('services', []),
                "cta_text": content.get('cta_text', 'Contattaci'),
                "theme": content.get('theme', 'modern'),
                "color_scheme": content.get('color_scheme', 'blue'),
                "phone": business.get('phone', ''),
                "email": business.get('email', ''),
                "address": business.get('address', ''),
                "city": business.get('city', ''),
                "hours_text": business.get('hours_text', []),
                "booking_mode": business.get('booking_mode', 'none'),
                "external_booking_url": business.get('external_booking_url', ''),
                "photos": business.get('photos', []),
                "reviews": business.get('reviews', []),
                "logo_base64": demo.get('logo_base64'),
                "published": demo.get('published', False),
                "vercel_url": demo.get('vercel_url'),
                "status": demo.get('status', 'created')
            }
            
            client.close()
            log(f"Editor data retrieved for {demo.get('business_name')}")
            
            self._json_response(200, editor_data)
            
        except Exception as e:
            log(f"ERROR: {e}")
            return self._error(500, f"Database error: {str(e)}")

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

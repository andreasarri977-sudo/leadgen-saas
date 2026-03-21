# /api/sites/[id]/update/index.py - Update Site Data
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from urllib.parse import urlparse
from datetime import datetime, timezone

def log(msg):
    print(f"[SITES/UPDATE] {msg}", file=sys.stderr, flush=True)

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

    def _get_demo_id(self):
        path = urlparse(self.path).path
        parts = path.strip('/').split('/')
        if len(parts) >= 3:
            return parts[2]
        return None

    def do_POST(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        demo_id = self._get_demo_id()
        if not demo_id:
            return self._error(400, "demo_id richiesto")
        
        log(f"UPDATE site: {demo_id}")
        
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            demo = db.demo_sites.find_one({"demo_id": demo_id})
            if not demo:
                client.close()
                return self._error(404, "Demo non trovato")
            
            # Build update document
            update_fields = {}
            
            # Update content fields
            content_updates = {}
            content_fields = ['tagline', 'about_text', 'homepage_subtitle', 'services_intro', 
                            'services', 'cta_text', 'theme', 'color_scheme']
            for field in content_fields:
                if field in data:
                    content_updates[f"content.{field}"] = data[field]
            
            # Update business_data fields
            business_updates = {}
            business_fields = ['phone', 'email', 'address', 'city', 'hours_text', 
                             'booking_mode', 'external_booking_url', 'photos']
            for field in business_fields:
                if field in data:
                    business_updates[f"business_data.{field}"] = data[field]
            
            # Update top-level fields
            if 'business_name' in data:
                update_fields['business_name'] = data['business_name']
            if 'logo_base64' in data:
                update_fields['logo_base64'] = data['logo_base64']
            
            # Merge all updates
            all_updates = {**update_fields, **content_updates, **business_updates}
            all_updates['updated_at'] = datetime.now(timezone.utc).isoformat()
            
            if all_updates:
                db.demo_sites.update_one(
                    {"demo_id": demo_id},
                    {"$set": all_updates}
                )
            
            client.close()
            log(f"Site updated: {demo_id}")
            
            self._json_response(200, {
                "message": "Sito aggiornato con successo",
                "demo_id": demo_id
            })
            
        except json.JSONDecodeError as e:
            return self._error(400, f"JSON non valido: {str(e)}")
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

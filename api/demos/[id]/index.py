# /api/demos/[id]/index.py - Get, Update, Delete, Publish Demo Site
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone

def log(msg):
    print(f"[DEMOS/ID] {msg}", file=sys.stderr, flush=True)

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
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _get_demo_id(self):
        """Extract demo_id from path like /api/demos/abc123"""
        path = urlparse(self.path).path
        parts = path.strip('/').split('/')
        if len(parts) >= 3:
            return parts[2]
        return None
    
    def _get_action(self):
        """Extract action from path like /api/demos/abc123/publish"""
        path = urlparse(self.path).path
        parts = path.strip('/').split('/')
        if len(parts) >= 4:
            return parts[3]
        return None

    def do_GET(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        demo_id = self._get_demo_id()
        action = self._get_action()
        
        if not demo_id:
            return self._error(400, "demo_id richiesto")
        
        log(f"GET demo: {demo_id}, action: {action}")
        
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            demo = db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
            
            if not demo:
                client.close()
                return self._error(404, "Demo non trovato")
            
            # Handle editor-data action
            if action == "editor-data":
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
                return self._json_response(200, editor_data)
            
            client.close()
            
            if "created_at" in demo:
                demo["created_at"] = str(demo["created_at"])
            
            self._json_response(200, demo)
            
        except Exception as e:
            log(f"ERROR: {e}")
            return self._error(500, f"Database error: {str(e)}")

    def do_POST(self):
        """Handle update, publish, republish actions"""
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        demo_id = self._get_demo_id()
        action = self._get_action()
        
        if not demo_id:
            return self._error(400, "demo_id richiesto")
        
        log(f"POST demo: {demo_id}, action: {action}")
        
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
            
            # Handle different actions
            if action == "publish":
                internal_url = f"/demo/{demo_id}"
                db.demo_sites.update_one(
                    {"demo_id": demo_id},
                    {"$set": {
                        "published": True,
                        "status": "published",
                        "internal_url": internal_url,
                        "demo_url": internal_url,
                        "published_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                lead_id = demo.get('lead_id')
                if lead_id:
                    db.leads.update_one({"lead_id": lead_id}, {"$set": {"status": "demo_pubblicata"}})
                client.close()
                return self._json_response(200, {"message": "Demo pubblicato!", "url": internal_url})
            
            elif action == "republish":
                db.demo_sites.update_one(
                    {"demo_id": demo_id},
                    {"$set": {"status": "republish_requested", "republish_at": datetime.now(timezone.utc).isoformat()}}
                )
                client.close()
                return self._json_response(200, {"message": "Ripubblicazione richiesta"})
            
            elif action == "update":
                update_fields = {}
                content_updates = {}
                business_updates = {}
                
                content_fields = ['tagline', 'about_text', 'homepage_subtitle', 'services_intro', 'services', 'cta_text', 'theme', 'color_scheme']
                for field in content_fields:
                    if field in data:
                        content_updates[f"content.{field}"] = data[field]
                
                business_fields = ['phone', 'email', 'address', 'city', 'hours_text', 'booking_mode', 'external_booking_url', 'photos']
                for field in business_fields:
                    if field in data:
                        business_updates[f"business_data.{field}"] = data[field]
                
                if 'business_name' in data:
                    update_fields['business_name'] = data['business_name']
                if 'logo_base64' in data:
                    update_fields['logo_base64'] = data['logo_base64']
                
                all_updates = {**update_fields, **content_updates, **business_updates}
                all_updates['updated_at'] = datetime.now(timezone.utc).isoformat()
                
                if all_updates:
                    db.demo_sites.update_one({"demo_id": demo_id}, {"$set": all_updates})
                
                client.close()
                return self._json_response(200, {"message": "Sito aggiornato"})
            
            else:
                client.close()
                return self._error(400, f"Azione non riconosciuta: {action}")
            
        except Exception as e:
            log(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            return self._error(500, f"Errore: {str(e)}")

    def do_DELETE(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        demo_id = self._get_demo_id()
        if not demo_id:
            return self._error(400, "demo_id richiesto")
        
        log(f"DELETE demo: {demo_id}")
        
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            result = db.demo_sites.delete_one({"demo_id": demo_id})
            client.close()
            
            if result.deleted_count == 0:
                return self._error(404, "Demo non trovato")
            
            self._json_response(200, {"message": "Demo eliminato", "demo_id": demo_id})
            
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

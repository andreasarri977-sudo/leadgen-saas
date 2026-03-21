# /api/demo/batch/index.py - Batch Generate Demo Sites
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
            
            lead_ids = data.get('lead_ids', [])
            if not lead_ids:
                return self._error(400, "lead_ids richiesto (array)")
            
            log(f"Batch generating demos for {len(lead_ids)} leads")
            
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            results = {
                "created": [],
                "skipped": [],
                "errors": []
            }
            
            for lead_id in lead_ids:
                try:
                    # Get lead
                    lead = db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
                    if not lead:
                        results["errors"].append({"lead_id": lead_id, "error": "Lead non trovato"})
                        continue
                    
                    # Check if demo already exists
                    existing = db.demo_sites.find_one({"lead_id": lead_id})
                    if existing:
                        results["skipped"].append({"lead_id": lead_id, "demo_id": existing.get("demo_id"), "reason": "Demo già esistente"})
                        continue
                    
                    # Generate demo
                    demo_id = str(uuid.uuid4())[:8]
                    site_language = lead.get('site_language', 'it')
                    
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
                        "site_language": site_language,
                        "booking_mode": lead.get('booking_mode', 'none')
                    }
                    
                    content = {
                        "tagline": f"Il miglior {lead.get('category', 'servizio')} a {lead.get('city', 'tua città')}",
                        "about": f"{lead.get('name')} offre servizi di alta qualità.",
                        "services": [],
                        "theme": "modern",
                        "color_scheme": "blue"
                    }
                    
                    demo = {
                        "demo_id": demo_id,
                        "lead_id": lead_id,
                        "business_name": lead.get('name'),
                        "internal_url": f"/demo/{demo_id}",
                        "status": "created",
                        "content": content,
                        "business_data": business_data,
                        "logo_base64": None,
                        "published": False,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    db.demo_sites.insert_one(demo)
                    db.leads.update_one({"lead_id": lead_id}, {"$set": {"status": "demo_creata"}})
                    
                    results["created"].append({"lead_id": lead_id, "demo_id": demo_id, "name": lead.get('name')})
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

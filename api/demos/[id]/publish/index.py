# /api/demos/[id]/publish/index.py - Publish Demo Site
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from urllib.parse import urlparse
from datetime import datetime, timezone

def log(msg):
    print(f"[DEMOS/PUBLISH] {msg}", file=sys.stderr, flush=True)

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
        
        log(f"PUBLISH demo: {demo_id}")
        
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            demo = db.demo_sites.find_one({"demo_id": demo_id})
            if not demo:
                client.close()
                return self._error(404, "Demo non trovato")
            
            # Generate a demo URL (internal for now)
            # In production, this would deploy to Vercel and return the real URL
            business_name = demo.get('business_name', 'demo')
            slug = business_name.lower().replace(' ', '-').replace("'", "")[:30]
            
            # For now, use internal URL - in production would deploy to Vercel
            internal_url = f"/demo/{demo_id}"
            
            # Update demo as published
            db.demo_sites.update_one(
                {"demo_id": demo_id},
                {"$set": {
                    "published": True,
                    "publish_status": "published",
                    "status": "published",
                    "internal_url": internal_url,
                    "demo_url": internal_url,
                    "published_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update lead status
            lead_id = demo.get('lead_id')
            if lead_id:
                db.leads.update_one(
                    {"lead_id": lead_id},
                    {"$set": {"status": "demo_pubblicata"}}
                )
            
            client.close()
            log(f"Demo published: {demo_id} at {internal_url}")
            
            self._json_response(200, {
                "message": "Demo pubblicato con successo!",
                "demo_id": demo_id,
                "url": internal_url,
                "published": True
            })
            
        except Exception as e:
            log(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            return self._error(500, f"Errore pubblicazione: {str(e)}")

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

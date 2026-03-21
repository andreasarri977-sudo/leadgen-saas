# /api/leads.py - List Leads
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import traceback
from urllib.parse import parse_qs, urlparse

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
        """Save a new lead to the database"""
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
            
            # Generate lead_id
            import uuid
            from datetime import datetime, timezone
            
            lead_id = str(uuid.uuid4())[:8]
            
            # Build lead document
            lead = {
                "lead_id": lead_id,
                "place_id": data.get("place_id", ""),
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
                "location": data.get("location", {}),
                "primary_type": data.get("primary_type", ""),
                "types": data.get("types", []),
                "status": "nuovo_lead",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Check if lead already exists
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            existing = db.leads.find_one({"place_id": lead["place_id"]})
            if existing:
                client.close()
                log(f"Lead already exists: {lead['name']}")
                return self._json_response(200, {
                    "message": "Lead già esistente",
                    "lead_id": existing.get("lead_id"),
                    "already_exists": True
                })
            
            # Insert new lead
            db.leads.insert_one(lead)
            client.close()
            
            log(f"Lead saved: {lead_id} - {lead['name']}")
            
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

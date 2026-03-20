# Vercel Serverless Function - List Leads
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from urllib.parse import parse_qs, urlparse

def log(msg):
    print(f"[LEADS] {msg}", file=sys.stderr, flush=True)

# Check pymongo import
PYMONGO_AVAILABLE = False
MongoClient = None
try:
    from pymongo import MongoClient
    PYMONGO_AVAILABLE = True
    log("pymongo imported OK")
except ImportError as e:
    log(f"pymongo IMPORT ERROR: {e}")

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL') or os.environ.get('URL_MONGO')
DB_NAME = os.environ.get('DB_NAME', 'leadhunter')

log(f"MONGO_URL present: {bool(MONGO_URL)}")
log(f"DB_NAME: {DB_NAME}")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()
    
    def do_GET(self):
        log(f"GET {self.path}")
        
        # Check 1: pymongo available?
        if not PYMONGO_AVAILABLE:
            self._json_error(500, "pymongo not installed", "Check requirements.txt")
            return
        
        # Check 2: MONGO_URL set?
        if not MONGO_URL:
            self._json_error(500, "Missing MONGO_URL env var", "Set MONGO_URL in Vercel Environment Variables")
            return
        
        # Execute query
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            status = params.get('status', [None])[0]
            
            leads = self._get_leads(status)
            
            self.send_response(200)
            self._cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(leads).encode())
            log(f"Returned {len(leads)} leads")
        except Exception as e:
            log(f"DB ERROR: {type(e).__name__}: {e}")
            import traceback
            log(traceback.format_exc())
            self._json_error(500, str(e), type(e).__name__)
    
    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def _json_error(self, code, error, detail):
        self.send_response(code)
        self._cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": error, "detail": detail}).encode())
    
    def _get_leads(self, status=None):
        log("Connecting to MongoDB...")
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        db = client[DB_NAME]
        
        query = {"status": status} if status else {}
        leads = []
        
        for doc in db.leads.find(query, {"_id": 0}).sort("created_at", -1).limit(100):
            if 'created_at' in doc:
                doc['created_at'] = str(doc['created_at'])
            leads.append(doc)
        
        client.close()
        return leads

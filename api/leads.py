# Vercel Serverless Function - List Leads
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import traceback
from urllib.parse import parse_qs, urlparse
import subprocess

def log(msg):
    print(f"[LEADS] {msg}", file=sys.stderr, flush=True)

log("=== Function cold start ===")
log(f"Python version: {sys.version}")

# Try to import pymongo, install if missing
MongoClient = None
try:
    from pymongo import MongoClient
    log("pymongo imported successfully")
except ImportError:
    log("pymongo not found, attempting pip install...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pymongo", "dnspython", "certifi", "-q"])
        from pymongo import MongoClient
        log("pymongo installed and imported successfully")
    except Exception as e:
        log(f"Failed to install pymongo: {e}")

MONGO_URL = os.environ.get('MONGO_URL') or os.environ.get('URL_MONGO')
DB_NAME = os.environ.get('DB_NAME', 'leadhunter')

log(f"MONGO_URL present: {bool(MONGO_URL)}")
log(f"DB_NAME: {DB_NAME}")

class handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        log(f"Request: {args}")
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_GET(self):
        log(f"GET request: {self.path}")
        
        if MongoClient is None:
            self.send_error_json(500, "pymongo not available", "Install failed")
            return
        
        if not MONGO_URL:
            self.send_error_json(503, "Missing Mongo env var", "Set MONGO_URL in Vercel")
            return
        
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            status = params.get('status', [None])[0]
            
            result = self.get_leads(status)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            log(f"ERROR: {e}\n{traceback.format_exc()}")
            self.send_error_json(500, str(e), type(e).__name__)
    
    def send_error_json(self, code, error, detail):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"error": error, "detail": detail}).encode())
    
    def get_leads(self, status=None):
        log("Connecting to MongoDB...")
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        db = client[DB_NAME]
        
        query = {}
        if status:
            query["status"] = status
        
        leads = []
        for lead in db.leads.find(query, {"_id": 0}).sort("created_at", -1).limit(100):
            if 'created_at' in lead:
                lead['created_at'] = str(lead['created_at'])
            leads.append(lead)
        
        client.close()
        log(f"Found {len(leads)} leads")
        return leads

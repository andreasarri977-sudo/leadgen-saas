# Vercel Serverless Function - Dashboard Stats
from http.server import BaseHTTPRequestHandler
import json
import os
import sys

def log(msg):
    print(f"[STATS] {msg}", file=sys.stderr, flush=True)

try:
    from pymongo import MongoClient
    PYMONGO_OK = True
except ImportError:
    PYMONGO_OK = False
    MongoClient = None

MONGO_URL = os.environ.get('MONGO_URL') or os.environ.get('URL_MONGO')
DB_NAME = os.environ.get('DB_NAME', 'leadhunter')

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
    
    def do_GET(self):
        if not PYMONGO_OK:
            self._error(500, "pymongo not installed")
            return
        if not MONGO_URL:
            self._error(500, "Missing MONGO_URL env var")
            return
        
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            stats = {
                "total_leads": db.leads.count_documents({}),
                "demos_created": db.demo_sites.count_documents({}),
                "new_leads": db.leads.count_documents({"status": {"$in": ["new", "nuovo_lead"]}}),
                "contacted": db.leads.count_documents({"status": {"$in": ["contacted", "contattato"]}}),
                "clients_acquired": db.leads.count_documents({"status": {"$in": ["client", "cliente_acquisito"]}}),
                "emails_sent": 0
            }
            client.close()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(stats).encode())
        except Exception as e:
            log(f"ERROR: {e}")
            self._error(500, str(e))
    
    def _error(self, code, msg):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode())

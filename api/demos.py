# Vercel Serverless Function - List Demos
from http.server import BaseHTTPRequestHandler
import json
import os
import sys

def log(msg):
    print(f"[DEMOS] {msg}", file=sys.stderr, flush=True)

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
            demos = []
            for doc in db.demo_sites.find({}, {"_id": 0}).sort("created_at", -1).limit(100):
                if 'created_at' in doc:
                    doc['created_at'] = str(doc['created_at'])
                demos.append(doc)
            client.close()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(demos).encode())
        except Exception as e:
            log(f"ERROR: {e}")
            self._error(500, str(e))
    
    def _error(self, code, msg):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode())

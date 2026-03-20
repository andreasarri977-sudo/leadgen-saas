# /api/stats/dashboard.py - Dashboard Statistics Endpoint
from http.server import BaseHTTPRequestHandler
import json
import os
import sys

def log(msg):
    print(f"[STATS/DASHBOARD] {msg}", file=sys.stderr, flush=True)

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

    def do_GET(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(503, "Missing MONGO_URL env var", "Database non configurato. Configura MONGO_URL nelle variabili d'ambiente Vercel.")
        
        try:
            log(f"Connecting to MongoDB...")
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            # Count statistics from database
            stats = {
                "total_leads": db.leads.count_documents({}),
                "demos_created": db.demo_sites.count_documents({}),
                "new_leads": db.leads.count_documents({"status": {"$in": ["new", "nuovo_lead"]}}),
                "contacted": db.leads.count_documents({"status": {"$in": ["contacted", "contattato"]}}),
                "clients_acquired": db.leads.count_documents({"status": {"$in": ["client", "cliente_acquisito"]}}),
                "emails_sent": 0  # Future: track sent emails
            }
            
            client.close()
            log(f"Stats retrieved successfully: {stats}")
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(stats).encode())
            
        except Exception as e:
            log(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            return self._error(500, f"Database error: {str(e)}")

    def _error(self, code, error_key, message=None):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        response = {"error": error_key}
        if message:
            response["message"] = message
        self.wfile.write(json.dumps(response).encode())

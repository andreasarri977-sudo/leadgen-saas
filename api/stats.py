# Vercel Serverless Function - Dashboard Stats (usando pymongo sincrono)
from http.server import BaseHTTPRequestHandler
import json
import os
import sys

def log(msg):
    print(f"[STATS] {msg}", file=sys.stderr, flush=True)

log("=== Function cold start ===")

try:
    from pymongo import MongoClient
    log("pymongo imported successfully")
except ImportError as e:
    log(f"FAILED to import pymongo: {e}")
    MongoClient = None

MONGO_URL = os.environ.get('MONGO_URL') or os.environ.get('URL_MONGO')
DB_NAME = os.environ.get('DB_NAME', 'leadhunter')

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_GET(self):
        if MongoClient is None:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "pymongo not installed"}).encode())
            return
        
        if not MONGO_URL:
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Missing Mongo env var"}).encode())
            return
        
        try:
            result = self.get_stats()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            log(f"ERROR: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
    
    def get_stats(self):
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        total_leads = db.leads.count_documents({})
        demos_created = db.demo_sites.count_documents({})
        new_leads = db.leads.count_documents({"status": {"$in": ["new", "nuovo_lead"]}})
        contacted = db.leads.count_documents({"status": {"$in": ["contacted", "contattato"]}})
        clients = db.leads.count_documents({"status": {"$in": ["client", "cliente_acquisito"]}})
        
        client.close()
        
        return {
            "total_leads": total_leads,
            "demos_created": demos_created,
            "new_leads": new_leads,
            "contacted": contacted,
            "clients_acquired": clients,
            "emails_sent": 0
        }

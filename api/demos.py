# Vercel Serverless Function - List Demo Sites (usando pymongo sincrono)
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import traceback

def log(msg):
    print(f"[DEMOS] {msg}", file=sys.stderr, flush=True)

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
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
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
            result = self.get_demos()
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
    
    def get_demos(self):
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        demos = []
        cursor = db.demo_sites.find({}, {"_id": 0}).sort("created_at", -1).limit(100)
        for demo in cursor:
            if 'created_at' in demo:
                demo['created_at'] = str(demo['created_at'])
            demos.append(demo)
        client.close()
        return demos

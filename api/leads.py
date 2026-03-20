# Vercel Serverless Function - List Leads
from http.server import BaseHTTPRequestHandler
import json
import asyncio
import os
import sys
import traceback
from urllib.parse import parse_qs, urlparse

# Logging helper
def log(msg):
    print(f"[LEADS] {msg}", file=sys.stderr, flush=True)

log("=== Function cold start ===")
log(f"Python version: {sys.version}")
log(f"MONGO_URL present: {'MONGO_URL' in os.environ}")
log(f"URL_MONGO present: {'URL_MONGO' in os.environ}")
log(f"DB_NAME present: {'DB_NAME' in os.environ}")

# Try importing motor
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    log("motor imported successfully")
except ImportError as e:
    log(f"FAILED to import motor: {e}")
    log(f"sys.path: {sys.path}")

# Get Mongo URL with fallback
MONGO_URL = os.environ.get('MONGO_URL') or os.environ.get('URL_MONGO')
DB_NAME = os.environ.get('DB_NAME', 'leadhunter')

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
        log(f"GET request received: {self.path}")
        
        # Check Mongo URL
        if not MONGO_URL:
            log("ERROR: No Mongo URL configured")
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Missing Mongo env var",
                "message": "Neither MONGO_URL nor URL_MONGO is set in environment",
                "env_vars_present": {
                    "MONGO_URL": 'MONGO_URL' in os.environ,
                    "URL_MONGO": 'URL_MONGO' in os.environ,
                    "DB_NAME": 'DB_NAME' in os.environ
                }
            }).encode())
            return
        
        try:
            # Parse query params
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            status = params.get('status', [None])[0]
            log(f"Querying leads with status filter: {status}")
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self.get_leads(status))
            loop.close()
            
            log(f"Returning {len(result)} leads")
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            log(f"ERROR: {type(e).__name__}: {e}")
            log(traceback.format_exc())
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": str(e),
                "type": type(e).__name__,
                "traceback": traceback.format_exc()
            }).encode())
    
    async def get_leads(self, status=None):
        log("Connecting to MongoDB...")
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        query = {}
        if status:
            query["status"] = status
        
        log(f"Executing query: {query}")
        leads = []
        cursor = db.leads.find(query, {"_id": 0}).sort("created_at", -1).limit(100)
        async for lead in cursor:
            # Convert datetime to string
            if 'created_at' in lead:
                lead['created_at'] = str(lead['created_at'])
            leads.append(lead)
        
        client.close()
        log(f"Query complete: {len(leads)} leads")
        return leads

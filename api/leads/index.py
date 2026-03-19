# Vercel Serverless Function - List Leads
from http.server import BaseHTTPRequestHandler
import json
import asyncio
import os
import sys
from urllib.parse import parse_qs, urlparse

print(f"[DEBUG] Python: {sys.version}", flush=True)
print(f"[DEBUG] MONGO_URL set: {'Yes' if os.environ.get('MONGO_URL') else 'No'}", flush=True)

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    print("[DEBUG] motor imported OK", flush=True)
except ImportError as e:
    print(f"[DEBUG] motor import failed: {e}", flush=True)

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'leadhunter')

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        try:
            print(f"[DEBUG] GET /api/leads", flush=True)
            
            # Check if MONGO_URL is configured
            if not MONGO_URL:
                self.send_response(503)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Database not configured",
                    "message": "MONGO_URL environment variable is not set"
                }).encode())
                return
            
            # Parse query params
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            status = params.get('status', [None])[0]
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self.get_leads(status))
            loop.close()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            print(f"[DEBUG] Returned {len(result)} leads", flush=True)
        except Exception as e:
            print(f"[DEBUG] Error: {type(e).__name__}: {e}", flush=True)
            import traceback
            traceback.print_exc()
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e), "type": type(e).__name__}).encode())
    
    async def get_leads(self, status=None):
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        query = {}
        if status:
            query["status"] = status
        
        leads = []
        cursor = db.leads.find(query, {"_id": 0}).sort("created_at", -1).limit(100)
        async for lead in cursor:
            leads.append(lead)
        
        client.close()
        return leads

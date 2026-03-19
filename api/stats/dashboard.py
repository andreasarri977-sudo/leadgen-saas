# Vercel Serverless Function - Dashboard Stats
from http.server import BaseHTTPRequestHandler
import json
import asyncio
import os
import sys

# Log environment for debugging
print(f"[DEBUG] Python version: {sys.version}", flush=True)
print(f"[DEBUG] MONGO_URL set: {'Yes' if os.environ.get('MONGO_URL') else 'No'}", flush=True)

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    print("[DEBUG] motor imported successfully", flush=True)
except ImportError as e:
    print(f"[DEBUG] Failed to import motor: {e}", flush=True)

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'leadhunter')

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        try:
            print(f"[DEBUG] GET /api/stats/dashboard", flush=True)
            print(f"[DEBUG] MONGO_URL exists: {bool(MONGO_URL)}", flush=True)
            
            # Check if MONGO_URL is configured
            if not MONGO_URL:
                self.send_response(503)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Database not configured",
                    "message": "MONGO_URL environment variable is not set. Please configure MongoDB Atlas."
                }).encode())
                return
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self.get_stats())
            loop.close()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            print(f"[DEBUG] Stats returned successfully", flush=True)
        except Exception as e:
            print(f"[DEBUG] Error: {type(e).__name__}: {e}", flush=True)
            import traceback
            traceback.print_exc()
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": str(e), 
                "type": type(e).__name__
            }).encode())
    
    async def get_stats(self):
        print(f"[DEBUG] Connecting to MongoDB...", flush=True)
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        print(f"[DEBUG] Querying database...", flush=True)
        total_leads = await db.leads.count_documents({})
        demos_created = await db.demo_sites.count_documents({})
        new_leads = await db.leads.count_documents({"status": {"$in": ["new", "nuovo_lead"]}})
        contacted = await db.leads.count_documents({"status": {"$in": ["contacted", "contattato"]}})
        clients = await db.leads.count_documents({"status": {"$in": ["client", "cliente_acquisito"]}})
        
        client.close()
        print(f"[DEBUG] Query complete: {total_leads} leads, {demos_created} demos", flush=True)
        
        return {
            "total_leads": total_leads,
            "demos_created": demos_created,
            "new_leads": new_leads,
            "contacted": contacted,
            "clients_acquired": clients,
            "emails_sent": 0
        }

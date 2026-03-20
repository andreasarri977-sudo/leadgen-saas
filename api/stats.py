# Vercel Serverless Function - Dashboard Stats
from http.server import BaseHTTPRequestHandler
import json
import asyncio
import os

# Import motor
from motor.motor_asyncio import AsyncIOMotorClient

# Get Mongo URL with fallback
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
        # Check Mongo URL
        if not MONGO_URL:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Missing Mongo env var",
                "message": "Neither MONGO_URL nor URL_MONGO is set"
            }).encode())
            return
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self.get_stats())
            loop.close()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": str(e),
                "type": type(e).__name__
            }).encode())
    
    async def get_stats(self):
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        total_leads = await db.leads.count_documents({})
        demos_created = await db.demo_sites.count_documents({})
        new_leads = await db.leads.count_documents({"status": {"$in": ["new", "nuovo_lead"]}})
        contacted = await db.leads.count_documents({"status": {"$in": ["contacted", "contattato"]}})
        clients = await db.leads.count_documents({"status": {"$in": ["client", "cliente_acquisito"]}})
        
        client.close()
        
        return {
            "total_leads": total_leads,
            "demos_created": demos_created,
            "new_leads": new_leads,
            "contacted": contacted,
            "clients_acquired": clients,
            "emails_sent": 0
        }

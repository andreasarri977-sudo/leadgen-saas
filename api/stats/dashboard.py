# Vercel Serverless Function - Dashboard Stats
from http.server import BaseHTTPRequestHandler
import json
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'leadhunter')

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
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
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
    
    async def get_stats(self):
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        total_leads = await db.leads.count_documents({})
        demos_created = await db.demo_sites.count_documents({})
        new_leads = await db.leads.count_documents({"status": "new"})
        contacted = await db.leads.count_documents({"status": "contacted"})
        clients = await db.leads.count_documents({"status": "client"})
        
        client.close()
        
        return {
            "total_leads": total_leads,
            "demos_created": demos_created,
            "new_leads": new_leads,
            "contacted": contacted,
            "clients_acquired": clients,
            "emails_sent": 0
        }

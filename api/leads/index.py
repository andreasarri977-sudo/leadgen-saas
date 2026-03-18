# Vercel Serverless Function - List Leads
from http.server import BaseHTTPRequestHandler
import json
import asyncio
import os
from urllib.parse import parse_qs, urlparse
from motor.motor_asyncio import AsyncIOMotorClient

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
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
    
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

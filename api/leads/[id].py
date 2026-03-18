# Vercel Serverless Function - Get Single Lead
from http.server import BaseHTTPRequestHandler
import json
import asyncio
import os
from urllib.parse import urlparse
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'leadhunter')

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        try:
            # Extract lead_id from path: /api/leads/[id]
            path_parts = self.path.split('/')
            lead_id = path_parts[3] if len(path_parts) > 3 else None
            
            if not lead_id or lead_id == 'index.py':
                # Return list of leads
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(self.get_leads())
                loop.close()
            else:
                # Return single lead
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(self.get_lead(lead_id))
                loop.close()
            
            if result is None:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Lead not found'}).encode())
                return
            
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
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    def do_PATCH(self):
        try:
            path_parts = self.path.split('/')
            lead_id = path_parts[3] if len(path_parts) > 3 else None
            
            if not lead_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Lead ID required'}).encode())
                return
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self.update_lead(lead_id, data))
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
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    async def get_leads(self):
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        leads = []
        cursor = db.leads.find({}, {"_id": 0}).sort("created_at", -1).limit(100)
        async for lead in cursor:
            leads.append(lead)
        client.close()
        return leads
    
    async def get_lead(self, lead_id):
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
        client.close()
        return lead
    
    async def update_lead(self, lead_id, data):
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        await db.leads.update_one(
            {"lead_id": lead_id},
            {"$set": data}
        )
        lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
        client.close()
        return lead

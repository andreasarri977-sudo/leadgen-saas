# Vercel Serverless Function - List Demo Sites
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
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
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
            result = loop.run_until_complete(self.get_demos())
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
    
    async def get_demos(self):
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        demos = []
        cursor = db.demo_sites.find({}, {"_id": 0}).sort("created_at", -1).limit(100)
        async for demo in cursor:
            # Convert datetime to string
            if 'created_at' in demo:
                demo['created_at'] = str(demo['created_at'])
            demos.append(demo)
        
        client.close()
        return demos

# Vercel Serverless Function - Health Check
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from datetime import datetime, timezone

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_GET(self):
        # Check modules
        modules = {}
        try:
            import pymongo
            modules['pymongo'] = pymongo.version
        except:
            modules['pymongo'] = 'NOT INSTALLED'
        
        try:
            import dns
            modules['dnspython'] = 'OK'
        except:
            modules['dnspython'] = 'NOT INSTALLED'

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        self.wfile.write(json.dumps({
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "python": sys.version.split()[0],
            "modules": modules,
            "env": {
                "MONGO_URL": "SET" if os.environ.get('MONGO_URL') else "NOT SET",
                "DB_NAME": os.environ.get('DB_NAME', 'leadhunter')
            }
        }).encode())

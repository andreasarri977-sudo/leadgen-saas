# Vercel Serverless Function - Health Check with Debug Info
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from datetime import datetime, timezone

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        # Check which modules are available
        modules_status = {}
        
        try:
            import pymongo
            modules_status['pymongo'] = pymongo.version
        except ImportError as e:
            modules_status['pymongo'] = f"NOT INSTALLED: {e}"
        
        try:
            import dns
            modules_status['dnspython'] = "installed"
        except ImportError as e:
            modules_status['dnspython'] = f"NOT INSTALLED: {e}"
        
        try:
            import certifi
            modules_status['certifi'] = "installed"
        except ImportError as e:
            modules_status['certifi'] = f"NOT INSTALLED: {e}"
        
        # Check env vars (names only, not values)
        env_vars = {
            'MONGO_URL': 'MONGO_URL' in os.environ,
            'URL_MONGO': 'URL_MONGO' in os.environ,
            'DB_NAME': os.environ.get('DB_NAME', 'NOT SET')
        }
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "python_version": sys.version,
            "modules": modules_status,
            "env_vars": env_vars,
            "sys_path": sys.path[:5]
        }
        
        self.wfile.write(json.dumps(response, indent=2).encode())

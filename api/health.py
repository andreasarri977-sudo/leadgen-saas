# /api/health.py - Health Check
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from datetime import datetime, timezone

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Check modules
        modules = {}
        try:
            import pymongo
            modules["pymongo"] = pymongo.version
        except ImportError:
            modules["pymongo"] = "NOT INSTALLED"
        
        try:
            import dns
            modules["dnspython"] = "OK"
        except ImportError:
            modules["dnspython"] = "NOT INSTALLED"

        # Check env
        mongo_url = os.environ.get("MONGO_URL") or os.environ.get("URL_MONGO")
        
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        self.wfile.write(json.dumps({
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "python": sys.version.split()[0],
            "modules": modules,
            "mongo_configured": bool(mongo_url)
        }).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

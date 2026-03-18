# Vercel Serverless Function - Health Check
from http.server import BaseHTTPRequestHandler
import json
from datetime import datetime, timezone

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0",
            "environment": "production"
        }
        
        self.wfile.write(json.dumps(response).encode())
        return

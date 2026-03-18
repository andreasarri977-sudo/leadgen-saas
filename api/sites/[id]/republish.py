# Vercel Serverless Function - Republish Site to Vercel
from http.server import BaseHTTPRequestHandler
import json
import asyncio
import os
import base64
import urllib.request
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'leadhunter')
VERCEL_TOKEN = os.environ.get('VERCEL_TOKEN')

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        try:
            path_parts = self.path.split('/')
            demo_id = path_parts[3] if len(path_parts) > 3 else None
            
            if not demo_id:
                self.send_error_response(400, 'Demo ID required')
                return
            
            if not VERCEL_TOKEN:
                self.send_error_response(400, 'Vercel token not configured')
                return
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self.republish_site(demo_id))
            loop.close()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'success': False, 'error': message}).encode())
    
    async def republish_site(self, demo_id):
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        demo = await db.demo_sites.find_one({"demo_id": demo_id})
        if not demo:
            client.close()
            return {"success": False, "error": "Demo not found"}
        
        business = demo.get('business_data', {}) or {}
        business_name = demo.get('business_name', business.get('name', 'Site'))
        
        # Generate simple HTML (minimal version for serverless)
        html_content = self.generate_simple_html(demo, business)
        
        # Create project name
        safe_name = ''.join(c if c.isalnum() else '-' for c in business_name.lower())[:20]
        project_name = f"{safe_name}-{demo_id[:8]}"
        
        # Deploy to Vercel
        try:
            deploy_result = self.deploy_to_vercel(project_name, html_content)
            
            if deploy_result.get('url'):
                production_url = f"https://{deploy_result['url']}"
                
                await db.demo_sites.update_one(
                    {"demo_id": demo_id},
                    {"$set": {
                        "publish_status": "published",
                        "production_url": production_url,
                        "published_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                client.close()
                return {
                    "success": True,
                    "production_url": production_url,
                    "message": "Site republished successfully"
                }
            else:
                client.close()
                return {"success": False, "error": "Vercel deployment failed"}
                
        except Exception as e:
            client.close()
            return {"success": False, "error": str(e)}
    
    def generate_simple_html(self, demo, business):
        name = demo.get('business_name', business.get('name', 'Business'))
        phone = business.get('phone', '')
        address = business.get('address', '')
        
        return f'''<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{name}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: system-ui, sans-serif; background: #f5f5f5; }}
        .hero {{ background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 4rem 2rem; text-align: center; }}
        .hero h1 {{ font-size: 2.5rem; margin-bottom: 1rem; }}
        .content {{ max-width: 800px; margin: 2rem auto; padding: 0 1rem; }}
        .card {{ background: white; padding: 2rem; border-radius: 12px; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .cta {{ background: #22c55e; color: white; padding: 1rem 2rem; border-radius: 50px; text-decoration: none; display: inline-block; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="hero">
        <h1>{name}</h1>
        <p>{address}</p>
    </div>
    <div class="content">
        <div class="card">
            <h2>Contattaci</h2>
            <p style="margin: 1rem 0;">Telefono: {phone}</p>
            <a href="tel:{phone}" class="cta">Chiama Ora</a>
        </div>
    </div>
</body>
</html>'''
    
    def deploy_to_vercel(self, project_name, html_content):
        html_base64 = base64.b64encode(html_content.encode()).decode()
        
        payload = {
            "name": project_name,
            "public": True,
            "files": [
                {
                    "file": "index.html",
                    "data": html_base64,
                    "encoding": "base64"
                }
            ],
            "projectSettings": {
                "framework": None
            }
        }
        
        req = urllib.request.Request(
            "https://api.vercel.com/v13/deployments",
            data=json.dumps(payload).encode(),
            headers={
                "Authorization": f"Bearer {VERCEL_TOKEN}",
                "Content-Type": "application/json"
            }
        )
        
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.loads(response.read().decode())

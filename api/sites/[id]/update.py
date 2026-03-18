# Vercel Serverless Function - Update Site Content
from http.server import BaseHTTPRequestHandler
import json
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'leadhunter')

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
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            section = data.get('section', '')
            section_data = data.get('data', {})
            
            if not section:
                self.send_error_response(400, 'Section required')
                return
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self.update_site(demo_id, section, section_data))
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
    
    async def update_site(self, demo_id, section, data):
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        demo = await db.demo_sites.find_one({"demo_id": demo_id})
        if not demo:
            client.close()
            return {"success": False, "error": "Demo not found"}
        
        content = demo.get('content', {}) or {}
        business = demo.get('business_data', {}) or {}
        update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if section == "contacts":
            update_fields["business_data.phone"] = data.get('phone', '')
            update_fields["business_data.whatsapp"] = data.get('whatsapp', '')
            update_fields["business_data.email"] = data.get('email', '')
        
        elif section == "texts":
            update_fields["content.tagline_local"] = data.get('tagline_local', '')
            update_fields["content.tagline_en"] = data.get('tagline_en', '')
            update_fields["content.about_local"] = data.get('about_local', '')
            update_fields["content.about_en"] = data.get('about_en', '')
        
        elif section == "hours":
            # Convert hours dict to opening_hours array format
            pass  # Keep existing format for now
        
        elif section == "menu":
            update_fields["content.menu_mode"] = data.get('mode', 'services')
            update_fields["content.menu_categories"] = data.get('categories', [])
            update_fields["business_data.services"] = data.get('services', [])
        
        elif section == "seo":
            update_fields["content.seo_title_local"] = data.get('title_local', '')
            update_fields["content.seo_title_en"] = data.get('title_en', '')
            update_fields["content.seo_meta_local"] = data.get('meta_local', '')
            update_fields["content.seo_meta_en"] = data.get('meta_en', '')
        
        elif section == "gallery":
            images = data.get('images', [])
            update_fields["business_data.photos"] = [img.get('url') for img in images if img.get('url')]
        
        elif section == "logo":
            if data.get('remove_logo'):
                update_fields["logo_base64"] = None
            elif data.get('logo_base64'):
                update_fields["logo_base64"] = data.get('logo_base64')
        
        else:
            client.close()
            return {"success": False, "error": f"Unknown section: {section}"}
        
        await db.demo_sites.update_one(
            {"demo_id": demo_id},
            {"$set": update_fields}
        )
        
        client.close()
        return {"success": True, "message": f"Section {section} updated"}

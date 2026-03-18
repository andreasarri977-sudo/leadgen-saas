# Vercel Serverless Function - Site Editor Data
from http.server import BaseHTTPRequestHandler
import json
import asyncio
import os
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
            # Extract demo_id from path: /api/sites/[id]/editor-data
            path_parts = self.path.split('/')
            demo_id = path_parts[3] if len(path_parts) > 3 else None
            
            if not demo_id:
                self.send_error(400, 'Demo ID required')
                return
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self.get_editor_data(demo_id))
            loop.close()
            
            if result is None:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Demo not found'}).encode())
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
    
    async def get_editor_data(self, demo_id):
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        demo = await db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
        if not demo:
            client.close()
            return None
        
        business = demo.get('business_data', {}) or {}
        content = demo.get('content', {}) or {}
        locale_lang = business.get('site_language', 'it') or 'it'
        
        # Build hours structure
        hours = {}
        days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        opening_hours = business.get('opening_hours', []) or []
        
        for i, day in enumerate(days):
            if i < len(opening_hours):
                hours_text = opening_hours[i]
                is_closed = 'Closed' in hours_text or 'Chiuso' in hours_text
                hours[day] = {
                    'closed': is_closed,
                    'open': '09:00' if not is_closed else '',
                    'close': '18:00' if not is_closed else '',
                    'note': ''
                }
            else:
                hours[day] = {'closed': True, 'open': '', 'close': '', 'note': ''}
        
        result = {
            "demo_id": demo_id,
            "business_name": demo.get('business_name', business.get('name', '')),
            "locale_lang": locale_lang,
            "publish_status": demo.get('publish_status', 'draft'),
            "production_url": demo.get('production_url'),
            "logo_base64": demo.get('logo_base64'),
            "hours": hours,
            "menu": {
                "mode": content.get('menu_mode', 'services'),
                "categories": content.get('menu_categories', []),
                "services": business.get('services', []) or []
            },
            "texts": {
                "tagline_local": content.get('tagline_local', ''),
                "tagline_en": content.get('tagline_en', ''),
                "about_local": content.get('about_local', business.get('about', '')),
                "about_en": content.get('about_en', '')
            },
            "contacts": {
                "phone": business.get('phone', ''),
                "whatsapp": business.get('whatsapp', business.get('phone', '')),
                "email": business.get('email', '')
            },
            "gallery": [{"url": url, "caption": "", "order": i} for i, url in enumerate(business.get('photos', []) or [])],
            "seo": {
                "title_local": content.get('seo_title_local', ''),
                "title_en": content.get('seo_title_en', ''),
                "meta_local": content.get('seo_meta_local', ''),
                "meta_en": content.get('seo_meta_en', '')
            }
        }
        
        client.close()
        return result

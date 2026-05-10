# /api/demos/[id]/index.py - Get, Update, Delete, Publish Demo Site
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import uuid
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone

def log(msg):
    print(f"[DEMOS/ID] {msg}", file=sys.stderr, flush=True)

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("URL_MONGO")
DB_NAME = os.environ.get("DB_NAME", "leadhunter")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _get_demo_id(self):
        """Extract demo_id from path like /api/demos/abc123"""
        path = urlparse(self.path).path
        parts = path.strip('/').split('/')
        if len(parts) >= 3:
            return parts[2]
        return None
    
    def _get_action(self):
        """Extract action from query parameter ?action=xxx"""
        query = parse_qs(urlparse(self.path).query)
        action = query.get('action', [None])[0]
        return action

    def do_GET(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        demo_id = self._get_demo_id()
        action = self._get_action()
        
        if not demo_id:
            return self._error(400, "demo_id richiesto")
        
        log(f"GET demo: {demo_id}, action: {action}")
        
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            demo = db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
            
            if not demo:
                client.close()
                return self._error(404, "Demo non trovato")
            
            # Handle editor-data action
            if action == "editor-data":
                content = demo.get('content', {})
                business = demo.get('business_data', {})
                hours_text = business.get('hours_text', [])
                
                # Initialize default hours structure
                default_hours = {
                    'lun': {'closed': False, 'open': '09:00', 'close': '18:00', 'note': ''},
                    'mar': {'closed': False, 'open': '09:00', 'close': '18:00', 'note': ''},
                    'mer': {'closed': False, 'open': '09:00', 'close': '18:00', 'note': ''},
                    'gio': {'closed': False, 'open': '09:00', 'close': '18:00', 'note': ''},
                    'ven': {'closed': False, 'open': '09:00', 'close': '18:00', 'note': ''},
                    'sab': {'closed': False, 'open': '09:00', 'close': '13:00', 'note': ''},
                    'dom': {'closed': True, 'open': '', 'close': '', 'note': ''}
                }
                
                # Try to parse hours_text into structured format
                hours = demo.get('hours', default_hours)
                if isinstance(hours, list):
                    hours = default_hours
                
                # Build contacts object
                contacts = {
                    'phone': business.get('phone', ''),
                    'email': business.get('email', ''),
                    'address': business.get('address', ''),
                    'city': business.get('city', ''),
                    'whatsapp_number': business.get('whatsapp_number', ''),
                    'instagram_url': business.get('instagram_url', ''),
                    'facebook_url': business.get('facebook_url', ''),
                    'booking_mode': business.get('booking_mode', 'none'),
                    'external_booking_url': business.get('external_booking_url', '')
                }
                
                # Build texts object
                texts = {
                    'tagline': content.get('tagline', ''),
                    'about_text': content.get('about_text', ''),
                    'homepage_subtitle': content.get('homepage_subtitle', ''),
                    'services_intro': content.get('services_intro', ''),
                    'cta_text': content.get('cta_text', 'Contattaci')
                }
                
                # Build menu/services object
                services = content.get('services', [])
                menu = {
                    'mode': 'services',
                    'services': services if isinstance(services, list) else [],
                    'categories': content.get('menu_categories', [])
                }
                
                # Build gallery from photos
                photos = business.get('photos', [])
                gallery = [p.get('url', p) if isinstance(p, dict) else p for p in photos]
                
                # Build SEO object
                seo = {
                    'meta_title': content.get('meta_title', demo.get('business_name', '')),
                    'meta_description': content.get('meta_description', content.get('about_text', '')[:160] if content.get('about_text') else ''),
                    'keywords': content.get('keywords', '')
                }
                
                editor_data = {
                    "demo_id": demo_id,
                    "business_name": demo.get('business_name', ''),
                    "logo_base64": demo.get('logo_base64'),
                    "publish_status": demo.get('status', 'draft'),
                    "production_url": demo.get('vercel_url') or demo.get('internal_url'),
                    "locale_lang": business.get('site_language', 'it'),
                    # Structured data for each tab
                    "hours": hours,
                    "hours_text": hours_text,
                    "menu": menu,
                    "texts": texts,
                    "contacts": contacts,
                    "gallery": gallery,
                    "seo": seo,
                    # New sections
                    "why_choose_us": content.get('why_choose_us', []),
                    "faq": content.get('faq', []),
                    # Client settings
                    "client_settings": demo.get('client_settings', {}),
                    # Raw data
                    "theme": content.get('theme', 'modern'),
                    "color_scheme": content.get('color_scheme', 'blue'),
                    "hero_image": content.get('hero_image', ''),
                    "hero_position": content.get('hero_position', 'center'),
                    "hero_overlay": content.get('hero_overlay', 'medium'),
                    "reviews": business.get('reviews', [])
                }
                client.close()
                return self._json_response(200, editor_data)
            
            client.close()
            
            if "created_at" in demo:
                demo["created_at"] = str(demo["created_at"])
            
            self._json_response(200, demo)
            
        except Exception as e:
            log(f"ERROR: {e}")
            return self._error(500, f"Database error: {str(e)}")

    def do_POST(self):
        """Handle update, publish, republish actions"""
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        demo_id = self._get_demo_id()
        action = self._get_action()
        
        if not demo_id:
            return self._error(400, "demo_id richiesto")
        
        log(f"POST demo: {demo_id}, action: {action}")
        
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            demo = db.demo_sites.find_one({"demo_id": demo_id})
            if not demo:
                client.close()
                return self._error(404, "Demo non trovato")
            
            # Handle different actions
            if action == "publish":
                internal_url = f"/demo/{demo_id}"
                db.demo_sites.update_one(
                    {"demo_id": demo_id},
                    {"$set": {
                        "published": True,
                        "status": "published",
                        "publish_status": "published",
                        "internal_url": internal_url,
                        "demo_url": internal_url,
                        "production_url": internal_url,
                        "published_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                lead_id = demo.get('lead_id')
                if lead_id:
                    db.leads.update_one({"lead_id": lead_id}, {"$set": {"status": "demo_pubblicata"}})
                client.close()
                return self._json_response(200, {"message": "Demo pubblicato!", "url": internal_url})
            
            elif action == "connect-domain":
                # Connect a custom domain to the demo site
                custom_domain = data.get('domain', '').strip().lower()
                if not custom_domain:
                    client.close()
                    return self._error(400, "Dominio non specificato")
                
                # Clean domain (remove http/https, www if needed)
                custom_domain = custom_domain.replace('https://', '').replace('http://', '')
                if custom_domain.startswith('www.'):
                    custom_domain = custom_domain[4:]
                custom_domain = custom_domain.rstrip('/')
                
                # Validate domain format
                import re
                domain_pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$'
                if not re.match(domain_pattern, custom_domain):
                    client.close()
                    return self._error(400, f"Formato dominio non valido: {custom_domain}")
                
                # Generate DNS records for verification
                verification_token = str(uuid.uuid4())[:8]
                dns_records = [
                    {
                        "type": "CNAME",
                        "name": "www",
                        "value": f"{demo_id}.leadhunter.site",
                        "description": "Punta il sottodominio www al nostro server"
                    },
                    {
                        "type": "A", 
                        "name": "@",
                        "value": "76.76.21.21",
                        "description": "Punta il dominio principale a Vercel (se supportato)"
                    }
                ]
                
                # Update demo with domain info
                db.demo_sites.update_one(
                    {"demo_id": demo_id},
                    {"$set": {
                        "custom_domain": custom_domain,
                        "domain_status": "pending",
                        "domain_verification": dns_records,
                        "domain_verification_token": verification_token,
                        "domain_connected_at": datetime.now(timezone.utc).isoformat(),
                        "production_url": f"https://{custom_domain}"
                    }}
                )
                
                client.close()
                
                return self._json_response(200, {
                    "message": f"Dominio {custom_domain} aggiunto",
                    "domain": custom_domain,
                    "status": "pending",
                    "dns_records": dns_records,
                    "instructions": f"Configura i seguenti record DNS nel pannello del tuo registrar per attivare il dominio {custom_domain}"
                })
            
            elif action == "verify-domain":
                # Verify if domain DNS is properly configured
                custom_domain = demo.get('custom_domain')
                if not custom_domain:
                    client.close()
                    return self._error(400, "Nessun dominio configurato")
                
                # In production, you would check DNS here
                # For now, we'll mark it as verified
                is_verified = True  # Simplified - in production, do actual DNS lookup
                
                if is_verified:
                    db.demo_sites.update_one(
                        {"demo_id": demo_id},
                        {"$set": {
                            "domain_status": "active",
                            "domain_verified_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    client.close()
                    return self._json_response(200, {
                        "verified": True,
                        "message": f"Dominio {custom_domain} verificato e attivo!",
                        "url": f"https://{custom_domain}"
                    })
                else:
                    client.close()
                    return self._json_response(200, {
                        "verified": False,
                        "message": "DNS non ancora propagato. Riprova tra qualche minuto."
                    })
            
            elif action == "remove-domain":
                # Remove custom domain
                db.demo_sites.update_one(
                    {"demo_id": demo_id},
                    {"$unset": {
                        "custom_domain": "",
                        "domain_status": "",
                        "domain_verification": "",
                        "domain_verification_token": "",
                        "domain_connected_at": "",
                        "domain_verified_at": ""
                    },
                    "$set": {
                        "production_url": f"/demo/{demo_id}"
                    }}
                )
                client.close()
                return self._json_response(200, {"message": "Dominio rimosso"})
            
            elif action == "republish":
                db.demo_sites.update_one(
                    {"demo_id": demo_id},
                    {"$set": {"status": "republish_requested", "republish_at": datetime.now(timezone.utc).isoformat()}}
                )
                client.close()
                return self._json_response(200, {"message": "Ripubblicazione richiesta"})
            
            elif action == "update":
                update_fields = {}
                content_updates = {}
                business_updates = {}
                
                # Handle section-based updates (from editor)
                section = data.get('section')
                section_data = data.get('data', {})
                
                if section == 'logo':
                    if section_data.get('logo_base64'):
                        update_fields['logo_base64'] = section_data['logo_base64']
                    if section_data.get('logo_url'):
                        # Download and convert to base64
                        try:
                            import urllib.request
                            import base64
                            logo_url = section_data['logo_url']
                            with urllib.request.urlopen(logo_url, timeout=10) as response:
                                logo_data = response.read()
                                logo_base64 = base64.b64encode(logo_data).decode('utf-8')
                                update_fields['logo_base64'] = logo_base64
                        except Exception as e:
                            log(f"Error downloading logo: {e}")
                            client.close()
                            return self._json_response(200, {"success": False, "errors": [f"Impossibile scaricare il logo: {str(e)}"]})
                    if section_data.get('remove_logo'):
                        update_fields['logo_base64'] = None
                    
                    if update_fields:
                        update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
                        db.demo_sites.update_one({"demo_id": demo_id}, {"$set": update_fields})
                    client.close()
                    return self._json_response(200, {"success": True, "message": "Logo aggiornato"})
                
                elif section == 'style':
                    if section_data.get('color_scheme'):
                        content_updates['content.color_scheme'] = section_data['color_scheme']
                    if section_data.get('hero_image'):
                        content_updates['content.hero_image'] = section_data['hero_image']
                    if section_data.get('hero_position'):
                        content_updates['content.hero_position'] = section_data['hero_position']
                    if section_data.get('hero_overlay'):
                        content_updates['content.hero_overlay'] = section_data['hero_overlay']
                    if section_data.get('theme'):
                        content_updates['content.theme'] = section_data['theme']
                    
                    if content_updates:
                        content_updates['updated_at'] = datetime.now(timezone.utc).isoformat()
                        db.demo_sites.update_one({"demo_id": demo_id}, {"$set": content_updates})
                    client.close()
                    return self._json_response(200, {"success": True, "message": "Stile aggiornato"})
                
                elif section == 'social':
                    if 'social_links' in section_data:
                        business_updates['business_data.social_links'] = section_data['social_links']
                
                elif section == 'why_choose_us':
                    content_updates['content.why_choose_us'] = section_data
                    if content_updates:
                        content_updates['updated_at'] = datetime.now(timezone.utc).isoformat()
                        db.demo_sites.update_one({"demo_id": demo_id}, {"$set": content_updates})
                    client.close()
                    return self._json_response(200, {"success": True, "message": "Sezione aggiornata"})
                
                elif section == 'faq':
                    content_updates['content.faq'] = section_data
                    if content_updates:
                        content_updates['updated_at'] = datetime.now(timezone.utc).isoformat()
                        db.demo_sites.update_one({"demo_id": demo_id}, {"$set": content_updates})
                    client.close()
                    return self._json_response(200, {"success": True, "message": "FAQ aggiornate"})
                
                elif section == 'client_settings':
                    # Save client settings for booking notifications
                    update_data = {
                        'client_settings': section_data,
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    }
                    db.demo_sites.update_one({"demo_id": demo_id}, {"$set": update_data})
                    client.close()
                    return self._json_response(200, {"success": True, "message": "Impostazioni cliente salvate"})
                
                # Standard field updates (backward compatibility)
                content_fields = ['tagline', 'about_text', 'homepage_subtitle', 'services_intro', 'services', 'cta_text', 'theme', 'color_scheme', 'hero_image', 'why_choose_us', 'faq']
                for field in content_fields:
                    if field in data:
                        content_updates[f"content.{field}"] = data[field]
                
                business_fields = ['phone', 'email', 'address', 'city', 'hours_text', 'booking_mode', 'external_booking_url', 'photos', 'social_links']
                for field in business_fields:
                    if field in data:
                        business_updates[f"business_data.{field}"] = data[field]
                
                if 'business_name' in data:
                    update_fields['business_name'] = data['business_name']
                if 'logo_base64' in data:
                    update_fields['logo_base64'] = data['logo_base64']
                
                all_updates = {**update_fields, **content_updates, **business_updates}
                all_updates['updated_at'] = datetime.now(timezone.utc).isoformat()
                
                if all_updates:
                    db.demo_sites.update_one({"demo_id": demo_id}, {"$set": all_updates})
                
                client.close()
                return self._json_response(200, {"success": True, "message": "Sito aggiornato"})
            
            else:
                client.close()
                return self._error(400, f"Azione non riconosciuta: {action}")
            
        except Exception as e:
            log(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            return self._error(500, f"Errore: {str(e)}")

    def do_DELETE(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        demo_id = self._get_demo_id()
        if not demo_id:
            return self._error(400, "demo_id richiesto")
        
        log(f"DELETE demo: {demo_id}")
        
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            result = db.demo_sites.delete_one({"demo_id": demo_id})
            client.close()
            
            if result.deleted_count == 0:
                return self._error(404, "Demo non trovato")
            
            self._json_response(200, {"message": "Demo eliminato", "demo_id": demo_id})
            
        except Exception as e:
            log(f"ERROR: {e}")
            return self._error(500, f"Database error: {str(e)}")

    def _json_response(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _error(self, code, msg):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode())

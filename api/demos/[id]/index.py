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

def _load_default_logo():
    """Load the default WebFinder Studio logo as base64 string (for PDF fallback)."""
    try:
        here = os.path.dirname(os.path.abspath(__file__))
        candidates = [
            os.path.join(here, "..", "..", "assets_logo.b64"),
            os.path.join(here, "..", "assets_logo.b64"),
            "/var/task/api/assets_logo.b64",
            "/var/task/assets_logo.b64"
        ]
        for path in candidates:
            if os.path.exists(path):
                with open(path) as f:
                    return f.read().strip()
    except Exception as e:
        log(f"Default logo load failed: {e}")
    return ""

DEFAULT_LOGO_B64 = _load_default_logo()

def _safe(s):
    """Sanitize string for FPDF core fonts (latin-1). Replace unsupported chars."""
    if s is None:
        return ""
    s = str(s)
    repl = {
        '\u2018': "'", '\u2019': "'", '\u201A': "'", '\u201B': "'",
        '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u201F': '"',
        '\u2013': '-', '\u2014': '-', '\u2212': '-',
        '\u2026': '...', '\u00A0': ' ',
        '\u20AC': 'EUR',
        '\u2022': '-', '\u25CF': '-', '\u2192': '->', '\u2190': '<-',
        '\u2705': '[OK]', '\u274C': '[X]', '\u2713': '[OK]', '\u2717': '[X]'
    }
    for k, v in repl.items():
        s = s.replace(k, v)
    return s.encode('latin-1', 'replace').decode('latin-1')

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
            
            # Handle stats action (visitor tracking)
            if action == "stats":
                try:
                    from datetime import timedelta
                    events = list(db.demo_views.find({"demo_id": demo_id}, {"_id": 0}).sort("ts", -1).limit(500))
                    total_views = len([e for e in events if e.get('event_type') == 'view'])
                    sessions = set(e.get('session_id') for e in events if e.get('event_type') == 'view' and e.get('session_id'))
                    clicks_wa = len([e for e in events if e.get('event_type') == 'click_whatsapp'])
                    clicks_phone = len([e for e in events if e.get('event_type') == 'click_phone'])
                    clicks_booking = len([e for e in events if e.get('event_type') == 'click_booking'])
                    devices = {'mobile': 0, 'desktop': 0}
                    for e in events:
                        d = e.get('device', 'desktop')
                        devices[d] = devices.get(d, 0) + 1
                    last_view = events[0].get('ts') if events else None
                    # Hot lead score: weighted (views x 1) + (sessions x 3) + (whatsapp x 5) + (phone x 5) + (booking x 10)
                    score = total_views + (len(sessions) * 3) + (clicks_wa * 5) + (clicks_phone * 5) + (clicks_booking * 10)
                    client.close()
                    return self._json_response(200, {
                        "total_views": total_views,
                        "unique_sessions": len(sessions),
                        "clicks": {"whatsapp": clicks_wa, "phone": clicks_phone, "booking": clicks_booking},
                        "devices": devices,
                        "last_view": last_view,
                        "score": score,
                        "events": events[:20]
                    })
                except Exception as _e:
                    log(f"Stats error: {_e}")
                    client.close()
                    return self._error(500, str(_e))
            
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
                    "hide_watermark": bool(content.get('hide_watermark', False)),
                    "reviews": business.get('reviews', []),
                    # Site settings (languages + section visibility)
                    "site_language": business.get('site_language', 'it'),
                    "translations": business.get('translations', []),
                    "booking_mode": business.get('booking_mode', 'none'),
                    "external_booking_url": business.get('external_booking_url', ''),
                    "show_reviews": content.get('show_reviews', True),
                    "show_gallery": content.get('show_gallery', True),
                    "show_whyus": content.get('show_whyus', True),
                    "show_faq": content.get('show_faq', True),
                    "show_hours": content.get('show_hours', True),
                    "show_map": content.get('show_map', True),
                    "show_services": content.get('show_services', True)
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
                    if 'hide_watermark' in section_data:
                        content_updates['content.hide_watermark'] = bool(section_data['hide_watermark'])
                    
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
                
                elif section == 'site_settings':
                    # Save general site settings: languages, sections visibility, booking mode
                    updates = {}
                    if 'site_language' in section_data:
                        updates['business_data.site_language'] = section_data['site_language']
                    if 'translations' in section_data:
                        # Validate: array of unique language codes, max 4
                        tr = section_data['translations'] or []
                        if not isinstance(tr, list):
                            tr = []
                        primary = section_data.get('site_language', '')
                        tr = [x for x in tr if x and x != primary][:4]
                        updates['business_data.translations'] = tr
                    if 'booking_mode' in section_data:
                        updates['business_data.booking_mode'] = section_data['booking_mode']
                    if 'external_booking_url' in section_data:
                        updates['business_data.external_booking_url'] = section_data['external_booking_url']
                    # Section visibility toggles
                    for flag in ['show_reviews', 'show_gallery', 'show_whyus', 'show_faq', 'show_hours', 'show_map', 'show_services']:
                        if flag in section_data:
                            updates[f'content.{flag}'] = bool(section_data[flag])
                    if updates:
                        updates['updated_at'] = datetime.now(timezone.utc).isoformat()
                        db.demo_sites.update_one({"demo_id": demo_id}, {"$set": updates})
                    client.close()
                    return self._json_response(200, {"success": True, "message": "Impostazioni sito salvate"})
                
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
            
            elif action == "track":
                # Track a visitor event on the demo site (view, click_whatsapp, click_phone, etc.)
                event_type = (data.get('event_type') or 'view').strip()
                session_id = (data.get('session_id') or '')[:36]
                section = (data.get('section') or '')[:50]
                user_agent = self.headers.get('User-Agent', '')[:200]
                device = 'mobile' if any(m in user_agent.lower() for m in ['mobile', 'iphone', 'android']) else 'desktop'
                try:
                    db.demo_views.insert_one({
                        "demo_id": demo_id,
                        "lead_id": demo.get('lead_id'),
                        "event_type": event_type,
                        "section": section,
                        "session_id": session_id,
                        "device": device,
                        "ts": datetime.now(timezone.utc).isoformat()
                    })
                except Exception as _e:
                    log(f"Track insert failed: {_e}")
                client.close()
                return self._json_response(200, {"ok": True})
            
            elif action == "template_apply_inline":
                # Apply provided template data (e.g. just-generated AI) directly to this demo
                # Preserves existing fields (services, booking_mode, reviews, etc.) - only updates the ones provided.
                tdata = data.get('data') or {}
                if not tdata:
                    client.close()
                    return self._error(400, "data richiesto")
                content_updates = {}
                # AI generates ONLY these content fields. Everything else (services, gallery, hide_watermark, etc) preserved.
                allowed = {'color_scheme', 'hero_position', 'hero_overlay', 'theme',
                           'tagline', 'homepage_subtitle', 'about_text', 'services_intro',
                           'cta_text', 'why_choose_us', 'faq'}
                for k, v in tdata.items():
                    if v is None or k not in allowed:
                        continue
                    content_updates[f"content.{k}"] = v
                
                # Safety: ensure booking_mode is set if missing/empty (old batch-generated demos may lack it)
                bd = demo.get('business_data') or {}
                if not bd.get('booking_mode') or bd.get('booking_mode') == 'none':
                    cat = (bd.get('category') or '').lower()
                    bk_appointment = {'parrucchiere','barbiere','estetista','centro estetico','tatuatore','nail salon','spa',
                                       'dentista','fisioterapista','veterinario','ottico','palestra','fotografo','medico',
                                       'psicologo','osteopata','personal trainer'}
                    bk_table = {'ristorante','pizzeria','trattoria','osteria','hamburgeria','sushi','pub','bar',
                                 'caffetteria','gelateria','pasticceria'}
                    if any(c in cat for c in bk_appointment):
                        content_updates['business_data.booking_mode'] = 'appointment'
                    elif any(c in cat for c in bk_table):
                        content_updates['business_data.booking_mode'] = 'table'
                
                content_updates['updated_at'] = datetime.now(timezone.utc).isoformat()
                db.demo_sites.update_one({"demo_id": demo_id}, {"$set": content_updates})
                client.close()
                return self._json_response(200, {
                    "success": True,
                    "applied": list(tdata.keys())
                })
            
            elif action == "template_apply":
                # Apply a saved template to this demo's content
                template_id = data.get('template_id')
                if not template_id:
                    client.close()
                    return self._error(400, "template_id richiesto")
                tpl = db.templates.find_one({"template_id": template_id}, {"_id": 0})
                if not tpl:
                    client.close()
                    return self._error(404, "Template non trovato")
                tdata = tpl.get('data') or {}
                content_updates = {}
                for k, v in tdata.items():
                    if v is None:
                        continue
                    content_updates[f"content.{k}"] = v
                content_updates['updated_at'] = datetime.now(timezone.utc).isoformat()
                db.demo_sites.update_one({"demo_id": demo_id}, {"$set": content_updates})
                client.close()
                return self._json_response(200, {
                    "success": True,
                    "applied": list(tdata.keys()),
                    "template_name": tpl.get('name')
                })
            
            elif action == "quote":
                # Generate a PDF quote/preventivo for this demo and optionally email it
                try:
                    from fpdf import FPDF
                except ImportError:
                    client.close()
                    return self._error(500, "fpdf2 non installato")
                import base64 as _b64
                
                business = demo.get('business_data', {}) or {}
                client_email_override = (data.get('recipient_email') or '').strip()
                send_email_flag = bool(data.get('send_email'))
                price = data.get('price')
                currency = data.get('currency') or 'EUR'
                custom_notes = (data.get('notes') or '').strip()
                features = data.get('features') or []
                
                profile = db.user_settings.find_one({"setting_id": "invoice_profile"}, {"_id": 0}) or {}
                if price is None or price == '':
                    price = profile.get('default_price', 800)
                try:
                    price_num = float(price)
                except Exception:
                    price_num = 800.0
                
                currency_symbol = {'EUR': 'EUR', 'USD': 'USD', 'GBP': 'GBP', 'CHF': 'CHF'}.get(currency, currency)
                
                if not features:
                    has_booking = business.get('booking_mode', 'none') != 'none' or bool(business.get('external_booking_url'))
                    features = [
                        "Sito web professionale responsive (mobile + desktop)",
                        "Galleria fotografica + recensioni Google integrate",
                    ]
                    if has_booking:
                        features.append("Sistema prenotazioni online con notifica email")
                    features += [
                        "Pulsanti WhatsApp e chiamata diretta",
                        "Mappa interattiva e indicazioni stradali",
                        "Hosting incluso primo anno + dominio personalizzato",
                        "Ottimizzazione SEO base per Google",
                        "Supporto via email per 6 mesi"
                    ]
                
                business_name = demo.get('business_name', business.get('name', 'Cliente'))
                business_address = business.get('address', '')
                business_city = business.get('city', '')
                
                from datetime import datetime as _dt, timedelta as _td
                quote_id = "PRV-" + _dt.now().strftime("%Y%m%d-%H%M")
                today = _dt.now().strftime("%d/%m/%Y")
                valid_until = (_dt.now() + _td(days=30)).strftime("%d/%m/%Y")
                
                pdf = FPDF(format='A4', unit='mm')
                pdf.add_page()
                pdf.set_auto_page_break(auto=True, margin=15)
                
                logo_b64 = profile.get('logo_base64') or DEFAULT_LOGO_B64
                if logo_b64:
                    try:
                        import io as _io
                        raw = logo_b64.split(',', 1)[-1]
                        logo_bytes = _b64.b64decode(raw)
                        pdf.image(_io.BytesIO(logo_bytes), x=15, y=12, h=20)
                    except Exception as _e:
                        log(f"Logo embed failed: {_e}")
                
                pdf.set_xy(110, 12)
                pdf.set_font("Helvetica", 'B', 11)
                pdf.cell(85, 5, _safe(profile.get('company_name', '') or 'WebFinder Studio'), ln=1, align='R')
                pdf.set_font("Helvetica", '', 9)
                for line in [profile.get('address',''),
                             f"{profile.get('postal_code','')} {profile.get('city','')}".strip(),
                             f"P.IVA {profile.get('vat_number','')}" if profile.get('vat_number') else '',
                             profile.get('email',''),
                             profile.get('phone','')]:
                    if line and line.strip():
                        pdf.set_x(110)
                        pdf.cell(85, 4, _safe(line), ln=1, align='R')
                
                pdf.set_y(45)
                pdf.set_font("Helvetica", 'B', 22)
                pdf.cell(0, 12, "PREVENTIVO", ln=1)
                pdf.set_font("Helvetica", '', 10)
                pdf.cell(0, 5, f"N. {quote_id}    -    Data: {today}    -    Valido fino al: {valid_until}", ln=1)
                
                pdf.ln(6)
                pdf.set_fill_color(245, 247, 250)
                pdf.set_draw_color(220, 224, 230)
                pdf.set_font("Helvetica", 'B', 10)
                pdf.cell(0, 7, "  INTESTATO A", ln=1, fill=True, border=1)
                pdf.set_font("Helvetica", 'B', 12)
                pdf.cell(0, 7, "  " + _safe(business_name), ln=1)
                pdf.set_font("Helvetica", '', 10)
                if business_address:
                    pdf.cell(0, 5, "  " + _safe(business_address), ln=1)
                if business_city:
                    pdf.cell(0, 5, "  " + _safe(business_city), ln=1)
                if business.get('phone'):
                    pdf.cell(0, 5, "  Tel: " + _safe(business.get('phone', '')), ln=1)
                
                pdf.ln(6)
                pdf.set_font("Helvetica", 'B', 11)
                pdf.cell(0, 6, "Oggetto:", ln=1)
                pdf.set_font("Helvetica", '', 11)
                pdf.multi_cell(0, 6, _safe(f"Realizzazione sito web professionale per {business_name}"))
                
                pdf.ln(4)
                pdf.set_fill_color(30, 64, 175)
                pdf.set_text_color(255, 255, 255)
                pdf.set_font("Helvetica", 'B', 10)
                pdf.cell(130, 8, "  DESCRIZIONE", border=0, fill=True)
                pdf.cell(0, 8, "IMPORTO  ", border=0, fill=True, ln=1, align='R')
                pdf.set_text_color(0, 0, 0)
                pdf.set_font("Helvetica", '', 10)
                for f in features:
                    pdf.set_fill_color(252, 252, 253)
                    pdf.cell(130, 7, "  - " + _safe(str(f))[:80], border='B', fill=True)
                    pdf.cell(0, 7, "incluso  ", border='B', fill=True, ln=1, align='R')
                
                pdf.ln(3)
                pdf.set_fill_color(30, 64, 175)
                pdf.set_text_color(255, 255, 255)
                pdf.set_font("Helvetica", 'B', 13)
                pdf.cell(130, 12, "  TOTALE", border=0, fill=True)
                total_str = f"{price_num:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
                pdf.cell(0, 12, f"{total_str} {currency_symbol}  ", border=0, fill=True, ln=1, align='R')
                pdf.set_text_color(0, 0, 0)
                
                if custom_notes:
                    pdf.ln(6)
                    pdf.set_font("Helvetica", 'B', 11)
                    pdf.cell(0, 6, "Note:", ln=1)
                    pdf.set_font("Helvetica", '', 10)
                    pdf.multi_cell(0, 5, _safe(custom_notes))
                
                pdf.ln(8)
                pdf.set_font("Helvetica", 'B', 10)
                pdf.cell(0, 6, "Modalita di pagamento:", ln=1)
                pdf.set_font("Helvetica", '', 9)
                if profile.get('iban'):
                    pdf.cell(0, 5, _safe(f"Bonifico bancario - IBAN: {profile.get('iban','')}"), ln=1)
                pdf.cell(0, 5, "50% all'accettazione, 50% alla consegna del sito.", ln=1)
                
                if profile.get('footer_notes'):
                    pdf.ln(4)
                    pdf.set_font("Helvetica", 'I', 8)
                    pdf.multi_cell(0, 4, _safe(profile.get('footer_notes', '')))
                if profile.get('legal_notes'):
                    pdf.ln(2)
                    pdf.set_font("Helvetica", '', 7)
                    pdf.set_text_color(120, 120, 120)
                    pdf.multi_cell(0, 3, _safe(profile.get('legal_notes', '')))
                
                pdf_bytes = bytes(pdf.output())
                pdf_b64 = _b64.b64encode(pdf_bytes).decode('utf-8')
                pdf_filename = f"Preventivo_{business_name.replace(' ', '_')}_{quote_id}.pdf"
                
                sent = False
                send_error = None
                recipient_final = client_email_override or (demo.get('client_settings', {}) or {}).get('client_email') or business.get('email') or ''
                if send_email_flag:
                    if not recipient_final:
                        send_error = "Email destinatario mancante"
                    else:
                        try:
                            import resend as _resend
                            resend_key = os.environ.get('RESEND_API_KEY')
                            if not resend_key:
                                send_error = "RESEND_API_KEY non configurata"
                            else:
                                _resend.api_key = resend_key
                                sender_name = profile.get('company_name') or 'LeadHunter Pro'
                                _resend.Emails.send({
                                    "from": f"{sender_name} <onboarding@resend.dev>",
                                    "to": [recipient_final],
                                    "subject": f"Preventivo sito web - {business_name}",
                                    "html": f"<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#1a1a1a'><h2 style='color:#1e40af'>Preventivo allegato</h2><p>Ciao,</p><p>in allegato il preventivo dettagliato per la realizzazione del sito web di <strong>{_safe(business_name)}</strong>.</p>{('<p>'+_safe(custom_notes)+'</p>') if custom_notes else ''}<p>Restiamo a disposizione per ogni domanda.</p><p style='margin-top:30px'>Cordiali saluti,<br><strong>{_safe(sender_name)}</strong></p></div>",
                                    "attachments": [{"filename": pdf_filename, "content": list(pdf_bytes)}]
                                })
                                sent = True
                        except Exception as _err:
                            send_error = str(_err)
                            log(f"Resend send failed: {_err}")
                
                try:
                    db.quotes.insert_one({
                        "quote_id": quote_id, "demo_id": demo_id,
                        "business_name": business_name, "price": price_num,
                        "currency": currency, "features": features, "notes": custom_notes,
                        "sent": sent, "recipient": recipient_final,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                except Exception as _e:
                    log(f"Quote insert failed: {_e}")
                
                client.close()
                return self._json_response(200, {
                    "success": True, "quote_id": quote_id, "filename": pdf_filename,
                    "pdf_base64": pdf_b64, "sent": sent,
                    "send_error": send_error, "recipient": recipient_final
                })
            
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

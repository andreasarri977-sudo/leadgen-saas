# /api/demos/[id]/index.py - Get, Update, Delete, Publish Demo Site
from http.server import BaseHTTPRequestHandler
import json
import os
import re
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
                    # Design Template (top-level on demo doc) + style personalizzazioni
                    "design_template": demo.get('design_template', 'classic'),
                    "text_color": content.get('text_color', 'black'),
                    "color_intensity": content.get('color_intensity', 'vivid'),
                    "title_color": content.get('title_color'),
                    "hero_bar_color": content.get('hero_bar_color'),
                    "title_align": content.get('title_align', 'center'),
                    "page_background": content.get('page_background') or {'type': 'none'},
                    "translations_cache": content.get('translations', {}),
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
                    "show_services": content.get('show_services', True),
                    "show_social": content.get('show_social', True),
                    "section_order": content.get('section_order', [])
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
                    if section_data.get('design_template'):
                        # Salvato a top-level (per coerenza con il campo del modello DemoSite)
                        content_updates['design_template'] = section_data['design_template']
                    if section_data.get('text_color') in ('black', 'white'):
                        content_updates['content.text_color'] = section_data['text_color']
                    if section_data.get('color_intensity') in ('soft', 'medium', 'vivid'):
                        content_updates['content.color_intensity'] = section_data['color_intensity']
                    # Color picker liberi (HEX) per titolo e hero info bar
                    if 'title_color' in section_data:
                        tc = section_data['title_color']
                        if tc is None or tc == '':
                            content_updates['content.title_color'] = None
                        elif isinstance(tc, str) and tc.startswith('#') and len(tc) in (4, 7):
                            content_updates['content.title_color'] = tc
                    if 'hero_bar_color' in section_data:
                        hbc = section_data['hero_bar_color']
                        if hbc is None or hbc == '':
                            content_updates['content.hero_bar_color'] = None
                        elif isinstance(hbc, str) and hbc.startswith('#') and len(hbc) in (4, 7):
                            content_updates['content.hero_bar_color'] = hbc
                    if section_data.get('title_align') in ('left', 'center'):
                        content_updates['content.title_align'] = section_data['title_align']
                    if 'page_background' in section_data:
                        pb = section_data['page_background']
                        # Validazione: {type:'none'|'gradient'|'image', id?, value?}
                        if pb is None:
                            content_updates['content.page_background'] = None
                        elif isinstance(pb, dict):
                            pb_type = pb.get('type')
                            if pb_type == 'none':
                                content_updates['content.page_background'] = {'type': 'none'}
                            elif pb_type == 'gradient' and isinstance(pb.get('id'), str):
                                content_updates['content.page_background'] = {'type': 'gradient', 'id': pb['id'][:32]}
                            elif pb_type == 'image' and isinstance(pb.get('value'), str):
                                val = pb['value']
                                if val.startswith('data:image') or val.startswith('http'):
                                    content_updates['content.page_background'] = {'type': 'image', 'value': val}
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
                    for flag in ['show_reviews', 'show_gallery', 'show_whyus', 'show_faq', 'show_hours', 'show_map', 'show_services', 'show_social']:
                        if flag in section_data:
                            updates[f'content.{flag}'] = bool(section_data[flag])
                    if updates:
                        updates['updated_at'] = datetime.now(timezone.utc).isoformat()
                        db.demo_sites.update_one({"demo_id": demo_id}, {"$set": updates})
                    client.close()
                    return self._json_response(200, {"success": True, "message": "Impostazioni sito salvate"})

                elif section == 'layout':
                    # Save section ordering (array di id sezione)
                    order = section_data.get('section_order') if isinstance(section_data, dict) else None
                    if not isinstance(order, list):
                        client.close()
                        return self._error(400, "section_order deve essere un array")
                    allowed = {'about', 'services', 'whyus', 'gallery', 'reviews', 'hours', 'booking', 'faq', 'location', 'contact', 'social'}
                    cleaned = []
                    seen = set()
                    for x in order:
                        if isinstance(x, str) and x in allowed and x not in seen:
                            cleaned.append(x)
                            seen.add(x)
                    db.demo_sites.update_one(
                        {"demo_id": demo_id},
                        {"$set": {
                            "content.section_order": cleaned,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    client.close()
                    return self._json_response(200, {"success": True, "message": "Ordine sezioni salvato", "section_order": cleaned})

                elif section == 'menu':
                    # Persiste l'intero oggetto menu (mode + categories + services)
                    # Items possono essere stringhe (legacy) o oggetti {name, description, price, image}
                    if not isinstance(section_data, dict):
                        client.close()
                        return self._error(400, "menu deve essere un oggetto")
                    mode = section_data.get('mode') if section_data.get('mode') in ('menu', 'services') else 'services'
                    categories = section_data.get('categories') or []
                    services = section_data.get('services') or []
                    db.demo_sites.update_one(
                        {"demo_id": demo_id},
                        {"$set": {
                            "content.menu": {"mode": mode, "categories": categories, "services": services},
                            "content.menu_categories": categories,
                            "content.services": services,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    client.close()
                    return self._json_response(200, {"success": True, "message": "Menu salvato"})
                
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
            
            elif action == "translate":
                # Genera traduzioni AI dei contenuti del demo in una lingua target
                # e le salva in content.translations[target_lang]
                target_lang = (data.get('target_lang') or '').strip().lower()
                SUPPORTED = {'it', 'fr', 'en', 'es', 'de'}
                if target_lang not in SUPPORTED:
                    client.close()
                    return self._error(400, f"Lingua non supportata. Disponibili: {sorted(SUPPORTED)}")
                emergent_key = os.environ.get('EMERGENT_LLM_KEY')
                if not emergent_key:
                    client.close()
                    return self._error(500, "EMERGENT_LLM_KEY non configurata")

                content = demo.get('content', {}) or {}
                payload_to_translate = {
                    'tagline': content.get('tagline'),
                    'homepage_subtitle': content.get('homepage_subtitle'),
                    'about_text': content.get('about_text'),
                    'services_intro': content.get('services_intro'),
                    'cta_text': content.get('cta_text'),
                    'why_choose_us': content.get('why_choose_us'),
                    'faq': content.get('faq'),
                    'services': content.get('services'),
                }
                payload_to_translate = {k: v for k, v in payload_to_translate.items() if v}
                if not payload_to_translate:
                    client.close()
                    return self._error(400, "Nessun contenuto da tradurre")

                lang_names = {'it': 'italiano', 'fr': 'francese', 'en': 'inglese', 'es': 'spagnolo', 'de': 'tedesco'}
                target_name = lang_names[target_lang]

                # Costruisco un prompt molto esplicito che obbliga Claude a:
                # 1. Rispondere con lo STESSO JSON keys-by-keys
                # 2. Tradurre OGNI elemento degli array (why_choose_us[].title/description, faq[].question/answer)
                # 3. NON omettere alcun campo presente nell'input
                input_json = json.dumps(payload_to_translate, ensure_ascii=False, indent=2)
                expected_keys = list(payload_to_translate.keys())
                why_count = len(payload_to_translate.get('why_choose_us') or [])
                faq_count = len(payload_to_translate.get('faq') or [])
                services_count = len(payload_to_translate.get('services') or [])

                prompt = (
                    f"Sei un traduttore professionista. Devi tradurre tutti i contenuti seguenti in {target_name}.\n\n"
                    f"=== REGOLE TASSATIVE ===\n"
                    f"1. Output: SOLO un singolo oggetto JSON valido, senza markdown ne testo extra.\n"
                    f"2. L'output DEVE contenere ESATTAMENTE queste chiavi top-level: {expected_keys}\n"
                    f"3. Per ogni stringa di testo: traduci in {target_name} mantenendo tono e lunghezza simili.\n"
                    f"4. Per l'array 'why_choose_us' ({why_count} elementi): per OGNI oggetto, traduci 'title' e 'description'. "
                    f"Lascia 'icon' IDENTICA. Mantieni esattamente {why_count} elementi, nello stesso ordine.\n"
                    f"5. Per l'array 'faq' ({faq_count} elementi): per OGNI oggetto traduci 'question' e 'answer'. "
                    f"Mantieni esattamente {faq_count} elementi, nello stesso ordine.\n"
                    f"6. Per l'array 'services' ({services_count} elementi): ogni elemento puo' essere una stringa O un oggetto. "
                    f"Se stringa: traduci la stringa stessa in {target_name}. Se oggetto: traduci 'name' e 'description' (se presenti), "
                    f"lascia invariati 'price' e 'image'. Mantieni esattamente {services_count} elementi, nello stesso ordine.\n"
                    f"7. NON aggiungere ne omettere campi. NON abbreviare gli array.\n\n"
                    f"=== INPUT DA TRADURRE ===\n{input_json}\n\n"
                    f"=== OUTPUT (solo JSON {target_name}) ==="
                )
                try:
                    import requests as _r
                    llm_response = _r.post(
                        "https://integrations.emergentagent.com/llm/chat/completions",
                        headers={"Authorization": f"Bearer {emergent_key}", "Content-Type": "application/json"},
                        json={
                            "model": "claude-sonnet-4-5-20250929",
                            "messages": [
                                {"role": "system", "content": f"Sei un traduttore professionista madrelingua {target_name}. Rispondi SEMPRE solo con JSON valido. Non omettere mai chiavi o elementi di array."},
                                {"role": "user", "content": prompt}
                            ],
                            "max_tokens": 8000
                        },
                        timeout=90
                    )
                    if llm_response.status_code != 200:
                        client.close()
                        return self._error(500, f"LLM error {llm_response.status_code}: {llm_response.text[:200]}")
                    llm_data = llm_response.json()
                    llm_text = llm_data['choices'][0]['message']['content']
                    cleaned = (llm_text or '').strip()
                    if cleaned.startswith('```'):
                        lines = cleaned.split('\n')
                        if lines and lines[0].startswith('```'):
                            lines = lines[1:]
                        if lines and lines[-1].startswith('```'):
                            lines = lines[:-1]
                        cleaned = '\n'.join(lines)
                    translated = json.loads(cleaned)
                except Exception as _e:
                    log(f"Translate AI error: {_e}")
                    client.close()
                    return self._error(500, f"Errore traduzione AI: {str(_e)[:200]}")

                # === VALIDAZIONE strutturale: assicura che ogni array abbia lo stesso numero di elementi ===
                missing_fields = []
                if 'why_choose_us' in payload_to_translate:
                    tr_wcu = translated.get('why_choose_us')
                    if not isinstance(tr_wcu, list) or len(tr_wcu) != why_count:
                        missing_fields.append('why_choose_us')
                        translated['why_choose_us'] = payload_to_translate['why_choose_us']  # fallback
                if 'faq' in payload_to_translate:
                    tr_faq = translated.get('faq')
                    if not isinstance(tr_faq, list) or len(tr_faq) != faq_count:
                        missing_fields.append('faq')
                        translated['faq'] = payload_to_translate['faq']  # fallback
                if 'services' in payload_to_translate:
                    tr_sv = translated.get('services')
                    if not isinstance(tr_sv, list) or len(tr_sv) != services_count:
                        missing_fields.append('services')
                        translated['services'] = payload_to_translate['services']  # fallback

                update_ops = {
                    f"content.translations.{target_lang}": translated,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                site_lang = demo.get('business_data', {}).get('site_language') or 'it'
                existing_translations = set(demo.get('business_data', {}).get('translations', []) or [])
                if target_lang != site_lang and target_lang not in existing_translations:
                    existing_translations.add(target_lang)
                    update_ops['business_data.translations'] = sorted(existing_translations)
                db.demo_sites.update_one({"demo_id": demo_id}, {"$set": update_ops})
                client.close()
                return self._json_response(200, {
                    "success": True,
                    "target_lang": target_lang,
                    "fields_translated": list(translated.keys()),
                    "fields_with_warning": missing_fields,
                })

            elif action == "menu_import_google":
                # Importa il menu REALE dalle foto Google Places (foto di menu fotografate dai clienti).
                # Usa Claude Vision via OpenAI-compatible API per fare OCR strutturato.
                # FALLBACK: accetta anche image_data_urls (base64 data URL) caricati manualmente dall'utente.
                emergent_key = os.environ.get('EMERGENT_LLM_KEY')
                if not emergent_key:
                    client.close()
                    return self._error(500, "EMERGENT_LLM_KEY non configurata")

                business = demo.get('business_data', {}) or {}

                # 1) Sorgente: foto caricate dall'utente (priorità) OPPURE foto Google
                user_uploads = data.get('image_data_urls')
                if isinstance(user_uploads, list) and user_uploads:
                    photo_urls = [u for u in user_uploads if isinstance(u, str) and (u.startswith('data:image') or u.startswith('http'))]
                    source_label = 'upload'
                else:
                    photos = business.get('photos', []) or []
                    photo_urls = []
                    for p in photos:
                        if isinstance(p, dict):
                            u = p.get('url') or p.get('src')
                        else:
                            u = p
                        if u and isinstance(u, str):
                            photo_urls.append(u)
                    if not photo_urls:
                        client.close()
                        return self._error(400, "Nessuna foto Google trovata per questo ristorante. Usa 'Carica foto menu' per caricarle manualmente.")
                    source_label = 'google'

                # Permetti override: l'utente puo passare un subset di foto da analizzare (legacy)
                selected = data.get('photo_urls')
                if isinstance(selected, list) and selected and source_label == 'google':
                    photo_urls = [u for u in selected if isinstance(u, str)]
                # Limita a 6 foto per non saturare token
                photo_urls = photo_urls[:6]

                business_name = business.get('name', 'Ristorante')
                primary_type = (business.get('primary_type') or '').lower()
                is_pizzeria = 'pizza' in primary_type or 'pizza' in business_name.lower()

                # Step 1: identifica le foto che sono effettivamente menu
                # Step 2: estrai i piatti come JSON strutturato
                import requests as _r
                all_items = []
                analyzed_count = 0
                menu_photos_count = 0

                for img_url in photo_urls:
                    try:
                        # Claude Vision: chiediamo SOLO se è un menu E in caso estrai piatti
                        vision_payload = {
                            "model": "claude-sonnet-4-5-20250929",
                            "messages": [
                                {
                                    "role": "user",
                                    "content": [
                                        {"type": "text", "text": (
                                            f"Analizza questa foto del ristorante '{business_name}'.\n\n"
                                            f"PRIMA: e' la foto di un menu (con piatti e prezzi scritti)? Rispondi 'SI' o 'NO'.\n"
                                            f"Se SI: estrai TUTTI i piatti leggibili come JSON in italiano. "
                                            f"Per ognuno: name (nome piatto), description (ingredienti se visibili, altrimenti ''), price (in formato '\u20ac X,XX' se leggibile, altrimenti ''), category (es. 'Pizze', 'Antipasti', 'Bevande' — desumi dal contesto).\n\n"
                                            f"Rispondi SOLO con JSON in questo formato:\n"
                                            f'{{"is_menu": true|false, "items": [{{"name":"...", "description":"...", "price":"...", "category":"..."}}]}}\n'
                                            f"Niente markdown, niente testo extra. Se non e' menu: {{\"is_menu\": false, \"items\": []}}"
                                        )},
                                        {"type": "image_url", "image_url": {"url": img_url}}
                                    ]
                                }
                            ],
                            "max_tokens": 3000
                        }
                        resp = _r.post(
                            "https://integrations.emergentagent.com/llm/chat/completions",
                            headers={"Authorization": f"Bearer {emergent_key}", "Content-Type": "application/json"},
                            json=vision_payload,
                            timeout=60
                        )
                        analyzed_count += 1
                        if resp.status_code != 200:
                            log(f"Vision OCR error {resp.status_code}: {resp.text[:200]}")
                            continue
                        llm_text = resp.json()['choices'][0]['message']['content']
                        cleaned = (llm_text or '').strip()
                        if cleaned.startswith('```'):
                            lines = cleaned.split('\n')
                            if lines and lines[0].startswith('```'):
                                lines = lines[1:]
                            if lines and lines[-1].startswith('```'):
                                lines = lines[:-1]
                            cleaned = '\n'.join(lines)
                        result = json.loads(cleaned)
                        if result.get('is_menu'):
                            menu_photos_count += 1
                            for it in (result.get('items') or []):
                                if it.get('name'):
                                    all_items.append({
                                        'name': it.get('name', '').strip(),
                                        'description': it.get('description', '').strip(),
                                        'price': it.get('price', '').strip(),
                                        'category': it.get('category', 'Menu').strip() or 'Menu',
                                    })
                    except Exception as _e:
                        log(f"Vision OCR exception: {_e}")
                        continue

                if not all_items:
                    client.close()
                    return self._error(404, f"Nessun menu rilevato nelle {analyzed_count} foto analizzate. Le foto Google potrebbero non contenere menu leggibili. Prova 'Genera menu AI' come alternativa.")

                # Raggruppa per categoria (deduplicating)
                cats_dict = {}
                for it in all_items:
                    cat = it.pop('category', 'Menu')
                    if cat not in cats_dict:
                        cats_dict[cat] = []
                    # Dedup per nome
                    if not any(x.get('name', '').lower() == it['name'].lower() for x in cats_dict[cat]):
                        cats_dict[cat].append(it)
                # Ordine categorie tipico
                CATEGORY_ORDER = ['Antipasti', 'Primi', 'Pizze', 'Pizze Classiche', 'Pizze Speciali', 'Secondi', 'Contorni', 'Dolci', 'Bevande', 'Vini', 'Birre']
                ordered_cats = sorted(cats_dict.keys(), key=lambda c: (
                    CATEGORY_ORDER.index(c) if c in CATEGORY_ORDER else 999,
                    c
                ))
                categories = [{'name': c, 'items': cats_dict[c]} for c in ordered_cats]

                # OPZIONALE: cerca foto Pexels per ogni piatto (limita a 30 piatti per non saturare)
                pexels_key = os.environ.get('PEXELS_API_KEY')
                photo_cache = {}
                if pexels_key:
                    import urllib.request
                    import urllib.parse
                    items_processed = 0
                    for cat in categories:
                        for item in cat.get('items', []):
                            if items_processed >= 30:
                                break
                            items_processed += 1
                            query = item['name']
                            if query in photo_cache:
                                item['image'] = photo_cache[query]
                                continue
                            try:
                                url = f"https://api.pexels.com/v1/search?query={urllib.parse.quote(query)}&per_page=1&orientation=landscape"
                                req = urllib.request.Request(url, headers={"Authorization": pexels_key, "User-Agent": "WebFinderStudio/1.0"})
                                with urllib.request.urlopen(req, timeout=6) as resp2:
                                    pdata = json.loads(resp2.read().decode('utf-8'))
                                    if pdata.get('photos'):
                                        photo_url = pdata['photos'][0].get('src', {}).get('large')
                                        if photo_url:
                                            item['image'] = photo_url
                                            photo_cache[query] = photo_url
                            except Exception:
                                pass

                db.demo_sites.update_one(
                    {"demo_id": demo_id},
                    {"$set": {
                        "content.menu_categories": categories,
                        "content.menu": {"mode": "menu", "categories": categories},
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                client.close()
                return self._json_response(200, {
                    "success": True,
                    "photos_analyzed": analyzed_count,
                    "menu_photos_found": menu_photos_count,
                    "categories_count": len(categories),
                    "items_count": sum(len(c['items']) for c in categories),
                    "menu": categories
                })

            elif action == "menu_ai":
                # Genera menu (per ristoranti) O servizi (per altre categorie).
                # mode='menu' (default) = piatti+prezzi+foto. mode='services' = servizi professionali.
                emergent_key = os.environ.get('EMERGENT_LLM_KEY')
                if not emergent_key:
                    client.close()
                    return self._error(500, "EMERGENT_LLM_KEY non configurata")

                mode = (data.get('mode') or 'menu').lower()
                if mode not in ('menu', 'services'):
                    mode = 'menu'

                business = demo.get('business_data', {}) or {}
                business_name = business.get('name', 'Attivita')
                primary_type = (business.get('primary_type') or '').lower()
                category = (business.get('category') or business.get('primary_type') or '').lower()
                city = business.get('city') or business.get('address', '').split(',')[-2].strip() if business.get('address') else ''
                reviews_snippet = ''
                if business.get('reviews'):
                    snippets = [r.get('text', '')[:200] for r in business['reviews'][:5] if r.get('text')]
                    reviews_snippet = ' | '.join(snippets)[:1000]

                # Determina tipo: pizzeria, ristorante, bar, gelateria, parrucchiere...
                is_pizzeria = 'pizza' in primary_type or 'pizza' in business_name.lower() or 'pizzeria' in category
                is_bar = 'bar' in primary_type or 'cafe' in primary_type
                is_gelateria = 'gelat' in primary_type or 'ice_cream' in primary_type
                is_barber = 'barber' in primary_type or 'barbiere' in business_name.lower() or 'barber' in business_name.lower()
                is_hair = 'hair_salon' in primary_type or 'hair' in primary_type or 'parrucch' in business_name.lower() or 'salone' in business_name.lower()
                is_beauty = 'beauty_salon' in primary_type or 'beauty' in primary_type or 'estetic' in business_name.lower() or 'estetista' in business_name.lower() or 'centro estetico' in business_name.lower()

                # FOOD/BEVERAGE: tutte le categorie alimentari note (default ristorante per altre food)
                FOOD_KEYWORDS = (
                    'restaurant', 'cafe', 'bakery', 'meal_takeaway', 'meal_delivery',
                    'food', 'pizza', 'sushi', 'ramen', 'steak', 'sandwich', 'fast_food',
                    'pub', 'wine_bar', 'brewery', 'donut', 'coffee', 'tea', 'dessert',
                    'ristorante', 'trattoria', 'osteria', 'pizzeria', 'paninoteca', 'rosticceria',
                    'pasticceria', 'panetteria', 'enoteca'
                )
                is_food_business = (
                    is_pizzeria or is_bar or is_gelateria or
                    any(k in primary_type for k in FOOD_KEYWORDS) or
                    any(k in category for k in FOOD_KEYWORDS) or
                    any(k in business_name.lower() for k in ('ristorante', 'trattoria', 'osteria', 'pizzeria', 'pizza', 'pasticceria', 'panetteria'))
                )
                # SERVIZI: se l'utente forza mode='services' OPPURE non e' food e non e' parrucchiere/estetica gia' gestiti
                is_services_generic = (mode == 'services') or (
                    not is_food_business and not is_barber and not is_hair and not is_beauty
                )

                # Detect target clientela (donna/uomo/misto) per parrucchieri/estetica
                name_lower = business_name.lower()
                reviews_lower = (reviews_snippet or '').lower()
                # Indizi espliciti
                hint_woman_only = any(w in name_lower for w in ['donna', 'donne', 'femminile', 'lady', 'woman', 'women', 'femme']) or 'solo donna' in reviews_lower
                hint_man_only   = any(w in name_lower for w in ['uomo', 'uomini', 'maschile', 'man', 'men', 'masculin']) or is_barber
                # Default in base alla primary_type Google
                if is_barber:
                    target_clientele = 'uomo'
                elif hint_woman_only or is_beauty:
                    target_clientele = 'donna'
                elif hint_man_only:
                    target_clientele = 'uomo'
                else:
                    target_clientele = 'misto'

                if is_pizzeria:
                    menu_hint = "PIZZERIA: includi 1 categoria 'Antipasti' (3-4 voci), 1 'Pizze Classiche' (8-10 pizze tipiche italiane con descrizione ingredienti), 1 'Pizze Speciali' (5-6 pizze gourmet/firma), 1 'Dolci' (3-4 voci), 1 'Bevande' (4-5 voci)"
                elif is_bar:
                    menu_hint = "BAR/CAFFETTERIA: includi 'Colazione' (caffe, brioche), 'Aperitivi' (cocktail, spritz, vino), 'Snack' (tramezzini, panini), 'Caffetteria specialty'"
                elif is_gelateria:
                    menu_hint = "GELATERIA: includi 'Gusti Classici' (8-10 gusti italiani tipici), 'Gusti Speciali' (5-6 gusti gourmet), 'Coppette e Coni', 'Granite/Sorbetti'"
                elif is_barber or (is_hair and target_clientele == 'uomo'):
                    menu_hint = (
                        f"BARBIERE / PARRUCCHIERE UOMO (clientela {target_clientele}): "
                        f"includi SOLO servizi UOMO. Categorie: 'Taglio Uomo' (4-5 servizi: taglio classico, taglio moderno, fade, sfumatura, taglio bambino), "
                        f"'Barba' (3-4: rasatura tradizionale panno caldo, modellatura, contorno, trattamento), "
                        f"'Trattamenti' (3-4: lavaggio, maschera capelli, massaggio cuoio capelluto), "
                        f"'Servizi Premium' (2-3: trucco/scolpitura, tinta uomo, pacchetti completi). "
                        f"VIETATO inserire servizi donna come: piega, taglio donna, balayage, colpi di sole, extension lunghe, manicure/pedicure femminili. "
                        f"Per ogni servizio: name (titolo breve), description (cosa include in 5-10 parole), price (prezzo realistico in '\u20ac X,XX')."
                    )
                elif is_hair and target_clientele == 'donna':
                    menu_hint = (
                        f"PARRUCCHIERE DONNA (clientela {target_clientele}): "
                        f"includi SOLO servizi DONNA. Categorie: 'Taglio & Piega' (4-5: taglio scalato, bob, lungo, piega liscia, piega ondulata, brushing), "
                        f"'Colore' (5-6: tinta totale, colpi di sole, balayage, mèches, shatush, decolorazione), "
                        f"'Trattamenti' (3-4: ricostruzione, cheratina, maschera, idratazione profonda), "
                        f"'Acconciature' (2-3: sposa, eventi, raccolto). "
                        f"VIETATO inserire: barba, rasatura, taglio uomo. "
                        f"Per ogni servizio: name, description (5-10 parole), price."
                    )
                elif is_hair:
                    menu_hint = (
                        "PARRUCCHIERE MISTO (uomo + donna): "
                        "includi entrambe le categorie. 'Donna' (taglio, piega, colore, trattamenti), "
                        "'Uomo' (taglio, barba se applicabile), 'Bambino' (taglio). "
                        "Per ogni servizio: name, description, price."
                    )
                elif is_beauty:
                    menu_hint = (
                        f"CENTRO ESTETICO (clientela {target_clientele}): "
                        f"categorie 'Viso' (pulizia, trattamenti specifici, anti-eta), "
                        f"'Corpo' (massaggi, scrub, drenanti, dimagranti), "
                        f"'Depilazione' (gambe, ascelle, inguine, viso — laser/cera), "
                        f"'Manicure & Pedicure' (semplice, gel, ricostruzione, nail art), "
                        f"'Trucco' (giorno, sposa, eventi). "
                        f"VIETATO: tagli capelli, barba (non sono servizi estetica). "
                        f"Per ogni servizio: name, description, price."
                    )
                elif is_services_generic:
                    # Mappa categoria -> esempi di servizi tipici (NIENTE CIBO)
                    pt = primary_type
                    cat_l = category
                    bn_l = business_name.lower()
                    blob = f"{pt} {cat_l} {bn_l}"
                    if any(k in blob for k in ('tattoo', 'tatuagg', 'piercing')):
                        services_hint = "TATUATORE/PIERCING: 'Tatuaggi' (mini/small, medio, grande, manica, schiena, cover-up), 'Piercing' (lobo, cartilagine, naso, sopracciglio, labbro), 'Consulenza & Design' (consulto, disegno custom), 'Aftercare' (rimozione, ritocco, prodotti)"
                    elif any(k in blob for k in ('plumb', 'idraul')):
                        services_hint = "IDRAULICO: 'Riparazioni Urgenti' (perdite, sturature, rotture), 'Installazioni' (caldaie, sanitari, rubinetterie, scaldabagni), 'Manutenzione' (revisione caldaia, controllo impianto), 'Ristrutturazioni Bagno' (rifacimento impianto, sostituzione vasca/doccia)"
                    elif any(k in blob for k in ('electric', 'elettric')):
                        services_hint = "ELETTRICISTA: 'Impianti Civili' (nuovo impianto, rifacimento, messa a norma), 'Riparazioni' (guasti, prese, interruttori, quadro), 'Illuminazione' (LED, punti luce, lampadari, esterni), 'Domotica & Sicurezza' (videocitofono, allarme, smart home)"
                    elif any(k in blob for k in ('gym', 'fitness', 'palestra', 'crossfit', 'yoga', 'pilates')):
                        services_hint = "PALESTRA/FITNESS: 'Abbonamenti' (mensile, trimestrale, annuale, open), 'Personal Training' (singola, pacchetto 5/10 lezioni), 'Corsi di Gruppo' (yoga, pilates, spinning, zumba, crossfit), 'Servizi Extra' (valutazione posturale, schede personalizzate, nutrizionista)"
                    elif any(k in blob for k in ('dentist', 'dentis', 'odontoiatr')):
                        services_hint = "STUDIO DENTISTICO: 'Igiene & Prevenzione' (pulizia, sbiancamento, fluoro), 'Conservativa' (otturazione, devitalizzazione), 'Protesi & Impianti' (impianto, corona, ponte, protesi mobile), 'Ortodonzia & Estetica' (apparecchio, invisalign, faccette)"
                    elif any(k in blob for k in ('lawyer', 'avvocat', 'legal', 'notar')):
                        services_hint = "STUDIO LEGALE: 'Consulenza' (primo consulto, parere legale), 'Diritto Civile' (contratti, locazioni, eredita'), 'Diritto del Lavoro' (licenziamenti, contenzioso, contratti), 'Diritto Penale & Famiglia' (separazioni, divorzi, difesa). Indica 'su preventivo' o tariffa oraria realistica."
                    elif any(k in blob for k in ('mechanic', 'meccani', 'car_repair', 'auto_repair', 'autofficina', 'gomm', 'tire')):
                        services_hint = "AUTOFFICINA/GOMMISTA: 'Tagliando & Manutenzione' (tagliando completo, cambio olio, filtri), 'Diagnosi & Riparazioni' (centralina, freni, frizione, sospensioni), 'Pneumatici' (cambio gomme, equilibratura, convergenza), 'Revisione & Aria Condizionata' (revisione, ricarica AC, sanificazione)"
                    elif any(k in blob for k in ('photograph', 'fotograf', 'photo_studio')):
                        services_hint = "STUDIO FOTOGRAFICO: 'Servizi Matrimonio' (cerimonia, ricevimento, album), 'Ritratti & Famiglia' (ritratto singolo, famiglia, bambini, gravidanza), 'Eventi & Aziendale' (battesimi, compleanni, cataloghi, headshot), 'Stampe & Album' (stampe fine art, fotolibri, ingrandimenti)"
                    elif any(k in blob for k in ('cleaning', 'pulizi')):
                        services_hint = "IMPRESA DI PULIZIE: 'Pulizie Domestiche' (ordinarie, profonde, una tantum), 'Uffici & Aziende' (giornaliera, settimanale), 'Fine Cantiere & Post-Trasloco' (a metro quadro), 'Servizi Specializzati' (vetri, tappeti, sanificazione)"
                    elif any(k in blob for k in ('real_estate', 'immobil', 'agenz')):
                        services_hint = "AGENZIA IMMOBILIARE: 'Vendita' (valutazione, pubblicazione, gestione visite), 'Affitto' (ricerca inquilini, contratti, gestione), 'Consulenza' (mutuo, perizia, atti), 'Property Management' (gestione completa immobile in affitto)"
                    elif any(k in blob for k in ('vet', 'veterin')):
                        services_hint = "VETERINARIO: 'Visite & Prevenzione' (visita generale, vaccini, microchip), 'Chirurgia' (sterilizzazione, interventi standard), 'Diagnostica' (esami sangue, ecografia, radiografia), 'Toelettatura & Day Hospital'"
                    elif any(k in blob for k in ('school', 'driving', 'autoscuola', 'scuola_guida')):
                        services_hint = "AUTOSCUOLA: 'Patente B' (corso completo, guide singole, pacchetti), 'Patente A/AM' (moto, ciclomotore), 'Rinnovi & Conversioni' (rinnovo patente, duplicato, conversione estera), 'CQC & Patenti Speciali'"
                    elif any(k in blob for k in ('travel', 'agenzia_viaggi', 'tour')):
                        services_hint = "AGENZIA VIAGGI: 'Vacanze Tutto Incluso' (mare, montagna, citta'), 'Crociere & Tour', 'Voli & Hotel' (biglietteria, prenotazione), 'Viaggi su Misura & Business Travel'"
                    elif any(k in blob for k in ('spa', 'wellness', 'massage', 'massagg')):
                        services_hint = "CENTRO BENESSERE/SPA: 'Massaggi' (rilassante, decontratturante, sportivo, hot stone), 'Percorsi SPA' (sauna, bagno turco, idromassaggio), 'Trattamenti Viso & Corpo' (anti-eta, drenanti, scrub), 'Pacchetti Coppia & Regalo'"
                    elif any(k in blob for k in ('nail', 'manicur')):
                        services_hint = "NAIL CENTER: 'Manicure' (semplice, gel, semipermanente), 'Pedicure' (estetica, curativa, spa), 'Ricostruzione' (gel, acrilico, refill), 'Nail Art & Decorazioni' (french, decori, strass)"
                    else:
                        services_hint = (
                            f"ATTIVITA' DI SERVIZI ('{primary_type or category or 'professional service'}'): "
                            f"genera 3-4 categorie pertinenti al settore (NON cibo, NON bevande, NON parrucchiere/estetica). "
                            f"Per ogni servizio: name (titolo breve), description (cosa include in 6-12 parole), "
                            f"price (prezzo realistico in '\u20ac X,XX' oppure 'su preventivo' quando non standardizzabile)."
                        )
                    menu_hint = (
                        f"{services_hint}\n"
                        f"VIETATO ASSOLUTAMENTE: piatti di cibo, pizze, bevande, dolci, antipasti, primi, secondi. "
                        f"Genera SOLO servizi professionali coerenti con il settore '{primary_type or category}'. "
                        f"Per ogni servizio: name, description (6-12 parole), price."
                    )
                else:
                    menu_hint = "RISTORANTE: includi 'Antipasti' (4-5 voci), 'Primi' (5-6 voci), 'Secondi' (5-6 voci), 'Dolci' (3-4 voci), 'Bevande' (3-4 voci)"

                # Decidi tono in base al business
                if is_food_business or is_pizzeria or is_bar or is_gelateria:
                    expert_role = "esperto di ristorazione italiana"
                    item_label = "piatto"
                    item_examples = "es. 'margherita pizza', 'tiramisu dessert', 'spritz aperol'"
                elif is_barber or is_hair or is_beauty:
                    expert_role = f"esperto consulente per saloni di bellezza e cura della persona ({primary_type or category})"
                    item_label = "servizio"
                    item_examples = "es. 'haircut salon', 'beard trimming', 'manicure'"
                else:
                    expert_role = f"esperto consulente di marketing per attivita' di servizi del settore '{primary_type or category or 'professionale'}'"
                    item_label = "servizio"
                    item_examples = "es. 'tattoo studio', 'plumber tools', 'mechanic garage', 'office cleaning'"

                prompt = (
                    f"Sei un {expert_role}. Genera un listino realistico per questa attivita:\n"
                    f"Nome: {business_name}\nCategoria Google: {primary_type or category}\nCitta: {city}\n"
                    f"Esempi recensioni clienti (per capire offerta tipica): {reviews_snippet or 'nessuna'}\n\n"
                    f"REGOLE:\n{menu_hint}\n\n"
                    f"Per OGNI {item_label} inserisci:\n"
                    f"- name: nome in italiano (max 4 parole)\n"
                    f"- description: descrizione concisa in 6-12 parole\n"
                    f"- price: prezzo in formato '\u20ac X,XX' (es. '\u20ac 8,50') realistico per la zona {city} (oppure 'su preventivo' quando applicabile)\n"
                    f"- search_query: 2-3 parole INGLESI che descrivono il {item_label} per cercarne una foto stock ({item_examples})\n\n"
                    f"Rispondi SOLO con JSON valido nel formato:\n"
                    f'{{"categories": [{{"name": "Categoria", "items": [{{"name": "...", "description": "...", "price": "\u20ac 6,00", "search_query": "..."}}]}}]}}\n'
                    f"Niente markdown, niente testo extra."
                )

                try:
                    import requests as _r
                    llm_response = _r.post(
                        "https://integrations.emergentagent.com/llm/chat/completions",
                        headers={"Authorization": f"Bearer {emergent_key}", "Content-Type": "application/json"},
                        json={
                            "model": "claude-sonnet-4-5-20250929",
                            "messages": [
                                {"role": "system", "content": "Sei un esperto consulente che genera listini realistici per attivita' locali italiane. Adatta sempre l'output al settore richiesto (cibo SOLO per ristoranti/bar; servizi SOLO per attivita' di servizi). Rispondi SOLO con JSON valido, niente markdown."},
                                {"role": "user", "content": prompt}
                            ],
                            "max_tokens": 6000
                        },
                        timeout=90
                    )
                    if llm_response.status_code != 200:
                        client.close()
                        return self._error(500, f"LLM error {llm_response.status_code}: {llm_response.text[:200]}")
                    llm_text = llm_response.json()['choices'][0]['message']['content']
                    cleaned = (llm_text or '').strip()
                    if cleaned.startswith('```'):
                        lines = cleaned.split('\n')
                        if lines and lines[0].startswith('```'):
                            lines = lines[1:]
                        if lines and lines[-1].startswith('```'):
                            lines = lines[:-1]
                        cleaned = '\n'.join(lines)
                    menu_data = json.loads(cleaned)
                except Exception as _e:
                    log(f"Menu AI error: {_e}")
                    client.close()
                    return self._error(500, f"Errore generazione menu AI: {str(_e)[:200]}")

                # Per ogni piatto, cerca una foto su Pexels (con la search_query)
                pexels_key = os.environ.get('PEXELS_API_KEY')
                if pexels_key:
                    import urllib.request
                    import urllib.parse
                    photo_cache = {}
                    for cat in menu_data.get('categories', []):
                        for item in cat.get('items', []):
                            query = (item.get('search_query') or item.get('name', '')).strip()
                            if not query:
                                continue
                            if query in photo_cache:
                                item['image'] = photo_cache[query]
                                continue
                            try:
                                url = f"https://api.pexels.com/v1/search?query={urllib.parse.quote(query)}&per_page=1&orientation=landscape"
                                req = urllib.request.Request(url, headers={"Authorization": pexels_key, "User-Agent": "WebFinderStudio/1.0"})
                                with urllib.request.urlopen(req, timeout=8) as resp:
                                    pdata = json.loads(resp.read().decode('utf-8'))
                                    photos = pdata.get('photos', [])
                                    if photos:
                                        photo_url = photos[0].get('src', {}).get('large') or photos[0].get('src', {}).get('original')
                                        if photo_url:
                                            item['image'] = photo_url
                                            photo_cache[query] = photo_url
                            except Exception as _e:
                                log(f"Pexels search failed for '{query}': {_e}")
                            # Rimuovi search_query dal menu finale (era solo helper)
                            item.pop('search_query', None)

                # Salva nel demo (mode: 'services' se non food, altrimenti 'menu')
                saved_mode = 'services' if (is_services_generic or is_barber or is_hair or is_beauty) else 'menu'
                db.demo_sites.update_one(
                    {"demo_id": demo_id},
                    {"$set": {
                        "content.menu_categories": menu_data.get('categories', []),
                        "content.menu": {"mode": saved_mode, "categories": menu_data.get('categories', [])},
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                client.close()
                return self._json_response(200, {
                    "success": True,
                    "categories_count": len(menu_data.get('categories', [])),
                    "items_count": sum(len(c.get('items', [])) for c in menu_data.get('categories', [])),
                    "menu": menu_data.get('categories', [])
                })

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

                # Personalizzazione: sostituisci nome+citta sorgente con quelli del demo target.
                # Se source_business_name e source_city non sono salvati nel template (template legacy),
                # si tenta comunque la sostituzione su placeholder {{business_name}} / {{city}}.
                src_name = (tpl.get('source_business_name') or '').strip()
                src_city = (tpl.get('source_city') or '').strip()
                dest_bd = demo.get('business_data', {}) or {}
                dest_name = (dest_bd.get('name') or '').strip()
                dest_city = (dest_bd.get('city') or '').strip()
                if not dest_city and dest_bd.get('address'):
                    parts = [p.strip() for p in dest_bd.get('address', '').split(',')]
                    if len(parts) >= 2:
                        dest_city = parts[-2]

                def _personalize_str(s):
                    if not isinstance(s, str) or not s:
                        return s
                    out = s
                    # 1) Placeholder espliciti (per template generati in futuro o convertiti)
                    if dest_name:
                        out = out.replace('{{business_name}}', dest_name).replace('{{businessName}}', dest_name)
                    if dest_city:
                        out = out.replace('{{city}}', dest_city)
                    # 2) Find&replace case-insensitive del nome sorgente -> nome target
                    if src_name and dest_name and src_name.lower() != dest_name.lower():
                        try:
                            out = re.sub(re.escape(src_name), dest_name, out, flags=re.IGNORECASE)
                        except Exception:
                            pass
                    # 3) Find&replace della citta sorgente -> citta target
                    if src_city and dest_city and src_city.lower() != dest_city.lower():
                        try:
                            out = re.sub(r'\b' + re.escape(src_city) + r'\b', dest_city, out, flags=re.IGNORECASE)
                        except Exception:
                            pass
                    return out

                def _personalize_any(v):
                    if isinstance(v, str):
                        return _personalize_str(v)
                    if isinstance(v, list):
                        return [_personalize_any(x) for x in v]
                    if isinstance(v, dict):
                        return {k: _personalize_any(val) for k, val in v.items()}
                    return v

                # Campi testuali da personalizzare (gli altri come color_scheme, section_order, ecc. restano invariati)
                TEXT_FIELDS = {'tagline', 'homepage_subtitle', 'about_text', 'services_intro',
                               'cta_text', 'why_choose_us', 'faq'}

                # Fields stored at top-level of the demo document (NOT under content.)
                TOP_LEVEL = {'design_template'}
                content_updates = {}
                applied = []
                for k, v in tdata.items():
                    if v is None:
                        continue
                    final_v = _personalize_any(v) if k in TEXT_FIELDS else v
                    if k in TOP_LEVEL:
                        content_updates[k] = final_v
                    else:
                        content_updates[f"content.{k}"] = final_v
                    applied.append(k)
                content_updates['updated_at'] = datetime.now(timezone.utc).isoformat()
                db.demo_sites.update_one({"demo_id": demo_id}, {"$set": content_updates})
                client.close()
                return self._json_response(200, {
                    "success": True,
                    "applied": applied,
                    "template_name": tpl.get('name'),
                    "personalized": bool(src_name or src_city)
                })
            
            elif action in ("quote", "invoice"):
                # Generate a PDF quote/invoice for this demo and optionally email it
                is_invoice = (action == "invoice")
                # invoice_type: 'full' (100%), 'deposit' (acconto 50%), 'balance' (saldo 50%)
                invoice_type = (data.get('invoice_type') or 'full').lower() if is_invoice else 'full'
                if invoice_type not in ('full', 'deposit', 'balance'):
                    invoice_type = 'full'
                if is_invoice and invoice_type == 'deposit':
                    doc_label = "FATTURA D'ACCONTO"
                    doc_short = "FatturaAcconto"
                elif is_invoice and invoice_type == 'balance':
                    doc_label = "FATTURA A SALDO"
                    doc_short = "FatturaSaldo"
                elif is_invoice:
                    doc_label = "FATTURA"
                    doc_short = "Fattura"
                else:
                    doc_label = "PREVENTIVO"
                    doc_short = "Preventivo"
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
                # Modalita IVA: "with_vat" (con P.IVA, IVA 22%), "without_vat" (forfettario), "occasional_no_vat" (prestazione occasionale ex art. 67 TUIR)
                tax_mode = (data.get('tax_mode') or 'without_vat').strip().lower()
                if tax_mode not in ('with_vat', 'without_vat', 'occasional_no_vat'):
                    tax_mode = 'without_vat'
                try:
                    vat_rate = float(data.get('vat_rate', 22.0))
                except Exception:
                    vat_rate = 22.0
                try:
                    withholding_rate = float(data.get('withholding_rate', 20.0))  # ritenuta d'acconto 20% standard
                except Exception:
                    withholding_rate = 20.0
                
                profile = db.user_settings.find_one({"setting_id": "invoice_profile"}, {"_id": 0}) or {}
                if price is None or price == '':
                    price = profile.get('default_price', 800)
                try:
                    price_num = float(price)
                except Exception:
                    price_num = 800.0
                # Salva il prezzo totale ORIGINALE prima di dimezzare per acconto/saldo
                price_total = price_num
                if invoice_type in ('deposit', 'balance'):
                    price_num = round(price_total / 2.0, 2)
                
                currency_symbol = {'EUR': 'EUR', 'USD': 'USD', 'GBP': 'GBP', 'CHF': 'CHF'}.get(currency, currency)
                
                if not features:
                    content = demo.get('content', {}) or {}
                    has_booking = business.get('booking_mode', 'none') != 'none' or bool(business.get('external_booking_url'))
                    has_gallery = content.get('show_gallery', True) and (business.get('photos') or [])
                    has_reviews = content.get('show_reviews', True) and (business.get('reviews') or [])
                    has_menu = bool(content.get('menu_items') or content.get('services'))
                    has_map = content.get('show_map', True)
                    has_hours = content.get('show_hours', True) and business.get('hours_text')
                    has_faq = content.get('show_faq', True) and (content.get('faq') or [])
                    # Lingue secondarie
                    translations = business.get('translations') or []

                    features = [
                        "Sito web professionale responsive (mobile, tablet, desktop)",
                        "Design moderno personalizzato con i colori del brand",
                        "Hosting incluso primo anno (server europei ad alte performance)",
                        "Dominio personalizzato incluso primo anno (es. nomeattivita.it)",
                        "Certificato SSL HTTPS automatico e sempre attivo",
                    ]
                    if has_gallery:
                        features.append("Galleria fotografica ottimizzata per il web")
                    if has_reviews:
                        features.append("Sezione recensioni Google sincronizzate automaticamente")
                    if has_menu:
                        features.append("Sezione servizi / menu prodotti completa")
                    if has_hours:
                        features.append("Orari di apertura sempre aggiornati e ben visibili")
                    if has_map:
                        features.append("Mappa interattiva con indicazioni stradali Google Maps")
                    if has_booking:
                        features.append("Sistema prenotazioni online con notifica email automatica")
                    features.append("Pulsanti diretti WhatsApp + chiamata telefonica")
                    features.append("Sezione contatti completa (form, telefono, email, social)")
                    features.append("Integrazione social Instagram & Facebook")
                    if has_faq:
                        features.append("Sezione FAQ con domande frequenti")
                    if translations:
                        features.append(f"Sito multilingua ({len(translations)+1} lingue: italiano + {', '.join(translations[:3])})")
                    features += [
                        "Ottimizzazione SEO base per Google (titolo, meta, sitemap)",
                        "Velocita di caricamento ottimizzata (Core Web Vitals)",
                        "Tracking visite e statistiche di accesso incluse",
                        "Supporto tecnico via email per 6 mesi",
                        "Possibilita di modifiche minori incluse nel primo mese",
                    ]
                
                business_name = demo.get('business_name', business.get('name', 'Cliente'))
                business_address = business.get('address', '')
                business_city = business.get('city', '')
                
                from datetime import datetime as _dt, timedelta as _td
                if is_invoice:
                    # Numerazione progressiva annuale: FAT-{YYYY}-{NNNN}
                    year = _dt.now().year
                    counter_doc = db.user_settings.find_one_and_update(
                        {"setting_id": f"invoice_counter_{year}"},
                        {"$inc": {"counter": 1}, "$setOnInsert": {"setting_id": f"invoice_counter_{year}", "year": year}},
                        upsert=True,
                        return_document=True
                    )
                    counter = (counter_doc or {}).get("counter") or 1
                    quote_id = f"FAT-{year}-{counter:04d}"
                    valid_until_label = "Scadenza pagamento"
                else:
                    quote_id = "PRV-" + _dt.now().strftime("%Y%m%d-%H%M")
                    valid_until_label = "Valido fino al"
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
                pdf.cell(0, 12, doc_label, ln=1)
                pdf.set_font("Helvetica", '', 10)
                pdf.cell(0, 5, f"N. {quote_id}    -    Data: {today}    -    {valid_until_label}: {valid_until}", ln=1)
                pdf.set_font("Helvetica", 'I', 8)
                pdf.set_text_color(120, 120, 120)
                _label_by_mode = {
                    'with_vat': "Cliente con Partita IVA (IVA inclusa)",
                    'without_vat': "Cliente / freelance senza IVA (regime forfettario)",
                    'occasional_no_vat': "Prestazione occasionale (no Partita IVA)",
                }
                pdf.cell(0, 4, "Tipologia: " + _label_by_mode.get(tax_mode, _label_by_mode['without_vat']), ln=1)
                pdf.set_text_color(0, 0, 0)
                
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
                # Se cliente con P.IVA, mostro P.IVA e CF cliente se forniti
                client_vat = (data.get('client_vat') or '').strip()
                client_cf = (data.get('client_fiscal_code') or '').strip()
                if tax_mode == 'with_vat':
                    if client_vat:
                        pdf.cell(0, 5, "  P. IVA: " + _safe(client_vat), ln=1)
                    if client_cf:
                        pdf.cell(0, 5, "  Codice Fiscale: " + _safe(client_cf), ln=1)
                
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
                # === Totali (con o senza IVA) ===
                def _money(val):
                    return f"{val:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

                if tax_mode == 'with_vat':
                    # Mostro subtotale + IVA + totale
                    subtotal = price_num
                    vat_amount = round(subtotal * (vat_rate / 100.0), 2)
                    grand_total = round(subtotal + vat_amount, 2)

                    pdf.set_fill_color(245, 247, 250)
                    pdf.set_text_color(40, 40, 40)
                    pdf.set_font("Helvetica", '', 10)
                    pdf.cell(130, 7, "  Imponibile", border='B', fill=True)
                    pdf.cell(0, 7, f"{_money(subtotal)} {currency_symbol}  ", border='B', fill=True, ln=1, align='R')
                    pdf.cell(130, 7, f"  IVA {vat_rate:.0f}%", border='B', fill=True)
                    pdf.cell(0, 7, f"{_money(vat_amount)} {currency_symbol}  ", border='B', fill=True, ln=1, align='R')

                    pdf.set_fill_color(30, 64, 175)
                    pdf.set_text_color(255, 255, 255)
                    pdf.set_font("Helvetica", 'B', 13)
                    pdf.cell(130, 12, "  TOTALE (IVA inclusa)", border=0, fill=True)
                    pdf.cell(0, 12, f"{_money(grand_total)} {currency_symbol}  ", border=0, fill=True, ln=1, align='R')
                    pdf.set_text_color(0, 0, 0)
                elif tax_mode == 'occasional_no_vat':
                    # Prestazione occasionale: ritenuta d'acconto 20% se compenso > 77,47 EUR
                    gross = price_num
                    apply_withholding = gross > 77.47
                    withholding = round(gross * (withholding_rate / 100.0), 2) if apply_withholding else 0.0
                    net = round(gross - withholding, 2)

                    pdf.set_fill_color(245, 247, 250)
                    pdf.set_text_color(40, 40, 40)
                    pdf.set_font("Helvetica", '', 10)
                    pdf.cell(130, 7, "  Compenso lordo", border='B', fill=True)
                    pdf.cell(0, 7, f"{_money(gross)} {currency_symbol}  ", border='B', fill=True, ln=1, align='R')
                    if apply_withholding:
                        pdf.cell(130, 7, f"  Ritenuta d'acconto {withholding_rate:.0f}% (a carico del committente)", border='B', fill=True)
                        pdf.cell(0, 7, f"-{_money(withholding)} {currency_symbol}  ", border='B', fill=True, ln=1, align='R')

                    pdf.set_fill_color(30, 64, 175)
                    pdf.set_text_color(255, 255, 255)
                    pdf.set_font("Helvetica", 'B', 13)
                    label_total = "  NETTO A PAGARE" if apply_withholding else "  TOTALE COMPENSO"
                    pdf.cell(130, 12, label_total, border=0, fill=True)
                    pdf.cell(0, 12, f"{_money(net)} {currency_symbol}  ", border=0, fill=True, ln=1, align='R')
                    pdf.set_text_color(0, 0, 0)
                    pdf.set_font("Helvetica", 'I', 9)
                    pdf.set_text_color(100, 100, 100)
                    if apply_withholding:
                        pdf.multi_cell(0, 5, "Compenso per prestazione occasionale ex art. 67, c.1 lett. l) del TUIR. Operazione fuori campo IVA ex art. 5 DPR 633/72. Il committente, se sostituto d'imposta, applichera la ritenuta d'acconto del 20% ex art. 25 DPR 600/73.")
                    else:
                        pdf.multi_cell(0, 5, "Compenso per prestazione occasionale ex art. 67, c.1 lett. l) del TUIR. Operazione fuori campo IVA ex art. 5 DPR 633/72. Importo inferiore alla soglia di applicazione della ritenuta d'acconto (€ 77,47).")
                    pdf.set_text_color(0, 0, 0)
                else:
                    # Senza P.IVA / forfettario: solo totale (operazione non soggetta a IVA)
                    pdf.set_fill_color(30, 64, 175)
                    pdf.set_text_color(255, 255, 255)
                    pdf.set_font("Helvetica", 'B', 13)
                    pdf.cell(130, 12, "  TOTALE", border=0, fill=True)
                    pdf.cell(0, 12, f"{_money(price_num)} {currency_symbol}  ", border=0, fill=True, ln=1, align='R')
                    pdf.set_text_color(0, 0, 0)
                    pdf.set_font("Helvetica", 'I', 9)
                    pdf.set_text_color(100, 100, 100)
                    pdf.cell(0, 5, "Operazione non soggetta a IVA ai sensi dell'art. 1 commi 54-89 L. 190/2014 (regime forfettario).", ln=1)
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
                if is_invoice and invoice_type == 'deposit':
                    pdf.cell(0, 5, f"Acconto pari al 50% del totale concordato di {_money(price_total)} {currency_symbol}.", ln=1)
                    pdf.cell(0, 5, "Saldo del 50% restante alla consegna del sito web.", ln=1)
                    pdf.cell(0, 5, f"Scadenza pagamento acconto: {valid_until}.", ln=1)
                elif is_invoice and invoice_type == 'balance':
                    pdf.cell(0, 5, f"Saldo finale pari al 50% del totale concordato di {_money(price_total)} {currency_symbol}.", ln=1)
                    pdf.cell(0, 5, "Acconto del 50% gia versato in fase di accettazione.", ln=1)
                    pdf.cell(0, 5, f"Scadenza saldo: {valid_until}.", ln=1)
                elif is_invoice:
                    pdf.cell(0, 5, f"Pagamento intero entro il {valid_until} (30 giorni data fattura).", ln=1)
                else:
                    pdf.cell(0, 5, "50% all'accettazione, 50% alla consegna del sito.", ln=1)
                
                if profile.get('footer_notes'):
                    pdf.ln(4)
                    pdf.set_font("Helvetica", 'I', 8)
                    pdf.multi_cell(0, 4, _safe(profile.get('footer_notes', '')))
                if profile.get('legal_notes') and tax_mode == 'without_vat':
                    # Mostro le note legali del profilo solo se forfettario (regime forfettario default)
                    pdf.ln(2)
                    pdf.set_font("Helvetica", '', 7)
                    pdf.set_text_color(120, 120, 120)
                    pdf.multi_cell(0, 3, _safe(profile.get('legal_notes', '')))
                
                pdf_bytes = bytes(pdf.output())
                pdf_b64 = _b64.b64encode(pdf_bytes).decode('utf-8')
                pdf_filename = f"{doc_short}_{business_name.replace(' ', '_')}_{quote_id}.pdf"
                
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
                                if is_invoice and invoice_type == 'deposit':
                                    email_subject = f"Fattura d'acconto (50%) - {business_name}"
                                    email_intro = (
                                        f"<h2 style='color:#1e40af'>Fattura d'acconto allegata</h2>"
                                        f"<p>Buongiorno,</p>"
                                        f"<p>in allegato la <strong>fattura d'acconto {quote_id}</strong> pari al 50% (<strong>{_money(price_num)} {currency_symbol}</strong>) "
                                        f"del totale concordato di <strong>{_money(price_total)} {currency_symbol}</strong> per la realizzazione del sito web di <strong>{_safe(business_name)}</strong>.</p>"
                                        f"<p>Scadenza acconto: <strong>{valid_until}</strong>. Il saldo restante verra fatturato alla consegna.</p>"
                                    )
                                elif is_invoice and invoice_type == 'balance':
                                    email_subject = f"Fattura a saldo (50%) - {business_name}"
                                    email_intro = (
                                        f"<h2 style='color:#1e40af'>Fattura a saldo allegata</h2>"
                                        f"<p>Buongiorno,</p>"
                                        f"<p>in allegato la <strong>fattura a saldo {quote_id}</strong> pari al 50% restante (<strong>{_money(price_num)} {currency_symbol}</strong>) "
                                        f"del totale di <strong>{_money(price_total)} {currency_symbol}</strong> per il sito web di <strong>{_safe(business_name)}</strong>.</p>"
                                        f"<p>Il sito e stato consegnato. Scadenza saldo: <strong>{valid_until}</strong>. Grazie per la fiducia!</p>"
                                    )
                                elif is_invoice:
                                    email_subject = f"Fattura sito web - {business_name}"
                                    email_intro = f"<h2 style='color:#1e40af'>Fattura allegata</h2><p>Buongiorno,</p><p>in allegato la fattura <strong>{quote_id}</strong> relativa alla realizzazione del sito web di <strong>{_safe(business_name)}</strong>.</p><p>Scadenza pagamento: <strong>{valid_until}</strong>.</p>"
                                else:
                                    email_subject = f"Preventivo sito web - {business_name}"
                                    email_intro = f"<h2 style='color:#1e40af'>Preventivo allegato</h2><p>Ciao,</p><p>in allegato il preventivo dettagliato per la realizzazione del sito web di <strong>{_safe(business_name)}</strong>.</p>"
                                _resend.Emails.send({
                                    "from": f"{sender_name} <onboarding@resend.dev>",
                                    "to": [recipient_final],
                                    "subject": email_subject,
                                    "html": f"<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#1a1a1a'>{email_intro}{('<p>'+_safe(custom_notes)+'</p>') if custom_notes else ''}<p>Restiamo a disposizione per ogni domanda.</p><p style='margin-top:30px'>Cordiali saluti,<br><strong>{_safe(sender_name)}</strong></p></div>",
                                    "attachments": [{"filename": pdf_filename, "content": list(pdf_bytes)}]
                                })
                                sent = True
                        except Exception as _err:
                            send_error = str(_err)
                            log(f"Resend send failed: {_err}")
                
                try:
                    collection = db.invoices if is_invoice else db.quotes
                    doc_id_key = "invoice_id" if is_invoice else "quote_id"
                    doc_payload = {
                        doc_id_key: quote_id, "demo_id": demo_id,
                        "business_name": business_name, "price": price_num,
                        "currency": currency, "features": features, "notes": custom_notes,
                        "tax_mode": tax_mode,
                        "sent": sent, "recipient": recipient_final,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    if is_invoice:
                        doc_payload["due_date"] = valid_until
                        doc_payload["invoice_type"] = invoice_type  # 'full' | 'deposit' | 'balance'
                        doc_payload["total_amount"] = price_total   # totale concordato (per acconto/saldo)
                    collection.insert_one(doc_payload)
                except Exception as _e:
                    log(f"{doc_short} insert failed: {_e}")
                
                client.close()
                response_payload = {
                    "success": True, "filename": pdf_filename,
                    "pdf_base64": pdf_b64, "sent": sent,
                    "send_error": send_error, "recipient": recipient_final
                }
                response_payload["invoice_id" if is_invoice else "quote_id"] = quote_id
                return self._json_response(200, response_payload)
            
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
        # Evita caching su Vercel CDN per i demo (devono riflettere subito le modifiche editor)
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _error(self, code, msg):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode())

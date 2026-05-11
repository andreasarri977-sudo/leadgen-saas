# /api/leads.py - List Leads
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import traceback
from urllib.parse import parse_qs, urlparse
import urllib.request

# Logging
def log(msg):
    print(f"[LEADS] {msg}", file=sys.stderr, flush=True)

log("=== Cold start ===")

# Import pymongo
try:
    from pymongo import MongoClient
    log("pymongo OK")
except ImportError as e:
    log(f"pymongo FAILED: {e}")
    MongoClient = None

# Env vars: try MONGO_URL first, then URL_MONGO
MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("URL_MONGO")
DB_NAME = os.environ.get("DB_NAME", "leadhunter")
GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY")

def _load_default_logo():
    """Load the default WebFinder Studio logo as base64 string."""
    try:
        # Try multiple paths (local dev + Vercel bundled)
        here = os.path.dirname(os.path.abspath(__file__))
        candidates = [
            os.path.join(here, "assets_logo.b64"),
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

DEFAULT_INVOICE_PROFILE = {
    "company_name": "WebFinder Studio",
    "vat_number": "",
    "tax_code": "",
    "address": "",
    "city": "",
    "postal_code": "",
    "country": "Italia",
    "phone": "",
    "email": "",
    "website": "",
    "iban": "",
    "logo_base64": DEFAULT_LOGO_B64,
    "default_price": 800,
    "default_currency": "EUR",
    "footer_notes": "Grazie per la fiducia.",
    "legal_notes": "Preventivo valido 30 giorni dalla data di emissione. Prezzi IVA esclusa salvo regime forfettario."
}

def get_place_details(place_id, api_key, country='Italia'):
    """Fetch detailed info from Google Places API with language based on country"""
    if not place_id or not api_key:
        return {}
    
    # Map country to language code
    country_lang_map = {
        'Italia': 'it', 'Italy': 'it', 'IT': 'it',
        'Francia': 'fr', 'France': 'fr', 'FR': 'fr',
        'Spagna': 'es', 'Spain': 'es', 'España': 'es', 'ES': 'es',
        'Germania': 'de', 'Germany': 'de', 'Deutschland': 'de', 'DE': 'de',
        'Regno Unito': 'en', 'United Kingdom': 'en', 'UK': 'en', 'GB': 'en',
        'Stati Uniti': 'en', 'United States': 'en', 'USA': 'en', 'US': 'en',
        'Portogallo': 'pt', 'Portugal': 'pt', 'PT': 'pt',
        'Paesi Bassi': 'nl', 'Netherlands': 'nl', 'NL': 'nl',
        'Austria': 'de', 'AT': 'de',
        'Svizzera': 'de', 'Switzerland': 'de', 'CH': 'de',
        'Belgio': 'fr', 'Belgium': 'fr', 'BE': 'fr'
    }
    
    lang_code = country_lang_map.get(country, 'it')
    
    try:
        url = f"https://places.googleapis.com/v1/places/{place_id}?languageCode={lang_code}"
        headers = {
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "id,displayName,formattedAddress,location,rating,userRatingCount,regularOpeningHours,photos,reviews,websiteUri,nationalPhoneNumber,googleMapsUri"
        }
        
        req = urllib.request.Request(url, headers=headers, method='GET')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        result = {}
        result['site_language'] = lang_code
        
        # Parse hours
        if 'regularOpeningHours' in data:
            hours = data['regularOpeningHours']
            result['hours_text'] = hours.get('weekdayDescriptions', [])
        
        # Parse photos (max 10)
        if 'photos' in data:
            photos = []
            for photo in data['photos'][:10]:
                photo_name = photo.get('name', '')
                if photo_name:
                    photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=800&maxWidthPx=800&key={api_key}"
                    photos.append({"url": photo_url})
            result['photos'] = photos
        
        # Parse reviews - get more reviews and sort by newest (publishTime)
        if 'reviews' in data:
            reviews_raw = data['reviews']
            
            # Sort by publish time if available (most recent first)
            # Google returns reviews with 'publishTime' field
            sorted_reviews = sorted(
                reviews_raw, 
                key=lambda r: r.get('publishTime', '1970-01-01'), 
                reverse=True
            )
            
            reviews = []
            for review in sorted_reviews[:6]:  # Get top 6 most recent
                text_obj = review.get('text', {})
                review_text = text_obj.get('text', '') if isinstance(text_obj, dict) else str(text_obj)
                
                # Get relative time in the requested language
                relative_time = review.get('relativePublishTimeDescription', '')
                
                reviews.append({
                    "author": review.get('authorAttribution', {}).get('displayName', 'Anonimo'),
                    "rating": review.get('rating', 5),
                    "text": review_text,
                    "time": relative_time,
                    "publish_time": review.get('publishTime', '')
                })
            result['reviews'] = reviews
        
        # Google Maps link
        if 'googleMapsUri' in data:
            result['google_maps_link'] = data['googleMapsUri']
        
        log(f"Place details fetched ({lang_code}): {len(result.get('photos', []))} photos, {len(result.get('reviews', []))} reviews")
        return result
        
    except Exception as e:
        log(f"Place details error: {e}")
        return {}

log(f"MONGO_URL set: {bool(MONGO_URL)}")
log(f"DB_NAME: {DB_NAME}")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_PATCH(self):
        """PATCH /api/leads/{lead_id} - update lead fields (status, last_contact_at, etc)"""
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        try:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            # 1) Try query string first (Vercel rewrite passes lead_id as query)
            params = parse_qs(parsed.query)
            lead_id = (params.get("lead_id", [None])[0])
            # 2) Fallback: parse from path /api/leads/{id}
            if not lead_id:
                parts = [p for p in parsed.path.split('/') if p]
                if len(parts) >= 2 and parts[-2] == 'leads':
                    lead_id = parts[-1]
            if not lead_id:
                return self._error(400, f"lead_id mancante (path={parsed.path})")
            
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            allowed = ['status', 'name', 'phone', 'email', 'notes', 'last_contact_at',
                       'booking_mode', 'external_booking_url', 'site_language', 'category', 'city']
            update_data = {k: data.get(k) for k in allowed if k in data}
            if not update_data:
                return self._error(400, "Nessun campo aggiornabile fornito")
            
            from datetime import datetime, timezone
            update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
            
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            result = db.leads.update_one(
                {"lead_id": lead_id},
                {"$set": update_data}
            )
            client.close()
            
            if result.matched_count == 0:
                return self._error(404, "Lead non trovato")
            
            return self._json_response(200, {"success": True, "updated": list(update_data.keys())})
        except Exception as e:
            log(f"PATCH error: {e}")
            return self._error(500, str(e))
    
    def do_POST(self):
        """Save a new lead to the database with enriched data from Google Places"""
        log(f"POST {self.path}")
        
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            log(f"Saving lead: {data.get('name', 'unknown')}")
            
            # Handle user_settings save action
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            action = params.get("action", [None])[0]
            
            if action == "user_settings":
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
                db = client[DB_NAME]
                # Single profile doc per app (single-user SaaS)
                allowed = ['company_name', 'vat_number', 'tax_code', 'address', 'city',
                           'postal_code', 'country', 'phone', 'email', 'website',
                           'iban', 'logo_base64', 'default_price', 'default_currency',
                           'footer_notes', 'legal_notes']
                update_data = {k: data.get(k) for k in allowed if k in data}
                from datetime import datetime, timezone
                update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
                db.user_settings.update_one(
                    {"setting_id": "invoice_profile"},
                    {"$set": update_data, "$setOnInsert": {"setting_id": "invoice_profile"}},
                    upsert=True
                )
                client.close()
                return self._json_response(200, {"success": True, "message": "Dati salvati"})

            if action == "mark_contacted":
                # Mark a single lead as contacted (just stamp last_contact_at)
                lead_id = data.get('lead_id')
                if not lead_id:
                    return self._error(400, "lead_id richiesto")
                from datetime import datetime, timezone
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
                db = client[DB_NAME]
                db.leads.update_one(
                    {"lead_id": lead_id},
                    {"$set": {"last_contact_at": datetime.now(timezone.utc).isoformat(), "status": "contattato"}}
                )
                client.close()
                return self._json_response(200, {"success": True})

            if action == "update_lead":
                # POST-based update (works around Vercel routing issues with PATCH /api/leads/{id})
                lead_id = data.get('lead_id')
                if not lead_id:
                    return self._error(400, "lead_id richiesto")
                allowed = ['status', 'name', 'phone', 'email', 'notes', 'last_contact_at',
                           'booking_mode', 'external_booking_url', 'site_language', 'category', 'city']
                update_data = {k: data.get(k) for k in allowed if k in data}
                if not update_data:
                    return self._error(400, "Nessun campo aggiornabile")
                from datetime import datetime, timezone
                update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
                db = client[DB_NAME]
                result = db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
                client.close()
                if result.matched_count == 0:
                    return self._error(404, "Lead non trovato")
                return self._json_response(200, {"success": True, "updated": list(update_data.keys())})

            if action == "delete_lead":
                lead_id = data.get('lead_id')
                if not lead_id:
                    return self._error(400, "lead_id richiesto")
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
                db = client[DB_NAME]
                db.leads.delete_one({"lead_id": lead_id})
                demo = db.demo_sites.find_one({"lead_id": lead_id})
                if demo:
                    demo_id_d = demo.get("demo_id")
                    db.demo_sites.delete_one({"lead_id": lead_id})
                    db.bookings.delete_many({"demo_id": demo_id_d})
                    db.demo_views.delete_many({"demo_id": demo_id_d})
                    db.quotes.delete_many({"demo_id": demo_id_d})
                client.close()
                return self._json_response(200, {"success": True, "deleted_lead": lead_id})

            if action == "send_followups":
                # Send batch follow-up: returns the message + WhatsApp links so user can fire from device.
                # We don't actually send via Resend here unless emails are provided.
                from datetime import datetime, timezone
                lead_ids = data.get('lead_ids') or []
                if not lead_ids:
                    return self._error(400, "lead_ids richiesti (array)")
                
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
                db = client[DB_NAME]
                
                # Load user profile for sender name
                profile = db.user_settings.find_one({"setting_id": "invoice_profile"}, {"_id": 0}) or {}
                sender_name = profile.get('company_name') or 'WebFinder Studio'
                
                # Try Resend email send for those with email
                resend_key = os.environ.get('RESEND_API_KEY')
                try:
                    import resend as _resend
                    if resend_key:
                        _resend.api_key = resend_key
                except ImportError:
                    _resend = None
                
                results = []
                for lid in lead_ids:
                    lead = db.leads.find_one({"lead_id": lid}, {"_id": 0})
                    if not lead:
                        results.append({"lead_id": lid, "status": "not_found"})
                        continue
                    demo = db.demo_sites.find_one({"lead_id": lid}, {"_id": 0})
                    demo_url = ""
                    if demo:
                        demo_url = demo.get('production_url') or demo.get('vercel_url') or f"/demo/{demo.get('demo_id')}"
                    msg = f"Ciao {lead.get('name', '')}, hai avuto modo di guardare la proposta di sito web che ti avevamo inviato? Resto a disposizione per qualsiasi domanda. {demo_url}"
                    
                    email_sent = False
                    wa_link = None
                    phone = (lead.get('phone') or '').replace(' ', '').replace('+', '')
                    if phone:
                        from urllib.parse import quote as _q
                        wa_link = f"https://wa.me/{phone}?text={_q(msg)}"
                    
                    if lead.get('email') and _resend and resend_key:
                        try:
                            demo_link_html = ""
                            if demo_url and demo_url.startswith('http'):
                                demo_link_html = '<p>Puoi rivederlo qui: <a href="' + demo_url + '">' + demo_url + '</a></p>'
                            html_body = (
                                "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#1a1a1a'>"
                                f"<p>Ciao {lead.get('name','')},</p>"
                                "<p>volevo gentilmente ricordarti la proposta di sito web che ti avevo inviato qualche giorno fa.</p>"
                                f"{demo_link_html}"
                                "<p>Resto a disposizione per qualsiasi domanda.</p>"
                                f"<p style='margin-top:30px'>Cordiali saluti,<br><strong>{sender_name}</strong></p>"
                                "</div>"
                            )
                            _resend.Emails.send({
                                "from": f"{sender_name} <onboarding@resend.dev>",
                                "to": [lead.get('email')],
                                "subject": "Hai dato un'occhiata al sito che ti abbiamo inviato?",
                                "html": html_body
                            })
                            email_sent = True
                        except Exception as _e:
                            log(f"Resend follow-up failed for {lid}: {_e}")
                    
                    db.leads.update_one(
                        {"lead_id": lid},
                        {"$set": {"last_contact_at": datetime.now(timezone.utc).isoformat(), "status": "contattato"}}
                    )
                    results.append({
                        "lead_id": lid, "name": lead.get('name'),
                        "email_sent": email_sent, "whatsapp_link": wa_link,
                        "message": msg
                    })
                client.close()
                emails_done = sum(1 for r in results if r.get('email_sent'))
                wa_ready = sum(1 for r in results if r.get('whatsapp_link'))
                return self._json_response(200, {
                    "success": True,
                    "total": len(results),
                    "emails_sent": emails_done,
                    "whatsapp_ready": wa_ready,
                    "results": results
                })
            
            # Generate lead_id
            import uuid
            from datetime import datetime, timezone
            
            lead_id = str(uuid.uuid4())[:8]
            place_id = data.get("place_id", "")
            
            # Get API key for place details
            api_key = GOOGLE_PLACES_API_KEY
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            # Try to get API key from settings
            try:
                settings = db.api_settings.find_one({"setting_id": "api_settings"})
                if settings and settings.get('google_maps_api_key'):
                    api_key = settings.get('google_maps_api_key')
            except Exception:
                pass
            
            # Check if lead already exists
            existing = db.leads.find_one({"place_id": place_id})
            if existing:
                client.close()
                log(f"Lead already exists: {data.get('name')}")
                return self._json_response(200, {
                    "message": "Lead già esistente",
                    "lead_id": existing.get("lead_id"),
                    "already_exists": True
                })
            
            # Fetch additional details from Google Places
            place_details = {}
            country = data.get("country", "Italia")
            if place_id and api_key:
                log(f"Fetching place details for {place_id} in {country}")
                place_details = get_place_details(place_id, api_key, country)
            
            # Build location object
            location = data.get("location", {})
            if isinstance(location, dict) and 'latitude' in location:
                location = {"lat": location['latitude'], "lng": location['longitude']}
            
            # Build lead document with enriched data
            lead = {
                "lead_id": lead_id,
                "place_id": place_id,
                "name": data.get("name", ""),
                "category": data.get("category", ""),
                "address": data.get("address", ""),
                "city": data.get("city", ""),
                "country": data.get("country", ""),
                "phone": data.get("phone", ""),
                "email": data.get("email", ""),
                "rating": data.get("rating", 0),
                "reviews_count": data.get("reviews_count", 0),
                "website": data.get("website"),
                "location": location,
                "primary_type": data.get("primary_type", ""),
                "types": data.get("types", []),
                "status": "nuovo_lead",
                "site_language": place_details.get("site_language", "it"),
                "booking_mode": "none",
                # Enriched data from Place Details
                "hours_text": place_details.get("hours_text", []),
                "photos": place_details.get("photos", []),
                "reviews": place_details.get("reviews", []),
                "google_maps_link": place_details.get("google_maps_link", ""),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Insert new lead
            db.leads.insert_one(lead)
            client.close()
            
            log(f"Lead saved: {lead_id} - {lead['name']} with {len(lead['photos'])} photos, {len(lead['reviews'])} reviews")
            
            # Remove _id from response
            lead.pop("_id", None)
            
            self._json_response(201, {
                "message": "Lead salvato con successo",
                "lead_id": lead_id,
                "lead": lead
            })
            
        except json.JSONDecodeError as e:
            return self._error(400, f"JSON non valido: {str(e)}")
        except Exception as e:
            log(f"EXCEPTION: {type(e).__name__}: {e}")
            log(traceback.format_exc())
            return self._error(500, f"Errore salvataggio: {str(e)}")

    def _json_response(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        log(f"GET {self.path}")
        
        # Check pymongo
        if MongoClient is None:
            log("ERROR: pymongo not installed")
            return self._error(500, "pymongo not installed - check requirements.txt")
        
        # Check MONGO_URL
        if not MONGO_URL:
            log("ERROR: Missing MONGO_URL env var")
            return self._error(500, "Missing MONGO_URL env var")
        
        try:
            # Parse query
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            action = params.get("action", [None])[0]
            
            # Handle hot leads (with tracking score) action
            if action == "hot_leads":
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
                db = client[DB_NAME]
                # Aggregate views per lead
                lead_scores = {}
                for ev in db.demo_views.find({}, {"_id": 0}):
                    lid = ev.get('lead_id')
                    if not lid:
                        continue
                    if lid not in lead_scores:
                        lead_scores[lid] = {'lead_id': lid, 'views': 0, 'sessions': set(), 'clicks': 0, 'last_view': None}
                    et = ev.get('event_type', '')
                    if et == 'view':
                        lead_scores[lid]['views'] += 1
                        if ev.get('session_id'):
                            lead_scores[lid]['sessions'].add(ev.get('session_id'))
                    elif et.startswith('click_'):
                        lead_scores[lid]['clicks'] += 1
                    ts = ev.get('ts')
                    if ts and (not lead_scores[lid]['last_view'] or ts > lead_scores[lid]['last_view']):
                        lead_scores[lid]['last_view'] = ts

                hot = []
                for lid, s in lead_scores.items():
                    sessions = len(s['sessions'])
                    score = s['views'] + sessions * 3 + s['clicks'] * 5
                    if score == 0:
                        continue
                    lead = db.leads.find_one({"lead_id": lid}, {"_id": 0, "name": 1, "category": 1, "city": 1, "phone": 1, "status": 1, "lead_id": 1})
                    if lead:
                        hot.append({**lead, 'views': s['views'], 'sessions': sessions, 'clicks': s['clicks'], 'last_view': s['last_view'], 'score': score})
                hot.sort(key=lambda x: x['score'], reverse=True)
                client.close()
                return self._json_response(200, hot[:20])
            
            # Handle followups GET (leads to recontact - status=demo_creata OR contattato AND last_contact older than X days)
            if action == "followups":
                from datetime import datetime, timezone, timedelta
                days = int(params.get("days", ["3"])[0] or 3)
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
                db = client[DB_NAME]
                cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
                # Leads with status indicating an active funnel but no recent contact
                target_statuses = ['demo_creata', 'contattato', 'demo_created', 'contacted']
                cursor = db.leads.find({
                    "status": {"$in": target_statuses},
                    "$or": [
                        {"last_contact_at": {"$exists": False}},
                        {"last_contact_at": None},
                        {"last_contact_at": {"$lt": cutoff}}
                    ]
                }, {"_id": 0}).sort("created_at", -1).limit(50)
                items = []
                for lead in cursor:
                    if 'created_at' in lead:
                        lead['created_at'] = str(lead['created_at'])
                    items.append(lead)
                client.close()
                return self._json_response(200, items)
            
            # Handle user_settings GET (invoice profile for quote PDF)
            if action == "user_settings":
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
                db = client[DB_NAME]
                profile = db.user_settings.find_one(
                    {"setting_id": "invoice_profile"}, {"_id": 0}
                )
                if not profile:
                    # Seed defaults for new installations (WebFinder Studio branding)
                    profile = dict(DEFAULT_INVOICE_PROFILE)
                    profile["setting_id"] = "invoice_profile"
                    try:
                        db.user_settings.insert_one(dict(profile))
                    except Exception as _e:
                        log(f"Seed default profile failed: {_e}")
                    profile.pop("_id", None)
                client.close()
                return self._json_response(200, profile)
            
            # Handle place-details action
            if action == "details":
                place_id = params.get("place_id", [None])[0]
                country = params.get("country", ["Italia"])[0]
                
                if not place_id:
                    return self._error(400, "place_id richiesto")
                
                log(f"Getting place details for: {place_id}, country: {country}")
                
                # Get API key
                api_key = GOOGLE_PLACES_API_KEY
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
                db = client[DB_NAME]
                
                settings = db.api_settings.find_one({"setting_id": "api_settings"})
                if settings and settings.get('google_maps_api_key'):
                    api_key = settings.get('google_maps_api_key')
                client.close()
                
                if not api_key:
                    return self._error(400, "Google Places API key non configurata")
                
                # Fetch details from Google
                details = get_place_details(place_id, api_key, country)
                
                if not details:
                    return self._error(404, "Dettagli non trovati")
                
                details['place_id'] = place_id
                return self._json_response(200, details)
            
            # Default: list leads
            status_filter = params.get("status", [None])[0]
            
            # Query DB
            log(f"Connecting to MongoDB, filter: {status_filter}")
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            query = {}
            if status_filter:
                query["status"] = status_filter
            
            leads = []
            for doc in db.leads.find(query, {"_id": 0}).sort("created_at", -1).limit(100):
                if "created_at" in doc:
                    doc["created_at"] = str(doc["created_at"])
                leads.append(doc)
            
            client.close()
            log(f"Found {len(leads)} leads")
            
            # Success response
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(leads).encode())
            
        except Exception as e:
            log(f"EXCEPTION: {type(e).__name__}: {e}")
            log(traceback.format_exc())
            return self._error(500, f"Database error: {str(e)}")

    def _error(self, code, message):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())

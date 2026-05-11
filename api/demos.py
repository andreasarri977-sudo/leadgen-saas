# /api/demos.py - List Demo Sites + Templates (style/content presets)
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs

def log(msg):
    print(f"[DEMOS] {msg}", file=sys.stderr, flush=True)

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("URL_MONGO")
DB_NAME = os.environ.get("DB_NAME", "leadhunter")

# Fields a template can store/apply
TEMPLATE_FIELDS = [
    'color_scheme', 'hero_position', 'hero_overlay', 'theme',
    'about_text', 'homepage_subtitle', 'services_intro', 'cta_text',
    'tagline', 'why_choose_us', 'faq'
]

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _action(self):
        return parse_qs(urlparse(self.path).query).get("action", [None])[0]

    def do_GET(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        action = self._action()
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]

            if action == "templates":
                # List all saved templates
                templates = []
                for t in db.templates.find({}, {"_id": 0}).sort("created_at", -1).limit(50):
                    if "created_at" in t:
                        t["created_at"] = str(t["created_at"])
                    templates.append(t)
                client.close()
                return self._json(200, templates)

            demos = []
            for doc in db.demo_sites.find({}, {"_id": 0}).sort("created_at", -1).limit(100):
                if "created_at" in doc:
                    doc["created_at"] = str(doc["created_at"])
                demos.append(doc)
            client.close()
            log(f"Found {len(demos)} demos")
            return self._json(200, demos)
        except Exception as e:
            log(f"ERROR: {e}")
            return self._error(500, f"Database error: {str(e)}")

    def do_POST(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        action = self._action()
        if action != "template_save":
            return self._error(400, f"Azione non riconosciuta: {action}")
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            data = json.loads(body) if body else {}
            name = (data.get('name') or '').strip() or f"Template {datetime.now().strftime('%d/%m/%Y %H:%M')}"
            payload = {k: data.get(k) for k in TEMPLATE_FIELDS if k in data}
            template = {
                "template_id": str(uuid.uuid4())[:8],
                "name": name,
                "description": (data.get('description') or '').strip(),
                "category": (data.get('category') or '').strip(),
                "data": payload,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            db.templates.insert_one(dict(template))
            client.close()
            return self._json(201, {"success": True, "template": template})
        except Exception as e:
            log(f"Template save error: {e}")
            return self._error(500, str(e))

    def do_DELETE(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        action = self._action()
        if action != "template_delete":
            return self._error(400, f"Azione non riconosciuta: {action}")
        tid = parse_qs(urlparse(self.path).query).get("id", [None])[0]
        if not tid:
            return self._error(400, "template id mancante")
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            result = db.templates.delete_one({"template_id": tid})
            client.close()
            if result.deleted_count == 0:
                return self._error(404, "Template non trovato")
            return self._json(200, {"success": True})
        except Exception as e:
            return self._error(500, str(e))

    def _json(self, code, data):
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

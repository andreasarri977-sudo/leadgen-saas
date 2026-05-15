# /api/settings/layout-default - Get/Save/Delete layout default preset
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from datetime import datetime, timezone

def log(msg):
    print(f"[LAYOUT_DEFAULT] {msg}", file=sys.stderr, flush=True)

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("URL_MONGO")
DB_NAME = os.environ.get("DB_NAME", "leadhunter")

LAYOUT_DEFAULT_FIELDS = [
    'section_order',
    'design_template', 'text_color', 'color_intensity',
    'show_reviews', 'show_gallery', 'show_whyus', 'show_faq',
    'show_hours', 'show_map', 'show_services',
]


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if MongoClient is None or not MONGO_URL:
            return self._error(500, "Mongo non configurato")
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            doc = db.user_settings.find_one({"setting_id": "layout_default"}, {"_id": 0})
            client.close()
            if not doc:
                return self._json(200, {"exists": False})
            doc.pop('setting_id', None)
            doc['exists'] = True
            return self._json(200, doc)
        except Exception as e:
            log(f"GET error: {e}")
            return self._error(500, str(e))

    def do_POST(self):
        if MongoClient is None or not MONGO_URL:
            return self._error(500, "Mongo non configurato")
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            data = json.loads(body) if body else {}
        except Exception:
            return self._error(400, "Body JSON non valido")
        payload = {k: data[k] for k in LAYOUT_DEFAULT_FIELDS if k in data}
        payload['updated_at'] = datetime.now(timezone.utc).isoformat()
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            db.user_settings.update_one(
                {"setting_id": "layout_default"},
                {"$set": {"setting_id": "layout_default", **payload}},
                upsert=True
            )
            client.close()
            return self._json(200, {"success": True, "saved": list(payload.keys())})
        except Exception as e:
            log(f"POST error: {e}")
            return self._error(500, str(e))

    def do_DELETE(self):
        if MongoClient is None or not MONGO_URL:
            return self._error(500, "Mongo non configurato")
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            db.user_settings.delete_one({"setting_id": "layout_default"})
            client.close()
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

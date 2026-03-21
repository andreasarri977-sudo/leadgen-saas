# /api/whatsapp/generate/index.py - Generate WhatsApp Message
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from urllib.parse import parse_qs, urlparse

def log(msg):
    print(f"[WHATSAPP/GENERATE] {msg}", file=sys.stderr, flush=True)

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
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        try:
            # Parse query params
            query = parse_qs(urlparse(self.path).query)
            lead_id = query.get('lead_id', [None])[0]
            demo_url = query.get('demo_url', [''])[0]
            
            if not lead_id:
                return self._error(400, "lead_id richiesto")
            
            log(f"Generating WhatsApp for lead: {lead_id}")
            
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            lead = db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
            if not lead:
                client.close()
                return self._error(404, "Lead non trovato")
            
            client.close()
            
            # Generate WhatsApp message
            business_name = lead.get('name', 'la tua attività')
            category = lead.get('category', 'attività')
            
            message = f"""Buongiorno! 👋

Mi chiamo [Il tuo nome] e mi occupo di creare siti web professionali per {category} come {business_name}.

Ho notato che al momento non avete un sito web e ho pensato di creare una demo gratuita per mostrarvi cosa potrei realizzare per voi.

🌐 Ecco la demo: {demo_url}

Il sito è già ottimizzato per dispositivi mobili e può aiutarvi a:
✅ Farvi trovare da nuovi clienti su Google
✅ Mostrare i vostri servizi e prezzi
✅ Permettere prenotazioni online

Posso personalizzarlo secondo le vostre esigenze. Vi interessa parlarne?

Grazie e buona giornata! 😊"""
            
            log(f"WhatsApp message generated for {business_name}")
            
            self._json_response(200, {
                "message": message,
                "phone": lead.get('phone', ''),
                "business_name": business_name
            })
            
        except Exception as e:
            log(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            return self._error(500, f"Errore: {str(e)}")

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

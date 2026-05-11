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

# Standard template fornito dall'utente (founder WebFinder Studio).
# Placeholders sostituiti a runtime: {founder_name}, {company_name}, {demo_url}, {instagram_handle}
STANDARD_WHATSAPP_TEMPLATE = """Buongiorno! 👋
Mi chiamo {founder_name} e sono il fondatore di {company_name}, un progetto che aiuta attività locali a migliorare la propria presenza online con siti web moderni e ottimizzati per smartphone 🚀

Ho trovato la vostra attività su Google Maps e ho creato un esempio veloce di come potrebbe apparire con un sito professionale:

Link: {demo_url}

Qui trovate anche alcuni esempi e demo pubblicate su Instagram:
@{instagram_handle}

Se vi fa piacere posso anche personalizzarlo gratuitamente con i vostri colori, servizi e stile 🙂

Buona giornata!"""


def _llm_variant(business_name, demo_url, founder_name, company_name, instagram_handle):
    """Genera una variante del messaggio standard via Emergent LLM proxy (Claude Sonnet)."""
    import requests as _r
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        return None

    base = STANDARD_WHATSAPP_TEMPLATE.format(
        founder_name=founder_name,
        company_name=company_name,
        demo_url=demo_url,
        instagram_handle=instagram_handle,
    )

    prompt = (
        f"Riscrivi questo messaggio WhatsApp mantenendo struttura, tono cordiale ed emoji simili, "
        f"ma con parole leggermente diverse per evitare ripetizioni. NON modificare il link demo "
        f"({demo_url}), il nome del founder ({founder_name}), il nome della società ({company_name}) "
        f"e l'handle Instagram (@{instagram_handle}). Personalizza eventualmente con il nome attività "
        f"\"{business_name}\". Rispondi SOLO con il messaggio finale, senza preamboli.\n\n"
        f"Messaggio originale:\n{base}"
    )
    try:
        resp = _r.post(
            "https://integrations.emergentagent.com/llm/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "claude-sonnet-4-5-20250929",
                "messages": [
                    {"role": "system", "content": "Sei un copywriter italiano specializzato in messaggi WhatsApp cordiali e professionali."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 600
            },
            timeout=30
        )
        if resp.status_code != 200:
            log(f"LLM HTTP {resp.status_code}: {resp.text[:200]}")
            return None
        return resp.json()['choices'][0]['message']['content'].strip()
    except Exception as e:
        log(f"LLM variant error: {e}")
        return None


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
            query = parse_qs(urlparse(self.path).query)
            lead_id = query.get('lead_id', [None])[0]
            demo_url = query.get('demo_url', [''])[0]
            try:
                regenerate = int(query.get('regenerate', ['0'])[0] or 0)
            except ValueError:
                regenerate = 0

            if not lead_id:
                return self._error(400, "lead_id richiesto")

            log(f"Generating WhatsApp for lead: {lead_id} (regenerate={regenerate})")

            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]

            lead = db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
            if not lead:
                client.close()
                return self._error(404, "Lead non trovato")

            # Profilo utente (sender)
            profile = db.user_settings.find_one({"setting_id": "invoice_profile"}, {"_id": 0}) or {}
            founder_name = profile.get('founder_name') or profile.get('owner_name') or 'Andrea'
            company_name = profile.get('company_name') or 'WebFinder Studio'
            instagram_handle = (profile.get('instagram_handle') or 'webfinderstudio').lstrip('@')

            client.close()

            business_name = lead.get('name', 'la tua attività')

            if regenerate <= 0:
                # Messaggio standard scelto dall'utente
                message = STANDARD_WHATSAPP_TEMPLATE.format(
                    founder_name=founder_name,
                    company_name=company_name,
                    demo_url=demo_url,
                    instagram_handle=instagram_handle,
                )
                variant = "standard"
            else:
                # Variante AI
                ai = _llm_variant(business_name, demo_url, founder_name, company_name, instagram_handle)
                if ai:
                    message = ai
                    variant = "ai"
                else:
                    # Fallback al template standard
                    message = STANDARD_WHATSAPP_TEMPLATE.format(
                        founder_name=founder_name,
                        company_name=company_name,
                        demo_url=demo_url,
                        instagram_handle=instagram_handle,
                    )
                    variant = "standard_fallback"

            log(f"WhatsApp message generated for {business_name} ({variant})")

            self._json_response(200, {
                "message": message,
                "phone": lead.get('phone', ''),
                "business_name": business_name,
                "variant": variant,
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

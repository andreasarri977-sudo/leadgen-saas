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
    # Stile classico
    'color_scheme', 'hero_position', 'hero_overlay', 'theme',
    # Contenuti generati
    'about_text', 'homepage_subtitle', 'services_intro', 'cta_text',
    'tagline', 'why_choose_us', 'faq',
    # Design template e personalizzazioni (NEW)
    'design_template', 'text_color', 'color_intensity',
    # Ordine sezioni personalizzato
    'section_order',
    # Toggle sezioni
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
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            data = json.loads(body) if body else {}
        except Exception:
            return self._error(400, "Body JSON non valido")
        
        if action == "template_ai_generate":
            return self._template_ai_generate(data)
        if action != "template_save":
            return self._error(400, f"Azione non riconosciuta: {action}")
        try:
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
    
    def _template_ai_generate(self, data):
        """Generate a template via Emergent LLM proxy (Claude Sonnet) using a lightweight HTTPS call."""
        import requests as _r
        category = (data.get('category') or 'attività locale').strip()[:80]
        style = (data.get('style') or 'moderno e professionale').strip()[:60]
        business_name = (data.get('business_name') or '').strip()[:80]
        city = (data.get('city') or '').strip()[:60]
        save = bool(data.get('save', True))
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return self._error(500, "EMERGENT_LLM_KEY mancante negli env Vercel")
        
        context_lines = [f"Categoria: {category}", f"Stile richiesto: {style}"]
        if business_name:
            context_lines.append(f"Nome attività: {business_name}")
        if city:
            context_lines.append(f"Città: {city}")
        context_block = "\n".join(context_lines)
        
        prompt = (
            "Devi generare contenuti per un sito web in italiano. Dati dell'attività:\n"
            f"{context_block}\n\n"
            "Rispondi SOLO con JSON valido, niente altro, senza markdown, senza ``` né testo extra.\n"
            "Schema esatto da rispettare:\n"
            "{\n"
            '  "color_scheme": uno tra ["blue","sky","cyan","indigo","purple","violet","fuchsia","pink","rose","red","orange","amber","yellow","lime","green","emerald","teal","gold","coral","mint","lavender","peach","slate","navy","maroon","forest","black"],\n'
            '  "hero_position": "center",\n'
            '  "hero_overlay": "medium",\n'
            '  "theme": "modern",\n'
            '  "tagline": "max 8 parole, accattivante, usa il nome attività se fornito",\n'
            '  "homepage_subtitle": "1 frase di max 18 parole, contestualizzata alla città/categoria",\n'
            '  "about_text": "2-3 frasi che descrivono l\'attività, usando nome e città se forniti",\n'
            '  "services_intro": "1 frase introduttiva ai servizi",\n'
            '  "cta_text": "max 5 parole, invito all azione",\n'
            '  "why_choose_us": [\n'
            '    {"icon":"⭐","title":"max 4 parole","description":"max 15 parole, specifica per la categoria"}\n'
            '    (4 elementi totali, icone emoji diverse e adatte alla categoria)\n'
            "  ],\n"
            '  "faq": [\n'
            '    {"question":"domanda completa", "answer":"risposta di 1-2 frasi"}\n'
            '    (5 elementi totali, FAQ tipiche e specifiche per questa categoria)\n'
            "  ]\n"
            "}\n"
            "Adatta colore e tono alla categoria (es: pizzeria → red/orange caldo; dentista → blue/teal pulito; parrucchiere → fuchsia/rose elegante; barbiere → slate/black classico; palestra → orange/lime energico)."
        )
        
        try:
            llm_response = _r.post(
                "https://integrations.emergentagent.com/llm/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "claude-sonnet-4-5-20250929",
                    "messages": [
                        {"role": "system", "content": "Sei un esperto di web design e copy in italiano. Rispondi SEMPRE solo con JSON valido."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 2000
                },
                timeout=45
            )
            if llm_response.status_code != 200:
                return self._error(500, f"LLM error {llm_response.status_code}: {llm_response.text[:200]}")
            llm_data = llm_response.json()
            content = llm_data['choices'][0]['message']['content']
            # Strip code fences if present
            cleaned = content.strip()
            if cleaned.startswith('```'):
                lines = cleaned.split('\n')
                if lines[0].startswith('```'):
                    lines = lines[1:]
                if lines and lines[-1].startswith('```'):
                    lines = lines[:-1]
                cleaned = '\n'.join(lines)
            parsed = json.loads(cleaned)
        except Exception as e:
            log(f"AI template error: {e}")
            return self._error(500, f"Errore generazione AI: {str(e)[:200]}")
        
        # Filter to allowed fields only
        tpl_data = {k: parsed[k] for k in TEMPLATE_FIELDS if k in parsed}
        
        # Build a descriptive name
        name_parts = ['AI']
        if business_name:
            name_parts.append(business_name)
        elif category:
            name_parts.append(category.title())
        name_parts.append(f"({style.title()})")
        name = ' · '.join(name_parts)
        
        if save:
            try:
                client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
                db = client[DB_NAME]
                template = {
                    "template_id": str(uuid.uuid4())[:8],
                    "name": name,
                    "description": f"Generato da AI per {business_name or category}",
                    "category": category,
                    "data": tpl_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "ai_generated": True
                }
                db.templates.insert_one(dict(template))
                client.close()
                return self._json(201, {"success": True, "template": template, "preview": tpl_data})
            except Exception as e:
                return self._error(500, f"Errore salvataggio: {e}")
        return self._json(200, {"success": True, "preview": tpl_data, "name": name})

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

# /api/health.py - Health Check
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from datetime import datetime, timezone

# Version markers - aggiornati a ogni nuova feature
BUILD_VERSION = "2026.05.16-env-diag"
BUILD_FEATURES = [
    "clients-page",
    "section-order-editor",
    "search-leads",
    "mark-client-button",
    "quote-3-tax-modes",
    "quote-default-features",
    "quote-dynamic-features",
    "renewals-calendar",
    "invoices-deposit-balance",
    "ai-translations",
    "env-diagnostics",
]

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Check modules
        modules = {}
        try:
            import pymongo
            modules["pymongo"] = pymongo.version
        except ImportError:
            modules["pymongo"] = "NOT INSTALLED"
        
        try:
            import dns
            modules["dnspython"] = "OK"
        except ImportError:
            modules["dnspython"] = "NOT INSTALLED"

        # === Diagnostica completa env vars (mostra SOLO presence + lunghezza, mai i valori) ===
        def _env_status(name):
            val = os.environ.get(name)
            if val is None:
                return {"present": False, "length": 0}
            return {"present": True, "length": len(val), "preview": (val[:4] + '...' + val[-2:]) if len(val) > 8 else '***'}

        env_status = {
            "MONGO_URL": _env_status("MONGO_URL"),
            "URL_MONGO": _env_status("URL_MONGO"),  # alias fallback
            "DB_NAME": _env_status("DB_NAME"),
            "GOOGLE_PLACES_API_KEY": _env_status("GOOGLE_PLACES_API_KEY"),
            "PEXELS_API_KEY": _env_status("PEXELS_API_KEY"),
            "EMERGENT_LLM_KEY": _env_status("EMERGENT_LLM_KEY"),
            "RESEND_API_KEY": _env_status("RESEND_API_KEY"),
            "VERCEL_TOKEN": _env_status("VERCEL_TOKEN"),
            "REACT_APP_CLOUDINARY_CLOUD_NAME": _env_status("REACT_APP_CLOUDINARY_CLOUD_NAME"),
        }

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        self.wfile.write(json.dumps({
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "python": sys.version.split()[0],
            "modules": modules,
            "mongo_configured": bool(os.environ.get("MONGO_URL") or os.environ.get("URL_MONGO")),
            "env_status": env_status,
            "build_version": BUILD_VERSION,
            "build_features": BUILD_FEATURES
        }, indent=2).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

# /api/stats.py - Dashboard Stats
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import traceback

def log(msg):
    print(f"[STATS] {msg}", file=sys.stderr, flush=True)

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
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        try:
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            stats = {
                "total_leads": db.leads.count_documents({}),
                "demos_created": db.demo_sites.count_documents({}),
                "new_leads": db.leads.count_documents({"status": {"$in": ["new", "nuovo_lead"]}}),
                "contacted": db.leads.count_documents({"status": {"$in": ["contacted", "contattato"]}}),
                "clients_acquired": db.leads.count_documents({"status": {"$in": ["client", "cliente_acquisito"]}}),
                "emails_sent": 0
            }

            # Calculate total revenue from acquired clients (sum of client_costs.total)
            revenue_pipeline = [
                {"$match": {"status": {"$in": ["client", "cliente_acquisito"]}}},
                {"$group": {
                    "_id": None,
                    "total_revenue": {"$sum": {"$ifNull": ["$client_costs.total", 0]}},
                    "paid_revenue": {
                        "$sum": {
                            "$cond": [
                                {"$eq": [{"$ifNull": ["$client_costs.paid", False]}, True]},
                                {"$ifNull": ["$client_costs.total", 0]},
                                0
                            ]
                        }
                    }
                }}
            ]
            agg = list(db.leads.aggregate(revenue_pipeline))
            if agg:
                stats["total_revenue"] = round(agg[0].get("total_revenue", 0) or 0, 2)
                stats["paid_revenue"] = round(agg[0].get("paid_revenue", 0) or 0, 2)
            else:
                stats["total_revenue"] = 0
                stats["paid_revenue"] = 0
            
            client.close()
            log(f"Stats: {stats}")
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(stats).encode())
            
        except Exception as e:
            log(f"ERROR: {e}")
            return self._error(500, f"Database error: {str(e)}")

    def _error(self, code, msg):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode())

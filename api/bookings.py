# /api/bookings.py - Bookings Management
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse

def log(msg):
    print(f"[BOOKINGS] {msg}", file=sys.stderr, flush=True)

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
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        """Get bookings - optionally filtered by demo_id"""
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        try:
            query_params = parse_qs(urlparse(self.path).query)
            demo_id = query_params.get('demo_id', [None])[0]
            status = query_params.get('status', [None])[0]
            
            log(f"GET bookings - demo_id: {demo_id}, status: {status}")
            
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            # Build query
            query = {}
            if demo_id:
                query['demo_id'] = demo_id
            if status:
                query['status'] = status
            
            # Get bookings sorted by date (newest first)
            bookings = list(db.bookings.find(query, {"_id": 0}).sort("created_at", -1).limit(100))
            
            # Get demo info for each booking
            for booking in bookings:
                if booking.get('demo_id'):
                    demo = db.demo_sites.find_one({"demo_id": booking['demo_id']}, {"_id": 0, "business_name": 1})
                    if demo:
                        booking['business_name'] = demo.get('business_name', 'N/A')
            
            client.close()
            
            log(f"Found {len(bookings)} bookings")
            self._json_response(200, bookings)
            
        except Exception as e:
            log(f"ERROR: {e}")
            return self._error(500, f"Database error: {str(e)}")

    def do_POST(self):
        """Create a new booking"""
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            log(f"New booking request: {data}")
            
            # Validate required fields
            required = ['demo_id', 'customer_name', 'customer_phone']
            for field in required:
                if not data.get(field):
                    return self._error(400, f"Campo richiesto: {field}")
            
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            # Get demo info
            demo = db.demo_sites.find_one({"demo_id": data['demo_id']}, {"_id": 0})
            if not demo:
                client.close()
                return self._error(404, "Demo non trovato")
            
            # Create booking
            booking_id = str(uuid.uuid4())[:8]
            
            booking = {
                "booking_id": booking_id,
                "demo_id": data['demo_id'],
                "lead_id": demo.get('lead_id'),
                "business_name": demo.get('business_name', ''),
                # Customer info
                "customer_name": data['customer_name'],
                "customer_phone": data['customer_phone'],
                "customer_email": data.get('customer_email', ''),
                # Booking details
                "booking_type": data.get('booking_type', 'appointment'),  # appointment or table
                "date": data.get('date', ''),
                "time": data.get('time', ''),
                "guests": data.get('guests', 1),
                "notes": data.get('notes', ''),
                "service": data.get('service', ''),
                # Status
                "status": "pending",  # pending, confirmed, cancelled, completed
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            db.bookings.insert_one(booking)
            
            # Update stats
            db.demo_sites.update_one(
                {"demo_id": data['demo_id']},
                {"$inc": {"bookings_count": 1}}
            )
            
            client.close()
            
            # Remove _id
            booking.pop("_id", None)
            
            log(f"Booking created: {booking_id} for {demo.get('business_name')}")
            
            self._json_response(201, {
                "message": "Prenotazione ricevuta con successo!",
                "booking_id": booking_id,
                "booking": booking
            })
            
        except json.JSONDecodeError as e:
            return self._error(400, f"JSON non valido: {str(e)}")
        except Exception as e:
            log(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            return self._error(500, f"Errore: {str(e)}")

    def do_PUT(self):
        """Update booking status"""
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            booking_id = data.get('booking_id')
            if not booking_id:
                return self._error(400, "booking_id richiesto")
            
            new_status = data.get('status')
            if not new_status:
                return self._error(400, "status richiesto")
            
            valid_statuses = ['pending', 'confirmed', 'cancelled', 'completed']
            if new_status not in valid_statuses:
                return self._error(400, f"Status non valido. Usa: {', '.join(valid_statuses)}")
            
            log(f"Update booking {booking_id} to status: {new_status}")
            
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            result = db.bookings.update_one(
                {"booking_id": booking_id},
                {"$set": {
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            client.close()
            
            if result.matched_count == 0:
                return self._error(404, "Prenotazione non trovata")
            
            log(f"Booking {booking_id} updated to {new_status}")
            
            self._json_response(200, {
                "message": f"Prenotazione aggiornata a: {new_status}",
                "booking_id": booking_id,
                "status": new_status
            })
            
        except Exception as e:
            log(f"ERROR: {e}")
            return self._error(500, f"Errore: {str(e)}")

    def do_DELETE(self):
        """Delete a booking"""
        if MongoClient is None:
            return self._error(500, "pymongo not installed")
        if not MONGO_URL:
            return self._error(500, "Missing MONGO_URL env var")
        
        try:
            query_params = parse_qs(urlparse(self.path).query)
            booking_id = query_params.get('booking_id', [None])[0]
            
            if not booking_id:
                return self._error(400, "booking_id richiesto")
            
            log(f"Delete booking: {booking_id}")
            
            client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            result = db.bookings.delete_one({"booking_id": booking_id})
            
            client.close()
            
            if result.deleted_count == 0:
                return self._error(404, "Prenotazione non trovata")
            
            log(f"Booking {booking_id} deleted")
            
            self._json_response(200, {
                "message": "Prenotazione eliminata",
                "booking_id": booking_id
            })
            
        except Exception as e:
            log(f"ERROR: {e}")
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

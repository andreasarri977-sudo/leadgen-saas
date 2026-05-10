# /api/bookings.py - Bookings Management with Email Notifications
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

try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    log("Resend not installed - email notifications disabled")

MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("URL_MONGO")
DB_NAME = os.environ.get("DB_NAME", "leadhunter")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

def send_booking_email(client_email, client_name, business_name, booking_data):
    """Send booking notification email to client"""
    if not RESEND_AVAILABLE or not RESEND_API_KEY:
        log("Email notification skipped - Resend not configured")
        return False
    
    try:
        resend.api_key = RESEND_API_KEY
        
        # Format date/time nicely
        booking_date = booking_data.get('date', 'N/A')
        booking_time = booking_data.get('time', 'N/A')
        customer_name = booking_data.get('customer_name', 'N/A')
        customer_phone = booking_data.get('customer_phone', 'N/A')
        customer_email = booking_data.get('customer_email', '')
        guests = booking_data.get('guests', 1)
        notes = booking_data.get('notes', '')
        booking_type = booking_data.get('booking_type', 'appointment')
        service = booking_data.get('service', '')
        
        type_label = "Prenotazione Tavolo" if booking_type == 'table' else "Appuntamento"
        
        # Build WhatsApp link
        whatsapp_message = f"Ciao {customer_name}, confermiamo la tua prenotazione per il {booking_date} alle {booking_time}. A presto!"
        whatsapp_link = f"https://wa.me/{customer_phone.replace(' ', '').replace('+', '')}?text={whatsapp_message.replace(' ', '%20')}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h1 style="color: #2563eb; margin-bottom: 10px;">🔔 Nuova {type_label}!</h1>
                <p style="color: #666; font-size: 16px;">Hai ricevuto una nuova prenotazione per <strong>{business_name}</strong></p>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                    <h2 style="margin: 0 0 15px 0; color: #1e40af;">📅 Dettagli Prenotazione</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #666; width: 140px;">📆 Data:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{booking_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">🕐 Ora:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{booking_time}</td>
                        </tr>
                        {"<tr><td style='padding: 8px 0; color: #666;'>👥 Persone:</td><td style='padding: 8px 0; font-weight: bold;'>" + str(guests) + "</td></tr>" if booking_type == 'table' else ""}
                        {"<tr><td style='padding: 8px 0; color: #666;'>💇 Servizio:</td><td style='padding: 8px 0; font-weight: bold;'>" + service + "</td></tr>" if service else ""}
                    </table>
                </div>
                
                <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                    <h2 style="margin: 0 0 15px 0; color: #166534;">👤 Dati Cliente</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #666; width: 140px;">Nome:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{customer_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">📞 Telefono:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{customer_phone}</td>
                        </tr>
                        {"<tr><td style='padding: 8px 0; color: #666;'>📧 Email:</td><td style='padding: 8px 0;'>" + customer_email + "</td></tr>" if customer_email else ""}
                    </table>
                </div>
                
                {"<div style='background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;'><strong>📝 Note:</strong> " + notes + "</div>" if notes else ""}
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="{whatsapp_link}" style="display: inline-block; background-color: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        💬 Rispondi su WhatsApp
                    </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                    Questa email è stata inviata automaticamente dal sistema di prenotazioni del tuo sito web.
                </p>
            </div>
        </body>
        </html>
        """
        
        params = {
            "from": "Prenotazioni <onboarding@resend.dev>",
            "to": [client_email],
            "subject": f"🔔 Nuova {type_label} - {customer_name} - {booking_date} {booking_time}",
            "html": html_content
        }
        
        email_result = resend.Emails.send(params)
        log(f"Email sent to {client_email}: {email_result}")
        return True
        
    except Exception as e:
        log(f"Error sending email: {e}")
        return False

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
        """Create a new booking with availability check and email notification"""
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
            
            # Get demo info including client settings
            demo = db.demo_sites.find_one({"demo_id": data['demo_id']}, {"_id": 0})
            if not demo:
                client.close()
                return self._error(404, "Demo non trovato")
            
            # Get client settings for notifications
            client_settings = demo.get('client_settings', {})
            
            # Check availability if capacity is set
            booking_date = data.get('date', '')
            booking_time = data.get('time', '')
            booking_type = data.get('booking_type', 'appointment')
            guests = int(data.get('guests', 1))
            
            max_capacity = client_settings.get('max_capacity', 0)
            
            if max_capacity > 0 and booking_date and booking_time:
                # Count existing bookings for this slot
                existing_bookings = db.bookings.count_documents({
                    "demo_id": data['demo_id'],
                    "date": booking_date,
                    "time": booking_time,
                    "status": {"$nin": ["cancelled", "rejected"]}
                })
                
                # For tables, count total guests
                if booking_type == 'table':
                    pipeline = [
                        {"$match": {
                            "demo_id": data['demo_id'],
                            "date": booking_date,
                            "time": booking_time,
                            "status": {"$nin": ["cancelled", "rejected"]}
                        }},
                        {"$group": {"_id": None, "total_guests": {"$sum": "$guests"}}}
                    ]
                    result = list(db.bookings.aggregate(pipeline))
                    current_guests = result[0]['total_guests'] if result else 0
                    
                    if current_guests + guests > max_capacity:
                        client.close()
                        return self._error(409, f"Spiacenti, non ci sono abbastanza posti disponibili per {guests} persone in questo orario. Prova un altro orario.")
                else:
                    # For appointments, just count slots
                    if existing_bookings >= max_capacity:
                        client.close()
                        return self._error(409, "Spiacenti, questo orario è già al completo. Prova un altro orario.")
            
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
                "booking_type": booking_type,
                "date": booking_date,
                "time": booking_time,
                "guests": guests,
                "notes": data.get('notes', ''),
                "service": data.get('service', ''),
                # Status
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            db.bookings.insert_one(booking)
            
            # Update stats
            db.demo_sites.update_one(
                {"demo_id": data['demo_id']},
                {"$inc": {"bookings_count": 1}}
            )
            
            # Send email notification to client
            email_sent = False
            client_email = client_settings.get('notification_email')
            client_name = client_settings.get('client_name', demo.get('business_name', ''))
            
            if client_email:
                email_sent = send_booking_email(
                    client_email=client_email,
                    client_name=client_name,
                    business_name=demo.get('business_name', ''),
                    booking_data=booking
                )
            
            client.close()
            
            # Remove _id
            booking.pop("_id", None)
            
            log(f"Booking created: {booking_id} for {demo.get('business_name')} - Email sent: {email_sent}")
            
            self._json_response(201, {
                "message": "Prenotazione ricevuta con successo!",
                "booking_id": booking_id,
                "booking": booking,
                "email_sent": email_sent
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

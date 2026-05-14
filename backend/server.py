from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import asyncio
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
from bs4 import BeautifulSoup
import phonenumbers
import re
import aiohttp
import resend
import json
import hashlib

# Note: site_content.py and ai_editor.py are deprecated, using direct DB updates now

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
VERCEL_TOKEN = os.environ.get('VERCEL_TOKEN', '')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SearchRequest(BaseModel):
    city: str
    country: str
    category: str
    min_reviews: int = 10
    min_rating: float = 4.0

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lead_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    place_id: Optional[str] = None  # Opzionale per compatibilità con lead vecchi
    name: str
    category: str
    address: str
    city: str
    country: str
    phone: Optional[str] = None
    email: Optional[str] = None  # Email azienda per contatto
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    reviews: Optional[List[Dict[str, Any]]] = None  # Recensioni complete
    hours: Optional[Dict[str, Any]] = None  # Orari strutturati
    hours_text: Optional[List[str]] = None  # Orari testo
    photos: Optional[List[Dict[str, str]]] = None  # Photos con name e costruzione URL
    location: Optional[Dict[str, float]] = None  # lat, lng
    google_maps_link: Optional[str] = None
    website: Optional[str] = None
    primary_type: Optional[str] = None  # Tipo principale
    types: Optional[List[str]] = None  # Tutti i tipi
    # Social Media
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    # Status
    status: str = "nuovo_lead"
    language: str = "it"  # Deprecated, use site_language
    site_language: str = "it"  # Lingua del sito (it, fr, en, es, de)
    booking_mode: str = "none"  # none, appointment, table
    external_booking_url: Optional[str] = None  # URL prenotazione esterna (TheFork, Treatwell, etc.)
    client_costs: Optional[Dict[str, Any]] = None  # Costi cliente acquisito (sito, dominio, hosting, extra)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DemoSite(BaseModel):
    model_config = ConfigDict(extra="ignore")
    demo_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    business_name: str
    demo_url: str  # URL interno: /demo/{demo_id}
    logo_base64: Optional[str] = None
    content: Dict[str, Any]
    business_data: Optional[Dict[str, Any]] = None  # Dati completi azienda per rendering
    # Publishing
    publish_status: str = "draft"  # draft, approved, publishing, published, error
    production_url: Optional[str] = None  # URL Vercel (es: sitename.vercel.app)
    vercel_project_id: Optional[str] = None
    vercel_deployment_id: Optional[str] = None
    # Custom Domain
    custom_domain: Optional[str] = None  # es: www.nomeattivita.it
    domain_status: str = "not_connected"  # not_connected, verifying, active, error
    domain_verification: Optional[List[Dict[str, Any]]] = None  # DNS records to set
    # Quality Check
    quality_check_passed: bool = False
    quality_check_errors: Optional[List[str]] = None
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approved_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

class EmailTemplate(BaseModel):
    recipient_email: str
    subject: str
    html_content: str

class GenerateDemoRequest(BaseModel):
    lead_id: str

class BatchGenerateRequest(BaseModel):
    lead_ids: List[str]

class DashboardStats(BaseModel):
    total_leads: int
    demos_created: int
    contacted: int
    clients_acquired: int
    new_leads: int
    emails_sent: int = 0
    total_revenue: float = 0.0
    paid_revenue: float = 0.0

class ApiSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    setting_id: str = "api_settings"
    google_maps_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ApiSettingsUpdate(BaseModel):
    google_maps_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None

# Mapping paese → codice lingua ISO per i siti generati
COUNTRY_TO_LANG_CODE = {
    # Italia
    "IT": "it", "ITALIA": "it", "ITALY": "it",
    # Francia
    "FR": "fr", "FRANCIA": "fr", "FRANCE": "fr",
    # Spagna
    "ES": "es", "SPAGNA": "es", "SPAIN": "es", "ESPAÑA": "es",
    # Germania
    "DE": "de", "GERMANIA": "de", "GERMANY": "de", "DEUTSCHLAND": "de",
    # Austria (tedesco)
    "AT": "de", "AUSTRIA": "de", "ÖSTERREICH": "de",
    # Svizzera (default tedesco, ma può essere fr)
    "CH": "de", "SVIZZERA": "de", "SWITZERLAND": "de", "SCHWEIZ": "de", "SUISSE": "fr",
    # Belgio (francese)
    "BE": "fr", "BELGIO": "fr", "BELGIUM": "fr", "BELGIQUE": "fr",
    # UK / Irlanda
    "GB": "en", "UK": "en", "REGNO UNITO": "en", "UNITED KINGDOM": "en",
    "IE": "en", "IRLANDA": "en", "IRELAND": "en",
    # USA
    "US": "en", "USA": "en", "STATI UNITI": "en", "UNITED STATES": "en",
    # Portogallo (fallback spagnolo)
    "PT": "es", "PORTOGALLO": "es", "PORTUGAL": "es",
    # Paesi Bassi (fallback inglese)
    "NL": "en", "PAESI BASSI": "en", "NETHERLANDS": "en", "OLANDA": "en"
}

# Mapping codice lingua → nome lingua per prompt LLM
LANG_CODE_TO_NAME = {
    "it": "italiano",
    "fr": "francese", 
    "en": "inglese",
    "es": "spagnolo",
    "de": "tedesco"
}

def get_site_language_from_country(country: str) -> str:
    """Ottiene il codice lingua (it, fr, en, es, de) dal paese"""
    if not country:
        return "it"
    country_upper = country.upper().strip()
    return COUNTRY_TO_LANG_CODE.get(country_upper, "it")

def get_language_name(lang_code: str) -> str:
    """Ottiene il nome della lingua dal codice"""
    return LANG_CODE_TO_NAME.get(lang_code, "italiano")

# Categorie che richiedono prenotazione appuntamento
APPOINTMENT_CATEGORIES = [
    "hair_salon", "parrucchiere", "coiffeur", "friseur", "peluquería",
    "beauty_salon", "estetista", "esthéticienne", "kosmetikstudio", "centro de belleza",
    "dentist", "dentista", "dentiste", "zahnarzt",
    "doctor", "medico", "médecin", "arzt",
    "physiotherapist", "fisioterapista", "kinésithérapeute", "physiotherapeut",
    "spa", "wellness_center", "centro_benessere",
    "nail_salon", "manicure", "massage", "massaggio",
    "tattoo_shop", "tatuatore",
    "veterinarian", "veterinario", "vétérinaire", "tierarzt",
    "psychologist", "psicologo", "psychologue",
    "lawyer", "avvocato", "avocat", "rechtsanwalt",
    "accountant", "commercialista", "comptable",
    "consultant", "consulente",
    "car_repair", "meccanico", "officina", "garage", "autowerkstatt",
    "optician", "ottico", "opticien"
]

# Categorie che richiedono prenotazione tavolo
TABLE_CATEGORIES = [
    "restaurant", "ristorante", "pizzeria", "trattoria", "osteria",
    "steakhouse", "seafood_restaurant", "italian_restaurant", "french_restaurant",
    "japanese_restaurant", "chinese_restaurant", "indian_restaurant", "mexican_restaurant",
    "thai_restaurant", "greek_restaurant", "mediterranean_restaurant",
    "fine_dining_restaurant", "bistro", "brasserie", "gasthaus"
]

# Categorie ESCLUSE da prenotazione (bar, caffè, pub)
NO_BOOKING_CATEGORIES = [
    "bar", "cafe", "coffee_shop", "caffè", "café", "pub", "birreria",
    "wine_bar", "cocktail_bar", "lounge", "nightclub", "discoteca",
    "fast_food_restaurant", "bakery", "panetteria", "boulangerie",
    "ice_cream_shop", "gelateria", "pasticceria", "pâtisserie"
]

def determine_booking_mode(primary_type: str, types: List[str] = None, category: str = None) -> str:
    """
    Determina automaticamente il booking_mode basato su categoria/tipo.
    Returns: 'none', 'appointment', 'table'
    """
    # Normalizza tutti i valori in lowercase
    check_values = []
    if primary_type:
        check_values.append(primary_type.lower())
    if types:
        check_values.extend([t.lower() for t in types])
    if category:
        check_values.append(category.lower())
    
    # Prima controlla se è escluso (bar, caffè, etc.)
    for val in check_values:
        for excluded in NO_BOOKING_CATEGORIES:
            if excluded in val or val in excluded:
                return "none"
    
    # Poi controlla se è ristorante (tavolo)
    for val in check_values:
        for table_cat in TABLE_CATEGORIES:
            if table_cat in val or val in table_cat:
                return "table"
    
    # Infine controlla se è servizio su appuntamento
    for val in check_values:
        for appt_cat in APPOINTMENT_CATEGORIES:
            if appt_cat in val or val in appt_cat:
                return "appointment"
    
    return "none"

# Servizi per categoria e lingua
SERVICES_BY_CATEGORY_LANG = {
    "it": {
        "hair_salon": ["Taglio Donna", "Taglio Uomo", "Piega", "Colore", "Balayage", "Trattamenti Ristrutturanti"],
        "beauty_salon": ["Pulizia Viso", "Trattamenti Anti-età", "Massaggi", "Manicure", "Pedicure", "Epilazione"],
        "dentist": ["Igiene Dentale", "Sbiancamento", "Otturazioni", "Ortodonzia", "Implantologia", "Estrazioni"],
        "gym": ["Sala Pesi", "Corsi Fitness", "Personal Training", "Yoga", "Pilates", "Spinning"],
        "plumber": ["Riparazione Perdite", "Installazione Caldaie", "Manutenzione Impianti", "Spurgo", "Pronto Intervento"],
        "electrician": ["Impianti Elettrici", "Riparazione Guasti", "Domotica", "Illuminazione LED", "Certificazioni"],
        "default": ["Servizio Professionale", "Consulenza Specializzata", "Assistenza Clienti"]
    },
    "fr": {
        "hair_salon": ["Coupe Femme", "Coupe Homme", "Brushing", "Coloration", "Balayage", "Soins Capillaires"],
        "beauty_salon": ["Soin du Visage", "Soins Anti-âge", "Massages", "Manucure", "Pédicure", "Épilation"],
        "dentist": ["Détartrage", "Blanchiment", "Soins Dentaires", "Orthodontie", "Implants", "Extractions"],
        "gym": ["Musculation", "Cours Collectifs", "Coaching Personnel", "Yoga", "Pilates", "Spinning"],
        "plumber": ["Réparation Fuites", "Installation Chaudières", "Entretien", "Débouchage", "Urgences"],
        "electrician": ["Installations Électriques", "Dépannage", "Domotique", "Éclairage LED", "Certifications"],
        "default": ["Service Professionnel", "Conseil Spécialisé", "Assistance Client"]
    },
    "en": {
        "hair_salon": ["Women's Cut", "Men's Cut", "Blow Dry", "Color", "Balayage", "Hair Treatments"],
        "beauty_salon": ["Facial", "Anti-aging Treatments", "Massage", "Manicure", "Pedicure", "Waxing"],
        "dentist": ["Dental Cleaning", "Whitening", "Fillings", "Orthodontics", "Implants", "Extractions"],
        "gym": ["Weight Room", "Fitness Classes", "Personal Training", "Yoga", "Pilates", "Spinning"],
        "plumber": ["Leak Repair", "Boiler Installation", "Maintenance", "Drain Cleaning", "Emergency Service"],
        "electrician": ["Electrical Installations", "Repairs", "Smart Home", "LED Lighting", "Certifications"],
        "default": ["Professional Service", "Specialized Consulting", "Customer Support"]
    },
    "es": {
        "hair_salon": ["Corte Mujer", "Corte Hombre", "Peinado", "Color", "Balayage", "Tratamientos Capilares"],
        "beauty_salon": ["Limpieza Facial", "Tratamientos Anti-edad", "Masajes", "Manicura", "Pedicura", "Depilación"],
        "dentist": ["Limpieza Dental", "Blanqueamiento", "Empastes", "Ortodoncia", "Implantes", "Extracciones"],
        "gym": ["Sala de Pesas", "Clases Colectivas", "Entrenamiento Personal", "Yoga", "Pilates", "Spinning"],
        "plumber": ["Reparación de Fugas", "Instalación Calderas", "Mantenimiento", "Desatascos", "Urgencias"],
        "electrician": ["Instalaciones Eléctricas", "Reparaciones", "Domótica", "Iluminación LED", "Certificaciones"],
        "default": ["Servicio Profesional", "Asesoría Especializada", "Atención al Cliente"]
    },
    "de": {
        "hair_salon": ["Damenhaarschnitt", "Herrenhaarschnitt", "Föhnen", "Färben", "Balayage", "Haarpflege"],
        "beauty_salon": ["Gesichtsbehandlung", "Anti-Aging", "Massage", "Maniküre", "Pediküre", "Enthaarung"],
        "dentist": ["Zahnreinigung", "Bleaching", "Füllungen", "Kieferorthopädie", "Implantate", "Extraktionen"],
        "gym": ["Kraftraum", "Fitnesskurse", "Personal Training", "Yoga", "Pilates", "Spinning"],
        "plumber": ["Leckagereparatur", "Kesselinstallation", "Wartung", "Rohrreinigung", "Notdienst"],
        "electrician": ["Elektroinstallationen", "Reparaturen", "Smart Home", "LED-Beleuchtung", "Zertifizierungen"],
        "default": ["Professioneller Service", "Fachberatung", "Kundenbetreuung"]
    }
}

def get_services_for_category(category: str, primary_type: str, lang_code: str) -> List[str]:
    """Ottiene i servizi nella lingua corretta per la categoria"""
    lang_services = SERVICES_BY_CATEGORY_LANG.get(lang_code, SERVICES_BY_CATEGORY_LANG["it"])
    
    # Cerca prima per primary_type, poi per category
    for key in [primary_type, category.lower() if category else None]:
        if key:
            for service_key in lang_services.keys():
                if service_key != "default" and (service_key in key or key in service_key):
                    return lang_services[service_key]
    
    return lang_services["default"]

async def generate_business_content(business_name: str, category: str, site_language: str, primary_type: str = None) -> Dict[str, Any]:
    """
    Genera contenuti per il sito nella lingua specificata.
    site_language: codice lingua (it, fr, en, es, de)
    """
    try:
        # Determina se è ristorante/bar per generare menu
        is_food_business = primary_type in ["restaurant", "bar", "cafe", "pizza_restaurant"] or category.lower() in ["ristorante", "bar", "pizzeria", "café", "restaurant"]
        
        # Nome lingua per il prompt
        language_name = get_language_name(site_language)
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"content_{uuid.uuid4()}",
            system_message=f"Sei un esperto copywriter. SCRIVI ESCLUSIVAMENTE in {language_name}. Non usare MAI parole di altre lingue."
        ).with_model("openai", "gpt-5.2")

        # Ottieni servizi nella lingua corretta
        base_services = get_services_for_category(category, primary_type, site_language)
        
        if is_food_business:
            # Prompt specifico per lingua per ristoranti
            menu_examples = {
                "it": '{"name": "Colazione", "items": ["Cornetto", "Cappuccino", "Spremuta d\'arancia"]}, {"name": "Pranzo", "items": ["Pasta al pomodoro", "Insalata", "Panino"]}, {"name": "Aperitivo", "items": ["Spritz", "Prosecco", "Stuzzichini"]}',
                "fr": '{"name": "Petit-déjeuner", "items": ["Croissant", "Café au lait", "Jus d\'orange"]}, {"name": "Déjeuner", "items": ["Plat du jour", "Salade", "Sandwich"]}, {"name": "Apéritif", "items": ["Kir", "Vin blanc", "Tapas"]}',
                "en": '{"name": "Breakfast", "items": ["Pastry", "Cappuccino", "Fresh juice"]}, {"name": "Lunch", "items": ["Daily special", "Salad", "Sandwich"]}, {"name": "Happy Hour", "items": ["Cocktails", "Wine", "Appetizers"]}',
                "es": '{"name": "Desayuno", "items": ["Tostada", "Café con leche", "Zumo de naranja"]}, {"name": "Almuerzo", "items": ["Menú del día", "Ensalada", "Bocadillo"]}, {"name": "Aperitivo", "items": ["Vermut", "Vino", "Tapas"]}',
                "de": '{"name": "Frühstück", "items": ["Croissant", "Kaffee", "Orangensaft"]}, {"name": "Mittagessen", "items": ["Tagesgericht", "Salat", "Sandwich"]}, {"name": "Aperitif", "items": ["Cocktails", "Wein", "Snacks"]}'
            }
            
            prompt = f"""Crea contenuti professionali ESCLUSIVAMENTE in {language_name} per: {business_name}
Categoria: {category}

IMPORTANTE: Tutto deve essere in {language_name}. Nessuna parola in altre lingue.

Genera SOLO un oggetto JSON:
{{
  "homepage_title": "titolo accattivante in {language_name}",
  "homepage_subtitle": "sottotitolo breve in {language_name}",
  "about_text": "testo chi siamo (80 parole) in {language_name}",
  "menu_categories": [{menu_examples.get(site_language, menu_examples["it"])}],
  "cta_text": "call to action in {language_name}"
}}

Rispondi SOLO con JSON valido, senza markdown."""
        else:
            services_list = ', '.join(base_services)
            prompt = f"""Crea contenuti professionali ESCLUSIVAMENTE in {language_name} per: {business_name}
Categoria: {category}
Servizi suggeriti: {services_list}

IMPORTANTE: Tutto deve essere in {language_name}. Nessuna parola in altre lingue.

Genera SOLO un oggetto JSON:
{{
  "homepage_title": "titolo accattivante in {language_name}",
  "homepage_subtitle": "sottotitolo breve in {language_name}",
  "about_text": "testo chi siamo (80 parole) in {language_name}",
  "services_intro": "introduzione servizi (40 parole) in {language_name}",
  "cta_text": "call to action in {language_name}"
}}

Rispondi SOLO con JSON valido, senza markdown."""

        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        import json
        content = json.loads(response)
        
        # Se non è food business, aggiungi servizi dalla lista
        if not is_food_business:
            content["services"] = base_services
        
        return content
    except Exception as e:
        logger.error(f"Errore generazione contenuti: {str(e)}")
        # Fallback multilingua
        fallback_content = {
            "it": {
                "welcome": "Benvenuti da",
                "trust": "di fiducia",
                "food_about": "offre un'esperienza culinaria autentica con ingredienti freschi e di qualità.",
                "service_about": "offre servizi professionali di alta qualità.",
                "services_intro": "Scopri tutti i nostri servizi",
                "cta_food": "Prenota Ora",
                "cta_service": "Contattaci Ora",
                "menu": [
                    {"name": "Antipasti", "items": ["Bruschette miste", "Salumi e formaggi", "Insalata caprese"]},
                    {"name": "Primi", "items": ["Pasta al pomodoro", "Risotto ai funghi", "Gnocchi al pesto"]},
                    {"name": "Secondi", "items": ["Bistecca alla griglia", "Pesce del giorno", "Pollo arrosto"]}
                ]
            },
            "fr": {
                "welcome": "Bienvenue chez",
                "trust": "de confiance",
                "food_about": "vous offre une expérience culinaire authentique avec des ingrédients frais et de qualité.",
                "service_about": "offre des services professionnels de haute qualité.",
                "services_intro": "Découvrez tous nos services",
                "cta_food": "Réserver",
                "cta_service": "Nous Contacter",
                "menu": [
                    {"name": "Entrées", "items": ["Charcuterie", "Fromages", "Salade mixte"]},
                    {"name": "Plats", "items": ["Plat du jour", "Steak-frites", "Poisson grillé"]},
                    {"name": "Desserts", "items": ["Crème brûlée", "Tarte du jour", "Mousse au chocolat"]}
                ]
            },
            "en": {
                "welcome": "Welcome to",
                "trust": "you can trust",
                "food_about": "offers an authentic culinary experience with fresh, quality ingredients.",
                "service_about": "offers high quality professional services.",
                "services_intro": "Discover all our services",
                "cta_food": "Book Now",
                "cta_service": "Contact Us",
                "menu": [
                    {"name": "Starters", "items": ["Mixed appetizers", "Seasonal salad", "Soup of the day"]},
                    {"name": "Mains", "items": ["Daily special", "Grilled steak", "Fresh fish"]},
                    {"name": "Desserts", "items": ["Cheesecake", "Ice cream", "Chocolate cake"]}
                ]
            },
            "es": {
                "welcome": "Bienvenidos a",
                "trust": "de confianza",
                "food_about": "ofrece una experiencia culinaria auténtica con ingredientes frescos y de calidad.",
                "service_about": "ofrece servicios profesionales de alta calidad.",
                "services_intro": "Descubre todos nuestros servicios",
                "cta_food": "Reservar",
                "cta_service": "Contáctenos",
                "menu": [
                    {"name": "Entrantes", "items": ["Tapas variadas", "Jamón ibérico", "Ensalada mixta"]},
                    {"name": "Principales", "items": ["Paella", "Carne a la brasa", "Pescado del día"]},
                    {"name": "Postres", "items": ["Flan", "Tarta de queso", "Helado"]}
                ]
            },
            "de": {
                "welcome": "Willkommen bei",
                "trust": "Ihres Vertrauens",
                "food_about": "bietet ein authentisches kulinarisches Erlebnis mit frischen, hochwertigen Zutaten.",
                "service_about": "bietet professionelle Dienstleistungen höchster Qualität.",
                "services_intro": "Entdecken Sie alle unsere Dienstleistungen",
                "cta_food": "Reservieren",
                "cta_service": "Kontaktieren Sie uns",
                "menu": [
                    {"name": "Vorspeisen", "items": ["Gemischte Antipasti", "Tagessuppe", "Salat"]},
                    {"name": "Hauptgerichte", "items": ["Tagesgericht", "Schnitzel", "Fisch"]},
                    {"name": "Nachspeisen", "items": ["Kuchen", "Eis", "Obstsalat"]}
                ]
            }
        }
        
        fb = fallback_content.get(site_language, fallback_content["it"])
        
        if primary_type in ["restaurant", "bar", "cafe"] or category.lower() in ["ristorante", "bar", "restaurant"]:
            return {
                "homepage_title": f"{fb['welcome']} {business_name}",
                "homepage_subtitle": f"{category} {fb['trust']}",
                "about_text": f"{business_name} {fb['food_about']}",
                "menu_categories": fb["menu"],
                "cta_text": fb["cta_food"]
            }
        else:
            return {
                "homepage_title": f"{fb['welcome']} {business_name}",
                "homepage_subtitle": f"{category} {fb['trust']}",
                "about_text": f"{business_name} {fb['service_about']}",
                "services_intro": fb["services_intro"],
                "services": base_services,
                "cta_text": fb["cta_service"]
            }

async def generate_logo(business_name: str) -> Optional[str]:
    try:
        image_gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
        prompt = f"Simple, professional logo for '{business_name}' business, minimalist design, vector style, clean, modern"
        
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            return base64.b64encode(images[0]).decode('utf-8')
        return None
    except Exception as e:
        logger.error(f"Errore generazione logo: {str(e)}")
        return None

@api_router.get("/")
async def root():
    return {"message": "LeadHunter Pro API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint - sempre disponibile, no auth, no DB required"""
    try:
        # Quick DB ping to verify connection
        await db.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "db": db_status,
        "version": "1.0.0",
        "build_version": "2026.05.14-layout-cache-fix",
        "build_features": [
            "clients-page",
            "section-order-editor",
            "search-leads",
            "mark-client-button",
            "quote-3-tax-modes",
            "quote-default-features",
            "quote-dynamic-features",
            "renewals-calendar",
        ]
    }

@api_router.post("/search/companies")
async def search_companies(request: SearchRequest):
    settings = await db.api_settings.find_one({"setting_id": "api_settings"}, {"_id": 0})
    api_key = settings.get('google_maps_api_key') if settings else None
    
    if not api_key and not GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=400, detail="Google Maps API key non configurata. Vai su Impostazioni API per configurarla.")
    
    api_key = api_key or GOOGLE_MAPS_API_KEY
    
    try:
        # Text Search (New) - NON serve geocoding, gestiamo città + paese direttamente
        search_url = "https://places.googleapis.com/v1/places:searchText"
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri"
        }
        
        search_body = {
            "textQuery": f"{request.category} in {request.city}, {request.country}",
            "languageCode": "it"
        }
        
        logger.info(f"Ricerca Google Places: {search_body['textQuery']}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(search_url, json=search_body, headers=headers) as response:
                status_code = response.status
                response_text = await response.text()
                
                logger.info(f"Google API Response Status: {status_code}")
                logger.info(f"Google API Response: {response_text[:500]}")
                
                if status_code != 200:
                    error_detail = {
                        "error": "Errore Google Places API",
                        "status_code": status_code,
                        "message": response_text,
                        "query": search_body['textQuery']
                    }
                    logger.error(f"Google Places API Error: {error_detail}")
                    
                    # Determina tipo errore
                    if status_code == 403:
                        error_detail["user_message"] = "API Key non valida o Places API (New) non abilitata. Verifica su Google Cloud Console."
                    elif status_code == 429:
                        error_detail["user_message"] = "Quota API superata. Controlla limiti su Google Cloud Console."
                    elif "BILLING" in response_text.upper():
                        error_detail["user_message"] = "Billing non configurato. Abilita fatturazione su Google Cloud Console."
                    elif "PERMISSION" in response_text.upper():
                        error_detail["user_message"] = "Permessi insufficienti. Verifica restrizioni API Key."
                    else:
                        error_detail["user_message"] = f"Errore API (Status {status_code}). Vedi dettagli."
                    
                    raise HTTPException(status_code=500, detail=error_detail)
                
                try:
                    search_data = await response.json()
                except:
                    raise HTTPException(status_code=500, detail={
                        "error": "Risposta Google API non valida",
                        "message": "La risposta non è JSON valido",
                        "response": response_text[:200]
                    })
                
                places = search_data.get('places', [])
                logger.info(f"Trovati {len(places)} posti da Google")
                
                if len(places) == 0:
                    # 0 risultati REALI (non errore)
                    return []
                
                leads = []
                filtered_by_reviews = 0
                filtered_by_website = 0
                
                for idx, place in enumerate(places):
                    try:
                        rating = place.get('rating', 0)
                        reviews_count = place.get('userRatingCount', 0)
                        
                        logger.info(f"Posto {idx+1}: rating={rating}, reviews={reviews_count}")
                        
                        # Applica filtri
                        if reviews_count < request.min_reviews or rating < request.min_rating:
                            logger.info(f"Posto {idx+1} filtrato (reviews={reviews_count} < {request.min_reviews} o rating={rating} < {request.min_rating})")
                            filtered_by_reviews += 1
                            continue
                        
                        has_website = place.get('websiteUri') is not None
                        
                        if has_website:
                            logger.info(f"Posto {idx+1} ha già sito web: {place.get('websiteUri')}")
                            filtered_by_website += 1
                            continue
                        
                        if not has_website:
                            place_id = place.get('id')
                            
                            if not place_id:
                                logger.warning(f"Posto {idx+1} senza place_id, skip")
                                continue
                            
                            # Costruisci URL corretto Place Details
                            # Se place_id non inizia con "places/", aggiungilo
                            if not place_id.startswith('places/'):
                                place_details_id = f"places/{place_id}"
                            else:
                                place_details_id = place_id
                            
                            logger.info(f"Recupero dettagli per: {place_details_id}")
                            
                            # Chiama Place Details con lingua locale
                            details_url = f"https://places.googleapis.com/v1/{place_details_id}"
                            
                            # Determina lingua per la richiesta dettagli
                            request_lang = get_site_language_from_country(request.country)
                            
                            details_headers = {
                                "X-Goog-Api-Key": api_key,
                                "X-Goog-FieldMask": "id,displayName,formattedAddress,location,primaryType,types,regularOpeningHours,internationalPhoneNumber,websiteUri,googleMapsUri,rating,userRatingCount,reviews,photos",
                                "X-Goog-FieldMask-Language": request_lang  # Richiedi contenuti nella lingua locale
                            }
                            
                            # Aggiungi languageCode come query param per ottenere contenuti localizzati
                            details_url_with_lang = f"{details_url}?languageCode={request_lang}"
                            
                            async with session.get(details_url_with_lang, headers=details_headers) as details_response:
                                if details_response.status != 200:
                                    logger.error(f"Errore Place Details per {place_id}: {details_response.status}")
                                    continue
                                
                                details = await details_response.json()
                                
                                display_name = details.get('displayName', {})
                                name = display_name.get('text', 'Unknown') if isinstance(display_name, dict) else str(display_name)
                                
                                # Processa foto
                                photos_data = []
                                photos_raw = details.get('photos', [])
                                for photo in photos_raw[:10]:
                                    photo_name = photo.get('name', '')
                                    if photo_name:
                                        photos_data.append({
                                            "name": photo_name,
                                            "url": f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=1200&maxWidthPx=1200&key={api_key}"
                                        })
                                
                                # Processa orari
                                opening_hours = details.get('regularOpeningHours', {})
                                hours_text = opening_hours.get('weekdayDescriptions', [])
                                
                                # Processa recensioni
                                reviews_raw = details.get('reviews', [])
                                reviews_data = []
                                for review in reviews_raw[:5]:
                                    author = review.get('authorAttribution', {})
                                    text_obj = review.get('text', {})
                                    reviews_data.append({
                                        "author": author.get('displayName', 'Anonimo'),
                                        "rating": review.get('rating', 0),
                                        "text": text_obj.get('text', '') if isinstance(text_obj, dict) else str(text_obj),
                                        "time": review.get('publishTime', ''),
                                        "relative_time_description": review.get('relativePublishTimeDescription', '')
                                    })
                                
                                # Location
                                location_data = details.get('location', {})
                                location = {
                                    "lat": location_data.get('latitude'),
                                    "lng": location_data.get('longitude')
                                } if location_data else None
                                
                                # Determina lingua dal paese
                                site_lang = get_site_language_from_country(request.country)
                                
                                # Determina booking mode automaticamente
                                primary_type = details.get('primaryType')
                                types_list = details.get('types', [])
                                booking_mode = determine_booking_mode(primary_type, types_list, request.category)
                                
                                lead = Lead(
                                    place_id=place_id.replace('places/', ''),
                                    name=name,
                                    category=request.category,
                                    address=details.get('formattedAddress', ''),
                                    city=request.city,
                                    country=request.country,
                                    phone=details.get('internationalPhoneNumber'),
                                    rating=rating,
                                    reviews_count=reviews_count,
                                    reviews=reviews_data if reviews_data else None,
                                    hours_text=hours_text if hours_text else None,
                                    photos=photos_data if photos_data else None,
                                    location=location,
                                    google_maps_link=details.get('googleMapsUri'),
                                    website=details.get('websiteUri'),
                                    primary_type=primary_type,
                                    types=types_list,
                                    status="nuovo_lead",
                                    language=site_lang,  # Per compatibilità
                                    site_language=site_lang,
                                    booking_mode=booking_mode
                                )
                                
                                lead_dict = lead.model_dump()
                                lead_dict['created_at'] = lead_dict['created_at'].isoformat()
                                await db.leads.insert_one(lead_dict)
                                leads.append(lead)
                                
                                logger.info(f"Lead creato: {name}")
                    
                    except Exception as e:
                        logger.error(f"Errore processing posto {idx+1}: {str(e)}")
                        continue
                
                logger.info(f"RIEPILOGO RICERCA:")
                logger.info(f"- Totale posti trovati: {len(places)}")
                logger.info(f"- Filtrati per reviews/rating: {filtered_by_reviews}")
                logger.info(f"- Filtrati perché hanno sito: {filtered_by_website}")
                logger.info(f"- Lead creati: {len(leads)}")
                
                if len(leads) == 0 and filtered_by_website > 0:
                    # Tutte le aziende hanno già un sito
                    raise HTTPException(status_code=200, detail={
                        "info": "Tutte le aziende trovate hanno già un sito web",
                        "total_found": len(places),
                        "filtered_by_reviews": filtered_by_reviews,
                        "filtered_by_website": filtered_by_website,
                        "suggestion": "Prova con una città diversa o categoria meno comune"
                    })
                
                return leads
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore generale ricerca: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "error": "Errore imprevisto",
            "message": str(e),
            "type": type(e).__name__
        })

@api_router.get("/leads", response_model=None)
async def get_leads(status: Optional[str] = None, action: Optional[str] = None, days: int = 30):
    # Action dispatch: ?action=upcoming_renewals (parity con Vercel)
    if action == "upcoming_renewals":
        from datetime import timedelta
        today = datetime.now(timezone.utc).date()
        cursor = db.leads.find(
            {"status": {"$in": ["client", "cliente_acquisito"]}},
            {"_id": 0}
        )
        renewals = []
        async for lead in cursor:
            cc = lead.get('client_costs') or {}
            for field, label in [('domain_renewal_date', 'Dominio'), ('hosting_renewal_date', 'Hosting')]:
                d = cc.get(field)
                if not d:
                    continue
                try:
                    dt = datetime.fromisoformat(d).date() if 'T' in d else datetime.strptime(d, '%Y-%m-%d').date()
                except Exception:
                    continue
                days_to = (dt - today).days
                if days_to <= days:
                    renewals.append({
                        "lead_id": lead.get('lead_id'),
                        "name": lead.get('name'),
                        "type": label,
                        "renewal_date": d,
                        "days_to": days_to,
                        "amount": cc.get('domain_price' if field == 'domain_renewal_date' else 'hosting_price', 0),
                        "currency": cc.get('currency', 'EUR'),
                        "phone": lead.get('phone'),
                        "email": lead.get('email'),
                    })
        renewals.sort(key=lambda x: x['days_to'])
        return {"renewals": renewals, "count": len(renewals), "days_window": days}

    query = {} if not status else {"status": status}
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    
    return leads

@api_router.patch("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str):
    result = await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    return {"success": True, "message": "Status aggiornato"}


@api_router.post("/leads")
async def leads_action(request: Request):
    """Endpoint POST con dispatch via query param ?action= per parity con Vercel."""
    try:
        action = request.query_params.get('action')
        body = await request.json() if await request.body() else {}
    except Exception:
        body = {}
        action = request.query_params.get('action')

    if action == "update_lead":
        lead_id = body.get('lead_id')
        if not lead_id:
            raise HTTPException(status_code=400, detail="lead_id richiesto")
        allowed = ['status', 'name', 'phone', 'email', 'notes', 'last_contact_at',
                   'booking_mode', 'external_booking_url', 'site_language', 'category', 'city']
        update_data = {k: body[k] for k in allowed if k in body}
        if not update_data:
            raise HTTPException(status_code=400, detail="Nessun campo aggiornabile")
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        result = await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Lead non trovato")
        return {"success": True, "updated": list(update_data.keys())}

    if action == "delete_lead":
        lead_id = body.get('lead_id')
        if not lead_id:
            raise HTTPException(status_code=400, detail="lead_id richiesto")
        await db.leads.delete_one({"lead_id": lead_id})
        demo = await db.demo_sites.find_one({"lead_id": lead_id})
        if demo:
            demo_id_d = demo.get("demo_id")
            await db.demo_sites.delete_one({"lead_id": lead_id})
            await db.bookings.delete_many({"demo_id": demo_id_d})
            await db.demo_views.delete_many({"demo_id": demo_id_d})
            await db.quotes.delete_many({"demo_id": demo_id_d})
        return {"success": True, "deleted_lead": lead_id}

    if action == "save_client_costs":
        lead_id = body.get('lead_id')
        if not lead_id:
            raise HTTPException(status_code=400, detail="lead_id richiesto")

        def _num(v):
            try:
                return float(v) if v not in (None, '', False) else 0.0
            except Exception:
                return 0.0

        from datetime import timedelta

        payment_date = (body.get('payment_date') or '').strip()[:20]
        domain_renewal = (body.get('domain_renewal_date') or '').strip()[:20]
        hosting_renewal = (body.get('hosting_renewal_date') or '').strip()[:20]
        paid_flag = bool(body.get('paid'))

        if paid_flag and payment_date:
            try:
                pd = datetime.strptime(payment_date[:10], '%Y-%m-%d').date()
                renewal_default = (pd + timedelta(days=365)).strftime('%Y-%m-%d')
                if not domain_renewal:
                    domain_renewal = renewal_default
                if not hosting_renewal:
                    hosting_renewal = renewal_default
            except Exception:
                pass

        costs = {
            "site_price": _num(body.get('site_price')),
            "domain_price": _num(body.get('domain_price')),
            "hosting_price": _num(body.get('hosting_price')),
            "extra_price": _num(body.get('extra_price')),
            "extra_label": (body.get('extra_label') or '').strip()[:80],
            "currency": (body.get('currency') or 'EUR').upper()[:6],
            "notes": (body.get('notes') or '').strip()[:500],
            "paid": paid_flag,
            "payment_date": payment_date,
            "domain_renewal_date": domain_renewal,
            "hosting_renewal_date": hosting_renewal,
            "tax_mode": (body.get('tax_mode') or 'without_vat').strip().lower(),
            "client_vat": (body.get('client_vat') or '').strip()[:30],
            "client_fiscal_code": (body.get('client_fiscal_code') or '').strip()[:30],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if costs["tax_mode"] not in ('with_vat', 'without_vat', 'occasional_no_vat'):
            costs["tax_mode"] = 'without_vat'
        costs["total"] = round(
            costs["site_price"] + costs["domain_price"] + costs["hosting_price"] + costs["extra_price"], 2
        )
        result = await db.leads.update_one(
            {"lead_id": lead_id}, {"$set": {"client_costs": costs}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Lead non trovato")
        return {"success": True, "costs": costs}

    raise HTTPException(status_code=400, detail=f"Azione non riconosciuta: {action}")


@api_router.get("/leads/upcoming_renewals")
async def leads_upcoming_renewals(days: int = 30):
    """Restituisce i clienti acquisiti con scadenze (dominio/hosting) nei prossimi N giorni."""
    from datetime import timedelta
    today = datetime.now(timezone.utc).date()
    cursor = db.leads.find(
        {"status": {"$in": ["client", "cliente_acquisito"]}},
        {"_id": 0}
    )
    renewals = []
    async for lead in cursor:
        cc = lead.get('client_costs') or {}
        for field, label in [('domain_renewal_date', 'Dominio'), ('hosting_renewal_date', 'Hosting')]:
            d = cc.get(field)
            if not d:
                continue
            try:
                dt = datetime.fromisoformat(d).date() if 'T' in d else datetime.strptime(d, '%Y-%m-%d').date()
            except Exception:
                continue
            days_to = (dt - today).days
            if days_to <= days:
                renewals.append({
                    "lead_id": lead.get('lead_id'),
                    "name": lead.get('name'),
                    "type": label,
                    "renewal_date": d,
                    "days_to": days_to,
                    "amount": cc.get('domain_price' if field == 'domain_renewal_date' else 'hosting_price', 0),
                    "currency": cc.get('currency', 'EUR'),
                    "phone": lead.get('phone'),
                    "email": lead.get('email'),
                })
    renewals.sort(key=lambda x: x['days_to'])
    return {"renewals": renewals, "count": len(renewals), "days_window": days}

class LeadStatusUpdate(BaseModel):
    status: str

@api_router.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, update: LeadStatusUpdate):
    """Aggiorna lo stato del lead (supporta body JSON)"""
    result = await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"status": update.status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    return {"success": True, "message": "Status aggiornato", "status": update.status}

class LeadSettingsUpdate(BaseModel):
    site_language: Optional[str] = None
    booking_mode: Optional[str] = None
    external_booking_url: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    tiktok_url: Optional[str] = None

@api_router.patch("/leads/{lead_id}/settings")
async def update_lead_settings(lead_id: str, settings: LeadSettingsUpdate):
    """Aggiorna site_language, booking_mode, external_booking_url e social media del lead"""
    update_data = {}
    
    if settings.site_language is not None:
        if settings.site_language not in ['it', 'fr', 'en', 'es', 'de']:
            raise HTTPException(status_code=400, detail="Lingua non supportata. Usa: it, fr, en, es, de")
        update_data['site_language'] = settings.site_language
        update_data['language'] = settings.site_language  # Per compatibilità
    
    if settings.booking_mode is not None:
        if settings.booking_mode not in ['none', 'appointment', 'table']:
            raise HTTPException(status_code=400, detail="booking_mode non valido. Usa: none, appointment, table")
        update_data['booking_mode'] = settings.booking_mode
    
    if settings.external_booking_url is not None:
        update_data['external_booking_url'] = settings.external_booking_url if settings.external_booking_url else None
    
    # Social Media URLs
    if settings.instagram_url is not None:
        update_data['instagram_url'] = settings.instagram_url if settings.instagram_url else None
    
    if settings.facebook_url is not None:
        update_data['facebook_url'] = settings.facebook_url if settings.facebook_url else None
    
    if settings.tiktok_url is not None:
        update_data['tiktok_url'] = settings.tiktok_url if settings.tiktok_url else None
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    
    result = await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    return {"success": True, "message": "Impostazioni lead aggiornate", "updated": update_data}

@api_router.get("/leads/{lead_id}")
async def get_lead_by_id(lead_id: str):
    """Ottiene un singolo lead per ID"""
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    
    return lead

# Modello per prenotazioni
class BookingRequest(BaseModel):
    demo_id: str
    booking_type: str  # 'table' o 'appointment'
    date: str
    time: str
    name: str
    phone: str
    email: Optional[str] = None
    number_of_people: Optional[int] = None  # Solo per table
    notes: Optional[str] = None

class Booking(BaseModel):
    booking_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    demo_id: str
    lead_id: str
    business_name: str
    booking_type: str
    date: str
    time: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    number_of_people: Optional[int] = None
    notes: Optional[str] = None
    status: str = "pending"  # pending, confirmed, cancelled
    notification_sent: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.post("/bookings")
async def create_booking(request: BookingRequest):
    """Crea una nuova prenotazione"""
    # Trova il demo per ottenere lead_id e business_name
    demo = await db.demo_sites.find_one({"demo_id": request.demo_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovato")
    
    lead = await db.leads.find_one({"lead_id": demo['lead_id']}, {"_id": 0})
    
    booking = Booking(
        demo_id=request.demo_id,
        lead_id=demo['lead_id'],
        business_name=demo['business_name'],
        booking_type=request.booking_type,
        date=request.date,
        time=request.time,
        customer_name=request.name,
        customer_phone=request.phone,
        customer_email=request.email,
        number_of_people=request.number_of_people,
        notes=request.notes
    )
    
    booking_dict = booking.model_dump()
    booking_dict['created_at'] = booking_dict['created_at'].isoformat()
    await db.bookings.insert_one(booking_dict)
    
    # Prova a inviare notifica email se l'azienda ha email
    notification_sent = False
    business_email = lead.get('email') if lead else None
    
    if business_email and RESEND_API_KEY:
        try:
            # Prepara email di notifica
            booking_type_label = "Prenotazione Tavolo" if request.booking_type == "table" else "Prenotazione Appuntamento"
            people_info = f"<p><strong>Persone:</strong> {request.number_of_people}</p>" if request.number_of_people else ""
            
            html_content = f"""
            <h2>Nuova {booking_type_label}</h2>
            <p><strong>Cliente:</strong> {request.name}</p>
            <p><strong>Telefono:</strong> {request.phone}</p>
            {f'<p><strong>Email:</strong> {request.email}</p>' if request.email else ''}
            <p><strong>Data:</strong> {request.date}</p>
            <p><strong>Ora:</strong> {request.time}</p>
            {people_info}
            {f'<p><strong>Note:</strong> {request.notes}</p>' if request.notes else ''}
            <hr>
            <p>Contatta il cliente per confermare la prenotazione.</p>
            """
            
            params = {
                "from": SENDER_EMAIL,
                "to": [business_email],
                "subject": f"Nuova {booking_type_label} - {request.name}",
                "html": html_content
            }
            
            await asyncio.to_thread(resend.Emails.send, params)
            notification_sent = True
            
            # Aggiorna booking con notifica inviata
            await db.bookings.update_one(
                {"booking_id": booking.booking_id},
                {"$set": {"notification_sent": True}}
            )
        except Exception as e:
            logger.error(f"Errore invio notifica prenotazione: {str(e)}")
    
    return {
        "success": True,
        "booking_id": booking.booking_id,
        "notification_sent": notification_sent,
        "message": "Prenotazione registrata" + (" e notifica inviata" if notification_sent else "")
    }

@api_router.get("/bookings")
async def get_bookings(lead_id: Optional[str] = None):
    """Ottiene le prenotazioni, opzionalmente filtrate per lead_id"""
    query = {"lead_id": lead_id} if lead_id else {}
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bookings

@api_router.post("/demo/generate", response_model=DemoSite)
async def generate_demo_site(request: GenerateDemoRequest):
    lead = await db.leads.find_one({"lead_id": request.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    business_name = lead['name']
    category = lead['category']
    # Usa site_language (codice) invece di language (nome)
    site_language = lead.get('site_language', lead.get('language', 'it'))
    # Normalizza: se è un nome lingua, converti a codice
    if site_language in ['italiano', 'francese', 'inglese', 'spagnolo', 'tedesco']:
        lang_to_code = {'italiano': 'it', 'francese': 'fr', 'inglese': 'en', 'spagnolo': 'es', 'tedesco': 'de'}
        site_language = lang_to_code.get(site_language, 'it')
    
    primary_type = lead.get('primary_type')
    booking_mode = lead.get('booking_mode', 'none')
    external_booking_url = lead.get('external_booking_url')
    
    content = await generate_business_content(business_name, category, site_language, primary_type)
    logo_base64 = await generate_logo(business_name)
    
    # URL interno (non Vercel)
    demo_id = str(uuid.uuid4())
    demo_url = f"/demo/{demo_id}"
    
    # Salva dati completi azienda per rendering
    business_data = {
        "place_id": lead.get('place_id'),
        "name": lead.get('name'),
        "category": lead.get('category'),
        "address": lead.get('address'),
        "city": lead.get('city'),
        "country": lead.get('country'),
        "phone": lead.get('phone'),
        "email": lead.get('email'),
        "rating": lead.get('rating'),
        "reviews_count": lead.get('reviews_count'),
        "reviews": lead.get('reviews', []),
        "hours_text": lead.get('hours_text', []),
        "photos": lead.get('photos', []),
        "location": lead.get('location'),
        "google_maps_link": lead.get('google_maps_link'),
        "website": lead.get('website'),
        "primary_type": lead.get('primary_type'),
        "types": lead.get('types', []),
        "site_language": site_language,
        "booking_mode": booking_mode,
        "external_booking_url": external_booking_url
    }
    
    demo = DemoSite(
        demo_id=demo_id,
        lead_id=request.lead_id,
        business_name=business_name,
        demo_url=demo_url,
        logo_base64=logo_base64,
        content=content,
        business_data=business_data,
        publish_status="draft"
    )
    
    demo_dict = demo.model_dump()
    demo_dict['created_at'] = demo_dict['created_at'].isoformat()
    demo_dict['published_at'] = None
    await db.demo_sites.insert_one(demo_dict)
    
    await db.leads.update_one(
        {"lead_id": request.lead_id},
        {"$set": {"status": "demo_creata"}}
    )
    
    return demo

@api_router.post("/demo/batch")
async def generate_batch_demos(request: BatchGenerateRequest):
    """Genera demo per più lead in sequenza e ritorna lo stesso shape della funzione Vercel."""
    results = {"created": [], "skipped": [], "errors": []}
    for lead_id in request.lead_ids:
        try:
            existing = await db.demo_sites.find_one({"lead_id": lead_id}, {"_id": 0, "demo_id": 1})
            if existing:
                lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0, "name": 1})
                results["skipped"].append({
                    "lead_id": lead_id,
                    "demo_id": existing.get("demo_id"),
                    "name": (lead or {}).get("name"),
                    "reason": "Demo già esistente"
                })
                continue
            demo = await generate_demo_site(GenerateDemoRequest(lead_id=lead_id))
            results["created"].append({
                "lead_id": lead_id,
                "demo_id": getattr(demo, "demo_id", None),
                "name": getattr(demo, "business_name", None)
            })
        except HTTPException as he:
            results["errors"].append({"lead_id": lead_id, "error": str(he.detail)})
        except Exception as e:
            logger.error(f"Errore generazione demo {lead_id}: {str(e)}")
            results["errors"].append({"lead_id": lead_id, "error": str(e)})
    return {
        "message": f"Batch completato: {len(results['created'])} demo creati",
        "count": len(results["created"]),
        "results": results
    }

@api_router.get("/demos/{demo_id}")
async def get_demo_by_id(demo_id: str):
    demo = await db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovato")
    
    if isinstance(demo.get('created_at'), str):
        demo['created_at'] = datetime.fromisoformat(demo['created_at'])
    
    # Ensure business_data has social links from lead if not present
    business_data = demo.get('business_data', {})
    if not business_data.get('instagram_url') and not business_data.get('facebook_url') and not business_data.get('tiktok_url'):
        lead_id = demo.get('lead_id')
        if lead_id:
            lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
            if lead:
                if lead.get('instagram_url'):
                    business_data['instagram_url'] = lead['instagram_url']
                if lead.get('facebook_url'):
                    business_data['facebook_url'] = lead['facebook_url']
                if lead.get('tiktok_url'):
                    business_data['tiktok_url'] = lead['tiktok_url']
                demo['business_data'] = business_data
    
    return demo

@api_router.get("/demos", response_model=List[DemoSite])
async def get_demos():
    demos = await db.demo_sites.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for demo in demos:
        if isinstance(demo.get('created_at'), str):
            demo['created_at'] = datetime.fromisoformat(demo['created_at'])
    
    return demos

@api_router.delete("/demos/{demo_id}")
async def delete_demo(demo_id: str):
    """Elimina un sito demo"""
    demo = await db.demo_sites.find_one({"demo_id": demo_id})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovata")
    
    # Delete the demo
    result = await db.demo_sites.delete_one({"demo_id": demo_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Errore durante l'eliminazione")
    
    logger.info(f"Demo {demo_id} eliminata: {demo.get('business_name', 'N/A')}")
    
    return {"success": True, "message": "Demo eliminata con successo"}

@api_router.post("/email/generate")
async def generate_email(lead_id: str, demo_url: str):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    business_name = lead['name']
    language = lead.get('language', 'italiano')
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"email_{uuid.uuid4()}",
        system_message=f"Sei un esperto di email marketing che scrive email professionali in {language}."
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Scrivi un'email professionale in {language} per contattare {business_name}.

Obiettivo: presentare il sito web demo che abbiamo creato per loro.

Includere:
- Presentazione del servizio
- Spiegazione del sito creato
- Link al demo: {demo_url}
- Invito a contattare per attivare il sito ufficiale

Tono: professionale ma amichevole.

Rispondi con JSON: {{"subject": "...", "body": "..."}}  """

    message = UserMessage(text=prompt)
    response = await chat.send_message(message)
    
    import json
    email_data = json.loads(response)
    
    return email_data

@api_router.post("/email/send")
async def send_email(template: EmailTemplate):
    settings = await db.api_settings.find_one({"setting_id": "api_settings"}, {"_id": 0})
    api_key = settings.get('resend_api_key') if settings else None
    
    if not api_key and not RESEND_API_KEY:
        raise HTTPException(status_code=400, detail="Resend API key non configurata. Vai su Impostazioni API per configurarla.")
    
    if api_key:
        resend.api_key = api_key
    
    params = {
        "from": SENDER_EMAIL,
        "to": [template.recipient_email],
        "subject": template.subject,
        "html": template.html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        
        # Salva record email inviata
        email_record = {
            "email_id": email.get("id"),
            "recipient": template.recipient_email,
            "subject": template.subject,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "status": "sent"
        }
        await db.emails_sent.insert_one(email_record)
        
        return {"success": True, "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Errore invio email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore invio email: {str(e)}")

STANDARD_WHATSAPP_TEMPLATE = """Buongiorno! 👋
Mi chiamo {founder_name} e sono il fondatore di {company_name}, un progetto che aiuta attività locali a migliorare la propria presenza online con siti web moderni e ottimizzati per smartphone 🚀

Ho trovato la vostra attività su Google Maps e ho creato un esempio veloce di come potrebbe apparire con un sito professionale:

Link: {demo_url}

Qui trovate anche alcuni esempi e demo pubblicate su Instagram:
@{instagram_handle}

Se vi fa piacere posso anche personalizzarlo gratuitamente con i vostri colori, servizi e stile 🙂

Buona giornata!"""


@api_router.post("/whatsapp/generate")
async def generate_whatsapp_message(lead_id: str, demo_url: str, regenerate: int = 0):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")

    business_name = lead.get('name', 'la tua attività')

    # Sender profile (founder details)
    profile = await db.user_settings.find_one({"setting_id": "invoice_profile"}, {"_id": 0}) or {}
    founder_name = profile.get('founder_name') or profile.get('owner_name') or 'Andrea'
    company_name = profile.get('company_name') or 'WebFinder Studio'
    instagram_handle = (profile.get('instagram_handle') or 'webfinderstudio').lstrip('@')

    standard_msg = STANDARD_WHATSAPP_TEMPLATE.format(
        founder_name=founder_name,
        company_name=company_name,
        demo_url=demo_url,
        instagram_handle=instagram_handle,
    )

    if regenerate <= 0:
        return {"message": standard_msg, "variant": "standard"}

    # Variante AI: riformula mantenendo la struttura
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"whatsapp_{uuid.uuid4()}",
            system_message="Sei un copywriter italiano specializzato in messaggi WhatsApp cordiali e professionali."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        prompt = (
            f"Riscrivi questo messaggio WhatsApp mantenendo struttura, tono cordiale ed emoji simili, "
            f"ma con parole leggermente diverse per evitare ripetizioni. NON modificare il link demo "
            f"({demo_url}), il nome del founder ({founder_name}), il nome della società ({company_name}) "
            f"e l'handle Instagram (@{instagram_handle}). Personalizza eventualmente con il nome attività "
            f"\"{business_name}\". Rispondi SOLO con il messaggio finale, senza preamboli.\n\n"
            f"Messaggio originale:\n{standard_msg}"
        )
        response = await chat.send_message(UserMessage(text=prompt))
        return {"message": response.strip() if isinstance(response, str) else str(response).strip(), "variant": "ai"}
    except Exception as e:
        logger.error(f"WhatsApp LLM variant error: {e}")
        return {"message": standard_msg, "variant": "standard_fallback"}

@api_router.get("/stats/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    total_leads = await db.leads.count_documents({})
    demos_created = await db.demo_sites.count_documents({})
    # Support both English and Italian status values
    contacted = await db.leads.count_documents({"status": {"$in": ["contacted", "contattato"]}})
    clients = await db.leads.count_documents({"status": {"$in": ["client", "cliente_acquisito"]}})
    new_leads = await db.leads.count_documents({"status": {"$in": ["new", "nuovo_lead"]}})
    emails_sent = await db.emails_sent.count_documents({})

    # Revenue totale (somma client_costs.total) dei clienti acquisiti
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
    total_revenue = 0.0
    paid_revenue = 0.0
    async for doc in db.leads.aggregate(revenue_pipeline):
        total_revenue = round(float(doc.get('total_revenue') or 0), 2)
        paid_revenue = round(float(doc.get('paid_revenue') or 0), 2)
        break

    return DashboardStats(
        total_leads=total_leads,
        demos_created=demos_created,
        contacted=contacted,
        clients_acquired=clients,
        new_leads=new_leads,
        emails_sent=emails_sent,
        total_revenue=total_revenue,
        paid_revenue=paid_revenue,
    )

@api_router.get("/settings/api", response_model=ApiSettings)
async def get_api_settings():
    settings = await db.api_settings.find_one({"setting_id": "api_settings"}, {"_id": 0})
    
    if not settings:
        default_settings = ApiSettings()
        settings_dict = default_settings.model_dump()
        settings_dict['updated_at'] = settings_dict['updated_at'].isoformat()
        await db.api_settings.insert_one(settings_dict)
        return default_settings
    
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    
    return ApiSettings(**settings)

@api_router.post("/settings/test-google-api")
async def test_google_api():
    """Test Google Places API con richiesta semplice"""
    settings = await db.api_settings.find_one({"setting_id": "api_settings"}, {"_id": 0})
    api_key = settings.get('google_maps_api_key') if settings else GOOGLE_MAPS_API_KEY
    
    if not api_key:
        return {
            "success": False,
            "error": "Google Maps API Key non configurata"
        }
    
    try:
        search_url = "https://places.googleapis.com/v1/places:searchText"
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "places.id,places.displayName"
        }
        
        search_body = {
            "textQuery": "restaurant in Paris, France"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(search_url, json=search_body, headers=headers) as response:
                status_code = response.status
                response_text = await response.text()
                
                if status_code == 200:
                    data = await response.json()
                    places_count = len(data.get('places', []))
                    return {
                        "success": True,
                        "message": f"API funzionante! Trovati {places_count} ristoranti a Parigi.",
                        "status_code": status_code,
                        "places_found": places_count
                    }
                else:
                    # Determina errore specifico
                    error_msg = "Errore sconosciuto"
                    if status_code == 403:
                        error_msg = "API Key non valida o Places API (New) non abilitata"
                    elif status_code == 429:
                        error_msg = "Quota API superata"
                    elif "BILLING" in response_text.upper():
                        error_msg = "Billing non configurato su Google Cloud"
                    elif "PERMISSION" in response_text.upper():
                        error_msg = "Permessi API insufficienti"
                    
                    return {
                        "success": False,
                        "error": error_msg,
                        "status_code": status_code,
                        "response": response_text[:300],
                        "instructions": "Vai su https://console.cloud.google.com per risolvere"
                    }
    
    except Exception as e:
        logger.error(f"Errore test API: {str(e)}")
        return {
            "success": False,
            "error": f"Errore connessione: {str(e)}"
        }

@api_router.put("/settings/api")
async def update_api_settings(settings_update: ApiSettingsUpdate):
    settings = await db.api_settings.find_one({"setting_id": "api_settings"})
    
    update_data = {}
    if settings_update.google_maps_api_key is not None:
        update_data['google_maps_api_key'] = settings_update.google_maps_api_key
    if settings_update.resend_api_key is not None:
        update_data['resend_api_key'] = settings_update.resend_api_key
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if not settings:
        new_settings = ApiSettings(
            google_maps_api_key=settings_update.google_maps_api_key,
            resend_api_key=settings_update.resend_api_key
        )
        settings_dict = new_settings.model_dump()
        settings_dict['updated_at'] = settings_dict['updated_at'].isoformat()
        await db.api_settings.insert_one(settings_dict)
    else:
        await db.api_settings.update_one(
            {"setting_id": "api_settings"},
            {"$set": update_data}
        )
    
    return {"success": True, "message": "Impostazioni API aggiornate con successo"}

# ============================================
# VERCEL PUBLISHING SYSTEM
# ============================================

# Import HTML generator
from html_generator import generate_static_html, STATIC_TRANSLATIONS

# Nomi delle lingue per prompt LLM
LANG_NAMES_FOR_TRANSLATION = {
    "it": "italiano",
    "fr": "francese",
    "es": "spagnolo",
    "de": "tedesco",
    "en": "inglese"
}

async def translate_reviews(reviews: List[Dict], target_lang: str) -> List[Dict]:
    """Traduce le recensioni nella lingua target usando LLM"""
    if not reviews or target_lang == 'en':
        return reviews
    
    lang_name = LANG_NAMES_FOR_TRANSLATION.get(target_lang, "italiano")
    
    # Traduzioni per il tempo relativo
    time_translations = {
        "it": {
            "year": "anno", "years": "anni", 
            "month": "mese", "months": "mesi",
            "week": "settimana", "weeks": "settimane",
            "day": "giorno", "days": "giorni",
            "hour": "ora", "hours": "ore",
            "ago": "fa", "a": "un"
        },
        "fr": {
            "year": "an", "years": "ans",
            "month": "mois", "months": "mois",
            "week": "semaine", "weeks": "semaines",
            "day": "jour", "days": "jours",
            "hour": "heure", "hours": "heures",
            "ago": "", "a": "il y a un"
        },
        "es": {
            "year": "año", "years": "años",
            "month": "mes", "months": "meses",
            "week": "semana", "weeks": "semanas",
            "day": "día", "days": "días",
            "hour": "hora", "hours": "horas",
            "ago": "", "a": "hace un"
        },
        "de": {
            "year": "Jahr", "years": "Jahren",
            "month": "Monat", "months": "Monaten",
            "week": "Woche", "weeks": "Wochen",
            "day": "Tag", "days": "Tagen",
            "hour": "Stunde", "hours": "Stunden",
            "ago": "", "a": "vor einem"
        }
    }
    
    def translate_relative_time(time_str: str, lang: str) -> str:
        """Traduce '3 years ago' in '3 anni fa'"""
        if not time_str or lang == 'en':
            return time_str
        
        trans = time_translations.get(lang, {})
        if not trans:
            return time_str
        
        result = time_str
        # Pattern: "X years/months/weeks/days/hours ago" o "a year/month ago"
        
        # Gestisci "a year ago" -> "un anno fa"
        if result.startswith("a "):
            for en, local in [("a year", f"un {trans.get('year', 'anno')}"),
                              ("a month", f"un {trans.get('month', 'mese')}"),
                              ("a week", f"una {trans.get('week', 'settimana')}"),
                              ("a day", f"un {trans.get('day', 'giorno')}"),
                              ("a hour", f"un'{trans.get('hour', 'ora')}")]:
                result = result.replace(en, local)
        
        # Gestisci numeri: "3 years ago" -> "3 anni fa"
        for en, local in [("years", trans.get('years', 'anni')),
                          ("year", trans.get('year', 'anno')),
                          ("months", trans.get('months', 'mesi')),
                          ("month", trans.get('month', 'mese')),
                          ("weeks", trans.get('weeks', 'settimane')),
                          ("week", trans.get('week', 'settimana')),
                          ("days", trans.get('days', 'giorni')),
                          ("day", trans.get('day', 'giorno')),
                          ("hours", trans.get('hours', 'ore')),
                          ("hour", trans.get('hour', 'ora'))]:
            result = result.replace(en, local)
        
        result = result.replace(" ago", f" {trans.get('ago', 'fa')}")
        return result.strip()
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"translate_reviews_{uuid.uuid4()}",
            system_message=f"Sei un traduttore esperto. Traduci il testo in {lang_name} mantenendo un tono naturale da recensione cliente. Rispondi SOLO con il JSON."
        ).with_model("openai", "gpt-5.2")
        
        # Ordina per data più recente (se disponibile) e prendi le prime 4
        sorted_reviews = sorted(reviews, key=lambda r: r.get('time', '') or r.get('publishTime', '') or '', reverse=True)[:4]
        
        # Prepara testi da tradurre
        texts_to_translate = [r.get('text', '')[:250] for r in sorted_reviews if r.get('text')]
        
        if not texts_to_translate:
            return sorted_reviews
        
        prompt = f"""Traduci queste recensioni clienti in {lang_name}. Mantieni lo stile naturale e colloquiale.

Testi da tradurre:
{json.dumps(texts_to_translate, ensure_ascii=False)}

Rispondi SOLO con un array JSON di stringhe tradotte nello stesso ordine:"""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        # Pulisci la risposta (rimuovi markdown se presente)
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = re.sub(r'^```(?:json)?\s*', '', clean_response)
            clean_response = re.sub(r'\s*```$', '', clean_response)
        
        # Parse risposta
        translated_texts = json.loads(clean_response)
        
        # Ricostruisci recensioni con testo tradotto e tempo tradotto
        translated_reviews = []
        for i, review in enumerate(sorted_reviews):
            new_review = {**review}
            if i < len(translated_texts):
                new_review['text'] = translated_texts[i]
            # Traduci anche il tempo relativo (supporta entrambi i formati)
            time_desc = review.get('relative_time_description') or review.get('time', '')
            if time_desc and any(word in time_desc.lower() for word in ['ago', 'year', 'month', 'week', 'day', 'hour']):
                new_review['relative_time_description'] = translate_relative_time(time_desc, target_lang)
            translated_reviews.append(new_review)
        
        logger.info(f"Tradotte {len(translated_reviews)} recensioni in {lang_name}")
        return translated_reviews
        
    except Exception as e:
        logger.error(f"Errore traduzione recensioni: {str(e)}")
        # Traduci almeno il tempo relativo anche se la traduzione del testo fallisce
        fallback_reviews = []
        for review in sorted(reviews, key=lambda r: r.get('time', '') or '', reverse=True)[:4]:
            new_review = {**review}
            time_desc = review.get('relative_time_description') or review.get('time', '')
            if time_desc and any(word in time_desc.lower() for word in ['ago', 'year', 'month', 'week', 'day', 'hour']):
                new_review['relative_time_description'] = translate_relative_time(time_desc, target_lang)
            fallback_reviews.append(new_review)
        return fallback_reviews

def run_quality_check(demo: Dict, locale_lang: str) -> Dict:
    """Esegue quality check pre-deploy"""
    errors = []
    warnings = []
    
    business = demo.get('business_data', {})
    content = demo.get('content', {})
    
    # 1. Check watermark/branding (nel contenuto generato)
    all_text = json.dumps(content).lower()
    if 'emergent' in all_text:
        errors.append("Trovato riferimento a 'Emergent' nel contenuto")
    
    # 2. Check WhatsApp link valido
    phone = business.get('phone')
    if phone:
        try:
            parsed = phonenumbers.parse(phone, None)
            if not phonenumbers.is_valid_number(parsed):
                warnings.append("Numero telefono potrebbe non essere valido per WhatsApp")
        except:
            warnings.append("Impossibile validare formato numero telefono")
    else:
        warnings.append("Nessun numero telefono - WhatsApp non disponibile")
    
    # 3. Check mix lingue (controllo base)
    if locale_lang != 'en':
        about_text = content.get('about_text', '').lower()
        english_markers = ['welcome', 'about us', 'our services', 'contact us', 'opening hours']
        for marker in english_markers:
            if marker in about_text:
                warnings.append(f"Possibile mix lingue: trovato '{marker}' in contenuto {locale_lang}")
    
    # 4. Check dati obbligatori
    if not business.get('name'):
        errors.append("Nome azienda mancante")
    if not business.get('address'):
        warnings.append("Indirizzo mancante")
    
    passed = len(errors) == 0
    
    return {
        "passed": passed,
        "errors": errors,
        "warnings": warnings,
        "locale_lang": locale_lang,
        "has_whatsapp": bool(phone),
        "has_photos": len(business.get('photos') or []) > 0,
        "has_reviews": len(business.get('reviews') or []) > 0
    }

async def deploy_to_vercel(demo: Dict, demo_id: str) -> Dict:
    """Deploya il sito su Vercel"""
    if not VERCEL_TOKEN:
        return {"success": False, "error": "Token Vercel non configurato"}
    
    business = demo.get('business_data', {}) or {}
    locale_lang = business.get('site_language') or 'it'  # Fallback se None
    
    # Traduci le recensioni nella lingua locale se non è inglese
    demo_locale = demo.copy()
    if locale_lang != 'en':
        reviews = business.get('reviews', []) or []
        if reviews:
            try:
                translated_reviews = await translate_reviews(reviews, locale_lang)
                demo_locale['business_data'] = {**business, 'reviews': translated_reviews}
                logger.info(f"Recensioni tradotte in {locale_lang}")
            except Exception as e:
                logger.error(f"Errore traduzione recensioni: {e}")
                # Usa recensioni originali se traduzione fallisce
    
    # Genera HTML per entrambe le lingue
    html_locale = generate_static_html(demo_locale, locale_lang)
    html_en = generate_static_html(demo, 'en')  # EN usa recensioni originali (già in inglese)
    
    # Crea nome progetto (slug)
    business_name = demo.get('business_name', 'site')
    project_name = re.sub(r'[^a-z0-9-]', '', business_name.lower().replace(' ', '-'))[:50]
    project_name = f"{project_name}-{demo_id[:8]}"
    
    # Prepara i file per Vercel (con encoding base64 esplicito)
    files = [
        {
            "file": "index.html",
            "data": base64.b64encode(html_locale.encode()).decode(),
            "encoding": "base64"
        },
        {
            "file": "en.html",
            "data": base64.b64encode(html_en.encode()).decode(),
            "encoding": "base64"
        },
        {
            "file": "vercel.json",
            "data": base64.b64encode(json.dumps({
                "routes": [
                    {"src": "/en", "dest": "/en.html"},
                    {"src": "/", "dest": "/index.html"}
                ],
                "public": True
            }).encode()).decode(),
            "encoding": "base64"
        }
    ]
    
    try:
        async with aiohttp.ClientSession() as session:
            # Deploy con target production per evitare protection
            deploy_response = await session.post(
                "https://api.vercel.com/v13/deployments",
                headers={
                    "Authorization": f"Bearer {VERCEL_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={
                    "name": project_name,
                    "files": files,
                    "projectSettings": {
                        "framework": None,
                        "skipGitConnectDuringLink": True
                    },
                    "target": "production"
                }
            )
            
            if deploy_response.status not in [200, 201]:
                error_text = await deploy_response.text()
                logger.error(f"Vercel deploy error: {error_text}")
                return {"success": False, "error": f"Errore Vercel: {error_text[:200]}"}
            
            deploy_data = await deploy_response.json()
            project_id = deploy_data.get('projectId')
            
            # Prova a disabilitare la deployment protection
            if project_id:
                try:
                    await session.patch(
                        f"https://api.vercel.com/v9/projects/{project_id}",
                        headers={
                            "Authorization": f"Bearer {VERCEL_TOKEN}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "ssoProtection": None,
                            "passwordProtection": None
                        }
                    )
                except:
                    pass  # Ignora errori di settings
            
            return {
                "success": True,
                "url": f"https://{deploy_data.get('url', '')}",
                "project_id": project_id,
                "deployment_id": deploy_data.get('id'),
                "project_name": project_name
            }
    except Exception as e:
        logger.error(f"Errore deploy Vercel: {str(e)}")
        return {"success": False, "error": str(e)}

async def add_domain_to_vercel(project_id: str, domain: str) -> Dict:
    """Aggiunge un dominio custom al progetto Vercel"""
    if not VERCEL_TOKEN:
        return {"success": False, "error": "Token Vercel non configurato"}
    
    try:
        async with aiohttp.ClientSession() as session:
            response = await session.post(
                f"https://api.vercel.com/v10/projects/{project_id}/domains",
                headers={
                    "Authorization": f"Bearer {VERCEL_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={"name": domain}
            )
            
            if response.status not in [200, 201]:
                error_text = await response.text()
                return {"success": False, "error": error_text}
            
            data = await response.json()
            
            # Ottieni info verifica DNS
            verification = data.get('verification', [])
            
            return {
                "success": True,
                "domain": domain,
                "verified": data.get('verified', False),
                "verification": verification
            }
    except Exception as e:
        return {"success": False, "error": str(e)}

# ============================================
# PUBLISHING ENDPOINTS
# ============================================

class PublishRequest(BaseModel):
    demo_id: str

class DomainRequest(BaseModel):
    domain: str

@api_router.post("/demos/{demo_id}/quality-check")
async def quality_check(demo_id: str):
    """Esegue quality check pre-pubblicazione"""
    demo = await db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovato")
    
    business = demo.get('business_data', {})
    locale_lang = business.get('site_language', 'it')
    
    result = run_quality_check(demo, locale_lang)
    
    # Salva risultato
    await db.demo_sites.update_one(
        {"demo_id": demo_id},
        {"$set": {
            "quality_check_passed": result['passed'],
            "quality_check_errors": result['errors'] + result['warnings']
        }}
    )
    
    return result

@api_router.post("/demos/{demo_id}/approve")
async def approve_demo(demo_id: str):
    """Approva un demo per la pubblicazione"""
    demo = await db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovato")
    
    # Esegui quality check
    business = demo.get('business_data', {})
    locale_lang = business.get('site_language', 'it')
    qc = run_quality_check(demo, locale_lang)
    
    if not qc['passed']:
        raise HTTPException(status_code=400, detail=f"Quality check fallito: {', '.join(qc['errors'])}")
    
    await db.demo_sites.update_one(
        {"demo_id": demo_id},
        {"$set": {
            "publish_status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "quality_check_passed": True,
            "quality_check_errors": qc.get('warnings', [])
        }}
    )
    
    return {"success": True, "message": "Demo approvato per la pubblicazione", "quality_check": qc}

@api_router.post("/demos/{demo_id}/publish")
async def publish_demo(demo_id: str, background_tasks: BackgroundTasks):
    """Pubblica un demo su Vercel"""
    demo = await db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovato")
    
    # Verifica che sia approvato
    if demo.get('publish_status') not in ['approved', 'published', 'error']:
        # Auto-approva se quality check passa
        business = demo.get('business_data', {})
        locale_lang = business.get('site_language', 'it')
        qc = run_quality_check(demo, locale_lang)
        if not qc['passed']:
            raise HTTPException(status_code=400, detail=f"Approva prima il demo o risolvi errori: {', '.join(qc['errors'])}")
    
    # Imposta stato publishing
    await db.demo_sites.update_one(
        {"demo_id": demo_id},
        {"$set": {"publish_status": "publishing"}}
    )
    
    # Deploy su Vercel
    result = await deploy_to_vercel(demo, demo_id)
    
    if result['success']:
        await db.demo_sites.update_one(
            {"demo_id": demo_id},
            {"$set": {
                "publish_status": "published",
                "production_url": result['url'],
                "vercel_project_id": result['project_id'],
                "vercel_deployment_id": result['deployment_id'],
                "published_at": datetime.now(timezone.utc).isoformat(),
                "quality_check_errors": []  # Pulisci vecchi errori dopo successo
            }}
        )
        
        # Aggiorna stato lead
        await db.leads.update_one(
            {"lead_id": demo['lead_id']},
            {"$set": {"status": "demo_pubblicata"}}
        )
        
        return {
            "success": True,
            "production_url": result['url'],
            "message": "Sito pubblicato con successo!"
        }
    else:
        await db.demo_sites.update_one(
            {"demo_id": demo_id},
            {"$set": {
                "publish_status": "error",
                "quality_check_errors": [result['error']]
            }}
        )
        raise HTTPException(status_code=500, detail=result['error'])

@api_router.post("/demos/{demo_id}/domain")
async def add_custom_domain(demo_id: str, request: DomainRequest):
    """Aggiunge un dominio custom al sito pubblicato"""
    demo = await db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovato")
    
    if demo.get('publish_status') != 'published':
        raise HTTPException(status_code=400, detail="Pubblica prima il sito su Vercel")
    
    project_id = demo.get('vercel_project_id')
    if not project_id:
        raise HTTPException(status_code=400, detail="Project ID Vercel mancante")
    
    # Pulisci dominio
    domain = request.domain.lower().strip()
    if not domain:
        raise HTTPException(status_code=400, detail="Dominio non valido")
    
    # Rimuovi protocollo se presente
    domain = domain.replace('https://', '').replace('http://', '').rstrip('/')
    
    result = await add_domain_to_vercel(project_id, domain)
    
    if result['success']:
        await db.demo_sites.update_one(
            {"demo_id": demo_id},
            {"$set": {
                "custom_domain": domain,
                "domain_status": "verifying" if not result['verified'] else "active",
                "domain_verification": result.get('verification', [])
            }}
        )
        
        return {
            "success": True,
            "domain": domain,
            "verified": result['verified'],
            "dns_records": result.get('verification', []),
            "instructions": "Configura i seguenti record DNS presso il tuo provider:" if not result['verified'] else "Dominio attivo!"
        }
    else:
        raise HTTPException(status_code=500, detail=result['error'])

@api_router.get("/demos/{demo_id}/domain-status")
async def check_domain_status(demo_id: str):
    """Verifica lo stato del dominio custom"""
    demo = await db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovato")
    
    project_id = demo.get('vercel_project_id')
    domain = demo.get('custom_domain')
    
    if not project_id or not domain:
        return {"status": "not_configured", "domain": None}
    
    try:
        async with aiohttp.ClientSession() as session:
            response = await session.get(
                f"https://api.vercel.com/v9/projects/{project_id}/domains/{domain}",
                headers={"Authorization": f"Bearer {VERCEL_TOKEN}"}
            )
            
            if response.status == 200:
                data = await response.json()
                verified = data.get('verified', False)
                
                if verified and demo.get('domain_status') != 'active':
                    await db.demo_sites.update_one(
                        {"demo_id": demo_id},
                        {"$set": {"domain_status": "active"}}
                    )
                
                return {
                    "status": "active" if verified else "verifying",
                    "domain": domain,
                    "verified": verified,
                    "verification": data.get('verification', [])
                }
            else:
                return {"status": "error", "domain": domain}
    except Exception as e:
        return {"status": "error", "domain": domain, "error": str(e)}

# ============================================
# SITE EDITOR ENDPOINTS (MVP - No AI)
# ============================================

class SiteEditorUpdate(BaseModel):
    """Request to update site content"""
    section: str  # "hours", "menu", "texts", "contacts", "gallery", "seo"
    data: Dict[str, Any]

@api_router.get("/sites/{demo_id}/editor-data")
async def get_site_editor_data(demo_id: str):
    """Get site data for editor (simplified format)"""
    demo = await db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovato")
    
    business = demo.get('business_data', {}) or {}
    content = demo.get('content', {}) or {}
    
    # Parse hours_text into structured format
    hours = {}
    hours_text = business.get('hours_text', []) or []
    day_map = {'monday': 'mon', 'tuesday': 'tue', 'wednesday': 'wed', 'thursday': 'thu', 
               'friday': 'fri', 'saturday': 'sat', 'sunday': 'sun',
               'lunedì': 'mon', 'martedì': 'tue', 'mercoledì': 'wed', 'giovedì': 'thu',
               'venerdì': 'fri', 'sabato': 'sat', 'domenica': 'sun'}
    
    for line in hours_text:
        line_lower = line.lower().replace('\u202f', ' ').replace('\u2009', ' ')
        for day_name, day_code in day_map.items():
            if day_name in line_lower:
                if 'closed' in line_lower or 'chiuso' in line_lower:
                    hours[day_code] = {'closed': True, 'open': '', 'close': '', 'note': ''}
                else:
                    import re
                    times = re.findall(r'(\d{1,2}):(\d{2})', line)
                    if len(times) >= 2:
                        hours[day_code] = {
                            'closed': False,
                            'open': f"{times[0][0]}:{times[0][1]}",
                            'close': f"{times[1][0]}:{times[1][1]}",
                            'note': ''
                        }
                break
    
    # Ensure all days exist
    for day in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']:
        if day not in hours:
            hours[day] = {'closed': False, 'open': '', 'close': '', 'note': ''}
    
    # Gallery from photos
    gallery = []
    for i, photo in enumerate(business.get('photos', []) or []):
        gallery.append({
            'url': photo.get('url', ''),
            'caption': '',
            'order': i
        })
    
    # Build response
    locale_lang = business.get('site_language', 'it') or 'it'
    
    return {
        "demo_id": demo_id,
        "business_name": demo.get('business_name', business.get('name', '')),
        "locale_lang": locale_lang,
        "publish_status": demo.get('publish_status', 'draft'),
        "production_url": demo.get('production_url'),
        
        # Logo
        "logo_base64": demo.get('logo_base64'),
        
        # Editor sections
        "hours": hours,
        
        "menu": {
            "mode": "menu" if content.get('menu_categories') else "services",
            "categories": content.get('menu_categories', []) or [],
            "services": content.get('services', []) or []
        },
        
        "texts": {
            "about_local": content.get('about_text', ''),
            "about_en": content.get('about_text_en', content.get('about_text', '')),
            "tagline_local": content.get('tagline', ''),
            "tagline_en": content.get('tagline_en', content.get('tagline', ''))
        },
        
        "contacts": {
            "phone": business.get('phone', ''),
            "whatsapp": business.get('phone', ''),  # Default same as phone
            "email": business.get('email', ''),
            "instagram_url": business.get('instagram_url', ''),
            "facebook_url": business.get('facebook_url', ''),
            "tiktok_url": business.get('tiktok_url', '')
        },
        
        "gallery": gallery,
        
        "seo": {
            "title_local": f"{demo.get('business_name', '')} | {business.get('category', '')}",
            "title_en": f"{demo.get('business_name', '')} | {business.get('category', '')}",
            "meta_local": f"{demo.get('business_name', '')} - {business.get('category', '')} a {business.get('city', '')}",
            "meta_en": f"{demo.get('business_name', '')} - {business.get('category', '')} in {business.get('city', '')}"
        }
    }

@api_router.post("/sites/{demo_id}/update")
async def update_site_content(demo_id: str, update: SiteEditorUpdate):
    """Update a specific section of site content"""
    demo = await db.demo_sites.find_one({"demo_id": demo_id})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovato")
    
    business_data = demo.get('business_data', {}) or {}
    content_data = demo.get('content', {}) or {}
    locale_lang = business_data.get('site_language', 'it') or 'it'
    
    errors = []
    
    if update.section == "hours":
        # Validate and convert hours to hours_text format
        hours = update.data
        day_names = {
            'it': {'mon': 'Lunedì', 'tue': 'Martedì', 'wed': 'Mercoledì', 'thu': 'Giovedì', 
                   'fri': 'Venerdì', 'sat': 'Sabato', 'sun': 'Domenica'},
            'en': {'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday',
                   'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday'}
        }
        closed_text = {'it': 'Chiuso', 'en': 'Closed'}
        
        names = day_names.get(locale_lang, day_names['en'])
        closed = closed_text.get(locale_lang, 'Closed')
        
        hours_text = []
        for day in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']:
            day_data = hours.get(day, {})
            if day_data.get('closed'):
                hours_text.append(f"{names[day]}: {closed}")
            elif day_data.get('open') and day_data.get('close'):
                note = f" ({day_data.get('note')})" if day_data.get('note') else ''
                hours_text.append(f"{names[day]}: {day_data['open']} – {day_data['close']}{note}")
        
        business_data['hours_text'] = hours_text
    
    elif update.section == "menu":
        menu_data = update.data
        if menu_data.get('mode') == 'menu':
            content_data['menu_categories'] = menu_data.get('categories', [])
            content_data.pop('services', None)
        else:
            content_data['services'] = menu_data.get('services', [])
            content_data.pop('menu_categories', None)
    
    elif update.section == "texts":
        texts = update.data
        # Validate both languages present
        if texts.get('about_local') and not texts.get('about_en'):
            texts['about_en'] = texts['about_local']
        if texts.get('about_en') and not texts.get('about_local'):
            texts['about_local'] = texts['about_en']
        
        content_data['about_text'] = texts.get('about_local', '')
        content_data['about_text_en'] = texts.get('about_en', '')
        content_data['tagline'] = texts.get('tagline_local', '')
        content_data['tagline_en'] = texts.get('tagline_en', '')
    
    elif update.section == "contacts":
        contacts = update.data
        # Validate phone format
        phone = contacts.get('phone', '')
        whatsapp = contacts.get('whatsapp', phone)
        
        if phone and not re.match(r'^[\d\s\+\-\(\)]+$', phone):
            errors.append("Formato telefono non valido")
        if whatsapp and not re.match(r'^[\d\s\+\-\(\)]+$', whatsapp):
            errors.append("Formato WhatsApp non valido")
        
        email = contacts.get('email', '')
        if email and '@' not in email:
            errors.append("Formato email non valido")
        
        # Validate social media URLs
        instagram_url = contacts.get('instagram_url', '')
        facebook_url = contacts.get('facebook_url', '')
        tiktok_url = contacts.get('tiktok_url', '')
        
        if instagram_url and not instagram_url.startswith('http'):
            errors.append("URL Instagram non valido (deve iniziare con http)")
        if facebook_url and not facebook_url.startswith('http'):
            errors.append("URL Facebook non valido (deve iniziare con http)")
        if tiktok_url and not tiktok_url.startswith('http'):
            errors.append("URL TikTok non valido (deve iniziare con http)")
        
        if not errors:
            business_data['phone'] = whatsapp or phone  # Prefer WhatsApp as main
            business_data['email'] = email
            business_data['instagram_url'] = instagram_url if instagram_url else None
            business_data['facebook_url'] = facebook_url if facebook_url else None
            business_data['tiktok_url'] = tiktok_url if tiktok_url else None
    
    elif update.section == "gallery":
        gallery = update.data.get('images', [])
        # Validate URLs
        photos = []
        for img in sorted(gallery, key=lambda x: x.get('order', 0)):
            url = img.get('url', '')
            if url and url.startswith('http'):
                photos.append({'url': url})
        business_data['photos'] = photos
    
    elif update.section == "seo":
        seo = update.data
        content_data['seo_title_local'] = seo.get('title_local', '')
        content_data['seo_title_en'] = seo.get('title_en', '')
        content_data['seo_meta_local'] = seo.get('meta_local', '')
        content_data['seo_meta_en'] = seo.get('meta_en', '')
    
    elif update.section == "logo":
        logo_data = update.data
        logo_url = logo_data.get('logo_url', '')
        logo_base64 = logo_data.get('logo_base64', '')
        
        # If URL provided, fetch and convert to base64
        if logo_url and logo_url.startswith('http'):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(logo_url, timeout=10) as response:
                        if response.status == 200:
                            image_data = await response.read()
                            logo_base64 = base64.b64encode(image_data).decode('utf-8')
                        else:
                            errors.append(f"Impossibile scaricare l'immagine: HTTP {response.status}")
            except Exception as e:
                errors.append(f"Errore download immagine: {str(e)}")
        
        if logo_base64 and not errors:
            # Update logo_base64 directly on demo document
            await db.demo_sites.update_one(
                {"demo_id": demo_id},
                {"$set": {
                    "logo_base64": logo_base64,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"success": True, "message": "Logo aggiornato"}
        elif logo_data.get('remove_logo'):
            # Remove logo
            await db.demo_sites.update_one(
                {"demo_id": demo_id},
                {"$set": {
                    "logo_base64": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"success": True, "message": "Logo rimosso"}

    elif update.section == "layout":
        # Save section ordering
        order = update.data.get('section_order') if isinstance(update.data, dict) else None
        if not isinstance(order, list):
            errors.append("section_order deve essere un array")
        else:
            allowed = {'about', 'services', 'whyus', 'gallery', 'reviews', 'hours', 'booking', 'faq', 'location', 'contact', 'social'}
            cleaned = []
            seen = set()
            for x in order:
                if isinstance(x, str) and x in allowed and x not in seen:
                    cleaned.append(x)
                    seen.add(x)
            await db.demo_sites.update_one(
                {"demo_id": demo_id},
                {"$set": {
                    "content.section_order": cleaned,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"success": True, "message": "Ordine sezioni salvato", "section_order": cleaned}

    else:
        errors.append(f"Sezione non valida: {update.section}")
    
    if errors:
        return {"success": False, "errors": errors}
    
    # Save updates
    await db.demo_sites.update_one(
        {"demo_id": demo_id},
        {"$set": {
            "business_data": business_data,
            "content": content_data,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": f"Sezione '{update.section}' aggiornata"}

@api_router.post("/sites/{demo_id}/republish")
async def republish_site(demo_id: str):
    """Republish site to Vercel after edits"""
    demo = await db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovato")
    
    # Deploy
    result = await deploy_to_vercel(demo, demo_id)
    
    if result.get('success'):
        await db.demo_sites.update_one(
            {"demo_id": demo_id},
            {"$set": {
                "publish_status": "published",
                "production_url": result['url'],
                "published_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "success": True,
            "production_url": result['url'],
            "message": "Sito ripubblicato con successo!"
        }
    else:
        return {
            "success": False,
            "error": result.get('error', 'Errore durante la pubblicazione')
        }

app.include_router(api_router)

# CORS configuration - allow all origins for cross-domain access
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
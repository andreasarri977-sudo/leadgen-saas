from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
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
    status: str = "nuovo_lead"
    language: str = "it"  # Deprecated, use site_language
    site_language: str = "it"  # Lingua del sito (it, fr, en, es, de)
    booking_mode: str = "none"  # none, appointment, table
    external_booking_url: Optional[str] = None  # URL prenotazione esterna (TheFork, Treatwell, etc.)
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
    domain_verification: Optional[Dict[str, Any]] = None  # DNS records to set
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
                            
                            # Chiama Place Details
                            details_url = f"https://places.googleapis.com/v1/{place_details_id}"
                            details_headers = {
                                "X-Goog-Api-Key": api_key,
                                "X-Goog-FieldMask": "id,displayName,formattedAddress,location,primaryType,types,regularOpeningHours,internationalPhoneNumber,websiteUri,googleMapsUri,rating,userRatingCount,reviews,photos"
                            }
                            
                            async with session.get(details_url, headers=details_headers) as details_response:
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
                                        "time": review.get('relativePublishTimeDescription', '')
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

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(status: Optional[str] = None):
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

class LeadSettingsUpdate(BaseModel):
    site_language: Optional[str] = None
    booking_mode: Optional[str] = None
    external_booking_url: Optional[str] = None

@api_router.patch("/leads/{lead_id}/settings")
async def update_lead_settings(lead_id: str, settings: LeadSettingsUpdate):
    """Aggiorna site_language, booking_mode o external_booking_url del lead"""
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
async def generate_batch_demos(request: BatchGenerateRequest, background_tasks: BackgroundTasks):
    async def process_batch():
        for lead_id in request.lead_ids:
            try:
                await generate_demo_site(GenerateDemoRequest(lead_id=lead_id))
                await asyncio.sleep(2)
            except Exception as e:
                logger.error(f"Errore generazione demo {lead_id}: {str(e)}")
    
    background_tasks.add_task(process_batch)
    return {"message": f"Generazione batch di {len(request.lead_ids)} siti demo avviata", "count": len(request.lead_ids)}

@api_router.get("/demos/{demo_id}")
async def get_demo_by_id(demo_id: str):
    demo = await db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovato")
    
    if isinstance(demo.get('created_at'), str):
        demo['created_at'] = datetime.fromisoformat(demo['created_at'])
    
    return demo

@api_router.post("/demos/{demo_id}/publish")
async def publish_demo(demo_id: str):
    demo = await db.demo_sites.find_one({"demo_id": demo_id}, {"_id": 0})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo non trovato")
    
    # TODO: Implementare deploy reale (Vercel API o altro)
    # Per ora simuliamo la pubblicazione
    
    try:
        # Qui andrebbe la logica di deploy reale
        # live_url = await deploy_to_vercel(demo)
        
        # Simulazione
        business_name = demo.get('business_name', 'business')
        live_url = f"https://{business_name.lower().replace(' ', '-')}.vercel.app"
        
        await db.demo_sites.update_one(
            {"demo_id": demo_id},
            {"$set": {
                "publish_status": "published",
                "live_url": live_url,
                "published_at": datetime.now(timezone.utc).isoformat(),
                "publish_error": None
            }}
        )
        
        return {
            "success": True,
            "message": "Sito pubblicato con successo",
            "live_url": live_url,
            "note": "Deploy simulato - integrare Vercel API per deploy reale"
        }
    except Exception as e:
        logger.error(f"Errore pubblicazione: {str(e)}")
        
        await db.demo_sites.update_one(
            {"demo_id": demo_id},
            {"$set": {
                "publish_status": "error",
                "publish_error": str(e)
            }}
        )
        
        raise HTTPException(status_code=500, detail=f"Errore pubblicazione: {str(e)}")

@api_router.get("/demos", response_model=List[DemoSite])
async def get_demos():
    demos = await db.demo_sites.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for demo in demos:
        if isinstance(demo.get('created_at'), str):
            demo['created_at'] = datetime.fromisoformat(demo['created_at'])
    
    return demos

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
        return {"success": True, "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Errore invio email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore invio email: {str(e)}")

@api_router.post("/whatsapp/generate")
async def generate_whatsapp_message(lead_id: str, demo_url: str):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    business_name = lead['name']
    language = lead.get('language', 'italiano')
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"whatsapp_{uuid.uuid4()}",
        system_message=f"Sei un esperto che scrive messaggi WhatsApp professionali ma concisi in {language}."
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Scrivi un breve messaggio WhatsApp in {language} (max 150 parole) per contattare {business_name}.

Obiettivo: presentare il sito web demo creato per loro.

Includere:
- Saluto
- Breve presentazione
- Link demo: {demo_url}
- Call to action

Tono: cordiale e diretto."""

    message = UserMessage(text=prompt)
    response = await chat.send_message(message)
    
    return {"message": response}

@api_router.get("/stats/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    total_leads = await db.leads.count_documents({})
    demos_created = await db.demo_sites.count_documents({})
    contacted = await db.leads.count_documents({"status": "contattato"})
    clients = await db.leads.count_documents({"status": "cliente_acquisito"})
    new_leads = await db.leads.count_documents({"status": "nuovo_lead"})
    
    return DashboardStats(
        total_leads=total_leads,
        demos_created=demos_created,
        contacted=contacted,
        clients_acquired=clients,
        new_leads=new_leads
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

# Traduzioni per il sito statico
STATIC_TRANSLATIONS = {
    "it": {
        "nav": {"about": "Chi Siamo", "services": "Servizi", "menu": "Menu", "gallery": "Galleria", "reviews": "Recensioni", "hours": "Orari", "location": "Dove Siamo", "contact": "Contatti"},
        "hero": {"whatsapp": "WhatsApp", "directions": "Indicazioni", "call": "Chiama"},
        "whatsapp_msg": "Ciao! Ho visto il vostro sito e vorrei informazioni.",
        "info": {"address": "Indirizzo", "phone": "Telefono", "rating": "Valutazione", "reviews": "recensioni"},
        "sections": {"about": "Chi Siamo", "services": "I Nostri Servizi", "menu": "Il Nostro Menu", "gallery": "Galleria", "reviews": "Cosa Dicono i Clienti", "hours": "Orari di Apertura", "location": "Dove Siamo", "contact": "Contatti"},
        "buttons": {"google_maps": "Apri su Google Maps", "all_reviews": "Leggi tutte le recensioni su Google"},
        "footer": {"rights": "Tutti i diritti riservati"},
        "cta": {"contact_today": "Contattaci Oggi", "visit_us": "Vieni a trovarci"},
        "misc": {"trust": "di fiducia", "in": "a"}
    },
    "fr": {
        "nav": {"about": "À Propos", "services": "Services", "menu": "Menu", "gallery": "Galerie", "reviews": "Avis", "hours": "Horaires", "location": "Nous Trouver", "contact": "Contact"},
        "hero": {"whatsapp": "WhatsApp", "directions": "Itinéraire", "call": "Appeler"},
        "whatsapp_msg": "Bonjour ! J'ai vu votre site et j'aimerais avoir des informations.",
        "info": {"address": "Adresse", "phone": "Téléphone", "rating": "Note", "reviews": "avis"},
        "sections": {"about": "À Propos de Nous", "services": "Nos Services", "menu": "Notre Menu", "gallery": "Galerie", "reviews": "Ce que Disent nos Clients", "hours": "Horaires d'Ouverture", "location": "Nous Trouver", "contact": "Contact"},
        "buttons": {"google_maps": "Ouvrir sur Google Maps", "all_reviews": "Lire tous les avis sur Google"},
        "footer": {"rights": "Tous droits réservés"},
        "cta": {"contact_today": "Contactez-nous Aujourd'hui", "visit_us": "Venez nous rendre visite"},
        "misc": {"trust": "de confiance", "in": "à"}
    },
    "en": {
        "nav": {"about": "About Us", "services": "Services", "menu": "Menu", "gallery": "Gallery", "reviews": "Reviews", "hours": "Hours", "location": "Location", "contact": "Contact"},
        "hero": {"whatsapp": "WhatsApp", "directions": "Directions", "call": "Call"},
        "whatsapp_msg": "Hi! I saw your website and I'd like some information.",
        "info": {"address": "Address", "phone": "Phone", "rating": "Rating", "reviews": "reviews"},
        "sections": {"about": "About Us", "services": "Our Services", "menu": "Our Menu", "gallery": "Gallery", "reviews": "What Our Clients Say", "hours": "Opening Hours", "location": "Location", "contact": "Contact"},
        "buttons": {"google_maps": "Open on Google Maps", "all_reviews": "Read all reviews on Google"},
        "footer": {"rights": "All rights reserved"},
        "cta": {"contact_today": "Contact Us Today", "visit_us": "Visit us for an unforgettable experience"},
        "misc": {"trust": "you can trust", "in": "in"}
    },
    "es": {
        "nav": {"about": "Sobre Nosotros", "services": "Servicios", "menu": "Menú", "gallery": "Galería", "reviews": "Reseñas", "hours": "Horarios", "location": "Ubicación", "contact": "Contacto"},
        "hero": {"whatsapp": "WhatsApp", "directions": "Cómo Llegar", "call": "Llamar"},
        "whatsapp_msg": "¡Hola! Vi su sitio web y me gustaría obtener información.",
        "info": {"address": "Dirección", "phone": "Teléfono", "rating": "Valoración", "reviews": "reseñas"},
        "sections": {"about": "Sobre Nosotros", "services": "Nuestros Servicios", "menu": "Nuestro Menú", "gallery": "Galería", "reviews": "Lo que Dicen Nuestros Clientes", "hours": "Horario de Apertura", "location": "Ubicación", "contact": "Contacto"},
        "buttons": {"google_maps": "Abrir en Google Maps", "all_reviews": "Leer todas las reseñas en Google"},
        "footer": {"rights": "Todos los derechos reservados"},
        "cta": {"contact_today": "Contáctenos Hoy", "visit_us": "Visítanos para una experiencia inolvidable"},
        "misc": {"trust": "de confianza", "in": "en"}
    },
    "de": {
        "nav": {"about": "Über Uns", "services": "Dienstleistungen", "menu": "Speisekarte", "gallery": "Galerie", "reviews": "Bewertungen", "hours": "Öffnungszeiten", "location": "Standort", "contact": "Kontakt"},
        "hero": {"whatsapp": "WhatsApp", "directions": "Anfahrt", "call": "Anrufen"},
        "whatsapp_msg": "Hallo! Ich habe Ihre Website gesehen und würde gerne Informationen erhalten.",
        "info": {"address": "Adresse", "phone": "Telefon", "rating": "Bewertung", "reviews": "Bewertungen"},
        "sections": {"about": "Über Uns", "services": "Unsere Dienstleistungen", "menu": "Unsere Speisekarte", "gallery": "Galerie", "reviews": "Was Unsere Kunden Sagen", "hours": "Öffnungszeiten", "location": "Standort", "contact": "Kontakt"},
        "buttons": {"google_maps": "Auf Google Maps Öffnen", "all_reviews": "Alle Bewertungen auf Google lesen"},
        "footer": {"rights": "Alle Rechte vorbehalten"},
        "cta": {"contact_today": "Kontaktieren Sie Uns Heute", "visit_us": "Besuchen Sie uns für ein unvergessliches Erlebnis"},
        "misc": {"trust": "Ihres Vertrauens", "in": "in"}
    }
}

def get_whatsapp_link(phone: str, message: str) -> Optional[str]:
    """Genera link WhatsApp con messaggio precompilato"""
    if not phone:
        return None
    clean_phone = re.sub(r'[^0-9+]', '', phone).lstrip('+')
    from urllib.parse import quote
    return f"https://wa.me/{clean_phone}?text={quote(message)}"

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
    locale_t = STATIC_TRANSLATIONS.get(locale_lang, STATIC_TRANSLATIONS['en'])
    en_t = STATIC_TRANSLATIONS['en']
    
    # Verifica che i contenuti non abbiano mix di lingue (euristico)
    if locale_lang != 'en':
        about_text = content.get('about_text', '').lower()
        # Check parole tipiche inglesi in contenuti non-inglesi
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
        "has_photos": len(business.get('photos', [])) > 0,
        "has_reviews": len(business.get('reviews', [])) > 0
    }

def generate_static_html(demo: Dict, lang: str) -> str:
    """Genera HTML statico del sito per il deploy"""
    business = demo.get('business_data', {})
    content = demo.get('content', {})
    t = STATIC_TRANSLATIONS.get(lang, STATIC_TRANSLATIONS['en'])
    
    business_name = demo.get('business_name', business.get('name', 'Business'))
    category = business.get('category', '')
    address = business.get('address', '')
    phone = business.get('phone', '')
    rating = business.get('rating', 0)
    reviews_count = business.get('reviews_count', 0)
    photos = business.get('photos', [])
    reviews = business.get('reviews', [])
    hours_text = business.get('hours_text', [])
    location = business.get('location', {})
    google_maps_link = business.get('google_maps_link', '')
    
    hero_photo = photos[0]['url'] if photos else ''
    gallery_photos = photos[1:9] if len(photos) > 1 else []
    
    # WhatsApp link
    whatsapp_link = get_whatsapp_link(phone, t['whatsapp_msg'])
    
    # About text
    about_text = content.get('about_text', f"{business_name} {t['misc']['trust']}")
    
    # Services/Menu
    services_html = ""
    if content.get('menu_categories'):
        for cat in content['menu_categories']:
            items_html = ''.join([f'<li>{item}</li>' for item in cat.get('items', [])])
            services_html += f'<div class="menu-cat"><h3>{cat.get("name", "")}</h3><ul>{items_html}</ul></div>'
    elif content.get('services'):
        for i, service in enumerate(content['services'][:6]):
            services_html += f'<div class="service-card"><span class="num">{i+1}</span><h3>{service}</h3></div>'
    
    # Gallery HTML
    gallery_html = ""
    for photo in gallery_photos:
        gallery_html += f'<img src="{photo["url"]}" alt="{business_name}" loading="lazy" />'
    
    # Reviews HTML
    reviews_html = ""
    good_reviews = [r for r in reviews if r.get('rating', 0) >= 4 and len(r.get('text', '')) > 10][:4]
    for review in good_reviews:
        stars = '★' * int(review.get('rating', 5)) + '☆' * (5 - int(review.get('rating', 5)))
        reviews_html += f'''
        <div class="review-card">
            <div class="stars">{stars}</div>
            <p>"{review.get('text', '')[:200]}"</p>
            <span class="author">— {review.get('author', 'Cliente')}</span>
        </div>'''
    
    # Hours HTML
    hours_html = ""
    for hour in hours_text[:7]:
        hours_html += f'<p>{hour}</p>'
    
    # Map iframe
    map_html = ""
    if location.get('lat') and location.get('lng'):
        map_html = f'<iframe src="https://www.google.com/maps?q={location["lat"]},{location["lng"]}&output=embed" width="100%" height="400" style="border:0" allowfullscreen loading="lazy"></iframe>'
    
    # CTA buttons
    primary_cta = ""
    if whatsapp_link:
        primary_cta = f'<a href="{whatsapp_link}" target="_blank" class="btn btn-whatsapp"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>{t["hero"]["whatsapp"]}</a>'
    elif phone:
        primary_cta = f'<a href="tel:{phone}" class="btn btn-primary">{t["hero"]["call"]}</a>'
    
    secondary_cta = ""
    if google_maps_link:
        secondary_cta = f'<a href="{google_maps_link}" target="_blank" class="btn btn-secondary">{t["hero"]["directions"]}</a>'

    html = f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{business_name} | {category}</title>
    <meta name="description" content="{about_text[:160]}">
    <meta property="og:title" content="{business_name}">
    <meta property="og:description" content="{about_text[:160]}">
    <meta property="og:type" content="website">
    {f'<meta property="og:image" content="{hero_photo}">' if hero_photo else ''}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *{{margin:0;padding:0;box-sizing:border-box}}
        body{{font-family:'Inter',system-ui,sans-serif;line-height:1.6;color:#1f2937;background:#fff}}
        .container{{max-width:1200px;margin:0 auto;padding:0 20px}}
        
        /* Navigation */
        nav{{position:sticky;top:0;background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);border-bottom:1px solid #e5e7eb;z-index:100;padding:16px 0}}
        nav .container{{display:flex;justify-content:space-between;align-items:center}}
        nav h1{{font-size:1.25rem;font-weight:700}}
        nav ul{{display:flex;gap:24px;list-style:none}}
        nav a{{color:#4b5563;text-decoration:none;font-weight:500;font-size:0.9rem}}
        nav a:hover{{color:#111}}
        .lang-switch{{display:flex;gap:8px}}
        .lang-switch a{{padding:4px 12px;border-radius:20px;font-size:0.8rem;border:1px solid #e5e7eb}}
        .lang-switch a.active{{background:#111;color:#fff;border-color:#111}}
        
        /* Hero */
        .hero{{background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;padding:80px 0;position:relative;overflow:hidden}}
        .hero-bg{{position:absolute;inset:0;opacity:0.2}}
        .hero-bg img{{width:100%;height:100%;object-fit:cover}}
        .hero-content{{position:relative;z-index:1}}
        .hero h2{{font-size:3rem;font-weight:700;margin-bottom:16px}}
        .hero p{{font-size:1.25rem;opacity:0.9;margin-bottom:32px;max-width:600px}}
        .hero-btns{{display:flex;gap:16px;flex-wrap:wrap}}
        .btn{{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:50px;font-weight:600;text-decoration:none;transition:all 0.2s}}
        .btn-whatsapp{{background:#25D366;color:#fff}}
        .btn-whatsapp:hover{{background:#128C7E;transform:scale(1.05)}}
        .btn-primary{{background:#fff;color:#111}}
        .btn-secondary{{background:rgba(255,255,255,0.2);color:#fff;backdrop-filter:blur(10px)}}
        .btn-secondary:hover{{background:rgba(255,255,255,0.3)}}
        
        /* Info Bar */
        .info-bar{{background:#f9fafb;padding:32px 0;border-bottom:1px solid #e5e7eb}}
        .info-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px}}
        .info-item{{display:flex;align-items:flex-start;gap:12px}}
        .info-item svg{{color:#6b7280;flex-shrink:0}}
        .info-label{{font-size:0.8rem;color:#6b7280;font-weight:500}}
        .info-value{{font-weight:600}}
        
        /* Sections */
        section{{padding:64px 0}}
        section h2{{font-size:2rem;font-weight:700;margin-bottom:32px}}
        
        /* Menu/Services */
        .menu-cat{{background:#f9fafb;padding:24px;border-radius:16px;margin-bottom:16px}}
        .menu-cat h3{{font-size:1.25rem;margin-bottom:16px}}
        .menu-cat ul{{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}}
        .menu-cat li{{display:flex;align-items:center;gap:8px}}
        .menu-cat li::before{{content:'•';color:#9ca3af}}
        .service-card{{background:#f9fafb;padding:24px;border-radius:16px;display:inline-block;width:calc(33.333% - 16px);margin:8px;vertical-align:top}}
        .service-card .num{{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:#2563eb;color:#fff;border-radius:8px;font-weight:700;margin-bottom:12px}}
        .service-card h3{{font-size:1.1rem}}
        
        /* Gallery */
        .gallery-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}}
        .gallery-grid img{{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;cursor:pointer;transition:transform 0.2s}}
        .gallery-grid img:hover{{transform:scale(1.05)}}
        
        /* Reviews */
        .reviews-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}}
        .review-card{{background:#fff;border:1px solid #e5e7eb;padding:24px;border-radius:16px}}
        .review-card .stars{{color:#fbbf24;margin-bottom:12px;font-size:1.1rem}}
        .review-card p{{color:#4b5563;margin-bottom:12px;font-style:italic}}
        .review-card .author{{font-weight:600;color:#111}}
        
        /* Hours */
        .hours-box{{background:#f9fafb;padding:32px;border-radius:16px;display:inline-block}}
        .hours-box p{{margin-bottom:8px}}
        
        /* Map */
        .map-wrapper{{border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)}}
        .map-btn{{text-align:center;margin-top:24px}}
        
        /* Contact CTA */
        .contact-cta{{background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;padding:64px;border-radius:24px;text-align:center}}
        .contact-cta h2{{font-size:2.5rem;margin-bottom:16px}}
        .contact-cta p{{opacity:0.9;margin-bottom:32px;font-size:1.1rem}}
        .contact-cta .btns{{display:flex;justify-content:center;gap:16px;flex-wrap:wrap}}
        
        /* Footer */
        footer{{background:#111;color:#fff;padding:48px 0}}
        .footer-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:32px;margin-bottom:32px}}
        .footer-grid h3{{font-size:1.1rem;margin-bottom:16px}}
        .footer-grid p{{color:#9ca3af;font-size:0.9rem;margin-bottom:8px}}
        .footer-bottom{{border-top:1px solid #333;padding-top:24px;text-align:center;color:#6b7280;font-size:0.85rem}}
        
        /* Mobile Sticky Bar */
        .mobile-bar{{display:none;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:2px solid #e5e7eb;z-index:100}}
        .mobile-bar a{{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:16px;font-weight:600;text-decoration:none}}
        .mobile-bar .wa{{background:#25D366;color:#fff}}
        .mobile-bar .dir{{background:#111;color:#fff}}
        
        @media(max-width:768px){{
            nav ul{{display:none}}
            .hero h2{{font-size:2rem}}
            .hero{{padding:48px 0}}
            .service-card{{width:100%;margin:8px 0}}
            .menu-cat ul{{grid-template-columns:1fr}}
            .mobile-bar{{display:flex}}
            body{{padding-bottom:60px}}
            section{{padding:48px 0}}
        }}
    </style>
</head>
<body>
    <nav>
        <div class="container">
            <h1>{business_name}</h1>
            <ul>
                <li><a href="#about">{t["nav"]["about"]}</a></li>
                <li><a href="#services">{t["nav"]["services"] if not content.get("menu_categories") else t["nav"]["menu"]}</a></li>
                {f'<li><a href="#gallery">{t["nav"]["gallery"]}</a></li>' if gallery_photos else ''}
                {f'<li><a href="#reviews">{t["nav"]["reviews"]}</a></li>' if good_reviews else ''}
                <li><a href="#contact">{t["nav"]["contact"]}</a></li>
            </ul>
            <div class="lang-switch">
                <a href="index.html" class="{'active' if lang == demo.get('business_data',{}).get('site_language','it') else ''}">{demo.get('business_data',{}).get('site_language','it').upper()}</a>
                <a href="en.html" class="{'active' if lang == 'en' else ''}">EN</a>
            </div>
        </div>
    </nav>
    
    <header class="hero">
        {f'<div class="hero-bg"><img src="{hero_photo}" alt=""></div>' if hero_photo else ''}
        <div class="container hero-content">
            <h2>{business_name}</h2>
            <p>{content.get("homepage_subtitle", f"{category} {t['misc']['trust']}")}</p>
            <div class="hero-btns">
                {primary_cta}
                {secondary_cta}
            </div>
        </div>
    </header>
    
    <div class="info-bar">
        <div class="container">
            <div class="info-grid">
                {f'<div class="info-item"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><div><div class="info-label">{t["info"]["address"]}</div><div class="info-value">{address}</div></div></div>' if address else ''}
                {f'<div class="info-item"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg><div><div class="info-label">{t["info"]["phone"]}</div><div class="info-value"><a href="tel:{phone}">{phone}</a></div></div></div>' if phone else ''}
                {f'<div class="info-item"><svg width="24" height="24" fill="#fbbf24" stroke="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><div><div class="info-label">{t["info"]["rating"]}</div><div class="info-value">{rating} ({reviews_count} {t["info"]["reviews"]})</div></div></div>' if rating and rating > 0 else ''}
            </div>
        </div>
    </div>
    
    <section id="about">
        <div class="container">
            <h2>{t["sections"]["about"]}</h2>
            <p style="font-size:1.1rem;max-width:800px">{about_text}</p>
        </div>
    </section>
    
    {f'''<section id="services" style="background:#f9fafb">
        <div class="container">
            <h2>{t["sections"]["menu"] if content.get("menu_categories") else t["sections"]["services"]}</h2>
            {services_html}
        </div>
    </section>''' if services_html else ''}
    
    {f'''<section id="gallery">
        <div class="container">
            <h2>{t["sections"]["gallery"]}</h2>
            <div class="gallery-grid">{gallery_html}</div>
        </div>
    </section>''' if gallery_html else ''}
    
    {f'''<section id="reviews" style="background:#f9fafb">
        <div class="container">
            <h2>{t["sections"]["reviews"]}</h2>
            <div class="reviews-grid">{reviews_html}</div>
            {f'<p style="margin-top:24px;text-align:center"><a href="{google_maps_link}" target="_blank" style="color:#2563eb">{t["buttons"]["all_reviews"]} →</a></p>' if google_maps_link else ''}
        </div>
    </section>''' if reviews_html else ''}
    
    {f'''<section id="hours">
        <div class="container">
            <h2>{t["sections"]["hours"]}</h2>
            <div class="hours-box">{hours_html}</div>
        </div>
    </section>''' if hours_html else ''}
    
    {f'''<section id="location" style="background:#f9fafb">
        <div class="container">
            <h2>{t["sections"]["location"]}</h2>
            <div class="map-wrapper">{map_html}</div>
            <div class="map-btn"><a href="{google_maps_link}" target="_blank" class="btn btn-primary">{t["buttons"]["google_maps"]}</a></div>
        </div>
    </section>''' if map_html else ''}
    
    <section id="contact">
        <div class="container">
            <div class="contact-cta">
                <h2>{content.get("cta_text", t["cta"]["contact_today"])}</h2>
                <p>{t["cta"]["visit_us"]}</p>
                <div class="btns">
                    {primary_cta.replace('btn-whatsapp', 'btn btn-whatsapp') if whatsapp_link else f'<a href="tel:{phone}" class="btn btn-primary">{phone}</a>' if phone else ''}
                    {f'<a href="{google_maps_link}" target="_blank" class="btn btn-secondary">{t["buttons"]["google_maps"]}</a>' if google_maps_link else ''}
                </div>
            </div>
        </div>
    </section>
    
    <footer>
        <div class="container">
            <div class="footer-grid">
                <div>
                    <h3>{business_name}</h3>
                    <p>{category} {t["misc"]["in"]} {business.get("city", "")}</p>
                </div>
                <div>
                    <h3>{t["nav"]["contact"]}</h3>
                    {f'<p>{phone}</p>' if phone else ''}
                    {f'<p>{address}</p>' if address else ''}
                </div>
                {f'''<div>
                    <h3>{t["nav"]["hours"]}</h3>
                    {''.join([f"<p>{h}</p>" for h in hours_text[:3]])}
                </div>''' if hours_text else ''}
            </div>
            <div class="footer-bottom">
                © {datetime.now().year} {business_name}. {t["footer"]["rights"]}.
            </div>
        </div>
    </footer>
    
    <div class="mobile-bar">
        {f'<a href="{whatsapp_link}" target="_blank" class="wa"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>WhatsApp</a>' if whatsapp_link else f'<a href="tel:{phone}" class="wa">{t["hero"]["call"]}</a>' if phone else ''}
        {f'<a href="{google_maps_link}" target="_blank" class="dir">{t["hero"]["directions"]}</a>' if google_maps_link else ''}
    </div>
</body>
</html>'''
    return html

async def deploy_to_vercel(demo: Dict, demo_id: str) -> Dict:
    """Deploya il sito su Vercel"""
    if not VERCEL_TOKEN:
        return {"success": False, "error": "Token Vercel non configurato"}
    
    business = demo.get('business_data', {})
    locale_lang = business.get('site_language', 'it')
    
    # Genera HTML per entrambe le lingue
    html_locale = generate_static_html(demo, locale_lang)
    html_en = generate_static_html(demo, 'en')
    
    # Crea nome progetto (slug)
    business_name = demo.get('business_name', 'site')
    project_name = re.sub(r'[^a-z0-9-]', '', business_name.lower().replace(' ', '-'))[:50]
    project_name = f"{project_name}-{demo_id[:8]}"
    
    # Prepara i file per Vercel
    files = [
        {"file": "index.html", "data": base64.b64encode(html_locale.encode()).decode()},
        {"file": "en.html", "data": base64.b64encode(html_en.encode()).decode()},
        {"file": "vercel.json", "data": base64.b64encode(json.dumps({
            "routes": [
                {"src": "/en", "dest": "/en.html"},
                {"src": "/", "dest": "/index.html"}
            ]
        }).encode()).decode()}
    ]
    
    try:
        async with aiohttp.ClientSession() as session:
            # Deploy
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
                        "framework": None
                    },
                    "target": "production"
                }
            )
            
            if deploy_response.status not in [200, 201]:
                error_text = await deploy_response.text()
                logger.error(f"Vercel deploy error: {error_text}")
                return {"success": False, "error": f"Errore Vercel: {error_text[:200]}"}
            
            deploy_data = await deploy_response.json()
            
            return {
                "success": True,
                "url": f"https://{deploy_data.get('url', '')}",
                "project_id": deploy_data.get('projectId'),
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
                "published_at": datetime.now(timezone.utc).isoformat()
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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
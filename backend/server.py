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
    publish_status: str = "draft"  # draft, publishing, published, error
    live_url: Optional[str] = None  # URL pubblico solo se published
    publish_error: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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
                                
                                language = detect_language_from_country(request.country)
                                
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
                                    primary_type=details.get('primaryType'),
                                    types=details.get('types'),
                                    status="nuovo_lead",
                                    language=language
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

@api_router.post("/demo/generate", response_model=DemoSite)
async def generate_demo_site(request: GenerateDemoRequest):
    lead = await db.leads.find_one({"lead_id": request.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    
    business_name = lead['name']
    category = lead['category']
    language = lead.get('language', 'italiano')
    primary_type = lead.get('primary_type')
    
    content = await generate_business_content(business_name, category, language, primary_type)
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
        "language": language
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
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
import resend
import aiohttp

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
    place_id: str  # Google Place ID
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
    language: str = "it"
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

LANGUAGE_MAP = {
    "IT": "italiano",
    "FR": "francese",
    "ES": "spagnolo",
    "DE": "tedesco",
    "GB": "inglese",
    "UK": "inglese",
    "US": "inglese"
}

def detect_language_from_country(country: str) -> str:
    country_upper = country.upper()
    return LANGUAGE_MAP.get(country_upper, "italiano")

SERVICES_BY_CATEGORY = {
    "parrucchiere": ["Taglio", "Piega", "Colore", "Balayage", "Trattamenti Capelli", "Styling"],
    "ristorante": ["Antipasti", "Primi Piatti", "Secondi", "Dessert", "Vini", "Menu Degustazione"],
    "estetista": ["Pulizia Viso", "Massaggi", "Trattamenti Corpo", "Manicure", "Pedicure", "Ceretta"],
    "dentista": ["Igiene Dentale", "Sbiancamento", "Otturazioni", "Ortodonzia", "Implantologia", "Protesi"],
    "palestra": ["Sala Pesi", "Corsi Fitness", "Personal Training", "Yoga", "Pilates", "Spinning"],
    "idraulico": ["Riparazione Perdite", "Installazione Caldaie", "Sostituzione Rubinetti", "Spurgo", "Manutenzione"],
    "elettricista": ["Impianti Elettrici", "Riparazione Guasti", "Domotica", "Illuminazione", "Manutenzione"]
}

async def generate_business_content(business_name: str, category: str, language: str) -> Dict[str, Any]:
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"content_{uuid.uuid4()}",
            system_message=f"Sei un esperto copywriter che crea contenuti professionali per siti web di attività locali in {language}."
        ).with_model("openai", "gpt-5.2")

        services = SERVICES_BY_CATEGORY.get(category.lower(), ["Servizio 1", "Servizio 2", "Servizio 3"])
        
        prompt = f"""Crea contenuti professionali in {language} per un sito web di: {business_name}
Categoria: {category}

Genera SOLO un oggetto JSON con questa struttura:
{{
  "homepage_title": "titolo accattivante",
  "homepage_subtitle": "sottotitolo breve",
  "about_text": "testo chi siamo (100 parole)",
  "services_intro": "introduzione servizi (50 parole)",
  "cta_text": "call to action"
}}

Rispondi SOLO con JSON valido, senza markdown."""

        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        import json
        content = json.loads(response)
        content["services"] = services
        return content
    except Exception as e:
        logger.error(f"Errore generazione contenuti: {str(e)}")
        return {
            "homepage_title": f"Benvenuti da {business_name}",
            "homepage_subtitle": f"Il tuo {category} di fiducia",
            "about_text": f"{business_name} offre servizi professionali di alta qualità.",
            "services_intro": "Scopri tutti i nostri servizi",
            "services": SERVICES_BY_CATEGORY.get(category.lower(), ["Servizio 1", "Servizio 2", "Servizio 3"]),
            "cta_text": "Contattaci Ora"
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

@api_router.post("/search/companies", response_model=List[Lead])
async def search_companies(request: SearchRequest):
    settings = await db.api_settings.find_one({"setting_id": "api_settings"}, {"_id": 0})
    api_key = settings.get('google_maps_api_key') if settings else None
    
    if not api_key and not GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=400, detail="Google Maps API key non configurata. Vai su Impostazioni API per configurarla.")
    
    api_key = api_key or GOOGLE_MAPS_API_KEY
    
    try:
        # Mappa categorie italiane a tipi Google Places
        category_map = {
            "parrucchiere": "hair_salon",
            "ristorante": "restaurant",
            "estetista": "beauty_salon",
            "dentista": "dentist",
            "palestra": "gym",
            "idraulico": "plumber",
            "elettricista": "electrician",
            "bar": "bar",
            "pizzeria": "pizza_restaurant",
            "meccanico": "car_repair"
        }
        
        place_type = category_map.get(request.category.lower(), "establishment")
        
        # Text Search (New) - Places API (New)
        search_url = "https://places.googleapis.com/v1/places:searchText"
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri"
        }
        
        search_body = {
            "textQuery": f"{request.category} in {request.city}, {request.country}",
            "languageCode": "it",
            "maxResultCount": 20
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(search_url, json=search_body, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Google Places API error: {error_text}")
                    raise HTTPException(status_code=500, detail=f"Errore Google Places API: {error_text}")
                
                search_data = await response.json()
                places = search_data.get('places', [])
                
                leads = []
                for place in places:
                    rating = place.get('rating', 0)
                    reviews_count = place.get('userRatingCount', 0)
                    
                    # Applica filtri
                    if reviews_count < request.min_reviews or rating < request.min_rating:
                        continue
                    
                    # Verifica se ha sito web
                    has_website = place.get('websiteUri') is not None
                    
                    if not has_website:
                        language = detect_language_from_country(request.country)
                        
                        display_name = place.get('displayName', {})
                        name = display_name.get('text', 'Unknown') if isinstance(display_name, dict) else str(display_name)
                        
                        lead = Lead(
                            name=name,
                            category=request.category,
                            address=place.get('formattedAddress', ''),
                            city=request.city,
                            country=request.country,
                            phone=place.get('nationalPhoneNumber'),
                            rating=rating,
                            reviews_count=reviews_count,
                            google_maps_link=place.get('googleMapsUri'),
                            website=None,
                            status="nuovo_lead",
                            language=language
                        )
                        
                        lead_dict = lead.model_dump()
                        lead_dict['created_at'] = lead_dict['created_at'].isoformat()
                        await db.leads.insert_one(lead_dict)
                        leads.append(lead)
        
        return leads
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore ricerca: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore ricerca: {str(e)}")

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
    
    content = await generate_business_content(business_name, category, language)
    logo_base64 = await generate_logo(business_name)
    
    # URL interno (non Vercel)
    demo_id = str(uuid.uuid4())
    demo_url = f"/demo/{demo_id}"
    
    # Salva dati completi azienda per rendering
    business_data = {
        "name": lead.get('name'),
        "category": lead.get('category'),
        "address": lead.get('address'),
        "city": lead.get('city'),
        "country": lead.get('country'),
        "phone": lead.get('phone'),
        "rating": lead.get('rating'),
        "reviews_count": lead.get('reviews_count'),
        "hours": lead.get('hours'),
        "photos": lead.get('photos', []),
        "google_maps_link": lead.get('google_maps_link'),
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
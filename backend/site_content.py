# Site Content Schema - Structured editable data for AI Editor
# Separates content from layout/UI - AI can only modify content, not code

from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Optional, Any, Literal
from datetime import datetime, timezone
import uuid
import re

# ============================================
# CONTENT SCHEMAS (Editable by AI)
# ============================================

class BusinessInfo(BaseModel):
    """Core business information"""
    name: str
    category: str
    country: str
    city: str
    address: str
    phone: Optional[str] = None
    whatsapp: Optional[str] = None  # Can differ from phone
    email: Optional[str] = None
    google_maps_url: Optional[str] = None
    
    @field_validator('phone', 'whatsapp', mode='before')
    @classmethod
    def validate_phone(cls, v):
        if v and not re.match(r'^[\d\s\+\-\(\)]+$', str(v)):
            return None
        return v
    
    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        if v and '@' not in str(v):
            return None
        return v

class DayHours(BaseModel):
    """Opening hours for a single day"""
    open: Optional[str] = None  # Format: "09:00"
    close: Optional[str] = None  # Format: "18:00"
    closed: bool = False
    note: Optional[str] = None  # e.g., "Cucina aperta fino alle 22"
    note_en: Optional[str] = None

class OpeningHours(BaseModel):
    """Weekly opening hours"""
    mon: DayHours = Field(default_factory=DayHours)
    tue: DayHours = Field(default_factory=DayHours)
    wed: DayHours = Field(default_factory=DayHours)
    thu: DayHours = Field(default_factory=DayHours)
    fri: DayHours = Field(default_factory=DayHours)
    sat: DayHours = Field(default_factory=DayHours)
    sun: DayHours = Field(default_factory=DayHours)

class MenuItem(BaseModel):
    """Single menu item or service"""
    name_local: str
    name_en: str
    desc_local: Optional[str] = None
    desc_en: Optional[str] = None
    price: Optional[str] = None  # e.g., "€12.50" or "da €25"

class MenuCategory(BaseModel):
    """Category of menu items or services"""
    name_local: str
    name_en: str
    items: List[MenuItem] = Field(default_factory=list)

class MenuOrServices(BaseModel):
    """Menu (for restaurants) or Services (for other businesses)"""
    mode: Literal["menu", "services"] = "services"
    categories: List[MenuCategory] = Field(default_factory=list)

class GalleryImage(BaseModel):
    """Single gallery image"""
    url: str
    caption_local: Optional[str] = None
    caption_en: Optional[str] = None
    order: int = 0

class LocalizedText(BaseModel):
    """Text with local language + English"""
    local: str
    en: str

class HeroContent(BaseModel):
    """Hero section content"""
    tagline_local: Optional[str] = None
    tagline_en: Optional[str] = None
    image_url: Optional[str] = None

class SeoContent(BaseModel):
    """SEO metadata"""
    title_local: str
    title_en: str
    meta_local: str
    meta_en: str

class ChangeLogEntry(BaseModel):
    """Single change log entry"""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    request: str  # Original user request
    changes_summary: List[str]  # Human readable list of changes
    patch: Dict[str, Any]  # The actual patch applied
    applied_by: str = "ai_editor"

class Review(BaseModel):
    """Customer review (read-only from Google, but can be hidden)"""
    author: str
    rating: int
    text: str
    time: Optional[str] = None
    relative_time_description: Optional[str] = None
    hidden: bool = False  # AI can hide inappropriate reviews

# ============================================
# MAIN SITE CONTENT SCHEMA
# ============================================

class SiteContent(BaseModel):
    """
    Complete structured content for a site.
    AI Editor can ONLY modify fields in this schema.
    Layout, components, routing, code are NOT modifiable.
    """
    content_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    demo_id: str  # Link to DemoSite
    locale_lang: str = "it"  # Local language code
    
    # Editable sections
    business: BusinessInfo
    opening_hours: OpeningHours = Field(default_factory=OpeningHours)
    menu_or_services: MenuOrServices = Field(default_factory=MenuOrServices)
    gallery: List[GalleryImage] = Field(default_factory=list)
    about_text: LocalizedText = Field(default_factory=lambda: LocalizedText(local="", en=""))
    hero: HeroContent = Field(default_factory=HeroContent)
    seo: Optional[SeoContent] = None
    
    # Reviews (from Google, can be hidden but not edited)
    reviews: List[Review] = Field(default_factory=list)
    
    # Metadata
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    change_log: List[ChangeLogEntry] = Field(default_factory=list)
    
    # Original data reference (for fallback)
    original_business_data: Optional[Dict[str, Any]] = None

# ============================================
# ALLOWED FIELDS FOR AI EDITING
# ============================================

ALLOWED_EDIT_PATHS = {
    "business.name",
    "business.category",
    "business.address",
    "business.phone",
    "business.whatsapp",
    "business.email",
    "opening_hours",
    "opening_hours.mon", "opening_hours.tue", "opening_hours.wed",
    "opening_hours.thu", "opening_hours.fri", "opening_hours.sat", "opening_hours.sun",
    "menu_or_services",
    "menu_or_services.mode",
    "menu_or_services.categories",
    "gallery",
    "about_text",
    "about_text.local",
    "about_text.en",
    "hero",
    "hero.tagline_local",
    "hero.tagline_en",
    "hero.image_url",
    "seo",
    "seo.title_local",
    "seo.title_en",
    "seo.meta_local",
    "seo.meta_en",
    "reviews",  # Only to hide/unhide
}

BLOCKED_EDIT_PATHS = {
    "content_id",
    "demo_id",
    "locale_lang",
    "last_updated",
    "change_log",
    "original_business_data",
    "business.country",
    "business.city",
    "business.google_maps_url",
}

# ============================================
# VALIDATION FUNCTIONS
# ============================================

def validate_hours(hours: OpeningHours) -> List[str]:
    """Validate opening hours format"""
    errors = []
    days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    day_names = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
    
    for day, name in zip(days, day_names):
        day_hours = getattr(hours, day)
        if not day_hours.closed:
            if day_hours.open and not re.match(r'^\d{1,2}:\d{2}$', day_hours.open):
                errors.append(f"{name}: formato orario apertura non valido ({day_hours.open})")
            if day_hours.close and not re.match(r'^\d{1,2}:\d{2}$', day_hours.close):
                errors.append(f"{name}: formato orario chiusura non valido ({day_hours.close})")
    return errors

def validate_menu_services(menu: MenuOrServices) -> List[str]:
    """Validate menu/services structure"""
    errors = []
    if not menu.categories:
        return []  # Empty is allowed
    
    for i, cat in enumerate(menu.categories):
        if not cat.name_local or not cat.name_en:
            errors.append(f"Categoria {i+1}: manca nome locale o inglese")
        if not cat.items:
            errors.append(f"Categoria '{cat.name_local}': nessun elemento")
        for j, item in enumerate(cat.items):
            if not item.name_local or not item.name_en:
                errors.append(f"Categoria '{cat.name_local}', item {j+1}: manca nome locale o inglese")
    return errors

def validate_translations(content: SiteContent) -> List[str]:
    """Ensure EN and local translations are present"""
    errors = []
    
    if content.about_text:
        if content.about_text.local and not content.about_text.en:
            errors.append("Testo 'Chi siamo': manca traduzione inglese")
        if content.about_text.en and not content.about_text.local:
            errors.append("Testo 'Chi siamo': manca traduzione locale")
    
    if content.hero:
        if content.hero.tagline_local and not content.hero.tagline_en:
            errors.append("Tagline hero: manca traduzione inglese")
        if content.hero.tagline_en and not content.hero.tagline_local:
            errors.append("Tagline hero: manca traduzione locale")
    
    if content.seo:
        if not content.seo.title_en or not content.seo.title_local:
            errors.append("SEO title: manca traduzione")
        if not content.seo.meta_en or not content.seo.meta_local:
            errors.append("SEO meta description: manca traduzione")
    
    return errors

def validate_patch_allowed(patch: Dict[str, Any]) -> List[str]:
    """Validate that patch only touches allowed fields"""
    errors = []
    
    def check_path(path: str) -> bool:
        # Check if path or any parent is in allowed paths
        parts = path.split('.')
        for i in range(len(parts)):
            partial = '.'.join(parts[:i+1])
            if partial in ALLOWED_EDIT_PATHS:
                return True
        # Check for array index patterns like "gallery.0" or "menu_or_services.categories.0"
        base_path = re.sub(r'\.\d+', '', path)
        if base_path in ALLOWED_EDIT_PATHS:
            return True
        return False
    
    def extract_paths(obj: Any, prefix: str = "") -> List[str]:
        paths = []
        if isinstance(obj, dict):
            for key, value in obj.items():
                new_prefix = f"{prefix}.{key}" if prefix else key
                paths.append(new_prefix)
                paths.extend(extract_paths(value, new_prefix))
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                new_prefix = f"{prefix}.{i}"
                paths.extend(extract_paths(item, new_prefix))
        return paths
    
    all_paths = extract_paths(patch)
    for path in all_paths:
        if path in BLOCKED_EDIT_PATHS:
            errors.append(f"Campo '{path}' non modificabile")
        elif not check_path(path):
            # Check if it's a deeply nested allowed path
            base = path.split('.')[0]
            if base not in ['business', 'opening_hours', 'menu_or_services', 'gallery', 
                           'about_text', 'hero', 'seo', 'reviews']:
                errors.append(f"Campo '{path}' non autorizzato per modifica AI")
    
    return errors

def validate_content(content: SiteContent) -> List[str]:
    """Run all validations on content"""
    errors = []
    errors.extend(validate_hours(content.opening_hours))
    errors.extend(validate_menu_services(content.menu_or_services))
    errors.extend(validate_translations(content))
    return errors

# ============================================
# MIGRATION: Convert old business_data to SiteContent
# ============================================

def migrate_to_site_content(demo_id: str, business_data: Dict[str, Any], 
                            content_data: Dict[str, Any], locale_lang: str = "it") -> SiteContent:
    """
    Convert existing demo data to new SiteContent schema.
    This allows gradual migration without breaking existing sites.
    """
    
    # Extract business info
    business = BusinessInfo(
        name=business_data.get('name', ''),
        category=business_data.get('category', ''),
        country=business_data.get('country', 'Italy'),
        city=business_data.get('city', ''),
        address=business_data.get('address', ''),
        phone=business_data.get('phone'),
        whatsapp=business_data.get('phone'),  # Default whatsapp = phone
        email=business_data.get('email'),
        google_maps_url=business_data.get('google_maps_link')
    )
    
    # Convert hours_text to OpeningHours
    opening_hours = OpeningHours()
    hours_text = business_data.get('hours_text', []) or []
    day_map = {
        'monday': 'mon', 'tuesday': 'tue', 'wednesday': 'wed',
        'thursday': 'thu', 'friday': 'fri', 'saturday': 'sat', 'sunday': 'sun',
        'lunedì': 'mon', 'martedì': 'tue', 'mercoledì': 'wed',
        'giovedì': 'thu', 'venerdì': 'fri', 'sabato': 'sat', 'domenica': 'sun'
    }
    
    for hour_line in hours_text:
        # Parse "Monday: 9:00 AM – 5:00 PM" or "Lunedì: 09:00 – 17:00" or "Monday: Closed"
        line = hour_line.lower().replace('\u202f', ' ').replace('\u2009', ' ')
        for day_name, day_code in day_map.items():
            if day_name in line:
                day_hours = getattr(opening_hours, day_code)
                if 'closed' in line or 'chiuso' in line:
                    day_hours.closed = True
                else:
                    # Extract times
                    time_match = re.findall(r'(\d{1,2}):(\d{2})\s*(?:am|pm)?', line, re.I)
                    if len(time_match) >= 2:
                        # Convert to 24h if needed
                        open_h, open_m = time_match[0]
                        close_h, close_m = time_match[1]
                        if 'pm' in line.lower() and int(open_h) < 12 and line.index(f"{open_h}:{open_m}") < line.index('pm'):
                            open_h = str(int(open_h) + 12) if 'am' not in line[:line.index(f"{open_h}:{open_m}")+5].lower() else open_h
                        if 'pm' in line.lower():
                            idx = line.rfind(f"{close_h}:{close_m}")
                            if 'pm' in line[idx:].lower() and int(close_h) < 12:
                                close_h = str(int(close_h) + 12)
                        day_hours.open = f"{int(open_h):02d}:{open_m}"
                        day_hours.close = f"{int(close_h):02d}:{close_m}"
                setattr(opening_hours, day_code, day_hours)
                break
    
    # Convert menu/services
    menu_or_services = MenuOrServices(mode="services")
    if content_data.get('menu_categories'):
        menu_or_services.mode = "menu"
        for cat in content_data['menu_categories']:
            items = []
            for item_name in cat.get('items', []):
                items.append(MenuItem(
                    name_local=item_name,
                    name_en=item_name  # Will need translation
                ))
            menu_or_services.categories.append(MenuCategory(
                name_local=cat.get('name', ''),
                name_en=cat.get('name', ''),
                items=items
            ))
    elif content_data.get('services'):
        for service in content_data['services']:
            if not menu_or_services.categories:
                menu_or_services.categories.append(MenuCategory(
                    name_local="Servizi",
                    name_en="Services",
                    items=[]
                ))
            menu_or_services.categories[0].items.append(MenuItem(
                name_local=service,
                name_en=service
            ))
    
    # Convert gallery
    gallery = []
    photos = business_data.get('photos', []) or []
    for i, photo in enumerate(photos):
        gallery.append(GalleryImage(
            url=photo.get('url', ''),
            order=i
        ))
    
    # About text
    about_text = LocalizedText(
        local=content_data.get('about_text', ''),
        en=content_data.get('about_text', '')  # Will need translation
    )
    
    # Hero
    hero = HeroContent(
        image_url=photos[0].get('url') if photos else None
    )
    
    # SEO
    seo = SeoContent(
        title_local=f"{business.name} | {business.category}",
        title_en=f"{business.name} | {business.category}",
        meta_local=f"{business.name} - {business.category} a {business.city}. Contattaci!",
        meta_en=f"{business.name} - {business.category} in {business.city}. Contact us!"
    )
    
    # Reviews
    reviews = []
    for r in business_data.get('reviews', []) or []:
        reviews.append(Review(
            author=r.get('author', 'Anonymous'),
            rating=r.get('rating', 5),
            text=r.get('text', ''),
            time=r.get('time'),
            relative_time_description=r.get('relative_time_description')
        ))
    
    return SiteContent(
        demo_id=demo_id,
        locale_lang=locale_lang,
        business=business,
        opening_hours=opening_hours,
        menu_or_services=menu_or_services,
        gallery=gallery,
        about_text=about_text,
        hero=hero,
        seo=seo,
        reviews=reviews,
        original_business_data=business_data
    )

# ============================================
# CONVERT SiteContent back to html_generator format
# ============================================

def site_content_to_render_data(content: SiteContent, lang: str = None) -> tuple:
    """
    Convert SiteContent to the format expected by html_generator.
    Returns (business_data, content_data) tuple.
    """
    if lang is None:
        lang = content.locale_lang
    
    is_local = (lang == content.locale_lang)
    
    # Build hours_text from opening_hours
    hours_text = []
    day_names_local = {
        'it': ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'],
        'fr': ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
        'es': ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        'de': ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
        'en': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }
    closed_text = {
        'it': 'Chiuso', 'fr': 'Fermé', 'es': 'Cerrado', 'de': 'Geschlossen', 'en': 'Closed'
    }
    
    day_names = day_names_local.get(lang, day_names_local['en'])
    closed = closed_text.get(lang, 'Closed')
    
    for i, day_code in enumerate(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']):
        day_hours = getattr(content.opening_hours, day_code)
        if day_hours.closed:
            hours_text.append(f"{day_names[i]}: {closed}")
        elif day_hours.open and day_hours.close:
            note = ""
            if day_hours.note and is_local:
                note = f" ({day_hours.note})"
            elif day_hours.note_en and not is_local:
                note = f" ({day_hours.note_en})"
            hours_text.append(f"{day_names[i]}: {day_hours.open} – {day_hours.close}{note}")
    
    # Build photos list
    photos = [{"url": img.url} for img in sorted(content.gallery, key=lambda x: x.order)]
    
    # Build reviews
    reviews = []
    for r in content.reviews:
        if not r.hidden:
            reviews.append({
                "author": r.author,
                "rating": r.rating,
                "text": r.text,
                "time": r.time,
                "relative_time_description": r.relative_time_description
            })
    
    business_data = {
        "name": content.business.name,
        "category": content.business.category,
        "country": content.business.country,
        "city": content.business.city,
        "address": content.business.address,
        "phone": content.business.whatsapp or content.business.phone,  # Prefer WhatsApp
        "email": content.business.email,
        "google_maps_link": content.business.google_maps_url or "",
        "hours_text": hours_text,
        "photos": photos,
        "reviews": reviews,
        "rating": content.original_business_data.get('rating', 0) if content.original_business_data else 0,
        "reviews_count": content.original_business_data.get('reviews_count', 0) if content.original_business_data else 0,
        "location": content.original_business_data.get('location', {}) if content.original_business_data else {},
        "site_language": content.locale_lang
    }
    
    # Build content_data
    content_data = {}
    
    # About text
    if is_local:
        content_data['about_text'] = content.about_text.local or content.about_text.en
    else:
        content_data['about_text'] = content.about_text.en or content.about_text.local
    
    # Menu/Services
    if content.menu_or_services.mode == "menu":
        content_data['menu_categories'] = []
        for cat in content.menu_or_services.categories:
            items = []
            for item in cat.items:
                item_name = item.name_local if is_local else item.name_en
                if item.price:
                    item_name += f" - {item.price}"
                items.append(item_name)
            content_data['menu_categories'].append({
                "name": cat.name_local if is_local else cat.name_en,
                "items": items
            })
    else:
        content_data['services'] = []
        for cat in content.menu_or_services.categories:
            for item in cat.items:
                content_data['services'].append(item.name_local if is_local else item.name_en)
    
    # Hero tagline
    if content.hero.tagline_local or content.hero.tagline_en:
        content_data['tagline'] = content.hero.tagline_local if is_local else content.hero.tagline_en
    
    # CTA text
    content_data['cta_text'] = None  # Use default from translations
    
    return business_data, content_data

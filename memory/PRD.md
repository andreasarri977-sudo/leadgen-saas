# LeadHunter Pro - Product Requirements Document

## Problema Originale
Piattaforma SaaS avanzata in italiano per automatizzare il processo di ricerca di aziende locali senza sito web, generare automaticamente siti web demo professionali e aiutare a trasformare queste aziende in clienti paganti. Target: freelance e agenzie.

## Requisiti Core

### Funzionalità Implementate ✅
1. **Ricerca Automatica Aziende** - Cerca per città, paese europeo e categoria via Google Maps (Places API New)
2. **Identificazione Lead** - Identifica aziende senza sito web o con sito obsoleto
3. **Filtri Lead Intelligenti** - Priorità a lead con buone recensioni/rating
4. **Database CRM** - Salva lead con stati (nuovo, demo creata, contattato, cliente)
5. **Generazione Siti Demo PRO** - Siti web completi white-label con:
   - 5 layout/colori diversi
   - Homepage, servizi/menu, galleria, contatti, mappa, recensioni
   - WhatsApp come CTA principale con messaggio precompilato tradotto
   - Language Switcher (EN + lingua locale)
6. **Supporto Multilingua Completo** - Sistema i18n per IT/FR/EN/ES/DE:
   - Tutte le stringhe UI tradotte
   - Contenuti generati nella lingua corretta
   - Orari localizzati (no giorni in inglese)
   - Messaggi WhatsApp tradotti
7. **Sistema Prenotazione Intelligente**:
   - `booking_mode`: none, appointment, table
   - Auto-detection basata su categoria (ristorante→table, parrucchiere→appointment, bar→none)
   - Supporto URL esterni (TheFork, Treatwell, Fresha, Doctolib, Calendly)
   - Notifiche email via Resend
8. **Dashboard CRM** - Gestione lead, visualizzazione demo, tracciamento conversioni
9. **Anteprime Demo Interne** - Route `/demo/:id` per visualizzare siti generati
10. **Gestione Comunicazioni** - Email (Resend) e WhatsApp outreach
11. **Gestione API Keys** - Pagina Settings per configurare Google Maps e Resend
12. **Impostazioni Lead Avanzate** - Override manuale per site_language e booking_mode

13. **Pubblicazione su Vercel** ✅ COMPLETATO
    - Deploy automatico su Vercel con API v13
    - Siti pubblici (no login richiesto)
    - URL formato: `nomeprogetto-demoID.vercel.app`
    - Supporto multilingua (index.html + en.html)
    - Quality check pre-deploy
    - UI per gestione deploy e ripubblicazione
14. **Collegamento Dominio Custom** ✅ PRONTO
    - Endpoint `/api/demos/{demo_id}/domain`
    - Mostra istruzioni DNS per configurazione
    - Verifica stato dominio

15. **Editor Manuale Siti (MVP)** ✅ COMPLETATO (2025-03-18)
    - Pagina `/site-editor/:demoId` con interfaccia a schede (Tabs)
    - **Tab Logo**: Anteprima, carica da URL, carica da file, rimuovi logo
    - **Tab Orari**: Editor per ogni giorno (aperto/chiuso, orari, note)
    - **Tab Menu/Servizi**: Switch menu/servizi, aggiunta/rimozione categorie e items
    - **Tab Testi**: Modifica "Chi siamo" e tagline (locale + EN)
    - **Tab Contatti**: Aggiornamento telefono, WhatsApp, email con validazione
    - **Tab Galleria**: Riordinare, rimuovere, aggiungere immagini via URL
    - **Tab SEO**: Titolo e meta description (locale + EN)
    - Pulsante "Ripubblica su Vercel" per deploy modifiche
    - Backend: `/api/sites/{demo_id}/editor-data`, `/update`, `/republish`
    - **19 test automatici passati** (pytest)

### Funzionalità Parzialmente Implementate 🟡
- **Contact Discovery** - Scraping email da siti web (in corso)
- **Contenuti Ristoranti** - Menu realistici generati via AI

### Funzionalità Pianificate 🔜
- **P1**: Generazione automatica loghi (OpenAI Image 1)
- **P1**: Generazione massiva siti demo (batch fino a 500)
- **P1**: Scansione giornaliera automatica per nuovi lead
- **P2**: CRM avanzato (tracciamento conversioni completo)
- **P2**: SEO avanzato (OpenGraph, Schema LocalBusiness, sitemap)

## Architettura Tecnica

### Stack
- **Frontend**: React, TailwindCSS, Shadcn UI, react-router-dom
- **Backend**: FastAPI, Pydantic, Motor (MongoDB async)
- **Database**: MongoDB
- **Integrations**: Google Places API (New), Resend, OpenAI GPT-5.2, Emergent LLM Key

### Struttura File Principali
```
/app/
├── backend/
│   ├── server.py         # API FastAPI + Editor endpoints
│   ├── html_generator.py # Generazione HTML per Vercel
│   ├── .env              # MONGO_URL, EMERGENT_LLM_KEY, VERCEL_TOKEN
│   ├── requirements.txt
│   └── tests/
│       ├── test_api.py
│       └── test_site_editor.py  # 19 test editor MVP
├── frontend/
│   └── src/
│       ├── App.js
│       ├── lib/
│       │   └── translations.js  # Sistema i18n completo
│       └── pages/
│           ├── Dashboard.jsx
│           ├── SearchLeads.jsx
│           ├── LeadDetail.jsx    # Con impostazioni lingua e booking
│           ├── DemoSites.jsx     # + pulsante Modifica Sito
│           ├── DemoPreview.jsx   # Sito demo PRO con WhatsApp e i18n
│           ├── SiteEditor.jsx    # ✅ NUOVO: Editor manuale MVP
│           ├── EmailManager.jsx
│           └── Settings.jsx
└── memory/
    └── PRD.md
```

### Modelli Database

#### Lead
```python
Lead(
    lead_id, place_id, name, category, address, city, country,
    phone, email, rating, reviews_count, reviews[], hours_text[],
    photos[], location{lat,lng}, google_maps_link, website,
    primary_type, types[], status,
    site_language,    # codice lingua: it, fr, en, es, de
    booking_mode,     # none, appointment, table
    external_booking_url,  # URL prenotazione esterna
    created_at
)
```

#### DemoSite
```python
DemoSite(
    demo_id, lead_id, business_name, internal_url, status,
    content{}, business_data{}, logo_base64, created_at
)
```

#### Booking
```python
Booking(
    booking_id, demo_id, lead_id, business_name, booking_type,
    date, time, customer_name, customer_phone, customer_email,
    number_of_people, notes, status, notification_sent, created_at
)
```

### API Endpoints Chiave
- `GET /api/stats/dashboard` - Statistiche dashboard
- `GET /api/leads` - Lista lead (supporta ?status=client per filtro)
- `GET /api/leads/{id}` - Singolo lead
- `PATCH /api/leads/{id}` - Aggiorna status lead (body JSON: {"status": "client"})
- `PATCH /api/leads/{id}/settings` - Aggiorna site_language, booking_mode
- `POST /api/search` - Ricerca nuove aziende
- `POST /api/demo/generate` - Genera sito demo
- `GET /api/demos/{id}` - Dati demo per rendering
- `DELETE /api/demos/{id}` - Elimina sito demo
- `POST /api/bookings` - Crea prenotazione
- `GET /api/bookings` - Lista prenotazioni
- `POST /api/demos/{id}/publish` - Pubblica su Vercel
- `POST /api/demos/{id}/domain` - Collega dominio custom
- `GET /api/demos/{id}/domain-status` - Verifica stato dominio
- **Editor MVP**:
  - `GET /api/sites/{id}/editor-data` - Dati strutturati per editor
  - `POST /api/sites/{id}/update` - Salva modifiche sezione
  - `POST /api/sites/{id}/republish` - Ripubblica su Vercel

## Changelog

### 2025-03-18: Miglioramenti UX Siti Demo ✅ COMPLETATO
- ✅ **Descrizioni Servizi Dinamiche**: Ogni servizio ha una descrizione unica basata sul tipo (non più "Servizio professionale di alta qualità" ripetuto)
- ✅ **Fix CSS Form Prenotazione**: Risolto overflow grigio su iOS nel selettore orario
- ✅ **Social Media nei Siti**: Aggiunto supporto per Instagram, Facebook, TikTok
  - Icone social nella sezione contatti del sito demo
  - Campi Social Media nell'editor sito (tab Contatti)
  - Salvati nel database e visualizzati automaticamente
- ✅ Traduzioni descrizioni servizi in IT, FR, EN, ES, DE

### 2025-03-18: Nuove Funzionalità CRM ✅ COMPLETATO
- ✅ **Filtro Clienti Acquisiti**: Card "Clienti Acquisiti" in Dashboard filtra lead con status=client
- ✅ **Checkbox "Pagato"**: Toggle nella lista Lead per marcare come cliente acquisito
- ✅ **Elimina Sito Demo**: Pulsante rosso con conferma per eliminare demo non più necessari
- ✅ Fix backend: nuovo endpoint `PATCH /api/leads/{lead_id}` con body JSON
- ✅ Fix backend: stats dashboard ora conta correttamente status inglesi e italiani

### 2025-03-18: Preparazione Deploy Vercel Production
- ✅ Creato `/app/vercel.json` per configurazione Vercel
- ✅ Creato `/app/api/` con serverless functions Python:
  - `health.py` - Health check
  - `stats/dashboard.py` - Statistiche dashboard
  - `leads/index.py` - Lista leads
  - `demos/index.py` - Lista demo sites
- ✅ Aggiornato frontend per usare path relativi (`/api/...`) 
- ✅ Creato `/app/frontend/src/lib/api.js` per configurazione API centralizzata
- ✅ Creato `/app/DEPLOY_VERCEL.md` con istruzioni complete
- ✅ Build frontend verificato OK

### 2025-03-18: Health Check + Keep-Alive
- ✅ Riattivata traduzione recensioni via GPT-5.2 durante deploy su Vercel
- ✅ Recensioni tradotte nella lingua locale del sito (IT/FR/ES/DE)
- ✅ Tempo relativo tradotto ("3 years ago" → "3 anni fa")
- ✅ Versione EN mantiene recensioni originali in inglese

### 2025-03-18: Editor Manuale Siti MVP ✅ COMPLETATO
- ✅ Creato `/app/frontend/src/pages/SiteEditor.jsx` con 7 tab complete
- ✅ Tab Logo: anteprima logo, carica da URL, carica da file (max 2MB), rimuovi
- ✅ Tab Orari: switch aperto/chiuso per ogni giorno, campi orario, note
- ✅ Tab Menu/Servizi: switch modalità, CRUD categorie e items
- ✅ Tab Testi: tagline e about in due lingue (locale + EN)
- ✅ Tab Contatti: telefono, WhatsApp, email con validazione
- ✅ Tab Galleria: aggiunta URL, rimozione, riordinamento immagini
- ✅ Tab SEO: title e meta description bilingue con contatore caratteri
- ✅ Pulsante "Salva Modifiche" per ogni sezione
- ✅ Pulsante "Ripubblica su Vercel" fixed in basso
- ✅ Route `/site-editor/:demoId` aggiunta in App.js
- ✅ Pulsante "Modifica Sito" aggiunto in DemoSites.jsx
- ✅ Backend endpoints testati: editor-data, update (con logo), republish
- ✅ 19 test pytest automatici passati (0 failures)
- ✅ Test file creato: `/app/backend/tests/test_site_editor.py`

### 2025-03-17: Fix Completo Lingua Recensioni e Orari
- ✅ Traduzione recensioni via LLM (GPT-5.2) nella lingua del sito
- ✅ Traduzione tempo relativo ("3 years ago" → "3 anni fa")
- ✅ Traduzione "Closed" → "Chiuso" (normalizzazione caratteri Unicode)
- ✅ Recensioni ordinate per data (più recenti prima)
- ✅ Supporto campo `time` come fallback per `relative_time_description`
- ✅ Formato orario 24h per lingue non inglesi

### 2025-03-17: Fix Recensioni e Orari - Coerenza Lingua
- ✅ Traduzione automatica orari (giorni della settimana) nella lingua del sito
- ✅ Formato orario 24h invece di AM/PM per lingue non inglesi
- ✅ Traduzione recensioni via LLM GPT-5.2 nella lingua locale
- ✅ API Google Places ora richiede contenuti nella lingua del paese
- ✅ Versione EN mantiene contenuti originali in inglese

### 2025-03-17: Pubblicazione Vercel Completa
- ✅ Deploy su Vercel funzionante con API v13
- ✅ Siti pubblici (fix encoding base64)
- ✅ Language switcher IT/EN funzionante anche su Vercel
- ✅ Fix warning UI "Token Vercel non configurato"
- ✅ Endpoint collegamento dominio custom pronto
- ✅ Quality check pre-deploy con pulizia errori post-successo

### 2025-03-17: White-Label PRO + WhatsApp + i18n Completo
- ✅ Implementato WhatsApp come CTA principale con messaggio precompilato tradotto
- ✅ Language Switcher (EN + lingua locale) nell'header
- ✅ Sistema i18n completo per IT/FR/EN/ES/DE
- ✅ Tutte le stringhe UI tradotte (nav, bottoni, sezioni, form, stati vuoti)
- ✅ Sticky bottom bar mobile con WhatsApp prominente
- ✅ Sistema prenotazione intelligente (appointment/table/none)
- ✅ Auto-detection booking_mode basata su categoria
- ✅ Override manuale lingua e booking in LeadDetail
- ✅ Supporto URL prenotazione esterna (TheFork, Treatwell, etc.)

### 2025-03-16: Ripristino e Fix Critici
- ✅ Risolto errore build frontend EmailManager.jsx
- ✅ Corretto server.py (funzione duplicata, import mancanti)
- ✅ Card Dashboard cliccabili
- ✅ Lista lead funzionante
- ✅ Test automatici superati

## Note per Sviluppo

### Badge "Made with Emergent"
Il badge visibile in basso a destra è un overlay della piattaforma Emergent, non del codice app. Viene rimosso automaticamente quando il sito viene esportato/deployato su dominio custom.

### Lingue Supportate
- 🇮🇹 Italiano (it)
- 🇫🇷 Français (fr)
- 🇬🇧 English (en)
- 🇪🇸 Español (es)
- 🇩🇪 Deutsch (de)

### Categorie Booking Mode
- `appointment`: parrucchiere, estetista, dentista, medico, veterinario, spa, massaggio, tatuatore
- `table`: ristorante, pizzeria, trattoria, osteria, steakhouse
- `none` (default): bar, caffè, pub, fast food, panetteria, gelateria

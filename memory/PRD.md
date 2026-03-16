# LeadHunter Pro - Product Requirements Document

## Problema Originale
Piattaforma SaaS avanzata in italiano per automatizzare il processo di ricerca di aziende locali senza sito web, generare automaticamente siti web demo professionali e aiutare a trasformare queste aziende in clienti paganti. Target: freelance e agenzie.

## Requisiti Core

### Funzionalità Implementate ✅
1. **Ricerca Automatica Aziende** - Cerca per città, paese europeo e categoria via Google Maps (Places API New)
2. **Identificazione Lead** - Identifica aziende senza sito web o con sito obsoleto
3. **Filtri Lead Intelligenti** - Priorità a lead con buone recensioni/rating
4. **Database CRM** - Salva lead con stati (nuovo, demo creata, contattato, cliente)
5. **Generazione Siti Demo** - Genera siti web completi con 5 layout diversi (homepage, servizi, galleria, contatti, mappa, recensioni)
6. **Supporto Multilingua** - Rileva paese e genera contenuti nella lingua locale
7. **Dashboard CRM** - Gestione lead, visualizzazione demo, tracciamento conversioni
8. **Anteprime Demo Interne** - Route `/demo/:id` per visualizzare siti generati
9. **Gestione Comunicazioni** - Email (Resend) e WhatsApp outreach
10. **Gestione API Keys** - Pagina Settings per configurare Google Maps e Resend

### Funzionalità Parzialmente Implementate 🟡
- **Contact Discovery** - Scraping email da siti web (in corso)
- **Contenuti Ristoranti** - Menu realistici generati via AI (in corso)

### Funzionalità Pianificate 🔜
- **P0**: Prenotazione online per attività su appuntamento
- **P1**: Generazione automatica loghi (OpenAI Image 1)
- **P1**: Generazione massiva siti demo (batch fino a 500)
- **P1**: Scansione giornaliera automatica per nuovi lead
- **P2**: CRM avanzato (tracciamento conversioni completo)
- **P2**: Esportazione sito + dominio personalizzato

## Architettura Tecnica

### Stack
- **Frontend**: React, TailwindCSS, Shadcn UI, react-router-dom
- **Backend**: FastAPI, Pydantic, Motor (MongoDB async)
- **Database**: MongoDB
- **Integrations**: Google Places API (New), Resend, OpenAI GPT-5.2

### Struttura File Principali
```
/app/
├── backend/
│   ├── server.py         # API FastAPI
│   ├── .env              # MONGO_URL, EMERGENT_LLM_KEY
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.js
│       └── pages/
│           ├── Dashboard.jsx
│           ├── SearchLeads.jsx
│           ├── LeadsList.jsx
│           ├── LeadDetail.jsx
│           ├── DemoSites.jsx
│           ├── DemoPreview.jsx
│           ├── EmailManager.jsx
│           └── Settings.jsx
```

### API Endpoints
- `GET /api/stats/dashboard` - Statistiche dashboard
- `GET /api/leads` - Lista lead
- `POST /api/search/companies` - Ricerca aziende Google
- `POST /api/demo/generate` - Genera sito demo
- `GET /api/demos` - Lista demo
- `GET /api/demos/:id` - Dettaglio demo
- `POST /api/email/generate` - Genera email AI
- `POST /api/whatsapp/generate` - Genera messaggio WhatsApp AI
- `GET/PUT /api/settings/api` - Gestione API keys

### Database Schema
- **Lead**: place_id, name, category, address, city, country, phone, email, rating, reviews, photos, hours, status, language
- **DemoSite**: demo_id, lead_id, business_name, demo_url, logo_base64, content, business_data, publish_status
- **APIKeys**: google_maps_api_key, resend_api_key

## Stato Attuale (Dicembre 2025)
- **Lead nel DB**: 65
- **Demo Generati**: 24
- **Backend**: 100% funzionante
- **Frontend**: 100% funzionante
- **Test**: 15/15 passed

## Bug Risolti in Questa Sessione
1. ✅ Import mancanti in server.py (aiohttp, resend)
2. ✅ Codice duplicato rimosso da server.py
3. ✅ Dashboard card ora cliccabili (navigano a /leads, /demos)
4. ✅ Lista lead visualizzata correttamente

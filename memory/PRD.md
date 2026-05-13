# WebFinder Studio - Product Requirements Document

## CHANGELOG
- **13/05/2026 (sera)** - Quick wins su pipeline lead e preventivi:
  - 🔍 **Barra di ricerca** nella pagina Lead: filtra in real-time per nome, città, categoria, telefono o email.
  - 👑 **Pulsante "Sì, è cliente!"** su ogni card Kanban (eccetto colonna "Cliente"): 1 click → status diventa `client`, toast con shortcut "Apri" che porta al dettaglio cliente.
  - 📄 **Due tipologie di preventivo PDF** selezionabili nella pagina Clienti:
    - **Senza P.IVA** (default, regime forfettario): solo Totale + dicitura legale "Operazione non soggetta a IVA ai sensi dell'art. 1 commi 54-89 L. 190/2014".
    - **Con P.IVA**: breakdown Imponibile + IVA 22% + Totale (IVA inclusa). Campi opzionali P.IVA/Codice Fiscale cliente vengono stampati in intestazione.
    - Switcher visuale con preview live del totale, persistito in `client_costs.tax_mode`.

- **13/05/2026** - FASE 1 + FASE 2 completate:

  **FASE 1 — Pagina "Clienti" dedicata** (sostituisce "Prenotazioni" in sidebar):
  - Nuova pagina `/clients` con lista clienti acquisiti + dettaglio.
  - Tracking costi manuali per cliente: sito, dominio, hosting, extra (con label custom).
  - Totale calcolato automaticamente + toggle "Pagato" con data pagamento.
  - Note interne per ogni cliente.
  - Stats top-page: fatturato totale, incassato, da incassare.
  - Stats dashboard estese con `total_revenue` e `paid_revenue` (aggregate MongoDB pipeline).
  - 1-click da dettaglio cliente: vedi sito, modifica sito, genera/scarica preventivo PDF, invia preventivo via email (Resend), genera/invia messaggio WhatsApp (standard + variante AI).
  - Salvataggio costi via `POST /api/leads?action=save_client_costs` (Vercel + FastAPI in parità).
  - Rimosso "Prenotazioni" dalla sidebar (vecchia pagina Bookings ancora raggiungibile via route dedicata se serve).

  **FASE 2 — Riordinamento sezioni del sito**:
  - Nuovo tab "Layout" nell'editor con drag & drop verticale + frecce ▲▼.
  - 11 sezioni riordinabili: Chi siamo, Servizi/Menu, Perché sceglierci, Galleria, Recensioni, Orari, Prenotazioni, FAQ, Mappa, Contatti, Social.
  - Implementazione via CSS `order` su ogni `<section>` di `DemoPreview.jsx` (zero rischio di regressione sui contenuti).
  - Persistenza: `content.section_order: ['hero', 'services', ...]` in MongoDB.
  - Endpoint `POST /api/demos/{id}?action=update` con `section='layout'` (Vercel + FastAPI in parità).
  - Validazione server-side: solo id di sezioni note, no duplicati.
  - Pulsante "Ripristina default" per tornare all'ordine originale.

- **11/05/2026** - Fix generazione batch demo:
  - Risolto crash modal "Generazione Bulk Demo" causato da `<SelectItem value="">` non supportato da Radix UI (sentinel `__none__`).
  - Aggiunti pulsanti **Seleziona tutti / Deseleziona** in testa alla board + select-all per colonna Kanban.
  - Checkbox di selezione lead più visibili (size + accent blue) e counter "X / Y selezionati".
  - Frontend ora prova prima `/api/demos?action=batch_generate` poi fallback a `/api/demo/batch` (resilienza).
  - Backend FastAPI locale ora ritorna lo stesso shape `{message, count, results:{created/skipped/errors}}` della funzione Vercel.
  - Verificato end-to-end: creazione di più demo in batch confermata (DB ha gli ID nuovi).


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
- ✅ **Sezione Social Media Dedicata**: 
  - Nuova sezione "Seguici sui Social" con icone grandi e colorate (Instagram, Facebook, TikTok)
  - Appare SOLO se l'attività ha almeno un social configurato
  - Cliccando si apre la pagina social del cliente
  - Campi Social Media nell'editor sito (tab Contatti)
  - I social vengono presi automaticamente dal lead e mostrati nel demo
- ✅ Traduzioni sezione social in IT, FR, EN, ES, DE

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

### 2026-02-11 (part 8): Kanban-only + Tab Impostazioni Sito Completo
- ✅ **Lead → solo vista Kanban** (rimossa List view): toggle bottoni eliminato. Le carte Kanban ora hanno checkbox per selezione multipla (per bulk demo) + drag handle + click area dedicata per aprire dettagli.
- 🐛 **Fix Kanban drag&drop**: gli status nel DB sono italiani (`demo_creata`, `contattato`, `client`) mentre le colonne usavano inglese (`demo_created`, `contacted`). Aggiunti `aliases` per ogni colonna così il matching funziona in entrambe le direzioni.
- ✨ **Nuovo Tab "⚙️ Impostazioni"** nel SiteEditor (badge blu evidenziato) con:
  - 🌐 **Lingue del sito**: dropdown lingua principale (13 lingue) + multi-select fino a 4 traduzioni
  - 📅 **Sistema Prenotazioni**: 4 modalità radio (Nessuna / Tavolo / Appuntamento / Link esterno con URL)
  - 👁️ **Sezioni Visibili**: toggle on/off per Servizi, Perché Sceglierci, Galleria, Recensioni, Orari, FAQ, Mappa
- ✨ Endpoint backend `?action=update&section=site_settings` in `demos/[id]/index.py` valida le traduzioni (max 4, dedupe da primary).
- ✨ DemoPreview rispetta i toggle: ogni sezione si nasconde se `content.show_*` è false.
- ✨ Endpoint editor-data espone i nuovi campi: site_language, translations, booking_mode, external_booking_url, show_*.


### 2026-02-11 (part 7): 3 Bug Critici Risolti
- 🐛 **PATCH /api/leads/{id} non esisteva** → Kanban drag&drop falliva e anche il toggle "Segna come cliente" era rotto da prima (silenziosamente). Aggiunto `do_PATCH` in `leads.py` con parsing intelligente di `lead_id` (query string Vercel rewrite + fallback path).
- 🛠️ **Rewrite Vercel** aggiunta in `vercel.json` per mappare `/api/leads/:lead_id` → `/api/leads?lead_id=:lead_id` (altrimenti Vercel 404 perché non c'è `/api/leads/[id]/index.py`).
- ✨ **AI template_apply_inline preserva tutto**: l'apply AI ora aggiorna SOLO i campi che la AI genera (color_scheme, tagline, FAQ, why_choose_us, testi) e NON tocca services, gallery, hide_watermark, reviews, ecc. In più, se `business_data.booking_mode` è 'none' su un vecchio demo, lo ricomputa automaticamente da `category` (così la sezione prenotazione torna a comparire).
- 📝 Batch ancora richiede deploy del fix part 6 per funzionare correttamente.


### 2026-02-11 (part 6): Fix Batch + AI per-Business
- 🐛 **Fix critico Batch Generation**: il generatore batch creava demo con campi minimi (`about` invece di `about_text`, `services=[]` vuoto, no FAQ, no why_choose_us) → pagina bianca quando si apriva il demo. Riscritto `/api/demo/batch/index.py` per usare la stessa logica ricca di `/api/demo/generate` (services map per categoria, booking_mode auto, FAQ + why_choose_us di default), con override opzionale via template.
- ✨ **AI Template contestualizzato all'attività**: tab "Genera con AI" nel modal Template adesso usa automaticamente `business_name`, `category`, `city` del sito corrente (no più input manuale). 2 azioni: "Applica subito a questo sito" (genera + applica al volo) o "Salva come template" (riutilizzabile). Style ora dropdown con 7 preset.
- ✨ Endpoint `?action=template_apply_inline` su `demos/[id]/index.py` per applicare contenuti AI generati al volo (senza prima salvare come template).


### 2026-02-11 (part 5): ✨ Template Generati da AI (Claude Sonnet 4.5)
- ✅ Aggiunta integrazione `emergentintegrations` su Vercel (`api/requirements.txt` con `--extra-index-url`).
- ✅ Nuovo endpoint `?action=template_ai_generate` in `demos.py`: prende categoria + stile → Claude Sonnet 4.5 → JSON template strutturato (color_scheme, hero settings, tagline, why_choose_us 4 items, FAQ 5 items, testi) → salvato in collection `templates` con flag `ai_generated=true`.
- ✅ Frontend: 3° tab "✨ Genera con AI" nel TemplateModal con form (categoria specifica + stile descrittivo) e CTA gradient viola/rosa. Badge **AI** nel listino template per distinguere quelli generati.
- ✅ Universal Key Emergent (`EMERGENT_LLM_KEY`) richiesta nelle env Vercel; costo ~pochi centesimi/generazione.
- ✅ Build pulita, 12/12 funzioni Vercel.


### 2026-02-11 (part 4): Pixel Tracking + Kanban + Follow-up + Gallery Upload + Mobile Toggle
- ✅ **Pixel di tracciamento**: nuovo endpoint `?action=track` su `demos/[id]/index.py` con collection `demo_views`. Click delegation in `DemoPreview.jsx` cattura view + click WhatsApp/phone/maps in fire-and-forget (session ID per dedupe). Endpoint `?action=stats` per visualizzare statistiche.
- ✅ **Hot Leads widget** in Dashboard: nuovo `?action=hot_leads` in `leads.py` che aggrega le views per lead e calcola uno score (1 view = 1pt, sessione = 3pt, click = 5pt). Top 20 visibili con emoji 🔥 sopra 15 punti.
- ✅ **Follow-up semi-automatici**: `?action=followups` lista lead status=demo_created/contacted con last_contact_at > 3 giorni. `?action=send_followups` batch: invia email automatiche via Resend + prepara link WhatsApp pronti da aprire in sequenza. Widget "Da Ricontattare" in Dashboard con button bulk.
- ✅ **Pipeline Kanban dei Lead**: toggle Lista/Kanban in `LeadsList.jsx`. View Kanban con 4 colonne (Nuovo → Demo → Contattato → Cliente) + drag&drop HTML5 nativo. Preferenza salvata in `localStorage`.
- ✅ **Upload diretto galleria**: in `GalleryEditor` aggiunto input file multiplo (max 1.5MB/img) che converte in base64 → salva in `content.gallery`. Coesiste con l'inserimento via URL classico.
- ✅ **Mobile/Desktop toggle in LivePreview**: toggle in alto al pannello anteprima del Tab Stile che restringe la preview a 200px (mobile) o full-width (desktop).
- ✅ Tutto entro 12/12 funzioni Vercel.


### 2026-02-11 (part 3): Watermark + Template + Bulk Generation Pro
- ✅ **Watermark "Realizzato da WebFinder Studio"** nel footer dei siti demo (`DemoPreview.jsx`), con toggle on/off dal Tab "Stile" del SiteEditor (`content.hide_watermark`). Backend aggiornato (`demos/[id]/index.py`) per persistere il flag.
- ✅ **Sistema Template**: collection `templates` MongoDB. CRUD completo in `demos.py` (`?action=templates`, `?action=template_save`, `?action=template_delete`). Apply in `demos/[id]/index.py` (`?action=template_apply`). Modal "Template" nel SiteEditor (pulsante viola) per salvare lo stato attuale come preset (colore + hero + perché sceglierci + FAQ + testi) e applicare un template a un sito esistente in 1 click.
- ✅ **Bulk Generation Pro**: la già esistente selezione multipla in `LeadsList.jsx` ora apre un **modal completo** che permette di scegliere un **template** da applicare a tutti i demo generati contemporaneamente. Riepilogo finale con conteggio Creati/Saltati/Errori e link diretto ai demo creati. Backend `/api/demo/batch` esteso per accettare `template_id`.
- ✅ Tutto entro le 12/12 funzioni Vercel.

### 2026-02-11 (part 2): Branding WebFinder Studio
- ✅ Logo WebFinder Studio caricato e ottimizzato in `/app/frontend/public/logo-webfinder.png`.
- ✅ Sidebar app aggiornata con logo circolare + nome "WebFinder Studio" (sostituisce vecchio "LeadHunter Pro").
- ✅ Favicon, apple-touch-icon, tutti gli icon PWA (16, 32, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512) rigenerati dal nuovo logo.
- ✅ `manifest.json`, `index.html` title + meta tags aggiornati con "WebFinder Studio".
- ✅ Logo **preconfigurato come default** nel PDF preventivo: file `api/assets_logo.b64` bundled tramite `vercel.json > includeFiles`. Helper `_load_default_logo()` in `leads.py` + `demos/[id]/index.py` con multi-path lookup.
- ✅ Seed automatico: al primo GET di `?action=user_settings` la collection `user_settings` viene popolata con profilo default (company_name="WebFinder Studio", logo Webfinder, prezzo 800 EUR, note legali base). L'utente può sovrascrivere tutto dalle Impostazioni.
- ✅ Aggiunti tutti i 27 colori vivaci alla mappa `COLOR_SCHEME_MAP` in `DemoPreview.jsx` (sky, cyan, violet, fuchsia, rose, yellow, lime, emerald, gold, coral, mint, lavender, peach, navy, maroon, forest, black + 10 base) per allinearla a `SiteEditor.jsx`. Risolto bug per cui i colori vivaci non si applicavano ai siti demo.
- ✅ Build verificata: tutte le classi Tailwind (`from-fuchsia-600`, `bg-sky-50`, `from-emerald-400`, `from-blue-950`, ecc.) compilate correttamente nel CSS finale.

### 2026-02-11: Fix Color Scheme Map + Mobile UI + Live Color Preview + 💰 Preventivo PDF
- ✅ Header mobile sticky (Layout.jsx) verificato: barra "Dashboard" rimane visibile durante lo scroll.
- ✅ **Live Color Preview** dentro `SiteEditor.jsx` Tab "Stile": pannello sticky con mini-anteprima sito real-time (hero + bottone + card accent) + link "↗ Schermo intero" che apre il sito live in nuova scheda.
- ✅ **NUOVO: Generatore Preventivi PDF + Invio Automatico al Cliente**:
  - Sezione "Dati Preventivi" in `Settings.jsx` (logo, ragione sociale, P.IVA, indirizzo, IBAN, prezzo standard, valuta, note legali) — l'utente compila quando vuole.
  - Pulsante verde "Preventivo" in header `SiteEditor.jsx` → apre `QuoteModal`.
  - Modal con: prezzo (default da impostazioni), valuta, note custom, email destinatario (default dal cliente del sito).
  - 2 azioni: "Solo Scarica PDF" (download locale) oppure "Genera e Invia al cliente" (PDF + email automatica tramite Resend con allegato).
  - PDF professionale a colori con header con logo, dati intestatario, descrizione servizi, totale, modalità pagamento, note legali.
  - Persistenza in collection `quotes` su MongoDB per storico.
  - **Tutto implementato dentro file esistenti** (`leads.py` + `demos/[id]/index.py`) per restare a 12/12 funzioni Vercel.
- 📦 Aggiunte deps Vercel: `fpdf2==2.7.9`, `resend==2.4.0` in `api/requirements.txt`.



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

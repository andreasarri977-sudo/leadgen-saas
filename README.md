# 🚀 LeadHunter Pro

**Piattaforma SaaS avanzata per automatizzare la ricerca di aziende locali senza sito web e generare siti demo professionali**

---

## 📖 Descrizione

LeadHunter Pro è una piattaforma completa progettata per freelance e agenzie digitali che vogliono trovare rapidamente aziende senza presenza online e proporre loro siti web professionali.

### 🎯 Caratteristiche Principali

#### 🔍 Ricerca Automatica Aziende
- Ricerca per città, paese e categoria
- Integrazione con Google Maps API
- Raccolta automatica di dati completi (nome, indirizzo, telefono, recensioni, foto)
- Identificazione automatica aziende senza sito web
- Filtri intelligenti (min recensioni, rating minimo)

#### 🌐 Generazione Automatica Siti Demo
- Creazione automatica siti web professionali
- Contenuti AI-generated con OpenAI GPT-5.2
- Logo automatici con OpenAI Image Generation
- Supporto multilingua (IT, FR, ES, DE, EN)
- Design moderno e mobile responsive
- Servizi specifici per categoria business

#### 🎨 Logo Automatici
- Generazione logo professionale con AI
- Stile minimale e moderno
- Personalizzato per ogni business

#### 🌍 Supporto Multilingua
- Rilevamento automatico lingua da paese
- Contenuti generati nella lingua locale
- Supporto per IT, FR, ES, DE, EN

#### 📊 Dashboard CRM Completa
- Visualizzazione statistiche in tempo reale
- Gestione lead con stati (nuovo lead, demo creata, contattato, cliente acquisito)
- Filtri avanzati
- Tracciamento conversioni

#### 📧 Generazione Email Professionali
- Email personalizzate AI-generated
- Template professionali
- Invio diretto con Resend
- Tracking stati contatto

#### 💬 Comunicazione Multi-Canale
- Generazione email professionali
- Script messaggi WhatsApp
- Script chiamate telefoniche

#### ⚡ Generazione Batch
- Generazione fino a 500 siti demo in batch
- Elaborazione in background
- Progress tracking

---

## 🛠️ Stack Tecnologico

### Backend
- **Framework:** FastAPI (Python)
- **Database:** MongoDB
- **AI:** OpenAI GPT-5.2 (via Emergent LLM Key)
- **Image Generation:** OpenAI Image Generation (GPT Image 1)
- **Maps:** Google Maps API
- **Email:** Resend

### Frontend
- **Framework:** React 19
- **Routing:** React Router v7
- **UI Components:** Shadcn/UI
- **Styling:** TailwindCSS
- **Icons:** Lucide React
- **Notifications:** Sonner

### Integrazioni
- **emergentintegrations:** Libreria unificata per LLM e Image Generation
- **googlemaps:** Client Python per Google Maps API
- **resend:** SDK per invio email

---

## 🚀 Quick Start

### Prerequisiti
- Node.js 18+
- Python 3.11+
- MongoDB
- Supervisor (per gestione servizi)

### 1. Clona il repository
```bash
git clone <repository-url>
cd leadhunter-pro
```

### 2. Configura Backend
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configura Frontend
```bash
cd frontend
yarn install
```

### 4. Configura API Keys
Vedi [SETUP_API_KEYS.md](/app/SETUP_API_KEYS.md) per istruzioni dettagliate.

**API Keys necessarie:**
- ✅ **Emergent LLM Key:** Già configurata
- ⚠️ **Google Maps API Key:** [Ottieni qui](https://console.cloud.google.com)
- ⚠️ **Resend API Key:** [Ottieni qui](https://resend.com)

### 5. Avvia i servizi
```bash
# Riavvia backend e frontend
sudo supervisorctl restart backend frontend

# Verifica stato
sudo supervisorctl status
```

### 6. Accedi all'applicazione
Apri il browser su: `https://business-site-gen-1.preview.emergentagent.com`

---

## 📁 Struttura Progetto

```
/app/
├── backend/
│   ├── server.py              # API FastAPI principale
│   ├── requirements.txt       # Dipendenze Python
│   └── .env                   # Variabili ambiente
├── frontend/
│   ├── src/
│   │   ├── App.js            # App principale React
│   │   ├── components/       # Componenti riutilizzabili
│   │   │   ├── Layout.jsx    # Layout con sidebar
│   │   │   └── ui/           # Shadcn UI components
│   │   └── pages/            # Pagine applicazione
│   │       ├── Dashboard.jsx       # Dashboard statistiche
│   │       ├── SearchLeads.jsx     # Ricerca aziende
│   │       ├── LeadsList.jsx       # Lista lead
│   │       ├── LeadDetail.jsx      # Dettaglio lead
│   │       ├── DemoSites.jsx       # Siti demo
│   │       └── EmailManager.jsx    # Gestione email
│   ├── package.json          # Dipendenze Node.js
│   └── .env                  # Variabili ambiente frontend
├── design_guidelines.json     # Linee guida design
├── README.md                  # Questa guida
└── SETUP_API_KEYS.md         # Guida configurazione API keys
```

---

## 🎨 Design System

### Identità Visiva
- **Nome:** LeadHunter Pro
- **Archetype:** The Performance Pro × Swiss High-Contrast
- **Vibe:** Precisione, Automazione, Autorità, Eleganza Italiana

### Colori
- **Primary (Volt Blue):** `#007AFF` - Azioni principali
- **Secondary (Deep Obsidian):** `#0A0A0A` - Sidebar, headers
- **Accent (Signal Green):** `#34C759` - Stati successo
- **Background Light:** `#FFFFFF`
- **Background Subtle:** `#F5F5F7`

### Tipografia
- **Headings:** Barlow Condensed (600, 700, 800)
- **Body:** Inter (400, 500)
- **Mono:** JetBrains Mono

---

## 🔌 API Endpoints

### Ricerca e Lead
- `POST /api/search/companies` - Cerca aziende su Google Maps
- `GET /api/leads` - Lista tutti i lead
- `GET /api/leads?status={status}` - Filtra lead per stato
- `PATCH /api/leads/{lead_id}/status` - Aggiorna stato lead

### Generazione Demo
- `POST /api/demo/generate` - Genera singolo sito demo
- `POST /api/demo/batch` - Genera batch siti demo
- `GET /api/demos` - Lista tutti i siti demo

### Email e Comunicazione
- `POST /api/email/generate` - Genera email professionale
- `POST /api/email/send` - Invia email
- `POST /api/whatsapp/generate` - Genera messaggio WhatsApp

### Statistiche
- `GET /api/stats/dashboard` - Statistiche dashboard

---

## 📊 Stati Lead

| Stato | Descrizione | Colore |
|-------|-------------|--------|
| `nuovo_lead` | Lead appena trovato | 🔵 Blu |
| `demo_creata` | Sito demo generato | 🟣 Viola |
| `contattato` | Lead contattato via email/telefono | 🟡 Giallo |
| `cliente_acquisito` | Lead convertito in cliente | 🟢 Verde |

---

## 🌍 Lingue Supportate

| Paese | Lingua | Codice |
|-------|--------|--------|
| Italia | Italiano | IT |
| Francia | Francese | FR |
| Spagna | Spagnolo | ES |
| Germania | Tedesco | DE |
| Regno Unito | Inglese | GB/UK |

---

## 📈 Categorie Business Supportate

- Parrucchiere
- Ristorante
- Estetista
- Dentista
- Palestra
- Idraulico
- Elettricista
- Bar
- Pizzeria
- Meccanico
- *...e altre*

Ogni categoria ha servizi specifici pre-configurati per generazione contenuti ottimale.

---

## 🔐 Sicurezza

- Tutte le API keys sono gestite tramite variabili ambiente
- CORS configurato per domini autorizzati
- Nessuna API key hardcoded nel codice
- MongoDB ObjectId esclusi dalle risposte API

---

## 🧪 Testing

### Test Backend
```bash
cd backend
pytest
```

### Test Frontend
```bash
cd frontend
yarn test
```

### Test API con cURL
```bash
# Test health check
curl https://business-site-gen-1.preview.emergentagent.com/api/

# Test statistiche
curl https://business-site-gen-1.preview.emergentagent.com/api/stats/dashboard
```

---

## 🚧 Prossimi Sviluppi

- [ ] Scheduler automatico scansione giornaliera
- [ ] Export lead in CSV/Excel
- [ ] Integrazione Vercel per deployment automatico siti demo
- [ ] Collegamento domini personalizzati
- [ ] Analytics avanzati conversioni
- [ ] Multi-tenancy per agenzie
- [ ] Integrazione CRM esterni (HubSpot, Pipedrive)
- [ ] Automazione follow-up email
- [ ] Template personalizzabili siti demo
- [ ] A/B testing email subject

---

## 📝 Note Importanti

### Emergent LLM Key
La piattaforma utilizza la **Emergent LLM Key** (chiave universale) per:
- ✅ Generazione contenuti con OpenAI GPT-5.2
- ✅ Generazione logo con OpenAI Image Generation (GPT Image 1)

**Crediti:** Vengono detratti dal saldo chiave universale. Per ricaricare vai su: Profilo → Universal Key → Add Balance

### Limiti API Gratuiti

**Google Maps API:**
- $200/mese credito gratuito
- ~6,250 ricerche gratuite al mese
- Imposta budget alert consigliati

**Resend:**
- 3,000 email gratuite al mese
- Nessuna carta richiesta per piano gratuito

---

## 🤝 Supporto

Per assistenza:
1. Consulta [SETUP_API_KEYS.md](/app/SETUP_API_KEYS.md)
2. Controlla i log: `tail -f /var/log/supervisor/backend.err.log`
3. Verifica stato servizi: `sudo supervisorctl status`

---

## 📄 Licenza

Proprietà di Emergent Labs - Tutti i diritti riservati

---

## 🎉 Credits

Sviluppato con:
- ❤️ AI-powered content generation
- 🚀 Modern React & FastAPI stack
- 🎨 Shadcn/UI components
- 💡 Emergent integrations library

**Versione:** 1.0.0  
**Ultimo aggiornamento:** Gennaio 2026

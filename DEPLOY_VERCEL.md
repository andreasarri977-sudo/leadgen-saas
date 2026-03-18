# 🚀 Deploy LeadHunter Pro su Vercel (Produzione)

## ⚠️ IMPORTANTE: Perché Fare il Deploy su Vercel

La preview Emergent va in sleep dopo inattività → "Wake up servers" → Non accettabile in produzione.

**Con Vercel Production:**
- ✅ Nessun cold start (serverless functions si avviano in <1 sec)
- ✅ Sempre online 24/7
- ✅ Nessun "Made with Emergent"
- ✅ HTTPS automatico
- ✅ CDN globale
- ✅ Dominio personalizzato gratuito

---

## ⚡ Deploy in 5 Minuti

### 1. Scarica il codice
1. Su Emergent, clicca **"Download Code"** (icona download in alto a destra)
2. Estrai lo ZIP scaricato

### 2. Installa Vercel CLI
```bash
npm i -g vercel
```

### 3. Login e Deploy
```bash
cd leadhunter-pro  # cartella estratta
vercel login       # prima volta
vercel --prod      # deploy production
```

### 4. Configura Environment Variables
Quando richiesto, o su **vercel.com → Settings → Environment Variables**:

| Variabile | Valore |
|-----------|--------|
| `MONGO_URL` | `mongodb+srv://...` (la tua stringa MongoDB Atlas) |
| `DB_NAME` | `leadhunter` |
| `VERCEL_TOKEN` | Token Vercel per deploy demo sites |
| `GOOGLE_MAPS_API_KEY` | Per ricerca aziende |
| `EMERGENT_LLM_KEY` | Per AI (opzionale) |
| `RESEND_API_KEY` | Per email (opzionale) |

### 5. Verifica
```bash
# Test health check
curl https://tuo-progetto.vercel.app/api/health
# Deve restituire: {"status": "ok", ...}
```

---

## 📂 Struttura File per Vercel

```
/
├── api/                    # Vercel Serverless Functions (Python)
│   ├── health.py          # GET /api/health
│   ├── stats/
│   │   └── dashboard.py   # GET /api/stats/dashboard
│   ├── leads/
│   │   └── index.py       # GET /api/leads
│   ├── demos/
│   │   └── index.py       # GET /api/demos
│   └── requirements.txt   # Dipendenze Python
├── frontend/              # React App
│   ├── build/            # Output build
│   └── src/
├── vercel.json           # Configurazione Vercel
└── DEPLOY_VERCEL.md      # Questo file
```

---

## 🔧 Se Hai Bisogno di Più API

Le API base sono pronte. Se ti servono altre funzioni (es. `/api/sites/{id}/publish`), 
crea nuovi file in `/api/` seguendo lo stesso pattern.

Esempio per `/api/sites/[id]/publish.py`:
```python
from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Il path sarà tipo /api/sites/abc123/publish
        # Estrai l'ID dal path
        path_parts = self.path.split('/')
        site_id = path_parts[3] if len(path_parts) > 3 else None
        
        # ... logica di publish ...
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"success": True}).encode())
```

---

## 🆘 Troubleshooting

### "MONGO_URL not found"
→ Aggiungi la variabile su Vercel Dashboard → Settings → Environment Variables

### API restituisce 500
→ Controlla i log: Vercel Dashboard → Deployments → clicca deploy → Functions → Logs

### Frontend non carica dati
→ Verifica che `/api/health` funzioni: `curl https://tuo-sito.vercel.app/api/health`

### "Module not found"
→ Verifica che `api/requirements.txt` contenga tutte le dipendenze

---

## 📞 Supporto

Se hai problemi, torna su Emergent e chiedi assistenza con i dettagli dell'errore.

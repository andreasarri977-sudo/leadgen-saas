# 🔑 Guida Configurazione API Keys - LeadHunter Pro

## 📋 Panoramica

Per utilizzare tutte le funzionalità di LeadHunter Pro, devi configurare le seguenti API keys:

### ✅ Emergent LLM Key
**Status:** ✅ GIÀ CONFIGURATA  
**Utilizzo:** Generazione contenuti AI e loghi  
**Modelli disponibili:**
- OpenAI GPT-5.2 per contenuti testuali
- OpenAI Image Generation (GPT Image 1) per loghi

### ⚠️ Google Maps API Key
**Status:** ⚠️ DA CONFIGURARE  
**Utilizzo:** Ricerca automatica aziende locali  
**Necessaria per:** Funzionalità "Cerca Aziende"

### ⚠️ Resend API Key
**Status:** ⚠️ DA CONFIGURARE  
**Utilizzo:** Invio email professionali  
**Necessaria per:** Funzionalità "Email"

---

## 1️⃣ Google Maps API Key

### Passo 1: Crea un progetto Google Cloud
1. Vai su https://console.cloud.google.com
2. Clicca su "Nuovo Progetto" in alto
3. Inserisci un nome (es. "LeadHunter Pro")
4. Clicca "Crea"

### Passo 2: Abilita le API necessarie
1. Nel menu laterale, vai su "API e servizi" → "Libreria"
2. Cerca e abilita questa API:
   - **Places API (New)** (OBBLIGATORIA - NON la versione legacy)

### Passo 3: Crea le credenziali
1. Vai su "API e servizi" → "Credenziali"
2. Clicca "Crea credenziali" → "Chiave API"
3. Copia la chiave generata (formato: `AIza...`)

### Passo 4: Configura le restrizioni (IMPORTANTE)
1. Clicca sulla chiave appena creata
2. **Restrizioni applicazione:**
   - Seleziona "Referrer HTTP"
   - Aggiungi: `https://web-pitch-generator.preview.emergentagent.com/*`
   - Aggiungi: `http://localhost:*/*` (solo per sviluppo locale)
3. **Restrizioni API:**
   - Seleziona "Limita chiave"
   - Seleziona solo le API abilitate al Passo 2
4. Salva

### Passo 5: Abilita fatturazione
⚠️ **OBBLIGATORIO** - Senza fatturazione la mappa mostrerà "For development purposes only"

1. Nel menu laterale, vai su "Fatturazione"
2. Collega un metodo di pagamento
3. **Piano gratuito:** $200/mese di crediti gratuiti (~28,000 ricerche)
4. Imposta avvisi budget per sicurezza

### Passo 6: Aggiungi la chiave all'applicazione
1. Apri il file `/app/backend/.env`
2. Trova la riga: `GOOGLE_MAPS_API_KEY=`
3. Incolla la tua chiave: `GOOGLE_MAPS_API_KEY=AIza...`
4. Salva il file
5. Riavvia il backend: `sudo supervisorctl restart backend`

---

## 2️⃣ Resend API Key

### Passo 1: Crea un account Resend
1. Vai su https://resend.com
2. Clicca "Sign Up" e crea un account
3. Verifica la tua email

### Passo 2: Crea una API Key
1. Accedi alla Dashboard Resend
2. Vai su "API Keys" nel menu laterale
3. Clicca "Create API Key"
4. Inserisci un nome (es. "LeadHunter Pro")
5. Copia la chiave generata (formato: `re_...`)

### Passo 3: Verifica dominio email (Opzionale ma consigliato)
Per inviare email dal tuo dominio:
1. Vai su "Domains" nella Dashboard
2. Clicca "Add Domain"
3. Inserisci il tuo dominio (es. `tuodominio.com`)
4. Segui le istruzioni per aggiungere i record DNS
5. Verifica il dominio

**Nota:** In modalità test puoi usare `onboarding@resend.dev` come mittente, ma le email arriveranno solo agli indirizzi verificati.

### Passo 4: Aggiungi la chiave all'applicazione
1. Apri il file `/app/backend/.env`
2. Trova la riga: `RESEND_API_KEY=`
3. Incolla la tua chiave: `RESEND_API_KEY=re_...`
4. (Opzionale) Modifica `SENDER_EMAIL=` con la tua email verificata
5. Salva il file
6. Riavvia il backend: `sudo supervisorctl restart backend`

---

## 🔍 Verifica Configurazione

### Test Google Maps API
1. Vai alla pagina "Cerca Aziende"
2. Inserisci una città (es. "Milano")
3. Seleziona paese e categoria
4. Clicca "Cerca Aziende"
5. ✅ Se vedi risultati: configurazione corretta
6. ❌ Se vedi errore API key: controlla la configurazione

### Test Resend API
1. Genera un sito demo per un lead
2. Vai alla pagina "Email"
3. Seleziona un lead con demo creata
4. Clicca "Genera Email"
5. Inserisci un'email di test
6. Clicca "Invia Email"
7. ✅ Se ricevi l'email: configurazione corretta
8. ❌ Se vedi errore: controlla la chiave API

---

## 💰 Costi Stimati

### Google Maps API (Piano Gratuito)
- **Credito mensile gratuito:** $200
- **Costo per ricerca Places:** ~$0.032 per richiesta
- **Ricerche gratuite mensili:** ~6,250 ricerche
- **Consiglio:** Imposta budget alert a $50 per sicurezza

### Resend (Piano Gratuito)
- **Email gratuite mensili:** 3,000 email
- **Email aggiuntive:** $1 per 1,000 email
- **Nessuna carta richiesta per piano gratuito**

---

## 🆘 Troubleshooting

### Errore: "Google Maps API key non configurata"
✅ Soluzione:
1. Verifica che la chiave sia stata copiata correttamente in `.env`
2. Riavvia il backend: `sudo supervisorctl restart backend`
3. Controlla che non ci siano spazi prima/dopo la chiave

### Errore: "This API project is not authorized to use this API"
✅ Soluzione:
1. Verifica di aver abilitato "Places API" su Google Cloud Console
2. Attendi 1-2 minuti per la propagazione
3. Riprova

### Errore: "Resend API key non configurata"
✅ Soluzione:
1. Verifica che la chiave inizi con `re_`
2. Controlla che sia stata copiata in `/app/backend/.env`
3. Riavvia il backend

### Le email non arrivano
✅ Soluzioni:
1. Verifica che l'indirizzo email destinatario sia corretto
2. Controlla la cartella spam
3. In modalità test, le email arrivano solo agli indirizzi verificati su Resend
4. Verifica il dominio su Resend per inviare a qualsiasi indirizzo

---

## 📚 Link Utili

- **Google Cloud Console:** https://console.cloud.google.com
- **Google Maps Platform Pricing:** https://cloud.google.com/maps-platform/pricing
- **Resend Dashboard:** https://resend.com/home
- **Resend Documentation:** https://resend.com/docs

---

## ✅ Checklist Finale

- [ ] Google Maps API Key configurata in `.env`
- [ ] Places API abilitata su Google Cloud
- [ ] Fatturazione abilitata su Google Cloud
- [ ] Budget alert configurato
- [ ] Resend API Key configurata in `.env`
- [ ] Backend riavviato dopo modifiche
- [ ] Test ricerca aziende completato
- [ ] Test invio email completato

**Una volta completata la configurazione, tutte le funzionalità di LeadHunter Pro saranno operative! 🚀**

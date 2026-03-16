# 🚀 Guida Rapida - LeadHunter Pro

## 📋 Primo Utilizzo

### 1️⃣ Configura le API Keys

Vai su **Impostazioni API** dalla sidebar e configura:

#### Google Maps API Key (OBBLIGATORIA per ricerca aziende)
1. Vai su https://console.cloud.google.com
2. Crea un progetto o selezionane uno esistente
3. Abilita "Places API"
4. Vai su Credenziali → Crea credenziali → Chiave API
5. Copia la chiave e incollala nella sezione "Google Maps API"
6. Clicca "Salva Impostazioni"

#### Resend API Key (OBBLIGATORIA per invio email)
1. Vai su https://resend.com
2. Crea un account gratuito
3. Vai su "API Keys" → "Create API Key"
4. Copia la chiave e incollala nella sezione "Resend API"
5. Clicca "Salva Impostazioni"

---

## 🔍 Come Trovare Aziende

1. Vai su **Cerca Aziende**
2. Compila il form:
   - **Città:** es. Milano
   - **Paese:** Italia
   - **Categoria:** es. Parrucchiere
   - **Recensioni minime:** 10 (default)
   - **Rating minimo:** 4.0 (default)
3. Clicca **Cerca Aziende**
4. Il sistema cercherà automaticamente aziende senza sito web
5. I risultati verranno salvati come "Nuovi Lead"

---

## 🌐 Come Generare Siti Demo

### Generazione Singola
1. Vai su **Lead** e seleziona un lead
2. Clicca su "Dettagli"
3. Nella tab "Sito Demo", clicca **Genera Sito Demo**
4. Il sistema genererà:
   - Contenuti professionali AI (italiano/altra lingua)
   - Logo automatico
   - URL demo pubblico
5. Lo stato del lead passerà a "Demo Creata"

### Generazione Batch (fino a 500 siti)
1. Vai su **Lead**
2. Seleziona i checkbox dei lead desiderati
3. Clicca **Genera Batch**
4. Il sistema elaborerà tutti i siti in background
5. Ricevi notifica al completamento

---

## 📧 Come Contattare i Lead

### Genera Email Professionale
1. Vai su **Lead** → Seleziona un lead con "Demo Creata"
2. Nella pagina dettaglio, vai alla tab "Contatto"
3. Clicca **Genera Email Professionale**
4. Il sistema creerà un'email personalizzata in automatico
5. L'email include:
   - Presentazione professionale
   - Link al sito demo
   - Call to action

### Genera Messaggio WhatsApp
1. Stesso percorso della email
2. Clicca **Genera Messaggio WhatsApp**
3. Copia il messaggio generato
4. Invia tramite WhatsApp Web o app

### Invia Email
1. Vai su **Email**
2. Seleziona un lead
3. Clicca **Genera Email**
4. Compila l'email destinatario
5. Clicca **Invia Email**
6. Lo stato del lead passerà a "Contattato"

---

## 📊 Dashboard

La dashboard mostra:
- **Nuovi Lead:** Lead trovati di recente
- **Lead Totali:** Totale lead nel sistema
- **Siti Demo Creati:** Numero di siti generati
- **Clienti Acquisiti:** Lead convertiti in clienti
- **Tasso di conversione:** Percentuale successo

---

## 🎯 Stati Lead

| Stato | Significato | Azioni Disponibili |
|-------|-------------|-------------------|
| **Nuovo Lead** | Appena trovato | Genera sito demo |
| **Demo Creata** | Sito demo pronto | Genera email, contatta |
| **Contattato** | Email/chiamata inviata | Segui il lead |
| **Cliente Acquisito** | Convertito in cliente | Gestione progetto |

---

## ⚡ Funzionalità Avanzate

### Filtri Lead
- Filtra per stato nella pagina Lead
- Visualizza solo i lead che ti interessano

### Visualizza Siti Demo
- Vai su **Siti Demo**
- Vedi tutti i siti generati
- Clicca "Visualizza Demo" per aprire

### Supporto Multilingua
Il sistema rileva automaticamente la lingua dal paese:
- 🇮🇹 Italia → Italiano
- 🇫🇷 Francia → Francese
- 🇪🇸 Spagna → Spagnolo
- 🇩🇪 Germania → Tedesco
- 🇬🇧 UK → Inglese

---

## 💡 Consigli Pratici

### Massimizza le Conversioni
1. **Personalizza sempre:** Modifica le email generate per renderle più personali
2. **Follow-up:** Contatta i lead dopo 3-7 giorni se non rispondono
3. **Priorità alta:** Concentrati su lead con rating > 4.5 e molte recensioni
4. **Mostra valore:** Nel primo contatto, evidenzia i benefici del sito demo

### Ottimizza la Ricerca
1. **Città piccole/medie:** Più facile trovare aziende senza sito
2. **Categorie tradizionali:** Parrucchieri, ristoranti, artigiani
3. **Filtri intelligenti:** Min 10 recensioni + rating 4.0+

### Automazione
1. **Genera batch di notte:** Prepara 50+ siti demo per il giorno dopo
2. **Email programmate:** Prepara le email in anticipo
3. **Traccia risultati:** Aggiorna gli stati per monitorare conversioni

---

## 🆘 Problemi Comuni

### "Google Maps API key non configurata"
✅ Vai su Impostazioni API e inserisci la tua chiave

### "Resend API key non configurata"
✅ Vai su Impostazioni API e inserisci la tua chiave

### Nessuna azienda trovata
✅ Prova con una città più grande o cambia categoria

### Email non arrivano
✅ Controlla spam, verifica dominio su Resend

---

## 📞 Supporto

Per assistenza:
- Consulta il README.md completo
- Controlla SETUP_API_KEYS.md per configurazione dettagliata
- Verifica i log: `tail -f /var/log/supervisor/backend.err.log`

---

**Buona caccia ai lead! 🎯**

# 🔧 Guida: Abilitare Google Places API (New)

## ⚠️ IMPORTANTE: API Aggiornata

LeadHunter Pro ora utilizza la **Google Places API (New)**, non la versione legacy.

Se ricevi l'errore `REQUEST_DENIED (You're calling a legacy API...)`, segui questa guida.

---

## 📋 Step-by-Step: Configurazione Places API (New)

### 1. Accedi alla Google Cloud Console
Vai su: https://console.cloud.google.com

### 2. Seleziona il Progetto
- Apri il menu a tendina in alto
- Seleziona il progetto dove hai creato l'API key

### 3. Abilita Places API (New)
1. Nel menu laterale, vai su **"API e servizi"** → **"Libreria"**
2. Cerca: **"Places API (New)"**
   - ⚠️ IMPORTANTE: Cerca esattamente "Places API (New)"
   - ⚠️ NON abilitare "Places API" (quella vecchia/legacy)
3. Clicca sulla card **"Places API (New)"**
4. Clicca il pulsante **"Abilita"**
5. Attendi qualche secondo per l'attivazione

### 4. Verifica API Abilitata
1. Vai su **"API e servizi"** → **"API e servizi abilitati"**
2. Dovresti vedere **"Places API (New)"** nella lista
3. Se vedi solo "Places API" (senza New), hai abilitato quella sbagliata

### 5. Controlla le Restrizioni API Key
1. Vai su **"API e servizi"** → **"Credenziali"**
2. Clicca sulla tua API key
3. Scorri a **"Restrizioni API"**
4. Se hai impostato "Limita chiave":
   - Assicurati che **"Places API (New)"** sia selezionata
   - Rimuovi "Places API" (legacy) se presente
5. Clicca **"Salva"**

### 6. Test in LeadHunter Pro
1. Vai su LeadHunter Pro
2. Vai su **"Cerca Aziende"**
3. Compila il form:
   - Città: Milano
   - Paese: Italia
   - Categoria: Parrucchiere
4. Clicca **"Cerca Aziende"**
5. ✅ Dovresti vedere i risultati senza errori

---

## 🔍 Differenze: Places API vs Places API (New)

| Caratteristica | Places API (Legacy) | Places API (New) ✅ |
|----------------|---------------------|---------------------|
| Endpoint | `maps.googleapis.com` | `places.googleapis.com` |
| Metodo | Client library | REST API diretta |
| Supporto | Deprecato | Supportato attivamente |
| Funzionalità | Limitate | Complete e moderne |

---

## ❌ Risoluzione Errori Comuni

### Errore: "REQUEST_DENIED (You're calling a legacy API...)"
**Causa:** Hai abilitato "Places API" invece di "Places API (New)"

**Soluzione:**
1. Disabilita "Places API" (legacy)
2. Abilita "Places API (New)"
3. Attendi 2-3 minuti per propagazione
4. Riprova la ricerca

### Errore: "API key not valid. Please pass a valid API key."
**Causa:** API key non configurata o non valida

**Soluzione:**
1. Verifica la API key in "Impostazioni API"
2. Controlla che inizi con "AIza"
3. Verifica che non ci siano spazi prima/dopo
4. Salva nuovamente

### Errore: "PERMISSION_DENIED"
**Causa:** API key ha restrizioni che bloccano Places API (New)

**Soluzione:**
1. Vai su Google Cloud Console
2. Credenziali → Clicca sulla tua key
3. Restrizioni API → Aggiungi "Places API (New)"
4. Salva e attendi 2-3 minuti

### Nessun risultato trovato
**Causa:** Filtri troppo restrittivi o città piccola

**Soluzione:**
1. Prova con una città più grande (es. Milano, Roma)
2. Riduci "Recensioni minime" a 5
3. Riduci "Rating minimo" a 3.5
4. Cambia categoria

---

## 💰 Costi Places API (New)

### Text Search (New)
- **Costo:** $0.032 per richiesta
- **Credito gratuito:** $200/mese
- **Ricerche gratuite:** ~6,250 al mese

### Consigli per Ottimizzare i Costi
1. **Filtra localmente:** Usa filtri recensioni/rating in app
2. **Cache risultati:** Salva risultati per non ripetere ricerche
3. **Limita richieste:** Max 20 risultati per ricerca (già configurato)
4. **Budget alert:** Imposta avvisi a $50 su Google Cloud

---

## 📞 Supporto

Se continui ad avere problemi:

1. **Verifica log backend:**
   ```bash
   tail -f /var/log/supervisor/backend.err.log
   ```

2. **Controlla che Places API (New) sia abilitata:**
   - Google Cloud Console → Libreria
   - Cerca "Places API (New)"
   - Deve dire "Gestisci" (non "Abilita")

3. **Aspetta propagazione:**
   - Dopo modifiche API/restrizioni
   - Attendi 2-5 minuti
   - Riprova

4. **Verifica quota:**
   - Google Cloud Console → IAM e amministrazione → Quote
   - Cerca "Places API (New)"
   - Verifica limiti non superati

---

## ✅ Checklist Finale

- [ ] Places API (New) abilitata su Google Cloud
- [ ] Fatturazione abilitata con metodo di pagamento
- [ ] API key configurata in Impostazioni API
- [ ] Restrizioni API key includono Places API (New)
- [ ] Test ricerca completato con successo
- [ ] Budget alert configurato (consigliato $50)

**Una volta completata, la ricerca aziende funzionerà perfettamente! 🚀**

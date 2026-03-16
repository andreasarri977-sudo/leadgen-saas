# 🔧 Debug Google Places API - Guida Completa

## ✅ Fix Implementati

### 1. Logging Completo Backend
- Ogni chiamata API loggata con query, status code, risposta
- Errori categorizzati (403, 429, billing, permissions)
- Log visibili in `/var/log/supervisor/backend.err.log`

### 2. Gestione Errori Dettagliata

**Prima:** 0 risultati senza spiegazione

**Ora:** Distinzione chiara tra:
- ✅ **0 risultati reali**: "Nessuna azienda trovata con i criteri"
- ❌ **Errore API**: Banner rosso con dettagli completi

### 3. Banner Errori UI

Quando la ricerca fallisce, mostra:
- Titolo errore user-friendly
- Status code HTTP
- Query eseguita
- Dettagli tecnici (espandibili)
- Link soluzioni

**Errori gestiti:**
- `403`: API Key non valida o Places API (New) non abilitata
- `429`: Quota superata
- `BILLING`: Billing non configurato
- `PERMISSION`: Restrizioni API Key

### 4. Pulsante "Test Google API"

**Dove:** Impostazioni API → Sezione Google Maps

**Cosa fa:**
1. Esegue ricerca test: "restaurant in Paris, France"
2. Mostra risultato: ✅ Successo / ❌ Errore
3. Indica numero luoghi trovati
4. Mostra status code e dettagli

**Quando usarlo:**
- Dopo configurazione API Key
- Per verificare che Places API (New) sia abilitata
- Per diagnosticare problemi billing/permissions

---

## 🔍 Come Diagnosticare Problemi

### Scenario 1: 0 Risultati

**Step 1:** Controlla i log backend
```bash
tail -f /var/log/supervisor/backend.err.log
```

Cerca:
```
INFO: Ricerca Google Places: parrucchiere in Milano, IT
INFO: Google API Response Status: 200
INFO: Trovati 15 posti da Google
INFO: Posto 1: rating=4.5, reviews=50
...
INFO: Totale lead creati: 3
```

**Step 2:** Verifica filtri
- Se `rating < min_rating` → filtrato
- Se `reviews < min_reviews` → filtrato
- Se `has website` → escluso (corretto)

**Step 3:** Riduci filtri
- Prova `min_reviews: 5` invece di 10
- Prova `min_rating: 3.5` invece di 4.0

### Scenario 2: Errore 403

**Causa:** Places API (New) non abilitata

**Soluzione:**
1. Vai su https://console.cloud.google.com
2. Seleziona progetto
3. API e servizi → Libreria
4. Cerca "Places API (New)"
5. Clicca "Abilita"
6. Attendi 2 minuti
7. Riprova ricerca o Test API

### Scenario 3: Errore BILLING

**Causa:** Billing non configurato

**Soluzione:**
1. Google Cloud Console → Fatturazione
2. Collega metodo pagamento
3. Accetta termini
4. Attendi 5-10 minuti propagazione
5. Riprova

### Scenario 4: Errore 429

**Causa:** Quota API superata

**Verifica quota:**
1. Google Cloud Console
2. IAM e amministrazione → Quote
3. Cerca "Places API"
4. Verifica limiti giornalieri

**Soluzione temporanea:**
- Attendi reset quota (mezzanotte UTC)
- O richiedi aumento quota

### Scenario 5: Test API Fallisce

**Checklist:**
- [ ] API Key salvata correttamente?
- [ ] Places API (New) abilitata (non legacy)?
- [ ] Billing configurato?
- [ ] Restrizioni API Key non bloccano?
- [ ] Progetto Google Cloud selezionato corretto?

---

## 📋 API Necessarie

### Obbligatorie

**Places API (New)**
- Endpoint: `places.googleapis.com/v1/places:searchText`
- Costo: $0.032 per Text Search
- Usato per: Ricerca aziende + dettagli completi

### NON Necessarie

**Geocoding API** ❌
- NON serve geocoding città → lat/lng
- Text Search gestisce città+paese direttamente
- Query: "categoria in città, paese" funziona

**Maps JavaScript API** ❌
- NON necessaria per backend
- Serve solo se vuoi embed mappa interattiva frontend

**Places API (Legacy)** ❌
- NON supportata
- Usa SOLO Places API (New)

---

## 🧪 Test Manuale

### Test 1: Verifica API Key

```bash
curl -X POST "https://places.googleapis.com/v1/places:searchText" \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: TUA_API_KEY" \
  -H "X-Goog-FieldMask: places.id,places.displayName" \
  -d '{"textQuery": "restaurant in Paris"}'
```

**Risposta attesa:**
```json
{
  "places": [
    {
      "id": "ChIJ...",
      "displayName": {"text": "Le Restaurant"}
    }
  ]
}
```

### Test 2: Verifica Place Details

```bash
curl "https://places.googleapis.com/v1/places/PLACE_ID" \
  -H "X-Goog-Api-Key: TUA_API_KEY" \
  -H "X-Goog-FieldMask: displayName,photos"
```

---

## 🚨 Errori Comuni e Fix

### "REQUEST_DENIED"

**Causa:** API legacy o Places API (New) non abilitata

**Fix:**
1. Disabilita "Places API" (legacy)
2. Abilita "Places API (New)"
3. Riavvia test

### "INVALID_REQUEST"

**Causa:** Field Mask errato o query malformata

**Fix:** 
- Verifica Field Mask nel codice
- Controlla sintassi query

### "ZERO_RESULTS" ma sappiamo che esistono

**Causa:** Query troppo specifica o città non riconosciuta

**Fix:**
- Prova query generica: "restaurant" invece di categoria specifica
- Verifica spelling città
- Prova coordinate invece di nome città (se necessario)

### Foto non caricano

**Causa:** URL foto non costruito correttamente

**Verifica:**
```javascript
// Corretto
https://places.googleapis.com/v1/places/PLACE_ID/photos/PHOTO_NAME/media?maxHeightPx=1200&key=API_KEY

// Errato
https://maps.googleapis.com/... (vecchia API)
```

---

## 💡 Best Practices

### 1. Cache Risultati
Salva risultati ricerca per evitare chiamate duplicate

### 2. Batch Dettagli
Recupera dettagli solo per lead senza sito (già fatto)

### 3. Limita Field Mask
Richiedi solo campi necessari per ridurre costi

### 4. Monitoring
Controlla regolarmente usage su Google Cloud Console

### 5. Budget Alerts
Imposta alert a 80% quota per evitare sorprese

---

## 📞 Supporto

**Log backend non chiari?**
```bash
# Aumenta verbosity (se necessario)
tail -f /var/log/supervisor/backend.err.log | grep "Google"
```

**Test API continua a fallire?**
- Controlla che il progetto Google Cloud sia selezionato
- Verifica che l'API Key appartenga al progetto corretto
- Prova a creare nuova API Key
- Controlla console Google Cloud per errori

**Foto non si vedono?**
- Verifica API Key nei parametri URL foto
- Controlla browser console per errori CORS
- Verifica che le foto esistano davvero

---

## ✅ Checklist Finale

Prima di dichiarare "non funziona":

- [ ] Places API (New) abilitata su Google Cloud?
- [ ] Billing configurato con metodo pagamento?
- [ ] API Key salvata in Impostazioni?
- [ ] Test API eseguito e passato?
- [ ] Log backend controllati?
- [ ] Filtri ricerca ragionevoli (min_reviews < 15)?
- [ ] Query testata manualmente con curl?
- [ ] Atteso 2-5 minuti dopo modifiche Google Cloud?

**Se tutti i check ✅ ma ancora errori:**
- Controlla quota non superata
- Verifica restrizioni IP API Key
- Contatta supporto Google Cloud

---

## 🎯 Riepilogo

**API Necessaria:** SOLO Places API (New)

**Test Rapido:** Impostazioni → Test Google API

**Debug:** Banner rosso con dettagli + log backend

**0 risultati ≠ errore:** Distinzione chiara nell'UI

**Il sistema ora è completamente trasparente su cosa succede! 🚀**

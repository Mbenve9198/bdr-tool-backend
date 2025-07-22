# 🚀 Configurazione Integrazione SimilarWeb

Questa guida spiega come configurare l'integrazione con SimilarWeb tramite Apify per analizzare il traffico dei siti web dei prospect.

## 📋 Requisiti

1. Account Apify (gratuito o a pagamento)
2. Token API Apify
3. Accesso all'Actor `tri_angle~fast-similarweb-scraper`

## 🔧 Setup

### 1. Creazione Account Apify

1. Vai su [apify.com](https://apify.com)
2. Crea un account gratuito
3. Verifica la tua email

### 2. Ottenimento Token API

1. Accedi al tuo account Apify
2. Vai su **Settings** > **Integrations** > **API tokens**
3. Clicca su **Create new token**
4. Copia il token generato

### 3. Configurazione Variabili d'Ambiente

#### Backend
Crea il file `backend/.env` e aggiungi:
```
APIFY_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Frontend
Crea il file `frontend/.env.local` e aggiungi:
```
APIFY_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Test dell'Integrazione

Avvia il progetto e testa l'integrazione:

```bash
# Backend
cd backend
npm install
npm start

# Frontend (nuovo terminale)
cd frontend
npm install
npm run dev
```

## 🎯 Come Funziona

### Processo di Analisi

1. **Input URL**: L'utente inserisce l'URL del sito web in modalità "Chiamata a Freddo"
2. **Chiamata API**: Il sistema chiama l'API Apify SimilarWeb
3. **Elaborazione Dati**: I dati vengono processati e formattati
4. **Visualizzazione**: I risultati vengono mostrati nel dashboard
5. **Integrazione AI**: I dati vengono inclusi nel prompt per l'AI

### Dati Raccolti

- **Volume Traffico**: Visite mensili, ranking globale
- **Distribuzione Geografica**: Top 5 paesi per traffico
- **Fonti di Traffico**: Search, diretto, social, referral
- **Engagement**: Tempo sul sito, pagine per visita, bounce rate
- **Categoria Business**: Classificazione del sito

### Utilizzo per BDR

I dati vengono utilizzati per:
- Personalizzare l'hook di chiamata a freddo
- Identificare opportunità di espansione internazionale
- Qualificare il prospect in base al volume di traffico
- Dimostrare preparazione e professionalità

## 📊 Esempio Output

```json
{
  "url": "example.com",
  "siteName": "Example Store",
  "category": "E-commerce",
  "totalVisits": 125000,
  "globalRank": 45230,
  "topCountries": [
    {
      "countryName": "Italy",
      "visitsShare": 67,
      "estimatedVisits": 83750
    },
    {
      "countryName": "Germany", 
      "visitsShare": 15,
      "estimatedVisits": 18750
    }
  ],
  "trafficSources": {
    "search": 45,
    "direct": 35,
    "social": 12,
    "referrals": 8
  }
}
```

## 💰 Costi

### Piano Gratuito Apify
- 1000 compute units al mese
- Sufficiente per ~50-100 analisi siti web

### Piano Pro Apify ($49/mese)
- 100,000 compute units
- Sufficiente per ~5000-10,000 analisi

## 🔍 Troubleshooting

### Errori Comuni

1. **Token non valido**
   - Verifica che il token sia corretto
   - Controlla che sia attivo nell'account Apify

2. **Quota superata**
   - Verifica i compute units rimanenti
   - Considera upgrade del piano

3. **Sito non trovato**
   - Alcuni siti potrebbero non essere nel database SimilarWeb
   - Prova con l'URL principale del dominio

4. **Timeout richiesta**
   - L'analisi può richiedere 30-60 secondi
   - Il timeout è configurato a 60 secondi

### Log di Debug

Per abilitare i log di debug, aggiungi nel file `.env`:
```
DEBUG=true
LOG_LEVEL=debug
```

## 🚀 Funzionalità Avanzate

### Caching Dati
I dati SimilarWeb possono essere cachati per evitare chiamate ripetute:
- Implementazione Redis per cache distribuita
- TTL di 24-48 ore per dati traffico

### Analisi Competitor
Estensione futura per analizzare competitor automaticamente:
- Identificazione automatica competitor
- Confronto metriche di traffico
- Report competitivo

### Integrazione CRM
Sincronizzazione dati con CRM esistenti:
- Salesforce integration
- HubSpot integration
- Dati automatici nei record prospect

## 📞 Supporto

Per problemi con l'integrazione:
1. Controlla i log dell'applicazione
2. Verifica la configurazione Apify
3. Consulta la documentazione Apify API
4. Contatta il supporto tecnico

---

**Nota**: L'integrazione è progettata per essere robusta e gestire errori gracefully. Se SimilarWeb non restituisce dati, l'applicazione continuerà a funzionare normalmente senza l'analisi del traffico. 
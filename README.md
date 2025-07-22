# SendCloud BDR Backend

Backend API per il tool SendCloud Business Development Representatives.

## 🚀 Features

- **Knowledge Base Management**: Gestione centralizzata della conoscenza SendCloud
- **Prospect Management**: CRM semplificato per la gestione prospect
- **AI-Powered Scripts**: Generazione automatica script di chiamata personalizzati
- **Email Templates**: Template email con personalizzazione dinamica
- **Carrier Rates**: Gestione e calcolo tariffe corrieri
- **Analytics**: Metriche di performance per BDR

## 🛠 Tech Stack

- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **JWT** per autenticazione
- **Express Validator** per validazione
- **Axios** per integrazioni esterne
- **Perplexity API** per market research

## 📋 Prerequisites

- Node.js 16+
- MongoDB Atlas account
- npm o yarn

## 🔧 Installation

1. **Clone e setup**:
```bash
cd backend
npm install
```

2. **Environment Variables**:
Copia `.env.example` in `.env` e configura:
```bash
cp .env.example .env
```

Configura le variabili:
```env
PORT=5000
MONGODB_URI=mongodb+srv://marco:25ff0PicSBGFhuJG@bdr-ai.vivu6qp.mongodb.net/sendcloud-bdr?retryWrites=true&w=majority&appName=bdr-ai
JWT_SECRET=sendcloud_bdr_jwt_secret_2024
NODE_ENV=development
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

3. **Database Setup**:
```bash
# Popola database con dati di esempio
node scripts/setup.js
```

4. **Avvia il server**:
```bash
# Development
npm run dev

# Production
npm start
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Health Check
```
GET /api/health
```

### Knowledge Base
```
GET    /api/knowledge-base          # Lista knowledge base
POST   /api/knowledge-base          # Crea nuovo elemento
GET    /api/knowledge-base/:id      # Dettaglio elemento
PUT    /api/knowledge-base/:id      # Aggiorna elemento
DELETE /api/knowledge-base/:id      # Elimina elemento
GET    /api/knowledge-base/search/ai # Ricerca AI
```

### Prospects
```
GET    /api/prospects               # Lista prospect
POST   /api/prospects               # Crea prospect
GET    /api/prospects/:id           # Dettaglio prospect
PUT    /api/prospects/:id           # Aggiorna prospect
POST   /api/prospects/:id/interactions # Aggiungi interazione
PUT    /api/prospects/:id/status    # Cambia status
GET    /api/prospects/stats/dashboard # Dashboard stats
```

### Scripts
```
GET    /api/scripts                 # Lista script
POST   /api/scripts                 # Crea script
GET    /api/scripts/:id             # Dettaglio script
PUT    /api/scripts/:id             # Aggiorna script
POST   /api/scripts/:id/usage       # Registra utilizzo
```

### Templates
```
GET    /api/templates               # Lista template
POST   /api/templates               # Crea template
GET    /api/templates/:id           # Dettaglio template
PUT    /api/templates/:id           # Aggiorna template
POST   /api/templates/:id/track/:event # Traccia evento
```

### Rates
```
GET    /api/rates                   # Lista tariffe
POST   /api/rates/calculate         # Calcola tariffe
GET    /api/rates/compare           # Confronta corrieri
```

### AI Services
```
POST   /api/ai/generate-call-script    # Genera script personalizzato
POST   /api/ai/generate-email-template # Genera email personalizzata
POST   /api/ai/market-research         # Ricerca di mercato
POST   /api/ai/suggest-follow-up       # Suggerimenti follow-up
```

## 🗂 Project Structure

```
backend/
├── models/               # Modelli Mongoose
│   ├── KnowledgeBase.js
│   ├── Prospect.js
│   ├── CallScript.js
│   └── EmailTemplate.js
├── routes/               # Route API
│   ├── knowledgeBase.js
│   ├── prospects.js
│   ├── scripts.js
│   ├── templates.js
│   ├── rates.js
│   └── ai.js
├── scripts/              # Utility scripts
│   └── setup.js
├── server.js             # Server principale
├── package.json
└── README.md
```

## 🧪 Testing API

### Esempi di utilizzo

**1. Creare un prospect**:
```bash
curl -X POST http://localhost:5000/api/prospects \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Ecommerce",
    "website": "https://test.com",
    "industry": "E-commerce",
    "contact": {
      "name": "Mario Rossi",
      "email": "mario@test.com"
    }
  }'
```

**2. Generare script personalizzato**:
```bash
curl -X POST http://localhost:5000/api/ai/generate-call-script \
  -H "Content-Type: application/json" \
  -d '{
    "prospectId": "PROSPECT_ID",
    "type": "cold-call"
  }'
```

**3. Calcolare tariffe**:
```bash
curl -X POST http://localhost:5000/api/rates/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Francia",
    "weight": 2.5,
    "service": "standard"
  }'
```

## 🔒 Security Features

- **Rate Limiting**: 100 richieste per 15 minuti per IP
- **Helmet**: Headers di sicurezza
- **CORS**: Configurato per frontend specifico
- **Input Validation**: Validazione completa degli input
- **Error Handling**: Gestione centralizzata degli errori

## 📊 Monitoring

- Logs strutturati con Morgan
- Metriche di utilizzo knowledge base
- Performance tracking script e template
- Health check endpoint

## 🚀 Deployment

### Environment Variables Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=secure_random_secret
PERPLEXITY_API_KEY=live_api_key
```

### Docker (Opzionale)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Crea branch feature
2. Implementa modifiche
3. Testa API endpoints
4. Crea pull request

## 📝 Notes

- Database automaticamente indicizzato per performance
- Soft delete per preservare data integrity
- Pagination supportata su liste
- Search full-text su knowledge base
- Integrazione Perplexity per market research avanzato

## 🆘 Troubleshooting

**Errore connessione MongoDB**:
- Verifica MONGODB_URI in .env
- Controlla whitelist IP su MongoDB Atlas

**Port già in uso**:
```bash
lsof -ti:5000 | xargs kill -9
```

**Reset database**:
```bash
node scripts/setup.js
``` 
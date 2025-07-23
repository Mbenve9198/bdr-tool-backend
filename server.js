const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Middleware di sicurezza
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://bdr-tool-frontend.vercel.app',
        'https://sendcloud-bdr-frontend.vercel.app'
      ]
    : ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100 // limita ogni IP a 100 richieste per finestra
});
app.use(limiter);

// Middleware
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connessione MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connesso a MongoDB'))
.catch(err => console.error('❌ Errore connessione MongoDB:', err));

// Routes
app.use('/api/prospects', require('./routes/prospects'));
app.use('/api/scripts', require('./routes/scripts'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/rates', require('./routes/rates'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/similarweb', require('./routes/similarweb'));

// Route di test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SendCloud BDR Backend attivo',
    timestamp: new Date().toISOString()
  });
});

// Gestione errori
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Qualcosa è andato storto!', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Errore interno del server'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV}`);
}); 
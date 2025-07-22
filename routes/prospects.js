const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Prospect = require('../models/Prospect');
const axios = require('axios');

// GET - Ottieni tutti i prospect
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      assignedTo, 
      industry, 
      size, 
      minScore, 
      maxScore, 
      page = 1, 
      limit = 20,
      sortBy = 'score',
      sortOrder = 'desc'
    } = req.query;

    let query = { isActive: true };

    // Filtri
    if (status) query.status = status;
    if (assignedTo) query['assignedTo.bdrName'] = assignedTo;
    if (industry) query.industry = new RegExp(industry, 'i');
    if (size) query.size = size;
    if (minScore || maxScore) {
      query.score = {};
      if (minScore) query.score.$gte = parseInt(minScore);
      if (maxScore) query.score.$lte = parseInt(maxScore);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const prospects = await Prospect.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Prospect.countDocuments(query);

    res.json({
      success: true,
      data: prospects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Ottieni singolo prospect
router.get('/:id', async (req, res) => {
  try {
    const prospect = await Prospect.findById(req.params.id);
    
    if (!prospect) {
      return res.status(404).json({ success: false, error: 'Prospect non trovato' });
    }

    res.json({ success: true, data: prospect });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Crea nuovo prospect
router.post('/', [
  body('companyName').trim().isLength({ min: 1 }).withMessage('Nome azienda richiesto'),
  body('website').optional().isURL().withMessage('URL sito web non valido'),
  body('contact.email').optional().isEmail().withMessage('Email non valida'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prospect = new Prospect(req.body);
    
    // Calcola score automaticamente
    prospect.calculateScore();
    
    await prospect.save();

    // Se c'è un website, avvia analisi asincrona
    if (prospect.website) {
      analyzeWebsiteAsync(prospect._id, prospect.website);
    }

    res.status(201).json({ success: true, data: prospect });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Aggiorna prospect
router.put('/:id', [
  body('companyName').optional().trim().isLength({ min: 1 }),
  body('website').optional().isURL(),
  body('contact.email').optional().isEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prospect = await Prospect.findById(req.params.id);
    if (!prospect) {
      return res.status(404).json({ success: false, error: 'Prospect non trovato' });
    }

    // Aggiorna i campi
    Object.assign(prospect, req.body);
    
    // Ricalcola score
    prospect.calculateScore();
    
    await prospect.save();

    res.json({ success: true, data: prospect });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Aggiungi interazione
router.post('/:id/interactions', [
  body('type').isIn(['email', 'call', 'meeting', 'demo', 'follow-up']).withMessage('Tipo interazione non valido'),
  body('notes').optional().trim(),
  body('outcome').optional().isIn(['positive', 'neutral', 'negative', 'no-response']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prospect = await Prospect.findById(req.params.id);
    if (!prospect) {
      return res.status(404).json({ success: false, error: 'Prospect non trovato' });
    }

    await prospect.addInteraction(req.body);

    res.json({ success: true, data: prospect });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Aggiorna status prospect
router.put('/:id/status', [
  body('status').isIn(['nuovo', 'contattato', 'interessato', 'qualificato', 'proposta', 'chiuso-vinto', 'chiuso-perso']).withMessage('Status non valido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prospect = await Prospect.findByIdAndUpdate(
      req.params.id,
      { 
        status: req.body.status,
        lastContactDate: new Date()
      },
      { new: true }
    );

    if (!prospect) {
      return res.status(404).json({ success: false, error: 'Prospect non trovato' });
    }

    res.json({ success: true, data: prospect });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Dashboard statistiche prospect
router.get('/stats/dashboard', async (req, res) => {
  try {
    const { bdrName } = req.query;
    let matchQuery = { isActive: true };
    
    if (bdrName) {
      matchQuery['assignedTo.bdrName'] = bdrName;
    }

    const stats = await Prospect.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgScore: { $avg: '$score' }
        }
      }
    ]);

    const totalProspects = await Prospect.countDocuments(matchQuery);
    const highScoreProspects = await Prospect.countDocuments({
      ...matchQuery,
      score: { $gte: 80 }
    });

    const recentInteractions = await Prospect.find(matchQuery)
      .sort({ lastContactDate: -1 })
      .limit(5)
      .select('companyName contact.name lastContactDate status score');

    res.json({
      success: true,
      data: {
        totalProspects,
        highScoreProspects,
        statusBreakdown: stats,
        recentInteractions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Analizza sito web
router.post('/:id/analyze-website', async (req, res) => {
  try {
    const prospect = await Prospect.findById(req.params.id);
    if (!prospect) {
      return res.status(404).json({ success: false, error: 'Prospect non trovato' });
    }

    if (!prospect.website) {
      return res.status(400).json({ success: false, error: 'URL sito web non presente' });
    }

    const analysisResult = await analyzeWebsite(prospect.website);
    
    prospect.websiteAnalysis = {
      ...analysisResult,
      analysisDate: new Date()
    };
    
    // Ricalcola score con nuove informazioni
    prospect.calculateScore();
    
    await prospect.save();

    res.json({ success: true, data: prospect.websiteAnalysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Funzione helper per analisi asincrona del sito
async function analyzeWebsiteAsync(prospectId, websiteUrl) {
  try {
    const analysisResult = await analyzeWebsite(websiteUrl);
    
    await Prospect.findByIdAndUpdate(prospectId, {
      websiteAnalysis: {
        ...analysisResult,
        analysisDate: new Date()
      }
    });
  } catch (error) {
    console.error('Errore analisi website asincrona:', error);
  }
}

// Funzione per analizzare il sito web
async function analyzeWebsite(url) {
  try {
    // Simulazione analisi - in produzione integrare con servizi reali
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SendCloud-BDR-Bot/1.0)'
      }
    });
    
    const content = response.data.toLowerCase();
    
    // Analisi semplificata
    const analysis = {
      isEcommerce: /shop|cart|buy|product|checkout|store/i.test(content),
      platform: detectPlatform(content),
      features: detectFeatures(content),
      integrations: detectIntegrations(content)
    };
    
    return analysis;
  } catch (error) {
    console.error('Errore analisi website:', error);
    return {
      isEcommerce: false,
      platform: 'unknown',
      features: [],
      integrations: [],
      error: 'Impossibile analizzare il sito'
    };
  }
}

function detectPlatform(content) {
  if (content.includes('shopify')) return 'Shopify';
  if (content.includes('woocommerce')) return 'WooCommerce';
  if (content.includes('magento')) return 'Magento';
  if (content.includes('prestashop')) return 'PrestaShop';
  return 'Custom/Other';
}

function detectFeatures(content) {
  const features = [];
  if (content.includes('paypal')) features.push('PayPal');
  if (content.includes('stripe')) features.push('Stripe');
  if (content.includes('klarna')) features.push('Klarna');
  if (content.includes('newsletter')) features.push('Newsletter');
  if (content.includes('wishlist')) features.push('Wishlist');
  return features;
}

function detectIntegrations(content) {
  const integrations = [];
  if (content.includes('google analytics')) integrations.push('Google Analytics');
  if (content.includes('facebook pixel')) integrations.push('Facebook Pixel');
  if (content.includes('mailchimp')) integrations.push('MailChimp');
  if (content.includes('hubspot')) integrations.push('HubSpot');
  return integrations;
}

module.exports = router; 
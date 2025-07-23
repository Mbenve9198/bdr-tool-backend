const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const similarwebController = require('../controllers/similarwebController');

// POST - Analizza traffico sito web con SimilarWeb via Apify
router.post('/analyze', [
  body('websiteUrl').isURL().withMessage('URL non valido'),
], async (req, res) => {
  // Validazione input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array(),
      message: 'Validazione fallita: URL non valido'
    });
  }

  // Delega al controller
  await similarwebController.analyzeSiteTraffic(req, res);
});

// GET - Recupera tutti i prospect con dati SimilarWeb
router.get('/prospects', async (req, res) => {
  try {
    const Prospect = require('../models/Prospect');
    
    // Cerca prospect con dati SimilarWeb
    const prospects = await Prospect.find({
      'websiteAnalysis.analysisData.similarweb': { $exists: true }
    })
    .sort({ 'websiteAnalysis.analysisDate': -1 }) // Più recenti prima
    .select('companyName website industry size businessInfo websiteAnalysis.analysisDate status interactions')
    .limit(50); // Limita a 50 per performance

    console.log(`📋 [SimilarWeb] Trovati ${prospects.length} prospect con dati SimilarWeb`);

    const formattedProspects = prospects.map(prospect => ({
      id: prospect._id,
      companyName: prospect.companyName,
      website: prospect.website,
      industry: prospect.industry,
      size: prospect.size,
      status: prospect.status,
      analysisDate: prospect.websiteAnalysis?.analysisDate,
      estimatedShipments: prospect.businessInfo?.monthlyShipments || 0,
      estimatedRevenue: prospect.businessInfo?.estimatedMonthlyRevenue || 0,
      lastInteraction: prospect.interactions?.length > 0 
        ? prospect.interactions[prospect.interactions.length - 1]
        : null
    }));

    res.json({
      success: true,
      data: formattedProspects,
      total: prospects.length
    });

  } catch (error) {
    console.error('❌ [SimilarWeb] Errore recupero prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero dei prospect'
    });
  }
});

// GET - Recupera dettagli specifici di un prospect
router.get('/prospects/:id', async (req, res) => {
  try {
    const Prospect = require('../models/Prospect');
    const { id } = req.params;

    const prospect = await Prospect.findById(id);
    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect non trovato'
      });
    }

    console.log(`📄 [SimilarWeb] Recuperato prospect: ${prospect.companyName}`);

    res.json({
      success: true,
      data: {
        basic: {
          id: prospect._id,
          companyName: prospect.companyName,
          website: prospect.website,
          industry: prospect.industry,
          size: prospect.size,
          status: prospect.status
        },
        businessInfo: prospect.businessInfo,
        websiteAnalysis: prospect.websiteAnalysis,
        interactions: prospect.interactions,
        similarwebData: prospect.websiteAnalysis?.analysisData?.similarweb?.processed || null
      }
    });

  } catch (error) {
    console.error('❌ [SimilarWeb] Errore recupero dettagli prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero dei dettagli prospect'
    });
  }
});

module.exports = router; 
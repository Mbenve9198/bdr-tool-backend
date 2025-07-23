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

module.exports = router; 
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const EmailTemplate = require('../models/EmailTemplate');

// GET - Ottieni tutti i template
router.get('/', async (req, res) => {
  try {
    const { type, isActive = true, isApproved } = req.query;
    let query = { isActive };

    if (type) query.type = type;
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';

    const templates = await EmailTemplate.find(query)
      .populate('relatedKnowledge')
      .sort({ 'performance.replied': -1, createdAt: -1 });

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Ottieni template per ID
router.get('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id)
      .populate('relatedKnowledge');
    
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template non trovato' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Crea nuovo template
router.post('/', [
  body('name').trim().isLength({ min: 1 }).withMessage('Nome richiesto'),
  body('type').isIn(['cold-outreach', 'follow-up', 'offer', 'proposal', 'demo-invitation', 'thank-you']).withMessage('Tipo non valido'),
  body('subject').trim().isLength({ min: 1 }).withMessage('Subject richiesto'),
  body('content.html').trim().isLength({ min: 1 }).withMessage('Contenuto HTML richiesto'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const template = new EmailTemplate(req.body);
    await template.save();

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Aggiorna template
router.put('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template non trovato' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Traccia evento email
router.post('/:id/track/:event', async (req, res) => {
  try {
    const { event } = req.params;
    const template = await EmailTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template non trovato' });
    }

    await template.trackEvent(event);

    res.json({ success: true, data: template.performance });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const CallScript = require('../models/CallScript');

// GET - Ottieni tutti gli script
router.get('/', async (req, res) => {
  try {
    const { type, industry, isActive = true } = req.query;
    let query = { isActive };

    if (type) query.type = type;
    if (industry) query.industry = new RegExp(industry, 'i');

    const scripts = await CallScript.find(query)
      .populate('relatedKnowledge')
      .sort({ 'performance.successRate': -1, createdAt: -1 });

    res.json({ success: true, data: scripts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Ottieni script per ID
router.get('/:id', async (req, res) => {
  try {
    const script = await CallScript.findById(req.params.id)
      .populate('relatedKnowledge');
    
    if (!script) {
      return res.status(404).json({ success: false, error: 'Script non trovato' });
    }

    res.json({ success: true, data: script });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Crea nuovo script
router.post('/', [
  body('title').trim().isLength({ min: 1 }).withMessage('Titolo richiesto'),
  body('type').isIn(['cold-call', 'follow-up', 'demo', 'objection-handling', 'closing']).withMessage('Tipo non valido'),
  body('structure.opener').trim().isLength({ min: 1 }).withMessage('Opener richiesto'),
  body('structure.hook').trim().isLength({ min: 1 }).withMessage('Hook richiesto'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const script = new CallScript(req.body);
    await script.save();

    res.status(201).json({ success: true, data: script });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Aggiorna script
router.put('/:id', async (req, res) => {
  try {
    const script = await CallScript.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!script) {
      return res.status(404).json({ success: false, error: 'Script non trovato' });
    }

    res.json({ success: true, data: script });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Registra utilizzo script
router.post('/:id/usage', [
  body('outcome').optional().isIn(['meeting-scheduled', 'no-answer', 'not-interested', 'callback-requested']),
], async (req, res) => {
  try {
    const script = await CallScript.findById(req.params.id);
    if (!script) {
      return res.status(404).json({ success: false, error: 'Script non trovato' });
    }

    await script.recordUsage(req.body.outcome);

    res.json({ success: true, data: script.performance });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 
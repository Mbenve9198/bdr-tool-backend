const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const KnowledgeBase = require('../models/KnowledgeBase');

// GET - Ottieni tutti gli elementi della knowledge base
router.get('/', async (req, res) => {
  try {
    const { category, tags, search, isActive = true } = req.query;
    let query = { isActive };

    // Filtri
    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };
    
    // Ricerca testuale
    if (search) {
      query.$text = { $search: search };
    }

    const knowledgeItems = await KnowledgeBase.find(query)
      .sort({ priority: -1, lastUpdated: -1 })
      .limit(parseInt(req.query.limit) || 50);

    res.json({
      success: true,
      data: knowledgeItems,
      count: knowledgeItems.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Ottieni singolo elemento per ID
router.get('/:id', async (req, res) => {
  try {
    const knowledgeItem = await KnowledgeBase.findById(req.params.id);
    
    if (!knowledgeItem) {
      return res.status(404).json({ success: false, error: 'Elemento non trovato' });
    }

    // Incrementa le visualizzazioni
    await knowledgeItem.incrementViews();

    res.json({ success: true, data: knowledgeItem });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Crea nuovo elemento knowledge base
router.post('/', [
  body('title').trim().isLength({ min: 1 }).withMessage('Titolo richiesto'),
  body('category').isIn([
    'funzionalità', 'benefici', 'pain-points', 'tariffe-corrieri',
    'casi-studio', 'competitor', 'obiezioni-comuni', 'integrations', 'prezzi'
  ]).withMessage('Categoria non valida'),
  body('content').trim().isLength({ min: 1 }).withMessage('Contenuto richiesto'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const knowledgeItem = new KnowledgeBase(req.body);
    await knowledgeItem.save();

    res.status(201).json({ success: true, data: knowledgeItem });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Aggiorna elemento esistente
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1 }),
  body('category').optional().isIn([
    'funzionalità', 'benefici', 'pain-points', 'tariffe-corrieri',
    'casi-studio', 'competitor', 'obiezioni-comuni', 'integrations', 'prezzi'
  ]),
  body('content').optional().trim().isLength({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const knowledgeItem = await KnowledgeBase.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!knowledgeItem) {
      return res.status(404).json({ success: false, error: 'Elemento non trovato' });
    }

    res.json({ success: true, data: knowledgeItem });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Elimina elemento (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const knowledgeItem = await KnowledgeBase.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!knowledgeItem) {
      return res.status(404).json({ success: false, error: 'Elemento non trovato' });
    }

    res.json({ success: true, message: 'Elemento disattivato con successo' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Ottieni statistiche knowledge base
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await KnowledgeBase.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalViews: { $sum: '$usage.views' },
          totalUsage: { $sum: '$usage.usedInScripts' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalItems = await KnowledgeBase.countDocuments({ isActive: true });
    const recentItems = await KnowledgeBase.find({ isActive: true })
      .sort({ lastUpdated: -1 })
      .limit(5)
      .select('title category lastUpdated');

    res.json({
      success: true,
      data: {
        totalItems,
        categorieStats: stats,
        recentItems
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Ricerca avanzata per AI
router.get('/search/ai', async (req, res) => {
  try {
    const { query, categories, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query di ricerca richiesta' });
    }

    let searchQuery = {
      isActive: true,
      $text: { $search: query }
    };

    if (categories) {
      searchQuery.category = { $in: categories.split(',') };
    }

    const results = await KnowledgeBase.find(searchQuery, {
      score: { $meta: 'textScore' }
    })
    .sort({ score: { $meta: 'textScore' }, priority: -1 })
    .limit(parseInt(limit));

    // Incrementa visualizzazioni per tutti i risultati
    const resultIds = results.map(r => r._id);
    await KnowledgeBase.updateMany(
      { _id: { $in: resultIds } },
      { 
        $inc: { 'usage.views': 1 },
        $set: { 'usage.lastUsed': new Date() }
      }
    );

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 
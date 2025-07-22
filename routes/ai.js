const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const KnowledgeBase = require('../models/KnowledgeBase');
const Prospect = require('../models/Prospect');
const CallScript = require('../models/CallScript');
const EmailTemplate = require('../models/EmailTemplate');

// POST - Genera script di chiamata personalizzato
router.post('/generate-call-script', [
  body('prospectId').isMongoId().withMessage('ID prospect non valido'),
  body('type').isIn(['cold-call', 'follow-up', 'demo', 'objection-handling', 'closing']).withMessage('Tipo script non valido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { prospectId, type, customRequirements } = req.body;

    // Ottieni dati prospect
    const prospect = await Prospect.findById(prospectId);
    if (!prospect) {
      return res.status(404).json({ success: false, error: 'Prospect non trovato' });
    }

    // Ottieni knowledge base rilevante
    const knowledgeData = await getRelevantKnowledge(prospect, type);

    // Cerca script simile esistente
    let baseScript = await CallScript.findOne({
      type,
      industry: prospect.industry,
      isActive: true
    }).sort({ 'performance.successRate': -1 });

    // Genera script personalizzato usando AI
    const personalizedScript = await generatePersonalizedScript({
      prospect,
      baseScript,
      knowledgeData,
      type,
      customRequirements
    });

    res.json({
      success: true,
      data: {
        script: personalizedScript,
        prospect: {
          companyName: prospect.companyName,
          industry: prospect.industry,
          contactName: prospect.contact?.name
        },
        knowledgeUsed: knowledgeData.length
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Genera template email personalizzato
router.post('/generate-email-template', [
  body('prospectId').isMongoId().withMessage('ID prospect non valido'),
  body('type').isIn(['cold-outreach', 'follow-up', 'offer', 'proposal', 'demo-invitation']).withMessage('Tipo email non valido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { prospectId, type, includeRates = false, customVariables = {} } = req.body;

    // Ottieni dati prospect
    const prospect = await Prospect.findById(prospectId);
    if (!prospect) {
      return res.status(404).json({ success: false, error: 'Prospect non trovato' });
    }

    // Ottieni template base
    let baseTemplate = await EmailTemplate.findOne({
      type,
      'targetAudience.industry': prospect.industry,
      isActive: true,
      isApproved: true
    }).sort({ 'performance.replied': -1 });

    if (!baseTemplate) {
      // Fallback a template generico
      baseTemplate = await EmailTemplate.findOne({
        type,
        isActive: true,
        isApproved: true
      }).sort({ 'performance.replied': -1 });
    }

    if (!baseTemplate) {
      return res.status(404).json({ success: false, error: 'Template non trovato' });
    }

    // Ottieni tariffe se richieste
    let ratesData = {};
    if (includeRates) {
      ratesData = await getShippingRates(prospect);
    }

    // Personalizza template
    const personalizedEmail = baseTemplate.personalize(prospect, ratesData, customVariables);

    // Ricerca aggiuntiva con Perplexity se abilitata
    let enrichedContent = personalizedEmail;
    if (req.body.usePerplexity) {
      enrichedContent = await enrichWithPerplexity(prospect, personalizedEmail);
    }

    res.json({
      success: true,
      data: {
        email: enrichedContent,
        baseTemplate: baseTemplate.name,
        prospect: {
          companyName: prospect.companyName,
          industry: prospect.industry
        },
        ratesIncluded: includeRates
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Analisi competitor e market research
router.post('/market-research', [
  body('prospectId').isMongoId().withMessage('ID prospect non valido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { prospectId, researchType = 'general' } = req.body;

    const prospect = await Prospect.findById(prospectId);
    if (!prospect) {
      return res.status(404).json({ success: false, error: 'Prospect non trovato' });
    }

    // Esegui ricerca con Perplexity
    const researchResults = await performMarketResearch(prospect, researchType);

    // Aggiorna prospect con nuove informazioni
    if (researchResults.insights) {
      prospect.businessInfo.painPoints = [
        ...(prospect.businessInfo.painPoints || []),
        ...researchResults.insights.painPoints
      ];
      await prospect.save();
    }

    res.json({
      success: true,
      data: researchResults
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Suggerimenti di follow-up
router.post('/suggest-follow-up', [
  body('prospectId').isMongoId().withMessage('ID prospect non valido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { prospectId } = req.body;

    const prospect = await Prospect.findById(prospectId);
    if (!prospect) {
      return res.status(404).json({ success: false, error: 'Prospect non trovato' });
    }

    // Analizza storico interazioni
    const lastInteraction = prospect.interactions[prospect.interactions.length - 1];
    const daysSinceLastContact = lastInteraction ? 
      Math.floor((Date.now() - lastInteraction.date) / (1000 * 60 * 60 * 24)) : 0;

    // Genera suggerimenti personalizzati
    const suggestions = await generateFollowUpSuggestions(prospect, lastInteraction, daysSinceLastContact);

    res.json({
      success: true,
      data: {
        suggestions,
        prospect: {
          companyName: prospect.companyName,
          status: prospect.status,
          daysSinceLastContact
        }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Funzioni helper

async function getRelevantKnowledge(prospect, scriptType) {
  const searchTerms = [
    prospect.industry,
    scriptType,
    'benefici',
    'obiezioni-comuni'
  ];

  const knowledgeItems = await KnowledgeBase.find({
    isActive: true,
    $or: [
      { tags: { $in: searchTerms } },
      { category: { $in: ['benefici', 'obiezioni-comuni', 'funzionalità'] } }
    ]
  }).sort({ priority: -1 }).limit(10);

  return knowledgeItems;
}

async function generatePersonalizedScript(data) {
  const { prospect, baseScript, knowledgeData, type } = data;
  
  // Se esiste uno script base, personalizzalo
  if (baseScript) {
    return baseScript.personalize(prospect);
  }

  // Altrimenti genera uno script base utilizzando la knowledge base
  const benefits = knowledgeData.filter(k => k.category === 'benefici');
  const objections = knowledgeData.filter(k => k.category === 'obiezioni-comuni');

  return {
    opener: `Ciao ${prospect.contact?.name || '[Nome]'}, sono [Nome] di SendCloud. Ho visto che ${prospect.companyName} opera nel settore ${prospect.industry}.`,
    hook: `La ragione della mia chiamata è che aiutiamo aziende come la vostra a ottimizzare i processi di spedizione e ridurre i costi fino al 30%.`,
    valueProposition: benefits.length > 0 ? benefits[0].content : 'SendCloud offre soluzioni integrate per la gestione delle spedizioni.',
    questions: [
      {
        question: `Come gestite attualmente le vostre spedizioni in ${prospect.companyName}?`,
        purpose: 'Identificare pain points attuali'
      }
    ],
    objectionHandling: objections.map(obj => ({
      objection: obj.title,
      response: obj.content
    })),
    closing: 'Possiamo organizzare una demo di 15 minuti per mostrarvi come altri clienti nel vostro settore hanno ottimizzato le loro spedizioni?'
  };
}

async function getShippingRates(prospect) {
  // Cerca tariffe nella knowledge base basate su volume/destinazioni del prospect
  const ratesKnowledge = await KnowledgeBase.find({
    category: 'tariffe-corrieri',
    isActive: true
  });

  // Simula calcolo tariffe personalizzate
  const estimatedRates = [
    {
      carrier: 'DHL Express',
      service: 'Express Worldwide',
      price: '12.50',
      zone: 'EU'
    },
    {
      carrier: 'UPS',
      service: 'Standard',
      price: '8.90',
      zone: 'EU'
    }
  ];

  return {
    shippingRates: estimatedRates,
    knowledgeBase: ratesKnowledge
  };
}

async function enrichWithPerplexity(prospect, email) {
  try {
    if (!process.env.PERPLEXITY_API_KEY) {
      console.warn('Perplexity API key not configured');
      return email;
    }

    // Query per ricerca aggiuntiva
    const query = `Latest news and trends about ${prospect.companyName} ${prospect.industry} ecommerce shipping logistics 2024`;

    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 300
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const insights = response.data.choices[0]?.message?.content;
    
    if (insights) {
      // Aggiungi insights personalizzati all'email
      email.html = email.html.replace(
        '{{companyName}}',
        `${prospect.companyName} - ho notato che ${insights.substring(0, 100)}...`
      );
    }

    return email;
  } catch (error) {
    console.error('Errore Perplexity enrichment:', error);
    return email;
  }
}

async function performMarketResearch(prospect, researchType) {
  try {
    // Simulazione ricerca market - in produzione integrare Perplexity
    const mockResults = {
      industry: prospect.industry,
      marketSize: 'Growing 15% YoY',
      keyTrends: [
        'Sostenibilità nelle spedizioni',
        'Automazione dei processi logistici',
        'Customer experience nelle consegne'
      ],
      competitors: [
        'DHL', 'UPS', 'FedEx', 'Amazon Logistics'
      ],
      insights: {
        painPoints: [
          'Costi di spedizione elevati',
          'Mancanza di trasparenza nei tracking',
          'Difficoltà nella gestione resi'
        ],
        opportunities: [
          'Automazione picking e packing',
          'Integrazione multi-carrier',
          'Analytics e reporting avanzati'
        ]
      },
      recommendedApproach: `Per ${prospect.companyName}, consiglio di focalizzarsi sull'ottimizzazione dei costi e miglioramento customer experience.`
    };

    return mockResults;
  } catch (error) {
    console.error('Errore market research:', error);
    return { error: 'Impossibile completare la ricerca' };
  }
}

async function generateFollowUpSuggestions(prospect, lastInteraction, daysSinceLastContact) {
  const suggestions = [];

  // Logica basata su status e timing
  if (daysSinceLastContact > 7 && prospect.status === 'contattato') {
    suggestions.push({
      type: 'email',
      timing: 'immediately',
      content: 'Email di follow-up con case study rilevante',
      priority: 'high'
    });
  }

  if (prospect.status === 'interessato' && daysSinceLastContact > 3) {
    suggestions.push({
      type: 'call',
      timing: 'within 24h',
      content: 'Chiamata per programmare demo personalizzata',
      priority: 'high'
    });
  }

  if (lastInteraction?.outcome === 'positive') {
    suggestions.push({
      type: 'proposal',
      timing: 'within 48h',
      content: 'Invio proposta commerciale personalizzata',
      priority: 'medium'
    });
  }

  return suggestions;
}

module.exports = router; 
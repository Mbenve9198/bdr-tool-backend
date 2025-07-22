const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const KnowledgeBase = require('../models/KnowledgeBase');

// GET - Ottieni tutte le tariffe
router.get('/', async (req, res) => {
  try {
    const { carrier, zone, service } = req.query;
    let query = { 
      category: 'tariffe-corrieri',
      isActive: true 
    };

    if (carrier) {
      query['carrierInfo.name'] = new RegExp(carrier, 'i');
    }

    const rates = await KnowledgeBase.find(query)
      .sort({ 'carrierInfo.name': 1, priority: -1 });

    // Filtra per zona e servizio se specificati
    let filteredRates = rates;
    if (zone || service) {
      filteredRates = rates.filter(rate => {
        if (!rate.carrierInfo) return false;
        
        let matchZone = true;
        let matchService = true;
        
        if (zone && rate.carrierInfo.zones) {
          matchZone = rate.carrierInfo.zones.some(z => 
            z.zone.toLowerCase().includes(zone.toLowerCase())
          );
        }
        
        if (service && rate.carrierInfo.services) {
          matchService = rate.carrierInfo.services.some(s => 
            s.service.toLowerCase().includes(service.toLowerCase())
          );
        }
        
        return matchZone && matchService;
      });
    }

    res.json({ 
      success: true, 
      data: filteredRates,
      count: filteredRates.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Calcola tariffe per prospect
router.post('/calculate', [
  body('destination').trim().isLength({ min: 1 }).withMessage('Destinazione richiesta'),
  body('weight').isNumeric().withMessage('Peso deve essere numerico'),
  body('service').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { destination, weight, service = 'standard' } = req.body;

    // Determina zona basata su destinazione
    const zone = determineZone(destination);
    
    // Ottieni tariffe disponibili per la zona
    const availableRates = await KnowledgeBase.find({
      category: 'tariffe-corrieri',
      isActive: true,
      'carrierInfo.zones.zone': zone
    });

    // Calcola prezzi personalizzati
    const calculatedRates = availableRates.map(rate => {
      const carrierZone = rate.carrierInfo.zones.find(z => z.zone === zone);
      const carrierService = rate.carrierInfo.services.find(s => 
        s.service.toLowerCase().includes(service.toLowerCase())
      );

      if (!carrierZone || !carrierService) return null;

      const basePrice = carrierZone.basePrice || carrierService.price;
      const weightMultiplier = carrierZone.weightMultiplier || 1;
      const finalPrice = basePrice + (weight * weightMultiplier);

      return {
        carrier: rate.carrierInfo.name,
        service: carrierService.service,
        price: finalPrice.toFixed(2),
        currency: carrierService.currency || 'EUR',
        estimatedDelivery: getEstimatedDelivery(rate.carrierInfo.name, service, zone),
        conditions: carrierService.conditions
      };
    }).filter(Boolean);

    // Ordina per prezzo
    calculatedRates.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

    res.json({
      success: true,
      data: {
        destination,
        weight,
        zone,
        rates: calculatedRates,
        recommendedCarrier: calculatedRates[0]?.carrier || null
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Confronta tariffe tra corrieri
router.get('/compare', async (req, res) => {
  try {
    const { carriers, destination = 'Italia', weight = 2 } = req.query;
    
    if (!carriers) {
      return res.status(400).json({ 
        success: false, 
        error: 'Specificare almeno un corriere da confrontare' 
      });
    }

    const carrierList = carriers.split(',');
    const zone = determineZone(destination);

    const comparison = [];

    for (const carrier of carrierList) {
      const carrierRates = await KnowledgeBase.findOne({
        category: 'tariffe-corrieri',
        'carrierInfo.name': new RegExp(carrier, 'i'),
        isActive: true
      });

      if (carrierRates && carrierRates.carrierInfo) {
        const zone_info = carrierRates.carrierInfo.zones.find(z => z.zone === zone);
        const standard_service = carrierRates.carrierInfo.services.find(s => 
          s.service.toLowerCase().includes('standard')
        );

        if (zone_info && standard_service) {
          const price = zone_info.basePrice + (parseFloat(weight) * zone_info.weightMultiplier);
          
          comparison.push({
            carrier: carrierRates.carrierInfo.name,
            service: standard_service.service,
            price: price.toFixed(2),
            estimatedDelivery: getEstimatedDelivery(carrierRates.carrierInfo.name, 'standard', zone)
          });
        }
      }
    }

    comparison.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

    res.json({
      success: true,
      data: {
        comparison,
        destination,
        weight,
        bestOption: comparison[0] || null,
        savings: comparison.length > 1 ? 
          (parseFloat(comparison[comparison.length - 1].price) - parseFloat(comparison[0].price)).toFixed(2) : 0
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions
function determineZone(destination) {
  const italianDestinations = ['italia', 'italy', 'it'];
  const euDestinations = ['francia', 'germany', 'germania', 'spagna', 'spain', 'france'];
  
  const dest = destination.toLowerCase();
  
  if (italianDestinations.some(d => dest.includes(d))) {
    return 'Italia';
  } else if (euDestinations.some(d => dest.includes(d))) {
    return 'EU';
  } else {
    return 'International';
  }
}

function getEstimatedDelivery(carrier, service, zone) {
  const deliveryMatrix = {
    'DHL': {
      'Italia': { 'standard': '1-2 giorni', 'express': '24h' },
      'EU': { 'standard': '2-3 giorni', 'express': '1-2 giorni' },
      'International': { 'standard': '3-5 giorni', 'express': '2-3 giorni' }
    },
    'UPS': {
      'Italia': { 'standard': '1-2 giorni', 'express': '24h' },
      'EU': { 'standard': '2-4 giorni', 'express': '1-2 giorni' },
      'International': { 'standard': '4-6 giorni', 'express': '2-4 giorni' }
    }
  };

  return deliveryMatrix[carrier]?.[zone]?.[service] || '2-5 giorni lavorativi';
}

module.exports = router; 
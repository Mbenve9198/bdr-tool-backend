const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const axios = require('axios');

// POST - Analizza traffico sito web con SimilarWeb via Apify
router.post('/analyze', [
  body('websiteUrl').isURL().withMessage('URL non valido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { websiteUrl } = req.body;
    
    // Estrae il dominio dall'URL
    const url = new URL(websiteUrl);
    const domain = url.hostname.replace('www.', '');

    console.log(`Analizzando traffico per: ${domain}`);

    if (!process.env.APIFY_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'Token Apify non configurato'
      });
    }

    const response = await axios.post(
      'https://api.apify.com/v2/acts/tri_angle~fast-similarweb-scraper/run-sync-get-dataset-items',
      {
        urls: [domain],
        maxItems: 1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.APIFY_TOKEN}`
        },
        timeout: 60000 // 60 secondi timeout
      }
    );

    if (!response.data || response.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nessun dato trovato per questo sito web'
      });
    }

    const siteData = response.data[0];
    
    // Elabora i dati per renderli più utilizzabili per i BDR
    const processedData = {
      basic: {
        url: siteData.url,
        siteName: siteData.name,
        title: siteData.title,
        description: siteData.description,
        category: siteData.category,
        scrapedAt: siteData.scrapedAt
      },
      ranking: {
        globalRank: siteData.globalRank?.rank,
        countryRank: siteData.countryRank,
        categoryRank: siteData.categoryRank
      },
      traffic: {
        totalVisits: siteData.engagements?.visits,
        timeOnSite: Math.round(siteData.engagements?.timeOnSite / 60), // minuti
        pagePerVisit: Math.round(siteData.engagements?.pagePerVisit * 10) / 10,
        bounceRate: Math.round(siteData.engagements?.bounceRate * 100), // percentuale
        estimatedMonthlyVisits: siteData.estimatedMonthlyVisits
      },
      sources: {
        direct: Math.round(siteData.trafficSources?.direct * 100),
        search: Math.round(siteData.trafficSources?.search * 100),
        social: Math.round(siteData.trafficSources?.social * 100),
        referrals: Math.round(siteData.trafficSources?.referrals * 100),
        paidReferrals: Math.round(siteData.trafficSources?.paidReferrals * 100),
        mail: Math.round(siteData.trafficSources?.mail * 100)
      },
      geography: {
        topCountries: siteData.topCountries?.map(country => ({
          countryCode: country.countryCode,
          countryName: country.countryName,
          visitsShare: Math.round(country.visitsShare * 100),
          estimatedVisits: Math.round((siteData.engagements?.visits || 0) * country.visitsShare)
        })) || []
      },
      keywords: {
        topKeywords: siteData.topKeywords?.slice(0, 5).map(keyword => ({
          name: keyword.name,
          estimatedValue: keyword.estimatedValue,
          volume: keyword.volume
        })) || []
      },
      // Insights specifici per BDR
      bdrInsights: generateBDRInsights(siteData)
    };

    res.json({
      success: true,
      data: processedData
    });

  } catch (error) {
    console.error('Errore analisi SimilarWeb:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: `Errore API SimilarWeb: ${error.response.statusText}`
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Errore interno durante l\'analisi del traffico'
    });
  }
});

// Funzione per generare insights specifici per BDR
function generateBDRInsights(siteData) {
  const insights = [];
  
  // Analisi volume traffico
  const visits = siteData.engagements?.visits || 0;
  if (visits > 100000) {
    insights.push({
      type: 'volume',
      message: `Alto volume di traffico (${visits.toLocaleString()} visite/mese) - potenziale cliente enterprise`,
      priority: 'high'
    });
  } else if (visits > 10000) {
    insights.push({
      type: 'volume',
      message: `Volume medio di traffico (${visits.toLocaleString()} visite/mese) - buon prospect per soluzioni mid-market`,
      priority: 'medium'
    });
  } else if (visits > 1000) {
    insights.push({
      type: 'volume',
      message: `Volume basso di traffico (${visits.toLocaleString()} visite/mese) - prospect per soluzioni entry-level`,
      priority: 'low'
    });
  }

  // Analisi presenza internazionale
  const topCountries = siteData.topCountries || [];
  const internationalCountries = topCountries.filter(c => c.visitsShare > 0.05 && c.countryCode !== 'IT').length;
  
  if (internationalCountries > 3) {
    insights.push({
      type: 'international',
      message: `Forte presenza internazionale (${internationalCountries} paesi) - ottimo prospect per soluzioni di spedizione internazionale`,
      priority: 'high'
    });
  } else if (internationalCountries > 1) {
    insights.push({
      type: 'international',
      message: `Presenza internazionale limitata (${internationalCountries} paesi) - opportunità di espansione`,
      priority: 'medium'
    });
  }

  // Analisi engagement
  const bounceRate = siteData.engagements?.bounceRate || 0;
  const pagePerVisit = siteData.engagements?.pagePerVisit || 0;
  
  if (bounceRate < 0.4 && pagePerVisit > 3) {
    insights.push({
      type: 'engagement',
      message: 'Alto engagement degli utenti - sito e-commerce ben strutturato',
      priority: 'medium'
    });
  }

  // Analisi categoria business
  const category = siteData.category;
  if (category && category.toLowerCase().includes('ecommerce')) {
    insights.push({
      type: 'business',
      message: 'Confermato come e-commerce - target perfetto per SendCloud',
      priority: 'high'
    });
  }

  return insights;
}

module.exports = router; 
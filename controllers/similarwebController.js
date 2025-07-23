const axios = require('axios');
const Prospect = require('../models/Prospect');

class SimilarWebController {
  
  // Analizza traffico sito web tramite Apify SimilarWeb
  async analyzeSiteTraffic(req, res) {
    let domain = ''; // Dichiara domain nel scope della funzione
    
    try {
      const { websiteUrl } = req.body;
      
      // Estrae e pulisce il dominio dall'URL
      const url = new URL(websiteUrl);
      domain = url.hostname.replace('www.', '');
      
      // Validazione dominio
      if (!domain || domain.length < 3 || !domain.includes('.')) {
        console.error(`❌ [SimilarWeb] Dominio non valido: ${domain}`);
        return res.status(400).json({
          success: false,
          error: `Dominio non valido: ${domain}. Inserisci un URL completo (es. https://example.com)`
        });
      }

      console.log(`🔍 [SimilarWeb] Analizzando traffico per: ${domain}`);

      // Verifica configurazione token
      if (!process.env.APIFY_TOKEN) {
        console.error('❌ [SimilarWeb] APIFY_TOKEN non configurato');
        return res.status(500).json({
          success: false,
          error: 'Token Apify non configurato nel backend'
        });
      }

      // Chiamata ad Apify SimilarWeb
      const response = await axios.post(
        'https://api.apify.com/v2/acts/tri_angle~fast-similarweb-scraper/run-sync-get-dataset-items',
        {
          websites: [domain],
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
        console.log(`⚠️ [SimilarWeb] Nessun dato trovato per: ${domain}`);
        return res.status(404).json({
          success: false,
          error: 'Nessun dato traffico trovato per questo sito web'
        });
      }

      const siteData = response.data[0];
      
      // Elabora i dati per renderli utilizzabili dai BDR
      const processedData = this.processSimilarWebData(siteData);
      
      console.log(`✅ [SimilarWeb] Analisi completata per: ${domain}`);
      console.log(`📊 [SimilarWeb] Visite mensili: ${processedData.traffic.totalVisits?.toLocaleString() || 'N/A'}`);

      // Salva o aggiorna i dati nel database
      const savedProspect = await this.saveProspectData(domain, websiteUrl, processedData, siteData);
      console.log(`💾 [SimilarWeb] Prospect salvato con ID: ${savedProspect._id}`);

      res.json({
        success: true,
        data: processedData,
        prospectId: savedProspect._id,
        prospectData: {
          companyName: savedProspect.companyName,
          website: savedProspect.website,
          estimatedBusiness: savedProspect.businessInfo
        }
      });

    } catch (error) {
      console.error('❌ [SimilarWeb] Errore durante analisi:', error.message);
      
      if (error.response) {
        const status = error.response.status;
        const responseData = error.response.data;
        
        // Log dettagliato per debug
        console.error(`🔍 [SimilarWeb] Status: ${status}`);
        console.error(`🔍 [SimilarWeb] Response:`, responseData);
        
        let errorMessage = 'Errore API SimilarWeb';
        
        switch (status) {
          case 400:
            console.error(`🔍 [SimilarWeb] Richiesta malformata per dominio: ${domain}`);
            console.error(`🔍 [SimilarWeb] Payload inviato:`, { websites: [domain], maxItems: 1 });
            errorMessage = `Errore nella richiesta per il dominio "${domain}". Verifica che l'URL sia corretto e nel formato giusto.`;
            break;
          case 401:
            errorMessage = 'Token Apify non valido o scaduto';
            break;
          case 402:
            errorMessage = 'Quota Apify esaurita. Verifica il piano su apify.com';
            break;
          case 429:
            errorMessage = 'Limite di rate raggiunto. Riprova tra qualche minuto';
            break;
          case 500:
            errorMessage = 'Errore interno API Apify';
            break;
          default:
            errorMessage = `Errore API SimilarWeb (${status}): ${responseData?.error || error.response.statusText}`;
        }
        
        return res.status(status).json({
          success: false,
          error: errorMessage
        });
      }
      
      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({
          success: false,
          error: 'Timeout durante l\'analisi (60s). L\'analisi SimilarWeb può richiedere più tempo. Riprova.'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Errore interno durante l\'analisi del traffico'
      });
    }
  }

  // Elabora i dati SimilarWeb per renderli utilizzabili per i BDR
  processSimilarWebData(siteData) {
    return {
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
      bdrInsights: this.generateBDRInsights(siteData)
    };
  }

  // Genera insights specifici per BDR basati sui dati di traffico
  generateBDRInsights(siteData) {
    const insights = [];
    
    // Analisi volume traffico
    const visits = siteData.engagements?.visits || 0;
    if (visits > 100000) {
      insights.push({
        type: 'volume',
        message: `Alto volume di traffico (${visits.toLocaleString()} visite/mese) - potenziale cliente enterprise`,
        priority: 'high',
        actionable: 'Approccio con soluzioni enterprise e account manager dedicato'
      });
    } else if (visits > 10000) {
      insights.push({
        type: 'volume',
        message: `Volume medio di traffico (${visits.toLocaleString()} visite/mese) - buon prospect per soluzioni mid-market`,
        priority: 'medium',
        actionable: 'Proponi soluzioni scalabili per crescita'
      });
    } else if (visits > 1000) {
      insights.push({
        type: 'volume',
        message: `Volume basso di traffico (${visits.toLocaleString()} visite/mese) - prospect per soluzioni entry-level`,
        priority: 'low',
        actionable: 'Focus su costi competitivi e facilità d\'uso'
      });
    }

    // Analisi presenza internazionale
    const topCountries = siteData.topCountries || [];
    const internationalCountries = topCountries.filter(c => c.visitsShare > 0.05 && c.countryCode !== 'IT').length;
    
    if (internationalCountries > 3) {
      insights.push({
        type: 'international',
        message: `Forte presenza internazionale (${internationalCountries} paesi) - ottimo prospect per spedizioni internazionali`,
        priority: 'high',
        actionable: 'Emphasizza tariffe competitive internazionali e corrieri globali'
      });
    } else if (internationalCountries > 1) {
      insights.push({
        type: 'international', 
        message: `Presenza internazionale limitata (${internationalCountries} paesi) - opportunità di espansione`,
        priority: 'medium',
        actionable: 'Proponi strategie di espansione geografica con SendCloud'
      });
    }

    // Analisi engagement
    const bounceRate = siteData.engagements?.bounceRate || 0;
    const pagePerVisit = siteData.engagements?.pagePerVisit || 0;
    
    if (bounceRate < 0.4 && pagePerVisit > 3) {
      insights.push({
        type: 'engagement',
        message: 'Alto engagement degli utenti - sito e-commerce ben strutturato',
        priority: 'medium',
        actionable: 'Sito di qualità, prospect serio con potenziale di conversione alto'
      });
    }

    // Analisi categoria business
    const category = siteData.category;
    if (category && category.toLowerCase().includes('ecommerce')) {
      insights.push({
        type: 'business',
        message: 'Confermato come e-commerce - target perfetto per SendCloud',
        priority: 'high',
        actionable: 'Prospect ideale! Procedi con demo e caso studio specifico e-commerce'
      });
    }

    return insights;
  }

  // Salva o aggiorna i dati del prospect nel database
  async saveProspectData(domain, websiteUrl, processedData, rawSimilarWebData) {
    try {
      // Cerca prospect esistente per dominio
      let prospect = await Prospect.findOne({ website: websiteUrl });

      // Calcola stime business basate su dati SimilarWeb
      const monthlyVisits = processedData.traffic.totalVisits || 0;
      const conversionRate = 2.0; // 2% medio e-commerce Italia
      const averageOrderValue = 75; // €75 AOV medio
      const monthlyOrders = Math.round(monthlyVisits * (conversionRate / 100));
      const monthlyShipments = Math.round(monthlyOrders * 1.05); // +5% multi-item

      const businessEstimates = {
        monthlyShipments: monthlyShipments,
        averageOrderValue: averageOrderValue,
        currentShippingCosts: Math.round(monthlyShipments * 3.5), // €3.50 medio spedizione
        mainDestinations: processedData.geography.topCountries?.slice(0, 3).map(c => c.countryName) || [],
        estimatedMonthlyRevenue: monthlyOrders * averageOrderValue,
        conversionRate: conversionRate,
        monthlyOrders: monthlyOrders,
        estimatedMonthlyVisits: monthlyVisits
      };

      if (prospect) {
        // Aggiorna prospect esistente
        console.log(`📝 [SimilarWeb] Aggiornando prospect esistente: ${prospect.companyName}`);
        
        prospect.websiteAnalysis = {
          isEcommerce: true,
          platform: 'Unknown', // Potremmo detectarlo in futuro
          analysisDate: new Date(),
          analysisData: {
            similarweb: {
              processed: processedData,
              raw: rawSimilarWebData,
              analyzedAt: new Date()
            }
          }
        };

        // Aggiorna stime business
        prospect.businessInfo = {
          ...prospect.businessInfo?.toObject?.() || {},
          ...businessEstimates
        };

        // Aggiungi interazione di analisi
        prospect.interactions.push({
          type: 'follow-up',
          date: new Date(),
          notes: `Analisi SimilarWeb automatica: ${monthlyVisits.toLocaleString()} visite/mese, ${monthlyShipments} spedizioni stimate`,
          outcome: 'positive',
          nextAction: 'Preparare proposta commerciale basata su dati traffico',
          bdrName: 'Sistema Automatico'
        });

        await prospect.save();
        return prospect;

      } else {
        // Crea nuovo prospect
        console.log(`🆕 [SimilarWeb] Creando nuovo prospect per: ${domain}`);
        
        const newProspect = new Prospect({
          companyName: processedData.basic.siteName || domain,
          website: websiteUrl,
          industry: 'E-commerce', // Default basato su SimilarWeb
          size: this.estimateCompanySize(monthlyVisits),
          
          businessInfo: businessEstimates,
          
          websiteAnalysis: {
            isEcommerce: true,
            platform: 'Unknown',
            analysisDate: new Date(),
            analysisData: {
              similarweb: {
                processed: processedData,
                raw: rawSimilarWebData,
                analyzedAt: new Date()
              }
            }
          },

          interactions: [{
            type: 'follow-up',
            date: new Date(),
            notes: `Prima analisi SimilarWeb: ${monthlyVisits.toLocaleString()} visite/mese, potenziale ${monthlyShipments} spedizioni`,
            outcome: 'positive',
            nextAction: 'Contattare per demo SendCloud',
            bdrName: 'Sistema Automatico'
          }],

          status: 'nuovo'
        });

        const savedProspect = await newProspect.save();
        return savedProspect;
      }

    } catch (error) {
      console.error('❌ [SimilarWeb] Errore salvataggio prospect:', error);
      // Non interrompere il flusso se il salvataggio fallisce
      return { _id: 'error', companyName: domain, website: websiteUrl, businessInfo: {} };
    }
  }

  // Stima dimensione azienda basata su traffico
  estimateCompanySize(monthlyVisits) {
    if (monthlyVisits > 500000) return 'enterprise';
    if (monthlyVisits > 100000) return 'grande';
    if (monthlyVisits > 10000) return 'media';
    if (monthlyVisits > 1000) return 'piccola';
    return 'startup';
  }
}

module.exports = new SimilarWebController(); 
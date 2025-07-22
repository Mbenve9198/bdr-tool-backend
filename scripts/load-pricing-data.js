const mongoose = require('mongoose');
const KnowledgeBase = require('../models/KnowledgeBase');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sendcloud-bdr';

// Dati tariffe SendCloud
const pricingData = [
  {
    "carrier": "BRT Express",
    "scope": "Italia",
    "fuel_included": true,
    "weight_basis": "peso reale",
    "dimension_limits": {
      "parcel": {
        "max_width_cm": 150,
        "max_height_cm": 75,
        "max_length_cm": 75,
        "sum_of_two_sides_cm": 180
      },
      "pallet": {
        "base_cm": "120×120",
        "max_height_cm": 180
      }
    },
    "price_bands": [
      { "units": "0‑2",   "list_price_eur": 5.51,   "max_discount_price_eur": 4.98 },
      { "units": "2‑5",   "list_price_eur": 5.84,   "max_discount_price_eur": 5.30 },
      { "units": "5‑10",  "list_price_eur": 8.48,   "max_discount_price_eur": 7.89 },
      { "units": "10‑25", "list_price_eur": 11.97,  "max_discount_price_eur": 11.34 },
      { "units": "25‑50", "list_price_eur": 18.93,  "max_discount_price_eur": 17.74 },
      { "units": "50‑100","list_price_eur": 33.83,  "max_discount_price_eur": 30.30 },
      { "units": "100‑200","list_price_eur": 67.65, "max_discount_price_eur": 60.61 },
      { "units": "200‑300","list_price_eur": 101.47,"max_discount_price_eur": 90.91 },
      { "units": "300‑400","list_price_eur": 135.28,"max_discount_price_eur": 121.22 },
      { "units": "400‑500","list_price_eur": 169.11,"max_discount_price_eur": 151.52 }
    ]
  },
  {
    "carrier": "Poste Italiane – Italia (PDB Standard)",
    "scope": "Italia",
    "fuel_included": true,
    "weight_basis": "peso reale",
    "dimension_limits": {
      "parcel": {
        "max_length_cm": 280,
        "max_height_cm": 170,
        "max_total_cm": 450
      }
    },
    "price_bands": [
      { "units": "0‑2",  "list_price_eur": 5.67,  "max_discount_price_eur": 5.20 },
      { "units": "2‑5",  "list_price_eur": 6.50,  "max_discount_price_eur": 5.99 },
      { "units": "5‑10", "list_price_eur": 8.36,  "max_discount_price_eur": 7.76 },
      { "units": "10‑20","list_price_eur": 9.94,  "max_discount_price_eur": 9.14 },
      { "units": "20‑30","list_price_eur": 12.27, "max_discount_price_eur": 11.29 }
    ]
  },
  {
    "carrier": "GLS Express",
    "scope": "Italia",
    "fuel_included": true,
    "weight_basis": "peso volumetrico",
    "volumetric_formula": "(L×W×H)/3333",
    "dimension_limits": {
      "parcel": {
        "max_length_cm": 200,
        "max_width_cm": 150,
        "max_height_cm": 130
      }
    },
    "price_bands": [
      { "units": "0‑2",  "list_price_eur": 5.10,  "max_discount_price_eur": 4.65 },
      { "units": "2‑5",  "list_price_eur": 5.56,  "max_discount_price_eur": 5.07 },
      { "units": "5‑10", "list_price_eur": 7.78,  "max_discount_price_eur": 7.12 },
      { "units": "10‑30","list_price_eur": 16.11, "max_discount_price_eur": 13.37 },
      { "units": "30‑50","list_price_eur": 22.78, "max_discount_price_eur": 18.90 }
    ]
  },
  {
    "carrier": "Poste Delivery Business Plus",
    "scope": "Internazionale",
    "fuel_included": true,
    "weight_basis": "peso reale",
    "dimension_limits": {
      "parcel": {
        "max_length_cm": 120,
        "max_width_cm": 55,
        "max_height_cm": 50,
        "max_total_cm": 225
      }
    },
    "zones": [
      {
        "countries": ["Germania","Olanda","Danimarca","Polonia"],
        "price_bands": [
          { "kg": "0‑1", "list_price_eur": 9.83,  "max_discount_price_eur": 7.53 },
          { "kg": "1‑2", "list_price_eur": 10.21, "max_discount_price_eur": 7.83 },
          { "kg": "2‑3", "list_price_eur": 11.19, "max_discount_price_eur": 8.57 },
          { "kg": "3‑4", "list_price_eur": 11.66, "max_discount_price_eur": 8.93 },
          { "kg": "4‑5", "list_price_eur": 12.03, "max_discount_price_eur": 9.22 }
        ]
      },
      {
        "countries": ["Francia","Spagna","Repubblica Ceca","Ungheria","Romania","Slovacchia"],
        "price_bands": [
          { "kg": "0‑1", "list_price_eur": 12.35, "max_discount_price_eur": 9.46 },
          { "kg": "1‑2", "list_price_eur": 13.38, "max_discount_price_eur": 10.26 },
          { "kg": "2‑3", "list_price_eur": 14.76, "max_discount_price_eur": 11.32 },
          { "kg": "3‑4", "list_price_eur": 16.09, "max_discount_price_eur": 12.34 },
          { "kg": "4‑5", "list_price_eur": 16.60, "max_discount_price_eur": 12.72 }
        ]
      },
      {
        "countries": ["Svezia","Finlandia","Bulgaria"],
        "price_bands": [
          { "kg": "0‑1", "list_price_eur": 17.71, "max_discount_price_eur": 13.58 },
          { "kg": "1‑2", "list_price_eur": 19.34, "max_discount_price_eur": 14.82 },
          { "kg": "2‑3", "list_price_eur": 20.73, "max_discount_price_eur": 15.89 },
          { "kg": "3‑4", "list_price_eur": 21.87, "max_discount_price_eur": 16.76 },
          { "kg": "4‑5", "list_price_eur": 24.05, "max_discount_price_eur": 18.44 }
        ]
      },
      {
        "countries": ["Stati Uniti"],
        "price_bands": [
          { "kg": "0‑1", "list_price_eur": 36.09, "max_discount_price_eur": 30.00 },
          { "kg": "1‑2", "list_price_eur": 40.03, "max_discount_price_eur": 35.88 },
          { "kg": "2‑3", "list_price_eur": 45.03, "max_discount_price_eur": 38.87 },
          { "kg": "3‑4", "list_price_eur": 50.93, "max_discount_price_eur": 46.77 },
          { "kg": "4‑5", "list_price_eur": 54.20, "max_discount_price_eur": 49.69 }
        ]
      }
    ]
  },
  {
    "carrier": "InPost Italia",
    "scope": "Italia",
    "fuel_included": true,
    "weight_basis": "peso reale",
    "dimension_limits": {
      "sizes_cm": {
        "SMALL": "64×38×8",
        "MEDIUM": "64×38×19",
        "LARGE": "64×38×41"
      }
    },
    "supplements": ["+5 % spedizioni da/per Sicilia e Sardegna"],
    "pickup_conditions": "Ritiro con minimo 10 pacchi (flessibile)",
    "price_bands": [
      { "service": "Locker to Locker Small 0‑25 kg",   "list_price_eur": 3.61, "max_discount_price_eur": 2.96 },
      { "service": "Locker to Locker Medium 0‑25 kg",  "list_price_eur": 3.74, "max_discount_price_eur": 3.07 },
      { "service": "Locker to Locker Large 0‑25 kg",   "list_price_eur": 3.99, "max_discount_price_eur": 3.27 }
    ]
  }
];

class PricingDataLoader {
  constructor() {
    this.stats = {
      carriersLoaded: 0,
      priceRulesCreated: 0,
      errors: 0
    };
  }

  async connect() {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connesso a MongoDB');
    } catch (error) {
      console.error('❌ Errore connessione MongoDB:', error);
      process.exit(1);
    }
  }

  async loadPricingData() {
    console.log('💰 Iniziando caricamento dati tariffe SendCloud...\n');

    try {
      for (const carrier of pricingData) {
        await this.processCarrier(carrier);
      }

      // Crea anche regole di pricing generali
      await this.createGeneralPricingRules();
      
      // Crea script BDR per pricing
      await this.createPricingScripts();

      this.printStats();
      
    } catch (error) {
      console.error('❌ Errore caricamento dati tariffe:', error);
      this.stats.errors++;
    }
  }

  async processCarrier(carrierData) {
    try {
      console.log(`📦 Processando: ${carrierData.carrier}`);

      // 1. Crea knowledge base per overview del corriere
      await this.createCarrierOverview(carrierData);

      // 2. Crea regole di pricing dettagliate  
      await this.createDetailedPricing(carrierData);

      // 3. Crea contenuto per confronti
      await this.createComparisonContent(carrierData);

      this.stats.carriersLoaded++;
      
    } catch (error) {
      console.error(`❌ Errore processando ${carrierData.carrier}:`, error);
      this.stats.errors++;
    }
  }

  async createCarrierOverview(carrier) {
    const title = `Tariffe ${carrier.carrier} - ${carrier.scope}`;
    
    // Calcola prezzo medio e sconto medio
    const avgPrices = this.calculateAverages(carrier);
    
    const content = this.generateCarrierOverview(carrier, avgPrices);

    const existing = await KnowledgeBase.findOne({ 
      title: title,
      source: 'sendcloud-pricing-2025' 
    });
    
    if (existing) {
      console.log(`⚠️  Tariffe già esistenti: ${title}`);
      return;
    }

    await KnowledgeBase.create({
      title: title,
      category: 'tariffe-corrieri',
      content: content,
      tags: [
        'tariffe', 
        carrier.carrier.toLowerCase().replace(/\s+/g, '-'),
        carrier.scope.toLowerCase(),
        'prezzi-sendcloud',
        'sconti-disponibili'
      ],
      priority: 5,
      isActive: true,
      createdBy: 'pricing-import-2025',
      source: 'sendcloud-pricing-2025',
      carrierInfo: {
        name: carrier.carrier,
        services: this.extractServices(carrier),
        zones: this.extractZones(carrier)
      }
    });

    console.log(`✅ Overview creata: ${title}`);
    this.stats.priceRulesCreated++;
  }

  async createDetailedPricing(carrier) {
    // Per corrieri nazionali
    if (carrier.price_bands) {
      for (const band of carrier.price_bands) {
        await this.createPriceBandKB(carrier, band);
      }
    }

    // Per corrieri internazionali con zone
    if (carrier.zones) {
      for (const zone of carrier.zones) {
        await this.createZonePricingKB(carrier, zone);
      }
    }
  }

  async createPriceBandKB(carrier, band) {
    const title = `${carrier.carrier} - Fascia ${band.units || band.service}`;
    
    const discount = ((band.list_price_eur - band.max_discount_price_eur) / band.list_price_eur * 100).toFixed(1);
    
    const content = `**Fascia di peso:** ${band.units || band.service}
**Prezzo listino:** €${band.list_price_eur}
**Prezzo scontato SendCloud:** €${band.max_discount_price_eur}
**Sconto disponibile:** ${discount}%

**Quando usare questa tariffa:**
- Ideale per e-commerce con volumi nella fascia ${band.units || band.service}
- Sconto massimo ${discount}% rispetto al listino pubblico
- ${carrier.fuel_included ? 'Carburante incluso' : 'Carburante escluso'}

**Script BDR:**
"Con SendCloud, per spedizioni ${band.units || band.service}, pagate solo €${band.max_discount_price_eur} invece di €${band.list_price_eur}. Un risparmio del ${discount}% rispetto alle tariffe standard."`;

    const existing = await KnowledgeBase.findOne({ 
      title: title,
      source: 'sendcloud-pricing-2025' 
    });
    
    if (!existing) {
      await KnowledgeBase.create({
        title: title,
        category: 'tariffe-corrieri',
        content: content,
        tags: ['tariffa-dettaglio', carrier.carrier.toLowerCase().replace(/\s+/g, '-'), 'sconto-' + Math.round(discount) + '%'],
        priority: 4,
        isActive: true,
        createdBy: 'pricing-import-2025',
        source: 'sendcloud-pricing-2025'
      });
      
      this.stats.priceRulesCreated++;
    }
  }

  async createZonePricingKB(carrier, zone) {
    const countries = zone.countries.join(', ');
    const title = `${carrier.carrier} - Zone: ${countries}`;
    
    const avgDiscount = this.calculateZoneDiscount(zone);
    
    const content = `**Destinazioni:** ${countries}
**Corriere:** ${carrier.carrier}
**Base di calcolo:** ${carrier.weight_basis}

**Tariffe per fascia di peso:**
${zone.price_bands.map(band => 
  `- ${band.kg}: €${band.list_price_eur} (listino) → €${band.max_discount_price_eur} (SendCloud)`
).join('\n')}

**Sconto medio disponibile:** ${avgDiscount}%

**Limiti dimensionali:**
${this.formatDimensions(carrier.dimension_limits)}

**Script BDR per internazionale:**
"Per spedizioni verso ${countries}, con SendCloud risparmiate in media il ${avgDiscount}% rispetto alle tariffe standard. Per esempio, un pacco di 1kg costa €${zone.price_bands[0]?.max_discount_price_eur} invece di €${zone.price_bands[0]?.list_price_eur}."`;

    const existing = await KnowledgeBase.findOne({ 
      title: title,
      source: 'sendcloud-pricing-2025' 
    });
    
    if (!existing) {
      await KnowledgeBase.create({
        title: title,
        category: 'tariffe-corrieri',
        content: content,
        tags: ['internazionale', 'zone-pricing', carrier.carrier.toLowerCase().replace(/\s+/g, '-')],
        priority: 4,
        isActive: true,
        createdBy: 'pricing-import-2025',
        source: 'sendcloud-pricing-2025'
      });
      
      this.stats.priceRulesCreated++;
    }
  }

  async createComparisonContent(carrier) {
    const title = `Confronto Prezzi: ${carrier.carrier} vs Mercato`;
    
    const competitorPrices = this.getCompetitorPrices(carrier);
    const savings = this.calculateMarketSavings(carrier, competitorPrices);
    
    const content = `**Analisi Competitiva - ${carrier.carrier}**

**Vantaggi SendCloud:**
${savings.advantages.map(adv => `- ${adv}`).join('\n')}

**Risparmio medio vs mercato:** ${savings.averageSaving}%

**Messaggi chiave per BDR:**
- "Con SendCloud risparmiate in media il ${savings.averageSaving}% sulle spedizioni ${carrier.scope.toLowerCase()}"
- "Tariffe prenegoziate con ${carrier.carrier} non disponibili al pubblico"
- "Nessun costo di setup, iniziate a risparmiare subito"

**Obiezioni comuni:**
- **"Abbiamo già un contratto con ${carrier.carrier}"** → "Perfetto! Potete mantenere il vostro contratto e confrontarlo con le nostre tariffe. La maggior parte dei clienti scopre di risparmiare il ${savings.averageSaving}%"
- **"Quanto costa il servizio?"** → "Il servizio SendCloud è gratuito, pagate solo le spedizioni alle tariffe scontate"`;

    const existing = await KnowledgeBase.findOne({ 
      title: title,
      source: 'sendcloud-pricing-2025' 
    });
    
    if (!existing) {
      await KnowledgeBase.create({
        title: title,
        category: 'competitor',
        content: content,
        tags: ['confronto-prezzi', 'vantaggi-competitivi', carrier.carrier.toLowerCase().replace(/\s+/g, '-')],
        priority: 5,
        isActive: true,
        createdBy: 'pricing-import-2025',
        source: 'sendcloud-pricing-2025'
      });
      
      this.stats.priceRulesCreated++;
    }
  }

  async createGeneralPricingRules() {
    const title = "Regole Generali Pricing SendCloud";
    const content = `**Strategie di Pricing per BDR**

**1. Segmentazione clienti per volume:**
- **Startup (0-100 spedizioni/mese):** Focus su semplicità e tariffe competitive per piccoli volumi
- **PMI (100-1000 spedizioni/mese):** Enfatizza automazione e risparmio tempo + denaro
- **Enterprise (1000+ spedizioni/mese):** Tariffe personalizzate e supporto dedicato

**2. Approccio per tipo di spedizione:**
- **Solo Italia:** Confronta BRT, Poste Italiane, GLS, InPost
- **Internazionale:** Focus su Poste Delivery Business Plus e zone specifiche
- **Last-mile specifiche:** InPost per clienti urbani

**3. Calcolo del ROI per il cliente:**
- Risparmio medio: 15-25% sui costi di spedizione
- Tempo risparmiato: 2-3 ore/settimana di amministrazione
- Riduzione errori: 90% grazie all'automazione

**4. Messaggi di valore per fascia:**
- **Prezzo basso (0-5€):** "Anche su piccoli volumi risparmiate"
- **Prezzo medio (5-15€):** "Scalate senza aumentare i costi operativi"  
- **Prezzo alto (15€+):** "Controllo totale su spedizioni premium"

**5. Timing delle offerte:**
- **Q4:** Focus su volumi di picco e scaling
- **Q1:** Ottimizzazione costi e nuovi progetti
- **Estate:** Preparazione per stagione alta`;

    await KnowledgeBase.create({
      title: title,
      category: 'prezzi',
      content: content,
      tags: ['strategie-pricing', 'segmentazione', 'roi', 'messaggi-valore'],
      priority: 5,
      isActive: true,
      createdBy: 'pricing-import-2025',
      source: 'sendcloud-pricing-2025'
    });

    console.log(`✅ Regole generali create`);
    this.stats.priceRulesCreated++;
  }

  async createPricingScripts() {
    const title = "Script BDR: Presentazione Tariffe";
    const content = `**Script per Presentazione Pricing**

**Apertura - Discovery sui costi attuali:**
"Per aiutarvi al meglio, potreste dirmi indicativamente quanto spendete ora per le spedizioni? E quante spedizioni fate al mese?"

**Presentazione valore - dopo aver identificato volume:**
"Perfetto, con i vostri volumi posso mostrarvi delle tariffe molto interessanti. Per esempio, per spedizioni nazionali fino a 2kg, con SendCloud pagate €4.65 con GLS invece dei tipici €6-7 del mercato."

**Gestione obiezione - "Abbiamo già tariffe buone":**
"Capisco perfettamente. La maggior parte dei nostri clienti aveva la stessa impressione. Vi faccio vedere alcuni esempi concreti basati sui vostri volumi, così potete valutare se c'è margine di miglioramento."

**Esempio concreto personalizzabile:**
"Se fate [X] spedizioni da [Y]kg al mese verso [destinazione], con SendCloud spendereste €[prezzo] a spedizione invece di €[prezzo_attuale]. Su base annua parliamo di €[risparmio_annuo] di risparmio."

**Closing - proposta demo:**
"Che ne dite se vi preparo un'analisi personalizzata sui vostri volumi effettivi? Possiamo vedere insieme i risparmi potenziali in 15 minuti di demo."`;

    await KnowledgeBase.create({
      title: title,
      category: 'obiezioni-comuni',
      content: content,
      tags: ['script-pricing', 'gestione-obiezioni', 'discovery', 'closing'],
      priority: 5,
      isActive: true,
      createdBy: 'pricing-import-2025',
      source: 'sendcloud-pricing-2025'
    });

    console.log(`✅ Script BDR creati`);
    this.stats.priceRulesCreated++;
  }

  // Utility methods
  calculateAverages(carrier) {
    let totalList = 0, totalDiscount = 0, count = 0;
    
    if (carrier.price_bands) {
      carrier.price_bands.forEach(band => {
        totalList += band.list_price_eur;
        totalDiscount += band.max_discount_price_eur;
        count++;
      });
    }
    
    if (carrier.zones) {
      carrier.zones.forEach(zone => {
        zone.price_bands.forEach(band => {
          totalList += band.list_price_eur;
          totalDiscount += band.max_discount_price_eur;
          count++;
        });
      });
    }
    
    return {
      avgList: (totalList / count).toFixed(2),
      avgDiscount: (totalDiscount / count).toFixed(2),
      avgSaving: (((totalList - totalDiscount) / totalList) * 100).toFixed(1)
    };
  }

  calculateZoneDiscount(zone) {
    const total = zone.price_bands.reduce((sum, band) => {
      return sum + ((band.list_price_eur - band.max_discount_price_eur) / band.list_price_eur * 100);
    }, 0);
    
    return (total / zone.price_bands.length).toFixed(1);
  }

  generateCarrierOverview(carrier, avgPrices) {
    return `**${carrier.carrier} - Tariffe SendCloud ${carrier.scope}**

**Informazioni generali:**
- Ambito: ${carrier.scope}
- Base di calcolo: ${carrier.weight_basis}
- Carburante: ${carrier.fuel_included ? 'Incluso' : 'Escluso'}
${carrier.volumetric_formula ? `- Formula volumetrica: ${carrier.volumetric_formula}` : ''}

**Prezzi medi:**
- Prezzo listino medio: €${avgPrices.avgList}
- Prezzo SendCloud medio: €${avgPrices.avgDiscount}  
- **Risparmio medio: ${avgPrices.avgSaving}%**

**Limiti dimensionali:**
${this.formatDimensions(carrier.dimension_limits)}

${carrier.supplements ? `**Supplementi:** ${carrier.supplements.join(', ')}` : ''}
${carrier.pickup_conditions ? `**Condizioni ritiro:** ${carrier.pickup_conditions}` : ''}

**Vantaggi per BDR:**
- Tariffe prenegoziate non disponibili al pubblico
- Risparmio garantito rispetto al mercato
- Integrazione immediata con tutti gli e-commerce
- Fatturazione centralizzata SendCloud`;
  }

  extractServices(carrier) {
    const services = [];
    
    if (carrier.price_bands) {
      carrier.price_bands.forEach(band => {
        services.push({
          service: band.units || band.service || 'Standard',
          price: band.max_discount_price_eur,
          currency: 'EUR',
          conditions: `Fascia ${band.units || band.service}`
        });
      });
    }
    
    return services;
  }

  extractZones(carrier) {
    const zones = [];
    
    if (carrier.zones) {
      carrier.zones.forEach(zone => {
        zones.push({
          zone: zone.countries.join(', '),
          countries: zone.countries,
          basePrice: zone.price_bands[0]?.max_discount_price_eur || 0,
          weightMultiplier: 1
        });
      });
    }
    
    return zones;
  }

  formatDimensions(dimensions) {
    if (!dimensions) return '';
    
    let formatted = '';
    
    if (dimensions.parcel) {
      formatted += `**Colli:**\n`;
      Object.entries(dimensions.parcel).forEach(([key, value]) => {
        formatted += `- ${key.replace(/_/g, ' ')}: ${value}\n`;
      });
    }
    
    if (dimensions.pallet) {
      formatted += `**Pallet:**\n`;
      Object.entries(dimensions.pallet).forEach(([key, value]) => {
        formatted += `- ${key.replace(/_/g, ' ')}: ${value}\n`;
      });
    }
    
    if (dimensions.sizes_cm) {
      formatted += `**Dimensioni disponibili:**\n`;
      Object.entries(dimensions.sizes_cm).forEach(([size, dims]) => {
        formatted += `- ${size}: ${dims}\n`;
      });
    }
    
    return formatted;
  }

  getCompetitorPrices(carrier) {
    // Prezzi medi di mercato per riferimento
    const marketPrices = {
      'italia_0_2kg': 6.50,
      'italia_2_5kg': 7.80,
      'europa_0_1kg': 12.00,
      'usa_0_1kg': 45.00
    };
    
    return marketPrices;
  }

  calculateMarketSavings(carrier, marketPrices) {
    const advantages = [
      'Tariffe prenegoziate esclusive',
      'Nessun costo di attivazione',
      'Fatturazione centralizzata',
      'Automazione inclusa'
    ];
    
    // Calcolo risparmio medio basato sui dati reali
    const avgSaving = this.calculateAverages(carrier).avgSaving;
    
    return {
      advantages,
      averageSaving: avgSaving
    };
  }

  printStats() {
    console.log('\n💰 STATISTICHE CARICAMENTO TARIFFE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Corrieri caricati: ${this.stats.carriersLoaded}`);
    console.log(`💶 Regole pricing create: ${this.stats.priceRulesCreated}`);
    console.log(`❌ Errori: ${this.stats.errors}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Totale elementi creati: ${this.stats.priceRulesCreated}`);
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('🔌 Disconnesso da MongoDB');
  }
}

// Esecuzione script
async function main() {
  const loader = new PricingDataLoader();
  
  try {
    await loader.connect();
    await loader.loadPricingData();
    
  } catch (error) {
    console.error('❌ Errore generale:', error);
  } finally {
    await loader.disconnect();
  }
}

// Avvia solo se chiamato direttamente
if (require.main === module) {
  main();
}

module.exports = PricingDataLoader; 
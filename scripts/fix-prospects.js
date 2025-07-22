const mongoose = require('mongoose');
const KnowledgeBase = require('../models/KnowledgeBase');
const Prospect = require('../models/Prospect');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sendcloud-bdr';

async function fixProspects() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connesso a MongoDB');

    // 1. Trova tutti i prospects creati dall'import SendCloud
    const wrongProspects = await Prospect.find({ 
      source: 'sendcloud-testimonial' 
    });

    console.log(`🔍 Trovati ${wrongProspects.length} prospects da correggere`);

    // 2. Converte ogni prospect in contenuto knowledge base utile
    for (const prospect of wrongProspects) {
      const companyName = prospect.companyName;
      const contactName = prospect.contact?.name || 'Cliente';
      
      // Crea un case study nella knowledge base
      const caseStudyContent = `${companyName} è un cliente SendCloud di successo. ` +
        `${contactName} ha implementato la nostra piattaforma per ottimizzare le spedizioni. ` +
        `Questo caso dimostra come aziende del settore e-commerce possano beneficiare delle nostre soluzioni. ` +
        `Utilizzo: "Come ${companyName}, molte aziende del vostro settore hanno risolto i problemi di spedizione con SendCloud."`;

      await KnowledgeBase.create({
        title: `Caso Studio: ${companyName}`,
        category: 'casi-studio',
        content: caseStudyContent,
        tags: ['caso-studio', 'cliente-esistente', 'riferimento', 'e-commerce'],
        priority: 4,
        isActive: true,
        createdBy: 'fix-prospects-script',
        source: 'sendcloud-testimonial-fixed'
      });

      console.log(`✅ Convertito ${companyName} in case study`);
    }

    // 3. Elimina i prospects sbagliati
    const deleteResult = await Prospect.deleteMany({ 
      source: 'sendcloud-testimonial' 
    });

    console.log(`🗑️  Eliminati ${deleteResult.deletedCount} prospects sbagliati`);

    // 4. Crea alcuni prospects competitor realistici invece
    const competitorProspects = [
      {
        companyName: 'ShipStation Europa',
        website: 'https://www.shipstation.com',
        industry: 'Software Spedizioni',
        contact: { name: 'Sales Manager', role: 'Decision Maker' },
        score: 30,
        notes: 'Competitor principale - analizzare per differenziazione',
        source: 'competitor-analysis',
        status: 'nuovo'
      },
      {
        companyName: 'Shippo Italia',
        website: 'https://goshippo.com',
        industry: 'Logistics Tech',
        contact: { name: 'Country Manager', role: 'Espansione Mercato' },
        score: 25,
        notes: 'Competitor emergente nel mercato italiano',
        source: 'competitor-analysis',
        status: 'nuovo'
      }
    ];

    for (const prospect of competitorProspects) {
      await Prospect.create(prospect);
      console.log(`✅ Creato competitor prospect: ${prospect.companyName}`);
    }

    // 5. Statistiche finali
    const totalKB = await KnowledgeBase.countDocuments();
    const totalProspects = await Prospect.countDocuments();

    console.log('\n📊 STATISTICHE FINALI:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📚 Knowledge Base: ${totalKB}`);
    console.log(`🎯 Prospects: ${totalProspects}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Fix completato con successo!');

  } catch (error) {
    console.error('❌ Errore durante il fix:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnesso da MongoDB');
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  fixProspects();
}

module.exports = fixProspects; 
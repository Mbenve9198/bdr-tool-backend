const mongoose = require('mongoose');
const KnowledgeBase = require('../models/KnowledgeBase');
const Prospect = require('../models/Prospect');
const CallScript = require('../models/CallScript');
const EmailTemplate = require('../models/EmailTemplate');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sendcloud-bdr';

async function checkDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connesso a MongoDB');
    console.log(`🔗 Database: ${MONGODB_URI.includes('localhost') ? 'Locale' : 'Remoto (MongoDB Atlas)'}\n`);

    // 1. Verifica Knowledge Base
    console.log('📚 KNOWLEDGE BASE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const totalKB = await KnowledgeBase.countDocuments();
    console.log(`Total items: ${totalKB}`);

    if (totalKB > 0) {
      // Raggruppa per categoria
      const kbByCategory = await KnowledgeBase.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      console.log('Per categoria:');
      kbByCategory.forEach(cat => {
        console.log(`  ${cat._id}: ${cat.count}`);
      });

      // Raggruppa per source
      const kbBySource = await KnowledgeBase.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      console.log('Per source:');
      kbBySource.forEach(src => {
        console.log(`  ${src._id || 'null'}: ${src.count}`);
      });

      // Ultimi 5 items creati
      const recentKB = await KnowledgeBase.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title category source createdAt');
      
      console.log('\nUltimi 5 creati:');
      recentKB.forEach(item => {
        console.log(`  ${item.title.substring(0, 50)}... [${item.category}] (${item.source || 'no-source'})`);
      });
    }

    // 2. Verifica Prospects
    console.log('\n🎯 PROSPECTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const totalProspects = await Prospect.countDocuments();
    console.log(`Total prospects: ${totalProspects}`);

    if (totalProspects > 0) {
      // Raggruppa per source
      const prospectsBySource = await Prospect.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      console.log('Per source:');
      prospectsBySource.forEach(src => {
        console.log(`  ${src._id || 'null'}: ${src.count}`);
      });

      // Lista tutti i prospects
      const allProspects = await Prospect.find()
        .select('companyName contact.name source status createdAt')
        .sort({ createdAt: -1 });
      
      console.log('\nTutti i prospects:');
      allProspects.forEach((prospect, index) => {
        console.log(`  ${index + 1}. ${prospect.companyName} - ${prospect.contact?.name || 'No contact'} [${prospect.source || 'no-source'}] (${prospect.status})`);
      });
    }

    // 3. Verifica Call Scripts
    console.log('\n📞 CALL SCRIPTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const totalScripts = await CallScript.countDocuments();
    console.log(`Total scripts: ${totalScripts}`);

    if (totalScripts > 0) {
      const scripts = await CallScript.find()
        .select('title type source createdAt')
        .sort({ createdAt: -1 });
      
      scripts.forEach((script, index) => {
        console.log(`  ${index + 1}. ${script.title} [${script.type}] (${script.source || 'no-source'})`);
      });
    }

    // 4. Verifica Email Templates
    console.log('\n📧 EMAIL TEMPLATES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const totalTemplates = await EmailTemplate.countDocuments();
    console.log(`Total templates: ${totalTemplates}`);

    // 5. Informazioni database
    console.log('\n🔧 DATABASE INFO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections disponibili:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnesso da MongoDB');
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  checkDatabase();
}

module.exports = checkDatabase; 
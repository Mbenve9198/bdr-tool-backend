const axios = require('axios');
require('dotenv').config();

async function testSimilarWebDomain(domain = 'amazon.com') {
  console.log(`🧪 Testando SimilarWeb per dominio: ${domain}\n`);

  if (!process.env.APIFY_TOKEN) {
    console.error('❌ APIFY_TOKEN non configurato nel file .env');
    return;
  }

  try {
    console.log(`🔍 Inviando richiesta ad Apify...`);
    console.log(`📋 Payload:`, { websites: [domain], maxItems: 1 });

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
        timeout: 60000
      }
    );

    console.log(`✅ Risposta ricevuta (Status: ${response.status})`);
    console.log(`📊 Dati ricevuti:`, JSON.stringify(response.data, null, 2));

    if (response.data && response.data.length > 0) {
      const siteData = response.data[0];
      console.log(`\n🎉 Successo! Dati per ${domain}:`);
      console.log(`   - Nome: ${siteData.name}`);
      console.log(`   - Categoria: ${siteData.category}`);
      console.log(`   - Visite: ${siteData.engagements?.visits?.toLocaleString() || 'N/A'}`);
      console.log(`   - Ranking: ${siteData.globalRank?.rank?.toLocaleString() || 'N/A'}`);
    } else {
      console.log(`⚠️  Nessun dato ricevuto per ${domain}`);
    }

  } catch (error) {
    console.error(`❌ Errore per dominio ${domain}:`);
    console.error(`   Status: ${error.response?.status || 'N/A'}`);
    console.error(`   Message: ${error.message}`);
    
    if (error.response?.data) {
      console.error(`   Response Data:`, error.response.data);
    }

    // Suggerimenti per errori comuni
    if (error.response?.status === 400) {
      console.log(`\n💡 Suggerimenti per errore 400:`);
      console.log(`   - Verifica il parametro websites (non urls) nel payload`);
      console.log(`   - Verifica che il dominio sia corretto: ${domain}`);
      console.log(`   - Prova con domini popolari: amazon.com, google.com`);
    } else if (error.response?.status === 401) {
      console.log(`\n💡 Token non valido. Verifica APIFY_TOKEN in .env`);
    } else if (error.response?.status === 402) {
      console.log(`\n💡 Quota esaurita. Controlla il piano su apify.com`);
    }
  }
}

// Test con dominio da linea di comando o default
const testDomain = process.argv[2] || 'amazon.com';
testSimilarWebDomain(testDomain)
  .then(() => {
    console.log('\n🏁 Test completato');
    process.exit(0);
  })
  .catch(() => process.exit(1)); 
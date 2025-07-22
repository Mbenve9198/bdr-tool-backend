const axios = require('axios');
require('dotenv').config();

async function testSimilarWebIntegration() {
  console.log('🧪 Testando integrazione SimilarWeb...\n');

  // Verifica token
  if (!process.env.APIFY_TOKEN) {
    console.error('❌ APIFY_TOKEN non configurato nel file .env');
    console.log('💡 Aggiungi APIFY_TOKEN=your_token_here nel file .env');
    return;
  }

  console.log('✅ Token Apify configurato');

  // Test con un sito di esempio
  const testUrl = 'amazon.com';
  console.log(`🔍 Testando con: ${testUrl}`);

  try {
    const response = await axios.post(
      'https://api.apify.com/v2/acts/tri_angle~fast-similarweb-scraper/run-sync-get-dataset-items',
      {
        urls: [testUrl],
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

    if (response.data && response.data.length > 0) {
      const siteData = response.data[0];
      
      console.log('✅ Test completato con successo!\n');
      console.log('📊 Dati ricevuti:');
      console.log(`   - URL: ${siteData.url}`);
      console.log(`   - Nome: ${siteData.name}`);
      console.log(`   - Categoria: ${siteData.category}`);
      console.log(`   - Visite mensili: ${siteData.engagements?.visits?.toLocaleString() || 'N/A'}`);
      console.log(`   - Ranking globale: ${siteData.globalRank?.rank?.toLocaleString() || 'N/A'}`);
      
      if (siteData.topCountries && siteData.topCountries.length > 0) {
        console.log('   - Top paesi:');
        siteData.topCountries.slice(0, 3).forEach(country => {
          console.log(`     • ${country.countryName}: ${Math.round(country.visitsShare * 100)}%`);
        });
      }
      
      console.log('\n🎉 L\'integrazione SimilarWeb è configurata correttamente!');
      
    } else {
      console.log('⚠️  Nessun dato ricevuto per il sito di test');
      console.log('💡 Prova con un altro URL o verifica la configurazione');
    }

  } catch (error) {
    console.error('❌ Errore durante il test:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.error || error.response.statusText}`);
      
      if (error.response.status === 401) {
        console.log('💡 Token non valido. Verifica il token Apify nel file .env');
      } else if (error.response.status === 402) {
        console.log('💡 Quota Apify esaurita. Verifica il tuo piano su apify.com');
      } else if (error.response.status === 429) {
        console.log('💡 Limite di rate raggiunto. Riprova tra qualche minuto');
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('   Timeout della richiesta (60s)');
      console.log('💡 L\'analisi SimilarWeb può richiedere più tempo. Riprova');
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

// Esegui il test se richiamato direttamente
if (require.main === module) {
  testSimilarWebIntegration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { testSimilarWebIntegration }; 
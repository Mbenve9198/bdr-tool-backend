const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const KnowledgeBase = require('../models/KnowledgeBase');
const EmailTemplate = require('../models/EmailTemplate');
const CallScript = require('../models/CallScript');
const Prospect = require('../models/Prospect');

// Connessione al database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sendcloud-bdr';

class SendCloudDataLoader {
  constructor() {
    this.stats = {
      knowledgeBase: 0,
      emailTemplates: 0,
      callScripts: 0,
      prospects: 0,
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

  async loadData(jsonFilePath) {
    console.log('🚀 Iniziando caricamento dati SendCloud...\n');
    
    try {
      // Leggi il file JSON
      const rawData = fs.readFileSync(jsonFilePath, 'utf8');
      const data = JSON.parse(rawData);
      
      console.log(`📄 Trovate ${data.length} pagine da analizzare\n`);

      // Processa ogni pagina
      for (let i = 0; i < data.length; i++) {
        const page = data[i];
        console.log(`[${i + 1}/${data.length}] Processando: ${page.url}`);
        
        await this.processPage(page);
      }

      // Stampa statistiche finali
      this.printStats();
      
    } catch (error) {
      console.error('❌ Errore caricamento dati:', error);
      this.stats.errors++;
    }
  }

  async processPage(page) {
    try {
      // Estrai contenuti di base
      const title = page.metadata?.title || 'Senza titolo';
      const description = page.metadata?.description || '';
      const content = page.text || '';
      const url = page.url;

      // Processa FAQ se presenti
      await this.processFAQs(page);

      // Processa contenuti principali
      await this.processMainContent(page);

      // Processa casi studio se presenti
      await this.processCaseStudies(page);

      // Processa video transcript se presente
      await this.processVideoTranscripts(page);

      // Processa funzionalità specifiche
      await this.processFeatures(page);

    } catch (error) {
      console.error(`❌ Errore processando ${page.url}:`, error);
      this.stats.errors++;
    }
  }

  async processFAQs(page) {
    const jsonLd = page.metadata?.jsonLd || [];
    
    for (const ld of jsonLd) {
      if (ld['@type'] === 'FAQPage' && ld.mainEntity) {
        for (const faq of ld.mainEntity) {
          if (faq['@type'] === 'Question') {
            const question = faq.name;
            const answer = faq.acceptedAnswer?.text || '';
            
            if (question && answer) {
              await this.createKnowledgeBaseItem({
                title: question,
                category: 'obiezioni-comuni',
                content: answer,
                tags: ['faq', 'domande-frequenti'],
                priority: 4,
                source: page.url
              });
            }
          }
        }
      }
    }
  }

  async processMainContent(page) {
    const title = page.metadata?.title || '';
    const description = page.metadata?.description || '';
    const content = page.text || '';
    
    // Identifica categoria basata sull'URL e contenuto
    let category = this.identifyCategory(page.url, content, title);
    
    if (content.length > 200 && category) {
      await this.createKnowledgeBaseItem({
        title: title,
        category: category,
        content: this.cleanContent(content),
        tags: this.extractTags(content, page.url),
        priority: this.calculatePriority(page.url, content),
        source: page.url
      });
    }
  }

  async processCaseStudies(page) {
    const content = page.text || '';
    
    // Cerca pattern di casi studio
    if (content.includes('caso di studio') || content.includes('case study') || 
        content.includes('Scopri come') || content.includes('Aumento del')) {
      
      // Estrai dati prospect dalle testimonianze
      const prospectMatches = content.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+([A-Za-z\s]+),\s*([A-Za-z\s]+)/g);
      
      if (prospectMatches) {
        for (const match of prospectMatches) {
          await this.createProspectFromTestimonial(match, page.url);
        }
      }
      
      // Crea knowledge base per il caso studio
      await this.createKnowledgeBaseItem({
        title: `Caso Studio: ${this.extractCaseStudyTitle(content)}`,
        category: 'casi-studio',
        content: this.extractCaseStudyContent(content),
        tags: ['caso-studio', 'successo', 'testimonianza'],
        priority: 5,
        source: page.url
      });
      
      // Crea script di chiamata basato sul caso studio
      await this.createCallScriptFromCaseStudy(content, page.url);
    }
  }

  async processVideoTranscripts(page) {
    const jsonLd = page.metadata?.jsonLd || [];
    
    for (const ld of jsonLd) {
      if (ld['@type'] === 'VideoObject' && ld.transcript) {
        const transcript = ld.transcript;
        const videoName = ld.name || 'Video Tutorial';
        
        // Crea knowledge base per funzionalità del video
        await this.createKnowledgeBaseItem({
          title: `Tutorial: ${videoName}`,
          category: 'funzionalità',
          content: this.processTranscript(transcript),
          tags: ['tutorial', 'video', 'pack-and-go'],
          priority: 4,
          source: page.url
        });
      }
    }
  }

  async processFeatures(page) {
    const content = page.text || '';
    const title = page.metadata?.title || '';
    
    // Identifica funzionalità specifiche
    const features = [
      {
        keywords: ['checkout', 'conversione', 'abbandono carrello'],
        category: 'funzionalità',
        title: 'Ottimizzazione Checkout'
      },
      {
        keywords: ['pack & go', 'pack and go', 'imballaggio'],
        category: 'funzionalità',
        title: 'Pack & Go - Sistema di Imballaggio'
      },
      {
        keywords: ['tracking', 'tracciamento', 'notifiche'],
        category: 'funzionalità',
        title: 'Sistema di Tracking Automatico'
      },
      {
        keywords: ['resi', 'return', 'portale resi'],
        category: 'funzionalità',
        title: 'Gestione Resi Automatizzata'
      },
      {
        keywords: ['corrieri', 'carriers', 'spedizione'],
        category: 'tariffe-corrieri',
        title: 'Rete Corrieri SendCloud'
      }
    ];

    for (const feature of features) {
      if (feature.keywords.some(keyword => 
        content.toLowerCase().includes(keyword) || title.toLowerCase().includes(keyword)
      )) {
        const featureContent = this.extractFeatureContent(content, feature.keywords);
        
        if (featureContent.length > 100) {
          await this.createKnowledgeBaseItem({
            title: feature.title,
            category: feature.category,
            content: featureContent,
            tags: feature.keywords,
            priority: 4,
            source: page.url
          });
        }
      }
    }
  }

  async createKnowledgeBaseItem(data) {
    try {
      // Controlla se esiste già
      const existing = await KnowledgeBase.findOne({ 
        title: data.title,
        source: data.source 
      });
      
      if (existing) {
        console.log(`⚠️  KB già esistente: ${data.title}`);
        return;
      }

      const kbItem = new KnowledgeBase({
        title: data.title,
        category: data.category,
        content: data.content,
        tags: data.tags || [],
        priority: data.priority || 3,
        isActive: true,
        createdBy: 'sendcloud-import',
        source: data.source
      });

      await kbItem.save();
      this.stats.knowledgeBase++;
      console.log(`✅ KB creato: ${data.title}`);
      
    } catch (error) {
      console.error(`❌ Errore creando KB "${data.title}":`, error.message);
      this.stats.errors++;
    }
  }

  async createProspectFromTestimonial(testimonialText, sourceUrl) {
    try {
      // Estrai informazioni dal testo della testimonianza
      const nameMatch = testimonialText.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/);
      const roleMatch = testimonialText.match(/(CEO|Manager|Founder|Director|Coordinatore)/i);
      const companyMatch = testimonialText.match(/,\s*([A-Za-z\s]+)$/);
      
      if (nameMatch && companyMatch) {
        const name = nameMatch[1];
        const company = companyMatch[1].trim();
        const role = roleMatch ? roleMatch[1] : 'Decision Maker';
        
        const existing = await Prospect.findOne({ 
          companyName: company,
          'contact.name': name 
        });
        
        if (existing) return;

        const prospect = new Prospect({
          companyName: company,
          website: this.guessWebsiteFromCompany(company),
          industry: 'E-commerce',
          contact: {
            name: name,
            role: role
          },
          score: 85, // Alto perché sono clienti esistenti
          notes: `Cliente SendCloud esistente - Fonte: ${sourceUrl}`,
          source: 'sendcloud-testimonial'
        });

        await prospect.save();
        this.stats.prospects++;
        console.log(`✅ Prospect creato: ${name} - ${company}`);
      }
      
    } catch (error) {
      console.error(`❌ Errore creando prospect:`, error.message);
      this.stats.errors++;
    }
  }

  async createCallScriptFromCaseStudy(content, sourceUrl) {
    try {
      const caseStudyTitle = this.extractCaseStudyTitle(content);
      const benefits = this.extractBenefits(content);
      const metrics = this.extractMetrics(content);
      
      if (benefits.length > 0 || metrics.length > 0) {
        const script = this.generateCallScript(caseStudyTitle, benefits, metrics);
        
        const callScript = new CallScript({
          title: `Script: ${caseStudyTitle}`,
          industry: 'E-commerce',
          objective: 'presentazione-benefici',
          script: script,
          tags: ['caso-studio', 'benefici', 'risultati'],
          isActive: true,
          createdBy: 'sendcloud-import',
          source: sourceUrl
        });

        await callScript.save();
        this.stats.callScripts++;
        console.log(`✅ Call Script creato: ${caseStudyTitle}`);
      }
      
    } catch (error) {
      console.error(`❌ Errore creando call script:`, error.message);
      this.stats.errors++;
    }
  }

  // Metodi di utilità
  identifyCategory(url, content, title) {
    const patterns = [
      { pattern: /integrazione|integration/i, category: 'integrations' },
      { pattern: /prezzo|pricing|costo/i, category: 'prezzi' },
      { pattern: /corrieri|carriers|spedizione/i, category: 'tariffe-corrieri' },
      { pattern: /checkout|conversione/i, category: 'funzionalità' },
      { pattern: /tracking|tracciamento/i, category: 'funzionalità' },
      { pattern: /resi|return/i, category: 'funzionalità' },
      { pattern: /caso.*studio|case.*study/i, category: 'casi-studio' },
      { pattern: /competitor|concorrenza/i, category: 'competitor' },
      { pattern: /benefici|vantaggi|benefit/i, category: 'benefici' },
      { pattern: /problema|pain.*point|sfida/i, category: 'pain-points' }
    ];

    const text = `${url} ${content} ${title}`.toLowerCase();
    
    for (const { pattern, category } of patterns) {
      if (pattern.test(text)) {
        return category;
      }
    }
    
    return 'funzionalità'; // Default
  }

  extractTags(content, url) {
    const tags = [];
    const tagPatterns = [
      { pattern: /e-commerce|ecommerce/gi, tag: 'ecommerce' },
      { pattern: /automation|automazione/gi, tag: 'automazione' },
      { pattern: /api/gi, tag: 'api' },
      { pattern: /international|internazionale/gi, tag: 'internazionale' },
      { pattern: /b2c|b2b/gi, tag: 'business' },
      { pattern: /marketplace/gi, tag: 'marketplace' },
      { pattern: /fulfillment/gi, tag: 'fulfillment' }
    ];

    for (const { pattern, tag } of tagPatterns) {
      if (pattern.test(content)) {
        tags.push(tag);
      }
    }

    // Aggiungi tag basati sull'URL
    if (url.includes('shopify')) tags.push('shopify');
    if (url.includes('magento')) tags.push('magento');
    if (url.includes('woocommerce')) tags.push('woocommerce');

    return [...new Set(tags)]; // Rimuovi duplicati
  }

  calculatePriority(url, content) {
    let priority = 3; // Default

    // Aumenta priorità per pagine importanti
    if (url.includes('/it/') && !url.includes('/blog/')) priority += 1;
    if (content.includes('caso di studio')) priority += 1;
    if (content.includes('FAQ')) priority += 1;
    if (content.length > 2000) priority += 1;

    return Math.min(priority, 5);
  }

  cleanContent(content) {
    return content
      .replace(/\n{3,}/g, '\n\n') // Riduci newline multipli
      .replace(/\s{2,}/g, ' ') // Riduci spazi multipli
      .replace(/\[.*?\]\(.*?\)/g, '') // Rimuovi link markdown
      .trim()
      .substring(0, 2000); // Limita lunghezza
  }

  extractCaseStudyTitle(content) {
    const titleMatches = content.match(/Scopri come ([^.]+)/i) ||
                        content.match(/Caso di studio[:\s]+([^.\n]+)/i) ||
                        content.match(/([A-Za-z\s]+) ha (aumentato|migliorato|ottenuto)/i);
    
    return titleMatches ? titleMatches[1].trim() : 'Cliente SendCloud';
  }

  extractBenefits(content) {
    const benefits = [];
    const benefitPatterns = [
      /risparmio[^.]*(\d+%)[^.]*/gi,
      /aumento[^.]*(\d+%)[^.]*/gi,
      /riduzione[^.]*(\d+%)[^.]*/gi,
      /miglioramento[^.]*[.]*/gi
    ];

    for (const pattern of benefitPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        benefits.push(...matches.map(m => m.trim()));
      }
    }

    return benefits;
  }

  extractMetrics(content) {
    const metrics = [];
    const metricPattern = /(\d+(?:[.,]\d+)?)\s*(%|€|ordini|pacchi|paesi)/gi;
    const matches = content.matchAll(metricPattern);
    
    for (const match of matches) {
      metrics.push(match[0]);
    }

    return metrics;
  }

  generateCallScript(title, benefits, metrics) {
    let script = `**Apertura:**\n`;
    script += `Ciao [Nome], sono [Tuo Nome] di SendCloud. Ti chiamo perché ho visto che [Azienda] opera nel settore e-commerce e volevo condividere con te come abbiamo aiutato ${title} a ottenere risultati straordinari.\n\n`;
    
    script += `**Caso di Successo:**\n`;
    script += `${title} ha implementato la nostra piattaforma e ha ottenuto:\n`;
    
    if (benefits.length > 0) {
      script += benefits.map(b => `• ${b}`).join('\n');
      script += '\n\n';
    }
    
    if (metrics.length > 0) {
      script += `**Risultati misurabili:**\n`;
      script += metrics.map(m => `• ${m}`).join('\n');
      script += '\n\n';
    }
    
    script += `**Domanda di qualificazione:**\n`;
    script += `Attualmente come gestite le spedizioni? Avete mai avuto problemi con [specifico pain point]?\n\n`;
    
    script += `**Proposta:**\n`;
    script += `Possiamo organizzare una demo di 15 minuti per mostrarti esattamente come potremmo aiutare anche [Azienda] a ottenere risultati simili?`;

    return script;
  }

  extractFeatureContent(content, keywords) {
    // Trova il paragrafo più rilevante per la funzionalità
    const sentences = content.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => 
      keywords.some(keyword => sentence.toLowerCase().includes(keyword))
    );
    
    return relevantSentences.slice(0, 3).join('. ').trim();
  }

  processTranscript(transcript) {
    // Estrai i punti chiave dal transcript
    const keyPoints = transcript
      .split(/[.!?]+/)
      .filter(sentence => sentence.length > 30)
      .map(sentence => sentence.trim())
      .slice(0, 10) // Prime 10 frasi importanti
      .join('. ');
    
    return keyPoints;
  }

  guessWebsiteFromCompany(companyName) {
    const clean = companyName.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/ltd|spa|srl|inc|corp|company/g, '');
    
    return `https://www.${clean}.com`;
  }

  printStats() {
    console.log('\n📊 STATISTICHE CARICAMENTO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📚 Knowledge Base: ${this.stats.knowledgeBase}`);
    console.log(`📧 Email Templates: ${this.stats.emailTemplates}`);
    console.log(`📞 Call Scripts: ${this.stats.callScripts}`);
    console.log(`🎯 Prospects: ${this.stats.prospects}`);
    console.log(`❌ Errori: ${this.stats.errors}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Totale elementi creati: ${
      this.stats.knowledgeBase + 
      this.stats.emailTemplates + 
      this.stats.callScripts + 
      this.stats.prospects
    }`);
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('🔌 Disconnesso da MongoDB');
  }
}

// Esecuzione script
async function main() {
  const loader = new SendCloudDataLoader();
  
  try {
    await loader.connect();
    
    // Path del file JSON
    const jsonFile = process.argv[2] || './dataset_website-content-crawler_2025-05-08_14-47-39-097 (1).json';
    
    if (!fs.existsSync(jsonFile)) {
      console.error(`❌ File non trovato: ${jsonFile}`);
      process.exit(1);
    }
    
    await loader.loadData(jsonFile);
    
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

module.exports = SendCloudDataLoader; 
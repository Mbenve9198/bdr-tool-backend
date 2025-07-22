const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const KnowledgeBase = require('../models/KnowledgeBase');
const Prospect = require('../models/Prospect');
const CallScript = require('../models/CallScript');
const EmailTemplate = require('../models/EmailTemplate');

async function setupDatabase() {
  try {
    // Connetti a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connesso a MongoDB');

    // Pulisci database esistente (solo per setup iniziale)
    await KnowledgeBase.deleteMany({});
    await Prospect.deleteMany({});
    await CallScript.deleteMany({});
    await EmailTemplate.deleteMany({});
    console.log('🧹 Database pulito');

    // Popola Knowledge Base
    await populateKnowledgeBase();
    console.log('📚 Knowledge Base popolata');

    // Popola Script di chiamata
    await populateCallScripts();
    console.log('📞 Script di chiamata creati');

    // Popola Template Email
    await populateEmailTemplates();
    console.log('📧 Template email creati');

    // Crea prospect di esempio
    await createSampleProspects();
    console.log('🎯 Prospect di esempio creati');

    console.log('🎉 Setup completato con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante setup:', error);
  } finally {
    await mongoose.disconnect();
  }
}

async function populateKnowledgeBase() {
  const knowledgeItems = [
    // Funzionalità SendCloud
    {
      title: 'Integrazione Multi-Carrier',
      category: 'funzionalità',
      content: 'SendCloud si integra con oltre 80 corrieri in Europa, permettendo di gestire tutte le spedizioni da un\'unica piattaforma. Include DHL, UPS, FedEx, PostNL, GLS e molti altri.',
      tags: ['integrazione', 'corrieri', 'europa'],
      priority: 5
    },
    {
      title: 'Automazione Stampa Etichette',
      category: 'funzionalità',
      content: 'Stampa automatica di etichette di spedizione con codici a barre, indirizzi precompilati e documenti doganali. Riduce errori e tempo di processamento del 70%.',
      tags: ['automazione', 'etichette', 'efficienza'],
      priority: 4
    },
    {
      title: 'Tracking Real-time',
      category: 'funzionalità',
      content: 'Tracking in tempo reale di tutte le spedizioni con notifiche automatiche ai clienti. Dashboard centralizzata per monitorare status di consegna.',
      tags: ['tracking', 'monitoraggio', 'customer-experience'],
      priority: 4
    },

    // Benefici
    {
      title: 'Riduzione Costi di Spedizione',
      category: 'benefici',
      content: 'I nostri clienti risparmiano in media il 20-30% sui costi di spedizione grazie alle tariffe negoziate e alla selezione automatica del corriere più conveniente.',
      tags: ['risparmio', 'costi', 'roi'],
      priority: 5
    },
    {
      title: 'Miglioramento Customer Experience',
      category: 'benefici',
      content: 'Email di tracking automatiche, pagina di tracking personalizzabile e gestione semplificata dei resi migliorano la soddisfazione cliente del 40%.',
      tags: ['customer-experience', 'soddisfazione', 'tracking'],
      priority: 4
    },
    {
      title: 'Risparmio di Tempo',
      category: 'benefici',
      content: 'Automazione del processo di spedizione fa risparmiare fino a 5 ore a settimana per ogni operatore, che può concentrarsi su attività a maggior valore.',
      tags: ['tempo', 'automazione', 'produttività'],
      priority: 4
    },

    // Pain Points che risolviamo
    {
      title: 'Gestione Manuale delle Spedizioni',
      category: 'pain-points',
      content: 'Molte aziende perdono tempo prezioso nella gestione manuale di etichette, tracking e comunicazioni cliente. SendCloud automatizza tutto il processo.',
      tags: ['manuale', 'inefficienza', 'tempo'],
      priority: 5
    },
    {
      title: 'Costi di Spedizione Elevati',
      category: 'pain-points',
      content: 'Senza tariffe negoziate, le aziende pagano prezzi al dettaglio per le spedizioni. SendCloud offre accesso a tariffe wholesale.',
      tags: ['costi', 'tariffe', 'risparmio'],
      priority: 5
    },
    {
      title: 'Mancanza di Visibilità',
      category: 'pain-points',
      content: 'Impossibilità di tracciare le spedizioni in tempo reale causa problemi di customer service e perdita di fiducia dei clienti.',
      tags: ['visibilità', 'tracking', 'customer-service'],
      priority: 4
    },

    // Tariffe Corrieri
    {
      title: 'Tariffe DHL Express Europa',
      category: 'tariffe-corrieri',
      content: 'Spedizioni espresse in Europa: pacchi fino a 2kg €12.50, fino a 5kg €18.90, fino a 10kg €24.50. Consegna garantita in 1-2 giorni lavorativi.',
      tags: ['dhl', 'express', 'europa'],
      priority: 4,
      carrierInfo: {
        name: 'DHL Express',
        services: [
          { service: 'Express 12:00', price: 24.50, conditions: 'Consegna entro le 12:00' },
          { service: 'Express Worldwide', price: 18.90, conditions: 'Consegna in 1-3 giorni' }
        ]
      }
    },
    {
      title: 'Tariffe UPS Standard',
      category: 'tariffe-corrieri',
      content: 'Spedizioni standard UPS: fino a 2kg €8.90, fino a 5kg €12.50, fino a 10kg €16.80. Servizio affidabile per spedizioni non urgenti.',
      tags: ['ups', 'standard', 'economico'],
      priority: 3,
      carrierInfo: {
        name: 'UPS',
        services: [
          { service: 'UPS Standard', price: 8.90, conditions: 'Consegna in 2-5 giorni' },
          { service: 'UPS Express', price: 16.80, conditions: 'Consegna in 1-2 giorni' }
        ]
      }
    },

    // Obiezioni Comuni
    {
      title: 'Obiezione: "I nostri volumi sono troppo bassi"',
      category: 'obiezioni-comuni',
      content: 'SendCloud è perfetto anche per piccoli volumi. Non ci sono minimi mensili e si paga solo per le spedizioni effettuate. Molti clienti iniziano con 10-20 spedizioni al mese.',
      tags: ['volumi', 'piccole-aziende', 'flessibilità'],
      priority: 5
    },
    {
      title: 'Obiezione: "Abbiamo già un contratto con un corriere"',
      category: 'obiezioni-comuni',
      content: 'SendCloud si integra anche con contratti esistenti. Potete mantenere il vostro corriere principale e aggiungere altri per diversificare e confrontare prezzi.',
      tags: ['contratti', 'integrazione', 'flessibilità'],
      priority: 4
    },
    {
      title: 'Obiezione: "È troppo complicato cambiare sistema"',
      category: 'obiezioni-comuni',
      content: 'L\'integrazione è semplice e veloce. Il nostro team vi segue passo-passo e in 1-2 settimane siete operativi. Molti clienti vedono risultati dalla prima settimana.',
      tags: ['integrazione', 'supporto', 'facilità'],
      priority: 4
    }
  ];

  await KnowledgeBase.insertMany(knowledgeItems);
}

async function populateCallScripts() {
  const scripts = [
    {
      title: 'Cold Call E-commerce Standard',
      type: 'cold-call',
      industry: 'E-commerce',
      prospectSize: 'media',
      structure: {
        opener: 'Ciao {{contactName}}, sono [Nome] di SendCloud. Ho visto che {{companyName}} ha un ottimo e-commerce nel settore {{industry}}.',
        hook: 'La ragione della mia chiamata è che aiutiamo e-commerce come il vostro a ridurre i costi di spedizione del 20-30% e migliorare l\'esperienza cliente.',
        valueProposition: 'Con SendCloud gestite tutte le spedizioni da un\'unica piattaforma, con oltre 80 corrieri integrati e tracking automatico per i vostri clienti.',
        questions: [
          {
            question: 'Quante spedizioni fate mediamente al mese?',
            purpose: 'Qualificare volume',
            followUp: 'Capisco, e attualmente come gestite il processo di spedizione?'
          },
          {
            question: 'Quali sono le principali sfide che avete con le spedizioni attuali?',
            purpose: 'Identificare pain points',
            followUp: 'Questo è esattamente quello che risolviamo per i nostri clienti...'
          }
        ],
        objectionHandling: [
          {
            objection: 'Non abbiamo tempo per cambiare sistema',
            response: 'Capisco perfettamente. L\'integrazione richiede solo 1-2 settimane e il nostro team vi segue passo-passo.',
            rebuttal: 'Molti clienti ci dicono che il tempo investito nell\'integrazione viene recuperato in pochi giorni grazie all\'automazione.'
          }
        ],
        closing: 'Possiamo organizzare una demo di 15 minuti dove vi mostro esattamente come funziona? Quando sarebbe meglio per voi, domattina o nel pomeriggio?',
        nextSteps: 'Perfetto, vi mando il link per la demo e alcune informazioni sui nostri clienti nel vostro settore.'
      },
      isActive: true,
      createdBy: 'admin'
    },
    {
      title: 'Follow-up Post Demo',
      type: 'follow-up',
      structure: {
        opener: 'Ciao {{contactName}}, spero tutto bene. Ti scrivo per seguire la demo di SendCloud che abbiamo fatto la settimana scorsa.',
        hook: 'Durante la demo hai mostrato interesse per l\'automazione delle etichette e il tracking automatico.',
        valueProposition: 'Come discusso, possiamo aiutarvi a risparmiare circa €2000 al mese sui costi di spedizione e 10 ore settimanali di lavoro manuale.',
        questions: [
          {
            question: 'Hai avuto modo di discuterne con il team?',
            purpose: 'Verificare processo decisionale',
            followUp: 'Ci sono altre persone che dovrebbero essere coinvolte nella decisione?'
          }
        ],
        closing: 'Possiamo procedere con un piano di implementazione graduale. Inizieresti con una parte delle spedizioni per testare il sistema?'
      },
      isActive: true
    }
  ];

  await CallScript.insertMany(scripts);
}

async function populateEmailTemplates() {
  const templates = [
    {
      name: 'Cold Outreach E-commerce',
      type: 'cold-outreach',
      subject: '{{companyName}} - Ridurre i costi di spedizione del 30%',
      content: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Ciao {{contactName}},</h2>
            
            <p>Ho visto che {{companyName}} ha un ottimo e-commerce nel settore {{industry}}.</p>
            
            <p>Ti scrivo perché aiutiamo e-commerce come il vostro a:</p>
            <ul>
              <li>✅ <strong>Ridurre i costi di spedizione del 20-30%</strong></li>
              <li>✅ <strong>Automatizzare completamente il processo</strong></li>
              <li>✅ <strong>Migliorare l'esperienza cliente</strong></li>
            </ul>
            
            <p>SendCloud si integra con il vostro e-commerce e gestisce automaticamente:</p>
            <ul>
              <li>Stampa etichette</li>
              <li>Tracking e notifiche cliente</li>
              <li>Gestione resi</li>
              <li>Selezione corriere più conveniente</li>
            </ul>
            
            <p><strong>Risultati tipici dei nostri clienti:</strong></p>
            <ul>
              <li>20-30% risparmio sui costi</li>
              <li>5 ore/settimana risparmiate</li>
              <li>40% miglioramento customer satisfaction</li>
            </ul>
            
            <p>Ti andrebbe di vedere una demo di 15 minuti per capire come funziona?</p>
            
            <p>Rispondimi con un orario che preferisci e organizziamo tutto.</p>
            
            <p>Buona giornata!<br>
            [Nome Firima]<br>
            SendCloud</p>
          </div>
        `,
        text: 'Versione testuale dell\'email...'
      },
      targetAudience: {
        industry: ['E-commerce', 'Retail', 'Fashion'],
        companySize: ['piccola', 'media'],
        role: ['CEO', 'Operations Manager', 'E-commerce Manager']
      },
      isActive: true,
      isApproved: true,
      createdBy: 'admin'
    },
    {
      name: 'Offerta Commerciale con Tariffe',
      type: 'offer',
      subject: 'Proposta tariffe personalizzata per {{companyName}}',
      content: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Proposta personalizzata per {{companyName}}</h2>
            
            <p>Ciao {{contactName}},</p>
            
            <p>Come promesso, ecco la proposta personalizzata per ottimizzare le spedizioni di {{companyName}}.</p>
            
            <h3>💰 Risparmio stimato mensile: €2,500</h3>
            
            <h3>📦 Tariffe negoziate per voi:</h3>
            {{shippingRates}}
            
            <h3>🚀 Cosa include SendCloud:</h3>
            <ul>
              <li>Integrazione con il vostro e-commerce</li>
              <li>Accesso a 80+ corrieri</li>
              <li>Stampa automatica etichette</li>
              <li>Tracking real-time</li>
              <li>Portal personalizzato per i clienti</li>
              <li>Gestione resi automatizzata</li>
              <li>Support dedicato</li>
            </ul>
            
            <h3>⏰ Timeline implementazione:</h3>
            <ul>
              <li>Settimana 1: Setup e integrazione</li>
              <li>Settimana 2: Test e go-live</li>
              <li>Settimana 3: Ottimizzazione e training</li>
            </ul>
            
            <p><strong>Prossimi passi:</strong></p>
            <p>Possiamo organizzare una call per discutere i dettagli e rispondere a eventuali domande?</p>
            
            <p>La proposta è valida fino al {{currentDate | add:30}} giorni.</p>
            
            <p>Resto a disposizione!<br>
            [Nome Firma]</p>
          </div>
        `
      },
      isActive: true,
      isApproved: true
    }
  ];

  await EmailTemplate.insertMany(templates);
}

async function createSampleProspects() {
  const prospects = [
    {
      companyName: 'FashionStore Milano',
      website: 'https://fashionstore.it',
      industry: 'Fashion E-commerce',
      size: 'media',
      contact: {
        name: 'Marco Rossi',
        role: 'E-commerce Manager',
        email: 'marco@fashionstore.it',
        phone: '+39 02 1234567'
      },
      businessInfo: {
        monthlyShipments: 500,
        averageOrderValue: 85,
        currentShippingCosts: 3500,
        mainDestinations: ['Italia', 'Francia', 'Germania'],
        currentCarriers: ['Poste Italiane', 'BRT'],
        painPoints: ['Costi elevati', 'Tracking limitato'],
        priorities: ['Riduzione costi', 'Miglioramento customer experience']
      },
      status: 'nuovo',
      assignedTo: {
        bdrName: 'Laura Bianchi',
        assignedDate: new Date()
      }
    },
    {
      companyName: 'TechGadgets Online',
      website: 'https://techgadgets.com',
      industry: 'Electronics E-commerce',
      size: 'piccola',
      contact: {
        name: 'Andrea Verdi',
        role: 'CEO',
        email: 'andrea@techgadgets.com'
      },
      businessInfo: {
        monthlyShipments: 200,
        averageOrderValue: 150,
        currentShippingCosts: 1800,
        mainDestinations: ['Italia', 'Spagna'],
        currentCarriers: ['DHL'],
        painPoints: ['Gestione manuale', 'Resi complicati']
      },
      status: 'contattato',
      interactions: [
        {
          type: 'call',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          notes: 'Prima chiamata, interessato ma vuole valutare',
          outcome: 'positive',
          bdrName: 'Marco Neri'
        }
      ]
    }
  ];

  for (let prospect of prospects) {
    const newProspect = new Prospect(prospect);
    newProspect.calculateScore();
    await newProspect.save();
  }
}

// Esegui setup se chiamato direttamente
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase }; 
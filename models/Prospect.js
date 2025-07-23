const mongoose = require('mongoose');

const prospectSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  website: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\//.test(v);
      },
      message: 'URL deve iniziare con http:// o https://'
    }
  },
  industry: {
    type: String,
    trim: true
  },
  size: {
    type: String,
    enum: ['startup', 'piccola', 'media', 'grande', 'enterprise'],
    default: 'media'
  },
  contact: {
    name: String,
    role: String,
    email: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /\S+@\S+\.\S+/.test(v);
        },
        message: 'Email non valida'
      }
    },
    phone: String,
    linkedin: String
  },
  // Informazioni di business
  businessInfo: {
    monthlyShipments: Number,
    averageOrderValue: Number,
    currentShippingCosts: Number,
    mainDestinations: [String],
    currentCarriers: [String],
    painPoints: [String],
    priorities: [String],
    // Campi aggiunti per analisi SimilarWeb
    estimatedMonthlyRevenue: Number,
    conversionRate: Number,
    monthlyOrders: Number,
    estimatedMonthlyVisits: Number
  },
  // Analisi automatica del sito web
  websiteAnalysis: {
    isEcommerce: Boolean,
    platform: String, // Shopify, WooCommerce, Magento, etc.
    features: [String],
    integrations: [String],
    analysisDate: Date,
    analysisData: mongoose.Schema.Types.Mixed
  },
  // Storico interazioni
  interactions: [{
    type: {
      type: String,
      enum: ['email', 'call', 'meeting', 'demo', 'follow-up'],
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    notes: String,
    outcome: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'no-response']
    },
    nextAction: String,
    bdrName: String
  }],
  // Status del prospect
  status: {
    type: String,
    enum: ['nuovo', 'contattato', 'interessato', 'qualificato', 'proposta', 'chiuso-vinto', 'chiuso-perso'],
    default: 'nuovo'
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  // Assegnazione
  assignedTo: {
    bdrName: String,
    assignedDate: Date
  },
  // Note e tag
  notes: String,
  tags: [String],
  // Flag
  isActive: {
    type: Boolean,
    default: true
  },
  lastContactDate: Date,
  nextFollowUp: Date,
  source: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indici
prospectSchema.index({ companyName: 1 });
prospectSchema.index({ status: 1, isActive: 1 });
prospectSchema.index({ 'assignedTo.bdrName': 1 });
prospectSchema.index({ score: -1 });
prospectSchema.index({ nextFollowUp: 1 });

// Metodo per calcolare il punteggio automaticamente
prospectSchema.methods.calculateScore = function() {
  let score = 50; // Base score
  
  // Bonus per informazioni complete
  if (this.contact.email) score += 10;
  if (this.contact.phone) score += 10;
  if (this.businessInfo.monthlyShipments) score += 15;
  if (this.website) score += 5;
  
  // Bonus basato sulla dimensione dell'azienda
  const sizeBonus = {
    'startup': 5,
    'piccola': 10,
    'media': 15,
    'grande': 20,
    'enterprise': 25
  };
  score += sizeBonus[this.size] || 0;
  
  // Bonus per interazioni positive
  const positiveInteractions = this.interactions.filter(i => i.outcome === 'positive').length;
  score += positiveInteractions * 5;
  
  // Penalità per interazioni negative
  const negativeInteractions = this.interactions.filter(i => i.outcome === 'negative').length;
  score -= negativeInteractions * 10;
  
  this.score = Math.max(0, Math.min(100, score));
  return this.score;
};

// Metodo per aggiungere interazione
prospectSchema.methods.addInteraction = function(interactionData) {
  this.interactions.push(interactionData);
  this.lastContactDate = new Date();
  this.calculateScore();
  return this.save();
};

module.exports = mongoose.model('Prospect', prospectSchema); 
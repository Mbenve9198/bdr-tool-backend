const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'funzionalità',
      'benefici',
      'pain-points',
      'tariffe-corrieri',
      'casi-studio',
      'competitor',
      'obiezioni-comuni',
      'integrations',
      'prezzi'
    ]
  },
  content: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    default: 'admin'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    trim: true
  },
  // Informazioni specifiche per le tariffe
  carrierInfo: {
    name: String,
    services: [{
      service: String,
      price: Number,
      currency: {
        type: String,
        default: 'EUR'
      },
      conditions: String
    }],
    zones: [{
      zone: String,
      countries: [String],
      basePrice: Number,
      weightMultiplier: Number
    }]
  },
  // Metriche di utilizzo
  usage: {
    views: {
      type: Number,
      default: 0
    },
    usedInScripts: {
      type: Number,
      default: 0
    },
    lastUsed: Date
  }
}, {
  timestamps: true
});

// Indici per migliorare le performance
knowledgeBaseSchema.index({ category: 1, isActive: 1 });
knowledgeBaseSchema.index({ tags: 1 });
knowledgeBaseSchema.index({ 'carrierInfo.name': 1 });
knowledgeBaseSchema.index({ title: 'text', content: 'text' });

// Middleware per aggiornare lastUpdated
knowledgeBaseSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Metodi per incrementare l'utilizzo
knowledgeBaseSchema.methods.incrementViews = function() {
  this.usage.views += 1;
  this.usage.lastUsed = new Date();
  return this.save();
};

knowledgeBaseSchema.methods.incrementScriptUsage = function() {
  this.usage.usedInScripts += 1;
  this.usage.lastUsed = new Date();
  return this.save();
};

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema); 
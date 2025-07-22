const mongoose = require('mongoose');

const callScriptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['cold-call', 'follow-up', 'demo', 'objection-handling', 'closing'],
    required: true
  },
  industry: {
    type: String,
    trim: true
  },
  prospectSize: {
    type: String,
    enum: ['startup', 'piccola', 'media', 'grande', 'enterprise']
  },
  // Struttura dello script
  structure: {
    opener: {
      type: String,
      required: true
    },
    hook: {
      type: String,
      required: true
    },
    valueProposition: {
      type: String,
      required: true
    },
    questions: [{
      question: String,
      purpose: String,
      followUp: String
    }],
    objectionHandling: [{
      objection: String,
      response: String,
      rebuttal: String
    }],
    closing: {
      type: String,
      required: true
    },
    nextSteps: String
  },
  // Personalizzazione dinamica
  variables: [{
    name: String,
    description: String,
    required: Boolean,
    defaultValue: String
  }],
  // Dati di performance
  performance: {
    timesUsed: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageCallDuration: Number,
    conversionsToMeeting: {
      type: Number,
      default: 0
    },
    lastUsed: Date
  },
  // Configurazione
  isActive: {
    type: Boolean,
    default: true
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  createdBy: String,
  tags: [String],
  // Integrazioni knowledge base
  relatedKnowledge: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase'
  }],
  notes: String
}, {
  timestamps: true
});

// Indici
callScriptSchema.index({ type: 1, isActive: 1 });
callScriptSchema.index({ industry: 1 });
callScriptSchema.index({ 'performance.successRate': -1 });
callScriptSchema.index({ tags: 1 });

// Metodo per incrementare l'utilizzo
callScriptSchema.methods.recordUsage = function(outcome) {
  this.performance.timesUsed += 1;
  this.performance.lastUsed = new Date();
  
  if (outcome === 'meeting-scheduled') {
    this.performance.conversionsToMeeting += 1;
  }
  
  // Ricalcola success rate
  if (this.performance.timesUsed > 0) {
    this.performance.successRate = 
      (this.performance.conversionsToMeeting / this.performance.timesUsed) * 100;
  }
  
  return this.save();
};

// Metodo per personalizzare lo script
callScriptSchema.methods.personalize = function(prospectData, variableValues = {}) {
  let personalizedScript = {
    opener: this.structure.opener,
    hook: this.structure.hook,
    valueProposition: this.structure.valueProposition,
    closing: this.structure.closing
  };
  
  // Sostituisci variabili con dati prospect
  const replacements = {
    '{{companyName}}': prospectData.companyName || '[Nome Azienda]',
    '{{contactName}}': prospectData.contact?.name || '[Nome Contatto]',
    '{{industry}}': prospectData.industry || '[Settore]',
    '{{website}}': prospectData.website || '[Sito Web]',
    ...variableValues
  };
  
  // Applica sostituzioni
  Object.keys(personalizedScript).forEach(key => {
    Object.keys(replacements).forEach(variable => {
      personalizedScript[key] = personalizedScript[key]?.replace(
        new RegExp(variable, 'g'), 
        replacements[variable]
      );
    });
  });
  
  return personalizedScript;
};

module.exports = mongoose.model('CallScript', callScriptSchema); 
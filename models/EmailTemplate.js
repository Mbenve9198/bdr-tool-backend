const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['cold-outreach', 'follow-up', 'offer', 'proposal', 'demo-invitation', 'thank-you'],
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  content: {
    html: {
      type: String,
      required: true
    },
    text: String
  },
  // Configurazione target
  targetAudience: {
    industry: [String],
    companySize: [String],
    role: [String]
  },
  // Variabili personalizzabili
  variables: [{
    name: String,
    description: String,
    required: Boolean,
    defaultValue: String,
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'url', 'currency'],
      default: 'text'
    }
  }],
  // Allegati e risorse
  attachments: [{
    name: String,
    description: String,
    url: String,
    type: String // 'pdf', 'doc', 'image', etc.
  }],
  // Integrazione con knowledge base
  includedRates: [{
    carrierId: mongoose.Schema.Types.ObjectId,
    services: [String],
    dynamicPricing: Boolean
  }],
  relatedKnowledge: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase'
  }],
  // Metriche performance
  performance: {
    sent: {
      type: Number,
      default: 0
    },
    opened: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Number,
      default: 0
    },
    replied: {
      type: Number,
      default: 0
    },
    meetings: {
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
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: String,
  approvalDate: Date,
  createdBy: String,
  tags: [String],
  notes: String,
  // A/B Testing
  variations: [{
    name: String,
    subject: String,
    content: {
      html: String,
      text: String
    },
    performance: {
      sent: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      replied: { type: Number, default: 0 }
    }
  }]
}, {
  timestamps: true
});

// Indici
emailTemplateSchema.index({ type: 1, isActive: 1 });
emailTemplateSchema.index({ 'targetAudience.industry': 1 });
emailTemplateSchema.index({ 'performance.replied': -1 });
emailTemplateSchema.index({ tags: 1 });

// Virtual per calcolare metriche
emailTemplateSchema.virtual('metrics').get(function() {
  const { sent, opened, clicked, replied, meetings } = this.performance;
  
  return {
    openRate: sent > 0 ? (opened / sent * 100).toFixed(2) : 0,
    clickRate: opened > 0 ? (clicked / opened * 100).toFixed(2) : 0,
    replyRate: sent > 0 ? (replied / sent * 100).toFixed(2) : 0,
    meetingRate: sent > 0 ? (meetings / sent * 100).toFixed(2) : 0,
    totalSent: sent
  };
});

// Metodo per personalizzare email
emailTemplateSchema.methods.personalize = function(prospectData, ratesData = {}, customVariables = {}) {
  const replacements = {
    '{{companyName}}': prospectData.companyName || '[Nome Azienda]',
    '{{contactName}}': prospectData.contact?.name || '[Nome Contatto]',
    '{{contactRole}}': prospectData.contact?.role || '[Ruolo]',
    '{{industry}}': prospectData.industry || '[Settore]',
    '{{website}}': prospectData.website || '[Sito Web]',
    '{{currentDate}}': new Date().toLocaleDateString('it-IT'),
    ...customVariables
  };
  
  // Aggiungi dati tariffe se disponibili
  if (ratesData.shippingRates) {
    replacements['{{shippingRates}}'] = this.formatRatesTable(ratesData.shippingRates);
  }
  
  // Personalizza subject e content
  let personalizedSubject = this.subject;
  let personalizedHtml = this.content.html;
  let personalizedText = this.content.text || '';
  
  // Applica sostituzioni
  Object.keys(replacements).forEach(variable => {
    const value = replacements[variable];
    personalizedSubject = personalizedSubject.replace(new RegExp(variable, 'g'), value);
    personalizedHtml = personalizedHtml.replace(new RegExp(variable, 'g'), value);
    personalizedText = personalizedText.replace(new RegExp(variable, 'g'), value);
  });
  
  return {
    subject: personalizedSubject,
    html: personalizedHtml,
    text: personalizedText,
    attachments: this.attachments
  };
};

// Metodo per formattare tabella tariffe
emailTemplateSchema.methods.formatRatesTable = function(rates) {
  if (!rates || !rates.length) return 'Tariffe disponibili su richiesta';
  
  let table = '<table style="border-collapse: collapse; width: 100%; margin: 20px 0;">';
  table += '<tr style="background-color: #f8f9fa;"><th style="border: 1px solid #ddd; padding: 12px;">Corriere</th><th style="border: 1px solid #ddd; padding: 12px;">Servizio</th><th style="border: 1px solid #ddd; padding: 12px;">Prezzo</th></tr>';
  
  rates.forEach(rate => {
    table += `<tr>
      <td style="border: 1px solid #ddd; padding: 12px;">${rate.carrier}</td>
      <td style="border: 1px solid #ddd; padding: 12px;">${rate.service}</td>
      <td style="border: 1px solid #ddd; padding: 12px;">${rate.price}€</td>
    </tr>`;
  });
  
  table += '</table>';
  return table;
};

// Metodo per tracciare performance
emailTemplateSchema.methods.trackEvent = function(event) {
  if (this.performance[event] !== undefined) {
    this.performance[event] += 1;
    this.performance.lastUsed = new Date();
    return this.save();
  }
};

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema); 
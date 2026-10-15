const mongoose = require('mongoose');

const riskResultSchema = new mongoose.Schema({
  label: { type: String, enum: ['Low', 'Moderate', 'High'] },
  score: Number,
  probabilities: {
    low: Number,
    moderate: Number,
    high: Number,
  },
  shap_explanation: [{
    feature: String,
    description: String,
    value: Number,
    impact: Number
  }]
}, { _id: false });

const shapFeatureSchema = new mongoose.Schema({
  feature: String,
  value: Number,
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  overallScore: { type: Number },
  scoringMode: { type: String, enum: ['ml_multimodal', 'clinical_fallback'], default: 'clinical_fallback' },
  crisis_flag: { type: Boolean, default: false },
  crisis_guidance: { type: mongoose.Schema.Types.Mixed },
  depression: riskResultSchema,
  anxiety: riskResultSchema,
  stress: riskResultSchema,
  insomnia: riskResultSchema,
  sleep: { type: mongoose.Schema.Types.Mixed },
  emotion: { type: mongoose.Schema.Types.Mixed },
  shapValues: {
    depression: [shapFeatureSchema],
    anxiety: [shapFeatureSchema],
    stress: [shapFeatureSchema],
    insomnia: [shapFeatureSchema],
  },
  formData: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

// Optimize patient history queries
assessmentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Assessment', assessmentSchema);

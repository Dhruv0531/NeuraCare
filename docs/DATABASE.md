# NeuraCare Database Architecture & MongoDB Schema

This document details the database architecture, schema definitions, indexes, relationships, and data storage design of NeuraCare.

---

## 1. Database Overview

NeuraCare uses **MongoDB**, a document-oriented NoSQL database, hosted on a **MongoDB Atlas Cloud M0 Cluster**. 

### Why MongoDB?
- **Flexible Clinical Documents**: Psychological assessments contain nested dimensions (probabilities, SHAP factor explanations, emotional multi-labels, and demographic forms) that vary depending on the instrument used. A document store naturally represents this structure without complex SQL joins.
- **High-Performance Time Series / History**: Longitudinal tracking requires rapidly appending evaluation records and fetching them sorted by timestamp.
- **Zero-Cost Cloud Tier**: MongoDB Atlas provides an **M0 Free Tier** (512 MB storage, shared RAM, zero hosting cost). Note that automated point-in-time backup snapshots require dedicated M10+ tiers, and inactive M0 clusters pause after 30–60 days of inactivity.

---

## 2. Schema Architecture & Collections

NeuraCare defines two primary Mongoose schemas: `User` and `Assessment`.

```
┌─────────────────────────────────┐
│              User               │
├─────────────────────────────────┤
│ _id: ObjectId                   │
│ name: String                    │
│ email: String (unique)          │
│ password: String (bcrypt hash)  │
│ role: 'user' | 'clinician'      │
│ createdAt: ISODate              │
│ updatedAt: ISODate              │
└────────────────┬────────────────┘
                 │ 1
                 │
                 │ has many
                 ▼ *
┌─────────────────────────────────┐
│           Assessment            │
├─────────────────────────────────┤
│ _id: ObjectId                   │
│ userId: ObjectId (ref: 'User')  │
│ overallScore: Number (0 - 100)  │
│ depression: RiskResultSubDoc    │
│ anxiety: RiskResultSubDoc       │
│ stress: RiskResultSubDoc        │
│ insomnia: RiskResultSubDoc      │
│ sleep: Mixed (hours, quality)   │
│ emotion: Mixed (emotions, note) │
│ shapValues: Mixed (impact list) │
│ formData: Mixed (raw inputs)    │
│ createdAt: ISODate              │
│ updatedAt: ISODate              │
└─────────────────────────────────┘
```

---

## 3. Schema Definitions

### 3.1 User Schema (`backend/src/models/User.js`)

Stores credentials, role-based authorization level, and timestamps:

```javascript
const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['user', 'clinician'], 
    default: 'user' 
  },
}, { timestamps: true });
```

#### Fields Breakdown:
- `name`: User's display name.
- `email`: Normalized, lowercase unique email address. Enforced by a unique MongoDB B-tree index.
- `password`: Salted and hashed password string (hashed with bcrypt, 10 rounds). Plaintext passwords are never stored.
- `role`: Grants access to standard patient features (`user`) or cohort review dashboards (`clinician`).

---

### 3.2 Assessment Schema (`backend/src/models/Assessment.js`)

Stores evaluation results, ML outputs, SHAP explanations, and the user's raw survey data:

```javascript
const riskResultSchema = new mongoose.Schema({
  label: { 
    type: String, 
    enum: ['Low', 'Moderate', 'High'] 
  },
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

const assessmentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false // Optional to support anonymous assessments
  },
  overallScore: { 
    type: Number 
  },
  scoringMode: {
    type: String,
    enum: ['ml_multimodal', 'clinical_fallback'],
    default: 'clinical_fallback'
  },
  crisis_flag: {
    type: Boolean,
    default: false
  },
  crisis_guidance: {
    type: mongoose.Schema.Types.Mixed
  },
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

// Compound index for optimized patient history queries
assessmentSchema.index({ userId: 1, createdAt: -1 });
```

#### Key Fields:
- `userId`: Foreign key linking to the `User` collection. Enables fast lookup of a patient's historical records.
- `overallScore`: A composite wellness score between 0 and 100.
- `scoringMode`: Distinguishes evaluations processed by the AI pipeline (`ml_multimodal`) versus the deterministic fallback (`clinical_fallback`).
- `crisis_flag` & `crisis_guidance`: Deterministic crisis response triggered whenever self-harm or critical distress items are reported.
- `depression`, `anxiety`, `stress`: Detailed sub-documents holding:
  - `label`: Categorical risk classification (`Low`, `Moderate`, `High`).
  - `probabilities`: Multi-class probability distribution computed by XGBoost.
  - `shap_explanation`: Ranked list of top symptoms pushing risk up or down.
- `emotion`: Contains the DistilBERT NLP results (detected dominant emotion, intensity, and sentiment).
- `sleep`: Somatic Insomnia Severity Index (ISI, 0–28) metrics.
- `formData`: Exact snapshot of answers provided by the user for longitudinal continuity.
- `timestamps`: Automatically creates `createdAt` and `updatedAt`. Indexed with `{ userId: 1, createdAt: -1 }`.

---

## 4. Database Connection & Security

### Connection String Configuration
In the backend's environment variables (`.env` locally, or Render cloud settings):
```text
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.lxyomk.mongodb.net/neuracare?retryWrites=true&w=majority
```

### Connection Code (`backend/src/index.js`):
```javascript
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️ Starting without DB — assessment history won\'t work');
  });
```

### Security Best Practices Implemented:
1. **Network Access**: Configured with CIDR `0.0.0.0/0` on MongoDB Atlas, allowing connection from dynamic Render IP ranges while requiring valid database user credentials.
2. **Encrypted in Transit**: All communication occurs over TLS/SSL (`mongodb+srv`).
3. **No Sensitive Medical Data in Plaintext**: Passwords are encrypted with bcrypt; assessments are bound to unique ObjectIds rather than exposed email addresses.
4. **Resilient Timeout Handling**: `serverSelectionTimeoutMS: 5000` prevents slow database handshakes from hanging the HTTP server.

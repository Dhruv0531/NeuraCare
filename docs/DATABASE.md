# NeuraCare Database Architecture & MongoDB Schema

This document details the database architecture, schema definitions, indexes, relationships, and data storage design of NeuraCare.

---

## 1. Database Overview

NeuraCare uses **MongoDB**, a document-oriented NoSQL database, hosted on a **MongoDB Atlas Cloud M0 Cluster**. 

### Why MongoDB?
- **Flexible Clinical Documents**: Psychological assessments contain nested dimensions (probabilities, SHAP factor explanations, emotional multi-labels, demographic forms, and adaptive follow-up responses) that vary depending on the instrument used. A document store naturally represents this structure without complex multi-table SQL joins.
- **High-Performance Time Series / History**: Longitudinal tracking requires rapidly appending evaluation records and fetching them sorted by timestamp.
- **Relational Referencing**: Seamlessly links patients to clinicians using indexed Mongoose `ObjectId` references (`assignedClinicianId` and `clinicianId`).
- **Zero-Cost Cloud Tier**: MongoDB Atlas provides an **M0 Free Tier** (512 MB storage, shared RAM, zero hosting cost). Note that automated point-in-time backup snapshots require dedicated M10+ tiers, and inactive M0 clusters pause after 30–60 days of inactivity.

---

## 2. Schema Architecture & Collections

NeuraCare defines two primary Mongoose schemas: `User` and `Assessment`.

```
┌────────────────────────────────────────────────────────┐
│                         User                           │
├────────────────────────────────────────────────────────┤
│ _id: ObjectId                                          │
│ name: String                                           │
│ email: String (unique)                                 │
│ password: String (bcrypt hash)                         │
│ role: 'user' | 'clinician'                             │
│                                                        │
│ // Clinician Profile Details (when role === 'clinician')│
│ licenseNumber: String                                  │
│ specialty: String                                      │
│ affiliation: String                                    │
│ clinicianCode: String (unique, sparse, uppercase)      │
│                                                        │
│ // Patient Clinical Linkage (when role === 'user')     │
│ assignedClinicianId: ObjectId (ref: 'User')            │
│                                                        │
│ createdAt: ISODate                                     │
│ updatedAt: ISODate                                     │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            │ assignedClinicianId            │ clinicianId
            │ (1 Clinician -> Many Patients) │ (1 Clinician -> Many Assessments)
            ▼                                ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────────────┐
│          Patient User           │   │               Assessment                │
│       (role === 'user')         │   ├─────────────────────────────────────────┤
└────────────────┬────────────────┘   │ _id: ObjectId                           │
                 │                    │ userId: ObjectId (ref: 'User')          │
                 │ 1                  │ clinicianId: ObjectId (ref: 'User')     │
                 │                    │ overallScore: Number (0 - 100)          │
                 │ has many           │ scoringMode: 'ml_multimodal' |          │
                 ▼ *                  │              'clinical_fallback'        │
┌─────────────────────────────────┐   │ crisis_flag: Boolean                    │
│           Assessment            │   │ crisis_guidance: Mixed                  │
│  (Filtered by userId & sorted   │   │ depression: RiskResultSubDoc            │
│   by createdAt descending)      │   │ anxiety: RiskResultSubDoc               │
└─────────────────────────────────┘   │ stress: RiskResultSubDoc                │
                                      │ insomnia: RiskResultSubDoc              │
                                      │ sleep: Mixed (ISI answers, hours)       │
                                      │ emotion: Mixed (emotions, sentiment)    │
                                      │ shapValues: Mixed (impact list)         │
                                      │ formData: Mixed (raw inputs + followups)│
                                      │ createdAt: ISODate                      │
                                      │ updatedAt: ISODate                      │
                                      └─────────────────────────────────────────┘
```

---

## 3. Schema Definitions

### 3.1 User Schema (`backend/src/models/User.js`)

Stores credentials, role-based authorization level, clinician professional metadata, and patient-clinician assignment:

```javascript
const mongoose = require('mongoose');

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
  
  // Clinician profile details (populated when role === 'clinician')
  licenseNumber: { 
    type: String, 
    trim: true 
  },
  specialty: { 
    type: String, 
    trim: true 
  },
  affiliation: { 
    type: String, 
    trim: true 
  },
  clinicianCode: { 
    type: String, 
    unique: true, 
    sparse: true, 
    uppercase: true, 
    trim: true 
  },
  
  // Patient clinical linkage (populated when role === 'user')
  assignedClinicianId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
```

#### Fields Breakdown:
- `name`: User's full display name.
- `email`: Normalized, lowercase unique email address. Enforced by a unique MongoDB B-tree index.
- `password`: Salted and hashed password string (hashed with bcrypt, 10–12 rounds). Plaintext passwords are never stored.
- `role`: Role discriminator. `'user'` (individual patient) or `'clinician'` (licensed healthcare professional).
- `licenseNumber`: State/national medical board license identifier for clinicians (e.g. `MD-PSY-48291`).
- `specialty`: Clinical practice specialty (e.g. `Psychiatry / Mood Disorders`, `Clinical Psychology`).
- `affiliation`: Hospital, university, or clinic organization (e.g. `Metro Behavioral Health`).
- `clinicianCode`: Unique, auto-generated shareable patient connect code (e.g. `DR-SARAH-782`). Backed by a **sparse unique index**, allowing standard patients to have `null`/`undefined` without index collision.
- `assignedClinicianId`: Reference to the `User._id` of the clinician supervising this patient.

---

### 3.2 Assessment Schema (`backend/src/models/Assessment.js`)

Stores evaluation results, ML outputs, SHAP explanations, adaptive question responses, and raw survey payloads:

```javascript
const mongoose = require('mongoose');

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

const shapFeatureSchema = new mongoose.Schema({
  feature: String,
  value: Number,
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false // Optional to support anonymous guest evaluations
  },
  clinicianId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false, 
    index: true // Indexed for rapid clinician roster filtering
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

module.exports = mongoose.model('Assessment', assessmentSchema);
```

#### Key Fields:
- `userId`: Foreign key linking to the `User` collection. Enables fast lookup of a patient's historical records.
- `clinicianId`: Foreign key linking to the supervising clinician. Tagged automatically on submission if the user is linked to a doctor, enabling fast index-backed retrieval for clinician cohort queries.
- `overallScore`: A composite wellness score between 0 and 100.
- `scoringMode`: Distinguishes evaluations processed by the AI pipeline (`ml_multimodal`) versus the deterministic fallback engine (`clinical_fallback`).
- `crisis_flag` & `crisis_guidance`: Deterministic crisis response triggered whenever self-harm or critical distress items are reported (e.g. PHQ-9 Item 9 > 0).
- `depression`, `anxiety`, `stress`: Detailed sub-documents holding categorical risk labels, XGBoost probabilities, and SHAP factor rankings.
- `emotion`: Contains the DistilBERT NLP results (detected dominant emotion, intensity, and sentiment).
- `sleep`: Somatic Insomnia Severity Index (ISI, 0–28) metrics.
- `formData`: Exact snapshot of all survey answers, demographic factors, and **adaptive follow-up responses** submitted during the 6-stage screening.
- `timestamps`: Automatically manages `createdAt` and `updatedAt`.

---

## 4. Indexing Strategy

To support high-concurrency production usage, the following MongoDB indexes are maintained:

1. **`User.email`**:
   - Type: Unique B-tree index
   - Ensures no two accounts share an email address.
2. **`User.clinicianCode`**:
   - Type: Unique sparse B-tree index (`{ unique: true, sparse: true }`)
   - Allows rapid case-insensitive lookup of clinician connect codes while permitting standard patient accounts to have null values.
3. **`User.assignedClinicianId`**:
   - Type: Standard secondary index
   - Enables the clinician portal to retrieve a clinician's entire patient roster in a single sub-millisecond query.
4. **`Assessment.userId` + `Assessment.createdAt`**:
   - Type: Compound descending index (`{ userId: 1, createdAt: -1 }`)
   - Powers the patient history timeline and longitudinal chart queries without in-memory sorting.
5. **`Assessment.clinicianId`**:
   - Type: Single-field index (`{ clinicianId: 1 }`)
   - Accelerates clinician cohort analytics and triage sorting.

---

## 5. Database Connection & Security

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
1. **Network Access**: Restricted using MongoDB Atlas IP Access Lists with TLS/SSL protocol encryption.
2. **Encrypted in Transit**: All communication occurs over TLS/SSL (`mongodb+srv`).
3. **Password Security**: Passwords are one-way hashed with bcrypt using high salt factors; plain passwords are never written to disk or logs.
4. **Resilient Timeout Handling**: `serverSelectionTimeoutMS: 5000` prevents slow database handshakes from hanging the HTTP server.
5. **Data Isolation**: Assessments are bound to specific `userId` and `clinicianId` references, preventing cross-tenant data leaks.

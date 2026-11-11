# NeuraCare Backend API Documentation

This document describes the architecture, REST API routes, Role-Based Access Control (RBAC), authentication flow, error resiliency, and machine learning integration of the NeuraCare backend service.

---

## 1. High-Level Architecture

The backend is built with **Node.js** and **Express.js**. It acts as the central orchestration layer connecting:
1. The **Next.js Frontend** (serving client interactions, the 6-stage Stepped Adaptive wizard, and the clinician portal)
2. **MongoDB Atlas** (persisting user accounts, clinician credentials, connect codes, patient linkages, and assessment records)
3. The **Python ML Service** (forwarding clinical questionnaires, stepped adaptive section requests, and free-text notes for XGBoost, SHAP, DistilBERT, and LLM inference)
4. The **OpenRouter API** (generating personalized clinical recommendations and adaptive deep-dive questions)

```
       ┌────────────────────────┐
       │   Next.js Frontend     │
       │ (Vercel / Localhost)   │
       └───────────┬────────────┘
                   │ HTTPS REST API
                   ▼
       ┌────────────────────────┐
       │   Express.js Backend   │
       │  (Render / Port 5000)  │
       │  - JWT Authentication  │
       │  - Clinician RBAC      │
       │  - Adaptive Section API│
       │  - Fallback Engine     │
       └─────┬────────────┬─────┘
             │            │
    MongoDB  │            │ HTTPS Tunnel
    Database │            │ (Cloudflare)
             ▼            ▼
┌──────────────────┐  ┌───────────────────────────────────┐
│  MongoDB Atlas   │  │   Python ML Service (FastAPI)     │
│ (Users & Records)│  │ (3x XGBoost, SHAP, DistilBERT,    │
└──────────────────┘  │  Stepped Adaptive Engine)         │
                      └───────────────────────────────────┘
```

---

## 2. Technology Stack & Dependencies

- **Runtime**: Node.js 18+ (tested on Node 20 / 22 / 24)
- **Framework**: Express.js 4.19
- **Database ODM**: Mongoose 8.4 (MongoDB connection pooling, schemas, validation, indexed relationships)
- **Security & Authentication**:
  - `bcryptjs`: Secure one-way salt hashing for user passwords (10–12 rounds).
  - `jsonwebtoken` (JWT): Stateless bearer token generation, role attachment, and signature verification.
  - `express-rate-limit`: Brute-force and DoS protection for authentication and submission endpoints.
  - `helmet`: Security headers against XSS, clickjacking, and MIME sniffing.
- **Cross-Origin Resource Sharing**: `cors` package configured with dynamic origin validation supporting local development, Vercel production, and preview domains.
- **HTTP Client**: `node-fetch` 3.3 for asynchronous communication with the Python ML service.
- **Configuration**: `dotenv` for environment variable management.

---

## 3. Directory Structure

```
backend/
├── src/
│   ├── index.js             # Server bootstrap, CORS, middleware, MongoDB connect
│   ├── middleware/
│   │   └── auth.js          # JWT verification & role inspection middleware
│   ├── models/
│   │   ├── User.js          # Mongoose schema for user credentials, roles, clinician profile & linkage
│   │   └── Assessment.js    # Mongoose schema for assessment scores, SHAP, recommendations & clinicianId
│   └── routes/
│       ├── auth.js          # /api/auth (dual registration, login, session info)
│       ├── assessment.js    # /api/assessment (submit, adaptive-section proxy, history, detail)
│       ├── clinician.js     # /api/clinician (RBAC-protected patient roster, triage, patient detail)
│       └── user.js          # /api/user (profile data, clinician linking)
├── package.json             # NPM scripts and dependencies
└── .env                     # Local environment configuration
```

---

## 4. API Endpoints

### 4.1 Health Check
- **`GET /health`**
  - **Auth**: Public
  - **Response**: `{"status": "ok", "service": "NeuraCare API"}`
  - **Purpose**: Used by Render, uptime monitors, and the sanity check suite to verify service health.

---

### 4.2 Authentication (`/api/auth`)

#### `POST /api/auth/register`
- **Auth**: Public
- **Purpose**: Dual registration supporting both **Individual Patients** and **Licensed Healthcare Clinicians**.
- **Individual Payload**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!",
    "role": "user",
    "clinicianCode": "DR-SARAH-782"  // Optional: links immediately to doctor
  }
  ```
- **Clinician Payload**:
  ```json
  {
    "name": "Dr. Sarah Jenkins",
    "email": "dr.jenkins@clinic.org",
    "password": "SecurePassword123!",
    "role": "clinician",
    "licenseNumber": "MD-PSY-48291",  // Required for clinicians
    "specialty": "Psychiatry / Mood Disorders",  // Required for clinicians
    "affiliation": "Metro Behavioral Health"  // Optional
  }
  ```
- **Behavior**:
  - Validates all required fields per role.
  - Enforces password hashing using bcrypt (10 rounds).
  - For clinicians: automatically generates a unique **Clinician Connect Code** (e.g. `DR-SARAH-782`).
  - For individuals: if a `clinicianCode` is supplied, verifies the code against active clinicians and sets `assignedClinicianId`.
  - Generates a signed 7-day JWT and returns user details.
- **Response**:
  ```json
  {
    "token": "eyJhbG...",
    "user": {
      "id": "6731...",
      "name": "Dr. Sarah Jenkins",
      "email": "dr.jenkins@clinic.org",
      "role": "clinician",
      "clinicianCode": "DR-SARAH-782"
    }
  }
  ```

#### `POST /api/auth/login`
- **Auth**: Public (rate-limited to 20 requests per 15 minutes)
- **Body**: `{ "email": "user@example.com", "password": "..." }`
- **Behavior**: Validates credentials against hashed password, signs new 7-day JWT containing `{ id, role }`.
- **Response**: `{ "token": "jwt...", "user": { "id": "...", "name": "...", "email": "...", "role": "..." } }`

#### `GET /api/auth/me`
- **Auth**: Required (`Bearer <token>`)
- **Response**: Current user profile without password hash.

---

### 4.3 User Profile & Provider Linkage (`/api/user`)

#### `GET /api/user/profile`
- **Auth**: Required (`Bearer <token>`)
- **Response**: Complete user profile. For patients, populates assigned clinician information (`name`, `email`, `specialty`, `clinicianCode`, `affiliation`). For clinicians, includes their credentials and connect code.

#### `POST /api/user/link-clinician`
- **Auth**: Required (`Bearer <token>`, patient role)
- **Body**: `{ "clinicianCode": "DR-SARAH-782" }`
- **Behavior**: Looks up the clinician by code (case-insensitive). Upon finding a match, updates `assignedClinicianId` on the patient's `User` record.
- **Response**:
  ```json
  {
    "message": "Successfully linked to Dr. Sarah Jenkins",
    "clinician": {
      "id": "6731...",
      "name": "Dr. Sarah Jenkins",
      "specialty": "Psychiatry / Mood Disorders",
      "clinicianCode": "DR-SARAH-782"
    }
  }
  ```

---

### 4.4 Stepped Adaptive Screening & Assessments (`/api/assessment`)

#### `POST /api/assessment/adaptive-section`
- **Auth**: Optional (supports both logged-in and guest evaluation sessions)
- **Body**:
  ```json
  {
    "section": "phq9",  // "phq9" or "gad7"
    "answers": [2, 1, 3, 2, 0, 1, 2, 0, 0]
  }
  ```
- **Orchestration Flow**:
  1. Validates input format and array dimensions.
  2. Forwards request to the Python ML service at `POST /adaptive/section-followups`.
  3. If Python ML service responds, returns the generated symptom cluster analysis and tailored follow-up questions (`source: "openrouter"` or `"python_rule_engine"`).
  4. If the ML service is offline, automatically activates the built-in **Deterministic Fallback Engine** (`assessment.js`), which analyzes item clusters and returns pre-calibrated clinical inquiries without delay (`source: "offline_deterministic_fallback"`).
- **Response**:
  ```json
  {
    "section": "phq9",
    "score": 11,
    "severity": "Moderate",
    "primaryCluster": "somatic_fatigue",
    "clusterSummary": "High endorsement of sleep disruption and daytime exhaustion, indicating somatic burnout.",
    "followups": [
      {
        "id": "phq_somatic_fatigue_1",
        "question": "When you experience daytime fatigue or sleep disruption, how significantly does it impair your concentration?",
        "symptomFocus": "Somatic/Sleep Fatigue",
        "options": [
          { "label": "No impairment", "score": 0 },
          { "label": "Mild difficulty", "score": 1 },
          { "label": "Moderate difficulty", "score": 2 },
          { "label": "Severe disruption", "score": 3 }
        ]
      }
    ]
  }
  ```

#### `POST /api/assessment/submit`
- **Auth**: Optional (automatically tags `userId` and `clinicianId` if user is authenticated and linked)
- **Body**:
  ```json
  {
    "phq_interest": 2,
    "phq_depressed": 1,
    "phq_sleep": 2,
    "gad_nervous": 3,
    "gad_relax": 2,
    "sleep_answers": [1, 2, 0, 3, 1, 2, 2],
    "text": "Feeling overwhelmed with deadlines and struggling to stay focused.",
    "age": 28,
    "gender": 1,
    "formData": {
      "phq9Answers": [2, 1, 2, 2, 1, 0, 1, 0, 0],
      "gad7Answers": [3, 2, 2, 1, 0, 1, 1],
      "adaptiveFollowups": {
        "phq_somatic_fatigue_1": 2,
        "gad_rumination_1": 3
      }
    }
  }
  ```
- **Orchestration Flow**:
  1. Validates questionnaire inputs and executes deterministic emergency crisis triage check.
  2. If the user is logged in, checks whether `assignedClinicianId` is set on their `User` record; if so, tags `clinicianId` onto the new assessment.
  3. Sends payload to `process.env.ML_API_URL + '/predict'`.
  4. If ML service responds: receives calibrated risk levels, SHAP impact scores, DistilBERT emotions, and AI recommendations (`scoringMode: "ml_multimodal"`).
  5. If ML service is offline: gracefully calculates deterministic fallback scores with validated clinical rules (`scoringMode: "clinical_fallback"`).
  6. Saves the complete evaluation into MongoDB `assessments` collection with indexed user retrieval.
  7. Returns the full clinical summary and transparency mode indicator to the frontend.

#### `GET /api/assessment/history`
- **Auth**: Required
- **Response**: Array of all past evaluations for the authenticated user, sorted by date descending.

#### `GET /api/assessment/:id`
- **Auth**: Required
- **Response**: Full record of a specific assessment (including raw inputs, SHAP explanations, recommendations, adaptive follow-up responses, and scoring mode).

---

### 4.5 Clinician Portal (`/api/clinician`)

All routes under `/api/clinician` strictly enforce **Role-Based Access Control (RBAC)**:
```javascript
// Middleware: Ensure user is authenticated AND has role: 'clinician'
if (req.user.role !== 'clinician') {
  return res.status(403).json({ message: 'Access denied: Clinicians only' });
}
```

#### `GET /api/clinician/patients`
- **Auth**: Required (`role: clinician`)
- **Behavior**:
  - Queries the `User` collection for all patients where `assignedClinicianId === req.user.id`.
  - Queries `Assessment` collection to aggregate each patient's latest evaluation.
  - Implements **Clinical Triage Ranking**:
    1. Crisis-flagged patients (`crisis_flag: true`) are pinned to the top.
    2. High-risk patients (`High` in Depression, Anxiety, or Stress).
    3. Moderate-risk patients.
    4. Low-risk patients and newly registered patients with no assessments yet.
- **Response**:
  ```json
  [
    {
      "id": "6731a...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "assignedDate": "2026-11-01T10:00:00Z",
      "latestAssessment": {
        "id": "6731b...",
        "date": "2026-11-10T14:30:00Z",
        "overallScore": 68,
        "crisis_flag": false,
        "depression": { "label": "Moderate", "score": 11 },
        "anxiety": { "label": "High", "score": 15 },
        "stress": { "label": "Moderate", "score": 12 },
        "insomnia": { "label": "Moderate", "score": 13 }
      }
    }
  ]
  ```

#### `GET /api/clinician/patient/:id`
- **Auth**: Required (`role: clinician`)
- **Behavior**: Verifies that the requested patient belongs to the logged-in clinician (`patient.assignedClinicianId.toString() === req.user.id.toString()`). If not linked, returns HTTP 403 Forbidden. Returns full patient profile and complete historical timeline of assessments.

#### `GET /api/clinician/summary` (or `/api/clinician/stats`)
- **Auth**: Required (`role: clinician`)
- **Behavior**: Computes aggregated cohort metrics for the clinician's active panel:
  - Total linked patients.
  - Number of active crisis alerts requiring urgent attention.
  - High-risk patient count.
  - Average composite wellness score across the cohort.

---

## 5. Security & Cross-Origin Configuration

### Multi-Layer Security Architecture
1. **Helmet**: Secures HTTP headers against XSS, clickjacking, and MIME-type sniffing.
2. **Rate Limiting**: Defends authentication and submission endpoints against brute-force attacks via `express-rate-limit`.
3. **Role-Based Authorization**: Route guards explicitly reject non-clinicians from accessing provider endpoints (HTTP 403).
4. **Strict Origin Validation**: Explicitly allows verified clients while blocking unauthorized domains:
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://neura-care-woad.vercel.app',
  'https://neuracare.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^https:\/\/neura-care.*\.vercel\.app$/.test(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS Error: Origin ${origin} not permitted.`));
  },
  credentials: true,
}));
```

---

## 6. Resiliency & Graceful Degradation

NeuraCare provides two tiers of fault tolerance:

1. **Database Degradation Mode**:
   - If MongoDB Atlas is temporarily unreachable during startup, the backend catches the error, logs a clear warning, and boots on its assigned port. Users can still complete evaluations in stateless mode without unhandled exceptions.

2. **Machine Learning & Adaptive Fallback Mode**:
   - If the external ML service or Cloudflare tunnel is temporarily down:
     * `POST /api/assessment/adaptive-section` executes the built-in deterministic JS question templates.
     * `POST /api/assessment/submit` calculates validated clinical sum scores and generates standardized recommendations.
     * The evaluation is marked with `scoringMode: 'clinical_fallback'`.
     * The frontend displays a transparency banner indicating standard clinical rules were used, preventing HTTP 500 errors or failed user workflows.

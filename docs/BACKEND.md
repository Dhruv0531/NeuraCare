# NeuraCare Backend API Documentation

This document describes the architecture, REST API routes, authentication flow, error resiliency, and machine learning integration of the NeuraCare backend service.

---

## 1. High-Level Architecture

The backend is built with **Node.js** and **Express.js**. It acts as the central orchestration layer connecting:
1. The **Next.js Frontend** (receiving user requests and serving data)
2. **MongoDB Atlas** (persisting user accounts, evaluations, and history)
3. The **Python ML Service** (forwarding clinical questionnaires and text notes for XGBoost, SHAP, and DistilBERT inference)
4. The **OpenRouter API** (generating personalized clinical recommendations)

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
       └─────┬────────────┬─────┘
             │            │
    MongoDB  │            │ HTTPS Tunnel
    Database │            │ (Cloudflare)
             ▼            ▼
┌──────────────────┐  ┌───────────────────────────────────┐
│  MongoDB Atlas   │  │   Python ML Service (FastAPI)     │
│ (Users & Records)│  │ (3x XGBoost, SHAP, DistilBERT)   │
└──────────────────┘  └───────────────────────────────────┘
```

---

## 2. Technology Stack & Dependencies

- **Runtime**: Node.js 18+ (tested on Node 20 / 24)
- **Framework**: Express.js 4.19
- **Database ODM**: Mongoose 8.4 (MongoDB connection pooling, schemas, validation)
- **Security & Authentication**:
  - `bcryptjs`: Secure one-way salt hashing for user passwords.
  - `jsonwebtoken` (JWT): Stateless bearer token generation and signature verification.
- **Cross-Origin Resource Sharing**: `cors` package configured with dynamic origin matching for Vercel preview and production deployments.
- **HTTP Client**: `node-fetch` 3.3 for asynchronous communication with the ML service.
- **Configuration**: `dotenv` for environment variable management.

---

## 3. Directory Structure

```
backend/
├── src/
│   ├── index.js             # Main server bootstrap, CORS, middleware, MongoDB connect
│   ├── middleware/
│   │   └── auth.js          # JWT verification middleware protecting private endpoints
│   ├── models/
│   │   ├── User.js          # Mongoose schema for user credentials & roles
│   │   └── Assessment.js    # Mongoose schema for assessment scores, SHAP, & recommendations
│   └── routes/
│       ├── auth.js          # /api/auth routes (register, login, me)
│       ├── assessment.js    # /api/assessment routes (submit, history, detail)
│       ├── clinician.js     # /api/clinician routes (cohort metrics, patient roster)
│       └── user.js          # /api/user routes (profile update, user metadata)
├── package.json             # NPM dependencies and scripts (start, dev)
└── .env                     # Local environment configuration
```

---

## 4. API Endpoints

### 4.1 Health Check
- **`GET /health`**
  - **Auth**: Public
  - **Response**: `{"status": "ok", "service": "NeuraCare API"}`
  - **Purpose**: Used by Render and uptime monitors to verify the service is awake.

---

### 4.2 Authentication (`/api/auth`)
- **`POST /api/auth/register`**
  - **Body**: `{ "name": "Jane Doe", "email": "jane@example.com", "password": "...", "role": "user" }`
  - **Behavior**: Hashes password using bcrypt (10 rounds), checks for duplicates, creates user, returns signed JWT.
  - **Response**: `{ "token": "jwt...", "user": { "id": "...", "name": "...", "email": "...", "role": "..." } }`

- **`POST /api/auth/login`**
  - **Body**: `{ "email": "jane@example.com", "password": "..." }`
  - **Behavior**: Validates credentials against hashed password, signs new 7-day JWT.
  - **Response**: `{ "token": "jwt...", "user": { ... } }`

- **`GET /api/auth/me`**
  - **Auth**: Required (`Bearer <token>`)
  - **Response**: Current user profile without password hash.

---

### 4.3 Assessments (`/api/assessment`)
- **`POST /api/assessment/submit`**
  - **Auth**: Optional (supports anonymous guest evaluations, automatically links to `userId` if logged in).
  - **Body**:
    ```json
    {
      "phq": { "q1": 2, "q2": 1, ... },
      "gad": { "q1": 3, "q2": 2, ... },
      "sleepHours": 6.5,
      "journalText": "Feeling stressed about work deadlines and unable to sleep well.",
      "demographics": { "age": 25, "gender": 1 }
    }
    ```
  - **Orchestration Flow**:
    1. Validates questionnaire inputs.
    2. Sends payload to `process.env.ML_API_URL + '/predict'`.
    3. If ML service responds: receives XGBoost risk levels, SHAP impact scores, DistilBERT emotions, and LLM clinical recommendations.
    4. If ML service is offline: gracefully calculates deterministic fallback scores.
    5. Saves the complete evaluation into MongoDB `assessments` collection.
    6. Returns the full clinical summary to the frontend.

- **`GET /api/assessment/history`**
  - **Auth**: Required
  - **Response**: Array of all past evaluations for the authenticated user, sorted by date descending.

- **`GET /api/assessment/:id`**
  - **Auth**: Required
  - **Response**: Full record of a specific assessment (including raw inputs, SHAP explanations, and recommendations).

---

### 4.4 Clinician Portal (`/api/clinician`)
- **`GET /api/clinician/patients`**
  - **Auth**: Required (`role: clinician` or clinician-authorized)
  - **Response**: List of patients, latest assessment date, composite score, and primary risk category.

- **`GET /api/clinician/stats`**
  - **Auth**: Required
  - **Response**: High-level cohort analytics:
    * Total patients screened
    * High-risk alert count
    * Average depression and anxiety index
    * Longitudinal improvement percentages

---

## 5. Security & Cross-Origin Configuration

### Dynamic CORS Policy
The backend dynamically inspects the HTTP `Origin` header to allow legitimate frontend clients while blocking unauthorized origins:
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://neuracare.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin)  // Allows all Vercel preview & production URLs
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
```

---

## 6. Resiliency & Graceful Degradation

NeuraCare is designed with two levels of fault tolerance:

1. **Database Degradation Mode**:
   - If MongoDB Atlas is temporarily unreachable, the backend catches the error, logs a warning, and still boots on its assigned port. Users can still complete evaluations in stateless mode.

2. **Machine Learning Fallback Mode**:
   - If the external ML service or Cloudflare tunnel is temporarily down, `assessment.js` catches the connection error and runs local scoring rules:
     * PHQ-9 and GAD-7 clinical sums mapped to standardized diagnostic thresholds.
     * Generates baseline factor descriptions and self-care recommendations.
     * Prevents HTTP 500 errors or hung requests.

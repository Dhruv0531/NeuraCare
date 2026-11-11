# 🧠 NeuraCare — AI-Powered Mental Health Screening Platform

NeuraCare is an end-to-end, multi-model clinical intelligence platform designed for holistic mental health screening, risk stratification, stepped adaptive questioning, and patient-clinician decision support. It pairs standardized psychiatric instruments (PHQ-9, GAD-7, ISI) with dynamic symptom-cluster deep dives, deep NLP emotion classification, Explainable AI (SHAP), and Large Language Models (LLMs) to provide transparent, compassionate, and actionable clinical guidance.

---

## 🌐 Live Production Links

| Service | Hosting Provider | Live URL |
| :--- | :--- | :--- |
| **Frontend Web App** | **Vercel** | [https://neura-care-woad.vercel.app](https://neura-care-woad.vercel.app) |
| **Backend REST API** | **Render** | [https://neuracare-backend.onrender.com](https://neuracare-backend.onrender.com) |
| **Database** | **MongoDB Atlas** | Cloud M0 Managed Cluster |
| **ML Inference Service** | **Local + Cloudflare** | Secure HTTPS Quick Tunnel |

---

## 📚 Detailed Documentation

Comprehensive documentation guides for every layer of the architecture:

- 🤖 **[Machine Learning & AI Architecture](docs/ML_MODEL.md)**: Deep dive into the 3x XGBoost classifiers, SHAP TreeExplainer, DistilBERT GoEmotions NLP, OpenRouter Clinical LLM, and the **Stepped Adaptive Questioning Engine (Method A)**.
- 🎨 **[Frontend Architecture](docs/FRONTEND.md)**: Next.js 14 App Router, TypeScript, Tailwind CSS, 6-Stage Stepped Adaptive Wizard, Clinician Triage Portal, Recharts data visualization, and jsPDF clinical export.
- ⚙️ **[Backend API Architecture](docs/BACKEND.md)**: Express.js orchestration, JWT authentication, Role-Based Access Control (RBAC), Clinician Connect Codes, dynamic CORS handling, and fault-tolerant fallback scoring.
- 🗄️ **[Database Architecture](docs/DATABASE.md)**: MongoDB Atlas setup, Mongoose schemas (`User` with clinician profile, `Assessment` with indexed `clinicianId`), entity relationships, and security protocols.
- 🚀 **[Zero-Cost Deployment Guide](docs/DEPLOYMENT.md)**: How NeuraCare is hosted for $0.00 across Vercel, Render, Atlas, and Cloudflare Tunnel.

---

## 🏗️ Architecture Overview

```
                      ┌──────────────────────────────────────────┐
                      │          NeuraCare Web Portal            │
                      │  Next.js 14 • Tailwind CSS • Recharts   │
                      │  6-Stage Stepped Adaptive Wizard & RBAC  │
                      └────────────────────┬─────────────────────┘
                                           │ HTTPS REST API
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │          Express.js Backend API          │
                      │   JWT Auth • RBAC • Clinician Linkage    │
                      │   Adaptive Proxy & Fallback Engine       │
                      └────────────┬──────────────────┬──────────┘
                                   │                  │
                Mongoose ODM Pool  │                  │ Cloudflare HTTPS Tunnel
                                   ▼                  ▼
              ┌───────────────────────────┐      ┌───────────────────────────┐
              │    MongoDB Atlas (Cloud)  │      │  Python ML Service        │
              │  Users • Assessments      │      │  FastAPI (Port 8000)      │
              │  Indexed Clinician Links  │      └─────────────┬─────────────┘
              └───────────────────────────┘                    │
                                                               │
                          ┌────────────────────────────────────┼────────────────────────────────────┐
                          ▼                                    ▼                                    ▼
            ┌───────────────────────────┐        ┌───────────────────────────┐        ┌───────────────────────────┐
            │   3x XGBoost Classifiers  │        │   DistilBERT NLP Model    │        │  Stepped Adaptive Engine  │
            │  - Depression / Anxiety   │        │   (GoEmotions 27 Classes) │        │  - PHQ-9 / GAD-7 Clusters │
            │  - Stress Probabilities   │        │   - Affective Sentiment   │        │  - OpenRouter LLM Prompts │
            │  - SHAP Explanations      │        └───────────────────────────┘        │  - Deterministic Fallback │
            └───────────────────────────┘                                             └───────────────────────────┘
```

---

## ✨ Key Features

1. **6-Stage Stepped Adaptive Screening (Method A)**:
   - Preserves validated standard scores (PHQ-9 score 0–27, GAD-7 score 0–21).
   - Automatically analyzes symptom clusters (Somatic Burnout, Cognitive Self-Criticism, Anhedonia, Crisis Gate, Metacognitive Rumination, Somatic Tension, Panic Apprehension).
   - Generates personalized, contextual deep-dive follow-up questions via OpenRouter LLM or deterministic fallback templates.
2. **Clinician Portal with Strict RBAC & Patient Triage**:
   - Access strictly restricted to verified healthcare providers (`role: 'clinician'`).
   - Clinicians view only their assigned patients connected via unique **Clinician Connect Codes** (e.g. `DR-SARAH-782`).
   - Prioritized clinical triage list: crisis-flagged patients are pinned to the top, followed by high-risk and moderate-risk patients.
   - Comprehensive patient chart modal with longitudinal trend graphs, multi-axial radar charts, and SHAP factor drilldowns.
3. **Dual Registration & Dynamic Provider Linkage**:
   - Distinct onboarding workflows for **Individual Patients** (with optional doctor connect code) and **Licensed Clinicians** (with medical license, specialty, and hospital/clinic affiliation).
   - Existing patients can easily link or switch their primary clinician directly from their Profile settings.
4. **Explainable AI (XAI)**:
   - Computes exact SHAP values for every questionnaire factor, explaining *why* a risk level was assigned with human-readable symptom descriptions.
5. **Affective Emotion Detection**:
   - Classifies free-text patient journal entries into 27 fine-grained emotions using a fine-tuned DistilBERT transformer.
6. **Sleep & Insomnia Risk Profiling**:
   - Evaluates sleep hygiene, nocturnal awakenings, and duration using the complete 7-item Insomnia Severity Index (ISI, 0–28).
7. **AI Clinical Recommendations**:
   - Generates tailored, evidence-based self-care coping steps and clinician consultation guidelines.
8. **1-Click Clinical PDF Export**:
   - Instant client-side generation of standardized, printable medical assessment summaries via jsPDF and html2canvas.
9. **Two-Tier Resiliency & Graceful Degradation**:
   - If the Python ML service or Cloudflare tunnel is temporarily down, the Express backend automatically executes local clinical rule-scoring and deterministic adaptive question templates without application disruption.

---

## 🧪 Master Sanity Test Suite

NeuraCare includes an automated, end-to-end sanity test suite that verifies all platform layers:

```bash
python run_sanity_check.py
```

The suite executes **23 rigorous tests** across 4 verification tiers:
1. **Tier 1: Machine Learning & Adaptive Services**: XGBoost inference, DistilBERT emotion classification, SHAP explanations, ISI sleep profiling, and Stepped Adaptive question generation (PHQ-9 & GAD-7 clusters).
2. **Tier 2: Backend REST API Contract**: Health endpoints, adaptive section generation API, and offline fallback templates.
3. **Tier 3: Database & Clinician RBAC Security**: Clinician code generation, unique index constraints, patient-clinician linkage, and strict unauthorized access barriers.
4. **Tier 4: End-to-End Clinical Flow**: Full simulation of an assessment submission, multimodal fusion scoring, and clinician dashboard verification.

---

## 🛠️ Quick Local Setup

### Prerequisites
- Node.js 18+ (tested on Node 20 / 22 / 24)
- Python 3.10+
- A free MongoDB Atlas connection string (or local MongoDB)

---

### Option A: 1-Click Launchers (Windows)

1. **Start the ML Service**: Double-click `run_ml_service.bat` (runs on `http://localhost:8000`).
2. **Start the Cloudflare Tunnel**: Double-click `run_tunnel.bat` (outputs your public HTTPS link).

---

### Option B: Manual Setup

#### 1. Backend Service (Node.js / Express)
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5000`.*

#### 2. Frontend Application (Next.js 14)
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

#### 3. Python ML Service (FastAPI)
```bash
cd src/backend
python -m venv .venv
.\.venv\Scripts\activate   # Windows
# source .venv/bin/activate # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*ML Service runs on `http://localhost:8000` (interactive Swagger API docs at `http://localhost:8000/docs`).*

---

## 📁 Repository Directory Structure

```
NeuraCare/
├── backend/                       # Node.js Express API
│   ├── src/
│   │   ├── index.js               # App entrypoint, CORS, and DB bootstrap
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT auth verification middleware
│   │   ├── models/
│   │   │   ├── User.js            # Mongoose schema (clinician profile, connect codes, linkage)
│   │   │   └── Assessment.js      # Mongoose schema (scores, SHAP, recommendations, clinicianId)
│   │   └── routes/
│   │       ├── auth.js            # /api/auth (dual registration, login, profile)
│   │       ├── assessment.js      # /api/assessment (submit, adaptive-section, history, detail)
│   │       ├── clinician.js       # /api/clinician (RBAC-protected triage roster, cohort stats)
│   │       └── user.js            # /api/user (profile, link-clinician)
│   └── package.json
├── frontend/                      # Next.js 14 App Router
│   ├── app/
│   │   ├── assessment/            # 6-Stage Stepped Adaptive Screening Wizard
│   │   ├── clinician/             # Role-gated clinician dashboard & patient chart modal
│   │   ├── history/               # Patient longitudinal wellness timeline
│   │   ├── login/                 # User & clinician sign-in
│   │   ├── register/              # Role-toggle registration (Individual vs Clinician)
│   │   ├── profile/               # Account profile & doctor connect card
│   │   └── results/               # Multimodal results, SHAP bars, adaptive insights, PDF
│   ├── components/                # Reusable UI components, radar charts, SHAP charts
│   ├── contexts/                  # AuthContext (JWT session, roles, auth state)
│   ├── lib/                       # Centralized API fetch client (TypeScript types)
│   └── tailwind.config.ts
├── src/backend/                   # Python FastAPI ML Service
│   ├── app/
│   │   ├── main.py                # FastAPI entrypoint & router configuration
│   │   ├── models/                # Serialized XGBoost & SHAP .pkl models
│   │   ├── routes/
│   │   │   ├── predict.py         # /predict & /adaptive/section-followups endpoints
│   │   │   ├── health.py          # /health endpoint
│   │   │   └── history.py         # Historical analytics
│   │   └── services/
│   │       ├── adaptive_service.py # Stepped Adaptive Questioning Engine (Method A)
│   │       ├── ml_service.py      # XGBoost + SHAP inference & item mapping
│   │       ├── emotion_service.py # DistilBERT GoEmotions inference
│   │       ├── llm_recommendations.py # OpenRouter LLM clinical recommendations
│   │       └── sleep_service.py   # Insomnia Severity Index (ISI) calculation
│   └── requirements.txt
├── emotion_model/                 # HuggingFace DistilBERT weights (model.safetensors)
├── docs/                          # Comprehensive architecture documentation
│   ├── ML_MODEL.md                # ML, XAI, Multimodal Fusion & Adaptive Engine docs
│   ├── FRONTEND.md                # Next.js UI, Stepped Wizard & Clinician Portal docs
│   ├── BACKEND.md                 # Express API, RBAC & Endpoints docs
│   ├── DATABASE.md                # MongoDB Atlas schemas & ER diagram docs
│   └── DEPLOYMENT.md              # Zero-cost cloud deployment guide
├── run_sanity_check.py            # Master 23-test automated sanity verification suite
├── render.yaml                    # 1-click Render blueprint specification
├── run_ml_service.bat             # 1-click ML service launcher
└── run_tunnel.bat                 # 1-click Cloudflare tunnel launcher
```

---

## 🔒 Security & Privacy Notice

NeuraCare is an assistive technology platform intended for early risk screening, psychoeducation, and clinical decision support. It is not an automated replacement for licensed psychiatric or crisis intervention services. All medical data is stored encrypted in transit over TLS. Emergency crisis screening is deterministically enforced at every tier.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

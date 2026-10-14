# 🧠 NeuraCare — AI-Powered Mental Health Screening Platform

NeuraCare is an end-to-end, multi-model clinical intelligence platform designed for holistic mental health screening, risk stratification, and patient-clinician decision support. It pairs standardized psychiatric instruments (PHQ-9, GAD-7, DASS-42) with deep NLP emotion classification, Explainable AI (SHAP), and Large Language Models (LLMs) to provide explainable, compassionate, and actionable clinical recommendations.

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

- 🤖 **[Machine Learning & AI Architecture](docs/ML_MODEL.md)**: Deep dive into the 3x XGBoost classifiers, SHAP TreeExplainer, DistilBERT GoEmotions NLP, and OpenRouter LLM clinical recommendations.
- 🎨 **[Frontend Architecture](docs/FRONTEND.md)**: Next.js 14 App Router, TypeScript, Tailwind CSS, Recharts data visualization, and jsPDF clinical export.
- ⚙️ **[Backend API Architecture](docs/BACKEND.md)**: Express.js architecture, JWT authentication, dynamic CORS handling, and fault-tolerant fallback scoring.
- 🗄️ **[Database Architecture](docs/DATABASE.md)**: MongoDB Atlas setup, Mongoose schemas, data relationships, and security protocols.
- 🚀 **[Zero-Cost Deployment Guide](docs/DEPLOYMENT.md)**: How NeuraCare is hosted for $0.00 across Vercel, Render, Atlas, and Cloudflare Tunnel.

---

## 🏗️ Architecture Overview

```
                      ┌──────────────────────────────────────────┐
                      │          NeuraCare Web Portal            │
                      │  Next.js 14 • Tailwind CSS • Recharts   │
                      └────────────────────┬─────────────────────┘
                                           │ HTTPS
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │          Express.js Backend API          │
                      │   JWT Auth • Mongoose • Data Gateway     │
                      └────────────┬──────────────────┬──────────┘
                                   │                  │
                Mongoose ODM Pool  │                  │ Cloudflare HTTPS
                                   ▼                  ▼
              ┌───────────────────────────┐      ┌───────────────────────────┐
              │    MongoDB Atlas (Cloud)  │      │  Python ML Service        │
              │  Users • Assessments      │      │  FastAPI (Port 8000)      │
              └───────────────────────────┘      └─────────────┬─────────────┘
                                                               │
                          ┌────────────────────────────────────┴────────────────────────────────────┐
                          ▼                                         ▼                               ▼
            ┌───────────────────────────┐             ┌───────────────────────────┐   ┌───────────────────────────┐
            │   3x XGBoost Classifiers  │             │   DistilBERT NLP Model    │   │  OpenRouter Clinical LLM  │
            │  - Depression / Anxiety   │             │   (GoEmotions 27 Classes) │   │  - Structured Summaries   │
            │  - Stress Probabilities   │             │   - Sentiment & Intensity │   │  - Actionable Coping Plan │
            │  - SHAP Explanations      │             └───────────────────────────┘   └───────────────────────────┘
            └───────────────────────────┘
```

---

## ✨ Key Features

1. **Multi-Instrument Psychiatric Screening**: Supports PHQ-9 (Depression), GAD-7 (Anxiety), and DASS-42 clinical metrics with dynamic question mapping.
2. **Explainable AI (XAI)**: Computes exact SHAP values for every questionnaire factor, explaining *why* a risk level was assigned with human-readable symptom descriptions.
3. **Affective Emotion Detection**: Classifies free-text patient journal entries into 27 fine-grained emotions using a fine-tuned DistilBERT transformer.
4. **Sleep & Insomnia Risk Profiling**: Evaluates sleep hygiene, nocturnal awakenings, and duration according to clinical sleep medicine standards.
5. **AI Clinical Recommendations**: Generates tailored, evidence-based self-care coping steps and clinical consultation guidelines.
6. **Clinician Portal**: Dedicated dashboard enabling mental health practitioners to monitor patient rosters, view risk tags, and inspect SHAP factor trends.
7. **1-Click Clinical PDF Export**: Instant client-side generation of standardized, printable medical assessment summaries.
8. **Graceful Fallback Mode**: If the ML service is offline, the backend seamlessly calculates deterministic scores using validated clinical thresholds without error screens.

---

## 🛠️ Quick Local Setup

### Prerequisites
- Node.js 18+
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
*ML Service runs on `http://localhost:8000` (API docs at `http://localhost:8000/docs`).*

---

## 📁 Repository Directory Structure

```
NeuraCare/
├── backend/                  # Node.js Express API
│   ├── src/
│   │   ├── index.js          # App entrypoint, CORS, and DB bootstrap
│   │   ├── middleware/       # JWT auth verification
│   │   ├── models/           # Mongoose schemas (User, Assessment)
│   │   └── routes/           # REST endpoints (/auth, /assessment, /clinician)
│   └── package.json
├── frontend/                 # Next.js 14 Application
│   ├── app/                  # App Router pages (assessment, results, clinician, history)
│   ├── components/           # Reusable UI components & Recharts charts
│   ├── contexts/             # Global AuthContext & JWT storage
│   ├── lib/                  # Centralized API fetch client
│   └── tailwind.config.ts    # Styling design system
├── src/backend/              # Python FastAPI ML Service
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint & router configuration
│   │   ├── models/           # Serialized XGBoost & SHAP .pkl models
│   │   ├── routes/           # /predict, /health, /history endpoints
│   │   └── services/         # XGBoost, DistilBERT, SHAP, and LLM services
│   └── requirements.txt      # Python ML dependencies
├── emotion_model/            # HuggingFace DistilBERT weights (model.safetensors)
├── docs/                     # Comprehensive architecture documentation
│   ├── ML_MODEL.md           # Machine learning & XAI documentation
│   ├── FRONTEND.md           # Next.js UI & state documentation
│   ├── BACKEND.md            # Express API documentation
│   ├── DATABASE.md           # MongoDB Atlas schema documentation
│   └── DEPLOYMENT.md         # Free cloud deployment breakdown
├── render.yaml               # 1-click Render blueprint deployment specification
├── run_ml_service.bat        # 1-click ML service launcher
└── run_tunnel.bat            # 1-click Cloudflare tunnel launcher
```

---

## 🔒 Security & Privacy Notice

NeuraCare is an assistive technology platform intended for early risk screening, psychoeducation, and clinical decision support. It is not an automated replacement for licensed psychiatric or crisis intervention services. All medical data is stored encrypted in transit over TLS.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

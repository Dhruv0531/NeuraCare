# NeuraCare Frontend Documentation

This document describes the architecture, tech stack, page routing, UI components, and state management of the NeuraCare frontend web application.

---

## 1. High-Level Overview

The frontend is a modern, responsive single-page/SSR web application built with **Next.js 14** (App Router) and **TypeScript**. It provides a healthcare-grade user interface designed for both patients (taking evaluations and reviewing personal trends) and clinicians (reviewing patient cohorts and exporting medical-grade reports).

```
                      ┌────────────────────────────────────┐
                      │        Next.js 14 App Router       │
                      │  (TypeScript + Tailwind CSS + SSR) │
                      └─────────────────┬──────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
│     Patient Portal    │    │   Clinician Portal    │    │ Visual Analytics & PDF│
│ - Multi-step survey   │    │ - Patient risk roster │    │ - Recharts timelines  │
│ - Text emotion note   │    │ - Cohort statistics   │    │ - SHAP impact bars    │
│ - Wellness scorecards │    │ - Detailed breakdown  │    │ - jsPDF medical export│
└───────────────────────┘    └───────────────────────┘    └───────────────────────┘
```

---

## 2. Technology Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | Server-side rendering, routing, static optimization, and performance |
| **Language** | TypeScript (Strict Mode) | Type safety across clinical payloads, API requests, and component props |
| **Styling** | Tailwind CSS + Vanilla CSS | Utility-first CSS, custom healthcare color palette, responsive design |
| **Icons** | Lucide React | Clean, accessible medical and interface icons |
| **Animations** | Framer Motion | Smooth page transitions, collapsible accordions, animated score progress |
| **Charts & Graphs** | Recharts | Interactive radar charts, risk gauges, longitudinal trend lines |
| **Report Export** | jsPDF + html2canvas | Client-side 1-click clinical PDF report generation |
| **Notifications** | React Hot Toast | Lightweight toast notifications for auth, saves, and errors |

---

## 3. Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx                 # Root layout, font definitions, and AuthProvider wrapper
│   ├── page.tsx                   # Modern landing page with feature cards and CTA
│   ├── globals.css                # Global CSS styles and Tailwind utility directives
│   ├── assessment/
│   │   └── page.tsx               # Multi-step clinical questionnaire (PHQ-9/GAD-7/DASS) + Journal
│   ├── results/
│   │   ├── page.tsx               # Assessment results: scores, SHAP explanations, recommendations
│   │   └── [id]/
│   │       └── page.tsx           # Detail view for any specific historical assessment
│   ├── history/
│   │   └── page.tsx               # Patient longitudinal wellness trends over time
│   ├── clinician/
│   │   └── page.tsx               # Clinician cohort dashboard with risk sorting and filters
│   ├── login/
│   │   └── page.tsx               # User & Clinician sign-in form
│   ├── register/
│   │   └── page.tsx               # Account registration form
│   └── profile/
│       └── page.tsx               # Account profile, demographic settings, and password update
├── components/
│   ├── Navbar.tsx                 # Responsive navigation bar with role badges and sign-out
│   ├── LongitudinalTrendChart.tsx # Recharts-powered timeline of Depression/Anxiety/Stress over time
│   ├── ShapImpactChart.tsx        # Horizontal impact bar chart showing driving clinical factors
│   ├── ClinicalReportExport.tsx   # PDF generator creating printable clinical summaries
│   └── ProtectedRoute.tsx         # Route guard redirecting unauthenticated users to /login
├── contexts/
│   └── AuthContext.tsx            # Global React context for JWT session, user info, and logout
└── lib/
    └── api.ts                     # Centralized Axios/fetch client pointing to NEXT_PUBLIC_API_URL
```

---

## 4. Key Application Pages

### 1. Landing Page (`app/page.tsx`)
- Hero section with direct "Take Evaluation" call-to-action.
- Feature grid explaining the hybrid AI model, explainability, clinician portal, and privacy standards.
- Quick preview of the evaluation flow.

### 2. Multi-Step Assessment (`app/assessment/page.tsx`)
- **Step 1: Clinical Screening (PHQ-9 & GAD-7)**: Standardized questions assessing mood, anhedonia, fatigue, feelings of inadequacy, nervousness, panic apprehension, and restlessness.
- **Step 2: Sleep Assessment (ISI)**: All 7 clinical Insomnia Severity Index questions (5-point scale: None to Very Severe, 0–28 total).
- **Step 3: Demographics (About You)**: Age group, gender, education, urban/rural residency, and background context.
- **Step 4: Personal Reflection Journal**: Free-text prompt where users express their thoughts and feelings for DistilBERT emotion extraction.
- **Progress Tracker**: Step-by-step indicator with validation to ensure no missing answers.

### 3. Results & Explainability (`app/results/page.tsx`)
- **Crisis Intervention Banner**: Deterministic, immediate safety banner displaying 24/7 crisis numbers (988, Tele-MANAS, Crisis Text Line) when critical distress or self-harm thoughts are reported.
- **Evaluation Mode Indicator**: Transparently displays whether results were computed by the **AI Multimodal Engine** (XGBoost + DistilBERT + ISI) or the **Standard Clinical Scoring** fallback rule-engine.
- **Composite Score Dial**: Overall score from 0–100 with color-coded risk bands.
- **Dimensional Breakdown**: Depression, Anxiety, Stress, and Insomnia cards showing exact probabilities (`low`, `moderate`, `high`).
- **Interactive Radar Chart**: Multi-axial risk comparison across all 4 dimensions.
- **SHAP Factor Explorer**: Interactive bar chart displaying which clinical items contributed most to elevated risk.
- **Detected Emotional Valence**: Primary and secondary emotions extracted from the journal note.
- **AI Guidance**: Supportive coping strategies and clinician follow-up advice.
- **Export Action**: 1-click button to download the entire analysis as a printable PDF report.

### 4. Longitudinal History (`app/history/page.tsx`)
- Historical comparison chart plotting wellness scores, depression trends, and anxiety levels over weekly/monthly assessments.
- Tabular record of all past evaluations with links to review past recommendations.

### 5. Clinician Dashboard (`app/clinician/page.tsx`)
- Role-gated dashboard designed for healthcare providers.
- Summary metrics: Total active patients, high-risk flags, average cohort wellness.
- Search and filter patients by risk level (`High`, `Moderate`, `Low`).
- Patient drill-down to review individual SHAP factor contributions before clinical consultations.

---

## 5. State Management & API Communication

### Authentication State (`contexts/AuthContext.tsx`)
- Persists user information and JWT tokens in `localStorage`.
- Automatically attaches `Authorization: Bearer <token>` to outbound requests in `lib/api.ts`.
- Manages user roles: `user` (patient) vs `clinician`.

### Backend API Configuration (`lib/api.ts`)
- Communicates with the Node.js backend using a single environment variable:
  ```typescript
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  ```
- In production, this points to your deployed backend (e.g. `https://neuracare-backend.onrender.com`).
- Handles response caching, error toast alerts, and automatic redirects on expired tokens (HTTP 401).

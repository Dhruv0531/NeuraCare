# 🧠 NeuraCare Frontend Application

The modern, responsive web application for NeuraCare, built with **Next.js 14** (App Router), **TypeScript**, and **Tailwind CSS**. It provides an accessible, clinical-grade interface for individual patient screening and a specialized portal for licensed mental health clinicians.

---

## 🚀 Key Features

1. **6-Stage Stepped Adaptive Screening Wizard (`/assessment`)**:
   - Standard clinical screening across **PHQ-9** (Depression) and **GAD-7** (Anxiety).
   - Real-time symptom cluster identification (Somatic Fatigue, Cognitive Self-Criticism, Anhedonia, Rumination, Somatic Tension, Panic Apprehension).
   - Dynamic, contextual follow-up inquiries generated via OpenRouter LLM or deterministic fallback templates.
   - Comprehensive **Insomnia Severity Index (ISI)** somatic sleep assessment (7 clinical items).
   - Free-text emotional reflection journal evaluated via DistilBERT NLP.
2. **Clinical Results & Explainability (`/results`)**:
   - Immediate deterministic Crisis Intervention Banner (988, Tele-MANAS, Crisis Text Line).
   - AI Stepped Adaptive Insights card revealing identified symptom clusters and follow-up responses.
   - Composite Wellness score dial (0–100) with color-coded risk bands.
   - Dimensional probability cards (Depression, Anxiety, Stress, Insomnia).
   - Multi-axial radar chart and horizontal SHAP factor contribution chart.
   - 1-Click printable clinical PDF report export using `jsPDF` and `html2canvas`.
3. **Clinician Portal with Strict RBAC & Triage (`/clinician`)**:
   - Access restricted to verified healthcare providers (`role: 'clinician'`).
   - Shareable **Clinician Connect Code** widget with one-click clipboard copy (e.g. `DR-SARAH-782`).
   - Prioritized triage roster: crisis-flagged patients pinned to top, followed by high-risk cases.
   - Interactive clinical chart modal displaying full patient timelines, radar charts, and SHAP factor drilldowns.
4. **Dual Role Registration & Linkage (`/register` & `/profile`)**:
   - Segmented onboarding toggle: **Individual / Patient** vs. **Licensed Clinician**.
   - Clinician registration collects state/board license number, specialty, and hospital/clinic affiliation.
   - Individual patients can link to their doctor during signup or update their connected provider on `/profile`.
5. **Longitudinal Wellness Tracking (`/history`)**:
   - Recharts-powered interactive timeline tracking depression, anxiety, and stress progression across assessments.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14.2 (App Router with SSR & Static Optimization)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS + PostCSS + CSS Modules
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Data Visualization**: Recharts (Radar, Area, Bar, Line charts)
- **Document Export**: jsPDF + html2canvas
- **Notifications**: React Hot Toast

---

## 📁 Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx                 # Root layout, font loader, AuthProvider wrapper
│   ├── page.tsx                   # Landing page with hero CTA and feature breakdown
│   ├── globals.css                # Global styles and Tailwind utility classes
│   ├── assessment/
│   │   └── page.tsx               # 6-Stage Stepped Adaptive Screening Wizard
│   ├── results/
│   │   ├── page.tsx               # Multimodal results, SHAP explorer, adaptive card
│   │   └── [id]/
│   │       └── page.tsx           # Historical evaluation detail view
│   ├── clinician/
│   │   └── page.tsx               # Clinician triage dashboard & patient chart modal
│   ├── history/
│   │   └── page.tsx               # Longitudinal patient tracking chart
│   ├── login/
│   │   └── page.tsx               # Authentication sign-in form
│   ├── register/
│   │   └── page.tsx               # Dual registration form (Individual vs Clinician)
│   └── profile/
│       └── page.tsx               # Account profile & Connected Healthcare Provider card
├── components/
│   ├── Navbar.tsx                 # Responsive navigation bar with role badges
│   ├── LongitudinalTrendChart.tsx # Historical timeline chart
│   ├── ShapImpactChart.tsx        # Horizontal SHAP factor contribution bar chart
│   ├── ClinicalReportExport.tsx   # PDF report generator
│   └── ProtectedRoute.tsx         # Route guard redirecting unauthenticated users
├── contexts/
│   └── AuthContext.tsx            # Global auth state, JWT token storage, user roles
└── lib/
    └── api.ts                     # Centralized API fetch client with TypeScript types
```

---

## ⚙️ Environment Variables

Create a `.env.local` file in the `frontend` root directory:

```env
# URL of your Express.js backend API
NEXT_PUBLIC_API_URL=http://localhost:5000
```

In production (e.g. on Vercel), set `NEXT_PUBLIC_API_URL` to your live backend domain:
```env
NEXT_PUBLIC_API_URL=https://neuracare-backend.onrender.com
```

---

## 🏃 Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm run start
```

---

## 🔒 Security & Medical Notice
The NeuraCare frontend is an assistive psychological screening tool and does not provide formal psychiatric diagnoses or emergency medical treatment. Critical emergency triage guidance is hardcoded to ensure immediate access to crisis hotlines (988 / Tele-MANAS) without external network dependencies.

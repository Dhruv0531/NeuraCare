# NeuraCare Frontend Documentation

This document describes the architecture, tech stack, page routing, UI components, state management, and user workflows of the NeuraCare frontend web application.

---

## 1. High-Level Overview

The frontend is a healthcare-grade, responsive single-page/SSR web application built with **Next.js 14** (App Router) and **TypeScript**. It provides tailored experiences for two distinct user roles:
1. **Individual Patients**: Taking multi-stage stepped adaptive screenings, reviewing personalized explainable insights, tracking wellness history, and linking with their care provider.
2. **Licensed Clinicians**: Managing an assigned patient panel via unique connect codes, triaging high-risk and crisis cases, and inspecting deep-dive clinical charts and SHAP factor contributions.

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
│ - 6-Stage Stepped     │    │ - Connect Code share  │    │ - Recharts timelines  │
│   Adaptive Screening  │    │ - Triage patient list │    │ - SHAP impact bars    │
│ - Emotional Journal   │    │ - Crisis alert banner │    │ - Multi-axial radar   │
│ - Wellness scorecards │    │ - Patient chart modal │    │ - jsPDF medical export│
│ - Provider connection │    │ - RBAC-guarded routes │    │ - Adaptive insights   │
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
│   │   └── page.tsx               # 6-Stage Stepped Adaptive Screening Wizard
│   ├── results/
│   │   ├── page.tsx               # Assessment results: scores, SHAP explanations, recommendations, adaptive insights
│   │   └── [id]/
│   │       └── page.tsx           # Detail view for any specific historical assessment
│   ├── history/
│   │   └── page.tsx               # Patient longitudinal wellness trends over time
│   ├── clinician/
│   │   └── page.tsx               # Clinician cohort dashboard with connect code, triage sorting, and patient chart modal
│   ├── login/
│   │   └── page.tsx               # User & Clinician sign-in form
│   ├── register/
│   │   └── page.tsx               # Dual registration form (Individual vs. Licensed Clinician)
│   └── profile/
│       └── page.tsx               # Account profile, demographics, and Connected Healthcare Provider card
├── components/
│   ├── Navbar.tsx                 # Responsive navigation bar with role badges and sign-out
│   ├── LongitudinalTrendChart.tsx # Recharts-powered timeline of Depression/Anxiety/Stress over time
│   ├── ShapImpactChart.tsx        # Horizontal impact bar chart showing driving clinical factors
│   ├── ClinicalReportExport.tsx   # PDF generator creating printable clinical summaries
│   └── ProtectedRoute.tsx         # Route guard redirecting unauthenticated users to /login
├── contexts/
│   └── AuthContext.tsx            # Global React context for JWT session, user info, roles, and logout
└── lib/
    └── api.ts                     # Centralized API fetch client with full TypeScript interfaces
```

---

## 4. Key Application Pages & Workflows

### 4.1 The 6-Stage Stepped Adaptive Screening Wizard (`app/assessment/page.tsx`)

Rather than presenting an intimidating static survey, NeuraCare utilizes a **Two-Stage Computerized Adaptive Testing (CAT)** workflow:

```
Stage 1: PHQ-9 (9 items)
   │
   ▼
Stage 2: AI Clinical Deep-Dive (Targeted follow-ups based on PHQ-9 symptom clusters)
   │
   ▼
Stage 3: GAD-7 (7 items)
   │
   ▼
Stage 4: AI Clinical Deep-Dive (Targeted follow-ups based on GAD-7 symptom clusters)
   │
   ▼
Stage 5: Sleep Profile (Insomnia Severity Index - ISI, 7 items)
   │
   ▼
Stage 6: Demographics & Reflection Journal (DistilBERT NLP note)
```

- **Stage 1 (PHQ-9 Standard)**:
  - 9 standardized depression questions (0–3 scale).
  - Preserves standard clinical sum score (0–27).
- **Stage 2 (PHQ-9 AI Deep-Dive)**:
  - Automatically identifies symptom clusters: **Somatic/Sleep Fatigue** (`Q3, Q4`), **Cognitive Self-Criticism** (`Q2, Q6`), **Anhedonia** (`Q1, Q7`), or **Crisis Gate** (`Q9`).
  - Displays an **AI Clinical Observation Banner** explaining why specific follow-ups were generated.
  - Presents targeted questions probing functional impairment and daytime impact.
  - Skips deep-dives smoothly if minimal symptoms are reported.
- **Stage 3 (GAD-7 Standard)**:
  - 7 standardized generalized anxiety questions (0–3 scale).
  - Preserves standard clinical sum score (0–21).
- **Stage 4 (GAD-7 AI Deep-Dive)**:
  - Analyzes anxiety symptom clusters: **Metacognitive Rumination** (`Q1, Q2, Q3`), **Somatic Tension** (`Q4, Q5`), or **Panic/Autonomic Dread** (`Q6, Q7`).
  - Generates targeted follow-up inquiries.
- **Stage 5 (Sleep Assessment - ISI)**:
  - Complete 7-item Insomnia Severity Index evaluating sleep-onset latency, nocturnal awakenings, early awakenings, sleep dissatisfaction, noticeability to others, distress, and daytime interference (0–28 scale).
- **Stage 6 (Demographics & Free-Text Journal)**:
  - Age group, gender, education, and living context.
  - Free-text reflection prompt enabling patients to express their thoughts for DistilBERT NLP sentiment and emotion extraction.

---

### 4.2 Results & Explainability (`app/results/page.tsx`)

- **Crisis Intervention Banner**:
  - Deterministic, zero-latency safety banner triggered whenever self-harm or critical distress items are endorsed.
  - Displays 24/7 hotlines: **988 Suicide & Crisis Lifeline** (US/Canada), **Tele-MANAS 14416** (India), and **Crisis Text Line** (Text HOME to 741741).
- **AI Stepped Adaptive Assessment Insights Card**:
  - Summarizes the symptom clusters identified during screening.
  - Displays the exact dynamic follow-up questions asked and the patient's selected responses.
- **Evaluation Mode Indicator**:
  - Transparently indicates whether results were processed by the **Multimodal AI Pipeline** (XGBoost + DistilBERT + ISI) or the **Standard Clinical Scoring** fallback engine.
- **Composite Score Dial**:
  - High-visibility wellness score (0–100) with color-coded risk bands.
- **Dimensional Breakdown**:
  - Detailed cards for Depression, Anxiety, Stress, and Insomnia displaying exact categorical risk levels and multi-class probability distributions.
- **Interactive Multi-Axial Radar Chart**:
  - Compares the patient's severity levels across all 4 clinical dimensions on a single chart.
- **SHAP Factor Explorer**:
  - Horizontal bar chart showing the exact clinical factors pushing risk up or down, translated into human-readable language.
- **Affective Emotion Analysis**:
  - Highlights primary and secondary emotions extracted from the free-text journal entry.
- **Actionable AI Coping Recommendations**:
  - Evidence-based self-care exercises and structured clinical consultation guidance.
- **1-Click Clinical PDF Export**:
  - Generates a clean, printable medical report formatted for sharing with therapists or physicians.

---

### 4.3 Clinician Dashboard & Triage System (`app/clinician/page.tsx`)

- **Role-Based Access Control**:
  - Accessible only to authenticated clinicians (`role: 'clinician'`).
  - Unauthorized users are prevented from viewing or accessing patient records.
- **Clinician Header & Connect Code Widget**:
  - Displays verified clinician profile: Medical License Number, Specialty, and Hospital/Clinic Affiliation.
  - Prominently features the clinician's **Connect Code** (e.g. `DR-SARAH-782`) with a 1-click clipboard copy button to share with patients.
- **Cohort Summary Metrics**:
  - Quick-glance cards: Total Linked Patients, Active Crisis Alerts, High-Risk Patients, and Cohort Average Score.
- **Prioritized Clinical Triage Roster**:
  - Patients are automatically sorted with **Crisis Alert flags pinned to the top**, followed by high risk, moderate risk, and recent assessments.
  - Filterable by risk category (`All`, `High Risk`, `Crisis Only`).
  - Searchable by patient name or email.
- **Interactive Clinical Chart Modal**:
  - Clicking any patient opens a comprehensive medical chart showing:
    * Full longitudinal wellness timeline.
    * Comparative radar chart.
    * Dimensional risk breakdown (Depression, Anxiety, Stress, Insomnia).
    * Primary driving SHAP factors.
    * Latest free-text journal note and detected emotional valence.

---

### 4.4 Dual Registration & Provider Linkage (`app/register/page.tsx` & `app/profile/page.tsx`)

- **Dual Registration Form (`/register`)**:
  - Clean segmented toggle:
    * **Individual / Patient**: Basic credentials + optional Clinician Connect Code to link to their doctor during signup.
    * **Licensed Clinician**: Requires medical license number, practice specialty, and hospital/clinic affiliation. Automatically generates a connect code upon creation.
- **Connected Healthcare Provider Card (`/profile`)**:
  - For patients: Displays currently assigned clinician details or allows entering a doctor's code to link accounts immediately.
  - For clinicians: Displays credentials and connect code.

---

## 5. State Management & API Communication

### Authentication State (`contexts/AuthContext.tsx`)
- Manages user sessions, JWT tokens, and user metadata in `localStorage`.
- Exposes helper properties (`isAuthenticated`, `isClinician`, `user`, `login`, `register`, `logout`).
- Automatically attaches `Authorization: Bearer <token>` to outbound requests in `lib/api.ts`.

### Centralized API Client (`lib/api.ts`)
- Configured via environment variable:
  ```typescript
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  ```
- Fully typed interfaces for all payloads:
  * `ClinicianProfile`, `ClinicianPatient`, `CohortSummary`
  * `SectionAdaptiveAnalysis`, `AdaptiveFollowupQuestion`
  * `AssessmentSubmission`, `RiskResult`, `ShapExplanation`
- Automatic error handling, toast alerts, and session expiration handling (HTTP 401).

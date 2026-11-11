# NeuraCare Machine Learning & AI Architecture

This document provides a comprehensive, end-to-end explanation of the AI/ML architecture powering NeuraCare. It details how multiple models work together to assess mental health risks, extract emotional context, generate explainable insights, conduct stepped adaptive screening, and produce clinical recommendations.

---

## 1. High-Level AI/ML Overview

NeuraCare does not rely on a single model. Instead, it utilizes a **multi-model hybrid ensemble** combining classical tabular machine learning, deep NLP transformers, explainable AI (XAI), computerized adaptive testing (CAT), and large language models (LLMs):

```
                        ┌──────────────────────────────────────┐
                        │          User Assessment             │
                        │  (Questionnaires + Journal Entry)    │
                        └──────────────────┬───────────────────┘
                                           │
       ┌───────────────────────────────────┼───────────────────────────────────┐
       ▼                                   ▼                                   ▼
┌───────────────────────────┐┌───────────────────────────┐┌───────────────────────────┐
│  Standard Questionnaires  ││ Stepped Adaptive Engine   ││   Free-Text Journal Note  │
│  - PHQ-9 (Depression)     ││ (Two-Stage Symptom CAT)   ││      (User Expression)    │
│  - GAD-7 (Anxiety)        ││ - Cluster Identification  │└─────────────┬─────────────┘
│  - ISI (Insomnia)         ││ - Dynamic LLM Follow-ups  │              │
└─────────────┬─────────────┘└─────────────┬─────────────┘              │
              │                            │                            │
              ▼                            ▼                            ▼
┌───────────────────────────┐┌───────────────────────────┐┌───────────────────────────┐
│  3x XGBoost Classifiers   ││ Contextual Cluster Deep-  ││ DistilBERT Emotion Model  │
│  - Depression Risk        ││ Dive Data (Saved with     ││ (Fine-Tuned GoEmotions)   │
│  - Anxiety Risk           ││ Assessment Payload)       ││ - 27 Fine-Grained Emotions│
│  - Stress Risk            │└───────────────────────────┘│ - Valence & Intensity     │
└─────────────┬─────────────┘                             └─────────────┬─────────────┘
              │                                                         │
              ▼                                                         │
┌───────────────────────────┐                                           │
│    SHAP TreeExplainer     │                                           │
│ - Exact Feature Impact    │                                           │
│ - Clinical Factor Ranking │                                           │
└─────────────┬─────────────┘                                           │
              │                                                         │
              └────────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
                             ┌───────────────────────────┐
                             │ Multimodal Fusion Engine  │
                             │ (Questionnaire + NLP      │
                             │  + Somatic Sleep Index)   │
                             └─────────────┬─────────────┘
                                           │
                                           ▼
                             ┌───────────────────────────┐
                             │  OpenRouter Clinical LLM  │
                             │ (Liquid / LFM-2.5-2.6B)   │
                             │ - Personalized Coping     │
                             │ - Clinical Summary        │
                             │ - Recommended Actions     │
                             └───────────────────────────┘
```

---

## 2. Model 1: Tabular Risk Classifiers (XGBoost)

### Purpose
To predict risk levels (**Low**, **Moderate**, **High**) for three distinct psychological dimensions:
1. **Depression** (`model_depression.pkl`)
2. **Anxiety** (`model_anxiety.pkl`)
3. **Stress** (`model_stress.pkl`)

### Training & Dataset
- Trained on the public **OpenPsychometrics DASS-42** survey dataset (~38,840 responses after quality filtering).
- **Ground Truth Note**: Class labels (`Low`, `Moderate`, `High`) were derived programmatically by applying standardized psychometric cutoff thresholds to item subscale sums, rather than external psychiatric clinical diagnoses.
- **Input Features**:
  - `Q1A` through `Q42A`: Psychometric item responses (scored 0–3 based on symptom frequency/severity).
  - Demographic features: `age`, `gender`, `education`, `urban`, `religion`, `orientation`, `race`, `married`, `familysize`.

### Dynamic Mapping Compatibility
In the user-facing web app, users complete shorter validated screening tools (**PHQ-9** and **GAD-7**):
- **PHQ-9 (Patient Health Questionnaire-9)**: Mapped to depressive scale items (e.g., sadness, loss of interest, sleep disruption, feelings of worthlessness).
- **GAD-7 (Generalized Anxiety Disorder-7)**: Mapped to anxiety items (e.g., nervousness, inability to relax, panic apprehension) and stress proxy items.
- **Subscale Imputation**: Where 1-to-1 item mappings do not exist, mean subscale scores are imputed to approximate DASS feature dimensions.

### Model Outputs
For each dimension, the model outputs:
- **Categorical Risk Label**: `Low`, `Moderate`, or `High`.
- **Confidence Probabilities**: Exact percentage distribution, e.g.:
  ```json
  "probabilities": {
    "low": 0.12,
    "moderate": 0.74,
    "high": 0.14
  }
  ```
- **Overall Composite Wellness Score**: Normalized score between 0 and 100.

---

## 3. Model 2: Explainable AI (SHAP TreeExplainer)

### Why Explainability Matters
In healthcare and psychological screening, a "black box" prediction is dangerous and unhelpful. Clinicians and patients need to know **why** a risk level was assigned.

### Implementation
- **Algorithm**: Tree SHAP (SHapley Additive exPlanations) via `shap_depression.pkl`, `shap_anxiety.pkl`, and `shap_stress.pkl`.
- SHAP computes the mathematically optimal Shapley value for every single feature, determining whether an answer pushed the patient towards higher risk (+ impact) or lower risk (- impact).

### Clinical Item Translation
Raw feature codes (like `Q13A` or `Q21A`) are automatically mapped to human-readable clinical descriptions:
- `Q13A` $\rightarrow$ *"Feeling sad and depressed"*
- `Q21A` $\rightarrow$ *"Feeling life was not worthwhile"*
- `Q38A` $\rightarrow$ *"Feeling life is empty/meaningless"*
- `Q36A` $\rightarrow$ *"Feeling terrified / panic episodes"*

### Output Format
The frontend receives ranked top contributors to render interactive impact charts:
```json
[
  {
    "feature": "Q13A",
    "description": "Feeling sad and depressed",
    "value": 3.0,
    "impact": 0.842
  },
  {
    "feature": "Q8A",
    "description": "Difficulty relaxing",
    "value": 2.0,
    "impact": 0.415
  }
]
```

---

## 4. Model 3: Deep NLP Emotion Detection (DistilBERT)

### Purpose
When users write free-text notes, journal entries, or describe their day, structured numbers miss nuanced emotional signals. This deep learning model extracts affective states directly from natural language.

### Model Specs
- **Base Architecture**: `DistilBertForSequenceClassification`
- **Model Weights**: `emotion_model/model.safetensors` (~267 MB)
- **Framework**: PyTorch (`torch`) + Hugging Face `transformers`
- **Dataset**: Google **GoEmotions** dataset, covering **27 fine-grained emotion categories**:
  * *Positive*: Admiration, Amusement, Approval, Caring, Curiosity, Desire, Excitement, Gratitude, Joy, Love, Optimism, Pride, Relief.
  * *Negative*: Anger, Annoyance, Disappointment, Disapproval, Disgust, Embarrassment, Fear, Grief, Nervousness, Remorse, Sadness.
  * *Ambiguous / Cognitive*: Confusion, Realization, Surprise, Neutral.

### Output Metrics
1. **Dominant Emotion**: The primary emotional state (e.g., `sadness`, `nervousness`, `optimism`).
2. **Confidence Score**: Probability between 0.0 and 1.0.
3. **Multi-Label Distribution**: Secondary emotions detected in complex entries.
4. **Sentiment Polarity**: Derived classification (`Positive`, `Negative`, or `Neutral`).

---

## 5. Model 4: Generative Wellness Recommendation Engine (LLM)

### Purpose
To translate raw risk levels, SHAP factors, and emotion clusters into personalized, supportive wellness exercises and structured summaries.
*(Note: Emergency crisis intervention, such as suicide helpline routing, is handled by a hardcoded deterministic safety layer in the backend and frontend to prevent hallucinations or API outage vulnerabilities).*

### Setup
- **Provider**: OpenRouter API
- **Model**: `liquid/lfm-2.5-2.6b:free` (or configured OpenRouter model)
- **Input Context Fed to Prompt**:
  - Patient's age and demographic context
  - Depression, Anxiety, and Stress risk levels + probabilities
  - Top 3 SHAP driving symptoms
  - Detected journal emotions
  - Insomnia / sleep duration metrics
- **Generated Sections**:
  1. **Executive Wellness Summary**: A 2-sentence objective summary of the user's screening profile.
  2. **Top Contributing Factors**: Clear explanation of primary reported drivers.
  3. **Immediate Coping Strategies**: 3 actionable, evidence-based self-care exercises (e.g., 4-7-8 breathing, behavioral activation, sleep hygiene).
  4. **Clinician Guidance / Follow-Up**: Recommended standardized follow-ups and specialist consultation prompts if elevated risk is detected.

---

## 6. Model 5: Stepped Adaptive Questioning Engine (Method A)

### Why Stepped Adaptive Screening?
Traditional mental health surveys suffer from two extremes:
1. **Static Monolithic Surveys**: Require patients to answer long, repetitive batteries where many questions feel irrelevant.
2. **Item-by-Item Computerized Adaptive Testing (CAT)**: While mathematically efficient, item-by-item CAT terminates questions early, destroying standard psychometric sum scores (e.g., losing the official 0–27 PHQ-9 or 0–21 GAD-7 scores that psychiatrists and insurance bodies rely upon).

NeuraCare implements **Method A: Section-Level Stepped Adaptive Screening (Two-Stage CAT)**:
- **Stage 1 (Standard Psychometric Core)**: The user completes all items of a validated scale (PHQ-9 or GAD-7), preserving the standard clinical sum score and diagnostic cutoff validity.
- **Stage 2 (Contextual Cluster Deep-Dive)**: The engine analyzes the complete item profile across clinically distinct symptom clusters. If elevated distress is detected in a specific domain, the system triggers dynamic, personalized follow-up questions tailored to that exact symptom profile.

```
┌────────────────────────────────────────────────────────┐
│           Section 1: Standard PHQ-9 (9 items)          │
│              Total Score: 0 - 27 Preserved             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│        Symptom Cluster Identification Algorithm        │
│ - Somatic/Sleep Fatigue: Items 3, 4                     │
│ - Cognitive Self-Criticism: Items 2, 6                 │
│ - Anhedonia / Social Withdrawal: Items 1, 7            │
│ - Crisis Gate: Item 9                                  │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
   Score <= 4 (Minimal)         Score >= 5 (Mild/Mod/High)
   Smoothly advances to         Selects Dominant Cluster
   next section (GAD-7)         & Generates Follow-Ups
                                         │
                                         ▼
                        ┌─────────────────────────────────┐
                        │ Dynamic Deep-Dive Generation    │
                        │ - Primary: OpenRouter LLM       │
                        │ - Fallback: Offline Templates   │
                        └─────────────────────────────────┘
```

---

### 6.1 Clinical Symptom Cluster Taxonomy

The engine (`src/backend/app/services/adaptive_service.py`) groups questionnaire items into validated psychiatric clusters:

#### PHQ-9 Clusters (Depression)
1. **Somatic / Sleep Fatigue (`somatic_fatigue`)**:
   - Items: `Q3` (Sleep disturbances) + `Q4` (Tiredness / low energy).
   - Clinical Focus: Circadian dysregulation, physical exhaustion, daytime drowsiness, and motor sluggishness.
   - Follow-up Inquiries: Probes whether fatigue interferes with daytime occupational tasks, if caffeine/stimulants are relied upon, and sleep hygiene factors.
2. **Cognitive Self-Criticism (`cognitive_worth`)**:
   - Items: `Q2` (Feeling down/hopeless) + `Q6` (Feeling bad about oneself/failure).
   - Clinical Focus: Internalized negative cognitive bias, imposter feelings, guilt, and perceived worthlessness.
   - Follow-up Inquiries: Explores triggers for self-critical internal dialogue and emotional recovery patterns.
3. **Anhedonia & Motivational Deficit (`anhedonia`)**:
   - Items: `Q1` (Little interest or pleasure) + `Q7` (Trouble concentrating).
   - Clinical Focus: Reward system blunting, apathy, procrastination, and concentration disruption.
   - Follow-up Inquiries: Probes when enjoyment was last experienced and social withdrawal habits.
4. **Crisis Gate (`crisis_gate`)**:
   - Items: `Q9` (Thoughts of being better off dead or hurting oneself).
   - Clinical Focus: Acute safety triage. Triggers deterministic crisis banner and emergency resources.

#### GAD-7 Clusters (Anxiety)
1. **Metacognitive Rumination (`rumination`)**:
   - Items: `Q1` (Nervous/anxious) + `Q2` (Uncontrolled worrying) + `Q3` (Worrying about too many things).
   - Clinical Focus: Intrusive thought loops, catastrophe forecasting, and inability to inhibit worry.
   - Follow-up Inquiries: Probes duration of worry spirals and mental techniques used to attempt disengagement.
2. **Somatic Tension (`somatic_tension`)**:
   - Items: `Q4` (Trouble relaxing) + `Q5` (Restlessness, fidgeting).
   - Clinical Focus: Autonomic hyperarousal, muscle tightness, jaw clenching, and physical agitation.
   - Follow-up Inquiries: Evaluates bodily manifestations of stress and physical relaxation difficulty.
3. **Panic Apprehension / Dread (`panic_dread`)**:
   - Items: `Q6` (Irritability) + `Q7` (Feeling afraid as if something awful might happen).
   - Clinical Focus: Sudden autonomic dread, impending doom, shortness of breath, and emotional hyper-reactivity.
   - Follow-up Inquiries: Probes frequency of acute panic sensations and physiological hyperventilation/palpitations.

---

### 6.2 Dual-Path Generation Architecture

To ensure clinical utility without sacrificing uptime, the Stepped Adaptive Engine employs a **dual-path design**:

1. **Path A — Generative AI Prompting (OpenRouter LLM)**:
   - When external LLM inference is available, the engine constructs a clinical prompt specifying:
     * Patient's total scale score and severity category.
     * The identified dominant symptom cluster.
     * Specific high-scoring items.
   - The LLM is instructed via strict JSON schema to generate:
     * `clusterSummary`: A compassionate, 1-to-2 sentence observation explaining the pattern.
     * `followups`: 1 to 2 targeted multiple-choice questions with 4 graduated ordinal choices (0 to 3) assessing functional impairment.
2. **Path B — Offline Deterministic Fallback Engine**:
   - If the LLM call times out, encounters rate limits, or is offline, the system immediately switches to pre-calibrated clinical templates.
   - Every symptom cluster has pre-authored, clinically vetted questions and summaries ready to return in under 5 milliseconds.
   - The user experience remains uninterrupted, fast, and completely seamless.

---

## 7. Multimodal Fusion Engine: Combining Modalities

Single-modality mental health assessments frequently suffer from self-reporting noise and context blind spots. NeuraCare implements a **Weighted Late-Fusion Engine** (`ml_service.py:fuse_predictions`) that integrates structured questionnaire predictions, deep linguistic emotion signals, and somatic sleep indices.

```
  ┌─────────────────────────┐     ┌───────────────────────────┐     ┌──────────────────────────┐
  │ 3x XGBoost Classifiers  │     │  DistilBERT GoEmotions    │     │ Insomnia Severity (ISI)  │
  │ Baseline Probabilities: │     │ Affective Distress vs     │     │ Somatic Sleep Baseline   │
  │ P(Low), P(Mod), P(High) │     │ Protective Valence        │     │ Offset Delta             │
  └────────────┬────────────┘     └─────────────┬─────────────┘     └────────────┬─────────────┘
               │                                │                                │
               │              Scale-Specific Emotion Weight                      │
               │              w_emotion = 0.20 - 0.22                            │
               │                                │              Sleep Weight      │
               │                                │              w_sleep = 0.12 - 0.15
               │                                │                                │
               ▼                                ▼                                ▼
         ┌─────────────────────────────────────────────────────────────────────────────┐
         │                    Weighted Late-Fusion Heuristic Engine                    │
         │  1. Compute Net Emotion: RawDistress - (0.6 * ProtectiveScore)             │
         │  2. Compute Risk Shift: Δ = (w_emotion * NetEmotion) + (w_sleep * Δ_sleep) │
         │  3. Clamp Δ to [-0.35, +0.35]                                              │
         │  4. Recalibrate & Re-normalize Probabilities (Σ P = 1.0)                    │
         │  5. Dynamically Inject NLP & Sleep Factors into Unified SHAP Table          │
         └──────────────────────────────────────┬──────────────────────────────────────┘
                                                │
                                                ▼
                               ┌────────────────────────────────┐
                               │  Calibrated Multi-Modal Result │
                               │  - Reduced Single-Source Bias  │
                               │  - Context-Aware Probabilities │
                               │  - Unified Multimodal XAI      │
                               └────────────────────────────────┘
```

---

### 7.1 Modality Characteristics

| Modality | Inherent Limitation | How Multimodal Integration Helps |
| :--- | :--- | :--- |
| **Questionnaires Only** (PHQ-9 / GAD-7) | **Self-Reporting Bias**: Users may under-report due to stigma, or over-report due to temporary acute frustration. | Affective text analysis and somatic sleep ratings offer complementary signals to adjust probability distributions. |
| **Text NLP Only** (Journal Notes) | **Lack of Clinical Cutoffs**: Free-text sentiment detects emotional tone, but text alone cannot establish clinical diagnosis without structured criteria. | Text modulates questionnaire probabilities via a bounded weight ($w \approx 0.20 - 0.22$), modulating rather than replacing structured survey baselines. |
| **Sleep Only** (Insomnia Index) | **Transdiagnostic Confounder**: Sleep disruption can stem from physical discomfort, travel, or caffeine rather than primary mood disorders. | Sleep serves as a somatic modifier ($w \approx 0.12 - 0.15$), contributing biological load to the overall wellness picture. |

---

### 7.2 The Mathematical Fusion Mechanism

For each psychiatric scale ($S \in \{\text{Depression}, \text{Anxiety}, \text{Stress}\}$), the engine executes:

#### Step 1: Establish the Tabular Baseline
The trained XGBoost classifier produces a baseline probability distribution from the questionnaire:
$$P_0 = [P(\text{Low}), P(\text{Moderate}), P(\text{High})]$$

#### Step 2: Extract Affective Emotion Signals
DistilBERT analyzes the user's free-text journal entry across 27 emotions. These are clustered into distress and protective categories:

- **Depression Distress Cluster**: `sadness` (1.0), `grief` (1.0), `disappointment` (0.7), `remorse` (0.6), `embarrassment` (0.4)
- **Anxiety Distress Cluster**: `fear` (1.0), `nervousness` (1.0), `confusion` (0.5), `embarrassment` (0.4)
- **Stress Distress Cluster**: `anger` (1.0), `annoyance` (0.9), `disgust` (0.6), `nervousness` (0.6)
- **Protective / Resilient Cluster**: `joy` (0.9), `optimism` (0.9), `gratitude` (0.8), `relief` (0.8), `love` (0.7), `pride` (0.6), `admiration` (0.5)

The **Net Emotional Distress** balances vulnerability against resilience:
$$\text{NetEmotion} = \text{Distress} - (0.6 \times \text{ProtectiveScore})$$
*(clamped to $[-1.0, +1.0]$)*

#### Step 3: Compute Somatic Sleep Offset
The Insomnia Severity Index (ISI, 0–28 scale) is normalized against an asymptomatic baseline ($7/28 = 0.25$):
$$\Delta_{\text{sleep}} = \left(\frac{\text{ISI}}{28.0}\right) - 0.25$$

#### Step 4: Compute Combined Shift Delta
The net shift $\Delta$ is computed using preset heuristic weights:
$$\Delta = (w_{\text{emotion}} \times \text{NetEmotion}) + (w_{\text{sleep}} \times \Delta_{\text{sleep}})$$
*(clamped to $[-0.35, +0.35]$)*

| Scale | Emotion Weight ($w_{\text{emotion}}$) | Sleep Weight ($w_{\text{sleep}}$) |
| :--- | :---: | :---: |
| **Depression** | $0.22$ | $0.14$ |
| **Anxiety** | $0.22$ | $0.12$ |
| **Stress** | $0.20$ | $0.15$ |

#### Step 5: Probability Recalibration & Normalization
- If $\Delta > 0$ (Elevated Distress / Severe Sleep Deprivation):
  $$P(\text{High})' = P(\text{High}) + (0.65 \times \Delta)$$
  $$P(\text{Moderate})' = P(\text{Moderate}) + (0.35 \times \Delta)$$
  $$P(\text{Low})' = \max(0.01, P(\text{Low}) - \Delta)$$
- If $\Delta \le 0$ (High Resilience / Healthy Sleep):
  $$P(\text{Low})' = P(\text{Low}) + |\Delta|$$
  $$P(\text{Moderate})' = \max(0.01, P(\text{Moderate}) - 0.5 \times |\Delta|)$$
  $$P(\text{High})' = \max(0.01, P(\text{High}) - 0.5 \times |\Delta|)$$
- Probabilities are re-normalized so $\sum P' = 1.0$.
- Risk classification assigns: High if $P(\text{High})' \ge 0.40$ or dominant, Moderate if $P(\text{Moderate})' \ge 0.35$ or dominant, else Low.

---

## 8. Unified Multimodal Explainability (XAI)

When multiple models are fused, explainability must not be lost. NeuraCare dynamically injects calibrated multimodal factors directly into the SHAP explanation table:

1. **`NLP_Emotional_Tone`**: Injected at the top of the explanation ranking when significant emotional distress or protective optimism is detected, displaying the top emotions and their exact mathematical shift impact.
2. **`ISI_Sleep_Disruption`**: Injected when clinically significant insomnia (ISI $\ge 10$) is present, displaying the sleep contribution severity.

This enables clinicians to see both tabular survey drivers (e.g. *"Feeling sad and depressed"*) and linguistic drivers (e.g. *"Emotional Text Signal (sadness: 84%, fear: 62%)"*) on a single unified chart.

---

## 9. Offline / Fallback Resiliency Mode

Healthcare applications must not crash when an ML server is cold or restarting.

If the Python ML service is unreachable (e.g., tunnel offline or model reloading), the Express backend automatically activates **Heuristic Fallback Mode**:
- Scores are calculated deterministically using validated clinical sum thresholds (PHQ-9 $\ge$ 15 = High Risk; GAD-7 $\ge$ 15 = Severe Anxiety).
- Safe default recommendations and dominant factor estimates are generated.
- Users never experience broken pages, timeouts, or error screens.

---

## 10. Directory Structure of the ML Service

```
src/backend/
├── app/
│   ├── main.py                    # FastAPI application entrypoint & CORS
│   ├── database.py                # Optional direct MongoDB connection
│   ├── models/                    # Serialized machine learning models
│   │   ├── model_depression.pkl   # XGBoost Depression classifier
│   │   ├── model_anxiety.pkl      # XGBoost Anxiety classifier
│   │   ├── model_stress.pkl       # XGBoost Stress classifier
│   │   ├── shap_depression.pkl    # SHAP TreeExplainer for Depression
│   │   ├── shap_anxiety.pkl       # SHAP TreeExplainer for Anxiety
│   │   ├── shap_stress.pkl        # SHAP TreeExplainer for Stress
│   │   ├── features_depression.pkl# Feature schema definitions
│   │   ├── features_anxiety.pkl
│   │   └── features_stress.pkl
│   ├── routes/
│   │   ├── predict.py             # /predict & /adaptive/section-followups endpoints
│   │   ├── health.py              # Health check endpoint
│   │   └── history.py             # Historical evaluations
│   └── services/
│       ├── adaptive_service.py    # Stepped Adaptive Questioning Engine (Method A)
│       ├── ml_service.py          # XGBoost + SHAP inference & item mapping
│       ├── emotion_service.py     # DistilBERT GoEmotions inference
│       ├── llm_recommendations.py # OpenRouter LLM clinical recommendations
│       └── sleep_service.py       # Sleep hygiene & insomnia risk calculation
├── requirements.txt               # Python package dependencies
└── .venv/                         # Local Python virtual environment

emotion_model/                     # DistilBERT Transformer Weights
├── config.json                    # DistilBERT architecture configuration
├── model.safetensors              # 267 MB model weights
├── tokenizer.json                 # HuggingFace tokenizer vocabulary
└── tokenizer_config.json          # Tokenizer settings
```

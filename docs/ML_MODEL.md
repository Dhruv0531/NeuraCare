# NeuraCare Machine Learning & AI Architecture

This document provides a comprehensive, end-to-end explanation of the AI/ML architecture powering NeuraCare. It details how multiple models work together to assess mental health risks, extract emotional context, generate explainable insights, and produce clinical recommendations.

---

## 1. High-Level AI/ML Overview

NeuraCare does not rely on a single model. Instead, it utilizes a **multi-model hybrid ensemble** combining classical tabular machine learning, deep NLP transformers, explainable AI (XAI), and large language models (LLMs):

```
                        ┌──────────────────────────────────────┐
                        │          User Assessment             │
                        │  (Questionnaires + Journal Entry)    │
                        └──────────────────┬───────────────────┘
                                           │
                   ┌───────────────────────┴───────────────────────┐
                   ▼                                               ▼
     ┌───────────────────────────┐                   ┌───────────────────────────┐
     │  Tabular Questionnaire    │                   │   Free-Text Journal Note  │
     │  (DASS-42 / PHQ-9 / GAD-7)│                   │      (User Expression)    │
     └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                   │                                               │
                   ▼                                               ▼
     ┌───────────────────────────┐                   ┌───────────────────────────┐
     │  3x XGBoost Classifiers   │                   │ DistilBERT Emotion Model  │
     │  - Depression Risk        │                   │ (Fine-Tuned GoEmotions)   │
     │  - Anxiety Risk           │                   │ - 27 Fine-Grained Emotions│
     │  - Stress Risk            │                   │ - Valence & Intensity     │
     └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                   │                                               │
                   ▼                                               │
     ┌───────────────────────────┐                                 │
     │    SHAP TreeExplainer     │                                 │
     │ - Exact Feature Impact    │                                 │
     │ - Clinical Factor Ranking │                                 │
     └─────────────┬─────────────┘                                 │
                   │                                               │
                   └───────────────────────┬───────────────────────┘
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

## 6. Multimodal Fusion Engine: Combining Modalities

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
         │  3. Clamp Δ to [-0.35, +0.35] (Mathematical range ~ [-0.25, +0.33])         │
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

### 6.1 Modality Characteristics

| Modality | Inherent Limitation | How Multimodal Integration Helps |
| :--- | :--- | :--- |
| **Questionnaires Only** (PHQ-9 / GAD-7) | **Self-Reporting Bias**: Users may under-report due to stigma, or over-report due to temporary acute frustration. | Affective text analysis and somatic sleep ratings offer complementary signals to adjust probability distributions. |
| **Text NLP Only** (Journal Notes) | **Lack of Clinical Cutoffs**: Free-text sentiment detects emotional tone, but text alone cannot establish clinical diagnosis without structured criteria. | Text modulates questionnaire probabilities via a bounded weight ($w \approx 0.20 - 0.22$), modulating rather than replacing structured survey baselines. |
| **Sleep Only** (Insomnia Index) | **Transdiagnostic Confounder**: Sleep disruption can stem from physical discomfort, travel, or caffeine rather than primary mood disorders. | Sleep serves as a somatic modifier ($w \approx 0.12 - 0.15$), contributing biological load to the overall wellness picture. |

---

### 6.2 The Mathematical Fusion Mechanism

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
*(With max emotion weight $0.22$ and max sleep weight $0.15 \times 0.75$, the mathematical maximum possible $\Delta \approx 0.3325$).*

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
- Risk classification assigns: High if $P(\text{High})' \ge 0.40$ or dominant, Moderate if $P(\text{Moderate})' \ge 0.35$ or dominant, else Low.xtract Affective Emotion Signals
DistilBERT analyzes the user's free-text journal entry across 27 emotions. These are clustered into clinical distress and protective categories:

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

#### Step 4: Calibrate the Combined Shift Delta
The net shift $\Delta$ is computed using clinically calibrated modality weights:
$$\Delta = (w_{\text{emotion}} \times \text{NetEmotion}) + (w_{\text{sleep}} \times \Delta_{\text{sleep}})$$
*(clamped to $[-0.35, +0.35]$ to prevent extreme single-modality distortion)*

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
- If $\Delta < 0$ (High Resilience / Healthy Sleep):
  Probability mass smoothly shifts toward $P(\text{Low})'$.
- Probabilities are re-normalized so $\sum P' = 1.0$.

---

### 6.3 Unified Multimodal Explainability (XAI)

When multiple models are fused, explainability must not be lost. NeuraCare dynamically injects calibrated multimodal factors directly into the SHAP explanation table:

1. **`NLP_Emotional_Tone`**: Injected at the top of the explanation ranking when significant emotional distress or protective optimism is detected, displaying the top emotions and their exact mathematical shift impact.
2. **`ISI_Sleep_Disruption`**: Injected when clinically significant insomnia (ISI $\ge 10$) is present, displaying the sleep contribution severity.

This enables clinicians to see both tabular survey drivers (e.g. *"Feeling sad and depressed"*) and linguistic drivers (e.g. *"Emotional Text Signal (sadness: 84%, fear: 62%)"*) on a single unified chart.

---

## 7. Offline / Fallback Resiliency Mode

Healthcare applications must not crash when an ML server is cold or restarting.

If the Python ML service is unreachable (e.g., tunnel offline or model reloading), the Express backend automatically activates **Heuristic Fallback Mode**:
- Scores are calculated deterministically using validated clinical sum thresholds (PHQ-9 $\ge$ 15 = High Risk; GAD-7 $\ge$ 15 = Severe Anxiety).
- Safe default recommendations and dominant factor estimates are generated.
- Users never experience broken pages, timeouts, or error screens.

---

## 8. Directory Structure of the ML Service

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
│   │   ├── predict.py             # /predict endpoint (orchestrates ML pipeline)
│   │   ├── health.py              # Health check endpoint
│   │   └── history.py             # Historical evaluations
│   └── services/
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

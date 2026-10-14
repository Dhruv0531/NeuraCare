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
- Trained on clinical benchmark survey data using the **DASS-42** (Depression, Anxiety, and Stress Scale) structure plus demographic indicators.
- **Input Features**:
  - `Q1A` through `Q42A`: Clinical item responses (scored 0–3 based on symptom frequency/severity).
  - Demographic features: `age`, `gender`, `education`, `urban`, `religion`, `orientation`, `race`, `married`, `familysize`.

### Dynamic Mapping Compatibility
Patients rarely fill out all 42 DASS questions in modern apps. The preprocessing pipeline (`ml_service.py`) dynamically maps shorter instruments:
- **PHQ-9 (Patient Health Questionnaire-9)**: Mapped to depressive scale items (e.g., loss of interest, sleep disruption, feelings of worthlessness).
- **GAD-7 (Generalized Anxiety Disorder-7)**: Mapped to somatic and cognitive anxiety scale items (e.g., nervousness, inability to relax, panic apprehension).
- **Normalized Fallback**: If standard mappings are partially provided, proportional scaling is applied to preserve probabilistic validity without bias.

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
- `Q21A` $\rightarrow$ *"Feeling life is meaningless"*
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
3. **Multi-Label Distribution**: Secondary emotions detected in complex entries (e.g., mixed feelings of `sadness` and `love`).
4. **Sentiment Polarity**: Derived classification (`Positive`, `Negative`, or `Neutral`).

---

## 5. Model 4: Generative Clinical Recommendation Engine (LLM)

### Purpose
To translate raw probabilities, SHAP factors, and emotion scores into compassionate, medically sound, and practical guidance for both the user and clinician.

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
  1. **Executive Clinical Summary**: A 2-sentence objective assessment of the patient's state.
  2. **Top Contributing Factors**: Clear explanation of what is driving their distress.
  3. **Immediate Coping Strategies**: 3 actionable, evidence-based self-care exercises (e.g., 4-7-8 breathing, behavioral activation, sleep restriction).
  4. **Clinician Guidance / Follow-Up**: Recommended standardized follow-ups and crisis escalation guidance if severe risk is detected.

---

## 6. Offline / Fallback Resiliency Mode

Healthcare applications must not crash when an ML server is cold or restarting.

If the Python ML service is unreachable (e.g., tunnel offline or model reloading), the Express backend automatically activates **Heuristic Fallback Mode**:
- Scores are calculated deterministically using validated clinical sum thresholds (PHQ-9 $\ge$ 15 = High Risk; GAD-7 $\ge$ 15 = Severe Anxiety).
- Safe default recommendations and dominant factor estimates are generated.
- Users never experience broken pages, timeouts, or error screens.

---

## 7. Directory Structure of the ML Service

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

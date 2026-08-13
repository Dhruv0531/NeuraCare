import os
import pickle
import numpy as np
import pandas as pd
import shap

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

DASS_ITEM_DESCRIPTIONS = {
    "Q1A": "Difficulty winding down",
    "Q2A": "Dryness of mouth",
    "Q3A": "Absence of positive feelings",
    "Q4A": "Breathing difficulty",
    "Q5A": "Difficulty taking initiative",
    "Q6A": "Over-reacting to situations",
    "Q7A": "Trembling / shakiness",
    "Q8A": "Difficulty relaxing",
    "Q9A": "Anxiety in specific situations",
    "Q10A": "Nothing to look forward to",
    "Q11A": "Getting upset easily",
    "Q12A": "Using nervous energy",
    "Q13A": "Feeling sad and depressed",
    "Q14A": "Impatience",
    "Q15A": "Feeling faint",
    "Q16A": "Loss of interest in activities",
    "Q17A": "Feeling worth little as a person",
    "Q18A": "Touchiness / sensitivity",
    "Q19A": "Heart awareness / palpitations",
    "Q20A": "Feeling scared without reason",
    "Q21A": "Feeling life is meaningless",
    "Q22A": "Hard to calm down after upset",
    "Q23A": "Fear of trivial tasks",
    "Q24A": "Lack of enthusiasm",
    "Q25A": "Panic / worry about panic",
    "Q26A": "Feeling down-hearted and blue",
    "Q27A": "Irritability",
    "Q28A": "Close to panic",
    "Q29A": "Nervous agitation",
    "Q30A": "Apprehension about tasks",
    "Q31A": "Lack of enthusiasm for tasks",
    "Q32A": "Intolerance of interruptions",
    "Q33A": "Nervous tension",
    "Q34A": "Feeling worthless",
    "Q35A": "Intolerance of delays",
    "Q36A": "Feeling terrified",
    "Q37A": "Hopelessness about future",
    "Q38A": "Feeling life is empty",
    "Q39A": "Agitation",
    "Q40A": "Worry about panic",
    "Q41A": "Trembling hands/body",
    "Q42A": "Difficulty getting motivated",
    "age": "Age",
    "gender": "Gender",
    "education": "Education level",
    "urban": "Living area (Urban/Rural)",
    "religion": "Religion",
    "orientation": "Sexual orientation",
    "race": "Race",
    "married": "Marital status",
    "familysize": "Family size"
}

LEVEL_MAPPING = {
    0: "Low",
    1: "Moderate",
    2: "High"
}

class MLService:
    def __init__(self):
        self.models = {}
        self.explainers = {}
        self.feature_names = []
        self.load_models()

    def load_models(self):
        try:
            feat_path = os.path.join(MODELS_DIR, "features_depression.pkl")
            if os.path.exists(feat_path):
                with open(feat_path, "rb") as f:
                    self.feature_names = pickle.load(f)
            else:
                self.feature_names = [f"Q{i}A" for i in range(1, 43)] + [
                    "age", "gender", "education", "urban", "religion",
                    "orientation", "race", "married", "familysize"
                ]

            for scale in ["depression", "anxiety", "stress"]:
                m_path = os.path.join(MODELS_DIR, f"model_{scale}.pkl")
                if os.path.exists(m_path):
                    with open(m_path, "rb") as f:
                        model = pickle.load(f)
                        self.models[scale] = model
                        self.explainers[scale] = shap.TreeExplainer(model)
                    print(f"Loaded ML model for {scale}")
                else:
                    print(f"Warning: Model file not found at {m_path}")
        except Exception as e:
            print(f"Error loading ML models: {e}")

    def predict_scale(self, scale: str, df: pd.DataFrame):
        if scale not in self.models:
            return {"level": "Low", "score": 0, "probabilities": {"low": 1.0, "moderate": 0.0, "high": 0.0}, "shap_explanation": []}

        model = self.models[scale]
        explainer = self.explainers[scale]

        # Ensure correct column order
        df_feats = df[self.feature_names].astype(float)

        pred_class = int(model.predict(df_feats)[0])
        probas = model.predict_proba(df_feats)[0] if hasattr(model, "predict_proba") else [0.0, 0.0, 0.0]

        level_str = LEVEL_MAPPING.get(pred_class, "Low")

        # Compute SHAP explanation for this sample
        shap_explanation = []
        try:
            sv = explainer(df_feats)
            values = sv.values # shape: (1, n_features, n_classes) or (1, n_features)
            if len(values.shape) == 3:
                class_shap = values[0, :, pred_class]
            else:
                class_shap = values[0, :]

            # Get top 5 factors (positive or negative)
            feature_impacts = []
            for idx, f_name in enumerate(self.feature_names):
                impact = float(class_shap[idx])
                val = float(df_feats.iloc[0][f_name])
                feature_impacts.append({
                    "feature": f_name,
                    "description": DASS_ITEM_DESCRIPTIONS.get(f_name, f_name),
                    "value": val,
                    "impact": round(impact, 4)
                })

            # Sort by absolute impact magnitude
            feature_impacts.sort(key=lambda x: abs(x["impact"]), reverse=True)
            shap_explanation = feature_impacts[:5]
        except Exception as e:
            print(f"Error computing SHAP for {scale}: {e}")

        return {
            "level": level_str,
            "score": pred_class,
            "probabilities": {
                "low": round(float(probas[0]), 4),
                "moderate": round(float(probas[1]), 4) if len(probas) > 1 else 0.0,
                "high": round(float(probas[2]), 4) if len(probas) > 2 else 0.0,
            },
            "shap_explanation": shap_explanation
        }

    def predict_all(self, input_data: dict):
        # Format input dict into DataFrame matching feature_names
        row = {}
        for f in self.feature_names:
            row[f] = float(input_data.get(f, 0))

        df = pd.DataFrame([row], columns=self.feature_names)

        return {
            "depression": self.predict_scale("depression", df),
            "anxiety": self.predict_scale("anxiety", df),
            "stress": self.predict_scale("stress", df)
        }

ml_service = MLService()

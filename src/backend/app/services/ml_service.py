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

def safe_float_convert(val, feature_name=""):
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        val_str = val.strip()
        try:
            return float(val_str)
        except ValueError:
            pass

        val_lower = val_str.lower()
        if feature_name == "gender":
            if "female" in val_lower: return 2.0
            if "male" in val_lower: return 1.0
            return 3.0
        elif feature_name == "education":
            if "school" in val_lower: return 1.0
            if "undergrad" in val_lower: return 2.0
            if "postgrad" in val_lower: return 3.0
            if "doc" in val_lower: return 4.0
            return 2.0
        elif feature_name == "urban":
            if "rural" in val_lower: return 2.0
            return 1.0
        elif feature_name == "married":
            if "married" in val_lower: return 2.0
            if "widow" in val_lower or "divorced" in val_lower: return 3.0
            return 1.0
        elif feature_name == "age":
            if "below 18" in val_lower or "<18" in val_lower: return 16.0
            if "18-24" in val_lower: return 21.0
            if "25-34" in val_lower: return 29.0
            if "35-44" in val_lower: return 39.0
            if "45-54" in val_lower: return 49.0
            if "55" in val_lower: return 60.0
            return 25.0

    return 0.0


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

        df_feats = df[self.feature_names].astype(float)

        probas = model.predict_proba(df_feats)[0] if hasattr(model, "predict_proba") else [0.0, 0.0, 0.0]
        pred_class = int(np.argmax(probas)) if len(probas) > 0 else 0

        level_str = LEVEL_MAPPING.get(pred_class, "Low")

        shap_explanation = []
        try:
            sv = explainer(df_feats)
            values = sv.values
            # If 3D array (samples, features, classes), extract class 1 & 2 (Moderate & High risk contribution)
            if len(values.shape) == 3:
                # Class 2 (High Risk) or Class 1 (Moderate Risk) contribution
                risk_class = pred_class if pred_class > 0 else 2
                class_shap = values[0, :, risk_class]
            else:
                class_shap = values[0, :]

            feature_impacts = []
            for idx, f_name in enumerate(self.feature_names):
                val = float(df_feats.iloc[0][f_name])
                raw_impact = float(class_shap[idx])
                
                # If value is 0, the symptom was absent (0 impact towards risk)
                # If value > 0, the symptom contributed positively to risk
                if val == 0:
                    adjusted_impact = 0.0
                else:
                    adjusted_impact = round(raw_impact, 4)

                feature_impacts.append({
                    "feature": f_name,
                    "description": DASS_ITEM_DESCRIPTIONS.get(f_name, f_name),
                    "value": val,
                    "impact": adjusted_impact
                })

            # Sort by value > 0 first, then by impact magnitude
            feature_impacts.sort(key=lambda x: (x["value"] > 0, abs(x["impact"])), reverse=True)
            shap_explanation = feature_impacts[:5]
        except Exception as e:
            print(f"Error computing SHAP for {scale}: {e}")

        return {
            "level": level_str,
            "label": level_str,
            "score": pred_class,
            "probabilities": {
                "low": round(float(probas[0]), 4),
                "moderate": round(float(probas[1]), 4) if len(probas) > 1 else 0.0,
                "high": round(float(probas[2]), 4) if len(probas) > 2 else 0.0,
            },
            "shap_explanation": shap_explanation
        }

    def predict_all(self, input_data: dict):
        row = {}

        # If input came from Next.js PHQ-9/GAD-7 format without Q1A..Q42A
        phq_keys = ['phq_interest','phq_depressed','phq_sleep','phq_tired','phq_appetite','phq_failure','phq_concentrate','phq_slow_restless','phq_self_harm']
        gad_keys = ['gad_nervous','gad_cant_stop','gad_worry_much','gad_relax','gad_restless','gad_irritable','gad_afraid']

        has_dass_items = any(f"Q{i}A" in input_data for i in range(1, 43))
        has_phq_items = any(k in input_data for k in phq_keys)

        # Base DASS items
        for f in self.feature_names:
            if f.startswith("Q"):
                if has_dass_items:
                    row[f] = safe_float_convert(input_data.get(f, 0), f)
                elif has_phq_items:
                    # Estimate DASS item intensity from PHQ/GAD answers
                    phq_sum = sum(safe_float_convert(input_data.get(k, 0)) for k in phq_keys)
                    gad_sum = sum(safe_float_convert(input_data.get(k, 0)) for k in gad_keys)
                    # DASS items 0..3 rating scale
                    if f in ["Q3A", "Q5A", "Q10A", "Q13A", "Q16A", "Q17A", "Q21A", "Q24A", "Q26A", "Q31A", "Q34A", "Q37A", "Q38A", "Q42A"]:
                        row[f] = min(3.0, round(phq_sum / 9.0))
                    elif f in ["Q2A", "Q4A", "Q7A", "Q9A", "Q15A", "Q19A", "Q20A", "Q23A", "Q25A", "Q28A", "Q30A", "Q36A", "Q40A", "Q41A"]:
                        row[f] = min(3.0, round(gad_sum / 7.0))
                    else:
                        row[f] = min(3.0, round((phq_sum + gad_sum) / 16.0))
                else:
                    row[f] = 0.0
            else:
                raw_val = input_data.get(f)
                if raw_val is None and f == "age":
                    raw_val = input_data.get("age_group")
                row[f] = safe_float_convert(raw_val, f)

        df = pd.DataFrame([row], columns=self.feature_names)

        return {
            "depression": self.predict_scale("depression", df),
            "anxiety": self.predict_scale("anxiety", df),
            "stress": self.predict_scale("stress", df)
        }

ml_service = MLService()

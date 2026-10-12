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

        # Specific item-level mapping from PHQ-9 & GAD-7 to DASS items
        SPECIFIC_MAPPINGS = {
            "Q13A": "phq_depressed",       # Feeling sad and depressed
            "Q3A":  "phq_interest",        # Absence of positive feelings
            "Q16A": "phq_interest",        # Loss of interest in activities
            "Q26A": "phq_depressed",       # Feeling down-hearted and blue
            "Q17A": "phq_failure",         # Feeling worth little as a person
            "Q34A": "phq_failure",         # Feeling worthless
            "Q37A": "phq_depressed",       # Hopelessness about future
            "Q38A": "phq_interest",        # Feeling life is empty
            "Q21A": "phq_self_harm",       # Feeling life is meaningless
            "Q42A": "phq_tired",           # Difficulty getting motivated
            "Q5A":  "phq_tired",           # Difficulty taking initiative
            "Q10A": "phq_interest",        # Nothing to look forward to
            "Q24A": "phq_interest",        # Lack of enthusiasm
            "Q31A": "phq_tired",           # Lack of enthusiasm for tasks
            
            "Q9A":  "gad_nervous",         # Anxiety in specific situations
            "Q20A": "gad_afraid",          # Feeling scared without reason
            "Q23A": "gad_afraid",          # Fear of trivial tasks
            "Q25A": "gad_afraid",          # Panic / worry about panic
            "Q28A": "gad_afraid",          # Close to panic
            "Q36A": "gad_afraid",          # Feeling terrified
            "Q40A": "gad_worry_much",      # Worry about panic
            "Q2A":  "gad_nervous",         # Dryness of mouth
            "Q4A":  "gad_nervous",         # Breathing difficulty
            "Q7A":  "gad_nervous",         # Trembling / shakiness
            "Q15A": "gad_nervous",         # Feeling faint
            "Q19A": "gad_nervous",         # Heart awareness / palpitations
            "Q41A": "gad_nervous",         # Trembling hands/body
            "Q30A": "gad_worry_much",      # Apprehension about tasks
            
            "Q1A":  "gad_relax",           # Difficulty winding down
            "Q8A":  "gad_relax",           # Difficulty relaxing
            "Q11A": "gad_irritable",       # Getting upset easily
            "Q12A": "gad_restless",        # Using nervous energy
            "Q14A": "gad_irritable",       # Impatience
            "Q18A": "gad_irritable",       # Touchiness / sensitivity
            "Q22A": "gad_relax",           # Hard to calm down after upset
            "Q27A": "gad_irritable",       # Irritability
            "Q29A": "gad_restless",        # Nervous agitation
            "Q32A": "gad_irritable",       # Intolerance of interruptions
            "Q33A": "gad_relax",           # Nervous tension
            "Q35A": "gad_irritable",       # Intolerance of delays
            "Q39A": "gad_restless",        # Agitation
            "Q6A":  "gad_irritable",       # Over-reacting to situations
        }

        # Base DASS items
        for f in self.feature_names:
            if f.startswith("Q"):
                if has_dass_items:
                    row[f] = safe_float_convert(input_data.get(f, 0), f)
                elif has_phq_items:
                    if f in SPECIFIC_MAPPINGS and SPECIFIC_MAPPINGS[f] in input_data:
                        row[f] = min(3.0, safe_float_convert(input_data[SPECIFIC_MAPPINGS[f]], f))
                    else:
                        phq_sum = sum(safe_float_convert(input_data.get(k, 0)) for k in phq_keys)
                        gad_sum = sum(safe_float_convert(input_data.get(k, 0)) for k in gad_keys)
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

    def fuse_predictions(self, ml_results: dict, emotion_result: dict, sleep_result: dict) -> dict:
        """
        Multimodal late-fusion engine:
        Dynamically fuses tabular questionnaire predictions (XGBoost),
        NLP journal emotion analysis (GoEmotions DistilBERT),
        and Insomnia Severity Index (ISI).
        """
        emotions_list = emotion_result.get("emotions", []) if isinstance(emotion_result, dict) else []
        emotion_map = {e.get("label", ""): float(e.get("score", 0.0)) for e in emotions_list if isinstance(e, dict)}
        has_text_emotions = emotion_result.get("status") == "success" and len(emotion_map) > 0

        # Emotion clusters
        DEPRESSION_DISTRESS_EMOTIONS = {
            "sadness": 1.0, "grief": 1.0, "disappointment": 0.7, 
            "remorse": 0.6, "embarrassment": 0.4, "disapproval": 0.3
        }
        ANXIETY_DISTRESS_EMOTIONS = {
            "fear": 1.0, "nervousness": 1.0, "confusion": 0.5, "embarrassment": 0.4
        }
        STRESS_DISTRESS_EMOTIONS = {
            "anger": 1.0, "annoyance": 0.9, "disgust": 0.6, "nervousness": 0.6, "disappointment": 0.5
        }
        PROTECTIVE_EMOTIONS = {
            "joy": 0.9, "optimism": 0.9, "gratitude": 0.8, "relief": 0.8, 
            "love": 0.7, "pride": 0.6, "admiration": 0.5, "amusement": 0.4
        }

        # Compute protective score
        prot_score = sum(weight * emotion_map.get(lbl, 0.0) for lbl, weight in PROTECTIVE_EMOTIONS.items())

        # Sleep index (ISI max 28)
        sleep_score = float(sleep_result.get("score", 0.0)) if isinstance(sleep_result, dict) else 0.0
        sleep_norm = min(1.0, max(0.0, sleep_score / 28.0))
        # Sleep baseline offset (ISI <= 7 is normal, 8-14 is mild/subthreshold, 15+ is moderate/severe insomnia)
        sleep_delta = (sleep_norm - 0.25)  # Range ~ [-0.25, 0.75]

        scale_emotion_configs = {
            "depression": (DEPRESSION_DISTRESS_EMOTIONS, 0.22, 0.14),
            "anxiety": (ANXIETY_DISTRESS_EMOTIONS, 0.22, 0.12),
            "stress": (STRESS_DISTRESS_EMOTIONS, 0.20, 0.15)
        }

        fused = {}

        for scale in ["depression", "anxiety", "stress"]:
            base = ml_results.get(scale, {
                "level": "Low", "label": "Low", "score": 0,
                "probabilities": {"low": 1.0, "moderate": 0.0, "high": 0.0},
                "shap_explanation": []
            })
            base_probas = base.get("probabilities", {"low": 1.0, "moderate": 0.0, "high": 0.0})
            p_low = float(base_probas.get("low", 1.0))
            p_mod = float(base_probas.get("moderate", 0.0))
            p_high = float(base_probas.get("high", 0.0))

            distress_dict, emotion_weight, sleep_weight = scale_emotion_configs[scale]

            # Calculate emotion distress score for this scale
            if has_text_emotions:
                raw_distress = sum(weight * emotion_map.get(lbl, 0.0) for lbl, weight in distress_dict.items())
                net_emotion = max(-1.0, min(1.0, raw_distress - (0.6 * prot_score)))
            else:
                net_emotion = 0.0

            # Compute risk shift delta
            delta = 0.0
            if has_text_emotions:
                delta += emotion_weight * net_emotion
            delta += sleep_weight * sleep_delta
            # Clamp delta to prevent over-skewing
            delta = max(-0.35, min(0.35, delta))

            # Calibrate probabilities
            if delta > 0:
                p_high_new = p_high + (delta * 0.65)
                p_mod_new = p_mod + (delta * 0.35)
                p_low_new = max(0.01, p_low - delta)
            else:
                abs_d = abs(delta)
                p_low_new = p_low + abs_d
                p_mod_new = max(0.01, p_mod - (abs_d * 0.5))
                p_high_new = max(0.01, p_high - (abs_d * 0.5))

            # Normalize probabilities to sum to 1.0
            total_p = p_low_new + p_mod_new + p_high_new
            p_low_norm = round(p_low_new / total_p, 4)
            p_mod_norm = round(p_mod_new / total_p, 4)
            p_high_norm = round(p_high_new / total_p, 4)

            # Re-determine classification level based on calibrated distribution
            if p_high_norm >= 0.40 or (p_high_norm >= p_mod_norm and p_high_norm >= p_low_norm):
                new_level = "High"
                new_score = 2
            elif p_mod_norm >= 0.35 or (p_mod_norm >= p_low_norm):
                new_level = "Moderate"
                new_score = 1
            else:
                new_level = "Low"
                new_score = 0

            # Construct SHAP explanations + Multimodal calibration factors
            combined_explanations = list(base.get("shap_explanation", []))
            if has_text_emotions and abs(net_emotion) >= 0.10:
                top_emotions_str = ", ".join([f"{e.get('label')}: {int(e.get('score', 0)*100)}%" for e in emotions_list[:2]])
                combined_explanations.insert(0, {
                    "feature": "NLP_Emotional_Tone",
                    "description": f"Emotional Text Signal ({top_emotions_str})",
                    "value": round(net_emotion, 2),
                    "impact": round(emotion_weight * net_emotion, 4)
                })

            if sleep_score >= 10:
                combined_explanations.insert(1, {
                    "feature": "ISI_Sleep_Disruption",
                    "description": f"Sleep Disruption Severity ({int(sleep_score)}/28 ISI)",
                    "value": round(sleep_score, 1),
                    "impact": round(sleep_weight * sleep_delta, 4)
                })

            fused[scale] = {
                "level": new_level,
                "label": new_level,
                "score": new_score,
                "probabilities": {
                    "low": p_low_norm,
                    "moderate": p_mod_norm,
                    "high": p_high_norm
                },
                "shap_explanation": combined_explanations[:5],
                "base_prediction": {
                    "level": base.get("level"),
                    "probabilities": base_probas
                },
                "fusion_adjustment": round(delta, 4)
            }

        # Calculate clinically weighted overall score (0 - 100)
        dep_pct = (fused["depression"]["probabilities"]["moderate"] * 50.0) + (fused["depression"]["probabilities"]["high"] * 100.0)
        anx_pct = (fused["anxiety"]["probabilities"]["moderate"] * 50.0) + (fused["anxiety"]["probabilities"]["high"] * 100.0)
        str_pct = (fused["stress"]["probabilities"]["moderate"] * 50.0) + (fused["stress"]["probabilities"]["high"] * 100.0)
        sleep_pct = (sleep_score / 28.0) * 100.0

        overall_score = int(round(
            (dep_pct * 0.35) + (anx_pct * 0.30) + (str_pct * 0.20) + (sleep_pct * 0.15)
        ))
        overall_score = max(5, min(98, overall_score))

        fused["overall_score"] = overall_score
        fused["overallScore"] = overall_score
        fused["fusion_metadata"] = {
            "has_text_emotions": has_text_emotions,
            "sleep_score": sleep_score,
            "top_emotions": emotions_list[:3] if has_text_emotions else []
        }
        return fused

ml_service = MLService()


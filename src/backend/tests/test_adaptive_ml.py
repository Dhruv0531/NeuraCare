import os
import sys
import pytest

# Ensure src/backend is in python path
src_backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if src_backend_path not in sys.path:
    sys.path.insert(0, src_backend_path)

from app.services.adaptive_service import SteppedAdaptiveEngine
from app.services.sleep_service import calculate_sleep_score
from app.services.ml_service import ml_service


class TestSteppedAdaptiveEngine:
    @classmethod
    def setup_class(cls):
        cls.engine = SteppedAdaptiveEngine()

    def test_phq9_somatic_fatigue_cluster(self):
        answers = {
            "phq_interest": 1, "phq_depressed": 1, "phq_sleep": 3, "phq_tired": 3,
            "phq_appetite": 2, "phq_failure": 0, "phq_concentrate": 0,
            "phq_slow_restless": 0, "phq_self_harm": 0
        }
        res = self.engine.analyze_phq9_and_generate_followups(answers)
        assert res["severity"] == "Moderate"
        assert res["total_score"] == 10
        assert res["crisis_flag"] is False
        assert any(term in res["dominant_cluster"] for term in ["Fatigue", "Sleep", "Physical"])
        assert len(res["followup_questions"]) > 0

    def test_phq9_crisis_gate_priority(self):
        answers = {
            "phq_interest": 1, "phq_depressed": 2, "phq_sleep": 1, "phq_tired": 1,
            "phq_appetite": 0, "phq_failure": 1, "phq_concentrate": 1,
            "phq_slow_restless": 0, "phq_self_harm": 2
        }
        res = self.engine.analyze_phq9_and_generate_followups(answers)
        assert res["crisis_flag"] is True
        assert any(term in res["dominant_cluster"] for term in ["Crisis", "Safety", "Distress"])

    def test_phq9_cognitive_worth_cluster(self):
        answers = {
            "phq_interest": 0, "phq_depressed": 1, "phq_sleep": 0, "phq_tired": 0,
            "phq_appetite": 0, "phq_failure": 3, "phq_concentrate": 3,
            "phq_slow_restless": 0, "phq_self_harm": 0
        }
        res = self.engine.analyze_phq9_and_generate_followups(answers)
        assert any(term in res["dominant_cluster"] for term in ["Cognitive", "Criticism", "Concentration"])

    def test_gad7_rumination_cluster(self):
        answers = {
            "gad_nervous": 3, "gad_cant_stop": 3, "gad_worry_much": 2,
            "gad_relax": 0, "gad_restless": 0, "gad_irritable": 0, "gad_afraid": 0
        }
        res = self.engine.analyze_gad7_and_generate_followups(answers)
        assert res["severity"] == "Mild"
        assert res["total_score"] == 8
        assert any(term in res["dominant_cluster"] for term in ["Worry", "Racing", "Rumination"])

    def test_gad7_somatic_tension_cluster(self):
        answers = {
            "gad_nervous": 0, "gad_cant_stop": 0, "gad_worry_much": 0,
            "gad_relax": 3, "gad_restless": 3, "gad_irritable": 0, "gad_afraid": 0
        }
        res = self.engine.analyze_gad7_and_generate_followups(answers)
        assert any(term in res["dominant_cluster"] for term in ["Restlessness", "Tension", "Physiological"])

    def test_minimal_asymptomatic_flow(self):
        zero_answers = {
            "phq_interest": 0, "phq_depressed": 0, "phq_sleep": 0, "phq_tired": 0,
            "phq_appetite": 0, "phq_failure": 0, "phq_concentrate": 0,
            "phq_slow_restless": 0, "phq_self_harm": 0
        }
        res = self.engine.analyze_phq9_and_generate_followups(zero_answers)
        assert res["severity"] == "Minimal"
        assert res["total_score"] == 0
        assert any(term in res["dominant_cluster"] for term in ["Balance", "Resilience"])


class TestSleepAndMLPipeline:
    def test_insomnia_severity_index(self):
        answers = [2, 2, 2, 1, 1, 1, 2]  # sum = 11
        isi = calculate_sleep_score(answers)
        assert isi["score"] == 11
        assert isi["level"] == "Moderate"
        assert "Subthreshold" in isi["category"]

    def test_xgboost_inference_and_fusion(self):
        base_survey = {
            "Q1A": 1, "Q2A": 1, "Q3A": 1, "Q13A": 2, "Q21A": 1,
            "age": "25-34", "gender": "Female", "education": "Postgraduate",
            "urban": "Urban", "married": "Single"
        }
        pred = ml_service.predict_all(base_survey)
        assert "depression" in pred
        assert "anxiety" in pred
        assert "stress" in pred

        # Test Late-Fusion
        emotions = {
            "status": "success",
            "emotions": [
                {"label": "sadness", "score": 0.85},
                {"label": "fear", "score": 0.60}
            ]
        }
        sleep_calc = {"score": 14, "level": "Moderate", "category": "Subthreshold insomnia"}
        fused = ml_service.fuse_predictions(
            ml_results=pred,
            emotion_result=emotions,
            sleep_result=sleep_calc
        )
        assert "depression" in fused
        assert "fusion_metadata" in fused
        assert "overallScore" in fused

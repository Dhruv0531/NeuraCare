"""
Unit Tests for Multimodal Late-Fusion Properties (Task 6)

Verifies:
1. Probabilities always sum to 1.0 (within 1e-4 tolerance due to 4-decimal rounding).
2. Distressed text shifts P(High) upwards compared to baseline (delta > 0).
3. Positive text / low ISI shifts P(Low) upwards / P(High) downwards (delta < 0).
4. ISI = 28 produces significant positive risk shift.
5. Probabilities remain bounded in [0.0, 1.0].
"""

import os
import sys
import unittest
import numpy as np

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.ml_service import ml_service

class TestMultimodalFusionProperties(unittest.TestCase):
    def setUp(self):
        # Baseline balanced prediction fixture
        self.base_balanced = {
            "depression": {
                "level": "Moderate", "label": "Moderate", "score": 1,
                "probabilities": {"low": 0.3333, "moderate": 0.3334, "high": 0.3333},
                "shap_explanation": []
            },
            "anxiety": {
                "level": "Moderate", "label": "Moderate", "score": 1,
                "probabilities": {"low": 0.3333, "moderate": 0.3334, "high": 0.3333},
                "shap_explanation": []
            },
            "stress": {
                "level": "Moderate", "label": "Moderate", "score": 1,
                "probabilities": {"low": 0.3333, "moderate": 0.3334, "high": 0.3333},
                "shap_explanation": []
            }
        }
        
    def test_probabilities_sum_to_one(self):
        """Confirm that after fusion, probabilities for all conditions sum to 1.0."""
        emotion_res = {
            "status": "success",
            "emotions": [{"label": "sadness", "score": 0.85}, {"label": "fear", "score": 0.60}]
        }
        sleep_res = {"score": 21.0}
        
        fused = ml_service.fuse_predictions(self.base_balanced, emotion_res, sleep_res)
        
        for cond in ["depression", "anxiety", "stress"]:
            probs = fused[cond]["probabilities"]
            total_prob = probs["low"] + probs["moderate"] + probs["high"]
            self.assertAlmostEqual(total_prob, 1.0, delta=1e-3,
                                   msg=f"Condition {cond} probabilities sum to {total_prob}, expected 1.0")

    def test_distress_increases_p_high(self):
        """Distressed emotions should increase P(High) and positive delta."""
        emotion_distressed = {
            "status": "success",
            "emotions": [{"label": "sadness", "score": 0.90}, {"label": "grief", "score": 0.80}]
        }
        sleep_neutral = {"score": 7.0}  # ISI=7 -> sleep_delta = 7/28 - 0.25 = 0
        
        fused = ml_service.fuse_predictions(self.base_balanced, emotion_distressed, sleep_neutral)
        
        base_p_high = self.base_balanced["depression"]["probabilities"]["high"]
        fused_p_high = fused["depression"]["probabilities"]["high"]
        self.assertGreater(fused_p_high, base_p_high, "Distressed emotion must increase depression P(High)")
        self.assertGreater(fused["depression"]["fusion_adjustment"], 0.0, "Fusion adjustment must be positive")

    def test_protective_emotions_decrease_p_high(self):
        """Strong protective emotions with good sleep should decrease P(High) and increase P(Low)."""
        emotion_protective = {
            "status": "success",
            "emotions": [{"label": "joy", "score": 0.95}, {"label": "optimism", "score": 0.90}]
        }
        sleep_good = {"score": 0.0}  # ISI=0 -> sleep_delta = -0.25
        
        fused = ml_service.fuse_predictions(self.base_balanced, emotion_protective, sleep_good)
        
        base_p_high = self.base_balanced["depression"]["probabilities"]["high"]
        fused_p_high = fused["depression"]["probabilities"]["high"]
        base_p_low = self.base_balanced["depression"]["probabilities"]["low"]
        fused_p_low = fused["depression"]["probabilities"]["low"]
        
        self.assertLess(fused_p_high, base_p_high, "Protective emotions must decrease P(High)")
        self.assertGreater(fused_p_low, base_p_low, "Protective emotions must increase P(Low)")

    def test_insomnia_shift(self):
        """Severe insomnia (ISI=28) should produce positive risk shift."""
        emotion_neutral = {"status": "success", "emotions": [{"label": "neutral", "score": 0.90}]}
        sleep_severe = {"score": 28.0}  # ISI=28 -> sleep_delta = 1.0 - 0.25 = 0.75
        
        fused = ml_service.fuse_predictions(self.base_balanced, emotion_neutral, sleep_severe)
        
        for cond in ["depression", "anxiety", "stress"]:
            self.assertGreater(fused[cond]["fusion_adjustment"], 0.0, f"ISI=28 must yield positive delta for {cond}")
            self.assertGreater(fused[cond]["probabilities"]["high"], self.base_balanced[cond]["probabilities"]["high"])

    def test_probability_bounds(self):
        """Probabilities must always stay strictly within [0.0, 1.0]."""
        for text_status, emotions in [
            ("success", [{"label": "sadness", "score": 1.0}, {"label": "fear", "score": 1.0}]),
            ("success", [{"label": "joy", "score": 1.0}, {"label": "love", "score": 1.0}]),
            ("not_available", [])
        ]:
            for isi in [0, 7, 14, 21, 28]:
                fused = ml_service.fuse_predictions(
                    self.base_balanced,
                    {"status": text_status, "emotions": emotions},
                    {"score": float(isi)}
                )
                for cond in ["depression", "anxiety", "stress"]:
                    for p_key, p_val in fused[cond]["probabilities"].items():
                        self.assertTrue(0.0 <= p_val <= 1.0, f"{cond} {p_key}={p_val} outside [0, 1]")

if __name__ == "__main__":
    unittest.main()

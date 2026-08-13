import os
import torch

GOEMOTIONS_LABELS = [
    "admiration", "amusement", "anger", "annoyance", "approval", "caring",
    "confusion", "curiosity", "desire", "disappointment", "disapproval",
    "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief",
    "joy", "love", "nervousness", "optimism", "pride", "realization",
    "relief", "remorse", "sadness", "surprise", "neutral"
]

class EmotionService:
    def __init__(self):
        self.tokenizer = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.is_available = False
        self.check_and_load_model()

    def find_model_directory(self):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".."))
        root_dir = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        backend_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
        
        candidate_paths = [
            os.path.join(project_root, "emotion_model"),
            os.path.join(root_dir, "emotion_model"),
            os.path.join(backend_dir, "models", "emotion_model"),
            os.path.join(backend_dir, "app", "models", "emotion_model"),
            "E:\\NeuraCare\\emotion_model"
        ]
        
        for path in candidate_paths:
            if os.path.exists(path) and os.path.exists(os.path.join(path, "config.json")):
                return path
        return None

    def check_and_load_model(self):
        model_dir = self.find_model_directory()
        if not model_dir:
            print("GoEmotions model directory not found. Emotion analysis fallback active.")
            self.is_available = False
            return

        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            print(f"Loading local GoEmotions DistilBERT model from {model_dir} on {self.device}...")
            self.tokenizer = AutoTokenizer.from_pretrained(model_dir)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_dir)
            self.model.to(self.device)
            self.model.eval()
            self.is_available = True
            print("GoEmotions DistilBERT model loaded successfully.")
        except Exception as e:
            print(f"Failed to load GoEmotions model: {e}")
            self.is_available = False

    def analyze_text(self, text: str, threshold: float = 0.15, top_k: int = 5):
        if not text or not text.strip():
            return {
                "status": "not_available",
                "message": "No text provided for emotional language analysis"
            }

        if not self.is_available or self.model is None or self.tokenizer is None:
            return {
                "status": "not_available",
                "message": "Text emotion analysis coming soon"
            }

        try:
            inputs = self.tokenizer(
                text.strip(),
                return_tensors="pt",
                truncation=True,
                max_length=512
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probs = torch.sigmoid(logits)[0].cpu()

            # Map probabilities to 28 GoEmotions labels
            emotion_scores = []
            for idx, prob in enumerate(probs):
                score = round(float(prob), 4)
                label_name = GOEMOTIONS_LABELS[idx] if idx < len(GOEMOTIONS_LABELS) else f"emotion_{idx}"
                emotion_scores.append({
                    "label": label_name,
                    "score": score
                })

            # Filter emotions above threshold
            relevant_emotions = [e for e in emotion_scores if e["score"] >= threshold]
            
            # Fallback if no emotion meets threshold: take top 2 highest scores
            if not relevant_emotions:
                emotion_scores.sort(key=lambda x: x["score"], reverse=True)
                relevant_emotions = emotion_scores[:2]
            else:
                relevant_emotions.sort(key=lambda x: x["score"], reverse=True)
                relevant_emotions = relevant_emotions[:top_k]

            return {
                "status": "success",
                "emotions": relevant_emotions
            }
        except Exception as e:
            print(f"Error during GoEmotions text analysis: {e}")
            return {
                "status": "error",
                "message": f"Failed to analyze text: {str(e)}"
            }

emotion_service = EmotionService()

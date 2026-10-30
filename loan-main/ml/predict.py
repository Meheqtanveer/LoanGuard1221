"""
LoanGuard ML Inference Wrapper (Module 9)
Provides predictions using the trained scikit-learn model, or falls back to rule-based detection if models are absent.
"""

import pickle
from pathlib import Path
from typing import Dict, Any

from config import Config
from backend.services.claim_detection import detect_suspicious_claims

class LoanClassifier:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.is_loaded = False
        self._load_model()

    def _load_model(self):
        try:
            if Config.ML_MODEL_PATH.exists() and Config.TFIDF_VECTORIZER_PATH.exists():
                with open(Config.ML_MODEL_PATH, "rb") as f:
                    self.model = pickle.load(f)
                with open(Config.TFIDF_VECTORIZER_PATH, "rb") as f:
                    self.vectorizer = pickle.load(f)
                self.is_loaded = True
        except Exception as e:
            print(f"[LoanGuard ML] Model loading failed ({e}). Using rule-based fallback.")
            self.is_loaded = False

    def predict(self, text: str) -> Dict[str, Any]:
        if self.is_loaded and self.model and self.vectorizer:
            vec = self.vectorizer.transform([text])
            pred_label = self.model.predict(vec)[0]
            probabilities = {}
            if hasattr(self.model, "predict_proba"):
                probs = self.model.predict_proba(vec)[0]
                for label, prob in zip(self.model.classes_, probs):
                    probabilities[label] = round(float(prob), 3)
            return {
                "engine": "TF-IDF Logistic Regression",
                "predicted_label": pred_label,
                "probabilities": probabilities
            }
        else:
            # Rule-based fallback
            claims = detect_suspicious_claims(text)
            has_crit = any(c["severity"] == "CRITICAL" for c in claims)
            has_high = any(c["severity"] == "HIGH" for c in claims)
            
            if has_crit or has_high:
                label = "suspicious"
            elif len(text.split()) < 8:
                label = "insufficient_information"
            else:
                label = "legitimate_or_supported"

            return {
                "engine": "Rule-Based Pattern Fallback",
                "predicted_label": label,
                "detected_claims_count": len(claims)
            }

classifier = LoanClassifier()

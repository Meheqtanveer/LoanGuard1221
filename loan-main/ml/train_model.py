"""
LoanGuard Machine Learning Training Pipeline (Module 9)
Trains a TF-IDF + Classifier baseline on labelled loan advertisement text.

IMPORTANT NOTE:
The default dataset is a demonstration synthetic corpus designed for academic testing.
Do not represent synthetic demonstration performance as validated real-world accuracy.
Replace 'datasets/sample_ads.csv' with verified real-world labelled corpora for production use.
"""

import os
import csv
import pickle
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_PATH = BASE_DIR / "datasets" / "sample_ads.csv"
MODEL_SAVE_DIR = BASE_DIR / "ml" / "saved_models"
MODEL_PATH = MODEL_SAVE_DIR / "loan_classifier.pkl"
VECTORIZER_PATH = MODEL_SAVE_DIR / "tfidf_vectorizer.pkl"

def load_data(filepath):
    texts = []
    labels = []
    with open(filepath, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text = row.get("advertisement_text", "").strip()
            label = row.get("label", "").strip()
            if text and label:
                texts.append(text)
                labels.append(label)
    return texts, labels

def train_pipeline():
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
    except ImportError:
        print("[LoanGuard ML] Scikit-learn not installed. Install via: pip install scikit-learn")
        return

    print("================================================================")
    print(" LoanGuard ML Model Training Pipeline (Baseline Classifier)")
    print("================================================================")
    print(f"Loading dataset from: {DATASET_PATH}")
    
    texts, labels = load_data(DATASET_PATH)
    print(f"Loaded {len(texts)} labelled samples.")

    if len(texts) < 6:
        print("Dataset too small for train/test split. Expanding synthetic samples is recommended.")
        return

    # Train / Test split (stratified where possible)
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.25, random_state=42, stratify=labels if len(set(labels)) > 1 else None
    )

    print(f"Training samples: {len(X_train)} | Test samples: {len(X_test)}")

    # TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        max_features=1000
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    # Baseline Classifier: Logistic Regression
    classifier = LogisticRegression(class_weight="balanced", max_iter=200)
    classifier.fit(X_train_vec, y_train)

    # Evaluation
    y_pred = classifier.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)
    
    print("\n--- Model Evaluation Metrics (Synthetic Test Set) ---")
    print(f"Overall Accuracy: {acc * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # Save artifacts
    os.makedirs(MODEL_SAVE_DIR, exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(classifier, f)
    with open(VECTORIZER_PATH, "wb") as f:
        pickle.dump(vectorizer, f)

    print(f"\nModel saved successfully to: {MODEL_PATH}")
    print(f"Vectorizer saved successfully to: {VECTORIZER_PATH}")
    print("================================================================")

if __name__ == "__main__":
    train_pipeline()

"""
LoanGuard Configuration Module
Supports MongoDB with automatic fallback to SQLite for local development.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "loanguard-academic-development-key-2026")
    UPLOAD_FOLDER = BASE_DIR / "uploads"
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max file upload
    ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
    
    # Database configuration
    # Set USE_SQLITE = True or provide MONGO_URI
    MONGO_URI = os.getenv("MONGO_URI", "")
    SQLITE_PATH = BASE_DIR / "backend" / "database" / "loanguard.db"
    
    # ML Model Path
    ML_MODEL_PATH = BASE_DIR / "ml" / "saved_models" / "loan_classifier.pkl"
    TFIDF_VECTORIZER_PATH = BASE_DIR / "ml" / "saved_models" / "tfidf_vectorizer.pkl"
    
    # SSRF & URL Guardrails
    URL_FETCH_TIMEOUT_SECONDS = 5
    URL_FETCH_MAX_BYTES = 500 * 1024  # 500 KB response limit

# Ensure necessary directories exist
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(Config.SQLITE_PATH.parent, exist_ok=True)
os.makedirs(Config.ML_MODEL_PATH.parent, exist_ok=True)

"""
LoanGuard OCR and Image Preprocessing Service (Python)
Uses OpenCV for grayscale, noise reduction, and thresholding, and Pytesseract for text recognition.
Includes safe fallback for environments where tesseract-ocr binary is not yet installed.
"""

import os
from typing import Tuple

def preprocess_and_ocr(image_path: str) -> Tuple[str, str]:
    """
    Returns (extracted_text, preprocessed_image_path)
    """
    preprocessed_path = image_path + ".processed.png"
    
    # Try OpenCV preprocessing
    try:
        import cv2
        img = cv2.imread(image_path)
        if img is not None:
            # 1. Grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            # 2. Noise reduction
            blurred = cv2.GaussianBlur(gray, (3, 3), 0)
            # 3. Thresholding
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            cv2.imwrite(preprocessed_path, thresh)
        else:
            preprocessed_path = image_path
    except Exception as e:
        print(f"[LoanGuard OCR] OpenCV preprocessing skipped ({e}). Using raw image.")
        preprocessed_path = image_path

    # Try Pytesseract
    try:
        import pytesseract
        from PIL import Image
        text = pytesseract.image_to_string(Image.open(preprocessed_path))
        if text.strip():
            return text.strip(), preprocessed_path
    except Exception as e:
        print(f"[LoanGuard OCR] Pytesseract execution failed ({e}).")

    return "Note: OCR extraction could not read text from this image or Tesseract binary was unavailable. Please enter or review text manually.", preprocessed_path

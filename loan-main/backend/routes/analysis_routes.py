"""
LoanGuard Analysis Blueprint (Flask Routes)
Handles advertisement submissions (screenshot, text, url), runs analysis pipeline, and stores records.
"""

from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import time

from config import Config
from backend.database.db import db
from backend.services.text_extraction import (
    extract_phone_numbers,
    extract_emails,
    extract_domains,
    extract_claimed_lender,
    extract_financial_entities
)
from backend.services.claim_detection import detect_suspicious_claims
from backend.services.lender_verification import verify_lender_record
from backend.services.financial_analyzer import analyze_financials
from backend.services.scam_mapper import find_connections
from backend.services.risk_engine import evaluate_risk
from backend.services.ocr_service import preprocess_and_ocr
from backend.services.url_service import fetch_url_content

analysis_bp = Blueprint("analysis", __name__, url_prefix="/api/analysis")

@analysis_bp.route("/analyze", methods=["POST"])
def analyze_ad():
    data = request.form if request.form else (request.get_json() or {})
    input_type = data.get("input_type", "text")
    title = data.get("title", f"Ad Audit #{int(time.time())}")
    raw_text = data.get("text", "")
    submitted_url = data.get("url", "")
    screenshot_filename = ""

    # 1. Handle Screenshot Upload
    if "screenshot" in request.files:
        file = request.files["screenshot"]
        if file and file.filename:
            ext = file.filename.rsplit(".", 1)[-1].lower()
            if ext in Config.ALLOWED_IMAGE_EXTENSIONS:
                fname = secure_filename(f"upload_{int(time.time())}_{file.filename}")
                save_path = os.path.join(Config.UPLOAD_FOLDER, fname)
                file.save(save_path)
                screenshot_filename = fname
                extracted_ocr, _ = preprocess_and_ocr(save_path)
                if not raw_text:
                    raw_text = extracted_ocr
            else:
                return jsonify({"error": "Unsupported image format"}), 400

    # 2. Handle URL Fetch
    elif input_type == "url" and submitted_url:
        success, fetched_text = fetch_url_content(submitted_url)
        if success:
            raw_text = fetched_text
        else:
            return jsonify({"error": fetched_text}), 400

    if not raw_text.strip():
        return jsonify({"error": "No advertisement text provided or extracted"}), 400

    # 3. Entity Extraction
    ad_id = f"LG-{int(time.time() * 1000) % 1000000}"
    phones = extract_phone_numbers(raw_text)
    emails = extract_emails(raw_text)
    domains = extract_domains(raw_text)
    lender_info = extract_claimed_lender(raw_text)
    fin_extraction = extract_financial_entities(raw_text)

    # 4. Multi-Module Processing
    claims = detect_suspicious_claims(raw_text)
    verification = verify_lender_record(lender_info["claimed_lender"], lender_info["claimed_app"], domains)
    financial = analyze_financials(fin_extraction)
    
    # 5. Scam Connection Mapper
    all_existing = db.get_all_advertisements()
    connections = find_connections({
        "advertisement_id": ad_id,
        "phone_numbers": phones,
        "domains": domains,
        "email_addresses": emails,
        "extracted_text": raw_text
    }, all_existing)

    # 6. Risk Engine
    risk_out = evaluate_risk(claims, verification, financial, connections)

    # Store in Database
    ad_record = {
        "advertisement_id": ad_id,
        "input_type": input_type,
        "title": title,
        "original_text": raw_text,
        "extracted_text": raw_text,
        "submitted_url": submitted_url,
        "screenshot_filename": screenshot_filename,
        "phone_numbers": phones,
        "email_addresses": emails,
        "domains": domains,
        "claimed_lender": lender_info["claimed_lender"],
        "claimed_app": lender_info["claimed_app"],
        "financial_details": fin_extraction,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    db.insert_advertisement(ad_record)

    analysis_record = {
        "analysis_id": f"ANS-{ad_id}",
        "advertisement_id": ad_id,
        "detected_claims": claims,
        "lender_verification": verification,
        "financial_analysis": financial,
        "risk_category": risk_out["risk_category"],
        "risk_score": risk_out["risk_score"],
        "risk_summary": risk_out["risk_summary"],
        "missing_information": risk_out["missing_information"],
        "safe_next_steps": risk_out["safe_next_steps"],
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    db.insert_analysis_result(analysis_record)

    return jsonify({
        "status": "success",
        "advertisement": ad_record,
        "analysis": analysis_record,
        "connections": connections
    })

@analysis_bp.route("/history", methods=["GET"])
def get_history():
    ads = db.get_all_advertisements()
    return jsonify({"advertisements": ads})

@analysis_bp.route("/delete/<ad_id>", methods=["DELETE"])
def delete_ad(ad_id):
    db.delete_advertisement(ad_id)
    return jsonify({"status": "deleted", "advertisement_id": ad_id})

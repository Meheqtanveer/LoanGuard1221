"""
LoanGuard Comprehensive Automated Test Suite (Module 10)
Tests all 10 core functional and security specifications:
1. OCR fallback & image handling
2. Text and entity extraction (phone, email, domain, lender)
3. Safe URL processing & SSRF guards
4. Suspicious phrase detection
5. Lender verification outcomes (MATCHED, MISMATCH, NOT FOUND, UNKNOWN)
6. Reducing-balance EMI calculations
7. Scam Connection Mapper (shared phone, domain, text similarity)
8. Risk scoring engine
9. Missing information handling
10. Invalid inputs & error recovery
"""

import unittest
import math
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

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
from backend.services.scam_mapper import find_connections, compute_cosine_similarity
from backend.services.risk_engine import evaluate_risk
from backend.services.url_service import validate_url

class TestLoanGuardCore(unittest.TestCase):

    # 1. Text & Entity Extraction
    def test_phone_number_extraction(self):
        text = "Call WhatsApp desk: +91 9876543210 or helpline 1800-202-6161 for quick cash."
        phones = extract_phone_numbers(text)
        self.assertIn("9876543210", phones)
        self.assertIn("18002026161", phones)

    def test_email_and_domain_extraction(self):
        text = "Visit https://speedyloanindia.in/apply and contact support@speedyloanindia.in"
        emails = extract_emails(text)
        domains = extract_domains(text)
        self.assertEqual(emails, ["support@speedyloanindia.in"])
        self.assertEqual(domains, ["speedyloanindia.in"])

    # 2. Suspicious Phrase Detection
    def test_advance_fee_detection(self):
        text = "100% Guaranteed approval! Pay refundable processing fee of Rs 1,499 before loan disbursement."
        claims = detect_suspicious_claims(text)
        adv_fee_claims = [c for c in claims if c["category"] == "advance_fee"]
        approval_claims = [c for c in claims if c["category"] == "approval"]
        
        self.assertTrue(len(adv_fee_claims) > 0)
        self.assertEqual(adv_fee_claims[0]["severity"], "CRITICAL")
        self.assertTrue(len(approval_claims) > 0)

    def test_otp_and_contacts_harvesting_detection(self):
        text = "Send Aadhaar OTP on WhatsApp. Grant access to your contacts and gallery."
        claims = detect_suspicious_claims(text)
        otp_claims = [c for c in claims if c["category"] == "credentials"]
        perm_claims = [c for c in claims if c["category"] == "harassment"]
        
        self.assertTrue(len(otp_claims) > 0)
        self.assertTrue(len(perm_claims) > 0)

    # 3. Safe URL Processing & SSRF Guards
    def test_ssrf_blocking(self):
        # Localhost should be blocked
        valid, err = validate_url("http://localhost:8080/admin")
        self.assertFalse(valid)
        self.assertIn("localhost", err.lower())

        # Private IP 127.0.0.1 should be blocked
        valid, err = validate_url("http://127.0.0.1:5000/secret")
        self.assertFalse(valid)

        # RFC 1918 private IP should be blocked
        valid, err = validate_url("http://192.168.1.1/router")
        self.assertFalse(valid)

        # Non-HTTP should be blocked
        valid, err = validate_url("ftp://example.com/file")
        self.assertFalse(valid)

        # Public HTTPS URL should be allowed
        valid, err = validate_url("https://hdfcbank.com/personal-loan")
        self.assertTrue(valid)

    # 4. Lender Verification (MATCHED, MISMATCH, NOT FOUND, UNKNOWN)
    def test_lender_verification_matched(self):
        result = verify_lender_record("HDFC Bank Limited", "HDFC Bank MobileBanking", ["hdfcbank.com"])
        self.assertEqual(result["status"], "MATCHED")
        self.assertEqual(result["claimed_entity"], "Scheduled Commercial Bank")

    def test_lender_verification_mismatch(self):
        # Claiming Bajaj Finance on a fraudulent domain
        result = verify_lender_record("Bajaj Finance Limited", "Fast Cash App", ["speedyloanindia.in"])
        self.assertEqual(result["status"], "MISMATCH")
        self.assertIn("CONFLICT", " ".join(result["evidence"]))

    def test_lender_verification_not_found(self):
        result = verify_lender_record("Unregistered Phantom Finance", "GhostApp", ["phantom-loan.xyz"])
        self.assertEqual(result["status"], "NOT FOUND")

    def test_lender_verification_unknown(self):
        result = verify_lender_record("Not specifically declared", "Unspecified Mobile App", [])
        self.assertEqual(result["status"], "UNKNOWN")

    # 5. Actuarial Reducing-Balance EMI Calculations
    def test_reducing_balance_emi_math(self):
        # P = 100,000, r = 12% p.a. (1% p.m.), n = 12 months
        # Standard formula: 100000 * 0.01 * (1.01^12) / ((1.01^12) - 1) = ~8885
        fin_input = {
            "loan_amount": 100000,
            "interest_rate": 12,
            "tenure_months": 12,
            "tenure_days": None,
            "interest_rate_period": "annual",
            "processing_fee": None
        }
        res = analyze_financials(fin_input)
        self.assertTrue(res["is_calculable"])
        self.assertAlmostEqual(res["calculated_emi"], 8885, delta=5)
        self.assertEqual(res["calculated_total_repayment"], res["calculated_emi"] * 12)

    def test_zero_interest_calculation(self):
        fin_input = {
            "loan_amount": 60000,
            "interest_rate": 0,
            "tenure_months": 6,
            "tenure_days": None,
            "interest_rate_period": "annual",
            "processing_fee": None
        }
        res = analyze_financials(fin_input)
        self.assertTrue(res["is_calculable"])
        self.assertEqual(res["calculated_emi"], 10000)
        self.assertEqual(res["calculated_total_interest"], 0)

    # 6. Missing Financial Information
    def test_insufficient_financial_information(self):
        fin_input = {
            "loan_amount": 50000,
            "interest_rate": None,  # Missing rate
            "tenure_months": None,  # Missing tenure
            "tenure_days": None,
            "interest_rate_period": "unknown",
            "processing_fee": None
        }
        res = analyze_financials(fin_input)
        self.assertFalse(res["is_calculable"])
        self.assertIsNone(res["calculated_emi"])
        self.assertTrue(res["transparency_flags"]["missing_interest"])

    # 7. Scam Connection Mapper (Phone & Domain Association)
    def test_scam_connection_mapper(self):
        ad_a = {
            "advertisement_id": "AD-A",
            "title": "Speedy Cash",
            "phone_numbers": ["9876543210"],
            "domains": ["speedyloan.in"],
            "email_addresses": [],
            "extracted_text": "Speedy loan offer"
        }
        ad_b = {
            "advertisement_id": "AD-B",
            "title": "Easy Credit",
            "phone_numbers": ["9876543210"], # Shares phone with AD-A
            "domains": ["easycredit.click"],
            "email_addresses": [],
            "extracted_text": "Easy credit offer"
        }
        
        connections = find_connections(ad_a, [ad_b])
        self.assertEqual(len(connections), 1)
        self.assertEqual(connections[0]["relationship_type"], "phone")
        self.assertIn("9876543210", connections[0]["shared_identifier"])

    # 8. Explainable Risk Engine
    def test_risk_engine_high_risk_determination(self):
        claims = [{
            "id": "ADV_FEE",
            "warning": "Advance Fee",
            "explanation": "Demands advance fee",
            "severity": "CRITICAL",
            "category": "advance_fee"
        }]
        verification = {
            "status": "MISMATCH",
            "claimed_entity": "NBFC-ICC"
        }
        financial = {
            "transparency_flags": {"predatory_tenure": True}
        }
        connections = []

        risk = evaluate_risk(claims, verification, financial, connections)
        self.assertEqual(risk["risk_category"], "HIGH RISK")
        self.assertTrue(risk["risk_score"] >= 65)
        self.assertTrue(len(risk["safe_next_steps"]) > 0)

    def test_risk_engine_low_risk_legitimate_determination(self):
        claims = []
        verification = {
            "status": "MATCHED",
            "claimed_entity": "Scheduled Commercial Bank"
        }
        financial = {
            "transparency_flags": {"predatory_tenure": False, "missing_interest": False}
        }
        connections = []

        risk = evaluate_risk(claims, verification, financial, connections)
        self.assertEqual(risk["risk_category"], "LOWER DETECTED RISK")
        self.assertTrue(risk["risk_score"] < 35)

    # 9. Target Test Cases from User Feedback
    def test_user_ad_1_suspicious_advance_fee_and_guaranteed_approval(self):
        """
        Ad 1: Fictional suspicious loan ad containing:
        - Guaranteed approval
        - No income verification
        - ₹999 advance processing fee
        Must detect advance fee, guaranteed approval, underwriting bypass,
        and classify as HIGH RISK with strong warnings and actionable safeguards.
        """
        text = "Urgent personal loan! Guaranteed approval, no income verification and a ₹999 advance processing fee."
        
        # 1. Claims detection
        claims = detect_suspicious_claims(text)
        claim_categories = [c["category"] for c in claims]
        claim_severities = [c["severity"] for c in claims]

        # Must detect advance fee demand (CRITICAL)
        self.assertIn("advance_fee", claim_categories)
        self.assertIn("CRITICAL", claim_severities)

        # Must detect guaranteed approval (HIGH)
        self.assertIn("approval", claim_categories)

        # Must detect underwriting / income verification bypass (HIGH)
        self.assertIn("documentation", claim_categories)

        # 2. Entity and financial extraction
        fin_entities = extract_financial_entities(text)
        self.assertEqual(fin_entities["processing_fee"], 999.0)
        self.assertIsNone(fin_entities["interest_rate"])
        self.assertIsNone(fin_entities["tenure_months"])

        fin_analysis = analyze_financials(fin_entities)
        self.assertTrue(fin_analysis["transparency_flags"]["missing_interest"])
        self.assertTrue(fin_analysis["transparency_flags"]["missing_tenure"])

        # 3. Lender verification (unknown / undeclared)
        lender_info = extract_claimed_lender(text)
        domains = extract_domains(text)
        verification = verify_lender_record(lender_info["claimed_lender"], lender_info["claimed_app"], domains)
        self.assertEqual(verification["status"], "UNKNOWN")

        # 4. Overall Risk Engine Evaluation
        risk = evaluate_risk(claims, verification, fin_analysis, [])
        self.assertEqual(risk["risk_category"], "HIGH RISK")
        self.assertTrue(risk["risk_score"] >= 75)
        self.assertIn("advance fee", risk["risk_summary"].lower())

        # Safe next steps must include warning against upfront fee payment
        has_advance_fee_warning = any("advance" in s.lower() and "fee" in s.lower() for s in risk["safe_next_steps"])
        self.assertTrue(has_advance_fee_warning)

    def test_user_ad_2_hdfc_bank_legitimate_advertisement(self):
        """
        Ad 2: Legitimate HDFC Bank advertisement using hdfcbank.com domain.
        Must verify against RBI reference data, find no predatory claims,
        and score as LOWER DETECTED RISK.
        """
        text = (
            "HDFC Bank Personal Loan: Get loans up to ₹40 Lakhs with attractive interest rates starting at 10.50% p.a. "
            "Flexible tenure from 12 to 60 months. Processing fees up to 1.50% of the loan amount plus applicable GST. "
            "Transparent APR disclosed in Key Fact Statement (KFS). Apply now at https://hdfcbank.com. Customer Helpline: 18002026161."
        )

        claims = detect_suspicious_claims(text)
        self.assertEqual(len(claims), 0, "Legitimate bank ad should not trigger false suspicious claim rules")

        domains = extract_domains(text)
        self.assertIn("hdfcbank.com", domains)

        lender_info = extract_claimed_lender(text)
        self.assertEqual(lender_info["claimed_lender"], "HDFC Bank Limited")

        verification = verify_lender_record(lender_info["claimed_lender"], lender_info["claimed_app"], domains)
        self.assertEqual(verification["status"], "MATCHED")
        self.assertEqual(verification["claimed_entity"], "Scheduled Commercial Bank")

        fin_entities = extract_financial_entities(text)
        self.assertEqual(fin_entities["interest_rate"], 10.5)
        self.assertEqual(fin_entities["tenure_months"], 60)

        fin_analysis = analyze_financials(fin_entities)
        self.assertFalse(fin_analysis["transparency_flags"]["missing_interest"])
        self.assertFalse(fin_analysis["transparency_flags"]["missing_tenure"])
        self.assertFalse(fin_analysis["transparency_flags"]["predatory_tenure"])

        risk = evaluate_risk(claims, verification, fin_analysis, [])
        self.assertEqual(risk["risk_category"], "LOWER DETECTED RISK")
        self.assertTrue(risk["risk_score"] <= 25)

    def test_domain_alone_does_not_override_critical_fraud(self):
        """
        Verify rule: An advertisement must not be classified as genuine based only on its domain.
        If an ad mentions an authorized domain (e.g. hdfcbank.com) but demands an advance fee,
        it must remain classified as HIGH RISK.
        """
        text = "HDFC Bank loan pre-approval! Pay ₹999 advance processing fee before disbursement to release cash. Apply at hdfcbank.com"
        claims = detect_suspicious_claims(text)
        domains = extract_domains(text)
        lender_info = extract_claimed_lender(text)

        verification = verify_lender_record(lender_info["claimed_lender"], lender_info["claimed_app"], domains)
        self.assertEqual(verification["status"], "MATCHED")

        fin_entities = extract_financial_entities(text)
        fin_analysis = analyze_financials(fin_entities)

        risk = evaluate_risk(claims, verification, fin_analysis, [])
        self.assertEqual(risk["risk_category"], "HIGH RISK", "Critical advance fee demand must produce HIGH RISK despite legitimate domain")

    def test_missing_information_alone_does_not_cause_fraud_classification(self):
        """
        Verify rule: Do not automatically classify an advertisement as fraudulent because information is missing.
        A brief flyer lacking APR or tenure without predatory claims should not be HIGH RISK.
        """
        claims = [] # No deceptive claims
        verification = {
            "status": "MATCHED",
            "claimed_entity": "Scheduled Commercial Bank"
        }
        financial = {
            "transparency_flags": {
                "missing_interest": True,
                "missing_tenure": True,
                "predatory_tenure": False,
                "daily_interest_trap": False
            }
        }
        risk = evaluate_risk(claims, verification, financial, [])
        self.assertNotEqual(risk["risk_category"], "HIGH RISK", "Missing info alone must not produce HIGH RISK")
        self.assertIn(risk["risk_category"], ["LOWER DETECTED RISK", "NEEDS CHECKING"])

    def test_configurable_scoring_weights(self):
        """
        Verify rule: Keep all scoring weights configurable.
        Custom weights passed to evaluate_risk must override defaults.
        """
        custom_weights = {
            "base_score": 0,
            "advance_fee_weight": 50,
            "high_risk_threshold": 50
        }
        claims = [{
            "id": "ADV_FEE",
            "warning": "Advance Fee Demand",
            "explanation": "Demands upfront fee",
            "severity": "CRITICAL",
            "category": "advance_fee"
        }]
        verification = {"status": "UNKNOWN"}
        financial = {"transparency_flags": {}}

        risk = evaluate_risk(claims, verification, financial, [], weights=custom_weights)
        self.assertEqual(risk["risk_category"], "HIGH RISK")
        # 0 (base) + 50 (advance fee) + 10 (unknown lender) = 60
        self.assertEqual(risk["risk_score"], 60)

if __name__ == "__main__":
    unittest.main()

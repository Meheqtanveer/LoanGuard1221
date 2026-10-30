"""
LoanGuard Explainable Risk Assessment Engine (Python)
Integrates multi-module findings into calibrated categories and explainable consumer safeguards.
Supports configurable scoring weights, strong warning combinations, and evidence-based risk auditing.
"""

from typing import Dict, List, Any, Optional

DEFAULT_RISK_WEIGHTS: Dict[str, Any] = {
    # Baseline
    "base_score": 10,

    # Claim severity weights
    "critical_claim_weight": 35,
    "advance_fee_weight": 40,      # Illegal under RBI digital lending directions
    "high_claim_weight": 20,
    "medium_claim_weight": 10,
    "low_claim_weight": 5,

    # Lender verification weights
    "lender_mismatch_weight": 35,
    "lender_not_found_weight": 15,
    "lender_unknown_weight": 10,
    "lender_matched_discount": 15,

    # Financial transparency weights
    "predatory_tenure_weight": 35,
    "daily_interest_trap_weight": 20,
    "inconsistent_emi_weight": 15,
    "missing_interest_weight": 10,
    "missing_tenure_weight": 10,
    "hidden_processing_fee_weight": 5,

    # Network connection weights (Scam Connection Mapper)
    "phone_connection_weight": 15,
    "domain_connection_weight": 15,

    # Classification thresholds
    "high_risk_threshold": 65,
    "needs_checking_threshold": 35
}

def evaluate_risk(
    claims: List[Dict[str, Any]],
    verification: Dict[str, Any],
    financial: Dict[str, Any],
    connections: List[Dict[str, Any]],
    weights: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    w = {**DEFAULT_RISK_WEIGHTS, **(weights or {})}

    score = w["base_score"]
    missing_info = []
    safe_steps = []

    critical_claims = [c for c in claims if c.get("severity") == "CRITICAL"]
    high_claims = [c for c in claims if c.get("severity") == "HIGH"]
    medium_claims = [c for c in claims if c.get("severity") == "MEDIUM"]

    # 1. Claim points
    for c in critical_claims:
        if c.get("category") == "advance_fee":
            score += w.get("advance_fee_weight", 40)
        else:
            score += w["critical_claim_weight"]

    score += len(high_claims) * w["high_claim_weight"]
    score += len(medium_claims) * w["medium_claim_weight"]

    # 2. Verification points
    v_status = verification.get("status")
    if v_status == "MISMATCH":
        score += w["lender_mismatch_weight"]
    elif v_status == "NOT FOUND":
        score += w["lender_not_found_weight"]
        missing_info.append("Regulated Entity: Claimed lender name not found in the active RBI Digital Lending Apps or NBFC directory.")
    elif v_status == "UNKNOWN":
        score += w["lender_unknown_weight"]
        missing_info.append("Lender Identity: No specific corporate or regulated lending entity declared in the advertisement.")
    elif v_status == "MATCHED":
        score = max(5, score - w["lender_matched_discount"])

    # 3. Financial transparency
    t_flags = financial.get("transparency_flags", {})
    if t_flags.get("predatory_tenure"):
        score += w["predatory_tenure_weight"]
    if t_flags.get("daily_interest_trap"):
        score += w["daily_interest_trap_weight"]
    if t_flags.get("inconsistent_emi_claim"):
        score += w["inconsistent_emi_weight"]
    if t_flags.get("missing_interest"):
        score += w["missing_interest_weight"]
        missing_info.append("Annual Percentage Rate (APR) / Interest Rate")
    if t_flags.get("missing_tenure"):
        score += w["missing_tenure_weight"]
        missing_info.append("Repayment Schedule / Tenure")
    if t_flags.get("hidden_processing_fee"):
        missing_info.append("Processing Fee Schedule and GST Terms")

    # 4. Connections (Scam Connection Mapper)
    # Network associations indicate scam syndicates when lenders are unverified, mismatched, or using third-party channels.
    # When an entity is MATCHED, sharing its own official registered domain or toll-free helpline is legitimate corporate operation.
    is_matched_entity = (v_status == "MATCHED")
    phone_conns = [c for c in connections if c.get("relationship_type") == "phone"]
    domain_conns = [c for c in connections if c.get("relationship_type") == "domain"]

    if not is_matched_entity:
        if phone_conns:
            score += w["phone_connection_weight"]
        if domain_conns:
            score += w["domain_connection_weight"]

    score = max(5, min(100, score))

    # 5. Categorization Logic
    has_critical_fraud_signal = (
        len(critical_claims) > 0 or
        v_status == "MISMATCH" or
        bool(t_flags.get("predatory_tenure"))
    )

    # Strong warning combinations: multiple high claims + missing disclosures
    has_strong_combination = (
        len(high_claims) >= 2 and (
            bool(t_flags.get("missing_interest")) or
            bool(t_flags.get("missing_tenure")) or
            v_status in ("NOT FOUND", "UNKNOWN")
        )
    )

    # Core rule: Do not automatically classify an advertisement as genuine based only on its domain
    # If critical fraud signals exist, it remains HIGH RISK regardless of domain
    if has_critical_fraud_signal or has_strong_combination or score >= w["high_risk_threshold"]:
        category = "HIGH RISK"
    elif (
        score >= w["needs_checking_threshold"] or
        v_status == "NOT FOUND" or
        len(high_claims) > 0 or
        len(missing_info) >= 2 or
        bool(t_flags.get("daily_interest_trap"))
    ):
        category = "NEEDS CHECKING"
    else:
        category = "LOWER DETECTED RISK"

    # 6. Actionable Safeguards & Next Steps
    if any(c.get("category") == "advance_fee" for c in critical_claims):
        safe_steps.append("DO NOT pay any advance processing fee, file charge, or deposit. Legitimate lenders deduct fees only upon loan disbursement.")
    if any(c.get("category") == "credentials" for c in critical_claims):
        safe_steps.append("NEVER share Aadhaar OTP, bank OTP, or credentials over WhatsApp or unverified online forms.")
    if any(c.get("category") == "harassment" for c in critical_claims + high_claims):
        safe_steps.append("DO NOT grant contact list or photo gallery permissions, and never install standalone APK files.")
    if v_status in ("MISMATCH", "NOT FOUND"):
        safe_steps.append("Verify the lending entity independently on the Reserve Bank of India official portal (rbi.org.in).")
    if t_flags.get("predatory_tenure"):
        safe_steps.append("Avoid ultra-short duration loans (≤15 days). Ensure repayment schedule complies with RBI minimum duration norms.")
    if missing_info:
        safe_steps.append("Request a formal Key Fact Statement (KFS) containing the all-inclusive Annual Percentage Rate (APR) before signing.")
    if not safe_steps:
        safe_steps.append("Review terms in the official sanction letter before signing.")

    # 7. Summary
    if category == "HIGH RISK":
        if any(c.get("category") == "advance_fee" for c in critical_claims):
            summary = "HIGH RISK: Illegal advance fee demand detected. Under RBI digital lending regulations, lenders may never demand upfront fee payments prior to disbursement."
        elif v_status == "MISMATCH":
            summary = "HIGH RISK: Credential mismatch detected. The advertisement references a regulated entity but directs users to an unauthorized web domain."
        else:
            summary = "HIGH RISK: Multiple severe risk indicators or predatory claims detected. High probability of fraudulent solicitation or predatory loan operation."
    elif category == "NEEDS CHECKING":
        summary = "NEEDS CHECKING: The advertisement contains ambiguous claims or lacks key regulatory disclosures (interest rate APR, tenure, or verified lender identity). Independent verification required."
    else:
        summary = "LOWER DETECTED RISK: The advertisement displays standard transparent disclosures aligning with regulated entity profiles. Continue standard consumer vigilance."

    return {
        "risk_category": category,
        "risk_score": score,
        "risk_summary": summary,
        "missing_information": missing_info,
        "safe_next_steps": safe_steps
    }

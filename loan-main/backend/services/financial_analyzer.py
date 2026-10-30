"""
LoanGuard Financial Transparency and Loan Cost Analyzer (Python)
Implements reducing-balance EMI calculations, hidden cost detection, and transparency auditing.
"""

from typing import Dict, Any, Optional

def analyze_financials(extraction: Dict[str, Any], kfs_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    P = extraction.get("loan_amount")
    annual_rate = extraction.get("interest_rate")
    n = extraction.get("tenure_months")
    days = extraction.get("tenure_days")
    period = extraction.get("interest_rate_period")

    warnings = []
    explanations = []

    flags = {
        "missing_interest": annual_rate is None,
        "missing_tenure": n is None and days is None,
        "hidden_processing_fee": extraction.get("processing_fee") is None,
        "predatory_tenure": days is not None and days <= 15,
        "daily_interest_trap": period == "daily",
        "inconsistent_emi_claim": False,
        "kfs_mismatch": False
    }

    if flags["missing_interest"]:
        warnings.append("Missing Interest Rate Disclosure")
        explanations.append("The advertisement does not disclose an annual interest rate (ROI) or Annual Percentage Rate (APR).")

    if flags["missing_tenure"]:
        warnings.append("Missing Repayment Schedule / Tenure")
        explanations.append("The advertisement fails to disclose loan tenure, duration, or repayment schedule.")

    if flags["predatory_tenure"]:
        warnings.append("Predatory Short-Duration Tenure (≤15 days)")
        explanations.append(f"Ultra-short tenure of {days} days detected. Associated with predatory quick-cash loan operations.")

    if flags["daily_interest_trap"]:
        warnings.append("Daily Interest Quoting Masking High APR")
        explanations.append("Interest is stated daily instead of standardized Annual Percentage Rate (APR).")

    is_calculable = P is not None and P > 0 and n is not None and n > 0 and annual_rate is not None and annual_rate >= 0

    calculated_emi = None
    calculated_total_repayment = None
    calculated_total_interest = None
    calculated_apr = None

    if is_calculable:
        if annual_rate == 0:
            calculated_emi = round(P / n)
            calculated_total_interest = 0
            calculated_total_repayment = P
        else:
            monthly_r = (annual_rate / 100) / 12
            factor = (1 + monthly_r) ** n
            calculated_emi = round((P * monthly_r * factor) / (factor - 1))
            calculated_total_repayment = round(calculated_emi * n)
            calculated_total_interest = round(calculated_total_repayment - P)

        years = n / 12
        calculated_apr = round((calculated_total_interest / P / years) * 100, 2)
        explanations.append(f"Calculated reducing-balance EMI: Rs {calculated_emi:,}/mo over {n} months.")
    else:
        explanations.append("Insufficient information to calculate standard reducing-balance EMI.")

    return {
        "extraction": extraction,
        "calculated_emi": calculated_emi,
        "calculated_total_repayment": calculated_total_repayment,
        "calculated_total_interest": calculated_total_interest,
        "calculated_apr": calculated_apr,
        "transparency_flags": flags,
        "warnings": warnings,
        "explanations": explanations,
        "is_calculable": is_calculable
    }

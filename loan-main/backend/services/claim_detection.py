"""
LoanGuard Claim Detection Service (Python)
Detects deceptive claims, advance-fee fraud demands, unrealistic approval promises, and credential requests.
"""

import re
from typing import List, Dict, Any

RULES = [
    {
        "id": "ADV_FEE",
        "category": "advance_fee",
        "pattern": (
            r'(?:(?:pay|deposit|transfer|send)\s+[^\n.]*?(?:processing\s*fees?|file\s*charges?|security\s*deposits?|verification\s*charges?|registration\s*charges?|insurance\s*fees?)[^\n.]*?(?:before|prior\s*to|in\s*advance|pre-disbursement|to\s*release|to\s*sanction|to\s*approve))|'
            r'(?:(?:advance|upfront|pre-disbursement)\s+(?:processing\s*)?(?:fees?|charges?|costs?|amounts?|deposits?|payments?))|'
            r'(?:(?:rs\.?|₹|inr)\s*[\d,]+\s*(?:advance\s*processing\s*fee|advance\s*fee|upfront\s*fee|file\s*charge\s*in\s*advance|processing\s*fee\s*(?:in\s*advance|before\s*disbursement|prior\s*to\s*disbursement)))|'
            r'(?:(?:processing\s*fees?|file\s*charge|security\s*(?:verification\s*)?deposit)[^\n.]*?(?:(?:rs\.?|₹|inr)\s*[\d,]+)?[^\n.]*?(?:in\s*advance|before\s*(?:loan\s*)?(?:disbursement|transfer|approval|release)|prior\s*to\s*disbursement))'
        ),
        "warning": "Advance Payment / Processing Fee Demand Before Disbursement",
        "explanation": "The advertisement solicits an upfront or advance processing fee/deposit before loan funds are disbursed. Under RBI Digital Lending Guidelines, legitimate lenders deduct all processing charges solely from the disbursed loan proceeds. Demanding advance fee payments is an established signature of advance-fee loan fraud.",
        "severity": "CRITICAL"
    },
    {
        "id": "GUARANTEED_APPROVAL",
        "category": "approval",
        "pattern": (
            r'(?:100%|guaranteed|instant)\s*(?:loan\s*)?(?:approval|sanction)|'
            r'approval\s*guaranteed(?:\s*for\s*all)?|'
            r'guaranteed\s*(?:instant\s*)?(?:loan|cash|approval|sanction)|'
            r'(?:no\s*rejection|rejection-free)\s*(?:loan|approval)?'
        ),
        "warning": "Unrealistic Guaranteed Approval Claim",
        "explanation": "The advertisement promises guaranteed or 100% loan approval. Regulated lenders are legally mandated by RBI to assess creditworthiness, debt-to-income ratio, and repayment capacity. No legitimate entity can guarantee unconditional loan approval without underwriting.",
        "severity": "HIGH"
    },
    {
        "id": "NO_VERIFICATION",
        "category": "documentation",
        "pattern": (
            r'(?:no|without(?:\s+any)?)\s*(?:income\s*verification|income\s*proof|income\s*check|verification|cibil(?:\s*score)?|credit\s*check|credit\s*bureau\s*check|salary\s*slip)(?:\s*(?:required|needed|asked|demanded))?|'
            r'zero\s*(?:cibil|credit\s*check|income\s*proof)'
        ),
        "warning": "Bypass of Credit Checks & Income Verification",
        "explanation": "Advertising loans with 'no income verification' or without credit/CIBIL checks circumvents prudential underwriting norms mandated under RBI Digital Lending Directions. Regulated lenders must verify borrower repayment capability.",
        "severity": "HIGH"
    },
    {
        "id": "ZERO_DOCS",
        "category": "documentation",
        "pattern": r'no\s*documents?(?:\s*required)?|zero\s*paperwork|zero\s*documentation',
        "warning": "Zero Documentation Onboarding Claim",
        "explanation": "RBI Master Directions on Digital Lending require minimum Customer Due Diligence (KYC). Advertising zero documentation is commonly used by unauthorized lenders to lure distressed borrowers.",
        "severity": "MEDIUM"
    },
    {
        "id": "OTP_DEMAND",
        "category": "credentials",
        "pattern": r'(?:send|share|provide|enter)\s+(?:aadhaar\s*)?otp|(?:share|send)\s+bank\s+(?:password|pin|mpin)',
        "warning": "Direct Solicitation of One-Time Passwords (OTP) / Credentials",
        "explanation": "The advertisement solicits OTPs or banking credentials over insecure channels. Legitimate regulated entities never request customers to share OTPs or passwords.",
        "severity": "CRITICAL"
    },
    {
        "id": "CONTACTS_ACCESS",
        "category": "harassment",
        "pattern": r'(?:share|grant|give|allow)\s+(?:access\s+to\s+)?(?:your\s+)?contacts?\s+(?:and\s+)?(?:gallery)?|permission\s+to\s+access\s+contacts',
        "warning": "Intrusive Device Permissions Request (Contacts/Gallery)",
        "explanation": "RBI explicitly prohibits digital lending apps from accessing mobile phone contacts and gallery files. Such permissions are commonly exploited for extortion and harassment.",
        "severity": "CRITICAL"
    },
    {
        "id": "APK_SIDELOAD",
        "category": "harassment",
        "pattern": r'(?:download\s+apk|install\s+apk|\.apk\b)',
        "warning": "Direct APK Sideloading Outside Official App Stores",
        "explanation": "Distributing loan apps via standalone APK links bypasses Google Play and Apple App Store security screenings, typical of rogue predatory loan apps.",
        "severity": "HIGH"
    },
    {
        "id": "DAILY_RATE",
        "category": "interest",
        "pattern": r'[\d.]+\s*%\s*(?:per\s*day|daily)',
        "warning": "Deceptive Daily Interest Rate Framing",
        "explanation": "Quoting interest per day deceptively masks exorbitant annualized APRs (e.g. 0.1% daily = 36.5% p.a., 0.5% daily = 182.5% p.a.). RBI requires clear Annual Percentage Rate (APR) disclosures.",
        "severity": "HIGH"
    }
]

def detect_suspicious_claims(text: str) -> List[Dict[str, Any]]:
    detected = []
    clean_text = re.sub(r'\s+', ' ', text)
    
    for rule in RULES:
        match = re.search(rule["pattern"], clean_text, re.IGNORECASE)
        if match:
            start = max(0, match.start() - 30)
            end = min(len(clean_text), match.end() + 40)
            evidence = "..." + clean_text[start:end].strip() + "..."
            
            detected.append({
                "id": rule["id"],
                "phrase": match.group(0),
                "warning": rule["warning"],
                "explanation": rule["explanation"],
                "severity": rule["severity"],
                "evidence": evidence,
                "category": rule["category"]
            })
            
    return detected

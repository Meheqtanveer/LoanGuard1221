"""
LoanGuard Text and Entity Extraction Service (Python)
Extracts Indian phone numbers, emails, domains, claimed lenders, and financial figures.
"""

import re
from typing import Dict, List, Any, Optional

def extract_phone_numbers(text: str) -> List[str]:
    # Matches standard Indian phone numbers (+91, 10-digit mobile, 1800 toll-free, STD landlines)
    phone_regexes = [
        r'(?:(?:\+91|91|0)[-.\s]?)?[6-9]\d{9}',
        r'\b1800[-.\s]?\d{3}[-.\s]?\d{3,4}\b',
        r'\b0\d{2,4}[-.\s]?\d{6,8}\b'
    ]
    found = set()
    for regex in phone_regexes:
        for match in re.finditer(regex, text):
            digits = re.sub(r'\D', '', match.group(0))
            if len(digits) == 10 and digits[0] in '6789':
                found.add(digits)
            elif len(digits) == 12 and digits.startswith('91') and digits[2] in '6789':
                found.add(digits[2:])
            elif digits.startswith('1800') or (10 <= len(digits) <= 11):
                found.add(digits)
    return sorted(list(found))

def extract_emails(text: str) -> List[str]:
    email_regex = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    matches = re.findall(email_regex, text)
    return sorted(list(set(m.lower() for m in matches)))

def extract_domains(text: str) -> List[str]:
    domain_regex = r'\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.(?:com|in|co\.in|org|net|xyz|click|site|top|club|loan|online|tech|info|co|biz|live|app|cash))(?:\/[^\s]*)?'
    found = set()
    for match in re.finditer(domain_regex, text, re.IGNORECASE):
        d = match.group(1).lower()
        if d not in {'google.com', 'whatsapp.com', 'facebook.com', 'instagram.com', 't.me'}:
            found.add(d)
    return sorted(list(found))

def extract_claimed_lender(text: str) -> Dict[str, str]:
    lenders = [
        ('Bajaj Finance Limited', r'bajaj\s*(?:finance|finserv)'),
        ('HDFC Bank Limited', r'hdfc\s*(?:bank|personal\s*loan)?'),
        ('Krazybee Services Private Limited', r'krazybee|kreditbee'),
        ('State Bank of India', r'state\s*bank\s*of\s*india|sbi'),
        ('Earlysalary Services Private Limited (Fibe)', r'earlysalary|fibe'),
        ('PayU Finance India Private Limited', r'payu|lazypay'),
        ('Whizdm Innovations Private Limited', r'moneyview|whizdm'),
        ('Tata Capital Financial Services Limited', r'tata\s*capital'),
        ('IDFC FIRST Bank Limited', r'idfc\s*first'),
        ('Piramal Capital & Housing Finance Limited', r'piramal\s*(?:finance|capital)')
    ]
    for name, pattern in lenders:
        if re.search(pattern, text, re.IGNORECASE):
            return {"claimed_lender": name, "claimed_app": name.split()[0]}
            
    # Generic partner fallback
    match = re.search(r'(?:partner(?:\s+of)?|lender|nbfc|bank|finance):\s*([A-Za-z0-9\s&.,-]{3,35})', text, re.IGNORECASE)
    if match:
        name = match.group(1).strip()
        return {"claimed_lender": name, "claimed_app": name}

    return {"claimed_lender": "Not specifically declared", "claimed_app": "Unspecified Mobile App"}

def extract_financial_entities(text: str) -> Dict[str, Any]:
    # 1. Principal amount
    loan_amount = None
    amt_match = re.search(r'(?:rs\.?|₹|inr|loan(?:\s+of|\s+up\s+to)?)\s*([\d,]+(?:\.\d+)?)\s*(lakhs?|cr)?', text, re.IGNORECASE)
    if amt_match:
        val = float(amt_match.group(1).replace(',', ''))
        unit = (amt_match.group(2) or '').lower()
        if 'lakh' in unit:
            val *= 100000
        elif 'cr' in unit:
            val *= 10000000
        loan_amount = val

    # 2. Interest rate
    interest_rate = None
    period = "unknown"
    daily = re.search(r'([\d.]+)%\s*(?:per\s*day|daily)', text, re.IGNORECASE)
    monthly = re.search(r'([\d.]+)%\s*(?:per\s*month|monthly|p\.m\.)', text, re.IGNORECASE)
    annual = re.search(r'([\d.]+)%\s*(?:p\.a\.|per\s*annum|annual|yearly)', text, re.IGNORECASE)
    
    if daily:
        interest_rate = float(daily.group(1)) * 365
        period = "daily"
    elif monthly:
        interest_rate = float(monthly.group(1)) * 12
        period = "monthly"
    elif annual:
        interest_rate = float(annual.group(1))
        period = "annual"

    # 3. Tenure
    tenure_months = None
    tenure_days = None
    days = re.search(r'(\d+)\s*days?', text, re.IGNORECASE)
    months = re.search(r'(\d+)\s*(?:months?|mths?)', text, re.IGNORECASE)
    if days and int(days.group(1)) <= 90:
        tenure_days = int(days.group(1))
        tenure_months = max(1, round(tenure_days / 30))
    elif months:
        tenure_months = int(months.group(1))

    # 4. Processing Fee
    processing_fee = None
    fee_pct = re.search(r'(?:processing\s*fees?|file\s*charge)[^\d%]{0,15}([\d.]+)%', text, re.IGNORECASE)
    fee_flat_after = re.search(r'(?:processing\s*fees?|file\s*charges?|refundable\s*deposits?|advance\s*fee)[^\d]*(?:rs\.?|₹|inr)\s*([\d,]+)', text, re.IGNORECASE)
    fee_flat_before = re.search(r'(?:rs\.?|₹|inr)\s*([\d,]+)\s*(?:advance\s*processing\s*fee|advance\s*fee|processing\s*fee|file\s*charge|security\s*deposit)', text, re.IGNORECASE)

    if fee_pct:
        processing_fee = float(fee_pct.group(1))
    elif fee_flat_after:
        processing_fee = float(fee_flat_after.group(1).replace(',', ''))
    elif fee_flat_before:
        processing_fee = float(fee_flat_before.group(1).replace(',', ''))

    return {
        "loan_amount": loan_amount,
        "interest_rate": interest_rate,
        "interest_rate_period": period,
        "tenure_months": tenure_months,
        "tenure_days": tenure_days,
        "processing_fee": processing_fee
    }

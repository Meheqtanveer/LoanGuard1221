"""
LoanGuard Lender and Loan App Verification Service (Python)
Checks claimed entities against reference registries of RBI Regulated Entities and Digital Lending Apps.
"""

from typing import Dict, List, Any, Optional

DEFAULT_REFERENCE_LENDERS = [
    {
        "lender_id": "RBI-REG-001",
        "lender_name": "Bajaj Finance Limited",
        "regulated_entity": "Non-Banking Financial Company - Investment & Credit Company (NBFC-ICC)",
        "app_names": ["Bajaj Finserv", "Bajaj Finserv App"],
        "official_domains": ["bajajfinserv.in", "bajajfinance.in"],
        "source": "RBI Master List of NBFCs",
        "last_updated": "2026-08-15"
    },
    {
        "lender_id": "RBI-REG-002",
        "lender_name": "HDFC Bank Limited",
        "regulated_entity": "Scheduled Commercial Bank",
        "app_names": ["HDFC Bank MobileBanking", "PayZapp", "HDFC Bank Loan Assist"],
        "official_domains": ["hdfcbank.com"],
        "source": "RBI Schedule II Banking Roster",
        "last_updated": "2026-09-01"
    },
    {
        "lender_id": "RBI-REG-003",
        "lender_name": "Krazybee Services Private Limited",
        "regulated_entity": "Non-Banking Financial Company - Systemically Important (NBFC-ND-SI)",
        "app_names": ["KreditBee", "KreditBee: Quick Personal Loan"],
        "official_domains": ["kreditbee.in", "krazybee.com"],
        "source": "RBI DLA Roster",
        "last_updated": "2026-07-20"
    },
    {
        "lender_id": "RBI-REG-004",
        "lender_name": "State Bank of India",
        "regulated_entity": "Scheduled Commercial Bank",
        "app_names": ["YONO SBI", "SBI Quick"],
        "official_domains": ["sbi.co.in", "onlinesbi.sbi"],
        "source": "RBI Schedule II Banking Roster",
        "last_updated": "2026-09-10"
    },
    {
        "lender_id": "RBI-REG-005",
        "lender_name": "Earlysalary Services Private Limited (Fibe)",
        "regulated_entity": "Non-Banking Financial Company (NBFC-ICC)",
        "app_names": ["Fibe", "EarlySalary"],
        "official_domains": ["fibe.in", "earlysalary.com"],
        "source": "RBI Digital Lending Directory",
        "last_updated": "2026-08-01"
    },
    {
        "lender_id": "RBI-REG-006",
        "lender_name": "PayU Finance India Private Limited",
        "regulated_entity": "Non-Banking Financial Company (NBFC-ICC)",
        "app_names": ["LazyPay"],
        "official_domains": ["lazypay.in", "payufin.com"],
        "source": "RBI DLA Registry",
        "last_updated": "2026-06-30"
    },
    {
        "lender_id": "RBI-REG-007",
        "lender_name": "Whizdm Innovations Private Limited / Kisht Finance",
        "regulated_entity": "Non-Banking Financial Company (NBFC-ICC)",
        "app_names": ["moneyview", "Moneyview Personal Loan App"],
        "official_domains": ["moneyview.in"],
        "source": "RBI DLA Registry",
        "last_updated": "2026-08-25"
    },
    {
        "lender_id": "RBI-REG-008",
        "lender_name": "Tata Capital Financial Services Limited",
        "regulated_entity": "Non-Banking Financial Company - Upper Layer (NBFC-UL)",
        "app_names": ["Tata Capital", "Tata Neu"],
        "official_domains": ["tatacapital.com"],
        "source": "RBI Master List of NBFCs",
        "last_updated": "2026-09-12"
    },
    {
        "lender_id": "RBI-REG-009",
        "lender_name": "IDFC FIRST Bank Limited",
        "regulated_entity": "Scheduled Commercial Bank",
        "app_names": ["IDFC FIRST Bank App"],
        "official_domains": ["idfcfirstbank.com"],
        "source": "RBI Schedule II Banking Roster",
        "last_updated": "2026-07-15"
    },
    {
        "lender_id": "RBI-REG-010",
        "lender_name": "Piramal Capital & Housing Finance Limited",
        "regulated_entity": "Housing Finance Company / NBFC-ICC",
        "app_names": ["Piramal Finance"],
        "official_domains": ["piramalfinance.com"],
        "source": "National Housing Bank & RBI Register",
        "last_updated": "2026-08-30"
    }
]

def verify_lender_record(claimed_lender: str, claimed_app: str, domains: List[str], custom_lenders: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    registry = (custom_lenders or []) + DEFAULT_REFERENCE_LENDERS
    primary_domain = domains[0].lower() if domains else ""
    evidence = []

    if (not claimed_lender or claimed_lender == "Not specifically declared") and not domains:
        return {
            "status": "UNKNOWN",
            "claimed_lender": "Not specified",
            "claimed_app": claimed_app,
            "claimed_domain": primary_domain or "None",
            "claimed_entity": "Unknown",
            "explanation": "Insufficient information to perform verification. No lender corporate name or official domain detected.",
            "evidence": ["No recognized financial entity or web domain identified."],
            "source": "RBI Digital Lending Reference Registry (Local Copy)",
            "last_updated": "October 2026"
        }

    search_lender = claimed_lender.lower()
    matched = None
    for r in registry:
        r_name = r["lender_name"].lower()
        if r_name in search_lender or search_lender in r_name:
            matched = r
            break
        for d in r["official_domains"]:
            if any(dom in d or d in dom for dom in domains):
                matched = r
                break

    if matched:
        has_domain_match = any(d in primary_domain or primary_domain in d for d in matched["official_domains"]) if primary_domain else False
        
        # Conflict: claims lender name, but domain is completely unauthorized
        if primary_domain and not has_domain_match and len(search_lender) > 3 and matched["lender_name"].lower() in search_lender:
            evidence.append(f"Advertisement claims association with: {matched['lender_name']} ({matched['regulated_entity']}).")
            evidence.append(f"Official domains registered: {', '.join(matched['official_domains'])}.")
            evidence.append(f"CONFLICT: Advertisement points to unrecognized domain: {primary_domain}.")
            return {
                "status": "MISMATCH",
                "claimed_lender": claimed_lender,
                "claimed_app": claimed_app,
                "claimed_domain": primary_domain,
                "claimed_entity": matched["regulated_entity"],
                "explanation": f"Credential Mismatch: The ad names regulated entity '{matched['lender_name']}', but uses unauthorized domain '{primary_domain}'.",
                "evidence": evidence,
                "source": matched["source"],
                "last_updated": matched["last_updated"]
            }

        if has_domain_match:
            evidence.append(f"Verified Regulated Entity: {matched['lender_name']} ({matched['regulated_entity']}).")
            evidence.append(f"Authorized Domains: {', '.join(matched['official_domains'])}.")
            return {
                "status": "MATCHED",
                "claimed_lender": matched["lender_name"],
                "claimed_app": claimed_app,
                "claimed_domain": primary_domain,
                "claimed_entity": matched["regulated_entity"],
                "explanation": f"Claimed entity corresponds to registered {matched['regulated_entity']}. Note: Regulatory registration confirms licensing status, not an endorsement of advertisement terms.",
                "evidence": evidence,
                "source": matched["source"],
                "last_updated": matched["last_updated"]
            }

    evidence.append(f"Claimed lender '{claimed_lender}' was queried against reference entries.")
    if primary_domain:
        evidence.append(f"Domain '{primary_domain}' is not linked to any registered lender in this database.")

    return {
        "status": "NOT FOUND",
        "claimed_lender": claimed_lender,
        "claimed_app": claimed_app,
        "claimed_domain": primary_domain or "Not declared",
        "claimed_entity": "Unregistered / Unverified Entity",
        "explanation": f"No corresponding record for '{claimed_lender}' was found. Missing from directory does not automatically prove fraud (could be an unlisted intermediary), but independent checking on rbi.org.in is advised.",
        "evidence": evidence,
        "source": "RBI Digital Lending Reference Registry (Local Copy)",
        "last_updated": "October 2026"
    }

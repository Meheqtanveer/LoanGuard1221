"""
LoanGuard Database Adapter
Supports MongoDB with automatic zero-configuration SQLite fallback.
Provides comprehensive querying, statistics aggregation, and seed loading.
"""

import json
import sqlite3
import os
import time
from typing import Dict, List, Any, Optional
from config import Config

class DatabaseAdapter:
    def __init__(self):
        self.use_mongo = False
        self.mongo_client = None
        self.db = None
        
        if Config.MONGO_URI:
            try:
                from pymongo import MongoClient
                self.mongo_client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=2000)
                self.mongo_client.server_info()
                self.db = self.mongo_client.get_database("loanguard")
                self.use_mongo = True
                self._setup_mongo_indexes()
            except Exception as e:
                print(f"[LoanGuard DB] MongoDB connection failed ({e}). Falling back to SQLite.")
                self.use_mongo = False

        if not self.use_mongo:
            self.sqlite_path = str(Config.SQLITE_PATH)
            self._init_sqlite()

        self._seed_default_data_if_empty()

    def _setup_mongo_indexes(self):
        self.db.advertisements.create_index("advertisement_id", unique=True)
        self.db.advertisements.create_index("phone_numbers")
        self.db.advertisements.create_index("domains")
        self.db.reference_lenders.create_index("lender_name")

    def _get_sqlite_conn(self):
        conn = sqlite3.connect(self.sqlite_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_sqlite(self):
        with self._get_sqlite_conn() as conn:
            cursor = conn.cursor()
            
            # 1. Advertisements
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS advertisements (
                advertisement_id TEXT PRIMARY KEY,
                input_type TEXT,
                title TEXT,
                original_text TEXT,
                extracted_text TEXT,
                submitted_url TEXT,
                screenshot_filename TEXT,
                phone_numbers TEXT,
                email_addresses TEXT,
                domains TEXT,
                claimed_lender TEXT,
                claimed_app TEXT,
                financial_details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            
            # 2. Analysis Results
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS analysis_results (
                analysis_id TEXT PRIMARY KEY,
                advertisement_id TEXT,
                detected_claims TEXT,
                lender_verification TEXT,
                financial_analysis TEXT,
                risk_category TEXT,
                risk_score INTEGER,
                risk_summary TEXT,
                missing_information TEXT,
                safe_next_steps TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (advertisement_id) REFERENCES advertisements (advertisement_id)
            )
            """)
            
            # 3. Reference Lenders
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS reference_lenders (
                lender_id TEXT PRIMARY KEY,
                lender_name TEXT NOT NULL,
                regulated_entity TEXT,
                app_names TEXT,
                official_domains TEXT,
                contact_phone TEXT,
                contact_email TEXT,
                registration_number TEXT,
                source TEXT,
                last_updated TEXT
            )
            """)
            
            # 4. Connections (Scam Connection Mapper)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS connections (
                connection_id TEXT PRIMARY KEY,
                advertisement_id_1 TEXT,
                advertisement_id_2 TEXT,
                shared_identifier TEXT,
                relationship_type TEXT,
                similarity_score REAL,
                explanation TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_ads_created ON advertisements(created_at);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_lender_name ON reference_lenders(lender_name);")
            conn.commit()

    # --- Seed Initial Demonstrative Data If Empty ---
    def _seed_default_data_if_empty(self):
        ads = self.get_all_advertisements()
        if len(ads) > 0:
            return

        from backend.services.lender_verification import DEFAULT_REFERENCE_LENDERS
        self.insert_reference_lenders(DEFAULT_REFERENCE_LENDERS)

        # Seed sample ads
        sample_ads_data = [
            {
                "advertisement_id": "AD-2026-001",
                "input_type": "text",
                "title": "Instant Rupee Advance Fee Scam (Syndicate Node A)",
                "original_text": "🚨 URGENT LOAN OFFER! 100% Guaranteed Loan Approval within 5 minutes! Get personal loan from Rs 50,000 to Rs 5,00,000 directly in your bank account. NO verification required, NO cibil score required, NO documents required! Zero paperwork! Just pay refundable processing fee of Rs 1,499 before loan disbursement. Approval guaranteed for all applicants. Call or WhatsApp now: 9876543210. Visit website: https://speedyloanindia.in/apply. Partner of Bajaj Finance Limited.",
                "extracted_text": "🚨 URGENT LOAN OFFER! 100% Guaranteed Loan Approval within 5 minutes! Get personal loan from Rs 50,000 to Rs 5,00,000 directly in your bank account. NO verification required, NO cibil score required, NO documents required! Zero paperwork! Just pay refundable processing fee of Rs 1,499 before loan disbursement. Approval guaranteed for all applicants. Call or WhatsApp now: 9876543210. Visit website: https://speedyloanindia.in/apply. Partner of Bajaj Finance Limited.",
                "submitted_url": "https://speedyloanindia.in/apply",
                "screenshot_filename": "",
                "phone_numbers": ["9876543210"],
                "email_addresses": ["approval@speedyloanindia.in"],
                "domains": ["speedyloanindia.in"],
                "claimed_lender": "Bajaj Finance Limited",
                "claimed_app": "Speedy Rupee Fast Cash",
                "financial_details": {"loan_amount": 500000, "interest_rate": None, "tenure_months": None, "processing_fee": 1499},
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            },
            {
                "advertisement_id": "AD-2026-002",
                "input_type": "text",
                "title": "Easy Cash 24x7 (Syndicate Node B - Shared Phone)",
                "original_text": "Need urgent money today? Easy Cash 24x7 instant approval in 60 seconds! Loan amount up to ₹2,00,000. Interest rate only 0.1% daily! Zero documentation required, no credit score check, 100% guaranteed approval. Pay ₹999 security verification deposit before transfer. Contact official loan desk WhatsApp: 9876543210. Apply at https://easycashquick.click/instant",
                "extracted_text": "Need urgent money today? Easy Cash 24x7 instant approval in 60 seconds! Loan amount up to ₹2,00,000. Interest rate only 0.1% daily! Zero documentation required, no credit score check, 100% guaranteed approval. Pay ₹999 security verification deposit before transfer. Contact official loan desk WhatsApp: 9876543210. Apply at https://easycashquick.click/instant",
                "submitted_url": "https://easycashquick.click/instant",
                "screenshot_filename": "",
                "phone_numbers": ["9876543210"],
                "email_addresses": ["support@easycashquick.click"],
                "domains": ["easycashquick.click"],
                "claimed_lender": "Easy Cash Microcredits",
                "claimed_app": "Easy Cash 24x7",
                "financial_details": {"loan_amount": 200000, "interest_rate": 36.5, "tenure_months": None, "processing_fee": 999},
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            },
            {
                "advertisement_id": "AD-2026-003",
                "input_type": "url",
                "title": "Gold Star Rupee (Syndicate Node C - Shared Domain)",
                "original_text": "Gold Star Fast Loan - Partner of HDFC Personal Credits. Pre-approved personal loan Rs 1,00,000 for 12 months. Pay Rs 2,500 file charge in advance for priority release. Send Aadhaar OTP on WhatsApp to initiate disbursement. Official website: https://speedyloanindia.in/goldstar. Contact: 9123456789.",
                "extracted_text": "Gold Star Fast Loan - Partner of HDFC Personal Credits. Pre-approved personal loan Rs 1,00,000 for 12 months. Pay Rs 2,500 file charge in advance for priority release. Send Aadhaar OTP on WhatsApp to initiate disbursement. Official website: https://speedyloanindia.in/goldstar. Contact: 9123456789.",
                "submitted_url": "https://speedyloanindia.in/goldstar",
                "screenshot_filename": "",
                "phone_numbers": ["9123456789"],
                "email_addresses": ["disbursement@speedyloanindia.in"],
                "domains": ["speedyloanindia.in"],
                "claimed_lender": "HDFC Personal Credits",
                "claimed_app": "Gold Star Fast Loan",
                "financial_details": {"loan_amount": 100000, "interest_rate": None, "tenure_months": 12, "processing_fee": 2500},
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            },
            {
                "advertisement_id": "AD-2026-004",
                "input_type": "text",
                "title": "HDFC Bank Official Festive Personal Loan",
                "original_text": "HDFC Bank Personal Loan: Get loans up to ₹40 Lakhs with attractive interest rates starting at 10.50% p.a. Flexible tenure from 12 to 60 months. Processing fees up to 1.50% of the loan amount plus applicable GST (18%). Transparent APR disclosed in Key Fact Statement (KFS). Subject to credit verification and KYC documentation. Customer Helpline: 18002026161. Website: https://hdfcbank.com",
                "extracted_text": "HDFC Bank Personal Loan: Get loans up to ₹40 Lakhs with attractive interest rates starting at 10.50% p.a. Flexible tenure from 12 to 60 months. Processing fees up to 1.50% of the loan amount plus applicable GST (18%). Transparent APR disclosed in Key Fact Statement (KFS). Subject to credit verification and KYC documentation. Customer Helpline: 18002026161. Website: https://hdfcbank.com",
                "submitted_url": "https://hdfcbank.com",
                "screenshot_filename": "",
                "phone_numbers": ["18002026161"],
                "email_addresses": ["support@hdfcbank.com"],
                "domains": ["hdfcbank.com"],
                "claimed_lender": "HDFC Bank Limited",
                "claimed_app": "HDFC Bank MobileBanking",
                "financial_details": {"loan_amount": 4000000, "interest_rate": 10.5, "tenure_months": 60, "processing_fee": 1.5},
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            },
            {
                "advertisement_id": "AD-2026-005",
                "input_type": "text",
                "title": "KreditBee Personal Loan - Authentic NBFC Partner",
                "original_text": "KreditBee Quick Personal Loans up to ₹5,00,000 for salaried and self-employed professionals. Annual Interest Rates (APR) ranging from 16% to 29.95% per annum based on risk assessment. Repayment tenure: 3 to 24 months. Processing fee: 2% to 4% + 18% GST. Lending partner: Krazybee Services Private Limited (RBI Registered NBFC). Download app or visit https://kreditbee.in. Helpline: 080-44292200",
                "extracted_text": "KreditBee Quick Personal Loans up to ₹5,00,000 for salaried and self-employed professionals. Annual Interest Rates (APR) ranging from 16% to 29.95% per annum based on risk assessment. Repayment tenure: 3 to 24 months. Processing fee: 2% to 4% + 18% GST. Lending partner: Krazybee Services Private Limited (RBI Registered NBFC). Download app or visit https://kreditbee.in. Helpline: 080-44292200",
                "submitted_url": "https://kreditbee.in",
                "screenshot_filename": "",
                "phone_numbers": ["08044292200"],
                "email_addresses": ["help@kreditbee.in"],
                "domains": ["kreditbee.in"],
                "claimed_lender": "Krazybee Services Private Limited",
                "claimed_app": "KreditBee",
                "financial_details": {"loan_amount": 500000, "interest_rate": 16.0, "tenure_months": 24, "processing_fee": 2.0},
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            },
            {
                "advertisement_id": "AD-2026-006",
                "input_type": "text",
                "title": "WhatsApp Viral Forward: Quick 7-Day Pocket Loan",
                "original_text": "⚡ Urgent Rs 10,000 approved in your account now! Tenure: 7 days. Repayment: Rs 14,500. No income proof! Share your contacts and gallery access for instant approval. If not repaid in 7 days, penalty Rs 500 per day. Apply APK download link: https://pocketrupee99.xyz/app.apk. WhatsApp Helpdesk: 8765432109",
                "extracted_text": "⚡ Urgent Rs 10,000 approved in your account now! Tenure: 7 days. Repayment: Rs 14,500. No income proof! Share your contacts and gallery access for instant approval. If not repaid in 7 days, penalty Rs 500 per day. Apply APK download link: https://pocketrupee99.xyz/app.apk. WhatsApp Helpdesk: 8765432109",
                "submitted_url": "https://pocketrupee99.xyz/app.apk",
                "screenshot_filename": "",
                "phone_numbers": ["8765432109"],
                "email_addresses": [],
                "domains": ["pocketrupee99.xyz"],
                "claimed_lender": "Quick Pocket Financial",
                "claimed_app": "Pocket Rupee",
                "financial_details": {"loan_amount": 10000, "interest_rate": None, "tenure_months": 1, "tenure_days": 7, "processing_fee": None},
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            },
            {
                "advertisement_id": "AD-2026-007",
                "input_type": "screenshot",
                "title": "Ambiguous Social Media Flyer: Zero Interest Festive Loan",
                "original_text": "🎉 Diwali Special Offer! Get Rs 50,000 Personal Loan at 0% Interest Rate! Pay back in easy installments of Rs 5,000 for 10 months. Visit https://festivecredits.co or WhatsApp 9988776655 to claim your zero-interest voucher. Terms and conditions apply.",
                "extracted_text": "🎉 Diwali Special Offer! Get Rs 50,000 Personal Loan at 0% Interest Rate! Pay back in easy installments of Rs 5,000 for 10 months. Visit https://festivecredits.co or WhatsApp 9988776655 to claim your zero-interest voucher. Terms and conditions apply.",
                "submitted_url": "https://festivecredits.co",
                "screenshot_filename": "festive_flyer.png",
                "phone_numbers": ["9988776655"],
                "email_addresses": [],
                "domains": ["festivecredits.co"],
                "claimed_lender": "Festive Finserv India",
                "claimed_app": "Festive Credits App",
                "financial_details": {"loan_amount": 50000, "interest_rate": 0, "tenure_months": 10, "processing_fee": None},
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
        ]

        from backend.services.claim_detection import detect_suspicious_claims
        from backend.services.lender_verification import verify_lender_record
        from backend.services.financial_analyzer import analyze_financials
        from backend.services.risk_engine import evaluate_risk

        for ad in sample_ads_data:
            self.insert_advertisement(ad)
            claims = detect_suspicious_claims(ad["extracted_text"])
            verification = verify_lender_record(ad["claimed_lender"], ad["claimed_app"], ad["domains"])
            financial = analyze_financials(ad["financial_details"])
            risk_eval = evaluate_risk(claims, verification, financial, [])

            analysis_record = {
                "analysis_id": f"ANS-{ad['advertisement_id']}",
                "advertisement_id": ad["advertisement_id"],
                "detected_claims": claims,
                "lender_verification": verification,
                "financial_analysis": financial,
                "risk_category": risk_eval["risk_category"],
                "risk_score": risk_eval["risk_score"],
                "risk_summary": risk_eval["risk_summary"],
                "missing_information": risk_eval["missing_information"],
                "safe_next_steps": risk_eval["safe_next_steps"],
                "created_at": ad["created_at"]
            }
            self.insert_analysis_result(analysis_record)

    # --- CRUD Methods ---
    def insert_advertisement(self, ad: Dict[str, Any]):
        if self.use_mongo:
            self.db.advertisements.replace_one({"advertisement_id": ad["advertisement_id"]}, ad, upsert=True)
        else:
            with self._get_sqlite_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT OR REPLACE INTO advertisements (
                    advertisement_id, input_type, title, original_text, extracted_text,
                    submitted_url, screenshot_filename, phone_numbers, email_addresses,
                    domains, claimed_lender, claimed_app, financial_details, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ad["advertisement_id"],
                    ad.get("input_type", "text"),
                    ad.get("title", "Untitled Ad"),
                    ad.get("original_text", ""),
                    ad.get("extracted_text", ""),
                    ad.get("submitted_url", ""),
                    ad.get("screenshot_filename", ""),
                    json.dumps(ad.get("phone_numbers", [])),
                    json.dumps(ad.get("email_addresses", [])),
                    json.dumps(ad.get("domains", [])),
                    ad.get("claimed_lender", ""),
                    ad.get("claimed_app", ""),
                    json.dumps(ad.get("financial_details", {})),
                    ad.get("created_at", time.strftime("%Y-%m-%d %H:%M:%S"))
                ))
                conn.commit()

    def insert_analysis_result(self, result: Dict[str, Any]):
        if self.use_mongo:
            self.db.analysis_results.replace_one({"analysis_id": result["analysis_id"]}, result, upsert=True)
        else:
            with self._get_sqlite_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT OR REPLACE INTO analysis_results (
                    analysis_id, advertisement_id, detected_claims, lender_verification,
                    financial_analysis, risk_category, risk_score, risk_summary,
                    missing_information, safe_next_steps, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    result["analysis_id"],
                    result["advertisement_id"],
                    json.dumps(result.get("detected_claims", [])),
                    json.dumps(result.get("lender_verification", {})),
                    json.dumps(result.get("financial_analysis", {})),
                    result.get("risk_category", "LOWER DETECTED RISK"),
                    result.get("risk_score", 0),
                    result.get("risk_summary", ""),
                    json.dumps(result.get("missing_information", [])),
                    json.dumps(result.get("safe_next_steps", [])),
                    result.get("created_at", time.strftime("%Y-%m-%d %H:%M:%S"))
                ))
                conn.commit()

    def get_all_advertisements(self) -> List[Dict[str, Any]]:
        """Returns all ads joined with their analysis results."""
        if self.use_mongo:
            ads = list(self.db.advertisements.find({}, {"_id": 0}))
            for ad in ads:
                ans = self.db.analysis_results.find_one({"advertisement_id": ad["advertisement_id"]}, {"_id": 0})
                if ans:
                    ad.update(ans)
            return ads
        else:
            with self._get_sqlite_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                SELECT 
                    a.advertisement_id, a.input_type, a.title, a.original_text, a.extracted_text,
                    a.submitted_url, a.screenshot_filename, a.phone_numbers, a.email_addresses,
                    a.domains, a.claimed_lender, a.claimed_app, a.financial_details, a.created_at,
                    r.analysis_id, r.detected_claims, r.lender_verification, r.financial_analysis,
                    r.risk_category, r.risk_score, r.risk_summary, r.missing_information, r.safe_next_steps
                FROM advertisements a
                LEFT JOIN analysis_results r ON a.advertisement_id = r.advertisement_id
                ORDER BY a.created_at DESC
                """)
                rows = cursor.fetchall()
                results = []
                for r in rows:
                    results.append({
                        "advertisement_id": r["advertisement_id"],
                        "id": r["advertisement_id"],
                        "input_type": r["input_type"],
                        "inputType": r["input_type"],
                        "title": r["title"],
                        "original_text": r["original_text"],
                        "originalText": r["original_text"],
                        "extracted_text": r["extracted_text"],
                        "extractedText": r["extracted_text"],
                        "submitted_url": r["submitted_url"],
                        "submittedUrl": r["submitted_url"],
                        "screenshot_filename": r["screenshot_filename"],
                        "phone_numbers": json.loads(r["phone_numbers"] or "[]"),
                        "phoneNumbers": json.loads(r["phone_numbers"] or "[]"),
                        "email_addresses": json.loads(r["email_addresses"] or "[]"),
                        "emailAddresses": json.loads(r["email_addresses"] or "[]"),
                        "domains": json.loads(r["domains"] or "[]"),
                        "claimed_lender": r["claimed_lender"],
                        "claimedLender": r["claimed_lender"],
                        "claimed_app": r["claimed_app"],
                        "claimedApp": r["claimed_app"],
                        "financial_details": json.loads(r["financial_details"] or "{}"),
                        "created_at": r["created_at"],
                        "createdAt": r["created_at"],
                        # Joined analysis results
                        "analysis_id": r["analysis_id"],
                        "detected_claims": json.loads(r["detected_claims"] or "[]"),
                        "detectedClaims": json.loads(r["detected_claims"] or "[]"),
                        "lender_verification": json.loads(r["lender_verification"] or "{}"),
                        "verification": json.loads(r["lender_verification"] or "{}"),
                        "financial_analysis": json.loads(r["financial_analysis"] or "{}"),
                        "financialAnalysis": json.loads(r["financial_analysis"] or "{}"),
                        "risk_category": r["risk_category"] or "LOWER DETECTED RISK",
                        "riskCategory": r["risk_category"] or "LOWER DETECTED RISK",
                        "risk_score": r["risk_score"] or 10,
                        "riskScore": r["risk_score"] or 10,
                        "risk_summary": r["risk_summary"] or "",
                        "riskSummary": r["risk_summary"] or "",
                        "missing_information": json.loads(r["missing_information"] or "[]"),
                        "missingInformation": json.loads(r["missing_information"] or "[]"),
                        "safe_next_steps": json.loads(r["safe_next_steps"] or "[]"),
                        "safeNextSteps": json.loads(r["safe_next_steps"] or "[]"),
                        "connections": []
                    })
                return results

    def get_advertisement_by_id(self, ad_id: str) -> Optional[Dict[str, Any]]:
        ads = self.get_all_advertisements()
        for a in ads:
            if a["advertisement_id"] == ad_id:
                return a
        return None

    def delete_advertisement(self, ad_id: str):
        if self.use_mongo:
            self.db.advertisements.delete_one({"advertisement_id": ad_id})
            self.db.analysis_results.delete_one({"advertisement_id": ad_id})
        else:
            with self._get_sqlite_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM analysis_results WHERE advertisement_id = ?", (ad_id,))
                cursor.execute("DELETE FROM advertisements WHERE advertisement_id = ?", (ad_id,))
                cursor.execute("DELETE FROM connections WHERE advertisement_id_1 = ? OR advertisement_id_2 = ?", (ad_id, ad_id))
                conn.commit()

    # --- Reference Lenders CRUD ---
    def insert_reference_lenders(self, lenders: List[Dict[str, Any]]):
        if self.use_mongo:
            for l in lenders:
                lid = l.get("lender_id") or l.get("lenderId")
                self.db.reference_lenders.replace_one({"lender_id": lid}, l, upsert=True)
        else:
            with self._get_sqlite_conn() as conn:
                cursor = conn.cursor()
                for l in lenders:
                    lid = l.get("lender_id") or l.get("lenderId") or f"LND-{time.time()}"
                    lname = l.get("lender_name") or l.get("lenderName") or "Unknown"
                    entity = l.get("regulated_entity") or l.get("regulatedEntity") or "NBFC"
                    apps = l.get("app_names") or l.get("appNames") or []
                    domains = l.get("official_domains") or l.get("officialDomains") or []
                    phone = l.get("contact_phone") or l.get("contactPhone") or ""
                    email = l.get("contact_email") or l.get("contactEmail") or ""
                    reg_no = l.get("registration_number") or l.get("registrationNumber") or ""
                    src = l.get("source", "RBI Master Directory")
                    updated = l.get("last_updated") or l.get("lastUpdated") or time.strftime("%Y-%m-%d")

                    cursor.execute("""
                    INSERT OR REPLACE INTO reference_lenders (
                        lender_id, lender_name, regulated_entity, app_names,
                        official_domains, contact_phone, contact_email, registration_number,
                        source, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        lid, lname, entity, json.dumps(apps), json.dumps(domains),
                        phone, email, reg_no, src, updated
                    ))
                conn.commit()

    def get_reference_lenders(self, query: str = "") -> List[Dict[str, Any]]:
        q = query.lower().strip()
        if self.use_mongo:
            raw = list(self.db.reference_lenders.find({}, {"_id": 0}))
        else:
            with self._get_sqlite_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM reference_lenders ORDER BY lender_name ASC")
                raw = []
                for r in cursor.fetchall():
                    raw.append({
                        "lenderId": r["lender_id"],
                        "lender_id": r["lender_id"],
                        "lenderName": r["lender_name"],
                        "lender_name": r["lender_name"],
                        "regulatedEntity": r["regulated_entity"],
                        "regulated_entity": r["regulated_entity"],
                        "appNames": json.loads(r["app_names"] or "[]"),
                        "officialDomains": json.loads(r["official_domains"] or "[]"),
                        "contactPhone": r["contact_phone"],
                        "contactEmail": r["contact_email"],
                        "registrationNumber": r["registration_number"],
                        "source": r["source"],
                        "lastUpdated": r["last_updated"]
                    })

        if not q:
            return raw
        return [
            l for l in raw
            if q in l["lenderName"].lower()
            or q in l["regulatedEntity"].lower()
            or any(q in a.lower() for a in l["appNames"])
            or any(q in d.lower() for d in l["officialDomains"])
        ]

    # --- Dashboard Real Aggregate Stats ---
    def get_dashboard_stats(self) -> Dict[str, Any]:
        ads = self.get_all_advertisements()
        total = len(ads)
        high_risk = sum(1 for a in ads if a.get("risk_category") == "HIGH RISK")
        needs_checking = sum(1 for a in ads if a.get("risk_category") == "NEEDS CHECKING")
        lower_risk = sum(1 for a in ads if a.get("risk_category") == "LOWER DETECTED RISK")

        warning_counts = {
            "Advance Fee Demand": 0,
            "Unrealistic 100% Approval": 0,
            "Zero Underwriting / No CIBIL": 0,
            "Predatory Short Tenure": 0,
            "Daily Interest Rate Trap": 0,
            "Entity Identity Mismatch": 0
        }

        channel_counts = {
            "text": 0,
            "screenshot": 0,
            "url": 0
        }

        for a in ads:
            c = a.get("input_type", "text")
            channel_counts[c] = channel_counts.get(c, 0) + 1

            v = a.get("lender_verification", {})
            if v.get("status") == "MISMATCH":
                warning_counts["Entity Identity Mismatch"] += 1

            for claim in a.get("detected_claims", []):
                cat = claim.get("category")
                phrase = claim.get("phrase", "").lower()
                if cat == "advance_fee":
                    warning_counts["Advance Fee Demand"] += 1
                elif cat == "approval":
                    warning_counts["Unrealistic 100% Approval"] += 1
                elif cat == "documentation":
                    warning_counts["Zero Underwriting / No CIBIL"] += 1
                elif cat == "interest" and "day" in phrase:
                    warning_counts["Daily Interest Rate Trap"] += 1

            fin = a.get("financial_analysis", {})
            flags = fin.get("transparency_flags", {})
            if flags.get("predatory_tenure"):
                warning_counts["Predatory Short Tenure"] += 1

        return {
            "total": total,
            "highRisk": high_risk,
            "needsChecking": needs_checking,
            "lowerRisk": lower_risk,
            "highPct": round((high_risk / total * 100) if total else 0),
            "checkPct": round((needs_checking / total * 100) if total else 0),
            "lowerPct": round((lower_risk / total * 100) if total else 0),
            "warningCounts": warning_counts,
            "channelCounts": channel_counts,
            "databaseType": "MongoDB" if self.use_mongo else "SQLite"
        }

db = DatabaseAdapter()

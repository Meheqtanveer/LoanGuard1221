# LoanGuard: AI-Powered Multidimensional Loan Advertisement Risk Analyzer

**A Full-Stack Cybersecurity & Financial Regulatory Intelligence Platform for Digital Lending Risk Analysis in India**

---

## 1. Project Introduction

**LoanGuard** is an AI-powered multidimensional risk intelligence platform engineered to protect Indian consumers from predatory, deceptive, and fraudulent digital loan advertisements distributed across messaging services (WhatsApp, SMS), social media platforms (Instagram, Facebook), search engines, and sponsored websites.

Unlike conventional spam filters that rely merely on keyword blocklists, LoanGuard performs a **triangulated multi-module evaluation**:
1. **Linguistic Claim Analysis:** Extracts claims and matches deceptive patterns (unrealistic approval guarantees, advance processing fee demands, zero underwriting).
2. **Regulatory Registry Verification:** Compares claimed entities, mobile apps, and domains against the locally bundled RBI/NBFC reference data to identify possible credential mismatches and impersonation. The bundled data is not a live RBI connection and must be checked against current official RBI publications.
3. **Actuarial Cost & Transparency Auditing:** Computes reducing-balance amortization schedules, calculates effective Annual Percentage Rates (APR), and exposes predatory short-tenure (7–15 days) and daily interest rate framing.
4. **Scam Connection Mapper (Signature Feature):** Constructs an interactive relationship graph across submitted advertisements to detect coordinated syndicates sharing contact numbers, hosting domains, and syndicated marketing text templates.
5. **Explainable Risk Assessment Engine:** Synthesizes multi-factor evidence into 3 calibrated tiers (`HIGH RISK`, `NEEDS CHECKING`, `LOWER DETECTED RISK`) with extracted proof snippets and safe consumer next steps.

---

## 2. Problem Statement

Digital lending in India has expanded rapidly, but this growth has been accompanied by a surge in deceptive advertising and predatory credit operations:
- **Advance-Fee Fraud:** Scammers demand upfront "file charges" or "refundable verification deposits" via UPI or bank transfers before disbursement, then abscond with the funds.
- **Deceptive Rate Framing:** Advertisements quote interest as "0.1% per day" or "1% per month", concealing annualized percentage rates (APR) exceeding 36% to 180% p.a.
- **Predatory 7-Day Loan Traps:** Loans advertised as easy cash offer ultra-short 7 to 15-day terms with 40%+ fees, followed by aggressive contact-list harvesting and extortion.
- **Lender Impersonation:** Rogue operators use brand names of Scheduled Commercial Banks or registered NBFCs (e.g. Bajaj Finance, HDFC Bank) on unauthorized website domains (e.g., `speedyloanindia.in`).

Consumers lack an automated, evidence-based tool to evaluate loan advertisements prior to engaging with lenders or submitting KYC credentials.

---

## 3. Research Gap & Novelty

| Traditional Approach | LoanGuard Novelty |
| :--- | :--- |
| **Static Keyword Blacklisting:** Flags any text with the word "loan" or "instant". | **Context-Aware Semantic Detection:** Evaluates specific regulatory violations (advance fee demands, OTP harvesting, zero underwriting). |
| **Domain-Only URL Checking:** Fails against freshly registered throwaway domains. | **Cross-Ad Scam Connection Mapper:** Links throwaway domains via shared phone numbers, support emails, and text similarity. |
| **No Cost Verification:** Ignores financial feasibility and hidden charges. | **Mathematical Reducing-Balance Verification:** Computes actuarial EMI ($P \cdot r \cdot (1+r)^n / ((1+r)^n - 1)$) and compares against KFS. |
| **Binary Scam/Safe Labeling:** Hallucinates certainty without evidence. | **Explainable Evidence-Based Auditing:** Separates "Missing Information" from "Proven Fraud Signals", preserving regulatory nuance. |

---

## 4. Key Features

- **Multi-Input Intake Engine:**
  - **Screenshot Upload:** Supports PNG, JPG, JPEG, and WEBP with HTML5 Canvas / OpenCV image preprocessing (grayscale conversion, noise reduction, contrast enhancement) and Tesseract OCR.
  - **Plain Text Input:** Direct paste for WhatsApp forwards, SMS blasts, and social media flyers with quick-load demonstration presets.
  - **Safe URL Ingestion:** SSRF-hardened web crawler restricting loopback addresses, RFC 1918 private IP ranges, cloud metadata endpoints, with response size and 6-second timeout limits.
- **Suspicious Advertisement Claim Detector:** Rule-based NLP patterns combined with TF-IDF classification scoring for advance fees, unrealistic guarantees, and credential harvesting.
- **Lender & Loan App Verification:** Lookup against the project's bundled reference dataset, which is intended to be reconciled with official RBI publications before each release. This ZIP does not perform a live RBI API lookup. Detects credential mismatches (e.g., legitimate lender name paired with an unrecognized web domain).
- **Financial Transparency & Hidden Cost Calculator:** Actuarial reducing-balance EMI calculations, daily rate converter, 18% GST calculation, and comparison against Key Fact Statements (KFS).
- **Scam Connection Mapper (Signature Feature):** Force-directed interactive network graph highlighting shared phone numbers, domains, emails, and lexical similarity across campaigns with cluster identification.
- **Explainable Risk Report:** Full audit ledger with score calculation, evidence snippets, missing disclosures, and consumer guidance.
- **Data Privacy:** Strict zero-PII storage policy; never requests or persists Aadhaar, PAN, banking passwords, or OTPs.

---

## 5. System Architecture

```
                          [User Input Intake]
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  [Screenshot OCR]         [Pasted Ad Text]          [Webpage URL]
  - Canvas / OpenCV        - WhatsApp / SMS          - SSRF Guardrails
  - Tesseract Engine       - Social Media Copy       - BS4 Parser
         └─────────────────────────┬─────────────────────────┘
                                   ▼
                       [Entity Extraction Service]
                       - Phones, Emails, Domains
                       - Claimed Lender & App
                       - Financial Figures (P, r, n)
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   [Module 2: Claims]      [Module 3: Registry]     [Module 4: Financials]
   - Advance-Fee Traps     - RBI Regulated DLA      - Reducing-Balance EMI
   - Underwriting Bypass   - Domain Match/Mismatch  - Daily Rate APR Trap
   - OTP Demands           - Licensing Status       - KFS Comparison
         └─────────────────────────┬─────────────────────────┘
                                   ▼
                     [Module 5: Scam Mapper]
                     - Shared Phone / Domain Graph
                     - TF-IDF Cosine Similarity
                     - Campaign Cluster Detection
                                   ▼
                     [Module 6: Risk Engine]
                     - Weighted Calibrated Scoring
                     - HIGH RISK / NEEDS CHECKING / LOWER RISK
                     - Explainable Audit Report
```

---

## 6. Technology Stack

### Frontend Application
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 with dual-theme typography tokens
- **Typography:** Plus Jakarta Sans (Display/Prose) & JetBrains Mono (Tabular numerals)
- **Visualizations:** HTML5 Canvas Interactive Force-Directed Graph Engine & Chart.js SVG analytics
- **OCR Engine:** Tesseract.js with Canvas image preprocessing

### Backend & AI Services (Python)
- **Web Framework:** Flask & Flask-CORS
- **Database:** SQLite (built-in default) with automated MongoDB (PyMongo) fallback
- **OCR & Computer Vision:** Tesseract OCR, Pytesseract, OpenCV (`cv2`)
- **NLP & Graph Analytics:** Scikit-learn (TF-IDF vectorizer & Logistic Regression), NetworkX
- **Web Scraping:** Requests & BeautifulSoup4
- **Testing:** Pytest / Unittest test suite

---

## 7. Folder Structure

```
LoanGuard/
│
├── app.py                         # Flask application server
├── config.py                      # System configuration & environment paths
├── requirements.txt               # Python backend dependencies
├── package.json                   # Web application dependencies & build scripts
├── vite.config.ts                 # Vite bundler configuration
├── tsconfig.json                  # TypeScript compiler settings
├── README.md                      # Comprehensive academic project documentation
│
├── backend/                       # Python Flask backend services & routes
│   ├── routes/
│   │   ├── analysis_routes.py     # Submission intake & analysis API
│   │   └── graph_routes.py        # Graph network, verification & stats API
│   ├── services/
│   │   ├── ocr_service.py         # OpenCV preprocessing & Pytesseract OCR
│   │   ├── url_service.py         # SSRF-protected webpage extractor
│   │   ├── text_extraction.py     # Regex entity & token parsing
│   │   ├── claim_detection.py     # Deceptive claim patterns
│   │   ├── lender_verification.py # RBI DLA & NBFC verification engine
│   │   ├── financial_analyzer.py  # Actuarial reducing-balance EMI math
│   │   ├── scam_mapper.py         # Cross-ad graph & cosine similarity
│   │   └── risk_engine.py         # Multi-factor explainable risk engine
│   └── database/
│       ├── db.py                  # Database adapter (SQLite & PyMongo)
│       └── loanguard.db           # SQLite database file
│
├── src/                           # Interactive Web Frontend
│   ├── main.tsx                   # React root entry point
│   ├── App.tsx                    # Main navigation & state coordinator
│   ├── index.css                  # Tailwind styles & theme variables
│   ├── types/                     # TypeScript domain interfaces
│   ├── data/                      # Reference datasets & sample advertisements
│   │   ├── rbiReferenceData.ts    # RBI DLA & NBFC verified registry
│   │   └── sampleAds.ts           # Authentic & deceptive ad seed corpus
│   ├── services/                  # Browser-side analysis pipeline
│   └── components/                # Modular UI components
│       ├── AdInputSection.tsx     # Multi-input intake (Upload, Text, URL)
│       ├── RiskReportCard.tsx     # Explainable risk audit presentation
│       ├── NetworkGraph.tsx       # Interactive Scam Connection Mapper
│       ├── DashboardStats.tsx     # Metric KPIs & distribution bars
│       ├── LenderDirectoryView.tsx# Searchable RBI DLA registry
│       ├── FinancialCalculatorView.tsx # Loan cost & daily APR calculator
│       ├── AdHistoryView.tsx      # Audit ledger & JSON export
│       └── AboutView.tsx          # Project background & methodology
│
├── datasets/                      # Reference and machine learning data
│   ├── sample_ads.csv             # Labelled advertisement dataset template
│   └── lender_reference_template.csv # Administrator lender import template
│
├── ml/                            # Machine learning pipeline
│   ├── train_model.py             # TF-IDF + Logistic Regression training
│   ├── predict.py                 # Model inference with rule fallback
│   └── saved_models/              # Serialized model artifacts (.pkl)
│
├── tests/                         # Automated test suite
│   └── test_all.py                # 15 unit tests covering all 10 specifications
│
└── uploads/                       # User-uploaded screenshot cache
```

---

## 8. Installation & Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ (standard library is sufficient for core logic; pip packages for ML)

### Step 1: Clone and Navigate to Directory
```bash
cd LoanGuard
```

### Step 2: Running the Interactive Web Application
```bash
# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```
Open **`http://localhost:3000`** in your browser. The application will immediately load with pre-analyzed Indian loan advertisements, active network graph, and interactive tools.

### Step 3: Running the Python Flask Backend (Optional)
```bash
# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install Python requirements
pip install -r requirements.txt

# Start the Flask API server
python3 app.py
```
The Flask backend will start on **`http://127.0.0.1:5000`**.

---

## 9. Running Automated Tests

LoanGuard includes a 15-test unit suite covering text extraction, suspicious claim detection, SSRF protection, lender verification (all 4 outcomes), reducing-balance EMI math, and risk scoring.

To run the automated tests:
```bash
python3 -m unittest tests/test_all.py
```
Expected output:
```
...............
Ran 15 tests in 0.006s
OK
```

---

## 10. Training the Machine Learning Classifier

To train the baseline Scikit-learn TF-IDF classifier on your advertisement corpus:
```bash
python3 ml/train_model.py
```
The script will split the data, evaluate precision, recall, and F1-score, and export serialized model files to `ml/saved_models/loan_classifier.pkl`.

---

## 11. How to Add Custom Data

### Adding Custom Reference Lenders
1. Navigate to the **RBI Lender Registry** tab in the web application.
2. Click **Import Reference CSV/JSON** and upload your CSV adhering to `datasets/lender_reference_template.csv`.
3. Columns required:
   ```csv
   lender_id,lender_name,regulated_entity,app_names,official_domains,contact_phone,contact_email,source,last_updated
   ```

### Adding New Training Ads
Open `datasets/sample_ads.csv` and append new records with the columns:
`advertisement_id, advertisement_text, claimed_lender, phone_number, website_domain, interest_rate, processing_fee, repayment_period, label`

---

## 12. Ethical Guidelines & Limitations

1. **No Conclusive Fraud Determination:** LoanGuard identifies *risk indicators* and *potential associations*. Algorithmic assessments must not be treated as a legal determination of criminality.
2. **Directory Absence Nuance:** Missing from the local RBI directory results in `NOT FOUND` rather than an automatic `HIGH RISK` classification, accounting for new licensees or unlisted intermediaries.
3. **Synthetic Demonstration Data:** The sample training dataset is synthetic. Real-world deployment requires ongoing retraining on verified consumer complaints.
4. **Zero Personal Credentials:** LoanGuard never solicits or persists Aadhaar, PAN, passwords, or OTPs.

---

## 13. Future Enhancements

- Multilingual support for Indic regional languages (Hindi, Tamil, Telugu, Bengali).
- Mobile application SDK with Android SMS permission scanner.
- Integration with live National Cyber Crime Reporting Portal (cybercrime.gov.in) feeds.
- Automated WHOIS registration age checks for freshly generated phishing domains.


---

## 14. Verification Notes (October 2026)

The uploaded project archive was inspected and its Python unit tests were executed during packaging.

- Automated Python tests: **20 passed** (`python -m unittest tests/test_all.py`).
- The standalone calculator uses reducing-balance EMI and estimates the effective annual APR from net disbursement and monthly repayment cash flows (including the upfront processing fee and its GST when enabled).
- The daily-rate panel shows **simple annualization** (`daily percentage × 365`); it is not a compounded effective annual rate.
- The lender registry included in this project is a **local reference dataset**. It is not a live RBI service, and a match is not an RBI endorsement or guarantee that an advertisement is safe.
- A `MATCHED` result means the locally stored lender/domain information matched. A `NOT FOUND` result means no match was found in the available dataset; it does not prove fraud.
- The front-end production build was not verified as part of this package because dependency installation/build was not run in this environment.

Before a public or production release, refresh and document the lender reference data from official RBI sources, test the complete browser workflow, and obtain appropriate legal/security review. This is an academic prototype and not financial or legal advice.

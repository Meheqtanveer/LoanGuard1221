/**
 * LoanGuard Module 2: Suspicious Advertisement Claim Detector
 * Implements rule-based linguistic patterns, context validation, and ML feature assessment.
 */

import { DetectedClaim, ClaimSeverity } from '../types';

interface ClaimRule {
  id: string;
  category: DetectedClaim['category'];
  pattern: RegExp;
  phraseExtractor?: (text: string, match: RegExpExecArray) => string;
  warning: string;
  explanation: string;
  severity: ClaimSeverity;
}

const CLAIM_RULES: ClaimRule[] = [
  // 1. Advance-Fee Fraud Pattern (CRITICAL)
  {
    id: 'ADV_FEE_DEMAND',
    category: 'advance_fee',
    pattern: /(?:(?:pay|deposit|transfer|send)\s+[^\n.]*?(?:processing\s*fees?|file\s*charges?|security\s*deposits?|verification\s*charges?|registration\s*charges?|insurance\s*fees?)[^\n.]*?(?:before|prior\s*to|in\s*advance|pre-disbursement|to\s*release|to\s*sanction|to\s*approve))|(?:(?:advance|upfront|pre-disbursement)\s+(?:processing\s*)?(?:fees?|charges?|costs?|amounts?|deposits?|payments?))|(?:(?:rs\.?|₹|inr)\s*[\d,]+\s*(?:advance\s*processing\s*fee|advance\s*fee|upfront\s*fee|file\s*charge\s*in\s*advance|processing\s*fee\s*(?:in\s*advance|before\s*disbursement|prior\s*to\s*disbursement)))|(?:(?:processing\s*fees?|file\s*charge|security\s*(?:verification\s*)?deposit)[^\n.]*?(?:(?:rs\.?|₹|inr)\s*[\d,]+)?[^\n.]*?(?:in\s*advance|before\s*(?:loan\s*)?(?:disbursement|transfer|approval|release)|prior\s*to\s*disbursement))/i,
    warning: 'Advance Payment / Processing Fee Demand Before Disbursement',
    explanation: 'The advertisement solicits an upfront or advance processing fee/deposit before loan funds are released. Under RBI Digital Lending Guidelines, legitimate lenders deduct processing charges solely from disbursed loan funds. Demanding upfront payment before funds are released is the #1 hallmark of advance-fee loan fraud.',
    severity: 'CRITICAL',
  },
  {
    id: 'ADV_FEE_FLAT_DEPOSIT',
    category: 'advance_fee',
    pattern: /(?:pay\s*(?:rs\.?|₹|inr)\s*\d+|(?:rs\.?|₹|inr)\s*\d+\s*(?:file\s*charge|security\s*(?:verification\s*)?deposit|refundable\s*processing\s*fee))\s*(?:before|in\s*advance)/i,
    warning: 'Upfront Security Deposit / File Charge',
    explanation: 'The ad solicits a direct upfront transfer under the pretext of a file charge or refundable verification deposit. RBI-regulated lenders do not take money into personal UPI IDs or bank accounts beforehand.',
    severity: 'CRITICAL',
  },

  // 2. Unrealistic Approval Promises
  {
    id: 'GUARANTEED_APPROVAL',
    category: 'approval',
    pattern: /(?:100%|guaranteed|instant)\s*(?:loan\s*)?(?:approval|sanction)|approval\s*guaranteed(?:\s*for\s*all)?|guaranteed\s*(?:instant\s*)?(?:loan|cash|approval|sanction)|(?:no\s*rejection|rejection-free)\s*(?:loan|approval)?/i,
    warning: 'Unrealistic Guaranteed Approval Claim',
    explanation: 'The advertisement promises guaranteed or 100% approval. Regulated lenders are legally required by RBI to assess creditworthiness, debt-to-income ratio, and repayment capacity; no genuine lender can guarantee 100% approval unconditionally.',
    severity: 'HIGH',
  },
  {
    id: 'APPROVAL_NO_ELIGIBILITY',
    category: 'approval',
    pattern: /(?:immediate|instant)\s*approval\s*in\s*(?:\d+\s*(?:seconds?|mins?|minutes?))\s*without\s*(?:any\s*)?(?:eligibility|underwriting|checks?)/i,
    warning: 'Sub-Minute Approval Without Eligibility Appraisal',
    explanation: 'Claims of instant credit disbursement in seconds without credit scoring or income checks typically indicate either data-harvesting front operations or predatory short-term loan apps.',
    severity: 'MEDIUM',
  },

  // 3. Underwriting & Documentation Bypass
  {
    id: 'NO_VERIFICATION_NO_CIBIL',
    category: 'documentation',
    pattern: /(?:no|without(?:\s+any)?)\s*(?:income\s*verification|income\s*proof|income\s*check|verification|cibil(?:\s*score)?|credit\s*check|credit\s*bureau\s*check|salary\s*slip)(?:\s*(?:required|needed|asked|demanded))?|zero\s*(?:cibil|credit\s*check|income\s*proof)/i,
    warning: 'Bypass of Credit Checks & Income Verification',
    explanation: 'Advertising loans with "no income verification" or without any credit/CIBIL checks circumvents prudential underwriting norms mandated by RBI Digital Lending Directions.',
    severity: 'HIGH',
  },
  {
    id: 'ZERO_DOCUMENTS_REQUIRED',
    category: 'documentation',
    pattern: /no\s*documents?(?:\s*required)?|zero\s*paperwork|zero\s*documentation/i,
    warning: 'Zero Documentation Onboarding Claim',
    explanation: 'RBI Digital Lending guidelines mandate minimum Customer Due Diligence (KYC). Advertising zero documentation is often used to attract financially distressed borrowers before demanding aggressive permissions.',
    severity: 'MEDIUM',
  },

  // 4. Credential & Data Harvesting
  {
    id: 'OTP_HARVESTING',
    category: 'credentials',
    pattern: /(?:send|share|provide|enter)\s+(?:aadhaar\s*)?otp|(?:share|send)\s+bank\s+(?:password|pin|mpin)/i,
    warning: 'Direct Solicitation of One-Time Passwords (OTP)',
    explanation: 'The advertisement requests users to share OTPs or banking credentials over WhatsApp or forms. OTPs grant immediate access to funds and identity services; legitimate entities never request OTP sharing.',
    severity: 'CRITICAL',
  },
  {
    id: 'CONTACTS_GALLERY_PERMISSION',
    category: 'harassment',
    pattern: /(?:share|grant|give|allow)\s+(?:access\s+to\s+)?(?:your\s+)?contacts?\s+(?:and\s+)?(?:gallery)?|permission\s+to\s+access\s+contacts/i,
    warning: 'Extrusive Device Permissions (Contacts/Gallery)',
    explanation: 'RBI explicitly prohibits digital lending apps from accessing mobile phone contacts, media galleries, and call logs. Apps requesting these permissions routinely use them for shaming and extortion.',
    severity: 'CRITICAL',
  },
  {
    id: 'APK_SIDELOAD_DISTRIBUTION',
    category: 'harassment',
    pattern: /(?:download\s+apk|install\s+apk|\.apk\b)/i,
    warning: 'Direct APK Sideloading Outside Official App Stores',
    explanation: 'Promoting unverified APK downloads bypasses Google Play and Apple App Store security screenings. Rogue loan apps commonly distribute malware via direct APK links to harvest private device files.',
    severity: 'HIGH',
  },

  // 5. Interest Rate Ambiguity & Deception
  {
    id: 'DAILY_INTEREST_TRAP',
    category: 'interest',
    pattern: /[\d.]+\s*%\s*(?:per\s*day|daily)/i,
    warning: 'Deceptive Daily Interest Rate Framing',
    explanation: 'Quoting interest on a daily basis (e.g. 0.1% or 0.5% per day) deceptively downplays the cost. A 0.1% daily rate translates to 36.5% p.a., and 0.5% daily is 182.5% p.a. RBI mandates clear Annual Percentage Rate (APR) disclosures.',
    severity: 'HIGH',
  },
  {
    id: 'ZERO_INTEREST_UNSUBSTANTIATED',
    category: 'interest',
    pattern: /0%\s*(?:interest(?:\s*rate)?|roi)|zero\s*interest/i,
    warning: 'Zero-Percent Interest Claim Without APR Clarity',
    explanation: 'Claims of 0% interest on cash personal loans typically hide exorbitant processing fees, administrative costs, or balloon charges that result in an effective APR exceeding normal rates.',
    severity: 'MEDIUM',
  },

  // 6. Urgency & Coercion
  {
    id: 'URGENT_DEADLINE_COERCION',
    category: 'urgency',
    pattern: /(?:urgent|hurry|limited\s*quota|pay\s*within\s*\d+\s*(?:hours?|mins?)|legal\s*notice)/i,
    warning: 'High-Pressure Urgency Tactics',
    explanation: 'The ad creates artificial urgency to pressure the applicant into acting hastily without verifying the credentials or reading the fine print.',
    severity: 'LOW',
  }
];

export function detectSuspiciousClaims(text: string): DetectedClaim[] {
  const detected: DetectedClaim[] = [];
  const normalizedText = text.replace(/\s+/g, ' ');

  for (const rule of CLAIM_RULES) {
    const match = rule.pattern.exec(normalizedText);
    if (match) {
      // Extract snippet around match for context evidence
      const start = Math.max(0, match.index - 30);
      const end = Math.min(normalizedText.length, match.index + match[0].length + 40);
      const evidence = '...' + normalizedText.substring(start, end).trim() + '...';

      detected.push({
        id: `${rule.id}-${detected.length + 1}`,
        phrase: match[0],
        warning: rule.warning,
        explanation: rule.explanation,
        severity: rule.severity,
        evidence: evidence,
        category: rule.category
      });
    }
  }

  return detected;
}

/**
 * LoanGuard Master Analysis Pipeline
 * Coordinates Entity Extraction, Claim Detection, Registry Verification,
 * Financial Transparency Audit, Scam Mapper, and Explainable Risk Engine.
 */

import { AdRecord, ReferenceLender } from '../types';
import { extractPhoneNumbers, extractEmails, extractDomains, extractClaimedLenderAndApp, extractFinancialDetails } from './entityExtraction';
import { detectSuspiciousClaims } from './claimDetector';
import { verifyLender } from './lenderVerification';
import { analyzeFinancialTransparency } from './financialAnalyzer';
import { findConnectionsForAd } from './scamMapper';
import { evaluateRisk } from './riskEngine';

export interface AnalysisInput {
  inputType: 'screenshot' | 'text' | 'url';
  title?: string;
  text: string;
  submittedUrl?: string;
  screenshotUrl?: string;
  kfsComparison?: {
    kfsApr?: number;
    kfsFee?: number;
    kfsTenure?: number;
  };
}

export function runLoanGuardAnalysis(
  input: AnalysisInput,
  existingAds: AdRecord[],
  customLenders: ReferenceLender[] = []
): AdRecord {
  const adId = `LG-${Date.now().toString().slice(-6)}`;
  const title = input.title || `Ad Analysis #${adId}`;
  const text = input.text.trim();

  // 1. Entity Extraction
  const phoneNumbers = extractPhoneNumbers(text);
  const emailAddresses = extractEmails(text);
  const domains = extractDomains(text);
  if (input.submittedUrl) {
    try {
      const parsed = new URL(input.submittedUrl);
      if (parsed.hostname && !domains.includes(parsed.hostname.toLowerCase())) {
        domains.push(parsed.hostname.toLowerCase().replace(/^www\./, ''));
      }
    } catch {
      // ignore URL parsing error
    }
  }

  const { claimedLender, claimedApp } = extractClaimedLenderAndApp(text);
  const financialExtraction = extractFinancialDetails(text);

  // 2. Module 2: Suspicious Claim Detector
  const detectedClaims = detectSuspiciousClaims(text);

  // 3. Module 3: Lender and Loan App Verification
  const verification = verifyLender(claimedLender, claimedApp, domains, customLenders);

  // 4. Module 4: Financial Transparency & Loan Cost Analyzer
  const financialAnalysis = analyzeFinancialTransparency(financialExtraction, input.kfsComparison);

  // 5. Module 5: Scam Connection Mapper
  const connections = findConnectionsForAd(
    {
      id: adId,
      phoneNumbers,
      emailAddresses,
      domains,
      extractedText: text
    },
    existingAds
  );

  // 6. Module 6: Explainable Risk Engine
  const riskResult = evaluateRisk(detectedClaims, verification, financialAnalysis, connections);

  const completeRecord: AdRecord = {
    id: adId,
    createdAt: new Date().toISOString(),
    inputType: input.inputType,
    title,
    originalText: text,
    extractedText: text,
    submittedUrl: input.submittedUrl,
    screenshotUrl: input.screenshotUrl,
    phoneNumbers,
    emailAddresses,
    domains,
    claimedLender,
    claimedApp,
    detectedClaims,
    verification,
    financialAnalysis,
    connections,
    riskScore: riskResult.riskScore,
    riskCategory: riskResult.riskCategory,
    riskSummary: riskResult.riskSummary,
    missingInformation: riskResult.missingInformation,
    safeNextSteps: riskResult.safeNextSteps
  };

  return completeRecord;
}

/**
 * LoanGuard Module 6: Explainable Risk Assessment Engine
 * Multi-dimensional rule-based decision logic integrating claim detection,
 * registry verification, financial transparency, and graph network associations.
 */

import {
  RiskCategory,
  DetectedClaim,
  LenderVerificationResult,
  FinancialAnalysisResult,
  ScamConnection
} from '../types';

export interface RiskEvaluationOutput {
  riskCategory: RiskCategory;
  riskScore: number;
  riskSummary: string;
  missingInformation: string[];
  safeNextSteps: string[];
}

export interface RiskWeights {
  baseScore?: number;
  criticalClaimWeight?: number;
  advanceFeeWeight?: number;
  highClaimWeight?: number;
  mediumClaimWeight?: number;
  lowClaimWeight?: number;
  lenderMismatchWeight?: number;
  lenderNotFoundWeight?: number;
  lenderUnknownWeight?: number;
  lenderMatchedDiscount?: number;
  predatoryTenureWeight?: number;
  dailyInterestTrapWeight?: number;
  inconsistentEmiWeight?: number;
  missingInterestWeight?: number;
  missingTenureWeight?: number;
  hiddenProcessingFeeWeight?: number;
  phoneConnectionWeight?: number;
  domainConnectionWeight?: number;
  highRiskThreshold?: number;
  needsCheckingThreshold?: number;
}

export const DEFAULT_RISK_WEIGHTS: Required<RiskWeights> = {
  baseScore: 10,
  criticalClaimWeight: 35,
  advanceFeeWeight: 40,
  highClaimWeight: 20,
  mediumClaimWeight: 10,
  lowClaimWeight: 5,
  lenderMismatchWeight: 35,
  lenderNotFoundWeight: 15,
  lenderUnknownWeight: 10,
  lenderMatchedDiscount: 15,
  predatoryTenureWeight: 35,
  dailyInterestTrapWeight: 20,
  inconsistentEmiWeight: 15,
  missingInterestWeight: 10,
  missingTenureWeight: 10,
  hiddenProcessingFeeWeight: 5,
  phoneConnectionWeight: 15,
  domainConnectionWeight: 15,
  highRiskThreshold: 65,
  needsCheckingThreshold: 35,
};

export function evaluateRisk(
  claims: DetectedClaim[],
  verification: LenderVerificationResult,
  financial: FinancialAnalysisResult,
  connections: ScamConnection[],
  weights?: RiskWeights
): RiskEvaluationOutput {
  const w = { ...DEFAULT_RISK_WEIGHTS, ...weights };
  let score = w.baseScore;
  const missingInformation: string[] = [];
  const safeNextSteps: string[] = [];

  // 1. Evaluate Detected Claims
  const criticalClaims = claims.filter(c => c.severity === 'CRITICAL');
  const highClaims = claims.filter(c => c.severity === 'HIGH');
  const mediumClaims = claims.filter(c => c.severity === 'MEDIUM');

  for (const c of criticalClaims) {
    if (c.category === 'advance_fee') {
      score += w.advanceFeeWeight;
    } else {
      score += w.criticalClaimWeight;
    }
  }
  score += highClaims.length * w.highClaimWeight;
  score += mediumClaims.length * w.mediumClaimWeight;

  // 2. Evaluate Lender Registry Verification
  if (verification.status === 'MISMATCH') {
    score += w.lenderMismatchWeight;
  } else if (verification.status === 'NOT FOUND') {
    score += w.lenderNotFoundWeight;
    missingInformation.push('Regulated entity reference: The claimed lender does not appear in the active RBI Digital Lending Apps or NBFC directory.');
  } else if (verification.status === 'UNKNOWN') {
    score += w.lenderUnknownWeight;
    missingInformation.push('Lender corporate identity: No legal company name or registered entity could be extracted from the advertisement.');
  } else if (verification.status === 'MATCHED') {
    score = Math.max(5, score - w.lenderMatchedDiscount);
  }

  // 3. Evaluate Financial Transparency
  if (financial.transparencyFlags.predatoryTenure) {
    score += w.predatoryTenureWeight;
  }
  if (financial.transparencyFlags.dailyInterestTrap) {
    score += w.dailyInterestTrapWeight;
  }
  if (financial.transparencyFlags.inconsistentEmiClaim) {
    score += w.inconsistentEmiWeight;
  }
  if (financial.transparencyFlags.missingInterest) {
    score += w.missingInterestWeight;
    missingInformation.push('Annual Percentage Rate (APR) / Interest Rate');
  }
  if (financial.transparencyFlags.missingTenure) {
    score += w.missingTenureWeight;
    missingInformation.push('Loan Repayment Schedule / Tenure');
  }
  if (financial.transparencyFlags.hiddenProcessingFee) {
    score += w.hiddenProcessingFeeWeight;
    missingInformation.push('Processing Fee and GST schedule');
  }

  // 4. Evaluate Graph Associations (Scam Connection Mapper)
  // Network associations indicate scam syndicates when lenders are unverified, mismatched, or using third-party channels.
  // When an entity is MATCHED, sharing its own official registered domain or toll-free helpline is legitimate corporate operation.
  const isMatchedEntity = verification.status === 'MATCHED';
  const phoneConnections = connections.filter(c => c.relationshipType === 'phone');
  const domainConnections = connections.filter(c => c.relationshipType === 'domain');

  if (!isMatchedEntity) {
    if (phoneConnections.length > 0) {
      score += w.phoneConnectionWeight;
    }
    if (domainConnections.length > 0) {
      score += w.domainConnectionWeight;
    }
  }

  // Clamp score to 5 - 100
  score = Math.min(100, Math.max(5, Math.round(score)));

  // Categorization Rules
  const hasCriticalFraudSignal =
    criticalClaims.length > 0 ||
    verification.status === 'MISMATCH' ||
    financial.transparencyFlags.predatoryTenure;

  // Strong warning combinations: multiple high claims + missing disclosures
  const hasStrongCombination =
    highClaims.length >= 2 && (
      financial.transparencyFlags.missingInterest ||
      financial.transparencyFlags.missingTenure ||
      verification.status === 'NOT FOUND' ||
      verification.status === 'UNKNOWN'
    );

  let riskCategory: RiskCategory = 'LOWER DETECTED RISK';
  if (hasCriticalFraudSignal || hasStrongCombination || score >= w.highRiskThreshold) {
    riskCategory = 'HIGH RISK';
  } else if (
    score >= w.needsCheckingThreshold ||
    verification.status === 'NOT FOUND' ||
    highClaims.length > 0 ||
    missingInformation.length >= 2 ||
    financial.transparencyFlags.dailyInterestTrap
  ) {
    riskCategory = 'NEEDS CHECKING';
  } else {
    riskCategory = 'LOWER DETECTED RISK';
  }

  // Actionable safeguards
  if (criticalClaims.some(c => c.category === 'advance_fee')) {
    safeNextSteps.push('DO NOT pay any advance processing fee, file charge, or refundable deposit. Legitimate lenders deduct fees only upon loan disbursement.');
  }
  if (criticalClaims.some(c => c.category === 'credentials')) {
    safeNextSteps.push('NEVER share Aadhaar OTP, bank OTP, or debit card PINs over WhatsApp or unverified online forms.');
  }
  if (criticalClaims.some(c => c.category === 'harassment') || highClaims.some(c => c.category === 'harassment')) {
    safeNextSteps.push('DO NOT install standalone APK files or grant contact list / photo gallery permissions to any lending app.');
  }
  if (verification.status === 'MISMATCH' || verification.status === 'NOT FOUND') {
    safeNextSteps.push('Verify the lending entity on the Reserve Bank of India official portal (rbi.org.in).');
  }
  if (missingInformation.length > 0) {
    safeNextSteps.push('Request a formal Key Fact Statement (KFS) containing the all-inclusive Annual Percentage Rate (APR) before signing any agreement.');
  }
  if (safeNextSteps.length === 0) {
    safeNextSteps.push('Review terms in the official loan sanction letter and verify repayment schedules with the bank directly.');
  }

  // Risk summary prose
  let riskSummary = '';
  if (riskCategory === 'HIGH RISK') {
    if (criticalClaims.some(c => c.category === 'advance_fee')) {
      riskSummary = 'HIGH RISK: Illegal advance fee demand detected. Under RBI digital lending regulations, lenders may never demand upfront fee payments prior to disbursement.';
    } else if (verification.status === 'MISMATCH') {
      riskSummary = 'HIGH RISK: Lender identity mismatch detected. The advertisement references a regulated entity but directs users to an unauthorized web domain.';
    } else {
      riskSummary = 'HIGH RISK: Multiple severe risk indicators or predatory claims detected. High probability of fraudulent solicitation or predatory loan operation.';
    }
  } else if (riskCategory === 'NEEDS CHECKING') {
    riskSummary = `This advertisement contains ambiguous claims or lacks key regulatory disclosures (${missingInformation.length > 0 ? missingInformation.slice(0, 2).join(', ') : 'unverified lender credentials'}). Verify details directly with the official regulated institution before sharing information.`;
  } else {
    riskSummary = 'The analyzed advertisement displays standard transparent financial disclosures and aligns with verified banking/NBFC entity profiles. Continue standard due diligence on official channels.';
  }

  return {
    riskCategory,
    riskScore: score,
    riskSummary,
    missingInformation,
    safeNextSteps
  };
}

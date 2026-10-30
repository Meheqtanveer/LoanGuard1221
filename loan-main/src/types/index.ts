/**
 * LoanGuard Core Types & Domain Interfaces
 */

export type RiskCategory = 'HIGH RISK' | 'NEEDS CHECKING' | 'LOWER DETECTED RISK';

export type VerificationStatus = 'MATCHED' | 'MISMATCH' | 'NOT FOUND' | 'UNKNOWN';

export type ClaimSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DetectedClaim {
  id: string;
  phrase: string;
  warning: string;
  explanation: string;
  severity: ClaimSeverity;
  evidence: string;
  category: 'approval' | 'advance_fee' | 'documentation' | 'interest' | 'urgency' | 'credentials' | 'harassment';
}

export interface ReferenceLender {
  lenderId: string;
  lenderName: string;
  regulatedEntity: string; // e.g. "Scheduled Commercial Bank", "NBFC-ICC", "NBFC-P2P"
  appNames: string[];
  officialDomains: string[];
  contactPhone?: string;
  contactEmail?: string;
  registrationNumber?: string;
  source: string;
  lastUpdated: string;
}

export interface LenderVerificationResult {
  status: VerificationStatus;
  claimedLender: string;
  claimedApp: string;
  claimedDomain: string;
  claimedEntity: string;
  matchedRecord?: ReferenceLender;
  explanation: string;
  evidence: string[];
  source: string;
  lastUpdated: string;
}

export interface FinancialExtraction {
  loanAmount: number | null;
  interestRate: number | null; // Annual rate in %
  interestRatePeriod: 'annual' | 'monthly' | 'daily' | 'unknown';
  aprDisclosed: number | null;
  processingFee: number | null;
  processingFeeIsPercent: boolean;
  gstOnFee: number | null;
  tenureMonths: number | null;
  tenureDays: number | null;
  disclosedEmi: number | null;
  latePaymentPenalty: string | null;
  foreclosureCharges: string | null;
  rawDisclosures: string[];
}

export interface FinancialAnalysisResult {
  extraction: FinancialExtraction;
  calculatedEmi: number | null;
  calculatedTotalRepayment: number | null;
  calculatedTotalInterest: number | null;
  calculatedTotalCharges: number | null;
  calculatedApr: number | null;
  transparencyFlags: {
    missingInterest: boolean;
    missingTenure: boolean;
    hiddenProcessingFee: boolean;
    predatoryTenure: boolean; // e.g. 7-15 days disguised as long term
    dailyInterestTrap: boolean;
    inconsistentEmiClaim: boolean;
    kfsMismatch: boolean;
  };
  warnings: string[];
  explanations: string[];
  isCalculable: boolean;
}

export interface ScamConnection {
  connectionId: string;
  targetAdId: string;
  targetAdTitle: string;
  sharedIdentifier: string;
  relationshipType: 'phone' | 'domain' | 'email' | 'lender' | 'text_similarity';
  similarityScore: number; // 0 to 1
  explanation: string;
}

export interface AdRecord {
  id: string;
  createdAt: string;
  inputType: 'screenshot' | 'text' | 'url';
  title: string;
  originalText: string;
  extractedText: string;
  submittedUrl?: string;
  screenshotUrl?: string;
  
  // Extracted entities
  phoneNumbers: string[];
  emailAddresses: string[];
  domains: string[];
  claimedLender: string;
  claimedApp: string;
  
  // Module results
  detectedClaims: DetectedClaim[];
  verification: LenderVerificationResult;
  financialAnalysis: FinancialAnalysisResult;
  connections: ScamConnection[];
  
  // Risk Engine output
  riskScore: number; // 0 - 100
  riskCategory: RiskCategory;
  riskSummary: string;
  missingInformation: string[];
  safeNextSteps: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'ad' | 'phone' | 'domain' | 'email' | 'lender';
  riskCategory?: RiskCategory;
  adId?: string;
  clusterId?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  relationshipType: 'phone' | 'domain' | 'email' | 'lender' | 'text_similarity';
  weight: number;
}

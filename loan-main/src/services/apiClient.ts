/**
 * LoanGuard API Client
 * Connects frontend views directly to Flask Backend API routes
 * with full input validation and fallback synchronization.
 */

import { AdRecord, GraphNode, GraphEdge, ReferenceLender, FinancialAnalysisResult, LenderVerificationResult } from '../types';
import { runLoanGuardAnalysis, AnalysisInput } from './analysisPipeline';
import { RBI_REFERENCE_LENDERS } from '../data/rbiReferenceData';

const BASE_API_URL = '/api';

export interface DashboardStatsResponse {
  total: number;
  highRisk: number;
  needsChecking: number;
  lowerRisk: number;
  highPct: number;
  checkPct: number;
  lowerPct: number;
  warningCounts: Record<string, number>;
  channelCounts: Record<string, number>;
  databaseType: string;
}

export interface NetworkGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: { clusterId: number; adIds: string[]; primaryIdentifier: string }[];
  engine?: string;
}

export interface LoanCalculationParams {
  principal: number;
  annual_rate: number;
  tenure_months: number;
  fee_percent: number;
  include_gst: boolean;
  daily_rate?: number;
  short_days?: number;
}

export interface LoanCalculationResponse {
  principal: number;
  annual_rate: number;
  tenure_months: number;
  emi: number;
  total_interest: number;
  total_repayment: number;
  fee_amount: number;
  gst_amount: number;
  total_upfront_fees: number;
  net_disbursed: number;
  effective_apr: number;
  daily_annualized_apr: number;
  short_tenure_repayment: number;
}

function normalizeFinancialAnalysis(raw: any): FinancialAnalysisResult {
  if (!raw) {
    return {
      extraction: {
        loanAmount: null,
        interestRate: null,
        interestRatePeriod: 'unknown',
        aprDisclosed: null,
        processingFee: null,
        processingFeeIsPercent: false,
        gstOnFee: null,
        tenureMonths: null,
        tenureDays: null,
        disclosedEmi: null,
        latePaymentPenalty: null,
        foreclosureCharges: null,
        rawDisclosures: []
      },
      calculatedEmi: null,
      calculatedTotalRepayment: null,
      calculatedTotalInterest: null,
      calculatedTotalCharges: null,
      calculatedApr: null,
      transparencyFlags: {
        missingInterest: true,
        missingTenure: true,
        hiddenProcessingFee: true,
        predatoryTenure: false,
        dailyInterestTrap: false,
        inconsistentEmiClaim: false,
        kfsMismatch: false
      },
      warnings: [],
      explanations: [],
      isCalculable: false
    };
  }

  const flags = raw.transparencyFlags || raw.transparency_flags || {};
  const ext = raw.extraction || raw.financial_details || {};

  return {
    extraction: {
      loanAmount: ext.loanAmount ?? ext.loan_amount ?? null,
      interestRate: ext.interestRate ?? ext.interest_rate ?? null,
      interestRatePeriod: ext.interestRatePeriod ?? ext.interest_rate_period ?? 'unknown',
      aprDisclosed: ext.aprDisclosed ?? ext.apr_disclosed ?? null,
      processingFee: ext.processingFee ?? ext.processing_fee ?? null,
      processingFeeIsPercent: ext.processingFeeIsPercent ?? ext.processing_fee_is_percent ?? false,
      gstOnFee: ext.gstOnFee ?? ext.gst_on_fee ?? null,
      tenureMonths: ext.tenureMonths ?? ext.tenure_months ?? null,
      tenureDays: ext.tenureDays ?? ext.tenure_days ?? null,
      disclosedEmi: ext.disclosedEmi ?? ext.disclosed_emi ?? null,
      latePaymentPenalty: ext.latePaymentPenalty ?? ext.late_payment_penalty ?? null,
      foreclosureCharges: ext.foreclosureCharges ?? ext.foreclosure_charges ?? null,
      rawDisclosures: ext.rawDisclosures || ext.raw_disclosures || []
    },
    calculatedEmi: raw.calculatedEmi ?? raw.calculated_emi ?? null,
    calculatedTotalRepayment: raw.calculatedTotalRepayment ?? raw.calculated_total_repayment ?? null,
    calculatedTotalInterest: raw.calculatedTotalInterest ?? raw.calculated_total_interest ?? null,
    calculatedTotalCharges: raw.calculatedTotalCharges ?? raw.calculated_total_charges ?? null,
    calculatedApr: raw.calculatedApr ?? raw.calculated_apr ?? null,
    transparencyFlags: {
      missingInterest: !!(flags.missingInterest ?? flags.missing_interest),
      missingTenure: !!(flags.missingTenure ?? flags.missing_tenure),
      hiddenProcessingFee: !!(flags.hiddenProcessingFee ?? flags.hidden_processing_fee),
      predatoryTenure: !!(flags.predatoryTenure ?? flags.predatory_tenure),
      dailyInterestTrap: !!(flags.dailyInterestTrap ?? flags.daily_interest_trap),
      inconsistentEmiClaim: !!(flags.inconsistentEmiClaim ?? flags.inconsistent_emi_claim),
      kfsMismatch: !!(flags.kfsMismatch ?? flags.kfs_mismatch)
    },
    warnings: raw.warnings || [],
    explanations: raw.explanations || [],
    isCalculable: !!(raw.isCalculable ?? raw.is_calculable)
  };
}

function normalizeLenderVerification(raw: any, claimedLender?: string): LenderVerificationResult {
  if (!raw) {
    return {
      status: 'UNKNOWN',
      claimedLender: claimedLender || 'Not specified',
      claimedApp: 'Unspecified',
      claimedDomain: 'None',
      claimedEntity: 'Unknown',
      explanation: 'Pending verification',
      evidence: [],
      source: 'RBI Digital Lending Directory',
      lastUpdated: 'October 2026'
    };
  }
  return {
    status: raw.status || 'UNKNOWN',
    claimedLender: raw.claimedLender || raw.claimed_lender || claimedLender || 'Not specified',
    claimedApp: raw.claimedApp || raw.claimed_app || 'Unspecified',
    claimedDomain: raw.claimedDomain || raw.claimed_domain || 'None',
    claimedEntity: raw.claimedEntity || raw.claimed_entity || 'Unknown',
    matchedRecord: raw.matchedRecord || raw.matched_record,
    explanation: raw.explanation || '',
    evidence: raw.evidence || [],
    source: raw.source || 'RBI Digital Lending Reference Registry',
    lastUpdated: raw.lastUpdated || raw.last_updated || 'October 2026'
  };
}

class LoanGuardApiClient {
  private isBackendOnline: boolean | null = null;

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch('/health', { signal: AbortSignal.timeout(2000) });
      const ok = res.ok;
      this.isBackendOnline = ok;
      return ok;
    } catch {
      this.isBackendOnline = false;
      return false;
    }
  }

  // 1. Analyze Advertisement (Calls POST /api/analysis/analyze)
  async analyzeAd(input: AnalysisInput, screenshotFile?: File | null): Promise<AdRecord> {
    try {
      let res: Response;
      if (screenshotFile) {
        const formData = new FormData();
        formData.append('screenshot', screenshotFile);
        formData.append('title', input.title || '');
        formData.append('text', input.text || '');
        formData.append('input_type', 'screenshot');
        if (input.submittedUrl) formData.append('url', input.submittedUrl);

        res = await fetch(`${BASE_API_URL}/analysis/analyze`, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(`${BASE_API_URL}/analysis/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input_type: input.inputType,
            title: input.title,
            text: input.text,
            url: input.submittedUrl,
          }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        const ad = data.advertisement || {};
        const analysis = data.analysis || {};
        const connections = data.connections || [];

        return {
          id: ad.advertisement_id || ad.id,
          createdAt: ad.created_at || new Date().toISOString(),
          inputType: ad.input_type || input.inputType,
          title: ad.title || input.title || 'Untitled Ad',
          originalText: ad.original_text || input.text,
          extractedText: ad.extracted_text || input.text,
          submittedUrl: ad.submitted_url || input.submittedUrl,
          screenshotUrl: input.screenshotUrl,
          phoneNumbers: ad.phone_numbers || [],
          emailAddresses: ad.email_addresses || [],
          domains: ad.domains || [],
          claimedLender: ad.claimed_lender || 'Not specifically declared',
          claimedApp: ad.claimed_app || 'Unspecified Mobile App',
          detectedClaims: analysis.detected_claims || [],
          verification: normalizeLenderVerification(analysis.lender_verification, ad.claimed_lender),
          financialAnalysis: normalizeFinancialAnalysis(analysis.financial_analysis),
          connections: connections,
          riskScore: analysis.risk_score || 10,
          riskCategory: analysis.risk_category || 'LOWER DETECTED RISK',
          riskSummary: analysis.risk_summary || '',
          missingInformation: analysis.missing_information || [],
          safeNextSteps: analysis.safe_next_steps || [],
        };
      }
    } catch (err) {
      console.warn('[LoanGuard API] Backend analyze call failed or offline. Using client pipeline fallback.', err);
    }

    // Fallback if backend offline
    return runLoanGuardAnalysis(input, []);
  }

  // 2. Fetch Advertisement History (Calls GET /api/analysis/history)
  async getHistory(): Promise<AdRecord[]> {
    try {
      const res = await fetch(`${BASE_API_URL}/analysis/history`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        const ads = data.advertisements || [];
        return ads.map((r: any) => ({
          id: r.advertisement_id || r.id,
          createdAt: r.created_at || r.createdAt || new Date().toISOString(),
          inputType: r.input_type || r.inputType || 'text',
          title: r.title || 'Untitled Ad',
          originalText: r.original_text || r.originalText || '',
          extractedText: r.extracted_text || r.extractedText || '',
          submittedUrl: r.submitted_url || r.submittedUrl,
          screenshotUrl: r.screenshot_filename ? `/uploads/${r.screenshot_filename}` : undefined,
          phoneNumbers: r.phone_numbers || r.phoneNumbers || [],
          emailAddresses: r.email_addresses || r.emailAddresses || [],
          domains: r.domains || [],
          claimedLender: r.claimed_lender || r.claimedLender || 'Not specifically declared',
          claimedApp: r.claimed_app || r.claimedApp || 'Unspecified Mobile App',
          detectedClaims: r.detected_claims || r.detectedClaims || [],
          verification: normalizeLenderVerification(r.lender_verification || r.verification, r.claimed_lender),
          financialAnalysis: normalizeFinancialAnalysis(r.financial_analysis || r.financialAnalysis),
          connections: r.connections || [],
          riskScore: r.risk_score || r.riskScore || 10,
          riskCategory: r.risk_category || r.riskCategory || 'LOWER DETECTED RISK',
          riskSummary: r.risk_summary || r.riskSummary || '',
          missingInformation: r.missing_information || r.missingInformation || [],
          safeNextSteps: r.safe_next_steps || r.safeNextSteps || [],
        }));
      }
    } catch (err) {
      console.warn('[LoanGuard API] Backend history call failed. Using memory seed fallback.', err);
    }
    return [];
  }

  // 3. Delete Advertisement (Calls DELETE /api/analysis/delete/<id>)
  async deleteAd(adId: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_API_URL}/analysis/delete/${adId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // 4. Fetch Scam Connection Mapper Network Graph (Calls GET /api/graph/network)
  async getNetworkGraph(): Promise<NetworkGraphResponse | null> {
    try {
      const res = await fetch(`${BASE_API_URL}/graph/network`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[LoanGuard API] Backend graph call failed.', err);
    }
    return null;
  }

  // 5. Fetch Dashboard Real Aggregated Statistics (Calls GET /api/dashboard/stats)
  async getDashboardStats(): Promise<DashboardStatsResponse | null> {
    try {
      const res = await fetch(`${BASE_API_URL}/dashboard/stats`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[LoanGuard API] Backend stats call failed.', err);
    }
    return null;
  }

  // 6. Fetch Reference Lenders (Calls GET /api/verification/lenders)
  async getReferenceLenders(query = ''): Promise<ReferenceLender[]> {
    try {
      const url = query ? `${BASE_API_URL}/verification/lenders?query=${encodeURIComponent(query)}` : `${BASE_API_URL}/verification/lenders`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        return data.reference_lenders || [];
      }
    } catch (err) {
      console.warn('[LoanGuard API] Backend lenders call failed.', err);
    }
    return RBI_REFERENCE_LENDERS;
  }

  // 7. Import Reference Lenders (Calls POST /api/verification/import)
  async importReferenceLenders(file: File): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BASE_API_URL}/verification/import`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, count: data.imported_count || 0, message: data.message || 'Imported' };
      }
    } catch (err) {
      console.warn('[LoanGuard API] Backend import call failed.', err);
    }
    return { success: false, count: 0, message: 'Failed to import reference lenders via backend API.' };
  }

  // 8. Calculate Loan Cost (Calls POST /api/calculator/calculate)
  async calculateLoan(params: LoanCalculationParams): Promise<LoanCalculationResponse | null> {
    try {
      const res = await fetch(`${BASE_API_URL}/calculator/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[LoanGuard API] Backend calculate call failed.', err);
    }
    return null;
  }
}

export const apiClient = new LoanGuardApiClient();

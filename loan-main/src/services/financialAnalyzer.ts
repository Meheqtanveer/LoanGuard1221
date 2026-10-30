/**
 * LoanGuard Module 4: Financial Transparency and Hidden Loan Cost Analyzer
 * Computes standard reducing-balance EMI and detects predatory or non-transparent credit terms.
 */

import { FinancialExtraction, FinancialAnalysisResult } from '../types';

export function analyzeFinancialTransparency(
  extraction: FinancialExtraction,
  kfsComparison?: {
    kfsApr?: number;
    kfsFee?: number;
    kfsTenure?: number;
  }
): FinancialAnalysisResult {
  const warnings: string[] = [];
  const explanations: string[] = [];

  const P = extraction.loanAmount;
  const annualRate = extraction.interestRate;
  const n = extraction.tenureMonths;

  const transparencyFlags = {
    missingInterest: extraction.interestRate === null,
    missingTenure: extraction.tenureMonths === null && extraction.tenureDays === null,
    hiddenProcessingFee: extraction.processingFee === null,
    predatoryTenure: (extraction.tenureDays !== null && extraction.tenureDays <= 15),
    dailyInterestTrap: extraction.interestRatePeriod === 'daily',
    inconsistentEmiClaim: false,
    kfsMismatch: false,
  };

  // Flag inspections
  if (transparencyFlags.missingInterest) {
    warnings.push('Missing Interest Rate Disclosure');
    explanations.push('The advertisement does not disclose any annual interest rate or APR, preventing borrowers from assessing the true cost of credit.');
  }

  if (transparencyFlags.missingTenure) {
    warnings.push('Missing Repayment Period');
    explanations.push('No loan repayment tenure is mentioned. Transparent lending mandates clear schedule disclosures.');
  }

  if (transparencyFlags.predatoryTenure) {
    warnings.push('Predatory Short-Duration Tenure (≤15 days)');
    explanations.push(`The advertisement specifies an ultra-short repayment tenure of ${extraction.tenureDays} days. Legitimate personal loans typically offer a minimum tenure of 60 to 90 days. 7-to-15-day loans are heavily associated with illegal quick-loan apps.`);
  }

  if (transparencyFlags.dailyInterestTrap) {
    warnings.push('Daily Interest Quoting Masking High APR');
    explanations.push('Interest is quoted as a daily fraction rather than standardized Annual Percentage Rate (APR). In annualized terms, this equals excessive borrowing costs.');
  }

  if (transparencyFlags.hiddenProcessingFee) {
    explanations.push('Processing fee is not upfront disclosed in the advertisement. Regulated lenders are required to state all mandatory non-refundable charges.');
  }

  // Calculate reducing-balance EMI if sufficient information exists
  let calculatedEmi: number | null = null;
  let calculatedTotalRepayment: number | null = null;
  let calculatedTotalInterest: number | null = null;
  let calculatedTotalCharges: number | null = null;
  let calculatedApr: number | null = null;

  // Sufficiency check: P and n must exist, and annualRate must be known
  const isCalculable = P !== null && P > 0 && n !== null && n > 0 && annualRate !== null && annualRate >= 0;

  if (isCalculable) {
    // Handling zero-interest claim
    if (annualRate === 0) {
      calculatedEmi = Math.round(P / n);
      calculatedTotalInterest = 0;
      calculatedTotalRepayment = P;
      explanations.push(`Calculated at 0% nominal interest: Equal monthly instalment of ₹${calculatedEmi.toLocaleString('en-IN')} across ${n} months.`);
    } else {
      // Reducing-balance formula: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
      const monthlyRate = (annualRate / 100) / 12;
      const factor = Math.pow(1 + monthlyRate, n);
      calculatedEmi = Math.round((P * monthlyRate * factor) / (factor - 1));
      calculatedTotalRepayment = Math.round(calculatedEmi * n);
      calculatedTotalInterest = Math.round(calculatedTotalRepayment - P);
      explanations.push(`Calculated Reducing-Balance EMI: ₹${calculatedEmi.toLocaleString('en-IN')}/mo at ${annualRate}% p.a. over ${n} months.`);
      explanations.push(`Total Repayment over term: ₹${calculatedTotalRepayment.toLocaleString('en-IN')} (Principal: ₹${P.toLocaleString('en-IN')}, Estimated Interest: ₹${calculatedTotalInterest.toLocaleString('en-IN')}).`);
    }

    // Additional charges calculation
    let feeAmount = 0;
    if (extraction.processingFee !== null) {
      if (extraction.processingFeeIsPercent) {
        feeAmount = (P * extraction.processingFee) / 100;
      } else {
        feeAmount = extraction.processingFee;
      }
      if (extraction.gstOnFee !== null) {
        feeAmount = feeAmount * (1 + extraction.gstOnFee / 100);
      }
      calculatedTotalCharges = Math.round(feeAmount);
    }

    // Estimated APR: (Total Interest + Total Charges) / P / (n/12) * 100
    if (calculatedTotalInterest !== null) {
      const allFinancingCost = calculatedTotalInterest + (calculatedTotalCharges || 0);
      const years = n / 12;
      calculatedApr = parseFloat(((allFinancingCost / P / years) * 100).toFixed(2));
    }

    // Check for inconsistent claimed EMI
    if (extraction.disclosedEmi !== null && calculatedEmi !== null) {
      const differencePercent = Math.abs(extraction.disclosedEmi - calculatedEmi) / calculatedEmi;
      if (differencePercent > 0.15) {
        transparencyFlags.inconsistentEmiClaim = true;
        warnings.push('Inconsistent Claimed EMI vs Declared Interest Rate');
        explanations.push(`The advertisement claims an EMI of ₹${extraction.disclosedEmi.toLocaleString('en-IN')}, but standard actuarial reducing-balance calculations at ${annualRate}% for ₹${P.toLocaleString('en-IN')} over ${n} months indicate an EMI of ₹${calculatedEmi.toLocaleString('en-IN')} (deviation of ${(differencePercent * 100).toFixed(1)}%).`);
      }
    }
  } else {
    explanations.push('Insufficient financial information to calculate precise reducing-balance EMI. One or more mandatory financial parameters (Loan Principal, Annual Interest Rate, or Repayment Tenure) were not disclosed in the advertisement.');
  }

  // KFS comparison if provided
  if (kfsComparison && isCalculable) {
    if (kfsComparison.kfsApr && extraction.interestRate && Math.abs(kfsComparison.kfsApr - extraction.interestRate) > 3) {
      transparencyFlags.kfsMismatch = true;
      warnings.push('Discrepancy Between Ad Rate and Key Fact Statement (KFS)');
      explanations.push(`The advertisement claims interest of ${extraction.interestRate}%, but the Key Fact Statement lists an effective APR of ${kfsComparison.kfsApr}%.`);
    }
  }

  return {
    extraction,
    calculatedEmi,
    calculatedTotalRepayment,
    calculatedTotalInterest,
    calculatedTotalCharges,
    calculatedApr,
    transparencyFlags,
    warnings,
    explanations,
    isCalculable
  };
}

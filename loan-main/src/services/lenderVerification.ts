/**
 * LoanGuard Module 3: Lender and Loan App Verification Engine
 * Cross-references claimed entities against RBI Digital Lending Apps (DLA)
 * & NBFC Master Registries.
 */

import { RBI_REFERENCE_LENDERS } from '../data/rbiReferenceData';
import { LenderVerificationResult, ReferenceLender } from '../types';

export function verifyLender(
  claimedLender: string,
  claimedApp: string,
  domains: string[],
  userReferenceList: ReferenceLender[] = []
): LenderVerificationResult {
  const combinedRegistry = [...userReferenceList, ...RBI_REFERENCE_LENDERS];
  const evidence: string[] = [];
  const primaryDomain = domains.length > 0 ? domains[0].toLowerCase() : '';

  // Case 1: Unknown - insufficient information
  if (
    (!claimedLender || claimedLender === 'Not specifically declared') &&
    (!claimedApp || claimedApp === 'Unspecified Mobile App') &&
    domains.length === 0
  ) {
    return {
      status: 'UNKNOWN',
      claimedLender: 'Not specified',
      claimedApp: 'Not specified',
      claimedDomain: 'None',
      claimedEntity: 'Unknown',
      explanation: 'Insufficient information extracted from the advertisement to perform registry verification. Neither a lender name, app name, nor web domain was detected.',
      evidence: ['No recognized financial entity or digital domain identified in the advertisement text.'],
      source: 'RBI Digital Lending Directory & NBFC Reference Dataset (Local Copy)',
      lastUpdated: 'October 2026'
    };
  }

  // Normalize search strings
  const searchLender = claimedLender.toLowerCase();
  const searchApp = claimedApp.toLowerCase();

  // Search for matching regulated lender
  const matchedLender = combinedRegistry.find(r => {
    const rName = r.lenderName.toLowerCase();
    const matchesLenderName = rName.includes(searchLender) || searchLender.includes(rName.split(' ')[0]);
    const matchesAppName = r.appNames.some(app => app.toLowerCase().includes(searchApp) || (searchApp !== 'unspecified mobile app' && searchApp.includes(app.toLowerCase())));
    const matchesDomain = r.officialDomains.some(d => domains.some(dom => dom.includes(d) || d.includes(dom)));
    return matchesLenderName || matchesAppName || matchesDomain;
  });

  if (matchedLender) {
    // Check if the domain matches the official lender domain
    const hasDomainMatch = primaryDomain ? matchedLender.officialDomains.some(d => primaryDomain.includes(d) || d.includes(primaryDomain)) : false;
    const hasAppNameMatch = matchedLender.appNames.some(app => app.toLowerCase().includes(searchApp) || searchApp.includes(app.toLowerCase()));

    // Check for Mismatch: Ad claims a reputable lender name (e.g. Bajaj Finance or HDFC),
    // but the website domain or app name is completely unaffiliated (e.g. speedyloanindia.in)
    if (primaryDomain && !hasDomainMatch && searchLender.length > 3 && matchedLender.lenderName.toLowerCase().includes(searchLender.split(' ')[0])) {
      evidence.push(`Advertisement claims association with regulated entity: "${matchedLender.lenderName}" (${matchedLender.regulatedEntity}).`);
      evidence.push(`Official registered domains for this entity: ${matchedLender.officialDomains.join(', ')}.`);
      evidence.push(`CONFLICT: The advertisement directs users to an unrecognized domain: "${primaryDomain}".`);
      evidence.push(`Registration Roster Reference: ${matchedLender.registrationNumber || 'Standard Registry'}.`);

      return {
        status: 'MISMATCH',
        claimedLender: claimedLender,
        claimedApp: claimedApp,
        claimedDomain: primaryDomain,
        claimedEntity: matchedLender.regulatedEntity,
        matchedRecord: matchedLender,
        explanation: `Potential Impersonation / Credential Mismatch: The advertisement names regulated lender "${matchedLender.lenderName}", but the contact domain "${primaryDomain}" is not among their verified official web properties.`,
        evidence,
        source: `${matchedLender.source} (Local Reference Copy)`,
        lastUpdated: matchedLender.lastUpdated
      };
    }

    // Positive Match
    if (hasDomainMatch || hasAppNameMatch) {
      evidence.push(`Verified Regulated Entity: "${matchedLender.lenderName}" (${matchedLender.regulatedEntity}).`);
      evidence.push(`Official App Portfolio: ${matchedLender.appNames.join(', ')}.`);
      evidence.push(`Authorized Domains: ${matchedLender.officialDomains.join(', ')}.`);
      if (matchedLender.registrationNumber) {
        evidence.push(`Regulatory Certificate / Identification: ${matchedLender.registrationNumber}.`);
      }

      return {
        status: 'MATCHED',
        claimedLender: matchedLender.lenderName,
        claimedApp: claimedApp !== 'Unspecified Mobile App' ? claimedApp : matchedLender.appNames[0],
        claimedDomain: primaryDomain || matchedLender.officialDomains[0],
        claimedEntity: matchedLender.regulatedEntity,
        matchedRecord: matchedLender,
        explanation: `The claimed entity "${matchedLender.lenderName}" corresponds to a registered ${matchedLender.regulatedEntity} in the local reference database. Disclosed digital channels align with official registry data. Note: Regulatory registration confirms licensing status, not an RBI safety certification.`,
        evidence,
        source: `${matchedLender.source} (Local Reference Copy)`,
        lastUpdated: matchedLender.lastUpdated
      };
    }
  }

  // Not Found in reference registry
  evidence.push(`Claimed lender "${claimedLender}" was queried across ${combinedRegistry.length} verified banking and NBFC entries.`);
  if (claimedApp && claimedApp !== 'Unspecified Mobile App') {
    evidence.push(`Claimed mobile app name "${claimedApp}" is not listed in the current verified Digital Lending Apps index.`);
  }
  if (primaryDomain) {
    evidence.push(`Domain "${primaryDomain}" is not linked to any registered lender in this dataset.`);
  }

  return {
    status: 'NOT FOUND',
    claimedLender: claimedLender,
    claimedApp: claimedApp,
    claimedDomain: primaryDomain || 'Not declared',
    claimedEntity: 'Unregistered / Unverified Entity',
    explanation: `No corresponding record for "${claimedLender}" was found in the available reference dataset. IMPORTANT: Missing from this directory does not automatically mean the lender is fraudulent (they may be an unlisted intermediary, newly licensed entity, or cooperative institution), but independent due diligence on rbi.org.in is advised.`,
    evidence,
    source: 'RBI Digital Lending Directory & NBFC Reference Dataset (Local Copy)',
    lastUpdated: 'October 2026'
  };
}

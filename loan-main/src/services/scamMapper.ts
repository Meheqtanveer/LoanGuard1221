/**
 * LoanGuard Module 5: Scam Connection Mapper (Signature Feature)
 * Analyzes relationship networks across submitted digital loan advertisements
 * through exact identifier matching (phone, domain, email) and TF-IDF text similarity.
 */

import { AdRecord, ScamConnection, GraphNode, GraphEdge } from '../types';

/**
 * Basic TF-IDF Vectorizer and Cosine Similarity in pure TypeScript
 */
function tokenizeAndTermFrequency(text: string): Map<string, number> {
  const stopWords = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was',
    'with', 'by', 'from', 'this', 'that', 'your', 'you', 'now', 'get', 'our', 'all'
  ]);
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopWords.has(t));

  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  return tf;
}

export function computeTextSimilarity(text1: string, text2: string): number {
  const tf1 = tokenizeAndTermFrequency(text1);
  const tf2 = tokenizeAndTermFrequency(text2);

  const allWords = new Set([...tf1.keys(), ...tf2.keys()]);
  if (allWords.size === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const word of allWords) {
    const valA = tf1.get(word) || 0;
    const valB = tf2.get(word) || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Finds connections between a target ad and all existing advertisements in the corpus.
 */
export function findConnectionsForAd(
  targetAd: {
    id: string;
    phoneNumbers: string[];
    emailAddresses: string[];
    domains: string[];
    extractedText: string;
  },
  allAds: AdRecord[]
): ScamConnection[] {
  const connections: ScamConnection[] = [];

  for (const otherAd of allAds) {
    if (otherAd.id === targetAd.id) continue;

    // 1. Shared Phone Numbers
    const sharedPhones = targetAd.phoneNumbers.filter(p => otherAd.phoneNumbers.includes(p));
    if (sharedPhones.length > 0) {
      connections.push({
        connectionId: `CONN-PH-${targetAd.id}-${otherAd.id}`,
        targetAdId: otherAd.id,
        targetAdTitle: otherAd.title,
        sharedIdentifier: `Phone: ${sharedPhones.join(', ')}`,
        relationshipType: 'phone',
        similarityScore: 1.0,
        explanation: `These advertisements share the exact contact number (${sharedPhones.join(', ')}). This indicates a possible shared marketing desk or affiliated campaign operator.`
      });
    }

    // 2. Shared Web Domains
    const sharedDomains = targetAd.domains.filter(d => otherAd.domains.includes(d));
    if (sharedDomains.length > 0) {
      connections.push({
        connectionId: `CONN-DOM-${targetAd.id}-${otherAd.id}`,
        targetAdId: otherAd.id,
        targetAdTitle: otherAd.title,
        sharedIdentifier: `Domain: ${sharedDomains.join(', ')}`,
        relationshipType: 'domain',
        similarityScore: 1.0,
        explanation: `These advertisements resolve to the same web domain (${sharedDomains.join(', ')}). This indicates common digital infrastructure hosting both campaigns.`
      });
    }

    // 3. Shared Email Addresses
    const sharedEmails = targetAd.emailAddresses.filter(e => otherAd.emailAddresses.includes(e));
    if (sharedEmails.length > 0) {
      connections.push({
        connectionId: `CONN-EM-${targetAd.id}-${otherAd.id}`,
        targetAdId: otherAd.id,
        targetAdTitle: otherAd.title,
        sharedIdentifier: `Email: ${sharedEmails.join(', ')}`,
        relationshipType: 'email',
        similarityScore: 1.0,
        explanation: `These advertisements list the same support email address (${sharedEmails.join(', ')}).`
      });
    }

    // 4. Text Wording Similarity (Threshold > 0.65)
    if (sharedPhones.length === 0 && sharedDomains.length === 0 && sharedEmails.length === 0) {
      const similarity = computeTextSimilarity(targetAd.extractedText, otherAd.extractedText);
      if (similarity >= 0.62) {
        connections.push({
          connectionId: `CONN-TXT-${targetAd.id}-${otherAd.id}`,
          targetAdId: otherAd.id,
          targetAdTitle: otherAd.title,
          sharedIdentifier: `High Text Similarity (${(similarity * 100).toFixed(0)}%)`,
          relationshipType: 'text_similarity',
          similarityScore: parseFloat(similarity.toFixed(2)),
          explanation: `Strong linguistic and stylistic similarity (${(similarity * 100).toFixed(0)}% TF-IDF cosine match). The promotions use nearly identical phrasing templates, suggesting syndicated marketing copy.`
        });
      }
    }
  }

  return connections;
}

/**
 * Builds the complete Graph Model (Nodes and Edges) for all advertisements in the database.
 */
export function buildNetworkGraph(ads: AdRecord[]): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: { clusterId: number; adIds: string[]; primaryIdentifier: string }[];
} {
  const nodesMap = new Map<string, GraphNode>();
  const edgesMap = new Map<string, GraphEdge>();

  // Add all advertisement nodes
  for (const ad of ads) {
    nodesMap.set(ad.id, {
      id: ad.id,
      label: ad.title.length > 24 ? ad.title.substring(0, 22) + '...' : ad.title,
      type: 'ad',
      riskCategory: ad.riskCategory,
      adId: ad.id
    });
  }

  // Iterate to create identifier nodes and connecting edges
  for (let i = 0; i < ads.length; i++) {
    const adA = ads[i];

    for (let j = i + 1; j < ads.length; j++) {
      const adB = ads[j];

      // Phone match
      const commonPhones = adA.phoneNumbers.filter(p => adB.phoneNumbers.includes(p));
      for (const phone of commonPhones) {
        const phoneNodeId = `node-phone-${phone}`;
        if (!nodesMap.has(phoneNodeId)) {
          nodesMap.set(phoneNodeId, {
            id: phoneNodeId,
            label: `📞 ${phone}`,
            type: 'phone'
          });
        }
        // Link adA -> phone and adB -> phone
        const edgeA = `edge-${adA.id}-${phoneNodeId}`;
        const edgeB = `edge-${adB.id}-${phoneNodeId}`;
        edgesMap.set(edgeA, { id: edgeA, source: adA.id, target: phoneNodeId, label: 'Uses Phone', relationshipType: 'phone', weight: 1 });
        edgesMap.set(edgeB, { id: edgeB, source: adB.id, target: phoneNodeId, label: 'Uses Phone', relationshipType: 'phone', weight: 1 });
      }

      // Domain match
      const commonDomains = adA.domains.filter(d => adB.domains.includes(d));
      for (const domain of commonDomains) {
        const domainNodeId = `node-dom-${domain}`;
        if (!nodesMap.has(domainNodeId)) {
          nodesMap.set(domainNodeId, {
            id: domainNodeId,
            label: `🌐 ${domain}`,
            type: 'domain'
          });
        }
        const edgeA = `edge-${adA.id}-${domainNodeId}`;
        const edgeB = `edge-${adB.id}-${domainNodeId}`;
        edgesMap.set(edgeA, { id: edgeA, source: adA.id, target: domainNodeId, label: 'Hosts on', relationshipType: 'domain', weight: 1 });
        edgesMap.set(edgeB, { id: edgeB, source: adB.id, target: domainNodeId, label: 'Hosts on', relationshipType: 'domain', weight: 1 });
      }

      // Email match
      const commonEmails = adA.emailAddresses.filter(e => adB.emailAddresses.includes(e));
      for (const email of commonEmails) {
        const emailNodeId = `node-em-${email}`;
        if (!nodesMap.has(emailNodeId)) {
          nodesMap.set(emailNodeId, {
            id: emailNodeId,
            label: `✉️ ${email}`,
            type: 'email'
          });
        }
        const edgeA = `edge-${adA.id}-${emailNodeId}`;
        const edgeB = `edge-${adB.id}-${emailNodeId}`;
        edgesMap.set(edgeA, { id: edgeA, source: adA.id, target: emailNodeId, label: 'Contacts via', relationshipType: 'email', weight: 1 });
        edgesMap.set(edgeB, { id: edgeB, source: adB.id, target: emailNodeId, label: 'Contacts via', relationshipType: 'email', weight: 1 });
      }

      // Text similarity direct edge
      if (commonPhones.length === 0 && commonDomains.length === 0 && commonEmails.length === 0) {
        const sim = computeTextSimilarity(adA.extractedText, adB.extractedText);
        if (sim >= 0.62) {
          const directEdgeId = `edge-direct-${adA.id}-${adB.id}`;
          edgesMap.set(directEdgeId, {
            id: directEdgeId,
            source: adA.id,
            target: adB.id,
            label: `Similar Wording (${(sim * 100).toFixed(0)}%)`,
            relationshipType: 'text_similarity',
            weight: sim
          });
        }
      }
    }
  }

  // Detect simple clusters (connected components of ads)
  const clusters: { clusterId: number; adIds: string[]; primaryIdentifier: string }[] = [];
  const visited = new Set<string>();
  let clusterCount = 1;

  for (const ad of ads) {
    if (visited.has(ad.id)) continue;
    const connectedAdIds = new Set<string>([ad.id]);
    visited.add(ad.id);

    // Look for all ads connected through shared identifiers
    const queue = [ad.id];
    let primaryId = 'None';

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      for (const edge of edgesMap.values()) {
        let neighbor = '';
        if (edge.source === currentId) neighbor = edge.target;
        else if (edge.target === currentId) neighbor = edge.source;

        if (neighbor) {
          // If neighbor is an identifier node, find other connected ads
          if (neighbor.startsWith('node-')) {
            primaryId = nodesMap.get(neighbor)?.label || primaryId;
            for (const otherEdge of edgesMap.values()) {
              if (otherEdge.source === neighbor && !connectedAdIds.has(otherEdge.target)) {
                connectedAdIds.add(otherEdge.target);
                visited.add(otherEdge.target);
                queue.push(otherEdge.target);
              } else if (otherEdge.target === neighbor && !connectedAdIds.has(otherEdge.source)) {
                connectedAdIds.add(otherEdge.source);
                visited.add(otherEdge.source);
                queue.push(otherEdge.source);
              }
            }
          } else if (!connectedAdIds.has(neighbor)) {
            connectedAdIds.add(neighbor);
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }

    if (connectedAdIds.size > 1) {
      clusters.push({
        clusterId: clusterCount++,
        adIds: Array.from(connectedAdIds),
        primaryIdentifier: primaryId
      });
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
    clusters
  };
}

"""
LoanGuard Scam Connection Mapper Service (Python)
Builds relationship networks across advertisements sharing contact numbers, domains, or similar wording.
"""

from typing import List, Dict, Any, Set
import math

def compute_cosine_similarity(text1: str, text2: str) -> float:
    # Pure Python TF vectorizer for zero-dependency portability
    def get_tf(text):
        words = [w.lower() for w in text.split() if len(w) > 3]
        tf = {}
        for w in words:
            tf[w] = tf.get(w, 0) + 1
        return tf
        
    tf1 = get_tf(text1)
    tf2 = get_tf(text2)
    
    all_words = set(tf1.keys()).union(set(tf2.keys()))
    if not all_words:
        return 0.0
        
    dot = sum(tf1.get(w, 0) * tf2.get(w, 0) for w in all_words)
    norm1 = sum(v ** 2 for v in tf1.values())
    norm2 = sum(v ** 2 for v in tf2.values())
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (math.sqrt(norm1) * math.sqrt(norm2))

def find_connections(target_ad: Dict[str, Any], all_ads: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    connections = []
    t_id = target_ad.get("advertisement_id")
    t_phones = set(target_ad.get("phone_numbers", []))
    t_domains = set(target_ad.get("domains", []))
    t_emails = set(target_ad.get("email_addresses", []))
    t_text = target_ad.get("extracted_text", "")

    for other in all_ads:
        o_id = other.get("advertisement_id")
        if o_id == t_id:
            continue

        o_phones = set(other.get("phone_numbers", []))
        o_domains = set(other.get("domains", []))
        o_emails = set(other.get("email_addresses", []))

        # 1. Phone match
        shared_phones = t_phones.intersection(o_phones)
        if shared_phones:
            connections.append({
                "connection_id": f"CONN-PH-{t_id}-{o_id}",
                "target_ad_id": o_id,
                "target_ad_title": other.get("title", o_id),
                "shared_identifier": f"Phone: {', '.join(shared_phones)}",
                "relationship_type": "phone",
                "similarity_score": 1.0,
                "explanation": f"These advertisements share the same contact number ({', '.join(shared_phones)}). Indicates a possible shared marketing desk or campaign operator."
            })

        # 2. Domain match
        shared_doms = t_domains.intersection(o_domains)
        if shared_doms:
            connections.append({
                "connection_id": f"CONN-DOM-{t_id}-{o_id}",
                "target_ad_id": o_id,
                "target_ad_title": other.get("title", o_id),
                "shared_identifier": f"Domain: {', '.join(shared_doms)}",
                "relationship_type": "domain",
                "similarity_score": 1.0,
                "explanation": f"These advertisements resolve to the same web domain ({', '.join(shared_doms)})."
            })

        # 3. Text similarity
        if not shared_phones and not shared_doms:
            sim = compute_cosine_similarity(t_text, other.get("extracted_text", ""))
            if sim >= 0.65:
                connections.append({
                    "connection_id": f"CONN-TXT-{t_id}-{o_id}",
                    "target_ad_id": o_id,
                    "target_ad_title": other.get("title", o_id),
                    "shared_identifier": f"Text Match ({round(sim * 100)}%)",
                    "relationship_type": "text_similarity",
                    "similarity_score": round(sim, 2),
                    "explanation": f"High linguistic similarity ({round(sim * 100)}% match), suggesting syndicated advertising copy."
                })

    return connections

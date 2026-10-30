"""
LoanGuard Supplementary Flask Blueprints:
- Graph Network & Scam Connection Mapper (powered by NetworkX)
- Lender Registry & CSV/JSON Import
- Financial Calculator API
- Real Database Dashboard Aggregation
"""

import json
import csv
import io
from flask import Blueprint, jsonify, request
from backend.database.db import db
from backend.services.scam_mapper import compute_cosine_similarity
from backend.services.financial_analyzer import analyze_financials

graph_bp = Blueprint("graph", __name__, url_prefix="/api/graph")
verification_bp = Blueprint("verification", __name__, url_prefix="/api/verification")
calculator_bp = Blueprint("calculator", __name__, url_prefix="/api/calculator")
dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

# --- Module 5: Scam Connection Mapper with NetworkX ---
@graph_bp.route("/network", methods=["GET"])
def get_graph():
    ads = db.get_all_advertisements()
    
    # Try using NetworkX for graph structure and cluster identification
    try:
        import networkx as nx
        G = nx.Graph()
        
        # Add ad nodes
        for ad in ads:
            ad_id = ad["advertisement_id"]
            title = ad.get("title", ad_id)
            label = title[:22] + "..." if len(title) > 24 else title
            G.add_node(ad_id, label=label, node_type="ad", riskCategory=ad.get("risk_category", "LOWER DETECTED RISK"), adId=ad_id)

        # Cross-match identifiers to add edges
        for i in range(len(ads)):
            for j in range(i + 1, len(ads)):
                a = ads[i]
                b = ads[j]

                # Phone match
                common_phones = set(a.get("phone_numbers", [])).intersection(set(b.get("phone_numbers", [])))
                for p in common_phones:
                    phone_node = f"node-phone-{p}"
                    if not G.has_node(phone_node):
                        G.add_node(phone_node, label=f"📞 {p}", node_type="phone")
                    G.add_edge(a["advertisement_id"], phone_node, label="Uses Phone", relationshipType="phone", weight=1)
                    G.add_edge(b["advertisement_id"], phone_node, label="Uses Phone", relationshipType="phone", weight=1)

                # Domain match
                common_doms = set(a.get("domains", [])).intersection(set(b.get("domains", [])))
                for d in common_doms:
                    dom_node = f"node-dom-{d}"
                    if not G.has_node(dom_node):
                        G.add_node(dom_node, label=f"🌐 {d}", node_type="domain")
                    G.add_edge(a["advertisement_id"], dom_node, label="Hosts on", relationshipType="domain", weight=1)
                    G.add_edge(b["advertisement_id"], dom_node, label="Hosts on", relationshipType="domain", weight=1)

                # Email match
                common_emails = set(a.get("email_addresses", [])).intersection(set(b.get("email_addresses", [])))
                for e in common_emails:
                    em_node = f"node-em-{e}"
                    if not G.has_node(em_node):
                        G.add_node(em_node, label=f"✉️ {e}", node_type="email")
                    G.add_edge(a["advertisement_id"], em_node, label="Contacts via", relationshipType="email", weight=1)
                    G.add_edge(b["advertisement_id"], em_node, label="Contacts via", relationshipType="email", weight=1)

                # Text similarity
                if not common_phones and not common_doms and not common_emails:
                    sim = compute_cosine_similarity(a.get("extracted_text", ""), b.get("extracted_text", ""))
                    if sim >= 0.62:
                        G.add_edge(a["advertisement_id"], b["advertisement_id"], label=f"Similar ({int(sim*100)}%)", relationshipType="text_similarity", weight=sim)

        # Compute clusters / connected components
        clusters = []
        cluster_id = 1
        for comp in nx.connected_components(G):
            ad_members = [n for n in comp if G.nodes[n].get("node_type") == "ad"]
            if len(ad_members) > 1:
                # Find primary identifier
                ident_members = [G.nodes[n].get("label", n) for n in comp if G.nodes[n].get("node_type") in ("phone", "domain")]
                primary_id = ident_members[0] if ident_members else "Text Template Syndicate"
                clusters.append({
                    "clusterId": cluster_id,
                    "adIds": ad_members,
                    "primaryIdentifier": primary_id
                })
                cluster_id += 1

        # Format nodes and edges
        nodes = []
        for n, attr in G.nodes(data=True):
            nodes.append({
                "id": n,
                "label": attr.get("label", n),
                "type": attr.get("node_type", "ad"),
                "riskCategory": attr.get("riskCategory"),
                "adId": attr.get("adId")
            })

        edges = []
        for u, v, attr in G.edges(data=True):
            edges.append({
                "id": f"edge-{u}-{v}",
                "source": u,
                "target": v,
                "label": attr.get("label", "Connected"),
                "relationshipType": attr.get("relationshipType", "phone"),
                "weight": attr.get("weight", 1)
            })

        return jsonify({
            "nodes": nodes,
            "edges": edges,
            "clusters": clusters,
            "engine": "NetworkX Graph Engine"
        })

    except Exception as e:
        print(f"[LoanGuard Graph] NetworkX execution fallback ({e})")
        # Standard fallback if networkx error
        nodes = [{"id": a["advertisement_id"], "label": a["title"][:22], "type": "ad", "riskCategory": a.get("risk_category")} for a in ads]
        return jsonify({"nodes": nodes, "edges": [], "clusters": []})

# --- Module 3: RBI Lender Registry ---
@verification_bp.route("/lenders", methods=["GET"])
def get_lenders():
    q = request.args.get("query", "")
    lenders = db.get_reference_lenders(q)
    return jsonify({
        "reference_lenders": lenders,
        "count": len(lenders)
    })

@verification_bp.route("/import", methods=["POST"])
def import_lenders():
    new_lenders = []

    # File upload
    if "file" in request.files:
        f = request.files["file"]
        content = f.read().decode("utf-8")
        if f.filename.endswith(".json"):
            new_lenders = json.loads(content)
        else:
            reader = csv.DictReader(io.StringIO(content))
            for row in reader:
                new_lenders.append({
                    "lender_id": row.get("lender_id") or f"IMP-{len(new_lenders)+1}",
                    "lender_name": row.get("lender_name", ""),
                    "regulated_entity": row.get("regulated_entity", "NBFC"),
                    "app_names": [a.strip() for a in row.get("app_names", "").split(";") if a.strip()],
                    "official_domains": [d.strip() for d in row.get("official_domains", "").split(";") if d.strip()],
                    "contact_phone": row.get("contact_phone", ""),
                    "contact_email": row.get("contact_email", ""),
                    "registration_number": row.get("registration_number", ""),
                    "source": row.get("source", "CSV Import"),
                    "last_updated": row.get("last_updated", "2026-10-30")
                })
    elif request.is_json:
        payload = request.get_json()
        new_lenders = payload if isinstance(payload, list) else payload.get("lenders", [])

    if not new_lenders:
        return jsonify({"error": "No valid lender records found to import."}), 400

    db.insert_reference_lenders(new_lenders)
    return jsonify({
        "status": "success",
        "imported_count": len(new_lenders),
        "message": f"Successfully imported {len(new_lenders)} reference lenders."
    })

# --- Module 4: Loan Cost Calculator ---
@calculator_bp.route("/calculate", methods=["POST"])
def calculate_loan():
    data = request.get_json() or {}
    try:
        P = float(data.get("principal", 100000))
        rate = float(data.get("annual_rate", 12.0))
        n = int(data.get("tenure_months", 24))
        fee_pct = float(data.get("fee_percent", 2.0))
        include_gst = bool(data.get("include_gst", True))
        daily_rate = float(data.get("daily_rate", 0.1))
        short_days = int(data.get("short_days", 7))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid numerical parameters."}), 400

    if P <= 0 or n <= 0:
        return jsonify({"error": "Principal and tenure must be positive numbers."}), 400

    if rate == 0:
        emi = round(P / n)
        total_interest = 0
        total_repayment = round(P)
    else:
        monthly_r = rate / 100 / 12
        factor = (1 + monthly_r) ** n
        emi = round((P * monthly_r * factor) / (factor - 1))
        total_repayment = round(emi * n)
        total_interest = round(total_repayment - P)

    fee_amount = (P * fee_pct) / 100
    gst_amount = fee_amount * 0.18 if include_gst else 0
    total_upfront = round(fee_amount + gst_amount)
    net_disbursed = round(P - total_upfront)

    total_cost = total_interest + total_upfront
    years = n / 12
    effective_apr = round((total_cost / P / years) * 100, 2)

    # Daily trap calculation
    daily_annualized = round(daily_rate * 365, 1)
    short_repayment = round(P + (P * (daily_rate / 100) * short_days))

    return jsonify({
        "principal": P,
        "annual_rate": rate,
        "tenure_months": n,
        "emi": emi,
        "total_interest": total_interest,
        "total_repayment": total_repayment,
        "fee_amount": round(fee_amount),
        "gst_amount": round(gst_amount),
        "total_upfront_fees": total_upfront,
        "net_disbursed": net_disbursed,
        "effective_apr": effective_apr,
        "daily_annualized_apr": daily_annualized,
        "short_tenure_repayment": short_repayment
    })

# --- Module 6 & 7: Dashboard Aggregated Statistics ---
@dashboard_bp.route("/stats", methods=["GET"])
def get_dashboard_stats():
    stats = db.get_dashboard_stats()
    return jsonify(stats)

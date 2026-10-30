"""
LoanGuard – AI-Powered Multidimensional Loan Advertisement Risk Analyzer
Main Flask Application Server
"""

import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from config import Config

from backend.routes.analysis_routes import analysis_bp
from backend.routes.graph_routes import graph_bp, verification_bp, calculator_bp, dashboard_bp

def create_app():
    app = Flask(__name__, static_folder="frontend/static", template_folder="frontend/templates")
    app.config.from_object(Config)
    CORS(app)

    # Register API Blueprints
    app.register_blueprint(analysis_bp)
    app.register_blueprint(graph_bp)
    app.register_blueprint(verification_bp)
    app.register_blueprint(calculator_bp)
    app.register_blueprint(dashboard_bp)

    @app.route("/health")
    def health():
        return jsonify({
            "status": "healthy",
            "system": "LoanGuard API Server",
            "version": "1.0.0"
        })

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

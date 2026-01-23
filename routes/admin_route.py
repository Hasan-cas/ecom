import os
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, make_response, current_app
from services.admin_service import verify_admin_credentials, admin_required
from services.product_service import create_product, update_product # Added imports

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

@admin_bp.route('/admin-login', methods=['POST'])
def admin_login():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Missing JSON body"}), 400

    username = data.get("username")
    password = data.get("password")

    if verify_admin_credentials(username, password):
        api_key = os.environ.get("ADMIN_API_KEY")
        resp = make_response(jsonify({"status": "success", "message": "Login successful"}))
        resp.set_cookie(
            'admin_token', 
            api_key,
            httponly=True,
            secure=True,
            samesite='Strict'
        )
        return resp, 200

    return jsonify({"status": "error", "message": "Invalid credentials"}), 401

@admin_bp.route('/logout', methods=['GET'])
def logout():
    resp = make_response(jsonify({"status": "success", "message": "Logged out successfully"}))
    resp.set_cookie('admin_token', '', expires=0)
    return resp, 200

@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    return jsonify({"status": "ok", "message": "Admin authenticated"}), 200

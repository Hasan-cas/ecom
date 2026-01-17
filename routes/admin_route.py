import os
from flask import Blueprint, request, jsonify, make_response
from services.admin_service import verify_admin_credentials, admin_required
admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.route('/admin-login', methods=['POST'])
def admin_login():
    """
    Admin login route.
    Validates JSON credentials and sets a secure HttpOnly cookie if successful.
    """
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Missing JSON body"}), 400
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"status": "error", "message": "Missing username or password"}), 400
    
    if verify_admin_credentials(username, password):
        api_key = os.environ.get("ADMIN_API_KEY")
        if not api_key:
             return jsonify({"status": "error", "message": "Server configuration error"}), 500
    
        resp = make_response(jsonify({"status": "success", "message": "Login successful"}))
        
        # Set secure cookie
        # Secure=True ensures cookie is sent only over HTTPS (set to False for local dev if needed)
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
    """
    Admin logout route.
    Clears the authentication cookie.
    """
    resp = make_response(jsonify({"status": "success", "message": "Logged out successfully"}))
    resp.set_cookie('admin_token', '', expires=0)
    return resp, 200
@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    """
    Protected admin dashboard check.
    """
    return jsonify({"status": "ok", "message": "Admin authenticated"}), 200

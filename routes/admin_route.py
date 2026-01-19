import os
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, make_response, current_app
from services.admin_service import verify_admin_credentials, admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

# Configuration for file uploads
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@admin_bp.route('/products', methods=['POST'])
@admin_required
def create_product():
    """
    Creates a product. Handles both multipart/form-data (files) and application/json (URLs).
    """
    image_path = None
    
    if request.content_type and 'multipart/form-data' in request.content_type:
        name = request.form.get('name')
        price = request.form.get('price')
        stock = request.form.get('stock')
        description = request.form.get('description')
        
        # Handle File Upload
        if 'image_file' in request.files:
            file = request.files['image_file']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Ensure directory exists
                upload_path = os.path.join(current_app.root_path, UPLOAD_FOLDER)
                if not os.path.exists(upload_path):
                    os.makedirs(upload_path)
                
                file.save(os.path.join(upload_path, filename))
                image_path = f"/{UPLOAD_FOLDER}/{filename}"
        
        # Fallback to URL if no file was uploaded
        if not image_path:
            image_path = request.form.get('image')
    else:
        # Standard JSON handling
        data = request.get_json()
        name = data.get('name')
        price = data.get('price')
        stock = data.get('stock')
        description = data.get('description')
        image_path = data.get('image')

    # Logic to save to database goes here (keeping existing structure)
    # Example: new_product = Product(name=name, price=price, image=image_path...)
    
    return jsonify({"status": "success", "image_url": image_path}), 201


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

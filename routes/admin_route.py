import os
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, make_response, current_app
from services.admin_service import verify_admin_credentials, admin_required
from services.product_service import create_product, update_product # Added imports

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

# Configuration for file uploads
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@admin_bp.route('/products', methods=['POST'])
@admin_required
def create_product_route():
    """
    Creates a product. Handles multipart/form-data for image uploads.
    """
    image_path = None
    
    # 1. Handle Multipart Form Data (Files + Fields)
    if request.content_type and 'multipart/form-data' in request.content_type:
        name = request.form.get('name')
        price = request.form.get('price')
        stock = request.form.get('stock')
        description = request.form.get('description')
        
        # Handle Physical File Upload
        if 'image_file' in request.files:
            file = request.files['image_file']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                upload_path = os.path.join(current_app.root_path, UPLOAD_FOLDER)
                
                if not os.path.exists(upload_path):
                    os.makedirs(upload_path)
                
                file.save(os.path.join(upload_path, filename))
                image_path = f"/{UPLOAD_FOLDER}/{filename}"
        
        # Fallback to URL if no file was provided
        if not image_path:
            image_path = request.form.get('image')
            
        # Prepare data for the service
        product_data = {
            'name': name,
            'price': price,
            'stock': stock,
            'description': description,
            'image': image_path
        }
    else:
        # 2. Handle Standard JSON
        product_data = request.get_json()

    # 3. Save to Database via Service
    product, error = create_product(product_data)
    
    if error:
        return jsonify({"status": "error", "message": error}), 400
    
    return jsonify({
        "status": "success", 
        "message": "Product created successfully",
        "data": product.to_dict()
    }), 201

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

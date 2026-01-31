import os
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError

# Import product-related service functions
from services.product_service import (
    get_all_products,
    get_product_by_id,
    create_product,
    update_product,
    delete_product
)

# Import admin auth decorator
from services.admin_service import admin_required

# Define blueprint
product_bp = Blueprint("products", __name__, url_prefix="/api")

@product_bp.route('/products', methods=['GET'])
def get_products():
    """Retrieve all products."""
    try:
        products = get_all_products()
        return jsonify({
            'status': 'success',
            'data': products,
            'count': len(products)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error in get_products route: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to retrieve products'}), 500

@product_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Retrieve a single product by ID."""
    try:
        product = get_product_by_id(product_id)
        if not product:
            return jsonify({'status': 'error', 'message': 'Product not found'}), 404
        return jsonify({
            'status': 'success',
            'data': product.to_dict()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error in get_product route: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Database error'}), 500

# ============================================================================
# ADMIN ROUTES (Authentication Required)
# ============================================================================

@product_bp.route('/admin/products', methods=['GET','POST'])
@admin_required
def add_product():
    """Create a new product (Admin only)."""
    try:
        # formData includes the 'category' string combined by admin_panel.js
        data = request.form.to_dict()
        image_file = request.files.get('image')

        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400

        product, error = create_product(data, image_file)

        if error:
            return jsonify({'status': 'error', 'message': error}), 400

        return jsonify({
            'status': 'success',
            'message': 'Product created successfully',
            'data': product.to_dict()
        }), 201
    except Exception as e:
        current_app.logger.error(f"Error in add_product route: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@product_bp.route('/admin/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product_route(product_id):
    """Delete a product (Admin only)."""
    try:
        success, error = delete_product(product_id)
        if error:
            return jsonify({'status': 'error', 'message': error}), 404
        return jsonify({'status': 'success', 'message': 'Product deleted'}), 200
    except Exception as e:
        current_app.logger.error(f"Error in delete_product_route: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Deletion failed'}), 500

@product_bp.route('/admin/products/<int:product_id>', methods=['PUT'])
@admin_required
def update_product_route(product_id):
    """Update product details."""
    try:
        data = request.get_json()
        product, error = update_product(product_id, data)
        if error:
            return jsonify({'status': 'error', 'message': error}), 400
        return jsonify({
            'status': 'success',
            'data': product.to_dict()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error in update_product_route: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Update failed'}), 500


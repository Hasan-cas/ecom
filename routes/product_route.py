import os
from flask import Blueprint, request, jsonify, make_response
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
    """
    GET /products
    Retrieve all products from the database.
    Returns:
        JSON response with list of all products
    """
    try:
        products = get_all_products()
        return jsonify({
            'status': 'success',
            'message': 'Products retrieved successfully',
            'data': products,
            'count': len(products)
        }), 200
    except Exception as e:
        product_bp.logger.error(f"Error in get_products route: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving products'
        }), 500

@product_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """
    GET /products/<id>
    Retrieve a single product by ID.
    
    product_id: The ID of the product
    Returns:
        JSON response with product details
    """
    try:
        product = get_product_by_id(product_id)
        
        if not product:
            return jsonify({
                'status': 'error',
                'message': 'Product not found'
            }), 404
        
        return jsonify({
            'status': 'success',
            'message': 'Product retrieved successfully',
            'data': product.to_dict()
        }), 200
    except Exception as e:
        product_bp.logger.error(f"Error in get_product route: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving the product'
        }), 500

# ============================================================================
# ADMIN ROUTES (Authentication Required)
# ============================================================================

@product_bp.route('/admin/products', methods=['POST'])
@admin_required
def add_product():
    """
    POST /admin/products
    Create a new product (Admin only).
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided in request body'
            }), 400
        
        product, error = create_product(data)
        
        if error:
            return jsonify({
                'status': 'error',
                'message': error
            }), 400
        
        return jsonify({
            'status': 'success',
            'message': 'Product created successfully',
            'data': product.to_dict()
        }), 201
    except Exception as e:
        product_bp.logger.error(f"Error in add_product route: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while creating the product'
        }), 500

@product_bp.route('/admin/products/<int:product_id>', methods=['PUT'])
@admin_required
def update_product_route(product_id):
    """
    PUT /admin/products/<id>
    Update an existing product (Admin only).
    
    Headers Required:
        X-ADMIN-KEY: Valid admin authentication key
    
    Request Body (all fields optional):
    {
        "name": "Updated Laptop",
        "price": 899.99,
        "stock": 45,
        "description": "Updated description",
        "image": "https://example.com/updated-laptop.jpg"
    }
    
    Example Response (Success):
    {
        "status": "success",
        "message": "Product updated successfully",
        "data": {
            "id": 1,
            "name": "Updated Laptop",
            "price": 899.99,
            "stock": 45,
            "description": "Updated description",
            "image": "https://example.com/updated-laptop.jpg",
            "created_at": "2024-01-15T10:30:00",
            "updated_at": "2024-01-15T11:00:00"
        }
    }
    
    Example Response (Not Found):
    {
        "status": "error",
        "message": "Product not found"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided in request body'
            }), 400
        
        product, error = update_product(product_id, data)
        
        if error:
            status_code = 404 if error == "Product not found" else 400
            return jsonify({
                'status': 'error',
                'message': error
            }), status_code
        
        return jsonify({
            'status': 'success',
            'message': 'Product updated successfully',
            'data': product.to_dict()
        }), 200
    except Exception as e:
        product_bp.logger.error(f"Error in update_product_route: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while updating the product'
        }), 500

@product_bp.route('/admin/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product_route(product_id):
    """
    DELETE /admin/products/<id>
    Delete a product (Admin only).
    
    Headers Required:
        X-ADMIN-KEY: Valid admin authentication key
    
    Example Response (Success):
    {
        "status": "success",
        "message": "Product deleted successfully"
    }
    
    Example Response (Not Found):
    {
        "status": "error",
        "message": "Product not found"
    }
    """
    try:
        success, error = delete_product(product_id)
        
        if error:
            return jsonify({
                'status': 'error',
                'message': error
            }), 404
        
        return jsonify({
            'status': 'success',
            'message': 'Product deleted successfully'
        }), 200
    except Exception as e:
        product_bp.logger.error(f"Error in delete_product_route: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while deleting the product'
        }), 500


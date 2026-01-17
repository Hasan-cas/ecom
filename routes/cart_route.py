from flask import Blueprint, request, jsonify
from services.cart_service import (
    get_or_create_client_token,
    add_item_to_cart,
    remove_item_from_cart,
    fetch_cart_contents,
    clear_cart
)

cart_bp = Blueprint("cart", __name__, url_prefix="/api/cart")

@cart_bp.route('/add', methods=['POST'])
def add_to_cart():
    """
    POST /add
    Add a product to the shopping cart
    
    User Flow:
    1. User selects a product and quantity on the frontend
    2. Frontend sends POST request with product_id and quantity
    3. Backend validates product exists and stock is sufficient
    4. Backend adds item to cart or updates existing quantity
    5. Backend returns updated cart contents
    
    Request Body:
        {
            "product_id": 1,
            "quantity": 2
        }
    
    Success Response (201):
        {
            "status": "success",
            "message": "Added 2 x Product Name to cart",
            "data": {
                "items": [
                    {
                        "cart_id": 1,
                        "product_id": 1,
                        "quantity": 2,
                        "product_name": "Product Name",
                        "product_price": 29.99,
                        "subtotal": 59.98
                    }
                ],
                "total_items": 1,
                "total_price": 59.98
            }
        }
    
    Error Response (400/404/500):
        {
            "status": "error",
            "message": "Insufficient stock. Available: 1, Requested: 2"
        }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Request body is required'
            }), 400
        
        product_id = data.get('product_id')
        quantity = data.get('quantity')
        
        # Validate input
        if product_id is None:
            return jsonify({
                'status': 'error',
                'message': 'product_id is required'
            }), 400
        
        if quantity is None:
            return jsonify({
                'status': 'error',
                'message': 'quantity is required'
            }), 400
        
        # Validate data types
        try:
            product_id = int(product_id)
            quantity = int(quantity)
        except (ValueError, TypeError):
            return jsonify({
                'status': 'error',
                'message': 'product_id and quantity must be integers'
            }), 400
        
        # Get or create client token
        client_token = get_or_create_client_token()
        
        # Add item to cart
        success, message, cart_data = add_item_to_cart(client_token, product_id, quantity)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': message,
                'data': cart_data
            }), 201
        else:
            # Determine cart_bpropriate status code
            status_code = 404 if 'not found' in message.lower() else 400
            return jsonify({
                'status': 'error',
                'message': message
            }), status_code
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500


@cart_bp.route('/remove', methods=['POST'])
def remove_from_cart():
    """
    POST /remove
    Remove a product from the shopping cart
    
    User Flow:
    1. User clicks remove button on a cart item
    2. Frontend sends POST request with product_id
    3. Backend finds and deletes the cart item
    4. Backend returns updated cart contents
    
    Request Body:
        {
            "product_id": 1
        }
    
    Success Response (200):
        {
            "status": "success",
            "message": "Removed Product Name from cart",
            "data": {
                "items": [],
                "total_items": 0,
                "total_price": 0.0
            }
        }
    
    Error Response (404/500):
        {
            "status": "error",
            "message": "Product with ID 1 not found in cart"
        }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Request body is required'
            }), 400
        
        product_id = data.get('product_id')
        
        if product_id is None:
            return jsonify({
                'status': 'error',
                'message': 'product_id is required'
            }), 400
        
        # Validate data type
        try:
            product_id = int(product_id)
        except (ValueError, TypeError):
            return jsonify({
                'status': 'error',
                'message': 'product_id must be an integer'
            }), 400
        
        # Get client token
        client_token = get_or_create_client_token()
        
        # Remove item from cart
        success, message, cart_data = remove_item_from_cart(client_token, product_id)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': message,
                'data': cart_data
            }), 200
        else:
            status_code = 404 if 'not found' in message.lower() else 500
            return jsonify({
                'status': 'error',
                'message': message
            }), status_code
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500


@cart_bp.route('', methods=['GET'])
def get_cart():
    """
    GET 
    Retrieve current shopping cart contents
    
    User Flow:
    1. User navigates to cart page
    2. Frontend sends GET request
    3. Backend fetches all cart items for the session
    4. Backend joins product information (name, price)
    5. Backend calculates total price
    6. Backend returns cart data
    
    Success Response (200):
        {
            "status": "success",
            "data": {
                "items": [
                    {
                        "cart_id": 1,
                        "product_id": 1,
                        "quantity": 2,
                        "product_name": "Laptop",
                        "product_price": 999.99,
                        "subtotal": 1999.98
                    },
                    {
                        "cart_id": 2,
                        "product_id": 2,
                        "quantity": 1,
                        "product_name": "Mouse",
                        "product_price": 25.99,
                        "subtotal": 25.99
                    }
                ],
                "total_items": 2,
                "total_price": 2025.97
            }
        }
    
    Empty Cart Response (200):
        {
            "status": "success",
            "data": {
                "items": [],
                "total_items": 0,
                "total_price": 0.0
            }
        }
    """
    try:
        # Get client token
        client_token = get_or_create_client_token()
        
        # Fetch cart contents
        cart_data = fetch_cart_contents(client_token)
        
        return jsonify({
            'status': 'success',
            'data': cart_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500


@cart_bp.route('/clear', methods=['POST'])
def clear_cart_route():
    """
    POST /clear
    Clear all items from the shopping cart
    
    User Flow:
    1. User clicks "Clear Cart" or "Empty Cart" button
    2. Frontend sends POST request
    3. Backend deletes all cart items for the session
    4. Backend returns success confirmation
    
    Success Response (200):
        {
            "status": "success",
            "message": "Cleared 3 item(s) from cart"
        }
    
    Empty Cart Response (200):
        {
            "status": "success",
            "message": "Cart is already empty"
        }
    
    Error Response (500):
        {
            "status": "error",
            "message": "Database error: ..."
        }
    """
    try:
        # Get client token
        client_token = get_or_create_client_token()
        
        # Clear cart
        success, message = clear_cart(client_token)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': message
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': message
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500



from flask import Blueprint, request, jsonify
from services.cart_service import (
    get_or_create_client_token, 
    add_item_to_cart, 
    remove_item_from_cart, 
    fetch_cart_contents,
    clear_cart
)

cart_bp = Blueprint('cart', __name__, url_prefix='/api/cart')

@cart_bp.route('', methods=['GET'])
def get_cart():
    token = get_or_create_client_token()
    return jsonify({'status': 'success', 'data': fetch_cart_contents(token)})

@cart_bp.route('/add', methods=['POST'])
def add_to_cart():
    try:
        data = request.get_json()
        product_id = int(data['product_id'])
        quantity = int(data.get('quantity', 1))
        size = data.get('size', 'Standard') # Extract size from frontend
        
        token = get_or_create_client_token()
        success, message, cart_data = add_item_to_cart(token, product_id, quantity, size)
        
        if not success:
            return jsonify({'status': 'error', 'message': message}), 400
        return jsonify({'status': 'success', 'data': cart_data}), 201
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@cart_bp.route('/remove', methods=['POST'])
def remove_from_cart():
    try:
        data = request.get_json()
        product_id = data.get('product_id')
        size = data.get('size', 'Standard') # Target specific variant for removal
        
        token = get_or_create_client_token()
        success, message, cart_data = remove_item_from_cart(token, product_id, size)
        
        if not success:
            return jsonify({'status': 'error', 'message': message}), 404
        return jsonify({'status': 'success', 'data': cart_data}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@cart_bp.route('/clear', methods=['POST'])
def clear_cart_route():
    token = get_or_create_client_token()
    success, message = clear_cart(token)
    return jsonify({'status': 'success' if success else 'error', 'message': message})


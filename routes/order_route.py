from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError
from models import db

from services.admin_service import admin_required
from services.cart_service import get_or_create_client_token, clear_cart 
from services.order_service import (
    fetch_cart_items, 
    validate_cart_not_empty,
    validate_stock_availability,
    create_order_from_cart,
    reduce_product_stock,
    get_all_orders,
    update_order_status
)

order_bp = Blueprint("orders", __name__, url_prefix="/api")

@order_bp.route('/checkout', methods=['POST'])
def checkout():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Request body is required'}), 400
        
        # Validate required fields
        for field in ['customer_name', 'phone', 'address']:
            if not data.get(field):
                return jsonify({'status': 'error', 'message': f'Missing field: {field}'}), 400

        client_token = get_or_create_client_token()
        
        # Use fetch_cart_items (the correct function name)
        cart_items = fetch_cart_items(client_token)
        
        is_valid, error_message = validate_cart_not_empty(cart_items)
        if not is_valid:
            return jsonify({'status': 'error', 'message': error_message}), 400
            
        is_valid, error_message, out_of_stock = validate_stock_availability(cart_items)
        if not is_valid:
            return jsonify({'status': 'error', 'message': error_message, 'out_of_stock': out_of_stock}), 400

        order = create_order_from_cart(client_token, data)
        reduce_product_stock(cart_items)
        clear_cart(client_token)
        
        return jsonify({
            'status': 'success',
            'message': 'Order placed successfully',
            'data': order.to_dict(include_items=True)
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error in checkout: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Unexpected error in checkout: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Internal error'}), 500

@order_bp.route('/admin/orders', methods=['GET'])
@admin_required
def get_orders():
    try:
        orders = get_all_orders()
        return jsonify({'status': 'success', 'data': [o.to_dict(True) for o in orders]}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching orders: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to fetch orders'}), 500


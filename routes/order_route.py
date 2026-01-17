from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError

from services.admin_service import admin_required
from services.cart_service import get_or_create_client_token, clear_cart, fetch_cart_contents
from services.order_service import (
    validate_cart_not_empty,
    validate_stock_availability,
    create_order_from_cart,
    reduce_product_stock,
    get_all_orders,
    update_order_status
)
order_bp = Blueprint("orders", __name__, url_prefix="/api/orders")

@order_bp.route('/api/checkout', methods=['POST'])
def checkout():
    """
    POST /api/checkout
    Process checkout and create an order from cart contents.
    
    Complete User Flow:
    1. User fills out checkout form (name, phone, address)
    2. Frontend sends POST request with customer details
    3. Backend retrieves user's cart items
    4. Backend validates cart is not empty
    5. Backend validates all products have sufficient stock
    6. Backend calculates total order amount
    7. Backend creates Order record with customer details
    8. Backend creates OrderItem records for each cart item
    9. Backend reduces product stock quantities
    10. Backend clears user's cart
    11. Backend returns order confirmation with order ID and total
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Request body is required'
            }), 400
        
        # Validate required fields
        required_fields = ['customer_name', 'phone', 'address']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        customer_name = data['customer_name'].strip()
        phone = data['phone'].strip()
        address = data['address'].strip()
        
        # Additional validation
        if len(customer_name) < 2:
            return jsonify({
                'status': 'error',
                'message': 'Customer name must be at least 2 characters'
            }), 400
        
        if len(phone) < 10:
            return jsonify({
                'status': 'error',
                'message': 'Phone number must be at least 10 characters'
            }), 400
        
        if len(address) < 10:
            return jsonify({
                'status': 'error',
                'message': 'Address must be at least 10 characters'
            }), 400
        
        # Get client token
        client_token = get_or_create_client_token()
        
        # Fetch cart items
        cart_items = fetch_cart_contents(client_token)
        
        # Validate cart is not empty
        is_valid, error_message = validate_cart_not_empty(cart_items)
        if not is_valid:
            return jsonify({
                'status': 'error',
                'message': error_message
            }), 400
        
        # Validate stock availability
        is_valid, error_message, out_of_stock = validate_stock_availability(cart_items)
        if not is_valid:
            return jsonify({
                'status': 'error',
                'message': error_message,
                'out_of_stock_items': out_of_stock
            }), 400
        
        # Create order from cart
        order, error = create_order_from_cart(customer_name, phone, address, cart_items)
        if error:
            return jsonify({
                'status': 'error',
                'message': error
            }), 500
        
        # Reduce product stock
        reduce_product_stock(cart_items)
        
        # Clear cart
        clear_cart(client_token)
        
        # Return success response with order details
        return jsonify({
            'status': 'success',
            'message': 'Order placed successfully',
            'data': order.to_dict(include_items=True)
        }), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        order_bp.logger.error(f"Database error in checkout: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'A database error occurred while processing your order'
        }), 500
    except Exception as e:
        db.session.rollback()
        order_bp.logger.error(f"Unexpected error in checkout: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An unexpected error occurred while processing your order'
        }), 500

# ============================================================================
# ADMIN ROUTES - ORDER MANAGEMENT
# ============================================================================

@order_bp.route('/api/admin/orders', methods=['GET'])
@admin_required
def get_orders():
    """
    GET /api/admin/orders
    Retrieve all orders with their items and details (Admin only).
    
    Admin Workflow:
    1. Admin logs into admin dashboard
    2. Admin navigates to orders management page
    3. Frontend sends GET request with admin authentication
    4. Backend retrieves all orders from database
    5. Backend joins order items and product details
    6. Backend returns comprehensive order list
    7. Admin can review orders, customer details, and order status
    
    Headers Required:
        X-ADMIN-KEY: Valid admin authentication key
    """
    try:
        orders = get_all_orders()
        
        return jsonify({
            'status': 'success',
            'message': 'Orders retrieved successfully',
            'data': orders,
            'count': len(orders)
        }), 200
        
    except Exception as e:
        order_bp.logger.error(f"Error in get_orders route: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving orders'
        }), 500

@order_bp.route('/api/admin/orders/<int:order_id>/status', methods=['POST'])
@admin_required
def update_status(order_id):
    """
    POST /api/admin/orders/<order_id>/status
    Update the status of an order (Admin only).
    
    Admin Workflow:
    1. Admin reviews order in dashboard
    2. Admin selects new status (Pending, Shipped, Delivered)
    3. Frontend sends POST request with new status
    4. Backend validates order exists
    5. Backend validates status value is allowed
    6. Backend updates order status and timestamp
    7. Backend returns updated order details
    8. Admin sees confirmation of status update
    
    Headers Required:
        X-ADMIN-KEY: Valid admin authentication key
    
    Request Body:
    {
        "status": "Shipped"
    }
    
    Valid status values: "Pending", "Shipped", "Delivered"
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Request body is required'
            }), 400
        
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({
                'status': 'error',
                'message': 'Status field is required'
            }), 400
        
        # Update order status
        order, error = update_order_status(order_id, new_status)
        
        if error:
            status_code = 404 if error == "Order not found" else 400
            return jsonify({
                'status': 'error',
                'message': error
            }), status_code
        
        return jsonify({
            'status': 'success',
            'message': 'Order status updated successfully',
            'data': order.to_dict(include_items=True)
        }), 200
        
    except Exception as e:
        order_bp.logger.error(f"Error in update_status route: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while updating order status'
        }), 500

from flask import Blueprint, request, jsonify
from models import db, CartItem, Product
from services.cart_service import get_or_create_client_token

cart_bp = Blueprint('cart', __name__, url_prefix='/api/cart')

def build_cart_response(token):
    """Helper to return the standardized cart format with images."""
    items = CartItem.query.filter_by(client_token=token).all()
    return {
        'items': [{
            'product_id': item.product_id,
            'product_name': item.product.name,
            'product_price': float(item.product.price),
            'quantity': item.quantity,
            'subtotal': float(item.product.price * item.quantity),
            'image': item.product.image  # This ensures the picture shows up
        } for item in items],
        'total_items': sum(item.quantity for item in items),
        'total_price': float(sum(item.product.price * item.quantity for item in items))
    }

@cart_bp.route('', methods=['GET'])
def get_cart():
    token = get_or_create_client_token()
    return jsonify({'status': 'success', 'data': build_cart_response(token)})

@cart_bp.route('/add', methods=['POST'])
def add_to_cart():
    try:
        data = request.get_json()
        product_id = int(data['product_id'])
        quantity = int(data.get('quantity', 1))
        client_token = get_or_create_client_token()

        product = Product.query.get(product_id)
        if not product or product.stock < quantity:
            return jsonify({'status': 'error', 'message': 'Invalid product or stock'}), 400

        item = CartItem.query.filter_by(client_token=client_token, product_id=product_id).first()
        if item:
            item.quantity += quantity
        else:
            item = CartItem(client_token=client_token, product_id=product_id, quantity=quantity)
            db.session.add(item)
        
        db.session.commit()
        return jsonify({'status': 'success', 'data': build_cart_response(client_token)}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500

@cart_bp.route('/remove', methods=['POST'])
def remove_from_cart():
    try:
        data = request.get_json()
        product_id = data.get('product_id')
        client_token = get_or_create_client_token()

        item = CartItem.query.filter_by(client_token=client_token, product_id=product_id).first()
        if item:
            db.session.delete(item)
            db.session.commit()
        
        return jsonify({'status': 'success', 'data': build_cart_response(client_token)}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@cart_bp.route('/clear', methods=['POST'])
def clear_cart_route():
    try:
        client_token = get_or_create_client_token()
        CartItem.query.filter_by(client_token=client_token).delete()
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Cart cleared'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


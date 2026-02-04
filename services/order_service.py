import uuid
from datetime import datetime
from flask import session, current_app
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm.attributes import flag_modified
from models import db, CartItem, Product, Order, OrderItem

def fetch_cart_items(client_token):
    try:
        return CartItem.query.filter_by(client_token=client_token).all()
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error in fetch_cart_items: {str(e)}")
        raise

def validate_cart_not_empty(cart_items):
    """Checks if there is actually anything to buy."""
    if not cart_items or len(cart_items) == 0:
        return False, "Your cart is empty"
    return True, None

def validate_stock_availability(cart_items):
    """Checks if the specific variant (size) has enough stock in the JSON structure."""
    out_of_stock = []
    for item in cart_items:
        product = item.product
        variants = product.variants or {}
        variant = variants.get(item.size)
        
        if not variant:
            out_of_stock.append({'name': f"{product.name} ({item.size})", 'error': "Size no longer exists"})
            continue

        available_qty = int(variant.get('stock', 0))
        if available_qty < item.quantity:
            out_of_stock.append({
                'name': f"{product.name} ({item.size})", 
                'requested': item.quantity, 
                'available': available_qty
            })
    
    if out_of_stock:
        return False, "Insufficient stock for some items", out_of_stock
    return True, None, []

def reduce_stock_logic(cart_items):
    """Deducts stock from the nested variant JSON and the main product counter."""
    for item in cart_items:
        product = item.product
        
        if product.variants and item.size in product.variants:
            current_var_stock = int(product.variants[item.size].get('stock', 0))
            product.variants[item.size]['stock'] = max(0, current_var_stock - item.quantity)
            flag_modified(product, "variants")
        
        product.stock = max(0, product.stock - item.quantity)

def create_order_from_cart(client_token, customer_data):
    """
    Creates an order from cart items. 
    Strictly validates that bKash payment data is provided in the customer_data payload.
    """
    try:
        # 1. Validate Payment Details (Mandatory Refactor)
        payment_number = customer_data.get('payment_number')
        transaction_id = customer_data.get('transaction_id')

        if not payment_number or not transaction_id:
            raise ValueError("Payment details required: payment_number and transaction_id must be provided.")

        # 2. Fetch and Validate Cart
        cart_items = fetch_cart_items(client_token)
        is_not_empty, empty_err = validate_cart_not_empty(cart_items)
        if not is_not_empty:
            current_app.logger.warning(f"Order failed: {empty_err}")
            return None

        # 3. Validate Stock
        is_available, message, details = validate_stock_availability(cart_items)
        if not is_available:
            current_app.logger.warning(f"Order failed stock check: {message}")
            return None

        # 4. Total calculation
        total_price = sum(item.price * item.quantity for item in cart_items)
        
        # 5. Create the Order (Mapping direct form fields)
        new_order = Order(
            customer_name=customer_data['customer_name'],
            phone=customer_data['phone'],
            address=customer_data['address'],
            payment_number=payment_number,
            transaction_id=transaction_id,
            total=total_price,
            status='Pending'
        )
        db.session.add(new_order)
        db.session.flush()

        # 6. Transfer Cart items to Order items
        for item in cart_items:
            order_item = OrderItem(
                order_id=new_order.order_id,
                product_id=item.product_id,
                quantity=item.quantity,
                price=item.price,
                size=item.size
            )
            db.session.add(order_item)
        
        # 7. Handle Inventory
        reduce_stock_logic(cart_items)

        # 8. Clear Cart
        CartItem.query.filter_by(client_token=client_token).delete()

        # 9. COMMIT
        db.session.commit()
        return new_order

    except ValueError as ve:
        db.session.rollback()
        current_app.logger.error(f"Validation Error: {str(ve)}")
        raise
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"CRITICAL: Order Creation Error: {str(e)}")
        raise

def get_all_orders():
    return Order.query.order_by(Order.created_at.desc()).all()

def update_order_status(order_id, new_status):
    try:
        order = Order.query.get(order_id)
        if not order:
            return None, "Order not found"
        order.status = new_status
        db.session.commit()
        return order, None
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Status Update Error: {str(e)}")
        raise


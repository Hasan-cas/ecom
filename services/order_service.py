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
        # Access the specific variant from the dictionary
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
    """
    Deducts stock from the nested variant JSON and the main product counter.
    This does NOT commit; it relies on create_order_from_cart to commit the transaction.
    """
    for item in cart_items:
        product = item.product
        
        # 1. Update the specific variant stock in the dictionary
        if product.variants and item.size in product.variants:
            current_var_stock = int(product.variants[item.size].get('stock', 0))
            product.variants[item.size]['stock'] = max(0, current_var_stock - item.quantity)
            # Signal SQLAlchemy that the JSON column content has changed
            flag_modified(product, "variants")
        
        # 2. Update the main 'total stock' column (important for Admin Panel)
        product.stock = max(0, product.stock - item.quantity)

def create_order_from_cart(client_token, customer_data):
    """
    Treats each variant as a unique line item by copying Price and Size 
    exactly as they were in the CartItem snapshot.
    """
    try:
        cart_items = fetch_cart_items(client_token)
        
        # Re-using the validation helper
        is_not_empty, empty_err = validate_cart_not_empty(cart_items)
        if not is_not_empty:
            return None

        # 1. Validate Stock first
        is_available, message, details = validate_stock_availability(cart_items)
        if not is_available:
            current_app.logger.warning(f"Order failed stock check: {message}")
            return None

        # 2. Total calculation based on Cart snapshot prices
        total_price = sum(item.price * item.quantity for item in cart_items)
        
        # 3. Create the Order
        new_order = Order(
            customer_name=customer_data['customer_name'],
            phone=customer_data['phone'],
            address=customer_data['address'],
            payment_number=customer_data.get('payment_number'),
            transaction_id=customer_data.get('transaction_id'),
            total=total_price,
            status='Pending'
        )
        db.session.add(new_order)
        db.session.flush() # Generates order_id

        # 4. Transfer Cart items to Order items (The "Perfect Copy")
        for item in cart_items:
            order_item = OrderItem(
                order_id=new_order.order_id,
                product_id=item.product_id,
                quantity=item.quantity,
                price=item.price, # Stored variant price
                size=item.size    # Stored variant size
            )
            db.session.add(order_item)
        
        # 5. Handle Inventory
        reduce_stock_logic(cart_items)

        # 6. DELETE THE CART ITEMS
        CartItem.query.filter_by(client_token=client_token).delete()

        # 7. COMMIT ALL AT ONCE
        db.session.commit()
        return new_order

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


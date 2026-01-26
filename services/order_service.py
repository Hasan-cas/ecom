import uuid
from datetime import datetime
from flask import session, current_app
from sqlalchemy.exc import SQLAlchemyError
from models import db, CartItem, Product, Order, OrderItem

def get_or_create_client_token():
    if 'client_token' not in session:
        session['client_token'] = str(uuid.uuid4())
    return session['client_token']

def fetch_cart_items(client_token):
    try:
        return CartItem.query.filter_by(client_token=client_token).all()
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error in fetch_cart_items: {str(e)}")
        raise

def validate_cart_not_empty(cart_items):
    if not cart_items or len(cart_items) == 0:
        return False, "Your cart is empty"
    return True, None

def validate_stock_availability(cart_items):
    out_of_stock = []
    for item in cart_items:
        product = item.product
        if product.stock < item.quantity:
            out_of_stock.append({'name': product.name, 'requested': item.quantity, 'available': product.stock})
    
    if out_of_stock:
        return False, "Some items are out of stock", out_of_stock
    return True, None, []

def create_order_from_cart(client_token, customer_data):
    try:
        cart_items = fetch_cart_items(client_token)
        total_price = sum(item.product.price * item.quantity for item in cart_items)
        
        new_order = Order(
            customer_name=customer_data['customer_name'],
            phone=customer_data['phone'],
            address=customer_data['address'],
            total=total_price,
            status='Pending'
        )
        db.session.add(new_order)
        db.session.flush()

        for item in cart_items:
            order_item = OrderItem(
                order_id=new_order.order_id,
                product_id=item.product_id,
                quantity=item.quantity,
                price=item.product.price
            )
            db.session.add(order_item)
        
        db.session.commit()
        return new_order
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating order: {str(e)}")
        raise

def reduce_product_stock(cart_items):
    try:
        for item in cart_items:
            product = item.product
            product.stock -= item.quantity
        db.session.commit()
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating stock: {str(e)}")
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
        current_app.logger.error(f"Error updating status: {str(e)}")
        raise



from flask import current_app
from sqlalchemy.exc import SQLAlchemyError
from models import db, CartItem, Product, Order, OrderItem

def fetch_cart_items(client_token):
    return CartItem.query.filter_by(client_token=client_token).all()

def validate_cart_not_empty(cart_items):
    if not cart_items: return False, "Cart empty"
    return True, None

def validate_stock_availability(cart_items):
    out_of_stock = []
    for item in cart_items:
        if item.product.stock < item.quantity:
            out_of_stock.append({'name': item.product.name, 'requested': item.quantity, 'available': item.product.stock})
    return (False, "Out of stock", out_of_stock) if out_of_stock else (True, None, [])

def create_order_from_cart(client_token, customer_data):
    try:
        cart_items = fetch_cart_items(client_token)
        # Security: Database price calculation
        total_price = sum(item.product.price * item.quantity for item in cart_items)
        
        # Saving Transaction/Payment Info
        new_order = Order(
            customer_name=customer_data['customer_name'],
            phone=customer_data['phone'],
            address=customer_data['address'],
            transaction_id=customer_data.get('transaction_id'),
            payment_number=customer_data.get('payment_number'),
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
                price=item.product.price,
                size=item.size # Preserved Variant Logic
            )
            db.session.add(order_item)
        
        db.session.commit()
        return new_order
    except SQLAlchemyError as e:
        db.session.rollback()
        raise e

def reduce_product_stock(cart_items):
    for item in cart_items:
        item.product.stock -= item.quantity # Updated stock
    db.session.commit()

def get_all_orders():
    return Order.query.order_by(Order.created_at.desc()).all()

def update_order_status(order_id, new_status):
    order = Order.query.get(order_id)
    if not order: return None, "Order not found"
    order.status = new_status
    db.session.commit()
    return order, None


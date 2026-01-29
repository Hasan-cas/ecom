import uuid
from datetime import datetime, timedelta
from flask import session
from sqlalchemy.exc import SQLAlchemyError
from models import db, Product, CartItem

def get_or_create_client_token():
    """
    Ensures each user has a unique identifier and enables 6-month persistence.
    """
    if 'client_token' not in session:
        session['client_token'] = str(uuid.uuid4())
    
    # Enable session permanence (6 months is typically 180 days)
    session.permanent = True
    return session['client_token']


def validate_product_exists(product_id):
    try:
        product = Product.query.get(product_id)
        if not product:
            return None, f"Product with ID {product_id} not found"
        return product, None
    except SQLAlchemyError as e:
        return None, f"Database error: {str(e)}"


def check_stock_availability(product, quantity):
    if product.stock < quantity:
        return False, f"Insufficient stock. Available: {product.stock}, Requested: {quantity}"
    return True, None


def add_item_to_cart(client_token, product_id, quantity, size="Standard"):
    """
    Add a product with a specific size to the cart.
    Identical products with different sizes are treated as separate items.
    """
    try:
        # Validate product exists
        product, error = validate_product_exists(product_id)
        if error:
            return False, error, None
        
        # Validate quantity
        if quantity <= 0:
            return False, "Quantity must be greater than 0", None
        
        # Check if this specific Product + Size combination exists in cart
        existing_item = CartItem.query.filter_by(
            client_token=client_token,
            product_id=product_id,
            size=size
        ).first()
        
        if existing_item:
            # Update existing item quantity
            new_quantity = existing_item.quantity + quantity
            
            # Check stock for new total quantity
            is_available, stock_error = check_stock_availability(product, new_quantity)
            if not is_available:
                return False, stock_error, None
                
            existing_item.quantity = new_quantity
            existing_item.updated_at = datetime.utcnow()
            message = f"Updated {product.name} ({size}) quantity to {new_quantity}"
        else:
            # Check stock for new item
            is_available, stock_error = check_stock_availability(product, quantity)
            if not is_available:
                return False, stock_error, None
            
            # Create new cart item with size
            new_item = CartItem(
                client_token=client_token,
                product_id=product_id,
                quantity=quantity,
                size=size
            )
            db.session.add(new_item)
            message = f"Added {quantity} x {product.name} ({size}) to cart"
        
        db.session.commit()
        return True, message, fetch_cart_contents(client_token)
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return False, f"Database error: {str(e)}", None


def remove_item_from_cart(client_token, product_id, size):
    """
    Removes a specific product variant from the cart.
    """
    try:
        item = CartItem.query.filter_by(
            client_token=client_token, 
            product_id=product_id,
            size=size
        ).first()
        
        if not item:
            return False, "Item variant not found in cart", None
            
        db.session.delete(item)
        db.session.commit()
        
        return True, "Item removed", fetch_cart_contents(client_token)
    except SQLAlchemyError as e:
        db.session.rollback()
        return False, f"Error: {str(e)}", None


def clear_cart(client_token):
    try:
        deleted_count = CartItem.query.filter_by(client_token=client_token).delete()
        db.session.commit()
        if deleted_count == 0:
            return True, "Cart is already empty"
        return True, f"Cleared {deleted_count} item(s) from cart"
    except SQLAlchemyError as e:
        db.session.rollback()
        return False, f"Database error: {str(e)}"


def fetch_cart_contents(client_token):
    """
    Fetch all cart items and calculate total.
    """
    try:
        cart_items = CartItem.query.filter_by(client_token=client_token).all()
        
        items = []
        total_price = 0.0
        
        for item in cart_items:
            # Assuming item.to_dict() now includes 'size'
            item_dict = item.to_dict()
            items.append(item_dict)
            total_price += item_dict['subtotal']
        
        return {
            'items': items,
            'total_items': sum(item.quantity for item in cart_items),
            'total_price': round(total_price, 2)
        }
    except SQLAlchemyError as e:
        return {
            'items': [],
            'total_items': 0,
            'total_price': 0.0,
            'error': str(e)
        }


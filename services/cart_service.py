import uuid
from datetime import datetime

from flask import session
from sqlalchemy.exc import SQLAlchemyError

from models import db, Product, CartItem

def get_or_create_client_token():
    """
    Get existing client token from session or create a new one
    Ensures each user has a unique identifier for their cart
    
    Returns:
        str: Unique client token
    """
    if 'client_token' not in session:
        session['client_token'] = str(uuid.uuid4())
    return session['client_token']


def validate_product_exists(product_id):
    """
    Validate that a product exists in the database
    
    Args:
        product_id (int): Product ID to validate
        
    Returns:
        tuple: (Product object or None, error message or None)
    """
    try:
        product = Product.query.get(product_id)
        if not product:
            return None, f"Product with ID {product_id} not found"
        return product, None
    except SQLAlchemyError as e:
        return None, f"Database error: {str(e)}"


def check_stock_availability(product, quantity):
    """
    Check if requested quantity is available in stock
    
    Args:
        product (Product): Product object
        quantity (int): Requested quantity
        
    Returns:
        tuple: (bool: is_available, error message or None)
    """
    if product.stock < quantity:
        return False, f"Insufficient stock. Available: {product.stock}, Requested: {quantity}"
    return True, None


def add_item_to_cart(client_token, product_id, quantity):
    """
    Add a product to the cart or update quantity if already exists
    
    Business Logic Flow:
    1. Validate product exists
    2. Check stock availability
    3. Check if item already in cart
    4. If exists: update quantity, else: create new cart item
    5. Commit to database
    
    Args:
        client_token (str): Unique client identifier
        product_id (int): Product to add
        quantity (int): Quantity to add
        
    Returns:
        tuple: (success: bool, message: str, cart_data: dict or None)
    """
    try:
        # Validate product exists
        product, error = validate_product_exists(product_id)
        if error:
            return False, error, None
        
        # Validate quantity
        if quantity <= 0:
            return False, "Quantity must be greater than 0", None
        
        # Check if item already in cart
        existing_item = CartItem.query.filter_by(
            client_token=client_token,
            product_id=product_id
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
            message = f"Updated {product.name} quantity to {new_quantity}"
        else:
            # Check stock for new item
            is_available, stock_error = check_stock_availability(product, quantity)
            if not is_available:
                return False, stock_error, None
            
            # Create new cart item
            new_item = CartItem(
                client_token=client_token,
                product_id=product_id,
                quantity=quantity
            )
            db.session.add(new_item)
            message = f"Added {quantity} x {product.name} to cart"
        
        db.session.commit()
        
        # Fetch updated cart
        cart_data = fetch_cart_contents(client_token)
        return True, message, cart_data
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return False, f"Database error: {str(e)}", None
    except Exception as e:
        db.session.rollback()
        return False, f"Unexpected error: {str(e)}", None


def remove_item_from_cart(client_token, product_id):
    """
    Remove a product from the cart
    
    Args:
        client_token (str): Unique client identifier
        product_id (int): Product to remove
        
    Returns:
        tuple: (success: bool, message: str, cart_data: dict or None)
    """
    try:
        cart_item = CartItem.query.filter_by(
            client_token=client_token,
            product_id=product_id
        ).first()
        
        if not cart_item:
            return False, f"Product with ID {product_id} not found in cart", None
        
        product_name = cart_item.product.name if cart_item.product else "Product"
        db.session.delete(cart_item)
        db.session.commit()
        
        # Fetch updated cart
        cart_data = fetch_cart_contents(client_token)
        return True, f"Removed {product_name} from cart", cart_data
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return False, f"Database error: {str(e)}", None
    except Exception as e:
        db.session.rollback()
        return False, f"Unexpected error: {str(e)}", None


def clear_cart(client_token):
    """
    Remove all items from the cart for a given client
    
    Args:
        client_token (str): Unique client identifier
        
    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        deleted_count = CartItem.query.filter_by(client_token=client_token).delete()
        db.session.commit()
        
        if deleted_count == 0:
            return True, "Cart is already empty"
        
        return True, f"Cleared {deleted_count} item(s) from cart"
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return False, f"Database error: {str(e)}"
    except Exception as e:
        db.session.rollback()
        return False, f"Unexpected error: {str(e)}"


def fetch_cart_contents(client_token):
    """
    Fetch all cart items with product details and calculate total
    
    Business Logic:
    1. Query all cart items for client
    2. Join with product information
    3. Calculate subtotal for each item
    4. Calculate grand total
    
    Args:
        client_token (str): Unique client identifier
        
    Returns:
        dict: Cart data with items and total price
    """
    try:
        cart_items = CartItem.query.filter_by(client_token=client_token).all()
        
        items = []
        total_price = 0.0
        
        for item in cart_items:
            item_dict = item.to_dict()
            items.append(item_dict)
            total_price += item_dict['subtotal']
        
        return {
            'items': items,
            'total_items': len(items),
            'total_price': round(total_price, 2)
        }
        
    except SQLAlchemyError as e:
        return {
            'items': [],
            'total_items': 0,
            'total_price': 0.0,
            'error': f"Database error: {str(e)}"
        }


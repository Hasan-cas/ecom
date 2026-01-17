import uuid
from datetime import datetime

from flask import session
from sqlalchemy.exc import SQLAlchemyError

from models import db, CartItem, Product, Order, OrderItem

def get_or_create_client_token():
    """
    Get existing client token from session or create a new one.
    Ensures each user has a unique identifier for their cart.
    
    Returns:
        str: Unique client token
    """
    if 'client_token' not in session:
        session['client_token'] = str(uuid.uuid4())
    return session['client_token']

# ============================================================================
# HELPER FUNCTIONS - CART OPERATIONS
# ============================================================================

def fetch_cart_items(client_token):
    """
    Fetch all cart items for a given client token.
    
    Args:
        client_token (str): Unique client identifier
        
    Returns:
        list: List of CartItem objects with product relationships loaded
    """
    try:
        cart_items = CartItem.query.filter_by(client_token=client_token).all()
        return cart_items
    except SQLAlchemyError as e:
        app.logger.error(f"Database error in fetch_cart_items: {str(e)}")
        raise


def validate_cart_not_empty(cart_items):
    """
    Validate that the cart contains items.
    
    Args:
        cart_items (list): List of CartItem objects
        
    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    if not cart_items or len(cart_items) == 0:
        return False, "Cart is empty. Please add items before checkout."
    return True, None


def clear_cart(client_token):
    """
    Remove all items from the cart for a given client.
    Called after successful checkout.
    
    Args:
        client_token (str): Unique client identifier
        
    Returns:
        bool: Success status
    """
    try:
        CartItem.query.filter_by(client_token=client_token).delete()
        db.session.commit()
        return True
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f"Error clearing cart: {str(e)}")
        raise

# ============================================================================
# HELPER FUNCTIONS - STOCK MANAGEMENT
# ============================================================================

def validate_stock_availability(cart_items):
    """
    Validate that all products in cart have sufficient stock.
    
    Business Logic:
    1. Check each cart item against current product stock
    2. Return detailed error if any item is out of stock
    3. Ensures atomicity - all items must be available or checkout fails
    
    Args:
        cart_items (list): List of CartItem objects
        
    Returns:
        tuple: (is_valid: bool, error_message: str or None, out_of_stock_items: list)
    """
    out_of_stock_items = []
    
    for cart_item in cart_items:
        product = cart_item.product
        
        if not product:
            return False, f"Product ID {cart_item.product_id} not found", []
        
        if product.stock < cart_item.quantity:
            out_of_stock_items.append({
                'product_id': product.id,
                'product_name': product.name,
                'requested': cart_item.quantity,
                'available': product.stock
            })
    
    if out_of_stock_items:
        error_message = "Insufficient stock for the following items: " + \
                       ", ".join([f"{item['product_name']} (requested: {item['requested']}, available: {item['available']})" 
                                 for item in out_of_stock_items])
        return False, error_message, out_of_stock_items
    
    return True, None, []


def reduce_product_stock(cart_items):
    """
    Reduce product stock quantities based on cart items.
    
    Business Logic:
    1. Iterate through all cart items
    2. Deduct ordered quantity from product stock
    3. Update product records in database
    4. This operation is part of the checkout transaction
    
    Args:
        cart_items (list): List of CartItem objects
        
    Returns:
        bool: Success status
    """
    try:
        for cart_item in cart_items:
            product = cart_item.product
            product.stock -= cart_item.quantity
            product.updated_at = datetime.utcnow()
        
        db.session.commit()
        return True
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f"Error reducing stock: {str(e)}")
        raise

# ============================================================================
# HELPER FUNCTIONS - ORDER CALCULATIONS
# ============================================================================

def calculate_order_total(cart_items):
    """
    Calculate total order amount from cart items.
    Uses current product prices at time of checkout.
    
    Args:
        cart_items (list): List of CartItem objects
        
    Returns:
        float: Total order amount rounded to 2 decimal places
    """
    total = 0.0
    
    for cart_item in cart_items:
        if cart_item.product:
            subtotal = cart_item.product.price * cart_item.quantity
            total += subtotal
    
    return round(total, 2)

# ============================================================================
# HELPER FUNCTIONS - ORDER CREATION
# ============================================================================

def create_order_from_cart(customer_name, phone, address, cart_items):
    """
    Create an order and order items from cart contents.
    
    Business Logic Flow:
    1. Calculate total order amount
    2. Create Order record with customer details
    3. Create OrderItem records for each cart item
    4. Capture current product price (for historical accuracy)
    5. Link all order items to the parent order
    6. Commit transaction
    
    Args:
        customer_name (str): Customer's full name
        phone (str): Customer's phone number
        address (str): Delivery address
        cart_items (list): List of CartItem objects
        
    Returns:
        tuple: (Order object, error message or None)
    """
    try:
        # Calculate order total
        total = calculate_order_total(cart_items)
        
        # Create Order record
        new_order = Order(
            customer_name=customer_name,
            phone=phone,
            address=address,
            total=total,
            status='Pending'
        )
        
        db.session.add(new_order)
        db.session.flush()  # Get order_id before committing
        
        # Create OrderItem records for each cart item
        for cart_item in cart_items:
            order_item = OrderItem(
                order_id=new_order.order_id,
                product_id=cart_item.product_id,
                quantity=cart_item.quantity,
                price=cart_item.product.price  # Capture price at time of order
            )
            db.session.add(order_item)
        
        db.session.commit()
        return new_order, None
        
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f"Database error in create_order_from_cart: {str(e)}")
        return None, f"Database error occurred while creating order: {str(e)}"

# ============================================================================
# HELPER FUNCTIONS - ORDER MANAGEMENT
# ============================================================================

def get_all_orders():
    """
    Retrieve all orders with their items.
    Used by admin to view all customer orders.
    
    Returns:
        list: List of order dictionaries with items included
    """
    try:
        orders = Order.query.order_by(Order.created_at.desc()).all()
        return [order.to_dict(include_items=True) for order in orders]
    except SQLAlchemyError as e:
        app.logger.error(f"Database error in get_all_orders: {str(e)}")
        raise


def get_order_by_id(order_id):
    """
    Retrieve a single order by ID.
    
    Args:
        order_id (int): The ID of the order to retrieve
        
    Returns:
        Order object or None if not found
    """
    try:
        return Order.query.get(order_id)
    except SQLAlchemyError as e:
        app.logger.error(f"Database error in get_order_by_id: {str(e)}")
        raise


def update_order_status(order_id, new_status):
    """
    Update the status of an order.
    
    Business Logic:
    1. Validate order exists
    2. Validate status is one of allowed values
    3. Update order status and timestamp
    4. Commit changes
    
    Args:
        order_id (int): The ID of the order to update
        new_status (str): New status value (Pending, Shipped, Delivered)
        
    Returns:
        tuple: (Order object, error message or None)
    """
    # Valid status values
    VALID_STATUSES = ['Pending', 'Shipped', 'Delivered']
    
    # Validate status
    if new_status not in VALID_STATUSES:
        return None, f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"
    
    try:
        order = get_order_by_id(order_id)
        
        if not order:
            return None, "Order not found"
        
        # Update status
        order.status = new_status
        order.updated_at = datetime.utcnow()
        
        db.session.commit()
        return order, None
        
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f"Database error in update_order_status: {str(e)}")
        return None, f"Database error occurred while updating order status"


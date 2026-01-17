from datetime import datetime
from functools import wraps

from flask import request, jsonify
from sqlalchemy.exc import SQLAlchemyError

from models import db, Product

def get_all_products():
    """
    Retrieve all products from the database.
    Returns:
        list: List of product dictionaries
    """
    try:
        products = Product.query.all()
        return [product.to_dict() for product in products]
    except SQLAlchemyError as e:
        app.logger.error(f"Database error in get_all_products: {str(e)}")
        raise

def get_product_by_id(product_id):
    """
    Retrieve a single product by ID.
    
    product_id: The ID of the product to retrieve
    Returns:
        Product object or None if not found
    """
    try:
        return Product.query.get(product_id)
    except SQLAlchemyError as e:
        app.logger.error(f"Database error in get_product_by_id: {str(e)}")
        raise

def create_product(data):
    """
    Create a new product in the database.
    
    data: Dictionary containing product information
    Returns:
        tuple: (Product object, error message or None)
    """
    # Validate required fields
    required_fields = ['name', 'price', 'stock']
    for field in required_fields:
        if field not in data:
            return None, f"Missing required field: {field}"
    
    # Validate data types
    try:
        price = float(data['price'])
        stock = int(data['stock'])
        
        if price < 0:
            return None, "Price cannot be negative"
        if stock < 0:
            return None, "Stock cannot be negative"
    except (ValueError, TypeError):
        return None, "Invalid data type for price or stock"
    
    try:
        new_product = Product(
            name=data['name'],
            price=price,
            stock=stock,
            description=data.get('description', ''),
            image=data.get('image', '')
        )
        
        db.session.add(new_product)
        db.session.commit()
        
        return new_product, None
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f"Database error in create_product: {str(e)}")
        return None, "Database error occurred while creating product"

def update_product(product_id, data):
    """
    Update an existing product.
    
    Args:
        product_id: The ID of the product to update
        data: Dictionary containing updated product information
        
    Returns:
        tuple: (Product object, error message or None)
    """
    product = get_product_by_id(product_id)
    
    if not product:
        return None, "Product not found"
    
    try:
        # Update only provided fields
        if 'name' in data:
            product.name = data['name']
        
        if 'price' in data:
            price = float(data['price'])
            if price < 0:
                return None, "Price cannot be negative"
            product.price = price
        
        if 'stock' in data:
            stock = int(data['stock'])
            if stock < 0:
                return None, "Stock cannot be negative"
            product.stock = stock
        
        if 'description' in data:
            product.description = data['description']
        
        if 'image' in data:
            product.image = data['image']
        
        product.updated_at = datetime.utcnow()
        db.session.commit()
        
        return product, None
    except (ValueError, TypeError):
        db.session.rollback()
        return None, "Invalid data type for price or stock"
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f"Database error in update_product: {str(e)}")
        return None, "Database error occurred while updating product"

def delete_product(product_id):
    """
    Delete a product from the database.
    
    Args:
        product_id: The ID of the product to delete
        
    Returns:
        tuple: (success boolean, error message or None)
    """
    product = get_product_by_id(product_id)
    
    if not product:
        return False, "Product not found"
    
    try:
        db.session.delete(product)
        db.session.commit()
        return True, None
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f"Database error in delete_product: {str(e)}")
        return False, "Database error occurred while deleting product"

import os
import cloudinary
import cloudinary.uploader
from datetime import datetime
from functools import wraps

from flask import request, jsonify
from sqlalchemy.exc import SQLAlchemyError

from models import db, Product

# Configure using environment variables (standard practice in Zenfox)
cloudinary.config( 
  cloud_name = os.environ.get("CLOUDINARY_NAME"), 
  api_key = os.environ.get("CLOUDINARY_API_KEY"), 
  api_secret = os.environ.get("CLOUDINARY_API_SECRET"),
  secure = True
)

def extract_public_id(image_url):
    """
    Extracts 'folder/filename' from the Cloudinary URL.
    Example: https://res.cloudinary.com/demo/image/upload/v1234/ecom_products/pic.jpg 
    returns 'ecom_products/pic'
    """
    if not image_url or "cloudinary" not in image_url:
        return None
    try:
        # Splits URL and takes the part after /upload/ (dropping the version tag v1234/)
        parts = image_url.split('/')
        # Find where 'upload' is and take everything after the version 'v...'
        upload_index = parts.index('upload')
        public_id_with_ext = "/".join(parts[upload_index + 2:])
        return public_id_with_ext.rsplit('.', 1)[0]
    except (ValueError, IndexError):
        return None

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

def create_product(data, image_file):
    """
    Create a new product and upload its image to Cloudinary.
    """
    # 1. Validation Logic (Consistent with original service)
    required_fields = ['name', 'price', 'stock']
    for field in required_fields:
        if field not in data:
            return None, f"Missing required field: {field}"
    
    if not image_file or image_file.filename == '':
        return None, "Product image is required"

    try:
        # Validate data types
        price = float(data['price'])
        stock = int(data['stock'])
        
        # 2. Cloudinary Upload
        # Cloudinary's uploader can handle the Flask FileStorage object directly
        upload_result = cloudinary.uploader.upload(
            image_file,
            folder="ecom_products" # Organizes your images in Cloudinary
        )
        
        image_url = upload_result.get('secure_url')

        # 3. Database Insertion
        new_product = Product(
            name=data['name'],
            price=price,
            stock=stock,
            category=data.get('category', ''),
            description=data.get('description', ''),
            image=image_url, # Store the full HTTPS link
            created_at=datetime.utcnow()
        )
        
        db.session.add(new_product)
        db.session.commit()
        
        return new_product, None

    except (ValueError, TypeError):
        return None, "Invalid data type for price or stock"
    except Exception as e:
        db.session.rollback()
        # Log the error as seen in other service functions
        return None, f"Cloudinary/Database Error: {str(e)}"


def update_product(product_id, data, image_file=None):
    product = get_product_by_id(product_id)
    if not product:
        return None, "Product not found"
    
    try:
        # Update text fields
        if 'name' in data: product.name = data['name']
        if 'description' in data: product.description = data['description']
        
        if 'price' in data:
            product.price = float(data['price'])
        if 'stock' in data:
            product.stock = int(data['stock'])

        # Handle Image Update
        if image_file and image_file.filename != '':
            # A. Delete old image from Cloudinary
            old_public_id = extract_public_id(product.image)
            if old_public_id:
                cloudinary.uploader.destroy(old_public_id)

            # B. Upload new image
            upload_result = cloudinary.uploader.upload(image_file, folder="ecom_products")
            product.image = upload_result.get('secure_url')

        product.updated_at = datetime.utcnow()
        db.session.commit()
        return product, None

    except Exception as e:
        db.session.rollback()
        return None, f"Update failed: {str(e)}"

def delete_product(product_id):
    product = get_product_by_id(product_id)
    if not product:
        return False, "Product not found"
    
    try:
        # 1. Delete from Cloudinary first
        public_id = extract_public_id(product.image)
        if public_id:
            cloudinary.uploader.destroy(public_id)

        # 2. Delete from Database
        db.session.delete(product)
        db.session.commit()
        return True, None
        
    except Exception as e:
        db.session.rollback()
        return False, f"Deletion failed: {str(e)}"


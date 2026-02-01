import os
import json
import cloudinary
import cloudinary.uploader
from datetime import datetime
from functools import wraps

from flask import request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError

from models import db, Product

# Configure using environment variables
cloudinary.config( 
  cloud_name = os.environ.get("CLOUDINARY_NAME"), 
  api_key = os.environ.get("CLOUDINARY_API_KEY"), 
  api_secret = os.environ.get("CLOUDINARY_API_SECRET"),
  secure = True
)

def extract_public_id(image_url):
    """Extracts 'folder/filename' from the Cloudinary URL."""
    if not image_url or "cloudinary" not in image_url:
        return None
    try:
        parts = image_url.split('/')
        upload_index = parts.index('upload')
        public_id_with_ext = "/".join(parts[upload_index + 2:])
        return public_id_with_ext.rsplit('.', 1)[0]
    except (ValueError, IndexError):
        return None

def get_all_products():
    try:
        products = Product.query.all()
        return [product.to_dict() for product in products]
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error in get_all_products: {str(e)}")
        raise

def get_product_by_id(product_id):
    try:
        return Product.query.get(product_id)
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error in get_product_by_id: {str(e)}")
        raise

def create_product(data, image_file, gallery_files=None):
    """
    Standardized creation for products with support for N gallery images.
    """
    try:
        # 1. Parse Variations
        variants_json = data.get('variants')
        parsed_variants = json.loads(variants_json) if variants_json else []

        # 2. Upload Main Image
        image_url = None
        if image_file:
            upload_result = cloudinary.uploader.upload(image_file, folder="zenfox_products")
            image_url = upload_result.get('secure_url')

        # 3. Upload Gallery Images (N images support)
        gallery_urls = []
        if gallery_files:
            for file in gallery_files:
                if file.filename != '':
                    res = cloudinary.uploader.upload(file, folder="zenfox_products")
                    gallery_urls.append(res.get('secure_url'))

        # 4. Determine Price & Stock
        if parsed_variants:
            base_price = float(parsed_variants[0]['price'])
            total_stock = sum(int(v.get('stock', 0)) for v in parsed_variants)
        else:
            base_price = float(data.get('price', 0))
            total_stock = int(data.get('stock', 0))

        # 5. Create Database Entry
        new_product = Product(
            name=data.get('name'),
            category=data.get('category'),
            price=base_price,
            stock=total_stock,
            description=data.get('description'),
            image=image_url,
            gallery=gallery_urls,
            variants=parsed_variants
        )

        db.session.add(new_product)
        db.session.commit()
        
        return new_product, None

    except Exception as e:
        db.session.rollback()
        return None, f"Database Error: {str(e)}"

def update_product(product_id, data, image_file=None, gallery_files=None):
    product = get_product_by_id(product_id)
    if not product:
        return None, "Product not found"
    
    try:
        if 'name' in data: product.name = data['name']
        if 'description' in data: product.description = data['description']
        if 'price' in data: product.price = float(data['price'])
        if 'stock' in data: product.stock = int(data['stock'])

        # Handle Main Image Update
        if image_file and image_file.filename != '':
            old_public_id = extract_public_id(product.image)
            if old_public_id:
                cloudinary.uploader.destroy(old_public_id)
            upload_result = cloudinary.uploader.upload(image_file, folder="ecom_products")
            product.image = upload_result.get('secure_url')
        
        # Handle Gallery Update (Replace if new ones provided)
        if gallery_files and any(f.filename != '' for f in gallery_files):
            # Delete old gallery images
            if product.gallery:
                for url in product.gallery:
                    pid = extract_public_id(url)
                    if pid: cloudinary.uploader.destroy(pid)
            
            # Upload new ones
            new_gallery = []
            for file in gallery_files:
                if file.filename != '':
                    res = cloudinary.uploader.upload(file, folder="zenfox_products")
                    new_gallery.append(res.get('secure_url'))
            product.gallery = new_gallery

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
        # 1. Delete Main Image
        public_id = extract_public_id(product.image)
        if public_id:
            cloudinary.uploader.destroy(public_id)

        # 2. Delete Gallery Images
        if product.gallery:
            for url in product.gallery:
                gid = extract_public_id(url)
                if gid: cloudinary.uploader.destroy(gid)

        # 3. Delete from Database
        db.session.delete(product)
        db.session.commit()
        return True, None
        
    except Exception as e:
        db.session.rollback()
        return False, f"Deletion failed: {str(e)}"


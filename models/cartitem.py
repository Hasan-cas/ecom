from datetime import datetime
from . import db
from models.product import Product

class CartItem(db.Model):
    """
    CartItem model - Stores shopping cart items
    Modified to support size variants and separate card logic.
    """
    __tablename__ = 'cart_items'

    cart_id = db.Column(db.Integer, primary_key=True)
    client_token = db.Column(db.String(100), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    
    # NEW: Size field allows different variants of the same product 
    # to exist as separate rows in the database.
    size = db.Column(db.String(50), nullable=False, default="Standard")
    
    quantity = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to Product
    product = db.relationship('Product', backref='cart_items', lazy=True)

    def to_dict(self):
        """
        Returns a dictionary representation for the Cart API.
        Includes product name, price, size, and calculated subtotal.
        """
        price = self.product.price if self.product else 0
        return {
            'cart_id': self.cart_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else "Unknown Product",
            'product_price': price,
            'product_image': self.product.image if self.product else None,
            'quantity': self.quantity,
            'size': self.size,
            'subtotal': round((price * self.quantity), 2)
        }


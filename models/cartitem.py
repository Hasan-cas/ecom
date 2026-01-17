from datetime import datetime
from . import db
from models.product import Product

class CartItem(db.Model):
    """
    CartItem model - Stores shopping cart items
    Each item is associated with a session/client via client_token
    Supports multiple concurrent users with separate carts
    """
    __tablename__ = 'cart_items'
    
    cart_id = db.Column(db.Integer, primary_key=True)
    client_token = db.Column(db.String(100), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to Product
    product = db.relationship('Product', backref='cart_items', lazy=True)
    
    def to_dict(self):
        return {
            'cart_id': self.cart_id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'product_name': self.product.name if self.product else None,
            'product_price': self.product.price if self.product else None,
            'subtotal': (self.product.price * self.quantity) if self.product else 0
        }

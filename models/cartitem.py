from datetime import datetime
from . import db
from models.product import Product

class CartItem(db.Model):
    __tablename__ = 'cart_items'

    cart_id = db.Column(db.Integer, primary_key=True)
    client_token = db.Column(db.String(100), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    size = db.Column(db.String(50), nullable=False, default="Standard")
    quantity = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = db.relationship('Product', backref='cart_items', lazy=True)

    def to_dict(self):
        """
        Standardizes the output for the frontend.
        Ensures 'image' key exists for legacy frontend support and 
        'subtotal' is calculated correctly.
        """
        # Ensure price is a float for JSON serialization
        price = float(self.product.price) if self.product else 0.0
        image_path = self.product.image if self.product else None
        
        return {
            'cart_id': self.cart_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else "Unknown Product",
            'product_price': price,
            # FIX: Provide both keys to ensure cart.js always finds the image
            'product_image': image_path,
            'image': image_path, 
            'quantity': self.quantity,
            'size': self.size,
            'subtotal': round(price * self.quantity, 2)
        }


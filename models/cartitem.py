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
    # Price represents the variant price at the moment of adding to cart
    price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = db.relationship('Product', backref='cart_items', lazy=True)

    def to_dict(self):
        """
        Standardizes the output for the frontend.
        Uses the stored variant price instead of the generic product price.
        """
        price = float(self.price)
        image_path = self.product.image if self.product else None
        
        return {
            'cart_id': self.cart_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else "Unknown Product",
            'product_price': price,
            'product_image': image_path,
            'image': image_path, 
            'quantity': self.quantity,
            'size': self.size,
            'subtotal': round(price * self.quantity, 2)
        }


from . import db

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    order_item_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.order_id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False) 
    # Stores the specific variant (e.g., 'XL', 'Blue', 'Standard')
    size = db.Column(db.String(50), nullable=False, default='Standard')
    
    product = db.relationship('Product', backref='order_items', lazy=True)
    
    def to_dict(self):
        """Returns a dictionary representation for API responses"""
        return {
            'order_item_id': self.order_item_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else 'Unknown Product',
            'quantity': self.quantity,
            'price': self.price,
            'size': self.size,
            'subtotal': round(self.price * self.quantity, 2)
        }


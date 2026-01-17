from . import db
from models.product import Product

class OrderItem(db.Model):
    """
    OrderItem model - Represents individual products in an order
    
    Fields:
        order_item_id: Unique identifier for the order item
        order_id: Foreign key to parent order
        product_id: Foreign key to product
        quantity: Quantity ordered
        price: Price per unit at time of order (captures historical price)
    
    Note: We store the price at time of order to maintain accurate historical records
          even if product prices change later.
    """
    __tablename__ = 'order_items'
    
    order_item_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.order_id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)  # Price at time of order
    
    # Relationship to Product
    product = db.relationship('Product', backref='order_items', lazy=True)
    
    def to_dict(self):
        """Convert order item to dictionary for JSON serialization"""
        return {
            'order_item_id': self.order_item_id,
            'order_id': self.order_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else 'Unknown Product',
            'quantity': self.quantity,
            'price': self.price,
            'subtotal': self.price * self.quantity
        }
    
    def __repr__(self):
        return f'<OrderItem {self.order_item_id}: Product {self.product_id} x{self.quantity}>'


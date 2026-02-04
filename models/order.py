from datetime import datetime
from . import db          # Replace 'your_app' with your app module where db is defined
from models.orderitem import OrderItem

class Order(db.Model):
    """
    Order model - Represents a completed purchase
    """
    __tablename__ = 'orders'
    
    order_id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(200), nullable=False)
    transaction_id = db.Column(db.String(100), nullable=True)
    payment_number = db.Column(db.String(20), nullable=True)
    phone = db.Column(db.String(20), nullable=False)
    address = db.Column(db.String(500), nullable=False)
    total = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='Pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to OrderItems
    order_items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self, include_items=False):
        """
        Convert order to dictionary for JSON serialization
        
        Args:
            include_items: Whether to include order items details
        """
        order_dict = {
            'order_id': self.order_id,
            'customer_name': self.customer_name,
            'payment_number': self.payment_number,
            'transaction_id': self.transaction_id,
            'phone': self.phone,
            'address': self.address,
            'total': self.total,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_items:
            order_dict['items'] = [item.to_dict() for item in self.order_items]
            order_dict['item_count'] = len(self.order_items)
        
        return order_dict
    
    def __repr__(self):
        return f'<Order {self.order_id}: {self.customer_name} - ${self.total}>'



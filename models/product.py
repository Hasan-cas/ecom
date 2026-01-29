from datetime import datetime
from . import db

class Product(db.Model):
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    # Added category column to store strings like 'attar-oud' or 'hat-cotton'
    category = db.Column(db.String(100), nullable=True) 
    price = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)
    variants = db.Column(db.JSON, nullable=True) 
    description = db.Column(db.Text, nullable=True)
    image = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert product object to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category, # Included in dictionary for API responses
            'price': self.price,
            'stock': self.stock,
            'variants': self.variants,
            'description': self.description,
            'image': self.image,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Product {self.id}: {self.name}>'

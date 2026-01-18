# app.py
from flask import Flask, render_template
from dotenv import load_dotenv
import os

# use db from your models package
from models import db
from wall import setup_security

# Load env
load_dotenv()

# Initialize Flask
app = setup_security()
#app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///selly.db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'super-secret-key')

# ---------- Blueprints ----------
from routes.admin_route import admin_bp
from routes.product_route import product_bp
from routes.cart_route import cart_bp
from routes.order_route import order_bp

app.register_blueprint(admin_bp)
app.register_blueprint(product_bp)
app.register_blueprint(cart_bp)
app.register_blueprint(order_bp)

# ---------- Routes ----------
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/products")
def products():
    return render_template("products.html")

@app.route("/product")
def product():
    return render_template("product.html")


@app.route("/cart")
def cart():
    return render_template("cart.html")

@app.route("/checkout")
def checkout():
    return render_template("checkout.html")

@app.route("/admin-form")
def admin_form():
    return render_template("admin_form.html")

@app.route("/admin-panel")
def admin_panel():
    return render_template("admin_panel.html")

# ---------- Main ----------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)

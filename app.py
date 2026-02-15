# app.py
from flask import Flask, render_template, Response
from dotenv import load_dotenv
import os

# use db from your models package
from models import db, Product
from wall import setup_security

# Load env
load_dotenv()

# Initialize Flask
app = setup_security()
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv('DATABASE_URI')
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

@app.route("/test1")
def test1():
    return render_template("test_1.html")

@app.route("/test2")
def test2():
    return render_template("test_2.html")

@app.route("/test3")
def test3():
    return render_template("test_3.html")

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

@app.route('/sitemap.xml')
def sitemap():
    """Dynamically generate sitemap.xml"""
    pages = []
    
    # 1. Add your static main pages
    # You can manually list the URLs you want indexed
    main_urls = [
        "/",
        "/products",
        "/cart",
        "/checkout"
    ]
    
    for url in main_urls:
        pages.append({"loc": f"https://markazussunnahbd.com{url}", "priority": "1.0"})

    # 2. Add dynamic Product pages from your database
    # Assuming you have a Product model in your models.py
    try:
        products = Product.query.all()
        for p in products:
            # Adjust '/product/' to match your actual product URL structure
            pages.append({"loc": f"https://markazussunnahbd.com/product/{p.id}", "priority": "0.8"})
    except Exception as e:
        app.logger.error(f"Sitemap generation error: {e}")

    # Build the XML structure
    xml = '<?xml version="1.0" encoding="UTF-8"?>'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    for page in pages:
        xml += f'<url>'
        xml += f'<loc>{page["loc"]}</loc>'
        xml += f'<priority>{page["priority"]}</priority>'
        xml += f'</url>'
    xml += '</urlset>'

    return Response(xml, mimetype='application/xml')


with app.app_context():
        db.create_all()

# ---------- Main ----------
if __name__ == "__main__":
    app.run(debug=True, port=5000)
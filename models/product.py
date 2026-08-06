"""
Athena — models.py (v2)

Fresh file, written to your spec — this is not a patch on the old
attar-site models.py (which was never uploaded), it's the schema for
the confirmed design:

  - collection alone decides which extra fields a product shows in
    the admin form (size is universal; gypsum adds color; jar_candle
    adds burn_rate/scent_throw_size/color/wick_type/scent; a
    collection tagged as both gets the union)
  - variant_mode is ONE switch per product: "unified" (one shared
    price/stock for every combination) or "per_variant" (each
    size/color/scent combination has its own price + stock)
  - axis_images lets ONE image swap in per axis choice (clicking
    Yellow shows the yellow photo, clicking 200ml then shows the
    large-size photo instead — overriding, not combining — while
    all three current choices stay visually selected/highlighted on
    the frontend, which is a UI concern, not a data concern)
  - CartItem and OrderItem use a JSON selected_variants field, NOT a
    flat `size` column. This is a deliberate, confirmed departure
    from the old order_service.py's assumption (flat `size` column) —
    a flat column cannot hold "size AND scent AND color" chosen
    together on one cart line, which the jar_candle collection
    requires. order_service.py's stock-check/reduction functions will
    need matching surgical edits to read this field instead of
    item.size (tracked separately, not in this file).
"""

from datetime import datetime
from . import db
# ============================================================
# COLLECTION -> EXTRA FIELD SETS
# ============================================================
# "Collection alone decides the extra fields" — confirmed. size is
# universal (every collection gets it). Additional field-sets stack:
# a collection whose name/tag matches more than one key below gets
# the UNION of those sets, e.g. a "gypsum_candle" collection gets
# color (from gypsum) AND burn_rate/scent_throw_size/wick_type/scent
# (from jar_candle) AND size (universal).
#
# Kept as a plain constant, not a DB table, matching the same
# not-yet-admin-editable decision already made for product types
# earlier in this build. Promote to a table later if you want
# collections/field-sets defined through the UI instead of code.
UNIVERSAL_EXTRA_FIELDS = ["size"]

COLLECTION_EXTRA_FIELDS = {
    "gypsum": ["color"],
    "jar_candle": ["burn_rate", "scent_throw_size", "color", "wick_type", "scent"],
}


def get_extra_fields_for_collection(collection_tags):
    """
    collection_tags: list of strings, e.g. ["gypsum", "jar_candle"] for
    a "gypsum candle" product that needs both field-sets, or just
    ["gypsum"] for a plain coastal-shell product.
    Returns the deduplicated union of every matching field-set, plus
    the universal fields, in a stable order.
    """
    fields = list(UNIVERSAL_EXTRA_FIELDS)
    for tag in collection_tags or []:
        for field in COLLECTION_EXTRA_FIELDS.get(tag, []):
            if field not in fields:
                fields.append(field)
    return fields

class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)

    # ---- PERMANENT FIELDS (every product has these) ----
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image = db.Column(db.String(500), nullable=True)            # main thumbnail
    gallery = db.Column(db.JSON, nullable=True, default=list)    # list[str], detail-page images

    # collection_tags drives which extra fields apply (see
    # get_extra_fields_for_collection above). A product usually has
    # one tag (["jar_candle"]) but can have more for a hybrid product
    # (["gypsum", "jar_candle"]) to get the union of both field-sets.
    collection_tags = db.Column(db.JSON, nullable=False, default=list)

    # Kept as a separate human-readable label too (e.g. "Coastal Line")
    # since collection_tags is the machine-readable field-set key, and
    # a display name doesn't have to match it 1:1.
    collection_label = db.Column(db.String(120), nullable=True)

    # ---- BASE PRICE / STOCK ----
    # Meaning depends on variant_mode:
    #   "unified"     -> these ARE the price/stock for every combination
    #   "per_variant" -> these are fallback/display-only; the real
    #                    numbers live per-combination in variants.combinations
    price = db.Column(db.Float, nullable=False, default=0.0)
    stock = db.Column(db.Integer, nullable=False, default=0)

    variant_mode = db.Column(db.String(20), nullable=False, default="unified")  # "unified" | "per_variant"

    # ---- VARIANTS — one JSON blob, shape below ----
    # {
    #   "axes": {
    #     "size":  ["100ml", "200ml", "300ml"],
    #     "color": ["Red", "Yellow", "Green"],
    #     "scent": ["Lavender", "Rose", "Unscented"]
    #   },
    #   "combinations": [
    #     {"size": "100ml", "color": "Red", "scent": "Lavender", "price": 34, "stock": 12},
    #     {"size": "200ml", "color": "Red", "scent": "Lavender", "price": 48, "stock": 5}
    #   ],
    #   "axis_images": {
    #     "color": {"Red": "https://.../red.jpg", "Yellow": "https://.../yellow.jpg"},
    #     "size":  {"200ml": "https://.../large.jpg"}
    #   }
    # }
    #
    # In "unified" mode, combinations may be empty or hold a single
    # row with no price/stock (both come from the product's own
    # price/stock fields instead) — axis_images still applies; a
    # unified-price product can still swap photos on click, confirmed.
    variants = db.Column(db.JSON, nullable=True, default=dict)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order_items = db.relationship("OrderItem", back_populates="product")
    cart_items = db.relationship("CartItem", back_populates="product")

    def allowed_extra_fields(self):
        return get_extra_fields_for_collection(self.collection_tags)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "image": self.image,
            "gallery": self.gallery or [],
            "collection_tags": self.collection_tags or [],
            "collection_label": self.collection_label,
            "price": self.price,
            "stock": self.stock,
            "variant_mode": self.variant_mode,
            "variants": self.variants or {},
            "allowed_extra_fields": self.allowed_extra_fields(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
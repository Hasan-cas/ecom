"""
Athena — models.py (v2)

Fresh file, written to your spec — this is not a patch on the old
attar-site models.py (which was never uploaded), it's the schema for
the confirmed design:

  - collection alone decides which extra fields a product shows in
    the admin form (no shared fields anymore — gypsum owns
    gypsum_size/gypsum_color, jar_candle owns wax_size/wax_color plus
    burn_rate/scent_throw_size/wick_type/scent, raw_materials owns a
    plain size; a product tagged with more than one collection gets
    the union of those collections' fields)
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
# "Collection alone decides the extra fields" — confirmed. Each
# collection now owns its own field names (no shared "universal"
# fields anymore — size is prefixed per-collection to avoid admin/
# customer confusion when gypsum + jar_candle are combined on one
# product, e.g. "gypsum_size" vs "wax_size" both showing at once).
# A collection whose name/tag matches more than one key below gets
# the UNION of those sets, e.g. ["gypsum", "jar_candle"] together
# gets gypsum_size + gypsum_color + wax_size + wax_color + the rest
# of jar_candle's fields.
#
# raw_materials is mutually exclusive with gypsum/jar_candle by
# confirmed product decision — enforced client-side only for now
# (dashboard.js unchecks the others when raw_materials is checked).
# Not re-validated here; a direct API call could still combine them.
#
# Kept as a plain constant, not a DB table, matching the same
# not-yet-admin-editable decision already made for product types
# earlier in this build. Promote to a table later if you want
# collections/field-sets defined through the UI instead of code.
COLLECTION_EXTRA_FIELDS = {
    "gypsum": ["gypsum_size", "gypsum_color"],
    "jar_candle": ["wax_size", "wax_color", "scent_throw_size", "scent", "burn_rate", "wick_type"],
    "raw_materials": ["size"],
}


def get_extra_fields_for_collection(collection_tags):
    """
    collection_tags: list of strings, e.g. ["gypsum", "jar_candle"] for
    a hybrid product that needs both field-sets (gypsum_size/gypsum_color
    AND wax_size/wax_color AND jar_candle's other fields), or just
    ["raw_materials"] for a plain-size product.
    Returns the deduplicated union of every matching field-set, in a
    stable order. No universal fields are added anymore — every field
    a product shows comes from one of its collection tags.
    """
    fields = []
    for tag in collection_tags or []:
        for field in COLLECTION_EXTRA_FIELDS.get(tag, []):
            if field not in fields:
                fields.append(field)
    return fields

class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)

    # SURGICAL ADD: URL identifier, e.g. "low-tide". Required by the
    # storefront — items.js skips rendering any product with no slug
    # (dead /candle/ link otherwise), so this must be unique and always
    # set on create. See create_slug() + the uniqueness loop in
    # product_service.create_product().
    slug = db.Column(db.String(220), unique=True, nullable=False, index=True)

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
    #     "wax_size":  ["100ml", "200ml", "300ml"],
    #     "wax_color": ["Red", "Yellow", "Green"],
    #     "scent": ["Lavender", "Rose", "Unscented"]
    #   },
    #   "combinations": [
    #     {"wax_size": "100ml", "wax_color": "Red", "scent": "Lavender", "price": 34, "stock": 12},
    #     {"wax_size": "200ml", "wax_color": "Red", "scent": "Lavender", "price": 48, "stock": 5}
    #   ],
    #   "axis_images": {
    #     "wax_color": {"Red": "https://.../red.jpg", "Yellow": "https://.../yellow.jpg"},
    #     "wax_size":  {"200ml": "https://.../large.jpg"}
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
            "slug": self.slug,
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


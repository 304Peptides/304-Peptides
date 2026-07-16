function ProductCard({
  product,
  isLoggedIn,
  onViewDetails,
  onAddToCart,
}) {
  const availability =
    product.availability || {
      key: "in_stock",
      label: "In Stock",
      purchasable: true,
    };

  const lowStock =
    availability.key === "in_stock" &&
    product.trackQuantity === true &&
    Number(product.quantity || 0) <=
      Number(product.lowStockThreshold || 0);

  const availabilityLabel = lowStock
    ? `Only ${Number(product.quantity || 0)} Left`
    : availability.key === "preorder"
    ? "Preorder — Ships After Restock"
    : availability.key === "out_of_stock"
    ? "Out of Stock"
    : "In Stock — Ready to Ship";

  return (
    <div className="product-card" style={cardStyle}>

      <div style={topBadgeRowStyle}>
        <div style={testedBadgeStyle}>
          ✓ Third-Party Tested
        </div>

        {product.isBestSeller && (
          <div style={bestSellerBadgeStyle}>
            Best Seller
          </div>
        )}
      </div>

      <div
        style={{
          ...availabilityBadgeStyle,
          ...(availability.key === "preorder" || lowStock
            ? availabilityWarningStyle
            : availability.key === "out_of_stock"
            ? availabilityDangerStyle
            : availabilitySuccessStyle),
        }}
      >
        {availabilityLabel}
      </div>

      <div className="bottle">
        <div className="bottle-cap"></div>

        <div className="bottle-body">
          <div className="bottle-label">
            <div className="label-logo">304</div>
            <div className="label-name">{product.codeName}</div>
            <div className="label-strength">{product.strength}</div>
            <div className="label-purity">{product.purity}</div>
            <div className="label-research">For Research Use Only</div>
            <div className="qr-box">QR</div>
          </div>
        </div>
      </div>

      <div style={contentStyle}>
        <p className="eyebrow" style={{ marginBottom: "10px" }}>
          {product.category}
        </p>

        <h3 style={productTitleStyle}>
          {product.name}
        </h3>

        <p style={codeStyle}>
          {product.codeName} · {product.strength}
        </p>

        <p style={descriptionStyle}>
          {product.description}
        </p>

        <div style={statusGridStyle}>
          <div style={statusBadgeStyle}>
            {product.purity}
          </div>

          <div style={statusBadgeStyle}>
            {product.coaStatus}
          </div>

          <div style={statusBadgeStyle}>
            {product.batchStatus}
          </div>

          <div style={statusBadgeStyle}>
            {product.qrStatus}
          </div>
        </div>

        <div style={researchUseBoxStyle}>
          For Research Use Only
        </div>

        {isLoggedIn ? (
          <div style={pricingBoxStyle}>
            <p style={unlockedStyle}>
              Pricing Unlocked
            </p>

            <p style={priceStyle}>
              ${product.price}
            </p>

            <p style={mutedTextStyle}>
              Prototype pricing shown for layout only.
            </p>
          </div>
        ) : (
          <div style={pricingBoxStyle}>
            <p style={lockedStyle}>
              Pricing Locked
            </p>

            <p style={mutedTextStyle}>
              Login or create an account to view pricing.
            </p>
          </div>
        )}

        <div style={buttonStackStyle}>
          <button
            className="primary-btn"
            onClick={onViewDetails}
            style={{ width: "100%" }}
          >
            View Details
          </button>

          {isLoggedIn && (
            <button
              className="secondary-btn"
              onClick={onAddToCart}
              style={{ width: "100%" }}
              disabled={!availability.purchasable}
            >
              {availability.purchasable
                ? availability.key === "preorder"
                  ? "Add Preorder to Cart"
                  : "Add to Cart"
                : "Currently Unavailable"}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

const cardStyle = {
  position: "relative",
};

const topBadgeRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "22px",
};

const testedBadgeStyle = {
  padding: "8px 11px",
  borderRadius: "999px",
  background: "rgba(61, 165, 255, 0.14)",
  border: "1px solid rgba(61, 165, 255, 0.35)",
  color: "#9ed8ff",
  fontSize: "11px",
  fontWeight: "900",
};

const bestSellerBadgeStyle = {
  padding: "8px 11px",
  borderRadius: "999px",
  background: "rgba(255, 255, 255, 0.075)",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "900",
};

const availabilityBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: "13px",
  fontSize: "12px",
  fontWeight: "900",
  textAlign: "center",
  marginBottom: "16px",
};

const availabilitySuccessStyle = {
  color: "#b7f5d1",
  background: "rgba(80,211,145,.12)",
  border: "1px solid rgba(80,211,145,.3)",
};

const availabilityWarningStyle = {
  color: "#ffe0a3",
  background: "rgba(255,183,77,.12)",
  border: "1px solid rgba(255,183,77,.32)",
};

const availabilityDangerStyle = {
  color: "#ffb4b4",
  background: "rgba(255,83,83,.11)",
  border: "1px solid rgba(255,83,83,.3)",
};

const contentStyle = {
  marginTop: "18px",
};

const productTitleStyle = {
  fontSize: "26px",
  marginBottom: "8px",
};

const codeStyle = {
  color: "#9ed8ff",
  fontSize: "16px",
  fontWeight: "900",
  marginBottom: "14px",
};

const descriptionStyle = {
  color: "#aaa",
  fontSize: "14px",
  lineHeight: "1.7",
  marginBottom: "16px",
};

const statusGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "14px",
};

const statusBadgeStyle = {
  padding: "10px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  color: "#c8c8c8",
  fontSize: "12px",
  fontWeight: "900",
  textAlign: "center",
};

const researchUseBoxStyle = {
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "14px",
  padding: "12px",
  textAlign: "center",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
  marginBottom: "14px",
};

const pricingBoxStyle = {
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "16px",
};

const unlockedStyle = {
  color: "#9ed8ff",
  fontWeight: "900",
  marginBottom: "6px",
};

const lockedStyle = {
  color: "#9ed8ff",
  fontWeight: "900",
  marginBottom: "6px",
};

const priceStyle = {
  color: "white",
  fontSize: "30px",
  fontWeight: "900",
  marginBottom: "6px",
};

const mutedTextStyle = {
  color: "#aaa",
  fontSize: "13px",
  lineHeight: "1.6",
};

const buttonStackStyle = {
  display: "grid",
  gap: "12px",
};

export default ProductCard;
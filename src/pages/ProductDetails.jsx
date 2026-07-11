import { useEffect, useMemo, useState } from "react";

const storageKey = "304-site-settings";

const defaultSettings = {
  storeStatus: "coming-soon",
  catalogEnabled: true,
  guestPricingEnabled: false,
};

function loadSettings() {
  try {
    const savedSettings = window.localStorage.getItem(storageKey);

    if (!savedSettings) {
      return defaultSettings;
    }

    return {
      ...defaultSettings,
      ...JSON.parse(savedSettings),
    };
  } catch {
    return defaultSettings;
  }
}

function ProductDetails({
  product,
  isLoggedIn,
  onAddToCart,
  onNavigate,
}) {
  const [settings, setSettings] = useState(loadSettings);
  const [selectedStrength, setSelectedStrength] = useState("");

  useEffect(() => {
    function updateSettings(event) {
      if (event.detail) {
        setSettings((currentSettings) => ({
          ...currentSettings,
          ...event.detail,
        }));

        return;
      }

      setSettings(loadSettings());
    }

    function handleStorageChange(event) {
      if (event.key === storageKey) {
        setSettings(loadSettings());
      }
    }

    window.addEventListener(
      "304-site-settings-updated",
      updateSettings
    );

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "304-site-settings-updated",
        updateSettings
      );

      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  useEffect(() => {
    if (!product) {
      setSelectedStrength("");
      return;
    }

    if (product.variants?.length > 0) {
      const matchingVariant = product.variants.find(
        (variant) => variant.strength === product.strength
      );

      setSelectedStrength(
        matchingVariant?.strength ||
          product.variants[0].strength
      );
    } else {
      setSelectedStrength(product.strength || "");
    }
  }, [product]);

  const resolvedProduct = useMemo(() => {
    if (!product) {
      return null;
    }

    if (!product.variants?.length) {
      return product;
    }

    const selectedVariant =
      product.variants.find(
        (variant) =>
          variant.strength === selectedStrength
      ) || product.variants[0];

    return {
      ...product,
      ...selectedVariant,
      name: product.baseName || product.name,
      baseName: product.baseName || product.name,
      variants: product.variants,
    };
  }, [product, selectedStrength]);

  if (!settings.catalogEnabled) {
    return (
      <main style={{ padding: "90px 60px" }}>
        <section style={emptyPanelStyle}>
          <p className="eyebrow">PRODUCT CATALOG</p>

          <h1 style={titleStyle}>
            Catalog Temporarily Unavailable
          </h1>

          <p style={textStyle}>
            The research product catalog is currently unavailable.
            Please check back later.
          </p>

          <div style={unavailableNoticeStyle}>
            For Research Use Only. Not intended for human
            consumption.
          </div>

          <button
            className="primary-btn"
            style={{ marginTop: "24px" }}
            onClick={() => onNavigate("home")}
          >
            Return Home
          </button>
        </section>
      </main>
    );
  }

  if (!resolvedProduct) {
    return (
      <main style={{ padding: "90px 60px" }}>
        <section style={emptyPanelStyle}>
          <p className="eyebrow">PRODUCT NOT SELECTED</p>

          <h1 style={titleStyle}>Choose A Product</h1>

          <p style={textStyle}>
            Return to the catalog and select a product to view
            its details.
          </p>

          <button
            className="primary-btn"
            style={{ marginTop: "24px" }}
            onClick={() => onNavigate("products")}
          >
            Browse Products
          </button>
        </section>
      </main>
    );
  }

  const displayName =
    resolvedProduct.baseName || resolvedProduct.name;

  const hasPrice = Number.isFinite(
    resolvedProduct.price
  );

  const canViewPrice =
    isLoggedIn || settings.guestPricingEnabled;

  const purchasingEnabled =
    settings.storeStatus === "open";

  const canPurchase =
    hasPrice && purchasingEnabled && isLoggedIn;

  const storeStatusLabel =
    settings.storeStatus === "open"
      ? "Store Open"
      : settings.storeStatus === "maintenance"
      ? "Maintenance Mode"
      : "Coming Soon";

  function handleAddToCart() {
    if (!canPurchase) {
      return;
    }

    onAddToCart({
      ...resolvedProduct,
      name: `${displayName} ${resolvedProduct.strength}`,
    });
  }

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1250px", margin: "0 auto" }}>
        <button
          className="secondary-btn"
          style={{ marginBottom: "24px" }}
          onClick={() => onNavigate("products")}
        >
          ← Back To Products
        </button>

        <div style={productLayoutStyle}>
          <div style={imagePanelStyle}>
            <div style={badgeRowStyle}>
              <span style={categoryBadgeStyle}>
                {resolvedProduct.category}
              </span>

              {resolvedProduct.isBestSeller && (
                <span style={bestSellerBadgeStyle}>
                  Best Seller
                </span>
              )}
            </div>

            {resolvedProduct.image ? (
              <div style={realImageWrapStyle}>
                <img
                  src={resolvedProduct.image}
                  alt={`${displayName} ${resolvedProduct.strength} research product`}
                  style={realImageStyle}
                />

                <div style={imageGlowStyle}></div>
              </div>
            ) : (
              <div style={placeholderWrapStyle}>
                <div style={bottleCapStyle}></div>

                <div style={bottleStyle}>
                  <div style={labelStyle}>
                    <strong style={labelBrandStyle}>
                      304
                    </strong>

                    <span style={labelCodeStyle}>
                      {resolvedProduct.codeName}
                    </span>

                    <small style={labelStrengthStyle}>
                      {resolvedProduct.strength}
                    </small>

                    <small style={labelNoticeStyle}>
                      Research Use Only
                    </small>
                  </div>
                </div>
              </div>
            )}

            <div style={imageNoticeStyle}>
              Product image shown for catalog presentation.
            </div>
          </div>

          <div style={detailsPanelStyle}>
            <div style={headingStatusRowStyle}>
              <p className="eyebrow">
                304 PEPTIDES PRODUCT
              </p>

              <span
                style={
                  purchasingEnabled
                    ? openStatusStyle
                    : closedStatusStyle
                }
              >
                {storeStatusLabel}
              </span>
            </div>

            <h1 style={titleStyle}>{displayName}</h1>

            <p style={codeStyle}>
              {resolvedProduct.codeName} ·{" "}
              {resolvedProduct.strength}
            </p>

            {resolvedProduct.variants?.length > 0 && (
              <div style={variantPanelStyle}>
                <span style={variantLabelStyle}>
                  Choose Strength
                </span>

                <div style={variantButtonRowStyle}>
                  {resolvedProduct.variants.map(
                    (variant) => {
                      const isSelected =
                        variant.strength ===
                        resolvedProduct.strength;

                      return (
                        <button
                          key={variant.codeName}
                          type="button"
                          style={
                            isSelected
                              ? selectedVariantButtonStyle
                              : variantButtonStyle
                          }
                          onClick={() =>
                            setSelectedStrength(
                              variant.strength
                            )
                          }
                        >
                          {variant.strength}
                        </button>
                      );
                    }
                  )}
                </div>

                {resolvedProduct.composition && (
                  <div style={compositionStyle}>
                    <span>Composition</span>

                    <strong>
                      {resolvedProduct.composition}
                    </strong>
                  </div>
                )}
              </div>
            )}

            <p style={descriptionStyle}>
              {resolvedProduct.description}
            </p>

            <div style={researchNoticeStyle}>
              For Research Use Only. Not intended for human
              consumption.
            </div>

            {!purchasingEnabled && (
              <div style={storeNoticeStyle}>
                Product information remains available, but
                purchasing is currently disabled while the store
                status is <strong>{storeStatusLabel}</strong>.
              </div>
            )}

            <div style={informationGridStyle}>
              <div style={informationBoxStyle}>
                <span>Strength</span>
                <strong>{resolvedProduct.strength}</strong>
              </div>

              <div style={informationBoxStyle}>
                <span>Purity</span>
                <strong>{resolvedProduct.purity}</strong>
              </div>

              <div style={informationBoxStyle}>
                <span>Product Code</span>
                <strong>{resolvedProduct.codeName}</strong>
              </div>

              <div style={informationBoxStyle}>
                <span>Category</span>
                <strong>{resolvedProduct.category}</strong>
              </div>
            </div>

            <div style={verificationPanelStyle}>
              <p className="eyebrow">
                VERIFICATION STATUS
              </p>

              <div style={verificationGridStyle}>
                <div style={verificationBoxStyle}>
                  <span>Certificate Of Analysis</span>

                  <strong>
                    {resolvedProduct.coaStatus}
                  </strong>
                </div>

                <div style={verificationBoxStyle}>
                  <span>Batch Tracking</span>

                  <strong>
                    {resolvedProduct.batchStatus}
                  </strong>
                </div>

                <div style={verificationBoxStyle}>
                  <span>QR Verification</span>

                  <strong>
                    {resolvedProduct.qrStatus}
                  </strong>
                </div>
              </div>
            </div>

            <div style={purchasePanelStyle}>
              {!hasPrice ? (
                <>
                  <div>
                    <span style={priceLabelStyle}>
                      Pricing Status
                    </span>

                    <strong style={lockedStyle}>
                      Price Coming Soon
                    </strong>
                  </div>

                  <button
                    type="button"
                    style={disabledButtonStyle}
                    disabled
                  >
                    Price Coming Soon
                  </button>
                </>
              ) : !canViewPrice ? (
                <>
                  <div>
                    <span style={priceLabelStyle}>
                      Pricing Locked
                    </span>

                    <strong style={lockedStyle}>
                      Login To View
                    </strong>
                  </div>

                  <button
                    className="primary-btn"
                    onClick={() => onNavigate("login")}
                  >
                    Login To View Pricing
                  </button>
                </>
              ) : !purchasingEnabled ? (
                <>
                  <div>
                    <span style={priceLabelStyle}>
                      Price
                    </span>

                    <strong style={priceStyle}>
                      ${resolvedProduct.price.toFixed(2)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    style={disabledButtonStyle}
                    disabled
                  >
                    Purchasing Unavailable
                  </button>
                </>
              ) : canPurchase ? (
                <>
                  <div>
                    <span style={priceLabelStyle}>
                      Price
                    </span>

                    <strong style={priceStyle}>
                      ${resolvedProduct.price.toFixed(2)}
                    </strong>
                  </div>

                  <button
                    className="primary-btn"
                    onClick={handleAddToCart}
                  >
                    Add {resolvedProduct.strength} To Cart
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <span style={priceLabelStyle}>
                      Price
                    </span>

                    <strong style={priceStyle}>
                      ${resolvedProduct.price.toFixed(2)}
                    </strong>
                  </div>

                  <button
                    className="primary-btn"
                    onClick={() => onNavigate("login")}
                  >
                    Login To Purchase
                  </button>
                </>
              )}
            </div>

            <button
              className="secondary-btn"
              style={{
                width: "100%",
                marginTop: "14px",
              }}
              onClick={() =>
                onNavigate("researchAgreement")
              }
            >
              View Research Agreement
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

const productLayoutStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(340px, 0.9fr) minmax(0, 1.1fr)",
  gap: "30px",
  alignItems: "start",
};

const imagePanelStyle = {
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.18), transparent 48%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "28px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const badgeRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const categoryBadgeStyle = {
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "999px",
  padding: "9px 14px",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const bestSellerBadgeStyle = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#ffffff",
  borderRadius: "999px",
  padding: "9px 14px",
  fontSize: "12px",
  fontWeight: "900",
};

const realImageWrapStyle = {
  width: "100%",
  minHeight: "560px",
  borderRadius: "24px",
  overflow: "hidden",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "radial-gradient(circle at center, rgba(61,165,255,0.18), rgba(0,0,0,0.78) 72%)",
  border: "1px solid rgba(61,165,255,0.18)",
};

const realImageStyle = {
  width: "100%",
  height: "100%",
  minHeight: "560px",
  objectFit: "cover",
  objectPosition: "center",
  display: "block",
  position: "relative",
  zIndex: 1,
};

const imageGlowStyle = {
  position: "absolute",
  left: "20%",
  right: "20%",
  bottom: "12px",
  height: "45px",
  borderRadius: "50%",
  background: "rgba(61,165,255,0.25)",
  filter: "blur(22px)",
};

const imageNoticeStyle = {
  textAlign: "center",
  color: "#858f99",
  fontSize: "12px",
  marginTop: "16px",
};

const placeholderWrapStyle = {
  minHeight: "560px",
  display: "grid",
  alignContent: "center",
  justifyContent: "center",
  borderRadius: "24px",
  background:
    "radial-gradient(circle at center, rgba(61,165,255,0.18), rgba(0,0,0,0.78) 72%)",
  border: "1px solid rgba(61,165,255,0.18)",
};

const bottleCapStyle = {
  width: "95px",
  height: "39px",
  margin: "0 auto",
  borderRadius: "14px 14px 5px 5px",
  background:
    "linear-gradient(180deg, #e1e1e1, #777)",
  boxShadow: "0 0 22px rgba(61,165,255,0.16)",
};

const bottleStyle = {
  width: "220px",
  height: "320px",
  borderRadius: "42px 42px 52px 52px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.3))",
  border: "1px solid rgba(255,255,255,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 28px 70px rgba(0,0,0,0.5)",
};

const labelStyle = {
  width: "170px",
  minHeight: "180px",
  borderRadius: "20px",
  background: "linear-gradient(180deg, #050505, #171717)",
  border: "1px solid rgba(61,165,255,0.4)",
  color: "#ffffff",
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  gap: "12px",
  padding: "18px",
  textAlign: "center",
};

const labelBrandStyle = {
  fontSize: "48px",
  lineHeight: "1",
};

const labelCodeStyle = {
  color: "#9ed8ff",
  fontSize: "18px",
  fontWeight: "900",
};

const labelStrengthStyle = {
  fontSize: "22px",
  fontWeight: "900",
};

const labelNoticeStyle = {
  color: "#9ed8ff",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const detailsPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.14), transparent 36%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const headingStatusRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
};

const openStatusStyle = {
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid rgba(61,165,255,0.4)",
  background: "rgba(61,165,255,0.17)",
  color: "#9ed8ff",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const closedStatusStyle = {
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#c8c8c8",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const titleStyle = {
  fontSize: "58px",
  lineHeight: "1.04",
  marginBottom: "12px",
  background:
    "linear-gradient(180deg, #ffffff, #999999)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const codeStyle = {
  color: "#9ed8ff",
  fontSize: "18px",
  fontWeight: "900",
  marginBottom: "24px",
};

const variantPanelStyle = {
  marginBottom: "24px",
  padding: "18px",
  borderRadius: "18px",
  background: "rgba(0,0,0,0.24)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const variantLabelStyle = {
  display: "block",
  color: "#c8c8c8",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
  marginBottom: "12px",
};

const variantButtonRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const variantButtonStyle = {
  padding: "12px 16px",
  borderRadius: "13px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.045)",
  color: "#d4d4d4",
  fontWeight: "900",
  cursor: "pointer",
};

const selectedVariantButtonStyle = {
  padding: "12px 16px",
  borderRadius: "13px",
  border: "1px solid rgba(61,165,255,0.62)",
  background: "rgba(61,165,255,0.22)",
  color: "#ffffff",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 0 20px rgba(61,165,255,0.18)",
};

const compositionStyle = {
  display: "grid",
  gap: "6px",
  marginTop: "16px",
  paddingTop: "16px",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  color: "#c8c8c8",
};

const descriptionStyle = {
  color: "#c8c8c8",
  fontSize: "17px",
  lineHeight: "1.85",
};

const researchNoticeStyle = {
  marginTop: "24px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "18px",
  padding: "16px",
  fontWeight: "900",
  lineHeight: "1.5",
};

const storeNoticeStyle = {
  marginTop: "14px",
  padding: "15px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.24)",
  color: "#aeb7bf",
  lineHeight: "1.65",
};

const informationGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginTop: "24px",
};

const informationBoxStyle = {
  display: "grid",
  gap: "6px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "16px",
  padding: "16px",
  color: "#c8c8c8",
};

const verificationPanelStyle = {
  marginTop: "24px",
  background: "rgba(0,0,0,0.24)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  padding: "20px",
};

const verificationGridStyle = {
  display: "grid",
  gap: "10px",
  marginTop: "12px",
};

const verificationBoxStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "14px",
  padding: "14px",
  color: "#c8c8c8",
};

const purchasePanelStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  marginTop: "24px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  borderRadius: "20px",
  padding: "22px",
};

const priceLabelStyle = {
  display: "block",
  color: "#9ed8ff",
  fontWeight: "800",
  marginBottom: "5px",
};

const priceStyle = {
  display: "block",
  color: "#ffffff",
  fontSize: "34px",
};

const lockedStyle = {
  display: "block",
  color: "#ffffff",
  fontSize: "22px",
};

const disabledButtonStyle = {
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "14px",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.045)",
  color: "#858f99",
  fontWeight: "900",
  cursor: "not-allowed",
};

const unavailableNoticeStyle = {
  display: "inline-flex",
  marginTop: "24px",
  padding: "13px 18px",
  borderRadius: "999px",
  border: "1px solid rgba(61,165,255,0.25)",
  background: "rgba(61,165,255,0.1)",
  color: "#9ed8ff",
  fontWeight: "900",
};

const emptyPanelStyle = {
  maxWidth: "850px",
  margin: "0 auto",
  textAlign: "center",
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "60px",
};

const textStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
};

export default ProductDetails;
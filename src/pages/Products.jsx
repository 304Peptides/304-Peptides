import { useEffect, useState } from "react";
import { products, categories } from "../data/products";

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

const categoryDescriptions = {
  "All Products":
    "Browse the complete 304 Peptides research-use catalog with grouped strengths, product codes, imagery, and documentation placeholders.",

  "Best Sellers":
    "Browse highlighted products from across the current research catalog.",

  "Metabolic Research":
    "Research-use products organized within the metabolic research category.",

  "Recovery Research":
    "Research-use products organized within the recovery research category.",

  "Performance Research":
    "Research-use products organized within the performance research category.",

  "Cognitive Research":
    "Research-use products organized within the cognitive research category.",

  "Hormone Research":
    "Research-use products organized within the hormone research category.",

  "Wellness Research":
    "Research-use products organized within the wellness research category.",

  "Longevity Research":
    "Research-use products organized within the longevity research category.",

  "Research Supplies":
    "Research supplies and supporting laboratory-use products.",
};

function Products({
  onProductSelect,
  isLoggedIn,
  onAddToCart,
}) {
  const [settings, setSettings] = useState(loadSettings);
  const [activeCategory, setActiveCategory] =
    useState("All Products");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStrengths, setSelectedStrengths] =
    useState({});

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

  function getSelectedVariant(product) {
    if (!product.variants?.length) {
      return null;
    }

    const selectedStrength =
      selectedStrengths[product.codeName] ||
      product.variants[0].strength;

    return (
      product.variants.find(
        (variant) =>
          variant.strength === selectedStrength
      ) || product.variants[0]
    );
  }

  function getResolvedProduct(product) {
    const selectedVariant = getSelectedVariant(product);

    if (!selectedVariant) {
      return product;
    }

    return {
      ...product,
      ...selectedVariant,
      name: product.name,
      baseName: product.name,
      variants: product.variants,
    };
  }

  function selectStrength(product, strength) {
    setSelectedStrengths((currentSelections) => ({
      ...currentSelections,
      [product.codeName]: strength,
    }));
  }

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === "All Products" ||
      product.category === activeCategory ||
      (activeCategory === "Best Sellers" &&
        product.isBestSeller);

    const variantSearchText = product.variants
      ? product.variants
          .map(
            (variant) =>
              `${variant.strength} ${variant.codeName} ${
                variant.composition || ""
              }`
          )
          .join(" ")
      : "";

    const searchText =
      `${product.name} ${product.codeName} ${product.strength} ${product.category} ${variantSearchText}`.toLowerCase();

    const matchesSearch = searchText.includes(
      searchTerm.trim().toLowerCase()
    );

    return matchesCategory && matchesSearch;
  });

  const storeStatusLabel =
    settings.storeStatus === "open"
      ? "Store Open"
      : settings.storeStatus === "maintenance"
      ? "Maintenance Mode"
      : "Coming Soon";

  const purchasingEnabled =
    settings.storeStatus === "open";

  if (!settings.catalogEnabled) {
    return (
      <main style={{ padding: "90px 60px" }}>
        <section style={catalogUnavailableStyle}>
          <p className="eyebrow">PRODUCT CATALOG</p>

          <h1 style={titleStyle}>
            Catalog Temporarily Unavailable
          </h1>

          <p style={subtitleStyle}>
            The research product catalog is currently unavailable.
            Please check back later or contact support for general
            website assistance.
          </p>

          <div style={heroNoticeStyle}>
            For Research Use Only. Not intended for human
            consumption.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: "90px 60px" }}>
      <section
        style={{ maxWidth: "1250px", margin: "0 auto" }}
      >
        <div style={heroPanelStyle}>
          <p className="eyebrow">PRODUCT CATALOG</p>

          <h1 style={titleStyle}>Research Products</h1>

          <p style={subtitleStyle}>
            Browse products by category, select available
            strengths, and review product codes and
            documentation status.
          </p>

          <div style={statusRowStyle}>
            <div style={heroNoticeStyle}>
              For Research Use Only. Not intended for human
              consumption.
            </div>

            <div
              style={
                purchasingEnabled
                  ? openStatusStyle
                  : closedStatusStyle
              }
            >
              {storeStatusLabel}
            </div>
          </div>

          {!purchasingEnabled && (
            <div style={storeNoticeStyle}>
              Product browsing remains available, but purchasing
              is currently disabled while the store status is{" "}
              <strong>{storeStatusLabel}</strong>.
            </div>
          )}
        </div>

        <div style={filterPanelStyle}>
          <div>
            <p className="eyebrow">FILTER PRODUCTS</p>

            <h2 style={sectionTitleStyle}>
              Find Products
            </h2>

            <p style={categoryDescriptionStyle}>
              {categoryDescriptions[activeCategory] ||
                categoryDescriptions["All Products"]}
            </p>
          </div>

          <input
            type="search"
            placeholder="Search by product, code, strength, or category..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            style={searchInputStyle}
          />

          <div style={categoryRowStyle}>
            {categories.map((category) => (
              <button
                key={category}
                className={
                  activeCategory === category
                    ? "primary-btn"
                    : "secondary-btn"
                }
                onClick={() =>
                  setActiveCategory(category)
                }
              >
                {category}
              </button>
            ))}
          </div>

          <div style={resultsBarStyle}>
            <span>
              Showing{" "}
              <strong>{filteredProducts.length}</strong>{" "}
              product
              {filteredProducts.length === 1 ? "" : "s"}
            </span>

            <span>
              Active Filter:{" "}
              <strong>{activeCategory}</strong>
            </span>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div style={emptyPanelStyle}>
            <p className="eyebrow">NO RESULTS</p>

            <h2 style={sectionTitleStyle}>
              No Products Found
            </h2>

            <p style={textStyle}>
              Try changing the search term or selecting another
              category.
            </p>

            <button
              className="primary-btn"
              style={{ marginTop: "22px" }}
              onClick={() => {
                setSearchTerm("");
                setActiveCategory("All Products");
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={productGridStyle}>
            {filteredProducts.map((product) => {
              const selectedVariant =
                getSelectedVariant(product);

              const resolvedProduct =
                getResolvedProduct(product);

              const hasPrice = Number.isFinite(
                resolvedProduct.price
              );

              const canViewPrice =
                isLoggedIn ||
                settings.guestPricingEnabled;

              const canPurchase =
                hasPrice &&
                purchasingEnabled &&
                isLoggedIn;

              return (
                <article
                  key={product.codeName}
                  style={productCardStyle}
                >
                  <div style={topBadgeRowStyle}>
                    <span style={categoryBadgeStyle}>
                      {product.category}
                    </span>

                    {product.isBestSeller && (
                      <span style={bestSellerBadgeStyle}>
                        Best Seller
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onProductSelect(resolvedProduct)
                    }
                    style={imageButtonStyle}
                    aria-label={`View ${product.name}`}
                  >
                    {resolvedProduct.image ? (
                      <div style={realImageWrapStyle}>
                        <img
                          src={resolvedProduct.image}
                          alt={`${product.name} ${resolvedProduct.strength} research product`}
                          style={realImageStyle}
                        />

                        <div style={imageGlowStyle}></div>
                      </div>
                    ) : (
                      <div style={bottleWrapStyle}>
                        <div style={bottleCapStyle}></div>

                        <div style={bottleStyle}>
                          <div style={labelStyle}>
                            <strong style={labelBrandStyle}>
                              304
                            </strong>

                            <span style={labelCodeStyle}>
                              {resolvedProduct.codeName}
                            </span>

                            <small
                              style={labelStrengthStyle}
                            >
                              {resolvedProduct.strength}
                            </small>

                            <small style={labelNoticeStyle}>
                              Research Use Only
                            </small>
                          </div>
                        </div>
                      </div>
                    )}
                  </button>

                  <h2 style={productTitleStyle}>
                    {product.name}
                  </h2>

                  <p style={codeStyle}>
                    {resolvedProduct.codeName} ·{" "}
                    {resolvedProduct.strength}
                  </p>

                  {product.variants?.length > 0 && (
                    <div style={variantPanelStyle}>
                      <span style={variantLabelStyle}>
                        Choose Strength
                      </span>

                      <div style={variantButtonRowStyle}>
                        {product.variants.map((variant) => {
                          const isSelected =
                            selectedVariant?.strength ===
                            variant.strength;

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
                                selectStrength(
                                  product,
                                  variant.strength
                                )
                              }
                            >
                              {variant.strength}
                            </button>
                          );
                        })}
                      </div>

                      {resolvedProduct.composition && (
                        <div style={compositionStyle}>
                          <span>Composition</span>

                          <strong>
                            {
                              resolvedProduct.composition
                            }
                          </strong>
                        </div>
                      )}
                    </div>
                  )}

                  <p style={productTextStyle}>
                    {product.description}
                  </p>

                  <div style={statusGridStyle}>
                    <div style={statusBoxStyle}>
                      <span>Purity</span>
                      <strong>{product.purity}</strong>
                    </div>

                    <div style={statusBoxStyle}>
                      <span>COA</span>
                      <strong>
                        {resolvedProduct.coaStatus}
                      </strong>
                    </div>

                    <div style={statusBoxStyle}>
                      <span>Batch</span>
                      <strong>
                        {resolvedProduct.batchStatus}
                      </strong>
                    </div>

                    <div style={statusBoxStyle}>
                      <span>QR</span>
                      <strong>
                        {resolvedProduct.qrStatus}
                      </strong>
                    </div>
                  </div>

                  <div style={priceBoxStyle}>
                    {!hasPrice ? (
                      <>
                        <span>Pricing Status</span>
                        <strong>
                          Price Coming Soon
                        </strong>
                      </>
                    ) : canViewPrice ? (
                      <>
                        <span>Price</span>
                        <strong>
                          $
                          {resolvedProduct.price.toFixed(
                            2
                          )}
                        </strong>
                      </>
                    ) : (
                      <>
                        <span>Pricing Locked</span>
                        <strong>
                          Login To View
                        </strong>
                      </>
                    )}
                  </div>

                  <div style={buttonStackStyle}>
                    <button
                      className="secondary-btn"
                      onClick={() =>
                        onProductSelect(resolvedProduct)
                      }
                    >
                      View Details
                    </button>

                    {!hasPrice ? (
                      <button
                        type="button"
                        style={disabledButtonStyle}
                        disabled
                      >
                        Price Coming Soon
                      </button>
                    ) : !purchasingEnabled ? (
                      <button
                        type="button"
                        style={disabledButtonStyle}
                        disabled
                      >
                        Purchasing Unavailable
                      </button>
                    ) : canPurchase ? (
                      <button
                        className="primary-btn"
                        onClick={() =>
                          onAddToCart(resolvedProduct)
                        }
                      >
                        Add{" "}
                        {resolvedProduct.strength} To
                        Cart
                      </button>
                    ) : (
                      <button
                        className="primary-btn"
                        onClick={() =>
                          onProductSelect(
                            resolvedProduct
                          )
                        }
                      >
                        View Product
                      </button>
                    )}
                  </div>

                  <div style={researchNoticeStyle}>
                    Research Use Only
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

const heroPanelStyle = {
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.22), transparent 42%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "34px",
  padding: "64px 56px",
  boxShadow: "0 30px 90px rgba(0,0,0,0.5)",
  marginBottom: "30px",
};

const catalogUnavailableStyle = {
  maxWidth: "950px",
  margin: "0 auto",
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.18), transparent 45%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "34px",
  padding: "70px 56px",
  boxShadow: "0 30px 90px rgba(0,0,0,0.5)",
};

const titleStyle = {
  fontSize: "72px",
  lineHeight: "1.02",
  marginBottom: "24px",
  background:
    "linear-gradient(180deg, #ffffff, #8f8f8f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle = {
  maxWidth: "850px",
  margin: "0 auto",
  color: "#c8c8c8",
  fontSize: "20px",
  lineHeight: "1.85",
};

const statusRowStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "30px",
};

const heroNoticeStyle = {
  display: "inline-flex",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "999px",
  padding: "14px 22px",
  fontWeight: "900",
  lineHeight: "1.5",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const openStatusStyle = {
  display: "inline-flex",
  background: "rgba(61,165,255,0.18)",
  border: "1px solid rgba(61,165,255,0.42)",
  color: "#ffffff",
  borderRadius: "999px",
  padding: "14px 22px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const closedStatusStyle = {
  display: "inline-flex",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#c8c8c8",
  borderRadius: "999px",
  padding: "14px 22px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const storeNoticeStyle = {
  maxWidth: "760px",
  margin: "22px auto 0",
  padding: "15px 18px",
  borderRadius: "15px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.25)",
  color: "#aeb7bf",
  lineHeight: "1.65",
};

const filterPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.14), transparent 35%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "34px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  marginBottom: "30px",
};

const sectionTitleStyle = {
  fontSize: "38px",
  lineHeight: "1.12",
  marginBottom: "14px",
  background:
    "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const categoryDescriptionStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
  marginBottom: "24px",
  maxWidth: "850px",
};

const searchInputStyle = {
  width: "100%",
  padding: "17px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.055)",
  color: "#ffffff",
  fontSize: "16px",
  outline: "none",
  marginBottom: "22px",
};

const categoryRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
};

const resultsBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "24px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "16px",
  padding: "16px",
  color: "#c8c8c8",
};

const productGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(310px, 1fr))",
  gap: "24px",
};

const productCardStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.12), transparent 35%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "26px",
  boxShadow: "0 28px 75px rgba(0,0,0,0.42)",
  overflow: "hidden",
};

const topBadgeRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "18px",
  position: "relative",
  zIndex: 2,
};

const categoryBadgeStyle = {
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "999px",
  padding: "8px 12px",
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
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: "900",
};

const imageButtonStyle = {
  display: "block",
  width: "100%",
  padding: "0",
  margin: "0 0 22px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

const realImageWrapStyle = {
  width: "100%",
  height: "320px",
  borderRadius: "22px",
  overflow: "hidden",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "radial-gradient(circle at center, rgba(61,165,255,0.18), rgba(0,0,0,0.72) 70%)",
  border: "1px solid rgba(61,165,255,0.16)",
};

const realImageStyle = {
  width: "100%",
  height: "100%",
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
  bottom: "8px",
  height: "30px",
  borderRadius: "50%",
  background: "rgba(61,165,255,0.25)",
  filter: "blur(18px)",
};

const bottleWrapStyle = {
  height: "320px",
  display: "grid",
  alignContent: "center",
  justifyContent: "center",
  borderRadius: "22px",
  background:
    "radial-gradient(circle at center, rgba(61,165,255,0.18), rgba(0,0,0,0.72) 70%)",
  border: "1px solid rgba(61,165,255,0.16)",
};

const bottleCapStyle = {
  width: "68px",
  height: "28px",
  margin: "0 auto",
  borderRadius: "11px 11px 4px 4px",
  background:
    "linear-gradient(180deg, #e3e3e3, #737373)",
  boxShadow: "0 0 18px rgba(61,165,255,0.15)",
};

const bottleStyle = {
  width: "150px",
  height: "205px",
  borderRadius: "32px 32px 38px 38px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.28))",
  border: "1px solid rgba(255,255,255,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
};

const labelStyle = {
  width: "116px",
  minHeight: "125px",
  borderRadius: "15px",
  background: "linear-gradient(180deg, #050505, #171717)",
  border: "1px solid rgba(61,165,255,0.35)",
  color: "#ffffff",
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  gap: "7px",
  padding: "11px",
  textAlign: "center",
};

const labelBrandStyle = {
  fontSize: "27px",
  lineHeight: "1",
};

const labelCodeStyle = {
  color: "#9ed8ff",
  fontSize: "12px",
  fontWeight: "900",
};

const labelStrengthStyle = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "900",
};

const labelNoticeStyle = {
  color: "#9ed8ff",
  fontSize: "8px",
  textTransform: "uppercase",
};

const productTitleStyle = {
  color: "#ffffff",
  fontSize: "29px",
  lineHeight: "1.15",
  marginBottom: "8px",
};

const codeStyle = {
  color: "#9ed8ff",
  fontWeight: "900",
  marginBottom: "16px",
};

const variantPanelStyle = {
  marginBottom: "18px",
  padding: "15px",
  borderRadius: "16px",
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
  marginBottom: "10px",
};

const variantButtonRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const variantButtonStyle = {
  padding: "10px 13px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.045)",
  color: "#d4d4d4",
  fontWeight: "900",
  cursor: "pointer",
};

const selectedVariantButtonStyle = {
  padding: "10px 13px",
  borderRadius: "12px",
  border: "1px solid rgba(61,165,255,0.62)",
  background: "rgba(61,165,255,0.22)",
  color: "#ffffff",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 0 18px rgba(61,165,255,0.16)",
};

const compositionStyle = {
  display: "grid",
  gap: "5px",
  marginTop: "12px",
  paddingTop: "12px",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  color: "#c8c8c8",
  fontSize: "13px",
};

const productTextStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
  fontSize: "15px",
  minHeight: "86px",
};

const statusGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "20px",
};

const statusBoxStyle = {
  display: "grid",
  gap: "4px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "14px",
  padding: "12px",
  color: "#c8c8c8",
  fontSize: "13px",
};

const priceBoxStyle = {
  display: "grid",
  gap: "4px",
  marginTop: "18px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "16px",
  padding: "16px",
};

const buttonStackStyle = {
  display: "grid",
  gap: "10px",
  marginTop: "18px",
};

const disabledButtonStyle = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "14px",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.045)",
  color: "#858f99",
  fontWeight: "900",
  cursor: "not-allowed",
};

const researchNoticeStyle = {
  marginTop: "18px",
  textAlign: "center",
  color: "#9ed8ff",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const emptyPanelStyle = {
  textAlign: "center",
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "50px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
};

const textStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
};

export default Products;
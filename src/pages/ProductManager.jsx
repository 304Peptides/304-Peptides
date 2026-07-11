import { useMemo, useState } from "react";
import { products, categories } from "../data/products";

function ProductManager({ onNavigate }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Products");

  const catalogStats = useMemo(() => {
    const allVariants = products.flatMap((product) =>
      product.variants?.length ? product.variants : [product]
    );

    const pricedVariants = allVariants.filter((variant) =>
      Number.isFinite(variant.price)
    );

    const imageVariants = allVariants.filter((variant) => variant.image);

    return {
      productCount: products.length,
      variantCount: allVariants.length,
      pricedCount: pricedVariants.length,
      imageCount: imageVariants.length,
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "All Products" ||
        activeCategory === "Best Sellers"
          ? activeCategory === "All Products" || product.isBestSeller
          : product.category === activeCategory;

      const variantText = product.variants?.length
        ? product.variants
            .map(
              (variant) =>
                `${variant.strength} ${variant.codeName} ${
                  variant.composition || ""
                }`
            )
            .join(" ")
        : "";

      const searchableText =
        `${product.name} ${product.codeName} ${product.category} ${product.strength} ${variantText}`.toLowerCase();

      const matchesSearch =
        normalizedSearch === "" ||
        searchableText.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  function getVariants(product) {
    return product.variants?.length ? product.variants : [product];
  }

  function formatPrice(price) {
    if (!Number.isFinite(price)) {
      return "Coming Soon";
    }

    return `$${price.toFixed(2)}`;
  }

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1300px", margin: "0 auto" }}>
        <div style={heroPanelStyle}>
          <div>
            <p className="eyebrow">MISSION CONTROL</p>

            <h1 style={titleStyle}>Product Manager</h1>

            <p style={subtitleStyle}>
              Review products, strength variants, image coverage, pricing
              status, product codes, and documentation readiness.
            </p>
          </div>

          <div style={heroButtonRowStyle}>
            <button
              className="secondary-btn"
              onClick={() => onNavigate("missionControl")}
            >
              Back To Mission Control
            </button>

            <button
              className="primary-btn"
              onClick={() => onNavigate("products")}
            >
              View Storefront
            </button>
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatCard
            label="Products"
            value={catalogStats.productCount}
            detail="Grouped catalog entries"
          />

          <StatCard
            label="Strength Variants"
            value={catalogStats.variantCount}
            detail="Individual strength options"
          />

          <StatCard
            label="Images Connected"
            value={catalogStats.imageCount}
            detail={`Of ${catalogStats.variantCount} total variants`}
          />

          <StatCard
            label="Prices Added"
            value={catalogStats.pricedCount}
            detail={`Of ${catalogStats.variantCount} total variants`}
          />
        </div>

        <div style={filterPanelStyle}>
          <div>
            <p className="eyebrow">CATALOG FILTERS</p>

            <h2 style={sectionTitleStyle}>Find A Product</h2>
          </div>

          <input
            type="search"
            placeholder="Search by product, code, category, or strength..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
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
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div style={resultsBarStyle}>
            <span>
              Showing <strong>{filteredProducts.length}</strong> product
              {filteredProducts.length === 1 ? "" : "s"}
            </span>

            <span>
              Filter: <strong>{activeCategory}</strong>
            </span>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div style={emptyPanelStyle}>
            <p className="eyebrow">NO RESULTS</p>

            <h2 style={sectionTitleStyle}>No Products Found</h2>

            <p style={textStyle}>
              Change the search term or select another category.
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
          <div style={productListStyle}>
            {filteredProducts.map((product) => {
              const variants = getVariants(product);
              const variantsWithImages = variants.filter(
                (variant) => variant.image
              ).length;
              const variantsWithPrices = variants.filter((variant) =>
                Number.isFinite(variant.price)
              ).length;

              return (
                <article key={product.codeName} style={productPanelStyle}>
                  <div style={productHeaderStyle}>
                    <div style={productIdentityStyle}>
                      <div style={imagePreviewStyle}>
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={`${product.name} catalog preview`}
                            style={previewImageStyle}
                          />
                        ) : (
                          <div style={placeholderPreviewStyle}>
                            <strong>304</strong>
                            <span>{product.codeName}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={badgeRowStyle}>
                          <span style={categoryBadgeStyle}>
                            {product.category}
                          </span>

                          {product.isBestSeller && (
                            <span style={bestSellerBadgeStyle}>
                              Best Seller
                            </span>
                          )}
                        </div>

                        <h2 style={productTitleStyle}>{product.name}</h2>

                        <p style={productCodeStyle}>
                          {product.codeName} · {product.strength}
                        </p>
                      </div>
                    </div>

                    <div style={readinessGridStyle}>
                      <ReadinessBox
                        label="Images"
                        value={`${variantsWithImages}/${variants.length}`}
                        complete={variantsWithImages === variants.length}
                      />

                      <ReadinessBox
                        label="Prices"
                        value={`${variantsWithPrices}/${variants.length}`}
                        complete={variantsWithPrices === variants.length}
                      />

                      <ReadinessBox
                        label="COA"
                        value={product.coaStatus}
                        complete={product.coaStatus !== "COA Pending"}
                      />
                    </div>
                  </div>

                  <p style={descriptionStyle}>{product.description}</p>

                  <div style={variantHeadingStyle}>
                    <div>
                      <p className="eyebrow">STRENGTH OPTIONS</p>

                      <h3 style={variantTitleStyle}>
                        {variants.length} Variant
                        {variants.length === 1 ? "" : "s"}
                      </h3>
                    </div>
                  </div>

                  <div style={variantGridStyle}>
                    {variants.map((variant) => {
                      const hasPrice = Number.isFinite(variant.price);
                      const hasImage = Boolean(variant.image);

                      return (
                        <div
                          key={variant.codeName}
                          style={variantCardStyle}
                        >
                          <div style={variantTopRowStyle}>
                            <strong style={variantStrengthStyle}>
                              {variant.strength}
                            </strong>

                            <span
                              style={
                                hasPrice
                                  ? completeStatusStyle
                                  : pendingStatusStyle
                              }
                            >
                              {formatPrice(variant.price)}
                            </span>
                          </div>

                          <div style={variantDetailsStyle}>
                            <div>
                              <span>Product Code</span>
                              <strong>{variant.codeName}</strong>
                            </div>

                            <div>
                              <span>Image</span>
                              <strong>
                                {hasImage ? "Connected" : "Needed"}
                              </strong>
                            </div>

                            <div>
                              <span>COA</span>
                              <strong>{variant.coaStatus}</strong>
                            </div>

                            <div>
                              <span>QR</span>
                              <strong>{variant.qrStatus}</strong>
                            </div>
                          </div>

                          {variant.composition && (
                            <div style={compositionStyle}>
                              <span>Composition</span>
                              <strong>{variant.composition}</strong>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={actionRowStyle}>
                    <button
                      className="secondary-btn"
                      onClick={() => onNavigate("products")}
                    >
                      View On Storefront
                    </button>

                    <button
                      className="secondary-btn"
                      onClick={() => onNavigate("coaManager")}
                    >
                      Open COA Manager
                    </button>

                    <button
                      type="button"
                      style={futureButtonStyle}
                      onClick={() =>
                        window.alert(
                          "Live product editing will be connected when the backend is added."
                        )
                      }
                    >
                      Edit Product Later
                    </button>
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

function StatCard({ label, value, detail }) {
  return (
    <div style={statCardStyle}>
      <span style={statLabelStyle}>{label}</span>
      <strong style={statValueStyle}>{value}</strong>
      <small style={statDetailStyle}>{detail}</small>
    </div>
  );
}

function ReadinessBox({ label, value, complete }) {
  return (
    <div style={readinessBoxStyle}>
      <span>{label}</span>

      <strong style={complete ? readyTextStyle : pendingTextStyle}>
        {value}
      </strong>
    </div>
  );
}

const heroPanelStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "28px",
  flexWrap: "wrap",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.2), transparent 40%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "34px",
  padding: "48px",
  boxShadow: "0 30px 90px rgba(0,0,0,0.5)",
  marginBottom: "24px",
};

const titleStyle = {
  fontSize: "62px",
  lineHeight: "1.02",
  marginBottom: "18px",
  background: "linear-gradient(180deg, #ffffff, #8f8f8f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle = {
  maxWidth: "760px",
  color: "#c8c8c8",
  fontSize: "18px",
  lineHeight: "1.8",
};

const heroButtonRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "18px",
  marginBottom: "24px",
};

const statCardStyle = {
  display: "grid",
  gap: "8px",
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 24px 65px rgba(0,0,0,0.32)",
};

const statLabelStyle = {
  color: "#9ed8ff",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const statValueStyle = {
  color: "#ffffff",
  fontSize: "38px",
};

const statDetailStyle = {
  color: "#8f9ba7",
  lineHeight: "1.5",
};

const filterPanelStyle = {
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "30px",
  marginBottom: "24px",
};

const sectionTitleStyle = {
  color: "#ffffff",
  fontSize: "36px",
  marginBottom: "20px",
};

const searchInputStyle = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "16px",
  padding: "17px",
  background: "rgba(255,255,255,0.05)",
  color: "#ffffff",
  fontSize: "16px",
  outline: "none",
  marginBottom: "20px",
};

const categoryRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const resultsBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "22px",
  borderRadius: "16px",
  padding: "15px",
  background: "rgba(0,0,0,0.24)",
  color: "#c8c8c8",
};

const productListStyle = {
  display: "grid",
  gap: "22px",
};

const productPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.1), transparent 34%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "28px",
  boxShadow: "0 28px 75px rgba(0,0,0,0.38)",
};

const productHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "24px",
  flexWrap: "wrap",
};

const productIdentityStyle = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
};

const imagePreviewStyle = {
  width: "115px",
  height: "115px",
  borderRadius: "20px",
  overflow: "hidden",
  background:
    "radial-gradient(circle, rgba(61,165,255,0.18), rgba(0,0,0,0.7))",
  border: "1px solid rgba(61,165,255,0.2)",
};

const previewImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const placeholderPreviewStyle = {
  width: "100%",
  height: "100%",
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  gap: "5px",
  color: "#ffffff",
  textAlign: "center",
};

const badgeRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "10px",
};

const categoryBadgeStyle = {
  border: "1px solid rgba(61,165,255,0.28)",
  borderRadius: "999px",
  padding: "7px 11px",
  background: "rgba(61,165,255,0.12)",
  color: "#9ed8ff",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const bestSellerBadgeStyle = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "999px",
  padding: "7px 11px",
  background: "rgba(255,255,255,0.07)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "900",
};

const productTitleStyle = {
  color: "#ffffff",
  fontSize: "32px",
  marginBottom: "7px",
};

const productCodeStyle = {
  color: "#9ed8ff",
  fontWeight: "900",
};

const readinessGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(105px, 1fr))",
  gap: "10px",
};

const readinessBoxStyle = {
  display: "grid",
  gap: "5px",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "15px",
  padding: "13px",
  background: "rgba(0,0,0,0.24)",
  color: "#9ca8b3",
  fontSize: "12px",
};

const readyTextStyle = {
  color: "#9ed8ff",
};

const pendingTextStyle = {
  color: "#ffffff",
};

const descriptionStyle = {
  color: "#c8c8c8",
  lineHeight: "1.75",
  marginTop: "22px",
};

const variantHeadingStyle = {
  marginTop: "24px",
  marginBottom: "14px",
};

const variantTitleStyle = {
  color: "#ffffff",
  fontSize: "24px",
};

const variantGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
};

const variantCardStyle = {
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "18px",
  padding: "17px",
  background: "rgba(0,0,0,0.23)",
};

const variantTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const variantStrengthStyle = {
  color: "#ffffff",
  fontSize: "21px",
};

const completeStatusStyle = {
  borderRadius: "999px",
  padding: "6px 10px",
  background: "rgba(61,165,255,0.16)",
  color: "#9ed8ff",
  fontSize: "11px",
  fontWeight: "900",
};

const pendingStatusStyle = {
  borderRadius: "999px",
  padding: "6px 10px",
  background: "rgba(255,255,255,0.07)",
  color: "#c8c8c8",
  fontSize: "11px",
  fontWeight: "900",
};

const variantDetailsStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const compositionStyle = {
  display: "grid",
  gap: "5px",
  marginTop: "13px",
  paddingTop: "13px",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  color: "#c8c8c8",
  fontSize: "13px",
};

const actionRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "22px",
};

const futureButtonStyle = {
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "14px",
  padding: "13px 18px",
  background: "rgba(255,255,255,0.04)",
  color: "#9ca8b3",
  fontWeight: "900",
  cursor: "pointer",
};

const emptyPanelStyle = {
  textAlign: "center",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "50px",
  background: "rgba(255,255,255,0.035)",
};

const textStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
};

export default ProductManager;
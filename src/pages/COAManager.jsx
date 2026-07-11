import { useMemo, useState } from "react";
import { products, categories } from "../data/products";

function COAManager({ onNavigate }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Products");
  const [activeStatus, setActiveStatus] = useState("All Statuses");

  const allVariants = useMemo(
    () =>
      products.flatMap((product) => {
        const variants = product.variants?.length
          ? product.variants
          : [product];

        return variants.map((variant) => ({
          ...variant,
          productName: product.name,
          category: product.category,
          purity: product.purity,
          isBestSeller: product.isBestSeller,
          description: product.description,
        }));
      }),
    []
  );

  const stats = useMemo(() => {
    const coaReady = allVariants.filter(
      (variant) => variant.coaStatus !== "COA Pending"
    ).length;

    const qrReady = allVariants.filter(
      (variant) => variant.qrStatus !== "QR Pending"
    ).length;

    const batchReady = allVariants.filter(
      (variant) => variant.batchStatus !== "Batch Pending"
    ).length;

    return {
      total: allVariants.length,
      coaReady,
      qrReady,
      batchReady,
      pending: allVariants.length - coaReady,
    };
  }, [allVariants]);

  const filteredVariants = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return allVariants.filter((variant) => {
      const matchesCategory =
        activeCategory === "All Products" ||
        variant.category === activeCategory ||
        (activeCategory === "Best Sellers" && variant.isBestSeller);

      const matchesStatus =
        activeStatus === "All Statuses" ||
        (activeStatus === "COA Ready" &&
          variant.coaStatus !== "COA Pending") ||
        (activeStatus === "COA Pending" &&
          variant.coaStatus === "COA Pending") ||
        (activeStatus === "QR Ready" &&
          variant.qrStatus !== "QR Pending") ||
        (activeStatus === "QR Pending" &&
          variant.qrStatus === "QR Pending");

      const searchableText = `
        ${variant.productName}
        ${variant.codeName}
        ${variant.strength}
        ${variant.category}
        ${variant.composition || ""}
      `.toLowerCase();

      const matchesSearch =
        normalizedSearch === "" ||
        searchableText.includes(normalizedSearch);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [activeCategory, activeStatus, allVariants, searchTerm]);

  function showPrototypeAlert(message) {
    window.alert(
      `${message}\n\nThis action will be connected when the live backend and file storage system are added.`
    );
  }

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1300px", margin: "0 auto" }}>
        <div style={heroPanelStyle}>
          <div>
            <p className="eyebrow">MISSION CONTROL</p>

            <h1 style={titleStyle}>COA Manager</h1>

            <p style={subtitleStyle}>
              Track certificates of analysis, batch documentation, QR
              verification, and image readiness for every product strength.
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
              className="secondary-btn"
              onClick={() => onNavigate("productManager")}
            >
              Product Manager
            </button>

            <button
              className="primary-btn"
              onClick={() => onNavigate("quality")}
            >
              View Quality Page
            </button>
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatCard
            label="Total Variants"
            value={stats.total}
            detail="Individual strength records"
          />

          <StatCard
            label="COAs Ready"
            value={stats.coaReady}
            detail={`${stats.pending} still pending`}
          />

          <StatCard
            label="Batch Records"
            value={stats.batchReady}
            detail={`Of ${stats.total} total variants`}
          />

          <StatCard
            label="QR Codes Ready"
            value={stats.qrReady}
            detail={`Of ${stats.total} total variants`}
          />
        </div>

        <div style={filterPanelStyle}>
          <div>
            <p className="eyebrow">DOCUMENT FILTERS</p>

            <h2 style={sectionTitleStyle}>Find A Variant</h2>
          </div>

          <input
            type="search"
            placeholder="Search by product, code, strength, or composition..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={searchInputStyle}
          />

          <div style={filterHeadingStyle}>Category</div>

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

          <div style={filterHeadingStyle}>Documentation Status</div>

          <div style={categoryRowStyle}>
            {[
              "All Statuses",
              "COA Ready",
              "COA Pending",
              "QR Ready",
              "QR Pending",
            ].map((status) => (
              <button
                key={status}
                className={
                  activeStatus === status
                    ? "primary-btn"
                    : "secondary-btn"
                }
                onClick={() => setActiveStatus(status)}
              >
                {status}
              </button>
            ))}
          </div>

          <div style={resultsBarStyle}>
            <span>
              Showing <strong>{filteredVariants.length}</strong> variant
              {filteredVariants.length === 1 ? "" : "s"}
            </span>

            <span>
              Category: <strong>{activeCategory}</strong>
            </span>

            <span>
              Status: <strong>{activeStatus}</strong>
            </span>
          </div>
        </div>

        {filteredVariants.length === 0 ? (
          <div style={emptyPanelStyle}>
            <p className="eyebrow">NO RESULTS</p>

            <h2 style={sectionTitleStyle}>No Variants Found</h2>

            <p style={textStyle}>
              Change the search term, category, or documentation status.
            </p>

            <button
              className="primary-btn"
              style={{ marginTop: "22px" }}
              onClick={() => {
                setSearchTerm("");
                setActiveCategory("All Products");
                setActiveStatus("All Statuses");
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={documentGridStyle}>
            {filteredVariants.map((variant) => {
              const coaReady = variant.coaStatus !== "COA Pending";
              const batchReady =
                variant.batchStatus !== "Batch Pending";
              const qrReady = variant.qrStatus !== "QR Pending";

              return (
                <article
                  key={variant.codeName}
                  style={documentCardStyle}
                >
                  <div style={cardHeaderStyle}>
                    <div style={imagePreviewStyle}>
                      {variant.image ? (
                        <img
                          src={variant.image}
                          alt={`${variant.productName} ${variant.strength}`}
                          style={previewImageStyle}
                        />
                      ) : (
                        <div style={placeholderPreviewStyle}>
                          <strong>304</strong>
                          <span>{variant.codeName}</span>
                          <small>{variant.strength}</small>
                        </div>
                      )}
                    </div>

                    <div style={cardIdentityStyle}>
                      <span style={categoryBadgeStyle}>
                        {variant.category}
                      </span>

                      <h2 style={productTitleStyle}>
                        {variant.productName}
                      </h2>

                      <p style={codeStyle}>
                        {variant.codeName} · {variant.strength}
                      </p>
                    </div>
                  </div>

                  {variant.composition && (
                    <div style={compositionStyle}>
                      <span>Composition</span>
                      <strong>{variant.composition}</strong>
                    </div>
                  )}

                  <div style={statusGridStyle}>
                    <StatusBox
                      label="Certificate Of Analysis"
                      value={variant.coaStatus}
                      ready={coaReady}
                    />

                    <StatusBox
                      label="Batch Record"
                      value={variant.batchStatus}
                      ready={batchReady}
                    />

                    <StatusBox
                      label="QR Verification"
                      value={variant.qrStatus}
                      ready={qrReady}
                    />

                    <StatusBox
                      label="Product Image"
                      value={
                        variant.image ? "Image Connected" : "Image Needed"
                      }
                      ready={Boolean(variant.image)}
                    />
                  </div>

                  <div style={qrPanelStyle}>
                    <div style={qrPlaceholderStyle}>
                      <div style={qrGridStyle}>
                        {Array.from({ length: 36 }).map((_, index) => (
                          <span
                            key={index}
                            style={{
                              ...qrSquareStyle,
                              opacity:
                                (index * 7 + variant.codeName.length) %
                                  4 ===
                                0
                                  ? 1
                                  : 0.18,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <span style={qrLabelStyle}>
                        Verification Preview
                      </span>

                      <strong style={qrCodeStyle}>
                        {variant.codeName}
                      </strong>

                      <p style={qrTextStyle}>
                        Future QR codes will connect each strength directly
                        to its matching documentation.
                      </p>
                    </div>
                  </div>

                  <div style={actionGridStyle}>
                    <button
                      className="primary-btn"
                      onClick={() =>
                        showPrototypeAlert(
                          `Upload a COA for ${variant.codeName}`
                        )
                      }
                    >
                      Upload COA
                    </button>

                    <button
                      className="secondary-btn"
                      onClick={() =>
                        showPrototypeAlert(
                          `Create a batch record for ${variant.codeName}`
                        )
                      }
                    >
                      Add Batch Record
                    </button>

                    <button
                      className="secondary-btn"
                      onClick={() =>
                        showPrototypeAlert(
                          `Generate a QR code for ${variant.codeName}`
                        )
                      }
                    >
                      Generate QR
                    </button>

                    <button
                      type="button"
                      style={previewButtonStyle}
                      onClick={() =>
                        showPrototypeAlert(
                          `Preview documentation for ${variant.codeName}`
                        )
                      }
                    >
                      Preview Record
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

function StatusBox({ label, value, ready }) {
  return (
    <div style={statusBoxStyle}>
      <span>{label}</span>

      <strong style={ready ? readyTextStyle : pendingTextStyle}>
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

const filterHeadingStyle = {
  color: "#9ed8ff",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
  margin: "20px 0 10px",
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

const documentGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "22px",
};

const documentCardStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.1), transparent 34%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "26px",
  boxShadow: "0 28px 75px rgba(0,0,0,0.38)",
};

const cardHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const imagePreviewStyle = {
  width: "105px",
  height: "105px",
  minWidth: "105px",
  borderRadius: "19px",
  overflow: "hidden",
  background:
    "radial-gradient(circle, rgba(61,165,255,0.18), rgba(0,0,0,0.72))",
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
  fontSize: "11px",
};

const cardIdentityStyle = {
  minWidth: "0",
};

const categoryBadgeStyle = {
  display: "inline-flex",
  border: "1px solid rgba(61,165,255,0.28)",
  borderRadius: "999px",
  padding: "7px 11px",
  background: "rgba(61,165,255,0.12)",
  color: "#9ed8ff",
  fontSize: "10px",
  fontWeight: "900",
  textTransform: "uppercase",
  marginBottom: "10px",
};

const productTitleStyle = {
  color: "#ffffff",
  fontSize: "27px",
  lineHeight: "1.15",
  marginBottom: "7px",
};

const codeStyle = {
  color: "#9ed8ff",
  fontWeight: "900",
};

const compositionStyle = {
  display: "grid",
  gap: "5px",
  marginTop: "18px",
  padding: "14px",
  borderRadius: "14px",
  background: "rgba(61,165,255,0.09)",
  border: "1px solid rgba(61,165,255,0.18)",
  color: "#c8eaff",
  fontSize: "13px",
};

const statusGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "20px",
};

const statusBoxStyle = {
  display: "grid",
  gap: "5px",
  padding: "13px",
  borderRadius: "14px",
  background: "rgba(0,0,0,0.23)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#9ca8b3",
  fontSize: "12px",
};

const readyTextStyle = {
  color: "#9ed8ff",
};

const pendingTextStyle = {
  color: "#ffffff",
};

const qrPanelStyle = {
  display: "grid",
  gridTemplateColumns: "112px 1fr",
  alignItems: "center",
  gap: "18px",
  marginTop: "20px",
  padding: "17px",
  borderRadius: "18px",
  background: "rgba(0,0,0,0.23)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const qrPlaceholderStyle = {
  width: "112px",
  height: "112px",
  borderRadius: "14px",
  padding: "12px",
  background: "#ffffff",
};

const qrGridStyle = {
  width: "100%",
  height: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: "3px",
};

const qrSquareStyle = {
  display: "block",
  background: "#050505",
  borderRadius: "1px",
};

const qrLabelStyle = {
  display: "block",
  color: "#9ed8ff",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
  marginBottom: "6px",
};

const qrCodeStyle = {
  display: "block",
  color: "#ffffff",
  fontSize: "20px",
  marginBottom: "7px",
};

const qrTextStyle = {
  color: "#9ca8b3",
  lineHeight: "1.6",
  fontSize: "13px",
};

const actionGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "20px",
};

const previewButtonStyle = {
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

export default COAManager;
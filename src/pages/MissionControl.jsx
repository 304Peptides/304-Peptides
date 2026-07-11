import { useMemo } from "react";
import { products } from "../data/products";

function MissionControl({ onNavigate = () => {} }) {
  const catalogStats = useMemo(() => {
    const variants = products.flatMap((product) =>
      product.variants?.length ? product.variants : [product]
    );

    const imageCount = variants.filter((variant) =>
      Boolean(variant.image)
    ).length;

    const pricedCount = variants.filter((variant) =>
      Number.isFinite(variant.price)
    ).length;

    const coaReady = variants.filter(
      (variant) => variant.coaStatus !== "COA Pending"
    ).length;

    const batchReady = variants.filter(
      (variant) => variant.batchStatus !== "Batch Pending"
    ).length;

    const qrReady = variants.filter(
      (variant) => variant.qrStatus !== "QR Pending"
    ).length;

    const bestSellerCount = products.filter(
      (product) => product.isBestSeller
    ).length;

    return {
      productCount: products.length,
      variantCount: variants.length,
      imageCount,
      pricedCount,
      coaReady,
      batchReady,
      qrReady,
      bestSellerCount,
    };
  }, []);

  const launchChecks = [
    {
      label: "Products added",
      value: catalogStats.productCount,
      target: catalogStats.productCount,
    },
    {
      label: "Strength variants organized",
      value: catalogStats.variantCount,
      target: catalogStats.variantCount,
    },
    {
      label: "Product images connected",
      value: catalogStats.imageCount,
      target: catalogStats.variantCount,
    },
    {
      label: "Prices entered",
      value: catalogStats.pricedCount,
      target: catalogStats.variantCount,
    },
    {
      label: "COAs connected",
      value: catalogStats.coaReady,
      target: catalogStats.variantCount,
    },
    {
      label: "Batch records connected",
      value: catalogStats.batchReady,
      target: catalogStats.variantCount,
    },
    {
      label: "QR records connected",
      value: catalogStats.qrReady,
      target: catalogStats.variantCount,
    },
  ];

  const completedChecks = launchChecks.filter(
    (item) => item.value >= item.target
  ).length;

  const launchProgress = Math.round(
    (completedChecks / launchChecks.length) * 100
  );

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1300px", margin: "0 auto" }}>
        <div style={heroPanelStyle}>
          <div>
            <p className="eyebrow">304 PEPTIDES ADMIN</p>

            <h1 style={titleStyle}>Mission Control</h1>

            <p style={subtitleStyle}>
              Review catalog readiness, documentation status, customer tools,
              partner operations, and website launch progress.
            </p>
          </div>

          <div style={heroActionsStyle}>
            <button
              className="secondary-btn"
              onClick={() => onNavigate("home")}
            >
              View Website
            </button>

            <button
              className="primary-btn"
              onClick={() => onNavigate("launchChecklist")}
            >
              Open Launch Checklist
            </button>
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatCard
            label="Catalog Products"
            value={catalogStats.productCount}
            detail={`${catalogStats.bestSellerCount} marked as best sellers`}
          />

          <StatCard
            label="Strength Variants"
            value={catalogStats.variantCount}
            detail="Individual catalog options"
          />

          <StatCard
            label="Images Connected"
            value={`${catalogStats.imageCount}/${catalogStats.variantCount}`}
            detail="Variant image coverage"
          />

          <StatCard
            label="Prices Entered"
            value={`${catalogStats.pricedCount}/${catalogStats.variantCount}`}
            detail="Remaining products show Coming Soon"
          />
        </div>

        <div style={dashboardGridStyle}>
          <section style={launchPanelStyle}>
            <div style={panelHeadingStyle}>
              <div>
                <p className="eyebrow">LAUNCH READINESS</p>

                <h2 style={sectionTitleStyle}>Website Progress</h2>
              </div>

              <strong style={progressNumberStyle}>
                {launchProgress}%
              </strong>
            </div>

            <div style={progressTrackStyle}>
              <div
                style={{
                  ...progressFillStyle,
                  width: `${launchProgress}%`,
                }}
              />
            </div>

            <div style={checkListStyle}>
              {launchChecks.map((item) => {
                const complete = item.value >= item.target;

                return (
                  <div key={item.label} style={checkRowStyle}>
                    <div style={checkIdentityStyle}>
                      <span
                        style={
                          complete
                            ? completeDotStyle
                            : pendingDotStyle
                        }
                      >
                        {complete ? "✓" : "•"}
                      </span>

                      <span>{item.label}</span>
                    </div>

                    <strong
                      style={
                        complete
                          ? completeTextStyle
                          : pendingTextStyle
                      }
                    >
                      {item.value}/{item.target}
                    </strong>
                  </div>
                );
              })}
            </div>

            <button
              className="primary-btn"
              style={{ width: "100%", marginTop: "22px" }}
              onClick={() => onNavigate("launchChecklist")}
            >
              Review Full Launch Checklist
            </button>
          </section>

          <section style={documentationPanelStyle}>
            <p className="eyebrow">DOCUMENTATION</p>

            <h2 style={sectionTitleStyle}>Verification Readiness</h2>

            <div style={documentationGridStyle}>
              <DocumentationCard
                label="COAs Ready"
                value={catalogStats.coaReady}
                total={catalogStats.variantCount}
              />

              <DocumentationCard
                label="Batch Records"
                value={catalogStats.batchReady}
                total={catalogStats.variantCount}
              />

              <DocumentationCard
                label="QR Records"
                value={catalogStats.qrReady}
                total={catalogStats.variantCount}
              />

              <DocumentationCard
                label="Images"
                value={catalogStats.imageCount}
                total={catalogStats.variantCount}
              />
            </div>

            <button
              className="secondary-btn"
              style={{ width: "100%", marginTop: "22px" }}
              onClick={() => onNavigate("coaManager")}
            >
              Open COA Manager
            </button>
          </section>
        </div>

        <section style={toolsPanelStyle}>
          <div style={toolsHeadingStyle}>
            <div>
              <p className="eyebrow">ADMIN TOOLS</p>

              <h2 style={sectionTitleStyle}>Business Controls</h2>
            </div>

            <p style={toolsTextStyle}>
              Open each management area from one central dashboard.
            </p>
          </div>

          <div style={toolsGridStyle}>
            <ToolCard
              icon="01"
              title="Product Manager"
              description="Review products, strengths, images, codes, pricing, and storefront readiness."
              buttonLabel="Manage Products"
              onClick={() => onNavigate("productManager")}
            />

            <ToolCard
              icon="02"
              title="COA Manager"
              description="Track certificates, batch records, QR verification, and documentation status."
              buttonLabel="Manage Documentation"
              onClick={() => onNavigate("coaManager")}
            />

            <ToolCard
              icon="03"
              title="Customer Manager"
              description="Review prototype customer accounts, research acceptance, and order activity."
              buttonLabel="Manage Customers"
              onClick={() => onNavigate("customerManager")}
            />

            <ToolCard
              icon="04"
              title="Site Settings"
              description="Manage storefront messages, contact details, availability, and website settings."
              buttonLabel="Open Settings"
              onClick={() => onNavigate("siteSettings")}
            />

            <ToolCard
              icon="05"
              title="Partner HQ"
              description="Review research partner activity, affiliate tools, applications, and rewards."
              buttonLabel="Open Partner HQ"
              onClick={() => onNavigate("partnerHQ")}
            />

            <ToolCard
              icon="06"
              title="Marketing Center"
              description="Prepare social posts, launch messages, promotions, and brand content."
              buttonLabel="Open Marketing"
              onClick={() => onNavigate("marketingCenter")}
            />
          </div>
        </section>

        <div style={bottomGridStyle}>
          <section style={noticePanelStyle}>
            <p className="eyebrow">STORE STATUS</p>

            <h2 style={smallTitleStyle}>Catalog Protected</h2>

            <p style={panelTextStyle}>
              Products without a valid price display Price Coming Soon and
              cannot be added to the cart.
            </p>

            <button
              className="secondary-btn"
              style={{ marginTop: "18px" }}
              onClick={() => onNavigate("products")}
            >
              Review Storefront
            </button>
          </section>

          <section style={noticePanelStyle}>
            <p className="eyebrow">RESEARCH NOTICE</p>

            <h2 style={smallTitleStyle}>Required Language Active</h2>

            <p style={panelTextStyle}>
              Catalog pages identify products as being for research use only
              and not intended for human consumption.
            </p>

            <button
              className="secondary-btn"
              style={{ marginTop: "18px" }}
              onClick={() => onNavigate("researchAgreement")}
            >
              Review Agreement
            </button>
          </section>
        </div>
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

function DocumentationCard({ label, value, total }) {
  const complete = value >= total;

  return (
    <div style={documentationCardStyle}>
      <span>{label}</span>

      <strong
        style={complete ? completeTextStyle : documentationValueStyle}
      >
        {value}/{total}
      </strong>
    </div>
  );
}

function ToolCard({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
}) {
  return (
    <article style={toolCardStyle}>
      <div style={toolIconStyle}>{icon}</div>

      <h3 style={toolTitleStyle}>{title}</h3>

      <p style={toolDescriptionStyle}>{description}</p>

      <button
        className="secondary-btn"
        style={{ width: "100%", marginTop: "auto" }}
        onClick={onClick}
      >
        {buttonLabel}
      </button>
    </article>
  );
}

const heroPanelStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "30px",
  flexWrap: "wrap",
  padding: "48px",
  marginBottom: "24px",
  borderRadius: "34px",
  border: "1px solid rgba(255,255,255,0.09)",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.2), transparent 42%), rgba(255,255,255,0.035)",
  boxShadow: "0 30px 90px rgba(0,0,0,0.48)",
};

const titleStyle = {
  marginBottom: "18px",
  fontSize: "64px",
  lineHeight: "1.02",
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

const heroActionsStyle = {
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
  padding: "24px",
  borderRadius: "24px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.035)",
  boxShadow: "0 24px 65px rgba(0,0,0,0.3)",
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
  fontSize: "36px",
};

const statDetailStyle = {
  color: "#8f9ba7",
  lineHeight: "1.5",
};

const dashboardGridStyle = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: "24px",
  marginBottom: "24px",
};

const launchPanelStyle = {
  padding: "30px",
  borderRadius: "28px",
  border: "1px solid rgba(255,255,255,0.09)",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.12), transparent 38%), rgba(255,255,255,0.035)",
};

const documentationPanelStyle = {
  padding: "30px",
  borderRadius: "28px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.035)",
};

const panelHeadingStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
};

const sectionTitleStyle = {
  color: "#ffffff",
  fontSize: "35px",
  lineHeight: "1.15",
};

const progressNumberStyle = {
  color: "#9ed8ff",
  fontSize: "36px",
};

const progressTrackStyle = {
  height: "14px",
  margin: "24px 0",
  overflow: "hidden",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.07)",
};

const progressFillStyle = {
  height: "100%",
  borderRadius: "999px",
  background:
    "linear-gradient(90deg, rgba(61,165,255,0.55), #9ed8ff)",
  boxShadow: "0 0 24px rgba(61,165,255,0.32)",
};

const checkListStyle = {
  display: "grid",
  gap: "10px",
};

const checkRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  padding: "13px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(0,0,0,0.22)",
  color: "#c8c8c8",
};

const checkIdentityStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const completeDotStyle = {
  display: "grid",
  width: "25px",
  height: "25px",
  placeItems: "center",
  borderRadius: "50%",
  background: "rgba(61,165,255,0.2)",
  color: "#9ed8ff",
  fontWeight: "900",
};

const pendingDotStyle = {
  display: "grid",
  width: "25px",
  height: "25px",
  placeItems: "center",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.07)",
  color: "#9ca8b3",
  fontWeight: "900",
};

const completeTextStyle = {
  color: "#9ed8ff",
};

const pendingTextStyle = {
  color: "#ffffff",
};

const documentationGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginTop: "22px",
};

const documentationCardStyle = {
  display: "grid",
  gap: "7px",
  padding: "17px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.23)",
  color: "#9ca8b3",
};

const documentationValueStyle = {
  color: "#ffffff",
  fontSize: "23px",
};

const toolsPanelStyle = {
  padding: "30px",
  marginBottom: "24px",
  borderRadius: "28px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.035)",
};

const toolsHeadingStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "20px",
  flexWrap: "wrap",
  marginBottom: "22px",
};

const toolsTextStyle = {
  maxWidth: "470px",
  color: "#9ca8b3",
  lineHeight: "1.7",
};

const toolsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "16px",
};

const toolCardStyle = {
  display: "flex",
  flexDirection: "column",
  minHeight: "260px",
  padding: "22px",
  borderRadius: "21px",
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.09), transparent 40%), rgba(0,0,0,0.22)",
};

const toolIconStyle = {
  display: "grid",
  width: "48px",
  height: "48px",
  placeItems: "center",
  marginBottom: "18px",
  borderRadius: "15px",
  border: "1px solid rgba(61,165,255,0.26)",
  background: "rgba(61,165,255,0.12)",
  color: "#9ed8ff",
  fontWeight: "900",
};

const toolTitleStyle = {
  marginBottom: "10px",
  color: "#ffffff",
  fontSize: "24px",
};

const toolDescriptionStyle = {
  marginBottom: "22px",
  color: "#aeb7bf",
  lineHeight: "1.7",
};

const bottomGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
};

const noticePanelStyle = {
  padding: "28px",
  borderRadius: "25px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.035)",
};

const smallTitleStyle = {
  marginBottom: "12px",
  color: "#ffffff",
  fontSize: "28px",
};

const panelTextStyle = {
  color: "#aeb7bf",
  lineHeight: "1.75",
};

export default MissionControl;
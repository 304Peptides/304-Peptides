import { useEffect, useState } from "react";

const storageKey = "304-site-settings";

const defaultSettings = {
  catalogEnabled: true,
  storeStatus: "coming-soon",
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

function Home({ onNavigate }) {
  const [settings, setSettings] = useState(loadSettings);

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

  const storeStatusLabel =
    settings.storeStatus === "open"
      ? "Store Open"
      : settings.storeStatus === "maintenance"
      ? "Maintenance Mode"
      : "Coming Soon";

  return (
    <main style={{ padding: "90px 60px" }}>
      <section
        style={{
          maxWidth: "1300px",
          margin: "0 auto",
        }}
      >
        <div style={heroPanelStyle}>
          <p className="eyebrow">
            PRECISION • TRANSPARENCY • QUALITY
          </p>

          <h1 style={titleStyle}>
            Built On Trust.
            <br />
            Backed By Quality.
          </h1>

          <p style={subtitleStyle}>
            A documentation-first research storefront built
            around clean organization, professional service,
            transparent product presentation, and consistent
            quality standards.
          </p>

          <div style={noticeStyle}>
            For Research Use Only. Not intended for human
            consumption.
          </div>

          <div
            style={
              settings.storeStatus === "open"
                ? openStatusStyle
                : statusStyle
            }
          >
            {storeStatusLabel}
          </div>

          <div style={buttonRowStyle}>
            {settings.catalogEnabled && (
              <button
                type="button"
                className="primary-btn"
                onClick={() => onNavigate("products")}
              >
                Browse Products
              </button>
            )}

            <button
              type="button"
              className={
                settings.catalogEnabled
                  ? "secondary-btn"
                  : "primary-btn"
              }
              onClick={() => onNavigate("quality")}
            >
              View Quality Standard
            </button>

            {!settings.catalogEnabled && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => onNavigate("contact")}
              >
                Contact Support
              </button>
            )}
          </div>
        </div>

        <div style={trustGridStyle}>
          <TrustCard
            icon="✓"
            title="Documentation First"
            description="Product organization built around clear details, accurate labeling, batch records, and COA workflow planning."
          />

          <TrustCard
            icon="⚡"
            title="Professional Service"
            description="A brand experience focused on clear communication, responsive support, and organized order handling."
          />

          <TrustCard
            icon="🔒"
            title="Trustworthy Experience"
            description="A storefront designed to feel clean, serious, consistent, and built around transparent research-use standards."
          />
        </div>

        <div style={splitPanelStyle}>
          <div style={splitLeftStyle}>
            <p className="eyebrow">WHY 304 PEPTIDES</p>

            <h2 style={sectionTitleStyle}>
              A Better Brand Experience
            </h2>

            <p style={sectionTextStyle}>
              The goal of 304 Peptides is to create a modern,
              organized, and trustworthy research-use brand.
              Every part of the experience is being built around
              transparency, documentation, consistency, and
              professional presentation.
            </p>

            <div style={bulletGridStyle}>
              <div style={bulletBoxStyle}>
                Clean product presentation
              </div>

              <div style={bulletBoxStyle}>
                Transparent product organization
              </div>

              <div style={bulletBoxStyle}>
                Professional customer support
              </div>

              <div style={bulletBoxStyle}>
                Documentation-first standards
              </div>
            </div>
          </div>

          <div style={splitRightStyle}>
            {settings.catalogEnabled ? (
              <div style={showcaseCardStyle}>
                <p className="eyebrow">
                  RESEARCH CATEGORIES
                </p>

                <h2 style={showcaseTitleStyle}>
                  Explore The Catalog
                </h2>

                <div style={categoryListStyle}>
                  <CategoryButton
                    label="Metabolic Research"
                    onClick={() =>
                      onNavigate("products")
                    }
                  />

                  <CategoryButton
                    label="Recovery Research"
                    onClick={() =>
                      onNavigate("products")
                    }
                  />

                  <CategoryButton
                    label="Performance Research"
                    onClick={() =>
                      onNavigate("products")
                    }
                  />

                  <CategoryButton
                    label="Cognitive Research"
                    onClick={() =>
                      onNavigate("products")
                    }
                  />
                </div>
              </div>
            ) : (
              <div style={showcaseCardStyle}>
                <p className="eyebrow">
                  CATALOG STATUS
                </p>

                <h2 style={showcaseTitleStyle}>
                  Catalog Temporarily Unavailable
                </h2>

                <p style={sectionTextStyle}>
                  Product browsing is currently disabled. Quality
                  information, research-use terms, frequently
                  asked questions, and customer support remain
                  available.
                </p>

                <div style={catalogDisabledNoticeStyle}>
                  Catalog access has been disabled in Site
                  Settings.
                </div>

                <div style={sideButtonStackStyle}>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => onNavigate("quality")}
                  >
                    View Quality Standard
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => onNavigate("faq")}
                  >
                    View FAQ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {settings.catalogEnabled ? (
          <div style={ctaPanelStyle}>
            <p className="eyebrow">
              READY TO EXPLORE?
            </p>

            <h2 style={ctaTitleStyle}>
              Explore The 304 Catalog
            </h2>

            <p style={ctaTextStyle}>
              Browse the current research catalog, review product
              details, and explore the structure supporting batch
              documentation, COA access, QR verification, and
              grouped strength options.
            </p>

            <button
              type="button"
              className="primary-btn"
              style={{ marginTop: "24px" }}
              onClick={() => onNavigate("products")}
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div style={ctaPanelStyle}>
            <p className="eyebrow">
              QUALITY BEFORE LAUNCH
            </p>

            <h2 style={ctaTitleStyle}>
              Trust Is Earned—Not Claimed.
            </h2>

            <p style={ctaTextStyle}>
              While the catalog is unavailable, review the quality
              standards, documentation plans, and research-use
              policies being developed for 304 Peptides.
            </p>

            <button
              type="button"
              className="primary-btn"
              style={{ marginTop: "24px" }}
              onClick={() => onNavigate("quality")}
            >
              Review Quality Standards
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function TrustCard({
  icon,
  title,
  description,
}) {
  return (
    <div style={trustCardStyle}>
      <div style={trustIconStyle}>{icon}</div>

      <h3 style={trustTitleStyle}>{title}</h3>

      <p style={trustTextStyle}>
        {description}
      </p>
    </div>
  );
}

function CategoryButton({
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      style={categoryButtonStyle}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

const heroPanelStyle = {
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.25), transparent 42%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "36px",
  padding: "78px 54px",
  boxShadow: "0 35px 90px rgba(0,0,0,0.5)",
  marginBottom: "28px",
};

const titleStyle = {
  fontSize: "74px",
  lineHeight: "1.02",
  marginBottom: "24px",
  background:
    "linear-gradient(180deg, #ffffff, #909090)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle = {
  maxWidth: "860px",
  margin: "0 auto",
  color: "#c8c8c8",
  fontSize: "20px",
  lineHeight: "1.85",
};

const noticeStyle = {
  display: "inline-flex",
  marginTop: "28px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "999px",
  padding: "14px 22px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const statusStyle = {
  width: "fit-content",
  margin: "14px auto 0",
  padding: "9px 14px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.055)",
  color: "#c8c8c8",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const openStatusStyle = {
  ...statusStyle,
  border: "1px solid rgba(61,165,255,0.38)",
  background: "rgba(61,165,255,0.14)",
  color: "#9ed8ff",
};

const buttonRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "28px",
};

const trustGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "20px",
  marginBottom: "28px",
};

const trustCardStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.12), transparent 35%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "28px",
  boxShadow: "0 28px 70px rgba(0,0,0,0.38)",
};

const trustIconStyle = {
  width: "54px",
  height: "54px",
  borderRadius: "16px",
  background: "rgba(61,165,255,0.14)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  fontWeight: "900",
  marginBottom: "18px",
};

const trustTitleStyle = {
  color: "#ffffff",
  fontSize: "24px",
  marginBottom: "12px",
};

const trustTextStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
};

const splitPanelStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.2fr) minmax(300px, 0.8fr)",
  gap: "28px",
  marginBottom: "28px",
};

const splitLeftStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.12), transparent 35%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "36px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
};

const splitRightStyle = {
  display: "flex",
};

const showcaseCardStyle = {
  width: "100%",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.14), transparent 35%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "36px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
};

const sectionTitleStyle = {
  fontSize: "42px",
  lineHeight: "1.1",
  marginBottom: "18px",
  background:
    "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const showcaseTitleStyle = {
  fontSize: "34px",
  lineHeight: "1.12",
  marginTop: "12px",
  marginBottom: "18px",
  background:
    "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const sectionTextStyle = {
  color: "#c8c8c8",
  lineHeight: "1.85",
  marginBottom: "24px",
};

const bulletGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const bulletBoxStyle = {
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  color: "#ffffff",
  borderRadius: "18px",
  padding: "16px",
  fontWeight: "800",
};

const categoryListStyle = {
  display: "grid",
  gap: "14px",
  marginTop: "18px",
};

const categoryButtonStyle = {
  width: "100%",
  padding: "18px",
  borderRadius: "18px",
  border: "1px solid rgba(61,165,255,0.22)",
  background: "rgba(61,165,255,0.10)",
  color: "#c8eaff",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
};

const catalogDisabledNoticeStyle = {
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.24)",
  color: "#aeb7bf",
  lineHeight: "1.65",
};

const sideButtonStackStyle = {
  display: "grid",
  gap: "12px",
  marginTop: "20px",
};

const ctaPanelStyle = {
  textAlign: "center",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  borderRadius: "30px",
  padding: "42px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
};

const ctaTitleStyle = {
  fontSize: "42px",
  lineHeight: "1.1",
  marginBottom: "18px",
  color: "#ffffff",
};

const ctaTextStyle = {
  maxWidth: "760px",
  margin: "0 auto",
  color: "#c8eaff",
  lineHeight: "1.8",
  fontWeight: "700",
};

export default Home;
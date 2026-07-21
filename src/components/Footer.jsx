import { useEffect, useState } from "react";
import brandLogo from "../assets/images/logo-nav.webp";

const storageKey = "304-site-settings";

const defaultSettings = {
  businessName: "304 Peptides",
  website: "304Peptides.com",
  supportEmail: "support@304peptides.com",
  businessLocation: "Shinnston, WV",
  supportHours: "Monday–Friday",
  responseTime: "Within 1–2 business days",
  footerNotice:
    "For Research Use Only. Not intended for human consumption.",
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

function Footer({ onNavigate = () => {} }) {
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

  function navigateTo(page) {
    onNavigate(page);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const currentYear = new Date().getFullYear();

  return (
    <footer style={footerStyle}>
      <div style={topGlowStyle}></div>

      <div style={footerContentStyle}>
        <div style={brandColumnStyle}>
          <button
            type="button"
            onClick={() => navigateTo("home")}
            style={brandButtonStyle}
          >
            <img
              src={brandLogo}
              alt=""
              aria-hidden="true"
              width="58"
              height="58"
              decoding="async"
              style={brandNumberStyle}
            />

            <span style={brandNameStyle}>
              {settings.businessName}
            </span>
          </button>

          <p style={brandTextStyle}>
            Precision-focused research products with clear labeling,
            documentation tracking, and transparent catalog information.
          </p>

          <div style={trustStatementStyle}>
            Trust is earned—not claimed.
          </div>
        </div>

        <div style={linkColumnStyle}>
          <span style={columnTitleStyle}>Explore</span>

          <FooterButton
            label="Home"
            onClick={() => navigateTo("home")}
          />

          <FooterButton
            label="Products"
            onClick={() => navigateTo("products")}
          />

          <FooterButton
            label="Quality"
            onClick={() => navigateTo("quality")}
          />

          <FooterButton
            label="Research Partners"
            onClick={() => navigateTo("partners")}
          />
        </div>

        <div style={linkColumnStyle}>
          <span style={columnTitleStyle}>
            Policies & Support
          </span>

          <FooterButton
            label="Frequently Asked Questions"
            onClick={() => navigateTo("faq")}
          />

          <FooterButton
            label="Contact"
            onClick={() => navigateTo("contact")}
          />

          <FooterButton
            label="Terms of Service"
            onClick={() => navigateTo("terms")}
          />

          <FooterButton
            label="Privacy Policy"
            onClick={() => navigateTo("privacy")}
          />

          <FooterButton
            label="Shipping Policy"
            onClick={() => navigateTo("shippingPolicy")}
          />

          <FooterButton
            label="Refund Policy"
            onClick={() => navigateTo("refundPolicy")}
          />

          <FooterButton
            label="Research Use Policy"
            onClick={() => navigateTo("researchAgreement")}
          />

          <FooterButton
            label="Affiliate Terms"
            onClick={() => navigateTo("affiliateTerms")}
          />

          <FooterButton
            label="Customer Login"
            onClick={() => navigateTo("login")}
          />
        </div>

        <div style={contactColumnStyle}>
          <span style={columnTitleStyle}>Contact</span>

          <div style={contactItemStyle}>
            <span style={contactLabelStyle}>Email</span>

            <a
              href={`mailto:${settings.supportEmail}`}
              style={contactLinkStyle}
            >
              {settings.supportEmail}
            </a>
          </div>

          <div style={contactItemStyle}>
            <span style={contactLabelStyle}>Location</span>

            <strong style={contactValueStyle}>
              {settings.businessLocation}
            </strong>
          </div>

          <div style={contactItemStyle}>
            <span style={contactLabelStyle}>Support Hours</span>

            <strong style={contactValueStyle}>
              {settings.supportHours}
            </strong>
          </div>

          <div style={contactItemStyle}>
            <span style={contactLabelStyle}>Response Time</span>

            <strong style={contactValueStyle}>
              {settings.responseTime}
            </strong>
          </div>
        </div>
      </div>

      <div style={researchNoticeStyle}>
        <span style={researchBadgeStyle}>
          Research Use Only
        </span>

        <strong style={researchTextStyle}>
          {settings.footerNotice ||
            "For Research Use Only. Not intended for human consumption."}
        </strong>
      </div>

      <div style={bottomBarStyle}>
        <span>
          © {currentYear} {settings.businessName}. All rights reserved.
        </span>

        <span>
          {settings.website} · {settings.businessLocation}
        </span>
      </div>
    </footer>
  );
}

function FooterButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={footerLinkStyle}
    >
      {label}
    </button>
  );
}

const footerStyle = {
  position: "relative",
  marginTop: "80px",
  padding: "64px 60px 28px",
  overflow: "hidden",
  background:
    "radial-gradient(circle at top center, rgba(61,165,255,0.12), transparent 38%), linear-gradient(180deg, #07090c, #020304)",
  borderTop: "1px solid rgba(255,255,255,0.08)",
};

const topGlowStyle = {
  position: "absolute",
  top: "-2px",
  left: "18%",
  right: "18%",
  height: "2px",
  background:
    "linear-gradient(90deg, transparent, rgba(61,165,255,0.85), transparent)",
  boxShadow: "0 0 24px rgba(61,165,255,0.4)",
};

const footerContentStyle = {
  maxWidth: "1300px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "1.4fr 0.75fr 0.9fr 1fr",
  gap: "42px",
};

const brandColumnStyle = {
  display: "grid",
  alignContent: "start",
};

const brandButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "12px",
  width: "fit-content",
  padding: 0,
  border: "none",
  background: "transparent",
  color: "#ffffff",
  cursor: "pointer",
};

const brandNumberStyle = {
  display: "block",
  width: "58px",
  height: "58px",
  flex: "0 0 58px",
  objectFit: "contain",
  borderRadius: "17px",
  boxShadow: "0 0 24px rgba(61,165,255,0.12)",
};

const brandNameStyle = {
  fontSize: "23px",
  fontWeight: "1000",
  letterSpacing: "0.3px",
};

const brandTextStyle = {
  maxWidth: "410px",
  marginTop: "20px",
  color: "#9ca8b3",
  fontSize: "14px",
  lineHeight: "1.75",
};

const trustStatementStyle = {
  width: "fit-content",
  marginTop: "20px",
  padding: "10px 14px",
  borderRadius: "999px",
  border: "1px solid rgba(61,165,255,0.22)",
  background: "rgba(61,165,255,0.08)",
  color: "#9ed8ff",
  fontSize: "12px",
  fontWeight: "900",
};

const linkColumnStyle = {
  display: "grid",
  alignContent: "start",
  gap: "12px",
};

const contactColumnStyle = {
  display: "grid",
  alignContent: "start",
  gap: "15px",
};

const columnTitleStyle = {
  marginBottom: "6px",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "1000",
  textTransform: "uppercase",
  letterSpacing: "1.3px",
};

const footerLinkStyle = {
  width: "fit-content",
  padding: 0,
  border: "none",
  background: "transparent",
  color: "#9ca8b3",
  fontSize: "14px",
  lineHeight: "1.5",
  textAlign: "left",
  cursor: "pointer",
};

const contactItemStyle = {
  display: "grid",
  gap: "4px",
};

const contactLabelStyle = {
  color: "#6f7c88",
  fontSize: "10px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const contactLinkStyle = {
  color: "#9ed8ff",
  fontSize: "14px",
  fontWeight: "800",
  textDecoration: "none",
  overflowWrap: "anywhere",
};

const contactValueStyle = {
  color: "#c8c8c8",
  fontSize: "14px",
  lineHeight: "1.5",
};

const researchNoticeStyle = {
  maxWidth: "1300px",
  margin: "42px auto 0",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "13px",
  flexWrap: "wrap",
  padding: "18px 22px",
  borderRadius: "18px",
  border: "1px solid rgba(61,165,255,0.24)",
  background: "rgba(61,165,255,0.08)",
  textAlign: "center",
};

const researchBadgeStyle = {
  padding: "7px 11px",
  borderRadius: "999px",
  background: "rgba(61,165,255,0.16)",
  color: "#9ed8ff",
  fontSize: "10px",
  fontWeight: "1000",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const researchTextStyle = {
  color: "#bfe7ff",
  fontSize: "13px",
  lineHeight: "1.6",
};

const bottomBarStyle = {
  maxWidth: "1300px",
  margin: "26px auto 0",
  paddingTop: "24px",
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
  borderTop: "1px solid rgba(255,255,255,0.07)",
  color: "#66727d",
  fontSize: "12px",
};

export default Footer;
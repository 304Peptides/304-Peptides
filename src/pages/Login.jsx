import { useEffect, useState } from "react";

const storageKey = "304-site-settings";

const defaultSettings = {
  accountCreationEnabled: true,
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

function Login({ onNavigate, onLogin }) {
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

  function handleLogin(event) {
    event.preventDefault();
    onLogin();
  }

  return (
    <main style={{ padding: "90px 60px" }}>
      <section
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div style={heroPanelStyle}>
          <p className="eyebrow">ACCOUNT ACCESS</p>

          <h1 style={titleStyle}>
            Login To 304
          </h1>

          <p style={subtitleStyle}>
            Access available pricing, cart features, checkout,
            order history, the Research Hub, and eligible Partner
            Program tools.
          </p>

          <div style={researchNoticeStyle}>
            For Research Use Only. Not intended for human
            consumption.
          </div>
        </div>

        <div style={loginGridStyle}>
          <form
            style={formPanelStyle}
            onSubmit={handleLogin}
          >
            <p className="eyebrow">LOGIN</p>

            <h2 style={sectionTitleStyle}>
              Research Account
            </h2>

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>
                Email Address
              </span>

              <input
                type="email"
                placeholder="Email Address"
                autoComplete="email"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>
                Password
              </span>

              <input
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                style={inputStyle}
              />
            </label>

            <div style={noticeBoxStyle}>
              This is prototype login only. Any email and
              password will unlock the test account experience.
              Production authentication will require secure
              backend account controls.
            </div>

            <button
              type="submit"
              className="primary-btn"
              style={{
                width: "100%",
                marginTop: "24px",
              }}
            >
              Login
            </button>

            {settings.accountCreationEnabled ? (
              <button
                type="button"
                className="secondary-btn"
                style={{
                  width: "100%",
                  marginTop: "14px",
                }}
                onClick={() =>
                  onNavigate("createAccount")
                }
              >
                Create Account
              </button>
            ) : (
              <div style={registrationDisabledStyle}>
                New account registration is currently disabled.
                Existing research customers may continue to log
                in.
              </div>
            )}
          </form>

          <aside style={sidePanelStyle}>
            <p className="eyebrow">ACCOUNT BENEFITS</p>

            <h2 style={sideTitleStyle}>
              What Login Unlocks
            </h2>

            <div style={benefitStackStyle}>
              <BenefitBox
                title="Product Pricing"
                description="View available account-only pricing after login."
              />

              <BenefitBox
                title="Cart And Checkout"
                description="Add available products to the cart and place prototype orders."
              />

              <BenefitBox
                title="Research Hub"
                description="Review order history and saved checkout details."
              />

              <BenefitBox
                title="Partner Program"
                description="Access eligible research partner tools after meeting program requirements."
              />
            </div>

            <div style={agreementBoxStyle}>
              <strong>Research-Use Reminder</strong>

              <p style={agreementTextStyle}>
                Products are for research use only and are not
                intended for human consumption.
              </p>

              <button
                type="button"
                className="secondary-btn"
                style={{
                  marginTop: "16px",
                  width: "100%",
                }}
                onClick={() =>
                  onNavigate("researchAgreement")
                }
              >
                View Research Agreement
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function BenefitBox({ title, description }) {
  return (
    <div style={benefitBoxStyle}>
      <strong>{title}</strong>

      <span>{description}</span>
    </div>
  );
}

const heroPanelStyle = {
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.2), transparent 42%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "56px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  marginBottom: "30px",
};

const titleStyle = {
  fontSize: "62px",
  lineHeight: "1.05",
  marginBottom: "20px",
  background:
    "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle = {
  maxWidth: "780px",
  margin: "0 auto",
  color: "#c8c8c8",
  fontSize: "19px",
  lineHeight: "1.8",
};

const researchNoticeStyle = {
  display: "inline-flex",
  marginTop: "26px",
  padding: "13px 19px",
  borderRadius: "999px",
  border: "1px solid rgba(61,165,255,0.28)",
  background: "rgba(61,165,255,0.12)",
  color: "#9ed8ff",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const loginGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) minmax(320px, 360px)",
  gap: "30px",
  alignItems: "start",
};

const formPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.14), transparent 35%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const sidePanelStyle = {
  position: "sticky",
  top: "110px",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.16), transparent 35%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "32px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const sectionTitleStyle = {
  fontSize: "36px",
  lineHeight: "1.12",
  marginBottom: "24px",
  background:
    "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const sideTitleStyle = {
  fontSize: "32px",
  lineHeight: "1.12",
  marginBottom: "24px",
  background:
    "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const fieldStyle = {
  display: "grid",
  gap: "8px",
  marginBottom: "16px",
};

const fieldLabelStyle = {
  color: "#c8c8c8",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
};

const inputStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.055)",
  color: "#ffffff",
  fontSize: "15px",
  outline: "none",
};

const noticeBoxStyle = {
  marginTop: "8px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "16px",
  padding: "16px",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: "1.6",
};

const registrationDisabledStyle = {
  marginTop: "14px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.24)",
  color: "#aeb7bf",
  fontSize: "14px",
  lineHeight: "1.65",
  textAlign: "center",
};

const benefitStackStyle = {
  display: "grid",
  gap: "14px",
};

const benefitBoxStyle = {
  display: "grid",
  gap: "6px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "16px",
  padding: "16px",
  color: "#c8c8c8",
  lineHeight: "1.55",
};

const agreementBoxStyle = {
  marginTop: "22px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#c8eaff",
  borderRadius: "16px",
  padding: "16px",
  lineHeight: "1.7",
};

const agreementTextStyle = {
  marginTop: "8px",
};

export default Login;
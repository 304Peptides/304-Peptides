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

function CreateAccount({ onNavigate, onLogin }) {
  const [settings, setSettings] = useState(loadSettings);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [researchConfirmed, setResearchConfirmed] =
    useState(false);

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

  const formComplete = Boolean(
    formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.email.trim() &&
      formData.password.trim()
  );

  const canCreateAccount =
    settings.accountCreationEnabled &&
    formComplete &&
    ageConfirmed &&
    researchConfirmed;

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleCreateAccount(event) {
    event.preventDefault();

    if (!canCreateAccount) {
      return;
    }

    onLogin();
  }

  if (!settings.accountCreationEnabled) {
    return (
      <main style={{ padding: "90px 60px" }}>
        <section style={disabledPanelStyle}>
          <p className="eyebrow">ACCOUNT CREATION</p>

          <h1 style={titleStyle}>
            New Accounts Are Temporarily Disabled
          </h1>

          <p style={subtitleStyle}>
            New research customer registration is not currently
            available. Existing customers may still use the login
            page.
          </p>

          <div style={disabledNoticeStyle}>
            Account creation has been disabled in Site Settings.
          </div>

          <div style={buttonRowStyle}>
            <button
              className="primary-btn"
              onClick={() => onNavigate("login")}
            >
              Existing Customer Login
            </button>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("home")}
            >
              Return Home
            </button>

            <button
              className="secondary-btn"
              onClick={() =>
                onNavigate("researchAgreement")
              }
            >
              Research Agreement
            </button>
          </div>
        </section>
      </main>
    );
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
          <p className="eyebrow">CREATE ACCOUNT</p>

          <h1 style={titleStyle}>
            Research Account Access
          </h1>

          <p style={subtitleStyle}>
            Create an account to access available pricing, order
            activity, the Research Hub, and eligible partner
            tools.
          </p>

          <div style={heroNoticeStyle}>
            For Research Use Only. Not intended for human
            consumption.
          </div>
        </div>

        <div style={accountGridStyle}>
          <form
            style={formPanelStyle}
            onSubmit={handleCreateAccount}
          >
            <p className="eyebrow">ACCOUNT DETAILS</p>

            <h2 style={sectionTitleStyle}>
              Create Your Account
            </h2>

            <div style={formGridStyle}>
              <Field
                name="firstName"
                label="First Name"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First Name"
                autoComplete="given-name"
              />

              <Field
                name="lastName"
                label="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                autoComplete="family-name"
              />

              <Field
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                autoComplete="email"
                fullWidth
              />

              <Field
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                autoComplete="new-password"
                fullWidth
              />
            </div>

            <div style={agreementPanelStyle}>
              <p className="eyebrow">
                REQUIRED CONFIRMATIONS
              </p>

              <h2 style={sectionTitleStyle}>
                Research-Use Agreement
              </h2>

              <div style={agreementInfoBoxStyle}>
                <strong>
                  Review Before Creating An Account
                </strong>

                <p style={agreementTextStyle}>
                  Account access is intended for customers who
                  understand the research-use nature of the site
                  and agree to follow all applicable
                  restrictions.
                </p>

                <button
                  type="button"
                  className="secondary-btn"
                  style={{ marginTop: "16px" }}
                  onClick={() =>
                    onNavigate("researchAgreement")
                  }
                >
                  View Research Agreement
                </button>
              </div>

              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(event) =>
                    setAgeConfirmed(event.target.checked)
                  }
                  style={checkboxStyle}
                />

                <span>
                  I confirm that I am at least 21 years old.
                </span>
              </label>

              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={researchConfirmed}
                  onChange={(event) =>
                    setResearchConfirmed(
                      event.target.checked
                    )
                  }
                  style={checkboxStyle}
                />

                <span>
                  I understand products are for research use
                  only and are not intended for human
                  consumption.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="primary-btn"
              style={{
                marginTop: "26px",
                width: "100%",
                opacity: canCreateAccount ? 1 : 0.45,
                cursor: canCreateAccount
                  ? "pointer"
                  : "not-allowed",
              }}
              disabled={!canCreateAccount}
            >
              Create Account
            </button>

            {!canCreateAccount && (
              <p style={helperTextStyle}>
                Complete all fields and required confirmations
                to create an account.
              </p>
            )}

            <p style={bottomTextStyle}>
              Already have an account?{" "}
              <button
                type="button"
                style={textButtonStyle}
                onClick={() => onNavigate("login")}
              >
                Login here
              </button>
            </p>
          </form>

          <aside style={sidePanelStyle}>
            <p className="eyebrow">ACCOUNT BENEFITS</p>

            <h2 style={sideTitleStyle}>
              Account Access
            </h2>

            <div style={benefitStackStyle}>
              <BenefitBox
                title="Pricing Access"
                description="View available account-only pricing after signing in."
              />

              <BenefitBox
                title="Cart And Checkout"
                description="Add available products to the cart when the storefront is open."
              />

              <BenefitBox
                title="Research Hub"
                description="Review saved checkout details and prototype order history."
              />

              <BenefitBox
                title="Partner Program"
                description="Apply for available research partner opportunities after becoming eligible."
              />
            </div>

            <div style={noticeBoxStyle}>
              This is prototype account creation only. Real
              customer accounts, encrypted passwords, email
              verification, recovery options, and security
              controls require a production backend.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({
  name,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  fullWidth = false,
}) {
  return (
    <label
      style={{
        ...fieldStyle,
        ...(fullWidth
          ? { gridColumn: "1 / -1" }
          : {}),
      }}
    >
      <span style={fieldLabelStyle}>{label}</span>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        style={inputStyle}
      />
    </label>
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

const disabledPanelStyle = {
  maxWidth: "900px",
  margin: "0 auto",
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.18), transparent 42%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "64px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
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

const heroNoticeStyle = {
  display: "inline-flex",
  marginTop: "28px",
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

const disabledNoticeStyle = {
  maxWidth: "640px",
  margin: "26px auto 0",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.24)",
  color: "#aeb7bf",
  lineHeight: "1.65",
};

const buttonRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "14px",
  flexWrap: "wrap",
  marginTop: "28px",
};

const accountGridStyle = {
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

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "16px",
};

const fieldStyle = {
  display: "grid",
  gap: "8px",
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

const agreementPanelStyle = {
  marginTop: "32px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "22px",
  padding: "26px",
};

const agreementInfoBoxStyle = {
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#c8eaff",
  borderRadius: "18px",
  padding: "18px",
  lineHeight: "1.7",
  marginBottom: "20px",
};

const agreementTextStyle = {
  marginTop: "9px",
  color: "#b8d8eb",
};

const checkboxRowStyle = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  color: "#c8c8c8",
  lineHeight: "1.7",
  marginTop: "16px",
  cursor: "pointer",
};

const checkboxStyle = {
  width: "20px",
  height: "20px",
  marginTop: "3px",
  accentColor: "#3da5ff",
  cursor: "pointer",
};

const helperTextStyle = {
  color: "#aaaaaa",
  fontSize: "13px",
  lineHeight: "1.6",
  marginTop: "14px",
  textAlign: "center",
};

const bottomTextStyle = {
  color: "#aaaaaa",
  marginTop: "22px",
  textAlign: "center",
};

const textButtonStyle = {
  background: "transparent",
  border: "none",
  color: "#9ed8ff",
  fontWeight: "900",
  cursor: "pointer",
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

const noticeBoxStyle = {
  marginTop: "22px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "16px",
  padding: "16px",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: "1.6",
};

export default CreateAccount;
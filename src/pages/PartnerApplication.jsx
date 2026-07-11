import { useState } from "react";

function PartnerApplication({ onNavigate, onSubmitApplication }) {
  const [formData, setFormData] = useState({
    desiredCode: "",
    name: "",
    email: "",
    socialHandle: "",
    platform: "Facebook",
    promotionPlan: "",
  });

  const [researchConfirmed, setResearchConfirmed] = useState(false);
  const [languageConfirmed, setLanguageConfirmed] = useState(false);
  const [selfPurchaseConfirmed, setSelfPurchaseConfirmed] = useState(false);

  const cleanCode = formData.desiredCode
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

  const trackingPreview = cleanCode
    ? `304peptides.com/?ref=${cleanCode}`
    : "304peptides.com/?ref=YOURCODE";

  const formComplete =
    formData.desiredCode &&
    formData.name &&
    formData.email &&
    formData.socialHandle &&
    formData.promotionPlan;

  const canSubmit =
    formComplete &&
    researchConfirmed &&
    languageConfirmed &&
    selfPurchaseConfirmed;

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmitApplication(cleanCode);
  }

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <button
          className="secondary-btn"
          style={{ marginBottom: "30px" }}
          onClick={() => onNavigate("dashboard")}
        >
          ← Back To Research Hub
        </button>

        <div style={heroPanelStyle}>
          <p className="eyebrow">PARTNER APPLICATION</p>

          <h1 style={titleStyle}>
            Apply For A Partner Code
          </h1>

          <p style={subtitleStyle}>
            Request a custom 304 Peptides partner code and agree to keep all
            promotion research-use focused, brand-safe, and compliant with the
            program rules.
          </p>
        </div>

        <div style={applicationGridStyle}>

          <form style={formPanelStyle} onSubmit={handleSubmit}>
            <p className="eyebrow">APPLICATION DETAILS</p>

            <h2 style={sectionTitleStyle}>
              Partner Information
            </h2>

            <div style={formGridStyle}>
              <input
                name="desiredCode"
                placeholder="Desired Partner Code"
                value={formData.desiredCode}
                onChange={handleChange}
                style={{ ...inputStyle, gridColumn: "1 / -1" }}
              />

              <input
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                style={inputStyle}
              />

              <input
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                style={inputStyle}
              />

              <select
                name="platform"
                value={formData.platform}
                onChange={handleChange}
                style={inputStyle}
              >
                <option>Facebook</option>
                <option>TikTok</option>
                <option>Instagram</option>
                <option>YouTube</option>
                <option>Telegram</option>
                <option>Other</option>
              </select>

              <input
                name="socialHandle"
                placeholder="Social Handle / Page Name"
                value={formData.socialHandle}
                onChange={handleChange}
                style={inputStyle}
              />

              <textarea
                name="promotionPlan"
                placeholder="How do you plan to promote 304 Peptides?"
                rows="7"
                value={formData.promotionPlan}
                onChange={handleChange}
                style={{
                  ...inputStyle,
                  gridColumn: "1 / -1",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={previewBoxStyle}>
              <span>Code Preview</span>
              <strong>{cleanCode || "YOURCODE"}</strong>
              <p>{trackingPreview}</p>
            </div>

            <div style={agreementPanelStyle}>
              <p className="eyebrow">REQUIRED AGREEMENTS</p>

              <h2 style={smallSectionTitleStyle}>
                Partner Rules
              </h2>

              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={researchConfirmed}
                  onChange={() => setResearchConfirmed(!researchConfirmed)}
                />

                <span>
                  I understand all promotion must stay research-use focused and
                  products are not intended for human consumption.
                </span>
              </label>

              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={languageConfirmed}
                  onChange={() => setLanguageConfirmed(!languageConfirmed)}
                />

                <span>
                  I agree not to make medical claims, dosing claims, treatment
                  claims, human-use claims, or before/after transformation claims.
                </span>
              </label>

              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={selfPurchaseConfirmed}
                  onChange={() => setSelfPurchaseConfirmed(!selfPurchaseConfirmed)}
                />

                <span>
                  I understand self-purchases do not earn commission or discounts,
                  even if they count toward prototype activity metrics.
                </span>
              </label>

              <button
                type="button"
                className="secondary-btn"
                style={{ marginTop: "20px" }}
                onClick={() => onNavigate("researchAgreement")}
              >
                View Research Agreement
              </button>
            </div>

            <button
              type="submit"
              className="primary-btn"
              style={{
                width: "100%",
                marginTop: "26px",
                opacity: canSubmit ? 1 : 0.45,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
              disabled={!canSubmit}
            >
              Submit Partner Application
            </button>

            {!canSubmit && (
              <p style={helperTextStyle}>
                Complete every field and required agreement to submit.
              </p>
            )}
          </form>

          <aside style={sidePanelStyle}>
            <p className="eyebrow">PROGRAM PREVIEW</p>

            <h2 style={sideTitleStyle}>
              What Happens Next
            </h2>

            <div style={stepStackStyle}>
              <div style={stepBoxStyle}>
                <strong>1. Application Submitted</strong>
                <span>Your requested code is saved to the prototype account.</span>
              </div>

              <div style={stepBoxStyle}>
                <strong>2. Partner HQ Unlocks</strong>
                <span>Preview your code, tracking link, and activity dashboard.</span>
              </div>

              <div style={stepBoxStyle}>
                <strong>3. Marketing Center</strong>
                <span>Use approved captions and research-use language.</span>
              </div>

              <div style={stepBoxStyle}>
                <strong>4. Rewards Later</strong>
                <span>Cash, store credit, leaderboards, and swag can be added later.</span>
              </div>
            </div>

            <div style={rewardBoxStyle}>
              <strong>Example Reward Choice</strong>

              <p>
                $100 cash payout or $125 boosted store credit. Final reward rules
                will need backend tracking and approval.
              </p>
            </div>

            <button
              className="secondary-btn"
              style={{ width: "100%", marginTop: "20px" }}
              onClick={() => onNavigate("partners")}
            >
              View Partner Program
            </button>
          </aside>

        </div>

        <div style={researchNoticeStyle}>
          For Research Use Only. Products are not intended for human consumption.
        </div>

      </section>
    </main>
  );
}

const heroPanelStyle = {
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61, 165, 255, 0.22), transparent 42%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "34px",
  padding: "64px 56px",
  boxShadow: "0 30px 90px rgba(0,0,0,0.5)",
  marginBottom: "30px",
};

const titleStyle = {
  fontSize: "62px",
  lineHeight: "1.05",
  marginBottom: "20px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
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

const applicationGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 360px",
  gap: "30px",
  alignItems: "start",
};

const formPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "30px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const sidePanelStyle = {
  position: "sticky",
  top: "110px",
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.16), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
  padding: "32px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const sectionTitleStyle = {
  fontSize: "38px",
  lineHeight: "1.12",
  marginBottom: "24px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const smallSectionTitleStyle = {
  fontSize: "30px",
  lineHeight: "1.12",
  marginBottom: "18px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const sideTitleStyle = {
  fontSize: "32px",
  lineHeight: "1.12",
  marginBottom: "20px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const inputStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  background: "rgba(255, 255, 255, 0.055)",
  color: "white",
  fontSize: "15px",
  outline: "none",
};

const previewBoxStyle = {
  display: "grid",
  gap: "8px",
  marginTop: "22px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "18px",
  padding: "18px",
};

const agreementPanelStyle = {
  marginTop: "28px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "22px",
  padding: "26px",
};

const checkboxRowStyle = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  color: "#c8c8c8",
  lineHeight: "1.7",
  marginTop: "16px",
};

const helperTextStyle = {
  color: "#aaa",
  fontSize: "13px",
  lineHeight: "1.6",
  marginTop: "14px",
  textAlign: "center",
};

const stepStackStyle = {
  display: "grid",
  gap: "14px",
};

const stepBoxStyle = {
  display: "grid",
  gap: "6px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "16px",
  padding: "16px",
  color: "#c8c8c8",
};

const rewardBoxStyle = {
  marginTop: "22px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#c8eaff",
  borderRadius: "16px",
  padding: "16px",
  lineHeight: "1.7",
};

const researchNoticeStyle = {
  marginTop: "30px",
  textAlign: "center",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "20px",
  padding: "20px",
  fontWeight: "900",
  lineHeight: "1.6",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

export default PartnerApplication;
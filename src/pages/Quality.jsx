function Quality({ onNavigate }) {
  const qualitySteps = [
    {
      title: "Clear Product Identity",
      text: "Each product is organized with a name, code name, strength, category, and research-use positioning.",
    },
    {
      title: "COA-First Presentation",
      text: "Product pages are designed to support COA access, batch status, and documentation visibility.",
    },
    {
      title: "QR Verification Ready",
      text: "Labels and product pages are structured for future QR verification tied to product and batch records.",
    },
    {
      title: "Research-Use Language",
      text: "The site avoids dosing, human-use claims, treatment claims, and personal-use instructions.",
    },
  ];

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1150px", margin: "0 auto" }}>

        <div style={heroPanelStyle}>
          <p className="eyebrow">QUALITY STANDARD</p>

          <h1 style={titleStyle}>
            Trust Is Earned
          </h1>

          <p style={subtitleStyle}>
            304 Peptides is being built around clean presentation, research-use
            language, transparent documentation, and a verification-ready customer
            experience.
          </p>

          <div style={buttonRowStyle}>
            <button
              className="primary-btn"
              onClick={() => onNavigate("products")}
            >
              Browse Products
            </button>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("researchAgreement")}
            >
              Research Agreement
            </button>
          </div>
        </div>

        <div style={statementPanelStyle}>
          <p className="eyebrow">304 STANDARD</p>

          <h2 style={sectionTitleStyle}>
            Precision. Transparency. Quality.
          </h2>

          <p style={textStyle}>
            Trust is our greatest product. Every page, label, COA placeholder,
            QR tool, checkout step, and account flow should reinforce the same
            message: research-use products need clear standards and honest
            presentation.
          </p>
        </div>

        <div style={stepsGridStyle}>
          {qualitySteps.map((step) => (
            <div key={step.title} style={stepCardStyle}>
              <h3 style={stepTitleStyle}>
                {step.title}
              </h3>

              <p style={stepTextStyle}>
                {step.text}
              </p>
            </div>
          ))}
        </div>

        <div style={verificationPanelStyle}>
          <div>
            <p className="eyebrow">VERIFICATION READY</p>

            <h2 style={sectionTitleStyle}>
              COA And QR Workflow
            </h2>

            <p style={textStyle}>
              The prototype includes COA Manager and QR placeholder tools for
              planning how future documentation can be organized. Before launch,
              each live product should have matching product records, batch
              records, COA files, and verification links.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={() => onNavigate("coaManager")}
          >
            Open COA Manager
          </button>
        </div>

        <div style={noticePanelStyle}>
          <strong>For Research Use Only.</strong>
          <span>
            {" "}Products are not intended for human consumption, medical use,
            diagnostic use, therapeutic use, or personal-use instruction.
          </span>
        </div>

      </section>
    </main>
  );
}

const heroPanelStyle = {
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61, 165, 255, 0.2), transparent 42%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "30px",
  padding: "56px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
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

const buttonRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "30px",
};

const statementPanelStyle = {
  textAlign: "center",
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
  padding: "42px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  marginBottom: "30px",
};

const sectionTitleStyle = {
  fontSize: "36px",
  lineHeight: "1.12",
  marginBottom: "20px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const textStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
};

const stepsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "18px",
  marginBottom: "30px",
};

const stepCardStyle = {
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "22px",
  padding: "24px",
  boxShadow: "0 24px 65px rgba(0,0,0,0.35)",
};

const stepTitleStyle = {
  color: "#ffffff",
  fontSize: "22px",
  lineHeight: "1.2",
  marginBottom: "14px",
};

const stepTextStyle = {
  color: "#c8c8c8",
  lineHeight: "1.7",
  fontSize: "15px",
};

const verificationPanelStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "24px",
  alignItems: "center",
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const noticePanelStyle = {
  marginTop: "30px",
  textAlign: "center",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "20px",
  padding: "20px",
  fontWeight: "900",
  lineHeight: "1.6",
};

export default Quality;
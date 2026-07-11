function ResearchAgreement({ onNavigate }) {
  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1100px", margin: "0 auto" }}>

        <button
          className="secondary-btn"
          style={{ marginBottom: "30px" }}
          onClick={() => onNavigate("home")}
        >
          ← Back Home
        </button>

        <div style={heroPanelStyle}>
          <p className="eyebrow">RESEARCH AGREEMENT</p>

          <h1 style={titleStyle}>
            Research-Use Terms
          </h1>

          <p style={subtitleStyle}>
            This page outlines the research-use standards, customer expectations,
            and policy placeholders for 304 Peptides.
          </p>
        </div>

        <div style={contentGridStyle}>

          <div style={panelStyle}>
            <p className="eyebrow">IMPORTANT NOTICE</p>

            <h2 style={sectionTitleStyle}>
              For Research Use Only
            </h2>

            <p style={textStyle}>
              Products displayed by 304 Peptides are intended for laboratory
              research purposes only. They are not intended for human consumption,
              medical use, diagnostic use, therapeutic use, or any use outside
              qualified research settings.
            </p>

            <div style={alertBoxStyle}>
              Not intended for human consumption.
            </div>
          </div>

          <div style={panelStyle}>
            <p className="eyebrow">CUSTOMER RESPONSIBILITY</p>

            <h2 style={sectionTitleStyle}>
              Buyer Acknowledgment
            </h2>

            <p style={textStyle}>
              Customers are responsible for understanding and following all
              applicable rules, restrictions, and research-use requirements in
              their area before purchasing or handling any product.
            </p>

            <p style={textStyle}>
              Customers should not use 304 Peptides content as medical advice,
              dosing guidance, treatment guidance, or personal-use instruction.
            </p>
          </div>

          <div style={panelStyle}>
            <p className="eyebrow">QUALITY STANDARD</p>

            <h2 style={sectionTitleStyle}>
              Documentation First
            </h2>

            <p style={textStyle}>
              304 Peptides is being built around clear labeling, product
              documentation, COA access, QR verification placeholders, and
              transparent product organization.
            </p>

            <button
              className="primary-btn"
              style={{ marginTop: "22px" }}
              onClick={() => onNavigate("quality")}
            >
              View Quality Standard
            </button>
          </div>

          <div style={panelStyle}>
            <p className="eyebrow">POLICY PLACEHOLDER</p>

            <h2 style={sectionTitleStyle}>
              Before Going Live
            </h2>

            <p style={textStyle}>
              This page is a prototype placeholder. Before launch, final terms,
              privacy policy, refund policy, shipping policy, payment rules, and
              compliance language should be reviewed by a qualified professional.
            </p>

            <button
              className="secondary-btn"
              style={{ marginTop: "22px" }}
              onClick={() => onNavigate("launchChecklist")}
            >
              Launch Checklist
            </button>
          </div>

        </div>

        <div style={bottomNoticeStyle}>
          This page is not legal advice. It is a prototype policy page for planning
          the customer experience and research-use language.
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

const contentGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "28px",
};

const panelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const sectionTitleStyle = {
  fontSize: "34px",
  lineHeight: "1.12",
  marginBottom: "20px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const textStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
  marginBottom: "16px",
};

const alertBoxStyle = {
  marginTop: "22px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "16px",
  padding: "16px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const bottomNoticeStyle = {
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

export default ResearchAgreement;
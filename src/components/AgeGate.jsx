import { useState } from "react";

function AgeGate({ onAccept }) {
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <div style={overlayStyle}>
        <div style={gateCardStyle}>
          <div style={badgeStyle}>304</div>

          <p className="eyebrow">ACCESS DENIED</p>

          <h1 style={titleStyle}>
            You Must Be 21+
          </h1>

          <p style={textStyle}>
            Access to this site is restricted to users who confirm they are at
            least 21 years old and understand that all products are for research
            use only.
          </p>

          <div style={alertBoxStyle}>
            Products are not intended for human consumption.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={gateCardStyle}>
        <div style={badgeStyle}>304</div>

        <p className="eyebrow">AGE VERIFICATION</p>

        <h1 style={titleStyle}>
          Enter 304 Peptides
        </h1>

        <p style={textStyle}>
          You must confirm you are at least 21 years old to enter this prototype
          storefront.
        </p>

        <div style={noticeBoxStyle}>
          <strong>For Research Use Only.</strong>
          <span>
            {" "}Products are not intended for human consumption, medical use,
            diagnostic use, therapeutic use, or personal-use instruction.
          </span>
        </div>

        <div style={buttonRowStyle}>
          <button
            className="primary-btn"
            onClick={onAccept}
          >
            I Am 21+ — Enter Site
          </button>

          <button
            className="secondary-btn"
            onClick={() => setDeclined(true)}
          >
            I Am Not 21
          </button>
        </div>

        <p style={smallTextStyle}>
          By entering, you acknowledge the research-use nature of this site and
          agree not to use site content as medical, dosing, or treatment guidance.
        </p>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.22), transparent 36%), rgba(0,0,0,0.94)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
};

const gateCardStyle = {
  width: "100%",
  maxWidth: "680px",
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61, 165, 255, 0.18), transparent 42%), rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "34px",
  padding: "52px",
  boxShadow: "0 40px 110px rgba(0,0,0,0.65)",
};

const badgeStyle = {
  width: "86px",
  height: "86px",
  margin: "0 auto 24px",
  borderRadius: "26px",
  background: "rgba(61,165,255,0.14)",
  border: "1px solid rgba(61,165,255,0.35)",
  color: "#9ed8ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "30px",
};

const titleStyle = {
  fontSize: "54px",
  lineHeight: "1.05",
  marginBottom: "20px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const textStyle = {
  color: "#c8c8c8",
  fontSize: "18px",
  lineHeight: "1.8",
  maxWidth: "560px",
  margin: "0 auto",
};

const noticeBoxStyle = {
  marginTop: "28px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#c8eaff",
  borderRadius: "18px",
  padding: "18px",
  lineHeight: "1.7",
};

const alertBoxStyle = {
  marginTop: "28px",
  background: "rgba(255,120,120,0.10)",
  border: "1px solid rgba(255,120,120,0.24)",
  color: "#ffd1d1",
  borderRadius: "18px",
  padding: "18px",
  fontWeight: "900",
  lineHeight: "1.6",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const buttonRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "30px",
};

const smallTextStyle = {
  color: "#888",
  fontSize: "13px",
  lineHeight: "1.7",
  marginTop: "26px",
};

export default AgeGate;
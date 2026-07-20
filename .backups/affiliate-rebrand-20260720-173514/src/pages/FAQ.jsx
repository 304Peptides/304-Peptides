function FAQ({ onNavigate }) {
  const faqs = [
    {
      question: "Are these products for human use?",
      answer:
        "No. Products are presented for research use only and are not intended for human consumption, medical use, diagnostic use, or treatment use.",
    },
    {
      question: "Why is pricing locked behind an account?",
      answer:
        "The prototype uses account-gated pricing to create a more controlled customer flow. Real pricing rules, approvals, and access controls can be added later.",
    },
    {
      question: "Where will COAs be shown?",
      answer:
        "Each product page is designed to support COA access, batch information, and QR verification. The current COA and QR tools are placeholders until a real backend is added.",
    },
    {
      question: "What does the QR code do?",
      answer:
        "In the prototype, QR codes are placeholders. Later, each QR code can connect to a product-specific verification page with matching COA and batch data.",
    },
    {
      question: "How does the Research Partner program work?",
      answer:
        "Customers can apply after their first completed order. Approved partners can receive a custom code, tracking link, marketing assets, and future reward options.",
    },
    {
      question: "Is this site ready to sell products?",
      answer:
        "No. This is still a front-end prototype. A live store will need backend development, legal/compliance review, payment approval, shipping rules, tax setup, and final policies.",
    },
  ];

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1100px", margin: "0 auto" }}>

        <div style={heroPanelStyle}>
          <p className="eyebrow">FAQ</p>

          <h1 style={titleStyle}>
            Common Questions
          </h1>

          <p style={subtitleStyle}>
            Answers about research-use language, account access, COA placeholders,
            QR verification, partner tools, and prototype limitations.
          </p>

          <div style={heroButtonRowStyle}>
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

        <div style={faqGridStyle}>
          {faqs.map((faq) => (
            <div key={faq.question} style={faqCardStyle}>
              <h2 style={questionStyle}>
                {faq.question}
              </h2>

              <p style={answerStyle}>
                {faq.answer}
              </p>
            </div>
          ))}
        </div>

        <div style={noticePanelStyle}>
          <p className="eyebrow">RESEARCH-USE STANDARD</p>

          <h2 style={sectionTitleStyle}>
            Review Before Ordering
          </h2>

          <p style={noticeTextStyle}>
            Customers should review the Research Agreement before creating an account
            or placing a test order. Products are for research use only and are not
            intended for human consumption.
          </p>

          <div style={noticeButtonsStyle}>
            <button
              className="primary-btn"
              onClick={() => onNavigate("researchAgreement")}
            >
              View Research Agreement
            </button>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("contact")}
            >
              Contact Support
            </button>
          </div>
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

const heroButtonRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "30px",
};

const faqGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
};

const faqCardStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.12), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "24px",
  padding: "30px",
  boxShadow: "0 24px 65px rgba(0,0,0,0.35)",
};

const questionStyle = {
  fontSize: "26px",
  lineHeight: "1.18",
  marginBottom: "16px",
  color: "#ffffff",
};

const answerStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
};

const noticePanelStyle = {
  marginTop: "30px",
  textAlign: "center",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  borderRadius: "28px",
  padding: "42px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
};

const sectionTitleStyle = {
  fontSize: "36px",
  lineHeight: "1.12",
  marginBottom: "20px",
  color: "#ffffff",
};

const noticeTextStyle = {
  maxWidth: "760px",
  margin: "0 auto",
  color: "#c8eaff",
  lineHeight: "1.8",
  fontWeight: "700",
};

const noticeButtonsStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "28px",
};

export default FAQ;
import { useEffect, useState } from "react";

const storageKey = "304-site-settings";

const defaultSettings = {
  businessName: "304 Peptides",
  supportEmail: "support@304peptides.com",
  businessLocation: "Shinnston, WV",
  supportHours: "Monday–Friday",
  responseTime: "Within 1–2 business days",
  contactMessage:
    "Questions about products, documentation, orders, or research accounts can be sent to our support team.",
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

function Contact({ onNavigate = () => {} }) {
  const [settings, setSettings] = useState(loadSettings);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    orderNumber: "",
    topic: "General Question",
    message: "",
  });
  const [formMessage, setFormMessage] = useState("");

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

    window.addEventListener("storage", handleStorageChange);

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

  function updateField(field, value) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));

    setFormMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.message.trim()
    ) {
      setFormMessage(
        "Please enter your name, email address, and message."
      );

      return;
    }

    const subject = encodeURIComponent(
      `${formData.topic} — ${formData.name}`
    );

    const body = encodeURIComponent(
      [
        `Name: ${formData.name}`,
        `Email: ${formData.email}`,
        formData.orderNumber
          ? `Order Number: ${formData.orderNumber}`
          : "",
        `Topic: ${formData.topic}`,
        "",
        "Message:",
        formData.message,
        "",
        "Submitted from the 304 Peptides contact page.",
      ]
        .filter(Boolean)
        .join("\n")
    );

    window.location.href =
      `mailto:${settings.supportEmail}` +
      `?subject=${subject}&body=${body}`;

    setFormMessage(
      "Your email application should open with the message prepared."
    );
  }

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1250px", margin: "0 auto" }}>
        <div style={heroPanelStyle}>
          <p className="eyebrow">CUSTOMER SUPPORT</p>

          <h1 style={titleStyle}>Contact 304 Peptides</h1>

          <p style={subtitleStyle}>
            {settings.contactMessage}
          </p>

          <div style={heroNoticeStyle}>
            For Research Use Only. Not intended for human consumption.
          </div>
        </div>

        <div style={contactGridStyle}>
          <section style={formPanelStyle}>
            <p className="eyebrow">SEND A MESSAGE</p>

            <h2 style={sectionTitleStyle}>
              How Can We Help?
            </h2>

            <p style={panelTextStyle}>
              Complete the form below and your email application will
              open with the message prepared for our support team.
            </p>

            <form
              onSubmit={handleSubmit}
              style={formStyle}
            >
              <div style={fieldGridStyle}>
                <Field
                  label="Your Name"
                  value={formData.name}
                  onChange={(value) =>
                    updateField("name", value)
                  }
                  placeholder="Enter your name"
                  required
                />

                <Field
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(value) =>
                    updateField("email", value)
                  }
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div style={fieldGridStyle}>
                <Field
                  label="Order Number"
                  value={formData.orderNumber}
                  onChange={(value) =>
                    updateField("orderNumber", value)
                  }
                  placeholder="Optional"
                />

                <label style={fieldStyle}>
                  <span style={fieldLabelStyle}>
                    Contact Topic
                  </span>

                  <select
                    value={formData.topic}
                    onChange={(event) =>
                      updateField(
                        "topic",
                        event.target.value
                      )
                    }
                    style={inputStyle}
                  >
                    <option>General Question</option>
                    <option>Product Documentation</option>
                    <option>Certificate Of Analysis</option>
                    <option>Existing Order</option>
                    <option>Account Support</option>
                    <option>Research Partner Program</option>
                    <option>Website Support</option>
                  </select>
                </label>
              </div>

              <label style={fieldStyle}>
                <span style={fieldLabelStyle}>
                  Message
                </span>

                <textarea
                  value={formData.message}
                  onChange={(event) =>
                    updateField(
                      "message",
                      event.target.value
                    )
                  }
                  placeholder="Enter your question or message..."
                  rows={7}
                  style={textareaStyle}
                  required
                />
              </label>

              {formMessage && (
                <div style={formMessageStyle}>
                  {formMessage}
                </div>
              )}

              <button
                className="primary-btn"
                type="submit"
                style={{ width: "100%" }}
              >
                Open Email Message
              </button>
            </form>
          </section>

          <aside style={informationColumnStyle}>
            <section style={informationPanelStyle}>
              <p className="eyebrow">SUPPORT INFORMATION</p>

              <h2 style={sectionTitleStyle}>
                Contact Details
              </h2>

              <ContactItem
                label="Support Email"
                value={settings.supportEmail}
                link={`mailto:${settings.supportEmail}`}
              />

              <ContactItem
                label="Business Location"
                value={settings.businessLocation}
              />

              <ContactItem
                label="Support Hours"
                value={settings.supportHours}
              />

              <ContactItem
                label="Expected Response"
                value={settings.responseTime}
              />

              <a
                href={`mailto:${settings.supportEmail}`}
                style={directEmailButtonStyle}
              >
                Email Support Directly
              </a>
            </section>

            <section style={helpPanelStyle}>
              <p className="eyebrow">QUICK HELP</p>

              <h2 style={smallTitleStyle}>
                Find Answers Faster
              </h2>

              <p style={panelTextStyle}>
                Review common account, documentation, product, and
                research-use questions before contacting support.
              </p>

              <button
                className="secondary-btn"
                style={{ width: "100%", marginTop: "18px" }}
                onClick={() => onNavigate("faq")}
              >
                View Frequently Asked Questions
              </button>
            </section>

            <section style={researchPanelStyle}>
              <span style={researchBadgeStyle}>
                Research Use Only
              </span>

              <strong style={researchTitleStyle}>
                Product-use questions cannot be answered.
              </strong>

              <p style={researchTextStyle}>
                Support is limited to catalog information,
                documentation, accounts, website access, and order
                assistance.
              </p>

              <button
                className="secondary-btn"
                style={{ width: "100%", marginTop: "18px" }}
                onClick={() =>
                  onNavigate("researchAgreement")
                }
              >
                Review Research Agreement
              </button>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <label style={fieldStyle}>
      <span style={fieldLabelStyle}>{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        style={inputStyle}
      />
    </label>
  );
}

function ContactItem({ label, value, link }) {
  const content = link ? (
    <a href={link} style={contactLinkStyle}>
      {value}
    </a>
  ) : (
    <strong style={contactValueStyle}>{value}</strong>
  );

  return (
    <div style={contactItemStyle}>
      <span style={contactLabelStyle}>{label}</span>

      {content}
    </div>
  );
}

const heroPanelStyle = {
  textAlign: "center",
  padding: "64px 56px",
  marginBottom: "28px",
  borderRadius: "34px",
  border: "1px solid rgba(255,255,255,0.09)",
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.2), transparent 44%), rgba(255,255,255,0.035)",
  boxShadow: "0 30px 90px rgba(0,0,0,0.48)",
};

const titleStyle = {
  marginBottom: "22px",
  fontSize: "68px",
  lineHeight: "1.03",
  background:
    "linear-gradient(180deg, #ffffff, #8f8f8f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle = {
  maxWidth: "820px",
  margin: "0 auto",
  color: "#c8c8c8",
  fontSize: "19px",
  lineHeight: "1.85",
};

const heroNoticeStyle = {
  display: "inline-flex",
  marginTop: "28px",
  padding: "13px 20px",
  borderRadius: "999px",
  border: "1px solid rgba(61,165,255,0.28)",
  background: "rgba(61,165,255,0.12)",
  color: "#9ed8ff",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const contactGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.25fr) minmax(300px, 0.75fr)",
  gap: "26px",
  alignItems: "start",
};

const formPanelStyle = {
  padding: "34px",
  borderRadius: "29px",
  border: "1px solid rgba(255,255,255,0.09)",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.1), transparent 38%), rgba(255,255,255,0.035)",
  boxShadow: "0 28px 75px rgba(0,0,0,0.38)",
};

const sectionTitleStyle = {
  marginBottom: "14px",
  color: "#ffffff",
  fontSize: "36px",
  lineHeight: "1.15",
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

const formStyle = {
  display: "grid",
  gap: "18px",
  marginTop: "26px",
};

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
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
  padding: "15px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "#ffffff",
  fontSize: "15px",
  outline: "none",
};

const textareaStyle = {
  ...inputStyle,
  resize: "vertical",
  minHeight: "170px",
  fontFamily: "inherit",
  lineHeight: "1.65",
};

const formMessageStyle = {
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid rgba(61,165,255,0.24)",
  background: "rgba(61,165,255,0.09)",
  color: "#9ed8ff",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: "1.6",
};

const informationColumnStyle = {
  display: "grid",
  gap: "20px",
};

const informationPanelStyle = {
  padding: "28px",
  borderRadius: "25px",
  border: "1px solid rgba(255,255,255,0.09)",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.1), transparent 42%), rgba(255,255,255,0.035)",
};

const contactItemStyle = {
  display: "grid",
  gap: "5px",
  padding: "15px 0",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
};

const contactLabelStyle = {
  color: "#75818c",
  fontSize: "10px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const contactValueStyle = {
  color: "#ffffff",
  fontSize: "16px",
  lineHeight: "1.5",
};

const contactLinkStyle = {
  color: "#9ed8ff",
  fontSize: "16px",
  fontWeight: "900",
  lineHeight: "1.5",
  textDecoration: "none",
  overflowWrap: "anywhere",
};

const directEmailButtonStyle = {
  display: "block",
  marginTop: "22px",
  padding: "14px 18px",
  borderRadius: "14px",
  border: "1px solid rgba(61,165,255,0.3)",
  background: "rgba(61,165,255,0.14)",
  color: "#9ed8ff",
  fontWeight: "900",
  textAlign: "center",
  textDecoration: "none",
};

const helpPanelStyle = {
  padding: "26px",
  borderRadius: "24px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.035)",
};

const researchPanelStyle = {
  padding: "26px",
  borderRadius: "24px",
  border: "1px solid rgba(61,165,255,0.24)",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.13), transparent 46%), rgba(255,255,255,0.035)",
};

const researchBadgeStyle = {
  display: "inline-flex",
  marginBottom: "15px",
  padding: "7px 11px",
  borderRadius: "999px",
  background: "rgba(61,165,255,0.15)",
  color: "#9ed8ff",
  fontSize: "10px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const researchTitleStyle = {
  display: "block",
  marginBottom: "10px",
  color: "#ffffff",
  fontSize: "20px",
  lineHeight: "1.4",
};

const researchTextStyle = {
  color: "#aeb7bf",
  fontSize: "14px",
  lineHeight: "1.7",
};

export default Contact;
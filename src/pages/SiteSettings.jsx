import { useMemo, useState } from "react";

const storageKey = "304-site-settings";

const defaultSettings = {
  businessName: "304 Peptides",
  website: "304Peptides.com",
  supportEmail: "support@304peptides.com",
  businessLocation: "Shinnston, WV",
  supportHours: "Monday–Friday",
  responseTime: "Within 1–2 business days",

  storeStatus: "coming-soon",
  catalogEnabled: true,
  accountCreationEnabled: true,
  guestPricingEnabled: false,

  announcementEnabled: true,
  announcementMessage:
    "304 Peptides is preparing for launch. Research Use Only.",

  footerNotice:
    "For Research Use Only. Not intended for human consumption.",

  contactMessage:
    "Questions about products, documentation, orders, or research accounts can be sent to our support team.",
};

function loadSavedSettings() {
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

function SiteSettings({ onNavigate = () => {} }) {
  const [settings, setSettings] = useState(loadSavedSettings);
  const [savedSettings, setSavedSettings] = useState(loadSavedSettings);
  const [saveMessage, setSaveMessage] = useState("");

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings]
  );

  function updateSetting(field, value) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }));

    setSaveMessage("");
  }

  function saveSettings() {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(settings)
      );

      setSavedSettings(settings);
      setSaveMessage("Settings saved successfully.");

      window.dispatchEvent(
        new CustomEvent("304-site-settings-updated", {
          detail: settings,
        })
      );
    } catch {
      setSaveMessage(
        "The settings could not be saved in this browser."
      );
    }
  }

  function resetSettings() {
    const shouldReset = window.confirm(
      "Reset all site settings to the default values?"
    );

    if (!shouldReset) {
      return;
    }

    setSettings(defaultSettings);
    setSaveMessage(
      "Defaults restored. Press Save Settings to keep them."
    );
  }

  function getStoreStatusLabel() {
    switch (settings.storeStatus) {
      case "open":
        return "Store Open";
      case "maintenance":
        return "Maintenance Mode";
      default:
        return "Coming Soon";
    }
  }

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1250px", margin: "0 auto" }}>
        <div style={heroPanelStyle}>
          <div>
            <p className="eyebrow">304 PEPTIDES ADMIN</p>

            <h1 style={titleStyle}>Site Settings</h1>

            <p style={subtitleStyle}>
              Manage storefront availability, business information,
              customer contact details, announcements, and research-use
              notices.
            </p>
          </div>

          <div style={heroActionsStyle}>
            <button
              className="secondary-btn"
              onClick={() => onNavigate("missionControl")}
            >
              Back To Mission Control
            </button>

            <button
              className="primary-btn"
              onClick={() => onNavigate("home")}
            >
              View Website
            </button>
          </div>
        </div>

        <div style={statusBarStyle}>
          <div>
            <span style={statusLabelStyle}>Current Store Status</span>

            <strong style={statusValueStyle}>
              {getStoreStatusLabel()}
            </strong>
          </div>

          <div>
            <span style={statusLabelStyle}>Save Status</span>

            <strong
              style={
                hasUnsavedChanges
                  ? unsavedTextStyle
                  : savedTextStyle
              }
            >
              {hasUnsavedChanges
                ? "Unsaved Changes"
                : "All Changes Saved"}
            </strong>
          </div>

          <div>
            <span style={statusLabelStyle}>Announcement</span>

            <strong style={statusValueStyle}>
              {settings.announcementEnabled ? "Enabled" : "Disabled"}
            </strong>
          </div>
        </div>

        <div style={settingsGridStyle}>
          <section style={panelStyle}>
            <p className="eyebrow">BUSINESS DETAILS</p>

            <h2 style={sectionTitleStyle}>Company Information</h2>

            <div style={fieldGridStyle}>
              <Field
                label="Business Name"
                value={settings.businessName}
                onChange={(value) =>
                  updateSetting("businessName", value)
                }
              />

              <Field
                label="Website"
                value={settings.website}
                onChange={(value) =>
                  updateSetting("website", value)
                }
              />

              <Field
                label="Support Email"
                type="email"
                value={settings.supportEmail}
                onChange={(value) =>
                  updateSetting("supportEmail", value)
                }
              />

              <Field
                label="Business Location"
                value={settings.businessLocation}
                onChange={(value) =>
                  updateSetting("businessLocation", value)
                }
              />

              <Field
                label="Support Hours"
                value={settings.supportHours}
                onChange={(value) =>
                  updateSetting("supportHours", value)
                }
              />

              <Field
                label="Expected Response Time"
                value={settings.responseTime}
                onChange={(value) =>
                  updateSetting("responseTime", value)
                }
              />
            </div>
          </section>

          <section style={panelStyle}>
            <p className="eyebrow">STOREFRONT STATUS</p>

            <h2 style={sectionTitleStyle}>Store Availability</h2>

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Store Status</span>

              <select
                value={settings.storeStatus}
                onChange={(event) =>
                  updateSetting(
                    "storeStatus",
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="coming-soon">
                  Coming Soon
                </option>

                <option value="open">
                  Store Open
                </option>

                <option value="maintenance">
                  Maintenance Mode
                </option>
              </select>
            </label>

            <div style={toggleListStyle}>
              <ToggleSetting
                label="Enable Product Catalog"
                description="Allow visitors to browse the research-use product catalog."
                checked={settings.catalogEnabled}
                onChange={(checked) =>
                  updateSetting("catalogEnabled", checked)
                }
              />

              <ToggleSetting
                label="Enable Account Creation"
                description="Allow visitors to create new research customer accounts."
                checked={settings.accountCreationEnabled}
                onChange={(checked) =>
                  updateSetting(
                    "accountCreationEnabled",
                    checked
                  )
                }
              />

              <ToggleSetting
                label="Show Pricing To Guests"
                description="Allow pricing to appear before a customer signs into an account."
                checked={settings.guestPricingEnabled}
                onChange={(checked) =>
                  updateSetting(
                    "guestPricingEnabled",
                    checked
                  )
                }
              />
            </div>

            <div style={protectionNoticeStyle}>
              Products without a valid price will continue to display
              Price Coming Soon and remain disabled.
            </div>
          </section>
        </div>

        <section style={panelStyle}>
          <div style={panelHeadingStyle}>
            <div>
              <p className="eyebrow">SITE ANNOUNCEMENT</p>

              <h2 style={sectionTitleStyle}>
                Announcement Bar
              </h2>
            </div>

            <ToggleSetting
              label="Announcement Enabled"
              description="Show the announcement message across the website."
              checked={settings.announcementEnabled}
              onChange={(checked) =>
                updateSetting("announcementEnabled", checked)
              }
              compact
            />
          </div>

          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>
              Announcement Message
            </span>

            <textarea
              value={settings.announcementMessage}
              onChange={(event) =>
                updateSetting(
                  "announcementMessage",
                  event.target.value
                )
              }
              rows={4}
              style={textareaStyle}
            />
          </label>

          <div style={previewPanelStyle}>
            <span style={previewLabelStyle}>
              Announcement Preview
            </span>

            <div
              style={
                settings.announcementEnabled
                  ? announcementPreviewStyle
                  : disabledAnnouncementStyle
              }
            >
              {settings.announcementEnabled
                ? settings.announcementMessage ||
                  "Announcement message is empty."
                : "Announcement bar is currently disabled."}
            </div>
          </div>
        </section>

        <div style={settingsGridStyle}>
          <section style={panelStyle}>
            <p className="eyebrow">CUSTOMER CONTACT</p>

            <h2 style={sectionTitleStyle}>Contact Message</h2>

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>
                Contact Page Message
              </span>

              <textarea
                value={settings.contactMessage}
                onChange={(event) =>
                  updateSetting(
                    "contactMessage",
                    event.target.value
                  )
                }
                rows={7}
                style={textareaStyle}
              />
            </label>

            <div style={contactPreviewStyle}>
              <span>{settings.contactMessage}</span>

              <strong>{settings.supportEmail}</strong>

              <small>
                {settings.supportHours} ·{" "}
                {settings.responseTime}
              </small>
            </div>
          </section>

          <section style={panelStyle}>
            <p className="eyebrow">RESEARCH NOTICE</p>

            <h2 style={sectionTitleStyle}>Footer Disclaimer</h2>

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>
                Research-Use Notice
              </span>

              <textarea
                value={settings.footerNotice}
                onChange={(event) =>
                  updateSetting(
                    "footerNotice",
                    event.target.value
                  )
                }
                rows={7}
                style={textareaStyle}
              />
            </label>

            <div style={researchPreviewStyle}>
              {settings.footerNotice ||
                "Research-use notice is empty."}
            </div>
          </section>
        </div>

        <section style={savePanelStyle}>
          <div>
            <p className="eyebrow">SAVE CHANGES</p>

            <h2 style={saveTitleStyle}>
              {hasUnsavedChanges
                ? "You Have Unsaved Changes"
                : "Settings Are Up To Date"}
            </h2>

            <p style={saveTextStyle}>
              Saved settings will remain available after refreshing
              or reopening the website in this browser.
            </p>

            {saveMessage && (
              <div style={saveMessageStyle}>
                {saveMessage}
              </div>
            )}
          </div>

          <div style={saveButtonRowStyle}>
            <button
              type="button"
              style={resetButtonStyle}
              onClick={resetSettings}
            >
              Restore Defaults
            </button>

            <button
              className="primary-btn"
              disabled={!hasUnsavedChanges}
              onClick={saveSettings}
              style={
                !hasUnsavedChanges
                  ? disabledSaveButtonStyle
                  : undefined
              }
            >
              Save Settings
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}) {
  return (
    <label style={fieldStyle}>
      <span style={fieldLabelStyle}>{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
  compact = false,
}) {
  return (
    <label
      style={
        compact
          ? compactToggleStyle
          : toggleSettingStyle
      }
    >
      <span style={toggleTextStyle}>
        <strong style={toggleTitleStyle}>{label}</strong>

        <small style={toggleDescriptionStyle}>
          {description}
        </small>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        style={checkboxStyle}
      />
    </label>
  );
}

const heroPanelStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "30px",
  flexWrap: "wrap",
  padding: "48px",
  marginBottom: "24px",
  borderRadius: "34px",
  border: "1px solid rgba(255,255,255,0.09)",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.2), transparent 42%), rgba(255,255,255,0.035)",
  boxShadow: "0 30px 90px rgba(0,0,0,0.48)",
};

const titleStyle = {
  marginBottom: "18px",
  fontSize: "64px",
  lineHeight: "1.02",
  background: "linear-gradient(180deg, #ffffff, #8f8f8f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle = {
  maxWidth: "760px",
  color: "#c8c8c8",
  fontSize: "18px",
  lineHeight: "1.8",
};

const heroActionsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
};

const statusBarStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "24px",
  padding: "20px",
  borderRadius: "22px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.035)",
};

const statusLabelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#8f9ba7",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const statusValueStyle = {
  color: "#ffffff",
  fontSize: "18px",
};

const savedTextStyle = {
  color: "#9ed8ff",
  fontSize: "18px",
};

const unsavedTextStyle = {
  color: "#ffffff",
  fontSize: "18px",
};

const settingsGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
  marginBottom: "24px",
};

const panelStyle = {
  padding: "30px",
  marginBottom: "24px",
  borderRadius: "28px",
  border: "1px solid rgba(255,255,255,0.09)",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.08), transparent 42%), rgba(255,255,255,0.035)",
};

const sectionTitleStyle = {
  marginBottom: "24px",
  color: "#ffffff",
  fontSize: "34px",
  lineHeight: "1.15",
};

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const fieldStyle = {
  display: "grid",
  gap: "8px",
};

const fieldLabelStyle = {
  color: "#c8c8c8",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.7px",
};

const inputStyle = {
  width: "100%",
  padding: "15px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.24)",
  color: "#ffffff",
  fontSize: "15px",
  outline: "none",
};

const textareaStyle = {
  ...inputStyle,
  resize: "vertical",
  lineHeight: "1.7",
  fontFamily: "inherit",
};

const toggleListStyle = {
  display: "grid",
  gap: "12px",
};

const toggleSettingStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.22)",
  cursor: "pointer",
};

const compactToggleStyle = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  cursor: "pointer",
};

const toggleTextStyle = {
  display: "grid",
  gap: "5px",
};

const toggleTitleStyle = {
  color: "#ffffff",
  fontSize: "15px",
};

const toggleDescriptionStyle = {
  color: "#8f9ba7",
  lineHeight: "1.5",
};

const checkboxStyle = {
  width: "22px",
  height: "22px",
  accentColor: "#3da5ff",
  cursor: "pointer",
};

const protectionNoticeStyle = {
  marginTop: "18px",
  padding: "15px",
  borderRadius: "15px",
  border: "1px solid rgba(61,165,255,0.22)",
  background: "rgba(61,165,255,0.09)",
  color: "#9ed8ff",
  lineHeight: "1.6",
  fontSize: "13px",
  fontWeight: "800",
};

const panelHeadingStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "22px",
  flexWrap: "wrap",
  marginBottom: "22px",
};

const previewPanelStyle = {
  marginTop: "20px",
};

const previewLabelStyle = {
  display: "block",
  marginBottom: "9px",
  color: "#8f9ba7",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const announcementPreviewStyle = {
  padding: "15px 20px",
  borderRadius: "14px",
  border: "1px solid rgba(61,165,255,0.3)",
  background: "rgba(61,165,255,0.14)",
  color: "#bfe7ff",
  textAlign: "center",
  fontWeight: "900",
  lineHeight: "1.6",
};

const disabledAnnouncementStyle = {
  ...announcementPreviewStyle,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.035)",
  color: "#77818a",
};

const contactPreviewStyle = {
  display: "grid",
  gap: "9px",
  marginTop: "20px",
  padding: "18px",
  borderRadius: "17px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.22)",
  color: "#c8c8c8",
  lineHeight: "1.65",
};

const researchPreviewStyle = {
  marginTop: "20px",
  padding: "18px",
  borderRadius: "17px",
  border: "1px solid rgba(61,165,255,0.24)",
  background: "rgba(61,165,255,0.09)",
  color: "#9ed8ff",
  fontWeight: "900",
  lineHeight: "1.7",
  textAlign: "center",
};

const savePanelStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "30px",
  flexWrap: "wrap",
  padding: "30px",
  borderRadius: "28px",
  border: "1px solid rgba(61,165,255,0.25)",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.15), transparent 45%), rgba(255,255,255,0.035)",
};

const saveTitleStyle = {
  marginBottom: "10px",
  color: "#ffffff",
  fontSize: "29px",
};

const saveTextStyle = {
  maxWidth: "680px",
  color: "#aeb7bf",
  lineHeight: "1.7",
};

const saveMessageStyle = {
  marginTop: "14px",
  color: "#9ed8ff",
  fontWeight: "900",
};

const saveButtonRowStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const resetButtonStyle = {
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "14px",
  padding: "14px 19px",
  background: "rgba(255,255,255,0.045)",
  color: "#aeb7bf",
  fontWeight: "900",
  cursor: "pointer",
};

const disabledSaveButtonStyle = {
  opacity: 0.45,
  cursor: "not-allowed",
};

export default SiteSettings;
import { useEffect, useState } from "react";

const storageKey = "304-site-settings";

const defaultSettings = {
  storeStatus: "coming-soon",
  announcementEnabled: true,
  announcementMessage:
    "304 Peptides is preparing for launch. Research Use Only.",
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

function SiteAlert() {
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

  if (!settings.announcementEnabled) {
    return null;
  }

  const statusMessage =
    settings.storeStatus === "maintenance"
      ? "Website Maintenance"
      : settings.storeStatus === "open"
      ? "Store Open"
      : "Coming Soon";

  return (
    <div style={alertStyle}>
      <div style={contentStyle}>
        <span style={statusBadgeStyle}>
          {statusMessage}
        </span>

        <span style={messageStyle}>
          {settings.announcementMessage ||
            "304 Peptides — For Research Use Only."}
        </span>

        <span style={researchBadgeStyle}>
          Research Use Only
        </span>
      </div>
    </div>
  );
}

const alertStyle = {
  width: "100%",
  padding: "11px 24px",
  background:
    "linear-gradient(90deg, rgba(4,14,24,0.98), rgba(17,50,75,0.98), rgba(4,14,24,0.98))",
  borderBottom: "1px solid rgba(61,165,255,0.26)",
  boxShadow: "0 8px 30px rgba(0,0,0,0.28)",
  position: "relative",
  zIndex: 1001,
};

const contentStyle = {
  maxWidth: "1400px",
  margin: "0 auto",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
  textAlign: "center",
};

const statusBadgeStyle = {
  padding: "6px 10px",
  borderRadius: "999px",
  border: "1px solid rgba(61,165,255,0.38)",
  background: "rgba(61,165,255,0.15)",
  color: "#9ed8ff",
  fontSize: "10px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const messageStyle = {
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: "1.5",
};

const researchBadgeStyle = {
  color: "#9ed8ff",
  fontSize: "10px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

export default SiteAlert;
import { useEffect, useState } from "react";
import logo from "../assets/images/logo.jpeg";

const storageKey = "304-site-settings";

const defaultSettings = {
  catalogEnabled: true,
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

function Navbar({
  currentPage,
  onNavigate,
  isLoggedIn,
  onLogout,
  cartCount,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  function go(page) {
    onNavigate(page);
    setMenuOpen(false);
  }

  function navButton(page, label) {
    return (
      <button
        type="button"
        className={`nav-link-button ${
          currentPage === page ? "active" : ""
        }`}
        onClick={() => go(page)}
      >
        {label}
      </button>
    );
  }

  return (
    <header className="site-navbar">
      <div className="site-navbar-inner">
        <button
          type="button"
          className="navbar-brand"
          onClick={() => go("home")}
          aria-label="Go to 304 Peptides home page"
        >
          <div
            style={{
              width: "58px",
              height: "58px",
              minWidth: "58px",
              minHeight: "58px",
              maxWidth: "58px",
              maxHeight: "58px",
              borderRadius: "15px",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(61,165,255,0.25)",
            }}
          >
            <img
              src={logo}
              alt="304 Peptides"
              style={{
                width: "58px",
                height: "58px",
                minWidth: "58px",
                minHeight: "58px",
                maxWidth: "58px",
                maxHeight: "58px",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          <div className="navbar-brand-text">
            <strong>304 Peptides</strong>
            <span>Research Use Only</span>
          </div>
        </button>

        <button
          type="button"
          className="mobile-menu-button"
          onClick={() =>
            setMenuOpen((currentValue) => !currentValue)
          }
          aria-label={
            menuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <nav
          className={`navbar-links ${
            menuOpen ? "open" : ""
          }`}
        >
          {navButton("home", "Home")}

          {settings.catalogEnabled &&
            navButton("products", "Products")}

          {navButton("quality", "Quality")}
          {navButton("partners", "Partners")}
          {navButton("faq", "FAQ")}
          {navButton("contact", "Contact")}

          {isLoggedIn ? (
            <>
              {navButton(
                "dashboard",
                "Research Hub"
              )}

              <button
                type="button"
                className={`nav-link-button ${
                  currentPage === "cart"
                    ? "active"
                    : ""
                }`}
                onClick={() => go("cart")}
              >
                Cart ({cartCount})
              </button>

              {navButton(
                "missionControl",
                "Mission Control"
              )}

              <button
                type="button"
                className="nav-logout-button"
                onClick={() => {
                  onLogout();
                  setMenuOpen(false);
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {navButton("login", "Login")}

              {settings.accountCreationEnabled && (
                <button
                  type="button"
                  className="nav-create-button"
                  onClick={() =>
                    go("createAccount")
                  }
                >
                  Create Account
                </button>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
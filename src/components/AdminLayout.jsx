import { useEffect, useState } from "react";

const ADMIN_MENU_GROUPS = [
  {
    label: "Overview",
    items: [
      {
        page: "missionControl",
        label: "Dashboard",
        icon: "⌂",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        page: "orderManager",
        label: "Orders",
        icon: "▤",
      },
      {
        page: "customerManager",
        label: "Customer Accounts",
        icon: "👤",
      },
      {
        page: "affiliateManager",
        label: "Affiliate Accounts",
        icon: "↗",
      },
      {
        page: "shippingCenter",
        label: "Shipping Center",
        icon: "◇",
      },
    ],
  },
  {
    label: "Store",
    items: [
      {
        page: "productManager",
        label: "Products",
        icon: "□",
      },
      {
        page: "inventoryManager",
        label: "Inventory",
        icon: "▦",
      },
      {
        page: "couponManager",
        label: "Coupons",
        icon: "%",
      },
      {
        page: "vialLabelGenerator",
        label: "Vial Labels",
        icon: "▥",
      },
    ],
  },
  {
    label: "Quality",
    items: [
      {
        page: "coaManager",
        label: "COAs & Documents",
        icon: "✓",
      },
      {
        page: "qrManager",
        label: "QR Codes",
        icon: "⌗",
      },
    ],
  },
  {
    label: "Business",
    items: [
      {
        page: "accountingManager",
        label: "Accounting",
        icon: "$",
      },
      {
        page: "siteSettings",
        label: "Settings",
        icon: "⚙",
      },
      {
        page: "launchChecklist",
        label: "Launch Checklist",
        icon: "☑",
      },
    ],
  },
];

function AdminLayout({
  activePage = "missionControl",
  title = "Mission Control",
  subtitle = "",
  showHeading = true,
  onNavigate = () => {},
  onLogout,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [activePage]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function navigate(page) {
    setMenuOpen(false);
    onNavigate(page);
  }

  return (
    <>
      <style>{styles}</style>

      <div className="admin-shell">
        <button
          type="button"
          className={`admin-overlay ${menuOpen ? "visible" : ""}`}
          aria-label="Close administrator navigation"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
        />

        <aside
          className={`admin-drawer ${menuOpen ? "open" : ""}`}
          aria-label="Administrator navigation"
        >
          <div className="admin-drawer-header">
            <div>
              <span>304 PEPTIDES</span>
              <strong>Mission Control</strong>
            </div>

            <button
              type="button"
              className="admin-close"
              aria-label="Close navigation"
              onClick={() => setMenuOpen(false)}
            >
              ×
            </button>
          </div>

          <nav className="admin-navigation">
            {ADMIN_MENU_GROUPS.map((group) => (
              <section key={group.label}>
                <p>{group.label}</p>

                {group.items.map((item) => (
                  <button
                    type="button"
                    key={item.page}
                    className={
                      activePage === item.page
                        ? "admin-nav-item active"
                        : "admin-nav-item"
                    }
                    onClick={() => navigate(item.page)}
                  >
                    <span className="admin-nav-icon">
                      {item.icon}
                    </span>

                    <span>{item.label}</span>
                  </button>
                ))}
              </section>
            ))}
          </nav>

          <div className="admin-drawer-footer">
            <button
              type="button"
              onClick={() => navigate("home")}
            >
              Return to Storefront
            </button>

            {typeof onLogout === "function" && (
              <button
                type="button"
                className="logout"
                onClick={onLogout}
              >
                Log Out
              </button>
            )}
          </div>
        </aside>

        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-button"
            aria-label="Open administrator navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>

          <button
            type="button"
            className="admin-topbar-brand"
            onClick={() => navigate("missionControl")}
          >
            <span>304 PEPTIDES</span>
            <strong>Mission Control</strong>
          </button>

          <div className="admin-secure-badge">
            Admin
          </div>
        </header>

        <main className="admin-content">
          {showHeading && (
            <header className="admin-page-heading">
              <div>
                <p>ADMINISTRATION</p>
                <h1>{title}</h1>

                {subtitle && <span>{subtitle}</span>}
              </div>
            </header>
          )}

          {children}
        </main>
      </div>
    </>
  );
}

const styles = `
.admin-shell,
.admin-shell *,
.admin-shell *::before,
.admin-shell *::after {
  box-sizing: border-box;
}

.admin-shell {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at top right,
      rgba(61, 165, 255, 0.09),
      transparent 32%
    ),
    #071019;
  color: #f5f7fa;
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 80;
  min-height: 62px;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 10px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(7, 16, 25, 0.94);
  backdrop-filter: blur(18px);
}

.admin-menu-button {
  width: 38px;
  min-width: 38px;
  max-width: 38px;
  height: 38px;
  min-height: 38px;
  max-height: 38px;
  flex: 0 0 38px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(61, 165, 255, 0.28);
  border-radius: 10px;
  background: rgba(61, 165, 255, 0.08);
  color: #ffffff;
  cursor: pointer;
  box-shadow: none;
}

.admin-menu-button:hover {
  border-color: rgba(61, 165, 255, 0.5);
  background: rgba(61, 165, 255, 0.14);
}

.admin-menu-button span {
  width: 17px;
  height: 2px;
  display: block;
  flex: 0 0 2px;
  margin: 0;
  padding: 0;
  border-radius: 999px;
  background: #f5f7fa;
}

.admin-topbar-brand {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: none;
}

.admin-topbar-brand span,
.admin-drawer-header span {
  color: #3da5ff;
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0.15em;
}

.admin-topbar-brand strong {
  color: #ffffff;
  font-size: 0.95rem;
  line-height: 1.1;
}

.admin-secure-badge {
  margin-left: auto;
  padding: 6px 10px;
  border: 1px solid rgba(52, 211, 153, 0.25);
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.08);
  color: #86efac;
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.admin-overlay {
  position: fixed;
  inset: 0;
  z-index: 98;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: rgba(0, 0, 0, 0.68);
  opacity: 0;
  visibility: hidden;
  cursor: default;
  transition:
    opacity 180ms ease,
    visibility 180ms ease;
}

.admin-overlay.visible {
  opacity: 1;
  visibility: visible;
}

.admin-drawer {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 99;
  width: min(340px, 90vw);
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-right: 1px solid rgba(255, 255, 255, 0.11);
  background: #0b1621;
  box-shadow: 30px 0 70px rgba(0, 0, 0, 0.5);
  transform: translateX(-105%);
  transition: transform 220ms ease;
}

.admin-drawer.open {
  transform: translateX(0);
}

.admin-drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
}

.admin-drawer-header div {
  display: grid;
  gap: 5px;
}

.admin-drawer-header strong {
  font-size: 1.25rem;
}

.admin-close {
  width: 34px;
  min-width: 34px;
  max-width: 34px;
  height: 34px;
  min-height: 34px;
  max-height: 34px;
  flex: 0 0 34px;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: none;
}

.admin-navigation {
  flex: 1;
  display: grid;
  align-content: start;
  gap: 22px;
  padding: 22px 0;
  overflow-y: auto;
}

.admin-navigation section {
  display: grid;
  gap: 6px;
}

.admin-navigation section > p {
  margin: 0 0 3px;
  color: #758494;
  font-size: 0.65rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.13em;
}

.admin-nav-item {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 11px;
  margin: 0;
  padding: 9px 11px;
  border: 1px solid transparent;
  border-radius: 11px;
  background: transparent;
  color: #c8d0d8;
  font: inherit;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  box-shadow: none;
}

.admin-nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.admin-nav-item.active {
  border-color: rgba(61, 165, 255, 0.25);
  background: rgba(61, 165, 255, 0.12);
  color: #fff;
}

.admin-nav-icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  flex: 0 0 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #3da5ff;
  font-size: 0.85rem;
}

.admin-drawer-footer {
  display: grid;
  gap: 9px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}

.admin-drawer-footer button {
  width: 100%;
  min-height: 42px;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: #d8dee5;
  font-weight: 800;
  cursor: pointer;
  box-shadow: none;
}

.admin-drawer-footer .logout {
  border-color: rgba(248, 113, 113, 0.2);
  color: #fca5a5;
}

.admin-content {
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 28px 24px 70px;
}

.admin-page-heading {
  margin-bottom: 26px;
}

.admin-page-heading p {
  margin: 0 0 7px;
  color: #3da5ff;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.admin-page-heading h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.3rem);
  line-height: 1.05;
}

.admin-page-heading span {
  display: block;
  max-width: 760px;
  margin-top: 11px;
  color: #aeb8c2;
  line-height: 1.65;
}

@media (max-width: 600px) {
  .admin-topbar {
    min-height: 58px;
    gap: 10px;
    padding: 8px 10px;
  }

  .admin-menu-button {
    width: 36px;
    min-width: 36px;
    max-width: 36px;
    height: 36px;
    min-height: 36px;
    max-height: 36px;
    flex-basis: 36px;
  }

  .admin-menu-button span {
    width: 16px;
  }

  .admin-topbar-brand span {
    font-size: 0.58rem;
  }

  .admin-topbar-brand strong {
    font-size: 0.88rem;
  }

  .admin-secure-badge {
    display: none;
  }

  .admin-content {
    padding: 22px 10px 50px;
  }

  .admin-drawer {
    padding: 18px;
  }
}
`;

export default AdminLayout;
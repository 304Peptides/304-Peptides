import { useEffect, useState } from "react";

const ADMIN_SESSION_KEY = "304-document-admin-session";

const DEFAULT_SETTINGS = {
  fromName: "304 Peptides",
  company: "304 Peptides",
  street1: "",
  street2: "",
  city: "Shinnston",
  state: "WV",
  zip: "",
  country: "US",
  phone: "",
  email: "support@304peptides.com",
  defaultLength: 8,
  defaultWidth: 6,
  defaultHeight: 4,
  defaultWeight: 8,
};

function getSecret() {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) || "";
  } catch {
    return "";
  }
}

async function readJson(response) {
  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("The shipping service returned an invalid response.");
  }
  if (!response.ok || !result.success) {
    throw new Error(result.error || "The shipping request failed.");
  }
  return result;
}

function ShippingCenter({ onNavigate = () => {} }) {
  const [adminSecret, setAdminSecret] = useState(getSecret);
  const [secretInput, setSecretInput] = useState("");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(Boolean(getSecret()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!adminSecret) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/shipping/settings", {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${adminSecret}`,
          },
          cache: "no-store",
        });
        const result = await readJson(response);
        if (!active) return;
        setConfigured(Boolean(result.configured));
        setSettings({ ...DEFAULT_SETTINGS, ...(result.settings || {}) });
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message || "Shipping settings could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [adminSecret]);

  function unlock(event) {
    event.preventDefault();
    const value = secretInput.trim();
    if (!value) return;
    try {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, value);
    } catch {
      // State still unlocks this page for the current visit.
    }
    setAdminSecret(value);
    setSecretInput("");
  }

  function update(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/shipping/settings", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ settings }),
      });
      const result = await readJson(response);
      setConfigured(Boolean(result.configured));
      setSettings({ ...DEFAULT_SETTINGS, ...(result.settings || settings) });
      setMessage(result.message || "Shipping settings saved.");
    } catch (requestError) {
      setError(requestError.message || "Shipping settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (!adminSecret) {
    return (
      <main className="shipping-center-page">
        <style>{styles}</style>
        <section className="shipping-lock-card">
          <p>ADMIN TOOL</p>
          <h1>Shipping Center</h1>
          <span>Enter the same administrator secret used in Mission Control.</span>
          <form onSubmit={unlock}>
            <input
              type="password"
              value={secretInput}
              onChange={(event) => setSecretInput(event.target.value)}
              placeholder="Administrator secret"
              autoComplete="current-password"
            />
            <button type="submit">Unlock Shipping</button>
          </form>
          <button type="button" className="shipping-link-button" onClick={() => onNavigate("missionControl")}>
            Return to Mission Control
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shipping-center-page">
      <style>{styles}</style>
      <header className="shipping-center-header">
        <button type="button" className="shipping-link-button" onClick={() => onNavigate("missionControl")}>
          ← Mission Control
        </button>
        <div>
          <p>FULFILLMENT SETUP</p>
          <h1>Shipping Center</h1>
          <span>
            Save the return address and default package used when Customer Manager
            requests live postage rates and printable labels.
          </span>
        </div>
      </header>

      <section className="shipping-status-grid">
        <article className={configured ? "connected" : "not-connected"}>
          <span>Label provider</span>
          <strong>EasyPost</strong>
          <p>{configured ? "API key connected" : "API key not connected"}</p>
        </article>
        <article>
          <span>Default package</span>
          <strong>{settings.defaultLength} × {settings.defaultWidth} × {settings.defaultHeight} in</strong>
          <p>{settings.defaultWeight} oz</p>
        </article>
        <article>
          <span>Workflow</span>
          <strong>Rates → Label → Shipment</strong>
          <p>Tracking automatically fills the existing shipment form.</p>
        </article>
      </section>

      {!configured && (
        <div className="shipping-setup-note">
          <strong>One secure connection step remains.</strong>
          <span>
            Add an EasyPost API key to Cloudflare as the secret
            <code>EASYPOST_API_KEY</code>. The key is never stored in the browser or
            shown on this page.
          </span>
        </div>
      )}

      {error && <div className="shipping-alert error">{error}</div>}
      {message && <div className="shipping-alert success">{message}</div>}

      <form className="shipping-settings-form" onSubmit={save}>
        <section>
          <div className="shipping-section-heading">
            <div>
              <span>SHIP-FROM ADDRESS</span>
              <h2>Return and sender information</h2>
            </div>
            {loading && <small>Loading…</small>}
          </div>

          <div className="shipping-form-grid">
            <Field label="Sender name" value={settings.fromName} onChange={(value) => update("fromName", value)} required />
            <Field label="Company" value={settings.company} onChange={(value) => update("company", value)} />
            <Field label="Street address" value={settings.street1} onChange={(value) => update("street1", value)} required wide />
            <Field label="Apartment / suite" value={settings.street2} onChange={(value) => update("street2", value)} wide />
            <Field label="City" value={settings.city} onChange={(value) => update("city", value)} required />
            <Field label="State" value={settings.state} onChange={(value) => update("state", value.toUpperCase())} required maxLength="2" />
            <Field label="ZIP" value={settings.zip} onChange={(value) => update("zip", value)} required />
            <Field label="Country" value={settings.country} onChange={(value) => update("country", value.toUpperCase())} required maxLength="2" />
            <Field label="Phone" value={settings.phone} onChange={(value) => update("phone", value)} />
            <Field label="Email" type="email" value={settings.email} onChange={(value) => update("email", value)} required />
          </div>
        </section>

        <section>
          <div className="shipping-section-heading">
            <div>
              <span>DEFAULT PARCEL</span>
              <h2>Package size used for quick rates</h2>
            </div>
          </div>
          <div className="shipping-package-grid">
            <Field label="Length (in)" type="number" step="0.1" min="0.1" value={settings.defaultLength} onChange={(value) => update("defaultLength", value)} required />
            <Field label="Width (in)" type="number" step="0.1" min="0.1" value={settings.defaultWidth} onChange={(value) => update("defaultWidth", value)} required />
            <Field label="Height (in)" type="number" step="0.1" min="0.1" value={settings.defaultHeight} onChange={(value) => update("defaultHeight", value)} required />
            <Field label="Weight (oz)" type="number" step="0.1" min="0.1" value={settings.defaultWeight} onChange={(value) => update("defaultWeight", value)} required />
          </div>
        </section>

        <button type="submit" className="shipping-save-button" disabled={saving || loading}>
          {saving ? "Saving…" : "Save Shipping Settings"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, value, onChange, wide = false, ...inputProps }) {
  return (
    <label className={wide ? "wide" : ""}>
      <span>{label}</span>
      <input
        {...inputProps}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

const styles = `
.shipping-center-page{min-height:100vh;background:#f3f4f6;color:#111827;padding:32px}.shipping-center-header{max-width:1180px;margin:0 auto 24px;display:flex;gap:22px;align-items:flex-start}.shipping-center-header p,.shipping-section-heading span{margin:0;color:#c2410c;font-size:.75rem;font-weight:900;letter-spacing:.13em}.shipping-center-header h1{font-size:clamp(2rem,4vw,3.25rem);margin:4px 0 8px}.shipping-center-header span{color:#4b5563;line-height:1.6;max-width:760px;display:block}.shipping-link-button{border:1px solid #d1d5db;background:#fff;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer}.shipping-status-grid,.shipping-settings-form,.shipping-setup-note,.shipping-alert{max-width:1180px;margin-left:auto;margin-right:auto}.shipping-status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:18px}.shipping-status-grid article{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.05)}.shipping-status-grid article>span{font-size:.72rem;color:#6b7280;text-transform:uppercase;letter-spacing:.1em;font-weight:900}.shipping-status-grid strong{display:block;font-size:1.1rem;margin:8px 0 3px}.shipping-status-grid p{margin:0;color:#6b7280;font-size:.83rem}.shipping-status-grid .connected{border-color:#86efac;background:#f0fdf4}.shipping-status-grid .not-connected{border-color:#fed7aa;background:#fff7ed}.shipping-setup-note{display:grid;gap:5px;background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:16px 18px;margin-bottom:18px;color:#9a3412}.shipping-setup-note span{line-height:1.55}.shipping-setup-note code{margin-left:5px;background:#fff;padding:2px 6px;border-radius:5px}.shipping-alert{border-radius:14px;padding:13px 16px;margin-bottom:14px}.shipping-alert.error{background:#fef2f2;color:#991b1b}.shipping-alert.success{background:#ecfdf5;color:#065f46}.shipping-settings-form{display:grid;gap:18px}.shipping-settings-form section{background:#fff;border:1px solid #e5e7eb;border-radius:22px;padding:22px;box-shadow:0 16px 38px rgba(15,23,42,.06)}.shipping-section-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.shipping-section-heading h2{margin:4px 0 0}.shipping-form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}.shipping-form-grid label,.shipping-package-grid label{display:grid;gap:7px;font-size:.82rem;font-weight:800}.shipping-form-grid .wide{grid-column:1/-1}.shipping-form-grid input,.shipping-package-grid input{border:1px solid #d1d5db;border-radius:11px;padding:11px 12px;font:inherit}.shipping-package-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.shipping-save-button{border:0;background:#ea580c;color:#fff;border-radius:14px;padding:15px 20px;font-weight:900;font-size:1rem;cursor:pointer}.shipping-save-button:disabled{opacity:.55}.shipping-lock-card{max-width:460px;margin:12vh auto;background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:28px;box-shadow:0 20px 50px rgba(15,23,42,.1);display:grid;gap:14px}.shipping-lock-card p{margin:0;color:#c2410c;font-weight:900;letter-spacing:.12em;font-size:.75rem}.shipping-lock-card h1{margin:0}.shipping-lock-card span{color:#6b7280}.shipping-lock-card form{display:grid;gap:10px}.shipping-lock-card input{border:1px solid #d1d5db;border-radius:11px;padding:12px}.shipping-lock-card form button{border:0;border-radius:11px;background:#111827;color:#fff;padding:12px;font-weight:900}@media(max-width:800px){.shipping-center-page{padding:18px}.shipping-center-header{flex-direction:column}.shipping-status-grid{grid-template-columns:1fr}.shipping-form-grid,.shipping-package-grid{grid-template-columns:1fr}.shipping-form-grid .wide{grid-column:auto}}
`;

export default ShippingCenter;

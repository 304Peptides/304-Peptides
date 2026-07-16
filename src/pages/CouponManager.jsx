import { useEffect, useMemo, useState } from "react";

const ADMIN_SESSION_KEY = "304-document-admin-session";

const emptyCoupon = {
  code: "",
  description: "",
  type: "percent",
  amount: "10",
  minimumSubtotal: "0",
  startsAt: "",
  endsAt: "",
  maxRedemptions: "0",
  active: true,
};

function getStoredSecret() {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) || "";
  } catch {
    return "";
  }
}

function saveStoredSecret(value) {
  try {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, value);
  } catch {
    // React state still holds the secret for this visit.
  }
}

function clearStoredSecret() {
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // Storage may be unavailable.
  }
}

function toInputDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function couponState(coupon) {
  if (coupon.active === false || coupon.archived) {
    return { label: "Disabled", tone: "danger" };
  }

  const now = Date.now();

  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) {
    return { label: "Scheduled", tone: "warning" };
  }

  if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) {
    return { label: "Expired", tone: "danger" };
  }

  if (
    Number(coupon.maxRedemptions || 0) > 0 &&
    Number(coupon.redemptionCount || 0) >= Number(coupon.maxRedemptions)
  ) {
    return { label: "Usage Limit Reached", tone: "danger" };
  }

  return { label: "Active", tone: "success" };
}

function discountLabel(coupon) {
  if (coupon.type === "free_shipping") {
    return "Free Shipping";
  }

  if (coupon.type === "fixed") {
    return `$${Number(coupon.amount || 0).toFixed(2)} Off`;
  }

  return `${Number(coupon.amount || 0)}% Off`;
}

function CouponManager({ onNavigate = () => {} }) {
  const [adminSecret, setAdminSecret] = useState(getStoredSecret);
  const [secretInput, setSecretInput] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [draft, setDraft] = useState(emptyCoupon);
  const [editingCode, setEditingCode] = useState("");
  const [loading, setLoading] = useState(Boolean(getStoredSecret()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadCoupons(secret = adminSecret) {
    if (!secret) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/coupons", {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${secret}`,
        },
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Coupons could not be loaded.");
      }

      setCoupons(Array.isArray(result.records) ? result.records : []);
    } catch (requestError) {
      setError(requestError.message || "Coupons could not be loaded.");

      if (/unauthorized|secret|authorization/i.test(requestError.message || "")) {
        clearStoredSecret();
        setAdminSecret("");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (adminSecret) {
      loadCoupons(adminSecret);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSecret]);

  const summary = useMemo(() => {
    const counts = { active: 0, scheduled: 0, disabled: 0, expired: 0 };

    coupons.forEach((coupon) => {
      const state = couponState(coupon).label;

      if (state === "Active") counts.active += 1;
      else if (state === "Scheduled") counts.scheduled += 1;
      else if (state === "Expired") counts.expired += 1;
      else counts.disabled += 1;
    });

    return counts;
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return coupons.filter((coupon) => {
      const state = couponState(coupon).label.toLowerCase();
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && state === "active") ||
        (filter === "scheduled" && state === "scheduled") ||
        (filter === "expired" && state === "expired") ||
        (filter === "disabled" && state !== "active" && state !== "scheduled" && state !== "expired");
      const searchable = `${coupon.code} ${coupon.description} ${discountLabel(coupon)}`.toLowerCase();

      return matchesFilter && (!normalized || searchable.includes(normalized));
    });
  }, [coupons, filter, search]);

  function unlock(event) {
    event.preventDefault();
    const secret = secretInput.trim();

    if (!secret) {
      setError("Enter the administrator secret.");
      return;
    }

    saveStoredSecret(secret);
    setAdminSecret(secret);
    setSecretInput("");
    setError("");
  }

  function startNew() {
    setDraft(emptyCoupon);
    setEditingCode("");
    setMessage("");
    setError("");
  }

  function startEdit(coupon) {
    setDraft({
      ...emptyCoupon,
      ...coupon,
      amount: String(coupon.amount ?? 0),
      minimumSubtotal: String(coupon.minimumSubtotal ?? 0),
      maxRedemptions: String(coupon.maxRedemptions ?? 0),
      startsAt: toInputDate(coupon.startsAt),
      endsAt: toInputDate(coupon.endsAt),
    });
    setEditingCode(coupon.code);
    setMessage("");
    setError("");
  }

  async function saveCoupon(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...draft,
        code: String(draft.code || "").trim().toUpperCase(),
        amount: Number(draft.amount || 0),
        minimumSubtotal: Number(draft.minimumSubtotal || 0),
        maxRedemptions: Math.max(0, Math.floor(Number(draft.maxRedemptions || 0))),
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : "",
        endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : "",
      };
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ coupon: payload }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || "The coupon could not be saved.");
      }

      setMessage(result.message || `Coupon ${payload.code} saved.`);
      startNew();
      await loadCoupons(adminSecret);
    } catch (saveError) {
      setError(saveError.message || "The coupon could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoupon(coupon) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({
          coupon: {
            ...coupon,
            active: coupon.active === false,
            archived: false,
          },
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || "The coupon status could not be changed.");
      }

      setMessage(
        `Coupon ${coupon.code} ${coupon.active === false ? "enabled" : "disabled"}.`
      );
      await loadCoupons(adminSecret);
    } catch (requestError) {
      setError(requestError.message || "The coupon status could not be changed.");
    } finally {
      setSaving(false);
    }
  }

  if (!adminSecret) {
    return (
      <main className="coupon-page">
        <style>{couponCss}</style>
        <section className="coupon-lock-card">
          <p className="eyebrow">MISSION CONTROL</p>
          <h1>Coupon Manager</h1>
          <p>Enter the administrator secret to create and schedule coupons.</p>
          <form onSubmit={unlock} className="coupon-lock-form">
            <input
              type="password"
              value={secretInput}
              onChange={(event) => setSecretInput(event.target.value)}
              placeholder="Administrator secret"
            />
            <button type="submit" className="primary-btn">Unlock Coupons</button>
          </form>
          {error && <div className="coupon-message error">{error}</div>}
          <button
            type="button"
            className="secondary-btn"
            onClick={() => onNavigate("missionControl")}
          >
            Back to Mission Control
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="coupon-page">
      <style>{couponCss}</style>
      <section className="coupon-inner">
        <header className="coupon-hero">
          <div>
            <p className="eyebrow">PROMOTIONS</p>
            <h1>Coupon Manager</h1>
            <p>
              Create percentage, fixed-dollar, or free-shipping codes and schedule
              exactly when they can be used.
            </p>
          </div>
          <div className="coupon-hero-actions">
            <button className="secondary-btn" onClick={() => onNavigate("missionControl")}>Mission Control</button>
            <button className="secondary-btn" onClick={() => loadCoupons(adminSecret)}>Refresh</button>
            <button className="primary-btn" onClick={startNew}>New Coupon</button>
          </div>
        </header>

        <section className="coupon-summary-grid">
          <SummaryCard label="Active" value={summary.active} />
          <SummaryCard label="Scheduled" value={summary.scheduled} />
          <SummaryCard label="Expired" value={summary.expired} />
          <SummaryCard label="Disabled" value={summary.disabled} />
        </section>

        {(error || message) && (
          <div className={`coupon-message ${error ? "error" : "success"}`}>
            {error || message}
          </div>
        )}

        <section className="coupon-layout">
          <form className="coupon-editor" onSubmit={saveCoupon}>
            <div className="coupon-editor-heading">
              <div>
                <p className="eyebrow">{editingCode ? "EDIT COUPON" : "NEW COUPON"}</p>
                <h2>{editingCode || "Create a code"}</h2>
              </div>
              {editingCode && (
                <button type="button" className="secondary-btn" onClick={startNew}>Cancel Edit</button>
              )}
            </div>

            <div className="coupon-form-grid">
              <Field label="Coupon code">
                <input
                  value={draft.code}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase().replace(/\s+/g, "-"),
                    }))
                  }
                  placeholder="WELCOME10"
                  disabled={Boolean(editingCode)}
                  required
                />
              </Field>
              <Field label="Discount type">
                <select
                  value={draft.type}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, type: event.target.value }))
                  }
                >
                  <option value="percent">Percentage off</option>
                  <option value="fixed">Fixed amount off</option>
                  <option value="free_shipping">Free shipping</option>
                </select>
              </Field>
              {draft.type !== "free_shipping" && (
                <Field label={draft.type === "percent" ? "Percent off" : "Dollars off"}>
                  <input
                    type="number"
                    min="0"
                    max={draft.type === "percent" ? "100" : undefined}
                    step="0.01"
                    value={draft.amount}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, amount: event.target.value }))
                    }
                    required
                  />
                </Field>
              )}
              <Field label="Minimum product subtotal">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.minimumSubtotal}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      minimumSubtotal: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Starts">
                <input
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, startsAt: event.target.value }))
                  }
                />
              </Field>
              <Field label="Expires">
                <input
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, endsAt: event.target.value }))
                  }
                />
              </Field>
              <Field label="Maximum paid redemptions (0 = unlimited)">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.maxRedemptions}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      maxRedemptions: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Description">
                <input
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Customer-facing or internal note"
                />
              </Field>
            </div>

            <label className="coupon-checkbox">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, active: event.target.checked }))
                }
              />
              <span>Coupon is enabled</span>
            </label>

            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Saving…" : editingCode ? "Save Changes" : "Create Coupon"}
            </button>
          </form>

          <section className="coupon-list-panel">
            <div className="coupon-list-filters">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search coupon codes"
              />
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">All coupons</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {loading ? (
              <div className="coupon-empty">Loading coupons…</div>
            ) : filteredCoupons.length === 0 ? (
              <div className="coupon-empty">No coupons match this view.</div>
            ) : (
              <div className="coupon-list">
                {filteredCoupons.map((coupon) => {
                  const state = couponState(coupon);

                  return (
                    <article className="coupon-card" key={coupon.code}>
                      <div className="coupon-card-top">
                        <div>
                          <strong>{coupon.code}</strong>
                          <span>{discountLabel(coupon)}</span>
                        </div>
                        <span className={`coupon-pill ${state.tone}`}>{state.label}</span>
                      </div>
                      <p>{coupon.description || "No description"}</p>
                      <div className="coupon-metrics">
                        <span>
                          <small>Minimum</small>
                          <strong>${Number(coupon.minimumSubtotal || 0).toFixed(2)}</strong>
                        </span>
                        <span>
                          <small>Used</small>
                          <strong>
                            {Number(coupon.redemptionCount || 0)}
                            {Number(coupon.maxRedemptions || 0) > 0
                              ? ` / ${Number(coupon.maxRedemptions)}`
                              : ""}
                          </strong>
                        </span>
                      </div>
                      <div className="coupon-card-actions">
                        <button type="button" className="secondary-btn" onClick={() => startEdit(coupon)}>Edit</button>
                        <button type="button" className="secondary-btn" onClick={() => toggleCoupon(coupon)}>
                          {coupon.active === false ? "Enable" : "Disable"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label className="coupon-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="coupon-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

const couponCss = `
.coupon-page { min-height: 100vh; padding: 110px 22px 80px; color: #fff; background: #07090c; }
.coupon-inner, .coupon-lock-card { width: min(1180px, 100%); margin: 0 auto; }
.coupon-lock-card { max-width: 620px; padding: 42px; border-radius: 28px; border: 1px solid rgba(255,255,255,.1); background: #11151b; }
.coupon-lock-card h1, .coupon-hero h1 { font-size: clamp(34px, 5vw, 56px); margin: 0 0 12px; }
.coupon-lock-card p, .coupon-hero p { color: #b6c0cc; line-height: 1.7; }
.coupon-lock-form { display: grid; gap: 12px; margin: 24px 0 18px; }
.coupon-lock-form input, .coupon-field input, .coupon-field select, .coupon-list-filters input, .coupon-list-filters select { width: 100%; box-sizing: border-box; border: 1px solid rgba(255,255,255,.13); border-radius: 13px; background: #0b1016; color: #fff; padding: 13px 14px; font: inherit; }
.coupon-hero { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; padding: 34px; border-radius: 28px; border: 1px solid rgba(255,255,255,.09); background: radial-gradient(circle at top right, rgba(226,111,36,.17), transparent 40%), #11151b; }
.coupon-hero > div:first-child { max-width: 720px; }
.coupon-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.coupon-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
.coupon-summary-card { padding: 18px; border-radius: 18px; border: 1px solid rgba(255,255,255,.09); background: #10141a; }
.coupon-summary-card span, .coupon-summary-card strong { display: block; }
.coupon-summary-card span { color: #95a3b3; text-transform: uppercase; font-size: 11px; font-weight: 900; letter-spacing: .08em; }
.coupon-summary-card strong { font-size: 30px; margin-top: 8px; }
.coupon-message { padding: 14px 16px; border-radius: 14px; margin: 14px 0; font-weight: 800; }
.coupon-message.error { color: #ffb3b3; border: 1px solid rgba(255,83,83,.36); background: rgba(255,83,83,.11); }
.coupon-message.success { color: #b7f5d1; border: 1px solid rgba(80,211,145,.34); background: rgba(80,211,145,.11); }
.coupon-layout { display: grid; grid-template-columns: minmax(320px, .85fr) minmax(420px, 1.15fr); gap: 16px; align-items: start; }
.coupon-editor, .coupon-list-panel { border: 1px solid rgba(255,255,255,.09); border-radius: 22px; background: #10141a; padding: 22px; }
.coupon-editor { display: grid; gap: 15px; position: sticky; top: 94px; }
.coupon-editor-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.coupon-editor-heading h2 { margin: 4px 0 0; font-size: 28px; }
.coupon-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.coupon-field { display: grid; gap: 7px; color: #c8d1db; font-size: 13px; font-weight: 800; }
.coupon-checkbox { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 13px; border: 1px solid rgba(255,255,255,.09); }
.coupon-checkbox input { width: 18px; height: 18px; }
.coupon-list-filters { display: grid; grid-template-columns: 1fr 180px; gap: 10px; margin-bottom: 14px; }
.coupon-list { display: grid; gap: 12px; }
.coupon-card { padding: 17px; border-radius: 17px; border: 1px solid rgba(255,255,255,.09); background: #0b0f14; }
.coupon-card-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.coupon-card-top strong, .coupon-card-top span { display: block; }
.coupon-card-top strong { font-size: 20px; letter-spacing: .06em; }
.coupon-card-top > div > span { color: #8dccff; margin-top: 4px; font-weight: 800; }
.coupon-card p { color: #98a6b6; }
.coupon-pill { padding: 7px 10px; border-radius: 999px; font-size: 11px; font-weight: 900; white-space: nowrap; }
.coupon-pill.success { color: #b7f5d1; border: 1px solid rgba(80,211,145,.3); background: rgba(80,211,145,.11); }
.coupon-pill.warning { color: #ffe0a3; border: 1px solid rgba(255,183,77,.32); background: rgba(255,183,77,.11); }
.coupon-pill.danger { color: #ffb4b4; border: 1px solid rgba(255,83,83,.3); background: rgba(255,83,83,.11); }
.coupon-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin: 13px 0; }
.coupon-metrics span { background: rgba(255,255,255,.04); border-radius: 11px; padding: 10px; }
.coupon-metrics small, .coupon-metrics strong { display: block; }
.coupon-metrics small { color: #8a98a9; margin-bottom: 4px; }
.coupon-card-actions { display: flex; gap: 9px; }
.coupon-empty { padding: 42px 20px; text-align: center; color: #9ca9b9; }
@media (max-width: 900px) { .coupon-layout { grid-template-columns: 1fr; } .coupon-editor { position: static; } .coupon-hero { flex-direction: column; } .coupon-hero-actions { justify-content: flex-start; } }
@media (max-width: 640px) { .coupon-page { padding: 94px 12px 60px; } .coupon-summary-grid, .coupon-form-grid, .coupon-list-filters { grid-template-columns: 1fr; } }
`;

export default CouponManager;

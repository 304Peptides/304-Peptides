import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const ADMIN_SESSION_KEY =
  "304-document-admin-session";

const PERIODS = [
  ["month", "This Month"],
  ["30", "Last 30 Days"],
  ["year", "This Year"],
  ["all", "All Time"],
];

function getStoredSecret() {
  try {
    return (
      window.sessionStorage.getItem(
        ADMIN_SESSION_KEY
      ) || ""
    );
  } catch {
    return "";
  }
}

function storeSecret(secret) {
  try {
    window.sessionStorage.setItem(
      ADMIN_SESSION_KEY,
      secret
    );
  } catch {
    // Keep the secret in React state.
  }
}

function removeStoredSecret() {
  try {
    window.sessionStorage.removeItem(
      ADMIN_SESSION_KEY
    );
  } catch {
    // Session storage may be unavailable.
  }
}

function formatMoney(cents) {
  return (
    Number(cents || 0) / 100
  ).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(value) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function dollarsToCents(value) {
  const number = Number(value || 0);

  return Number.isFinite(number)
    ? Math.round(number * 100)
    : 0;
}

function isCancelled(order) {
  const status = String(
    order?.status || ""
  ).toLowerCase();

  return (
    status === "cancelled" ||
    Boolean(
      order?.cancellation?.cancelledAt
    )
  );
}

function isPaid(order) {
  return Boolean(
    order?.payment?.receivedAt ||
      order?.payment?.paidAt ||
      order?.inventoryCommittedAt ||
      order?.inventoryEvent?.committedAt
  );
}

function getOrderDate(order) {
  return (
    order?.payment?.receivedAt ||
    order?.payment?.paidAt ||
    order?.submittedAt ||
    order?.createdAt ||
    order?.updatedAt ||
    ""
  );
}

function getPaidAmountCents(order) {
  const paymentAmount =
    Number(order?.payment?.amountCents);

  if (
    Number.isFinite(paymentAmount) &&
    paymentAmount > 0
  ) {
    return paymentAmount;
  }

  return getOrderTotalCents(order);
}

function getOrderTotalCents(order) {
  const candidates = [
    order?.invoice?.totalCents,
    order?.totalCents,
    order?.pricing?.totalCents,
  ];

  for (const value of candidates) {
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number >= 0
    ) {
      return number;
    }
  }

  return dollarsToCents(
    order?.total ?? order?.subtotal
  );
}

function getShippingCents(order) {
  const candidates = [
    order?.invoice?.shippingCents,
    order?.shippingCents,
    order?.pricing?.shippingCents,
  ];

  for (const value of candidates) {
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number >= 0
    ) {
      return number;
    }
  }

  return dollarsToCents(order?.shipping);
}

function getDiscountCents(order) {
  const candidates = [
    order?.invoice?.discountCents,
    order?.discountCents,
    order?.pricing?.discountCents,
    order?.coupon?.discountCents,
  ];

  for (const value of candidates) {
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number >= 0
    ) {
      return number;
    }
  }

  return dollarsToCents(order?.discount);
}

function getOrderCogsCents(order) {
  const items = Array.isArray(
    order?.items
  )
    ? order.items
    : [];

  return items.reduce(
    (total, item) =>
      total +
      dollarsToCents(item?.unitCost) *
        Math.max(
          0,
          Number(item?.quantity || 0)
        ),
    0
  );
}

function isWithinPeriod(value, period) {
  if (period === "all") {
    return true;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  if (period === "month") {
    return (
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() ===
        now.getMonth()
    );
  }

  if (period === "year") {
    return (
      date.getFullYear() ===
      now.getFullYear()
    );
  }

  if (period === "30") {
    const difference =
      now.getTime() - date.getTime();

    return (
      difference >= 0 &&
      difference <=
        30 * 24 * 60 * 60 * 1000
    );
  }

  return true;
}

async function readJson(response) {
  const text = await response.text();

  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(
      "The protected accounting service returned an invalid response."
    );
  }

  if (
    !response.ok ||
    result.success === false
  ) {
    throw new Error(
      result.error ||
        "The accounting request could not be completed."
    );
  }

  return result;
}

function AccountingManager({
  onNavigate = () => {},
}) {
  const [adminSecret, setAdminSecret] =
    useState(getStoredSecret);

  const [secretInput, setSecretInput] =
    useState("");

  const [orders, setOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [referrals, setReferrals] =
    useState([]);
  const [payouts, setPayouts] =
    useState([]);

  const [period, setPeriod] =
    useState("month");

  const [isLoading, setIsLoading] =
    useState(Boolean(adminSecret));

  const [isSyncing, setIsSyncing] =
    useState(false);

  const [isReady, setIsReady] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] =
    useState("");

  const loadAccounting = useCallback(
    async (secret = adminSecret) => {
      const cleanedSecret = String(
        secret || ""
      ).trim();

      if (!cleanedSecret) {
        return;
      }

      setIsLoading(true);
      setError("");
      setMessage("");

      const headers = {
        Accept: "application/json",
        Authorization:
          `Bearer ${cleanedSecret}`,
      };

      try {
        const responses =
          await Promise.all([
            fetch("/api/admin/orders", {
              method: "GET",
              headers,
              credentials:
                "same-origin",
              cache: "no-store",
            }),

            fetch("/api/admin/catalog", {
              method: "GET",
              headers,
              credentials:
                "same-origin",
              cache: "no-store",
            }),

            fetch(
              "/api/admin/partner-referrals",
              {
                method: "GET",
                headers,
                credentials:
                  "same-origin",
                cache: "no-store",
              }
            ),

            fetch(
              "/api/admin/partner-payouts",
              {
                method: "GET",
                headers,
                credentials:
                  "same-origin",
                cache: "no-store",
              }
            ),
          ]);

        const [
          orderResult,
          catalogResult,
          referralResult,
          payoutResult,
        ] = await Promise.all(
          responses.map(readJson)
        );

        setOrders(
          orderResult.records ||
            orderResult.orders ||
            []
        );

        setCatalog(
          catalogResult.records || []
        );

        setReferrals(
          referralResult.referrals ||
            referralResult.records ||
            []
        );

        setPayouts(
          payoutResult.payouts ||
            payoutResult.records ||
            []
        );

        setIsReady(true);
      } catch (requestError) {
        setIsReady(false);
        setError(
          requestError.message ||
            "Accounting data could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [adminSecret]
  );

  useEffect(() => {
    if (adminSecret) {
      loadAccounting(adminSecret);
    }
  }, [adminSecret, loadAccounting]);

  const periodOrders = useMemo(
    () =>
      orders.filter((order) =>
        isWithinPeriod(
          getOrderDate(order),
          period
        )
      ),
    [orders, period]
  );

  const periodReferrals = useMemo(
    () =>
      referrals.filter((referral) =>
        isWithinPeriod(
          referral?.createdAt ||
            referral?.updatedAt,
          period
        )
      ),
    [referrals, period]
  );

  const periodPayouts = useMemo(
    () =>
      payouts.filter((payout) =>
        isWithinPeriod(
          payout?.paidAt ||
            payout?.createdAt,
          period
        )
      ),
    [payouts, period]
  );

  const summary = useMemo(() => {
    const activeOrders =
      periodOrders.filter(
        (order) => !isCancelled(order)
      );

    const paidOrders =
      activeOrders.filter(isPaid);

    const unpaidOrders =
      activeOrders.filter(
        (order) => !isPaid(order)
      );

    const paidRevenueCents =
      paidOrders.reduce(
        (total, order) =>
          total +
          getPaidAmountCents(order),
        0
      );

    const outstandingCents =
      unpaidOrders.reduce(
        (total, order) =>
          total +
          getOrderTotalCents(order),
        0
      );

    const cogsCents =
      paidOrders.reduce(
        (total, order) =>
          total +
          getOrderCogsCents(order),
        0
      );

    const shippingCents =
      paidOrders.reduce(
        (total, order) =>
          total +
          getShippingCents(order),
        0
      );

    const discountCents =
      paidOrders.reduce(
        (total, order) =>
          total +
          getDiscountCents(order),
        0
      );

    const earnedCommissionCents =
      periodReferrals.reduce(
        (total, referral) => {
          const status = String(
            referral?.commissionStatus ||
              referral?.referralStatus ||
              ""
          ).toLowerCase();

          return [
            "earned",
            "available",
            "paid",
          ].includes(status)
            ? total +
                Number(
                  referral
                    ?.commissionAmountCents ||
                    0
                )
            : total;
        },
        0
      );

    const payoutCents =
      periodPayouts.reduce(
        (total, payout) =>
          total +
          Number(
            payout?.amountCents || 0
          ),
        0
      );

    const inventoryValueCents =
      catalog.reduce(
        (total, item) => {
          if (
            item?.trackQuantity !== true
          ) {
            return total;
          }

          return (
            total +
            dollarsToCents(
              item?.unitCost
            ) *
              Math.max(
                0,
                Number(
                  item?.quantity || 0
                )
              )
          );
        },
        0
      );

    return {
      paidOrders: paidOrders.length,
      unpaidOrders:
        unpaidOrders.length,
      paidRevenueCents,
      outstandingCents,
      cogsCents,
      shippingCents,
      discountCents,
      earnedCommissionCents,
      payoutCents,
      inventoryValueCents,

      estimatedMarginCents:
        paidRevenueCents -
        cogsCents -
        earnedCommissionCents,

      averageOrderCents:
        paidOrders.length > 0
          ? Math.round(
              paidRevenueCents /
                paidOrders.length
            )
          : 0,
    };
  }, [
    catalog,
    periodOrders,
    periodPayouts,
    periodReferrals,
  ]);

  const recentPaidOrders = useMemo(
    () =>
      periodOrders
        .filter(
          (order) =>
            !isCancelled(order) &&
            isPaid(order)
        )
        .sort((left, right) =>
          String(
            getOrderDate(right)
          ).localeCompare(
            String(getOrderDate(left))
          )
        )
        .slice(0, 10),
    [periodOrders]
  );

  function unlock(event) {
    event.preventDefault();

    const cleanedSecret =
      secretInput.trim();

    if (!cleanedSecret) {
      setError(
        "Enter the administrator secret."
      );
      return;
    }

    storeSecret(cleanedSecret);
    setAdminSecret(cleanedSecret);
    setSecretInput("");
  }

  function clearSession() {
    removeStoredSecret();
    setAdminSecret("");
    setSecretInput("");
    setOrders([]);
    setCatalog([]);
    setReferrals([]);
    setPayouts([]);
    setIsReady(false);
    setError("");
    setMessage("");
  }

  async function syncGoogleSheets() {
    if (
      !adminSecret ||
      isSyncing
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Copy all current orders and inventory records to the connected Google Sheets accounting workbook?"
      );

    if (!confirmed) {
      return;
    }

    setIsSyncing(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/accounting-sync",
        {
          method: "POST",
          headers: {
            Accept:
              "application/json",
            Authorization:
              `Bearer ${adminSecret}`,
          },
          credentials:
            "same-origin",
        }
      );

      const result =
        await readJson(response);

      setMessage(
        result.message ||
          "Google Sheets accounting data was synchronized."
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Google Sheets synchronization failed."
      );
    } finally {
      setIsSyncing(false);
    }
  }

  if (!adminSecret) {
    return (
      <>
        <style>{accountingCss}</style>

        <main className="acct-page">
          <section className="acct-login">
            <p className="eyebrow">
              PROTECTED ADMIN AREA
            </p>

            <h1>Accounting</h1>

            <p>
              Enter the same
              administrator secret used
              by Orders, Inventory, and
              Affiliate Accounts.
            </p>

            <form onSubmit={unlock}>
              <label className="acct-field">
                <span>
                  Administrator Secret
                </span>

                <input
                  type="password"
                  value={secretInput}
                  onChange={(event) =>
                    setSecretInput(
                      event.target.value
                    )
                  }
                  autoComplete="current-password"
                />
              </label>

              {error && (
                <div
                  className="acct-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="primary-btn"
              >
                Unlock Accounting
              </button>
            </form>

            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                onNavigate(
                  "missionControl"
                )
              }
            >
              Back To Mission Control
            </button>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{accountingCss}</style>

      <main className="acct-page">
        <section className="acct-wrap">
          <div className="acct-topbar">
            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                onNavigate(
                  "missionControl"
                )
              }
            >
              ← Mission Control
            </button>

            <div className="acct-top-actions">
              <span
                className={
                  isReady
                    ? "acct-live"
                    : "acct-pill"
                }
              >
                {isReady
                  ? "Live Records Connected"
                  : "Records Unavailable"}
              </span>

              <button
                type="button"
                className="acct-link"
                onClick={clearSession}
              >
                Clear Admin Session
              </button>
            </div>
          </div>

          <header className="acct-hero">
            <div>
              <p className="eyebrow">
                BUSINESS OPERATIONS
              </p>

              <h1>Accounting</h1>

              <p>
                Review sales, unpaid
                orders, product costs,
                affiliate commissions,
                payouts, and current
                inventory value.
              </p>
            </div>

            <div className="acct-hero-actions">
              <button
                type="button"
                className="secondary-btn"
                disabled={isLoading}
                onClick={() =>
                  loadAccounting()
                }
              >
                {isLoading
                  ? "Refreshing..."
                  : "Refresh Records"}
              </button>

              <button
                type="button"
                className="primary-btn"
                disabled={isSyncing}
                onClick={
                  syncGoogleSheets
                }
              >
                {isSyncing
                  ? "Syncing..."
                  : "Sync Google Sheets"}
              </button>
            </div>
          </header>

          <section className="acct-toolbar">
            <label className="acct-field">
              <span>
                Reporting Period
              </span>

              <select
                value={period}
                onChange={(event) =>
                  setPeriod(
                    event.target.value
                  )
                }
              >
                {PERIODS.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <div className="acct-nav">
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "orderManager"
                  )
                }
              >
                Orders
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "inventoryManager"
                  )
                }
              >
                Inventory
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "affiliateManager"
                  )
                }
              >
                Affiliate Accounts
              </button>
            </div>
          </section>

          {error && (
            <div
              className="acct-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              className="acct-success"
              aria-live="polite"
            >
              {message}
            </div>
          )}

          <section className="acct-card-grid">
            <MetricCard
              label="Paid Revenue"
              value={formatMoney(
                summary.paidRevenueCents
              )}
              detail={`${summary.paidOrders} paid order(s)`}
            />

            <MetricCard
              label="Outstanding Orders"
              value={formatMoney(
                summary.outstandingCents
              )}
              detail={`${summary.unpaidOrders} unpaid order(s)`}
              warning={
                summary.outstandingCents >
                0
              }
            />

            <MetricCard
              label="Estimated COGS"
              value={formatMoney(
                summary.cogsCents
              )}
              detail="Product cost snapshots"
            />

            <MetricCard
              label="Affiliate Commission"
              value={formatMoney(
                summary
                  .earnedCommissionCents
              )}
              detail={`${formatMoney(
                summary.payoutCents
              )} paid during period`}
            />

            <MetricCard
              label="Estimated Gross Margin"
              value={formatMoney(
                summary
                  .estimatedMarginCents
              )}
              detail="Before operating expenses and fees"
              warning={
                summary
                  .estimatedMarginCents < 0
              }
            />

            <MetricCard
              label="Inventory Value"
              value={formatMoney(
                summary
                  .inventoryValueCents
              )}
              detail="Current tracked on-hand cost"
            />

            <MetricCard
              label="Shipping Collected"
              value={formatMoney(
                summary.shippingCents
              )}
              detail="Paid orders"
            />

            <MetricCard
              label="Discounts Given"
              value={formatMoney(
                summary.discountCents
              )}
              detail="Paid orders"
            />

            <MetricCard
              label="Average Paid Order"
              value={formatMoney(
                summary.averageOrderCents
              )}
              detail="Selected reporting period"
            />
          </section>

          <section className="acct-note">
            <strong>
              Operational estimate
            </strong>

            <span>
              Final net profit depends
              on expenses, refunds,
              payment fees, shipping
              label costs, and other
              adjustments maintained in
              the Google Sheets
              accounting workbook.
            </span>
          </section>

          <section className="acct-table-panel">
            <div className="acct-section-heading">
              <div>
                <p className="eyebrow">
                  RECENT ACTIVITY
                </p>

                <h2>
                  Latest Paid Orders
                </h2>
              </div>

              <span>
                Showing up to 10 records
              </span>
            </div>

            {isLoading ? (
              <div className="acct-empty">
                Loading accounting
                records...
              </div>
            ) : recentPaidOrders.length ===
              0 ? (
              <div className="acct-empty">
                No paid orders were
                found for this period.
              </div>
            ) : (
              <div className="acct-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Paid</th>
                      <th>Revenue</th>
                      <th>COGS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentPaidOrders.map(
                      (order) => {
                        const customer =
                          order?.customer ||
                          {};

                        const name =
                          `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
                          customer.email ||
                          "Unavailable";

                        return (
                          <tr
                            key={
                              order.orderId ||
                              order.id
                            }
                          >
                            <td>
                              <strong>
                                {order.orderId ||
                                  order.id}
                              </strong>
                            </td>

                            <td>{name}</td>

                            <td>
                              {formatDate(
                                order
                                  ?.payment
                                  ?.receivedAt ||
                                  getOrderDate(
                                    order
                                  )
                              )}
                            </td>

                            <td>
                              {formatMoney(
                                getPaidAmountCents(
                                  order
                                )
                              )}
                            </td>

                            <td>
                              {formatMoney(
                                getOrderCogsCents(
                                  order
                                )
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  );
}

function MetricCard({
  label,
  value,
  detail,
  warning = false,
}) {
  return (
    <article
      className={`acct-card ${
        warning
          ? "acct-card-warning"
          : ""
      }`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

const accountingCss = `
.acct-page,
.acct-page *,
.acct-page *::before,
.acct-page *::after {
  box-sizing: border-box;
}

.acct-page {
  width: 100%;
  padding: 72px 28px;
}

.acct-wrap {
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
}

.acct-login,
.acct-hero,
.acct-toolbar,
.acct-table-panel,
.acct-note {
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 22px;
  background:
    radial-gradient(circle at top left, rgba(61,165,255,.11), transparent 38%),
    rgba(255,255,255,.04);
  box-shadow: 0 22px 60px rgba(0,0,0,.32);
}

.acct-login {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 40px;
  text-align: center;
}

.acct-login h1,
.acct-hero h1 {
  margin: 8px 0 14px;
  font-size: clamp(38px, 7vw, 62px);
  line-height: 1.04;
}

.acct-login > p:not(.eyebrow),
.acct-hero p,
.acct-note span {
  color: #b7c4cf;
  line-height: 1.65;
}

.acct-login form {
  display: grid;
  gap: 16px;
  margin: 28px 0 14px;
}

.acct-topbar,
.acct-top-actions,
.acct-hero,
.acct-hero-actions,
.acct-toolbar,
.acct-nav,
.acct-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.acct-topbar {
  margin-bottom: 18px;
}

.acct-top-actions,
.acct-hero-actions,
.acct-nav {
  justify-content: flex-end;
}

.acct-live,
.acct-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.25;
  font-weight: 900;
  letter-spacing: .06em;
  text-transform: uppercase;
  text-align: center;
  overflow-wrap: anywhere;
}

.acct-live {
  color: #b9f4d8;
  border: 1px solid rgba(72,214,151,.3);
  background: rgba(72,214,151,.09);
}

.acct-pill {
  color: #ffd4a3;
  border: 1px solid rgba(255,173,76,.3);
  background: rgba(255,173,76,.09);
}

.acct-link {
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: #9ca9b4;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  text-decoration: underline;
}

.acct-hero {
  padding: 30px;
}

.acct-hero > div:first-child {
  max-width: 760px;
}

.acct-toolbar {
  margin-top: 16px;
  padding: 18px;
}

.acct-field {
  display: grid;
  gap: 7px;
  min-width: 220px;
  text-align: left;
}

.acct-field span {
  color: #9eacb9;
  font-size: 12px;
  font-weight: 800;
}

.acct-field input,
.acct-field select {
  width: 100%;
  min-height: 46px;
  padding: 11px 13px;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 12px;
  background: #11161c;
  color: #fff;
  font: inherit;
}

.acct-card-grid {
  display: grid;
  grid-template-columns:
    repeat(auto-fit, minmax(205px, 1fr));
  gap: 13px;
  margin: 18px 0;
}

.acct-card {
  min-width: 0;
  min-height: 132px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 18px;
  background: #11161c;
  display: grid;
  align-content: center;
  gap: 8px;
  overflow: hidden;
}

.acct-card-warning {
  border-color: rgba(255,170,74,.32);
  background: rgba(255,170,74,.07);
}

.acct-card span {
  color: #9ba9b7;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 900;
  letter-spacing: .06em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.acct-card strong {
  min-width: 0;
  font-size: clamp(23px, 4vw, 31px);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.acct-card small {
  color: #81909e;
  line-height: 1.4;
}

.acct-note {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  margin-bottom: 18px;
}

.acct-error,
.acct-success {
  margin: 16px 0;
  padding: 14px 16px;
  border-radius: 13px;
  line-height: 1.5;
}

.acct-error {
  color: #ffd0d0;
  border: 1px solid rgba(255,83,83,.3);
  background: rgba(255,83,83,.09);
}

.acct-success {
  color: #c4f5dd;
  border: 1px solid rgba(72,214,151,.3);
  background: rgba(72,214,151,.09);
}

.acct-table-panel {
  padding: 24px;
}

.acct-section-heading {
  margin-bottom: 16px;
}

.acct-section-heading h2 {
  margin: 4px 0 0;
}

.acct-section-heading > span {
  color: #8998a6;
  font-size: 13px;
}

.acct-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.acct-table-wrap table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
}

.acct-table-wrap th,
.acct-table-wrap td {
  padding: 13px 12px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  text-align: left;
  vertical-align: top;
}

.acct-table-wrap th {
  color: #8f9dab;
  font-size: 11px;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.acct-empty {
  padding: 30px 16px;
  border: 1px dashed rgba(255,255,255,.13);
  border-radius: 15px;
  color: #9cabb7;
  text-align: center;
}

@media (max-width: 720px) {
  .acct-page {
    padding: 48px 16px;
  }

  .acct-login,
  .acct-hero,
  .acct-table-panel {
    padding: 22px;
  }

  .acct-hero-actions,
  .acct-hero-actions button,
  .acct-nav,
  .acct-nav button {
    width: 100%;
  }

  .acct-field {
    width: 100%;
  }
}
`;

export default AccountingManager;
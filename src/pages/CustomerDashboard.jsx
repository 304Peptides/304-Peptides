import { useMemo, useState } from "react";

function getOrderId(order) {
  return String(order?.orderId || order?.id || "Pending");
}

function getOrderDate(order) {
  return order?.createdAt || order?.updatedAt || order?.date || "";
}

function getItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

function getCustomer(order) {
  return order?.customer || {};
}

function getCustomerName(order) {
  const customer = getCustomer(order);
  return (
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
    "Customer unavailable"
  );
}

function getCustomerAddress(order) {
  const customer = getCustomer(order);
  const cityState = [customer.city, customer.state].filter(Boolean).join(", ");

  return (
    [customer.address, cityState, customer.zip].filter(Boolean).join(" ") ||
    "Shipping address unavailable"
  );
}

function getQuantity(order) {
  const savedQuantity = Number(order?.totalQuantity);

  if (Number.isFinite(savedQuantity)) {
    return savedQuantity;
  }

  return getItems(order).reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
}

function getSubtotal(order) {
  const savedSubtotal = Number(order?.subtotal);

  if (Number.isFinite(savedSubtotal)) {
    return savedSubtotal;
  }

  return getItems(order).reduce(
    (total, item) =>
      total + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", {
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

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortOrders(records) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .sort((left, right) =>
      String(getOrderDate(right)).localeCompare(String(getOrderDate(left)))
    );
}

function formatAffiliateStatus(value) {
  const status = String(value || "pending").toLowerCase();

  const labels = {
    pending: "Pending Review",
    approved: "Approved",
    denied: "Not Approved",
    suspended: "Suspended",
  };

  return labels[status] || status;
}

function getAffiliateStatusMessage(value) {
  const status = String(value || "pending").toLowerCase();

  const messages = {
    pending:
      "Your selected code is reserved while the application is reviewed.",
    approved:
      "Your selected code is approved. Referral tracking and commission tools are the next Affiliate Program phase.",
    denied:
      "Review the decision message, update your application, and choose an available code before reapplying.",
    suspended:
      "Your code remains reserved but is currently inactive. Review the message below or contact support.",
  };

  return messages[status] || "Review your current Affiliate Program record.";
}

function getOrderStatusTone(value) {
  const status = String(value || "Order Request Received").toLowerCase();

  if (status.includes("cancel") || status.includes("denied")) {
    return "is-cancelled";
  }

  if (status.includes("deliver") || status.includes("complete")) {
    return "is-complete";
  }

  if (status.includes("ship")) {
    return "is-shipped";
  }

  if (status.includes("paid") || status.includes("payment received")) {
    return "is-paid";
  }

  if (status.includes("invoice")) {
    return "is-invoice";
  }

  return "is-received";
}

function CustomerDashboard({
  onNavigate = () => {},
  orders = [],
  account = null,
  authenticationError = "",
  onRefreshOrders = null,
  partnerApplication = null,
  affiliateApplication = null,
}) {
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [refreshMessage, setRefreshMessage] = useState("");

  const savedOrders = useMemo(() => sortOrders(orders), [orders]);
  const latestOrder = savedOrders[0] || null;
  const hasOrders = savedOrders.length > 0;
  const affiliateRecord = affiliateApplication || partnerApplication;

  const statistics = useMemo(() => {
    return {
      totalOrders: savedOrders.length,
      totalItems: savedOrders.reduce(
        (total, order) => total + getQuantity(order),
        0
      ),
      requestedValue: savedOrders.reduce(
        (total, order) => total + getSubtotal(order),
        0
      ),
      activeOrders: savedOrders.filter((order) => {
        const status = String(order?.status || "").toLowerCase();

        return ![
          "completed",
          "cancelled",
          "canceled",
          "delivered",
        ].includes(status);
      }).length,
    };
  }, [savedOrders]);

  const accountName =
    `${account?.firstName || ""} ${account?.lastName || ""}`.trim() ||
    (latestOrder ? getCustomerName(latestOrder) : "Customer unavailable");

  const accountEmail =
    account?.email || getCustomer(latestOrder).email || "Email unavailable";

  const accountFirstName =
    account?.firstName ||
    getCustomer(latestOrder).firstName ||
    accountName.split(" ")[0] ||
    "Researcher";

  const visibleAuthenticationError = import.meta.env.DEV
    ? ""
    : authenticationError;

  const developmentMessage =
    import.meta.env.DEV && authenticationError
      ? "Development mode: secure account data is being previewed locally."
      : "";

  async function handleRefresh() {
    if (typeof onRefreshOrders !== "function" || isRefreshing) {
      return;
    }

    if (import.meta.env.DEV) {
      setRefreshError("");
      setRefreshMessage(
        "Development mode: your local order history is already up to date."
      );
      return;
    }

    setIsRefreshing(true);
    setRefreshError("");
    setRefreshMessage("");

    try {
      const refreshedOrders = await onRefreshOrders({ replace: true });
      const count = Array.isArray(refreshedOrders)
        ? refreshedOrders.length
        : 0;

      setRefreshMessage(
        count === 1
          ? "Your secure order history is up to date with 1 order."
          : `Your secure order history is up to date with ${count} orders.`
      );
    } catch (error) {
      setRefreshError(error.message || "Order history could not be refreshed.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <>
      <style>{customerDashboardCss}</style>

      <main className="customer-dashboard-page">
        <section className="customer-dashboard-inner">
          <header className="customer-dashboard-hero">
            <span className="customer-dashboard-secure-pill">
              Secure Account
            </span>

            <p className="eyebrow">MY ACCOUNT</p>
            <h1>Welcome Back, {accountFirstName}</h1>

            <p>
              Review your account details, order history, product totals,
              research-use reminders, and Affiliate Dashboard.
            </p>

            <div className="customer-dashboard-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => onNavigate("products")}
              >
                Browse Products
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => onNavigate("changePassword")}
              >
                Change Password
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh Orders"}
              </button>
            </div>
          </header>

          {(refreshError || visibleAuthenticationError) && (
            <div className="customer-dashboard-error" role="alert">
              {refreshError || visibleAuthenticationError}
            </div>
          )}

          {developmentMessage && (
            <div className="customer-dashboard-development" role="status">
              <strong>Local Preview</strong>
              <span>{developmentMessage}</span>
            </div>
          )}

          {refreshMessage && (
            <div className="customer-dashboard-success" aria-live="polite">
              {refreshMessage}
            </div>
          )}

          <section className="customer-dashboard-stats">
            <StatCard
              label="Total Orders"
              value={statistics.totalOrders}
              detail="Account-linked requests"
            />

            <StatCard
              label="Products Ordered"
              value={statistics.totalItems}
              detail="Total products requested"
            />

            <StatCard
              label="Total Requested"
              value={formatMoney(statistics.requestedValue)}
              detail="Across all order requests"
            />

            <StatCard
              label="Active Orders"
              value={statistics.activeOrders}
              detail="Still being processed"
            />
          </section>

          <div className="customer-dashboard-overview">
            <section className="customer-dashboard-panel">
              <p className="eyebrow">ACCOUNT DETAILS</p>
              <h2>Secure Customer Profile</h2>

              <div className="customer-dashboard-info-grid">
                <InfoBox label="Name" value={accountName} />
                <InfoBox label="Email" value={accountEmail} />
                <InfoBox
                  label="Account Status"
                  value={account?.status || "Active"}
                />
                <InfoBox
                  label="Account Created"
                  value={formatDate(account?.createdAt)}
                />

                <div className="customer-dashboard-address-box">
                  <span>Latest Shipping Address</span>
                  <strong>
                    {latestOrder
                      ? getCustomerAddress(latestOrder)
                      : "No shipping address has been used yet"}
                  </strong>
                </div>
              </div>

              {latestOrder && (
                <div className="customer-dashboard-latest-order">
                  <div>
                    <span>Latest Order</span>
                    <strong>#{getOrderId(latestOrder)}</strong>
                  </div>

                  <div>
                    <span>Current Status</span>
                    <strong
                      className={`customer-dashboard-latest-status ${getOrderStatusTone(
                        latestOrder.status
                      )}`}
                    >
                      {latestOrder.status || "Order Request Received"}
                    </strong>
                  </div>

                  <small>{formatDate(getOrderDate(latestOrder))}</small>
                </div>
              )}
            </section>

            <aside className="customer-dashboard-affiliate">
              <p className="eyebrow">AFFILIATE PROGRAM</p>
              <h2>Affiliate Dashboard</h2>

              {affiliateRecord ? (
                <>
                  <InfoBox
                    label="Your Affiliate Code"
                    value={affiliateRecord.code || "Unavailable"}
                  />

                  <InfoBox
                    label="Affiliate Status"
                    value={formatAffiliateStatus(affiliateRecord.status)}
                  />

                  <InfoBox
                    label="Application Submitted"
                    value={formatDate(affiliateRecord.submittedAt)}
                  />

                  <div className="customer-dashboard-affiliate-metrics">
                    <MiniMetric
                      label="Referred Orders"
                      value={Number(
                        affiliateRecord.referredOrders ||
                          affiliateRecord.orderCount ||
                          0
                      )}
                    />
                    <MiniMetric
                      label="Commission Earned"
                      value={formatMoney(
                        affiliateRecord.commissionEarned ||
                          affiliateRecord.totalCommission ||
                          0
                      )}
                    />
                  </div>

                  <p className="customer-dashboard-muted">
                    {getAffiliateStatusMessage(affiliateRecord.status)}
                  </p>

                  {affiliateRecord.customerMessage && (
                    <div className="customer-dashboard-affiliate-message">
                      <strong>Message from 304 Peptides</strong>
                      <p>{affiliateRecord.customerMessage}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="primary-btn customer-dashboard-full-button"
                    onClick={() => onNavigate("partnerApplication")}
                  >
                    {affiliateRecord.status === "denied"
                      ? "Update And Reapply"
                      : "View Affiliate Record"}
                  </button>

                  {affiliateRecord.status === "approved" && (
                    <button
                      type="button"
                      className="secondary-btn customer-dashboard-full-button"
                      disabled
                    >
                      Affiliate Tools Coming Next
                    </button>
                  )}
                </>
              ) : hasOrders ? (
                <>
                  <p className="customer-dashboard-muted">
                    Your first account-linked order request is saved, so your
                    Affiliate Application is now available.
                  </p>

                  <button
                    type="button"
                    className="primary-btn customer-dashboard-full-button"
                    onClick={() => onNavigate("partnerApplication")}
                  >
                    Create Your Affiliate Code
                  </button>
                </>
              ) : (
                <>
                  <p className="customer-dashboard-muted">
                    Submit your first order request to unlock the Affiliate
                    Application.
                  </p>

                  <button
                    type="button"
                    className="primary-btn customer-dashboard-full-button"
                    onClick={() => onNavigate("products")}
                  >
                    Start First Order
                  </button>
                </>
              )}

              <div className="customer-dashboard-affiliate-note">
                Affiliate applications and customer-selected affiliate codes are
                stored securely with the account. Codes activate only after
                administrator approval.
              </div>
            </aside>
          </div>

          <section className="customer-dashboard-orders">
            <div className="customer-dashboard-section-heading">
              <div>
                <p className="eyebrow">ORDER HISTORY</p>
                <h2>Account Order History</h2>
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => onNavigate("products")}
              >
                Shop Again
              </button>
            </div>

            {!hasOrders ? (
              <div className="customer-dashboard-empty">
                <h3>No Account Orders Yet</h3>
                <p>
                  Orders submitted while logged in will appear here with
                  products, status, customer details, and totals.
                </p>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => onNavigate("products")}
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="customer-dashboard-order-stack">
                {savedOrders.map((order) => {
                  const orderId = getOrderId(order);
                  const expanded = expandedOrderId === orderId;
                  const items = getItems(order);
                  const customer = getCustomer(order);

                  return (
                    <article
                      key={orderId}
                      className="customer-dashboard-order-card"
                    >
                      <div className="customer-dashboard-order-summary">
                        <div>
                          <div className="customer-dashboard-order-heading">
                            <span
                              className={`customer-dashboard-status ${getOrderStatusTone(
                                order.status
                              )}`}
                            >
                              {order.status || "Order Request Received"}
                            </span>
                            <small>{formatDate(getOrderDate(order))}</small>
                          </div>

                          <h3>Order #{orderId}</h3>
                          <p>
                            {getQuantity(order)} item(s) · {formatMoney(
                              getSubtotal(order)
                            )}
                          </p>
                        </div>

                        <div className="customer-dashboard-order-preview">
                          {items.slice(0, 2).map((item, index) => (
                            <span key={`${orderId}-${item.codeName || item.name}-${index}`}>
                              {Number(item.quantity || 0)}× {item.name || "Research Product"}
                              {item.strength ? ` — ${item.strength}` : ""}
                            </span>
                          ))}

                          {items.length > 2 && (
                            <small>+{items.length - 2} additional product(s)</small>
                          )}
                        </div>

                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            setExpandedOrderId(expanded ? "" : orderId)
                          }
                        >
                          {expanded ? "Hide Details" : "View Details"}
                        </button>
                      </div>

                      {expanded && (
                        <div className="customer-dashboard-order-details">
                          <section>
                            <h4>Products</h4>

                            <div className="customer-dashboard-product-stack">
                              {items.map((item, index) => (
                                <div
                                  key={`${orderId}-${item.codeName || item.name}-${item.strength || index}`}
                                  className="customer-dashboard-product-row"
                                >
                                  <div>
                                    <strong>
                                      {item.name || "Research Product"}
                                    </strong>
                                    <span>
                                      {[item.codeName, item.strength]
                                        .filter(Boolean)
                                        .join(" · ") || "Details unavailable"}
                                    </span>
                                  </div>

                                  <span>
                                    {Number(item.quantity || 0)} × {formatMoney(
                                      item.price
                                    )}
                                  </span>

                                  <strong>
                                    {formatMoney(
                                      Number(item.quantity || 0) *
                                        Number(item.price || 0)
                                    )}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </section>

                          <section>
                            <h4>Customer</h4>
                            <DetailRow label="Name" value={getCustomerName(order)} />
                            <DetailRow
                              label="Email"
                              value={customer.email || "Unavailable"}
                            />
                            <DetailRow
                              label="Address"
                              value={getCustomerAddress(order)}
                            />
                          </section>

                          <section>
                            <h4>Order Summary</h4>
                            <DetailRow
                              label="Quantity"
                              value={getQuantity(order)}
                            />
                            <DetailRow
                              label="Subtotal"
                              value={formatMoney(getSubtotal(order))}
                            />
                            <DetailRow
                              label="Payment Preference"
                              value={
                                order.preferredPaymentLabel ||
                                order.preferredPaymentMethod ||
                                "Unavailable"
                              }
                            />
                          </section>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="customer-dashboard-research-notice">
            For research use only. Not for human consumption.
          </div>
        </section>
      </main>
    </>
  );
}

function StatCard({ label, value, detail }) {
  return (
    <div className="customer-dashboard-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="customer-dashboard-info-box">
      <span>{label}</span>
      <strong>{value || "Unavailable"}</strong>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="customer-dashboard-mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="customer-dashboard-detail-row">
      <span>{label}</span>
      <strong>{value || "Unavailable"}</strong>
    </div>
  );
}

const customerDashboardCss = `
/* 304 AFFILIATE DASHBOARD UPGRADE */
.customer-dashboard-page,
.customer-dashboard-page *,
.customer-dashboard-page *::before,
.customer-dashboard-page *::after {
  box-sizing: border-box;
}

.customer-dashboard-page {
  width: 100%;
  padding: 72px 28px;
}

.customer-dashboard-inner {
  width: 100%;
  max-width: 1260px;
  margin: 0 auto;
}

.customer-dashboard-hero,
.customer-dashboard-panel,
.customer-dashboard-affiliate,
.customer-dashboard-orders {
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(61, 165, 255, .13), transparent 38%),
    rgba(255, 255, 255, .035);
  box-shadow: 0 28px 75px rgba(0, 0, 0, .4);
}

.customer-dashboard-hero {
  position: relative;
  padding: 48px;
  margin-bottom: 20px;
  text-align: center;
}

.customer-dashboard-secure-pill {
  display: inline-flex;
  padding: 8px 12px;
  margin-bottom: 14px;
  border: 1px solid rgba(72, 214, 151, .3);
  border-radius: 999px;
  background: rgba(72, 214, 151, .09);
  color: #b8f3d8;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.customer-dashboard-hero h1 {
  margin: 7px 0 16px;
  font-size: clamp(39px, 7vw, 64px);
  line-height: 1.03;
}

.customer-dashboard-hero > p:not(.eyebrow) {
  max-width: 850px;
  margin: 0 auto;
  color: #bac4cb;
  line-height: 1.72;
}

.customer-dashboard-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 25px;
}

.customer-dashboard-error,
.customer-dashboard-success,
.customer-dashboard-development {
  margin: 16px 0;
  padding: 15px;
  border-radius: 14px;
  line-height: 1.55;
}

.customer-dashboard-error {
  border: 1px solid rgba(255, 95, 95, .34);
  background: rgba(255, 70, 70, .1);
  color: #ffd0d0;
}

.customer-dashboard-success {
  border: 1px solid rgba(72, 214, 151, .3);
  background: rgba(72, 214, 151, .09);
  color: #b8f3d8;
}

.customer-dashboard-development {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  border: 1px solid rgba(61, 165, 255, .28);
  background: rgba(61, 165, 255, .08);
  color: #b8e4ff;
}

.customer-dashboard-development strong {
  text-transform: uppercase;
  letter-spacing: .6px;
}

.customer-dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.customer-dashboard-stat-card,
.customer-dashboard-info-box,
.customer-dashboard-address-box {
  min-width: 0;
  display: grid;
  gap: 7px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 15px;
  background: rgba(255, 255, 255, .035);
  overflow-wrap: anywhere;
}

.customer-dashboard-stat-card span,
.customer-dashboard-info-box span,
.customer-dashboard-address-box span,
.customer-dashboard-detail-row span {
  color: #9ed8ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.customer-dashboard-stat-card strong {
  font-size: 29px;
}

.customer-dashboard-stat-card small {
  color: #8f9aa2;
}

.customer-dashboard-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(310px, 370px);
  gap: 20px;
  align-items: start;
  margin-bottom: 20px;
}

.customer-dashboard-panel,
.customer-dashboard-affiliate,
.customer-dashboard-orders {
  padding: 30px;
}

.customer-dashboard-affiliate {
  position: sticky;
  top: 105px;
}

.customer-dashboard-panel h2,
.customer-dashboard-affiliate h2,
.customer-dashboard-orders h2 {
  margin: 7px 0 20px;
  font-size: clamp(28px, 4vw, 38px);
  line-height: 1.12;
}

.customer-dashboard-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.customer-dashboard-address-box {
  grid-column: 1 / -1;
  border-color: rgba(61, 165, 255, .2);
  background: rgba(61, 165, 255, .08);
}

.customer-dashboard-affiliate .customer-dashboard-info-box {
  margin-bottom: 11px;
  border-color: rgba(61, 165, 255, .2);
  background: rgba(61, 165, 255, .08);
}

.customer-dashboard-affiliate-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.customer-dashboard-mini-metric {
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid rgba(72, 214, 151, .2);
  border-radius: 14px;
  background: rgba(72, 214, 151, .07);
}

.customer-dashboard-mini-metric span {
  color: #a9dcca;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .6px;
  text-transform: uppercase;
}

.customer-dashboard-mini-metric strong {
  overflow-wrap: anywhere;
  font-size: 20px;
}

.customer-dashboard-latest-order {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 15px;
  background: rgba(0, 0, 0, .15);
}

.customer-dashboard-latest-order > div {
  display: grid;
  gap: 5px;
}

.customer-dashboard-latest-order span {
  color: #9ed8ff;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.customer-dashboard-latest-order small {
  grid-column: 1 / -1;
  color: #8f9aa2;
}

.customer-dashboard-muted {
  margin: 14px 0;
  color: #c2cbd1;
  line-height: 1.65;
}

.customer-dashboard-full-button {
  width: 100%;
  margin-top: 12px;
}

.customer-dashboard-affiliate-message,
.customer-dashboard-affiliate-note {
  margin-top: 16px;
  padding: 14px;
  border-radius: 14px;
  line-height: 1.6;
}

.customer-dashboard-affiliate-message {
  border: 1px solid rgba(61, 165, 255, .28);
  background: rgba(61, 165, 255, .08);
}

.customer-dashboard-affiliate-message p {
  margin-top: 6px;
  color: #b8c4cc;
}

.customer-dashboard-affiliate-note {
  border: 1px solid rgba(255, 255, 255, .08);
  background: rgba(255, 255, 255, .03);
  color: #929da6;
  font-size: 13px;
}

.customer-dashboard-section-heading,
.customer-dashboard-order-summary,
.customer-dashboard-order-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.customer-dashboard-section-heading {
  margin-bottom: 20px;
}

.customer-dashboard-empty {
  padding: 38px 20px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 18px;
  background: rgba(255, 255, 255, .03);
  text-align: center;
}

.customer-dashboard-empty p {
  max-width: 700px;
  margin: 9px auto 20px;
  color: #aeb8bf;
  line-height: 1.65;
}

.customer-dashboard-order-stack {
  display: grid;
  gap: 14px;
}

.customer-dashboard-order-card {
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 19px;
  background: rgba(0, 0, 0, .15);
}

.customer-dashboard-order-summary > div:first-child {
  flex: 1 1 320px;
}

.customer-dashboard-order-summary h3 {
  margin: 7px 0;
  font-size: 25px;
}

.customer-dashboard-order-summary p,
.customer-dashboard-order-preview {
  color: #aeb8bf;
}

.customer-dashboard-order-heading {
  justify-content: flex-start;
}

.customer-dashboard-status,
.customer-dashboard-latest-status {
  display: inline-flex;
  width: fit-content;
  padding: 6px 9px;
  border: 1px solid rgba(61, 165, 255, .22);
  border-radius: 999px;
  background: rgba(61, 165, 255, .12);
  color: #b8e4ff;
  font-size: 10px;
  font-weight: 900;
  line-height: 1.25;
  text-transform: uppercase;
}

.customer-dashboard-status.is-received,
.customer-dashboard-latest-status.is-received {
  border-color: rgba(255, 193, 92, .3);
  background: rgba(255, 193, 92, .11);
  color: #ffe0a6;
}

.customer-dashboard-status.is-invoice,
.customer-dashboard-latest-status.is-invoice {
  border-color: rgba(123, 191, 255, .32);
  background: rgba(61, 165, 255, .13);
  color: #b8e4ff;
}

.customer-dashboard-status.is-paid,
.customer-dashboard-latest-status.is-paid {
  border-color: rgba(72, 214, 151, .31);
  background: rgba(72, 214, 151, .1);
  color: #b8f3d8;
}

.customer-dashboard-status.is-shipped,
.customer-dashboard-latest-status.is-shipped {
  border-color: rgba(168, 139, 250, .34);
  background: rgba(139, 92, 246, .12);
  color: #ddd0ff;
}

.customer-dashboard-status.is-complete,
.customer-dashboard-latest-status.is-complete {
  border-color: rgba(72, 214, 151, .38);
  background: rgba(72, 214, 151, .14);
  color: #d1ffe9;
}

.customer-dashboard-status.is-cancelled,
.customer-dashboard-latest-status.is-cancelled {
  border-color: rgba(255, 95, 95, .35);
  background: rgba(255, 70, 70, .11);
  color: #ffd0d0;
}

.customer-dashboard-order-heading small {
  color: #8f9aa2;
}

.customer-dashboard-order-preview {
  flex: 1 1 280px;
  display: grid;
  gap: 6px;
  font-size: 13px;
}

.customer-dashboard-order-details {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 13px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, .08);
}

.customer-dashboard-order-details > section {
  min-width: 0;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 15px;
  background: rgba(255, 255, 255, .025);
}

.customer-dashboard-order-details h4 {
  margin-bottom: 12px;
  font-size: 19px;
}

.customer-dashboard-product-stack {
  display: grid;
  gap: 9px;
}

.customer-dashboard-product-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding: 11px;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 12px;
  background: rgba(0, 0, 0, .13);
}

.customer-dashboard-product-row > div {
  display: grid;
  gap: 4px;
}

.customer-dashboard-product-row span {
  color: #9ca7af;
  font-size: 12px;
}

.customer-dashboard-detail-row {
  display: grid;
  gap: 5px;
  padding: 9px 0;
  border-bottom: 1px solid rgba(255, 255, 255, .06);
  overflow-wrap: anywhere;
}

.customer-dashboard-detail-row:last-child {
  border-bottom: 0;
}

.customer-dashboard-research-notice {
  margin-top: 20px;
  padding: 18px;
  border: 1px solid rgba(61, 165, 255, .27);
  border-radius: 17px;
  background: rgba(61, 165, 255, .09);
  color: #9ed8ff;
  font-weight: 900;
  letter-spacing: .8px;
  text-align: center;
  text-transform: uppercase;
}

button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

@media (max-width: 1000px) {
  .customer-dashboard-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .customer-dashboard-overview,
  .customer-dashboard-order-details {
    grid-template-columns: minmax(0, 1fr);
  }

  .customer-dashboard-affiliate {
    position: static;
  }
}

@media (max-width: 680px) {
  .customer-dashboard-page {
    padding: 44px 12px;
  }

  .customer-dashboard-hero,
  .customer-dashboard-panel,
  .customer-dashboard-affiliate,
  .customer-dashboard-orders {
    padding: 20px;
    border-radius: 20px;
  }

  .customer-dashboard-stats,
  .customer-dashboard-info-grid,
  .customer-dashboard-latest-order,
  .customer-dashboard-affiliate-metrics {
    grid-template-columns: minmax(0, 1fr);
  }

  .customer-dashboard-address-box,
  .customer-dashboard-latest-order small {
    grid-column: auto;
  }

  .customer-dashboard-actions,
  .customer-dashboard-actions button,
  .customer-dashboard-section-heading > button,
  .customer-dashboard-order-summary > button {
    width: 100%;
  }

  .customer-dashboard-product-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
`;

export default CustomerDashboard;

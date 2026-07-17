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

function getShipments(order) {
  return Array.isArray(order?.shipments) ? order.shipments : [];
}

function formatTrackingStatus(value) {
  return String(value || "Tracking Available")
    .trim()
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

  const cityState = [
    customer.city,
    customer.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    [
      customer.address,
      cityState,
      customer.zip,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Shipping address unavailable"
  );
}

function getQuantity(order) {
  const savedQuantity = Number(
    order?.totalQuantity
  );

  if (Number.isFinite(savedQuantity)) {
    return savedQuantity;
  }

  return getItems(order).reduce(
    (total, item) =>
      total +
      Number(item.quantity || 0),
    0
  );
}

function getSubtotal(order) {
  const savedSubtotal = Number(
    order?.subtotal
  );

  if (Number.isFinite(savedSubtotal)) {
    return savedSubtotal;
  }

  return getItems(order).reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
        Number(item.quantity || 0),
    0
  );
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    }
  );
}

function formatDate(value) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function sortOrders(records) {
  return (
    Array.isArray(records)
      ? records
      : []
  )
    .filter(
      (record) =>
        record &&
        typeof record === "object"
    )
    .sort((left, right) =>
      String(
        getOrderDate(right)
      ).localeCompare(
        String(
          getOrderDate(left)
        )
      )
    );
}

function formatPartnerStatus(value) {
  const status = String(
    value || "pending"
  ).toLowerCase();

  const labels = {
    pending: "Pending Review",
    approved: "Approved",
    denied: "Not Approved",
    suspended: "Suspended",
  };

  return labels[status] || status;
}

function getPartnerStatusMessage(value) {
  const status = String(
    value || "pending"
  ).toLowerCase();

  const messages = {
    pending:
      "Your selected code is reserved while the application is reviewed.",

    approved:
      "Your selected code is approved. Referral tracking and commission tools are the next Partner Program phase.",

    denied:
      "Review the decision message, update your application, and choose an available code before reapplying.",

    suspended:
      "Your code remains reserved but is currently inactive. Review the message below or contact support.",
  };

  return (
    messages[status] ||
    "Review your current Partner Program record."
  );
}

function CustomerDashboard({
  onNavigate = () => {},
  orders = [],
  account = null,
  authenticationError = "",
  onRefreshOrders = null,
  partnerApplication = null,
}) {
  const [
    expandedOrderId,
    setExpandedOrderId,
  ] = useState("");

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    refreshError,
    setRefreshError,
  ] = useState("");

  const [
    refreshMessage,
    setRefreshMessage,
  ] = useState("");

  const savedOrders = useMemo(
    () =>
      sortOrders(orders),
    [orders]
  );

  const latestOrder =
    savedOrders[0] || null;

  const hasOrders =
    savedOrders.length > 0;

  const statistics = useMemo(
    () => ({
      totalOrders:
        savedOrders.length,

      totalItems:
        savedOrders.reduce(
          (total, order) =>
            total +
            getQuantity(order),
          0
        ),

      requestedValue:
        savedOrders.reduce(
          (total, order) =>
            total +
            getSubtotal(order),
          0
        ),

      activeOrders:
        savedOrders.filter(
          (order) =>
            ![
              "Completed",
              "Cancelled",
            ].includes(
              order.status
            )
        ).length,
    }),
    [savedOrders]
  );

  const accountName =
    `${account?.firstName || ""} ${
      account?.lastName || ""
    }`.trim() ||
    (
      latestOrder
        ? getCustomerName(
            latestOrder
          )
        : "Customer unavailable"
    );

  const accountEmail =
    account?.email ||
    getCustomer(
      latestOrder
    ).email ||
    "Email unavailable";

  async function handleRefresh() {
    if (
      typeof onRefreshOrders !==
        "function" ||
      isRefreshing
    ) {
      return;
    }

    setIsRefreshing(true);
    setRefreshError("");
    setRefreshMessage("");

    try {
      const refreshedOrders =
        await onRefreshOrders({
          replace: true,
        });

      const count =
        Array.isArray(
          refreshedOrders
        )
          ? refreshedOrders.length
          : 0;

      setRefreshMessage(
        count === 1
          ? "Your secure order history is up to date with 1 order."
          : `Your secure order history is up to date with ${count} orders.`
      );
    } catch (error) {
      setRefreshError(
        error.message ||
          "Order history could not be refreshed."
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <>
      <style>
        {customerDashboardCss}
      </style>

      <main className="customer-dashboard-page">
        <section className="customer-dashboard-inner">
          <header className="customer-dashboard-hero">
            <span className="customer-dashboard-secure-pill">
              Secure Account
            </span>

            <p className="eyebrow">
              RESEARCH HUB
            </p>

            <h1>
              Order Dashboard
            </h1>

            <p>
              Review
              account-linked
              order history,
              checkout details,
              product totals,
              research-use
              reminders, and
              your Partner
              Program record.
            </p>

            <div className="customer-dashboard-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  onNavigate(
                    "products"
                  )
                }
              >
                Browse Products
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "changePassword"
                  )
                }
              >
                Change Password
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={
                  handleRefresh
                }
                disabled={
                  isRefreshing
                }
              >
                {isRefreshing
                  ? "Refreshing..."
                  : "Refresh Orders"}
              </button>
            </div>
          </header>

          {(refreshError ||
            authenticationError) && (
            <div
              className="customer-dashboard-error"
              role="alert"
            >
              {refreshError ||
                authenticationError}
            </div>
          )}

          {refreshMessage && (
            <div
              className="customer-dashboard-success"
              aria-live="polite"
            >
              {refreshMessage}
            </div>
          )}

          <section className="customer-dashboard-stats">
            <StatCard
              label="Orders"
              value={
                statistics.totalOrders
              }
              detail="Account-linked records"
            />

            <StatCard
              label="Items"
              value={
                statistics.totalItems
              }
              detail="Research products requested"
            />

            <StatCard
              label="Requested Value"
              value={formatMoney(
                statistics.requestedValue
              )}
              detail="Before payment completion"
            />

            <StatCard
              label="Active"
              value={
                statistics.activeOrders
              }
              detail="Not completed or cancelled"
            />
          </section>

          <div className="customer-dashboard-overview">
            <section className="customer-dashboard-panel">
              <p className="eyebrow">
                ACCOUNT DETAILS
              </p>

              <h2>
                Secure Customer
                Profile
              </h2>

              <div className="customer-dashboard-info-grid">
                <InfoBox
                  label="Name"
                  value={
                    accountName
                  }
                />

                <InfoBox
                  label="Email"
                  value={
                    accountEmail
                  }
                />

                <InfoBox
                  label="Account Status"
                  value={
                    account?.status ||
                    "Active"
                  }
                />

                <InfoBox
                  label="Account Created"
                  value={formatDate(
                    account?.createdAt
                  )}
                />

                <div className="customer-dashboard-address-box">
                  <span>
                    Latest Shipping
                    Address
                  </span>

                  <strong>
                    {latestOrder
                      ? getCustomerAddress(
                          latestOrder
                        )
                      : "No shipping address has been used yet"}
                  </strong>
                </div>
              </div>

              {latestOrder && (
                <div className="customer-dashboard-latest-order">
                  <div>
                    <span>
                      Latest Order
                    </span>

                    <strong>
                      #
                      {getOrderId(
                        latestOrder
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Current Status
                    </span>

                    <strong>
                      {latestOrder.status ||
                        "Order Request Received"}
                    </strong>
                  </div>

                  <small>
                    {formatDate(
                      getOrderDate(
                        latestOrder
                      )
                    )}
                  </small>
                </div>
              )}
            </section>

            <aside className="customer-dashboard-partner">
              <p className="eyebrow">
                PARTNER PROGRAM
              </p>

              <h2>
                Research Partner
                Access
              </h2>

              {partnerApplication ? (
                <>
                  <InfoBox
                    label="Your Code"
                    value={
                      partnerApplication.code ||
                      "Unavailable"
                    }
                  />

                  <InfoBox
                    label="Status"
                    value={formatPartnerStatus(
                      partnerApplication.status
                    )}
                  />

                  <InfoBox
                    label="Submitted"
                    value={formatDate(
                      partnerApplication.submittedAt
                    )}
                  />

                  <p className="customer-dashboard-muted">
                    {getPartnerStatusMessage(
                      partnerApplication.status
                    )}
                  </p>

                  {partnerApplication.customerMessage && (
                    <div className="customer-dashboard-partner-message">
                      <strong>
                        Message from
                        304 Peptides
                      </strong>

                      <p>
                        {
                          partnerApplication.customerMessage
                        }
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="primary-btn customer-dashboard-full-button"
                    onClick={() =>
                      onNavigate(
                        "partnerApplication"
                      )
                    }
                  >
                    {partnerApplication.status ===
                    "denied"
                      ? "Update And Reapply"
                      : "View Partner Record"}
                  </button>

                  {partnerApplication.status ===
                    "approved" && (
                    <button
                      type="button"
                      className="secondary-btn customer-dashboard-full-button"
                      disabled
                    >
                      Referral Tools
                      Coming Next
                    </button>
                  )}
                </>
              ) : hasOrders ? (
                <>
                  <p className="customer-dashboard-muted">
                    Your first
                    account-linked
                    order request is
                    saved, so the
                    Partner
                    Application is
                    available.
                  </p>

                  <button
                    type="button"
                    className="primary-btn customer-dashboard-full-button"
                    onClick={() =>
                      onNavigate(
                        "partnerApplication"
                      )
                    }
                  >
                    Create Your
                    Affiliate Code
                  </button>
                </>
              ) : (
                <>
                  <p className="customer-dashboard-muted">
                    Submit your
                    first order
                    request to
                    unlock the
                    Partner
                    Application.
                  </p>

                  <button
                    type="button"
                    className="primary-btn customer-dashboard-full-button"
                    onClick={() =>
                      onNavigate(
                        "products"
                      )
                    }
                  >
                    Start First
                    Order
                  </button>
                </>
              )}

              <div className="customer-dashboard-partner-note">
                Partner
                applications and
                customer-selected
                affiliate codes
                are stored
                securely with
                the account.
                Codes activate
                only after
                administrator
                approval.
              </div>
            </aside>
          </div>

          <section className="customer-dashboard-orders">
            <div className="customer-dashboard-section-heading">
              <div>
                <p className="eyebrow">
                  ORDER HISTORY
                </p>

                <h2>
                  Account Order
                  History
                </h2>
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "products"
                  )
                }
              >
                Shop Again
              </button>
            </div>

            {!hasOrders ? (
              <div className="customer-dashboard-empty">
                <h3>
                  No Account
                  Orders Yet
                </h3>

                <p>
                  Orders submitted
                  while logged in
                  will appear here
                  with products,
                  status, customer
                  details, and
                  totals.
                </p>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() =>
                    onNavigate(
                      "products"
                    )
                  }
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="customer-dashboard-order-stack">
                {savedOrders.map(
                  (order) => {
                    const orderId =
                      getOrderId(
                        order
                      );

                    const expanded =
                      expandedOrderId ===
                      orderId;

                    const items =
                      getItems(
                        order
                      );

                    const customer =
                      getCustomer(
                        order
                      );

                    const shipments =
                      getShipments(
                        order
                      );

                    return (
                      <article
                        key={
                          orderId
                        }
                        className="customer-dashboard-order-card"
                      >
                        <div className="customer-dashboard-order-summary">
                          <div>
                            <div className="customer-dashboard-order-heading">
                              <span className="customer-dashboard-status">
                                {order.status ||
                                  "Order Request Received"}
                              </span>

                              <small>
                                {formatDate(
                                  getOrderDate(
                                    order
                                  )
                                )}
                              </small>
                            </div>

                            <h3>
                              Order #
                              {
                                orderId
                              }
                            </h3>

                            <p>
                              {getQuantity(
                                order
                              )}{" "}
                              item(s) ·{" "}
                              {formatMoney(
                                getSubtotal(
                                  order
                                )
                              )}
                            </p>
                          </div>

                          <div className="customer-dashboard-order-preview">
                            {items
                              .slice(
                                0,
                                2
                              )
                              .map(
                                (
                                  item,
                                  index
                                ) => (
                                  <span
                                    key={`${orderId}-${item.codeName || item.name}-${index}`}
                                  >
                                    {Number(
                                      item.quantity ||
                                        0
                                    )}
                                    ×{" "}
                                    {item.name ||
                                      "Research Product"}
                                    {item.strength
                                      ? ` — ${item.strength}`
                                      : ""}
                                  </span>
                                )
                              )}

                            {items.length >
                              2 && (
                              <small>
                                +
                                {items.length -
                                  2}{" "}
                                additional
                                product(s)
                              </small>
                            )}
                          </div>

                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() =>
                              setExpandedOrderId(
                                expanded
                                  ? ""
                                  : orderId
                              )
                            }
                          >
                            {expanded
                              ? "Hide Details"
                              : "View Details"}
                          </button>
                        </div>

                        {expanded && (
                          <div className="customer-dashboard-order-details">
                            <section>
                              <h4>
                                Products
                              </h4>

                              <div className="customer-dashboard-product-stack">
                                {items.map(
                                  (
                                    item,
                                    index
                                  ) => (
                                    <div
                                      key={`${orderId}-${item.codeName || item.name}-${item.strength || index}`}
                                      className="customer-dashboard-product-row"
                                    >
                                      <div>
                                        <strong>
                                          {item.name ||
                                            "Research Product"}
                                        </strong>

                                        <span>
                                          {[
                                            item.codeName,
                                            item.strength,
                                          ]
                                            .filter(
                                              Boolean
                                            )
                                            .join(
                                              " · "
                                            ) ||
                                            "Details unavailable"}
                                        </span>
                                      </div>

                                      <span>
                                        {Number(
                                          item.quantity ||
                                            0
                                        )}{" "}
                                        ×{" "}
                                        {formatMoney(
                                          item.price
                                        )}
                                      </span>

                                      <strong>
                                        {formatMoney(
                                          Number(
                                            item.quantity ||
                                              0
                                          ) *
                                            Number(
                                              item.price ||
                                                0
                                            )
                                        )}
                                      </strong>
                                    </div>
                                  )
                                )}
                              </div>
                            </section>

                            <section>
                              <h4>
                                Customer
                              </h4>

                              <DetailRow
                                label="Name"
                                value={getCustomerName(
                                  order
                                )}
                              />

                              <DetailRow
                                label="Email"
                                value={
                                  customer.email ||
                                  "Unavailable"
                                }
                              />

                              <DetailRow
                                label="Address"
                                value={getCustomerAddress(
                                  order
                                )}
                              />
                            </section>

                            <section>
                              <h4>
                                Order Summary
                              </h4>

                              <DetailRow
                                label="Quantity"
                                value={getQuantity(
                                  order
                                )}
                              />

                              <DetailRow
                                label="Subtotal"
                                value={formatMoney(
                                  getSubtotal(
                                    order
                                  )
                                )}
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

                            {shipments.length > 0 && (
                              <section className="customer-dashboard-shipment-section">
                                <h4>
                                  Shipment Tracking
                                </h4>

                                <div className="customer-dashboard-shipment-stack">
                                  {[...shipments].reverse().map(
                                    (shipment, shipmentIndex) => (
                                      <article
                                        key={
                                          shipment.shipmentId ||
                                          `${shipment.trackingNumber}-${shipmentIndex}`
                                        }
                                        className={`customer-dashboard-shipment-card customer-dashboard-shipment-card--${String(
                                          shipment.trackingStatus || "available"
                                        )
                                          .toLowerCase()
                                          .replace(/[^a-z0-9]+/g, "-")}`}
                                      >
                                        <div className="customer-dashboard-shipment-heading">
                                          <div>
                                            <span>
                                              Package {shipment.packageNumber || shipments.length - shipmentIndex}
                                            </span>

                                            <strong>
                                              {shipment.carrier || "Carrier"}{" "}
                                              {shipment.trackingNumber || "Tracking unavailable"}
                                            </strong>
                                          </div>

                                          {shipment.trackingUrl && (
                                            <a
                                              href={shipment.trackingUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              Track Package
                                            </a>
                                          )}
                                        </div>

                                        <div className="customer-dashboard-tracking-status">
                                          <strong>
                                            {formatTrackingStatus(
                                              shipment.trackingStatus
                                            )}
                                          </strong>

                                          {shipment.trackingStatusDetails && (
                                            <p>
                                              {shipment.trackingStatusDetails}
                                            </p>
                                          )}

                                          {shipment.trackingStatusLocation && (
                                            <small>
                                              Location: {shipment.trackingStatusLocation}
                                            </small>
                                          )}

                                          {shipment.trackingEta && (
                                            <small>
                                              Estimated delivery: {formatDate(shipment.trackingEta)}
                                            </small>
                                          )}

                                          {shipment.trackingStatusDate && (
                                            <small>
                                              Carrier update: {formatDate(shipment.trackingStatusDate)}
                                            </small>
                                          )}

                                          <small>
                                            Shipped: {formatDate(shipment.shippedAt)}
                                          </small>
                                        </div>

                                        {Array.isArray(shipment.items) &&
                                          shipment.items.length > 0 && (
                                            <div className="customer-dashboard-shipment-items">
                                              {shipment.items.map((item, itemIndex) => (
                                                <small
                                                  key={`${shipment.shipmentId || shipmentIndex}-${item.index}-${itemIndex}`}
                                                >
                                                  {Number(item.quantity || 0)} ×{" "}
                                                  {item.name || item.codeName || "Research Product"}
                                                  {item.strength
                                                    ? ` — ${item.strength}`
                                                    : ""}
                                                </small>
                                              ))}
                                            </div>
                                          )}

                                        {shipment.note && (
                                          <p className="customer-dashboard-shipment-note">
                                            {shipment.note}
                                          </p>
                                        )}
                                      </article>
                                    )
                                  )}
                                </div>
                              </section>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <div className="customer-dashboard-research-notice">
            For research use
            only. Not for human
            consumption.
          </div>
        </section>
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
  detail,
}) {
  return (
    <div className="customer-dashboard-stat-card">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <small>
        {detail}
      </small>
    </div>
  );
}

function InfoBox({
  label,
  value,
}) {
  return (
    <div className="customer-dashboard-info-box">
      <span>
        {label}
      </span>

      <strong>
        {value ||
          "Unavailable"}
      </strong>
    </div>
  );
}

function DetailRow({
  label,
  value,
}) {
  return (
    <div className="customer-dashboard-detail-row">
      <span>
        {label}
      </span>

      <strong>
        {value ||
          "Unavailable"}
      </strong>
    </div>
  );
}

const customerDashboardCss = `
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
.customer-dashboard-partner,
.customer-dashboard-orders {
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 28px;
  background:
    radial-gradient(
      circle at top left,
      rgba(61, 165, 255, .13),
      transparent 38%
    ),
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
.customer-dashboard-success {
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

.customer-dashboard-stats {
  display: grid;
  grid-template-columns:
    repeat(
      4,
      minmax(0, 1fr)
    );
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
  grid-template-columns:
    minmax(0, 1fr)
    minmax(310px, 370px);
  gap: 20px;
  align-items: start;
  margin-bottom: 20px;
}

.customer-dashboard-panel,
.customer-dashboard-partner,
.customer-dashboard-orders {
  padding: 30px;
}

.customer-dashboard-partner {
  position: sticky;
  top: 105px;
}

.customer-dashboard-panel h2,
.customer-dashboard-partner h2,
.customer-dashboard-orders h2 {
  margin: 7px 0 20px;
  font-size: clamp(28px, 4vw, 38px);
  line-height: 1.12;
}

.customer-dashboard-info-grid {
  display: grid;
  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );
  gap: 12px;
}

.customer-dashboard-address-box {
  grid-column: 1 / -1;
  border-color: rgba(61, 165, 255, .2);
  background: rgba(61, 165, 255, .08);
}

.customer-dashboard-partner .customer-dashboard-info-box {
  margin-bottom: 11px;
  border-color: rgba(61, 165, 255, .2);
  background: rgba(61, 165, 255, .08);
}

.customer-dashboard-latest-order {
  display: grid;
  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );
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

.customer-dashboard-partner-message,
.customer-dashboard-partner-note {
  margin-top: 16px;
  padding: 14px;
  border-radius: 14px;
  line-height: 1.6;
}

.customer-dashboard-partner-message {
  border: 1px solid rgba(61, 165, 255, .28);
  background: rgba(61, 165, 255, .08);
}

.customer-dashboard-partner-message p {
  margin-top: 6px;
  color: #b8c4cc;
}

.customer-dashboard-partner-note {
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

.customer-dashboard-status {
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(61, 165, 255, .12);
  color: #b8e4ff;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
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
  grid-template-columns:
    1.4fr 1fr 1fr;
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
  grid-template-columns:
    minmax(0, 1fr)
    auto
    auto;
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
.customer-dashboard-shipment-section {
  grid-column: 1 / -1;
}

.customer-dashboard-shipment-stack {
  display: grid;
  gap: 12px;
}

.customer-dashboard-shipment-card {
  display: grid;
  gap: 12px;
  padding: 15px;
  border: 1px solid rgba(61, 165, 255, .2);
  border-radius: 14px;
  background: rgba(0, 0, 0, .16);
}

.customer-dashboard-shipment-heading {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.customer-dashboard-shipment-heading > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.customer-dashboard-shipment-heading span {
  color: #9ed8ff;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.customer-dashboard-shipment-heading strong {
  overflow-wrap: anywhere;
}

.customer-dashboard-shipment-heading a {
  flex: 0 0 auto;
  padding: 8px 11px;
  border: 1px solid rgba(61, 165, 255, .34);
  border-radius: 9px;
  color: #9ed8ff;
  font-size: 11px;
  font-weight: 900;
  text-decoration: none;
}

.customer-dashboard-shipment-heading a:hover {
  border-color: rgba(61, 165, 255, .7);
  background: rgba(61, 165, 255, .1);
}

.customer-dashboard-tracking-status {
  display: grid;
  gap: 5px;
  padding: 11px;
  border: 1px solid rgba(61, 165, 255, .18);
  border-radius: 11px;
  background: rgba(61, 165, 255, .07);
}

.customer-dashboard-tracking-status > strong {
  color: #9ed8ff;
  font-size: 12px;
  letter-spacing: .5px;
  text-transform: uppercase;
}

.customer-dashboard-tracking-status p,
.customer-dashboard-tracking-status small,
.customer-dashboard-shipment-items small,
.customer-dashboard-shipment-note {
  margin: 0;
  color: #aeb8bf;
  font-size: 11px;
  line-height: 1.55;
}

.customer-dashboard-shipment-items {
  display: grid;
  gap: 3px;
}

.customer-dashboard-shipment-note {
  padding-top: 9px;
  border-top: 1px solid rgba(255, 255, 255, .07);
}

.customer-dashboard-shipment-card--delivered {
  border-color: rgba(72, 214, 151, .3);
}

.customer-dashboard-shipment-card--delivered .customer-dashboard-tracking-status {
  border-color: rgba(72, 214, 151, .25);
  background: rgba(72, 214, 151, .08);
}

.customer-dashboard-shipment-card--delivered .customer-dashboard-tracking-status > strong {
  color: #b8f3d8;
}

.customer-dashboard-shipment-card--failure,
.customer-dashboard-shipment-card--returned {
  border-color: rgba(255, 122, 122, .3);
}

.customer-dashboard-shipment-card--failure .customer-dashboard-tracking-status,
.customer-dashboard-shipment-card--returned .customer-dashboard-tracking-status {
  border-color: rgba(255, 122, 122, .27);
  background: rgba(170, 45, 45, .1);
}

.customer-dashboard-shipment-card--failure .customer-dashboard-tracking-status > strong,
.customer-dashboard-shipment-card--returned .customer-dashboard-tracking-status > strong {
  color: #ffaaaa;
}

@media (max-width: 680px) {
  .customer-dashboard-shipment-heading {
    display: grid;
  }

  .customer-dashboard-shipment-heading a {
    width: 100%;
    text-align: center;
  }
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
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }

  .customer-dashboard-overview,
  .customer-dashboard-order-details {
    grid-template-columns:
      minmax(0, 1fr);
  }

  .customer-dashboard-partner {
    position: static;
  }
}

@media (max-width: 680px) {
  .customer-dashboard-page {
    padding: 44px 12px;
  }

  .customer-dashboard-hero,
  .customer-dashboard-panel,
  .customer-dashboard-partner,
  .customer-dashboard-orders {
    padding: 20px;
    border-radius: 20px;
  }

  .customer-dashboard-stats,
  .customer-dashboard-info-grid,
  .customer-dashboard-latest-order {
    grid-template-columns:
      minmax(0, 1fr);
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
    grid-template-columns:
      minmax(0, 1fr);
  }
}
`;

export default CustomerDashboard;
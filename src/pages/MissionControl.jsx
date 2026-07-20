import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  products,
} from "../data/products";

const adminSessionKey =
  "304-document-admin-session";

function normalizeOrders(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  return [...records]
    .filter(
      (order) =>
        order &&
        typeof order === "object"
    )
    .sort((left, right) => {
      const leftDate =
        left.createdAt ||
        left.updatedAt ||
        left.date ||
        "";

      const rightDate =
        right.createdAt ||
        right.updatedAt ||
        right.date ||
        "";

      return String(rightDate).localeCompare(
        String(leftDate)
      );
    });
}

function getOrderId(order) {
  return String(
    order?.orderId ||
      order?.id ||
      "Unknown Order"
  );
}

function getCustomerName(order) {
  const customer =
    order?.customer || {};

  const firstName =
    order?.firstName ||
    customer.firstName ||
    "";

  const lastName =
    order?.lastName ||
    customer.lastName ||
    "";

  const fullName =
    `${firstName} ${lastName}`.trim();

  return (
    fullName ||
    order?.customerName ||
    customer.name ||
    order?.email ||
    customer.email ||
    "Customer"
  );
}

function getOrderStatus(order) {
  return String(
    order?.status ||
      order?.orderStatus ||
      order?.fulfillmentStatus ||
      "Order Received"
  );
}

function getOrderTotal(order) {
  const value =
    order?.total ??
    order?.grandTotal ??
    order?.orderTotal ??
    order?.subtotal ??
    0;

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function getOrderDate(order) {
  const value =
    order?.createdAt ||
    order?.updatedAt ||
    order?.date ||
    "";

  if (!value) {
    return "Date unavailable";
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return String(value);
  }

  return parsedDate.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    }
  ).format(Number(value || 0));
}

function isOrderClosed(order) {
  const status =
    getOrderStatus(order)
      .toLowerCase();

  return [
    "complete",
    "completed",
    "shipped",
    "delivered",
    "cancelled",
    "canceled",
    "refunded",
    "closed",
  ].some((word) =>
    status.includes(word)
  );
}

function hasInvoiceBeenSent(order) {
  const invoiceStatus =
    String(
      order?.invoiceStatus ||
        ""
    ).toLowerCase();

  return Boolean(
    order?.invoiceSent ||
      order?.invoiceSentAt ||
      order?.invoice?.sentAt ||
      invoiceStatus.includes("sent") ||
      invoiceStatus.includes("complete")
  );
}

function hasPaymentBeenReceived(order) {
  const paymentStatus =
    String(
      order?.paymentStatus ||
        ""
    ).toLowerCase();

  const status =
    getOrderStatus(order)
      .toLowerCase();

  return Boolean(
    order?.paymentReceived ||
      order?.paymentReceivedAt ||
      order?.paid ||
      order?.isPaid ||
      paymentStatus.includes("paid") ||
      paymentStatus.includes("received") ||
      status.includes("payment received") ||
      status.includes("paid")
  );
}

function hasOrderShipped(order) {
  const fulfillmentStatus =
    String(
      order?.fulfillmentStatus ||
        ""
    ).toLowerCase();

  const status =
    getOrderStatus(order)
      .toLowerCase();

  return Boolean(
    order?.shipped ||
      order?.shipmentSent ||
      order?.shippedAt ||
      order?.trackingNumber ||
      fulfillmentStatus.includes("shipped") ||
      fulfillmentStatus.includes("complete") ||
      status.includes("shipped") ||
      status.includes("delivered")
  );
}

function getOrderStage(order) {
  if (isOrderClosed(order)) {
    return {
      key: "complete",
      label: "Complete",
    };
  }

  if (!hasInvoiceBeenSent(order)) {
    return {
      key: "invoice",
      label: "Needs Invoice",
    };
  }

  if (!hasPaymentBeenReceived(order)) {
    return {
      key: "payment",
      label: "Awaiting Payment",
    };
  }

  if (!hasOrderShipped(order)) {
    return {
      key: "shipping",
      label: "Ready to Ship",
    };
  }

  return {
    key: "processing",
    label: "Processing",
  };
}

function getCatalogVariants() {
  return products.flatMap(
    (product) => {
      if (
        Array.isArray(
          product.variants
        ) &&
        product.variants.length > 0
      ) {
        return product.variants.map(
          (variant) => ({
            ...product,
            ...variant,
            parentProduct:
              product.name,
          })
        );
      }

      return [product];
    }
  );
}

function isValidUrl(value) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return false;
  }

  try {
    const parsedUrl =
      new URL(value);

    return [
      "https:",
      "http:",
    ].includes(
      parsedUrl.protocol
    );
  } catch {
    return false;
  }
}

function isDocumentPublished(record) {
  return Boolean(
    record?.published &&
      record?.reviewed &&
      record?.batchNumber &&
      record?.labName &&
      isValidUrl(record?.coaUrl)
  );
}

async function requestJson({
  endpoint,
  secret = "",
  signal,
}) {
  const headers = {
    Accept: "application/json",
  };

  if (secret) {
    headers.Authorization =
      `Bearer ${secret}`;
  }

  const response =
    await fetch(
      endpoint,
      {
        method: "GET",
        headers,
        credentials:
          "same-origin",
        cache: "no-store",
        signal,
      }
    );

  let result;

  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      "The server returned an invalid response."
    );
  }

  if (
    !response.ok ||
    result?.success === false
  ) {
    throw new Error(
      result?.error ||
        "The requested information could not be loaded."
    );
  }

  return result;
}

function MissionControl({
  orders = [],
  onNavigate = () => {},
}) {
  const [
    overviewOrders,
    setOverviewOrders,
  ] = useState(() =>
    normalizeOrders(orders)
  );

  const [
    documents,
    setDocuments,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    dataSource,
    setDataSource,
  ] = useState("Local Overview");

  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0);

  useEffect(() => {
    setOverviewOrders(
      normalizeOrders(orders)
    );
  }, [orders]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadOverview() {
      setLoading(true);
      setError("");

      const secret =
        window.sessionStorage.getItem(
          adminSessionKey
        ) || "";

      let nextOrders =
        normalizeOrders(orders);

      let nextDocuments = [];

      let loadedAdminData =
        false;

      if (secret) {
        try {
          const orderResult =
            await requestJson({
              endpoint:
                "/api/admin/orders",
              secret,
              signal:
                controller.signal,
            });

          const returnedOrders =
            orderResult.records ||
            orderResult.orders ||
            [];

          if (
            Array.isArray(
              returnedOrders
            )
          ) {
            nextOrders =
              normalizeOrders(
                returnedOrders
              );

            loadedAdminData =
              true;
          }
        } catch (orderError) {
          if (
            orderError.name ===
            "AbortError"
          ) {
            return;
          }

          console.error(
            "Mission Control order refresh failed:",
            orderError
          );
        }

        try {
          const documentResult =
            await requestJson({
              endpoint:
                "/api/admin/documents",
              secret,
              signal:
                controller.signal,
            });

          nextDocuments =
            Array.isArray(
              documentResult.records
            )
              ? documentResult.records
              : [];

          loadedAdminData =
            true;
        } catch (documentError) {
          if (
            documentError.name ===
            "AbortError"
          ) {
            return;
          }

          console.error(
            "Mission Control document refresh failed:",
            documentError
          );
        }
      }

      if (
        nextDocuments.length === 0
      ) {
        try {
          const publicResult =
            await requestJson({
              endpoint:
                "/api/documents",
              signal:
                controller.signal,
            });

          nextDocuments =
            Array.isArray(
              publicResult.records
            )
              ? publicResult.records
              : [];
        } catch (publicError) {
          if (
            publicError.name ===
            "AbortError"
          ) {
            return;
          }

          console.error(
            "Public documentation refresh failed:",
            publicError
          );
        }
      }

      if (
        controller.signal.aborted
      ) {
        return;
      }

      setOverviewOrders(
        nextOrders
      );

      setDocuments(
        nextDocuments
      );

      setDataSource(
        loadedAdminData
          ? "Live Admin Data"
          : "Local Overview"
      );

      if (
        !secret &&
        nextOrders.length === 0
      ) {
        setError(
          "No live administrator session was found. Open one of the secured management pages and sign in to load live order information."
        );
      }

      setLoading(false);
    }

    loadOverview().catch(
      (loadError) => {
        if (
          loadError.name ===
          "AbortError"
        ) {
          return;
        }

        setError(
          loadError.message ||
            "Mission Control could not load its overview."
        );

        setLoading(false);
      }
    );

    return () => {
      controller.abort();
    };
  }, [
    orders,
    refreshKey,
  ]);

  const catalogStats =
    useMemo(() => {
      const variants =
        getCatalogVariants();

      const trackedVariants =
        variants.filter(
          (variant) =>
            variant.trackQuantity ===
            true
        );

      const lowStockVariants =
        trackedVariants.filter(
          (variant) => {
            const quantity =
              Number(
                variant.quantity ||
                  0
              );

            return quantity <= 5;
          }
        );

      return {
        products:
          products.length,

        variants:
          variants.length,

        lowStock:
          lowStockVariants.length,
      };
    }, []);

  const documentationStats =
    useMemo(() => {
      const published =
        documents.filter(
          isDocumentPublished
        );

      const drafts =
        Math.max(
          0,
          documents.length -
            published.length
        );

      return {
        total:
          documents.length,

        published:
          published.length,

        drafts,
      };
    }, [documents]);

  const orderStats =
    useMemo(() => {
      const openOrders =
        overviewOrders.filter(
          (order) =>
            !isOrderClosed(order)
        );

      const needsInvoice =
        openOrders.filter(
          (order) =>
            !hasInvoiceBeenSent(
              order
            )
        );

      const awaitingPayment =
        openOrders.filter(
          (order) =>
            hasInvoiceBeenSent(
              order
            ) &&
            !hasPaymentBeenReceived(
              order
            )
        );

      const readyToShip =
        openOrders.filter(
          (order) =>
            hasPaymentBeenReceived(
              order
            ) &&
            !hasOrderShipped(
              order
            )
        );

      const paidRevenue =
        overviewOrders
          .filter(
            hasPaymentBeenReceived
          )
          .reduce(
            (
              total,
              order
            ) =>
              total +
              getOrderTotal(
                order
              ),
            0
          );

      return {
        total:
          overviewOrders.length,

        open:
          openOrders.length,

        needsInvoice:
          needsInvoice.length,

        awaitingPayment:
          awaitingPayment.length,

        readyToShip:
          readyToShip.length,

        paidRevenue,
      };
    }, [overviewOrders]);

  const recentOrders =
    useMemo(
      () =>
        overviewOrders.slice(
          0,
          5
        ),
      [overviewOrders]
    );

  const currentDate =
    new Date().toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
      }
    );

  const priorityCount =
    orderStats.needsInvoice +
    orderStats.awaitingPayment +
    orderStats.readyToShip;

  return (
    <>
      <style>
        {missionControlCss}
      </style>

      <div className="mc-page">
        <section className="mc-welcome">
          <div>
            <p className="mc-eyebrow">
              BUSINESS OVERVIEW
            </p>

            <h1>
              Mission Control
            </h1>

            <p className="mc-date">
              {currentDate}
            </p>

            <p className="mc-intro">
              See what needs attention,
              review recent activity, and
              jump directly into the
              correct management area.
            </p>
          </div>

          <div className="mc-welcome-actions">
            <span
              className={
                loading
                  ? "mc-data-pill loading"
                  : "mc-data-pill"
              }
            >
              <span />

              {loading
                ? "Refreshing"
                : dataSource}
            </span>

            <button
              type="button"
              className="mc-secondary-button"
              disabled={loading}
              onClick={() =>
                setRefreshKey(
                  (current) =>
                    current + 1
                )
              }
            >
              {loading
                ? "Refreshing..."
                : "Refresh Overview"}
            </button>

            <button
              type="button"
              className="mc-primary-button"
              onClick={() =>
                onNavigate("home")
              }
            >
              View Storefront
            </button>
          </div>
        </section>

        {error && (
          <section className="mc-notice">
            <div>
              <strong>
                Limited dashboard data
              </strong>

              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() =>
                onNavigate(
                  "customerManager"
                )
              }
            >
              Open Secured Admin
            </button>
          </section>
        )}

        <section className="mc-metrics">
          <MetricCard
            label="Orders Needing Attention"
            value={
              loading
                ? "—"
                : priorityCount
            }
            detail={`${orderStats.open} open orders`}
            tone={
              priorityCount > 0
                ? "warning"
                : "good"
            }
            onClick={() =>
              onNavigate(
                "orderManager"
              )
            }
          />

          <MetricCard
            label="Ready to Ship"
            value={
              loading
                ? "—"
                : orderStats.readyToShip
            }
            detail="Paid orders awaiting fulfillment"
            tone={
              orderStats.readyToShip >
              0
                ? "blue"
                : "neutral"
            }
            onClick={() =>
              onNavigate(
                "shippingCenter"
              )
            }
          />

          <MetricCard
            label="Catalog Products"
            value={
              catalogStats.products
            }
            detail={`${catalogStats.variants} strength variants`}
            tone="neutral"
            onClick={() =>
              onNavigate(
                "productManager"
              )
            }
          />

          <MetricCard
            label="Published COAs"
            value={
              loading
                ? "—"
                : documentationStats.published
            }
            detail={`${documentationStats.drafts} drafts or unpublished`}
            tone={
              documentationStats.drafts >
              0
                ? "warning"
                : "good"
            }
            onClick={() =>
              onNavigate(
                "coaManager"
              )
            }
          />
        </section>

        <div className="mc-main-grid">
          <section className="mc-priority-panel">
            <PanelHeading
              eyebrow="PRIORITY QUEUE"
              title="What Needs Attention"
              description="Work through these items in order."
            />

            <div className="mc-priority-list">
              <PriorityRow
                number={
                  orderStats.needsInvoice
                }
                title="Orders need invoices"
                description="New order requests waiting for an invoice."
                buttonLabel="Review Orders"
                tone="orange"
                onClick={() =>
                  onNavigate(
                    "orderManager"
                  )
                }
              />

              <PriorityRow
                number={
                  orderStats.awaitingPayment
                }
                title="Orders awaiting payment"
                description="Invoices sent but payment has not been recorded."
                buttonLabel="Review Payments"
                tone="purple"
                onClick={() =>
                  onNavigate(
                    "orderManager"
                  )
                }
              />

              <PriorityRow
                number={
                  orderStats.readyToShip
                }
                title="Orders ready to ship"
                description="Payment received and fulfillment can begin."
                buttonLabel="Open Shipping"
                tone="blue"
                onClick={() =>
                  onNavigate(
                    "shippingCenter"
                  )
                }
              />

              <PriorityRow
                number={
                  catalogStats.lowStock
                }
                title="Low-stock variants"
                description="Tracked products with five units or fewer."
                buttonLabel="Review Inventory"
                tone="green"
                onClick={() =>
                  onNavigate(
                    "inventoryManager"
                  )
                }
              />

              <PriorityRow
                number={
                  documentationStats.drafts
                }
                title="Documentation drafts"
                description="COA or verification records not fully published."
                buttonLabel="Review Documents"
                tone="gray"
                onClick={() =>
                  onNavigate(
                    "coaManager"
                  )
                }
              />
            </div>
          </section>

          <section className="mc-activity-panel">
            <PanelHeading
              eyebrow="RECENT ACTIVITY"
              title="Latest Orders"
              description="The five newest order records."
              actionLabel="View All"
              onAction={() =>
                onNavigate(
                  "orderManager"
                )
              }
            />

            {loading ? (
              <div className="mc-empty-state">
                Loading recent orders...
              </div>
            ) : recentOrders.length >
              0 ? (
              <div className="mc-order-list">
                {recentOrders.map(
                  (order) => {
                    const stage =
                      getOrderStage(
                        order
                      );

                    return (
                      <button
                        type="button"
                        className="mc-order-row"
                        key={getOrderId(
                          order
                        )}
                        onClick={() =>
                          onNavigate(
                            "orderManager"
                          )
                        }
                      >
                        <div className="mc-order-main">
                          <strong>
                            {getOrderId(
                              order
                            )}
                          </strong>

                          <span>
                            {getCustomerName(
                              order
                            )}
                          </span>
                        </div>

                        <div className="mc-order-meta">
                          <span>
                            {getOrderDate(
                              order
                            )}
                          </span>

                          <strong>
                            {formatCurrency(
                              getOrderTotal(
                                order
                              )
                            )}
                          </strong>
                        </div>

                        <span
                          className={`mc-stage mc-stage-${stage.key}`}
                        >
                          {stage.label}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="mc-empty-state">
                <strong>
                  No order records yet
                </strong>

                <span>
                  New orders will appear
                  here when they are
                  received.
                </span>
              </div>
            )}
          </section>
        </div>

        <section className="mc-workspaces">
          <PanelHeading
            eyebrow="QUICK ACCESS"
            title="Primary Workspaces"
            description="Use the hamburger menu for every admin page. These are the areas you will likely use most often."
          />

          <div className="mc-workspace-grid">
            <WorkspaceCard
              icon="01"
              title="Orders"
              description="Invoice requests, record payments, and manage fulfillment."
              detail={`${orderStats.open} currently open`}
              onClick={() =>
                onNavigate(
                  "orderManager"
                )
              }
            />

            <WorkspaceCard
              icon="02"
              title="Customer Accounts"
              description="Review customer accounts, access, and order history."
              detail={`${orderStats.total} order records loaded`}
              onClick={() =>
                onNavigate(
                  "customerManager"
                )
              }
            />

            <WorkspaceCard
              icon="03"
              title="Products"
              description="Manage catalog listings, strength options, pricing, and availability."
              detail={`${catalogStats.products} products`}
              onClick={() =>
                onNavigate(
                  "productManager"
                )
              }
            />

            <WorkspaceCard
              icon="04"
              title="Shipping Center"
              description="Configure shipping, purchase labels, and track fulfillment."
              detail={`${orderStats.readyToShip} ready to ship`}
              onClick={() =>
                onNavigate(
                  "shippingCenter"
                )
              }
            />
          </div>
        </section>

        <section className="mc-status-bar">
          <StatusItem
            label="Orders Loaded"
            value={
              loading
                ? "Checking"
                : orderStats.total
            }
          />

          <StatusItem
            label="Paid Order Value"
            value={
              loading
                ? "Checking"
                : formatCurrency(
                    orderStats.paidRevenue
                  )
            }
          />

          <StatusItem
            label="Catalog Variants"
            value={
              catalogStats.variants
            }
          />

          <StatusItem
            label="Documentation"
            value={
              loading
                ? "Checking"
                : `${documentationStats.published}/${documentationStats.total} published`
            }
          />
        </section>
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
  onClick,
}) {
  return (
    <button
      type="button"
      className={`mc-metric-card mc-tone-${tone}`}
      onClick={onClick}
    >
      <span className="mc-metric-label">
        {label}
      </span>

      <strong className="mc-metric-value">
        {value}
      </strong>

      <span className="mc-metric-detail">
        {detail}
      </span>

      <span className="mc-metric-link">
        Open workspace
        <span>→</span>
      </span>
    </button>
  );
}

function PanelHeading({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="mc-panel-heading">
      <div>
        <p className="mc-eyebrow">
          {eyebrow}
        </p>

        <h2>{title}</h2>

        {description && (
          <p className="mc-panel-description">
            {description}
          </p>
        )}
      </div>

      {actionLabel && (
        <button
          type="button"
          className="mc-text-button"
          onClick={onAction}
        >
          {actionLabel}
          <span>→</span>
        </button>
      )}
    </div>
  );
}

function PriorityRow({
  number,
  title,
  description,
  buttonLabel,
  tone,
  onClick,
}) {
  return (
    <div className="mc-priority-row">
      <span
        className={`mc-priority-number mc-priority-${tone}`}
      >
        {number}
      </span>

      <div className="mc-priority-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <button
        type="button"
        onClick={onClick}
      >
        {buttonLabel}
        <span>→</span>
      </button>
    </div>
  );
}

function WorkspaceCard({
  icon,
  title,
  description,
  detail,
  onClick,
}) {
  return (
    <button
      type="button"
      className="mc-workspace-card"
      onClick={onClick}
    >
      <span className="mc-workspace-number">
        {icon}
      </span>

      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <span className="mc-workspace-detail">
        {detail}
      </span>

      <span className="mc-workspace-open">
        Open
        <span>→</span>
      </span>
    </button>
  );
}

function StatusItem({
  label,
  value,
}) {
  return (
    <div className="mc-status-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const missionControlCss = `
.mc-page,
.mc-page *,
.mc-page *::before,
.mc-page *::after {
  box-sizing: border-box;
}

.mc-page {
  width: min(1380px, 100%);
  margin: 0 auto;
  color: #f7fafc;
}

.mc-welcome {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 24px;
  padding: 30px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 24px;
  background:
    radial-gradient(
      circle at top right,
      rgba(61, 165, 255, 0.17),
      transparent 36%
    ),
    linear-gradient(
      145deg,
      rgba(18, 35, 50, 0.98),
      rgba(10, 22, 32, 0.98)
    );
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.28);
}

.mc-eyebrow {
  margin: 0 0 8px;
  color: #3da5ff;
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.mc-welcome h1 {
  margin: 0;
  font-size: clamp(2.2rem, 5vw, 4rem);
  line-height: 1;
  letter-spacing: -0.04em;
}

.mc-date {
  margin: 12px 0 0;
  color: #e2e8ee;
  font-size: 0.94rem;
  font-weight: 800;
}

.mc-intro {
  max-width: 680px;
  margin: 15px 0 0;
  color: #aeb9c4;
  line-height: 1.7;
}

.mc-welcome-actions {
  min-width: 190px;
  display: grid;
  justify-items: stretch;
  gap: 9px;
}

.mc-data-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 34px;
  padding: 7px 11px;
  border: 1px solid rgba(52, 211, 153, 0.25);
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.08);
  color: #86efac;
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.mc-data-pill span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow:
    0 0 12px currentColor;
}

.mc-data-pill.loading {
  border-color: rgba(61, 165, 255, 0.25);
  background: rgba(61, 165, 255, 0.08);
  color: #79bdff;
}

.mc-primary-button,
.mc-secondary-button {
  width: 100%;
  min-height: 42px;
  margin: 0;
  padding: 10px 15px;
  border-radius: 11px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: none;
}

.mc-primary-button {
  border: 1px solid #3da5ff;
  background: #3da5ff;
  color: #05111c;
}

.mc-secondary-button {
  border: 1px solid rgba(255, 255, 255, 0.13);
  background: rgba(255, 255, 255, 0.045);
  color: #f4f7fa;
}

.mc-secondary-button:disabled {
  opacity: 0.55;
  cursor: wait;
}

.mc-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  padding: 17px 19px;
  border: 1px solid rgba(250, 204, 21, 0.24);
  border-radius: 16px;
  background: rgba(250, 204, 21, 0.07);
}

.mc-notice strong {
  display: block;
  color: #fde68a;
}

.mc-notice p {
  margin: 5px 0 0;
  color: #c7bfa1;
  font-size: 0.83rem;
  line-height: 1.5;
}

.mc-notice button {
  flex: 0 0 auto;
  margin: 0;
  padding: 9px 13px;
  border: 1px solid rgba(250, 204, 21, 0.25);
  border-radius: 10px;
  background: rgba(250, 204, 21, 0.09);
  color: #fde68a;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 900;
  cursor: pointer;
}

.mc-metrics {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.mc-metric-card {
  position: relative;
  min-height: 186px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 0;
  padding: 21px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.035);
  color: #f5f7fa;
  text-align: left;
  cursor: pointer;
  box-shadow: none;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.mc-metric-card::after {
  content: "";
  position: absolute;
  top: -50px;
  right: -50px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.06;
}

.mc-metric-card:hover {
  transform: translateY(-2px);
  border-color: rgba(61, 165, 255, 0.28);
  background: rgba(255, 255, 255, 0.055);
}

.mc-tone-warning {
  color: #fbbf24;
}

.mc-tone-good {
  color: #34d399;
}

.mc-tone-blue {
  color: #60a5fa;
}

.mc-tone-neutral {
  color: #cbd5e1;
}

.mc-metric-label {
  color: #9ba8b5;
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.mc-metric-value {
  display: block;
  margin-top: 16px;
  color: currentColor;
  font-size: 2.35rem;
  line-height: 1;
}

.mc-metric-detail {
  display: block;
  margin-top: 9px;
  color: #9ca8b3;
  font-size: 0.78rem;
  line-height: 1.45;
}

.mc-metric-link {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: auto;
  padding-top: 16px;
  color: #e9eef3;
  font-size: 0.72rem;
  font-weight: 900;
}

.mc-main-grid {
  display: grid;
  grid-template-columns:
    minmax(0, 0.95fr)
    minmax(0, 1.05fr);
  gap: 18px;
  margin-bottom: 20px;
}

.mc-priority-panel,
.mc-activity-panel,
.mc-workspaces {
  padding: 23px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.028);
}

.mc-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.mc-panel-heading h2 {
  margin: 0;
  font-size: 1.38rem;
  letter-spacing: -0.02em;
}

.mc-panel-description {
  margin: 7px 0 0;
  color: #8f9ba7;
  font-size: 0.8rem;
  line-height: 1.55;
}

.mc-text-button {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
  margin: 0;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  color: #68b4ff;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 900;
  cursor: pointer;
}

.mc-priority-list {
  display: grid;
  gap: 8px;
}

.mc-priority-row {
  display: grid;
  grid-template-columns:
    38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.065);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.025);
}

.mc-priority-number {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 950;
}

.mc-priority-orange {
  background: rgba(251, 146, 60, 0.12);
  color: #fb923c;
}

.mc-priority-purple {
  background: rgba(192, 132, 252, 0.12);
  color: #c084fc;
}

.mc-priority-blue {
  background: rgba(96, 165, 250, 0.12);
  color: #60a5fa;
}

.mc-priority-green {
  background: rgba(52, 211, 153, 0.12);
  color: #34d399;
}

.mc-priority-gray {
  background: rgba(203, 213, 225, 0.1);
  color: #cbd5e1;
}

.mc-priority-copy {
  min-width: 0;
}

.mc-priority-copy strong {
  display: block;
  color: #f5f7fa;
  font-size: 0.82rem;
}

.mc-priority-copy span {
  display: block;
  margin-top: 3px;
  color: #84909c;
  font-size: 0.7rem;
  line-height: 1.4;
}

.mc-priority-row button {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.035);
  color: #dce4eb;
  font: inherit;
  font-size: 0.68rem;
  font-weight: 900;
  cursor: pointer;
}

.mc-order-list {
  display: grid;
  gap: 8px;
}

.mc-order-row {
  width: 100%;
  display: grid;
  grid-template-columns:
    minmax(0, 1.2fr)
    minmax(120px, 0.7fr)
    auto;
  align-items: center;
  gap: 14px;
  margin: 0;
  padding: 13px;
  border: 1px solid rgba(255, 255, 255, 0.065);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.025);
  color: #f5f7fa;
  text-align: left;
  cursor: pointer;
  box-shadow: none;
}

.mc-order-row:hover {
  border-color: rgba(61, 165, 255, 0.24);
  background: rgba(61, 165, 255, 0.045);
}

.mc-order-main {
  min-width: 0;
}

.mc-order-main strong {
  display: block;
  overflow: hidden;
  color: #f4f7fa;
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mc-order-main span {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #8d99a5;
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mc-order-meta {
  text-align: right;
}

.mc-order-meta span {
  display: block;
  color: #7f8b97;
  font-size: 0.66rem;
}

.mc-order-meta strong {
  display: block;
  margin-top: 4px;
  color: #e9eef3;
  font-size: 0.77rem;
}

.mc-stage {
  padding: 6px 8px;
  border-radius: 999px;
  font-size: 0.61rem;
  font-weight: 900;
  white-space: nowrap;
}

.mc-stage-invoice {
  background: rgba(251, 146, 60, 0.11);
  color: #fb923c;
}

.mc-stage-payment {
  background: rgba(192, 132, 252, 0.11);
  color: #c084fc;
}

.mc-stage-shipping {
  background: rgba(96, 165, 250, 0.11);
  color: #60a5fa;
}

.mc-stage-processing {
  background: rgba(250, 204, 21, 0.11);
  color: #fde047;
}

.mc-stage-complete {
  background: rgba(52, 211, 153, 0.11);
  color: #34d399;
}

.mc-empty-state {
  min-height: 250px;
  display: grid;
  place-content: center;
  gap: 7px;
  padding: 30px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  color: #84909c;
  text-align: center;
}

.mc-empty-state strong {
  color: #d9e0e6;
}

.mc-empty-state span {
  max-width: 300px;
  font-size: 0.78rem;
  line-height: 1.5;
}

.mc-workspaces {
  margin-bottom: 20px;
}

.mc-workspace-grid {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.mc-workspace-card {
  min-height: 230px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 0;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 16px;
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.04),
      rgba(255, 255, 255, 0.018)
    );
  color: #f5f7fa;
  text-align: left;
  cursor: pointer;
  box-shadow: none;
}

.mc-workspace-card:hover {
  border-color: rgba(61, 165, 255, 0.25);
  background: rgba(61, 165, 255, 0.05);
}

.mc-workspace-number {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(61, 165, 255, 0.1);
  color: #65b5ff;
  font-size: 0.7rem;
  font-weight: 950;
}

.mc-workspace-card h3 {
  margin: 16px 0 0;
  font-size: 1rem;
}

.mc-workspace-card p {
  margin: 8px 0 0;
  color: #8996a2;
  font-size: 0.73rem;
  line-height: 1.55;
}

.mc-workspace-detail {
  display: block;
  margin-top: 13px;
  color: #b7c2cc;
  font-size: 0.68rem;
  font-weight: 800;
}

.mc-workspace-open {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: auto;
  padding-top: 17px;
  color: #66b5ff;
  font-size: 0.72rem;
  font-weight: 900;
}

.mc-status-bar {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.075);
}

.mc-status-item {
  min-height: 78px;
  display: grid;
  align-content: center;
  gap: 6px;
  padding: 15px;
  background: #0a151f;
}

.mc-status-item span {
  color: #75818d;
  font-size: 0.64rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.mc-status-item strong {
  color: #dce4eb;
  font-size: 0.82rem;
}

@media (max-width: 1100px) {
  .mc-metrics,
  .mc-workspace-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .mc-main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .mc-welcome {
    align-items: stretch;
    flex-direction: column;
    padding: 22px;
  }

  .mc-welcome-actions {
    width: 100%;
  }

  .mc-metrics,
  .mc-workspace-grid,
  .mc-status-bar {
    grid-template-columns: 1fr;
  }

  .mc-metric-card {
    min-height: 165px;
  }

  .mc-priority-panel,
  .mc-activity-panel,
  .mc-workspaces {
    padding: 17px;
  }

  .mc-priority-row {
    grid-template-columns:
      36px minmax(0, 1fr);
  }

  .mc-priority-row button {
    grid-column: 1 / -1;
    justify-content: center;
    width: 100%;
  }

  .mc-order-row {
    grid-template-columns:
      minmax(0, 1fr) auto;
  }

  .mc-order-meta {
    display: none;
  }

  .mc-stage {
    justify-self: end;
  }

  .mc-notice {
    align-items: stretch;
    flex-direction: column;
  }

  .mc-notice button {
    width: 100%;
  }
}

@media (max-width: 460px) {
  .mc-welcome h1 {
    font-size: 2.35rem;
  }

  .mc-order-row {
    grid-template-columns: 1fr;
  }

  .mc-stage {
    justify-self: start;
  }

  .mc-panel-heading {
    flex-direction: column;
  }

  .mc-text-button {
    padding-left: 0;
  }
}
`;

export default MissionControl;
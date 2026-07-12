import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { products } from "../data/products";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildCatalogVariants() {
  return products.flatMap((product) => {
    const variants = product.variants?.length
      ? product.variants
      : [product];

    return variants.map((variant) => ({
      ...product,
      ...variant,

      name:
        variant.name ||
        product.name ||
        "Research Product",

      codeName:
        variant.codeName ||
        product.codeName ||
        "",

      strength:
        variant.strength ||
        product.strength ||
        "",

      image:
        variant.image ||
        product.image ||
        "",
    }));
  });
}

const catalogVariants = buildCatalogVariants();

function findCatalogVariant(item) {
  const codeName = normalizeText(
    item?.codeName
  );

  const strength = normalizeText(
    item?.strength
  );

  const name = normalizeText(
    item?.name
  );

  return (
    catalogVariants.find(
      (variant) =>
        normalizeText(
          variant.codeName
        ) === codeName &&
        normalizeText(
          variant.strength
        ) === strength
    ) ||
    catalogVariants.find(
      (variant) =>
        normalizeText(
          variant.name
        ) === name &&
        normalizeText(
          variant.strength
        ) === strength
    ) ||
    catalogVariants.find(
      (variant) =>
        normalizeText(
          variant.codeName
        ) === codeName ||
        normalizeText(
          variant.name
        ) === name
    ) ||
    null
  );
}

function getOrderItems(order) {
  const items = Array.isArray(
    order?.items
  )
    ? order.items
    : [];

  return items.map((item) => {
    const catalogItem =
      findCatalogVariant(item);

    return {
      ...catalogItem,
      ...item,

      name:
        item.name ||
        catalogItem?.name ||
        "Research Product",

      codeName:
        item.codeName ||
        catalogItem?.codeName ||
        "",

      strength:
        item.strength ||
        catalogItem?.strength ||
        "",

      image:
        item.image ||
        catalogItem?.image ||
        "",

      quantity:
        Number(
          item.quantity ||
            0
        ),

      price:
        Number(
          item.price ||
            0
        ),
    };
  });
}

function getOrderId(order) {
  return String(
    order?.orderId ||
      order?.id ||
      "Pending"
  );
}

function getOrderDateValue(order) {
  return (
    order?.createdAt ||
    order?.updatedAt ||
    order?.date ||
    ""
  );
}

function getOrderQuantity(order) {
  const savedQuantity =
    Number(
      order?.totalQuantity
    );

  if (
    Number.isFinite(
      savedQuantity
    )
  ) {
    return savedQuantity;
  }

  return getOrderItems(
    order
  ).reduce(
    (total, item) =>
      total +
      Number(
        item.quantity ||
          0
      ),
    0
  );
}

function getOrderSubtotal(order) {
  const savedSubtotal =
    Number(
      order?.subtotal
    );

  if (
    Number.isFinite(
      savedSubtotal
    )
  ) {
    return savedSubtotal;
  }

  return getOrderItems(
    order
  ).reduce(
    (total, item) =>
      total +
      Number(
        item.price ||
          0
      ) *
        Number(
          item.quantity ||
            0
        ),
    0
  );
}

function getCustomer(order) {
  return (
    order?.customer ||
    {}
  );
}

function getCustomerName(order) {
  const customer =
    getCustomer(order);

  const fullName =
    `${customer.firstName || ""} ${
      customer.lastName || ""
    }`.trim();

  return (
    fullName ||
    "Customer details unavailable"
  );
}

function getCustomerAddress(order) {
  const customer =
    getCustomer(order);

  const cityState =
    [
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

function formatDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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

function formatMoney(value) {
  const amount =
    Number(value);

  return Number.isFinite(
    amount
  )
    ? amount.toLocaleString(
        "en-US",
        {
          style:
            "currency",

          currency:
            "USD",
        }
      )
    : "$0.00";
}

function normalizeOrders(orders) {
  if (
    !Array.isArray(
      orders
    )
  ) {
    return [];
  }

  return [...orders]
    .filter(
      (order) =>
        order &&
        typeof order ===
          "object"
    )
    .sort(
      (
        left,
        right
      ) => {
        const leftTime =
          new Date(
            getOrderDateValue(
              left
            )
          ).getTime();

        const rightTime =
          new Date(
            getOrderDateValue(
              right
            )
          ).getTime();

        return (
          (Number.isFinite(
            rightTime
          )
            ? rightTime
            : 0) -
          (Number.isFinite(
            leftTime
          )
            ? leftTime
            : 0)
        );
      }
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

  const savedOrders =
    useMemo(
      () =>
        normalizeOrders(
          orders
        ),
      [
        orders,
      ]
    );

  const hasOrders =
    savedOrders.length >
    0;

  const latestOrder =
    savedOrders[0] ||
    null;

  const latestCustomer =
    latestOrder
      ? getCustomer(
          latestOrder
        )
      : {};

  const accountName =
    `${account?.firstName || ""} ${
      account?.lastName || ""
    }`.trim();

  const customerName =
    accountName ||
    (latestOrder
      ? getCustomerName(
          latestOrder
        )
      : "Customer name unavailable");

  const customerEmail =
    account?.email ||
    latestCustomer.email ||
    "Account email unavailable";

  const customerAddress =
    latestOrder
      ? getCustomerAddress(
          latestOrder
        )
      : "No shipping address has been used yet";

  const accountStatus =
    account?.status ||
    "Active";

  const accountCreatedAt =
    account?.createdAt
      ? formatDate(
          account.createdAt
        )
      : "Account date unavailable";

  const statistics =
    useMemo(() => {
      const totalOrders =
        savedOrders.length;

      const totalItems =
        savedOrders.reduce(
          (
            total,
            order
          ) =>
            total +
            getOrderQuantity(
              order
            ),
          0
        );

      const requestedValue =
        savedOrders.reduce(
          (
            total,
            order
          ) =>
            total +
            getOrderSubtotal(
              order
            ),
          0
        );

      const activeOrders =
        savedOrders.filter(
          (order) =>
            ![
              "Completed",
              "Cancelled",
            ].includes(
              order.status
            )
        ).length;

      return {
        totalOrders,
        totalItems,
        requestedValue,
        activeOrders,
      };
    }, [
      savedOrders,
    ]);

  async function handleRefreshOrders(
    showSuccess = true
  ) {
    if (
      typeof onRefreshOrders !==
      "function"
    ) {
      setRefreshError(
        "Order refresh is not available."
      );

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

      if (showSuccess) {
        const orderCount =
          Array.isArray(
            refreshedOrders
          )
            ? refreshedOrders.length
            : 0;

        setRefreshMessage(
          orderCount === 1
            ? "Your secure order history is up to date."
            : `Your secure order history is up to date. ${orderCount} account orders loaded.`
        );
      }
    } catch (error) {
      setRefreshError(
        error?.message ||
          "Secure order history could not be refreshed."
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;

    if (
      typeof onRefreshOrders !==
      "function"
    ) {
      return () => {
        active = false;
      };
    }

    async function refreshOnOpen() {
      setIsRefreshing(true);
      setRefreshError("");

      try {
        await onRefreshOrders({
          replace: true,
        });
      } catch (error) {
        if (active) {
          setRefreshError(
            error?.message ||
              "Secure order history could not be loaded."
          );
        }
      } finally {
        if (active) {
          setIsRefreshing(false);
        }
      }
    }

    refreshOnOpen();

    return () => {
      active = false;
    };
  }, [
    onRefreshOrders,
  ]);

  const displayedError =
    refreshError ||
    authenticationError;

  return (
    <>
      <style>
        {customerDashboardCss}
      </style>

      <main className="customer-dashboard-page">
        <section className="customer-dashboard-inner">
          <header className="customer-dashboard-hero">
            <span className="customer-dashboard-pill">
              Secure Account
            </span>

            <p className="eyebrow">
              RESEARCH HUB
            </p>

            <h1>
              Order Dashboard
            </h1>

            <p>
              Review secure account-linked order history,
              current statuses, checkout details, product
              totals, research-use reminders, and Partner
              Program access.
            </p>

            <div className="customer-dashboard-hero-actions">
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
                    "cart"
                  )
                }
              >
                View Cart
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "researchAgreement"
                  )
                }
              >
                Research Agreement
              </button>
            </div>
          </header>

          <section className="customer-dashboard-security">
            <div>
              <strong>
                Secure account session confirmed for{" "}
                {customerEmail}.
              </strong>

              <p>
                Orders submitted while logged in are linked
                to this account and can be reviewed across
                approved devices.
              </p>
            </div>

            <div className="customer-dashboard-security-actions">
              <button
                type="button"
                className="primary-btn"
                disabled={
                  isRefreshing
                }
                onClick={() =>
                  handleRefreshOrders(
                    true
                  )
                }
              >
                {isRefreshing
                  ? "Refreshing..."
                  : "Refresh Orders"}
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
                onClick={() =>
                  onNavigate(
                    "contact"
                  )
                }
              >
                Contact Support
              </button>
            </div>
          </section>

          {displayedError && (
            <div
              className="customer-dashboard-alert customer-dashboard-error"
              role="alert"
            >
              {displayedError}
            </div>
          )}

          {refreshMessage && (
            <div
              className="customer-dashboard-alert customer-dashboard-success"
              aria-live="polite"
            >
              {refreshMessage}
            </div>
          )}

          <section className="customer-dashboard-stats">
            <StatCard
              label="Account Orders"
              value={
                statistics.totalOrders
              }
              detail="Secure Cloudflare history"
            />

            <StatCard
              label="Total Items"
              value={
                statistics.totalItems
              }
              detail="Units requested"
            />

            <StatCard
              label="Requested Value"
              value={formatMoney(
                statistics.requestedValue
              )}
              detail="Product subtotal only"
            />

            <StatCard
              label="Active Orders"
              value={
                statistics.activeOrders
              }
              detail="Not completed or cancelled"
            />
          </section>

          <div className="customer-dashboard-overview">
            <section className="customer-dashboard-panel">
              <p className="eyebrow">
                ACCOUNT PROFILE
              </p>

              <h2>
                Secure Customer Account
              </h2>

              <div className="customer-dashboard-info-grid">
                <InfoBox
                  label="Name"
                  value={
                    customerName
                  }
                />

                <InfoBox
                  label="Email"
                  value={
                    customerEmail
                  }
                />

                <InfoBox
                  label="Account Status"
                  value={
                    accountStatus
                  }
                />

                <InfoBox
                  label="Member Since"
                  value={
                    accountCreatedAt
                  }
                />

                <div className="customer-dashboard-address-box">
                  <span>
                    Latest Shipping Address
                  </span>

                  <strong>
                    {customerAddress}
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
                      getOrderDateValue(
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
                Research Partner Access
              </h2>

              {partnerApplication ? (
                <>
                  <InfoBox
                    label="Your Code"
                    value={
                      partnerApplication.code
                    }
                  />

                  <InfoBox
                    label="Status"
                    value={
                      partnerApplication.status
                    }
                  />

                  <InfoBox
                    label="Submitted"
                    value={
                      partnerApplication.date ||
                      "Date unavailable"
                    }
                  />

                  <button
                    type="button"
                    className="primary-btn customer-dashboard-full-button"
                    onClick={() =>
                      onNavigate(
                        "partnerHQ"
                      )
                    }
                  >
                    Open Partner HQ
                  </button>

                  <button
                    type="button"
                    className="secondary-btn customer-dashboard-full-button"
                    onClick={() =>
                      onNavigate(
                        "marketingCenter"
                      )
                    }
                  >
                    Marketing Center
                  </button>
                </>
              ) : hasOrders ? (
                <>
                  <p className="customer-dashboard-muted">
                    Your first order request is saved, so
                    the Partner Application is available.
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
                    Apply For Partner Code
                  </button>
                </>
              ) : (
                <>
                  <p className="customer-dashboard-muted">
                    Submit your first order request to
                    unlock the Partner Application.
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
                    Start First Order
                  </button>
                </>
              )}

              <div className="customer-dashboard-partner-note">
                Secure customer orders are stored with the
                account. Partner application data remains
                stored in this browser until the Partner
                Program backend is added.
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
                  Account Order History
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
                  No Account Orders Yet
                </h3>

                <p>
                  Orders submitted while logged in will
                  appear here with products, status,
                  customer details, and totals.
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
                      getOrderId(order);

                    const items =
                      getOrderItems(order);

                    const subtotal =
                      getOrderSubtotal(order);

                    const quantity =
                      getOrderQuantity(order);

                    const customer =
                      getCustomer(order);

                    const isExpanded =
                      expandedOrderId ===
                      orderId;

                    return (
                      <article
                        key={
                          orderId
                        }
                        className="customer-dashboard-order-card"
                      >
                        <div className="customer-dashboard-order-summary">
                          <div className="customer-dashboard-order-main">
                            <div className="customer-dashboard-order-heading">
                              <p>
                                Order #
                                {orderId}
                              </p>

                              <span className="customer-dashboard-status">
                                {order.status ||
                                  "Order Request Received"}
                              </span>
                            </div>

                            <h3>
                              {formatMoney(
                                subtotal
                              )}
                            </h3>

                            <p>
                              {formatDate(
                                getOrderDateValue(
                                  order
                                )
                              )}
                            </p>

                            <p>
                              {items.length} product
                              {items.length === 1
                                ? ""
                                : "s"}{" "}
                              · {quantity} total item
                              {quantity === 1
                                ? ""
                                : "s"}
                            </p>

                            <p>
                              Payment preference:{" "}
                              <strong>
                                {order.preferredPaymentLabel ||
                                  order.paymentMethod ||
                                  "Not selected"}
                              </strong>
                            </p>
                          </div>

                          <div className="customer-dashboard-order-preview">
                            {items
                              .slice(
                                0,
                                3
                              )
                              .map(
                                (
                                  item,
                                  index
                                ) => (
                                  <ProductPreview
                                    key={`${item.codeName}-${item.strength}-${index}`}
                                    item={
                                      item
                                    }
                                  />
                                )
                              )}

                            {items.length >
                              3 && (
                              <span>
                                +
                                {items.length -
                                  3}{" "}
                                more
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() =>
                              setExpandedOrderId(
                                isExpanded
                                  ? ""
                                  : orderId
                              )
                            }
                          >
                            {isExpanded
                              ? "Hide Details"
                              : "View Details"}
                          </button>
                        </div>

                        {isExpanded && (
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
                                    <ProductRow
                                      key={`${item.codeName}-${item.strength}-${index}`}
                                      item={
                                        item
                                      }
                                    />
                                  )
                                )}
                              </div>
                            </section>

                            <section>
                              <h4>
                                Checkout Information
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
                                label="Shipping Address"
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
                                label="Status"
                                value={
                                  order.status ||
                                  "Order Request Received"
                                }
                              />

                              <DetailRow
                                label="Product Subtotal"
                                value={formatMoney(
                                  subtotal
                                )}
                              />

                              <DetailRow
                                label="Total Items"
                                value={
                                  quantity
                                }
                              />

                              <DetailRow
                                label="Shipping & Taxes"
                                value="Confirmed By Invoice"
                              />
                            </section>
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
            For Research Use Only. Products are not intended
            for human consumption.
          </div>
        </section>
      </main>
    </>
  );
}

function ProductImage({
  item,
  compact = false,
}) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false);

  if (
    !item.image ||
    imageFailed
  ) {
    return (
      <div
        className={
          compact
            ? "customer-dashboard-image-fallback customer-dashboard-image-compact"
            : "customer-dashboard-image-fallback"
        }
      >
        304
      </div>
    );
  }

  return (
    <img
      src={
        item.image
      }
      alt={`${item.name} ${item.strength || ""}`}
      loading="lazy"
      onError={() =>
        setImageFailed(
          true
        )
      }
    />
  );
}

function ProductPreview({
  item,
}) {
  return (
    <div className="customer-dashboard-preview-item">
      <ProductImage
        item={
          item
        }
        compact
      />

      <div>
        <strong>
          {item.name}
        </strong>

        <span>
          {item.strength ||
            item.codeName}
        </span>
      </div>
    </div>
  );
}

function ProductRow({
  item,
}) {
  const quantity =
    Number(
      item.quantity ||
        0
    );

  const price =
    Number(
      item.price ||
        0
    );

  return (
    <div className="customer-dashboard-product-row">
      <div className="customer-dashboard-product-image">
        <ProductImage
          item={
            item
          }
        />
      </div>

      <div className="customer-dashboard-product-copy">
        <strong>
          {item.name}
        </strong>

        <span>
          {item.codeName}

          {item.codeName &&
          item.strength
            ? " · "
            : ""}

          {item.strength}
        </span>

        <span>
          Quantity: {quantity} ·{" "}
          {formatMoney(
            price
          )}{" "}
          each
        </span>
      </div>

      <strong className="customer-dashboard-line-total">
        {formatMoney(
          quantity *
            price
        )}
      </strong>
    </div>
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
        {value}
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
        {value}
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
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .customer-dashboard-inner {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .customer-dashboard-hero {
    position: relative;
    margin-bottom: 24px;
    padding: 64px 56px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 34px;
    background:
      radial-gradient(
        circle at top,
        rgba(61,165,255,0.22),
        transparent 42%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 90px rgba(0,0,0,0.5);
    text-align: center;
  }

  .customer-dashboard-pill {
    position: absolute;
    top: 22px;
    right: 24px;
    padding: 8px 12px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 999px;
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .customer-dashboard-hero h1 {
    margin-bottom: 20px;
    font-size: clamp(45px, 7vw, 62px);
    line-height: 1.05;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #9d9d9d
      );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .customer-dashboard-hero > p:not(.eyebrow) {
    max-width: 820px;
    margin: 0 auto;
    color: #c8c8c8;
    font-size: 18px;
    line-height: 1.8;
  }

  .customer-dashboard-hero-actions,
  .customer-dashboard-security-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .customer-dashboard-hero-actions {
    justify-content: center;
    margin-top: 28px;
  }

  .customer-dashboard-security {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 22px;
    margin-bottom: 18px;
    padding: 20px 22px;
    border: 1px solid rgba(61,165,255,0.3);
    border-radius: 20px;
    background: rgba(61,165,255,0.09);
    color: #c8eaff;
  }

  .customer-dashboard-security p {
    max-width: 720px;
    margin-top: 5px;
    color: #a9cfe5;
    line-height: 1.6;
  }

  .customer-dashboard-security-actions {
    flex: 0 0 auto;
  }

  .customer-dashboard-security-actions button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .customer-dashboard-alert {
    margin-bottom: 20px;
    padding: 15px 17px;
    border-radius: 15px;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.6;
  }

  .customer-dashboard-error {
    border: 1px solid rgba(255,95,95,0.4);
    background: rgba(255,70,70,0.1);
    color: #ffd0d0;
  }

  .customer-dashboard-success {
    border: 1px solid rgba(61,165,255,0.3);
    background: rgba(61,165,255,0.1);
    color: #bce7ff;
  }

  .customer-dashboard-stats {
    display: grid;
    grid-template-columns:
      repeat(
        4,
        minmax(0, 1fr)
      );
    gap: 18px;
    margin-bottom: 30px;
  }

  .customer-dashboard-stat-card {
    min-width: 0;
    display: grid;
    gap: 8px;
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 22px;
    background: rgba(255,255,255,0.035);
    box-shadow:
      0 22px 60px rgba(0,0,0,0.32);
  }

  .customer-dashboard-stat-card span,
  .customer-dashboard-info-box span,
  .customer-dashboard-address-box span,
  .customer-dashboard-latest-order span,
  .customer-dashboard-detail-row span {
    color: #9ed8ff;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .customer-dashboard-stat-card strong {
    color: #ffffff;
    font-size: 28px;
    overflow-wrap: anywhere;
  }

  .customer-dashboard-stat-card small {
    color: #8d98a2;
  }

  .customer-dashboard-overview {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(300px, 360px);
    gap: 30px;
    align-items: start;
    margin-bottom: 30px;
  }

  .customer-dashboard-panel,
  .customer-dashboard-partner,
  .customer-dashboard-orders {
    min-width: 0;
    padding: 38px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 30px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.14),
        transparent 35%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 80px rgba(0,0,0,0.45);
  }

  .customer-dashboard-partner {
    position: sticky;
    top: 110px;
    padding: 30px;
  }

  .customer-dashboard-panel h2,
  .customer-dashboard-partner h2,
  .customer-dashboard-orders h2 {
    margin-bottom: 24px;
    font-size:
      clamp(
        29px,
        4vw,
        38px
      );
    line-height: 1.12;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #9d9d9d
      );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .customer-dashboard-info-grid {
    display: grid;
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
    gap: 14px;
  }

  .customer-dashboard-info-box,
  .customer-dashboard-address-box {
    min-width: 0;
    display: grid;
    gap: 7px;
    padding: 16px;
    border: 1px solid rgba(61,165,255,0.22);
    border-radius: 16px;
    background: rgba(61,165,255,0.1);
    color: #c8eaff;
    overflow-wrap: anywhere;
  }

  .customer-dashboard-address-box {
    grid-column: 1 / -1;
  }

  .customer-dashboard-partner .customer-dashboard-info-box {
    margin-bottom: 12px;
  }

  .customer-dashboard-latest-order {
    display: grid;
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
    gap: 14px;
    margin-top: 20px;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(255,255,255,0.04);
  }

  .customer-dashboard-latest-order > div {
    display: grid;
    gap: 6px;
  }

  .customer-dashboard-latest-order strong {
    color: #ffffff;
    overflow-wrap: anywhere;
  }

  .customer-dashboard-latest-order small {
    grid-column: 1 / -1;
    color: #8f9ba6;
  }

  .customer-dashboard-muted {
    color: #c8c8c8;
    line-height: 1.7;
  }

  .customer-dashboard-full-button {
    width: 100%;
    margin-top: 14px;
  }

  .customer-dashboard-partner-note {
    margin-top: 20px;
    padding: 15px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 15px;
    background: rgba(255,255,255,0.035);
    color: #929da6;
    font-size: 13px;
    line-height: 1.6;
  }

  .customer-dashboard-section-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }

  .customer-dashboard-empty {
    padding: 34px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 22px;
    background: rgba(255,255,255,0.04);
    color: #c8c8c8;
    line-height: 1.8;
    text-align: center;
  }

  .customer-dashboard-empty h3 {
    margin-bottom: 8px;
    color: #ffffff;
    font-size: 24px;
  }

  .customer-dashboard-empty button {
    margin-top: 20px;
  }

  .customer-dashboard-order-stack {
    display: grid;
    gap: 18px;
  }

  .customer-dashboard-order-card {
    min-width: 0;
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 24px;
    background: rgba(255,255,255,0.04);
  }

  .customer-dashboard-order-summary {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(230px, 310px)
      auto;
    gap: 20px;
    align-items: center;
  }

  .customer-dashboard-order-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .customer-dashboard-order-heading p {
    color: #9ed8ff;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .customer-dashboard-status {
    padding: 6px 9px;
    border-radius: 999px;
    background: rgba(61,165,255,0.13);
    color: #b8e4ff;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .customer-dashboard-order-main h3 {
    margin-bottom: 7px;
    color: #ffffff;
    font-size: 28px;
  }

  .customer-dashboard-order-main > p {
    color: #aaaaaa;
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

  .customer-dashboard-order-main > p strong {
    color: #d6d6d6;
  }

  .customer-dashboard-order-preview {
    min-width: 0;
    display: grid;
    gap: 8px;
  }

  .customer-dashboard-preview-item {
    display: grid;
    grid-template-columns:
      46px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    padding: 7px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    background: rgba(0,0,0,0.15);
  }

  .customer-dashboard-preview-item img,
  .customer-dashboard-image-compact {
    width: 46px;
    height: 54px;
    object-fit: contain;
    border-radius: 9px;
  }

  .customer-dashboard-preview-item > div:last-child {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .customer-dashboard-preview-item strong {
    color: #ffffff;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .customer-dashboard-preview-item span,
  .customer-dashboard-order-preview > span {
    color: #929ba3;
    font-size: 11px;
  }

  .customer-dashboard-order-details {
    display: grid;
    grid-template-columns:
      1.4fr 1fr 1fr;
    gap: 16px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .customer-dashboard-order-details > section {
    min-width: 0;
    padding: 17px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 17px;
    background: rgba(0,0,0,0.16);
  }

  .customer-dashboard-order-details h4 {
    margin-bottom: 14px;
    color: #ffffff;
    font-size: 20px;
  }

  .customer-dashboard-product-stack {
    display: grid;
    gap: 12px;
  }

  .customer-dashboard-product-row {
    display: grid;
    grid-template-columns:
      72px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    padding: 11px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    background: rgba(255,255,255,0.035);
  }

  .customer-dashboard-product-image {
    width: 72px;
    height: 85px;
    display: grid;
    place-items: center;
  }

  .customer-dashboard-product-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .customer-dashboard-image-fallback {
    width: 65px;
    height: 75px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(61,165,255,0.27);
    border-radius: 9px;
    background: #10161c;
    color: #9ed8ff;
    font-size: 11px;
    font-weight: 900;
  }

  .customer-dashboard-product-copy {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .customer-dashboard-product-copy strong {
    color: #ffffff;
    overflow-wrap: anywhere;
  }

  .customer-dashboard-product-copy span {
    color: #929ba3;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .customer-dashboard-line-total {
    color: #9ed8ff;
    white-space: nowrap;
  }

  .customer-dashboard-detail-row {
    display: grid;
    gap: 5px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    overflow-wrap: anywhere;
  }

  .customer-dashboard-detail-row:last-child {
    border-bottom: 0;
  }

  .customer-dashboard-detail-row strong {
    color: #d4d4d4;
    font-size: 13px;
    line-height: 1.5;
  }

  .customer-dashboard-research-notice {
    margin-top: 30px;
    padding: 20px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 20px;
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
    font-weight: 900;
    line-height: 1.6;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  @media (max-width: 1050px) {
    .customer-dashboard-page {
      padding: 65px 24px;
    }

    .customer-dashboard-stats {
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }

    .customer-dashboard-overview {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .customer-dashboard-partner {
      position: static;
    }

    .customer-dashboard-order-summary {
      grid-template-columns:
        minmax(0, 1fr)
        minmax(220px, 300px);
    }

    .customer-dashboard-order-summary > button {
      grid-column: 1 / -1;
    }

    .customer-dashboard-order-details {
      grid-template-columns:
        minmax(0, 1fr);
    }
  }

  @media (max-width: 720px) {
    .customer-dashboard-page {
      padding: 44px 12px;
    }

    .customer-dashboard-hero,
    .customer-dashboard-panel,
    .customer-dashboard-partner,
    .customer-dashboard-orders {
      padding: 20px;
      border-radius: 22px;
    }

    .customer-dashboard-pill {
      position: static;
      display: inline-flex;
      margin-bottom: 20px;
    }

    .customer-dashboard-security {
      align-items: stretch;
      flex-direction: column;
    }

    .customer-dashboard-security-actions,
    .customer-dashboard-security-actions button,
    .customer-dashboard-hero-actions,
    .customer-dashboard-hero-actions button {
      width: 100%;
    }

    .customer-dashboard-info-grid,
    .customer-dashboard-order-summary {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .customer-dashboard-address-box,
    .customer-dashboard-order-summary > button {
      grid-column: auto;
    }

    .customer-dashboard-order-summary > button {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .customer-dashboard-page {
      padding: 34px 8px;
    }

    .customer-dashboard-hero,
    .customer-dashboard-panel,
    .customer-dashboard-partner,
    .customer-dashboard-orders,
    .customer-dashboard-order-card {
      padding: 15px;
    }

    .customer-dashboard-stats,
    .customer-dashboard-latest-order {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .customer-dashboard-latest-order small {
      grid-column: auto;
    }

    .customer-dashboard-product-row {
      grid-template-columns:
        65px minmax(0, 1fr);
    }

    .customer-dashboard-line-total {
      grid-column: 2;
    }
  }
`;

export default CustomerDashboard;
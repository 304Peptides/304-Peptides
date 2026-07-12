import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const adminSessionKey =
  "304-document-admin-session";

const orderStatuses = [
  "Order Request Received",
  "Invoice Sent",
  "Awaiting Payment",
  "Paid",
  "Processing",
  "Shipped",
  "Completed",
  "Cancelled",
];

function getStoredAdminSecret() {
  try {
    return (
      window.sessionStorage.getItem(
        adminSessionKey
      ) || ""
    );
  } catch {
    return "";
  }
}

function saveAdminSecret(
  secret
) {
  try {
    window.sessionStorage.setItem(
      adminSessionKey,
      secret
    );
  } catch {
    // The secret remains available
    // during the current render session.
  }
}

function clearAdminSecret() {
  try {
    window.sessionStorage.removeItem(
      adminSessionKey
    );
  } catch {
    // Storage may be blocked.
  }
}

function getOrderId(
  order
) {
  return String(
    order?.orderId ||
      order?.id ||
      ""
  );
}

function getOrderItems(
  order
) {
  return Array.isArray(
    order?.items
  )
    ? order.items
    : [];
}

function getOrderQuantity(
  order
) {
  if (
    Number.isFinite(
      Number(
        order?.totalQuantity
      )
    )
  ) {
    return Number(
      order.totalQuantity
    );
  }

  return getOrderItems(
    order
  ).reduce(
    (
      total,
      item
    ) =>
      total +
      Number(
        item.quantity ||
          0
      ),
    0
  );
}

function getOrderSubtotal(
  order
) {
  if (
    Number.isFinite(
      Number(
        order?.subtotal
      )
    )
  ) {
    return Number(
      order.subtotal
    );
  }

  return getOrderItems(
    order
  ).reduce(
    (
      total,
      item
    ) =>
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

function getCustomer(
  order
) {
  return (
    order?.customer ||
    {}
  );
}

function getCustomerName(
  order
) {
  const customer =
    getCustomer(
      order
    );

  const name =
    `${customer.firstName || ""} ${
      customer.lastName || ""
    }`.trim();

  return (
    name ||
    "Customer name unavailable"
  );
}

function getCustomerAddress(
  order
) {
  const customer =
    getCustomer(
      order
    );

  const cityState =
    [
      customer.city,
      customer.state,
    ]
      .filter(Boolean)
      .join(", ");

  const address =
    [
      customer.address,
      cityState,
      customer.zip,
    ]
      .filter(Boolean)
      .join(" ");

  return (
    address ||
    "Shipping address unavailable"
  );
}

function getOrderDateValue(
  order
) {
  return (
    order?.createdAt ||
    order?.updatedAt ||
    order?.date ||
    ""
  );
}

function formatDate(
  value
) {
  if (
    !value
  ) {
    return "Date unavailable";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(
      value
    );
  }

  return date.toLocaleString(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    }
  );
}

function formatMoney(
  value
) {
  const amount =
    Number(
      value
    );

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

function normalizeOrders(
  records
) {
  if (
    !Array.isArray(
      records
    )
  ) {
    return [];
  }

  return records
    .filter(
      (
        order
      ) =>
        order &&
        typeof order ===
          "object"
    )
    .sort(
      (
        left,
        right
      ) => {
        const leftDate =
          new Date(
            getOrderDateValue(
              left
            )
          ).getTime();

        const rightDate =
          new Date(
            getOrderDateValue(
              right
            )
          ).getTime();

        return (
          (Number.isFinite(
            rightDate
          )
            ? rightDate
            : 0) -
          (Number.isFinite(
            leftDate
          )
            ? leftDate
            : 0)
        );
      }
    );
}

async function readJsonResponse(
  response
) {
  const text =
    await response.text();

  let result;

  try {
    result =
      JSON.parse(
        text
      );
  } catch {
    throw new Error(
      "The order service returned an invalid response."
    );
  }

  if (
    !response.ok ||
    !result.success
  ) {
    throw new Error(
      result.error ||
        "The order request could not be completed."
    );
  }

  return result;
}

function CustomerManager({
  orders = [],
  partnerApplication,
  onNavigate = () => {},
}) {
  const [
    adminSecret,
    setAdminSecret,
  ] = useState(
    getStoredAdminSecret
  );

  const [
    secretInput,
    setSecretInput,
  ] = useState("");

  const [
    backendOrders,
    setBackendOrders,
  ] = useState([]);

  const [
    backendReady,
    setBackendReady,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    Boolean(
      adminSecret
    )
  );

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    expandedOrderId,
    setExpandedOrderId,
  ] = useState("");

  const [
    editingOrderId,
    setEditingOrderId,
  ] = useState("");

  const [
    draftStatus,
    setDraftStatus,
  ] = useState("");

  const [
    draftNotes,
    setDraftNotes,
  ] = useState("");

  const [
    updatingOrderId,
    setUpdatingOrderId,
  ] = useState("");

  const [
    actionError,
    setActionError,
  ] = useState("");

  const [
    actionMessage,
    setActionMessage,
  ] = useState("");

  const localOrders =
    useMemo(
      () =>
        normalizeOrders(
          orders
        ),
      [
        orders,
      ]
    );

  const loadBackendOrders =
    useCallback(
      async (
        secret =
          adminSecret
      ) => {
        const cleanedSecret =
          String(
            secret ||
              ""
          ).trim();

        if (
          !cleanedSecret
        ) {
          setBackendReady(
            false
          );

          setBackendOrders(
            []
          );

          setIsLoading(
            false
          );

          return;
        }

        setIsLoading(
          true
        );

        setLoadError(
          ""
        );

        setActionError(
          ""
        );

        try {
          const response =
            await fetch(
              "/api/admin/orders",
              {
                method:
                  "GET",

                headers: {
                  Accept:
                    "application/json",

                  Authorization:
                    `Bearer ${cleanedSecret}`,
                },

                cache:
                  "no-store",
              }
            );

          const result =
            await readJsonResponse(
              response
            );

          const records =
            normalizeOrders(
              result.records ||
                result.orders ||
                []
            );

          setBackendOrders(
            records
          );

          setBackendReady(
            true
          );

          setLoadError(
            ""
          );
        } catch (
          error
        ) {
          setBackendReady(
            false
          );

          setBackendOrders(
            []
          );

          setLoadError(
            error.message ||
              "Stored orders could not be loaded."
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        adminSecret,
      ]
    );

  useEffect(() => {
    if (
      adminSecret
    ) {
      loadBackendOrders(
        adminSecret
      );
    }
  }, [
    adminSecret,
    loadBackendOrders,
  ]);

  const displayedOrders =
    backendReady
      ? backendOrders
      : localOrders;

  const dataSourceLabel =
    backendReady
      ? "Cloudflare KV"
      : adminSecret
      ? "Local Browser Fallback"
      : "Admin Login Required";

  const filteredOrders =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return displayedOrders.filter(
        (
          order
        ) => {
          const customer =
            getCustomer(
              order
            );

          const items =
            getOrderItems(
              order
            );

          const searchText =
            [
              getOrderId(
                order
              ),

              order.status,

              order.date,

              order.createdAt,

              order.updatedAt,

              customer.firstName,

              customer.lastName,

              customer.email,

              customer.address,

              customer.city,

              customer.state,

              customer.zip,

              order.preferredPaymentLabel,

              order.paymentMethod,

              order.adminNotes,

              ...items.flatMap(
                (
                  item
                ) => [
                  item.name,
                  item.codeName,
                  item.strength,
                  item.composition,
                ]
              ),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const matchesSearch =
            !normalizedSearch ||
            searchText.includes(
              normalizedSearch
            );

          const matchesStatus =
            statusFilter ===
              "all" ||
            order.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      displayedOrders,
      searchTerm,
      statusFilter,
    ]);

  const stats =
    useMemo(() => {
      const totalOrders =
        displayedOrders.length;

      const totalItems =
        displayedOrders.reduce(
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
        displayedOrders.reduce(
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
        displayedOrders.filter(
          (
            order
          ) =>
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
      displayedOrders,
    ]);

  const latestOrder =
    displayedOrders[0] ||
    null;

  const latestCustomer =
    latestOrder
      ? getCustomer(
          latestOrder
        )
      : {};

  const latestCustomerName =
    latestOrder
      ? getCustomerName(
          latestOrder
        )
      : "No customer saved yet";

  const latestCustomerEmail =
    latestCustomer.email ||
    "No email saved yet";

  const latestCustomerAddress =
    latestOrder
      ? getCustomerAddress(
          latestOrder
        )
      : "No address saved yet";

  async function handleAdminLogin(
    event
  ) {
    event.preventDefault();

    const cleanedSecret =
      secretInput.trim();

    if (
      !cleanedSecret
    ) {
      setLoadError(
        "Enter the administrator secret."
      );

      return;
    }

    setLoadError(
      ""
    );

    saveAdminSecret(
      cleanedSecret
    );

    setAdminSecret(
      cleanedSecret
    );

    setSecretInput(
      ""
    );
  }

  function handleClearAdminSession() {
    clearAdminSecret();

    setAdminSecret(
      ""
    );

    setBackendOrders(
      []
    );

    setBackendReady(
      false
    );

    setLoadError(
      ""
    );

    setActionError(
      ""
    );

    setActionMessage(
      ""
    );

    setEditingOrderId(
      ""
    );

    setExpandedOrderId(
      ""
    );
  }

  function beginEditing(
    order
  ) {
    setActionError(
      ""
    );

    setActionMessage(
      ""
    );

    setEditingOrderId(
      getOrderId(
        order
      )
    );

    setDraftStatus(
      order.status ||
        "Order Request Received"
    );

    setDraftNotes(
      order.adminNotes ||
        ""
    );

    setExpandedOrderId(
      getOrderId(
        order
      )
    );
  }

  function cancelEditing() {
    setEditingOrderId(
      ""
    );

    setDraftStatus(
      ""
    );

    setDraftNotes(
      ""
    );
  }

  async function saveOrderUpdate(
    order
  ) {
    if (
      !backendReady ||
      !adminSecret
    ) {
      setActionError(
        "Connect to the protected Cloudflare order records before updating an order."
      );

      return;
    }

    const orderId =
      getOrderId(
        order
      );

    if (
      !orderId
    ) {
      setActionError(
        "This order does not have a valid order number."
      );

      return;
    }

    setUpdatingOrderId(
      orderId
    );

    setActionError(
      ""
    );

    setActionMessage(
      ""
    );

    try {
      const response =
        await fetch(
          `/api/admin/orders/${encodeURIComponent(
            orderId
          )}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              Authorization:
                `Bearer ${adminSecret}`,
            },

            body:
              JSON.stringify({
                status:
                  draftStatus,

                adminNotes:
                  draftNotes,
              }),
          }
        );

      const result =
        await readJsonResponse(
          response
        );

      const updatedOrder =
        result.order ||
        result.record;

      setBackendOrders(
        (
          currentOrders
        ) =>
          normalizeOrders(
            currentOrders.map(
              (
                currentOrder
              ) =>
                getOrderId(
                  currentOrder
                ) ===
                orderId
                  ? updatedOrder
                  : currentOrder
            )
          )
      );

      setEditingOrderId(
        ""
      );

      setDraftStatus(
        ""
      );

      setDraftNotes(
        ""
      );

      setActionMessage(
        `Order ${orderId} was updated.`
      );
    } catch (
      error
    ) {
      setActionError(
        error.message ||
          "The order could not be updated."
      );
    } finally {
      setUpdatingOrderId(
        ""
      );
    }
  }

  async function deleteOrder(
    order
  ) {
    if (
      !backendReady ||
      !adminSecret
    ) {
      setActionError(
        "Only Cloudflare-stored orders can be deleted."
      );

      return;
    }

    const orderId =
      getOrderId(
        order
      );

    const shouldDelete =
      window.confirm(
        `Delete order ${orderId}? This permanently removes the order record from Cloudflare KV.`
      );

    if (
      !shouldDelete
    ) {
      return;
    }

    setUpdatingOrderId(
      orderId
    );

    setActionError(
      ""
    );

    setActionMessage(
      ""
    );

    try {
      const response =
        await fetch(
          `/api/admin/orders/${encodeURIComponent(
            orderId
          )}`,
          {
            method:
              "DELETE",

            headers: {
              Accept:
                "application/json",

              Authorization:
                `Bearer ${adminSecret}`,
            },
          }
        );

      await readJsonResponse(
        response
      );

      setBackendOrders(
        (
          currentOrders
        ) =>
          currentOrders.filter(
            (
              currentOrder
            ) =>
              getOrderId(
                currentOrder
              ) !==
              orderId
          )
      );

      if (
        expandedOrderId ===
        orderId
      ) {
        setExpandedOrderId(
          ""
        );
      }

      if (
        editingOrderId ===
        orderId
      ) {
        cancelEditing();
      }

      setActionMessage(
        `Order ${orderId} was deleted.`
      );
    } catch (
      error
    ) {
      setActionError(
        error.message ||
          "The order could not be deleted."
      );
    } finally {
      setUpdatingOrderId(
        ""
      );
    }
  }

  if (
    !adminSecret
  ) {
    return (
      <>
        <style>
          {
            customerManagerCss
          }
        </style>

        <main className="customer-manager-page">
          <section className="customer-manager-auth">
            <p className="eyebrow">
              CUSTOMER MANAGER
            </p>

            <h1>
              Administrator
              Authorization
            </h1>

            <p>
              Cloudflare Access
              protects this page.
              Enter the same
              administrator
              secret used by COA
              Manager to load
              protected order
              records.
            </p>

            <form
              onSubmit={
                handleAdminLogin
              }
            >
              <label>
                <span>
                  Administrator
                  Secret
                </span>

                <input
                  type="password"
                  value={
                    secretInput
                  }
                  onChange={(
                    event
                  ) => {
                    setSecretInput(
                      event.target
                        .value
                    );

                    setLoadError(
                      ""
                    );
                  }}
                  autoComplete="current-password"
                  placeholder="Enter administrator secret"
                />
              </label>

              {loadError && (
                <div
                  className="customer-manager-error"
                  role="alert"
                >
                  {
                    loadError
                  }
                </div>
              )}

              <button
                type="submit"
                className="primary-btn"
              >
                Open Customer
                Manager
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
              Back To Mission
              Control
            </button>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <style>
        {
          customerManagerCss
        }
      </style>

      <main className="customer-manager-page">
        <section className="customer-manager-inner">
          <div className="customer-manager-topbar">
            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                onNavigate(
                  "missionControl"
                )
              }
            >
              ← Back To Mission
              Control
            </button>

            <div>
              <span
                className={
                  backendReady
                    ? "customer-source-pill customer-source-live"
                    : "customer-source-pill"
                }
              >
                {
                  dataSourceLabel
                }
              </span>

              <button
                type="button"
                className="customer-clear-session"
                onClick={
                  handleClearAdminSession
                }
              >
                Clear Admin Session
              </button>
            </div>
          </div>

          <header className="customer-manager-hero">
            <p className="eyebrow">
              CUSTOMER MANAGER
            </p>

            <h1>
              Customer & Order
              Records
            </h1>

            <p>
              Review protected
              order requests,
              customer shipping
              details, payment
              preferences,
              product totals,
              fulfillment
              status, and
              internal order
              notes.
            </p>

            <div className="customer-manager-hero-actions">
              <button
                type="button"
                className="primary-btn"
                disabled={
                  isLoading
                }
                onClick={() =>
                  loadBackendOrders(
                    adminSecret
                  )
                }
              >
                {isLoading
                  ? "Refreshing..."
                  : "Refresh Cloudflare Orders"}
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "products"
                  )
                }
              >
                View Storefront
              </button>
            </div>
          </header>

          {loadError && (
            <section className="customer-manager-warning">
              <div>
                <strong>
                  Cloudflare
                  orders could
                  not be loaded
                </strong>

                <p>
                  {loadError}
                </p>

                <small>
                  Local browser
                  orders are shown
                  temporarily
                  below.
                </small>
              </div>

              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  loadBackendOrders(
                    adminSecret
                  )
                }
              >
                Try Again
              </button>
            </section>
          )}

          {actionError && (
            <div
              className="customer-manager-error customer-manager-action-message"
              role="alert"
            >
              {
                actionError
              }
            </div>
          )}

          {actionMessage && (
            <div
              className="customer-manager-success-message"
              aria-live="polite"
            >
              {
                actionMessage
              }
            </div>
          )}

          <section className="customer-manager-stats">
            <StatCard
              label="Stored Orders"
              value={
                isLoading
                  ? "—"
                  : stats.totalOrders
              }
              detail={
                backendReady
                  ? "Cloudflare KV records"
                  : "Local browser records"
              }
            />

            <StatCard
              label="Total Items"
              value={
                isLoading
                  ? "—"
                  : stats.totalItems
              }
              detail="Units requested"
            />

            <StatCard
              label="Requested Value"
              value={
                isLoading
                  ? "—"
                  : formatMoney(
                      stats.requestedValue
                    )
              }
              detail="Product subtotal only"
            />

            <StatCard
              label="Active Orders"
              value={
                isLoading
                  ? "—"
                  : stats.activeOrders
              }
              detail="Not completed or cancelled"
            />
          </section>

          <div className="customer-manager-overview">
            <section className="customer-manager-panel">
              <p className="eyebrow">
                LATEST CUSTOMER
              </p>

              <h2>
                Most Recent
                Checkout
              </h2>

              <div className="customer-manager-info-grid">
                <InfoBox
                  label="Name"
                  value={
                    latestCustomerName
                  }
                />

                <InfoBox
                  label="Email"
                  value={
                    latestCustomerEmail
                  }
                />

                <div className="customer-manager-address-box">
                  <span>
                    Shipping Address
                  </span>

                  <strong>
                    {
                      latestCustomerAddress
                    }
                  </strong>
                </div>
              </div>

              {latestOrder && (
                <div className="customer-manager-latest-order">
                  <span>
                    Latest Order
                  </span>

                  <strong>
                    #
                    {getOrderId(
                      latestOrder
                    )}
                  </strong>

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

            <aside className="customer-manager-partner">
              <p className="eyebrow">
                PARTNER SNAPSHOT
              </p>

              <h2>
                Partner Record
              </h2>

              {partnerApplication ? (
                <>
                  <InfoBox
                    label="Partner Code"
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
                      partnerApplication.date
                    }
                  />

                  <button
                    type="button"
                    className="primary-btn customer-full-button"
                    onClick={() =>
                      onNavigate(
                        "partnerHQ"
                      )
                    }
                  >
                    Open Partner HQ
                  </button>
                </>
              ) : (
                <>
                  <p className="customer-manager-muted">
                    No partner
                    application is
                    saved in this
                    browser.
                  </p>

                  <button
                    type="button"
                    className="primary-btn customer-full-button"
                    onClick={() =>
                      onNavigate(
                        "partnerApplication"
                      )
                    }
                  >
                    Partner
                    Application
                  </button>
                </>
              )}

              <div className="customer-manager-partner-note">
                Partner
                applications are
                still stored only
                in the current
                browser. Order
                records are now
                stored in
                Cloudflare KV.
              </div>
            </aside>
          </div>

          <section className="customer-manager-orders-panel">
            <div className="customer-manager-section-heading">
              <div>
                <p className="eyebrow">
                  PROTECTED ORDER
                  SEARCH
                </p>

                <h2>
                  Order Records
                </h2>
              </div>

              <span>
                Showing{" "}
                <strong>
                  {
                    filteredOrders.length
                  }
                </strong>{" "}
                of{" "}
                <strong>
                  {
                    displayedOrders.length
                  }
                </strong>
              </span>
            </div>

            <div className="customer-manager-filters">
              <label>
                <span>
                  Search Orders
                </span>

                <input
                  type="search"
                  placeholder="Order number, name, email, product, address, or notes"
                  value={
                    searchTerm
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchTerm(
                      event.target
                        .value
                    )
                  }
                />
              </label>

              <label>
                <span>
                  Order Status
                </span>

                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusFilter(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="all">
                    All Statuses
                  </option>

                  {orderStatuses.map(
                    (
                      status
                    ) => (
                      <option
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {
                          status
                        }
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            {isLoading ? (
              <div className="customer-manager-empty">
                <h3>
                  Loading Orders
                </h3>

                <p>
                  Retrieving
                  protected order
                  records from
                  Cloudflare KV.
                </p>
              </div>
            ) : filteredOrders.length ===
              0 ? (
              <div className="customer-manager-empty">
                <h3>
                  No Matching
                  Orders
                </h3>

                <p>
                  Submit a new
                  order request or
                  change the search
                  and status
                  filters.
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
                  Go To Products
                </button>
              </div>
            ) : (
              <div className="customer-manager-order-stack">
                {filteredOrders.map(
                  (
                    order
                  ) => {
                    const orderId =
                      getOrderId(
                        order
                      );

                    const items =
                      getOrderItems(
                        order
                      );

                    const subtotal =
                      getOrderSubtotal(
                        order
                      );

                    const totalQuantity =
                      getOrderQuantity(
                        order
                      );

                    const customer =
                      getCustomer(
                        order
                      );

                    const isExpanded =
                      expandedOrderId ===
                      orderId;

                    const isEditing =
                      editingOrderId ===
                      orderId;

                    const isUpdating =
                      updatingOrderId ===
                      orderId;

                    return (
                      <article
                        key={
                          orderId
                        }
                        className="customer-manager-order-card"
                      >
                        <div className="customer-manager-order-summary">
                          <div className="customer-manager-order-identity">
                            <div className="customer-manager-order-heading">
                              <p>
                                Order #
                                {
                                  orderId
                                }
                              </p>

                              <span
                                className={`customer-manager-status ${String(
                                  order.status ||
                                    ""
                                )
                                  .toLowerCase()
                                  .replace(
                                    /[^a-z0-9]+/g,
                                    "-"
                                  )}`}
                              >
                                {order.status ||
                                  "Order Request Received"}
                              </span>
                            </div>

                            <h3>
                              {getCustomerName(
                                order
                              )}
                            </h3>

                            <p>
                              {customer.email ||
                                "Email unavailable"}
                            </p>

                            <p>
                              {getCustomerAddress(
                                order
                              )}
                            </p>

                            <small>
                              {formatDate(
                                getOrderDateValue(
                                  order
                                )
                              )}
                            </small>
                          </div>

                          <div className="customer-manager-order-items-preview">
                            <span>
                              Items Ordered
                            </span>

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
                                  <p
                                    key={`${item.codeName}-${item.strength}-${index}`}
                                  >
                                    {item.name ||
                                      item.codeName}{" "}
                                    {item.strength
                                      ? `· ${item.strength}`
                                      : ""}{" "}
                                    ×{" "}
                                    {
                                      item.quantity
                                    }
                                  </p>
                                )
                              )}

                            {items.length >
                              3 && (
                              <small>
                                +
                                {items.length -
                                  3}{" "}
                                additional
                                product
                                {items.length -
                                  3 ===
                                1
                                  ? ""
                                  : "s"}
                              </small>
                            )}
                          </div>

                          <div className="customer-manager-order-totals">
                            <span>
                              Product
                              Subtotal
                            </span>

                            <strong>
                              {formatMoney(
                                subtotal
                              )}
                            </strong>

                            <span>
                              Total Items
                            </span>

                            <strong>
                              {
                                totalQuantity
                              }
                            </strong>

                            <span>
                              Payment
                            </span>

                            <strong>
                              {order.preferredPaymentLabel ||
                                order.paymentMethod ||
                                "Not selected"}
                            </strong>
                          </div>
                        </div>

                        <div className="customer-manager-order-actions">
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

                          <button
                            type="button"
                            className="secondary-btn"
                            disabled={
                              !backendReady ||
                              isUpdating
                            }
                            onClick={() =>
                              beginEditing(
                                order
                              )
                            }
                          >
                            Update Order
                          </button>

                          <button
                            type="button"
                            className="customer-delete-button"
                            disabled={
                              !backendReady ||
                              isUpdating
                            }
                            onClick={() =>
                              deleteOrder(
                                order
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="customer-manager-order-details">
                            <section>
                              <h4>
                                Customer
                                Information
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
                                Products
                              </h4>

                              <div className="customer-manager-product-list">
                                {items.map(
                                  (
                                    item,
                                    index
                                  ) => (
                                    <div
                                      key={`${item.codeName}-${item.strength}-${index}`}
                                    >
                                      <div>
                                        <strong>
                                          {item.name ||
                                            "Research Product"}
                                        </strong>

                                        <span>
                                          {item.codeName ||
                                            "No code"}

                                          {item.strength
                                            ? ` · ${item.strength}`
                                            : ""}
                                        </span>
                                      </div>

                                      <div>
                                        <span>
                                          {
                                            item.quantity
                                          }{" "}
                                          ×{" "}
                                          {formatMoney(
                                            item.price
                                          )}
                                        </span>

                                        <strong>
                                          {formatMoney(
                                            Number(
                                              item.price ||
                                                0
                                            ) *
                                              Number(
                                                item.quantity ||
                                                  0
                                              )
                                          )}
                                        </strong>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </section>

                            <section>
                              <h4>
                                Internal
                                Record
                              </h4>

                              <DetailRow
                                label="Status"
                                value={
                                  order.status ||
                                  "Order Request Received"
                                }
                              />

                              <DetailRow
                                label="Payment Preference"
                                value={
                                  order.preferredPaymentLabel ||
                                  order.paymentMethod ||
                                  "Not selected"
                                }
                              />

                              <DetailRow
                                label="Created"
                                value={formatDate(
                                  order.createdAt ||
                                    order.date
                                )}
                              />

                              <DetailRow
                                label="Updated"
                                value={formatDate(
                                  order.updatedAt
                                )}
                              />

                              <DetailRow
                                label="Admin Notes"
                                value={
                                  order.adminNotes ||
                                  "No internal notes"
                                }
                              />
                            </section>
                          </div>
                        )}

                        {isEditing && (
                          <div className="customer-manager-editor">
                            <div>
                              <p className="eyebrow">
                                UPDATE ORDER
                              </p>

                              <h4>
                                Order #
                                {
                                  orderId
                                }
                              </h4>
                            </div>

                            <label>
                              <span>
                                Status
                              </span>

                              <select
                                value={
                                  draftStatus
                                }
                                disabled={
                                  isUpdating
                                }
                                onChange={(
                                  event
                                ) =>
                                  setDraftStatus(
                                    event.target
                                      .value
                                  )
                                }
                              >
                                {orderStatuses.map(
                                  (
                                    status
                                  ) => (
                                    <option
                                      key={
                                        status
                                      }
                                      value={
                                        status
                                      }
                                    >
                                      {
                                        status
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </label>

                            <label>
                              <span>
                                Internal
                                Notes
                              </span>

                              <textarea
                                rows="5"
                                maxLength="2000"
                                value={
                                  draftNotes
                                }
                                disabled={
                                  isUpdating
                                }
                                placeholder="Add private order notes..."
                                onChange={(
                                  event
                                ) =>
                                  setDraftNotes(
                                    event.target
                                      .value
                                  )
                                }
                              />
                            </label>

                            <div className="customer-manager-editor-actions">
                              <button
                                type="button"
                                className="primary-btn"
                                disabled={
                                  isUpdating
                                }
                                onClick={() =>
                                  saveOrderUpdate(
                                    order
                                  )
                                }
                              >
                                {isUpdating
                                  ? "Saving..."
                                  : "Save Update"}
                              </button>

                              <button
                                type="button"
                                className="secondary-btn"
                                disabled={
                                  isUpdating
                                }
                                onClick={
                                  cancelEditing
                                }
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <section className="customer-manager-security-note">
            <p className="eyebrow">
              ORDER SECURITY
            </p>

            <h2>
              Protected Admin
              Records
            </h2>

            <p>
              Cloudflare Access
              protects the admin
              routes, and the
              Worker still
              requires the
              administrator
              bearer secret.
              Customer order
              history should not
              be exposed publicly
              by email address
              alone.
            </p>
          </section>
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
    <div className="customer-manager-stat-card">
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
    <div className="customer-manager-info-box">
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
    <div className="customer-manager-detail-row">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

const customerManagerCss = `
  .customer-manager-page,
  .customer-manager-page *,
  .customer-manager-page *::before,
  .customer-manager-page *::after {
    box-sizing: border-box;
  }

  .customer-manager-page {
    width: 100%;
    max-width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .customer-manager-inner {
    width: 100%;
    max-width: 1250px;
    margin: 0 auto;
  }

  .customer-manager-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 30px;
  }

  .customer-manager-topbar > div {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .customer-source-pill {
    display: inline-flex;
    padding: 9px 13px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px;
    background: rgba(255,255,255,0.06);
    color: #c7c7c7;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .customer-source-live {
    border-color: rgba(61,165,255,0.35);
    background: rgba(61,165,255,0.14);
    color: #9ed8ff;
  }

  .customer-clear-session {
    border: 0;
    background: transparent;
    color: #929ca5;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .customer-manager-hero,
  .customer-manager-auth {
    padding: 60px 56px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 34px;
    background:
      radial-gradient(
        circle at top,
        rgba(61,165,255,0.22),
        transparent 42%
      ),
      rgba(255,255,255,0.035);
    box-shadow: 0 30px 90px rgba(0,0,0,0.5);
    text-align: center;
  }

  .customer-manager-hero {
    margin-bottom: 30px;
  }

  .customer-manager-hero h1,
  .customer-manager-auth h1 {
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

  .customer-manager-hero > p:not(.eyebrow),
  .customer-manager-auth > p:not(.eyebrow) {
    max-width: 820px;
    margin: 0 auto;
    color: #c8c8c8;
    font-size: 18px;
    line-height: 1.8;
  }

  .customer-manager-hero-actions {
    display: flex;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 28px;
  }

  .customer-manager-auth {
    max-width: 720px;
    margin: 0 auto;
  }

  .customer-manager-auth form {
    max-width: 480px;
    display: grid;
    gap: 16px;
    margin: 28px auto 16px;
  }

  .customer-manager-auth label,
  .customer-manager-filters label,
  .customer-manager-editor label {
    display: grid;
    gap: 8px;
    text-align: left;
  }

  .customer-manager-auth label > span,
  .customer-manager-filters label > span,
  .customer-manager-editor label > span {
    color: #c8c8c8;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .customer-manager-auth input,
  .customer-manager-filters input,
  .customer-manager-filters select,
  .customer-manager-editor select,
  .customer-manager-editor textarea {
    width: 100%;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    outline: none;
    background: rgba(255,255,255,0.055);
    color: #ffffff;
    font: inherit;
  }

  .customer-manager-auth input:focus,
  .customer-manager-filters input:focus,
  .customer-manager-filters select:focus,
  .customer-manager-editor select:focus,
  .customer-manager-editor textarea:focus {
    border-color: rgba(61,165,255,0.62);
    box-shadow: 0 0 0 3px rgba(61,165,255,0.12);
  }

  .customer-manager-filters select option,
  .customer-manager-editor select option {
    background: #111820;
    color: #ffffff;
  }

  .customer-manager-warning {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 22px;
    flex-wrap: wrap;
    margin-bottom: 24px;
    padding: 22px;
    border: 1px solid rgba(255,190,80,0.35);
    border-radius: 20px;
    background: rgba(255,170,50,0.09);
    color: #ffe0a8;
  }

  .customer-manager-warning p {
    margin-top: 6px;
    line-height: 1.6;
  }

  .customer-manager-warning small {
    display: block;
    margin-top: 6px;
    color: #c7b78f;
  }

  .customer-manager-error,
  .customer-manager-success-message {
    padding: 15px;
    border-radius: 14px;
    font-size: 14px;
    line-height: 1.6;
  }

  .customer-manager-error {
    border: 1px solid rgba(255,95,95,0.42);
    background: rgba(255,70,70,0.11);
    color: #ffd1d1;
  }

  .customer-manager-success-message {
    border: 1px solid rgba(61,165,255,0.34);
    background: rgba(61,165,255,0.12);
    color: #bde7ff;
  }

  .customer-manager-action-message {
    margin-bottom: 20px;
  }

  .customer-manager-stats {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 30px;
  }

  .customer-manager-stat-card {
    min-width: 0;
    display: grid;
    gap: 8px;
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 22px;
    background: rgba(255,255,255,0.035);
    box-shadow: 0 22px 60px rgba(0,0,0,0.32);
  }

  .customer-manager-stat-card span,
  .customer-manager-info-box span,
  .customer-manager-address-box span,
  .customer-manager-latest-order span,
  .customer-manager-order-items-preview > span,
  .customer-manager-order-totals > span,
  .customer-manager-detail-row span {
    color: #9ed8ff;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .customer-manager-stat-card strong {
    color: #ffffff;
    font-size: 29px;
    overflow-wrap: anywhere;
  }

  .customer-manager-stat-card small {
    color: #89949e;
    line-height: 1.5;
  }

  .customer-manager-overview {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) minmax(300px, 360px);
    gap: 30px;
    align-items: start;
    margin-bottom: 30px;
  }

  .customer-manager-panel,
  .customer-manager-partner,
  .customer-manager-orders-panel {
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
    box-shadow: 0 30px 80px rgba(0,0,0,0.45);
  }

  .customer-manager-partner {
    position: sticky;
    top: 110px;
    padding: 30px;
  }

  .customer-manager-panel h2,
  .customer-manager-partner h2,
  .customer-manager-orders-panel h2,
  .customer-manager-security-note h2 {
    margin-bottom: 24px;
    font-size: clamp(29px, 4vw, 38px);
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

  .customer-manager-info-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .customer-manager-info-box,
  .customer-manager-address-box {
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

  .customer-manager-address-box {
    grid-column: 1 / -1;
  }

  .customer-manager-latest-order,
  .customer-manager-partner-note {
    display: grid;
    gap: 7px;
    margin-top: 20px;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(255,255,255,0.04);
    color: #c8c8c8;
  }

  .customer-manager-latest-order strong {
    color: #ffffff;
    font-size: 20px;
  }

  .customer-manager-latest-order small {
    color: #8f9ba6;
  }

  .customer-manager-muted {
    color: #c8c8c8;
    line-height: 1.7;
  }

  .customer-manager-partner-note {
    color: #9ca8b3;
    font-size: 13px;
    line-height: 1.6;
  }

  .customer-full-button {
    width: 100%;
    margin-top: 18px;
  }

  .customer-manager-orders-panel {
    margin-bottom: 30px;
  }

  .customer-manager-section-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }

  .customer-manager-section-heading > span {
    color: #a9b3bc;
  }

  .customer-manager-filters {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) minmax(200px, 280px);
    gap: 16px;
    margin-bottom: 24px;
  }

  .customer-manager-empty {
    padding: 34px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 22px;
    background: rgba(255,255,255,0.04);
    color: #c8c8c8;
    line-height: 1.8;
    text-align: center;
  }

  .customer-manager-empty h3 {
    margin-bottom: 8px;
    color: #ffffff;
    font-size: 24px;
  }

  .customer-manager-empty button {
    margin-top: 20px;
  }

  .customer-manager-order-stack {
    display: grid;
    gap: 18px;
  }

  .customer-manager-order-card {
    min-width: 0;
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 24px;
    background: rgba(255,255,255,0.04);
  }

  .customer-manager-order-summary {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) minmax(210px, 280px) minmax(160px, 190px);
    gap: 20px;
    align-items: center;
  }

  .customer-manager-order-identity {
    min-width: 0;
  }

  .customer-manager-order-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .customer-manager-order-heading > p {
    color: #9ed8ff;
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .customer-manager-order-identity h3 {
    margin-bottom: 8px;
    color: #ffffff;
    font-size: 25px;
    overflow-wrap: anywhere;
  }

  .customer-manager-order-identity > p {
    color: #aaaaaa;
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

  .customer-manager-order-identity > small {
    display: block;
    margin-top: 7px;
    color: #798691;
  }

  .customer-manager-status {
    display: inline-flex;
    width: fit-content;
    padding: 6px 9px;
    border-radius: 999px;
    background: rgba(255,255,255,0.07);
    color: #c7c7c7;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .customer-manager-status.paid,
  .customer-manager-status.completed,
  .customer-manager-status.shipped {
    background: rgba(61,165,255,0.16);
    color: #9ed8ff;
  }

  .customer-manager-status.cancelled {
    background: rgba(255,75,75,0.12);
    color: #ffc4c4;
  }

  .customer-manager-order-items-preview,
  .customer-manager-order-totals {
    min-width: 0;
    display: grid;
    gap: 8px;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(0,0,0,0.17);
  }

  .customer-manager-order-items-preview p,
  .customer-manager-order-items-preview small {
    color: #aaaaaa;
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .customer-manager-order-totals {
    background: rgba(61,165,255,0.1);
    text-align: center;
  }

  .customer-manager-order-totals strong {
    color: #ffffff;
    overflow-wrap: anywhere;
  }

  .customer-manager-order-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 18px;
  }

  .customer-delete-button {
    padding: 12px 17px;
    border: 1px solid rgba(255,95,95,0.32);
    border-radius: 999px;
    background: rgba(255,60,60,0.08);
    color: #ffc4c4;
    font: inherit;
    font-weight: 900;
    cursor: pointer;
  }

  .customer-delete-button:disabled,
  .customer-manager-order-actions button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .customer-manager-order-details {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .customer-manager-order-details > section {
    min-width: 0;
    padding: 17px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 17px;
    background: rgba(0,0,0,0.16);
  }

  .customer-manager-order-details h4,
  .customer-manager-editor h4 {
    margin-bottom: 14px;
    color: #ffffff;
    font-size: 20px;
  }

  .customer-manager-detail-row {
    display: grid;
    gap: 5px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    overflow-wrap: anywhere;
  }

  .customer-manager-detail-row:last-child {
    border-bottom: 0;
  }

  .customer-manager-detail-row strong {
    color: #d4d4d4;
    font-size: 13px;
    line-height: 1.5;
  }

  .customer-manager-product-list {
    display: grid;
    gap: 10px;
  }

  .customer-manager-product-list > div {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 12px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 13px;
    background: rgba(255,255,255,0.035);
  }

  .customer-manager-product-list > div > div {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .customer-manager-product-list strong {
    color: #ffffff;
    overflow-wrap: anywhere;
  }

  .customer-manager-product-list span {
    color: #989fa6;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .customer-manager-editor {
    display: grid;
    gap: 18px;
    margin-top: 20px;
    padding: 20px;
    border: 1px solid rgba(61,165,255,0.26);
    border-radius: 20px;
    background: rgba(61,165,255,0.07);
  }

  .customer-manager-editor textarea {
    resize: vertical;
    min-height: 120px;
  }

  .customer-manager-editor-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .customer-manager-security-note {
    padding: 40px;
    border: 1px solid rgba(61,165,255,0.27);
    border-radius: 28px;
    background: rgba(61,165,255,0.1);
    text-align: center;
  }

  .customer-manager-security-note p:not(.eyebrow) {
    max-width: 850px;
    margin: 0 auto;
    color: #c8eaff;
    line-height: 1.8;
  }

  @media (max-width: 1050px) {
    .customer-manager-page {
      padding: 65px 24px;
    }

    .customer-manager-stats {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .customer-manager-overview {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .customer-manager-partner {
      position: static;
    }

    .customer-manager-order-summary {
      grid-template-columns:
        minmax(0, 1fr) minmax(220px, 280px);
    }

    .customer-manager-order-totals {
      grid-column: 1 / -1;
      grid-template-columns:
        repeat(6, minmax(0, 1fr));
      align-items: center;
    }

    .customer-manager-order-details {
      grid-template-columns:
        minmax(0, 1fr);
    }
  }

  @media (max-width: 720px) {
    .customer-manager-page {
      padding: 44px 12px;
    }

    .customer-manager-hero,
    .customer-manager-auth,
    .customer-manager-panel,
    .customer-manager-partner,
    .customer-manager-orders-panel,
    .customer-manager-security-note {
      padding: 20px;
      border-radius: 22px;
    }

    .customer-manager-topbar,
    .customer-manager-topbar > div,
    .customer-manager-topbar button,
    .customer-manager-hero-actions,
    .customer-manager-hero-actions button {
      width: 100%;
    }

    .customer-manager-info-grid,
    .customer-manager-filters,
    .customer-manager-order-summary {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .customer-manager-address-box {
      grid-column: auto;
    }

    .customer-manager-order-totals {
      grid-column: auto;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      text-align: left;
    }

    .customer-manager-order-actions,
    .customer-manager-order-actions button {
      width: 100%;
    }

    .customer-manager-product-list > div {
      flex-direction: column;
    }
  }

  @media (max-width: 480px) {
    .customer-manager-page {
      padding: 34px 8px;
    }

    .customer-manager-hero,
    .customer-manager-auth,
    .customer-manager-panel,
    .customer-manager-partner,
    .customer-manager-orders-panel,
    .customer-manager-security-note,
    .customer-manager-order-card {
      padding: 15px;
    }

    .customer-manager-stats {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .customer-manager-order-totals {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .customer-manager-editor-actions,
    .customer-manager-editor-actions button {
      width: 100%;
    }
  }
`;

export default CustomerManager;
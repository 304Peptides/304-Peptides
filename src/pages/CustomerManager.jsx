import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const ADMIN_SESSION_KEY =
  "304-document-admin-session";

const ORDER_STATUSES = [
  "Order Request Received",
  "Invoice Sent",
  "Awaiting Payment",
  "Paid",
  "Processing",
  "Shipped",
  "Completed",
  "Cancelled",
];

function getStoredSecret() {
  try {
    return (
      sessionStorage.getItem(
        ADMIN_SESSION_KEY
      ) || ""
    );
  } catch {
    return "";
  }
}

function storeSecret(
  secret
) {
  try {
    sessionStorage.setItem(
      ADMIN_SESSION_KEY,
      secret
    );
  } catch {
    // The secret remains in React state for this page session.
  }
}

function removeStoredSecret() {
  try {
    sessionStorage.removeItem(
      ADMIN_SESSION_KEY
    );
  } catch {
    // Storage may be unavailable.
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

  return (
    `${customer.firstName || ""} ${
      customer.lastName || ""
    }`.trim() ||
    "Customer unavailable"
  );
}

function getItems(
  order
) {
  return Array.isArray(
    order?.items
  )
    ? order.items
    : [];
}

function getQuantity(
  order
) {
  const saved =
    Number(
      order?.totalQuantity
    );

  return Number.isFinite(
    saved
  )
    ? saved
    : getItems(
        order
      ).reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.quantity ||
              0
          ),
        0
      );
}

function getSubtotal(
  order
) {
  const saved =
    Number(
      order?.subtotal
    );

  return Number.isFinite(
    saved
  )
    ? saved
    : getItems(
        order
      ).reduce(
        (
          sum,
          item
        ) =>
          sum +
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

function formatMoney(
  value
) {
  return Number(
    value ||
      0
  ).toLocaleString(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",
    }
  );
}

function formatDate(
  value
) {
  if (!value) {
    return "Unavailable";
  }

  const date =
    new Date(
      value
    );

  return Number.isNaN(
    date.getTime()
  )
    ? String(
        value
      )
    : date.toLocaleString(
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

function normalizeEmail(
  value
) {
  return String(
    value ||
      ""
  )
    .trim()
    .toLowerCase();
}

function validEmail(
  value
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizeEmail(
      value
    )
  );
}

function sortOrders(
  records
) {
  return (
    Array.isArray(
      records
    )
      ? records
      : []
  )
    .filter(
      (
        record
      ) =>
        record &&
        typeof record ===
          "object"
    )
    .sort(
      (
        left,
        right
      ) =>
        String(
          right.createdAt ||
            right.updatedAt ||
            right.date ||
            ""
        ).localeCompare(
          String(
            left.createdAt ||
              left.updatedAt ||
              left.date ||
              ""
          )
        )
    );
}

async function readJson(
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
      "The protected admin service returned an invalid response."
    );
  }

  if (
    !response.ok ||
    !result.success
  ) {
    throw new Error(
      result.error ||
        "The protected admin request could not be completed."
    );
  }

  return result;
}

function CustomerManager({
  orders = [],
  onNavigate = () => {},
}) {
  const [
    adminSecret,
    setAdminSecret,
  ] =
    useState(
      getStoredSecret
    );

  const [
    secretInput,
    setSecretInput,
  ] =
    useState(
      ""
    );

  const [
    records,
    setRecords,
  ] =
    useState(
      []
    );

  const [
    backendReady,
    setBackendReady,
  ] =
    useState(
      false
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      Boolean(
        adminSecret
      )
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      ""
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState(
      "all"
    );

  const [
    expandedId,
    setExpandedId,
  ] =
    useState(
      ""
    );

  const [
    editingId,
    setEditingId,
  ] =
    useState(
      ""
    );

  const [
    draftStatus,
    setDraftStatus,
  ] =
    useState(
      ""
    );

  const [
    draftNotes,
    setDraftNotes,
  ] =
    useState(
      ""
    );

  const [
    busyId,
    setBusyId,
  ] =
    useState(
      ""
    );

  const [
    resetEmail,
    setResetEmail,
  ] =
    useState(
      ""
    );

  const [
    resetting,
    setResetting,
  ] =
    useState(
      false
    );

  const [
    resetResult,
    setResetResult,
  ] =
    useState(
      null
    );

  const [
    copyMessage,
    setCopyMessage,
  ] =
    useState(
      ""
    );

  const localOrders =
    useMemo(
      () =>
        sortOrders(
          orders
        ),
      [
        orders,
      ]
    );

  const displayedOrders =
    backendReady
      ? records
      : localOrders;

  const loadOrders =
    useCallback(
      async (
        secret =
          adminSecret
      ) => {
        const cleaned =
          String(
            secret ||
              ""
          ).trim();

        if (!cleaned) {
          return;
        }

        setLoading(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await fetch(
              "/api/admin/orders",
              {
                headers: {
                  Accept:
                    "application/json",

                  Authorization:
                    `Bearer ${cleaned}`,
                },

                credentials:
                  "same-origin",

                cache:
                  "no-store",
              }
            );

          const result =
            await readJson(
              response
            );

          setRecords(
            sortOrders(
              result.records ||
                result.orders ||
                []
            )
          );

          setBackendReady(
            true
          );
        } catch (
          requestError
        ) {
          setBackendReady(
            false
          );

          setRecords(
            []
          );

          setError(
            requestError.message ||
              "Orders could not be loaded."
          );
        } finally {
          setLoading(
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
      loadOrders(
        adminSecret
      );
    }
  }, [
    adminSecret,
    loadOrders,
  ]);

  const filteredOrders =
    useMemo(() => {
      const term =
        search
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

          const searchable =
            [
              getOrderId(
                order
              ),

              order.status,

              order.adminNotes,

              customer.firstName,

              customer.lastName,

              customer.email,

              customer.address,

              customer.city,

              customer.state,

              customer.zip,

              ...getItems(
                order
              ).flatMap(
                (
                  item
                ) => [
                  item.name,
                  item.codeName,
                  item.strength,
                ]
              ),
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
              .toLowerCase();

          return (
            (
              !term ||
              searchable.includes(
                term
              )
            ) &&
            (
              statusFilter ===
                "all" ||
              order.status ===
                statusFilter
            )
          );
        }
      );
    }, [
      displayedOrders,
      search,
      statusFilter,
    ]);

  const totals =
    useMemo(
      () => ({
        orders:
          displayedOrders.length,

        items:
          displayedOrders.reduce(
            (
              sum,
              order
            ) =>
              sum +
              getQuantity(
                order
              ),
            0
          ),

        value:
          displayedOrders.reduce(
            (
              sum,
              order
            ) =>
              sum +
              getSubtotal(
                order
              ),
            0
          ),
      }),
      [
        displayedOrders,
      ]
    );

  function login(
    event
  ) {
    event.preventDefault();

    const cleaned =
      secretInput.trim();

    if (!cleaned) {
      setError(
        "Enter the administrator secret."
      );

      return;
    }

    storeSecret(
      cleaned
    );

    setAdminSecret(
      cleaned
    );

    setSecretInput(
      ""
    );

    setError(
      ""
    );
  }

  function logoutAdmin() {
    removeStoredSecret();

    setAdminSecret(
      ""
    );

    setRecords(
      []
    );

    setBackendReady(
      false
    );

    setMessage(
      ""
    );

    setError(
      ""
    );

    setResetResult(
      null
    );
  }

  function beginEdit(
    order
  ) {
    setEditingId(
      getOrderId(
        order
      )
    );

    setExpandedId(
      getOrderId(
        order
      )
    );

    setDraftStatus(
      order.status ||
        ORDER_STATUSES[0]
    );

    setDraftNotes(
      order.adminNotes ||
        ""
    );

    setMessage(
      ""
    );

    setError(
      ""
    );
  }

  async function saveOrder(
    order
  ) {
    const orderId =
      getOrderId(
        order
      );

    if (!backendReady) {
      setError(
        "Load Cloudflare orders before updating a record."
      );

      return;
    }

    setBusyId(
      orderId
    );

    setError(
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

            credentials:
              "same-origin",

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
        await readJson(
          response
        );

      const updated =
        result.order ||
        result.record;

      setRecords(
        (
          current
        ) =>
          sortOrders(
            current.map(
              (
                item
              ) =>
                getOrderId(
                  item
                ) ===
                orderId
                  ? updated
                  : item
            )
          )
      );

      setEditingId(
        ""
      );

      setMessage(
        `Order ${orderId} was updated.`
      );
    } catch (
      requestError
    ) {
      setError(
        requestError.message ||
          "The order could not be updated."
      );
    } finally {
      setBusyId(
        ""
      );
    }
  }

  async function deleteOrder(
    order
  ) {
    const orderId =
      getOrderId(
        order
      );

    if (
      !backendReady ||
      !window.confirm(
        `Delete order ${orderId} from Cloudflare KV?`
      )
    ) {
      return;
    }

    setBusyId(
      orderId
    );

    setError(
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

            credentials:
              "same-origin",
          }
        );

      await readJson(
        response
      );

      setRecords(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              getOrderId(
                item
              ) !==
              orderId
          )
      );

      setMessage(
        `Order ${orderId} was deleted.`
      );
    } catch (
      requestError
    ) {
      setError(
        requestError.message ||
          "The order could not be deleted."
      );
    } finally {
      setBusyId(
        ""
      );
    }
  }

  function chooseResetEmail(
    email
  ) {
    setResetEmail(
      normalizeEmail(
        email
      )
    );

    setResetResult(
      null
    );

    setCopyMessage(
      ""
    );

    setError(
      ""
    );

    window.setTimeout(() => {
      document
        .getElementById(
          "password-reset-panel"
        )
        ?.scrollIntoView({
          behavior:
            "smooth",
        });
    });
  }

  async function resetPassword(
    event
  ) {
    event.preventDefault();

    const email =
      normalizeEmail(
        resetEmail
      );

    if (
      !validEmail(
        email
      )
    ) {
      setError(
        "Enter a valid customer account email."
      );

      return;
    }

    if (
      !window.confirm(
        `Reset the password for ${email}? Existing sessions will be invalidated immediately.`
      )
    ) {
      return;
    }

    setResetting(
      true
    );

    setResetResult(
      null
    );

    setCopyMessage(
      ""
    );

    setMessage(
      ""
    );

    setError(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/admin/accounts/reset-password",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              Authorization:
                `Bearer ${adminSecret}`,
            },

            credentials:
              "same-origin",

            cache:
              "no-store",

            body:
              JSON.stringify({
                email,
              }),
          }
        );

      const result =
        await readJson(
          response
        );

      setResetResult(
        result
      );

      setResetEmail(
        result.email ||
          email
      );

      setMessage(
        `Temporary password created for ${
          result.email ||
          email
        }.`
      );
    } catch (
      requestError
    ) {
      setError(
        requestError.message ||
          "The password could not be reset."
      );
    } finally {
      setResetting(
        false
      );
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(
        resetResult
          ?.temporaryPassword ||
          ""
      );

      setCopyMessage(
        "Temporary password copied."
      );
    } catch {
      setCopyMessage(
        "Copy was blocked. Select and copy the password manually."
      );
    }
  }

  if (
    !adminSecret
  ) {
    return (
      <>
        <style>
          {css}
        </style>

        <main className="cm-page">
          <section className="cm-login">
            <p className="eyebrow">
              CUSTOMER MANAGER
            </p>

            <h1>
              Administrator Authorization
            </h1>

            <p>
              Enter your administrator secret to open
              protected customer and order tools.
            </p>

            <form
              onSubmit={
                login
              }
            >
              <input
                type="password"
                value={
                  secretInput
                }
                onChange={(
                  event
                ) =>
                  setSecretInput(
                    event.target
                      .value
                  )
                }
                placeholder="Administrator secret"
                autoComplete="current-password"
              />

              {error && (
                <div className="cm-error">
                  {error}
                </div>
              )}

              <button className="primary-btn">
                Open Customer Manager
              </button>
            </form>

            <button
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
      <style>
        {css}
      </style>

      <main className="cm-page">
        <section className="cm-wrap">
          <div className="cm-top">
            <button
              className="secondary-btn"
              onClick={() =>
                onNavigate(
                  "missionControl"
                )
              }
            >
              ← Mission Control
            </button>

            <div>
              <span
                className={
                  backendReady
                    ? "cm-live"
                    : "cm-pill"
                }
              >
                {backendReady
                  ? "Cloudflare KV"
                  : "Local Fallback"}
              </span>

              <button
                className="cm-link"
                onClick={
                  logoutAdmin
                }
              >
                Clear Admin Session
              </button>
            </div>
          </div>

          <header className="cm-hero">
            <p className="eyebrow">
              CUSTOMER MANAGER
            </p>

            <h1>
              Customers, Orders & Recovery
            </h1>

            <p>
              Manage protected orders and issue
              forced-change temporary passwords.
            </p>

            <button
              className="primary-btn"
              disabled={
                loading
              }
              onClick={() =>
                loadOrders()
              }
            >
              {loading
                ? "Refreshing..."
                : "Refresh Cloudflare Orders"}
            </button>
          </header>

          {error && (
            <div className="cm-error">
              {error}
            </div>
          )}

          {message && (
            <div className="cm-success">
              {message}
            </div>
          )}

          <section className="cm-stats">
            <Stat
              label="Orders"
              value={
                totals.orders
              }
            />

            <Stat
              label="Items"
              value={
                totals.items
              }
            />

            <Stat
              label="Requested Value"
              value={formatMoney(
                totals.value
              )}
            />
          </section>

          <section
            id="password-reset-panel"
            className="cm-panel cm-reset"
          >
            <p className="eyebrow">
              ACCOUNT RECOVERY
            </p>

            <h2>
              Issue Temporary Password
            </h2>

            <p>
              This replaces the old password, invalidates
              existing sessions, and forces the customer
              to choose a permanent password after login.
            </p>

            <form
              onSubmit={
                resetPassword
              }
            >
              <input
                type="email"
                value={
                  resetEmail
                }
                onChange={(
                  event
                ) => {
                  setResetEmail(
                    event.target
                      .value
                      .slice(
                        0,
                        254
                      )
                  );

                  setResetResult(
                    null
                  );

                  setCopyMessage(
                    ""
                  );
                }}
                placeholder="customer@example.com"
                autoComplete="off"
              />

              <button
                className="primary-btn"
                disabled={
                  resetting ||
                  !validEmail(
                    resetEmail
                  )
                }
              >
                {resetting
                  ? "Creating..."
                  : "Reset Password"}
              </button>
            </form>

            {resetResult && (
              <div className="cm-result">
                <span>
                  Customer
                </span>

                <strong>
                  {resetResult.email}
                </strong>

                <span>
                  Temporary Password
                </span>

                <code>
                  {
                    resetResult.temporaryPassword
                  }
                </code>

                <small>
                  Issued{" "}
                  {formatDate(
                    resetResult.issuedAt
                  )}
                  . Copy it before clearing.
                </small>

                <div>
                  <button
                    className="primary-btn"
                    onClick={
                      copyPassword
                    }
                  >
                    Copy Password
                  </button>

                  <button
                    className="secondary-btn"
                    onClick={() => {
                      setResetResult(
                        null
                      );

                      setCopyMessage(
                        ""
                      );
                    }}
                  >
                    Clear
                  </button>
                </div>

                {copyMessage && (
                  <p>
                    {copyMessage}
                  </p>
                )}
              </div>
            )}

            <div className="cm-warning">
              Verify the customer through your support
              process before issuing a reset. Never place a
              temporary password in public messages or
              internal order notes.
            </div>
          </section>

          <section className="cm-panel">
            <div className="cm-heading">
              <div>
                <p className="eyebrow">
                  PROTECTED ORDERS
                </p>

                <h2>
                  Order Records
                </h2>
              </div>

              <strong>
                {filteredOrders.length} shown
              </strong>
            </div>

            <div className="cm-filters">
              <input
                type="search"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search order, customer, email, product, or note"
              />

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
                  All statuses
                </option>

                {ORDER_STATUSES.map(
                  (
                    status
                  ) => (
                    <option
                      key={
                        status
                      }
                    >
                      {status}
                    </option>
                  )
                )}
              </select>
            </div>

            {loading ? (
              <div className="cm-empty">
                Loading protected orders...
              </div>
            ) : filteredOrders.length ===
              0 ? (
              <div className="cm-empty">
                No matching orders.
              </div>
            ) : (
              <div className="cm-orders">
                {filteredOrders.map(
                  (
                    order
                  ) => {
                    const id =
                      getOrderId(
                        order
                      );

                    const customer =
                      getCustomer(
                        order
                      );

                    const items =
                      getItems(
                        order
                      );

                    const expanded =
                      expandedId ===
                      id;

                    const editing =
                      editingId ===
                      id;

                    const busy =
                      busyId ===
                      id;

                    return (
                      <article
                        key={
                          id
                        }
                        className="cm-order"
                      >
                        <div className="cm-summary">
                          <div>
                            <span>
                              Order #{id}
                            </span>

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
                              {formatDate(
                                order.createdAt ||
                                  order.date
                              )}
                            </p>
                          </div>

                          <div>
                            <span>
                              Status
                            </span>

                            <strong>
                              {order.status ||
                                ORDER_STATUSES[0]}
                            </strong>

                            <span>
                              Items
                            </span>

                            <strong>
                              {getQuantity(
                                order
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Subtotal
                            </span>

                            <strong>
                              {formatMoney(
                                getSubtotal(
                                  order
                                )
                              )}
                            </strong>
                          </div>
                        </div>

                        <div className="cm-actions">
                          <button
                            className="secondary-btn"
                            onClick={() =>
                              setExpandedId(
                                expanded
                                  ? ""
                                  : id
                              )
                            }
                          >
                            {expanded
                              ? "Hide Details"
                              : "View Details"}
                          </button>

                          <button
                            className="secondary-btn"
                            disabled={
                              !backendReady ||
                              busy
                            }
                            onClick={() =>
                              beginEdit(
                                order
                              )
                            }
                          >
                            Update Order
                          </button>

                          <button
                            className="cm-reset-btn"
                            disabled={
                              !validEmail(
                                customer.email
                              )
                            }
                            onClick={() =>
                              chooseResetEmail(
                                customer.email
                              )
                            }
                          >
                            Reset Password
                          </button>

                          <button
                            className="cm-delete"
                            disabled={
                              !backendReady ||
                              busy
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

                        {expanded && (
                          <div className="cm-details">
                            <div>
                              <h4>
                                Customer
                              </h4>

                              <p>
                                {getCustomerName(
                                  order
                                )}
                              </p>

                              <p>
                                {customer.email ||
                                  "Unavailable"}
                              </p>

                              <p>
                                {[
                                  customer.address,
                                  customer.city,
                                  customer.state,
                                  customer.zip,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " "
                                  ) ||
                                  "Address unavailable"}
                              </p>
                            </div>

                            <div>
                              <h4>
                                Products
                              </h4>

                              {items.map(
                                (
                                  item,
                                  index
                                ) => (
                                  <p
                                    key={`${item.codeName}-${item.strength}-${index}`}
                                  >
                                    {item.name ||
                                      item.codeName ||
                                      "Product"}{" "}
                                    {item.strength ||
                                      ""}{" "}
                                    ×{" "}
                                    {item.quantity}
                                  </p>
                                )
                              )}
                            </div>

                            <div>
                              <h4>
                                Admin Notes
                              </h4>

                              <p>
                                {order.adminNotes ||
                                  "No notes"}
                              </p>
                            </div>
                          </div>
                        )}

                        {editing && (
                          <div className="cm-editor">
                            <select
                              value={
                                draftStatus
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
                              {ORDER_STATUSES.map(
                                (
                                  status
                                ) => (
                                  <option
                                    key={
                                      status
                                    }
                                  >
                                    {status}
                                  </option>
                                )
                              )}
                            </select>

                            <textarea
                              rows="4"
                              maxLength="2000"
                              value={
                                draftNotes
                              }
                              onChange={(
                                event
                              ) =>
                                setDraftNotes(
                                  event.target
                                    .value
                                )
                              }
                              placeholder="Private admin notes"
                            />

                            <div>
                              <button
                                className="primary-btn"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  saveOrder(
                                    order
                                  )
                                }
                              >
                                {busy
                                  ? "Saving..."
                                  : "Save"}
                              </button>

                              <button
                                className="secondary-btn"
                                onClick={() =>
                                  setEditingId(
                                    ""
                                  )
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
        </section>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
}) {
  return (
    <div className="cm-stat">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

const css = `
  .cm-page,
  .cm-page * {
    box-sizing: border-box;
  }

  .cm-page {
    padding: 80px 30px;
  }

  .cm-wrap {
    max-width: 1200px;
    margin: auto;
  }

  .cm-login,
  .cm-hero,
  .cm-panel {
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 26px;
    background: rgba(255,255,255,0.04);
    box-shadow: 0 25px 70px rgba(0,0,0,0.4);
  }

  .cm-login {
    max-width: 650px;
    margin: auto;
    padding: 45px;
    text-align: center;
  }

  .cm-login h1,
  .cm-hero h1 {
    margin: 10px 0 18px;
    font-size: clamp(38px, 7vw, 58px);
  }

  .cm-login p,
  .cm-hero p,
  .cm-panel > p {
    color: #b9c1c8;
    line-height: 1.7;
  }

  .cm-login form {
    display: grid;
    gap: 14px;
    margin: 25px 0;
  }

  .cm-login input,
  .cm-filters input,
  .cm-filters select,
  .cm-reset input,
  .cm-editor select,
  .cm-editor textarea {
    width: 100%;
    padding: 15px;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 12px;
    background: #151b22;
    color: white;
    font: inherit;
  }

  .cm-top,
  .cm-top > div,
  .cm-heading,
  .cm-actions,
  .cm-result > div,
  .cm-editor > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .cm-top {
    margin-bottom: 24px;
  }

  .cm-pill,
  .cm-live {
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 900;
  }

  .cm-pill {
    background: rgba(255,255,255,0.07);
  }

  .cm-live {
    background: rgba(61,165,255,0.15);
    color: #9ed8ff;
  }

  .cm-link {
    border: 0;
    background: none;
    color: #9aa5ae;
    cursor: pointer;
  }

  .cm-hero {
    margin-bottom: 24px;
    padding: 50px;
    text-align: center;
  }

  .cm-hero button {
    margin-top: 20px;
  }

  .cm-error,
  .cm-success,
  .cm-warning {
    margin: 16px 0;
    padding: 14px;
    border-radius: 14px;
  }

  .cm-error {
    background: rgba(255,70,70,0.12);
    color: #ffd1d1;
  }

  .cm-success {
    background: rgba(61,165,255,0.12);
    color: #bde7ff;
  }

  .cm-warning {
    background: rgba(255,170,50,0.09);
    color: #e8d3ab;
  }

  .cm-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 24px;
  }

  .cm-stat {
    display: grid;
    gap: 8px;
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 18px;
    background: rgba(255,255,255,0.04);
  }

  .cm-stat span,
  .cm-summary span,
  .cm-result span {
    color: #9ed8ff;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .cm-stat strong {
    font-size: 26px;
  }

  .cm-panel {
    margin-bottom: 24px;
    padding: 30px;
  }

  .cm-panel h2 {
    margin: 6px 0 16px;
    font-size: 34px;
  }

  .cm-reset form,
  .cm-filters {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    margin: 20px 0;
  }

  .cm-result {
    display: grid;
    gap: 10px;
    padding: 18px;
    border: 1px solid rgba(61,165,255,0.3);
    border-radius: 16px;
    background: rgba(61,165,255,0.1);
  }

  .cm-result code {
    padding: 12px;
    border-radius: 10px;
    background: #0e1318;
    font-size: 18px;
    font-weight: 900;
    overflow-wrap: anywhere;
    user-select: all;
  }

  .cm-orders {
    display: grid;
    gap: 15px;
  }

  .cm-order {
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 18px;
    background: rgba(255,255,255,0.035);
  }

  .cm-summary {
    display: grid;
    grid-template-columns: 1.4fr 1fr 0.7fr;
    gap: 18px;
  }

  .cm-summary > div {
    display: grid;
    gap: 5px;
  }

  .cm-summary h3 {
    font-size: 22px;
  }

  .cm-summary p,
  .cm-details p {
    color: #aab3ba;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .cm-actions {
    justify-content: flex-start;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .cm-reset-btn,
  .cm-delete {
    padding: 12px 15px;
    border-radius: 11px;
    font: inherit;
    font-weight: 900;
  }

  .cm-reset-btn {
    border: 1px solid rgba(255,190,80,0.35);
    background: rgba(255,170,50,0.1);
    color: #ffe0a8;
  }

  .cm-delete {
    border: 1px solid rgba(255,95,95,0.35);
    background: rgba(255,70,70,0.1);
    color: #ffc7c7;
  }

  .cm-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-top: 16px;
  }

  .cm-details > div,
  .cm-editor {
    padding: 15px;
    border-radius: 14px;
    background: rgba(0,0,0,0.18);
  }

  .cm-details h4 {
    margin-bottom: 8px;
  }

  .cm-editor {
    display: grid;
    gap: 12px;
    margin-top: 16px;
  }

  .cm-empty {
    padding: 30px;
    color: #aab3ba;
    text-align: center;
  }

  @media (max-width: 800px) {
    .cm-page {
      padding: 50px 14px;
    }

    .cm-stats,
    .cm-summary,
    .cm-details {
      grid-template-columns: 1fr;
    }

    .cm-reset form,
    .cm-filters {
      grid-template-columns: 1fr;
    }

    .cm-hero,
    .cm-panel,
    .cm-login {
      padding: 20px;
    }

    .cm-actions button,
    .cm-reset form button {
      width: 100%;
    }
  }
`;

export default CustomerManager;
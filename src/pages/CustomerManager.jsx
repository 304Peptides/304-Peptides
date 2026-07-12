import { useCallback, useEffect, useMemo, useState } from "react";

const ADMIN_SESSION_KEY = "304-document-admin-session";
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
const ACCOUNT_FILTERS = [
  ["all", "All Accounts"],
  ["active", "Active Accounts"],
  ["temporary", "Temporary Password Required"],
  ["ready", "Permanent Password Set"],
];

function getStoredSecret() {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) || "";
  } catch {
    return "";
  }
}

function storeSecret(secret) {
  try {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, secret);
  } catch {
    // The secret remains in React state for this page session.
  }
}

function removeStoredSecret() {
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // Storage may be unavailable.
  }
}

function getOrderId(order) {
  return String(order?.orderId || order?.id || "");
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

function getAccountName(account) {
  return (
    `${account?.firstName || ""} ${account?.lastName || ""}`.trim() ||
    "Name unavailable"
  );
}

function getItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

function getQuantity(order) {
  const saved = Number(order?.totalQuantity);
  return Number.isFinite(saved)
    ? saved
    : getItems(order).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      );
}

function getSubtotal(order) {
  const saved = Number(order?.subtotal);
  return Number.isFinite(saved)
    ? saved
    : getItems(order).reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
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
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function sortOrders(records) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .sort((left, right) =>
      String(
        right.createdAt || right.updatedAt || right.date || ""
      ).localeCompare(
        String(left.createdAt || left.updatedAt || left.date || "")
      )
    );
}

function sortAccounts(records) {
  return (Array.isArray(records) ? records : [])
    .filter(
      (record) =>
        record && typeof record === "object" && validEmail(record.email)
    )
    .map((record) => ({
      ...record,
      email: normalizeEmail(record.email),
      mustChangePassword: Boolean(record.mustChangePassword),
    }))
    .sort((left, right) =>
      String(right.createdAt || right.updatedAt || "").localeCompare(
        String(left.createdAt || left.updatedAt || "")
      )
    );
}

async function readJson(response) {
  const text = await response.text();
  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("The protected admin service returned an invalid response.");
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error || "The protected admin request could not be completed."
    );
  }

  return result;
}

function CustomerManager({ orders = [], onNavigate = () => {} }) {
  const [adminSecret, setAdminSecret] = useState(getStoredSecret);
  const [secretInput, setSecretInput] = useState("");
  const [records, setRecords] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [ordersReady, setOrdersReady] = useState(false);
  const [accountsReady, setAccountsReady] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(Boolean(adminSecret));
  const [accountsLoading, setAccountsLoading] = useState(Boolean(adminSecret));
  const [orderLoadError, setOrderLoadError] = useState("");
  const [accountLoadError, setAccountLoadError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [expandedId, setExpandedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [busyId, setBusyId] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");

  const localOrders = useMemo(() => sortOrders(orders), [orders]);
  const displayedOrders = ordersReady ? records : localOrders;

  const loadOrders = useCallback(
    async (secret = adminSecret) => {
      const cleaned = String(secret || "").trim();
      if (!cleaned) return;

      setOrdersLoading(true);
      setOrderLoadError("");

      try {
        const response = await fetch("/api/admin/orders", {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${cleaned}`,
          },
          credentials: "same-origin",
          cache: "no-store",
        });
        const result = await readJson(response);
        setRecords(sortOrders(result.records || result.orders || []));
        setOrdersReady(true);
      } catch (requestError) {
        setOrdersReady(false);
        setRecords([]);
        setOrderLoadError(
          requestError.message || "Orders could not be loaded."
        );
      } finally {
        setOrdersLoading(false);
      }
    },
    [adminSecret]
  );

  const loadAccounts = useCallback(
    async (secret = adminSecret) => {
      const cleaned = String(secret || "").trim();
      if (!cleaned) return;

      setAccountsLoading(true);
      setAccountLoadError("");

      try {
        const response = await fetch("/api/admin/accounts", {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${cleaned}`,
          },
          credentials: "same-origin",
          cache: "no-store",
        });
        const result = await readJson(response);
        setAccounts(sortAccounts(result.records || result.accounts || []));
        setAccountsReady(true);
      } catch (requestError) {
        setAccountsReady(false);
        setAccounts([]);
        setAccountLoadError(
          requestError.message || "Customer accounts could not be loaded."
        );
      } finally {
        setAccountsLoading(false);
      }
    },
    [adminSecret]
  );

  const refreshProtectedData = useCallback(
    async (secret = adminSecret) => {
      setActionError("");
      setActionMessage("");
      await Promise.allSettled([loadAccounts(secret), loadOrders(secret)]);
    },
    [adminSecret, loadAccounts, loadOrders]
  );

  useEffect(() => {
    if (adminSecret) refreshProtectedData(adminSecret);
  }, [adminSecret, refreshProtectedData]);

  const accountOrderCounts = useMemo(() => {
    const counts = new Map();
    for (const order of displayedOrders) {
      const email = normalizeEmail(getCustomer(order).email);
      if (!email) continue;
      counts.set(email, (counts.get(email) || 0) + 1);
    }
    return counts;
  }, [displayedOrders]);

  const filteredAccounts = useMemo(() => {
    const term = accountSearch.trim().toLowerCase();

    return accounts.filter((account) => {
      const searchText = [
        account.id,
        account.firstName,
        account.lastName,
        account.email,
        account.status,
        account.createdAt,
        account.updatedAt,
        account.temporaryPasswordIssuedAt,
        account.passwordChangedAt,
        account.passwordResetCompletedAt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchText.includes(term);
      let matchesFilter = true;

      if (accountFilter === "active") {
        matchesFilter = account.status === "active";
      } else if (accountFilter === "temporary") {
        matchesFilter = account.mustChangePassword === true;
      } else if (accountFilter === "ready") {
        matchesFilter = account.mustChangePassword !== true;
      }

      return matchesSearch && matchesFilter;
    });
  }, [accountFilter, accountSearch, accounts]);

  const filteredOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();

    return displayedOrders.filter((order) => {
      const customer = getCustomer(order);
      const searchable = [
        getOrderId(order),
        order.status,
        order.adminNotes,
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.address,
        customer.city,
        customer.state,
        customer.zip,
        ...getItems(order).flatMap((item) => [
          item.name,
          item.codeName,
          item.strength,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!term || searchable.includes(term)) &&
        (statusFilter === "all" || order.status === statusFilter)
      );
    });
  }, [displayedOrders, orderSearch, statusFilter]);

  const orderTotals = useMemo(
    () => ({
      orders: displayedOrders.length,
      items: displayedOrders.reduce(
        (sum, order) => sum + getQuantity(order),
        0
      ),
      value: displayedOrders.reduce(
        (sum, order) => sum + getSubtotal(order),
        0
      ),
    }),
    [displayedOrders]
  );

  const accountTotals = useMemo(
    () => ({
      total: accounts.length,
      active: accounts.filter((account) => account.status === "active").length,
      temporary: accounts.filter((account) => account.mustChangePassword).length,
      ready: accounts.filter((account) => !account.mustChangePassword).length,
    }),
    [accounts]
  );

  function login(event) {
    event.preventDefault();
    const cleaned = secretInput.trim();

    if (!cleaned) {
      setActionError("Enter the administrator secret.");
      return;
    }

    storeSecret(cleaned);
    setAdminSecret(cleaned);
    setSecretInput("");
    setActionError("");
  }

  function logoutAdmin() {
    removeStoredSecret();
    setAdminSecret("");
    setRecords([]);
    setAccounts([]);
    setOrdersReady(false);
    setAccountsReady(false);
    setOrderLoadError("");
    setAccountLoadError("");
    setActionMessage("");
    setActionError("");
    setResetResult(null);
    setResetEmail("");
    setCopyMessage("");
  }

  function beginEdit(order) {
    const orderId = getOrderId(order);
    setEditingId(orderId);
    setExpandedId(orderId);
    setDraftStatus(order.status || ORDER_STATUSES[0]);
    setDraftNotes(order.adminNotes || "");
    setActionMessage("");
    setActionError("");
  }

  async function saveOrder(order) {
    const orderId = getOrderId(order);

    if (!ordersReady) {
      setActionError("Load Cloudflare orders before updating a record.");
      return;
    }

    setBusyId(orderId);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${adminSecret}`,
          },
          credentials: "same-origin",
          body: JSON.stringify({ status: draftStatus, adminNotes: draftNotes }),
        }
      );
      const result = await readJson(response);
      const updated = result.order || result.record;

      setRecords((current) =>
        sortOrders(
          current.map((item) =>
            getOrderId(item) === orderId ? updated : item
          )
        )
      );
      setEditingId("");
      setActionMessage(`Order ${orderId} was updated.`);
    } catch (requestError) {
      setActionError(
        requestError.message || "The order could not be updated."
      );
    } finally {
      setBusyId("");
    }
  }

  async function deleteOrder(order) {
    const orderId = getOrderId(order);

    if (
      !ordersReady ||
      !window.confirm(`Delete order ${orderId} from Cloudflare KV?`)
    ) {
      return;
    }

    setBusyId(orderId);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${adminSecret}`,
          },
          credentials: "same-origin",
        }
      );
      await readJson(response);
      setRecords((current) =>
        current.filter((item) => getOrderId(item) !== orderId)
      );
      if (expandedId === orderId) setExpandedId("");
      if (editingId === orderId) setEditingId("");
      setActionMessage(`Order ${orderId} was deleted.`);
    } catch (requestError) {
      setActionError(
        requestError.message || "The order could not be deleted."
      );
    } finally {
      setBusyId("");
    }
  }

  function chooseResetEmail(email) {
    setResetEmail(normalizeEmail(email));
    setResetResult(null);
    setCopyMessage("");
    setActionError("");
    setActionMessage("");

    window.setTimeout(() => {
      document.getElementById("password-reset-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  async function resetPassword(event) {
    event.preventDefault();
    const email = normalizeEmail(resetEmail);

    if (!validEmail(email)) {
      setActionError("Enter a valid customer account email.");
      return;
    }

    if (
      !window.confirm(
        `Reset the password for ${email}? Existing sessions will be invalidated immediately.`
      )
    ) {
      return;
    }

    setResetting(true);
    setResetResult(null);
    setCopyMessage("");
    setActionMessage("");
    setActionError("");

    try {
      const response = await fetch("/api/admin/accounts/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ email }),
      });
      const result = await readJson(response);
      setResetResult(result);
      setResetEmail(result.email || email);

      if (result.account) {
        setAccounts((current) =>
          sortAccounts([
            ...current.filter(
              (account) =>
                normalizeEmail(account.email) !==
                normalizeEmail(result.account.email)
            ),
            result.account,
          ])
        );
      }

      setActionMessage(
        `Temporary password created for ${result.email || email}.`
      );
    } catch (requestError) {
      setActionError(
        requestError.message || "The password could not be reset."
      );
    } finally {
      setResetting(false);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(
        resetResult?.temporaryPassword || ""
      );
      setCopyMessage("Temporary password copied.");
    } catch {
      setCopyMessage(
        "Copy was blocked. Select and copy the password manually."
      );
    }
  }

  if (!adminSecret) {
    return (
      <>
        <style>{css}</style>
        <main className="cm-page">
          <section className="cm-login">
            <p className="eyebrow">CUSTOMER MANAGER</p>
            <h1>Administrator Authorization</h1>
            <p>
              Enter your administrator secret to open protected customer,
              account-recovery, and order tools.
            </p>

            <form onSubmit={login}>
              <input
                type="password"
                value={secretInput}
                onChange={(event) => {
                  setSecretInput(event.target.value);
                  setActionError("");
                }}
                placeholder="Administrator secret"
                autoComplete="current-password"
              />

              {actionError && (
                <div className="cm-error" role="alert">
                  {actionError}
                </div>
              )}

              <button type="submit" className="primary-btn">
                Open Customer Manager
              </button>
            </form>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("missionControl")}
            >
              Back To Mission Control
            </button>
          </section>
        </main>
      </>
    );
  }

  const pageLoading = ordersLoading || accountsLoading;

  return (
    <>
      <style>{css}</style>
      <main className="cm-page">
        <section className="cm-wrap">
          <div className="cm-top">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("missionControl")}
            >
              ← Mission Control
            </button>

            <div>
              <span
                className={
                  accountsReady && ordersReady ? "cm-live" : "cm-pill"
                }
              >
                {accountsReady && ordersReady
                  ? "Cloudflare Connected"
                  : "Partial / Local Fallback"}
              </span>
              <button type="button" className="cm-link" onClick={logoutAdmin}>
                Clear Admin Session
              </button>
            </div>
          </div>

          <header className="cm-hero">
            <p className="eyebrow">CUSTOMER MANAGER</p>
            <h1>Accounts, Orders & Recovery</h1>
            <p>
              Review every registered account, including customers without
              orders, manage protected order records, and issue forced-change
              temporary passwords.
            </p>
            <button
              type="button"
              className="primary-btn"
              disabled={pageLoading}
              onClick={() => refreshProtectedData()}
            >
              {pageLoading ? "Refreshing..." : "Refresh Protected Data"}
            </button>
          </header>

          {accountLoadError && (
            <div className="cm-error" role="alert">
              <strong>Account directory could not be loaded.</strong>
              <p>{accountLoadError}</p>
            </div>
          )}

          {orderLoadError && (
            <div className="cm-error" role="alert">
              <strong>Cloudflare orders could not be loaded.</strong>
              <p>{orderLoadError}</p>
            </div>
          )}

          {actionError && (
            <div className="cm-error" role="alert">
              {actionError}
            </div>
          )}

          {actionMessage && (
            <div className="cm-success" aria-live="polite">
              {actionMessage}
            </div>
          )}

          <section className="cm-stats cm-account-stats">
            <Stat
              label="Registered Accounts"
              value={accountsLoading ? "—" : accountTotals.total}
              detail="Cloudflare customer records"
            />
            <Stat
              label="Active Accounts"
              value={accountsLoading ? "—" : accountTotals.active}
              detail="Currently enabled"
            />
            <Stat
              label="Temporary Password"
              value={accountsLoading ? "—" : accountTotals.temporary}
              detail="Must change after login"
            />
            <Stat
              label="Permanent Password"
              value={accountsLoading ? "—" : accountTotals.ready}
              detail="Normal account access"
            />
          </section>

          <section className="cm-panel cm-directory">
            <div className="cm-heading">
              <div>
                <p className="eyebrow">CUSTOMER ACCOUNT DIRECTORY</p>
                <h2>Registered Accounts</h2>
              </div>
              <span className="cm-count-label">
                Showing <strong>{filteredAccounts.length}</strong> of{" "}
                <strong>{accounts.length}</strong>
              </span>
            </div>

            <div className="cm-filters">
              <label>
                <span>Search Accounts</span>
                <input
                  type="search"
                  value={accountSearch}
                  onChange={(event) => setAccountSearch(event.target.value)}
                  placeholder="Name, email, account ID, or date"
                />
              </label>

              <label>
                <span>Account Filter</span>
                <select
                  value={accountFilter}
                  onChange={(event) => setAccountFilter(event.target.value)}
                >
                  {ACCOUNT_FILTERS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {accountsLoading ? (
              <div className="cm-empty">
                Loading registered customer accounts...
              </div>
            ) : !accountsReady ? (
              <div className="cm-empty">
                The protected account directory is not connected. Check the
                error above, then refresh protected data.
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="cm-empty">
                No customer accounts match the current search and filter.
              </div>
            ) : (
              <div className="cm-account-grid">
                {filteredAccounts.map((account) => {
                  const email = normalizeEmail(account.email);
                  const orderCount = accountOrderCounts.get(email) || 0;
                  const requiresChange = Boolean(account.mustChangePassword);

                  return (
                    <article
                      key={account.id || email}
                      className="cm-account-card"
                    >
                      <div className="cm-account-card-top">
                        <div>
                          <span>Customer Account</span>
                          <h3>{getAccountName(account)}</h3>
                          <p>{email}</p>
                        </div>
                        <span
                          className={
                            requiresChange
                              ? "cm-account-status cm-account-status-warning"
                              : "cm-account-status cm-account-status-ready"
                          }
                        >
                          {requiresChange
                            ? "Temporary Password"
                            : "Password Ready"}
                        </span>
                      </div>

                      <div className="cm-account-info-grid">
                        <AccountInfo
                          label="Account Status"
                          value={account.status || "active"}
                        />
                        <AccountInfo label="Linked Orders" value={orderCount} />
                        <AccountInfo
                          label="Created"
                          value={formatDate(account.createdAt)}
                        />
                        <AccountInfo
                          label="Last Updated"
                          value={formatDate(account.updatedAt)}
                        />
                        <AccountInfo
                          label="Research Agreement"
                          value={
                            account.researchAgreementAcceptedAt
                              ? formatDate(account.researchAgreementAcceptedAt)
                              : "Not recorded"
                          }
                        />
                        <AccountInfo
                          label="Password Changed"
                          value={formatDate(account.passwordChangedAt)}
                        />
                      </div>

                      {requiresChange && (
                        <div className="cm-account-reset-state">
                          <strong>Password change required</strong>
                          <p>
                            Temporary password issued{" "}
                            {formatDate(account.temporaryPasswordIssuedAt)}.
                            Existing sessions were invalidated.
                          </p>
                        </div>
                      )}

                      <div className="cm-account-actions">
                        <button
                          type="button"
                          className="cm-reset-btn"
                          onClick={() => chooseResetEmail(email)}
                        >
                          {requiresChange
                            ? "Issue New Temporary Password"
                            : "Reset Password"}
                        </button>

                        {orderCount > 0 && (
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => {
                              setOrderSearch(email);
                              document
                                .getElementById("protected-orders-panel")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                            }}
                          >
                            View Orders
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section id="password-reset-panel" className="cm-panel cm-reset">
            <p className="eyebrow">ACCOUNT RECOVERY</p>
            <h2>Issue Temporary Password</h2>
            <p>
              This replaces the old password, invalidates existing sessions,
              and forces the customer to choose a permanent password after
              login.
            </p>

            <form onSubmit={resetPassword}>
              <label>
                <span>Customer Account Email</span>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(event) => {
                    setResetEmail(event.target.value.slice(0, 254));
                    setResetResult(null);
                    setCopyMessage("");
                  }}
                  placeholder="customer@example.com"
                  autoComplete="off"
                />
              </label>

              <button
                type="submit"
                className="primary-btn"
                disabled={resetting || !validEmail(resetEmail)}
              >
                {resetting ? "Creating..." : "Reset Password"}
              </button>
            </form>

            {resetResult && (
              <div className="cm-result">
                <span>Customer</span>
                <strong>{resetResult.email}</strong>
                <span>Temporary Password</span>
                <code>{resetResult.temporaryPassword}</code>
                <small>
                  Issued {formatDate(resetResult.issuedAt)}. Copy it before
                  clearing this panel.
                </small>
                <div>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={copyPassword}
                  >
                    Copy Password
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setResetResult(null);
                      setCopyMessage("");
                    }}
                  >
                    Clear
                  </button>
                </div>
                {copyMessage && <p>{copyMessage}</p>}
              </div>
            )}

            <div className="cm-warning">
              Verify the customer through your support process before issuing a
              reset. Never place a temporary password in public messages or
              internal order notes.
            </div>
          </section>

          <section className="cm-stats cm-order-stats">
            <Stat
              label="Stored Orders"
              value={ordersLoading ? "—" : orderTotals.orders}
              detail={
                ordersReady ? "Cloudflare KV records" : "Local browser fallback"
              }
            />
            <Stat
              label="Total Items"
              value={ordersLoading ? "—" : orderTotals.items}
              detail="Units requested"
            />
            <Stat
              label="Requested Value"
              value={ordersLoading ? "—" : formatMoney(orderTotals.value)}
              detail="Product subtotal only"
            />
          </section>

          <section id="protected-orders-panel" className="cm-panel">
            <div className="cm-heading">
              <div>
                <p className="eyebrow">PROTECTED ORDERS</p>
                <h2>Order Records</h2>
              </div>
              <span className="cm-count-label">
                Showing <strong>{filteredOrders.length}</strong> of{" "}
                <strong>{displayedOrders.length}</strong>
              </span>
            </div>

            <div className="cm-filters">
              <label>
                <span>Search Orders</span>
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="Order, customer, email, product, address, or note"
                />
              </label>

              <label>
                <span>Order Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All Statuses</option>
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {ordersLoading ? (
              <div className="cm-empty">Loading protected orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="cm-empty">No matching orders.</div>
            ) : (
              <div className="cm-orders">
                {filteredOrders.map((order) => {
                  const id = getOrderId(order);
                  const customer = getCustomer(order);
                  const items = getItems(order);
                  const expanded = expandedId === id;
                  const editing = editingId === id;
                  const busy = busyId === id;

                  return (
                    <article key={id} className="cm-order">
                      <div className="cm-summary">
                        <div>
                          <span>Order #{id}</span>
                          <h3>{getCustomerName(order)}</h3>
                          <p>{customer.email || "Email unavailable"}</p>
                          <p>{formatDate(order.createdAt || order.date)}</p>
                        </div>
                        <div>
                          <span>Status</span>
                          <strong>{order.status || ORDER_STATUSES[0]}</strong>
                          <span>Items</span>
                          <strong>{getQuantity(order)}</strong>
                        </div>
                        <div>
                          <span>Subtotal</span>
                          <strong>{formatMoney(getSubtotal(order))}</strong>
                        </div>
                      </div>

                      <div className="cm-actions">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => setExpandedId(expanded ? "" : id)}
                        >
                          {expanded ? "Hide Details" : "View Details"}
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          disabled={!ordersReady || busy}
                          onClick={() => beginEdit(order)}
                        >
                          Update Order
                        </button>
                        <button
                          type="button"
                          className="cm-reset-btn"
                          disabled={!validEmail(customer.email)}
                          onClick={() => chooseResetEmail(customer.email)}
                        >
                          Reset Password
                        </button>
                        <button
                          type="button"
                          className="cm-delete"
                          disabled={!ordersReady || busy}
                          onClick={() => deleteOrder(order)}
                        >
                          Delete
                        </button>
                      </div>

                      {expanded && (
                        <div className="cm-details">
                          <div>
                            <h4>Customer</h4>
                            <p>{getCustomerName(order)}</p>
                            <p>{customer.email || "Unavailable"}</p>
                            <p>
                              {[
                                customer.address,
                                customer.city,
                                customer.state,
                                customer.zip,
                              ]
                                .filter(Boolean)
                                .join(" ") || "Address unavailable"}
                            </p>
                          </div>

                          <div>
                            <h4>Products</h4>
                            {items.length > 0 ? (
                              items.map((item, index) => (
                                <p
                                  key={`${
                                    item.codeName || item.name || "product"
                                  }-${item.strength || "strength"}-${index}`}
                                >
                                  {item.name || item.codeName || "Product"}{" "}
                                  {item.strength || ""} × {item.quantity}
                                </p>
                              ))
                            ) : (
                              <p>No products saved.</p>
                            )}
                          </div>

                          <div>
                            <h4>Admin Notes</h4>
                            <p>{order.adminNotes || "No notes"}</p>
                          </div>
                        </div>
                      )}

                      {editing && (
                        <div className="cm-editor">
                          <label>
                            <span>Status</span>
                            <select
                              value={draftStatus}
                              disabled={busy}
                              onChange={(event) =>
                                setDraftStatus(event.target.value)
                              }
                            >
                              {ORDER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            <span>Private Admin Notes</span>
                            <textarea
                              rows="4"
                              maxLength="2000"
                              value={draftNotes}
                              disabled={busy}
                              onChange={(event) =>
                                setDraftNotes(event.target.value)
                              }
                              placeholder="Private admin notes"
                            />
                          </label>

                          <div>
                            <button
                              type="button"
                              className="primary-btn"
                              disabled={busy}
                              onClick={() => saveOrder(order)}
                            >
                              {busy ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              className="secondary-btn"
                              disabled={busy}
                              onClick={() => setEditingId("")}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="cm-security-note">
            <p className="eyebrow">ADMIN SECURITY</p>
            <h2>Protected Customer Records</h2>
            <p>
              Cloudflare Access protects the admin route, and every directory,
              recovery, and order API request still requires the administrator
              bearer secret. Password hashes and password salts are never
              returned to this page.
            </p>
          </section>
        </section>
      </main>
    </>
  );
}

function Stat({ label, value, detail }) {
  return (
    <div className="cm-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function AccountInfo({ label, value }) {
  return (
    <div className="cm-account-info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const css = `
.cm-page,.cm-page *,.cm-page *::before,.cm-page *::after{box-sizing:border-box}.cm-page{width:100%;padding:80px 30px;overflow-x:hidden}.cm-wrap{width:100%;max-width:1200px;margin:0 auto}.cm-login,.cm-hero,.cm-panel,.cm-security-note{border:1px solid rgba(255,255,255,.1);border-radius:26px;background:radial-gradient(circle at top left,rgba(61,165,255,.12),transparent 35%),rgba(255,255,255,.04);box-shadow:0 25px 70px rgba(0,0,0,.4)}.cm-login{max-width:650px;margin:0 auto;padding:45px;text-align:center}.cm-login h1,.cm-hero h1{margin:10px 0 18px;font-size:clamp(38px,7vw,58px);line-height:1.06}.cm-login p,.cm-hero p,.cm-panel>p,.cm-security-note p{color:#b9c1c8;line-height:1.7}.cm-login form{display:grid;gap:14px;margin:25px 0}.cm-login input,.cm-filters input,.cm-filters select,.cm-reset input,.cm-editor select,.cm-editor textarea{width:100%;padding:15px;border:1px solid rgba(255,255,255,.14);border-radius:12px;outline:none;background:#151b22;color:#fff;font:inherit}.cm-login input:focus,.cm-filters input:focus,.cm-filters select:focus,.cm-reset input:focus,.cm-editor select:focus,.cm-editor textarea:focus{border-color:rgba(61,165,255,.62);box-shadow:0 0 0 3px rgba(61,165,255,.12)}.cm-filters select option,.cm-editor select option{background:#151b22;color:#fff}.cm-top,.cm-top>div,.cm-heading,.cm-actions,.cm-result>div,.cm-editor>div,.cm-account-card-top,.cm-account-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.cm-top{margin-bottom:24px}.cm-pill,.cm-live{display:inline-flex;padding:8px 12px;border:1px solid rgba(255,255,255,.1);border-radius:999px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.6px}.cm-pill{background:rgba(255,255,255,.07);color:#c3c9ce}.cm-live{border-color:rgba(61,165,255,.3);background:rgba(61,165,255,.15);color:#9ed8ff}.cm-link{border:0;background:none;color:#9aa5ae;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.cm-hero{margin-bottom:24px;padding:50px;text-align:center}.cm-hero>p:not(.eyebrow){max-width:850px;margin:0 auto}.cm-hero button{margin-top:20px}.cm-error,.cm-success,.cm-warning,.cm-account-reset-state{margin:16px 0;padding:14px;border-radius:14px;line-height:1.6}.cm-error{border:1px solid rgba(255,95,95,.35);background:rgba(255,70,70,.12);color:#ffd1d1}.cm-error p{margin-top:5px}.cm-success{border:1px solid rgba(61,165,255,.3);background:rgba(61,165,255,.12);color:#bde7ff}.cm-warning,.cm-account-reset-state{border:1px solid rgba(255,190,80,.28);background:rgba(255,170,50,.09);color:#e8d3ab}.cm-stats{display:grid;gap:14px;margin-bottom:24px}.cm-account-stats{grid-template-columns:repeat(4,minmax(0,1fr))}.cm-order-stats{grid-template-columns:repeat(3,minmax(0,1fr))}.cm-stat{min-width:0;display:grid;gap:8px;padding:20px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(255,255,255,.04)}.cm-stat span,.cm-summary span,.cm-result span,.cm-account-card-top>div>span,.cm-account-info span,.cm-reset label>span,.cm-filters label>span,.cm-editor label>span{color:#9ed8ff;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.7px}.cm-stat strong{color:#fff;font-size:26px;overflow-wrap:anywhere}.cm-stat small{color:#8d98a1;line-height:1.5}.cm-panel{margin-bottom:24px;padding:30px}.cm-panel h2,.cm-security-note h2{margin:6px 0 16px;font-size:clamp(30px,4vw,38px);line-height:1.12}.cm-count-label{color:#aeb7be;font-size:13px}.cm-count-label strong{color:#fff}.cm-reset form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end;margin:20px 0}.cm-reset form label,.cm-filters label,.cm-editor label{display:grid;gap:8px}.cm-filters{display:grid;grid-template-columns:minmax(0,1fr) minmax(230px,300px);gap:12px;margin:20px 0}.cm-result{display:grid;gap:10px;padding:18px;border:1px solid rgba(61,165,255,.3);border-radius:16px;background:rgba(61,165,255,.1)}.cm-result code{padding:12px;border-radius:10px;background:#0e1318;color:#fff;font-size:18px;font-weight:900;overflow-wrap:anywhere;user-select:all}.cm-result small{color:#b9c6cf}.cm-account-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.cm-account-card{min-width:0;padding:21px;border:1px solid rgba(255,255,255,.09);border-radius:20px;background:radial-gradient(circle at top left,rgba(61,165,255,.09),transparent 40%),rgba(255,255,255,.03)}.cm-account-card-top{align-items:flex-start}.cm-account-card-top h3{margin:5px 0;color:#fff;font-size:23px;line-height:1.2}.cm-account-card-top p{color:#aab5bd;overflow-wrap:anywhere}.cm-account-status{display:inline-flex;max-width:190px;padding:8px 11px;border-radius:999px;font-size:10px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:.55px}.cm-account-status-ready{border:1px solid rgba(74,208,152,.28);background:rgba(74,208,152,.1);color:#b5f2d8}.cm-account-status-warning{border:1px solid rgba(255,190,80,.3);background:rgba(255,170,50,.1);color:#ffe0a8}.cm-account-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:18px}.cm-account-info{min-width:0;display:grid;gap:5px;padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(0,0,0,.16)}.cm-account-info strong{color:#e6eaed;font-size:13px;line-height:1.45;overflow-wrap:anywhere}.cm-account-reset-state{margin-bottom:0;font-size:13px}.cm-account-reset-state p{margin-top:4px}.cm-account-actions{justify-content:flex-start;margin-top:17px;padding-top:15px;border-top:1px solid rgba(255,255,255,.08)}.cm-orders{display:grid;gap:15px}.cm-order{padding:20px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:rgba(255,255,255,.035)}.cm-summary{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,.7fr);gap:18px}.cm-summary>div{min-width:0;display:grid;gap:5px}.cm-summary h3{color:#fff;font-size:22px}.cm-summary p,.cm-details p{color:#aab3ba;line-height:1.5;overflow-wrap:anywhere}.cm-actions{justify-content:flex-start;margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)}.cm-reset-btn,.cm-delete{padding:12px 15px;border-radius:11px;font:inherit;font-weight:900;cursor:pointer}.cm-reset-btn{border:1px solid rgba(255,190,80,.35);background:rgba(255,170,50,.1);color:#ffe0a8}.cm-delete{border:1px solid rgba(255,95,95,.35);background:rgba(255,70,70,.1);color:#ffc7c7}.cm-reset-btn:disabled,.cm-delete:disabled,.cm-page button:disabled{opacity:.45;cursor:not-allowed}.cm-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:16px}.cm-details>div,.cm-editor{min-width:0;padding:15px;border-radius:14px;background:rgba(0,0,0,.18)}.cm-details h4{margin-bottom:8px;color:#fff}.cm-editor{display:grid;gap:12px;margin-top:16px}.cm-empty{padding:35px 20px;border:1px dashed rgba(255,255,255,.1);border-radius:15px;color:#aab3ba;line-height:1.65;text-align:center}.cm-security-note{padding:30px}.cm-security-note p:not(.eyebrow){max-width:850px}@media(max-width:1000px){.cm-account-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.cm-account-grid{grid-template-columns:minmax(0,1fr)}}@media(max-width:800px){.cm-page{padding:50px 14px}.cm-order-stats,.cm-summary,.cm-details{grid-template-columns:minmax(0,1fr)}.cm-reset form,.cm-filters{grid-template-columns:minmax(0,1fr)}.cm-hero,.cm-panel,.cm-login,.cm-security-note{padding:20px}.cm-actions button,.cm-account-actions button,.cm-reset form button{width:100%}}@media(max-width:520px){.cm-page{padding:35px 8px}.cm-account-stats,.cm-order-stats,.cm-account-info-grid{grid-template-columns:minmax(0,1fr)}.cm-hero,.cm-panel,.cm-login,.cm-security-note{padding:16px;border-radius:20px}}
`;

export default CustomerManager;
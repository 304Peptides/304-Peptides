import { useCallback, useEffect, useMemo, useState } from "react";

const ADMIN_SESSION_KEY = "304-document-admin-session";
const ORDER_STATUSES = [
  "Order Request Received",
  "Invoice Sent",
  "Awaiting Payment",
  "Paid",
  "Paid — Awaiting Shipment",
  "Paid — Awaiting Restock",
  "Paid — Mixed Fulfillment",
  "Processing",
  "Partially Shipped",
  "Shipped",
  "Completed",
  "Cancelled",
];
const PAYMENT_METHODS = ["Zelle", "Venmo", "Cash App"];
const SHIPPING_CARRIERS = ["USPS", "UPS", "FedEx", "Other"];
const ITEM_FULFILLMENT_OPTIONS = [
  ["in_stock", "In Stock — ships soon"],
  ["preorder", "Preorder — ships after restock"],
];
const ACCOUNT_FILTERS = [
  ["all", "All Accounts"],
  ["active", "Active Accounts"],
  ["suspended", "Suspended Accounts"],
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

function formatCents(value) {
  return formatMoney(Number(value || 0) / 100);
}

function moneyInputFromCents(cents, fallbackDollars = 0) {
  const numericCents = Number(cents);
  const selectedCents = Number.isFinite(numericCents)
    ? numericCents
    : Math.round(Number(fallbackDollars || 0) * 100);

  return (Math.max(0, selectedCents) / 100).toFixed(2);
}

function moneyInputToCents(value, label) {
  const cleaned = String(value ?? "").trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Enter a valid ${label} using no more than two decimal places.`);
  }

  const cents = Math.round(Number(cleaned) * 100);

  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error(`Enter a valid ${label}.`);
  }

  return cents;
}

function getInvoiceLabel(order) {
  const invoice = order?.invoice;

  if (invoice?.lastSentAt || invoice?.sentAt || invoice?.firstSentAt) {
    return `Sent ${formatDate(invoice.lastSentAt || invoice.sentAt || invoice.firstSentAt)}`;
  }

  return "Not sent";
}

function getPaymentLabel(order) {
  const payment = order?.payment;

  if (payment?.receivedAt) {
    return `Received ${formatDate(payment.receivedAt)}`;
  }

  return "Not recorded";
}

function getFulfillmentLabel(order) {
  return order?.fulfillment?.label || "Not selected";
}

function normalizeItemFulfillmentStatus(value, fallback = "in_stock") {
  return value === "preorder" ? "preorder" : fallback;
}

function getSavedItemFulfillmentStatus(order, item, index) {
  const savedItems = Array.isArray(order?.fulfillment?.items)
    ? order.fulfillment.items
    : [];

  const saved =
    savedItems.find((entry) => Number(entry?.index) === index) ||
    savedItems.find(
      (entry) =>
        String(entry?.codeName || "") === String(item?.codeName || "") &&
        String(entry?.strength || "") === String(item?.strength || "")
    );

  if (saved?.status === "in_stock" || saved?.status === "preorder") {
    return saved.status;
  }

  return order?.fulfillment?.type === "preorder"
    ? "preorder"
    : "in_stock";
}

function createItemFulfillmentDraft(order) {
  return getItems(order).map((item, index) =>
    getSavedItemFulfillmentStatus(order, item, index)
  );
}

function buildItemFulfillmentPayload(order, selections) {
  return getItems(order).map((item, index) => ({
    index,
    status: normalizeItemFulfillmentStatus(selections[index]),
  }));
}

function deriveFulfillmentType(itemFulfillment) {
  const statuses = new Set(
    itemFulfillment.map((item) => item.status)
  );

  if (statuses.size > 1) {
    return "mixed";
  }

  return statuses.has("preorder") ? "preorder" : "in_stock";
}

function getFulfillmentTypeLabel(type) {
  if (type === "preorder") {
    return "Preorder";
  }

  if (type === "mixed") {
    return "Mixed Order";
  }

  return "In Stock";
}

function normalizePurchasedShippingLabel(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const trackingNumber = String(
    source.trackingNumber || source.tracking_number || ""
  ).trim();
  const labelUrl = String(source.labelUrl || source.label_url || "").trim();

  if (!trackingNumber && !labelUrl) {
    return null;
  }

  return {
    ...source,
    orderId: String(source.orderId || source.order_id || ""),
    carrier: String(source.carrier || source.provider || ""),
    trackingNumber,
    trackingUrl: String(
      source.trackingUrl || source.tracking_url_provider || ""
    ).trim(),
    labelUrl,
  };
}

function getLatestShippingLabel(order) {
  const labels = Array.isArray(order?.shippingLabels)
    ? order.shippingLabels
    : [];

  for (let index = labels.length - 1; index >= 0; index -= 1) {
    const label = normalizePurchasedShippingLabel(labels[index]);

    const refundStatus = String(label?.refundStatus || "").toUpperCase();

    if (label && !refundStatus) {
      return label;
    }
  }

  return null;
}

function getItemDisplayName(item) {
  return [item?.name || item?.codeName || "Product", item?.strength || ""]
    .filter(Boolean)
    .join(" ");
}

function getShipments(order) {
  return Array.isArray(order?.shipments) ? order.shipments : [];
}

function formatTrackingStatus(value) {
  return String(value || "Unknown")
    .trim()
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getShippedQuantity(order, itemIndex) {
  return getShipments(order).reduce(
    (total, shipment) =>
      total +
      (Array.isArray(shipment?.items)
        ? shipment.items.reduce(
            (shipmentTotal, item) =>
              Number(item?.index) === itemIndex
                ? shipmentTotal + Math.max(0, Number(item?.quantity || 0))
                : shipmentTotal,
            0
          )
        : 0),
    0
  );
}

function getRemainingQuantity(order, itemIndex) {
  const ordered = Math.max(0, Number(getItems(order)[itemIndex]?.quantity || 0));
  return Math.max(0, ordered - getShippedQuantity(order, itemIndex));
}

function createShipmentQuantityDraft(order) {
  return getItems(order).map((item, index) => {
    const remaining = getRemainingQuantity(order, index);
    const fulfillmentStatus = getSavedItemFulfillmentStatus(
      order,
      item,
      index
    );

    return fulfillmentStatus === "in_stock" ? remaining : 0;
  });
}

function buildShipmentItemsPayload(order, quantities) {
  return getItems(order)
    .map((item, index) => ({
      index,
      quantity: Math.max(0, Math.floor(Number(quantities[index] || 0))),
      remaining: getRemainingQuantity(order, index),
      item,
    }))
    .filter((entry) => entry.quantity > 0)
    .map(({ index, quantity }) => ({ index, quantity }));
}

function getShipmentProgress(order) {
  const totalQuantity = getQuantity(order);
  const shippedQuantity = getItems(order).reduce(
    (total, _item, index) => total + getShippedQuantity(order, index),
    0
  );

  return {
    totalQuantity,
    shippedQuantity,
    remainingQuantity: Math.max(0, totalQuantity - shippedQuantity),
  };
}

function formatDate(value) {
  if (!value) {
    return "Unavailable";
  }

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
    throw new Error(
      "The protected admin service returned an invalid response."
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error || "The protected admin request could not be completed."
    );
  }

  return result;
}

function CustomerManager({
  orders = [],
  onNavigate = () => {},
}) {
  const [adminSecret, setAdminSecret] = useState(getStoredSecret);
  const [secretInput, setSecretInput] = useState("");
  const [records, setRecords] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [ordersReady, setOrdersReady] = useState(false);
  const [accountsReady, setAccountsReady] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(Boolean(adminSecret));
  const [accountsLoading, setAccountsLoading] = useState(
    Boolean(adminSecret)
  );
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
  const [invoiceMethod, setInvoiceMethod] = useState("Zelle");
  const [invoicePaymentLink, setInvoicePaymentLink] = useState("");
  const [invoiceDestination, setInvoiceDestination] = useState("");
  const [invoiceSubtotal, setInvoiceSubtotal] = useState("0.00");
  const [invoiceShipping, setInvoiceShipping] = useState("0.00");
  const [invoiceTax, setInvoiceTax] = useState("0.00");
  const [paymentAmount, setPaymentAmount] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState("Zelle");
  const [paymentReference, setPaymentReference] = useState("");
  const [itemFulfillment, setItemFulfillment] = useState([]);
  const [restockNote, setRestockNote] = useState("");
  const [shipmentCarrier, setShipmentCarrier] = useState("USPS");
  const [shipmentTrackingNumber, setShipmentTrackingNumber] = useState("");
  const [shipmentNote, setShipmentNote] = useState("");
  const [shipmentQuantities, setShipmentQuantities] = useState([]);
  const [parcelLength, setParcelLength] = useState("8");
  const [parcelWidth, setParcelWidth] = useState("6");
  const [parcelHeight, setParcelHeight] = useState("4");
  const [parcelWeight, setParcelWeight] = useState("8");
  const [labelRates, setLabelRates] = useState([]);
  const [labelShipmentId, setLabelShipmentId] = useState("");
  const [selectedLabelRateId, setSelectedLabelRateId] = useState("");
  const [purchasedLabel, setPurchasedLabel] = useState(null);
  const [labelBusy, setLabelBusy] = useState("");
  const [labelError, setLabelError] = useState("");
  const [workflowBusy, setWorkflowBusy] = useState("");
  const [busyId, setBusyId] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [controlEmail, setControlEmail] = useState("");
  const [controlAction, setControlAction] = useState("");
  const [controlReason, setControlReason] = useState("");
  const [controlBusy, setControlBusy] = useState(false);

  const localOrders = useMemo(() => sortOrders(orders), [orders]);
  const displayedOrders = ordersReady ? records : localOrders;

  const loadOrders = useCallback(
    async (secret = adminSecret) => {
      const cleaned = String(secret || "").trim();

      if (!cleaned) {
        return;
      }

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

      if (!cleaned) {
        return;
      }

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

      await Promise.allSettled([
        loadAccounts(secret),
        loadOrders(secret),
      ]);
    },
    [adminSecret, loadAccounts, loadOrders]
  );

  useEffect(() => {
    if (adminSecret) {
      refreshProtectedData(adminSecret);
    }
  }, [adminSecret, refreshProtectedData]);

  const accountOrderCounts = useMemo(() => {
    const counts = new Map();

    for (const order of displayedOrders) {
      const email = normalizeEmail(getCustomer(order).email);

      if (!email) {
        continue;
      }

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
        account.suspensionReason,
        account.lastSuspensionReason,
        account.suspendedAt,
        account.reactivatedAt,
        account.lastSessionRevokedAt,
        account.lastSessionRevocationReason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchText.includes(term);
      let matchesFilter = true;

      if (accountFilter === "active") {
        matchesFilter = account.status === "active";
      } else if (accountFilter === "suspended") {
        matchesFilter = account.status === "suspended";
      } else if (accountFilter === "temporary") {
        matchesFilter =
          account.status === "active" &&
          account.mustChangePassword === true;
      } else if (accountFilter === "ready") {
        matchesFilter =
          account.status === "active" &&
          account.mustChangePassword !== true;
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
      active: accounts.filter(
        (account) => account.status === "active"
      ).length,
      suspended: accounts.filter(
        (account) => account.status === "suspended"
      ).length,
      temporary: accounts.filter(
        (account) =>
          account.status === "active" &&
          account.mustChangePassword
      ).length,
      ready: accounts.filter(
        (account) =>
          account.status === "active" &&
          !account.mustChangePassword
      ).length,
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
    setControlEmail("");
    setControlAction("");
    setControlReason("");
    setControlBusy(false);
  }

  function beginEdit(order) {
    const orderId = getOrderId(order);
    const invoice = order.invoice && typeof order.invoice === "object"
      ? order.invoice
      : {};
    const payment = order.payment && typeof order.payment === "object"
      ? order.payment
      : {};
    const fulfillment = order.fulfillment && typeof order.fulfillment === "object"
      ? order.fulfillment
      : {};
    const defaultPaymentMethod =
      payment.paymentMethod ||
      invoice.paymentMethod ||
      order.preferredPaymentLabel ||
      order.paymentMethod ||
      "Zelle";

    setEditingId(orderId);
    setExpandedId(orderId);
    setDraftStatus(order.status || ORDER_STATUSES[0]);
    setDraftNotes(order.adminNotes || "");
    setInvoiceMethod(
      PAYMENT_METHODS.includes(invoice.paymentMethod)
        ? invoice.paymentMethod
        : PAYMENT_METHODS.includes(defaultPaymentMethod)
          ? defaultPaymentMethod
          : "Zelle"
    );
    setInvoicePaymentLink(invoice.paymentLink || "");
    setInvoiceDestination(invoice.paymentDestination || "");
    setInvoiceSubtotal(
      moneyInputFromCents(invoice.subtotalCents, getSubtotal(order))
    );
    setInvoiceShipping(moneyInputFromCents(invoice.shippingCents, 0));
    setInvoiceTax(moneyInputFromCents(invoice.taxCents, 0));
    setPaymentAmount(
      moneyInputFromCents(
        payment.amountCents,
        Number(invoice.totalCents || 0) / 100 || getSubtotal(order)
      )
    );
    setPaymentMethod(
      PAYMENT_METHODS.includes(defaultPaymentMethod)
        ? defaultPaymentMethod
        : "Zelle"
    );
    setPaymentReference(payment.referenceNumber || "");
    setItemFulfillment(createItemFulfillmentDraft(order));
    setRestockNote(
      fulfillment.timingNote ||
        (Array.isArray(fulfillment.items) ? "" : fulfillment.restockNote || "")
    );
    const latestShippingLabel = getLatestShippingLabel(order);
    setShipmentCarrier(
      SHIPPING_CARRIERS.includes(latestShippingLabel?.carrier)
        ? latestShippingLabel.carrier
        : "USPS"
    );
    setShipmentTrackingNumber(latestShippingLabel?.trackingNumber || "");
    setShipmentNote("");
    setShipmentQuantities(createShipmentQuantityDraft(order));
    setLabelRates([]);
    setLabelShipmentId("");
    setSelectedLabelRateId("");
    setPurchasedLabel(latestShippingLabel);
    loadShippingDefaults();
    setActionMessage("");
    setActionError("");
    void (async () => {
      const refreshedOrder = await refreshShippingRefundStatuses(order);
      await refreshShipmentTrackingStatuses(refreshedOrder || order);
    })();
  }

  async function saveOrder(order) {
    const orderId = getOrderId(order);

    if (!ordersReady) {
      setActionError(
        "Load Cloudflare orders before updating a record."
      );

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
          body: JSON.stringify({
            status: draftStatus,
            adminNotes: draftNotes,
          }),
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

  function replaceOrderRecord(updated) {
    const updatedId = getOrderId(updated);

    setRecords((current) =>
      sortOrders(
        current.map((item) =>
          getOrderId(item) === updatedId ? updated : item
        )
      )
    );
  }

  async function sendInvoice(order) {
    const orderId = getOrderId(order);
    const alreadySent = Boolean(
      order.invoice?.firstSentAt ||
      order.invoice?.sentAt ||
      order.invoice?.lastSentAt
    );

    if (!ordersReady) {
      setActionError("Load Cloudflare orders before sending an invoice.");
      return;
    }

    if (!invoicePaymentLink.trim() && !invoiceDestination.trim()) {
      setActionError(
        "Enter either a secure payment link or a payment destination before sending the invoice."
      );
      return;
    }

    if (
      alreadySent &&
      !window.confirm(
        `An invoice has already been sent for order ${orderId}. Send it again?`
      )
    ) {
      return;
    }

    let subtotalCents;
    let shippingCents;
    let taxCents;

    try {
      subtotalCents = moneyInputToCents(invoiceSubtotal, "invoice subtotal");
      shippingCents = moneyInputToCents(invoiceShipping, "shipping amount");
      taxCents = moneyInputToCents(invoiceTax, "tax amount");
    } catch (inputError) {
      setActionError(inputError.message);
      return;
    }

    setWorkflowBusy(`${orderId}:invoice`);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch("/api/admin/order-actions/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          orderId,
          paymentMethod: invoiceMethod,
          paymentLink: invoicePaymentLink.trim(),
          paymentDestination: invoiceDestination.trim(),
          subtotalCents,
          shippingCents,
          taxCents,
          confirmResend: alreadySent,
        }),
      });

      const result = await readJson(response);
      const updated = result.order || result.record;

      replaceOrderRecord(updated);
      setDraftStatus(updated.status || "Invoice Sent");
      setPaymentAmount(
        moneyInputFromCents(
          updated.invoice?.totalCents,
          getSubtotal(updated)
        )
      );
      setActionMessage(
        result.message || `Invoice for order ${orderId} was sent.`
      );
    } catch (requestError) {
      setActionError(
        requestError.message || "The invoice could not be sent."
      );
    } finally {
      setWorkflowBusy("");
    }
  }

  async function recordPayment(order) {
    const orderId = getOrderId(order);
    const alreadyRecorded = Boolean(order.payment?.receivedAt);

    if (!ordersReady) {
      setActionError("Load Cloudflare orders before recording payment.");
      return;
    }

    if (
      alreadyRecorded &&
      !window.confirm(
        `Payment has already been recorded for order ${orderId}. Send another confirmation?`
      )
    ) {
      return;
    }

    let amountCents;

    try {
      amountCents = moneyInputToCents(paymentAmount, "payment amount");
    } catch (inputError) {
      setActionError(inputError.message);
      return;
    }

    if (amountCents <= 0) {
      setActionError("The payment amount must be greater than zero.");
      return;
    }

    const fulfillmentItems = buildItemFulfillmentPayload(
      order,
      itemFulfillment
    );

    if (fulfillmentItems.length === 0) {
      setActionError(
        "This order does not contain any products to classify for fulfillment."
      );
      return;
    }

    const fulfillmentType = deriveFulfillmentType(fulfillmentItems);

    setWorkflowBusy(`${orderId}:payment`);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        "/api/admin/order-actions/payment-received",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${adminSecret}`,
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            orderId,
            amountCents,
            paymentMethod,
            referenceNumber: paymentReference.trim(),
            fulfillmentType,
            itemFulfillment: fulfillmentItems,
            restockNote:
              fulfillmentType === "in_stock" ? "" : restockNote.trim(),
            confirmResend: alreadyRecorded,
          }),
        }
      );

      const result = await readJson(response);
      const updated = result.order || result.record;

      replaceOrderRecord(updated);
      setDraftStatus(updated.status || "Paid");
      setActionMessage(
        result.message || `Payment for order ${orderId} was recorded.`
      );
    } catch (requestError) {
      setActionError(
        requestError.message || "The payment could not be recorded."
      );
    } finally {
      setWorkflowBusy("");
    }
  }


  async function loadShippingDefaults() {
    if (!adminSecret) return;

    try {
      const response = await fetch("/api/admin/shipping/settings", {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = await readJson(response);
      const settings = result.settings || {};
      setParcelLength(String(settings.defaultLength || 8));
      setParcelWidth(String(settings.defaultWidth || 6));
      setParcelHeight(String(settings.defaultHeight || 4));
      setParcelWeight(String(settings.defaultWeight || 8));
    } catch {
      // Shipping Center will show any missing setup when rates are requested.
    }
  }

  async function getShippingLabelRates(order) {
    const orderId = getOrderId(order);
    const shipmentItems = buildShipmentItemsPayload(order, shipmentQuantities);

    if (!shipmentItems.length) {
      setActionError("Choose the products and quantities in this package before requesting rates.");
      return;
    }

    setLabelBusy("rates");
    setLabelError("");
    setActionError("");
    setActionMessage("");
    setPurchasedLabel(null);

    try {
      const response = await fetch("/api/admin/shipping/rates", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          orderId,
          parcel: {
            length: Number(parcelLength),
            width: Number(parcelWidth),
            height: Number(parcelHeight),
            weight: Number(parcelWeight),
          },
        }),
      });
      const result = await readJson(response);
      const rates = Array.isArray(result.rates) ? result.rates : [];
      setLabelRates(rates);
      setLabelShipmentId(result.shipmentId || "");
      setSelectedLabelRateId(rates[0]?.id || "");
      setActionMessage(result.message || "Shipping rates loaded.");
    } catch (requestError) {
      setLabelRates([]);
      setLabelShipmentId("");
      setSelectedLabelRateId("");
      const message = requestError.message || "Shipping rates could not be loaded.";
      setLabelError(message);
      setActionError(message);
    } finally {
      setLabelBusy("");
    }
  }

  async function purchaseShippingLabel(order) {
    const orderId = getOrderId(order);

    if (!labelShipmentId || !selectedLabelRateId) {
      setActionError("Choose a shipping rate before purchasing a label.");
      return;
    }

    const selectedRate = labelRates.find(
      (rate) => rate.id === selectedLabelRateId
    );
    const rateAmount = Number(selectedRate?.rate || 0).toLocaleString(
      "en-US",
      {
        style: "currency",
        currency: selectedRate?.currency || "USD",
      }
    );
    const confirmed = window.confirm(
      `Purchase ${selectedRate?.carrier || "shipping"} ${selectedRate?.service || "label"} for ${rateAmount}?`
    );

    if (!confirmed) {
      return;
    }

    setLabelBusy("buy");
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch("/api/admin/shipping/buy", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          orderId,
          shipmentId: labelShipmentId,
          rateId: selectedLabelRateId,
        }),
      });
      const result = await readJson(response);
      const returnedLabel = result.label || {};
      const savedLabel = getLatestShippingLabel(result.order) || {};
      const label = normalizePurchasedShippingLabel({
        ...savedLabel,
        ...returnedLabel,
        trackingNumber:
          returnedLabel.trackingNumber ||
          returnedLabel.tracking_number ||
          savedLabel.trackingNumber ||
          savedLabel.tracking_number ||
          "",
        labelUrl:
          returnedLabel.labelUrl ||
          returnedLabel.label_url ||
          savedLabel.labelUrl ||
          savedLabel.label_url ||
          "",
      });

      if (!label?.trackingNumber) {
        throw new Error(
          "Shippo created the label, but Customer Manager could not read its tracking number."
        );
      }

      setPurchasedLabel(label);
      setShipmentCarrier(
        SHIPPING_CARRIERS.includes(label.carrier) ? label.carrier : "Other"
      );
      setShipmentTrackingNumber(label.trackingNumber);
      setLabelRates([]);
      setLabelShipmentId("");
      setSelectedLabelRateId("");
      if (result.order) replaceOrderRecord(result.order);
      setActionMessage(
        result.message || "Shipping label purchased and tracking filled in."
      );
    } catch (requestError) {
      setActionError(requestError.message || "The shipping label could not be purchased.");
    } finally {
      setLabelBusy("");
    }
  }

  async function refreshShippingRefundStatuses(order) {
    const orderId = getOrderId(order);
    const hasPendingRefund = (Array.isArray(order?.shippingLabels)
      ? order.shippingLabels
      : []
    ).some((label) =>
      ["QUEUED", "PENDING"].includes(
        String(label?.refundStatus || "").toUpperCase()
      )
    );

    if (!hasPendingRefund) {
      return order;
    }

    try {
      const response = await fetch("/api/admin/shipping/refund-status", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ orderId }),
      });
      const result = await readJson(response);

      if (result.order) {
        replaceOrderRecord(result.order);
      }

      if (Number(result.changedCount || 0) > 0) {
        setActionMessage(
          result.message || "A shipping label refund status was updated."
        );
      }

      return result.order || order;
    } catch (requestError) {
      setActionError(
        requestError.message ||
          "The shipping label refund status could not be refreshed."
      );
      return order;
    }
  }

  async function refreshShipmentTrackingStatuses(order) {
    const orderId = getOrderId(order);
    const hasTrackableShipment = getShipments(order).some((shipment) => {
      const carrier = String(shipment?.carrier || "")
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
      const status = String(shipment?.trackingStatus || "").toUpperCase();

      return (
        ["usps", "ups", "fedex"].includes(carrier) &&
        String(shipment?.trackingNumber || "").trim() &&
        !["DELIVERED", "RETURNED"].includes(status)
      );
    });

    if (!hasTrackableShipment) {
      return order;
    }

    try {
      const response = await fetch("/api/admin/shipping/tracking-status", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ orderId }),
      });
      const result = await readJson(response);

      if (result.order) {
        replaceOrderRecord(result.order);
      }

      if (Number(result.changedCount || 0) > 0) {
        setActionMessage(
          result.message || "A shipment tracking status was updated."
        );
      }

      return result.order || order;
    } catch (requestError) {
      setActionError(
        requestError.message ||
          "The shipment tracking status could not be refreshed."
      );
      return order;
    }
  }

  async function refundShippingLabel(order, label) {
    const orderId = getOrderId(order);
    const labelId = String(label?.labelId || label?.transactionId || "").trim();
    const refundStatus = String(label?.refundStatus || "").toUpperCase();

    if (!labelId) {
      setActionError("This shipping label is missing its Shippo transaction ID.");
      return;
    }

    if (["QUEUED", "PENDING", "SUCCESS"].includes(refundStatus)) {
      setActionError(`A refund has already been requested for this label (${refundStatus}).`);
      return;
    }

    const confirmed = window.confirm(
      `Request a refund for ${label.carrier || "this"} ${label.service || "shipping"} label ${
        label.trackingNumber || labelId
      }? The label must not be used or scanned.`
    );

    if (!confirmed) {
      return;
    }

    setLabelBusy(`refund:${labelId}`);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch("/api/admin/shipping/refund", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ orderId, labelId }),
      });
      const result = await readJson(response);

      if (result.order) {
        replaceOrderRecord(result.order);
      }

      const returnedRefundStatus = String(result.label?.refundStatus || "").toUpperCase();

      if (returnedRefundStatus === "ERROR") {
        setActionError(result.message || "Shippo rejected the shipping label refund.");
      } else {
        if (purchasedLabel?.labelId === labelId) {
          setPurchasedLabel(null);
        }

        if (shipmentTrackingNumber === label.trackingNumber) {
          setShipmentTrackingNumber("");
        }

        setActionMessage(
          result.message || "The shipping label refund request was submitted."
        );
      }
    } catch (requestError) {
      setActionError(
        requestError.message || "The shipping label refund could not be requested."
      );
    } finally {
      setLabelBusy("");
    }
  }

  async function createShipment(order) {
    const orderId = getOrderId(order);

    if (!ordersReady) {
      setActionError("Load Cloudflare orders before creating a shipment.");
      return;
    }

    if (!order.payment?.receivedAt) {
      setActionError("Record the customer's payment before creating a shipment.");
      return;
    }

    const savedShippingLabel = getLatestShippingLabel(order);
    const activePurchasedLabel =
      purchasedLabel?.orderId === orderId ? purchasedLabel : null;
    const trackingNumber = String(
      shipmentTrackingNumber ||
        activePurchasedLabel?.trackingNumber ||
        savedShippingLabel?.trackingNumber ||
        ""
    ).trim();

    if (!trackingNumber) {
      setActionError("Enter the shipment tracking number.");
      return;
    }

    const shipmentItems = buildShipmentItemsPayload(order, shipmentQuantities);

    if (shipmentItems.length === 0) {
      setActionError("Choose at least one product quantity for this shipment.");
      return;
    }

    for (const shipmentItem of shipmentItems) {
      const remaining = getRemainingQuantity(order, shipmentItem.index);

      if (shipmentItem.quantity > remaining) {
        setActionError(
          `The shipment quantity for ${getItemDisplayName(
            getItems(order)[shipmentItem.index]
          )} is greater than the remaining quantity.`
        );
        return;
      }
    }

    setWorkflowBusy(`${orderId}:shipment`);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        "/api/admin/order-actions/shipment-sent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${adminSecret}`,
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            orderId,
            carrier: shipmentCarrier,
            trackingNumber,
            note: shipmentNote.trim(),
            shipmentItems,
          }),
        }
      );

      const result = await readJson(response);
      const updated = result.order || result.record;

      replaceOrderRecord(updated);
      setDraftStatus(updated.status || "Partially Shipped");
      setShipmentTrackingNumber("");
      setShipmentNote("");
      setShipmentQuantities(createShipmentQuantityDraft(updated));
      setLabelRates([]);
      setLabelShipmentId("");
      setSelectedLabelRateId("");
      setPurchasedLabel(null);
      setActionMessage(
        result.message || `Shipment for order ${orderId} was recorded.`
      );
    } catch (requestError) {
      setActionError(
        requestError.message || "The shipment could not be recorded."
      );
    } finally {
      setWorkflowBusy("");
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

      if (expandedId === orderId) {
        setExpandedId("");
      }

      if (editingId === orderId) {
        setEditingId("");
      }

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
      document
        .getElementById("password-reset-panel")
        ?.scrollIntoView({
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
      const response = await fetch(
        "/api/admin/accounts/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${adminSecret}`,
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            email,
          }),
        }
      );

      const result = await readJson(response);

      setResetResult(result);
      setResetEmail(result.email || email);

      if (result.account) {
        replaceAccountSummary(result.account);
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

  function replaceAccountSummary(account) {
    if (!account || !validEmail(account.email)) {
      return;
    }

    setAccounts((current) =>
      sortAccounts([
        ...current.filter(
          (item) =>
            normalizeEmail(item.email) !==
            normalizeEmail(account.email)
        ),
        account,
      ])
    );
  }

  function openAccountControl(account, action) {
    const email = normalizeEmail(account?.email);

    if (!validEmail(email)) {
      setActionError("A valid customer account email is required.");
      return;
    }

    setControlEmail(email);
    setControlAction(action);
    setControlReason(
      action === "suspend"
        ? account?.suspensionReason || ""
        : ""
    );
    setResetResult(null);
    setCopyMessage("");
    setActionError("");
    setActionMessage("");
  }

  function closeAccountControl() {
    if (controlBusy) {
      return;
    }

    setControlEmail("");
    setControlAction("");
    setControlReason("");
  }

  async function submitAccountControl(event) {
    event.preventDefault();

    const email = normalizeEmail(controlEmail);
    const action = String(controlAction || "");
    const reason = String(controlReason || "").trim();

    if (!validEmail(email)) {
      setActionError("A valid customer account email is required.");
      return;
    }

    if (
      ![
        "suspend",
        "reactivate",
        "revoke-sessions",
      ].includes(action)
    ) {
      setActionError("Choose a valid account action.");
      return;
    }

    if (action === "suspend" && !reason) {
      setActionError(
        "Enter a private reason before suspending the account."
      );

      return;
    }

    const confirmation =
      action === "suspend"
        ? `Suspend ${email}? The customer will be logged out everywhere and blocked from login, checkout, and account orders.`
        : action === "reactivate"
          ? `Reactivate ${email}? Previous sessions will stay invalid, and the customer will need to log in again.`
          : `Revoke every active session for ${email}? The password will not be changed.`;

    if (!window.confirm(confirmation)) {
      return;
    }

    setControlBusy(true);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        "/api/admin/accounts/control",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${adminSecret}`,
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            email,
            action,
            reason: reason.slice(0, 500),
          }),
        }
      );

      const result = await readJson(response);

      if (result.account) {
        replaceAccountSummary(result.account);
      }

      setActionMessage(
        result.message ||
          "The customer account was updated successfully."
      );

      setControlEmail("");
      setControlAction("");
      setControlReason("");
    } catch (requestError) {
      setActionError(
        requestError.message ||
          "The customer account could not be updated."
      );
    } finally {
      setControlBusy(false);
    }
  }

  if (!adminSecret) {
    return (
      <>
        <style>{css}</style>

        <main className="cm-page">
          <section className="cm-login">
            <p className="eyebrow">
              CUSTOMER MANAGER
            </p>

            <h1>
              Administrator Authorization
            </h1>

            <p>
              Enter your administrator secret to open protected
              customer, account-recovery, and order tools.
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
                <div
                  className="cm-error"
                  role="alert"
                >
                  {actionError}
                </div>
              )}

              <button
                type="submit"
                className="primary-btn"
              >
                Open Customer Manager
              </button>
            </form>

            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                onNavigate("missionControl")
              }
            >
              Back To Mission Control
            </button>
          </section>
        </main>
      </>
    );
  }

  const pageLoading =
    ordersLoading ||
    accountsLoading;

  return (
    <>
      <style>{css}</style>

      <main className="cm-page">
        <section className="cm-wrap">
          <div className="cm-top">
            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                onNavigate("missionControl")
              }
            >
              ← Mission Control
            </button>

            <div>
              <span
                className={
                  accountsReady && ordersReady
                    ? "cm-live"
                    : "cm-pill"
                }
              >
                {accountsReady && ordersReady
                  ? "Cloudflare Connected"
                  : "Partial / Local Fallback"}
              </span>

              <button
                type="button"
                className="cm-link"
                onClick={logoutAdmin}
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
              Accounts, Orders & Recovery
            </h1>

            <p>
              Review every registered account, including customers
              without orders, manage protected order records, and
              issue forced-change temporary passwords.
            </p>

            <button
              type="button"
              className="primary-btn"
              disabled={pageLoading}
              onClick={() =>
                refreshProtectedData()
              }
            >
              {pageLoading
                ? "Refreshing..."
                : "Refresh Protected Data"}
            </button>
          </header>

          {accountLoadError && (
            <div
              className="cm-error"
              role="alert"
            >
              <strong>
                Account directory could not be loaded.
              </strong>

              <p>{accountLoadError}</p>
            </div>
          )}

          {orderLoadError && (
            <div
              className="cm-error"
              role="alert"
            >
              <strong>
                Cloudflare orders could not be loaded.
              </strong>

              <p>{orderLoadError}</p>
            </div>
          )}

          {actionError && (
            <div
              className="cm-error"
              role="alert"
            >
              {actionError}
            </div>
          )}

          {actionMessage && (
            <div
              className="cm-success"
              aria-live="polite"
            >
              {actionMessage}
            </div>
          )}

          <section className="cm-stats cm-account-stats">
            <Stat
              label="Registered Accounts"
              value={
                accountsLoading
                  ? "—"
                  : accountTotals.total
              }
              detail="Cloudflare customer records"
            />

            <Stat
              label="Active Accounts"
              value={
                accountsLoading
                  ? "—"
                  : accountTotals.active
              }
              detail="Currently enabled"
            />

            <Stat
              label="Suspended Accounts"
              value={
                accountsLoading
                  ? "—"
                  : accountTotals.suspended
              }
              detail="Login and ordering blocked"
            />

            <Stat
              label="Temporary Password"
              value={
                accountsLoading
                  ? "—"
                  : accountTotals.temporary
              }
              detail="Must change after login"
            />

            <Stat
              label="Permanent Password"
              value={
                accountsLoading
                  ? "—"
                  : accountTotals.ready
              }
              detail="Normal account access"
            />
          </section>

          <section className="cm-panel cm-directory">
            <div className="cm-heading">
              <div>
                <p className="eyebrow">
                  CUSTOMER ACCOUNT DIRECTORY
                </p>

                <h2>
                  Registered Accounts
                </h2>
              </div>

              <span className="cm-count-label">
                Showing{" "}
                <strong>
                  {filteredAccounts.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {accounts.length}
                </strong>
              </span>
            </div>

            <div className="cm-filters">
              <label>
                <span>
                  Search Accounts
                </span>

                <input
                  type="search"
                  value={accountSearch}
                  onChange={(event) =>
                    setAccountSearch(
                      event.target.value
                    )
                  }
                  placeholder="Name, email, account ID, or date"
                />
              </label>

              <label>
                <span>
                  Account Filter
                </span>

                <select
                  value={accountFilter}
                  onChange={(event) =>
                    setAccountFilter(
                      event.target.value
                    )
                  }
                >
                  {ACCOUNT_FILTERS.map(
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
            </div>

            {accountsLoading ? (
              <div className="cm-empty">
                Loading registered customer accounts...
              </div>
            ) : !accountsReady ? (
              <div className="cm-empty">
                The protected account directory is not connected.
                Check the error above, then refresh protected data.
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="cm-empty">
                No customer accounts match the current search and
                filter.
              </div>
            ) : (
              <div className="cm-account-grid">
                {filteredAccounts.map((account) => {
                  const email =
                    normalizeEmail(account.email);

                  const orderCount =
                    accountOrderCounts.get(email) ||
                    0;

                  const requiresChange =
                    Boolean(
                      account.mustChangePassword
                    );

                  const isSuspended =
                    account.status ===
                    "suspended";

                  const controlOpen =
                    controlEmail === email;

                  return (
                    <article
                      key={account.id || email}
                      className="cm-account-card"
                    >
                      <div className="cm-account-card-top">
                        <div>
                          <span>
                            Customer Account
                          </span>

                          <h3>
                            {getAccountName(account)}
                          </h3>

                          <p>{email}</p>
                        </div>

                        <span
                          className={
                            isSuspended
                              ? "cm-account-status cm-account-status-suspended"
                              : requiresChange
                                ? "cm-account-status cm-account-status-warning"
                                : "cm-account-status cm-account-status-ready"
                          }
                        >
                          {isSuspended
                            ? "Account Suspended"
                            : requiresChange
                              ? "Temporary Password"
                              : "Password Ready"}
                        </span>
                      </div>

                      <div className="cm-account-info-grid">
                        <AccountInfo
                          label="Account Status"
                          value={
                            account.status ||
                            "active"
                          }
                        />

                        <AccountInfo
                          label="Linked Orders"
                          value={orderCount}
                        />

                        <AccountInfo
                          label="Created"
                          value={formatDate(
                            account.createdAt
                          )}
                        />

                        <AccountInfo
                          label="Last Updated"
                          value={formatDate(
                            account.updatedAt
                          )}
                        />

                        <AccountInfo
                          label="Research Agreement"
                          value={
                            account.researchAgreementAcceptedAt
                              ? formatDate(
                                  account.researchAgreementAcceptedAt
                                )
                              : "Not recorded"
                          }
                        />

                        <AccountInfo
                          label="Password Changed"
                          value={formatDate(
                            account.passwordChangedAt
                          )}
                        />

                        <AccountInfo
                          label="Status Changed"
                          value={formatDate(
                            account.accountStatusChangedAt
                          )}
                        />

                        <AccountInfo
                          label="Sessions Revoked"
                          value={formatDate(
                            account.lastSessionRevokedAt
                          )}
                        />
                      </div>

                      {isSuspended && (
                        <div className="cm-account-suspension-state">
                          <strong>
                            Account access is suspended
                          </strong>

                          <p>
                            Suspended{" "}
                            {formatDate(
                              account.suspendedAt
                            )}
                            . The customer cannot log in,
                            view account orders, or submit
                            checkout requests.
                          </p>

                          <p>
                            <strong>
                              Private reason:
                            </strong>{" "}
                            {account.suspensionReason ||
                              "No reason recorded."}
                          </p>
                        </div>
                      )}

                      {account.lastSessionRevokedAt && (
                        <div className="cm-account-session-state">
                          <strong>
                            Most recent session revocation
                          </strong>

                          <p>
                            {formatDate(
                              account.lastSessionRevokedAt
                            )}{" "}
                            —{" "}
                            {account.lastSessionRevocationReason ||
                              "Sessions revoked by administrator."}
                          </p>
                        </div>
                      )}

                      {!isSuspended &&
                        requiresChange && (
                          <div className="cm-account-reset-state">
                            <strong>
                              Password change required
                            </strong>

                            <p>
                              Temporary password issued{" "}
                              {formatDate(
                                account.temporaryPasswordIssuedAt
                              )}
                              . Existing sessions were
                              invalidated.
                            </p>
                          </div>
                        )}

                      <div className="cm-account-actions">
                        <button
                          type="button"
                          className="cm-reset-btn"
                          disabled={
                            isSuspended ||
                            controlBusy
                          }
                          onClick={() =>
                            chooseResetEmail(email)
                          }
                        >
                          {requiresChange
                            ? "Issue New Temporary Password"
                            : "Reset Password"}
                        </button>

                        <button
                          type="button"
                          className="secondary-btn"
                          disabled={controlBusy}
                          onClick={() =>
                            openAccountControl(
                              account,
                              "revoke-sessions"
                            )
                          }
                        >
                          Revoke Sessions
                        </button>

                        <button
                          type="button"
                          className={
                            isSuspended
                              ? "primary-btn"
                              : "cm-danger-btn"
                          }
                          disabled={controlBusy}
                          onClick={() =>
                            openAccountControl(
                              account,
                              isSuspended
                                ? "reactivate"
                                : "suspend"
                            )
                          }
                        >
                          {isSuspended
                            ? "Reactivate Account"
                            : "Suspend Account"}
                        </button>

                        {orderCount > 0 && (
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => {
                              setOrderSearch(email);

                              document
                                .getElementById(
                                  "protected-orders-panel"
                                )
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

                      {controlOpen && (
                        <form
                          className="cm-control-editor"
                          onSubmit={
                            submitAccountControl
                          }
                        >
                          <div>
                            <p className="eyebrow">
                              ACCOUNT CONTROL
                            </p>

                            <h4>
                              {controlAction ===
                              "suspend"
                                ? "Suspend Customer Account"
                                : controlAction ===
                                    "reactivate"
                                  ? "Reactivate Customer Account"
                                  : "Revoke Customer Sessions"}
                            </h4>

                            <p>
                              {controlAction ===
                              "suspend"
                                ? "Suspension immediately invalidates every session and blocks login, account orders, and checkout."
                                : controlAction ===
                                    "reactivate"
                                  ? "Reactivation restores login access. Previous sessions remain invalid, so the customer must log in again."
                                  : "Session revocation logs the customer out everywhere without changing the password or account status."}
                            </p>
                          </div>

                          {(controlAction ===
                            "suspend" ||
                            controlAction ===
                              "revoke-sessions") && (
                            <label>
                              <span>
                                {controlAction ===
                                "suspend"
                                  ? "Private Suspension Reason"
                                  : "Private Revocation Reason (Optional)"}
                              </span>

                              <textarea
                                rows="3"
                                maxLength="500"
                                value={controlReason}
                                disabled={
                                  controlBusy
                                }
                                onChange={(event) =>
                                  setControlReason(
                                    event.target
                                      .value
                                  )
                                }
                                placeholder={
                                  controlAction ===
                                  "suspend"
                                    ? "Required private reason for suspending this account"
                                    : "Optional private reason for revoking sessions"
                                }
                              />

                              <small>
                                {controlReason.length}
                                /500 characters
                              </small>
                            </label>
                          )}

                          <div className="cm-control-actions">
                            <button
                              type="submit"
                              className={
                                controlAction ===
                                "suspend"
                                  ? "cm-danger-btn"
                                  : "primary-btn"
                              }
                              disabled={
                                controlBusy ||
                                (controlAction ===
                                  "suspend" &&
                                  !controlReason.trim())
                              }
                            >
                              {controlBusy
                                ? "Saving..."
                                : controlAction ===
                                    "suspend"
                                  ? "Confirm Suspension"
                                  : controlAction ===
                                      "reactivate"
                                    ? "Confirm Reactivation"
                                    : "Revoke All Sessions"}
                            </button>

                            <button
                              type="button"
                              className="secondary-btn"
                              disabled={controlBusy}
                              onClick={
                                closeAccountControl
                              }
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
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
              This replaces the old password, invalidates existing
              sessions, and forces the customer to choose a permanent
              password after login.
            </p>

            <form onSubmit={resetPassword}>
              <label>
                <span>
                  Customer Account Email
                </span>

                <input
                  type="email"
                  value={resetEmail}
                  onChange={(event) => {
                    setResetEmail(
                      event.target.value.slice(
                        0,
                        254
                      )
                    );

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
                disabled={
                  resetting ||
                  !validEmail(resetEmail)
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
                  {resetResult.temporaryPassword}
                </code>

                <small>
                  Issued{" "}
                  {formatDate(
                    resetResult.issuedAt
                  )}
                  . Copy it before clearing this
                  panel.
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

                {copyMessage && (
                  <p>
                    {copyMessage}
                  </p>
                )}
              </div>
            )}

            <div className="cm-warning">
              Verify the customer through your support process before
              issuing a reset. Suspended accounts must be reactivated
              before a password reset can be issued. Never place a
              temporary password in public messages or internal order
              notes.
            </div>
          </section>

          <section className="cm-stats cm-order-stats">
            <Stat
              label="Stored Orders"
              value={
                ordersLoading
                  ? "—"
                  : orderTotals.orders
              }
              detail={
                ordersReady
                  ? "Cloudflare KV records"
                  : "Local browser fallback"
              }
            />

            <Stat
              label="Total Items"
              value={
                ordersLoading
                  ? "—"
                  : orderTotals.items
              }
              detail="Units requested"
            />

            <Stat
              label="Requested Value"
              value={
                ordersLoading
                  ? "—"
                  : formatMoney(
                      orderTotals.value
                    )
              }
              detail="Product subtotal only"
            />
          </section>

          <section
            id="protected-orders-panel"
            className="cm-panel"
          >
            <div className="cm-heading">
              <div>
                <p className="eyebrow">
                  PROTECTED ORDERS
                </p>

                <h2>
                  Order Records
                </h2>
              </div>

              <span className="cm-count-label">
                Showing{" "}
                <strong>
                  {filteredOrders.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {displayedOrders.length}
                </strong>
              </span>
            </div>

            <div className="cm-filters">
              <label>
                <span>
                  Search Orders
                </span>

                <input
                  type="search"
                  value={orderSearch}
                  onChange={(event) =>
                    setOrderSearch(
                      event.target.value
                    )
                  }
                  placeholder="Order, customer, email, product, address, or note"
                />
              </label>

              <label>
                <span>
                  Order Status
                </span>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                >
                  <option value="all">
                    All Statuses
                  </option>

                  {ORDER_STATUSES.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            {ordersLoading ? (
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
                {filteredOrders.map((order) => {
                  const id =
                    getOrderId(order);

                  const customer =
                    getCustomer(order);

                  const items =
                    getItems(order);

                  const expanded =
                    expandedId === id;

                  const editing =
                    editingId === id;

                  const recordBusy =
                    busyId === id;

                  const invoiceBusy =
                    workflowBusy === `${id}:invoice`;

                  const paymentBusy =
                    workflowBusy === `${id}:payment`;

                  const shipmentBusy =
                    workflowBusy === `${id}:shipment`;

                  const busy =
                    recordBusy || invoiceBusy || paymentBusy || shipmentBusy;

                  const fulfillmentDraft =
                    buildItemFulfillmentPayload(
                      order,
                      itemFulfillment
                    );

                  const selectedFulfillmentType =
                    deriveFulfillmentType(
                      fulfillmentDraft
                    );

                  const inStockItems =
                    items.filter(
                      (_item, index) =>
                        fulfillmentDraft[index]?.status ===
                        "in_stock"
                    );

                  const preorderItems =
                    items.filter(
                      (_item, index) =>
                        fulfillmentDraft[index]?.status ===
                        "preorder"
                    );

                  const shipments = getShipments(order);
                  const shipmentProgress = getShipmentProgress(order);
                  const shipmentItems = buildShipmentItemsPayload(
                    order,
                    shipmentQuantities
                  );
                  const savedShippingLabel = getLatestShippingLabel(order);
                  const activePurchasedLabel =
                    purchasedLabel?.orderId === id ? purchasedLabel : null;
                  const activeShippingLabel =
                    activePurchasedLabel || savedShippingLabel;
                  const shippingLabelHistory = (Array.isArray(order.shippingLabels)
                    ? order.shippingLabels
                    : []
                  )
                    .map(normalizePurchasedShippingLabel)
                    .filter(Boolean)
                    .reverse();

                  return (
                    <article
                      key={id}
                      className="cm-order"
                    >
                      <div className="cm-summary">
                        <div>
                          <span>
                            Order #{id}
                          </span>

                          <h3>
                            {getCustomerName(order)}
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
                            {getQuantity(order)}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Subtotal
                          </span>

                          <strong>
                            {formatMoney(
                              getSubtotal(order)
                            )}
                          </strong>

                          <span>
                            Invoice
                          </span>

                          <strong>
                            {order.invoice?.lastSentAt ||
                            order.invoice?.sentAt ||
                            order.invoice?.firstSentAt
                              ? "Sent"
                              : "Not Sent"}
                          </strong>

                          <span>
                            Fulfillment
                          </span>

                          <strong>
                            {getFulfillmentLabel(order)}
                          </strong>
                        </div>
                      </div>

                      <div className="cm-actions">
                        <button
                          type="button"
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
                          type="button"
                          className="secondary-btn"
                          disabled={
                            !ordersReady ||
                            busy
                          }
                          onClick={() =>
                            beginEdit(order)
                          }
                        >
                          {order.invoice?.lastSentAt ||
                          order.invoice?.sentAt ||
                          order.invoice?.firstSentAt
                            ? "Invoice / Payment"
                            : "Send Invoice"}
                        </button>

                        <button
                          type="button"
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
                          type="button"
                          className="cm-delete"
                          disabled={
                            !ordersReady ||
                            busy
                          }
                          onClick={() =>
                            deleteOrder(order)
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
                              {getCustomerName(order)}
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
                                .filter(Boolean)
                                .join(" ") ||
                                "Address unavailable"}
                            </p>
                          </div>

                          <div>
                            <h4>
                              Products
                            </h4>

                            {items.length > 0 ? (
                              items.map(
                                (item, index) => (
                                  <p
                                    key={`${
                                      item.codeName ||
                                      item.name ||
                                      "product"
                                    }-${
                                      item.strength ||
                                      "strength"
                                    }-${index}`}
                                  >
                                    {item.name ||
                                      item.codeName ||
                                      "Product"}{" "}
                                    {item.strength ||
                                      ""}{" "}
                                    ×{" "}
                                    {item.quantity}
                                    {order.fulfillment?.items?.length ? (
                                      <>
                                        {" "}—{" "}
                                        <strong>
                                          {getSavedItemFulfillmentStatus(
                                            order,
                                            item,
                                            index
                                          ) === "preorder"
                                            ? "Preorder"
                                            : "In Stock"}
                                        </strong>
                                      </>
                                    ) : null}
                                  </p>
                                )
                              )
                            ) : (
                              <p>
                                No products saved.
                              </p>
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

                          <div>
                            <h4>
                              Invoice & Payment
                            </h4>

                            <p>
                              <strong>Invoice:</strong>{" "}
                              {getInvoiceLabel(order)}
                            </p>

                            {order.invoice?.totalCents !== undefined && (
                              <p>
                                <strong>Invoice total:</strong>{" "}
                                {formatCents(order.invoice.totalCents)}
                              </p>
                            )}

                            <p>
                              <strong>Payment:</strong>{" "}
                              {getPaymentLabel(order)}
                            </p>

                            {order.payment?.amountCents !== undefined && (
                              <p>
                                <strong>Amount received:</strong>{" "}
                                {formatCents(order.payment.amountCents)}
                              </p>
                            )}

                            <p>
                              <strong>Fulfillment:</strong>{" "}
                              {getFulfillmentLabel(order)}
                            </p>

                            {order.fulfillment?.restockNote && (
                              <p>
                                <strong>Restock note:</strong>{" "}
                                {order.fulfillment.restockNote}
                              </p>
                            )}

                            <p>
                              <strong>Shipping:</strong>{" "}
                              {shipmentProgress.shippedQuantity} of{" "}
                              {shipmentProgress.totalQuantity} item(s) shipped
                            </p>

                            {shipments.length > 0 && (
                              <p>
                                <strong>Latest tracking:</strong>{" "}
                                {shipments[shipments.length - 1].carrier}{" "}
                                {shipments[shipments.length - 1].trackingNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {editing && (
                        <div className="cm-editor">
                          <label>
                            <span>
                              Status
                            </span>

                            <select
                              value={draftStatus}
                              disabled={busy}
                              onChange={(event) =>
                                setDraftStatus(
                                  event.target
                                    .value
                                )
                              }
                            >
                              {ORDER_STATUSES.map(
                                (status) => (
                                  <option
                                    key={status}
                                    value={status}
                                  >
                                    {status}
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          <label>
                            <span>
                              Private Admin Notes
                            </span>

                            <textarea
                              rows="4"
                              maxLength="2000"
                              value={draftNotes}
                              disabled={busy}
                              onChange={(event) =>
                                setDraftNotes(
                                  event.target
                                    .value
                                )
                              }
                              placeholder="Private admin notes"
                            />
                          </label>

                          <div>
                            <button
                              type="button"
                              className="primary-btn"
                              disabled={busy}
                              onClick={() =>
                                saveOrder(order)
                              }
                            >
                              {recordBusy
                                ? "Saving..."
                                : "Save Status & Notes"}
                            </button>

                            <button
                              type="button"
                              className="secondary-btn"
                              disabled={busy}
                              onClick={() =>
                                setEditingId("")
                              }
                            >
                              Close Editor
                            </button>
                          </div>

                          <section className="cm-workflow-grid">
                            <div className="cm-workflow-card">
                              <div className="cm-workflow-heading">
                                <div>
                                  <span className="cm-workflow-step">STEP 1</span>
                                  <h4>Send Customer Invoice</h4>
                                </div>

                                <span className="cm-workflow-state">
                                  {order.invoice?.lastSentAt ||
                                  order.invoice?.sentAt ||
                                  order.invoice?.firstSentAt
                                    ? "Invoice Sent"
                                    : "Not Sent"}
                                </span>
                              </div>

                              <label>
                                <span>Payment Method</span>
                                <select
                                  value={invoiceMethod}
                                  disabled={busy}
                                  onChange={(event) =>
                                    setInvoiceMethod(event.target.value)
                                  }
                                >
                                  {PAYMENT_METHODS.map((method) => (
                                    <option key={method} value={method}>
                                      {method}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label>
                                <span>Secure Payment Link</span>
                                <input
                                  type="url"
                                  value={invoicePaymentLink}
                                  disabled={busy}
                                  onChange={(event) =>
                                    setInvoicePaymentLink(event.target.value)
                                  }
                                  placeholder="https://..."
                                />
                                <small>
                                  Enter a link, a destination below, or both.
                                </small>
                              </label>

                              <label>
                                <span>Payment Destination</span>
                                <input
                                  type="text"
                                  maxLength="300"
                                  value={invoiceDestination}
                                  disabled={busy}
                                  onChange={(event) =>
                                    setInvoiceDestination(event.target.value)
                                  }
                                  placeholder="Username, cashtag, phone, or email"
                                />
                              </label>

                              <div className="cm-money-grid">
                                <label>
                                  <span>Subtotal</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={invoiceSubtotal}
                                    disabled={busy}
                                    onChange={(event) =>
                                      setInvoiceSubtotal(event.target.value)
                                    }
                                  />
                                </label>

                                <label>
                                  <span>Shipping</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={invoiceShipping}
                                    disabled={busy}
                                    onChange={(event) =>
                                      setInvoiceShipping(event.target.value)
                                    }
                                  />
                                </label>

                                <label>
                                  <span>Tax</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={invoiceTax}
                                    disabled={busy}
                                    onChange={(event) =>
                                      setInvoiceTax(event.target.value)
                                    }
                                  />
                                </label>
                              </div>

                              <div className="cm-workflow-total">
                                Invoice total will be calculated by the Worker.
                              </div>

                              <button
                                type="button"
                                className="primary-btn"
                                disabled={busy}
                                onClick={() => sendInvoice(order)}
                              >
                                {invoiceBusy
                                  ? "Sending Invoice..."
                                  : order.invoice?.lastSentAt ||
                                      order.invoice?.sentAt ||
                                      order.invoice?.firstSentAt
                                    ? "Resend Invoice"
                                    : "Send Invoice"}
                              </button>
                            </div>

                            <div className="cm-workflow-card">
                              <div className="cm-workflow-heading">
                                <div>
                                  <span className="cm-workflow-step">STEP 2</span>
                                  <h4>Record Payment</h4>
                                </div>

                                <span className="cm-workflow-state">
                                  {order.payment?.receivedAt
                                    ? "Payment Recorded"
                                    : "Not Recorded"}
                                </span>
                              </div>

                              <label>
                                <span>Amount Received</span>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={paymentAmount}
                                  disabled={busy}
                                  onChange={(event) =>
                                    setPaymentAmount(event.target.value)
                                  }
                                />
                              </label>

                              <label>
                                <span>Payment Method</span>
                                <select
                                  value={paymentMethod}
                                  disabled={busy}
                                  onChange={(event) =>
                                    setPaymentMethod(event.target.value)
                                  }
                                >
                                  {PAYMENT_METHODS.map((method) => (
                                    <option key={method} value={method}>
                                      {method}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <div className="cm-item-fulfillment">
                                <div className="cm-item-fulfillment-heading">
                                  <div>
                                    <strong>Product Fulfillment</strong>
                                    <small>
                                      Mark every product as shipping soon or
                                      waiting for restock. The customer
                                      confirmation will list each group.
                                    </small>
                                  </div>

                                  <span>
                                    {getFulfillmentTypeLabel(
                                      selectedFulfillmentType
                                    )}
                                  </span>
                                </div>

                                {items.map((item, index) => (
                                  <label
                                    className="cm-item-fulfillment-row"
                                    key={`${item.codeName || item.name || "product"}-${item.strength || "strength"}-${index}`}
                                  >
                                    <span>
                                      <strong>{getItemDisplayName(item)}</strong>
                                      <small>Quantity: {item.quantity}</small>
                                    </span>

                                    <select
                                      value={
                                        itemFulfillment[index] ||
                                        getSavedItemFulfillmentStatus(
                                          order,
                                          item,
                                          index
                                        )
                                      }
                                      disabled={busy}
                                      onChange={(event) => {
                                        const selected = event.target.value;

                                        setItemFulfillment((current) => {
                                          const next =
                                            createItemFulfillmentDraft(order);

                                          current.forEach((status, itemIndex) => {
                                            if (status) {
                                              next[itemIndex] = status;
                                            }
                                          });

                                          next[index] = selected;
                                          return next;
                                        });
                                      }}
                                    >
                                      {ITEM_FULFILLMENT_OPTIONS.map(
                                        ([value, label]) => (
                                          <option key={value} value={value}>
                                            {label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                  </label>
                                ))}


                                <div className="cm-fulfillment-preview">
                                  <strong>Customer confirmation preview</strong>

                                  {inStockItems.length > 0 && (
                                    <div>
                                      <span>Shipping soon</span>
                                      {inStockItems.map((item, index) => (
                                        <small key={`ready-${item.codeName || item.name || index}-${index}`}>
                                          {getItemDisplayName(item)} × {item.quantity}
                                        </small>
                                      ))}
                                    </div>
                                  )}

                                  {preorderItems.length > 0 && (
                                    <div>
                                      <span>Waiting for restock</span>
                                      {preorderItems.map((item, index) => (
                                        <small key={`preorder-${item.codeName || item.name || index}-${index}`}>
                                          {getItemDisplayName(item)} × {item.quantity}
                                        </small>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <label>
                                <span>Payment Reference (Optional)</span>
                                <input
                                  type="text"
                                  maxLength="200"
                                  value={paymentReference}
                                  disabled={busy}
                                  onChange={(event) =>
                                    setPaymentReference(event.target.value)
                                  }
                                  placeholder="Transaction or confirmation number"
                                />
                              </label>

                              {selectedFulfillmentType !== "in_stock" && (
                                <label>
                                  <span>Restock Timing Note (Optional)</span>
                                  <textarea
                                    rows="4"
                                    maxLength="500"
                                    value={restockNote}
                                    disabled={busy}
                                    onChange={(event) =>
                                      setRestockNote(event.target.value)
                                    }
                                    placeholder="Add an estimated restock date or any timing details. The product lists are created automatically."
                                  />
                                </label>
                              )}

                              <button
                                type="button"
                                className="primary-btn"
                                disabled={busy}
                                onClick={() => recordPayment(order)}
                              >
                                {paymentBusy
                                  ? "Recording Payment..."
                                  : order.payment?.receivedAt
                                    ? "Resend Payment Confirmation"
                                    : "Record Payment & Send Confirmation"}
                              </button>
                            </div>

                            <div className="cm-workflow-card">
                              <div className="cm-workflow-heading">
                                <div>
                                  <span className="cm-workflow-step">STEP 3</span>
                                  <h4>Create Shipment</h4>
                                </div>

                                <span className="cm-workflow-state">
                                  {shipmentProgress.remainingQuantity === 0
                                    ? "Fully Shipped"
                                    : `${shipmentProgress.shippedQuantity}/${shipmentProgress.totalQuantity} Shipped`}
                                </span>
                              </div>

                              {!order.payment?.receivedAt ? (
                                <div className="cm-shipment-notice">
                                  Record payment first. Shipment controls become
                                  available after payment is saved.
                                </div>
                              ) : shipmentProgress.remainingQuantity === 0 ? (
                                <div className="cm-shipment-notice cm-shipment-complete">
                                  Every product in this order has been shipped.
                                </div>
                              ) : (
                                <>
                                  <div className="cm-integrated-shipping">
                                    <div className="cm-integrated-shipping-heading">
                                      <div>
                                        <span>INTEGRATED POSTAGE</span>
                                        <strong>Compare rates and print a 4 × 6 label</strong>
                                        <small>
                                          Select package quantities below, confirm the parcel size,
                                          then purchase a rate. Tracking fills in automatically.
                                        </small>
                                      </div>
                                      <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={() => onNavigate("shippingCenter")}
                                      >
                                        Shipping Settings
                                      </button>
                                    </div>

                                    <div className="cm-parcel-grid">
                                      <label>
                                        <span>Length (in)</span>
                                        <input type="number" min="0.1" step="0.1" value={parcelLength} disabled={busy || Boolean(labelBusy)} onChange={(event) => setParcelLength(event.target.value)} />
                                      </label>
                                      <label>
                                        <span>Width (in)</span>
                                        <input type="number" min="0.1" step="0.1" value={parcelWidth} disabled={busy || Boolean(labelBusy)} onChange={(event) => setParcelWidth(event.target.value)} />
                                      </label>
                                      <label>
                                        <span>Height (in)</span>
                                        <input type="number" min="0.1" step="0.1" value={parcelHeight} disabled={busy || Boolean(labelBusy)} onChange={(event) => setParcelHeight(event.target.value)} />
                                      </label>
                                      <label>
                                        <span>Weight (oz)</span>
                                        <input type="number" min="0.1" step="0.1" value={parcelWeight} disabled={busy || Boolean(labelBusy)} onChange={(event) => setParcelWeight(event.target.value)} />
                                      </label>
                                    </div>

                                    <button
                                      type="button"
                                      className="secondary-btn"
                                      disabled={busy || Boolean(labelBusy) || shipmentItems.length === 0}
                                      onClick={() => getShippingLabelRates(order)}
                                    >
                                      {labelBusy === "rates" ? "Loading Rates…" : "Get Shipping Rates"}
                                    </button>

                                    {labelError && (
                                      <div className="cm-error" role="alert">
                                        {labelError}
                                      </div>
                                    )}

                                    {labelRates.length > 0 && (
                                      <div className="cm-rate-list">
                                        {labelRates.map((rate) => (
                                          <label key={rate.id} className={selectedLabelRateId === rate.id ? "selected" : ""}>
                                            <input
                                              type="radio"
                                              name={`shipping-rate-${id}`}
                                              value={rate.id}
                                              checked={selectedLabelRateId === rate.id}
                                              onChange={() => setSelectedLabelRateId(rate.id)}
                                            />
                                            <span>
                                              <strong>{rate.carrier} · {rate.service}</strong>
                                              <small>
                                                {rate.deliveryDays ? `${rate.deliveryDays} estimated day(s)` : "Delivery estimate unavailable"}
                                              </small>
                                            </span>
                                            <b>{Number(rate.rate || 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</b>
                                          </label>
                                        ))}

                                        <button
                                          type="button"
                                          className="primary-btn"
                                          disabled={busy || Boolean(labelBusy) || !selectedLabelRateId}
                                          onClick={() => purchaseShippingLabel(order)}
                                        >
                                          {labelBusy === "buy" ? "Purchasing Label…" : "Purchase Selected Label"}
                                        </button>
                                      </div>
                                    )}

                                    {activeShippingLabel?.labelUrl && (
                                      <div className="cm-label-ready">
                                        <div>
                                          <strong>{activeShippingLabel.test ? "Test label ready" : "Label ready"}</strong>
                                          <span>{activeShippingLabel.carrier} {activeShippingLabel.trackingNumber}</span>
                                        </div>
                                        <a href={activeShippingLabel.labelUrl} target="_blank" rel="noreferrer">
                                          Open & Print Label
                                        </a>
                                      </div>
                                    )}

                                    {shippingLabelHistory.length > 0 && (
                                      <div className="cm-label-history">
                                        <strong>Shipping Label History</strong>
                                        {shippingLabelHistory.map((label, index) => (
                                          <div
                                            className={String(label.refundStatus || "").toUpperCase() === "ERROR" ? "cm-label-ready cm-label-refund-rejected" : label.refundStatus ? "cm-label-ready cm-label-refunded" : "cm-label-ready"}
                                            key={label.labelId || `${label.trackingNumber}-${index}`}
                                          >
                                            <div>
                                              <strong>{label.carrier || "Carrier"} · {label.service || "Shipping label"}</strong>
                                              <span>{label.trackingNumber || "Tracking unavailable"}</span>
                                              <small>{formatMoney(label.postage)} · {formatDate(label.purchasedAt)}</small>
                                              {label.refundStatus && (
                                                <small className="cm-label-refund-status">
                                                  Refund {String(label.refundStatus).toUpperCase()} · {formatDate(label.refundUpdatedAt || label.refundRequestedAt)}
                                                  {label.refundError ? ` · ${label.refundError}` : ""}
                                                </small>
                                              )}
                                            </div>
                                            <div className="cm-label-actions">
                                              {label.labelUrl && !label.refundStatus && (
                                                <a href={label.labelUrl} target="_blank" rel="noreferrer">
                                                  Reprint Label
                                                </a>
                                              )}
                                              {String(label.test).toLowerCase() !== "true" && !label.refundStatus && (
                                                <button
                                                  type="button"
                                                  className="cm-label-refund-btn"
                                                  disabled={busy || Boolean(labelBusy) || !(label.labelId || label.transactionId)}
                                                  onClick={() => refundShippingLabel(order, label)}
                                                >
                                                  {labelBusy === `refund:${label.labelId || label.transactionId}`
                                                    ? "Submitting…"
                                                    : "Void / Refund"}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="cm-shipping-grid">
                                    <label>
                                      <span>Carrier</span>
                                      <select
                                        value={shipmentCarrier}
                                        disabled={busy}
                                        onChange={(event) =>
                                          setShipmentCarrier(event.target.value)
                                        }
                                      >
                                        {SHIPPING_CARRIERS.map((carrier) => (
                                          <option key={carrier} value={carrier}>
                                            {carrier}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    <label>
                                      <span>Tracking Number</span>
                                      <input
                                        type="text"
                                        maxLength="200"
                                        value={shipmentTrackingNumber || activeShippingLabel?.trackingNumber || ""}
                                        disabled={busy}
                                        onChange={(event) =>
                                          setShipmentTrackingNumber(event.target.value)
                                        }
                                        placeholder="Enter carrier tracking number"
                                      />
                                    </label>
                                  </div>

                                  <div className="cm-item-fulfillment">
                                    <div className="cm-item-fulfillment-heading">
                                      <div>
                                        <strong>Products in This Package</strong>
                                        <small>
                                          Enter the quantity leaving now. Leave 0
                                          for products staying open.
                                        </small>
                                      </div>

                                      <span>
                                        {shipmentItems.reduce(
                                          (total, item) => total + item.quantity,
                                          0
                                        )}{" "}
                                        selected
                                      </span>
                                    </div>

                                    {items.map((item, index) => {
                                      const shipped = getShippedQuantity(order, index);
                                      const remaining = getRemainingQuantity(order, index);

                                      return (
                                        <label
                                          className="cm-shipment-item-row"
                                          key={`shipment-${item.codeName || item.name || "product"}-${item.strength || "strength"}-${index}`}
                                        >
                                          <span>
                                            <strong>{getItemDisplayName(item)}</strong>
                                            <small>
                                              Ordered {item.quantity} · Shipped {shipped} · Remaining {remaining}
                                            </small>
                                          </span>

                                          <input
                                            type="number"
                                            min="0"
                                            max={remaining}
                                            step="1"
                                            value={shipmentQuantities[index] ?? 0}
                                            disabled={busy || remaining === 0}
                                            onChange={(event) => {
                                              const selected = Math.min(
                                                remaining,
                                                Math.max(
                                                  0,
                                                  Math.floor(Number(event.target.value) || 0)
                                                )
                                              );

                                              setShipmentQuantities((current) => {
                                                const next = getItems(order).map(
                                                  (_entry, itemIndex) =>
                                                    Number(current[itemIndex] || 0)
                                                );
                                                next[index] = selected;
                                                return next;
                                              });
                                            }}
                                          />
                                        </label>
                                      );
                                    })}
                                  </div>

                                  <label>
                                    <span>Shipping Note (Optional)</span>
                                    <textarea
                                      rows="3"
                                      maxLength="1000"
                                      value={shipmentNote}
                                      disabled={busy}
                                      onChange={(event) =>
                                        setShipmentNote(event.target.value)
                                      }
                                      placeholder="Optional package or delivery note for the customer"
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    className="primary-btn"
                                    disabled={busy || shipmentItems.length === 0}
                                    onClick={() => createShipment(order)}
                                  >
                                    {shipmentBusy
                                      ? "Sending Shipment Email..."
                                      : "Mark Selected Items Shipped & Email Customer"}
                                  </button>
                                </>
                              )}

                              {shipments.length > 0 && (
                                <div className="cm-shipment-history">
                                  <strong>Shipment History</strong>

                                  {[...shipments].reverse().map((shipment, shipmentIndex) => (
                                    <div
                                      className="cm-shipment-history-card"
                                      key={shipment.shipmentId || `${shipment.trackingNumber}-${shipmentIndex}`}
                                    >
                                      <div>
                                        <span>
                                          Package {shipment.packageNumber || shipments.length - shipmentIndex}
                                        </span>
                                        <strong>
                                          {shipment.carrier} {shipment.trackingNumber}
                                        </strong>
                                        <small>{formatDate(shipment.shippedAt)}</small>
                                      </div>

                                      {shipment.trackingStatus && (
                                        <div
                                          className={`cm-tracking-status cm-tracking-status--${String(
                                            shipment.trackingStatus
                                          )
                                            .toLowerCase()
                                            .replace(/[^a-z0-9]+/g, "-")}`}
                                        >
                                          <strong>
                                            {formatTrackingStatus(shipment.trackingStatus)}
                                          </strong>

                                          {shipment.trackingStatusDetails && (
                                            <span>{shipment.trackingStatusDetails}</span>
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
                                        </div>
                                      )}

                                      {shipment.trackingError && (
                                        <div className="cm-tracking-status cm-tracking-status--error">
                                          <strong>Tracking Check Needed</strong>
                                          <span>{shipment.trackingError}</span>
                                        </div>
                                      )}

                                      <div>
                                        {(shipment.items || []).map((item, index) => (
                                          <small key={`${shipment.shipmentId || shipmentIndex}-${item.index}-${index}`}>
                                            {getItemDisplayName(item)} × {item.quantity}
                                          </small>
                                        ))}
                                      </div>

                                      {shipment.note && <p>{shipment.note}</p>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </section>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="cm-security-note">
            <p className="eyebrow">
              ADMIN SECURITY
            </p>

            <h2>
              Protected Customer Records
            </h2>

            <p>
              Cloudflare Access protects the admin route, and every
              directory, recovery, account-control, and order API
              request still requires the administrator bearer secret.
              Suspension and session-revocation actions increment the
              account session version so existing cookies stop working
              immediately. Password hashes and password salts are never
              returned to this page.
            </p>
          </section>
        </section>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  detail,
}) {
  return (
    <div className="cm-stat">
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

function AccountInfo({
  label,
  value,
}) {
  return (
    <div className="cm-account-info">
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
.cm-page *,
.cm-page *::before,
.cm-page *::after {
  box-sizing: border-box;
}

.cm-page {
  width: 100%;
  padding: 80px 30px;
  overflow-x: hidden;
}

.cm-wrap {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.cm-login,
.cm-hero,
.cm-panel,
.cm-security-note {
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 26px;
  background:
    radial-gradient(
      circle at top left,
      rgba(61,165,255,.12),
      transparent 35%
    ),
    rgba(255,255,255,.04);
  box-shadow: 0 25px 70px rgba(0,0,0,.4);
}

.cm-login {
  max-width: 650px;
  margin: 0 auto;
  padding: 45px;
  text-align: center;
}

.cm-login h1,
.cm-hero h1 {
  margin: 10px 0 18px;
  font-size: clamp(38px, 7vw, 58px);
  line-height: 1.06;
}

.cm-login p,
.cm-hero p,
.cm-panel > p,
.cm-security-note p {
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
.cm-editor input,
.cm-editor select,
.cm-editor textarea,
.cm-control-editor textarea {
  width: 100%;
  padding: 15px;
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 12px;
  outline: none;
  background: #151b22;
  color: #fff;
  font: inherit;
}

.cm-login input:focus,
.cm-filters input:focus,
.cm-filters select:focus,
.cm-reset input:focus,
.cm-editor input:focus,
.cm-editor select:focus,
.cm-editor textarea:focus,
.cm-control-editor textarea:focus {
  border-color: rgba(61,165,255,.62);
  box-shadow: 0 0 0 3px rgba(61,165,255,.12);
}

.cm-filters select option,
.cm-editor select option {
  background: #151b22;
  color: #fff;
}

.cm-top,
.cm-top > div,
.cm-heading,
.cm-actions,
.cm-result > div,
.cm-editor > div,
.cm-account-card-top,
.cm-account-actions {
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
  display: inline-flex;
  padding: 8px 12px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .6px;
}

.cm-pill {
  background: rgba(255,255,255,.07);
  color: #c3c9ce;
}

.cm-live {
  border-color: rgba(61,165,255,.3);
  background: rgba(61,165,255,.15);
  color: #9ed8ff;
}

.cm-link {
  border: 0;
  background: none;
  color: #9aa5ae;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.cm-hero {
  margin-bottom: 24px;
  padding: 50px;
  text-align: center;
}

.cm-hero > p:not(.eyebrow) {
  max-width: 850px;
  margin: 0 auto;
}

.cm-hero button {
  margin-top: 20px;
}

.cm-error,
.cm-success,
.cm-warning,
.cm-account-reset-state,
.cm-account-suspension-state,
.cm-account-session-state {
  margin: 16px 0;
  padding: 14px;
  border-radius: 14px;
  line-height: 1.6;
}

.cm-error {
  border: 1px solid rgba(255,95,95,.35);
  background: rgba(255,70,70,.12);
  color: #ffd1d1;
}

.cm-error p {
  margin-top: 5px;
}

.cm-success {
  border: 1px solid rgba(61,165,255,.3);
  background: rgba(61,165,255,.12);
  color: #bde7ff;
}

.cm-warning,
.cm-account-reset-state {
  border: 1px solid rgba(255,190,80,.28);
  background: rgba(255,170,50,.09);
  color: #e8d3ab;
}

.cm-stats {
  display: grid;
  gap: 14px;
  margin-bottom: 24px;
}

.cm-account-stats {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.cm-order-stats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cm-stat {
  min-width: 0;
  display: grid;
  gap: 8px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 18px;
  background: rgba(255,255,255,.04);
}

.cm-stat span,
.cm-summary span,
.cm-result span,
.cm-account-card-top > div > span,
.cm-account-info span,
.cm-reset label > span,
.cm-filters label > span,
.cm-editor label > span,
.cm-control-editor label > span {
  color: #9ed8ff;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .7px;
}

.cm-stat strong {
  color: #fff;
  font-size: 26px;
  overflow-wrap: anywhere;
}

.cm-stat small {
  color: #8d98a1;
  line-height: 1.5;
}

.cm-panel {
  margin-bottom: 24px;
  padding: 30px;
}

.cm-panel h2,
.cm-security-note h2 {
  margin: 6px 0 16px;
  font-size: clamp(30px, 4vw, 38px);
  line-height: 1.12;
}

.cm-count-label {
  color: #aeb7be;
  font-size: 13px;
}

.cm-count-label strong {
  color: #fff;
}

.cm-reset form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
  margin: 20px 0;
}

.cm-reset form label,
.cm-filters label,
.cm-editor label {
  display: grid;
  gap: 8px;
}

.cm-filters {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    minmax(230px, 300px);
  gap: 12px;
  margin: 20px 0;
}

.cm-result {
  display: grid;
  gap: 10px;
  padding: 18px;
  border: 1px solid rgba(61,165,255,.3);
  border-radius: 16px;
  background: rgba(61,165,255,.1);
}

.cm-result code {
  padding: 12px;
  border-radius: 10px;
  background: #0e1318;
  color: #fff;
  font-size: 18px;
  font-weight: 900;
  overflow-wrap: anywhere;
  user-select: all;
}

.cm-result small {
  color: #b9c6cf;
}

.cm-account-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.cm-account-card {
  min-width: 0;
  padding: 21px;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 20px;
  background:
    radial-gradient(
      circle at top left,
      rgba(61,165,255,.09),
      transparent 40%
    ),
    rgba(255,255,255,.03);
}

.cm-account-card-top {
  align-items: flex-start;
}

.cm-account-card-top h3 {
  margin: 5px 0;
  color: #fff;
  font-size: 23px;
  line-height: 1.2;
}

.cm-account-card-top p {
  color: #aab5bd;
  overflow-wrap: anywhere;
}

.cm-account-status {
  display: inline-flex;
  max-width: 190px;
  padding: 8px 11px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: .55px;
}

.cm-account-status-ready {
  border: 1px solid rgba(74,208,152,.28);
  background: rgba(74,208,152,.1);
  color: #b5f2d8;
}

.cm-account-status-warning {
  border: 1px solid rgba(255,190,80,.3);
  background: rgba(255,170,50,.1);
  color: #ffe0a8;
}

.cm-account-status-suspended {
  border: 1px solid rgba(255,95,95,.38);
  background: rgba(255,70,70,.12);
  color: #ffc7c7;
}

.cm-account-info-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.cm-account-info {
  min-width: 0;
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 13px;
  background: rgba(0,0,0,.16);
}

.cm-account-info strong {
  color: #e6eaed;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.cm-account-reset-state {
  margin-bottom: 0;
  font-size: 13px;
}

.cm-account-reset-state p {
  margin-top: 4px;
}

.cm-account-suspension-state {
  margin-bottom: 0;
  border: 1px solid rgba(255,95,95,.34);
  background: rgba(255,70,70,.1);
  color: #ffd1d1;
  font-size: 13px;
}

.cm-account-suspension-state p,
.cm-account-session-state p {
  margin-top: 5px;
}

.cm-account-session-state {
  margin-bottom: 0;
  border: 1px solid rgba(61,165,255,.24);
  background: rgba(61,165,255,.08);
  color: #c7eaff;
  font-size: 13px;
}

.cm-account-actions {
  justify-content: flex-start;
  margin-top: 17px;
  padding-top: 15px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.cm-control-editor {
  display: grid;
  gap: 14px;
  margin-top: 16px;
  padding: 17px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 15px;
  background: rgba(0,0,0,.2);
}

.cm-control-editor h4 {
  margin: 5px 0;
  color: #fff;
  font-size: 20px;
}

.cm-control-editor p {
  color: #aeb8bf;
  line-height: 1.6;
}

.cm-control-editor label {
  display: grid;
  gap: 8px;
}

.cm-control-editor small {
  color: #88939b;
}

.cm-control-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.cm-orders {
  display: grid;
  gap: 15px;
}

.cm-order {
  padding: 20px;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 18px;
  background: rgba(255,255,255,.035);
}

.cm-summary {
  display: grid;
  grid-template-columns:
    minmax(0, 1.4fr)
    minmax(0, 1fr)
    minmax(0, .7fr);
  gap: 18px;
}

.cm-summary > div {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.cm-summary h3 {
  color: #fff;
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
  border-top: 1px solid rgba(255,255,255,.08);
}

.cm-reset-btn,
.cm-delete,
.cm-danger-btn {
  padding: 12px 15px;
  border-radius: 11px;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.cm-reset-btn {
  border: 1px solid rgba(255,190,80,.35);
  background: rgba(255,170,50,.1);
  color: #ffe0a8;
}

.cm-delete,
.cm-danger-btn {
  border: 1px solid rgba(255,95,95,.35);
  background: rgba(255,70,70,.1);
  color: #ffc7c7;
}

.cm-danger-btn:hover:not(:disabled) {
  background: rgba(255,70,70,.18);
}

.cm-reset-btn:disabled,
.cm-delete:disabled,
.cm-danger-btn:disabled,
.cm-page button:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.cm-details {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.cm-details > div,
.cm-editor {
  min-width: 0;
  padding: 15px;
  border-radius: 14px;
  background: rgba(0,0,0,.18);
}

.cm-details h4 {
  margin-bottom: 8px;
  color: #fff;
}

.cm-details strong {
  color: #e8f4ff;
}

.cm-editor {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.cm-workflow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 8px;
  padding-top: 18px;
  border-top: 1px solid rgba(255,255,255,.09);
}

.cm-workflow-card {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 13px;
  padding: 18px;
  border: 1px solid rgba(61,165,255,.18);
  border-radius: 16px;
  background: rgba(61,165,255,.055);
}

.cm-workflow-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.cm-workflow-heading h4 {
  margin: 4px 0 0;
  color: #fff;
  font-size: 18px;
}

.cm-workflow-step,
.cm-workflow-state {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.cm-workflow-step {
  color: #8ed3ff;
}

.cm-workflow-state {
  padding: 7px 9px;
  border: 1px solid rgba(255,255,255,.11);
  border-radius: 999px;
  background: rgba(0,0,0,.22);
  color: #c9d4dc;
}

.cm-workflow-card label {
  display: grid;
  gap: 7px;
}

.cm-workflow-card label > span {
  color: #d7e0e6;
  font-size: 12px;
  font-weight: 850;
}

.cm-workflow-card small,
.cm-workflow-total {
  color: #8f9ba4;
  font-size: 11px;
  line-height: 1.5;
}

.cm-item-fulfillment {
  display: grid;
  gap: 10px;
  padding: 13px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 13px;
  background: rgba(0,0,0,.18);
}

.cm-item-fulfillment-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.cm-item-fulfillment-heading > div {
  display: grid;
  gap: 4px;
}

.cm-item-fulfillment-heading > div > strong {
  color: #fff;
  font-size: 13px;
}

.cm-item-fulfillment-heading > span {
  flex: 0 0 auto;
  padding: 6px 8px;
  border: 1px solid rgba(61,165,255,.26);
  border-radius: 999px;
  background: rgba(61,165,255,.1);
  color: #9bd8ff;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .45px;
  text-transform: uppercase;
}

.cm-item-fulfillment-row {
  grid-template-columns: minmax(0, 1fr) minmax(190px, .8fr);
  align-items: center;
  gap: 12px !important;
  padding: 11px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 11px;
  background: rgba(255,255,255,.035);
}

.cm-item-fulfillment-row > span {
  display: grid;
  gap: 3px;
}

.cm-item-fulfillment-row > span > strong {
  color: #eef7ff;
  font-size: 12px;
}

.cm-fulfillment-preview {
  display: grid;
  gap: 9px;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.cm-fulfillment-preview > strong {
  color: #fff;
  font-size: 12px;
}

.cm-fulfillment-preview > div {
  display: grid;
  gap: 3px;
}

.cm-fulfillment-preview > div > span {
  color: #9bd8ff;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .45px;
  text-transform: uppercase;
}


.cm-integrated-shipping {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid #c7d2fe;
  border-radius: 16px;
  background: #f5f7ff;
}

.cm-integrated-shipping-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.cm-integrated-shipping-heading > div {
  display: grid;
  gap: 3px;
}

.cm-integrated-shipping-heading span {
  color: #4338ca;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.11em;
}

.cm-integrated-shipping-heading small {
  color: #64748b;
  line-height: 1.45;
}

.cm-parcel-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.cm-parcel-grid label {
  display: grid;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 800;
}

.cm-parcel-grid input {
  width: 100%;
  box-sizing: border-box;
}

.cm-rate-list {
  display: grid;
  gap: 8px;
}

.cm-rate-list > label {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: #fff;
  padding: 11px 12px;
  cursor: pointer;
}

.cm-rate-list > label.selected {
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}

.cm-rate-list > label span {
  display: grid;
  gap: 2px;
}

.cm-rate-list > label small {
  color: #64748b;
}

.cm-label-ready {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #86efac;
  border-radius: 12px;
  background: #f0fdf4;
  padding: 12px;
}

.cm-label-ready > div {
  display: grid;
  gap: 2px;
}

.cm-label-ready a {
  border-radius: 10px;
  background: #166534;
  color: #fff;
  padding: 9px 12px;
  text-decoration: none;
  font-weight: 900;
  white-space: nowrap;
}

.cm-label-actions {
  gap: 8px !important;
}

.cm-label-refund-btn {
  min-width: 145px;
  border: 0;
  border-radius: 10px;
  background: #991b1b;
  color: #ffffff;
  padding: 9px 12px;
  font: inherit;
  font-weight: 900;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
}

.cm-label-refund-btn:hover:not(:disabled) {
  background: #7f1d1d;
}

.cm-label-refund-btn:disabled {
  cursor: not-allowed;
  opacity: .6;
}

.cm-label-refunded {
  border-color: #f59e0b;
  background: #fffbeb;
}

.cm-label-refund-rejected {
  border-color: #dc2626;
  background: #fef2f2;
}

.cm-label-refund-status {
  margin-top: 4px;
  color: #92400e !important;
  font-weight: 900;
  line-height: 1.45;
}

.cm-shipment-notice {
  padding: 13px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  background: rgba(0,0,0,.18);
  color: #aebbc4;
  font-size: 12px;
  line-height: 1.55;
}

.cm-shipment-complete {
  border-color: rgba(76,175,80,.25);
  background: rgba(76,175,80,.09);
  color: #bde9c2;
}

.cm-shipping-grid {
  display: grid;
  grid-template-columns: minmax(150px, .55fr) minmax(0, 1fr);
  gap: 10px;
}

.cm-shipment-item-row {
  grid-template-columns: minmax(0, 1fr) 100px;
  align-items: center;
  gap: 12px !important;
  padding: 11px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 11px;
  background: rgba(255,255,255,.035);
}

.cm-shipment-item-row > span {
  display: grid;
  gap: 3px;
}

.cm-shipment-item-row > span > strong {
  color: #eef7ff;
  font-size: 12px;
}

.cm-shipment-item-row input {
  text-align: center;
}

.cm-shipment-history {
  display: grid;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.cm-shipment-history > strong {
  color: #fff;
  font-size: 13px;
}

.cm-shipment-history-card {
  display: grid;
  gap: 9px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 12px;
  background: rgba(0,0,0,.18);
}

.cm-shipment-history-card > div {
  display: grid;
  gap: 3px;
}

.cm-shipment-history-card > div:first-child > span {
  color: #8ed3ff;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .5px;
  text-transform: uppercase;
}

.cm-shipment-history-card > div:first-child > strong {
  color: #fff;
  font-size: 13px;
}

.cm-shipment-history-card small,
.cm-shipment-history-card p {
  margin: 0;
  color: #aeb8bf;
  font-size: 11px;
  line-height: 1.5;
}
.cm-tracking-status {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid rgba(142,211,255,.22);
  border-radius: 10px;
  background: rgba(48,145,210,.08);
}

.cm-tracking-status > strong {
  color: #8ed3ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .4px;
  text-transform: uppercase;
}

.cm-tracking-status > span {
  color: #dce7ed;
  font-size: 11px;
  line-height: 1.5;
}

.cm-tracking-status--delivered {
  border-color: rgba(79,211,138,.3);
  background: rgba(34,139,85,.1);
}

.cm-tracking-status--delivered > strong {
  color: #78e5a8;
}

.cm-tracking-status--failure,
.cm-tracking-status--returned,
.cm-tracking-status--error {
  border-color: rgba(255,122,122,.32);
  background: rgba(170,45,45,.11);
}

.cm-tracking-status--failure > strong,
.cm-tracking-status--returned > strong,
.cm-tracking-status--error > strong {
  color: #ff9b9b;
}

.cm-money-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.cm-workflow-card > button {
  width: 100%;
  margin-top: 3px;
}

.cm-empty {
  padding: 35px 20px;
  border: 1px dashed rgba(255,255,255,.1);
  border-radius: 15px;
  color: #aab3ba;
  line-height: 1.65;
  text-align: center;
}

.cm-security-note {
  padding: 30px;
}

.cm-security-note p:not(.eyebrow) {
  max-width: 850px;
}


/* Keep the light Shippo panels readable inside the dark order manager. */
.cm-integrated-shipping {
  color: #111827;
}

.cm-integrated-shipping-heading strong {
  color: #111827;
}

.cm-integrated-shipping .cm-parcel-grid label > span {
  color: #334155;
}

.cm-integrated-shipping .cm-rate-list > label {
  color: #111827;
}

.cm-integrated-shipping .cm-rate-list > label > span {
  color: #111827;
}

.cm-integrated-shipping .cm-rate-list > label b {
  color: #111827;
}

.cm-integrated-shipping .cm-label-ready {
  color: #14532d;
}

.cm-integrated-shipping .cm-label-ready > div > strong,
.cm-integrated-shipping .cm-label-ready > div > span {
  color: #14532d;
}
/* Improve contrast inside the light shipping panel. */
.cm-integrated-shipping .cm-error {
  border: 1px solid #7f1d1d;
  background: #991b1b;
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(127,29,29,.22);
  font-weight: 750;
}

.cm-integrated-shipping .secondary-btn {
  border: 1px solid #1e3a8a;
  background: #1e3a8a;
  color: #ffffff;
  box-shadow: 0 7px 16px rgba(30,58,138,.18);
}

.cm-integrated-shipping .secondary-btn:hover:not(:disabled) {
  border-color: #172554;
  background: #172554;
  color: #ffffff;
}

.cm-integrated-shipping .secondary-btn:disabled {
  border-color: #64748b;
  background: #64748b;
  color: #f8fafc;
  opacity: .7;
}

@media (max-width: 1000px) {
  .cm-account-stats {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .cm-account-grid {
    grid-template-columns:
      minmax(0, 1fr);
  }
}

@media (max-width: 800px) {
  .cm-page {
    padding: 50px 14px;
  }

  .cm-order-stats,
  .cm-summary,
  .cm-details,
  .cm-workflow-grid {
    grid-template-columns:
      minmax(0, 1fr);
  }

  .cm-reset form,
  .cm-filters,
  .cm-item-fulfillment-row,
  .cm-integrated-shipping-heading,
  .cm-label-ready,
  .cm-shipment-item-row,
  .cm-shipping-grid {
    grid-template-columns:
      minmax(0, 1fr);
  }

  .cm-item-fulfillment-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .cm-item-fulfillment-heading > span {
    align-self: flex-start;
  }

  .cm-hero,
  .cm-panel,
  .cm-login,
  .cm-security-note {
    padding: 20px;
  }

  .cm-actions button,
  .cm-account-actions button,
  .cm-reset form button,
  .cm-control-actions button {
    width: 100%;
  }
}

@media (max-width: 520px) {
  .cm-page {
    padding: 35px 8px;
  }

  .cm-account-stats,
  .cm-order-stats,
  .cm-account-info-grid,
  .cm-money-grid {
    grid-template-columns:
      minmax(0, 1fr);
  }

  .cm-hero,
  .cm-panel,
  .cm-login,
  .cm-security-note {
    padding: 16px;
    border-radius: 20px;
  }
}
`;

export default CustomerManager;
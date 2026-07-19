import { getOrderCatalogItem } from "./orderCatalog.js";

const MAX_REQUEST_LENGTH = 100000;
const MAX_LINE_ITEMS = 50;
const MAX_TOTAL_QUANTITY = 100;
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

const MAX_DOCUMENT_REQUEST_LENGTH = 50000;
const MAX_DOCUMENT_URL_LENGTH = 2048;
const MAX_DOCUMENT_NOTES_LENGTH = 2000;

const MAX_ORDER_ADMIN_REQUEST_LENGTH = 10000;
const MAX_ORDER_STATUS_LENGTH = 100;
const MAX_ORDER_ADMIN_NOTES_LENGTH = 2000;
const MAX_ORDER_WORKFLOW_REQUEST_LENGTH = 30000;
const MAX_ORDER_PAYMENT_LINK_LENGTH = 2048;
const MAX_ORDER_PAYMENT_DESTINATION_LENGTH = 300;
const MAX_ORDER_PAYMENT_REFERENCE_LENGTH = 200;
const MAX_ORDER_SHIPMENT_TRACKING_LENGTH = 200;
const MAX_ORDER_SHIPMENT_NOTE_LENGTH = 1000;
const MAX_ORDER_RESTOCK_NOTE_LENGTH = 1000;
const MAX_ORDER_TIMING_NOTE_LENGTH = 500;
const MAX_ORDER_WORKFLOW_MESSAGE_LENGTH = 1000;
const MAX_ORDER_AMOUNT_CENTS = 10000000;
const ORDER_WORKFLOW_HISTORY_LIMIT = 100;

const MAX_AUTH_REQUEST_LENGTH = 20000;
const MAX_ACCOUNT_NAME_LENGTH = 100;
const MAX_ACCOUNT_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const PASSWORD_HASH_ITERATIONS = 100000;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const DOCUMENT_KEY_PREFIX = "document:";
const ORDER_KEY_PREFIX = "order:";
const CATALOG_KEY_PREFIX = "catalog:variant:";
const INVENTORY_EVENT_KEY_PREFIX = "inventory:event:";
const INVENTORY_RESTORATION_KEY_PREFIX = "inventory:restoration:";
const COUPON_KEY_PREFIX = "coupon:";
const COUPON_REDEMPTION_KEY_PREFIX = "coupon:redemption:";
const SHIPPING_SETTINGS_KEY = "settings:shipping";
const SHIPPING_LABEL_KEY_PREFIX = "shipping:label:";
const SHIPPO_API_URL = "https://api.goshippo.com";
const FREE_SHIPPING_THRESHOLD_CENTS = 10000;
const FLAT_SHIPPING_FEE_CENTS = 1500;
const ACCOUNT_KEY_PREFIX = "account:";
const SESSION_COOKIE_NAME = "__Host-304_session";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const TURNSTILE_ACTION = "checkout_order";
const TURNSTILE_HOSTNAME = "304peptides.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      url.pathname === "/api/order" &&
      request.method === "POST"
    ) {
      return handleOrderRequest(
        request,
        env
      );
    }

    if (
      url.pathname.startsWith(
        "/api/auth/"
      )
    ) {
      return handleAuthenticationRequest(
        request,
        env,
        url
      );
    }

    if (
      url.pathname ===
      "/api/account/orders"
    ) {
      return handleCustomerOrdersRequest(
        request,
        env
      );
    }

    if (
      url.pathname === "/api/catalog"
    ) {
      return handlePublicCatalogRequest(
        request,
        env
      );
    }

    if (
      url.pathname === "/api/admin/catalog"
    ) {
      return handleAdminCatalogRequest(
        request,
        env,
        url
      );
    }

    if (
      url.pathname === "/api/admin/accounting-sync"
    ) {
      return handleAdminAccountingSyncRequest(
        request,
        env
      );
    }

    if (
      url.pathname === "/api/coupon/validate"
    ) {
      return handleCouponValidationRequest(
        request,
        env
      );
    }

    if (
      url.pathname === "/api/admin/coupons"
    ) {
      return handleAdminCouponsRequest(
        request,
        env,
        url
      );
    }

    if (
      url.pathname === "/api/admin/shipping/settings" ||
      url.pathname === "/api/admin/shipping/debug" ||
      url.pathname === "/api/admin/shipping/rates" ||
      url.pathname === "/api/admin/shipping/buy" ||
      url.pathname === "/api/admin/shipping/refund" ||
      url.pathname === "/api/admin/shipping/refund-status" ||
      url.pathname === "/api/admin/shipping/tracking-status"
    ) {
      return handleAdminShippingRequest(request, env, url);
    }

    if (
      url.pathname ===
        "/api/documents" ||
      url.pathname.startsWith(
        "/api/documents/"
      )
    ) {
      return handlePublicDocumentsRequest(
        request,
        env,
        url
      );
    }

    if (
      url.pathname ===
        "/api/admin/documents" ||
      url.pathname.startsWith(
        "/api/admin/documents/"
      )
    ) {
      return handleAdminDocumentsRequest(
        request,
        env,
        url
      );
    }

    if (
      url.pathname ===
        "/api/admin/order-actions/invoice" ||
      url.pathname ===
        "/api/admin/order-actions/payment-received" ||
      url.pathname ===
        "/api/admin/order-actions/shipment-sent" ||
      url.pathname ===
        "/api/admin/order-actions/cancel"
    ) {
      return handleAdminOrderWorkflowAction(
        request,
        env,
        url
      );
    }

    if (
      url.pathname ===
        "/api/admin/orders" ||
      url.pathname.startsWith(
        "/api/admin/orders/"
      )
    ) {
      return handleAdminOrdersRequest(
        request,
        env,
        url
      );
    }

    if (
      url.pathname.startsWith(
        "/api/"
      )
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "API route not found.",
        },
        404
      );
    }

    return env.ASSETS.fetch(
      request
    );
  },

  async scheduled(controller, env, context) {
    context.waitUntil(
      refreshAllShipmentTrackingStatuses(env)
    );
  },
};

/* -------------------------------------------------- */
/* CATALOG AND INVENTORY API                          */
/* -------------------------------------------------- */

async function handlePublicCatalogRequest(
  request,
  env
) {
  try {
    validateStorage(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    const records = await listRecordsByPrefix(
      env.DOCUMENTS_KV,
      CATALOG_KEY_PREFIX
    );

    return jsonResponse({
      success: true,
      records: records
        .map(toPublicCatalogRecord)
        .filter(Boolean),
      count: records.length,
    });
  } catch (error) {
    console.error("Public catalog request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminCatalogRequest(
  request,
  env,
  url
) {
  try {
    validateStorage(env);
    await requireAdmin(request, env);

    if (request.method === "GET") {
      const records = await listRecordsByPrefix(
        env.DOCUMENTS_KV,
        CATALOG_KEY_PREFIX
      );

      return jsonResponse({
        success: true,
        records,
        count: records.length,
      });
    }

    if (request.method === "POST" || request.method === "PUT") {
      validateJsonContentType(request);
      const body = await readJsonRequest(
        request,
        MAX_DOCUMENT_REQUEST_LENGTH,
        "catalog update"
      );
      const record = prepareCatalogRecord(body.variant || body.record || body);
      const previousRecord = await getCatalogOverride(
        env,
        record.codeName
      );

      await env.DOCUMENTS_KV.put(
        getCatalogKey(record.codeName),
        JSON.stringify(record),
        {
          metadata: {
            codeName: record.codeName,
            productKey: record.productKey,
            hidden: record.hidden,
            productHidden: record.productHidden,
            quantity: record.quantity,
            availabilityMode: record.availabilityMode,
            updatedAt: record.updatedAt,
          },
        }
      );

      await syncInventoryAdjustmentToWorkspaceBestEffort(
        env,
        {
          orderId: "",
          adjustments: [
            createWorkspaceInventoryAdjustment(
              previousRecord,
              record
            ),
          ],
        },
        {
          eventId: createAccountingSyncEventId(
            "catalog-save",
            record.codeName
          ),
          adjustmentType: "Manual Catalog Update",
          reason: "Product Manager inventory update.",
          actor: "authorized administrator",
          occurredAt: record.updatedAt,
        }
      );

      return jsonResponse({
        success: true,
        record,
        message: `${record.codeName} saved.`,
      });
    }

    if (request.method === "DELETE") {
      const codeName = normalizeCatalogCode(
        url.searchParams.get("codeName")
      );
      const previousRecord = await getCatalogOverride(
        env,
        codeName
      );

      await env.DOCUMENTS_KV.delete(getCatalogKey(codeName));

      if (previousRecord) {
        const removedRecord = {
          ...previousRecord,
          quantity: 0,
          trackQuantity: false,
          hidden: true,
          productHidden: true,
          updatedAt: new Date().toISOString(),
        };

        await syncInventoryAdjustmentToWorkspaceBestEffort(
          env,
          {
            orderId: "",
            adjustments: [
              createWorkspaceInventoryAdjustment(
                previousRecord,
                removedRecord
              ),
            ],
          },
          {
            eventId: createAccountingSyncEventId(
              "catalog-delete",
              codeName
            ),
            adjustmentType: "Catalog Item Removed",
            reason: "Catalog override removed in Product Manager.",
            actor: "authorized administrator",
            occurredAt: removedRecord.updatedAt,
          }
        );
      }

      return jsonResponse({
        success: true,
        message: `${codeName} override removed.`,
      });
    }

    throw new ApiRequestError("Method not allowed.", 405);
  } catch (error) {
    console.error("Admin catalog request error:", error);
    return handleApiError(error);
  }
}

function normalizeCatalogCode(value) {
  const codeName = cleanText(value, 100).toUpperCase();

  if (!/^[A-Z0-9][A-Z0-9._-]{1,99}$/.test(codeName)) {
    throw new ApiRequestError("The product code is invalid.", 400);
  }

  return codeName;
}

function normalizeCatalogProductKey(value, fallback) {
  const productKey = cleanText(value || fallback, 100)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!productKey) {
    throw new ApiRequestError("A product group is required.", 400);
  }

  return productKey;
}

function getCatalogKey(codeName) {
  return `${CATALOG_KEY_PREFIX}${normalizeCatalogCode(codeName)}`;
}

function prepareCatalogRecord(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new ApiRequestError("The catalog record is invalid.", 400);
  }

  const codeName = normalizeCatalogCode(source.codeName);
  const name = cleanText(source.name, 150);
  const strength = cleanText(source.strength, 100);
  const price = Number(source.price);
  const unitCost = Number(source.unitCost || 0);
  const quantity = Math.max(0, Math.floor(Number(source.quantity || 0)));
  const availabilityMode = ["in_stock", "preorder", "out_of_stock"].includes(
    source.availabilityMode
  )
    ? source.availabilityMode
    : "in_stock";

  if (!name || !strength) {
    throw new ApiRequestError(
      "Product name and strength are required.",
      400
    );
  }

  if (!Number.isFinite(price) || price < 0 || price > 100000) {
    throw new ApiRequestError("Enter a valid product price.", 400);
  }

  if (!Number.isFinite(unitCost) || unitCost < 0 || unitCost > 100000) {
    throw new ApiRequestError("Enter a valid unit cost.", 400);
  }

  if (!Number.isSafeInteger(quantity) || quantity > 1000000) {
    throw new ApiRequestError("Enter a valid product quantity.", 400);
  }

  const existingStatic = getOrderCatalogItem(codeName) || {};
  const now = new Date().toISOString();

  return {
    productKey: normalizeCatalogProductKey(source.productKey, name),
    productCodeName: cleanText(
      source.productCodeName || codeName,
      100
    ).toUpperCase(),
    name,
    category: cleanText(
      source.category || "Additional Research Products",
      150
    ),
    description: cleanMultilineText(source.description, 2000),
    purity: cleanText(source.purity || "≥ 99% Purity", 100),
    isBestSeller: source.isBestSeller === true,
    codeName,
    strength,
    price: Math.round(price * 100) / 100,
    unitCost: Math.round(unitCost * 100) / 100,
    image: cleanText(source.image || source.imageUrl, 2048),
    imageUrl: cleanText(source.imageUrl || source.image, 2048),
    composition: cleanText(
      source.composition || existingStatic.composition,
      500
    ),
    quantity,
    trackQuantity: source.trackQuantity === true,
    allowPreorder: source.allowPreorder === true,
    availabilityMode,
    hidden: source.hidden === true,
    productHidden: source.productHidden === true,
    lowStockThreshold: Math.max(
      0,
      Math.min(1000000, Math.floor(Number(source.lowStockThreshold || 5)))
    ),
    source: existingStatic.name ? "override" : "new",
    createdAt: cleanText(source.createdAt, 100) || now,
    updatedAt: now,
  };
}

function resolveCatalogAvailability(record) {
  if (record.hidden || record.productHidden) {
    return { key: "hidden", label: "Hidden", purchasable: false };
  }

  if (record.availabilityMode === "out_of_stock") {
    return { key: "out_of_stock", label: "Out of Stock", purchasable: false };
  }

  if (record.availabilityMode === "preorder") {
    return { key: "preorder", label: "Preorder", purchasable: true };
  }

  if (record.trackQuantity === true && Number(record.quantity || 0) <= 0) {
    return record.allowPreorder === true
      ? { key: "preorder", label: "Preorder", purchasable: true }
      : { key: "out_of_stock", label: "Out of Stock", purchasable: false };
  }

  return { key: "in_stock", label: "In Stock", purchasable: true };
}

function toPublicCatalogRecord(record) {
  const availability = resolveCatalogAvailability(record);

  if (availability.key === "hidden") {
    return null;
  }

  return {
    productKey: record.productKey,
    productCodeName: record.productCodeName,
    name: record.name,
    category: record.category,
    description: record.description,
    purity: record.purity,
    isBestSeller: record.isBestSeller,
    codeName: record.codeName,
    strength: record.strength,
    price: record.price,
    image: record.image || record.imageUrl || "",
    imageUrl: record.imageUrl || record.image || "",
    composition: record.composition,
    quantity: record.trackQuantity ? record.quantity : null,
    trackQuantity: record.trackQuantity,
    allowPreorder: record.allowPreorder,
    availabilityMode: record.availabilityMode,
    lowStockThreshold: record.lowStockThreshold,
    availability,
    updatedAt: record.updatedAt,
  };
}

async function getCatalogOverride(env, codeName) {
  return env.DOCUMENTS_KV.get(getCatalogKey(codeName), "json");
}

async function getProtectedCatalogItem(env, codeName) {
  const normalized = normalizeCatalogCode(codeName);
  const override = await getCatalogOverride(env, normalized);

  if (override) {
    const availability = resolveCatalogAvailability(override);

    if (!availability.purchasable) {
      throw new OrderRequestError(
        `Product code ${normalized} is ${availability.label.toLowerCase()}.`,
        409
      );
    }

    return {
      ...override,
      availability,
    };
  }

  const staticItem = getOrderCatalogItem(normalized);

  if (!staticItem) {
    throw new OrderRequestError(
      `Product code ${normalized} is not available.`,
      400
    );
  }

  return {
    ...staticItem,
    codeName: normalized,
    trackQuantity: false,
    availability: {
      key: "in_stock",
      label: "In Stock",
      purchasable: true,
    },
  };
}

async function commitInventoryForPaidOrder(env, order) {
  const orderId = normalizeOrderId(order.orderId || order.id);
  const eventKey = `${INVENTORY_EVENT_KEY_PREFIX}${orderId}`;
  const existingEvent = await env.DOCUMENTS_KV.get(eventKey, "json");

  if (existingEvent) {
    return existingEvent;
  }

  const adjustments = [];

  for (const item of Array.isArray(order.items) ? order.items : []) {
    const codeName = normalizeCatalogCode(item.codeName);
    const record = await getCatalogOverride(env, codeName);

    if (!record || record.trackQuantity !== true) {
      continue;
    }

    const quantity = Math.max(0, Math.floor(Number(record.quantity || 0)));
    const orderedQuantity = Math.max(0, Math.floor(Number(item.quantity || 0)));
    const nextQuantity = Math.max(0, quantity - orderedQuantity);
    const updatedRecord = {
      ...record,
      quantity: nextQuantity,
      updatedAt: new Date().toISOString(),
    };

    await env.DOCUMENTS_KV.put(
      getCatalogKey(codeName),
      JSON.stringify(updatedRecord)
    );

    adjustments.push({
      codeName,
      name: updatedRecord.name,
      strength: updatedRecord.strength,
      previousQuantity: quantity,
      orderedQuantity,
      quantity: nextQuantity,
      unitCost: Number(updatedRecord.unitCost || 0),
      trackQuantity: true,
      reorderLevel: Number(updatedRecord.lowStockThreshold || 0),
      active: !updatedRecord.hidden && !updatedRecord.productHidden,
    });
  }

  const event = {
    orderId,
    adjustments,
    committedAt: new Date().toISOString(),
  };

  await env.DOCUMENTS_KV.put(eventKey, JSON.stringify(event));

  await syncInventoryAdjustmentToWorkspaceBestEffort(
    env,
    event,
    {
      eventId: createAccountingSyncEventId(
        "inventory-sale",
        orderId
      ),
      adjustmentType: "Sale",
      reason: `Paid order ${orderId}`,
      orderId,
      actor: "authorized administrator",
      occurredAt: event.committedAt,
    }
  );
  return event;
}

async function restoreInventoryForCancelledOrder(env, order, actor) {
  const orderId = normalizeOrderId(order.orderId || order.id);
  const restorationKey =
    `${INVENTORY_RESTORATION_KEY_PREFIX}${orderId}`;
  const existingRestoration = await env.DOCUMENTS_KV.get(
    restorationKey,
    "json"
  );

  if (existingRestoration) {
    return existingRestoration;
  }

  const storedInventoryEvent = await env.DOCUMENTS_KV.get(
    `${INVENTORY_EVENT_KEY_PREFIX}${orderId}`,
    "json"
  );
  const inventoryEvent =
    order.inventoryEvent &&
    typeof order.inventoryEvent === "object"
      ? order.inventoryEvent
      : storedInventoryEvent;
  const committedAdjustments = Array.isArray(
    inventoryEvent?.adjustments
  )
    ? inventoryEvent.adjustments
    : [];
  const adjustments = [];

  for (const committed of committedAdjustments) {
    const codeName = normalizeCatalogCode(committed?.codeName);
    const restoredQuantity = Math.max(
      0,
      Math.floor(Number(committed?.orderedQuantity || 0))
    );

    if (!codeName || restoredQuantity <= 0) {
      continue;
    }

    const record = await getCatalogOverride(env, codeName);

    if (!record || record.trackQuantity !== true) {
      adjustments.push({
        codeName,
        restoredQuantity: 0,
        skipped: true,
        reason: "The tracked catalog record is no longer available.",
      });
      continue;
    }

    const previousQuantity = Math.max(
      0,
      Math.floor(Number(record.quantity || 0))
    );
    const nextQuantity = previousQuantity + restoredQuantity;
    const updatedRecord = {
      ...record,
      quantity: nextQuantity,
      updatedAt: new Date().toISOString(),
    };

    await env.DOCUMENTS_KV.put(
      getCatalogKey(codeName),
      JSON.stringify(updatedRecord)
    );

    adjustments.push({
      codeName,
      name: updatedRecord.name,
      strength: updatedRecord.strength,
      previousQuantity,
      restoredQuantity,
      quantity: nextQuantity,
      unitCost: Number(updatedRecord.unitCost || 0),
      trackQuantity: true,
      reorderLevel: Number(updatedRecord.lowStockThreshold || 0),
      active: !updatedRecord.hidden && !updatedRecord.productHidden,
    });
  }

  const restoration = {
    orderId,
    adjustments,
    restoredAt: new Date().toISOString(),
    restoredBy: cleanText(actor, 254) || "authorized administrator",
    sourceCommittedAt: inventoryEvent?.committedAt || null,
  };

  await env.DOCUMENTS_KV.put(
    restorationKey,
    JSON.stringify(restoration)
  );

  return restoration;
}

/* -------------------------------------------------- */
/* GOOGLE SHEETS ACCOUNTING AND INVENTORY SYNC        */
/* -------------------------------------------------- */

function validateAccountingWorkspaceEnvironment(env) {
  if (!cleanText(env.ORDER_WEB_APP_URL, 2048)) {
    throw new ApiRequestError(
      "The Google Workspace service URL is not configured.",
      503
    );
  }

  if (!cleanText(env.ORDER_API_SECRET, 500)) {
    throw new ApiRequestError(
      "The Google Workspace API secret is not configured.",
      503
    );
  }
}

function createAccountingSyncEventId(prefix, value) {
  return cleanText(
    `${prefix}-${value || "event"}-${Date.now()}`,
    100
  );
}

function toWorkspaceInventoryRecord(record) {
  const source = record || {};

  return {
    codeName: cleanText(source.codeName, 100),
    name: cleanText(source.name, 200),
    strength: cleanText(source.strength, 100),
    trackQuantity: source.trackQuantity === true,
    quantity: Math.max(0, Math.floor(Number(source.quantity || 0))),
    reorderLevel: Math.max(
      0,
      Math.floor(Number(source.lowStockThreshold || 0))
    ),
    unitCost: Math.max(0, Number(source.unitCost || 0)),
    active: source.hidden !== true && source.productHidden !== true,
    updatedAt: cleanText(source.updatedAt, 100) || new Date().toISOString(),
    notes: cleanMultilineText(source.notes, 1000),
  };
}

function createWorkspaceInventoryAdjustment(previousRecord, nextRecord) {
  const previous = previousRecord || {};
  const next = nextRecord || {};

  return {
    ...toWorkspaceInventoryRecord(next),
    previousQuantity: Math.max(
      0,
      Math.floor(Number(previous.quantity || 0))
    ),
    quantity: Math.max(
      0,
      Math.floor(Number(next.quantity || 0))
    ),
  };
}

async function syncInventoryAdjustmentToWorkspaceBestEffort(
  env,
  inventoryEvent,
  details = {}
) {
  try {
    validateAccountingWorkspaceEnvironment(env);

    await sendOrderWorkflowToWorkspace(env, {
      action: "inventory_adjustment",
      eventId:
        cleanText(details.eventId, 100) ||
        createAccountingSyncEventId("inventory", "adjustment"),
      inventoryEvent,
      adjustmentType: cleanText(details.adjustmentType, 100),
      reason: cleanMultilineText(details.reason, 1000),
      orderId: cleanText(
        details.orderId || inventoryEvent?.orderId,
        50
      ),
      actor: cleanText(details.actor, 254),
      occurredAt: cleanText(details.occurredAt, 100),
    });
  } catch (error) {
    console.error(
      "Google Sheets inventory sync failed:",
      error
    );
  }
}

async function syncOrderCancellationToWorkspaceBestEffort(
  env,
  order,
  eventId
) {
  try {
    validateAccountingWorkspaceEnvironment(env);

    await sendOrderWorkflowToWorkspace(env, {
      action: "order_cancelled",
      eventId: cleanText(eventId, 100),
      order,
      cancellation: order.cancellation || null,
      inventoryRestoration: order.inventoryRestoration || null,
    });
  } catch (error) {
    console.error(
      `Google Sheets cancellation sync failed for order ${
        order.orderId || order.id
      }:`,
      error
    );
  }
}

async function handleAdminAccountingSyncRequest(request, env) {
  try {
    validateStorage(env);
    await requireAdmin(request, env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    validateAccountingWorkspaceEnvironment(env);

    const [catalogRecords, orders] = await Promise.all([
      listRecordsByPrefix(
        env.DOCUMENTS_KV,
        CATALOG_KEY_PREFIX
      ),
      listRecordsByPrefix(
        env.DOCUMENTS_KV,
        ORDER_KEY_PREFIX
      ),
    ]);

    const inventory = catalogRecords
      .map(toWorkspaceInventoryRecord)
      .filter((record) => record.codeName);
    const eventId = createAccountingSyncEventId(
      "accounting-full-sync",
      orders.length
    );

    const workspaceResult = await sendOrderWorkflowToWorkspace(
      env,
      {
        action: "accounting_full_sync",
        eventId,
        inventory,
        orders,
      }
    );

    return jsonResponse({
      success: true,
      eventId,
      inventoryCount: inventory.length,
      orderCount: orders.length,
      workspaceResult,
      message: `Copied ${inventory.length} inventory records and ${orders.length} orders to Google Sheets.`,
    });
  } catch (error) {
    console.error("Accounting full sync error:", error);
    return handleApiError(error);
  }
}

/* -------------------------------------------------- */
/* COUPON API                                         */
/* -------------------------------------------------- */

async function handleCouponValidationRequest(request, env) {
  try {
    validateStorage(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    validateJsonContentType(request);
    const body = await readJsonRequest(
      request,
      MAX_DOCUMENT_REQUEST_LENGTH,
      "coupon validation"
    );
    const subtotalCents = normalizeWorkflowMoneyCents(
      body.subtotalCents,
      Math.round(Number(body.subtotal || 0) * 100),
      "coupon subtotal"
    );
    const result = await validateCouponForOrder(
      env,
      body.code,
      subtotalCents
    );

    return jsonResponse({
      success: true,
      valid: true,
      coupon: toPublicCouponRecord(result.record),
      discountCents: result.discountCents,
      freeShipping: result.freeShipping,
      message: buildCouponMessage(result.record, result.discountCents),
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return handleApiError(error);
  }
}

async function handleAdminCouponsRequest(request, env, url) {
  try {
    validateStorage(env);
    await requireAdmin(request, env);

    if (request.method === "GET") {
      const records = await listRecordsByPrefix(
        env.DOCUMENTS_KV,
        COUPON_KEY_PREFIX
      );

      return jsonResponse({
        success: true,
        records: records
          .filter((record) => !record.redemptionEvent)
          .sort((left, right) =>
            String(right.updatedAt || "").localeCompare(
              String(left.updatedAt || "")
            )
          ),
      });
    }

    if (request.method === "POST" || request.method === "PUT") {
      validateJsonContentType(request);
      const body = await readJsonRequest(
        request,
        MAX_DOCUMENT_REQUEST_LENGTH,
        "coupon update"
      );
      const existing = body.code
        ? await getCouponRecord(env, body.code)
        : null;
      const record = prepareCouponRecord(
        body.coupon || body.record || body,
        existing
      );

      await env.DOCUMENTS_KV.put(
        getCouponKey(record.code),
        JSON.stringify(record),
        {
          metadata: {
            code: record.code,
            active: record.active,
            startsAt: record.startsAt,
            endsAt: record.endsAt,
            updatedAt: record.updatedAt,
          },
        }
      );

      return jsonResponse({
        success: true,
        record,
        message: `Coupon ${record.code} saved.`,
      });
    }

    if (request.method === "DELETE") {
      const code = normalizeCouponCode(url.searchParams.get("code"));
      const record = await getCouponRecord(env, code);

      if (!record) {
        throw new ApiRequestError("Coupon not found.", 404);
      }

      const disabledRecord = {
        ...record,
        active: false,
        archived: true,
        updatedAt: new Date().toISOString(),
      };

      await env.DOCUMENTS_KV.put(
        getCouponKey(code),
        JSON.stringify(disabledRecord)
      );

      return jsonResponse({
        success: true,
        record: disabledRecord,
        message: `Coupon ${code} disabled.`,
      });
    }

    throw new ApiRequestError("Method not allowed.", 405);
  } catch (error) {
    console.error("Admin coupon request error:", error);
    return handleApiError(error);
  }
}

function normalizeCouponCode(value) {
  const code = cleanText(value, 50).toUpperCase();

  if (!/^[A-Z0-9][A-Z0-9_-]{2,49}$/.test(code)) {
    throw new ApiRequestError(
      "Coupon codes must contain 3 to 50 letters, numbers, dashes, or underscores.",
      400
    );
  }

  return code;
}

function getCouponKey(code) {
  return `${COUPON_KEY_PREFIX}${normalizeCouponCode(code)}`;
}

async function getCouponRecord(env, code) {
  if (!code) {
    return null;
  }

  return env.DOCUMENTS_KV.get(getCouponKey(code), "json");
}

function normalizeCouponDate(value, label) {
  const text = cleanText(value, 100);

  if (!text) {
    return "";
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    throw new ApiRequestError(`Enter a valid ${label}.`, 400);
  }

  return parsed.toISOString();
}

function prepareCouponRecord(source, existing = null) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new ApiRequestError("The coupon record is invalid.", 400);
  }

  const code = normalizeCouponCode(source.code || existing?.code);
  const type = ["percent", "fixed", "free_shipping"].includes(source.type)
    ? source.type
    : existing?.type || "percent";
  const amount = Number(source.amount ?? existing?.amount ?? 0);
  const minimumSubtotal = Number(
    source.minimumSubtotal ?? existing?.minimumSubtotal ?? 0
  );
  const maxRedemptions = Math.max(
    0,
    Math.floor(
      Number(source.maxRedemptions ?? existing?.maxRedemptions ?? 0)
    )
  );
  const now = new Date().toISOString();

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    (type === "percent" && amount > 100) ||
    (type === "fixed" && amount > 100000)
  ) {
    throw new ApiRequestError("Enter a valid coupon amount.", 400);
  }

  if (!Number.isFinite(minimumSubtotal) || minimumSubtotal < 0) {
    throw new ApiRequestError("Enter a valid minimum order amount.", 400);
  }

  const startsAt = normalizeCouponDate(
    source.startsAt ?? existing?.startsAt,
    "coupon start date"
  );
  const endsAt = normalizeCouponDate(
    source.endsAt ?? existing?.endsAt,
    "coupon expiration date"
  );

  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new ApiRequestError(
      "The coupon expiration must be after its start date.",
      400
    );
  }

  return {
    code,
    description: cleanText(
      source.description ?? existing?.description,
      300
    ),
    type,
    amount: Math.round(amount * 100) / 100,
    minimumSubtotal: Math.round(minimumSubtotal * 100) / 100,
    startsAt,
    endsAt,
    maxRedemptions,
    redemptionCount: Math.max(
      0,
      Math.floor(Number(existing?.redemptionCount || 0))
    ),
    active: source.active !== false,
    archived: source.archived === true,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function toPublicCouponRecord(record) {
  return {
    code: record.code,
    description: record.description,
    type: record.type,
    amount: record.amount,
    minimumSubtotal: record.minimumSubtotal,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
  };
}

function assertCouponAvailable(record, subtotalCents) {
  if (!record || record.archived || record.active === false) {
    throw new ApiRequestError("That coupon is not active.", 409);
  }

  const now = Date.now();

  if (record.startsAt && new Date(record.startsAt).getTime() > now) {
    throw new ApiRequestError("That coupon is scheduled but not active yet.", 409);
  }

  if (record.endsAt && new Date(record.endsAt).getTime() < now) {
    throw new ApiRequestError("That coupon has expired.", 409);
  }

  if (
    Number(record.maxRedemptions || 0) > 0 &&
    Number(record.redemptionCount || 0) >= Number(record.maxRedemptions)
  ) {
    throw new ApiRequestError("That coupon has reached its usage limit.", 409);
  }

  const minimumCents = Math.round(
    Number(record.minimumSubtotal || 0) * 100
  );

  if (subtotalCents < minimumCents) {
    throw new ApiRequestError(
      `This coupon requires a product subtotal of at least $${(
        minimumCents / 100
      ).toFixed(2)}.`,
      409
    );
  }
}

function calculateCouponResult(record, subtotalCents) {
  let discountCents = 0;
  let freeShipping = false;

  if (record.type === "percent") {
    discountCents = Math.round(
      subtotalCents * (Number(record.amount || 0) / 100)
    );
  } else if (record.type === "fixed") {
    discountCents = Math.round(Number(record.amount || 0) * 100);
  } else if (record.type === "free_shipping") {
    freeShipping = true;
  }

  return {
    discountCents: Math.min(subtotalCents, Math.max(0, discountCents)),
    freeShipping,
  };
}

async function validateCouponForOrder(env, rawCode, subtotalCents) {
  const code = normalizeCouponCode(rawCode);
  const record = await getCouponRecord(env, code);

  assertCouponAvailable(record, subtotalCents);

  return {
    record,
    ...calculateCouponResult(record, subtotalCents),
  };
}

function buildCouponMessage(record, discountCents) {
  if (record.type === "free_shipping") {
    return `${record.code} applied for free shipping.`;
  }

  return `${record.code} applied. You saved $${(
    Number(discountCents || 0) / 100
  ).toFixed(2)}.`;
}

async function commitCouponRedemptionForPaidOrder(env, order) {
  const couponCode = cleanText(order.couponCode, 50).toUpperCase();

  if (!couponCode) {
    return null;
  }

  const orderId = normalizeOrderId(order.orderId || order.id);
  const eventKey = `${COUPON_REDEMPTION_KEY_PREFIX}${orderId}`;
  const existingEvent = await env.DOCUMENTS_KV.get(eventKey, "json");

  if (existingEvent) {
    return existingEvent;
  }

  const record = await getCouponRecord(env, couponCode);

  if (!record) {
    return null;
  }

  const updatedRecord = {
    ...record,
    redemptionCount: Math.max(0, Number(record.redemptionCount || 0)) + 1,
    updatedAt: new Date().toISOString(),
  };
  const event = {
    redemptionEvent: true,
    orderId,
    couponCode,
    discount: Number(order.discount || 0),
    redeemedAt: new Date().toISOString(),
  };

  await env.DOCUMENTS_KV.put(
    getCouponKey(couponCode),
    JSON.stringify(updatedRecord)
  );
  await env.DOCUMENTS_KV.put(eventKey, JSON.stringify(event));

  return event;
}


/* -------------------------------------------------- */
/* DOCUMENTATION API                                  */
/* -------------------------------------------------- */


/* -------------------------------------------------- */
/* SHIPPING LABEL API                                 */
/* -------------------------------------------------- */

async function handleAdminShippingRequest(request, env, url) {
  try {
    validateStorage(env);
    await requireAdmin(request, env);

    if (url.pathname === "/api/admin/shipping/settings") {
      const providerStatus = getShippoProviderStatus(env);

      if (request.method === "GET") {
        const settings =
          (await env.DOCUMENTS_KV.get(SHIPPING_SETTINGS_KEY, "json")) || null;
        return jsonResponse({
          success: true,
          ...providerStatus,
          settings,
        });
      }

      if (request.method === "POST" || request.method === "PUT") {
        validateJsonContentType(request);
        const body = await readJsonRequest(
          request,
          MAX_DOCUMENT_REQUEST_LENGTH,
          "shipping settings"
        );
        const settings = prepareShippingSettings(body.settings || body);
        await env.DOCUMENTS_KV.put(
          SHIPPING_SETTINGS_KEY,
          JSON.stringify(settings)
        );
        return jsonResponse({
          success: true,
          ...providerStatus,
          settings,
          message: "Shipping settings saved.",
        });
      }

      throw new ApiRequestError("Method not allowed.", 405);
    }

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    if (!env.SHIPPO_API_TOKEN) {
      throw new ApiRequestError(
        "Shippo is not connected. Add the SHIPPO_API_TOKEN Cloudflare secret first.",
        503
      );
    }

    validateJsonContentType(request);
    const body = await readJsonRequest(
      request,
      MAX_ORDER_WORKFLOW_REQUEST_LENGTH,
      "shipping label request"
    );

    if (url.pathname === "/api/admin/shipping/rates") {
      return createShippingRates(body, env);
    }

    if (url.pathname === "/api/admin/shipping/buy") {
      return buyShippingLabel(body, env);
    }

    if (url.pathname === "/api/admin/shipping/refund") {
      return refundShippingLabel(body, env);
    }

    if (url.pathname === "/api/admin/shipping/refund-status") {
      return refreshShippingRefundStatuses(body, env);
    }

    if (url.pathname === "/api/admin/shipping/tracking-status") {
      return refreshShipmentTrackingStatuses(body, env);
    }

    throw new ApiRequestError("Shipping route not found.", 404);
  } catch (error) {
    console.error("Shipping label request error:", error);
    return handleApiError(error);
  }
}

function getShippoProviderStatus(env) {
  const token = String(env.SHIPPO_API_TOKEN || "");
  return {
    configured: Boolean(token),
    provider: "Shippo",
    mode: token.startsWith("shippo_live_")
      ? "live"
      : token.startsWith("shippo_test_")
        ? "test"
        : token
          ? "unknown"
          : "not_connected",
  };
}

function prepareShippingSettings(source) {
  const settings = {
    fromName: cleanText(source.fromName, 120),
    company: cleanText(source.company, 120),
    street1: cleanText(source.street1, 200),
    street2: cleanText(source.street2, 200),
    city: cleanText(source.city, 100),
    state: cleanText(source.state, 50).toUpperCase(),
    zip: cleanText(source.zip, 20),
    country: cleanText(source.country || "US", 2).toUpperCase(),
    phone: normalizeShippoPhone(source.phone),
    email: cleanText(source.email, 254).toLowerCase(),
    defaultLength: normalizeShippingMeasurement(source.defaultLength, 8),
    defaultWidth: normalizeShippingMeasurement(source.defaultWidth, 6),
    defaultHeight: normalizeShippingMeasurement(source.defaultHeight, 4),
    defaultWeight: normalizeShippingMeasurement(source.defaultWeight, 8),
    updatedAt: new Date().toISOString(),
  };

  if (
    !settings.fromName ||
    !settings.street1 ||
    !settings.city ||
    !settings.state ||
    !settings.zip ||
    !settings.email ||
    !settings.phone
  ) {
    throw new ApiRequestError(
      "Complete the shipping name, street, city, state, ZIP, email, and phone.",
      400
    );
  }

  return settings;
}

function normalizeShippoPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const normalized = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;

  if (normalized.length < 8 || normalized.length > 15) {
    return "";
  }

  return normalized;
}

function normalizeShippingMeasurement(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 1000) {
    return fallback;
  }
  return Math.round(number * 100) / 100;
}

async function getShippingSettings(env) {
  const settings = await env.DOCUMENTS_KV.get(SHIPPING_SETTINGS_KEY, "json");
  if (!settings) {
    throw new ApiRequestError(
      "Save the origin address and default package in Shipping Center first.",
      409
    );
  }
  return settings;
}

function buildShippoAddressFromOrder(order) {
  const customer = order.customer || {};
  return {
    name: cleanText(
      `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
      120
    ),
    street1: cleanText(customer.address, 200),
    city: cleanText(customer.city, 100),
    state: cleanText(customer.state, 50),
    zip: cleanText(customer.zip, 20),
    country: "US",
    email: cleanText(customer.email, 254),
    is_residential: true,
  };
}

function buildShippoOrigin(settings) {
  return {
    name: settings.fromName,
    company: settings.company || undefined,
    street1: settings.street1,
    street2: settings.street2 || undefined,
    city: settings.city,
    state: settings.state,
    zip: settings.zip,
    country: settings.country || "US",
    phone: settings.phone || undefined,
    email: settings.email,
  };
}

async function validateShippoRecipientAddress(order, env) {
  const submittedAddress = buildShippoAddressFromOrder(order);
  const validatedAddress = await shippoRequest(env, "/addresses/", {
    method: "POST",
    body: {
      ...submittedAddress,
      validate: true,
    },
  });

  const validationResults = validatedAddress.validation_results || {};
  const validationMessages = Array.isArray(validationResults.messages)
    ? validationResults.messages
        .map(function (entry) {
          return cleanText(entry?.text || entry?.message || entry?.detail, 300);
        })
        .filter(Boolean)
    : [];

  if (validationResults.is_valid === false) {
    throw new ApiRequestError(
      `Recipient address invalid: ${validationMessages.join(" ") || "Address could not be verified."}`,
      400
    );
  }

  if (validatedAddress.is_complete === false) {
    throw new ApiRequestError(
      "Recipient address is incomplete. Correct the order address before requesting shipping rates.",
      400
    );
  }

  return {
    name: cleanText(validatedAddress.name || submittedAddress.name, 120),
    street1: cleanText(validatedAddress.street1 || submittedAddress.street1, 200),
    street2: cleanText(validatedAddress.street2 || submittedAddress.street2, 200) || undefined,
    city: cleanText(validatedAddress.city || submittedAddress.city, 100),
    state: cleanText(validatedAddress.state || submittedAddress.state, 50),
    zip: cleanText(validatedAddress.zip || submittedAddress.zip, 20),
    country: cleanText(validatedAddress.country || submittedAddress.country || "US", 2),
    email: cleanText(validatedAddress.email || submittedAddress.email, 254),
    is_residential:
      typeof validatedAddress.is_residential === "boolean"
        ? validatedAddress.is_residential
        : true,
  };
}

async function createShippingRates(body, env) {
  const orderId = normalizeOrderId(body.orderId);
  const order = await getOrderRecord(env, orderId);
  if (!order) {
    throw new ApiRequestError(`Order ${orderId} was not found.`, 404);
  }

  const settings = await getShippingSettings(env);
  const parcelSource = body.parcel || {};
  const parcel = {
    length: normalizeShippingMeasurement(
      parcelSource.length,
      settings.defaultLength
    ),
    width: normalizeShippingMeasurement(
      parcelSource.width,
      settings.defaultWidth
    ),
    height: normalizeShippingMeasurement(
      parcelSource.height,
      settings.defaultHeight
    ),
    weight: normalizeShippingMeasurement(
      parcelSource.weight,
      settings.defaultWeight
    ),
  };

  const validatedRecipientAddress = await validateShippoRecipientAddress(order, env);

  const shipment = await shippoRequest(env, "/shipments/", {
    method: "POST",
    body: {
      address_from: buildShippoOrigin(settings),
      address_to: validatedRecipientAddress,
      parcels: [
        {
          length: String(parcel.length),
          width: String(parcel.width),
          height: String(parcel.height),
          distance_unit: "in",
          weight: String(parcel.weight),
          mass_unit: "oz",
        },
      ],
      async: false,
      metadata: orderId,
    },
  });

  if (String(shipment.status || "").toUpperCase() !== "SUCCESS") {
    throw new ApiRequestError(
      shippoMessage(shipment) || "Shippo could not create a valid shipment quote.",
      502
    );
  }

  const rates = (Array.isArray(shipment.rates) ? shipment.rates : [])
    .map(function (rate) {
      const serviceLevel = rate.servicelevel || {};
      return {
        id: cleanText(rate.object_id, 120),
        carrier: cleanText(rate.provider, 80),
        service: cleanText(
          serviceLevel.name || serviceLevel.token || "Standard",
          100
        ),
        serviceToken: cleanText(serviceLevel.token, 100),
        rate: Number(rate.amount || 0),
        retailRate: Number(rate.amount_local || 0),
        currency: cleanText(rate.currency || "USD", 10),
        deliveryDays: Number.isFinite(Number(rate.estimated_days))
          ? Number(rate.estimated_days)
          : null,
        deliveryDate: cleanText(rate.arrives_by, 50),
        durationTerms: cleanText(rate.duration_terms, 300),
      };
    })
    .filter(function (rate) {
      return rate.id && rate.rate > 0;
    })
    .sort(function (left, right) {
      return left.rate - right.rate;
    });

  return jsonResponse({
    success: true,
    provider: "Shippo",
    mode: getShippoProviderStatus(env).mode,
    orderId,
    shipmentId: cleanText(shipment.object_id, 120),
    parcel,
    rates,
    message: rates.length
      ? `${rates.length} shipping rate(s) found.`
      : "No shipping rates were returned for this package.",
  });
}

async function buyShippingLabel(body, env) {
  const orderId = normalizeOrderId(body.orderId);
  const shipmentId = cleanText(body.shipmentId, 120);
  const rateId = cleanText(body.rateId, 120);

  if (!/^[a-f0-9]{32}$/i.test(shipmentId)) {
    throw new ApiRequestError("The shipping quote is invalid.", 400);
  }
  if (!/^[a-f0-9]{32}$/i.test(rateId)) {
    throw new ApiRequestError("Choose a valid shipping rate.", 400);
  }

  const order = await getOrderRecord(env, orderId);
  if (!order) {
    throw new ApiRequestError(`Order ${orderId} was not found.`, 404);
  }

  const settings = await getShippingSettings(env);
  const origin = buildShippoOrigin(settings);
  if (!origin.email || !origin.phone) {
    throw new ApiRequestError(
      "Shipping Center must contain both a valid sender email and phone number before purchasing USPS postage.",
      409
    );
  }

  const existingLabels = Array.isArray(order.shippingLabels)
    ? order.shippingLabels
    : [];
  const labelAlreadyPurchased = existingLabels.some(function (entry) {
    return (
      cleanText(entry?.shipmentId || entry?.shipment_id, 120) === shipmentId ||
      cleanText(entry?.rateId || entry?.rate_id, 120) === rateId
    );
  });

  if (labelAlreadyPurchased) {
    throw new ApiRequestError(
      "A shipping label has already been purchased from this quote. Request fresh rates before purchasing another label.",
      409
    );
  }

  const [rate, quotedShipment] = await Promise.all([
    shippoRequest(
      env,
      `/rates/${encodeURIComponent(rateId)}`,
      { method: "GET" }
    ),
    shippoRequest(
      env,
      `/shipments/${encodeURIComponent(shipmentId)}`,
      { method: "GET" }
    ),
  ]);

  if (
    cleanText(rate.shipment, 120) &&
    cleanText(rate.shipment, 120) !== shipmentId
  ) {
    throw new ApiRequestError(
      "The selected rate does not belong to this shipping quote.",
      400
    );
  }

  const serviceLevel = rate.servicelevel || {};
  const carrierAccount = cleanText(rate.carrier_account, 120);
  const serviceToken = cleanText(
    serviceLevel.token || rate.servicelevel_token,
    100
  );
  const parcels = Array.isArray(quotedShipment.parcels)
    ? quotedShipment.parcels.map(function (parcel) {
        if (typeof parcel === "string") return parcel;
        const parcelId = cleanText(parcel?.object_id, 120);
        if (parcelId) return parcelId;
        return {
          length: String(parcel?.length || ""),
          width: String(parcel?.width || ""),
          height: String(parcel?.height || ""),
          distance_unit: cleanText(parcel?.distance_unit || "in", 10),
          weight: String(parcel?.weight || ""),
          mass_unit: cleanText(parcel?.mass_unit || "oz", 10),
        };
      })
    : [];

  if (!carrierAccount || !serviceToken || !parcels.length) {
    throw new ApiRequestError(
      "Shippo did not return enough information to purchase the selected rate. Request fresh rates and try again.",
      409
    );
  }

  const transaction = await shippoRequest(env, "/transactions/", {
    method: "POST",
    body: {
      rate: rateId,
      label_file_type: "PDF",
      async: false,
      metadata: orderId,
    },
  });

  if (String(transaction.status || "").toUpperCase() !== "SUCCESS") {
    throw new ApiRequestError(
      shippoMessage(transaction) || "Shippo could not create the shipping label.",
      502
    );
  }

  const transactionRate =
    transaction && typeof transaction.rate === "object"
      ? transaction.rate
      : rate;
  const transactionServiceLevel = transactionRate.servicelevel || serviceLevel;
  const label = {
    labelId: cleanText(transaction.object_id, 120),
    orderId,
    shipmentId,
    rateId,
    provider: "Shippo",
    carrier: cleanText(transactionRate.provider || rate.provider, 80),
    service: cleanText(
      transactionServiceLevel.name ||
        transactionServiceLevel.token ||
        serviceLevel.name ||
        serviceToken ||
        "Standard",
      100
    ),
    postage: Number(transactionRate.amount || rate.amount || 0),
    trackingNumber: cleanText(transaction.tracking_number, 200),
    trackingUrl: cleanText(transaction.tracking_url_provider, 2048),
    labelUrl: cleanText(transaction.label_url, 2048),
    test: Boolean(transaction.test),
    purchasedAt:
      cleanText(transaction.object_created, 80) || new Date().toISOString(),
  };

  if (!label.trackingNumber || !label.labelUrl) {
    throw new ApiRequestError(
      "The label was created, but Shippo did not return tracking and a printable label.",
      502
    );
  }

  const updatedOrder = {
    ...order,
    shippingLabels: [...existingLabels, label].slice(-50),
    updatedAt: new Date().toISOString(),
  };
  await putOrderRecord(env, updatedOrder);
  await env.DOCUMENTS_KV.put(
    `${SHIPPING_LABEL_KEY_PREFIX}${label.labelId || label.shipmentId}`,
    JSON.stringify(label)
  );

  return jsonResponse({
    success: true,
    order: updatedOrder,
    label,
    message: label.test
      ? "Test label created. Print it only for workflow testing; it is not valid postage."
      : "Shipping label purchased. Print it, then record the shipment to email the customer.",
  });
}

async function refundShippingLabel(body, env) {
  const orderId = normalizeOrderId(body.orderId);
  const labelId = cleanText(body.labelId || body.transactionId, 120);

  if (!/^[a-f0-9]{32}$/i.test(labelId)) {
    throw new ApiRequestError("Choose a valid shipping label to refund.", 400);
  }

  const order = await getOrderRecord(env, orderId);
  if (!order) {
    throw new ApiRequestError(`Order ${orderId} was not found.`, 404);
  }

  const existingLabels = Array.isArray(order.shippingLabels)
    ? order.shippingLabels
    : [];
  const labelIndex = existingLabels.findIndex(function (entry) {
    return cleanText(entry?.labelId || entry?.transactionId, 120) === labelId;
  });

  if (labelIndex < 0) {
    throw new ApiRequestError("That shipping label is not attached to this order.", 404);
  }

  const existingLabel = existingLabels[labelIndex];

  if (existingLabel?.test === true || String(existingLabel?.test).toLowerCase() === "true") {
    throw new ApiRequestError(
      "Test labels do not use real postage and do not need a refund.",
      409
    );
  }

  const existingRefundStatus = cleanText(existingLabel?.refundStatus, 30).toUpperCase();
  if (existingRefundStatus) {
    throw new ApiRequestError(
      `A refund result has already been recorded for this label (${existingRefundStatus}).`,
      409
    );
  }

  const labelTrackingNumber = cleanText(existingLabel?.trackingNumber, 200);
  const shipmentAlreadyRecorded = Array.isArray(order.shipments) &&
    order.shipments.some(function (shipment) {
      return (
        labelTrackingNumber &&
        cleanText(shipment?.trackingNumber, 200) === labelTrackingNumber
      );
    });

  if (shipmentAlreadyRecorded) {
    throw new ApiRequestError(
      "This label is attached to a recorded shipment and cannot be refunded here.",
      409
    );
  }

  const refundResult = await shippoRequest(env, "/refunds/", {
    method: "POST",
    body: { transaction: labelId },
  });
  const refundStatus = cleanText(refundResult.status, 30).toUpperCase() || "QUEUED";
  const now = new Date().toISOString();
  const updatedLabel = {
    ...existingLabel,
    refundId: cleanText(refundResult.object_id, 120),
    refundStatus,
    refundRequestedAt:
      cleanText(refundResult.object_created, 80) || now,
    refundUpdatedAt:
      cleanText(refundResult.object_updated, 80) || now,
    refundError:
      refundStatus === "ERROR" ? shippoMessage(refundResult) : "",
  };
  const updatedLabels = existingLabels.map(function (entry, index) {
    return index === labelIndex ? updatedLabel : entry;
  });
  const updatedOrder = {
    ...order,
    shippingLabels: updatedLabels,
    updatedAt: now,
  };

  await putOrderRecord(env, updatedOrder);
  await env.DOCUMENTS_KV.put(
    `${SHIPPING_LABEL_KEY_PREFIX}${labelId}`,
    JSON.stringify(updatedLabel)
  );

  return jsonResponse({
    success: true,
    order: updatedOrder,
    label: updatedLabel,
    refund: refundResult,
    message:
      refundStatus === "SUCCESS"
        ? "The shipping label refund was accepted."
        : refundStatus === "ERROR"
          ? "Shippo rejected the shipping label refund."
          : `The shipping label refund was submitted (${refundStatus}).`,
  });
}

async function refreshShippingRefundStatuses(body, env) {
  const orderId = normalizeOrderId(body.orderId);
  const order = await getOrderRecord(env, orderId);

  if (!order) {
    throw new ApiRequestError(`Order ${orderId} was not found.`, 404);
  }

  const existingLabels = Array.isArray(order.shippingLabels)
    ? order.shippingLabels
    : [];
  const updatedLabels = existingLabels.slice();
  const refreshedLabels = [];
  let changedCount = 0;

  for (let index = 0; index < existingLabels.length; index += 1) {
    const existingLabel = existingLabels[index];
    const currentStatus = cleanText(existingLabel?.refundStatus, 30).toUpperCase();
    const refundId = cleanText(existingLabel?.refundId, 120);

    if (!["QUEUED", "PENDING"].includes(currentStatus)) {
      continue;
    }

    if (!/^[a-f0-9]{32}$/i.test(refundId)) {
      continue;
    }

    const refundResult = await shippoRequest(
      env,
      `/refunds/${encodeURIComponent(refundId)}`,
      { method: "GET" }
    );
    const returnedRefundId = cleanText(refundResult.object_id, 120);
    const returnedTransactionId = cleanText(refundResult.transaction, 120);
    const labelId = cleanText(
      existingLabel?.labelId || existingLabel?.transactionId,
      120
    );

    if (returnedRefundId && returnedRefundId !== refundId) {
      throw new ApiRequestError(
        "Shippo returned a different refund record than the one requested.",
        502
      );
    }

    if (returnedTransactionId && labelId && returnedTransactionId !== labelId) {
      throw new ApiRequestError(
        "Shippo returned a refund belonging to a different shipping label.",
        502
      );
    }

    const nextStatus =
      cleanText(refundResult.status, 30).toUpperCase() || currentStatus;
    const now = new Date().toISOString();
    const nextRefundUpdatedAt =
      cleanText(refundResult.object_updated, 80) ||
      cleanText(existingLabel?.refundUpdatedAt, 80) ||
      now;
    const nextRefundError =
      nextStatus === "ERROR"
        ? shippoMessage(refundResult) || "Shippo rejected this refund."
        : "";
    const updatedLabel = {
      ...existingLabel,
      refundId: returnedRefundId || refundId,
      refundStatus: nextStatus,
      refundRequestedAt:
        cleanText(existingLabel?.refundRequestedAt, 80) ||
        cleanText(refundResult.object_created, 80) ||
        now,
      refundUpdatedAt: nextRefundUpdatedAt,
      refundError: nextRefundError,
    };
    const labelChanged =
      nextStatus !== currentStatus ||
      nextRefundUpdatedAt !== cleanText(existingLabel?.refundUpdatedAt, 80) ||
      nextRefundError !== cleanText(existingLabel?.refundError, 1000);

    refreshedLabels.push(updatedLabel);

    if (labelChanged) {
      updatedLabels[index] = updatedLabel;
      changedCount += 1;

      await env.DOCUMENTS_KV.put(
        `${SHIPPING_LABEL_KEY_PREFIX}${labelId || refundId}`,
        JSON.stringify(updatedLabel)
      );
    }
  }

  if (refreshedLabels.length === 0) {
    return jsonResponse({
      success: true,
      order,
      labels: [],
      refreshedCount: 0,
      changedCount: 0,
      message: "No pending shipping label refunds were found.",
    });
  }

  if (changedCount === 0) {
    return jsonResponse({
      success: true,
      order,
      labels: refreshedLabels,
      refreshedCount: refreshedLabels.length,
      changedCount: 0,
      message: "Pending shipping label refund statuses are unchanged.",
    });
  }

  const updatedOrder = {
    ...order,
    shippingLabels: updatedLabels,
    updatedAt: new Date().toISOString(),
  };

  await putOrderRecord(env, updatedOrder);

  return jsonResponse({
    success: true,
    order: updatedOrder,
    labels: refreshedLabels,
    refreshedCount: refreshedLabels.length,
    changedCount,
    message: changedCount
      ? `${changedCount} shipping label refund status update(s) found.`
      : "Pending shipping label refund statuses are unchanged.",
  });
}

async function refreshShipmentTrackingStatuses(body, env) {
  const orderId = normalizeOrderId(body.orderId);
  const order = await getOrderRecord(env, orderId);
  const forceRefresh = body?.force === true;

  if (!order) {
    throw new ApiRequestError(`Order ${orderId} was not found.`, 404);
  }

  const existingShipments = Array.isArray(order.shipments)
    ? order.shipments
    : [];
  const updatedShipments = existingShipments.slice();
  const refreshedShipments = [];
  const checkedAt = new Date().toISOString();
  let checkedCount = 0;
  let changedCount = 0;
  let notificationAttemptCount = 0;
  let notificationSentCount = 0;

  for (let index = 0; index < existingShipments.length; index += 1) {
    const existingShipment = existingShipments[index];
    const normalizedCarrier = cleanText(existingShipment?.carrier, 50)
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
    const carrierTokens = {
      usps: "usps",
      ups: "ups",
      fedex: "fedex",
    };
    const carrierToken = carrierTokens[normalizedCarrier];
    const trackingNumber = cleanText(
      existingShipment?.trackingNumber,
      MAX_ORDER_SHIPMENT_TRACKING_LENGTH
    );
    const currentStatus = cleanText(
      existingShipment?.trackingStatus,
      50
    ).toUpperCase();
    const lastCheckedAt = Date.parse(
      cleanText(existingShipment?.trackingLastCheckedAt, 80)
    );
    const refreshDue =
      forceRefresh ||
      !Number.isFinite(lastCheckedAt) ||
      Date.now() - lastCheckedAt >= 15 * 60 * 1000;
    const lastNotifiedStatus = cleanText(
      existingShipment?.trackingNotificationStatus,
      50
    ).toUpperCase();
    const notificationPending =
      Boolean(currentStatus) &&
      currentStatus !== "UNKNOWN" &&
      currentStatus !== lastNotifiedStatus;

    if (
      !carrierToken ||
      !trackingNumber ||
      (!refreshDue && !notificationPending)
    ) {
      continue;
    }

    if (
      ["DELIVERED", "RETURNED"].includes(currentStatus) &&
      !notificationPending
    ) {
      continue;
    }

    checkedCount += 1;
    let updatedShipment;

    try {
      const trackingResult = await shippoRequest(
        env,
        `/tracks/${carrierToken}/${encodeURIComponent(trackingNumber)}`,
        { method: "GET" }
      );
      const returnedTrackingNumber = cleanText(
        trackingResult.tracking_number,
        MAX_ORDER_SHIPMENT_TRACKING_LENGTH
      );
      const expectedTrackingKey = trackingNumber
        .replace(/[\s-]+/g, "")
        .toUpperCase();
      const returnedTrackingKey = returnedTrackingNumber
        .replace(/[\s-]+/g, "")
        .toUpperCase();

      if (returnedTrackingKey && returnedTrackingKey !== expectedTrackingKey) {
        throw new ApiRequestError(
          "Shippo returned tracking information for a different package.",
          502
        );
      }

      const trackingStatus =
        trackingResult.tracking_status &&
        typeof trackingResult.tracking_status === "object"
          ? trackingResult.tracking_status
          : {};
      const trackingLocation =
        trackingStatus.location &&
        typeof trackingStatus.location === "object"
          ? trackingStatus.location
          : {};
      const nextLocation = [
        cleanText(trackingLocation.city, 100),
        cleanText(trackingLocation.state, 50),
        cleanText(trackingLocation.zip, 20),
        cleanText(trackingLocation.country, 2),
      ]
        .filter(Boolean)
        .join(", ");

      updatedShipment = {
        ...existingShipment,
        trackingStatus:
          cleanText(trackingStatus.status, 50).toUpperCase() ||
          currentStatus ||
          "UNKNOWN",
        trackingStatusDetails: cleanMultilineText(
          trackingStatus.status_details,
          1000
        ),
        trackingStatusDate: cleanText(trackingStatus.status_date, 80),
        trackingStatusLocation: nextLocation,
        trackingEta: cleanText(trackingResult.eta, 80),
        trackingLastCheckedAt: checkedAt,
        trackingError: "",
      };
    } catch (error) {
      updatedShipment = {
        ...existingShipment,
        trackingLastCheckedAt: checkedAt,
        trackingError: cleanMultilineText(
          error?.message || "The tracking status could not be retrieved.",
          1000
        ),
      };
    }

    const notificationResult =
      await sendTrackingUpdateNotification(
        env,
        order,
        updatedShipment,
        currentStatus
      );

    updatedShipment = notificationResult.shipment;

    if (notificationResult.attempted) {
      notificationAttemptCount += 1;
    }

    if (notificationResult.sent) {
      notificationSentCount += 1;
    }

    const visibleFieldsChanged =
      cleanText(updatedShipment.trackingStatus, 50) !==
        cleanText(existingShipment?.trackingStatus, 50) ||
      cleanMultilineText(updatedShipment.trackingStatusDetails, 1000) !==
        cleanMultilineText(existingShipment?.trackingStatusDetails, 1000) ||
      cleanText(updatedShipment.trackingStatusDate, 80) !==
        cleanText(existingShipment?.trackingStatusDate, 80) ||
      cleanText(updatedShipment.trackingStatusLocation, 200) !==
        cleanText(existingShipment?.trackingStatusLocation, 200) ||
      cleanText(updatedShipment.trackingEta, 80) !==
        cleanText(existingShipment?.trackingEta, 80) ||
      cleanMultilineText(updatedShipment.trackingError, 1000) !==
        cleanMultilineText(existingShipment?.trackingError, 1000);

    updatedShipments[index] = updatedShipment;
    refreshedShipments.push(updatedShipment);

    if (visibleFieldsChanged) {
      changedCount += 1;
    }
  }

  if (checkedCount === 0) {
    return jsonResponse({
      success: true,
      order,
      shipments: [],
      checkedCount: 0,
      changedCount: 0,
      notificationAttemptCount: 0,
      notificationSentCount: 0,
      message: "No eligible shipments were found for tracking.",
    });
  }

  const updatedOrder = {
    ...order,
    shipments: updatedShipments,
    updatedAt:
      changedCount > 0
        ? new Date().toISOString()
        : order.updatedAt || checkedAt,
  };

  await putOrderRecord(env, updatedOrder);

  return jsonResponse({
    success: true,
    order: updatedOrder,
    shipments: refreshedShipments,
    checkedCount,
    changedCount,
    notificationAttemptCount,
    notificationSentCount,
    message: changedCount
      ? `${changedCount} shipment tracking update(s) found.`
      : "Shipment tracking statuses are unchanged.",
  });
}

async function createTrackingUpdateEventId(orderId, shipment) {
  const identity = [
    normalizeOrderId(orderId),
    cleanText(shipment?.shipmentId, 150),
    cleanText(
      shipment?.trackingNumber,
      MAX_ORDER_SHIPMENT_TRACKING_LENGTH
    ),
    cleanText(shipment?.trackingStatus, 50).toUpperCase(),
    cleanText(shipment?.trackingStatusDate, 80),
    cleanMultilineText(
      shipment?.trackingStatusDetails,
      1000
    ),
    cleanText(shipment?.trackingStatusLocation, 200),
  ].join("|");

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(identity)
  );

  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `tracking-${hash.slice(0, 48)}`;
}

async function sendTrackingUpdateNotification(
  env,
  order,
  shipment,
  previousStatus
) {
  const status = cleanText(
    shipment?.trackingStatus,
    50
  ).toUpperCase();
  const notificationStatus = cleanText(
    shipment?.trackingNotificationStatus,
    50
  ).toUpperCase();
  const priorStatus = cleanText(
    previousStatus,
    50
  ).toUpperCase();

  if (
    !status ||
    status === "UNKNOWN" ||
    status === notificationStatus
  ) {
    return {
      shipment,
      attempted: false,
      sent: false,
    };
  }

  const notificationAttemptedBefore =
    Boolean(
      cleanText(
        shipment?.trackingNotificationEventId,
        150
      )
    ) ||
    Boolean(
      cleanMultilineText(
        shipment?.trackingNotificationError,
        1000
      )
    );

  if (
    !notificationStatus &&
    !notificationAttemptedBefore &&
    (!priorStatus || status === priorStatus)
  ) {
    return {
      shipment: {
        ...shipment,
        trackingNotificationStatus: status,
        trackingNotificationInitializedAt:
          new Date().toISOString(),
      },
      attempted: false,
      sent: false,
    };
  }

  const eventId = await createTrackingUpdateEventId(
    order.orderId || order.id,
    shipment
  );

  try {
    validateOrderWorkflowEnvironment(env);

    await sendOrderWorkflowToWorkspace(env, {
      action: "tracking_update",
      eventId,
      order,
      shipment,
    });

    return {
      shipment: {
        ...shipment,
        trackingNotificationStatus: status,
        trackingNotificationSentAt: new Date().toISOString(),
        trackingNotificationEventId: eventId,
        trackingNotificationError: "",
      },
      attempted: true,
      sent: true,
    };
  } catch (error) {
    console.error(
      `Tracking email failed for order ${order.orderId || order.id}:`,
      error
    );

    return {
      shipment: {
        ...shipment,
        trackingNotificationEventId: eventId,
        trackingNotificationError: cleanMultilineText(
          error?.message || "The tracking update email could not be sent.",
          1000
        ),
      },
      attempted: true,
      sent: false,
    };
  }
}

async function refreshAllShipmentTrackingStatuses(env) {
  validateStorage(env);

  const orders = await listRecordsByPrefix(
    env.DOCUMENTS_KV,
    ORDER_KEY_PREFIX
  );

  const summary = {
    ordersScanned: orders.length,
    ordersChecked: 0,
    shipmentsChecked: 0,
    shipmentsChanged: 0,
    notificationAttempts: 0,
    notificationsSent: 0,
    failedOrders: 0,
  };

  for (const order of orders) {
    const orderId = order?.orderId || order?.id;
    const shipments = Array.isArray(order?.shipments)
      ? order.shipments
      : [];

    const hasTrackableShipment = shipments.some((shipment) => {
      const carrier = cleanText(shipment?.carrier, 50)
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

      const trackingNumber = cleanText(
        shipment?.trackingNumber,
        MAX_ORDER_SHIPMENT_TRACKING_LENGTH
      );

      const status = cleanText(
        shipment?.trackingStatus,
        50
      ).toUpperCase();
      const lastNotifiedStatus = cleanText(
        shipment?.trackingNotificationStatus,
        50
      ).toUpperCase();
      const notificationPending =
        Boolean(status) &&
        status !== "UNKNOWN" &&
        status !== lastNotifiedStatus;

      return (
        ["usps", "ups", "fedex"].includes(carrier) &&
        Boolean(trackingNumber) &&
        (
          !["DELIVERED", "RETURNED"].includes(status) ||
          notificationPending
        )
      );
    });

    if (!orderId || !hasTrackableShipment) {
      continue;
    }

    try {
      const response = await refreshShipmentTrackingStatuses(
        { orderId },
        env
      );
      const result = await response.json();

      summary.ordersChecked += 1;
      summary.shipmentsChecked += Number(result.checkedCount || 0);
      summary.shipmentsChanged += Number(result.changedCount || 0);
      summary.notificationAttempts += Number(
        result.notificationAttemptCount || 0
      );
      summary.notificationsSent += Number(
        result.notificationSentCount || 0
      );
    } catch (error) {
      summary.failedOrders += 1;

      console.error(
        `Scheduled tracking refresh failed for order ${orderId}:`,
        error
      );
    }
  }

  console.log(
    "Scheduled shipment tracking refresh complete.",
    summary
  );

  return summary;
}

function shippoMessage(result) {
  const messages = Array.isArray(result?.messages) ? result.messages : [];
  const messageText = messages
    .map(function (entry) {
      if (typeof entry === "string") return entry;
      return entry?.text || entry?.message || entry?.detail || "";
    })
    .filter(Boolean)
    .join(" ");

  return cleanText(
    result?.detail ||
      result?.message ||
      result?.error ||
      messageText,
    1000
  );
}

async function shippoRequest(env, path, options) {
  const response = await fetch(`${SHIPPO_API_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `ShippoToken ${String(env.SHIPPO_API_TOKEN)}`,
      "Shippo-API-Version": "2018-02-08",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = {};
  }

  if (!response.ok) {
    const message =
      shippoMessage(result) || `Shippo returned status ${response.status}.`;
    throw new ApiRequestError(message, 502);
  }

  return result;
}

async function handlePublicDocumentsRequest(
  request,
  env,
  url
) {
  try {
    validateStorage(
      env
    );

    if (
      request.method !==
      "GET"
    ) {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    const codeName =
      getRouteValue(
        url.pathname,
        "/api/documents",
        {
          invalidRouteMessage:
            "The documentation route is invalid.",

          invalidValueMessage:
            "The product code is invalid.",

          normalize:
            normalizeDocumentCode,
        }
      );

    if (
      codeName
    ) {
      const record =
        await getDocumentRecord(
          env,
          codeName
        );

      if (
        !record ||
        !record.published ||
        !record.documentationReady
      ) {
        throw new ApiRequestError(
          "Documentation record not found.",
          404
        );
      }

      return jsonResponse({
        success:
          true,

        record:
          toPublicDocumentRecord(
            record
          ),
      });
    }

    const records =
      await listRecordsByPrefix(
        env.DOCUMENTS_KV,
        DOCUMENT_KEY_PREFIX
      );

    const publishedRecords =
      records
        .filter(
          (
            record
          ) =>
            record.published &&
            record.documentationReady
        )
        .map(
          toPublicDocumentRecord
        )
        .sort(
          (
            left,
            right
          ) =>
            String(
              left.codeName
            ).localeCompare(
              String(
                right.codeName
              )
            )
        );

    return jsonResponse({
      success:
        true,

      records:
        publishedRecords,

      count:
        publishedRecords.length,
    });
  } catch (
    error
  ) {
    console.error(
      "Public documentation request error:",
      error
    );

    return handleApiError(
      error
    );
  }
}

async function handleAdminDocumentsRequest(
  request,
  env,
  url
) {
  try {
    validateStorage(
      env
    );

    await requireAdmin(
      request,
      env
    );

    const codeName =
      getRouteValue(
        url.pathname,
        "/api/admin/documents",
        {
          invalidRouteMessage:
            "The documentation route is invalid.",

          invalidValueMessage:
            "The product code is invalid.",

          normalize:
            normalizeDocumentCode,
        }
      );

    if (
      !codeName &&
      request.method ===
        "GET"
    ) {
      const records =
        await listRecordsByPrefix(
          env.DOCUMENTS_KV,
          DOCUMENT_KEY_PREFIX
        );

      records.sort(
        (
          left,
          right
        ) =>
          String(
            left.codeName
          ).localeCompare(
            String(
              right.codeName
            )
          )
      );

      return jsonResponse({
        success:
          true,

        records,

        count:
          records.length,
      });
    }

    if (
      !codeName
    ) {
      throw new ApiRequestError(
        "A product code is required.",
        400
      );
    }

    if (
      request.method ===
      "GET"
    ) {
      const record =
        await getDocumentRecord(
          env,
          codeName
        );

      if (
        !record
      ) {
        throw new ApiRequestError(
          "Documentation record not found.",
          404
        );
      }

      return jsonResponse({
        success:
          true,

        record,
      });
    }

    if (
      request.method ===
      "PUT"
    ) {
      validateJsonContentType(
        request
      );

      const body =
        await readJsonRequest(
          request,
          MAX_DOCUMENT_REQUEST_LENGTH,
          "documentation"
        );

      const existingRecord =
        await getDocumentRecord(
          env,
          codeName
        );

      const record =
        prepareDocumentRecord(
          codeName,
          body.record ||
            body,
          existingRecord
        );

      await putDocumentRecord(
        env,
        record
      );

      return jsonResponse(
        {
          success:
            true,

          record,

          message:
            "Documentation record saved.",
        },
        existingRecord
          ? 200
          : 201
      );
    }

    if (
      request.method ===
      "DELETE"
    ) {
      const existingRecord =
        await getDocumentRecord(
          env,
          codeName
        );

      if (
        !existingRecord
      ) {
        throw new ApiRequestError(
          "Documentation record not found.",
          404
        );
      }

      await env.DOCUMENTS_KV.delete(
        getDocumentKey(
          codeName
        )
      );

      return jsonResponse({
        success:
          true,

        message:
          "Documentation record deleted.",
      });
    }

    throw new ApiRequestError(
      "Method not allowed.",
      405
    );
  } catch (
    error
  ) {
    console.error(
      "Admin documentation request error:",
      error
    );

    return handleApiError(
      error
    );
  }
}

function normalizeDocumentCode(
  value
) {
  const codeName =
    cleanText(
      value,
      100
    ).toUpperCase();

  if (
    !/^[A-Z0-9][A-Z0-9-]{1,99}$/.test(
      codeName
    )
  ) {
    throw new ApiRequestError(
      "The product code is invalid.",
      400
    );
  }

  return codeName;
}

function getDocumentKey(
  codeName
) {
  return `${DOCUMENT_KEY_PREFIX}${normalizeDocumentCode(
    codeName
  )}`;
}

async function getDocumentRecord(
  env,
  codeName
) {
  return env.DOCUMENTS_KV.get(
    getDocumentKey(
      codeName
    ),
    "json"
  );
}

async function putDocumentRecord(
  env,
  record
) {
  await env.DOCUMENTS_KV.put(
    getDocumentKey(
      record.codeName
    ),

    JSON.stringify(
      record
    ),

    {
      metadata: {
        codeName:
          record.codeName,

        published:
          record.published,

        updatedAt:
          record.updatedAt,
      },
    }
  );
}

function prepareDocumentRecord(
  codeName,
  rawRecord,
  existingRecord
) {
  if (
    !rawRecord ||
    typeof rawRecord !==
      "object" ||
    Array.isArray(
      rawRecord
    )
  ) {
    throw new ApiRequestError(
      "The documentation record is invalid.",
      400
    );
  }

  const catalogItem =
    getOrderCatalogItem(
      codeName
    );

  if (
    !catalogItem
  ) {
    throw new ApiRequestError(
      `Product code ${codeName} is not available.`,
      400
    );
  }

  const batchNumber =
    cleanText(
      rawRecord.batchNumber,
      150
    );

  const labName =
    cleanText(
      rawRecord.labName,
      200
    );

  const testDate =
    cleanText(
      rawRecord.testDate,
      10
    );

  const category =
    cleanText(
      rawRecord.category,
      150
    );

  const notes =
    cleanMultilineText(
      rawRecord.notes,
      MAX_DOCUMENT_NOTES_LENGTH
    );

  const coaUrl =
    cleanUrl(
      rawRecord.coaUrl,
      "COA document"
    );

  const verificationUrl =
    cleanUrl(
      rawRecord.verificationUrl,
      "verification"
    );

  const reviewed =
    rawRecord.reviewed ===
    true;

  const published =
    rawRecord.published ===
    true;

  if (
    testDate &&
    !isValidIsoDate(
      testDate
    )
  ) {
    throw new ApiRequestError(
      "The test date is invalid.",
      400
    );
  }

  const batchReady =
    Boolean(
      batchNumber &&
        labName &&
        testDate
    );

  const coaReady =
    Boolean(
      coaUrl
    );

  const verificationReady =
    Boolean(
      verificationUrl
    );

  const documentationReady =
    Boolean(
      batchReady &&
        coaReady &&
        verificationReady &&
        reviewed
    );

  if (
    published &&
    !documentationReady
  ) {
    throw new ApiRequestError(
      "A record must include complete batch details, valid document links, and manual review before publication.",
      400
    );
  }

  const now =
    new Date().toISOString();

  return {
    codeName,

    productName:
      catalogItem.name,

    strength:
      catalogItem.strength,

    ...(catalogItem.composition
      ? {
          composition:
            catalogItem.composition,
        }
      : {}),

    category,
    batchNumber,
    labName,
    testDate,
    coaUrl,
    verificationUrl,
    notes,
    reviewed,
    published,
    batchReady,
    coaReady,
    verificationReady,
    documentationReady,

    createdAt:
      existingRecord?.createdAt ||
      now,

    updatedAt:
      now,
  };
}

function toPublicDocumentRecord(
  record
) {
  return {
    codeName:
      record.codeName,

    productName:
      record.productName,

    strength:
      record.strength,

    ...(record.composition
      ? {
          composition:
            record.composition,
        }
      : {}),

    category:
      record.category ||
      "",

    batchNumber:
      record.batchNumber,

    labName:
      record.labName,

    testDate:
      record.testDate,

    coaUrl:
      record.coaUrl,

    verificationUrl:
      record.verificationUrl,

    documentationReady:
      record.documentationReady,

    updatedAt:
      record.updatedAt,
  };
}

/* -------------------------------------------------- */
/* ADMIN ORDER INVOICE AND PAYMENT WORKFLOW           */
/* -------------------------------------------------- */

async function handleAdminOrderWorkflowAction(
  request,
  env,
  url
) {
  try {
    validateStorage(env);
    requireSameOrigin(request);

    await requireAdmin(
      request,
      env
    );


    if (
      request.method !==
      "POST"
    ) {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    validateJsonContentType(
      request
    );

    const body =
      await readJsonRequest(
        request,
        MAX_ORDER_WORKFLOW_REQUEST_LENGTH,
        "order workflow action"
      );

    const orderId =
      normalizeOrderId(
        body.orderId
      );

    const order =
      await getOrderRecord(
        env,
        orderId
      );

    if (
      !order
    ) {
      throw new ApiRequestError(
        "Order record not found.",
        404
      );
    }

    const actor =
      getOrderWorkflowAdminActor(
        request
      );

    if (
      url.pathname !==
      "/api/admin/order-actions/cancel"
    ) {
      validateOrderWorkflowEnvironment(
        env
      );
    }

    if (
      url.pathname ===
      "/api/admin/order-actions/invoice"
    ) {
      return await processInvoiceWorkflowAction(
        env,
        order,
        body,
        actor
      );
    }

    if (
      url.pathname ===
      "/api/admin/order-actions/payment-received"
    ) {
      return await processPaymentReceivedWorkflowAction(
        env,
        order,
        body,
        actor
      );
    }

    if (
      url.pathname ===
      "/api/admin/order-actions/shipment-sent"
    ) {
      return await processShipmentSentWorkflowAction(
        env,
        order,
        body,
        actor
      );
    }

    if (
      url.pathname ===
      "/api/admin/order-actions/cancel"
    ) {
      return await processCancelOrderWorkflowAction(
        env,
        order,
        body,
        actor
      );
    }

    throw new ApiRequestError(
      "Order workflow route not found.",
      404
    );
  } catch (
    error
  ) {
    console.error(
      "Admin order workflow error:",
      error
    );

    return handleApiError(
      error
    );
  }
}

function validateOrderWorkflowEnvironment(
  env
) {
  if (
    !env.ORDER_WEB_APP_URL ||
    !env.ORDER_API_SECRET
  ) {
    throw new ApiRequestError(
      "The Google Workspace order service has not been configured.",
      500
    );
  }

  if (
    String(
      env.ORDER_WORKFLOW_ACTIONS_ENABLED ||
      ""
    ).toLowerCase() !==
    "true"
  ) {
    throw new ApiRequestError(
      "Invoice and payment emails are disabled until the Google Workspace workflow update is complete.",
      503
    );
  }
}

async function processInvoiceWorkflowAction(
  env,
  order,
  body,
  actor
) {
  const orderId =
    normalizeOrderId(
      order.orderId ||
      order.id
    );

  const existingInvoice =
    order.invoice &&
    typeof order.invoice ===
      "object"
      ? order.invoice
      : {};

  const isResend =
    Boolean(
      existingInvoice.firstSentAt ||
      existingInvoice.sentAt
    );

  if (
    isResend &&
    body.confirmResend !==
      true
  ) {
    throw new ApiRequestError(
      "An invoice has already been sent for this order. Confirm the resend before sending it again.",
      409
    );
  }

  const paymentMethod =
    normalizeWorkflowPaymentMethod(
      body.paymentMethod ||
      existingInvoice.paymentMethod ||
      order.preferredPaymentLabel ||
      order.paymentMethod
    );

  const paymentLink =
    normalizeWorkflowPaymentLink(
      body.paymentLink
    );

  const paymentDestination =
    cleanText(
      body.paymentDestination,
      MAX_ORDER_PAYMENT_DESTINATION_LENGTH
    );

  if (
    !paymentLink &&
    !paymentDestination
  ) {
    throw new ApiRequestError(
      "Enter a payment link or payment destination before sending the invoice.",
      400
    );
  }

  const defaultSubtotalCents =
    Math.round(
      Number(
        order.subtotal ||
        0
      ) * 100
    );

  const subtotalCents =
    normalizeWorkflowMoneyCents(
      body.subtotalCents,
      defaultSubtotalCents,
      "invoice subtotal"
    );

  const shippingCents =
    normalizeWorkflowMoneyCents(
      body.shippingCents,
      Math.round(Number(order.shippingFee || 0) * 100),
      "shipping amount"
    );

  const taxCents =
    normalizeWorkflowMoneyCents(
      body.taxCents,
      0,
      "tax amount"
    );

  const totalCents =
    subtotalCents +
    shippingCents +
    taxCents;

  if (
    totalCents <= 0 ||
    totalCents >
      MAX_ORDER_AMOUNT_CENTS
  ) {
    throw new ApiRequestError(
      "The invoice total is invalid.",
      400
    );
  }

  const now =
    new Date().toISOString();

  const eventId =
    createOrderWorkflowEventId(
      "invoice"
    );

  const event = {
    eventId,
    type:
      "invoice_sent",
    state:
      "sending",
    createdAt:
      now,
    createdBy:
      actor,
    resend:
      isResend,
  };

  const pendingOrder = {
    ...order,

    workflowPending:
      event,

    updatedAt:
      now,
  };

  await putOrderRecord(
    env,
    pendingOrder
  );

  const invoicePayload = {
    orderId,

    subtotalCents,

    shippingCents,

    taxCents,

    totalCents,

    paymentMethod,

    paymentLink,

    paymentDestination,

    paymentNote:
      orderId,

    paymentNoteInstruction:
      `Enter only order number ${orderId} in the payment note. Do not include your name, product names, or any other information.`,

    sentAt:
      now,

    sentBy:
      actor,

    resend:
      isResend,
  };

  try {
    const serviceResult =
      await sendOrderWorkflowToWorkspace(
        env,
        {
          action:
            "send_invoice",

          eventId,

          order:
            pendingOrder,

          invoice:
            invoicePayload,
        }
      );

    const sendCount =
      Number(
        existingInvoice.sendCount ||
        0
      ) + 1;

    const completedEvent = {
      ...event,

      state:
        "sent",

      completedAt:
        new Date().toISOString(),

      serviceMessage:
        cleanText(
          serviceResult.message ||
          "Invoice email sent.",
          MAX_ORDER_WORKFLOW_MESSAGE_LENGTH
        ),
    };

    const updatedOrder = {
      ...order,

      status:
        "Invoice Sent",

      invoice: {
        ...existingInvoice,

        ...invoicePayload,

        firstSentAt:
          existingInvoice.firstSentAt ||
          existingInvoice.sentAt ||
          now,

        lastSentAt:
          now,

        sentAt:
          existingInvoice.sentAt ||
          now,

        sendCount,

        lastEventId:
          eventId,

        lastSentBy:
          actor,
      },

      invoiceHistory:
        appendOrderWorkflowHistory(
          order.invoiceHistory,
          completedEvent
        ),

      workflowHistory:
        appendOrderWorkflowHistory(
          order.workflowHistory,
          completedEvent
        ),

      workflowPending:
        null,

      updatedAt:
        completedEvent.completedAt,
    };

    await putOrderRecord(
      env,
      updatedOrder
    );

    return jsonResponse({
      success:
        true,

      order:
        updatedOrder,

      record:
        updatedOrder,

      invoice:
        updatedOrder.invoice,

      message:
        isResend
          ? `Invoice for order ${orderId} was resent.`
          : `Invoice for order ${orderId} was sent.`,
    });
  } catch (
    error
  ) {
    await recordFailedOrderWorkflowAction(
      env,
      order,
      event,
      error
    );

    throw error;
  }
}

async function processPaymentReceivedWorkflowAction(
  env,
  order,
  body,
  actor
) {
  const orderId =
    normalizeOrderId(
      order.orderId ||
      order.id
    );

  const existingPayment =
    order.payment &&
    typeof order.payment ===
      "object"
      ? order.payment
      : {};

  const isResend =
    Boolean(
      existingPayment.receivedAt
    );

  if (
    isResend &&
    body.confirmResend !==
      true
  ) {
    throw new ApiRequestError(
      "Payment has already been recorded for this order. Confirm the resend before sending another payment confirmation.",
      409
    );
  }

  const invoice =
    order.invoice &&
    typeof order.invoice ===
      "object"
      ? order.invoice
      : {};

  const defaultAmountCents =
    Number(
      invoice.totalCents
    ) ||
    Math.round(
      Number(
        order.total ||
        order.subtotal ||
        0
      ) * 100
    );

  const amountCents =
    normalizeWorkflowMoneyCents(
      body.amountCents,
      defaultAmountCents,
      "payment amount"
    );

  if (
    amountCents <= 0
  ) {
    throw new ApiRequestError(
      "The payment amount must be greater than zero.",
      400
    );
  }

  const paymentMethod =
    normalizeWorkflowPaymentMethod(
      body.paymentMethod ||
      existingPayment.paymentMethod ||
      invoice.paymentMethod ||
      order.preferredPaymentLabel ||
      order.paymentMethod
    );

  const itemFulfillment =
    normalizeWorkflowItemFulfillment(
      body.itemFulfillment,
      order.items
    );

  const fulfillmentType =
    itemFulfillment.length > 0
      ? deriveWorkflowFulfillmentType(
          itemFulfillment
        )
      : normalizeWorkflowFulfillmentType(
          body.fulfillmentType
        );

  const referenceNumber =
    cleanText(
      body.referenceNumber,
      MAX_ORDER_PAYMENT_REFERENCE_LENGTH
    );

  const timingNote =
    cleanMultilineText(
      body.restockNote,
      MAX_ORDER_TIMING_NOTE_LENGTH
    );

  const restockNote =
    fulfillmentType ===
      "in_stock"
      ? ""
      : buildWorkflowFulfillmentSummary(
          itemFulfillment,
          timingNote
        );

  const now =
    new Date().toISOString();

  const eventId =
    createOrderWorkflowEventId(
      "payment"
    );

  const event = {
    eventId,
    type:
      "payment_received",
    state:
      "sending",
    createdAt:
      now,
    createdBy:
      actor,
    resend:
      isResend,
  };

  const pendingOrder = {
    ...order,

    workflowPending:
      event,

    updatedAt:
      now,
  };

  await putOrderRecord(
    env,
    pendingOrder
  );

  const fulfillment = {
    type:
      fulfillmentType,

    label:
      fulfillmentType ===
      "preorder"
        ? "Preorder"
        : fulfillmentType ===
            "mixed"
          ? "Mixed Order"
          : "In Stock",

    items:
      itemFulfillment,

    timingNote:
      fulfillmentType ===
      "in_stock"
        ? ""
        : timingNote,

    restockNote,
  };

  const paymentPayload = {
    orderId,

    amountCents,

    paymentMethod,

    referenceNumber,

    receivedAt:
      existingPayment.receivedAt ||
      now,

    confirmationSentAt:
      now,

    recordedBy:
      existingPayment.recordedBy ||
      actor,

    confirmationSentBy:
      actor,

    resend:
      isResend,
  };

  try {
    const serviceResult =
      await sendOrderWorkflowToWorkspace(
        env,
        {
          action:
            "payment_received",

          eventId,

          order:
            pendingOrder,

          payment:
            paymentPayload,

          fulfillment,
        }
      );

    const confirmationCount =
      Number(
        existingPayment.confirmationCount ||
        0
      ) + 1;

    const completedEvent = {
      ...event,

      state:
        "sent",

      completedAt:
        new Date().toISOString(),

      serviceMessage:
        cleanText(
          serviceResult.message ||
          "Payment confirmation email sent.",
          MAX_ORDER_WORKFLOW_MESSAGE_LENGTH
        ),
    };

    const inventoryEvent =
      isResend
        ? order.inventoryEvent || null
        : await commitInventoryForPaidOrder(
            env,
            order
          );

    const couponRedemption =
      isResend
        ? order.couponRedemption || null
        : await commitCouponRedemptionForPaidOrder(
            env,
            order
          );

    const updatedOrder = {
      ...order,

      status:
        fulfillmentType ===
        "in_stock"
          ? "Paid — Awaiting Shipment"
          : fulfillmentType ===
              "mixed"
            ? "Paid — Mixed Fulfillment"
            : "Paid — Awaiting Restock",

      payment: {
        ...existingPayment,

        ...paymentPayload,

        confirmationCount,

        lastEventId:
          eventId,
      },

      fulfillment,

      inventoryCommittedAt:
        order.inventoryCommittedAt ||
        inventoryEvent?.committedAt ||
        null,

      inventoryEvent:
        order.inventoryEvent ||
        inventoryEvent ||
        null,

      couponRedemption:
        order.couponRedemption ||
        couponRedemption ||
        null,

      couponRedeemedAt:
        order.couponRedeemedAt ||
        couponRedemption?.redeemedAt ||
        null,

      paymentHistory:
        appendOrderWorkflowHistory(
          order.paymentHistory,
          completedEvent
        ),

      workflowHistory:
        appendOrderWorkflowHistory(
          order.workflowHistory,
          completedEvent
        ),

      workflowPending:
        null,

      updatedAt:
        completedEvent.completedAt,
    };

    await putOrderRecord(
      env,
      updatedOrder
    );

    return jsonResponse({
      success:
        true,

      order:
        updatedOrder,

      record:
        updatedOrder,

      payment:
        updatedOrder.payment,

      fulfillment:
        updatedOrder.fulfillment,

      message:
        isResend
          ? `Payment confirmation for order ${orderId} was resent.`
          : `Payment for order ${orderId} was recorded and confirmed.`,
    });
  } catch (
    error
  ) {
    await recordFailedOrderWorkflowAction(
      env,
      order,
      event,
      error
    );

    throw error;
  }
}


async function processCancelOrderWorkflowAction(
  env,
  order,
  body,
  actor
) {
  const orderId = normalizeOrderId(order.orderId || order.id);
  const existingCancellation =
    order.cancellation &&
    typeof order.cancellation === "object"
      ? order.cancellation
      : {};

  if (existingCancellation.cancelledAt) {
    return jsonResponse({
      success: true,
      order,
      record: order,
      message: `Order ${orderId} is already cancelled.`,
    });
  }

  const shipments = Array.isArray(order.shipments)
    ? order.shipments
    : [];

  if (shipments.length > 0) {
    throw new ApiRequestError(
      "This order has a recorded shipment and cannot be cancelled with automatic inventory restoration.",
      409
    );
  }

  const now = new Date().toISOString();
  const reason = cleanMultilineText(body?.reason, 1000);
  const eventId = createOrderWorkflowEventId("cancel");
  const event = {
    eventId,
    type: "order_cancelled",
    state: "processing",
    createdAt: now,
    createdBy: actor,
    previousStatus: cleanText(order.status, MAX_ORDER_STATUS_LENGTH),
    reason,
  };

  const pendingOrder = {
    ...order,
    workflowPending: event,
    updatedAt: now,
  };

  await putOrderRecord(env, pendingOrder);

  try {
    const inventoryRestoration =
      await restoreInventoryForCancelledOrder(env, order, actor);
    const completedAt = new Date().toISOString();
    const completedEvent = {
      ...event,
      state: "completed",
      completedAt,
      restoredItemCount: Array.isArray(
        inventoryRestoration?.adjustments
      )
        ? inventoryRestoration.adjustments.filter(
            (adjustment) =>
              Number(adjustment?.restoredQuantity || 0) > 0
          ).length
        : 0,
    };

    const updatedOrder = {
      ...order,
      status: "Cancelled",
      cancellation: {
        cancelledAt: completedAt,
        cancelledBy: actor,
        reason,
        previousStatus: cleanText(
          order.status,
          MAX_ORDER_STATUS_LENGTH
        ),
      },
      inventoryRestoration,
      inventoryRestoredAt:
        inventoryRestoration?.restoredAt || null,
      workflowHistory: appendOrderWorkflowHistory(
        order.workflowHistory,
        completedEvent
      ),
      workflowPending: null,
      updatedAt: completedAt,
    };

    await putOrderRecord(env, updatedOrder);

    await syncOrderCancellationToWorkspaceBestEffort(
      env,
      updatedOrder,
      eventId
    );

    return jsonResponse({
      success: true,
      order: updatedOrder,
      record: updatedOrder,
      inventoryRestoration,
      message: `Order ${orderId} was cancelled and eligible inventory was restored.`,
    });
  } catch (error) {
    await recordFailedOrderWorkflowAction(
      env,
      order,
      event,
      error
    );

    throw error;
  }
}

async function processShipmentSentWorkflowAction(
  env,
  order,
  body,
  actor
) {
  const orderId =
    normalizeOrderId(
      order.orderId ||
      order.id
    );

  if (
    !order.payment ||
    !order.payment.receivedAt
  ) {
    throw new ApiRequestError(
      "Record payment before creating a shipment.",
      409
    );
  }

  const existingShipments =
    Array.isArray(order.shipments)
      ? order.shipments
      : [];

  const carrier =
    normalizeWorkflowShipmentCarrier(
      body.carrier
    );

  const trackingNumber =
    cleanText(
      body.trackingNumber,
      MAX_ORDER_SHIPMENT_TRACKING_LENGTH
    );

  if (!trackingNumber) {
    throw new ApiRequestError(
      "Enter the shipment tracking number.",
      400
    );
  }

  const note =
    cleanMultilineText(
      body.note,
      MAX_ORDER_SHIPMENT_NOTE_LENGTH
    );

  const shipmentItems =
    normalizeWorkflowShipmentItems(
      body.shipmentItems,
      order.items,
      existingShipments
    );

  const now =
    new Date().toISOString();

  const eventId =
    createOrderWorkflowEventId(
      "shipment"
    );

  const shipment = {
    shipmentId:
      eventId,

    packageNumber:
      existingShipments.length + 1,

    carrier,

    trackingNumber,

    trackingUrl:
      buildWorkflowTrackingUrl(
        carrier,
        trackingNumber
      ),

    note,

    items:
      shipmentItems,

    shippedAt:
      now,

    sentBy:
      actor,
  };

  const updatedShipments = [
    ...existingShipments,
    shipment,
  ];

  const shippingSummary =
    buildWorkflowShippingSummary(
      order.items,
      updatedShipments
    );

  const event = {
    eventId,
    type:
      "shipment_sent",
    state:
      "sending",
    createdAt:
      now,
    createdBy:
      actor,
    shipmentId:
      shipment.shipmentId,
    carrier,
    trackingNumber,
  };

  const pendingOrder = {
    ...order,

    workflowPending:
      event,

    updatedAt:
      now,
  };

  await putOrderRecord(
    env,
    pendingOrder
  );

  try {
    const serviceResult =
      await sendOrderWorkflowToWorkspace(
        env,
        {
          action:
            "shipment_sent",

          eventId,

          order:
            pendingOrder,

          shipment,

          shippingSummary,
        }
      );

    const completedAt =
      new Date().toISOString();

    const completedEvent = {
      ...event,

      state:
        "sent",

      completedAt,

      serviceMessage:
        cleanText(
          serviceResult.message ||
          "Shipment email sent.",
          MAX_ORDER_WORKFLOW_MESSAGE_LENGTH
        ),
    };

    const updatedOrder = {
      ...order,

      status:
        shippingSummary.complete
          ? "Shipped"
          : "Partially Shipped",

      shipments:
        updatedShipments,

      shippingSummary,

      shipmentHistory:
        appendOrderWorkflowHistory(
          order.shipmentHistory,
          completedEvent
        ),

      workflowHistory:
        appendOrderWorkflowHistory(
          order.workflowHistory,
          completedEvent
        ),

      workflowPending:
        null,

      updatedAt:
        completedAt,
    };

    await putOrderRecord(
      env,
      updatedOrder
    );

    return jsonResponse({
      success:
        true,

      order:
        updatedOrder,

      record:
        updatedOrder,

      shipment,

      shippingSummary,

      message:
        shippingSummary.complete
          ? `Order ${orderId} was marked shipped and the customer was emailed.`
          : `A partial shipment for order ${orderId} was recorded and the customer was emailed.`,
    });
  } catch (
    error
  ) {
    await recordFailedOrderWorkflowAction(
      env,
      order,
      event,
      error
    );

    throw error;
  }
}

async function sendOrderWorkflowToWorkspace(
  env,
  payload
) {
  const response =
    await fetch(
      env.ORDER_WEB_APP_URL,
      {
        method:
          "POST",

        redirect:
          "follow",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            secret:
              env.ORDER_API_SECRET,

            ...payload,
          }),
      }
    );

  const responseText =
    await response.text();

  let result;

  try {
    result =
      JSON.parse(
        responseText
      );
  } catch {
    throw new ApiRequestError(
      "The Google Workspace order service returned an invalid response.",
      502
    );
  }

  if (
    !response.ok ||
    !result.success
  ) {
    throw new ApiRequestError(
      result.error ||
      "The Google Workspace service could not process the request.",
      502
    );
  }

  return result;
}

async function recordFailedOrderWorkflowAction(
  env,
  originalOrder,
  event,
  error
) {
  const failedAt =
    new Date().toISOString();

  const failedEvent = {
    ...event,

    state:
      "failed",

    failedAt,

    error:
      cleanText(
        error?.message ||
        "The workflow action failed.",
        MAX_ORDER_WORKFLOW_MESSAGE_LENGTH
      ),
  };

  const failedOrder = {
    ...originalOrder,

    workflowPending:
      failedEvent,

    workflowHistory:
      appendOrderWorkflowHistory(
        originalOrder.workflowHistory,
        failedEvent
      ),

    updatedAt:
      failedAt,
  };

  try {
    await putOrderRecord(
      env,
      failedOrder
    );
  } catch (
    storageError
  ) {
    console.error(
      "Failed order workflow state could not be stored:",
      storageError
    );
  }
}


function normalizeWorkflowShipmentCarrier(
  value
) {
  const normalized =
    cleanText(
      value,
      50
    )
      .toLowerCase()
      .replace(
        /[\s_-]+/g,
        ""
      );

  const carriers = {
    usps:
      "USPS",
    ups:
      "UPS",
    fedex:
      "FedEx",
    other:
      "Other",
  };

  const carrier =
    carriers[normalized];

  if (!carrier) {
    throw new ApiRequestError(
      "Choose USPS, UPS, FedEx, or Other as the shipping carrier.",
      400
    );
  }

  return carrier;
}

function normalizeWorkflowShipmentItems(
  value,
  orderItems,
  existingShipments
) {
  if (!Array.isArray(value)) {
    throw new ApiRequestError(
      "Shipment products must be submitted as a list.",
      400
    );
  }

  const savedItems =
    Array.isArray(orderItems)
      ? orderItems
      : [];

  const shippedByIndex =
    getWorkflowShippedQuantities(
      existingShipments
    );

  const selectedByIndex =
    new Map();

  value.forEach(
    (entry) => {
      if (
        !entry ||
        typeof entry !==
          "object" ||
        Array.isArray(entry)
      ) {
        throw new ApiRequestError(
          "One of the shipment product selections is invalid.",
          400
        );
      }

      const index =
        Number(entry.index);

      const quantity =
        Number(entry.quantity);

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >=
          savedItems.length ||
        selectedByIndex.has(index)
      ) {
        throw new ApiRequestError(
          "One of the shipment product selections does not match this order.",
          400
        );
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        throw new ApiRequestError(
          "Every selected shipment product must have a whole-number quantity of at least one.",
          400
        );
      }

      const orderedQuantity =
        Math.max(
          1,
          Number(
            savedItems[index]?.quantity ||
            1
          )
        );

      const alreadyShipped =
        shippedByIndex.get(index) ||
        0;

      const remaining =
        Math.max(
          0,
          orderedQuantity -
          alreadyShipped
        );

      if (quantity > remaining) {
        throw new ApiRequestError(
          "A shipment quantity is greater than the quantity still open on this order.",
          409
        );
      }

      selectedByIndex.set(
        index,
        quantity
      );
    }
  );

  if (
    selectedByIndex.size ===
    0
  ) {
    throw new ApiRequestError(
      "Choose at least one product for this shipment.",
      400
    );
  }

  return Array.from(
    selectedByIndex.entries()
  ).map(
    ([index, quantity]) => {
      const item =
        savedItems[index] ||
        {};

      return {
        index,

        name:
          cleanText(
            item.name,
            150
          ) ||
          "Product",

        codeName:
          cleanText(
            item.codeName,
            100
          ),

        strength:
          cleanText(
            item.strength,
            100
          ),

        quantity,
      };
    }
  );
}

function getWorkflowShippedQuantities(
  shipments
) {
  const quantities =
    new Map();

  for (
    const shipment of Array.isArray(shipments)
      ? shipments
      : []
  ) {
    for (
      const item of Array.isArray(shipment?.items)
        ? shipment.items
        : []
    ) {
      const index =
        Number(item?.index);

      const quantity =
        Math.max(
          0,
          Number(
            item?.quantity ||
            0
          )
        );

      if (
        Number.isInteger(index) &&
        index >= 0
      ) {
        quantities.set(
          index,
          (quantities.get(index) || 0) +
          quantity
        );
      }
    }
  }

  return quantities;
}

function buildWorkflowShippingSummary(
  orderItems,
  shipments
) {
  const savedItems =
    Array.isArray(orderItems)
      ? orderItems
      : [];

  const shippedByIndex =
    getWorkflowShippedQuantities(
      shipments
    );

  const items =
    savedItems.map(
      (item, index) => {
        const orderedQuantity =
          Math.max(
            1,
            Number(
              item?.quantity ||
              1
            )
          );

        const shippedQuantity =
          Math.min(
            orderedQuantity,
            Math.max(
              0,
              shippedByIndex.get(index) ||
              0
            )
          );

        return {
          index,

          name:
            cleanText(
              item?.name,
              150
            ) ||
            "Product",

          codeName:
            cleanText(
              item?.codeName,
              100
            ),

          strength:
            cleanText(
              item?.strength,
              100
            ),

          orderedQuantity,

          shippedQuantity,

          remainingQuantity:
            Math.max(
              0,
              orderedQuantity -
              shippedQuantity
            ),
        };
      }
    );

  const totalQuantity =
    items.reduce(
      (total, item) =>
        total + item.orderedQuantity,
      0
    );

  const shippedQuantity =
    items.reduce(
      (total, item) =>
        total + item.shippedQuantity,
      0
    );

  const remainingQuantity =
    Math.max(
      0,
      totalQuantity -
      shippedQuantity
    );

  return {
    totalQuantity,
    shippedQuantity,
    remainingQuantity,
    complete:
      totalQuantity > 0 &&
      remainingQuantity === 0,
    items,
  };
}

function buildWorkflowTrackingUrl(
  carrier,
  trackingNumber
) {
  const encoded =
    encodeURIComponent(
      trackingNumber
    );

  if (carrier === "USPS") {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}`;
  }

  if (carrier === "UPS") {
    return `https://www.ups.com/track?tracknum=${encoded}`;
  }

  if (carrier === "FedEx") {
    return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;
  }

  return "";
}

function normalizeWorkflowPaymentMethod(
  value
) {
  const normalized =
    cleanText(
      value,
      100
    )
      .toLowerCase()
      .replace(
        /[\s_-]+/g,
        ""
      );

  const methods = {
    zelle:
      "Zelle",

    venmo:
      "Venmo",

    cashapp:
      "Cash App",
  };

  const paymentMethod =
    methods[
      normalized
    ] ||
    "";

  if (
    !paymentMethod
  ) {
    throw new ApiRequestError(
      "Choose Zelle, Venmo, or Cash App as the invoice payment method.",
      400
    );
  }

  return paymentMethod;
}

function normalizeWorkflowPaymentLink(
  value
) {
  const paymentLink =
    cleanText(
      value,
      MAX_ORDER_PAYMENT_LINK_LENGTH
    );

  if (
    !paymentLink
  ) {
    return "";
  }

  let parsed;

  try {
    parsed =
      new URL(
        paymentLink
      );
  } catch {
    throw new ApiRequestError(
      "Enter a valid payment link.",
      400
    );
  }

  if (
    parsed.protocol !==
    "https:"
  ) {
    throw new ApiRequestError(
      "The payment link must use HTTPS.",
      400
    );
  }

  return parsed.toString();
}

function normalizeWorkflowMoneyCents(
  value,
  fallback,
  label
) {
  const selected =
    value === undefined ||
    value === null ||
    value === ""
      ? fallback
      : value;

  const amount =
    Number(
      selected
    );

  if (
    !Number.isInteger(
      amount
    ) ||
    amount < 0 ||
    amount >
      MAX_ORDER_AMOUNT_CENTS
  ) {
    throw new ApiRequestError(
      `The ${label} is invalid.`,
      400
    );
  }

  return amount;
}

function normalizeWorkflowFulfillmentType(
  value
) {
  const normalized =
    cleanText(
      value,
      50
    )
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_"
      );

  if (
    normalized ===
      "in_stock" ||
    normalized ===
      "instock"
  ) {
    return "in_stock";
  }

  if (
    normalized ===
    "preorder"
  ) {
    return "preorder";
  }

  if (
    normalized ===
      "mixed" ||
    normalized ===
      "mixed_order"
  ) {
    return "mixed";
  }

  throw new ApiRequestError(
    "Choose In Stock, Preorder, or Mixed Order before confirming payment.",
    400
  );
}

function normalizeWorkflowItemFulfillment(
  value,
  orderItems
) {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  if (
    !Array.isArray(value)
  ) {
    throw new ApiRequestError(
      "Product fulfillment must be submitted as a list.",
      400
    );
  }

  const savedItems =
    Array.isArray(orderItems)
      ? orderItems
      : [];

  if (
    value.length !==
    savedItems.length
  ) {
    throw new ApiRequestError(
      "Choose a fulfillment status for every product in the order.",
      400
    );
  }

  const selectedByIndex =
    new Map();

  value.forEach(
    (entry) => {
      if (
        !entry ||
        typeof entry !==
          "object" ||
        Array.isArray(entry)
      ) {
        throw new ApiRequestError(
          "One of the product fulfillment selections is invalid.",
          400
        );
      }

      const index =
        Number(entry.index);

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >=
          savedItems.length ||
        selectedByIndex.has(index)
      ) {
        throw new ApiRequestError(
          "One of the product fulfillment selections does not match this order.",
          400
        );
      }

      selectedByIndex.set(
        index,
        normalizeWorkflowLineItemStatus(
          entry.status
        )
      );
    }
  );

  return savedItems.map(
    (item, index) => {
      const status =
        selectedByIndex.get(index);

      if (!status) {
        throw new ApiRequestError(
          "Choose a fulfillment status for every product in the order.",
          400
        );
      }

      return {
        index,

        name:
          cleanText(
            item?.name,
            150
          ) ||
          "Product",

        codeName:
          cleanText(
            item?.codeName,
            100
          ),

        strength:
          cleanText(
            item?.strength,
            100
          ),

        quantity:
          Math.max(
            1,
            Number(
              item?.quantity ||
              1
            )
          ),

        status,

        label:
          status ===
          "preorder"
            ? "Preorder"
            : "In Stock",
      };
    }
  );
}

function normalizeWorkflowLineItemStatus(
  value
) {
  const normalized =
    cleanText(
      value,
      50
    )
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_"
      );

  if (
    normalized ===
      "in_stock" ||
    normalized ===
      "instock"
  ) {
    return "in_stock";
  }

  if (
    normalized ===
    "preorder"
  ) {
    return "preorder";
  }

  throw new ApiRequestError(
    "Each product must be marked In Stock or Preorder.",
    400
  );
}

function deriveWorkflowFulfillmentType(
  items
) {
  const statuses =
    new Set(
      items.map(
        (item) =>
          item.status
      )
    );

  if (
    statuses.size > 1
  ) {
    return "mixed";
  }

  return statuses.has(
    "preorder"
  )
    ? "preorder"
    : "in_stock";
}

function buildWorkflowFulfillmentSummary(
  items,
  timingNote
) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return cleanMultilineText(
      timingNote,
      MAX_ORDER_RESTOCK_NOTE_LENGTH
    );
  }

  const inStock =
    items.filter(
      (item) =>
        item.status ===
        "in_stock"
    );

  const preorder =
    items.filter(
      (item) =>
        item.status ===
        "preorder"
    );

  const sections =
    [];

  if (
    inStock.length > 0
  ) {
    sections.push(
      [
        "Shipping soon:",
        ...inStock.map(
          formatWorkflowFulfillmentItem
        ),
      ].join("\n")
    );
  }

  if (
    preorder.length > 0
  ) {
    sections.push(
      [
        "Waiting for restock:",
        ...preorder.map(
          formatWorkflowFulfillmentItem
        ),
      ].join("\n")
    );
  }

  if (timingNote) {
    sections.push(
      `Timing note:\n${timingNote}`
    );
  }

  return cleanMultilineText(
    sections.join(
      "\n\n"
    ),
    MAX_ORDER_RESTOCK_NOTE_LENGTH
  );
}

function formatWorkflowFulfillmentItem(
  item
) {
  const product =
    [
      item.name ||
        item.codeName ||
        "Product",
      item.strength ||
        "",
    ]
      .filter(Boolean)
      .join(" ");

  return `- ${product} x ${Number(item.quantity || 1)}`;
}

function appendOrderWorkflowHistory(
  history,
  event
) {
  return [
    ...(
      Array.isArray(
        history
      )
        ? history
        : []
    ),

    event,
  ].slice(
    -ORDER_WORKFLOW_HISTORY_LIMIT
  );
}

function createOrderWorkflowEventId(
  prefix
) {
  const randomId =
    typeof crypto.randomUUID ===
      "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`;

  return `${prefix}-${randomId}`;
}

function getOrderWorkflowAdminActor(
  request
) {
  return cleanText(
    request.headers.get(
      "Cf-Access-Authenticated-User-Email"
    ) ||
    request.headers.get(
      "CF-Access-Authenticated-User-Email"
    ) ||
    "authorized administrator",
    254
  );
}

/* -------------------------------------------------- */
/* ADMIN ORDER STORAGE API                            */
/* -------------------------------------------------- */

async function handleAdminOrdersRequest(
  request,
  env,
  url
) {
  try {
    validateStorage(
      env
    );

    await requireAdmin(
      request,
      env
    );

    const orderId =
      getRouteValue(
        url.pathname,
        "/api/admin/orders",
        {
          invalidRouteMessage:
            "The order route is invalid.",

          invalidValueMessage:
            "The order number is invalid.",

          normalize:
            normalizeOrderId,
        }
      );

    if (
      !orderId &&
      request.method ===
        "GET"
    ) {
      const records =
        await listRecordsByPrefix(
          env.DOCUMENTS_KV,
          ORDER_KEY_PREFIX
        );

      records.sort(
        (
          left,
          right
        ) =>
          String(
            right.createdAt ||
              right.updatedAt ||
              ""
          ).localeCompare(
            String(
              left.createdAt ||
                left.updatedAt ||
                ""
            )
          )
      );

      return jsonResponse({
        success:
          true,

        records,

        orders:
          records,

        count:
          records.length,
      });
    }

    if (
      !orderId
    ) {
      throw new ApiRequestError(
        "An order number is required.",
        400
      );
    }

    if (
      request.method ===
      "GET"
    ) {
      const record =
        await getOrderRecord(
          env,
          orderId
        );

      if (
        !record
      ) {
        throw new ApiRequestError(
          "Order record not found.",
          404
        );
      }

      return jsonResponse({
        success:
          true,

        record,

        order:
          record,
      });
    }

    if (
      request.method ===
      "PATCH"
    ) {
      validateJsonContentType(
        request
      );

      const body =
        await readJsonRequest(
          request,
          MAX_ORDER_ADMIN_REQUEST_LENGTH,
          "order update"
        );

      const existingRecord =
        await getOrderRecord(
          env,
          orderId
        );

      if (
        !existingRecord
      ) {
        throw new ApiRequestError(
          "Order record not found.",
          404
        );
      }

      const updatedRecord =
        prepareOrderAdminUpdate(
          existingRecord,
          body.order ||
            body
        );

      await putOrderRecord(
        env,
        updatedRecord
      );

      return jsonResponse({
        success:
          true,

        record:
          updatedRecord,

        order:
          updatedRecord,

        message:
          "Order record updated.",
      });
    }

    if (
      request.method ===
      "DELETE"
    ) {
      const existingRecord =
        await getOrderRecord(
          env,
          orderId
        );

      if (
        !existingRecord
      ) {
        throw new ApiRequestError(
          "Order record not found.",
          404
        );
      }

      await env.DOCUMENTS_KV.delete(
        getOrderKey(
          orderId
        )
      );

      return jsonResponse({
        success:
          true,

        message:
          "Order record deleted.",
      });
    }

    throw new ApiRequestError(
      "Method not allowed.",
      405
    );
  } catch (
    error
  ) {
    console.error(
      "Admin order request error:",
      error
    );

    return handleApiError(
      error
    );
  }
}

function normalizeOrderId(
  value
) {
  const orderId =
    cleanText(
      value,
      100
    ).toUpperCase();

  if (
    !/^[A-Z0-9][A-Z0-9-]{2,99}$/.test(
      orderId
    )
  ) {
    throw new ApiRequestError(
      "The order number is invalid.",
      400
    );
  }

  return orderId;
}

function getOrderKey(
  orderId
) {
  return `${ORDER_KEY_PREFIX}${normalizeOrderId(
    orderId
  )}`;
}

async function getOrderRecord(
  env,
  orderId
) {
  return env.DOCUMENTS_KV.get(
    getOrderKey(
      orderId
    ),
    "json"
  );
}

async function putOrderRecord(
  env,
  record
) {
  const orderId =
    normalizeOrderId(
      record.orderId ||
        record.id
    );

  const storedRecord = {
    ...record,

    id:
      orderId,

    orderId,
  };

  await env.DOCUMENTS_KV.put(
    getOrderKey(
      orderId
    ),

    JSON.stringify(
      storedRecord
    ),

    {
      metadata: {
        orderId,

        status:
          cleanText(
            storedRecord.status,
            MAX_ORDER_STATUS_LENGTH
          ),

        email:
          cleanText(
            storedRecord.customer
              ?.email,
            254
          ).toLowerCase(),

        createdAt:
          storedRecord.createdAt ||
          "",

        updatedAt:
          storedRecord.updatedAt ||
          "",
      },
    }
  );

  return storedRecord;
}

function prepareOrderAdminUpdate(
  existingRecord,
  rawUpdate
) {
  if (
    !rawUpdate ||
    typeof rawUpdate !==
      "object" ||
    Array.isArray(
      rawUpdate
    )
  ) {
    throw new ApiRequestError(
      "The order update is invalid.",
      400
    );
  }

  const status =
    rawUpdate.status ===
    undefined
      ? existingRecord.status
      : cleanText(
          rawUpdate.status,
          MAX_ORDER_STATUS_LENGTH
        );

  if (
    !status
  ) {
    throw new ApiRequestError(
      "An order status is required.",
      400
    );
  }

  if (
    status === "Cancelled" &&
    existingRecord.status !== "Cancelled" &&
    !existingRecord.cancellation?.cancelledAt
  ) {
    throw new ApiRequestError(
      "Use Cancel & Restore to cancel this order so eligible inventory is restored safely.",
      409
    );
  }

  if (
    (existingRecord.inventoryRestoredAt ||
      existingRecord.cancellation?.cancelledAt) &&
    status !== "Cancelled"
  ) {
    throw new ApiRequestError(
      "This cancelled order has restored inventory and cannot be reopened through the normal status editor.",
      409
    );
  }

  const adminNotes =
    rawUpdate.adminNotes ===
    undefined
      ? existingRecord.adminNotes ||
        ""
      : cleanMultilineText(
          rawUpdate.adminNotes,
          MAX_ORDER_ADMIN_NOTES_LENGTH
        );

  return {
    ...existingRecord,

    status,

    adminNotes,

    updatedAt:
      new Date().toISOString(),
  };
}

function createStoredOrder(
  protectedOrder,
  serviceResult
) {
  const now =
    new Date().toISOString();

  const orderId =
    normalizeOrderId(
      serviceResult.orderId ||
        protectedOrder.id
    );

  return {
    ...protectedOrder,

    id:
      orderId,

    orderId,

    status:
      "Order Request Received",

    createdAt:
      now,

    updatedAt:
      now,

    date:
      now.slice(
        0,
        10
      ),

    externalServiceMessage:
      cleanText(
        serviceResult.message ||
          "Order request received.",
        500
      ),

    adminNotes:
      "",
  };
}

/* -------------------------------------------------- */
/* CUSTOMER AUTHENTICATION                            */
/* -------------------------------------------------- */

async function handleAuthenticationRequest(
  request,
  env,
  url
) {
  try {
    validateStorage(
      env
    );

    validateCustomerAuthenticationEnvironment(
      env
    );

    if (
      url.pathname ===
      "/api/auth/register"
    ) {
      if (
        request.method !==
        "POST"
      ) {
        throw new ApiRequestError(
          "Method not allowed.",
          405
        );
      }

      return await registerCustomerAccount(
        request,
        env
      );
    }

    if (
      url.pathname ===
      "/api/auth/login"
    ) {
      if (
        request.method !==
        "POST"
      ) {
        throw new ApiRequestError(
          "Method not allowed.",
          405
        );
      }

      return await loginCustomerAccount(
        request,
        env
      );
    }

    if (
      url.pathname ===
      "/api/auth/logout"
    ) {
      if (
        request.method !==
        "POST"
      ) {
        throw new ApiRequestError(
          "Method not allowed.",
          405
        );
      }

      return await logoutCustomerAccount(
        request
      );
    }

    if (
      url.pathname ===
      "/api/auth/session"
    ) {
      if (
        request.method !==
        "GET"
      ) {
        throw new ApiRequestError(
          "Method not allowed.",
          405
        );
      }

      return await getCustomerSessionResponse(
        request,
        env
      );
    }

    throw new ApiRequestError(
      "Authentication route not found.",
      404
    );
  } catch (
    error
  ) {
    console.error(
      "Authentication request error:",
      error
    );

    return handleApiError(
      error
    );
  }
}

function validateCustomerAuthenticationEnvironment(
  env
) {
  if (
    !env.DOCUMENT_ADMIN_SECRET
  ) {
    throw new ApiRequestError(
      "Customer authentication has not been configured.",
      500
    );
  }

  if (
    !env.ORDER_RATE_LIMITER
  ) {
    throw new ApiRequestError(
      "Authentication rate limiting has not been configured.",
      500
    );
  }
}

async function registerCustomerAccount(
  request,
  env
) {
  requireSameOrigin(
    request
  );

  validateJsonContentType(
    request
  );

  await enforceAuthenticationRateLimit(
    request,
    env,
    "register"
  );

  if (
    String(
      env.ACCOUNT_CREATION_ENABLED ||
        "true"
    ).toLowerCase() ===
    "false"
  ) {
    throw new ApiRequestError(
      "New account registration is currently disabled.",
      403
    );
  }

  const body =
    await readJsonRequest(
      request,
      MAX_AUTH_REQUEST_LENGTH,
      "account registration"
    );

  const firstName =
    cleanText(
      body.firstName,
      MAX_ACCOUNT_NAME_LENGTH
    );

  const lastName =
    cleanText(
      body.lastName,
      MAX_ACCOUNT_NAME_LENGTH
    );

  const email =
    normalizeAccountEmail(
      body.email
    );

  const password =
    validateAccountPassword(
      body.password
    );

  const acceptedResearchAgreement =
    body.acceptedResearchAgreement ===
    true;

  if (
    !firstName ||
    !lastName
  ) {
    throw new ApiRequestError(
      "First and last name are required.",
      400
    );
  }

  if (
    !acceptedResearchAgreement
  ) {
    throw new ApiRequestError(
      "Accept the Research Agreement before creating an account.",
      400
    );
  }

  const accountKey =
    await getAccountKey(
      email
    );

  const existingAccount =
    await env.DOCUMENTS_KV.get(
      accountKey,
      "json"
    );

  if (
    existingAccount
  ) {
    throw new ApiRequestError(
      "An account already exists for this email address.",
      409
    );
  }

  const salt =
    randomBytes(
      16
    );

  const passwordHash =
    await derivePasswordHash(
      password,
      salt
    );

  const now =
    new Date().toISOString();

  const account = {
    id:
      `acct_${randomToken(
        16
      )}`,

    firstName,

    lastName,

    email,

    passwordHash:
      bytesToBase64Url(
        passwordHash
      ),

    passwordSalt:
      bytesToBase64Url(
        salt
      ),

    passwordIterations:
      PASSWORD_HASH_ITERATIONS,

    researchAgreementAcceptedAt:
      now,

    createdAt:
      now,

    updatedAt:
      now,

    status:
      "active",
  };

  await env.DOCUMENTS_KV.put(
    accountKey,

    JSON.stringify(
      account
    ),

    {
      metadata: {
        accountId:
          account.id,

        email:
          account.email,

        status:
          account.status,

        createdAt:
          account.createdAt,
      },
    }
  );

  const token =
    await createCustomerSessionToken(
      account,
      env
    );

  return jsonResponse(
    {
      success:
        true,

      authenticated:
        true,

      account:
        toPublicAccount(
          account
        ),

      message:
        "Account created successfully.",
    },
    201,
    {
      "Set-Cookie":
        buildSessionCookie(
          token
        ),
    }
  );
}

async function loginCustomerAccount(
  request,
  env
) {
  requireSameOrigin(
    request
  );

  validateJsonContentType(
    request
  );

  await enforceAuthenticationRateLimit(
    request,
    env,
    "login"
  );

  const body =
    await readJsonRequest(
      request,
      MAX_AUTH_REQUEST_LENGTH,
      "login"
    );

  const email =
    normalizeAccountEmail(
      body.email
    );

  const password =
    String(
      body.password == null
        ? ""
        : body.password
    );

  if (
    !password ||
    password.length >
      MAX_PASSWORD_LENGTH
  ) {
    throw new ApiRequestError(
      "Email or password is incorrect.",
      401
    );
  }

  const accountKey =
    await getAccountKey(
      email
    );

  const account =
    await env.DOCUMENTS_KV.get(
      accountKey,
      "json"
    );

  if (
    !account ||
    account.status !==
      "active"
  ) {
    await performDummyPasswordHash(
      password,
      email
    );

    throw new ApiRequestError(
      "Email or password is incorrect.",
      401
    );
  }

  const passwordMatches =
    await verifyPassword(
      password,
      account
    );

  if (
    !passwordMatches
  ) {
    throw new ApiRequestError(
      "Email or password is incorrect.",
      401
    );
  }

  const token =
    await createCustomerSessionToken(
      account,
      env
    );

  return jsonResponse(
    {
      success:
        true,

      authenticated:
        true,

      account:
        toPublicAccount(
          account
        ),

      message:
        "Login successful.",
    },
    200,
    {
      "Set-Cookie":
        buildSessionCookie(
          token
        ),
    }
  );
}

function logoutCustomerAccount(
  request
) {
  requireSameOrigin(
    request
  );

  return jsonResponse(
    {
      success:
        true,

      authenticated:
        false,

      message:
        "Logged out successfully.",
    },
    200,
    {
      "Set-Cookie":
        buildClearedSessionCookie(),
    }
  );
}

async function getCustomerSessionResponse(
  request,
  env
) {
  const session =
    await getCustomerSession(
      request,
      env
    );

  if (
    !session
  ) {
    return jsonResponse(
      {
        success:
          true,

        authenticated:
          false,

        account:
          null,
      },
      200,
      {
        "Set-Cookie":
          buildClearedSessionCookie(),
      }
    );
  }

  return jsonResponse({
    success:
      true,

    authenticated:
      true,

    account:
      session.account,
  });
}

async function handleCustomerOrdersRequest(
  request,
  env
) {
  try {
    validateStorage(
      env
    );

    validateCustomerAuthenticationEnvironment(
      env
    );

    if (
      request.method !==
      "GET"
    ) {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    const session =
      await requireCustomerSession(
        request,
        env
      );

    const records =
      await listRecordsByPrefix(
        env.DOCUMENTS_KV,
        ORDER_KEY_PREFIX
      );

    const customerOrders =
      records
        .filter(
          (
            order
          ) =>
            cleanText(
              order?.customerAccountId,
              150
            ) ===
            cleanText(
              session.account.id,
              150
            )
        )
        .map(
          toCustomerOrderRecord
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

    return jsonResponse({
      success:
        true,

      records:
        customerOrders,

      orders:
        customerOrders,

      count:
        customerOrders.length,
    });
  } catch (
    error
  ) {
    console.error(
      "Customer order history request error:",
      error
    );

    return handleApiError(
      error
    );
  }
}

async function requireCustomerSession(
  request,
  env
) {
  const session =
    await getCustomerSession(
      request,
      env
    );

  if (
    !session
  ) {
    throw new ApiRequestError(
      "Customer authentication is required.",
      401
    );
  }

  return session;
}

async function getCustomerSession(
  request,
  env
) {
  const token =
    getSessionToken(
      request
    );

  if (
    !token
  ) {
    return null;
  }

  const payload =
    await verifyCustomerSessionToken(
      token,
      env
    );

  if (
    !payload
  ) {
    return null;
  }

  const accountKey =
    await getAccountKey(
      payload.email
    );

  const account =
    await env.DOCUMENTS_KV.get(
      accountKey,
      "json"
    );

  if (
    !account ||
    account.status !==
      "active" ||
    account.id !==
      payload.sub ||
    normalizeAccountEmail(
      account.email
    ) !==
      payload.email
  ) {
    return null;
  }

  return {
    account:
      toPublicAccount(
        account
      ),

    issuedAt:
      payload.iat,

    expiresAt:
      payload.exp,
  };
}

async function createCustomerSessionToken(
  account,
  env
) {
  const issuedAt =
    Math.floor(
      Date.now() /
        1000
    );

  const payload = {
    v:
      1,

    sub:
      account.id,

    email:
      account.email,

    firstName:
      account.firstName,

    lastName:
      account.lastName,

    researchAgreementAcceptedAt:
      account.researchAgreementAcceptedAt ||
      "",

    accountCreatedAt:
      account.createdAt ||
      "",

    accountUpdatedAt:
      account.updatedAt ||
      "",

    iat:
      issuedAt,

    exp:
      issuedAt +
      SESSION_TTL_SECONDS,
  };

  const encodedPayload =
    bytesToBase64Url(
      new TextEncoder().encode(
        JSON.stringify(
          payload
        )
      )
    );

  const signature =
    await signCustomerSessionPayload(
      encodedPayload,
      env
    );

  return `${encodedPayload}.${bytesToBase64Url(
    signature
  )}`;
}

async function verifyCustomerSessionToken(
  token,
  env
) {
  const parts =
    String(
      token ||
        ""
    ).split(
      "."
    );

  if (
    parts.length !==
      2 ||
    !parts[0] ||
    !parts[1]
  ) {
    return null;
  }

  let payload;
  let signature;

  try {
    payload =
      JSON.parse(
        new TextDecoder().decode(
          base64UrlToBytes(
            parts[0]
          )
        )
      );

    signature =
      base64UrlToBytes(
        parts[1]
      );
  } catch {
    return null;
  }

  const key =
    await getCustomerSessionSigningKey(
      env
    );

  const signatureValid =
    await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(
        parts[0]
      )
    );

  if (
    !signatureValid
  ) {
    return null;
  }

  const now =
    Math.floor(
      Date.now() /
        1000
    );

  if (
    payload.v !==
      1 ||
    !payload.sub ||
    !payload.email ||
    !Number.isFinite(
      Number(
        payload.iat
      )
    ) ||
    !Number.isFinite(
      Number(
        payload.exp
      )
    ) ||
    Number(
      payload.exp
    ) <=
      now ||
    Number(
      payload.iat
    ) >
      now +
        300
  ) {
    return null;
  }

  try {
    payload.email =
      normalizeAccountEmail(
        payload.email
      );
  } catch {
    return null;
  }

  return payload;
}

async function signCustomerSessionPayload(
  encodedPayload,
  env
) {
  const key =
    await getCustomerSessionSigningKey(
      env
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(
        encodedPayload
      )
    );

  return new Uint8Array(
    signature
  );
}

async function getCustomerSessionSigningKey(
  env
) {
  const secretMaterial =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        `304-customer-session-v1:${String(
          env.DOCUMENT_ADMIN_SECRET
        )}`
      )
    );

  return crypto.subtle.importKey(
    "raw",
    secretMaterial,
    {
      name:
        "HMAC",

      hash:
        "SHA-256",
    },
    false,
    [
      "sign",
      "verify",
    ]
  );
}

async function enforceAuthenticationRateLimit(
  request,
  env,
  action
) {
  const clientIdentifier =
    getClientIdentifier(
      request
    );

  let result;

  try {
    result =
      await env.ORDER_RATE_LIMITER.limit(
        {
          key:
            `auth:${action}:${clientIdentifier}`,
        }
      );
  } catch (
    error
  ) {
    console.error(
      "Authentication rate limiter failed:",
      error
    );

    throw new ApiRequestError(
      "Account access is temporarily unavailable. Please try again shortly.",
      503
    );
  }

  if (
    !result.success
  ) {
    throw new ApiRequestError(
      "Too many account attempts were received. Please wait one minute and try again.",
      429
    );
  }
}

function requireSameOrigin(
  request
) {
  const requestUrl =
    new URL(
      request.url
    );

  const origin =
    request.headers.get(
      "Origin"
    );

  const fetchSite =
    request.headers.get(
      "Sec-Fetch-Site"
    );

  if (
    origin &&
    origin !==
      requestUrl.origin
  ) {
    throw new ApiRequestError(
      "Cross-site requests are not allowed.",
      403
    );
  }

  if (
    fetchSite &&
    ![
      "same-origin",
      "same-site",
      "none",
    ].includes(
      fetchSite
    )
  ) {
    throw new ApiRequestError(
      "Cross-site requests are not allowed.",
      403
    );
  }
}

function normalizeAccountEmail(
  value
) {
  const email =
    cleanText(
      value,
      MAX_ACCOUNT_EMAIL_LENGTH
    ).toLowerCase();

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    throw new ApiRequestError(
      "Enter a valid email address.",
      400
    );
  }

  return email;
}

function validateAccountPassword(
  value
) {
  const password =
    String(
      value == null
        ? ""
        : value
    );

  if (
    password.length <
    MIN_PASSWORD_LENGTH
  ) {
    throw new ApiRequestError(
      `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
      400
    );
  }

  if (
    password.length >
    MAX_PASSWORD_LENGTH
  ) {
    throw new ApiRequestError(
      `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`,
      400
    );
  }

  return password;
}

async function getAccountKey(
  email
) {
  const emailHash =
    await sha256Hex(
      normalizeAccountEmail(
        email
      )
    );

  return `${ACCOUNT_KEY_PREFIX}${emailHash}`;
}

async function derivePasswordHash(
  password,
  salt,
  iterations =
    PASSWORD_HASH_ITERATIONS
) {
  const keyMaterial =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        password
      ),
      "PBKDF2",
      false,
      [
        "deriveBits",
      ]
    );

  const derivedBits =
    await crypto.subtle.deriveBits(
      {
        name:
          "PBKDF2",

        salt,

        iterations,

        hash:
          "SHA-256",
      },
      keyMaterial,
      256
    );

  return new Uint8Array(
    derivedBits
  );
}

async function verifyPassword(
  password,
  account
) {
  try {
    const salt =
      base64UrlToBytes(
        account.passwordSalt
      );

    const expectedHash =
      base64UrlToBytes(
        account.passwordHash
      );

    const iterations =
      Number(
        account.passwordIterations
      ) ||
      PASSWORD_HASH_ITERATIONS;

    const submittedHash =
      await derivePasswordHash(
        password,
        salt,
        iterations
      );

    return constantTimeBytesEqual(
      submittedHash,
      expectedHash
    );
  } catch (
    error
  ) {
    console.error(
      "Password verification failed:",
      error
    );

    return false;
  }
}

async function performDummyPasswordHash(
  password,
  email
) {
  const seed =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        email
      )
    );

  const salt =
    new Uint8Array(
      seed
    ).slice(
      0,
      16
    );

  await derivePasswordHash(
    password,
    salt
  );
}

function constantTimeBytesEqual(
  left,
  right
) {
  if (
    !(
      left instanceof
      Uint8Array
    ) ||
    !(
      right instanceof
      Uint8Array
    )
  ) {
    return false;
  }

  let difference =
    left.length ^
    right.length;

  const maximumLength =
    Math.max(
      left.length,
      right.length
    );

  for (
    let index =
      0;
    index <
    maximumLength;
    index +=
      1
  ) {
    difference |=
      (left[index] ||
        0) ^
      (right[index] ||
        0);
  }

  return (
    difference ===
    0
  );
}

async function sha256Hex(
  value
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        String(
          value
        )
      )
    );

  return Array.from(
    new Uint8Array(
      digest
    )
  )
    .map(
      (
        byte
      ) =>
        byte
          .toString(
            16
          )
          .padStart(
            2,
            "0"
          )
    )
    .join(
      ""
    );
}

function randomBytes(
  length
) {
  const bytes =
    new Uint8Array(
      length
    );

  crypto.getRandomValues(
    bytes
  );

  return bytes;
}

function randomToken(
  length
) {
  return bytesToBase64Url(
    randomBytes(
      length
    )
  );
}

function bytesToBase64Url(
  bytes
) {
  let binary =
    "";

  for (
    const byte of
    bytes
  ) {
    binary +=
      String.fromCharCode(
        byte
      );
  }

  return btoa(
    binary
  )
    .replace(
      /\+/g,
      "-"
    )
    .replace(
      /\//g,
      "_"
    )
    .replace(
      /=+$/g,
      ""
    );
}

function base64UrlToBytes(
  value
) {
  const normalized =
    String(
      value ||
        ""
    )
      .replace(
        /-/g,
        "+"
      )
      .replace(
        /_/g,
        "/"
      );

  const padded =
    normalized.padEnd(
      normalized.length +
        ((4 -
          (normalized.length %
            4)) %
          4),
      "="
    );

  const binary =
    atob(
      padded
    );

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let index =
      0;
    index <
    binary.length;
    index +=
      1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index
      );
  }

  return bytes;
}

function getSessionToken(
  request
) {
  const cookieHeader =
    request.headers.get(
      "Cookie"
    ) ||
    "";

  const cookies =
    cookieHeader.split(
      ";"
    );

  for (
    const cookie of
    cookies
  ) {
    const separatorIndex =
      cookie.indexOf(
        "="
      );

    if (
      separatorIndex <
      0
    ) {
      continue;
    }

    const name =
      cookie
        .slice(
          0,
          separatorIndex
        )
        .trim();

    const value =
      cookie
        .slice(
          separatorIndex +
            1
        )
        .trim();

    if (
      name ===
      SESSION_COOKIE_NAME
    ) {
      return value;
    }
  }

  return "";
}

function buildSessionCookie(
  token
) {
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join(
    "; "
  );
}

function buildClearedSessionCookie() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join(
    "; "
  );
}

function toPublicAccount(
  account
) {
  return {
    id:
      account.id,

    firstName:
      account.firstName,

    lastName:
      account.lastName,

    email:
      account.email,

    status:
      account.status,

    researchAgreementAcceptedAt:
      account.researchAgreementAcceptedAt,

    createdAt:
      account.createdAt,

    updatedAt:
      account.updatedAt,
  };
}

function toCustomerOrderRecord(
  order
) {
  const invoice =
    order.invoice &&
    typeof order.invoice ===
      "object"
      ? order.invoice
      : {};

  const payment =
    order.payment &&
    typeof order.payment ===
      "object"
      ? order.payment
      : {};

  const fulfillment =
    order.fulfillment &&
    typeof order.fulfillment ===
      "object"
      ? order.fulfillment
      : {};

  const shipments =
    Array.isArray(order.shipments)
      ? order.shipments
      : [];

  const shippingSummary =
    order.shippingSummary &&
    typeof order.shippingSummary ===
      "object"
      ? order.shippingSummary
      : buildWorkflowShippingSummary(
          order.items,
          shipments
        );

  const paymentReceivedForCustomer =
    Boolean(
      payment.receivedAt
    );

  return {
    id:
      order.orderId ||
      order.id,

    orderId:
      order.orderId ||
      order.id,

    status:
      order.status ||
      "Order Request Received",

    date:
      order.date ||
      "",

    createdAt:
      order.createdAt ||
      "",

    updatedAt:
      order.updatedAt ||
      "",

    preferredPaymentLabel:
      order.preferredPaymentLabel ||
      order.paymentMethod ||
      "",

    paymentMethod:
      order.paymentMethod ||
      "",

    customer:
      order.customer ||
      {},

    items:
      Array.isArray(
        order.items
      )
        ? order.items
        : [],

    subtotal:
      Number(
        order.subtotal ||
          0
      ),

    totalQuantity:
      Number(
        order.totalQuantity ||
          0
      ),

    invoice:
      Object.keys(
        invoice
      ).length
        ? {
            subtotalCents:
              Number(
                invoice.subtotalCents ||
                  0
              ),

            shippingCents:
              Number(
                invoice.shippingCents ||
                  0
              ),

            taxCents:
              Number(
                invoice.taxCents ||
                  0
              ),

            totalCents:
              Number(
                invoice.totalCents ||
                  0
              ),

            paymentMethod:
              cleanText(
                invoice.paymentMethod,
                100
              ),

            paymentLink:
              paymentReceivedForCustomer
                ? ""
                : cleanText(
                    invoice.paymentLink,
                    MAX_ORDER_PAYMENT_LINK_LENGTH
                  ),

            paymentDestination:
              paymentReceivedForCustomer
                ? ""
                : cleanText(
                    invoice.paymentDestination,
                    MAX_ORDER_PAYMENT_DESTINATION_LENGTH
                  ),

            paymentNote:
              cleanText(
                invoice.paymentNote,
                100
              ),

            paymentNoteInstruction:
              cleanText(
                invoice.paymentNoteInstruction,
                500
              ),

            firstSentAt:
              invoice.firstSentAt ||
              invoice.sentAt ||
              "",

            lastSentAt:
              invoice.lastSentAt ||
              invoice.sentAt ||
              "",

            sendCount:
              Number(
                invoice.sendCount ||
                  0
              ),
          }
        : null,

    payment:
      Object.keys(
        payment
      ).length
        ? {
            amountCents:
              Number(
                payment.amountCents ||
                  0
              ),

            paymentMethod:
              cleanText(
                payment.paymentMethod,
                100
              ),

            receivedAt:
              payment.receivedAt ||
              "",

            confirmationSentAt:
              payment.confirmationSentAt ||
              "",

            confirmationCount:
              Number(
                payment.confirmationCount ||
                  0
              ),
          }
        : null,

    fulfillment:
      Object.keys(
        fulfillment
      ).length
        ? {
            type:
              cleanText(
                fulfillment.type,
                50
              ),

            label:
              cleanText(
                fulfillment.label,
                100
              ),

            items:
              Array.isArray(
                fulfillment.items
              )
                ? fulfillment.items.map(
                    (item, index) => ({
                      index:
                        Number.isInteger(
                          Number(item?.index)
                        )
                          ? Number(item.index)
                          : index,

                      name:
                        cleanText(
                          item?.name,
                          150
                        ),

                      codeName:
                        cleanText(
                          item?.codeName,
                          100
                        ),

                      strength:
                        cleanText(
                          item?.strength,
                          100
                        ),

                      quantity:
                        Math.max(
                          1,
                          Number(
                            item?.quantity ||
                            1
                          )
                        ),

                      status:
                        item?.status ===
                        "preorder"
                          ? "preorder"
                          : "in_stock",

                      label:
                        item?.status ===
                        "preorder"
                          ? "Preorder"
                          : "In Stock",
                    })
                  )
                : [],

            timingNote:
              cleanMultilineText(
                fulfillment.timingNote,
                MAX_ORDER_TIMING_NOTE_LENGTH
              ),

            restockNote:
              cleanMultilineText(
                fulfillment.restockNote,
                MAX_ORDER_RESTOCK_NOTE_LENGTH
              ),
          }
        : null,

    shipments:
      shipments.map(
        (shipment, shipmentIndex) => ({
          shipmentId:
            cleanText(
              shipment?.shipmentId,
              150
            ),

          packageNumber:
            Math.max(
              1,
              Number(
                shipment?.packageNumber ||
                shipmentIndex + 1
              )
            ),

          carrier:
            cleanText(
              shipment?.carrier,
              50
            ),

          trackingNumber:
            cleanText(
              shipment?.trackingNumber,
              MAX_ORDER_SHIPMENT_TRACKING_LENGTH
            ),

          trackingUrl:
            cleanText(
              shipment?.trackingUrl,
              MAX_ORDER_PAYMENT_LINK_LENGTH
            ),

          trackingStatus:
            cleanText(
              shipment?.trackingStatus,
              50
            ),

          trackingStatusDetails:
            cleanMultilineText(
              shipment?.trackingStatusDetails,
              1000
            ),

          trackingStatusDate:
            cleanText(
              shipment?.trackingStatusDate,
              80
            ),

          trackingStatusLocation:
            cleanText(
              shipment?.trackingStatusLocation,
              200
            ),

          trackingEta:
            cleanText(
              shipment?.trackingEta,
              80
            ),

          note:
            cleanMultilineText(
              shipment?.note,
              MAX_ORDER_SHIPMENT_NOTE_LENGTH
            ),

          shippedAt:
            shipment?.shippedAt ||
            "",

          items:
            Array.isArray(
              shipment?.items
            )
              ? shipment.items.map(
                  (item, index) => ({
                    index:
                      Number.isInteger(
                        Number(item?.index)
                      )
                        ? Number(item.index)
                        : index,

                    name:
                      cleanText(
                        item?.name,
                        150
                      ),

                    codeName:
                      cleanText(
                        item?.codeName,
                        100
                      ),

                    strength:
                      cleanText(
                        item?.strength,
                        100
                      ),

                    quantity:
                      Math.max(
                        1,
                        Number(
                          item?.quantity ||
                          1
                        )
                      ),
                  })
                )
              : [],
        })
      ),

    shippingSummary: {
      totalQuantity:
        Number(
          shippingSummary.totalQuantity ||
          0
        ),

      shippedQuantity:
        Number(
          shippingSummary.shippedQuantity ||
          0
        ),

      remainingQuantity:
        Number(
          shippingSummary.remainingQuantity ||
          0
        ),

      complete:
        shippingSummary.complete ===
        true,
    },
  };
}

/* -------------------------------------------------- */
/* ORDER SUBMISSION API                               */
/* -------------------------------------------------- */

async function handleOrderRequest(
  request,
  env
) {
  try {
    validateOrderEnvironment(
      env
    );

    validateJsonContentType(
      request
    );

    await enforceOrderRateLimit(
      request,
      env
    );

    const requestBody =
      await readJsonRequest(
        request,
        MAX_REQUEST_LENGTH,
        "order"
      );

    const turnstileToken =
      requestBody.turnstileToken ||
      requestBody[
        "cf-turnstile-response"
      ] ||
      "";

    await validateTurnstile(
      request,
      env,
      turnstileToken
    );

    const submittedOrder =
      requestBody.order ||
      requestBody;

    const protectedOrder =
      await prepareOrder(
        submittedOrder,
        env
      );

    const customerSession =
      await getCustomerSession(
        request,
        env
      );

    if (
      customerSession
    ) {
      const accountEmail =
        normalizeAccountEmail(
          customerSession.account
            .email
        );

      const checkoutEmail =
        normalizeAccountEmail(
          protectedOrder.customer
            .email
        );

      if (
        accountEmail !==
        checkoutEmail
      ) {
        throw new OrderRequestError(
          "The checkout email must match the logged-in account email.",
          400
        );
      }

      protectedOrder.customerAccountId =
        customerSession.account.id;
    }

    const response =
      await fetch(
        env.ORDER_WEB_APP_URL,
        {
          method:
            "POST",

          redirect:
            "follow",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              secret:
                env.ORDER_API_SECRET,

              order:
                protectedOrder,
            }),
        }
      );

    const responseText =
      await response.text();

    let result;

    try {
      result =
        JSON.parse(
          responseText
        );
    } catch {
      throw new OrderRequestError(
        "The order service returned an invalid response.",
        502
      );
    }

    if (
      !response.ok ||
      !result.success
    ) {
      throw new OrderRequestError(
        result.error ||
          "The order request could not be submitted.",
        502
      );
    }

    const storedOrder =
      createStoredOrder(
        protectedOrder,
        result
      );

    await putOrderRecord(
      env,
      storedOrder
    );

    return jsonResponse({
      success:
        true,

      orderId:
        storedOrder.orderId,

      order:
        storedOrder,

      message:
        result.message ||
        "Order request received.",
    });
  } catch (
    error
  ) {
    console.error(
      "Order request error:",
      error
    );

    const status =
      error instanceof
          OrderRequestError ||
      error instanceof
          ApiRequestError
        ? error.status
        : 500;

    return jsonResponse(
      {
        success:
          false,

        error:
          error.message ||
          "The order request could not be submitted.",
      },
      status
    );
  }
}

function validateOrderEnvironment(
  env
) {
  if (
    !env.ORDER_WEB_APP_URL ||
    !env.ORDER_API_SECRET ||
    !env.TURNSTILE_SECRET_KEY ||
    !env.ORDER_RATE_LIMITER ||
    !env.DOCUMENTS_KV
  ) {
    throw new OrderRequestError(
      "The order service has not been configured.",
      500
    );
  }
}

async function enforceOrderRateLimit(
  request,
  env
) {
  const clientIdentifier =
    getClientIdentifier(
      request
    );

  let result;

  try {
    result =
      await env.ORDER_RATE_LIMITER.limit(
        {
          key:
            `order:${clientIdentifier}`,
        }
      );
  } catch (
    error
  ) {
    console.error(
      "Order rate limiter failed:",
      error
    );

    throw new OrderRequestError(
      "Order submissions are temporarily unavailable. Please try again shortly.",
      503
    );
  }

  if (
    !result.success
  ) {
    throw new OrderRequestError(
      "Too many order attempts were received. Please wait one minute and try again.",
      429
    );
  }
}

function getClientIdentifier(
  request
) {
  const cloudflareIp =
    request.headers.get(
      "CF-Connecting-IP"
    );

  if (
    cloudflareIp
  ) {
    return cleanText(
      cloudflareIp,
      100
    );
  }

  const forwardedFor =
    request.headers.get(
      "X-Forwarded-For"
    );

  if (
    forwardedFor
  ) {
    return cleanText(
      forwardedFor
        .split(
          ","
        )[0],
      100
    );
  }

  return "unknown-client";
}

async function validateTurnstile(
  request,
  env,
  submittedToken
) {
  const token =
    cleanText(
      submittedToken,
      MAX_TURNSTILE_TOKEN_LENGTH
    );

  if (
    !token
  ) {
    throw new OrderRequestError(
      "Complete the security verification before submitting your order.",
      400
    );
  }

  const clientIp =
    request.headers.get(
      "CF-Connecting-IP"
    ) ||
    "";

  let response;

  try {
    response =
      await fetch(
        TURNSTILE_VERIFY_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              secret:
                env.TURNSTILE_SECRET_KEY,

              response:
                token,

              idempotency_key:
                crypto.randomUUID(),

              ...(clientIp
                ? {
                    remoteip:
                      clientIp,
                  }
                : {}),
            }),
        }
      );
  } catch (
    error
  ) {
    console.error(
      "Turnstile request failed:",
      error
    );

    throw new OrderRequestError(
      "Security verification is temporarily unavailable. Please try again.",
      502
    );
  }

  if (
    !response.ok
  ) {
    console.error(
      "Turnstile returned HTTP status:",
      response.status
    );

    throw new OrderRequestError(
      "Security verification is temporarily unavailable. Please try again.",
      502
    );
  }

  let result;

  try {
    result =
      await response.json();
  } catch (
    error
  ) {
    console.error(
      "Turnstile returned invalid JSON:",
      error
    );

    throw new OrderRequestError(
      "Security verification is temporarily unavailable. Please try again.",
      502
    );
  }

  if (
    !result.success
  ) {
    console.warn(
      "Turnstile verification failed:",
      result[
        "error-codes"
      ] ||
        []
    );

    throw new OrderRequestError(
      "Security verification failed or expired. Complete it again and resubmit your order.",
      400
    );
  }

  if (
    result.action !==
    TURNSTILE_ACTION
  ) {
    console.warn(
      "Turnstile action mismatch:",
      result.action
    );

    throw new OrderRequestError(
      "Security verification could not be confirmed. Please try again.",
      400
    );
  }

  if (
    result.hostname !==
    TURNSTILE_HOSTNAME
  ) {
    console.warn(
      "Turnstile hostname mismatch:",
      result.hostname
    );

    throw new OrderRequestError(
      "Security verification could not be confirmed. Please try again.",
      400
    );
  }
}

async function prepareOrder(
  rawOrder,
  env
) {
  if (
    !rawOrder ||
    typeof rawOrder !==
      "object" ||
    Array.isArray(
      rawOrder
    )
  ) {
    throw new OrderRequestError(
      "The order information is invalid.",
      400
    );
  }

  const customer =
    prepareCustomer(
      rawOrder.customer ||
        rawOrder
    );

  const paymentMethod =
    normalizePaymentMethod(
      rawOrder.preferredPaymentLabel ||
        rawOrder.preferredPaymentMethod ||
        rawOrder.paymentMethod
    );

  if (
    !paymentMethod
  ) {
    throw new OrderRequestError(
      "A valid payment preference is required.",
      400
    );
  }

  if (
    !Array.isArray(
      rawOrder.items
    ) ||
    rawOrder.items.length ===
      0
  ) {
    throw new OrderRequestError(
      "The order does not contain any products.",
      400
    );
  }

  if (
    rawOrder.items.length >
    MAX_LINE_ITEMS
  ) {
    throw new OrderRequestError(
      "The order contains too many products.",
      400
    );
  }

  const items = await Promise.all(
    rawOrder.items.map((item, index) =>
      prepareItem(item, index, env)
    )
  );

  const totalQuantity =
    items.reduce(
      (
        total,
        item
      ) =>
        total +
        item.quantity,
      0
    );

  if (
    totalQuantity >
    MAX_TOTAL_QUANTITY
  ) {
    throw new OrderRequestError(
      `Orders are limited to ${MAX_TOTAL_QUANTITY} total units.`,
      400
    );
  }

  const subtotalInCents =
    items.reduce(
      (
        total,
        item
      ) =>
        total +
        Math.round(
          item.price *
            100
        ) *
          item.quantity,
      0
    );

  const rawCouponCode = cleanText(rawOrder.couponCode, 50).toUpperCase();
  let couponCode = "";
  let couponDescription = "";
  let couponType = "";
  let discountInCents = 0;
  let couponFreeShipping = false;

  if (rawCouponCode) {
    const couponResult = await validateCouponForOrder(
      env,
      rawCouponCode,
      subtotalInCents
    );

    couponCode = couponResult.record.code;
    couponDescription = couponResult.record.description;
    couponType = couponResult.record.type;
    discountInCents = couponResult.discountCents;
    couponFreeShipping = couponResult.freeShipping;
  }

  const discountedSubtotalInCents = Math.max(
    0,
    subtotalInCents - discountInCents
  );

  const shippingFeeInCents =
    couponFreeShipping ||
    discountedSubtotalInCents >= FREE_SHIPPING_THRESHOLD_CENTS
      ? 0
      : FLAT_SHIPPING_FEE_CENTS;

  const totalInCents =
    discountedSubtotalInCents + shippingFeeInCents;

  return {
    id:
      createOrderId(),

    customer,

    paymentMethod,

    preferredPaymentLabel:
      paymentMethod,

    items,

    merchandiseSubtotal:
      subtotalInCents /
      100,

    discount:
      discountInCents /
      100,

    couponCode,

    couponDescription,

    couponType,

    subtotal:
      discountedSubtotalInCents /
      100,

    shippingFee:
      shippingFeeInCents /
      100,

    total:
      totalInCents /
      100,

    freeShipping:
      shippingFeeInCents === 0,

    totalQuantity,
  };
}

function prepareCustomer(
  rawCustomer
) {
  if (
    !rawCustomer ||
    typeof rawCustomer !==
      "object" ||
    Array.isArray(
      rawCustomer
    )
  ) {
    throw new OrderRequestError(
      "Customer information is missing.",
      400
    );
  }

  const customer = {
    firstName:
      cleanText(
        rawCustomer.firstName,
        100
      ),

    lastName:
      cleanText(
        rawCustomer.lastName,
        100
      ),

    email:
      cleanText(
        rawCustomer.email,
        254
      ).toLowerCase(),

    address:
      cleanText(
        rawCustomer.address,
        200
      ),

    city:
      cleanText(
        rawCustomer.city,
        100
      ),

    state:
      cleanText(
        rawCustomer.state,
        100
      ),

    zip:
      cleanText(
        rawCustomer.zip,
        20
      ),
  };

  if (
    !customer.firstName ||
    !customer.lastName ||
    !customer.email ||
    !customer.address ||
    !customer.city ||
    !customer.state ||
    !customer.zip
  ) {
    throw new OrderRequestError(
      "Required customer information is missing.",
      400
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      customer.email
    )
  ) {
    throw new OrderRequestError(
      "The customer email address is invalid.",
      400
    );
  }

  return customer;
}

async function prepareItem(
  rawItem,
  index,
  env
) {
  if (
    !rawItem ||
    typeof rawItem !==
      "object" ||
    Array.isArray(
      rawItem
    )
  ) {
    throw new OrderRequestError(
      `Product ${index + 1} is invalid.`,
      400
    );
  }

  const codeName =
    cleanText(
      rawItem.codeName,
      100
    );

  if (
    !codeName
  ) {
    throw new OrderRequestError(
      `Product ${index + 1} is missing its product code.`,
      400
    );
  }

  const catalogItem =
    await getProtectedCatalogItem(
      env,
      codeName
    );

  const quantity =
    Number(
      rawItem.quantity
    );

  if (
    !Number.isInteger(
      quantity
    ) ||
    quantity <
      1 ||
    quantity >
      100
  ) {
    throw new OrderRequestError(
      `The quantity for ${catalogItem.name} is invalid.`,
      400
    );
  }

  if (
    catalogItem.trackQuantity === true &&
    catalogItem.availability?.key === "in_stock" &&
    quantity > Number(catalogItem.quantity || 0)
  ) {
    throw new OrderRequestError(
      `Only ${catalogItem.quantity} unit(s) of ${catalogItem.name} ${catalogItem.strength} are currently in stock.`,
      409
    );
  }

  return {
    name:
      catalogItem.name,

    codeName,

    strength:
      catalogItem.strength,

    quantity,

    price:
      catalogItem.price,

    unitCost:
      Number(catalogItem.unitCost || 0),

    ...(catalogItem.composition
      ? {
          composition:
            catalogItem.composition,
        }
      : {}),
  };
}

function normalizePaymentMethod(
  value
) {
  const normalized =
    cleanText(
      value,
      50
    ).toLowerCase();

  const paymentMethods = {
    zelle:
      "Zelle",

    venmo:
      "Venmo",

    cashapp:
      "Cash App",

    "cash app":
      "Cash App",

    "cash-app":
      "Cash App",
  };

  return (
    paymentMethods[
      normalized
    ] ||
    ""
  );
}

function createOrderId() {
  const randomValues =
    new Uint32Array(
      1
    );

  crypto.getRandomValues(
    randomValues
  );

  const number =
    10000000 +
    (randomValues[0] %
      90000000);

  return `304-${number}`;
}

/* -------------------------------------------------- */
/* ADMIN AUTHORIZATION                                */
/* -------------------------------------------------- */

async function requireAdmin(
  request,
  env
) {
  if (
    !env.DOCUMENT_ADMIN_SECRET
  ) {
    throw new ApiRequestError(
      "Administration has not been configured.",
      500
    );
  }

  const authorization =
    request.headers.get(
      "Authorization"
    ) ||
    "";

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  const submittedSecret =
    match?.[1]?.trim() ||
    "";

  if (
    !submittedSecret ||
    !(await secretsMatch(
      submittedSecret,
      String(
        env.DOCUMENT_ADMIN_SECRET
      )
    ))
  ) {
    throw new ApiRequestError(
      "Administrator authorization is required.",
      401
    );
  }
}

async function secretsMatch(
  submittedSecret,
  expectedSecret
) {
  const encoder =
    new TextEncoder();

  const [
    submittedDigest,
    expectedDigest,
  ] =
    await Promise.all([
      crypto.subtle.digest(
        "SHA-256",
        encoder.encode(
          submittedSecret
        )
      ),

      crypto.subtle.digest(
        "SHA-256",
        encoder.encode(
          expectedSecret
        )
      ),
    ]);

  const submittedBytes =
    new Uint8Array(
      submittedDigest
    );

  const expectedBytes =
    new Uint8Array(
      expectedDigest
    );

  if (
    submittedBytes.length !==
    expectedBytes.length
  ) {
    return false;
  }

  let difference =
    0;

  for (
    let index =
      0;
    index <
    submittedBytes.length;
    index +=
      1
  ) {
    difference |=
      submittedBytes[
        index
      ] ^
      expectedBytes[
        index
      ];
  }

  return (
    difference ===
    0
  );
}

/* -------------------------------------------------- */
/* SHARED STORAGE AND ROUTING                         */
/* -------------------------------------------------- */

function validateStorage(
  env
) {
  if (
    !env.DOCUMENTS_KV
  ) {
    throw new ApiRequestError(
      "Cloudflare KV storage has not been configured.",
      500
    );
  }
}

function getRouteValue(
  pathname,
  routeBase,
  {
    invalidRouteMessage,
    invalidValueMessage,
    normalize,
  }
) {
  if (
    pathname ===
    routeBase
  ) {
    return "";
  }

  const routePrefix =
    `${routeBase}/`;

  if (
    !pathname.startsWith(
      routePrefix
    )
  ) {
    return "";
  }

  const encodedValue =
    pathname.slice(
      routePrefix.length
    );

  if (
    !encodedValue ||
    encodedValue.includes(
      "/"
    )
  ) {
    throw new ApiRequestError(
      invalidRouteMessage,
      404
    );
  }

  let decodedValue;

  try {
    decodedValue =
      decodeURIComponent(
        encodedValue
      );
  } catch {
    throw new ApiRequestError(
      invalidValueMessage,
      400
    );
  }

  return normalize(
    decodedValue
  );
}

async function listRecordsByPrefix(
  namespace,
  prefix
) {
  const keys =
    [];

  let cursor;

  do {
    const result =
      await namespace.list({
        prefix,

        ...(cursor
          ? {
              cursor,
            }
          : {}),
      });

    keys.push(
      ...result.keys
    );

    cursor =
      result.list_complete
        ? undefined
        : result.cursor;
  } while (
    cursor
  );

  const records =
    await Promise.all(
      keys.map(
        (
          key
        ) =>
          namespace.get(
            key.name,
            "json"
          )
      )
    );

  return records.filter(
    Boolean
  );
}

/* -------------------------------------------------- */
/* SHARED VALIDATION                                  */
/* -------------------------------------------------- */

function validateJsonContentType(
  request
) {
  const contentType =
    request.headers.get(
      "content-type"
    ) ||
    "";

  if (
    !contentType
      .toLowerCase()
      .includes(
        "application/json"
      )
  ) {
    throw new ApiRequestError(
      "The request must contain JSON.",
      415
    );
  }
}

async function readJsonRequest(
  request,
  maximumLength,
  label
) {
  const declaredLength =
    Number(
      request.headers.get(
        "content-length"
      )
    ) ||
    0;

  if (
    declaredLength >
    maximumLength
  ) {
    throw new ApiRequestError(
      `The ${label} request is too large.`,
      413
    );
  }

  const text =
    await request.text();

  if (
    text.length >
    maximumLength
  ) {
    throw new ApiRequestError(
      `The ${label} request is too large.`,
      413
    );
  }

  if (
    !text.trim()
  ) {
    throw new ApiRequestError(
      `The ${label} request is empty.`,
      400
    );
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    throw new ApiRequestError(
      "The request contains invalid JSON.",
      400
    );
  }
}

function cleanUrl(
  value,
  label
) {
  const cleanedValue =
    String(
      value == null
        ? ""
        : value
    ).trim();

  if (
    !cleanedValue
  ) {
    return "";
  }

  if (
    cleanedValue.length >
    MAX_DOCUMENT_URL_LENGTH
  ) {
    throw new ApiRequestError(
      `The ${label} link is too long.`,
      400
    );
  }

  let url;

  try {
    url =
      new URL(
        cleanedValue
      );
  } catch {
    throw new ApiRequestError(
      `Enter a valid ${label} link beginning with http:// or https://.`,
      400
    );
  }

  if (
    url.protocol !==
      "http:" &&
    url.protocol !==
      "https:"
  ) {
    throw new ApiRequestError(
      `Enter a valid ${label} link beginning with http:// or https://.`,
      400
    );
  }

  return url.toString();
}

function isValidIsoDate(
  value
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${value}T00:00:00.000Z`
    );

  return (
    !Number.isNaN(
      date.getTime()
    ) &&
    date
      .toISOString()
      .slice(
        0,
        10
      ) ===
      value
  );
}

function cleanMultilineText(
  value,
  maximumLength
) {
  return String(
    value == null
      ? ""
      : value
  )
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      " "
    )
    .replace(
      /\r\n?/g,
      "\n"
    )
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function cleanText(
  value,
  maximumLength
) {
  return String(
    value == null
      ? ""
      : value
  )
    .replace(
      /[\u0000-\u001F\u007F]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .slice(
      0,
      maximumLength
    );
}

/* -------------------------------------------------- */
/* SHARED RESPONSES                                   */
/* -------------------------------------------------- */

function handleApiError(
  error
) {
  const status =
    error instanceof
        ApiRequestError ||
    error instanceof
        OrderRequestError
      ? error.status
      : 500;

  return jsonResponse(
    {
      success:
        false,

      error:
        error.message ||
        "The request could not be completed.",
    },
    status
  );
}

function jsonResponse(
  payload,
  status = 200,
  extraHeaders = {}
) {
  const headers =
    new Headers({
      "Content-Type":
        "application/json; charset=utf-8",

      "Cache-Control":
        "no-store",
    });

  for (
    const [
      name,
      value,
    ] of Object.entries(
      extraHeaders
    )
  ) {
    if (
      value !==
        undefined &&
      value !==
        null &&
      value !==
        ""
    ) {
      headers.set(
        name,
        String(
          value
        )
      );
    }
  }

  return new Response(
    JSON.stringify(
      payload
    ),
    {
      status,
      headers,
    }
  );
}

class OrderRequestError extends Error {
  constructor(
    message,
    status = 400
  ) {
    super(
      message
    );

    this.name =
      "OrderRequestError";

    this.status =
      status;
  }
}

class ApiRequestError extends Error {
  constructor(
    message,
    status = 400
  ) {
    super(
      message
    );

    this.name =
      "ApiRequestError";

    this.status =
      status;
  }
}

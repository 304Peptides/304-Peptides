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

const DOCUMENT_KEY_PREFIX = "document:";
const ORDER_KEY_PREFIX = "order:";

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
};

/* -------------------------------------------------- */
/* DOCUMENTATION API                                  */
/* -------------------------------------------------- */

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
      prepareOrder(
        submittedOrder
      );

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

function prepareOrder(
  rawOrder
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

  const items =
    rawOrder.items.map(
      prepareItem
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

  return {
    id:
      createOrderId(),

    customer,

    paymentMethod,

    preferredPaymentLabel:
      paymentMethod,

    items,

    subtotal:
      subtotalInCents /
      100,

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

function prepareItem(
  rawItem,
  index
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
    getOrderCatalogItem(
      codeName
    );

  if (
    !catalogItem
  ) {
    throw new OrderRequestError(
      `Product code ${codeName} is not available.`,
      400
    );
  }

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

  return {
    name:
      catalogItem.name,

    codeName,

    strength:
      catalogItem.strength,

    quantity,

    price:
      catalogItem.price,

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
  status = 200
) {
  return new Response(
    JSON.stringify(
      payload
    ),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",
      },
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
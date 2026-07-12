import {
  getOrderCatalogItem,
} from "./orderCatalog.js";

const MAX_REQUEST_LENGTH = 100000;
const MAX_LINE_ITEMS = 50;
const MAX_TOTAL_QUANTITY = 100;
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const TURNSTILE_ACTION =
  "checkout_order";

const TURNSTILE_HOSTNAME =
  "304peptides.com";

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

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse(
        {
          success: false,
          error: "API route not found.",
        },
        404
      );
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleOrderRequest(
  request,
  env
) {
  try {
    validateEnvironment_(env);
    validateContentType_(request);

    await enforceOrderRateLimit_(
      request,
      env
    );

    const requestBody =
      await readRequestBody_(request);

    const turnstileToken =
      requestBody.turnstileToken ||
      requestBody[
        "cf-turnstile-response"
      ] ||
      "";

    await validateTurnstile_(
      request,
      env,
      turnstileToken
    );

    const submittedOrder =
      requestBody.order ||
      requestBody;

    const protectedOrder =
      prepareOrder_(submittedOrder);

    const response = await fetch(
      env.ORDER_WEB_APP_URL,
      {
        method: "POST",
        redirect: "follow",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          secret:
            env.ORDER_API_SECRET,

          order: protectedOrder,
        }),
      }
    );

    const responseText =
      await response.text();

    let result;

    try {
      result = JSON.parse(
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

    return jsonResponse({
      success: true,

      orderId:
        result.orderId ||
        protectedOrder.id,

      message:
        result.message ||
        "Order request received.",
    });
  } catch (error) {
    console.error(
      "Order request error:",
      error
    );

    const status =
      error instanceof
      OrderRequestError
        ? error.status
        : 500;

    return jsonResponse(
      {
        success: false,

        error:
          error.message ||
          "The order request could not be submitted.",
      },
      status
    );
  }
}

function validateEnvironment_(env) {
  if (
    !env.ORDER_WEB_APP_URL ||
    !env.ORDER_API_SECRET ||
    !env.TURNSTILE_SECRET_KEY ||
    !env.ORDER_RATE_LIMITER
  ) {
    throw new OrderRequestError(
      "The order service has not been configured.",
      500
    );
  }
}

function validateContentType_(request) {
  const contentType =
    request.headers.get(
      "content-type"
    ) || "";

  if (
    !contentType
      .toLowerCase()
      .includes(
        "application/json"
      )
  ) {
    throw new OrderRequestError(
      "The request must contain JSON.",
      415
    );
  }
}

async function enforceOrderRateLimit_(
  request,
  env
) {
  const clientIdentifier =
    getClientIdentifier_(request);

  let result;

  try {
    result =
      await env.ORDER_RATE_LIMITER.limit({
        key:
          `order:${clientIdentifier}`,
      });
  } catch (error) {
    console.error(
      "Order rate limiter failed:",
      error
    );

    throw new OrderRequestError(
      "Order submissions are temporarily unavailable. Please try again shortly.",
      503
    );
  }

  if (!result.success) {
    throw new OrderRequestError(
      "Too many order attempts were received. Please wait one minute and try again.",
      429
    );
  }
}

function getClientIdentifier_(
  request
) {
  const cloudflareIp =
    request.headers.get(
      "CF-Connecting-IP"
    );

  if (cloudflareIp) {
    return cleanText_(
      cloudflareIp,
      100
    );
  }

  const forwardedFor =
    request.headers.get(
      "X-Forwarded-For"
    );

  if (forwardedFor) {
    return cleanText_(
      forwardedFor.split(",")[0],
      100
    );
  }

  return "unknown-client";
}

async function readRequestBody_(
  request
) {
  const declaredLength =
    Number(
      request.headers.get(
        "content-length"
      )
    ) || 0;

  if (
    declaredLength >
    MAX_REQUEST_LENGTH
  ) {
    throw new OrderRequestError(
      "The order request is too large.",
      413
    );
  }

  const text =
    await request.text();

  if (
    text.length >
    MAX_REQUEST_LENGTH
  ) {
    throw new OrderRequestError(
      "The order request is too large.",
      413
    );
  }

  if (!text.trim()) {
    throw new OrderRequestError(
      "The order request is empty.",
      400
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new OrderRequestError(
      "The request contains invalid JSON.",
      400
    );
  }
}

async function validateTurnstile_(
  request,
  env,
  submittedToken
) {
  const token = cleanText_(
    submittedToken,
    MAX_TURNSTILE_TOKEN_LENGTH
  );

  if (!token) {
    throw new OrderRequestError(
      "Complete the security verification before submitting your order.",
      400
    );
  }

  const clientIp =
    request.headers.get(
      "CF-Connecting-IP"
    ) || "";

  let response;

  try {
    response = await fetch(
      TURNSTILE_VERIFY_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          secret:
            env.TURNSTILE_SECRET_KEY,

          response: token,

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
  } catch (error) {
    console.error(
      "Turnstile request failed:",
      error
    );

    throw new OrderRequestError(
      "Security verification is temporarily unavailable. Please try again.",
      502
    );
  }

  if (!response.ok) {
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
  } catch (error) {
    console.error(
      "Turnstile returned invalid JSON:",
      error
    );

    throw new OrderRequestError(
      "Security verification is temporarily unavailable. Please try again.",
      502
    );
  }

  if (!result.success) {
    console.warn(
      "Turnstile verification failed:",
      result["error-codes"] || []
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

function prepareOrder_(rawOrder) {
  if (
    !rawOrder ||
    typeof rawOrder !== "object" ||
    Array.isArray(rawOrder)
  ) {
    throw new OrderRequestError(
      "The order information is invalid.",
      400
    );
  }

  const customer =
    prepareCustomer_(
      rawOrder.customer ||
        rawOrder
    );

  const paymentMethod =
    normalizePaymentMethod_(
      rawOrder.preferredPaymentLabel ||
        rawOrder.preferredPaymentMethod ||
        rawOrder.paymentMethod
    );

  if (!paymentMethod) {
    throw new OrderRequestError(
      "A valid payment preference is required.",
      400
    );
  }

  if (
    !Array.isArray(
      rawOrder.items
    ) ||
    rawOrder.items.length === 0
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
      prepareItem_
    );

  const totalQuantity =
    items.reduce(
      (total, item) =>
        total + item.quantity,
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
      (total, item) =>
        total +
        Math.round(
          item.price * 100
        ) *
          item.quantity,
      0
    );

  return {
    id: createOrderId_(),

    customer,

    paymentMethod,

    preferredPaymentLabel:
      paymentMethod,

    items,

    subtotal:
      subtotalInCents / 100,

    totalQuantity,
  };
}

function prepareCustomer_(
  rawCustomer
) {
  if (
    !rawCustomer ||
    typeof rawCustomer !== "object" ||
    Array.isArray(rawCustomer)
  ) {
    throw new OrderRequestError(
      "Customer information is missing.",
      400
    );
  }

  const customer = {
    firstName: cleanText_(
      rawCustomer.firstName,
      100
    ),

    lastName: cleanText_(
      rawCustomer.lastName,
      100
    ),

    email: cleanText_(
      rawCustomer.email,
      254
    ).toLowerCase(),

    address: cleanText_(
      rawCustomer.address,
      200
    ),

    city: cleanText_(
      rawCustomer.city,
      100
    ),

    state: cleanText_(
      rawCustomer.state,
      100
    ),

    zip: cleanText_(
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

function prepareItem_(
  rawItem,
  index
) {
  if (
    !rawItem ||
    typeof rawItem !== "object" ||
    Array.isArray(rawItem)
  ) {
    throw new OrderRequestError(
      `Product ${index + 1} is invalid.`,
      400
    );
  }

  const codeName =
    cleanText_(
      rawItem.codeName,
      100
    );

  if (!codeName) {
    throw new OrderRequestError(
      `Product ${index + 1} is missing its product code.`,
      400
    );
  }

  const catalogItem =
    getOrderCatalogItem(
      codeName
    );

  if (!catalogItem) {
    throw new OrderRequestError(
      `Product code ${codeName} is not available.`,
      400
    );
  }

  const quantity =
    Number(rawItem.quantity);

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 100
  ) {
    throw new OrderRequestError(
      `The quantity for ${catalogItem.name} is invalid.`,
      400
    );
  }

  return {
    name: catalogItem.name,
    codeName,
    strength:
      catalogItem.strength,
    quantity,
    price: catalogItem.price,

    ...(catalogItem.composition
      ? {
          composition:
            catalogItem.composition,
        }
      : {}),
  };
}

function normalizePaymentMethod_(
  value
) {
  const normalized =
    cleanText_(
      value,
      50
    ).toLowerCase();

  const paymentMethods = {
    zelle: "Zelle",
    venmo: "Venmo",
    cashapp: "Cash App",
    "cash app": "Cash App",
    "cash-app": "Cash App",
  };

  return (
    paymentMethods[
      normalized
    ] || ""
  );
}

function createOrderId_() {
  const randomValues =
    new Uint32Array(1);

  crypto.getRandomValues(
    randomValues
  );

  const number =
    10000000 +
    (randomValues[0] %
      90000000);

  return `304-${number}`;
}

function cleanText_(
  value,
  maximumLength
) {
  return String(
    value == null ? "" : value
  )
    .replace(
      /[\u0000-\u001F\u007F]/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function jsonResponse(
  payload,
  status = 200
) {
  return new Response(
    JSON.stringify(payload),
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
    super(message);

    this.name =
      "OrderRequestError";

    this.status =
      status;
  }
}
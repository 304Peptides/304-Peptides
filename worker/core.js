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
const MAX_ORDER_RESTOCK_NOTE_LENGTH = 1000;
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
        "/api/admin/order-actions/payment-received"
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

    validateOrderWorkflowEnvironment(
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
      0,
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

  const fulfillmentType =
    normalizeWorkflowFulfillmentType(
      body.fulfillmentType
    );

  const referenceNumber =
    cleanText(
      body.referenceNumber,
      MAX_ORDER_PAYMENT_REFERENCE_LENGTH
    );

  const restockNote =
    cleanMultilineText(
      body.restockNote,
      MAX_ORDER_RESTOCK_NOTE_LENGTH
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
        : "In Stock",

    restockNote:
      fulfillmentType ===
      "preorder"
        ? restockNote
        : "",
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

    const updatedOrder = {
      ...order,

      status:
        fulfillmentType ===
        "preorder"
          ? "Paid — Awaiting Restock"
          : "Paid — Awaiting Shipment",

      payment: {
        ...existingPayment,

        ...paymentPayload,

        confirmationCount,

        lastEventId:
          eventId,
      },

      fulfillment,

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
      "The Google Workspace email could not be sent.",
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

  throw new ApiRequestError(
    "Choose In Stock or Preorder before confirming payment.",
    400
  );
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
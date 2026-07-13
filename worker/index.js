import coreWorker from "./core.js";

export { PartnerRegistry } from "./partnerRegistry.js";

const MAX_AUTH_REQUEST_LENGTH = 20_000;
const MAX_ACCOUNT_EMAIL_LENGTH = 254;
const MAX_ACCOUNT_CONTROL_REASON_LENGTH = 500;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const PASSWORD_HASH_ITERATIONS = 100_000;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const ACCOUNT_KEY_PREFIX = "account:";
const SESSION_COOKIE_NAME = "__Host-304_session";
const ORDER_KEY_PREFIX = "order:";
const PARTNER_REGISTRY_NAME = "global";
const PARTNER_AGREEMENT_VERSION = "2026-07-12-v1";
const MAX_PARTNER_CODE_LENGTH = 20;
const MIN_PARTNER_CODE_LENGTH = 4;
const MAX_PARTNER_PLATFORM_LENGTH = 100;
const MAX_PARTNER_PROFILE_URL_LENGTH = 500;
const MAX_PARTNER_AUDIENCE_LENGTH = 100;
const MAX_PARTNER_PROMOTION_PLAN_LENGTH = 2_000;
const MAX_PARTNER_EXPERIENCE_LENGTH = 1_000;
const MAX_PARTNER_CUSTOMER_MESSAGE_LENGTH = 1_000;
const MAX_PARTNER_ADMIN_NOTES_LENGTH = 2_000;
const MAX_REFERRAL_CODE_LENGTH = 20;
const MAX_REFERRAL_CUSTOMER_EMAIL_LENGTH = 254;
const MAX_COMMISSION_RATE_BPS = 5_000;

const RESERVED_PARTNER_CODES = new Set([
  "304",
  "304PEPTIDES",
  "304-PEPTIDES",
  "ADMIN",
  "ADMINISTRATOR",
  "BILLING",
  "CHECKOUT",
  "CUSTOMER-SERVICE",
  "FREE",
  "HELP",
  "NULL",
  "OFFICIAL",
  "OWNER",
  "PAYMENT",
  "SECURITY",
  "STAFF",
  "SUPPORT",
  "UNDEFINED",
]);

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (url.pathname === "/api/partner/application") {
      return handleCustomerPartnerApplicationRequest(request, env);
    }

    if (url.pathname === "/api/partner/code-availability") {
      return handlePartnerCodeAvailabilityRequest(request, env, url);
    }

    if (url.pathname === "/api/partner/apply") {
      return handlePartnerApplicationSubmission(request, env);
    }

    if (url.pathname === "/api/referral/validate") {
      return handleReferralValidationRequest(request, env, url);
    }

    if (url.pathname === "/api/partner/summary") {
      return handlePartnerSummaryRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-applications") {
      return handleAdminPartnerApplicationsRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-applications/action") {
      return handleAdminPartnerActionRequest(request, env);
    }

    if (
      url.pathname ===
      "/api/admin/partner-applications/commission-rate"
    ) {
      return handleAdminCommissionRateRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-referrals") {
      return handleAdminPartnerReferralsRequest(request, env);
    }

    if (url.pathname === "/api/admin/accounts") {
      return handleAdminAccountDirectoryRequest(request, env);
    }

    if (url.pathname === "/api/admin/accounts/control") {
      return handleAdminAccountControlRequest(request, env);
    }

    if (url.pathname === "/api/admin/accounts/reset-password") {
      return handleAdminPasswordResetRequest(request, env);
    }

    if (url.pathname === "/api/auth/change-password") {
      return handleChangePasswordRequest(request, env);
    }

    if (
      request.method === "POST" &&
      ["/api/auth/register", "/api/auth/login"].includes(
        url.pathname
      )
    ) {
      const response = await coreWorker.fetch(
        request,
        env,
        context
      );

      return upgradeAuthenticationResponse(response, env);
    }

    if (url.pathname === "/api/auth/session") {
      const sessionState = await inspectCustomerSession(
        request,
        env
      );

      if (!sessionState.session) {
        return jsonResponse(
          {
            success: true,
            authenticated: false,
            account: null,
          },
          200,
          sessionState.hasToken
            ? {
                "Set-Cookie":
                  buildClearedSessionCookie(),
              }
            : {}
        );
      }

      return jsonResponse({
        success: true,
        authenticated: true,

        account: toPublicAccount(
          sessionState.session.account
        ),

        requiresPasswordChange: Boolean(
          sessionState.session.account
            .mustChangePassword
        ),
      });
    }

    if (url.pathname === "/api/account/orders") {
      const sessionState = await inspectCustomerSession(
        request,
        env
      );

      if (!sessionState.session) {
        return jsonResponse(
          {
            success: false,

            error:
              "Customer authentication is required.",
          },
          401,
          {
            "Set-Cookie":
              buildClearedSessionCookie(),
          }
        );
      }

      if (
        sessionState.session.account
          .mustChangePassword
      ) {
        return jsonResponse(
          {
            success: false,

            error:
              "Change your temporary password before accessing account orders.",

            requiresPasswordChange: true,
          },
          403
        );
      }
    }

    if (
      url.pathname === "/api/order" &&
      request.method === "POST"
    ) {
      return handleOrderWithReferral(
        request,
        env,
        context
      );
    }

    if (
      url.pathname.startsWith(
        "/api/admin/orders/"
      ) &&
      ["PATCH", "DELETE"].includes(
        request.method
      )
    ) {
      return handleAdminOrderMutationWithReferralSync(
        request,
        env,
        context,
        url
      );
    }

    return coreWorker.fetch(request, env, context);
  },
};

async function handleCustomerPartnerApplicationRequest(
  request,
  env
) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);

    const sessionState =
      await requireEligibleCustomerSession(
        request,
        env
      );

    const application =
      await getRegistryApplication(
        env,
        sessionState.session.account.id
      );

    const hasOrder =
      await customerHasStoredOrder(
        env,
        sessionState.session.account.id
      );

    return jsonResponse({
      success: true,

      application:
        toCustomerPartnerApplication(
          application
        ),

      eligibility: {
        eligible: hasOrder,
        hasOrder,

        requirement: hasOrder
          ? "Eligible to apply."
          : "Submit at least one order request before applying to the Partner Program.",
      },

      codeRules:
        getPartnerCodeRules(),
    });
  } catch (error) {
    console.error(
      "Customer partner application request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handlePartnerCodeAvailabilityRequest(
  request,
  env,
  url
) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);

    const sessionState =
      await requireEligibleCustomerSession(
        request,
        env
      );

    const code = validatePartnerCode(
      url.searchParams.get("code")
    );

    const registryResponse =
      await partnerRegistryFetch(
        env,

        `/availability?code=${encodeURIComponent(
          code
        )}&accountId=${encodeURIComponent(
          sessionState.session.account.id
        )}`,

        {
          method: "GET",
        }
      );

    const result =
      await readInternalJsonResponse(
        registryResponse
      );

    return jsonResponse({
      success: true,
      code,

      available: Boolean(
        result.available
      ),

      ownedByAccount: Boolean(
        result.ownedByAccount
      ),

      message: result.available
        ? result.ownedByAccount
          ? "This code is already reserved for your account."
          : "This partner code is available."
        : "That partner code has already been claimed.",
    });
  } catch (error) {
    console.error(
      "Partner code availability request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handlePartnerApplicationSubmission(
  request,
  env
) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);
    validateJsonContentType(request);

    await enforceAuthenticationRateLimit(
      request,
      env,
      "partner-apply"
    );

    const sessionState =
      await requireEligibleCustomerSession(
        request,
        env
      );

    const account =
      sessionState.session.account;

    const hasOrder =
      await customerHasStoredOrder(
        env,
        account.id
      );

    if (!hasOrder) {
      throw new ApiRequestError(
        "Submit at least one order request before applying to the Partner Program.",
        403
      );
    }

    const body =
      await readJsonRequest(
        request,
        MAX_AUTH_REQUEST_LENGTH
      );

    if (
      body.agreementAccepted !==
      true
    ) {
      throw new ApiRequestError(
        "Accept the Partner Program agreement before submitting the application.",
        400
      );
    }

    const code =
      validatePartnerCode(
        body.code
      );

    const primaryPlatform =
      cleanText(
        body.primaryPlatform,
        MAX_PARTNER_PLATFORM_LENGTH
      );

    const profileUrl =
      validateOptionalHttpUrl(
        body.profileUrl,
        MAX_PARTNER_PROFILE_URL_LENGTH
      );

    const audienceSize =
      cleanText(
        body.audienceSize,
        MAX_PARTNER_AUDIENCE_LENGTH
      );

    const promotionPlan =
      cleanMultilineText(
        body.promotionPlan,
        MAX_PARTNER_PROMOTION_PLAN_LENGTH
      );

    const experience =
      cleanMultilineText(
        body.experience,
        MAX_PARTNER_EXPERIENCE_LENGTH
      );

    if (
      !primaryPlatform ||
      !audienceSize ||
      !promotionPlan
    ) {
      throw new ApiRequestError(
        "Complete the platform, audience, and promotion-plan fields.",
        400
      );
    }

    const submittedPayload = {
      accountId: account.id,
      email: account.email,

      firstName:
        account.firstName || "",

      lastName:
        account.lastName || "",

      code,
      primaryPlatform,
      profileUrl,
      audienceSize,
      promotionPlan,
      experience,

      agreementAcceptedAt:
        new Date().toISOString(),

      agreementVersion:
        PARTNER_AGREEMENT_VERSION,
    };

    const registryResponse =
      await partnerRegistryFetch(
        env,
        "/apply",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            submittedPayload
          ),
        }
      );

    const result =
      await readInternalJsonResponse(
        registryResponse
      );

    return jsonResponse(
      {
        success: true,

        application:
          toCustomerPartnerApplication(
            result.application
          ),

        message:
          result.message ||
          "Your partner application was submitted for review.",
      },
      201
    );
  } catch (error) {
    console.error(
      "Partner application submission error:",
      error
    );

    return handleApiError(error);
  }
}

async function handleAdminPartnerApplicationsRequest(
  request,
  env
) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);

    await requireAdminAuthorization(
      request,
      env
    );

    const registryResponse =
      await partnerRegistryFetch(
        env,
        "/admin/list",
        {
          method: "GET",
        }
      );

    const result =
      await readInternalJsonResponse(
        registryResponse
      );

    const applications =
      Array.isArray(
        result.applications
      )
        ? result.applications.map(
            toAdminPartnerApplication
          )
        : [];

    return jsonResponse({
      success: true,
      applications,
      records: applications,

      count:
        applications.length,
    });
  } catch (error) {
    console.error(
      "Admin partner applications request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handleAdminPartnerActionRequest(
  request,
  env
) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);
    validateJsonContentType(request);

    await requireAdminAuthorization(
      request,
      env
    );

    await enforceAuthenticationRateLimit(
      request,
      env,
      "partner-admin-action"
    );

    const body =
      await readJsonRequest(
        request,
        MAX_AUTH_REQUEST_LENGTH
      );

    const action =
      cleanText(
        body.action,
        30
      ).toLowerCase();

    const accountId =
      cleanText(
        body.accountId,
        150
      );

    const customerMessage =
      cleanMultilineText(
        body.customerMessage,
        MAX_PARTNER_CUSTOMER_MESSAGE_LENGTH
      );

    const adminNotes =
      cleanMultilineText(
        body.adminNotes,
        MAX_PARTNER_ADMIN_NOTES_LENGTH
      );

    if (!accountId) {
      throw new ApiRequestError(
        "A customer account ID is required.",
        400
      );
    }

    if (
      ![
        "approve",
        "deny",
        "suspend",
        "reactivate",
      ].includes(action)
    ) {
      throw new ApiRequestError(
        "Choose a valid partner action.",
        400
      );
    }

    if (
      ["deny", "suspend"].includes(
        action
      ) &&
      !customerMessage
    ) {
      throw new ApiRequestError(
        action === "deny"
          ? "Enter a customer-facing reason before denying the application."
          : "Enter a customer-facing reason before suspending the partner.",
        400
      );
    }

    const reviewedBy =
      cleanText(
        request.headers.get(
          "Cf-Access-Authenticated-User-Email"
        ) ||
          request.headers.get(
            "CF-Access-Authenticated-User-Email"
          ) ||
          "authorized administrator",
        254
      );

    const registryResponse =
      await partnerRegistryFetch(
        env,
        "/admin/action",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            action,
            accountId,
            customerMessage,
            adminNotes,
            reviewedBy,
          }),
        }
      );

    const result =
      await readInternalJsonResponse(
        registryResponse
      );

    return jsonResponse({
      success: true,
      action,

      application:
        toAdminPartnerApplication(
          result.application
        ),

      message:
        result.message ||
        "The partner application was updated.",
    });
  } catch (error) {
    console.error(
      "Admin partner action request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handleReferralValidationRequest(
  request,
  env,
  url
) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);

    const sessionState =
      await requireEligibleCustomerSession(
        request,
        env
      );

    const code =
      validatePartnerCode(
        url.searchParams.get("code")
      );

    const registryResponse =
      await partnerRegistryFetch(
        env,

        `/referral/validate?code=${encodeURIComponent(
          code
        )}&customerAccountId=${encodeURIComponent(
          sessionState.session.account.id
        )}`,

        {
          method: "GET",
        }
      );

    const result =
      await readInternalJsonResponse(
        registryResponse
      );

    return jsonResponse({
      success: true,

      valid: Boolean(
        result.valid
      ),

      code:
        result.code || code,

      reason:
        cleanText(
          result.reason,
          50
        ),

      message:
        result.message ||
        (
          result.valid
            ? "Referral code applied. The order subtotal is unchanged."
            : "That referral code is not active."
        ),

      discountAmount: 0,
      changesOrderTotal: false,
    });
  } catch (error) {
    console.error(
      "Referral validation request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handlePartnerSummaryRequest(
  request,
  env
) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);

    const sessionState =
      await requireEligibleCustomerSession(
        request,
        env
      );

    const registryResponse =
      await partnerRegistryFetch(
        env,

        `/partner/summary?accountId=${encodeURIComponent(
          sessionState.session.account.id
        )}`,

        {
          method: "GET",
        }
      );

    const result =
      await readInternalJsonResponse(
        registryResponse
      );

    return jsonResponse({
      success: true,

      application:
        toCustomerPartnerApplication(
          result.application
        ),

      summary:
        toCustomerReferralSummary(
          result.summary
        ),

      referrals:
        Array.isArray(
          result.referrals
        )
          ? result.referrals.map(
              toCustomerReferralRecord
            )
          : [],
    });
  } catch (error) {
    console.error(
      "Partner summary request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handleAdminCommissionRateRequest(
  request,
  env
) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);
    validateJsonContentType(request);

    await requireAdminAuthorization(
      request,
      env
    );

    await enforceAuthenticationRateLimit(
      request,
      env,
      "partner-commission-rate"
    );

    const body =
      await readJsonRequest(
        request,
        MAX_AUTH_REQUEST_LENGTH
      );

    const accountId =
      cleanText(
        body.accountId,
        150
      );

    if (!accountId) {
      throw new ApiRequestError(
        "A partner account ID is required.",
        400
      );
    }

    const commissionRateBps =
      normalizeCommissionRateBps(
        body
      );

    const registryResponse =
      await partnerRegistryFetch(
        env,
        "/admin/commission-rate",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            accountId,
            commissionRateBps,
          }),
        }
      );

    const result =
      await readInternalJsonResponse(
        registryResponse
      );

    return jsonResponse({
      success: true,

      application:
        toAdminPartnerApplication(
          result.application
        ),

      message:
        result.message ||
        "The partner commission rate was updated for future referrals.",
    });
  } catch (error) {
    console.error(
      "Admin commission-rate request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handleAdminPartnerReferralsRequest(
  request,
  env
) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);

    await requireAdminAuthorization(
      request,
      env
    );

    const registryResponse =
      await partnerRegistryFetch(
        env,
        "/admin/referrals",
        {
          method: "GET",
        }
      );

    const result =
      await readInternalJsonResponse(
        registryResponse
      );

    const referrals =
      Array.isArray(
        result.referrals
      )
        ? result.referrals.map(
            toAdminReferralRecord
          )
        : [];

    return jsonResponse({
      success: true,
      referrals,
      records: referrals,

      count:
        referrals.length,
    });
  } catch (error) {
    console.error(
      "Admin partner referrals request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handleOrderWithReferral(
  request,
  env,
  context
) {
  try {
    validateEnvironment(env);

    const sessionState =
      await inspectCustomerSession(
        request,
        env
      );

    if (
      sessionState.hasToken &&
      !sessionState.session
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            "Your secure session has expired. Log in again before submitting the order.",
        },
        401,
        {
          "Set-Cookie":
            buildClearedSessionCookie(),
        }
      );
    }

    if (
      sessionState.session &&
      sessionState.session.account
        .mustChangePassword
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            "Change your temporary password before submitting an order.",

          requiresPasswordChange: true,
        },
        403
      );
    }

    const submittedReferralCode =
      await extractReferralCodeFromOrderRequest(
        request
      );

    let validatedReferral = null;

    if (submittedReferralCode) {
      validatePartnerEnvironment(env);

      if (!sessionState.session) {
        throw new ApiRequestError(
          "Log in before applying a referral code to an order.",
          401
        );
      }

      const code =
        validatePartnerCode(
          submittedReferralCode
        );

      const registryResponse =
        await partnerRegistryFetch(
          env,

          `/referral/validate?code=${encodeURIComponent(
            code
          )}&customerAccountId=${encodeURIComponent(
            sessionState.session.account.id
          )}`,

          {
            method: "GET",
          }
        );

      const result =
        await readInternalJsonResponse(
          registryResponse
        );

      if (!result.valid) {
        throw new ApiRequestError(
          result.message ||
            "That referral code is not active.",

          result.reason ===
          "self_referral"
            ? 409
            : 400
        );
      }

      validatedReferral = {
        code:
          cleanText(
            result.code || code,
            MAX_REFERRAL_CODE_LENGTH
          ),
      };
    }

    const response =
      await coreWorker.fetch(
        request,
        env,
        context
      );

    if (
      !response.ok ||
      !validatedReferral
    ) {
      return response;
    }

    let result;

    try {
      result =
        await response
          .clone()
          .json();
    } catch {
      return response;
    }

    if (!result?.success) {
      return response;
    }

    const orderId =
      cleanText(
        result.orderId ||
          result.order?.orderId ||
          result.order?.id,
        100
      ).toUpperCase();

    if (!orderId) {
      return appendJsonResponseFields(
        response,
        result,
        {
          referralTracking: {
            success: false,

            code:
              validatedReferral.code,

            message:
              "The order was accepted, but the referral record could not be attached because the order number was unavailable.",
          },
        }
      );
    }

    let storedOrder =
      result.order &&
      typeof result.order ===
        "object"
        ? result.order
        : await env.DOCUMENTS_KV.get(
            `${ORDER_KEY_PREFIX}${orderId}`,
            "json"
          );

    if (
      !storedOrder ||
      typeof storedOrder !==
        "object"
    ) {
      return appendJsonResponseFields(
        response,
        result,
        {
          referralTracking: {
            success: false,

            code:
              validatedReferral.code,

            message:
              "The order was accepted, but its referral record could not be completed.",
          },
        }
      );
    }

    try {
      const referralResponse =
        await partnerRegistryFetch(
          env,
          "/referral/record",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              orderId,

              code:
                validatedReferral.code,

              customerAccountId:
                sessionState.session.account
                  .id,

              customerEmail:
                storedOrder.customer
                  ?.email ||
                sessionState.session.account
                  .email ||
                "",

              orderSubtotal:
                Number(
                  storedOrder.subtotal ||
                    0
                ),

              orderStatus:
                storedOrder.status ||
                "Order Request Received",
            }),
          }
        );

      const referralResult =
        await readInternalJsonResponse(
          referralResponse
        );

      const referral =
        toCustomerReferralRecord(
          referralResult.referral
        );

      storedOrder =
        await attachReferralToStoredOrder(
          env,
          storedOrder,
          referral
        );

      return appendJsonResponseFields(
        response,
        result,
        {
          order:
            storedOrder,

          referralTracking: {
            success: true,

            code:
              referral.partnerCode,

            status:
              referral.referralStatus,

            message:
              "Referral code recorded. The order subtotal was not changed.",

            changesOrderTotal: false,
            discountAmount: 0,
          },
        }
      );
    } catch (referralError) {
      console.error(
        "The order succeeded, but referral tracking failed:",
        referralError
      );

      return appendJsonResponseFields(
        response,
        result,
        {
          referralTracking: {
            success: false,

            code:
              validatedReferral.code,

            message:
              "The order was accepted, but referral tracking needs administrator review.",
          },
        }
      );
    }
  } catch (error) {
    console.error(
      "Referral-aware order request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handleAdminOrderMutationWithReferralSync(
  request,
  env,
  context,
  url
) {
  const response =
    await coreWorker.fetch(
      request,
      env,
      context
    );

  if (!response.ok) {
    return response;
  }

  let result;

  try {
    result =
      await response
        .clone()
        .json();
  } catch {
    return response;
  }

  if (!result?.success) {
    return response;
  }

  const encodedOrderId =
    url.pathname.slice(
      "/api/admin/orders/".length
    );

  let orderId = "";

  try {
    orderId =
      decodeURIComponent(
        encodedOrderId
      )
        .trim()
        .toUpperCase();
  } catch {
    orderId =
      encodedOrderId
        .trim()
        .toUpperCase();
  }

  if (!orderId) {
    return response;
  }

  const orderStatus =
    request.method === "DELETE"
      ? "Cancelled"
      : result.order?.status ||
        result.record?.status ||
        "";

  if (
    !orderStatus ||
    !env.PARTNER_REGISTRY
  ) {
    return response;
  }

  try {
    const registryResponse =
      await partnerRegistryFetch(
        env,
        "/referral/order-status",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            orderId,
            orderStatus,
          }),
        }
      );

    const registryResult =
      await readInternalJsonResponse(
        registryResponse
      );

    return appendJsonResponseFields(
      response,
      result,
      {
        referralSync: {
          success: true,

          referral:
            registryResult.referral
              ? toAdminReferralRecord(
                  registryResult.referral
                )
              : null,

          message:
            registryResult.message ||
            "Referral status synchronized.",
        },
      }
    );
  } catch (error) {
    console.error(
      "Referral order-status synchronization failed:",
      error
    );

    return appendJsonResponseFields(
      response,
      result,
      {
        referralSync: {
          success: false,

          message:
            "The order was updated, but referral status synchronization needs review.",
        },
      }
    );
  }
}

async function extractReferralCodeFromOrderRequest(
  request
) {
  const contentType =
    request.headers.get(
      "Content-Type"
    ) || "";

  if (
    !contentType
      .toLowerCase()
      .includes(
        "application/json"
      )
  ) {
    return "";
  }

  try {
    const payload =
      await request
        .clone()
        .json();

    const submittedOrder =
      payload?.order ||
      payload;

    return cleanText(
      submittedOrder?.referralCode ||
        payload?.referralCode,
      MAX_REFERRAL_CODE_LENGTH
    ).toUpperCase();
  } catch {
    return "";
  }
}

async function attachReferralToStoredOrder(
  env,
  order,
  referral
) {
  const orderId =
    cleanText(
      order.orderId ||
        order.id,
      100
    ).toUpperCase();

  if (!orderId) {
    return order;
  }

  const now =
    new Date().toISOString();

  const updatedOrder = {
    ...order,
    id: orderId,
    orderId,

    referralCode:
      referral.partnerCode,

    referralStatus:
      referral.referralStatus,

    referralCommissionRateBps:
      referral.commissionRateBps,

    referralCommissionAmountCents:
      referral.commissionAmountCents,

    referralAttachedAt:
      referral.createdAt ||
      now,

    updatedAt:
      order.updatedAt ||
      now,
  };

  await env.DOCUMENTS_KV.put(
    `${ORDER_KEY_PREFIX}${orderId}`,

    JSON.stringify(
      updatedOrder
    ),

    {
      metadata: {
        orderId,

        status:
          cleanText(
            updatedOrder.status,
            100
          ),

        email:
          cleanText(
            updatedOrder.customer
              ?.email,
            MAX_REFERRAL_CUSTOMER_EMAIL_LENGTH
          ).toLowerCase(),

        createdAt:
          updatedOrder.createdAt ||
          "",

        updatedAt:
          updatedOrder.updatedAt ||
          "",

        referralCode:
          referral.partnerCode,

        referralStatus:
          referral.referralStatus,
      },
    }
  );

  return updatedOrder;
}

function appendJsonResponseFields(
  response,
  existingBody,
  additionalFields
) {
  const headers =
    new Headers(
      response.headers
    );

  headers.set(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  headers.set(
    "Cache-Control",
    "no-store"
  );

  headers.delete(
    "Content-Length"
  );

  return new Response(
    JSON.stringify({
      ...existingBody,
      ...additionalFields,
    }),
    {
      status:
        response.status,

      statusText:
        response.statusText,

      headers,
    }
  );
}

function normalizeCommissionRateBps(
  body
) {
  let rate;

  if (
    body.commissionRateBps !==
    undefined
  ) {
    rate =
      Number(
        body.commissionRateBps
      );
  } else {
    rate =
      Number(
        body.commissionRatePercent
      ) * 100;
  }

  if (
    !Number.isInteger(
      rate
    ) ||
    rate < 0 ||
    rate >
      MAX_COMMISSION_RATE_BPS
  ) {
    throw new ApiRequestError(
      "Commission rate must be between 0% and 50%, using no more than two decimal places.",
      400
    );
  }

  return rate;
}

function toCustomerReferralSummary(
  summary
) {
  const source =
    summary &&
    typeof summary ===
      "object"
      ? summary
      : {};

  return {
    totalCount:
      Number(
        source.totalCount ||
          0
      ),

    pendingCount:
      Number(
        source.pendingCount ||
          0
      ),

    earnedCount:
      Number(
        source.earnedCount ||
          0
      ),

    voidedCount:
      Number(
        source.voidedCount ||
          0
      ),

    pendingCommissionCents:
      Number(
        source.pendingCommissionCents ||
          0
      ),

    earnedCommissionCents:
      Number(
        source.earnedCommissionCents ||
          0
      ),

    voidedCommissionCents:
      Number(
        source.voidedCommissionCents ||
          0
      ),

    earnedRevenueCents:
      Number(
        source.earnedRevenueCents ||
          0
      ),
  };
}

function toCustomerReferralRecord(
  referral
) {
  if (
    !referral ||
    typeof referral !==
      "object"
  ) {
    return null;
  }

  return {
    orderId:
      cleanText(
        referral.orderId,
        100
      ),

    partnerCode:
      cleanText(
        referral.partnerCode,
        MAX_REFERRAL_CODE_LENGTH
      ),

    orderSubtotalCents:
      Number(
        referral.orderSubtotalCents ||
          0
      ),

    commissionRateBps:
      Number(
        referral.commissionRateBps ||
          0
      ),

    commissionAmountCents:
      Number(
        referral.commissionAmountCents ||
          0
      ),

    referralStatus:
      cleanText(
        referral.referralStatus ||
          "pending",
        30
      ),

    orderStatus:
      cleanText(
        referral.orderStatus ||
          "Order Request Received",
        100
      ),

    createdAt:
      referral.createdAt ||
      "",

    updatedAt:
      referral.updatedAt ||
      "",

    earnedAt:
      referral.earnedAt ||
      "",

    voidedAt:
      referral.voidedAt ||
      "",
  };
}

function toAdminReferralRecord(
  referral
) {
  if (
    !referral ||
    typeof referral !==
      "object"
  ) {
    return null;
  }

  return {
    ...toCustomerReferralRecord(
      referral
    ),

    partnerAccountId:
      cleanText(
        referral.partnerAccountId,
        150
      ),

    customerAccountId:
      cleanText(
        referral.customerAccountId,
        150
      ),

    customerEmail:
      cleanText(
        referral.customerEmail,
        MAX_REFERRAL_CUSTOMER_EMAIL_LENGTH
      ).toLowerCase(),

    partnerEmail:
      cleanText(
        referral.partnerEmail,
        MAX_REFERRAL_CUSTOMER_EMAIL_LENGTH
      ).toLowerCase(),

    partnerFirstName:
      cleanText(
        referral.partnerFirstName,
        100
      ),

    partnerLastName:
      cleanText(
        referral.partnerLastName,
        100
      ),
  };
}

async function requireEligibleCustomerSession(
  request,
  env
) {
  const sessionState =
    await inspectCustomerSession(
      request,
      env
    );

  if (!sessionState.session) {
    throw new ApiRequestError(
      "Customer authentication is required.",
      401
    );
  }

  if (
    sessionState.session.account
      .mustChangePassword
  ) {
    throw new ApiRequestError(
      "Change your temporary password before accessing Partner Program tools.",
      403
    );
  }

  return sessionState;
}

async function getRegistryApplication(
  env,
  accountId
) {
  const registryResponse =
    await partnerRegistryFetch(
      env,

      `/application?accountId=${encodeURIComponent(
        accountId
      )}`,

      {
        method: "GET",
      }
    );

  const result =
    await readInternalJsonResponse(
      registryResponse
    );

  return (
    result.application ||
    null
  );
}

async function partnerRegistryFetch(
  env,
  pathname,
  init
) {
  const id =
    env.PARTNER_REGISTRY.idFromName(
      PARTNER_REGISTRY_NAME
    );

  const stub =
    env.PARTNER_REGISTRY.get(
      id
    );

  return stub.fetch(
    new Request(
      `https://partner-registry.internal${pathname}`,
      init
    )
  );
}

async function readInternalJsonResponse(
  response
) {
  let result;

  try {
    result =
      await response.json();
  } catch {
    throw new ApiRequestError(
      "The partner registry returned an invalid response.",
      503
    );
  }

  if (
    !response.ok ||
    !result?.success
  ) {
    throw new ApiRequestError(
      result?.error ||
        "The partner registry request could not be completed.",

      response.status >= 400
        ? response.status
        : 503
    );
  }

  return result;
}

async function customerHasStoredOrder(
  env,
  accountId
) {
  let cursor = "";
  let listComplete = false;

  while (!listComplete) {
    const options = {
      prefix:
        ORDER_KEY_PREFIX,

      limit: 1000,
    };

    if (cursor) {
      options.cursor =
        cursor;
    }

    const page =
      await env.DOCUMENTS_KV.list(
        options
      );

    const keys =
      Array.isArray(
        page.keys
      )
        ? page.keys.map(
            (key) =>
              key.name
          )
        : [];

    for (
      let index = 0;
      index < keys.length;
      index += 100
    ) {
      const batch =
        keys.slice(
          index,
          index + 100
        );

      const records =
        await env.DOCUMENTS_KV.get(
          batch,
          {
            type: "json",
          }
        );

      for (
        const key of batch
      ) {
        const order =
          records.get(
            key
          );

        if (
          cleanText(
            order?.customerAccountId,
            150
          ) ===
          accountId
        ) {
          return true;
        }
      }
    }

    listComplete =
      page.list_complete ===
      true;

    cursor =
      page.cursor || "";

    if (
      !listComplete &&
      !cursor
    ) {
      throw new ApiRequestError(
        "Partner eligibility could not be verified.",
        503
      );
    }
  }

  return false;
}

function validatePartnerCode(
  value
) {
  const code =
    cleanText(
      value,
      MAX_PARTNER_CODE_LENGTH
    ).toUpperCase();

  if (
    code.length <
      MIN_PARTNER_CODE_LENGTH ||
    code.length >
      MAX_PARTNER_CODE_LENGTH
  ) {
    throw new ApiRequestError(
      `Partner codes must contain ${MIN_PARTNER_CODE_LENGTH}–${MAX_PARTNER_CODE_LENGTH} characters.`,
      400
    );
  }

  if (
    !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(
      code
    )
  ) {
    throw new ApiRequestError(
      "Partner codes may contain uppercase letters, numbers, and single hyphens only.",
      400
    );
  }

  if (
    !/[A-Z]/.test(
      code
    )
  ) {
    throw new ApiRequestError(
      "Partner codes must contain at least one letter.",
      400
    );
  }

  if (
    RESERVED_PARTNER_CODES.has(
      code
    ) ||
    /^(ADMIN|SUPPORT|STAFF|OFFICIAL)(-|$)/.test(
      code
    ) ||
    code.includes(
      "304PEPTIDES"
    )
  ) {
    throw new ApiRequestError(
      "That partner code is reserved. Choose a different code.",
      400
    );
  }

  return code;
}

function validateOptionalHttpUrl(
  value,
  maximumLength
) {
  const cleaned =
    cleanText(
      value,
      maximumLength
    );

  if (!cleaned) {
    return "";
  }

  let parsed;

  try {
    parsed =
      new URL(
        cleaned
      );
  } catch {
    throw new ApiRequestError(
      "Enter a complete profile URL beginning with http:// or https://.",
      400
    );
  }

  if (
    ![
      "http:",
      "https:",
    ].includes(
      parsed.protocol
    )
  ) {
    throw new ApiRequestError(
      "The profile URL must use http:// or https://.",
      400
    );
  }

  return parsed
    .toString()
    .slice(
      0,
      maximumLength
    );
}

function getPartnerCodeRules() {
  return {
    minimumLength:
      MIN_PARTNER_CODE_LENGTH,

    maximumLength:
      MAX_PARTNER_CODE_LENGTH,

    allowedCharacters:
      "Uppercase letters, numbers, and single hyphens",

    customerSelected: true,
    unique: true,
    caseInsensitive: true,
  };
}

function toCustomerPartnerApplication(
  application
) {
  if (
    !application ||
    typeof application !==
      "object"
  ) {
    return null;
  }

  return {
    accountId:
      cleanText(
        application.accountId,
        150
      ),

    code:
      cleanText(
        application.code,
        MAX_PARTNER_CODE_LENGTH
      ),

    status:
      cleanText(
        application.status ||
          "pending",
        30
      ),

    primaryPlatform:
      cleanText(
        application.primaryPlatform,
        MAX_PARTNER_PLATFORM_LENGTH
      ),

    profileUrl:
      cleanText(
        application.profileUrl,
        MAX_PARTNER_PROFILE_URL_LENGTH
      ),

    audienceSize:
      cleanText(
        application.audienceSize,
        MAX_PARTNER_AUDIENCE_LENGTH
      ),

    promotionPlan:
      cleanMultilineText(
        application.promotionPlan,
        MAX_PARTNER_PROMOTION_PLAN_LENGTH
      ),

    experience:
      cleanMultilineText(
        application.experience,
        MAX_PARTNER_EXPERIENCE_LENGTH
      ),

    submittedAt:
      application.submittedAt ||
      "",

    updatedAt:
      application.updatedAt ||
      "",

    reviewedAt:
      application.reviewedAt ||
      "",

    customerMessage:
      cleanMultilineText(
        application.customerMessage,
        MAX_PARTNER_CUSTOMER_MESSAGE_LENGTH
      ),

    deniedAt:
      application.deniedAt ||
      "",

    suspendedAt:
      application.suspendedAt ||
      "",

    reactivatedAt:
      application.reactivatedAt ||
      "",

    applicationNumber:
      Number(
        application.applicationNumber ||
          1
      ),

    agreementVersion:
      cleanText(
        application.agreementVersion,
        50
      ),

    commissionRateBps:
      Number(
        application.commissionRateBps ||
          0
      ),
  };
}

function toAdminPartnerApplication(
  application
) {
  if (
    !application ||
    typeof application !==
      "object"
  ) {
    return null;
  }

  return {
    ...toCustomerPartnerApplication(
      application
    ),

    email:
      cleanText(
        application.email,
        254
      ).toLowerCase(),

    firstName:
      cleanText(
        application.firstName,
        100
      ),

    lastName:
      cleanText(
        application.lastName,
        100
      ),

    agreementAcceptedAt:
      application.agreementAcceptedAt ||
      "",

    agreementVersion:
      cleanText(
        application.agreementVersion,
        50
      ),

    commissionRateBps:
      Number(
        application.commissionRateBps ||
          0
      ),

    reviewedBy:
      cleanText(
        application.reviewedBy,
        254
      ),

    adminNotes:
      cleanMultilineText(
        application.adminNotes,
        MAX_PARTNER_ADMIN_NOTES_LENGTH
      ),

    lastStatusChangeAt:
      application.lastStatusChangeAt ||
      "",
  };
}

async function handleAdminAccountDirectoryRequest(
  request,
  env
) {
  try {
    validateEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);

    await requireAdminAuthorization(
      request,
      env
    );

    const records =
      await listCustomerAccounts(
        env
      );

    return jsonResponse({
      success: true,
      records,
      accounts: records,

      count:
        records.length,
    });
  } catch (error) {
    console.error(
      "Admin account directory request error:",
      error
    );

    return handleApiError(error);
  }
}

async function listCustomerAccounts(
  env
) {
  const accountKeys = [];
  let cursor = "";
  let listComplete = false;

  while (!listComplete) {
    const options = {
      prefix:
        ACCOUNT_KEY_PREFIX,

      limit: 1000,
    };

    if (cursor) {
      options.cursor =
        cursor;
    }

    const page =
      await env.DOCUMENTS_KV.list(
        options
      );

    accountKeys.push(
      ...(
        Array.isArray(
          page.keys
        )
          ? page.keys.map(
              (key) =>
                key.name
            )
          : []
      )
    );

    listComplete =
      page.list_complete ===
      true;

    cursor =
      page.cursor || "";

    if (
      !listComplete &&
      !cursor
    ) {
      throw new ApiRequestError(
        "The customer account directory could not be fully paginated.",
        503
      );
    }
  }

  const accounts = [];

  for (
    let index = 0;
    index <
    accountKeys.length;
    index += 100
  ) {
    const batch =
      accountKeys.slice(
        index,
        index + 100
      );

    if (
      batch.length ===
      0
    ) {
      continue;
    }

    const values =
      await env.DOCUMENTS_KV.get(
        batch,
        {
          type: "json",
        }
      );

    for (
      const key of batch
    ) {
      const account =
        values.get(
          key
        );

      if (
        account &&
        typeof account ===
          "object"
      ) {
        accounts.push(
          toAdminAccountSummary(
            account
          )
        );
      }
    }
  }

  return accounts.sort(
    (
      left,
      right
    ) => {
      const leftDate =
        String(
          left.createdAt ||
            left.updatedAt ||
            ""
        );

      const rightDate =
        String(
          right.createdAt ||
            right.updatedAt ||
            ""
        );

      return rightDate.localeCompare(
        leftDate
      );
    }
  );
}

async function handleAdminAccountControlRequest(
  request,
  env
) {
  try {
    validateEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);
    validateJsonContentType(request);

    await requireAdminAuthorization(
      request,
      env
    );

    await enforceAuthenticationRateLimit(
      request,
      env,
      "admin-account-control"
    );

    const body =
      await readJsonRequest(
        request,
        MAX_AUTH_REQUEST_LENGTH
      );

    const email =
      normalizeAccountEmail(
        body.email
      );

    const action =
      cleanText(
        body.action,
        40
      ).toLowerCase();

    const reason =
      cleanText(
        body.reason,
        MAX_ACCOUNT_CONTROL_REASON_LENGTH
      );

    if (
      ![
        "suspend",
        "reactivate",
        "revoke-sessions",
      ].includes(action)
    ) {
      throw new ApiRequestError(
        "Choose a valid account action.",
        400
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
      typeof account !==
        "object"
    ) {
      throw new ApiRequestError(
        "No customer account was found for that email address.",
        404
      );
    }

    const now =
      new Date().toISOString();

    let updatedAccount;
    let message;

    if (
      action ===
      "suspend"
    ) {
      if (!reason) {
        throw new ApiRequestError(
          "Enter a private reason before suspending the account.",
          400
        );
      }

      updatedAccount = {
        ...account,

        status:
          "suspended",

        suspensionReason:
          reason,

        suspendedAt:
          account.status ===
            "suspended" &&
          account.suspendedAt
            ? account.suspendedAt
            : now,

        accountStatusChangedAt:
          now,

        sessionVersion:
          getAccountSessionVersion(
            account
          ) + 1,

        lastSessionRevokedAt:
          now,

        lastSessionRevocationReason:
          "Account suspended by administrator.",

        updatedAt:
          now,
      };

      message =
        account.status ===
        "suspended"
          ? "The suspension reason was updated and all customer sessions were revoked."
          : "The account was suspended and all customer sessions were revoked.";
    } else if (
      action ===
      "reactivate"
    ) {
      if (
        account.status !==
        "suspended"
      ) {
        throw new ApiRequestError(
          "Only a suspended account can be reactivated.",
          409
        );
      }

      updatedAccount = {
        ...account,

        status:
          "active",

        lastSuspensionReason:
          account.suspensionReason ||
          account.lastSuspensionReason ||
          "",

        lastSuspendedAt:
          account.suspendedAt ||
          account.lastSuspendedAt ||
          "",

        suspensionReason:
          "",

        suspendedAt:
          "",

        reactivatedAt:
          now,

        accountStatusChangedAt:
          now,

        sessionVersion:
          getAccountSessionVersion(
            account
          ) + 1,

        lastSessionRevokedAt:
          now,

        lastSessionRevocationReason:
          "Account reactivated by administrator.",

        updatedAt:
          now,
      };

      message =
        "The account was reactivated. Previous sessions remain invalid, so the customer must log in again.";
    } else {
      updatedAccount = {
        ...account,

        sessionVersion:
          getAccountSessionVersion(
            account
          ) + 1,

        lastSessionRevokedAt:
          now,

        lastSessionRevocationReason:
          reason ||
          "Sessions revoked by administrator.",

        updatedAt:
          now,
      };

      message =
        "All existing customer sessions were revoked. The account password was not changed.";
    }

    await putAccountRecord(
      env,
      accountKey,
      updatedAccount
    );

    return jsonResponse({
      success: true,
      action,

      account:
        toAdminAccountSummary(
          updatedAccount
        ),

      message,
    });
  } catch (error) {
    console.error(
      "Admin account control request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handleAdminPasswordResetRequest(
  request,
  env
) {
  try {
    validateEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);
    validateJsonContentType(request);

    await requireAdminAuthorization(
      request,
      env
    );

    await enforceAuthenticationRateLimit(
      request,
      env,
      "admin-password-reset"
    );

    const body =
      await readJsonRequest(
        request,
        MAX_AUTH_REQUEST_LENGTH
      );

    const email =
      normalizeAccountEmail(
        body.email
      );

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
      throw new ApiRequestError(
        "No active customer account was found for that email address.",
        404
      );
    }

    const temporaryPassword =
      createTemporaryPassword(
        20
      );

    const salt =
      randomBytes(
        16
      );

    const passwordHash =
      await derivePasswordHash(
        temporaryPassword,
        salt
      );

    const now =
      new Date().toISOString();

    const updatedAccount = {
      ...account,

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

      mustChangePassword:
        true,

      temporaryPasswordIssuedAt:
        now,

      passwordChangedAt:
        now,

      sessionVersion:
        getAccountSessionVersion(
          account
        ) + 1,

      updatedAt:
        now,
    };

    await putAccountRecord(
      env,
      accountKey,
      updatedAccount
    );

    return jsonResponse({
      success: true,

      email:
        updatedAccount.email,

      temporaryPassword,
      issuedAt: now,
      requiresPasswordChange: true,

      account:
        toAdminAccountSummary(
          updatedAccount
        ),

      message:
        "A temporary password was created. Existing sessions were invalidated, and the customer must change the password after logging in.",
    });
  } catch (error) {
    console.error(
      "Admin password reset request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handleChangePasswordRequest(
  request,
  env
) {
  try {
    validateEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);
    validateJsonContentType(request);

    await enforceAuthenticationRateLimit(
      request,
      env,
      "change-password"
    );

    const sessionState =
      await inspectCustomerSession(
        request,
        env
      );

    if (
      !sessionState.session
    ) {
      throw new ApiRequestError(
        "Customer authentication is required.",
        401
      );
    }

    const body =
      await readJsonRequest(
        request,
        MAX_AUTH_REQUEST_LENGTH
      );

    const currentPassword =
      String(
        body.currentPassword ==
          null
          ? ""
          : body.currentPassword
      );

    const newPassword =
      validateAccountPassword(
        body.newPassword
      );

    if (
      !currentPassword ||
      currentPassword.length >
        MAX_PASSWORD_LENGTH
    ) {
      throw new ApiRequestError(
        "The current password is incorrect.",
        401
      );
    }

    const account =
      sessionState.session.account;

    const passwordMatches =
      await verifyPassword(
        currentPassword,
        account
      );

    if (!passwordMatches) {
      throw new ApiRequestError(
        "The current password is incorrect.",
        401
      );
    }

    if (
      currentPassword ===
      newPassword
    ) {
      throw new ApiRequestError(
        "The new password must be different from the current password.",
        400
      );
    }

    const salt =
      randomBytes(
        16
      );

    const passwordHash =
      await derivePasswordHash(
        newPassword,
        salt
      );

    const now =
      new Date().toISOString();

    const updatedAccount = {
      ...account,

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

      passwordChangedAt:
        now,

      passwordResetCompletedAt:
        now,

      mustChangePassword:
        false,

      temporaryPasswordIssuedAt:
        "",

      sessionVersion:
        getAccountSessionVersion(
          account
        ) + 1,

      updatedAt:
        now,
    };

    await putAccountRecord(
      env,
      sessionState.session.accountKey,
      updatedAccount
    );

    return jsonResponse(
      {
        success: true,
        authenticated: false,

        message:
          "Password changed successfully. Log in again with your new password.",
      },
      200,
      {
        "Set-Cookie":
          buildClearedSessionCookie(),
      }
    );
  } catch (error) {
    console.error(
      "Change password request error:",
      error
    );

    return handleApiError(error);
  }
}

async function upgradeAuthenticationResponse(
  response,
  env
) {
  if (!response.ok) {
    return response;
  }

  let result;

  try {
    result =
      await response
        .clone()
        .json();
  } catch {
    return response;
  }

  if (
    !result?.success ||
    !result?.authenticated ||
    !result?.account?.email ||
    !result?.account?.id
  ) {
    return response;
  }

  try {
    validateEnvironment(env);

    const accountKey =
      await getAccountKey(
        result.account.email
      );

    const storedAccount =
      await env.DOCUMENTS_KV.get(
        accountKey,
        "json"
      );

    const account =
      storedAccount ||
      result.account;

    if (
      account.status !==
      "active"
    ) {
      return jsonResponse(
        {
          success: false,
          authenticated: false,

          error:
            "This customer account is currently suspended. Contact support for assistance.",

          accountSuspended:
            true,
        },
        403,
        {
          "Set-Cookie":
            buildClearedSessionCookie(),
        }
      );
    }

    const sessionVersion =
      getAccountSessionVersion(
        account
      );

    if (
      storedAccount &&
      storedAccount.sessionVersion !==
        sessionVersion
    ) {
      await putAccountRecord(
        env,
        accountKey,
        {
          ...storedAccount,
          sessionVersion,
        }
      );
    }

    const token =
      await createCustomerSessionToken(
        {
          ...account,
          sessionVersion,
        },
        env
      );

    const headers =
      new Headers(
        response.headers
      );

    headers.set(
      "Set-Cookie",
      buildSessionCookie(
        token
      )
    );

    headers.set(
      "Cache-Control",
      "no-store"
    );

    headers.set(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    headers.delete(
      "Content-Length"
    );

    return new Response(
      JSON.stringify({
        ...result,

        account:
          toPublicAccount(
            account
          ),

        requiresPasswordChange:
          Boolean(
            account.mustChangePassword
          ),
      }),
      {
        status:
          response.status,

        statusText:
          response.statusText,

        headers,
      }
    );
  } catch (error) {
    console.error(
      "Secure session upgrade failed:",
      error
    );

    return jsonResponse(
      {
        success: false,
        authenticated: false,

        error:
          "The account was accepted, but the secure session could not be finalized. Please log in again.",
      },
      503,
      {
        "Set-Cookie":
          buildClearedSessionCookie(),
      }
    );
  }
}

async function inspectCustomerSession(
  request,
  env
) {
  try {
    validateEnvironment(env);

    const token =
      getSessionToken(
        request
      );

    if (!token) {
      return {
        hasToken: false,
        session: null,
      };
    }

    const payload =
      await verifyCustomerSessionToken(
        token,
        env
      );

    if (!payload) {
      return {
        hasToken: true,
        session: null,
      };
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
        payload.email ||
      getAccountSessionVersion(
        account
      ) !==
        getPayloadSessionVersion(
          payload
        )
    ) {
      return {
        hasToken: true,
        session: null,
      };
    }

    return {
      hasToken: true,

      session: {
        account,
        accountKey,
        payload,
      },
    };
  } catch (error) {
    console.error(
      "Customer session inspection failed:",
      error
    );

    return {
      hasToken:
        Boolean(
          getSessionToken(
            request
          )
        ),

      session: null,
    };
  }
}

function validatePartnerEnvironment(
  env
) {
  validateEnvironment(env);

  if (
    !env.PARTNER_REGISTRY
  ) {
    throw new ApiRequestError(
      "The Partner Program registry has not been configured.",
      500
    );
  }
}

function validateEnvironment(
  env
) {
  if (
    !env.DOCUMENTS_KV ||
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

async function putAccountRecord(
  env,
  accountKey,
  account
) {
  await env.DOCUMENTS_KV.put(
    accountKey,

    JSON.stringify(
      account
    ),

    {
      metadata: {
        accountId:
          account.id,

        firstName:
          account.firstName ||
          "",

        lastName:
          account.lastName ||
          "",

        email:
          account.email,

        status:
          account.status,

        mustChangePassword:
          Boolean(
            account.mustChangePassword
          ),

        temporaryPasswordIssuedAt:
          account.temporaryPasswordIssuedAt ||
          "",

        suspendedAt:
          account.suspendedAt ||
          "",

        lastSuspendedAt:
          account.lastSuspendedAt ||
          "",

        reactivatedAt:
          account.reactivatedAt ||
          "",

        lastSessionRevokedAt:
          account.lastSessionRevokedAt ||
          "",

        createdAt:
          account.createdAt ||
          "",

        updatedAt:
          account.updatedAt ||
          "",
      },
    }
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
      await env.ORDER_RATE_LIMITER.limit({
        key:
          `auth:${action}:${clientIdentifier}`,
      });
  } catch (error) {
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

async function requireAdminAuthorization(
  request,
  env
) {
  const authorization =
    request.headers.get(
      "Authorization"
    ) || "";

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  const suppliedSecret =
    match
      ? match[1].trim()
      : "";

  const expectedSecret =
    String(
      env.DOCUMENT_ADMIN_SECRET ||
        ""
    );

  if (
    !suppliedSecret ||
    !expectedSecret ||
    !(
      await constantTimeStringEqual(
        suppliedSecret,
        expectedSecret
      )
    )
  ) {
    throw new ApiRequestError(
      "Administrator authorization is required.",
      401
    );
  }
}

async function constantTimeStringEqual(
  left,
  right
) {
  const [
    leftDigest,
    rightDigest,
  ] = await Promise.all([
    crypto.subtle.digest(
      "SHA-256",

      new TextEncoder().encode(
        String(
          left
        )
      )
    ),

    crypto.subtle.digest(
      "SHA-256",

      new TextEncoder().encode(
        String(
          right
        )
      )
    ),
  ]);

  return constantTimeBytesEqual(
    new Uint8Array(
      leftDigest
    ),

    new Uint8Array(
      rightDigest
    )
  );
}

function createTemporaryPassword(
  length = 20
) {
  const uppercase =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const lowercase =
    "abcdefghijkmnopqrstuvwxyz";

  const digits =
    "23456789";

  const symbols =
    "!@#$%*+-_";

  const allCharacters =
    uppercase +
    lowercase +
    digits +
    symbols;

  const characters = [
    uppercase[
      randomIndex(
        uppercase.length
      )
    ],

    lowercase[
      randomIndex(
        lowercase.length
      )
    ],

    digits[
      randomIndex(
        digits.length
      )
    ],

    symbols[
      randomIndex(
        symbols.length
      )
    ],
  ];

  while (
    characters.length <
    Math.max(
      12,
      length
    )
  ) {
    characters.push(
      allCharacters[
        randomIndex(
          allCharacters.length
        )
      ]
    );
  }

  for (
    let index =
      characters.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex =
      randomIndex(
        index + 1
      );

    [
      characters[
        index
      ],

      characters[
        swapIndex
      ],
    ] = [
      characters[
        swapIndex
      ],

      characters[
        index
      ],
    ];
  }

  return characters.join(
    ""
  );
}

function randomIndex(
  maximum
) {
  if (
    !Number.isSafeInteger(
      maximum
    ) ||
    maximum <= 0
  ) {
    throw new Error(
      "A valid random range is required."
    );
  }

  const limit =
    Math.floor(
      0x100000000 /
        maximum
    ) * maximum;

  const values =
    new Uint32Array(
      1
    );

  do {
    crypto.getRandomValues(
      values
    );
  } while (
    values[0] >=
    limit
  );

  return (
    values[0] %
    maximum
  );
}

function getClientIdentifier(
  request
) {
  const cloudflareIp =
    request.headers.get(
      "CF-Connecting-IP"
    );

  if (cloudflareIp) {
    return cleanText(
      cloudflareIp,
      100
    );
  }

  const forwardedFor =
    request.headers.get(
      "X-Forwarded-For"
    );

  if (forwardedFor) {
    return cleanText(
      forwardedFor
        .split(",")[0],
      100
    );
  }

  return "unknown-client";
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

function validateJsonContentType(
  request
) {
  const contentType =
    request.headers.get(
      "Content-Type"
    ) || "";

  if (
    !contentType
      .toLowerCase()
      .includes(
        "application/json"
      )
  ) {
    throw new ApiRequestError(
      "Content-Type must be application/json.",
      415
    );
  }
}

async function readJsonRequest(
  request,
  maximumLength
) {
  const declaredLength =
    Number(
      request.headers.get(
        "Content-Length"
      ) || 0
    );

  if (
    Number.isFinite(
      declaredLength
    ) &&
    declaredLength >
      maximumLength
  ) {
    throw new ApiRequestError(
      "The request is too large.",
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
      "The request is too large.",
      413
    );
  }

  try {
    const body =
      JSON.parse(
        text
      );

    if (
      !body ||
      typeof body !==
        "object" ||
      Array.isArray(
        body
      )
    ) {
      throw new Error(
        "Invalid JSON object."
      );
    }

    return body;
  } catch {
    throw new ApiRequestError(
      "The request contains invalid JSON.",
      400
    );
  }
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
  } catch (error) {
    console.error(
      "Password verification failed:",
      error
    );

    return false;
  }
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
    let index = 0;
    index <
    maximumLength;
    index += 1
  ) {
    difference |=
      (
        left[index] ||
        0
      ) ^
      (
        right[index] ||
        0
      );
  }

  return (
    difference === 0
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
      (byte) =>
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

function getAccountSessionVersion(
  account
) {
  const sessionVersion =
    Number(
      account?.sessionVersion
    );

  return (
    Number.isSafeInteger(
      sessionVersion
    ) &&
    sessionVersion > 0
  )
    ? sessionVersion
    : 1;
}

function getPayloadSessionVersion(
  payload
) {
  const sessionVersion =
    Number(
      payload?.sv
    );

  return (
    Number.isSafeInteger(
      sessionVersion
    ) &&
    sessionVersion > 0
  )
    ? sessionVersion
    : 1;
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
    v: 1,

    sub:
      account.id,

    email:
      normalizeAccountEmail(
        account.email
      ),

    firstName:
      account.firstName ||
      "",

    lastName:
      account.lastName ||
      "",

    researchAgreementAcceptedAt:
      account.researchAgreementAcceptedAt ||
      "",

    accountCreatedAt:
      account.createdAt ||
      "",

    accountUpdatedAt:
      account.updatedAt ||
      "",

    sv:
      getAccountSessionVersion(
        account
      ),

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
      token || ""
    ).split(
      "."
    );

  if (
    parts.length !== 2 ||
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
    payload.v !== 1 ||
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
    ) <= now ||
    Number(
      payload.iat
    ) >
      now + 300
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

function getSessionToken(
  request
) {
  const cookieHeader =
    request.headers.get(
      "Cookie"
    ) || "";

  for (
    const cookie of cookieHeader.split(
      ";"
    )
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

function bytesToBase64Url(
  bytes
) {
  let binary = "";

  for (
    const byte of bytes
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
      value || ""
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
        (
          (
            4 -
            (
              normalized.length %
              4
            )
          ) %
          4
        ),
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
    let index = 0;
    index <
    binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index
      );
  }

  return bytes;
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

    mustChangePassword:
      Boolean(
        account.mustChangePassword
      ),
  };
}

function toAdminAccountSummary(
  account
) {
  return {
    id:
      String(
        account.id ||
          ""
      ),

    firstName:
      cleanText(
        account.firstName,
        100
      ),

    lastName:
      cleanText(
        account.lastName,
        100
      ),

    email:
      cleanText(
        account.email,
        MAX_ACCOUNT_EMAIL_LENGTH
      ).toLowerCase(),

    status:
      cleanText(
        account.status ||
          "active",
        50
      ),

    researchAgreementAcceptedAt:
      account.researchAgreementAcceptedAt ||
      "",

    createdAt:
      account.createdAt ||
      "",

    updatedAt:
      account.updatedAt ||
      "",

    mustChangePassword:
      Boolean(
        account.mustChangePassword
      ),

    temporaryPasswordIssuedAt:
      account.temporaryPasswordIssuedAt ||
      "",

    passwordChangedAt:
      account.passwordChangedAt ||
      "",

    passwordResetCompletedAt:
      account.passwordResetCompletedAt ||
      "",

    suspensionReason:
      cleanText(
        account.suspensionReason,
        MAX_ACCOUNT_CONTROL_REASON_LENGTH
      ),

    suspendedAt:
      account.suspendedAt ||
      "",

    lastSuspensionReason:
      cleanText(
        account.lastSuspensionReason,
        MAX_ACCOUNT_CONTROL_REASON_LENGTH
      ),

    lastSuspendedAt:
      account.lastSuspendedAt ||
      "",

    reactivatedAt:
      account.reactivatedAt ||
      "",

    accountStatusChangedAt:
      account.accountStatusChangedAt ||
      "",

    lastSessionRevokedAt:
      account.lastSessionRevokedAt ||
      "",

    lastSessionRevocationReason:
      cleanText(
        account.lastSessionRevocationReason,
        MAX_ACCOUNT_CONTROL_REASON_LENGTH
      ),
  };
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
      /\r\n?/g,
      "\n"
    )
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      " "
    )
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function jsonResponse(
  body,
  status = 200,
  extraHeaders = {}
) {
  const headers =
    new Headers({
      "Content-Type":
        "application/json; charset=utf-8",

      "Cache-Control":
        "no-store",

      ...extraHeaders,
    });

  return new Response(
    JSON.stringify(
      body
    ),
    {
      status,
      headers,
    }
  );
}

function handleApiError(
  error
) {
  const status =
    error instanceof
    ApiRequestError
      ? error.status
      : 500;

  const shouldClearSession =
    status === 401 &&
    error?.message ===
      "Customer authentication is required.";

  return jsonResponse(
    {
      success: false,

      error:
        error?.message ||
        "The account request could not be completed.",
    },
    status,

    shouldClearSession
      ? {
          "Set-Cookie":
            buildClearedSessionCookie(),
        }
      : {}
  );
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
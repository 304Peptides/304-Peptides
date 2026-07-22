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
const MAX_PAYOUT_THRESHOLD_CENTS = 1_000_000;
const MAX_PAYOUT_METHOD_LENGTH = 100;
const MAX_PAYOUT_REFERENCE_LENGTH = 150;
const MAX_PAYOUT_PARTNER_NOTE_LENGTH = 1_000;
const MAX_PAYOUT_ADMIN_NOTES_LENGTH = 2_000;
const MAX_PAYOUT_ORDER_IDS = 100;
const MAX_REWARD_AMOUNT_CENTS = 1_000_000;
const MAX_REWARD_DESCRIPTION_LENGTH = 500;
const MAX_REWARD_DELIVERY_METHOD_LENGTH = 150;
const MAX_REWARD_REFERENCE_LENGTH = 150;
const MAX_REWARD_PARTNER_NOTE_LENGTH = 1_000;
const MAX_REWARD_ADMIN_NOTES_LENGTH = 2_000;
const MAX_REWARD_ID_LENGTH = 120;
const MAX_LEADERBOARD_MINIMUM_REFERRALS = 1_000;
const MAX_CAMPAIGN_REQUEST_LENGTH = 40_000;
const MAX_CAMPAIGN_ID_LENGTH = 120;
const MAX_CAMPAIGN_SLUG_LENGTH = 60;
const MAX_CAMPAIGN_TITLE_LENGTH = 150;
const MAX_CAMPAIGN_SUMMARY_LENGTH = 500;
const MAX_CAMPAIGN_HEADLINE_LENGTH = 200;
const MAX_CAMPAIGN_COPY_LENGTH = 3_000;
const MAX_CAMPAIGN_SMS_LENGTH = 500;
const MAX_CAMPAIGN_EMAIL_SUBJECT_LENGTH = 200;
const MAX_CAMPAIGN_URL_LENGTH = 1_000;
const MAX_CAMPAIGN_DISCLAIMER_LENGTH = 1_000;
const MAX_CAMPAIGN_CTA_LENGTH = 80;
const MAX_CAMPAIGN_DESTINATION_LENGTH = 200;
const ANALYTICS_VISITOR_COOKIE_NAME = "__Host-304_visitor";
const ANALYTICS_CLICK_COOKIE_NAME = "__Host-304_click";
const ANALYTICS_CHANNEL_COOKIE_NAME = "__Host-304_channel";
const ANALYTICS_PARTNER_COOKIE_NAME = "__Host-304_click_partner";
const ANALYTICS_CAMPAIGN_COOKIE_NAME = "__Host-304_click_campaign";
const ANALYTICS_VISITOR_TTL_SECONDS = 60 * 60 * 24 * 365;
const ANALYTICS_CLICK_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_ANALYTICS_VISITOR_ID_LENGTH = 120;
const MAX_ANALYTICS_CLICK_ID_LENGTH = 120;

const LEADERBOARD_PERIOD_TYPES = new Set(["monthly", "quarterly"]);
const LEADERBOARD_METRICS = new Set(["commission", "revenue", "referrals"]);
const REWARD_TYPES = new Set(["cash", "store_credit", "swag"]);
const CAMPAIGN_STATUSES = new Set(["draft", "published", "archived"]);
const ANALYTICS_PERIODS = new Set(["7", "30", "90", "all"]);
const ANALYTICS_CHANNELS = new Set([
  "general",
  "facebook",
  "instagram",
  "tiktok",
  "sms",
  "email",
  "qr",
  "other",
  "untracked",
]);

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

    if (
      url.pathname.startsWith(
        "/verify/"
      )
    ) {
      if (
        !["GET", "HEAD"].includes(
          request.method
        )
      ) {
        return new Response(
          null,
          {
            status: 405,

            headers: {
              Allow:
                "GET, HEAD",

              "Cache-Control":
                "no-store",
            },
          }
        );
      }

      const shellUrl =
        new URL(
          "/verify",
          request.url
        );

      const shellRequest =
        new Request(
          shellUrl,
          request
        );

      const shellResponse =
        await env.ASSETS.fetch(
          shellRequest
        );

      const headers =
        new Headers(
          shellResponse.headers
        );

      headers.set(
        "Cache-Control",
        "no-store"
      );

      return new Response(
        request.method === "HEAD"
          ? null
          : shellResponse.body,

        {
          status:
            shellResponse.status,

          statusText:
            shellResponse.statusText,

          headers,
        }
      );
    }

    if (url.pathname === "/r") {
      return handleReferralTrackingRedirect(request, env, url);
    }

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

    if (url.pathname === "/api/partner/payouts") {
      return handlePartnerPayoutHistoryRequest(request, env);
    }

    if (url.pathname === "/api/partner/leaderboard") {
      return handlePartnerLeaderboardRequest(request, env, url);
    }

    if (url.pathname === "/api/partner/campaigns") {
      return handlePartnerCampaignsRequest(request, env);
    }

    if (url.pathname === "/api/partner/analytics") {
      return handlePartnerAnalyticsRequest(request, env, url);
    }

    if (url.pathname === "/api/campaign/validate") {
      return handleCampaignValidationRequest(request, env, url);
    }

    if (url.pathname === "/api/admin/partner-applications") {
      return handleAdminPartnerApplicationsRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-applications/action") {
      return handleAdminPartnerActionRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-applications/commission-rate") {
      return handleAdminCommissionRateRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-referrals") {
      return handleAdminPartnerReferralsRequest(request, env);
    }
    if (url.pathname === "/api/admin/partner-risk-flags") {
      return handleAdminRiskFlagsRequest(request, env, url);
    }

    if (url.pathname === "/api/admin/partner-risk-flags/create") {
      return handleAdminCreateRiskFlagRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-risk-flags/update") {
      return handleAdminUpdateRiskFlagRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-referral-payout-hold") {
      return handleAdminReferralPayoutHoldRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-payout-settings") {
      return handleAdminPayoutSettingsRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-payouts") {
      return handleAdminPartnerPayoutsRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-payouts/create") {
      return handleAdminCreatePayoutRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-leaderboard") {
      return handleAdminPartnerLeaderboardRequest(request, env, url);
    }

    if (url.pathname === "/api/admin/partner-leaderboard-settings") {
      return handleAdminLeaderboardSettingsRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-rewards") {
      return handleAdminPartnerRewardsRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-rewards/award") {
      return handleAdminAwardRewardRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-rewards/issue") {
      return handleAdminIssueRewardRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-campaigns") {
      return handleAdminPartnerCampaignsRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-campaigns/save") {
      return handleAdminSaveCampaignRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-campaigns/status") {
      return handleAdminCampaignStatusRequest(request, env);
    }

    if (url.pathname === "/api/admin/partner-analytics") {
      return handleAdminPartnerAnalyticsRequest(request, env, url);
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
      ["/api/auth/register", "/api/auth/login"].includes(url.pathname)
    ) {
      const response = await coreWorker.fetch(request, env, context);
      return upgradeAuthenticationResponse(response, env);
    }

    if (url.pathname === "/api/auth/session") {
      const sessionState = await inspectCustomerSession(request, env);

      if (!sessionState.session) {
        return jsonResponse(
          {
            success: true,
            authenticated: false,
            account: null,
          },
          200,
          sessionState.hasToken
            ? { "Set-Cookie": buildClearedSessionCookie() }
            : {}
        );
      }

      return jsonResponse({
        success: true,
        authenticated: true,
        account: toPublicAccount(sessionState.session.account),
        requiresPasswordChange: Boolean(
          sessionState.session.account.mustChangePassword
        ),
      });
    }

    if (url.pathname === "/api/account/orders") {
      const sessionState = await inspectCustomerSession(request, env);

      if (!sessionState.session) {
        return jsonResponse(
          {
            success: false,
            error: "Customer authentication is required.",
          },
          401,
          { "Set-Cookie": buildClearedSessionCookie() }
        );
      }

      if (sessionState.session.account.mustChangePassword) {
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

    if (url.pathname === "/api/order" && request.method === "POST") {
      return handleOrderWithReferral(request, env, context);
    }

    if (
      url.pathname.startsWith("/api/admin/orders/") &&
      ["PATCH", "DELETE"].includes(request.method)
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

  async scheduled(controller, env, context) {
    return coreWorker.scheduled(controller, env, context);
  },
};

async function handleReferralTrackingRedirect(request, env, url) {
  const fallbackUrl = new URL("/checkout", url.origin);

  try {
    validatePartnerEnvironment(env);

    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response(null, {
        status: 405,
        headers: {
          Allow: 'GET, HEAD',
          'Cache-Control': 'no-store',
        },
      });
    }

    const code = validatePartnerCode(
      url.searchParams.get('ref') || url.searchParams.get('code')
    );
    const campaignSlug = normalizeOptionalCampaignSlug(
      url.searchParams.get('campaign')
    );
    const channel = normalizeAnalyticsChannel(
      url.searchParams.get('channel') || 'general'
    );
    const existingVisitorId = cleanText(
      getCookieValue(request, ANALYTICS_VISITOR_COOKIE_NAME),
      MAX_ANALYTICS_VISITOR_ID_LENGTH
    );
    const visitorId = isValidAnalyticsIdentifier(existingVisitorId)
      ? existingVisitorId
      : createAnalyticsVisitorId();

    const registryResponse = await partnerRegistryFetch(
      env,
      '/analytics/track',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          campaignSlug,
          visitorId,
          channel,
        }),
      }
    );
    const result = await readInternalJsonResponse(registryResponse);
    const click = result.click && typeof result.click === 'object'
      ? result.click
      : {};
    const trackedCode = cleanText(
      click.partnerCode || code,
      MAX_REFERRAL_CODE_LENGTH
    ).toUpperCase();
    const trackedCampaign = normalizeOptionalCampaignSlug(
      click.campaignSlug || ''
    );
    const destinationPath = validateAnalyticsDestinationPath(
      click.destinationPath || '/checkout'
    );
    const destination = new URL(destinationPath, url.origin);

    destination.searchParams.set('ref', trackedCode);
    if (trackedCampaign) {
      destination.searchParams.set('campaign', trackedCampaign);
    } else {
      destination.searchParams.delete('campaign');
    }

    const headers = new Headers({
      Location: destination.toString(),
      'Cache-Control': 'no-store, private',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Robots-Tag': 'noindex, nofollow',
    });

    headers.append(
      'Set-Cookie',
      buildAnalyticsCookie(
        ANALYTICS_VISITOR_COOKIE_NAME,
        visitorId,
        ANALYTICS_VISITOR_TTL_SECONDS
      )
    );
    headers.append(
      'Set-Cookie',
      buildAnalyticsCookie(
        ANALYTICS_CLICK_COOKIE_NAME,
        cleanText(click.clickId, MAX_ANALYTICS_CLICK_ID_LENGTH),
        ANALYTICS_CLICK_TTL_SECONDS
      )
    );
    headers.append(
      'Set-Cookie',
      buildAnalyticsCookie(
        ANALYTICS_CHANNEL_COOKIE_NAME,
        channel,
        ANALYTICS_CLICK_TTL_SECONDS
      )
    );
    headers.append(
      'Set-Cookie',
      buildAnalyticsCookie(
        ANALYTICS_PARTNER_COOKIE_NAME,
        trackedCode,
        ANALYTICS_CLICK_TTL_SECONDS
      )
    );
    headers.append(
      'Set-Cookie',
      buildAnalyticsCookie(
        ANALYTICS_CAMPAIGN_COOKIE_NAME,
        trackedCampaign || '-',
        ANALYTICS_CLICK_TTL_SECONDS
      )
    );

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error) {
    console.error('Referral tracking redirect error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        Location: fallbackUrl.toString(),
        'Cache-Control': 'no-store, private',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }
}

async function handlePartnerAnalyticsRequest(request, env, url) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== 'GET') {
      throw new ApiRequestError('Method not allowed.', 405);
    }

    requireSameOrigin(request);
    const sessionState = await requireEligibleCustomerSession(request, env);
    const period = normalizeAnalyticsPeriod(url.searchParams.get('period'));
    const search = new URLSearchParams({
      accountId: sessionState.session.account.id,
      period,
    });
    const registryResponse = await partnerRegistryFetch(
      env,
      `/partner/analytics?${search.toString()}`,
      { method: 'GET' }
    );
    const result = await readInternalJsonResponse(registryResponse);
    const application = toCustomerPartnerApplication(result.application);

    if (!application || !['approved', 'suspended'].includes(application.status)) {
      throw new ApiRequestError(
        'Approved Partner Program access is required to view analytics.',
        403
      );
    }

    return jsonResponse({
      success: true,
      application,
      analytics: toCustomerAnalyticsReport(result.analytics),
    });
  } catch (error) {
    console.error('Partner analytics request error:', error);
    return handleApiError(error);
  }
}

async function handleAdminPartnerAnalyticsRequest(request, env, url) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== 'GET') {
      throw new ApiRequestError('Method not allowed.', 405);
    }

    requireSameOrigin(request);
    await requireAdminAuthorization(request, env);

    const period = normalizeAnalyticsPeriod(url.searchParams.get('period'));
    const partnerCode = normalizeOptionalPartnerCode(
      url.searchParams.get('partnerCode')
    );
    const campaignSlug = normalizeOptionalCampaignSlug(
      url.searchParams.get('campaign')
    );
    const search = new URLSearchParams({ period });

    if (partnerCode) search.set('partnerCode', partnerCode);
    if (campaignSlug) search.set('campaign', campaignSlug);

    const registryResponse = await partnerRegistryFetch(
      env,
      `/admin/analytics?${search.toString()}`,
      { method: 'GET' }
    );
    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      analytics: toAdminAnalyticsReport(result.analytics),
    });
  } catch (error) {
    console.error('Admin partner analytics request error:', error);
    return handleApiError(error);
  }
}

async function handleCustomerPartnerApplicationRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);

    const sessionState = await requireEligibleCustomerSession(request, env);
    const application = await getRegistryApplication(
      env,
      sessionState.session.account.id
    );

    const hasOrder = await customerHasStoredOrder(
      env,
      sessionState.session.account.id
    );

    return jsonResponse({
      success: true,
      application: toCustomerPartnerApplication(application),
      eligibility: {
        eligible: hasOrder,
        hasOrder,
        requirement: hasOrder
          ? "Eligible to apply."
          : "Submit at least one order request before applying to the Partner Program.",
      },
      codeRules: getPartnerCodeRules(),
    });
  } catch (error) {
    console.error("Customer partner application request error:", error);
    return handleApiError(error);
  }
}

async function handlePartnerCodeAvailabilityRequest(request, env, url) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);

    const sessionState = await requireEligibleCustomerSession(request, env);
    const code = validatePartnerCode(url.searchParams.get("code"));

    const registryResponse = await partnerRegistryFetch(
      env,
      `/availability?code=${encodeURIComponent(code)}&accountId=${encodeURIComponent(
        sessionState.session.account.id
      )}`,
      { method: "GET" }
    );

    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      code,
      available: Boolean(result.available),
      ownedByAccount: Boolean(result.ownedByAccount),
      message: result.available
        ? result.ownedByAccount
          ? "This code is already reserved for your account."
          : "This partner code is available."
        : "That partner code has already been claimed.",
    });
  } catch (error) {
    console.error("Partner code availability request error:", error);
    return handleApiError(error);
  }
}

async function handlePartnerApplicationSubmission(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await enforceAuthenticationRateLimit(request, env, "partner-apply");

    const sessionState = await requireEligibleCustomerSession(request, env);
    const account = sessionState.session.account;

    const hasOrder = await customerHasStoredOrder(env, account.id);

    if (!hasOrder) {
      throw new ApiRequestError(
        "Submit at least one order request before applying to the Partner Program.",
        403
      );
    }

    const body = await readJsonRequest(request, MAX_AUTH_REQUEST_LENGTH);

    if (body.agreementAccepted !== true) {
      throw new ApiRequestError(
        "Accept the Partner Program agreement before submitting the application.",
        400
      );
    }

    const code = validatePartnerCode(body.code);
    const primaryPlatform = cleanText(
      body.primaryPlatform,
      MAX_PARTNER_PLATFORM_LENGTH
    );
    const profileUrl = validateOptionalHttpUrl(
      body.profileUrl,
      MAX_PARTNER_PROFILE_URL_LENGTH
    );
    const audienceSize = cleanText(
      body.audienceSize,
      MAX_PARTNER_AUDIENCE_LENGTH
    );
    const promotionPlan = cleanMultilineText(
      body.promotionPlan,
      MAX_PARTNER_PROMOTION_PLAN_LENGTH
    );
    const experience = cleanMultilineText(
      body.experience,
      MAX_PARTNER_EXPERIENCE_LENGTH
    );

    if (!primaryPlatform || !audienceSize || !promotionPlan) {
      throw new ApiRequestError(
        "Complete the platform, audience, and promotion-plan fields.",
        400
      );
    }

    const submittedPayload = {
      accountId: account.id,
      email: account.email,
      firstName: account.firstName || "",
      lastName: account.lastName || "",
      code,
      primaryPlatform,
      profileUrl,
      audienceSize,
      promotionPlan,
      experience,
      agreementAcceptedAt: new Date().toISOString(),
      agreementVersion: PARTNER_AGREEMENT_VERSION,
    };

    const registryResponse = await partnerRegistryFetch(env, "/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submittedPayload),
    });

    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse(
      {
        success: true,
        application: toCustomerPartnerApplication(result.application),
        message:
          result.message ||
          "Your partner application was submitted for review.",
      },
      201
    );
  } catch (error) {
    console.error("Partner application submission error:", error);
    return handleApiError(error);
  }
}

async function handleAdminPartnerApplicationsRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    await requireAdminAuthorization(request, env);

    const registryResponse = await partnerRegistryFetch(env, "/admin/list", {
      method: "GET",
    });

    const result = await readInternalJsonResponse(registryResponse);
    const applications = Array.isArray(result.applications)
      ? result.applications.map(toAdminPartnerApplication)
      : [];

    return jsonResponse({
      success: true,
      applications,
      records: applications,
      count: applications.length,
    });
  } catch (error) {
    console.error("Admin partner applications request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminPartnerActionRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await requireAdminAuthorization(request, env);
    await enforceAuthenticationRateLimit(request, env, "partner-admin-action");

    const body = await readJsonRequest(request, MAX_AUTH_REQUEST_LENGTH);
    const action = cleanText(body.action, 30).toLowerCase();
    const accountId = cleanText(body.accountId, 150);
    const customerMessage = cleanMultilineText(
      body.customerMessage,
      MAX_PARTNER_CUSTOMER_MESSAGE_LENGTH
    );
    const adminNotes = cleanMultilineText(
      body.adminNotes,
      MAX_PARTNER_ADMIN_NOTES_LENGTH
    );

    if (!accountId) {
      throw new ApiRequestError("A customer account ID is required.", 400);
    }

    if (!["approve", "deny", "suspend", "reactivate"].includes(action)) {
      throw new ApiRequestError("Choose a valid partner action.", 400);
    }

    if (["deny", "suspend"].includes(action) && !customerMessage) {
      throw new ApiRequestError(
        action === "deny"
          ? "Enter a customer-facing reason before denying the application."
          : "Enter a customer-facing reason before suspending the partner.",
        400
      );
    }

    const reviewedBy = cleanText(
      request.headers.get("Cf-Access-Authenticated-User-Email") ||
        request.headers.get("CF-Access-Authenticated-User-Email") ||
        "authorized administrator",
      254
    );

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/action",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      action,
      application: toAdminPartnerApplication(result.application),
      message: result.message || "The partner application was updated.",
    });
  } catch (error) {
    console.error("Admin partner action request error:", error);
    return handleApiError(error);
  }
}


async function handleReferralValidationRequest(request, env, url) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);

    const sessionState = await requireEligibleCustomerSession(request, env);
    const code = validatePartnerCode(url.searchParams.get("code"));
    const campaignSlug = normalizeOptionalCampaignSlug(
      url.searchParams.get("campaign")
    );
    const search = new URLSearchParams({
      code,
      customerAccountId: sessionState.session.account.id,
    });

    if (campaignSlug) {
      search.set("campaign", campaignSlug);
    }

    const registryResponse = await partnerRegistryFetch(
      env,
      `/referral/validate?${search.toString()}`,
      { method: "GET" }
    );

    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      valid: Boolean(result.valid),
      code: result.code || code,
      reason: cleanText(result.reason, 50),
      message:
        result.message ||
        (result.valid
          ? "Referral code applied. The order subtotal is unchanged."
          : "That referral code is not active."),
      discountAmount: 0,
      changesOrderTotal: false,
      selfUse: Boolean(result.selfUse),
      tierProgressEligible: Boolean(result.tierProgressEligible),
      campaignRequested: Boolean(result.campaignRequested),
      campaignValid: Boolean(result.campaignValid),
      campaign: toCustomerCampaignRecord(result.campaign),
    });
  } catch (error) {
    console.error("Referral validation request error:", error);
    return handleApiError(error);
  }
}

async function handlePartnerSummaryRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);

    const sessionState = await requireEligibleCustomerSession(request, env);

    const registryResponse = await partnerRegistryFetch(
      env,
      `/partner/summary?accountId=${encodeURIComponent(
        sessionState.session.account.id
      )}`,
      { method: "GET" }
    );

    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      application: toCustomerPartnerApplication(result.application),
      summary: toCustomerReferralSummary(result.summary),
      referrals: Array.isArray(result.referrals)
        ? result.referrals.map(toCustomerReferralRecord).filter(Boolean)
        : [],
      payouts: Array.isArray(result.payouts)
        ? result.payouts.map(toCustomerPayoutRecord).filter(Boolean)
        : [],
      payoutSettings: toCustomerPayoutSettings(result.payoutSettings),
    });
  } catch (error) {
    console.error("Partner summary request error:", error);
    return handleApiError(error);
  }
}

async function handlePartnerPayoutHistoryRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);

    const sessionState = await requireEligibleCustomerSession(request, env);

    const registryResponse = await partnerRegistryFetch(
      env,
      `/partner/payouts?accountId=${encodeURIComponent(
        sessionState.session.account.id
      )}`,
      { method: "GET" }
    );

    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      application: toCustomerPartnerApplication(result.application),
      payouts: Array.isArray(result.payouts)
        ? result.payouts.map(toCustomerPayoutRecord).filter(Boolean)
        : [],
      payoutSettings: toCustomerPayoutSettings(result.payoutSettings),
    });
  } catch (error) {
    console.error("Partner payout history request error:", error);
    return handleApiError(error);
  }
}

async function handlePartnerLeaderboardRequest(request, env, url) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);

    const sessionState = await requireEligibleCustomerSession(request, env);
    const periodType = normalizeLeaderboardPeriodType(
      url.searchParams.get("periodType") || "monthly"
    );
    const periodKey = normalizeOptionalLeaderboardPeriodKey(
      periodType,
      url.searchParams.get("periodKey")
    );

    const search = new URLSearchParams({
      accountId: sessionState.session.account.id,
      periodType,
    });

    if (periodKey) {
      search.set("periodKey", periodKey);
    }

    const registryResponse = await partnerRegistryFetch(
      env,
      `/partner/leaderboard?${search.toString()}`,
      { method: "GET" }
    );

    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      period: toLeaderboardPeriod(result.period),
      settings: toCustomerLeaderboardSettings(result.settings),
      entries: Array.isArray(result.entries)
        ? result.entries.map(toCustomerLeaderboardEntry).filter(Boolean)
        : [],
      currentPartner: toCustomerOwnLeaderboardEntry(result.currentPartner),
      reward: toCustomerRewardRecord(result.reward),
      rewards: Array.isArray(result.rewards)
        ? result.rewards.map(toCustomerRewardRecord).filter(Boolean)
        : [],
    });
  } catch (error) {
    console.error("Partner leaderboard request error:", error);
    return handleApiError(error);
  }
}

async function handlePartnerCampaignsRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);

    const sessionState = await requireEligibleCustomerSession(request, env);
    const registryResponse = await partnerRegistryFetch(
      env,
      `/partner/campaigns?accountId=${encodeURIComponent(
        sessionState.session.account.id
      )}`,
      { method: "GET" }
    );
    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      application: toCustomerPartnerApplication(result.application),
      campaigns: Array.isArray(result.campaigns)
        ? result.campaigns.map(toCustomerCampaignRecord).filter(Boolean)
        : [],
    });
  } catch (error) {
    console.error("Partner campaigns request error:", error);
    return handleApiError(error);
  }
}

async function handleCampaignValidationRequest(request, env, url) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    const slug = validateCampaignSlug(url.searchParams.get("slug"));
    const registryResponse = await partnerRegistryFetch(
      env,
      `/campaign/validate?slug=${encodeURIComponent(slug)}`,
      { method: "GET" }
    );
    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      valid: Boolean(result.valid),
      campaign: toCustomerCampaignRecord(result.campaign),
      message:
        result.message ||
        (result.valid
          ? "The marketing campaign is active."
          : "That marketing campaign is no longer active."),
    });
  } catch (error) {
    console.error("Campaign validation request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminPartnerLeaderboardRequest(request, env, url) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    await requireAdminAuthorization(request, env);

    const periodType = normalizeLeaderboardPeriodType(
      url.searchParams.get("periodType") || "monthly"
    );
    const periodKey = normalizeOptionalLeaderboardPeriodKey(
      periodType,
      url.searchParams.get("periodKey")
    );
    const search = new URLSearchParams({ periodType });

    if (periodKey) {
      search.set("periodKey", periodKey);
    }

    const registryResponse = await partnerRegistryFetch(
      env,
      `/admin/leaderboard?${search.toString()}`,
      { method: "GET" }
    );

    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      period: toLeaderboardPeriod(result.period),
      settings: toAdminLeaderboardSettings(result.settings),
      entries: Array.isArray(result.entries)
        ? result.entries.map(toAdminLeaderboardEntry).filter(Boolean)
        : [],
      reward: toAdminRewardRecord(result.reward),
    });
  } catch (error) {
    console.error("Admin partner leaderboard request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminLeaderboardSettingsRequest(request, env) {
  try {
    validatePartnerEnvironment(env);
    requireSameOrigin(request);
    await requireAdminAuthorization(request, env);

    if (request.method === "GET") {
      const registryResponse = await partnerRegistryFetch(
        env,
        "/admin/leaderboard-settings",
        { method: "GET" }
      );
      const result = await readInternalJsonResponse(registryResponse);

      return jsonResponse({
        success: true,
        settings: toAdminLeaderboardSettings(result.settings),
      });
    }

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    validateJsonContentType(request);
    await enforceAuthenticationRateLimit(
      request,
      env,
      "partner-leaderboard-settings"
    );

    const body = await readJsonRequest(request, MAX_AUTH_REQUEST_LENGTH);
    const settings = normalizeLeaderboardSettingsRequest(body);
    const updatedBy = getAdminIdentity(request);

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/leaderboard-settings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, updatedBy }),
      }
    );

    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      settings: toAdminLeaderboardSettings(result.settings),
      message:
        result.message || "The leaderboard and reward rules were updated.",
    });
  } catch (error) {
    console.error("Admin leaderboard settings request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminPartnerRewardsRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    await requireAdminAuthorization(request, env);

    const registryResponse = await partnerRegistryFetch(env, "/admin/rewards", {
      method: "GET",
    });
    const result = await readInternalJsonResponse(registryResponse);
    const rewards = Array.isArray(result.rewards)
      ? result.rewards.map(toAdminRewardRecord).filter(Boolean)
      : [];

    return jsonResponse({
      success: true,
      rewards,
      records: rewards,
      count: rewards.length,
      settings: toAdminLeaderboardSettings(result.settings),
    });
  } catch (error) {
    console.error("Admin partner rewards request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminAwardRewardRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await requireAdminAuthorization(request, env);
    await enforceAuthenticationRateLimit(request, env, "partner-reward-award");

    const body = await readJsonRequest(request, MAX_AUTH_REQUEST_LENGTH);
    const periodType = normalizeLeaderboardPeriodType(body.periodType);
    const periodKey = normalizeRequiredLeaderboardPeriodKey(
      periodType,
      body.periodKey
    );
    const rewardPayload = {
      periodType,
      periodKey,
      awardedBy: getAdminIdentity(request),
      partnerNote: cleanMultilineText(
        body.partnerNote,
        MAX_REWARD_PARTNER_NOTE_LENGTH
      ),
      adminNotes: cleanMultilineText(
        body.adminNotes,
        MAX_REWARD_ADMIN_NOTES_LENGTH
      ),
    };

    if (body.rewardType !== undefined && String(body.rewardType).trim()) {
      rewardPayload.rewardType = normalizeRewardType(body.rewardType);
    }

    const rewardAmountCents = normalizeOptionalRewardAmountCents(body);
    if (rewardAmountCents !== undefined) {
      rewardPayload.rewardAmountCents = rewardAmountCents;
    }

    if (body.rewardDescription !== undefined) {
      rewardPayload.rewardDescription = cleanText(
        body.rewardDescription,
        MAX_REWARD_DESCRIPTION_LENGTH
      );
    }

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/rewards/award",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rewardPayload),
      }
    );
    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse(
      {
        success: true,
        reward: toAdminRewardRecord(result.reward),
        message: result.message || "The leaderboard winner was recorded.",
      },
      201
    );
  } catch (error) {
    console.error("Admin award reward request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminIssueRewardRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await requireAdminAuthorization(request, env);
    await enforceAuthenticationRateLimit(request, env, "partner-reward-issue");

    const body = await readJsonRequest(request, MAX_AUTH_REQUEST_LENGTH);
    const rewardId = cleanText(body.rewardId, MAX_REWARD_ID_LENGTH);
    const deliveryMethod = cleanText(
      body.deliveryMethod,
      MAX_REWARD_DELIVERY_METHOD_LENGTH
    );

    if (!rewardId) {
      throw new ApiRequestError("A reward ID is required.", 400);
    }

    if (!deliveryMethod) {
      throw new ApiRequestError("A reward delivery method is required.", 400);
    }

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/rewards/issue",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId,
          deliveryMethod,
          referenceNumber: cleanText(
            body.referenceNumber,
            MAX_REWARD_REFERENCE_LENGTH
          ),
          issuedAt: normalizeOptionalPayoutDate(body.issuedAt),
          partnerNote: cleanMultilineText(
            body.partnerNote,
            MAX_REWARD_PARTNER_NOTE_LENGTH
          ),
          adminNotes: cleanMultilineText(
            body.adminNotes,
            MAX_REWARD_ADMIN_NOTES_LENGTH
          ),
          issuedBy: getAdminIdentity(request),
        }),
      }
    );
    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      reward: toAdminRewardRecord(result.reward),
      message: result.message || "The leaderboard reward was marked as issued.",
    });
  } catch (error) {
    console.error("Admin issue reward request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminCommissionRateRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await requireAdminAuthorization(request, env);
    await enforceAuthenticationRateLimit(
      request,
      env,
      "partner-commission-rate"
    );

    const body = await readJsonRequest(request, MAX_AUTH_REQUEST_LENGTH);
    const accountId = cleanText(body.accountId, 150);

    if (!accountId) {
      throw new ApiRequestError("A partner account ID is required.", 400);
    }

    const commissionRateBps = normalizeCommissionRateBps(body);

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/commission-rate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          commissionRateBps,
        }),
      }
    );

    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      application: toAdminPartnerApplication(result.application),
      message:
        result.message ||
        "The partner commission rate was updated for future referrals.",
    });
  } catch (error) {
    console.error("Admin commission-rate request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminPartnerReferralsRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    await requireAdminAuthorization(request, env);

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/referrals",
      { method: "GET" }
    );

    const result = await readInternalJsonResponse(registryResponse);
    const referrals = Array.isArray(result.referrals)
      ? result.referrals.map(toAdminReferralRecord)
      : [];

    return jsonResponse({
      success: true,
      referrals,
      records: referrals,
      count: referrals.length,
    });
  } catch (error) {
    console.error("Admin partner referrals request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminRiskFlagsRequest(request, env, url) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    await requireAdminAuthorization(request, env);

    const status = cleanText(
      url.searchParams.get("status") || "all",
      40
    ).toLowerCase();

    const registryResponse = await partnerRegistryFetch(
      env,
      `/admin/risk-flags?status=${encodeURIComponent(status)}`,
      { method: "GET" }
    );

    const result = await readInternalJsonResponse(
      registryResponse
    );

    const flags = Array.isArray(result.flags)
      ? result.flags
          .map(toAdminRiskFlagRecord)
          .filter(Boolean)
      : [];

    return jsonResponse({
      success: true,
      flags,
      records: flags,
      count: flags.length,
      statusCounts: toAdminRiskStatusCounts(
        result.statusCounts
      ),
    });
  } catch (error) {
    console.error(
      "Admin fraud-review list request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handleAdminCreateRiskFlagRequest(
  request,
  env
) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await requireAdminAuthorization(request, env);

    await enforceAuthenticationRateLimit(
      request,
      env,
      "partner-risk-create"
    );

    const body = await readJsonRequest(
      request,
      MAX_AUTH_REQUEST_LENGTH
    );

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/risk-flags/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: cleanText(
            body.orderId,
            100
          ).toUpperCase(),
          partnerAccountId: cleanText(
            body.partnerAccountId,
            150
          ),
          partnerCode: cleanText(
            body.partnerCode,
            MAX_REFERRAL_CODE_LENGTH
          ).toUpperCase(),
          customerAccountId: cleanText(
            body.customerAccountId,
            150
          ),
          customerEmail: cleanText(
            body.customerEmail,
            MAX_REFERRAL_CUSTOMER_EMAIL_LENGTH
          ).toLowerCase(),
          addressFingerprint: cleanText(
            body.addressFingerprint,
            128
          ),
          flagType: cleanText(
            body.flagType || "manual_review",
            80
          ).toLowerCase(),
          severity: cleanText(
            body.severity || "medium",
            40
          ).toLowerCase(),
          title: cleanText(body.title, 160),
          summary: cleanMultilineText(
            body.summary,
            2000
          ),
          privateNotes: cleanMultilineText(
            body.privateNotes,
            5000
          ),
          payoutHoldRecommended: Boolean(
            body.payoutHoldRecommended
          ),
          createdBy: getAdminIdentity(request),
        }),
      }
    );

    const result = await readInternalJsonResponse(
      registryResponse
    );

    return jsonResponse({
      success: true,
      flag: toAdminRiskFlagRecord(result.flag),
      message:
        result.message ||
        "The review flag was created.",
    });
  } catch (error) {
    console.error(
      "Admin fraud-review create request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handleAdminUpdateRiskFlagRequest(
  request,
  env
) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await requireAdminAuthorization(request, env);

    await enforceAuthenticationRateLimit(
      request,
      env,
      "partner-risk-update"
    );

    const body = await readJsonRequest(
      request,
      MAX_AUTH_REQUEST_LENGTH
    );

    const updatePayload = {
      flagId: cleanText(body.flagId, 120),
      status: cleanText(
        body.status,
        40
      ).toLowerCase(),
      severity: cleanText(
        body.severity,
        40
      ).toLowerCase(),
      note: cleanMultilineText(
        body.note,
        2000
      ),
      updatedBy: getAdminIdentity(request),
    };

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "privateNotes"
      )
    ) {
      updatePayload.privateNotes =
        cleanMultilineText(
          body.privateNotes,
          5000
        );
    }

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/risk-flags/update",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      }
    );

    const result = await readInternalJsonResponse(
      registryResponse
    );

    return jsonResponse({
      success: true,
      flag: toAdminRiskFlagRecord(result.flag),
      message:
        result.message ||
        "The review flag was updated.",
    });
  } catch (error) {
    console.error(
      "Admin fraud-review update request error:",
      error
    );

    return handleApiError(error);
  }
}

async function handleAdminReferralPayoutHoldRequest(
  request,
  env
) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await requireAdminAuthorization(request, env);

    await enforceAuthenticationRateLimit(
      request,
      env,
      "partner-payout-hold"
    );

    const body = await readJsonRequest(
      request,
      MAX_AUTH_REQUEST_LENGTH
    );

    if (typeof body.hold !== "boolean") {
      throw new ApiRequestError(
        "Choose whether to apply or clear the payout hold.",
        400
      );
    }

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/referral-payout-hold",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: cleanText(
            body.orderId,
            100
          ).toUpperCase(),
          hold: body.hold,
          reason: cleanMultilineText(
            body.reason,
            5000
          ),
          flagId: cleanText(
            body.flagId,
            120
          ),
          updatedBy: getAdminIdentity(request),
        }),
      }
    );

    const result = await readInternalJsonResponse(
      registryResponse
    );

    const holdHistory = Array.isArray(
      result.holdHistory
    )
      ? result.holdHistory
          .map(toAdminReferralHoldHistoryRecord)
          .filter(Boolean)
      : [];

    return jsonResponse({
      success: true,
      referral: toAdminReferralRecord(
        result.referral
      ),
      holdHistory,
      message:
        result.message ||
        "The referral payout-hold status was updated.",
    });
  } catch (error) {
    console.error(
      "Admin referral payout-hold request error:",
      error
    );

    return handleApiError(error);
  }
}
async function handleAdminPayoutSettingsRequest(request, env) {
  try {
    validatePartnerEnvironment(env);
    requireSameOrigin(request);
    await requireAdminAuthorization(request, env);

    if (request.method === "GET") {
      const registryResponse = await partnerRegistryFetch(
        env,
        "/admin/payout-settings",
        { method: "GET" }
      );

      const result = await readInternalJsonResponse(registryResponse);

      return jsonResponse({
        success: true,
        settings: toAdminPayoutSettings(result.settings),
      });
    }

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    validateJsonContentType(request);
    await enforceAuthenticationRateLimit(
      request,
      env,
      "partner-payout-settings"
    );

    const body = await readJsonRequest(request, MAX_AUTH_REQUEST_LENGTH);
    const minimumPayoutCents = normalizePayoutThresholdCents(body);
    const updatedBy = getAdminIdentity(request);

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/payout-settings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minimumPayoutCents, updatedBy }),
      }
    );

    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      settings: toAdminPayoutSettings(result.settings),
      message:
        result.message ||
        "The minimum partner payout threshold was updated.",
    });
  } catch (error) {
    console.error("Admin payout settings request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminPartnerPayoutsRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    await requireAdminAuthorization(request, env);

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/payouts",
      { method: "GET" }
    );

    const result = await readInternalJsonResponse(registryResponse);
    const payouts = Array.isArray(result.payouts)
      ? result.payouts.map(toAdminPayoutRecord).filter(Boolean)
      : [];

    return jsonResponse({
      success: true,
      payouts,
      records: payouts,
      count: payouts.length,
      settings: toAdminPayoutSettings(result.settings),
    });
  } catch (error) {
    console.error("Admin partner payouts request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminCreatePayoutRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await requireAdminAuthorization(request, env);
    await enforceAuthenticationRateLimit(
      request,
      env,
      "partner-payout-create"
    );

    const body = await readJsonRequest(request, MAX_AUTH_REQUEST_LENGTH);
    const accountId = cleanText(body.accountId, 150);

    if (!accountId) {
      throw new ApiRequestError("A partner account ID is required.", 400);
    }

    const payoutType = cleanText(body.payoutType, 40).toLowerCase();

    if (!["cash", "store_credit"].includes(payoutType)) {
      throw new ApiRequestError(
        "Choose cash or store credit as the payout type.",
        400
      );
    }

    const paymentMethod = cleanText(
      body.paymentMethod,
      MAX_PAYOUT_METHOD_LENGTH
    );

    if (!paymentMethod) {
      throw new ApiRequestError("A payout method is required.", 400);
    }

    const referenceNumber = cleanText(
      body.referenceNumber,
      MAX_PAYOUT_REFERENCE_LENGTH
    );
    const partnerNote = cleanMultilineText(
      body.partnerNote,
      MAX_PAYOUT_PARTNER_NOTE_LENGTH
    );
    const adminNotes = cleanMultilineText(
      body.adminNotes,
      MAX_PAYOUT_ADMIN_NOTES_LENGTH
    );
    const paidAt = normalizeOptionalPayoutDate(body.paidAt);
    const orderIds = normalizePayoutOrderIds(body.orderIds);
    const createdBy = getAdminIdentity(request);

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/payouts/create",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          payoutType,
          paymentMethod,
          referenceNumber,
          partnerNote,
          adminNotes,
          paidAt,
          orderIds,
          createdBy,
        }),
      }
    );

    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse(
      {
        success: true,
        payout: toAdminPayoutRecord(result.payout),
        message: result.message || "The partner payout was recorded.",
      },
      201
    );
  } catch (error) {
    console.error("Admin create payout request error:", error);
    return handleApiError(error);
  }
}

async function handleOrderWithReferral(request, env, context) {
  try {
    validateEnvironment(env);

    const sessionState = await inspectCustomerSession(request, env);

    if (sessionState.hasToken && !sessionState.session) {
      return jsonResponse(
        {
          success: false,
          error:
            "Your secure session has expired. Log in again before submitting the order.",
        },
        401,
        { "Set-Cookie": buildClearedSessionCookie() }
      );
    }

    if (
      sessionState.session &&
      sessionState.session.account.mustChangePassword
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

    const submittedReferral = await extractReferralContextFromOrderRequest(
      request
    );
    const submittedReferralCode = submittedReferral.code;
    const submittedCampaignSlug = submittedReferral.campaignSlug;

    let validatedReferral = null;

    if (submittedReferralCode) {
      validatePartnerEnvironment(env);

      if (!sessionState.session) {
        throw new ApiRequestError(
          "Log in before applying a referral code to an order.",
          401
        );
      }

      const code = validatePartnerCode(submittedReferralCode);

      const referralSearch = new URLSearchParams({
        code,
        customerAccountId: sessionState.session.account.id,
      });

      if (submittedCampaignSlug) {
        referralSearch.set("campaign", submittedCampaignSlug);
      }

      const registryResponse = await partnerRegistryFetch(
        env,
        `/referral/validate?${referralSearch.toString()}`,
        { method: "GET" }
      );

      const result = await readInternalJsonResponse(registryResponse);

      if (!result.valid) {
        throw new ApiRequestError(
          result.message || "That referral code is not active.",
          result.reason === "self_referral" ? 409 : 400
        );
      }

      validatedReferral = {
        code: cleanText(result.code || code, MAX_REFERRAL_CODE_LENGTH),
        selfUse: Boolean(result.selfUse),
        tierProgressEligible: Boolean(result.tierProgressEligible),
        validationMessage: cleanText(result.message, 500),
        campaign:
          result.campaignValid && result.campaign
            ? toCustomerCampaignRecord(result.campaign)
            : null,
      };
    }

    const analyticsContext = validatedReferral
      ? extractAnalyticsContextFromRequest(
          request,
          validatedReferral.code,
          validatedReferral.campaign?.slug || ''
        )
      : emptyAnalyticsContext();

    const response = await coreWorker.fetch(request, env, context);

    if (!response.ok || !validatedReferral) {
      return response;
    }

    let result;

    try {
      result = await response.clone().json();
    } catch {
      return response;
    }

    if (!result?.success) {
      return response;
    }

    const orderId = cleanText(
      result.orderId || result.order?.orderId || result.order?.id,
      100
    ).toUpperCase();

    if (!orderId) {
      return appendJsonResponseFields(response, result, {
        referralTracking: {
          success: false,
          code: validatedReferral.code,
          message:
            "The order was accepted, but the referral record could not be attached because the order number was unavailable.",
        },
      });
    }

    let storedOrder =
      result.order && typeof result.order === "object"
        ? result.order
        : await env.DOCUMENTS_KV.get(`${ORDER_KEY_PREFIX}${orderId}`, "json");

    if (!storedOrder || typeof storedOrder !== "object") {
      return appendJsonResponseFields(response, result, {
        referralTracking: {
          success: false,
          code: validatedReferral.code,
          message:
            "The order was accepted, but its referral record could not be completed.",
        },
      });
    }

    try {
      const referralResponse = await partnerRegistryFetch(
        env,
        "/referral/record",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            code: validatedReferral.code,
            customerAccountId: sessionState.session.account.id,
            customerEmail:
              storedOrder.customer?.email ||
              sessionState.session.account.email ||
              "",            addressFingerprint:
              await createOrderAddressFingerprint(
                storedOrder,
                env
              ),
            orderSubtotal: Number(storedOrder.subtotal || 0),
            orderStatus:
              storedOrder.status || "Order Request Received",
            campaignSlug: validatedReferral.campaign?.slug || "",
            analyticsVisitorId: analyticsContext.visitorId,
            analyticsClickId: analyticsContext.clickId,
            analyticsChannel: analyticsContext.channel,
          }),
        }
      );

      const referralResult = await readInternalJsonResponse(referralResponse);
      const referral = toCustomerReferralRecord(referralResult.referral);

      storedOrder = await attachReferralToStoredOrder(
        env,
        storedOrder,
        referral
      );

      return appendJsonResponseFields(response, result, {
        order: storedOrder,
        referralTracking: {
          success: true,
          code: referral.partnerCode,
          status: referral.referralStatus,
          selfUse: Boolean(referral.isSelfUse),
          tierProgressEligible: Boolean(referral.tierProgressEligible),
          message: referral.isSelfUse
            ? "Your partner code was recorded for tier progression only. This order earns no commission."
            : "Referral code recorded. The order subtotal was not changed.",
          changesOrderTotal: false,
          discountAmount: 0,
          campaign: referral.campaignSlug
            ? {
                slug: referral.campaignSlug,
                title: referral.campaignTitle,
              }
            : null,
        },
      });
    } catch (referralError) {
      console.error(
        "The order succeeded, but referral tracking failed:",
        referralError
      );

      return appendJsonResponseFields(response, result, {
        referralTracking: {
          success: false,
          code: validatedReferral.code,
          message:
            "The order was accepted, but referral tracking needs administrator review.",
        },
      });
    }
  } catch (error) {
    console.error("Referral-aware order request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminOrderMutationWithReferralSync(
  request,
  env,
  context,
  url
) {
  const response = await coreWorker.fetch(request, env, context);

  if (!response.ok) {
    return response;
  }

  let result;

  try {
    result = await response.clone().json();
  } catch {
    return response;
  }

  if (!result?.success) {
    return response;
  }

  const encodedOrderId = url.pathname.slice("/api/admin/orders/".length);
  let orderId = "";

  try {
    orderId = decodeURIComponent(encodedOrderId).trim().toUpperCase();
  } catch {
    orderId = encodedOrderId.trim().toUpperCase();
  }

  if (!orderId) {
    return response;
  }

  const orderStatus =
    request.method === "DELETE"
      ? "Cancelled"
      : result.order?.status || result.record?.status || "";

  if (!orderStatus || !env.PARTNER_REGISTRY) {
    return response;
  }

  try {
    const registryResponse = await partnerRegistryFetch(
      env,
      "/referral/order-status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          orderStatus,
        }),
      }
    );

    const registryResult = await readInternalJsonResponse(registryResponse);

    return appendJsonResponseFields(response, result, {
      referralSync: {
        success: true,
        referral: registryResult.referral
          ? toAdminReferralRecord(registryResult.referral)
          : null,
        message: registryResult.message || "Referral status synchronized.",
      },
    });
  } catch (error) {
    console.error("Referral order-status synchronization failed:", error);

    return appendJsonResponseFields(response, result, {
      referralSync: {
        success: false,
        message:
          "The order was updated, but referral status synchronization needs review.",
      },
    });
  }
}

async function extractReferralContextFromOrderRequest(request) {
  const contentType = request.headers.get("Content-Type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return { code: "", campaignSlug: "" };
  }

  try {
    const payload = await request.clone().json();
    const submittedOrder = payload?.order || payload;

    return {
      code: cleanText(
        submittedOrder?.referralCode || payload?.referralCode,
        MAX_REFERRAL_CODE_LENGTH
      ).toUpperCase(),
      campaignSlug: normalizeOptionalCampaignSlug(
        submittedOrder?.campaignSlug ||
          submittedOrder?.referralCampaign ||
          payload?.campaignSlug ||
          payload?.referralCampaign
      ),
    };
  } catch {
    return { code: "", campaignSlug: "" };
  }
}

async function attachReferralToStoredOrder(env, order, referral) {
  const orderId = cleanText(order.orderId || order.id, 100).toUpperCase();

  if (!orderId) {
    return order;
  }

  const now = new Date().toISOString();
  const updatedOrder = {
    ...order,
    id: orderId,
    orderId,
    referralCode: referral.partnerCode,
    referralStatus: referral.referralStatus,
    referralCommissionRateBps: referral.commissionRateBps,
    referralCommissionAmountCents: referral.commissionAmountCents,
    referralCampaignSlug: referral.campaignSlug || "",
    referralCampaignTitle: referral.campaignTitle || "",
    referralAnalyticsChannel: referral.analyticsChannel || "untracked",
    referralAttachedAt: referral.createdAt || now,
    updatedAt: order.updatedAt || now,
  };

  await env.DOCUMENTS_KV.put(
    `${ORDER_KEY_PREFIX}${orderId}`,
    JSON.stringify(updatedOrder),
    {
      metadata: {
        orderId,
        status: cleanText(updatedOrder.status, 100),
        email: cleanText(
          updatedOrder.customer?.email,
          MAX_REFERRAL_CUSTOMER_EMAIL_LENGTH
        ).toLowerCase(),
        createdAt: updatedOrder.createdAt || "",
        updatedAt: updatedOrder.updatedAt || "",
        referralCode: referral.partnerCode,
        referralStatus: referral.referralStatus,
        referralCampaignSlug: referral.campaignSlug || "",
      },
    }
  );

  return updatedOrder;
}

function appendJsonResponseFields(response, existingBody, additionalFields) {
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.delete("Content-Length");

  return new Response(
    JSON.stringify({
      ...existingBody,
      ...additionalFields,
    }),
    {
      status: response.status,
      statusText: response.statusText,
      headers,
    }
  );
}

function normalizeCommissionRateBps(body) {
  let rate;

  if (body.commissionRateBps !== undefined) {
    rate = Number(body.commissionRateBps);
  } else {
    rate = Number(body.commissionRatePercent) * 100;
  }

  if (
    !Number.isInteger(rate) ||
    rate < 0 ||
    rate > MAX_COMMISSION_RATE_BPS
  ) {
    throw new ApiRequestError(
      "Commission rate must be between 0% and 50%, using no more than two decimal places.",
      400
    );
  }

  return rate;
}

function toCustomerReferralSummary(summary) {
  const source = summary && typeof summary === "object" ? summary : {};

  return {
    totalCount: Number(source.totalCount || 0),
    pendingCount: Number(source.pendingCount || 0),
    earnedCount: Number(source.earnedCount || 0),
    voidedCount: Number(source.voidedCount || 0),
    pendingCommissionCents: Number(source.pendingCommissionCents || 0),
    earnedCommissionCents: Number(source.earnedCommissionCents || 0),
    voidedCommissionCents: Number(source.voidedCommissionCents || 0),
    earnedRevenueCents: Number(source.earnedRevenueCents || 0),
    availableReferralCount: Number(source.availableReferralCount || 0),
    availableCommissionCents: Number(source.availableCommissionCents || 0),
    paidReferralCount: Number(source.paidReferralCount || 0),
    paidCommissionCents: Number(source.paidCommissionCents || 0),
    adjustmentRequiredCount: Number(source.adjustmentRequiredCount || 0),
    tierProgressOrderCount: Number(source.tierProgressOrderCount || 0),
    selfUseTierOrderCount: Number(source.selfUseTierOrderCount || 0),
    heldReferralCount: Number(
      source.heldReferralCount || 0
    ),
    heldCommissionCents: Number(
      source.heldCommissionCents || 0
    ),
    minimumPayoutCents: Number(source.minimumPayoutCents || 0),
    payoutEligible: Boolean(source.payoutEligible),
    amountUntilEligibleCents: Number(source.amountUntilEligibleCents || 0),
  };
}

function toCustomerReferralRecord(referral) {
  if (!referral || typeof referral !== "object") {
    return null;
  }

  return {
    orderId: cleanText(referral.orderId, 100),
    partnerCode: cleanText(referral.partnerCode, MAX_REFERRAL_CODE_LENGTH),
    orderSubtotalCents: Number(referral.orderSubtotalCents || 0),
    commissionRateBps: Number(referral.commissionRateBps || 0),
    commissionAmountCents: Number(referral.commissionAmountCents || 0),
    isSelfUse: Boolean(referral.isSelfUse),
    tierProgressEligible: Boolean(referral.tierProgressEligible),
    payoutHold: Boolean(referral.payoutHold),
    referralStatus: cleanText(referral.referralStatus || "pending", 30),
    commissionStatus: cleanText(
      referral.commissionStatus || referral.referralStatus || "pending",
      30
    ),
    orderStatus: cleanText(
      referral.orderStatus || "Order Request Received",
      100
    ),
    createdAt: referral.createdAt || "",
    updatedAt: referral.updatedAt || "",
    earnedAt: referral.earnedAt || "",
    voidedAt: referral.voidedAt || "",
    payoutId: cleanText(referral.payoutId, 100),
    payoutType: cleanText(referral.payoutType, 40),
    payoutMethod: cleanText(referral.payoutMethod, MAX_PAYOUT_METHOD_LENGTH),
    payoutPaidAt: referral.payoutPaidAt || "",
    campaignSlug: cleanText(
      referral.campaignSlug,
      MAX_CAMPAIGN_SLUG_LENGTH
    ).toLowerCase(),
    campaignTitle: cleanText(
      referral.campaignTitle,
      MAX_CAMPAIGN_TITLE_LENGTH
    ),
    analyticsChannel: normalizeAnalyticsChannel(
      referral.analyticsChannel || "untracked"
    ),
    requiresAdjustment: Boolean(referral.requiresAdjustment),
  };
}

function toAdminReferralRecord(referral) {
  if (!referral || typeof referral !== "object") {
    return null;
  }

  return {
    ...toCustomerReferralRecord(referral),
    partnerAccountId: cleanText(referral.partnerAccountId, 150),
    customerAccountId: cleanText(referral.customerAccountId, 150),
    customerEmail: cleanText(
      referral.customerEmail,
      MAX_REFERRAL_CUSTOMER_EMAIL_LENGTH
    ).toLowerCase(),
    payoutHoldReason: cleanMultilineText(
      referral.payoutHoldReason,
      5000
    ),
    payoutHoldAt: referral.payoutHoldAt || "",
    payoutHoldBy: cleanText(
      referral.payoutHoldBy,
      254
    ),
    partnerEmail: cleanText(
      referral.partnerEmail,
      MAX_REFERRAL_CUSTOMER_EMAIL_LENGTH
    ).toLowerCase(),
    partnerFirstName: cleanText(referral.partnerFirstName, 100),
    partnerLastName: cleanText(referral.partnerLastName, 100),
    payoutReferenceNumber: cleanText(
      referral.payoutReferenceNumber,
      MAX_PAYOUT_REFERENCE_LENGTH
    ),
    payoutCreatedAt: referral.payoutCreatedAt || "",
    campaignId: cleanText(referral.campaignId, MAX_CAMPAIGN_ID_LENGTH),
    analyticsClickId: cleanText(
      referral.analyticsClickId,
      MAX_ANALYTICS_CLICK_ID_LENGTH
    ),
  };
}

function toAdminRiskStatusCounts(counts) {
  const source =
    counts && typeof counts === "object"
      ? counts
      : {};

  return {
    new: Number(source.new || 0),
    reviewing: Number(source.reviewing || 0),
    cleared: Number(source.cleared || 0),
    confirmedAbuse: Number(
      source.confirmed_abuse ||
      source.confirmedAbuse ||
      0
    ),
  };
}

function toAdminRiskFlagRecord(flag) {
  if (!flag || typeof flag !== "object") {
    return null;
  }

  return {
    flagId: cleanText(flag.flagId, 120),
    orderId: cleanText(
      flag.orderId,
      100
    ).toUpperCase(),
    partnerAccountId: cleanText(
      flag.partnerAccountId,
      150
    ),
    partnerCode: cleanText(
      flag.partnerCode,
      MAX_REFERRAL_CODE_LENGTH
    ).toUpperCase(),
    customerAccountId: cleanText(
      flag.customerAccountId,
      150
    ),
    customerEmail: cleanText(
      flag.customerEmail,
      MAX_REFERRAL_CUSTOMER_EMAIL_LENGTH
    ).toLowerCase(),
    addressFingerprint: cleanText(
      flag.addressFingerprint,
      128
    ),
    flagType: cleanText(
      flag.flagType,
      80
    ),
    severity: cleanText(
      flag.severity,
      40
    ),
    status: cleanText(
      flag.status,
      40
    ),
    title: cleanText(
      flag.title,
      160
    ),
    summary: cleanMultilineText(
      flag.summary,
      2000
    ),
    source: cleanText(
      flag.source,
      40
    ),
    privateNotes: cleanMultilineText(
      flag.privateNotes,
      5000
    ),
    payoutHoldRecommended: Boolean(
      flag.payoutHoldRecommended
    ),
    createdAt: flag.createdAt || "",
    createdBy: cleanText(
      flag.createdBy,
      254
    ),
    updatedAt: flag.updatedAt || "",
    updatedBy: cleanText(
      flag.updatedBy,
      254
    ),
    resolvedAt: flag.resolvedAt || "",
    resolvedBy: cleanText(
      flag.resolvedBy,
      254
    ),
    history: Array.isArray(flag.history)
      ? flag.history
          .map(toAdminRiskFlagHistoryRecord)
          .filter(Boolean)
      : [],
  };
}

function toAdminRiskFlagHistoryRecord(history) {
  if (!history || typeof history !== "object") {
    return null;
  }

  return {
    historyId: cleanText(
      history.historyId,
      120
    ),
    flagId: cleanText(
      history.flagId,
      120
    ),
    action: cleanText(
      history.action,
      80
    ),
    previousStatus: cleanText(
      history.previousStatus,
      40
    ),
    nextStatus: cleanText(
      history.nextStatus,
      40
    ),
    note: cleanMultilineText(
      history.note,
      2000
    ),
    createdAt: history.createdAt || "",
    createdBy: cleanText(
      history.createdBy,
      254
    ),
  };
}

function toAdminReferralHoldHistoryRecord(history) {
  if (!history || typeof history !== "object") {
    return null;
  }

  return {
    historyId: cleanText(
      history.historyId,
      120
    ),
    orderId: cleanText(
      history.orderId,
      100
    ).toUpperCase(),
    previousHold: Boolean(
      history.previousHold
    ),
    nextHold: Boolean(
      history.nextHold
    ),
    reason: cleanMultilineText(
      history.reason,
      5000
    ),
    createdAt: history.createdAt || "",
    createdBy: cleanText(
      history.createdBy,
      254
    ),
  };
}
function toCustomerAnalyticsReport(report) {
  const source = report && typeof report === 'object' ? report : {};

  return {
    period: toAnalyticsPeriod(source.period),
    summary: toAnalyticsMetrics(source.summary),
    byCampaign: Array.isArray(source.byCampaign)
      ? source.byCampaign.map(toAnalyticsCampaignRow).filter(Boolean)
      : [],
    byChannel: Array.isArray(source.byChannel)
      ? source.byChannel.map(toAnalyticsChannelRow).filter(Boolean)
      : [],
    daily: Array.isArray(source.daily)
      ? source.daily.map(toAnalyticsDailyRow).filter(Boolean)
      : [],
  };
}

function toAdminAnalyticsReport(report) {
  const source = report && typeof report === 'object' ? report : {};

  return {
    ...toCustomerAnalyticsReport(source),
    filters: {
      partnerCode: cleanText(source.filters?.partnerCode, MAX_PARTNER_CODE_LENGTH),
      campaignSlug: normalizeOptionalCampaignSlug(
        source.filters?.campaignSlug
      ),
    },
    byPartner: Array.isArray(source.byPartner)
      ? source.byPartner.map(toAnalyticsPartnerRow).filter(Boolean)
      : [],
  };
}

function toAnalyticsPeriod(period) {
  const source = period && typeof period === 'object' ? period : {};

  return {
    key: normalizeAnalyticsPeriod(source.key),
    label: cleanText(source.label, 100),
    startAt: cleanText(source.startAt, 50),
    endAt: cleanText(source.endAt, 50),
  };
}

function toAnalyticsMetrics(metrics) {
  const source = metrics && typeof metrics === 'object' ? metrics : {};

  return {
    totalClicks: safeNonNegativeInteger(source.totalClicks),
    uniqueVisitors: safeNonNegativeInteger(source.uniqueVisitors),
    attributedOrders: safeNonNegativeInteger(source.attributedOrders),
    earnedOrders: safeNonNegativeInteger(source.earnedOrders),
    voidedOrders: safeNonNegativeInteger(source.voidedOrders),
    earnedRevenueCents: safeNonNegativeInteger(source.earnedRevenueCents),
    earnedCommissionCents: safeNonNegativeInteger(
      source.earnedCommissionCents
    ),
    conversionRateBps: Math.min(
      1_000_000,
      safeNonNegativeInteger(source.conversionRateBps)
    ),
  };
}

function toAnalyticsCampaignRow(row) {
  if (!row || typeof row !== 'object') return null;

  return {
    campaignSlug: normalizeOptionalCampaignSlug(row.campaignSlug),
    campaignTitle:
      cleanText(row.campaignTitle, MAX_CAMPAIGN_TITLE_LENGTH) ||
      'General Referral Link',
    ...toAnalyticsMetrics(row),
  };
}

function toAnalyticsChannelRow(row) {
  if (!row || typeof row !== 'object') return null;

  return {
    channel: normalizeAnalyticsChannel(row.channel || 'untracked'),
    ...toAnalyticsMetrics(row),
  };
}

function toAnalyticsDailyRow(row) {
  if (!row || typeof row !== 'object') return null;

  return {
    day: cleanText(row.day, 20),
    ...toAnalyticsMetrics(row),
  };
}

function toAnalyticsPartnerRow(row) {
  if (!row || typeof row !== 'object') return null;

  return {
    partnerCode: cleanText(row.partnerCode, MAX_PARTNER_CODE_LENGTH).toUpperCase(),
    ...toAnalyticsMetrics(row),
  };
}

function safeNonNegativeInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function toCustomerPayoutSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};

  return {
    minimumPayoutCents: Number(source.minimumPayoutCents || 0),
    updatedAt: source.updatedAt || "",
  };
}

function toAdminPayoutSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};

  return {
    ...toCustomerPayoutSettings(source),
    updatedBy: cleanText(source.updatedBy, 254),
  };
}

function toCustomerPayoutRecord(payout) {
  if (!payout || typeof payout !== "object") {
    return null;
  }

  const items = Array.isArray(payout.items)
    ? payout.items
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          return {
            orderId: cleanText(item.orderId, 100),
            commissionAmountCents: Number(
              item.commissionAmountCents || 0
            ),
            createdAt: item.createdAt || "",
          };
        })
        .filter(Boolean)
    : [];

  return {
    payoutId: cleanText(payout.payoutId, 100),
    partnerCode: cleanText(payout.partnerCode, MAX_REFERRAL_CODE_LENGTH),
    amountCents: Number(payout.amountCents || 0),
    referralCount: Number(payout.referralCount || items.length || 0),
    payoutType: cleanText(payout.payoutType, 40),
    paymentMethod: cleanText(payout.paymentMethod, MAX_PAYOUT_METHOD_LENGTH),
    partnerNote: cleanMultilineText(
      payout.partnerNote,
      MAX_PAYOUT_PARTNER_NOTE_LENGTH
    ),
    paidAt: payout.paidAt || "",
    createdAt: payout.createdAt || "",
    orderIds: Array.isArray(payout.orderIds)
      ? payout.orderIds.map((orderId) => cleanText(orderId, 100))
      : items.map((item) => item.orderId),
    items,
  };
}

function toAdminPayoutRecord(payout) {
  if (!payout || typeof payout !== "object") {
    return null;
  }

  return {
    ...toCustomerPayoutRecord(payout),
    partnerAccountId: cleanText(payout.partnerAccountId, 150),
    partnerEmail: cleanText(
      payout.partnerEmail,
      MAX_REFERRAL_CUSTOMER_EMAIL_LENGTH
    ).toLowerCase(),
    partnerFirstName: cleanText(payout.partnerFirstName, 100),
    partnerLastName: cleanText(payout.partnerLastName, 100),
    referenceNumber: cleanText(
      payout.referenceNumber,
      MAX_PAYOUT_REFERENCE_LENGTH
    ),
    adminNotes: cleanMultilineText(
      payout.adminNotes,
      MAX_PAYOUT_ADMIN_NOTES_LENGTH
    ),
    createdBy: cleanText(payout.createdBy, 254),
  };
}

function toCustomerCampaignRecord(campaign) {
  if (!campaign || typeof campaign !== "object") {
    return null;
  }

  return {
    campaignId: cleanText(campaign.campaignId, MAX_CAMPAIGN_ID_LENGTH),
    slug: normalizeOptionalCampaignSlug(campaign.slug),
    title: cleanText(campaign.title, MAX_CAMPAIGN_TITLE_LENGTH),
    summary: cleanMultilineText(campaign.summary, MAX_CAMPAIGN_SUMMARY_LENGTH),
    headline: cleanText(campaign.headline, MAX_CAMPAIGN_HEADLINE_LENGTH),
    facebookCopy: cleanMultilineText(
      campaign.facebookCopy,
      MAX_CAMPAIGN_COPY_LENGTH
    ),
    instagramCopy: cleanMultilineText(
      campaign.instagramCopy,
      MAX_CAMPAIGN_COPY_LENGTH
    ),
    tiktokCopy: cleanMultilineText(
      campaign.tiktokCopy,
      MAX_CAMPAIGN_COPY_LENGTH
    ),
    smsCopy: cleanMultilineText(campaign.smsCopy, MAX_CAMPAIGN_SMS_LENGTH),
    emailSubject: cleanText(
      campaign.emailSubject,
      MAX_CAMPAIGN_EMAIL_SUBJECT_LENGTH
    ),
    emailCopy: cleanMultilineText(
      campaign.emailCopy,
      MAX_CAMPAIGN_COPY_LENGTH
    ),
    imageUrl: safeOptionalHttpUrl(campaign.imageUrl, MAX_CAMPAIGN_URL_LENGTH),
    downloadUrl: safeOptionalHttpUrl(
      campaign.downloadUrl,
      MAX_CAMPAIGN_URL_LENGTH
    ),
    disclaimer: cleanMultilineText(
      campaign.disclaimer,
      MAX_CAMPAIGN_DISCLAIMER_LENGTH
    ),
    ctaLabel: cleanText(campaign.ctaLabel, MAX_CAMPAIGN_CTA_LENGTH),
    destinationPath: safeCampaignDestination(campaign.destinationPath),
    startsAt: campaign.startsAt || "",
    endsAt: campaign.endsAt || "",
    displayOrder: Number(campaign.displayOrder || 0),
    active: Boolean(campaign.active),
  };
}

function toAdminCampaignRecord(campaign) {
  if (!campaign || typeof campaign !== "object") {
    return null;
  }

  return {
    ...toCustomerCampaignRecord(campaign),
    status: safeCampaignStatus(campaign.status),
    createdAt: campaign.createdAt || "",
    createdBy: cleanText(campaign.createdBy, 254),
    updatedAt: campaign.updatedAt || "",
    updatedBy: cleanText(campaign.updatedBy, 254),
    publishedAt: campaign.publishedAt || "",
    publishedBy: cleanText(campaign.publishedBy, 254),
    archivedAt: campaign.archivedAt || "",
    archivedBy: cleanText(campaign.archivedBy, 254),
    referralCount: Number(campaign.referralCount || 0),
    earnedReferralCount: Number(campaign.earnedReferralCount || 0),
    earnedRevenueCents: Number(campaign.earnedRevenueCents || 0),
    earnedCommissionCents: Number(campaign.earnedCommissionCents || 0),
  };
}

function toLeaderboardPeriod(period) {
  if (!period || typeof period !== "object") {
    return null;
  }

  return {
    periodType: normalizeLeaderboardPeriodType(period.periodType || "monthly"),
    periodKey: cleanText(period.periodKey, 20),
    startAt: period.startAt || "",
    endAt: period.endAt || "",
    minimumReferrals: Number(period.minimumReferrals || 0),
    metric: LEADERBOARD_METRICS.has(String(period.metric || "").toLowerCase())
      ? String(period.metric).toLowerCase()
      : "commission",
  };
}

function toCustomerLeaderboardSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};

  return {
    leaderboardMetric: LEADERBOARD_METRICS.has(
      String(source.leaderboardMetric || "").toLowerCase()
    )
      ? String(source.leaderboardMetric).toLowerCase()
      : "commission",
    monthlyRewardEnabled: Boolean(source.monthlyRewardEnabled),
    monthlyRewardType: safeRewardType(source.monthlyRewardType),
    monthlyRewardAmountCents: Number(source.monthlyRewardAmountCents || 0),
    monthlyMinimumReferrals: Number(source.monthlyMinimumReferrals || 1),
    quarterlyRewardEnabled: Boolean(source.quarterlyRewardEnabled),
    quarterlyRewardType: safeRewardType(source.quarterlyRewardType),
    quarterlyRewardAmountCents: Number(source.quarterlyRewardAmountCents || 0),
    quarterlyRewardDescription: cleanText(
      source.quarterlyRewardDescription,
      MAX_REWARD_DESCRIPTION_LENGTH
    ),
    quarterlyMinimumReferrals: Number(source.quarterlyMinimumReferrals || 1),
  };
}

function toAdminLeaderboardSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};

  return {
    ...toCustomerLeaderboardSettings(source),
    updatedAt: source.updatedAt || "",
    updatedBy: cleanText(source.updatedBy, 254),
  };
}

function toCustomerLeaderboardEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    rank: Number(entry.rank || 0),
    partnerCode: cleanText(entry.partnerCode, MAX_PARTNER_CODE_LENGTH),
    referralCount: Number(entry.referralCount || 0),
    eligible: Boolean(entry.eligible),
  };
}

function toCustomerOwnLeaderboardEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    ...toCustomerLeaderboardEntry(entry),
    revenueCents: Number(entry.revenueCents || 0),
    commissionCents: Number(entry.commissionCents || 0),
    score: Number(entry.score || 0),
    metric: LEADERBOARD_METRICS.has(String(entry.metric || "").toLowerCase())
      ? String(entry.metric).toLowerCase()
      : "commission",
  };
}

function toAdminLeaderboardEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    ...toCustomerOwnLeaderboardEntry(entry),
    accountId: cleanText(entry.accountId, 150),
    partnerEmail: cleanText(
      entry.partnerEmail,
      MAX_REFERRAL_CUSTOMER_EMAIL_LENGTH
    ).toLowerCase(),
    partnerFirstName: cleanText(entry.partnerFirstName, 100),
    partnerLastName: cleanText(entry.partnerLastName, 100),
    firstEarnedAt: entry.firstEarnedAt || "",
    lastEarnedAt: entry.lastEarnedAt || "",
  };
}

function toCustomerRewardRecord(reward) {
  if (!reward || typeof reward !== "object") {
    return null;
  }

  return {
    rewardId: cleanText(reward.rewardId, MAX_REWARD_ID_LENGTH),
    periodType: safeLeaderboardPeriodType(reward.periodType),
    periodKey: cleanText(reward.periodKey, 20),
    partnerCode: cleanText(reward.partnerCode, MAX_PARTNER_CODE_LENGTH),
    leaderboardMetric: LEADERBOARD_METRICS.has(
      String(reward.leaderboardMetric || "").toLowerCase()
    )
      ? String(reward.leaderboardMetric).toLowerCase()
      : "commission",
    rank: Number(reward.rank || 0),
    referralCount: Number(reward.referralCount || 0),
    rewardType: safeRewardType(reward.rewardType),
    rewardAmountCents: Number(reward.rewardAmountCents || 0),
    rewardDescription: cleanText(
      reward.rewardDescription,
      MAX_REWARD_DESCRIPTION_LENGTH
    ),
    status: cleanText(reward.status || "awarded", 30).toLowerCase(),
    awardedAt: reward.awardedAt || "",
    issuedAt: reward.issuedAt || "",
    deliveryMethod: cleanText(
      reward.deliveryMethod,
      MAX_REWARD_DELIVERY_METHOD_LENGTH
    ),
    partnerNote: cleanMultilineText(
      reward.partnerNote,
      MAX_REWARD_PARTNER_NOTE_LENGTH
    ),
  };
}

function toAdminRewardRecord(reward) {
  if (!reward || typeof reward !== "object") {
    return null;
  }

  return {
    ...toCustomerRewardRecord(reward),
    partnerAccountId: cleanText(reward.partnerAccountId, 150),
    partnerEmail: cleanText(
      reward.partnerEmail,
      MAX_REFERRAL_CUSTOMER_EMAIL_LENGTH
    ).toLowerCase(),
    partnerFirstName: cleanText(reward.partnerFirstName, 100),
    partnerLastName: cleanText(reward.partnerLastName, 100),
    revenueCents: Number(reward.revenueCents || 0),
    commissionCents: Number(reward.commissionCents || 0),
    awardedBy: cleanText(reward.awardedBy, 254),
    issuedBy: cleanText(reward.issuedBy, 254),
    referenceNumber: cleanText(
      reward.referenceNumber,
      MAX_REWARD_REFERENCE_LENGTH
    ),
    adminNotes: cleanMultilineText(
      reward.adminNotes,
      MAX_REWARD_ADMIN_NOTES_LENGTH
    ),
  };
}

function normalizeCampaignSaveRequest(body) {
  const campaignId = cleanText(body.campaignId, MAX_CAMPAIGN_ID_LENGTH);
  const startsAt = normalizeOptionalCampaignDate(body.startsAt);
  const endsAt = normalizeOptionalCampaignDate(body.endsAt);

  if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new ApiRequestError(
      "The campaign end date must be later than the start date.",
      400
    );
  }

  return {
    campaignId,
    slug: validateCampaignSlug(body.slug),
    title: requireCampaignText(
      body.title,
      MAX_CAMPAIGN_TITLE_LENGTH,
      "A campaign title is required."
    ),
    summary: cleanMultilineText(body.summary, MAX_CAMPAIGN_SUMMARY_LENGTH),
    headline: cleanText(body.headline, MAX_CAMPAIGN_HEADLINE_LENGTH),
    facebookCopy: cleanMultilineText(
      body.facebookCopy,
      MAX_CAMPAIGN_COPY_LENGTH
    ),
    instagramCopy: cleanMultilineText(
      body.instagramCopy,
      MAX_CAMPAIGN_COPY_LENGTH
    ),
    tiktokCopy: cleanMultilineText(body.tiktokCopy, MAX_CAMPAIGN_COPY_LENGTH),
    smsCopy: cleanMultilineText(body.smsCopy, MAX_CAMPAIGN_SMS_LENGTH),
    emailSubject: cleanText(
      body.emailSubject,
      MAX_CAMPAIGN_EMAIL_SUBJECT_LENGTH
    ),
    emailCopy: cleanMultilineText(body.emailCopy, MAX_CAMPAIGN_COPY_LENGTH),
    imageUrl: normalizeOptionalCampaignHttpUrl(body.imageUrl, "campaign image"),
    downloadUrl: normalizeOptionalCampaignHttpUrl(
      body.downloadUrl,
      "campaign download"
    ),
    disclaimer: cleanMultilineText(
      body.disclaimer,
      MAX_CAMPAIGN_DISCLAIMER_LENGTH
    ),
    ctaLabel: cleanText(body.ctaLabel, MAX_CAMPAIGN_CTA_LENGTH),
    destinationPath: normalizeCampaignDestination(body.destinationPath),
    startsAt,
    endsAt,
    displayOrder: normalizeCampaignDisplayOrder(body.displayOrder),
  };
}

function validateCampaignSlug(value) {
  const slug = cleanText(value, MAX_CAMPAIGN_SLUG_LENGTH).toLowerCase();

  if (slug.length < 3 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new ApiRequestError(
      "Campaign slugs must contain 3–60 lowercase letters, numbers, or single hyphens.",
      400
    );
  }

  return slug;
}

function normalizeOptionalCampaignSlug(value) {
  const cleaned = cleanText(value, MAX_CAMPAIGN_SLUG_LENGTH).toLowerCase();
  return cleaned ? validateCampaignSlug(cleaned) : "";
}

function normalizeCampaignStatus(value) {
  const status = cleanText(value, 30).toLowerCase();

  if (!CAMPAIGN_STATUSES.has(status)) {
    throw new ApiRequestError("Choose draft, published, or archived.", 400);
  }

  return status;
}

function safeCampaignStatus(value) {
  const status = cleanText(value, 30).toLowerCase();
  return CAMPAIGN_STATUSES.has(status) ? status : "draft";
}

function normalizeOptionalCampaignDate(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw new ApiRequestError("A campaign date is invalid.", 400);
  }

  return parsed.toISOString();
}

function normalizeOptionalCampaignHttpUrl(value, label) {
  const cleaned = cleanText(value, MAX_CAMPAIGN_URL_LENGTH);

  if (!cleaned) {
    return "";
  }

  let parsed;

  try {
    parsed = new URL(cleaned);
  } catch {
    throw new ApiRequestError(`Enter a complete ${label} URL.`, 400);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ApiRequestError(
      `The ${label} URL must use HTTP or HTTPS.`,
      400
    );
  }

  return parsed.toString().slice(0, MAX_CAMPAIGN_URL_LENGTH);
}

function safeOptionalHttpUrl(value, maximumLength) {
  const cleaned = cleanText(value, maximumLength);

  if (!cleaned) {
    return "";
  }

  try {
    const parsed = new URL(cleaned);
    return ["http:", "https:"].includes(parsed.protocol)
      ? parsed.toString().slice(0, maximumLength)
      : "";
  } catch {
    return "";
  }
}

function normalizeCampaignDestination(value) {
  const destination = cleanText(
    value || "/checkout",
    MAX_CAMPAIGN_DESTINATION_LENGTH
  );

  if (!destination.startsWith("/") || destination.startsWith("//")) {
    throw new ApiRequestError(
      "The campaign destination must be an internal path beginning with one slash.",
      400
    );
  }

  return destination;
}

function safeCampaignDestination(value) {
  const destination = cleanText(
    value || "/checkout",
    MAX_CAMPAIGN_DESTINATION_LENGTH
  );
  return destination.startsWith("/") && !destination.startsWith("//")
    ? destination
    : "/checkout";
}

function normalizeCampaignDisplayOrder(value) {
  const order = Number(value ?? 0);

  if (!Number.isInteger(order) || order < -1000 || order > 1000) {
    throw new ApiRequestError(
      "Campaign display order must be a whole number from -1000 to 1000.",
      400
    );
  }

  return order;
}

function requireCampaignText(value, maximumLength, message) {
  const cleaned = cleanText(value, maximumLength);

  if (!cleaned) {
    throw new ApiRequestError(message, 400);
  }

  return cleaned;
}

function normalizeLeaderboardSettingsRequest(body) {
  const leaderboardMetric = cleanText(body.leaderboardMetric, 30).toLowerCase();

  if (!LEADERBOARD_METRICS.has(leaderboardMetric)) {
    throw new ApiRequestError(
      "Choose commission, revenue, or referrals as the leaderboard metric.",
      400
    );
  }

  return {
    leaderboardMetric,
    monthlyRewardEnabled: normalizeRequestBoolean(
      body.monthlyRewardEnabled,
      true
    ),
    monthlyRewardType: normalizeRewardType(body.monthlyRewardType),
    monthlyRewardAmountCents: normalizeRequiredRewardAmountCents(
      body,
      "monthlyRewardAmountCents",
      "monthlyRewardAmountDollars"
    ),
    monthlyMinimumReferrals: normalizeLeaderboardMinimumReferrals(
      body.monthlyMinimumReferrals
    ),
    quarterlyRewardEnabled: normalizeRequestBoolean(
      body.quarterlyRewardEnabled,
      true
    ),
    quarterlyRewardType: normalizeRewardType(body.quarterlyRewardType),
    quarterlyRewardAmountCents: normalizeRequiredRewardAmountCents(
      body,
      "quarterlyRewardAmountCents",
      "quarterlyRewardAmountDollars"
    ),
    quarterlyRewardDescription: cleanText(
      body.quarterlyRewardDescription,
      MAX_REWARD_DESCRIPTION_LENGTH
    ),
    quarterlyMinimumReferrals: normalizeLeaderboardMinimumReferrals(
      body.quarterlyMinimumReferrals
    ),
  };
}

function normalizeLeaderboardPeriodType(value) {
  const periodType = cleanText(value, 20).toLowerCase();

  if (!LEADERBOARD_PERIOD_TYPES.has(periodType)) {
    throw new ApiRequestError(
      "Choose monthly or quarterly leaderboard data.",
      400
    );
  }

  return periodType;
}

function safeLeaderboardPeriodType(value) {
  const periodType = cleanText(value, 20).toLowerCase();
  return LEADERBOARD_PERIOD_TYPES.has(periodType) ? periodType : "monthly";
}

function normalizeOptionalLeaderboardPeriodKey(periodType, value) {
  const cleaned = cleanText(value, 20).toUpperCase();
  return cleaned ? validateLeaderboardPeriodKey(periodType, cleaned) : "";
}

function normalizeRequiredLeaderboardPeriodKey(periodType, value) {
  const cleaned = cleanText(value, 20).toUpperCase();

  if (!cleaned) {
    throw new ApiRequestError("A leaderboard period is required.", 400);
  }

  return validateLeaderboardPeriodKey(periodType, cleaned);
}

function validateLeaderboardPeriodKey(periodType, periodKey) {
  const pattern =
    periodType === "monthly"
      ? /^\d{4}-(0[1-9]|1[0-2])$/
      : /^\d{4}-Q[1-4]$/;

  if (!pattern.test(periodKey)) {
    throw new ApiRequestError(
      periodType === "monthly"
        ? "The monthly period must use YYYY-MM format."
        : "The quarterly period must use YYYY-Q1 through YYYY-Q4 format.",
      400
    );
  }

  return periodKey;
}

function normalizeRewardType(value) {
  const rewardType = cleanText(value, 40).toLowerCase();

  if (!REWARD_TYPES.has(rewardType)) {
    throw new ApiRequestError(
      "Choose cash, store credit, or swag as the reward type.",
      400
    );
  }

  return rewardType;
}

function safeRewardType(value) {
  const rewardType = cleanText(value, 40).toLowerCase();
  return REWARD_TYPES.has(rewardType) ? rewardType : "store_credit";
}

function normalizeOptionalRewardAmountCents(body) {
  if (body.rewardAmountCents !== undefined) {
    return validateRewardAmountCents(Number(body.rewardAmountCents));
  }

  if (body.rewardAmountDollars !== undefined) {
    return validateRewardAmountCents(
      Math.round(Number(body.rewardAmountDollars) * 100)
    );
  }

  return undefined;
}

function normalizeRequiredRewardAmountCents(body, centsField, dollarsField) {
  const value =
    body[centsField] !== undefined
      ? Number(body[centsField])
      : Math.round(Number(body[dollarsField]) * 100);

  return validateRewardAmountCents(value);
}

function validateRewardAmountCents(value) {
  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_REWARD_AMOUNT_CENTS
  ) {
    throw new ApiRequestError(
      "Reward amount must be between $0 and $10,000, using no more than two decimal places.",
      400
    );
  }

  return value;
}

function normalizeLeaderboardMinimumReferrals(value) {
  const minimum = Number(value);

  if (
    !Number.isInteger(minimum) ||
    minimum < 1 ||
    minimum > MAX_LEADERBOARD_MINIMUM_REFERRALS
  ) {
    throw new ApiRequestError(
      "The minimum qualifying referrals must be a whole number from 1 to 1,000.",
      400
    );
  }

  return minimum;
}

function normalizeRequestBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function normalizePayoutThresholdCents(body) {
  let threshold;

  if (body.minimumPayoutCents !== undefined) {
    threshold = Number(body.minimumPayoutCents);
  } else {
    threshold = Math.round(Number(body.minimumPayoutDollars) * 100);
  }

  if (
    !Number.isInteger(threshold) ||
    threshold < 0 ||
    threshold > MAX_PAYOUT_THRESHOLD_CENTS
  ) {
    throw new ApiRequestError(
      "The payout threshold must be between $0 and $10,000, using no more than two decimal places.",
      400
    );
  }

  return threshold;
}

function normalizeOptionalPayoutDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new ApiRequestError("The payout date is invalid.", 400);
  }

  return date.toISOString();
}

function normalizePayoutOrderIds(value) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value) || value.length > MAX_PAYOUT_ORDER_IDS) {
    throw new ApiRequestError(
      "The selected payout referrals are invalid.",
      400
    );
  }

  return Array.from(
    new Set(
      value.map((orderId) => {
        const normalized = cleanText(orderId, 100).toUpperCase();

        if (
          !normalized ||
          !/^[A-Z0-9][A-Z0-9-]{2,99}$/.test(normalized)
        ) {
          throw new ApiRequestError(
            "One or more selected order numbers are invalid.",
            400
          );
        }

        return normalized;
      })
    )
  );
}

function getAdminIdentity(request) {
  return cleanText(
    request.headers.get("Cf-Access-Authenticated-User-Email") ||
      request.headers.get("CF-Access-Authenticated-User-Email") ||
      "authorized administrator",
    254
  );
}

async function requireEligibleCustomerSession(request, env) {
  const sessionState = await inspectCustomerSession(request, env);

  if (!sessionState.session) {
    throw new ApiRequestError("Customer authentication is required.", 401);
  }

  if (sessionState.session.account.mustChangePassword) {
    throw new ApiRequestError(
      "Change your temporary password before accessing Partner Program tools.",
      403
    );
  }

  return sessionState;
}

async function getRegistryApplication(env, accountId) {
  const registryResponse = await partnerRegistryFetch(
    env,
    `/application?accountId=${encodeURIComponent(accountId)}`,
    { method: "GET" }
  );

  const result = await readInternalJsonResponse(registryResponse);
  return result.application || null;
}

async function createOrderAddressFingerprint(
  order,
  env
) {
  const source =
    order && typeof order === "object"
      ? order
      : {};

  const customer =
    source.customer &&
    typeof source.customer === "object"
      ? source.customer
      : {};

  const parts = [
    customer.address || source.address || "",
    customer.city || source.city || "",
    customer.state || source.state || "",
    customer.zip ||
      customer.postalCode ||
      source.zip ||
      source.postalCode ||
      "",
  ].map(normalizeAddressFingerprintPart);

  if (parts.join("").length < 8) {
    return "";
  }

  const normalizedAddress = parts.join("|");
  const secret = String(
    env?.ORDER_API_SECRET || ""
  );

  if (!secret) {
    return "";
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(
      normalizedAddress
    )
  );

  return Array.from(
    new Uint8Array(signature),
    (byte) =>
      byte.toString(16).padStart(2, "0")
  ).join("");
}

function normalizeAddressFingerprintPart(value) {
  return String(value == null ? "" : value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 250);
}
async function partnerRegistryFetch(env, pathname, init) {
  const id = env.PARTNER_REGISTRY.idFromName(PARTNER_REGISTRY_NAME);
  const stub = env.PARTNER_REGISTRY.get(id);

  return stub.fetch(
    new Request(`https://partner-registry.internal${pathname}`, init)
  );
}

async function readInternalJsonResponse(response) {
  let result;

  try {
    result = await response.json();
  } catch {
    throw new ApiRequestError(
      "The partner registry returned an invalid response.",
      503
    );
  }

  if (!response.ok || !result?.success) {
    throw new ApiRequestError(
      result?.error || "The partner registry request could not be completed.",
      response.status >= 400 ? response.status : 503
    );
  }

  return result;
}

async function customerHasStoredOrder(env, accountId) {
  let cursor = "";
  let listComplete = false;

  while (!listComplete) {
    const options = {
      prefix: ORDER_KEY_PREFIX,
      limit: 1000,
    };

    if (cursor) {
      options.cursor = cursor;
    }

    const page = await env.DOCUMENTS_KV.list(options);
    const keys = Array.isArray(page.keys)
      ? page.keys.map((key) => key.name)
      : [];

    for (let index = 0; index < keys.length; index += 100) {
      const batch = keys.slice(index, index + 100);
      const records = await env.DOCUMENTS_KV.get(batch, { type: "json" });

      for (const key of batch) {
        const order = records.get(key);

        if (cleanText(order?.customerAccountId, 150) === accountId) {
          return true;
        }
      }
    }

    listComplete = page.list_complete === true;
    cursor = page.cursor || "";

    if (!listComplete && !cursor) {
      throw new ApiRequestError(
        "Partner eligibility could not be verified.",
        503
      );
    }
  }

  return false;
}

function validatePartnerCode(value) {
  const code = cleanText(value, MAX_PARTNER_CODE_LENGTH).toUpperCase();

  if (
    code.length < MIN_PARTNER_CODE_LENGTH ||
    code.length > MAX_PARTNER_CODE_LENGTH
  ) {
    throw new ApiRequestError(
      `Partner codes must contain ${MIN_PARTNER_CODE_LENGTH}–${MAX_PARTNER_CODE_LENGTH} characters.`,
      400
    );
  }

  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)) {
    throw new ApiRequestError(
      "Partner codes may contain uppercase letters, numbers, and single hyphens only.",
      400
    );
  }

  if (!/[A-Z]/.test(code)) {
    throw new ApiRequestError(
      "Partner codes must contain at least one letter.",
      400
    );
  }

  if (
    RESERVED_PARTNER_CODES.has(code) ||
    /^(ADMIN|SUPPORT|STAFF|OFFICIAL)(-|$)/.test(code) ||
    code.includes("304PEPTIDES")
  ) {
    throw new ApiRequestError(
      "That partner code is reserved. Choose a different code.",
      400
    );
  }

  return code;
}

function validateOptionalHttpUrl(value, maximumLength) {
  const cleaned = cleanText(value, maximumLength);

  if (!cleaned) {
    return "";
  }

  let parsed;

  try {
    parsed = new URL(cleaned);
  } catch {
    throw new ApiRequestError(
      "Enter a complete profile URL beginning with http:// or https://.",
      400
    );
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ApiRequestError(
      "The profile URL must use http:// or https://.",
      400
    );
  }

  return parsed.toString().slice(0, maximumLength);
}

function getPartnerCodeRules() {
  return {
    minimumLength: MIN_PARTNER_CODE_LENGTH,
    maximumLength: MAX_PARTNER_CODE_LENGTH,
    allowedCharacters: "Uppercase letters, numbers, and single hyphens",
    customerSelected: true,
    unique: true,
    caseInsensitive: true,
  };
}

function toCustomerPartnerApplication(application) {
  if (!application || typeof application !== "object") {
    return null;
  }

  return {
    accountId: cleanText(application.accountId, 150),
    code: cleanText(application.code, MAX_PARTNER_CODE_LENGTH),
    status: cleanText(application.status || "pending", 30),
    primaryPlatform: cleanText(
      application.primaryPlatform,
      MAX_PARTNER_PLATFORM_LENGTH
    ),
    profileUrl: cleanText(
      application.profileUrl,
      MAX_PARTNER_PROFILE_URL_LENGTH
    ),
    audienceSize: cleanText(
      application.audienceSize,
      MAX_PARTNER_AUDIENCE_LENGTH
    ),
    promotionPlan: cleanMultilineText(
      application.promotionPlan,
      MAX_PARTNER_PROMOTION_PLAN_LENGTH
    ),
    experience: cleanMultilineText(
      application.experience,
      MAX_PARTNER_EXPERIENCE_LENGTH
    ),
    submittedAt: application.submittedAt || "",
    updatedAt: application.updatedAt || "",
    reviewedAt: application.reviewedAt || "",
    customerMessage: cleanMultilineText(
      application.customerMessage,
      MAX_PARTNER_CUSTOMER_MESSAGE_LENGTH
    ),
    deniedAt: application.deniedAt || "",
    suspendedAt: application.suspendedAt || "",
    reactivatedAt: application.reactivatedAt || "",
    applicationNumber: Number(application.applicationNumber || 1),
    agreementVersion: cleanText(application.agreementVersion, 50),
    commissionRateBps: Number(application.commissionRateBps || 0),
  };
}

function toAdminPartnerApplication(application) {
  if (!application || typeof application !== "object") {
    return null;
  }

  return {
    ...toCustomerPartnerApplication(application),
    email: cleanText(application.email, 254).toLowerCase(),
    firstName: cleanText(application.firstName, 100),
    lastName: cleanText(application.lastName, 100),
    agreementAcceptedAt: application.agreementAcceptedAt || "",
    agreementVersion: cleanText(application.agreementVersion, 50),
    commissionRateBps: Number(application.commissionRateBps || 0),
    reviewedBy: cleanText(application.reviewedBy, 254),
    adminNotes: cleanMultilineText(
      application.adminNotes,
      MAX_PARTNER_ADMIN_NOTES_LENGTH
    ),
    lastStatusChangeAt: application.lastStatusChangeAt || "",
  };
}

async function handleAdminPartnerCampaignsRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    await requireAdminAuthorization(request, env);

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/campaigns",
      { method: "GET" }
    );
    const result = await readInternalJsonResponse(registryResponse);
    const campaigns = Array.isArray(result.campaigns)
      ? result.campaigns.map(toAdminCampaignRecord).filter(Boolean)
      : [];

    return jsonResponse({
      success: true,
      campaigns,
      records: campaigns,
      count: campaigns.length,
    });
  } catch (error) {
    console.error("Admin partner campaigns request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminSaveCampaignRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await requireAdminAuthorization(request, env);
    await enforceAuthenticationRateLimit(request, env, "partner-campaign-save");

    const body = await readJsonRequest(request, MAX_CAMPAIGN_REQUEST_LENGTH);
    const payload = normalizeCampaignSaveRequest(body);
    payload.updatedBy = getAdminIdentity(request);

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/campaigns/save",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse(
      {
        success: true,
        campaign: toAdminCampaignRecord(result.campaign),
        message:
          result.message || "The marketing campaign draft was saved.",
      },
      result.campaign?.createdAt === result.campaign?.updatedAt ? 201 : 200
    );
  } catch (error) {
    console.error("Admin save campaign request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminCampaignStatusRequest(request, env) {
  try {
    validatePartnerEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await requireAdminAuthorization(request, env);
    await enforceAuthenticationRateLimit(request, env, "partner-campaign-status");

    const body = await readJsonRequest(request, MAX_AUTH_REQUEST_LENGTH);
    const campaignId = cleanText(body.campaignId, MAX_CAMPAIGN_ID_LENGTH);
    const status = normalizeCampaignStatus(body.status);

    if (!campaignId) {
      throw new ApiRequestError("A campaign ID is required.", 400);
    }

    const registryResponse = await partnerRegistryFetch(
      env,
      "/admin/campaigns/status",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          status,
          changedBy: getAdminIdentity(request),
        }),
      }
    );
    const result = await readInternalJsonResponse(registryResponse);

    return jsonResponse({
      success: true,
      campaign: toAdminCampaignRecord(result.campaign),
      message: result.message || "The marketing campaign status was updated.",
    });
  } catch (error) {
    console.error("Admin campaign status request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminAccountDirectoryRequest(request, env) {
  try {
    validateEnvironment(env);

    if (request.method !== "GET") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    await requireAdminAuthorization(request, env);

    const records = await listCustomerAccounts(env);

    return jsonResponse({
      success: true,
      records,
      accounts: records,
      count: records.length,
    });
  } catch (error) {
    console.error("Admin account directory request error:", error);
    return handleApiError(error);
  }
}

async function listCustomerAccounts(env) {
  const accountKeys = [];
  let cursor = "";
  let listComplete = false;

  while (!listComplete) {
    const options = {
      prefix: ACCOUNT_KEY_PREFIX,
      limit: 1000,
    };

    if (cursor) {
      options.cursor = cursor;
    }

    const page = await env.DOCUMENTS_KV.list(options);

    accountKeys.push(
      ...(Array.isArray(page.keys) ? page.keys.map((key) => key.name) : [])
    );

    listComplete = page.list_complete === true;
    cursor = page.cursor || "";

    if (!listComplete && !cursor) {
      throw new ApiRequestError(
        "The customer account directory could not be fully paginated.",
        503
      );
    }
  }

  const accounts = [];

  for (let index = 0; index < accountKeys.length; index += 100) {
    const batch = accountKeys.slice(index, index + 100);

    if (batch.length === 0) {
      continue;
    }

    const values = await env.DOCUMENTS_KV.get(batch, {
      type: "json",
    });

    for (const key of batch) {
      const account = values.get(key);

      if (account && typeof account === "object") {
        accounts.push(toAdminAccountSummary(account));
      }
    }
  }

  return accounts.sort((left, right) => {
    const leftDate = String(left.createdAt || left.updatedAt || "");
    const rightDate = String(right.createdAt || right.updatedAt || "");

    return rightDate.localeCompare(leftDate);
  });
}

async function handleAdminAccountControlRequest(request, env) {
  try {
    validateEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await requireAdminAuthorization(request, env);
    await enforceAuthenticationRateLimit(
      request,
      env,
      "admin-account-control"
    );

    const body = await readJsonRequest(
      request,
      MAX_AUTH_REQUEST_LENGTH
    );
    const email = normalizeAccountEmail(body.email);
    const action = cleanText(body.action, 40).toLowerCase();
    const reason = cleanText(
      body.reason,
      MAX_ACCOUNT_CONTROL_REASON_LENGTH
    );

    if (
      !["suspend", "reactivate", "revoke-sessions"].includes(action)
    ) {
      throw new ApiRequestError("Choose a valid account action.", 400);
    }

    const accountKey = await getAccountKey(email);
    const account = await env.DOCUMENTS_KV.get(accountKey, "json");

    if (!account || typeof account !== "object") {
      throw new ApiRequestError(
        "No customer account was found for that email address.",
        404
      );
    }

    const now = new Date().toISOString();
    let updatedAccount;
    let message;

    if (action === "suspend") {
      if (!reason) {
        throw new ApiRequestError(
          "Enter a private reason before suspending the account.",
          400
        );
      }

      updatedAccount = {
        ...account,
        status: "suspended",
        suspensionReason: reason,
        suspendedAt:
          account.status === "suspended" && account.suspendedAt
            ? account.suspendedAt
            : now,
        accountStatusChangedAt: now,
        sessionVersion: getAccountSessionVersion(account) + 1,
        lastSessionRevokedAt: now,
        lastSessionRevocationReason: "Account suspended by administrator.",
        updatedAt: now,
      };

      message =
        account.status === "suspended"
          ? "The suspension reason was updated and all customer sessions were revoked."
          : "The account was suspended and all customer sessions were revoked.";
    } else if (action === "reactivate") {
      if (account.status !== "suspended") {
        throw new ApiRequestError(
          "Only a suspended account can be reactivated.",
          409
        );
      }

      updatedAccount = {
        ...account,
        status: "active",
        lastSuspensionReason:
          account.suspensionReason || account.lastSuspensionReason || "",
        lastSuspendedAt:
          account.suspendedAt || account.lastSuspendedAt || "",
        suspensionReason: "",
        suspendedAt: "",
        reactivatedAt: now,
        accountStatusChangedAt: now,
        sessionVersion: getAccountSessionVersion(account) + 1,
        lastSessionRevokedAt: now,
        lastSessionRevocationReason: "Account reactivated by administrator.",
        updatedAt: now,
      };

      message =
        "The account was reactivated. Previous sessions remain invalid, so the customer must log in again.";
    } else {
      updatedAccount = {
        ...account,
        sessionVersion: getAccountSessionVersion(account) + 1,
        lastSessionRevokedAt: now,
        lastSessionRevocationReason:
          reason || "Sessions revoked by administrator.",
        updatedAt: now,
      };

      message =
        "All existing customer sessions were revoked. The account password was not changed.";
    }

    await putAccountRecord(env, accountKey, updatedAccount);

    return jsonResponse({
      success: true,
      action,
      account: toAdminAccountSummary(updatedAccount),
      message,
    });
  } catch (error) {
    console.error("Admin account control request error:", error);
    return handleApiError(error);
  }
}

async function handleAdminPasswordResetRequest(request, env) {
  try {
    validateEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await requireAdminAuthorization(request, env);
    await enforceAuthenticationRateLimit(
      request,
      env,
      "admin-password-reset"
    );

    const body = await readJsonRequest(
      request,
      MAX_AUTH_REQUEST_LENGTH
    );

    const email = normalizeAccountEmail(body.email);
    const accountKey = await getAccountKey(email);
    const account = await env.DOCUMENTS_KV.get(accountKey, "json");

    if (!account || account.status !== "active") {
      throw new ApiRequestError(
        "No active customer account was found for that email address.",
        404
      );
    }

    const temporaryPassword = createTemporaryPassword(20);
    const salt = randomBytes(16);
    const passwordHash = await derivePasswordHash(
      temporaryPassword,
      salt
    );
    const now = new Date().toISOString();

    const updatedAccount = {
      ...account,
      passwordHash: bytesToBase64Url(passwordHash),
      passwordSalt: bytesToBase64Url(salt),
      passwordIterations: PASSWORD_HASH_ITERATIONS,
      mustChangePassword: true,
      temporaryPasswordIssuedAt: now,
      passwordChangedAt: now,
      sessionVersion: getAccountSessionVersion(account) + 1,
      updatedAt: now,
    };

    await putAccountRecord(env, accountKey, updatedAccount);

    return jsonResponse({
      success: true,
      email: updatedAccount.email,
      temporaryPassword,
      issuedAt: now,
      requiresPasswordChange: true,
      account: toAdminAccountSummary(updatedAccount),
      message:
        "A temporary password was created. Existing sessions were invalidated, and the customer must change the password after logging in.",
    });
  } catch (error) {
    console.error("Admin password reset request error:", error);
    return handleApiError(error);
  }
}

async function handleChangePasswordRequest(request, env) {
  try {
    validateEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError("Method not allowed.", 405);
    }

    requireSameOrigin(request);
    validateJsonContentType(request);
    await enforceAuthenticationRateLimit(request, env, "change-password");

    const sessionState = await inspectCustomerSession(request, env);

    if (!sessionState.session) {
      throw new ApiRequestError(
        "Customer authentication is required.",
        401
      );
    }

    const body = await readJsonRequest(
      request,
      MAX_AUTH_REQUEST_LENGTH
    );

    const currentPassword = String(
      body.currentPassword == null ? "" : body.currentPassword
    );
    const newPassword = validateAccountPassword(body.newPassword);

    if (!currentPassword || currentPassword.length > MAX_PASSWORD_LENGTH) {
      throw new ApiRequestError("The current password is incorrect.", 401);
    }

    const account = sessionState.session.account;
    const passwordMatches = await verifyPassword(currentPassword, account);

    if (!passwordMatches) {
      throw new ApiRequestError("The current password is incorrect.", 401);
    }

    if (currentPassword === newPassword) {
      throw new ApiRequestError(
        "The new password must be different from the current password.",
        400
      );
    }

    const salt = randomBytes(16);
    const passwordHash = await derivePasswordHash(newPassword, salt);
    const now = new Date().toISOString();

    const updatedAccount = {
      ...account,
      passwordHash: bytesToBase64Url(passwordHash),
      passwordSalt: bytesToBase64Url(salt),
      passwordIterations: PASSWORD_HASH_ITERATIONS,
      passwordChangedAt: now,
      passwordResetCompletedAt: now,
      mustChangePassword: false,
      temporaryPasswordIssuedAt: "",
      sessionVersion: getAccountSessionVersion(account) + 1,
      updatedAt: now,
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
      { "Set-Cookie": buildClearedSessionCookie() }
    );
  } catch (error) {
    console.error("Change password request error:", error);
    return handleApiError(error);
  }
}

async function upgradeAuthenticationResponse(response, env) {
  if (!response.ok) {
    return response;
  }

  let result;

  try {
    result = await response.clone().json();
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

    const accountKey = await getAccountKey(result.account.email);
    const storedAccount = await env.DOCUMENTS_KV.get(accountKey, "json");
    const account = storedAccount || result.account;

    if (account.status !== "active") {
      return jsonResponse(
        {
          success: false,
          authenticated: false,
          error:
            "This customer account is currently suspended. Contact support for assistance.",
          accountSuspended: true,
        },
        403,
        { "Set-Cookie": buildClearedSessionCookie() }
      );
    }

    const sessionVersion = getAccountSessionVersion(account);

    if (storedAccount && storedAccount.sessionVersion !== sessionVersion) {
      await putAccountRecord(env, accountKey, {
        ...storedAccount,
        sessionVersion,
      });
    }

    const token = await createCustomerSessionToken(
      {
        ...account,
        sessionVersion,
      },
      env
    );

    const headers = new Headers(response.headers);

    headers.set("Set-Cookie", buildSessionCookie(token));
    headers.set("Cache-Control", "no-store");
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.delete("Content-Length");

    return new Response(
      JSON.stringify({
        ...result,
        account: toPublicAccount(account),
        requiresPasswordChange: Boolean(account.mustChangePassword),
      }),
      {
        status: response.status,
        statusText: response.statusText,
        headers,
      }
    );
  } catch (error) {
    console.error("Secure session upgrade failed:", error);

    return jsonResponse(
      {
        success: false,
        authenticated: false,
        error:
          "The account was accepted, but the secure session could not be finalized. Please log in again.",
      },
      503,
      { "Set-Cookie": buildClearedSessionCookie() }
    );
  }
}

async function inspectCustomerSession(request, env) {
  try {
    validateEnvironment(env);

    const token = getSessionToken(request);

    if (!token) {
      return {
        hasToken: false,
        session: null,
      };
    }

    const payload = await verifyCustomerSessionToken(token, env);

    if (!payload) {
      return {
        hasToken: true,
        session: null,
      };
    }

    const accountKey = await getAccountKey(payload.email);
    const account = await env.DOCUMENTS_KV.get(accountKey, "json");

    if (
      !account ||
      account.status !== "active" ||
      account.id !== payload.sub ||
      normalizeAccountEmail(account.email) !== payload.email ||
      getAccountSessionVersion(account) !==
        getPayloadSessionVersion(payload)
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
    console.error("Customer session inspection failed:", error);

    return {
      hasToken: Boolean(getSessionToken(request)),
      session: null,
    };
  }
}

function validatePartnerEnvironment(env) {
  validateEnvironment(env);

  if (!env.PARTNER_REGISTRY) {
    throw new ApiRequestError(
      "The Partner Program registry has not been configured.",
      500
    );
  }
}

function validateEnvironment(env) {
  if (!env.DOCUMENTS_KV || !env.DOCUMENT_ADMIN_SECRET) {
    throw new ApiRequestError(
      "Customer authentication has not been configured.",
      500
    );
  }

  if (!env.ORDER_RATE_LIMITER) {
    throw new ApiRequestError(
      "Authentication rate limiting has not been configured.",
      500
    );
  }
}

async function putAccountRecord(env, accountKey, account) {
  await env.DOCUMENTS_KV.put(accountKey, JSON.stringify(account), {
    metadata: {
      accountId: account.id,
      firstName: account.firstName || "",
      lastName: account.lastName || "",
      email: account.email,
      status: account.status,
      mustChangePassword: Boolean(account.mustChangePassword),
      temporaryPasswordIssuedAt: account.temporaryPasswordIssuedAt || "",
      suspendedAt: account.suspendedAt || "",
      lastSuspendedAt: account.lastSuspendedAt || "",
      reactivatedAt: account.reactivatedAt || "",
      lastSessionRevokedAt: account.lastSessionRevokedAt || "",
      createdAt: account.createdAt || "",
      updatedAt: account.updatedAt || "",
    },
  });
}

async function enforceAuthenticationRateLimit(request, env, action) {
  const clientIdentifier = getClientIdentifier(request);
  let result;

  try {
    result = await env.ORDER_RATE_LIMITER.limit({
      key: `auth:${action}:${clientIdentifier}`,
    });
  } catch (error) {
    console.error("Authentication rate limiter failed:", error);

    throw new ApiRequestError(
      "Account access is temporarily unavailable. Please try again shortly.",
      503
    );
  }

  if (!result.success) {
    throw new ApiRequestError(
      "Too many account attempts were received. Please wait one minute and try again.",
      429
    );
  }
}

async function requireAdminAuthorization(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const suppliedSecret = match ? match[1].trim() : "";
  const expectedSecret = String(env.DOCUMENT_ADMIN_SECRET || "");

  if (
    !suppliedSecret ||
    !expectedSecret ||
    !(await constantTimeStringEqual(suppliedSecret, expectedSecret))
  ) {
    throw new ApiRequestError(
      "Administrator authorization is required.",
      401
    );
  }
}

async function constantTimeStringEqual(left, right) {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(String(left))
    ),
    crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(String(right))
    ),
  ]);

  return constantTimeBytesEqual(
    new Uint8Array(leftDigest),
    new Uint8Array(rightDigest)
  );
}

function createTemporaryPassword(length = 20) {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%*+-_";
  const allCharacters = uppercase + lowercase + digits + symbols;

  const characters = [
    uppercase[randomIndex(uppercase.length)],
    lowercase[randomIndex(lowercase.length)],
    digits[randomIndex(digits.length)],
    symbols[randomIndex(symbols.length)],
  ];

  while (characters.length < Math.max(12, length)) {
    characters.push(allCharacters[randomIndex(allCharacters.length)]);
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index],
    ];
  }

  return characters.join("");
}

function randomIndex(maximum) {
  if (!Number.isSafeInteger(maximum) || maximum <= 0) {
    throw new Error("A valid random range is required.");
  }

  const limit = Math.floor(0x100000000 / maximum) * maximum;
  const values = new Uint32Array(1);

  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);

  return values[0] % maximum;
}

function getClientIdentifier(request) {
  const cloudflareIp = request.headers.get("CF-Connecting-IP");

  if (cloudflareIp) {
    return cleanText(cloudflareIp, 100);
  }

  const forwardedFor = request.headers.get("X-Forwarded-For");

  if (forwardedFor) {
    return cleanText(forwardedFor.split(",")[0], 100);
  }

  return "unknown-client";
}

function requireSameOrigin(request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("Origin");
  const fetchSite = request.headers.get("Sec-Fetch-Site");

  if (origin && origin !== requestUrl.origin) {
    throw new ApiRequestError("Cross-site requests are not allowed.", 403);
  }

  if (
    fetchSite &&
    !["same-origin", "same-site", "none"].includes(fetchSite)
  ) {
    throw new ApiRequestError("Cross-site requests are not allowed.", 403);
  }
}

function validateJsonContentType(request) {
  const contentType = request.headers.get("Content-Type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiRequestError(
      "Content-Type must be application/json.",
      415
    );
  }
}

async function readJsonRequest(request, maximumLength) {
  const declaredLength = Number(
    request.headers.get("Content-Length") || 0
  );

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maximumLength
  ) {
    throw new ApiRequestError("The request is too large.", 413);
  }

  const text = await request.text();

  if (text.length > maximumLength) {
    throw new ApiRequestError("The request is too large.", 413);
  }

  try {
    const body = JSON.parse(text);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Invalid JSON object.");
    }

    return body;
  } catch {
    throw new ApiRequestError("The request contains invalid JSON.", 400);
  }
}

function validateAccountPassword(value) {
  const password = String(value == null ? "" : value);

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiRequestError(
      `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
      400
    );
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ApiRequestError(
      `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`,
      400
    );
  }

  return password;
}

function normalizeAccountEmail(value) {
  const email = cleanText(value, MAX_ACCOUNT_EMAIL_LENGTH).toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiRequestError("Enter a valid email address.", 400);
  }

  return email;
}

async function getAccountKey(email) {
  const emailHash = await sha256Hex(normalizeAccountEmail(email));
  return `${ACCOUNT_KEY_PREFIX}${emailHash}`;
}

async function derivePasswordHash(
  password,
  salt,
  iterations = PASSWORD_HASH_ITERATIONS
) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return new Uint8Array(derivedBits);
}

async function verifyPassword(password, account) {
  try {
    const salt = base64UrlToBytes(account.passwordSalt);
    const expectedHash = base64UrlToBytes(account.passwordHash);
    const iterations =
      Number(account.passwordIterations) || PASSWORD_HASH_ITERATIONS;
    const submittedHash = await derivePasswordHash(
      password,
      salt,
      iterations
    );

    return constantTimeBytesEqual(submittedHash, expectedHash);
  } catch (error) {
    console.error("Password verification failed:", error);
    return false;
  }
}

function constantTimeBytesEqual(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array)) {
    return false;
  }

  let difference = left.length ^ right.length;
  const maximumLength = Math.max(left.length, right.length);

  for (let index = 0; index < maximumLength; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }

  return difference === 0;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(value))
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getAccountSessionVersion(account) {
  const sessionVersion = Number(account?.sessionVersion);

  return Number.isSafeInteger(sessionVersion) && sessionVersion > 0
    ? sessionVersion
    : 1;
}

function getPayloadSessionVersion(payload) {
  const sessionVersion = Number(payload?.sv);

  return Number.isSafeInteger(sessionVersion) && sessionVersion > 0
    ? sessionVersion
    : 1;
}

async function createCustomerSessionToken(account, env) {
  const issuedAt = Math.floor(Date.now() / 1000);

  const payload = {
    v: 1,
    sub: account.id,
    email: normalizeAccountEmail(account.email),
    firstName: account.firstName || "",
    lastName: account.lastName || "",
    researchAgreementAcceptedAt:
      account.researchAgreementAcceptedAt || "",
    accountCreatedAt: account.createdAt || "",
    accountUpdatedAt: account.updatedAt || "",
    sv: getAccountSessionVersion(account),
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS,
  };

  const encodedPayload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const signature = await signCustomerSessionPayload(encodedPayload, env);

  return `${encodedPayload}.${bytesToBase64Url(signature)}`;
}

async function verifyCustomerSessionToken(token, env) {
  const parts = String(token || "").split(".");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  let payload;
  let signature;

  try {
    payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(parts[0]))
    );
    signature = base64UrlToBytes(parts[1]);
  } catch {
    return null;
  }

  const key = await getCustomerSessionSigningKey(env);
  const signatureValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(parts[0])
  );

  if (!signatureValid) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    payload.v !== 1 ||
    !payload.sub ||
    !payload.email ||
    !Number.isFinite(Number(payload.iat)) ||
    !Number.isFinite(Number(payload.exp)) ||
    Number(payload.exp) <= now ||
    Number(payload.iat) > now + 300
  ) {
    return null;
  }

  try {
    payload.email = normalizeAccountEmail(payload.email);
  } catch {
    return null;
  }

  return payload;
}

async function signCustomerSessionPayload(encodedPayload, env) {
  const key = await getCustomerSessionSigningKey(env);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload)
  );

  return new Uint8Array(signature);
}

async function getCustomerSessionSigningKey(env) {
  const secretMaterial = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      `304-customer-session-v1:${String(env.DOCUMENT_ADMIN_SECRET)}`
    )
  );

  return crypto.subtle.importKey(
    "raw",
    secretMaterial,
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"]
  );
}

function normalizeAnalyticsPeriod(value) {
  const period = cleanText(value || '30', 10).toLowerCase();
  return ANALYTICS_PERIODS.has(period) ? period : '30';
}

function normalizeAnalyticsChannel(value) {
  const channel = cleanText(value || 'untracked', 30).toLowerCase();
  return ANALYTICS_CHANNELS.has(channel) ? channel : 'other';
}

function normalizeOptionalPartnerCode(value) {
  const code = cleanText(value, MAX_PARTNER_CODE_LENGTH).toUpperCase();
  return code ? validatePartnerCode(code) : '';
}

function validateAnalyticsDestinationPath(value) {
  const destinationPath = cleanText(
    value || '/checkout',
    MAX_CAMPAIGN_DESTINATION_LENGTH
  );

  if (!destinationPath.startsWith('/') || destinationPath.startsWith('//')) {
    return '/checkout';
  }

  return destinationPath;
}

function createAnalyticsVisitorId() {
  return `VIS-${crypto.randomUUID()}`;
}

function isValidAnalyticsIdentifier(value) {
  return /^[A-Za-z0-9_-]{8,120}$/.test(value || '');
}

function emptyAnalyticsContext() {
  return {
    visitorId: '',
    clickId: '',
    channel: 'untracked',
  };
}

function extractAnalyticsContextFromRequest(
  request,
  expectedPartnerCode,
  expectedCampaignSlug
) {
  const cookiePartnerCode = cleanText(
    getCookieValue(request, ANALYTICS_PARTNER_COOKIE_NAME),
    MAX_PARTNER_CODE_LENGTH
  ).toUpperCase();
  const cookieCampaignValue = cleanText(
    getCookieValue(request, ANALYTICS_CAMPAIGN_COOKIE_NAME),
    MAX_CAMPAIGN_SLUG_LENGTH
  );
  const cookieCampaignSlug = cookieCampaignValue === '-'
    ? ''
    : normalizeOptionalCampaignSlug(cookieCampaignValue);
  const normalizedExpectedCampaign = normalizeOptionalCampaignSlug(
    expectedCampaignSlug
  );

  if (
    cookiePartnerCode !== cleanText(
      expectedPartnerCode,
      MAX_PARTNER_CODE_LENGTH
    ).toUpperCase() ||
    cookieCampaignSlug !== normalizedExpectedCampaign
  ) {
    return emptyAnalyticsContext();
  }

  const visitorId = cleanText(
    getCookieValue(request, ANALYTICS_VISITOR_COOKIE_NAME),
    MAX_ANALYTICS_VISITOR_ID_LENGTH
  );
  const clickId = cleanText(
    getCookieValue(request, ANALYTICS_CLICK_COOKIE_NAME),
    MAX_ANALYTICS_CLICK_ID_LENGTH
  );

  return {
    visitorId: isValidAnalyticsIdentifier(visitorId) ? visitorId : '',
    clickId: isValidAnalyticsIdentifier(clickId) ? clickId : '',
    channel: normalizeAnalyticsChannel(
      getCookieValue(request, ANALYTICS_CHANNEL_COOKIE_NAME) || 'untracked'
    ),
  };
}

function getCookieValue(request, cookieName) {
  const cookieHeader = request.headers.get('Cookie') || '';

  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex < 0) continue;

    const name = cookie.slice(0, separatorIndex).trim();
    if (name !== cookieName) continue;

    const rawValue = cookie.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return '';
}

function buildAnalyticsCookie(name, value, maxAge) {
  return [
    `${name}=${encodeURIComponent(value || '')}`,
    'Path=/',
    `Max-Age=${Math.max(0, Number(maxAge) || 0)}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

function getSessionToken(request) {
  return getCookieValue(request, SESSION_COOKIE_NAME);
}

function buildSessionCookie(token) {
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
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
  ].join("; ");
}

function bytesToBase64Url(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toPublicAccount(account) {
  return {
    id: account.id,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    status: account.status,
    researchAgreementAcceptedAt: account.researchAgreementAcceptedAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    mustChangePassword: Boolean(account.mustChangePassword),
  };
}

function toAdminAccountSummary(account) {
  return {
    id: String(account.id || ""),
    firstName: cleanText(account.firstName, 100),
    lastName: cleanText(account.lastName, 100),
    email: cleanText(account.email, MAX_ACCOUNT_EMAIL_LENGTH).toLowerCase(),
    status: cleanText(account.status || "active", 50),
    researchAgreementAcceptedAt:
      account.researchAgreementAcceptedAt || "",
    createdAt: account.createdAt || "",
    updatedAt: account.updatedAt || "",
    mustChangePassword: Boolean(account.mustChangePassword),
    temporaryPasswordIssuedAt: account.temporaryPasswordIssuedAt || "",
    passwordChangedAt: account.passwordChangedAt || "",
    passwordResetCompletedAt: account.passwordResetCompletedAt || "",
    suspensionReason: cleanText(
      account.suspensionReason,
      MAX_ACCOUNT_CONTROL_REASON_LENGTH
    ),
    suspendedAt: account.suspendedAt || "",
    lastSuspensionReason: cleanText(
      account.lastSuspensionReason,
      MAX_ACCOUNT_CONTROL_REASON_LENGTH
    ),
    lastSuspendedAt: account.lastSuspendedAt || "",
    reactivatedAt: account.reactivatedAt || "",
    accountStatusChangedAt: account.accountStatusChangedAt || "",
    lastSessionRevokedAt: account.lastSessionRevokedAt || "",
    lastSessionRevocationReason: cleanText(
      account.lastSessionRevocationReason,
      MAX_ACCOUNT_CONTROL_REASON_LENGTH
    ),
  };
}

function cleanText(value, maximumLength) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function cleanMultilineText(value, maximumLength) {
  return String(value == null ? "" : value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

function handleApiError(error) {
  const status = error instanceof ApiRequestError ? error.status : 500;
  const shouldClearSession =
    status === 401 &&
    error?.message === "Customer authentication is required.";

  return jsonResponse(
    {
      success: false,
      error:
        error?.message ||
        "The account request could not be completed.",
    },
    status,
    shouldClearSession
      ? { "Set-Cookie": buildClearedSessionCookie() }
      : {}
  );
}

class ApiRequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

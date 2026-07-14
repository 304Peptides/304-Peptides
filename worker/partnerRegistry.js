import { DurableObject } from "cloudflare:workers";

const APPLICATION_STATUSES = new Set([
  "pending",
  "approved",
  "denied",
  "suspended",
]);

const ADMIN_ACTIONS = new Set([
  "approve",
  "deny",
  "suspend",
  "reactivate",
]);

const REFERRAL_STATUSES = new Set([
  "pending",
  "earned",
  "voided",
]);

const EARNED_ORDER_STATUSES = new Set([
  "paid",
  "processing",
  "shipped",
  "completed",
]);

const VOIDED_ORDER_STATUSES = new Set([
  "cancelled",
  "canceled",
]);

const DEFAULT_COMMISSION_RATE_BPS = 1000;
const MAX_COMMISSION_RATE_BPS = 5000;
const DEFAULT_PAYOUT_THRESHOLD_CENTS = 5000;
const MAX_PAYOUT_THRESHOLD_CENTS = 1_000_000;
const MAX_REFERRAL_HISTORY = 100;
const MAX_PAYOUT_HISTORY = 100;

const PAYOUT_TYPES = new Set([
  "cash",
  "store_credit",
]);

const LEADERBOARD_METRICS = new Set([
  "commission",
  "revenue",
  "referrals",
]);

const LEADERBOARD_PERIOD_TYPES = new Set([
  "monthly",
  "quarterly",
]);

const REWARD_TYPES = new Set([
  "cash",
  "store_credit",
  "swag",
]);

const REWARD_STATUSES = new Set([
  "awarded",
  "issued",
]);

const DEFAULT_LEADERBOARD_METRIC = "commission";
const DEFAULT_MONTHLY_REWARD_ENABLED = true;
const DEFAULT_MONTHLY_REWARD_TYPE = "store_credit";
const DEFAULT_MONTHLY_REWARD_AMOUNT_CENTS = 5000;
const DEFAULT_MONTHLY_MINIMUM_REFERRALS = 1;
const DEFAULT_QUARTERLY_REWARD_ENABLED = true;
const DEFAULT_QUARTERLY_REWARD_TYPE = "swag";
const DEFAULT_QUARTERLY_REWARD_AMOUNT_CENTS = 0;
const DEFAULT_QUARTERLY_REWARD_DESCRIPTION =
  "304 Peptides partner swag package";
const DEFAULT_QUARTERLY_MINIMUM_REFERRALS = 3;
const MAX_REWARD_AMOUNT_CENTS = 1_000_000;
const MAX_LEADERBOARD_ENTRIES = 100;
const MAX_REWARD_HISTORY = 100;

const CAMPAIGN_STATUSES = new Set([
  "draft",
  "published",
  "archived",
]);

const DEFAULT_CAMPAIGN_DISCLAIMER =
  "For laboratory research use only. Not for human consumption.";
const MAX_CAMPAIGN_HISTORY = 100;
const MAX_CAMPAIGN_SLUG_LENGTH = 60;
const MAX_CAMPAIGN_TITLE_LENGTH = 150;
const MAX_CAMPAIGN_SUMMARY_LENGTH = 500;
const MAX_CAMPAIGN_HEADLINE_LENGTH = 200;
const MAX_CAMPAIGN_COPY_LENGTH = 3000;
const MAX_CAMPAIGN_SMS_LENGTH = 500;
const MAX_CAMPAIGN_EMAIL_SUBJECT_LENGTH = 200;
const MAX_CAMPAIGN_URL_LENGTH = 1000;
const MAX_CAMPAIGN_DISCLAIMER_LENGTH = 1000;
const MAX_CAMPAIGN_CTA_LENGTH = 80;
const MAX_CAMPAIGN_DESTINATION_LENGTH = 200;


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

const ANALYTICS_PERIODS = new Set([
  "7",
  "30",
  "90",
  "all",
]);

const DEFAULT_ANALYTICS_PERIOD = "30";
const MAX_ANALYTICS_VISITOR_ID_LENGTH = 120;
const MAX_ANALYTICS_CLICK_ID_LENGTH = 120;
const MAX_ANALYTICS_BREAKDOWN_ROWS = 250;

export class PartnerRegistry extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS partner_applications (
        account_id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        code TEXT NOT NULL,
        status TEXT NOT NULL,
        primary_platform TEXT NOT NULL,
        profile_url TEXT NOT NULL DEFAULT '',
        audience_size TEXT NOT NULL,
        promotion_plan TEXT NOT NULL,
        experience TEXT NOT NULL DEFAULT '',
        agreement_accepted_at TEXT NOT NULL,
        agreement_version TEXT NOT NULL DEFAULT '',
        submitted_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        application_number INTEGER NOT NULL DEFAULT 1,
        reviewed_at TEXT NOT NULL DEFAULT '',
        reviewed_by TEXT NOT NULL DEFAULT '',
        customer_message TEXT NOT NULL DEFAULT '',
        admin_notes TEXT NOT NULL DEFAULT '',
        denied_at TEXT NOT NULL DEFAULT '',
        suspended_at TEXT NOT NULL DEFAULT '',
        reactivated_at TEXT NOT NULL DEFAULT '',
        last_status_change_at TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS partner_code_reservations (
        code TEXT PRIMARY KEY COLLATE NOCASE,
        account_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        reserved_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS partner_applications_status_index
        ON partner_applications(status, submitted_at DESC);

      CREATE INDEX IF NOT EXISTS partner_applications_code_index
        ON partner_applications(code);
    `);

    this.ensureCommissionRateColumn();

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS partner_referrals (
        order_id TEXT PRIMARY KEY,
        partner_account_id TEXT NOT NULL,
        partner_code TEXT NOT NULL COLLATE NOCASE,
        customer_account_id TEXT NOT NULL,
        customer_email TEXT NOT NULL DEFAULT '',
        order_subtotal_cents INTEGER NOT NULL,
        commission_rate_bps INTEGER NOT NULL,
        commission_amount_cents INTEGER NOT NULL,
        referral_status TEXT NOT NULL,
        order_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        earned_at TEXT NOT NULL DEFAULT '',
        voided_at TEXT NOT NULL DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS partner_referrals_partner_index
        ON partner_referrals(partner_account_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS partner_referrals_status_index
        ON partner_referrals(referral_status, created_at DESC);

      CREATE INDEX IF NOT EXISTS partner_referrals_code_index
        ON partner_referrals(partner_code, created_at DESC);

      CREATE TABLE IF NOT EXISTS partner_program_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL DEFAULT ''
      );

      INSERT OR IGNORE INTO partner_program_settings (
        setting_key,
        setting_value,
        updated_at,
        updated_by
      ) VALUES (
        'minimum_payout_cents',
        '${DEFAULT_PAYOUT_THRESHOLD_CENTS}',
        '',
        'system-default'
      );

      CREATE TABLE IF NOT EXISTS partner_payouts (
        payout_id TEXT PRIMARY KEY,
        partner_account_id TEXT NOT NULL,
        partner_code TEXT NOT NULL COLLATE NOCASE,
        partner_email TEXT NOT NULL DEFAULT '',
        amount_cents INTEGER NOT NULL,
        referral_count INTEGER NOT NULL,
        payout_type TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        reference_number TEXT NOT NULL DEFAULT '',
        partner_note TEXT NOT NULL DEFAULT '',
        admin_notes TEXT NOT NULL DEFAULT '',
        paid_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS partner_payout_items (
        order_id TEXT PRIMARY KEY,
        payout_id TEXT NOT NULL,
        commission_amount_cents INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS partner_payouts_partner_index
        ON partner_payouts(partner_account_id, paid_at DESC);

      CREATE INDEX IF NOT EXISTS partner_payouts_paid_at_index
        ON partner_payouts(paid_at DESC);

      CREATE INDEX IF NOT EXISTS partner_payout_items_payout_index
        ON partner_payout_items(payout_id, created_at ASC);

      INSERT OR IGNORE INTO partner_program_settings (
        setting_key, setting_value, updated_at, updated_by
      ) VALUES
        ('leaderboard_metric', '${DEFAULT_LEADERBOARD_METRIC}', '', 'system-default'),
        ('monthly_reward_enabled', '${DEFAULT_MONTHLY_REWARD_ENABLED ? "1" : "0"}', '', 'system-default'),
        ('monthly_reward_type', '${DEFAULT_MONTHLY_REWARD_TYPE}', '', 'system-default'),
        ('monthly_reward_amount_cents', '${DEFAULT_MONTHLY_REWARD_AMOUNT_CENTS}', '', 'system-default'),
        ('monthly_minimum_referrals', '${DEFAULT_MONTHLY_MINIMUM_REFERRALS}', '', 'system-default'),
        ('quarterly_reward_enabled', '${DEFAULT_QUARTERLY_REWARD_ENABLED ? "1" : "0"}', '', 'system-default'),
        ('quarterly_reward_type', '${DEFAULT_QUARTERLY_REWARD_TYPE}', '', 'system-default'),
        ('quarterly_reward_amount_cents', '${DEFAULT_QUARTERLY_REWARD_AMOUNT_CENTS}', '', 'system-default'),
        ('quarterly_reward_description', '${DEFAULT_QUARTERLY_REWARD_DESCRIPTION}', '', 'system-default'),
        ('quarterly_minimum_referrals', '${DEFAULT_QUARTERLY_MINIMUM_REFERRALS}', '', 'system-default');

      CREATE TABLE IF NOT EXISTS partner_rewards (
        reward_id TEXT PRIMARY KEY,
        period_type TEXT NOT NULL,
        period_key TEXT NOT NULL,
        partner_account_id TEXT NOT NULL,
        partner_code TEXT NOT NULL COLLATE NOCASE,
        partner_email TEXT NOT NULL DEFAULT '',
        leaderboard_metric TEXT NOT NULL,
        rank INTEGER NOT NULL,
        referral_count INTEGER NOT NULL,
        revenue_cents INTEGER NOT NULL,
        commission_cents INTEGER NOT NULL,
        reward_type TEXT NOT NULL,
        reward_amount_cents INTEGER NOT NULL DEFAULT 0,
        reward_description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL,
        awarded_at TEXT NOT NULL,
        awarded_by TEXT NOT NULL,
        issued_at TEXT NOT NULL DEFAULT '',
        issued_by TEXT NOT NULL DEFAULT '',
        delivery_method TEXT NOT NULL DEFAULT '',
        reference_number TEXT NOT NULL DEFAULT '',
        partner_note TEXT NOT NULL DEFAULT '',
        admin_notes TEXT NOT NULL DEFAULT '',
        UNIQUE(period_type, period_key)
      );

      CREATE INDEX IF NOT EXISTS partner_rewards_partner_index
        ON partner_rewards(partner_account_id, awarded_at DESC);

      CREATE INDEX IF NOT EXISTS partner_rewards_period_index
        ON partner_rewards(period_type, period_key DESC);

      CREATE INDEX IF NOT EXISTS partner_rewards_status_index
        ON partner_rewards(status, awarded_at DESC);

      CREATE TABLE IF NOT EXISTS partner_campaigns (
        campaign_id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        headline TEXT NOT NULL DEFAULT '',
        facebook_copy TEXT NOT NULL DEFAULT '',
        instagram_copy TEXT NOT NULL DEFAULT '',
        tiktok_copy TEXT NOT NULL DEFAULT '',
        sms_copy TEXT NOT NULL DEFAULT '',
        email_subject TEXT NOT NULL DEFAULT '',
        email_copy TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
        download_url TEXT NOT NULL DEFAULT '',
        disclaimer TEXT NOT NULL DEFAULT '',
        cta_label TEXT NOT NULL DEFAULT '',
        destination_path TEXT NOT NULL DEFAULT '/checkout',
        starts_at TEXT NOT NULL DEFAULT '',
        ends_at TEXT NOT NULL DEFAULT '',
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        published_at TEXT NOT NULL DEFAULT '',
        published_by TEXT NOT NULL DEFAULT '',
        archived_at TEXT NOT NULL DEFAULT '',
        archived_by TEXT NOT NULL DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS partner_campaigns_status_index
        ON partner_campaigns(status, display_order ASC, updated_at DESC);

      CREATE INDEX IF NOT EXISTS partner_campaigns_slug_index
        ON partner_campaigns(slug);
    `);

    this.ensureReferralCampaignColumns();
    this.ensureReferralAnalyticsColumns();

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS partner_click_events (
        click_id TEXT PRIMARY KEY,
        visitor_id TEXT NOT NULL,
        partner_account_id TEXT NOT NULL,
        partner_code TEXT NOT NULL COLLATE NOCASE,
        campaign_id TEXT NOT NULL DEFAULT '',
        campaign_slug TEXT NOT NULL DEFAULT '',
        campaign_title TEXT NOT NULL DEFAULT '',
        channel TEXT NOT NULL,
        destination_path TEXT NOT NULL,
        clicked_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS partner_click_events_partner_index
        ON partner_click_events(partner_account_id, clicked_at DESC);

      CREATE INDEX IF NOT EXISTS partner_click_events_campaign_index
        ON partner_click_events(campaign_slug, clicked_at DESC);

      CREATE INDEX IF NOT EXISTS partner_click_events_visitor_index
        ON partner_click_events(visitor_id, clicked_at DESC);

      CREATE INDEX IF NOT EXISTS partner_click_events_channel_index
        ON partner_click_events(channel, clicked_at DESC);
    `);
  }

  ensureCommissionRateColumn() {
    const columns = this.sql
      .exec("PRAGMA table_info(partner_applications)")
      .toArray();

    const hasColumn = columns.some(
      (column) => column.name === "commission_rate_bps"
    );

    if (!hasColumn) {
      this.sql.exec(
        `ALTER TABLE partner_applications
         ADD COLUMN commission_rate_bps INTEGER NOT NULL DEFAULT ${DEFAULT_COMMISSION_RATE_BPS}`
      );
    }
  }

  ensureReferralCampaignColumns() {
    const columns = this.sql
      .exec("PRAGMA table_info(partner_referrals)")
      .toArray();

    const names = new Set(columns.map((column) => column.name));

    for (const [name, definition] of [
      ["campaign_id", "TEXT NOT NULL DEFAULT ''"],
      ["campaign_slug", "TEXT NOT NULL DEFAULT ''"],
      ["campaign_title", "TEXT NOT NULL DEFAULT ''"],
    ]) {
      if (!names.has(name)) {
        this.sql.exec(
          `ALTER TABLE partner_referrals ADD COLUMN ${name} ${definition}`
        );
      }
    }
  }

  ensureReferralAnalyticsColumns() {
    const columns = this.sql
      .exec("PRAGMA table_info(partner_referrals)")
      .toArray();

    const names = new Set(columns.map((column) => column.name));

    for (const [name, definition] of [
      ["analytics_visitor_id", "TEXT NOT NULL DEFAULT ''"],
      ["analytics_channel", "TEXT NOT NULL DEFAULT ''"],
      ["analytics_click_id", "TEXT NOT NULL DEFAULT ''"],
    ]) {
      if (!names.has(name)) {
        this.sql.exec(
          `ALTER TABLE partner_referrals ADD COLUMN ${name} ${definition}`
        );
      }
    }
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/application" && request.method === "GET") {
        return this.getApplication(url);
      }

      if (url.pathname === "/availability" && request.method === "GET") {
        return this.getAvailability(url);
      }

      if (url.pathname === "/apply" && request.method === "POST") {
        return this.submitApplication(request);
      }

      if (url.pathname === "/referral/validate" && request.method === "GET") {
        return this.validateReferralCode(url);
      }

      if (url.pathname === "/referral/record" && request.method === "POST") {
        return this.recordReferral(request);
      }

      if (
        url.pathname === "/referral/order-status" &&
        request.method === "POST"
      ) {
        return this.updateReferralOrderStatus(request);
      }

      if (url.pathname === "/partner/summary" && request.method === "GET") {
        return this.getPartnerSummary(url);
      }

      if (url.pathname === "/partner/payouts" && request.method === "GET") {
        return this.getPartnerPayouts(url);
      }

      if (url.pathname === "/analytics/track" && request.method === "POST") {
        return this.trackAnalyticsClick(request);
      }

      if (url.pathname === "/partner/analytics" && request.method === "GET") {
        return this.getPartnerAnalytics(url);
      }

      if (url.pathname === "/admin/analytics" && request.method === "GET") {
        return this.getAdminAnalytics(url);
      }

      if (url.pathname === "/admin/list" && request.method === "GET") {
        return this.listApplications();
      }

      if (url.pathname === "/admin/action" && request.method === "POST") {
        return this.updateApplication(request);
      }

      if (
        url.pathname === "/admin/commission-rate" &&
        request.method === "POST"
      ) {
        return this.updateCommissionRate(request);
      }

      if (url.pathname === "/admin/referrals" && request.method === "GET") {
        return this.listAllReferrals();
      }

      if (url.pathname === "/admin/payout-settings" && request.method === "GET") {
        return this.getPayoutSettings();
      }

      if (
        url.pathname === "/admin/payout-settings" &&
        request.method === "POST"
      ) {
        return this.updatePayoutSettings(request);
      }

      if (url.pathname === "/admin/payouts" && request.method === "GET") {
        return this.listAllPayouts();
      }

      if (url.pathname === "/admin/payouts/create" && request.method === "POST") {
        return this.createPayout(request);
      }

      if (url.pathname === "/partner/leaderboard" && request.method === "GET") {
        return this.getPartnerLeaderboard(url);
      }

      if (url.pathname === "/admin/leaderboard" && request.method === "GET") {
        return this.getAdminLeaderboard(url);
      }

      if (
        url.pathname === "/admin/leaderboard-settings" &&
        request.method === "GET"
      ) {
        return this.getLeaderboardSettings();
      }

      if (
        url.pathname === "/admin/leaderboard-settings" &&
        request.method === "POST"
      ) {
        return this.updateLeaderboardSettings(request);
      }

      if (url.pathname === "/admin/rewards" && request.method === "GET") {
        return this.listAllRewards();
      }

      if (url.pathname === "/admin/rewards/award" && request.method === "POST") {
        return this.awardPeriodReward(request);
      }

      if (url.pathname === "/admin/rewards/issue" && request.method === "POST") {
        return this.issueReward(request);
      }

      if (url.pathname === "/partner/campaigns" && request.method === "GET") {
        return this.getPartnerCampaigns(url);
      }

      if (url.pathname === "/campaign/validate" && request.method === "GET") {
        return this.validateCampaign(url);
      }

      if (url.pathname === "/admin/campaigns" && request.method === "GET") {
        return this.listAdminCampaigns();
      }

      if (url.pathname === "/admin/campaigns/save" && request.method === "POST") {
        return this.saveCampaign(request);
      }

      if (url.pathname === "/admin/campaigns/status" && request.method === "POST") {
        return this.updateCampaignStatus(request);
      }

      throw new RegistryError("Partner registry route not found.", 404);
    } catch (error) {
      console.error("Partner registry error:", error);
      return errorResponse(error);
    }
  }

  getApplication(url) {
    const accountId = cleanText(url.searchParams.get("accountId"), 150);

    if (!accountId) {
      throw new RegistryError("A customer account ID is required.", 400);
    }

    return jsonResponse({
      success: true,
      application: this.findApplication(accountId),
    });
  }

  getAvailability(url) {
    const code = normalizeCode(url.searchParams.get("code"));
    const accountId = cleanText(url.searchParams.get("accountId"), 150);

    if (!code) {
      throw new RegistryError("A partner code is required.", 400);
    }

    const reservation = this.findReservation(code);
    const ownedByAccount = Boolean(
      reservation && accountId && reservation.accountId === accountId
    );

    return jsonResponse({
      success: true,
      code,
      available: !reservation || ownedByAccount,
      ownedByAccount,
    });
  }

  async submitApplication(request) {
    const application = normalizeApplication(await readJson(request));
    const now = new Date().toISOString();
    let savedApplication;

    try {
      this.ctx.storage.transactionSync(() => {
        const existing = this.findApplication(application.accountId);

        if (
          existing &&
          ["pending", "approved", "suspended"].includes(existing.status)
        ) {
          const messages = {
            pending: "A partner application is already awaiting review.",
            approved: "This customer account is already an approved partner.",
            suspended:
              "This partner account is suspended and cannot submit a new application.",
          };

          throw new RegistryError(messages[existing.status], 409);
        }

        const reservation = this.findReservation(application.code);

        if (reservation && reservation.accountId !== application.accountId) {
          throw new RegistryError(
            "That partner code has already been claimed. Choose another code.",
            409
          );
        }

        this.sql.exec(
          "DELETE FROM partner_code_reservations WHERE account_id = ?",
          application.accountId
        );

        this.sql.exec(
          `INSERT INTO partner_code_reservations (
            code, account_id, status, reserved_at, updated_at
          ) VALUES (?, ?, 'pending', ?, ?)`,
          application.code,
          application.accountId,
          now,
          now
        );

        if (existing) {
          this.sql.exec(
            `UPDATE partner_applications
             SET email = ?,
                 first_name = ?,
                 last_name = ?,
                 code = ?,
                 status = 'pending',
                 primary_platform = ?,
                 profile_url = ?,
                 audience_size = ?,
                 promotion_plan = ?,
                 experience = ?,
                 agreement_accepted_at = ?,
                 agreement_version = ?,
                 submitted_at = ?,
                 updated_at = ?,
                 application_number = application_number + 1,
                 reviewed_at = '',
                 reviewed_by = '',
                 customer_message = '',
                 admin_notes = '',
                 denied_at = '',
                 suspended_at = '',
                 reactivated_at = '',
                 last_status_change_at = ?
             WHERE account_id = ?`,
            application.email,
            application.firstName,
            application.lastName,
            application.code,
            application.primaryPlatform,
            application.profileUrl,
            application.audienceSize,
            application.promotionPlan,
            application.experience,
            application.agreementAcceptedAt,
            application.agreementVersion,
            now,
            now,
            now,
            application.accountId
          );
        } else {
          this.sql.exec(
            `INSERT INTO partner_applications (
              account_id,
              email,
              first_name,
              last_name,
              code,
              status,
              primary_platform,
              profile_url,
              audience_size,
              promotion_plan,
              experience,
              agreement_accepted_at,
              agreement_version,
              submitted_at,
              updated_at,
              application_number,
              last_status_change_at,
              commission_rate_bps
            ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            application.accountId,
            application.email,
            application.firstName,
            application.lastName,
            application.code,
            application.primaryPlatform,
            application.profileUrl,
            application.audienceSize,
            application.promotionPlan,
            application.experience,
            application.agreementAcceptedAt,
            application.agreementVersion,
            now,
            now,
            now,
            DEFAULT_COMMISSION_RATE_BPS
          );
        }

        savedApplication = this.findApplication(application.accountId);
      });
    } catch (error) {
      if (error instanceof RegistryError) {
        throw error;
      }

      if (/unique constraint failed/i.test(String(error?.message || error))) {
        throw new RegistryError(
          "That partner code has already been claimed. Choose another code.",
          409
        );
      }

      throw error;
    }

    return jsonResponse(
      {
        success: true,
        application: savedApplication,
        message:
          "Your partner application was submitted and the selected code is reserved while the application is reviewed.",
      },
      201
    );
  }

  validateReferralCode(url) {
    const code = normalizeCode(url.searchParams.get("code"));
    const customerAccountId = cleanText(
      url.searchParams.get("customerAccountId"),
      150
    );
    const submittedCampaignSlug = normalizeOptionalCampaignSlug(
      url.searchParams.get("campaign")
    );

    if (!code) {
      throw new RegistryError("A referral code is required.", 400);
    }

    if (!customerAccountId) {
      throw new RegistryError("A customer account ID is required.", 400);
    }

    const partner = this.findActivePartnerByCode(code);

    if (!partner) {
      return jsonResponse({
        success: true,
        valid: false,
        code,
        reason: "inactive_or_unknown",
        message: "That referral code is not active.",
      });
    }

    if (partner.accountId === customerAccountId) {
      return jsonResponse({
        success: true,
        valid: false,
        code,
        reason: "self_referral",
        message: "You cannot use your own partner code on your order.",
      });
    }

    const campaign = submittedCampaignSlug
      ? this.findActiveCampaignBySlug(submittedCampaignSlug)
      : null;

    return jsonResponse({
      success: true,
      valid: true,
      code: partner.code,
      reason: "active",
      message: "Referral code applied. The order subtotal is unchanged.",
      commissionRateBps: partner.commissionRateBps,
      campaignRequested: Boolean(submittedCampaignSlug),
      campaignValid: Boolean(campaign),
      campaign: campaign ? toCustomerCampaign(campaign) : null,
    });
  }

  async recordReferral(request) {
    const payload = await readJson(request);
    const orderId = normalizeOrderId(payload.orderId);
    const code = normalizeCode(payload.code);
    const customerAccountId = cleanText(payload.customerAccountId, 150);
    const customerEmail = cleanText(payload.customerEmail, 254).toLowerCase();
    const orderStatus = cleanText(
      payload.orderStatus || "Order Request Received",
      100
    );
    const orderSubtotalCents = normalizeMoneyToCents(payload.orderSubtotal);
    const campaignSlug = normalizeOptionalCampaignSlug(payload.campaignSlug);
    const analyticsVisitorId = cleanText(
      payload.analyticsVisitorId,
      MAX_ANALYTICS_VISITOR_ID_LENGTH
    );
    const analyticsClickId = cleanText(
      payload.analyticsClickId,
      MAX_ANALYTICS_CLICK_ID_LENGTH
    );
    const analyticsChannel = normalizeAnalyticsChannel(
      payload.analyticsChannel || "untracked"
    );

    if (!orderId || !code || !customerAccountId) {
      throw new RegistryError(
        "The referral record is missing required order information.",
        400
      );
    }

    const partner = this.findActivePartnerByCode(code);

    if (!partner) {
      throw new RegistryError("That referral code is not active.", 409);
    }

    if (partner.accountId === customerAccountId) {
      throw new RegistryError(
        "A partner cannot receive credit for their own order.",
        409
      );
    }

    const campaign = campaignSlug
      ? this.findActiveCampaignBySlug(campaignSlug)
      : null;

    const now = new Date().toISOString();
    const referralStatus = classifyReferralStatus(orderStatus);
    const commissionAmountCents = Math.round(
      (orderSubtotalCents * partner.commissionRateBps) / 10000
    );

    let savedReferral;

    this.ctx.storage.transactionSync(() => {
      const existing = this.findReferral(orderId);

      if (existing) {
        if (
          existing.partnerAccountId !== partner.accountId ||
          existing.customerAccountId !== customerAccountId
        ) {
          throw new RegistryError(
            "This order is already attributed to a different referral.",
            409
          );
        }

        const timestamps = getReferralStatusTimestamps(
          referralStatus,
          existing,
          now
        );

        this.sql.exec(
          `UPDATE partner_referrals
           SET order_status = ?,
               referral_status = ?,
               updated_at = ?,
               earned_at = ?,
               voided_at = ?
           WHERE order_id = ?`,
          orderStatus,
          referralStatus,
          now,
          timestamps.earnedAt,
          timestamps.voidedAt,
          orderId
        );
      } else {
        const timestamps = getReferralStatusTimestamps(
          referralStatus,
          null,
          now
        );

        this.sql.exec(
          `INSERT INTO partner_referrals (
            order_id,
            partner_account_id,
            partner_code,
            customer_account_id,
            customer_email,
            order_subtotal_cents,
            commission_rate_bps,
            commission_amount_cents,
            referral_status,
            order_status,
            created_at,
            updated_at,
            earned_at,
            voided_at,
            campaign_id,
            campaign_slug,
            campaign_title,
            analytics_visitor_id,
            analytics_channel,
            analytics_click_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          orderId,
          partner.accountId,
          partner.code,
          customerAccountId,
          customerEmail,
          orderSubtotalCents,
          partner.commissionRateBps,
          commissionAmountCents,
          referralStatus,
          orderStatus,
          now,
          now,
          timestamps.earnedAt,
          timestamps.voidedAt,
          campaign?.campaignId || "",
          campaign?.slug || "",
          campaign?.title || "",
          analyticsVisitorId,
          analyticsChannel,
          analyticsClickId
        );
      }

      savedReferral = this.findReferral(orderId);
    });

    return jsonResponse(
      {
        success: true,
        referral: savedReferral,
        message: "The referral was attached to the order.",
      },
      201
    );
  }

  async updateReferralOrderStatus(request) {
    const payload = await readJson(request);
    const orderId = normalizeOrderId(payload.orderId);
    const orderStatus = cleanText(payload.orderStatus, 100);

    if (!orderId || !orderStatus) {
      throw new RegistryError(
        "An order number and order status are required.",
        400
      );
    }

    const existing = this.findReferral(orderId);

    if (!existing) {
      return jsonResponse({
        success: true,
        referral: null,
        message: "This order does not have a referral record.",
      });
    }

    const now = new Date().toISOString();
    const referralStatus = classifyReferralStatus(orderStatus);
    const timestamps = getReferralStatusTimestamps(
      referralStatus,
      existing,
      now
    );

    this.sql.exec(
      `UPDATE partner_referrals
       SET order_status = ?,
           referral_status = ?,
           updated_at = ?,
           earned_at = ?,
           voided_at = ?
       WHERE order_id = ?`,
      orderStatus,
      referralStatus,
      now,
      timestamps.earnedAt,
      timestamps.voidedAt,
      orderId
    );

    return jsonResponse({
      success: true,
      referral: this.findReferral(orderId),
      message: "The referral status was synchronized with the order.",
    });
  }

  async trackAnalyticsClick(request) {
    const payload = await readJson(request);
    const code = normalizeCode(payload.code);
    const campaignSlug = normalizeOptionalCampaignSlug(payload.campaignSlug);
    const visitorId = cleanText(
      payload.visitorId,
      MAX_ANALYTICS_VISITOR_ID_LENGTH
    );
    const channel = normalizeAnalyticsChannel(payload.channel);

    if (!code || !visitorId) {
      throw new RegistryError(
        "A valid partner code and anonymous visitor ID are required.",
        400
      );
    }

    const partner = this.findActivePartnerByCode(code);

    if (!partner) {
      throw new RegistryError("That partner link is not active.", 404);
    }

    const campaign = campaignSlug
      ? this.findActiveCampaignBySlug(campaignSlug)
      : null;
    const campaignValid = !campaignSlug || Boolean(campaign);
    const destinationPath = campaign?.destinationPath || "/checkout";
    const clickId = createAnalyticsClickId();
    const clickedAt = new Date().toISOString();

    this.sql.exec(
      `INSERT INTO partner_click_events (
         click_id,
         visitor_id,
         partner_account_id,
         partner_code,
         campaign_id,
         campaign_slug,
         campaign_title,
         channel,
         destination_path,
         clicked_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      clickId,
      visitorId,
      partner.accountId,
      partner.code,
      campaign?.campaignId || "",
      campaign?.slug || "",
      campaign?.title || "",
      channel,
      destinationPath,
      clickedAt
    );

    return jsonResponse(
      {
        success: true,
        click: {
          clickId,
          visitorId,
          partnerCode: partner.code,
          campaignSlug: campaign?.slug || "",
          campaignTitle: campaign?.title || "",
          campaignRequested: Boolean(campaignSlug),
          campaignValid,
          channel,
          destinationPath,
          clickedAt,
        },
        campaign: campaign ? toCustomerCampaign(campaign) : null,
        message: campaignValid
          ? "The partner visit was recorded."
          : "The partner visit was recorded without an inactive campaign.",
      },
      201
    );
  }

  getPartnerAnalytics(url) {
    const accountId = cleanText(url.searchParams.get("accountId"), 150);
    const period = normalizeAnalyticsPeriod(url.searchParams.get("period"));

    if (!accountId) {
      throw new RegistryError("A partner account ID is required.", 400);
    }

    const application = this.findApplication(accountId);

    if (!application) {
      return jsonResponse({
        success: true,
        application: null,
        analytics: emptyAnalyticsReport(period),
      });
    }

    return jsonResponse({
      success: true,
      application,
      analytics: this.buildAnalyticsReport({ accountId, period }),
    });
  }

  getAdminAnalytics(url) {
    const period = normalizeAnalyticsPeriod(url.searchParams.get("period"));
    const partnerCode = normalizeOptionalCode(
      url.searchParams.get("partnerCode")
    );
    const campaignSlug = normalizeOptionalCampaignSlug(
      url.searchParams.get("campaign")
    );

    return jsonResponse({
      success: true,
      analytics: this.buildAnalyticsReport({
        period,
        partnerCode,
        campaignSlug,
        includePartners: true,
      }),
    });
  }

  buildAnalyticsReport({
    accountId = "",
    partnerCode = "",
    campaignSlug = "",
    period = DEFAULT_ANALYTICS_PERIOD,
    includePartners = false,
  } = {}) {
    const periodInfo = analyticsPeriodInfo(period);
    const clickFilter = buildAnalyticsWhere({
      dateColumn: "clicked_at",
      accountColumn: "partner_account_id",
      codeColumn: "partner_code",
      campaignColumn: "campaign_slug",
      startAt: periodInfo.startAt,
      accountId,
      partnerCode,
      campaignSlug,
    });
    const referralFilter = buildAnalyticsWhere({
      dateColumn: "created_at",
      accountColumn: "partner_account_id",
      codeColumn: "partner_code",
      campaignColumn: "campaign_slug",
      startAt: periodInfo.startAt,
      accountId,
      partnerCode,
      campaignSlug,
    });

    const clickSummary = this.sql
      .exec(
        `SELECT COUNT(*) AS total_clicks,
                COUNT(DISTINCT visitor_id) AS unique_visitors
         FROM partner_click_events
         ${clickFilter.where}`,
        ...clickFilter.params
      )
      .toArray()[0];

    const referralSummary = this.sql
      .exec(
        `SELECT COUNT(*) AS attributed_orders,
                SUM(CASE WHEN referral_status = 'earned' THEN 1 ELSE 0 END) AS earned_orders,
                SUM(CASE WHEN referral_status = 'voided' THEN 1 ELSE 0 END) AS voided_orders,
                SUM(CASE WHEN referral_status = 'earned' THEN order_subtotal_cents ELSE 0 END) AS earned_revenue_cents,
                SUM(CASE WHEN referral_status = 'earned' THEN commission_amount_cents ELSE 0 END) AS earned_commission_cents
         FROM partner_referrals
         ${referralFilter.where}`,
        ...referralFilter.params
      )
      .toArray()[0];

    const campaignClicks = this.sql
      .exec(
        `SELECT campaign_slug,
                MAX(campaign_title) AS campaign_title,
                COUNT(*) AS total_clicks,
                COUNT(DISTINCT visitor_id) AS unique_visitors
         FROM partner_click_events
         ${clickFilter.where}
         GROUP BY campaign_slug
         ORDER BY total_clicks DESC, campaign_slug ASC
         LIMIT ?`,
        ...clickFilter.params,
        MAX_ANALYTICS_BREAKDOWN_ROWS
      )
      .toArray()
      .map(mapAnalyticsCampaignClickRow);

    const campaignOrders = this.sql
      .exec(
        `SELECT campaign_slug,
                MAX(campaign_title) AS campaign_title,
                COUNT(*) AS attributed_orders,
                SUM(CASE WHEN referral_status = 'earned' THEN 1 ELSE 0 END) AS earned_orders,
                SUM(CASE WHEN referral_status = 'voided' THEN 1 ELSE 0 END) AS voided_orders,
                SUM(CASE WHEN referral_status = 'earned' THEN order_subtotal_cents ELSE 0 END) AS earned_revenue_cents,
                SUM(CASE WHEN referral_status = 'earned' THEN commission_amount_cents ELSE 0 END) AS earned_commission_cents
         FROM partner_referrals
         ${referralFilter.where}
         GROUP BY campaign_slug
         ORDER BY attributed_orders DESC, campaign_slug ASC
         LIMIT ?`,
        ...referralFilter.params,
        MAX_ANALYTICS_BREAKDOWN_ROWS
      )
      .toArray()
      .map(mapAnalyticsCampaignOrderRow);

    const channelClicks = this.sql
      .exec(
        `SELECT channel,
                COUNT(*) AS total_clicks,
                COUNT(DISTINCT visitor_id) AS unique_visitors
         FROM partner_click_events
         ${clickFilter.where}
         GROUP BY channel
         ORDER BY total_clicks DESC, channel ASC
         LIMIT ?`,
        ...clickFilter.params,
        MAX_ANALYTICS_BREAKDOWN_ROWS
      )
      .toArray()
      .map(mapAnalyticsChannelClickRow);

    const channelOrders = this.sql
      .exec(
        `SELECT analytics_channel AS channel,
                COUNT(*) AS attributed_orders,
                SUM(CASE WHEN referral_status = 'earned' THEN 1 ELSE 0 END) AS earned_orders,
                SUM(CASE WHEN referral_status = 'voided' THEN 1 ELSE 0 END) AS voided_orders,
                SUM(CASE WHEN referral_status = 'earned' THEN order_subtotal_cents ELSE 0 END) AS earned_revenue_cents,
                SUM(CASE WHEN referral_status = 'earned' THEN commission_amount_cents ELSE 0 END) AS earned_commission_cents
         FROM partner_referrals
         ${referralFilter.where}
         GROUP BY analytics_channel
         ORDER BY attributed_orders DESC, analytics_channel ASC
         LIMIT ?`,
        ...referralFilter.params,
        MAX_ANALYTICS_BREAKDOWN_ROWS
      )
      .toArray()
      .map(mapAnalyticsChannelOrderRow);

    const dailyClicks = this.sql
      .exec(
        `SELECT substr(clicked_at, 1, 10) AS day,
                COUNT(*) AS total_clicks,
                COUNT(DISTINCT visitor_id) AS unique_visitors
         FROM partner_click_events
         ${clickFilter.where}
         GROUP BY day
         ORDER BY day ASC
         LIMIT ?`,
        ...clickFilter.params,
        MAX_ANALYTICS_BREAKDOWN_ROWS
      )
      .toArray()
      .map(mapAnalyticsDailyClickRow);

    const dailyOrders = this.sql
      .exec(
        `SELECT substr(created_at, 1, 10) AS day,
                COUNT(*) AS attributed_orders,
                SUM(CASE WHEN referral_status = 'earned' THEN 1 ELSE 0 END) AS earned_orders,
                SUM(CASE WHEN referral_status = 'voided' THEN 1 ELSE 0 END) AS voided_orders,
                SUM(CASE WHEN referral_status = 'earned' THEN order_subtotal_cents ELSE 0 END) AS earned_revenue_cents,
                SUM(CASE WHEN referral_status = 'earned' THEN commission_amount_cents ELSE 0 END) AS earned_commission_cents
         FROM partner_referrals
         ${referralFilter.where}
         GROUP BY day
         ORDER BY day ASC
         LIMIT ?`,
        ...referralFilter.params,
        MAX_ANALYTICS_BREAKDOWN_ROWS
      )
      .toArray()
      .map(mapAnalyticsDailyOrderRow);

    let byPartner = [];

    if (includePartners) {
      const partnerClicks = this.sql
        .exec(
          `SELECT partner_account_id,
                  MAX(partner_code) AS partner_code,
                  COUNT(*) AS total_clicks,
                  COUNT(DISTINCT visitor_id) AS unique_visitors
           FROM partner_click_events
           ${clickFilter.where}
           GROUP BY partner_account_id
           ORDER BY total_clicks DESC, partner_code ASC
           LIMIT ?`,
          ...clickFilter.params,
          MAX_ANALYTICS_BREAKDOWN_ROWS
        )
        .toArray()
        .map(mapAnalyticsPartnerClickRow);

      const partnerOrders = this.sql
        .exec(
          `SELECT partner_account_id,
                  MAX(partner_code) AS partner_code,
                  COUNT(*) AS attributed_orders,
                  SUM(CASE WHEN referral_status = 'earned' THEN 1 ELSE 0 END) AS earned_orders,
                  SUM(CASE WHEN referral_status = 'voided' THEN 1 ELSE 0 END) AS voided_orders,
                  SUM(CASE WHEN referral_status = 'earned' THEN order_subtotal_cents ELSE 0 END) AS earned_revenue_cents,
                  SUM(CASE WHEN referral_status = 'earned' THEN commission_amount_cents ELSE 0 END) AS earned_commission_cents
           FROM partner_referrals
           ${referralFilter.where}
           GROUP BY partner_account_id
           ORDER BY attributed_orders DESC, partner_code ASC
           LIMIT ?`,
          ...referralFilter.params,
          MAX_ANALYTICS_BREAKDOWN_ROWS
        )
        .toArray()
        .map(mapAnalyticsPartnerOrderRow);

      byPartner = mergeAnalyticsBreakdown(
        partnerClicks,
        partnerOrders,
        (row) => row.partnerAccountId || row.partnerCode
      );
    }

    return {
      period: periodInfo,
      filters: {
        accountId,
        partnerCode,
        campaignSlug,
      },
      summary: combineAnalyticsMetrics(clickSummary, referralSummary),
      byCampaign: mergeAnalyticsBreakdown(
        campaignClicks,
        campaignOrders,
        (row) => row.campaignSlug || "__general__"
      ),
      byChannel: mergeAnalyticsBreakdown(
        channelClicks,
        channelOrders,
        (row) => row.channel || "untracked"
      ),
      byPartner,
      daily: mergeAnalyticsBreakdown(
        dailyClicks,
        dailyOrders,
        (row) => row.day
      ).sort((left, right) => left.day.localeCompare(right.day)),
    };
  }

  getPartnerSummary(url) {
    const accountId = cleanText(url.searchParams.get("accountId"), 150);

    if (!accountId) {
      throw new RegistryError("A partner account ID is required.", 400);
    }

    const application = this.findApplication(accountId);
    const payoutSettings = this.readPayoutSettings();

    if (!application) {
      return jsonResponse({
        success: true,
        application: null,
        summary: {
          ...emptyReferralSummary(),
          minimumPayoutCents: payoutSettings.minimumPayoutCents,
          payoutEligible: false,
          amountUntilEligibleCents: payoutSettings.minimumPayoutCents,
        },
        referrals: [],
        payouts: [],
        payoutSettings,
      });
    }

    const summaryRows = this.sql
      .exec(
        `SELECT
           COUNT(*) AS total_count,
           SUM(CASE WHEN r.referral_status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
           SUM(CASE WHEN r.referral_status = 'earned' THEN 1 ELSE 0 END) AS earned_count,
           SUM(CASE WHEN r.referral_status = 'voided' THEN 1 ELSE 0 END) AS voided_count,
           SUM(CASE WHEN r.referral_status = 'pending' THEN r.commission_amount_cents ELSE 0 END) AS pending_commission_cents,
           SUM(CASE WHEN r.referral_status = 'earned' THEN r.commission_amount_cents ELSE 0 END) AS earned_commission_cents,
           SUM(CASE WHEN r.referral_status = 'voided' THEN r.commission_amount_cents ELSE 0 END) AS voided_commission_cents,
           SUM(CASE WHEN r.referral_status = 'earned' THEN r.order_subtotal_cents ELSE 0 END) AS earned_revenue_cents,
           SUM(CASE WHEN r.referral_status = 'earned' AND pi.order_id IS NULL THEN 1 ELSE 0 END) AS available_referral_count,
           SUM(CASE WHEN r.referral_status = 'earned' AND pi.order_id IS NULL THEN r.commission_amount_cents ELSE 0 END) AS available_commission_cents,
           SUM(CASE WHEN pi.order_id IS NOT NULL THEN 1 ELSE 0 END) AS paid_referral_count,
           SUM(CASE WHEN pi.order_id IS NOT NULL THEN pi.commission_amount_cents ELSE 0 END) AS paid_commission_cents,
           SUM(CASE WHEN r.referral_status = 'voided' AND pi.order_id IS NOT NULL THEN 1 ELSE 0 END) AS adjustment_required_count
         FROM partner_referrals r
         LEFT JOIN partner_payout_items pi
           ON pi.order_id = r.order_id
         WHERE r.partner_account_id = ?`,
        accountId
      )
      .toArray();

    const baseSummary = mapSummaryRow(summaryRows[0]);
    const minimumPayoutCents = payoutSettings.minimumPayoutCents;
    const payoutEligible =
      baseSummary.availableReferralCount > 0 &&
      baseSummary.availableCommissionCents >= minimumPayoutCents;

    const summary = {
      ...baseSummary,
      minimumPayoutCents,
      payoutEligible,
      amountUntilEligibleCents: payoutEligible
        ? 0
        : Math.max(
            0,
            minimumPayoutCents - baseSummary.availableCommissionCents
          ),
    };

    const referrals = this.sql
      .exec(
        `SELECT
           r.*,
           pi.payout_id,
           p.payout_type,
           p.payment_method,
           p.reference_number AS payout_reference_number,
           p.paid_at AS payout_paid_at,
           p.created_at AS payout_created_at
         FROM partner_referrals r
         LEFT JOIN partner_payout_items pi
           ON pi.order_id = r.order_id
         LEFT JOIN partner_payouts p
           ON p.payout_id = pi.payout_id
         WHERE r.partner_account_id = ?
         ORDER BY r.created_at DESC
         LIMIT ?`,
        accountId,
        MAX_REFERRAL_HISTORY
      )
      .toArray()
      .map(mapCustomerReferralRow);

    return jsonResponse({
      success: true,
      application,
      summary,
      referrals,
      payouts: this.listPayoutRecords(accountId),
      payoutSettings,
    });
  }

  getPartnerPayouts(url) {
    const accountId = cleanText(url.searchParams.get("accountId"), 150);

    if (!accountId) {
      throw new RegistryError("A partner account ID is required.", 400);
    }

    const application = this.findApplication(accountId);
    const payoutSettings = this.readPayoutSettings();

    return jsonResponse({
      success: true,
      application,
      payouts: application ? this.listPayoutRecords(accountId) : [],
      payoutSettings,
    });
  }

  listApplications() {
    const applications = this.sql
      .exec(
        `SELECT *
         FROM partner_applications
         ORDER BY
           CASE status
             WHEN 'pending' THEN 0
             WHEN 'approved' THEN 1
             WHEN 'suspended' THEN 2
             ELSE 3
           END,
           submitted_at DESC`
      )
      .toArray()
      .map(mapApplicationRow);

    return jsonResponse({
      success: true,
      applications,
      records: applications,
      count: applications.length,
    });
  }

  async updateApplication(request) {
    const payload = await readJson(request);
    const action = cleanText(payload.action, 30).toLowerCase();
    const accountId = cleanText(payload.accountId, 150);
    const reviewedBy = cleanText(
      payload.reviewedBy || "authorized administrator",
      254
    );
    const customerMessage = cleanMultilineText(payload.customerMessage, 1000);
    const adminNotes = cleanMultilineText(payload.adminNotes, 2000);

    if (!ADMIN_ACTIONS.has(action)) {
      throw new RegistryError("Choose a valid partner action.", 400);
    }

    if (!accountId) {
      throw new RegistryError("A customer account ID is required.", 400);
    }

    if (["deny", "suspend"].includes(action) && !customerMessage) {
      throw new RegistryError(
        action === "deny"
          ? "Enter a customer-facing reason before denying the application."
          : "Enter a customer-facing reason before suspending the partner.",
        400
      );
    }

    const now = new Date().toISOString();
    let savedApplication;

    this.ctx.storage.transactionSync(() => {
      const current = this.findApplication(accountId);

      if (!current) {
        throw new RegistryError("Partner application not found.", 404);
      }

      if (action === "approve") {
        this.requireStatus(current, "pending", "approved");
        this.requireOwnedReservation(current);

        this.sql.exec(
          `UPDATE partner_applications
           SET status = 'approved',
               reviewed_at = ?,
               reviewed_by = ?,
               customer_message = ?,
               admin_notes = ?,
               updated_at = ?,
               last_status_change_at = ?
           WHERE account_id = ?`,
          now,
          reviewedBy,
          customerMessage,
          adminNotes,
          now,
          now,
          accountId
        );

        this.setReservationStatus(accountId, "approved", now);
      }

      if (action === "deny") {
        this.requireStatus(current, "pending", "denied");

        this.sql.exec(
          "DELETE FROM partner_code_reservations WHERE account_id = ?",
          accountId
        );

        this.sql.exec(
          `UPDATE partner_applications
           SET status = 'denied',
               reviewed_at = ?,
               reviewed_by = ?,
               customer_message = ?,
               admin_notes = ?,
               denied_at = ?,
               updated_at = ?,
               last_status_change_at = ?
           WHERE account_id = ?`,
          now,
          reviewedBy,
          customerMessage,
          adminNotes,
          now,
          now,
          now,
          accountId
        );
      }

      if (action === "suspend") {
        this.requireStatus(current, "approved", "suspended");

        this.sql.exec(
          `UPDATE partner_applications
           SET status = 'suspended',
               reviewed_at = ?,
               reviewed_by = ?,
               customer_message = ?,
               admin_notes = ?,
               suspended_at = ?,
               updated_at = ?,
               last_status_change_at = ?
           WHERE account_id = ?`,
          now,
          reviewedBy,
          customerMessage,
          adminNotes,
          now,
          now,
          now,
          accountId
        );

        this.setReservationStatus(accountId, "suspended", now);
      }

      if (action === "reactivate") {
        this.requireStatus(current, "suspended", "reactivated");
        this.requireOwnedReservation(current);

        this.sql.exec(
          `UPDATE partner_applications
           SET status = 'approved',
               reviewed_at = ?,
               reviewed_by = ?,
               customer_message = ?,
               admin_notes = ?,
               reactivated_at = ?,
               updated_at = ?,
               last_status_change_at = ?
           WHERE account_id = ?`,
          now,
          reviewedBy,
          customerMessage,
          adminNotes,
          now,
          now,
          now,
          accountId
        );

        this.setReservationStatus(accountId, "approved", now);
      }

      savedApplication = this.findApplication(accountId);
    });

    return jsonResponse({
      success: true,
      action,
      application: savedApplication,
      message: actionMessage(action),
    });
  }

  async updateCommissionRate(request) {
    const payload = await readJson(request);
    const accountId = cleanText(payload.accountId, 150);
    const commissionRateBps = normalizeCommissionRate(payload.commissionRateBps);

    if (!accountId) {
      throw new RegistryError("A partner account ID is required.", 400);
    }

    const application = this.findApplication(accountId);

    if (!application) {
      throw new RegistryError("Partner application not found.", 404);
    }

    const now = new Date().toISOString();

    this.sql.exec(
      `UPDATE partner_applications
       SET commission_rate_bps = ?,
           updated_at = ?
       WHERE account_id = ?`,
      commissionRateBps,
      now,
      accountId
    );

    return jsonResponse({
      success: true,
      application: this.findApplication(accountId),
      message:
        "The partner commission rate was updated for future referrals.",
    });
  }

  listAllReferrals() {
    const referrals = this.sql
      .exec(
        `SELECT
           r.*,
           a.email AS partner_email,
           a.first_name AS partner_first_name,
           a.last_name AS partner_last_name,
           pi.payout_id,
           p.payout_type,
           p.payment_method,
           p.reference_number AS payout_reference_number,
           p.paid_at AS payout_paid_at,
           p.created_at AS payout_created_at
         FROM partner_referrals r
         LEFT JOIN partner_applications a
           ON a.account_id = r.partner_account_id
         LEFT JOIN partner_payout_items pi
           ON pi.order_id = r.order_id
         LEFT JOIN partner_payouts p
           ON p.payout_id = pi.payout_id
         ORDER BY r.created_at DESC`
      )
      .toArray()
      .map(mapAdminReferralRow);

    return jsonResponse({
      success: true,
      referrals,
      records: referrals,
      count: referrals.length,
    });
  }

  getPayoutSettings() {
    return jsonResponse({
      success: true,
      settings: this.readPayoutSettings(),
    });
  }

  async updatePayoutSettings(request) {
    const payload = await readJson(request);
    const minimumPayoutCents = normalizePayoutThreshold(
      payload.minimumPayoutCents
    );
    const updatedBy = cleanText(
      payload.updatedBy || "authorized administrator",
      254
    );
    const now = new Date().toISOString();

    this.sql.exec(
      `INSERT INTO partner_program_settings (
         setting_key,
         setting_value,
         updated_at,
         updated_by
       ) VALUES (
         'minimum_payout_cents',
         ?,
         ?,
         ?
       )
       ON CONFLICT(setting_key) DO UPDATE SET
         setting_value = excluded.setting_value,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
      String(minimumPayoutCents),
      now,
      updatedBy
    );

    return jsonResponse({
      success: true,
      settings: this.readPayoutSettings(),
      message: "The minimum partner payout threshold was updated.",
    });
  }

  listAllPayouts() {
    const payouts = this.listPayoutRecords();

    return jsonResponse({
      success: true,
      payouts,
      records: payouts,
      count: payouts.length,
      settings: this.readPayoutSettings(),
    });
  }

  async createPayout(request) {
    const payload = await readJson(request);
    const accountId = cleanText(payload.accountId, 150);
    const payoutType = cleanText(payload.payoutType, 40).toLowerCase();
    const paymentMethod = cleanText(payload.paymentMethod, 100);
    const referenceNumber = cleanText(payload.referenceNumber, 150);
    const partnerNote = cleanMultilineText(payload.partnerNote, 1000);
    const adminNotes = cleanMultilineText(payload.adminNotes, 2000);
    const createdBy = cleanText(
      payload.createdBy || "authorized administrator",
      254
    );
    const paidAt = normalizePayoutDate(payload.paidAt);
    const requestedOrderIds = normalizeOptionalOrderIds(payload.orderIds);

    if (!accountId) {
      throw new RegistryError("A partner account ID is required.", 400);
    }

    if (!PAYOUT_TYPES.has(payoutType)) {
      throw new RegistryError(
        "Choose cash or store credit as the payout type.",
        400
      );
    }

    if (!paymentMethod) {
      throw new RegistryError("A payout method is required.", 400);
    }

    const application = this.findApplication(accountId);

    if (!application) {
      throw new RegistryError("Partner application not found.", 404);
    }

    const eligibleRows = this.sql
      .exec(
        `SELECT r.*
         FROM partner_referrals r
         LEFT JOIN partner_payout_items pi
           ON pi.order_id = r.order_id
         WHERE r.partner_account_id = ?
           AND r.referral_status = 'earned'
           AND pi.order_id IS NULL
         ORDER BY r.earned_at ASC, r.created_at ASC`,
        accountId
      )
      .toArray()
      .map(mapReferralRow);

    let selectedReferrals = eligibleRows;

    if (requestedOrderIds.length > 0) {
      const requestedSet = new Set(requestedOrderIds);

      selectedReferrals = eligibleRows.filter((referral) =>
        requestedSet.has(referral.orderId)
      );

      if (selectedReferrals.length !== requestedSet.size) {
        throw new RegistryError(
          "One or more selected referrals are not earned, belong to another partner, or were already paid.",
          409
        );
      }
    }

    if (selectedReferrals.length === 0) {
      throw new RegistryError(
        "This partner does not have unpaid earned commissions.",
        409
      );
    }

    const amountCents = selectedReferrals.reduce(
      (total, referral) => total + referral.commissionAmountCents,
      0
    );
    const settings = this.readPayoutSettings();

    if (amountCents < settings.minimumPayoutCents) {
      throw new RegistryError(
        `This payout is below the current minimum threshold of ${formatCentsForMessage(
          settings.minimumPayoutCents
        )}.`,
        409
      );
    }

    const payoutId = createPayoutId();
    const createdAt = new Date().toISOString();

    try {
      this.ctx.storage.transactionSync(() => {
        for (const referral of selectedReferrals) {
          const currentReferral = this.findReferral(referral.orderId);
          const existingItem = this.findPayoutItem(referral.orderId);

          if (
            !currentReferral ||
            currentReferral.partnerAccountId !== accountId ||
            currentReferral.referralStatus !== "earned" ||
            existingItem
          ) {
            throw new RegistryError(
              "A selected referral changed before the payout was saved. Refresh Partner HQ and try again.",
              409
            );
          }
        }

        this.sql.exec(
          `INSERT INTO partner_payouts (
             payout_id,
             partner_account_id,
             partner_code,
             partner_email,
             amount_cents,
             referral_count,
             payout_type,
             payment_method,
             reference_number,
             partner_note,
             admin_notes,
             paid_at,
             created_at,
             created_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          payoutId,
          accountId,
          application.code,
          application.email,
          amountCents,
          selectedReferrals.length,
          payoutType,
          paymentMethod,
          referenceNumber,
          partnerNote,
          adminNotes,
          paidAt,
          createdAt,
          createdBy
        );

        for (const referral of selectedReferrals) {
          this.sql.exec(
            `INSERT INTO partner_payout_items (
               order_id,
               payout_id,
               commission_amount_cents,
               created_at
             ) VALUES (?, ?, ?, ?)`,
            referral.orderId,
            payoutId,
            referral.commissionAmountCents,
            createdAt
          );
        }
      });
    } catch (error) {
      if (error instanceof RegistryError) {
        throw error;
      }

      if (/unique constraint failed/i.test(String(error?.message || error))) {
        throw new RegistryError(
          "One or more selected referrals were already included in a payout.",
          409
        );
      }

      throw error;
    }

    return jsonResponse(
      {
        success: true,
        payout: this.findPayout(payoutId),
        message:
          "The partner payout was recorded and the referrals were marked paid.",
      },
      201
    );
  }

  getPartnerLeaderboard(url) {
    const accountId = cleanText(url.searchParams.get("accountId"), 150);
    const periodType = normalizePeriodType(
      url.searchParams.get("periodType") || "monthly"
    );
    const periodKey = normalizePeriodKey(
      periodType,
      url.searchParams.get("periodKey") || currentPeriodKey(periodType)
    );

    if (!accountId) {
      throw new RegistryError("A partner account ID is required.", 400);
    }

    const settings = this.readLeaderboardSettings();
    const leaderboard = this.buildLeaderboard(
      periodType,
      periodKey,
      settings.leaderboardMetric
    );
    const currentPartner =
      leaderboard.entries.find((entry) => entry.accountId === accountId) || null;

    return jsonResponse({
      success: true,
      period: leaderboard.period,
      settings: customerLeaderboardSettings(settings),
      entries: leaderboard.entries
        .slice(0, 25)
        .map(toCustomerLeaderboardEntry),
      currentPartner: currentPartner
        ? toCustomerOwnLeaderboardEntry(currentPartner)
        : null,
      reward: toCustomerRewardRecord(
        this.findRewardByPeriod(periodType, periodKey)
      ),
      rewards: this.listRewardRecords(accountId).map(toCustomerRewardRecord),
    });
  }

  getAdminLeaderboard(url) {
    const periodType = normalizePeriodType(
      url.searchParams.get("periodType") || "monthly"
    );
    const periodKey = normalizePeriodKey(
      periodType,
      url.searchParams.get("periodKey") || currentPeriodKey(periodType)
    );
    const settings = this.readLeaderboardSettings();
    const leaderboard = this.buildLeaderboard(
      periodType,
      periodKey,
      settings.leaderboardMetric
    );

    return jsonResponse({
      success: true,
      period: leaderboard.period,
      settings,
      entries: leaderboard.entries,
      reward: this.findRewardByPeriod(periodType, periodKey),
    });
  }

  getLeaderboardSettings() {
    return jsonResponse({
      success: true,
      settings: this.readLeaderboardSettings(),
    });
  }

  async updateLeaderboardSettings(request) {
    const payload = await readJson(request);
    const settings = normalizeLeaderboardSettings(payload);
    const updatedBy = cleanText(
      payload.updatedBy || "authorized administrator",
      254
    );
    const now = new Date().toISOString();

    this.ctx.storage.transactionSync(() => {
      for (const [key, value] of Object.entries({
        leaderboard_metric: settings.leaderboardMetric,
        monthly_reward_enabled: settings.monthlyRewardEnabled ? "1" : "0",
        monthly_reward_type: settings.monthlyRewardType,
        monthly_reward_amount_cents: String(settings.monthlyRewardAmountCents),
        monthly_minimum_referrals: String(settings.monthlyMinimumReferrals),
        quarterly_reward_enabled: settings.quarterlyRewardEnabled ? "1" : "0",
        quarterly_reward_type: settings.quarterlyRewardType,
        quarterly_reward_amount_cents: String(settings.quarterlyRewardAmountCents),
        quarterly_reward_description: settings.quarterlyRewardDescription,
        quarterly_minimum_referrals: String(settings.quarterlyMinimumReferrals),
      })) {
        this.sql.exec(
          `INSERT INTO partner_program_settings (
             setting_key, setting_value, updated_at, updated_by
           ) VALUES (?, ?, ?, ?)
           ON CONFLICT(setting_key) DO UPDATE SET
             setting_value = excluded.setting_value,
             updated_at = excluded.updated_at,
             updated_by = excluded.updated_by`,
          key,
          value,
          now,
          updatedBy
        );
      }
    });

    return jsonResponse({
      success: true,
      settings: this.readLeaderboardSettings(),
      message: "The leaderboard and reward rules were updated.",
    });
  }

  listAllRewards() {
    const rewards = this.listRewardRecords();

    return jsonResponse({
      success: true,
      rewards,
      records: rewards,
      count: rewards.length,
      settings: this.readLeaderboardSettings(),
    });
  }

  async awardPeriodReward(request) {
    const payload = await readJson(request);
    const periodType = normalizePeriodType(payload.periodType);
    const periodKey = normalizePeriodKey(periodType, payload.periodKey);
    validateNotFuturePeriod(periodType, periodKey);

    const settings = this.readLeaderboardSettings();
    const rewardConfig = getRewardConfig(settings, periodType);

    if (!rewardConfig.enabled) {
      throw new RegistryError(
        `The ${periodType} reward is currently disabled.`,
        409
      );
    }

    if (this.findRewardByPeriod(periodType, periodKey)) {
      throw new RegistryError(
        `A reward has already been recorded for ${periodKey}.`,
        409
      );
    }

    const leaderboard = this.buildLeaderboard(
      periodType,
      periodKey,
      settings.leaderboardMetric
    );
    const winner = leaderboard.entries.find((entry) => entry.eligible);

    if (!winner) {
      throw new RegistryError(
        `No partner met the ${rewardConfig.minimumReferrals}-referral minimum for ${periodKey}.`,
        409
      );
    }

    const rewardType = normalizeRewardType(
      payload.rewardType || rewardConfig.type
    );
    const rewardAmountCents = normalizeRewardAmount(
      payload.rewardAmountCents ?? rewardConfig.amountCents
    );
    const rewardDescription = cleanText(
      payload.rewardDescription || rewardConfig.description,
      500
    );

    if (rewardType === "swag" && !rewardDescription) {
      throw new RegistryError(
        "Enter a description for the swag reward.",
        400
      );
    }

    const awardedBy = cleanText(
      payload.awardedBy || "authorized administrator",
      254
    );
    const partnerNote = cleanMultilineText(payload.partnerNote, 1000);
    const adminNotes = cleanMultilineText(payload.adminNotes, 2000);
    const rewardId = createRewardId(periodType, periodKey);
    const awardedAt = new Date().toISOString();

    this.sql.exec(
      `INSERT INTO partner_rewards (
         reward_id,
         period_type,
         period_key,
         partner_account_id,
         partner_code,
         partner_email,
         leaderboard_metric,
         rank,
         referral_count,
         revenue_cents,
         commission_cents,
         reward_type,
         reward_amount_cents,
         reward_description,
         status,
         awarded_at,
         awarded_by,
         partner_note,
         admin_notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awarded', ?, ?, ?, ?)`,
      rewardId,
      periodType,
      periodKey,
      winner.accountId,
      winner.partnerCode,
      winner.partnerEmail,
      settings.leaderboardMetric,
      winner.rank,
      winner.referralCount,
      winner.revenueCents,
      winner.commissionCents,
      rewardType,
      rewardAmountCents,
      rewardDescription,
      awardedAt,
      awardedBy,
      partnerNote,
      adminNotes
    );

    return jsonResponse(
      {
        success: true,
        reward: this.findReward(rewardId),
        message: `${winner.partnerCode} was recorded as the ${periodKey} ${periodType} leaderboard winner.`,
      },
      201
    );
  }

  async issueReward(request) {
    const payload = await readJson(request);
    const rewardId = cleanText(payload.rewardId, 120);
    const deliveryMethod = cleanText(payload.deliveryMethod, 150);
    const referenceNumber = cleanText(payload.referenceNumber, 150);
    const partnerNote = cleanMultilineText(payload.partnerNote, 1000);
    const adminNotes = cleanMultilineText(payload.adminNotes, 2000);
    const issuedBy = cleanText(
      payload.issuedBy || "authorized administrator",
      254
    );

    if (!rewardId) {
      throw new RegistryError("A reward ID is required.", 400);
    }

    if (!deliveryMethod) {
      throw new RegistryError("A reward delivery method is required.", 400);
    }

    const reward = this.findReward(rewardId);

    if (!reward) {
      throw new RegistryError("Leaderboard reward not found.", 404);
    }

    if (reward.status === "issued") {
      throw new RegistryError("This reward has already been issued.", 409);
    }

    const issuedAt = normalizePayoutDate(payload.issuedAt);

    this.sql.exec(
      `UPDATE partner_rewards
       SET status = 'issued',
           issued_at = ?,
           issued_by = ?,
           delivery_method = ?,
           reference_number = ?,
           partner_note = ?,
           admin_notes = ?
       WHERE reward_id = ?`,
      issuedAt,
      issuedBy,
      deliveryMethod,
      referenceNumber,
      partnerNote || reward.partnerNote,
      adminNotes || reward.adminNotes,
      rewardId
    );

    return jsonResponse({
      success: true,
      reward: this.findReward(rewardId),
      message: "The leaderboard reward was marked as issued.",
    });
  }

  getPartnerCampaigns(url) {
    const accountId = cleanText(url.searchParams.get("accountId"), 150);

    if (!accountId) {
      throw new RegistryError("A partner account ID is required.", 400);
    }

    const application = this.findApplication(accountId);

    if (!application || application.status !== "approved") {
      return jsonResponse({
        success: true,
        application,
        campaigns: [],
      });
    }

    const campaigns = this.listCampaignRows({ activeOnly: true }).map(
      toCustomerCampaign
    );

    return jsonResponse({
      success: true,
      application,
      campaigns,
    });
  }

  validateCampaign(url) {
    const slug = normalizeOptionalCampaignSlug(url.searchParams.get("slug"));

    if (!slug) {
      throw new RegistryError("A campaign slug is required.", 400);
    }

    const campaign = this.findActiveCampaignBySlug(slug);

    return jsonResponse({
      success: true,
      valid: Boolean(campaign),
      campaign: campaign ? toCustomerCampaign(campaign) : null,
      message: campaign
        ? "The marketing campaign is active."
        : "That marketing campaign is no longer active.",
    });
  }

  listAdminCampaigns() {
    const campaigns = this.listCampaignRows({ activeOnly: false });

    return jsonResponse({
      success: true,
      campaigns,
      records: campaigns,
      count: campaigns.length,
    });
  }

  async saveCampaign(request) {
    const payload = await readJson(request);
    const campaignId = cleanText(payload.campaignId, 120);
    const existing = campaignId ? this.findCampaign(campaignId) : null;

    if (campaignId && !existing) {
      throw new RegistryError("Marketing campaign not found.", 404);
    }

    const campaign = normalizeCampaign(payload, existing);
    const updatedBy = cleanText(
      payload.updatedBy || "authorized administrator",
      254
    );
    const now = new Date().toISOString();

    try {
      this.ctx.storage.transactionSync(() => {
        if (existing) {
          this.sql.exec(
            `UPDATE partner_campaigns
             SET slug = ?,
                 title = ?,
                 summary = ?,
                 headline = ?,
                 facebook_copy = ?,
                 instagram_copy = ?,
                 tiktok_copy = ?,
                 sms_copy = ?,
                 email_subject = ?,
                 email_copy = ?,
                 image_url = ?,
                 download_url = ?,
                 disclaimer = ?,
                 cta_label = ?,
                 destination_path = ?,
                 starts_at = ?,
                 ends_at = ?,
                 display_order = ?,
                 updated_at = ?,
                 updated_by = ?
             WHERE campaign_id = ?`,
            campaign.slug,
            campaign.title,
            campaign.summary,
            campaign.headline,
            campaign.facebookCopy,
            campaign.instagramCopy,
            campaign.tiktokCopy,
            campaign.smsCopy,
            campaign.emailSubject,
            campaign.emailCopy,
            campaign.imageUrl,
            campaign.downloadUrl,
            campaign.disclaimer,
            campaign.ctaLabel,
            campaign.destinationPath,
            campaign.startsAt,
            campaign.endsAt,
            campaign.displayOrder,
            now,
            updatedBy,
            existing.campaignId
          );
        } else {
          const newCampaignId = createCampaignId();

          this.sql.exec(
            `INSERT INTO partner_campaigns (
               campaign_id,
               slug,
               title,
               status,
               summary,
               headline,
               facebook_copy,
               instagram_copy,
               tiktok_copy,
               sms_copy,
               email_subject,
               email_copy,
               image_url,
               download_url,
               disclaimer,
               cta_label,
               destination_path,
               starts_at,
               ends_at,
               display_order,
               created_at,
               created_by,
               updated_at,
               updated_by
             ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            newCampaignId,
            campaign.slug,
            campaign.title,
            campaign.summary,
            campaign.headline,
            campaign.facebookCopy,
            campaign.instagramCopy,
            campaign.tiktokCopy,
            campaign.smsCopy,
            campaign.emailSubject,
            campaign.emailCopy,
            campaign.imageUrl,
            campaign.downloadUrl,
            campaign.disclaimer,
            campaign.ctaLabel,
            campaign.destinationPath,
            campaign.startsAt,
            campaign.endsAt,
            campaign.displayOrder,
            now,
            updatedBy,
            now,
            updatedBy
          );
        }
      });
    } catch (error) {
      if (/unique constraint failed/i.test(String(error?.message || error))) {
        throw new RegistryError(
          "That campaign slug is already in use. Choose another slug.",
          409
        );
      }

      throw error;
    }

    const saved = existing
      ? this.findCampaign(existing.campaignId)
      : this.findCampaignBySlug(campaign.slug);

    return jsonResponse(
      {
        success: true,
        campaign: saved,
        message: existing
          ? "The marketing campaign draft was updated."
          : "The marketing campaign draft was created.",
      },
      existing ? 200 : 201
    );
  }

  async updateCampaignStatus(request) {
    const payload = await readJson(request);
    const campaignId = cleanText(payload.campaignId, 120);
    const status = normalizeCampaignStatus(payload.status);
    const changedBy = cleanText(
      payload.changedBy || "authorized administrator",
      254
    );

    if (!campaignId) {
      throw new RegistryError("A campaign ID is required.", 400);
    }

    const campaign = this.findCampaign(campaignId);

    if (!campaign) {
      throw new RegistryError("Marketing campaign not found.", 404);
    }

    if (status === "published") {
      validateCampaignForPublishing(campaign);
    }

    const now = new Date().toISOString();
    const publishedAt =
      status === "published" ? campaign.publishedAt || now : campaign.publishedAt;
    const publishedBy =
      status === "published" ? changedBy : campaign.publishedBy;
    const archivedAt = status === "archived" ? now : "";
    const archivedBy = status === "archived" ? changedBy : "";

    this.sql.exec(
      `UPDATE partner_campaigns
       SET status = ?,
           updated_at = ?,
           updated_by = ?,
           published_at = ?,
           published_by = ?,
           archived_at = ?,
           archived_by = ?
       WHERE campaign_id = ?`,
      status,
      now,
      changedBy,
      publishedAt,
      publishedBy,
      archivedAt,
      archivedBy,
      campaignId
    );

    return jsonResponse({
      success: true,
      campaign: this.findCampaign(campaignId),
      message:
        status === "published"
          ? "The marketing campaign is now published to approved partners."
          : status === "archived"
          ? "The marketing campaign was removed from the Partner Marketing Center."
          : "The marketing campaign was returned to draft status.",
    });
  }

  listCampaignRows({ activeOnly = false } = {}) {
    const now = new Date().toISOString();
    const rows = activeOnly
      ? this.sql
          .exec(
            `SELECT c.*,
                    COUNT(r.order_id) AS referral_count,
                    SUM(CASE WHEN r.referral_status = 'earned' THEN 1 ELSE 0 END) AS earned_referral_count,
                    SUM(CASE WHEN r.referral_status = 'earned' THEN r.order_subtotal_cents ELSE 0 END) AS earned_revenue_cents,
                    SUM(CASE WHEN r.referral_status = 'earned' THEN r.commission_amount_cents ELSE 0 END) AS earned_commission_cents
             FROM partner_campaigns c
             LEFT JOIN partner_referrals r
               ON r.campaign_id = c.campaign_id
             WHERE c.status = 'published'
               AND (c.starts_at = '' OR c.starts_at <= ?)
               AND (c.ends_at = '' OR c.ends_at > ?)
             GROUP BY c.campaign_id
             ORDER BY c.display_order ASC, c.published_at DESC, c.updated_at DESC
             LIMIT ?`,
            now,
            now,
            MAX_CAMPAIGN_HISTORY
          )
          .toArray()
      : this.sql
          .exec(
            `SELECT c.*,
                    COUNT(r.order_id) AS referral_count,
                    SUM(CASE WHEN r.referral_status = 'earned' THEN 1 ELSE 0 END) AS earned_referral_count,
                    SUM(CASE WHEN r.referral_status = 'earned' THEN r.order_subtotal_cents ELSE 0 END) AS earned_revenue_cents,
                    SUM(CASE WHEN r.referral_status = 'earned' THEN r.commission_amount_cents ELSE 0 END) AS earned_commission_cents
             FROM partner_campaigns c
             LEFT JOIN partner_referrals r
               ON r.campaign_id = c.campaign_id
             GROUP BY c.campaign_id
             ORDER BY
               CASE c.status
                 WHEN 'published' THEN 0
                 WHEN 'draft' THEN 1
                 ELSE 2
               END,
               c.display_order ASC,
               c.updated_at DESC
             LIMIT ?`,
            MAX_CAMPAIGN_HISTORY
          )
          .toArray();

    return rows.map(mapCampaignRow);
  }

  findCampaign(campaignId) {
    const rows = this.sql
      .exec(
        `SELECT c.*,
                COUNT(r.order_id) AS referral_count,
                SUM(CASE WHEN r.referral_status = 'earned' THEN 1 ELSE 0 END) AS earned_referral_count,
                SUM(CASE WHEN r.referral_status = 'earned' THEN r.order_subtotal_cents ELSE 0 END) AS earned_revenue_cents,
                SUM(CASE WHEN r.referral_status = 'earned' THEN r.commission_amount_cents ELSE 0 END) AS earned_commission_cents
         FROM partner_campaigns c
         LEFT JOIN partner_referrals r
           ON r.campaign_id = c.campaign_id
         WHERE c.campaign_id = ?
         GROUP BY c.campaign_id
         LIMIT 1`,
        campaignId
      )
      .toArray();

    return rows.length ? mapCampaignRow(rows[0]) : null;
  }

  findCampaignBySlug(slug) {
    const rows = this.sql
      .exec(
        `SELECT c.*,
                COUNT(r.order_id) AS referral_count,
                SUM(CASE WHEN r.referral_status = 'earned' THEN 1 ELSE 0 END) AS earned_referral_count,
                SUM(CASE WHEN r.referral_status = 'earned' THEN r.order_subtotal_cents ELSE 0 END) AS earned_revenue_cents,
                SUM(CASE WHEN r.referral_status = 'earned' THEN r.commission_amount_cents ELSE 0 END) AS earned_commission_cents
         FROM partner_campaigns c
         LEFT JOIN partner_referrals r
           ON r.campaign_id = c.campaign_id
         WHERE c.slug = ? COLLATE NOCASE
         GROUP BY c.campaign_id
         LIMIT 1`,
        slug
      )
      .toArray();

    return rows.length ? mapCampaignRow(rows[0]) : null;
  }

  findActiveCampaignBySlug(slug) {
    const campaign = this.findCampaignBySlug(slug);
    return campaign && isCampaignActive(campaign) ? campaign : null;
  }

  buildLeaderboard(periodType, periodKey, metric) {
    const period = periodBounds(periodType, periodKey);
    const settings = this.readLeaderboardSettings();
    const minimumReferrals =
      periodType === "monthly"
        ? settings.monthlyMinimumReferrals
        : settings.quarterlyMinimumReferrals;

    const rows = this.sql
      .exec(
        `SELECT
           r.partner_account_id,
           a.code AS partner_code,
           a.email AS partner_email,
           a.first_name AS partner_first_name,
           a.last_name AS partner_last_name,
           COUNT(*) AS referral_count,
           SUM(r.order_subtotal_cents) AS revenue_cents,
           SUM(r.commission_amount_cents) AS commission_cents,
           MIN(r.earned_at) AS first_earned_at,
           MAX(r.earned_at) AS last_earned_at
         FROM partner_referrals r
         INNER JOIN partner_applications a
           ON a.account_id = r.partner_account_id
         WHERE r.referral_status = 'earned'
           AND r.earned_at >= ?
           AND r.earned_at < ?
           AND a.status = 'approved'
         GROUP BY
           r.partner_account_id,
           a.code,
           a.email,
           a.first_name,
           a.last_name`,
        period.startAt,
        period.endAt
      )
      .toArray()
      .map(mapLeaderboardRow);

    rows.sort((left, right) => compareLeaderboardEntries(left, right, metric));

    const entries = rows.slice(0, MAX_LEADERBOARD_ENTRIES).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      eligible: entry.referralCount >= minimumReferrals,
      metric,
      score: leaderboardScore(entry, metric),
    }));

    return {
      period: {
        periodType,
        periodKey,
        startAt: period.startAt,
        endAt: period.endAt,
        minimumReferrals,
        metric,
      },
      entries,
    };
  }

  readLeaderboardSettings() {
    const values = this.readProgramSettings([
      "leaderboard_metric",
      "monthly_reward_enabled",
      "monthly_reward_type",
      "monthly_reward_amount_cents",
      "monthly_minimum_referrals",
      "quarterly_reward_enabled",
      "quarterly_reward_type",
      "quarterly_reward_amount_cents",
      "quarterly_reward_description",
      "quarterly_minimum_referrals",
    ]);

    return {
      leaderboardMetric: LEADERBOARD_METRICS.has(values.leaderboard_metric?.value)
        ? values.leaderboard_metric.value
        : DEFAULT_LEADERBOARD_METRIC,
      monthlyRewardEnabled: parseStoredBoolean(
        values.monthly_reward_enabled?.value,
        DEFAULT_MONTHLY_REWARD_ENABLED
      ),
      monthlyRewardType: REWARD_TYPES.has(values.monthly_reward_type?.value)
        ? values.monthly_reward_type.value
        : DEFAULT_MONTHLY_REWARD_TYPE,
      monthlyRewardAmountCents: parseStoredInteger(
        values.monthly_reward_amount_cents?.value,
        DEFAULT_MONTHLY_REWARD_AMOUNT_CENTS,
        0,
        MAX_REWARD_AMOUNT_CENTS
      ),
      monthlyMinimumReferrals: parseStoredInteger(
        values.monthly_minimum_referrals?.value,
        DEFAULT_MONTHLY_MINIMUM_REFERRALS,
        1,
        1000
      ),
      quarterlyRewardEnabled: parseStoredBoolean(
        values.quarterly_reward_enabled?.value,
        DEFAULT_QUARTERLY_REWARD_ENABLED
      ),
      quarterlyRewardType: REWARD_TYPES.has(values.quarterly_reward_type?.value)
        ? values.quarterly_reward_type.value
        : DEFAULT_QUARTERLY_REWARD_TYPE,
      quarterlyRewardAmountCents: parseStoredInteger(
        values.quarterly_reward_amount_cents?.value,
        DEFAULT_QUARTERLY_REWARD_AMOUNT_CENTS,
        0,
        MAX_REWARD_AMOUNT_CENTS
      ),
      quarterlyRewardDescription: cleanText(
        values.quarterly_reward_description?.value ||
          DEFAULT_QUARTERLY_REWARD_DESCRIPTION,
        500
      ),
      quarterlyMinimumReferrals: parseStoredInteger(
        values.quarterly_minimum_referrals?.value,
        DEFAULT_QUARTERLY_MINIMUM_REFERRALS,
        1,
        1000
      ),
      updatedAt: mostRecentSettingValue(values, "updatedAt"),
      updatedBy: mostRecentSettingValue(values, "updatedBy"),
    };
  }

  readProgramSettings(keys) {
    const placeholders = keys.map(() => "?").join(", ");
    const rows = this.sql
      .exec(
        `SELECT setting_key, setting_value, updated_at, updated_by
         FROM partner_program_settings
         WHERE setting_key IN (${placeholders})`,
        ...keys
      )
      .toArray();

    return Object.fromEntries(
      rows.map((row) => [
        row.setting_key,
        {
          value: row.setting_value,
          updatedAt: row.updated_at || "",
          updatedBy: row.updated_by || "",
        },
      ])
    );
  }

  findRewardByPeriod(periodType, periodKey) {
    const rows = this.sql
      .exec(
        `SELECT r.*, a.first_name AS partner_first_name,
                a.last_name AS partner_last_name
         FROM partner_rewards r
         LEFT JOIN partner_applications a
           ON a.account_id = r.partner_account_id
         WHERE r.period_type = ? AND r.period_key = ?
         LIMIT 1`,
        periodType,
        periodKey
      )
      .toArray();

    return rows.length ? mapRewardRow(rows[0]) : null;
  }

  findReward(rewardId) {
    const rows = this.sql
      .exec(
        `SELECT r.*, a.first_name AS partner_first_name,
                a.last_name AS partner_last_name
         FROM partner_rewards r
         LEFT JOIN partner_applications a
           ON a.account_id = r.partner_account_id
         WHERE r.reward_id = ?
         LIMIT 1`,
        rewardId
      )
      .toArray();

    return rows.length ? mapRewardRow(rows[0]) : null;
  }

  listRewardRecords(accountId = "") {
    const rows = accountId
      ? this.sql
          .exec(
            `SELECT r.*, a.first_name AS partner_first_name,
                    a.last_name AS partner_last_name
             FROM partner_rewards r
             LEFT JOIN partner_applications a
               ON a.account_id = r.partner_account_id
             WHERE r.partner_account_id = ?
             ORDER BY r.awarded_at DESC
             LIMIT ?`,
            accountId,
            MAX_REWARD_HISTORY
          )
          .toArray()
      : this.sql
          .exec(
            `SELECT r.*, a.first_name AS partner_first_name,
                    a.last_name AS partner_last_name
             FROM partner_rewards r
             LEFT JOIN partner_applications a
               ON a.account_id = r.partner_account_id
             ORDER BY r.awarded_at DESC
             LIMIT ?`,
            MAX_REWARD_HISTORY
          )
          .toArray();

    return rows.map(mapRewardRow);
  }

  requireStatus(application, expectedStatus, actionLabel) {
    if (application.status !== expectedStatus) {
      throw new RegistryError(
        `Only a ${expectedStatus} application can be ${actionLabel}.`,
        409
      );
    }
  }

  requireOwnedReservation(application) {
    const reservation = this.findReservation(application.code);

    if (!reservation || reservation.accountId !== application.accountId) {
      throw new RegistryError(
        "The selected partner code is no longer reserved for this applicant.",
        409
      );
    }
  }

  setReservationStatus(accountId, status, updatedAt) {
    this.sql.exec(
      `UPDATE partner_code_reservations
       SET status = ?, updated_at = ?
       WHERE account_id = ?`,
      status,
      updatedAt,
      accountId
    );
  }

  findApplication(accountId) {
    const rows = this.sql
      .exec(
        "SELECT * FROM partner_applications WHERE account_id = ? LIMIT 1",
        accountId
      )
      .toArray();

    return rows.length ? mapApplicationRow(rows[0]) : null;
  }

  findActivePartnerByCode(code) {
    const rows = this.sql
      .exec(
        `SELECT a.*
         FROM partner_applications a
         INNER JOIN partner_code_reservations r
           ON r.account_id = a.account_id
          AND r.code = a.code COLLATE NOCASE
         WHERE a.code = ? COLLATE NOCASE
           AND a.status = 'approved'
           AND r.status = 'approved'
         LIMIT 1`,
        code
      )
      .toArray();

    return rows.length ? mapApplicationRow(rows[0]) : null;
  }

  findReservation(code) {
    const rows = this.sql
      .exec(
        `SELECT code, account_id, status, reserved_at, updated_at
         FROM partner_code_reservations
         WHERE code = ? COLLATE NOCASE
         LIMIT 1`,
        code
      )
      .toArray();

    if (!rows.length) {
      return null;
    }

    return {
      code: rows[0].code,
      accountId: rows[0].account_id,
      status: rows[0].status,
      reservedAt: rows[0].reserved_at,
      updatedAt: rows[0].updated_at,
    };
  }

  findReferral(orderId) {
    const rows = this.sql
      .exec(
        `SELECT
           r.*,
           pi.payout_id,
           p.payout_type,
           p.payment_method,
           p.reference_number AS payout_reference_number,
           p.paid_at AS payout_paid_at,
           p.created_at AS payout_created_at
         FROM partner_referrals r
         LEFT JOIN partner_payout_items pi
           ON pi.order_id = r.order_id
         LEFT JOIN partner_payouts p
           ON p.payout_id = pi.payout_id
         WHERE r.order_id = ?
         LIMIT 1`,
        orderId
      )
      .toArray();

    return rows.length ? mapReferralRow(rows[0]) : null;
  }

  findPayoutItem(orderId) {
    const rows = this.sql
      .exec(
        `SELECT order_id, payout_id, commission_amount_cents, created_at
         FROM partner_payout_items
         WHERE order_id = ?
         LIMIT 1`,
        orderId
      )
      .toArray();

    if (!rows.length) {
      return null;
    }

    return {
      orderId: rows[0].order_id,
      payoutId: rows[0].payout_id,
      commissionAmountCents: Number(
        rows[0].commission_amount_cents || 0
      ),
      createdAt: rows[0].created_at || "",
    };
  }

  findPayout(payoutId) {
    const rows = this.sql
      .exec(
        `SELECT
           p.*,
           a.first_name AS partner_first_name,
           a.last_name AS partner_last_name
         FROM partner_payouts p
         LEFT JOIN partner_applications a
           ON a.account_id = p.partner_account_id
         WHERE p.payout_id = ?
         LIMIT 1`,
        payoutId
      )
      .toArray();

    if (!rows.length) {
      return null;
    }

    return this.attachPayoutItems(mapPayoutRow(rows[0]));
  }

  listPayoutRecords(accountId = "") {
    const rows = accountId
      ? this.sql
          .exec(
            `SELECT
               p.*,
               a.first_name AS partner_first_name,
               a.last_name AS partner_last_name
             FROM partner_payouts p
             LEFT JOIN partner_applications a
               ON a.account_id = p.partner_account_id
             WHERE p.partner_account_id = ?
             ORDER BY p.paid_at DESC, p.created_at DESC
             LIMIT ?`,
            accountId,
            MAX_PAYOUT_HISTORY
          )
          .toArray()
      : this.sql
          .exec(
            `SELECT
               p.*,
               a.first_name AS partner_first_name,
               a.last_name AS partner_last_name
             FROM partner_payouts p
             LEFT JOIN partner_applications a
               ON a.account_id = p.partner_account_id
             ORDER BY p.paid_at DESC, p.created_at DESC
             LIMIT ?`,
            MAX_PAYOUT_HISTORY
          )
          .toArray();

    return rows.map((row) => this.attachPayoutItems(mapPayoutRow(row)));
  }

  attachPayoutItems(payout) {
    const items = this.sql
      .exec(
        `SELECT order_id, commission_amount_cents, created_at
         FROM partner_payout_items
         WHERE payout_id = ?
         ORDER BY created_at ASC, order_id ASC`,
        payout.payoutId
      )
      .toArray()
      .map((row) => ({
        orderId: row.order_id,
        commissionAmountCents: Number(
          row.commission_amount_cents || 0
        ),
        createdAt: row.created_at || "",
      }));

    return {
      ...payout,
      orderIds: items.map((item) => item.orderId),
      items,
    };
  }

  readPayoutSettings() {
    const rows = this.sql
      .exec(
        `SELECT setting_value, updated_at, updated_by
         FROM partner_program_settings
         WHERE setting_key = 'minimum_payout_cents'
         LIMIT 1`
      )
      .toArray();

    const rawValue = Number(rows[0]?.setting_value);
    const minimumPayoutCents =
      Number.isInteger(rawValue) &&
      rawValue >= 0 &&
      rawValue <= MAX_PAYOUT_THRESHOLD_CENTS
        ? rawValue
        : DEFAULT_PAYOUT_THRESHOLD_CENTS;

    return {
      minimumPayoutCents,
      updatedAt: rows[0]?.updated_at || "",
      updatedBy: rows[0]?.updated_by || "",
    };
  }
}

function normalizeLeaderboardSettings(payload) {
  const leaderboardMetric = cleanText(
    payload.leaderboardMetric || DEFAULT_LEADERBOARD_METRIC,
    30
  ).toLowerCase();

  if (!LEADERBOARD_METRICS.has(leaderboardMetric)) {
    throw new RegistryError(
      "Choose commission, revenue, or referrals as the leaderboard metric.",
      400
    );
  }

  return {
    leaderboardMetric,
    monthlyRewardEnabled: normalizeBoolean(
      payload.monthlyRewardEnabled,
      DEFAULT_MONTHLY_REWARD_ENABLED
    ),
    monthlyRewardType: normalizeRewardType(
      payload.monthlyRewardType || DEFAULT_MONTHLY_REWARD_TYPE
    ),
    monthlyRewardAmountCents: normalizeRewardAmount(
      payload.monthlyRewardAmountCents ?? DEFAULT_MONTHLY_REWARD_AMOUNT_CENTS
    ),
    monthlyMinimumReferrals: normalizeMinimumReferrals(
      payload.monthlyMinimumReferrals ?? DEFAULT_MONTHLY_MINIMUM_REFERRALS
    ),
    quarterlyRewardEnabled: normalizeBoolean(
      payload.quarterlyRewardEnabled,
      DEFAULT_QUARTERLY_REWARD_ENABLED
    ),
    quarterlyRewardType: normalizeRewardType(
      payload.quarterlyRewardType || DEFAULT_QUARTERLY_REWARD_TYPE
    ),
    quarterlyRewardAmountCents: normalizeRewardAmount(
      payload.quarterlyRewardAmountCents ?? DEFAULT_QUARTERLY_REWARD_AMOUNT_CENTS
    ),
    quarterlyRewardDescription: cleanText(
      payload.quarterlyRewardDescription ||
        DEFAULT_QUARTERLY_REWARD_DESCRIPTION,
      500
    ),
    quarterlyMinimumReferrals: normalizeMinimumReferrals(
      payload.quarterlyMinimumReferrals ??
        DEFAULT_QUARTERLY_MINIMUM_REFERRALS
    ),
  };
}

function normalizePeriodType(value) {
  const periodType = cleanText(value, 20).toLowerCase();

  if (!LEADERBOARD_PERIOD_TYPES.has(periodType)) {
    throw new RegistryError("Choose monthly or quarterly leaderboard data.", 400);
  }

  return periodType;
}

function normalizePeriodKey(periodType, value) {
  const periodKey = cleanText(value, 20).toUpperCase();
  const pattern =
    periodType === "monthly" ? /^\d{4}-(0[1-9]|1[0-2])$/ : /^\d{4}-Q[1-4]$/;

  if (!pattern.test(periodKey)) {
    throw new RegistryError(
      periodType === "monthly"
        ? "The monthly period must use YYYY-MM format."
        : "The quarterly period must use YYYY-Q1 through YYYY-Q4 format.",
      400
    );
  }

  return periodKey;
}

function currentPeriodKey(periodType, date = new Date()) {
  const year = date.getUTCFullYear();

  if (periodType === "quarterly") {
    return `${year}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
  }

  return `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodBounds(periodType, periodKey) {
  if (periodType === "monthly") {
    const [yearText, monthText] = periodKey.split("-");
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1));

    return { startAt: start.toISOString(), endAt: end.toISOString() };
  }

  const [yearText, quarterText] = periodKey.split("-Q");
  const year = Number(yearText);
  const startMonth = (Number(quarterText) - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 1));

  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

function validateNotFuturePeriod(periodType, periodKey) {
  const requested = periodBounds(periodType, periodKey).startAt;
  const current = periodBounds(
    periodType,
    currentPeriodKey(periodType)
  ).startAt;

  if (requested > current) {
    throw new RegistryError("A future leaderboard period cannot be awarded.", 409);
  }
}

function normalizeRewardType(value) {
  const rewardType = cleanText(value, 40).toLowerCase();

  if (!REWARD_TYPES.has(rewardType)) {
    throw new RegistryError(
      "Choose cash, store credit, or swag as the reward type.",
      400
    );
  }

  return rewardType;
}

function normalizeRewardAmount(value) {
  const amount = Number(value);

  if (
    !Number.isInteger(amount) ||
    amount < 0 ||
    amount > MAX_REWARD_AMOUNT_CENTS
  ) {
    throw new RegistryError(
      "Reward amount must be a whole number of cents from $0 to $10,000.",
      400
    );
  }

  return amount;
}

function normalizeMinimumReferrals(value) {
  const minimum = Number(value);

  if (!Number.isInteger(minimum) || minimum < 1 || minimum > 1000) {
    throw new RegistryError(
      "The minimum qualifying referrals must be a whole number from 1 to 1,000.",
      400
    );
  }

  return minimum;
}

function normalizeBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function parseStoredBoolean(value, fallback) {
  return normalizeBoolean(value, fallback);
}

function parseStoredInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum
    ? number
    : fallback;
}

function mostRecentSettingValue(values, field) {
  return Object.values(values)
    .filter((value) => value?.[field])
    .sort((left, right) => String(right[field]).localeCompare(String(left[field])))[0]?.[
    field
  ] || "";
}

function getRewardConfig(settings, periodType) {
  if (periodType === "monthly") {
    return {
      enabled: settings.monthlyRewardEnabled,
      type: settings.monthlyRewardType,
      amountCents: settings.monthlyRewardAmountCents,
      description: "Monthly leaderboard winner reward",
      minimumReferrals: settings.monthlyMinimumReferrals,
    };
  }

  return {
    enabled: settings.quarterlyRewardEnabled,
    type: settings.quarterlyRewardType,
    amountCents: settings.quarterlyRewardAmountCents,
    description: settings.quarterlyRewardDescription,
    minimumReferrals: settings.quarterlyMinimumReferrals,
  };
}

function mapLeaderboardRow(row) {
  return {
    accountId: row.partner_account_id,
    partnerCode: row.partner_code || "",
    partnerEmail: row.partner_email || "",
    partnerFirstName: row.partner_first_name || "",
    partnerLastName: row.partner_last_name || "",
    referralCount: Number(row.referral_count || 0),
    revenueCents: Number(row.revenue_cents || 0),
    commissionCents: Number(row.commission_cents || 0),
    firstEarnedAt: row.first_earned_at || "",
    lastEarnedAt: row.last_earned_at || "",
  };
}

function compareLeaderboardEntries(left, right, metric) {
  const primary = leaderboardScore(right, metric) - leaderboardScore(left, metric);
  if (primary !== 0) return primary;

  const referralDifference = right.referralCount - left.referralCount;
  if (referralDifference !== 0) return referralDifference;

  const revenueDifference = right.revenueCents - left.revenueCents;
  if (revenueDifference !== 0) return revenueDifference;

  const commissionDifference = right.commissionCents - left.commissionCents;
  if (commissionDifference !== 0) return commissionDifference;

  const earnedDifference = String(left.firstEarnedAt).localeCompare(
    String(right.firstEarnedAt)
  );
  if (earnedDifference !== 0) return earnedDifference;

  return String(left.partnerCode).localeCompare(String(right.partnerCode));
}

function leaderboardScore(entry, metric) {
  if (metric === "referrals") return entry.referralCount;
  if (metric === "revenue") return entry.revenueCents;
  return entry.commissionCents;
}

function toCustomerLeaderboardEntry(entry) {
  return {
    rank: entry.rank,
    partnerCode: entry.partnerCode,
    referralCount: entry.referralCount,
    eligible: entry.eligible,
  };
}

function toCustomerOwnLeaderboardEntry(entry) {
  return {
    ...toCustomerLeaderboardEntry(entry),
    revenueCents: entry.revenueCents,
    commissionCents: entry.commissionCents,
    score: entry.score,
    metric: entry.metric,
  };
}

function customerLeaderboardSettings(settings) {
  return {
    leaderboardMetric: settings.leaderboardMetric,
    monthlyRewardEnabled: settings.monthlyRewardEnabled,
    monthlyRewardType: settings.monthlyRewardType,
    monthlyRewardAmountCents: settings.monthlyRewardAmountCents,
    monthlyMinimumReferrals: settings.monthlyMinimumReferrals,
    quarterlyRewardEnabled: settings.quarterlyRewardEnabled,
    quarterlyRewardType: settings.quarterlyRewardType,
    quarterlyRewardAmountCents: settings.quarterlyRewardAmountCents,
    quarterlyRewardDescription: settings.quarterlyRewardDescription,
    quarterlyMinimumReferrals: settings.quarterlyMinimumReferrals,
  };
}

function mapRewardRow(row) {
  const status = cleanText(row.status, 30).toLowerCase();

  return {
    rewardId: row.reward_id,
    periodType: row.period_type,
    periodKey: row.period_key,
    partnerAccountId: row.partner_account_id,
    partnerCode: row.partner_code,
    partnerEmail: row.partner_email || "",
    partnerFirstName: row.partner_first_name || "",
    partnerLastName: row.partner_last_name || "",
    leaderboardMetric: row.leaderboard_metric,
    rank: Number(row.rank || 1),
    referralCount: Number(row.referral_count || 0),
    revenueCents: Number(row.revenue_cents || 0),
    commissionCents: Number(row.commission_cents || 0),
    rewardType: row.reward_type,
    rewardAmountCents: Number(row.reward_amount_cents || 0),
    rewardDescription: row.reward_description || "",
    status: REWARD_STATUSES.has(status) ? status : "awarded",
    awardedAt: row.awarded_at || "",
    awardedBy: row.awarded_by || "",
    issuedAt: row.issued_at || "",
    issuedBy: row.issued_by || "",
    deliveryMethod: row.delivery_method || "",
    referenceNumber: row.reference_number || "",
    partnerNote: row.partner_note || "",
    adminNotes: row.admin_notes || "",
  };
}

function toCustomerRewardRecord(reward) {
  if (!reward) return null;

  return {
    rewardId: reward.rewardId,
    periodType: reward.periodType,
    periodKey: reward.periodKey,
    partnerCode: reward.partnerCode,
    leaderboardMetric: reward.leaderboardMetric,
    rank: reward.rank,
    referralCount: reward.referralCount,
    rewardType: reward.rewardType,
    rewardAmountCents: reward.rewardAmountCents,
    rewardDescription: reward.rewardDescription,
    status: reward.status,
    awardedAt: reward.awardedAt,
    issuedAt: reward.issuedAt,
    deliveryMethod: reward.deliveryMethod,
    partnerNote: reward.partnerNote,
  };
}

function createRewardId(periodType, periodKey) {
  return `REWARD-${periodType.toUpperCase()}-${periodKey}-${crypto
    .randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}

function normalizeCampaign(payload, existing = null) {
  const startsAt = normalizeOptionalCampaignDate(
    payload.startsAt ?? existing?.startsAt
  );
  const endsAt = normalizeOptionalCampaignDate(
    payload.endsAt ?? existing?.endsAt
  );

  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new RegistryError(
      "The campaign end date must be later than the start date.",
      400
    );
  }

  const campaign = {
    slug: normalizeCampaignSlug(payload.slug || existing?.slug),
    title: cleanText(payload.title ?? existing?.title, MAX_CAMPAIGN_TITLE_LENGTH),
    summary: cleanMultilineText(
      payload.summary ?? existing?.summary,
      MAX_CAMPAIGN_SUMMARY_LENGTH
    ),
    headline: cleanText(
      payload.headline ?? existing?.headline,
      MAX_CAMPAIGN_HEADLINE_LENGTH
    ),
    facebookCopy: cleanMultilineText(
      payload.facebookCopy ?? existing?.facebookCopy,
      MAX_CAMPAIGN_COPY_LENGTH
    ),
    instagramCopy: cleanMultilineText(
      payload.instagramCopy ?? existing?.instagramCopy,
      MAX_CAMPAIGN_COPY_LENGTH
    ),
    tiktokCopy: cleanMultilineText(
      payload.tiktokCopy ?? existing?.tiktokCopy,
      MAX_CAMPAIGN_COPY_LENGTH
    ),
    smsCopy: cleanMultilineText(
      payload.smsCopy ?? existing?.smsCopy,
      MAX_CAMPAIGN_SMS_LENGTH
    ),
    emailSubject: cleanText(
      payload.emailSubject ?? existing?.emailSubject,
      MAX_CAMPAIGN_EMAIL_SUBJECT_LENGTH
    ),
    emailCopy: cleanMultilineText(
      payload.emailCopy ?? existing?.emailCopy,
      MAX_CAMPAIGN_COPY_LENGTH
    ),
    imageUrl: normalizeOptionalHttpUrl(
      payload.imageUrl ?? existing?.imageUrl,
      MAX_CAMPAIGN_URL_LENGTH,
      "campaign image"
    ),
    downloadUrl: normalizeOptionalHttpUrl(
      payload.downloadUrl ?? existing?.downloadUrl,
      MAX_CAMPAIGN_URL_LENGTH,
      "campaign download"
    ),
    disclaimer: cleanMultilineText(
      payload.disclaimer ?? existing?.disclaimer ?? DEFAULT_CAMPAIGN_DISCLAIMER,
      MAX_CAMPAIGN_DISCLAIMER_LENGTH
    ),
    ctaLabel: cleanText(
      payload.ctaLabel ?? existing?.ctaLabel ?? "Research Catalog",
      MAX_CAMPAIGN_CTA_LENGTH
    ),
    destinationPath: normalizeCampaignDestination(
      payload.destinationPath ?? existing?.destinationPath ?? "/checkout"
    ),
    startsAt,
    endsAt,
    displayOrder: normalizeCampaignDisplayOrder(
      payload.displayOrder ?? existing?.displayOrder ?? 0
    ),
  };

  if (!campaign.slug || !campaign.title) {
    throw new RegistryError(
      "A campaign slug and title are required.",
      400
    );
  }

  return campaign;
}

function normalizeCampaignSlug(value) {
  const slug = cleanText(value, MAX_CAMPAIGN_SLUG_LENGTH).toLowerCase();

  if (
    slug.length < 3 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw new RegistryError(
      "Campaign slugs must contain 3–60 lowercase letters, numbers, or single hyphens.",
      400
    );
  }

  return slug;
}

function normalizeOptionalCampaignSlug(value) {
  const cleaned = cleanText(value, MAX_CAMPAIGN_SLUG_LENGTH).toLowerCase();
  return cleaned ? normalizeCampaignSlug(cleaned) : "";
}

function normalizeCampaignStatus(value) {
  const status = cleanText(value, 30).toLowerCase();

  if (!CAMPAIGN_STATUSES.has(status)) {
    throw new RegistryError("Choose draft, published, or archived.", 400);
  }

  return status;
}

function normalizeOptionalCampaignDate(value) {
  if (!value) return "";
  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw new RegistryError("A campaign date is invalid.", 400);
  }

  return parsed.toISOString();
}

function normalizeOptionalHttpUrl(value, maximumLength, label) {
  const cleaned = cleanText(value, maximumLength);
  if (!cleaned) return "";

  let parsed;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new RegistryError(`Enter a complete ${label} URL.`, 400);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new RegistryError(`The ${label} URL must use HTTP or HTTPS.`, 400);
  }

  return parsed.toString().slice(0, maximumLength);
}

function normalizeCampaignDestination(value) {
  const destination = cleanText(value, MAX_CAMPAIGN_DESTINATION_LENGTH);

  if (!destination.startsWith('/') || destination.startsWith('//')) {
    throw new RegistryError(
      "The campaign destination must be an internal path beginning with one slash.",
      400
    );
  }

  return destination;
}

function normalizeCampaignDisplayOrder(value) {
  const order = Number(value);
  if (!Number.isInteger(order) || order < -1000 || order > 1000) {
    throw new RegistryError(
      "Campaign display order must be a whole number from -1000 to 1000.",
      400
    );
  }
  return order;
}

function validateCampaignForPublishing(campaign) {
  if (!campaign.title || !campaign.headline || !campaign.disclaimer) {
    throw new RegistryError(
      "Add a title, headline, and research-use disclaimer before publishing.",
      400
    );
  }

  if (
    !campaign.facebookCopy &&
    !campaign.instagramCopy &&
    !campaign.tiktokCopy &&
    !campaign.smsCopy &&
    !campaign.emailCopy
  ) {
    throw new RegistryError(
      "Add copy for at least one marketing channel before publishing.",
      400
    );
  }
}

function isCampaignActive(campaign, now = new Date()) {
  if (!campaign || campaign.status !== "published") return false;
  const time = now.getTime();
  const starts = campaign.startsAt ? new Date(campaign.startsAt).getTime() : -Infinity;
  const ends = campaign.endsAt ? new Date(campaign.endsAt).getTime() : Infinity;
  return time >= starts && time < ends;
}

function createCampaignId() {
  return `CAMPAIGN-${Date.now()}-${crypto
    .randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}

function mapCampaignRow(row) {
  const status = cleanText(row.status, 30).toLowerCase();
  const campaign = {
    campaignId: row.campaign_id,
    slug: row.slug,
    title: row.title,
    status: CAMPAIGN_STATUSES.has(status) ? status : "draft",
    summary: row.summary || "",
    headline: row.headline || "",
    facebookCopy: row.facebook_copy || "",
    instagramCopy: row.instagram_copy || "",
    tiktokCopy: row.tiktok_copy || "",
    smsCopy: row.sms_copy || "",
    emailSubject: row.email_subject || "",
    emailCopy: row.email_copy || "",
    imageUrl: row.image_url || "",
    downloadUrl: row.download_url || "",
    disclaimer: row.disclaimer || "",
    ctaLabel: row.cta_label || "",
    destinationPath: row.destination_path || "/checkout",
    startsAt: row.starts_at || "",
    endsAt: row.ends_at || "",
    displayOrder: Number(row.display_order || 0),
    createdAt: row.created_at || "",
    createdBy: row.created_by || "",
    updatedAt: row.updated_at || "",
    updatedBy: row.updated_by || "",
    publishedAt: row.published_at || "",
    publishedBy: row.published_by || "",
    archivedAt: row.archived_at || "",
    archivedBy: row.archived_by || "",
    referralCount: Number(row.referral_count || 0),
    earnedReferralCount: Number(row.earned_referral_count || 0),
    earnedRevenueCents: Number(row.earned_revenue_cents || 0),
    earnedCommissionCents: Number(row.earned_commission_cents || 0),
  };

  return {
    ...campaign,
    active: isCampaignActive(campaign),
  };
}

function toCustomerCampaign(campaign) {
  if (!campaign) return null;

  return {
    campaignId: campaign.campaignId,
    slug: campaign.slug,
    title: campaign.title,
    summary: campaign.summary,
    headline: campaign.headline,
    facebookCopy: campaign.facebookCopy,
    instagramCopy: campaign.instagramCopy,
    tiktokCopy: campaign.tiktokCopy,
    smsCopy: campaign.smsCopy,
    emailSubject: campaign.emailSubject,
    emailCopy: campaign.emailCopy,
    imageUrl: campaign.imageUrl,
    downloadUrl: campaign.downloadUrl,
    disclaimer: campaign.disclaimer,
    ctaLabel: campaign.ctaLabel,
    destinationPath: campaign.destinationPath,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    displayOrder: campaign.displayOrder,
    active: Boolean(campaign.active),
  };
}

function normalizeOptionalCode(value) {
  const cleaned = cleanText(value, 20).toUpperCase();
  return cleaned ? normalizeCode(cleaned) : "";
}

function normalizeAnalyticsChannel(value) {
  const channel = cleanText(value || "general", 30).toLowerCase();
  return ANALYTICS_CHANNELS.has(channel) ? channel : "other";
}

function normalizeAnalyticsPeriod(value) {
  const period = cleanText(value || DEFAULT_ANALYTICS_PERIOD, 20).toLowerCase();
  return ANALYTICS_PERIODS.has(period) ? period : DEFAULT_ANALYTICS_PERIOD;
}

function analyticsPeriodInfo(periodValue) {
  const period = normalizeAnalyticsPeriod(periodValue);
  const endAt = new Date().toISOString();

  if (period === "all") {
    return {
      key: period,
      startAt: "",
      endAt,
      label: "All time",
    };
  }

  const days = Number.parseInt(period, 10);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);

  return {
    key: period,
    startAt: start.toISOString(),
    endAt,
    label: `Last ${days} days`,
  };
}

function buildAnalyticsWhere({
  dateColumn,
  accountColumn,
  codeColumn,
  campaignColumn,
  startAt = "",
  accountId = "",
  partnerCode = "",
  campaignSlug = "",
}) {
  const conditions = [];
  const params = [];

  if (startAt) {
    conditions.push(`${dateColumn} >= ?`);
    params.push(startAt);
  }

  if (accountId) {
    conditions.push(`${accountColumn} = ?`);
    params.push(accountId);
  }

  if (partnerCode) {
    conditions.push(`${codeColumn} = ? COLLATE NOCASE`);
    params.push(partnerCode);
  }

  if (campaignSlug) {
    conditions.push(`${campaignColumn} = ? COLLATE NOCASE`);
    params.push(campaignSlug);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

function createAnalyticsClickId() {
  return `CLICK-${Date.now()}-${crypto
    .randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}

function baseAnalyticsMetrics() {
  return {
    totalClicks: 0,
    uniqueVisitors: 0,
    attributedOrders: 0,
    earnedOrders: 0,
    voidedOrders: 0,
    earnedRevenueCents: 0,
    earnedCommissionCents: 0,
    conversionRateBps: 0,
  };
}

function combineAnalyticsMetrics(clickRow = {}, referralRow = {}) {
  const totalClicks = Number(
    clickRow.totalClicks ?? clickRow.total_clicks ?? 0
  );
  const uniqueVisitors = Number(
    clickRow.uniqueVisitors ?? clickRow.unique_visitors ?? 0
  );
  const attributedOrders = Number(
    referralRow.attributedOrders ?? referralRow.attributed_orders ?? 0
  );
  const earnedOrders = Number(
    referralRow.earnedOrders ?? referralRow.earned_orders ?? 0
  );
  const voidedOrders = Number(
    referralRow.voidedOrders ?? referralRow.voided_orders ?? 0
  );
  const earnedRevenueCents = Number(
    referralRow.earnedRevenueCents ?? referralRow.earned_revenue_cents ?? 0
  );
  const earnedCommissionCents = Number(
    referralRow.earnedCommissionCents ??
      referralRow.earned_commission_cents ??
      0
  );

  return {
    totalClicks,
    uniqueVisitors,
    attributedOrders,
    earnedOrders,
    voidedOrders,
    earnedRevenueCents,
    earnedCommissionCents,
    conversionRateBps: uniqueVisitors
      ? Math.round((attributedOrders * 10000) / uniqueVisitors)
      : 0,
  };
}

function mergeAnalyticsBreakdown(clickRows, referralRows, keyFor) {
  const records = new Map();

  const merge = (row, type) => {
    const key = keyFor(row);
    const current = records.get(key) || {
      ...row,
      ...baseAnalyticsMetrics(),
    };

    records.set(key, {
      ...current,
      ...row,
      ...(type === "click"
        ? combineAnalyticsMetrics(row, current)
        : combineAnalyticsMetrics(current, row)),
    });
  };

  clickRows.forEach((row) => merge(row, "click"));
  referralRows.forEach((row) => merge(row, "referral"));

  return Array.from(records.values()).sort(
    (left, right) =>
      right.totalClicks - left.totalClicks ||
      right.attributedOrders - left.attributedOrders ||
      right.earnedRevenueCents - left.earnedRevenueCents
  );
}

function mapAnalyticsCampaignClickRow(row) {
  return {
    campaignSlug: cleanText(row.campaign_slug, MAX_CAMPAIGN_SLUG_LENGTH),
    campaignTitle:
      cleanText(row.campaign_title, MAX_CAMPAIGN_TITLE_LENGTH) ||
      "General Referral Link",
    totalClicks: Number(row.total_clicks || 0),
    uniqueVisitors: Number(row.unique_visitors || 0),
  };
}

function mapAnalyticsCampaignOrderRow(row) {
  return {
    campaignSlug: cleanText(row.campaign_slug, MAX_CAMPAIGN_SLUG_LENGTH),
    campaignTitle:
      cleanText(row.campaign_title, MAX_CAMPAIGN_TITLE_LENGTH) ||
      "General Referral Link",
    attributedOrders: Number(row.attributed_orders || 0),
    earnedOrders: Number(row.earned_orders || 0),
    voidedOrders: Number(row.voided_orders || 0),
    earnedRevenueCents: Number(row.earned_revenue_cents || 0),
    earnedCommissionCents: Number(row.earned_commission_cents || 0),
  };
}

function mapAnalyticsChannelClickRow(row) {
  return {
    channel: normalizeAnalyticsChannel(row.channel || "untracked"),
    totalClicks: Number(row.total_clicks || 0),
    uniqueVisitors: Number(row.unique_visitors || 0),
  };
}

function mapAnalyticsChannelOrderRow(row) {
  return {
    channel: normalizeAnalyticsChannel(row.channel || "untracked"),
    attributedOrders: Number(row.attributed_orders || 0),
    earnedOrders: Number(row.earned_orders || 0),
    voidedOrders: Number(row.voided_orders || 0),
    earnedRevenueCents: Number(row.earned_revenue_cents || 0),
    earnedCommissionCents: Number(row.earned_commission_cents || 0),
  };
}

function mapAnalyticsDailyClickRow(row) {
  return {
    day: cleanText(row.day, 20),
    totalClicks: Number(row.total_clicks || 0),
    uniqueVisitors: Number(row.unique_visitors || 0),
  };
}

function mapAnalyticsDailyOrderRow(row) {
  return {
    day: cleanText(row.day, 20),
    attributedOrders: Number(row.attributed_orders || 0),
    earnedOrders: Number(row.earned_orders || 0),
    voidedOrders: Number(row.voided_orders || 0),
    earnedRevenueCents: Number(row.earned_revenue_cents || 0),
    earnedCommissionCents: Number(row.earned_commission_cents || 0),
  };
}

function mapAnalyticsPartnerClickRow(row) {
  return {
    partnerAccountId: cleanText(row.partner_account_id, 150),
    partnerCode: cleanText(row.partner_code, 20),
    totalClicks: Number(row.total_clicks || 0),
    uniqueVisitors: Number(row.unique_visitors || 0),
  };
}

function mapAnalyticsPartnerOrderRow(row) {
  return {
    partnerAccountId: cleanText(row.partner_account_id, 150),
    partnerCode: cleanText(row.partner_code, 20),
    attributedOrders: Number(row.attributed_orders || 0),
    earnedOrders: Number(row.earned_orders || 0),
    voidedOrders: Number(row.voided_orders || 0),
    earnedRevenueCents: Number(row.earned_revenue_cents || 0),
    earnedCommissionCents: Number(row.earned_commission_cents || 0),
  };
}

function emptyAnalyticsReport(period = DEFAULT_ANALYTICS_PERIOD) {
  return {
    period: analyticsPeriodInfo(period),
    filters: {
      accountId: "",
      partnerCode: "",
      campaignSlug: "",
    },
    summary: baseAnalyticsMetrics(),
    byCampaign: [],
    byChannel: [],
    byPartner: [],
    daily: [],
  };
}

function normalizeApplication(payload) {
  const application = {
    accountId: cleanText(payload.accountId, 150),
    email: cleanText(payload.email, 254).toLowerCase(),
    firstName: cleanText(payload.firstName, 100),
    lastName: cleanText(payload.lastName, 100),
    code: normalizeCode(payload.code),
    primaryPlatform: cleanText(payload.primaryPlatform, 100),
    profileUrl: cleanText(payload.profileUrl, 500),
    audienceSize: cleanText(payload.audienceSize, 100),
    promotionPlan: cleanMultilineText(payload.promotionPlan, 2000),
    experience: cleanMultilineText(payload.experience, 1000),
    agreementAcceptedAt: cleanText(payload.agreementAcceptedAt, 50),
    agreementVersion: cleanText(payload.agreementVersion, 50),
  };

  if (
    !application.accountId ||
    !application.email ||
    !application.firstName ||
    !application.lastName ||
    !application.code ||
    !application.primaryPlatform ||
    !application.audienceSize ||
    !application.promotionPlan ||
    !application.agreementAcceptedAt
  ) {
    throw new RegistryError(
      "The partner application is missing required information.",
      400
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email)) {
    throw new RegistryError("The customer email address is invalid.", 400);
  }

  return application;
}

function mapApplicationRow(row) {
  const status = cleanText(row.status, 30).toLowerCase();

  return {
    accountId: row.account_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    code: row.code,
    status: APPLICATION_STATUSES.has(status) ? status : "pending",
    primaryPlatform: row.primary_platform,
    profileUrl: row.profile_url || "",
    audienceSize: row.audience_size,
    promotionPlan: row.promotion_plan,
    experience: row.experience || "",
    agreementAcceptedAt: row.agreement_accepted_at,
    agreementVersion: row.agreement_version || "",
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    applicationNumber: Number(row.application_number || 1),
    reviewedAt: row.reviewed_at || "",
    reviewedBy: row.reviewed_by || "",
    customerMessage: row.customer_message || "",
    adminNotes: row.admin_notes || "",
    deniedAt: row.denied_at || "",
    suspendedAt: row.suspended_at || "",
    reactivatedAt: row.reactivated_at || "",
    lastStatusChangeAt: row.last_status_change_at || "",
    commissionRateBps: Number(
      row.commission_rate_bps ?? DEFAULT_COMMISSION_RATE_BPS
    ),
  };
}

function mapReferralRow(row) {
  const referralStatus = cleanText(row.referral_status, 30).toLowerCase();
  const payoutId = cleanText(row.payout_id, 100);

  return {
    orderId: row.order_id,
    partnerAccountId: row.partner_account_id,
    partnerCode: row.partner_code,
    customerAccountId: row.customer_account_id,
    customerEmail: row.customer_email || "",
    orderSubtotalCents: Number(row.order_subtotal_cents || 0),
    commissionRateBps: Number(row.commission_rate_bps || 0),
    commissionAmountCents: Number(row.commission_amount_cents || 0),
    referralStatus: REFERRAL_STATUSES.has(referralStatus)
      ? referralStatus
      : "pending",
    commissionStatus: payoutId
      ? "paid"
      : REFERRAL_STATUSES.has(referralStatus)
      ? referralStatus
      : "pending",
    orderStatus: row.order_status || "Order Request Received",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    earnedAt: row.earned_at || "",
    voidedAt: row.voided_at || "",
    payoutId,
    payoutType: cleanText(row.payout_type, 40),
    payoutMethod: cleanText(row.payment_method, 100),
    payoutReferenceNumber: cleanText(row.payout_reference_number, 150),
    payoutPaidAt: row.payout_paid_at || "",
    payoutCreatedAt: row.payout_created_at || "",
    campaignId: cleanText(row.campaign_id, 120),
    campaignSlug: cleanText(row.campaign_slug, MAX_CAMPAIGN_SLUG_LENGTH),
    campaignTitle: cleanText(row.campaign_title, MAX_CAMPAIGN_TITLE_LENGTH),
    analyticsChannel: normalizeAnalyticsChannel(
      row.analytics_channel || "untracked"
    ),
    analyticsClickId: cleanText(
      row.analytics_click_id,
      MAX_ANALYTICS_CLICK_ID_LENGTH
    ),
    analyticsVisitorId: cleanText(
      row.analytics_visitor_id,
      MAX_ANALYTICS_VISITOR_ID_LENGTH
    ),
    requiresAdjustment: Boolean(payoutId && referralStatus === "voided"),
  };
}

function mapCustomerReferralRow(row) {
  const referral = mapReferralRow(row);

  return {
    orderId: referral.orderId,
    partnerCode: referral.partnerCode,
    orderSubtotalCents: referral.orderSubtotalCents,
    commissionRateBps: referral.commissionRateBps,
    commissionAmountCents: referral.commissionAmountCents,
    referralStatus: referral.referralStatus,
    commissionStatus: referral.commissionStatus,
    orderStatus: referral.orderStatus,
    createdAt: referral.createdAt,
    updatedAt: referral.updatedAt,
    earnedAt: referral.earnedAt,
    voidedAt: referral.voidedAt,
    payoutId: referral.payoutId,
    payoutType: referral.payoutType,
    payoutMethod: referral.payoutMethod,
    payoutPaidAt: referral.payoutPaidAt,
    campaignSlug: referral.campaignSlug,
    campaignTitle: referral.campaignTitle,
    analyticsChannel: referral.analyticsChannel,
    requiresAdjustment: referral.requiresAdjustment,
  };
}

function mapAdminReferralRow(row) {
  return {
    ...mapReferralRow(row),
    partnerEmail: row.partner_email || "",
    partnerFirstName: row.partner_first_name || "",
    partnerLastName: row.partner_last_name || "",
  };
}

function mapSummaryRow(row) {
  if (!row) {
    return emptyReferralSummary();
  }

  return {
    totalCount: Number(row.total_count || 0),
    pendingCount: Number(row.pending_count || 0),
    earnedCount: Number(row.earned_count || 0),
    voidedCount: Number(row.voided_count || 0),
    pendingCommissionCents: Number(row.pending_commission_cents || 0),
    earnedCommissionCents: Number(row.earned_commission_cents || 0),
    voidedCommissionCents: Number(row.voided_commission_cents || 0),
    earnedRevenueCents: Number(row.earned_revenue_cents || 0),
    availableReferralCount: Number(row.available_referral_count || 0),
    availableCommissionCents: Number(row.available_commission_cents || 0),
    paidReferralCount: Number(row.paid_referral_count || 0),
    paidCommissionCents: Number(row.paid_commission_cents || 0),
    adjustmentRequiredCount: Number(row.adjustment_required_count || 0),
  };
}

function emptyReferralSummary() {
  return {
    totalCount: 0,
    pendingCount: 0,
    earnedCount: 0,
    voidedCount: 0,
    pendingCommissionCents: 0,
    earnedCommissionCents: 0,
    voidedCommissionCents: 0,
    earnedRevenueCents: 0,
    availableReferralCount: 0,
    availableCommissionCents: 0,
    paidReferralCount: 0,
    paidCommissionCents: 0,
    adjustmentRequiredCount: 0,
  };
}

function mapPayoutRow(row) {
  return {
    payoutId: row.payout_id,
    partnerAccountId: row.partner_account_id,
    partnerCode: row.partner_code,
    partnerEmail: row.partner_email || "",
    partnerFirstName: row.partner_first_name || "",
    partnerLastName: row.partner_last_name || "",
    amountCents: Number(row.amount_cents || 0),
    referralCount: Number(row.referral_count || 0),
    payoutType: cleanText(row.payout_type, 40),
    paymentMethod: cleanText(row.payment_method, 100),
    referenceNumber: cleanText(row.reference_number, 150),
    partnerNote: cleanMultilineText(row.partner_note, 1000),
    adminNotes: cleanMultilineText(row.admin_notes, 2000),
    paidAt: row.paid_at || "",
    createdAt: row.created_at || "",
    createdBy: cleanText(row.created_by, 254),
  };
}

function normalizeCode(value) {
  return cleanText(value, 30).toUpperCase();
}

function normalizeOrderId(value) {
  const orderId = cleanText(value, 100).toUpperCase();

  if (!orderId || !/^[A-Z0-9][A-Z0-9-]{2,99}$/.test(orderId)) {
    throw new RegistryError("The order number is invalid.", 400);
  }

  return orderId;
}

function normalizeMoneyToCents(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
    throw new RegistryError("The order subtotal is invalid.", 400);
  }

  return Math.round(amount * 100);
}

function normalizeCommissionRate(value) {
  const rate = Number(value);

  if (
    !Number.isInteger(rate) ||
    rate < 0 ||
    rate > MAX_COMMISSION_RATE_BPS
  ) {
    throw new RegistryError(
      `Commission rate must be a whole number from 0 to ${MAX_COMMISSION_RATE_BPS} basis points.`,
      400
    );
  }

  return rate;
}

function normalizePayoutThreshold(value) {
  const threshold = Number(value);

  if (
    !Number.isInteger(threshold) ||
    threshold < 0 ||
    threshold > MAX_PAYOUT_THRESHOLD_CENTS
  ) {
    throw new RegistryError(
      `The payout threshold must be a whole number from 0 to ${MAX_PAYOUT_THRESHOLD_CENTS} cents.`,
      400
    );
  }

  return threshold;
}

function normalizePayoutDate(value) {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw new RegistryError("The payout date is invalid.", 400);
  }

  return parsed.toISOString();
}

function normalizeOptionalOrderIds(value) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value) || value.length > MAX_REFERRAL_HISTORY) {
    throw new RegistryError(
      "The selected payout referrals are invalid.",
      400
    );
  }

  return Array.from(
    new Set(value.map((orderId) => normalizeOrderId(orderId)))
  );
}

function createPayoutId() {
  return `PAYOUT-${Date.now()}-${crypto
    .randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}

function formatCentsForMessage(value) {
  return (Number(value || 0) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function classifyReferralStatus(orderStatus) {
  const normalizedStatus = cleanText(orderStatus, 100).toLowerCase();

  if (VOIDED_ORDER_STATUSES.has(normalizedStatus)) {
    return "voided";
  }

  if (EARNED_ORDER_STATUSES.has(normalizedStatus)) {
    return "earned";
  }

  return "pending";
}

function getReferralStatusTimestamps(status, existing, now) {
  if (status === "earned") {
    return {
      earnedAt: existing?.earnedAt || now,
      voidedAt: "",
    };
  }

  if (status === "voided") {
    return {
      earnedAt: existing?.earnedAt || "",
      voidedAt: existing?.voidedAt || now,
    };
  }

  return {
    earnedAt: "",
    voidedAt: "",
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

async function readJson(request) {
  const contentType = request.headers.get("Content-Type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new RegistryError("Content-Type must be application/json.", 415);
  }

  const text = await request.text();

  if (text.length > 25_000) {
    throw new RegistryError("The partner request is too large.", 413);
  }

  try {
    const payload = JSON.parse(text);

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid JSON object.");
    }

    return payload;
  } catch {
    throw new RegistryError(
      "The partner request contains invalid JSON.",
      400
    );
  }
}

function actionMessage(action) {
  const messages = {
    approve:
      "The partner application was approved and the customer-created code is active.",
    deny:
      "The partner application was denied and the selected code was released.",
    suspend:
      "The partner was suspended and the code is inactive but remains reserved.",
    reactivate:
      "The partner was reactivated and the existing code is active again.",
  };

  return messages[action];
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(error) {
  const status = error instanceof RegistryError ? error.status : 500;

  return jsonResponse(
    {
      success: false,
      error:
        error?.message ||
        "The partner registry request could not be completed.",
    },
    status
  );
}

class RegistryError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "RegistryError";
    this.status = status;
  }
}

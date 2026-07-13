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

      if (
        url.pathname === "/admin/payout-settings" &&
        request.method === "GET"
      ) {
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

      if (
        url.pathname === "/admin/payouts/create" &&
        request.method === "POST"
      ) {
        return this.createPayout(request);
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
      reservation &&
        accountId &&
        reservation.accountId === accountId
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

        if (
          reservation &&
          reservation.accountId !== application.accountId
        ) {
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
            code,
            account_id,
            status,
            reserved_at,
            updated_at
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
            ) VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              'pending',
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              1,
              ?,
              ?
            )`,
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

    return jsonResponse({
      success: true,
      valid: true,
      code: partner.code,
      reason: "active",
      message: "Referral code applied. The order subtotal is unchanged.",
      commissionRateBps: partner.commissionRateBps,
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

    const orderSubtotalCents = normalizeMoneyToCents(
      payload.orderSubtotal
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
            voided_at
          ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )`,
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
          timestamps.voidedAt
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
          amountUntilEligibleCents:
            payoutSettings.minimumPayoutCents,
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

           SUM(
             CASE
               WHEN r.referral_status = 'pending'
               THEN 1
               ELSE 0
             END
           ) AS pending_count,

           SUM(
             CASE
               WHEN r.referral_status = 'earned'
               THEN 1
               ELSE 0
             END
           ) AS earned_count,

           SUM(
             CASE
               WHEN r.referral_status = 'voided'
               THEN 1
               ELSE 0
             END
           ) AS voided_count,

           SUM(
             CASE
               WHEN r.referral_status = 'pending'
               THEN r.commission_amount_cents
               ELSE 0
             END
           ) AS pending_commission_cents,

           SUM(
             CASE
               WHEN r.referral_status = 'earned'
               THEN r.commission_amount_cents
               ELSE 0
             END
           ) AS earned_commission_cents,

           SUM(
             CASE
               WHEN r.referral_status = 'voided'
               THEN r.commission_amount_cents
               ELSE 0
             END
           ) AS voided_commission_cents,

           SUM(
             CASE
               WHEN r.referral_status = 'earned'
               THEN r.order_subtotal_cents
               ELSE 0
             END
           ) AS earned_revenue_cents,

           SUM(
             CASE
               WHEN r.referral_status = 'earned'
                 AND pi.order_id IS NULL
               THEN 1
               ELSE 0
             END
           ) AS available_referral_count,

           SUM(
             CASE
               WHEN r.referral_status = 'earned'
                 AND pi.order_id IS NULL
               THEN r.commission_amount_cents
               ELSE 0
             END
           ) AS available_commission_cents,

           SUM(
             CASE
               WHEN pi.order_id IS NOT NULL
               THEN 1
               ELSE 0
             END
           ) AS paid_referral_count,

           SUM(
             CASE
               WHEN pi.order_id IS NOT NULL
               THEN pi.commission_amount_cents
               ELSE 0
             END
           ) AS paid_commission_cents,

           SUM(
             CASE
               WHEN r.referral_status = 'voided'
                 AND pi.order_id IS NOT NULL
               THEN 1
               ELSE 0
             END
           ) AS adjustment_required_count

         FROM partner_referrals r

         LEFT JOIN partner_payout_items pi
           ON pi.order_id = r.order_id

         WHERE r.partner_account_id = ?`,
        accountId
      )
      .toArray();

    const baseSummary = mapSummaryRow(summaryRows[0]);

    const minimumPayoutCents =
      payoutSettings.minimumPayoutCents;

    const payoutEligible =
      baseSummary.availableReferralCount > 0 &&
      baseSummary.availableCommissionCents >=
        minimumPayoutCents;

    const summary = {
      ...baseSummary,
      minimumPayoutCents,
      payoutEligible,

      amountUntilEligibleCents: payoutEligible
        ? 0
        : Math.max(
            0,
            minimumPayoutCents -
              baseSummary.availableCommissionCents
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

      payouts: application
        ? this.listPayoutRecords(accountId)
        : [],

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

    const customerMessage = cleanMultilineText(
      payload.customerMessage,
      1000
    );

    const adminNotes = cleanMultilineText(
      payload.adminNotes,
      2000
    );

    if (!ADMIN_ACTIONS.has(action)) {
      throw new RegistryError("Choose a valid partner action.", 400);
    }

    if (!accountId) {
      throw new RegistryError("A customer account ID is required.", 400);
    }

    if (
      ["deny", "suspend"].includes(action) &&
      !customerMessage
    ) {
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
          `DELETE FROM partner_code_reservations
           WHERE account_id = ?`,
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

    const commissionRateBps = normalizeCommissionRate(
      payload.commissionRateBps
    );

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

    const payoutType = cleanText(
      payload.payoutType,
      40
    ).toLowerCase();

    const paymentMethod = cleanText(
      payload.paymentMethod,
      100
    );

    const referenceNumber = cleanText(
      payload.referenceNumber,
      150
    );

    const partnerNote = cleanMultilineText(
      payload.partnerNote,
      1000
    );

    const adminNotes = cleanMultilineText(
      payload.adminNotes,
      2000
    );

    const createdBy = cleanText(
      payload.createdBy || "authorized administrator",
      254
    );

    const paidAt = normalizePayoutDate(payload.paidAt);

    const requestedOrderIds = normalizeOptionalOrderIds(
      payload.orderIds
    );

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
      (total, referral) =>
        total + referral.commissionAmountCents,
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
          const currentReferral = this.findReferral(
            referral.orderId
          );

          const existingItem = this.findPayoutItem(
            referral.orderId
          );

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
           ) VALUES (
             ?,
             ?,
             ?,
             ?,
             ?,
             ?,
             ?,
             ?,
             ?,
             ?,
             ?,
             ?,
             ?,
             ?
           )`,
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

      if (
        /unique constraint failed/i.test(
          String(error?.message || error)
        )
      ) {
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

    if (
      !reservation ||
      reservation.accountId !== application.accountId
    ) {
      throw new RegistryError(
        "The selected partner code is no longer reserved for this applicant.",
        409
      );
    }
  }

  setReservationStatus(accountId, status, updatedAt) {
    this.sql.exec(
      `UPDATE partner_code_reservations
       SET status = ?,
           updated_at = ?
       WHERE account_id = ?`,
      status,
      updatedAt,
      accountId
    );
  }

  findApplication(accountId) {
    const rows = this.sql
      .exec(
        `SELECT *
         FROM partner_applications
         WHERE account_id = ?
         LIMIT 1`,
        accountId
      )
      .toArray();

    return rows.length
      ? mapApplicationRow(rows[0])
      : null;
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

    return rows.length
      ? mapApplicationRow(rows[0])
      : null;
  }

  findReservation(code) {
    const rows = this.sql
      .exec(
        `SELECT
           code,
           account_id,
           status,
           reserved_at,
           updated_at

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

    return rows.length
      ? mapReferralRow(rows[0])
      : null;
  }

  findPayoutItem(orderId) {
    const rows = this.sql
      .exec(
        `SELECT
           order_id,
           payout_id,
           commission_amount_cents,
           created_at

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

    return this.attachPayoutItems(
      mapPayoutRow(rows[0])
    );
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

    return rows.map((row) =>
      this.attachPayoutItems(
        mapPayoutRow(row)
      )
    );
  }

  attachPayoutItems(payout) {
    const items = this.sql
      .exec(
        `SELECT
           order_id,
           commission_amount_cents,
           created_at

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
        `SELECT
           setting_value,
           updated_at,
           updated_by

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

function normalizeApplication(payload) {
  const application = {
    accountId: cleanText(payload.accountId, 150),
    email: cleanText(payload.email, 254).toLowerCase(),
    firstName: cleanText(payload.firstName, 100),
    lastName: cleanText(payload.lastName, 100),
    code: normalizeCode(payload.code),

    primaryPlatform: cleanText(
      payload.primaryPlatform,
      100
    ),

    profileUrl: cleanText(
      payload.profileUrl,
      500
    ),

    audienceSize: cleanText(
      payload.audienceSize,
      100
    ),

    promotionPlan: cleanMultilineText(
      payload.promotionPlan,
      2000
    ),

    experience: cleanMultilineText(
      payload.experience,
      1000
    ),

    agreementAcceptedAt: cleanText(
      payload.agreementAcceptedAt,
      50
    ),

    agreementVersion: cleanText(
      payload.agreementVersion,
      50
    ),
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

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      application.email
    )
  ) {
    throw new RegistryError(
      "The customer email address is invalid.",
      400
    );
  }

  return application;
}

function mapApplicationRow(row) {
  const status = cleanText(
    row.status,
    30
  ).toLowerCase();

  return {
    accountId: row.account_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    code: row.code,

    status: APPLICATION_STATUSES.has(status)
      ? status
      : "pending",

    primaryPlatform: row.primary_platform,
    profileUrl: row.profile_url || "",
    audienceSize: row.audience_size,
    promotionPlan: row.promotion_plan,
    experience: row.experience || "",

    agreementAcceptedAt:
      row.agreement_accepted_at,

    agreementVersion:
      row.agreement_version || "",

    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,

    applicationNumber: Number(
      row.application_number || 1
    ),

    reviewedAt: row.reviewed_at || "",
    reviewedBy: row.reviewed_by || "",

    customerMessage:
      row.customer_message || "",

    adminNotes: row.admin_notes || "",
    deniedAt: row.denied_at || "",
    suspendedAt: row.suspended_at || "",
    reactivatedAt: row.reactivated_at || "",

    lastStatusChangeAt:
      row.last_status_change_at || "",

    commissionRateBps: Number(
      row.commission_rate_bps ??
        DEFAULT_COMMISSION_RATE_BPS
    ),
  };
}

function mapReferralRow(row) {
  const referralStatus = cleanText(
    row.referral_status,
    30
  ).toLowerCase();

  const payoutId = cleanText(
    row.payout_id,
    100
  );

  return {
    orderId: row.order_id,

    partnerAccountId:
      row.partner_account_id,

    partnerCode: row.partner_code,

    customerAccountId:
      row.customer_account_id,

    customerEmail:
      row.customer_email || "",

    orderSubtotalCents: Number(
      row.order_subtotal_cents || 0
    ),

    commissionRateBps: Number(
      row.commission_rate_bps || 0
    ),

    commissionAmountCents: Number(
      row.commission_amount_cents || 0
    ),

    referralStatus:
      REFERRAL_STATUSES.has(referralStatus)
        ? referralStatus
        : "pending",

    commissionStatus: payoutId
      ? "paid"
      : REFERRAL_STATUSES.has(referralStatus)
      ? referralStatus
      : "pending",

    orderStatus:
      row.order_status ||
      "Order Request Received",

    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    earnedAt: row.earned_at || "",
    voidedAt: row.voided_at || "",

    payoutId,

    payoutType: cleanText(
      row.payout_type,
      40
    ),

    payoutMethod: cleanText(
      row.payment_method,
      100
    ),

    payoutReferenceNumber: cleanText(
      row.payout_reference_number,
      150
    ),

    payoutPaidAt:
      row.payout_paid_at || "",

    payoutCreatedAt:
      row.payout_created_at || "",

    requiresAdjustment: Boolean(
      payoutId &&
        referralStatus === "voided"
    ),
  };
}

function mapCustomerReferralRow(row) {
  const referral = mapReferralRow(row);

  return {
    orderId: referral.orderId,
    partnerCode: referral.partnerCode,

    orderSubtotalCents:
      referral.orderSubtotalCents,

    commissionRateBps:
      referral.commissionRateBps,

    commissionAmountCents:
      referral.commissionAmountCents,

    referralStatus:
      referral.referralStatus,

    commissionStatus:
      referral.commissionStatus,

    orderStatus:
      referral.orderStatus,

    createdAt:
      referral.createdAt,

    updatedAt:
      referral.updatedAt,

    earnedAt:
      referral.earnedAt,

    voidedAt:
      referral.voidedAt,

    payoutId:
      referral.payoutId,

    payoutType:
      referral.payoutType,

    payoutMethod:
      referral.payoutMethod,

    payoutPaidAt:
      referral.payoutPaidAt,

    requiresAdjustment:
      referral.requiresAdjustment,
  };
}

function mapAdminReferralRow(row) {
  return {
    ...mapReferralRow(row),

    partnerEmail:
      row.partner_email || "",

    partnerFirstName:
      row.partner_first_name || "",

    partnerLastName:
      row.partner_last_name || "",
  };
}

function mapSummaryRow(row) {
  if (!row) {
    return emptyReferralSummary();
  }

  return {
    totalCount: Number(
      row.total_count || 0
    ),

    pendingCount: Number(
      row.pending_count || 0
    ),

    earnedCount: Number(
      row.earned_count || 0
    ),

    voidedCount: Number(
      row.voided_count || 0
    ),

    pendingCommissionCents: Number(
      row.pending_commission_cents || 0
    ),

    earnedCommissionCents: Number(
      row.earned_commission_cents || 0
    ),

    voidedCommissionCents: Number(
      row.voided_commission_cents || 0
    ),

    earnedRevenueCents: Number(
      row.earned_revenue_cents || 0
    ),

    availableReferralCount: Number(
      row.available_referral_count || 0
    ),

    availableCommissionCents: Number(
      row.available_commission_cents || 0
    ),

    paidReferralCount: Number(
      row.paid_referral_count || 0
    ),

    paidCommissionCents: Number(
      row.paid_commission_cents || 0
    ),

    adjustmentRequiredCount: Number(
      row.adjustment_required_count || 0
    ),
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

    partnerAccountId:
      row.partner_account_id,

    partnerCode:
      row.partner_code,

    partnerEmail:
      row.partner_email || "",

    partnerFirstName:
      row.partner_first_name || "",

    partnerLastName:
      row.partner_last_name || "",

    amountCents: Number(
      row.amount_cents || 0
    ),

    referralCount: Number(
      row.referral_count || 0
    ),

    payoutType: cleanText(
      row.payout_type,
      40
    ),

    paymentMethod: cleanText(
      row.payment_method,
      100
    ),

    referenceNumber: cleanText(
      row.reference_number,
      150
    ),

    partnerNote: cleanMultilineText(
      row.partner_note,
      1000
    ),

    adminNotes: cleanMultilineText(
      row.admin_notes,
      2000
    ),

    paidAt: row.paid_at || "",
    createdAt: row.created_at || "",

    createdBy: cleanText(
      row.created_by,
      254
    ),
  };
}

function normalizeCode(value) {
  return cleanText(value, 30).toUpperCase();
}

function normalizeOrderId(value) {
  const orderId = cleanText(
    value,
    100
  ).toUpperCase();

  if (
    !orderId ||
    !/^[A-Z0-9][A-Z0-9-]{2,99}$/.test(
      orderId
    )
  ) {
    throw new RegistryError(
      "The order number is invalid.",
      400
    );
  }

  return orderId;
}

function normalizeMoneyToCents(value) {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 1_000_000
  ) {
    throw new RegistryError(
      "The order subtotal is invalid.",
      400
    );
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
    throw new RegistryError(
      "The payout date is invalid.",
      400
    );
  }

  return parsed.toISOString();
}

function normalizeOptionalOrderIds(value) {
  if (value == null) {
    return [];
  }

  if (
    !Array.isArray(value) ||
    value.length > MAX_REFERRAL_HISTORY
  ) {
    throw new RegistryError(
      "The selected payout referrals are invalid.",
      400
    );
  }

  return Array.from(
    new Set(
      value.map((orderId) =>
        normalizeOrderId(orderId)
      )
    )
  );
}

function createPayoutId() {
  return `PAYOUT-${Date.now()}-${crypto
    .randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}

function formatCentsForMessage(value) {
  return (
    Number(value || 0) / 100
  ).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function classifyReferralStatus(orderStatus) {
  const normalizedStatus = cleanText(
    orderStatus,
    100
  ).toLowerCase();

  if (
    VOIDED_ORDER_STATUSES.has(
      normalizedStatus
    )
  ) {
    return "voided";
  }

  if (
    EARNED_ORDER_STATUSES.has(
      normalizedStatus
    )
  ) {
    return "earned";
  }

  return "pending";
}

function getReferralStatusTimestamps(
  status,
  existing,
  now
) {
  if (status === "earned") {
    return {
      earnedAt:
        existing?.earnedAt || now,

      voidedAt: "",
    };
  }

  if (status === "voided") {
    return {
      earnedAt:
        existing?.earnedAt || "",

      voidedAt:
        existing?.voidedAt || now,
    };
  }

  return {
    earnedAt: "",
    voidedAt: "",
  };
}

function cleanText(value, maximumLength) {
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

async function readJson(request) {
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
    throw new RegistryError(
      "Content-Type must be application/json.",
      415
    );
  }

  const text = await request.text();

  if (text.length > 25_000) {
    throw new RegistryError(
      "The partner request is too large.",
      413
    );
  }

  try {
    const payload = JSON.parse(text);

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      throw new Error(
        "Invalid JSON object."
      );
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
  return new Response(
    JSON.stringify(body),
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

function errorResponse(error) {
  const status =
    error instanceof RegistryError
      ? error.status
      : 500;

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
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
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);

      if (
        url.pathname === "/application" &&
        request.method === "GET"
      ) {
        return this.getApplication(url);
      }

      if (
        url.pathname === "/availability" &&
        request.method === "GET"
      ) {
        return this.getAvailability(url);
      }

      if (
        url.pathname === "/apply" &&
        request.method === "POST"
      ) {
        return this.submitApplication(request);
      }

      if (
        url.pathname === "/admin/list" &&
        request.method === "GET"
      ) {
        return this.listApplications();
      }

      if (
        url.pathname === "/admin/action" &&
        request.method === "POST"
      ) {
        return this.updateApplication(request);
      }

      throw new RegistryError(
        "Partner registry route not found.",
        404
      );
    } catch (error) {
      console.error(
        "Partner registry error:",
        error
      );

      return errorResponse(error);
    }
  }

  getApplication(url) {
    const accountId = cleanText(
      url.searchParams.get("accountId"),
      150
    );

    if (!accountId) {
      throw new RegistryError(
        "A customer account ID is required.",
        400
      );
    }

    return jsonResponse({
      success: true,
      application:
        this.findApplication(accountId),
    });
  }

  getAvailability(url) {
    const code = normalizeCode(
      url.searchParams.get("code")
    );

    const accountId = cleanText(
      url.searchParams.get("accountId"),
      150
    );

    if (!code) {
      throw new RegistryError(
        "A partner code is required.",
        400
      );
    }

    const reservation =
      this.findReservation(code);

    const ownedByAccount = Boolean(
      reservation &&
        accountId &&
        reservation.accountId === accountId
    );

    return jsonResponse({
      success: true,
      code,
      available:
        !reservation || ownedByAccount,
      ownedByAccount,
    });
  }

  async submitApplication(request) {
    const application =
      normalizeApplication(
        await readJson(request)
      );

    const now =
      new Date().toISOString();

    let savedApplication;

    try {
      this.ctx.storage.transactionSync(
        () => {
          const existing =
            this.findApplication(
              application.accountId
            );

          if (
            existing &&
            [
              "pending",
              "approved",
              "suspended",
            ].includes(existing.status)
          ) {
            const messages = {
              pending:
                "A partner application is already awaiting review.",

              approved:
                "This customer account is already an approved partner.",

              suspended:
                "This partner account is suspended and cannot submit a new application.",
            };

            throw new RegistryError(
              messages[existing.status],
              409
            );
          }

          const reservation =
            this.findReservation(
              application.code
            );

          if (
            reservation &&
            reservation.accountId !==
              application.accountId
          ) {
            throw new RegistryError(
              "That partner code has already been claimed. Choose another code.",
              409
            );
          }

          this.sql.exec(
            `DELETE FROM partner_code_reservations
             WHERE account_id = ?`,
            application.accountId
          );

          this.sql.exec(
            `INSERT INTO partner_code_reservations (
              code,
              account_id,
              status,
              reserved_at,
              updated_at
            ) VALUES (
              ?,
              ?,
              'pending',
              ?,
              ?
            )`,
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
                   application_number =
                     application_number + 1,
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
                last_status_change_at
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
              now
            );
          }

          savedApplication =
            this.findApplication(
              application.accountId
            );
        }
      );
    } catch (error) {
      if (
        error instanceof RegistryError
      ) {
        throw error;
      }

      if (
        /unique constraint failed/i.test(
          String(
            error?.message || error
          )
        )
      ) {
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
    const payload =
      await readJson(request);

    const action = cleanText(
      payload.action,
      30
    ).toLowerCase();

    const accountId = cleanText(
      payload.accountId,
      150
    );

    const reviewedBy = cleanText(
      payload.reviewedBy ||
        "authorized administrator",
      254
    );

    const customerMessage =
      cleanMultilineText(
        payload.customerMessage,
        1000
      );

    const adminNotes =
      cleanMultilineText(
        payload.adminNotes,
        2000
      );

    if (
      !ADMIN_ACTIONS.has(action)
    ) {
      throw new RegistryError(
        "Choose a valid partner action.",
        400
      );
    }

    if (!accountId) {
      throw new RegistryError(
        "A customer account ID is required.",
        400
      );
    }

    if (
      ["deny", "suspend"].includes(
        action
      ) &&
      !customerMessage
    ) {
      throw new RegistryError(
        action === "deny"
          ? "Enter a customer-facing reason before denying the application."
          : "Enter a customer-facing reason before suspending the partner.",
        400
      );
    }

    const now =
      new Date().toISOString();

    let savedApplication;

    this.ctx.storage.transactionSync(
      () => {
        const current =
          this.findApplication(accountId);

        if (!current) {
          throw new RegistryError(
            "Partner application not found.",
            404
          );
        }

        if (action === "approve") {
          this.requireStatus(
            current,
            "pending",
            "approved"
          );

          this.requireOwnedReservation(
            current
          );

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

          this.setReservationStatus(
            accountId,
            "approved",
            now
          );
        }

        if (action === "deny") {
          this.requireStatus(
            current,
            "pending",
            "denied"
          );

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
          this.requireStatus(
            current,
            "approved",
            "suspended"
          );

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

          this.setReservationStatus(
            accountId,
            "suspended",
            now
          );
        }

        if (action === "reactivate") {
          this.requireStatus(
            current,
            "suspended",
            "reactivated"
          );

          this.requireOwnedReservation(
            current
          );

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

          this.setReservationStatus(
            accountId,
            "approved",
            now
          );
        }

        savedApplication =
          this.findApplication(accountId);
      }
    );

    return jsonResponse({
      success: true,
      action,
      application: savedApplication,
      message: actionMessage(action),
    });
  }

  requireStatus(
    application,
    expectedStatus,
    actionLabel
  ) {
    if (
      application.status !==
      expectedStatus
    ) {
      throw new RegistryError(
        `Only a ${expectedStatus} application can be ${actionLabel}.`,
        409
      );
    }
  }

  requireOwnedReservation(
    application
  ) {
    const reservation =
      this.findReservation(
        application.code
      );

    if (
      !reservation ||
      reservation.accountId !==
        application.accountId
    ) {
      throw new RegistryError(
        "The selected partner code is no longer reserved for this applicant.",
        409
      );
    }
  }

  setReservationStatus(
    accountId,
    status,
    updatedAt
  ) {
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
      accountId:
        rows[0].account_id,
      status: rows[0].status,
      reservedAt:
        rows[0].reserved_at,
      updatedAt:
        rows[0].updated_at,
    };
  }
}

function normalizeApplication(
  payload
) {
  const application = {
    accountId: cleanText(
      payload.accountId,
      150
    ),

    email: cleanText(
      payload.email,
      254
    ).toLowerCase(),

    firstName: cleanText(
      payload.firstName,
      100
    ),

    lastName: cleanText(
      payload.lastName,
      100
    ),

    code: normalizeCode(
      payload.code
    ),

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

    promotionPlan:
      cleanMultilineText(
        payload.promotionPlan,
        2000
      ),

    experience:
      cleanMultilineText(
        payload.experience,
        1000
      ),

    agreementAcceptedAt:
      cleanText(
        payload.agreementAcceptedAt,
        50
      ),

    agreementVersion:
      cleanText(
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

    status:
      APPLICATION_STATUSES.has(
        status
      )
        ? status
        : "pending",

    primaryPlatform:
      row.primary_platform,

    profileUrl:
      row.profile_url || "",

    audienceSize:
      row.audience_size,

    promotionPlan:
      row.promotion_plan,

    experience:
      row.experience || "",

    agreementAcceptedAt:
      row.agreement_accepted_at,

    agreementVersion:
      row.agreement_version || "",

    submittedAt:
      row.submitted_at,

    updatedAt:
      row.updated_at,

    applicationNumber:
      Number(
        row.application_number || 1
      ),

    reviewedAt:
      row.reviewed_at || "",

    reviewedBy:
      row.reviewed_by || "",

    customerMessage:
      row.customer_message || "",

    adminNotes:
      row.admin_notes || "",

    deniedAt:
      row.denied_at || "",

    suspendedAt:
      row.suspended_at || "",

    reactivatedAt:
      row.reactivated_at || "",

    lastStatusChangeAt:
      row.last_status_change_at || "",
  };
}

function normalizeCode(value) {
  return cleanText(
    value,
    30
  ).toUpperCase();
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

  const text =
    await request.text();

  if (text.length > 25_000) {
    throw new RegistryError(
      "The partner request is too large.",
      413
    );
  }

  try {
    const payload =
      JSON.parse(text);

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

function jsonResponse(
  body,
  status = 200
) {
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
  constructor(
    message,
    status = 400
  ) {
    super(message);

    this.name =
      "RegistryError";

    this.status =
      status;
  }
}
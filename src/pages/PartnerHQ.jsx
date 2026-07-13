import { useCallback, useEffect, useMemo, useState } from "react";

const ADMIN_SESSION_KEY = "304-document-admin-session";

const statusFilters = [
  ["all", "All Applications"],
  ["pending", "Pending Review"],
  ["approved", "Approved Partners"],
  ["suspended", "Suspended Partners"],
  ["denied", "Denied Applications"],
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
    // The secret remains available in React state for this page session.
  }
}

function removeStoredSecret() {
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // Storage may be unavailable.
  }
}

function formatDate(value) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeApplications(records) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .map((record) => ({
      ...record,
      status: String(record.status || "pending").toLowerCase(),
      code: String(record.code || "").toUpperCase(),
    }))
    .sort((left, right) => {
      const priority = {
        pending: 0,
        approved: 1,
        suspended: 2,
        denied: 3,
      };

      const statusDifference =
        (priority[left.status] ?? 9) -
        (priority[right.status] ?? 9);

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return String(
        right.submittedAt ||
          right.updatedAt ||
          ""
      ).localeCompare(
        String(
          left.submittedAt ||
            left.updatedAt ||
            ""
        )
      );
    });
}

async function readJson(response) {
  const text = await response.text();
  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(
      "The protected Partner Program service returned an invalid response."
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error ||
        "The protected Partner Program request could not be completed."
    );
  }

  return result;
}

function PartnerHQ({
  onNavigate = () => {},
}) {
  const [
    adminSecret,
    setAdminSecret,
  ] = useState(getStoredSecret);

  const [
    secretInput,
    setSecretInput,
  ] = useState("");

  const [
    applications,
    setApplications,
  ] = useState([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    Boolean(adminSecret)
  );

  const [
    isReady,
    setIsReady,
  ] = useState(false);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    actionError,
    setActionError,
  ] = useState("");

  const [
    actionMessage,
    setActionMessage,
  ] = useState("");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    expandedAccountId,
    setExpandedAccountId,
  ] = useState("");

  const [
    actionAccountId,
    setActionAccountId,
  ] = useState("");

  const [
    actionType,
    setActionType,
  ] = useState("");

  const [
    customerMessage,
    setCustomerMessage,
  ] = useState("");

  const [
    adminNotes,
    setAdminNotes,
  ] = useState("");

  const [
    isActing,
    setIsActing,
  ] = useState(false);

  const loadApplications =
    useCallback(
      async (
        secret = adminSecret
      ) => {
        const cleanedSecret =
          String(
            secret || ""
          ).trim();

        if (!cleanedSecret) {
          return;
        }

        setIsLoading(true);
        setLoadError("");
        setActionError("");

        try {
          const response =
            await fetch(
              "/api/admin/partner-applications",
              {
                method: "GET",

                headers: {
                  Accept:
                    "application/json",

                  Authorization:
                    `Bearer ${cleanedSecret}`,
                },

                credentials:
                  "same-origin",

                cache:
                  "no-store",
              }
            );

          const result =
            await readJson(
              response
            );

          setApplications(
            normalizeApplications(
              result.applications ||
                result.records ||
                []
            )
          );

          setIsReady(true);
        } catch (error) {
          setApplications([]);
          setIsReady(false);

          setLoadError(
            error.message ||
              "Partner applications could not be loaded."
          );
        } finally {
          setIsLoading(false);
        }
      },
      [
        adminSecret,
      ]
    );

  useEffect(() => {
    if (adminSecret) {
      loadApplications(
        adminSecret
      );
    }
  }, [
    adminSecret,
    loadApplications,
  ]);

  const statistics =
    useMemo(() => {
      return applications.reduce(
        (
          totals,
          application
        ) => {
          totals.total += 1;

          totals[
            application.status
          ] =
            Number(
              totals[
                application.status
              ] || 0
            ) + 1;

          return totals;
        },
        {
          total: 0,
          pending: 0,
          approved: 0,
          suspended: 0,
          denied: 0,
        }
      );
    }, [
      applications,
    ]);

  const filteredApplications =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return applications.filter(
        (
          application
        ) => {
          const matchesStatus =
            statusFilter ===
              "all" ||
            application.status ===
              statusFilter;

          const searchableText = [
            application.firstName,
            application.lastName,
            application.email,
            application.code,
            application.primaryPlatform,
            application.profileUrl,
            application.audienceSize,
            application.promotionPlan,
            application.experience,
            application.customerMessage,
            application.adminNotes,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return (
            matchesStatus &&
            (
              !search ||
              searchableText.includes(
                search
              )
            )
          );
        }
      );
    }, [
      applications,
      searchTerm,
      statusFilter,
    ]);

  function handleUnlock(
    event
  ) {
    event.preventDefault();

    const cleanedSecret =
      secretInput.trim();

    if (!cleanedSecret) {
      setLoadError(
        "Enter the administrator secret."
      );

      return;
    }

    storeSecret(
      cleanedSecret
    );

    setAdminSecret(
      cleanedSecret
    );

    setSecretInput("");
  }

  function clearAdminSession() {
    removeStoredSecret();

    setAdminSecret("");
    setSecretInput("");
    setApplications([]);
    setIsReady(false);
    setLoadError("");
    setActionError("");
    setActionMessage("");

    closeActionPanel();
  }

  function openActionPanel(
    application,
    action
  ) {
    setActionAccountId(
      application.accountId
    );

    setActionType(
      action
    );

    setCustomerMessage("");

    setAdminNotes(
      application.adminNotes ||
        ""
    );

    setActionError("");
    setActionMessage("");

    window.setTimeout(
      () => {
        document
          .getElementById(
            "partner-action-panel"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "center",
          });
      },
      0
    );
  }

  function closeActionPanel() {
    setActionAccountId("");
    setActionType("");
    setCustomerMessage("");
    setAdminNotes("");
    setIsActing(false);
  }

  async function submitAction(
    event
  ) {
    event.preventDefault();

    const application =
      applications.find(
        (
          record
        ) =>
          record.accountId ===
          actionAccountId
      );

    if (
      !application ||
      !actionType ||
      isActing
    ) {
      return;
    }

    if (
      [
        "deny",
        "suspend",
      ].includes(
        actionType
      ) &&
      !customerMessage.trim()
    ) {
      setActionError(
        actionType ===
          "deny"
          ? "Enter the reason the customer will see before denying the application."
          : "Enter the reason the customer will see before suspending the partner."
      );

      return;
    }

    const confirmationText =
      getConfirmationText(
        actionType,
        application
      );

    if (
      !window.confirm(
        confirmationText
      )
    ) {
      return;
    }

    setIsActing(true);
    setActionError("");
    setActionMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/partner-applications/action",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              Authorization:
                `Bearer ${adminSecret}`,
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                action:
                  actionType,

                accountId:
                  application.accountId,

                customerMessage:
                  customerMessage.trim(),

                adminNotes:
                  adminNotes.trim(),
              }),
          }
        );

      const result =
        await readJson(
          response
        );

      const updatedApplication =
        result.application;

      setApplications(
        (
          current
        ) =>
          normalizeApplications(
            current.map(
              (
                record
              ) =>
                record.accountId ===
                updatedApplication.accountId
                  ? updatedApplication
                  : record
            )
          )
      );

      setActionMessage(
        result.message ||
          "The Partner Program record was updated."
      );

      closeActionPanel();
    } catch (error) {
      setActionError(
        error.message ||
          "The Partner Program action failed."
      );

      setIsActing(false);
    }
  }

  if (!adminSecret) {
    return (
      <>
        <style>
          {partnerHqCss}
        </style>

        <main className="partner-hq-page">
          <section className="partner-hq-login-card">
            <p className="eyebrow">
              PROTECTED ADMIN
              AREA
            </p>

            <h1>
              Partner HQ
            </h1>

            <p>
              Cloudflare
              Access protects
              this route. Enter
              the same
              administrator
              secret used by
              Customer Manager
              to load Partner
              Program records.
            </p>

            <form
              onSubmit={
                handleUnlock
              }
            >
              <label className="partner-hq-field">
                <span>
                  Administrator
                  Secret
                </span>

                <input
                  type="password"
                  value={
                    secretInput
                  }
                  onChange={(
                    event
                  ) =>
                    setSecretInput(
                      event.target
                        .value
                    )
                  }
                  autoComplete="current-password"
                  placeholder="Enter administrator secret"
                />
              </label>

              {loadError && (
                <div
                  className="partner-hq-error"
                  role="alert"
                >
                  {
                    loadError
                  }
                </div>
              )}

              <button
                type="submit"
                className="primary-btn partner-hq-full-button"
              >
                Unlock Partner
                HQ
              </button>
            </form>

            <button
              type="button"
              className="secondary-btn partner-hq-full-button"
              onClick={() =>
                onNavigate(
                  "missionControl"
                )
              }
            >
              Back To Mission
              Control
            </button>
          </section>
        </main>
      </>
    );
  }

  const selectedApplication =
    applications.find(
      (
        application
      ) =>
        application.accountId ===
        actionAccountId
    );

  return (
    <>
      <style>
        {partnerHqCss}
      </style>

      <main className="partner-hq-page">
        <section className="partner-hq-inner">
          <div className="partner-hq-topbar">
            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                onNavigate(
                  "missionControl"
                )
              }
            >
              ← Mission Control
            </button>

            <div className="partner-hq-topbar-actions">
              <span className="partner-hq-source-pill">
                {isReady
                  ? "Live Partner Registry"
                  : "Registry Locked"}
              </span>

              <button
                type="button"
                className="partner-hq-clear-button"
                onClick={
                  clearAdminSession
                }
              >
                Clear Admin
                Session
              </button>
            </div>
          </div>

          <header className="partner-hq-hero">
            <div>
              <p className="eyebrow">
                304 PEPTIDES
                ADMIN
              </p>

              <h1>
                Partner HQ
              </h1>

              <p>
                Review
                applications,
                preserve
                customer-selected
                affiliate codes,
                record private
                notes, and
                control partner
                approval status.
              </p>
            </div>

            <button
              type="button"
              className="primary-btn"
              disabled={
                isLoading
              }
              onClick={() =>
                loadApplications(
                  adminSecret
                )
              }
            >
              {isLoading
                ? "Refreshing..."
                : "Refresh Applications"}
            </button>
          </header>

          <section className="partner-hq-stats">
            <StatCard
              label="Total"
              value={
                statistics.total
              }
              detail="All records"
            />

            <StatCard
              label="Pending"
              value={
                statistics.pending
              }
              detail="Need review"
            />

            <StatCard
              label="Approved"
              value={
                statistics.approved
              }
              detail="Active codes"
            />

            <StatCard
              label="Suspended"
              value={
                statistics.suspended
              }
              detail="Codes inactive"
            />

            <StatCard
              label="Denied"
              value={
                statistics.denied
              }
              detail="May reapply"
            />
          </section>

          {loadError && (
            <div
              className="partner-hq-error"
              role="alert"
            >
              {loadError}
            </div>
          )}

          {actionError && (
            <div
              className="partner-hq-error"
              role="alert"
            >
              {actionError}
            </div>
          )}

          {actionMessage && (
            <div
              className="partner-hq-success"
              aria-live="polite"
            >
              {actionMessage}
            </div>
          )}

          {selectedApplication &&
            actionType && (
              <form
                id="partner-action-panel"
                className="partner-hq-action-panel"
                onSubmit={
                  submitAction
                }
              >
                <div className="partner-hq-section-heading">
                  <div>
                    <p className="eyebrow">
                      CONFIRM
                      PARTNER
                      ACTION
                    </p>

                    <h2>
                      {
                        getActionTitle(
                          actionType
                        )
                      }
                    </h2>

                    <p>
                      {
                        selectedApplication.firstName
                      }{" "}
                      {
                        selectedApplication.lastName
                      }{" "}
                      —{" "}
                      <strong>
                        {
                          selectedApplication.code
                        }
                      </strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    className="partner-hq-close-button"
                    onClick={
                      closeActionPanel
                    }
                    disabled={
                      isActing
                    }
                  >
                    Close
                  </button>
                </div>

                <div className="partner-hq-form-grid">
                  <label className="partner-hq-field">
                    <span>
                      Customer
                      Message
                      {[
                        "deny",
                        "suspend",
                      ].includes(
                        actionType
                      )
                        ? " — Required"
                        : " — Optional"}
                    </span>

                    <textarea
                      rows="5"
                      value={
                        customerMessage
                      }
                      onChange={(
                        event
                      ) =>
                        setCustomerMessage(
                          event.target
                            .value
                        )
                      }
                      maxLength="1000"
                      disabled={
                        isActing
                      }
                      placeholder={
                        getCustomerMessagePlaceholder(
                          actionType
                        )
                      }
                    />

                    <small>
                      {
                        customerMessage.length
                      }
                      /1000
                      characters
                    </small>
                  </label>

                  <label className="partner-hq-field">
                    <span>
                      Private Admin
                      Notes —
                      Optional
                    </span>

                    <textarea
                      rows="5"
                      value={
                        adminNotes
                      }
                      onChange={(
                        event
                      ) =>
                        setAdminNotes(
                          event.target
                            .value
                        )
                      }
                      maxLength="2000"
                      disabled={
                        isActing
                      }
                      placeholder="Visible only inside protected Partner HQ."
                    />

                    <small>
                      {
                        adminNotes.length
                      }
                      /2000
                      characters
                    </small>
                  </label>
                </div>

                <div className="partner-hq-action-buttons">
                  <button
                    type="submit"
                    className={
                      [
                        "deny",
                        "suspend",
                      ].includes(
                        actionType
                      )
                        ? "partner-hq-danger-button"
                        : "primary-btn"
                    }
                    disabled={
                      isActing
                    }
                  >
                    {isActing
                      ? "Saving..."
                      : getActionButtonLabel(
                          actionType
                        )}
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={
                      closeActionPanel
                    }
                    disabled={
                      isActing
                    }
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

          <section className="partner-hq-records-panel">
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">
                  APPLICATION
                  DIRECTORY
                </p>

                <h2>
                  Partner Records
                </h2>
              </div>

              <span>
                Showing{" "}
                <strong>
                  {
                    filteredApplications.length
                  }
                </strong>{" "}
                of{" "}
                <strong>
                  {
                    applications.length
                  }
                </strong>
              </span>
            </div>

            <div className="partner-hq-filters">
              <label className="partner-hq-field">
                <span>
                  Search
                  Applications
                </span>

                <input
                  type="search"
                  value={
                    searchTerm
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchTerm(
                      event.target
                        .value
                    )
                  }
                  placeholder="Name, email, code, platform, or notes"
                />
              </label>

              <label className="partner-hq-field">
                <span>
                  Status
                </span>

                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusFilter(
                      event.target
                        .value
                    )
                  }
                >
                  {statusFilters.map(
                    ([
                      value,
                      label,
                    ]) => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        {
                          label
                        }
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            {isLoading ? (
              <div className="partner-hq-empty">
                <h3>
                  Loading
                  Applications
                </h3>

                <p>
                  Retrieving
                  protected
                  Partner Program
                  records.
                </p>
              </div>
            ) : filteredApplications.length ===
              0 ? (
              <div className="partner-hq-empty">
                <h3>
                  No Matching
                  Applications
                </h3>

                <p>
                  No Partner
                  Program records
                  match the
                  current search
                  and status
                  filter.
                </p>
              </div>
            ) : (
              <div className="partner-hq-card-stack">
                {filteredApplications.map(
                  (
                    application
                  ) => {
                    const expanded =
                      expandedAccountId ===
                      application.accountId;

                    return (
                      <article
                        key={
                          application.accountId
                        }
                        className={`partner-hq-card partner-hq-card-${application.status}`}
                      >
                        <div className="partner-hq-card-summary">
                          <div className="partner-hq-card-main">
                            <div className="partner-hq-card-title-row">
                              <div>
                                <p className="eyebrow">
                                  {
                                    application.code
                                  }
                                </p>

                                <h3>
                                  {`${application.firstName || ""} ${application.lastName || ""}`.trim() ||
                                    "Name unavailable"}
                                </h3>

                                <p className="partner-hq-email">
                                  {
                                    application.email
                                  }
                                </p>
                              </div>

                              <StatusPill
                                status={
                                  application.status
                                }
                              />
                            </div>

                            <div className="partner-hq-card-quick-grid">
                              <QuickDetail
                                label="Platform"
                                value={
                                  application.primaryPlatform ||
                                  "Unavailable"
                                }
                              />

                              <QuickDetail
                                label="Audience"
                                value={
                                  application.audienceSize ||
                                  "Unavailable"
                                }
                              />

                              <QuickDetail
                                label="Submitted"
                                value={formatDate(
                                  application.submittedAt
                                )}
                              />

                              <QuickDetail
                                label="Application"
                                value={`#${application.applicationNumber || 1}`}
                              />
                            </div>
                          </div>

                          <div className="partner-hq-card-buttons">
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() =>
                                setExpandedAccountId(
                                  expanded
                                    ? ""
                                    : application.accountId
                                )
                              }
                            >
                              {expanded
                                ? "Hide Details"
                                : "View Details"}
                            </button>

                            {application.status ===
                              "pending" && (
                              <>
                                <button
                                  type="button"
                                  className="primary-btn"
                                  onClick={() =>
                                    openActionPanel(
                                      application,
                                      "approve"
                                    )
                                  }
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  className="partner-hq-danger-button"
                                  onClick={() =>
                                    openActionPanel(
                                      application,
                                      "deny"
                                    )
                                  }
                                >
                                  Deny
                                </button>
                              </>
                            )}

                            {application.status ===
                              "approved" && (
                              <button
                                type="button"
                                className="partner-hq-danger-button"
                                onClick={() =>
                                  openActionPanel(
                                    application,
                                    "suspend"
                                  )
                                }
                              >
                                Suspend
                              </button>
                            )}

                            {application.status ===
                              "suspended" && (
                              <button
                                type="button"
                                className="primary-btn"
                                onClick={() =>
                                  openActionPanel(
                                    application,
                                    "reactivate"
                                  )
                                }
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </div>

                        {expanded && (
                          <div className="partner-hq-card-details">
                            <DetailBlock
                              title="Promotion Plan"
                              text={
                                application.promotionPlan ||
                                "Not supplied."
                              }
                            />

                            <DetailBlock
                              title="Relevant Experience"
                              text={
                                application.experience ||
                                "Not supplied."
                              }
                            />

                            <div className="partner-hq-detail-grid">
                              <QuickDetail
                                label="Profile URL"
                                value={
                                  application.profileUrl ||
                                  "Not supplied"
                                }
                              />

                              <QuickDetail
                                label="Agreement Accepted"
                                value={formatDate(
                                  application.agreementAcceptedAt
                                )}
                              />

                              <QuickDetail
                                label="Reviewed"
                                value={formatDate(
                                  application.reviewedAt
                                )}
                              />

                              <QuickDetail
                                label="Reviewed By"
                                value={
                                  application.reviewedBy ||
                                  "Not reviewed"
                                }
                              />
                            </div>

                            {application.customerMessage && (
                              <DetailBlock
                                title="Customer Message"
                                text={
                                  application.customerMessage
                                }
                                highlighted
                              />
                            )}

                            {application.adminNotes && (
                              <DetailBlock
                                title="Private Admin Notes"
                                text={
                                  application.adminNotes
                                }
                                privateNote
                              />
                            )}

                            <div className="partner-hq-history-grid">
                              <QuickDetail
                                label="Denied"
                                value={formatDate(
                                  application.deniedAt
                                )}
                              />

                              <QuickDetail
                                label="Suspended"
                                value={formatDate(
                                  application.suspendedAt
                                )}
                              />

                              <QuickDetail
                                label="Reactivated"
                                value={formatDate(
                                  application.reactivatedAt
                                )}
                              />

                              <QuickDetail
                                label="Last Status Change"
                                value={formatDate(
                                  application.lastStatusChangeAt
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <section className="partner-hq-security-note">
            <p className="eyebrow">
              PROGRAM SECURITY
            </p>

            <h2>
              Customer Codes
              Stay With Their
              Accounts
            </h2>

            <p>
              Pending and
              approved codes
              remain reserved
              to the
              applicant’s
              account. Denial
              releases the
              code so it can
              be selected
              again.
              Suspension
              disables the
              code without
              releasing it to
              another
              applicant.
            </p>
          </section>
        </section>
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
  detail,
}) {
  return (
    <div className="partner-hq-stat-card">
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

function StatusPill({
  status,
}) {
  return (
    <span
      className={`partner-hq-status partner-hq-status-${status}`}
    >
      {String(
        status ||
          "pending"
      ).toUpperCase()}
    </span>
  );
}

function QuickDetail({
  label,
  value,
}) {
  return (
    <div className="partner-hq-quick-detail">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function DetailBlock({
  title,
  text,
  highlighted = false,
  privateNote = false,
}) {
  const classes = [
    "partner-hq-detail-block",

    highlighted
      ? "partner-hq-detail-highlighted"
      : "",

    privateNote
      ? "partner-hq-detail-private"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={
        classes
      }
    >
      <strong>
        {title}
      </strong>

      <p>
        {text}
      </p>
    </section>
  );
}

function getActionTitle(
  action
) {
  const titles = {
    approve:
      "Approve Partner Application",

    deny:
      "Deny Partner Application",

    suspend:
      "Suspend Partner Access",

    reactivate:
      "Reactivate Partner Access",
  };

  return (
    titles[action] ||
    "Update Partner Record"
  );
}

function getActionButtonLabel(
  action
) {
  const labels = {
    approve:
      "Approve Application",

    deny:
      "Deny Application",

    suspend:
      "Suspend Partner",

    reactivate:
      "Reactivate Partner",
  };

  return (
    labels[action] ||
    "Save Action"
  );
}

function getCustomerMessagePlaceholder(
  action
) {
  if (
    action ===
    "deny"
  ) {
    return "Explain why the application was not approved and what may be changed before reapplying.";
  }

  if (
    action ===
    "suspend"
  ) {
    return "Explain why Partner Program access was suspended and how the partner may contact support.";
  }

  if (
    action ===
    "approve"
  ) {
    return "Optional welcome or approval message shown to the partner.";
  }

  return "Optional reactivation message shown to the partner.";
}

function getConfirmationText(
  action,
  application
) {
  const code =
    application.code ||
    "this code";

  if (
    action ===
    "approve"
  ) {
    return `Approve ${code}? The customer-selected code will become active.`;
  }

  if (
    action ===
    "deny"
  ) {
    return `Deny ${code}? The code reservation will be released and may be claimed again.`;
  }

  if (
    action ===
    "suspend"
  ) {
    return `Suspend ${code}? The code will become inactive but remain reserved to this account.`;
  }

  return `Reactivate ${code}? The existing code will become active again.`;
}

const partnerHqCss = `
.partner-hq-page,
.partner-hq-page *,
.partner-hq-page *::before,
.partner-hq-page *::after {
  box-sizing: border-box;
}

.partner-hq-page {
  width: 100%;
  padding: 72px 28px;
}

.partner-hq-inner {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.partner-hq-login-card,
.partner-hq-hero,
.partner-hq-records-panel,
.partner-hq-action-panel,
.partner-hq-security-note {
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 24px;
  background:
    radial-gradient(
      circle at top left,
      rgba(61, 165, 255, .12),
      transparent 38%
    ),
    rgba(255, 255, 255, .04);
  box-shadow: 0 24px 65px rgba(0, 0, 0, .35);
}

.partner-hq-login-card {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 42px;
  text-align: center;
}

.partner-hq-login-card h1,
.partner-hq-hero h1 {
  margin: 8px 0 16px;
  font-size: clamp(38px, 7vw, 62px);
  line-height: 1.03;
}

.partner-hq-login-card > p:not(.eyebrow),
.partner-hq-hero p,
.partner-hq-security-note p {
  color: #b6c0c8;
  line-height: 1.7;
}

.partner-hq-topbar,
.partner-hq-topbar-actions,
.partner-hq-hero,
.partner-hq-section-heading,
.partner-hq-card-summary,
.partner-hq-card-title-row,
.partner-hq-action-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.partner-hq-topbar {
  margin-bottom: 20px;
}

.partner-hq-topbar-actions {
  justify-content: flex-end;
}

.partner-hq-source-pill,
.partner-hq-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.partner-hq-source-pill {
  border: 1px solid rgba(72, 214, 151, .3);
  background: rgba(72, 214, 151, .09);
  color: #b8f3d8;
}

.partner-hq-clear-button,
.partner-hq-close-button {
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: #9ca8b0;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  text-decoration: underline;
}

.partner-hq-hero {
  padding: 40px;
  margin-bottom: 20px;
}

.partner-hq-hero > div {
  max-width: 780px;
}

.partner-hq-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.partner-hq-stat-card,
.partner-hq-quick-detail {
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 14px;
  background: rgba(255, 255, 255, .035);
}

.partner-hq-stat-card span,
.partner-hq-quick-detail span,
.partner-hq-field > span {
  color: #9ed8ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.partner-hq-stat-card strong {
  font-size: 30px;
}

.partner-hq-stat-card small,
.partner-hq-field small {
  color: #8f9aa2;
}

.partner-hq-records-panel,
.partner-hq-action-panel,
.partner-hq-security-note {
  padding: 28px;
  margin-top: 20px;
}

.partner-hq-section-heading h2,
.partner-hq-action-panel h2,
.partner-hq-security-note h2 {
  margin: 6px 0 8px;
  font-size: clamp(28px, 4vw, 38px);
}

.partner-hq-filters,
.partner-hq-form-grid {
  display: grid;
  grid-template-columns:
    minmax(0, 1.6fr)
    minmax(220px, .7fr);
  gap: 14px;
  margin-top: 20px;
}

.partner-hq-form-grid {
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
}

.partner-hq-field {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  text-align: left;
}

.partner-hq-field input,
.partner-hq-field select,
.partner-hq-field textarea {
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 12px;
  outline: none;
  background: #151b22;
  color: #fff;
  font: inherit;
}

.partner-hq-field input:focus,
.partner-hq-field select:focus,
.partner-hq-field textarea:focus {
  border-color: rgba(61, 165, 255, .65);
  box-shadow: 0 0 0 3px rgba(61, 165, 255, .12);
}

.partner-hq-field select option {
  background: #151b22;
  color: #fff;
}

.partner-hq-field textarea {
  resize: vertical;
}

.partner-hq-full-button {
  width: 100%;
  margin-top: 16px;
}

.partner-hq-error,
.partner-hq-success {
  margin: 16px 0;
  padding: 15px;
  border-radius: 14px;
  line-height: 1.55;
}

.partner-hq-error {
  border: 1px solid rgba(255, 95, 95, .34);
  background: rgba(255, 70, 70, .1);
  color: #ffd0d0;
}

.partner-hq-success {
  border: 1px solid rgba(72, 214, 151, .3);
  background: rgba(72, 214, 151, .09);
  color: #b8f3d8;
}

.partner-hq-danger-button {
  padding: 12px 18px;
  border: 1px solid rgba(255, 95, 95, .45);
  border-radius: 10px;
  background: rgba(255, 70, 70, .12);
  color: #ffd0d0;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}

.partner-hq-card-stack {
  display: grid;
  gap: 14px;
  margin-top: 22px;
}

.partner-hq-card {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 18px;
  background: rgba(0, 0, 0, .17);
}

.partner-hq-card-pending {
  border-color: rgba(255, 190, 80, .28);
}

.partner-hq-card-approved {
  border-color: rgba(72, 214, 151, .25);
}

.partner-hq-card-suspended,
.partner-hq-card-denied {
  border-color: rgba(255, 95, 95, .25);
}

.partner-hq-card-summary {
  align-items: stretch;
  padding: 20px;
}

.partner-hq-card-main {
  flex: 1 1 720px;
  min-width: 0;
}

.partner-hq-card-title-row {
  align-items: flex-start;
}

.partner-hq-card-title-row h3 {
  margin: 4px 0;
  font-size: 25px;
}

.partner-hq-email {
  color: #aab5bd;
  overflow-wrap: anywhere;
}

.partner-hq-status-pending {
  border: 1px solid rgba(255, 190, 80, .35);
  background: rgba(255, 170, 50, .1);
  color: #ffe0a8;
}

.partner-hq-status-approved {
  border: 1px solid rgba(72, 214, 151, .35);
  background: rgba(72, 214, 151, .1);
  color: #b8f3d8;
}

.partner-hq-status-suspended,
.partner-hq-status-denied {
  border: 1px solid rgba(255, 95, 95, .38);
  background: rgba(255, 70, 70, .11);
  color: #ffcaca;
}

.partner-hq-card-quick-grid,
.partner-hq-detail-grid,
.partner-hq-history-grid {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.partner-hq-quick-detail strong {
  overflow-wrap: anywhere;
  font-size: 14px;
}

.partner-hq-card-buttons {
  flex: 0 0 170px;
  display: grid;
  align-content: center;
  gap: 10px;
}

.partner-hq-card-buttons button {
  width: 100%;
}

.partner-hq-card-details {
  display: grid;
  gap: 13px;
  padding: 0 20px 20px;
}

.partner-hq-detail-block {
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 14px;
  background: rgba(255, 255, 255, .025);
}

.partner-hq-detail-block p {
  margin-top: 8px;
  color: #b0bac1;
  line-height: 1.65;
  white-space: pre-wrap;
}

.partner-hq-detail-highlighted {
  border-color: rgba(61, 165, 255, .28);
  background: rgba(61, 165, 255, .07);
}

.partner-hq-detail-private {
  border-color: rgba(185, 130, 255, .3);
  background: rgba(185, 130, 255, .07);
}

.partner-hq-empty {
  padding: 48px 20px;
  text-align: center;
  color: #aab5bd;
}

.partner-hq-empty h3 {
  margin-bottom: 8px;
  color: #fff;
  font-size: 26px;
}

.partner-hq-action-buttons {
  justify-content: flex-start;
  margin-top: 20px;
}

.partner-hq-security-note {
  text-align: center;
}

.partner-hq-security-note p {
  max-width: 820px;
  margin: 0 auto;
}

button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

@media (max-width: 1050px) {
  .partner-hq-stats {
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
  }

  .partner-hq-card-quick-grid,
  .partner-hq-detail-grid,
  .partner-hq-history-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .partner-hq-page {
    padding: 48px 12px;
  }

  .partner-hq-login-card,
  .partner-hq-hero,
  .partner-hq-records-panel,
  .partner-hq-action-panel,
  .partner-hq-security-note {
    padding: 20px;
    border-radius: 19px;
  }

  .partner-hq-stats,
  .partner-hq-filters,
  .partner-hq-form-grid,
  .partner-hq-card-quick-grid,
  .partner-hq-detail-grid,
  .partner-hq-history-grid {
    grid-template-columns:
      minmax(0, 1fr);
  }

  .partner-hq-card-buttons {
    flex: 1 1 100%;
  }

  .partner-hq-hero > button,
  .partner-hq-action-buttons button {
    width: 100%;
  }
}
`;

export default PartnerHQ;
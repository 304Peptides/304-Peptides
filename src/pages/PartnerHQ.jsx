import { useCallback, useEffect, useMemo, useState } from "react";

const ADMIN_SESSION_KEY = "304-document-admin-session";

const applicationFilters = [
  ["all", "All Applications"],
  ["pending", "Pending Review"],
  ["approved", "Approved Partners"],
  ["suspended", "Suspended Partners"],
  ["denied", "Denied Applications"],
];

const referralFilters = [
  ["all", "All Referrals"],
  ["pending", "Pending"],
  ["earned", "Earned"],
  ["voided", "Voided"],
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
    // React state keeps the secret for the current page session.
  }
}

function removeStoredSecret() {
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // Session storage may be unavailable.
  }
}

function formatDate(value) {
  if (!value) return "Unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function formatMoneyFromCents(value) {
  return (Number(value || 0) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatPercentFromBasisPoints(value) {
  const percentage = Number(value || 0) / 100;

  return `${percentage.toLocaleString("en-US", {
    minimumFractionDigits: percentage % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}%`;
}

function normalizeApplications(records) {
  const priority = {
    pending: 0,
    approved: 1,
    suspended: 2,
    denied: 3,
  };

  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .map((record) => ({
      ...record,
      code: String(record.code || "").toUpperCase(),
      status: String(record.status || "pending").toLowerCase(),
      commissionRateBps: Number(record.commissionRateBps || 0),
    }))
    .sort((left, right) => {
      const statusDifference =
        (priority[left.status] ?? 9) - (priority[right.status] ?? 9);

      return statusDifference !== 0
        ? statusDifference
        : String(right.submittedAt || right.updatedAt || "").localeCompare(
            String(left.submittedAt || left.updatedAt || "")
          );
    });
}

function normalizeReferrals(records) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .map((record) => ({
      ...record,
      partnerCode: String(record.partnerCode || "").toUpperCase(),
      referralStatus: String(record.referralStatus || "pending").toLowerCase(),
      orderSubtotalCents: Number(record.orderSubtotalCents || 0),
      commissionRateBps: Number(record.commissionRateBps || 0),
      commissionAmountCents: Number(record.commissionAmountCents || 0),
    }))
    .sort((left, right) =>
      String(right.createdAt || right.updatedAt || "").localeCompare(
        String(left.createdAt || left.updatedAt || "")
      )
    );
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

function PartnerHQ({ onNavigate = () => {} }) {
  const [adminSecret, setAdminSecret] = useState(getStoredSecret);
  const [secretInput, setSecretInput] = useState("");
  const [applications, setApplications] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(adminSecret));
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [applicationSearch, setApplicationSearch] = useState("");
  const [applicationStatus, setApplicationStatus] = useState("all");
  const [referralSearch, setReferralSearch] = useState("");
  const [referralStatus, setReferralStatus] = useState("all");
  const [expandedAccountId, setExpandedAccountId] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isActing, setIsActing] = useState(false);
  const [rateDrafts, setRateDrafts] = useState({});
  const [rateSavingId, setRateSavingId] = useState("");

  const loadPartnerData = useCallback(
    async (secret = adminSecret) => {
      const cleanedSecret = String(secret || "").trim();
      if (!cleanedSecret) return;

      setIsLoading(true);
      setLoadError("");
      setActionError("");

      try {
        const headers = {
          Accept: "application/json",
          Authorization: `Bearer ${cleanedSecret}`,
        };

        const [applicationResponse, referralResponse] = await Promise.all([
          fetch("/api/admin/partner-applications", {
            method: "GET",
            headers,
            credentials: "same-origin",
            cache: "no-store",
          }),
          fetch("/api/admin/partner-referrals", {
            method: "GET",
            headers,
            credentials: "same-origin",
            cache: "no-store",
          }),
        ]);

        const [applicationResult, referralResult] = await Promise.all([
          readJson(applicationResponse),
          readJson(referralResponse),
        ]);

        const nextApplications = normalizeApplications(
          applicationResult.applications || applicationResult.records || []
        );

        setApplications(nextApplications);

        setReferrals(
          normalizeReferrals(
            referralResult.referrals || referralResult.records || []
          )
        );

        setRateDrafts(
          Object.fromEntries(
            nextApplications.map((application) => [
              application.accountId,
              String(Number(application.commissionRateBps || 0) / 100),
            ])
          )
        );

        setIsReady(true);
      } catch (error) {
        setApplications([]);
        setReferrals([]);
        setIsReady(false);

        setLoadError(
          error.message || "Partner records could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [adminSecret]
  );

  useEffect(() => {
    if (adminSecret) {
      loadPartnerData(adminSecret);
    }
  }, [adminSecret, loadPartnerData]);

  const applicationStats = useMemo(
    () =>
      applications.reduce(
        (totals, application) => {
          totals.total += 1;

          totals[application.status] =
            Number(totals[application.status] || 0) + 1;

          return totals;
        },
        {
          total: 0,
          pending: 0,
          approved: 0,
          suspended: 0,
          denied: 0,
        }
      ),
    [applications]
  );

  const referralStats = useMemo(
    () =>
      referrals.reduce(
        (totals, referral) => {
          totals.total += 1;

          totals[referral.referralStatus] =
            Number(totals[referral.referralStatus] || 0) + 1;

          if (referral.referralStatus === "pending") {
            totals.pendingCommissionCents +=
              referral.commissionAmountCents;
          }

          if (referral.referralStatus === "earned") {
            totals.earnedCommissionCents +=
              referral.commissionAmountCents;

            totals.earnedRevenueCents +=
              referral.orderSubtotalCents;
          }

          return totals;
        },
        {
          total: 0,
          pending: 0,
          earned: 0,
          voided: 0,
          pendingCommissionCents: 0,
          earnedCommissionCents: 0,
          earnedRevenueCents: 0,
        }
      ),
    [referrals]
  );

  const filteredApplications = useMemo(() => {
    const search = applicationSearch.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus =
        applicationStatus === "all" ||
        application.status === applicationStatus;

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
        (!search || searchableText.includes(search))
      );
    });
  }, [applications, applicationSearch, applicationStatus]);

  const filteredReferrals = useMemo(() => {
    const search = referralSearch.trim().toLowerCase();

    return referrals.filter((referral) => {
      const matchesStatus =
        referralStatus === "all" ||
        referral.referralStatus === referralStatus;

      const searchableText = [
        referral.orderId,
        referral.partnerCode,
        referral.partnerFirstName,
        referral.partnerLastName,
        referral.partnerEmail,
        referral.customerEmail,
        referral.orderStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        (!search || searchableText.includes(search))
      );
    });
  }, [referrals, referralSearch, referralStatus]);

  function handleUnlock(event) {
    event.preventDefault();

    const cleanedSecret = secretInput.trim();

    if (!cleanedSecret) {
      setLoadError("Enter the administrator secret.");
      return;
    }

    storeSecret(cleanedSecret);
    setAdminSecret(cleanedSecret);
    setSecretInput("");
  }

  function clearAdminSession() {
    removeStoredSecret();

    setAdminSecret("");
    setSecretInput("");
    setApplications([]);
    setReferrals([]);
    setRateDrafts({});
    setIsReady(false);
    setLoadError("");
    setActionError("");
    setActionMessage("");

    closeActionPanel();
  }

  function openActionPanel(application, action) {
    setSelectedApplication(application);
    setSelectedAction(action);
    setCustomerMessage("");
    setAdminNotes(application.adminNotes || "");
    setActionError("");
    setActionMessage("");

    window.setTimeout(() => {
      document
        .getElementById("partner-action-panel")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 0);
  }

  function closeActionPanel() {
    setSelectedApplication(null);
    setSelectedAction("");
    setCustomerMessage("");
    setAdminNotes("");
    setIsActing(false);
  }

  async function submitAction(event) {
    event.preventDefault();

    if (
      !selectedApplication ||
      !selectedAction ||
      isActing
    ) {
      return;
    }

    if (
      ["deny", "suspend"].includes(selectedAction) &&
      !customerMessage.trim()
    ) {
      setActionError(
        selectedAction === "deny"
          ? "Enter the reason the customer will see before denying the application."
          : "Enter the reason the customer will see before suspending the partner."
      );

      return;
    }

    if (
      !window.confirm(
        getConfirmationText(
          selectedAction,
          selectedApplication
        )
      )
    ) {
      return;
    }

    setIsActing(true);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        "/api/admin/partner-applications/action",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${adminSecret}`,
          },

          credentials: "same-origin",

          body: JSON.stringify({
            action: selectedAction,
            accountId: selectedApplication.accountId,
            customerMessage: customerMessage.trim(),
            adminNotes: adminNotes.trim(),
          }),
        }
      );

      const result = await readJson(response);
      const updatedApplication = result.application;

      setApplications((current) =>
        normalizeApplications(
          current.map((record) =>
            record.accountId === updatedApplication.accountId
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

  async function saveCommissionRate(application) {
    if (!application || rateSavingId) {
      return;
    }

    const rawPercentage = String(
      rateDrafts[application.accountId] ?? ""
    ).trim();

    const percentage = Number(rawPercentage);

    if (
      !/^\d+(?:\.\d{1,2})?$/.test(rawPercentage) ||
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 50
    ) {
      setActionError(
        "Commission rate must be between 0% and 50%, using no more than two decimal places."
      );

      return;
    }

    if (
      !window.confirm(
        `Set ${application.code} to a ${percentage}% commission rate for future referrals?`
      )
    ) {
      return;
    }

    setRateSavingId(application.accountId);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        "/api/admin/partner-applications/commission-rate",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${adminSecret}`,
          },

          credentials: "same-origin",

          body: JSON.stringify({
            accountId: application.accountId,
            commissionRatePercent: percentage,
          }),
        }
      );

      const result = await readJson(response);
      const updatedApplication = result.application;

      setApplications((current) =>
        normalizeApplications(
          current.map((record) =>
            record.accountId === updatedApplication.accountId
              ? updatedApplication
              : record
          )
        )
      );

      setRateDrafts((current) => ({
        ...current,

        [updatedApplication.accountId]: String(
          Number(updatedApplication.commissionRateBps || 0) /
            100
        ),
      }));

      setActionMessage(
        result.message ||
          "The commission rate was updated for future referrals."
      );
    } catch (error) {
      setActionError(
        error.message ||
          "The commission rate could not be updated."
      );
    } finally {
      setRateSavingId("");
    }
  }

  if (!adminSecret) {
    return (
      <>
        <style>{partnerHqCss}</style>

        <main className="partner-hq-page">
          <section className="partner-hq-login-card">
            <p className="eyebrow">
              PROTECTED ADMIN AREA
            </p>

            <h1>Partner HQ</h1>

            <p>
              Cloudflare Access protects this route.
              Enter the same administrator secret used
              by Customer Manager.
            </p>

            <form onSubmit={handleUnlock}>
              <label className="partner-hq-field">
                <span>Administrator Secret</span>

                <input
                  type="password"
                  value={secretInput}
                  onChange={(event) =>
                    setSecretInput(event.target.value)
                  }
                  autoComplete="current-password"
                  placeholder="Enter administrator secret"
                />
              </label>

              {loadError && (
                <Notice type="error">
                  {loadError}
                </Notice>
              )}

              <button
                type="submit"
                className="primary-btn partner-hq-full-button"
              >
                Unlock Partner HQ
              </button>
            </form>

            <button
              type="button"
              className="secondary-btn partner-hq-full-button"
              onClick={() =>
                onNavigate("missionControl")
              }
            >
              Back To Mission Control
            </button>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{partnerHqCss}</style>

      <main className="partner-hq-page">
        <section className="partner-hq-inner">
          <div className="partner-hq-topbar">
            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                onNavigate("missionControl")
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
                className="partner-hq-link-button"
                onClick={clearAdminSession}
              >
                Clear Admin Session
              </button>
            </div>
          </div>

          <header className="partner-hq-hero">
            <div>
              <p className="eyebrow">
                304 PEPTIDES ADMIN
              </p>

              <h1>Partner HQ</h1>

              <p>
                Review applications, control partner
                access, set commission rates, and audit
                every referral and earned commission.
              </p>
            </div>

            <button
              type="button"
              className="primary-btn"
              disabled={isLoading}
              onClick={() =>
                loadPartnerData(adminSecret)
              }
            >
              {isLoading
                ? "Refreshing..."
                : "Refresh Partner Data"}
            </button>
          </header>

          <section className="partner-hq-stats">
            <StatCard
              label="Partners"
              value={applicationStats.total}
              detail="All applications"
            />

            <StatCard
              label="Pending"
              value={applicationStats.pending}
              detail="Need review"
            />

            <StatCard
              label="Approved"
              value={applicationStats.approved}
              detail="Active codes"
            />

            <StatCard
              label="Referrals"
              value={referralStats.total}
              detail="Attributed orders"
            />

            <StatCard
              label="Earned Commission"
              value={formatMoneyFromCents(
                referralStats.earnedCommissionCents
              )}
              detail={`${referralStats.earned} earned referral(s)`}
            />
          </section>

          {loadError && (
            <Notice type="error">
              {loadError}
            </Notice>
          )}

          {actionError && (
            <Notice type="error">
              {actionError}
            </Notice>
          )}

          {actionMessage && (
            <Notice type="success">
              {actionMessage}
            </Notice>
          )}

          {selectedApplication && selectedAction && (
            <form
              id="partner-action-panel"
              className="partner-hq-panel partner-hq-action-panel"
              onSubmit={submitAction}
            >
              <div className="partner-hq-section-heading">
                <div>
                  <p className="eyebrow">
                    CONFIRM PARTNER ACTION
                  </p>

                  <h2>
                    {getActionTitle(selectedAction)}
                  </h2>

                  <p>
                    {selectedApplication.firstName}{" "}
                    {selectedApplication.lastName} —{" "}
                    <strong>
                      {selectedApplication.code}
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  className="partner-hq-link-button"
                  onClick={closeActionPanel}
                  disabled={isActing}
                >
                  Close
                </button>
              </div>

              <div className="partner-hq-form-grid">
                <label className="partner-hq-field">
                  <span>
                    Customer Message
                    {["deny", "suspend"].includes(
                      selectedAction
                    )
                      ? " — Required"
                      : " — Optional"}
                  </span>

                  <textarea
                    rows="5"
                    value={customerMessage}
                    onChange={(event) =>
                      setCustomerMessage(
                        event.target.value
                      )
                    }
                    maxLength="1000"
                    disabled={isActing}
                    placeholder={getCustomerMessagePlaceholder(
                      selectedAction
                    )}
                  />

                  <small>
                    {customerMessage.length}/1000
                    characters
                  </small>
                </label>

                <label className="partner-hq-field">
                  <span>
                    Private Admin Notes — Optional
                  </span>

                  <textarea
                    rows="5"
                    value={adminNotes}
                    onChange={(event) =>
                      setAdminNotes(event.target.value)
                    }
                    maxLength="2000"
                    disabled={isActing}
                    placeholder="Visible only inside protected Partner HQ."
                  />

                  <small>
                    {adminNotes.length}/2000 characters
                  </small>
                </label>
              </div>

              <div className="partner-hq-button-row">
                <button
                  type="submit"
                  className={
                    ["deny", "suspend"].includes(
                      selectedAction
                    )
                      ? "partner-hq-danger-button"
                      : "primary-btn"
                  }
                  disabled={isActing}
                >
                  {isActing
                    ? "Saving..."
                    : getActionButtonLabel(
                        selectedAction
                      )}
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeActionPanel}
                  disabled={isActing}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <section className="partner-hq-panel">
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">
                  APPLICATION DIRECTORY
                </p>

                <h2>Partner Records</h2>
              </div>

              <span>
                Showing{" "}
                <strong>
                  {filteredApplications.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {applications.length}
                </strong>
              </span>
            </div>

            <div className="partner-hq-filters">
              <label className="partner-hq-field">
                <span>Search Applications</span>

                <input
                  type="search"
                  value={applicationSearch}
                  onChange={(event) =>
                    setApplicationSearch(
                      event.target.value
                    )
                  }
                  placeholder="Name, email, code, platform, or notes"
                />
              </label>

              <label className="partner-hq-field">
                <span>Status</span>

                <select
                  value={applicationStatus}
                  onChange={(event) =>
                    setApplicationStatus(
                      event.target.value
                    )
                  }
                >
                  {applicationFilters.map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            {isLoading ? (
              <EmptyState
                title="Loading Applications"
                text="Retrieving protected Partner Program records."
              />
            ) : filteredApplications.length ===
              0 ? (
              <EmptyState
                title="No Matching Applications"
                text="No applications match the current filters."
              />
            ) : (
              <div className="partner-hq-stack">
                {filteredApplications.map(
                  (application) => {
                    const expanded =
                      expandedAccountId ===
                      application.accountId;

                    return (
                      <article
                        key={application.accountId}
                        className={`partner-hq-card partner-hq-card-${application.status}`}
                      >
                        <div className="partner-hq-card-summary">
                          <div className="partner-hq-card-main">
                            <div className="partner-hq-card-title-row">
                              <div>
                                <p className="eyebrow">
                                  {application.code}
                                </p>

                                <h3>
                                  {`${application.firstName || ""} ${
                                    application.lastName || ""
                                  }`.trim() ||
                                    "Name unavailable"}
                                </h3>

                                <p className="partner-hq-muted">
                                  {application.email}
                                </p>
                              </div>

                              <StatusPill
                                status={application.status}
                              />
                            </div>

                            <div className="partner-hq-detail-grid">
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
                                label="Commission Rate"
                                value={formatPercentFromBasisPoints(
                                  application.commissionRateBps
                                )}
                              />

                              <QuickDetail
                                label="Submitted"
                                value={formatDate(
                                  application.submittedAt
                                )}
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

                            {[
                              "approved",
                              "suspended",
                            ].includes(
                              application.status
                            ) && (
                              <section className="partner-hq-rate-panel">
                                <div>
                                  <strong>
                                    Commission Rate For
                                    Future Referrals
                                  </strong>

                                  <p>
                                    Existing referrals keep
                                    the rate captured when the
                                    order was submitted.
                                  </p>
                                </div>

                                <label>
                                  <span>Percent</span>

                                  <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    step="0.01"
                                    value={
                                      rateDrafts[
                                        application
                                          .accountId
                                      ] ?? ""
                                    }
                                    disabled={
                                      rateSavingId ===
                                      application.accountId
                                    }
                                    onChange={(event) =>
                                      setRateDrafts(
                                        (current) => ({
                                          ...current,

                                          [application.accountId]:
                                            event.target
                                              .value,
                                        })
                                      )
                                    }
                                  />
                                </label>

                                <button
                                  type="button"
                                  className="primary-btn"
                                  disabled={
                                    rateSavingId ===
                                    application.accountId
                                  }
                                  onClick={() =>
                                    saveCommissionRate(
                                      application
                                    )
                                  }
                                >
                                  {rateSavingId ===
                                  application.accountId
                                    ? "Saving..."
                                    : "Save Rate"}
                                </button>
                              </section>
                            )}

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

                            <div className="partner-hq-detail-grid">
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

          <section className="partner-hq-panel">
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">
                  REFERRAL LEDGER
                </p>

                <h2>
                  Attributed Orders And Commissions
                </h2>
              </div>

              <span>
                Showing{" "}
                <strong>
                  {filteredReferrals.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {referrals.length}
                </strong>
              </span>
            </div>

            <section className="partner-hq-referral-stats">
              <StatCard
                label="Pending Commission"
                value={formatMoneyFromCents(
                  referralStats.pendingCommissionCents
                )}
                detail={`${referralStats.pending} awaiting payment`}
              />

              <StatCard
                label="Earned Commission"
                value={formatMoneyFromCents(
                  referralStats.earnedCommissionCents
                )}
                detail={`${referralStats.earned} earned`}
              />

              <StatCard
                label="Earned Referral Revenue"
                value={formatMoneyFromCents(
                  referralStats.earnedRevenueCents
                )}
                detail="Paid or later statuses"
              />

              <StatCard
                label="Voided"
                value={referralStats.voided}
                detail="Cancelled referrals"
              />
            </section>

            <div className="partner-hq-filters">
              <label className="partner-hq-field">
                <span>Search Referrals</span>

                <input
                  type="search"
                  value={referralSearch}
                  onChange={(event) =>
                    setReferralSearch(
                      event.target.value
                    )
                  }
                  placeholder="Order, partner code, partner, or customer email"
                />
              </label>

              <label className="partner-hq-field">
                <span>Referral Status</span>

                <select
                  value={referralStatus}
                  onChange={(event) =>
                    setReferralStatus(
                      event.target.value
                    )
                  }
                >
                  {referralFilters.map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            {isLoading ? (
              <EmptyState
                title="Loading Referral Ledger"
                text="Retrieving protected referral records."
              />
            ) : filteredReferrals.length === 0 ? (
              <EmptyState
                title="No Matching Referrals"
                text="Referrals appear after a customer submits an order with an active partner code."
              />
            ) : (
              <div className="partner-hq-stack">
                {filteredReferrals.map(
                  (referral) => (
                    <article
                      key={referral.orderId}
                      className={`partner-hq-referral-card partner-hq-referral-${referral.referralStatus}`}
                    >
                      <div className="partner-hq-card-title-row">
                        <div>
                          <p className="eyebrow">
                            {referral.partnerCode}
                          </p>

                          <h3>
                            Order #{referral.orderId}
                          </h3>

                          <p className="partner-hq-muted">
                            {`${referral.partnerFirstName || ""} ${
                              referral.partnerLastName || ""
                            }`.trim() ||
                              referral.partnerEmail ||
                              "Partner unavailable"}
                          </p>
                        </div>

                        <ReferralStatusPill
                          status={
                            referral.referralStatus
                          }
                        />
                      </div>

                      <div className="partner-hq-referral-grid">
                        <QuickDetail
                          label="Customer"
                          value={
                            referral.customerEmail ||
                            "Unavailable"
                          }
                        />

                        <QuickDetail
                          label="Order Subtotal"
                          value={formatMoneyFromCents(
                            referral.orderSubtotalCents
                          )}
                        />

                        <QuickDetail
                          label="Captured Rate"
                          value={formatPercentFromBasisPoints(
                            referral.commissionRateBps
                          )}
                        />

                        <QuickDetail
                          label="Commission"
                          value={formatMoneyFromCents(
                            referral.commissionAmountCents
                          )}
                        />

                        <QuickDetail
                          label="Order Status"
                          value={
                            referral.orderStatus ||
                            "Unavailable"
                          }
                        />

                        <QuickDetail
                          label="Referral Created"
                          value={formatDate(
                            referral.createdAt
                          )}
                        />

                        <QuickDetail
                          label="Earned"
                          value={formatDate(
                            referral.earnedAt
                          )}
                        />

                        <QuickDetail
                          label="Voided"
                          value={formatDate(
                            referral.voidedAt
                          )}
                        />
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </section>

          <section className="partner-hq-panel partner-hq-security-note">
            <p className="eyebrow">
              PROGRAM SECURITY
            </p>

            <h2>
              Rates Are Captured Per Referral
            </h2>

            <p>
              Changing a partner’s rate affects future
              referrals only. Existing referral records
              keep the rate and commission amount
              captured when the customer’s order was
              submitted.
            </p>
          </section>
        </section>
      </main>
    </>
  );
}

function Notice({ type, children }) {
  return (
    <div
      className={`partner-hq-notice partner-hq-notice-${type}`}
      role={type === "error" ? "alert" : undefined}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, detail }) {
  return (
    <div className="partner-hq-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function StatusPill({ status }) {
  return (
    <span
      className={`partner-hq-status partner-hq-status-${status}`}
    >
      {String(status || "pending").toUpperCase()}
    </span>
  );
}

function ReferralStatusPill({ status }) {
  return (
    <span
      className={`partner-hq-status partner-hq-referral-status-${status}`}
    >
      {String(status || "pending").toUpperCase()}
    </span>
  );
}

function QuickDetail({ label, value }) {
  return (
    <div className="partner-hq-quick-detail">
      <span>{label}</span>
      <strong>{value || "Unavailable"}</strong>
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
    <section className={classes}>
      <strong>{title}</strong>
      <p>{text}</p>
    </section>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="partner-hq-empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function getActionTitle(action) {
  return (
    {
      approve: "Approve Partner Application",
      deny: "Deny Partner Application",
      suspend: "Suspend Partner Access",
      reactivate: "Reactivate Partner Access",
    }[action] || "Update Partner Record"
  );
}

function getActionButtonLabel(action) {
  return (
    {
      approve: "Approve Application",
      deny: "Deny Application",
      suspend: "Suspend Partner",
      reactivate: "Reactivate Partner",
    }[action] || "Save Action"
  );
}

function getCustomerMessagePlaceholder(action) {
  if (action === "deny") {
    return "Explain why the application was not approved and what may be changed before reapplying.";
  }

  if (action === "suspend") {
    return "Explain why Partner Program access was suspended and how the partner may contact support.";
  }

  return action === "approve"
    ? "Optional welcome or approval message shown to the partner."
    : "Optional reactivation message shown to the partner.";
}

function getConfirmationText(action, application) {
  const code = application.code || "this code";

  if (action === "approve") {
    return `Approve ${code}? The customer-selected code will become active.`;
  }

  if (action === "deny") {
    return `Deny ${code}? The code reservation will be released and may be claimed again.`;
  }

  if (action === "suspend") {
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
.partner-hq-panel {
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
.partner-hq-button-row {
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

.partner-hq-hero {
  padding: 40px;
  margin-bottom: 20px;
}

.partner-hq-hero > div {
  max-width: 780px;
}

.partner-hq-panel {
  padding: 28px;
  margin-top: 20px;
}

.partner-hq-section-heading h2,
.partner-hq-panel h2 {
  margin: 6px 0 8px;
  font-size: clamp(28px, 4vw, 38px);
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

.partner-hq-link-button {
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: #9ca8b0;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  text-decoration: underline;
}

.partner-hq-full-button {
  width: 100%;
  margin-top: 16px;
}

.partner-hq-stats,
.partner-hq-referral-stats {
  display: grid;
  gap: 12px;
}

.partner-hq-stats {
  grid-template-columns:
    repeat(5, minmax(0, 1fr));
  margin-bottom: 20px;
}

.partner-hq-referral-stats {
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  margin-top: 18px;
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
.partner-hq-field > span,
.partner-hq-rate-panel label span {
  color: #9ed8ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.partner-hq-stat-card strong {
  font-size: 27px;
  overflow-wrap: anywhere;
}

.partner-hq-stat-card small,
.partner-hq-field small {
  color: #8f9aa2;
}

.partner-hq-quick-detail strong {
  overflow-wrap: anywhere;
  font-size: 14px;
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
.partner-hq-field textarea,
.partner-hq-rate-panel input {
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
.partner-hq-field textarea:focus,
.partner-hq-rate-panel input:focus {
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

.partner-hq-notice {
  margin: 16px 0;
  padding: 15px;
  border-radius: 14px;
  line-height: 1.55;
}

.partner-hq-notice-error {
  border: 1px solid rgba(255, 95, 95, .34);
  background: rgba(255, 70, 70, .1);
  color: #ffd0d0;
}

.partner-hq-notice-success {
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

.partner-hq-button-row {
  justify-content: flex-start;
  margin-top: 20px;
}

.partner-hq-stack {
  display: grid;
  gap: 14px;
  margin-top: 22px;
}

.partner-hq-card,
.partner-hq-referral-card {
  overflow: hidden;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 18px;
  background: rgba(0, 0, 0, .17);
}

.partner-hq-card-pending,
.partner-hq-referral-pending {
  border-color: rgba(255, 190, 80, .28);
}

.partner-hq-card-approved,
.partner-hq-referral-earned {
  border-color: rgba(72, 214, 151, .25);
}

.partner-hq-card-suspended,
.partner-hq-card-denied,
.partner-hq-referral-voided {
  border-color: rgba(255, 95, 95, .25);
}

.partner-hq-card-summary {
  align-items: stretch;
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

.partner-hq-muted {
  color: #aab5bd;
  overflow-wrap: anywhere;
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
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, .07);
  margin-top: 18px;
}

.partner-hq-detail-grid,
.partner-hq-referral-grid {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
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

.partner-hq-rate-panel {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    130px
    auto;
  gap: 14px;
  align-items: end;
  padding: 16px;
  border: 1px solid rgba(72, 214, 151, .22);
  border-radius: 15px;
  background: rgba(72, 214, 151, .06);
}

.partner-hq-rate-panel > div {
  display: grid;
  gap: 6px;
}

.partner-hq-rate-panel p {
  color: #9ca8b0;
  font-size: 13px;
  line-height: 1.5;
}

.partner-hq-rate-panel label {
  display: grid;
  gap: 7px;
}

.partner-hq-status-pending,
.partner-hq-referral-status-pending {
  border: 1px solid rgba(255, 190, 80, .35);
  background: rgba(255, 170, 50, .1);
  color: #ffe0a8;
}

.partner-hq-status-approved,
.partner-hq-referral-status-earned {
  border: 1px solid rgba(72, 214, 151, .35);
  background: rgba(72, 214, 151, .1);
  color: #b8f3d8;
}

.partner-hq-status-suspended,
.partner-hq-status-denied,
.partner-hq-referral-status-voided {
  border: 1px solid rgba(255, 95, 95, .38);
  background: rgba(255, 70, 70, .11);
  color: #ffcaca;
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

  .partner-hq-referral-stats,
  .partner-hq-detail-grid,
  .partner-hq-referral-grid {
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
  .partner-hq-panel {
    padding: 20px;
    border-radius: 19px;
  }

  .partner-hq-stats,
  .partner-hq-referral-stats,
  .partner-hq-filters,
  .partner-hq-form-grid,
  .partner-hq-detail-grid,
  .partner-hq-referral-grid,
  .partner-hq-rate-panel {
    grid-template-columns:
      minmax(0, 1fr);
  }

  .partner-hq-card-buttons {
    flex: 1 1 100%;
  }

  .partner-hq-hero > button,
  .partner-hq-button-row button {
    width: 100%;
  }
}
`;

export default PartnerHQ;
import { useEffect, useMemo, useRef, useState } from "react";

const platformOptions = [
  "Facebook",
  "TikTok",
  "Instagram",
  "YouTube",
  "Telegram",
  "Website or Blog",
  "Email Newsletter",
  "Other",
];

const audienceOptions = [
  "Under 500",
  "500–1,999",
  "2,000–4,999",
  "5,000–9,999",
  "10,000–24,999",
  "25,000–49,999",
  "50,000–99,999",
  "100,000+",
];

const initialForm = {
  code: "",
  primaryPlatform: "",
  profileUrl: "",
  audienceSize: "",
  promotionPlan: "",
  experience: "",
  agreementAccepted: false,
};

const emptySummary = {
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
  minimumPayoutCents: 5000,
  payoutEligible: false,
  amountUntilEligibleCents: 5000,
};

const emptyPayoutSettings = {
  minimumPayoutCents: 5000,
  updatedAt: "",
};

function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 20);
}

function getLocalCodeError(code) {
  if (!code) return "Choose your affiliate code.";
  if (code.length < 4 || code.length > 20) return "Use 4–20 characters.";
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)) {
    return "Use letters, numbers, and single hyphens only.";
  }
  if (!/[A-Z]/.test(code)) return "Include at least one letter.";
  return "";
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-US", {
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

function formatPayoutType(value) {
  return String(value || "cash").toLowerCase() === "store_credit"
    ? "Store Credit"
    : "Cash Payment";
}

async function readApiJson(response) {
  const text = await response.text();
  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("The Partner Program service returned an invalid response.");
  }

  if (!response.ok || !result.success) {
    const error = new Error(
      result.error || "The Partner Program request could not be completed."
    );

    error.status = response.status;
    error.requiresPasswordChange = Boolean(result.requiresPasswordChange);
    throw error;
  }

  return result;
}

function buildReferralLink(code) {
  if (!code || typeof window === "undefined") return "";

  return `${window.location.origin}/checkout?ref=${encodeURIComponent(code)}`;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

function PartnerApplication({
  onNavigate = () => {},
  onSubmitApplication = null,
}) {
  const [formData, setFormData] = useState(initialForm);
  const [application, setApplication] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [summary, setSummary] = useState(emptySummary);
  const [referrals, setReferrals] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutSettings, setPayoutSettings] = useState(emptyPayoutSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeState, setCodeState] = useState("idle");
  const [codeMessage, setCodeMessage] = useState("");
  const availabilityRequest = useRef(0);

  const isDenied = application?.status === "denied";
  const isApproved = application?.status === "approved";
  const isSuspended = application?.status === "suspended";
  const lockedApplication = Boolean(
    application && ["pending", "approved", "suspended"].includes(application.status)
  );

  const referralLink = useMemo(
    () => buildReferralLink(application?.code),
    [application?.code]
  );

  const localCodeError = useMemo(
    () => getLocalCodeError(formData.code),
    [formData.code]
  );

  const formComplete = Boolean(
    eligibility?.eligible &&
      !lockedApplication &&
      !localCodeError &&
      codeState === "available" &&
      formData.primaryPlatform &&
      formData.audienceSize &&
      formData.promotionPlan.trim() &&
      formData.agreementAccepted
  );

  async function loadPartnerSummary() {
    setIsSummaryLoading(true);
    setSummaryError("");

    try {
      const response = await fetch("/api/partner/summary", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = await readApiJson(response);

      setApplication((current) => result.application || current);
      setSummary({ ...emptySummary, ...(result.summary || {}) });
      setReferrals(Array.isArray(result.referrals) ? result.referrals : []);
      setPayouts(Array.isArray(result.payouts) ? result.payouts : []);
      setPayoutSettings({
        ...emptyPayoutSettings,
        ...(result.payoutSettings || {}),
      });
    } catch (error) {
      setSummaryError(
        error.message || "Partner referral history could not be loaded."
      );
    } finally {
      setIsSummaryLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadApplication() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/partner/application", {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
        });

        const result = await readApiJson(response);

        if (!active) return;

        const savedApplication = result.application || null;

        setApplication(savedApplication);
        setEligibility(result.eligibility || null);

        if (savedApplication?.status === "denied") {
          setFormData({
            code: savedApplication.code || "",
            primaryPlatform: savedApplication.primaryPlatform || "",
            profileUrl: savedApplication.profileUrl || "",
            audienceSize: savedApplication.audienceSize || "",
            promotionPlan: savedApplication.promotionPlan || "",
            experience: savedApplication.experience || "",
            agreementAccepted: false,
          });
        }

        if (["approved", "suspended"].includes(savedApplication?.status)) {
          setIsSummaryLoading(true);

          try {
            const summaryResponse = await fetch("/api/partner/summary", {
              method: "GET",
              headers: { Accept: "application/json" },
              credentials: "same-origin",
              cache: "no-store",
            });

            const summaryResult = await readApiJson(summaryResponse);

            if (!active) return;

            setApplication(summaryResult.application || savedApplication);
            setSummary({ ...emptySummary, ...(summaryResult.summary || {}) });
            setReferrals(
              Array.isArray(summaryResult.referrals)
                ? summaryResult.referrals
                : []
            );
            setPayouts(
              Array.isArray(summaryResult.payouts)
                ? summaryResult.payouts
                : []
            );
            setPayoutSettings({
              ...emptyPayoutSettings,
              ...(summaryResult.payoutSettings || {}),
            });
          } catch (error) {
            if (active) {
              setSummaryError(
                error.message || "Partner referral history could not be loaded."
              );
            }
          } finally {
            if (active) setIsSummaryLoading(false);
          }
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error.message || "Partner Program access could not be loaded."
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadApplication();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (lockedApplication) return undefined;

    const code = formData.code;
    const error = getLocalCodeError(code);

    if (!code) {
      setCodeState("idle");
      setCodeMessage("");
      return undefined;
    }

    if (error) {
      setCodeState("invalid");
      setCodeMessage(error);
      return undefined;
    }

    const requestNumber = availabilityRequest.current + 1;
    availabilityRequest.current = requestNumber;
    setCodeState("checking");
    setCodeMessage("Checking availability...");

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/partner/code-availability?code=${encodeURIComponent(code)}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            cache: "no-store",
          }
        );

        const result = await readApiJson(response);

        if (availabilityRequest.current !== requestNumber) return;

        setCodeState(result.available ? "available" : "unavailable");
        setCodeMessage(
          result.message ||
            (result.available
              ? "This affiliate code is available."
              : "That affiliate code has already been claimed.")
        );
      } catch (error) {
        if (availabilityRequest.current !== requestNumber) return;

        setCodeState("error");
        setCodeMessage(
          error.message || "Code availability could not be checked."
        );
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [formData.code, lockedApplication]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setSubmitError("");
    setSuccessMessage("");

    setFormData((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : name === "code"
          ? normalizeCode(value)
          : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formComplete || isSubmitting) {
      setSubmitError(
        "Complete the required fields and confirm that your affiliate code is available."
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/partner/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          code: formData.code,
          primaryPlatform: formData.primaryPlatform,
          profileUrl: formData.profileUrl.trim(),
          audienceSize: formData.audienceSize,
          promotionPlan: formData.promotionPlan.trim(),
          experience: formData.experience.trim(),
          agreementAccepted: formData.agreementAccepted,
        }),
      });

      const result = await readApiJson(response);
      const savedApplication = result.application || null;

      setApplication(savedApplication);
      setSuccessMessage(
        result.message || "Your Partner Program application was submitted."
      );

      if (typeof onSubmitApplication === "function") {
        onSubmitApplication(savedApplication?.code || formData.code);
      } else {
        window.setTimeout(() => onNavigate("dashboard"), 700);
      }
    } catch (error) {
      setSubmitError(error.message || "The application could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyReferralLink() {
    if (!referralLink) return;

    setCopyMessage("");

    try {
      await copyText(referralLink);
      setCopyMessage("Referral link copied.");
    } catch {
      setCopyMessage("The link could not be copied. Select and copy it manually.");
    }
  }

  if (isLoading) {
    return (
      <PageShell>
        <StateCard
          eyebrow="PARTNER PROGRAM"
          title="Loading Partner Center"
          text="Checking your secure account eligibility, application, and referral record."
        />
      </PageShell>
    );
  }

  if (loadError) {
    return (
      <PageShell>
        <StateCard
          eyebrow="PARTNER PROGRAM"
          title="Partner Center Unavailable"
          text={loadError}
        >
          <div className="partner-button-row">
            <button
              type="button"
              className="primary-btn"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("dashboard")}
            >
              Return To Dashboard
            </button>
          </div>
        </StateCard>
      </PageShell>
    );
  }

  if (isApproved || isSuspended) {
    return (
      <PageShell>
        <section className="partner-application-inner">
          <div className="partner-topbar">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("dashboard")}
            >
              ← Research Hub
            </button>

            <StatusPill status={application.status} />
          </div>

          <header className="partner-hero">
            <p className="eyebrow">304 PEPTIDES PARTNER CENTER</p>
            <h1>{isApproved ? "Referral Dashboard" : "Partner Access Suspended"}</h1>
            <p>
              {isApproved
                ? "Share your secure referral link and review attributed orders, pending commissions, and earned commissions."
                : "Your code remains reserved, but it is not active for new referrals. Your existing referral history remains available below."}
            </p>
          </header>

          {application.customerMessage && (
            <div className="partner-message-box">
              <strong>Message from 304 Peptides</strong>
              <p>{application.customerMessage}</p>
            </div>
          )}

          {summaryError && (
            <div className="partner-error" role="alert">
              {summaryError}
            </div>
          )}

          <section className="partner-dashboard-grid">
            <MetricCard
              label="Affiliate Code"
              value={application.code}
              detail={isApproved ? "Active" : "Inactive"}
            />

            <MetricCard
              label="Commission Rate"
              value={formatPercentFromBasisPoints(application.commissionRateBps)}
              detail="Captured when an order is submitted"
            />

            <MetricCard
              label="Pending Commission"
              value={formatMoneyFromCents(summary.pendingCommissionCents)}
              detail={`${summary.pendingCount} pending referral(s)`}
            />

            <MetricCard
              label="Available To Pay"
              value={formatMoneyFromCents(summary.availableCommissionCents)}
              detail={`${summary.availableReferralCount} unpaid earned referral(s)`}
            />

            <MetricCard
              label="Paid Commission"
              value={formatMoneyFromCents(summary.paidCommissionCents)}
              detail={`${summary.paidReferralCount} paid referral(s)`}
            />

            <MetricCard
              label="Attributed Orders"
              value={summary.totalCount}
              detail={`${summary.voidedCount} voided referral(s)`}
            />

            <MetricCard
              label="Earned Referral Revenue"
              value={formatMoneyFromCents(summary.earnedRevenueCents)}
              detail="Paid or later order statuses"
            />
          </section>

          <section className={`partner-payout-status-panel ${summary.payoutEligible ? "partner-payout-eligible" : ""}`}>
            <div>
              <p className="eyebrow">PAYOUT STATUS</p>
              <h2>
                {summary.payoutEligible
                  ? "Your Balance Is Eligible"
                  : "Building Toward Your Next Payout"}
              </h2>
              <p>
                The current minimum payout is {formatMoneyFromCents(
                  payoutSettings.minimumPayoutCents || summary.minimumPayoutCents
                )}. Your earned balance remains recorded until an administrator
                issues cash or store credit and records the payout.
              </p>
            </div>

            <div className="partner-payout-progress-grid">
              <RecordBox
                label="Available Balance"
                value={formatMoneyFromCents(summary.availableCommissionCents)}
              />

              <RecordBox
                label="Minimum Payout"
                value={formatMoneyFromCents(
                  payoutSettings.minimumPayoutCents || summary.minimumPayoutCents
                )}
              />

              <RecordBox
                label="Eligibility"
                value={summary.payoutEligible ? "Eligible" : "Below Minimum"}
              />

              <RecordBox
                label="Amount Until Eligible"
                value={formatMoneyFromCents(summary.amountUntilEligibleCents)}
              />
            </div>

            <small>
              Payout timing and method are handled manually by 304 Peptides. A
              payout record will appear in your history after it is issued.
            </small>
          </section>

          <section className="partner-share-panel">
            <div>
              <p className="eyebrow">YOUR REFERRAL LINK</p>
              <h2>{isApproved ? "Share This Checkout Link" : "Link Currently Inactive"}</h2>
              <p>
                Customers who open this link will see your code prefilled at checkout.
                They must apply the code before submitting. It does not change their subtotal.
              </p>
            </div>

            <div className="partner-link-row">
              <input
                type="text"
                value={referralLink}
                readOnly
                aria-label="Partner referral link"
              />

              <button
                type="button"
                className="primary-btn"
                onClick={handleCopyReferralLink}
                disabled={!isApproved}
              >
                Copy Link
              </button>
            </div>

            {copyMessage && (
              <div className="partner-success" aria-live="polite">
                {copyMessage}
              </div>
            )}

            <div className="partner-share-note">
              <strong>No self-referrals or checkout discount</strong>
              <span>
                The signed-in partner account cannot use its own code. Referral
                attribution credits the partner only and leaves the customer subtotal unchanged.
              </span>
            </div>
          </section>

          <section className="partner-referral-panel">
            <div className="partner-section-heading">
              <div>
                <p className="eyebrow">REFERRAL HISTORY</p>
                <h2>Attributed Orders</h2>
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={loadPartnerSummary}
                disabled={isSummaryLoading}
              >
                {isSummaryLoading ? "Refreshing..." : "Refresh History"}
              </button>
            </div>

            {isSummaryLoading && referrals.length === 0 ? (
              <EmptyState
                title="Loading Referral History"
                text="Retrieving your secure referral records."
              />
            ) : referrals.length === 0 ? (
              <EmptyState
                title="No Referrals Yet"
                text="An attributed order will appear here after a different customer account applies your active code and submits checkout."
              />
            ) : (
              <div className="partner-referral-stack">
                {referrals.map((referral) => {
                  const commissionStatus = String(
                    referral.commissionStatus || referral.referralStatus || "pending"
                  ).toLowerCase();

                  return (
                    <article
                      key={referral.orderId}
                      className={`partner-referral-card partner-referral-${commissionStatus}`}
                    >
                      <div className="partner-referral-heading">
                        <div>
                          <p className="eyebrow">ORDER #{referral.orderId}</p>
                          <h3>{formatMoneyFromCents(referral.orderSubtotalCents)}</h3>
                          <p>{formatDate(referral.createdAt)}</p>
                        </div>

                        <ReferralStatusPill status={commissionStatus} />
                      </div>

                      {referral.requiresAdjustment && (
                        <div className="partner-payout-adjustment-note">
                          This paid referral was later voided. 304 Peptides will
                          review any required adjustment manually.
                        </div>
                      )}

                      <div className="partner-record-grid">
                        <RecordBox
                          label="Order Status"
                          value={referral.orderStatus}
                        />

                        <RecordBox
                          label="Captured Rate"
                          value={formatPercentFromBasisPoints(
                            referral.commissionRateBps
                          )}
                        />

                        <RecordBox
                          label="Commission"
                          value={formatMoneyFromCents(
                            referral.commissionAmountCents
                          )}
                        />

                        <RecordBox
                          label={
                            commissionStatus === "paid"
                              ? "Paid"
                              : referral.referralStatus === "earned"
                              ? "Earned"
                              : referral.referralStatus === "voided"
                              ? "Voided"
                              : "Last Updated"
                          }
                          value={formatDate(
                            commissionStatus === "paid"
                              ? referral.payoutPaidAt
                              : referral.referralStatus === "earned"
                              ? referral.earnedAt
                              : referral.referralStatus === "voided"
                              ? referral.voidedAt
                              : referral.updatedAt
                          )}
                        />
                      </div>

                      {commissionStatus === "paid" && (
                        <div className="partner-paid-detail-row">
                          <span>
                            Payout type: <strong>{formatPayoutType(referral.payoutType)}</strong>
                          </span>
                          <span>
                            Method: <strong>{referral.payoutMethod || "Recorded payout"}</strong>
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="partner-payout-history-panel">
            <div className="partner-section-heading">
              <div>
                <p className="eyebrow">PAYOUT HISTORY</p>
                <h2>Recorded Payments And Store Credit</h2>
              </div>

              <span>
                <strong>{payouts.length}</strong> payout record(s)
              </span>
            </div>

            {payouts.length === 0 ? (
              <EmptyState
                title="No Payouts Recorded"
                text="Completed cash payments or store-credit payouts will appear here after they are issued."
              />
            ) : (
              <div className="partner-payout-history-stack">
                {payouts.map((payout) => (
                  <article
                    key={payout.payoutId}
                    className="partner-payout-history-card"
                  >
                    <div className="partner-referral-heading">
                      <div>
                        <p className="eyebrow">{payout.payoutId}</p>
                        <h3>{formatMoneyFromCents(payout.amountCents)}</h3>
                        <p>{formatDate(payout.paidAt || payout.createdAt)}</p>
                      </div>

                      <span className="partner-payout-type-pill">
                        {formatPayoutType(payout.payoutType)}
                      </span>
                    </div>

                    <div className="partner-record-grid">
                      <RecordBox
                        label="Payment Method"
                        value={payout.paymentMethod || "Recorded payout"}
                      />

                      <RecordBox
                        label="Referrals Included"
                        value={String(payout.referralCount || payout.orderIds?.length || 0)}
                      />

                      <RecordBox
                        label="Paid Date"
                        value={formatDate(payout.paidAt)}
                      />

                      <RecordBox
                        label="Orders"
                        value={
                          Array.isArray(payout.orderIds) && payout.orderIds.length
                            ? payout.orderIds.map((orderId) => `#${orderId}`).join(", ")
                            : "Not available"
                        }
                      />
                    </div>

                    {payout.partnerNote && (
                      <div className="partner-payout-note">
                        <strong>Note from 304 Peptides</strong>
                        <p>{payout.partnerNote}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="partner-button-row partner-center-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("contact")}
            >
              Contact Support
            </button>
          </div>
        </section>
      </PageShell>
    );
  }

  if (application?.status === "pending") {
    return (
      <PageShell>
        <StateCard
          eyebrow="PARTNER PROGRAM"
          title="Application Under Review"
          text="Your selected affiliate code is reserved while the application is reviewed. It is not active for referrals yet."
        >
          <StatusPill status={application.status} />

          <div className="partner-record-grid">
            <RecordBox label="Your Affiliate Code" value={application.code} />
            <RecordBox label="Status" value="Pending Review" />
            <RecordBox label="Submitted" value={formatDate(application.submittedAt)} />
            <RecordBox label="Primary Platform" value={application.primaryPlatform} />
          </div>

          {application.customerMessage && (
            <div className="partner-message-box">
              <strong>Message from 304 Peptides</strong>
              <p>{application.customerMessage}</p>
            </div>
          )}

          <div className="partner-button-row">
            <button
              type="button"
              className="primary-btn"
              onClick={() => onNavigate("dashboard")}
            >
              Return To Dashboard
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("contact")}
            >
              Contact Support
            </button>
          </div>
        </StateCard>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="partner-application-inner">
        <div className="partner-topbar">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => onNavigate("dashboard")}
          >
            ← Research Hub
          </button>

          <span className={eligibility?.eligible ? "partner-eligible" : "partner-ineligible"}>
            {eligibility?.eligible ? "Eligible To Apply" : "Order Required"}
          </span>
        </div>

        <header className="partner-hero">
          <p className="eyebrow">304 PEPTIDES PARTNER PROGRAM</p>
          <h1>Create Your Own Affiliate Code</h1>
          <p>
            Choose a unique code that fits your page or audience. Your code is
            reserved when the application is submitted and becomes active after approval.
          </p>
        </header>

        {!eligibility?.eligible ? (
          <StateCard
            eyebrow="ELIGIBILITY"
            title="Complete Your First Order Request"
            text="A secure account-linked order request is required before a Partner Program application can be submitted."
          >
            <button
              type="button"
              className="primary-btn"
              onClick={() => onNavigate("products")}
            >
              Browse Products
            </button>
          </StateCard>
        ) : (
          <div className="partner-layout">
            <form className="partner-form" onSubmit={handleSubmit}>
              {isDenied && (
                <div className="partner-denied-notice">
                  <strong>Previous application not approved</strong>
                  <p>
                    {application.customerMessage ||
                      "You may update the application and choose an available code before submitting again."}
                  </p>
                </div>
              )}

              <section className="partner-form-section">
                <p className="eyebrow">YOUR AFFILIATE CODE</p>
                <h2>Choose Your Code</h2>

                <label className="partner-field">
                  <span>Affiliate Code</span>

                  <div className="partner-code-input-row">
                    <input
                      name="code"
                      type="text"
                      value={formData.code}
                      onChange={handleChange}
                      placeholder="DANNY304"
                      autoComplete="off"
                      maxLength="20"
                      disabled={isSubmitting}
                      aria-describedby="partner-code-message"
                    />

                    <strong>{formData.code.length}/20</strong>
                  </div>

                  <small>
                    4–20 characters. Letters, numbers, and single hyphens only.
                    Codes are not case-sensitive.
                  </small>

                  {formData.code && (
                    <div
                      id="partner-code-message"
                      className={`partner-code-message partner-code-${codeState}`}
                      aria-live="polite"
                    >
                      {codeMessage || localCodeError}
                    </div>
                  )}
                </label>
              </section>

              <section className="partner-form-section">
                <p className="eyebrow">AUDIENCE DETAILS</p>
                <h2>Tell Us Where You Share</h2>

                <div className="partner-form-grid">
                  <SelectField
                    name="primaryPlatform"
                    label="Primary Platform"
                    value={formData.primaryPlatform}
                    onChange={handleChange}
                    options={platformOptions}
                    disabled={isSubmitting}
                  />

                  <SelectField
                    name="audienceSize"
                    label="Approximate Audience Size"
                    value={formData.audienceSize}
                    onChange={handleChange}
                    options={audienceOptions}
                    disabled={isSubmitting}
                  />

                  <label className="partner-field partner-full-field">
                    <span>Profile or Page URL — Optional</span>
                    <input
                      name="profileUrl"
                      type="url"
                      value={formData.profileUrl}
                      onChange={handleChange}
                      placeholder="https://..."
                      autoComplete="url"
                      maxLength="500"
                      disabled={isSubmitting}
                    />
                  </label>
                </div>
              </section>

              <section className="partner-form-section">
                <p className="eyebrow">PROMOTION PLAN</p>
                <h2>How Will You Share 304 Peptides?</h2>

                <label className="partner-field">
                  <span>Promotion Plan</span>
                  <textarea
                    name="promotionPlan"
                    rows="6"
                    value={formData.promotionPlan}
                    onChange={handleChange}
                    placeholder="Describe the educational content, audience, and channels you plan to use."
                    maxLength="2000"
                    disabled={isSubmitting}
                  />
                  <small>{formData.promotionPlan.length}/2000 characters</small>
                </label>

                <label className="partner-field">
                  <span>Relevant Experience — Optional</span>
                  <textarea
                    name="experience"
                    rows="4"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="Share any experience with content creation, communities, research education, or affiliate programs."
                    maxLength="1000"
                    disabled={isSubmitting}
                  />
                  <small>{formData.experience.length}/1000 characters</small>
                </label>
              </section>

              <section className="partner-agreement">
                <p className="eyebrow">REQUIRED AGREEMENT</p>
                <h2>Partner Program Standards</h2>

                <ul>
                  <li>Use research-only language and do not make medical claims.</li>
                  <li>Do not represent yourself as 304 Peptides staff or ownership.</li>
                  <li>Do not use your own code for self-referrals.</li>
                  <li>Do not use spam, deceptive advertising, or misleading discounts.</li>
                  <li>Partner approval and code access may be suspended for violations.</li>
                </ul>

                <label className="partner-checkbox-row">
                  <input
                    name="agreementAccepted"
                    type="checkbox"
                    checked={formData.agreementAccepted}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />

                  <span>
                    I understand and agree to follow the Partner Program standards
                    and research-use restrictions.
                  </span>
                </label>
              </section>

              {submitError && (
                <div className="partner-error" role="alert">
                  {submitError}
                </div>
              )}

              {successMessage && (
                <div className="partner-success" aria-live="polite">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                className="primary-btn partner-submit"
                disabled={!formComplete || isSubmitting}
              >
                {isSubmitting
                  ? "Submitting Application..."
                  : isDenied
                  ? "Resubmit Partner Application"
                  : "Submit Partner Application"}
              </button>

              {!formComplete && !isSubmitting && (
                <p className="partner-helper">
                  Complete the required fields, confirm code availability, and
                  accept the Partner Program agreement.
                </p>
              )}
            </form>

            <aside className="partner-sidebar">
              <section>
                <p className="eyebrow">HOW CODES WORK</p>
                <h2>Your Code, Pending Approval</h2>
                <Step
                  number="01"
                  title="Choose it"
                  text="Create a memorable code that represents your page, name, or audience."
                />
                <Step
                  number="02"
                  title="Reserve it"
                  text="Submission reserves the code so another applicant cannot claim it during review."
                />
                <Step
                  number="03"
                  title="Activate it"
                  text="The code becomes active only after an administrator approves the application."
                />
              </section>

              <section className="partner-sidebar-note">
                <strong>No self-referrals</strong>
                <p>
                  A partner cannot earn commission or customer discounts by using
                  their own code.
                </p>
              </section>

              <section className="partner-sidebar-note">
                <strong>For Research Use Only</strong>
                <p>
                  Partner content must describe products only within the site’s
                  research-use framework and must not promote human consumption.
                </p>
              </section>
            </aside>
          </div>
        )}
      </section>
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <>
      <style>{partnerApplicationCss}</style>
      <main className="partner-application-page">{children}</main>
    </>
  );
}

function StateCard({ eyebrow, title, text, children }) {
  return (
    <section className="partner-state-card">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{text}</p>
      {children}
    </section>
  );
}

function SelectField({ name, label, value, onChange, options, disabled }) {
  return (
    <label className="partner-field">
      <span>{label}</span>
      <select name={name} value={value} onChange={onChange} disabled={disabled}>
        <option value="">Select One</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusPill({ status }) {
  return (
    <span className={`partner-status-pill partner-status-${status}`}>
      {String(status || "pending").toUpperCase()}
    </span>
  );
}

function ReferralStatusPill({ status }) {
  return (
    <span className={`partner-status-pill partner-referral-status-${status}`}>
      {String(status || "pending").toUpperCase()}
    </span>
  );
}

function RecordBox({ label, value }) {
  return (
    <div className="partner-record-box">
      <span>{label}</span>
      <strong>{value || "Not available"}</strong>
    </div>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <div className="partner-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="partner-empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Step({ number, title, text }) {
  return (
    <div className="partner-step">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

const partnerApplicationCss = `
.partner-application-page,
.partner-application-page *,
.partner-application-page *::before,
.partner-application-page *::after {
  box-sizing: border-box;
}

.partner-application-page {
  width: 100%;
  padding: 80px 28px;
}

.partner-application-inner {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
}

.partner-topbar,
.partner-button-row,
.partner-code-input-row,
.partner-section-heading,
.partner-referral-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.partner-topbar {
  margin-bottom: 22px;
}

.partner-eligible,
.partner-ineligible,
.partner-status-pill {
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

.partner-eligible,
.partner-status-approved,
.partner-referral-status-earned,
.partner-referral-status-paid {
  border: 1px solid rgba(72, 214, 151, .35);
  background: rgba(72, 214, 151, .11);
  color: #b8f3d8;
}

.partner-ineligible,
.partner-status-denied,
.partner-status-suspended,
.partner-referral-status-voided {
  border: 1px solid rgba(255, 95, 95, .35);
  background: rgba(255, 70, 70, .1);
  color: #ffd0d0;
}

.partner-status-pending,
.partner-referral-status-pending {
  border: 1px solid rgba(255, 190, 80, .35);
  background: rgba(255, 170, 50, .1);
  color: #ffe0a8;
}

.partner-hero,
.partner-form,
.partner-sidebar > section,
.partner-state-card,
.partner-share-panel,
.partner-referral-panel,
.partner-payout-status-panel,
.partner-payout-history-panel {
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(61, 165, 255, .12), transparent 38%),
    rgba(255, 255, 255, .04);
  box-shadow: 0 24px 65px rgba(0, 0, 0, .35);
}

.partner-hero {
  padding: 42px;
  margin-bottom: 22px;
  text-align: center;
}

.partner-hero h1,
.partner-state-card h1 {
  margin: 8px 0 16px;
  font-size: clamp(38px, 7vw, 62px);
  line-height: 1.04;
}

.partner-hero > p:not(.eyebrow),
.partner-state-card > p:not(.eyebrow),
.partner-share-panel > div > p:not(.eyebrow) {
  max-width: 820px;
  margin: 0 auto;
  color: #b6c0c8;
  line-height: 1.72;
}

.partner-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(300px, .6fr);
  gap: 22px;
  align-items: start;
}

.partner-form,
.partner-sidebar > section,
.partner-state-card,
.partner-share-panel,
.partner-referral-panel {
  padding: 28px;
}

.partner-state-card {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}

.partner-state-card .partner-status-pill {
  margin-bottom: 14px;
}

.partner-form-section,
.partner-agreement {
  padding: 22px 0;
  border-bottom: 1px solid rgba(255, 255, 255, .08);
}

.partner-form-section:first-child {
  padding-top: 0;
}

.partner-form-section h2,
.partner-agreement h2,
.partner-sidebar h2,
.partner-share-panel h2,
.partner-referral-panel h2,
.partner-payout-status-panel h2,
.partner-payout-history-panel h2 {
  margin: 6px 0 18px;
  font-size: clamp(27px, 4vw, 36px);
}

.partner-form-grid,
.partner-record-grid,
.partner-dashboard-grid {
  display: grid;
  gap: 12px;
}

.partner-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.partner-record-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 20px;
}

.partner-dashboard-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 22px 0;
}

.partner-field {
  display: grid;
  gap: 8px;
  margin-top: 15px;
}

.partner-full-field {
  grid-column: 1 / -1;
}

.partner-field > span,
.partner-record-box > span,
.partner-metric-card > span {
  color: #9ed8ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.partner-field input,
.partner-field select,
.partner-field textarea,
.partner-code-input-row input,
.partner-link-row input {
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 12px;
  outline: none;
  background: #151b22;
  color: #fff;
  font: inherit;
}

.partner-field input:focus,
.partner-field select:focus,
.partner-field textarea:focus,
.partner-code-input-row input:focus,
.partner-link-row input:focus {
  border-color: rgba(61, 165, 255, .65);
  box-shadow: 0 0 0 3px rgba(61, 165, 255, .12);
}

.partner-field select option {
  background: #151b22;
  color: #fff;
}

.partner-field textarea {
  resize: vertical;
}

.partner-field small,
.partner-metric-card small {
  color: #8f9aa2;
}

.partner-code-input-row {
  flex-wrap: nowrap;
}

.partner-code-input-row input {
  min-width: 0;
  font-weight: 900;
  letter-spacing: .8px;
  text-transform: uppercase;
}

.partner-code-input-row strong {
  flex: 0 0 auto;
  color: #8f9aa2;
  font-size: 12px;
}

.partner-code-message,
.partner-error,
.partner-success,
.partner-message-box,
.partner-denied-notice,
.partner-share-note {
  margin-top: 14px;
  padding: 14px;
  border-radius: 14px;
  line-height: 1.58;
}

.partner-code-available,
.partner-success {
  border: 1px solid rgba(72, 214, 151, .3);
  background: rgba(72, 214, 151, .09);
  color: #b8f3d8;
}

.partner-code-checking {
  border: 1px solid rgba(255, 190, 80, .3);
  background: rgba(255, 170, 50, .08);
  color: #ffe0a8;
}

.partner-code-invalid,
.partner-code-unavailable,
.partner-code-error,
.partner-error,
.partner-denied-notice {
  border: 1px solid rgba(255, 95, 95, .34);
  background: rgba(255, 70, 70, .1);
  color: #ffd0d0;
}

.partner-message-box {
  border: 1px solid rgba(61, 165, 255, .28);
  background: rgba(61, 165, 255, .08);
}

.partner-message-box p,
.partner-denied-notice p,
.partner-share-note span {
  margin-top: 6px;
  color: #b8c4cc;
}

.partner-agreement ul {
  display: grid;
  gap: 9px;
  padding-left: 22px;
  color: #b8c4cc;
  line-height: 1.6;
}

.partner-checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 18px;
  color: #d0d7dc;
  line-height: 1.65;
}

.partner-checkbox-row input {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  margin-top: 3px;
  accent-color: #3da5ff;
}

.partner-submit {
  width: 100%;
  margin-top: 22px;
}

.partner-helper {
  margin-top: 11px;
  color: #8f9aa2;
  font-size: 12px;
  text-align: center;
}

.partner-sidebar {
  position: sticky;
  top: 105px;
  display: grid;
  gap: 16px;
}

.partner-step {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.partner-step > span {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(61, 165, 255, .3);
  border-radius: 999px;
  background: rgba(61, 165, 255, .1);
  color: #9ed8ff;
  font-weight: 900;
}

.partner-step p,
.partner-sidebar-note p {
  margin-top: 5px;
  color: #aeb8bf;
  line-height: 1.55;
}

.partner-sidebar-note {
  border-color: rgba(255, 255, 255, .08) !important;
  background: rgba(255, 255, 255, .025) !important;
}

.partner-record-box,
.partner-metric-card {
  min-width: 0;
  display: grid;
  gap: 7px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 14px;
  background: rgba(255, 255, 255, .035);
  overflow-wrap: anywhere;
}

.partner-metric-card strong {
  font-size: 27px;
}

.partner-button-row {
  justify-content: center;
  margin-top: 22px;
}

.partner-share-panel,
.partner-referral-panel,
.partner-payout-status-panel,
.partner-payout-history-panel {
  margin-top: 22px;
}

.partner-payout-status-panel,
.partner-payout-history-panel {
  padding: 28px;
}

.partner-payout-status-panel {
  border-color: rgba(255, 190, 80, .24);
}

.partner-payout-status-panel.partner-payout-eligible {
  border-color: rgba(72, 214, 151, .32);
  background:
    radial-gradient(circle at top left, rgba(72, 214, 151, .13), transparent 42%),
    rgba(255, 255, 255, .04);
}

.partner-payout-status-panel > div:first-child > p:not(.eyebrow) {
  max-width: 850px;
  color: #b6c0c8;
  line-height: 1.7;
}

.partner-payout-status-panel > small {
  display: block;
  margin-top: 16px;
  color: #8f9aa2;
  line-height: 1.55;
}

.partner-payout-progress-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.partner-link-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  margin-top: 20px;
}

.partner-link-row input {
  color: #c9ebff;
  background: rgba(61, 165, 255, .08);
}

.partner-share-note {
  display: grid;
  gap: 4px;
  border: 1px solid rgba(255, 255, 255, .08);
  background: rgba(255, 255, 255, .03);
}

.partner-referral-stack {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

.partner-referral-card {
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 18px;
  background: rgba(0, 0, 0, .17);
}

.partner-referral-pending {
  border-color: rgba(255, 190, 80, .25);
}

.partner-referral-earned,
.partner-referral-paid {
  border-color: rgba(72, 214, 151, .25);
}

.partner-referral-paid {
  background: rgba(72, 214, 151, .045);
}

.partner-referral-voided {
  border-color: rgba(255, 95, 95, .25);
}

.partner-referral-heading h3 {
  margin: 5px 0;
  font-size: 27px;
}

.partner-referral-heading p:not(.eyebrow) {
  color: #9ca8b0;
}

.partner-paid-detail-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, .07);
  color: #aeb8bf;
  font-size: 13px;
}

.partner-payout-adjustment-note {
  margin: 14px 0;
  padding: 12px 14px;
  border: 1px solid rgba(255, 95, 95, .3);
  border-radius: 12px;
  background: rgba(255, 70, 70, .08);
  color: #ffd0d0;
  line-height: 1.55;
}

.partner-payout-history-stack {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

.partner-payout-history-card {
  padding: 20px;
  border: 1px solid rgba(72, 214, 151, .22);
  border-radius: 18px;
  background: rgba(72, 214, 151, .04);
}

.partner-payout-type-pill {
  display: inline-flex;
  padding: 8px 12px;
  border: 1px solid rgba(72, 214, 151, .3);
  border-radius: 999px;
  background: rgba(72, 214, 151, .09);
  color: #b8f3d8;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.partner-payout-note {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid rgba(61, 165, 255, .25);
  border-radius: 14px;
  background: rgba(61, 165, 255, .07);
}

.partner-payout-note p {
  margin-top: 6px;
  color: #b8c4cc;
  line-height: 1.6;
  white-space: pre-wrap;
}

.partner-empty-state {
  padding: 42px 18px;
  margin-top: 18px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 16px;
  background: rgba(255, 255, 255, .025);
  text-align: center;
}

.partner-empty-state h3 {
  margin-bottom: 7px;
  font-size: 25px;
}

.partner-empty-state p {
  color: #aeb8bf;
  line-height: 1.6;
}

.partner-center-actions {
  justify-content: flex-end;
}

button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

@media (max-width: 960px) {
  .partner-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .partner-sidebar {
    position: static;
  }

  .partner-dashboard-grid,
  .partner-payout-progress-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .partner-record-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .partner-application-page {
    padding: 48px 12px;
  }

  .partner-hero,
  .partner-form,
  .partner-sidebar > section,
  .partner-state-card,
  .partner-share-panel,
  .partner-referral-panel,
  .partner-payout-status-panel,
  .partner-payout-history-panel {
    padding: 20px;
    border-radius: 19px;
  }

  .partner-form-grid,
  .partner-record-grid,
  .partner-dashboard-grid,
  .partner-payout-progress-grid,
  .partner-link-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .partner-full-field {
    grid-column: auto;
  }

  .partner-button-row,
  .partner-button-row button,
  .partner-link-row button,
  .partner-section-heading > button {
    width: 100%;
  }
}
`;

export default PartnerApplication;

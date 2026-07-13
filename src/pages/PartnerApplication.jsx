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

function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 20);
}

function getLocalCodeError(code) {
  if (!code) {
    return "Choose your affiliate code.";
  }

  if (code.length < 4 || code.length > 20) {
    return "Use 4–20 characters.";
  }

  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)) {
    return "Use letters, numbers, and single hyphens only.";
  }

  if (!/[A-Z]/.test(code)) {
    return "Include at least one letter.";
  }

  return "";
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function readApiJson(response) {
  const text = await response.text();
  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(
      "The Partner Program service returned an invalid response."
    );
  }

  if (!response.ok || !result.success) {
    const error = new Error(
      result.error ||
        "The Partner Program request could not be completed."
    );

    error.status = response.status;
    error.requiresPasswordChange = Boolean(
      result.requiresPasswordChange
    );

    throw error;
  }

  return result;
}

function PartnerApplication({
  onNavigate = () => {},
  onSubmitApplication = null,
}) {
  const [formData, setFormData] =
    useState(initialForm);

  const [
    application,
    setApplication,
  ] = useState(null);

  const [
    eligibility,
    setEligibility,
  ] = useState(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    submitError,
    setSubmitError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    codeState,
    setCodeState,
  ] = useState("idle");

  const [
    codeMessage,
    setCodeMessage,
  ] = useState("");

  const availabilityRequest =
    useRef(0);

  const isDenied =
    application?.status ===
    "denied";

  const lockedApplication =
    Boolean(
      application &&
        [
          "pending",
          "approved",
          "suspended",
        ].includes(
          application.status
        )
    );

  const localCodeError =
    useMemo(
      () =>
        getLocalCodeError(
          formData.code
        ),
      [formData.code]
    );

  const formComplete =
    Boolean(
      eligibility?.eligible &&
        !lockedApplication &&
        !localCodeError &&
        codeState ===
          "available" &&
        formData.primaryPlatform &&
        formData.audienceSize &&
        formData.promotionPlan.trim() &&
        formData.agreementAccepted
    );

  useEffect(() => {
    let active = true;

    async function loadApplication() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response =
          await fetch(
            "/api/partner/application",
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",
              },

              credentials:
                "same-origin",

              cache: "no-store",
            }
          );

        const result =
          await readApiJson(
            response
          );

        if (!active) {
          return;
        }

        setApplication(
          result.application ||
            null
        );

        setEligibility(
          result.eligibility ||
            null
        );

        if (
          result.application
            ?.status ===
          "denied"
        ) {
          setFormData({
            code:
              result.application
                .code || "",

            primaryPlatform:
              result.application
                .primaryPlatform ||
              "",

            profileUrl:
              result.application
                .profileUrl || "",

            audienceSize:
              result.application
                .audienceSize || "",

            promotionPlan:
              result.application
                .promotionPlan ||
              "",

            experience:
              result.application
                .experience || "",

            agreementAccepted:
              false,
          });
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setLoadError(
          error.message ||
            "Partner Program access could not be loaded."
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadApplication();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (lockedApplication) {
      return undefined;
    }

    const code =
      formData.code;

    const error =
      getLocalCodeError(code);

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

    const requestNumber =
      availabilityRequest.current +
      1;

    availabilityRequest.current =
      requestNumber;

    setCodeState("checking");

    setCodeMessage(
      "Checking availability..."
    );

    const timer =
      window.setTimeout(
        async () => {
          try {
            const response =
              await fetch(
                `/api/partner/code-availability?code=${encodeURIComponent(
                  code
                )}`,
                {
                  method: "GET",

                  headers: {
                    Accept:
                      "application/json",
                  },

                  credentials:
                    "same-origin",

                  cache:
                    "no-store",
                }
              );

            const result =
              await readApiJson(
                response
              );

            if (
              availabilityRequest.current !==
              requestNumber
            ) {
              return;
            }

            setCodeState(
              result.available
                ? "available"
                : "unavailable"
            );

            setCodeMessage(
              result.message ||
                (
                  result.available
                    ? "This affiliate code is available."
                    : "That affiliate code has already been claimed."
                )
            );
          } catch (error) {
            if (
              availabilityRequest.current !==
              requestNumber
            ) {
              return;
            }

            setCodeState(
              "error"
            );

            setCodeMessage(
              error.message ||
                "Code availability could not be checked."
            );
          }
        },
        450
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    formData.code,
    lockedApplication,
  ]);

  function handleChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setSubmitError("");
    setSuccessMessage("");

    setFormData(
      (current) => ({
        ...current,

        [name]:
          type ===
          "checkbox"
            ? checked
            : name === "code"
              ? normalizeCode(
                  value
                )
              : value,
      })
    );
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (
      !formComplete ||
      isSubmitting
    ) {
      setSubmitError(
        "Complete the required fields and confirm that your affiliate code is available."
      );

      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const response =
        await fetch(
          "/api/partner/apply",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                code:
                  formData.code,

                primaryPlatform:
                  formData.primaryPlatform,

                profileUrl:
                  formData.profileUrl.trim(),

                audienceSize:
                  formData.audienceSize,

                promotionPlan:
                  formData.promotionPlan.trim(),

                experience:
                  formData.experience.trim(),

                agreementAccepted:
                  formData.agreementAccepted,
              }),
          }
        );

      const result =
        await readApiJson(
          response
        );

      const savedApplication =
        result.application ||
        null;

      setApplication(
        savedApplication
      );

      setSuccessMessage(
        result.message ||
          "Your Partner Program application was submitted."
      );

      if (
        typeof onSubmitApplication ===
        "function"
      ) {
        onSubmitApplication(
          savedApplication?.code ||
            formData.code
        );
      } else {
        window.setTimeout(
          () =>
            onNavigate(
              "dashboard"
            ),
          700
        );
      }
    } catch (error) {
      setSubmitError(
        error.message ||
          "The application could not be submitted."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <style>
          {partnerApplicationCss}
        </style>

        <main className="partner-application-page">
          <section className="partner-state-card">
            <p className="eyebrow">
              PARTNER PROGRAM
            </p>

            <h1>
              Loading Application
            </h1>

            <p>
              Checking your
              secure account
              eligibility and
              Partner Program
              record.
            </p>
          </section>
        </main>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <style>
          {partnerApplicationCss}
        </style>

        <main className="partner-application-page">
          <section className="partner-state-card">
            <p className="eyebrow">
              PARTNER PROGRAM
            </p>

            <h1>
              Application
              Unavailable
            </h1>

            <div
              className="partner-error"
              role="alert"
            >
              {loadError}
            </div>

            <div className="partner-button-row">
              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  window.location.reload()
                }
              >
                Try Again
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "dashboard"
                  )
                }
              >
                Return To
                Dashboard
              </button>
            </div>
          </section>
        </main>
      </>
    );
  }

  if (lockedApplication) {
    return (
      <>
        <style>
          {partnerApplicationCss}
        </style>

        <main className="partner-application-page">
          <section className="partner-state-card">
            <StatusPill
              status={
                application.status
              }
            />

            <p className="eyebrow">
              PARTNER PROGRAM
            </p>

            <h1>
              {getStatusTitle(
                application.status
              )}
            </h1>

            <p>
              {getStatusCopy(
                application.status
              )}
            </p>

            <div className="partner-record-grid">
              <RecordBox
                label="Your Affiliate Code"
                value={
                  application.code
                }
              />

              <RecordBox
                label="Status"
                value={
                  application.status
                }
              />

              <RecordBox
                label="Submitted"
                value={formatDate(
                  application.submittedAt
                )}
              />

              <RecordBox
                label="Primary Platform"
                value={
                  application.primaryPlatform
                }
              />
            </div>

            {application.customerMessage && (
              <div className="partner-message-box">
                <strong>
                  Message from
                  304 Peptides
                </strong>

                <p>
                  {
                    application.customerMessage
                  }
                </p>
              </div>
            )}

            {successMessage && (
              <div
                className="partner-success"
                aria-live="polite"
              >
                {successMessage}
              </div>
            )}

            <div className="partner-button-row">
              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  onNavigate(
                    "dashboard"
                  )
                }
              >
                Return To
                Dashboard
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "contact"
                  )
                }
              >
                Contact Support
              </button>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <style>
        {partnerApplicationCss}
      </style>

      <main className="partner-application-page">
        <section className="partner-application-inner">
          <div className="partner-topbar">
            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                onNavigate(
                  "dashboard"
                )
              }
            >
              ← Research Hub
            </button>

            <span
              className={
                eligibility?.eligible
                  ? "partner-eligible"
                  : "partner-ineligible"
              }
            >
              {eligibility?.eligible
                ? "Eligible To Apply"
                : "Order Required"}
            </span>
          </div>

          <header className="partner-hero">
            <p className="eyebrow">
              304 PEPTIDES
              PARTNER PROGRAM
            </p>

            <h1>
              Create Your Own
              Affiliate Code
            </h1>

            <p>
              Choose a unique
              code that fits
              your page or
              audience. Your
              code is reserved
              when the
              application is
              submitted and
              becomes active
              after approval.
            </p>
          </header>

          {!eligibility?.eligible ? (
            <section className="partner-state-card">
              <p className="eyebrow">
                ELIGIBILITY
              </p>

              <h2>
                Complete Your
                First Order
                Request
              </h2>

              <p>
                A secure
                account-linked
                order request is
                required before
                a Partner
                Program
                application can
                be submitted.
              </p>

              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  onNavigate(
                    "products"
                  )
                }
              >
                Browse Products
              </button>
            </section>
          ) : (
            <div className="partner-layout">
              <form
                className="partner-form"
                onSubmit={
                  handleSubmit
                }
              >
                {isDenied && (
                  <div className="partner-denied-notice">
                    <strong>
                      Previous
                      application
                      not approved
                    </strong>

                    <p>
                      {application.customerMessage ||
                        "You may update the application and choose an available code before submitting again."}
                    </p>
                  </div>
                )}

                <section className="partner-form-section">
                  <p className="eyebrow">
                    YOUR AFFILIATE
                    CODE
                  </p>

                  <h2>
                    Choose Your
                    Code
                  </h2>

                  <label className="partner-field">
                    <span>
                      Affiliate Code
                    </span>

                    <div className="partner-code-input-row">
                      <input
                        name="code"
                        type="text"
                        value={
                          formData.code
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="DANNY304"
                        autoComplete="off"
                        maxLength="20"
                        disabled={
                          isSubmitting
                        }
                        aria-describedby="partner-code-message"
                      />

                      <strong>
                        {
                          formData
                            .code
                            .length
                        }
                        /20
                      </strong>
                    </div>

                    <small>
                      4–20
                      characters.
                      Letters,
                      numbers, and
                      single
                      hyphens only.
                      Codes are not
                      case-sensitive.
                    </small>

                    {formData.code && (
                      <div
                        id="partner-code-message"
                        className={`partner-code-message partner-code-${codeState}`}
                        aria-live="polite"
                      >
                        {codeMessage ||
                          localCodeError}
                      </div>
                    )}
                  </label>
                </section>

                <section className="partner-form-section">
                  <p className="eyebrow">
                    AUDIENCE
                    DETAILS
                  </p>

                  <h2>
                    Tell Us Where
                    You Share
                  </h2>

                  <div className="partner-form-grid">
                    <SelectField
                      name="primaryPlatform"
                      label="Primary Platform"
                      value={
                        formData.primaryPlatform
                      }
                      onChange={
                        handleChange
                      }
                      options={
                        platformOptions
                      }
                      disabled={
                        isSubmitting
                      }
                    />

                    <SelectField
                      name="audienceSize"
                      label="Approximate Audience Size"
                      value={
                        formData.audienceSize
                      }
                      onChange={
                        handleChange
                      }
                      options={
                        audienceOptions
                      }
                      disabled={
                        isSubmitting
                      }
                    />

                    <label className="partner-field partner-full-field">
                      <span>
                        Profile or
                        Page URL —
                        Optional
                      </span>

                      <input
                        name="profileUrl"
                        type="url"
                        value={
                          formData.profileUrl
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="https://..."
                        autoComplete="url"
                        maxLength="500"
                        disabled={
                          isSubmitting
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="partner-form-section">
                  <p className="eyebrow">
                    PROMOTION PLAN
                  </p>

                  <h2>
                    How Will You
                    Share 304
                    Peptides?
                  </h2>

                  <label className="partner-field">
                    <span>
                      Promotion
                      Plan
                    </span>

                    <textarea
                      name="promotionPlan"
                      rows="6"
                      value={
                        formData.promotionPlan
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Describe the educational content, audience, and channels you plan to use."
                      maxLength="2000"
                      disabled={
                        isSubmitting
                      }
                    />

                    <small>
                      {
                        formData
                          .promotionPlan
                          .length
                      }
                      /2000
                      characters
                    </small>
                  </label>

                  <label className="partner-field">
                    <span>
                      Relevant
                      Experience —
                      Optional
                    </span>

                    <textarea
                      name="experience"
                      rows="4"
                      value={
                        formData.experience
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Share any experience with content creation, communities, research education, or affiliate programs."
                      maxLength="1000"
                      disabled={
                        isSubmitting
                      }
                    />

                    <small>
                      {
                        formData
                          .experience
                          .length
                      }
                      /1000
                      characters
                    </small>
                  </label>
                </section>

                <section className="partner-agreement">
                  <p className="eyebrow">
                    REQUIRED
                    AGREEMENT
                  </p>

                  <h2>
                    Partner
                    Program
                    Standards
                  </h2>

                  <ul>
                    <li>
                      Use
                      research-only
                      language and
                      do not make
                      medical
                      claims.
                    </li>

                    <li>
                      Do not
                      represent
                      yourself as
                      304 Peptides
                      staff or
                      ownership.
                    </li>

                    <li>
                      Do not use
                      your own
                      code for
                      self-referrals.
                    </li>

                    <li>
                      Do not use
                      spam,
                      deceptive
                      advertising,
                      or
                      misleading
                      discounts.
                    </li>

                    <li>
                      Partner
                      approval and
                      code access
                      may be
                      suspended
                      for
                      violations.
                    </li>
                  </ul>

                  <label className="partner-checkbox-row">
                    <input
                      name="agreementAccepted"
                      type="checkbox"
                      checked={
                        formData.agreementAccepted
                      }
                      onChange={
                        handleChange
                      }
                      disabled={
                        isSubmitting
                      }
                    />

                    <span>
                      I understand
                      and agree to
                      follow the
                      Partner
                      Program
                      standards
                      and
                      research-use
                      restrictions.
                    </span>
                  </label>
                </section>

                {submitError && (
                  <div
                    className="partner-error"
                    role="alert"
                  >
                    {submitError}
                  </div>
                )}

                {successMessage && (
                  <div
                    className="partner-success"
                    aria-live="polite"
                  >
                    {
                      successMessage
                    }
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-btn partner-submit"
                  disabled={
                    !formComplete ||
                    isSubmitting
                  }
                >
                  {isSubmitting
                    ? "Submitting Application..."
                    : isDenied
                      ? "Resubmit Partner Application"
                      : "Submit Partner Application"}
                </button>

                {!formComplete &&
                  !isSubmitting && (
                    <p className="partner-helper">
                      Complete the
                      required
                      fields,
                      confirm code
                      availability,
                      and accept
                      the Partner
                      Program
                      agreement.
                    </p>
                  )}
              </form>

              <aside className="partner-sidebar">
                <section>
                  <p className="eyebrow">
                    HOW CODES WORK
                  </p>

                  <h2>
                    Your Code,
                    Pending
                    Approval
                  </h2>

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
                  <strong>
                    No
                    self-referrals
                  </strong>

                  <p>
                    A partner
                    cannot earn
                    commission or
                    customer
                    discounts by
                    using their
                    own code.
                    Self-use may
                    still be
                    recorded for
                    fraud and
                    performance
                    review.
                  </p>
                </section>

                <section className="partner-sidebar-note">
                  <strong>
                    For Research
                    Use Only
                  </strong>

                  <p>
                    Partner
                    content must
                    describe
                    products only
                    within the
                    site’s
                    research-use
                    framework and
                    must not
                    promote human
                    consumption.
                  </p>
                </section>
              </aside>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  disabled,
}) {
  return (
    <label className="partner-field">
      <span>
        {label}
      </span>

      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        <option value="">
          Select One
        </option>

        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          )
        )}
      </select>
    </label>
  );
}

function StatusPill({
  status,
}) {
  return (
    <span
      className={`partner-status-pill partner-status-${status}`}
    >
      {String(
        status || "pending"
      ).toUpperCase()}
    </span>
  );
}

function RecordBox({
  label,
  value,
}) {
  return (
    <div className="partner-record-box">
      <span>
        {label}
      </span>

      <strong>
        {value ||
          "Not available"}
      </strong>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}) {
  return (
    <div className="partner-step">
      <span>
        {number}
      </span>

      <div>
        <strong>
          {title}
        </strong>

        <p>
          {text}
        </p>
      </div>
    </div>
  );
}

function getStatusTitle(
  status
) {
  const titles = {
    pending:
      "Application Under Review",

    approved:
      "Partner Code Approved",

    suspended:
      "Partner Access Suspended",
  };

  return (
    titles[status] ||
    "Partner Application"
  );
}

function getStatusCopy(
  status
) {
  const copy = {
    pending:
      "Your selected affiliate code is reserved while the application is reviewed. It is not active for referrals yet.",

    approved:
      "Your customer-created affiliate code is approved and ready for the referral-tracking phase of the Partner Program.",

    suspended:
      "Your affiliate code remains reserved but is not active. Review the message below or contact support for assistance.",
  };

  return (
    copy[status] ||
    "Review your current Partner Program record below."
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
.partner-code-input-row {
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
.partner-status-approved {
  border: 1px solid rgba(72, 214, 151, .35);
  background: rgba(72, 214, 151, .11);
  color: #b8f3d8;
}

.partner-ineligible,
.partner-status-pending {
  border: 1px solid rgba(255, 190, 80, .35);
  background: rgba(255, 170, 50, .1);
  color: #ffe0a8;
}

.partner-status-suspended {
  border: 1px solid rgba(255, 95, 95, .38);
  background: rgba(255, 70, 70, .12);
  color: #ffcaca;
}

.partner-hero,
.partner-form,
.partner-sidebar > section,
.partner-state-card {
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 25px;
  background:
    radial-gradient(
      circle at top left,
      rgba(61, 165, 255, .12),
      transparent 38%
    ),
    rgba(255, 255, 255, .04);
  box-shadow: 0 24px 65px rgba(0, 0, 0, .35);
}

.partner-hero {
  padding: 50px;
  margin-bottom: 24px;
  text-align: center;
}

.partner-hero h1,
.partner-state-card h1 {
  margin: 8px 0 17px;
  font-size: clamp(38px, 7vw, 62px);
  line-height: 1.04;
}

.partner-hero > p:not(.eyebrow),
.partner-state-card > p:not(.eyebrow) {
  max-width: 820px;
  margin: 0 auto;
  color: #b8c1c8;
  line-height: 1.75;
}

.partner-layout {
  display: grid;
  grid-template-columns:
    minmax(0, 1.55fr)
    minmax(300px, .75fr);
  gap: 20px;
  align-items: start;
}

.partner-form {
  min-width: 0;
  padding: 28px;
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
.partner-state-card h2 {
  margin: 6px 0 18px;
  font-size: clamp(27px, 4vw, 36px);
  line-height: 1.12;
}

.partner-form-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 15px;
}

.partner-field {
  min-width: 0;
  display: grid;
  gap: 8px;
  margin-top: 15px;
}

.partner-field > span,
.partner-record-box span {
  color: #9ed8ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.partner-field input,
.partner-field select,
.partner-field textarea {
  width: 100%;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 12px;
  outline: none;
  background: #151b22;
  color: #fff;
  font: inherit;
}

.partner-field input:focus,
.partner-field select:focus,
.partner-field textarea:focus {
  border-color: rgba(61, 165, 255, .65);
  box-shadow: 0 0 0 3px rgba(61, 165, 255, .12);
}

.partner-field select option {
  background: #151b22;
  color: #fff;
}

.partner-field textarea {
  resize: vertical;
  min-height: 110px;
}

.partner-field small,
.partner-helper {
  color: #8e99a2;
  line-height: 1.55;
}

.partner-full-field {
  grid-column: 1 / -1;
}

.partner-code-input-row {
  flex-wrap: nowrap;
}

.partner-code-input-row input {
  flex: 1;
}

.partner-code-input-row strong {
  min-width: 54px;
  color: #aeb8bf;
  font-size: 12px;
  text-align: right;
}

.partner-code-message {
  padding: 11px 12px;
  border-radius: 11px;
  font-size: 13px;
  line-height: 1.45;
}

.partner-code-checking {
  border: 1px solid rgba(61, 165, 255, .25);
  background: rgba(61, 165, 255, .08);
  color: #c7eaff;
}

.partner-code-available {
  border: 1px solid rgba(72, 214, 151, .3);
  background: rgba(72, 214, 151, .09);
  color: #b8f3d8;
}

.partner-code-invalid,
.partner-code-unavailable,
.partner-code-error {
  border: 1px solid rgba(255, 95, 95, .32);
  background: rgba(255, 70, 70, .1);
  color: #ffd0d0;
}

.partner-agreement ul {
  display: grid;
  gap: 10px;
  margin: 0 0 18px 20px;
  color: #bac3ca;
  line-height: 1.55;
}

.partner-checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 190, 80, .25);
  border-radius: 14px;
  background: rgba(255, 170, 50, .07);
  color: #e6d7ba;
  line-height: 1.6;
  cursor: pointer;
}

.partner-checkbox-row input {
  width: 19px;
  height: 19px;
  margin-top: 3px;
  flex: 0 0 auto;
}

.partner-submit {
  width: 100%;
  margin-top: 22px;
}

.partner-submit:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.partner-helper {
  margin-top: 12px;
  text-align: center;
  font-size: 13px;
}

.partner-sidebar {
  display: grid;
  gap: 16px;
  position: sticky;
  top: 24px;
}

.partner-sidebar > section {
  padding: 24px;
}

.partner-step {
  display: grid;
  grid-template-columns:
    42px minmax(0, 1fr);
  gap: 12px;
  padding: 15px 0;
  border-top: 1px solid rgba(255, 255, 255, .08);
}

.partner-step > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(61, 165, 255, .13);
  color: #9ed8ff;
  font-size: 12px;
  font-weight: 900;
}

.partner-step strong,
.partner-sidebar-note strong,
.partner-message-box strong,
.partner-denied-notice strong {
  color: #fff;
}

.partner-step p,
.partner-sidebar-note p,
.partner-message-box p,
.partner-denied-notice p {
  margin-top: 5px;
  color: #aab5bd;
  line-height: 1.6;
}

.partner-sidebar-note {
  background: rgba(255, 255, 255, .03) !important;
}

.partner-error,
.partner-success,
.partner-denied-notice,
.partner-message-box {
  margin: 16px 0;
  padding: 15px;
  border-radius: 14px;
  line-height: 1.6;
}

.partner-error,
.partner-denied-notice {
  border: 1px solid rgba(255, 95, 95, .34);
  background: rgba(255, 70, 70, .1);
  color: #ffd0d0;
}

.partner-success {
  border: 1px solid rgba(72, 214, 151, .3);
  background: rgba(72, 214, 151, .09);
  color: #b8f3d8;
}

.partner-message-box {
  border: 1px solid rgba(61, 165, 255, .28);
  background: rgba(61, 165, 255, .08);
}

.partner-state-card {
  width: 100%;
  max-width: 850px;
  margin: 0 auto;
  padding: 46px;
  text-align: center;
}

.partner-state-card .partner-status-pill {
  margin-bottom: 12px;
}

.partner-record-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 28px 0;
  text-align: left;
}

.partner-record-box {
  min-width: 0;
  display: grid;
  gap: 7px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 14px;
  background: rgba(0, 0, 0, .17);
}

.partner-record-box strong {
  overflow-wrap: anywhere;
  text-transform: capitalize;
}

.partner-button-row {
  justify-content: center;
  margin-top: 22px;
}

@media (max-width: 900px) {
  .partner-layout {
    grid-template-columns:
      minmax(0, 1fr);
  }

  .partner-sidebar {
    position: static;
  }
}

@media (max-width: 650px) {
  .partner-application-page {
    padding: 48px 12px;
  }

  .partner-hero,
  .partner-form,
  .partner-sidebar > section,
  .partner-state-card {
    padding: 20px;
    border-radius: 20px;
  }

  .partner-form-grid,
  .partner-record-grid {
    grid-template-columns:
      minmax(0, 1fr);
  }

  .partner-full-field {
    grid-column: auto;
  }

  .partner-button-row button {
    width: 100%;
  }
}
`;

export default PartnerApplication;
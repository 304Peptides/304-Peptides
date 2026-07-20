import {
  useEffect,
  useMemo,
  useState,
} from "react";

const storageKey =
  "304-site-settings";

const customerAccountKey =
  "304-customer-account";

const defaultSettings = {
  accountCreationEnabled:
    true,
};

function loadSettings() {
  try {
    const savedSettings =
      window.localStorage.getItem(
        storageKey
      );

    if (
      !savedSettings
    ) {
      return defaultSettings;
    }

    return {
      ...defaultSettings,
      ...JSON.parse(
        savedSettings
      ),
    };
  } catch {
    return defaultSettings;
  }
}

function saveCustomerAccount(
  account
) {
  try {
    window.sessionStorage.setItem(
      customerAccountKey,
      JSON.stringify(
        account
      )
    );
  } catch {
    // The secure HTTP-only
    // session cookie remains
    // the source of truth.
  }
}

async function readJsonResponse(
  response
) {
  const text =
    await response.text();

  let result;

  try {
    result =
      JSON.parse(
        text
      );
  } catch {
    throw new Error(
      "The account service returned an invalid response."
    );
  }

  if (
    !response.ok ||
    !result.success
  ) {
    throw new Error(
      result.error ||
        "The account request could not be completed."
    );
  }

  return result;
}

function isValidEmail(
  value
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function CreateAccount({
  onNavigate = () => {},
  onLogin = () => {},
}) {
  const [
    settings,
    setSettings,
  ] = useState(
    loadSettings
  );

  const [
    formData,
    setFormData,
  ] = useState({
    firstName:
      "",

    lastName:
      "",

    email:
      "",

    password:
      "",

    confirmPassword:
      "",
  });

  const [
    ageConfirmed,
    setAgeConfirmed,
  ] = useState(false);

  const [
    researchConfirmed,
    setResearchConfirmed,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isCheckingSession,
    setIsCheckingSession,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    function updateSettings(
      event
    ) {
      if (
        event.detail
      ) {
        setSettings(
          (
            currentSettings
          ) => ({
            ...currentSettings,
            ...event.detail,
          })
        );

        return;
      }

      setSettings(
        loadSettings()
      );
    }

    function handleStorageChange(
      event
    ) {
      if (
        event.key ===
        storageKey
      ) {
        setSettings(
          loadSettings()
        );
      }
    }

    window.addEventListener(
      "304-site-settings-updated",
      updateSettings
    );

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "304-site-settings-updated",
        updateSettings
      );

      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  useEffect(() => {
    let isMounted =
      true;

    async function checkSession() {
      try {
        const response =
          await fetch(
            "/api/auth/session",
            {
              method:
                "GET",

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
          await readJsonResponse(
            response
          );

        if (
          !isMounted
        ) {
          return;
        }

        if (
          result.authenticated &&
          result.account
        ) {
          saveCustomerAccount(
            result.account
          );

          onLogin(
            result.account
          );

          onNavigate(
            "dashboard"
          );
        }
      } catch {
        // No active session is
        // normal on this page.
      } finally {
        if (
          isMounted
        ) {
          setIsCheckingSession(
            false
          );
        }
      }
    }

    checkSession();

    return () => {
      isMounted =
        false;
    };
  }, [
    onLogin,
    onNavigate,
  ]);

  const cleanedEmail =
    formData.email
      .trim()
      .toLowerCase();

  const passwordRules =
    useMemo(
      () => ({
        minimumLength:
          formData.password.length >=
          12,

        maximumLength:
          formData.password.length <=
          128,

        passwordsMatch:
          Boolean(
            formData.confirmPassword
          ) &&
          formData.password ===
            formData.confirmPassword,
      }),
      [
        formData.password,
        formData.confirmPassword,
      ]
    );

  const formComplete =
    Boolean(
      formData.firstName.trim() &&
        formData.lastName.trim() &&
        cleanedEmail &&
        isValidEmail(
          cleanedEmail
        ) &&
        passwordRules.minimumLength &&
        passwordRules.maximumLength &&
        passwordRules.passwordsMatch
    );

  const canCreateAccount =
    Boolean(
      settings.accountCreationEnabled &&
        formComplete &&
        ageConfirmed &&
        researchConfirmed &&
        !isSubmitting &&
        !isCheckingSession
    );

  function handleChange(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target;

    setFormData(
      (
        currentData
      ) => ({
        ...currentData,

        [name]:
          value,
      })
    );

    setErrorMessage(
      ""
    );
  }

  function validateForm() {
    if (
      !formData.firstName.trim()
    ) {
      return "Enter your first name.";
    }

    if (
      !formData.lastName.trim()
    ) {
      return "Enter your last name.";
    }

    if (
      !cleanedEmail
    ) {
      return "Enter your email address.";
    }

    if (
      !isValidEmail(
        cleanedEmail
      )
    ) {
      return "Enter a valid email address.";
    }

    if (
      !formData.password
    ) {
      return "Create a password.";
    }

    if (
      formData.password.length <
      12
    ) {
      return "Password must contain at least 12 characters.";
    }

    if (
      formData.password.length >
      128
    ) {
      return "Password cannot exceed 128 characters.";
    }

    if (
      !formData.confirmPassword
    ) {
      return "Confirm your password.";
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      return "The passwords do not match.";
    }

    if (
      !ageConfirmed
    ) {
      return "Confirm that you are at least 21 years old.";
    }

    if (
      !researchConfirmed
    ) {
      return "Accept the Research Agreement before creating an account.";
    }

    return "";
  }

  async function handleCreateAccount(
    event
  ) {
    event.preventDefault();

    const validationError =
      validateForm();

    if (
      validationError
    ) {
      setErrorMessage(
        validationError
      );

      return;
    }

    if (
      !settings.accountCreationEnabled
    ) {
      setErrorMessage(
        "New account registration is currently disabled."
      );

      return;
    }

    setIsSubmitting(
      true
    );

    setErrorMessage(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/auth/register",
          {
            method:
              "POST",

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
                firstName:
                  formData.firstName.trim(),

                lastName:
                  formData.lastName.trim(),

                email:
                  cleanedEmail,

                password:
                  formData.password,

                ageConfirmed:
                  true,

                acceptedResearchAgreement:
                  true,
              }),
          }
        );

      const result =
        await readJsonResponse(
          response
        );

      if (
        !result.authenticated ||
        !result.account
      ) {
        throw new Error(
          "The account was created, but the secure login session could not be confirmed."
        );
      }

      saveCustomerAccount(
        result.account
      );

      setFormData({
        firstName:
          "",

        lastName:
          "",

        email:
          "",

        password:
          "",

        confirmPassword:
          "",
      });

      setAgeConfirmed(
        false
      );

      setResearchConfirmed(
        false
      );

      onLogin(
        result.account
      );

      onNavigate(
        "dashboard"
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error.message ||
          "The account could not be created."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  if (
    !settings.accountCreationEnabled
  ) {
    return (
      <>
        <style>
          {
            createAccountCss
          }
        </style>

        <main className="create-account-page">
          <section className="create-account-disabled">
            <p className="eyebrow">
              ACCOUNT CREATION
            </p>

            <h1>
              New Accounts Are
              Temporarily
              Disabled
            </h1>

            <p>
              New research
              customer
              registration is
              not currently
              available.
              Existing
              customers may
              continue to use
              the secure login
              page.
            </p>

            <div className="create-account-disabled-notice">
              Account creation
              has been disabled
              in Site Settings.
            </div>

            <div className="create-account-button-row">
              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  onNavigate(
                    "login"
                  )
                }
              >
                Existing
                Customer Login
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "home"
                  )
                }
              >
                Return Home
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "researchAgreement"
                  )
                }
              >
                Research
                Agreement
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
        {
          createAccountCss
        }
      </style>

      <main className="create-account-page">
        <section className="create-account-inner">
          <header className="create-account-hero">
            <p className="eyebrow">
              CREATE ACCOUNT
            </p>

            <h1>
              Account
              Access
            </h1>

            <p>
              Create a secure
              account to access
              available pricing,
              checkout tools,
              account-linked
              order history,
              your Account,
              and eligible
              Partner Program
              features.
            </p>

            <div className="create-account-hero-notice">
              For Research Use
              Only. Not intended
              for human
              consumption.
            </div>
          </header>

          <div className="create-account-grid">
            <form
              className="create-account-form-panel"
              onSubmit={
                handleCreateAccount
              }
            >
              <p className="eyebrow">
                ACCOUNT DETAILS
              </p>

              <h2>
                Create Your
                Account
              </h2>

              {isCheckingSession && (
                <div className="create-account-session-check">
                  Checking for an
                  existing secure
                  session...
                </div>
              )}

              <div className="create-account-form-grid">
                <Field
                  name="firstName"
                  label="First Name"
                  value={
                    formData.firstName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="First Name"
                  autoComplete="given-name"
                  maxLength="100"
                  disabled={
                    isSubmitting ||
                    isCheckingSession
                  }
                />

                <Field
                  name="lastName"
                  label="Last Name"
                  value={
                    formData.lastName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Last Name"
                  autoComplete="family-name"
                  maxLength="100"
                  disabled={
                    isSubmitting ||
                    isCheckingSession
                  }
                />

                <Field
                  name="email"
                  label="Email Address"
                  type="email"
                  value={
                    formData.email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Email Address"
                  autoComplete="email"
                  inputMode="email"
                  maxLength="254"
                  fullWidth
                  disabled={
                    isSubmitting ||
                    isCheckingSession
                  }
                />

                <PasswordField
                  name="password"
                  label="Password"
                  value={
                    formData.password
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Create Password"
                  autoComplete="new-password"
                  showPassword={
                    showPassword
                  }
                  onToggle={() =>
                    setShowPassword(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  disabled={
                    isSubmitting ||
                    isCheckingSession
                  }
                />

                <PasswordField
                  name="confirmPassword"
                  label="Confirm Password"
                  value={
                    formData.confirmPassword
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  showPassword={
                    showConfirmPassword
                  }
                  onToggle={() =>
                    setShowConfirmPassword(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  disabled={
                    isSubmitting ||
                    isCheckingSession
                  }
                />
              </div>

              <div className="create-account-password-rules">
                <PasswordRule
                  passed={
                    passwordRules.minimumLength
                  }
                  label="At least 12 characters"
                />

                <PasswordRule
                  passed={
                    passwordRules.maximumLength
                  }
                  label="No more than 128 characters"
                />

                <PasswordRule
                  passed={
                    passwordRules.passwordsMatch
                  }
                  label="Passwords match"
                />
              </div>

              <div className="create-account-agreement-panel">
                <p className="eyebrow">
                  REQUIRED
                  CONFIRMATIONS
                </p>

                <h2>
                  Research-Use
                  Agreement
                </h2>

                <div className="create-account-agreement-info">
                  <strong>
                    Review Before
                    Creating An
                    Account
                  </strong>

                  <p>
                    Account access
                    is intended
                    only for
                    customers who
                    understand the
                    research-use
                    nature of the
                    site and agree
                    to follow all
                    applicable
                    restrictions.
                  </p>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      onNavigate(
                        "researchAgreement"
                      )
                    }
                  >
                    View Research
                    Agreement
                  </button>
                </div>

                <label className="create-account-checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      ageConfirmed
                    }
                    disabled={
                      isSubmitting ||
                      isCheckingSession
                    }
                    onChange={(
                      event
                    ) => {
                      setAgeConfirmed(
                        event.target
                          .checked
                      );

                      setErrorMessage(
                        ""
                      );
                    }}
                  />

                  <span>
                    I confirm that
                    I am at least
                    21 years old.
                  </span>
                </label>

                <label className="create-account-checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      researchConfirmed
                    }
                    disabled={
                      isSubmitting ||
                      isCheckingSession
                    }
                    onChange={(
                      event
                    ) => {
                      setResearchConfirmed(
                        event.target
                          .checked
                      );

                      setErrorMessage(
                        ""
                      );
                    }}
                  />

                  <span>
                    I have reviewed
                    and accept the
                    Research
                    Agreement. I
                    understand the
                    products are
                    for research
                    use only and
                    are not
                    intended for
                    human
                    consumption.
                  </span>
                </label>
              </div>

              {errorMessage && (
                <div
                  className="create-account-error"
                  role="alert"
                >
                  {
                    errorMessage
                  }
                </div>
              )}

              <div className="create-account-security-note">
                Passwords are
                securely hashed
                before storage.
                Successful
                registration also
                creates a
                protected,
                HTTP-only login
                session.
              </div>

              <button
                type="submit"
                className="primary-btn create-account-full-button"
                disabled={
                  !canCreateAccount
                }
              >
                {isSubmitting
                  ? "Creating Account..."
                  : isCheckingSession
                  ? "Checking Session..."
                  : "Create Account"}
              </button>

              {!canCreateAccount &&
                !isSubmitting &&
                !isCheckingSession && (
                  <p className="create-account-helper-text">
                    Complete all
                    fields, use a
                    matching
                    12-character
                    password, and
                    accept both
                    required
                    confirmations.
                  </p>
                )}

              <p className="create-account-bottom-text">
                Already have an
                account?{" "}

                <button
                  type="button"
                  onClick={() =>
                    onNavigate(
                      "login"
                    )
                  }
                >
                  Login here
                </button>
              </p>
            </form>

            <aside className="create-account-side-panel">
              <p className="eyebrow">
                ACCOUNT BENEFITS
              </p>

              <h2>
                Secure Account
                Access
              </h2>

              <div className="create-account-benefit-stack">
                <BenefitBox
                  title="Pricing Access"
                  description="View available account-only product pricing after signing in."
                />

                <BenefitBox
                  title="Cart And Checkout"
                  description="Add available research products to the cart and securely submit order requests."
                />

                <BenefitBox
                  title="Account-Linked Orders"
                  description="Orders submitted while logged in are linked to your secure account."
                />

                <BenefitBox
                  title="Account"
                  description="Review your own account-linked order activity across approved devices."
                />

                <BenefitBox
                  title="Partner Program"
                  description="Access eligible research partner opportunities after meeting program requirements."
                />
              </div>

              <div className="create-account-notice-box">
                Email
                verification,
                password reset,
                and account
                recovery are not
                available yet.
                Use an email
                address you
                control and store
                your password
                securely.
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}

function Field({
  name,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  fullWidth = false,
  disabled = false,
}) {
  return (
    <label
      className={`create-account-field ${
        fullWidth
          ? "create-account-full-field"
          : ""
      }`}
    >
      <span>
        {label}
      </span>

      <input
        name={
          name
        }
        type={
          type
        }
        placeholder={
          placeholder
        }
        value={
          value
        }
        onChange={
          onChange
        }
        autoComplete={
          autoComplete
        }
        inputMode={
          inputMode
        }
        maxLength={
          maxLength
        }
        disabled={
          disabled
        }
      />
    </label>
  );
}

function PasswordField({
  name,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  showPassword,
  onToggle,
  disabled,
}) {
  return (
    <label className="create-account-field create-account-full-field">
      <span>
        {label}
      </span>

      <div className="create-account-password-field">
        <input
          name={
            name
          }
          type={
            showPassword
              ? "text"
              : "password"
          }
          placeholder={
            placeholder
          }
          value={
            value
          }
          onChange={
            onChange
          }
          autoComplete={
            autoComplete
          }
          minLength="12"
          maxLength="128"
          disabled={
            disabled
          }
        />

        <button
          type="button"
          disabled={
            disabled
          }
          onClick={
            onToggle
          }
        >
          {showPassword
            ? "Hide"
            : "Show"}
        </button>
      </div>
    </label>
  );
}

function PasswordRule({
  passed,
  label,
}) {
  return (
    <div
      className={`create-account-password-rule ${
        passed
          ? "create-account-password-rule-passed"
          : ""
      }`}
    >
      <span>
        {passed
          ? "✓"
          : "○"}
      </span>

      <strong>
        {label}
      </strong>
    </div>
  );
}

function BenefitBox({
  title,
  description,
}) {
  return (
    <div className="create-account-benefit-box">
      <strong>
        {title}
      </strong>

      <span>
        {description}
      </span>
    </div>
  );
}

const createAccountCss = `
  .create-account-page,
  .create-account-page *,
  .create-account-page *::before,
  .create-account-page *::after {
    box-sizing: border-box;
  }

  .create-account-page {
    width: 100%;
    max-width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .create-account-inner {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
  }

  .create-account-hero,
  .create-account-disabled {
    padding: 56px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 30px;
    background:
      radial-gradient(
        circle at top,
        rgba(61,165,255,0.2),
        transparent 42%
      ),
      rgba(255,255,255,0.035);
    box-shadow: 0 30px 80px rgba(0,0,0,0.45);
    text-align: center;
  }

  .create-account-hero {
    margin-bottom: 30px;
  }

  .create-account-disabled {
    max-width: 900px;
    margin: 0 auto;
    padding: 64px;
  }

  .create-account-hero h1,
  .create-account-disabled h1 {
    margin-bottom: 20px;
    font-size: clamp(44px, 7vw, 62px);
    line-height: 1.05;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #9d9d9d
      );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .create-account-hero > p:not(.eyebrow),
  .create-account-disabled > p:not(.eyebrow) {
    max-width: 780px;
    margin: 0 auto;
    color: #c8c8c8;
    font-size: 19px;
    line-height: 1.8;
  }

  .create-account-hero-notice {
    display: inline-flex;
    margin-top: 28px;
    padding: 13px 19px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 999px;
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .create-account-disabled-notice {
    max-width: 640px;
    margin: 26px auto 0;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(0,0,0,0.24);
    color: #aeb7bf;
    line-height: 1.65;
  }

  .create-account-button-row {
    display: flex;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 28px;
  }

  .create-account-grid {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(320px, 360px);
    gap: 30px;
    align-items: start;
  }

  .create-account-form-panel,
  .create-account-side-panel {
    min-width: 0;
    padding: 38px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.14),
        transparent 35%
      ),
      rgba(255,255,255,0.035);
    box-shadow: 0 30px 80px rgba(0,0,0,0.45);
  }

  .create-account-side-panel {
    position: sticky;
    top: 110px;
    padding: 32px;
  }

  .create-account-form-panel h2,
  .create-account-side-panel h2,
  .create-account-agreement-panel h2 {
    margin-bottom: 24px;
    font-size: clamp(29px, 4vw, 36px);
    line-height: 1.12;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #9d9d9d
      );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .create-account-form-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .create-account-field {
    min-width: 0;
    display: grid;
    gap: 8px;
  }

  .create-account-full-field {
    grid-column: 1 / -1;
  }

  .create-account-field > span {
    color: #c8c8c8;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .create-account-field input {
    width: 100%;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    outline: none;
    background: rgba(255,255,255,0.055);
    color: #ffffff;
    font: inherit;
    font-size: 15px;
  }

  .create-account-field input:focus {
    border-color: rgba(61,165,255,0.62);
    box-shadow: 0 0 0 3px rgba(61,165,255,0.12);
  }

  .create-account-field input:disabled {
    opacity: 0.62;
    cursor: not-allowed;
  }

  .create-account-password-field {
    position: relative;
  }

  .create-account-password-field input {
    padding-right: 78px;
  }

  .create-account-password-field button {
    position: absolute;
    top: 50%;
    right: 13px;
    padding: 7px 9px;
    border: 0;
    border-radius: 8px;
    background: rgba(61,165,255,0.11);
    color: #9ed8ff;
    font: inherit;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
    transform: translateY(-50%);
  }

  .create-account-password-field button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .create-account-password-rules {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-top: 16px;
  }

  .create-account-password-rule {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 13px;
    background: rgba(255,255,255,0.035);
    color: #8f9aa3;
    font-size: 11px;
    line-height: 1.4;
  }

  .create-account-password-rule > span {
    color: #76818a;
    font-size: 15px;
  }

  .create-account-password-rule-passed {
    border-color: rgba(61,165,255,0.28);
    background: rgba(61,165,255,0.1);
    color: #b8e3ff;
  }

  .create-account-password-rule-passed > span {
    color: #62bdff;
  }

  .create-account-agreement-panel {
    margin-top: 32px;
    padding: 26px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 22px;
    background: rgba(255,255,255,0.045);
  }

  .create-account-agreement-info {
    margin-bottom: 20px;
    padding: 18px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 18px;
    background: rgba(61,165,255,0.12);
    color: #c8eaff;
    line-height: 1.7;
  }

  .create-account-agreement-info p {
    margin-top: 9px;
    color: #b8d8eb;
  }

  .create-account-agreement-info button {
    margin-top: 16px;
  }

  .create-account-checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-top: 16px;
    color: #c8c8c8;
    line-height: 1.7;
    cursor: pointer;
  }

  .create-account-checkbox-row input {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
    margin-top: 3px;
    accent-color: #3da5ff;
    cursor: pointer;
  }

  .create-account-checkbox-row input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .create-account-session-check,
  .create-account-security-note,
  .create-account-error {
    margin-top: 18px;
    padding: 15px;
    border-radius: 15px;
    font-size: 13px;
    line-height: 1.6;
  }

  .create-account-session-check,
  .create-account-security-note {
    border: 1px solid rgba(61,165,255,0.26);
    background: rgba(61,165,255,0.1);
    color: #a9dfff;
  }

  .create-account-session-check {
    margin-top: 0;
    margin-bottom: 18px;
  }

  .create-account-error {
    border: 1px solid rgba(255,95,95,0.4);
    background: rgba(255,70,70,0.1);
    color: #ffd0d0;
  }

  .create-account-full-button {
    width: 100%;
    margin-top: 22px;
  }

  .create-account-full-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .create-account-helper-text {
    margin-top: 14px;
    color: #aaaaaa;
    font-size: 13px;
    line-height: 1.6;
    text-align: center;
  }

  .create-account-bottom-text {
    margin-top: 22px;
    color: #aaaaaa;
    text-align: center;
  }

  .create-account-bottom-text button {
    border: 0;
    background: transparent;
    color: #9ed8ff;
    font: inherit;
    font-weight: 900;
    cursor: pointer;
  }

  .create-account-benefit-stack {
    display: grid;
    gap: 14px;
  }

  .create-account-benefit-box {
    display: grid;
    gap: 6px;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(255,255,255,0.045);
    color: #c8c8c8;
    line-height: 1.55;
  }

  .create-account-benefit-box strong {
    color: #ffffff;
  }

  .create-account-benefit-box span {
    color: #a9b1b8;
    font-size: 13px;
  }

  .create-account-notice-box {
    margin-top: 22px;
    padding: 16px;
    border: 1px solid rgba(255,190,80,0.28);
    border-radius: 16px;
    background: rgba(255,170,50,0.08);
    color: #e4d3ad;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.65;
  }

  @media (max-width: 900px) {
    .create-account-page {
      padding: 65px 24px;
    }

    .create-account-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .create-account-side-panel {
      position: static;
    }
  }

  @media (max-width: 680px) {
    .create-account-page {
      padding: 44px 12px;
    }

    .create-account-hero,
    .create-account-disabled,
    .create-account-form-panel,
    .create-account-side-panel {
      padding: 20px;
      border-radius: 22px;
    }

    .create-account-form-grid,
    .create-account-password-rules {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .create-account-full-field {
      grid-column: auto;
    }

    .create-account-agreement-panel {
      padding: 18px;
    }

    .create-account-hero > p:not(.eyebrow),
    .create-account-disabled > p:not(.eyebrow) {
      font-size: 16px;
    }

    .create-account-hero-notice {
      border-radius: 16px;
    }
  }

  @media (max-width: 420px) {
    .create-account-page {
      padding: 34px 8px;
    }

    .create-account-hero,
    .create-account-disabled,
    .create-account-form-panel,
    .create-account-side-panel {
      padding: 15px;
    }

    .create-account-agreement-panel,
    .create-account-agreement-info {
      padding: 14px;
    }

    .create-account-button-row,
    .create-account-button-row button {
      width: 100%;
    }
  }
`;

export default CreateAccount;
import {
  useEffect,
  useState,
} from "react";

const storageKey =
  "304-site-settings";

const customerAccountSessionKey =
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

    if (!savedSettings) {
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

function saveAccountSummary(
  account
) {
  try {
    window.sessionStorage.setItem(
      customerAccountSessionKey,
      JSON.stringify(
        account
      )
    );
  } catch {
    // The secure cookie remains the authentication source.
  }
}

async function readApiResponse(
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
        "The account could not be accessed."
    );
  }

  return result;
}

function normalizeEmail(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

function Login({
  onNavigate = () => {},
  onLogin = () => {},
}) {
  const [
    settings,
    setSettings,
  ] =
    useState(
      loadSettings
    );

  const [
    formData,
    setFormData,
  ] =
    useState({
      email:
        "",

      password:
        "",
    });

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(
      false
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false
    );

  const [
    loginError,
    setLoginError,
  ] =
    useState(
      ""
    );

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

  function handleChange(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target;

    setLoginError(
      ""
    );

    setFormData(
      (
        currentData
      ) => ({
        ...currentData,

        [name]:
          name ===
          "email"
            ? value.slice(
                0,
                254
              )
            : value.slice(
                0,
                128
              ),
      })
    );
  }

  async function handleLogin(
    event
  ) {
    event.preventDefault();

    if (
      isSubmitting
    ) {
      return;
    }

    const email =
      normalizeEmail(
        formData.email
      );

    const password =
      String(
        formData.password ||
        ""
      );

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      setLoginError(
        "Enter a valid email address."
      );

      return;
    }

    if (!password) {
      setLoginError(
        "Enter your password."
      );

      return;
    }

    setIsSubmitting(
      true
    );

    setLoginError(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/auth/login",
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

            cache:
              "no-store",

            body:
              JSON.stringify({
                email,
                password,
              }),
          }
        );

      const result =
        await readApiResponse(
          response
        );

      if (
        !result.authenticated ||
        !result.account
      ) {
        throw new Error(
          "The account could not be authenticated."
        );
      }

      const account = {
        ...result.account,

        mustChangePassword:
          Boolean(
            result
              .requiresPasswordChange ||
              result.account
                .mustChangePassword
          ),
      };

      saveAccountSummary(
        account
      );

      onLogin(
        account
      );

      onNavigate(
        account.mustChangePassword
          ? "changePassword"
          : "dashboard",
        {
          replace:
            true,
        }
      );
    } catch (
      error
    ) {
      setLoginError(
        error?.message ||
          "The account could not be accessed."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  const canSubmit =
    Boolean(
      normalizeEmail(
        formData.email
      )
    ) &&
    Boolean(
      formData.password
    ) &&
    !isSubmitting;

  return (
    <>
      <style>
        {loginCss}
      </style>

      <main className="login-page">
        <section className="login-inner">
          <header className="login-hero">
            <p className="eyebrow">
              ACCOUNT ACCESS
            </p>

            <h1>
              Login To 304
            </h1>

            <p>
              Access available pricing, cart features,
              checkout, order history, the Research Hub,
              and eligible Partner Program tools.
            </p>

            <div className="login-research-notice">
              For Research Use Only. Not intended for
              human consumption.
            </div>
          </header>

          <div className="login-grid">
            <form
              className="login-form-panel"
              onSubmit={
                handleLogin
              }
              noValidate
            >
              <p className="eyebrow">
                SECURE LOGIN
              </p>

              <h2>
                Research Account
              </h2>

              <label className="login-field">
                <span>
                  Email Address
                </span>

                <input
                  name="email"
                  type="email"
                  value={
                    formData.email
                  }
                  placeholder="Email Address"
                  autoComplete="email"
                  inputMode="email"
                  disabled={
                    isSubmitting
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>

              <label className="login-field">
                <span>
                  Password
                </span>

                <input
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    formData.password
                  }
                  placeholder="Password"
                  autoComplete="current-password"
                  maxLength="128"
                  disabled={
                    isSubmitting
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>

              <label className="login-show-password">
                <input
                  type="checkbox"
                  checked={
                    showPassword
                  }
                  disabled={
                    isSubmitting
                  }
                  onChange={(
                    event
                  ) =>
                    setShowPassword(
                      event.target
                        .checked
                    )
                  }
                />

                <span>
                  Show password
                </span>
              </label>

              <div className="login-secure-notice">
                <strong>
                  Secure Account Login
                </strong>

                <p>
                  Authentication uses a protected,
                  HTTP-only session cookie. Your password
                  is not stored in this browser.
                </p>
              </div>

              {loginError && (
                <div
                  className="login-error"
                  role="alert"
                  aria-live="assertive"
                >
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="primary-btn login-full-button"
                disabled={
                  !canSubmit
                }
              >
                {isSubmitting
                  ? "Logging In..."
                  : "Login"}
              </button>

              {settings.accountCreationEnabled ? (
                <button
                  type="button"
                  className="secondary-btn login-full-button login-secondary-button"
                  disabled={
                    isSubmitting
                  }
                  onClick={() =>
                    onNavigate(
                      "createAccount"
                    )
                  }
                >
                  Create Account
                </button>
              ) : (
                <div className="login-registration-disabled">
                  New account registration is currently
                  disabled. Existing research customers may
                  continue to log in.
                </div>
              )}

              <div className="login-recovery">
                <strong>
                  Forgotten Password?
                </strong>

                <p>
                  Automated email recovery is not enabled.
                  Contact support so an administrator can
                  issue a temporary password.
                </p>

                <button
                  type="button"
                  className="login-text-button"
                  disabled={
                    isSubmitting
                  }
                  onClick={() =>
                    onNavigate(
                      "contact"
                    )
                  }
                >
                  Contact Support
                </button>
              </div>
            </form>

            <aside className="login-side-panel">
              <p className="eyebrow">
                ACCOUNT BENEFITS
              </p>

              <h2>
                What Login Unlocks
              </h2>

              <div className="login-benefit-stack">
                <BenefitBox
                  title="Product Pricing"
                  description="View available account-only pricing after login."
                />

                <BenefitBox
                  title="Cart And Checkout"
                  description="Add available research products to the cart and submit order requests."
                />

                <BenefitBox
                  title="Research Hub"
                  description="Review secure account-linked order history and status updates."
                />

                <BenefitBox
                  title="Account Security"
                  description="Change your password and invalidate older customer sessions."
                />
              </div>

              <div className="login-agreement-box">
                <strong>
                  Research-Use Reminder
                </strong>

                <p>
                  Products are for research use only and are
                  not intended for human consumption.
                </p>

                <button
                  type="button"
                  className="secondary-btn login-full-button"
                  onClick={() =>
                    onNavigate(
                      "researchAgreement"
                    )
                  }
                >
                  View Research Agreement
                </button>
              </div>

              <div className="login-temporary-password-note">
                <strong>
                  Using A Temporary Password?
                </strong>

                <p>
                  After login, you will be sent directly to
                  Change Password. Account orders and
                  checkout stay locked until a permanent
                  password is created.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}

function BenefitBox({
  title,
  description,
}) {
  return (
    <div className="login-benefit-box">
      <strong>
        {title}
      </strong>

      <span>
        {description}
      </span>
    </div>
  );
}

const loginCss = `
  .login-page,
  .login-page *,
  .login-page *::before,
  .login-page *::after {
    box-sizing: border-box;
  }

  .login-page {
    width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .login-inner {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
  }

  .login-hero {
    margin-bottom: 30px;
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
    box-shadow:
      0 30px 80px rgba(0,0,0,0.45);
    text-align: center;
  }

  .login-hero h1 {
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

  .login-hero > p:not(.eyebrow) {
    max-width: 780px;
    margin: 0 auto;
    color: #c8c8c8;
    font-size: 19px;
    line-height: 1.8;
  }

  .login-research-notice {
    display: inline-flex;
    margin-top: 26px;
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

  .login-grid {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(320px, 360px);
    gap: 30px;
    align-items: start;
  }

  .login-form-panel,
  .login-side-panel {
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
    box-shadow:
      0 30px 80px rgba(0,0,0,0.45);
  }

  .login-side-panel {
    position: sticky;
    top: 110px;
    padding: 32px;
  }

  .login-form-panel h2,
  .login-side-panel h2 {
    margin-bottom: 24px;
    font-size: clamp(30px, 4vw, 36px);
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

  .login-field {
    display: grid;
    gap: 8px;
    margin-bottom: 16px;
  }

  .login-field > span {
    color: #c8c8c8;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .login-field input {
    width: 100%;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    outline: none;
    background: rgba(255,255,255,0.055);
    color: #ffffff;
    font: inherit;
  }

  .login-field input:focus {
    border-color: rgba(61,165,255,0.65);
    box-shadow:
      0 0 0 3px rgba(61,165,255,0.12);
  }

  .login-field input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .login-show-password {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 4px 0 18px;
    color: #bfc7cd;
    cursor: pointer;
  }

  .login-show-password input {
    width: 18px;
    height: 18px;
    accent-color: #3da5ff;
  }

  .login-secure-notice,
  .login-recovery,
  .login-agreement-box,
  .login-temporary-password-note {
    padding: 16px;
    border-radius: 16px;
    line-height: 1.65;
  }

  .login-secure-notice {
    border: 1px solid rgba(61,165,255,0.28);
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
  }

  .login-secure-notice strong,
  .login-agreement-box strong,
  .login-temporary-password-note strong,
  .login-recovery strong {
    color: #ffffff;
  }

  .login-secure-notice p,
  .login-agreement-box p,
  .login-temporary-password-note p,
  .login-recovery p {
    margin-top: 6px;
  }

  .login-secure-notice p {
    color: #add9f2;
  }

  .login-error {
    margin-top: 16px;
    padding: 15px;
    border: 1px solid rgba(255,95,95,0.42);
    border-radius: 14px;
    background: rgba(255,70,70,0.11);
    color: #ffd1d1;
    font-size: 14px;
    line-height: 1.6;
  }

  .login-full-button {
    width: 100%;
    margin-top: 20px;
  }

  .login-secondary-button {
    margin-top: 14px;
  }

  .login-full-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .login-registration-disabled {
    margin-top: 14px;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(0,0,0,0.24);
    color: #aeb7bf;
    font-size: 14px;
    line-height: 1.65;
    text-align: center;
  }

  .login-recovery {
    margin-top: 18px;
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(0,0,0,0.18);
    color: #aeb8c1;
    font-size: 13px;
  }

  .login-text-button {
    margin-top: 10px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #9ed8ff;
    font: inherit;
    font-weight: 900;
    cursor: pointer;
  }

  .login-benefit-stack {
    display: grid;
    gap: 14px;
  }

  .login-benefit-box {
    display: grid;
    gap: 6px;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(255,255,255,0.045);
    color: #c8c8c8;
    line-height: 1.55;
  }

  .login-benefit-box strong {
    color: #ffffff;
  }

  .login-benefit-box span {
    color: #a5afb7;
    font-size: 13px;
  }

  .login-agreement-box {
    margin-top: 22px;
    border: 1px solid rgba(61,165,255,0.28);
    background: rgba(61,165,255,0.12);
    color: #c8eaff;
  }

  .login-temporary-password-note {
    margin-top: 16px;
    border: 1px solid rgba(255,190,80,0.28);
    background: rgba(255,170,50,0.08);
    color: #e8d4ac;
    font-size: 13px;
  }

  @media (max-width: 900px) {
    .login-page {
      padding: 65px 24px;
    }

    .login-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .login-side-panel {
      position: static;
    }
  }

  @media (max-width: 620px) {
    .login-page {
      padding: 44px 12px;
    }

    .login-hero,
    .login-form-panel,
    .login-side-panel {
      padding: 21px 18px;
      border-radius: 22px;
    }

    .login-research-notice {
      border-radius: 16px;
    }
  }

  @media (max-width: 430px) {
    .login-page {
      padding: 34px 8px;
    }

    .login-hero,
    .login-form-panel,
    .login-side-panel {
      padding: 15px;
    }
  }
`;

export default Login;
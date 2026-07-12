import {
  useEffect,
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
    // The secure login cookie
    // remains the source of truth.
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
        "The login request could not be completed."
    );
  }

  return result;
}

function Login({
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
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
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
        // A missing or expired session
        // is normal on the login page.
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

  async function handleLogin(
    event
  ) {
    event.preventDefault();

    const cleanedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanedEmail
    ) {
      setErrorMessage(
        "Enter your email address."
      );

      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanedEmail
      )
    ) {
      setErrorMessage(
        "Enter a valid email address."
      );

      return;
    }

    if (
      !password
    ) {
      setErrorMessage(
        "Enter your password."
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

            body:
              JSON.stringify({
                email:
                  cleanedEmail,

                password,
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
          "The login session could not be created."
        );
      }

      saveCustomerAccount(
        result.account
      );

      setPassword(
        ""
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
          "The login request could not be completed."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  return (
    <>
      <style>
        {
          loginCss
        }
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
              Access available
              pricing, cart and
              checkout tools,
              secure order
              history, the
              Research Hub, and
              eligible Partner
              Program features.
            </p>

            <div className="login-research-notice">
              For Research Use
              Only. Not intended
              for human
              consumption.
            </div>
          </header>

          <div className="login-grid">
            <form
              className="login-form-panel"
              onSubmit={
                handleLogin
              }
            >
              <p className="eyebrow">
                CUSTOMER LOGIN
              </p>

              <h2>
                Research Account
              </h2>

              {isCheckingSession && (
                <div className="login-session-check">
                  Checking for an
                  existing secure
                  session...
                </div>
              )}

              <label className="login-field">
                <span>
                  Email Address
                </span>

                <input
                  type="email"
                  value={
                    email
                  }
                  placeholder="Email Address"
                  autoComplete="email"
                  inputMode="email"
                  maxLength="254"
                  disabled={
                    isSubmitting ||
                    isCheckingSession
                  }
                  onChange={(
                    event
                  ) => {
                    setEmail(
                      event.target
                        .value
                    );

                    setErrorMessage(
                      ""
                    );
                  }}
                />
              </label>

              <label className="login-field">
                <span>
                  Password
                </span>

                <div className="login-password-field">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      password
                    }
                    placeholder="Password"
                    autoComplete="current-password"
                    maxLength="128"
                    disabled={
                      isSubmitting ||
                      isCheckingSession
                    }
                    onChange={(
                      event
                    ) => {
                      setPassword(
                        event.target
                          .value
                      );

                      setErrorMessage(
                        ""
                      );
                    }}
                  />

                  <button
                    type="button"
                    disabled={
                      isSubmitting
                    }
                    onClick={() =>
                      setShowPassword(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>
              </label>

              {errorMessage && (
                <div
                  className="login-error"
                  role="alert"
                >
                  {
                    errorMessage
                  }
                </div>
              )}

              <div className="login-security-note">
                Your password is
                verified securely
                by the account
                service. Login
                sessions use a
                protected,
                HTTP-only cookie
                that is not
                accessible to
                browser scripts.
              </div>

              <button
                type="submit"
                className="primary-btn login-full-button"
                disabled={
                  isSubmitting ||
                  isCheckingSession
                }
              >
                {isSubmitting
                  ? "Logging In..."
                  : isCheckingSession
                  ? "Checking Session..."
                  : "Login"}
              </button>

              {settings.accountCreationEnabled ? (
                <button
                  type="button"
                  className="secondary-btn login-full-button"
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
                  New account
                  registration is
                  currently
                  disabled.
                  Existing
                  research
                  customers may
                  continue to log
                  in.
                </div>
              )}

              <button
                type="button"
                className="login-help-link"
                onClick={() =>
                  onNavigate(
                    "contact"
                  )
                }
              >
                Trouble accessing
                your account?
                Contact support.
              </button>
            </form>

            <aside className="login-side-panel">
              <p className="eyebrow">
                ACCOUNT BENEFITS
              </p>

              <h2>
                What Login
                Unlocks
              </h2>

              <div className="login-benefit-stack">
                <BenefitBox
                  title="Product Pricing"
                  description="View available account-only product pricing."
                />

                <BenefitBox
                  title="Cart And Checkout"
                  description="Add available research products to your cart and submit order requests."
                />

                <BenefitBox
                  title="Secure Research Hub"
                  description="Review account-linked order history across approved devices."
                />

                <BenefitBox
                  title="Partner Program"
                  description="Access eligible research partner features after meeting program requirements."
                />
              </div>

              <div className="login-agreement-box">
                <strong>
                  Research-Use
                  Reminder
                </strong>

                <p>
                  Products are for
                  research use
                  only and are not
                  intended for
                  human
                  consumption.
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
                  View Research
                  Agreement
                </button>
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
    max-width: 100%;
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
    box-shadow: 0 30px 80px rgba(0,0,0,0.45);
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
    box-shadow: 0 30px 80px rgba(0,0,0,0.45);
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
    font-size: 15px;
  }

  .login-field input:focus {
    border-color: rgba(61,165,255,0.62);
    box-shadow: 0 0 0 3px rgba(61,165,255,0.12);
  }

  .login-field input:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .login-password-field {
    position: relative;
  }

  .login-password-field input {
    padding-right: 78px;
  }

  .login-password-field button {
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

  .login-password-field button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .login-session-check,
  .login-security-note,
  .login-error {
    margin-bottom: 16px;
    padding: 15px;
    border-radius: 15px;
    font-size: 13px;
    line-height: 1.6;
  }

  .login-session-check,
  .login-security-note {
    border: 1px solid rgba(61,165,255,0.26);
    background: rgba(61,165,255,0.1);
    color: #a9dfff;
  }

  .login-error {
    border: 1px solid rgba(255,95,95,0.4);
    background: rgba(255,70,70,0.1);
    color: #ffd0d0;
  }

  .login-full-button {
    width: 100%;
    margin-top: 14px;
  }

  .login-form-panel button:disabled {
    opacity: 0.58;
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

  .login-help-link {
    width: 100%;
    margin-top: 18px;
    border: 0;
    background: transparent;
    color: #9ed8ff;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    text-align: center;
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
    color: #a9b1b8;
    font-size: 13px;
  }

  .login-agreement-box {
    margin-top: 22px;
    padding: 16px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 16px;
    background: rgba(61,165,255,0.12);
    color: #c8eaff;
    line-height: 1.7;
  }

  .login-agreement-box p {
    margin-top: 8px;
    color: #b8dcef;
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
      padding: 20px;
      border-radius: 22px;
    }

    .login-hero > p:not(.eyebrow) {
      font-size: 16px;
    }

    .login-research-notice {
      border-radius: 16px;
    }
  }

  @media (max-width: 420px) {
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
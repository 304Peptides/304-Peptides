import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const minimumPasswordLength = 12;
const maximumPasswordLength = 128;

function readApiJson(response) {
  return response
    .text()
    .then((text) => {
      let result;

      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          "The account service returned an invalid response."
        );
      }

      if (!response.ok || !result.success) {
        const error = new Error(
          result.error ||
            "The password request could not be completed."
        );

        error.status = response.status;
        throw error;
      }

      return result;
    });
}

function validatePasswordForm({
  currentPassword,
  newPassword,
  confirmPassword,
}) {
  const errors = {};

  if (!currentPassword) {
    errors.currentPassword =
      "Enter your current password.";
  }

  if (newPassword.length < minimumPasswordLength) {
    errors.newPassword =
      `Your new password must contain at least ${minimumPasswordLength} characters.`;
  } else if (
    newPassword.length > maximumPasswordLength
  ) {
    errors.newPassword =
      `Your new password cannot exceed ${maximumPasswordLength} characters.`;
  }

  if (
    currentPassword &&
    newPassword &&
    currentPassword === newPassword
  ) {
    errors.newPassword =
      "Your new password must be different from your current password.";
  }

  if (!confirmPassword) {
    errors.confirmPassword =
      "Confirm your new password.";
  } else if (
    newPassword !== confirmPassword
  ) {
    errors.confirmPassword =
      "The new passwords do not match.";
  }

  return errors;
}

function ChangePassword({
  account = null,
  onNavigate = () => {},
  onPasswordChanged = () => {},
}) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState({});

  const [showPasswords, setShowPasswords] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const redirectTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(
          redirectTimerRef.current
        );
      }
    };
  }, []);

  const errors = useMemo(
    () => validatePasswordForm(formData),
    [formData]
  );

  const formComplete =
    Object.keys(errors).length === 0;

  const accountEmail =
    account?.email ||
    "Signed-in account";

  function handleChange(event) {
    const { name, value } = event.target;

    setSubmitError("");

    setFormData((currentData) => ({
      ...currentData,

      [name]: value.slice(
        0,
        maximumPasswordLength
      ),
    }));
  }

  function handleBlur(event) {
    setTouched((currentTouched) => ({
      ...currentTouched,

      [event.target.name]: true,
    }));
  }

  function markAllTouched() {
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    markAllTouched();

    if (
      !formComplete ||
      isSubmitting
    ) {
      return;
    }

    setSubmitError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/auth/change-password",
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

          body: JSON.stringify({
            currentPassword:
              formData.currentPassword,

            newPassword:
              formData.newPassword,
          }),
        }
      );

      const result =
        await readApiJson(response);

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setTouched({});

      setSuccessMessage(
        result.message ||
          "Password changed successfully. Log in again with your new password."
      );

      redirectTimerRef.current =
        window.setTimeout(() => {
          onPasswordChanged();
        }, 1600);
    } catch (error) {
      const message =
        error?.message ||
        "The password could not be changed.";

      setSubmitError(message);

      if (
        error?.status === 401 &&
        message ===
          "Customer authentication is required."
      ) {
        redirectTimerRef.current =
          window.setTimeout(() => {
            onPasswordChanged();
          }, 1200);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <style>
        {changePasswordCss}
      </style>

      <main className="change-password-page">
        <section className="change-password-inner">
          <header className="change-password-hero">
            <div className="change-password-pill">
              Secure Account
            </div>

            <p className="eyebrow">
              ACCOUNT SECURITY
            </p>

            <h1>
              Change Password
            </h1>

            <p>
              Update the password for{" "}
              <strong>
                {accountEmail}
              </strong>
              . Your current password is required.
            </p>
          </header>

          <div className="change-password-layout">
            <form
              className="change-password-form"
              onSubmit={handleSubmit}
              noValidate
            >
              <p className="eyebrow">
                PASSWORD UPDATE
              </p>

              <h2>
                Enter Your Passwords
              </h2>

              <PasswordField
                name="currentPassword"
                label="Current Password"
                value={
                  formData.currentPassword
                }
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="current-password"
                showPassword={showPasswords}
                disabled={
                  isSubmitting ||
                  Boolean(successMessage)
                }
                error={
                  touched.currentPassword
                    ? errors.currentPassword
                    : ""
                }
              />

              <PasswordField
                name="newPassword"
                label="New Password"
                value={
                  formData.newPassword
                }
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="new-password"
                showPassword={showPasswords}
                disabled={
                  isSubmitting ||
                  Boolean(successMessage)
                }
                helper={`${minimumPasswordLength}–${maximumPasswordLength} characters. Use a unique password that you do not use elsewhere.`}
                error={
                  touched.newPassword
                    ? errors.newPassword
                    : ""
                }
              />

              <PasswordField
                name="confirmPassword"
                label="Confirm New Password"
                value={
                  formData.confirmPassword
                }
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="new-password"
                showPassword={showPasswords}
                disabled={
                  isSubmitting ||
                  Boolean(successMessage)
                }
                error={
                  touched.confirmPassword
                    ? errors.confirmPassword
                    : ""
                }
              />

              <label className="change-password-show-row">
                <input
                  type="checkbox"
                  checked={
                    showPasswords
                  }
                  disabled={
                    isSubmitting ||
                    Boolean(successMessage)
                  }
                  onChange={(event) =>
                    setShowPasswords(
                      event.target.checked
                    )
                  }
                />

                <span>
                  Show password fields
                </span>
              </label>

              {submitError && (
                <div
                  className="change-password-error"
                  role="alert"
                  aria-live="assertive"
                >
                  <strong>
                    Password not changed
                  </strong>

                  <span>
                    {submitError}
                  </span>
                </div>
              )}

              {successMessage && (
                <div
                  className="change-password-success"
                  aria-live="polite"
                >
                  <strong>
                    Password updated
                  </strong>

                  <span>
                    {successMessage}
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="primary-btn change-password-submit"
                disabled={
                  !formComplete ||
                  isSubmitting ||
                  Boolean(successMessage)
                }
              >
                {isSubmitting
                  ? "Updating Password..."
                  : successMessage
                  ? "Password Updated"
                  : "Change Password"}
              </button>

              <button
                type="button"
                className="secondary-btn change-password-back"
                disabled={isSubmitting}
                onClick={() =>
                  onNavigate(
                    "dashboard"
                  )
                }
              >
                Return To Research Hub
              </button>

              {!formComplete &&
                !isSubmitting &&
                !successMessage && (
                  <p className="change-password-helper">
                    Complete all three password fields
                    before submitting.
                  </p>
                )}
            </form>

            <aside className="change-password-security">
              <p className="eyebrow">
                WHAT HAPPENS NEXT
              </p>

              <h2>
                Session Protection
              </h2>

              <SecurityItem
                number="01"
                title="Current password required"
                text="A password cannot be changed using only an unlocked browser session."
              />

              <SecurityItem
                number="02"
                title="Old sessions invalidated"
                text="Every existing customer session is rejected after the password changes."
              />

              <SecurityItem
                number="03"
                title="Login required again"
                text="You will be returned to the login page and must use the new password."
              />

              <div className="change-password-notice">
                <strong>
                  No email recovery is enabled
                </strong>

                <p>
                  Store the new password safely. A
                  forgotten password requires manual
                  support because outbound account email
                  is not enabled.
                </p>

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
            </aside>
          </div>

          <div className="change-password-research-notice">
            For Research Use Only. Products are not
            intended for human consumption.
          </div>
        </section>
      </main>
    </>
  );
}

function PasswordField({
  name,
  label,
  value,
  onChange,
  onBlur,
  autoComplete,
  showPassword,
  disabled,
  helper = "",
  error = "",
}) {
  const describedBy =
    error
      ? `${name}-error`
      : helper
      ? `${name}-helper`
      : undefined;

  return (
    <label className="change-password-field">
      <span>
        {label}
      </span>

      <input
        name={name}
        type={
          showPassword
            ? "text"
            : "password"
        }
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={
          autoComplete
        }
        disabled={disabled}
        maxLength={
          maximumPasswordLength
        }
        aria-invalid={
          Boolean(error)
        }
        aria-describedby={
          describedBy
        }
      />

      {error ? (
        <small
          id={`${name}-error`}
          className="change-password-field-error"
        >
          {error}
        </small>
      ) : helper ? (
        <small
          id={`${name}-helper`}
          className="change-password-field-helper"
        >
          {helper}
        </small>
      ) : null}
    </label>
  );
}

function SecurityItem({
  number,
  title,
  text,
}) {
  return (
    <div className="change-password-security-item">
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

const changePasswordCss = `
  .change-password-page,
  .change-password-page *,
  .change-password-page *::before,
  .change-password-page *::after {
    box-sizing: border-box;
  }

  .change-password-page {
    width: 100%;
    max-width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .change-password-inner {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
  }

  .change-password-hero {
    position: relative;
    margin-bottom: 30px;
    padding: 58px 50px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 32px;
    background:
      radial-gradient(
        circle at top,
        rgba(61,165,255,0.2),
        transparent 43%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 90px rgba(0,0,0,0.48);
    text-align: center;
  }

  .change-password-pill {
    position: absolute;
    top: 22px;
    right: 24px;
    padding: 8px 12px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 999px;
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .change-password-hero h1 {
    margin-bottom: 18px;
    font-size: clamp(43px, 7vw, 62px);
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

  .change-password-hero > p:not(.eyebrow) {
    max-width: 720px;
    margin: 0 auto;
    color: #c8c8c8;
    font-size: 18px;
    line-height: 1.75;
  }

  .change-password-hero > p strong {
    color: #bfe7ff;
    overflow-wrap: anywhere;
  }

  .change-password-layout {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(300px, 390px);
    gap: 30px;
    align-items: start;
  }

  .change-password-form,
  .change-password-security {
    min-width: 0;
    padding: 38px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.14),
        transparent 36%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 80px rgba(0,0,0,0.43);
  }

  .change-password-security {
    position: sticky;
    top: 110px;
    padding: 30px;
  }

  .change-password-form h2,
  .change-password-security h2 {
    margin-bottom: 24px;
    font-size: clamp(29px, 4vw, 38px);
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

  .change-password-field {
    display: grid;
    gap: 8px;
    margin-bottom: 18px;
  }

  .change-password-field > span {
    color: #c8c8c8;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .change-password-field input {
    width: 100%;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    outline: none;
    background: rgba(255,255,255,0.055);
    color: #ffffff;
    font: inherit;
  }

  .change-password-field input:focus {
    border-color: rgba(61,165,255,0.65);
    box-shadow:
      0 0 0 3px rgba(61,165,255,0.12);
  }

  .change-password-field input[aria-invalid="true"] {
    border-color: rgba(255,95,95,0.6);
  }

  .change-password-field input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .change-password-field small {
    font-size: 12px;
    line-height: 1.45;
  }

  .change-password-field-error {
    color: #ffd1d1;
  }

  .change-password-field-helper {
    color: #8f9ba6;
  }

  .change-password-show-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 2px 0 20px;
    color: #bfc6cc;
    cursor: pointer;
  }

  .change-password-show-row input {
    width: 19px;
    height: 19px;
    accent-color: #3da5ff;
  }

  .change-password-error,
  .change-password-success {
    display: grid;
    gap: 5px;
    margin-bottom: 17px;
    padding: 15px;
    border-radius: 15px;
    line-height: 1.55;
  }

  .change-password-error {
    border: 1px solid rgba(255,95,95,0.4);
    background: rgba(255,70,70,0.1);
    color: #ffd0d0;
  }

  .change-password-success {
    border: 1px solid rgba(61,165,255,0.4);
    background: rgba(61,165,255,0.11);
    color: #c4eaff;
  }

  .change-password-submit,
  .change-password-back {
    width: 100%;
  }

  .change-password-back {
    margin-top: 13px;
  }

  .change-password-submit:disabled,
  .change-password-back:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .change-password-helper {
    margin-top: 13px;
    color: #8f9ba6;
    font-size: 12px;
    line-height: 1.55;
    text-align: center;
  }

  .change-password-security-item {
    display: grid;
    grid-template-columns:
      44px minmax(0, 1fr);
    gap: 13px;
    margin-bottom: 14px;
    padding: 15px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    background: rgba(0,0,0,0.17);
  }

  .change-password-security-item > span {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(61,165,255,0.3);
    border-radius: 12px;
    background: rgba(61,165,255,0.11);
    color: #9ed8ff;
    font-size: 11px;
    font-weight: 900;
  }

  .change-password-security-item > div {
    min-width: 0;
  }

  .change-password-security-item strong {
    color: #ffffff;
  }

  .change-password-security-item p {
    margin-top: 5px;
    color: #9ca7b0;
    font-size: 13px;
    line-height: 1.55;
  }

  .change-password-notice {
    margin-top: 20px;
    padding: 17px;
    border: 1px solid rgba(61,165,255,0.25);
    border-radius: 17px;
    background: rgba(61,165,255,0.09);
    color: #c2e7fb;
  }

  .change-password-notice > strong {
    color: #ffffff;
  }

  .change-password-notice p {
    margin-top: 7px;
    color: #aacfe2;
    font-size: 13px;
    line-height: 1.6;
  }

  .change-password-notice button {
    width: 100%;
    margin-top: 14px;
  }

  .change-password-research-notice {
    margin-top: 30px;
    padding: 20px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 20px;
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
    font-weight: 900;
    line-height: 1.6;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  @media (max-width: 900px) {
    .change-password-page {
      padding: 65px 24px;
    }

    .change-password-layout {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .change-password-security {
      position: static;
    }
  }

  @media (max-width: 640px) {
    .change-password-page {
      padding: 44px 12px;
    }

    .change-password-hero,
    .change-password-form,
    .change-password-security {
      padding: 21px 18px;
      border-radius: 22px;
    }

    .change-password-pill {
      position: static;
      width: fit-content;
      margin: 0 auto 20px;
    }
  }

  @media (max-width: 430px) {
    .change-password-page {
      padding: 34px 8px;
    }

    .change-password-hero,
    .change-password-form,
    .change-password-security {
      padding: 15px;
    }
  }
`;

export default ChangePassword;
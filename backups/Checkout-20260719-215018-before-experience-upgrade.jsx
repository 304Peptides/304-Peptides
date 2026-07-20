import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import zelleLogo from "../assets/images/payments/zelle.png";
import venmoLogo from "../assets/images/payments/venmo.png";
import cashAppLogo from "../assets/images/payments/cashapp.png";

import {
  calculateShippingFee,
  getFreeShippingRemaining,
} from "../utils/shipping";

const storageKey = "304-site-settings";
const customerAccountSessionKey = "304-customer-account";
const couponStorageKey = "304-coupon-code";
const turnstileSiteKey = "0x4AAAAAAD0F6auvBsjzeYVA";
const turnstileScriptId = "cloudflare-turnstile-script";

let turnstileScriptPromise = null;

const defaultSettings = {
  storeStatus: "coming-soon",
  catalogEnabled: true,
};

const paymentOptions = [
  { id: "zelle", label: "Zelle", logo: zelleLogo },
  { id: "venmo", label: "Venmo", logo: venmoLogo },
  { id: "cash-app", label: "Cash App", logo: cashAppLogo },
];

const stateOptions = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
  ["DC", "District of Columbia"],
];

function loadSettings() {
  try {
    const savedSettings = window.localStorage.getItem(storageKey);

    if (!savedSettings) {
      return defaultSettings;
    }

    return {
      ...defaultSettings,
      ...JSON.parse(savedSettings),
    };
  } catch {
    return defaultSettings;
  }
}

function loadCachedAccount() {
  try {
    const savedAccount = window.sessionStorage.getItem(
      customerAccountSessionKey
    );

    if (!savedAccount) {
      return null;
    }

    const account = JSON.parse(savedAccount);

    return account && typeof account === "object"
      ? account
      : null;
  } catch {
    return null;
  }
}

function saveCachedAccount(account) {
  try {
    window.sessionStorage.setItem(
      customerAccountSessionKey,
      JSON.stringify(account)
    );
  } catch {
    // The HTTP-only cookie remains the authentication source.
  }
}

function clearCachedAccount() {
  try {
    window.sessionStorage.removeItem(customerAccountSessionKey);
  } catch {
    // Session storage may be unavailable.
  }
}

async function readApiJson(response, fallbackMessage) {
  const responseText = await response.text();
  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      fallbackMessage ||
        "The service returned an invalid response."
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error ||
        fallbackMessage ||
        "The request could not be completed."
    );
  }

  return result;
}

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const finishLoading = () => {
      let attempts = 0;

      const checkReady = () => {
        if (window.turnstile) {
          resolve(window.turnstile);
          return;
        }

        attempts += 1;

        if (attempts >= 100) {
          turnstileScriptPromise = null;
          reject(
            new Error(
              "Cloudflare Turnstile did not become ready."
            )
          );
          return;
        }

        window.setTimeout(checkReady, 50);
      };

      checkReady();
    };

    const existingScript = document.getElementById(
      turnstileScriptId
    );

    if (existingScript) {
      existingScript.addEventListener("load", finishLoading, {
        once: true,
      });

      existingScript.addEventListener(
        "error",
        () => {
          turnstileScriptPromise = null;
          reject(
            new Error(
              "Cloudflare Turnstile could not be loaded."
            )
          );
        },
        { once: true }
      );

      finishLoading();
      return;
    }

    const script = document.createElement("script");
    script.id = turnstileScriptId;
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = finishLoading;
    script.onerror = () => {
      turnstileScriptPromise = null;
      reject(
        new Error(
          "Cloudflare Turnstile could not be loaded."
        )
      );
    };

    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

function validateCheckoutForm(formData) {
  const errors = {};
  const email = formData.email.trim();
  const zip = formData.zip.trim();

  if (formData.firstName.trim().length < 2) {
    errors.firstName = "Enter a valid first name.";
  }

  if (formData.lastName.trim().length < 2) {
    errors.lastName = "Enter a valid last name.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (formData.address.trim().length < 5) {
    errors.address = "Enter a complete shipping address.";
  }

  if (formData.city.trim().length < 2) {
    errors.city = "Enter a valid city.";
  }

  if (
    !stateOptions.some(
      ([code]) => code === formData.state
    )
  ) {
    errors.state = "Select a state.";
  }

  if (!/^\d{5}(-\d{4})?$/.test(zip)) {
    errors.zip =
      "Enter a 5-digit ZIP code or ZIP+4.";
  }

  return errors;
}

function formatPrice(value) {
  const price = Number(value);

  return Number.isFinite(price)
    ? price.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })
    : "Unavailable";
}

function normalizeReferralCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 20);
}

function getReferralCodeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);

    return normalizeReferralCode(
      params.get("ref") ||
        params.get("referral") ||
        params.get("code") ||
        ""
    );
  } catch {
    return "";
  }
}

function getReferralCodeError(code) {
  if (!code) {
    return "";
  }

  if (code.length < 4 || code.length > 20) {
    return "Referral codes must contain 4â€“20 characters.";
  }

  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)) {
    return "Use letters, numbers, and single hyphens only.";
  }

  if (!/[A-Z]/.test(code)) {
    return "Referral codes must contain at least one letter.";
  }

  return "";
}

function TurnstileWidget({
  siteKey,
  resetKey,
  disabled = false,
  onTokenChange,
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    onTokenChange("");

    loadTurnstileScript()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        containerRef.current.innerHTML = "";

        widgetIdRef.current = turnstile.render(
          containerRef.current,
          {
            sitekey: siteKey,
            theme: "dark",
            size: "flexible",
            appearance: "always",
            action: "checkout_order",

            callback: (token) => {
              if (cancelled) {
                return;
              }

              setStatus("verified");
              onTokenChange(token);
            },

            "expired-callback": () => {
              if (cancelled) {
                return;
              }

              setStatus("expired");
              onTokenChange("");
            },

            "timeout-callback": () => {
              if (cancelled) {
                return;
              }

              setStatus("expired");
              onTokenChange("");
            },

            "error-callback": () => {
              if (cancelled) {
                return;
              }

              setStatus("error");
              onTokenChange("");
            },
          }
        );

        setStatus("ready");
      })
      .catch((error) => {
        console.error("Turnstile loading error:", error);

        if (!cancelled) {
          setStatus("error");
          onTokenChange("");
        }
      });

    return () => {
      cancelled = true;

      if (
        widgetIdRef.current !== null &&
        window.turnstile
      ) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget may already have been removed.
        }
      }

      widgetIdRef.current = null;
    };
  }, [siteKey, resetKey, onTokenChange]);

  const statusMessage =
    status === "verified"
      ? "Security verification complete."
      : status === "expired"
      ? "Verification expired. Complete it again."
      : status === "error"
      ? "Security verification could not load. Refresh the page and try again."
      : "Security verification is loading.";

  return (
    <div
      className={
        disabled
          ? "checkout-turnstile checkout-turnstile-disabled"
          : "checkout-turnstile"
      }
    >
      <div
        ref={containerRef}
        className="checkout-turnstile-container"
      />

      <p
        className={
          status === "verified"
            ? "checkout-turnstile-status checkout-turnstile-verified"
            : status === "error" || status === "expired"
            ? "checkout-turnstile-status checkout-turnstile-warning"
            : "checkout-turnstile-status"
        }
        aria-live="polite"
      >
        {statusMessage}
      </p>
    </div>
  );
}

function Checkout({
  cartItems = [],
  onNavigate = () => {},
  onPlaceOrder = () => {},
}) {
  const initialCachedAccount = useMemo(
    loadCachedAccount,
    []
  );

  const [settings, setSettings] = useState(loadSettings);
  const [account, setAccount] = useState(
    initialCachedAccount
  );
  const [accountStatus, setAccountStatus] =
    useState("checking");
  const [accountError, setAccountError] = useState("");

  const [formData, setFormData] = useState({
    firstName: initialCachedAccount?.firstName || "",
    lastName: initialCachedAccount?.lastName || "",
    email: String(initialCachedAccount?.email || "")
      .trim()
      .toLowerCase(),
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  const [touched, setTouched] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("");
  const [researchAgreement, setResearchAgreement] =
    useState(false);
  const [ageAgreement, setAgeAgreement] =
    useState(false);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [submitError, setSubmitError] = useState("");
  const [turnstileToken, setTurnstileToken] =
    useState("");
  const [turnstileResetKey, setTurnstileResetKey] =
    useState(0);
  const [referralCode, setReferralCode] = useState(
    getReferralCodeFromUrl
  );
  const [validatedReferralCode, setValidatedReferralCode] =
    useState("");
  const [referralStatus, setReferralStatus] = useState(
    referralCode ? "unverified" : "idle"
  );
  const [referralMessage, setReferralMessage] = useState(
    referralCode
      ? "Apply this referral code before submitting the order."
      : ""
  );
  const [isValidatingReferral, setIsValidatingReferral] =
    useState(false);
  const [couponCode, setCouponCode] = useState(() => {
    try {
      return String(window.localStorage.getItem(couponStorageKey) || "")
        .trim()
        .toUpperCase();
    } catch {
      return "";
    }
  });
  const [validatedCouponCode, setValidatedCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [couponStatus, setCouponStatus] = useState(
    couponCode ? "unverified" : "idle"
  );
  const [couponMessage, setCouponMessage] = useState(
    couponCode ? "Apply this coupon before submitting the order." : ""
  );
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const submissionLockRef = useRef(false);

  const handleTurnstileTokenChange = useCallback(
    (token) => {
      setSubmitError("");
      setTurnstileToken(token);
    },
    []
  );

  useEffect(() => {
    function updateSettings(event) {
      if (event.detail) {
        setSettings((currentSettings) => ({
          ...currentSettings,
          ...event.detail,
        }));
        return;
      }

      setSettings(loadSettings());
    }

    function handleStorageChange(event) {
      if (event.key === storageKey) {
        setSettings(loadSettings());
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
    let isMounted = true;

    async function verifySecureAccount() {
      // LOCAL CHECKOUT PREVIEW START
      if (import.meta.env.DEV) {
        const developmentAccount = {
          id: "local-development-account",
          firstName: "Daniel",
          lastName: "Developer",
          email: "developer@304peptides.local",
        };

        setAccount(developmentAccount);

        setFormData((currentData) => ({
          ...currentData,
          firstName:
            currentData.firstName.trim() ||
            developmentAccount.firstName,
          lastName:
            currentData.lastName.trim() ||
            developmentAccount.lastName,
          email: developmentAccount.email,
        }));

        setAccountStatus("verified");
        setAccountError("");
        return;
      }
      // LOCAL CHECKOUT PREVIEW END

      setAccountStatus("checking");
      setAccountError("");

      try {
        const response = await fetch(
          "/api/auth/session",
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            credentials: "same-origin",
            cache: "no-store",
          }
        );

        const result = await readApiJson(
          response,
          "Your secure account could not be verified."
        );

        if (!isMounted) {
          return;
        }

        if (!result.authenticated || !result.account) {
          throw new Error(
            "Your secure session has expired. Log in again before submitting this order."
          );
        }

        const verifiedAccount = result.account;
        const verifiedEmail = String(
          verifiedAccount.email || ""
        )
          .trim()
          .toLowerCase();

        if (!verifiedEmail) {
          throw new Error(
            "The signed-in account does not have a valid email address."
          );
        }

        setAccount(verifiedAccount);
        saveCachedAccount(verifiedAccount);

        setFormData((currentData) => ({
          ...currentData,
          firstName:
            currentData.firstName.trim() ||
            verifiedAccount.firstName ||
            "",
          lastName:
            currentData.lastName.trim() ||
            verifiedAccount.lastName ||
            "",
          email: verifiedEmail,
        }));

        setAccountStatus("verified");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        clearCachedAccount();
        setAccount(null);
        setAccountStatus("error");
        setAccountError(
          error.message ||
            "Your secure account could not be verified."
        );
      }
    }

    verifySecureAccount();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalQuantity = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total + Number(item.quantity || 0),
        0
      ),
    [cartItems]
  );

  const subtotal = useMemo(
    () =>
      cartItems.reduce((total, item) => {
        const price = Number(item.price);
        const quantity = Number(item.quantity || 0);

        return (
          total +
          (Number.isFinite(price) ? price : 0) *
            quantity
        );
      }, 0),
    [cartItems]
  );

  const discount = useMemo(
    () => Math.max(0, Number(couponResult?.discountCents || 0) / 100),
    [couponResult]
  );

  const discountedSubtotal = useMemo(
    () => Math.max(0, subtotal - discount),
    [discount, subtotal]
  );

  const shippingFee = useMemo(
    () =>
      couponResult?.freeShipping
        ? 0
        : calculateShippingFee(discountedSubtotal),
    [couponResult, discountedSubtotal]
  );

  const orderTotal = useMemo(
    () => discountedSubtotal + shippingFee,
    [discountedSubtotal, shippingFee]
  );

  const freeShippingRemaining = useMemo(
    () =>
      couponResult?.freeShipping
        ? 0
        : getFreeShippingRemaining(discountedSubtotal),
    [couponResult, discountedSubtotal]
  );

  const invalidPriceItems = useMemo(
    () =>
      cartItems.filter(
        (item) => !Number.isFinite(Number(item.price))
      ),
    [cartItems]
  );

  const formErrors = useMemo(
    () => validateCheckoutForm(formData),
    [formData]
  );

  const purchasingEnabled =
    settings.storeStatus === "open";

  const checkoutAvailable =
    settings.catalogEnabled &&
    purchasingEnabled &&
    invalidPriceItems.length === 0;

  const selectedPaymentOption = paymentOptions.find(
    (option) => option.id === paymentMethod
  );

  const accountEmail = String(account?.email || "")
    .trim()
    .toLowerCase();

  const accountEmailMatches =
    accountStatus === "verified" &&
    Boolean(accountEmail) &&
    formData.email.trim().toLowerCase() ===
      accountEmail;

  const formComplete =
    Object.keys(formErrors).length === 0;

  const referralReady =
    !referralCode ||
    (referralStatus === "valid" &&
      validatedReferralCode === referralCode);

  const couponReady =
    !couponCode ||
    (couponStatus === "valid" &&
      validatedCouponCode === couponCode);

  const canPlaceOrder =
    cartItems.length > 0 &&
    checkoutAvailable &&
    formComplete &&
    Boolean(paymentMethod) &&
    researchAgreement &&
    ageAgreement &&
    Boolean(turnstileToken) &&
    accountEmailMatches &&
    referralReady &&
    couponReady &&
    !isSubmitting;

  const storeStatusLabel =
    settings.storeStatus === "open"
      ? "Store Open"
      : settings.storeStatus === "maintenance"
      ? "Maintenance Mode"
      : "Coming Soon";

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "email") {
      return;
    }

    let nextValue = value;

    if (name === "zip") {
      nextValue = value
        .replace(/[^\d-]/g, "")
        .slice(0, 10);
    }

    setSubmitError("");
    setFormData((currentData) => ({
      ...currentData,
      [name]: nextValue,
    }));
  }

  function handleBlur(event) {
    setTouched((currentTouched) => ({
      ...currentTouched,
      [event.target.name]: true,
    }));
  }

  function markAllFieldsTouched() {
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      address: true,
      city: true,
      state: true,
      zip: true,
    });
  }

  function handleReferralCodeChange(event) {
    const nextCode = normalizeReferralCode(event.target.value);

    setSubmitError("");
    setReferralCode(nextCode);
    setValidatedReferralCode("");
    setReferralStatus(nextCode ? "unverified" : "idle");
    setReferralMessage(
      nextCode
        ? "Apply this referral code before submitting the order."
        : ""
    );
  }

  function removeReferralCode() {
    setSubmitError("");
    setReferralCode("");
    setValidatedReferralCode("");
    setReferralStatus("idle");
    setReferralMessage("");
  }

  function handleCouponCodeChange(event) {
    const nextCode = String(event.target.value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 50);

    setSubmitError("");
    setCouponCode(nextCode);
    setValidatedCouponCode("");
    setCouponResult(null);
    setCouponStatus(nextCode ? "unverified" : "idle");
    setCouponMessage(
      nextCode ? "Apply this coupon before submitting the order." : ""
    );
  }

  function removeCouponCode() {
    setSubmitError("");
    setCouponCode("");
    setValidatedCouponCode("");
    setCouponResult(null);
    setCouponStatus("idle");
    setCouponMessage("");

    try {
      window.localStorage.removeItem(couponStorageKey);
    } catch {
      // Storage may be unavailable.
    }
  }

  async function validateCouponCode() {
    if (isValidatingCoupon || isSubmitting) {
      return;
    }

    const code = String(couponCode || "").trim().toUpperCase();
    setCouponCode(code);
    setSubmitError("");

    if (!code) {
      removeCouponCode();
      return;
    }

    if (!/^[A-Z0-9][A-Z0-9_-]{2,49}$/.test(code)) {
      setValidatedCouponCode("");
      setCouponResult(null);
      setCouponStatus("invalid");
      setCouponMessage(
        "Coupon codes must contain at least three letters, numbers, dashes, or underscores."
      );
      return;
    }

    setIsValidatingCoupon(true);
    setCouponStatus("checking");
    setCouponMessage("Checking coupon...");

    try {
      const response = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          subtotalCents: Math.round(subtotal * 100),
        }),
      });
      const result = await readApiJson(
        response,
        "The coupon could not be checked."
      );

      setValidatedCouponCode(code);
      setCouponResult({
        ...(result.coupon || {}),
        discountCents: Number(result.discountCents || 0),
        freeShipping: Boolean(result.freeShipping),
      });
      setCouponStatus("valid");
      setCouponMessage(result.message || `${code} applied.`);

      try {
        window.localStorage.setItem(couponStorageKey, code);
      } catch {
        // Storage may be unavailable.
      }
    } catch (error) {
      setValidatedCouponCode("");
      setCouponResult(null);
      setCouponStatus("error");
      setCouponMessage(
        error.message || "The coupon could not be checked."
      );
    } finally {
      setIsValidatingCoupon(false);
    }
  }

  async function validateReferralCode() {
    if (
      accountStatus !== "verified" ||
      !accountEmailMatches ||
      isValidatingReferral ||
      isSubmitting
    ) {
      return;
    }

    const code = normalizeReferralCode(referralCode);
    const localError = getReferralCodeError(code);

    setReferralCode(code);
    setSubmitError("");

    if (!code) {
      removeReferralCode();
      return;
    }

    if (localError) {
      setValidatedReferralCode("");
      setReferralStatus("invalid");
      setReferralMessage(localError);
      return;
    }

    setIsValidatingReferral(true);
    setReferralStatus("checking");
    setReferralMessage("Checking referral code...");

    try {
      const response = await fetch(
        `/api/referral/validate?code=${encodeURIComponent(code)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = await readApiJson(
        response,
        "The referral code could not be checked."
      );

      if (!result.valid) {
        setValidatedReferralCode("");
        setReferralStatus("invalid");
        setReferralMessage(
          result.message || "That referral code is not active."
        );
        return;
      }

      const approvedCode = normalizeReferralCode(
        result.code || code
      );

      setReferralCode(approvedCode);
      setValidatedReferralCode(approvedCode);
      setReferralStatus("valid");
      setReferralMessage(
        result.message ||
          "Referral code applied. The order subtotal is unchanged."
      );
    } catch (error) {
      setValidatedReferralCode("");
      setReferralStatus("error");
      setReferralMessage(
        error.message ||
          "The referral code could not be checked."
      );
    } finally {
      setIsValidatingReferral(false);
    }
  }

  async function handlePlaceOrder(event) {
    event.preventDefault();
    markAllFieldsTouched();

    if (
      accountStatus !== "verified" ||
      !accountEmailMatches
    ) {
      setSubmitError(
        "Your secure account email could not be confirmed. Refresh checkout or log in again."
      );
      return;
    }

    if (!referralReady) {
      setSubmitError(
        "Apply the referral code or remove it before submitting the order."
      );
      return;
    }

    if (!couponReady) {
      setSubmitError(
        "Apply the coupon code or remove it before submitting the order."
      );
      return;
    }

    if (
      !canPlaceOrder ||
      isSubmitting ||
      submissionLockRef.current
    ) {
      return;
    }

    submissionLockRef.current = true;
    setSubmitError("");
    setIsSubmitting(true);

    const orderPayload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: accountEmail,
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state,
      zip: formData.zip.trim(),
      preferredPaymentMethod: paymentMethod,
      preferredPaymentLabel:
        selectedPaymentOption?.label || "",
      ...(validatedReferralCode
        ? {
            referralCode: validatedReferralCode,
          }
        : {}),
      ...(validatedCouponCode
        ? {
            couponCode: validatedCouponCode,
          }
        : {}),
      items: cartItems.map((item) => ({
        name: item.name || "",
        codeName: item.codeName || "",
        strength: item.strength || "",
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
      })),
    };

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      25000
    );

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          order: orderPayload,
          turnstileToken,
        }),
        signal: controller.signal,
      });

      const result = await readApiJson(
        response,
        "The order request could not be submitted."
      );

      const confirmedOrder =
        result.order && typeof result.order === "object"
          ? result.order
          : {};

      const createdAt =
        confirmedOrder.createdAt ||
        result.createdAt ||
        new Date().toISOString();

      try {
        window.localStorage.removeItem(couponStorageKey);
      } catch {
        // Storage may be unavailable.
      }

      onPlaceOrder({
        ...orderPayload,
        ...confirmedOrder,
        id:
          confirmedOrder.orderId ||
          confirmedOrder.id ||
          result.orderId,
        orderId:
          confirmedOrder.orderId ||
          confirmedOrder.id ||
          result.orderId,
        createdAt,
        status:
          confirmedOrder.status ||
          result.status ||
          "Order Request Received",
        totalQuantity:
          Number(confirmedOrder.totalQuantity) ||
          totalQuantity,
        merchandiseSubtotal:
          Number.isFinite(Number(confirmedOrder.merchandiseSubtotal))
            ? Number(confirmedOrder.merchandiseSubtotal)
            : subtotal,
        discount:
          Number.isFinite(Number(confirmedOrder.discount))
            ? Number(confirmedOrder.discount)
            : discount,
        couponCode:
          confirmedOrder.couponCode || validatedCouponCode || "",
        subtotal:
          Number.isFinite(Number(confirmedOrder.subtotal))
            ? Number(confirmedOrder.subtotal)
            : discountedSubtotal,
        shippingFee:
          Number.isFinite(Number(confirmedOrder.shippingFee))
            ? Number(confirmedOrder.shippingFee)
            : shippingFee,
        total:
          Number.isFinite(Number(confirmedOrder.total))
            ? Number(confirmedOrder.total)
            : orderTotal,
        referralCode:
          confirmedOrder.referralCode ||
          validatedReferralCode ||
          "",
        referralTracking:
          result.referralTracking || null,
      });
    } catch (error) {
      console.error(
        "Checkout submission error:",
        error
      );

      setTurnstileToken("");
      setTurnstileResetKey(
        (currentKey) => currentKey + 1
      );

      setSubmitError(
        error?.name === "AbortError"
          ? "The order service took too long to respond. Please try again."
          : error?.message ||
              "The order request could not be submitted. Please try again."
      );
    } finally {
      window.clearTimeout(timeoutId);
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (accountStatus === "checking") {
    return (
      <CheckoutState
        eyebrow="SECURE CHECKOUT"
        title="Confirming Your Account"
        message="Your secure customer session is being verified before checkout loads."
        notice="Account Verification In Progress"
        primaryLabel="Return To Cart"
        onPrimary={() => onNavigate("cart")}
        secondaryLabel="Return Home"
        onSecondary={() => onNavigate("home")}
      />
    );
  }

  if (accountStatus === "error") {
    return (
      <CheckoutState
        eyebrow="SECURE CHECKOUT"
        title="Login Required"
        message={
          accountError ||
          "Your secure customer account could not be verified."
        }
        notice="Your Cart Has Been Preserved"
        primaryLabel="Login Again"
        onPrimary={() => onNavigate("login")}
        secondaryLabel="Return To Cart"
        onSecondary={() => onNavigate("cart")}
      />
    );
  }

  if (!settings.catalogEnabled) {
    return (
      <CheckoutState
        eyebrow="CHECKOUT"
        title="Checkout Temporarily Unavailable"
        message="Checkout is unavailable because the research product catalog is currently disabled."
        notice="For Research Use Only. Not intended for human consumption."
        primaryLabel="Return Home"
        onPrimary={() => onNavigate("home")}
        secondaryLabel="Research Agreement"
        onSecondary={() =>
          onNavigate("researchAgreement")
        }
      />
    );
  }

  if (cartItems.length === 0) {
    return (
      <CheckoutState
        eyebrow="CHECKOUT"
        title="Your Cart Is Empty"
        message="Add research-use products to your cart before continuing to checkout."
        notice={storeStatusLabel}
        primaryLabel="Browse Products"
        onPrimary={() => onNavigate("products")}
        secondaryLabel="Research Agreement"
        onSecondary={() =>
          onNavigate("researchAgreement")
        }
      />
    );
  }

  if (!purchasingEnabled) {
    return (
      <CheckoutState
        eyebrow="CHECKOUT"
        title="Checkout Is Unavailable"
        message={`Your cart has been preserved, but orders cannot be placed while the store status is ${storeStatusLabel}.`}
        notice={storeStatusLabel}
        primaryLabel="Return To Cart"
        onPrimary={() => onNavigate("cart")}
        secondaryLabel="Browse Products"
        onSecondary={() => onNavigate("products")}
      />
    );
  }

  if (invalidPriceItems.length > 0) {
    return (
      <>
        <style>{checkoutCss}</style>

        <main className="checkout-page">
          <section className="checkout-state-panel">
            <p className="eyebrow">CHECKOUT</p>
            <h1>Cart Update Required</h1>

            <p>
              One or more products in your cart no
              longer have valid pricing. Return to the
              cart and remove those products before
              continuing.
            </p>

            <div className="checkout-invalid-list">
              {invalidPriceItems.map((item) => (
                <div
                  key={`${item.codeName}-${item.strength}`}
                >
                  <strong>{item.name}</strong>
                  <span>
                    {item.codeName} Â· {item.strength}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={() => onNavigate("cart")}
            >
              Return To Cart
            </button>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{checkoutCss}</style>

      <main className="checkout-page">
        <section className="checkout-inner">
          <header className="checkout-hero">
            <div className="checkout-hero-status">
              <p className="eyebrow">CHECKOUT</p>
              <span>{storeStatusLabel}</span>
            </div>

            <h1>Order Request Checkout</h1>

            <p>
              Enter your shipping details, select your
              preferred invoice payment method, and
              complete the required confirmations
              before submitting your order request.
            </p>
          </header>

          <form
            className="checkout-layout"
            onSubmit={handlePlaceOrder}
            noValidate
          >
            <section className="checkout-main-panel">
              <p className="eyebrow">
                CUSTOMER INFORMATION
              </p>
              <h2>Shipping Details</h2>

              <div className="checkout-country-note">
                Shipping address must be within the
                United States. Shipping availability
                and the final shipping charge are
                confirmed during order review.
              </div>

              <div className="checkout-account-note">
                <div>
                  <strong>Secure Account Order</strong>
                  <span>
                    This order will be linked to{" "}
                    {accountEmail}.
                  </span>
                </div>

                <span>Account Verified</span>
              </div>

              <div className="checkout-form-grid">
                <InputField
                  name="firstName"
                  label="First Name"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="given-name"
                  disabled={isSubmitting}
                  error={
                    touched.firstName
                      ? formErrors.firstName
                      : ""
                  }
                />

                <InputField
                  name="lastName"
                  label="Last Name"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="family-name"
                  disabled={isSubmitting}
                  error={
                    touched.lastName
                      ? formErrors.lastName
                      : ""
                  }
                />

                <InputField
                  name="email"
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="email"
                  disabled={isSubmitting}
                  readOnly
                  helper="Verified account email. This cannot be changed during checkout."
                  error={
                    touched.email
                      ? formErrors.email
                      : ""
                  }
                  fullWidth
                />

                <InputField
                  name="address"
                  label="Shipping Address"
                  placeholder="Street address"
                  value={formData.address}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="street-address"
                  disabled={isSubmitting}
                  error={
                    touched.address
                      ? formErrors.address
                      : ""
                  }
                  fullWidth
                />

                <InputField
                  name="city"
                  label="City"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="address-level2"
                  disabled={isSubmitting}
                  error={
                    touched.city
                      ? formErrors.city
                      : ""
                  }
                />

                <SelectField
                  name="state"
                  label="State"
                  value={formData.state}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="address-level1"
                  disabled={isSubmitting}
                  error={
                    touched.state
                      ? formErrors.state
                      : ""
                  }
                />

                <InputField
                  name="zip"
                  label="ZIP Code"
                  placeholder="##### or #####-####"
                  value={formData.zip}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  disabled={isSubmitting}
                  error={
                    touched.zip
                      ? formErrors.zip
                      : ""
                  }
                  fullWidth
                />
              </div>

              <section className="checkout-section-card">
                <p className="eyebrow">
                  PAYMENT PREFERENCE
                </p>
                <h2>
                  Choose An Invoice Payment Method
                </h2>

                <p className="checkout-section-copy">
                  This selection records your preference
                  only. No payment is collected on this
                  page. Payment instructions are sent
                  only after the order request has been
                  reviewed.
                </p>

                <div className="checkout-payment-grid">
                  {paymentOptions.map((option) => {
                    const selected =
                      paymentMethod === option.id;

                    return (
                      <label
                        key={option.id}
                        className={
                          selected
                            ? "checkout-payment-option checkout-payment-selected"
                            : "checkout-payment-option"
                        }
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={option.id}
                          checked={selected}
                          disabled={isSubmitting}
                          onChange={(event) => {
                            setSubmitError("");
                            setPaymentMethod(
                              event.target.value
                            );
                          }}
                        />

                        <span className="checkout-payment-check">
                          âœ“
                        </span>

                        <img
                          src={option.logo}
                          alt={`${option.label} logo`}
                        />

                        <strong>{option.label}</strong>
                      </label>
                    );
                  })}
                </div>

                <div className="checkout-invoice-notice">
                  Selecting a payment preference does
                  not guarantee availability. Final
                  payment instructions and the complete
                  invoice amount will be confirmed by
                  email.
                </div>
              </section>

              <section className="checkout-section-card">
                <p className="eyebrow">
                  PARTNER REFERRAL
                </p>
                <h2>Referral Code</h2>

                <p className="checkout-section-copy">
                  Enter an approved partner code to
                  credit the partner for this order. A
                  referral code does not discount or
                  otherwise change your order subtotal.
                </p>

                <div className="checkout-referral-row">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={handleReferralCodeChange}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        validateReferralCode();
                      }
                    }}
                    placeholder="Enter referral code"
                    autoComplete="off"
                    maxLength="20"
                    disabled={
                      isSubmitting ||
                      isValidatingReferral
                    }
                    aria-label="Referral code"
                  />

                  <button
                    type="button"
                    className="secondary-btn checkout-referral-apply"
                    onClick={validateReferralCode}
                    disabled={
                      !referralCode ||
                      isSubmitting ||
                      isValidatingReferral
                    }
                  >
                    {isValidatingReferral
                      ? "Checking..."
                      : referralStatus === "valid"
                      ? "Applied"
                      : "Apply Code"}
                  </button>

                  {referralCode && (
                    <button
                      type="button"
                      className="checkout-referral-remove"
                      onClick={removeReferralCode}
                      disabled={
                        isSubmitting ||
                        isValidatingReferral
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>

                {referralMessage && (
                  <div
                    className={`checkout-referral-message checkout-referral-${referralStatus}`}
                    aria-live="polite"
                  >
                    {referralMessage}
                  </div>
                )}

                <div className="checkout-referral-note">
                  <strong>Partner own-code orders</strong>
                  <span>
                    Partners may use their own code for tier progression. Own-code orders earn no commission, discount, payout credit, leaderboard credit, or reward credit.
                  </span>
                </div>
              </section>

              <section className="checkout-section-card">
                <p className="eyebrow">
                  PROMOTION
                </p>
                <h2>Coupon Code — Optional</h2>

                <p className="checkout-section-copy">
                  Enter a current coupon code. Scheduled codes only work during
                  their active dates and all discounts are verified by the server.
                </p>

                <div className="checkout-referral-row">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={handleCouponCodeChange}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        validateCouponCode();
                      }
                    }}
                    placeholder="Enter coupon code"
                    autoComplete="off"
                    maxLength="50"
                    disabled={isSubmitting || isValidatingCoupon}
                    aria-label="Coupon code"
                  />

                  <button
                    type="button"
                    className="secondary-btn checkout-referral-apply"
                    onClick={validateCouponCode}
                    disabled={!couponCode || isSubmitting || isValidatingCoupon}
                  >
                    {isValidatingCoupon
                      ? "Checking..."
                      : couponStatus === "valid"
                      ? "Applied"
                      : "Apply Coupon"}
                  </button>

                  {couponCode && (
                    <button
                      type="button"
                      className="checkout-referral-remove"
                      onClick={removeCouponCode}
                      disabled={isSubmitting || isValidatingCoupon}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {couponMessage && (
                  <div
                    className={`checkout-referral-message checkout-referral-${couponStatus}`}
                    aria-live="polite"
                  >
                    {couponMessage}
                  </div>
                )}
              </section>

              <section className="checkout-section-card">
                <p className="eyebrow">
                  REQUIRED AGREEMENTS
                </p>
                <h2>Research-Use Confirmation</h2>

                <div className="checkout-agreement-info">
                  <strong>
                    Review the Research Agreement
                  </strong>

                  <p>
                    Review the full research-use terms
                    before submitting an order request.
                  </p>

                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={isSubmitting}
                    onClick={() =>
                      onNavigate("researchAgreement")
                    }
                  >
                    View Research Agreement
                  </button>
                </div>

                <label className="checkout-checkbox-row">
                  <input
                    type="checkbox"
                    checked={researchAgreement}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setSubmitError("");
                      setResearchAgreement(
                        event.target.checked
                      );
                    }}
                  />

                  <span>
                    I understand these products are sold
                    for research use only and are not
                    intended for human consumption.
                  </span>
                </label>

                <label className="checkout-checkbox-row">
                  <input
                    type="checkbox"
                    checked={ageAgreement}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setSubmitError("");
                      setAgeAgreement(
                        event.target.checked
                      );
                    }}
                  />

                  <span>
                    I confirm I am at least 21 years old
                    and agree to follow all applicable
                    laws, rules, and research-use
                    restrictions.
                  </span>
                </label>
              </section>
            </section>

            <aside className="checkout-summary-panel">
              <p className="eyebrow">ORDER SUMMARY</p>
              <h2>Review Order</h2>

              <div className="checkout-summary-items">
                {cartItems.map((item) => {
                  const lineTotal =
                    Number(item.price || 0) *
                    Number(item.quantity || 0);

                  return (
                    <div
                      key={`${item.codeName}-${item.strength}`}
                      className="checkout-summary-item"
                    >
                      <div>
                        <strong>{item.name}</strong>

                        <p>
                          {item.codeName} Â·{" "}
                          {item.strength}
                        </p>

                        <p>
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      <strong>
                        {formatPrice(lineTotal)}
                      </strong>
                    </div>
                  );
                })}
              </div>

              <SummaryRow
                label="Total Products"
                value={cartItems.length}
              />

              <SummaryRow
                label="Total Items"
                value={totalQuantity}
              />

              <SummaryRow
                label="Product Subtotal"
                value={formatPrice(subtotal)}
              />

              <SummaryRow
                label="Coupon"
                value={
                  validatedCouponCode ||
                  (couponCode ? "Not Applied" : "None")
                }
              />

              {discount > 0 && (
                <SummaryRow
                  label="Discount"
                  value={`-${formatPrice(discount)}`}
                />
              )}

              <SummaryRow
                label="Discounted Product Total"
                value={formatPrice(discountedSubtotal)}
              />

              <SummaryRow
                label="Referral Code"
                value={
                  validatedReferralCode ||
                  (referralCode
                    ? "Not Applied"
                    : "None")
                }
              />

              <SummaryRow
                label="Shipping"
                value={
                  shippingFee === 0
                    ? "FREE"
                    : formatPrice(shippingFee)
                }
              />

              <SummaryRow
                label="Order Total"
                value={formatPrice(orderTotal)}
              />

              <SummaryRow
                label="Payment Preference"
                value={
                  selectedPaymentOption?.label ||
                  "Not Selected"
                }
              />

              <div className="checkout-final-total-note">
                <strong>
                  This is an order requestâ€”not a payment.
                </strong>

                <span>
                  {freeShippingRemaining > 0
                    ? `A $15 flat shipping fee applies. Add ${formatPrice(
                        freeShippingRemaining
                      )} more to qualify for free shipping.`
                    : "Free shipping is included because the product subtotal is $100 or more."}
                </span>
              </div>

              <section className="checkout-security-panel">
                <strong>Security Verification</strong>

                <p>
                  Complete the verification before
                  submitting your order request.
                </p>

                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  resetKey={turnstileResetKey}
                  disabled={isSubmitting}
                  onTokenChange={
                    handleTurnstileTokenChange
                  }
                />
              </section>

              {submitError && (
                <div
                  className="checkout-submit-error"
                  role="alert"
                  aria-live="assertive"
                >
                  <strong>
                    Order request not sent
                  </strong>

                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                className="primary-btn checkout-submit-button"
                disabled={
                  !canPlaceOrder || isSubmitting
                }
              >
                {isSubmitting
                  ? "Submitting Order Request..."
                  : "Submit Order Request"}
              </button>

              <button
                type="button"
                className="secondary-btn checkout-back-button"
                disabled={isSubmitting}
                onClick={() => onNavigate("cart")}
              >
                Back To Cart
              </button>

              {!canPlaceOrder && !isSubmitting && (
                <p className="checkout-helper-text">
                  Complete all required fields, select a
                  payment preference, apply or remove
                  any entered referral code, accept both
                  confirmations, and complete the
                  security verification.
                </p>
              )}

              {isSubmitting && (
                <p
                  className="checkout-submitting-text"
                  aria-live="polite"
                >
                  Your order request is being securely
                  submitted.
                </p>
              )}
            </aside>
          </form>

          <div className="checkout-research-notice">
            For Research Use Only. Products are not
            intended for human consumption.
          </div>
        </section>
      </main>
    </>
  );
}

function CheckoutState({
  eyebrow,
  title,
  message,
  notice,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}) {
  return (
    <>
      <style>{checkoutCss}</style>

      <main className="checkout-page">
        <section className="checkout-state-panel">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{message}</p>

          <div className="checkout-state-notice">
            {notice}
          </div>

          <div className="checkout-state-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={onPrimary}
            >
              {primaryLabel}
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={onSecondary}
            >
              {secondaryLabel}
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

function InputField({
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  fullWidth = false,
  disabled = false,
  readOnly = false,
  helper = "",
  error = "",
}) {
  const describedBy = error
    ? `${name}-error`
    : helper
    ? `${name}-helper`
    : undefined;

  return (
    <label
      className={
        fullWidth
          ? "checkout-field checkout-field-full"
          : "checkout-field"
      }
    >
      <span>{label}</span>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        inputMode={inputMode}
        disabled={disabled}
        readOnly={readOnly}
        aria-readonly={readOnly}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      />

      {error ? (
        <small id={`${name}-error`}>{error}</small>
      ) : helper ? (
        <small
          id={`${name}-helper`}
          className="checkout-field-helper"
        >
          {helper}
        </small>
      ) : null}
    </label>
  );
}

function SelectField({
  name,
  label,
  value,
  onChange,
  onBlur,
  autoComplete,
  disabled = false,
  error = "",
}) {
  return (
    <label className="checkout-field">
      <span>{label}</span>

      <select
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${name}-error` : undefined
        }
      >
        <option value="">Select State</option>

        {stateOptions.map(([code, stateName]) => (
          <option key={code} value={code}>
            {stateName}
          </option>
        ))}
      </select>

      {error && (
        <small id={`${name}-error`}>{error}</small>
      )}
    </label>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="checkout-summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const checkoutCss = `
  .checkout-page,
  .checkout-page *,
  .checkout-page *::before,
  .checkout-page *::after {
    box-sizing: border-box;
  }

  .checkout-page {
    width: 100%;
    max-width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .checkout-inner {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .checkout-hero,
  .checkout-state-panel {
    padding: 52px;
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

  .checkout-hero {
    margin-bottom: 34px;
  }

  .checkout-hero h1,
  .checkout-state-panel h1 {
    margin-bottom: 20px;
    font-size: clamp(42px, 6vw, 62px);
    line-height: 1.05;
    background: linear-gradient(180deg, #ffffff, #9d9d9d);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .checkout-hero > p,
  .checkout-state-panel > p:not(.eyebrow) {
    max-width: 760px;
    margin: 0 auto;
    color: #c8c8c8;
    font-size: 19px;
    line-height: 1.8;
  }

  .checkout-hero-status {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .checkout-hero-status > span,
  .checkout-state-notice {
    display: inline-flex;
    width: fit-content;
    padding: 9px 13px;
    border: 1px solid rgba(61,165,255,0.42);
    border-radius: 999px;
    background: rgba(61,165,255,0.17);
    color: #9ed8ff;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .checkout-state-panel {
    max-width: 900px;
    margin: 0 auto;
  }

  .checkout-state-notice {
    margin: 18px auto 0;
  }

  .checkout-state-actions {
    display: flex;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 28px;
  }

  .checkout-state-panel > .primary-btn {
    margin-top: 26px;
  }

  .checkout-invalid-list {
    display: grid;
    gap: 10px;
    max-width: 620px;
    margin: 26px auto;
  }

  .checkout-invalid-list > div {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    padding: 15px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 15px;
    background: rgba(0,0,0,0.23);
    color: #c8c8c8;
  }

  .checkout-layout {
    display: grid;
    grid-template-columns:
      minmax(0, 1.18fr)
      minmax(340px, 0.82fr);
    gap: 30px;
    align-items: start;
  }

  .checkout-main-panel,
  .checkout-summary-panel {
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

  .checkout-summary-panel {
    position: sticky;
    top: 110px;
  }

  .checkout-main-panel h2,
  .checkout-summary-panel h2,
  .checkout-section-card h2 {
    margin-bottom: 24px;
    font-size: clamp(28px, 4vw, 36px);
    line-height: 1.12;
    background: linear-gradient(180deg, #ffffff, #9d9d9d);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .checkout-country-note,
  .checkout-account-note,
  .checkout-invoice-notice,
  .checkout-final-total-note,
  .checkout-agreement-info {
    padding: 17px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 16px;
    background: rgba(61,165,255,0.11);
    color: #bfe7ff;
    line-height: 1.65;
  }

  .checkout-country-note {
    margin-bottom: 14px;
  }

  .checkout-account-note {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    margin-bottom: 20px;
  }

  .checkout-account-note > div {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .checkout-account-note > div > strong {
    color: #ffffff;
  }

  .checkout-account-note > div > span {
    color: #b8dff4;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .checkout-account-note > span {
    flex: 0 0 auto;
    padding: 7px 10px;
    border: 1px solid rgba(61,165,255,0.35);
    border-radius: 999px;
    background: rgba(61,165,255,0.13);
    color: #bde8ff;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .checkout-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .checkout-field {
    min-width: 0;
    display: grid;
    gap: 8px;
  }

  .checkout-field-full {
    grid-column: 1 / -1;
  }

  .checkout-field > span {
    color: #c8c8c8;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .checkout-field input,
  .checkout-field select {
    width: 100%;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    outline: none;
    background: rgba(255,255,255,0.055);
    color: #ffffff;
    font: inherit;
  }

  .checkout-field select option {
    background: #111820;
    color: #ffffff;
  }

  .checkout-field input:focus,
  .checkout-field select:focus {
    border-color: rgba(61,165,255,0.65);
    box-shadow: 0 0 0 3px rgba(61,165,255,0.12);
  }

  .checkout-field input[aria-invalid="true"],
  .checkout-field select[aria-invalid="true"] {
    border-color: rgba(255,95,95,0.6);
  }

  .checkout-field small {
    color: #ffd1d1;
    font-size: 12px;
    line-height: 1.4;
  }

  .checkout-field input:disabled,
  .checkout-field select:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .checkout-field input:read-only:not(:disabled) {
    border-color: rgba(61,165,255,0.3);
    background: rgba(61,165,255,0.08);
    color: #c9ebff;
    cursor: not-allowed;
  }

  .checkout-field .checkout-field-helper {
    color: #8fb9d0;
  }

  .checkout-section-card {
    margin-top: 32px;
    padding: 26px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 22px;
    background: rgba(255,255,255,0.045);
  }

  .checkout-section-copy {
    margin: -8px 0 20px;
    color: #c8c8c8;
    line-height: 1.7;
  }

  .checkout-payment-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .checkout-payment-option {
    position: relative;
    min-width: 0;
    min-height: 118px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
    padding: 18px 14px;
    border: 1px solid rgba(255,255,255,0.11);
    border-radius: 18px;
    background: rgba(0,0,0,0.2);
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      background 0.2s ease,
      transform 0.2s ease;
  }

  .checkout-payment-option input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .checkout-payment-option img {
    width: 88px;
    height: 38px;
    display: block;
    object-fit: contain;
  }

  .checkout-payment-option strong {
    color: #ffffff;
  }

  .checkout-payment-selected {
    border-color: rgba(61,165,255,0.72);
    background: rgba(61,165,255,0.14);
    transform: translateY(-2px);
  }

  .checkout-payment-check {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 23px;
    height: 23px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 999px;
    background: rgba(255,255,255,0.04);
    color: transparent;
    font-size: 12px;
    font-weight: 900;
  }

  .checkout-payment-selected .checkout-payment-check {
    border-color: rgba(61,165,255,0.7);
    background: rgba(61,165,255,0.3);
    color: #ffffff;
  }

  .checkout-invoice-notice {
    margin-top: 16px;
    font-size: 13px;
  }

  .checkout-referral-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 10px;
    align-items: center;
  }

  .checkout-referral-row input {
    width: 100%;
    min-width: 0;
    padding: 15px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    outline: none;
    background: rgba(0,0,0,0.2);
    color: #ffffff;
    font: inherit;
    font-weight: 800;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }

  .checkout-referral-row input:focus {
    border-color: rgba(61,165,255,0.65);
    box-shadow: 0 0 0 3px rgba(61,165,255,0.12);
  }

  .checkout-referral-row input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .checkout-referral-apply {
    white-space: nowrap;
  }

  .checkout-referral-remove {
    padding: 10px 0;
    border: 0;
    background: transparent;
    color: #9ca8b0;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    text-decoration: underline;
  }

  .checkout-referral-remove:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .checkout-referral-message,
  .checkout-referral-note {
    margin-top: 12px;
    padding: 13px;
    border-radius: 14px;
    line-height: 1.55;
  }

  .checkout-referral-message {
    border: 1px solid rgba(61,165,255,0.25);
    background: rgba(61,165,255,0.08);
    color: #c5eaff;
    font-size: 13px;
  }

  .checkout-referral-valid {
    border-color: rgba(72,214,151,0.32);
    background: rgba(72,214,151,0.09);
    color: #b8f3d8;
  }

  .checkout-referral-invalid,
  .checkout-referral-error {
    border-color: rgba(255,95,95,0.34);
    background: rgba(255,70,70,0.1);
    color: #ffd0d0;
  }

  .checkout-referral-checking {
    border-color: rgba(255,190,80,0.3);
    background: rgba(255,170,50,0.08);
    color: #ffe0a8;
  }

  .checkout-referral-note {
    display: grid;
    gap: 4px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
  }

  .checkout-referral-note strong {
    color: #ffffff;
  }

  .checkout-referral-note span {
    color: #9ca8b0;
    font-size: 13px;
  }

  .checkout-agreement-info {
    margin-bottom: 18px;
  }

  .checkout-agreement-info p {
    margin-top: 7px;
    color: #b8d9eb;
  }

  .checkout-agreement-info button {
    margin-top: 15px;
  }

  .checkout-checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    margin-top: 16px;
    color: #c8c8c8;
    line-height: 1.7;
    cursor: pointer;
  }

  .checkout-checkbox-row input {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
    margin-top: 3px;
    accent-color: #3da5ff;
  }

  .checkout-summary-items {
    display: grid;
    gap: 12px;
    margin-bottom: 20px;
  }

  .checkout-summary-item {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 15px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 15px;
    background: rgba(0,0,0,0.18);
  }

  .checkout-summary-item > div {
    min-width: 0;
  }

  .checkout-summary-item strong {
    color: #ffffff;
    overflow-wrap: anywhere;
  }

  .checkout-summary-item > strong {
    color: #9ed8ff;
    white-space: nowrap;
  }

  .checkout-summary-item p {
    margin-top: 4px;
    color: #929ba3;
    font-size: 12px;
    line-height: 1.5;
  }

  .checkout-summary-row {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding: 13px 0;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  .checkout-summary-row span {
    color: #aeb7bf;
  }

  .checkout-summary-row strong {
    color: #ffffff;
    text-align: right;
  }

  .checkout-final-total-note {
    display: grid;
    gap: 7px;
    margin-top: 20px;
  }

  .checkout-final-total-note strong {
    color: #ffffff;
  }

  .checkout-final-total-note span {
    color: #b6d9ec;
    font-size: 13px;
  }

  .checkout-security-panel {
    margin-top: 22px;
    padding: 18px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 18px;
    background: rgba(0,0,0,0.18);
  }

  .checkout-security-panel > strong {
    color: #ffffff;
  }

  .checkout-security-panel > p {
    margin: 7px 0 15px;
    color: #aeb7bf;
    font-size: 13px;
    line-height: 1.55;
  }

  .checkout-turnstile {
    width: 100%;
    overflow: hidden;
  }

  .checkout-turnstile-disabled {
    opacity: 0.62;
    pointer-events: none;
  }

  .checkout-turnstile-container {
    width: 100%;
    min-height: 65px;
  }

  .checkout-turnstile-status {
    margin-top: 9px;
    color: #8f9ba6;
    font-size: 12px;
    line-height: 1.5;
  }

  .checkout-turnstile-verified {
    color: #9ed8ff;
  }

  .checkout-turnstile-warning {
    color: #ffd0a8;
  }

  .checkout-submit-error {
    display: grid;
    gap: 5px;
    margin-top: 18px;
    padding: 15px;
    border: 1px solid rgba(255,95,95,0.4);
    border-radius: 15px;
    background: rgba(255,70,70,0.1);
    color: #ffd0d0;
    line-height: 1.55;
  }

  .checkout-submit-button,
  .checkout-back-button {
    width: 100%;
    margin-top: 16px;
  }

  .checkout-submit-button:disabled,
  .checkout-back-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .checkout-helper-text,
  .checkout-submitting-text {
    margin-top: 13px;
    color: #929ba3;
    font-size: 12px;
    line-height: 1.6;
    text-align: center;
  }

  .checkout-submitting-text {
    color: #9ed8ff;
  }

  .checkout-research-notice {
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

  @media (max-width: 1000px) {
    .checkout-page {
      padding: 65px 24px;
    }

    .checkout-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .checkout-summary-panel {
      position: static;
    }
  }

  @media (max-width: 700px) {
    .checkout-page {
      padding: 44px 12px;
    }

    .checkout-hero,
    .checkout-state-panel,
    .checkout-main-panel,
    .checkout-summary-panel {
      padding: 22px 18px;
      border-radius: 22px;
    }

    .checkout-form-grid,
    .checkout-payment-grid,
    .checkout-referral-row {
      grid-template-columns: minmax(0, 1fr);
    }

    .checkout-referral-row button {
      width: 100%;
    }

    .checkout-field-full {
      grid-column: auto;
    }

    .checkout-state-actions,
    .checkout-state-actions button {
      width: 100%;
    }
  }

  @media (max-width: 430px) {
    .checkout-page {
      padding: 34px 8px;
    }

    .checkout-hero,
    .checkout-state-panel,
    .checkout-main-panel,
    .checkout-summary-panel,
    .checkout-section-card {
      padding: 15px;
    }

    .checkout-summary-row,
    .checkout-summary-item {
      align-items: flex-start;
    }

    .checkout-summary-row {
      flex-direction: column;
    }

    .checkout-account-note {
      align-items: flex-start;
      flex-direction: column;
    }

    .checkout-summary-row strong {
      text-align: left;
    }
  }
`;

export default Checkout;
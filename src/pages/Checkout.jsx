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

const storageKey = "304-site-settings";
const turnstileSiteKey = "0x4AAAAAAD0F6auvBsjzeYVA";
const turnstileScriptId = "cloudflare-turnstile-script";

let turnstileScriptPromise = null;

const defaultSettings = {
  storeStatus: "coming-soon",
  catalogEnabled: true,
};

const paymentOptions = [
  {
    id: "zelle",
    label: "Zelle",
    logo: zelleLogo,
  },
  {
    id: "venmo",
    label: "Venmo",
    logo: venmoLogo,
  },
  {
    id: "cash-app",
    label: "Cash App",
    logo: cashAppLogo,
  },
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

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve(
      window.turnstile
    );
  }

  if (
    turnstileScriptPromise
  ) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise =
    new Promise(
      (
        resolve,
        reject
      ) => {
        const finishLoading =
          () => {
            let attempts =
              0;

            const checkReady =
              () => {
                if (
                  window.turnstile
                ) {
                  resolve(
                    window.turnstile
                  );

                  return;
                }

                attempts +=
                  1;

                if (
                  attempts >=
                  100
                ) {
                  turnstileScriptPromise =
                    null;

                  reject(
                    new Error(
                      "Cloudflare Turnstile did not become ready."
                    )
                  );

                  return;
                }

                window.setTimeout(
                  checkReady,
                  50
                );
              };

            checkReady();
          };

        const existingScript =
          document.getElementById(
            turnstileScriptId
          );

        if (
          existingScript
        ) {
          existingScript.addEventListener(
            "load",
            finishLoading,
            {
              once: true,
            }
          );

          existingScript.addEventListener(
            "error",
            () => {
              turnstileScriptPromise =
                null;

              reject(
                new Error(
                  "Cloudflare Turnstile could not be loaded."
                )
              );
            },
            {
              once: true,
            }
          );

          finishLoading();

          return;
        }

        const script =
          document.createElement(
            "script"
          );

        script.id =
          turnstileScriptId;

        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

        script.async =
          true;

        script.defer =
          true;

        script.onload =
          finishLoading;

        script.onerror =
          () => {
            turnstileScriptPromise =
              null;

            reject(
              new Error(
                "Cloudflare Turnstile could not be loaded."
              )
            );
          };

        document.head.appendChild(
          script
        );
      }
    );

  return turnstileScriptPromise;
}

function validateCheckoutForm(
  formData
) {
  const errors = {};

  const email =
    formData.email.trim();

  const zip =
    formData.zip.trim();

  if (
    formData.firstName
      .trim().length < 2
  ) {
    errors.firstName =
      "Enter a valid first name.";
  }

  if (
    formData.lastName
      .trim().length < 2
  ) {
    errors.lastName =
      "Enter a valid last name.";
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    errors.email =
      "Enter a valid email address.";
  }

  if (
    formData.address
      .trim().length < 5
  ) {
    errors.address =
      "Enter a complete shipping address.";
  }

  if (
    formData.city
      .trim().length < 2
  ) {
    errors.city =
      "Enter a valid city.";
  }

  if (
    !stateOptions.some(
      ([code]) =>
        code ===
        formData.state
    )
  ) {
    errors.state =
      "Select a state.";
  }

  if (
    !/^\d{5}(-\d{4})?$/.test(
      zip
    )
  ) {
    errors.zip =
      "Enter a 5-digit ZIP code or ZIP+4.";
  }

  return errors;
}

function formatPrice(
  price
) {
  return Number.isFinite(
    price
  )
    ? `$${price.toFixed(
        2
      )}`
    : "Unavailable";
}

function TurnstileWidget({
  siteKey,
  resetKey,
  disabled = false,
  onTokenChange,
}) {
  const containerRef =
    useRef(null);

  const widgetIdRef =
    useRef(null);

  const [
    status,
    setStatus,
  ] = useState(
    "loading"
  );

  useEffect(() => {
    let cancelled =
      false;

    setStatus(
      "loading"
    );

    onTokenChange("");

    loadTurnstileScript()
      .then(
        (
          turnstile
        ) => {
          if (
            cancelled ||
            !containerRef.current
          ) {
            return;
          }

          containerRef.current.innerHTML =
            "";

          widgetIdRef.current =
            turnstile.render(
              containerRef.current,
              {
                sitekey:
                  siteKey,

                theme:
                  "dark",

                size:
                  "flexible",

                appearance:
                  "always",

                action:
                  "checkout_order",

                callback:
                  (
                    token
                  ) => {
                    if (
                      cancelled
                    ) {
                      return;
                    }

                    setStatus(
                      "verified"
                    );

                    onTokenChange(
                      token
                    );
                  },

                "expired-callback":
                  () => {
                    if (
                      cancelled
                    ) {
                      return;
                    }

                    setStatus(
                      "expired"
                    );

                    onTokenChange(
                      ""
                    );
                  },

                "timeout-callback":
                  () => {
                    if (
                      cancelled
                    ) {
                      return;
                    }

                    setStatus(
                      "expired"
                    );

                    onTokenChange(
                      ""
                    );
                  },

                "error-callback":
                  () => {
                    if (
                      cancelled
                    ) {
                      return;
                    }

                    setStatus(
                      "error"
                    );

                    onTokenChange(
                      ""
                    );
                  },
              }
            );

          setStatus(
            "ready"
          );
        }
      )
      .catch(
        (
          error
        ) => {
          console.error(
            "Turnstile loading error:",
            error
          );

          if (
            !cancelled
          ) {
            setStatus(
              "error"
            );

            onTokenChange(
              ""
            );
          }
        }
      );

    return () => {
      cancelled =
        true;

      if (
        widgetIdRef.current !==
          null &&
        window.turnstile
      ) {
        try {
          window.turnstile.remove(
            widgetIdRef.current
          );
        } catch {
          // Widget may already
          // be removed.
        }
      }

      widgetIdRef.current =
        null;
    };
  }, [
    siteKey,
    resetKey,
    onTokenChange,
  ]);

  const statusMessage =
    status ===
    "verified"
      ? "Security verification complete."
      : status ===
        "expired"
      ? "Verification expired. Complete it again."
      : status ===
        "error"
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
        ref={
          containerRef
        }
        className="checkout-turnstile-container"
      />

      <p
        className={
          status ===
          "verified"
            ? "checkout-turnstile-status checkout-turnstile-verified"
            : status ===
                "error" ||
              status ===
                "expired"
            ? "checkout-turnstile-status checkout-turnstile-warning"
            : "checkout-turnstile-status"
        }
        aria-live="polite"
      >
        {
          statusMessage
        }
      </p>
    </div>
  );
}

function Checkout({
  cartItems = [],
  onNavigate = () => {},
  onPlaceOrder = () => {},
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
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  const [
    touched,
    setTouched,
  ] = useState({});

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("");

  const [
    researchAgreement,
    setResearchAgreement,
  ] = useState(false);

  const [
    ageAgreement,
    setAgeAgreement,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    submitError,
    setSubmitError,
  ] = useState("");

  const [
    turnstileToken,
    setTurnstileToken,
  ] = useState("");

  const [
    turnstileResetKey,
    setTurnstileResetKey,
  ] = useState(0);

  const submissionLockRef =
    useRef(false);

  const handleTurnstileTokenChange =
    useCallback(
      (
        token
      ) => {
        setSubmitError(
          ""
        );

        setTurnstileToken(
          token
        );
      },
      []
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

  const totalQuantity =
    useMemo(
      () =>
        cartItems.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.quantity ||
                0
            ),
          0
        ),
      [
        cartItems,
      ]
    );

  const subtotal =
    useMemo(
      () =>
        cartItems.reduce(
          (
            total,
            item
          ) => {
            const price =
              Number.isFinite(
                item.price
              )
                ? item.price
                : 0;

            const quantity =
              Number(
                item.quantity ||
                  0
              );

            return (
              total +
              price *
                quantity
            );
          },
          0
        ),
      [
        cartItems,
      ]
    );

  const invalidPriceItems =
    useMemo(
      () =>
        cartItems.filter(
          (
            item
          ) =>
            !Number.isFinite(
              item.price
            )
        ),
      [
        cartItems,
      ]
    );

  const formErrors =
    useMemo(
      () =>
        validateCheckoutForm(
          formData
        ),
      [
        formData,
      ]
    );

  const purchasingEnabled =
    settings.storeStatus ===
    "open";

  const checkoutAvailable =
    settings.catalogEnabled &&
    purchasingEnabled &&
    invalidPriceItems.length ===
      0;

  const selectedPaymentOption =
    paymentOptions.find(
      (
        option
      ) =>
        option.id ===
        paymentMethod
    );

  const formComplete =
    Object.keys(
      formErrors
    ).length === 0;

  const canPlaceOrder =
    cartItems.length > 0 &&
    checkoutAvailable &&
    formComplete &&
    Boolean(
      paymentMethod
    ) &&
    researchAgreement &&
    ageAgreement &&
    Boolean(
      turnstileToken
    ) &&
    !isSubmitting;

  const storeStatusLabel =
    settings.storeStatus ===
    "open"
      ? "Store Open"
      : settings.storeStatus ===
        "maintenance"
      ? "Maintenance Mode"
      : "Coming Soon";

  function handleChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    let nextValue =
      value;

    if (
      name === "zip"
    ) {
      nextValue =
        value
          .replace(
            /[^\d-]/g,
            ""
          )
          .slice(
            0,
            10
          );
    }

    setSubmitError(
      ""
    );

    setFormData(
      (
        currentData
      ) => ({
        ...currentData,

        [name]:
          nextValue,
      })
    );
  }

  function handleBlur(
    event
  ) {
    setTouched(
      (
        currentTouched
      ) => ({
        ...currentTouched,

        [event.target
          .name]:
          true,
      })
    );
  }

  function handlePaymentChange(
    value
  ) {
    setSubmitError(
      ""
    );

    setPaymentMethod(
      value
    );
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

  async function handlePlaceOrder(
    event
  ) {
    event?.preventDefault();

    markAllFieldsTouched();

    if (
      !canPlaceOrder ||
      isSubmitting ||
      submissionLockRef.current
    ) {
      return;
    }

    submissionLockRef.current =
      true;

    setSubmitError(
      ""
    );

    setIsSubmitting(
      true
    );

    const orderPayload = {
      firstName:
        formData.firstName.trim(),

      lastName:
        formData.lastName.trim(),

      email:
        formData.email
          .trim()
          .toLowerCase(),

      address:
        formData.address.trim(),

      city:
        formData.city.trim(),

      state:
        formData.state,

      zip:
        formData.zip.trim(),

      preferredPaymentMethod:
        paymentMethod,

      preferredPaymentLabel:
        selectedPaymentOption?.label ||
        "",

      items:
        cartItems.map(
          (
            item
          ) => ({
            name:
              item.name ||
              "",

            codeName:
              item.codeName ||
              "",

            strength:
              item.strength ||
              "",

            quantity:
              Number(
                item.quantity ||
                  1
              ),

            price:
              Number(
                item.price ||
                  0
              ),
          })
        ),
    };

    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(
        () =>
          controller.abort(),
        25000
      );

    try {
      const response =
        await fetch(
          "/api/order",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  order:
                    orderPayload,

                  turnstileToken,
                }
              ),

            signal:
              controller.signal,
          }
        );

      const responseText =
        await response.text();

      let result;

      try {
        result =
          JSON.parse(
            responseText
          );
      } catch {
        throw new Error(
          "The order service returned an invalid response. Please try again."
        );
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "The order request could not be submitted."
        );
      }

      onPlaceOrder({
        ...formData,

        email:
          formData.email
            .trim()
            .toLowerCase(),

        id:
          result.orderId,

        orderId:
          result.orderId,

        status:
          "Order Request Received",

        preferredPaymentMethod:
          paymentMethod,

        preferredPaymentLabel:
          selectedPaymentOption?.label ||
          "",
      });
    } catch (
      error
    ) {
      console.error(
        "Checkout submission error:",
        error
      );

      setTurnstileToken(
        ""
      );

      setTurnstileResetKey(
        (
          currentKey
        ) =>
          currentKey +
          1
      );

      setSubmitError(
        error?.name ===
        "AbortError"
          ? "The order service took too long to respond. Please try again."
          : error?.message ||
              "The order request could not be submitted. Please try again."
      );
    } finally {
      window.clearTimeout(
        timeoutId
      );

      submissionLockRef.current =
        false;

      setIsSubmitting(
        false
      );
    }
  }

  if (
    !settings.catalogEnabled
  ) {
    return (
      <CheckoutState
        eyebrow="CHECKOUT"
        title="Checkout Temporarily Unavailable"
        message="Checkout is unavailable because the research product catalog is currently disabled."
        notice="For Research Use Only. Not intended for human consumption."
        primaryLabel="Return Home"
        onPrimary={() =>
          onNavigate(
            "home"
          )
        }
        secondaryLabel="Research Agreement"
        onSecondary={() =>
          onNavigate(
            "researchAgreement"
          )
        }
      />
    );
  }

  if (
    cartItems.length ===
    0
  ) {
    return (
      <CheckoutState
        eyebrow="CHECKOUT"
        title="Your Cart Is Empty"
        message="Add research-use products to your cart before continuing to checkout."
        notice={
          storeStatusLabel
        }
        primaryLabel="Browse Products"
        onPrimary={() =>
          onNavigate(
            "products"
          )
        }
        secondaryLabel="Research Agreement"
        onSecondary={() =>
          onNavigate(
            "researchAgreement"
          )
        }
      />
    );
  }

  if (
    !purchasingEnabled
  ) {
    return (
      <CheckoutState
        eyebrow="CHECKOUT"
        title="Checkout Is Unavailable"
        message={`Your cart has been preserved, but orders cannot be placed while the store status is ${storeStatusLabel}.`}
        notice={
          storeStatusLabel
        }
        primaryLabel="Return To Cart"
        onPrimary={() =>
          onNavigate(
            "cart"
          )
        }
        secondaryLabel="Browse Products"
        onSecondary={() =>
          onNavigate(
            "products"
          )
        }
      />
    );
  }

  if (
    invalidPriceItems.length >
    0
  ) {
    return (
      <>
        <style>
          {
            checkoutCss
          }
        </style>

        <main className="checkout-page">
          <section className="checkout-state-panel">
            <p className="eyebrow">
              CHECKOUT
            </p>

            <h1>
              Cart Update
              Required
            </h1>

            <p>
              One or more
              products in your
              cart no longer
              have valid
              pricing. Return
              to the cart and
              remove those
              products before
              continuing.
            </p>

            <div className="checkout-invalid-list">
              {invalidPriceItems.map(
                (
                  item
                ) => (
                  <div
                    key={`${item.codeName}-${item.strength}`}
                  >
                    <strong>
                      {
                        item.name
                      }
                    </strong>

                    <span>
                      {
                        item.codeName
                      }{" "}
                      ·{" "}
                      {
                        item.strength
                      }
                    </span>
                  </div>
                )
              )}
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={() =>
                onNavigate(
                  "cart"
                )
              }
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
      <style>
        {checkoutCss}
      </style>

      <main className="checkout-page">
        <section className="checkout-inner">
          <header className="checkout-hero">
            <div className="checkout-hero-status">
              <p className="eyebrow">
                CHECKOUT
              </p>

              <span>
                {
                  storeStatusLabel
                }
              </span>
            </div>

            <h1>
              Order Request
              Checkout
            </h1>

            <p>
              Enter your
              shipping details,
              select your
              preferred invoice
              payment method,
              and complete the
              required
              confirmations
              before submitting
              your order
              request.
            </p>
          </header>

          <form
            className="checkout-layout"
            onSubmit={
              handlePlaceOrder
            }
            noValidate
          >
            <section className="checkout-main-panel">
              <p className="eyebrow">
                CUSTOMER
                INFORMATION
              </p>

              <h2>
                Shipping Details
              </h2>

              <div className="checkout-country-note">
                Shipping address
                must be within
                the United
                States. Shipping
                availability and
                the final
                shipping charge
                are confirmed
                during order
                review.
              </div>

              <div className="checkout-form-grid">
                <InputField
                  name="firstName"
                  label="First Name"
                  placeholder="First Name"
                  value={
                    formData.firstName
                  }
                  onChange={
                    handleChange
                  }
                  onBlur={
                    handleBlur
                  }
                  autoComplete="given-name"
                  disabled={
                    isSubmitting
                  }
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
                  value={
                    formData.lastName
                  }
                  onChange={
                    handleChange
                  }
                  onBlur={
                    handleBlur
                  }
                  autoComplete="family-name"
                  disabled={
                    isSubmitting
                  }
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
                  value={
                    formData.email
                  }
                  onChange={
                    handleChange
                  }
                  onBlur={
                    handleBlur
                  }
                  autoComplete="email"
                  disabled={
                    isSubmitting
                  }
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
                  value={
                    formData.address
                  }
                  onChange={
                    handleChange
                  }
                  onBlur={
                    handleBlur
                  }
                  autoComplete="street-address"
                  disabled={
                    isSubmitting
                  }
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
                  value={
                    formData.city
                  }
                  onChange={
                    handleChange
                  }
                  onBlur={
                    handleBlur
                  }
                  autoComplete="address-level2"
                  disabled={
                    isSubmitting
                  }
                  error={
                    touched.city
                      ? formErrors.city
                      : ""
                  }
                />

                <SelectField
                  name="state"
                  label="State"
                  value={
                    formData.state
                  }
                  onChange={
                    handleChange
                  }
                  onBlur={
                    handleBlur
                  }
                  autoComplete="address-level1"
                  disabled={
                    isSubmitting
                  }
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
                  value={
                    formData.zip
                  }
                  onChange={
                    handleChange
                  }
                  onBlur={
                    handleBlur
                  }
                  autoComplete="postal-code"
                  inputMode="numeric"
                  disabled={
                    isSubmitting
                  }
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
                  PAYMENT
                  PREFERENCE
                </p>

                <h2>
                  Choose An
                  Invoice Payment
                  Method
                </h2>

                <p className="checkout-section-copy">
                  This selection
                  records your
                  preference only.
                  No payment is
                  collected on
                  this page.
                  Payment
                  instructions are
                  sent only after
                  the order
                  request has been
                  reviewed.
                </p>

                <div className="checkout-payment-grid">
                  {paymentOptions.map(
                    (
                      option
                    ) => {
                      const selected =
                        paymentMethod ===
                        option.id;

                      return (
                        <label
                          key={
                            option.id
                          }
                          className={
                            selected
                              ? "checkout-payment-option checkout-payment-selected"
                              : "checkout-payment-option"
                          }
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={
                              option.id
                            }
                            checked={
                              selected
                            }
                            disabled={
                              isSubmitting
                            }
                            onChange={(
                              event
                            ) =>
                              handlePaymentChange(
                                event.target
                                  .value
                              )
                            }
                          />

                          <span className="checkout-payment-check">
                            ✓
                          </span>

                          <img
                            src={
                              option.logo
                            }
                            alt={`${option.label} logo`}
                          />

                          <strong>
                            {
                              option.label
                            }
                          </strong>
                        </label>
                      );
                    }
                  )}
                </div>

                <div className="checkout-invoice-notice">
                  Selecting a
                  payment
                  preference does
                  not guarantee
                  availability.
                  Final payment
                  instructions
                  and the
                  complete invoice
                  amount will be
                  confirmed by
                  email.
                </div>
              </section>

              <section className="checkout-section-card">
                <p className="eyebrow">
                  REQUIRED
                  AGREEMENTS
                </p>

                <h2>
                  Research-Use
                  Confirmation
                </h2>

                <div className="checkout-agreement-info">
                  <strong>
                    Review the
                    Research
                    Agreement
                  </strong>

                  <p>
                    Review the
                    full
                    research-use
                    terms before
                    submitting an
                    order request.
                  </p>

                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={
                      isSubmitting
                    }
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

                <label className="checkout-checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      researchAgreement
                    }
                    disabled={
                      isSubmitting
                    }
                    onChange={(
                      event
                    ) => {
                      setSubmitError(
                        ""
                      );

                      setResearchAgreement(
                        event.target
                          .checked
                      );
                    }}
                  />

                  <span>
                    I understand
                    these products
                    are sold for
                    research use
                    only and are
                    not intended
                    for human
                    consumption.
                  </span>
                </label>

                <label className="checkout-checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      ageAgreement
                    }
                    disabled={
                      isSubmitting
                    }
                    onChange={(
                      event
                    ) => {
                      setSubmitError(
                        ""
                      );

                      setAgeAgreement(
                        event.target
                          .checked
                      );
                    }}
                  />

                  <span>
                    I confirm I am
                    at least 21
                    years old and
                    agree to
                    follow all
                    applicable
                    laws, rules,
                    and
                    research-use
                    restrictions.
                  </span>
                </label>
              </section>
            </section>

            <aside className="checkout-summary-panel">
              <p className="eyebrow">
                ORDER SUMMARY
              </p>

              <h2>
                Review Order
              </h2>

              <div className="checkout-summary-items">
                {cartItems.map(
                  (
                    item
                  ) => {
                    const lineTotal =
                      Number(
                        item.price ||
                          0
                      ) *
                      Number(
                        item.quantity ||
                          0
                      );

                    return (
                      <div
                        key={`${item.codeName}-${item.strength}`}
                        className="checkout-summary-item"
                      >
                        <div>
                          <strong>
                            {
                              item.name
                            }
                          </strong>

                          <p>
                            {
                              item.codeName
                            }{" "}
                            ·{" "}
                            {
                              item.strength
                            }
                          </p>

                          <p>
                            Quantity:{" "}
                            {
                              item.quantity
                            }
                          </p>
                        </div>

                        <strong>
                          $
                          {lineTotal.toFixed(
                            2
                          )}
                        </strong>
                      </div>
                    );
                  }
                )}
              </div>

              <SummaryRow
                label="Total Products"
                value={
                  cartItems.length
                }
              />

              <SummaryRow
                label="Total Items"
                value={
                  totalQuantity
                }
              />

              <SummaryRow
                label="Product Subtotal"
                value={formatPrice(
                  subtotal
                )}
              />

              <SummaryRow
                label="Shipping"
                value="Confirmed By Invoice"
              />

              <SummaryRow
                label="Taxes"
                value="Confirmed By Invoice"
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
                  This is an
                  order
                  request—not a
                  payment.
                </strong>

                <span>
                  The final
                  invoice may
                  include
                  applicable
                  shipping and
                  taxes. Review
                  the complete
                  invoice before
                  sending
                  payment.
                </span>
              </div>

              <section className="checkout-security-panel">
                <strong>
                  Security
                  Verification
                </strong>

                <p>
                  Complete the
                  verification
                  before
                  submitting your
                  order request.
                </p>

                <TurnstileWidget
                  siteKey={
                    turnstileSiteKey
                  }
                  resetKey={
                    turnstileResetKey
                  }
                  disabled={
                    isSubmitting
                  }
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
                    Order request
                    not sent
                  </strong>

                  <span>
                    {
                      submitError
                    }
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="primary-btn checkout-submit-button"
                disabled={
                  !canPlaceOrder ||
                  isSubmitting
                }
              >
                {isSubmitting
                  ? "Submitting Order Request..."
                  : "Submit Order Request"}
              </button>

              <button
                type="button"
                className="secondary-btn checkout-back-button"
                disabled={
                  isSubmitting
                }
                onClick={() =>
                  onNavigate(
                    "cart"
                  )
                }
              >
                Back To Cart
              </button>

              {!canPlaceOrder &&
                !isSubmitting && (
                  <p className="checkout-helper-text">
                    Complete all
                    required
                    fields, select
                    a payment
                    preference,
                    accept both
                    confirmations,
                    and complete
                    the security
                    verification.
                  </p>
                )}

              {isSubmitting && (
                <p
                  className="checkout-submitting-text"
                  aria-live="polite"
                >
                  Your order
                  request is
                  being securely
                  submitted.
                </p>
              )}
            </aside>
          </form>

          <div className="checkout-research-notice">
            For Research Use
            Only. Products are
            not intended for
            human consumption.
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
      <style>
        {checkoutCss}
      </style>

      <main className="checkout-page">
        <section className="checkout-state-panel">
          <p className="eyebrow">
            {eyebrow}
          </p>

          <h1>
            {title}
          </h1>

          <p>
            {message}
          </p>

          <div className="checkout-state-notice">
            {notice}
          </div>

          <div className="checkout-state-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={
                onPrimary
              }
            >
              {
                primaryLabel
              }
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={
                onSecondary
              }
            >
              {
                secondaryLabel
              }
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
  error = "",
}) {
  return (
    <label
      className={
        fullWidth
          ? "checkout-field checkout-field-full"
          : "checkout-field"
      }
    >
      <span>
        {label}
      </span>

      <input
        name={name}
        type={type}
        placeholder={
          placeholder
        }
        value={value}
        onChange={
          onChange
        }
        onBlur={
          onBlur
        }
        autoComplete={
          autoComplete
        }
        inputMode={
          inputMode
        }
        disabled={
          disabled
        }
        aria-invalid={
          Boolean(
            error
          )
        }
        aria-describedby={
          error
            ? `${name}-error`
            : undefined
        }
      />

      {error && (
        <small
          id={`${name}-error`}
        >
          {error}
        </small>
      )}
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
      <span>
        {label}
      </span>

      <select
        name={name}
        value={value}
        onChange={
          onChange
        }
        onBlur={
          onBlur
        }
        autoComplete={
          autoComplete
        }
        disabled={
          disabled
        }
        aria-invalid={
          Boolean(
            error
          )
        }
        aria-describedby={
          error
            ? `${name}-error`
            : undefined
        }
      >
        <option value="">
          Select State
        </option>

        {stateOptions.map(
          (
            [
              code,
              stateName,
            ]
          ) => (
            <option
              key={
                code
              }
              value={
                code
              }
            >
              {
                stateName
              }
            </option>
          )
        )}
      </select>

      {error && (
        <small
          id={`${name}-error`}
        >
          {error}
        </small>
      )}
    </label>
  );
}

function SummaryRow({
  label,
  value,
}) {
  return (
    <div className="checkout-summary-row">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
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
    box-shadow:
      0 30px 80px rgba(0,0,0,0.45);
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
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #9d9d9d
      );
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
    margin: 26px auto 0;
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
    box-shadow:
      0 30px 80px rgba(0,0,0,0.45);
  }

  .checkout-main-panel h2,
  .checkout-summary-panel h2,
  .checkout-section-card h2 {
    margin-bottom: 24px;
    font-size: clamp(28px, 4vw, 36px);
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

  .checkout-country-note,
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
    margin-bottom: 20px;
  }

  .checkout-form-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
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
    box-shadow:
      0 0 0 3px rgba(61,165,255,0.12);
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
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
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
    background: rgba(255,255,255,0.05);
    color: transparent;
    font-size: 14px;
    font-weight: 900;
  }

  .checkout-payment-selected .checkout-payment-check {
    border-color: rgba(61,165,255,0.82);
    background: #3da5ff;
    color: #06111a;
  }

  .checkout-invoice-notice {
    margin-top: 20px;
    text-align: center;
    font-weight: 800;
  }

  .checkout-agreement-info {
    margin-bottom: 20px;
  }

  .checkout-agreement-info p {
    margin-top: 9px;
    color: #b8d8eb;
  }

  .checkout-agreement-info button {
    margin-top: 16px;
  }

  .checkout-checkbox-row {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    margin-top: 16px;
    color: #c8c8c8;
    line-height: 1.7;
    cursor: pointer;
  }

  .checkout-checkbox-row input {
    width: 20px;
    height: 20px;
    margin-top: 3px;
    accent-color: #3da5ff;
  }

  .checkout-summary-panel {
    position: sticky;
    top: 110px;
  }

  .checkout-summary-items {
    display: grid;
    gap: 14px;
    margin-bottom: 24px;
  }

  .checkout-summary-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(255,255,255,0.045);
    color: #ffffff;
  }

  .checkout-summary-item > div {
    min-width: 0;
  }

  .checkout-summary-item p {
    margin-top: 4px;
    color: #aaaaaa;
    font-size: 13px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .checkout-summary-row {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 12px;
    padding: 15px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 14px;
    background: rgba(255,255,255,0.045);
    color: #c8c8c8;
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

  .checkout-security-panel {
    margin-top: 18px;
    padding: 18px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    background: rgba(255,255,255,0.035);
  }

  .checkout-security-panel > strong {
    display: block;
    color: #ffffff;
    font-size: 14px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .checkout-security-panel > p {
    margin-top: 8px;
    color: #b8b8b8;
    font-size: 13px;
    line-height: 1.6;
  }

  .checkout-turnstile {
    display: grid;
    gap: 10px;
    margin-top: 14px;
  }

  .checkout-turnstile-disabled {
    opacity: 0.65;
    pointer-events: none;
  }

  .checkout-turnstile-container {
    width: 100%;
    min-height: 65px;
  }

  .checkout-turnstile-status {
    margin: 0;
    color: #aaaaaa;
    font-size: 12px;
    line-height: 1.5;
  }

  .checkout-turnstile-verified {
    color: #9ed8ff;
    font-weight: 800;
  }

  .checkout-turnstile-warning {
    color: #ffd1d1;
  }

  .checkout-submit-error {
    display: grid;
    gap: 6px;
    margin-top: 18px;
    padding: 16px;
    border: 1px solid rgba(255,95,95,0.45);
    border-radius: 16px;
    background: rgba(255,70,70,0.12);
    color: #ffd1d1;
    font-size: 14px;
    line-height: 1.6;
  }

  .checkout-submit-button,
  .checkout-back-button {
    width: 100%;
  }

  .checkout-submit-button {
    margin-top: 24px;
  }

  .checkout-back-button {
    margin-top: 14px;
  }

  .checkout-submit-button:disabled,
  .checkout-back-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .checkout-helper-text,
  .checkout-submitting-text {
    margin-top: 14px;
    color: #aaaaaa;
    font-size: 13px;
    line-height: 1.6;
    text-align: center;
  }

  .checkout-submitting-text {
    color: #9ed8ff;
    font-weight: 800;
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
      grid-template-columns:
        minmax(0, 1fr);
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
    .checkout-payment-grid {
      grid-template-columns:
        minmax(0, 1fr);
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

    .checkout-summary-row strong {
      text-align: left;
    }
  }
`;

export default Checkout;
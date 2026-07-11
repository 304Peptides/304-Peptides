import { useEffect, useMemo, useState } from "react";
import zelleLogo from "../assets/images/payments/zelle.png";
import venmoLogo from "../assets/images/payments/venmo.png";
import cashAppLogo from "../assets/images/payments/cashapp.png";

const storageKey = "304-site-settings";

const defaultSettings = {
  storeStatus: "coming-soon",
  catalogEnabled: true,
};

const paymentOptions = [
  { id: "zelle", label: "Zelle", logo: zelleLogo },
  { id: "venmo", label: "Venmo", logo: venmoLogo },
  { id: "cash-app", label: "Cash App", logo: cashAppLogo },
];

function loadSettings() {
  try {
    const savedSettings = window.localStorage.getItem(storageKey);

    return savedSettings
      ? { ...defaultSettings, ...JSON.parse(savedSettings) }
      : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function Checkout({ cartItems = [], onNavigate, onPlaceOrder }) {
  const [settings, setSettings] = useState(loadSettings);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("");
  const [researchAgreement, setResearchAgreement] = useState(false);
  const [ageAgreement, setAgeAgreement] = useState(false);

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

  const totalQuantity = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.quantity,
        0
      ),
    [cartItems]
  );

  const subtotal = useMemo(
    () =>
      cartItems.reduce((total, item) => {
        const price = Number.isFinite(item.price)
          ? item.price
          : 0;

        return total + price * item.quantity;
      }, 0),
    [cartItems]
  );

  const invalidPriceItems = useMemo(
    () =>
      cartItems.filter(
        (item) => !Number.isFinite(item.price)
      ),
    [cartItems]
  );

  const formComplete = Boolean(
    formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.email.trim() &&
      formData.address.trim() &&
      formData.city.trim() &&
      formData.state.trim() &&
      formData.zip.trim()
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

  const canPlaceOrder =
    cartItems.length > 0 &&
    checkoutAvailable &&
    formComplete &&
    Boolean(paymentMethod) &&
    researchAgreement &&
    ageAgreement;

  const storeStatusLabel =
    settings.storeStatus === "open"
      ? "Store Open"
      : settings.storeStatus === "maintenance"
      ? "Maintenance Mode"
      : "Coming Soon";

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handlePlaceOrder() {
    if (!canPlaceOrder) {
      return;
    }

    onPlaceOrder({
      ...formData,
      preferredPaymentMethod: paymentMethod,
      preferredPaymentLabel:
        selectedPaymentOption?.label || "",
    });
  }

  function formatPrice(price) {
    return Number.isFinite(price)
      ? `$${price.toFixed(2)}`
      : "Unavailable";
  }

  if (!settings.catalogEnabled) {
    return (
      <EmptyState
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
      <EmptyState
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
      <EmptyState
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
      <main style={pageStyle}>
        <section style={emptyStyle}>
          <p className="eyebrow">CHECKOUT</p>

          <h1 style={titleStyle}>
            Cart Update Required
          </h1>

          <p style={subtitleStyle}>
            One or more products in your cart no longer have
            valid pricing. Return to the cart and remove those
            products before continuing.
          </p>

          <div style={invalidListStyle}>
            {invalidPriceItems.map((item) => (
              <div
                key={`${item.codeName}-${item.strength}`}
                style={invalidItemStyle}
              >
                <strong>{item.name}</strong>

                <span>
                  {item.codeName} · {item.strength}
                </span>
              </div>
            ))}
          </div>

          <button
            className="primary-btn"
            style={{ marginTop: "26px" }}
            onClick={() => onNavigate("cart")}
          >
            Return To Cart
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={pageInnerStyle}>
        <div style={heroPanelStyle}>
          <div style={heroStatusRowStyle}>
            <p className="eyebrow">CHECKOUT</p>

            <span style={openStatusStyle}>
              {storeStatusLabel}
            </span>
          </div>

          <h1 style={titleStyle}>
            Order Request Checkout
          </h1>

          <p style={subtitleStyle}>
            Enter your shipping details, choose your
            preferred payment method, and complete the
            required confirmations before submitting your
            order request.
          </p>
        </div>

        <div style={checkoutLayoutStyle}>
          <div style={checkoutPanelStyle}>
            <p className="eyebrow">
              CUSTOMER INFORMATION
            </p>

            <h2 style={sectionTitleStyle}>
              Shipping Details
            </h2>

            <div style={formGridStyle}>
              <InputField
                name="firstName"
                label="First Name"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                autoComplete="given-name"
              />

              <InputField
                name="lastName"
                label="Last Name"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                autoComplete="family-name"
              />

              <InputField
                name="email"
                label="Email Address"
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                fullWidth
              />

              <InputField
                name="address"
                label="Shipping Address"
                placeholder="Shipping Address"
                value={formData.address}
                onChange={handleChange}
                autoComplete="street-address"
                fullWidth
              />

              <InputField
                name="city"
                label="City"
                placeholder="City"
                value={formData.city}
                onChange={handleChange}
                autoComplete="address-level2"
              />

              <InputField
                name="state"
                label="State"
                placeholder="State"
                value={formData.state}
                onChange={handleChange}
                autoComplete="address-level1"
              />

              <InputField
                name="zip"
                label="ZIP Code"
                placeholder="ZIP Code"
                value={formData.zip}
                onChange={handleChange}
                autoComplete="postal-code"
                fullWidth
              />
            </div>

            <div style={paymentPanelStyle}>
              <p className="eyebrow">
                PAYMENT PREFERENCE
              </p>

              <h2 style={sectionTitleStyle}>
                Choose A Payment Method
              </h2>

              <p style={paymentIntroStyle}>
                Select the payment method you would prefer
                to use for this order.
              </p>

              <div style={paymentOptionsGridStyle}>
                {paymentOptions.map((option) => {
                  const selected =
                    paymentMethod === option.id;

                  return (
                    <label
                      key={option.id}
                      style={{
                        ...paymentOptionStyle,
                        ...(selected
                          ? selectedPaymentOptionStyle
                          : {}),
                      }}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.id}
                        checked={selected}
                        onChange={(event) =>
                          setPaymentMethod(
                            event.target.value
                          )
                        }
                        style={paymentRadioStyle}
                      />

                      <span
                        style={{
                          ...paymentSelectionStyle,
                          ...(selected
                            ? selectedPaymentSelectionStyle
                            : {}),
                        }}
                      >
                        ✓
                      </span>

                      <img
                        src={option.logo}
                        alt={`${option.label} logo`}
                        style={paymentLogoStyle}
                      />

                      <strong style={paymentNameStyle}>
                        {option.label}
                      </strong>
                    </label>
                  );
                })}
              </div>

              <div style={invoiceMessageStyle}>
                An invoice with payment instructions will
                be sent to your email.
              </div>
            </div>

            <div style={agreementPanelStyle}>
              <p className="eyebrow">
                REQUIRED AGREEMENTS
              </p>

              <h2 style={sectionTitleStyle}>
                Research-Use Confirmation
              </h2>

              <div style={agreementInfoBoxStyle}>
                <strong>
                  Review the Research Agreement
                </strong>

                <p style={agreementTextStyle}>
                  Customers should review the research-use
                  terms before submitting an order request.
                  This prototype is not a substitute for
                  final legal or compliance review.
                </p>

                <button
                  type="button"
                  className="secondary-btn"
                  style={{ marginTop: "16px" }}
                  onClick={() =>
                    onNavigate("researchAgreement")
                  }
                >
                  View Research Agreement
                </button>
              </div>

              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={researchAgreement}
                  onChange={(event) =>
                    setResearchAgreement(
                      event.target.checked
                    )
                  }
                  style={checkboxStyle}
                />

                <span>
                  I understand these products are sold for
                  research use only and are not intended for
                  human consumption.
                </span>
              </label>

              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={ageAgreement}
                  onChange={(event) =>
                    setAgeAgreement(
                      event.target.checked
                    )
                  }
                  style={checkboxStyle}
                />

                <span>
                  I confirm I am at least 21 years old and
                  agree to follow all applicable rules,
                  laws, and research-use restrictions.
                </span>
              </label>
            </div>
          </div>

          <aside style={summaryPanelStyle}>
            <p className="eyebrow">
              ORDER SUMMARY
            </p>

            <h2 style={summaryTitleStyle}>
              Review Order
            </h2>

            <div style={summaryItemsStyle}>
              {cartItems.map((item) => {
                const lineTotal =
                  item.price * item.quantity;

                return (
                  <div
                    key={`${item.codeName}-${item.strength}`}
                    style={summaryItemStyle}
                  >
                    <div style={summaryItemIdentityStyle}>
                      <strong>{item.name}</strong>

                      <p style={smallMutedTextStyle}>
                        {item.codeName} · {item.strength}
                      </p>

                      <p style={smallMutedTextStyle}>
                        Quantity: {item.quantity}
                      </p>
                    </div>

                    <strong>
                      ${lineTotal.toFixed(2)}
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
              label="Subtotal"
              value={formatPrice(subtotal)}
            />

            <SummaryRow
              label="Shipping"
              value="Calculated Later"
            />

            <SummaryRow
              label="Taxes"
              value="Calculated Later"
            />

            <SummaryRow
              label="Payment Preference"
              value={
                selectedPaymentOption?.label ||
                "Not Selected"
              }
            />

            <SummaryRow
              label="Store Status"
              value={storeStatusLabel}
            />

            <div style={noticeBoxStyle}>
              Payment is not collected on this page. After
              the order request is reviewed, an invoice with
              instructions for the selected payment method
              will be sent by email.
            </div>

            <button
              className="primary-btn"
              style={{
                width: "100%",
                marginTop: "24px",
                opacity: canPlaceOrder ? 1 : 0.45,
                cursor: canPlaceOrder
                  ? "pointer"
                  : "not-allowed",
              }}
              disabled={!canPlaceOrder}
              onClick={handlePlaceOrder}
            >
              Submit Order Request
            </button>

            <button
              className="secondary-btn"
              style={{
                width: "100%",
                marginTop: "14px",
              }}
              onClick={() => onNavigate("cart")}
            >
              Back To Cart
            </button>

            {!canPlaceOrder && (
              <p style={helperTextStyle}>
                Complete every field, select a payment
                method, and accept both required agreements
                to submit your order request.
              </p>
            )}
          </aside>
        </div>

        <div style={researchNoticeStyle}>
          For Research Use Only. Products are not intended
          for human consumption.
        </div>
      </section>
    </main>
  );
}

function EmptyState({
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
    <main style={pageStyle}>
      <section style={emptyStyle}>
        <p className="eyebrow">
          {eyebrow}
        </p>

        <h1 style={titleStyle}>
          {title}
        </h1>

        <p style={subtitleStyle}>
          {message}
        </p>

        <div style={closedStatusStyle}>
          {notice}
        </div>

        <div style={buttonRowStyle}>
          <button
            className="primary-btn"
            onClick={onPrimary}
          >
            {primaryLabel}
          </button>

          <button
            className="secondary-btn"
            onClick={onSecondary}
          >
            {secondaryLabel}
          </button>
        </div>
      </section>
    </main>
  );
}

function InputField({
  name,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  fullWidth = false,
}) {
  return (
    <label
      style={{
        ...fieldStyle,
        ...(fullWidth
          ? { gridColumn: "1 / -1" }
          : {}),
      }}
    >
      <span style={fieldLabelStyle}>
        {label}
      </span>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        style={inputStyle}
      />
    </label>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={summaryRowStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const pageStyle = {
  padding: "90px 60px",
};

const pageInnerStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
};

const heroPanelStyle = {
  textAlign: "center",
  marginBottom: "34px",
  padding: "52px",
  borderRadius: "30px",
  border: "1px solid rgba(255,255,255,0.09)",
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.2), transparent 42%), rgba(255,255,255,0.035)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const heroStatusRowStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
};

const titleStyle = {
  fontSize: "clamp(42px, 6vw, 62px)",
  lineHeight: "1.05",
  marginBottom: "20px",
  background:
    "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle = {
  maxWidth: "760px",
  margin: "0 auto",
  color: "#c8c8c8",
  fontSize: "19px",
  lineHeight: "1.8",
};

const emptyStyle = {
  maxWidth: "900px",
  margin: "0 auto",
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.18), transparent 40%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "60px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const buttonRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "14px",
  flexWrap: "wrap",
  marginTop: "28px",
};

const openStatusStyle = {
  display: "inline-flex",
  width: "fit-content",
  margin: "18px auto 0",
  padding: "9px 13px",
  borderRadius: "999px",
  border: "1px solid rgba(61,165,255,0.42)",
  background: "rgba(61,165,255,0.17)",
  color: "#9ed8ff",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const closedStatusStyle = {
  display: "inline-flex",
  width: "fit-content",
  margin: "18px auto 0",
  padding: "9px 13px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#c8c8c8",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const invalidListStyle = {
  display: "grid",
  gap: "10px",
  maxWidth: "620px",
  margin: "26px auto 0",
};

const invalidItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
  padding: "15px",
  borderRadius: "15px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.23)",
  color: "#c8c8c8",
};

const checkoutLayoutStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "30px",
  alignItems: "start",
};

const checkoutPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.14), transparent 35%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const sectionTitleStyle = {
  fontSize: "clamp(28px, 4vw, 36px)",
  lineHeight: "1.12",
  marginBottom: "24px",
  background:
    "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const fieldStyle = {
  display: "grid",
  gap: "8px",
};

const fieldLabelStyle = {
  color: "#c8c8c8",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
};

const inputStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.055)",
  color: "#ffffff",
  fontSize: "15px",
  outline: "none",
};

const paymentPanelStyle = {
  marginTop: "32px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "22px",
  padding: "26px",
};

const paymentIntroStyle = {
  color: "#c8c8c8",
  lineHeight: "1.7",
  marginTop: "-8px",
  marginBottom: "20px",
};

const paymentOptionsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "14px",
};

const paymentOptionStyle = {
  position: "relative",
  minHeight: "118px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "10px",
  padding: "18px 14px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.11)",
  background: "rgba(0,0,0,0.2)",
  cursor: "pointer",
  transition:
    "border-color 0.2s ease, background 0.2s ease, transform 0.2s ease",
};

const selectedPaymentOptionStyle = {
  border: "1px solid rgba(61,165,255,0.72)",
  background: "rgba(61,165,255,0.14)",
  transform: "translateY(-2px)",
  boxShadow: "0 14px 30px rgba(0,0,0,0.25)",
};

const paymentRadioStyle = {
  position: "absolute",
  opacity: 0,
  pointerEvents: "none",
};

const paymentLogoStyle = {
  width: "88px",
  height: "38px",
  objectFit: "contain",
  display: "block",
};

const paymentNameStyle = {
  color: "#ffffff",
  fontSize: "15px",
};

const paymentSelectionStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  width: "23px",
  height: "23px",
  display: "grid",
  placeItems: "center",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.05)",
  color: "transparent",
  fontSize: "14px",
  fontWeight: "900",
};

const selectedPaymentSelectionStyle = {
  border: "1px solid rgba(61,165,255,0.82)",
  background: "#3da5ff",
  color: "#06111a",
};

const invoiceMessageStyle = {
  marginTop: "20px",
  padding: "17px",
  borderRadius: "16px",
  border: "1px solid rgba(61,165,255,0.28)",
  background: "rgba(61,165,255,0.12)",
  color: "#bfe7ff",
  fontWeight: "900",
  lineHeight: "1.6",
  textAlign: "center",
};

const agreementPanelStyle = {
  marginTop: "32px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "22px",
  padding: "26px",
};

const agreementInfoBoxStyle = {
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#c8eaff",
  borderRadius: "18px",
  padding: "18px",
  lineHeight: "1.7",
  marginBottom: "20px",
};

const agreementTextStyle = {
  marginTop: "9px",
  color: "#b8d8eb",
};

const checkboxRowStyle = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  color: "#c8c8c8",
  lineHeight: "1.7",
  marginTop: "16px",
  cursor: "pointer",
};

const checkboxStyle = {
  width: "20px",
  height: "20px",
  marginTop: "3px",
  accentColor: "#3da5ff",
  cursor: "pointer",
};

const summaryPanelStyle = {
  position: "sticky",
  top: "110px",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.16), transparent 35%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "32px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const summaryTitleStyle = {
  fontSize: "34px",
  lineHeight: "1.12",
  marginBottom: "24px",
  background:
    "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const summaryItemsStyle = {
  display: "grid",
  gap: "14px",
  marginBottom: "24px",
};

const summaryItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "16px",
  padding: "16px",
  color: "#ffffff",
};

const summaryItemIdentityStyle = {
  minWidth: 0,
};

const smallMutedTextStyle = {
  color: "#aaaaaa",
  fontSize: "13px",
  lineHeight: "1.6",
  marginTop: "4px",
};

const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "14px",
  padding: "15px",
  color: "#c8c8c8",
  marginBottom: "12px",
};

const noticeBoxStyle = {
  marginTop: "20px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "16px",
  padding: "16px",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: "1.6",
};

const helperTextStyle = {
  color: "#aaaaaa",
  fontSize: "13px",
  lineHeight: "1.6",
  marginTop: "14px",
  textAlign: "center",
};

const researchNoticeStyle = {
  marginTop: "30px",
  textAlign: "center",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "20px",
  padding: "20px",
  fontWeight: "900",
  lineHeight: "1.6",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

export default Checkout;
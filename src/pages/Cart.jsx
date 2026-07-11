import { useEffect, useMemo, useState } from "react";

const storageKey = "304-site-settings";

const defaultSettings = {
  storeStatus: "coming-soon",
  catalogEnabled: true,
};

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

function Cart({
  cartItems,
  onNavigate,
  onRemoveItem,
  onClearCart,
  onIncreaseQuantity,
  onDecreaseQuantity,
}) {
  const [settings, setSettings] = useState(loadSettings);

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

  const purchasingEnabled =
    settings.storeStatus === "open";

  const checkoutEnabled =
    purchasingEnabled &&
    invalidPriceItems.length === 0 &&
    cartItems.length > 0;

  const storeStatusLabel =
    settings.storeStatus === "open"
      ? "Store Open"
      : settings.storeStatus === "maintenance"
      ? "Maintenance Mode"
      : "Coming Soon";

  function formatPrice(price) {
    if (!Number.isFinite(price)) {
      return "Price Coming Soon";
    }

    return `$${price.toFixed(2)}`;
  }

  function handleCheckout() {
    if (!checkoutEnabled) {
      return;
    }

    onNavigate("checkout");
  }

  if (cartItems.length === 0) {
    return (
      <main style={{ padding: "90px 60px" }}>
        <section style={emptyPanelStyle}>
          <p className="eyebrow">CART</p>

          <h1 style={titleStyle}>
            Your Cart Is Empty
          </h1>

          <p style={subtitleStyle}>
            Browse the research-use catalog and select a
            product to begin.
          </p>

          <div
            style={
              purchasingEnabled
                ? openStatusStyle
                : closedStatusStyle
            }
          >
            {storeStatusLabel}
          </div>

          {!purchasingEnabled && (
            <div style={storeNoticeStyle}>
              Product browsing may remain available, but
              purchasing is currently disabled while the store
              status is <strong>{storeStatusLabel}</strong>.
            </div>
          )}

          <div style={buttonRowStyle}>
            <button
              className="primary-btn"
              onClick={() => onNavigate("products")}
            >
              Browse Products
            </button>

            <button
              className="secondary-btn"
              onClick={() =>
                onNavigate("researchAgreement")
              }
            >
              Research Agreement
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: "90px 60px" }}>
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div style={heroPanelStyle}>
          <div style={heroStatusRowStyle}>
            <p className="eyebrow">CART</p>

            <span
              style={
                purchasingEnabled
                  ? openStatusStyle
                  : closedStatusStyle
              }
            >
              {storeStatusLabel}
            </span>
          </div>

          <h1 style={titleStyle}>
            Review Cart
          </h1>

          <p style={subtitleStyle}>
            Review selected research-use products before
            continuing to checkout.
          </p>

          {!purchasingEnabled && (
            <div style={storeNoticeStyle}>
              Your cart remains available, but checkout is
              disabled while the store status is{" "}
              <strong>{storeStatusLabel}</strong>.
            </div>
          )}

          {invalidPriceItems.length > 0 && (
            <div style={warningNoticeStyle}>
              {invalidPriceItems.length} cart item
              {invalidPriceItems.length === 1 ? "" : "s"} no
              longer {invalidPriceItems.length === 1 ? "has" : "have"}{" "}
              valid pricing. Remove the affected item
              {invalidPriceItems.length === 1 ? "" : "s"} before
              checkout.
            </div>
          )}
        </div>

        <div style={cartLayoutStyle}>
          <div style={itemsPanelStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <p className="eyebrow">
                  SELECTED PRODUCTS
                </p>

                <h2 style={sectionTitleStyle}>
                  Cart Items
                </h2>
              </div>

              <button
                className="secondary-btn"
                onClick={onClearCart}
              >
                Clear Cart
              </button>
            </div>

            <div style={itemStackStyle}>
              {cartItems.map((item) => {
                const hasPrice =
                  Number.isFinite(item.price);

                const lineTotal = hasPrice
                  ? item.price * item.quantity
                  : 0;

                const itemKey = `${item.codeName}-${item.strength}`;

                return (
                  <article
                    key={itemKey}
                    style={cartItemStyle}
                  >
                    <div style={itemVisualStyle}>
                      {item.image ? (
                        <div style={imagePreviewWrapStyle}>
                          <img
                            src={item.image}
                            alt={`${item.name} research product`}
                            style={imagePreviewStyle}
                          />
                        </div>
                      ) : (
                        <div style={placeholderVisualStyle}>
                          <div style={bottleCapStyle}></div>

                          <div style={bottleStyle}>
                            <div style={labelStyle}>
                              <strong>304</strong>

                              <span>{item.codeName}</span>

                              <small>
                                {item.strength}
                              </small>

                              <small style={labelNoticeStyle}>
                                Research Use Only
                              </small>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={itemInfoStyle}>
                      <p style={categoryStyle}>
                        {item.category}
                      </p>

                      <h3 style={itemTitleStyle}>
                        {item.name}
                      </h3>

                      <p style={codeStyle}>
                        {item.codeName} · {item.strength}
                      </p>

                      {item.composition && (
                        <div style={compositionStyle}>
                          <span>Composition</span>

                          <strong>
                            {item.composition}
                          </strong>
                        </div>
                      )}

                      <p style={itemTextStyle}>
                        {item.description}
                      </p>

                      <div style={statusRowStyle}>
                        <span style={statusBadgeStyle}>
                          {item.purity}
                        </span>

                        <span style={statusBadgeStyle}>
                          {item.coaStatus}
                        </span>

                        <span style={statusBadgeStyle}>
                          {item.qrStatus}
                        </span>
                      </div>
                    </div>

                    <div style={itemActionStyle}>
                      <div
                        style={
                          hasPrice
                            ? priceStyle
                            : missingPriceStyle
                        }
                      >
                        <span>Price</span>

                        <strong>
                          {formatPrice(item.price)}
                        </strong>
                      </div>

                      <div style={quantityBoxStyle}>
                        <span>Quantity</span>

                        <div style={quantityControlsStyle}>
                          <button
                            className="secondary-btn"
                            onClick={() =>
                              onDecreaseQuantity(item.name)
                            }
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            −
                          </button>

                          <strong style={quantityValueStyle}>
                            {item.quantity}
                          </strong>

                          <button
                            className="secondary-btn"
                            onClick={() =>
                              onIncreaseQuantity(item.name)
                            }
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div style={lineTotalStyle}>
                        <span>Line Total</span>

                        <strong>
                          {hasPrice
                            ? `$${lineTotal.toFixed(2)}`
                            : "Unavailable"}
                        </strong>
                      </div>

                      <button
                        className="secondary-btn"
                        style={{ width: "100%" }}
                        onClick={() =>
                          onRemoveItem(item.name)
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside style={summaryPanelStyle}>
            <p className="eyebrow">ORDER SUMMARY</p>

            <h2 style={summaryTitleStyle}>
              Summary
            </h2>

            <div style={summaryRowStyle}>
              <span>Total Products</span>

              <strong>{cartItems.length}</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Total Items</span>

              <strong>{totalQuantity}</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Subtotal</span>

              <strong>${subtotal.toFixed(2)}</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Shipping</span>

              <strong>Calculated Later</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Taxes</span>

              <strong>Calculated Later</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Store Status</span>

              <strong>{storeStatusLabel}</strong>
            </div>

            {!purchasingEnabled ? (
              <div style={noticeBoxStyle}>
                Checkout is unavailable while the store is set
                to {storeStatusLabel}.
              </div>
            ) : invalidPriceItems.length > 0 ? (
              <div style={warningSummaryStyle}>
                Remove products without valid pricing before
                continuing to checkout.
              </div>
            ) : (
              <div style={noticeBoxStyle}>
                Shipping and applicable taxes will be calculated
                during checkout.
              </div>
            )}

            {checkoutEnabled ? (
              <button
                className="primary-btn"
                style={{
                  width: "100%",
                  marginTop: "24px",
                }}
                onClick={handleCheckout}
              >
                Continue To Checkout
              </button>
            ) : (
              <button
                type="button"
                style={disabledCheckoutButtonStyle}
                disabled
              >
                {!purchasingEnabled
                  ? "Checkout Unavailable"
                  : "Resolve Cart Items"}
              </button>
            )}

            <button
              className="secondary-btn"
              style={{
                width: "100%",
                marginTop: "14px",
              }}
              onClick={() => onNavigate("products")}
            >
              Continue Shopping
            </button>

            <button
              className="secondary-btn"
              style={{
                width: "100%",
                marginTop: "14px",
              }}
              onClick={() =>
                onNavigate("researchAgreement")
              }
            >
              Research Agreement
            </button>
          </aside>
        </div>

        <div style={researchNoticeStyle}>
          For Research Use Only. Products are not intended for
          human consumption.
        </div>
      </section>
    </main>
  );
}

const emptyPanelStyle = {
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

const heroPanelStyle = {
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.2), transparent 42%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "56px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  marginBottom: "30px",
};

const heroStatusRowStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
};

const titleStyle = {
  fontSize: "62px",
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

const storeNoticeStyle = {
  maxWidth: "760px",
  margin: "24px auto 0",
  padding: "16px 18px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.24)",
  color: "#aeb7bf",
  lineHeight: "1.65",
};

const warningNoticeStyle = {
  maxWidth: "760px",
  margin: "14px auto 0",
  padding: "16px 18px",
  borderRadius: "16px",
  border: "1px solid rgba(61,165,255,0.24)",
  background: "rgba(61,165,255,0.09)",
  color: "#bfe7ff",
  lineHeight: "1.65",
};

const buttonRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "28px",
};

const cartLayoutStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) minmax(320px, 370px)",
  gap: "30px",
  alignItems: "start",
};

const itemsPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.14), transparent 35%), rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "34px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "26px",
};

const sectionTitleStyle = {
  fontSize: "38px",
  lineHeight: "1.12",
  marginBottom: "0",
  background:
    "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const itemStackStyle = {
  display: "grid",
  gap: "20px",
};

const cartItemStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(120px, 140px) minmax(220px, 1fr) minmax(170px, 190px)",
  gap: "22px",
  alignItems: "center",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "24px",
  padding: "22px",
};

const itemVisualStyle = {
  display: "grid",
  justifyContent: "center",
};

const imagePreviewWrapStyle = {
  width: "130px",
  height: "160px",
  borderRadius: "18px",
  overflow: "hidden",
  border: "1px solid rgba(61,165,255,0.2)",
  background:
    "radial-gradient(circle, rgba(61,165,255,0.18), rgba(0,0,0,0.72))",
};

const imagePreviewStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const placeholderVisualStyle = {
  display: "grid",
  justifyContent: "center",
};

const bottleCapStyle = {
  width: "42px",
  height: "20px",
  margin: "0 auto",
  borderRadius: "8px 8px 3px 3px",
  background:
    "linear-gradient(180deg, #d7d7d7, #777)",
};

const bottleStyle = {
  width: "90px",
  height: "132px",
  borderRadius: "22px 22px 28px 28px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.88), rgba(255,255,255,0.34))",
  border: "1px solid rgba(255,255,255,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 22px 55px rgba(0,0,0,0.42)",
};

const labelStyle = {
  width: "70px",
  minHeight: "78px",
  borderRadius: "11px",
  background:
    "linear-gradient(180deg, #050505, #171717)",
  border: "1px solid rgba(61,165,255,0.35)",
  color: "#ffffff",
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  gap: "3px",
  padding: "8px",
  textAlign: "center",
  fontSize: "11px",
};

const labelNoticeStyle = {
  color: "#9ed8ff",
  fontSize: "6px",
  textTransform: "uppercase",
};

const itemInfoStyle = {
  minWidth: 0,
};

const categoryStyle = {
  color: "#9ed8ff",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
  marginBottom: "8px",
};

const itemTitleStyle = {
  color: "#ffffff",
  fontSize: "28px",
  lineHeight: "1.2",
  marginBottom: "6px",
};

const codeStyle = {
  color: "#9ed8ff",
  fontWeight: "900",
  marginBottom: "12px",
};

const itemTextStyle = {
  color: "#c8c8c8",
  lineHeight: "1.7",
  fontSize: "14px",
};

const compositionStyle = {
  display: "grid",
  gap: "4px",
  marginBottom: "13px",
  padding: "11px",
  borderRadius: "12px",
  border: "1px solid rgba(61,165,255,0.18)",
  background: "rgba(61,165,255,0.08)",
  color: "#c8eaff",
  fontSize: "12px",
};

const statusRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "14px",
};

const statusBadgeStyle = {
  padding: "6px 9px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.045)",
  color: "#aeb7bf",
  fontSize: "10px",
  fontWeight: "800",
};

const itemActionStyle = {
  display: "grid",
  gap: "12px",
};

const priceStyle = {
  display: "grid",
  gap: "4px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "14px",
  padding: "13px",
};

const missingPriceStyle = {
  display: "grid",
  gap: "4px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  color: "#c8c8c8",
  borderRadius: "14px",
  padding: "13px",
};

const quantityBoxStyle = {
  display: "grid",
  gap: "9px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  color: "#c8c8c8",
  borderRadius: "14px",
  padding: "13px",
};

const quantityControlsStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  gap: "10px",
  alignItems: "center",
};

const quantityValueStyle = {
  minWidth: "28px",
  color: "#ffffff",
  textAlign: "center",
};

const lineTotalStyle = {
  display: "grid",
  gap: "4px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  color: "#ffffff",
  borderRadius: "14px",
  padding: "13px",
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

const warningSummaryStyle = {
  marginTop: "20px",
  background: "rgba(255,255,255,0.055)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#c8c8c8",
  borderRadius: "16px",
  padding: "16px",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: "1.6",
};

const disabledCheckoutButtonStyle = {
  width: "100%",
  marginTop: "24px",
  padding: "14px 18px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.045)",
  color: "#75818c",
  fontWeight: "900",
  cursor: "not-allowed",
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

export default Cart;
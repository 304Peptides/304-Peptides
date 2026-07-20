import { useEffect, useMemo, useState } from "react";

import {
  calculateOrderTotal,
  calculateShippingFee,
  getFreeShippingRemaining,
} from "../utils/shipping";

const storageKey = "304-site-settings";

const defaultSettings = {
  storeStatus: "coming-soon",
  catalogEnabled: true,
};

function loadSettings() {
  try {
    const savedSettings =
      window.localStorage.getItem(storageKey);

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

function CartResponsiveStyles() {
  return <style>{cartResponsiveCss}</style>;
}

function Cart({
  cartItems = [],
  onNavigate,
  onRemoveItem,
  onClearCart,
  onIncreaseQuantity,
  onDecreaseQuantity,
}) {
  const [settings, setSettings] =
    useState(loadSettings);

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
        (total, item) =>
          total + Number(item.quantity || 0),
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

        const quantity = Number(
          item.quantity || 0
        );

        return total + price * quantity;
      }, 0),
    [cartItems]
  );

  const shippingFee = useMemo(
    () => calculateShippingFee(subtotal),
    [subtotal]
  );

  const orderTotal = useMemo(
    () => calculateOrderTotal(subtotal),
    [subtotal]
  );

  const freeShippingRemaining = useMemo(
    () => getFreeShippingRemaining(subtotal),
    [subtotal]
  );

  const freeShippingThreshold = 100;

  const freeShippingProgress = Math.min(
    Math.max(
      (subtotal / freeShippingThreshold) * 100,
      0
    ),
    100
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
    settings.catalogEnabled &&
    purchasingEnabled &&
    invalidPriceItems.length === 0 &&
    cartItems.length > 0;

  const storeStatusLabel =
    settings.storeStatus === "open"
      ? "Store Open"
      : settings.storeStatus === "maintenance"
      ? "Maintenance Mode"
      : "Coming Soon";

  function getItemKey(item) {
    return `${item.codeName}-${item.strength}`;
  }

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
      <>
        <CartResponsiveStyles />

        <main
          className="cart-page"
          style={pageStyle}
        >
          <section
            className="cart-empty-panel"
            style={emptyPanelStyle}
          >
            <p className="eyebrow">
              CART
            </p>

            <h1
              className="cart-main-title"
              style={titleStyle}
            >
              Your Cart Is Empty
            </h1>

            <p style={subtitleStyle}>
              Browse the research-use catalog and
              select a product to begin.
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

            {!settings.catalogEnabled && (
              <div style={storeNoticeStyle}>
                Product browsing and purchasing are
                currently unavailable because the
                catalog is disabled.
              </div>
            )}

            {settings.catalogEnabled &&
              !purchasingEnabled && (
                <div style={storeNoticeStyle}>
                  Product browsing may remain
                  available, but purchasing is
                  currently disabled while the store
                  status is{" "}
                  <strong>
                    {storeStatusLabel}
                  </strong>
                  .
                </div>
              )}

            <div style={buttonRowStyle}>
              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  onNavigate("products")
                }
              >
                Browse Products
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
                Research Agreement
              </button>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <CartResponsiveStyles />

      <main
        className="cart-page"
        style={pageStyle}
      >
        <section
          className="cart-page-inner"
          style={pageInnerStyle}
        >
          <div
            className="cart-hero-panel"
            style={heroPanelStyle}
          >
            <div style={heroStatusRowStyle}>
              <p className="eyebrow">
                CART
              </p>

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

            <h1
              className="cart-main-title"
              style={titleStyle}
            >
              Review Cart
            </h1>

            <p style={subtitleStyle}>
              Review selected research-use products
              before continuing to checkout.
            </p>

            {!settings.catalogEnabled && (
              <div style={storeNoticeStyle}>
                Your cart remains available, but
                checkout is disabled because the
                product catalog is currently
                unavailable.
              </div>
            )}

            {settings.catalogEnabled &&
              !purchasingEnabled && (
                <div style={storeNoticeStyle}>
                  Your cart remains available, but
                  checkout is disabled while the
                  store status is{" "}
                  <strong>
                    {storeStatusLabel}
                  </strong>
                  .
                </div>
              )}

            {invalidPriceItems.length > 0 && (
              <div style={warningNoticeStyle}>
                {invalidPriceItems.length} cart item
                {invalidPriceItems.length === 1
                  ? ""
                  : "s"}{" "}
                no longer{" "}
                {invalidPriceItems.length === 1
                  ? "has"
                  : "have"}{" "}
                valid pricing. Remove the affected
                item
                {invalidPriceItems.length === 1
                  ? ""
                  : "s"}{" "}
                before checkout.
              </div>
            )}
          </div>

          <div
            className="cart-layout"
            style={cartLayoutStyle}
          >
            <div
              className="cart-items-panel"
              style={itemsPanelStyle}
            >
              <div
                className="cart-section-header"
                style={sectionHeaderStyle}
              >
                <div>
                  <p className="eyebrow">
                    SELECTED PRODUCTS
                  </p>

                  <h2
                    className="cart-section-title"
                    style={sectionTitleStyle}
                  >
                    Cart Items
                  </h2>
                </div>

                <button
                  type="button"
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

                  const quantity = Number(
                    item.quantity || 0
                  );

                  const lineTotal = hasPrice
                    ? item.price * quantity
                    : 0;

                  const itemKey =
                    getItemKey(item);

                  return (
                    <article
                      key={itemKey}
                      className="cart-item"
                      style={cartItemStyle}
                    >
                      <div
                        className="cart-item-visual"
                        style={itemVisualStyle}
                      >
                        {item.image ? (
                          <div
                            className="cart-image-wrapper"
                            style={
                              imagePreviewWrapStyle
                            }
                          >
                            <img
                              src={item.image}
                              alt={`${item.name} research product`}
                              style={
                                imagePreviewStyle
                              }
                            />
                          </div>
                        ) : (
                          <div
                            style={
                              placeholderVisualStyle
                            }
                          >
                            <div
                              style={
                                bottleCapStyle
                              }
                            />

                            <div
                              style={bottleStyle}
                            >
                              <div
                                style={labelStyle}
                              >
                                <strong>
                                  304
                                </strong>

                                <span>
                                  {item.codeName}
                                </span>

                                <small>
                                  {item.strength}
                                </small>

                                <small
                                  style={
                                    labelNoticeStyle
                                  }
                                >
                                  Research Use Only
                                </small>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div
                        className="cart-item-info"
                        style={itemInfoStyle}
                      >
                        <p style={categoryStyle}>
                          {item.category}
                        </p>

                        <h3
                          className="cart-item-title"
                          style={itemTitleStyle}
                        >
                          {item.name}
                        </h3>

                        <p
                          className="cart-item-code"
                          style={codeStyle}
                        >
                          {item.codeName} ·{" "}
                          {item.strength}
                        </p>

                        {item.composition && (
                          <div
                            style={
                              compositionStyle
                            }
                          >
                            <span>
                              Composition
                            </span>

                            <strong>
                              {item.composition}
                            </strong>
                          </div>
                        )}

                        <p
                          className="cart-item-description"
                          style={itemTextStyle}
                        >
                          {item.description}
                        </p>

                        <div
                          style={statusRowStyle}
                        >
                          {item.purity && (
                            <span
                              style={
                                statusBadgeStyle
                              }
                            >
                              {item.purity}
                            </span>
                          )}

                          {item.coaStatus && (
                            <span
                              style={
                                statusBadgeStyle
                              }
                            >
                              {item.coaStatus}
                            </span>
                          )}

                          {item.qrStatus && (
                            <span
                              style={
                                statusBadgeStyle
                              }
                            >
                              {item.qrStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className="cart-item-actions"
                        style={itemActionStyle}
                      >
                        <div
                          style={
                            hasPrice
                              ? priceStyle
                              : missingPriceStyle
                          }
                        >
                          <span>
                            Price
                          </span>

                          <strong>
                            {formatPrice(
                              item.price
                            )}
                          </strong>
                        </div>

                        <div
                          style={
                            quantityBoxStyle
                          }
                        >
                          <span>
                            Quantity
                          </span>

                          <div
                            style={
                              quantityControlsStyle
                            }
                          >
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() =>
                                onDecreaseQuantity(
                                  itemKey
                                )
                              }
                              aria-label={`Decrease ${item.name} ${item.strength} quantity`}
                            >
                              −
                            </button>

                            <strong
                              style={
                                quantityValueStyle
                              }
                            >
                              {quantity}
                            </strong>

                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() =>
                                onIncreaseQuantity(
                                  itemKey
                                )
                              }
                              aria-label={`Increase ${item.name} ${item.strength} quantity`}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div
                          style={lineTotalStyle}
                        >
                          <span>
                            Line Total
                          </span>

                          <strong>
                            {hasPrice
                              ? `$${lineTotal.toFixed(
                                  2
                                )}`
                              : "Unavailable"}
                          </strong>
                        </div>

                        <button
                          type="button"
                          className="secondary-btn cart-remove-button"
                          style={{
                            width: "100%",
                          }}
                          onClick={() =>
                            onRemoveItem(
                              itemKey
                            )
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

            <aside
              className="cart-summary-panel"
              style={summaryPanelStyle}
            >
              <p className="eyebrow">
                ORDER SUMMARY
              </p>

              <h2
                className="cart-summary-title"
                style={summaryTitleStyle}
              >
                Summary
              </h2>

              <div
                className="cart-summary-row"
                style={summaryRowStyle}
              >
                <span>
                  Total Products
                </span>

                <strong>
                  {cartItems.length}
                </strong>
              </div>

              <div
                className="cart-summary-row"
                style={summaryRowStyle}
              >
                <span>
                  Total Items
                </span>

                <strong>
                  {totalQuantity}
                </strong>
              </div>

              <div
                className="cart-summary-row"
                style={summaryRowStyle}
              >
                <span>
                  Subtotal
                </span>

                <strong>
                  ${subtotal.toFixed(2)}
                </strong>
              </div>

              <div
                className="cart-summary-row"
                style={summaryRowStyle}
              >
                <span>
                  Shipping
                </span>

                <strong>
                  {shippingFee === 0
                    ? "FREE"
                    : `$${shippingFee.toFixed(2)}`}
                </strong>
              </div>

              <div
                className="cart-summary-row cart-summary-total-row"
                style={summaryRowStyle}
              >
                <span>
                  Estimated Total
                </span>

                <strong>
                  ${orderTotal.toFixed(2)}
                </strong>
              </div>

              <div
                className="cart-summary-row"
                style={summaryRowStyle}
              >
                <span>
                  Store Status
                </span>

                <strong>
                  {storeStatusLabel}
                </strong>
              </div>

              <div
                className="cart-shipping-progress"
                style={shippingProgressCardStyle}
              >
                <div
                  style={shippingProgressHeaderStyle}
                >
                  <span>Free Shipping</span>

                  <strong>
                    {freeShippingProgress >= 100
                      ? "Unlocked"
                      : `${Math.round(
                          freeShippingProgress
                        )}%`}
                  </strong>
                </div>

                <div
                  className="cart-shipping-progress-bar"
                  style={shippingProgressTrackStyle}
                  aria-label="Free shipping progress"
                >
                  <span
                    className="cart-shipping-progress-fill"
                    style={{
                      ...shippingProgressFillStyle,
                      width: `${freeShippingProgress}%`,
                    }}
                  />
                </div>

                <small
                  style={shippingProgressTextStyle}
                >
                  {freeShippingRemaining > 0
                    ? `$${freeShippingRemaining.toFixed(
                        2
                      )} away from free shipping`
                    : "Your order qualifies for free shipping"}
                </small>
              </div>

              {!settings.catalogEnabled ? (
                <div style={noticeBoxStyle}>
                  Checkout is unavailable while
                  the catalog is disabled.
                </div>
              ) : !purchasingEnabled ? (
                <div style={noticeBoxStyle}>
                  Checkout is unavailable while
                  the store is set to{" "}
                  {storeStatusLabel}.
                </div>
              ) : invalidPriceItems.length >
                0 ? (
                <div
                  style={warningSummaryStyle}
                >
                  Remove products without valid
                  pricing before continuing to
                  checkout.
                </div>
              ) : (
                <div style={noticeBoxStyle}>
                  {freeShippingRemaining > 0
                    ? `Add $${freeShippingRemaining.toFixed(2)} more for free shipping. Orders under $100 include a $15 flat shipping fee.`
                    : "Free shipping unlocked. Orders of $100 or more ship free."}
                </div>
              )}

              {checkoutEnabled ? (
                <button
                  type="button"
                  className="primary-btn cart-checkout-button"
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
                  style={
                    disabledCheckoutButtonStyle
                  }
                  disabled
                >
                  {!settings.catalogEnabled
                    ? "Catalog Unavailable"
                    : !purchasingEnabled
                    ? "Checkout Unavailable"
                    : "Resolve Cart Items"}
                </button>
              )}

              <button
                type="button"
                className="secondary-btn"
                style={{
                  width: "100%",
                  marginTop: "14px",
                }}
                onClick={() =>
                  onNavigate("products")
                }
              >
                Continue Shopping
              </button>

              <button
                type="button"
                className="secondary-btn"
                style={{
                  width: "100%",
                  marginTop: "14px",
                }}
                onClick={() =>
                  onNavigate(
                    "researchAgreement"
                  )
                }
              >
                Research Agreement
              </button>
            </aside>
          </div>

          <div style={researchNoticeStyle}>
            For Research Use Only. Products are
            not intended for human consumption.
          </div>
        </section>
      </main>
    </>
  );
}

const cartResponsiveCss = `
  .cart-page,
  .cart-page *,
  .cart-page *::before,
  .cart-page *::after {
    box-sizing: border-box;
  }

  .cart-page {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  .cart-page-inner,
  .cart-layout,
  .cart-items-panel,
  .cart-summary-panel,
  .cart-item,
  .cart-item > div {
    min-width: 0;
    max-width: 100%;
  }

  .cart-item-title,
  .cart-item-code,
  .cart-item-description,
  .cart-summary-panel span,
  .cart-summary-panel strong {
    overflow-wrap: anywhere;
    word-break: normal;
  }

  .cart-page img {
    display: block;
    max-width: 100%;
  }

  .cart-item {
    transition:
      transform 180ms ease,
      box-shadow 180ms ease,
      border-color 180ms ease;
  }

  .cart-item:hover {
    transform: translateY(-3px);
    border-color:
      rgba(61,165,255,0.34) !important;
    box-shadow:
      0 22px 48px rgba(0,0,0,0.28);
  }

  .cart-item button,
  .cart-summary-panel button {
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease,
      opacity 160ms ease;
  }

  .cart-item button:hover:not(:disabled),
  .cart-summary-panel button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .cart-summary-panel {
    overflow: hidden;
  }

  .cart-summary-row {
    transition:
      transform 160ms ease,
      border-color 160ms ease;
  }

  .cart-summary-row:hover {
    transform: translateX(2px);
    border-color:
      rgba(61,165,255,0.24) !important;
  }

  .cart-summary-total-row {
    background:
      linear-gradient(
        135deg,
        rgba(61,165,255,0.18),
        rgba(61,165,255,0.07)
      ) !important;
    border-color:
      rgba(61,165,255,0.34) !important;
  }

  .cart-summary-total-row strong {
    color: #ffffff;
    font-size: 1.08rem;
  }

  .cart-shipping-progress {
    position: relative;
    overflow: hidden;
  }

  .cart-shipping-progress::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        110deg,
        transparent 20%,
        rgba(255,255,255,0.08) 48%,
        transparent 76%
      );
    transform: translateX(-120%);
    animation:
      cart-progress-shimmer 3.8s ease-in-out
      infinite;
  }

  .cart-shipping-progress-bar {
    overflow: hidden;
  }

  .cart-shipping-progress-fill {
    display: block;
    transition: width 300ms ease;
  }

  .cart-checkout-button {
    min-height: 52px;
    box-shadow:
      0 16px 34px rgba(61,165,255,0.22);
  }

  .cart-checkout-button:hover:not(:disabled) {
    box-shadow:
      0 20px 42px rgba(61,165,255,0.3);
  }

  .cart-remove-button:hover:not(:disabled) {
    border-color:
      rgba(255,120,120,0.36) !important;
  }

  @keyframes cart-progress-shimmer {
    0%,
    55% {
      transform: translateX(-120%);
    }

    100% {
      transform: translateX(120%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cart-item,
    .cart-item button,
    .cart-summary-panel button,
    .cart-summary-row,
    .cart-shipping-progress-fill {
      transition: none !important;
    }

    .cart-shipping-progress::after {
      animation: none !important;
    }
  }

  @media (max-width: 1000px) {
    .cart-page {
      padding: 65px 24px !important;
    }

    .cart-layout {
      grid-template-columns:
        minmax(0, 1fr) !important;
    }

    .cart-summary-panel {
      position: static !important;
      top: auto !important;
      width: 100% !important;
    }

    .cart-item {
      grid-template-columns:
        minmax(110px, 140px)
        minmax(0, 1fr) !important;
    }

    .cart-item-actions {
      grid-column: 1 / -1 !important;
      grid-template-columns:
        repeat(3, minmax(0, 1fr)) !important;
    }

    .cart-item-actions > button {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 700px) {
    .cart-page {
      padding: 44px 14px !important;
    }

    .cart-hero-panel,
    .cart-empty-panel {
      padding: 32px 20px !important;
      border-radius: 22px !important;
    }

    .cart-main-title {
      font-size:
        clamp(38px, 12vw, 52px) !important;
    }

    .cart-items-panel,
    .cart-summary-panel {
      padding: 20px !important;
      border-radius: 22px !important;
    }

    .cart-section-header {
      align-items: stretch !important;
    }

    .cart-section-header > button {
      width: 100%;
    }

    .cart-section-title {
      font-size:
        clamp(30px, 10vw, 38px) !important;
    }

    .cart-item {
      grid-template-columns:
        minmax(0, 1fr) !important;
      gap: 18px !important;
      padding: 18px !important;
      border-radius: 18px !important;
    }

    .cart-item-visual {
      justify-content: center !important;
    }

    .cart-item-actions {
      grid-column: auto !important;
      grid-template-columns:
        minmax(0, 1fr) !important;
    }

    .cart-item-actions > button {
      grid-column: auto;
    }

    .cart-summary-title {
      font-size:
        clamp(28px, 9vw, 34px) !important;
    }
  }

  @media (max-width: 420px) {
    .cart-page {
      padding: 34px 8px !important;
    }

    .cart-hero-panel,
    .cart-empty-panel {
      padding: 26px 15px !important;
    }

    .cart-items-panel,
    .cart-summary-panel {
      padding: 14px !important;
      border-radius: 18px !important;
    }

    .cart-item {
      padding: 14px !important;
    }

    .cart-item-title {
      font-size: 24px !important;
    }

    .cart-page button {
      max-width: 100%;
      white-space: normal;
    }
  }
`;

const pageStyle = {
  padding: "72px 60px",
};

const pageInnerStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
};

const emptyPanelStyle = {
  maxWidth: "900px",
  margin: "0 auto",
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.18), transparent 40%), rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "60px",
  boxShadow:
    "0 30px 80px rgba(0,0,0,0.45)",
};

const heroPanelStyle = {
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61,165,255,0.2), transparent 42%), rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "38px 46px",
  boxShadow:
    "0 26px 70px rgba(0,0,0,0.4)",
  marginBottom: "24px",
};

const heroStatusRowStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
};

const titleStyle = {
  fontSize: "52px",
  lineHeight: "1.05",
  marginBottom: "14px",
  background:
    "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle = {
  maxWidth: "720px",
  margin: "0 auto",
  color: "#c8c8c8",
  fontSize: "16px",
  lineHeight: "1.65",
};

const openStatusStyle = {
  display: "inline-flex",
  width: "fit-content",
  margin: "18px auto 0",
  padding: "9px 13px",
  borderRadius: "999px",
  border:
    "1px solid rgba(61,165,255,0.42)",
  background:
    "rgba(61,165,255,0.17)",
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
  border:
    "1px solid rgba(255,255,255,0.12)",
  background:
    "rgba(255,255,255,0.06)",
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
  border:
    "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.24)",
  color: "#aeb7bf",
  lineHeight: "1.65",
};

const warningNoticeStyle = {
  maxWidth: "760px",
  margin: "14px auto 0",
  padding: "16px 18px",
  borderRadius: "16px",
  border:
    "1px solid rgba(61,165,255,0.24)",
  background:
    "rgba(61,165,255,0.09)",
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
  gap: "24px",
  alignItems: "start",
};

const itemsPanelStyle = {
  minWidth: 0,
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.14), transparent 35%), rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "28px",
  boxShadow:
    "0 26px 70px rgba(0,0,0,0.4)",
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
  gap: "16px",
};

const cartItemStyle = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns:
    "minmax(120px, 140px) minmax(0, 1fr) minmax(170px, 190px)",
  gap: "18px",
  alignItems: "center",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: "22px",
  padding: "18px",
};

const itemVisualStyle = {
  minWidth: 0,
  display: "grid",
  justifyContent: "center",
};

const imagePreviewWrapStyle = {
  width: "130px",
  maxWidth: "100%",
  height: "160px",
  borderRadius: "18px",
  overflow: "hidden",
  border:
    "1px solid rgba(61,165,255,0.2)",
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
  maxWidth: "100%",
  height: "132px",
  borderRadius: "22px 22px 28px 28px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.88), rgba(255,255,255,0.34))",
  border:
    "1px solid rgba(255,255,255,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow:
    "0 22px 55px rgba(0,0,0,0.42)",
};

const labelStyle = {
  width: "70px",
  minHeight: "78px",
  borderRadius: "11px",
  background:
    "linear-gradient(180deg, #050505, #171717)",
  border:
    "1px solid rgba(61,165,255,0.35)",
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
  fontSize: "25px",
  lineHeight: "1.2",
  marginBottom: "6px",
  overflowWrap: "anywhere",
};

const codeStyle = {
  color: "#9ed8ff",
  fontWeight: "900",
  marginBottom: "12px",
  overflowWrap: "anywhere",
};

const itemTextStyle = {
  color: "#c8c8c8",
  lineHeight: "1.7",
  fontSize: "14px",
  overflowWrap: "anywhere",
};

const compositionStyle = {
  display: "grid",
  gap: "4px",
  marginBottom: "13px",
  padding: "11px",
  borderRadius: "12px",
  border:
    "1px solid rgba(61,165,255,0.18)",
  background:
    "rgba(61,165,255,0.08)",
  color: "#c8eaff",
  fontSize: "12px",
  overflowWrap: "anywhere",
};

const statusRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "14px",
};

const statusBadgeStyle = {
  maxWidth: "100%",
  padding: "6px 9px",
  borderRadius: "999px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.045)",
  color: "#aeb7bf",
  fontSize: "10px",
  fontWeight: "800",
  overflowWrap: "anywhere",
};

const itemActionStyle = {
  minWidth: 0,
  display: "grid",
  gap: "12px",
};

const priceStyle = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
  background:
    "rgba(61,165,255,0.12)",
  border:
    "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "14px",
  padding: "13px",
};

const missingPriceStyle = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  color: "#c8c8c8",
  borderRadius: "14px",
  padding: "13px",
};

const quantityBoxStyle = {
  minWidth: 0,
  display: "grid",
  gap: "9px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  color: "#c8c8c8",
  borderRadius: "14px",
  padding: "13px",
};

const quantityControlsStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) auto minmax(0, 1fr)",
  gap: "10px",
  alignItems: "center",
};

const quantityValueStyle = {
  minWidth: "28px",
  color: "#ffffff",
  textAlign: "center",
};

const lineTotalStyle = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  color: "#ffffff",
  borderRadius: "14px",
  padding: "13px",
};

const summaryPanelStyle = {
  minWidth: 0,
  position: "sticky",
  top: "110px",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.2), transparent 38%), rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(61,165,255,0.16)",
  borderRadius: "28px",
  padding: "28px",
  boxShadow:
    "0 28px 76px rgba(0,0,0,0.44)",
};

const summaryTitleStyle = {
  fontSize: "32px",
  lineHeight: "1.12",
  marginBottom: "20px",
  background:
    "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const summaryRowStyle = {
  minWidth: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "10px 18px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: "14px",
  padding: "15px",
  color: "#c8c8c8",
  marginBottom: "12px",
};

const shippingProgressCardStyle = {
  marginTop: "18px",
  padding: "16px",
  borderRadius: "16px",
  border:
    "1px solid rgba(61,165,255,0.26)",
  background:
    "linear-gradient(145deg, rgba(61,165,255,0.14), rgba(61,165,255,0.05))",
};

const shippingProgressHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  marginBottom: "11px",
  color: "#d9f1ff",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.7px",
};

const shippingProgressTrackStyle = {
  width: "100%",
  height: "10px",
  borderRadius: "999px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.38)",
};

const shippingProgressFillStyle = {
  height: "100%",
  borderRadius: "999px",
  background:
    "linear-gradient(90deg, #3da5ff, #9ed8ff)",
  boxShadow:
    "0 0 20px rgba(61,165,255,0.42)",
};

const shippingProgressTextStyle = {
  display: "block",
  marginTop: "10px",
  color: "#aebdca",
  fontSize: "12px",
  lineHeight: "1.5",
};

const noticeBoxStyle = {
  marginTop: "20px",
  background:
    "rgba(61,165,255,0.12)",
  border:
    "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "16px",
  padding: "16px",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: "1.6",
};

const warningSummaryStyle = {
  marginTop: "20px",
  background:
    "rgba(255,255,255,0.055)",
  border:
    "1px solid rgba(255,255,255,0.1)",
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
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.045)",
  color: "#75818c",
  fontWeight: "900",
  cursor: "not-allowed",
};

const researchNoticeStyle = {
  marginTop: "24px",
  textAlign: "center",
  background:
    "rgba(61,165,255,0.12)",
  border:
    "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "18px",
  padding: "16px",
  fontWeight: "900",
  lineHeight: "1.6",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

export default Cart;
import {
  useMemo,
  useState,
} from "react";

import {
  products,
} from "../data/products";

import {
  calculateOrderTotal,
  calculateShippingFee,
} from "../utils/shipping";

function normalizeValue(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

function buildCatalogVariants() {
  return products.flatMap(
    (
      product
    ) => {
      const variants =
        product.variants?.length
          ? product.variants
          : [product];

      return variants.map(
        (
          variant
        ) => ({
          ...product,
          ...variant,

          name:
            variant.name ||
            product.name ||
            "",

          category:
            variant.category ||
            product.category ||
            "",

          codeName:
            variant.codeName ||
            product.codeName ||
            "",

          strength:
            variant.strength ||
            product.strength ||
            "",

          image:
            variant.image ||
            product.image ||
            "",
        })
      );
    }
  );
}

const catalogVariants =
  buildCatalogVariants();

function findCatalogVariant(
  item
) {
  const itemCode =
    normalizeValue(
      item.codeName
    );

  const itemStrength =
    normalizeValue(
      item.strength
    );

  const itemName =
    normalizeValue(
      item.name
    );

  const exactCodeMatch =
    catalogVariants.find(
      (
        variant
      ) =>
        normalizeValue(
          variant.codeName
        ) === itemCode &&
        normalizeValue(
          variant.strength
        ) === itemStrength
    );

  if (
    exactCodeMatch
  ) {
    return exactCodeMatch;
  }

  const exactNameMatch =
    catalogVariants.find(
      (
        variant
      ) =>
        normalizeValue(
          variant.name
        ) === itemName &&
        normalizeValue(
          variant.strength
        ) === itemStrength
    );

  if (
    exactNameMatch
  ) {
    return exactNameMatch;
  }

  const codeMatch =
    catalogVariants.find(
      (
        variant
      ) =>
        normalizeValue(
          variant.codeName
        ) === itemCode
    );

  if (
    codeMatch
  ) {
    return codeMatch;
  }

  return catalogVariants.find(
    (
      variant
    ) =>
      normalizeValue(
        variant.name
      ) === itemName
  );
}

function getOrderItemDetails(
  item
) {
  const catalogItem =
    findCatalogVariant(
      item
    );

  return {
    ...catalogItem,
    ...item,

    name:
      item.name ||
      catalogItem?.name ||
      "Research Product",

    category:
      item.category ||
      catalogItem?.category ||
      "Research Product",

    codeName:
      item.codeName ||
      catalogItem?.codeName ||
      "",

    strength:
      item.strength ||
      catalogItem?.strength ||
      "",

    image:
      item.image ||
      catalogItem?.image ||
      "",
  };
}

function formatMoney(
  amount
) {
  const numericAmount =
    Number(
      amount
    );

  return Number.isFinite(
    numericAmount
  )
    ? numericAmount.toLocaleString(
        "en-US",
        {
          style:
            "currency",

          currency:
            "USD",
        }
      )
    : "$0.00";
}

function formatOrderDate(
  value
) {
  if (
    !value
  ) {
    return new Date().toLocaleDateString(
      "en-US",
      {
        month:
          "long",

        day:
          "numeric",

        year:
          "numeric",
      }
    );
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "long",

      day:
        "numeric",

      year:
        "numeric",
    }
  );
}

function OrderConfirmation({
  onNavigate = () => {},
  latestOrder,
}) {
  const rawItems = useMemo(
    () => latestOrder?.items || latestOrder?.cartItems || [],
    [latestOrder]
  );

  const items = useMemo(
    () => rawItems.map(getOrderItemDetails),
    [rawItems]
  );

  const [copyStatus, setCopyStatus] = useState("");

  if (
    !latestOrder
  ) {
    return (
      <>
        <style>
          {
            orderConfirmationCss
          }
        </style>

        <main className="confirmation-page">
          <section className="confirmation-empty-panel">
            <p className="eyebrow">
              ORDER
              CONFIRMATION
            </p>

            <h1>
              No Recent Order
            </h1>

            <p>
              Submit an order
              request to view
              its confirmation
              details.
            </p>

            <div className="confirmation-button-row">
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

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "dashboard"
                  )
                }
              >
                Account
              </button>
            </div>
          </section>
        </main>
      </>
    );
  }

  const calculatedMerchandiseSubtotal =
    items.reduce(
      (
        total,
        item
      ) => {
        const price =
          Number(
            item.price ||
              0
          );

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
    );

  const merchandiseSubtotal =
    Number.isFinite(
      Number(
        latestOrder.merchandiseSubtotal
      )
    )
      ? Number(
          latestOrder.merchandiseSubtotal
        )
      : calculatedMerchandiseSubtotal;

  const discount =
    Number.isFinite(
      Number(
        latestOrder.discount
      )
    )
      ? Math.max(
          0,
          Number(
            latestOrder.discount
          )
        )
      : 0;

  const discountedSubtotal =
    Number.isFinite(
      Number(
        latestOrder.subtotal
      )
    )
      ? Number(
          latestOrder.subtotal
        )
      : Math.max(
          0,
          merchandiseSubtotal -
            discount
        );

  const shippingFee =
    Number.isFinite(
      Number(latestOrder.shippingFee)
    )
      ? Number(latestOrder.shippingFee)
      : calculateShippingFee(
          discountedSubtotal
        );

  const orderTotal =
    Number.isFinite(
      Number(latestOrder.total)
    )
      ? Number(latestOrder.total)
      : discountedSubtotal +
        shippingFee;

  const totalQuantity =
    latestOrder.totalQuantity ||
    items.reduce(
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
    );

  const customer =
    latestOrder.customer ||
    latestOrder;

  const customerName =
    customer.firstName ||
    customer.lastName
      ? `${customer.firstName || ""} ${
          customer.lastName || ""
        }`.trim()
      : "Not available";

  const customerEmail =
    customer.email ||
    "Not available";

  const addressParts = [
    customer.address,
    customer.city,
    customer.state,
    customer.zip,
  ].filter(Boolean);

  const customerAddress =
    addressParts.length >
    0
      ? [
          customer.address,

          [
            customer.city,
            customer.state,
          ]
            .filter(
              Boolean
            )
            .join(
              ", "
            ),

          customer.zip,
        ]
          .filter(
            Boolean
          )
          .join(
            " "
          )
      : "Not available";

  const orderNumber =
    latestOrder.orderId ||
    latestOrder.id ||
    "Pending";

  const orderStatus =
    latestOrder.status ||
    "Order Request Received";

  const orderDate =
    formatOrderDate(
      latestOrder.date ||
      latestOrder.createdAt ||
      latestOrder.submittedAt
    );

  const paymentLabel =
    latestOrder.preferredPaymentLabel ||
    latestOrder.paymentLabel ||
    "Not selected";

  const couponCode =
    latestOrder.couponCode ||
    "";

  const referralCode =
    latestOrder.referralCode ||
    "";

  async function handleCopyOrderNumber() {
    try {
      await navigator.clipboard.writeText(
        String(orderNumber)
      );
      setCopyStatus("Copied");
      window.setTimeout(
        () => setCopyStatus(""),
        1800
      );
    } catch {
      setCopyStatus("Copy failed");
      window.setTimeout(
        () => setCopyStatus(""),
        1800
      );
    }
  }

  return (
    <>
      <style>
        {
          orderConfirmationCss
        }
      </style>

      <main className="confirmation-page">
        <section className="confirmation-inner">
          <header className="confirmation-success-panel">
            <div className="confirmation-success-top">
              <div className="confirmation-check-icon">
                ✓
              </div>

              <div className="confirmation-success-copy">
                <p className="eyebrow">
                  ORDER REQUEST RECEIVED
                </p>

                <h1>Request Submitted</h1>

                <p>
                  We received your order request. Watch{" "}
                  <strong>{customerEmail}</strong> for the
                  invoice and payment instructions after
                  review.
                </p>
              </div>

              <div className="confirmation-order-id-card">
                <span>Order Number</span>
                <strong>{orderNumber}</strong>

                <button
                  type="button"
                  className="confirmation-copy-button"
                  onClick={handleCopyOrderNumber}
                >
                  {copyStatus || "Copy Number"}
                </button>
              </div>
            </div>

            <div className="confirmation-next-steps">
              <div>
                <span>1</span>
                <strong>Request Received</strong>
                <small>Your order details were recorded.</small>
              </div>

              <div>
                <span>2</span>
                <strong>Invoice Review</strong>
                <small>Pricing and availability are confirmed.</small>
              </div>

              <div>
                <span>3</span>
                <strong>Payment Instructions</strong>
                <small>Instructions are sent to your email.</small>
              </div>
            </div>
          </header>

          <div className="confirmation-layout">
            <section className="confirmation-details-panel">
              <div className="confirmation-section-heading">
                <div>
                  <p className="eyebrow">ORDER DETAILS</p>
                  <h2>Confirmation Summary</h2>
                </div>

                <button
                  type="button"
                  className="secondary-btn confirmation-print-button"
                  onClick={() => window.print()}
                >
                  Print Confirmation
                </button>
              </div>

              <div className="confirmation-summary-grid">
                <SummaryBox
                  label="Order Date"
                  value={orderDate}
                />

                <SummaryBox
                  label="Status"
                  value={orderStatus}
                />

                <SummaryBox
                  label="Total Items"
                  value={totalQuantity}
                />

                <SummaryBox
                  label="Payment Preference"
                  value={paymentLabel}
                />
              </div>

              <section className="confirmation-customer-panel">
                <div className="confirmation-panel-heading">
                  <div>
                    <p className="eyebrow">
                      SHIPPING INFORMATION
                    </p>
                    <h2>Delivery Details</h2>
                  </div>

                  <span className="confirmation-status-pill">
                    Address Recorded
                  </span>
                </div>

                <div className="confirmation-customer-grid">
                  <SummaryBox
                    label="Name"
                    value={customerName}
                  />

                  <SummaryBox
                    label="Email"
                    value={customerEmail}
                  />

                  <div className="confirmation-address-box">
                    <span>Shipping Address</span>
                    <strong>{customerAddress}</strong>
                  </div>
                </div>
              </section>

              <section className="confirmation-items-panel">
                <div className="confirmation-panel-heading">
                  <div>
                    <p className="eyebrow">
                      PRODUCTS ORDERED
                    </p>
                    <h2>Research Products</h2>
                  </div>

                  <span className="confirmation-status-pill">
                    {items.length}{" "}
                    {items.length === 1
                      ? "Product"
                      : "Products"}
                  </span>
                </div>

                {items.length > 0 ? (
                  <div className="confirmation-item-stack">
                    {items.map(
                      (
                        item,
                        index
                      ) => {
                        const quantity =
                          Number(
                            item.quantity ||
                              0
                          );

                        const price =
                          Number(
                            item.price ||
                              0
                          );

                        const lineTotal =
                          price *
                          quantity;

                        return (
                          <article
                            key={`${item.codeName}-${item.strength}-${index}`}
                            className="confirmation-item-card"
                          >
                            <ProductImage
                              item={item}
                            />

                            <div className="confirmation-item-copy">
                              <p className="confirmation-category">
                                {item.category}
                              </p>

                              <h3>{item.name}</h3>

                              <p>
                                {item.codeName}
                                {item.codeName &&
                                item.strength
                                  ? " · "
                                  : ""}
                                {item.strength}
                              </p>

                              <div className="confirmation-item-meta">
                                <span>
                                  Qty {quantity}
                                </span>

                                <span>
                                  {formatMoney(
                                    price
                                  )}{" "}
                                  each
                                </span>
                              </div>
                            </div>

                            <div className="confirmation-line-total">
                              <span>Line Total</span>
                              <strong>
                                {formatMoney(
                                  lineTotal
                                )}
                              </strong>
                            </div>
                          </article>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="confirmation-no-items">
                    Product details were not included with
                    this order record.
                  </div>
                )}
              </section>
            </section>

            <aside className="confirmation-side-panel">
              <p className="eyebrow">
                ORDER TOTAL
              </p>

              <div className="confirmation-total-display">
                <span>Estimated Total</span>
                <strong>
                  {formatMoney(orderTotal)}
                </strong>
              </div>

              <div className="confirmation-price-breakdown">
                <SummaryRow
                  label="Products"
                  value={items.length}
                />

                <SummaryRow
                  label="Total Items"
                  value={totalQuantity}
                />

                <SummaryRow
                  label="Merchandise"
                  value={formatMoney(
                    merchandiseSubtotal
                  )}
                />

                {discount > 0 && (
                  <SummaryRow
                    label="Discount"
                    value={`-${formatMoney(
                      discount
                    )}`}
                  />
                )}

                <SummaryRow
                  label="Product Total"
                  value={formatMoney(
                    discountedSubtotal
                  )}
                />

                <SummaryRow
                  label="Shipping"
                  value={
                    shippingFee === 0
                      ? "FREE"
                      : formatMoney(
                          shippingFee
                        )
                  }
                />
              </div>

              {(couponCode || referralCode) && (
                <div className="confirmation-code-panel">
                  {couponCode && (
                    <div>
                      <span>Coupon</span>
                      <strong>{couponCode}</strong>
                    </div>
                  )}

                  {referralCode && (
                    <div>
                      <span>Affiliate Code</span>
                      <strong>{referralCode}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="confirmation-grand-total">
                <span>Order Total</span>
                <strong>
                  {formatMoney(orderTotal)}
                </strong>
              </div>

              <div className="confirmation-notice-box">
                <strong>
                  No payment was collected.
                </strong>

                <span>
                  Review the invoice sent by email before
                  using the provided payment instructions.
                </span>
              </div>

              <button
                type="button"
                className="primary-btn confirmation-full-button"
                onClick={() =>
                  onNavigate(
                    "dashboard"
                  )
                }
              >
                View My Account
              </button>

              <button
                type="button"
                className="secondary-btn confirmation-full-button"
                onClick={() =>
                  onNavigate(
                    "products"
                  )
                }
              >
                Continue Shopping
              </button>
            </aside>
          </div>

          <div className="confirmation-research-notice">
            <span>RESEARCH USE ONLY</span>
            Products are not intended for human consumption.
          </div>
        </section>
      </main>
    </>
  );
}

function ProductImage({
  item,
}) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false);

  const imageAvailable =
    Boolean(
      item.image
    ) &&
    !imageFailed;

  return (
    <div className="confirmation-product-image-wrap">
      {imageAvailable ? (
        <img
          src={
            item.image
          }
          alt={`${item.name}${
            item.strength
              ? ` ${item.strength}`
              : ""
          } vial`}
          loading="lazy"
          onError={() =>
            setImageFailed(
              true
            )
          }
        />
      ) : (
        <div className="confirmation-image-fallback">
          <strong>
            304
          </strong>

          <span>
            {item.codeName ||
              "PRODUCT"}
          </span>
        </div>
      )}
    </div>
  );
}

function SummaryBox({
  label,
  value,
}) {
  return (
    <div className="confirmation-summary-box">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}) {
  return (
    <div className="confirmation-summary-row">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

const orderConfirmationCss = `
  /* 304 ORDER CONFIRMATION EXPERIENCE UPGRADE */

  .confirmation-page,
  .confirmation-page *,
  .confirmation-page *::before,
  .confirmation-page *::after {
    box-sizing: border-box;
  }

  .confirmation-page {
    width: 100%;
    max-width: 100%;
    padding: 52px 36px 70px;
    overflow-x: hidden;
  }

  .confirmation-inner {
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
  }

  .confirmation-empty-panel,
  .confirmation-success-panel,
  .confirmation-details-panel,
  .confirmation-side-panel {
    border: 1px solid rgba(255,255,255,0.09);
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.13),
        transparent 38%
      ),
      rgba(255,255,255,0.035);
    box-shadow: 0 24px 70px rgba(0,0,0,0.38);
  }

  .confirmation-empty-panel {
    max-width: 820px;
    margin: 30px auto;
    padding: 48px;
    border-radius: 28px;
    text-align: center;
  }

  .confirmation-empty-panel h1 {
    margin: 8px 0 14px;
    font-size: clamp(38px, 6vw, 54px);
    line-height: 1.05;
    color: #ffffff;
  }

  .confirmation-empty-panel > p:not(.eyebrow) {
    max-width: 620px;
    margin: 0 auto;
    color: #c8c8c8;
    font-size: 17px;
    line-height: 1.7;
  }

  .confirmation-button-row {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 24px;
  }

  .confirmation-success-panel {
    margin-bottom: 22px;
    padding: 28px;
    border-radius: 26px;
  }

  .confirmation-success-top {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) minmax(220px, 280px);
    gap: 22px;
    align-items: center;
  }

  .confirmation-check-icon {
    width: 68px;
    height: 68px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(61,165,255,0.38);
    border-radius: 20px;
    background:
      linear-gradient(
        145deg,
        rgba(61,165,255,0.22),
        rgba(61,165,255,0.08)
      );
    color: #bce7ff;
    font-size: 34px;
    font-weight: 900;
    box-shadow: 0 14px 36px rgba(61,165,255,0.13);
  }

  .confirmation-success-copy {
    min-width: 0;
  }

  .confirmation-success-copy h1 {
    margin: 5px 0 8px;
    color: #ffffff;
    font-size: clamp(34px, 5vw, 50px);
    line-height: 1.02;
  }

  .confirmation-success-copy > p:not(.eyebrow) {
    max-width: 650px;
    margin: 0;
    color: #c8c8c8;
    font-size: 15px;
    line-height: 1.65;
  }

  .confirmation-success-copy strong {
    color: #ffffff;
    overflow-wrap: anywhere;
  }

  .confirmation-order-id-card {
    min-width: 0;
    display: grid;
    gap: 6px;
    padding: 16px;
    border: 1px solid rgba(61,165,255,0.25);
    border-radius: 18px;
    background: rgba(61,165,255,0.09);
  }

  .confirmation-order-id-card > span,
  .confirmation-total-display > span,
  .confirmation-line-total > span,
  .confirmation-code-panel span,
  .confirmation-grand-total > span {
    color: #9ed8ff;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.9px;
  }

  .confirmation-order-id-card > strong {
    color: #ffffff;
    font-size: 16px;
    overflow-wrap: anywhere;
  }

  .confirmation-copy-button {
    width: 100%;
    margin-top: 5px;
    padding: 9px 12px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 10px;
    background: rgba(61,165,255,0.12);
    color: #bce7ff;
    font-weight: 900;
    cursor: pointer;
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      background 160ms ease;
  }

  .confirmation-copy-button:hover {
    transform: translateY(-1px);
    border-color: rgba(61,165,255,0.52);
    background: rgba(61,165,255,0.18);
  }

  .confirmation-next-steps {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-top: 22px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.07);
  }

  .confirmation-next-steps > div {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 10px;
    align-items: center;
    padding: 12px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    background: rgba(0,0,0,0.12);
  }

  .confirmation-next-steps > div > span {
    grid-row: 1 / 3;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: rgba(61,165,255,0.14);
    color: #9ed8ff;
    font-weight: 900;
  }

  .confirmation-next-steps strong {
    color: #ffffff;
    font-size: 13px;
  }

  .confirmation-next-steps small {
    margin-top: 2px;
    color: #8f9ca6;
    font-size: 11px;
    line-height: 1.4;
  }

  .confirmation-layout {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(315px, 350px);
    gap: 22px;
    align-items: start;
  }

  .confirmation-details-panel,
  .confirmation-side-panel {
    min-width: 0;
    padding: 26px;
    border-radius: 26px;
  }

  .confirmation-section-heading,
  .confirmation-panel-heading {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
  }

  .confirmation-section-heading {
    margin-bottom: 18px;
  }

  .confirmation-panel-heading {
    margin-bottom: 16px;
  }

  .confirmation-section-heading h2,
  .confirmation-panel-heading h2 {
    margin: 5px 0 0;
    color: #ffffff;
    font-size: clamp(24px, 3vw, 32px);
    line-height: 1.1;
  }

  .confirmation-print-button {
    flex: 0 0 auto;
    padding: 10px 14px;
  }

  .confirmation-summary-grid,
  .confirmation-customer-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .confirmation-summary-grid {
    margin-bottom: 18px;
  }

  .confirmation-summary-box,
  .confirmation-address-box {
    min-width: 0;
    display: grid;
    gap: 5px;
    padding: 13px 14px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    background: rgba(255,255,255,0.035);
    overflow-wrap: anywhere;
  }

  .confirmation-summary-box span,
  .confirmation-address-box span {
    color: #8dcdf5;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.75px;
  }

  .confirmation-summary-box strong,
  .confirmation-address-box strong {
    color: #ffffff;
    font-size: 14px;
    line-height: 1.45;
  }

  .confirmation-customer-panel,
  .confirmation-items-panel {
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    background: rgba(255,255,255,0.025);
  }

  .confirmation-customer-panel {
    margin-bottom: 18px;
  }

  .confirmation-status-pill {
    flex: 0 0 auto;
    padding: 7px 10px;
    border: 1px solid rgba(61,165,255,0.22);
    border-radius: 999px;
    background: rgba(61,165,255,0.08);
    color: #9ed8ff;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.65px;
  }

  .confirmation-address-box {
    grid-column: 1 / -1;
    border-color: rgba(61,165,255,0.2);
    background: rgba(61,165,255,0.07);
  }

  .confirmation-item-stack {
    display: grid;
    gap: 10px;
  }

  .confirmation-item-card {
    min-width: 0;
    display: grid;
    grid-template-columns:
      78px minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    padding: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    background: rgba(255,255,255,0.035);
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      background 160ms ease;
  }

  .confirmation-item-card:hover {
    transform: translateY(-1px);
    border-color: rgba(61,165,255,0.2);
    background: rgba(61,165,255,0.045);
  }

  .confirmation-product-image-wrap {
    width: 78px;
    height: 94px;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 13px;
    background:
      radial-gradient(
        circle at center,
        rgba(61,165,255,0.12),
        transparent 68%
      ),
      rgba(0,0,0,0.15);
  }

  .confirmation-product-image-wrap img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    padding: 6px;
  }

  .confirmation-image-fallback {
    width: 62px;
    min-height: 56px;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 3px;
    padding: 7px;
    border: 1px solid rgba(61,165,255,0.3);
    border-radius: 10px;
    background:
      linear-gradient(
        180deg,
        #050505,
        #171717
      );
    color: #ffffff;
    text-align: center;
  }

  .confirmation-image-fallback strong {
    color: #9ed8ff;
    font-size: 16px;
  }

  .confirmation-image-fallback span {
    max-width: 100%;
    font-size: 8px;
    overflow-wrap: anywhere;
  }

  .confirmation-item-copy {
    min-width: 0;
  }

  .confirmation-category {
    margin: 0 0 4px;
    color: #8dcdf5;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.9px;
  }

  .confirmation-item-copy h3 {
    margin: 0 0 4px;
    color: #ffffff;
    font-size: 18px;
    overflow-wrap: anywhere;
  }

  .confirmation-item-copy > p:not(.confirmation-category) {
    margin: 0;
    color: #9ca6ae;
    font-size: 12px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .confirmation-item-meta {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
    margin-top: 7px;
  }

  .confirmation-item-meta span {
    padding: 4px 7px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    background: rgba(0,0,0,0.13);
    color: #c7d0d7;
    font-size: 10px;
    font-weight: 800;
  }

  .confirmation-line-total {
    min-width: 90px;
    display: grid;
    gap: 3px;
    justify-items: end;
    text-align: right;
  }

  .confirmation-line-total strong {
    color: #bce7ff;
    font-size: 18px;
    white-space: nowrap;
  }

  .confirmation-no-items {
    padding: 18px;
    border: 1px dashed rgba(255,255,255,0.14);
    border-radius: 14px;
    color: #9ca6ae;
    line-height: 1.6;
    text-align: center;
  }

  .confirmation-side-panel {
    position: sticky;
    top: 104px;
  }

  .confirmation-total-display {
    display: grid;
    gap: 5px;
    margin: 7px 0 17px;
  }

  .confirmation-total-display strong {
    color: #bce7ff;
    font-size: clamp(38px, 5vw, 48px);
    line-height: 1;
  }

  .confirmation-price-breakdown {
    display: grid;
    gap: 0;
    padding: 4px 0;
    border-top: 1px solid rgba(255,255,255,0.07);
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  .confirmation-summary-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 9px 0;
    color: #aeb8c0;
    font-size: 13px;
  }

  .confirmation-summary-row strong {
    color: #ffffff;
    text-align: right;
    overflow-wrap: anywhere;
  }

  .confirmation-code-panel {
    display: grid;
    gap: 8px;
    margin-top: 13px;
  }

  .confirmation-code-panel > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid rgba(61,165,255,0.16);
    border-radius: 12px;
    background: rgba(61,165,255,0.05);
  }

  .confirmation-code-panel strong {
    color: #ffffff;
    font-size: 12px;
    overflow-wrap: anywhere;
    text-align: right;
  }

  .confirmation-grand-total {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-end;
    margin-top: 15px;
    padding: 14px;
    border: 1px solid rgba(61,165,255,0.26);
    border-radius: 15px;
    background:
      linear-gradient(
        135deg,
        rgba(61,165,255,0.15),
        rgba(61,165,255,0.06)
      );
  }

  .confirmation-grand-total strong {
    color: #ffffff;
    font-size: 22px;
    white-space: nowrap;
  }

  .confirmation-notice-box {
    display: grid;
    gap: 5px;
    margin-top: 14px;
    padding: 13px;
    border: 1px solid rgba(61,165,255,0.2);
    border-radius: 14px;
    background: rgba(61,165,255,0.07);
    color: #acdfff;
    font-size: 12px;
    line-height: 1.55;
  }

  .confirmation-notice-box strong {
    color: #ffffff;
  }

  .confirmation-full-button {
    width: 100%;
    margin-top: 10px;
  }

  .confirmation-side-panel .primary-btn {
    margin-top: 18px;
  }

  .confirmation-research-notice {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 22px;
    padding: 13px 18px;
    border: 1px solid rgba(61,165,255,0.18);
    border-radius: 14px;
    background: rgba(61,165,255,0.06);
    color: #b7c9d5;
    font-size: 11px;
    font-weight: 800;
    text-align: center;
  }

  .confirmation-research-notice span {
    color: #9ed8ff;
    font-weight: 900;
  }

  @media (max-width: 1000px) {
    .confirmation-page {
      padding: 42px 22px 60px;
    }

    .confirmation-success-top {
      grid-template-columns:
        auto minmax(0, 1fr);
    }

    .confirmation-order-id-card {
      grid-column: 1 / -1;
    }

    .confirmation-layout {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .confirmation-side-panel {
      position: static;
    }
  }

  @media (max-width: 720px) {
    .confirmation-page {
      padding: 32px 12px 46px;
    }

    .confirmation-success-panel,
    .confirmation-details-panel,
    .confirmation-side-panel {
      padding: 18px;
      border-radius: 20px;
    }

    .confirmation-success-top {
      grid-template-columns:
        minmax(0, 1fr);
      text-align: center;
    }

    .confirmation-check-icon {
      margin: 0 auto;
    }

    .confirmation-next-steps {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .confirmation-section-heading,
    .confirmation-panel-heading {
      flex-direction: column;
    }

    .confirmation-print-button,
    .confirmation-status-pill {
      align-self: stretch;
      text-align: center;
    }

    .confirmation-summary-grid,
    .confirmation-customer-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .confirmation-address-box {
      grid-column: auto;
    }

    .confirmation-item-card {
      grid-template-columns:
        68px minmax(0, 1fr);
    }

    .confirmation-product-image-wrap {
      width: 68px;
      height: 84px;
    }

    .confirmation-line-total {
      grid-column: 2;
      justify-items: start;
      text-align: left;
    }
  }

  @media (max-width: 480px) {
    .confirmation-page {
      padding: 24px 8px 38px;
    }

    .confirmation-empty-panel,
    .confirmation-success-panel,
    .confirmation-details-panel,
    .confirmation-side-panel,
    .confirmation-customer-panel,
    .confirmation-items-panel {
      padding: 14px;
    }

    .confirmation-item-card {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .confirmation-product-image-wrap {
      width: 100%;
      height: 150px;
    }

    .confirmation-line-total {
      grid-column: auto;
    }

    .confirmation-grand-total {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media print {
    .confirmation-page {
      padding: 0;
      color: #000000;
    }

    .confirmation-print-button,
    .confirmation-full-button,
    .confirmation-copy-button {
      display: none !important;
    }

    .confirmation-success-panel,
    .confirmation-details-panel,
    .confirmation-side-panel,
    .confirmation-customer-panel,
    .confirmation-items-panel,
    .confirmation-summary-box,
    .confirmation-address-box,
    .confirmation-item-card {
      box-shadow: none;
      break-inside: avoid;
    }

    .confirmation-side-panel {
      position: static;
    }
  }
`;

export default OrderConfirmation;
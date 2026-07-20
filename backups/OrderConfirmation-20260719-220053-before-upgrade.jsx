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

  const subtotal =
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

  const shippingFee =
    Number.isFinite(
      Number(latestOrder.shippingFee)
    )
      ? Number(latestOrder.shippingFee)
      : calculateShippingFee(subtotal);

  const orderTotal =
    Number.isFinite(
      Number(latestOrder.total)
    )
      ? Number(latestOrder.total)
      : calculateOrderTotal(subtotal);

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
            <div className="confirmation-check-icon">
              ✓
            </div>

            <p className="eyebrow">
              ORDER REQUEST
              RECEIVED
            </p>

            <h1>
              Thank You
            </h1>

            <p>
              Your order
              request was
              successfully
              submitted. Review
              the details below
              and watch your
              email for the
              invoice and
              payment
              instructions.
            </p>

            <div className="confirmation-order-number">
              Order #
              {
                orderNumber
              }
            </div>
          </header>

          <div className="confirmation-layout">
            <section className="confirmation-details-panel">
              <p className="eyebrow">
                ORDER DETAILS
              </p>

              <h2>
                Order Summary
              </h2>

              <div className="confirmation-summary-grid">
                <SummaryBox
                  label="Order Number"
                  value={
                    orderNumber
                  }
                />

                <SummaryBox
                  label="Order Date"
                  value={
                    orderDate
                  }
                />

                <SummaryBox
                  label="Status"
                  value={
                    orderStatus
                  }
                />

                <SummaryBox
                  label="Total Items"
                  value={
                    totalQuantity
                  }
                />
              </div>

              <section className="confirmation-customer-panel">
                <p className="eyebrow">
                  CUSTOMER
                  INFORMATION
                </p>

                <h2>
                  Shipping
                  Details
                </h2>

                <div className="confirmation-customer-grid">
                  <SummaryBox
                    label="Name"
                    value={
                      customerName
                    }
                  />

                  <SummaryBox
                    label="Email"
                    value={
                      customerEmail
                    }
                  />

                  <div className="confirmation-address-box">
                    <span>
                      Shipping
                      Address
                    </span>

                    <strong>
                      {
                        customerAddress
                      }
                    </strong>
                  </div>
                </div>
              </section>

              <section className="confirmation-items-panel">
                <p className="eyebrow">
                  PRODUCTS
                  ORDERED
                </p>

                <h2>
                  Research
                  Products
                </h2>

                {items.length >
                0 ? (
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
                              item={
                                item
                              }
                            />

                            <div className="confirmation-item-copy">
                              <p className="confirmation-category">
                                {
                                  item.category
                                }
                              </p>

                              <h3>
                                {
                                  item.name
                                }
                              </h3>

                              <p>
                                {
                                  item.codeName
                                }

                                {item.codeName &&
                                item.strength
                                  ? " · "
                                  : ""}

                                {
                                  item.strength
                                }
                              </p>

                              <p>
                                Quantity:{" "}
                                {
                                  quantity
                                }{" "}
                                ·{" "}
                                {
                                  formatMoney(
                                    price
                                  )
                                }{" "}
                                each
                              </p>
                            </div>

                            <strong className="confirmation-line-total">
                              {
                                formatMoney(
                                  lineTotal
                                )
                              }
                            </strong>
                          </article>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="confirmation-no-items">
                    Product
                    details were
                    not included
                    with this
                    order record.
                  </div>
                )}
              </section>
            </section>

            <aside className="confirmation-side-panel">
              <p className="eyebrow">
                PRODUCT
                SUBTOTAL
              </p>

              <h2>
                {formatMoney(orderTotal)}
              </h2>

              <SummaryRow
                label="Products"
                value={
                  items.length
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
                value={
                  formatMoney(
                    subtotal
                  )
                }
              />

              <SummaryRow
                label="Shipping"
                value={
                  shippingFee === 0
                    ? "FREE"
                    : formatMoney(shippingFee)
                }
              />

              <SummaryRow
                label="Order Total"
                value={formatMoney(orderTotal)}
              />

              <SummaryRow
                label="Payment Preference"
                value={
                  paymentLabel
                }
              />

              <div className="confirmation-notice-box">
                <strong>
                  Payment has
                  not been
                  collected.
                </strong>

                <span>
                  Shipping is $15 for product subtotals under $100 and free at $100 or more. Review the invoice before sending payment.
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
                Open Research
                Hub
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
                Continue
                Shopping
              </button>

              <button
                type="button"
                className="secondary-btn confirmation-full-button"
                onClick={() =>
                  onNavigate(
                    "researchAgreement"
                  )
                }
              >
                Research
                Agreement
              </button>
            </aside>
          </div>

          <div className="confirmation-research-notice">
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
  .confirmation-page,
  .confirmation-page *,
  .confirmation-page *::before,
  .confirmation-page *::after {
    box-sizing: border-box;
  }

  .confirmation-page {
    width: 100%;
    max-width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .confirmation-inner {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .confirmation-empty-panel,
  .confirmation-success-panel {
    padding: 60px;
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
      0 30px 90px rgba(0,0,0,0.5);
    text-align: center;
  }

  .confirmation-empty-panel {
    max-width: 900px;
    margin: 0 auto;
  }

  .confirmation-success-panel {
    margin-bottom: 30px;
  }

  .confirmation-empty-panel h1,
  .confirmation-success-panel h1 {
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

  .confirmation-empty-panel > p:not(.eyebrow),
  .confirmation-success-panel > p:not(.eyebrow) {
    max-width: 780px;
    margin: 0 auto;
    color: #c8c8c8;
    font-size: 19px;
    line-height: 1.8;
  }

  .confirmation-button-row {
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 28px;
  }

  .confirmation-check-icon {
    width: 86px;
    height: 86px;
    display: grid;
    place-items: center;
    margin: 0 auto 24px;
    border: 1px solid rgba(61,165,255,0.35);
    border-radius: 50%;
    background: rgba(61,165,255,0.14);
    color: #9ed8ff;
    font-size: 46px;
    font-weight: 900;
  }

  .confirmation-order-number {
    display: inline-flex;
    margin-top: 30px;
    padding: 15px 24px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 999px;
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
    font-size: 20px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .confirmation-layout {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(330px, 370px);
    gap: 30px;
    align-items: start;
  }

  .confirmation-details-panel,
  .confirmation-side-panel {
    min-width: 0;
    padding: 38px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 30px;
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

  .confirmation-details-panel > h2,
  .confirmation-customer-panel > h2,
  .confirmation-items-panel > h2 {
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

  .confirmation-summary-grid,
  .confirmation-customer-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .confirmation-summary-grid {
    margin-bottom: 30px;
  }

  .confirmation-summary-box,
  .confirmation-address-box {
    min-width: 0;
    display: grid;
    gap: 6px;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(255,255,255,0.045);
    color: #c8c8c8;
    overflow-wrap: anywhere;
  }

  .confirmation-summary-box span,
  .confirmation-address-box span {
    color: #9ed8ff;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .confirmation-summary-box strong,
  .confirmation-address-box strong {
    color: #ffffff;
    line-height: 1.5;
  }

  .confirmation-customer-panel,
  .confirmation-items-panel {
    padding: 26px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 24px;
    background: rgba(255,255,255,0.035);
  }

  .confirmation-customer-panel {
    margin-bottom: 30px;
  }

  .confirmation-address-box {
    grid-column: 1 / -1;
    border-color: rgba(61,165,255,0.22);
    background: rgba(61,165,255,0.1);
  }

  .confirmation-item-stack {
    display: grid;
    gap: 16px;
  }

  .confirmation-item-card {
    min-width: 0;
    display: grid;
    grid-template-columns:
      110px minmax(0, 1fr) auto;
    gap: 20px;
    align-items: center;
    padding: 18px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 20px;
    background: rgba(255,255,255,0.045);
  }

  .confirmation-product-image-wrap {
    width: 110px;
    height: 135px;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 18px;
    background:
      radial-gradient(
        circle at center,
        rgba(61,165,255,0.13),
        transparent 65%
      ),
      rgba(0,0,0,0.18);
  }

  .confirmation-product-image-wrap img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    padding: 8px;
  }

  .confirmation-image-fallback {
    width: 82px;
    min-height: 74px;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 5px;
    padding: 10px;
    border: 1px solid rgba(61,165,255,0.35);
    border-radius: 12px;
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
    font-size: 20px;
  }

  .confirmation-image-fallback span {
    max-width: 100%;
    font-size: 10px;
    overflow-wrap: anywhere;
  }

  .confirmation-item-copy {
    min-width: 0;
  }

  .confirmation-category {
    margin-bottom: 6px;
    color: #9ed8ff;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .confirmation-item-copy h3 {
    margin-bottom: 6px;
    color: #ffffff;
    font-size: 24px;
    overflow-wrap: anywhere;
  }

  .confirmation-item-copy p:not(.confirmation-category) {
    margin-top: 4px;
    color: #aaaaaa;
    font-size: 14px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .confirmation-line-total {
    color: #9ed8ff;
    font-size: 22px;
    white-space: nowrap;
  }

  .confirmation-no-items {
    padding: 20px;
    border: 1px dashed rgba(255,255,255,0.15);
    border-radius: 16px;
    color: #aaaaaa;
    line-height: 1.6;
    text-align: center;
  }

  .confirmation-side-panel {
    position: sticky;
    top: 110px;
  }

  .confirmation-side-panel > h2 {
    margin-bottom: 24px;
    color: #9ed8ff;
    font-size: clamp(40px, 6vw, 52px);
    line-height: 1.05;
  }

  .confirmation-summary-row {
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

  .confirmation-summary-row strong {
    color: #ffffff;
    text-align: right;
    overflow-wrap: anywhere;
  }

  .confirmation-notice-box {
    display: grid;
    gap: 7px;
    margin-top: 20px;
    padding: 16px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 16px;
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
    font-size: 14px;
    line-height: 1.6;
  }

  .confirmation-full-button {
    width: 100%;
    margin-top: 14px;
  }

  .confirmation-side-panel .primary-btn {
    margin-top: 24px;
  }

  .confirmation-research-notice {
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
    .confirmation-page {
      padding: 65px 24px;
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
      padding: 44px 12px;
    }

    .confirmation-empty-panel,
    .confirmation-success-panel,
    .confirmation-details-panel,
    .confirmation-side-panel {
      padding: 22px 18px;
      border-radius: 22px;
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
        90px minmax(0, 1fr);
      align-items: center;
    }

    .confirmation-product-image-wrap {
      width: 90px;
      height: 115px;
    }

    .confirmation-line-total {
      grid-column: 2;
    }

    .confirmation-button-row,
    .confirmation-button-row button {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .confirmation-page {
      padding: 34px 8px;
    }

    .confirmation-empty-panel,
    .confirmation-success-panel,
    .confirmation-details-panel,
    .confirmation-side-panel,
    .confirmation-customer-panel,
    .confirmation-items-panel {
      padding: 15px;
    }

    .confirmation-item-card {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .confirmation-product-image-wrap {
      width: 100%;
      height: 180px;
    }

    .confirmation-line-total {
      grid-column: auto;
    }

    .confirmation-summary-row {
      flex-direction: column;
    }

    .confirmation-summary-row strong {
      text-align: left;
    }
  }
`;

export default OrderConfirmation;
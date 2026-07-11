function OrderConfirmation({ onNavigate, latestOrder }) {
  if (!latestOrder) {
    return (
      <main style={{ padding: "90px 60px" }}>
        <section style={emptyPanelStyle}>
          <p className="eyebrow">ORDER CONFIRMATION</p>

          <h1 style={titleStyle}>
            No Recent Order
          </h1>

          <p style={subtitleStyle}>
            Place a test order to see the order confirmation page.
          </p>

          <div style={buttonRowStyle}>
            <button
              className="primary-btn"
              onClick={() => onNavigate("products")}
            >
              Browse Products
            </button>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("dashboard")}
            >
              Research Hub
            </button>
          </div>
        </section>
      </main>
    );
  }

  const items = latestOrder.items || [];

  const subtotal = items.reduce(
    (total, item) => total + (item.price || 0) * item.quantity,
    0
  );

  const customer = latestOrder.customer || {};

  const customerName =
    customer.firstName || customer.lastName
      ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
      : "Not saved on older test order";

  const customerEmail = customer.email || "Not saved on older test order";

  const customerAddress =
    customer.address || customer.city || customer.state || customer.zip
      ? `${customer.address || ""}, ${customer.city || ""}, ${customer.state || ""} ${customer.zip || ""}`.replace(/^,\s*/, "").trim()
      : "Not saved on older test order";

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <div style={successPanelStyle}>
          <div style={checkIconStyle}>
            ✓
          </div>

          <p className="eyebrow">ORDER CONFIRMED</p>

          <h1 style={titleStyle}>
            Test Order Received
          </h1>

          <p style={subtitleStyle}>
            Your prototype order has been saved to the Research Hub. This confirms
            the front-end checkout flow is working.
          </p>

          <div style={orderNumberStyle}>
            Order #{latestOrder.id}
          </div>
        </div>

        <div style={orderLayoutStyle}>

          <div style={detailsPanelStyle}>
            <p className="eyebrow">ORDER DETAILS</p>

            <h2 style={sectionTitleStyle}>
              Order Summary
            </h2>

            <div style={summaryGridStyle}>
              <div style={summaryBoxStyle}>
                <span>Order Number</span>
                <strong>{latestOrder.id}</strong>
              </div>

              <div style={summaryBoxStyle}>
                <span>Order Date</span>
                <strong>{latestOrder.date}</strong>
              </div>

              <div style={summaryBoxStyle}>
                <span>Status</span>
                <strong>{latestOrder.status}</strong>
              </div>

              <div style={summaryBoxStyle}>
                <span>Total Items</span>
                <strong>{latestOrder.totalQuantity}</strong>
              </div>
            </div>

            <div style={customerPanelStyle}>
              <p className="eyebrow">CUSTOMER INFORMATION</p>

              <h2 style={smallSectionTitleStyle}>
                Checkout Details
              </h2>

              <div style={customerGridStyle}>
                <div style={customerBoxStyle}>
                  <span>Name</span>
                  <strong>{customerName}</strong>
                </div>

                <div style={customerBoxStyle}>
                  <span>Email</span>
                  <strong>{customerEmail}</strong>
                </div>

                <div style={{ ...customerBoxStyle, gridColumn: "1 / -1" }}>
                  <span>Shipping Address</span>
                  <strong>{customerAddress}</strong>
                </div>
              </div>
            </div>

            <div style={itemsPanelStyle}>
              <p className="eyebrow">PRODUCTS ORDERED</p>

              <h2 style={smallSectionTitleStyle}>
                Research Products
              </h2>

              <div style={itemStackStyle}>
                {items.map((item) => {
                  const lineTotal = (item.price || 0) * item.quantity;

                  return (
                    <div key={item.name} style={itemCardStyle}>
                      <div style={miniBottleWrapStyle}>
                        <div style={miniBottleCapStyle}></div>

                        <div style={miniBottleStyle}>
                          <div style={miniLabelStyle}>
                            <strong>304</strong>
                            <span>{item.codeName}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p style={categoryStyle}>
                          {item.category}
                        </p>

                        <h3 style={itemTitleStyle}>
                          {item.name}
                        </h3>

                        <p style={mutedTextStyle}>
                          {item.codeName} · {item.strength}
                        </p>

                        <p style={mutedTextStyle}>
                          Qty: {item.quantity} · ${item.price} each
                        </p>
                      </div>

                      <strong style={lineTotalStyle}>
                        ${lineTotal}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside style={sidePanelStyle}>
            <p className="eyebrow">TOTAL</p>

            <h2 style={sideTitleStyle}>
              ${subtotal}
            </h2>

            <div style={summaryRowStyle}>
              <span>Products</span>
              <strong>{items.length}</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Total Items</span>
              <strong>{latestOrder.totalQuantity}</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Subtotal</span>
              <strong>${subtotal}</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Shipping</span>
              <strong>Later</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Taxes</span>
              <strong>Later</strong>
            </div>

            <div style={noticeBoxStyle}>
              This is a prototype order. Real payment processing, taxes, shipping,
              fulfillment, emails, and backend order records will be added later.
            </div>

            <button
              className="primary-btn"
              style={{ width: "100%", marginTop: "24px" }}
              onClick={() => onNavigate("dashboard")}
            >
              Open Research Hub
            </button>

            <button
              className="secondary-btn"
              style={{ width: "100%", marginTop: "14px" }}
              onClick={() => onNavigate("partnerApplication")}
            >
              Apply For Partner Code
            </button>

            <button
              className="secondary-btn"
              style={{ width: "100%", marginTop: "14px" }}
              onClick={() => onNavigate("researchAgreement")}
            >
              Research Agreement
            </button>

            <button
              className="secondary-btn"
              style={{ width: "100%", marginTop: "14px" }}
              onClick={() => onNavigate("products")}
            >
              Continue Shopping
            </button>
          </aside>

        </div>

        <div style={researchNoticeStyle}>
          For Research Use Only. Products are not intended for human consumption.
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
    "radial-gradient(circle at top, rgba(61, 165, 255, 0.18), transparent 40%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
  padding: "60px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const successPanelStyle = {
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61, 165, 255, 0.22), transparent 42%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "34px",
  padding: "64px 56px",
  boxShadow: "0 30px 90px rgba(0,0,0,0.5)",
  marginBottom: "30px",
};

const checkIconStyle = {
  width: "86px",
  height: "86px",
  margin: "0 auto 24px",
  borderRadius: "50%",
  background: "rgba(61,165,255,0.14)",
  border: "1px solid rgba(61,165,255,0.35)",
  color: "#9ed8ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "46px",
  fontWeight: "900",
};

const titleStyle = {
  fontSize: "62px",
  lineHeight: "1.05",
  marginBottom: "20px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle = {
  maxWidth: "780px",
  margin: "0 auto",
  color: "#c8c8c8",
  fontSize: "19px",
  lineHeight: "1.8",
};

const buttonRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "28px",
};

const orderNumberStyle = {
  display: "inline-flex",
  marginTop: "30px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "999px",
  padding: "15px 24px",
  fontWeight: "900",
  fontSize: "20px",
};

const orderLayoutStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 370px",
  gap: "30px",
  alignItems: "start",
};

const detailsPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "30px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const sectionTitleStyle = {
  fontSize: "38px",
  lineHeight: "1.12",
  marginBottom: "24px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const smallSectionTitleStyle = {
  fontSize: "32px",
  lineHeight: "1.12",
  marginBottom: "22px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
  marginBottom: "30px",
};

const summaryBoxStyle = {
  display: "grid",
  gap: "6px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "16px",
  padding: "16px",
  color: "#c8c8c8",
};

const customerPanelStyle = {
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "24px",
  padding: "26px",
  marginBottom: "30px",
};

const customerGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
};

const customerBoxStyle = {
  display: "grid",
  gap: "6px",
  background: "rgba(61,165,255,0.10)",
  border: "1px solid rgba(61,165,255,0.22)",
  borderRadius: "16px",
  padding: "16px",
  color: "#c8eaff",
};

const itemsPanelStyle = {
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "24px",
  padding: "26px",
};

const itemStackStyle = {
  display: "grid",
  gap: "16px",
};

const itemCardStyle = {
  display: "grid",
  gridTemplateColumns: "90px 1fr auto",
  gap: "18px",
  alignItems: "center",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "20px",
  padding: "18px",
};

const miniBottleWrapStyle = {
  display: "grid",
  justifyContent: "center",
};

const miniBottleCapStyle = {
  width: "34px",
  height: "16px",
  margin: "0 auto",
  borderRadius: "7px 7px 3px 3px",
  background: "linear-gradient(180deg, #d7d7d7, #777)",
};

const miniBottleStyle = {
  width: "70px",
  height: "100px",
  borderRadius: "18px 18px 22px 22px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.88), rgba(255,255,255,0.34))",
  border: "1px solid rgba(255,255,255,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
};

const miniLabelStyle = {
  width: "54px",
  minHeight: "48px",
  borderRadius: "9px",
  background: "linear-gradient(180deg, #050505, #171717)",
  border: "1px solid rgba(61,165,255,0.35)",
  color: "#ffffff",
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  gap: "2px",
  padding: "6px",
  textAlign: "center",
  fontSize: "10px",
};

const categoryStyle = {
  color: "#9ed8ff",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
  marginBottom: "6px",
};

const itemTitleStyle = {
  color: "#ffffff",
  fontSize: "24px",
  marginBottom: "6px",
};

const mutedTextStyle = {
  color: "#aaa",
  lineHeight: "1.6",
  fontSize: "14px",
};

const lineTotalStyle = {
  color: "#9ed8ff",
  fontSize: "22px",
};

const sidePanelStyle = {
  position: "sticky",
  top: "110px",
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.16), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
  padding: "32px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const sideTitleStyle = {
  fontSize: "52px",
  lineHeight: "1.05",
  marginBottom: "24px",
  color: "#9ed8ff",
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

export default OrderConfirmation;
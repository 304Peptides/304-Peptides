function CustomerDashboard({ onNavigate, orders, partnerApplication }) {
  const hasOrders = orders.length > 0;
  const latestOrder = orders[0];
  const latestCustomer = latestOrder?.customer || {};

  const customerName =
    latestCustomer.firstName || latestCustomer.lastName
      ? `${latestCustomer.firstName || ""} ${latestCustomer.lastName || ""}`.trim()
      : "No checkout details saved yet";

  const customerEmail =
    latestCustomer.email || "No checkout email saved yet";

  const customerAddress =
    latestCustomer.address || latestCustomer.city || latestCustomer.state || latestCustomer.zip
      ? `${latestCustomer.address || ""}, ${latestCustomer.city || ""}, ${latestCustomer.state || ""} ${latestCustomer.zip || ""}`.replace(/^,\s*/, "").trim()
      : "No shipping address saved yet";

  const totalOrders = orders.length;

  const totalItems = orders.reduce(
    (total, order) => total + (order.totalQuantity || 0),
    0
  );

  const totalSpent = orders.reduce((orderTotal, order) => {
    const items = order.items || [];

    const subtotal = items.reduce(
      (itemTotal, item) => itemTotal + (item.price || 0) * item.quantity,
      0
    );

    return orderTotal + subtotal;
  }, 0);

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <div style={heroPanelStyle}>
          <p className="eyebrow">RESEARCH HUB</p>

          <h1 style={titleStyle}>
            Account Dashboard
          </h1>

          <p style={subtitleStyle}>
            View prototype order history, saved checkout details, research-use
            reminders, and Partner Program access.
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
              onClick={() => onNavigate("cart")}
            >
              View Cart
            </button>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("researchAgreement")}
            >
              Research Agreement
            </button>
          </div>
        </div>

        <div style={statsGridStyle}>
          <div style={statCardStyle}>
            <span>Total Orders</span>
            <strong>{totalOrders}</strong>
          </div>

          <div style={statCardStyle}>
            <span>Total Items</span>
            <strong>{totalItems}</strong>
          </div>

          <div style={statCardStyle}>
            <span>Prototype Spend</span>
            <strong>${totalSpent}</strong>
          </div>

          <div style={statCardStyle}>
            <span>Partner Status</span>
            <strong>{partnerApplication ? "Applied" : "Not Applied"}</strong>
          </div>
        </div>

        <div style={dashboardGridStyle}>

          <div style={mainPanelStyle}>
            <p className="eyebrow">CHECKOUT DETAILS</p>

            <h2 style={sectionTitleStyle}>
              Saved Customer Info
            </h2>

            <div style={customerGridStyle}>
              <div style={infoBoxStyle}>
                <span>Name</span>
                <strong>{customerName}</strong>
              </div>

              <div style={infoBoxStyle}>
                <span>Email</span>
                <strong>{customerEmail}</strong>
              </div>

              <div style={{ ...infoBoxStyle, gridColumn: "1 / -1" }}>
                <span>Shipping Address</span>
                <strong>{customerAddress}</strong>
              </div>
            </div>

            <div style={noticeBoxStyle}>
              These details come from the most recent checkout form. Real customer
              profiles will need secure backend account storage.
            </div>
          </div>

          <aside style={sidePanelStyle}>
            <p className="eyebrow">PARTNER PROGRAM</p>

            <h2 style={sideTitleStyle}>
              Research Partner Access
            </h2>

            {partnerApplication ? (
              <>
                <div style={partnerCodeBoxStyle}>
                  <span>Your Code</span>
                  <strong>{partnerApplication.code}</strong>
                </div>

                <div style={statusBoxStyle}>
                  <span>Status</span>
                  <strong>{partnerApplication.status}</strong>
                </div>

                <button
                  className="primary-btn"
                  style={{ width: "100%", marginTop: "20px" }}
                  onClick={() => onNavigate("partnerHQ")}
                >
                  Open Partner HQ
                </button>

                <button
                  className="secondary-btn"
                  style={{ width: "100%", marginTop: "14px" }}
                  onClick={() => onNavigate("marketingCenter")}
                >
                  Marketing Center
                </button>
              </>
            ) : hasOrders ? (
              <>
                <p style={sideTextStyle}>
                  You have completed a test order, so the Partner Application is
                  unlocked.
                </p>

                <button
                  className="primary-btn"
                  style={{ width: "100%", marginTop: "20px" }}
                  onClick={() => onNavigate("partnerApplication")}
                >
                  Apply For Partner Code
                </button>
              </>
            ) : (
              <>
                <p style={sideTextStyle}>
                  Complete your first test order to unlock the Partner Application.
                </p>

                <button
                  className="primary-btn"
                  style={{ width: "100%", marginTop: "20px" }}
                  onClick={() => onNavigate("products")}
                >
                  Start First Order
                </button>
              </>
            )}
          </aside>

        </div>

        <div style={ordersPanelStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p className="eyebrow">ORDER HISTORY</p>

              <h2 style={sectionTitleStyle}>
                Test Orders
              </h2>
            </div>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("products")}
            >
              Shop Again
            </button>
          </div>

          {!hasOrders ? (
            <div style={emptyOrdersStyle}>
              <h3>No Orders Yet</h3>

              <p>
                Place a test order to see order history, customer information,
                and Partner Program unlocks.
              </p>

              <button
                className="primary-btn"
                style={{ marginTop: "22px" }}
                onClick={() => onNavigate("products")}
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div style={orderStackStyle}>
              {orders.map((order) => {
                const items = order.items || [];

                const orderSubtotal = items.reduce(
                  (total, item) => total + (item.price || 0) * item.quantity,
                  0
                );

                const customer = order.customer || {};

                const name =
                  customer.firstName || customer.lastName
                    ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
                    : "Older test order";

                const email = customer.email || "No email saved";

                return (
                  <div key={order.id} style={orderCardStyle}>
                    <div>
                      <p style={orderIdStyle}>
                        Order #{order.id}
                      </p>

                      <h3 style={orderTitleStyle}>
                        {order.status}
                      </h3>

                      <p style={mutedTextStyle}>
                        {order.date} · {name} · {email}
                      </p>

                      <p style={mutedTextStyle}>
                        {items.length} product type{items.length === 1 ? "" : "s"} ·{" "}
                        {order.totalQuantity} total item{order.totalQuantity === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div style={orderTotalBoxStyle}>
                      <span>Subtotal</span>
                      <strong>${orderSubtotal}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={researchNoticeStyle}>
          For Research Use Only. Products are not intended for human consumption.
        </div>

      </section>
    </main>
  );
}

const heroPanelStyle = {
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61, 165, 255, 0.22), transparent 42%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "34px",
  padding: "64px 56px",
  boxShadow: "0 30px 90px rgba(0,0,0,0.5)",
  marginBottom: "30px",
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
  marginTop: "30px",
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "18px",
  marginBottom: "30px",
};

const statCardStyle = {
  display: "grid",
  gap: "8px",
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "22px",
  padding: "22px",
  color: "#c8c8c8",
  boxShadow: "0 22px 60px rgba(0,0,0,0.32)",
};

const dashboardGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 360px",
  gap: "30px",
  alignItems: "start",
  marginBottom: "30px",
};

const mainPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "30px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
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

const sectionTitleStyle = {
  fontSize: "38px",
  lineHeight: "1.12",
  marginBottom: "24px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const sideTitleStyle = {
  fontSize: "32px",
  lineHeight: "1.12",
  marginBottom: "20px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const customerGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
};

const infoBoxStyle = {
  display: "grid",
  gap: "6px",
  background: "rgba(61,165,255,0.10)",
  border: "1px solid rgba(61,165,255,0.22)",
  borderRadius: "16px",
  padding: "16px",
  color: "#c8eaff",
};

const noticeBoxStyle = {
  marginTop: "22px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "16px",
  padding: "16px",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: "1.6",
};

const partnerCodeBoxStyle = {
  display: "grid",
  gap: "8px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "18px",
  padding: "18px",
  marginBottom: "14px",
};

const statusBoxStyle = {
  display: "grid",
  gap: "8px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  color: "#c8c8c8",
  borderRadius: "18px",
  padding: "18px",
};

const sideTextStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
};

const ordersPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "30px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "center",
  marginBottom: "26px",
};

const emptyOrdersStyle = {
  textAlign: "center",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "22px",
  padding: "34px",
  color: "#c8c8c8",
  lineHeight: "1.8",
};

const orderStackStyle = {
  display: "grid",
  gap: "16px",
};

const orderCardStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 170px",
  gap: "18px",
  alignItems: "center",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "22px",
  padding: "22px",
};

const orderIdStyle = {
  color: "#9ed8ff",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
  marginBottom: "8px",
};

const orderTitleStyle = {
  color: "#ffffff",
  fontSize: "24px",
  marginBottom: "8px",
};

const mutedTextStyle = {
  color: "#aaa",
  lineHeight: "1.6",
};

const orderTotalBoxStyle = {
  display: "grid",
  gap: "6px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "16px",
  padding: "16px",
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

export default CustomerDashboard;
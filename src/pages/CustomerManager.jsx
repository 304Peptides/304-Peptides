import { useState } from "react";

function CustomerManager({ orders = [], partnerApplication, onNavigate }) {
  const [searchTerm, setSearchTerm] = useState("");

  const totalOrders = orders.length;

  const totalItems = orders.reduce(
    (total, order) => total + (order.totalQuantity || 0),
    0
  );

  const totalRevenue = orders.reduce((orderTotal, order) => {
    const items = order.items || [];

    const subtotal = items.reduce(
      (itemTotal, item) => itemTotal + (item.price || 0) * item.quantity,
      0
    );

    return orderTotal + subtotal;
  }, 0);

  const filteredOrders = orders.filter((order) => {
    const customer = order.customer || {};

    const searchText = `
      ${order.id}
      ${order.status}
      ${order.date}
      ${customer.firstName || ""}
      ${customer.lastName || ""}
      ${customer.email || ""}
      ${customer.address || ""}
      ${customer.city || ""}
      ${customer.state || ""}
      ${customer.zip || ""}
    `.toLowerCase();

    return searchText.includes(searchTerm.toLowerCase());
  });

  const latestCustomer = orders[0]?.customer || {};

  const latestCustomerName =
    latestCustomer.firstName || latestCustomer.lastName
      ? `${latestCustomer.firstName || ""} ${latestCustomer.lastName || ""}`.trim()
      : "No customer saved yet";

  const latestCustomerEmail =
    latestCustomer.email || "No email saved yet";

  const latestCustomerAddress =
    latestCustomer.address ||
    latestCustomer.city ||
    latestCustomer.state ||
    latestCustomer.zip
      ? `${latestCustomer.address || ""}, ${latestCustomer.city || ""}, ${latestCustomer.state || ""} ${latestCustomer.zip || ""}`
          .replace(/^,\s*/, "")
          .trim()
      : "No address saved yet";

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1250px", margin: "0 auto" }}>

        <button
          className="secondary-btn"
          style={{ marginBottom: "30px" }}
          onClick={() => onNavigate("missionControl")}
        >
          ← Back To Mission Control
        </button>

        <div style={heroPanelStyle}>
          <p className="eyebrow">CUSTOMER MANAGER</p>

          <h1 style={titleStyle}>
            Customer Records
          </h1>

          <p style={subtitleStyle}>
            Review prototype customer checkout details, order activity, partner
            status, and account flow data saved during test orders.
          </p>

          <div style={buttonRowStyle}>
            <button
              className="primary-btn"
              onClick={() => onNavigate("products")}
            >
              View Storefront
            </button>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("dashboard")}
            >
              Research Hub
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
            <span>Prototype Revenue</span>
            <strong>${totalRevenue}</strong>
          </div>

          <div style={statCardStyle}>
            <span>Partner Status</span>
            <strong>{partnerApplication ? "Applied" : "Not Applied"}</strong>
          </div>
        </div>

        <div style={managerGridStyle}>

          <div style={mainPanelStyle}>
            <p className="eyebrow">LATEST CUSTOMER</p>

            <h2 style={sectionTitleStyle}>
              Most Recent Checkout
            </h2>

            <div style={customerGridStyle}>
              <div style={infoBoxStyle}>
                <span>Name</span>
                <strong>{latestCustomerName}</strong>
              </div>

              <div style={infoBoxStyle}>
                <span>Email</span>
                <strong>{latestCustomerEmail}</strong>
              </div>

              <div style={{ ...infoBoxStyle, gridColumn: "1 / -1" }}>
                <span>Shipping Address</span>
                <strong>{latestCustomerAddress}</strong>
              </div>
            </div>

            <div style={noticeBoxStyle}>
              Customer information is currently pulled from the most recent test
              checkout. A live store will need secure customer accounts and backend
              profile storage.
            </div>
          </div>

          <aside style={sidePanelStyle}>
            <p className="eyebrow">PARTNER SNAPSHOT</p>

            <h2 style={sideTitleStyle}>
              Partner Record
            </h2>

            {partnerApplication ? (
              <>
                <div style={partnerCodeBoxStyle}>
                  <span>Partner Code</span>
                  <strong>{partnerApplication.code}</strong>
                </div>

                <div style={sideInfoBoxStyle}>
                  <span>Status</span>
                  <strong>{partnerApplication.status}</strong>
                </div>

                <div style={sideInfoBoxStyle}>
                  <span>Submitted</span>
                  <strong>{partnerApplication.date}</strong>
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
            ) : (
              <>
                <p style={sideTextStyle}>
                  No partner application has been submitted yet.
                </p>

                <button
                  className="primary-btn"
                  style={{ width: "100%", marginTop: "20px" }}
                  onClick={() => onNavigate("partnerApplication")}
                >
                  Partner Application
                </button>
              </>
            )}

            <div style={noticeBoxStyle}>
              Referral tracking, payout status, fraud controls, and customer
              attribution will need backend development later.
            </div>
          </aside>

        </div>

        <div style={ordersPanelStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p className="eyebrow">CUSTOMER ORDER SEARCH</p>

              <h2 style={sectionTitleStyle}>
                Order Records
              </h2>
            </div>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("missionControl")}
            >
              Mission Control
            </button>
          </div>

          <input
            placeholder="Search by order number, customer name, email, address, status, or date..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={searchInputStyle}
          />

          <div style={resultsBarStyle}>
            <span>
              Showing <strong>{filteredOrders.length}</strong> order
              {filteredOrders.length === 1 ? "" : "s"}
            </span>

            <span>
              Total Saved Orders: <strong>{orders.length}</strong>
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <div style={emptyBoxStyle}>
              <h3>No Matching Orders</h3>

              <p>
                Place a test order or change your search term to review customer
                records.
              </p>

              <button
                className="primary-btn"
                style={{ marginTop: "22px" }}
                onClick={() => onNavigate("products")}
              >
                Go To Products
              </button>
            </div>
          ) : (
            <div style={orderStackStyle}>
              {filteredOrders.map((order) => {
                const items = order.items || [];

                const subtotal = items.reduce(
                  (total, item) => total + (item.price || 0) * item.quantity,
                  0
                );

                const customer = order.customer || {};

                const customerName =
                  customer.firstName || customer.lastName
                    ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
                    : "Older test order";

                const customerEmail = customer.email || "No email saved";

                const customerAddress =
                  customer.address ||
                  customer.city ||
                  customer.state ||
                  customer.zip
                    ? `${customer.address || ""}, ${customer.city || ""}, ${customer.state || ""} ${customer.zip || ""}`
                        .replace(/^,\s*/, "")
                        .trim()
                    : "No address saved";

                return (
                  <div key={order.id} style={orderCardStyle}>
                    <div style={orderMainStyle}>
                      <p style={orderIdStyle}>
                        Order #{order.id}
                      </p>

                      <h3 style={orderTitleStyle}>
                        {customerName}
                      </h3>

                      <p style={mutedTextStyle}>
                        {customerEmail}
                      </p>

                      <p style={mutedTextStyle}>
                        {customerAddress}
                      </p>

                      <p style={mutedTextStyle}>
                        {order.date} · {order.status}
                      </p>
                    </div>

                    <div style={itemsBoxStyle}>
                      <span>Items Ordered</span>

                      <div style={miniItemStackStyle}>
                        {items.map((item) => (
                          <p key={item.name}>
                            {item.name} × {item.quantity}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div style={orderTotalBoxStyle}>
                      <span>Subtotal</span>
                      <strong>${subtotal}</strong>

                      <span>Total Items</span>
                      <strong>{order.totalQuantity}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={liveRequirementPanelStyle}>
          <p className="eyebrow">LIVE CUSTOMER SYSTEM</p>

          <h2 style={noticeTitleStyle}>
            Backend Required Before Launch
          </h2>

          <p style={noticeTextStyle}>
            This is prototype customer management only. A real store will need
            secure login, encrypted passwords, customer profiles, privacy policy,
            order records, email notifications, support tickets, payment records,
            and admin permissions.
          </p>
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

const managerGridStyle = {
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

const sideInfoBoxStyle = {
  display: "grid",
  gap: "8px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  color: "#c8c8c8",
  borderRadius: "18px",
  padding: "18px",
  marginBottom: "14px",
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
  marginBottom: "30px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "center",
  marginBottom: "26px",
};

const searchInputStyle = {
  width: "100%",
  padding: "17px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.055)",
  color: "white",
  fontSize: "16px",
  outline: "none",
  marginBottom: "18px",
};

const resultsBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "24px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "16px",
  padding: "16px",
  color: "#c8c8c8",
};

const emptyBoxStyle = {
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
  gap: "18px",
};

const orderCardStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 260px 170px",
  gap: "20px",
  alignItems: "center",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "24px",
  padding: "22px",
};

const orderMainStyle = {
  minWidth: 0,
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
  fontSize: "26px",
  marginBottom: "8px",
};

const mutedTextStyle = {
  color: "#aaa",
  lineHeight: "1.6",
};

const itemsBoxStyle = {
  display: "grid",
  gap: "10px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "16px",
  padding: "16px",
  color: "#c8c8c8",
};

const miniItemStackStyle = {
  display: "grid",
  gap: "6px",
  color: "#aaa",
  fontSize: "14px",
};

const orderTotalBoxStyle = {
  display: "grid",
  gap: "8px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "16px",
  padding: "16px",
  textAlign: "center",
};

const liveRequirementPanelStyle = {
  textAlign: "center",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  borderRadius: "30px",
  padding: "42px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
};

const noticeTitleStyle = {
  color: "#ffffff",
  fontSize: "38px",
  lineHeight: "1.12",
  marginBottom: "18px",
};

const noticeTextStyle = {
  maxWidth: "850px",
  margin: "0 auto",
  color: "#c8eaff",
  lineHeight: "1.8",
  fontWeight: "700",
};

export default CustomerManager;
function PartnerHQ({ onNavigate, partnerApplication }) {
  const partnerCode = partnerApplication?.code || "YOURCODE";
  const partnerStatus = partnerApplication?.status || "Not Submitted";
  const partnerDate = partnerApplication?.date || "No application date";
  const trackingLink = `304peptides.com/?ref=${partnerCode}`;

  function copyText(text) {
    navigator.clipboard?.writeText(text);
    alert("Copied to clipboard.");
  }

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1250px", margin: "0 auto" }}>

        <button
          className="secondary-btn"
          style={{ marginBottom: "30px" }}
          onClick={() => onNavigate("dashboard")}
        >
          ← Back To Research Hub
        </button>

        <div style={heroPanelStyle}>
          <p className="eyebrow">PARTNER HQ</p>

          <h1 style={titleStyle}>
            Research Partner Dashboard
          </h1>

          <p style={subtitleStyle}>
            View your partner code, tracking link, activity preview, reward
            options, approved language, and Marketing Center tools.
          </p>

          <div style={codeDisplayStyle}>
            {partnerCode}
          </div>

          <div style={buttonRowStyle}>
            <button
              className="primary-btn"
              onClick={() => onNavigate("marketingCenter")}
            >
              Open Marketing Center
            </button>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("partners")}
            >
              Partner Program
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
            <span>Partner Code</span>
            <strong>{partnerCode}</strong>
          </div>

          <div style={statCardStyle}>
            <span>Status</span>
            <strong>{partnerStatus}</strong>
          </div>

          <div style={statCardStyle}>
            <span>Submitted</span>
            <strong>{partnerDate}</strong>
          </div>

          <div style={statCardStyle}>
            <span>Level</span>
            <strong>Research Associate</strong>
          </div>
        </div>

        <div style={dashboardGridStyle}>

          <div style={mainPanelStyle}>
            <p className="eyebrow">TRACKING LINK</p>

            <h2 style={sectionTitleStyle}>
              Your Partner Link
            </h2>

            <div style={trackingBoxStyle}>
              {trackingLink}
            </div>

            <div style={buttonRowLeftStyle}>
              <button
                className="primary-btn"
                onClick={() => copyText(trackingLink)}
              >
                Copy Tracking Link
              </button>

              <button
                className="secondary-btn"
                onClick={() => onNavigate("marketingCenter")}
              >
                Get Captions
              </button>
            </div>

            <div style={noticeBoxStyle}>
              This is prototype tracking only. Real clicks, referrals, order
              attribution, fraud controls, and payout tracking will require backend
              development.
            </div>
          </div>

          <aside style={sidePanelStyle}>
            <p className="eyebrow">QR PREVIEW</p>

            <h2 style={sideTitleStyle}>
              Partner QR
            </h2>

            <div style={qrBoxStyle}>
              QR
            </div>

            <p style={sideTextStyle}>
              Later, this can generate a real QR code connected to your partner
              tracking link.
            </p>
          </aside>

        </div>

        <div style={activityPanelStyle}>
          <p className="eyebrow">ACTIVITY OVERVIEW</p>

          <h2 style={sectionTitleStyle}>
            Prototype Metrics
          </h2>

          <div style={activityGridStyle}>
            <div style={activityBoxStyle}>
              <span>Clicks</span>
              <strong>0</strong>
              <small>Backend needed</small>
            </div>

            <div style={activityBoxStyle}>
              <span>Referred Orders</span>
              <strong>0</strong>
              <small>Backend needed</small>
            </div>

            <div style={activityBoxStyle}>
              <span>Approved Rewards</span>
              <strong>$0</strong>
              <small>Backend needed</small>
            </div>

            <div style={activityBoxStyle}>
              <span>Store Credit</span>
              <strong>$0</strong>
              <small>Backend needed</small>
            </div>
          </div>
        </div>

        <div style={rewardPanelStyle}>
          <div>
            <p className="eyebrow">REWARD OPTIONS</p>

            <h2 style={sectionTitleStyle}>
              Cash Or Boosted Store Credit
            </h2>

            <p style={textStyle}>
              Partner rewards can be structured so partners choose between cash
              payout or boosted store credit. Final rules will need real tracking,
              approval, and payout controls.
            </p>
          </div>

          <div style={rewardGridStyle}>
            <div style={rewardBoxStyle}>
              <strong>$100 Cash</strong>
              <span>Example payout option.</span>
            </div>

            <div style={rewardBoxStyle}>
              <strong>$125 Store Credit</strong>
              <span>Boosted credit option.</span>
            </div>

            <div style={rewardBoxStyle}>
              <strong>Monthly Leaders</strong>
              <span>Leaderboard reward ideas.</span>
            </div>

            <div style={rewardBoxStyle}>
              <strong>Quarterly Swag</strong>
              <span>Merch and recognition later.</span>
            </div>
          </div>
        </div>

        <div style={levelsPanelStyle}>
          <p className="eyebrow">PARTNER LEVELS</p>

          <h2 style={sectionTitleStyle}>
            Growth Path
          </h2>

          <div style={levelsGridStyle}>
            <div style={levelBadgeStyle}>Research Associate</div>
            <div style={levelBadgeStyle}>Senior Research Associate</div>
            <div style={levelBadgeStyle}>Lead Research Associate</div>
            <div style={levelBadgeStyle}>Principal Research Associate</div>
            <div style={levelBadgeStyle}>Research Director</div>
          </div>
        </div>

        <div style={languagePanelStyle}>
          <p className="eyebrow">APPROVED LANGUAGE</p>

          <h2 style={sectionTitleStyle}>
            Keep Promotion Brand-Safe
          </h2>

          <div style={languageGridStyle}>
            <div style={approvedBoxStyle}>
              <h3>Approved Focus</h3>

              <ul style={listStyle}>
                <li>Research-use only</li>
                <li>Quality standards</li>
                <li>COA transparency</li>
                <li>Clear documentation</li>
                <li>Professional customer experience</li>
              </ul>
            </div>

            <div style={restrictedBoxStyle}>
              <h3>Restricted Language</h3>

              <ul style={listStyle}>
                <li>No human-use claims</li>
                <li>No dosing instructions</li>
                <li>No treatment claims</li>
                <li>No medical promises</li>
                <li>No before/after transformation claims</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={ctaPanelStyle}>
          <p className="eyebrow">NEXT STEP</p>

          <h2 style={ctaTitleStyle}>
            Grab Approved Captions
          </h2>

          <p style={ctaTextStyle}>
            Use the Marketing Center to copy captions, view your tracking link,
            and keep partner promotion focused on research-use standards.
          </p>

          <button
            className="primary-btn"
            style={{ marginTop: "26px" }}
            onClick={() => onNavigate("marketingCenter")}
          >
            Open Marketing Center
          </button>
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

const codeDisplayStyle = {
  display: "inline-flex",
  marginTop: "30px",
  padding: "18px 30px",
  borderRadius: "999px",
  background: "rgba(61,165,255,0.14)",
  border: "1px solid rgba(61,165,255,0.35)",
  color: "#9ed8ff",
  fontSize: "30px",
  fontWeight: "900",
  letterSpacing: "1px",
};

const buttonRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "30px",
};

const buttonRowLeftStyle = {
  display: "flex",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "24px",
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
  gridTemplateColumns: "1fr 340px",
  gap: "30px",
  alignItems: "stretch",
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
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.16), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
  padding: "32px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  textAlign: "center",
};

const sectionTitleStyle = {
  fontSize: "38px",
  lineHeight: "1.12",
  marginBottom: "22px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const sideTitleStyle = {
  fontSize: "32px",
  lineHeight: "1.12",
  marginBottom: "24px",
  background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const trackingBoxStyle = {
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "18px",
  padding: "20px",
  color: "#9ed8ff",
  fontSize: "22px",
  fontWeight: "900",
  overflowWrap: "anywhere",
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

const qrBoxStyle = {
  width: "180px",
  height: "180px",
  margin: "0 auto 22px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.92)",
  color: "#050505",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "42px",
  fontWeight: "900",
  boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
};

const sideTextStyle = {
  color: "#aaa",
  lineHeight: "1.7",
};

const activityPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "30px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  marginBottom: "30px",
};

const activityGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "18px",
};

const activityBoxStyle = {
  display: "grid",
  gap: "8px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "18px",
  padding: "20px",
  color: "#c8c8c8",
};

const rewardPanelStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "30px",
  alignItems: "center",
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "30px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
  marginBottom: "30px",
};

const textStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
};

const rewardGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
};

const rewardBoxStyle = {
  display: "grid",
  gap: "8px",
  background: "rgba(61,165,255,0.10)",
  border: "1px solid rgba(61,165,255,0.22)",
  borderRadius: "16px",
  padding: "16px",
  color: "#c8eaff",
};

const levelsPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "30px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  marginBottom: "30px",
};

const levelsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: "14px",
};

const levelBadgeStyle = {
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "16px",
  padding: "15px",
  fontWeight: "900",
  textAlign: "center",
};

const languagePanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "30px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  marginBottom: "30px",
};

const languageGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
};

const approvedBoxStyle = {
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#c8eaff",
  borderRadius: "20px",
  padding: "22px",
};

const restrictedBoxStyle = {
  background: "rgba(255,120,120,0.10)",
  border: "1px solid rgba(255,120,120,0.22)",
  color: "#ffd1d1",
  borderRadius: "20px",
  padding: "22px",
};

const listStyle = {
  display: "grid",
  gap: "10px",
  paddingLeft: "18px",
  lineHeight: "1.6",
  marginTop: "14px",
};

const ctaPanelStyle = {
  textAlign: "center",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  borderRadius: "30px",
  padding: "42px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
};

const ctaTitleStyle = {
  color: "#ffffff",
  fontSize: "38px",
  lineHeight: "1.12",
  marginBottom: "18px",
};

const ctaTextStyle = {
  maxWidth: "760px",
  margin: "0 auto",
  color: "#c8eaff",
  lineHeight: "1.8",
  fontWeight: "700",
};

export default PartnerHQ;
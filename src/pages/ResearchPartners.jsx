function ResearchPartners({ onNavigate }) {
  const partnerSteps = [
    {
      title: "Create Account",
      text: "Start with a research account so activity can be connected to your profile.",
    },
    {
      title: "Place First Order",
      text: "Partner application access unlocks after the first completed test order.",
    },
    {
      title: "Apply For Code",
      text: "Request a custom partner code that fits your brand or audience.",
    },
    {
      title: "Use Approved Assets",
      text: "Share research-use focused captions, tracking links, and approved language.",
    },
  ];

  const levels = [
    "Research Associate",
    "Senior Research Associate",
    "Lead Research Associate",
    "Principal Research Associate",
    "Research Director",
  ];

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <div style={heroPanelStyle}>
          <p className="eyebrow">RESEARCH PARTNERS</p>

          <h1 style={titleStyle}>
            Built For Trusted Referrals
          </h1>

          <p style={subtitleStyle}>
            The 304 Research Partner program is designed around clean tracking,
            approved language, research-use standards, and rewards without making
            it feel like a gimmick.
          </p>

          <div style={buttonRowStyle}>
            <button
              className="primary-btn"
              onClick={() => onNavigate("createAccount")}
            >
              Create Account
            </button>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("partnerApplication")}
            >
              Apply For Partner Code
            </button>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("researchAgreement")}
            >
              Research Agreement
            </button>
          </div>
        </div>

        <div style={overviewGridStyle}>

          <div style={panelStyle}>
            <p className="eyebrow">PROGRAM OVERVIEW</p>

            <h2 style={sectionTitleStyle}>
              Simple Partner Flow
            </h2>

            <p style={textStyle}>
              Customers can apply after their first completed order. Approved
              partners receive a code, a tracking link, access to approved
              captions, and future reward options.
            </p>

            <div style={noticeBoxStyle}>
              Self-purchases do not earn commission or discount, but they can count
              toward activity metrics in the prototype.
            </div>
          </div>

          <aside style={sidePanelStyle}>
            <p className="eyebrow">REWARD OPTIONS</p>

            <h2 style={sideTitleStyle}>
              Cash Or Credit
            </h2>

            <div style={rewardStackStyle}>
              <div style={rewardBoxStyle}>
                <strong>$100 Cash</strong>
                <span>Example partner payout option.</span>
              </div>

              <div style={rewardBoxStyle}>
                <strong>$125 Store Credit</strong>
                <span>Boosted credit option for store use.</span>
              </div>

              <div style={rewardBoxStyle}>
                <strong>Leaderboard Rewards</strong>
                <span>Monthly and quarterly reward ideas.</span>
              </div>
            </div>
          </aside>

        </div>

        <div style={stepsPanelStyle}>
          <p className="eyebrow">HOW IT WORKS</p>

          <h2 style={sectionTitleStyle}>
            Partner Path
          </h2>

          <div style={stepsGridStyle}>
            {partnerSteps.map((step, index) => (
              <div key={step.title} style={stepCardStyle}>
                <div style={stepNumberStyle}>
                  {index + 1}
                </div>

                <h3 style={stepTitleStyle}>
                  {step.title}
                </h3>

                <p style={stepTextStyle}>
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={levelsPanelStyle}>
          <div>
            <p className="eyebrow">PARTNER LEVELS</p>

            <h2 style={sectionTitleStyle}>
              Growth Without The MLM Feel
            </h2>

            <p style={textStyle}>
              Partner levels can make the program feel rewarding without turning it
              into a confusing multi-level structure. Keep it simple: activity,
              trust, clean promotion, and consistent standards.
            </p>
          </div>

          <div style={levelsGridStyle}>
            {levels.map((level) => (
              <div key={level} style={levelBadgeStyle}>
                {level}
              </div>
            ))}
          </div>
        </div>

        <div style={languagePanelStyle}>
          <p className="eyebrow">PARTNER RULES</p>

          <h2 style={sectionTitleStyle}>
            Approved Promotion Only
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
                <li>No medical claims</li>
                <li>No treatment promises</li>
                <li>No before/after transformation claims</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={ctaPanelStyle}>
          <p className="eyebrow">READY TO BUILD IT OUT?</p>

          <h2 style={ctaTitleStyle}>
            Partner Tools Are Already Started
          </h2>

          <p style={ctaTextStyle}>
            Use the Partner HQ and Marketing Center to preview what approved
            partners will see after launch.
          </p>

          <div style={buttonRowStyle}>
            <button
              className="primary-btn"
              onClick={() => onNavigate("partnerHQ")}
            >
              Open Partner HQ
            </button>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("marketingCenter")}
            >
              Marketing Center
            </button>
          </div>
        </div>

      </section>
    </main>
  );
}

const heroPanelStyle = {
  textAlign: "center",
  background:
    "radial-gradient(circle at top, rgba(61, 165, 255, 0.2), transparent 42%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "30px",
  padding: "56px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
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

const overviewGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 360px",
  gap: "30px",
  alignItems: "stretch",
  marginBottom: "30px",
};

const panelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
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
};

const sectionTitleStyle = {
  fontSize: "36px",
  lineHeight: "1.12",
  marginBottom: "20px",
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

const textStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
};

const noticeBoxStyle = {
  marginTop: "22px",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "16px",
  padding: "16px",
  fontWeight: "900",
  lineHeight: "1.6",
};

const rewardStackStyle = {
  display: "grid",
  gap: "14px",
};

const rewardBoxStyle = {
  display: "grid",
  gap: "6px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "16px",
  padding: "16px",
  color: "#c8c8c8",
};

const stepsPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  marginBottom: "30px",
  textAlign: "center",
};

const stepsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "18px",
};

const stepCardStyle = {
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "22px",
  padding: "24px",
};

const stepNumberStyle = {
  width: "48px",
  height: "48px",
  margin: "0 auto 16px",
  borderRadius: "16px",
  background: "rgba(61,165,255,0.14)",
  border: "1px solid rgba(61,165,255,0.35)",
  color: "#9ed8ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
};

const stepTitleStyle = {
  color: "#ffffff",
  fontSize: "21px",
  marginBottom: "12px",
};

const stepTextStyle = {
  color: "#c8c8c8",
  lineHeight: "1.7",
  fontSize: "15px",
};

const levelsPanelStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "30px",
  alignItems: "center",
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
  marginBottom: "30px",
};

const levelsGridStyle = {
  display: "grid",
  gap: "12px",
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
  borderRadius: "28px",
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
  borderRadius: "28px",
  padding: "42px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
};

const ctaTitleStyle = {
  fontSize: "36px",
  lineHeight: "1.12",
  marginBottom: "18px",
  color: "#ffffff",
};

const ctaTextStyle = {
  maxWidth: "720px",
  margin: "0 auto",
  color: "#c8eaff",
  lineHeight: "1.8",
  fontWeight: "700",
};

export default ResearchPartners;
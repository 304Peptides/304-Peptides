// 304 AFFILIATE PROGRAM PAGE UPGRADE
function ResearchPartners({ onNavigate }) {
  const partnerSteps = [
    {
      title: "Create Account",
      text: "Create your customer account to begin your research journey.",
    },
    {
      title: "Complete Your First Order",
      text: "After your first completed order, you will become eligible to apply for the Affiliate Program.",
    },
    {
      title: "Apply",
      text: "Submit your affiliate application and choose your preferred referral code.",
    },
    {
      title: "Start Sharing",
      text: "Access approved marketing resources, share responsibly, and begin earning rewards on qualifying referrals.",
    },
  ];

  const levels = [
    "🥉 Bronze Affiliate",
    "🥈 Silver Affiliate",
    "🥇 Gold Affiliate",
    "💎 Platinum Affiliate",
    "👑 Elite Affiliate",
  ];

  const affiliateBenefits = [
    "Custom Affiliate Code",
    "Real-Time Performance Tracking",
    "Monthly Promotions",
    "Store Credit Bonuses",
    "Cash Commission Options",
    "Marketing Resources",
    "Leaderboards",
    "Future VIP Benefits",
  ];

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={heroPanelStyle}>
          <p className="eyebrow">AFFILIATE PROGRAM</p>

          <h1 style={titleStyle}>
            Grow Your Reach.
            <br />
            Earn Rewards.
          </h1>

          <p style={subtitleStyle}>
            The 304 Peptides Affiliate Program is designed for trusted members of
            the research community who want to share quality products responsibly.
            Earn rewards for qualifying referrals while promoting transparency,
            education, and research-use standards.
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
              Apply For Affiliate Code
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
              How the Affiliate Program Works
            </h2>

            <p style={textStyle}>
              Once you have completed your first qualifying order, you can apply
              for an affiliate account. Approved affiliates receive a unique
              referral code, access to marketing resources, performance tracking,
              and ongoing reward opportunities.
            </p>

            <div style={noticeBoxStyle}>
              Orders placed using your own affiliate code do not earn commissions
              or discounts, but they may count toward activity metrics and
              affiliate milestones.
            </div>
          </div>

          <aside style={sidePanelStyle}>
            <p className="eyebrow">REWARD OPTIONS</p>

            <h2 style={sideTitleStyle}>Choose Your Rewards</h2>

            <div style={rewardStackStyle}>
              <div style={rewardBoxStyle}>
                <strong>Cash Payouts</strong>
                <span>
                  Receive commission payouts once minimum payout requirements are
                  met.
                </span>
              </div>

              <div style={rewardBoxStyle}>
                <strong>Store Credit</strong>
                <span>
                  Choose enhanced store credit for even greater value on future
                  research purchases.
                </span>
              </div>

              <div style={rewardBoxStyle}>
                <strong>Exclusive Rewards</strong>
                <span>
                  Top-performing affiliates may qualify for monthly promotions,
                  limited-edition merchandise, and special recognition.
                </span>
              </div>
            </div>
          </aside>
        </div>

        <div style={benefitsPanelStyle}>
          <div style={benefitsIntroStyle}>
            <p className="eyebrow">WHY JOIN?</p>

            <h2 style={sectionTitleStyle}>
              Built To Reward Responsible Growth
            </h2>

            <p style={textStyle}>
              Get the tools, tracking, and reward options you need to share the
              304 Peptides brand professionally and responsibly.
            </p>
          </div>

          <div style={benefitsGridStyle}>
            {affiliateBenefits.map((benefit) => (
              <div key={benefit} style={benefitCardStyle}>
                <span style={benefitCheckStyle}>✓</span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={stepsPanelStyle}>
          <p className="eyebrow">HOW IT WORKS</p>

          <h2 style={sectionTitleStyle}>Affiliate Journey</h2>

          <div style={stepsGridStyle}>
            {partnerSteps.map((step, index) => (
              <div key={step.title} style={stepCardStyle}>
                <div style={stepNumberStyle}>{index + 1}</div>

                <h3 style={stepTitleStyle}>{step.title}</h3>

                <p style={stepTextStyle}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={levelsPanelStyle}>
          <div>
            <p className="eyebrow">AFFILIATE LEVELS</p>

            <h2 style={sectionTitleStyle}>
              Progress That Rewards Consistency
            </h2>

            <p style={textStyle}>
              Affiliate levels reward consistency, professionalism, and long-term
              participation. Progress is based on activity and program engagement,
              not recruitment.
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
          <p className="eyebrow">AFFILIATE GUIDELINES</p>

          <h2 style={sectionTitleStyle}>Approved Promotion Only</h2>

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
          <p className="eyebrow">READY TO JOIN?</p>

          <h2 style={ctaTitleStyle}>Become a 304 Affiliate</h2>

          <p style={ctaTextStyle}>
            Apply today to receive your custom affiliate code, gain access to your
            Affiliate Dashboard, and start earning rewards for helping grow the
            304 Peptides community.
          </p>

          <div style={buttonRowStyle}>
            <button
              className="primary-btn"
              onClick={() => onNavigate("partnerHQ")}
            >
              Affiliate Dashboard
            </button>

            <button
              className="secondary-btn"
              onClick={() => onNavigate("marketingCenter")}
            >
              Marketing Resources
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

const benefitsPanelStyle = {
  display: "grid",
  gridTemplateColumns: "0.9fr 1.1fr",
  gap: "30px",
  alignItems: "center",
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 38%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  marginBottom: "30px",
};

const benefitsIntroStyle = {
  alignSelf: "start",
};

const benefitsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const benefitCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minHeight: "64px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "16px",
  padding: "16px",
  color: "#ffffff",
  fontWeight: "800",
};

const benefitCheckStyle = {
  width: "30px",
  height: "30px",
  flex: "0 0 30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  background: "rgba(61,165,255,0.14)",
  border: "1px solid rgba(61,165,255,0.35)",
  color: "#9ed8ff",
  fontWeight: "900",
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
function MarketingCenter({ onNavigate, partnerApplication }) {
  const partnerCode = partnerApplication?.code || "YOURCODE";
  const trackingLink = `304peptides.com/?ref=${partnerCode}`;

  const captions = [
    {
      title: "Trust Caption",
      text: `Trust is earned — not claimed. 304 Peptides is built around research-use products, clear documentation, and professional standards. Use code ${partnerCode}. For research use only.`,
    },
    {
      title: "Quality Caption",
      text: `Quality. Transparency. Documentation. That is the 304 Peptides standard. Research-use products only. Use code ${partnerCode}.`,
    },
    {
      title: "COA Caption",
      text: `Before anything else, look for transparency. 304 Peptides is built around COA-focused product organization and research-use standards. Code: ${partnerCode}.`,
    },
  ];

  function copyText(text) {
    navigator.clipboard?.writeText(text);
    alert("Copied to clipboard.");
  }

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <button
          className="secondary-btn"
          style={{ marginBottom: "30px" }}
          onClick={() => onNavigate("partnerHQ")}
        >
          ← Back to Partner HQ
        </button>

        <div style={heroPanelStyle}>
          <p className="eyebrow">MARKETING CENTER</p>

          <h1 style={titleStyle}>
            Partner Assets
          </h1>

          <p style={subtitleStyle}>
            Copy approved captions, view your tracking link, and keep partner
            content focused on research-use, quality, and transparency.
          </p>

          <div style={codeDisplayStyle}>
            {partnerCode}
          </div>
        </div>

        <div style={topGridStyle}>

          <div style={panelStyle}>
            <p className="eyebrow">TRACKING LINK</p>

            <h2 style={sectionTitleStyle}>
              Your Partner Link
            </h2>

            <div style={trackingBoxStyle}>
              {trackingLink}
            </div>

            <button
              className="primary-btn"
              style={{ marginTop: "22px" }}
              onClick={() => copyText(trackingLink)}
            >
              Copy Tracking Link
            </button>

            <div style={noticeBoxStyle}>
              This is a prototype link. Real tracking will need backend referral
              tracking, click logging, order attribution, and reward rules.
            </div>
          </div>

          <aside style={qrPanelStyle}>
            <p className="eyebrow">QR PREVIEW</p>

            <h2 style={sideTitleStyle}>
              Partner QR
            </h2>

            <div style={qrBoxStyle}>
              QR
            </div>

            <p style={mutedTextStyle}>
              Later, this can generate a real QR code connected to your partner
              tracking link.
            </p>
          </aside>

        </div>

        <div style={captionPanelStyle}>
          <p className="eyebrow">APPROVED CAPTIONS</p>

          <h2 style={sectionTitleStyle}>
            Copy-And-Post Templates
          </h2>

          <div style={captionGridStyle}>
            {captions.map((caption) => (
              <div key={caption.title} style={captionCardStyle}>
                <h3 style={{ fontSize: "24px", marginBottom: "14px" }}>
                  {caption.title}
                </h3>

                <p style={captionTextStyle}>
                  {caption.text}
                </p>

                <button
                  className="secondary-btn"
                  style={{ marginTop: "18px", width: "100%" }}
                  onClick={() => copyText(caption.text)}
                >
                  Copy Caption
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={assetPanelStyle}>
          <p className="eyebrow">ASSET PLACEHOLDERS</p>

          <h2 style={sectionTitleStyle}>
            Future Download Center
          </h2>

          <div style={assetGridStyle}>
            <div style={assetCardStyle}>
              <div style={assetIconStyle}>304</div>

              <h3>Logo Pack</h3>

              <p>
                Brand logos, profile images, and transparent files can be added here later.
              </p>
            </div>

            <div style={assetCardStyle}>
              <div style={assetIconStyle}>POST</div>

              <h3>Post Templates</h3>

              <p>
                Square social graphics, launch posts, and product education slides.
              </p>
            </div>

            <div style={assetCardStyle}>
              <div style={assetIconStyle}>REEL</div>

              <h3>Reel Scripts</h3>

              <p>
                Short-form video hooks and research-use focused caption ideas.
              </p>
            </div>

            <div style={assetCardStyle}>
              <div style={assetIconStyle}>QR</div>

              <h3>QR Graphics</h3>

              <p>
                Partner QR cards and printable inserts can be generated later.
              </p>
            </div>
          </div>
        </div>

        <div style={languagePanelStyle}>
          <p className="eyebrow">BRAND-SAFE LANGUAGE</p>

          <h2 style={sectionTitleStyle}>
            Stay Inside The Lines
          </h2>

          <div style={languageGridStyle}>
            <div style={approvedBoxStyle}>
              <h3>Approved Focus</h3>

              <ul style={listStyle}>
                <li>Research-use only</li>
                <li>Quality and documentation</li>
                <li>COA transparency</li>
                <li>Professional customer experience</li>
                <li>Trust, consistency, and standards</li>
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

        <div style={researchNoticeStyle}>
          Partner materials must remain research-use focused. Not intended for human consumption.
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

const codeDisplayStyle = {
  display: "inline-flex",
  marginTop: "30px",
  padding: "18px 28px",
  borderRadius: "999px",
  background: "rgba(61,165,255,0.14)",
  border: "1px solid rgba(61,165,255,0.35)",
  color: "#9ed8ff",
  fontSize: "28px",
  fontWeight: "900",
  letterSpacing: "1px",
};

const topGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 340px",
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

const qrPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.16), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
  padding: "32px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  textAlign: "center",
};

const sectionTitleStyle = {
  fontSize: "36px",
  lineHeight: "1.12",
  marginBottom: "24px",
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

const mutedTextStyle = {
  color: "#aaa",
  lineHeight: "1.7",
};

const captionPanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  marginBottom: "30px",
};

const captionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "20px",
};

const captionCardStyle = {
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "22px",
  padding: "22px",
};

const captionTextStyle = {
  color: "#c8c8c8",
  lineHeight: "1.8",
  fontSize: "15px",
};

const assetPanelStyle = {
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "28px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
  marginBottom: "30px",
  textAlign: "center",
};

const assetGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "18px",
};

const assetCardStyle = {
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "22px",
  padding: "22px",
  color: "#c8c8c8",
  lineHeight: "1.7",
};

const assetIconStyle = {
  width: "72px",
  height: "72px",
  margin: "0 auto 18px",
  borderRadius: "20px",
  background: "rgba(61,165,255,0.14)",
  border: "1px solid rgba(61,165,255,0.35)",
  color: "#9ed8ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
};

const languagePanelStyle = {
  background:
    "radial-gradient(circle at top left, rgba(61, 165, 255, 0.14), transparent 35%), rgba(255, 255, 255, 0.035)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "28px",
  padding: "38px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
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

const researchNoticeStyle = {
  marginTop: "30px",
  textAlign: "center",
  background: "rgba(61,165,255,0.12)",
  border: "1px solid rgba(61,165,255,0.28)",
  color: "#9ed8ff",
  borderRadius: "18px",
  padding: "20px",
  fontWeight: "900",
  lineHeight: "1.6",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

export default MarketingCenter;
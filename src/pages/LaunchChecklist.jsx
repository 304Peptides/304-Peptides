import { useEffect, useMemo, useState } from "react";
import { products } from "../data/products";

const manualLaunchTasks = [
  {
    id: "business-details",
    title: "Verify business details",
    description:
      "Confirm the business name, support email, location, and contact information displayed across the website.",
  },
  {
    id: "domain",
    title: "Connect 304Peptides.com",
    description:
      "Connect the production website to the final domain and confirm the secure connection is active.",
  },
  {
    id: "business-email",
    title: "Activate support email",
    description:
      "Confirm support@304peptides.com can send and receive customer messages.",
  },
  {
    id: "payment-processing",
    title: "Configure approved payment processing",
    description:
      "Connect a payment method that accurately supports the business and its disclosed products.",
  },
  {
    id: "shipping",
    title: "Finalize shipping settings",
    description:
      "Set shipping prices, delivery methods, handling times, and available shipping locations.",
  },
  {
    id: "tax",
    title: "Configure tax settings",
    description:
      "Review the sales-tax settings required for the business and its customers.",
  },
  {
    id: "policies",
    title: "Review store policies",
    description:
      "Finalize shipping, refund, privacy, terms, research-use, and customer-account policies.",
  },
  {
    id: "compliance-review",
    title: "Complete compliance review",
    description:
      "Have the product catalog, claims, labels, agreements, and required disclosures reviewed before launch.",
  },
  {
    id: "mobile-review",
    title: "Complete mobile review",
    description:
      "Test the home page, catalog, product pages, account pages, cart, and checkout on a mobile device.",
  },
  {
    id: "test-order",
    title: "Complete a full test order",
    description:
      "Test account creation, product selection, cart behavior, checkout, confirmation, and customer notifications.",
  },
  {
    id: "backup",
    title: "Create a launch backup",
    description:
      "Create a clean backup of the final website files and important business records before launch.",
  },
  {
    id: "final-approval",
    title: "Approve the website for launch",
    description:
      "Perform one final review and confirm the storefront is ready to be made publicly available.",
  },
];

function LaunchChecklist({ onNavigate = () => {} }) {
  const [completedManualTasks, setCompletedManualTasks] = useState(() => {
    try {
      const savedTasks = window.localStorage.getItem(
        "304-launch-checklist"
      );

      return savedTasks ? JSON.parse(savedTasks) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "304-launch-checklist",
        JSON.stringify(completedManualTasks)
      );
    } catch {
      // The checklist still works during this session if storage is blocked.
    }
  }, [completedManualTasks]);

  const catalogStats = useMemo(() => {
    const variants = products.flatMap((product) =>
      product.variants?.length ? product.variants : [product]
    );

    return {
      productCount: products.length,
      variantCount: variants.length,
      imageCount: variants.filter((variant) => Boolean(variant.image))
        .length,
      priceCount: variants.filter((variant) =>
        Number.isFinite(variant.price)
      ).length,
      coaCount: variants.filter(
        (variant) => variant.coaStatus !== "COA Pending"
      ).length,
      batchCount: variants.filter(
        (variant) => variant.batchStatus !== "Batch Pending"
      ).length,
      qrCount: variants.filter(
        (variant) => variant.qrStatus !== "QR Pending"
      ).length,
    };
  }, []);

  const automaticChecks = useMemo(
    () => [
      {
        id: "products-added",
        title: "Catalog products added",
        description:
          "The complete grouped product catalog has been entered.",
        value: catalogStats.productCount,
        target: catalogStats.productCount,
        buttonLabel: "Open Product Manager",
        destination: "productManager",
      },
      {
        id: "variants-organized",
        title: "Strength variants organized",
        description:
          "Every available strength has its own product code and catalog record.",
        value: catalogStats.variantCount,
        target: catalogStats.variantCount,
        buttonLabel: "Review Products",
        destination: "productManager",
      },
      {
        id: "images-connected",
        title: "Product images connected",
        description:
          "Each strength should have a matching final product image.",
        value: catalogStats.imageCount,
        target: catalogStats.variantCount,
        buttonLabel: "Review Image Status",
        destination: "productManager",
      },
      {
        id: "prices-entered",
        title: "Final prices entered",
        description:
          "Products without prices remain disabled and display Price Coming Soon.",
        value: catalogStats.priceCount,
        target: catalogStats.variantCount,
        buttonLabel: "Review Pricing",
        destination: "productManager",
      },
      {
        id: "coas-connected",
        title: "COAs connected",
        description:
          "Each strength should connect to its correct certificate of analysis.",
        value: catalogStats.coaCount,
        target: catalogStats.variantCount,
        buttonLabel: "Open COA Manager",
        destination: "coaManager",
      },
      {
        id: "batches-connected",
        title: "Batch records connected",
        description:
          "Each strength should have an accurate batch-tracking record.",
        value: catalogStats.batchCount,
        target: catalogStats.variantCount,
        buttonLabel: "Review Batch Records",
        destination: "coaManager",
      },
      {
        id: "qr-connected",
        title: "QR verification connected",
        description:
          "Each QR code should lead to the correct matching documentation.",
        value: catalogStats.qrCount,
        target: catalogStats.variantCount,
        buttonLabel: "Review QR Status",
        destination: "coaManager",
      },
    ],
    [catalogStats]
  );

  const completedAutomaticChecks = automaticChecks.filter(
    (check) => check.value >= check.target
  ).length;

  const completedManualCount = manualLaunchTasks.filter(
    (task) => completedManualTasks[task.id]
  ).length;

  const totalChecklistItems =
    automaticChecks.length + manualLaunchTasks.length;

  const completedChecklistItems =
    completedAutomaticChecks + completedManualCount;

  const launchProgress = Math.round(
    (completedChecklistItems / totalChecklistItems) * 100
  );

  function toggleManualTask(taskId) {
    setCompletedManualTasks((currentTasks) => ({
      ...currentTasks,
      [taskId]: !currentTasks[taskId],
    }));
  }

  function resetManualChecklist() {
    const shouldReset = window.confirm(
      "Reset all manually completed launch tasks?"
    );

    if (shouldReset) {
      setCompletedManualTasks({});
    }
  }

  return (
    <main style={{ padding: "90px 60px" }}>
      <section style={{ maxWidth: "1300px", margin: "0 auto" }}>
        <div style={heroPanelStyle}>
          <div>
            <p className="eyebrow">304 PEPTIDES ADMIN</p>

            <h1 style={titleStyle}>Launch Checklist</h1>

            <p style={subtitleStyle}>
              Track catalog completion, documentation readiness,
              business setup, storefront testing, and final launch
              approval.
            </p>
          </div>

          <div style={heroButtonRowStyle}>
            <button
              className="secondary-btn"
              onClick={() => onNavigate("missionControl")}
            >
              Back To Mission Control
            </button>

            <button
              className="primary-btn"
              onClick={() => onNavigate("products")}
            >
              Review Storefront
            </button>
          </div>
        </div>

        <div style={progressPanelStyle}>
          <div style={progressHeadingStyle}>
            <div>
              <p className="eyebrow">OVERALL PROGRESS</p>

              <h2 style={sectionTitleStyle}>
                {completedChecklistItems} Of {totalChecklistItems} Complete
              </h2>
            </div>

            <strong style={progressNumberStyle}>
              {launchProgress}%
            </strong>
          </div>

          <div style={progressTrackStyle}>
            <div
              style={{
                ...progressFillStyle,
                width: `${launchProgress}%`,
              }}
            />
          </div>

          <div style={summaryGridStyle}>
            <SummaryCard
              label="Catalog Products"
              value={catalogStats.productCount}
              detail="Grouped product entries"
            />

            <SummaryCard
              label="Strength Variants"
              value={catalogStats.variantCount}
              detail="Individual catalog options"
            />

            <SummaryCard
              label="Automatic Checks"
              value={`${completedAutomaticChecks}/${automaticChecks.length}`}
              detail="Based on live catalog data"
            />

            <SummaryCard
              label="Manual Tasks"
              value={`${completedManualCount}/${manualLaunchTasks.length}`}
              detail="Saved in this browser"
            />
          </div>
        </div>

        <section style={checklistPanelStyle}>
          <div style={panelHeadingStyle}>
            <div>
              <p className="eyebrow">CATALOG READINESS</p>

              <h2 style={sectionTitleStyle}>
                Automatic Website Checks
              </h2>
            </div>

            <p style={panelDescriptionStyle}>
              These statuses update automatically from the product
              catalog.
            </p>
          </div>

          <div style={automaticGridStyle}>
            {automaticChecks.map((check) => {
              const complete = check.value >= check.target;
              const percentage =
                check.target > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (check.value / check.target) * 100
                      )
                    )
                  : 0;

              return (
                <article
                  key={check.id}
                  style={
                    complete
                      ? completeAutomaticCardStyle
                      : automaticCardStyle
                  }
                >
                  <div style={checkTitleRowStyle}>
                    <span
                      style={
                        complete
                          ? completeIconStyle
                          : pendingIconStyle
                      }
                    >
                      {complete ? "✓" : "•"}
                    </span>

                    <div>
                      <h3 style={checkTitleStyle}>
                        {check.title}
                      </h3>

                      <p style={checkDescriptionStyle}>
                        {check.description}
                      </p>
                    </div>
                  </div>

                  <div style={checkProgressRowStyle}>
                    <strong
                      style={
                        complete
                          ? completeValueStyle
                          : pendingValueStyle
                      }
                    >
                      {check.value}/{check.target}
                    </strong>

                    <span style={percentageStyle}>
                      {percentage}%
                    </span>
                  </div>

                  <div style={smallProgressTrackStyle}>
                    <div
                      style={{
                        ...smallProgressFillStyle,
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <button
                    className="secondary-btn"
                    style={{ width: "100%", marginTop: "18px" }}
                    onClick={() =>
                      onNavigate(check.destination)
                    }
                  >
                    {check.buttonLabel}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section style={checklistPanelStyle}>
          <div style={panelHeadingStyle}>
            <div>
              <p className="eyebrow">BUSINESS READINESS</p>

              <h2 style={sectionTitleStyle}>
                Manual Launch Tasks
              </h2>
            </div>

            <button
              type="button"
              style={resetButtonStyle}
              onClick={resetManualChecklist}
            >
              Reset Manual Tasks
            </button>
          </div>

          <p style={panelDescriptionStyle}>
            Check each item after it has been fully reviewed and
            completed. Your progress is saved automatically in this
            browser.
          </p>

          <div style={manualListStyle}>
            {manualLaunchTasks.map((task, index) => {
              const complete = Boolean(
                completedManualTasks[task.id]
              );

              return (
                <button
                  key={task.id}
                  type="button"
                  style={
                    complete
                      ? completedManualTaskStyle
                      : manualTaskStyle
                  }
                  onClick={() => toggleManualTask(task.id)}
                >
                  <span
                    style={
                      complete
                        ? checkedBoxStyle
                        : uncheckedBoxStyle
                    }
                  >
                    {complete ? "✓" : ""}
                  </span>

                  <span style={taskNumberStyle}>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span style={manualTaskTextStyle}>
                    <strong style={manualTaskTitleStyle}>
                      {task.title}
                    </strong>

                    <span style={manualTaskDescriptionStyle}>
                      {task.description}
                    </span>
                  </span>

                  <span
                    style={
                      complete
                        ? completeBadgeStyle
                        : pendingBadgeStyle
                    }
                  >
                    {complete ? "Complete" : "Pending"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div style={bottomGridStyle}>
          <section style={noticePanelStyle}>
            <p className="eyebrow">STORE PROTECTION</p>

            <h2 style={smallTitleStyle}>
              Unpriced Products Are Disabled
            </h2>

            <p style={noticeTextStyle}>
              Any product without a valid price displays Price Coming
              Soon and cannot be added to the customer cart.
            </p>

            <button
              className="secondary-btn"
              style={{ marginTop: "18px" }}
              onClick={() => onNavigate("products")}
            >
              Test Product Catalog
            </button>
          </section>

          <section style={noticePanelStyle}>
            <p className="eyebrow">FINAL REVIEW</p>

            <h2 style={smallTitleStyle}>
              Research Language Must Remain Accurate
            </h2>

            <p style={noticeTextStyle}>
              Review the product names, labels, documentation,
              agreements, claims, and required disclosures before the
              website is launched.
            </p>

            <button
              className="secondary-btn"
              style={{ marginTop: "18px" }}
              onClick={() => onNavigate("researchAgreement")}
            >
              Review Research Agreement
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value, detail }) {
  return (
    <div style={summaryCardStyle}>
      <span style={summaryLabelStyle}>{label}</span>

      <strong style={summaryValueStyle}>{value}</strong>

      <small style={summaryDetailStyle}>{detail}</small>
    </div>
  );
}

const heroPanelStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "30px",
  flexWrap: "wrap",
  padding: "48px",
  marginBottom: "24px",
  borderRadius: "34px",
  border: "1px solid rgba(255,255,255,0.09)",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.2), transparent 42%), rgba(255,255,255,0.035)",
  boxShadow: "0 30px 90px rgba(0,0,0,0.48)",
};

const titleStyle = {
  marginBottom: "18px",
  fontSize: "64px",
  lineHeight: "1.02",
  background: "linear-gradient(180deg, #ffffff, #8f8f8f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle = {
  maxWidth: "760px",
  color: "#c8c8c8",
  fontSize: "18px",
  lineHeight: "1.8",
};

const heroButtonRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
};

const progressPanelStyle = {
  padding: "32px",
  marginBottom: "24px",
  borderRadius: "28px",
  border: "1px solid rgba(255,255,255,0.09)",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.13), transparent 40%), rgba(255,255,255,0.035)",
};

const progressHeadingStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
};

const sectionTitleStyle = {
  color: "#ffffff",
  fontSize: "35px",
  lineHeight: "1.15",
};

const progressNumberStyle = {
  color: "#9ed8ff",
  fontSize: "42px",
};

const progressTrackStyle = {
  height: "15px",
  margin: "24px 0",
  overflow: "hidden",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.07)",
};

const progressFillStyle = {
  height: "100%",
  borderRadius: "999px",
  background:
    "linear-gradient(90deg, rgba(61,165,255,0.55), #9ed8ff)",
  boxShadow: "0 0 25px rgba(61,165,255,0.35)",
  transition: "width 0.3s ease",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "14px",
};

const summaryCardStyle = {
  display: "grid",
  gap: "7px",
  padding: "19px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.23)",
};

const summaryLabelStyle = {
  color: "#9ed8ff",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const summaryValueStyle = {
  color: "#ffffff",
  fontSize: "29px",
};

const summaryDetailStyle = {
  color: "#8f9ba7",
  lineHeight: "1.5",
};

const checklistPanelStyle = {
  padding: "30px",
  marginBottom: "24px",
  borderRadius: "28px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.035)",
};

const panelHeadingStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "22px",
  flexWrap: "wrap",
};

const panelDescriptionStyle = {
  maxWidth: "780px",
  marginTop: "12px",
  color: "#9ca8b3",
  lineHeight: "1.7",
};

const automaticGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px",
  marginTop: "24px",
};

const automaticCardStyle = {
  padding: "22px",
  borderRadius: "21px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.22)",
};

const completeAutomaticCardStyle = {
  padding: "22px",
  borderRadius: "21px",
  border: "1px solid rgba(61,165,255,0.28)",
  background:
    "radial-gradient(circle at top left, rgba(61,165,255,0.13), transparent 44%), rgba(0,0,0,0.22)",
};

const checkTitleRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "14px",
};

const completeIconStyle = {
  display: "grid",
  width: "34px",
  height: "34px",
  minWidth: "34px",
  placeItems: "center",
  borderRadius: "50%",
  background: "rgba(61,165,255,0.2)",
  color: "#9ed8ff",
  fontWeight: "900",
};

const pendingIconStyle = {
  display: "grid",
  width: "34px",
  height: "34px",
  minWidth: "34px",
  placeItems: "center",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.07)",
  color: "#9ca8b3",
  fontWeight: "900",
};

const checkTitleStyle = {
  color: "#ffffff",
  fontSize: "21px",
  lineHeight: "1.2",
  marginBottom: "8px",
};

const checkDescriptionStyle = {
  color: "#9ca8b3",
  lineHeight: "1.65",
  fontSize: "14px",
};

const checkProgressRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  marginTop: "18px",
};

const completeValueStyle = {
  color: "#9ed8ff",
  fontSize: "22px",
};

const pendingValueStyle = {
  color: "#ffffff",
  fontSize: "22px",
};

const percentageStyle = {
  color: "#9ca8b3",
  fontWeight: "900",
};

const smallProgressTrackStyle = {
  height: "9px",
  marginTop: "10px",
  overflow: "hidden",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.07)",
};

const smallProgressFillStyle = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #3da5ff, #9ed8ff)",
  transition: "width 0.3s ease",
};

const resetButtonStyle = {
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "14px",
  padding: "12px 16px",
  background: "rgba(255,255,255,0.045)",
  color: "#aeb7bf",
  fontWeight: "900",
  cursor: "pointer",
};

const manualListStyle = {
  display: "grid",
  gap: "11px",
  marginTop: "24px",
};

const manualTaskStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "38px 40px 1fr auto",
  alignItems: "center",
  gap: "14px",
  padding: "17px",
  textAlign: "left",
  borderRadius: "17px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.22)",
  color: "#ffffff",
  cursor: "pointer",
};

const completedManualTaskStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "38px 40px 1fr auto",
  alignItems: "center",
  gap: "14px",
  padding: "17px",
  textAlign: "left",
  borderRadius: "17px",
  border: "1px solid rgba(61,165,255,0.28)",
  background: "rgba(61,165,255,0.09)",
  color: "#ffffff",
  cursor: "pointer",
};

const uncheckedBoxStyle = {
  display: "grid",
  width: "30px",
  height: "30px",
  placeItems: "center",
  borderRadius: "9px",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.04)",
};

const checkedBoxStyle = {
  display: "grid",
  width: "30px",
  height: "30px",
  placeItems: "center",
  borderRadius: "9px",
  border: "1px solid rgba(61,165,255,0.45)",
  background: "rgba(61,165,255,0.22)",
  color: "#9ed8ff",
  fontWeight: "900",
};

const taskNumberStyle = {
  color: "#6f7c88",
  fontSize: "13px",
  fontWeight: "900",
};

const manualTaskTextStyle = {
  display: "grid",
  gap: "5px",
};

const manualTaskTitleStyle = {
  color: "#ffffff",
  fontSize: "17px",
};

const manualTaskDescriptionStyle = {
  color: "#9ca8b3",
  fontSize: "13px",
  lineHeight: "1.55",
};

const completeBadgeStyle = {
  borderRadius: "999px",
  padding: "7px 11px",
  background: "rgba(61,165,255,0.16)",
  color: "#9ed8ff",
  fontSize: "11px",
  fontWeight: "900",
};

const pendingBadgeStyle = {
  borderRadius: "999px",
  padding: "7px 11px",
  background: "rgba(255,255,255,0.07)",
  color: "#aeb7bf",
  fontSize: "11px",
  fontWeight: "900",
};

const bottomGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
};

const noticePanelStyle = {
  padding: "28px",
  borderRadius: "25px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.035)",
};

const smallTitleStyle = {
  marginBottom: "12px",
  color: "#ffffff",
  fontSize: "27px",
};

const noticeTextStyle = {
  color: "#aeb7bf",
  lineHeight: "1.75",
};

export default LaunchChecklist;
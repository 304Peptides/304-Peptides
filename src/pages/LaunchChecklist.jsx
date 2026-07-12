import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  products,
} from "../data/products";

const checklistStorageKey =
  "304-launch-checklist";

const documentAdminSessionKey =
  "304-document-admin-session";

const manualLaunchTasks = [
  {
    id: "business-details",
    title:
      "Verify business details",
    description:
      "Confirm the legal business name, support email, location, and contact information displayed across the website.",
  },
  {
    id: "domain",
    title:
      "Confirm 304Peptides.com production domain",
    description:
      "Confirm the live website, secure connection, redirects, and Cloudflare deployment work correctly on the final domain.",
  },
  {
    id: "business-email",
    title:
      "Activate support email",
    description:
      "Confirm support@304peptides.com can send and receive customer messages and that replies are monitored.",
  },
  {
    id: "admin-security",
    title:
      "Verify Cloudflare Access protection",
    description:
      "Confirm /admin, /admin/*, /api/admin, and /api/admin/* require an approved email login while public pages remain accessible.",
  },
  {
    id: "payment-processing",
    title:
      "Configure approved payment processing",
    description:
      "Connect a payment method that accurately supports the business and its fully disclosed products.",
  },
  {
    id: "shipping",
    title:
      "Finalize shipping settings",
    description:
      "Set shipping prices, delivery methods, handling times, tracking expectations, and available shipping locations.",
  },
  {
    id: "tax",
    title:
      "Configure tax settings",
    description:
      "Review and configure the sales-tax requirements that apply to the business and its customers.",
  },
  {
    id: "policies",
    title:
      "Review store policies",
    description:
      "Finalize shipping, refund, privacy, terms, research-use, customer-account, and data-handling policies.",
  },
  {
    id: "compliance-review",
    title:
      "Complete legal and compliance review",
    description:
      "Have the catalog, labels, claims, agreements, documentation workflow, and required disclosures reviewed before launch.",
  },
  {
    id: "mobile-review",
    title:
      "Complete mobile review",
    description:
      "Test the home page, catalog, product pages, Quality page, account pages, cart, checkout, and admin tools on a phone.",
  },
  {
    id: "test-order",
    title:
      "Complete a full test order",
    description:
      "Test account creation, product selection, cart behavior, checkout, order submission, confirmation, and customer notifications.",
  },
  {
    id: "documentation-test",
    title:
      "Test the complete COA and QR flow",
    description:
      "Publish one genuine record, confirm it appears on Quality, generate its QR code, and verify the public record page opens correctly.",
  },
  {
    id: "backup",
    title:
      "Create a launch backup",
    description:
      "Create a clean backup of the final website files, Cloudflare configuration notes, and important business records.",
  },
  {
    id: "final-approval",
    title:
      "Approve the website for launch",
    description:
      "Perform one final review and confirm the storefront is ready to be made publicly available.",
  },
];

function getCatalogVariants() {
  return products.flatMap(
    (product) => {
      const variants =
        product.variants?.length
          ? product.variants
          : [product];

      return variants.map(
        (variant) => ({
          ...product,
          ...variant,

          productName:
            product.name,

          category:
            product.category,

          image:
            variant.image ||
            product.image ||
            null,
        })
      );
    }
  );
}

function isValidUrl(value) {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    return false;
  }

  try {
    const url =
      new URL(value);

    return (
      url.protocol ===
        "https:" ||
      url.protocol ===
        "http:"
    );
  } catch {
    return false;
  }
}

function isDocumentationComplete(
  record
) {
  return Boolean(
    record?.batchNumber &&
      record?.labName &&
      record?.testDate &&
      isValidUrl(
        record?.coaUrl
      ) &&
      isValidUrl(
        record?.verificationUrl
      )
  );
}

function LaunchChecklist({
  onNavigate = () => {},
}) {
  const [
    completedManualTasks,
    setCompletedManualTasks,
  ] = useState(() => {
    try {
      const savedTasks =
        window.localStorage.getItem(
          checklistStorageKey
        );

      return savedTasks
        ? JSON.parse(
            savedTasks
          )
        : {};
    } catch {
      return {};
    }
  });

  const [
    records,
    setRecords,
  ] = useState([]);

  const [
    recordSource,
    setRecordSource,
  ] = useState("public");

  const [
    documentsLoading,
    setDocumentsLoading,
  ] = useState(true);

  const [
    documentsError,
    setDocumentsError,
  ] = useState("");

  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        checklistStorageKey,
        JSON.stringify(
          completedManualTasks
        )
      );
    } catch {
      // Checklist remains usable
      // during the current session.
    }
  }, [
    completedManualTasks,
  ]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function requestRecords({
      endpoint,
      secret = "",
    }) {
      const headers = {
        Accept:
          "application/json",
      };

      if (secret) {
        headers.Authorization =
          `Bearer ${secret}`;
      }

      const response =
        await fetch(
          endpoint,
          {
            method: "GET",
            headers,
            cache: "no-store",

            signal:
              controller.signal,
          }
        );

      let result;

      try {
        result =
          await response.json();
      } catch {
        throw new Error(
          "The documentation service returned an invalid response."
        );
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Documentation records could not be loaded."
        );
      }

      return Array.isArray(
        result.records
      )
        ? result.records
        : [];
    }

    async function loadDocumentation() {
      setDocumentsLoading(
        true
      );

      setDocumentsError("");

      try {
        const adminSecret =
          window.sessionStorage.getItem(
            documentAdminSessionKey
          );

        if (adminSecret) {
          try {
            const adminRecords =
              await requestRecords({
                endpoint:
                  "/api/admin/documents",

                secret:
                  adminSecret,
              });

            setRecords(
              adminRecords
            );

            setRecordSource(
              "admin"
            );

            return;
          } catch (
            adminError
          ) {
            if (
              adminError.name ===
              "AbortError"
            ) {
              return;
            }
          }
        }

        const publicRecords =
          await requestRecords({
            endpoint:
              "/api/documents",
          });

        setRecords(
          publicRecords
        );

        setRecordSource(
          "public"
        );
      } catch (error) {
        if (
          error.name ===
          "AbortError"
        ) {
          return;
        }

        setRecords([]);

        setRecordSource(
          "public"
        );

        setDocumentsError(
          error.message ||
            "Documentation records could not be loaded."
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setDocumentsLoading(
            false
          );
        }
      }
    }

    loadDocumentation();

    return () => {
      controller.abort();
    };
  }, [refreshKey]);

  const catalogStats =
    useMemo(() => {
      const variants =
        getCatalogVariants();

      return {
        productCount:
          products.length,

        variantCount:
          variants.length,

        imageCount:
          variants.filter(
            (variant) =>
              Boolean(
                variant.image
              )
          ).length,

        priceCount:
          variants.filter(
            (variant) =>
              Number.isFinite(
                variant.price
              )
          ).length,

        bestSellerCount:
          products.filter(
            (product) =>
              product.isBestSeller
          ).length,
      };
    }, []);

  const documentationStats =
    useMemo(() => {
      const publishedRecords =
        recordSource ===
        "public"
          ? records
          : records.filter(
              (record) =>
                Boolean(
                  record.published
                ) &&
                Boolean(
                  record.reviewed
                ) &&
                isDocumentationComplete(
                  record
                )
            );

      const completeRecords =
        records.filter(
          isDocumentationComplete
        );

      const reviewedRecords =
        recordSource ===
        "public"
          ? records
          : records.filter(
              (record) =>
                Boolean(
                  record.reviewed
                )
            );

      const uniqueBatches =
        new Set(
          publishedRecords
            .map(
              (record) =>
                record.batchNumber
            )
            .filter(Boolean)
        );

      return {
        totalRecords:
          records.length,

        completeCount:
          completeRecords.length,

        reviewedCount:
          reviewedRecords.length,

        publishedCount:
          publishedRecords.length,

        coaCount:
          publishedRecords.filter(
            (record) =>
              isValidUrl(
                record.coaUrl
              )
          ).length,

        batchCount:
          uniqueBatches.size,

        qrCount:
          publishedRecords.length,
      };
    }, [
      records,
      recordSource,
    ]);

  const automaticChecks =
    useMemo(
      () => [
        {
          id:
            "products-added",

          title:
            "Catalog products added",

          description:
            "The grouped product catalog has been entered.",

          value:
            catalogStats.productCount,

          target:
            catalogStats.productCount,

          buttonLabel:
            "Open Product Manager",

          destination:
            "productManager",
        },

        {
          id:
            "variants-organized",

          title:
            "Strength variants organized",

          description:
            "Every available strength has its own product code and catalog record.",

          value:
            catalogStats.variantCount,

          target:
            catalogStats.variantCount,

          buttonLabel:
            "Review Products",

          destination:
            "productManager",
        },

        {
          id:
            "images-connected",

          title:
            "Product images connected",

          description:
            "Each strength should have a matching final product image.",

          value:
            catalogStats.imageCount,

          target:
            catalogStats.variantCount,

          buttonLabel:
            "Review Image Status",

          destination:
            "productManager",
        },

        {
          id:
            "prices-entered",

          title:
            "Final prices entered",

          description:
            "Products without prices remain disabled and display Price Coming Soon.",

          value:
            catalogStats.priceCount,

          target:
            catalogStats.variantCount,

          buttonLabel:
            "Review Pricing",

          destination:
            "productManager",
        },

        {
          id:
            "coas-connected",

          title:
            "Published COAs connected",

          description:
            "Each published record includes a valid certificate-of-analysis link.",

          value:
            documentationStats.coaCount,

          target:
            catalogStats.variantCount,

          buttonLabel:
            "Open COA Manager",

          destination:
            "coaManager",

          loading:
            documentsLoading,
        },

        {
          id:
            "batches-connected",

          title:
            "Published batch records connected",

          description:
            "Each published catalog option should have an accurate batch record.",

          value:
            documentationStats.publishedCount,

          target:
            catalogStats.variantCount,

          buttonLabel:
            "Review Batch Records",

          destination:
            "coaManager",

          loading:
            documentsLoading,
        },

        {
          id:
            "qr-connected",

          title:
            "QR verification connected",

          description:
            "Every published record can generate a QR code leading to its public verification page.",

          value:
            documentationStats.qrCount,

          target:
            catalogStats.variantCount,

          buttonLabel:
            "Open QR Manager",

          destination:
            "qrManager",

          loading:
            documentsLoading,
        },
      ],
      [
        catalogStats,
        documentationStats,
        documentsLoading,
      ]
    );

  const completedAutomaticChecks =
    automaticChecks.filter(
      (check) =>
        !check.loading &&
        check.target > 0 &&
        check.value >=
          check.target
    ).length;

  const completedManualCount =
    manualLaunchTasks.filter(
      (task) =>
        completedManualTasks[
          task.id
        ]
    ).length;

  const totalChecklistItems =
    automaticChecks.length +
    manualLaunchTasks.length;

  const completedChecklistItems =
    completedAutomaticChecks +
    completedManualCount;

  const launchProgress =
    Math.round(
      (completedChecklistItems /
        totalChecklistItems) *
        100
    );

  function toggleManualTask(
    taskId
  ) {
    setCompletedManualTasks(
      (currentTasks) => ({
        ...currentTasks,

        [taskId]:
          !currentTasks[
            taskId
          ],
      })
    );
  }

  function resetManualChecklist() {
    const shouldReset =
      window.confirm(
        "Reset all manually completed launch tasks?"
      );

    if (shouldReset) {
      setCompletedManualTasks(
        {}
      );
    }
  }

  function refreshDocumentation() {
    setRefreshKey(
      (currentKey) =>
        currentKey + 1
    );
  }

  return (
    <>
      <style>
        {launchChecklistCss}
      </style>

      <main className="launch-page">
        <section className="launch-inner">
          <div className="launch-hero">
            <div>
              <p className="eyebrow">
                304 PEPTIDES ADMIN
              </p>

              <h1>
                Launch Checklist
              </h1>

              <p>
                Track catalog
                completion, live
                documentation
                readiness, business
                setup, storefront
                testing, security, and
                final launch approval.
              </p>

              <div className="launch-status-row">
                <span>
                  {recordSource ===
                  "admin"
                    ? "Admin Documentation Data"
                    : "Published Public Data"}
                </span>

                {documentsLoading && (
                  <span>
                    Refreshing Records
                  </span>
                )}

                {documentsError && (
                  <span className="launch-error-pill">
                    Documentation
                    Unavailable
                  </span>
                )}
              </div>
            </div>

            <div className="launch-hero-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "missionControl"
                  )
                }
              >
                Back To Mission
                Control
              </button>

              <button
                type="button"
                className="secondary-btn"
                disabled={
                  documentsLoading
                }
                onClick={
                  refreshDocumentation
                }
              >
                {documentsLoading
                  ? "Refreshing..."
                  : "Refresh Records"}
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  onNavigate(
                    "products"
                  )
                }
              >
                Review Storefront
              </button>
            </div>
          </div>

          {documentsError && (
            <section className="launch-error-panel">
              <div>
                <p className="eyebrow">
                  DOCUMENTATION
                  SERVICE
                </p>

                <h2>
                  Live records could
                  not be loaded
                </h2>

                <p>
                  {documentsError}
                </p>
              </div>

              <button
                type="button"
                className="primary-btn"
                onClick={
                  refreshDocumentation
                }
              >
                Try Again
              </button>
            </section>
          )}

          <div className="launch-progress-panel">
            <div className="launch-progress-heading">
              <div>
                <p className="eyebrow">
                  OVERALL PROGRESS
                </p>

                <h2>
                  {
                    completedChecklistItems
                  }{" "}
                  Of{" "}
                  {
                    totalChecklistItems
                  }{" "}
                  Complete
                </h2>
              </div>

              <strong>
                {launchProgress}%
              </strong>
            </div>

            <div className="launch-progress-track">
              <div
                className="launch-progress-fill"
                style={{
                  width:
                    `${launchProgress}%`,
                }}
              />
            </div>

            <div className="launch-summary-grid">
              <SummaryCard
                label="Catalog Products"
                value={
                  catalogStats.productCount
                }
                detail={`${catalogStats.bestSellerCount} best sellers`}
              />

              <SummaryCard
                label="Strength Variants"
                value={
                  catalogStats.variantCount
                }
                detail="Individual catalog options"
              />

              <SummaryCard
                label="Published Records"
                value={
                  documentsLoading
                    ? "—"
                    : documentationStats.publishedCount
                }
                detail={`${documentationStats.completeCount} complete records saved`}
              />

              <SummaryCard
                label="Manual Tasks"
                value={`${completedManualCount}/${manualLaunchTasks.length}`}
                detail="Saved in this browser"
              />
            </div>
          </div>

          <section className="launch-panel">
            <div className="launch-panel-heading">
              <div>
                <p className="eyebrow">
                  WEBSITE READINESS
                </p>

                <h2>
                  Automatic Checks
                </h2>
              </div>

              <p>
                Catalog checks use
                the product data.
                Documentation checks
                use the live
                Cloudflare records
                rather than
                placeholder status
                fields.
              </p>
            </div>

            <div className="launch-automatic-grid">
              {automaticChecks.map(
                (check) => {
                  const complete =
                    !check.loading &&
                    check.target >
                      0 &&
                    check.value >=
                      check.target;

                  const percentage =
                    check.loading ||
                    check.target <=
                      0
                      ? 0
                      : Math.min(
                          100,

                          Math.round(
                            (check.value /
                              check.target) *
                              100
                          )
                        );

                  return (
                    <article
                      key={
                        check.id
                      }
                      className={
                        complete
                          ? "launch-check-card launch-check-complete"
                          : "launch-check-card"
                      }
                    >
                      <div className="launch-check-title-row">
                        <span
                          className={
                            complete
                              ? "launch-check-icon launch-check-icon-complete"
                              : "launch-check-icon"
                          }
                        >
                          {check.loading
                            ? "…"
                            : complete
                            ? "✓"
                            : "•"}
                        </span>

                        <div>
                          <h3>
                            {
                              check.title
                            }
                          </h3>

                          <p>
                            {
                              check.description
                            }
                          </p>
                        </div>
                      </div>

                      <div className="launch-check-progress-row">
                        <strong>
                          {check.loading
                            ? "Loading"
                            : `${check.value}/${check.target}`}
                        </strong>

                        <span>
                          {check.loading
                            ? "—"
                            : `${percentage}%`}
                        </span>
                      </div>

                      <div className="launch-small-progress-track">
                        <div
                          className="launch-small-progress-fill"
                          style={{
                            width:
                              `${percentage}%`,
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() =>
                          onNavigate(
                            check.destination
                          )
                        }
                      >
                        {
                          check.buttonLabel
                        }
                      </button>
                    </article>
                  );
                }
              )}
            </div>

            <div className="launch-document-summary">
              <DocumentSummary
                label="Records Saved"
                value={
                  documentsLoading
                    ? "—"
                    : documentationStats.totalRecords
                }
              />

              <DocumentSummary
                label="Complete Records"
                value={
                  documentsLoading
                    ? "—"
                    : documentationStats.completeCount
                }
              />

              <DocumentSummary
                label="Reviewed Records"
                value={
                  documentsLoading
                    ? "—"
                    : documentationStats.reviewedCount
                }
              />

              <DocumentSummary
                label="Published Batches"
                value={
                  documentsLoading
                    ? "—"
                    : documentationStats.batchCount
                }
              />
            </div>
          </section>

          <section className="launch-panel">
            <div className="launch-panel-heading">
              <div>
                <p className="eyebrow">
                  BUSINESS READINESS
                </p>

                <h2>
                  Manual Launch Tasks
                </h2>
              </div>

              <button
                type="button"
                className="launch-reset-button"
                onClick={
                  resetManualChecklist
                }
              >
                Reset Manual Tasks
              </button>
            </div>

            <p className="launch-panel-description">
              Check each item only
              after it has been fully
              reviewed and completed.
              Your progress is saved
              automatically in this
              browser.
            </p>

            <div className="launch-manual-list">
              {manualLaunchTasks.map(
                (
                  task,
                  index
                ) => {
                  const complete =
                    Boolean(
                      completedManualTasks[
                        task.id
                      ]
                    );

                  return (
                    <button
                      key={
                        task.id
                      }
                      type="button"
                      className={
                        complete
                          ? "launch-manual-task launch-manual-complete"
                          : "launch-manual-task"
                      }
                      onClick={() =>
                        toggleManualTask(
                          task.id
                        )
                      }
                    >
                      <span
                        className={
                          complete
                            ? "launch-checkbox launch-checkbox-checked"
                            : "launch-checkbox"
                        }
                      >
                        {complete
                          ? "✓"
                          : ""}
                      </span>

                      <span className="launch-task-number">
                        {String(
                          index +
                            1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>

                      <span className="launch-task-copy">
                        <strong>
                          {
                            task.title
                          }
                        </strong>

                        <span>
                          {
                            task.description
                          }
                        </span>
                      </span>

                      <span
                        className={
                          complete
                            ? "launch-task-badge launch-task-badge-complete"
                            : "launch-task-badge"
                        }
                      >
                        {complete
                          ? "Complete"
                          : "Pending"}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </section>

          <div className="launch-bottom-grid">
            <section className="launch-notice-panel">
              <p className="eyebrow">
                ADMIN SECURITY
              </p>

              <h2>
                Cloudflare Access Is
                Part Of Launch
                Readiness
              </h2>

              <p>
                Confirm only approved
                email addresses can
                reach the admin
                dashboard and admin
                API while the
                storefront, Quality
                page, and public
                verification pages
                remain accessible.
              </p>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "missionControl"
                  )
                }
              >
                Review Admin Tools
              </button>
            </section>

            <section className="launch-notice-panel">
              <p className="eyebrow">
                FINAL REVIEW
              </p>

              <h2>
                Claims And
                Documentation Must
                Remain Accurate
              </h2>

              <p>
                Review product names,
                labels,
                documentation,
                agreements, claims,
                and required
                disclosures before
                the website is
                launched.
              </p>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "researchAgreement"
                  )
                }
              >
                Review Research
                Agreement
              </button>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}) {
  return (
    <div className="launch-summary-card">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <small>
        {detail}
      </small>
    </div>
  );
}

function DocumentSummary({
  label,
  value,
}) {
  return (
    <div>
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

const launchChecklistCss = `
  .launch-page,
  .launch-page *,
  .launch-page *::before,
  .launch-page *::after {
    box-sizing: border-box;
  }

  .launch-page {
    width: 100%;
    max-width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .launch-inner {
    width: 100%;
    max-width: 1300px;
    margin: 0 auto;
  }

  .launch-hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 30px;
    flex-wrap: wrap;
    padding: 48px;
    margin-bottom: 24px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 34px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.2),
        transparent 42%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 90px rgba(0,0,0,0.48);
  }

  .launch-hero h1 {
    margin-bottom: 18px;
    font-size: clamp(45px, 7vw, 64px);
    line-height: 1.02;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #8f8f8f
      );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .launch-hero > div:first-child > p:not(.eyebrow) {
    max-width: 760px;
    color: #c8c8c8;
    font-size: 18px;
    line-height: 1.8;
  }

  .launch-status-row,
  .launch-hero-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .launch-status-row {
    margin-top: 18px;
  }

  .launch-status-row span {
    display: inline-flex;
    width: fit-content;
    padding: 8px 12px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 999px;
    background: rgba(61,165,255,0.11);
    color: #9ed8ff;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .launch-status-row .launch-error-pill {
    border-color: rgba(255,100,100,0.28);
    background: rgba(255,60,60,0.09);
    color: #ffd0d0;
  }

  .launch-progress-panel,
  .launch-panel,
  .launch-notice-panel {
    min-width: 0;
    padding: 30px;
    margin-bottom: 24px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background: rgba(255,255,255,0.035);
  }

  .launch-progress-panel {
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.13),
        transparent 40%
      ),
      rgba(255,255,255,0.035);
  }

  .launch-progress-heading,
  .launch-panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 22px;
    flex-wrap: wrap;
  }

  .launch-progress-heading h2,
  .launch-panel-heading h2 {
    color: #ffffff;
    font-size: clamp(29px, 4vw, 35px);
    line-height: 1.15;
  }

  .launch-progress-heading > strong {
    color: #9ed8ff;
    font-size: 42px;
  }

  .launch-progress-track {
    height: 15px;
    margin: 24px 0;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255,255,255,0.07);
  }

  .launch-progress-fill,
  .launch-small-progress-fill {
    height: 100%;
    border-radius: 999px;
    background:
      linear-gradient(
        90deg,
        #3da5ff,
        #9ed8ff
      );
    transition: width 0.3s ease;
  }

  .launch-summary-grid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .launch-summary-card {
    min-width: 0;
    display: grid;
    gap: 7px;
    padding: 19px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    background: rgba(0,0,0,0.23);
    overflow-wrap: anywhere;
  }

  .launch-summary-card span,
  .launch-document-summary span {
    color: #9ed8ff;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .launch-summary-card strong {
    color: #ffffff;
    font-size: 29px;
  }

  .launch-summary-card small {
    color: #8f9ba7;
    line-height: 1.5;
  }

  .launch-panel-heading > p {
    max-width: 680px;
    color: #9ca8b3;
    line-height: 1.7;
  }

  .launch-panel-description {
    max-width: 850px;
    margin-top: 12px;
    color: #9ca8b3;
    line-height: 1.7;
  }

  .launch-automatic-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 24px;
  }

  .launch-check-card {
    min-width: 0;
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 21px;
    background: rgba(0,0,0,0.22);
  }

  .launch-check-complete {
    border-color: rgba(61,165,255,0.28);
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.13),
        transparent 44%
      ),
      rgba(0,0,0,0.22);
  }

  .launch-check-title-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }

  .launch-check-icon {
    width: 34px;
    min-width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(255,255,255,0.07);
    color: #9ca8b3;
    font-weight: 900;
  }

  .launch-check-icon-complete {
    background: rgba(61,165,255,0.2);
    color: #9ed8ff;
  }

  .launch-check-title-row h3 {
    margin-bottom: 8px;
    color: #ffffff;
    font-size: 21px;
    line-height: 1.2;
  }

  .launch-check-title-row p {
    color: #9ca8b3;
    font-size: 14px;
    line-height: 1.65;
  }

  .launch-check-progress-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-top: 18px;
  }

  .launch-check-progress-row strong {
    color: #ffffff;
    font-size: 22px;
  }

  .launch-check-complete .launch-check-progress-row strong {
    color: #9ed8ff;
  }

  .launch-check-progress-row span {
    color: #9ca8b3;
    font-weight: 900;
  }

  .launch-small-progress-track {
    height: 9px;
    margin-top: 10px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255,255,255,0.07);
  }

  .launch-check-card > button {
    width: 100%;
    margin-top: 18px;
  }

  .launch-document-summary {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 18px;
  }

  .launch-document-summary > div {
    min-width: 0;
    display: grid;
    gap: 6px;
    padding: 14px;
    border: 1px solid rgba(61,165,255,0.16);
    border-radius: 14px;
    background: rgba(61,165,255,0.07);
  }

  .launch-document-summary strong {
    color: #ffffff;
    font-size: 22px;
  }

  .launch-reset-button {
    padding: 12px 16px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    background: rgba(255,255,255,0.045);
    color: #aeb7bf;
    font: inherit;
    font-weight: 900;
    cursor: pointer;
  }

  .launch-manual-list {
    display: grid;
    gap: 11px;
    margin-top: 24px;
  }

  .launch-manual-task {
    width: 100%;
    min-width: 0;
    display: grid;
    grid-template-columns:
      38px 40px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 17px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 17px;
    background: rgba(0,0,0,0.22);
    color: #ffffff;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .launch-manual-complete {
    border-color: rgba(61,165,255,0.28);
    background: rgba(61,165,255,0.09);
  }

  .launch-checkbox {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 9px;
    background: rgba(255,255,255,0.04);
  }

  .launch-checkbox-checked {
    border-color: rgba(61,165,255,0.45);
    background: rgba(61,165,255,0.22);
    color: #9ed8ff;
    font-weight: 900;
  }

  .launch-task-number {
    color: #6f7c88;
    font-size: 13px;
    font-weight: 900;
  }

  .launch-task-copy {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .launch-task-copy strong {
    color: #ffffff;
    font-size: 17px;
  }

  .launch-task-copy > span {
    color: #9ca8b3;
    font-size: 13px;
    line-height: 1.55;
  }

  .launch-task-badge {
    padding: 7px 11px;
    border-radius: 999px;
    background: rgba(255,255,255,0.07);
    color: #aeb7bf;
    font-size: 11px;
    font-weight: 900;
  }

  .launch-task-badge-complete {
    background: rgba(61,165,255,0.16);
    color: #9ed8ff;
  }

  .launch-bottom-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 24px;
  }

  .launch-notice-panel {
    margin-bottom: 0;
  }

  .launch-notice-panel h2 {
    margin-bottom: 12px;
    color: #ffffff;
    font-size: 27px;
  }

  .launch-notice-panel p:not(.eyebrow) {
    color: #aeb7bf;
    line-height: 1.75;
  }

  .launch-notice-panel button {
    margin-top: 18px;
  }

  .launch-error-panel {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 22px;
    flex-wrap: wrap;
    margin-bottom: 24px;
    padding: 24px;
    border: 1px solid rgba(255,100,100,0.25);
    border-radius: 22px;
    background: rgba(255,60,60,0.07);
    color: #ffd0d0;
  }

  .launch-error-panel h2 {
    margin: 6px 0 8px;
    color: #ffffff;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 1050px) {
    .launch-page {
      padding: 65px 24px;
    }

    .launch-summary-grid,
    .launch-document-summary {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .launch-page {
      padding: 44px 12px;
    }

    .launch-hero,
    .launch-progress-panel,
    .launch-panel,
    .launch-notice-panel {
      padding: 20px;
      border-radius: 22px;
    }

    .launch-hero-actions,
    .launch-hero-actions button {
      width: 100%;
    }

    .launch-automatic-grid,
    .launch-bottom-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .launch-manual-task {
      grid-template-columns:
        38px minmax(0, 1fr) auto;
    }

    .launch-task-number {
      display: none;
    }
  }

  @media (max-width: 500px) {
    .launch-page {
      padding: 34px 8px;
    }

    .launch-hero,
    .launch-progress-panel,
    .launch-panel,
    .launch-notice-panel {
      padding: 15px;
    }

    .launch-summary-grid,
    .launch-document-summary {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .launch-manual-task {
      grid-template-columns:
        34px minmax(0, 1fr);
      align-items: flex-start;
    }

    .launch-task-badge {
      grid-column: 2;
      width: fit-content;
    }
  }
`;

export default LaunchChecklist;
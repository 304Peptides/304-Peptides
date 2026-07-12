import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  products,
} from "../data/products";

const documentAdminSessionKey =
  "304-document-admin-session";

function getCatalogVariants() {
  return products.flatMap(
    (product) =>
      product.variants?.length
        ? product.variants.map(
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
          )
        : [
            {
              ...product,

              productName:
                product.name,
            },
          ]
  );
}

function isValidUrl(value) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return false;
  }

  try {
    const url =
      new URL(value);

    return (
      url.protocol === "https:" ||
      url.protocol === "http:"
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

function MissionControl({
  onNavigate = () => {},
}) {
  const [
    records,
    setRecords,
  ] = useState([]);

  const [
    documentsLoading,
    setDocumentsLoading,
  ] = useState(true);

  const [
    documentsError,
    setDocumentsError,
  ] = useState("");

  const [
    recordSource,
    setRecordSource,
  ] = useState("public");

  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0);

  const catalogStats =
    useMemo(() => {
      const variants =
        getCatalogVariants();

      const imageCount =
        variants.filter(
          (variant) =>
            Boolean(
              variant.image
            )
        ).length;

      const pricedCount =
        variants.filter(
          (variant) =>
            Number.isFinite(
              variant.price
            )
        ).length;

      const bestSellerCount =
        products.filter(
          (product) =>
            product.isBestSeller
        ).length;

      return {
        productCount:
          products.length,

        variantCount:
          variants.length,

        imageCount,

        pricedCount,

        bestSellerCount,
      };
    }, []);

  useEffect(() => {
    const controller =
      new AbortController();

    async function requestRecords({
      endpoint,
      secret,
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

            secret: "",
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

  const documentationStats =
    useMemo(() => {
      const completeRecords =
        records.filter(
          isDocumentationComplete
        );

      const reviewedRecords =
        records.filter(
          (record) =>
            Boolean(
              record.reviewed
            )
        );

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

      const coaRecords =
        records.filter(
          (record) =>
            isValidUrl(
              record.coaUrl
            )
        );

      const verificationRecords =
        records.filter(
          (record) =>
            isValidUrl(
              record.verificationUrl
            )
        );

      const uniqueBatches =
        new Set(
          records
            .map(
              (record) =>
                record.batchNumber
            )
            .filter(Boolean)
        );

      const uniqueLabs =
        new Set(
          records
            .map(
              (record) =>
                record.labName
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
          coaRecords.length,

        verificationCount:
          verificationRecords.length,

        batchCount:
          uniqueBatches.size,

        labCount:
          uniqueLabs.size,

        draftCount:
          Math.max(
            0,
            records.length -
              publishedRecords.length
          ),
      };
    }, [
      records,
      recordSource,
    ]);

  const launchChecks =
    useMemo(
      () => [
        {
          label:
            "Products added",

          value:
            catalogStats.productCount,

          target:
            catalogStats.productCount,
        },

        {
          label:
            "Strength variants organized",

          value:
            catalogStats.variantCount,

          target:
            catalogStats.variantCount,
        },

        {
          label:
            "Product images connected",

          value:
            catalogStats.imageCount,

          target:
            catalogStats.variantCount,
        },

        {
          label:
            "Prices entered",

          value:
            catalogStats.pricedCount,

          target:
            catalogStats.variantCount,
        },

        {
          label:
            "Published COAs",

          value:
            documentationStats.publishedCount,

          target:
            catalogStats.variantCount,
        },

        {
          label:
            "Batch records published",

          value:
            documentationStats.publishedCount,

          target:
            catalogStats.variantCount,
        },

        {
          label:
            "Public verification records",

          value:
            documentationStats.publishedCount,

          target:
            catalogStats.variantCount,
        },
      ],
      [
        catalogStats,
        documentationStats,
      ]
    );

  const completedChecks =
    launchChecks.filter(
      (item) =>
        item.target > 0 &&
        item.value >=
          item.target
    ).length;

  const launchProgress =
    Math.round(
      (completedChecks /
        launchChecks.length) *
        100
    );

  const documentationSourceLabel =
    recordSource ===
    "admin"
      ? "Admin Records"
      : "Published Public Records";

  function refreshDocumentation() {
    setRefreshKey(
      (currentKey) =>
        currentKey + 1
    );
  }

  return (
    <>
      <style>
        {missionControlCss}
      </style>

      <main className="mission-page">
        <section className="mission-inner">
          <div className="mission-hero">
            <div>
              <p className="eyebrow">
                304 PEPTIDES ADMIN
              </p>

              <h1 className="mission-title">
                Mission Control
              </h1>

              <p className="mission-subtitle">
                Review catalog
                readiness, live
                documentation status,
                customer tools,
                partner operations,
                and website launch
                progress.
              </p>

              <div className="mission-source-row">
                <span className="mission-source-pill">
                  {
                    documentationSourceLabel
                  }
                </span>

                {documentsLoading && (
                  <span className="mission-loading-pill">
                    Refreshing
                  </span>
                )}

                {documentsError && (
                  <span className="mission-error-pill">
                    Documentation
                    Unavailable
                  </span>
                )}
              </div>
            </div>

            <div className="mission-hero-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "home"
                  )
                }
              >
                View Website
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
                    "launchChecklist"
                  )
                }
              >
                Open Launch
                Checklist
              </button>
            </div>
          </div>

          <div className="mission-stats-grid">
            <StatCard
              label="Catalog Products"
              value={
                catalogStats.productCount
              }
              detail={`${catalogStats.bestSellerCount} marked as best sellers`}
            />

            <StatCard
              label="Strength Variants"
              value={
                catalogStats.variantCount
              }
              detail="Individual catalog options"
            />

            <StatCard
              label="Published COAs"
              value={
                documentsLoading
                  ? "—"
                  : documentationStats.publishedCount
              }
              detail={`${documentationStats.draftCount} draft or unpublished`}
            />

            <StatCard
              label="Published Batches"
              value={
                documentsLoading
                  ? "—"
                  : documentationStats.batchCount
              }
              detail={`${documentationStats.labCount} laboratories represented`}
            />
          </div>

          {documentsError && (
            <section className="mission-error-panel">
              <div>
                <p className="eyebrow">
                  DOCUMENTATION
                  SERVICE
                </p>

                <h2>
                  Records Could Not Be
                  Loaded
                </h2>

                <p>
                  {
                    documentsError
                  }
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

          <div className="mission-dashboard-grid">
            <section className="mission-launch-panel">
              <div className="mission-panel-heading">
                <div>
                  <p className="eyebrow">
                    LAUNCH READINESS
                  </p>

                  <h2 className="mission-section-title">
                    Website Progress
                  </h2>
                </div>

                <strong className="mission-progress-number">
                  {launchProgress}%
                </strong>
              </div>

              <div className="mission-progress-track">
                <div
                  className="mission-progress-fill"
                  style={{
                    width:
                      `${launchProgress}%`,
                  }}
                />
              </div>

              <div className="mission-check-list">
                {launchChecks.map(
                  (item) => {
                    const complete =
                      item.target >
                        0 &&
                      item.value >=
                        item.target;

                    return (
                      <div
                        key={
                          item.label
                        }
                        className="mission-check-row"
                      >
                        <div className="mission-check-identity">
                          <span
                            className={
                              complete
                                ? "mission-check-dot mission-check-complete"
                                : "mission-check-dot"
                            }
                          >
                            {complete
                              ? "✓"
                              : "•"}
                          </span>

                          <span>
                            {
                              item.label
                            }
                          </span>
                        </div>

                        <strong
                          className={
                            complete
                              ? "mission-complete-text"
                              : ""
                          }
                        >
                          {
                            item.value
                          }
                          /
                          {
                            item.target
                          }
                        </strong>
                      </div>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                className="primary-btn mission-full-button"
                onClick={() =>
                  onNavigate(
                    "launchChecklist"
                  )
                }
              >
                Review Full Launch
                Checklist
              </button>
            </section>

            <section className="mission-documentation-panel">
              <div className="mission-panel-heading">
                <div>
                  <p className="eyebrow">
                    DOCUMENTATION
                  </p>

                  <h2 className="mission-section-title">
                    Verification
                    Readiness
                  </h2>
                </div>

                <span className="mission-live-pill">
                  Live Data
                </span>
              </div>

              <div className="mission-documentation-grid">
                <DocumentationCard
                  label="Records Saved"
                  value={
                    documentationStats.totalRecords
                  }
                  loading={
                    documentsLoading
                  }
                />

                <DocumentationCard
                  label="Complete Records"
                  value={
                    documentationStats.completeCount
                  }
                  loading={
                    documentsLoading
                  }
                />

                <DocumentationCard
                  label="Reviewed Records"
                  value={
                    documentationStats.reviewedCount
                  }
                  loading={
                    documentsLoading
                  }
                />

                <DocumentationCard
                  label="Published Records"
                  value={
                    documentationStats.publishedCount
                  }
                  loading={
                    documentsLoading
                  }
                  ready
                />

                <DocumentationCard
                  label="COA Links"
                  value={
                    documentationStats.coaCount
                  }
                  loading={
                    documentsLoading
                  }
                />

                <DocumentationCard
                  label="Verification Links"
                  value={
                    documentationStats.verificationCount
                  }
                  loading={
                    documentsLoading
                  }
                />

                <DocumentationCard
                  label="Unique Batches"
                  value={
                    documentationStats.batchCount
                  }
                  loading={
                    documentsLoading
                  }
                />

                <DocumentationCard
                  label="Testing Labs"
                  value={
                    documentationStats.labCount
                  }
                  loading={
                    documentsLoading
                  }
                />
              </div>

              <div className="mission-document-buttons">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() =>
                    onNavigate(
                      "coaManager"
                    )
                  }
                >
                  Open COA Manager
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    onNavigate(
                      "quality"
                    )
                  }
                >
                  View Public Quality
                  Page
                </button>
              </div>

              <div className="mission-qr-note">
                <strong>
                  QR Generator:
                </strong>{" "}
                Not built yet. A
                dedicated QR tool can
                be added next to
                generate printable QR
                codes that point to
                each published public
                record.
              </div>
            </section>
          </div>

          <section className="mission-tools-panel">
            <div className="mission-tools-heading">
              <div>
                <p className="eyebrow">
                  ADMIN TOOLS
                </p>

                <h2 className="mission-section-title">
                  Business Controls
                </h2>
              </div>

              <p>
                Open each management
                area from one central
                dashboard.
              </p>
            </div>

            <div className="mission-tools-grid">
              <ToolCard
                icon="01"
                title="Product Manager"
                description="Review products, strengths, images, codes, pricing, and storefront readiness."
                buttonLabel="Manage Products"
                onClick={() =>
                  onNavigate(
                    "productManager"
                  )
                }
              />

              <ToolCard
                icon="02"
                title="COA Manager"
                description="Create and review certificate records, batch information, laboratory details, and public verification links."
                buttonLabel="Manage Documentation"
                onClick={() =>
                  onNavigate(
                    "coaManager"
                  )
                }
              />

              <ToolCard
                icon="03"
                title="Customer Manager"
                description="Review prototype customer accounts, research acceptance, and order activity."
                buttonLabel="Manage Customers"
                onClick={() =>
                  onNavigate(
                    "customerManager"
                  )
                }
              />

              <ToolCard
                icon="04"
                title="Site Settings"
                description="Manage storefront messages, contact details, availability, and website settings."
                buttonLabel="Open Settings"
                onClick={() =>
                  onNavigate(
                    "siteSettings"
                  )
                }
              />

              <ToolCard
                icon="05"
                title="Partner HQ"
                description="Review research partner activity, affiliate tools, applications, and rewards."
                buttonLabel="Open Partner HQ"
                onClick={() =>
                  onNavigate(
                    "partnerHQ"
                  )
                }
              />

              <ToolCard
                icon="06"
                title="Marketing Center"
                description="Prepare social posts, launch messages, promotions, and brand content."
                buttonLabel="Open Marketing"
                onClick={() =>
                  onNavigate(
                    "marketingCenter"
                  )
                }
              />
            </div>
          </section>

          <div className="mission-bottom-grid">
            <section className="mission-notice-panel">
              <p className="eyebrow">
                STORE STATUS
              </p>

              <h2>
                Catalog Protected
              </h2>

              <p>
                Products without a
                valid price display
                Price Coming Soon and
                cannot be added to the
                cart.
              </p>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "products"
                  )
                }
              >
                Review Storefront
              </button>
            </section>

            <section className="mission-notice-panel">
              <p className="eyebrow">
                RESEARCH NOTICE
              </p>

              <h2>
                Required Language
                Active
              </h2>

              <p>
                Catalog pages identify
                products as being for
                research use only and
                not intended for human
                consumption.
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
                Review Agreement
              </button>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
  detail,
}) {
  return (
    <div className="mission-stat-card">
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

function DocumentationCard({
  label,
  value,
  loading,
  ready = false,
}) {
  return (
    <div
      className={
        ready
          ? "mission-document-card mission-document-ready"
          : "mission-document-card"
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {loading
          ? "—"
          : value}
      </strong>
    </div>
  );
}

function ToolCard({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
}) {
  return (
    <article className="mission-tool-card">
      <div className="mission-tool-icon">
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>

      <button
        type="button"
        className="secondary-btn"
        onClick={
          onClick
        }
      >
        {buttonLabel}
      </button>
    </article>
  );
}

const missionControlCss = `
  .mission-page,
  .mission-page *,
  .mission-page *::before,
  .mission-page *::after {
    box-sizing: border-box;
  }

  .mission-page {
    width: 100%;
    max-width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .mission-inner {
    width: 100%;
    max-width: 1300px;
    margin: 0 auto;
  }

  .mission-hero {
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

  .mission-title {
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

  .mission-subtitle {
    max-width: 760px;
    color: #c8c8c8;
    font-size: 18px;
    line-height: 1.8;
  }

  .mission-source-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 18px;
  }

  .mission-source-pill,
  .mission-loading-pill,
  .mission-error-pill,
  .mission-live-pill {
    display: inline-flex;
    width: fit-content;
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .mission-source-pill,
  .mission-live-pill {
    border: 1px solid rgba(61,165,255,0.3);
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
  }

  .mission-loading-pill {
    border: 1px solid rgba(255,255,255,0.11);
    background: rgba(255,255,255,0.055);
    color: #c8c8c8;
  }

  .mission-error-pill {
    border: 1px solid rgba(255,110,110,0.28);
    background: rgba(255,60,60,0.09);
    color: #ffd0d0;
  }

  .mission-hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .mission-stats-grid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 24px;
  }

  .mission-stat-card {
    min-width: 0;
    display: grid;
    gap: 8px;
    padding: 24px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 24px;
    background: rgba(255,255,255,0.035);
    box-shadow:
      0 24px 65px rgba(0,0,0,0.3);
    overflow-wrap: anywhere;
  }

  .mission-stat-card > span {
    color: #9ed8ff;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .mission-stat-card > strong {
    color: #ffffff;
    font-size: 36px;
  }

  .mission-stat-card > small {
    color: #8f9ba7;
    line-height: 1.5;
  }

  .mission-error-panel {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 22px;
    flex-wrap: wrap;
    margin-bottom: 24px;
    padding: 24px;
    border: 1px solid rgba(255,110,110,0.26);
    border-radius: 22px;
    background: rgba(255,60,60,0.08);
    color: #ffd1d1;
  }

  .mission-error-panel h2 {
    margin: 6px 0 9px;
    color: #ffffff;
  }

  .mission-dashboard-grid {
    display: grid;
    grid-template-columns:
      minmax(0, 1.15fr)
      minmax(340px, 0.85fr);
    gap: 24px;
    margin-bottom: 24px;
  }

  .mission-launch-panel,
  .mission-documentation-panel,
  .mission-tools-panel,
  .mission-notice-panel {
    min-width: 0;
    padding: 30px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background: rgba(255,255,255,0.035);
  }

  .mission-launch-panel {
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.12),
        transparent 38%
      ),
      rgba(255,255,255,0.035);
  }

  .mission-panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    flex-wrap: wrap;
  }

  .mission-section-title {
    color: #ffffff;
    font-size: clamp(29px, 4vw, 35px);
    line-height: 1.15;
  }

  .mission-progress-number {
    color: #9ed8ff;
    font-size: 36px;
  }

  .mission-progress-track {
    height: 14px;
    margin: 24px 0;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255,255,255,0.07);
  }

  .mission-progress-fill {
    height: 100%;
    border-radius: 999px;
    background:
      linear-gradient(
        90deg,
        rgba(61,165,255,0.55),
        #9ed8ff
      );
    box-shadow:
      0 0 24px rgba(61,165,255,0.32);
  }

  .mission-check-list {
    display: grid;
    gap: 10px;
  }

  .mission-check-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    padding: 13px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    background: rgba(0,0,0,0.22);
    color: #c8c8c8;
  }

  .mission-check-identity {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mission-check-dot {
    width: 25px;
    min-width: 25px;
    height: 25px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(255,255,255,0.07);
    color: #9ca8b3;
    font-weight: 900;
  }

  .mission-check-complete {
    background: rgba(61,165,255,0.2);
    color: #9ed8ff;
  }

  .mission-complete-text {
    color: #9ed8ff;
  }

  .mission-full-button {
    width: 100%;
    margin-top: 22px;
  }

  .mission-documentation-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 22px;
  }

  .mission-document-card {
    min-width: 0;
    display: grid;
    gap: 7px;
    padding: 17px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    background: rgba(0,0,0,0.23);
    color: #9ca8b3;
    overflow-wrap: anywhere;
  }

  .mission-document-card strong {
    color: #ffffff;
    font-size: 23px;
  }

  .mission-document-ready {
    border-color: rgba(61,165,255,0.24);
    background: rgba(61,165,255,0.09);
  }

  .mission-document-ready strong {
    color: #9ed8ff;
  }

  .mission-document-buttons {
    display: grid;
    gap: 10px;
    margin-top: 22px;
  }

  .mission-qr-note {
    margin-top: 16px;
    padding: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    background: rgba(0,0,0,0.21);
    color: #9ca8b3;
    font-size: 12px;
    line-height: 1.65;
  }

  .mission-qr-note strong {
    color: #ffffff;
  }

  .mission-tools-panel {
    margin-bottom: 24px;
  }

  .mission-tools-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 22px;
  }

  .mission-tools-heading > p {
    max-width: 470px;
    color: #9ca8b3;
    line-height: 1.7;
  }

  .mission-tools-grid {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .mission-tool-card {
    min-width: 0;
    min-height: 260px;
    display: flex;
    flex-direction: column;
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 21px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.09),
        transparent 40%
      ),
      rgba(0,0,0,0.22);
  }

  .mission-tool-icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    margin-bottom: 18px;
    border: 1px solid rgba(61,165,255,0.26);
    border-radius: 15px;
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
    font-weight: 900;
  }

  .mission-tool-card h3 {
    margin-bottom: 10px;
    color: #ffffff;
    font-size: 24px;
  }

  .mission-tool-card p {
    margin-bottom: 22px;
    color: #aeb7bf;
    line-height: 1.7;
  }

  .mission-tool-card button {
    width: 100%;
    margin-top: auto;
  }

  .mission-bottom-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 24px;
  }

  .mission-notice-panel h2 {
    margin-bottom: 12px;
    color: #ffffff;
    font-size: 28px;
  }

  .mission-notice-panel p {
    color: #aeb7bf;
    line-height: 1.75;
  }

  .mission-notice-panel button {
    margin-top: 18px;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 1050px) {
    .mission-page {
      padding: 65px 24px;
    }

    .mission-stats-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .mission-dashboard-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .mission-tools-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .mission-page {
      padding: 44px 12px;
    }

    .mission-hero,
    .mission-launch-panel,
    .mission-documentation-panel,
    .mission-tools-panel,
    .mission-notice-panel {
      padding: 20px;
      border-radius: 22px;
    }

    .mission-hero-actions,
    .mission-hero-actions button {
      width: 100%;
    }

    .mission-tools-grid,
    .mission-bottom-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }
  }

  @media (max-width: 450px) {
    .mission-page {
      padding: 34px 8px;
    }

    .mission-hero,
    .mission-launch-panel,
    .mission-documentation-panel,
    .mission-tools-panel,
    .mission-notice-panel {
      padding: 15px;
    }

    .mission-stats-grid,
    .mission-documentation-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .mission-check-row {
      align-items: flex-start;
    }
  }
`;

export default MissionControl;
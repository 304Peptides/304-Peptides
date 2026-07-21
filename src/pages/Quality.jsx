import brandBadgeLogo from "../assets/images/logo-nav.webp";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { products } from "../data/products";

const qualitySteps = [
  {
    title: "Clear Product Identity",

    text:
      "Published records are tied to a specific product code and strength so documentation can be matched to the correct catalog item.",
  },
  {
    title: "Batch-Level Records",

    text:
      "Each published documentation record includes a batch number, testing laboratory, test date, and matching certificate link.",
  },
  {
    title: "Verification Access",

    text:
      "Published records may include a separate verification destination for direct documentation confirmation and future QR access.",
  },
  {
    title: "Research-Use Language",

    text:
      "Products and documentation are presented for research use only without dosing guidance, treatment claims, or personal-use instructions.",
  },
];

function buildCatalogMap() {
  const catalogMap =
    new Map();

  products.forEach(
    (product) => {
      const variants =
        product.variants?.length
          ? product.variants
          : [product];

      variants.forEach(
        (variant) => {
          catalogMap.set(
            variant.codeName,
            {
              ...product,
              ...variant,

              productName:
                product.name,

              category:
                product.category,

              description:
                variant.description ||
                product.description,

              image:
                variant.image ||
                product.image ||
                null,
            }
          );
        }
      );
    }
  );

  return catalogMap;
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const parsedDate =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return value;
  }

  return parsedDate.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

function formatUpdatedAt(value) {
  if (!value) {
    return "Not available";
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return value;
  }

  return parsedDate.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function Quality({
  onNavigate,
}) {
  const [records, setRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    activeCategory,
    setActiveCategory,
  ] = useState(
    "All Published Records"
  );

  const catalogMap = useMemo(
    () => buildCatalogMap(),
    []
  );

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadDocuments() {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/documents",
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",
              },

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
              "Published documentation could not be loaded."
          );
        }

        setRecords(
          Array.isArray(
            result.records
          )
            ? result.records
            : []
        );
      } catch (requestError) {
        if (
          requestError.name ===
          "AbortError"
        ) {
          return;
        }

        setRecords([]);

        setError(
          requestError.message ||
            "Published documentation could not be loaded."
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setLoading(false);
        }
      }
    }

    loadDocuments();

    return () => {
      controller.abort();
    };
  }, [refreshKey]);

  const publishedRecords =
    useMemo(
      () =>
        records.map(
          (record) => {
            const catalogItem =
              catalogMap.get(
                record.codeName
              );

            return {
              ...record,

              image:
                catalogItem?.image ||
                null,

              category:
                record.category ||
                catalogItem?.category ||
                "Research Product",

              description:
                catalogItem?.description ||
                "",

              purity:
                catalogItem?.purity ||
                "",
            };
          }
        ),
      [catalogMap, records]
    );

  const categoryOptions =
    useMemo(() => {
      const publishedCategories =
        Array.from(
          new Set(
            publishedRecords
              .map(
                (record) =>
                  record.category
              )
              .filter(Boolean)
          )
        ).sort();

      return [
        "All Published Records",
        ...publishedCategories,
      ];
    }, [publishedRecords]);

  const filteredRecords =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return publishedRecords.filter(
        (record) => {
          const matchesCategory =
            activeCategory ===
              "All Published Records" ||
            record.category ===
              activeCategory;

          const searchableText = [
            record.productName,
            record.codeName,
            record.strength,
            record.category,
            record.batchNumber,
            record.labName,
            record.testDate,
            record.composition,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            normalizedSearch === "" ||
            searchableText.includes(
              normalizedSearch
            );

          return (
            matchesCategory &&
            matchesSearch
          );
        }
      );
    }, [
      activeCategory,
      publishedRecords,
      searchTerm,
    ]);

  const documentationStats =
    useMemo(() => {
      const labs =
        new Set(
          publishedRecords
            .map(
              (record) =>
                record.labName
            )
            .filter(Boolean)
        );

      const batches =
        new Set(
          publishedRecords
            .map(
              (record) =>
                record.batchNumber
            )
            .filter(Boolean)
        );

      const updatedDates =
        publishedRecords
          .map((record) => {
            const date =
              new Date(
                record.updatedAt
              );

            return Number.isNaN(
              date.getTime()
            )
              ? null
              : date;
          })
          .filter(Boolean)
          .sort(
            (left, right) =>
              right.getTime() -
              left.getTime()
          );

      return {
        recordCount:
          publishedRecords.length,

        laboratoryCount:
          labs.size,

        batchCount:
          batches.size,

        latestUpdate:
          updatedDates[0]
            ? updatedDates[0]
                .toLocaleDateString(
                  undefined,
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }
                )
            : "No records yet",
      };
    }, [publishedRecords]);

  function resetFilters() {
    setSearchTerm("");

    setActiveCategory(
      "All Published Records"
    );
  }

  function refreshDocuments() {
    setRefreshKey(
      (currentKey) =>
        currentKey + 1
    );
  }

  return (
    <>
      <style>
        {qualityCss}
      </style>

      <main className="quality-page">
        <section className="quality-inner">
          <div className="quality-hero">
            <p className="eyebrow">
              QUALITY STANDARD
            </p>

            <h1 className="quality-title">
              Trust Is Earned
            </h1>

            <p className="quality-subtitle">
              304 Peptides is built
              around clear product
              identification,
              research-use language,
              batch-level
              documentation, and
              transparent access to
              published laboratory
              records.
            </p>

            <div className="quality-button-row">
              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  onNavigate(
                    "products"
                  )
                }
              >
                Browse Products
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "researchAgreement"
                  )
                }
              >
                Research Agreement
              </button>
            </div>
          </div>

          <div className="quality-statement">
            <p className="eyebrow">
              304 STANDARD
            </p>

            <h2 className="quality-section-title">
              Precision.
              Transparency.
              Quality.
            </h2>

            <p className="quality-text">
              Product pages, labels,
              documentation records,
              checkout steps, and
              verification links should
              reinforce the same
              standard: research-use
              products require clear
              identity, accurate
              records, and honest
              presentation.
            </p>
          </div>

          <div className="quality-steps">
            {qualitySteps.map(
              (step) => (
                <article
                  key={step.title}
                  className="quality-step-card"
                >
                  <h3>
                    {step.title}
                  </h3>

                  <p>
                    {step.text}
                  </p>
                </article>
              )
            )}
          </div>

          <section className="quality-documentation-panel">
            <div className="quality-documentation-heading">
              <div>
                <p className="eyebrow">
                  PUBLISHED
                  DOCUMENTATION
                </p>

                <h2 className="quality-section-title">
                  COA And Batch
                  Records
                </h2>

                <p className="quality-text">
                  This section displays
                  only records that have
                  complete batch
                  information, valid
                  document links,
                  internal review, and
                  public publication
                  status.
                </p>
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={
                  refreshDocuments
                }
                disabled={loading}
              >
                {loading
                  ? "Refreshing..."
                  : "Refresh Records"}
              </button>
            </div>

            <div className="quality-stats">
              <QualityStat
                label="Published Records"
                value={
                  documentationStats.recordCount
                }
                detail="Completed public records"
              />

              <QualityStat
                label="Published Batches"
                value={
                  documentationStats.batchCount
                }
                detail="Unique batch numbers"
              />

              <QualityStat
                label="Testing Laboratories"
                value={
                  documentationStats.laboratoryCount
                }
                detail="Named in public records"
              />

              <QualityStat
                label="Latest Update"
                value={
                  documentationStats.latestUpdate
                }
                detail="Most recent record change"
                compact
              />
            </div>

            {!loading &&
              !error &&
              publishedRecords.length >
                0 && (
                <div className="quality-filters">
                  <input
                    type="search"
                    className="quality-search"
                    placeholder="Search by product, code, strength, batch, or laboratory..."
                    value={searchTerm}
                    onChange={(
                      event
                    ) =>
                      setSearchTerm(
                        event.target
                          .value
                      )
                    }
                  />

                  <div className="quality-category-row">
                    {categoryOptions.map(
                      (category) => (
                        <button
                          key={
                            category
                          }
                          type="button"
                          className={
                            activeCategory ===
                            category
                              ? "primary-btn"
                              : "secondary-btn"
                          }
                          onClick={() =>
                            setActiveCategory(
                              category
                            )
                          }
                        >
                          {category}
                        </button>
                      )
                    )}
                  </div>

                  <div className="quality-results-bar">
                    <span>
                      Showing{" "}
                      <strong>
                        {
                          filteredRecords.length
                        }
                      </strong>{" "}
                      published record
                      {filteredRecords.length ===
                      1
                        ? ""
                        : "s"}
                    </span>

                    <span>
                      Category:{" "}
                      <strong>
                        {
                          activeCategory
                        }
                      </strong>
                    </span>
                  </div>
                </div>
              )}

            {loading && (
              <div className="quality-state-panel">
                <div className="quality-loader" />

                <h3>
                  Loading Published
                  Records
                </h3>

                <p>
                  Connecting to the
                  documentation service.
                </p>
              </div>
            )}

            {!loading && error && (
              <div className="quality-error-panel">
                <p className="eyebrow">
                  DOCUMENTATION
                  UNAVAILABLE
                </p>

                <h3>
                  Records Could Not Be
                  Loaded
                </h3>

                <p>{error}</p>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={
                    refreshDocuments
                  }
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading &&
              !error &&
              publishedRecords.length ===
                0 && (
                <div className="quality-state-panel">
                  <p className="eyebrow">
                    DOCUMENTATION
                    LIBRARY
                  </p>

                  <h3>
                    Published Records
                    Coming Soon
                  </h3>

                  <p>
                    No completed
                    documentation
                    records have been
                    published yet.
                    Records will appear
                    here after matching
                    batch information,
                    laboratory
                    documentation,
                    verification links,
                    and internal review
                    are completed.
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
                    Browse Products
                  </button>
                </div>
              )}

            {!loading &&
              !error &&
              publishedRecords.length >
                0 &&
              filteredRecords.length ===
                0 && (
                <div className="quality-state-panel">
                  <p className="eyebrow">
                    NO MATCHING RECORDS
                  </p>

                  <h3>
                    No Documentation
                    Found
                  </h3>

                  <p>
                    Change the search
                    term or select
                    another category.
                  </p>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={
                      resetFilters
                    }
                  >
                    Reset Filters
                  </button>
                </div>
              )}

            {!loading &&
              !error &&
              filteredRecords.length >
                0 && (
                <div className="quality-record-grid">
                  {filteredRecords.map(
                    (record) => (
                      <DocumentationCard
                        key={
                          record.codeName
                        }
                        record={
                          record
                        }
                      />
                    )
                  )}
                </div>
              )}
          </section>

          <div className="quality-transparency-panel">
            <div>
              <p className="eyebrow">
                DOCUMENTATION
                TRANSPARENCY
              </p>

              <h2 className="quality-section-title">
                Published Records Are
                Batch Specific
              </h2>

              <p className="quality-text">
                A published record
                applies only to the
                product code, strength,
                and batch number shown
                in that record. A
                certificate for one
                batch should not be
                assumed to represent a
                different batch or
                product strength.
              </p>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={() =>
                onNavigate(
                  "products"
                )
              }
            >
              View Product Catalog
            </button>
          </div>

          <div className="quality-notice">
            <strong>
              For Research Use Only.
            </strong>

            <span>
              {" "}
              Products are not intended
              for human consumption,
              medical use, diagnostic
              use, therapeutic use, or
              personal-use
              instruction.
            </span>
          </div>
        </section>
      </main>
    </>
  );
}

function QualityStat({
  label,
  value,
  detail,
  compact = false,
}) {
  return (
    <div className="quality-stat">
      <span>{label}</span>

      <strong
        className={
          compact
            ? "quality-stat-compact"
            : ""
        }
      >
        {value}
      </strong>

      <small>{detail}</small>
    </div>
  );
}

function DocumentationCard({
  record,
}) {
  return (
    <article className="quality-record-card">
      <div className="quality-record-header">
        <div className="quality-record-image">
          {record.image ? (
            <img
              src={record.image}
              alt={`${record.productName} ${record.strength}`}
            />
          ) : (
            <div className="quality-record-placeholder">
              <img
                src={brandBadgeLogo}
                alt=""
                aria-hidden="true"
                style={{
                  width: "52px",
                  height: "52px",
                  display: "block",
                  objectFit: "contain",
                  borderRadius: "12px",
                }}
              />

              <span>
                {record.codeName}
              </span>

              <small>
                {record.strength}
              </small>
            </div>
          )}
        </div>

        <div className="quality-record-identity">
          <div className="quality-record-badges">
            <span className="quality-category-badge">
              {record.category}
            </span>

            <span className="quality-published-badge">
              Published Record
            </span>
          </div>

          <h3>
            {record.productName}
          </h3>

          <p>
            {record.codeName} ·{" "}
            {record.strength}
          </p>
        </div>
      </div>

      {record.description && (
        <p className="quality-record-description">
          {record.description}
        </p>
      )}

      {record.composition && (
        <div className="quality-composition">
          <span>
            Composition
          </span>

          <strong>
            {record.composition}
          </strong>
        </div>
      )}

      <div className="quality-record-details">
        <RecordDetail
          label="Batch Number"
          value={
            record.batchNumber
          }
        />

        <RecordDetail
          label="Testing Laboratory"
          value={
            record.labName
          }
        />

        <RecordDetail
          label="Test Date"
          value={formatDate(
            record.testDate
          )}
        />

        <RecordDetail
          label="Record Updated"
          value={formatUpdatedAt(
            record.updatedAt
          )}
        />
      </div>

      <div className="quality-record-actions">
        <a
          className="primary-btn quality-link-button"
          href={record.coaUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open Certificate
        </a>

        <a
          className="secondary-btn quality-link-button"
          href={
            record.verificationUrl
          }
          target="_blank"
          rel="noreferrer"
        >
          Open Verification
        </a>

        <a
          className="secondary-btn quality-link-button"
          href={`/api/documents/${encodeURIComponent(
            record.codeName
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          View Record Data
        </a>
      </div>

      <div className="quality-record-footnote">
        This documentation applies to
        the product code, strength, and
        batch number shown above.
      </div>
    </article>
  );
}

function RecordDetail({
  label,
  value,
}) {
  return (
    <div>
      <span>{label}</span>

      <strong>
        {value ||
          "Not available"}
      </strong>
    </div>
  );
}

const qualityCss = `
  .quality-page,
  .quality-page *,
  .quality-page *::before,
  .quality-page *::after {
    box-sizing: border-box;
  }

  .quality-page {
    width: 100%;
    max-width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .quality-inner {
    width: 100%;
    max-width: 1150px;
    margin: 0 auto;
  }

  .quality-hero {
    margin-bottom: 30px;
    padding: 56px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 30px;
    background:
      radial-gradient(
        circle at top,
        rgba(61,165,255,0.2),
        transparent 42%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 80px rgba(0,0,0,0.45);
    text-align: center;
  }

  .quality-title {
    margin-bottom: 20px;
    font-size: clamp(42px, 7vw, 62px);
    line-height: 1.05;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #9d9d9d
      );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .quality-subtitle {
    max-width: 780px;
    margin: 0 auto;
    color: #c8c8c8;
    font-size: 19px;
    line-height: 1.8;
  }

  .quality-button-row {
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 30px;
  }

  .quality-statement {
    margin-bottom: 30px;
    padding: 42px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.14),
        transparent 35%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 80px rgba(0,0,0,0.45);
    text-align: center;
  }

  .quality-section-title {
    margin-bottom: 20px;
    font-size: clamp(30px, 5vw, 36px);
    line-height: 1.12;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #9d9d9d
      );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .quality-text {
    color: #c8c8c8;
    line-height: 1.8;
  }

  .quality-steps {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 30px;
  }

  .quality-step-card {
    min-width: 0;
    padding: 24px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 22px;
    background: rgba(255,255,255,0.035);
    box-shadow:
      0 24px 65px rgba(0,0,0,0.35);
  }

  .quality-step-card h3 {
    margin-bottom: 14px;
    color: #ffffff;
    font-size: 22px;
    line-height: 1.2;
  }

  .quality-step-card p {
    color: #c8c8c8;
    font-size: 15px;
    line-height: 1.7;
  }

  .quality-documentation-panel {
    margin-bottom: 30px;
    padding: 38px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.14),
        transparent 35%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 80px rgba(0,0,0,0.45);
  }

  .quality-documentation-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    flex-wrap: wrap;
  }

  .quality-documentation-heading > div {
    max-width: 780px;
  }

  .quality-stats {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-top: 28px;
  }

  .quality-stat {
    min-width: 0;
    display: grid;
    gap: 7px;
    padding: 18px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 17px;
    background: rgba(0,0,0,0.22);
    overflow-wrap: anywhere;
  }

  .quality-stat > span {
    color: #9ed8ff;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .quality-stat > strong {
    color: #ffffff;
    font-size: 30px;
  }

  .quality-stat > .quality-stat-compact {
    font-size: 18px;
    line-height: 1.35;
  }

  .quality-stat > small {
    color: #8f9ba7;
    line-height: 1.5;
  }

  .quality-filters {
    margin-top: 26px;
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    background: rgba(0,0,0,0.18);
  }

  .quality-search {
    width: 100%;
    padding: 16px;
    margin-bottom: 16px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 15px;
    outline: none;
    background: rgba(255,255,255,0.05);
    color: #ffffff;
    font: inherit;
  }

  .quality-category-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .quality-results-bar {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 16px;
    padding: 14px;
    border-radius: 14px;
    background: rgba(0,0,0,0.24);
    color: #c8c8c8;
  }

  .quality-state-panel,
  .quality-error-panel {
    display: grid;
    justify-items: center;
    gap: 16px;
    margin-top: 26px;
    padding: 42px;
    border-radius: 22px;
    text-align: center;
  }

  .quality-state-panel {
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(0,0,0,0.2);
    color: #c8c8c8;
  }

  .quality-error-panel {
    border: 1px solid rgba(255,120,120,0.28);
    background: rgba(255,70,70,0.08);
    color: #ffd1d1;
  }

  .quality-state-panel h3,
  .quality-error-panel h3 {
    color: #ffffff;
    font-size: 28px;
  }

  .quality-state-panel p,
  .quality-error-panel p {
    max-width: 700px;
    line-height: 1.7;
  }

  .quality-loader {
    width: 42px;
    height: 42px;
    border: 4px solid rgba(255,255,255,0.12);
    border-top-color: #9ed8ff;
    border-radius: 50%;
    animation:
      quality-spin 0.8s linear infinite;
  }

  @keyframes quality-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .quality-record-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 20px;
    margin-top: 26px;
  }

  .quality-record-card {
    min-width: 0;
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 23px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.1),
        transparent 34%
      ),
      rgba(0,0,0,0.2);
    overflow-wrap: anywhere;
  }

  .quality-record-header {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .quality-record-image {
    width: 100px;
    min-width: 100px;
    height: 100px;
    overflow: hidden;
    border: 1px solid rgba(61,165,255,0.2);
    border-radius: 18px;
    background:
      radial-gradient(
        circle,
        rgba(61,165,255,0.18),
        rgba(0,0,0,0.72)
      );
  }

  .quality-record-image img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .quality-record-placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 4px;
    color: #ffffff;
    font-size: 10px;
    text-align: center;
  }

  .quality-record-identity {
    min-width: 0;
  }

  .quality-record-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .quality-category-badge,
  .quality-published-badge {
    display: inline-flex;
    width: fit-content;
    padding: 6px 9px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .quality-category-badge {
    border: 1px solid rgba(255,255,255,0.11);
    background: rgba(255,255,255,0.055);
    color: #c8c8c8;
  }

  .quality-published-badge {
    border: 1px solid rgba(61,165,255,0.35);
    background: rgba(61,165,255,0.13);
    color: #9ed8ff;
  }

  .quality-record-identity h3 {
    margin: 11px 0 6px;
    color: #ffffff;
    font-size: 25px;
    line-height: 1.2;
  }

  .quality-record-identity p {
    color: #9ed8ff;
    font-weight: 900;
  }

  .quality-record-description {
    margin-top: 17px;
    color: #c8c8c8;
    font-size: 14px;
    line-height: 1.7;
  }

  .quality-composition {
    display: grid;
    gap: 5px;
    margin-top: 16px;
    padding: 13px;
    border: 1px solid rgba(61,165,255,0.18);
    border-radius: 14px;
    background: rgba(61,165,255,0.08);
    color: #c8eaff;
    font-size: 12px;
  }

  .quality-record-details {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 9px;
    margin-top: 17px;
  }

  .quality-record-details > div {
    min-width: 0;
    display: grid;
    gap: 5px;
    padding: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 13px;
    background: rgba(0,0,0,0.22);
    overflow-wrap: anywhere;
  }

  .quality-record-details span {
    color: #9ca8b3;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .quality-record-details strong {
    color: #ffffff;
    font-size: 12px;
  }

  .quality-record-actions {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 18px;
  }

  .quality-link-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    text-align: center;
    text-decoration: none;
  }

  .quality-record-actions .quality-link-button:last-child {
    grid-column: 1 / -1;
  }

  .quality-record-footnote {
    margin-top: 16px;
    padding: 13px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 13px;
    background: rgba(255,255,255,0.025);
    color: #9ca8b3;
    font-size: 11px;
    line-height: 1.6;
  }

  .quality-transparency-panel {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) auto;
    align-items: center;
    gap: 24px;
    padding: 38px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.14),
        transparent 35%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 80px rgba(0,0,0,0.45);
  }

  .quality-notice {
    margin-top: 30px;
    padding: 20px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 20px;
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
    font-weight: 900;
    line-height: 1.6;
    text-align: center;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 950px) {
    .quality-page {
      padding: 65px 24px;
    }

    .quality-steps,
    .quality-stats {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .quality-record-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }
  }

  @media (max-width: 700px) {
    .quality-page {
      padding: 44px 12px;
    }

    .quality-hero,
    .quality-statement,
    .quality-documentation-panel,
    .quality-transparency-panel {
      padding: 26px 19px;
      border-radius: 23px;
    }

    .quality-button-row,
    .quality-button-row button,
    .quality-documentation-heading > button {
      width: 100%;
    }

    .quality-transparency-panel {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .quality-transparency-panel > button {
      width: 100%;
    }

    .quality-category-row button {
      flex: 1 1 145px;
    }
  }

  @media (max-width: 500px) {
    .quality-page {
      padding: 34px 8px;
    }

    .quality-hero,
    .quality-statement,
    .quality-documentation-panel,
    .quality-transparency-panel {
      padding: 18px 14px;
    }

    .quality-steps,
    .quality-stats,
    .quality-record-details,
    .quality-record-actions {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .quality-record-actions .quality-link-button:last-child {
      grid-column: auto;
    }

    .quality-step-card,
    .quality-record-card {
      padding: 16px;
    }

    .quality-record-header {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr);
    }

    .quality-record-image {
      width: 100%;
      height: 190px;
    }

    .quality-state-panel,
    .quality-error-panel {
      padding: 28px 16px;
    }
  }
`;

export default Quality;

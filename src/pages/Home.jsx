import { useEffect, useMemo, useState } from "react";
import { products } from "../data/products";

const storageKey = "304-site-settings";

const defaultSettings = {
  catalogEnabled: true,
  storeStatus: "coming-soon",
};

const featuredCategories = [
  "Metabolic Research",
  "Recovery Research",
  "Performance Research",
  "Cognitive Research",
];

function loadSettings() {
  try {
    const savedSettings =
      window.localStorage.getItem(
        storageKey
      );

    if (!savedSettings) {
      return defaultSettings;
    }

    return {
      ...defaultSettings,
      ...JSON.parse(savedSettings),
    };
  } catch {
    return defaultSettings;
  }
}

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
      month: "short",
      day: "numeric",
    }
  );
}

function formatUpdatedAt(value) {
  if (!value) {
    return "No records yet";
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

function Home({
  onNavigate,
}) {
  const [
    settings,
    setSettings,
  ] = useState(loadSettings);

  const [
    records,
    setRecords,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0);

  const catalogMap =
    useMemo(
      () => buildCatalogMap(),
      []
    );

  useEffect(() => {
    function updateSettings(
      event
    ) {
      if (event.detail) {
        setSettings(
          (
            currentSettings
          ) => ({
            ...currentSettings,
            ...event.detail,
          })
        );

        return;
      }

      setSettings(
        loadSettings()
      );
    }

    function handleStorageChange(
      event
    ) {
      if (
        event.key ===
        storageKey
      ) {
        setSettings(
          loadSettings()
        );
      }
    }

    window.addEventListener(
      "304-site-settings-updated",
      updateSettings
    );

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "304-site-settings-updated",
        updateSettings
      );

      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadPublishedRecords() {
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

              cache:
                "no-store",

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
      } catch (
        requestError
      ) {
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

    loadPublishedRecords();

    return () => {
      controller.abort();
    };
  }, [refreshKey]);

  const publishedRecords =
    useMemo(
      () =>
        records
          .map(
            (record) => {
              const catalogItem =
                catalogMap.get(
                  record.codeName
                );

              return {
                ...record,

                category:
                  record.category ||
                  catalogItem?.category ||
                  "Research Product",

                image:
                  catalogItem?.image ||
                  null,
              };
            }
          )
          .sort(
            (
              left,
              right
            ) =>
              new Date(
                right.updatedAt ||
                  0
              ).getTime() -
              new Date(
                left.updatedAt ||
                  0
              ).getTime()
          ),
      [
        catalogMap,
        records,
      ]
    );

  const documentationStats =
    useMemo(() => {
      const batchNumbers =
        new Set(
          publishedRecords
            .map(
              (record) =>
                record.batchNumber
            )
            .filter(Boolean)
        );

      const laboratories =
        new Set(
          publishedRecords
            .map(
              (record) =>
                record.labName
            )
            .filter(Boolean)
        );

      return {
        recordCount:
          publishedRecords.length,

        batchCount:
          batchNumbers.size,

        laboratoryCount:
          laboratories.size,

        latestUpdate:
          publishedRecords[0]
            ?.updatedAt || "",
      };
    }, [publishedRecords]);

  const recentRecords =
    publishedRecords.slice(
      0,
      3
    );

  const storeStatusLabel =
    settings.storeStatus ===
    "open"
      ? "Store Open"
      : settings.storeStatus ===
        "maintenance"
      ? "Maintenance Mode"
      : "Coming Soon";

  const documentationLabel =
    loading
      ? "Checking Documentation"
      : error
      ? "Documentation Unavailable"
      : `${
          documentationStats.recordCount
        } Published Record${
          documentationStats.recordCount ===
          1
            ? ""
            : "s"
        }`;

  function refreshRecords() {
    setRefreshKey(
      (currentKey) =>
        currentKey + 1
    );
  }

  return (
    <>
      <style>
        {homeCss}
      </style>

      <main className="home-page">
        <section className="home-inner">
          <div className="home-hero">
            <p className="eyebrow">
              PRECISION •
              TRANSPARENCY •
              QUALITY
            </p>

            <h1 className="home-title">
              Built On Trust.
              <br />
              Backed By
              Documentation.
            </h1>

            <p className="home-subtitle">
              A documentation-first
              research storefront
              built around clear
              product identity,
              professional service,
              batch-level records,
              and transparent access
              to published
              documentation.
            </p>

            <div className="home-hero-pills">
              <span className="home-research-pill">
                For Research Use
                Only. Not intended
                for human
                consumption.
              </span>

              <span
                className={
                  settings.storeStatus ===
                  "open"
                    ? "home-status-pill home-status-open"
                    : "home-status-pill"
                }
              >
                {storeStatusLabel}
              </span>

              <span
                className={
                  error
                    ? "home-document-pill home-document-error-pill"
                    : "home-document-pill"
                }
              >
                {
                  documentationLabel
                }
              </span>
            </div>

            <div className="home-button-row">
              {settings.catalogEnabled && (
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
              )}

              <button
                type="button"
                className={
                  settings.catalogEnabled
                    ? "secondary-btn"
                    : "primary-btn"
                }
                onClick={() =>
                  onNavigate(
                    "quality"
                  )
                }
              >
                View Published
                Documentation
              </button>

              {!settings.catalogEnabled && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    onNavigate(
                      "contact"
                    )
                  }
                >
                  Contact Support
                </button>
              )}
            </div>
          </div>

          <div className="home-stats-grid">
            <MetricCard
              label="Published Records"
              value={
                loading
                  ? "—"
                  : documentationStats.recordCount
              }
              detail="Completed public documentation records"
            />

            <MetricCard
              label="Published Batches"
              value={
                loading
                  ? "—"
                  : documentationStats.batchCount
              }
              detail="Unique batch numbers represented"
            />

            <MetricCard
              label="Testing Laboratories"
              value={
                loading
                  ? "—"
                  : documentationStats.laboratoryCount
              }
              detail="Laboratories named in public records"
            />

            <MetricCard
              label="Latest Update"
              value={
                loading
                  ? "Checking"
                  : formatUpdatedAt(
                      documentationStats.latestUpdate
                    )
              }
              detail="Most recent published record change"
              compact
            />
          </div>

          <div className="home-trust-grid">
            <TrustCard
              icon="✓"
              title="Documentation First"
              description="Published records are tied to a specific product code, strength, batch number, laboratory, and test date."
            />

            <TrustCard
              icon="⚡"
              title="Professional Service"
              description="A brand experience focused on clear communication, organized order handling, and responsive support."
            />

            <TrustCard
              icon="🔒"
              title="Transparent Access"
              description="Completed public records can provide direct certificate and verification links without exposing private administrative notes."
            />
          </div>

          <div className="home-split-panel">
            <div className="home-why-panel">
              <p className="eyebrow">
                WHY 304 PEPTIDES
              </p>

              <h2 className="home-section-title">
                A Better Brand
                Experience
              </h2>

              <p className="home-section-text">
                304 Peptides is
                being built as a
                modern, organized
                research-use brand.
                Product identity,
                published
                documentation,
                store controls, and
                customer
                communication are
                designed to work
                together as one
                consistent
                experience.
              </p>

              <div className="home-bullet-grid">
                <div>
                  Clear product and
                  strength
                  identification
                </div>

                <div>
                  Batch-specific
                  public records
                </div>

                <div>
                  Professional
                  customer support
                </div>

                <div>
                  Research-use
                  language across
                  the storefront
                </div>
              </div>
            </div>

            <div className="home-category-panel">
              {settings.catalogEnabled ? (
                <>
                  <p className="eyebrow">
                    RESEARCH
                    CATEGORIES
                  </p>

                  <h2 className="home-showcase-title">
                    Explore The
                    Catalog
                  </h2>

                  <p className="home-section-text">
                    Browse the
                    organized catalog
                    and select product
                    strengths to see
                    live published
                    documentation
                    status.
                  </p>

                  <div className="home-category-list">
                    {featuredCategories.map(
                      (
                        category
                      ) => (
                        <button
                          key={
                            category
                          }
                          type="button"
                          onClick={() =>
                            onNavigate(
                              "products"
                            )
                          }
                        >
                          <span>
                            {category}
                          </span>

                          <span
                            aria-hidden="true"
                          >
                            →
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="eyebrow">
                    CATALOG STATUS
                  </p>

                  <h2 className="home-showcase-title">
                    Catalog
                    Temporarily
                    Unavailable
                  </h2>

                  <p className="home-section-text">
                    Product browsing
                    is currently
                    disabled.
                    Published quality
                    records,
                    research-use
                    terms, frequently
                    asked questions,
                    and customer
                    support remain
                    available.
                  </p>

                  <div className="home-disabled-notice">
                    Catalog access
                    has been disabled
                    in Site Settings.
                  </div>

                  <div className="home-side-buttons">
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() =>
                        onNavigate(
                          "quality"
                        )
                      }
                    >
                      View Quality
                      Page
                    </button>

                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() =>
                        onNavigate(
                          "faq"
                        )
                      }
                    >
                      View FAQ
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <section className="home-documents-panel">
            <div className="home-documents-heading">
              <div>
                <p className="eyebrow">
                  LIVE
                  DOCUMENTATION
                </p>

                <h2 className="home-section-title">
                  Recently
                  Published Records
                </h2>

                <p className="home-section-text">
                  The records below
                  are loaded directly
                  from the public
                  Cloudflare
                  documentation API.
                  Only completed,
                  reviewed, and
                  published records
                  appear here.
                </p>
              </div>

              <div className="home-document-heading-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={loading}
                  onClick={
                    refreshRecords
                  }
                >
                  {loading
                    ? "Refreshing..."
                    : "Refresh Records"}
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() =>
                    onNavigate(
                      "quality"
                    )
                  }
                >
                  View All Records
                </button>
              </div>
            </div>

            {loading && (
              <div className="home-state-panel">
                <div className="home-loader" />

                <h3>
                  Loading Published
                  Records
                </h3>

                <p>
                  Connecting to the
                  public
                  documentation
                  service.
                </p>
              </div>
            )}

            {!loading &&
              error && (
                <div className="home-error-panel">
                  <p className="eyebrow">
                    DOCUMENTATION
                    UNAVAILABLE
                  </p>

                  <h3>
                    Records Could Not
                    Be Loaded
                  </h3>

                  <p>
                    {error}
                  </p>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={
                      refreshRecords
                    }
                  >
                    Try Again
                  </button>
                </div>
              )}

            {!loading &&
              !error &&
              recentRecords.length ===
                0 && (
                <div className="home-state-panel">
                  <p className="eyebrow">
                    DOCUMENTATION
                    LIBRARY
                  </p>

                  <h3>
                    Published Records
                    Coming Soon
                  </h3>

                  <p>
                    Completed records
                    will appear here
                    after matching
                    batch details,
                    laboratory
                    documentation,
                    verification
                    links, and
                    internal review
                    are complete.
                  </p>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      onNavigate(
                        "quality"
                      )
                    }
                  >
                    View Quality
                    Standards
                  </button>
                </div>
              )}

            {!loading &&
              !error &&
              recentRecords.length >
                0 && (
                <div className="home-document-grid">
                  {recentRecords.map(
                    (record) => (
                      <DocumentCard
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

          {settings.catalogEnabled ? (
            <div className="home-cta-panel">
              <p className="eyebrow">
                READY TO EXPLORE?
              </p>

              <h2 className="home-cta-title">
                Explore The 304
                Catalog
              </h2>

              <p className="home-cta-text">
                Browse the current
                research catalog,
                choose product
                strengths, review
                pricing access, and
                see live
                documentation
                status for each
                product code.
              </p>

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
            </div>
          ) : (
            <div className="home-cta-panel">
              <p className="eyebrow">
                QUALITY BEFORE
                LAUNCH
              </p>

              <h2 className="home-cta-title">
                Trust Is
                Earned—Not
                Claimed.
              </h2>

              <p className="home-cta-text">
                While the catalog
                is unavailable,
                review the
                published
                documentation,
                quality standards,
                and research-use
                policies
                supporting 304
                Peptides.
              </p>

              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  onNavigate(
                    "quality"
                  )
                }
              >
                Review Quality
                Standards
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function MetricCard({
  label,
  value,
  detail,
  compact = false,
}) {
  return (
    <div className="home-metric-card">
      <span>
        {label}
      </span>

      <strong
        className={
          compact
            ? "home-metric-compact"
            : ""
        }
      >
        {value}
      </strong>

      <small>
        {detail}
      </small>
    </div>
  );
}

function TrustCard({
  icon,
  title,
  description,
}) {
  return (
    <article className="home-trust-card">
      <div className="home-trust-icon">
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>
    </article>
  );
}

function DocumentCard({
  record,
}) {
  return (
    <article className="home-document-card">
      <div className="home-document-card-header">
        <div className="home-document-image">
          {record.image ? (
            <img
              src={
                record.image
              }
              alt={`${record.productName} ${record.strength}`}
            />
          ) : (
            <div className="home-document-placeholder">
              <strong>
                304
              </strong>

              <span>
                {
                  record.codeName
                }
              </span>

              <small>
                {
                  record.strength
                }
              </small>
            </div>
          )}
        </div>

        <div className="home-document-identity">
          <div className="home-document-badges">
            <span>
              {
                record.category
              }
            </span>

            <span>
              Published
            </span>
          </div>

          <h3>
            {
              record.productName
            }
          </h3>

          <p>
            {
              record.codeName
            }{" "}
            ·{" "}
            {
              record.strength
            }
          </p>
        </div>
      </div>

      <div className="home-document-details">
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
          label="Updated"
          value={formatUpdatedAt(
            record.updatedAt
          )}
        />
      </div>

      <div className="home-document-links">
        <a
          className="primary-btn home-document-link"
          href={
            record.coaUrl
          }
          target="_blank"
          rel="noreferrer"
        >
          Open COA
        </a>

        <a
          className="secondary-btn home-document-link"
          href={
            record.verificationUrl
          }
          target="_blank"
          rel="noreferrer"
        >
          Verify Record
        </a>
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
      <span>
        {label}
      </span>

      <strong>
        {value ||
          "Not available"}
      </strong>
    </div>
  );
}

const homeCss = `
  .home-page,
  .home-page *,
  .home-page *::before,
  .home-page *::after {
    box-sizing: border-box;
  }

  .home-page {
    width: 100%;
    max-width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .home-inner {
    width: 100%;
    max-width: 1300px;
    margin: 0 auto;
  }

  .home-hero {
    margin-bottom: 28px;
    padding: 78px 54px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 36px;
    background:
      radial-gradient(
        circle at top,
        rgba(61,165,255,0.25),
        transparent 42%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 35px 90px rgba(0,0,0,0.5);
    text-align: center;
  }

  .home-title {
    margin-bottom: 24px;
    font-size:
      clamp(
        46px,
        7vw,
        74px
      );
    line-height: 1.02;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #909090
      );
    -webkit-background-clip:
      text;
    -webkit-text-fill-color:
      transparent;
  }

  .home-subtitle {
    max-width: 860px;
    margin: 0 auto;
    color: #c8c8c8;
    font-size: 20px;
    line-height: 1.85;
  }

  .home-hero-pills {
    display: flex;
    justify-content:
      center;
    align-items:
      center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 28px;
  }

  .home-research-pill,
  .home-status-pill,
  .home-document-pill {
    display:
      inline-flex;
    padding: 12px 18px;
    border-radius:
      999px;
    font-size: 11px;
    font-weight: 900;
    line-height: 1.45;
    text-transform:
      uppercase;
    letter-spacing:
      0.8px;
  }

  .home-research-pill,
  .home-document-pill {
    border:
      1px solid
      rgba(
        61,
        165,
        255,
        0.28
      );
    background:
      rgba(
        61,
        165,
        255,
        0.12
      );
    color: #9ed8ff;
  }

  .home-status-pill {
    border:
      1px solid
      rgba(
        255,
        255,
        255,
        0.12
      );
    background:
      rgba(
        255,
        255,
        255,
        0.055
      );
    color: #c8c8c8;
  }

  .home-status-open {
    border-color:
      rgba(
        61,
        165,
        255,
        0.38
      );
    background:
      rgba(
        61,
        165,
        255,
        0.14
      );
    color: #9ed8ff;
  }

  .home-document-error-pill {
    border-color:
      rgba(
        255,
        120,
        120,
        0.28
      );
    background:
      rgba(
        255,
        70,
        70,
        0.08
      );
    color: #ffd1d1;
  }

  .home-button-row,
  .home-document-heading-actions {
    display: flex;
    justify-content:
      center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 28px;
  }

  .home-stats-grid {
    display: grid;
    grid-template-columns:
      repeat(
        4,
        minmax(
          0,
          1fr
        )
      );
    gap: 16px;
    margin-bottom:
      28px;
  }

  .home-metric-card {
    min-width: 0;
    display: grid;
    gap: 8px;
    padding: 22px;
    border:
      1px solid
      rgba(
        255,
        255,
        255,
        0.09
      );
    border-radius:
      22px;
    background:
      rgba(
        255,
        255,
        255,
        0.035
      );
    box-shadow:
      0 24px 65px
      rgba(
        0,
        0,
        0,
        0.32
      );
    overflow-wrap:
      anywhere;
  }

  .home-metric-card > span {
    color: #9ed8ff;
    font-size: 11px;
    font-weight: 900;
    text-transform:
      uppercase;
    letter-spacing:
      0.6px;
  }

  .home-metric-card > strong {
    color: #ffffff;
    font-size: 36px;
  }

  .home-metric-card
    > .home-metric-compact {
    font-size: 19px;
    line-height: 1.35;
  }

  .home-metric-card > small {
    color: #8f9ba7;
    line-height: 1.5;
  }

  .home-trust-grid {
    display: grid;
    grid-template-columns:
      repeat(
        3,
        minmax(
          0,
          1fr
        )
      );
    gap: 20px;
    margin-bottom:
      28px;
  }

  .home-trust-card {
    min-width: 0;
    padding: 28px;
    border:
      1px solid
      rgba(
        255,
        255,
        255,
        0.09
      );
    border-radius:
      28px;
    background:
      radial-gradient(
        circle at
          top left,
        rgba(
          61,
          165,
          255,
          0.12
        ),
        transparent 35%
      ),
      rgba(
        255,
        255,
        255,
        0.035
      );
    box-shadow:
      0 28px 70px
      rgba(
        0,
        0,
        0,
        0.38
      );
  }

  .home-trust-icon {
    width: 54px;
    height: 54px;
    display: flex;
    align-items:
      center;
    justify-content:
      center;
    margin-bottom:
      18px;
    border:
      1px solid
      rgba(
        61,
        165,
        255,
        0.28
      );
    border-radius:
      16px;
    background:
      rgba(
        61,
        165,
        255,
        0.14
      );
    color: #9ed8ff;
    font-size: 24px;
    font-weight: 900;
  }

  .home-trust-card h3 {
    margin-bottom:
      12px;
    color: #ffffff;
    font-size: 24px;
  }

  .home-trust-card p {
    color: #c8c8c8;
    line-height: 1.8;
  }

  .home-split-panel {
    display: grid;
    grid-template-columns:
      minmax(
        0,
        1.2fr
      )
      minmax(
        300px,
        0.8fr
      );
    gap: 28px;
    margin-bottom:
      28px;
  }

  .home-why-panel,
  .home-category-panel,
  .home-documents-panel {
    min-width: 0;
    padding: 36px;
    border:
      1px solid
      rgba(
        255,
        255,
        255,
        0.09
      );
    border-radius:
      30px;
    background:
      radial-gradient(
        circle at
          top left,
        rgba(
          61,
          165,
          255,
          0.12
        ),
        transparent 35%
      ),
      rgba(
        255,
        255,
        255,
        0.035
      );
    box-shadow:
      0 30px 80px
      rgba(
        0,
        0,
        0,
        0.4
      );
  }

  .home-category-panel {
    background:
      radial-gradient(
        circle at
          top left,
        rgba(
          61,
          165,
          255,
          0.14
        ),
        transparent 35%
      ),
      rgba(
        255,
        255,
        255,
        0.035
      );
  }

  .home-section-title {
    margin-bottom:
      18px;
    font-size:
      clamp(
        32px,
        5vw,
        42px
      );
    line-height: 1.1;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #9d9d9d
      );
    -webkit-background-clip:
      text;
    -webkit-text-fill-color:
      transparent;
  }

  .home-showcase-title {
    margin:
      12px 0 18px;
    font-size:
      clamp(
        29px,
        4vw,
        34px
      );
    line-height: 1.12;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #9d9d9d
      );
    -webkit-background-clip:
      text;
    -webkit-text-fill-color:
      transparent;
  }

  .home-section-text {
    margin-bottom:
      24px;
    color: #c8c8c8;
    line-height: 1.85;
  }

  .home-bullet-grid {
    display: grid;
    grid-template-columns:
      repeat(
        2,
        minmax(
          0,
          1fr
        )
      );
    gap: 14px;
  }

  .home-bullet-grid
    > div {
    min-width: 0;
    padding: 16px;
    border:
      1px solid
      rgba(
        255,
        255,
        255,
        0.09
      );
    border-radius:
      18px;
    background:
      rgba(
        255,
        255,
        255,
        0.045
      );
    color: #ffffff;
    font-weight: 800;
    line-height: 1.55;
  }

  .home-category-list {
    display: grid;
    gap: 14px;
    margin-top: 18px;
  }

  .home-category-list
    button {
    width: 100%;
    display: flex;
    justify-content:
      space-between;
    align-items:
      center;
    gap: 16px;
    padding: 18px;
    border:
      1px solid
      rgba(
        61,
        165,
        255,
        0.22
      );
    border-radius:
      18px;
    background:
      rgba(
        61,
        165,
        255,
        0.1
      );
    color: #c8eaff;
    font: inherit;
    font-weight: 900;
    text-align: left;
    cursor: pointer;
  }

  .home-category-list
    button:hover {
    border-color:
      rgba(
        61,
        165,
        255,
        0.42
      );
    background:
      rgba(
        61,
        165,
        255,
        0.16
      );
  }

  .home-disabled-notice {
    padding: 16px;
    border:
      1px solid
      rgba(
        255,
        255,
        255,
        0.09
      );
    border-radius:
      16px;
    background:
      rgba(
        0,
        0,
        0,
        0.24
      );
    color: #aeb7bf;
    line-height: 1.65;
  }

  .home-side-buttons {
    display: grid;
    gap: 12px;
    margin-top: 20px;
  }

  .home-documents-panel {
    margin-bottom:
      28px;
  }

  .home-documents-heading {
    display: flex;
    justify-content:
      space-between;
    align-items:
      flex-end;
    gap: 24px;
    flex-wrap: wrap;
  }

  .home-documents-heading
    > div:first-child {
    max-width: 780px;
  }

  .home-document-heading-actions {
    justify-content:
      flex-end;
    margin-top: 0;
  }

  .home-state-panel,
  .home-error-panel {
    display: grid;
    justify-items:
      center;
    gap: 16px;
    margin-top: 26px;
    padding: 42px;
    border-radius:
      22px;
    text-align: center;
  }

  .home-state-panel {
    border:
      1px solid
      rgba(
        255,
        255,
        255,
        0.09
      );
    background:
      rgba(
        0,
        0,
        0,
        0.2
      );
    color: #c8c8c8;
  }

  .home-error-panel {
    border:
      1px solid
      rgba(
        255,
        120,
        120,
        0.28
      );
    background:
      rgba(
        255,
        70,
        70,
        0.08
      );
    color: #ffd1d1;
  }

  .home-state-panel h3,
  .home-error-panel h3 {
    color: #ffffff;
    font-size: 28px;
  }

  .home-state-panel p,
  .home-error-panel p {
    max-width: 700px;
    line-height: 1.75;
  }

  .home-loader {
    width: 42px;
    height: 42px;
    border:
      4px solid
      rgba(
        255,
        255,
        255,
        0.12
      );
    border-top-color:
      #9ed8ff;
    border-radius: 50%;
    animation:
      home-spin
      0.8s linear
      infinite;
  }

  @keyframes home-spin {
    to {
      transform:
        rotate(360deg);
    }
  }

  .home-document-grid {
    display: grid;
    grid-template-columns:
      repeat(
        3,
        minmax(
          0,
          1fr
        )
      );
    gap: 18px;
    margin-top: 26px;
  }

  .home-document-card {
    min-width: 0;
    padding: 20px;
    border:
      1px solid
      rgba(
        255,
        255,
        255,
        0.09
      );
    border-radius:
      22px;
    background:
      radial-gradient(
        circle at
          top left,
        rgba(
          61,
          165,
          255,
          0.1
        ),
        transparent 34%
      ),
      rgba(
        0,
        0,
        0,
        0.2
      );
    overflow-wrap:
      anywhere;
  }

  .home-document-card-header {
    display: flex;
    align-items:
      center;
    gap: 14px;
  }

  .home-document-image {
    width: 88px;
    min-width: 88px;
    height: 88px;
    overflow: hidden;
    border:
      1px solid
      rgba(
        61,
        165,
        255,
        0.2
      );
    border-radius:
      16px;
    background:
      radial-gradient(
        circle,
        rgba(
          61,
          165,
          255,
          0.18
        ),
        rgba(
          0,
          0,
          0,
          0.72
        )
      );
  }

  .home-document-image img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .home-document-placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    align-content:
      center;
    justify-items:
      center;
    gap: 4px;
    color: #ffffff;
    font-size: 9px;
    text-align: center;
  }

  .home-document-identity {
    min-width: 0;
  }

  .home-document-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .home-document-badges
    span {
    display:
      inline-flex;
    padding: 5px 8px;
    border:
      1px solid
      rgba(
        61,
        165,
        255,
        0.24
      );
    border-radius:
      999px;
    background:
      rgba(
        61,
        165,
        255,
        0.09
      );
    color: #9ed8ff;
    font-size: 8px;
    font-weight: 900;
    text-transform:
      uppercase;
  }

  .home-document-identity
    h3 {
    margin:
      9px 0 5px;
    color: #ffffff;
    font-size: 20px;
    line-height: 1.2;
  }

  .home-document-identity
    p {
    color: #9ed8ff;
    font-size: 12px;
    font-weight: 900;
  }

  .home-document-details {
    display: grid;
    grid-template-columns:
      repeat(
        2,
        minmax(
          0,
          1fr
        )
      );
    gap: 8px;
    margin-top: 16px;
  }

  .home-document-details
    > div {
    min-width: 0;
    display: grid;
    gap: 4px;
    padding: 11px;
    border:
      1px solid
      rgba(
        255,
        255,
        255,
        0.08
      );
    border-radius:
      12px;
    background:
      rgba(
        0,
        0,
        0,
        0.22
      );
  }

  .home-document-details
    span {
    color: #9ca8b3;
    font-size: 9px;
    font-weight: 900;
    text-transform:
      uppercase;
  }

  .home-document-details
    strong {
    color: #ffffff;
    font-size: 11px;
    overflow-wrap:
      anywhere;
  }

  .home-document-links {
    display: grid;
    grid-template-columns:
      repeat(
        2,
        minmax(
          0,
          1fr
        )
      );
    gap: 9px;
    margin-top: 16px;
  }

  .home-document-link {
    display:
      inline-flex;
    align-items:
      center;
    justify-content:
      center;
    min-width: 0;
    text-align: center;
    text-decoration:
      none;
  }

  .home-cta-panel {
    padding: 42px;
    border:
      1px solid
      rgba(
        61,
        165,
        255,
        0.28
      );
    border-radius:
      30px;
    background:
      rgba(
        61,
        165,
        255,
        0.12
      );
    box-shadow:
      0 30px 80px
      rgba(
        0,
        0,
        0,
        0.35
      );
    text-align: center;
  }

  .home-cta-title {
    margin-bottom:
      18px;
    color: #ffffff;
    font-size:
      clamp(
        32px,
        5vw,
        42px
      );
    line-height: 1.1;
  }

  .home-cta-text {
    max-width: 760px;
    margin:
      0 auto 24px;
    color: #c8eaff;
    font-weight: 700;
    line-height: 1.8;
  }

  button:disabled {
    opacity: 0.6;
    cursor:
      not-allowed;
  }

  @media (
    max-width:
      1050px
  ) {
    .home-page {
      padding:
        65px 24px;
    }

    .home-stats-grid,
    .home-document-grid {
      grid-template-columns:
        repeat(
          2,
          minmax(
            0,
            1fr
          )
        );
    }

    .home-split-panel {
      grid-template-columns:
        minmax(
          0,
          1fr
        );
    }
  }

  @media (
    max-width:
      800px
  ) {
    .home-trust-grid {
      grid-template-columns:
        minmax(
          0,
          1fr
        );
    }

    .home-documents-heading {
      align-items:
        flex-start;
    }

    .home-document-heading-actions {
      width: 100%;
      justify-content:
        flex-start;
    }
  }

  @media (
    max-width:
      650px
  ) {
    .home-page {
      padding:
        44px 12px;
    }

    .home-hero {
      padding:
        42px 20px;
      border-radius:
        26px;
    }

    .home-hero-pills,
    .home-hero-pills
      span,
    .home-button-row,
    .home-button-row
      button,
    .home-document-heading-actions,
    .home-document-heading-actions
      button {
      width: 100%;
    }

    .home-hero-pills
      span {
      justify-content:
        center;
    }

    .home-stats-grid,
    .home-bullet-grid,
    .home-document-grid,
    .home-document-details,
    .home-document-links {
      grid-template-columns:
        minmax(
          0,
          1fr
        );
    }

    .home-why-panel,
    .home-category-panel,
    .home-documents-panel,
    .home-cta-panel {
      padding:
        22px 18px;
      border-radius:
        23px;
    }

    .home-document-link {
      width: 100%;
    }
  }

  @media (
    max-width:
      430px
  ) {
    .home-page {
      padding:
        34px 8px;
    }

    .home-hero,
    .home-why-panel,
    .home-category-panel,
    .home-documents-panel,
    .home-cta-panel,
    .home-trust-card,
    .home-metric-card {
      padding: 15px;
    }

    .home-document-card {
      padding: 14px;
    }

    .home-document-card-header {
      display: grid;
      grid-template-columns:
        minmax(
          0,
          1fr
        );
    }

    .home-document-image {
      width: 100%;
      height: 180px;
    }

    .home-state-panel,
    .home-error-panel {
      padding:
        28px 16px;
    }
  }
`;

export default Home;
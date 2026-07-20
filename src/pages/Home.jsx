import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchCatalogOverrides,
  mergeCatalogRecords,
} from "../data/catalogRuntime";

const storageKey =
  "304-site-settings";

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
      ...JSON.parse(
        savedSettings
      ),
    };
  } catch {
    return defaultSettings;
  }
}

function getDisplayVariant(
  product
) {
  if (
    product.variants?.length
  ) {
    return {
      ...product,
      ...product.variants[0],

      name:
        product.name,

      baseName:
        product.name,
    };
  }

  return product;
}

function Home({
  onNavigate,
}) {
  const [
    settings,
    setSettings,
  ] = useState(loadSettings);

  const [
    publishedCoaCount,
    setPublishedCoaCount,
  ] = useState(0);

  const [
    documentationLoading,
    setDocumentationLoading,
  ] = useState(true);

  const [
    documentationError,
    setDocumentationError,
  ] = useState(false);

  const [
    catalogProducts,
    setCatalogProducts,
  ] = useState(() =>
    mergeCatalogRecords([])
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
    const controller = new AbortController();

    async function loadCatalog() {
      try {
        const records = await fetchCatalogOverrides({
          signal: controller.signal,
        });

        setCatalogProducts(mergeCatalogRecords(records));
      } catch (error) {
        if (error.name !== "AbortError") {
          setCatalogProducts(mergeCatalogRecords([]));
        }
      }
    }

    loadCatalog();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadCoaCount() {
      setDocumentationLoading(
        true
      );

      setDocumentationError(
        false
      );

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

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            "Documentation unavailable."
          );
        }

        const records =
          Array.isArray(
            result.records
          )
            ? result.records
            : [];

        setPublishedCoaCount(
          records.length
        );
      } catch (error) {
        if (
          error.name ===
          "AbortError"
        ) {
          return;
        }

        setPublishedCoaCount(
          0
        );

        setDocumentationError(
          true
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setDocumentationLoading(
            false
          );
        }
      }
    }

    loadCoaCount();

    return () => {
      controller.abort();
    };
  }, []);

  const bestSellers =
    useMemo(
      () =>
        catalogProducts
          .filter(
            (product) =>
              product.isBestSeller
          )
          .slice(0, 4)
          .map(
            getDisplayVariant
          ),
      [catalogProducts]
    );

  const storeStatusLabel =
    settings.storeStatus ===
    "open"
      ? "Store Open"
      : settings.storeStatus ===
        "maintenance"
      ? "Maintenance Mode"
      : "Coming Soon";

  const coaStatusLabel =
    documentationLoading
      ? "Checking COAs"
      : documentationError
      ? "View Quality"
      : publishedCoaCount > 0
      ? `${publishedCoaCount} COA${
          publishedCoaCount === 1
            ? ""
            : "s"
        } Available`
      : "COAs Coming Soon";

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
              TRANSPARENCY • QUALITY
            </p>

            <h1 className="home-title">
              Built On Trust.
              <br />
              Backed By Quality.
            </h1>

            <p className="home-subtitle">
              A modern research
              storefront built around
              clean organization,
              professional service,
              transparent product
              presentation, and
              consistent quality
              standards.
            </p>

            <div className="home-hero-pills">
              <span className="home-research-pill">
                For Research Use Only.
                Not intended for human
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
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "quality"
                  )
                }
              >
                {coaStatusLabel}
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

          <div className="home-trust-grid">
            <TrustCard
              icon="✓"
              title="Quality Focused"
              description="Products are organized with clear names, strengths, product codes, research categories, and documentation status."
            />

            <TrustCard
              icon="⚡"
              title="Professional Service"
              description="A brand experience focused on clear communication, responsive support, and organized order handling."
            />

            <TrustCard
              icon="🔒"
              title="Transparent Experience"
              description="Published batch documentation and COAs remain available through the dedicated Quality section."
            />
          </div>

          {settings.catalogEnabled &&
            bestSellers.length >
              0 && (
              <section className="home-best-sellers">
                <div className="home-section-heading">
                  <div>
                    <p className="eyebrow">
                      FEATURED PRODUCTS
                    </p>

                    <h2 className="home-section-title">
                      Best Sellers
                    </h2>

                    <p className="home-section-text">
                      Explore highlighted
                      products from
                      across the current
                      304 Peptides
                      research catalog.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      onNavigate(
                        "products"
                      )
                    }
                  >
                    View Full Catalog
                  </button>
                </div>

                <div className="home-best-seller-grid">
                  {bestSellers.map(
                    (product) => (
                      <BestSellerCard
                        key={
                          product.codeName
                        }
                        product={
                          product
                        }
                        onNavigate={
                          onNavigate
                        }
                      />
                    )
                  )}
                </div>
              </section>
            )}

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
                The goal of 304
                Peptides is to create a
                modern, organized, and
                trustworthy
                research-use brand.
                Every part of the
                experience is built
                around consistency,
                transparency,
                professional
                presentation, and
                customer service.
              </p>

              <div className="home-bullet-grid">
                <div>
                  Clean product
                  presentation
                </div>

                <div>
                  Transparent product
                  organization
                </div>

                <div>
                  Professional customer
                  support
                </div>

                <div>
                  Dedicated quality and
                  COA access
                </div>
              </div>
            </div>

            <div className="home-category-panel">
              {settings.catalogEnabled ? (
                <>
                  <p className="eyebrow">
                    RESEARCH CATEGORIES
                  </p>

                  <h2 className="home-showcase-title">
                    Explore The Catalog
                  </h2>

                  <p className="home-section-text">
                    Browse organized
                    product categories,
                    select available
                    strengths, and view
                    product details.
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
                    Catalog Temporarily
                    Unavailable
                  </h2>

                  <p className="home-section-text">
                    Product browsing is
                    currently disabled.
                    Quality information,
                    research-use terms,
                    frequently asked
                    questions, and
                    customer support
                    remain available.
                  </p>

                  <div className="home-disabled-notice">
                    Catalog access has
                    been disabled in
                    Site Settings.
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
                      Standard
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

          <section className="home-quality-panel">
            <div>
              <p className="eyebrow">
                QUALITY &amp;
                DOCUMENTATION
              </p>

              <h2 className="home-section-title">
                COAs Available In The
                Quality Tab
              </h2>

              <p className="home-section-text">
                Published certificates,
                batch numbers, testing
                laboratories, test
                dates, and verification
                links are kept together
                in the Quality section
                so the homepage stays
                focused on the brand and
                products.
              </p>

              <div className="home-quality-status">
                <span>
                  Published Records
                </span>

                <strong>
                  {documentationLoading
                    ? "Checking..."
                    : documentationError
                    ? "Temporarily unavailable"
                    : publishedCoaCount}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={() =>
                onNavigate(
                  "quality"
                )
              }
            >
              View Quality &amp; COAs
            </button>
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
                Browse the research
                catalog, review product
                details, select
                available strengths,
                and see which products
                have published
                documentation.
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
                QUALITY BEFORE LAUNCH
              </p>

              <h2 className="home-cta-title">
                Trust Is Earned—Not
                Claimed.
              </h2>

              <p className="home-cta-text">
                While the catalog is
                unavailable, review the
                quality standards,
                published
                documentation, and
                research-use policies
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

      <h3>{title}</h3>

      <p>{description}</p>
    </article>
  );
}

function BestSellerCard({
  product,
  onNavigate,
}) {
  const variantCount =
    product.variants?.length ||
    0;

  return (
    <article className="home-best-seller-card">
      <div className="home-best-seller-badges">
        <span className="home-category-badge">
          {product.category}
        </span>

        <span className="home-best-seller-badge">
          Best Seller
        </span>
      </div>

      <button
        type="button"
        className="home-product-image-button"
        onClick={() =>
          onNavigate(
            "products"
          )
        }
        aria-label={`Browse ${product.name}`}
      >
        {product.image ? (
          <div className="home-product-image">
            <img
              src={product.image}
              alt={`${product.name} ${product.strength} research product`}
            />

            <div className="home-product-glow" />
          </div>
        ) : (
          <div className="home-product-placeholder">
            <strong>
              304
            </strong>

            <span>
              {
                product.codeName
              }
            </span>

            <small>
              {
                product.strength
              }
            </small>

            <small>
              Research Use Only
            </small>
          </div>
        )}
      </button>

      <h3>
        {product.name}
      </h3>

      <p className="home-product-code">
        {product.codeName} ·{" "}
        {product.strength}
      </p>

      <p className="home-product-description">
        {product.description}
      </p>

      <div className="home-product-meta">
        <div>
          <span>
            Strengths
          </span>

          <strong>
            {variantCount > 1
              ? `${variantCount} Options`
              : product.strength}
          </strong>
        </div>

        <div>
          <span>
            Purity
          </span>

          <strong>
            {product.purity ||
              "See Details"}
          </strong>
        </div>
      </div>

      <button
        type="button"
        className="primary-btn home-product-button"
        onClick={() =>
          onNavigate(
            "products"
          )
        }
      >
        View In Catalog
      </button>

      <div className="home-product-notice">
        For Research Use Only
      </div>
    </article>
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
    font-size: clamp(46px, 7vw, 74px);
    line-height: 1.02;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #909090
      );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
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
    justify-content: center;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 28px;
  }

  .home-research-pill,
  .home-status-pill {
    display: inline-flex;
    padding: 12px 18px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 900;
    line-height: 1.45;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .home-research-pill {
    border: 1px solid rgba(61,165,255,0.28);
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
  }

  .home-status-pill {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.055);
    color: #c8c8c8;
  }

  .home-status-open {
    border-color: rgba(61,165,255,0.38);
    background: rgba(61,165,255,0.14);
    color: #9ed8ff;
  }

  .home-button-row {
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 28px;
  }

  .home-trust-grid {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 20px;
    margin-bottom: 28px;
  }

  .home-trust-card {
    min-width: 0;
    padding: 28px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.12),
        transparent 35%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 28px 70px rgba(0,0,0,0.38);
  }

  .home-trust-icon {
    width: 54px;
    height: 54px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 18px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 16px;
    background: rgba(61,165,255,0.14);
    color: #9ed8ff;
    font-size: 24px;
    font-weight: 900;
  }

  .home-trust-card h3 {
    margin-bottom: 12px;
    color: #ffffff;
    font-size: 24px;
  }

  .home-trust-card p {
    color: #c8c8c8;
    line-height: 1.8;
  }

  .home-best-sellers {
    margin-bottom: 28px;
    padding: 36px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 30px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.14),
        transparent 35%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 80px rgba(0,0,0,0.4);
  }

  .home-section-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    flex-wrap: wrap;
    margin-bottom: 26px;
  }

  .home-section-heading > div {
    max-width: 780px;
  }

  .home-section-title {
    margin-bottom: 18px;
    font-size: clamp(32px, 5vw, 42px);
    line-height: 1.1;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #9d9d9d
      );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .home-section-text {
    margin-bottom: 24px;
    color: #c8c8c8;
    line-height: 1.85;
  }

  .home-section-heading .home-section-text {
    margin-bottom: 0;
  }

  .home-best-seller-grid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 18px;
  }

  .home-best-seller-card {
    min-width: 0;
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 23px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.11),
        transparent 34%
      ),
      rgba(0,0,0,0.2);
    overflow: hidden;
  }

  .home-best-seller-badges {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }

  .home-category-badge,
  .home-best-seller-badge {
    display: inline-flex;
    width: fit-content;
    padding: 6px 9px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .home-category-badge {
    border: 1px solid rgba(61,165,255,0.28);
    background: rgba(61,165,255,0.11);
    color: #9ed8ff;
  }

  .home-best-seller-badge {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.07);
    color: #ffffff;
  }

  .home-product-image-button {
    display: block;
    width: 100%;
    padding: 0;
    margin: 0 0 18px;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .home-product-image,
  .home-product-placeholder {
    width: 100%;
    height: 230px;
    overflow: hidden;
    border: 1px solid rgba(61,165,255,0.17);
    border-radius: 18px;
    background:
      radial-gradient(
        circle,
        rgba(61,165,255,0.18),
        rgba(0,0,0,0.75)
      );
  }

  .home-product-image {
    position: relative;
  }

  .home-product-image img {
    position: relative;
    z-index: 1;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .home-product-glow {
    position: absolute;
    left: 20%;
    right: 20%;
    bottom: 8px;
    height: 25px;
    border-radius: 50%;
    background: rgba(61,165,255,0.24);
    filter: blur(16px);
  }

  .home-product-placeholder {
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 8px;
    color: #ffffff;
    text-align: center;
  }

  .home-product-placeholder strong {
    font-size: 42px;
  }

  .home-product-placeholder span {
    color: #9ed8ff;
    font-weight: 900;
  }

  .home-product-placeholder small {
    font-weight: 800;
  }

  .home-best-seller-card h3 {
    margin-bottom: 7px;
    color: #ffffff;
    font-size: 23px;
    line-height: 1.2;
  }

  .home-product-code {
    margin-bottom: 13px;
    color: #9ed8ff;
    font-size: 12px;
    font-weight: 900;
  }

  .home-product-description {
    min-height: 78px;
    color: #c8c8c8;
    font-size: 13px;
    line-height: 1.7;
  }

  .home-product-meta {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 15px;
  }

  .home-product-meta > div {
    min-width: 0;
    display: grid;
    gap: 4px;
    padding: 10px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    background: rgba(0,0,0,0.22);
  }

  .home-product-meta span {
    color: #9ca8b3;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .home-product-meta strong {
    color: #ffffff;
    font-size: 11px;
    overflow-wrap: anywhere;
  }

  .home-product-button {
    width: 100%;
    margin-top: 15px;
  }

  .home-product-notice {
    margin-top: 13px;
    color: #9ed8ff;
    font-size: 9px;
    font-weight: 900;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .home-split-panel {
    display: grid;
    grid-template-columns:
      minmax(0, 1.2fr)
      minmax(300px, 0.8fr);
    gap: 28px;
    margin-bottom: 28px;
  }

  .home-why-panel,
  .home-category-panel {
    min-width: 0;
    padding: 36px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 30px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.12),
        transparent 35%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 80px rgba(0,0,0,0.4);
  }

  .home-showcase-title {
    margin: 12px 0 18px;
    font-size: clamp(29px, 4vw, 34px);
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

  .home-bullet-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .home-bullet-grid > div {
    min-width: 0;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 18px;
    background: rgba(255,255,255,0.045);
    color: #ffffff;
    font-weight: 800;
    line-height: 1.55;
  }

  .home-category-list {
    display: grid;
    gap: 14px;
    margin-top: 18px;
  }

  .home-category-list button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 18px;
    border: 1px solid rgba(61,165,255,0.22);
    border-radius: 18px;
    background: rgba(61,165,255,0.1);
    color: #c8eaff;
    font: inherit;
    font-weight: 900;
    text-align: left;
    cursor: pointer;
  }

  .home-category-list button:hover {
    border-color: rgba(61,165,255,0.42);
    background: rgba(61,165,255,0.16);
  }

  .home-disabled-notice {
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(0,0,0,0.24);
    color: #aeb7bf;
    line-height: 1.65;
  }

  .home-side-buttons {
    display: grid;
    gap: 12px;
    margin-top: 20px;
  }

  .home-quality-panel {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) auto;
    align-items: center;
    gap: 28px;
    margin-bottom: 28px;
    padding: 36px;
    border: 1px solid rgba(61,165,255,0.24);
    border-radius: 30px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.14),
        transparent 40%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 80px rgba(0,0,0,0.38);
  }

  .home-quality-panel > div {
    max-width: 850px;
  }

  .home-quality-panel .home-section-text {
    margin-bottom: 18px;
  }

  .home-quality-status {
    display: inline-grid;
    gap: 4px;
    padding: 13px 17px;
    border: 1px solid rgba(61,165,255,0.25);
    border-radius: 15px;
    background: rgba(61,165,255,0.09);
  }

  .home-quality-status span {
    color: #9ed8ff;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .home-quality-status strong {
    color: #ffffff;
  }

  .home-cta-panel {
    padding: 42px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 30px;
    background: rgba(61,165,255,0.12);
    box-shadow:
      0 30px 80px rgba(0,0,0,0.35);
    text-align: center;
  }

  .home-cta-title {
    margin-bottom: 18px;
    color: #ffffff;
    font-size: clamp(32px, 5vw, 42px);
    line-height: 1.1;
  }

  .home-cta-text {
    max-width: 760px;
    margin: 0 auto 24px;
    color: #c8eaff;
    font-weight: 700;
    line-height: 1.8;
  }
@media (max-width: 1100px) {
    .home-page {
      padding: 65px 24px;
    }

    .home-best-seller-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .home-split-panel {
      grid-template-columns:
        minmax(0, 1fr);
    }
  }

  @media (max-width: 800px) {
    .home-trust-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .home-quality-panel {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .home-quality-panel > button {
      width: 100%;
    }
  }

  @media (max-width: 650px) {
    .home-page {
      padding: 44px 12px;
    }

    .home-hero {
      padding: 42px 20px;
      border-radius: 26px;
    }

    .home-hero-pills,
    .home-hero-pills span,
    .home-button-row,
    .home-button-row button,
    .home-section-heading > button {
      width: 100%;
    }

    .home-hero-pills span {
      justify-content: center;
    }

    .home-best-seller-grid,
    .home-bullet-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .home-best-sellers,
    .home-why-panel,
    .home-category-panel,
    .home-quality-panel,
    .home-cta-panel {
      padding: 22px 18px;
      border-radius: 23px;
    }

    .home-product-description {
      min-height: 0;
    }
  }

  @media (max-width: 430px) {
    .home-page {
      padding: 34px 8px;
    }

    .home-hero,
    .home-best-sellers,
    .home-why-panel,
    .home-category-panel,
    .home-quality-panel,
    .home-cta-panel,
    .home-trust-card {
      padding: 15px;
    }

    .home-best-seller-card {
      padding: 14px;
    }

    .home-product-image,
    .home-product-placeholder {
      height: 250px;
    }

    .home-product-meta {
      grid-template-columns:
        minmax(0, 1fr);
    }
  }
  /* 304 HERO AMINO ACID ART START */

  .home-hero {
    position: relative;
    isolation: isolate;
    overflow: hidden;
  }

  .home-hero::before {
    content: "";
    position: absolute;
    inset: -12% -5%;
    z-index: 0;
    pointer-events: none;

    background-image:
      url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%0A%20%20%20%20%20viewBox%3D%220%200%201200%20650%22%3E%0A%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3Cfilter%20id%3D%22glow%22%3E%0A%20%20%20%20%20%20%3CfeGaussianBlur%20stdDeviation%3D%228%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20result%3D%22blur%22%2F%3E%0A%20%20%20%20%20%20%3CfeMerge%3E%0A%20%20%20%20%20%20%20%20%3CfeMergeNode%20in%3D%22blur%22%2F%3E%0A%20%20%20%20%20%20%20%20%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%0A%20%20%20%20%20%20%3C%2FfeMerge%3E%0A%20%20%20%20%3C%2Ffilter%3E%0A%0A%20%20%20%20%3ClinearGradient%20id%3D%22bond%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20x1%3D%220%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20y1%3D%220%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20x2%3D%221%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20y2%3D%221%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%22%0A%20%20%20%20%20%20%20%20%20%20%20%20stop-color%3D%22%239ed8ff%22%0A%20%20%20%20%20%20%20%20%20%20%20%20stop-opacity%3D%22.35%22%2F%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%22.5%22%0A%20%20%20%20%20%20%20%20%20%20%20%20stop-color%3D%22%233da5ff%22%0A%20%20%20%20%20%20%20%20%20%20%20%20stop-opacity%3D%22.9%22%2F%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%221%22%0A%20%20%20%20%20%20%20%20%20%20%20%20stop-color%3D%22%23176ca8%22%0A%20%20%20%20%20%20%20%20%20%20%20%20stop-opacity%3D%22.3%22%2F%3E%0A%20%20%20%20%3C%2FlinearGradient%3E%0A%20%20%3C%2Fdefs%3E%0A%0A%20%20%3Cg%20filter%3D%22url(%23glow)%22%0A%20%20%20%20%20fill%3D%22none%22%0A%20%20%20%20%20stroke%3D%22url(%23bond)%22%0A%20%20%20%20%20stroke-width%3D%227%22%0A%20%20%20%20%20stroke-linecap%3D%22round%22%3E%0A%0A%20%20%20%20%3Cline%20x1%3D%22570%22%0A%20%20%20%20%20%20%20%20%20%20y1%3D%22315%22%0A%20%20%20%20%20%20%20%20%20%20x2%3D%22330%22%0A%20%20%20%20%20%20%20%20%20%20y2%3D%22315%22%2F%3E%0A%0A%20%20%20%20%3Cline%20x1%3D%22570%22%0A%20%20%20%20%20%20%20%20%20%20y1%3D%22315%22%0A%20%20%20%20%20%20%20%20%20%20x2%3D%22790%22%0A%20%20%20%20%20%20%20%20%20%20y2%3D%22315%22%2F%3E%0A%0A%20%20%20%20%3Cline%20x1%3D%22570%22%0A%20%20%20%20%20%20%20%20%20%20y1%3D%22315%22%0A%20%20%20%20%20%20%20%20%20%20x2%3D%22570%22%0A%20%20%20%20%20%20%20%20%20%20y2%3D%22130%22%2F%3E%0A%0A%20%20%20%20%3Cline%20x1%3D%22570%22%0A%20%20%20%20%20%20%20%20%20%20y1%3D%22315%22%0A%20%20%20%20%20%20%20%20%20%20x2%3D%22570%22%0A%20%20%20%20%20%20%20%20%20%20y2%3D%22505%22%2F%3E%0A%0A%20%20%20%20%3Cline%20x1%3D%22790%22%0A%20%20%20%20%20%20%20%20%20%20y1%3D%22300%22%0A%20%20%20%20%20%20%20%20%20%20x2%3D%22920%22%0A%20%20%20%20%20%20%20%20%20%20y2%3D%22215%22%2F%3E%0A%0A%20%20%20%20%3Cline%20x1%3D%22805%22%0A%20%20%20%20%20%20%20%20%20%20y1%3D%22320%22%0A%20%20%20%20%20%20%20%20%20%20x2%3D%22935%22%0A%20%20%20%20%20%20%20%20%20%20y2%3D%22235%22%2F%3E%0A%0A%20%20%20%20%3Cline%20x1%3D%22800%22%0A%20%20%20%20%20%20%20%20%20%20y1%3D%22330%22%0A%20%20%20%20%20%20%20%20%20%20x2%3D%22930%22%0A%20%20%20%20%20%20%20%20%20%20y2%3D%22415%22%2F%3E%0A%20%20%3C%2Fg%3E%0A%0A%20%20%3Cg%20fill%3D%22%233da5ff%22%0A%20%20%20%20%20fill-opacity%3D%22.38%22%0A%20%20%20%20%20stroke%3D%22%239ed8ff%22%0A%20%20%20%20%20stroke-opacity%3D%22.48%22%0A%20%20%20%20%20stroke-width%3D%223%22%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22570%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22315%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%2237%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22315%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22315%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%2224%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22790%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22315%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%2224%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22570%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22112%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%2221%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22570%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22525%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%2224%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22960%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22215%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%2222%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22960%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22430%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%2222%22%2F%3E%0A%20%20%3C%2Fg%3E%0A%0A%20%20%3Cg%20fill%3D%22%23d9f3ff%22%0A%20%20%20%20%20font-family%3D%22Arial%2C%20Helvetica%2C%20sans-serif%22%0A%20%20%20%20%20font-weight%3D%22700%22%0A%20%20%20%20%20text-anchor%3D%22middle%22%3E%0A%0A%20%20%20%20%3Ctext%20x%3D%22570%22%0A%20%20%20%20%20%20%20%20%20%20y%3D%22327%22%0A%20%20%20%20%20%20%20%20%20%20font-size%3D%2230%22%0A%20%20%20%20%20%20%20%20%20%20fill-opacity%3D%22.85%22%3E%0A%20%20%20%20%20%20C%CE%B1%0A%20%20%20%20%3C%2Ftext%3E%0A%0A%20%20%20%20%3Ctext%20x%3D%22225%22%0A%20%20%20%20%20%20%20%20%20%20y%3D%22332%22%0A%20%20%20%20%20%20%20%20%20%20font-size%3D%2255%22%0A%20%20%20%20%20%20%20%20%20%20fill-opacity%3D%22.7%22%3E%0A%20%20%20%20%20%20NH%E2%82%82%0A%20%20%20%20%3C%2Ftext%3E%0A%0A%20%20%20%20%3Ctext%20x%3D%22570%22%0A%20%20%20%20%20%20%20%20%20%20y%3D%2272%22%0A%20%20%20%20%20%20%20%20%20%20font-size%3D%2248%22%0A%20%20%20%20%20%20%20%20%20%20fill-opacity%3D%22.62%22%3E%0A%20%20%20%20%20%20H%0A%20%20%20%20%3C%2Ftext%3E%0A%0A%20%20%20%20%3Ctext%20x%3D%22570%22%0A%20%20%20%20%20%20%20%20%20%20y%3D%22605%22%0A%20%20%20%20%20%20%20%20%20%20font-size%3D%2252%22%0A%20%20%20%20%20%20%20%20%20%20fill-opacity%3D%22.7%22%3E%0A%20%20%20%20%20%20R%0A%20%20%20%20%3C%2Ftext%3E%0A%0A%20%20%20%20%3Ctext%20x%3D%221030%22%0A%20%20%20%20%20%20%20%20%20%20y%3D%22230%22%0A%20%20%20%20%20%20%20%20%20%20font-size%3D%2248%22%0A%20%20%20%20%20%20%20%20%20%20fill-opacity%3D%22.62%22%3E%0A%20%20%20%20%20%20O%0A%20%20%20%20%3C%2Ftext%3E%0A%0A%20%20%20%20%3Ctext%20x%3D%221035%22%0A%20%20%20%20%20%20%20%20%20%20y%3D%22448%22%0A%20%20%20%20%20%20%20%20%20%20font-size%3D%2245%22%0A%20%20%20%20%20%20%20%20%20%20fill-opacity%3D%22.62%22%3E%0A%20%20%20%20%20%20OH%0A%20%20%20%20%3C%2Ftext%3E%0A%20%20%3C%2Fg%3E%0A%0A%20%20%3Cg%20fill%3D%22none%22%0A%20%20%20%20%20stroke%3D%22%233da5ff%22%0A%20%20%20%20%20stroke-opacity%3D%22.18%22%0A%20%20%20%20%20stroke-width%3D%223%22%3E%0A%0A%20%20%20%20%3Cpath%20d%3D%22M90%20120%20L155%2080%20L220%20120%20L260%20190%22%2F%3E%0A%0A%20%20%20%20%3Cpath%20d%3D%22M920%2080%20L980%2048%20L1050%2088%20L1090%20150%22%2F%3E%0A%0A%20%20%20%20%3Cpath%20d%3D%22M110%20500%20L175%20455%20L245%20490%20L285%20555%22%2F%3E%0A%20%20%3C%2Fg%3E%0A%0A%20%20%3Cg%20fill%3D%22%239ed8ff%22%0A%20%20%20%20%20fill-opacity%3D%22.38%22%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%2290%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22120%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%227%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22155%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%2280%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%227%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22220%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22120%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%227%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22260%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22190%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%227%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22920%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%2280%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%227%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22980%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%2248%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%227%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%221050%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%2288%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%227%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%221090%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22150%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%227%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22110%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22500%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%227%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22175%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22455%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%227%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22245%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22490%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%227%22%2F%3E%0A%0A%20%20%20%20%3Ccircle%20cx%3D%22285%22%0A%20%20%20%20%20%20%20%20%20%20%20%20cy%3D%22555%22%0A%20%20%20%20%20%20%20%20%20%20%20%20r%3D%227%22%2F%3E%0A%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E");

    background-repeat: no-repeat;
    background-position: center;
    background-size:
      min(1120px, 96%) auto;

    opacity: 0.5;

    filter:
      drop-shadow(
        0 0 22px
        rgba(61,165,255,0.26)
      );

    transform:
      rotate(-3deg)
      scale(1.03);
  }

  .home-hero::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;

    background:
      radial-gradient(
        ellipse at center,
        rgba(4,10,16,0.58),
        rgba(4,10,16,0.22) 48%,
        rgba(4,10,16,0.4) 100%
      );
  }

  .home-hero > * {
    position: relative;
    z-index: 2;
  }

  @media (max-width: 650px) {
    .home-hero::before {
      inset: -5% -78%;
      background-size: 880px auto;
      opacity: 0.36;

      transform:
        rotate(-7deg)
        scale(1.04);
    }

    .home-hero::after {
      background:
        rgba(4,10,16,0.44);
    }
  }

  /* 304 HERO AMINO ACID ART END */

`;

export default Home;
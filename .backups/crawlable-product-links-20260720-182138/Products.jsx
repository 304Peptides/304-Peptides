import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchCatalogOverrides,
  getCatalogCategories,
  getVariantAvailability,
  mergeCatalogRecords,
} from "../data/catalogRuntime";

const storageKey =
  "304-site-settings";

const defaultSettings = {
  storeStatus: "coming-soon",
  catalogEnabled: true,
  guestPricingEnabled: false,
};

const categoryDescriptions = {
  "All Products":
    "Browse the complete 304 Peptides research-use catalog with grouped strengths, product codes, imagery, pricing, and published documentation status.",

  "Best Sellers":
    "Browse highlighted products from across the current research catalog.",

  "Metabolic Research":
    "Research-use products organized within the metabolic research category.",

  "Recovery Research":
    "Research-use products organized within the recovery research category.",

  "Performance Research":
    "Research-use products organized within the performance research category.",

  "Cognitive Research":
    "Research-use products organized within the cognitive research category.",

  "Hormone Research":
    "Research-use products organized within the hormone research category.",

  "Wellness Research":
    "Research-use products organized within the wellness research category.",

  "Longevity Research":
    "Research-use products organized within the longevity research category.",

  "Additional Research Products":
    "Additional research-use catalog products organized with clear product identity and documentation status.",

  "Research Supplies":
    "Research supplies and supporting laboratory-use products.",
};

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

function mapDocumentsByCode(
  records
) {
  return records.reduce(
    (
      documentMap,
      record
    ) => {
      if (record?.codeName) {
        documentMap[
          record.codeName
        ] = record;
      }

      return documentMap;
    },
    {}
  );
}

function formatDocumentDate(
  value
) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function Products({
  onProductSelect,
  isLoggedIn,
  onAddToCart,
}) {
  const [settings, setSettings] =
    useState(loadSettings);

  const [
    activeCategory,
    setActiveCategory,
  ] = useState(
    "All Products"
  );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    selectedStrengths,
    setSelectedStrengths,
  ] = useState({});

  const [
    catalogProducts,
    setCatalogProducts,
  ] = useState(() =>
    mergeCatalogRecords([])
  );

  const [
    catalogLoading,
    setCatalogLoading,
  ] = useState(true);

  const [
    catalogError,
    setCatalogError,
  ] = useState("");

  const [
    documentRecords,
    setDocumentRecords,
  ] = useState({});

  const [
    documentsLoading,
    setDocumentsLoading,
  ] = useState(true);

  const [
    documentsError,
    setDocumentsError,
  ] = useState("");

  useEffect(() => {
    function updateSettings(
      event
    ) {
      if (event.detail) {
        setSettings(
          (currentSettings) => ({
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
      setCatalogLoading(true);
      setCatalogError("");

      try {
        const records = await fetchCatalogOverrides({
          signal: controller.signal,
        });

        setCatalogProducts(
          mergeCatalogRecords(records)
        );
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setCatalogProducts(
          mergeCatalogRecords([])
        );
        setCatalogError(
          error.message ||
            "Live inventory could not be loaded."
        );
      } finally {
        if (!controller.signal.aborted) {
          setCatalogLoading(false);
        }
      }
    }

    loadCatalog();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadPublishedDocuments() {
      setDocumentsLoading(true);
      setDocumentsError("");

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

        const records =
          Array.isArray(
            result.records
          )
            ? result.records
            : [];

        setDocumentRecords(
          mapDocumentsByCode(
            records
          )
        );
      } catch (error) {
        if (
          error.name ===
          "AbortError"
        ) {
          return;
        }

        setDocumentRecords({});

        setDocumentsError(
          error.message ||
            "Published documentation could not be loaded."
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

    loadPublishedDocuments();

    return () => {
      controller.abort();
    };
  }, []);

  function getSelectedVariant(
    product
  ) {
    if (
      !product.variants?.length
    ) {
      return null;
    }

    const selectedStrength =
      selectedStrengths[
        product.codeName
      ] ||
      product.variants[0]
        .strength;

    return (
      product.variants.find(
        (variant) =>
          variant.strength ===
          selectedStrength
      ) ||
      product.variants[0]
    );
  }

  function getResolvedProduct(
    product
  ) {
    const selectedVariant =
      getSelectedVariant(
        product
      );

    if (!selectedVariant) {
      return product;
    }

    return {
      ...product,
      ...selectedVariant,

      name:
        product.name,

      baseName:
        product.name,

      variants:
        product.variants,
    };
  }

  function selectStrength(
    product,
    strength
  ) {
    setSelectedStrengths(
      (currentSelections) => ({
        ...currentSelections,

        [product.codeName]:
          strength,
      })
    );
  }

  function openProductDetails(
    resolvedProduct
  ) {
    onProductSelect({
      ...resolvedProduct,

      documentationRecord:
        documentRecords[
          resolvedProduct.codeName
        ] ||
        null,
    });
  }

  const filteredProducts =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return catalogProducts.filter(
        (product) => {
          const matchesCategory =
            activeCategory ===
              "All Products" ||
            product.category ===
              activeCategory ||
            (activeCategory ===
              "Best Sellers" &&
              product.isBestSeller);

          const variants =
            product.variants?.length
              ? product.variants
              : [product];

          const variantSearchText =
            variants
              .map((variant) => {
                const record =
                  documentRecords[
                    variant.codeName
                  ];

                return [
                  variant.strength,
                  variant.codeName,
                  variant.composition,
                  record?.batchNumber,
                  record?.labName,
                  record?.testDate,
                ]
                  .filter(Boolean)
                  .join(" ");
              })
              .join(" ");

          const searchText = [
            product.name,
            product.codeName,
            product.strength,
            product.category,
            variantSearchText,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            normalizedSearch === "" ||
            searchText.includes(
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
      catalogProducts,
      documentRecords,
      searchTerm,
    ]);

  const categoryOptions = useMemo(
    () => getCatalogCategories(catalogProducts),
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

  const purchasingEnabled =
    settings.storeStatus ===
    "open";

  const publishedDocumentCount =
    Object.keys(
      documentRecords
    ).length;

  if (
    !settings.catalogEnabled
  ) {
    return (
      <>
        <style>
          {productsCss}
        </style>

        <main className="products-page">
          <section className="products-unavailable">
            <p className="eyebrow">
              PRODUCT CATALOG
            </p>

            <h1 className="products-title">
              Catalog Temporarily
              Unavailable
            </h1>

            <p className="products-subtitle">
              The research product
              catalog is currently
              unavailable. Please check
              back later or contact
              support for general
              website assistance.
            </p>

            <div className="products-research-pill">
              For Research Use Only.
              Not intended for human
              consumption.
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <style>
        {productsCss}
      </style>

      <main className="products-page">
        <section className="products-inner">
          <div className="products-hero">
            <p className="eyebrow">
              PRODUCT CATALOG
            </p>

            <h1 className="products-title">
              Research Products
            </h1>

            <p className="products-subtitle">
              Browse products by
              category, choose a
              strength, review pricing,
              and check whether
              batch-specific
              documentation has been
              published.
            </p>


          </div>

          <details className="products-filter-drawer">
            <summary className="products-filter-summary">
              <span className="products-filter-summary-main">
                <span className="products-filter-icon">
                  ☰
                </span>

                <span>
                  Filters & Search
                </span>
              </span>

              <span className="products-filter-summary-meta">
                {activeCategory} ·{" "}
                {filteredProducts.length} product
                {filteredProducts.length === 1
                  ? ""
                  : "s"}
              </span>
            </summary>

            <div className="products-filters">
              <div>
                <p className="eyebrow">
                  FILTER PRODUCTS
                </p>

                <h2 className="products-section-title">
                  Find Products
                </h2>

                <p className="products-category-description">
                  {categoryDescriptions[
                    activeCategory
                  ] ||
                    categoryDescriptions[
                      "All Products"
                    ]}
                </p>
              </div>

              <input
                type="search"
                className="products-search"
                placeholder="Search by product, code, strength, category, batch, or laboratory..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
              />

              <div className="products-category-row">
                {categoryOptions.map(
                  (category) => (
                    <button
                      key={category}
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

              <div className="products-results">
                <span>
                  Showing{" "}
                  <strong>
                    {
                      filteredProducts.length
                    }
                  </strong>{" "}
                  product
                  {filteredProducts.length ===
                  1
                    ? ""
                    : "s"}
                </span>

                <span>
                  Active Filter:{" "}
                  <strong>
                    {activeCategory}
                  </strong>
                </span>
              </div>
            </div>
          </details>

          {filteredProducts.length ===
          0 ? (
            <div className="products-empty">
              <p className="eyebrow">
                NO RESULTS
              </p>

              <h2 className="products-section-title">
                No Products Found
              </h2>

              <p>
                Try changing the search
                term or selecting
                another category.
              </p>

              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setSearchTerm("");

                  setActiveCategory(
                    "All Products"
                  );
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map(
                (product) => {
                  const selectedVariant =
                    getSelectedVariant(
                      product
                    );

                  const resolvedProduct =
                    getResolvedProduct(
                      product
                    );

                  const documentation =
                    documentRecords[
                      resolvedProduct
                        .codeName
                    ] ||
                    null;

                  const hasPublishedDocumentation =
                    Boolean(
                      documentation
                    );

                  const hasPrice =
                    Number.isFinite(
                      resolvedProduct.price
                    );

                  const availability =
                    resolvedProduct.availability ||
                    getVariantAvailability(
                      resolvedProduct
                    );

                  const canViewPrice =
                    isLoggedIn ||
                    settings.guestPricingEnabled;

                  const canPurchase =
                    hasPrice &&
                    purchasingEnabled &&
                    isLoggedIn &&
                    availability.purchasable;

                  const coaLabel =
                    documentsLoading
                      ? "Checking..."
                      : documentsError
                      ? "Unavailable"
                      : hasPublishedDocumentation
                      ? "Published"
                      : "Not Published";

                  const batchLabel =
                    hasPublishedDocumentation
                      ? documentation.batchNumber
                      : documentsLoading
                      ? "Checking..."
                      : documentsError
                      ? "Unavailable"
                      : "Not Published";

                  const verificationLabel =
                    hasPublishedDocumentation
                      ? "Ready"
                      : documentsLoading
                      ? "Checking..."
                      : documentsError
                      ? "Unavailable"
                      : "Not Published";

                  return (
                    <article
                      key={
                        product.codeName
                      }
                      className="products-card"
                    >
                      <div className="products-badge-row">
                        <span className="products-category-badge">
                          {
                            product.category
                          }
                        </span>

                        <div className="products-badge-group">
                          {product.isBestSeller && (
                            <span className="products-best-seller-badge">
                              Best Seller
                            </span>
                          )}

                          <span
                            className={
                              availability.key === "in_stock"
                                ? "products-coa-badge"
                                : "products-best-seller-badge"
                            }
                          >
                            {availability.label}
                          </span>

                          {hasPublishedDocumentation && (
                            <span className="products-coa-badge">
                              COA Published
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="products-image-button"
                        onClick={() =>
                          openProductDetails(
                            resolvedProduct
                          )
                        }
                        aria-label={`View ${product.name} ${resolvedProduct.strength}`}
                      >
                        {resolvedProduct.image ? (
                          <div className="products-real-image-wrap">
                            <img
                              src={
                                resolvedProduct.image
                              }
                              alt={`${product.name} ${resolvedProduct.strength} research product`}
                            />

                            <div className="products-image-glow" />
                          </div>
                        ) : (
                          <div className="products-bottle-wrap">
                            <div className="products-bottle-cap" />

                            <div className="products-bottle">
                              <div className="products-label">
                                <strong>
                                  304
                                </strong>

                                <span>
                                  {
                                    resolvedProduct.codeName
                                  }
                                </span>

                                <small>
                                  {
                                    resolvedProduct.strength
                                  }
                                </small>

                                <small className="products-label-notice">
                                  Research Use
                                  Only
                                </small>
                              </div>
                            </div>
                          </div>
                        )}
                      </button>

                      <h2 className="products-product-title">
                        {product.name}
                      </h2>

                      <p className="products-code">
                        {
                          resolvedProduct.codeName
                        }{" "}
                        ·{" "}
                        {
                          resolvedProduct.strength
                        }
                      </p>

                      {product.variants?.length >
                        0 && (
                        <div className="products-variant-panel">
                          <span className="products-variant-label">
                            Choose Strength
                          </span>

                          <div className="products-variant-buttons">
                            {product.variants.map(
                              (variant) => {
                                const isSelected =
                                  selectedVariant?.strength ===
                                  variant.strength;

                                const variantHasDocument =
                                  Boolean(
                                    documentRecords[
                                      variant
                                        .codeName
                                    ]
                                  );

                                return (
                                  <button
                                    key={
                                      variant.codeName
                                    }
                                    type="button"
                                    className={
                                      isSelected
                                        ? "products-variant-button products-variant-button-selected"
                                        : "products-variant-button"
                                    }
                                    onClick={() =>
                                      selectStrength(
                                        product,
                                        variant.strength
                                      )
                                    }
                                  >
                                    <span>
                                      {
                                        variant.strength
                                      }
                                    </span>

                                    {variantHasDocument && (
                                      <small>
                                        COA
                                      </small>
                                    )}
                                  </button>
                                );
                              }
                            )}
                          </div>

                          {resolvedProduct.composition && (
                            <div className="products-composition">
                              <span>
                                Composition
                              </span>

                              <strong>
                                {
                                  resolvedProduct.composition
                                }
                              </strong>
                            </div>
                          )}
                        </div>
                      )}

                      <p className="products-description">
                        {
                          product.description
                        }
                      </p>

                      <div className="products-status-grid">
                        <StatusBox
                          label="Purity"
                          value={
                            product.purity
                          }
                          ready
                        />

                        <StatusBox
                          label="COA"
                          value={coaLabel}
                          ready={
                            hasPublishedDocumentation
                          }
                        />

                        <StatusBox
                          label="Batch"
                          value={batchLabel}
                          ready={
                            hasPublishedDocumentation
                          }
                        />

                        <StatusBox
                          label="Verification"
                          value={
                            verificationLabel
                          }
                          ready={
                            hasPublishedDocumentation
                          }
                        />
                      </div>

                      {hasPublishedDocumentation && (
                        <div className="products-document-panel">
                          <div className="products-document-heading">
                            <div>
                              <span>
                                Published
                                Documentation
                              </span>

                              <strong>
                                {
                                  documentation.labName
                                }
                              </strong>
                            </div>

                            <span className="products-published-marker">
                              Verified Record
                            </span>
                          </div>

                          <div className="products-document-details">
                            <div>
                              <span>
                                Batch
                              </span>

                              <strong>
                                {
                                  documentation.batchNumber
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Test Date
                              </span>

                              <strong>
                                {formatDocumentDate(
                                  documentation.testDate
                                )}
                              </strong>
                            </div>
                          </div>

                          <div className="products-document-links">
                            <a
                              className="primary-btn products-link-button"
                              href={
                                documentation.coaUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open COA
                            </a>

                            <a
                              className="secondary-btn products-link-button"
                              href={
                                documentation.verificationUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Verify
                            </a>

                            <a
                              className="secondary-btn products-link-button products-full-link"
                              href={`/api/documents/${encodeURIComponent(
                                resolvedProduct.codeName
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View Public
                              Record
                            </a>
                          </div>
                        </div>
                      )}

                      <div className="products-price-box">
                        {!hasPrice ? (
                          <>
                            <span>
                              Pricing Status
                            </span>

                            <strong>
                              Price Coming Soon
                            </strong>
                          </>
                        ) : canViewPrice ? (
                          <>
                            <span>
                              Price
                            </span>

                            <strong>
                              $
                              {resolvedProduct.price.toFixed(
                                2
                              )}
                            </strong>
                          </>
                        ) : (
                          <>
                            <span>
                              Pricing Locked
                            </span>

                            <strong>
                              Login To View
                            </strong>
                          </>
                        )}
                      </div>

                      <div className="products-button-stack">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            openProductDetails(
                              resolvedProduct
                            )
                          }
                        >
                          View Details
                        </button>

                        {!hasPrice ? (
                          <button
                            type="button"
                            className="products-disabled-button"
                            disabled
                          >
                            Price Coming Soon
                          </button>
                        ) : !purchasingEnabled ? (
                          <button
                            type="button"
                            className="products-disabled-button"
                            disabled
                          >
                            Purchasing
                            Unavailable
                          </button>
                        ) : !availability.purchasable ? (
                          <button
                            type="button"
                            className="products-disabled-button"
                            disabled
                          >
                            Out Of Stock
                          </button>
                        ) : canPurchase ? (
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() =>
                              onAddToCart(
                                resolvedProduct
                              )
                            }
                          >
                            {availability.key === "preorder"
                              ? "Preorder "
                              : "Add "}
                            {resolvedProduct.strength}
                            {availability.key === "preorder"
                              ? ""
                              : " To Cart"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() =>
                              openProductDetails(
                                resolvedProduct
                              )
                            }
                          >
                            View Product
                          </button>
                        )}
                      </div>

                      <div className="products-research-notice">
                        Research Use Only
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function StatusBox({
  label,
  value,
  ready = false,
}) {
  return (
    <div
      className={
        ready
          ? "products-status-box products-status-box-ready"
          : "products-status-box"
      }
    >
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

const productsCss = `
  .products-page,
  .products-page *,
  .products-page *::before,
  .products-page *::after {
    box-sizing: border-box;
  }

  .products-page {
    width: 100%;
    max-width: 100%;
    padding: 38px 24px 64px;
    overflow-x: hidden;
  }

  .products-inner {
    width: 100%;
    max-width: 1250px;
    margin: 0 auto;
  }

  .products-hero,
  .products-unavailable {
    padding: 28px 30px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 22px;
    background:
      radial-gradient(
        circle at top,
        rgba(61,165,255,0.22),
        transparent 42%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 90px rgba(0,0,0,0.5);
    text-align: center;
  }

  .products-hero {
    margin-bottom: 18px;
  }

  .products-unavailable {
    max-width: 950px;
    margin: 0 auto;
  }

  .products-title {
    margin-bottom: 10px;
    font-size: clamp(38px, 6vw, 54px);
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

  .products-subtitle {
    max-width: 760px;
    margin: 0 auto;
    color: #c8c8c8;
    font-size: 16px;
    line-height: 1.6;
  }

  .products-status-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 30px;
  }

  .products-research-pill,
  .products-store-pill,
  .products-document-pill {
    display: inline-flex;
    padding: 14px 22px;
    border-radius: 999px;
    font-weight: 900;
    line-height: 1.5;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .products-research-pill,
  .products-document-pill {
    border: 1px solid rgba(61,165,255,0.28);
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
  }

  .products-store-pill {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.07);
    color: #c8c8c8;
  }

  .products-store-pill-open {
    border-color: rgba(61,165,255,0.42);
    background: rgba(61,165,255,0.18);
    color: #ffffff;
  }

  .products-store-notice,
  .products-document-error {
    max-width: 760px;
    margin: 22px auto 0;
    padding: 15px 18px;
    border-radius: 15px;
    line-height: 1.65;
  }

  .products-store-notice {
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(0,0,0,0.25);
    color: #aeb7bf;
  }

  .products-document-error {
    border: 1px solid rgba(255,130,130,0.25);
    background: rgba(255,70,70,0.08);
    color: #ffd1d1;
  }

  .products-filter-drawer {
    width: 100%;
    margin-bottom: 22px;
  }

  .products-filter-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    padding: 15px 18px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.14),
        transparent 45%
      ),
      rgba(255,255,255,0.04);
    box-shadow:
      0 18px 45px rgba(0,0,0,0.32);
    color: #ffffff;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }

  .products-filter-summary::-webkit-details-marker {
    display: none;
  }

  .products-filter-summary::marker {
    content: "";
  }

  .products-filter-summary-main {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    font-size: 14px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .products-filter-icon {
    width: 34px;
    height: 34px;
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    border: 1px solid rgba(61,165,255,0.3);
    border-radius: 10px;
    background: rgba(61,165,255,0.13);
    color: #9ed8ff;
    font-size: 17px;
    line-height: 1;
  }

  .products-filter-summary-meta {
    color: #9ed8ff;
    font-size: 12px;
    font-weight: 800;
    text-align: right;
  }

  .products-filter-drawer[open]
    .products-filter-summary {
    border-color: rgba(61,165,255,0.32);
    border-radius: 16px 16px 10px 10px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.2),
        transparent 48%
      ),
      rgba(255,255,255,0.055);
  }

  .products-filter-drawer
    .products-filters {
    margin-top: 10px;
    margin-bottom: 0;
  }

  @media (max-width: 650px) {
    .products-filter-summary {
      align-items: flex-start;
      flex-wrap: wrap;
      padding: 13px 14px;
    }

    .products-filter-summary-meta {
      width: 100%;
      padding-left: 45px;
      text-align: left;
    }
  }
  .products-filters {
    padding: 22px;
    margin-bottom: 22px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 22px;
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

  .products-section-title {
    margin-bottom: 8px;
    font-size: clamp(28px, 4vw, 34px);
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

  .products-category-description {
    max-width: 850px;
    margin-bottom: 14px;
    color: #c8c8c8;
    line-height: 1.6;
  }

  .products-search {
    width: 100%;
    padding: 13px 15px;
    margin-bottom: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    outline: none;
    background: rgba(255,255,255,0.055);
    color: #ffffff;
    font: inherit;
  }

  .products-category-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .products-results {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 15px;
    padding: 12px 14px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(255,255,255,0.045);
    color: #c8c8c8;
  }

  .products-grid {
    display: grid;
    grid-template-columns:
      repeat(auto-fit, minmax(310px, 1fr));
    gap: 24px;
  }

  .products-card {
    min-width: 0;
    padding: 26px;
    overflow: hidden;
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
      0 28px 75px rgba(0,0,0,0.42);
  }

  .products-badge-row {
    position: relative;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }

  .products-badge-group {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .products-category-badge,
  .products-best-seller-badge,
  .products-coa-badge {
    display: inline-flex;
    width: fit-content;
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .products-category-badge {
    border: 1px solid rgba(61,165,255,0.28);
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
  }

  .products-best-seller-badge {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.08);
    color: #ffffff;
  }

  .products-coa-badge {
    border: 1px solid rgba(61,165,255,0.45);
    background: rgba(61,165,255,0.18);
    color: #c8ecff;
  }

  .products-image-button {
    display: block;
    width: 100%;
    padding: 0;
    margin: 0 0 22px;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .products-real-image-wrap,
  .products-bottle-wrap {
    width: 100%;
    height: 320px;
    overflow: hidden;
    border: 1px solid rgba(61,165,255,0.16);
    border-radius: 22px;
    background:
      radial-gradient(
        circle at center,
        rgba(61,165,255,0.18),
        rgba(0,0,0,0.72) 70%
      );
  }

  .products-real-image-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .products-real-image-wrap img {
    position: relative;
    z-index: 1;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .products-image-glow {
    position: absolute;
    left: 20%;
    right: 20%;
    bottom: 8px;
    height: 30px;
    border-radius: 50%;
    background: rgba(61,165,255,0.25);
    filter: blur(18px);
  }

  .products-bottle-wrap {
    display: grid;
    align-content: center;
    justify-content: center;
  }

  .products-bottle-cap {
    width: 68px;
    height: 28px;
    margin: 0 auto;
    border-radius: 11px 11px 4px 4px;
    background:
      linear-gradient(
        180deg,
        #e3e3e3,
        #737373
      );
    box-shadow:
      0 0 18px rgba(61,165,255,0.15);
  }

  .products-bottle {
    width: 150px;
    height: 205px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255,255,255,0.7);
    border-radius: 32px 32px 38px 38px;
    background:
      linear-gradient(
        135deg,
        rgba(255,255,255,0.9),
        rgba(255,255,255,0.28)
      );
    box-shadow:
      0 24px 60px rgba(0,0,0,0.45);
  }

  .products-label {
    width: 116px;
    min-height: 125px;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 7px;
    padding: 11px;
    border: 1px solid rgba(61,165,255,0.35);
    border-radius: 15px;
    background:
      linear-gradient(
        180deg,
        #050505,
        #171717
      );
    color: #ffffff;
    text-align: center;
  }

  .products-label strong {
    font-size: 27px;
    line-height: 1;
  }

  .products-label span {
    color: #9ed8ff;
    font-size: 12px;
    font-weight: 900;
  }

  .products-label small {
    color: #ffffff;
    font-size: 14px;
    font-weight: 900;
  }

  .products-label .products-label-notice {
    color: #9ed8ff;
    font-size: 8px;
    text-transform: uppercase;
  }

  .products-product-title {
    margin-bottom: 8px;
    color: #ffffff;
    font-size: 29px;
    line-height: 1.15;
    overflow-wrap: anywhere;
  }

  .products-code {
    margin-bottom: 16px;
    color: #9ed8ff;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .products-variant-panel {
    margin-bottom: 18px;
    padding: 15px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    background: rgba(0,0,0,0.24);
  }

  .products-variant-label {
    display: block;
    margin-bottom: 10px;
    color: #c8c8c8;
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .products-variant-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .products-variant-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 13px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    background: rgba(255,255,255,0.045);
    color: #d4d4d4;
    font-weight: 900;
    cursor: pointer;
  }

  .products-variant-button-selected {
    border-color: rgba(61,165,255,0.62);
    background: rgba(61,165,255,0.22);
    color: #ffffff;
    box-shadow:
      0 0 18px rgba(61,165,255,0.16);
  }

  .products-variant-button small {
    padding: 3px 5px;
    border-radius: 999px;
    background: rgba(61,165,255,0.18);
    color: #9ed8ff;
    font-size: 8px;
    text-transform: uppercase;
  }

  .products-composition {
    display: grid;
    gap: 5px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.08);
    color: #c8c8c8;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .products-description {
    min-height: 86px;
    color: #c8c8c8;
    font-size: 15px;
    line-height: 1.8;
  }

  .products-status-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 20px;
  }

  .products-status-box {
    min-width: 0;
    display: grid;
    gap: 4px;
    padding: 12px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 14px;
    background: rgba(255,255,255,0.045);
    color: #c8c8c8;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .products-status-box-ready {
    border-color: rgba(61,165,255,0.22);
    background: rgba(61,165,255,0.08);
    color: #c6ebff;
  }

  .products-document-panel {
    margin-top: 18px;
    padding: 16px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 18px;
    background:
      linear-gradient(
        145deg,
        rgba(61,165,255,0.11),
        rgba(0,0,0,0.2)
      );
  }

  .products-document-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }

  .products-document-heading > div {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .products-document-heading > div > span,
  .products-document-details span {
    color: #9ca8b3;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .products-document-heading strong {
    color: #ffffff;
    overflow-wrap: anywhere;
  }

  .products-published-marker {
    display: inline-flex;
    padding: 6px 9px;
    border: 1px solid rgba(61,165,255,0.3);
    border-radius: 999px;
    background: rgba(61,165,255,0.14);
    color: #9ed8ff;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .products-document-details {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 9px;
    margin-top: 14px;
  }

  .products-document-details > div {
    min-width: 0;
    display: grid;
    gap: 4px;
    padding: 11px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    background: rgba(0,0,0,0.2);
    overflow-wrap: anywhere;
  }

  .products-document-details strong {
    color: #ffffff;
    font-size: 12px;
  }

  .products-document-links {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 9px;
    margin-top: 14px;
  }

  .products-link-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    text-align: center;
    text-decoration: none;
  }

  .products-full-link {
    grid-column: 1 / -1;
  }

  .products-price-box {
    display: grid;
    gap: 4px;
    margin-top: 18px;
    padding: 16px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 16px;
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
  }

  .products-button-stack {
    display: grid;
    gap: 10px;
    margin-top: 18px;
  }

  .products-disabled-button {
    width: 100%;
    padding: 14px 18px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    background: rgba(255,255,255,0.045);
    color: #858f99;
    font-weight: 900;
    cursor: not-allowed;
  }

  .products-research-notice {
    margin-top: 18px;
    color: #9ed8ff;
    font-size: 12px;
    font-weight: 900;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .products-empty {
    display: grid;
    justify-items: center;
    gap: 18px;
    padding: 50px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background: rgba(255,255,255,0.035);
    box-shadow:
      0 30px 80px rgba(0,0,0,0.35);
    color: #c8c8c8;
    text-align: center;
  }

  @media (max-width: 900px) {
    .products-page {
      padding: 32px 18px 56px;
    }
  }

  @media (max-width: 650px) {
    .products-page {
      padding: 24px 10px 46px;
    }

    .products-hero,
    .products-unavailable {
      padding: 22px 16px;
      border-radius: 20px;
    }

    .products-filters,
    .products-card {
      padding: 19px;
      border-radius: 22px;
    }

    .products-category-row button {
      flex: 1 1 145px;
    }

    .products-status-row > div {
      width: 100%;
      justify-content: center;
    }

    .products-badge-row {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr);
    }

    .products-badge-group {
      justify-content: flex-start;
    }
  }

  @media (max-width: 430px) {
    .products-page {
      padding: 18px 8px 40px;
    }

    .products-hero,
    .products-unavailable,
    .products-filters,
    .products-card {
      padding: 15px;
    }

    .products-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .products-real-image-wrap,
    .products-bottle-wrap {
      height: 280px;
    }

    .products-status-grid,
    .products-document-details,
    .products-document-links {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .products-full-link {
      grid-column: auto;
    }

    .products-description {
      min-height: 0;
    }

    .products-link-button,
    .products-button-stack button {
      width: 100%;
    }
  }
`;

export default Products;
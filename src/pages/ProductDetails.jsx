import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { getVariantAvailability } from "../data/catalogRuntime";

const storageKey =
  "304-site-settings";

const defaultSettings = {
  storeStatus: "coming-soon",
  catalogEnabled: true,
  guestPricingEnabled: false,
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

function formatTestDate(
  value
) {
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

function formatUpdatedDate(
  value
) {
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

function ProductDetails({
  product,
  isLoggedIn,
  onAddToCart,
  onNavigate,
}) {
  const [settings, setSettings] =
    useState(loadSettings);

  const [
    selectedStrength,
    setSelectedStrength,
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

  const [
    documentRefreshKey,
    setDocumentRefreshKey,
  ] = useState(0);

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
    if (!product) {
      setSelectedStrength("");
      return;
    }

    if (
      product.variants?.length >
      0
    ) {
      const matchingVariant =
        product.variants.find(
          (variant) =>
            variant.strength ===
            product.strength
        );

      setSelectedStrength(
        matchingVariant?.strength ||
          product.variants[0]
            .strength
      );

      return;
    }

    setSelectedStrength(
      product.strength || ""
    );
  }, [product]);

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
  }, [documentRefreshKey]);

  const resolvedProduct =
    useMemo(() => {
      if (!product) {
        return null;
      }

      if (
        !product.variants?.length
      ) {
        return product;
      }

      const selectedVariant =
        product.variants.find(
          (variant) =>
            variant.strength ===
            selectedStrength
        ) ||
        product.variants[0];

      return {
        ...product,
        ...selectedVariant,

        name:
          product.baseName ||
          product.name,

        baseName:
          product.baseName ||
          product.name,

        variants:
          product.variants,
      };
    }, [
      product,
      selectedStrength,
    ]);

  const documentation =
    resolvedProduct
      ? documentRecords[
          resolvedProduct.codeName
        ] || null
      : null;

  const hasPublishedDocumentation =
    Boolean(documentation);

  if (
    !settings.catalogEnabled
  ) {
    return (
      <>
        <style>
          {productDetailsCss}
        </style>

        <main className="product-details-page">
          <section className="product-details-empty">
            <p className="eyebrow">
              PRODUCT CATALOG
            </p>

            <h1 className="product-details-title">
              Catalog Temporarily
              Unavailable
            </h1>

            <p className="product-details-text">
              The research product
              catalog is currently
              unavailable. Please check
              back later.
            </p>

            <div className="product-details-research-notice">
              For Research Use Only.
              Not intended for human
              consumption.
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={() =>
                onNavigate("home")
              }
            >
              Return Home
            </button>
          </section>
        </main>
      </>
    );
  }

  if (!resolvedProduct) {
    return (
      <>
        <style>
          {productDetailsCss}
        </style>

        <main className="product-details-page">
          <section className="product-details-empty">
            <p className="eyebrow">
              PRODUCT NOT SELECTED
            </p>

            <h1 className="product-details-title">
              Choose A Product
            </h1>

            <p className="product-details-text">
              Return to the catalog
              and select a product to
              view its details.
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
          </section>
        </main>
      </>
    );
  }

  const displayName =
    resolvedProduct.baseName ||
    resolvedProduct.name;

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

  const purchasingEnabled =
    settings.storeStatus ===
    "open";

  const canPurchase =
    hasPrice &&
    purchasingEnabled &&
    isLoggedIn &&
    availability.purchasable;

  const storeStatusLabel =
    settings.storeStatus ===
    "open"
      ? "Store Open"
      : settings.storeStatus ===
        "maintenance"
      ? "Maintenance Mode"
      : "Coming Soon";

  const documentationStatus =
    documentsLoading
      ? "Checking Records"
      : documentsError
      ? "Documentation Unavailable"
      : hasPublishedDocumentation
      ? "Published Documentation"
      : "No Published Record";

  function handleAddToCart() {
    if (!canPurchase) {
      return;
    }

    onAddToCart({
      ...resolvedProduct,

      name:
        `${displayName} ${resolvedProduct.strength}`,

      documentationRecord:
        documentation,
    });
  }

  function refreshDocumentation() {
    setDocumentRefreshKey(
      (currentKey) =>
        currentKey + 1
    );
  }

  return (
    <>
      <style>
        {productDetailsCss}
      </style>

      <main className="product-details-page">
        <section className="product-details-inner">
          <button
            type="button"
            className="secondary-btn product-details-back-button"
            onClick={() =>
              onNavigate(
                "products"
              )
            }
          >
            ← Back To Products
          </button>

          <div className="product-details-layout">
            <div className="product-details-image-panel">
              <div className="product-details-badge-row">
                <span className="product-details-category-badge">
                  {
                    resolvedProduct.category
                  }
                </span>

                <div className="product-details-badge-group">
                  {resolvedProduct.isBestSeller && (
                    <span className="product-details-best-seller-badge">
                      Best Seller
                    </span>
                  )}

                  {hasPublishedDocumentation && (
                    <span className="product-details-coa-badge">
                      COA Published
                    </span>
                  )}
                </div>
              </div>

              {resolvedProduct.image ? (
                <div className="product-details-real-image">
                  <img
                    src={
                      resolvedProduct.image
                    }
                    alt={`${displayName} ${resolvedProduct.strength} research product`}
                  />

                  <div className="product-details-image-glow" />
                </div>
              ) : (
                <div className="product-details-placeholder">
                  <div className="product-details-bottle-cap" />

                  <div className="product-details-bottle">
                    <div className="product-details-label">
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

                      <small className="product-details-label-notice">
                        Research Use
                        Only
                      </small>
                    </div>
                  </div>
                </div>
              )}

              <div className="product-details-image-notice">
                Product image shown for
                catalog presentation.
              </div>
            </div>

            <div className="product-details-content-panel">
              <div className="product-details-heading-status">
                <p className="eyebrow">
                  304 PEPTIDES PRODUCT
                </p>

                <div className="product-details-heading-badges">
                  <span
                    className={
                      purchasingEnabled
                        ? "product-details-store-status product-details-store-open"
                        : "product-details-store-status"
                    }
                  >
                    {storeStatusLabel}
                  </span>

                  <span
                    className={
                      hasPublishedDocumentation
                        ? "product-details-document-status product-details-document-ready"
                        : "product-details-document-status"
                    }
                  >
                    {
                      documentationStatus
                    }
                  </span>
                </div>
              </div>

              <h1 className="product-details-title">
                {displayName}
              </h1>

              <p className="product-details-code">
                {
                  resolvedProduct.codeName
                }{" "}
                ·{" "}
                {
                  resolvedProduct.strength
                }
              </p>

              {resolvedProduct.variants?.length >
                0 && (
                <div className="product-details-variant-panel">
                  <span className="product-details-variant-label">
                    Choose Strength
                  </span>

                  <div className="product-details-variant-row">
                    {resolvedProduct.variants.map(
                      (variant) => {
                        const isSelected =
                          variant.strength ===
                          resolvedProduct.strength;

                        const variantHasDocumentation =
                          Boolean(
                            documentRecords[
                              variant.codeName
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
                                ? "product-details-variant-button product-details-variant-selected"
                                : "product-details-variant-button"
                            }
                            onClick={() =>
                              setSelectedStrength(
                                variant.strength
                              )
                            }
                          >
                            <span>
                              {
                                variant.strength
                              }
                            </span>

                            {variantHasDocumentation && (
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
                    <div className="product-details-composition">
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

              <p className="product-details-description">
                {
                  resolvedProduct.description
                }
              </p>

              <div className="product-details-research-notice">
                For Research Use Only.
                Not intended for human
                consumption.
              </div>

              {!purchasingEnabled && (
                <div className="product-details-store-notice">
                  Product information
                  remains available, but
                  purchasing is
                  currently disabled
                  while the store status
                  is{" "}
                  <strong>
                    {storeStatusLabel}
                  </strong>
                  .
                </div>
              )}

              <div className="product-details-information-grid">
                <InformationBox
                  label="Strength"
                  value={
                    resolvedProduct.strength
                  }
                />

                <InformationBox
                  label="Purity"
                  value={
                    resolvedProduct.purity ||
                    "Not listed"
                  }
                />

                <InformationBox
                  label="Product Code"
                  value={
                    resolvedProduct.codeName
                  }
                />

                <InformationBox
                  label="Category"
                  value={
                    resolvedProduct.category
                  }
                />
              </div>

              <section className="product-details-verification-panel">
                <div className="product-details-verification-heading">
                  <div>
                    <p className="eyebrow">
                      VERIFICATION STATUS
                    </p>

                    <h2>
                      Batch Documentation
                    </h2>
                  </div>

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
                      ? "Checking..."
                      : "Refresh"}
                  </button>
                </div>

                {documentsLoading && (
                  <div className="product-details-document-state">
                    <div className="product-details-loader" />

                    <strong>
                      Checking Published
                      Records
                    </strong>

                    <span>
                      Loading the
                      documentation
                      record for the
                      selected product
                      code.
                    </span>
                  </div>
                )}

                {!documentsLoading &&
                  documentsError && (
                  <div className="product-details-document-error">
                    <strong>
                      Documentation
                      Unavailable
                    </strong>

                    <span>
                      {
                        documentsError
                      }
                    </span>

                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={
                        refreshDocumentation
                      }
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {!documentsLoading &&
                  !documentsError &&
                  !hasPublishedDocumentation && (
                  <div className="product-details-document-empty">
                    <strong>
                      No Published Record
                    </strong>

                    <span>
                      No completed,
                      reviewed, and
                      published
                      documentation
                      record is currently
                      available for{" "}
                      {
                        resolvedProduct.codeName
                      }{" "}
                      {
                        resolvedProduct.strength
                      }
                      .
                    </span>

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

                {!documentsLoading &&
                  !documentsError &&
                  hasPublishedDocumentation && (
                  <>
                    <div className="product-details-verification-grid">
                      <VerificationBox
                        label="Certificate Of Analysis"
                        value="Published"
                        ready
                      />

                      <VerificationBox
                        label="Batch Number"
                        value={
                          documentation.batchNumber
                        }
                        ready
                      />

                      <VerificationBox
                        label="Testing Laboratory"
                        value={
                          documentation.labName
                        }
                        ready
                      />

                      <VerificationBox
                        label="Test Date"
                        value={formatTestDate(
                          documentation.testDate
                        )}
                        ready
                      />

                      <VerificationBox
                        label="Verification"
                        value="Available"
                        ready
                      />

                      <VerificationBox
                        label="Record Updated"
                        value={formatUpdatedDate(
                          documentation.updatedAt
                        )}
                        ready
                      />
                    </div>

                    {documentation.composition && (
                      <div className="product-details-document-composition">
                        <span>
                          Documented
                          Composition
                        </span>

                        <strong>
                          {
                            documentation.composition
                          }
                        </strong>
                      </div>
                    )}

                    <div className="product-details-document-actions">
                      <a
                        className="primary-btn product-details-link-button"
                        href={
                          documentation.coaUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Certificate
                      </a>

                      <a
                        className="secondary-btn product-details-link-button"
                        href={
                          documentation.verificationUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Verification
                      </a>

                      <a
                        className="secondary-btn product-details-link-button product-details-full-link"
                        href={`/api/documents/${encodeURIComponent(
                          resolvedProduct.codeName
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Public Record
                        Data
                      </a>
                    </div>

                    <div className="product-details-batch-notice">
                      This documentation
                      applies only to
                      product code{" "}
                      <strong>
                        {
                          resolvedProduct.codeName
                        }
                      </strong>
                      , strength{" "}
                      <strong>
                        {
                          resolvedProduct.strength
                        }
                      </strong>
                      , and batch{" "}
                      <strong>
                        {
                          documentation.batchNumber
                        }
                      </strong>
                      .
                    </div>
                  </>
                )}
              </section>

              <div className="product-details-purchase-panel">
                {!hasPrice ? (
                  <>
                    <div>
                      <span className="product-details-price-label">
                        Pricing Status
                      </span>

                      <strong className="product-details-locked-price">
                        Price Coming Soon
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="product-details-disabled-button"
                      disabled
                    >
                      Price Coming Soon
                    </button>
                  </>
                ) : !canViewPrice ? (
                  <>
                    <div>
                      <span className="product-details-price-label">
                        Pricing Locked
                      </span>

                      <strong className="product-details-locked-price">
                        Login To View
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() =>
                        onNavigate(
                          "login"
                        )
                      }
                    >
                      Login To View
                      Pricing
                    </button>
                  </>
                ) : !purchasingEnabled ? (
                  <>
                    <div>
                      <span className="product-details-price-label">
                        Price
                      </span>

                      <strong className="product-details-price">
                        $
                        {resolvedProduct.price.toFixed(
                          2
                        )}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="product-details-disabled-button"
                      disabled
                    >
                      Purchasing
                      Unavailable
                    </button>
                  </>
                ) : !availability.purchasable ? (
                  <>
                    <div>
                      <span className="product-details-price-label">
                        Availability
                      </span>

                      <strong className="product-details-locked-price">
                        Out Of Stock
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="product-details-disabled-button"
                      disabled
                    >
                      Out Of Stock
                    </button>
                  </>
                ) : canPurchase ? (
                  <>
                    <div>
                      <span className="product-details-price-label">
                        Price
                      </span>

                      <strong className="product-details-price">
                        $
                        {resolvedProduct.price.toFixed(
                          2
                        )}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="primary-btn"
                      onClick={
                        handleAddToCart
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
                  </>
                ) : (
                  <>
                    <div>
                      <span className="product-details-price-label">
                        Price
                      </span>

                      <strong className="product-details-price">
                        $
                        {resolvedProduct.price.toFixed(
                          2
                        )}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() =>
                        onNavigate(
                          "login"
                        )
                      }
                    >
                      Login To Purchase
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                className="secondary-btn product-details-agreement-button"
                onClick={() =>
                  onNavigate(
                    "researchAgreement"
                  )
                }
              >
                View Research Agreement
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function InformationBox({
  label,
  value,
}) {
  return (
    <div className="product-details-information-box">
      <span>{label}</span>

      <strong>
        {value ||
          "Not available"}
      </strong>
    </div>
  );
}

function VerificationBox({
  label,
  value,
  ready = false,
}) {
  return (
    <div
      className={
        ready
          ? "product-details-verification-box product-details-verification-ready"
          : "product-details-verification-box"
      }
    >
      <span>{label}</span>

      <strong>
        {value ||
          "Not available"}
      </strong>
    </div>
  );
}

const productDetailsCss = `
  .product-details-page,
  .product-details-page *,
  .product-details-page *::before,
  .product-details-page *::after {
    box-sizing: border-box;
  }

  .product-details-page {
    width: 100%;
    max-width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .product-details-inner {
    width: 100%;
    max-width: 1250px;
    margin: 0 auto;
  }

  .product-details-back-button {
    margin-bottom: 24px;
  }

  .product-details-layout {
    display: grid;
    grid-template-columns:
      minmax(340px, 0.9fr)
      minmax(0, 1.1fr);
    gap: 30px;
    align-items: start;
  }

  .product-details-image-panel,
  .product-details-content-panel {
    min-width: 0;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 30px;
    background:
      radial-gradient(
        circle at top,
        rgba(61,165,255,0.18),
        transparent 48%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 80px rgba(0,0,0,0.45);
  }

  .product-details-image-panel {
    padding: 28px;
  }

  .product-details-content-panel {
    padding: 38px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.14),
        transparent 36%
      ),
      rgba(255,255,255,0.035);
  }

  .product-details-badge-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .product-details-badge-group,
  .product-details-heading-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .product-details-category-badge,
  .product-details-best-seller-badge,
  .product-details-coa-badge,
  .product-details-store-status,
  .product-details-document-status {
    display: inline-flex;
    width: fit-content;
    padding: 9px 14px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .product-details-category-badge {
    border: 1px solid rgba(61,165,255,0.28);
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
  }

  .product-details-best-seller-badge {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.08);
    color: #ffffff;
  }

  .product-details-coa-badge,
  .product-details-document-ready,
  .product-details-store-open {
    border: 1px solid rgba(61,165,255,0.42);
    background: rgba(61,165,255,0.17);
    color: #9ed8ff;
  }

  .product-details-store-status,
  .product-details-document-status {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: #c8c8c8;
  }

  .product-details-real-image,
  .product-details-placeholder {
    width: 100%;
    min-height: 560px;
    overflow: hidden;
    border: 1px solid rgba(61,165,255,0.18);
    border-radius: 24px;
    background:
      radial-gradient(
        circle at center,
        rgba(61,165,255,0.18),
        rgba(0,0,0,0.78) 72%
      );
  }

  .product-details-real-image {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .product-details-real-image img {
    position: relative;
    z-index: 1;
    display: block;
    width: 100%;
    height: 100%;
    min-height: 560px;
    object-fit: cover;
    object-position: center;
  }

  .product-details-image-glow {
    position: absolute;
    left: 20%;
    right: 20%;
    bottom: 12px;
    height: 45px;
    border-radius: 50%;
    background: rgba(61,165,255,0.25);
    filter: blur(22px);
  }

  .product-details-placeholder {
    display: grid;
    align-content: center;
    justify-content: center;
  }

  .product-details-bottle-cap {
    width: 95px;
    height: 39px;
    margin: 0 auto;
    border-radius: 14px 14px 5px 5px;
    background:
      linear-gradient(
        180deg,
        #e1e1e1,
        #777
      );
    box-shadow:
      0 0 22px rgba(61,165,255,0.16);
  }

  .product-details-bottle {
    width: 220px;
    height: 320px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255,255,255,0.7);
    border-radius: 42px 42px 52px 52px;
    background:
      linear-gradient(
        135deg,
        rgba(255,255,255,0.9),
        rgba(255,255,255,0.3)
      );
    box-shadow:
      0 28px 70px rgba(0,0,0,0.5);
  }

  .product-details-label {
    width: 170px;
    min-height: 180px;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 12px;
    padding: 18px;
    border: 1px solid rgba(61,165,255,0.4);
    border-radius: 20px;
    background:
      linear-gradient(
        180deg,
        #050505,
        #171717
      );
    color: #ffffff;
    text-align: center;
  }

  .product-details-label strong {
    font-size: 48px;
    line-height: 1;
  }

  .product-details-label span {
    color: #9ed8ff;
    font-size: 18px;
    font-weight: 900;
  }

  .product-details-label small {
    font-size: 22px;
    font-weight: 900;
  }

  .product-details-label .product-details-label-notice {
    color: #9ed8ff;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .product-details-image-notice {
    margin-top: 16px;
    color: #858f99;
    font-size: 12px;
    text-align: center;
  }

  .product-details-heading-status {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    flex-wrap: wrap;
  }

  .product-details-title {
    margin: 12px 0;
    font-size: clamp(42px, 6vw, 58px);
    line-height: 1.04;
    background:
      linear-gradient(
        180deg,
        #ffffff,
        #999999
      );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    overflow-wrap: anywhere;
  }

  .product-details-code {
    margin-bottom: 24px;
    color: #9ed8ff;
    font-size: 18px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .product-details-variant-panel {
    margin-bottom: 24px;
    padding: 18px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    background: rgba(0,0,0,0.24);
  }

  .product-details-variant-label {
    display: block;
    margin-bottom: 12px;
    color: #c8c8c8;
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .product-details-variant-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .product-details-variant-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 12px 16px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 13px;
    background: rgba(255,255,255,0.045);
    color: #d4d4d4;
    font-weight: 900;
    cursor: pointer;
  }

  .product-details-variant-selected {
    border-color: rgba(61,165,255,0.62);
    background: rgba(61,165,255,0.22);
    color: #ffffff;
    box-shadow:
      0 0 20px rgba(61,165,255,0.18);
  }

  .product-details-variant-button small {
    padding: 3px 6px;
    border-radius: 999px;
    background: rgba(61,165,255,0.18);
    color: #9ed8ff;
    font-size: 8px;
    text-transform: uppercase;
  }

  .product-details-composition {
    display: grid;
    gap: 6px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.08);
    color: #c8c8c8;
    overflow-wrap: anywhere;
  }

  .product-details-description,
  .product-details-text {
    color: #c8c8c8;
    font-size: 17px;
    line-height: 1.85;
  }

  .product-details-research-notice {
    margin-top: 24px;
    padding: 16px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 18px;
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
    font-weight: 900;
    line-height: 1.5;
  }

  .product-details-store-notice {
    margin-top: 14px;
    padding: 15px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(0,0,0,0.24);
    color: #aeb7bf;
    line-height: 1.65;
  }

  .product-details-information-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 24px;
  }

  .product-details-information-box {
    min-width: 0;
    display: grid;
    gap: 6px;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    background: rgba(255,255,255,0.045);
    color: #c8c8c8;
    overflow-wrap: anywhere;
  }

  .product-details-information-box span,
  .product-details-verification-box span {
    color: #9ca8b3;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .product-details-information-box strong,
  .product-details-verification-box strong {
    color: #ffffff;
  }

  .product-details-verification-panel {
    margin-top: 24px;
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    background: rgba(0,0,0,0.24);
  }

  .product-details-verification-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    flex-wrap: wrap;
  }

  .product-details-verification-heading h2 {
    margin-top: 5px;
    color: #ffffff;
    font-size: 26px;
  }

  .product-details-verification-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 18px;
  }

  .product-details-verification-box {
    min-width: 0;
    display: grid;
    gap: 6px;
    padding: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    background: rgba(255,255,255,0.04);
    color: #c8c8c8;
    overflow-wrap: anywhere;
  }

  .product-details-verification-ready {
    border-color: rgba(61,165,255,0.24);
    background: rgba(61,165,255,0.08);
  }

  .product-details-document-state,
  .product-details-document-empty,
  .product-details-document-error {
    display: grid;
    justify-items: start;
    gap: 11px;
    margin-top: 18px;
    padding: 18px;
    border-radius: 16px;
    line-height: 1.65;
  }

  .product-details-document-state,
  .product-details-document-empty {
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(255,255,255,0.035);
    color: #c8c8c8;
  }

  .product-details-document-error {
    border: 1px solid rgba(255,120,120,0.27);
    background: rgba(255,70,70,0.08);
    color: #ffd1d1;
  }

  .product-details-document-state strong,
  .product-details-document-empty strong,
  .product-details-document-error strong {
    color: #ffffff;
    font-size: 18px;
  }

  .product-details-loader {
    width: 34px;
    height: 34px;
    border: 4px solid rgba(255,255,255,0.12);
    border-top-color: #9ed8ff;
    border-radius: 50%;
    animation:
      product-details-spin 0.8s linear infinite;
  }

  @keyframes product-details-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .product-details-document-composition {
    display: grid;
    gap: 6px;
    margin-top: 14px;
    padding: 14px;
    border: 1px solid rgba(61,165,255,0.2);
    border-radius: 14px;
    background: rgba(61,165,255,0.08);
    color: #c6ebff;
    overflow-wrap: anywhere;
  }

  .product-details-document-actions {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 16px;
  }

  .product-details-link-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    text-align: center;
    text-decoration: none;
  }

  .product-details-full-link {
    grid-column: 1 / -1;
  }

  .product-details-batch-notice {
    margin-top: 16px;
    padding: 14px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    background: rgba(255,255,255,0.025);
    color: #9ca8b3;
    font-size: 12px;
    line-height: 1.7;
  }

  .product-details-purchase-panel {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    margin-top: 24px;
    padding: 22px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 20px;
    background: rgba(61,165,255,0.12);
  }

  .product-details-price-label {
    display: block;
    margin-bottom: 5px;
    color: #9ed8ff;
    font-weight: 800;
  }

  .product-details-price {
    display: block;
    color: #ffffff;
    font-size: 34px;
  }

  .product-details-locked-price {
    display: block;
    color: #ffffff;
    font-size: 22px;
  }

  .product-details-disabled-button {
    padding: 14px 18px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    background: rgba(255,255,255,0.045);
    color: #858f99;
    font-weight: 900;
    cursor: not-allowed;
  }

  .product-details-agreement-button {
    width: 100%;
    margin-top: 14px;
  }

  .product-details-empty {
    max-width: 850px;
    display: grid;
    justify-items: center;
    gap: 22px;
    margin: 0 auto;
    padding: 60px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 30px;
    background: rgba(255,255,255,0.035);
    text-align: center;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 960px) {
    .product-details-page {
      padding: 65px 24px;
    }

    .product-details-layout {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .product-details-real-image,
    .product-details-real-image img,
    .product-details-placeholder {
      min-height: 500px;
    }
  }

  @media (max-width: 650px) {
    .product-details-page {
      padding: 44px 12px;
    }

    .product-details-image-panel,
    .product-details-content-panel {
      padding: 20px;
      border-radius: 23px;
    }

    .product-details-information-grid,
    .product-details-verification-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .product-details-purchase-panel,
    .product-details-purchase-panel button {
      width: 100%;
    }

    .product-details-document-actions {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .product-details-full-link {
      grid-column: auto;
    }

    .product-details-link-button {
      width: 100%;
    }

    .product-details-heading-badges {
      width: 100%;
    }
  }

  @media (max-width: 430px) {
    .product-details-page {
      padding: 34px 8px;
    }

    .product-details-image-panel,
    .product-details-content-panel,
    .product-details-empty {
      padding: 15px;
    }

    .product-details-real-image,
    .product-details-real-image img,
    .product-details-placeholder {
      min-height: 360px;
    }

    .product-details-bottle {
      width: 175px;
      height: 250px;
    }

    .product-details-bottle-cap {
      width: 75px;
      height: 31px;
    }

    .product-details-label {
      width: 138px;
      min-height: 145px;
    }

    .product-details-label strong {
      font-size: 38px;
    }

    .product-details-label span {
      font-size: 14px;
    }

    .product-details-label small {
      font-size: 17px;
    }

    .product-details-badge-row {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr);
    }

    .product-details-badge-group {
      justify-content: flex-start;
    }

    .product-details-variant-button {
      flex: 1 1 120px;
      justify-content: center;
    }
  }
  /* 304 PRODUCT DETAIL FLOW START */

  /*
    Keep the purchase decision near the product
    description instead of below the entire COA section.
  */
  .product-details-content-panel {
    display: flex;
    flex-direction: column;
  }

  .product-details-content-panel >
  .product-details-heading-status {
    order: 1;
  }

  .product-details-content-panel >
  .product-details-title {
    order: 2;
  }

  .product-details-content-panel >
  .product-details-code {
    order: 3;
  }

  .product-details-content-panel >
  .product-details-variant-panel {
    order: 4;
  }

  .product-details-content-panel >
  .product-details-description {
    order: 5;
  }

  .product-details-content-panel >
  .product-details-research-notice {
    order: 6;
  }

  .product-details-content-panel >
  .product-details-store-notice {
    order: 7;
  }

  .product-details-content-panel >
  .product-details-purchase-panel {
    order: 8;
  }

  .product-details-content-panel >
  .product-details-agreement-button {
    order: 9;
  }

  .product-details-content-panel >
  .product-details-information-grid {
    order: 10;
  }

  .product-details-content-panel >
  .product-details-verification-panel {
    order: 11;
  }

  /*
    Give the primary purchase area slightly
    stronger emphasis.
  */
  .product-details-purchase-panel {
    border-color: rgba(61,165,255,0.46);
    background:
      radial-gradient(
        circle at top right,
        rgba(158,216,255,0.13),
        transparent 42%
      ),
      linear-gradient(
        135deg,
        rgba(61,165,255,0.17),
        rgba(61,165,255,0.08)
      );

    box-shadow:
      0 20px 48px rgba(0,0,0,0.28),
      0 0 30px rgba(61,165,255,0.08);
  }

  .product-details-purchase-panel .primary-btn {
    min-width: 190px;
  }

  /*
    Separate technical information from
    the purchase portion of the page.
  */
  .product-details-information-grid {
    padding-top: 24px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .product-details-verification-panel {
    margin-top: 18px;
  }

  @media (max-width: 650px) {
    .product-details-purchase-panel {
      gap: 16px;
      padding: 18px;
    }

    .product-details-purchase-panel > div {
      width: 100%;
      text-align: center;
    }

    .product-details-purchase-panel .primary-btn,
    .product-details-purchase-panel
    .product-details-disabled-button {
      width: 100%;
      min-width: 0;
    }
  }

  /* 304 PRODUCT DETAIL FLOW END */

`;

export default ProductDetails;
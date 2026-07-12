import { useMemo, useState } from "react";
import {
  products,
  categories,
} from "../data/products";

const readinessOptions = [
  "All",
  "Launch Ready",
  "Needs Attention",
];

const pendingStatusWords = [
  "pending",
  "needed",
  "missing",
  "not connected",
  "not available",
  "unavailable",
  "coming soon",
  "not set",
  "none",
];

function hasText(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function statusLooksReady(value) {
  if (value === true) {
    return true;
  }

  if (!hasText(value)) {
    return false;
  }

  const normalizedValue =
    value.trim().toLowerCase();

  return !pendingStatusWords.some((word) =>
    normalizedValue.includes(word)
  );
}

function getProductVariants(product) {
  if (
    Array.isArray(product.variants) &&
    product.variants.length > 0
  ) {
    return product.variants.map(
      (variant) => ({
        ...product,
        ...variant,

        name:
          variant.name ||
          product.name ||
          "",

        category:
          variant.category ||
          product.category ||
          "",

        description:
          variant.description ||
          product.description ||
          "",

        purity:
          variant.purity ||
          product.purity ||
          "",

        coaStatus:
          variant.coaStatus ||
          product.coaStatus ||
          "",

        qrStatus:
          variant.qrStatus ||
          product.qrStatus ||
          "",

        availability:
          variant.availability ??
          product.availability,

        stockStatus:
          variant.stockStatus ??
          product.stockStatus,

        available:
          variant.available ??
          product.available,

        inStock:
          variant.inStock ??
          product.inStock,

        researchNotice:
          variant.researchNotice ??
          product.researchNotice,

        researchUseOnly:
          variant.researchUseOnly ??
          product.researchUseOnly,
      })
    );
  }

  return [product];
}

function getAvailabilityAudit(variant) {
  if (variant.available === false) {
    return {
      ready: false,
      value: "Unavailable",
    };
  }

  if (variant.inStock === false) {
    return {
      ready: false,
      value: "Out Of Stock",
    };
  }

  if (variant.available === true) {
    return {
      ready: true,
      value: "Available",
    };
  }

  if (variant.inStock === true) {
    return {
      ready: true,
      value: "In Stock",
    };
  }

  const rawStatus =
    variant.availability ??
    variant.stockStatus;

  if (!hasText(rawStatus)) {
    return {
      ready: false,
      value: "Not Set",
    };
  }

  const normalizedStatus =
    rawStatus.trim().toLowerCase();

  const unavailableWords = [
    "unavailable",
    "out of stock",
    "sold out",
    "disabled",
    "hidden",
    "coming soon",
    "not set",
  ];

  const unavailable =
    unavailableWords.some((word) =>
      normalizedStatus.includes(word)
    );

  return {
    ready: !unavailable,
    value: rawStatus,
  };
}

function getResearchNoticeAudit(variant) {
  if (variant.researchUseOnly === false) {
    return {
      ready: false,
      value: "Disabled",
    };
  }

  if (
    variant.researchUseOnly === true
  ) {
    return {
      ready: true,
      value: "Confirmed",
    };
  }

  if (hasText(variant.researchNotice)) {
    return {
      ready: true,
      value: "Product Notice",
    };
  }

  return {
    ready: true,
    value: "Global Site Notice",
  };
}

function getVariantAudit(variant) {
  const availability =
    getAvailabilityAudit(variant);

  const researchNotice =
    getResearchNoticeAudit(variant);

  const checks = [
    {
      key: "name",
      label: "Product Name",
      ready: hasText(variant.name),
      value:
        variant.name || "Missing",
    },
    {
      key: "category",
      label: "Category",
      ready: hasText(variant.category),
      value:
        variant.category || "Missing",
    },
    {
      key: "code",
      label: "Product Code",
      ready: hasText(variant.codeName),
      value:
        variant.codeName || "Missing",
    },
    {
      key: "strength",
      label: "Strength",
      ready: hasText(variant.strength),
      value:
        variant.strength || "Missing",
    },
    {
      key: "price",
      label: "Price",
      ready:
        Number.isFinite(variant.price) &&
        variant.price > 0,
      value:
        Number.isFinite(variant.price) &&
        variant.price > 0
          ? `$${variant.price.toFixed(2)}`
          : "Missing",
    },
    {
      key: "image",
      label: "Image",
      ready: Boolean(variant.image),
      value: variant.image
        ? "Connected"
        : "Needed",
    },
    {
      key: "description",
      label: "Description",
      ready: hasText(
        variant.description
      ),
      value: hasText(
        variant.description
      )
        ? "Added"
        : "Missing",
    },
    {
      key: "coa",
      label: "COA",
      ready: statusLooksReady(
        variant.coaStatus
      ),
      value:
        variant.coaStatus ||
        "Not Set",
    },
    {
      key: "qr",
      label: "QR",
      ready: statusLooksReady(
        variant.qrStatus
      ),
      value:
        variant.qrStatus ||
        "Not Set",
    },
    {
      key: "availability",
      label: "Availability",
      ready: availability.ready,
      value: availability.value,
    },
    {
      key: "research",
      label: "Research Notice",
      ready: researchNotice.ready,
      value: researchNotice.value,
    },
  ];

  const issues = checks.filter(
    (check) => !check.ready
  );

  return {
    variant,
    checks,
    issues,
    ready: issues.length === 0,
  };
}

function getProductAudit(product) {
  const variants =
    getProductVariants(product).map(
      (variant) =>
        getVariantAudit(variant)
    );

  const readyVariants =
    variants.filter(
      (variantAudit) =>
        variantAudit.ready
    ).length;

  const issueLabels = Array.from(
    new Set(
      variants.flatMap(
        (variantAudit) =>
          variantAudit.issues.map(
            (issue) => issue.label
          )
      )
    )
  );

  return {
    product,
    variants,
    readyVariants,
    issueLabels,

    ready:
      variants.length > 0 &&
      readyVariants === variants.length,
  };
}

function ProductManager({
  onNavigate,
}) {
  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    activeCategory,
    setActiveCategory,
  ] = useState("All Products");

  const [
    readinessFilter,
    setReadinessFilter,
  ] = useState("All");

  const categoryOptions = useMemo(
    () => {
      const cleanedCategories =
        categories.filter(
          (category) =>
            category !==
              "All Products" &&
            category !==
              "Best Sellers"
        );

      return [
        "All Products",
        "Best Sellers",
        ...cleanedCategories,
      ];
    },
    []
  );

  const productAudits = useMemo(
    () =>
      products.map((product) =>
        getProductAudit(product)
      ),
    []
  );

  const catalogStats = useMemo(() => {
    const variantAudits =
      productAudits.flatMap(
        (productAudit) =>
          productAudit.variants
      );

    const launchReadyVariants =
      variantAudits.filter(
        (variantAudit) =>
          variantAudit.ready
      );

    const imageReadyVariants =
      variantAudits.filter(
        (variantAudit) =>
          variantAudit.checks.find(
            (check) =>
              check.key === "image"
          )?.ready
      );

    const pricedVariants =
      variantAudits.filter(
        (variantAudit) =>
          variantAudit.checks.find(
            (check) =>
              check.key === "price"
          )?.ready
      );

    const documentationReady =
      variantAudits.filter(
        (variantAudit) => {
          const coaReady =
            variantAudit.checks.find(
              (check) =>
                check.key === "coa"
            )?.ready;

          const qrReady =
            variantAudit.checks.find(
              (check) =>
                check.key === "qr"
            )?.ready;

          return coaReady && qrReady;
        }
      );

    return {
      productCount:
        productAudits.length,

      variantCount:
        variantAudits.length,

      readyCount:
        launchReadyVariants.length,

      attentionCount:
        variantAudits.length -
        launchReadyVariants.length,

      imageCount:
        imageReadyVariants.length,

      pricedCount:
        pricedVariants.length,

      documentationCount:
        documentationReady.length,
    };
  }, [productAudits]);

  const filteredAudits = useMemo(
    () => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return productAudits.filter(
        (productAudit) => {
          const { product } =
            productAudit;

          const matchesCategory =
            activeCategory ===
              "All Products" ||
            (activeCategory ===
              "Best Sellers"
              ? Boolean(
                  product.isBestSeller
                )
              : product.category ===
                activeCategory);

          const matchesReadiness =
            readinessFilter === "All" ||
            (readinessFilter ===
              "Launch Ready"
              ? productAudit.ready
              : !productAudit.ready);

          const variantSearchText =
            productAudit.variants
              .map(
                ({ variant, issues }) =>
                  [
                    variant.name,
                    variant.codeName,
                    variant.strength,
                    variant.category,
                    variant.composition,
                    variant.coaStatus,
                    variant.qrStatus,

                    ...issues.map(
                      (issue) =>
                        issue.label
                    ),
                  ]
                    .filter(Boolean)
                    .join(" ")
              )
              .join(" ");

          const searchableText = [
            product.name,
            product.codeName,
            product.category,
            product.strength,
            product.description,
            variantSearchText,
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
            matchesReadiness &&
            matchesSearch
          );
        }
      );
    },
    [
      activeCategory,
      productAudits,
      readinessFilter,
      searchTerm,
    ]
  );

  function resetFilters() {
    setSearchTerm("");
    setActiveCategory(
      "All Products"
    );
    setReadinessFilter("All");
  }

  async function copyAuditSummary(
    productAudit
  ) {
    const lines = [
      `${productAudit.product.name} Catalog Audit`,
      `Overall: ${
        productAudit.ready
          ? "Launch Ready"
          : "Needs Attention"
      }`,
      "",
    ];

    productAudit.variants.forEach(
      (
        variantAudit,
        index
      ) => {
        const {
          variant,
          issues,
        } = variantAudit;

        lines.push(
          `${index + 1}. ${
            variant.codeName ||
            variant.name ||
            "Unnamed Product"
          } - ${
            variant.strength ||
            "No Strength"
          }`
        );

        if (issues.length === 0) {
          lines.push(
            "   Launch Ready"
          );
        } else {
          lines.push(
            `   Missing: ${issues
              .map(
                (issue) =>
                  issue.label
              )
              .join(", ")}`
          );
        }
      }
    );

    const auditText =
      lines.join("\n");

    try {
      if (
        navigator.clipboard &&
        navigator.clipboard
          .writeText
      ) {
        await navigator.clipboard.writeText(
          auditText
        );

        window.alert(
          "Product audit copied."
        );

        return;
      }

      throw new Error(
        "Clipboard unavailable."
      );
    } catch {
      window.alert(auditText);
    }
  }

  return (
    <>
      <style>{managerCss}</style>

      <main className="product-manager-page">
        <section className="product-manager-inner">
          <div className="product-manager-hero">
            <div>
              <p className="eyebrow">
                MISSION CONTROL
              </p>

              <h1 className="product-manager-title">
                Product Manager
              </h1>

              <p className="product-manager-subtitle">
                Audit every product and
                strength variant for
                pricing, images,
                documentation,
                availability, codes, and
                launch readiness.
              </p>
            </div>

            <div className="product-manager-hero-buttons">
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "missionControl"
                  )
                }
              >
                Back To Mission Control
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  onNavigate("products")
                }
              >
                View Storefront
              </button>
            </div>
          </div>

          <div className="product-manager-stats">
            <StatCard
              label="Products"
              value={
                catalogStats.productCount
              }
              detail="Grouped catalog entries"
            />

            <StatCard
              label="Strength Variants"
              value={
                catalogStats.variantCount
              }
              detail="Individual catalog options"
            />

            <StatCard
              label="Launch Ready"
              value={
                catalogStats.readyCount
              }
              detail={`Of ${catalogStats.variantCount} variants`}
              positive
            />

            <StatCard
              label="Needs Attention"
              value={
                catalogStats.attentionCount
              }
              detail={`Of ${catalogStats.variantCount} variants`}
              warning={
                catalogStats.attentionCount >
                0
              }
            />

            <StatCard
              label="Images Connected"
              value={
                catalogStats.imageCount
              }
              detail={`Of ${catalogStats.variantCount} variants`}
            />

            <StatCard
              label="Prices Added"
              value={
                catalogStats.pricedCount
              }
              detail={`Of ${catalogStats.variantCount} variants`}
            />

            <StatCard
              label="Documentation Ready"
              value={
                catalogStats.documentationCount
              }
              detail="COA and QR both ready"
            />
          </div>

          <div className="product-manager-filters">
            <div>
              <p className="eyebrow">
                CATALOG FILTERS
              </p>

              <h2 className="product-manager-section-title">
                Find A Product
              </h2>
            </div>

            <input
              type="search"
              placeholder="Search by product, code, category, strength, or missing item..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              className="product-manager-search"
            />

            <div className="product-manager-filter-group">
              <span className="product-manager-filter-label">
                Category
              </span>

              <div className="product-manager-filter-row">
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
            </div>

            <div className="product-manager-filter-group">
              <span className="product-manager-filter-label">
                Readiness
              </span>

              <div className="product-manager-filter-row">
                {readinessOptions.map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      className={
                        readinessFilter ===
                        option
                          ? "primary-btn"
                          : "secondary-btn"
                      }
                      onClick={() =>
                        setReadinessFilter(
                          option
                        )
                      }
                    >
                      {option}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="product-manager-results-bar">
              <span>
                Showing{" "}
                <strong>
                  {
                    filteredAudits.length
                  }
                </strong>{" "}
                product
                {filteredAudits.length ===
                1
                  ? ""
                  : "s"}
              </span>

              <span>
                Category:{" "}
                <strong>
                  {activeCategory}
                </strong>
              </span>

              <span>
                Readiness:{" "}
                <strong>
                  {readinessFilter}
                </strong>
              </span>
            </div>
          </div>

          {filteredAudits.length ===
          0 ? (
            <div className="product-manager-empty">
              <p className="eyebrow">
                NO RESULTS
              </p>

              <h2 className="product-manager-section-title">
                No Products Found
              </h2>

              <p>
                Change the search term
                or select another
                category or readiness
                filter.
              </p>

              <button
                type="button"
                className="primary-btn"
                onClick={resetFilters}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="product-manager-list">
              {filteredAudits.map(
                (productAudit) => {
                  const {
                    product,
                    variants,
                    readyVariants,
                    issueLabels,
                  } = productAudit;

                  const previewImage =
                    product.image ||
                    variants.find(
                      ({ variant }) =>
                        variant.image
                    )?.variant.image;

                  return (
                    <article
                      key={
                        product.codeName ||
                        product.name
                      }
                      className="product-manager-product"
                    >
                      <div className="product-manager-product-header">
                        <div className="product-manager-product-identity">
                          <div className="product-manager-preview">
                            {previewImage ? (
                              <img
                                src={
                                  previewImage
                                }
                                alt={`${product.name} catalog preview`}
                              />
                            ) : (
                              <div className="product-manager-placeholder">
                                <strong>
                                  304
                                </strong>

                                <span>
                                  {product.codeName ||
                                    "NO CODE"}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="product-manager-product-copy">
                            <div className="product-manager-badges">
                              <span className="product-manager-category-badge">
                                {product.category ||
                                  "No Category"}
                              </span>

                              {product.isBestSeller && (
                                <span className="product-manager-best-seller">
                                  Best Seller
                                </span>
                              )}

                              <span
                                className={
                                  productAudit.ready
                                    ? "product-manager-ready-badge"
                                    : "product-manager-warning-badge"
                                }
                              >
                                {productAudit.ready
                                  ? "Launch Ready"
                                  : "Needs Attention"}
                              </span>
                            </div>

                            <h2 className="product-manager-product-title">
                              {product.name ||
                                "Unnamed Product"}
                            </h2>

                            <p className="product-manager-product-code">
                              {product.codeName ||
                                "No Code"}{" "}
                              ·{" "}
                              {
                                variants.length
                              }{" "}
                              Variant
                              {variants.length ===
                              1
                                ? ""
                                : "s"}
                            </p>
                          </div>
                        </div>

                        <div className="product-manager-readiness-grid">
                          <ReadinessBox
                            label="Ready Variants"
                            value={`${readyVariants}/${variants.length}`}
                            complete={
                              readyVariants ===
                              variants.length
                            }
                          />

                          <ReadinessBox
                            label="Images"
                            value={`${
                              variants.filter(
                                (
                                  variantAudit
                                ) =>
                                  variantAudit.checks.find(
                                    (
                                      check
                                    ) =>
                                      check.key ===
                                      "image"
                                  )?.ready
                              ).length
                            }/${variants.length}`}
                            complete={variants.every(
                              (
                                variantAudit
                              ) =>
                                variantAudit.checks.find(
                                  (
                                    check
                                  ) =>
                                    check.key ===
                                    "image"
                                )?.ready
                            )}
                          />

                          <ReadinessBox
                            label="Prices"
                            value={`${
                              variants.filter(
                                (
                                  variantAudit
                                ) =>
                                  variantAudit.checks.find(
                                    (
                                      check
                                    ) =>
                                      check.key ===
                                      "price"
                                  )?.ready
                              ).length
                            }/${variants.length}`}
                            complete={variants.every(
                              (
                                variantAudit
                              ) =>
                                variantAudit.checks.find(
                                  (
                                    check
                                  ) =>
                                    check.key ===
                                    "price"
                                )?.ready
                            )}
                          />

                          <ReadinessBox
                            label="Documentation"
                            value={`${
                              variants.filter(
                                (
                                  variantAudit
                                ) => {
                                  const coa =
                                    variantAudit.checks.find(
                                      (
                                        check
                                      ) =>
                                        check.key ===
                                        "coa"
                                    )?.ready;

                                  const qr =
                                    variantAudit.checks.find(
                                      (
                                        check
                                      ) =>
                                        check.key ===
                                        "qr"
                                    )?.ready;

                                  return (
                                    coa && qr
                                  );
                                }
                              ).length
                            }/${variants.length}`}
                            complete={variants.every(
                              (
                                variantAudit
                              ) => {
                                const coa =
                                  variantAudit.checks.find(
                                    (
                                      check
                                    ) =>
                                      check.key ===
                                      "coa"
                                  )?.ready;

                                const qr =
                                  variantAudit.checks.find(
                                    (
                                      check
                                    ) =>
                                      check.key ===
                                      "qr"
                                  )?.ready;

                                return coa && qr;
                              }
                            )}
                          />
                        </div>
                      </div>

                      {product.description && (
                        <p className="product-manager-description">
                          {
                            product.description
                          }
                        </p>
                      )}

                      {!productAudit.ready && (
                        <div className="product-manager-issue-summary">
                          <strong>
                            Items needing
                            attention
                          </strong>

                          <div className="product-manager-issue-tags">
                            {issueLabels.map(
                              (issue) => (
                                <span
                                  key={
                                    issue
                                  }
                                >
                                  {issue}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      <div className="product-manager-variant-heading">
                        <div>
                          <p className="eyebrow">
                            STRENGTH OPTIONS
                          </p>

                          <h3>
                            {
                              variants.length
                            }{" "}
                            Variant
                            {variants.length ===
                            1
                              ? ""
                              : "s"}
                          </h3>
                        </div>
                      </div>

                      <div className="product-manager-variant-grid">
                        {variants.map(
                          (
                            variantAudit,
                            index
                          ) => {
                            const {
                              variant,
                              checks,
                              issues,
                            } =
                              variantAudit;

                            const variantKey = `${
                              variant.codeName ||
                              product.codeName ||
                              product.name
                            }-${
                              variant.strength ||
                              index
                            }-${index}`;

                            return (
                              <div
                                key={
                                  variantKey
                                }
                                className="product-manager-variant"
                              >
                                <div className="product-manager-variant-top">
                                  <div>
                                    <strong className="product-manager-variant-strength">
                                      {variant.strength ||
                                        "No Strength"}
                                    </strong>

                                    <span className="product-manager-variant-code">
                                      {variant.codeName ||
                                        "No Code"}
                                    </span>
                                  </div>

                                  <span
                                    className={
                                      variantAudit.ready
                                        ? "product-manager-ready-badge"
                                        : "product-manager-warning-badge"
                                    }
                                  >
                                    {variantAudit.ready
                                      ? "Ready"
                                      : `${issues.length} Issue${
                                          issues.length ===
                                          1
                                            ? ""
                                            : "s"
                                        }`}
                                  </span>
                                </div>

                                {variant.image ? (
                                  <div className="product-manager-variant-image">
                                    <img
                                      src={
                                        variant.image
                                      }
                                      alt={`${variant.name} ${variant.strength}`}
                                    />
                                  </div>
                                ) : (
                                  <div className="product-manager-missing-image">
                                    Product image
                                    needed
                                  </div>
                                )}

                                <div className="product-manager-check-grid">
                                  {checks.map(
                                    (
                                      check
                                    ) => (
                                      <AuditField
                                        key={
                                          check.key
                                        }
                                        check={
                                          check
                                        }
                                      />
                                    )
                                  )}
                                </div>

                                {variant.composition && (
                                  <div className="product-manager-composition">
                                    <span>
                                      Composition
                                    </span>

                                    <strong>
                                      {
                                        variant.composition
                                      }
                                    </strong>
                                  </div>
                                )}

                                {issues.length >
                                  0 && (
                                  <div className="product-manager-variant-issues">
                                    <strong>
                                      Fix Before
                                      Launch
                                    </strong>

                                    <ul>
                                      {issues.map(
                                        (
                                          issue
                                        ) => (
                                          <li
                                            key={
                                              issue.key
                                            }
                                          >
                                            {
                                              issue.label
                                            }
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>

                      <div className="product-manager-actions">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            onNavigate(
                              "products"
                            )
                          }
                        >
                          View On Storefront
                        </button>

                        <button
                          type="button"
                          className="secondary-btn"
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
                            copyAuditSummary(
                              productAudit
                            )
                          }
                        >
                          Copy Audit Summary
                        </button>

                        <button
                          type="button"
                          className="product-manager-disabled-button"
                          onClick={() =>
                            window.alert(
                              "Product information is currently edited inside src/data/products.js. Live editing will be added when the database backend is connected."
                            )
                          }
                        >
                          Editing Instructions
                        </button>
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

function StatCard({
  label,
  value,
  detail,
  positive = false,
  warning = false,
}) {
  return (
    <div className="product-manager-stat">
      <span>{label}</span>

      <strong
        className={
          positive
            ? "product-manager-stat-positive"
            : warning
            ? "product-manager-stat-warning"
            : ""
        }
      >
        {value}
      </strong>

      <small>{detail}</small>
    </div>
  );
}

function ReadinessBox({
  label,
  value,
  complete,
}) {
  return (
    <div className="product-manager-readiness-box">
      <span>{label}</span>

      <strong
        className={
          complete
            ? "product-manager-ready-text"
            : "product-manager-warning-text"
        }
      >
        {value}
      </strong>
    </div>
  );
}

function AuditField({ check }) {
  return (
    <div
      className={
        check.ready
          ? "product-manager-audit-field product-manager-audit-field-ready"
          : "product-manager-audit-field product-manager-audit-field-warning"
      }
    >
      <span>{check.label}</span>

      <strong>{check.value}</strong>
    </div>
  );
}

const managerCss = `
  .product-manager-page,
  .product-manager-page *,
  .product-manager-page *::before,
  .product-manager-page *::after {
    box-sizing: border-box;
  }

  .product-manager-page {
    width: 100%;
    max-width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .product-manager-inner {
    width: 100%;
    max-width: 1300px;
    margin: 0 auto;
  }

  .product-manager-hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 28px;
    flex-wrap: wrap;
    padding: 48px;
    margin-bottom: 24px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 34px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.2),
        transparent 40%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 90px rgba(0,0,0,0.5);
  }

  .product-manager-title {
    margin-bottom: 18px;
    font-size: clamp(42px, 6vw, 62px);
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

  .product-manager-subtitle {
    max-width: 760px;
    color: #c8c8c8;
    font-size: 18px;
    line-height: 1.8;
  }

  .product-manager-hero-buttons,
  .product-manager-filter-row,
  .product-manager-actions,
  .product-manager-badges,
  .product-manager-issue-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .product-manager-stats {
    display: grid;
    grid-template-columns:
      repeat(auto-fit, minmax(180px, 1fr));
    gap: 18px;
    margin-bottom: 24px;
  }

  .product-manager-stat {
    min-width: 0;
    display: grid;
    gap: 8px;
    padding: 24px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 24px;
    background: rgba(255,255,255,0.035);
    box-shadow:
      0 24px 65px rgba(0,0,0,0.32);
  }

  .product-manager-stat > span,
  .product-manager-filter-label {
    color: #9ed8ff;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .product-manager-stat > strong {
    color: #ffffff;
    font-size: 38px;
  }

  .product-manager-stat > small {
    color: #8f9ba7;
    line-height: 1.5;
  }

  .product-manager-stat-positive {
    color: #9ed8ff !important;
  }

  .product-manager-stat-warning {
    color: #ffd1d1 !important;
  }

  .product-manager-filters {
    padding: 30px;
    margin-bottom: 24px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background: rgba(255,255,255,0.035);
  }

  .product-manager-section-title {
    margin-bottom: 20px;
    color: #ffffff;
    font-size: clamp(30px, 5vw, 36px);
  }

  .product-manager-search {
    width: 100%;
    padding: 17px;
    margin-bottom: 22px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    outline: none;
    background: rgba(255,255,255,0.05);
    color: #ffffff;
    font-size: 16px;
  }

  .product-manager-filter-group {
    display: grid;
    gap: 10px;
    margin-top: 18px;
  }

  .product-manager-results-bar {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 22px;
    padding: 15px;
    border-radius: 16px;
    background: rgba(0,0,0,0.24);
    color: #c8c8c8;
  }

  .product-manager-list {
    display: grid;
    gap: 22px;
  }

  .product-manager-product {
    min-width: 0;
    padding: 28px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.1),
        transparent 34%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 28px 75px rgba(0,0,0,0.38);
  }

  .product-manager-product-header {
    min-width: 0;
    display: flex;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }

  .product-manager-product-identity {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 20px;
    flex: 1 1 480px;
  }

  .product-manager-product-copy {
    min-width: 0;
  }

  .product-manager-preview {
    width: 115px;
    min-width: 115px;
    height: 115px;
    overflow: hidden;
    border: 1px solid rgba(61,165,255,0.2);
    border-radius: 20px;
    background:
      radial-gradient(
        circle,
        rgba(61,165,255,0.18),
        rgba(0,0,0,0.7)
      );
  }

  .product-manager-preview img,
  .product-manager-variant-image img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .product-manager-placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 5px;
    color: #ffffff;
    text-align: center;
  }

  .product-manager-category-badge,
  .product-manager-best-seller,
  .product-manager-ready-badge,
  .product-manager-warning-badge {
    display: inline-flex;
    width: fit-content;
    padding: 7px 11px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .product-manager-category-badge {
    border: 1px solid rgba(61,165,255,0.28);
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
  }

  .product-manager-best-seller {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.07);
    color: #ffffff;
  }

  .product-manager-ready-badge {
    border: 1px solid rgba(61,165,255,0.42);
    background: rgba(61,165,255,0.16);
    color: #9ed8ff;
  }

  .product-manager-warning-badge {
    border: 1px solid rgba(255,130,130,0.35);
    background: rgba(255,90,90,0.1);
    color: #ffd1d1;
  }

  .product-manager-product-title {
    margin: 10px 0 7px;
    color: #ffffff;
    font-size: clamp(27px, 4vw, 32px);
    overflow-wrap: anywhere;
  }

  .product-manager-product-code,
  .product-manager-variant-code {
    display: block;
    color: #9ed8ff;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .product-manager-readiness-grid {
    min-width: min(100%, 360px);
    display: grid;
    grid-template-columns:
      repeat(2, minmax(120px, 1fr));
    gap: 10px;
    flex: 0 1 380px;
  }

  .product-manager-readiness-box {
    min-width: 0;
    display: grid;
    gap: 5px;
    padding: 13px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 15px;
    background: rgba(0,0,0,0.24);
    color: #9ca8b3;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .product-manager-ready-text {
    color: #9ed8ff;
  }

  .product-manager-warning-text {
    color: #ffd1d1;
  }

  .product-manager-description {
    margin-top: 22px;
    color: #c8c8c8;
    line-height: 1.75;
  }

  .product-manager-issue-summary {
    display: grid;
    gap: 12px;
    margin-top: 20px;
    padding: 18px;
    border: 1px solid rgba(255,130,130,0.25);
    border-radius: 18px;
    background: rgba(255,90,90,0.08);
    color: #ffd1d1;
  }

  .product-manager-issue-tags span {
    padding: 6px 9px;
    border: 1px solid rgba(255,150,150,0.2);
    border-radius: 999px;
    background: rgba(0,0,0,0.2);
    font-size: 11px;
    font-weight: 800;
  }

  .product-manager-variant-heading {
    margin: 24px 0 14px;
  }

  .product-manager-variant-heading h3 {
    color: #ffffff;
    font-size: 24px;
  }

  .product-manager-variant-grid {
    display: grid;
    grid-template-columns:
      repeat(auto-fit, minmax(290px, 1fr));
    gap: 14px;
  }

  .product-manager-variant {
    min-width: 0;
    padding: 17px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 18px;
    background: rgba(0,0,0,0.23);
  }

  .product-manager-variant-top {
    min-width: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }

  .product-manager-variant-strength {
    display: block;
    margin-bottom: 5px;
    color: #ffffff;
    font-size: 21px;
    overflow-wrap: anywhere;
  }

  .product-manager-variant-image {
    width: 100%;
    height: 150px;
    margin-bottom: 14px;
    overflow: hidden;
    border: 1px solid rgba(61,165,255,0.2);
    border-radius: 15px;
    background: rgba(255,255,255,0.04);
  }

  .product-manager-missing-image {
    width: 100%;
    min-height: 90px;
    display: grid;
    place-items: center;
    margin-bottom: 14px;
    padding: 16px;
    border: 1px dashed rgba(255,255,255,0.16);
    border-radius: 15px;
    background: rgba(255,255,255,0.025);
    color: #9ca8b3;
    text-align: center;
    font-weight: 800;
  }

  .product-manager-check-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .product-manager-audit-field {
    min-width: 0;
    display: grid;
    gap: 5px;
    padding: 11px;
    border-radius: 13px;
    overflow-wrap: anywhere;
  }

  .product-manager-audit-field span {
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .product-manager-audit-field strong {
    font-size: 12px;
  }

  .product-manager-audit-field-ready {
    border: 1px solid rgba(61,165,255,0.18);
    background: rgba(61,165,255,0.07);
    color: #bfe7ff;
  }

  .product-manager-audit-field-warning {
    border: 1px solid rgba(255,130,130,0.2);
    background: rgba(255,90,90,0.07);
    color: #ffd1d1;
  }

  .product-manager-composition {
    display: grid;
    gap: 5px;
    margin-top: 13px;
    padding-top: 13px;
    border-top: 1px solid rgba(255,255,255,0.08);
    color: #c8c8c8;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .product-manager-variant-issues {
    margin-top: 14px;
    padding: 14px;
    border: 1px solid rgba(255,130,130,0.2);
    border-radius: 14px;
    background: rgba(255,90,90,0.07);
    color: #ffd1d1;
  }

  .product-manager-variant-issues ul {
    margin: 8px 0 0;
    padding-left: 20px;
    line-height: 1.7;
  }

  .product-manager-actions {
    margin-top: 22px;
  }

  .product-manager-disabled-button {
    padding: 13px 18px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    background: rgba(255,255,255,0.04);
    color: #9ca8b3;
    font-weight: 900;
    cursor: pointer;
  }

  .product-manager-empty {
    display: grid;
    justify-items: center;
    gap: 18px;
    padding: 50px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background: rgba(255,255,255,0.035);
    color: #c8c8c8;
    text-align: center;
  }

  @media (max-width: 900px) {
    .product-manager-page {
      padding: 65px 24px;
    }

    .product-manager-product-identity {
      align-items: flex-start;
    }

    .product-manager-readiness-grid {
      width: 100%;
      flex-basis: 100%;
    }
  }

  @media (max-width: 650px) {
    .product-manager-page {
      padding: 44px 12px;
    }

    .product-manager-hero {
      padding: 30px 20px;
      border-radius: 24px;
    }

    .product-manager-hero-buttons,
    .product-manager-hero-buttons button,
    .product-manager-actions,
    .product-manager-actions button {
      width: 100%;
    }

    .product-manager-filters,
    .product-manager-product {
      padding: 18px;
      border-radius: 21px;
    }

    .product-manager-product-identity {
      display: grid;
      grid-template-columns: 1fr;
    }

    .product-manager-preview {
      width: 100%;
      height: 180px;
    }

    .product-manager-readiness-grid {
      grid-template-columns: 1fr 1fr;
    }

    .product-manager-variant-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .product-manager-filter-row button {
      flex: 1 1 140px;
    }
  }

  @media (max-width: 420px) {
    .product-manager-page {
      padding: 34px 8px;
    }

    .product-manager-hero,
    .product-manager-filters,
    .product-manager-product {
      padding: 15px;
    }

    .product-manager-readiness-grid,
    .product-manager-check-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .product-manager-stat {
      padding: 18px;
    }
  }
`;

export default ProductManager;
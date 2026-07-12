import {
  useMemo,
  useState,
} from "react";

import {
  products,
  categories,
} from "../data/products";

const recordsStorageKey =
  "304-document-records";

const statusOptions = [
  "All Statuses",
  "Documentation Ready",
  "Needs Attention",
  "COA Ready",
  "COA Pending",
  "Batch Ready",
  "Batch Pending",
  "Verification Ready",
  "Verification Pending",
];

const emptyRecord = {
  batchNumber: "",
  labName: "",
  testDate: "",
  coaUrl: "",
  verificationUrl: "",
  notes: "",
  reviewed: false,
  updatedAt: "",
};

function hasText(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isValidHttpUrl(value) {
  if (!hasText(value)) {
    return false;
  }

  try {
    const url = new URL(value.trim());

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function loadRecords() {
  try {
    const savedRecords =
      window.localStorage.getItem(
        recordsStorageKey
      );

    if (!savedRecords) {
      return {};
    }

    const parsedRecords =
      JSON.parse(savedRecords);

    return parsedRecords &&
      typeof parsedRecords === "object"
      ? parsedRecords
      : {};
  } catch {
    return {};
  }
}

function saveRecords(records) {
  window.localStorage.setItem(
    recordsStorageKey,
    JSON.stringify(records)
  );

  window.dispatchEvent(
    new CustomEvent(
      "304-document-records-updated",
      {
        detail: records,
      }
    )
  );
}

function getAllVariants() {
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

          purity:
            product.purity,

          isBestSeller:
            product.isBestSeller,

          description:
            variant.description ||
            product.description,

          researchUseOnly:
            variant.researchUseOnly ??
            product.researchUseOnly,

          researchNotice:
            variant.researchNotice ||
            product.researchNotice,
        })
      );
    }
  );
}

function getRecordAudit(
  variant,
  record
) {
  const coaReady =
    isValidHttpUrl(
      record.coaUrl
    );

  const batchReady =
    hasText(record.batchNumber) &&
    hasText(record.labName) &&
    hasText(record.testDate);

  const verificationReady =
    isValidHttpUrl(
      record.verificationUrl
    );

  const imageReady =
    Boolean(variant.image);

  const reviewed =
    Boolean(record.reviewed);

  const issues = [];

  if (!coaReady) {
    issues.push(
      "Valid COA link"
    );
  }

  if (!hasText(record.batchNumber)) {
    issues.push(
      "Batch number"
    );
  }

  if (!hasText(record.labName)) {
    issues.push(
      "Testing laboratory"
    );
  }

  if (!hasText(record.testDate)) {
    issues.push(
      "Test date"
    );
  }

  if (!verificationReady) {
    issues.push(
      "Verification link"
    );
  }

  if (!imageReady) {
    issues.push(
      "Product image"
    );
  }

  if (!reviewed) {
    issues.push(
      "Manual review"
    );
  }

  return {
    coaReady,
    batchReady,
    verificationReady,
    imageReady,
    reviewed,
    issues,

    ready:
      coaReady &&
      batchReady &&
      verificationReady &&
      imageReady &&
      reviewed,
  };
}

function formatUpdatedAt(value) {
  if (!hasText(value)) {
    return "Never updated";
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

  return parsedDate.toLocaleString();
}

function COAManager({
  onNavigate,
}) {
  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    activeCategory,
    setActiveCategory,
  ] = useState("All Products");

  const [
    activeStatus,
    setActiveStatus,
  ] = useState("All Statuses");

  const [records, setRecords] =
    useState(loadRecords);

  const [
    editingCode,
    setEditingCode,
  ] = useState("");

  const [draft, setDraft] =
    useState(emptyRecord);

  const allVariants = useMemo(
    () => getAllVariants(),
    []
  );

  const categoryOptions =
    useMemo(() => {
      const uniqueCategories =
        categories.filter(
          (
            category,
            index,
            categoryList
          ) =>
            categoryList.indexOf(
              category
            ) === index
        );

      return uniqueCategories;
    }, []);

  const auditedVariants =
    useMemo(
      () =>
        allVariants.map(
          (variant) => {
            const record = {
              ...emptyRecord,
              ...(records[
                variant.codeName
              ] || {}),
            };

            return {
              ...variant,
              record,
              audit:
                getRecordAudit(
                  variant,
                  record
                ),
            };
          }
        ),
      [allVariants, records]
    );

  const stats = useMemo(() => {
    const documentationReady =
      auditedVariants.filter(
        (variant) =>
          variant.audit.ready
      ).length;

    const coaReady =
      auditedVariants.filter(
        (variant) =>
          variant.audit.coaReady
      ).length;

    const batchReady =
      auditedVariants.filter(
        (variant) =>
          variant.audit.batchReady
      ).length;

    const verificationReady =
      auditedVariants.filter(
        (variant) =>
          variant.audit
            .verificationReady
      ).length;

    const reviewed =
      auditedVariants.filter(
        (variant) =>
          variant.audit.reviewed
      ).length;

    return {
      total:
        auditedVariants.length,

      documentationReady,

      pending:
        auditedVariants.length -
        documentationReady,

      coaReady,
      batchReady,
      verificationReady,
      reviewed,
    };
  }, [auditedVariants]);

  const filteredVariants =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return auditedVariants.filter(
        (variant) => {
          const matchesCategory =
            activeCategory ===
              "All Products" ||
            variant.category ===
              activeCategory ||
            (activeCategory ===
              "Best Sellers" &&
              variant.isBestSeller);

          const {
            audit,
            record,
          } = variant;

          const matchesStatus =
            activeStatus ===
              "All Statuses" ||
            (activeStatus ===
              "Documentation Ready" &&
              audit.ready) ||
            (activeStatus ===
              "Needs Attention" &&
              !audit.ready) ||
            (activeStatus ===
              "COA Ready" &&
              audit.coaReady) ||
            (activeStatus ===
              "COA Pending" &&
              !audit.coaReady) ||
            (activeStatus ===
              "Batch Ready" &&
              audit.batchReady) ||
            (activeStatus ===
              "Batch Pending" &&
              !audit.batchReady) ||
            (activeStatus ===
              "Verification Ready" &&
              audit.verificationReady) ||
            (activeStatus ===
              "Verification Pending" &&
              !audit.verificationReady);

          const searchableText = [
            variant.productName,
            variant.codeName,
            variant.strength,
            variant.category,
            variant.composition,
            record.batchNumber,
            record.labName,
            record.testDate,
            record.notes,
            ...audit.issues,
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
            matchesStatus &&
            matchesSearch
          );
        }
      );
    }, [
      activeCategory,
      activeStatus,
      auditedVariants,
      searchTerm,
    ]);

  function resetFilters() {
    setSearchTerm("");
    setActiveCategory(
      "All Products"
    );
    setActiveStatus(
      "All Statuses"
    );
  }

  function beginEditing(variant) {
    setEditingCode(
      variant.codeName
    );

    setDraft({
      ...emptyRecord,
      ...variant.record,
    });
  }

  function cancelEditing() {
    setEditingCode("");
    setDraft(emptyRecord);
  }

  function handleDraftChange(
    event
  ) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setDraft(
      (currentDraft) => ({
        ...currentDraft,

        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );
  }

  function handleSaveRecord(
    variant
  ) {
    const cleanedRecord = {
      batchNumber:
        draft.batchNumber.trim(),

      labName:
        draft.labName.trim(),

      testDate:
        draft.testDate,

      coaUrl:
        draft.coaUrl.trim(),

      verificationUrl:
        draft.verificationUrl.trim(),

      notes:
        draft.notes.trim(),

      reviewed:
        Boolean(draft.reviewed),

      updatedAt:
        new Date().toISOString(),
    };

    if (
      cleanedRecord.coaUrl &&
      !isValidHttpUrl(
        cleanedRecord.coaUrl
      )
    ) {
      window.alert(
        "Enter a complete COA link beginning with http:// or https://."
      );

      return;
    }

    if (
      cleanedRecord
        .verificationUrl &&
      !isValidHttpUrl(
        cleanedRecord
          .verificationUrl
      )
    ) {
      window.alert(
        "Enter a complete verification link beginning with http:// or https://."
      );

      return;
    }

    const nextRecords = {
      ...records,

      [variant.codeName]:
        cleanedRecord,
    };

    setRecords(nextRecords);
    saveRecords(nextRecords);

    setEditingCode("");
    setDraft(emptyRecord);
  }

  function handleClearRecord(
    variant
  ) {
    const confirmed =
      window.confirm(
        `Clear the saved documentation record for ${variant.codeName}?`
      );

    if (!confirmed) {
      return;
    }

    const nextRecords = {
      ...records,
    };

    delete nextRecords[
      variant.codeName
    ];

    setRecords(nextRecords);
    saveRecords(nextRecords);

    if (
      editingCode ===
      variant.codeName
    ) {
      cancelEditing();
    }
  }

  function exportRecords() {
    const exportPayload = {
      exportedAt:
        new Date().toISOString(),

      recordCount:
        Object.keys(records).length,

      records,
    };

    const fileBlob =
      new Blob(
        [
          JSON.stringify(
            exportPayload,
            null,
            2
          ),
        ],
        {
          type:
            "application/json",
        }
      );

    const downloadUrl =
      URL.createObjectURL(
        fileBlob
      );

    const link =
      document.createElement("a");

    link.href = downloadUrl;
    link.download =
      "304-document-records.json";

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(
      downloadUrl
    );
  }

  return (
    <>
      <style>
        {coaManagerCss}
      </style>

      <main className="coa-manager-page">
        <section className="coa-manager-inner">
          <div className="coa-manager-hero">
            <div>
              <p className="eyebrow">
                MISSION CONTROL
              </p>

              <h1 className="coa-manager-title">
                COA Manager
              </h1>

              <p className="coa-manager-subtitle">
                Track genuine
                certificates of
                analysis, batch
                information, testing
                laboratories, review
                status, and
                verification links for
                every product strength.
              </p>
            </div>

            <div className="coa-manager-hero-buttons">
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
                className="secondary-btn"
                onClick={() =>
                  onNavigate(
                    "productManager"
                  )
                }
              >
                Product Manager
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  onNavigate("quality")
                }
              >
                View Quality Page
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={
                  exportRecords
                }
              >
                Export Records
              </button>
            </div>
          </div>

          <div className="coa-manager-notice">
            <strong>
              Local documentation
              tracker
            </strong>

            <p>
              Records entered here are
              saved only in this
              browser. They do not
              upload files, update the
              customer-facing Quality
              page, or synchronize
              between devices. Only
              enter links to genuine
              laboratory documents that
              match the listed product,
              strength, and batch.
            </p>
          </div>

          <div className="coa-manager-stats">
            <StatCard
              label="Total Variants"
              value={stats.total}
              detail="Individual strength records"
            />

            <StatCard
              label="Documentation Ready"
              value={
                stats.documentationReady
              }
              detail={`${stats.pending} still need attention`}
              positive={
                stats.documentationReady >
                0
              }
            />

            <StatCard
              label="COAs Connected"
              value={stats.coaReady}
              detail={`Of ${stats.total} variants`}
            />

            <StatCard
              label="Batch Records"
              value={
                stats.batchReady
              }
              detail={`Of ${stats.total} variants`}
            />

            <StatCard
              label="Verification Links"
              value={
                stats.verificationReady
              }
              detail={`Of ${stats.total} variants`}
            />

            <StatCard
              label="Manually Reviewed"
              value={stats.reviewed}
              detail={`Of ${stats.total} variants`}
            />
          </div>

          <div className="coa-manager-filters">
            <div>
              <p className="eyebrow">
                DOCUMENT FILTERS
              </p>

              <h2 className="coa-manager-section-title">
                Find A Variant
              </h2>
            </div>

            <input
              type="search"
              placeholder="Search by product, code, strength, batch, laboratory, or missing item..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              className="coa-manager-search"
            />

            <div className="coa-manager-filter-group">
              <span className="coa-manager-filter-label">
                Category
              </span>

              <div className="coa-manager-filter-row">
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

            <div className="coa-manager-filter-group">
              <span className="coa-manager-filter-label">
                Documentation Status
              </span>

              <div className="coa-manager-filter-row">
                {statusOptions.map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      className={
                        activeStatus ===
                        status
                          ? "primary-btn"
                          : "secondary-btn"
                      }
                      onClick={() =>
                        setActiveStatus(
                          status
                        )
                      }
                    >
                      {status}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="coa-manager-results">
              <span>
                Showing{" "}
                <strong>
                  {
                    filteredVariants.length
                  }
                </strong>{" "}
                variant
                {filteredVariants.length ===
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
                Status:{" "}
                <strong>
                  {activeStatus}
                </strong>
              </span>
            </div>
          </div>

          {filteredVariants.length ===
          0 ? (
            <div className="coa-manager-empty">
              <p className="eyebrow">
                NO RESULTS
              </p>

              <h2 className="coa-manager-section-title">
                No Variants Found
              </h2>

              <p>
                Change the search term,
                category, or
                documentation status.
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
            <div className="coa-manager-grid">
              {filteredVariants.map(
                (variant) => {
                  const {
                    record,
                    audit,
                  } = variant;

                  const isEditing =
                    editingCode ===
                    variant.codeName;

                  return (
                    <article
                      key={
                        variant.codeName
                      }
                      className="coa-manager-card"
                    >
                      <div className="coa-manager-card-header">
                        <div className="coa-manager-image">
                          {variant.image ? (
                            <img
                              src={
                                variant.image
                              }
                              alt={`${variant.productName} ${variant.strength}`}
                            />
                          ) : (
                            <div className="coa-manager-image-placeholder">
                              <strong>
                                304
                              </strong>

                              <span>
                                {
                                  variant.codeName
                                }
                              </span>

                              <small>
                                {
                                  variant.strength
                                }
                              </small>
                            </div>
                          )}
                        </div>

                        <div className="coa-manager-identity">
                          <div className="coa-manager-card-badges">
                            <span className="coa-manager-category-badge">
                              {
                                variant.category
                              }
                            </span>

                            <span
                              className={
                                audit.ready
                                  ? "coa-manager-ready-badge"
                                  : "coa-manager-warning-badge"
                              }
                            >
                              {audit.ready
                                ? "Documentation Ready"
                                : `${audit.issues.length} Item${
                                    audit
                                      .issues
                                      .length ===
                                    1
                                      ? ""
                                      : "s"
                                  } Needed`}
                            </span>
                          </div>

                          <h2 className="coa-manager-product-title">
                            {
                              variant.productName
                            }
                          </h2>

                          <p className="coa-manager-code">
                            {
                              variant.codeName
                            }{" "}
                            ·{" "}
                            {
                              variant.strength
                            }
                          </p>
                        </div>
                      </div>

                      {variant.composition && (
                        <div className="coa-manager-composition">
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

                      <div className="coa-manager-status-grid">
                        <StatusBox
                          label="Certificate Of Analysis"
                          value={
                            audit.coaReady
                              ? "COA Connected"
                              : "COA Needed"
                          }
                          ready={
                            audit.coaReady
                          }
                        />

                        <StatusBox
                          label="Batch Record"
                          value={
                            audit.batchReady
                              ? record.batchNumber
                              : "Batch Details Needed"
                          }
                          ready={
                            audit.batchReady
                          }
                        />

                        <StatusBox
                          label="Verification Link"
                          value={
                            audit.verificationReady
                              ? "Connected"
                              : "Link Needed"
                          }
                          ready={
                            audit.verificationReady
                          }
                        />

                        <StatusBox
                          label="Manual Review"
                          value={
                            audit.reviewed
                              ? "Reviewed"
                              : "Review Needed"
                          }
                          ready={
                            audit.reviewed
                          }
                        />

                        <StatusBox
                          label="Product Image"
                          value={
                            audit.imageReady
                              ? "Image Connected"
                              : "Image Needed"
                          }
                          ready={
                            audit.imageReady
                          }
                        />

                        <StatusBox
                          label="Testing Laboratory"
                          value={
                            record.labName ||
                            "Not Entered"
                          }
                          ready={hasText(
                            record.labName
                          )}
                        />
                      </div>

                      <div className="coa-manager-record-summary">
                        <SummaryItem
                          label="Batch Number"
                          value={
                            record.batchNumber ||
                            "Not entered"
                          }
                        />

                        <SummaryItem
                          label="Test Date"
                          value={
                            record.testDate ||
                            "Not entered"
                          }
                        />

                        <SummaryItem
                          label="Last Updated"
                          value={formatUpdatedAt(
                            record.updatedAt
                          )}
                        />
                      </div>

                      {!audit.ready && (
                        <div className="coa-manager-issues">
                          <strong>
                            Required Before
                            Publication
                          </strong>

                          <div className="coa-manager-issue-tags">
                            {audit.issues.map(
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

                      {record.notes && (
                        <div className="coa-manager-notes">
                          <span>
                            Internal Notes
                          </span>

                          <p>
                            {record.notes}
                          </p>
                        </div>
                      )}

                      <div className="coa-manager-actions">
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() =>
                            beginEditing(
                              variant
                            )
                          }
                        >
                          {isEditing
                            ? "Editing Record"
                            : "Manage Record"}
                        </button>

                        {audit.coaReady && (
                          <a
                            className="secondary-btn coa-manager-link-button"
                            href={
                              record.coaUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open COA
                          </a>
                        )}

                        {audit.verificationReady && (
                          <a
                            className="secondary-btn coa-manager-link-button"
                            href={
                              record.verificationUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open Verification
                          </a>
                        )}

                        {records[
                          variant.codeName
                        ] && (
                          <button
                            type="button"
                            className="coa-manager-danger-button"
                            onClick={() =>
                              handleClearRecord(
                                variant
                              )
                            }
                          >
                            Clear Record
                          </button>
                        )}
                      </div>

                      {isEditing && (
                        <div className="coa-manager-editor">
                          <div className="coa-manager-editor-heading">
                            <div>
                              <p className="eyebrow">
                                DOCUMENT RECORD
                              </p>

                              <h3>
                                {
                                  variant.codeName
                                }
                              </h3>
                            </div>

                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={
                                cancelEditing
                              }
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="coa-manager-form-grid">
                            <FormField
                              name="batchNumber"
                              label="Batch Number"
                              placeholder="Example: BATCH-2026-001"
                              value={
                                draft.batchNumber
                              }
                              onChange={
                                handleDraftChange
                              }
                            />

                            <FormField
                              name="labName"
                              label="Testing Laboratory"
                              placeholder="Laboratory name"
                              value={
                                draft.labName
                              }
                              onChange={
                                handleDraftChange
                              }
                            />

                            <FormField
                              name="testDate"
                              label="Test Date"
                              type="date"
                              value={
                                draft.testDate
                              }
                              onChange={
                                handleDraftChange
                              }
                            />

                            <FormField
                              name="coaUrl"
                              label="COA Document Link"
                              type="url"
                              placeholder="https://..."
                              value={
                                draft.coaUrl
                              }
                              onChange={
                                handleDraftChange
                              }
                              fullWidth
                            />

                            <FormField
                              name="verificationUrl"
                              label="Verification / QR Destination"
                              type="url"
                              placeholder="https://..."
                              value={
                                draft.verificationUrl
                              }
                              onChange={
                                handleDraftChange
                              }
                              fullWidth
                            />

                            <label className="coa-manager-field coa-manager-full-width">
                              <span>
                                Internal Notes
                              </span>

                              <textarea
                                name="notes"
                                value={
                                  draft.notes
                                }
                                onChange={
                                  handleDraftChange
                                }
                                placeholder="Internal notes about the batch, laboratory, document, or review..."
                                rows={5}
                              />
                            </label>
                          </div>

                          <label className="coa-manager-review-check">
                            <input
                              type="checkbox"
                              name="reviewed"
                              checked={
                                draft.reviewed
                              }
                              onChange={
                                handleDraftChange
                              }
                            />

                            <span>
                              I manually
                              reviewed the
                              document and
                              confirmed that the
                              product code,
                              strength, batch,
                              and laboratory
                              information match.
                            </span>
                          </label>

                          <div className="coa-manager-editor-warning">
                            Do not mark a record
                            reviewed unless the
                            document is genuine
                            and matches this exact
                            product strength and
                            batch.
                          </div>

                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() =>
                              handleSaveRecord(
                                variant
                              )
                            }
                          >
                            Save Documentation
                            Record
                          </button>
                        </div>
                      )}
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
}) {
  return (
    <div className="coa-manager-stat">
      <span>{label}</span>

      <strong
        className={
          positive
            ? "coa-manager-stat-positive"
            : ""
        }
      >
        {value}
      </strong>

      <small>{detail}</small>
    </div>
  );
}

function StatusBox({
  label,
  value,
  ready,
}) {
  return (
    <div
      className={
        ready
          ? "coa-manager-status coa-manager-status-ready"
          : "coa-manager-status coa-manager-status-warning"
      }
    >
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FormField({
  name,
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  fullWidth = false,
}) {
  return (
    <label
      className={
        fullWidth
          ? "coa-manager-field coa-manager-full-width"
          : "coa-manager-field"
      }
    >
      <span>{label}</span>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  );
}

const coaManagerCss = `
  .coa-manager-page,
  .coa-manager-page *,
  .coa-manager-page *::before,
  .coa-manager-page *::after {
    box-sizing: border-box;
  }

  .coa-manager-page {
    width: 100%;
    max-width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .coa-manager-inner {
    width: 100%;
    max-width: 1300px;
    margin: 0 auto;
  }

  .coa-manager-hero {
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

  .coa-manager-title {
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

  .coa-manager-subtitle {
    max-width: 760px;
    color: #c8c8c8;
    font-size: 18px;
    line-height: 1.8;
  }

  .coa-manager-hero-buttons,
  .coa-manager-filter-row,
  .coa-manager-actions,
  .coa-manager-card-badges,
  .coa-manager-issue-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .coa-manager-notice {
    display: grid;
    gap: 8px;
    margin-bottom: 24px;
    padding: 20px;
    border: 1px solid rgba(255,190,90,0.28);
    border-radius: 20px;
    background: rgba(255,170,60,0.08);
    color: #ffe3b0;
    line-height: 1.7;
  }

  .coa-manager-stats {
    display: grid;
    grid-template-columns:
      repeat(auto-fit, minmax(180px, 1fr));
    gap: 18px;
    margin-bottom: 24px;
  }

  .coa-manager-stat {
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

  .coa-manager-stat > span,
  .coa-manager-filter-label {
    color: #9ed8ff;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .coa-manager-stat > strong {
    color: #ffffff;
    font-size: 38px;
  }

  .coa-manager-stat-positive {
    color: #9ed8ff !important;
  }

  .coa-manager-stat > small {
    color: #8f9ba7;
    line-height: 1.5;
  }

  .coa-manager-filters {
    padding: 30px;
    margin-bottom: 24px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background: rgba(255,255,255,0.035);
  }

  .coa-manager-section-title {
    margin-bottom: 20px;
    color: #ffffff;
    font-size: clamp(30px, 5vw, 36px);
  }

  .coa-manager-search {
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

  .coa-manager-filter-group {
    display: grid;
    gap: 10px;
    margin-top: 18px;
  }

  .coa-manager-results {
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

  .coa-manager-grid {
    display: grid;
    grid-template-columns:
      repeat(auto-fit, minmax(420px, 1fr));
    gap: 22px;
  }

  .coa-manager-card {
    min-width: 0;
    padding: 26px;
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

  .coa-manager-card-header {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .coa-manager-image {
    width: 105px;
    min-width: 105px;
    height: 105px;
    overflow: hidden;
    border: 1px solid rgba(61,165,255,0.2);
    border-radius: 19px;
    background:
      radial-gradient(
        circle,
        rgba(61,165,255,0.18),
        rgba(0,0,0,0.72)
      );
  }

  .coa-manager-image img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .coa-manager-image-placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 5px;
    color: #ffffff;
    text-align: center;
    font-size: 11px;
  }

  .coa-manager-identity {
    min-width: 0;
  }

  .coa-manager-category-badge,
  .coa-manager-ready-badge,
  .coa-manager-warning-badge {
    display: inline-flex;
    width: fit-content;
    padding: 7px 11px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .coa-manager-category-badge {
    border: 1px solid rgba(61,165,255,0.28);
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
  }

  .coa-manager-ready-badge {
    border: 1px solid rgba(61,165,255,0.42);
    background: rgba(61,165,255,0.16);
    color: #9ed8ff;
  }

  .coa-manager-warning-badge {
    border: 1px solid rgba(255,130,130,0.35);
    background: rgba(255,90,90,0.1);
    color: #ffd1d1;
  }

  .coa-manager-product-title {
    margin: 12px 0 7px;
    color: #ffffff;
    font-size: clamp(24px, 4vw, 27px);
    line-height: 1.15;
    overflow-wrap: anywhere;
  }

  .coa-manager-code {
    color: #9ed8ff;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .coa-manager-composition {
    display: grid;
    gap: 5px;
    margin-top: 18px;
    padding: 14px;
    border: 1px solid rgba(61,165,255,0.18);
    border-radius: 14px;
    background: rgba(61,165,255,0.09);
    color: #c8eaff;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .coa-manager-status-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 20px;
  }

  .coa-manager-status {
    min-width: 0;
    display: grid;
    gap: 5px;
    padding: 13px;
    border-radius: 14px;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .coa-manager-status-ready {
    border: 1px solid rgba(61,165,255,0.18);
    background: rgba(61,165,255,0.07);
    color: #bfe7ff;
  }

  .coa-manager-status-warning {
    border: 1px solid rgba(255,130,130,0.2);
    background: rgba(255,90,90,0.07);
    color: #ffd1d1;
  }

  .coa-manager-record-summary {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-top: 18px;
  }

  .coa-manager-record-summary > div {
    min-width: 0;
    display: grid;
    gap: 5px;
    padding: 13px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    background: rgba(0,0,0,0.23);
    color: #9ca8b3;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .coa-manager-record-summary strong {
    color: #ffffff;
  }

  .coa-manager-issues {
    display: grid;
    gap: 12px;
    margin-top: 18px;
    padding: 16px;
    border: 1px solid rgba(255,130,130,0.25);
    border-radius: 16px;
    background: rgba(255,90,90,0.08);
    color: #ffd1d1;
  }

  .coa-manager-issue-tags span {
    padding: 6px 9px;
    border: 1px solid rgba(255,150,150,0.2);
    border-radius: 999px;
    background: rgba(0,0,0,0.2);
    font-size: 11px;
    font-weight: 800;
  }

  .coa-manager-notes {
    display: grid;
    gap: 7px;
    margin-top: 18px;
    padding: 15px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 15px;
    background: rgba(0,0,0,0.2);
    color: #c8c8c8;
    line-height: 1.7;
  }

  .coa-manager-notes span {
    color: #9ed8ff;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .coa-manager-actions {
    margin-top: 20px;
  }

  .coa-manager-link-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }

  .coa-manager-danger-button {
    padding: 13px 18px;
    border: 1px solid rgba(255,110,110,0.28);
    border-radius: 14px;
    background: rgba(255,70,70,0.08);
    color: #ffd1d1;
    font-weight: 900;
    cursor: pointer;
  }

  .coa-manager-editor {
    margin-top: 22px;
    padding: 20px;
    border: 1px solid rgba(61,165,255,0.25);
    border-radius: 20px;
    background: rgba(0,0,0,0.3);
  }

  .coa-manager-editor-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }

  .coa-manager-editor-heading h3 {
    color: #ffffff;
    font-size: 24px;
    overflow-wrap: anywhere;
  }

  .coa-manager-form-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .coa-manager-field {
    min-width: 0;
    display: grid;
    gap: 8px;
  }

  .coa-manager-field > span {
    color: #c8c8c8;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .coa-manager-field input,
  .coa-manager-field textarea {
    width: 100%;
    min-width: 0;
    padding: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 13px;
    outline: none;
    background: rgba(255,255,255,0.055);
    color: #ffffff;
    font: inherit;
  }

  .coa-manager-field textarea {
    resize: vertical;
  }

  .coa-manager-full-width {
    grid-column: 1 / -1;
  }

  .coa-manager-review-check {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-top: 18px;
    color: #c8c8c8;
    line-height: 1.7;
    cursor: pointer;
  }

  .coa-manager-review-check input {
    width: 20px;
    height: 20px;
    min-width: 20px;
    margin-top: 3px;
    accent-color: #3da5ff;
  }

  .coa-manager-editor-warning {
    margin: 17px 0;
    padding: 14px;
    border: 1px solid rgba(255,190,90,0.24);
    border-radius: 14px;
    background: rgba(255,170,60,0.07);
    color: #ffe3b0;
    line-height: 1.65;
  }

  .coa-manager-empty {
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
    .coa-manager-page {
      padding: 65px 24px;
    }

    .coa-manager-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }
  }

  @media (max-width: 650px) {
    .coa-manager-page {
      padding: 44px 12px;
    }

    .coa-manager-hero {
      padding: 30px 20px;
      border-radius: 24px;
    }

    .coa-manager-hero-buttons,
    .coa-manager-hero-buttons button,
    .coa-manager-actions,
    .coa-manager-actions button,
    .coa-manager-actions a {
      width: 100%;
    }

    .coa-manager-filters,
    .coa-manager-card {
      padding: 18px;
      border-radius: 21px;
    }

    .coa-manager-card-header {
      align-items: flex-start;
    }

    .coa-manager-status-grid,
    .coa-manager-record-summary,
    .coa-manager-form-grid {
      grid-template-columns:
        minmax(0, 1fr);
    }

    .coa-manager-full-width {
      grid-column: auto;
    }

    .coa-manager-filter-row button {
      flex: 1 1 145px;
    }
  }

  @media (max-width: 430px) {
    .coa-manager-page {
      padding: 34px 8px;
    }

    .coa-manager-hero,
    .coa-manager-filters,
    .coa-manager-card {
      padding: 15px;
    }

    .coa-manager-card-header {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr);
    }

    .coa-manager-image {
      width: 100%;
      height: 180px;
    }

    .coa-manager-editor {
      padding: 14px;
    }
  }
`;

export default COAManager;
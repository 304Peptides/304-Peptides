import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  products,
  categories,
} from "../data/products";

const adminSessionKey =
  "304-document-admin-session";

const statusOptions = [
  "All Statuses",
  "Documentation Ready",
  "Needs Attention",
  "Published",
  "Not Published",
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
  published: false,
  updatedAt: "",
  createdAt: "",
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
    const url = new URL(
      value.trim()
    );

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function getSavedAdminSecret() {
  try {
    return (
      window.sessionStorage.getItem(
        adminSessionKey
      ) || ""
    );
  } catch {
    return "";
  }
}

function saveAdminSecret(secret) {
  try {
    window.sessionStorage.setItem(
      adminSessionKey,
      secret
    );
  } catch {
    // Session storage may be unavailable.
  }
}

function clearAdminSecret() {
  try {
    window.sessionStorage.removeItem(
      adminSessionKey
    );
  } catch {
    // Session storage may be unavailable.
  }
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

  const published =
    Boolean(record.published);

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

  const ready =
    coaReady &&
    batchReady &&
    verificationReady &&
    imageReady &&
    reviewed;

  return {
    coaReady,
    batchReady,
    verificationReady,
    imageReady,
    reviewed,
    published,
    issues,
    ready,
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

function mapRecordsByCode(
  records
) {
  return records.reduce(
    (
      recordMap,
      record
    ) => {
      if (record?.codeName) {
        recordMap[
          record.codeName
        ] = record;
      }

      return recordMap;
    },
    {}
  );
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

  const [
    adminSecret,
    setAdminSecret,
  ] = useState(
    getSavedAdminSecret
  );

  const [
    secretInput,
    setSecretInput,
  ] = useState("");

  const [records, setRecords] =
    useState({});

  const [
    editingCode,
    setEditingCode,
  ] = useState("");

  const [draft, setDraft] =
    useState(emptyRecord);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    connectionError,
    setConnectionError,
  ] = useState("");

  const [
    connectionMessage,
    setConnectionMessage,
  ] = useState("");

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
    const savedRecords =
      auditedVariants.filter(
        (variant) =>
          Boolean(
            records[
              variant.codeName
            ]
          )
      ).length;

    const documentationReady =
      auditedVariants.filter(
        (variant) =>
          variant.audit.ready
      ).length;

    const published =
      auditedVariants.filter(
        (variant) =>
          variant.audit.published
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

      savedRecords,

      documentationReady,

      pending:
        auditedVariants.length -
        documentationReady,

      published,
      coaReady,
      batchReady,
      verificationReady,
      reviewed,
    };
  }, [
    auditedVariants,
    records,
  ]);

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
              "Published" &&
              audit.published) ||

            (activeStatus ===
              "Not Published" &&
              !audit.published) ||

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

  useEffect(() => {
    if (!adminSecret) {
      return;
    }

    loadCloudRecords(
      adminSecret
    );
  }, [adminSecret]);

  async function adminRequest(
    path,
    options = {},
    secret = adminSecret
  ) {
    const response =
      await fetch(path, {
        ...options,

        headers: {
          Authorization:
            `Bearer ${secret}`,

          ...(options.body
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),

          ...(options.headers ||
            {}),
        },
      });

    let result;

    try {
      result =
        await response.json();
    } catch {
      throw new Error(
        "The documentation service returned an invalid response."
      );
    }

    if (!response.ok) {
      const error =
        new Error(
          result.error ||
            "The documentation request failed."
        );

      error.status =
        response.status;

      throw error;
    }

    return result;
  }

  async function loadCloudRecords(
    secret = adminSecret
  ) {
    setLoading(true);
    setConnectionError("");
    setConnectionMessage("");

    try {
      const result =
        await adminRequest(
          "/api/admin/documents",
          {
            method: "GET",
          },
          secret
        );

      setRecords(
        mapRecordsByCode(
          result.records || []
        )
      );

      setConnectionMessage(
        `Connected to Cloudflare. ${
          result.count || 0
        } documentation record${
          result.count === 1
            ? ""
            : "s"
        } loaded.`
      );
    } catch (error) {
      if (
        error.status === 401
      ) {
        clearAdminSecret();
        setAdminSecret("");
        setSecretInput("");

        setConnectionError(
          "The administrator password was not accepted."
        );
      } else {
        setConnectionError(
          error.message ||
            "The documentation records could not be loaded."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(
    event
  ) {
    event.preventDefault();

    const cleanedSecret =
      secretInput.trim();

    if (!cleanedSecret) {
      setConnectionError(
        "Enter the documentation administrator password."
      );

      return;
    }

    setLoading(true);
    setConnectionError("");
    setConnectionMessage("");

    try {
      const result =
        await adminRequest(
          "/api/admin/documents",
          {
            method: "GET",
          },
          cleanedSecret
        );

      setRecords(
        mapRecordsByCode(
          result.records || []
        )
      );

      saveAdminSecret(
        cleanedSecret
      );

      setAdminSecret(
        cleanedSecret
      );

      setSecretInput("");

      setConnectionMessage(
        "Administrator access confirmed."
      );
    } catch (error) {
      setConnectionError(
        error.message ||
          "Administrator access could not be confirmed."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearAdminSecret();

    setAdminSecret("");
    setSecretInput("");
    setRecords({});
    setEditingCode("");
    setDraft(emptyRecord);
    setConnectionError("");
    setConnectionMessage("");
  }

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

      published:
        Boolean(
          variant.record.published
        ),

      reviewed:
        Boolean(
          variant.record.reviewed
        ),
    });

    setConnectionError("");
    setConnectionMessage("");
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

  async function handleSaveRecord(
    variant
  ) {
    if (!adminSecret) {
      setConnectionError(
        "Administrator access is required."
      );

      return;
    }

    if (
      draft.coaUrl &&
      !isValidHttpUrl(
        draft.coaUrl
      )
    ) {
      setConnectionError(
        "Enter a complete COA link beginning with http:// or https://."
      );

      return;
    }

    if (
      draft.verificationUrl &&
      !isValidHttpUrl(
        draft.verificationUrl
      )
    ) {
      setConnectionError(
        "Enter a complete verification link beginning with http:// or https://."
      );

      return;
    }

    setSaving(true);
    setConnectionError("");
    setConnectionMessage("");

    try {
      const result =
        await adminRequest(
          `/api/admin/documents/${encodeURIComponent(
            variant.codeName
          )}`,
          {
            method: "PUT",

            body: JSON.stringify({
              record: {
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
                  Boolean(
                    draft.reviewed
                  ),

                published:
                  Boolean(
                    draft.published
                  ),

                category:
                  variant.category,
              },
            }),
          }
        );

      setRecords(
        (currentRecords) => ({
          ...currentRecords,

          [variant.codeName]:
            result.record,
        })
      );

      setEditingCode("");
      setDraft(emptyRecord);

      setConnectionMessage(
        `${variant.codeName} was saved to Cloudflare KV.`
      );
    } catch (error) {
      if (
        error.status === 401
      ) {
        handleLogout();

        setConnectionError(
          "Your administrator session expired or was rejected. Sign in again."
        );
      } else {
        setConnectionError(
          error.message ||
            "The documentation record could not be saved."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRecord(
    variant
  ) {
    const confirmed =
      window.confirm(
        `Delete the permanent documentation record for ${variant.codeName}?`
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setConnectionError("");
    setConnectionMessage("");

    try {
      await adminRequest(
        `/api/admin/documents/${encodeURIComponent(
          variant.codeName
        )}`,
        {
          method: "DELETE",
        }
      );

      setRecords(
        (currentRecords) => {
          const nextRecords = {
            ...currentRecords,
          };

          delete nextRecords[
            variant.codeName
          ];

          return nextRecords;
        }
      );

      if (
        editingCode ===
        variant.codeName
      ) {
        cancelEditing();
      }

      setConnectionMessage(
        `${variant.codeName} was deleted from Cloudflare KV.`
      );
    } catch (error) {
      setConnectionError(
        error.message ||
          "The documentation record could not be deleted."
      );
    } finally {
      setSaving(false);
    }
  }

  function exportRecords() {
    const recordList =
      Object.values(records);

    const exportPayload = {
      exportedAt:
        new Date().toISOString(),

      recordCount:
        recordList.length,

      records:
        recordList,
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
      "304-cloud-document-records.json";

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(
      downloadUrl
    );
  }

  if (!adminSecret) {
    return (
      <>
        <style>
          {coaManagerCss}
        </style>

        <main className="coa-manager-page">
          <section className="coa-manager-inner">
            <div className="coa-manager-login-panel">
              <p className="eyebrow">
                SECURE ADMINISTRATION
              </p>

              <h1 className="coa-manager-title">
                COA Manager
              </h1>

              <p className="coa-manager-subtitle">
                Enter the documentation
                administrator password
                you created with
                Wrangler. The password
                is used only for this
                browser tab and is
                never stored in the
                website source code.
              </p>

              {connectionError && (
                <div className="coa-manager-error">
                  {connectionError}
                </div>
              )}

              <form
                className="coa-manager-login-form"
                onSubmit={
                  handleLogin
                }
              >
                <label className="coa-manager-field">
                  <span>
                    Administrator
                    Password
                  </span>

                  <input
                    type="password"
                    value={
                      secretInput
                    }
                    onChange={(
                      event
                    ) =>
                      setSecretInput(
                        event.target
                          .value
                      )
                    }
                    autoComplete="current-password"
                    placeholder="Enter administrator password"
                  />
                </label>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={loading}
                >
                  {loading
                    ? "Connecting..."
                    : "Open COA Manager"}
                </button>
              </form>

              <div className="coa-manager-login-actions">
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
                      "quality"
                    )
                  }
                >
                  View Public Quality
                  Page
                </button>
              </div>
            </div>
          </section>
        </main>
      </>
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
                Manage permanent
                Cloudflare records for
                certificates of
                analysis, batch
                information, testing
                laboratories,
                verification links,
                review status, and
                public publication.
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
                  onNavigate(
                    "quality"
                  )
                }
              >
                View Quality Page
              </button>

              <button
                type="button"
                className="secondary-btn"
                disabled={loading}
                onClick={() =>
                  loadCloudRecords()
                }
              >
                {loading
                  ? "Refreshing..."
                  : "Refresh Records"}
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

              <button
                type="button"
                className="coa-manager-danger-button"
                onClick={
                  handleLogout
                }
              >
                End Admin Session
              </button>
            </div>
          </div>

          <div className="coa-manager-cloud-notice">
            <strong>
              Cloudflare KV connected
            </strong>

            <p>
              Saved documentation now
              persists across devices.
              Only records marked
              complete, manually
              reviewed, and published
              will appear through the
              public documentation API.
            </p>
          </div>

          {connectionMessage && (
            <div className="coa-manager-success">
              {connectionMessage}
            </div>
          )}

          {connectionError && (
            <div className="coa-manager-error">
              {connectionError}
            </div>
          )}

          <div className="coa-manager-stats">
            <StatCard
              label="Total Variants"
              value={stats.total}
              detail="Individual catalog strengths"
            />

            <StatCard
              label="Saved Records"
              value={
                stats.savedRecords
              }
              detail="Stored in Cloudflare KV"
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
              label="Published"
              value={stats.published}
              detail="Visible through public API"
              positive={
                stats.published > 0
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
                onClick={
                  resetFilters
                }
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

                  const hasSavedRecord =
                    Boolean(
                      records[
                        variant.codeName
                      ]
                    );

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

                            <span
                              className={
                                audit.published
                                  ? "coa-manager-published-badge"
                                  : "coa-manager-draft-badge"
                              }
                            >
                              {audit.published
                                ? "Published"
                                : "Not Published"}
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
                          label="Publication"
                          value={
                            audit.published
                              ? "Published"
                              : "Not Published"
                          }
                          ready={
                            audit.published
                          }
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
                          label="Laboratory"
                          value={
                            record.labName ||
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
                            : hasSavedRecord
                            ? "Edit Record"
                            : "Create Record"}
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

                        {audit.published && (
                          <a
                            className="secondary-btn coa-manager-link-button"
                            href={`/api/documents/${encodeURIComponent(
                              variant.codeName
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View Public Record
                          </a>
                        )}

                        {hasSavedRecord && (
                          <button
                            type="button"
                            className="coa-manager-danger-button"
                            disabled={saving}
                            onClick={() =>
                              handleDeleteRecord(
                                variant
                              )
                            }
                          >
                            Delete Record
                          </button>
                        )}
                      </div>

                      {isEditing && (
                        <div className="coa-manager-editor">
                          <div className="coa-manager-editor-heading">
                            <div>
                              <p className="eyebrow">
                                CLOUD DOCUMENT
                                RECORD
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
                              laboratory
                              document and
                              confirmed the
                              product code,
                              strength, batch,
                              testing
                              laboratory, and
                              results match
                              this record.
                            </span>
                          </label>

                          <label className="coa-manager-publish-check">
                            <input
                              type="checkbox"
                              name="published"
                              checked={
                                draft.published
                              }
                              onChange={
                                handleDraftChange
                              }
                            />

                            <span>
                              Publish this
                              record through
                              the public
                              documentation
                              API.
                            </span>
                          </label>

                          <div className="coa-manager-editor-warning">
                            Cloudflare will
                            reject publication
                            unless the record
                            contains complete
                            batch information,
                            valid COA and
                            verification links,
                            and manual review
                            confirmation.
                          </div>

                          <button
                            type="button"
                            className="primary-btn"
                            disabled={saving}
                            onClick={() =>
                              handleSaveRecord(
                                variant
                              )
                            }
                          >
                            {saving
                              ? "Saving To Cloudflare..."
                              : "Save Permanent Record"}
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

  .coa-manager-login-panel {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding: 48px;
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

  .coa-manager-login-form {
    display: grid;
    gap: 18px;
    margin-top: 28px;
  }

  .coa-manager-login-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 18px;
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

  .coa-manager-cloud-notice,
  .coa-manager-success,
  .coa-manager-error {
    display: grid;
    gap: 8px;
    margin-bottom: 24px;
    padding: 18px;
    border-radius: 18px;
    line-height: 1.7;
  }

  .coa-manager-cloud-notice,
  .coa-manager-success {
    border: 1px solid rgba(61,165,255,0.28);
    background: rgba(61,165,255,0.09);
    color: #bfe7ff;
  }

  .coa-manager-error {
    border: 1px solid rgba(255,120,120,0.3);
    background: rgba(255,70,70,0.09);
    color: #ffd1d1;
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
  .coa-manager-warning-badge,
  .coa-manager-published-badge,
  .coa-manager-draft-badge {
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

  .coa-manager-ready-badge,
  .coa-manager-published-badge {
    border: 1px solid rgba(61,165,255,0.42);
    background: rgba(61,165,255,0.16);
    color: #9ed8ff;
  }

  .coa-manager-warning-badge {
    border: 1px solid rgba(255,130,130,0.35);
    background: rgba(255,90,90,0.1);
    color: #ffd1d1;
  }

  .coa-manager-draft-badge {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: #c8c8c8;
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
      repeat(2, minmax(0, 1fr));
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

  .coa-manager-review-check,
  .coa-manager-publish-check {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-top: 18px;
    color: #c8c8c8;
    line-height: 1.7;
    cursor: pointer;
  }

  .coa-manager-review-check input,
  .coa-manager-publish-check input {
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

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

    .coa-manager-hero,
    .coa-manager-login-panel {
      padding: 30px 20px;
      border-radius: 24px;
    }

    .coa-manager-hero-buttons,
    .coa-manager-hero-buttons button,
    .coa-manager-login-actions,
    .coa-manager-login-actions button,
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
    .coa-manager-login-panel,
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
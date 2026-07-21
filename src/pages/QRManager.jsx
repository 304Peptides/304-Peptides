import brandBadgeLogo from "../assets/images/logo-nav.webp";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import QRCode from "qrcode";

import {
  products,
} from "../data/products";

function buildCatalogMap() {
  const map =
    new Map();

  products.forEach(
    (product) => {
      const variants =
        product.variants?.length
          ? product.variants
          : [product];

      variants.forEach(
        (variant) => {
          map.set(
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

  return map;
}

function formatDate(value) {
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
      month: "long",
      day: "numeric",
    }
  );
}

async function copyText(
  value
) {
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(
      value
    );

    return;
  }

  const textarea =
    document.createElement(
      "textarea"
    );

  textarea.value =
    value;

  textarea.style.position =
    "fixed";

  textarea.style.opacity =
    "0";

  document.body.appendChild(
    textarea
  );

  textarea.focus();
  textarea.select();

  document.execCommand(
    "copy"
  );

  textarea.remove();
}

function QRManager({
  onNavigate = () => {},
  onOpenVerification = () => {},
}) {
  const catalogMap =
    useMemo(
      () => buildCatalogMap(),
      []
    );

  const [
    records,
    setRecords,
  ] = useState([]);

  const [
    selectedCode,
    setSelectedCode,
  ] = useState("");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    qrDataUrl,
    setQrDataUrl,
  ] = useState("");

  const [
    qrLoading,
    setQrLoading,
  ] = useState(false);

  const [
    qrError,
    setQrError,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadRecords() {
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
              "Published records could not be loaded."
          );
        }

        const publicRecords =
          Array.isArray(
            result.records
          )
            ? result.records
            : [];

        setRecords(
          publicRecords
        );

        setSelectedCode(
          (
            currentCode
          ) => {
            const stillExists =
              publicRecords.some(
                (record) =>
                  record.codeName ===
                  currentCode
              );

            if (
              stillExists
            ) {
              return currentCode;
            }

            return (
              publicRecords[0]
                ?.codeName ||
              ""
            );
          }
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
        setSelectedCode("");

        setError(
          requestError.message ||
            "Published records could not be loaded."
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

    loadRecords();

    return () => {
      controller.abort();
    };
  }, [refreshKey]);

  const enrichedRecords =
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

                productName:
                  record.productName ||
                  catalogItem?.productName ||
                  record.codeName,

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
              String(
                left.productName
              ).localeCompare(
                String(
                  right.productName
                )
              )
          ),
      [
        catalogMap,
        records,
      ]
    );

  const filteredRecords =
    useMemo(() => {
      const normalized =
        searchTerm
          .trim()
          .toLowerCase();

      if (!normalized) {
        return enrichedRecords;
      }

      return enrichedRecords.filter(
        (record) =>
          [
            record.productName,
            record.codeName,
            record.strength,
            record.batchNumber,
            record.labName,
            record.category,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(
              normalized
            )
      );
    }, [
      enrichedRecords,
      searchTerm,
    ]);

  const selectedRecord =
    useMemo(
      () =>
        enrichedRecords.find(
          (record) =>
            record.codeName ===
            selectedCode
        ) ||
        null,
      [
        enrichedRecords,
        selectedCode,
      ]
    );

  const verificationUrl =
    selectedRecord
      ? `${
          window.location.origin
        }/verify/${encodeURIComponent(
          selectedRecord.codeName
        )}`
      : "";

  useEffect(() => {
    let active = true;

    async function generateQr() {
      if (
        !verificationUrl
      ) {
        setQrDataUrl("");
        setQrError("");
        return;
      }

      setQrLoading(true);
      setQrError("");
      setCopied(false);

      try {
        const dataUrl =
          await QRCode.toDataURL(
            verificationUrl,
            {
              errorCorrectionLevel:
                "H",

              width: 900,
              margin: 4,

              color: {
                dark:
                  "#000000",

                light:
                  "#ffffff",
              },
            }
          );

        if (active) {
          setQrDataUrl(
            dataUrl
          );
        }
      } catch (
        generationError
      ) {
        if (active) {
          setQrDataUrl("");

          setQrError(
            generationError.message ||
              "The QR code could not be generated."
          );
        }
      } finally {
        if (active) {
          setQrLoading(false);
        }
      }
    }

    generateQr();

    return () => {
      active = false;
    };
  }, [verificationUrl]);

  function refreshRecords() {
    setRefreshKey(
      (currentKey) =>
        currentKey + 1
    );
  }

  function downloadQr() {
    if (
      !selectedRecord ||
      !qrDataUrl
    ) {
      return;
    }

    const link =
      document.createElement(
        "a"
      );

    const safeBatch =
      String(
        selectedRecord.batchNumber ||
          "batch"
      ).replace(
        /[^a-z0-9-_]/gi,
        "-"
      );

    link.href =
      qrDataUrl;

    link.download =
      `${selectedRecord.codeName}-${safeBatch}-QR.png`;

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();
  }

  async function handleCopy() {
    if (
      !verificationUrl
    ) {
      return;
    }

    try {
      await copyText(
        verificationUrl
      );

      setCopied(true);

      window.setTimeout(
        () => {
          setCopied(false);
        },
        1800
      );
    } catch {
      setCopied(false);
    }
  }

  function printQrLabel() {
    if (
      !selectedRecord ||
      !qrDataUrl
    ) {
      return;
    }

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=700,height=850"
      );

    if (!printWindow) {
      return;
    }

    const productName =
      String(
        selectedRecord.productName
      )
        .replaceAll(
          "&",
          "&amp;"
        )
        .replaceAll(
          "<",
          "&lt;"
        )
        .replaceAll(
          ">",
          "&gt;"
        );

    const codeName =
      String(
        selectedRecord.codeName
      )
        .replaceAll(
          "&",
          "&amp;"
        )
        .replaceAll(
          "<",
          "&lt;"
        )
        .replaceAll(
          ">",
          "&gt;"
        );

    const strength =
      String(
        selectedRecord.strength ||
          ""
      )
        .replaceAll(
          "&",
          "&amp;"
        )
        .replaceAll(
          "<",
          "&lt;"
        )
        .replaceAll(
          ">",
          "&gt;"
        );

    const batchNumber =
      String(
        selectedRecord.batchNumber ||
          ""
      )
        .replaceAll(
          "&",
          "&amp;"
        )
        .replaceAll(
          "<",
          "&lt;"
        )
        .replaceAll(
          ">",
          "&gt;"
        );

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${codeName} QR Label</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 30px;
              background: #ffffff;
              color: #000000;
              font-family: Arial, sans-serif;
            }

            .label {
              width: 360px;
              margin: 0 auto;
              padding: 22px;
              border: 2px solid #000000;
              border-radius: 18px;
              text-align: center;
            }

            .brand {
              margin-bottom: 6px;
              font-size: 28px;
              font-weight: 900;
            }

            .name {
              margin-bottom: 4px;
              font-size: 20px;
              font-weight: 800;
            }

            .identity {
              margin-bottom: 14px;
              font-size: 14px;
              font-weight: 700;
            }

            img {
              width: 260px;
              height: 260px;
              display: block;
              margin: 0 auto 14px;
            }

            .batch {
              margin-bottom: 8px;
              font-size: 14px;
              font-weight: 800;
            }

            .notice {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
            }

            .url {
              margin-top: 9px;
              font-size: 8px;
              overflow-wrap: anywhere;
            }

            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>

        <body>
          <div class="label">
            <div class="brand">304 PEPTIDES</div>

            <div class="name">${productName}</div>

            <div class="identity">
              ${codeName} Â· ${strength}
            </div>

            <img
              src="${qrDataUrl}"
              alt="Verification QR code"
            />

            <div class="batch">
              Batch: ${batchNumber}
            </div>

            <div class="notice">
              Scan To View Published Documentation
            </div>

            <div class="url">
              ${verificationUrl}
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  return (
    <>
      <style>
        {qrManagerCss}
      </style>

      <main className="qr-manager-page">
        <section className="qr-manager-inner">
          <div className="qr-manager-hero">
            <div>
              <p className="eyebrow">
                304 PEPTIDES ADMIN
              </p>

              <h1>
                QR Manager
              </h1>

              <p>
                Generate printable QR
                codes for completed
                public documentation
                records. Every QR code
                opens a clean public
                verification page for
                the matching product
                code and batch.
              </p>

              <div className="qr-manager-hero-notices">
                <span>
                  Published Records
                  Only
                </span>

                <span>
                  {
                    records.length
                  }{" "}
                  QR Record
                  {records.length ===
                  1
                    ? ""
                    : "s"}
                </span>
              </div>
            </div>

            <div className="qr-manager-hero-actions">
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
                View Quality Page
              </button>
            </div>
          </div>

          {loading && (
            <div className="qr-manager-state">
              <div className="qr-manager-loader" />

              <h2>
                Loading Published
                Records
              </h2>

              <p>
                Connecting to the
                public documentation
                service.
              </p>
            </div>
          )}

          {!loading &&
            error && (
              <div className="qr-manager-error">
                <p className="eyebrow">
                  RECORDS UNAVAILABLE
                </p>

                <h2>
                  QR Records Could
                  Not Be Loaded
                </h2>

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
            records.length ===
              0 && (
              <div className="qr-manager-state">
                <p className="eyebrow">
                  NO PUBLISHED
                  RECORDS
                </p>

                <h2>
                  QR Codes Coming
                  Soon
                </h2>

                <p>
                  A QR code becomes
                  available after a
                  genuine record is
                  complete, reviewed,
                  and published
                  through COA Manager.
                </p>

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
              </div>
            )}

          {!loading &&
            !error &&
            records.length >
              0 && (
              <div className="qr-manager-layout">
                <section className="qr-manager-record-panel">
                  <div className="qr-manager-panel-heading">
                    <div>
                      <p className="eyebrow">
                        PUBLISHED
                        RECORDS
                      </p>

                      <h2>
                        Select A
                        Product
                      </h2>
                    </div>

                    <strong>
                      {
                        filteredRecords.length
                      }
                    </strong>
                  </div>

                  <input
                    type="search"
                    value={
                      searchTerm
                    }
                    placeholder="Search product, code, batch, strength, or lab..."
                    onChange={(
                      event
                    ) =>
                      setSearchTerm(
                        event.target
                          .value
                      )
                    }
                  />

                  {filteredRecords.length ===
                  0 ? (
                    <div className="qr-manager-no-results">
                      No matching
                      published records
                      were found.
                    </div>
                  ) : (
                    <div className="qr-manager-record-list">
                      {filteredRecords.map(
                        (
                          record
                        ) => (
                          <button
                            key={
                              record.codeName
                            }
                            type="button"
                            className={
                              selectedCode ===
                              record.codeName
                                ? "qr-manager-record-button qr-manager-record-selected"
                                : "qr-manager-record-button"
                            }
                            onClick={() =>
                              setSelectedCode(
                                record.codeName
                              )
                            }
                          >
                            <div className="qr-manager-record-image">
                              {record.image ? (
                                <img
                                  src={
                                    record.image
                                  }
                                  alt=""
                                />
                              ) : (
                                <img
                                  src={brandBadgeLogo}
                                  alt=""
                                  aria-hidden="true"
                                  style={{
                                    width: "34px",
                                    height: "34px",
                                    display: "block",
                                    objectFit: "contain",
                                    borderRadius: "8px",
                                  }}
                                />
                              )}
                            </div>

                            <div>
                              <strong>
                                {
                                  record.productName
                                }
                              </strong>

                              <span>
                                {
                                  record.codeName
                                }{" "}
                                Â·{" "}
                                {
                                  record.strength
                                }
                              </span>

                              <small>
                                Batch{" "}
                                {
                                  record.batchNumber
                                }
                              </small>
                            </div>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </section>

                <section className="qr-manager-preview-panel">
                  {selectedRecord && (
                    <>
                      <div className="qr-manager-panel-heading">
                        <div>
                          <p className="eyebrow">
                            QR PREVIEW
                          </p>

                          <h2>
                            {
                              selectedRecord.productName
                            }
                          </h2>
                        </div>

                        <span className="qr-manager-ready-pill">
                          Published
                        </span>
                      </div>

                      <p className="qr-manager-code">
                        {
                          selectedRecord.codeName
                        }{" "}
                        Â·{" "}
                        {
                          selectedRecord.strength
                        }
                      </p>

                      <div className="qr-manager-preview">
                        {qrLoading && (
                          <div className="qr-manager-loader" />
                        )}

                        {!qrLoading &&
                          qrError && (
                          <div className="qr-manager-qr-error">
                            {
                              qrError
                            }
                          </div>
                        )}

                        {!qrLoading &&
                          !qrError &&
                          qrDataUrl && (
                          <img
                            src={
                              qrDataUrl
                            }
                            alt={`QR code for ${selectedRecord.codeName}`}
                          />
                        )}
                      </div>

                      <div className="qr-manager-details">
                        <DetailBox
                          label="Product Code"
                          value={
                            selectedRecord.codeName
                          }
                        />

                        <DetailBox
                          label="Strength"
                          value={
                            selectedRecord.strength
                          }
                        />

                        <DetailBox
                          label="Batch Number"
                          value={
                            selectedRecord.batchNumber
                          }
                        />

                        <DetailBox
                          label="Testing Lab"
                          value={
                            selectedRecord.labName
                          }
                        />

                        <DetailBox
                          label="Test Date"
                          value={formatDate(
                            selectedRecord.testDate
                          )}
                        />

                        <DetailBox
                          label="Category"
                          value={
                            selectedRecord.category
                          }
                        />
                      </div>

                      <div className="qr-manager-url-panel">
                        <span>
                          QR Destination
                        </span>

                        <strong>
                          {
                            verificationUrl
                          }
                        </strong>
                      </div>

                      <div className="qr-manager-action-grid">
                        <button
                          type="button"
                          className="primary-btn"
                          disabled={
                            !qrDataUrl
                          }
                          onClick={
                            downloadQr
                          }
                        >
                          Download PNG
                        </button>

                        <button
                          type="button"
                          className="secondary-btn"
                          disabled={
                            !qrDataUrl
                          }
                          onClick={
                            printQrLabel
                          }
                        >
                          Print Label
                        </button>

                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={
                            handleCopy
                          }
                        >
                          {copied
                            ? "Link Copied"
                            : "Copy Link"}
                        </button>

                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            onOpenVerification(
                              selectedRecord.codeName
                            )
                          }
                        >
                          Open Verification
                        </button>
                      </div>

                      <div className="qr-manager-warning">
                        <strong>
                          Label Matching
                          Required
                        </strong>

                        <p>
                          Only place
                          this QR code
                          on material
                          matching
                          product code{" "}
                          <strong>
                            {
                              selectedRecord.codeName
                            }
                          </strong>
                          , strength{" "}
                          <strong>
                            {
                              selectedRecord.strength
                            }
                          </strong>
                          , and batch{" "}
                          <strong>
                            {
                              selectedRecord.batchNumber
                            }
                          </strong>
                          .
                        </p>
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
        </section>
      </main>
    </>
  );
}

function DetailBox({
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

const qrManagerCss = `
  .qr-manager-page,
  .qr-manager-page *,
  .qr-manager-page *::before,
  .qr-manager-page *::after {
    box-sizing: border-box;
  }

  .qr-manager-page {
    width: 100%;
    padding: 90px 60px;
    overflow-x: hidden;
  }

  .qr-manager-inner {
    width: 100%;
    max-width: 1300px;
    margin: 0 auto;
  }

  .qr-manager-hero {
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

  .qr-manager-hero h1 {
    margin-bottom: 18px;
    font-size: clamp(46px, 7vw, 64px);
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

  .qr-manager-hero p {
    max-width: 760px;
    color: #c8c8c8;
    font-size: 18px;
    line-height: 1.8;
  }

  .qr-manager-hero-notices,
  .qr-manager-hero-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .qr-manager-hero-notices {
    margin-top: 18px;
  }

  .qr-manager-hero-notices span,
  .qr-manager-ready-pill {
    display: inline-flex;
    width: fit-content;
    padding: 8px 12px;
    border: 1px solid rgba(61,165,255,0.3);
    border-radius: 999px;
    background: rgba(61,165,255,0.12);
    color: #9ed8ff;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .qr-manager-layout {
    display: grid;
    grid-template-columns:
      minmax(320px, 0.85fr)
      minmax(0, 1.15fr);
    gap: 24px;
  }

  .qr-manager-record-panel,
  .qr-manager-preview-panel,
  .qr-manager-state,
  .qr-manager-error {
    min-width: 0;
    padding: 30px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    background:
      radial-gradient(
        circle at top left,
        rgba(61,165,255,0.11),
        transparent 38%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 28px 75px rgba(0,0,0,0.38);
  }

  .qr-manager-panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    flex-wrap: wrap;
  }

  .qr-manager-panel-heading h2 {
    color: #ffffff;
    font-size: 32px;
  }

  .qr-manager-panel-heading > strong {
    color: #9ed8ff;
    font-size: 30px;
  }

  .qr-manager-record-panel > input {
    width: 100%;
    margin: 22px 0;
    padding: 15px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    outline: none;
    background: rgba(255,255,255,0.05);
    color: #ffffff;
    font: inherit;
  }

  .qr-manager-record-list {
    max-height: 720px;
    display: grid;
    gap: 10px;
    padding-right: 4px;
    overflow-y: auto;
  }

  .qr-manager-record-button {
    width: 100%;
    min-width: 0;
    display: grid;
    grid-template-columns: 62px minmax(0, 1fr);
    align-items: center;
    gap: 13px;
    padding: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 15px;
    background: rgba(0,0,0,0.22);
    color: #ffffff;
    text-align: left;
    cursor: pointer;
  }

  .qr-manager-record-selected {
    border-color: rgba(61,165,255,0.48);
    background: rgba(61,165,255,0.12);
  }

  .qr-manager-record-image {
    width: 62px;
    height: 62px;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1px solid rgba(61,165,255,0.18);
    border-radius: 12px;
    background: rgba(0,0,0,0.35);
    color: #9ed8ff;
    font-weight: 900;
  }

  .qr-manager-record-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .qr-manager-record-button > div:last-child {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .qr-manager-record-button strong,
  .qr-manager-record-button span,
  .qr-manager-record-button small {
    overflow-wrap: anywhere;
  }

  .qr-manager-record-button span {
    color: #9ed8ff;
    font-size: 12px;
    font-weight: 900;
  }

  .qr-manager-record-button small {
    color: #9ca8b3;
  }

  .qr-manager-code {
    margin: 8px 0 20px;
    color: #9ed8ff;
    font-weight: 900;
  }

  .qr-manager-preview {
    min-height: 390px;
    display: grid;
    place-items: center;
    padding: 24px;
    border: 1px solid rgba(61,165,255,0.2);
    border-radius: 22px;
    background: #ffffff;
  }

  .qr-manager-preview img {
    display: block;
    width: min(100%, 360px);
    height: auto;
  }

  .qr-manager-details {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 18px;
  }

  .qr-manager-details > div {
    min-width: 0;
    display: grid;
    gap: 5px;
    padding: 13px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 13px;
    background: rgba(0,0,0,0.22);
    overflow-wrap: anywhere;
  }

  .qr-manager-details span,
  .qr-manager-url-panel span {
    color: #9ca8b3;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .qr-manager-details strong {
    color: #ffffff;
    font-size: 13px;
  }

  .qr-manager-url-panel {
    min-width: 0;
    display: grid;
    gap: 6px;
    margin-top: 14px;
    padding: 14px;
    border: 1px solid rgba(61,165,255,0.2);
    border-radius: 14px;
    background: rgba(61,165,255,0.08);
  }

  .qr-manager-url-panel strong {
    color: #c8ecff;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .qr-manager-action-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 18px;
  }

  .qr-manager-warning {
    margin-top: 18px;
    padding: 16px;
    border: 1px solid rgba(255,190,90,0.25);
    border-radius: 15px;
    background: rgba(255,170,50,0.07);
    color: #d6c19c;
    line-height: 1.65;
  }

  .qr-manager-warning > strong {
    display: block;
    margin-bottom: 6px;
    color: #ffffff;
  }

  .qr-manager-state,
  .qr-manager-error {
    display: grid;
    justify-items: center;
    gap: 15px;
    text-align: center;
  }

  .qr-manager-state h2,
  .qr-manager-error h2 {
    color: #ffffff;
    font-size: 31px;
  }

  .qr-manager-state p,
  .qr-manager-error p {
    max-width: 680px;
    color: #c8c8c8;
    line-height: 1.75;
  }

  .qr-manager-error {
    border-color: rgba(255,100,100,0.25);
    background: rgba(255,60,60,0.07);
  }

  .qr-manager-loader {
    width: 42px;
    height: 42px;
    border: 4px solid rgba(110,110,110,0.28);
    border-top-color: #3da5ff;
    border-radius: 50%;
    animation: qr-manager-spin 0.8s linear infinite;
  }

  @keyframes qr-manager-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .qr-manager-no-results,
  .qr-manager-qr-error {
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    color: #9ca8b3;
    text-align: center;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 950px) {
    .qr-manager-page {
      padding: 65px 24px;
    }

    .qr-manager-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .qr-manager-record-list {
      max-height: 480px;
    }
  }

  @media (max-width: 650px) {
    .qr-manager-page {
      padding: 44px 12px;
    }

    .qr-manager-hero,
    .qr-manager-record-panel,
    .qr-manager-preview-panel,
    .qr-manager-state,
    .qr-manager-error {
      padding: 20px;
      border-radius: 22px;
    }

    .qr-manager-hero-actions,
    .qr-manager-hero-actions button {
      width: 100%;
    }

    .qr-manager-details,
    .qr-manager-action-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .qr-manager-action-grid button {
      width: 100%;
    }
  }

  @media (max-width: 430px) {
    .qr-manager-page {
      padding: 34px 8px;
    }

    .qr-manager-hero,
    .qr-manager-record-panel,
    .qr-manager-preview-panel {
      padding: 15px;
    }

    .qr-manager-preview {
      min-height: 300px;
      padding: 12px;
    }

    .qr-manager-record-button {
      grid-template-columns: 52px minmax(0, 1fr);
    }

    .qr-manager-record-image {
      width: 52px;
      height: 52px;
    }
  }
`;

export default QRManager;

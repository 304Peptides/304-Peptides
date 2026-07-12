import {
  useEffect,
  useState,
} from "react";

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

function formatUpdatedAt(
  value
) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function VerificationRecord({
  code,
  onNavigate = () => {},
}) {
  const [
    record,
    setRecord,
  ] = useState(null);

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

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadRecord() {
      if (!code) {
        setRecord(null);

        setError(
          "No product code was provided."
        );

        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `/api/documents/${encodeURIComponent(
              code
            )}`,
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
            "The verification service returned an invalid response."
          );
        }

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              "No published record was found for this product code."
          );
        }

        const publicRecord =
          result.record ||
          result.document ||
          result.data ||
          null;

        if (!publicRecord) {
          throw new Error(
            "No published record was found for this product code."
          );
        }

        setRecord(
          publicRecord
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

        setRecord(null);

        setError(
          requestError.message ||
            "The published record could not be loaded."
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

    loadRecord();

    return () => {
      controller.abort();
    };
  }, [
    code,
    refreshKey,
  ]);

  return (
    <>
      <style>
        {verificationCss}
      </style>

      <main className="verification-page">
        <section className="verification-inner">
          <header className="verification-header">
            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                onNavigate(
                  "home"
                )
              }
            >
              304 Peptides Home
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
              Quality &amp; COAs
            </button>
          </header>

          {loading && (
            <section className="verification-state">
              <div className="verification-loader" />

              <p className="eyebrow">
                PUBLIC VERIFICATION
              </p>

              <h1>
                Checking Published
                Record
              </h1>

              <p>
                Loading the public
                documentation record
                for product code{" "}
                <strong>
                  {code}
                </strong>
                .
              </p>
            </section>
          )}

          {!loading &&
            error && (
              <section className="verification-error">
                <div className="verification-mark verification-mark-error">
                  !
                </div>

                <p className="eyebrow">
                  RECORD NOT
                  AVAILABLE
                </p>

                <h1>
                  Verification Could
                  Not Be Completed
                </h1>

                <p>
                  {error}
                </p>

                <div className="verification-actions">
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() =>
                      setRefreshKey(
                        (
                          currentKey
                        ) =>
                          currentKey +
                          1
                      )
                    }
                  >
                    Try Again
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
                    View Quality Page
                  </button>
                </div>
              </section>
            )}

          {!loading &&
            !error &&
            record && (
              <>
                <section className="verification-hero">
                  <div className="verification-mark">
                    ✓
                  </div>

                  <p className="eyebrow">
                    PUBLISHED RECORD
                  </p>

                  <h1>
                    Public
                    Documentation
                    Available
                  </h1>

                  <p>
                    This page displays
                    the completed public
                    record currently
                    published for the
                    product code and
                    batch shown below.
                  </p>

                  <div className="verification-status-row">
                    <span>
                      Published
                    </span>

                    <span>
                      Reviewed Record
                    </span>

                    <span>
                      Batch Specific
                    </span>
                  </div>
                </section>

                <section className="verification-record">
                  <div className="verification-record-heading">
                    <div>
                      <p className="eyebrow">
                        PRODUCT
                        IDENTITY
                      </p>

                      <h2>
                        {
                          record.productName
                        }
                      </h2>

                      <p className="verification-code">
                        {
                          record.codeName
                        }{" "}
                        ·{" "}
                        {
                          record.strength
                        }
                      </p>
                    </div>

                    <span className="verification-published-pill">
                      Published
                    </span>
                  </div>

                  <div className="verification-grid">
                    <RecordBox
                      label="Product Name"
                      value={
                        record.productName
                      }
                    />

                    <RecordBox
                      label="Product Code"
                      value={
                        record.codeName
                      }
                    />

                    <RecordBox
                      label="Strength"
                      value={
                        record.strength
                      }
                    />

                    <RecordBox
                      label="Batch Number"
                      value={
                        record.batchNumber
                      }
                    />

                    <RecordBox
                      label="Testing Laboratory"
                      value={
                        record.labName
                      }
                    />

                    <RecordBox
                      label="Test Date"
                      value={formatDate(
                        record.testDate
                      )}
                    />

                    <RecordBox
                      label="Record Updated"
                      value={formatUpdatedAt(
                        record.updatedAt
                      )}
                    />

                    <RecordBox
                      label="Record Status"
                      value="Published"
                    />
                  </div>

                  {record.composition && (
                    <div className="verification-composition">
                      <span>
                        Documented
                        Composition
                      </span>

                      <strong>
                        {
                          record.composition
                        }
                      </strong>
                    </div>
                  )}

                  <div className="verification-document-actions">
                    <a
                      className="primary-btn verification-link"
                      href={
                        record.coaUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Certificate
                      Of Analysis
                    </a>

                    <a
                      className="secondary-btn verification-link"
                      href={
                        record.verificationUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Laboratory
                      Verification
                    </a>
                  </div>

                  <div className="verification-batch-warning">
                    <strong>
                      Batch-Specific
                      Record
                    </strong>

                    <p>
                      This record
                      applies only to
                      product code{" "}
                      <strong>
                        {
                          record.codeName
                        }
                      </strong>
                      , strength{" "}
                      <strong>
                        {
                          record.strength
                        }
                      </strong>
                      , and batch{" "}
                      <strong>
                        {
                          record.batchNumber
                        }
                      </strong>
                      . Confirm these
                      values match the
                      physical label
                      being reviewed.
                    </p>
                  </div>
                </section>

                <section className="verification-research-notice">
                  <p className="eyebrow">
                    RESEARCH USE
                    NOTICE
                  </p>

                  <h2>
                    For Research Use
                    Only
                  </h2>

                  <p>
                    Not intended for
                    human consumption.
                    This verification
                    page documents the
                    published
                    research-product
                    record and does not
                    provide medical or
                    usage guidance.
                  </p>
                </section>
              </>
            )}
        </section>
      </main>
    </>
  );
}

function RecordBox({
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

const verificationCss = `
  .verification-page,
  .verification-page *,
  .verification-page *::before,
  .verification-page *::after {
    box-sizing: border-box;
  }

  .verification-page {
    width: 100%;
    padding: 70px 30px;
    overflow-x: hidden;
  }

  .verification-inner {
    width: 100%;
    max-width: 1050px;
    margin: 0 auto;
  }

  .verification-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 22px;
  }

  .verification-hero,
  .verification-state,
  .verification-error,
  .verification-record,
  .verification-research-notice {
    padding: 42px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 30px;
    background:
      radial-gradient(
        circle at top,
        rgba(61,165,255,0.18),
        transparent 45%
      ),
      rgba(255,255,255,0.035);
    box-shadow:
      0 30px 85px rgba(0,0,0,0.4);
  }

  .verification-hero,
  .verification-state,
  .verification-error {
    display: grid;
    justify-items: center;
    gap: 15px;
    text-align: center;
  }

  .verification-hero {
    margin-bottom: 22px;
  }

  .verification-hero h1,
  .verification-state h1,
  .verification-error h1 {
    max-width: 800px;
    color: #ffffff;
    font-size: clamp(38px, 6vw, 58px);
    line-height: 1.08;
  }

  .verification-hero > p:last-of-type,
  .verification-state > p:last-of-type,
  .verification-error > p:last-of-type {
    max-width: 760px;
    color: #c8c8c8;
    font-size: 17px;
    line-height: 1.8;
  }

  .verification-mark {
    width: 72px;
    height: 72px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(61,165,255,0.42);
    border-radius: 50%;
    background: rgba(61,165,255,0.16);
    color: #9ed8ff;
    font-size: 36px;
    font-weight: 900;
  }

  .verification-mark-error {
    border-color: rgba(255,100,100,0.35);
    background: rgba(255,70,70,0.1);
    color: #ffd0d0;
  }

  .verification-status-row {
    display: flex;
    justify-content: center;
    gap: 9px;
    flex-wrap: wrap;
    margin-top: 8px;
  }

  .verification-status-row span,
  .verification-published-pill {
    display: inline-flex;
    padding: 8px 12px;
    border: 1px solid rgba(61,165,255,0.28);
    border-radius: 999px;
    background: rgba(61,165,255,0.1);
    color: #9ed8ff;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .verification-record {
    margin-bottom: 22px;
  }

  .verification-record-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }

  .verification-record-heading h2 {
    margin: 6px 0;
    color: #ffffff;
    font-size: clamp(30px, 5vw, 42px);
  }

  .verification-code {
    color: #9ed8ff;
    font-size: 17px;
    font-weight: 900;
  }

  .verification-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .verification-grid > div {
    min-width: 0;
    display: grid;
    gap: 6px;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 15px;
    background: rgba(0,0,0,0.22);
    overflow-wrap: anywhere;
  }

  .verification-grid span,
  .verification-composition span {
    color: #9ca8b3;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .verification-grid strong {
    color: #ffffff;
  }

  .verification-composition {
    display: grid;
    gap: 6px;
    margin-top: 14px;
    padding: 16px;
    border: 1px solid rgba(61,165,255,0.2);
    border-radius: 15px;
    background: rgba(61,165,255,0.08);
    color: #ffffff;
  }

  .verification-document-actions,
  .verification-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 20px;
  }

  .verification-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    text-decoration: none;
  }

  .verification-batch-warning {
    margin-top: 20px;
    padding: 17px;
    border: 1px solid rgba(255,190,90,0.24);
    border-radius: 15px;
    background: rgba(255,170,50,0.07);
    color: #d8c5a3;
    line-height: 1.7;
  }

  .verification-batch-warning > strong {
    display: block;
    margin-bottom: 5px;
    color: #ffffff;
  }

  .verification-research-notice {
    text-align: center;
  }

  .verification-research-notice h2 {
    margin: 8px 0 12px;
    color: #ffffff;
    font-size: 32px;
  }

  .verification-research-notice p:last-child {
    max-width: 760px;
    margin: 0 auto;
    color: #c8c8c8;
    line-height: 1.8;
  }

  .verification-error {
    border-color: rgba(255,100,100,0.25);
    background: rgba(255,60,60,0.07);
  }

  .verification-loader {
    width: 45px;
    height: 45px;
    border: 4px solid rgba(255,255,255,0.12);
    border-top-color: #9ed8ff;
    border-radius: 50%;
    animation: verification-spin 0.8s linear infinite;
  }

  @keyframes verification-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 650px) {
    .verification-page {
      padding: 44px 12px;
    }

    .verification-hero,
    .verification-state,
    .verification-error,
    .verification-record,
    .verification-research-notice {
      padding: 22px 18px;
      border-radius: 22px;
    }

    .verification-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .verification-header,
    .verification-header button,
    .verification-document-actions,
    .verification-document-actions a,
    .verification-actions,
    .verification-actions button {
      width: 100%;
    }
  }

  @media (max-width: 430px) {
    .verification-page {
      padding: 34px 8px;
    }

    .verification-hero,
    .verification-state,
    .verification-error,
    .verification-record,
    .verification-research-notice {
      padding: 15px;
    }
  }
`;

export default VerificationRecord;
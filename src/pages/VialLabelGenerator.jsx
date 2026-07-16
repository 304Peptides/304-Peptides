import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  fetchCatalogOverrides,
  mergeCatalogRecords,
} from "../data/catalogRuntime";

const ADMIN_SESSION_KEY = "304-document-admin-session";

const DEFAULTS = {
  lotNumber: "",
  qrUrl: "https://304peptides.com/quality",
  distributor: "Distributed by 304 Peptides · Shinnston, WV",
  disclaimer: "FOR RESEARCH USE ONLY · NOT FOR HUMAN CONSUMPTION",
  width: 2.25,
  height: 0.75,
  columns: 3,
  rows: 10,
  showQr: true,
  showLot: true,
  showDistributor: true,
};

function readAdminSecret() {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) || "";
  } catch {
    return "";
  }
}

function VialLabelGenerator({ onNavigate = () => {} }) {
  const [products, setProducts] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [settings, setSettings] = useState(DEFAULTS);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      setLoading(true);
      setError("");

      try {
        const secret = readAdminSecret();
        const records = await fetchCatalogOverrides(
          secret ? { admin: true, secret } : {}
        );
        const merged = mergeCatalogRecords(records, {
          includeHidden: Boolean(secret),
        });

        if (!active) return;
        setProducts(merged);
        const firstCode = merged[0]?.variants?.[0]?.codeName || "";
        setSelectedCode((current) => current || firstCode);
      } catch (requestError) {
        if (!active) return;
        const merged = mergeCatalogRecords([], { includeHidden: false });
        setProducts(merged);
        setSelectedCode((current) => current || merged[0]?.variants?.[0]?.codeName || "");
        setError(
          requestError.message ||
            "The saved catalog could not be loaded. The built-in catalog is shown instead."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  const variants = useMemo(
    () =>
      products.flatMap((product) =>
        (product.variants || []).map((variant) => ({
          ...variant,
          productName: product.name,
          productCodeName: product.codeName,
        }))
      ),
    [products]
  );

  const selected = useMemo(
    () => variants.find((variant) => variant.codeName === selectedCode) || variants[0],
    [selectedCode, variants]
  );

  const labelCount = Math.max(
    1,
    Math.min(120, Number(settings.columns || 1) * Number(settings.rows || 1))
  );

  useEffect(() => {
    let active = true;
    const value = String(settings.qrUrl || "").trim();

    if (!settings.showQr || !value) {
      setQrDataUrl("");
      return undefined;
    }

    QRCode.toDataURL(value, {
      width: 220,
      margin: 0,
      errorCorrectionLevel: "M",
    })
      .then((result) => {
        if (active) setQrDataUrl(result);
      })
      .catch(() => {
        if (active) setQrDataUrl("");
      });

    return () => {
      active = false;
    };
  }, [settings.qrUrl, settings.showQr]);

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function printLabels() {
    setMessage("");
    window.setTimeout(() => window.print(), 50);
  }

  function resetSettings() {
    setSettings(DEFAULTS);
    setMessage("Label settings reset.");
  }

  return (
    <main className="label-generator-page">
      <style>{styles}</style>

      <header className="label-generator-header no-print">
        <button type="button" className="label-back" onClick={() => onNavigate("missionControl")}>
          ← Mission Control
        </button>
        <div>
          <p className="label-eyebrow">PRODUCTION TOOL</p>
          <h1>Vial Label Generator</h1>
          <p>
            Build and print repeatable labels from the live catalog. Dimensions,
            sheet layout, lot information, QR destination, and required wording can
            all be adjusted before printing.
          </p>
        </div>
      </header>

      <section className="label-generator-layout">
        <aside className="label-controls no-print">
          <div className="label-control-heading">
            <div>
              <span>Label setup</span>
              <strong>{labelCount} labels per sheet</strong>
            </div>
            <button type="button" onClick={resetSettings}>Reset</button>
          </div>

          {error && <div className="label-alert label-alert-error">{error}</div>}
          {message && <div className="label-alert label-alert-success">{message}</div>}

          <label>
            Product and strength
            <select
              value={selected?.codeName || ""}
              onChange={(event) => setSelectedCode(event.target.value)}
              disabled={loading || !variants.length}
            >
              {variants.map((variant) => (
                <option key={variant.codeName} value={variant.codeName}>
                  {variant.productName} · {variant.strength} · {variant.codeName}
                  {variant.hidden || variant.productHidden ? " · Hidden" : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="label-control-grid">
            <label>
              Label width (in)
              <input
                type="number"
                min="1"
                max="4"
                step="0.05"
                value={settings.width}
                onChange={(event) => updateSetting("width", event.target.value)}
              />
            </label>
            <label>
              Label height (in)
              <input
                type="number"
                min="0.4"
                max="2"
                step="0.05"
                value={settings.height}
                onChange={(event) => updateSetting("height", event.target.value)}
              />
            </label>
            <label>
              Columns
              <input
                type="number"
                min="1"
                max="6"
                value={settings.columns}
                onChange={(event) => updateSetting("columns", event.target.value)}
              />
            </label>
            <label>
              Rows
              <input
                type="number"
                min="1"
                max="20"
                value={settings.rows}
                onChange={(event) => updateSetting("rows", event.target.value)}
              />
            </label>
          </div>

          <label>
            Lot / batch number
            <input
              type="text"
              value={settings.lotNumber}
              onChange={(event) => updateSetting("lotNumber", event.target.value)}
              placeholder="Example: 304-0726-A"
            />
          </label>

          <label>
            QR destination
            <input
              type="url"
              value={settings.qrUrl}
              onChange={(event) => updateSetting("qrUrl", event.target.value)}
              placeholder="https://304peptides.com/..."
            />
          </label>

          <label>
            Distributor line
            <input
              type="text"
              value={settings.distributor}
              onChange={(event) => updateSetting("distributor", event.target.value)}
            />
          </label>

          <label>
            Disclaimer
            <textarea
              rows="3"
              value={settings.disclaimer}
              onChange={(event) => updateSetting("disclaimer", event.target.value)}
            />
          </label>

          <div className="label-checks">
            <label>
              <input
                type="checkbox"
                checked={settings.showQr}
                onChange={(event) => updateSetting("showQr", event.target.checked)}
              />
              Show QR code
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.showLot}
                onChange={(event) => updateSetting("showLot", event.target.checked)}
              />
              Show lot number
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.showDistributor}
                onChange={(event) => updateSetting("showDistributor", event.target.checked)}
              />
              Show distributor line
            </label>
          </div>

          <button type="button" className="label-print-button" onClick={printLabels} disabled={!selected}>
            Print Label Sheet
          </button>

          <p className="label-print-tip">
            In the browser print window, choose <strong>Actual size / 100%</strong>,
            disable headers and footers, and use the label sheet’s recommended margins.
          </p>
        </aside>

        <section className="label-preview-wrap">
          <div className="label-preview-heading no-print">
            <div>
              <span>Live preview</span>
              <strong>
                {Number(settings.width || 0).toFixed(2)} × {Number(settings.height || 0).toFixed(2)} inches
              </strong>
            </div>
            <small>Dashed borders are print cut guides.</small>
          </div>

          <div
            className="label-sheet"
            style={{
              "--label-width": `${Number(settings.width || DEFAULTS.width)}in`,
              "--label-height": `${Number(settings.height || DEFAULTS.height)}in`,
              "--label-columns": Math.max(1, Math.min(6, Number(settings.columns || 1))),
            }}
          >
            {Array.from({ length: labelCount }, (_, index) => (
              <VialLabel
                key={index}
                product={selected}
                settings={settings}
                qrDataUrl={qrDataUrl}
              />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function VialLabel({ product, settings, qrDataUrl }) {
  return (
    <article className="vial-label">
      <div className="vial-label-main">
        <div className="vial-label-brand">304 PEPTIDES</div>
        <div className="vial-label-product">
          {product?.productCodeName || product?.productName || "PRODUCT"}
        </div>
        <div className="vial-label-strength">{product?.strength || "STRENGTH"}</div>
        <div className="vial-label-code">{product?.codeName || "CODE"}</div>
        {settings.showLot && settings.lotNumber && (
          <div className="vial-label-lot">LOT {settings.lotNumber}</div>
        )}
      </div>

      {settings.showQr && qrDataUrl && (
        <div className="vial-label-qr">
          <img src={qrDataUrl} alt="Verification QR code" />
        </div>
      )}

      <div className="vial-label-footer">
        <strong>{settings.disclaimer}</strong>
        {settings.showDistributor && settings.distributor && (
          <span>{settings.distributor}</span>
        )}
      </div>
    </article>
  );
}

const styles = `
  .label-generator-page {
    min-height: 100vh;
    background: #f3f4f6;
    color: #111827;
    padding: 32px;
  }
  .label-generator-header {
    max-width: 1450px;
    margin: 0 auto 24px;
    display: flex;
    align-items: flex-start;
    gap: 24px;
  }
  .label-generator-header h1 { margin: 4px 0 8px; font-size: clamp(2rem, 4vw, 3.25rem); }
  .label-generator-header p { margin: 0; max-width: 800px; color: #4b5563; line-height: 1.65; }
  .label-eyebrow { color: #c2410c !important; font-weight: 900; letter-spacing: .14em; font-size: .75rem; }
  .label-back, .label-control-heading button {
    border: 1px solid #d1d5db; background: #fff; border-radius: 12px; padding: 10px 14px; font-weight: 800; cursor: pointer;
  }
  .label-generator-layout { max-width: 1450px; margin: 0 auto; display: grid; grid-template-columns: minmax(300px, 410px) 1fr; gap: 24px; align-items: start; }
  .label-controls, .label-preview-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 22px; box-shadow: 0 18px 45px rgba(15,23,42,.07); }
  .label-controls { padding: 22px; position: sticky; top: 18px; }
  .label-control-heading, .label-preview-heading { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 18px; }
  .label-control-heading span, .label-preview-heading span { display: block; color: #6b7280; font-size: .78rem; text-transform: uppercase; letter-spacing: .1em; font-weight: 900; }
  .label-control-heading strong, .label-preview-heading strong { display: block; margin-top: 3px; }
  .label-controls > label, .label-control-grid label { display: grid; gap: 7px; margin-bottom: 15px; font-size: .84rem; font-weight: 800; }
  .label-controls input, .label-controls select, .label-controls textarea { width: 100%; box-sizing: border-box; border: 1px solid #d1d5db; border-radius: 11px; padding: 11px 12px; font: inherit; background: #fff; }
  .label-control-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .label-checks { display: grid; gap: 9px; margin: 8px 0 18px; }
  .label-checks label { display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: .9rem; }
  .label-checks input { width: auto; }
  .label-print-button { width: 100%; border: 0; border-radius: 13px; background: #ea580c; color: #fff; padding: 14px 18px; font-weight: 900; cursor: pointer; }
  .label-print-button:disabled { opacity: .5; cursor: not-allowed; }
  .label-print-tip { font-size: .78rem; color: #6b7280; line-height: 1.5; }
  .label-alert { border-radius: 12px; padding: 11px 12px; margin-bottom: 14px; font-size: .84rem; }
  .label-alert-error { background: #fef2f2; color: #991b1b; }
  .label-alert-success { background: #ecfdf5; color: #065f46; }
  .label-preview-wrap { padding: 22px; overflow: auto; }
  .label-preview-heading small { color: #6b7280; }
  .label-sheet { display: grid; grid-template-columns: repeat(var(--label-columns), var(--label-width)); grid-auto-rows: var(--label-height); gap: .08in; justify-content: center; width: fit-content; min-width: 100%; background: #fafafa; padding: .25in; box-sizing: border-box; }
  .vial-label { width: var(--label-width); height: var(--label-height); box-sizing: border-box; border: 1px dashed #9ca3af; background: #fff; display: grid; grid-template-columns: minmax(0,1fr) auto; grid-template-rows: 1fr auto; overflow: hidden; padding: .055in .065in .045in; font-family: Arial, sans-serif; line-height: 1; }
  .vial-label-main { min-width: 0; display: flex; flex-direction: column; justify-content: center; }
  .vial-label-brand { font-weight: 900; letter-spacing: .08em; font-size: 7.2pt; color: #c2410c; white-space: nowrap; }
  .vial-label-product { font-weight: 900; font-size: 8.4pt; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vial-label-strength { font-weight: 900; font-size: 10.6pt; margin-top: 1px; }
  .vial-label-code, .vial-label-lot { color: #374151; font-size: 5.8pt; margin-top: 2px; white-space: nowrap; }
  .vial-label-qr { display: flex; align-items: center; justify-content: center; padding-left: .04in; }
  .vial-label-qr img { width: .46in; height: .46in; display: block; }
  .vial-label-footer { grid-column: 1 / -1; display: grid; gap: 1px; margin-top: 2px; border-top: .5px solid #d1d5db; padding-top: 2px; min-width: 0; }
  .vial-label-footer strong { font-size: 4.4pt; letter-spacing: .025em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vial-label-footer span { font-size: 4pt; color: #4b5563; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (max-width: 960px) {
    .label-generator-page { padding: 18px; }
    .label-generator-layout { grid-template-columns: 1fr; }
    .label-controls { position: static; }
    .label-generator-header { flex-direction: column; }
  }
  @media print {
    @page { size: letter portrait; margin: .2in; }
    html, body, #root { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    body * { visibility: hidden !important; }
    .label-sheet, .label-sheet * { visibility: visible !important; }
    .label-sheet { position: absolute; left: 0; top: 0; padding: 0; gap: 0; min-width: 0; background: #fff; }
    .vial-label { break-inside: avoid; }
    .no-print { display: none !important; }
  }
`;

export default VialLabelGenerator;

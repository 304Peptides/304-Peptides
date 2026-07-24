import { useEffect, useMemo, useState } from "react";
import {
  AVAILABILITY_OPTIONS,
  fetchCatalogOverrides,
  mergeCatalogRecords,
  sanitizeCatalogImageUrl,
  slugifyCatalogValue,
} from "../data/catalogRuntime";

const ADMIN_SESSION_KEY = "304-document-admin-session";

const blankVariant = {
  productKey: "",
  productCodeName: "",
  name: "",
  category: "Additional Research Products",
  description: "",
  purity: "Batch Specific",
  isBestSeller: false,
  codeName: "",
  strength: "",
  price: "",
  unitCost: "0",
  imageUrl: "",
  composition: "",
  quantity: 0,
  trackQuantity: true,
  allowPreorder: false,
  availabilityMode: "in_stock",
  hidden: false,
  productHidden: false,
  lowStockThreshold: 5,
};

function getStoredSecret() {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) || "";
  } catch {
    return "";
  }
}

function saveStoredSecret(value) {
  try {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, value);
  } catch {
    // React state still keeps the secret during this page visit.
  }
}

function clearStoredSecret() {
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // Storage can be unavailable in restrictive browser modes.
  }
}

function cloneVariant(variant) {
  return {
    ...blankVariant,
    ...variant,
    price:
      Number.isFinite(Number(variant?.price))
        ? String(Number(variant.price).toFixed(2))
        : "",
    unitCost:
      Number.isFinite(Number(variant?.unitCost))
        ? String(Number(variant.unitCost).toFixed(2))
        : "0",
    quantity: Math.max(0, Math.floor(Number(variant?.quantity || 0))),
    lowStockThreshold: Math.max(
      0,
      Math.floor(Number(variant?.lowStockThreshold || 5))
    ),
    imageUrl:
      sanitizeCatalogImageUrl(
        variant?.imageUrl ||
        variant?.image ||
        ""
      ),
  };
}

function statusLabel(variant) {
  if (variant.productHidden || variant.hidden) {
    return "Hidden";
  }

  if (variant.availabilityMode === "preorder") {
    return "Preorder";
  }

  if (variant.availabilityMode === "out_of_stock") {
    return "Out of Stock";
  }

  if (variant.trackQuantity && Number(variant.quantity || 0) <= 0) {
    return variant.allowPreorder ? "Preorder" : "Out of Stock";
  }

  if (
    variant.trackQuantity &&
    Number(variant.quantity || 0) <= Number(variant.lowStockThreshold || 0)
  ) {
    return `Low Stock · ${Number(variant.quantity || 0)} left`;
  }

  return "In Stock";
}

function statusTone(variant) {
  const label = statusLabel(variant);

  if (label === "Hidden" || label === "Out of Stock") {
    return "danger";
  }

  if (label === "Preorder" || label.startsWith("Low Stock")) {
    return "warning";
  }

  return "success";
}

function formatMoney(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })
    : "—";
}

function ProductManager({ onNavigate = () => {} }) {
  const [adminSecret, setAdminSecret] = useState(getStoredSecret);
  const [secretInput, setSecretInput] = useState("");
  const [products, setProducts] = useState(() =>
    mergeCatalogRecords([], { includeHidden: true })
  );
  const [loading, setLoading] = useState(Boolean(getStoredSecret()));
  const [savingCode, setSavingCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [expandedProduct, setExpandedProduct] = useState("");
  const [editingVariant, setEditingVariant] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createDraft, setCreateDraft] = useState(blankVariant);

  async function loadCatalog(secret = adminSecret) {
    if (!secret) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const records = await fetchCatalogOverrides({ admin: true, secret });
      setProducts(
        mergeCatalogRecords(records, {
          includeHidden: true,
        })
      );
    } catch (requestError) {
      setProducts(mergeCatalogRecords([], { includeHidden: true }));
      setError(requestError.message || "The catalog could not be loaded.");

      if (/unauthorized|secret|authorization/i.test(requestError.message || "")) {
        clearStoredSecret();
        setAdminSecret("");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (adminSecret) {
      loadCatalog(adminSecret);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSecret]);

  const allVariants = useMemo(
    () => products.flatMap((product) => product.variants || []),
    [products]
  );

  const summary = useMemo(() => {
    const hiddenVariants = allVariants.filter(
      (variant) => variant.hidden || variant.productHidden
    );
    const trackedVariants = allVariants.filter(
      (variant) => variant.trackQuantity
    );
    const lowStockVariants = allVariants.filter((variant) => {
      if (!variant.trackQuantity || variant.hidden || variant.productHidden) {
        return false;
      }

      const quantity = Number(variant.quantity || 0);
      return quantity <= Number(variant.lowStockThreshold || 0);
    });
    const preorderVariants = allVariants.filter(
      (variant) => statusLabel(variant) === "Preorder"
    );

    return {
      products: products.length,
      variants: allVariants.length,
      hidden: hiddenVariants.length,
      tracked: trackedVariants.length,
      lowStock: lowStockVariants.length,
      preorder: preorderVariants.length,
      totalUnits: trackedVariants.reduce(
        (sum, variant) => sum + Number(variant.quantity || 0),
        0
      ),
    };
  }, [allVariants, products.length]);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return products.filter((product) => {
      const variants = product.variants || [];
      const productHidden = variants.length
        ? variants.every((variant) => variant.productHidden)
        : Boolean(product.productHidden);
      const hasVisibleVariant = variants.some(
        (variant) => !variant.hidden && !variant.productHidden
      );
      const hasPreorder = variants.some(
        (variant) => statusLabel(variant) === "Preorder"
      );
      const hasLowStock = variants.some((variant) =>
        statusLabel(variant).startsWith("Low Stock")
      );
      const hasOutOfStock = variants.some(
        (variant) => statusLabel(variant) === "Out of Stock"
      );

      const visibilityMatches =
        visibilityFilter === "all" ||
        (visibilityFilter === "visible" && hasVisibleVariant) ||
        (visibilityFilter === "hidden" && productHidden);

      const stockMatches =
        stockFilter === "all" ||
        (stockFilter === "preorder" && hasPreorder) ||
        (stockFilter === "low" && hasLowStock) ||
        (stockFilter === "out" && hasOutOfStock);

      const searchable = [
        product.name,
        product.codeName,
        product.category,
        ...variants.flatMap((variant) => [
          variant.codeName,
          variant.strength,
          variant.availabilityMode,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        visibilityMatches &&
        stockMatches &&
        (!normalized || searchable.includes(normalized))
      );
    });
  }, [products, search, stockFilter, visibilityFilter]);

  function unlock(event) {
    event.preventDefault();
    const secret = secretInput.trim();

    if (!secret) {
      setError("Enter the administrator secret.");
      return;
    }

    saveStoredSecret(secret);
    setError("");
    setAdminSecret(secret);
    setSecretInput("");
  }

  function signOut() {
    clearStoredSecret();
    setAdminSecret("");
    setProducts(mergeCatalogRecords([], { includeHidden: true }));
    setMessage("");
    setError("");
  }

  async function saveVariant(rawVariant, successMessage) {
    const draft = cloneVariant(rawVariant);
    const price = Number(draft.price);

    const imageUrl =
      sanitizeCatalogImageUrl(
        draft.imageUrl
      );

    if (!draft.name.trim() || !draft.strength.trim() || !draft.codeName.trim()) {
      throw new Error("Product name, strength, and product code are required.");
    }

    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Enter a valid price.");
    }

    const record = {
      ...draft,
      productKey:
        slugifyCatalogValue(draft.productKey) ||
        slugifyCatalogValue(draft.name),
      productCodeName:
        String(draft.productCodeName || draft.codeName)
          .trim()
          .toUpperCase(),
      codeName: String(draft.codeName).trim().toUpperCase(),
      name: draft.name.trim(),
      strength: draft.strength.trim(),
      category: draft.category.trim() || "Additional Research Products",
      description: draft.description.trim(),
      purity: draft.purity.trim() || "Batch Specific",
      composition: draft.composition.trim(),
      imageUrl,
      image: imageUrl,
      price,
      unitCost: Math.max(0, Number(draft.unitCost || 0)),
      quantity: Math.max(0, Math.floor(Number(draft.quantity || 0))),
      lowStockThreshold: Math.max(
        0,
        Math.floor(Number(draft.lowStockThreshold || 0))
      ),
      trackQuantity: Boolean(draft.trackQuantity),
      allowPreorder: Boolean(draft.allowPreorder),
      isBestSeller: Boolean(draft.isBestSeller),
      hidden: Boolean(draft.hidden),
      productHidden: Boolean(draft.productHidden),
      availabilityMode: draft.availabilityMode,
    };

    setSavingCode(record.codeName);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ variant: record }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || "The product could not be saved.");
      }

      setMessage(successMessage || result.message || `${record.codeName} saved.`);
      await loadCatalog(adminSecret);
      return result.record;
    } finally {
      setSavingCode("");
    }
  }

  async function saveEditingVariant(event) {
    event.preventDefault();

    try {
      await saveVariant(editingVariant, `${editingVariant.codeName} updated.`);
      setEditingVariant(null);
    } catch (saveError) {
      setError(saveError.message || "The product could not be saved.");
    }
  }

  async function createVariant(event) {
    event.preventDefault();

    try {
      await saveVariant(createDraft, `${createDraft.codeName} added to the catalog.`);
      setCreateDraft(blankVariant);
      setShowCreateForm(false);
      setExpandedProduct(
        slugifyCatalogValue(createDraft.productKey || createDraft.name)
      );
    } catch (saveError) {
      setError(saveError.message || "The product could not be added.");
    }
  }

  async function toggleVariantHidden(variant) {
    try {
      await saveVariant(
        { ...variant, hidden: !variant.hidden },
        `${variant.codeName} ${variant.hidden ? "restored" : "hidden"}.`
      );
    } catch (saveError) {
      setError(saveError.message || "The visibility could not be changed.");
    }
  }

  async function toggleProductHidden(product) {
    const variants = product.variants || [];
    const shouldHide = !variants.every((variant) => variant.productHidden);

    setSavingCode(product.productKey);
    setError("");
    setMessage("");

    try {
      for (const variant of variants) {
        await saveVariant(
          { ...variant, productHidden: shouldHide },
          ""
        );
      }

      setMessage(
        `${product.name} ${shouldHide ? "hidden from" : "restored to"} the storefront.`
      );
      await loadCatalog(adminSecret);
    } catch (saveError) {
      setError(saveError.message || "The product visibility could not be changed.");
    } finally {
      setSavingCode("");
    }
  }

  async function adjustQuantity(variant, change) {
    const nextQuantity = Math.max(
      0,
      Math.floor(Number(variant.quantity || 0)) + change
    );

    try {
      await saveVariant(
        {
          ...variant,
          trackQuantity: true,
          quantity: nextQuantity,
        },
        `${variant.codeName} quantity updated to ${nextQuantity}.`
      );
    } catch (saveError) {
      setError(saveError.message || "The quantity could not be updated.");
    }
  }

  function startNewVariant(product = null) {
    const first = product?.variants?.[0];

    setCreateDraft({
      ...blankVariant,
      ...(product
        ? {
            productKey: product.productKey,
            productCodeName: product.codeName,
            name: product.name,
            category: product.category,
            description: product.description,
            purity: product.purity,
            isBestSeller: product.isBestSeller,
            imageUrl:
              sanitizeCatalogImageUrl(
                first?.imageUrl ||
                first?.image ||
                ""
              ),
          }
        : {}),
    });
    setShowCreateForm(true);
    setError("");
    setMessage("");
  }

  if (!adminSecret) {
    return (
      <main className="catalog-admin-page">
        <style>{catalogAdminCss}</style>
        <section className="catalog-lock-card">
          <p className="eyebrow">MISSION CONTROL</p>
          <h1>Catalog & Inventory</h1>
          <p>
            Enter the same administrator secret used by Customer Manager and the
            documentation tools.
          </p>
          <form onSubmit={unlock} className="catalog-lock-form">
            <input
              type="password"
              value={secretInput}
              onChange={(event) => setSecretInput(event.target.value)}
              placeholder="Administrator secret"
              autoComplete="current-password"
            />
            <button type="submit" className="primary-btn">
              Unlock Catalog
            </button>
          </form>
          {error && <div className="catalog-message error">{error}</div>}
          <button
            type="button"
            className="secondary-btn"
            onClick={() => onNavigate("missionControl")}
          >
            Back to Mission Control
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="catalog-admin-page">
      <style>{catalogAdminCss}</style>
      <section className="catalog-admin-inner">
        <header className="catalog-admin-hero">
          <div>
            <p className="eyebrow">MISSION CONTROL</p>
            <h1>Catalog & Inventory</h1>
            <p>
              Add products and strengths, adjust quantity, choose in-stock or
              preorder messaging, and hide products without deleting them.
            </p>
          </div>
          <div className="catalog-admin-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("missionControl")}
            >
              Mission Control
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("products")}
            >
              View Storefront
            </button>
            <button type="button" className="secondary-btn" onClick={signOut}>
              Lock Admin
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => startNewVariant()}
            >
              Add Product
            </button>
          </div>
        </header>

        <section className="catalog-summary-grid">
          <SummaryCard label="Products" value={summary.products} />
          <SummaryCard label="Strength Options" value={summary.variants} />
          <SummaryCard label="Tracked Units" value={summary.totalUnits} />
          <SummaryCard label="Low / Empty" value={summary.lowStock} warning />
          <SummaryCard label="Preorders" value={summary.preorder} />
          <SummaryCard label="Hidden" value={summary.hidden} />
        </section>

        {(error || message) && (
          <div className={`catalog-message ${error ? "error" : "success"}`}>
            {error || message}
          </div>
        )}

        <section className="catalog-filter-bar">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product, code, category, or strength"
          />
          <select
            value={visibilityFilter}
            onChange={(event) => setVisibilityFilter(event.target.value)}
          >
            <option value="all">All visibility</option>
            <option value="visible">Visible products</option>
            <option value="hidden">Hidden products</option>
          </select>
          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value)}
          >
            <option value="all">All stock states</option>
            <option value="low">Low stock</option>
            <option value="preorder">Preorder</option>
            <option value="out">Out of stock</option>
          </select>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => loadCatalog(adminSecret)}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </section>

        {loading ? (
          <section className="catalog-empty">Loading the live catalog…</section>
        ) : filteredProducts.length === 0 ? (
          <section className="catalog-empty">No products match these filters.</section>
        ) : (
          <section className="catalog-product-list">
            {filteredProducts.map((product) => {
              const expanded = expandedProduct === product.productKey;
              const allHidden = (product.variants || []).every(
                (variant) => variant.productHidden
              );

              return (
                <article className="catalog-product-card" key={product.productKey}>
                  <button
                    type="button"
                    className="catalog-product-heading"
                    onClick={() =>
                      setExpandedProduct(expanded ? "" : product.productKey)
                    }
                  >
                    <div>
                      <span className="catalog-product-category">
                        {product.category}
                      </span>
                      <h2>{product.name}</h2>
                      <p>
                        {(product.variants || []).length} strength option
                        {(product.variants || []).length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="catalog-product-heading-right">
                      <span className={`catalog-pill ${allHidden ? "danger" : "success"}`}>
                        {allHidden ? "Hidden" : "Visible"}
                      </span>
                      <span>{expanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="catalog-product-body">
                      <div className="catalog-product-toolbar">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => startNewVariant(product)}
                        >
                          Add Strength
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => toggleProductHidden(product)}
                          disabled={savingCode === product.productKey}
                        >
                          {allHidden ? "Restore Product" : "Hide Entire Product"}
                        </button>
                      </div>

                      <div className="catalog-variant-grid">
                        {(product.variants || []).map((variant) => (
                          <article
                            className={`catalog-variant-card ${
                              variant.hidden || variant.productHidden ? "is-hidden" : ""
                            }`}
                            key={variant.codeName}
                          >
                            <div className="catalog-variant-topline">
                              <div>
                                <strong>{variant.strength}</strong>
                                <small>{variant.codeName}</small>
                              </div>
                              <span className={`catalog-pill ${statusTone(variant)}`}>
                                {statusLabel(variant)}
                              </span>
                            </div>

                            <div className="catalog-variant-details">
                              <span>
                                <small>Price</small>
                                <strong>{formatMoney(variant.price)}</strong>
                              </span>
                              <span>
                                <small>Quantity</small>
                                <strong>
                                  {variant.trackQuantity ? variant.quantity : "Not tracked"}
                                </strong>
                              </span>
                            </div>

                            <div className="catalog-quantity-row">
                              <button
                                type="button"
                                onClick={() => adjustQuantity(variant, -1)}
                                disabled={savingCode === variant.codeName}
                                aria-label={`Decrease ${variant.codeName} quantity`}
                              >
                                −
                              </button>
                              <button
                                type="button"
                                onClick={() => adjustQuantity(variant, 1)}
                                disabled={savingCode === variant.codeName}
                                aria-label={`Increase ${variant.codeName} quantity`}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                className="catalog-edit-link"
                                onClick={() => setEditingVariant(cloneVariant(variant))}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="catalog-edit-link"
                                onClick={() => toggleVariantHidden(variant)}
                                disabled={savingCode === variant.codeName}
                              >
                                {variant.hidden ? "Restore" : "Hide"}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </section>

      {(editingVariant || showCreateForm) && (
        <VariantEditor
          title={editingVariant ? "Edit Product Strength" : "Add Product or Strength"}
          draft={editingVariant || createDraft}
          setDraft={editingVariant ? setEditingVariant : setCreateDraft}
          onSubmit={editingVariant ? saveEditingVariant : createVariant}
          onClose={() => {
            setEditingVariant(null);
            setShowCreateForm(false);
          }}
          saving={Boolean(savingCode)}
        />
      )}
    </main>
  );
}

function VariantEditor({
  title,
  draft,
  setDraft,
  onSubmit,
  onClose,
  saving,
}) {
  function setField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="catalog-modal-backdrop" role="presentation">
      <section className="catalog-modal" role="dialog" aria-modal="true">
        <div className="catalog-modal-heading">
          <div>
            <p className="eyebrow">CATALOG RECORD</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="catalog-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="catalog-editor-form">
          <div className="catalog-form-grid two">
            <Field label="Product name">
              <input
                value={draft.name}
                onChange={(event) => setField("name", event.target.value)}
                required
              />
            </Field>
            <Field label="Product group key">
              <input
                value={draft.productKey}
                onChange={(event) => setField("productKey", event.target.value)}
                placeholder="auto-created from product name"
              />
            </Field>
            <Field label="Product display code">
              <input
                value={draft.productCodeName}
                onChange={(event) =>
                  setField("productCodeName", event.target.value.toUpperCase())
                }
                placeholder="304-3R"
              />
            </Field>
            <Field label="Variant product code">
              <input
                value={draft.codeName}
                onChange={(event) =>
                  setField("codeName", event.target.value.toUpperCase())
                }
                placeholder="304-3R-30"
                required
              />
            </Field>
            <Field label="Strength">
              <input
                value={draft.strength}
                onChange={(event) => setField("strength", event.target.value)}
                placeholder="30mg"
                required
              />
            </Field>
            <Field label="Category">
              <input
                value={draft.category}
                onChange={(event) => setField("category", event.target.value)}
              />
            </Field>
            <Field label="Price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(event) => setField("price", event.target.value)}
                required
              />
            </Field>
            <Field label="Unit cost (for accounting)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.unitCost}
                onChange={(event) => setField("unitCost", event.target.value)}
              />
            </Field>
            <Field label="Quantity">
              <input
                type="number"
                min="0"
                step="1"
                value={draft.quantity}
                onChange={(event) => setField("quantity", event.target.value)}
              />
            </Field>
            <Field label="Customer status">
              <select
                value={draft.availabilityMode}
                onChange={(event) =>
                  setField("availabilityMode", event.target.value)
                }
              >
                {AVAILABILITY_OPTIONS.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Low-stock warning at">
              <input
                type="number"
                min="0"
                step="1"
                value={draft.lowStockThreshold}
                onChange={(event) =>
                  setField("lowStockThreshold", event.target.value)
                }
              />
            </Field>
            <Field label="Batch-specific note">
              <input
                value={draft.purity}
                onChange={(event) => setField("purity", event.target.value)}
                placeholder="Example: See published batch record"
              />
            </Field>
            <Field label="Custom image URL (optional)">
              <input
                value={draft.imageUrl}
                onChange={(event) => setField("imageUrl", event.target.value)}
                placeholder="Leave blank to use the bundled product image"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={draft.description}
              onChange={(event) => setField("description", event.target.value)}
              rows="4"
            />
          </Field>

          <Field label="Composition / variant notes">
            <input
              value={draft.composition}
              onChange={(event) => setField("composition", event.target.value)}
            />
          </Field>

          <div className="catalog-checkbox-grid">
            <Checkbox
              label="Track quantity"
              checked={draft.trackQuantity}
              onChange={(value) => setField("trackQuantity", value)}
            />
            <Checkbox
              label="Allow preorder when quantity reaches zero"
              checked={draft.allowPreorder}
              onChange={(value) => setField("allowPreorder", value)}
            />
            <Checkbox
              label="Best seller"
              checked={draft.isBestSeller}
              onChange={(value) => setField("isBestSeller", value)}
            />
            <Checkbox
              label="Hide this strength"
              checked={draft.hidden}
              onChange={(value) => setField("hidden", value)}
            />
            <Checkbox
              label="Hide the entire product group"
              checked={draft.productHidden}
              onChange={(value) => setField("productHidden", value)}
            />
          </div>

          <div className="catalog-modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Saving…" : "Save Product"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="catalog-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="catalog-checkbox">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function SummaryCard({ label, value, warning = false }) {
  return (
    <article className={`catalog-summary-card ${warning ? "warning" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

const catalogAdminCss = `
.catalog-admin-page { min-height: 100vh; padding: 110px 22px 80px; background: #07090c; color: #fff; }
.catalog-admin-inner, .catalog-lock-card { width: min(1180px, 100%); margin: 0 auto; }
.catalog-lock-card { max-width: 620px; padding: 42px; border-radius: 28px; border: 1px solid rgba(255,255,255,.1); background: radial-gradient(circle at top right, rgba(61,165,255,.18), transparent 38%), #11151b; box-shadow: 0 28px 80px rgba(0,0,0,.4); }
.catalog-lock-card h1, .catalog-admin-hero h1 { margin: 0 0 12px; font-size: clamp(34px, 5vw, 56px); }
.catalog-lock-card p, .catalog-admin-hero p { color: #b9c2ce; line-height: 1.7; }
.catalog-lock-form { display: grid; gap: 14px; margin: 26px 0 18px; }
.catalog-lock-form input, .catalog-filter-bar input, .catalog-filter-bar select, .catalog-field input, .catalog-field select, .catalog-field textarea { width: 100%; box-sizing: border-box; border: 1px solid rgba(255,255,255,.13); background: #0c1117; color: #fff; border-radius: 14px; padding: 13px 14px; font: inherit; }
.catalog-admin-hero { display: flex; justify-content: space-between; gap: 28px; align-items: flex-start; padding: 34px; border-radius: 28px; border: 1px solid rgba(255,255,255,.09); background: radial-gradient(circle at top right, rgba(61,165,255,.18), transparent 38%), #11151b; }
.catalog-admin-hero > div:first-child { max-width: 720px; }
.catalog-admin-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.catalog-summary-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
.catalog-summary-card { min-height: 92px; padding: 18px; border-radius: 18px; border: 1px solid rgba(255,255,255,.09); background: #11151b; display: grid; align-content: center; gap: 8px; }
.catalog-summary-card span { color: #99a7b8; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; font-weight: 800; }
.catalog-summary-card strong { font-size: 28px; }
.catalog-summary-card.warning { border-color: rgba(255,183,77,.38); background: rgba(255,183,77,.08); }
.catalog-message { padding: 14px 16px; border-radius: 14px; margin: 14px 0; font-weight: 700; }
.catalog-message.error { background: rgba(255,83,83,.12); border: 1px solid rgba(255,83,83,.36); color: #ffb2b2; }
.catalog-message.success { background: rgba(80,211,145,.12); border: 1px solid rgba(80,211,145,.34); color: #b8f4d2; }
.catalog-filter-bar { display: grid; grid-template-columns: minmax(260px, 1fr) 180px 180px auto; gap: 12px; padding: 18px; border-radius: 20px; border: 1px solid rgba(255,255,255,.09); background: #10141a; margin-bottom: 18px; }
.catalog-product-list { display: grid; gap: 14px; }
.catalog-product-card { border: 1px solid rgba(255,255,255,.09); border-radius: 22px; overflow: hidden; background: #10141a; }
.catalog-product-heading { width: 100%; display: flex; justify-content: space-between; align-items: center; text-align: left; color: inherit; border: 0; background: transparent; padding: 22px; cursor: pointer; }
.catalog-product-heading h2 { margin: 5px 0; font-size: 25px; }
.catalog-product-heading p { margin: 0; color: #97a5b5; }
.catalog-product-category { color: #8dccff; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .09em; }
.catalog-product-heading-right { display: flex; align-items: center; gap: 14px; }
.catalog-product-body { padding: 0 22px 22px; }
.catalog-product-toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.catalog-variant-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.catalog-variant-card { border: 1px solid rgba(255,255,255,.09); border-radius: 18px; padding: 16px; background: #0b0f14; }
.catalog-variant-card.is-hidden { opacity: .62; }
.catalog-variant-topline { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.catalog-variant-topline strong { display: block; font-size: 19px; }
.catalog-variant-topline small { display: block; margin-top: 3px; color: #8d9aab; }
.catalog-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 7px 10px; font-size: 11px; font-weight: 900; white-space: nowrap; }
.catalog-pill.success { color: #b7f5d1; background: rgba(80,211,145,.13); border: 1px solid rgba(80,211,145,.3); }
.catalog-pill.warning { color: #ffe0a3; background: rgba(255,183,77,.12); border: 1px solid rgba(255,183,77,.32); }
.catalog-pill.danger { color: #ffb4b4; background: rgba(255,83,83,.11); border: 1px solid rgba(255,83,83,.3); }
.catalog-variant-details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 15px 0; }
.catalog-variant-details span { border-radius: 12px; background: rgba(255,255,255,.04); padding: 10px; }
.catalog-variant-details small, .catalog-variant-details strong { display: block; }
.catalog-variant-details small { color: #8290a0; margin-bottom: 4px; }
.catalog-quantity-row { display: grid; grid-template-columns: 42px 42px 1fr 1fr; gap: 8px; }
.catalog-quantity-row button { min-height: 40px; border-radius: 11px; border: 1px solid rgba(255,255,255,.12); background: #151b23; color: #fff; cursor: pointer; }
.catalog-edit-link { font-weight: 800; }
.catalog-empty { padding: 44px; text-align: center; color: #a7b3c2; border: 1px dashed rgba(255,255,255,.14); border-radius: 22px; }
.catalog-modal-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.76); backdrop-filter: blur(8px); display: grid; place-items: center; padding: 18px; overflow: auto; }
.catalog-modal { width: min(900px, 100%); max-height: calc(100vh - 36px); overflow: auto; border-radius: 24px; border: 1px solid rgba(255,255,255,.13); background: #10151c; box-shadow: 0 30px 100px rgba(0,0,0,.7); padding: 24px; }
.catalog-modal-heading { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; margin-bottom: 18px; }
.catalog-modal-heading h2 { margin: 4px 0 0; font-size: 30px; }
.catalog-close { border: 0; background: rgba(255,255,255,.08); color: #fff; border-radius: 12px; width: 42px; height: 42px; font-size: 28px; cursor: pointer; }
.catalog-editor-form { display: grid; gap: 14px; }
.catalog-form-grid.two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.catalog-field { display: grid; gap: 7px; color: #c7d0dc; font-weight: 700; font-size: 13px; }
.catalog-field textarea { resize: vertical; }
.catalog-checkbox-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.catalog-checkbox { display: flex; align-items: center; gap: 9px; padding: 11px 13px; border: 1px solid rgba(255,255,255,.09); border-radius: 13px; background: rgba(255,255,255,.03); }
.catalog-checkbox input { width: 18px; height: 18px; }
.catalog-modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 8px; }
@media (max-width: 980px) {
  .catalog-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .catalog-variant-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .catalog-filter-bar { grid-template-columns: 1fr 1fr; }
  .catalog-admin-hero { flex-direction: column; }
  .catalog-admin-actions { justify-content: flex-start; }
}
@media (max-width: 640px) {
  .catalog-admin-page { padding: 94px 12px 60px; }
  .catalog-summary-grid, .catalog-variant-grid, .catalog-form-grid.two, .catalog-checkbox-grid, .catalog-filter-bar { grid-template-columns: 1fr; }
  .catalog-product-heading { align-items: flex-start; }
  .catalog-product-heading-right { flex-direction: column; align-items: flex-end; }
  .catalog-quantity-row { grid-template-columns: 42px 42px 1fr; }
  .catalog-quantity-row button:last-child { grid-column: 1 / -1; }
}
`;

export default ProductManager;

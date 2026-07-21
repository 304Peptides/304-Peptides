import {
  categories as staticCategories,
  products as staticProducts,
} from "./products";

export const AVAILABILITY_OPTIONS = [
  ["in_stock", "In Stock"],
  ["preorder", "Preorder"],
  ["out_of_stock", "Out of Stock"],
];

export function slugifyCatalogValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isGeneratedCatalogAssetUrl(value) {
  const normalized =
    String(value || "").trim();

  if (!normalized) {
    return false;
  }

  let pathname =
    normalized;

  try {
    pathname =
      new URL(
        normalized,
        "https://catalog.local"
      ).pathname;
  } catch {
    pathname =
      normalized;
  }

  return (
    pathname.startsWith(
      "/src/assets/"
    ) ||
    pathname.startsWith(
      "/@fs/"
    ) ||
    /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(
      pathname
    )
  );
}

export function sanitizeCatalogImageUrl(value) {
  const normalized =
    String(value || "").trim();

  return isGeneratedCatalogAssetUrl(
    normalized
  )
    ? ""
    : normalized;
}

export function flattenStaticProducts() {
  return staticProducts.flatMap((product) => {
    const productKey =
      product.productKey ||
      slugifyCatalogValue(product.name || product.codeName);
    const variants = product.variants?.length
      ? product.variants
      : [product];

    return variants.map((variant) => ({
      productKey,
      productCodeName: product.codeName || variant.codeName,
      name: product.name || variant.name || "",
      category: product.category || "Additional Research Products",
      description: product.description || "",
      purity: product.purity || "≥ 99% Purity",
      isBestSeller: Boolean(product.isBestSeller),
      codeName: variant.codeName || product.codeName || "",
      strength: variant.strength || product.strength || "",
      price: Number.isFinite(Number(variant.price ?? product.price))
        ? Number(variant.price ?? product.price)
        : null,
      image: variant.image || product.image || "",
      composition: variant.composition || product.composition || "",
      quantity: 0,
      trackQuantity: false,
      availabilityMode: "in_stock",
      allowPreorder: false,
      hidden: false,
      productHidden: false,
      source: "static",
    }));
  });
}

export function getVariantAvailability(variant) {
  if (variant?.hidden || variant?.productHidden) {
    return {
      key: "hidden",
      label: "Hidden",
      purchasable: false,
    };
  }

  const mode = String(variant?.availabilityMode || "in_stock");
  const quantity = Math.max(0, Math.floor(Number(variant?.quantity || 0)));
  const trackQuantity = variant?.trackQuantity === true;
  const allowPreorder = variant?.allowPreorder === true;

  if (mode === "out_of_stock") {
    return {
      key: "out_of_stock",
      label: "Out of Stock",
      purchasable: false,
    };
  }

  if (mode === "preorder") {
    return {
      key: "preorder",
      label: "Preorder",
      purchasable: true,
    };
  }

  if (trackQuantity && quantity <= 0) {
    return allowPreorder
      ? {
          key: "preorder",
          label: "Preorder",
          purchasable: true,
        }
      : {
          key: "out_of_stock",
          label: "Out of Stock",
          purchasable: false,
        };
  }

  return {
    key: "in_stock",
    label: "In Stock",
    purchasable: true,
  };
}

function normalizeOverride(record) {
  const price = Number(record?.price);
  const quantity = Math.max(0, Math.floor(Number(record?.quantity || 0)));

  return {
    ...record,
    productKey:
      slugifyCatalogValue(record?.productKey) ||
      slugifyCatalogValue(record?.name || record?.codeName),
    codeName: String(record?.codeName || "").trim().toUpperCase(),
    name: String(record?.name || "").trim(),
    strength: String(record?.strength || "").trim(),
    price: Number.isFinite(price) && price >= 0 ? price : null,
    quantity,
    trackQuantity: record?.trackQuantity === true,
    allowPreorder: record?.allowPreorder === true,
    hidden: record?.hidden === true,
    productHidden: record?.productHidden === true,
    availabilityMode: ["in_stock", "preorder", "out_of_stock"].includes(
      record?.availabilityMode
    )
      ? record.availabilityMode
      : "in_stock",
    source: record?.source || "override",
  };
}

export function mergeCatalogRecords(records = [], options = {}) {
  const includeHidden = options.includeHidden === true;
  const variantsByCode = new Map(
    flattenStaticProducts().map((variant) => [variant.codeName, variant])
  );

  for (const rawRecord of Array.isArray(records) ? records : []) {
    const record = normalizeOverride(rawRecord);

    if (!record.codeName) {
      continue;
    }

    const existing =
      variantsByCode.get(
        record.codeName
      ) || {};

    const overrideImage =
      sanitizeCatalogImageUrl(
        rawRecord?.imageUrl
      ) ||
      sanitizeCatalogImageUrl(
        rawRecord?.image
      );

    const nextRecord = {
      ...existing,
      ...record,
      source:
        existing.codeName
          ? "override"
          : "new",
    };

    if (overrideImage) {
      nextRecord.image =
        overrideImage;

      nextRecord.imageUrl =
        overrideImage;
    } else if (
      existing.codeName
    ) {
      const staticImage =
        existing.image ||
        existing.imageUrl ||
        "";

      nextRecord.image =
        staticImage;

      nextRecord.imageUrl =
        staticImage;
    } else {
      nextRecord.image = "";
      nextRecord.imageUrl = "";
    }

    variantsByCode.set(
      record.codeName,
      nextRecord
    );
  }

  const grouped = new Map();

  for (const rawVariant of variantsByCode.values()) {
    const variant = normalizeOverride(rawVariant);

    if (!includeHidden && (variant.hidden || variant.productHidden)) {
      continue;
    }

    const key =
      variant.productKey ||
      slugifyCatalogValue(variant.name || variant.codeName);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push({
      ...variant,
      availability: getVariantAvailability(variant),
    });
  }

  return Array.from(grouped.entries())
    .map(([productKey, variants]) => {
      variants.sort((left, right) =>
        String(left.strength || left.codeName).localeCompare(
          String(right.strength || right.codeName),
          undefined,
          { numeric: true }
        )
      );

      const first = variants[0];
      const productCodeName =
        first.productCodeName || first.codeName || productKey.toUpperCase();

      return {
        productKey,
        name: first.name || first.codeName,
        codeName: productCodeName,
        strength:
          variants.length === 1
            ? first.strength
            : variants.map((item) => item.strength).filter(Boolean).join("–"),
        category: first.category || "Additional Research Products",
        description: first.description || "Research-use catalog product.",
        purity: first.purity || "≥ 99% Purity",
        isBestSeller: Boolean(first.isBestSeller),
        image: first.image || first.imageUrl || "",
        price: first.price,
        hidden: variants.every((variant) => variant.hidden),
        productHidden: variants.some((variant) => variant.productHidden),
        variants,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getCatalogCategories(products) {
  const dynamic = Array.from(
    new Set(
      products
        .map((product) => product.category)
        .filter(Boolean)
    )
  ).sort();

  const ordered = staticCategories.filter(
    (category) =>
      category === "All Products" ||
      category === "Best Sellers" ||
      dynamic.includes(category)
  );

  const extras = dynamic.filter((category) => !ordered.includes(category));

  return [...ordered, ...extras];
}

export async function fetchCatalogOverrides(options = {}) {
  const admin = options.admin === true;
  const secret = String(options.secret || "").trim();
  const response = await fetch(admin ? "/api/admin/catalog" : "/api/catalog", {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(admin && secret
        ? {
            Authorization: `Bearer ${secret}`,
          }
        : {}),
    },
    cache: "no-store",
    signal: options.signal,
  });

  const text = await response.text();
  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("The catalog service returned an invalid response.");
  }

  if (!response.ok || !result.success) {
    throw new Error(result.error || "The catalog could not be loaded.");
  }

  return Array.isArray(result.records) ? result.records : [];
}

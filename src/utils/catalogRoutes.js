import {
  mergeCatalogRecords,
  slugifyCatalogValue,
} from "../data/catalogRuntime";

const staticCatalogProducts =
  mergeCatalogRecords([]);

function decodeRouteSegment(value) {
  try {
    return decodeURIComponent(
      String(value || "")
    );
  } catch {
    return String(value || "");
  }
}

export function getProductPath(
  product
) {
  const productKey =
    slugifyCatalogValue(
      product?.productKey ||
        product?.baseName ||
        product?.name ||
        product?.codeName
    );

  const variantSlug =
    slugifyCatalogValue(
      product?.codeName ||
        product?.strength
    );

  if (!productKey) {
    return "/products";
  }

  if (!variantSlug) {
    return `/products/${productKey}`;
  }

  return `/products/${productKey}/${variantSlug}`;
}

export function readProductRoute(
  pathname = window.location.pathname
) {
  const normalizedPath =
    String(pathname || "/")
      .replace(/\/+$/, "") ||
    "/";

  if (
    !normalizedPath.startsWith(
      "/products/"
    )
  ) {
    return null;
  }

  const segments =
    normalizedPath
      .slice("/products/".length)
      .split("/")
      .filter(Boolean)
      .map(decodeRouteSegment);

  if (segments.length === 0) {
    return null;
  }

  return {
    productKey:
      slugifyCatalogValue(
        segments[0]
      ),

    variantSlug:
      slugifyCatalogValue(
        segments[1] || ""
      ),
  };
}

export function resolveCatalogProduct(
  productKey,
  variantSlug = "",
  overrideRecords = []
) {
  const normalizedProductKey =
    slugifyCatalogValue(
      productKey
    );

  const normalizedVariantSlug =
    slugifyCatalogValue(
      variantSlug
    );

  const catalogProducts =
    Array.isArray(overrideRecords) &&
    overrideRecords.length > 0
      ? mergeCatalogRecords(
          overrideRecords
        )
      : staticCatalogProducts;

  const product =
    catalogProducts.find(
      (catalogProduct) =>
        catalogProduct.productKey ===
        normalizedProductKey
    );

  if (!product) {
    return null;
  }

  const variants =
    product.variants?.length > 0
      ? product.variants
      : [product];

  let selectedVariant = null;

  if (normalizedVariantSlug) {
    selectedVariant =
      variants.find(
        (variant) =>
          slugifyCatalogValue(
            variant.codeName
          ) ===
          normalizedVariantSlug
      );

    if (!selectedVariant) {
      return null;
    }
  } else {
    selectedVariant =
      variants[0];
  }

  return {
    ...product,
    ...selectedVariant,

    name:
      product.name,

    baseName:
      product.name,

    productKey:
      product.productKey,

    variants,
  };
}

export function getProductFromPathname(
  pathname = window.location.pathname,
  overrideRecords = []
) {
  const route =
    readProductRoute(pathname);

  if (!route) {
    return null;
  }

  return resolveCatalogProduct(
    route.productKey,
    route.variantSlug,
    overrideRecords
  );
}
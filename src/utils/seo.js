// 304 SEO CONTROLLER

const SITE_NAME = "304 Peptides";
const SITE_URL = "https://304peptides.com";

const publicPageSeo = {
  home: {
    title:
      "304 Peptides | Research-Use Products & Documentation",

    description:
      "Explore research-use products from 304 Peptides with organized documentation, COA transparency, product verification, and professional customer support.",

    path: "/",
  },

  products: {
    title:
      "Research Products | 304 Peptides",

    description:
      "Browse the 304 Peptides research-use catalog by category, strength, product code, availability, and published documentation status.",

    path: "/products",
  },

  quality: {
    title:
      "Quality Standards & Documentation | 304 Peptides",

    description:
      "Review the documentation-first quality standards, product verification approach, and COA transparency used by 304 Peptides.",

    path: "/quality",
  },

  partners: {
    title:
      "Affiliate Program | 304 Peptides",

    description:
      "Learn about the 304 Peptides Affiliate Program, responsible promotion guidelines, custom referral codes, tracking, and reward opportunities.",

    path: "/affiliate",
  },

  faq: {
    title:
      "Frequently Asked Questions | 304 Peptides",

    description:
      "Find answers about 304 Peptides accounts, ordering, documentation, product verification, shipping, and research-use policies.",

    path: "/faq",
  },

  contact: {
    title:
      "Contact 304 Peptides",

    description:
      "Contact 304 Peptides for customer support, order assistance, documentation questions, and general website help.",

    path: "/contact",
  },

  researchAgreement: {
    title:
      "Research Agreement | 304 Peptides",

    description:
      "Review the 304 Peptides research-use agreement, customer responsibilities, and product-use restrictions.",

    path: "/research-agreement",
  },
};

const noIndexPages = new Set([
  "login",
  "createAccount",
  "dashboard",
  "changePassword",
  "partnerApplication",
  "partnerHQ",
  "marketingCenter",
  "missionControl",
  "orderManager",
  "affiliateManager",
  "inventoryManager",
  "accountingManager",
  "productManager",
  "couponManager",
  "vialLabelGenerator",
  "shippingCenter",
  "coaManager",
  "qrManager",
  "customerManager",
  "siteSettings",
  "launchChecklist",
  "cart",
  "checkout",
  "orderConfirmation",
  "verification",
  "notFound",
]);

function createAbsoluteUrl(value) {
  if (!value) {
    return "";
  }

  try {
    return new URL(
      value,
      window.location.origin
    ).href;
  } catch {
    return "";
  }
}

function setMetaTag(
  selector,
  attributes
) {
  let element =
    document.head.querySelector(
      selector
    );

  if (!element) {
    element =
      document.createElement("meta");

    document.head.appendChild(
      element
    );
  }

  Object.entries(
    attributes
  ).forEach(
    ([name, value]) => {
      element.setAttribute(
        name,
        value
      );
    }
  );
}

function setCanonicalUrl(href) {
  let canonical =
    document.head.querySelector(
      'link[rel="canonical"]'
    );

  if (!canonical) {
    canonical =
      document.createElement("link");

    canonical.setAttribute(
      "rel",
      "canonical"
    );

    document.head.appendChild(
      canonical
    );
  }

  canonical.setAttribute(
    "href",
    href
  );
}

function setStructuredData(data) {
  const scriptId =
    "304-seo-json-ld";

  let script =
    document.getElementById(
      scriptId
    );

  if (!data) {
    if (script) {
      script.remove();
    }

    return;
  }

  if (!script) {
    script =
      document.createElement(
        "script"
      );

    script.id = scriptId;

    script.type =
      "application/ld+json";

    document.head.appendChild(
      script
    );
  }

  script.textContent =
    JSON.stringify(data);
}

function createHomeStructuredData() {
  return {
    "@context":
      "https://schema.org",

    "@graph": [
      {
        "@type":
          "Organization",

        "@id":
          `${SITE_URL}/#organization`,

        name: SITE_NAME,

        url:
          `${SITE_URL}/`,
      },

      {
        "@type":
          "WebSite",

        "@id":
          `${SITE_URL}/#website`,

        url:
          `${SITE_URL}/`,

        name: SITE_NAME,

        publisher: {
          "@id":
            `${SITE_URL}/#organization`,
        },
      },
    ],
  };
}

function createProductStructuredData(
  product,
  canonicalUrl
) {
  const displayName =
    product?.baseName ||
    product?.name ||
    product?.codeName ||
    "Research Product";

  const strength =
    String(
      product?.strength || ""
    ).trim();

  const fullName =
    strength
      ? `${displayName} ${strength}`
      : displayName;

  const image =
    createAbsoluteUrl(
      product?.image
    );

  const productSchema = {
    "@type": "Product",

    "@id":
      `${canonicalUrl}#product`,

    name: fullName,

    description:
      product?.description ||
      `${fullName} research-use catalog product.`,

    sku:
      product?.codeName ||
      undefined,

    category:
      product?.category ||
      undefined,

    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },

    additionalProperty: [
      {
        "@type":
          "PropertyValue",

        name:
          "Research Use",

        value:
          "For Research Use Only",
      },

      ...(strength
        ? [
            {
              "@type":
                "PropertyValue",

              name:
                "Strength",

              value:
                strength,
            },
          ]
        : []),
    ],
  };

  if (image) {
    productSchema.image = [
      image,
    ];
  }

  Object.keys(
    productSchema
  ).forEach((key) => {
    if (
      productSchema[key] ===
      undefined
    ) {
      delete productSchema[key];
    }
  });

  return {
    "@context":
      "https://schema.org",

    "@graph": [
      productSchema,

      {
        "@type":
          "BreadcrumbList",

        "@id":
          `${canonicalUrl}#breadcrumb`,

        itemListElement: [
          {
            "@type":
              "ListItem",

            position: 1,

            name: "Home",

            item:
              `${SITE_URL}/`,
          },

          {
            "@type":
              "ListItem",

            position: 2,

            name: "Products",

            item:
              `${SITE_URL}/products`,
          },

          {
            "@type":
              "ListItem",

            position: 3,

            name:
              fullName,

            item:
              canonicalUrl,
          },
        ],
      },
    ],
  };
}

function getProductSeo(
  product,
  pathname
) {
  if (!product) {
    return {
      title:
        `Product Not Found | ${SITE_NAME}`,

      description:
        "The requested research-use product could not be found in the current 304 Peptides catalog.",

      canonicalUrl:
        `${SITE_URL}${pathname}`,

      robots:
        "noindex, nofollow",

      type:
        "website",

      structuredData:
        null,
    };
  }

  const displayName =
    product.baseName ||
    product.name ||
    product.codeName ||
    "Research Product";

  const strength =
    String(
      product.strength || ""
    ).trim();

  const fullName =
    strength
      ? `${displayName} ${strength}`
      : displayName;

  const canonicalUrl =
    `${SITE_URL}${pathname}`;

  const description =
    product.description ||
    `View ${fullName}, product information, and documentation status from 304 Peptides. For research use only.`;

  return {
    title:
      `${fullName} | 304 Peptides`,

    description,

    canonicalUrl,

    robots:
      "index, follow, max-image-preview:large",

    type:
      "product",

    structuredData:
      createProductStructuredData(
        product,
        canonicalUrl
      ),
  };
}

export function applyPageSeo({
  page,
  product = null,
  pathname = "/",
}) {
  const normalizedPathname =
    pathname.startsWith("/")
      ? pathname
      : "/";

  let seo;

  if (
    page ===
    "productDetails"
  ) {
    seo = getProductSeo(
      product,
      normalizedPathname
    );
  } else if (
    publicPageSeo[page]
  ) {
    const pageSeo =
      publicPageSeo[page];

    seo = {
      title:
        pageSeo.title,

      description:
        pageSeo.description,

      canonicalUrl:
        `${SITE_URL}${pageSeo.path}`,

      robots:
        "index, follow, max-image-preview:large",

      type:
        "website",

      structuredData:
        page === "home"
          ? createHomeStructuredData()
          : null,
    };
  } else {
    const isNotFound =
      page === "notFound";

    seo = {
      title:
        isNotFound
          ? `Page Not Found | ${SITE_NAME}`
          : `Account | ${SITE_NAME}`,

      description:
        isNotFound
          ? "The requested page could not be found."
          : "Secure 304 Peptides account and order-management page.",

      canonicalUrl:
        `${SITE_URL}${normalizedPathname}`,

      robots:
        noIndexPages.has(page)
          ? "noindex, nofollow"
          : "noindex, nofollow",

      type:
        "website",

      structuredData:
        null,
    };
  }

  document.title =
    seo.title;

  setMetaTag(
    'meta[name="description"]',
    {
      name:
        "description",

      content:
        seo.description,
    }
  );

  setMetaTag(
    'meta[name="robots"]',
    {
      name:
        "robots",

      content:
        seo.robots,
    }
  );

  setMetaTag(
    'meta[property="og:type"]',
    {
      property:
        "og:type",

      content:
        seo.type,
    }
  );

  setMetaTag(
    'meta[property="og:site_name"]',
    {
      property:
        "og:site_name",

      content:
        SITE_NAME,
    }
  );

  setMetaTag(
    'meta[property="og:title"]',
    {
      property:
        "og:title",

      content:
        seo.title,
    }
  );

  setMetaTag(
    'meta[property="og:description"]',
    {
      property:
        "og:description",

      content:
        seo.description,
    }
  );

  setMetaTag(
    'meta[property="og:url"]',
    {
      property:
        "og:url",

      content:
        seo.canonicalUrl,
    }
  );

  setMetaTag(
    'meta[name="twitter:card"]',
    {
      name:
        "twitter:card",

      content:
        "summary",
    }
  );

  setMetaTag(
    'meta[name="twitter:title"]',
    {
      name:
        "twitter:title",

      content:
        seo.title,
    }
  );

  setMetaTag(
    'meta[name="twitter:description"]',
    {
      name:
        "twitter:description",

      content:
        seo.description,
    }
  );

  setCanonicalUrl(
    seo.canonicalUrl
  );

  setStructuredData(
    seo.structuredData
  );
}
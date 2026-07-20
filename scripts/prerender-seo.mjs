import fs from "node:fs";
import path from "node:path";

const root =
  process.cwd();

const siteUrl =
  "https://304peptides.com";

const siteName =
  "304 Peptides";

const distDirectory =
  path.join(
    root,
    "dist"
  );

const templatePath =
  path.join(
    distDirectory,
    "index.html"
  );

const productsPath =
  path.join(
    root,
    "src",
    "data",
    "products.js"
  );

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(0, 80);
}

function escapeHtml(value) {
  return String(value || "")
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
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#39;"
    );
}

function safeJson(value) {
  return JSON.stringify(
    value
  ).replaceAll(
    "<",
    "\\u003c"
  );
}

function extractFunctionCalls(
  source,
  functionName
) {
  const token =
    `${functionName}(`;

  const calls = [];

  let searchIndex = 0;

  while (
    searchIndex <
    source.length
  ) {
    const tokenIndex =
      source.indexOf(
        token,
        searchIndex
      );

    if (
      tokenIndex === -1
    ) {
      break;
    }

    const openingParenthesis =
      tokenIndex +
      token.length -
      1;

    let depth = 0;
    let quote = "";
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    let closingParenthesis = -1;

    for (
      let index =
        openingParenthesis;

      index <
      source.length;

      index += 1
    ) {
      const character =
        source[index];

      const nextCharacter =
        source[index + 1];

      if (lineComment) {
        if (
          character === "\n"
        ) {
          lineComment = false;
        }

        continue;
      }

      if (blockComment) {
        if (
          character === "*" &&
          nextCharacter === "/"
        ) {
          blockComment = false;
          index += 1;
        }

        continue;
      }

      if (quote) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (
          character === "\\"
        ) {
          escaped = true;
          continue;
        }

        if (
          character === quote
        ) {
          quote = "";
        }

        continue;
      }

      if (
        character === "/" &&
        nextCharacter === "/"
      ) {
        lineComment = true;
        index += 1;
        continue;
      }

      if (
        character === "/" &&
        nextCharacter === "*"
      ) {
        blockComment = true;
        index += 1;
        continue;
      }

      if (
        character === '"' ||
        character === "'" ||
        character === "`"
      ) {
        quote = character;
        continue;
      }

      if (
        character === "("
      ) {
        depth += 1;
        continue;
      }

      if (
        character === ")"
      ) {
        depth -= 1;

        if (
          depth === 0
        ) {
          closingParenthesis =
            index;

          break;
        }
      }
    }

    if (
      closingParenthesis === -1
    ) {
      throw new Error(
        `Could not parse a ${functionName}() call.`
      );
    }

    calls.push(
      source.slice(
        tokenIndex,
        closingParenthesis + 1
      )
    );

    searchIndex =
      closingParenthesis + 1;
  }

  return calls;
}

function readQuotedProperty(
  source,
  property,
  fallback = ""
) {
  const expression =
    new RegExp(
      `\\b${property}\\s*:\\s*"([^"]*)"`,
      "s"
    );

  const match =
    source.match(
      expression
    );

  return match?.[1] ||
    fallback;
}

function readCatalogPages() {
  const source =
    fs.readFileSync(
      productsPath,
      "utf8"
    );

  const marker =
    "export const products = [";

  const markerIndex =
    source.indexOf(
      marker
    );

  if (
    markerIndex === -1
  ) {
    throw new Error(
      "Could not locate the exported product catalog."
    );
  }

  const catalogSource =
    source.slice(
      markerIndex +
      marker.length
    );

  const productCalls =
    extractFunctionCalls(
      catalogSource,
      "product"
    );

  if (
    productCalls.length === 0
  ) {
    throw new Error(
      "No catalog products were found."
    );
  }

  const pages = [];

  for (
    const productCall of
    productCalls
  ) {
    const name =
      readQuotedProperty(
        productCall,
        "name"
      );

    if (!name) {
      throw new Error(
        "A catalog product is missing its name."
      );
    }

    const category =
      readQuotedProperty(
        productCall,
        "category",
        "Research Products"
      );

    const description =
      readQuotedProperty(
        productCall,
        "description",
        `${name} research-use catalog product.`
      );

    const purity =
      readQuotedProperty(
        productCall,
        "purity",
        "≥ 99% Purity"
      );

    const productKey =
      slugify(name);

    const variantMatches = [
      ...productCall.matchAll(
        /variant\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g
      ),
    ];

    if (
      variantMatches.length === 0
    ) {
      throw new Error(
        `${name} does not contain a catalog variant.`
      );
    }

    for (
      const variantMatch of
      variantMatches
    ) {
      const strength =
        variantMatch[1];

      const codeName =
        variantMatch[2];

      const variantSlug =
        slugify(
          codeName
        );

      const route =
        `/products/${productKey}/${variantSlug}`;

      const canonicalUrl =
        `${siteUrl}${route}`;

      const fullName =
        `${name} ${strength}`;

      pages.push({
        route,

        title:
          `${fullName} | ${siteName}`,

        description,

        robots:
          "index, follow, max-image-preview:large",

        type:
          "product",

        structuredData: {
          "@context":
            "https://schema.org",

          "@graph": [
            {
              "@type":
                "Product",

              "@id":
                `${canonicalUrl}#product`,

              url:
                canonicalUrl,

              name:
                fullName,

              description,

              sku:
                codeName,

              category,

              brand: {
                "@type":
                  "Brand",

                name:
                  siteName,
              },

              additionalProperty: [
                {
                  "@type":
                    "PropertyValue",

                  name:
                    "Strength",

                  value:
                    strength,
                },

                {
                  "@type":
                    "PropertyValue",

                  name:
                    "Purity",

                  value:
                    purity,
                },

                {
                  "@type":
                    "PropertyValue",

                  name:
                    "Research Use",

                  value:
                    "For Research Use Only",
                },
              ],
            },

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

                  name:
                    "Home",

                  item:
                    `${siteUrl}/`,
                },

                {
                  "@type":
                    "ListItem",

                  position: 2,

                  name:
                    "Products",

                  item:
                    `${siteUrl}/products`,
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
        },
      });
    }
  }

  return pages;
}

const publicPages = [
  {
    route: "/",

    title:
      "304 Peptides | Research-Use Products & Documentation",

    description:
      "Explore research-use products from 304 Peptides with organized documentation, COA transparency, product verification, and professional customer support.",

    robots:
      "index, follow, max-image-preview:large",

    type:
      "website",

    structuredData: {
      "@context":
        "https://schema.org",

      "@graph": [
        {
          "@type":
            "Organization",

          "@id":
            `${siteUrl}/#organization`,

          name:
            siteName,

          url:
            `${siteUrl}/`,
        },

        {
          "@type":
            "WebSite",

          "@id":
            `${siteUrl}/#website`,

          name:
            siteName,

          url:
            `${siteUrl}/`,

          publisher: {
            "@id":
              `${siteUrl}/#organization`,
          },
        },
      ],
    },
  },

  {
    route:
      "/products",

    title:
      "Research Products | 304 Peptides",

    description:
      "Browse the 304 Peptides research-use catalog by category, strength, product code, availability, and published documentation status.",

    robots:
      "index, follow, max-image-preview:large",

    type:
      "website",
  },

  {
    route:
      "/quality",

    title:
      "Quality Standards & Documentation | 304 Peptides",

    description:
      "Review the documentation-first quality standards, product verification approach, and COA transparency used by 304 Peptides.",

    robots:
      "index, follow, max-image-preview:large",

    type:
      "website",
  },

  {
    route:
      "/affiliate",

    title:
      "Affiliate Program | 304 Peptides",

    description:
      "Learn about the 304 Peptides Affiliate Program, responsible promotion guidelines, custom referral codes, tracking, and reward opportunities.",

    robots:
      "index, follow, max-image-preview:large",

    type:
      "website",
  },

  {
    route:
      "/faq",

    title:
      "Frequently Asked Questions | 304 Peptides",

    description:
      "Find answers about 304 Peptides accounts, ordering, documentation, product verification, shipping, and research-use policies.",

    robots:
      "index, follow, max-image-preview:large",

    type:
      "website",
  },

  {
    route:
      "/contact",

    title:
      "Contact 304 Peptides",

    description:
      "Contact 304 Peptides for customer support, order assistance, documentation questions, and general website help.",

    robots:
      "index, follow, max-image-preview:large",

    type:
      "website",
  },

  {
    route:
      "/research-agreement",

    title:
      "Research Agreement | 304 Peptides",

    description:
      "Review the 304 Peptides research-use agreement, customer responsibilities, and product-use restrictions.",

    robots:
      "index, follow, max-image-preview:large",

    type:
      "website",
  },
];

const privateRoutes = [
  "/verify",
  "/login",
  "/create-account",
  "/dashboard",
  "/change-password",
  "/partner-application",
  "/admin",
  "/admin/partner-hq",
  "/admin/marketing",
  "/admin/orders",
  "/admin/affiliates",
  "/admin/inventory",
  "/admin/accounting",
  "/admin/products",
  "/admin/coupons",
  "/admin/vial-labels",
  "/admin/shipping",
  "/admin/coa",
  "/admin/qr",
  "/admin/customers",
  "/admin/settings",
  "/admin/launch-checklist",
  "/cart",
  "/checkout",
  "/order-confirmation",
  "/product-details",
  "/partners",
];

function createPrivatePage(
  route
) {
  return {
    route,

    title:
      `Account | ${siteName}`,

    description:
      "Secure 304 Peptides account, checkout, affiliate, or administration page.",

    robots:
      "noindex, nofollow",

    type:
      "website",

    structuredData:
      null,
  };
}

function replaceOrInsert(
  html,
  expression,
  replacement
) {
  if (
    expression.test(html)
  ) {
    return html.replace(
      expression,
      replacement
    );
  }

  return html.replace(
    "</head>",
    `  ${replacement}\n</head>`
  );
}

function renderHtml(
  template,
  page
) {
  const canonicalUrl =
    page.route === "/"
      ? `${siteUrl}/`
      : `${siteUrl}${page.route}`;

  let html =
    template;

  html =
    replaceOrInsert(
      html,
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(
        page.title
      )}</title>`
    );

  html =
    replaceOrInsert(
      html,
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapeHtml(
        page.description
      )}" />`
    );

  html =
    replaceOrInsert(
      html,
      /<meta\s+name=["']robots["'][^>]*>/i,
      `<meta name="robots" content="${escapeHtml(
        page.robots
      )}" />`
    );

  html =
    replaceOrInsert(
      html,
      /<link\s+rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${escapeHtml(
        canonicalUrl
      )}" />`
    );

  html =
    replaceOrInsert(
      html,
      /<meta\s+property=["']og:type["'][^>]*>/i,
      `<meta property="og:type" content="${escapeHtml(
        page.type
      )}" />`
    );

  html =
    replaceOrInsert(
      html,
      /<meta\s+property=["']og:site_name["'][^>]*>/i,
      `<meta property="og:site_name" content="${siteName}" />`
    );

  html =
    replaceOrInsert(
      html,
      /<meta\s+property=["']og:title["'][^>]*>/i,
      `<meta property="og:title" content="${escapeHtml(
        page.title
      )}" />`
    );

  html =
    replaceOrInsert(
      html,
      /<meta\s+property=["']og:description["'][^>]*>/i,
      `<meta property="og:description" content="${escapeHtml(
        page.description
      )}" />`
    );

  html =
    replaceOrInsert(
      html,
      /<meta\s+property=["']og:url["'][^>]*>/i,
      `<meta property="og:url" content="${escapeHtml(
        canonicalUrl
      )}" />`
    );

  html =
    replaceOrInsert(
      html,
      /<meta\s+name=["']twitter:card["'][^>]*>/i,
      '<meta name="twitter:card" content="summary" />'
    );

  html =
    replaceOrInsert(
      html,
      /<meta\s+name=["']twitter:title["'][^>]*>/i,
      `<meta name="twitter:title" content="${escapeHtml(
        page.title
      )}" />`
    );

  html =
    replaceOrInsert(
      html,
      /<meta\s+name=["']twitter:description["'][^>]*>/i,
      `<meta name="twitter:description" content="${escapeHtml(
        page.description
      )}" />`
    );

  html =
    html.replace(
      /<script[^>]+id=["']304-seo-json-ld["'][\s\S]*?<\/script>\s*/i,
      ""
    );

  if (
    page.structuredData
  ) {
    html =
      html.replace(
        "</head>",

        `  <script id="304-seo-json-ld" type="application/ld+json">${safeJson(
          page.structuredData
        )}</script>\n</head>`
      );
  }

  return html;
}

function getOutputPath(
  route
) {
  if (
    route === "/"
  ) {
    return templatePath;
  }

  const segments =
    route
      .split("/")
      .filter(Boolean);

  return path.join(
    distDirectory,
    ...segments,
    "index.html"
  );
}

function writePage(
  template,
  page
) {
  const outputPath =
    getOutputPath(
      page.route
    );

  fs.mkdirSync(
    path.dirname(
      outputPath
    ),
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    outputPath,
    renderHtml(
      template,
      page
    ),
    "utf8"
  );
}

if (
  !fs.existsSync(
    templatePath
  )
) {
  throw new Error(
    "dist/index.html does not exist. Run Vite before prerendering."
  );
}

const template =
  fs.readFileSync(
    templatePath,
    "utf8"
  );

const productPages =
  readCatalogPages();

for (
  const page of
  publicPages
) {
  writePage(
    template,
    page
  );
}

for (
  const page of
  productPages
) {
  writePage(
    template,
    page
  );
}

for (
  const route of
  privateRoutes
) {
  writePage(
    template,
    createPrivatePage(
      route
    )
  );
}

const notFoundHtml =
  renderHtml(
    template,
    {
      route:
        "/404",

      title:
        `Page Not Found | ${siteName}`,

      description:
        "The requested page could not be found.",

      robots:
        "noindex, nofollow",

      type:
        "website",

      structuredData:
        null,
    }
  );

fs.writeFileSync(
  path.join(
    distDirectory,
    "404.html"
  ),
  notFoundHtml,
  "utf8"
);

console.log(
  `Prerendered ${publicPages.length + productPages.length} indexable route files.`
);

console.log(
  `Prerendered ${privateRoutes.length} noindex route files.`
);

console.log(
  `Product route files: ${productPages.length}`
);
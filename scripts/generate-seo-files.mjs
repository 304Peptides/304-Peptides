import fs from "node:fs";
import path from "node:path";

const root =
  process.cwd();

const siteUrl =
  "https://304peptides.com";

const productsPath =
  path.join(
    root,
    "src",
    "data",
    "products.js"
  );

const publicDirectory =
  path.join(
    root,
    "public"
  );

const sitemapPath =
  path.join(
    publicDirectory,
    "sitemap.xml"
  );

const robotsPath =
  path.join(
    publicDirectory,
    "robots.txt"
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

function readCatalogRoutes() {
  if (
    !fs.existsSync(
      productsPath
    )
  ) {
    throw new Error(
      `Product catalog not found: ${productsPath}`
    );
  }

  const source =
    fs.readFileSync(
      productsPath,
      "utf8"
    );

  const catalogMarker =
    "export const products = [";

  const catalogStart =
    source.indexOf(
      catalogMarker
    );

  if (
    catalogStart === -1
  ) {
    throw new Error(
      "Could not locate the exported product catalog."
    );
  }

  const catalogSource =
    source.slice(
      catalogStart +
        catalogMarker.length
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
      "No static catalog products were found."
    );
  }

  const routes = [];

  for (
    const productCall of
    productCalls
  ) {
    const nameMatch =
      productCall.match(
        /\bname\s*:\s*"([^"]+)"/s
      );

    if (!nameMatch) {
      throw new Error(
        "A product is missing a quoted name value."
      );
    }

    const productKey =
      slugify(
        nameMatch[1]
      );

    const variantMatches = [
      ...productCall.matchAll(
        /variant\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g
      ),
    ];

    if (
      variantMatches.length >
      0
    ) {
      for (
        const variantMatch of
        variantMatches
      ) {
        const variantSlug =
          slugify(
            variantMatch[2]
          );

        if (
          productKey &&
          variantSlug
        ) {
          routes.push(
            `/products/${productKey}/${variantSlug}`
          );
        }
      }

      continue;
    }

    const codeMatch =
      productCall.match(
        /\bcodeName\s*:\s*"([^"]+)"/s
      );

    const variantSlug =
      slugify(
        codeMatch?.[1]
      );

    if (
      productKey &&
      variantSlug
    ) {
      routes.push(
        `/products/${productKey}/${variantSlug}`
      );
    }
  }

  return [
    ...new Set(routes),
  ].sort();
}

function escapeXml(value) {
  return String(value)
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
      "&apos;"
    );
}

const publicRoutes = [
  "/",
  "/products",
  "/quality",
  "/affiliate",
  "/faq",
  "/contact",
  "/terms",
  "/privacy",
  "/shipping-policy",
  "/refund-policy",
  "/research-agreement",
  "/affiliate-terms",
];

const productRoutes =
  readCatalogRoutes();

const allRoutes = [
  ...new Set([
    ...publicRoutes,
    ...productRoutes,
  ]),
];

const lastModified =
  new Date()
    .toISOString()
    .slice(0, 10);

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',

  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',

  ...allRoutes.map(
    (route) => {
      const location =
        route === "/"
          ? `${siteUrl}/`
          : `${siteUrl}${route}`;

      return [
        "  <url>",

        `    <loc>${escapeXml(
          location
        )}</loc>`,

        `    <lastmod>${lastModified}</lastmod>`,

        "  </url>",
      ].join("\n");
    }
  ),

  "</urlset>",
  "",
].join("\n");

const robots = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /api/",
  "",
  `Sitemap: ${siteUrl}/sitemap.xml`,
  "",
].join("\n");

fs.mkdirSync(
  publicDirectory,
  {
    recursive: true,
  }
);

fs.writeFileSync(
  sitemapPath,
  sitemap,
  "utf8"
);

fs.writeFileSync(
  robotsPath,
  robots,
  "utf8"
);

console.log(
  `Generated robots.txt and sitemap.xml with ${allRoutes.length} indexable URLs.`
);

console.log(
  `Public pages: ${publicRoutes.length}`
);

console.log(
  `Product variant pages: ${productRoutes.length}`
);
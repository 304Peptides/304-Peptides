import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root =
  process.cwd();

const catalogPath =
  path.join(
    root,
    "src",
    "data",
    "products.js"
  );

const imageRoot =
  path.join(
    root,
    "src",
    "assets",
    "images",
    "products"
  );

const reportDirectory =
  path.join(
    root,
    "performance-reports"
  );

const reportPath =
  path.join(
    reportDirectory,
    "product-images.json"
  );

const MAX_DIMENSION =
  1200;

function toPngPath(
  importPath
) {
  return importPath.replace(
    /\.webp$/i,
    ".png"
  );
}

function formatBytes(
  bytes
) {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(1)} kB`;
  }

  return `${(
    bytes /
    (
      1024 *
      1024
    )
  ).toFixed(2)} MB`;
}

async function createWebp(
  inputPath,
  outputPath,
  quality
) {
  const temporaryPath =
    `${outputPath}.tmp.webp`;

  fs.rmSync(
    temporaryPath,
    {
      force: true,
    }
  );

  const info =
    await sharp(
      inputPath,
      {
        limitInputPixels:
          false,
      }
    )
      .rotate()
      .resize({
        width:
          MAX_DIMENSION,

        height:
          MAX_DIMENSION,

        fit:
          "inside",

        withoutEnlargement:
          true,
      })
      .webp({
        quality,

        alphaQuality:
          100,

        effort:
          6,

        smartSubsample:
          true,

        preset:
          "picture",
      })
      .toFile(
        temporaryPath
      );

  fs.rmSync(
    outputPath,
    {
      force: true,
    }
  );

  fs.renameSync(
    temporaryPath,
    outputPath
  );

  return info;
}

if (
  !fs.existsSync(
    catalogPath
  )
) {
  throw new Error(
    `Catalog not found: ${catalogPath}`
  );
}

if (
  !fs.existsSync(
    imageRoot
  )
) {
  throw new Error(
    `Product image directory not found: ${imageRoot}`
  );
}

let catalogText =
  fs.readFileSync(
    catalogPath,
    "utf8"
  );

const importPattern =
  /from\s+["'](\.\.\/assets\/images\/products\/[^"']+\.(?:png|webp))["']/gi;

const importPaths = [
  ...new Set(
    [
      ...catalogText.matchAll(
        importPattern
      ),
    ].map(
      (match) =>
        match[1]
    )
  ),
];

if (
  importPaths.length ===
  0
) {
  throw new Error(
    "No product image imports were found in products.js."
  );
}

const resolvedImageRoot =
  `${path.resolve(
    imageRoot
  )}${path.sep}`;

const records = [];

let convertedCount = 0;
let skippedCount = 0;
let totalPngBytes = 0;
let totalWebpBytes = 0;

for (
  const currentImportPath of
  importPaths
) {
  const webpImportPath =
    currentImportPath.replace(
      /\.(?:png|webp)$/i,
      ".webp"
    );

  const pngImportPath =
    toPngPath(
      webpImportPath
    );

  const pngPath =
    path.resolve(
      path.dirname(
        catalogPath
      ),
      pngImportPath
    );

  const webpPath =
    path.resolve(
      path.dirname(
        catalogPath
      ),
      webpImportPath
    );

  if (
    !webpPath.startsWith(
      resolvedImageRoot
    )
  ) {
    throw new Error(
      `Refusing to write outside the product image directory: ${webpPath}`
    );
  }

  const pngExists =
    fs.existsSync(
      pngPath
    );

  const webpExists =
    fs.existsSync(
      webpPath
    );

  if (
    !pngExists &&
    !webpExists
  ) {
    throw new Error(
      `Missing product image: ${currentImportPath}`
    );
  }

  if (pngExists) {
    const pngStat =
      fs.statSync(
        pngPath
      );

    totalPngBytes +=
      pngStat.size;

    const shouldConvert =
      !webpExists ||
      fs.statSync(
        webpPath
      ).mtimeMs <
        pngStat.mtimeMs;

    if (shouldConvert) {
      fs.mkdirSync(
        path.dirname(
          webpPath
        ),
        {
          recursive: true,
        }
      );

      let information =
        await createWebp(
          pngPath,
          webpPath,
          88
        );

      /*
       * Try a slightly lower quality only when
       * the first WebP did not reduce enough.
       */
      if (
        information.size >
        pngStat.size *
          0.75
      ) {
        information =
          await createWebp(
            pngPath,
            webpPath,
            82
          );
      }

      convertedCount += 1;
    } else {
      skippedCount += 1;
    }
  } else {
    skippedCount += 1;
  }

  if (
    !fs.existsSync(
      webpPath
    )
  ) {
    throw new Error(
      `WebP output was not created: ${webpPath}`
    );
  }

  const webpStat =
    fs.statSync(
      webpPath
    );

  totalWebpBytes +=
    webpStat.size;

  const metadata =
    await sharp(
      webpPath
    ).metadata();

  if (
    !metadata.width ||
    !metadata.height
  ) {
    throw new Error(
      `Could not verify dimensions for: ${webpPath}`
    );
  }

  records.push({
    source:
      path
        .relative(
          root,
          pngPath
        )
        .replaceAll(
          "\\",
          "/"
        ),

    output:
      path
        .relative(
          root,
          webpPath
        )
        .replaceAll(
          "\\",
          "/"
        ),

    sourceBytes:
      pngExists
        ? fs.statSync(
            pngPath
          ).size
        : null,

    outputBytes:
      webpStat.size,

    width:
      metadata.width,

    height:
      metadata.height,
  });

  if (
    /\.png$/i.test(
      currentImportPath
    )
  ) {
    catalogText =
      catalogText.replaceAll(
        currentImportPath,
        webpImportPath
      );
  }
}

const remainingPngImports =
  catalogText.match(
    /\.\.\/assets\/images\/products\/[^"']+\.png/gi
  );

if (
  remainingPngImports?.length
) {
  throw new Error(
    `PNG product imports remain after conversion: ${remainingPngImports.length}`
  );
}

for (
  const record of
  records
) {
  const outputPath =
    path.join(
      root,
      record.output
    );

  if (
    !fs.existsSync(
      outputPath
    )
  ) {
    throw new Error(
      `Converted image is missing: ${record.output}`
    );
  }
}

fs.writeFileSync(
  catalogPath,
  catalogText,
  "utf8"
);

const savingsBytes =
  Math.max(
    0,
    totalPngBytes -
      totalWebpBytes
  );

const savingsPercent =
  totalPngBytes
    ? (
        savingsBytes /
        totalPngBytes
      ) *
      100
    : 0;

fs.mkdirSync(
  reportDirectory,
  {
    recursive: true,
  }
);

fs.writeFileSync(
  reportPath,

  `${JSON.stringify(
    {
      generatedAt:
        new Date()
          .toISOString(),

      maxDimension:
        MAX_DIMENSION,

      importedImages:
        records.length,

      convertedCount,

      skippedCount,

      totalPngBytes,

      totalWebpBytes,

      savingsBytes,

      savingsPercent:
        Number(
          savingsPercent.toFixed(
            2
          )
        ),

      files:
        records,
    },

    null,
    2
  )}\n`,

  "utf8"
);

console.log(
  `Product images checked: ${records.length}`
);

console.log(
  `Converted this run: ${convertedCount}`
);

console.log(
  `Already optimized: ${skippedCount}`
);

console.log(
  `Original PNG total: ${formatBytes(
    totalPngBytes
  )}`
);

console.log(
  `Optimized WebP total: ${formatBytes(
    totalWebpBytes
  )}`
);

console.log(
  `Estimated savings: ${savingsPercent.toFixed(
    1
  )}%`
);
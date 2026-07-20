import fs from "node:fs";
import path from "node:path";
import {
  fileURLToPath,
} from "node:url";
import sharp from "sharp";

const scriptDirectory =
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const projectRoot =
  path.resolve(
    scriptDirectory,
    ".."
  );

const sourceRoot =
  path.join(
    projectRoot,
    "src",
    "assets",
    "images",
    "products"
  );

const outputRoot =
  path.join(
    projectRoot,
    "src",
    "assets",
    "images",
    "home-products"
  );

const thumbnailSizes = [
  {
    suffix:
      "-480.webp",

    width:
      480,

    height:
      600,
  },

  {
    suffix:
      "-640.webp",

    width:
      640,

    height:
      800,
  },
];

function walkFiles(
  directory
) {
  if (
    !fs.existsSync(
      directory
    )
  ) {
    return [];
  }

  return fs
    .readdirSync(
      directory,
      {
        withFileTypes:
          true,
      }
    )
    .flatMap(
      (entry) => {
        const fullPath =
          path.join(
            directory,
            entry.name
          );

        return entry.isDirectory()
          ? walkFiles(
              fullPath
            )
          : [
              fullPath,
            ];
      }
    );
}

const sourceFiles =
  walkFiles(
    sourceRoot
  )
    .filter(
      (filePath) =>
        filePath
          .toLowerCase()
          .endsWith(
            ".webp"
          )
    )
    .sort();

if (
  sourceFiles.length <
  70
) {
  throw new Error(
    `Expected at least 70 product WebP images but found ${sourceFiles.length}.`
  );
}

fs.mkdirSync(
  outputRoot,
  {
    recursive:
      true,
  }
);

let generated = 0;
let refreshed = 0;
let skipped = 0;

const generatedFiles = [];

for (
  const sourcePath of
  sourceFiles
) {
  const relativePath =
    path.relative(
      sourceRoot,
      sourcePath
    );

  const relativeWithoutExtension =
    relativePath.replace(
      /\.webp$/i,
      ""
    );

  const sourceStats =
    fs.statSync(
      sourcePath
    );

  for (
    const size of
    thumbnailSizes
  ) {
    const outputPath =
      path.join(
        outputRoot,
        `${relativeWithoutExtension}${size.suffix}`
      );

    fs.mkdirSync(
      path.dirname(
        outputPath
      ),
      {
        recursive:
          true,
      }
    );

    const outputExists =
      fs.existsSync(
        outputPath
      );

    const outputIsCurrent =
      outputExists &&
      fs
        .statSync(
          outputPath
        )
        .mtimeMs >=
        sourceStats.mtimeMs;

    if (
      outputIsCurrent
    ) {
      skipped += 1;

      generatedFiles.push(
        outputPath
      );

      continue;
    }

    await sharp(
      sourcePath
    )
      .resize({
        width:
          size.width,

        height:
          size.height,

        fit:
          "cover",

        position:
          "centre",

        withoutEnlargement:
          false,
      })
      .webp({
        quality:
          82,

        alphaQuality:
          100,

        effort:
          6,

        smartSubsample:
          true,
      })
      .toFile(
        outputPath
      );

    if (
      outputExists
    ) {
      refreshed += 1;
    } else {
      generated += 1;
    }

    generatedFiles.push(
      outputPath
    );
  }
}

const expectedOutputCount =
  sourceFiles.length *
  thumbnailSizes.length;

if (
  generatedFiles.length !==
  expectedOutputCount
) {
  throw new Error(
    `Expected ${expectedOutputCount} generated thumbnail references but found ${generatedFiles.length}.`
  );
}

const missingFiles =
  generatedFiles.filter(
    (filePath) =>
      !fs.existsSync(
        filePath
      )
  );

if (
  missingFiles.length
) {
  throw new Error(
    `${missingFiles.length} expected thumbnail files are missing.`
  );
}

const outputBytes =
  generatedFiles.reduce(
    (
      total,
      filePath
    ) =>
      total +
      fs.statSync(
        filePath
      ).size,
    0
  );

const largestOutput =
  generatedFiles
    .map(
      (filePath) => ({
        filePath,

        bytes:
          fs.statSync(
            filePath
          ).size,
      })
    )
    .sort(
      (
        first,
        second
      ) =>
        second.bytes -
        first.bytes
    )[0];

console.log(
  JSON.stringify({
    sourceCount:
      sourceFiles.length,

    outputCount:
      generatedFiles.length,

    generated,
    refreshed,
    skipped,

    outputBytes,

    largestOutputBytes:
      largestOutput.bytes,

    largestOutputName:
      path.basename(
        largestOutput.filePath
      ),
  })
);
#!/usr/bin/env node
// Reproducible build of the self-hosted Office preview theme assets.
//
//   cp vendor-src/package.json vendor-src/package-lock.json <EMPTY_DIR>/
//   npm ci --ignore-scripts --prefix <EMPTY_DIR>
//   node vendor-src/build.mjs --modules <EMPTY_DIR>/node_modules [--check]
//
// The build reads only the pinned dependency tree given by --modules and the
// sources in this directory, writes the two bundles and the third-party
// notice file into assets/vendor/, and prints their SHA-256 digests. --check
// rebuilds into memory and fails if any committed asset differs.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const outputDir = join(repoRoot, "assets", "vendor");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const modulesDir = resolve(argument("--modules") || join(here, "node_modules"));
const checkOnly = process.argv.includes("--check");

if (!existsSync(join(modulesDir, "esbuild"))) {
  console.error(`esbuild not found under ${modulesDir}; run npm ci first.`);
  process.exit(2);
}

const require = createRequire(join(modulesDir, "noop.js"));
const esbuild = require("esbuild");
const lock = JSON.parse(readFileSync(join(here, "package-lock.json"), "utf8"));

const sharedOptions = {
  bundle: true,
  minify: true,
  write: false,
  platform: "browser",
  target: ["es2020", "chrome100", "firefox100", "safari15"],
  nodePaths: [modulesDir],
  legalComments: "none",
  charset: "utf8",
  sourcemap: false,
  logLevel: "warning",
  metafile: true,
};

const bundles = [
  {
    file: "office-preview-worker.js",
    options: {
      entryPoints: [join(here, "office-worker", "worker.mjs")],
      format: "iife",
    },
  },
  {
    file: "pptx-renderer.js",
    options: {
      entryPoints: [join(here, "pptx-renderer-entry.mjs")],
      format: "esm",
    },
  },
];

// Packages whose code the pinned pptx-renderer browser build already inlines.
// They are not separate inputs in the esbuild metafile, so their notices are
// listed explicitly from the same pinned tree.
const PREBUNDLED_BY_PPTX_RENDERER = ["echarts", "zrender", "tslib", "jszip", "pako"];

function packageNameFromInput(input) {
  const marker = "node_modules/";
  const index = input.lastIndexOf(marker);

  if (index < 0) {
    return null;
  }

  const rest = input.slice(index + marker.length).split("/");
  return rest[0].startsWith("@") ? `${rest[0]}/${rest[1]}` : rest[0];
}

function readLicenseText(packageDir) {
  for (const candidate of [
    "LICENSE",
    "LICENSE.md",
    "LICENSE.txt",
    "LICENSE.markdown",
    "LICENCE",
    "license",
    "license.md",
    "LICENSE-MIT",
  ]) {
    const path = join(packageDir, candidate);

    if (existsSync(path)) {
      return readFileSync(path, "utf8").trim();
    }
  }

  return "";
}

function noticeFor(name, prebundled = false) {
  const packageDir = join(modulesDir, name);
  const metadata = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
  const lockEntry = lock.packages?.[`node_modules/${name}`];
  let text = readLicenseText(packageDir);

  if (existsSync(join(packageDir, "NOTICE"))) {
    text += `\n\n--- NOTICE ---\n${readFileSync(join(packageDir, "NOTICE"), "utf8").trim()}`;
  }

  if (name === "@aiden0z/pptx-renderer") {
    for (const extra of ["THIRD_PARTY_NOTICES.md", "licenses/mtx-decompressor-MPL-2.0.txt"]) {
      text += `\n\n--- ${extra} ---\n${readFileSync(join(packageDir, extra), "utf8").trim()}`;
    }
  }

  if (!text) {
    throw new Error(`No license text found for ${name}`);
  }

  return [
    "=".repeat(78),
    prebundled
      ? `${name} (inlined by the pinned @aiden0z/pptx-renderer browser build; license text from ${name}@${metadata.version} in the pinned tree)`
      : `${name}@${metadata.version}`,
    `License: ${metadata.license || lockEntry?.license || "see text"}`,
    `Resolved: ${lockEntry?.resolved || "n/a"}`,
    `Integrity: ${lockEntry?.integrity || "n/a"}`,
    "=".repeat(78),
    text,
    "",
  ].join("\n");
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

const outputs = new Map();
const bundledPackages = new Map();

for (const bundle of bundles) {
  const result = await esbuild.build({ ...sharedOptions, ...bundle.options });
  const [output] = result.outputFiles;
  outputs.set(bundle.file, output.contents);
  const names = new Set();

  for (const input of Object.keys(result.metafile.inputs)) {
    const name = packageNameFromInput(input);

    if (name) {
      names.add(name);
    }
  }

  if (bundle.file === "pptx-renderer.js") {
    PREBUNDLED_BY_PPTX_RENDERER.forEach((name) => names.add(name));
  }

  bundledPackages.set(bundle.file, [...names].sort());
}

const noticeSections = [
  "Third-party software bundled in the self-hosted Office preview assets.",
  "Generated by vendor-src/build.mjs from vendor-src/package-lock.json.",
  "Do not edit by hand.",
  "",
];

for (const [file, names] of bundledPackages) {
  noticeSections.push(`${file}: ${names.join(", ")}`);
}

noticeSections.push("");

const allPackages = [...new Set([...bundledPackages.values()].flat())].sort();

const directPackages = new Set(
  [...bundledPackages.entries()].flatMap(([file, names]) =>
    file === "pptx-renderer.js" ? ["@aiden0z/pptx-renderer"] : names
  )
);

for (const name of allPackages) {
  noticeSections.push(noticeFor(name, !directPackages.has(name)));
}

outputs.set("office-preview-THIRD-PARTY.txt", new TextEncoder().encode(noticeSections.join("\n")));

let mismatch = false;

for (const [file, contents] of outputs) {
  const path = join(outputDir, file);
  const digest = sha256(contents);

  if (checkOnly) {
    const committed = existsSync(path) ? sha256(readFileSync(path)) : "(missing)";
    const ok = committed === digest;
    mismatch ||= !ok;
    console.log(`${ok ? "OK  " : "DIFF"} ${digest}  assets/vendor/${file}`);
  } else {
    writeFileSync(path, contents);
    console.log(`${digest}  assets/vendor/${file}  (${contents.length} bytes)`);
  }
}

if (mismatch) {
  console.error("Committed vendor assets differ from a clean rebuild.");
  process.exit(1);
}

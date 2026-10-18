/* eslint-env node */
/**
 * Type-checks the imports of every app surface with the platform file
 * resolution Metro uses for it.
 *
 * `npm run typecheck` resolves `./Foo` to `Foo.tsx` only, so it never sees that
 * a `Foo.tv.tsx` or `Foo.ios.tsx` variant lacks an export the importer uses.
 * Metro then bundles `undefined`, and the app crashes at runtime with
 * "undefined is not a function" (a TV build once died at launch this way).
 *
 * Each surface starts at `index.js`, so only files that surface actually loads
 * are checked. Only import resolution errors fail the check; general type
 * errors are left to `npm run typecheck`.
 */
const {spawnSync} = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Mirrors Metro: per source extension, `<platform>.`, `native.` and no prefix
// are tried in turn, and TV builds put the `tv.` extensions first (see
// metro.config.js).
function suffixes(platform, tv) {
  const base = [`.${platform}`, ".native", ""];
  return tv ? [...base.map(s => `${s}.tv`), ...base] : base;
}

const SURFACES = [
  {name: "iOS", suffixes: suffixes("ios", false)},
  {name: "Android", suffixes: suffixes("android", false)},
  {name: "tvOS", suffixes: suffixes("ios", true)},
  {name: "Android TV", suffixes: suffixes("android", true)},
];

// Missing module, missing export, or missing export with a suggestion.
const IMPORT_ERRORS = new Set(["TS2305", "TS2307", "TS2614", "TS2724"]);

function checkSurface(surface, tmpDir) {
  const configPath = path.join(
    tmpDir,
    `tsconfig.${surface.name.replace(/\W/g, "")}.json`,
  );
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      extends: path.join(ROOT, "tsconfig.json"),
      compilerOptions: {moduleSuffixes: surface.suffixes},
      include: [],
      files: [path.join(ROOT, "index.js")],
    }),
  );

  const result = spawnSync(
    process.execPath,
    [require.resolve("typescript/bin/tsc"), "--noEmit", "-p", configPath],
    {cwd: ROOT, encoding: "utf8"},
  );
  if (result.error) {
    throw result.error;
  }

  return result.stdout.split("\n").filter(line => {
    const code = line.match(/error (TS\d+):/)?.[1];
    // A broken generated config must fail too instead of checking nothing.
    const configError = /^TS(5|6)\d{3}$|^TS18003$/.test(code ?? "");
    return code !== undefined && (IMPORT_ERRORS.has(code) || configError);
  });
}

function label(surface) {
  return surface.suffixes.map(s => s || "<none>").join(" ");
}

function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "platform-imports-"));
  let failed = false;
  try {
    for (const surface of SURFACES) {
      const errors = checkSurface(surface, tmpDir);
      if (errors.length === 0) {
        console.log(`✓ ${surface.name} (${label(surface)})`);
        continue;
      }
      failed = true;
      console.error(`✗ ${surface.name} (${label(surface)})`);
      for (const error of errors) {
        console.error(`  ${error}`);
      }
    }
  } finally {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  }

  if (failed) {
    console.error(
      "\nA platform variant (.tv/.ios/.android) is missing an export that " +
        "an importer on that surface uses.",
    );
    process.exit(1);
  }
}

main();

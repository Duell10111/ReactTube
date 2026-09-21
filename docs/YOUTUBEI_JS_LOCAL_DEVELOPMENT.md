# Developing against a local `youtubei.js` checkout

ReactTube depends on a fork of [YouTube.js](https://github.com/LuanRT/YouTube.js)
that is published as `@duell10111/youtubei.js` and aliased to the package name
`youtubei.js`:

```json
"youtubei.js": "npm:@duell10111/youtubei.js@18.0.0-beta.2"
```

`main` always uses a published version so that a fresh clone builds with nothing
but `npm install`. When a task requires changing the library itself — a new
parser node, a playback fix, a missing type — switch the dependency temporarily
to a local checkout, and switch it back before merging.

This document describes that switch in both directions. It is the reference for
agents and humans; do not invent a different mechanism (`npm link`, manual
copying into `node_modules/`, a Metro `extraNodeModules` alias).

## Prerequisites

Clone the fork next to this repository's parent directory so that
`../../YouTube.js` resolves from the ReactTube root:

```
<workspace>/
├── YouTube.js/            # the library checkout
└── React-Native/
    └── reacttube/         # this repository
```

```bash
git clone git@github.com:duell10111/YouTube.js.git ../../YouTube.js
cd ../../YouTube.js && npm install
```

Any other location works as well; every `../../YouTube.js` below is then the
path to your checkout. Keep it relative — an absolute path with a home
directory in it must never be committed.

## Switching to the local checkout

### 1. Build the library once

The package is consumed as compiled output (`dist/`), not as TypeScript sources.
Nothing resolves before the first build:

```bash
cd ../../YouTube.js
npm run build
```

For an edit-and-reload loop, keep the incremental compiler running in a second
terminal instead:

```bash
npm run watch    # tspc --watch, writes to dist/
```

`npm run watch` only refreshes `dist/`. The `bundle/` outputs produced by the
full `build` are not used by ReactTube (Metro resolves the `react-native`
export condition to `dist/src/platform/react-native.js`), so the watcher is
enough for day-to-day work. Run the full `npm run build` before publishing or
when the parser map / protos changed.

### 2. Point the dependency at the checkout

In `package.json`:

```json
"youtubei.js": "file:../../YouTube.js"
```

```bash
rm -rf node_modules/youtubei.js
npm install
```

npm replaces `node_modules/youtubei.js` with a symlink to the checkout. Verify:

```bash
ls -l node_modules/youtubei.js     # must print a symlink → ../../../YouTube.js
```

`rm -rf node_modules/youtubei.js` matters in both directions: npm keeps a stale
symlink or a stale extracted tarball in place surprisingly often, and then the
dependency change silently has no effect.

### 3. Teach Metro about the checkout

Metro does not follow the symlink out of the project root unless the target is
an explicitly watched folder. Add to `metro.config.js`, above the
`module.exports`:

```js
const path = require("path");

// youtubei.js is consumed as a file: dependency from the sibling checkout.
// Metro only follows the symlink when the target is watched — otherwise it
// finds neither the sources nor their own node_modules.
const youtubeJsPath = path.resolve(__dirname, "../../YouTube.js");
config.watchFolders = [...(config.watchFolders ?? []), youtubeJsPath];
```

Then restart the bundler with a cleared cache — Metro caches resolutions, so an
already running bundler will keep serving the registry copy:

```bash
npx expo start --clear
```

### 4. Working on both repositories

- Edits in `../../YouTube.js/src` require a `dist/` rebuild (`npm run watch`
  handles this) before Metro sees them; Fast Refresh then picks them up.
- Deep imports such as `youtubei.js/dist/src/types` are used for types only.
  They resolve through the path, not through the package `exports` map, and
  must stay type-only — Babel elides them from the bundle.
- Library changes belong in the library repository and need their own commit
  and, eventually, a release. Do not work around a library bug with a
  `patches/` entry for `youtubei.js`.

## Switching back before merging

A `file:` dependency must never reach `main` — it breaks CI, fresh clones, and
every machine without the sibling checkout.

1. Publish the library change as a new version of `@duell10111/youtubei.js`
   (from the library repo: bump `version`, `npm run build`, `npm publish`).
2. In ReactTube, set the dependency back to the published version:

   ```json
   "youtubei.js": "npm:@duell10111/youtubei.js@<new version>"
   ```

3. Reinstall from the registry and refresh the lockfile:

   ```bash
   rm -rf node_modules/youtubei.js
   npm install "youtubei.js@npm:@duell10111/youtubei.js@<new version>" --save-exact
   ```

4. Remove the `watchFolders` block and the now-unused `path` require from
   `metro.config.js`.
5. Verify that nothing local is left behind:

   ```bash
   grep -rn "YouTube.js" package.json package-lock.json metro.config.js
   ```

   The lockfile must contain no `"resolved": "../../YouTube.js"` and no
   `"link": true` entry for `youtubei.js`; its `node_modules/youtubei.js` entry
   must carry a registry `resolved` URL and an `integrity` hash. A leftover
   `../../YouTube.js` block near the top of the lockfile means npm did not fully
   rewrite it — repeat step 3 after deleting `node_modules/youtubei.js`.

6. Run the quality gates from `AGENTS.md`: `npm run lint`, `npm run typecheck`,
   `npm test`, plus a cleared-cache bundler start (`npx expo start --clear`) to
   confirm the app still resolves the library.

## Checklist

|                            | Local development            | Merged state                            |
| -------------------------- | ---------------------------- | --------------------------------------- |
| `package.json`             | `file:../../YouTube.js`      | `npm:@duell10111/youtubei.js@<version>` |
| `node_modules/youtubei.js` | symlink to the checkout      | extracted tarball                       |
| `package-lock.json`        | `link: true` entry           | registry URL + `integrity`              |
| `metro.config.js`          | `watchFolders` entry present | no `watchFolders` entry                 |
| Library build              | `npm run watch` running      | not required                            |

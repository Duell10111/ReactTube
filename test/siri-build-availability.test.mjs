import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import {URL} from "node:url";
import {runInNewContext} from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTypeScript(relativePath, imports) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const {outputText} = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, esModuleInterop: false},
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name) {
      assert.ok(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
  });
  return exports;
}

function loadNativeBridge(platform, nativeModule) {
  let moduleLoads = 0;
  const bridge = loadTypeScript(
    "../modules/siri-media/src/SiriMediaModule.ts",
    {
      expo: {
        requireOptionalNativeModule(name) {
          assert.equal(name, "SiriMedia");
          moduleLoads++;
          return nativeModule;
        },
      },
      "react-native": {Platform: platform},
    },
  );
  return {bridge: bridge.default, moduleLoads};
}

test("a linked Siri pod stays unavailable when the native build disables Siri", () => {
  for (const nativeModule of [null, {}, {isSiriEnabled: false}]) {
    const {bridge} = loadNativeBridge({OS: "ios", isTV: false}, nativeModule);
    assert.equal(bridge, null);
  }
  const enabledModule = {isSiriEnabled: true};
  assert.equal(
    loadNativeBridge({OS: "ios", isTV: false}, enabledModule).bridge,
    enabledModule,
  );
});

test("Android, web and TV never load the Siri native module", () => {
  for (const platform of [
    {OS: "android"},
    {OS: "web"},
    {OS: "ios", isTV: true},
  ]) {
    const {bridge, moduleLoads} = loadNativeBridge(platform, {
      isSiriEnabled: true,
    });
    assert.equal(bridge, null);
    assert.equal(moduleLoads, 0);
  }
});

test("saved opt-ins cannot enable Siri settings in a build without Siri", async () => {
  const updates = [];
  const settings = loadTypeScript("../src/hooks/siri/useSiriSettings.ts", {
    react: {useCallback: callback => callback},
    "../../../modules/siri-media": {default: null},
    "@/context/AppDataContext": {
      useAppData: () => ({
        appSettings: {siriPlaybackEnabled: true, siriDonationsEnabled: true},
        updateSettings: update => updates.push(update),
      }),
    },
    "@/localization": {useTranslation: () => ({t: key => key})},
    "@/utils/Logger": {default: {extend: () => ({})}},
    "@/utils/ShowFlashMessageHelper": {
      showMessage: () =>
        assert.fail("No authorization request or warning expected"),
    },
  });
  assert.equal(settings.siriSupported, false);
  const hook = settings.default();
  assert.equal(hook.playbackEnabled, false);
  assert.equal(hook.donationsEnabled, false);
  await hook.setPlaybackEnabled(true);
  hook.setDonationsEnabled(true);
  assert.equal(updates[0].siriPlaybackEnabled, false);
  assert.equal(updates[1].siriDonationsEnabled, false);
});

import {Jinter} from "jintr/dist/index";
import {Log} from "youtubei.js/dist/src/platform/lib";
import {VMPrimative} from "youtubei.js/dist/src/types/PlatformShim.js";

const TAG = "JsRuntime";

export default function evaluate(
  code: string,
  env: Record<string, VMPrimative>,
) {
  Log.debug(TAG, "Evaluating JavaScript:\n", code);

  const runtime = new Jinter();

  for (const [key, value] of Object.entries(env)) {
    runtime.scope.set(key, value);
  }

  const result = runtime.evaluate(code);

  Log.debug(TAG, "Done. Result:", result);

  return result;
}

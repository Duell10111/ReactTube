// React-Native Platform Support
/* eslint-disable object-shorthand */
import {File, Directory, Paths} from "expo-file-system";
import crypto from "react-native-quick-crypto";
import {ReadableStream} from "web-streams-polyfill";
import {Types} from "youtubei.js";
// @ts-ignore Ignore no type definitions found
import CustomEvent from "youtubei.js/dist/src/platform/polyfills/node-custom-event.js";
// @ts-ignore Ignore no type definitions found
import {ICache} from "youtubei.js/dist/src/types/Cache.js";
// @ts-ignore Ignore no type definitions found
import {FetchFunction} from "youtubei.js/dist/src/types/PlatformShim.js";
// @ts-ignore Ignore no type definitions found
import {Platform} from "youtubei.js/dist/src/utils/Utils.js";

class Cache implements ICache {
  #persistent_directory: string;
  #persistent: boolean;

  constructor(persistent = false, persistent_directory?: string) {
    this.#persistent_directory =
      persistent_directory || Cache.default_persistent_directory;
    this.#persistent = persistent;
  }

  static get temp_directory() {
    return new Directory(Paths.cache, "youtubei.js").uri;
  }

  static get default_persistent_directory() {
    return new Directory(Paths.document, "youtubei.js").uri;
  }

  get cache_dir() {
    return this.#persistent ? this.#persistent_directory : Cache.temp_directory;
  }

  async #createCache() {
    const dir = this.cache_dir;
    try {
      new Directory(dir).create({idempotent: true});
    } catch (e: any) {
      throw new Error(
        "An unexpected file was found in place of the cache directory",
        e,
      );
    }
  }

  async get(key: string) {
    await this.#createCache();
    const file = new File(this.cache_dir, key);
    try {
      const stat = file.info();
      if (stat.exists) {
        const data: Buffer = Buffer.from(await file.text());
        return data.buffer;
      }
      throw new Error("An unexpected file was found in place of the cache key");
    } catch (e: any) {
      if (e?.code === "ENOENT") {
        return undefined;
      }
      throw e;
    }
  }

  async set(key: string, value: ArrayBuffer) {
    await this.#createCache();
    const file = new File(this.cache_dir, key);
    const dec = new TextDecoder();
    file.write(dec.decode(value));
  }

  async remove(key: string) {
    await this.#createCache();
    const file = new File(this.cache_dir, key);
    try {
      file.delete();
    } catch (e: any) {
      if (e?.code === "ENOENT") {
        return;
      }
      throw e;
    }
  }
}

console.log("Correct YTJS");
Platform.load({
  runtime: "react-native",
  info: {
    version: "",
    bugs_url: "",
    repo_url: "",
  },
  server: false,
  Cache: Cache,
  sha1Hash: async (data: string) => {
    return crypto.createHash("sha1").update(data).digest("hex");
  },
  uuidv4() {
    return crypto.randomUUID();
  },
  eval: async (
    data: Types.BuildScriptResult,
    env: Record<string, Types.VMPrimative>,
  ) => {
    const properties = [];

    if (env.n) {
      // @ts-ignore
      properties.push(`n: exportedVars.nFunction("${env.n}")`);
    }

    if (env.sig) {
      // @ts-ignore
      properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
    }

    const code = `${data.output}\nreturn { ${properties.join(", ")} }`;

    return new Function(code)();
  },
  fetch: fetch as unknown as FetchFunction,
  Request: Request as unknown as typeof globalThis.Request,
  Response: Response as unknown as typeof globalThis.Response,
  Headers: Headers as unknown as typeof globalThis.Headers,
  FormData: FormData as unknown as typeof globalThis.FormData,
  File: globalThis.File,
  ReadableStream: ReadableStream,
  // @ts-ignore
  CustomEvent: CustomEvent,
});

export * from "youtubei.js";

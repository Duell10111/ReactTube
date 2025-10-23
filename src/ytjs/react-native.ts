// React-Native Platform Support
/* eslint-disable object-shorthand */
import FileSystem from "expo-file-system";
import crypto from "react-native-quick-crypto";
import {ReadableStream} from "web-streams-polyfill";
import Innertube from "youtubei.js/dist/src/platform/lib";
import CustomEvent from "youtubei.js/dist/src/platform/polyfills/node-custom-event.js";
import {ICache} from "youtubei.js/dist/src/types/Cache.js";
import {FetchFunction} from "youtubei.js/dist/src/types/PlatformShim.js";
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
    return `${FileSystem.cacheDirectory}/youtubei.js`;
  }

  static get default_persistent_directory() {
    return [FileSystem.documentDirectory, "youtubei.js"].join("/");
  }

  get cache_dir() {
    return this.#persistent ? this.#persistent_directory : Cache.temp_directory;
  }

  async #createCache() {
    const dir = this.cache_dir;
    try {
      const cwd = await FileSystem.getInfoAsync(dir);
      if (!cwd.isDirectory) {
        throw new Error(
          "An unexpected file was found in place of the cache directory",
        );
      }
    } catch (e: any) {
      if (e?.code === "ENOENT") {
        await FileSystem.makeDirectoryAsync(dir);
      } else {
        throw e;
      }
    }
  }

  async get(key: string) {
    await this.#createCache();
    const file = [this.cache_dir, key].join("/");
    try {
      const stat = await FileSystem.getInfoAsync(file);
      if (stat.exists && stat.isDirectory === false) {
        const data: Buffer = Buffer.from(
          await FileSystem.readAsStringAsync(file),
        );
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
    const file = [this.cache_dir, key].join("/");
    const dec = new TextDecoder();
    await FileSystem.writeAsStringAsync(file, dec.decode(value));
  }

  async remove(key: string) {
    await this.#createCache();
    const file = [this.cache_dir, key].join("/");
    try {
      await FileSystem.deleteAsync(file);
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

export * from "youtubei.js/dist/src/platform/lib";
export default Innertube;

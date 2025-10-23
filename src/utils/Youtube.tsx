//Wrapper class
//@ts-nocheck

import FileSystem from "expo-file-system";
import {ICache} from "youtubei.js/dist/src/types/Cache";
import {Platform, Types} from "youtubei.js/react-native";
export * from "youtubei.js/react-native";

Platform.shim.eval = async (
  data: Types.BuildScriptResult,
  env: Record<string, Types.VMPrimative>,
) => {
  const properties = [];

  if (env.n) {
    properties.push(`n: exportedVars.nFunction("${env.n}")`);
  }

  if (env.sig) {
    properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
  }

  const code = `${data.output}\nreturn { ${properties.join(", ")} }`;

  return new Function(code)();
};

// Custom Cache implementation

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

Platform.shim.Cache = Cache;

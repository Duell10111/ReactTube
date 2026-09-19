// React-Native Platform Support
/* eslint-disable object-shorthand */
import {File, Directory, Paths} from "expo-file-system";
import crypto from "react-native-quick-crypto";
import {ReadableStream} from "web-streams-polyfill";
import {Platform, Types} from "youtubei.js";

type ICache = Types.ICache;
type FetchFunction = Types.FetchFunction;

/**
 * CustomEvent fehlt in React Native.
 *
 * Bewusst hier definiert statt aus youtubei.js/dist/... importiert: tiefe
 * Importe stehen nicht in der `exports`-Map des Pakets, was Metro bei der
 * `file:`-Anbindung mit einer Warnung quittiert.
 * Siehe https://github.com/nodejs/node/issues/40678#issuecomment-1126944677
 */
class CustomEventPolyfill extends Event {
  #detail: any;

  constructor(type: string, options?: CustomEventInit<any>) {
    super(type, options);
    this.#detail = options?.detail ?? null;
  }

  get detail() {
    return this.#detail;
  }
}

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

    // Ein fehlender Eintrag ist der Normalfall (erster Start, nach dem Leeren)
    // und kein Fehler — Innertube erwartet dann `undefined`.
    if (!file.exists) {
      return undefined;
    }

    // Binär lesen: der Cache enthält serialisierte Player-Daten, kein Text.
    // Ein Umweg über TextDecoder/Buffer würde die Bytes zerstören.
    const bytes = await file.bytes();

    return bytes.byteOffset === 0 &&
      bytes.byteLength === bytes.buffer.byteLength
      ? (bytes.buffer as ArrayBuffer)
      : (bytes.slice().buffer as ArrayBuffer);
  }

  async set(key: string, value: ArrayBuffer) {
    await this.#createCache();
    const file = new File(this.cache_dir, key);

    if (!file.exists) {
      file.create({intermediates: true, overwrite: true});
    }

    file.write(new Uint8Array(value));
  }

  async remove(key: string) {
    await this.#createCache();
    const file = new File(this.cache_dir, key);

    if (file.exists) {
      file.delete();
    }
  }
}

Platform.load({
  runtime: "react-native",
  server: false,
  Cache: Cache,
  sha1Hash: async (data: string) => {
    return crypto.createHash("sha1").update(data).digest("hex");
  },
  uuidv4() {
    return crypto.randomUUID();
  },
  /**
   * Führt den vom Player-Skript abgeleiteten Code aus.
   *
   * `data.output` endet bereits mit dem `return` des Prozessors, den
   * `Player#decipherMany` anhängt — der Evaluator muss den String also nur als
   * Funktionsrumpf ausführen. Hermes kann das (auf Apple TV verifiziert,
   * siehe Einstellungen ▸ Playback diagnostics).
   */
  eval: async (
    data: Types.BuildScriptResult,
    _env: Record<string, Types.VMPrimative>,
  ) => {
    // eslint-disable-next-line no-new-func
    return new Function(data.output)();
  },
  fetch: fetch as unknown as FetchFunction,
  Request: Request as unknown as typeof globalThis.Request,
  Response: Response as unknown as typeof globalThis.Response,
  Headers: Headers as unknown as typeof globalThis.Headers,
  FormData: FormData as unknown as typeof globalThis.FormData,
  File: globalThis.File,
  // Der Polyfill weicht in Details von der DOM-Signatur ab, erfüllt aber den
  // Vertrag, den youtubei.js braucht.
  ReadableStream: ReadableStream as unknown as typeof globalThis.ReadableStream,
  CustomEvent: CustomEventPolyfill as unknown as typeof globalThis.CustomEvent,
});

export * from "youtubei.js";

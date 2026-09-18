// React-Native Platform Support
/* eslint-disable object-shorthand */
import {File, Directory, Paths} from "expo-file-system";
import {Platform as RNPlatform} from "react-native";
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
  /** Verhindert, dass dieselbe Warnung bei jedem Zugriff erneut erscheint. */
  static #warned_directories = new Set<string>();

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

  /**
   * Ablageort des dauerhaften Caches (Player-Skript, Session-Daten).
   *
   * Auf tvOS gibt es kein `Documents`-Verzeichnis: `FileManager.urls(for:
   * .documentDirectory)` liefert zwar einen Pfad, aber auf echter Hardware
   * existiert er nicht und lässt sich auch nicht anlegen — nur `Library/Caches`
   * steht Apps zur Verfügung. Im tvOS-Simulator legt die Sandbox `Documents`
   * dagegen an, weshalb der Fehler dort nicht auftritt.
   *
   * Der Preis ist, dass tvOS den Cache bei Speichermangel verwerfen darf. Das
   * ist verkraftbar — es sind ausschließlich neu beschaffbare Daten — und die
   * einzige Alternative wäre, gar nicht zu cachen.
   */
  static get default_persistent_directory() {
    const base =
      RNPlatform.OS === "ios" && RNPlatform.isTV ? Paths.cache : Paths.document;
    return new Directory(base, "youtubei.js").uri;
  }

  get cache_dir() {
    return this.#persistent ? this.#persistent_directory : Cache.temp_directory;
  }

  /**
   * Legt das Cache-Verzeichnis an und meldet, ob es benutzbar ist.
   *
   * Bewusst ohne `throw`: ein nicht beschreibbarer Cache ist ein Grund, ohne
   * Cache weiterzuarbeiten, aber keiner, `Innertube.create` scheitern zu lassen.
   * Genau daran hing die App auf dem Apple TV endlos im Ladebildschirm. Die
   * Warnung geht über `console.warn`, damit sie den Release-Filter von
   * `utils/Logger.ts` überlebt.
   */
  async #createCache() {
    const dir = this.cache_dir;
    try {
      // `intermediates`, weil das übergeordnete Verzeichnis nicht zwingend
      // existiert — ohne das Flag scheitert das Anlegen daran statt am Ziel.
      new Directory(dir).create({idempotent: true, intermediates: true});
      return true;
    } catch (e: any) {
      if (!Cache.#warned_directories.has(dir)) {
        Cache.#warned_directories.add(dir);
        console.warn(
          `[youtubei.js-Cache] ${dir} konnte nicht angelegt werden — es wird ohne Cache gearbeitet: ${String(
            e?.message ?? e,
          )}`,
        );
      }
      return false;
    }
  }

  async get(key: string) {
    if (!(await this.#createCache())) {
      return undefined;
    }
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
    if (!(await this.#createCache())) {
      return;
    }
    const file = new File(this.cache_dir, key);

    if (!file.exists) {
      file.create({intermediates: true, overwrite: true});
    }

    file.write(new Uint8Array(value));
  }

  async remove(key: string) {
    if (!(await this.#createCache())) {
      return;
    }
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

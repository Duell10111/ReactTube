import Logger from "@/utils/Logger";
import {Innertube, Misc, YT} from "@/utils/Youtube";

const LOGGER = Logger.extend("VIDEO");

type Player = Innertube["session"]["player"];

/** The best single-URL format that carries both video and audio. */
export function chooseProgressiveFormat(
  info: Pick<YT.VideoInfo, "chooseFormat">,
): Misc.Format | undefined {
  try {
    return info.chooseFormat({type: "video+audio", quality: "best"});
  } catch {
    return undefined;
  }
}

/**
 * Deciphers a progressive format into a playable URL, or `undefined` when that
 * fails, which under Hermes is the expected outcome for many clients.
 */
export async function decipherProgressiveUrl(
  format: Misc.Format | undefined,
  player: Player,
): Promise<string | undefined> {
  if (!format || !player) return undefined;
  try {
    const url = await format.decipher(player);
    LOGGER.info(
      `Decipher ok: itag=${format.itag} ${format.quality_label ?? ""} · ` +
        `host=${url.split("/")[2]}`,
    );
    return url || undefined;
  } catch (e: any) {
    LOGGER.warn(
      `Decipher fehlgeschlagen (itag=${format.itag}): ${String(
        e?.message ?? e,
      )} — unter Hermes ist das der erwartete Ausfall, siehe Einstellungen ▸ Playback diagnostics`,
    );
    return undefined;
  }
}

import useLibrary from "@/hooks/tv/useLibrary";

/**
 * Watch history of the signed in account, read through the TV client — see
 * {@link useLibrary} for why every platform uses that one.
 */
export default function useHistory() {
  // Currently use Library history section as youtube.js has no dedicated history fetch fkt
  return useLibrary("history");
}

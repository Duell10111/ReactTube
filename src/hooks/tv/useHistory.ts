import useLibrary from "@/hooks/tv/useLibrary";

export default function useHistory() {
  // Currently use Library history section as youtube.js has no dedicated history fetch fkt
  return useLibrary("history");
}

import {useAccountContext} from "@/context/AccountContext";
import useLocalPlaylistManager from "@/hooks/playlist/useLocalPlaylistManager";
import useYTServerPlaylistManager from "@/hooks/playlist/useYTServerPlaylistManager";

export default function usePlaylistManager() {
  const {loginData} = useAccountContext();

  const server = useYTServerPlaylistManager();
  const local = useLocalPlaylistManager();

  // return server;
  return loginData.accounts.length > 0 ? server : local;
}

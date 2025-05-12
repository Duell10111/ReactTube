export default function useWatchSync() {
  const upload = (id: string) => {};
  const sendPlaylist = (id: string) => {};

  const watchTransfers = [] as {
    uri: string;
    process: number;
    transferring: boolean;
    paused: boolean;
  }[];

  const watchAppInstalled = false;

  return {upload, sendPlaylist, watchAppInstalled, watchTransfers};
}

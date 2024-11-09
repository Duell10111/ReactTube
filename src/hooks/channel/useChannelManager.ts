import {useYoutubeContext} from "@/context/YoutubeContext";

export default function useChannelManager() {
  const youtube = useYoutubeContext();

  const subscribe = (channelId: string) => {
    return youtube.interact.subscribe(channelId);
  };

  const unsubscribe = (channelId: string) => {
    return youtube.interact.unsubscribe(channelId);
  };

  return {subscribe, unsubscribe};
}

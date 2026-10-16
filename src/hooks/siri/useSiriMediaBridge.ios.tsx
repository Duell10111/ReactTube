import {MutableRefObject, useEffect, useRef} from "react";
import {AppState, Platform} from "react-native";

import SiriMedia, {SiriMediaRequest} from "../../../modules/siri-media";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {useYoutubeContext} from "@/context/YoutubeContext";
import {normalizeSiriQuery} from "@/siri/normalizeSiriQuery";
import Logger from "@/utils/Logger";
import {YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("SIRI");

const YOUTUBE_WAIT_MS = 6000;
/** Identifier prefix of items donated through `donatePlayback`. */
const VIDEO_ID_PREFIX = "rt:video:";

type Innertube = ReturnType<typeof useYoutubeContext>;
type SetPlaylistViaEndpoint = ReturnType<
  typeof useMusikPlayerContext
>["setPlaylistViaEndpoint"];

interface BridgeRefs {
  youtube: Innertube;
  setPlaylistViaEndpoint: SetPlaylistViaEndpoint;
}

function siriLog(message: string) {
  LOGGER.info(message);
  SiriMedia?.log(message);
}

async function waitForYoutube(refs: MutableRefObject<BridgeRefs>) {
  const deadline = Date.now() + YOUTUBE_WAIT_MS;
  while (!refs.current.youtube && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return refs.current.youtube;
}

/**
 * Phase 0 spike: plays the first song search result for the spoken query and
 * logs timings, to find out whether search and playback work after Siri
 * launched the app in the background. Ranking and the other request kinds
 * follow in phase 1.
 */
async function handleRequest(
  request: SiriMediaRequest,
  refs: MutableRefObject<BridgeRefs>,
) {
  const elapsed = () => `+${Date.now() - request.receivedAt}ms`;
  siriLog(
    `request ${request.requestId} ${request.intent} delivery=${request.delivery} ` +
      `headless=${request.headlessStart} appState=${AppState.currentState} ` +
      `name=${request.mediaName} artist=${request.artistName} ` +
      `type=${request.mediaType} item=${request.itemIdentifier} ${elapsed()}`,
  );

  if (request.intent !== "play") {
    SiriMedia?.completeRequest(request.requestId, "success");
    return;
  }

  const donatedVideoId = request.itemIdentifier?.startsWith(VIDEO_ID_PREFIX)
    ? request.itemIdentifier.slice(VIDEO_ID_PREFIX.length)
    : undefined;

  const youtube = await waitForYoutube(refs);
  if (!youtube) {
    siriLog(`youtube not ready ${elapsed()}`);
    SiriMedia?.completeRequest(request.requestId, "failure");
    return;
  }
  siriLog(`youtube ready ${elapsed()}`);

  if (donatedVideoId) {
    // An item the app donated earlier; Siri hands it back as is.
    refs.current.setPlaylistViaEndpoint(
      new YTNodes.NavigationEndpoint({
        watchEndpoint: {videoId: donatedVideoId},
      }),
    );
    SiriMedia?.completeRequest(request.requestId, "success");
    siriLog(`playback of donated ${donatedVideoId} requested ${elapsed()}`);
    return;
  }

  const query = [request.mediaName, request.artistName, request.albumName]
    .map(normalizeSiriQuery)
    .filter(Boolean)
    .join(" ");
  if (!query) {
    SiriMedia?.completeRequest(request.requestId, "notFound");
    return;
  }

  const search = await youtube.music.search(query, {type: "song"});
  const item = search.contents?.firstOfType(YTNodes.MusicShelf)?.contents?.[0];
  const endpoint = item?.overlay?.content?.endpoint ?? item?.endpoint;
  siriLog(
    `search done ${elapsed()} query="${query}" first=${item?.title} id=${item?.id}`,
  );
  if (!endpoint) {
    SiriMedia?.completeRequest(request.requestId, "notFound");
    return;
  }

  refs.current.setPlaylistViaEndpoint(endpoint);
  SiriMedia?.completeRequest(request.requestId, "success");
  siriLog(`playback requested ${elapsed()}`);
}

export default function useSiriMediaBridge() {
  const youtube = useYoutubeContext();
  const {setPlaylistViaEndpoint, playbackStatus, playing, currentItem} =
    useMusikPlayerContext();
  const lastDonatedId = useRef<string>(undefined);
  const refs = useRef<BridgeRefs>({youtube, setPlaylistViaEndpoint});
  refs.current = {youtube, setPlaylistViaEndpoint};

  useEffect(() => {
    if (!SiriMedia || Platform.isTV) {
      return;
    }
    siriLog(`bridge mounted appState=${AppState.currentState}`);

    const onRequest = (request: SiriMediaRequest) => {
      handleRequest(request, refs).catch(error => {
        siriLog(`request ${request.requestId} failed: ${error}`);
        SiriMedia?.completeRequest(request.requestId, "failure");
      });
    };
    const subscription = SiriMedia.addListener("onSiriMediaRequest", onRequest);
    SiriMedia.getPendingRequests().forEach(onRequest);

    // Phase 0 spike: ask once while the app is visible. Moves behind the
    // settings switch in phase 1.
    if (
      AppState.currentState === "active" &&
      SiriMedia.getSiriAuthorizationStatus() === "notDetermined"
    ) {
      SiriMedia.requestSiriAuthorization()
        .then(status => siriLog(`siri authorization ${status}`))
        .catch(LOGGER.warn);
    }

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!SiriMedia || Platform.isTV) {
      return;
    }
    siriLog(
      `playback status=${playbackStatus} playing=${playing} appState=${AppState.currentState}`,
    );
  }, [playbackStatus, playing]);

  // Phase 0 spike: donate every track once it actually plays, so Siri learns
  // ReactTube as a media app. Moves behind the settings switch in phase 1.
  useEffect(() => {
    if (!SiriMedia || Platform.isTV || !playing || !currentItem) {
      return;
    }
    if (lastDonatedId.current === currentItem.id) {
      return;
    }
    lastDonatedId.current = currentItem.id;
    SiriMedia.donatePlayback(
      currentItem.id,
      currentItem.title,
      currentItem.author?.name,
    );
  }, [currentItem, playing]);
}

import {Innertube, Player, Misc} from "../../utils/Youtube";
import _ from "lodash";

export type saveFile = (name: string, content: string) => Promise<void>;

export async function saveHLSFile(
  hlsPlaylist: HLSStructure,
  saveFileFkt: saveFile,
) {
  await saveFileFkt("master.m3u8", hlsPlaylist.master);
  await Promise.all(
    Object.entries(hlsPlaylist.subFiles).map(value => {
      saveFileFkt(value[0] + ".m3u8", value[1]);
    }),
  );
  if (hlsPlaylist.expirationData) {
    await saveFileFkt(
      "metadata.json",
      JSON.stringify({
        expires: hlsPlaylist.expirationData?.getTime(),
      }),
    );
  }
}

export interface HLSStructure {
  master: string;
  subFiles: {
    [key: string]: string;
  };
  expirationData?: Date;
}

export async function hlsTransform(videoId: string, innerTube?: Innertube) {
  const youtube = innerTube ?? (await Innertube.create({}));
  const videoInfo = await youtube.getInfo(videoId);

  const adaptiveFormats =
    videoInfo.streaming_data?.adaptive_formats?.filter(format => {
      return (
        format.mime_type.startsWith("video/mp4") ||
        format.mime_type.startsWith("audio/mp4")
      );
    }) ?? [];

  console.log(JSON.stringify(adaptiveFormats, null, 2));

  // const videoStreams = adaptiveFormats.filter(v => v.has_video)
  // Only keep biggest quality atm
  const videoStreams = [
    _.chain(adaptiveFormats)
      .filter(v => v.has_video)
      .maxBy(value => value.bitrate)
      .value(),
  ];
  const audioStreams = adaptiveFormats.filter(v => v.has_audio);

  const videoGroups = _.groupBy(videoStreams, value => value.mime_type);

  const videoKeys = Object.keys(videoGroups);

  console.log(JSON.stringify(Object.keys(videoGroups)));

  const player = youtube.session.player;

  const masterFile = ["#EXTM3U"];
  const subFiles: {[key: string]: string} = {};

  const audioGroups = _.groupBy(audioStreams, value => value.language);

  const audioLanguages = Object.keys(audioGroups);

  let defaultAudioValue: string | undefined;

  audioLanguages.forEach(key => {
    const formats = audioGroups[key];
    formats.map(f => {
      const subFileName = f.itag;
      const audioHeader = generateAudioHeader(
        f,
        "audio",
        subFileName + ".m3u8",
      );
      subFiles[subFileName] = generateSubFile([f], player);
      masterFile.push(audioHeader);
      defaultAudioValue = "audio";
    });
  });

  videoKeys.forEach(key => {
    const formats = videoGroups[key];
    const header = generateHeader(formats[0], defaultAudioValue);
    if (!header) {
      console.warn(
        "No Header generated for: ",
        JSON.stringify(formats, null, 4),
      );
      return;
    }
    masterFile.push(header);
    const subFileName = "v-" + formats[0].itag;
    subFiles[subFileName] = generateSubFile(formats, player);
    masterFile.push(subFileName + ".m3u8");
  });

  const masterPlaylist = masterFile.join("\n");

  return {
    master: masterPlaylist,
    subFiles: subFiles,
    expirationData: videoInfo.streaming_data?.expires,
  } as HLSStructure;
}

function generateAudioHeader(
  format: Misc.Format,
  groupID: string,
  uri: string,
  defaultAudio?: boolean,
) {
  return `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="${groupID}",LANGUAGE="en",NAME="${format.audio_quality}",AUTOSELECT=YES, DEFAULT=YES,URI="${uri}"`;
}

function generateHeader(format: Misc.Format, audio?: string) {
  const codec = codecsExtraction(format.mime_type);
  const audioHeader = audio ? `,AUDIO="${audio}"` : "";
  if (format.has_video) {
    const averageBandwidth = format.average_bitrate
      ? `,AVERAGE-BANDWIDTH=${format.average_bitrate}`
      : "";
    return `#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=${format.bitrate}${averageBandwidth},RESOLUTION=${format.width}x${format.height},CODECS="${codec}"${audioHeader}`;
  }
}

function generateSubFile(format: Misc.Format[], player?: Player) {
  console.log(JSON.stringify(format, null, 4));

  const duration = _.maxBy(
    format,
    f => f.approx_duration_ms,
  )?.approx_duration_ms;

  const hlsStart = [
    "#EXTM3U",
    "#EXT-X-PLAYLIST-TYPE:VOD",
    `#EXT-X-TARGETDURATION:${Math.ceil(duration ? duration / 1000 : 10)}`,
    "#EXT-X-VERSION:4",
    "#EXT-X-MEDIA-SEQUENCE:0",
  ];

  const formats = format.flatMap(f => {
    return [`#EXTINF:${f.approx_duration_ms / 1000},`, f.decipher(player)];
  });
  hlsStart.push(...formats);

  hlsStart.push("#EXT-X-ENDLIST");

  const playlist = hlsStart.join("\n");

  console.log(playlist);

  return playlist;
}

function codecsExtraction(mimeType: string) {
  return mimeType.split('codecs="')[1].split('"')[0];
}

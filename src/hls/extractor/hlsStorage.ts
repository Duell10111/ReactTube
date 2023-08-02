import {Innertube} from "../../utils/Youtube";
import {hlsTransform, saveHLSFile} from "./hlsTransform";

export type getFileLocally = (
  videoId: string,
  filePath: string,
) => Promise<string | undefined>;
export type saveFileLocally = (
  videoId: string,
  filePath: string,
  content: string,
) => Promise<void>;
export type deleteFolder = (videoId: string) => Promise<void>;

export interface FileStorage {
  getFileLocally: getFileLocally;
  saveFileLocally: saveFileLocally;
  deleteFolder: deleteFolder;
}

export async function getHLSFile(
  videoId: string,
  path: string,
  {getFileLocally, saveFileLocally, deleteFolder}: FileStorage,
  innerTube?: Innertube,
) {
  const metadata = await getFileLocally(videoId, "metadata.json");
  const expires = metadata
    ? (JSON.parse(metadata) as {expires: number})
    : undefined;
  if (expires && expires.expires > Date.now()) {
    console.log("Trying to get local cache");
    const data = await getFileLocally(videoId, path);
    if (data) {
      return data;
    }
  } else {
    console.log("Deleting old data...");
    await deleteFolder(videoId);
  }

  try {
    const hlsData = await hlsTransform(videoId, innerTube);
    await saveHLSFile(
      hlsData,
      async (name, content) => await saveFileLocally(videoId, name, content),
    );

    if (path === "master.m3u8") {
      return hlsData.master;
    } else {
      return hlsData.subFiles[path];
    }
  } catch (e) {
    console.error("Error while fetching hlsData: ", e);
    throw e;
  }
}

import RNFS from "react-native-fs";
import {
  deleteFolder,
  getFileLocally,
  saveFileLocally,
} from "./extractor/hlsStorage";

export const contentFolder = RNFS.CachesDirectoryPath + "/hls";

const save: saveFileLocally = async (videoId, filePath, content) => {
  const directoryPath = contentFolder + "/" + videoId;
  const dirExists = await RNFS.exists(directoryPath);
  if (!dirExists) {
    await RNFS.mkdir(directoryPath);
  }
  await RNFS.writeFile(directoryPath + "/" + filePath, content);
};

const get: getFileLocally = async (videoId, filePath) => {
  const path = contentFolder + "/" + videoId + "/" + filePath;
  const fileExists = await RNFS.exists(path);
  if (fileExists) {
    return await RNFS.readFile(path);
  }
};

const del: deleteFolder = async videoId => {
  const directoryPath = contentFolder + "/" + videoId;
  const dirExists = await RNFS.exists(directoryPath);
  if (dirExists) {
    await RNFS.unlink(directoryPath);
  }
};

export function getFilePath(videoId: string, filePath: string) {
  return contentFolder + "/" + videoId + "/" + filePath;
}

export {get, save, del};

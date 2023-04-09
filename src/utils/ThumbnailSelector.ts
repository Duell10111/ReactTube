import {thumbnail} from "youtube-extractor/dist/src/types";

export function selectThumbnail(thumbnail: thumbnail[]) {
  console.log("Thumbnails: ", JSON.stringify(thumbnail, null, 4));
}

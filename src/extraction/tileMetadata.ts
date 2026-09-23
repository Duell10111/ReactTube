import type {Helpers, Misc, YTNodes} from "../utils/Youtube";

/**
 * Metadata a TV tile carries below its title. Which of the parts a tile
 * actually has depends on the surface, so every field is optional.
 */
export interface TileMetadata {
  author?: string;
  /** View or subscriber count, whichever the tile shows. */
  count?: string;
  published?: string;
}

// Separators YouTube inserts as their own line items between the metadata parts
const METADATA_DELIMITERS = ["•", "·", "|", "-", "–"];

/**
 * A count ("1.5M views", "383 subscribers") is the only metadata part that
 * carries an accessibility label, because it is the only one that is
 * abbreviated. That makes the label a locale independent marker for it - the
 * texts themselves are translated and cannot be matched against.
 */
function isCountText(text: Misc.Text) {
  return Boolean(text.accessibility?.accessibility_data?.label);
}

/**
 * Extracts author, count, and publish date out of a tile's metadata lines.
 *
 * The lines cannot be read by index: badges ("4K", "CC", "Members only") are
 * line items of their own that carry no text, and they shift every following
 * item. How many of them a tile has differs per video, so the parts are
 * classified by what they are instead of by where they sit.
 */
export function parseTileMetadataLines(
  lines?: Helpers.ObservedArray<YTNodes.Line>,
): TileMetadata {
  // Badges and separators are dropped, leaving only the parts that carry data.
  const rows = (lines ?? [])
    .map(line =>
      line.items
        .map(item => item.text)
        .filter(
          text => text?.text && !METADATA_DELIMITERS.includes(text.text.trim()),
        ),
    )
    .filter(row => row.length > 0);

  if (rows.length === 0) {
    return {};
  }

  // The first line holds the author, unless it opens with a count: a tile on a
  // surface that already names the channel repeats no author.
  const [firstRow, ...restRows] = rows;
  const authorInFirstRow = !isCountText(firstRow[0]);
  const author = authorInFirstRow ? firstRow[0].text : undefined;
  const parts = [
    ...(authorInFirstRow ? firstRow.slice(1) : firstRow),
    ...restRows.flat(),
  ];

  const countIndex = parts.findIndex(isCountText);
  if (countIndex >= 0) {
    return {
      author,
      count: parts[countIndex].text,
      published: parts[countIndex + 1]?.text,
    };
  }

  // Without a count the remaining parts are ordered count first, date last.
  // A lone part is the date: a video hiding its view count still shows when it
  // was published.
  return {
    author,
    count: parts.length > 1 ? parts[0].text : undefined,
    published: parts.length > 1 ? parts[1].text : parts[0]?.text,
  };
}

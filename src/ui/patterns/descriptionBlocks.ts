/** How much text one focusable block carries at most. */
const defaultBlockLength = 420;

/**
 * Cuts one long line at a word boundary, so a description without line breaks
 * still becomes steppable instead of staying one wall of text.
 */
function splitLine(line: string, maxLength: number): string[] {
  const pieces: string[] = [];
  let rest = line;

  while (rest.length > maxLength) {
    const lastSpace = rest.lastIndexOf(" ", maxLength);
    const cut = lastSpace > maxLength / 2 ? lastSpace : maxLength;

    pieces.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }

  pieces.push(rest);

  return pieces;
}

/**
 * Splits a description into the blocks the TV panel renders as focusable
 * pieces.
 *
 * **Why the split exists:** tvOS scrolls a scroll view only to bring the
 * focused view into sight. One `Text` with the whole description is a single
 * unfocusable child, so the D-pad has nothing to move to and everything below
 * the fold stays unreadable. Blocks give the remote somewhere to go, and the
 * scroll follows.
 *
 * Line breaks are kept inside a block; a block ends at the line that would
 * push it past `maxLength`.
 */
export function splitDescriptionBlocks(
  description: string,
  maxLength: number = defaultBlockLength,
): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  const flush = () => {
    const block = current.join("\n").trim();

    if (block.length > 0) {
      blocks.push(block);
    }

    current = [];
    currentLength = 0;
  };

  for (const line of description.replace(/\r\n?/g, "\n").split("\n")) {
    for (const piece of splitLine(line, maxLength)) {
      if (currentLength > 0 && currentLength + piece.length > maxLength) {
        flush();
      }

      current.push(piece);
      // The newline that rejoins the lines counts towards the block as well.
      currentLength += piece.length + 1;
    }
  }

  flush();

  return blocks;
}

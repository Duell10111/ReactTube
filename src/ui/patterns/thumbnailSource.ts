/**
 * YouTube's still frames come from one of a fixed set of named buckets. Only
 * these three are produced for every video: `sddefault`, `hq720`, and
 * `maxresdefault` exist for some uploads and 404 for others, so they are never
 * a target the app picks on its own.
 */
const videoThumbnailBuckets = [
  {name: "default", width: 120},
  {name: "mqdefault", width: 320},
  {name: "hqdefault", width: 480},
] as const;

const videoThumbnailPattern =
  /^(https?:\/\/[^/]*\bytimg\.com\/(?:vi|vi_webp)\/[^/]+\/)([a-z0-9_]+)(\.[a-z]+)(\?.*)?$/i;

/**
 * Google's image host resizes on request: the `=s<size>` token in the path
 * suffix is a parameter, not a file name, so an avatar can be asked for at any
 * size. This is the one case where the app may ask for a *larger* image than
 * it was handed — a TV renders a channel avatar at 220 points, and the 88 pixel
 * default YouTube ships would be an upscale of a quarter of the needed pixels.
 */
const avatarHostPattern = /\b(?:ggpht\.com|googleusercontent\.com)\//i;
const avatarSizePattern = /=([^/?]*)$/;

/** Google's image host rejects requests far above the stored original. */
const maxAvatarSize = 800;

function pickVideoBucket(targetWidth: number): string | undefined {
  return videoThumbnailBuckets.find(bucket => bucket.width >= targetWidth)
    ?.name;
}

function resolveVideoThumbnail(url: string, targetWidth: number): string {
  const match = videoThumbnailPattern.exec(url);

  if (!match) {
    return url;
  }

  const [, prefix, current, extension, query = ""] = match;
  const bucket = pickVideoBucket(targetWidth);

  if (!bucket) {
    // Nothing smaller covers the target, so the URL YouTube handed over stays:
    // it is already the largest variant that is known to exist.
    return url;
  }

  const currentIndex = videoThumbnailBuckets.findIndex(
    entry => entry.name === current,
  );
  const targetIndex = videoThumbnailBuckets.findIndex(
    entry => entry.name === bucket,
  );

  // Only ever step down. Stepping up would name a bucket that is not produced
  // for every upload, and a missing bucket is a broken thumbnail.
  if (currentIndex !== -1 && currentIndex <= targetIndex) {
    return url;
  }

  return `${prefix}${bucket}${extension}${query}`;
}

function resolveAvatar(url: string, targetWidth: number): string {
  const [path, query] = url.split("?", 2);
  const match = avatarSizePattern.exec(path);

  if (!match) {
    return url;
  }

  const size = Math.min(Math.max(Math.ceil(targetWidth), 1), maxAvatarSize);
  // The suffix carries the size next to crop and format flags. Only the size
  // token is rewritten so the flags that shape the image survive.
  const flags = match[1]
    .split("-")
    .filter(flag => flag.length > 0 && !/^[swh]\d+$/i.test(flag));
  const suffix = [`s${size}`, ...flags].join("-");
  const resized = path.replace(avatarSizePattern, `=${suffix}`);

  return query ? `${resized}?${query}` : resized;
}

/**
 * The image URL a surface should actually request for a box of `targetWidth`
 * logical points.
 *
 * TV and phone show the same feed at very different sizes: a shelf card is 180
 * points wide on a phone and 420 on a TV. Requesting one size for both means
 * either a blurry TV or a phone that decodes a 1280 pixel frame into a
 * thumbnail a seventh of that width and holds the result in memory for every
 * card on screen.
 *
 * A URL the app does not recognize is returned unchanged.
 */
export function resolveThumbnailUrl(
  url: string | undefined,
  targetWidth: number,
  pixelRatio = 1,
): string | undefined {
  if (!url || !Number.isFinite(targetWidth) || targetWidth <= 0) {
    return url;
  }

  const target = targetWidth * Math.max(1, pixelRatio);

  if (avatarHostPattern.test(url)) {
    return resolveAvatar(url, target);
  }

  return resolveVideoThumbnail(url, target);
}

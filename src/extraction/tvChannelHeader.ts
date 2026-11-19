interface ImageSource {
  url: string;
  width?: number;
}

interface TextSource {
  toString(): string;
}

interface ChannelHeaderSource {
  metadata: {
    title?: string;
    description?: string;
    thumbnail?: ImageSource[];
    avatar?: ImageSource[];
  };
  header?: {
    type?: string;
    banner?: ImageSource[];
    tv_banner?: ImageSource[];
    channel_handle?: TextSource;
    subscribers?: TextSource;
    videos_count?: TextSource;
    metadata?: TextSource;
    content?: {
      banner?: {image: ImageSource[]} | null;
      metadata?: {
        delimiter: string;
        metadata_rows: {metadata_parts?: {text: TextSource | null}[]}[];
      } | null;
    } | null;
  };
}

function largestImage(images?: ImageSource[]) {
  return images?.reduce<ImageSource | undefined>(
    (best, image) =>
      !best || (image.width ?? 0) > (best.width ?? 0) ? image : best,
    undefined,
  )?.url;
}

/** Supports both the classic channel header and YouTube's page-header view. */
export function getTVChannelHeader(channel: ChannelHeaderSource) {
  const {metadata, header} = channel;
  const pageMetadata = header?.content?.metadata;
  const metadataParts = pageMetadata
    ? pageMetadata.metadata_rows.flatMap(row =>
        (row.metadata_parts ?? [])
          .map(part => part.text?.toString())
          .filter(Boolean),
      )
    : [header?.channel_handle, header?.subscribers, header?.videos_count]
        .map(part => part?.toString())
        .filter(Boolean);
  return {
    title: metadata.title,
    description: metadata.description,
    avatar: largestImage(metadata.avatar ?? metadata.thumbnail),
    banner:
      largestImage(header?.tv_banner) ??
      largestImage(header?.banner) ??
      largestImage(header?.content?.banner?.image),
    metadata:
      metadataParts.join(pageMetadata?.delimiter || " · ") ||
      header?.metadata?.toString(),
  };
}

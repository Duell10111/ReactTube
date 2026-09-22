import {YTChannel} from "@/extraction/Types";
import useChannelTab, {ChannelTabType} from "@/hooks/channel/useChannelTab";
import {AppText, Screen} from "@/ui/components";
import {MediaFeed} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

interface ChannelTabProps {
  channel: YTChannel;
  type: ChannelTabType;
}

export function ChannelTab({channel, type}: ChannelTabProps) {
  const {data, fetchMore, loading, error, refresh} = useChannelTab(
    channel,
    type,
  );
  const {theme} = useAppTheme();

  if (type === "About") {
    return (
      <Screen scroll>
        <AppText color={"textSecondary"} style={{padding: theme.spacing.xl}}>
          {channel.description}
        </AppText>
      </Screen>
    );
  }

  return (
    <MediaFeed
      error={error}
      items={data ?? []}
      loading={loading}
      onEndReached={fetchMore}
      onRefresh={refresh}
      onRetry={refresh}
      testID={`channel-${type.toLowerCase()}-feed`}
    />
  );
}

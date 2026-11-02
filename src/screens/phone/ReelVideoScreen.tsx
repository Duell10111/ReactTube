import {useIsFocused} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  FlatList,
  FlatListProps,
  LayoutChangeEvent,
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from "react-native";

import {PhoneShortPage} from "@/components/shorts/phone/PhoneShortPage";
import {
  getShortPageState,
  shortIndexFromOffset,
} from "@/components/shorts/phone/shortsPagingModel";
import {shouldPrefetchShorts} from "@/components/shorts/tv/shortsQueueModel";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {useShortsQueue} from "@/hooks/video/useShortsQueue";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

const keyExtractor = (videoId: string) => videoId;
const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 150,
};

export default function ReelVideoScreen(props: Props) {
  // A new entry point owns a fresh paging position and preparation window.
  return <ReelFeed key={props.route.params.videoId} {...props} />;
}

function ReelFeed({route, navigation}: Props) {
  const {videoId, navEndpoint} = route.params;
  const {videoIds, fetchMore} = useShortsQueue(videoId);
  const focused = useIsFocused();
  const {playing: musicPlaying, pause} = useMusikPlayerContext();
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [viewport, setViewport] = useState({width: 0, height: 0});
  const [selected, setSelected] = useState(0);
  const [preparedId, setPreparedId] = useState<string>();
  const [preloadForId, setPreloadForId] = useState<string>();
  const listRef = useRef<FlatList<string>>(null);
  const selectedRef = useRef(0);
  const activeId = videoIds[selected];
  const playing = focused && foreground;
  const preloadNext = playing && preloadForId === activeId;

  useEffect(() => {
    navigation.setOptions({headerTransparent: true, headerTitle: ""});
  }, [navigation]);

  useEffect(() => {
    if (focused && musicPlaying) pause();
  }, [focused, musicPlaying, pause]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", state =>
      setForeground(state === "active"),
    );
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (focused && shouldPrefetchShorts(selected, videoIds.length)) fetchMore();
  }, [fetchMore, focused, selected, videoIds.length]);

  useEffect(() => {
    setPreloadForId(undefined);
    if (!playing || preparedId !== activeId) return;
    // Give the visible player priority and avoid resolving skipped shorts
    // during a fast fling. Only the next short starts new preparation.
    const timer = setTimeout(() => setPreloadForId(activeId), 200);
    return () => clearTimeout(timer);
  }, [activeId, playing, preparedId]);

  useLayoutEffect(() => {
    if (viewport.height > 0) {
      listRef.current?.scrollToOffset({
        offset: selectedRef.current * viewport.height,
        animated: false,
      });
    }
  }, [viewport]);

  const onLayout = useCallback(({nativeEvent}: LayoutChangeEvent) => {
    const {width, height} = nativeEvent.layout;
    setViewport(previous =>
      previous.width === width && previous.height === height
        ? previous
        : {width, height},
    );
  }, []);

  const selectPage = useCallback((index: number) => {
    selectedRef.current = index;
    setSelected(index);
  }, []);

  const onViewableItemsChanged = useCallback<
    NonNullable<FlatListProps<string>["onViewableItemsChanged"]>
  >(
    ({viewableItems}) => {
      const index = viewableItems.find(item => item.isViewable)?.index;
      if (index !== undefined && index !== null) selectPage(index);
    },
    [selectPage],
  );

  const onMomentumScrollEnd = useCallback(
    ({nativeEvent}: NativeSyntheticEvent<NativeScrollEvent>) => {
      selectPage(
        shortIndexFromOffset(
          nativeEvent.contentOffset.y,
          viewport.height,
          videoIds.length,
        ),
      );
    },
    [selectPage, videoIds.length, viewport.height],
  );

  const renderItem = useCallback(
    ({item, index}: ListRenderItemInfo<string>) => (
      <PhoneShortPage
        {...getShortPageState(index, selected, preloadNext)}
        height={viewport.height}
        initialEndpoint={index === 0 ? navEndpoint : undefined}
        onPrepared={setPreparedId}
        playing={playing}
        videoId={item}
        width={viewport.width}
      />
    ),
    [navEndpoint, playing, preloadNext, selected, viewport],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<string> | null | undefined, index: number) => ({
      index,
      length: viewport.height,
      offset: viewport.height * index,
    }),
    [viewport.height],
  );
  const extraData = useMemo(
    () => ({playing, preloadNext, selected, viewport}),
    [playing, preloadNext, selected, viewport],
  );

  return (
    <View onLayout={onLayout} style={styles.root}>
      {viewport.height > 0 && viewport.width > 0 ? (
        <FlatList
          ref={listRef}
          data={videoIds}
          extraData={extraData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          pagingEnabled
          decelerationRate={"fast"}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior={"never"}
          automaticallyAdjustContentInsets={false}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onMomentumScrollEnd={onMomentumScrollEnd}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "black",
  },
});

import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import {useNavigation} from "@react-navigation/native";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {Platform} from "react-native";

import {PhoneVideoMenuContent} from "@/components/general/phone/PhoneVideoMenuContent";
import {usePlaylistManagerContext} from "@/context/PlaylistManagerContext";
import type {ElementData} from "@/extraction/Types";
import type {NativeStackProp} from "@/navigation/types";
import {sheetAccessibilityProps} from "@/ui/patterns/sheetAccessibility";
import {useAppTheme} from "@/ui/theme";

interface VideoMenuContextType {
  /**
   * Opens the video menu for an element. Missing where no menu is mounted,
   * such as on TV, where the card opens its own side panel route.
   */
  open?: (element: ElementData) => void;
}

const VMContext = createContext<VideoMenuContextType>({});

interface VideoMenuProviderProps {
  children: ReactNode;
}

/**
 * The phone video menu, opened from the overflow button or a long press on a
 * media card. It has to live inside the `PlaylistManagerContext`, whose bottom
 * sheet modal provider hosts this sheet and whose picker the menu opens.
 */
export function VideoMenuProvider({children}: VideoMenuProviderProps) {
  if (Platform.isTV) {
    return children;
  }

  return <PhoneVideoMenuProvider>{children}</PhoneVideoMenuProvider>;
}

function PhoneVideoMenuProvider({children}: VideoMenuProviderProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const navigation = useNavigation<NativeStackProp>();
  const {save} = usePlaylistManagerContext();
  const {theme} = useAppTheme();
  const [element, setElement] = useState<ElementData>();

  // Presented after the render that mounted the content, so the sheet can
  // size itself to the entries.
  useEffect(() => {
    if (element) {
      sheetRef.current?.present();
    }
  }, [element]);

  const close = useCallback(() => sheetRef.current?.dismiss(), []);

  const value = useMemo<VideoMenuContextType>(
    () => ({open: next => setElement(next)}),
    [],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={"close"}
      />
    ),
    [],
  );

  return (
    <VMContext.Provider value={value}>
      {children}
      <BottomSheetModal
        {...sheetAccessibilityProps}
        backdropComponent={renderBackdrop}
        backgroundStyle={{backgroundColor: theme.colors.surface}}
        handleIndicatorStyle={{backgroundColor: theme.colors.textSecondary}}
        onDismiss={() => setElement(undefined)}
        ref={sheetRef}>
        {element ? (
          <PhoneVideoMenuContent
            // A fresh body per element, so no data of the previous video
            // shows while the next one loads.
            key={element.id}
            element={element}
            onAddToPlaylist={videoId => {
              close();
              save([videoId]);
            }}
            onClose={close}
            onOpenChannel={channelId => {
              close();
              navigation.navigate("ChannelScreen", {channelId});
            }}
          />
        ) : null}
      </BottomSheetModal>
    </VMContext.Provider>
  );
}

export function useVideoMenu() {
  return useContext(VMContext);
}

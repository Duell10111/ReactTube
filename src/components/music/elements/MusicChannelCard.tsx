import {useNavigation} from "@react-navigation/native";
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import {ChannelData} from "@/extraction/Types";
import {NativeStackProp} from "@/navigation/types";

interface MusicChannelCardProps {
  data: ChannelData;
  style?: StyleProp<ViewStyle>;
}

export function MusicChannelCard({data, style}: MusicChannelCardProps) {
  const navigation = useNavigation<NativeStackProp>();

  const onPress = () => {
    navigation.navigate("MusicChannelScreen", {artistId: data.id});
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={[styles.container, style]}>
        <Image
          style={styles.imageStyle}
          source={{uri: data.thumbnailImage.url}}
          resizeMode={"cover"}
        />
        <Text style={styles.titleStyle}>{data.title}</Text>
        <Text style={styles.subtitleStyle}>{data.subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    // width: 500,
  },
  imageStyle: {
    aspectRatio: 1,
    width: "100%",
    borderRadius: 100,
  },
  titleStyle: {
    fontSize: 20,
    color: "white",
    textAlign: "center",
  },
  subtitleStyle: {
    fontSize: 12,
    color: "white",
    textAlign: "center",
  },
});

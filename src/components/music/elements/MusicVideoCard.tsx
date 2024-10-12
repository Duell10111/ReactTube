import {useNavigation, useRoute} from "@react-navigation/native";
import {Icon} from "@rneui/base";
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {VideoData} from "@/extraction/Types";
import {NativeStackProp} from "@/navigation/types";

interface MusicVideoCardProps {
  data: VideoData;
  style?: StyleProp<ViewStyle>;
}

export function MusicVideoCard({data, style}: MusicVideoCardProps) {
  const navigation = useNavigation<NativeStackProp>();
  const {setCurrentItem} = useMusikPlayerContext();

  const onPress = () => {
    setCurrentItem(data);
    navigation.navigate("MusicPlayerScreen");
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={[styles.container, style]}>
        <View style={styles.imageContainer}>
          <Image
            style={styles.imageStyle}
            source={{uri: data.thumbnailImage.url}}
            resizeMode={"cover"}
          />
          <Icon
            type={"entypo"}
            containerStyle={styles.playIconStyle}
            name={"controller-play"}
            raised
            size={20}
          />
          {/*<View style={styles.playIconStyle} />*/}
        </View>
        <Text style={styles.titleStyle}>{data.title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    // width: 500,
  },
  imageContainer: {
    aspectRatio: 1.7,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  imageStyle: {
    borderRadius: 10,
    width: "100%",
    height: "100%",
  },
  playIconStyle: {
    position: "absolute",
    top: "20%",
    alignItems: "center",
  },
  titleStyle: {
    fontSize: 17,
    color: "white",
  },
});

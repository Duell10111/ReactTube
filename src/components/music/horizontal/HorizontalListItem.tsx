import {useNavigation} from "@react-navigation/native";
import {useMemo} from "react";
import {Image, StyleSheet, Text, TouchableHighlight, View} from "react-native";

import {useAppStyle} from "../../../context/AppStyleContext";
import {useMusikPlayerContext} from "../../../context/MusicPlayerContext";
import {ElementData} from "../../../extraction/Types";
import {RootNavProp} from "../../../navigation/RootStackNavigator";

interface HorizontalListItemProps {
  data: ElementData;
}

export function HorizontalListItem({data}: HorizontalListItemProps) {
  const {style} = useAppStyle();
  const {setCurrentItem} = useMusikPlayerContext();
  const navigation = useNavigation<RootNavProp>();

  const author = useMemo(() => {
    return data.type === "video"
      ? data.artists?.[0].name ?? data.author?.name
      : data.author?.name;
  }, [data]);

  return (
    <TouchableHighlight
      onPress={() => {
        if (data.type === "video") {
          setCurrentItem(data);
          navigation.navigate("MusicPlayerScreen");
        }
      }}>
      <View style={styles.container}>
        <Image
          style={styles.imageStyle}
          source={{uri: data.thumbnailImage.url}}
          resizeMode={"cover"}
        />
        <View style={styles.textContainer}>
          <Text style={{color: style.textColor}}>{data.title}</Text>
          <Text
            style={{
              color: style.textColor,
            }}>{`${author} - ${data.originalNode.type}`}</Text>
        </View>
      </View>
    </TouchableHighlight>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    // backgroundColor: "orange",
    width: 350,
    height: 50,
  },
  imageStyle: {
    aspectRatio: 1,
    borderRadius: 5,
  },
  textContainer: {
    marginLeft: 5,
    justifyContent: "center",
    flexShrink: 1,
  },
  titleStyle: {
    fontSize: 20,
    fontWeight: "bold",
  },
});

import React, {useEffect} from "react";
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {Button} from "react-native-paper";
import QRCode from "react-native-qrcode-svg";

import {useAccountContext} from "@/context/AccountContext";
import {useAppStyle} from "@/context/AppStyleContext";

const Clipboard = !Platform.isTV
  ? require("@react-native-clipboard/clipboard").default
  : {};

export default function LoginScreen() {
  const account = useAccountContext();
  const {style, type} = useAppStyle();

  useEffect(() => {
    if (!Platform.isTV && account?.qrCode) {
      Clipboard.setString(account.qrCode.user_code);
      if (!__DEV__) {
        Linking.openURL(account?.qrCode.verification_url).catch(console.warn);
      }
    }
  }, [account?.qrCode]);

  return (
    <View style={styles.container}>
      {account?.qrCode ? (
        <View style={styles.loginContainer}>
          <QRCode
            value={account.qrCode.verification_url}
            size={Platform.isTV ? 500 : 250}
            backgroundColor={type === "dark" ? "black" : undefined}
            color={type === "dark" ? "white" : undefined}
          />
          <Text style={[styles.codeText, {color: style.textColor}]}>
            {"Your code is: " + account.qrCode.user_code}
          </Text>
        </View>
      ) : (
        <View style={styles.loginContainer}>
          <Text style={[styles.codeText, {color: style.textColor}]}>
            {"Please init login first"}
          </Text>
        </View>
      )}
      <TouchableOpacity
        onPress={() => {
          console.log("Login pressed");
          console.log(account);
          account?.login();
        }}>
        <Button icon={"login"} mode={"contained"}>
          {"Login"}
        </Button>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  codeText: {
    fontSize: 25,
    paddingVertical: 20,
  },
  loginContainer: {
    alignItems: "center",
  },
});

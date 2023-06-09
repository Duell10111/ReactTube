import React from "react";
import {StyleSheet, Text, View} from "react-native";
import {Button} from "@rneui/base";
import {useAccountContext} from "../context/AccountContext";
import QRCode from "react-native-qrcode-svg";
import {useAppStyle} from "../context/AppStyleContext";

export default function LoginScreen() {
  const account = useAccountContext();
  const {style, type} = useAppStyle();

  return (
    <View style={styles.container}>
      {account?.qrCode ? (
        <View style={styles.loginContainer}>
          <QRCode
            value={account.qrCode.verification_url}
            size={500}
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
            Please init login first
          </Text>
        </View>
      )}
      <Button title={"Login"} size={"lg"} onPress={() => account?.login()} />
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

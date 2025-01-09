import {DeviceMotion} from "expo-sensors";
import {useEffect, useState} from "react";
import {Platform} from "react-native";

export default function useOrientationChangeMotionSensor() {
  const [orientation, setOrientation] = useState<number>();
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    DeviceMotion.isAvailableAsync().then(available => {
      if (!available) {
        console.log("DeviceMotion is not available");
        DeviceMotion.requestPermissionsAsync()
          .then(() => {
            console.log("DeviceMotion Permission granted!");
            setPermissionGranted(true);
          })
          .catch(console.warn);
      } else {
        console.log("DeviceMotion is available");
        setPermissionGranted(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!permissionGranted) {
      console.log("No Permission Granted! Skipping setup!");
    }
    const sub = DeviceMotion.addListener(deviceMotionData => {
      const orientationDeg =
        Platform.OS === "ios"
          ? deviceMotionData.orientation
          : orientationCalculation(
              Number(deviceMotionData.rotation.gamma).toFixed(2),
              Number(deviceMotionData.rotation.beta).toFixed(2),
            );
      setOrientation(orientationDeg);
      console.log("Updating orientation: ", orientationDeg);
    });
    return () => sub.remove();
  }, [permissionGranted]);

  return {orientation};
}

function orientationCalculation(gamma, beta) {
  const ABSOLUTE_GAMMA = Math.abs(gamma);
  const ABSOLUTE_BETA = Math.abs(beta);
  const isGammaNegative = Math.sign(gamma) === -1;
  let orientation = 0;

  if (ABSOLUTE_GAMMA <= 0.04 && ABSOLUTE_BETA <= 0.24) {
    //Portrait mode, on a flat surface.
    orientation = 0;
  } else if (
    (ABSOLUTE_GAMMA <= 1.0 || ABSOLUTE_GAMMA >= 2.3) &&
    ABSOLUTE_BETA >= 0.5
  ) {
    //General Portrait mode, accounting for forward and back tilt on the top of the phone.
    orientation = 0;
  } else {
    if (isGammaNegative) {
      //Landscape mode with the top of the phone to the left.
      orientation = -90;
    } else {
      //Landscape mode with the top of the phone to the right.
      orientation = 90;
    }
  }
  return orientation;
}

import {useEffect, useState} from "react";
import Server from "@dr.pogodin/react-native-static-server";
import {contentFolder} from "./StorageFkts";

export default function useHLSServer() {
  const [origin, setOrigin] = useState("");

  console.log("HLS Server Origin: ", origin);

  useEffect(() => {
    let server = new Server({
      fileDir: contentFolder,
    });
    (async () => {
      // You can do additional async preparations here; e.g. on Android
      // it is a good place to extract bundled assets into an accessible
      // location.

      // Note, on unmount this hook resets "server" variable to "undefined",
      // thus if "undefined" the hook has unmounted while we were doing
      // async operations above, and we don't need to launch
      // the server anymore.
      if (server) {
        setOrigin(await server.start());
      }
    })();

    return () => {
      setOrigin("");

      // No harm to trigger .stop() even if server has not been launched yet.
      server?.stop();

      server = undefined;
    };
  }, []);

  return origin;
}

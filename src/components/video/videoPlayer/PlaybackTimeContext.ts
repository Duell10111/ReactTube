import {createContext, useContext} from "react";

/**
 * The playing position in seconds, for content the player hosts but does not
 * own, such as the panel below the controls. That content is created by the
 * screen, which does not re-render on every progress event, so it reads the
 * position here instead of through props.
 */
export const PlaybackTimeContext = createContext<number | undefined>(undefined);

/** Undefined outside a player. */
export function usePlaybackTime() {
  return useContext(PlaybackTimeContext);
}

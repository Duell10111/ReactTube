export const calculateTime = (args: FormatTime) => {
  const {
    time: currentTime = 0,
    duration,
    showTimeRemaining,
    showDuration,
  } = args;

  const formattedDuration = !showDuration
    ? ""
    : `/${formatTime({
        ...args,
        time: duration,
        showTimeRemaining: false,
      })}`;

  if (showTimeRemaining) {
    const time = duration - currentTime;
    return `${formatTime({...args, time})}${formattedDuration}`;
  }

  return `${formatTime({...args, time: currentTime})}${formattedDuration}`;
};

interface FormatTime {
  time?: number;
  duration: number;
  showDuration: boolean;
  showTimeRemaining: boolean;
  showHours: boolean;
}

const formatTime = ({
  time = 0,
  duration,
  showTimeRemaining,
  showHours,
}: FormatTime) => {
  const symbol = showTimeRemaining ? "-" : "";
  time = Math.min(Math.max(time, 0), duration);

  if (!showHours) {
    const formattedMinutes = Math.floor(time / 60)
      .toFixed(0)
      .padStart(2, "0");
    const formattedSeconds = Math.floor(time % 60)
      .toFixed(0)
      .padStart(2, "0");

    return `${symbol}${formattedMinutes}:${formattedSeconds}`;
  }

  const formattedHours = Math.floor(time / 3600)
    .toFixed(0)
    .padStart(2, "0");
  const formattedMinutes = (Math.floor(time / 60) % 60)
    .toFixed(0)
    .padStart(2, "0");
  const formattedSeconds = Math.floor(time % 60)
    .toFixed(0)
    .padStart(2, "0");

  return `${symbol}${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

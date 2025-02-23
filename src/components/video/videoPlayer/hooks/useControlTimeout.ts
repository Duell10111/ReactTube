import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useEffect,
  useState,
} from "react";

interface ControlTimeoutProps {
  controlTimeout: MutableRefObject<ReturnType<typeof setTimeout>>;
  controlTimeoutDelay: number;
  mounted: boolean;
  showControls: boolean;
  setShowControls: Dispatch<SetStateAction<boolean>>;
  alwaysShowControls: boolean;
}

export const useControlTimeout = ({
  controlTimeout,
  controlTimeoutDelay,
  mounted,
  showControls,
  setShowControls,
  alwaysShowControls,
}: ControlTimeoutProps) => {
  const [_controlTimeout, _setControlTimeout] = useState<boolean>();
  const [_clearTimeout, setClearTimeout] = useState<boolean>();

  const setControlTimeout = () => {
    // console.log("SET Control Timeout");
    _setControlTimeout(prevState => !prevState);
  };

  const clearControlTimeout = () => {
    setClearTimeout(true);
  };

  const resetControlTimeout = () => {
    clearControlTimeout();
  };

  const hideControls = () => {
    if (mounted && showControls && !alwaysShowControls) {
      setShowControls(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    controlTimeout.current = setTimeout(() => {
      hideControls();
    }, controlTimeoutDelay);

    return () => {
      clearTimeout(controlTimeout.current);
    };
  }, [_controlTimeout]);

  useEffect(() => {
    if (_clearTimeout) {
      clearTimeout(controlTimeout.current);
      // console.log("Clear Timeout");
      setClearTimeout(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_clearTimeout]);

  return {
    clearControlTimeout,
    resetControlTimeout,
    hideControls,
    setClearTimeout,
    setControlTimeout,
  };
};

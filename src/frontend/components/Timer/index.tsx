import { useEffect, useRef, useState } from "react";
import { formatDuration } from "src/frontend/utils/formatter";

type TimerProps = {
  startTime?: number;
  endTime?: number;
};

export default function _Timer(props: TimerProps): JSX.Element | null {
  const { startTime } = props;
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>();
  const [endTime, setEndTime] = useState<number>(Date.now());

  useEffect(() => {
    return () => {
      intervalRef.current && clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (props.endTime) {
      setEndTime(props.endTime);
      intervalRef.current && clearInterval(intervalRef.current);
      return;
    } else {
      intervalRef.current = setInterval(() => {
        setEndTime(Date.now());
      }, 1000);
    }
  }, [props.endTime]);

  if (!startTime) {
    return null;
  }

  return <>{formatDuration(endTime - startTime)}</>;
}

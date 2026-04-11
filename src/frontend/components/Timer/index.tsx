import React from "react";
import { useEffect, useRef, useState } from "react";
import { formatDuration } from "src/frontend/utils/formatter";

/** Props for the Timer component. */
type TimerProps = {
  /** Start timestamp in milliseconds. */
  startTime?: number;
  /** End timestamp in milliseconds. If omitted, timer counts up in real time. */
  endTime?: number;
};

/**
 * Displays elapsed time between startTime and endTime. If endTime is not provided,
 * updates every second to show a live running timer.
 * @param props - Start and optional end timestamps.
 * @returns Formatted duration string or null if no startTime.
 */
export default function _Timer(props: TimerProps): React.JSX.Element | null {
  const { startTime } = props;
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
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
      intervalRef.current = undefined;
      return;
    }

    intervalRef.current = setInterval(() => {
      setEndTime(Date.now());
    }, 1000);

    return () => {
      intervalRef.current && clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    };
  }, [props.endTime]);

  if (!startTime) {
    return null;
  }

  return <>{formatDuration(endTime - startTime)}</>;
}

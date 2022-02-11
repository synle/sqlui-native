import { useEffect } from 'react';
import { useRef } from 'react';
import { useState } from 'react';

interface TimerProps {
  startTime?: number;
  endTime?: number;
}

export default function _Timer(props: TimerProps) {
  const { startTime } = props;
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>();
  const [endTime, setEndTime] = useState<number>(Date.now());

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setEndTime(Date.now());
    }, 1000);

    return () => {
      intervalRef.current && clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (props.endTime) {
      intervalRef.current && clearInterval(intervalRef.current);
      return;
    }

    setEndTime(props.endTime || Date.now());
  }, [props.endTime]);

  if (!startTime) {
    return null;
  }

  const duration = Math.floor((endTime - startTime) / 1000);

  let formattedDuration;
  if (duration <= 1) {
    formattedDuration = '<= 1 second';
  } else {
    formattedDuration = Math.floor((endTime - startTime) / 1000) + ' seconds';
  }
  return <>{formattedDuration}</>;
}

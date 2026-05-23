import React, {memo, useEffect, useState} from 'react';
import {Text} from 'ink';
import {theme} from '../theme/catppuccin.js';

type Props = {
  active: boolean;
  startedAt?: number;
};

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function calculateElapsedSeconds(active: boolean, startedAt: number | undefined, now: number): number {
  if (!active || !startedAt) {
    return 0;
  }

  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

function ElapsedTimerComponent({active, startedAt}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const elapsedSeconds = calculateElapsedSeconds(active, startedAt, now);

  useEffect(() => {
    if (!active) {
      setNow(Date.now());
      return;
    }

    setNow(Date.now());
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [active, startedAt]);

  return <Text color={theme.muted}>{formatElapsed(elapsedSeconds)}</Text>;
}

export const ElapsedTimer = memo(ElapsedTimerComponent);

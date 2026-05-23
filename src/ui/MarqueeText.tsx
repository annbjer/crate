import React, {memo, useEffect, useMemo, useState} from 'react';
import {Text} from 'ink';
import {theme} from '../theme/catppuccin.js';

type Props = {
  text: string;
  width: number;
  active: boolean;
  intervalMs?: number;
};

const DEFAULT_INTERVAL_MS = 500;
const marqueeGap = '   •   ';

function truncateText(text: string, width: number): string {
  if (width <= 0) {
    return '';
  }

  if (text.length <= width) {
    return text;
  }

  if (width === 1) {
    return '…';
  }

  return `${text.slice(0, width - 1)}…`;
}

function MarqueeTextComponent({text, width, active, intervalMs = DEFAULT_INTERVAL_MS}: Props) {
  const safeWidth = Math.max(1, width);
  const shouldScroll = active && text.length > safeWidth;
  const [offset, setOffset] = useState(0);

  const loopText = useMemo(() => `${text}${marqueeGap}`, [text]);
  const displayText = useMemo(() => {
    if (!shouldScroll) {
      return truncateText(text, safeWidth);
    }

    const repeated = `${loopText}${loopText}`;
    return repeated.slice(offset, offset + safeWidth);
  }, [loopText, offset, safeWidth, shouldScroll, text]);

  useEffect(() => {
    setOffset(0);
  }, [text, safeWidth, active]);

  useEffect(() => {
    if (!shouldScroll) {
      return;
    }

    const timer = setInterval(() => {
      setOffset(value => (value + 1) % loopText.length);
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [intervalMs, loopText.length, shouldScroll]);

  return <Text color={theme.text} wrap="truncate-end">{displayText}</Text>;
}

export const MarqueeText = memo(MarqueeTextComponent);

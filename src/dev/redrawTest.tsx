import React, {useEffect, useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';

function formatTime(date: Date): string {
  return date.toLocaleTimeString();
}

export function RedrawTest() {
  const {exit} = useApp();
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(value => value + 1);
      setNow(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text bold>Crate redraw diagnostic</Text>
      <Text> </Text>
      <Text>tick: {String(tick).padStart(6, '0')}</Text>
      <Text>time: {formatTime(now)}</Text>
      <Text> </Text>
      <Text>This screen updates once per second.</Text>
      <Text>Leave this terminal window inactive and watch for flicker.</Text>
      <Text> </Text>
      <Text color="gray">q quit · ctrl+c quit</Text>
    </Box>
  );
}

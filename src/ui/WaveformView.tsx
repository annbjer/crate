import React, {memo} from 'react';
import {Box, Text} from 'ink';
import type {WaveformState} from '../waveform/types.js';
import {renderWaveform} from '../waveform/renderWaveform.js';
import {theme} from '../theme/catppuccin.js';

type Props = {
  waveform: WaveformState;
  active: boolean;
};

function DecorativeSignal({active}: {active: boolean}) {
  const signalColor = active ? theme.green : theme.muted;

  return (
    <Box flexDirection="column">
      <Text color={signalColor} wrap="truncate-end">__    __..:.</Text>
      <Text color={signalColor} wrap="truncate-end">*''^^-^''    ^*^º-_</Text>
      <Text color={signalColor} wrap="truncate-end">                  'º^^_</Text>
      <Text color={signalColor} wrap="truncate-end">                      º:-_______</Text>
    </Box>
  );
}

function WaveformViewComponent({waveform, active}: Props) {
  if (waveform.status === 'loading') {
    return <Text color={theme.muted}>analyzing waveform…</Text>;
  }

  if (waveform.status === 'ready') {
    return <Text color={theme.green} wrap="truncate-end">{renderWaveform(waveform.buckets)}</Text>;
  }

  if (waveform.status === 'error') {
    return <Text color={theme.peach} wrap="truncate-end">waveform unavailable — {waveform.message}</Text>;
  }

  return <DecorativeSignal active={active} />;
}

export const WaveformView = memo(WaveformViewComponent);

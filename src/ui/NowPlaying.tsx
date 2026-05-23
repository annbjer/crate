import React, {memo} from 'react';
import {Box, Text, useStdout} from 'ink';
import type {PlaybackSnapshot} from '../player/types.js';
import type {WaveformState} from '../waveform/types.js';
import {theme} from '../theme/catppuccin.js';
import {ElapsedTimer} from './ElapsedTimer.js';
import {MarqueeText} from './MarqueeText.js';
import {WaveformView} from './WaveformView.js';

type Props = {
  playback: PlaybackSnapshot;
  waveform: WaveformState;
};

function stateColor(state: PlaybackSnapshot['state']): string {
  if (state === 'playing') {
    return theme.green;
  }

  if (state === 'error') {
    return theme.red;
  }

  return theme.muted;
}

function NowPlayingComponent({playback, waveform}: Props) {
  const {stdout} = useStdout();
  const estimatedTitleWidth = Math.max(20, Math.floor((stdout.columns ?? 80) * 0.4) - 8);
  const track = playback.track;
  const nowPlayingLine = track
    ? [track.artist, track.album, track.title].filter(Boolean).join(' • ')
    : 'select a track and press enter';

  return (
    <Box flexDirection="column" paddingX={2}>
      <Box flexDirection="row">
        <Text color={theme.accent} bold>now playing</Text>
        <Text color={theme.muted}>  </Text>
        <Text color={stateColor(playback.state)}>● {playback.state}</Text>
        <Text color={theme.muted}>  </Text>
        <ElapsedTimer active={playback.state === 'playing'} startedAt={playback.startedAt} />
      </Box>

      <Box marginTop={1} flexDirection="column">
        <WaveformView waveform={waveform} active={playback.state === 'playing'} />
      </Box>

      <Box marginTop={1} flexDirection="column">
        <MarqueeText text={nowPlayingLine} width={estimatedTitleWidth} active={playback.state === 'playing'} />
        <Text color={theme.muted} wrap="truncate-end">[a prev] [d next] [enter play] [s stop] [q quit]</Text>
      </Box>

      {playback.error && (
        <Box marginTop={1}>
          <Text color={theme.red} wrap="truncate-end">error: {playback.error}</Text>
        </Box>
      )}
    </Box>
  );
}

export const NowPlaying = memo(NowPlayingComponent);

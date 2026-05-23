export type PlaybackState = 'idle' | 'playing' | 'stopped' | 'error';

export type NowPlayingTrack = {
  path: string;
  title: string;
  artist?: string;
  album?: string;
};

export type PlaybackSnapshot = {
  state: PlaybackState;
  track?: NowPlayingTrack;
  error?: string;
  startedAt?: number;
};

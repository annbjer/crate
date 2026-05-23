export type WaveformState =
  | {status: 'idle'}
  | {status: 'loading'; trackPath: string}
  | {status: 'ready'; trackPath: string; buckets: number[]}
  | {status: 'error'; trackPath: string; message: string};

export type WaveformOptions = {
  columns?: number;
  sampleRate?: number;
};

export type WaveformExtraction = {
  promise: Promise<number[]>;
  cancel: () => void;
};

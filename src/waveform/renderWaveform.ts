const waveformBlocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export function renderWaveform(buckets: number[]): string {
  if (buckets.length === 0) {
    return '';
  }

  return buckets
    .map(bucket => {
      const normalized = Math.max(0, Math.min(1, bucket));
      const index = Math.min(
        waveformBlocks.length - 1,
        Math.floor(normalized * waveformBlocks.length),
      );

      return waveformBlocks[index];
    })
    .join('');
}

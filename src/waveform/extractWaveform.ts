import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import type {WaveformExtraction, WaveformOptions} from './types.js';

const DEFAULT_COLUMNS = 64;
const DEFAULT_SAMPLE_RATE = 8000;
const MAX_INT16_AMPLITUDE = 32768;

function calculateRmsBuckets(buffer: Buffer, columns: number): number[] {
  const sampleCount = Math.floor(buffer.length / 2);
  if (sampleCount === 0) {
    return [];
  }

  const bucketCount = Math.min(columns, sampleCount);
  const samplesPerBucket = Math.ceil(sampleCount / bucketCount);
  const buckets: number[] = [];

  for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex += 1) {
    const startSample = bucketIndex * samplesPerBucket;
    const endSample = Math.min(startSample + samplesPerBucket, sampleCount);
    let sumSquares = 0;
    let count = 0;

    for (let sampleIndex = startSample; sampleIndex < endSample; sampleIndex += 1) {
      const sample = buffer.readInt16LE(sampleIndex * 2) / MAX_INT16_AMPLITUDE;
      sumSquares += sample * sample;
      count += 1;
    }

    buckets.push(count > 0 ? Math.sqrt(sumSquares / count) : 0);
  }

  const maxBucket = Math.max(...buckets);
  if (maxBucket <= 0) {
    return buckets;
  }

  return buckets.map(bucket => bucket / maxBucket);
}

export function extractWaveform(filePath: string, options: WaveformOptions = {}): WaveformExtraction {
  const columns = options.columns ?? DEFAULT_COLUMNS;
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const chunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  let settled = false;
  let cancelled = false;
  let child: ChildProcessWithoutNullStreams | undefined;

  const promise = new Promise<number[]>((resolve, reject) => {
    try {
      child = spawn('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        filePath,
        '-ac',
        '1',
        '-ar',
        String(sampleRate),
        '-f',
        's16le',
        'pipe:1',
      ]);
    } catch (error) {
      settled = true;
      reject(error);
      return;
    }

    child.stdout.on('data', chunk => {
      chunks.push(Buffer.from(chunk));
    });

    child.stderr.on('data', chunk => {
      stderrChunks.push(Buffer.from(chunk));
    });

    child.once('error', error => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    });

    child.once('exit', code => {
      if (settled) {
        return;
      }

      settled = true;

      if (cancelled) {
        reject(new Error('waveform extraction cancelled'));
        return;
      }

      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
        reject(new Error(stderr || `ffmpeg exited with code ${code ?? 'unknown'}`));
        return;
      }

      resolve(calculateRmsBuckets(Buffer.concat(chunks), columns));
    });
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;

      if (child && !child.killed) {
        child.kill('SIGTERM');
      }
    },
  };
}

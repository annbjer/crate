import type {ChildProcess} from 'node:child_process';
import {startAfplay} from './afplayBackend.js';
import type {NowPlayingTrack, PlaybackSnapshot} from './types.js';

type Listener = (snapshot: PlaybackSnapshot) => void;
type NaturalEndListener = (track: NowPlayingTrack) => void;

export class PlayerController {
  private process?: ChildProcess;
  private snapshot: PlaybackSnapshot = {state: 'idle'};
  private listeners = new Set<Listener>();
  private naturalEndListeners = new Set<NaturalEndListener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);

    return () => {
      this.listeners.delete(listener);
    };
  }

  onNaturalEnd(listener: NaturalEndListener): () => void {
    this.naturalEndListeners.add(listener);

    return () => {
      this.naturalEndListeners.delete(listener);
    };
  }

  play(track: NowPlayingTrack): void {
    this.stopProcessOnly();

    try {
      const child = startAfplay(track.path);
      this.process = child;
      this.setSnapshot({
        state: 'playing',
        track,
        startedAt: Date.now(),
      });

      child.once('error', error => {
        if (this.process !== child) {
          return;
        }

        this.process = undefined;
        this.setSnapshot({
          state: 'error',
          track,
          error: error.message,
        });
      });

      child.once('exit', (code, signal) => {
        if (this.process !== child) {
          return;
        }

        this.process = undefined;

        if (code === 0) {
          this.setSnapshot({state: 'stopped', track});
          this.notifyNaturalEnd(track);
          return;
        }

        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          this.setSnapshot({state: 'stopped', track});
          return;
        }

        this.setSnapshot({
          state: 'error',
          track,
          error: `afplay exited with code ${code ?? 'unknown'}`,
        });
      });
    } catch (error) {
      this.setSnapshot({
        state: 'error',
        track,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  stop(): void {
    const track = this.snapshot.track;
    this.stopProcessOnly();
    this.setSnapshot(track ? {state: 'stopped', track} : {state: 'stopped'});
  }

  dispose(): void {
    this.stopProcessOnly();
    this.listeners.clear();
    this.naturalEndListeners.clear();
  }

  private stopProcessOnly(): void {
    if (!this.process) {
      return;
    }

    const child = this.process;
    this.process = undefined;

    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  private setSnapshot(snapshot: PlaybackSnapshot): void {
    this.snapshot = snapshot;

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private notifyNaturalEnd(track: NowPlayingTrack): void {
    for (const listener of this.naturalEndListeners) {
      listener(track);
    }
  }
}

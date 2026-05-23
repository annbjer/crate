import {spawn, type ChildProcess} from 'node:child_process';

export type AfplayProcess = ChildProcess;

export function startAfplay(filePath: string): AfplayProcess {
  return spawn('afplay', [filePath], {
    stdio: 'ignore',
  });
}

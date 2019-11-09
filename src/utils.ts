/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { mkdir, readFile, writeFile } from 'fs';
import * as glob from 'glob';
import * as once from 'once';
import * as rimraf from 'rimraf';
import * as tmp from 'tmp';
import { promisify } from 'util';

export const BUILD_DIRECTORY = 'build';

export const globP: (pattern: string) => Promise<string[]> = promisify(glob);
export const readFileP: (
  path: string,
  encoding?: string
) => Promise<Buffer | string> = promisify(readFile);
export const writeFileP: (
  path: string,
  data: string,
  encoding?: string
) => Promise<void> = promisify(writeFile);
export const tmpDirP = promisify(tmp.dir) as () => Promise<string>;
export const rimrafP: (f: string) => Promise<void> = promisify(rimraf);
export const mkdirP: (path: string, mode?: number) => Promise<void> = promisify(
  mkdir
);

function promisifyChildProcess(
  childProcess: ChildProcess,
  log?: (text: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const exit = (err?: Error) => once(() => (err ? reject(err) : resolve()))();
    const resLog = log ? log : (text: string) => {};
    childProcess.stdout!.on('data', txt => {
      resLog(txt.toString());
    });
    childProcess.stderr!.on('data', txt => {
      resLog(txt.toString());
    });
    childProcess.on('error', exit);
    childProcess.on('close', code => {
      if (code === 0) {
        exit();
      } else {
        exit(
          new Error(`Process ${childProcess.pid} exited with code ${code}.`)
        );
      }
    });
  });
}

export async function spawnP(
  command: string,
  args?: string[],
  options?: SpawnOptions,
  log?: (text: string) => void
): Promise<void> {
  const stringifiedCommand = `\`${command}${
    args ? ' ' + args.join(' ') : ''
  }\``;
  if (log) {
    log(`> Running: ${stringifiedCommand}`);
  }
  await promisifyChildProcess(
    spawn(
      command,
      args || [],
      Object.assign({ stdio: 'pipe', shell: true }, options)
    ),
    log
  );
}

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

import {SpawnOptions} from 'child_process';
import * as packlist from 'npm-packlist';
import * as path from 'path';
import * as tar from 'tar';

import {mkdirP, rimrafP, spawnP, tmpDirP, writeFileP} from './utils';

export interface BaseCodeSample {
  description: string;
  dependencies?: string[];
  devDependencies?: string[];
}

export interface TSCodeSample extends BaseCodeSample {
  ts: string;
}

export interface JSCodeSample extends BaseCodeSample {
  js: string;
}

export type CodeSample = JSCodeSample|TSCodeSample;

function isJSCodeSample(sample: CodeSample): sample is JSCodeSample {
  return !!((sample as JSCodeSample).js);
}

export interface Injectables {
  spawn: typeof spawnP;
  mkdir: typeof mkdirP;
  rimraf: typeof rimrafP;
  tmpDir: typeof tmpDirP;
  writeFile: typeof writeFileP;
}

const DEFAULT_INJECTABLES: Injectables = {
  spawn: spawnP,
  mkdir: mkdirP,
  tmpDir: tmpDirP,
  rimraf: rimrafP,
  writeFile: writeFileP
};

interface TestOptions {
  sample: CodeSample;
  packageDir?: string;
}

export async function pack(
    packageDir: string, targetDir: string): Promise<string> {
  const packageTarball = path.join(targetDir, 'module-under-test.tgz');
  const files = await packlist({path: packageDir});
  await tar.create(
      {
        prefix: 'package/',
        cwd: packageDir,
        file: packageTarball,
        gzip: true
        // @types/tar is missing type for prefix in CreateOptions.
        // TODO: submit fix upstream.
        // tslint:disable-next-line:no-any
      } as any,
      files);
  return packageTarball;
}

export async function packNTest(options: TestOptions) {
  await packNTestInternal(options, DEFAULT_INJECTABLES);
}

export interface TestOptionsForTesting extends TestOptions {
  injectables: Partial<Injectables>;
}

export async function packNTestForTesting(options: TestOptionsForTesting) {
  const injectables = {...DEFAULT_INJECTABLES, ...options.injectables};
  await packNTestInternal(options, injectables);
}

export async function packNTestInternal(
    options: TestOptions, injectables: Injectables) {
  const moduleUnderTest = options.packageDir || process.cwd();
  let output = '';
  const installDir = await injectables.tmpDir();

  try {
    const tarball = await pack(moduleUnderTest, installDir);
    await prepareTarget(tarball, options.sample);
    await runSample(installDir, options.sample);
  } catch (err) {
    err.output = output;
    throw err;
  } finally {
    injectables.rimraf(installDir);
  }
  return;

  function log(message: string) {
    output += message;
  }

  async function run(cmd: string, args: string[], options?: SpawnOptions) {
    return injectables.spawn(cmd, args, options, log);
  }

  async function prepareTarget(tarball: string, sample: CodeSample) {
    // Generate a package.json.
    await run('npm', ['init', '-y'], {cwd: installDir});

    const dependencies = sample.dependencies || [];
    const devDependencies = (sample.devDependencies || []);

    if (!isJSCodeSample(sample)) {
      devDependencies.push('typescript');
    }

    // Add dependencies, including tarball, to package.json.
    // TODO: modify package.json rather than spawning npm.
    await run(
        'npm',
        ['install', '--prefer-offline', '--save', tarball].concat(dependencies),
        {cwd: installDir});

    await run(
        'npm',
        ['install', '--prefer-offline', '--save-dev'].concat(devDependencies),
        {cwd: installDir});

    // Poupulate test code.
    const filename = isJSCodeSample(sample) ? 'index.js' : 'index.ts';
    const code = isJSCodeSample(sample) ? sample.js : sample.ts;
    await injectables.writeFile(path.join(installDir, filename), code, 'utf-8');

    // If TypeScript, compile it.
    if (!isJSCodeSample(sample)) {
      // TODO: maybe make it flexible for users to pass in typescript config.
      await run(
          'node_modules/.bin/tsc', ['--strict', 'index.ts'], {cwd: installDir});
    }
  }

  async function runSample(installDir: string, sample: CodeSample) {
    await run('node', ['index.js'], {cwd: installDir});
  }
}

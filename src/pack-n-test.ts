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

import * as execa from 'execa';
import * as packlist from 'npm-packlist';
import * as path from 'path';
import * as tar from 'tar';
import {promisify} from 'util';
import {writeFile} from 'fs';
import * as tmp from 'tmp';
import * as rimraf from 'rimraf';

const writeFileP = promisify(writeFile);
const tmpDirP = promisify(tmp.dir) as () => Promise<string>;
const rimrafP = promisify(rimraf);

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

export type CodeSample = JSCodeSample | TSCodeSample;

function isJSCodeSample(sample: CodeSample): sample is JSCodeSample {
  return !!(sample as JSCodeSample).js;
}

interface TestOptions {
  sample: CodeSample;
  packageDir?: string;
}

export async function pack(
  packageDir: string,
  targetDir: string
): Promise<string> {
  const packageTarball = path.join(targetDir, 'module-under-test.tgz');
  const files = await packlist({path: packageDir});
  await tar.create(
    {
      prefix: 'package/',
      cwd: packageDir,
      file: packageTarball,
      gzip: true,
    },
    files
  );
  return packageTarball;
}

export async function packNTest(options: TestOptions) {
  const moduleUnderTest = options.packageDir || process.cwd();
  const installDir = await tmpDirP();

  try {
    const tarball = await pack(moduleUnderTest, installDir);
    await prepareTarget(tarball, options.sample);
    await execa('node', ['index.js'], {cwd: installDir});
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    rimrafP(installDir);
  }
  return;

  async function prepareTarget(tarball: string, sample: CodeSample) {
    // Generate a package.json.
    await execa('npm', ['init', '-y'], {cwd: installDir});

    const dependencies = sample.dependencies || [];
    const devDependencies = sample.devDependencies || [];

    if (!isJSCodeSample(sample)) {
      devDependencies.push('typescript');
    }

    // Add dependencies, including tarball, to package.json.
    // TODO: modify package.json rather than spawning npm.
    await execa(
      'npm',
      ['install', '--prefer-offline', '--save', tarball].concat(dependencies),
      {cwd: installDir}
    );

    await execa(
      'npm',
      ['install', '--prefer-offline', '--save-dev'].concat(devDependencies),
      {cwd: installDir}
    );

    // Poupulate test code.
    const filename = isJSCodeSample(sample) ? 'index.js' : 'index.ts';
    const code = isJSCodeSample(sample) ? sample.js : sample.ts;
    await writeFileP(path.join(installDir, filename), code, 'utf-8');

    // If TypeScript, compile it.
    if (!isJSCodeSample(sample)) {
      // TODO: maybe make it flexible for users to pass in typescript config.
      await execa('node_modules/.bin/tsc', ['--strict', 'index.ts'], {
        cwd: installDir,
      });
    }
  }
}

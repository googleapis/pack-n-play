/**
 * Copyright 2023 Google LLC
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

// The way the user defines what type of input they're using for their code
// block is via a property name that reflects either the file extension or
// the type of module system used.
// Some of these are straightforward, such as `ts` to target TypeScript.
// Others such as `esm` and `mjs` are synonyms, meaning that the code block is
// written assuming usage of ECMAScript Modules
// (ref: https://nodejs.org/dist/latest-v18.x/docs/api/esm.html).
// Using a `cjs` codeblock means that the code block targets a CommonJS env
// (ref: https://nodejs.org/dist/latest-v18.x/docs/api/modules.html) and using
// `js` means that the default module system of the Node.js runtime is going
// to be used (which is currently, as of v20.x also CommonJS).
export interface CodeSample {
  js?: string;
  cjs?: string;
  esm?: string;
  mjs?: string;
  ts?: string;
  description: string;
  dependencies?: string[];
  devDependencies?: string[];
}

interface TestOptions {
  sample: CodeSample;
  packageDir?: string;
}

interface Sample {
  code: string;
  filename: string;
}

function getSample(sample: CodeSample): Sample {
  if (!sample.js && !sample.cjs && !sample.esm && !sample.mjs && !sample.ts) {
    throw new Error('code block not defined');
  }

  return sample.ts
    ? {code: String(sample.ts), filename: 'index.ts'}
    : sample.esm
    ? {code: String(sample.esm), filename: 'index.mjs'}
    : sample.mjs
    ? {code: String(sample.mjs), filename: 'index.mjs'}
    : sample.cjs
    ? {code: String(sample.cjs), filename: 'index.cjs'}
    : {code: String(sample.js), filename: 'index.js'};
}

function getExecFilename(sample: CodeSample): string {
  const {filename} = getSample(sample);
  return filename === 'index.ts' ? 'index.js' : filename;
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
    const filename = getExecFilename(options.sample);
    await execa('node', [filename], {cwd: installDir});
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

    if (sample.ts) {
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
    const {code, filename} = getSample(sample);
    await writeFileP(path.join(installDir, filename), code, 'utf-8');

    if (sample.ts) {
      // TODO: maybe make it flexible for users to pass in typescript config.
      await execa('npx', ['tsc', '--strict', 'index.ts'], {
        cwd: installDir,
      });
    }
  }
}

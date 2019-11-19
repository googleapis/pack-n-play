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

import * as path from 'path';
import assertRejects = require('assert-rejects');
import { packNTest } from '../src';
import { ExecaError } from 'execa';

describe('pack-n-play', () => {
  it('should pass a correct test', async () => {
    const passFixturePath = path.resolve('./test/fixtures/pass');
    await packNTest({
      packageDir: passFixturePath,
      sample: {
        description: 'basic passing sample',
        ts: `
          import {doStuff} from 'pass';
          doStuff().then(console.log);
        `,
      },
    });
  });

  it('should catch a problem with leaking dependent types', async () => {
    const passFixturePath = path.resolve('./test/fixtures/leaky');
    await assertRejects(
      packNTest({
        packageDir: passFixturePath,
        sample: {
          description: 'sample that wont have proper types',
          ts: `
            import {getLong} from 'leaky';
            getLong().then(console.log);
          `,
        },
      }),
      (e: ExecaError) => {
        return /Cannot find module 'long'/.test(e.stdout);
      }
    );
  });
});

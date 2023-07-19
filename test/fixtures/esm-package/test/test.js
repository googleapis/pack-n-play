// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {packNTest} from 'pack-n-play';
import * as assert from 'assert';
import {describe, it} from 'mocha';

describe('ESM package', () => {
  it('should support esm property', () =>
    packNTest({
      sample: {
        description: 'an ESM package',
        esm: `
          import { res } from 'esm-package';
          if (res !== 'foo') {
            throw new Error('Expected "foo" got "' + res + '"');
          }
        `,
      },
    }));

  it('should support mjs property', () =>
    packNTest({
      sample: {
        description: 'an ESM package',
        mjs: `
          import { res } from 'esm-package';
          if (res !== 'foo') {
            throw new Error('Expected "foo" got "' + res + '"');
          }
        `,
      },
    }));
});


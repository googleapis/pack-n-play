// Copyright 2018 Google LLC
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
import assertRejects = require('assert-rejects');

describe('leaky tests', () => {
  it('should fail packing n testing', async () => {
    await assertRejects(
      packNTest({
        sample: {
          description: 'a bad import',
          ts: `
            import {getLong} from 'leaky';
            getLong().then(console.log);
          `
        }
      }),
      // tslint:disable-next-line no-any
      (e: any) => {
        return /Cannot find module 'long'/.test(e.stdout);
      }
    );
  });
});

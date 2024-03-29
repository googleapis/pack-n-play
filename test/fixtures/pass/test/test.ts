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
import {describe, it} from 'mocha';

describe('passing tests', () => {
  it('should pass the test', async () => {
    await packNTest({
      sample: {
        description: 'basic passing sample',
        ts: `
          import {doStuff} from 'pass';

          export class Example {
            // ES 2015+ feature
            #value = 0;

            getValue () {
              return this.#value;
            }
          }

          doStuff().then(console.log);
        `,
      },
    });
  });
});

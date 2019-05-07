/**
 * Copyright 2019 Google LLC
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

import * as assert from 'assert';
import { withFixtures } from 'inline-fixtures';

import { packNTest, packNTestForTesting } from '../src/pack-n-test';

const DEFAULT_TIMEOUT = 60 * 1000;

function resolve() {
  return Promise.resolve();
}

const FAKE_DEPS = {
  spawn: resolve,
  mkdir: resolve,
  rimraf: resolve,
  tmpDir: resolve,
  writeFile: resolve,
};

describe(__filename, () => {
  describe('test', () => {
    it('should pass a correct test', async () => {
      const MODULE = {
        'index.ts': `export interface Foo {bar: string}; `,
        'tsconfig.json': JSON.stringify({
          extends: './node_modules/gts/tsconfig-google.json',
          files: ['index.ts'],
        }),
        'package.json': JSON.stringify({
          name: 'correct',
          version: '1.0.0',
          scripts: { compile: 'tsc -p .', prepare: 'npm run compile' },
          devDependencies: { gts: '0.9.x', typescript: '3.x' },
        }),
      };
      const CONSUMER = `import {Foo} from 'correct'; const foo: Foo = {bar: 'a string'};`;

      await withFixtures(MODULE, async fixturesDir => {
        await packNTest({
          packageDir: fixturesDir,
          sample: { ts: CONSUMER, description: 'a test that should pass' },
        });
      });
    }).timeout(DEFAULT_TIMEOUT);

    it('should reject on failure to create temp directory', () => {
      let called = false;
      function shouldNotBeCalled() {
        called = true;
        return Promise.resolve();
      }

      const REJECTION_MESSAGE = `cannot create temp directory`;
      const DEPS = {
        spawn: shouldNotBeCalled,
        mkdir: shouldNotBeCalled,
        rimraf: shouldNotBeCalled,
        writeFile: shouldNotBeCalled,
        tmpDir: () => {
          return Promise.reject(new Error(REJECTION_MESSAGE));
        },
      };

      assert.rejects(async () => {
        await packNTestForTesting({
          sample: { description: 'an example test', ts: `42;` },
          injectables: DEPS,
        });
      }, new RegExp(REJECTION_MESSAGE));

      assert.strictEqual(
        called,
        false,
        'execution should stop if tempDir cannot be created'
      );
    });

    it('should catch a problem with leaking dependent types', async () => {
      const FIXTURES = {
        'index.d.ts': `
import { Request, Response } from 'express';
export declare function makeHttpRequestData(req: Request, res: Response, latencyMilliseconds: number): {
    status: number;
    requestUrl: string;
    requestMethod: string;
    userAgent: string | undefined;
    responseSize: number;
    latency: {
        seconds: number;
        nanos: number;
    };
};`,
        'index.js': `
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function makeHttpRequestData(req, res, latencyMilliseconds) {
    return {
        status: res.statusCode,
        requestUrl: req.url,
        requestMethod: req.method,
        userAgent: req.headers['user-agent'],
        responseSize: (res.getHeader && Number(res.getHeader('Content-Length'))) || 0,
        latency: {
            seconds: Math.floor(latencyMilliseconds / 1e3),
            nanos: Math.floor((latencyMilliseconds % 1e3) * 1e6)
        }
    };
}
exports.makeHttpRequestData = makeHttpRequestData;`,
        'package.json': JSON.stringify({
          name: 'leaky',
          version: '1.0.0',
          dependencies: { express: '*' },
          devDependencies: {
            '@types/express': '^4.16.1',
            '@types/node': '^11.11.4',
          },
        }),
      };
      await withFixtures(FIXTURES, async fixturesDir => {
        const options = {
          packageDir: fixturesDir,
          sample: {
            description: 'test for leaky dependencies',
            ts: `
import {makeHttpRequestData} from 'leaky';
const result = makeHttpRequestData({}, {}, 5);
console.log(result);`,
          },
        };

        try {
          await packNTest(options); // should throw.
          assert.fail();
        } catch (err) {
          assert(err.output, 'error should have an output property');
          assert(
            err.output.match(/TS7016/),
            'Express types should have leaked from leaky'
          );
        }
      });
    });
  });
});

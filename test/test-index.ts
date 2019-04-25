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

import {unlinkSync} from 'fs';

import * as check from '../src';

describe('pack-n-play', () => {
  it('should run a basic example', () => {
    const tsCode = `
      import * as express from 'express';
      const app = express();
    `;

    const jsCode = `
      const express = require('express');
      const app = express();
`;

    const TS_SAMPLES: check.CodeSample[] = [{
      code: tsCode,
      description: 'can be used with express',
      dependencies: ['express'],
      devDependencies: ['@types/express']
    }];

    const JS_SAMPLES: check.CodeSample[] = [{
      code: jsCode,
      description: 'can be used with express',
      dependencies: ['express'],
      devDependencies: []
    }];

    check.testInstallation(TS_SAMPLES, JS_SAMPLES, {timeout: 2 * 60 * 1000});
  });
});

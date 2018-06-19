
# Post Install Check

> *This is not an officially supported Google product.*

It seems to be fairly easy to have a library written in TypeScript that exports type definitions that cannot be used by dependent code.  Typically if the library does not export all types correctly, a TypeScript codebase using the library will fail to compile, potentially forcing the codebase to use the library without typechecks.

The Install Check library is designed to be used as part of the tests for your library to verify that your library can be used by dependent code.

# Example

The following could be the contents of a test file in your module that is run with `mocha` as part of your test suite.

```ts

import * as check from 'install-check';

const tsCode = `
  import * as express from 'express';
  import {Something} from 'some-module';

  const app = express();

  // ensure a Something can be constructed
  const something = new Something({
    someStringOption: 'some-string',
    someBooleanOption: true
  });

  // ensure a Something can be used as middleware
  app.use(something);
`;

const jsCode = `
  const express = require('express');
  const {Something} = require('some-module');

  const app = express();

  // ensure a Something can be constructed
  const something = new Something({
    someStringOption: 'some-string',
    someBooleanOption: true
  });

  // ensure a Something can be used as middleware
  app.use(something);
`;

const TS_SAMPLES: check.CodeSample[] = [
  {
    code: tsCode,
    description: 'can be used with express',
    dependencies: ['express'],
    devDependencies: ['@types/express']
  }
]

const JS_SAMPLES: check.CodeSample[] = [
  {
    code: jsCode,
    description: 'can be used with express',
    dependencies: ['express'],
    devDependencies: []
  }
]

// Create a new project for each sample in a temp
// directory, with `some-module` installed, and
// ensure the sample code compiles (for TypeScript
// samples), and the code runs without errors.
check.testInstallation(TS_SAMPLES, JS_SAMPLES, {
  timeout: 2*60*1000
});
```

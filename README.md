<img src="https://avatars2.githubusercontent.com/u/2810941?v=3&s=96" alt="Google Cloud Platform logo" title="Google Cloud Platform" align="right" height="96" width="96"/>

# Post Install Check

[![NPM Version](https://img.shields.io/npm/v/post-install-check.svg)](https://npmjs.org/package/post-install-check)
[![Build Status](https://circleci.com/gh/google/post-install-check.svg?style=shield)](https://circleci.com/gh/google/post-install-check)
[![Known Vulnerabilities](https://snyk.io/test/github/google/post-install-check/badge.svg?targetFile=package.json)](https://snyk.io/test/github/google/post-install-check?targetFile=package.json)
[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

> Make sure TypeScript projects can use the `d.ts` you're feeding them.

It's not uncommon to ship a library written in TypeScript that exports type definitions that cannot be used by dependent code.  Typically if the library does not export all types correctly, a TypeScript codebase using the library will fail to compile, potentially forcing the codebase to use the library without typechecks.

The Install Check library is designed to be used as part of the tests for your library to verify that your library can be used by dependent code.

## Installation

```sh
$ npm install --save-dev post-install-check
```

## Usage
The following could be the contents of a test file in your module that is run with `mocha` as part of your test suite.

```ts
import * as check from 'post-install-check';

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

## Questions/problems?
If you've found an bug/issue, please [file it on GitHub](https://github.com/google/post-install-check/issues).

## Contributing
See [CONTRIBUTING](https://github.com/google/post-install-check/blob/master/CONTRIBUTING.md).

## License
This library is licensed under Apache 2.0. Full license text is available in [LICENSE](https://github.com/google/post-install-check/blob/master/LICENSE).

*This is not an officially supported Google product.*
*Made with ❤️ by the Google Node.js team*

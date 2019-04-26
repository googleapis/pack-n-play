<img src="https://avatars2.githubusercontent.com/u/2810941?v=3&s=96" alt="Google Cloud Platform logo" title="Google Cloud Platform" align="right" height="96" width="96"/>

# Pack-N-Play

> Make sure TypeScript projects can use the d.ts you're feeding them.

[![NPM Version](https://img.shields.io/npm/v/pack-n-play.svg)](https://npmjs.org/package/pack-n-play)
[![Build Status](https://circleci.com/gh/google/pack-n-play.svg?style=shield)](https://circleci.com/gh/google/pack-n-play)
[![Known Vulnerabilities](https://snyk.io/test/github/google/pack-n-play/badge.svg?targetFile=package.json)](https://snyk.io/test/github/google/pack-n-play?targetFile=package.json)
[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

> Make sure TypeScript projects can use the `d.ts` you're feeding them.

It's not uncommon to ship a library written in TypeScript that exports type definitions that cannot be used by dependent code.  Typically if the library does not export all types correctly, a TypeScript codebase using the library will fail to compile, potentially forcing the codebase to use the library without typechecks.

If you're shipping `.d.ts` type definitions, this library can be used as part of your tests
to verify that your library can be used by dependent code.

This works by
* Packing your module as a npm tarball.
* Setting up your test snippets in a temporary directory.
* Installing the module from the tarball.
* Making sure the test snippets can use the module.

## Installation

```sh
$ npm install --save-dev pack-n-play
```

## Usage

Here's an example that uses `mocha` (you can use any test harness):

```ts
import {packNPlay} from 'pack-n-play';

describe('typescript consumer tests', () => {

  it('should have correct type signature for makeHttpRequestData', async () => {
    const options = {
      packageDir: process.cwd(),  // path to your module.
      sample: {
        description: 'typescript based used can use my type definitions',
        ts: `
              import {makeHttpRequestData} from 'leaky';
              const result = makeHttpRequestData({}, {}, 5);
              console.log(result);
            `
      }
    };
    await packNPlay(options);  // will throw upon error.
  });

});
```

# ClassPortal API

### Description

Internal REST API for [ClassPortal](classportal).

Built with
- [Node.js][nodejs]
- [TypeScript][typescript]
- [Restify][restify] REST framework
- [MongoDB][mongodb] database.

## Requirements

* [Node.js][nodejs] >= 6.x
* [mongodb][mongodb]

## Install

```sh
$ git clone git://github.com/ubccpsc/classportal-api.git
$ npm install
```

## Test

Lint, build, and test (Mocha + Supertest) the project with:

```sh
// run tests
$ npm run test

// with logger enabled
$ npm run test:debug

// with instanbul coverage
$ npm run cover
```

## Run

```sh
// dev
$ npm run start

// production
$ npm run start:prod
```

## License

MIT

[classportal]: <https://classportal-116d2.firebaseapp.com/>
[nodejs]: <https://nodejs.org>
[typescript]: <https://www.typescriptlang.org/>
[restify]: <http://restify.com>
[mongodb]: <https://mongodb.org>

# ClassPortal API

Internal REST API for [ClassPortal][classportal].

Built with [Node.js][nodejs], [TypeScript][typescript], [Restify][restify], and [Mongoose][mongoose].

## Table of Contents  

* [Directory Layout](#directory-layout)
* [Getting Started](#getting-started)
* [Develop](#develop)
* [Contribute](#contribute)

<a name="directory-layout"/>
## Directory Layout

```sh
.
├── app
│   ├── auth.ts                      # Shared methods for token authentication
│   ├── controllers
│   │   ├── student.controller.ts    # Define controller methods for student API
│   │   └── ...                      # etc.
│   ├── models
│   │   ├── student.model.ts         # Define Mongoose schema for student model
│   │   └── ...                      # etc.
│   └── routes                       # Routes defined in this folder are dynamically loaded by the Restify server
│       ├── student.route.ts         # Declare routes for student API and the handlers executed in each route
│       └── ...                      # etc.
├── config/
│   ├── env.ts                       # Environment settings
│   └── restify.ts                   # Restify server creation code
├── coverage                         # Istanbul output
├── node_modules/                    # 3rd-party libraries and utilities
├── test/                            # Unit and integration tests
├── utils/
│   └── logger.ts                    # Bunyan logger
├── debug.log                        # Mongoose debug log
├── error.log                        # Bunyan error log
├── package.json                     # The list of project dependencies and NPM
├── tsconfig.json                    # Rules for compiling TS
├── tslint.json                      # Rules for linting TS
└── server.ts                        # Main entry point - Instantiate Restify server and open MongoDB connection
```

<a name="getting-started"/>
## Getting Started

### Requirements

* [Node.js][nodejs] >= 6.x
* [MongoDB][mongodb] installed

### Install

```sh
git clone https://github.com/mksarge/classportal-api.git
npm install
```

### Lint

Lint with TSLint.
Rules are configured in ```tslint.json```

```sh
npm run lint
```

### Test

Test with Mocha + Supertest:
```sh
$ npm run test
```

With logger enabled:
```sh
$ npm run test:debug
```

With instanbul coverage:
```sh
$ npm run cover
```

### Run

Development build:
```sh
npm run start

```

Production build:
```sh
npm run start:prod

```

<a name="develop"/>
## Develop

under construction

<a name="contribute"/>
## Contribute

under construction

[classportal]: <https://github.com/mksarge/classportal-ui>
[nodejs]: <https://nodejs.org>
[typescript]: <https://www.typescriptlang.org/>
[restify]: <http://restify.com>
[mongoose]: <http://mongoosejs.com/>
[mongodb]: <https://mongodb.org>

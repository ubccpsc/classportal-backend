# ClassPortal API

### Description

This ClassPortal REST API is a Node.js application written in TypeScript with Restify as the web framework and MongoDB for the database.

## Requirements

* [NodeJs](http://nodejs.org) >= 6.x 
* [mongodb](http://mongodb.org)

## Install

```sh
$ git clone git://github.com/ubccpsc/classportal-api.git
$ npm install
```

## Test

Lint, build, and test (Mocha + Supertest) the project with:

```sh
$ npm run test

// with logger enabled
$ npm run test:debug

// with instanbul coverage
$ npm run cover
```

## Run

```sh
$ npm run start
```

Then visit [http://localhost:5000/](http://localhost:5000/)

## License

MIT

# ClassPortal API

Internal REST API for [ClassPortal][classportal].

Built with [Node.js][nodejs], [TypeScript][typescript], [Restify][restify], and [Mongoose][mongoose].

## Table of Contents  

* [Directory Layout](#directory-layout)
* [Getting Started](#getting-started)
* [Contribute](#contribute)
* [Develop](#develop)

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

## Getting Started

### Requirements

* Install: [Node.js](https://nodejs.org/en/download/) ~v6.x
* Install: [MongoDB](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/) ~v3.2

### Install

```sh
git clone https://github.com/ubccpsc/classportal-backend.git
yarn install
```

### Lint

Lint with TSLint.
Rules are configured in ```tslint.json```

```sh
yarn run lint
```

### Test

Test with Mocha + Supertest:
```sh
$ yarn run test
```

With logger enabled:
```sh
$ yarn run test:debug
```

With instanbul coverage:
```sh
$ yarn run cover
```

### Run

Development build; this will start the app server on `localhost:5000`.

```sh
yarn run dev
```

Production build:
```sh
yarn run start:prod
```


## Contribute

TBD.


## Develop

Once you have installed Mongo, Node, and the packages you will need to configure the environment.

Note: `node_modules/passport-github/lib/strategy.js` will need to be modified to update the OAuth target.

## ENV structure:

### Instructions:
1. Create a `.env` file with the structure below.
2. Update the `.env` file with appropriate references.
3. Ensure the certificate files are configured correctly.

### Warning: DO NOT set TEST_DB to the same value as PROD_DB, because the test suite overwrites TEST_DB multiple times.

### Common

```
APP_NAME="UBC Original Class Portal https://github.com/ubccpsc/classportal"
GITHUB_CLIENT_ID="999999999999999999"
GITHUB_CLIENT_SECRET="999999999999999999999999999999999999"
SSL_KEY_PATH="/path/to/key.key"
SSL_CERT_PATH="/path/to/crt.crt"
SSL_INT_CERT_PATH="/path/to/ca-cacerts.pem"
GITHUB_AUTH_TOKEN="token 999999999999999999999999999999999999111"
GITHUB_USER_NAME="username"
```

### Development

```
DEV_HOST=localhost
DEV_PORT=5000
DEV_DB=mongodb://localhost:27017/development
DEV_ADMINS=admin1 admin2 admin3
DEV_SUPER_ADMIN=superadmin1
NODE_TLS_REJECT_UNAUTHORIZED=1
```

### Test

```
TEST_HOST=localhost
TEST_PORT=9000
TEST_DB=mongodb://localhost:27017/test
TEST_ADMINS=admin1 admin2 admin3
TEST_SUPER_ADMIN=superadmin1
NODE_TLS_REJECT_UNAUTHORIZED=0
```

# Production

```
PROD_HOST=localhost
PROD_PORT=8080
PROD_DB=mongodb://localhost:27017/production
PROD_ADMINS=admin1 admin2 admin3
PROD_SUPER_ADMIN=superadmin1
```

# Restarting in production

* on portal.cs.ubc.ca

`cd /var/www/autotest`

# stop the processes:

```
./node_modules/.bin/forever list 
sudo ./node_modules/.bin/forever list 
```

* check containers: 

`docker stats`

* start containers

```
sudo systemctl start docker
./node_modules/.bin/forever stop 0 // (just the one corresponding to App.js)
yarn run startf
```

* start backend & frontend

```
cd /var/www/classportal-backend
yarn run start:prod
```

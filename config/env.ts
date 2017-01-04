import * as path from 'path';

interface ConfigSettings {
  root: string;
  name: string;
  port: number;
  env: string;
  db: string;
  debug: boolean;
  github: {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
  };
}

const env: string = process.env.NODE_ENV || 'dev';
const debug: boolean = process.env.DEBUG || false;

// default settings are for dev environment
const config: ConfigSettings = {
  name: 'ClassPortal API',
  env: env,
  debug: debug,
  root: path.join(__dirname, '/..'),
  port: 5000,
  db: 'mongodb://localhost:27017/dev',
  github: {
    clientID: process.env.GITHUB_CLIENTID,
    clientSecret: process.env.GITHUB_SECRET,
    callbackURL: ''
  },
};

// settings for test environment
/* DO NOT use the same database as the production db, as the tests
 clear and overwrite the chosen test database multiple times. */
if (env === 'test') {
  config.db = 'mongodb://localhost:27017/test';
}

// settings for production environment
if (env === 'prod') {
  config.db = 'mongodb://localhost:27017/prod';
  config.debug = false;
}

export { config };

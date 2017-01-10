import * as path from 'path';

interface ConfigSettings {
  env: string;
  debug: boolean;
  verbose: boolean;
  rootFolder: string;
  name: string;
  port: number;
  db: string;
  github: {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
  };
  admins: [
    {
      username: string;
      firstname: string;
      lastname: string;
    }
  ];
}

const env: string = process.env.NODE_ENV || 'development';
const debug: boolean = process.env.DEBUG || false;
const verbose: boolean = process.env.VERBOSE || false;

// default settings are for development environment
const config: ConfigSettings = {
  env,
  debug,
  verbose,
  rootFolder: path.join(__dirname, '/..'),
  name: 'ClassPortal API',
  port: 5000,
  db: 'mongodb://localhost:27017/development',
  github: {
    clientID: process.env.GITHUB_CLIENTID,
    clientSecret: process.env.GITHUB_SECRET,
    callbackURL: ''
  },
  admins: [
    {
      username: 'mksarge',
      firstname: 'Michael',
      lastname: 'Sargent',
    },
    {
      username: 'rtholmes',
      firstname: 'Reid',
      lastname: 'Holmes',
    }
  ],
};

// settings for test environment
/* DO NOT use the same database as the production db, as the tests
 clear and overwrite the chosen test database multiple times. */
if (env === 'test') {
  config.db = 'mongodb://localhost:27017/test';
}

// settings for production environment
if (env === 'production') {
  config.db = 'mongodb://localhost:27017/production';
}

export { config };

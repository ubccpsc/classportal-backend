// default settings are for development environment
const config = {
  env: process.env.NODE_ENV || 'development',
  debug: process.env.DEBUG || false,
  name: 'ClassPortal API',
  port: 5000,
  db: 'mongodb://localhost:27017/development',
  github: {
    clientID: process.env.GITHUB_CLIENTID,
    clientSecret: process.env.GITHUB_SECRET,
  },
};

// settings for test environment
/* DO NOT use the same database as the production db, as the tests
 clear and overwrite the chosen test database multiple times. */
if (config.env === 'test') {
  config.db = 'mongodb://localhost:27017/test';
}

// settings for production environment
if (config.env === 'production') {
  config.db = 'mongodb://localhost:27017/production';
  config.port = 443;
}

export { config };

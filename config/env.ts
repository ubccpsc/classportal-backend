require('dotenv').config();

// defaults to dev config
// note that NODE_ENV and DEBUG are set in npm scripts; all other env variables should be set in .env
const config = {
  env: process.env.NODE_ENV || 'development',
  debug: process.env.DEBUG || false,
  app_name: process.env.APP_NAME,
  host: process.env.DEV_HOST,
  port: process.env.DEV_PORT,
  db: process.env.DEV_DB,
  ssl_key_path: process.env.SSL_KEY_PATH,
  ssl_cert_path: process.env.SSL_CERT_PATH,
  github_client_id: process.env.GITHUB_CLIENT_ID,
  github_client_secret: process.env.GITHUB_CLIENT_SECRET,
};

// specific to test config
if (config.env === 'test') {
  config.host = process.env.TEST_HOST;
  config.port = process.env.TEST_PORT;
  config.db = process.env.TEST_DB;
}

// specific to production config
if (config.env === 'production') {
  config.host = process.env.PROD_HOST;
  config.port = process.env.PROD_PORT;
  config.db = process.env.PROD_DB;
}

export { config };

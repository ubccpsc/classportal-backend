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
  github_callback_url: 'https://localhost:5000/auth/login/return',
  super_admin: process.env.DEV_SUPER_ADMIN,
  admins: process.env.DEV_ADMINS.split(' '),
  auth_strategy: 'github',
};

// specific to test config
if (config.env === 'test') {
  config.host = process.env.TEST_HOST;
  config.port = process.env.TEST_PORT;
  config.db = process.env.TEST_DB;
  config.super_admin = process.env.TEST_SUPER_ADMIN;
  config.admins = process.env.TEST_ADMINS.split(' ');
  config.auth_strategy = 'local';
}

// specific to production config
if (config.env === 'production') {
  config.host = process.env.PROD_HOST;
  config.port = process.env.PROD_PORT;
  config.db = process.env.PROD_DB;
  config.super_admin = process.env.PROD_SUPER_ADMIN;
  config.admins = process.env.PROD_ADMINS.split(' ');
  config.auth_strategy = 'github';
}

export { config };

// require('dotenv').config({path: '/Users/rtholmes/dev/autotest/classportal-backend/.env'}); // RELEASE: comment out
require('dotenv').config();

// defaults to dev config
// note that NODE_ENV and DEBUG are set in npm scripts; all other env variables should be set in .env
const config: any = {
  env:                  process.env.NODE_ENV || 'development',
  debug:                process.env.DEBUG || false,
  app_name:             process.env.APP_NAME,
  host:                 process.env.DEV_HOST,
  port:                 process.env.DEV_PORT,
  db:                   process.env.DEV_DB,
  app_path:             process.env.DEV_APP_PATH,
  ssl_key_path:         process.env.SSL_KEY_PATH,
  ssl_cert_path:        process.env.SSL_CERT_PATH,
  ssl_int_cert_path:    process.env.SSL_INT_CERT_PATH,
  github_client_id:     process.env.GITHUB_CLIENT_ID,
  github_client_secret: process.env.GITHUB_CLIENT_SECRET,
  github_callback_url:  process.env.GITHUB_OAUTH_CALLBACK,
  super_admin:          process.env.DEV_SUPER_ADMIN,
  admins:               process.env.DEV_ADMINS.split(' '),
  defaultServerWhitelist: process.env.DEFAULT_SERVER_WHITELIST,
  auth_strategy:        'github',
  github_auth_token:    process.env.GITHUB_AUTH_TOKEN,
  github_clone_token:   process.env.GITHUB_CLONE_TOKEN,
  github_user_name:     process.env.GITHUB_USER_NAME,
  github_api_path:      process.env.GITHUB_API_PATH,
  github_enterprise_url: process.env.GITHUB_ENTERPRISE_URL,
  jwt_secret_key:       process.env.JWT_SECRET_KEY
};

// specific to test config
if (config.env === 'test') {
  console.log('env.ts - env === test');
  config.host = process.env.TEST_HOST;
  config.port = process.env.TEST_PORT;
  config.db = process.env.TEST_DB;
  config.debug = true;
  config.super_admin = process.env.TEST_SUPER_ADMIN;
  config.admins = process.env.TEST_ADMINS.split(' ');
  config.auth_strategy = 'local';
}

// specific to production config
if (config.env === 'production') {
  console.log('env.ts - env === production');
  config.host = process.env.PROD_HOST;
  config.port = process.env.PROD_PORT;
  config.app_path = process.env.PROD_APP_PATH;
  config.debug = false;
  config.db = process.env.PROD_DB;
  config.super_admin = process.env.PROD_SUPER_ADMIN;
  config.admins = process.env.PROD_ADMINS.split(' ');
  config.auth_strategy = 'github';
}

console.log("env.ts -- exporting configuration");

export {config};

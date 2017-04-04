import * as fs from 'fs';
import * as restify from 'restify';
import { config } from './env';
import { routes } from '../app/routes';
import { logger } from '../utils/logger';
let passport = require('passport-restify');
let session = require('cookie-session');
let initializedPassport = passport.initialize();
let passportSession = passport.session();
let CookieParser = require('restify-cookies');
let GithubStrategy = require('passport-github').Strategy;
import { User } from '../app/models/user.model';

// create https server
const app = restify.createServer({
  name: config.app_name,
  key: fs.readFileSync(config.ssl_key_path, 'UTF-8'),
  certificate: fs.readFileSync(config.ssl_cert_path, 'UTF-8'),
});

// allow cors
app.use(restify.CORS());

// set cors options
app.opts(/.*/, (req: restify.Request, res: restify.Response, next: restify.Next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', req.header('Access-Control-Request-Method'));
  res.header('Access-Control-Allow-Headers', req.header('Access-Control-Request-Headers'));
  res.send(200);
  return next();
});

// parse the http query string into req.query, but not into req.params
app.use(restify.queryParser({ mapParams: false }));

// parse the body of the request into req.params
app.use(restify.bodyParser({
  maxBodySize: 0,
  mapParams: true,
  mapFiles: false,
  overrideParams: false,
  keepExtensions: true,
  uploadDir: './build/uploads/',
  multiples: true,
  hash: 'sha1',
}));

// passport-restify configuration

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Facebook profile is serialized
// and deserialized.
passport.serializeUser(function(user: any, cb: any) {
  cb(null, user);
});

passport.deserializeUser(function(obj: any, cb: any) {
  cb(null, obj);
});

passport.use(new GithubStrategy({
  clientID: config.github_client_id,
  clientSecret: config.github_client_secret,
  callbackURL: config.github_callback_url,
},
  function(accessToken: any, refreshToken: any, profile: any, cb: any) {
    // In this example, the user's Facebook profile is supplied as the user
    // record.  In a production-quality application, the Facebook profile should
    // be associated with a user record in the application's database, which
    // allows for account linking and authentication with other identity
    // providers.
    return cb(null, profile);
  }),
);



app.use(CookieParser.parse);
app.use(session({
  keys: ['key1', 'key2'],
  maxage: 48 * 3600 /*hours*/ * 1000,  /*in milliseconds*/
  secureProxy: false, // if you do SSL outside of node
}));
app.use(initializedPassport);
app.use(passportSession);

// custom middleware to log the request method, url, and params
app.use((req: restify.Request, res: restify.Response, next: restify.Next) => {
  logger.info(`${req.method} ${req.url}\nParams: ${JSON.stringify(req.params, null, 2)}`);
  return next();
});

// add routes and their handlers
routes(app);

export { app, passport };

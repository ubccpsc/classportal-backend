import { app } from './restify';
import { config } from '../config/env';
import { User, IUserDocument } from '../app/models/user.model';
import { logger } from '../utils/logger';
let passport = require('passport');
let session = require('cookie-session');
let CookieParser = require('restify-cookies');
let GithubStrategy = require('passport-github').Strategy;

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
passport.serializeUser(function(user: IUserDocument, cb: any) {
  console.log('SERIALIZE USER: ' + user);
  cb(null, user);
});

passport.deserializeUser(function(obj: any, cb: any) {
  console.log('DESERIALIZE ObJECT ' + obj);
  User.findById(obj)
    .exec()
    .then((u) => { cb(null, u); })
    .catch((err) => { logger.info(err); });
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
    console.log('Access Token: ', accessToken);
    console.log('refresh token: ', refreshToken);
    console.log('profile: ', profile);
    console.log('cb : ', cb);
    logger.info(profile.username + 'logged in');

    User.find({ username: profile.username }, function(err, user) {
      logger.info('Authentication error: ' + user);
      return cb(err, user);
    });
  }),
);

export { passport, CookieParser, session }
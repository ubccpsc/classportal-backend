import { app } from './restify';
import { config } from '../config/env';
import { User } from '../app/models/user.model';
import { logger } from '../utils/logger';
let passport = require('passport-restify');
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

    console.log('Access Token: ', accessToken);
    console.log('refresh token: ', refreshToken);
    console.log('profile: ', profile);
    console.log('cb : ', cb);
    logger.info(profile.id + 'logged in');
    return User.findOrCreate({ username: profile.username }).catch((err) => { logger.info(err); });
  }),
);

export { passport, CookieParser, session }
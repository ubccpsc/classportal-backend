import { app } from './restify';
import { config } from '../config/env';
import { User, IUserDocument } from '../app/models/user.model';
import { logger } from '../utils/logger';
let passport = require('passport');
let session = require('cookie-session');
let CookieParser = require('restify-cookies');
let Strategy = require('passport-github').Strategy;

if (config.env === 'test' ) {
  let Strategy = require('passport-mock').Strategy;
}

// Passport JS
//
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
  console.log('Serializing User' + JSON.stringify(user, null, 2));
  cb(null, user);
});

passport.deserializeUser(function(obj: any, cb: any) {
  console.log('Deserializing object : ' + JSON.stringify(obj, null, 2));
  User.findById(obj)
    .exec()
    .then((u) => { cb(null, u.username); })
    .catch((err) => { logger.info(err); });
});

passport.use(new Strategy({
  clientID: config.github_client_id,
  clientSecret: config.github_client_secret,
  callbackURL: config.github_callback_url,
},
  function(accessToken: any, refreshToken: any, profile: any, cb: any) {
    logger.info(profile.username + 'logged in');

    // This is an area where we can link the information,
    // if we decide to associate the user account with
    User.find({ username: profile.username }, function(err, user) {
      return cb(err, user);
    });
  }),
);

export { passport, CookieParser, session }
import { app } from './restify';
import { config } from '../config/env';
import { User, IUserDocument } from '../app/models/user.model';
import { logger } from '../utils/logger';
let passport = require('passport');
let session = require('cookie-session');
let CookieParser = require('restify-cookies');
let Strategy = require('passport-github').Strategy;

passport.use(new Strategy({
  clientID: config.github_client_id,
  clientSecret: config.github_client_secret,
  callbackURL: config.github_callback_url,
},
  function(accessToken: any, refreshToken: any, profile: any, cb: any) {
    logger.info(profile.username + 'logged in');

    // Github username taken and lookup for that user in our DB.
    User.find({ username: profile.username }, function(err, user) {
      return cb(err, user);
    });
  }),
);

// Passport Local strategy used in lieu of Github strategy for unit tests.
if (config.env === 'test' ) {

  Strategy = require('passport-local').Strategy;
  console.log('strategy', Strategy);
  passport.use(new Strategy({
    usernameField: 'username',
    passwordField: 'snum',
    passReqToCallback: true,
    session: true,
  },
  function(req: any, username: any, password: any, done: any) {
    console.log('username', username);
    console.log('passdword or snum', password);
    let query = User.findOne({ 'username': username, 'snum' : password }).exec();
    console.log('Local strategy enabled');
    query.then( user => {
      if (user) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Unable to login' });
      }
    });
  },
));
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
  logger.info('Serializing User' + JSON.stringify(user, null, 2));
  cb(null, user);
});

passport.deserializeUser(function(obj: any, cb: any) {
  logger.info('Deserializing object : ' + JSON.stringify(obj, null, 2));
  User.findById(obj)
    .exec()
    .then((u) => { cb(null, u); })
    .catch((err) => { logger.info(err); });
});

export { passport, CookieParser, session }
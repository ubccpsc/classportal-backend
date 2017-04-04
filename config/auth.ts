import { app } from './restify';
let passport = require('passport-restify');
let GithubStrategy = require('passport-github');
import { config } from '../config/env';

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


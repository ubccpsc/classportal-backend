import { app } from './restify';
import { config } from '../config/env';
import { User, IUserDocument } from '../app/models/user.model';
import { logger } from '../utils/logger';

let passport = require('passport-restify');
let session = require('cookie-session');
let CookieParser = require('restify-cookies');
// must update links in 'passport-github' package to Github Enterprise
let Strategy = require('passport-github').Strategy; 

passport.use(new Strategy({
  clientID: config.github_client_id,
  clientSecret: config.github_client_secret,
  callbackURL: config.github_callback_url,
},
  function(accessToken: any, refreshToken: any, profile: any, cb: any) {

    let username = String(profile.username).toLowerCase();
    console.log('debug username' + username);

    // Github username taken to look-up user in our DB.
    // Create SuperAdmin if it does not exist in DB
    User.findOne({ username }, (err, user) => {
      try {
        // If user is an admin but does not exist in DB yet
        if (!user && config.super_admin == username ) {
          authenticateSuperAdmin(err, username, cb);
        } 
        // If user is not an admin and there is no record of them in the DB
        else if (!user && config.super_admin != username ) {
          return cb(null, false);
        } 
        // If user is a student/admin role and found in the DB
        else {
          console.log('debug in else statement');
          console.log(user);
          return cb(err, user);
        }
      } catch (err) {
        return Promise.reject(err);
      }
    })
    .catch(err => {
      logger.error(`config/auth.ts:: ERROR Authenticating user: ${err}`);
    });


  }),
);

// Passport Local strategy used in lieu of Github strategy for unit tests.
if (config.env === 'test' ) {

  Strategy = require('passport-local').Strategy;
  passport.use(new Strategy({
    usernameField: 'username',
    passwordField: 'snum',
    passReqToCallback: true,
    session: true,
  },
  function(req: any, username: any, password: any, done: any) {
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
  try {
    logger.info(`config/auth.ts::passport.serializeUser Serializing ${user}`);
    cb(null, user);
  } catch (err) {
    logger.error(`config/auth.ts::passport.serializeUser ERROR ${err}`);
  }
});

passport.deserializeUser(function(obj: any, cb: any) {
  logger.info('Deserializing object : ' + JSON.stringify(obj, null, 2));
  try {
    console.log(obj);
    User.findById(obj)
      .exec()
      .then((user) => { cb(null, user); })
      .catch((err) => { logger.info(err); });
  } catch (err) {
    logger.error(`config/auth.ts::passport.deserializeUser ERROR ${err}`);
  }
});

/**
 * @param err Error object to be returned
 * @param username username of the SuperAdmin
 * @param cb Passport callback for after SuperAdmin user object is created
 */
let authenticateSuperAdmin = function(err: any, username: string, cb: any) {
  let superAdmin = {
    csid: 99999999,
    snum: 99999999,
    lname: 'DEFAULT ACCOUNT',
    fname: 'SUPER ADMIN',
    username,
    userrole: 'superadmin',
  };

  User.create(superAdmin)
    .then( (newAdmin: IUserDocument) => {
      if (newAdmin) {
        logger.info(`config/auth.ts:: Authenticated user ${username} with Github OAuth`);
        return cb(err, newAdmin);
      }
    })
    .catch(err => {
      logger.error(`config/auth.ts:: Could not create SuperAdmin: ${err}`);
      return cb(err, null);
    });
};

export { passport, CookieParser, session }
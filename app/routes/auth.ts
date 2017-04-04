import * as restify from 'restify';
import { IUserDocument, User } from '../models/user.model';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
let findOrCreate = require('mongoose-findorcreate');
let passport = require('passport-restify');
let GithubStrategy = require('passport-github').Strategy;

const passportLoadUser = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  passport.use(new GithubStrategy({
    clientID: config.github_client_id,
    clientSecret: config.github_client_secret,
    callbackURL: config.github_callback_url,
  }),
  function(accessToken: any, refreshToken: any, profile: any, cb: any) {
    User.create({ githubId: profile.ID }, function(err: any, user: any, created: any) {
      console.log('made it');
      return cb(err, user);
    });
  },
  );
  return res.send(400, 'Token not supplied');
};

const loadUser = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  const token = req.header('token');
  if (token) {
    User.findWith({ token })
      .then((user: IUserDocument) => {
        req.params.user = user;
        return next();
      })
      .catch(() => {
        return res.send(400, 'Invalid token');
      });
  } else {
    return res.send(400, 'Token not supplied');
  }
};

const authenticate = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  passport.authenticate('local', { failureRedirect: '/login' }),
  function() {
    res.redirect('/success', next);
  };
};

const callback = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  passport.authenticate('local', { failureRedirect: '/login' }),
  function() {
    res.redirect('/success', next);
  };
};

export { loadUser, passportLoadUser, authenticate, callback };

import {passport} from '../../config/auth';
import {User} from '../models/user.model';
import * as restify from 'restify';
import {config} from '../../config/env';
import {logger} from '../../utils/logger';
let errors = require('restify-errors');

/**
 * Verifies if authentication valid and redirects on basis of boolean result.
 * @return boolean
 */

const isAuthenticated = (req: any, res: any, next: restify.Next) => {
  if (req.isAuthenticated()) {
    console.log('authenticated' + req.user.username);
    return next();
  } else {
    res.redirect('/login', next);
  }
};

const adminAuthenticated = (req: any, res: restify.Response, next: restify.Next) => {
  console.log('super true ' + req.isAuthenticated());
  if (req.isAuthenticated()) {
    let loggedInUser = req.user.username;
    let adminOrSuperAdmin = function () {
      return config.admins.indexOf(loggedInUser) >= 0 || config.super_admin.indexOf(loggedInUser) >= 0 ? true : false;
    };
    if (adminOrSuperAdmin()) {
      return next(); // authorized
    }
  }
  next(new errors.UnauthorizedError('Permission denied.'));
};

const superAuthenticated = (req: any, res: restify.Response, next: restify.Next) => {
  if (req.isAuthenticated()) {
    let loggedInUser = req.user.username;
    let superAdmin = function () {
      return config.super_admin.indexOf(loggedInUser) >= 0 ? true : false;
    };
    if (superAdmin()) {
      return next();
    }
  }
  next(new errors.UnauthorizedError('Permission denied.'));
};

const adminOrProfAuthenticated = (req: any, res: restify.Response, next: restify.Next) => {
  if (req.isAuthenticated()) {
    let loggedInUser = req.user.username;
    let superAdmin = function () {
      return config.super_admin.indexOf(loggedInUser) >= 0 ? true : false;
    };
    if (isAdminOrProf) {
      return next();
    }
  }
  next(new errors.UnauthorizedError('Permission denied.'));
};

const isAdmin = (req: any, res: restify.Response, next: restify.Next) => {
  if (req.isAuthenticated()) {
    let loggedInUser = req.user.username;
    let adminOrSuperAdmin = function () {
      return config.admins.indexOf(loggedInUser) >= 0 || config.super_admin.indexOf(loggedInUser) >= 0 ? true : false;
    };
    if (adminOrSuperAdmin()) {
      return true;
    }
  }
  return false;
};

const isAdminOrProf = (req: any, res: restify.Response, next: restify.Next) => {
  let authenticated: boolean;
  if (req.isAuthenticated()) {
    let loggedInUser = req.user.username;
    let userrole: string;
    let userQuery = User.findOne({username: req.user.username})
      .exec(u => {
        userrole = u.userrole;
      });

    let answer = userQuery.then(() => {
      authenticated = config.admins.indexOf(loggedInUser) >= 0 || loggedInUser == userrole;
      return Promise.resolve(authenticated);
    });
  }
  console.log('authenticated boolean' + authenticated);
  if (authenticated) {
    return next();
  }
  return next(new errors.UnauthorizedError('Permission denied.'));
};

export {isAuthenticated, adminAuthenticated, superAuthenticated, isAdmin, adminOrProfAuthenticated};

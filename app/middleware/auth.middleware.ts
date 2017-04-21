import { passport } from '../../config/auth';
import { User } from '../models/user.model';
import * as restify from 'restify';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
let errors = require('restify-errors');

/**
 * Verifies if authentication valid and redirects on basis of boolean result.
 * @return boolean
 */

const isAuthenticated = (req: any, res: any, next: restify.Next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/login', next);
  }
};

const adminAuth = (req: any, res: restify.Response, next: restify.Next) => {
  if (req.isAuthenticated()) {
    console.log('true? ' + req.isAuthenticated());
    console.log(req.user.username);
    let loggedInUser = req.user.username;
    let adminOrSuperAdmin = function() {
      return config.admins.indexOf(loggedInUser) >= 0 || config.super_admin.indexOf(loggedInUser) >= 0 ? true : false;
    };
    if (adminOrSuperAdmin()) {
      return next(); // authorized
    }
  }
  logger.info('Permission denied. Admin permissions needed: ' + req.user);
  next(new errors.UnauthorizedError('Permission denied'));
};

const superAdminAuth = (req: any, res: restify.Response, next: restify.Next) => {
  if (req.isAuthenticated()) {
    let loggedInUser = req.user.username;
    let superAdmin = function() {
      return config.super_admin.indexOf(loggedInUser) >= 0 ? true : false;
    };
    if (superAdmin()) {
      return next();
    }
  }
  logger.info('Permission denied. Super Admin permissions needed: ' + req.user);
  next(new errors.UnauthorizedError('Permission denied'));
};

export { isAuthenticated, adminAuth, superAdminAuth }
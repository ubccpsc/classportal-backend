import { passport } from '../../config/auth';
import { User } from '../models/user.model';
import * as restify from 'restify';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Verifies if authentication valid and redirects on basis of boolean result.
 * @return boolean
 */

const isAuthenticated = (req: any, res: restify.Response, next: restify.Next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/login', next);
  }
};

const adminAuth = (req: any, res: restify.Response, next: restify.Next) => {
  if (req.isAuthenticated()) {
    let loggedInUser = req.user.username;
    let adminOrSuperAdmin = config.admins.indexOf(loggedInUser) || config.admins.indexOf(loggedInUser) ? true : false;
    if (adminOrSuperAdmin) {
      return next();
    } else {
      logger.info('Admin/Super Admin permission denied request: ' + req.user);
      res.json(500, { error: 'Permission denied' } );
    }
  }
  res.json(500, { error: 'Permission denied' } );
};

const superAdminAuth = (req: any, res: restify.Response, next: restify.Next) => {
  if (req.isAuthenticated()) {
    let loggedInUser = req.user.username;
    let adminOrSuperAdmin = config.admins.indexOf(loggedInUser) ? true : false;

    if (adminOrSuperAdmin) {
      return next();
    } else {
      res.json(500, { error: 'Permission denied' } );
    }
  }
  res.json(500, { error: 'Permission denied' } );
};

export { isAuthenticated, adminAuth, superAdminAuth }
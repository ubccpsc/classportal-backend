import { passport } from '../../config/auth';
import { User } from '../models/user.model';
import * as restify from 'restify';

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

export { isAuthenticated }
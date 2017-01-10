import * as restify from 'restify';
import { logger } from '../../utils/logger';

/**
 * User login
 * @param {string} authcode - GitHub authcode
 * @returns portal info
 */
function login(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'login');
  return next();
}

function logout(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('logout');
  res.json(200, 'logout');
  return next();
}

export { login, logout }

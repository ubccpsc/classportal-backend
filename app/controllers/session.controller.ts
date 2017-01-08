import * as restify from 'restify';
import { logger } from '../../utils/logger';

function login(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('login');
  res.json(200, 'login');
  return next();
}

function logout(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('logout');
  res.json(200, 'logout');
  return next();
}

export { login, logout }

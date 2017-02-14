import * as restify from 'restify';
import { logger } from '../../utils/logger';

// calls next middleware only if temp username/token supplied
function requireTempToken(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('checkTempToken| Checking token..');
  let username: string = req.header('username');
  let token: string = req.header('token');

  if (username === 'temp' && token === 'temp') {
    logger.info('checkTempToken| Valid temp request! Continuing to authentication..');
    return next();
  } else {
    logger.info('checkTempToken| Error: Bad request. Returning..');
    return res.send(400, 'bad request');
  }
}

// calls next middleware only if valid student or admin token is supplied
function returnUsername(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('checkToken| Checking token..');
  let username: string = req.header('username');
  let token: string = req.header('token');
  let admin: string = req.header('admin');

  if (username && token) {
    return res.send(400, 'bad request');
  } else {
    logger.info('checkToken| Error: Bad request. Returning..');
    return res.send(400, 'bad request');
  }
}

// calls next middleware only if valid admin field is supplied
// todo: verify username as well?
function requireAdmin(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('requireAdmin| Checking admin status..');
  let admin: string = req.header('admin');
  if (admin === 'true') {
    logger.info('requireAdmin| Valid admin field. Continuing to next middleware..');
    return next();
  } else {
    logger.info('requireAdmin| Missing admin field. Returning..');
    return res.send(400, 'permission denied');
  }
}

export { requireTempToken, returnUsername, requireAdmin };

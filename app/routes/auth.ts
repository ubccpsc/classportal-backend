import * as restify from 'restify';
import { logger } from '../../utils/logger';

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

export { returnUsername };

import * as restify from 'restify';
import { IUserDocument, User } from '../models/user.model';
import { logger } from '../../utils/logger';
let passport = require('passport-restify');

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

export { loadUser };

import * as restify from 'restify';
import * as controller from '../controllers/session.controller';

export default (api: restify.Server) => {
  // login for all users
  api.put('/api/session/login', controller.login);

  // logout for all users
  api.put('/api/session/logout', controller.logout);
};

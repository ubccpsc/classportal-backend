import * as restify from 'restify';
import * as controller from '../controllers/user.controller';

export default (api: restify.Server) => {
  // login for all users
  api.put('/api/user/login', controller.login);

  // logout for all users
  api.put('/api/user/logout', controller.logout);
};

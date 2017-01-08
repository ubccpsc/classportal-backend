import * as restify from 'restify';
import * as controller from '../controllers/session.controller';
import * as auth from '../auth';

export default (api: restify.Server) => {
  /**
   * NOT LOGGED IN USERS ONLY
   * Log in
   */
  api.put('/api/session/login', auth.notLoggedIn, controller.login);

  /**
   * LOGGED IN USERS ONLY
   * Log out
   */
  api.put('/api/session/logout', auth.loggedIn, controller.logout);
};

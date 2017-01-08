import * as restify from 'restify';
import * as controller from '../controllers/register.controller';
import * as auth from '../auth';

export default (api: restify.Server) => {
  /**
   * NOT LOGGED IN USERS ONLY
   * Student registration
   */
  api.post('/api/register', auth.notLoggedIn, controller.register);
};

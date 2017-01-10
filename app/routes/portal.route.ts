import * as restify from 'restify';
import * as ctrl from '../controllers/portal.controller';
import * as auth from '../auth';
import { logger } from '../../utils/logger';

export default (api: restify.Server) => {
  /**
   * LOGGED IN USERS ONLY
   * Load portal
   */
  api.get('/api/portal', auth.loggedIn, ctrl.loadPortal);
};

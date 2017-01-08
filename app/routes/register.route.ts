import * as restify from 'restify';
import * as ctrl from '../controllers/register.controller';
import { loadbyCsidSnum } from '../controllers/student.controller';
import * as auth from '../auth';
import { logger } from '../../utils/logger';

export default (api: restify.Server) => {

  /**
   * NOT LOGGED IN USERS ONLY
   * Student registration Step 1: ask if provided csid and snum are valid targets to register for
   */
  api.get('/api/register',
    auth.notLoggedIn,
    ctrl.checkId);

  /**
   * NOT LOGGED IN USERS ONLY
   * Student registration Step 2
   */
  api.post('/api/register',
    auth.notLoggedIn,
    ctrl.getUsernameFromToken,
    loadbyCsidSnum,
    ctrl.register);
};

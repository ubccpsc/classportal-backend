import * as restify from 'restify';
import * as ctrl from '../controllers/team.controller';
import * as auth from '../auth';

export default (api: restify.Server) => {
  /**
   * ADMINS ONLY
   * Get a team
   */
  api.get('/api/team', auth.admin, ctrl.get);

  /**
   * ADMINS ONLY
   * Create a team
   */
  api.post('/api/team', auth.admin, ctrl.create);

  /**
   * ADMINS ONLY
   * Update a team
   */
  api.put('/api/team', auth.admin, ctrl.update);

  /**
   * ADMINS ONLY
   * Delete a team
   */
  api.del('/api/team', auth.admin, ctrl.remove);
};


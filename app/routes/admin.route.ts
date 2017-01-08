import * as restify from 'restify';
import * as controller from '../controllers/admin.controller';
import * as auth from '../auth';

export default (api: restify.Server) => {
  /**
   * PROF ONLY
   * Create an admin
   */
  api.post('/api/admin', auth.admin, controller.create);

  /**
   * PROF ONLY
   * Get an admin
   */
  api.get('/api/admin', auth.admin, controller.get);

  /**
   * PROF ONLY
   * Update an admin
   */
  api.put('/api/admin', auth.admin, controller.update);

  /**
   * PROF ONLY
   * Delete an admin
   */
  api.del('/api/admin', auth.admin, controller.remove);
};

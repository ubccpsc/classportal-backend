import * as restify from 'restify';
import * as controller from '../controllers/admin.controller';
import * as auth from '../auth';

export default (api: restify.Server) => {
  /**
   * PROF ONLY
   * Update the classlist with csv file
   */
  api.post('/api/admin/classlist', auth.prof, controller.updateClass);
};

import * as restify from 'restify';
import * as controller from '../controllers/grade.controller';
import * as auth from '../auth';

export default (api: restify.Server) => {
  /**
   * ADMINS ONLY
   * Get the grades of one or more students
   */
  api.get('/api/grade', auth.admin, controller.get);

  /**
   * ADMINS ONLY
   * Update the grades of one or more students
   */
  api.put('/api/grade', auth.admin, controller.update);
};

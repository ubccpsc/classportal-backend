import * as restify from 'restify';
import * as controller from '../controllers/grade.controller';
import * as auth from '../auth';

export default (api: restify.Server) => {
  /**
   * ADMINS ONLY
   * Get grades of students supplied in params
   */
  api.get('/api/grade', auth.admin, controller.get);

  /**
   * ADMINS ONLY
   * Update the grades of students supplied in params
   */
  api.put('/api/grade', auth.admin, controller.update);
};

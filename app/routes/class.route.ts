import * as restify from 'restify';
import * as controller from '../controllers/class.controller';
import * as auth from '../auth';

export default (api: restify.Server) => {
  /**
   * PROF ONLY
   * Update the class list with a csv file
   */
  api.post('/api/class', auth.prof, controller.update);
};

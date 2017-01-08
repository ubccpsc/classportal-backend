import * as restify from 'restify';
import * as controller from '../controllers/class.controller';
import * as auth from '../auth';

export default (api: restify.Server) => {
  api.post('/api/class', auth.requireAdmin, controller.update);
};

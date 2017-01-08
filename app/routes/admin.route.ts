import * as restify from 'restify';
import * as controller from '../controllers/admin.controller';
import * as auth from '../auth';

export default (api: restify.Server) => {
  // Update the classlist by csv file, only accessible by the prof
  api.post('/api/admin/classlist', auth.requireProf, controller.updateClass);
};

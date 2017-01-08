import * as restify from 'restify';
import * as ctrl from '../controllers/student.controller';
import * as auth from '../auth';
import { logger } from '../../utils/logger';

export default (api: restify.Server) => {
  /**
   * ADMINS ONLY
   * Create new student
   */
  api.post('/api/student', auth.admin, ctrl.create);

  /**
   * ADMINS ONLY
   * Get a student
   */
  api.get('/api/student/:username', auth.admin, ctrl.load, ctrl.get);

  /**
   * ADMINS ONLY
   * Get list of students
   */
  // api.get('/api/students', auth.verifyadmin, ctrl.load, ctrl.get);

  /**
   * ADMINS ONLY
   * Update a student
   */
  // PUT /api/users/:userId - Update user
  api.put('/api/student/:username', auth.admin, ctrl.load, ctrl.update);

  /**
   * ADMINS ONLY
   * Delete a student
   */
  api.del('/api/student/:username', auth.admin, ctrl.load, ctrl.remove);
};

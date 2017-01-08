import * as restify from 'restify';
import * as controller from '../controllers/student.controller';
import * as auth from '../auth';

export default (api: restify.Server) => {
  /**
   * NOT LOGGED IN USERS ONLY
   * Student registration
   */
  api.post('/api/student/register', controller.register);

  /**
   * ADMINS ONLY
   * Create new student
   */
  api.post('/api/student', auth.admin, controller.create);

  /**
   * ADMINS ONLY
   * Get a student
   */
  api.get('/api/student/:username', auth.admin, controller.load, controller.get);

  /**
   * ADMINS ONLY
   * Update a student
   */
  // PUT /api/users/:userId - Update user
  api.put('/api/student/:username', auth.admin, controller.load, controller.update);

  /**
   * ADMINS ONLY
   * Delete a student
   */
  api.del('/api/student/:username', auth.admin, controller.load, controller.remove);

  // get list of students
  // api.get('/api/students', auth.verifyadmin, controller.load, controller.get);
};

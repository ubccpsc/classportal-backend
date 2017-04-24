import * as restify from 'restify';
import * as routeHandler from './routeHandler';
import * as auth from './auth';
import { isAuthenticated, adminAuthenticated, superAuthenticated } from '../../app/middleware/auth.middleware';
import { passport } from '../../config/auth';
import { config } from '../../config/env';

const routes = (server: restify.Server) => {
  // Accessible by anyone
  server.get('/ping', routeHandler.pong);
  server.get('/courses', routeHandler.getCourseList);
  server.get('/test', routeHandler.testRoute);
  server.get('/:courseId/deliverables', routeHandler.getDeliverables);
  server.get('/:courseId/grades', routeHandler.getGradesStudent);
  server.put('/register', routeHandler.validateRegistration);
  // OAuth routes by logged-in users only
  server.post('/logout', auth.loadUser, routeHandler.logout);
  server.get('/auth/login', passport.authenticate(config.auth_strategy), routeHandler.getUser);
  server.get('/auth/login/return', passport.authenticate(config.auth_strategy, { failureRedirect: '/failed' }),
    ( req: restify.Request, res: any, next: restify.Next) => {
      res.redirect('/', next);
    });
  server.put('/auth/github/register', routeHandler.addGithubUsername);
  // Authentication routes
  server.put('admin/:courseId', routeHandler.createCourse);
  server.get(':courseId/admin/students', routeHandler.getStudentList);
  server.post('/:courseId/admin/students', routeHandler.addStudentList);
  server.post('/:courseId/admin/grades', routeHandler.addGrades);
  server.get('/:courseId/admin/grades', routeHandler.getGradesAdmin);
  server.post('/:courseId/admin/deliverables', routeHandler.addDeliverables);
  server.get('/settings', isAuthenticated, routeHandler.getUser);
  server.get('/logout', isAuthenticated, routeHandler.logout);
};

export { routes };
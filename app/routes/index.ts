import * as restify from 'restify';
import * as routeHandler from './routeHandler';
import * as auth from './auth';
import { isAuthenticated, adminAuth, superAdminAuth } from '../../app/middleware/auth.middleware';
import { passport } from './routeHandler';

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
  server.get('/auth/login/github', passport.authenticate('github'));
  server.get('/auth/login/github/return', passport.authenticate('github', { failureRedirect: '/failed' }),
    ( req: restify.Request, res: any, next: restify.Next) => {
      res.redirect('/', next);
    });
  server.get('/auth/github/register', passport.authenticate('github'), routeHandler.addGithubUsername);
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
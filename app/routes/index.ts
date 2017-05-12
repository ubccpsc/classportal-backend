import * as restify from 'restify';
import * as routeHandler from './routeHandler';
import * as auth from './auth';
import { isAuthenticated, adminAuthenticated, superAuthenticated,
   adminOrProfAuthenticated } from '../../app/middleware/auth.middleware';
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
  server.put('/:courseId/team', routeHandler.addTeam);
  server.get('/:courseId/students', routeHandler.getStudentNamesFromCourse);
  // OAuth routes by logged-in users only
  server.put('/register/username', routeHandler.addGithubUsername);
  server.post('/logout', auth.loadUser, routeHandler.logout);
  server.get('/auth/login', passport.authenticate(config.auth_strategy), routeHandler.getUser);
  server.get('/auth/login/return', passport.authenticate(config.auth_strategy, { failureRedirect: '/failed' }),
    ( req: restify.Request, res: any, next: restify.Next) => {
      res.redirect('/', next);
    });

  // Authenticated routes

  // -- Prof or Admin Routes
  server.post('/:courseId/admin/admins', /* adminOrProfAuthenticated, */ routeHandler.addAdmins);
  server.get('/:courseId/admin/admins', routeHandler.getAdmins);
  server.get('/:courseId/admin/teams', routeHandler.getTeams);

  // -- Admin or Super Admin Only Routes
  server.put('/:courseId/admin/github/team', routeHandler.createGithubTeam);
  server.put('/:courseId/admin/github/repo', routeHandler.createGithubRepo);
  server.put('/admin/:courseId', routeHandler.createCourse);
  server.post('/:courseId/admin/team', routeHandler.updateTeam);
  server.get('/:courseId/admin/students', routeHandler.getStudentList);
  server.post('/:courseId/admin/students', routeHandler.addStudentList);
  server.post('/:courseId/admin/grades', routeHandler.addGrades);
  server.get('/:courseId/admin/grades', routeHandler.getGradesAdmin);
  server.post('/:courseId/admin/grades/:delivId', routeHandler.addGradesCSV);
  server.post('/:courseId/admin/deliverables', routeHandler.addDeliverables);
  server.get('/settings', isAuthenticated, routeHandler.getUser);
  server.get('/logout', isAuthenticated, routeHandler.logout);
};

export { routes };
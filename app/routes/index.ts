import * as restify from 'restify';
import * as routeHandler from './routeHandler';
import * as auth from './auth';
import { isAuthenticated, adminAuth, superAdminAuth } from '../../app/middleware/auth.middleware';
import { passport } from './routeHandler';

const routes = (server: restify.Server) => {
  // Accessible by anyone
  server.get('/ping', routeHandler.pong);
  server.get('/test', routeHandler.testRoute);
  // Accessible by logged-in users only
  server.post('/logout', auth.loadUser, routeHandler.logout);
  // Authentication routes
  server.put('admin/:courseId', routeHandler.createCourse);
  server.get(':courseId/admin/students', routeHandler.getStudentList);
  server.post('/:courseId/admin/students', routeHandler.addStudentList);
  server.get('/courses', routeHandler.getCourseList);
  server.put('/:courseId/checkRegistration', routeHandler.checkRegistration);
  server.put('/:courseId/register', routeHandler.registerUser);
  server.post('/:courseId/admin/deliverables', routeHandler.addDeliverables);
  server.get('/:courseId/deliverables', routeHandler.getDeliverables);
  server.get('/auth/login/github', passport.authenticate('github'));
  server.get('/auth/login/github/return', passport.authenticate('github', { failureRedirect: '/failed' }),
    ( req: restify.Request, res: any, next: restify.Next) => {
      res.redirect('/', next);
    });
  server.get('/settings', isAuthenticated, routeHandler.getUser);
  server.get('/logout', isAuthenticated, routeHandler.logout);
};

export { routes };

/*
// Accessible by admins only
server.get('/teams', auth.admin, teamCtrl.get);
server.get('/teams/:id', auth.admin, teamCtrl.get);
server.post('/teams/:id', auth.admin, teamCtrl.create);
server.post('/teams/:id', auth.admin, teamCtrl.update);
server.del('/teams/:id', auth.admin, teamCtrl.remove);
server.get('/grades', auth.admin, gradeCtrl.get);
server.get('/grades/:id', auth.admin, gradeCtrl.get);
server.post('/grades', auth.admin, gradeCtrl.update);
server.post('/grades/:id', auth.admin, gradeCtrl.update);

// Prof only
server.post('/class', auth.prof, classCtrl.update);
*/

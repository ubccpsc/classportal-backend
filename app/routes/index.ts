import * as restify from 'restify';
import * as routeHandler from './routeHandler';
import * as auth from './auth';
import { isAuthenticated, adminAuth, superAdminAuth } from '../../app/middleware/auth.middleware';
import { passport } from './routeHandler';

const routes = (server: restify.Server) => {
  // Accessible by anyone
  server.get('/ping', routeHandler.pong);
  server.get('/test', routeHandler.testRoute);
  server.put('/course', routeHandler.createCourse);
  server.post('/:courseId/admin/students', routeHandler.addClassList);
  // Accessible by logged-in users only
  server.post('/logout', auth.loadUser, routeHandler.logout);
  // Authentication routes
  server.get('/course', adminAuth, routeHandler.createCourse);
  server.post('/admin/students', routeHandler.addClassList);
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

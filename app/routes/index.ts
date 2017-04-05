import * as restify from 'restify';
import * as routeHandler from './routeHandler';
import { passport } from './routeHandler';
import * as auth from './auth';

const routes = (server: restify.Server) => {
  // Accessible by anyone
  server.get('/ping', routeHandler.pong);
  server.post('/login', routeHandler.login);
  server.get('/test', routeHandler.testRoute);
  server.post('/register', routeHandler.checkRegistration);
  server.put('/course', routeHandler.createCourse);
  server.post('/classList', routeHandler.addClassList);
  // Accessible by logged-in users only
  server.post('/home', auth.loadUser, routeHandler.load);
  server.post('/logout', auth.loadUser, routeHandler.logout);
  // Accessible by admin
  server.post('/admin/classList', routeHandler.addClassList);
  // Authentication routes
  server.get('/auth/testRoute', passport.authenticate('github', { failureRedirect: '/failedTestRoute' }),
    ( req: any, res: any, next: restify.Next) => {
      console.log('REQUEST ', req);
      return routeHandler.testRoute;
    });
  server.get('/auth/testRoute', passport.authenticate('github', { failureRedirect: '/failedTestRoute' }),
    ( req: any, res: any, next: restify.Next) => {
      console.log('REQUEST ', req);
      return routeHandler.testRoute;
    });
  server.get('/auth/login/github', passport.authenticate('github'));
  server.get('/auth/login/github/return', passport.authenticate('github', { failureRedirect: '/failed' }),
    ( req: any, res: any, next: restify.Next) => {
      res.redirect('/', next);
    });
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

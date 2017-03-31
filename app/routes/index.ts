import * as restify from 'restify';
import * as routeHandler from './routeHandler';
import * as auth from './auth';

const routes = (server: restify.Server) => {
  // Accessible by anyone
  server.get('/ping', routeHandler.pong);
  server.post('/login', routeHandler.login);
  server.post('/register', routeHandler.checkRegistration);
  server.post('/course', routeHandler.createCourse);
  server.post('/classList', routeHandler.addClassList);
  // Accessible by logged-in users only
  server.post('/home', auth.loadUser, routeHandler.load);
  server.post('/logout', auth.loadUser, routeHandler.logout);
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

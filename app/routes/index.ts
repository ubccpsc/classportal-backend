import * as restify from 'restify';
import * as auth from './auth';

const routes = (server: restify.Server) => {
  server.get('/ping', (req: restify.Request, res: restify.Response) => res.send('pong')); // For testing API status
};

export { routes };

/*
// Accessible by anyone
server.get('/ping', routeHandler.pong); // For testing API status
server.post('/login', routeHandler.login);
server.post('/register', routeHandler.checkRegistration);

// Accessible by logged-in users only
server.post('/home', auth.returnUsername, routeHandler.load);
  server.post('/logout', auth.returnUsername, routeHandler.logout);

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

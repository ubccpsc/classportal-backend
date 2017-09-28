import * as restify from 'restify';
import * as routeHandler from './routeHandler';
import * as auth from './auth';
import {
  isAuthenticated, adminAuthenticated, superAuthenticated,
  adminOrProfAuthenticated
} from '../../app/middleware/auth.middleware';
import {passport} from '../../config/auth';
import {config} from '../../config/env';

const routes = (server: restify.Server) => {
  // Accessible by anyone
  server.get('/ping', routeHandler.pong);
  server.get('/:courseId/course', isAuthenticated, routeHandler.getCourse);
  server.get('/courses', isAuthenticated, routeHandler.getAllCourses);
  server.get('/myCourses', isAuthenticated, routeHandler.getMyCourses);
  server.get('/:courseId/myTeams', routeHandler.getMyTeams);
  server.get('/:courseId/labSections', isAuthenticated, routeHandler.getLabSectionsFromCourse);
  server.get('/:courseId/:labId/labList', isAuthenticated, routeHandler.getCourseLabSectionList);
  server.get('/test', isAuthenticated, routeHandler.testRoute);
  server.get('/isAuthenticated', routeHandler.isAuthenticated);
  server.get('/currentUser', isAuthenticated, routeHandler.getCurrentUser);
  server.get('/:courseId/deliverables', isAuthenticated, routeHandler.getDeliverables);
  server.get('/:courseId/grades', isAuthenticated, routeHandler.getGradesStudent);
  server.post('/:courseId/students/isInClass', routeHandler.isStudentInSameLab);
  server.get('/:courseId/students/withoutTeam', routeHandler.getUsersNotOnTeam);
  server.put('/register', isAuthenticated, routeHandler.validateRegistration);
  server.get('/:courseId/:userId/teams', isAuthenticated, routeHandler.getCourseTeamsPerUser);
  server.put('/:courseId/team', routeHandler.createTeam);
  server.put('/:courseId/admin/customTeam', isAuthenticated, routeHandler.createCustomTeam);
  server.get('/:courseId/students', isAuthenticated, routeHandler.getStudentNamesFromCourse);
  server.put('/:courseId/students/customTeam', isAuthenticated, routeHandler.createCustomTeam);
  // OAuth routes by logged-in users only
  server.put('/register/username', isAuthenticated, routeHandler.addGithubUsername);
  server.post('/logout', auth.loadUser, routeHandler.logout);
  server.get('/auth/login', passport.authenticate(config.auth_strategy), routeHandler.getCurrentUserInfo);
  server.get('/auth/login/return', passport.authenticate(config.auth_strategy, {failureRedirect: '/failed'}),
    (req: any, res: any, next: restify.Next) => {
      res.redirect(`${config.app_path}/postLogin`, next);
    });

  // Authenticated routes

  // -- Prof or Admin Routes
  server.post('/:courseId/admin/admins', /* adminOrProfAuthenticated, */ routeHandler.addAdmins);
  server.get('/:courseId/admin/admins', adminAuthenticated, routeHandler.getAllAdmins);
  server.get('/:courseId/admin/teams', adminAuthenticated, routeHandler.getTeams);
  server.post('/teams/disband/:teamId', adminAuthenticated, routeHandler.disbandTeamById);
  server.get('/:courseId/admin/teams/byBatch', adminAuthenticated, routeHandler.getCourseTeamsWithBatchMarking);
  server.get('/:courseId/admin/courseSettings', routeHandler.getCourseSettings);
  server.post('/admin/classList', adminAuthenticated, routeHandler.getClassList);


  // -- Admin or Super Admin Only Routes
  server.put('/:courseId/admin/github/team', adminAuthenticated, routeHandler.createGithubTeam);
  server.put('/:courseId/admin/github/repo/team', adminAuthenticated, routeHandler.createGithubReposForTeams);
  server.put('/:courseId/admin/github/repo/team/repair', adminAuthenticated, routeHandler.repairGithubReposForTeams);
  server.put('/:courseId/admin/github/repo/project', adminAuthenticated, routeHandler.createGithubReposForProjects);
  server.put('/:courseId/admin/github/repo/project/repair', adminAuthenticated,
    routeHandler.repairIndividualProvisions);
  server.put('/:courseId/admin/projectGeneration', adminAuthenticated, routeHandler.generateProjects);
  server.put('/:courseId/admin/teamGeneration', adminAuthenticated, routeHandler.randomlyGenerateTeamsPerCourse);
  server.get('/:courseId/admin/github/repos/:orgName', adminAuthenticated, routeHandler.getRepos);
  server.del('/:courseId/admin/github/repos/:orgName', adminAuthenticated, routeHandler.deleteRepos);
  server.put('/admin/:courseId', adminAuthenticated, routeHandler.createCourse);
  server.post('/:courseId/admin/team', adminAuthenticated, routeHandler.updateTeam);
  server.get('/:courseId/admin/students', adminAuthenticated, routeHandler.getClassList);
  server.post('/:courseId/admin/students', adminAuthenticated, routeHandler.addStudentList);
  server.post('/:courseId/admin/labList', adminAuthenticated, routeHandler.addLabList);
  server.post('/:courseId/admin/grades', adminAuthenticated, routeHandler.addGrades);
  server.get('/:courseId/admin/grades', adminAuthenticated, routeHandler.getGradesAdmin);
  server.post('/:courseId/admin/grades/:delivId', adminAuthenticated, routeHandler.addGradesCSV);
  server.post('/:courseId/admin/deliverable', adminAuthenticated, routeHandler.updateDeliverable);
  server.put('/:courseId/admin/deliverable', adminAuthenticated, routeHandler.addDeliverable);
  server.get('/settings', isAuthenticated, isAuthenticated, routeHandler.getCurrentUserInfo);
  server.get('/logout', isAuthenticated, routeHandler.logout);

  // commented out for safety
  // server.get('/:courseId/admin/dashboard/:orgName/:delivId', adminAuthenticated, routeHandler.getDashForDeliverable);
};

export {routes};

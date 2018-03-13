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
  server.get('/isAuthenticated', routeHandler.isAuthenticated);
  server.get('/currentUser', isAuthenticated, routeHandler.getCurrentUser);
  server.get('/:courseId/deliverables', isAuthenticated, routeHandler.getDeliverables);
  server.get('/:courseId/grades/released', isAuthenticated, routeHandler.getGradesIfReleased);
  server.post('/:courseId/students/isInSameLab', isAuthenticated, routeHandler.isStudentInSameLab);
  server.get('/:courseId/students/withoutTeam', isAuthenticated, routeHandler.getUsersNotOnTeam);
  server.put('/:courseId/team', isAuthenticated, routeHandler.createTeam);
  server.put('/:courseId/admin/customTeam', adminAuthenticated, routeHandler.createCustomTeam);
  server.put('/:courseId/students/customTeam', isAuthenticated, routeHandler.createCustomTeam);
  // OAuth routes by logged-in users only
  server.post('/logout', auth.loadUser, routeHandler.logout);
  server.get('/auth/login', passport.authenticate(config.auth_strategy), routeHandler.getCurrentUserInfo);
  server.get('/auth/login/return', passport.authenticate(config.auth_strategy, {failureRedirect: '/failed'}),
    (req: any, res: any, next: restify.Next) => {
      console.log(config.app);
      res.redirect(`${config.app_path}`, next);
    });

  // Authenticated routes   

  // -- Prof or Admin Routes
  server.post('/:courseId/admin/admins', adminAuthenticated, routeHandler.addAdminList);
  server.post('/:courseId/admin/staff', adminAuthenticated, routeHandler.addStaffList);
  server.get('/:courseId/admin/staff', adminAuthenticated, routeHandler.getAllStaff);
  server.get('/:courseId/admin/admins', adminAuthenticated, routeHandler.getAllAdmins);
  server.get('/:courseId/admin/teams', adminAuthenticated, routeHandler.getTeams);
  server.get('/:courseId/:deliverableName/rate', routeHandler.getTestDelay);
  server.get('/:courseId/defaultDeliverable', routeHandler.getDefaultDeliv);
  server.get('/:courseId/isStaff/:username', routeHandler.isStaffOrAdmin);
  server.post('/teams/disband/:teamId', adminAuthenticated, routeHandler.disbandTeamById);
  server.get('/:courseId/admin/teams/:deliverable/overview', adminAuthenticated, routeHandler.getTeamProvisionOverview);  
  server.get('/admin/files/:deliverable/:username/:commit/:filename', adminAuthenticated,
    routeHandler.getFileFromResultRecord);
  server.put('/:courseId/admin/buildContainer', adminAuthenticated, routeHandler.buildContainer);
  server.put('/:courseId/admin/destroyContainer', adminAuthenticated, routeHandler.destroyContainer);
  server.put('/:courseId/admin/isContainerBuilt', adminAuthenticated, routeHandler.isContainerBuilt);
  server.get('/:courseId/:deliverableName/container', routeHandler.getContainerInfo);
  server.get('/admin/files/:stdioRef/stdio.txt', adminAuthenticated, routeHandler.getStdioFile);
  server.get('/:courseId/admin/teams/:deliverableName', adminAuthenticated, routeHandler.getTeams);
  server.post('/:courseId/admin/grades/results', adminAuthenticated, routeHandler.getGradesFromResults);
  server.get('/:courseId/admin/teams/info/:deliverableName', adminAuthenticated, routeHandler.getCourseTeamInfo);
  server.get('/:courseId/admin/classList', adminAuthenticated, routeHandler.getClassList);


  // -- Admin or Super Admin Only Routes
  server.put('/:courseId/admin/github/team', adminAuthenticated, routeHandler.createGithubTeam);
  server.put('/:courseId/admin/github/repo/team', adminAuthenticated, routeHandler.createGithubReposForTeams);
  server.put('/:courseId/admin/github/repo/team/repair', adminAuthenticated, routeHandler.repairGithubReposForTeams);
  server.put('/:courseId/admin/github/repo/team/unlink', adminAuthenticated, routeHandler.removeRepoFromTeams);
  server.post('/:courseId/admin/teamGeneration', adminAuthenticated, routeHandler.randomlyGenerateTeamsPerCourse);
  server.get('/:courseId/admin/github/repos/:orgName', adminAuthenticated, routeHandler.getRepos);
  server.put('/:courseId/admin/course', adminAuthenticated, routeHandler.createCourse);
  server.post('/:courseId/admin/team', adminAuthenticated, routeHandler.updateTeam);
  server.get('/:courseId/admin/students', adminAuthenticated, routeHandler.getClassList);
  server.post('/:courseId/admin/classList', adminAuthenticated, routeHandler.updateClassList);
  server.get('/:courseId/admin/grades', adminAuthenticated, routeHandler.getAllGrades);
  server.get('/:courseId/admin/grades/:delivName', adminAuthenticated, routeHandler.getGradesByDeliv);
  server.post('/:courseId/admin/grades/:delivName', adminAuthenticated, routeHandler.addGradesCSV);
  server.post('/:courseId/admin/deliverable', adminAuthenticated, routeHandler.updateDeliverable);
  server.put('/:courseId/admin/deliverable', adminAuthenticated, routeHandler.addDeliverable);
  server.get('/settings', isAuthenticated, isAuthenticated, routeHandler.getCurrentUserInfo);
  server.get('/logout', isAuthenticated, routeHandler.logout);
  server.get('/test/jwt', isAuthenticated, routeHandler.testJwt);

  // dashboard
  server.get('/:courseId/admin/dashboard/:orgName/:delivId', adminAuthenticated, routeHandler.getDashForDeliverable);
};

export {routes};

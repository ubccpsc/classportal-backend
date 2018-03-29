import * as restify from 'restify';
import * as routeHandler from './routeHandler';
import * as auth from './auth';
import {isAuthenticated, staffOrAdminAuth, adminAuth, superAuth} from '../../app/middleware/auth.middleware';
import {passport} from '../../config/auth';
import {config} from '../../config/env';

const routes = (server: restify.Server) => {
  // Accessible by anyone
  server.get('/ping', routeHandler.pong);
  server.get('/courses', routeHandler.getCourseIds);
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
  server.put('/:courseId/admin/customTeam', adminAuth, routeHandler.createCustomTeam);
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
  server.post('/:courseId/admin/staff', adminAuth, routeHandler.addStaffList);
  server.get('/:courseId/admin/staff', adminAuth, routeHandler.getCourseStaff);
  server.get('/:courseId/admin/teams', adminAuth, routeHandler.getTeams);
  server.get('/:courseId/:deliverableName/rate', routeHandler.getTestDelay);
  server.post('/:courseId/admin/course', adminAuth, routeHandler.updateCourse);
  server.get('/:courseId/admin/course', adminAuth, routeHandler.getCourse);
  server.get('/:courseId/defaultDeliverable', routeHandler.getDefaultDeliv);
  server.get('/:courseId/isStaff/:username', routeHandler.isStaffOrAdmin);
  server.post('/teams/disband/:teamId', adminAuth, routeHandler.disbandTeamById);
  server.get('/:courseId/admin/teams/:deliverable/overview', adminAuth, routeHandler.getTeamProvisionOverview);  
  server.get('/admin/files/:deliverable/:username/:commit/:filename', adminAuth,
    routeHandler.getFileFromResultRecord);
  server.put('/:courseId/admin/buildContainer', adminAuth, routeHandler.buildContainer);
  server.put('/:courseId/admin/destroyContainer', adminAuth, routeHandler.destroyContainer);
  server.put('/:courseId/admin/isContainerBuilt', adminAuth, routeHandler.isContainerBuilt);
  server.get('/:courseId/:deliverableName/container', routeHandler.getContainerInfo);
  server.get('/admin/files/:stdioRef/stdio.txt', adminAuth, routeHandler.getStdioFile);
  server.get('/:courseId/admin/teams/:deliverableName', adminAuth, routeHandler.getTeams);
  server.post('/:courseId/admin/grades/results', adminAuth, routeHandler.getGradesFromResults);
  server.get('/:courseId/admin/teams/info/:deliverableName', adminAuth, routeHandler.getCourseTeamInfo);
  server.get('/:courseId/admin/classList', adminAuth, routeHandler.getClassList);

  // -- Super Admin Only Routes
  server.put('/:courseId/superadmin/course', superAuth, routeHandler.createCourse);
  server.post('/:courseId/superadmin/course', superAuth, routeHandler.updateCourse);
  server.get('/superadmin/courses', isAuthenticated, routeHandler.getAllCourses);
  server.post('/:courseId/superadmin/admins', adminAuth, routeHandler.addAdminList);
  server.get('/:courseId/superadmin/admins', adminAuth, routeHandler.getCourseAdmins);

  // -- Admin or Super Admin Only Routes
  server.put('/:courseId/admin/github/team', adminAuth, routeHandler.createGithubTeam);
  server.put('/:courseId/admin/github/repo/team', adminAuth, routeHandler.createGithubReposForTeams);
  server.put('/:courseId/admin/github/repo/team/repair', adminAuth, routeHandler.repairGithubReposForTeams);
  server.put('/:courseId/admin/github/repo/team/unlink', adminAuth, routeHandler.removeRepoFromTeams);
  server.post('/:courseId/admin/teamGeneration', adminAuth, routeHandler.randomlyGenerateTeamsPerCourse);
  server.get('/:courseId/admin/github/repos/:orgName', adminAuth, routeHandler.getRepos);
  server.post('/:courseId/admin/team', adminAuth, routeHandler.updateTeam);
  server.get('/:courseId/admin/students', adminAuth, routeHandler.getClassList);
  server.post('/:courseId/admin/classList', adminAuth, routeHandler.updateClassList);
  server.get('/:courseId/admin/grades', adminAuth, routeHandler.getAllGrades);
  server.get('/:courseId/admin/grades/:delivName', adminAuth, routeHandler.getGradesByDeliv);
  server.post('/:courseId/admin/grades/:delivName', adminAuth, routeHandler.addGradesCSV);
  server.post('/:courseId/admin/deliverable', adminAuth, routeHandler.updateDeliverable);
  server.put('/:courseId/admin/deliverable', adminAuth, routeHandler.addDeliverable);
  server.get('/settings', isAuthenticated, isAuthenticated, routeHandler.getCurrentUserInfo);
  server.get('/logout', isAuthenticated, routeHandler.logout);
  server.get('/test/jwt', isAuthenticated, routeHandler.testJwt);

  // dashboard
  server.get('/:courseId/admin/dashboard/:orgName/:delivId', adminAuth, routeHandler.getDashForDeliverable);
};

export {routes};

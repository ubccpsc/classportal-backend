import * as restify from 'restify';
import * as userCtrl from '../controllers/user.controller';
import * as courseCtrl from '../controllers/course.controller';
import * as authCtrl from '../controllers/auth.controller';
import * as delivCtrl from '../controllers/deliverable.controller';
import * as gradeCtrl from '../controllers/grade.controller';
import * as teamCtrl from '../controllers/team.controller';
import * as testCtrl from '../controllers/test.controller';
import { logger } from '../../utils/logger';
import { Course, ICourseDocument } from '../models/course.model';
import { Grade, IGradeDocument } from '../models/grade.model';
import { User, IUserDocument } from '../models/user.model';
import { Deliverable, IDeliverableDocument } from '../models/deliverable.model';
import { Team, ITeamDocument } from '../models/team.model';


const pong = (req: restify.Request, res: restify.Response) => res.send('pong');

const createCourse = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.create(req.params)
    .then(() => res.json(200, { response: 'Successfully added Course #' + req.params.courseId }))
    .catch((err: Error) => res.json(500, { 'err': err.message }));
};

const getCourseList = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.get(req.params)
    .then((courseList) => res.json(200, { response: courseList }))
    .catch((err: Error) => res.json(500, { 'err': err.message }));
};

const addStudentList = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.updateClassList(req.files['classList'], req.params.courseId)
    .then(() => res.json(200, { response: 'Successfully updated Class List on course #' + req.params.courseId }))
    .catch((err: any) => res.json(500, { 'err': err.message }));
};

const getStudentList = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.getClassList(req.params.courseId)
    .then((classList) => res.json(200, { response: classList }))
    .catch((err: Error) => res.json(500, { err: err.message }));
};

const getStudentNamesFromCourse = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.getStudentNamesFromCourse(req.params.courseId)
    .then((classList) => res.json(200, { response: classList }))
    .catch((err: Error) => res.json(500, { err: err.message }));
};

const testRoute = (req: restify.Request, res: restify.Response) => {
  return testCtrl.consoleLogRequest(req)
    .then(() => res.json(200, { response: req }))
    .catch((err: any) => res.json(500, { err: err.errmsg }));
};

const logout = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return authCtrl.logout(req, res, next)
    .then(() => res.json(200, { response: 'Successfully logged out' }))
    .catch((err: any) => res.json(500, { err: err.errmsg }));
};

const getUser = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return testCtrl.getUser(req, res, next)
    .catch((err: any) => res.json(500, { err: err.errmsg }));
};

const oauthCallback = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return authCtrl.oauthCallback(req, res, next)
    .then(() => res.json(200, { response: 'Successfully authenticated user' }))
    .catch((err: any) => res.json(500, { err: err.errmsg }));
};

const addDeliverables = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return delivCtrl.create(req.params)
    .then((d: IDeliverableDocument) => res.json(200, { response: 'Successfully updated/added Deliverable.' }))
    .catch((err: any) => res.json(500, { err: err.message }));
};

const getDeliverables = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return delivCtrl.read(req.params)
    .then((deliverables) => res.json(200, { response: deliverables }))
    .catch((err: any) => res.json(500, { err: err.message }));
};

const addGrades = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return gradeCtrl.create(req.params)
    .then((course: any) => res.json(200, { response: 'Successfully updated grades.' }))
    .catch((err: any) => res.json(500, { err: err.message }));
};

const getGradesAdmin = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return gradeCtrl.getAllGradesByCourse(req)
    .then((grades: any) => {
      const CSV_HEAD = 'snum,grade';
      if (grades.startsWith != undefined && grades.startsWith(CSV_HEAD)) {
        res.writeHead(200, {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=Course' + req.params.courseId + 'Grades.csv',
        });
        res.end(grades);
      } else {
        res.json(200, { response: grades.grades });
      }
    })
    .catch((err: any) => res.json(500, { err: err.message }));
};

const getGradesStudent = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return gradeCtrl.getReleasedGradesByCourse(req)
    .then((grades: IGradeDocument[]) => res.json(200, { response: grades }))
    .catch((err: any) => res.json(500, { err: err.message }));
};

const validateRegistration = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return userCtrl.validateRegistration(req, res, next)
   .catch((err: any) => res.json(500, { err: err.message }));
};

const addGithubUsername = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return userCtrl.addGithubUsername(req)
   .then((user: IUserDocument) => res.json(200, { response: user.username + ' added to CSID #' + user.csid +
     ' and SNUM #' + user.snum + '.' }))
   .catch((err: any) => res.json(500, { err: err.message }));
};

const addTeam = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.add(req)
   .then(() => res.json(200, { response: 'Successfully added a new team.' }))
   .catch((err: any) => {
     logger.info(err);
     console.log('routeHandler error: ' + err);
     res.json(500, { 'err': err.message });
   });
};

const updateTeam = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.update(req)
   .then(() => res.json(200, { response: 'Successfully updated team.' }))
   .catch((err: any) => {
     logger.info(err);
     console.log('routeHandler error: ' + err);
     res.json(500, { 'err': err.message });
   });
};

const addAdmins = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return courseCtrl.addAdmins(req.params)
   .then((c: ICourseDocument) => res.json(200, { response: 'Successfully updated course admin list on '
   + c.courseId + '.' }))
   .catch((err: any) => res.json(500, { err: err.message }));
};

const getAdmins = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return courseCtrl.getAdmins(req.params)
   .then((course: ICourseDocument) => res.json(200, { response: course.admins }))
   .catch((err: any) => res.json(500, { err: err.message }));
};

const getTeams = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.getTeams(req.params)
   .then((teamList: ITeamDocument[]) => res.json(200, { response: teamList }))
   .catch((err: any) => res.json(500, { err: err.message }));
};

const addGradesCSV = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return gradeCtrl.addGradesCSV(req)
  .then((addGrades: IGradeDocument[]) => res.json(200, { response: 'Successfully added CSV list of grades.' }))
  .catch((err: any) => res.json(500, { err: err.message }));
};

const createGithubTeam = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.createGithubTeam(req.params)
  .then((githubResponse: Object) => res.json(200, { response: 'Successfully created team with members.' }))
  .catch((err: any) => res.json(500, { err: err.message }));
};

const createGithubRepo = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.createGithubRepo(req.params)
  .then((githubResponse: Object) => res.json(200, { response: 'Successfully created repo with teams and members.' }))
  .catch((err: any) => res.json(500, { err: err.message }));
};

export { pong, createCourse, getCourseList, logout, addStudentList, getStudentList, testRoute,
   getUser, validateRegistration, addGithubUsername, addDeliverables, getDeliverables,
   getGradesAdmin, getGradesStudent, addGrades, addTeam, updateTeam, getStudentNamesFromCourse,
   addAdmins, getAdmins, getTeams, addGradesCSV, createGithubTeam, createGithubRepo };

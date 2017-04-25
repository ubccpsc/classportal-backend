import * as restify from 'restify';
import * as userCtrl from '../controllers/user.controller';
import * as courseCtrl from '../controllers/course.controller';
import * as authCtrl from '../controllers/auth.controller';
import * as delivCtrl from '../controllers/deliverable.controller';
import * as gradeCtrl from '../controllers/grade.controller';
import * as teamCtrl from '../controllers/team.controller';
import * as testCtrl from '../controllers/test.controller';
import { Course, ICourseDocument } from '../models/course.model';
import { Grade, IGradeDocument } from '../models/grade.model';
import { User, IUserDocument } from '../models/user.model';
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
    .then((q) => res.json(200, { response: q }))
    .catch((err: any) => res.json(500, { err: err.message }));
};

const getDeliverables = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return delivCtrl.read(req.params)
    .then((deliverables) => res.json(200, { response: deliverables }))
    .catch((err: any) => res.json(500, { err: err.message }));
};

const addGrades = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return gradeCtrl.create(req.params)
    .then((course: any) => res.json(200, { response: course.grades }))
    .catch((err: any) => res.json(500, { err: err.message }));
};

const getGradesAdmin = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return gradeCtrl.getAllGradesByCourse(req.params.courseId)
    .then((course: ICourseDocument) => res.json(200, { response: course.grades }))
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
  return teamCtrl.addTeam(req)
   .then((team: ITeamDocument) => res.json(200, { response: team }))
   .catch((err: any) => res.json(500, { err: err.message }));
};

export { pong, createCourse, getCourseList, logout, addStudentList, getStudentList, testRoute,
   getUser, validateRegistration, addGithubUsername, addDeliverables, getDeliverables,
   getGradesAdmin, getGradesStudent, addGrades, addTeam, getStudentNamesFromCourse };

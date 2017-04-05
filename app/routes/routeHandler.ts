import * as restify from 'restify';
import * as userCtrl from '../controllers/user.controller';
import * as courseCtrl from '../controllers/course.controller';
import * as classCtrl from '../controllers/class.controller';
import * as authCtrl from '../controllers/auth.controller';
import * as testCtrl from '../controllers/test.controller';
import { passport } from '../../config/auth';


const pong = (req: restify.Request, res: restify.Response) => res.send('pong');

const login = (req: restify.Request, res: restify.Response) => {
  return userCtrl.login(req.params.authcode, req.params.csid = '', req.params.snum = '')
    .then((token: string) => res.json(200, { response: token }))
    .catch((err: any) => res.json(500, { err }));
};

const checkRegistration = (req: restify.Request, res: restify.Response) => {
  return userCtrl.checkRegistration(req.params.csid = '', req.params.snum = '')
    .then(() => res.json(200))
    .catch((err: any) => res.json(500, { err }));
};

const load = (req: restify.Request, res: restify.Response) => {
  return userCtrl.load(req.params.user)
    .then((userData: any) => res.json(200, { response: userData }))
    .catch((err: any) => res.json(500, { err }));
};

const logout = (req: restify.Request, res: restify.Response) => {
  return userCtrl.logout(req.params.user)
    .then(() => res.json(200))
    .catch((err: any) => res.json(500, { err }));
};

const createCourse = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.create(req.params)
    .then(() => res.json(200, { response: 'Successfully added CPSC #' + req.params.courseId }))
    .catch((err: any) => res.json(500, { err: err.errmsg } ));
};

const addClassList = (req: restify.Request, res: restify.Response) => {
  return classCtrl.update(req.files['classList'], req.params.courseId)
    .then(() => res.json(200, { response: 'Successfully updated Class List on course #' + req.params.courseId }))
    .catch((err: any) => res.json(500, { err: err.errmsg }));
};

const testRoute = (req: restify.Request, res: restify.Response) => {
  return testCtrl.consoleLogRequest(req)
    .then(() => res.json(200, { response: req }))
    .catch((err: any) => res.json(500, { err: err.errmsg }));
};

export { pong, login, checkRegistration, createCourse, load, logout, addClassList, passport, testRoute };

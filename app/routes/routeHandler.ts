import * as restify from 'restify';
import * as userCtrl from '../controllers/user.controller';
import * as courseCtrl from '../controllers/course.controller';
import * as classCtrl from '../controllers/class.controller';
import * as authCtrl from '../controllers/auth.controller';
import * as testCtrl from '../controllers/test.controller';
import { passport } from '../../config/auth';


const pong = (req: restify.Request, res: restify.Response) => res.send('pong');

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

const logout = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return authCtrl.logout(req, res, next)
    .then(() => res.json(200, { response: 'Successfully logged out' }))
    .catch((err: any) => res.json(500, { err: err.errmsg }));
};

const getUser = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return authCtrl.getUser(req, res, next)
    .catch((err: any) => res.json(500, { err: err.errmsg }));
};

const loginUser = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return authCtrl.loginUser()
    .catch((err: any) => res.json(500, { err: err.errmsg }));
};

const oauthCallback = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return authCtrl.oauthCallback(req, res, next)
    .then(() => res.json(200, { response: 'Successfully authenticated user' }))
    .catch((err: any) => res.json(500, { err: err.errmsg }));
};

export { pong, createCourse, logout, addClassList, testRoute, passport, getUser, loginUser };

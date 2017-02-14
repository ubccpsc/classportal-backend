import * as restify from 'restify';
import * as classCtrl from '../controllers/class.controller';
import * as gradeCtrl from '../controllers/grade.controller';
import * as userCtrl from '../controllers/user.controller';
import * as teamCtrl from '../controllers/team.controller';

const pong = (req: restify.Request, res: restify.Response) => res.send('pong');

/**
 *
 */
const login: any = (req: restify.Request, res: restify.Response) => {
  const authcode: string = req.params.authcode;
  const csid: string = req.params.csid;
  const sid: string = req.params.sid;

  return res.send(500);
};

/**
 *
 */
const logout: any = (req: restify.Request, res: restify.Response) => {
  const authcode: string = req.params.authcode;
  const csid: string = req.params.csid;
  const sid: string = req.params.sid;

  return res.send(500);
};

/**
 *
 */
const checkRegistration: any = (req: restify.Request, res: restify.Response) => {
  const authcode: string = req.params.authcode;
  const csid: string = req.params.csid;
  const sid: string = req.params.sid;

  return res.send(500);
};

/**
 *
 */
const load: any = (req: restify.Request, res: restify.Response) => {
  const authcode: string = req.params.authcode;
  const csid: string = req.params.csid;
  const sid: string = req.params.sid;

  return res.send(500);
};

export { pong, login, logout, checkRegistration, load };

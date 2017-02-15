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
  const csid: string = req.params.csid || '';
  const snum: string = req.params.snum || '';

  return userCtrl.login(authcode, csid, snum)
    .then((response: any) => {
      return res.send(200, response);
    })
    .catch((err: any) => {
      return res.send(500, err);
    });
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

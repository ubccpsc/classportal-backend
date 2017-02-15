import * as restify from 'restify';
import * as userCtrl from '../controllers/user.controller';

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

export { pong, login, checkRegistration, load, logout };

import * as restify from 'restify';

export default (api: restify.Server) => {
  /**
   * NO AUTH REQUIREMENTS
   * Return "pong"
   */
  api.get('/api/ping', (req: restify.Request, res: restify.Response) => res.json(200, 'pong'));
};

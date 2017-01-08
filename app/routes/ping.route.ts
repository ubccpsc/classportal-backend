import * as restify from 'restify';
import * as controller from '../controllers/ping.controller';
import * as auth from '../auth';

export default (api: restify.Server) => {
  /**
   * NO AUTH REQUIREMENTS
   * Return "pong"
   */
  api.get('/api/ping', controller.pong);
};
